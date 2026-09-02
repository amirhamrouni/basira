import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    initializeAuth,
    getAuth,
    browserLocalPersistence,
    indexedDBLocalPersistence,
    browserPopupRedirectResolver
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import { getRemoteConfig, fetchAndActivate, getValue, RemoteConfig } from 'firebase/remote-config';
import { getPerformance, FirebasePerformance } from 'firebase/performance';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Use browserLocalPersistence (IndexedDB) — works in Android WebView unlike sessionStorage
let auth: ReturnType<typeof getAuth>;
try {
    auth = Capacitor.isNativePlatform()
        ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
        : initializeAuth(app, {
            persistence: browserLocalPersistence,
            popupRedirectResolver: browserPopupRedirectResolver,
        });
} catch (e) {
    // Already initialized (e.g. hot-reload)
    auth = getAuth(app);
}
export { auth };


// Initialize optional services
let analytics: Analytics | null = null;
let perf: FirebasePerformance | null = null;
let remoteConfig: RemoteConfig | null = null;

const initFirebaseServices = async () => {
    try {
        if (await isAnalyticsSupported()) {
            analytics = getAnalytics(app);
            perf = getPerformance(app);
            
            // Remote Config
            remoteConfig = getRemoteConfig(app);
            remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour for production
            
            // Default Config Values
            remoteConfig.defaultConfig = {
                ads_enabled: true,
                premium_only_palm: true,
                base_energy: 50,
                energy_refill_rate: 10,
                ad_reward_energy: 15,
                streak_bonuses_enabled: true
            };
            
            await fetchAndActivate(remoteConfig);
        }
    } catch (e) {
        console.warn("Failed to initialize some Firebase services (possibly due to ad blockers): ", e);
    }
};

initFirebaseServices();

export { analytics, perf, remoteConfig, getValue };
