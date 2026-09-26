import { readFile } from 'node:fs/promises';

const appConfig = JSON.parse(await readFile(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));
const firebaseConfig = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
const firebaseSource = await readFile(new URL('../src/firebase.ts', import.meta.url), 'utf8');
const rulesSource = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

const databaseId = String(appConfig.firestoreDatabaseId || '').trim();
if (!databaseId) throw new Error('firebase-applet-config.json is missing firestoreDatabaseId');

if (!Array.isArray(firebaseConfig.firestore)) {
    throw new Error('firebase.json must use the multi-database Firestore array form');
}

const targets = firebaseConfig.firestore.filter(entry => entry?.database === databaseId);
if (targets.length !== 1) {
    throw new Error(`Expected exactly one Firestore deploy target for ${databaseId}; found ${targets.length}`);
}

const target = targets[0];
if (target.rules !== 'firestore.rules') throw new Error('Named Firestore target must deploy firestore.rules');
if (target.indexes !== 'firestore.indexes.json') throw new Error('Named Firestore target must reference firestore.indexes.json');

if (!firebaseSource.includes('getFirestore(app, firebaseConfig.firestoreDatabaseId)')) {
    throw new Error('Client Firestore initialization is not using firestoreDatabaseId');
}

for (const required of ['premiumUntil', 'premiumProductId', 'premiumBasePlanId', 'premiumState', 'premiumVerifiedAt']) {
    if (!rulesSource.includes(required)) throw new Error(`firestore.rules missing protected field: ${required}`);
}

console.log(`Firebase target verified: ${appConfig.projectId}/${databaseId}`);
