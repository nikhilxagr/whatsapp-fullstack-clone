import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaWhatsapp,
  FaChevronDown,
  FaUser,
  FaArrowLeft,
  FaEnvelope,
  FaSun,
  FaMoon,
  FaExclamationCircle,
  FaCamera,
  FaShieldAlt,
  FaSearch,
  FaLock,
  FaPhone,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { toast } from "react-toastify";

import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import useThemeStore from "../../store/useThemeStore";
import countries from "../../utils/countries";
import {
  register,
  verifyEmail,
  loginWithEmail,
  loginWithPhone,
  updateUserProfile,
} from "../../services/userService";

// Preset avatars
const AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Trouble",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=Jasper",
];

const Spinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

const FieldError = ({ msg }) =>
  msg ? <p className="text-red-500 text-xs mt-1.5 font-medium">{msg}</p> : null;

const InputWrap = ({ children }) => (
  <div className="flex items-center h-12 w-full rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] focus-within:border-[#075e54] dark:focus-within:border-[#008069] focus-within:ring-2 focus-within:ring-[#075e54]/20 dark:focus-within:ring-[#008069]/20 transition-all duration-200 px-3.5 gap-3">
    {children}
  </div>
);

const PasswordInput = ({ value, onChange, placeholder = "Password", id }) => {
  const [show, setShow] = useState(false);
  return (
    <InputWrap>
      <FaLock className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="current-password"
        className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-[#8696a0] hover:text-[#075e54] dark:hover:text-[#008069] transition-colors flex-shrink-0"
      >
        {show ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
      </button>
    </InputWrap>
  );
};

const CountrySelector = ({ selected, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.alpha2.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-12 px-3 bg-[#f8fafc] dark:bg-[#202c33] border border-[#d1d7db] dark:border-[#2a3942] focus:border-[#075e54] dark:focus:border-[#008069] focus:ring-2 focus:ring-[#075e54]/20 rounded-xl text-sm font-medium text-[#111b21] dark:text-[#e9edef] transition-all whitespace-nowrap"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0]">{selected.alpha2}</span>
        <span className="text-xs">{selected.dialCode}</span>
        <FaChevronDown className="w-2.5 h-2.5 text-[#8696a0]" />
      </button>

      {open && (
        <div className="absolute top-14 left-0 w-72 max-h-64 flex flex-col bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-xl shadow-2xl z-30">
          <div className="p-2 border-b border-gray-100 dark:border-[#2a3942]">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#111b21]">
              <FaSearch className="w-3 h-3 text-[#8696a0]" />
              <input
                autoFocus
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-[#111b21] dark:text-[#e9edef] outline-none placeholder-[#8696a0]"
              />
            </div>
          </div>
          <div className="overflow-y-auto divide-y divide-gray-50 dark:divide-[#2a3942]/40">
            {filtered.length > 0 ? (
              filtered.map((c, i) => (
                <button
                  key={c.alpha2 || i}
                  type="button"
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors ${
                    selected.alpha2 === c.alpha2
                      ? "bg-[#075e54]/10 dark:bg-[#008069]/15 text-[#075e54] dark:text-[#00a884] font-semibold"
                      : "text-[#111b21] dark:text-[#e9edef]"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-xs font-mono text-[#8696a0] ml-2 flex-shrink-0">{c.dialCode}</span>
                </button>
              ))
            ) : (
              <p className="text-xs text-center py-6 text-[#8696a0]">No country found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const { mode, step, pendingData, setMode, setStep, setPendingData, resetLoginState } =
    useLoginStore();
  const { setUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(
    countries.find((c) => c.alpha2 === "IN") || countries[0]
  );

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // Profile setup
  const [username, setUsername] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);

  const [loginMethod, setLoginMethod] = useState("email"); // 'email' | 'phone'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Sync dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const clearError = () => setError("");

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const digit = val.slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\D/g, "");
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      document.getElementById("otp-5")?.focus();
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!email.trim()) return setError("Email is required");
    if (!password) return setError("Password is required");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        phoneNumber: phone.trim() || undefined,
        phoneSuffix: phone.trim() ? country.dialCode : undefined,
      });
      setPendingData({ email: email.trim() });
      toast.success("Verification code sent to your email!");
      setStep(2);
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearError();

    const code = otp.join("");
    if (code.length !== 6) return setError("Please enter the full 6-digit code");

    setLoading(true);
    try {
      const res = await verifyEmail({ email: pendingData.email, otp: code });
      if (res.status === "success") {
        const user = res.data?.user;
        // If profile is already complete, go straight to app
        if (user?.username && user?.profilePicture) {
          setUser(user);
          toast.success("Welcome back!");
          navigate("/");
          resetLoginState();
        } else {
          // Need profile setup
          setStep(3);
        }
      }
    } catch (err) {
      setError(err?.message || "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e) => {
    e.preventDefault();
    clearError();

    if (!username.trim()) return setError("Please enter your name");
    if (!agreed) return setError("You must agree to the Terms of Service");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("agreed", agreed);

      if (profilePicFile) {
        formData.append("file", profilePicFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      const res = await updateUserProfile(formData);
      if (res?.data?.user) setUser(res.data.user);

      toast.success("Welcome to WhatsApp Web! 🎉");
      navigate("/");
      resetLoginState();
    } catch (err) {
      setError(err?.message || "Failed to set up profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    clearError();

    if (!email.trim()) return setError("Email is required");
    if (!password) return setError("Password is required");

    setLoading(true);
    try {
      const res = await loginWithEmail({ email: email.trim(), password });
      if (res.status === "success") {
        const user = res.data?.user;
        setUser(user);
        toast.success("Welcome back!");
        navigate("/");
        resetLoginState();
      }
    } catch (err) {
      setError(err?.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    clearError();

    if (!phone.trim()) return setError("Phone number is required");
    if (!password) return setError("Password is required");

    setLoading(true);
    try {
      const res = await loginWithPhone({
        phoneNumber: phone.trim(),
        phoneSuffix: country.dialCode,
        password,
      });
      if (res.status === "success") {
        const user = res.data?.user;
        setUser(user);
        toast.success("Welcome back!");
        navigate("/");
        resetLoginState();
      }
    } catch (err) {
      setError(err?.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setOtp(["", "", "", "", "", ""]);
    clearError();
    setStep(step - 1);
  };

  const stepLabel = ["Credentials", "Verify Email", "Profile Setup"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#075e54] via-[#054c44] to-[#04332d] dark:from-[#052b24] dark:via-[#071f1b] dark:to-[#031512] transition-colors duration-300 selection:bg-[#00a884] selection:text-white relative overflow-hidden">
      {/* WhatsApp Dark Green Top Banner */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-r from-[#075e54] via-[#008069] to-[#054c44] dark:from-[#063b33] dark:via-[#075e54] dark:to-[#05322b] shadow-lg border-b border-black/10 dark:border-white/5 transition-colors" />

      {/* Ambient radial lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,168,132,0.18),transparent_65%)] pointer-events-none" />

      {/* Subtle WhatsApp chat pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          backgroundPosition: "0 0, 14px 14px",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 w-full max-w-[440px] flex items-center justify-between px-1 mb-6">
        <div className="flex items-center gap-2.5 text-white">
          <FaWhatsapp className="w-8 h-8 drop-shadow-md text-[#25d366] sm:text-white" />
          <span className="font-bold tracking-wider text-sm uppercase drop-shadow-sm">WhatsApp Web</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 dark:bg-black/25 dark:hover:bg-black/35 text-white backdrop-blur-md text-xs font-medium transition-all shadow-sm border border-white/20"
        >
          {theme === "dark" ? (
            <><FaSun className="w-3.5 h-3.5 text-amber-400" /><span>Light</span></>
          ) : (
            <><FaMoon className="w-3.5 h-3.5 text-emerald-200" /><span>Dark</span></>
          )}
        </button>
      </header>

      {/* Card */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] bg-white dark:bg-[#111b21] border border-[#075e54]/15 dark:border-[#1e3d36] rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] p-7 sm:p-9 transition-colors backdrop-blur-sm"
      >
        {/* WhatsApp icon */}
        <div className="flex justify-center mb-5">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#075e54] via-[#008069] to-[#25d366] shadow-lg shadow-[#075e54]/30 flex items-center justify-center"
          >
            <FaWhatsapp className="w-10 h-10 text-white drop-shadow-md" />
          </motion.div>
        </div>

        {/* Mode tab toggle (only on step 1 of register or login screen) */}
        {(mode === "login" || (mode === "register" && step === 1)) && (
          <div className="flex rounded-xl overflow-hidden border border-[#075e54]/20 dark:border-[#2a3942] bg-[#f0f2f5] dark:bg-[#202c33]/70 p-1 mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); clearError(); setEmail(""); setPassword(""); setPhone(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m
                    ? "bg-[#075e54] dark:bg-[#008069] text-white shadow-sm"
                    : "bg-transparent text-[#54656f] dark:text-[#8696a0] hover:text-[#075e54] dark:hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar — register flow only */}
        {mode === "register" && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#075e54] dark:text-[#00a884] mb-1.5">
              <span>Step {step} of 3</span>
              <span>{stepLabel[step - 1]}</span>
            </div>
            <div className="w-full h-1.5 bg-[#e9edef] dark:bg-[#202c33] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#075e54] to-[#00a884] rounded-full"
                animate={{ width: `${(step / 3) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold tracking-tight text-[#111b21] dark:text-[#e9edef]">
            {mode === "login" && "Sign in to WhatsApp"}
            {mode === "register" && step === 1 && "Create your account"}
            {mode === "register" && step === 2 && "Verify your email"}
            {mode === "register" && step === 3 && "Set up your profile"}
          </h1>
          <p className="text-xs text-[#54656f] dark:text-[#8696a0] mt-1 leading-snug">
            {mode === "login" && "Enter your credentials to continue"}
            {mode === "register" && step === 1 && "Email is required · phone is optional"}
            {mode === "register" && step === 2 && (
              <>A 6-digit code was sent to <strong className="text-[#111b21] dark:text-[#e9edef]">{pendingData?.email}</strong></>
            )}
            {mode === "register" && step === 3 && "Choose an avatar and enter your name"}
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">
                <FaExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === "login" && (
          <div>
            {/* Login method toggle */}
            <div className="flex gap-2 mb-4">
              {["email", "phone"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setLoginMethod(m); clearError(); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                    loginMethod === m
                      ? "bg-[#075e54]/10 dark:bg-[#008069]/20 border-[#075e54] dark:border-[#008069] text-[#075e54] dark:text-[#00a884]"
                      : "border-[#e9edef] dark:border-[#2a3942] text-[#54656f] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]"
                  }`}
                >
                  {m === "email" ? "📧 Email" : "📱 Phone"}
                </button>
              ))}
            </div>

            {loginMethod === "email" ? (
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <InputWrap>
                    <FaEnvelope className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                    />
                  </InputWrap>
                </div>
                <div>
                  <PasswordInput id="login-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-xl bg-[#075e54] hover:bg-[#064e45] active:bg-[#053e37] dark:bg-[#008069] dark:hover:bg-[#00a884] dark:active:bg-[#075e54] text-white font-semibold text-sm tracking-wide transition-all shadow-md shadow-[#075e54]/25 dark:shadow-[#008069]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneLogin} className="space-y-3">
                <div className="flex gap-2 items-start">
                  <CountrySelector selected={country} onSelect={setCountry} />
                  <InputWrap>
                    <FaPhone className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                    />
                  </InputWrap>
                </div>
                <div>
                  <PasswordInput id="phone-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-xl bg-[#075e54] hover:bg-[#064e45] active:bg-[#053e37] dark:bg-[#008069] dark:hover:bg-[#00a884] dark:active:bg-[#075e54] text-white font-semibold text-sm tracking-wide transition-all shadow-md shadow-[#075e54]/25 dark:shadow-[#008069]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : "Sign In with Phone"}
                </button>
              </form>
            )}
          </div>
        )}

        {mode === "register" && step === 1 && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Email <span className="text-[#075e54] dark:text-[#008069]">*</span>
              </label>
              <InputWrap>
                <FaEnvelope className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                />
              </InputWrap>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Password <span className="text-[#075e54] dark:text-[#008069]">*</span>
              </label>
              <PasswordInput id="reg-pass" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Confirm Password <span className="text-[#075e54] dark:text-[#008069]">*</span>
              </label>
              <PasswordInput id="reg-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
            </div>

            {/* Optional phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Phone Number <span className="font-normal text-[#8696a0] lowercase">(optional)</span>
              </label>
              <div className="flex gap-2 items-start">
                <CountrySelector selected={country} onSelect={setCountry} />
                <InputWrap>
                  <FaPhone className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
                  <input
                    type="tel"
                    placeholder="For phone login later"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                  />
                </InputWrap>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-[#075e54] hover:bg-[#064e45] active:bg-[#053e37] dark:bg-[#008069] dark:hover:bg-[#00a884] dark:active:bg-[#075e54] text-white font-semibold text-sm tracking-wide transition-all shadow-md shadow-[#075e54]/25 dark:shadow-[#008069]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : "Send Verification Code"}
            </button>
          </form>
        )}

        {mode === "register" && step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] text-center mb-3">
                6-Digit Verification Code
              </label>
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
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-[#d1d7db] dark:border-[#2a3942] bg-[#f8fafc] dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] focus:border-[#075e54] dark:focus:border-[#008069] focus:ring-2 focus:ring-[#075e54]/20 dark:focus:ring-[#008069]/20 focus:bg-white dark:focus:bg-[#111b21] outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join("").length !== 6}
              className="w-full h-12 rounded-xl bg-[#075e54] hover:bg-[#064e45] active:bg-[#053e37] dark:bg-[#008069] dark:hover:bg-[#00a884] dark:active:bg-[#075e54] text-white font-semibold text-sm tracking-wide transition-all shadow-md shadow-[#075e54]/25 dark:shadow-[#008069]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {mode === "register" && step === 3 && (
          <form onSubmit={handleProfileSetup} className="space-y-4">
            {/* Avatar picker */}
            <div className="flex flex-col items-center">
              <div className="relative w-24 h-24 mb-3">
                <img
                  src={profilePicPreview || selectedAvatar}
                  alt="Profile preview"
                  className="w-full h-full rounded-full object-cover border-2 border-[#075e54] dark:border-[#008069] shadow-md bg-[#f0f2f5] dark:bg-[#202c33]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#075e54] hover:bg-[#064e45] dark:bg-[#008069] dark:hover:bg-[#00a884] text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                >
                  <FaCamera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setProfilePicFile(f); setProfilePicPreview(URL.createObjectURL(f)); }
                  }}
                />
              </div>

              <p className="text-xs font-medium text-[#54656f] dark:text-[#8696a0] mb-2">Or choose an avatar</p>
              <div className="flex gap-2.5 justify-center">
                {AVATARS.map((av, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setSelectedAvatar(av); setProfilePicPreview(null); setProfilePicFile(null); }}
                    className={`rounded-full transition-transform ${
                      selectedAvatar === av && !profilePicPreview
                        ? "ring-2 ring-[#075e54] dark:ring-[#008069] ring-offset-2 dark:ring-offset-[#111b21] scale-110"
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                  >
                    <img src={av} alt={`Avatar ${i + 1}`} className="w-9 h-9 rounded-full object-cover bg-[#f0f2f5]" />
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#54656f] dark:text-[#8696a0] mb-1.5">
                Your Name
              </label>
              <InputWrap>
                <FaUser className="w-3.5 h-3.5 text-[#8696a0] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Enter your display name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 h-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm font-medium outline-none"
                />
              </InputWrap>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#075e54] dark:text-[#008069] focus:ring-[#075e54] cursor-pointer"
              />
              <span className="text-xs text-[#54656f] dark:text-[#8696a0] leading-relaxed">
                I agree to the WhatsApp clone{" "}
                <span className="text-[#075e54] dark:text-[#008069] font-medium underline underline-offset-2">Terms & Privacy Policy</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#075e54] hover:bg-[#064e45] active:bg-[#053e37] dark:bg-[#008069] dark:hover:bg-[#00a884] dark:active:bg-[#075e54] text-white font-semibold text-sm tracking-wide transition-all shadow-md shadow-[#075e54]/25 dark:shadow-[#008069]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : "Start Chatting 🎉"}
            </button>
          </form>
        )}

        {/* Footer badge */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#222e35] flex items-center justify-center gap-2 text-[#8696a0] text-[11px]">
          <FaShieldAlt className="w-3 h-3 text-[#075e54] dark:text-[#008069]" />
          <span>End-to-end encrypted login authentication</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
