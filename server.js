import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { installBillingRoutes } from './billing-server.js';

// Keep all existing API behavior in server-core.js byte-for-byte. Re-export its
// pure helpers so the existing Vitest suite can keep importing from server.js.
export * from './server-core.js';

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedFile === currentFile) {
    const originalUse = express.application.use;
    let billingInstalled = false;

    // server-core mounts JSON parsing, then its /api rate limiter. Install the
    // billing route immediately after that first /api middleware and before the
    // core's final /api 404 handler. This avoids touching the large verified AI
    // server while still keeping Billing behind the same parser and rate limit.
    express.application.use = function patchedUse(...args) {
        const result = originalUse.apply(this, args);
        if (!billingInstalled && args[0] === '/api') {
            billingInstalled = true;
            installBillingRoutes(this);
            express.application.use = originalUse;
        }
        return result;
    };

    const coreFileUrl = new URL('./server-core.js', import.meta.url);
    process.argv[1] = fileURLToPath(coreFileUrl);
    await import(new URL('./server-core.js?billing-runtime=1', import.meta.url).href);
}
