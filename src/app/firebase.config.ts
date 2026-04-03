import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDNTv8mag6NH-rj2Q4a3U9qrtkx6NT9DBw",
    authDomain: "ipl2026-pred.firebaseapp.com",
    projectId: "ipl2026-pred",
    storageBucket: "ipl2026-pred.firebasestorage.app",
    messagingSenderId: "764166626245",
    appId: "1:764166626245:web:82303b9aced181889189ac",
    measurementId: "G-NB2M8S12WT"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
