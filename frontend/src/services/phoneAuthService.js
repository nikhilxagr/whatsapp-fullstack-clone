import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../config/firebase";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Initialize invisible reCAPTCHA verifier
export const setupRecaptcha = (containerId = "recaptcha-container") => {
  if (typeof window === "undefined") return null;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`reCAPTCHA container '#${containerId}' not found in DOM`);
    return null;
  }

  // Clear previous verifier to prevent already rendered errors
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

// Send OTP to phone number using Firebase
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

// Verify OTP with Firebase and authenticate with backend
export const verifyFirebasePhoneOtp = async (confirmationResult, otp, phoneSuffix = "") => {
  try {
    if (!confirmationResult) {
      throw new Error("No active OTP session. Please request an OTP first.");
    }

    const userCredential = await confirmationResult.confirm(otp);
    const idToken = await userCredential.user.getIdToken();

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
