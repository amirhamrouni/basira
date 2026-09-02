import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Constants ───────────────────────────────────────────────────────────────

const API_TIMEOUT_MS = 10000; // 10s server-side timeout
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_LANGUAGES = new Set(['ar', 'en', 'fr']);
const SUPPORTED_ZODIAC_SIGNS = new Set([
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
]);
const FALLBACK_AR = 'الأثير مزدحم بالترددات في هذه اللحظة، يرجى المحاولة بعد قليل لضمان دقة القراءة.';
const FALLBACK_EN = 'The cosmic frequencies are busy right now. Please try again in a moment for an accurate reading.';
const FALLBACK_FR = 'Les fréquences cosmiques sont saturées en ce moment. Réessayez dans un instant.';

const ZODIAC_MAP_AR = {
    aries: 'الحمل', taurus: 'الثور', gemini: 'الجوزاء', cancer: 'السرطان',
    leo: 'الأسد', virgo: 'العذراء', libra: 'الميزان', scorpio: 'العقرب',
    sagittarius: 'القوس', capricorn: 'الجدي', aquarius: 'الدلو', pisces: 'الحوت'
};

const ZODIAC_MAP_FR = {
    aries: 'Bélier', taurus: 'Taureau', gemini: 'Gémeaux', cancer: 'Cancer',
    leo: 'Lion', virgo: 'Vierge', libra: 'Balance', scorpio: 'Scorpion',
    sagittarius: 'Sagittaire', capricorn: 'Capricorne', aquarius: 'Verseau', pisces: 'Poissons'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFallback(lang) {
    if (lang === 'en') return FALLBACK_EN;
    if (lang === 'fr') return FALLBACK_FR;
    return FALLBACK_AR;
}

function getZodiacName(zodiac, lang) {
    if (lang === 'ar') return ZODIAC_MAP_AR[zodiac] || zodiac;
    if (lang === 'fr') return ZODIAC_MAP_FR[zodiac] || zodiac;
    return zodiac.charAt(0).toUpperCase() + zodiac.slice(1);
}

export function safeLanguage(value) {
    return SUPPORTED_LANGUAGES.has(value) ? value : 'ar';
}

export function cleanText(value, maxLength = 4000) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function parseImageDataUrl(value) {
    if (typeof value !== 'string') return null;
    const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || Math.floor(match[2].length * 0.75) > MAX_IMAGE_BYTES) return null;
    return { mimeType: match[1], data: match[2] };
}

/**
 * Wraps a promise with a strict server-side timeout.
 */
function withTimeout(promise, ms = API_TIMEOUT_MS, label = 'Operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);
}

/**
 * Fetch real horoscope data from a public API with fallback.
 * Primary: horoscope-app-api.vercel.app
 * Fallback: aztro (static) if primary fails.
 */
async function fetchRealHoroscope(sign, day = 'today') {
    const primaryUrl = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=${day}`;

    try {
        const res = await withTimeout(
            fetch(primaryUrl, {
                headers: { 'Accept': 'application/json', 'User-Agent': 'BASIRA-App/1.0' }
            }),
            7000,
            'Horoscope API'
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Handle multiple possible API response structures:
        // Format 1: { data: { horoscope_data: "..." } }  — horoscope-app-api
        // Format 2: { horoscope: "..." }
        // Format 3: { description: "..." }
        // Format 4: { data: { description: "..." } }
        const horoscopeText =
            data?.data?.horoscope_data ||
            data?.data?.description ||
            data?.horoscope ||
            data?.description ||
            (typeof data === 'string' ? data : null);

        if (!horoscopeText || horoscopeText.trim() === '') throw new Error('No horoscope data in response');

        return {
            success: true,
            text: horoscopeText,
            date: data?.data?.date || data?.date || new Date().toLocaleDateString('en-US'),
            luckyNumber: data?.data?.lucky_number || data?.lucky_number || null,
            luckyColor: data?.data?.lucky_color || data?.lucky_color || null,
            mood: data?.data?.mood || data?.mood || null,
        };
    } catch (err) {
        console.warn(`[Horoscope API] Primary failed: ${err.message}. Returning null.`);
        return { success: false, text: null };
    }
}

/**
 * Unified AI with retry logic (max 3 attempts).
 */
async function generateWithRetry(callFn, maxRetries = 3) {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
        try {
            return await withTimeout(callFn(), API_TIMEOUT_MS, 'AI Call');
        } catch (error) {
            lastError = error;
            attempt++;
            const isRetryable =
                error?.status === 503 ||
                error?.status === 429 ||
                error?.message?.includes('503') ||
                error?.message?.includes('429') ||
                error?.message?.includes('timed out');

            if (isRetryable && attempt < maxRetries) {
                const delay = attempt * 2000;
                console.warn(`[AI] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw lastError;
            }
        }
    }
    throw lastError;
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function startServer() {
    const app = express();

    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    const configuredOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
    app.use(cors({
        origin(origin, callback) {
            if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Origin not allowed'));
        },
        methods: ['GET', 'POST'], maxAge: 86400
    }));
    app.use(express.json({ limit: '8mb', strict: true }));
    app.use('/api', rateLimit({
        windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
        message: { error: 'Too many requests. Please try again shortly.' }
    }));

    // ── Initialize Gemini ──
    const initAI = () => {
        const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn('WARNING: Gemini API Key missing.');
            return null;
        }
        return new GoogleGenAI({ apiKey: key });
    };

    const ai = initAI();
    const openai = process.env.OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        : null;

    function toOpenAIInput(contents) {
        if (typeof contents === 'string') return contents;
        const content = [];
        const items = Array.isArray(contents) ? contents : [contents];
        for (const item of items) {
            const parts = item?.parts || [item];
            for (const part of parts) {
                if (part?.text) content.push({ type: 'input_text', text: part.text });
                if (part?.inlineData) {
                    content.push({
                        type: 'input_image',
                        image_url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                        detail: 'auto'
                    });
                }
            }
        }
        return [{ role: 'user', content }];
    }

    // Unified AI router supporting Groq & Gemini
    async function generateContent({ contents, config }) {
        const groqKey = process.env.GROQ_API_KEY;
        const preferredProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

        if (openai && (preferredProvider === 'openai' || (!ai && !groqKey))) {
            console.log('[AI] Routing request to OpenAI Responses API...');
            const response = await openai.responses.create({
                model: process.env.OPENAI_MODEL || 'gpt-5-mini',
                input: toOpenAIInput(contents),
                max_output_tokens: config?.maxOutputTokens ?? 800
            });
            return { text: response.output_text };
        }

        if (groqKey) {
            console.log('[AI] Routing request to Groq...');
            let messages = [];
            let groqModel = 'llama-3.3-70b-versatile'; // Strongest text model
            
            let userContentParts = [];
            let hasImage = false;
            
            if (Array.isArray(contents)) {
                for (const item of contents) {
                    if (item.parts) {
                        for (const part of item.parts) {
                            if (part.text) {
                                userContentParts.push({ type: 'text', text: part.text });
                            } else if (part.inlineData) {
                                hasImage = true;
                                userContentParts.push({
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                                    }
                                });
                            }
                        }
                    } else if (item.text) {
                        userContentParts.push({ type: 'text', text: item.text });
                    } else if (item.inlineData) {
                        hasImage = true;
                        userContentParts.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}`
                            }
                        });
                    } else if (typeof item === 'string') {
                        userContentParts.push({ type: 'text', text: item });
                    }
                }
            } else if (typeof contents === 'string') {
                userContentParts.push({ type: 'text', text: contents });
            } else if (contents && typeof contents === 'object') {
                if (contents.parts) {
                    for (const part of contents.parts) {
                        if (part.text) {
                            userContentParts.push({ type: 'text', text: part.text });
                        } else if (part.inlineData) {
                            hasImage = true;
                            userContentParts.push({
                                type: 'image_url',
                                image_url: {
                                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                                }
                            });
                        }
                    }
                }
            }
            
            if (hasImage) {
                groqModel = 'llama-3.2-11b-vision-preview'; // Vision-capable model
            }
            
            messages.push({ role: 'user', content: userContentParts });
            
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: groqModel,
                    messages: messages,
                    temperature: config?.temperature ?? 0.85,
                    max_tokens: config?.maxOutputTokens ?? 800
                })
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq API returned error: ${response.status} - ${errText}`);
            }
            
            const resData = await response.json();
            const text = resData.choices?.[0]?.message?.content;
            return { text };
        } else {
            if (!ai) {
                throw new Error('AI Key missing. Configure GEMINI_API_KEY or GROQ_API_KEY.');
            }
            console.log('[AI] Routing request to Gemini...');
            return await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: config
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/daily-horoscope
    // HYBRID AI ENGINE: Real API data → Rewrite
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/daily-horoscope', async (req, res) => {
        const zodiac = cleanText(req.body?.zodiac, 20).toLowerCase();
        const lang = safeLanguage(req.body?.lang);
        const date = cleanText(req.body?.date, 40);

        if (!SUPPORTED_ZODIAC_SIGNS.has(zodiac)) {
            return res.status(400).json({ error: 'Invalid zodiac sign', reply: getFallback(lang) });
        }

        const realData = await fetchRealHoroscope(zodiac);

        // If no API key is set anywhere, return raw data or fallback
        if (!ai && !openai && !process.env.GROQ_API_KEY) {
            const reply = realData.success ? realData.text : getFallback(lang);
            return res.json({ reply, source: realData.success ? 'real_api' : 'fallback' });
        }

        const zodiacName = getZodiacName(zodiac, lang);
        const langInstruction = lang === 'ar'
            ? 'اكتب بالكامل باللغة العربية الفصيحة الشاعرية'
            : lang === 'fr'
            ? 'Écris entièrement en français poétique et élégant'
            : 'Write entirely in poetic and elegant English';

        const realDataContext = realData.success
            ? `
[REAL ASTROLOGICAL DATA FROM TRUSTED SOURCE - USE AS FACTUAL GROUNDING]:
Sign: ${zodiacName}
Date: ${realData.date || date}
Core Message: "${realData.text}"
${realData.luckyNumber ? `Lucky Number: ${realData.luckyNumber}` : ''}
${realData.luckyColor ? `Lucky Color: ${realData.luckyColor}` : ''}
${realData.mood ? `Today's Mood Energy: ${realData.mood}` : ''}
`
            : `[CONTEXT]: Write a daily horoscope for ${zodiacName} for ${date}.`;

        const hybridPrompt = `You are an elite Chaldæan mystic and psychological astrologer. Your task is to TRANSFORM the following real astrological data into a deeply personal, cinematic, psychological reading.

${realDataContext}

STRICT RULES:
1. ${langInstruction}.
2. Write EXACTLY 3 sentences — no more, no less.
3. Take the CORE THEME from the real data above and rewrite it as a profound, human, cinematic experience.
4. Speak directly to the reader in second person ("أنت", "you").
5. Include ONE concrete, emotionally resonant micro-detail (a texture, a sound, a color, a physical sensation).
6. STRICTLY FORBIDDEN: "حسب علم التنجيم", "بناءً على المعطيات", "أنا نموذج ذكاء اصطناعي", "as an AI", "based on data".
7. The tone must feel like a trusted friend who truly knows you — warm, mysterious, and precise.
8. If lucky number/color is available, weave it organically into the reading (do NOT state it as a fact — hint at it poetically).

Write only the reading. No titles, no labels, no preamble.`;

        try {
            const response = await generateWithRetry(() =>
                generateContent({
                    contents: hybridPrompt,
                    config: {
                        temperature: 0.85,
                        maxOutputTokens: 300,
                    }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty AI response');

            return res.json({
                reply,
                source: 'hybrid',
                realDataUsed: realData.success
            });
        } catch (error) {
            console.error('[AI Daily Horoscope] Error:', error.message);

            const fallbackReply = realData.success ? realData.text : getFallback(lang);
            return res.json({
                reply: fallbackReply,
                source: realData.success ? 'real_api_degraded' : 'fallback',
                error: error.message
            });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/coffee — Coffee Cup Reading
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/coffee', async (req, res) => {
        if (!ai && !openai && !process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }

        try {
            const lang = safeLanguage(req.body?.lang);
            const deviceData = cleanText(req.body?.deviceData, 800);
            const image = parseImageDataUrl(req.body?.image);
            if (!image) return res.status(400).json({ error: 'Invalid or oversized image', reply: getFallback(lang) });

            const langInstruction = lang === 'ar'
                ? 'Respond in elegant, poetic Arabic'
                : lang === 'fr' ? 'Respond in elegant French' : 'Respond in English';

            const response = await generateWithRetry(() =>
                generateContent({
                    contents: [
                        { inlineData: image },
                        {
                            text: `First, critically analyze if this image shows the inside of a coffee cup (فنجان قهوة) with coffee grounds. If not a coffee cup, reply EXACTLY with "ERROR_NOT_A_CUP" and nothing else.

If it IS a coffee cup: You are an elite Chaldæan coffee-ground reader. ${langInstruction}.
Act as a deeply perceptive human mystic — NOT an AI.
Rules:
- Speak in first person with warmth and mystery
- Reference the user's current environment naturally within the first two sentences: ${deviceData ?? ''}
- Identify 2-3 specific shapes or symbols you see in the grounds
- Each symbol must carry a concrete, psychologically grounded meaning
- Speak of love, ambitions, or transitions — anchor in real human experience
- FORBIDDEN: "بناءً على", "حسب", "as an AI", "I notice", mechanical phrasing
- Write 4-5 rich sentences minimum`
                        }
                    ],
                    config: { temperature: 0.9, maxOutputTokens: 600 }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty response');
            return res.json({ reply });
        } catch (e) {
            console.error('[Coffee API] Error:', e.message);
            const lang = req.body?.lang || 'ar';
            return res.status(503).json({ error: e.message, reply: getFallback(lang) });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/palmistry — Palm Reading
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/palmistry', async (req, res) => {
        if (!ai && !openai && !process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }
        try {
            const lang = safeLanguage(req.body?.lang);
            const prompt = cleanText(req.body?.prompt, 3000);
            const context = cleanText(req.body?.context, 2000);
            const image = parseImageDataUrl(req.body?.imageBuffer);
            if (!image) return res.status(400).json({ error: 'Invalid or oversized image', reply: getFallback(lang) });

            const response = await generateWithRetry(() =>
                generateContent({
                    contents: [
                        { text: (context || '') + '\n\n' + (prompt || '') },
                        { inlineData: image }
                    ],
                    config: { temperature: 0.88, maxOutputTokens: 700 }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty response');
            return res.json({ reply });
        } catch (e) {
            console.error('[Palmistry API] Error:', e.message);
            const lang = req.body?.lang || 'ar';
            return res.status(503).json({ error: e.message, reply: getFallback(lang) });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/chat — General Divination/Tarot Chat
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/chat', async (req, res) => {
        if (!ai && !openai && !process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }

        try {
            const lang = safeLanguage(req.body?.lang);
            const prompt = cleanText(req.body?.prompt, 3000);
            const context = cleanText(req.body?.context, 2000);
            if (!prompt) return res.status(400).json({ error: 'Missing prompt', reply: getFallback(lang) });

            const response = await generateWithRetry(() =>
                generateContent({
                    contents: `${context || ''}\n\nUser: ${prompt}`,
                    config: { temperature: 0.85, maxOutputTokens: 800 }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty response');
            return res.json({ reply });
        } catch (e) {
            console.error('[Chat API] Error:', e.message);
            const lang = req.body?.lang || 'ar';
            return res.status(503).json({ error: e.message, reply: getFallback(lang) });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/face — Face/Aura Reading
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/face', async (req, res) => {
        if (!ai && !openai && !process.env.GROQ_API_KEY) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }
        try {
            const lang = safeLanguage(req.body?.lang);
            const prompt = cleanText(req.body?.prompt, 3000);
            const deviceData = cleanText(req.body?.deviceData, 800);
            const image = parseImageDataUrl(req.body?.image);
            if (!image) return res.status(400).json({ error: 'Invalid or oversized image', reply: getFallback(lang) });

            const langInstruction = lang === 'ar'
                ? 'اكتب بالعربية الفصيحة الشاعرية'
                : lang === 'fr' ? 'Écris en français élégant' : 'Write in elegant English';

            const response = await generateWithRetry(() =>
                generateContent({
                    contents: [
                        { inlineData: image },
                        {
                            text: `${prompt || ''}
You are a master physiognomist and aura reader. ${langInstruction}.
Analyze the face in the image with deep psychological and energetic insight.
Reference subtle features: eye shape, jawline energy, forehead lines, micro-expressions.
Do NOT describe the person's appearance mechanically. Instead, translate what you observe into destiny, personality depth, and emotional landscape.
Mention their current environment context naturally: ${deviceData || ''}.
FORBIDDEN: "AI", "بناءً على", "based on", clinical descriptions, racist/sexist statements.
Write 5-6 rich, poetic sentences.`
                        }
                    ],
                    config: { temperature: 0.9, maxOutputTokens: 600 }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty response');
            return res.json({ reply });
        } catch (e) {
            console.error('[Face API] Error:', e.message);
            const lang = req.body?.lang || 'ar';
            return res.status(503).json({ error: e.message, reply: getFallback(lang) });
        }
    });

    // ── Dream reflection: psychological + cultural symbolism, never prophecy ──
    app.post('/api/dream', async (req, res) => {
        const lang = safeLanguage(req.body?.lang);
        const dream = cleanText(req.body?.prompt, 3000);
        if (dream.length < 15) return res.status(400).json({ error: 'Dream description is too short' });

        const localReply = lang === 'ar'
            ? 'قراءة نفسية ورمزية: لا يوجد معنى ثابت واحد للحلم؛ الأهم هو الشعور الذي بقي بعد الاستيقاظ وما عشته في اليوم السابق. علمياً، قد تمزج الأحلام الذاكرة والانفعال والضغط أثناء النوم، لذلك لا تُعامل كنبوءة. اسأل نفسك: ما الشعور الأقوى في الحلم، وأين أعيشه هذه الأيام؟ اكتب الحلم والشعور المرتبط به ثم دوّن حدثاً واحداً قد يكون غذّاه.'
            : 'Dreams can blend memory, emotion, and daily stress, so this reflection is not a prediction. Focus on the strongest feeling in the dream and where it appears in your waking life. Write down one recent event that may have shaped it.';

        if (!ai && !openai && !process.env.GROQ_API_KEY) return res.json({ reply: localReply, source: 'local' });
        const langRule = lang === 'ar' ? 'اكتب بالعربية الواضحة' : lang === 'fr' ? 'Écris en français' : 'Write in English';
        try {
            const response = await generateWithRetry(() => generateContent({
                contents: `${langRule}. Analyze this dream through emotional psychology, memory, daily stress, and cultural symbolism clearly labeled as non-factual: ${dream}. Ask one reflective question and suggest one journaling step. Never predict death, illness, pregnancy, betrayal, magic, or future events.`,
                config: { maxOutputTokens: 700 }
            }));
            return res.json({ reply: response.text?.trim() || localReply, source: 'ai' });
        } catch (error) {
            console.warn('[Dream API] AI unavailable, using local reflection:', error.message);
            return res.json({ reply: localReply, source: 'local' });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/health — Server health check
    // ─────────────────────────────────────────────────────────────────────────
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            aiReady: !!ai || !!openai || !!process.env.GROQ_API_KEY,
            providers: {
                gemini: !!ai,
                openai: !!openai,
                groq: !!process.env.GROQ_API_KEY
            },
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Static/Dev Server Setup
    // ─────────────────────────────────────────────────────────────────────────
    app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);

        app.get('*all', async (req, res, next) => {
            try {
                const fs = await import('fs/promises');
                let template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
                template = await vite.transformIndexHtml(req.originalUrl, template);
                res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
            } catch (e) {
                vite.ssrFixStacktrace(e);
                next(e);
            }
        });
    } else {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.get('*all', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Start Server
    // ─────────────────────────────────────────────────────────────────────────
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, '0.0.0.0', () => {
        const groqKey = process.env.GROQ_API_KEY;
        let aiEngine = ai ? '✅ Gemini Connected' : openai ? '✅ OpenAI Connected' : '❌ API Key Missing';
        if (groqKey) {
            aiEngine = '✅ Groq Connected (Llama)';
        }
        console.log(`\n🌟 BASIRA Server v2.0 running on http://localhost:${PORT}`);
        console.log(`   AI Engine: ${aiEngine}`);
        console.log(`   Environment: ${isProd ? 'Production' : 'Development'}\n`);
    });

    const shutdown = () => {
        console.log('\n[Server] Gracefully shutting down...');
        server.close(() => {
            console.log('[Server] Shutdown complete.');
            process.exit(0);
        });
        // Force close after 10s
        setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', (err) => {
        console.error('[Server] Uncaught Exception:', err);
        shutdown();
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    startServer();
}
