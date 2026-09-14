import React, { useState } from "react";
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp } from "../services/phoneAuthService";

const PhoneLogin = ({ onLoginSuccess }) => {
  const [phoneSuffix, setPhoneSuffix] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [step, setStep] = useState("PHONE"); // 'PHONE' | 'OTP'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    let cleanNumber = phoneNumber.trim().replace(/\D/g, "");
    const cleanSuffix = phoneSuffix.replace(/\D/g, "");

    // If user already typed the country code, strip it to prevent duplicate prefix
    if (cleanNumber.startsWith(cleanSuffix) && cleanNumber.length > cleanSuffix.length + 6) {
      cleanNumber = cleanNumber.slice(cleanSuffix.length);
    }
    // Remove leading zeros
    cleanNumber = cleanNumber.replace(/^0+/, "");

    if (!cleanNumber || cleanNumber.length < 7) {
      setErrorMsg("Please enter a valid phone number");
      return;
    }

    const fullPhoneNumber = `${phoneSuffix}${cleanNumber}`;
    setLoading(true);

    try {
      const { confirmationResult: confResult } = await sendFirebasePhoneOtp(
        fullPhoneNumber,
        "recaptcha-container"
      );
      setConfirmationResult(confResult);
      setStep("OTP");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to send verification SMS. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!otp || otp.trim().length !== 6) {
      setErrorMsg("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyFirebasePhoneOtp(
        confirmationResult,
        otp.trim(),
        phoneSuffix
      );

      if (onLoginSuccess) {
        onLoginSuccess(response.data?.user || response.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.message || "Invalid OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-[#111b21] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
      {/* Invisible reCAPTCHA container required by Firebase */}
      <div id="recaptcha-container"></div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {step === "PHONE" ? "Enter your phone number" : "Enter Verification Code"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {step === "PHONE"
            ? "WhatsApp clone will send an SMS to verify your number."
            : `Code sent to ${phoneSuffix} ${phoneNumber}`}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {step === "PHONE" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="flex gap-2">
            <select
              value={phoneSuffix}
              onChange={(e) => setPhoneSuffix(e.target.value)}
              className="bg-gray-50 dark:bg-[#202c33] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-3 outline-none focus:border-[#00a884]"
            >
              <option value="+91">🇮🇳 +91 (India)</option>
              <option value="+1">🇺🇸 +1 (USA)</option>
              <option value="+44">🇬🇧 +44 (UK)</option>
              <option value="+971">🇦🇪 +971 (UAE)</option>
              <option value="+61">🇦🇺 +61 (Australia)</option>
              <option value="+49">🇩🇪 +49 (Germany)</option>
            </select>

            <input
              type="tel"
              placeholder="98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              className="flex-1 bg-gray-50 dark:bg-[#202c33] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-3 outline-none focus:border-[#00a884]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#00a884] hover:bg-[#06cf9c] text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Sending SMS..." : "Next"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={loading}
              className="w-full text-center tracking-[10px] text-2xl font-bold bg-gray-50 dark:bg-[#202c33] border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-3 outline-none focus:border-[#00a884]"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("PHONE");
                setOtp("");
                setErrorMsg("");
              }}
              disabled={loading}
              className="w-1/3 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition-all"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3 px-4 bg-[#00a884] hover:bg-[#06cf9c] text-white font-semibold rounded-lg transition-all shadow-md disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PhoneLogin;
