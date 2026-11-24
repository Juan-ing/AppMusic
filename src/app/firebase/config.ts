// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {getDatabase, ref, set, push, onValue} from "firebase/database";
import type { FirebaseOptions } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyClY2u_DSOqbZk8GIe5cF6W92gPpXJ13UE",
  authDomain: "appmusic-6d100.firebaseapp.com",
  projectId: "appmusic-6d100",
  storageBucket: "appmusic-6d100.firebasestorage.app",
  messagingSenderId: "20566671956",
  appId: "1:20566671956:web:b33f42bb670e432dcfe3c1",
  measurementId: "G-DV0WFZ4XZR"
};

declare global {
  interface Window {
    __env?: {
      firebaseApiKey?: string;
      firebaseAuthDomain?: string;
      firebaseProjectId?: string;
      firebaseStorageBucket?: string;
      firebaseMessagingSenderId?: string;
      firebaseAppId?: string;
      firebaseMeasurementId?: string;
    };
  }
}

const runtimeConfig: FirebaseOptions = {
  apiKey: window.__env?.firebaseApiKey || firebaseConfig.apiKey,
  authDomain: window.__env?.firebaseAuthDomain || firebaseConfig.authDomain,
  projectId: window.__env?.firebaseProjectId || firebaseConfig.projectId,
  storageBucket: window.__env?.firebaseStorageBucket || firebaseConfig.storageBucket,
  messagingSenderId:
    window.__env?.firebaseMessagingSenderId || firebaseConfig.messagingSenderId,
  appId: window.__env?.firebaseAppId || firebaseConfig.appId,
  measurementId: window.__env?.firebaseMeasurementId || firebaseConfig.measurementId,
};

// Initialize Firebase
const app = initializeApp(runtimeConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { app, analytics, db, auth, database, ref, set, push, onValue };