import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ==========================================================================================
// IMPORTANT: FIREBASE CONFIGURATION
//
// You MUST replace the placeholder values below with your own Firebase project's
// configuration details. This is required for authentication and user profiles to work.
// Without valid credentials here, the app will fail to initialize Firebase and you
// will see a "Component auth has not been registered yet" error.
//
// How to get your config:
// 1. Go to your Firebase project's settings in the Firebase console.
// 2. In the "General" tab, find the "Your apps" section.
// 3. Click on the web app you registered.
// 4. In the "Firebase SDK snippet" section, choose "Config" and copy the object.
//
// See: https://support.google.com/firebase/answer/7015592
// ==========================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);