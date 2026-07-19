import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAke2alRnw_3S5eNd3pr5gRnHRwDaXJQLY",
  authDomain: "applications-tracker-33fcd.firebaseapp.com",
  projectId: "applications-tracker-33fcd",
  storageBucket: "applications-tracker-33fcd.firebasestorage.app",
  messagingSenderId: "562965738405",
  appId: "1:562965738405:web:afc0b3f551781fa8712e4c"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  // If already initialized due to HMR, get the existing instance
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
