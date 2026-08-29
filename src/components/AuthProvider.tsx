import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signInAnonymously,
    GoogleAuthProvider,
    signOut,
    AuthError
} from 'firebase/auth';
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
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    authError: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    authError: null,
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
                role: 'user'
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
    };
    const msg = messages[error.code];
    if (msg) return msg[lang] || msg['ar'];
    return lang === 'ar'
        ? `خطأ في تسجيل الدخول: ${error.message}`
        : `Login error: ${error.message}`;
};

import { AppStateManager } from '../utils/AppStateManager';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    // Auth state listener
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

                // Real-time profile listener
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
            const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
            if (isCapacitor) {
                // In Capacitor, Google Login via Popup/Redirect is restricted by the platform.
                // Offer Guest (Anonymous) Login directly to let them use the app immediately.
                const confirmGuest = window.confirm(
                    lang === 'ar'
                        ? 'تسجيل الدخول باستخدام جوجل غير مدعوم حالياً على الهاتف. هل تريد الدخول كزائر لتجربة التطبيق؟'
                        : 'Google Login is not supported on mobile. Would you like to log in as a Guest to try the app?'
                );
                if (confirmGuest) {
                    await signInAnonymously(auth);
                    return;
                }
            }
            await signInWithPopup(auth, provider);
            if (analytics) logEvent(analytics, 'login', { method: 'google' });
        } catch (error) {
            const authErr = error as AuthError;
            console.error('Login error:', authErr);
            // Automatic fallback to Anonymous login if Google popup fails
            try {
                console.log('Attempting anonymous fallback...');
                await signInAnonymously(auth);
            } catch (anonError) {
                console.error('Anonymous login fallback failed:', anonError);
                setAuthError(getAuthErrorMessage(authErr));
            }
        }
    };

    const logout = async () => {
        setAuthError(null);
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, authError, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
