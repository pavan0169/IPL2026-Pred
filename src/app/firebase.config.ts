import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
    apiKey: "AIzaSyArmMeU94mWjWA_1a9dMZOFpI3JtS-7L_Q",
    authDomain: "iplpred2026.firebaseapp.com",
    projectId: "iplpred2026",
    storageBucket: "iplpred2026.firebasestorage.app",
    messagingSenderId: "179782583695",
    appId: "1:179782583695:web:abcb7cd192f1656555b7fa",
    measurementId: "G-5FSYHWHYXG"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
