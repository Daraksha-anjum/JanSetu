import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Support custom project overrides via client-side environment variables
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId
};

// Initialize Firebase App
const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
});

// Initialize Firestore (with support for custom named database IDs and robust connection settings)
let db: any;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  }, config.firestoreDatabaseId || "(default)");
} catch (e) {
  console.warn("initializeFirestore with autoDetectLongPolling failed, trying fallback:", e);
  try {
    db = getFirestore(app, config.firestoreDatabaseId || undefined);
  } catch (err2) {
    console.error("Firestore initialization failed completely, using basic app database:", err2);
    db = getFirestore(app);
  }
}

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };

