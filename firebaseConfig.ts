// FIX: The firebase v9 modular imports were failing. Switched to firebase v8 compatible imports and initialization.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA7OU-HdZKA8hD6savN80vdjjusLcHLQRs",
  authDomain: "viral-ugc-copilot.firebaseapp.com",
  projectId: "viral-ugc-copilot",
  storageBucket: "viral-ugc-copilot.appspot.com",
  messagingSenderId: "439342969856",
  appId: "1:439342969856:web:23f797426da05a435d54e5",
  measurementId: "G-NBGX0G82SG"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const analytics = firebase.analytics();