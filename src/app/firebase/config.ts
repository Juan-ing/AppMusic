declare global {
  interface Window {
    __env?: {
      firebaseApiKey?: string;
      firebaseAuthDomain?: string;
      firebaseProjectId?: string;
      firebaseStorageBucket?: string;
      firebaseMessagingSenderId?: string;
      firebaseAppId?: string;
    };
  }
}

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const env = window.__env ?? {};

export const firebaseConfig = {
  apiKey: env.firebaseApiKey ?? '',
  authDomain: env.firebaseAuthDomain ?? '',
  projectId: env.firebaseProjectId ?? '',
  storageBucket: env.firebaseStorageBucket ?? '',
  messagingSenderId: env.firebaseMessagingSenderId ?? '',
  appId: env.firebaseAppId ?? '',
};

const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

export const firebaseApp = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

if (auth) {
  void setPersistence(auth, browserLocalPersistence);
}
