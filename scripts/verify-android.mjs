import fs from 'node:fs';

const required = [
  ['android/capacitor.settings.gradle', "include ':capacitor-firebase-authentication'"],
  ['android/app/capacitor.build.gradle', "implementation project(':capacitor-firebase-authentication')"],
  ['android/app/src/main/java/com/basira/spiritportal/MainActivity.java', 'FirebaseAuthenticationPlugin.class'],
  ['capacitor.config.ts', "providers: ['google.com']"],
];

let failed = false;
for (const [file, needle] of required) {
  if (!fs.existsSync(file)) {
    console.error('FAIL missing:', file);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(needle)) {
    console.error('FAIL native auth wiring:', file, 'missing', needle);
    failed = true;
  } else {
    console.log('PASS', file);
  }
}

if (process.argv.includes('--structure-only')) {
  if (failed) process.exit(1);
  console.log('ANDROID AUTH STRUCTURE GATE: PASS');
  process.exit(0);
}

const googleServices = 'android/app/google-services.json';
if (!fs.existsSync(googleServices)) {
  console.error('FAIL missing google-services.json. Native Google Sign-In cannot be accepted without it.');
  failed = true;
} else {
  try {
    const json = JSON.parse(fs.readFileSync(googleServices, 'utf8'));
    const clients = json.client || [];
    const androidClient = clients.find(c => c.client_info?.android_client_info?.package_name === 'com.basira.spiritportal');
    if (!androidClient) {
      console.error('FAIL google-services.json has no com.basira.spiritportal Android client.');
      failed = true;
    } else {
      console.log('PASS google-services Android package');
    }
  } catch {
    console.error('FAIL google-services.json is invalid JSON.');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('ANDROID AUTH PREBUILD GATE: PASS');
