import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const getEnv = (key) =>
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env[`VITE_${key}`] || import.meta.env[`REACT_APP_${key}`])) ||
  (typeof process !== "undefined" && (process.env?.[`REACT_APP_${key}`] || process.env?.[`VITE_${key}`])) ||
  "";

const firebaseConfig = {
  apiKey: getEnv("FIREBASE_API_KEY"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID"),
};

// Reuse existing instance on React Fast Refresh to prevent app/duplicate-app error
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { RecaptchaVerifier, signInWithPhoneNumber };
export default app;

