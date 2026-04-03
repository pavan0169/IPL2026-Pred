import { Injectable, signal } from '@angular/core';
import { auth, db } from '../firebase.config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface User {
    username: string;
    email: string;
    uid?: string;
    phone?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private _user = signal<User | null>(null);
    isLoggedIn = () => this._user() !== null;
    currentUser = () => this._user();
    isAdmin = () => ['tvskalyan2008@gmail.com', 'pavan.tv1999@gmail.com'].includes(this._user()?.email || '');

    private recaptchaVerifier!: RecaptchaVerifier;
    private confirmationResult!: ConfirmationResult | null;

    constructor() {
        if (typeof window !== 'undefined') {
            onAuthStateChanged(auth, async (u) => {
                if (u) {
                    const emailOrPhone = u.email || u.phoneNumber || '';
                    const rawName = u.displayName || emailOrPhone.split('@')[0] || 'User';
                    const username = AuthService.formatUsername(rawName);
                    this._user.set({ username, email: emailOrPhone, uid: u.uid, phone: u.phoneNumber || undefined });

                    try {
                        const userDoc = await getDoc(doc(db, 'users', u.uid));
                        if (!userDoc.exists()) {
                            await setDoc(doc(db, 'users', u.uid), {
                                username,
                                email: emailOrPhone,
                                phone: u.phoneNumber || null,
                                uid: u.uid,
                                joinedAt: new Date().toISOString()
                            });
                        }
                    } catch (e) {
                        console.error("Failed to check/create user doc", e);
                    }
                } else {
                    this._user.set(null);
                }
            });
        }
    }

    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
        if (!email || !password) return { success: false, error: 'Please fill in all fields.' };
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async signup(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
        if (!username || !email || !password) return { success: false, error: 'Please fill in all fields.' };
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: username });

            const formattedName = AuthService.formatUsername(username);

            // Register detailed info in Firestore using the user's UID
            await setDoc(doc(db, 'users', res.user.uid), {
                username: formattedName,
                email,
                uid: res.user.uid,
                joinedAt: new Date().toISOString()
            });

            this._user.set({ username: formattedName, email, uid: res.user.uid });
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    static formatUsername(name: string): string {
        if (!name) return 'User';
        const map: Record<string, string> = {
            'Kalyan Tangirala': 'Kalyan',
            'Jagadesh Jn': 'Jagadesh',
            'sumanth007': 'Sumanth',
            'Annamalai Kasi': 'Annamalai',
            'Valliappan S': 'Valliappan',
            'Ethan Hunt': 'Ethan'
        };
        return map[name] || name;
    }

    async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    setupRecaptcha(containerId: string) {
        if (typeof window === 'undefined') return;
        if (!this.recaptchaVerifier) {
            this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                size: 'invisible'
            });
        }
    }

    async sendPhoneCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
        try {
            this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, this.recaptchaVerifier);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async verifyPhoneCode(code: string): Promise<{ success: boolean; error?: string }> {
        if (!this.confirmationResult) return { success: false, error: 'No phone code request found.' };
        try {
            await this.confirmationResult.confirm(code);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async logout(): Promise<void> {
        try {
            if (typeof window !== 'undefined') {
                await signOut(auth);
            }
            this._user.set(null);
        } catch (e) {
            console.error(e);
        }
    }
}
