const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");
const fs = require("fs");

let isInitialized = false;

const initFirebase = () => {
  if (isInitialized || getApps().length > 0) return true;

  try {
    // 1. Check if a service account json file path is provided in .env or default location
    let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.resolve(__dirname, "../config/firebase-service-account.json");

    if (!fs.existsSync(serviceAccountPath)) {
      const doubleJsonPath = path.resolve(__dirname, "../config/firebase-service-account.json.json");
      if (fs.existsSync(doubleJsonPath)) {
        serviceAccountPath = doubleJsonPath;
      }
    }

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
      initializeApp({
        credential: cert(serviceAccount),
      });
      isInitialized = true;
      console.log("✅ Firebase Admin initialized from service account file");
      return true;
    }

    // 2. Otherwise check individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n/g, "\n");

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isInitialized = true;
      console.log("✅ Firebase Admin initialized from environment variables");
      return true;
    }

    console.warn(
      "ℹ️ [Firebase Admin Info] Missing Firebase Admin credentials in .env or firebase-service-account.json. Firebase token verification will be unavailable until credentials are added."
    );
    return false;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error.message);
    return false;
  }
};

// Function to verify Firebase ID Token from client
const verifyFirebaseToken = async (idToken) => {
  if (!isInitialized && !initFirebase()) {
    throw new Error(
      "Firebase Admin is not configured. Please add firebase-service-account.json to backend/config/ or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in backend/.env"
    );
  }

  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Firebase token verification error:", error);
    throw new Error("Invalid or expired Firebase ID token");
  }
};

// Attempt initialization on startup
initFirebase();

module.exports = { getAuth, verifyFirebaseToken };
