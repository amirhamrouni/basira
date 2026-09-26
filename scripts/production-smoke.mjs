const primaryBase = 'https://basira-1-2fwh.onrender.com';
const productionBases = [
    { base: primaryBase, requireAi: true },
    { base: 'https://basira-qx6d.onrender.com', requireAi: false },
];

async function request(base, path, body) {
    const response = await fetch(`${base}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(120_000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`${base}${path} HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`);
    return data;
}

function verifyBillingConfig(config, base) {
    if (typeof config?.configured !== 'boolean') throw new Error(`${base}: Billing config missing configured`);

    const hasExtendedReadiness = typeof config.catalogConfigured === 'boolean' && typeof config.serverVerificationReady === 'boolean';
    if (!hasExtendedReadiness) {
        if (config.configured) {
            if (typeof config.productId !== 'string' || !config.productId.trim()) throw new Error(`${base}: legacy Billing configured without productId`);
            if (typeof config.basePlanId !== 'string' || !config.basePlanId.trim()) throw new Error(`${base}: legacy Billing configured without basePlanId`);
        } else if (config.productId !== null || config.basePlanId !== null) {
            throw new Error(`${base}: legacy unconfigured Billing must not expose partial IDs`);
        }
        console.log(`${base} Billing: legacy schema detected before rollout; configured=${config.configured}`);
        return;
    }

    if (config.configured !== Boolean(config.catalogConfigured && config.serverVerificationReady)) {
        throw new Error(`${base}: Billing configured flag disagrees with catalog/server readiness`);
    }
    if (config.catalogConfigured) {
        if (typeof config.productId !== 'string' || !config.productId.trim()) throw new Error(`${base}: Billing catalog configured without productId`);
        if (typeof config.basePlanId !== 'string' || !config.basePlanId.trim()) throw new Error(`${base}: Billing catalog configured without basePlanId`);
    } else if (config.productId !== null || config.basePlanId !== null) {
        throw new Error(`${base}: Billing must not expose partial IDs when catalog is unconfigured`);
    }
    console.log(`${base} Billing: configured=${config.configured}, catalog=${config.catalogConfigured}, serverVerification=${config.serverVerificationReady}`);
}

async function verifyProductionBase(base, requireAi) {
    let health;
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            health = await request(base, '/api/health');
            if (health.status === 'ok' && (!requireAi || health.aiReady)) break;
        } catch (error) {
            console.log(`${base} health attempt ${attempt + 1}: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 8_000));
    }
    if (health?.status !== 'ok') throw new Error(`${base}: production health endpoint not ready`);
    if (requireAi && !health.aiReady) throw new Error(`${base}: primary AI provider not ready`);
    console.log(`${base} health:`, JSON.stringify(health));
    if (!requireAi && !health.aiReady) console.log(`${base}: secondary service is healthy but AI provider readiness is not required for Billing/deployment parity`);

    const billingConfig = await request(base, '/api/billing/config');
    verifyBillingConfig(billingConfig, base);
}

for (const target of productionBases) {
    await verifyProductionBase(target.base, target.requireAi);
}

function verify(reply, kind) {
    console.log(`${kind} RAW (${reply?.length || 0} chars):\n${reply}`);
    if (typeof reply !== 'string' || reply.length < 250) throw new Error(`${kind}: empty/short reading`);
    for (const heading of ['أقوى 3 إشارات', 'ما يقترب', 'التوقيت', 'تنبيه / فرصة', 'سؤال متابعة']) {
        if (!reply.includes(heading)) throw new Error(`${kind}: missing ${heading}`);
    }
    if (reply.indexOf('أقوى 3 إشارات') > 25) throw new Error(`${kind}: signals not first`);
    console.log(`${kind} (${reply.length} chars):\n${reply}`);
}

const cards = [
    { position: 'الماضي', name: 'Two of Wands', nameAr: 'اثنان العصي', theme: 'اختيار بين مسارين', reflection: 'القرار مُعلّق' },
    { position: 'الحاضر', name: 'Eight of Pentacles', nameAr: 'ثمانية العملات', theme: 'تدريب ومهارة', reflection: 'تحضير عرض عمل' },
    { position: 'القريب', name: 'The Chariot', nameAr: 'العربة', theme: 'حركة مشروطة بالحسم', reflection: 'تغيير مكان العمل بعد قرار' }
];
const first = (await request(primaryBase, '/api/tarot', { lang: 'ar', spreadName: 'ثلاث بطاقات', question: 'هل أقبل عرض العمل أم أنتظر؟', cards })).reply;
verify(first, 'TAROT');
if (!cards.some(card => first.includes(card.nameAr) || first.includes(card.name))) throw new Error('Tarot lacks actual card names');

const followUp = 'العرض الثاني فيه تدريب لكن يلزمني نقل مدينة خلال أسبوعين؛ نحب نعرف شنوة يبدّل في السيناريو.';
const second = (await request(primaryBase, '/api/chat', { lang: 'ar', followUp, previousReading: first, context: 'متابعة قراءة التاروت المتعلقة بقبول عرض عمل', basiraContext: { preferredName: 'سليم' } })).reply;
console.log(`FOLLOW-UP (${second?.length} chars):\n${second}`);
if (!second || second.length < 130 || second === first) throw new Error('Follow-up missing or identical');
if (!/تدريب|نقل|مدين|أسبوع|عرض/.test(second)) throw new Error('Follow-up did not incorporate new answer');

const memory = [{ type: 'tarot', signals: first.match(/\[أقوى 3 إشارات\]([^[]*)/)?.[1]?.slice(0, 700), direction: first.match(/\[ما يقترب\]([^[]*)/)?.[1]?.slice(0, 160) }];
const third = (await request(primaryBase, '/api/tarot', { lang: 'ar', spreadName: 'ثلاث بطاقات', question: 'بعد التدريب، أين أركز جهدي الآن؟', cards, recentReadings: memory })).reply;
verify(third, 'MEMORY READING');
if (third === first) throw new Error('Reading repeated verbatim despite memory');
const signalLines = text => text.split('\n').filter(line => /^\s*[1-3][.،)]/.test(line));
const normalize = line => line.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const previousLines = signalLines(first).map(normalize);
const repeated = signalLines(third).map(normalize).filter((line, index) => {
    const old = previousLines[index] || '';
    const firstWords = new Set(old.split(' '));
    const words = line.split(' ');
    return words.length && words.filter(word => firstWords.has(word)).length / words.length > 0.8;
});
if (repeated.length > 1) throw new Error(`Memory repeated ${repeated.length} out of 3 signal lines`);
console.log('PRODUCTION SMOKE PASS');
