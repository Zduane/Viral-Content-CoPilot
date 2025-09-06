import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
