import fs from 'node:fs';

const required = [
  ['android/capacitor.settings.gradle', "include ':capacitor-firebase-authentication'"],
  ['android/app/capacitor.build.gradle', "implementation project(':capacitor-firebase-authentication')"],
  ['android/app/src/main/java/com/basira/spiritportal/MainActivity.java', 'extends BridgeActivity'],
  ['capacitor.config.ts', "providers: ['google.com']"],
  ['capacitor.config.ts', 'skipNativeAuth: false'],
  ['android/app/src/main/java/com/basira/spiritportal/MainActivity.java', 'registerPlugin(BasiraPhotoPicker.class)'],
  ['android/app/src/main/AndroidManifest.xml', 'android:grantUriPermissions="true"'],
  ['android/app/capacitor.build.gradle', "implementation project(':capacitor-share')"],
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

const androidManifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
if (androidManifest.includes('<uses-permission android:name="android.permission.CAMERA"')) {
  console.error('FAIL external camera intent requires removing unrequested CAMERA permission.');
  failed = true;
}

if (process.argv.includes('--structure-only')) {
  if (failed) process.exit(1);
  console.log('ANDROID AUTH STRUCTURE GATE: PASS');
  process.exit(0);
}

const googleServices = 'android/app/google-services.json';
const expectedPlaySha1 = '58abc7b61b1eea2b242b7ce08d7c73626497a64d';
const expectedWebClientId = '391040417078-90jpo9ld068p4jf6vjhki4tnhj78id6f.apps.googleusercontent.com';
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
      const oauthClients = androidClient.oauth_client || [];
      const androidOauthClient = oauthClients.find(client =>
        client.client_type === 1 &&
        client.android_info?.package_name === 'com.basira.spiritportal' &&
        client.android_info?.certificate_hash?.toLowerCase() === expectedPlaySha1
      );
      const webOauthClient = oauthClients.find(client =>
        client.client_type === 3 && client.client_id === expectedWebClientId
      );
      if (!androidOauthClient) {
        console.error('FAIL google-services.json has no Android OAuth client for the Play App Signing SHA-1.');
        failed = true;
      } else {
        console.log('PASS google-services Play App Signing SHA-1');
      }
      if (!webOauthClient) {
        console.error('FAIL google-services.json does not contain the expected Firebase Web OAuth client.');
        failed = true;
      } else {
        console.log('PASS google-services expected Web OAuth client');
      }
    }
  } catch {
    console.error('FAIL google-services.json is invalid JSON.');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('ANDROID AUTH PREBUILD GATE: PASS');
