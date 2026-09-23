import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signInWithCredential,
    GoogleAuthProvider,
    signOut,
    AuthError
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, db, analytics } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';

export interface UserProfile {
    energy: number;
    maxEnergy: number;
    stardust: number;
    level: number;
    xp: number;
    streak: number;
    vipStatus: 'none' | 'adept' | 'oracle';
    role?: 'user' | 'admin';
    lastLogin: any;
    displayName?: string;
    email?: string;
    photoURL?: string;
    onboardingCompleted?: boolean;
    basiraContext?: import('../utils/basiraContext').BasiraContext;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    authError: string | null;
    isAdmin: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    authError: null,
    isAdmin: false,
    login: async () => {},
    logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

const ensureUserProfile = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                email: currentUser.email || 'guest@basira.com',
                displayName: currentUser.displayName || (currentUser.isAnonymous ? 'زائر كوني (Guest)' : 'مستخدم بصيرة'),
                photoURL: currentUser.photoURL || '',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                energy: 50,
                maxEnergy: 50,
                stardust: 10,
                level: 1,
                xp: 0,
                streak: 1,
                vipStatus: 'none',
                role: 'user',
                onboardingCompleted: false
            });
            if (analytics) logEvent(analytics, 'sign_up');
        } else {
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        }
    } catch (error) {
        console.error('Error ensuring user profile:', error);
        throw error;
    }
};

const getAuthErrorMessage = (error: AuthError, lang: string = 'ar'): string => {
    const messages: Record<string, Record<string, string>> = {
        'auth/popup-blocked': {
            ar: 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.',
            en: 'Popup was blocked. Please allow popups.',
            fr: 'La fenêtre contextuelle a été bloquée.'
        },
        'auth/cancelled-popup-request': {
            ar: 'تم إلغاء طلب تسجيل الدخول.',
            en: 'Login request was cancelled.',
            fr: 'La demande de connexion a été annulée.'
        },
        'auth/network-request-failed': {
            ar: 'فشل الاتصال بالشبكة. تحقق من اتصالك بالإنترنت.',
            en: 'Network request failed. Check your internet connection.',
            fr: 'Échec de la connexion réseau.'
        },
        'auth/too-many-requests': {
            ar: 'طلبات كثيرة جداً. انتظر قليلاً ثم حاول مجدداً.',
            en: 'Too many requests. Please wait and try again.',
            fr: 'Trop de requêtes. Veuillez attendre.'
        },
        'auth/user-disabled': {
            ar: 'تم تعطيل هذا الحساب.',
            en: 'This account has been disabled.',
            fr: 'Ce compte a été désactivé.'
        },
        'auth/unauthorized-domain': {
            ar: 'النطاق غير مصرح به. تحقق من إعدادات Firebase.',
            en: 'This domain is not authorized. Check Firebase settings.',
            fr: 'Domaine non autorisé.'
        },
        'auth/argument-error': {
            ar: 'تعذّر بدء تسجيل Google على هذا النطاق. أضف نطاق التطبيق إلى Authorized domains في Firebase.',
            en: 'Google sign-in cannot start on this domain. Add the app domain to Firebase Authorized domains.',
            fr: 'La connexion Google ne peut pas démarrer sur ce domaine. Ajoutez-le aux domaines autorisés Firebase.'
        },
        'auth/native-google-configuration': {
            ar: 'تعذّر تشغيل إضافة Google الأصلية في هذه النسخة.',
            en: 'The native Google authentication plugin is unavailable in this build.',
            fr: 'Le module natif Google est indisponible dans cette version.'
        },
    };
    const msg = messages[error.code];
    if (msg) return msg[lang] || msg['ar'];
    const detail = [error.code, error.message].filter(Boolean).join(' · ');
    return lang === 'ar'
        ? `خطأ تسجيل Google: ${detail || 'خطأ غير معروف'}`
        : `Google login error: ${detail || 'Unknown error'}`;
};

import { AppStateManager } from '../utils/AppStateManager';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [serverAdmin, setServerAdmin] = useState(false);

    useEffect(() => {
        fetch('/api/admin-status', { credentials: 'include' })
            .then(response => response.ok ? response.json() : null)
            .then(data => setServerAdmin(Boolean(data?.isAdmin)))
            .catch(() => setServerAdmin(false));
    }, []);

    useEffect(() => {
        let unsubscribeProfile: () => void = () => {};

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthError(null);

            if (currentUser) {
                if (analytics) logEvent(analytics, 'login', { method: 'google' });

                try {
                    await ensureUserProfile(currentUser);
                } catch (error) {
                    console.error('Profile setup failed:', error);
                }

                const userRef = doc(db, 'users', currentUser.uid);
                unsubscribeProfile = onSnapshot(
                    userRef,
                    (snapshot) => {
                        if (snapshot.exists()) {
                            setProfile(snapshot.data() as UserProfile);
                        }
                    },
                    (error) => {
                        console.error('Profile sync error:', error);
                    }
                );
            } else {
                setProfile(null);
                unsubscribeProfile();
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            unsubscribeProfile();
        };
    }, []);

    const login = async () => {
        setAuthError(null);
        const lang = AppStateManager.get('lang') || 'ar';
        try {
            if (Capacitor.isNativePlatform()) {
                if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) {
                    throw Object.assign(new Error('FirebaseAuthentication native plugin is unavailable in this APK.'), { code: 'auth/native-google-configuration' });
                }
                const result = await FirebaseAuthentication.signInWithGoogle();
                const idToken = result.credential?.idToken;
                if (!idToken) throw Object.assign(new Error('Native Google Sign-In returned no ID token.'), { code: 'auth/missing-google-id-token' });
                const credential = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, credential);
            } else {
                await signInWithPopup(auth, provider);
            }
            if (analytics) logEvent(analytics, 'login', { method: 'google' });
        } catch (error) {
            const authErr = error as AuthError;
            console.error('Login error:', authErr);
            setAuthError(getAuthErrorMessage(authErr, lang));
        }
    };

    const logout = async () => {
        setAuthError(null);
        try {
            if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, authError, isAdmin: serverAdmin || profile?.role === 'admin', login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
