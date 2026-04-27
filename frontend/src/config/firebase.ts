// Mocked Firebase config for the gastify frontend port.
//
// The original BoletApp config bootstrapped a real Firebase project from
// VITE_FIREBASE_* env vars. In the mocked build we point at the shim
// instances exported from src/__firebase-mocks__/. The same module path
// stays in place so every import site (`import { db } from '@/config/firebase'`)
// keeps working.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'gastify-mock.local',
  projectId: 'gastify-mock',
  storageBucket: 'gastify-mock.local',
  messagingSenderId: '0',
  appId: '1:0:web:mock',
};

export const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
