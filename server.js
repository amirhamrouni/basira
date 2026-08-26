import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Constants ───────────────────────────────────────────────────────────────

const API_TIMEOUT_MS = 10000; // 10s server-side timeout
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
 * Gemini AI with retry logic (max 3 attempts).
 */
async function generateWithRetry(ai, callFn, maxRetries = 3) {
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
        try {
            return await withTimeout(callFn(), API_TIMEOUT_MS, 'Gemini');
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
                console.warn(`[Gemini] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
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

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));

    // ── Initialize Gemini ──
    const initAI = () => {
        const key = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn('WARNING: Gemini API Key missing. Add GEMINI_API_KEY to environment.');
            return null;
        }
        return new GoogleGenAI({ apiKey: key });
    };

    const ai = initAI();

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/daily-horoscope
    // HYBRID AI ENGINE: Real API data → Gemini rewrite
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/daily-horoscope', async (req, res) => {
        const { zodiac, lang = 'ar', date } = req.body;

        if (!zodiac) {
            return res.status(400).json({ error: 'Missing zodiac sign', reply: getFallback(lang) });
        }

        // Step 1: Fetch real horoscope data from external API
        const realData = await fetchRealHoroscope(zodiac);

        // Step 2: If AI is unavailable, return real data or fallback
        if (!ai) {
            const reply = realData.success
                ? realData.text
                : getFallback(lang);
            return res.json({ reply, source: realData.success ? 'real_api' : 'fallback' });
        }

        // Step 3: Build hybrid Gemini prompt using real data as grounding context
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

        const hybridPrompt = `You are an elite Chaldæan mystic and psychological astrologer. Your task is to TRANSFORM the following real astrological data into a deeply personal, cinematic, psychological Arabic reading.

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
            const response = await generateWithRetry(ai, () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: hybridPrompt,
                    config: {
                        temperature: 0.85,
                        maxOutputTokens: 300,
                    }
                })
            );

            const reply = response.text?.trim();
            if (!reply) throw new Error('Empty Gemini response');

            return res.json({
                reply,
                source: 'hybrid',
                realDataUsed: realData.success
            });
        } catch (geminiError) {
            console.error('[Gemini Daily Horoscope] Error:', geminiError.message);

            // Graceful degradation: use real data if available, else fallback
            const fallbackReply = realData.success ? realData.text : getFallback(lang);
            return res.json({
                reply: fallbackReply,
                source: realData.success ? 'real_api_degraded' : 'fallback',
                error: geminiError.message
            });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/coffee — Coffee Cup Reading
    // ─────────────────────────────────────────────────────────────────────────
    app.post('/api/coffee', async (req, res) => {
        if (!ai) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }

        try {
            const { image, lang = 'ar', deviceData } = req.body;
            if (!image) return res.status(400).json({ error: 'Missing image', reply: getFallback(lang) });

            const base64Data = image.split(',')[1];
            if (!base64Data) return res.status(400).json({ error: 'Invalid image format', reply: getFallback(lang) });

            const langInstruction = lang === 'ar'
                ? 'Respond in elegant, poetic Arabic'
                : lang === 'fr' ? 'Respond in elegant French' : 'Respond in English';

            const response = await generateWithRetry(ai, () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
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
                            ]
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
        if (!ai) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }
        try {
            const { imageBuffer, prompt, context, lang = 'ar' } = req.body;
            if (!imageBuffer) return res.status(400).json({ error: 'Missing image', reply: getFallback(lang) });

            const base64Data = imageBuffer.split(',')[1];
            if (!base64Data) return res.status(400).json({ error: 'Invalid image format', reply: getFallback(lang) });

            const response = await generateWithRetry(ai, () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: (context || '') + '\n\n' + (prompt || '') },
                                { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                            ]
                        }
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
        if (!ai) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }

        try {
            const { prompt, context, lang = 'ar' } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Missing prompt', reply: getFallback(lang) });

            const response = await generateWithRetry(ai, () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
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
        if (!ai) {
            return res.status(500).json({ error: 'API Key missing.', reply: getFallback(req.body?.lang || 'ar') });
        }
        try {
            const { image, prompt, lang = 'ar', deviceData } = req.body;
            if (!image) return res.status(400).json({ error: 'Missing image', reply: getFallback(lang) });

            const base64Data = image.split(',')[1];
            if (!base64Data) return res.status(400).json({ error: 'Invalid image format', reply: getFallback(lang) });

            const langInstruction = lang === 'ar'
                ? 'اكتب بالعربية الفصيحة الشاعرية'
                : lang === 'fr' ? 'Écris en français élégant' : 'Write in elegant English';

            const response = await generateWithRetry(ai, () =>
                ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
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
                            ]
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

    // ─────────────────────────────────────────────────────────────────────────
    // ENDPOINT: /api/health — Server health check
    // ─────────────────────────────────────────────────────────────────────────
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            aiReady: !!ai,
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Static/Dev Server Setup
    // ─────────────────────────────────────────────────────────────────────────
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
        console.log(`\n🌟 BASIRA Server v2.0 running on http://localhost:${PORT}`);
        console.log(`   AI Engine: ${ai ? '✅ Gemini Connected' : '❌ API Key Missing'}`);
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

startServer();
