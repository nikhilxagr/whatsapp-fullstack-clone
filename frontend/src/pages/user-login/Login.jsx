import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaWhatsapp,
  FaChevronDown,
  FaUser,
  FaPlus,
  FaArrowLeft,
  FaEnvelope,
  FaSun,
  FaMoon,
  FaExclamationCircle,
  FaCamera,
  FaShieldAlt,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";

import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/useThemeStore";
import countries from "../../utils/countries";
import Spinner from "../../utils/Spinner";
import { sendOtp, verifyOtp, updateUserProfile } from "../../services/userService";

// ---------------------- Validation Schemas ----------------------
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must contain digits only")
      .transform((val, orig) => (orig && orig.trim() === "" ? null : val)),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Please enter a valid email address")
      .transform((val, orig) => (orig && orig.trim() === "" ? null : val)),
  })
  .test("at-least-one", "Please enter either a phone number or email address", (val) =>
    Boolean((val.phoneNumber && val.phoneNumber.trim()) || (val.email && val.email.trim()))
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "OTP code must be exactly 6 digits")
    .required("OTP is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().trim().required("Username is required"),
  agreed: yup.boolean().oneOf([true], "You must agree to the Terms of Service"),
});

// Default Avatars Array
const avatars = [
  "https://avatar.iran.liara.run/public/boy?username=1",
  "https://avatar.iran.liara.run/public/boy?username=2",
  "https://avatar.iran.liara.run/public/girl?username=1",
  "https://avatar.iran.liara.run/public/girl?username=2",
  "https://avatar.iran.liara.run/public/boy?username=3",
];

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
  const { setUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  // Local Form / Interactive States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0] || { dialCode: "+91", flag: "🇮🇳", alpha2: "IN", name: "India" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dropdownRef = useRef(null);

  // Sync DOM theme class on mount or theme update
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // React Hook Form Instances for 3 Steps
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
    mode: "onTouched",
  });

  const {
    setValue: setOtpValue,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm({ resolver: yupResolver(otpValidationSchema) });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    watch,
    formState: { errors: profileErrors },
  } = useForm({ resolver: yupResolver(profileValidationSchema) });

  // ---------------------- OTP Input Handlers ----------------------
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      setOtpValue("otp", pasted);
      const last = document.getElementById("otp-5");
      if (last) last.focus();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  // ---------------------- API Handlers ----------------------
  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      if (email && email.trim()) {
        const response = await sendOtp(null, null, email.trim());
        if (response.status === "success") {
          toast.info("Verification code sent to your email");
          setUserPhoneData({ email: email.trim() });
          setStep(2);
        }
      } else if (phoneNumber && phoneNumber.trim()) {
        const response = await sendOtp(phoneNumber.trim(), selectedCountry.dialCode, null);
        if (response.status === "success") {
          toast.info("Verification code sent to your phone");
          setUserPhoneData({ phoneNumber: phoneNumber.trim(), phoneSuffix: selectedCountry.dialCode });
          setStep(2);
        }
      } else {
        setError("Please enter a phone number or email address");
      }
    } catch (err) {
      setError(err?.message || "Failed to send OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      const otpString = otp.join("");
      let response;

      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, otpString, userPhoneData.email);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          otpString,
          null
        );
      }

      if (response.status === "success") {
        toast.success("Identity verified successfully");
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back to WhatsApp");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      }
    } catch (err) {
      setError(err?.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("username", data.username.trim());
      formData.append("agreed", data.agreed);

      if (profilePictureFile) {
        formData.append("file", profilePictureFile);
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      await updateUserProfile(formData);
      toast.success("Welcome to WhatsApp Web");
      navigate("/");
      resetLoginState();
    } catch (err) {
      setError(err?.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dialCode.includes(searchTerm) ||
      c.alpha2.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 selection:bg-[#00a884] selection:text-white bg-[#eae6df] dark:bg-[#0c1317] transition-colors duration-300">
      {/* WhatsApp Web Brand Top Accent Banner */}
      <div className="absolute top-0 left-0 right-0 h-56 bg-gradient-to-r from-[#00a884] via-[#075e54] to-[#128c7e] dark:from-[#111b21] dark:via-[#182229] dark:to-[#111b21] dark:border-b dark:border-[#222e35] transition-colors duration-300" />

      {/* Top Navigation Bar: Brand & Theme Toggle */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between px-4 mb-6">
        <div className="flex items-center gap-2.5 text-white">
          <FaWhatsapp className="w-8 h-8 text-white drop-shadow-sm" />
          <span className="font-bold tracking-wider text-sm uppercase">WhatsApp Web</span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 dark:bg-[#202c33] dark:hover:bg-[#2a3942] text-white dark:text-[#e9edef] backdrop-blur-md text-xs font-medium transition-all shadow-sm"
        >
          {theme === "dark" ? (
            <>
              <FaSun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <FaMoon className="w-3.5 h-3.5 text-slate-100" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] bg-white dark:bg-[#111b21] border border-gray-200/80 dark:border-[#222e35] rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-7 sm:p-9 transition-colors duration-300"
      >
        {/* WhatsApp Brand Badge */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00a884] to-[#25d366] shadow-lg shadow-[#00a884]/25 flex items-center justify-center text-white"
          >
            <FaWhatsapp className="w-10 h-10 drop-shadow-sm" />
          </motion.div>
        </div>

        {/* Header Titles */}
        <div className="text-center mt-5 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-[#e9edef]">
            {step === 1 && "Log in to WhatsApp"}
            {step === 2 && "Enter Verification Code"}
            {step === 3 && "Complete Your Profile"}
          </h1>
          <p className="text-sm text-[#54656f] dark:text-[#8696a0] mt-1.5 leading-snug">
            {step === 1 && "Enter your phone number or email to receive a secure OTP"}
            {step === 2 && (
              <>
                Sent to{" "}
                <span className="font-semibold text-[#111b21] dark:text-[#e9edef]">
                  {userPhoneData?.email || `${userPhoneData?.phoneSuffix} ${userPhoneData?.phoneNumber}`}
                </span>
              </>
            )}
            {step === 3 && "Pick an avatar and enter your name to finish setup"}
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#00a884] mb-1.5">
            <span>Step {step} of 3</span>
            <span>
              {step === 1 && "Credentials"}
              {step === 2 && "Verification"}
              {step === 3 && "Profile"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#e9edef] dark:bg-[#202c33] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#00a884] rounded-full"
              initial={{ width: "33%" }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">
                <FaExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================================================================
            STEP 1: Phone / Email Form
        ================================================================ */}
        {step === 1 && (
          <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
            {/* Phone Number Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center h-12 w-full rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition-all duration-200">
                {/* Country Selector Button */}
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="h-full px-3 flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-l-xl flex-shrink-0 text-sm font-medium text-[#111b21] dark:text-[#e9edef]"
                >
                  <span className="text-base leading-none">{selectedCountry.flag}</span>
                  <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0]">
                    {selectedCountry.alpha2}
                  </span>
                  <span className="text-xs font-medium text-[#111b21] dark:text-[#e9edef]">
                    {selectedCountry.dialCode}
                  </span>
                  <FaChevronDown className="w-2.5 h-2.5 text-[#8696a0]" />
                </button>

                {/* Vertical Separator */}
                <div className="w-px h-6 bg-[#d1d7db] dark:bg-[#2a3942]" />

                {/* Phone Input */}
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  {...loginRegister("phoneNumber", {
                    onChange: (e) => setPhoneNumber(e.target.value.replace(/\D/g, "")),
                  })}
                  value={phoneNumber}
                  className="w-full h-full px-3.5 bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none rounded-r-xl"
                />

                {/* Country Dropdown Popover */}
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-14 left-0 w-80 max-h-72 overflow-hidden bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-xl shadow-2xl z-30 flex flex-col"
                  >
                    <div className="p-2.5 border-b border-gray-100 dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#111b21]">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#202c33]">
                        <FaSearch className="w-3 h-3 text-[#8696a0]" />
                        <input
                          type="text"
                          placeholder="Search country or code..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-transparent text-xs text-[#111b21] dark:text-[#e9edef] outline-none placeholder-[#8696a0]"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-56 divide-y divide-gray-50 dark:divide-[#2a3942]/40">
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((c, index) => (
                          <button
                            type="button"
                            key={c.alpha2 || c.dialCode || index}
                            onClick={() => {
                              setSelectedCountry(c);
                              setShowDropdown(false);
                              setSearchTerm("");
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors ${
                              selectedCountry.dialCode === c.dialCode && selectedCountry.alpha2 === c.alpha2
                                ? "bg-emerald-50 dark:bg-[#00a884]/10 text-[#00a884] font-semibold"
                                : "text-[#111b21] dark:text-[#e9edef]"
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className="text-base leading-none">{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="text-xs font-mono text-[#8696a0] ml-2 flex-shrink-0">
                              {c.dialCode}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-center py-6 text-[#8696a0]">No country found</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* OR Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-[#e9edef] dark:bg-[#2a3942]" />
              <span className="px-3 text-[11px] font-semibold tracking-widest uppercase text-[#8696a0]">
                OR
              </span>
              <div className="flex-1 h-px bg-[#e9edef] dark:bg-[#2a3942]" />
            </div>

            {/* Email Address Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Email Address <span className="text-[#8696a0] font-normal lowercase">(optional)</span>
              </label>
              <div className="flex items-center h-12 w-full rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition-all duration-200 px-3.5">
                <FaEnvelope className="w-4 h-4 text-[#8696a0] mr-3 flex-shrink-0" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  {...loginRegister("email", {
                    onChange: (e) => setEmail(e.target.value),
                  })}
                  value={email}
                  className="w-full h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                />
              </div>
              {loginErrors.email && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {loginErrors.email.message}
                </p>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading || (!phoneNumber && !email)}
              className="w-full h-12 mt-6 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#008069] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#00a884]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : "Send OTP Code"}
            </button>
          </form>
        )}

        {/* ================================================================
            STEP 2: 6-Box OTP Verification Form
        ================================================================ */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] text-center mb-3">
                6-Digit Verification Code
              </label>

              {/* 6 OTP Input Boxes */}
              <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] focus:border-[#00a884] focus:ring-2 focus:ring-[#00a884]/20 focus:bg-white dark:focus:bg-[#111b21] outline-none transition-all"
                  />
                ))}
              </div>
              {otpErrors.otp && (
                <p className="text-red-500 text-xs text-center mt-2 font-medium">
                  {otpErrors.otp.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full h-12 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#008069] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#00a884]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : "Verify & Continue"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full h-11 flex items-center justify-center text-xs font-medium rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1] transition-colors"
            >
              <FaArrowLeft className="mr-2 w-3 h-3" /> Wrong details? Go Back
            </button>
          </form>
        )}

        {/* ================================================================
            STEP 3: Profile Setup Form
        ================================================================ */}
        {step === 3 && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">
            {/* Profile Avatar Picker */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-3">
                <img
                  src={profilePicture || selectedAvatar}
                  alt="Profile Preview"
                  className="w-full h-full rounded-full object-cover border-2 border-[#00a884] shadow-md bg-[#f0f2f5] dark:bg-[#202c33]"
                />
                <label
                  htmlFor="profilePictureInput"
                  aria-label="Upload custom photo"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-105"
                >
                  <FaCamera className="w-3.5 h-3.5" />
                </label>
                <input
                  id="profilePictureInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <span className="text-xs font-medium text-[#54656f] dark:text-[#8696a0] mb-2">
                Or choose an avatar
              </span>

              <div className="flex gap-2.5 justify-center">
                {avatars.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av);
                      setProfilePicture(null);
                    }}
                    className={`relative rounded-full transition-transform ${
                      selectedAvatar === av && !profilePicture
                        ? "ring-2 ring-[#00a884] ring-offset-2 dark:ring-offset-[#111b21] scale-110"
                        : "opacity-75 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <img
                      src={av}
                      alt={`Preset Avatar ${idx + 1}`}
                      className="w-9 h-9 rounded-full object-cover bg-[#f0f2f5] dark:bg-[#202c33]"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Username Input Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Your Name / Username
              </label>
              <div className="flex items-center h-12 w-full rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 transition-all duration-200 px-3.5">
                <FaUser className="w-3.5 h-3.5 text-[#8696a0] mr-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Enter your name"
                  {...profileRegister("username")}
                  className="w-full h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                />
              </div>
              {profileErrors.username && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {profileErrors.username.message}
                </p>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="terms"
                  {...profileRegister("agreed")}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#00a884] focus:ring-[#00a884] cursor-pointer"
                />
                <span className="text-xs text-[#54656f] dark:text-[#8696a0] leading-relaxed">
                  I agree to the WhatsApp clone{" "}
                  <span className="text-[#00a884] font-medium underline underline-offset-2">
                    Terms & Privacy Policy
                  </span>
                </span>
              </label>
              {profileErrors.agreed && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">
                  {profileErrors.agreed.message}
                </p>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading || !watch("agreed")}
              className="w-full h-12 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#008069] text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-md shadow-[#00a884]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : "Start Chatting"}
            </button>
          </form>
        )}

        {/* Security & End-to-End Encryption Badge */}
        <div className="mt-7 pt-4 border-t border-gray-100 dark:border-[#222e35] flex items-center justify-center gap-2 text-[#8696a0] text-[11px]">
          <FaShieldAlt className="w-3 h-3 text-[#00a884]" />
          <span>End-to-end encrypted login authentication</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
