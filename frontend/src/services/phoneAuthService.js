import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../config/firebase";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/**
 * Initialize or reuse an invisible reCAPTCHA verifier attached to a DOM container
 * @param {string} containerId - DOM ID of the container element (e.g. 'recaptcha-container')
 */
export const setupRecaptcha = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return null;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`reCAPTCHA container '#${containerId}' not found in DOM`);
    return null;
  }

  // Clear previous verifier and wipe the container element to prevent "already rendered" errors
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Could not clear previous recaptcha verifier:", e);
    }
    window.recaptchaVerifier = null;
  }
  container.innerHTML = "";

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      console.log("reCAPTCHA solved successfully");
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Please retry.");
    },
  });

  return window.recaptchaVerifier;
};

/**
 * Send OTP to phone number using Firebase Auth
 * @param {string} fullPhoneNumber - Phone number with country code, e.g. "+919876543210"
 * @param {string} containerId - Element ID for reCAPTCHA
 * @returns {Promise<confirmationResult>}
 */
export const sendFirebasePhoneOtp = async (fullPhoneNumber, containerId = "recaptcha-container") => {
  try {
    const appVerifier = setupRecaptcha(containerId);
    if (!appVerifier) {
      throw new Error(`reCAPTCHA container '#${containerId}' not found in DOM`);
    }
    const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
    return { success: true, confirmationResult };
  } catch (error) {
    console.error("Firebase send phone OTP error:", error);
    // Reset reCAPTCHA on failure so user can try again immediately
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
    throw error;
  }
};

/**
 * Confirm OTP with Firebase and send verified token to Backend to log in
 * @param {Object} confirmationResult - Object returned from sendFirebasePhoneOtp
 * @param {string} otp - 6-digit OTP code entered by user
 * @param {string} phoneSuffix - Country code e.g. "+91"
 */
export const verifyFirebasePhoneOtp = async (confirmationResult, otp, phoneSuffix = "") => {
  try {
    if (!confirmationResult) {
      throw new Error("No active OTP session. Please request an OTP first.");
    }

    // 1. Verify code on Firebase
    const userCredential = await confirmationResult.confirm(otp);

    // 2. Extract Firebase ID token
    const idToken = await userCredential.user.getIdToken();

    // 3. Send token to backend to create/authenticate MongoDB user and get JWT cookie
    const response = await axios.post(
      `${API_BASE_URL}/auth/verify-firebase-phone`,
      { idToken, phoneSuffix },
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    console.error("Firebase verify phone OTP error:", error);
    throw error;
  }
};
