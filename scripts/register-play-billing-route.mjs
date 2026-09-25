import fs from 'node:fs';

const file = 'server.js';
let source = fs.readFileSync(file, 'utf8');
const importLine = "import { registerPlayBillingRoutes } from './server/playBillingRoutes.js';";
const importAnchor = "import path from 'path';";
const routeLine = '    registerPlayBillingRoutes(app);';
const routeAnchor = "    app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));";

if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('server.js import anchor changed');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

if (!source.includes(routeLine)) {
  if (!source.includes(routeAnchor)) throw new Error('server.js API 404 anchor changed');
  source = source.replace(routeAnchor, `${routeLine}\n\n${routeAnchor}`);
}

fs.writeFileSync(file, source);
console.log('Play Billing route registration present in server.js');
