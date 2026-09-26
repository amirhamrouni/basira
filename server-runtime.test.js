import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';

const PORT = 39123;
const BASE = `http://127.0.0.1:${PORT}`;
let child;
let stderr = '';

async function waitForServer() {
    let lastError;
    for (let attempt = 0; attempt < 80; attempt++) {
        try {
            const response = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(500) });
            if (response.ok) return response.json();
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Server did not start: ${lastError?.message || stderr.slice(-1000)}`);
}

describe('production server runtime wiring', () => {
    beforeAll(async () => {
        child = spawn(process.execPath, ['server.js'], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: 'production',
                PORT: String(PORT),
                GEMINI_API_KEY: '',
                VITE_GEMINI_API_KEY: '',
                OPENAI_API_KEY: '',
                GROQ_API_KEY: '',
                PLAY_SUBSCRIPTION_PRODUCT_ID: '',
                PLAY_SUBSCRIPTION_BASE_PLAN_ID: '',
                GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: '',
                FIREBASE_SERVICE_ACCOUNT_JSON: '',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        await waitForServer();
    }, 15_000);

    afterAll(async () => {
        if (!child || child.exitCode !== null) return;
        child.kill('SIGTERM');
        await Promise.race([
            new Promise(resolve => child.once('exit', resolve)),
            new Promise(resolve => setTimeout(resolve, 2_000)),
        ]);
        if (child.exitCode === null) child.kill('SIGKILL');
    });

    it('starts the real production entrypoint and serves health', async () => {
        const response = await fetch(`${BASE}/api/health`);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.status).toBe('ok');
    });

    it('serves fail-closed public Billing readiness without exposing invented IDs', async () => {
        const response = await fetch(`${BASE}/api/billing/config`);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({
            configured: false,
            catalogConfigured: false,
            serverVerificationReady: false,
            productId: null,
            basePlanId: null,
        });
    });

    it('mounts billing before the core API 404 and requires Firebase auth', async () => {
        const response = await fetch(`${BASE}/api/billing/verify-subscription`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ purchaseToken: 'not-a-real-token' }),
        });
        const data = await response.json();
        expect(response.status).toBe(401);
        expect(data.error).toBe('FIREBASE_ID_TOKEN_MISSING');
    });
});
