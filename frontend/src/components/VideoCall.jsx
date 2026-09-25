import React, { useEffect, useRef, useState } from "react";
import {
  FaMicrophone, FaMicrophoneSlash,
  FaVideoSlash, FaPhoneSlash, FaPhone,
  FaVolumeUp, FaVolumeMute,
} from "react-icons/fa";
import { MdFlipCameraAndroid, MdVideocam } from "react-icons/md";
import useCallStore from "../store/useCallStore";
import { getAvatarUrl } from "../utils/avatarUtil";

/* ── Duration formatter hh:mm:ss / mm:ss ──────────────────────────── */
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* ── Animated ring pulse (around avatar when calling/incoming) ────── */
const RingPulse = () => (
  <span className="absolute inset-0 rounded-full animate-ping bg-white/20 pointer-events-none" />
);

/* ── Control Button ────────────────────────────────────────────────── */
const CtrlBtn = ({ onClick, active, danger, icon, label, size = "md" }) => {
  const base =
    "flex flex-col items-center gap-1.5 group select-none cursor-pointer";
  const btnSize = size === "lg" ? "w-16 h-16" : "w-13 h-13";
  const bg = danger
    ? "bg-red-500 hover:bg-red-600"
    : active
    ? "bg-white/30 hover:bg-white/40 ring-2 ring-white/60"
    : "bg-white/15 hover:bg-white/25";

  return (
    <button onClick={onClick} className={base} title={label}>
      <span
        className={`${btnSize} rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${bg}`}
      >
        {icon}
      </span>
      <span className="text-[10px] text-white/70 font-medium tracking-wide">{label}</span>
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   VIDEO CALL MODAL
   ══════════════════════════════════════════════════════════════════════ */
const VideoCall = () => {
  const {
    callState,
    callType,
    callDuration,
    remoteUserName,
    remoteUserAvatar,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isSpeakerOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useCallStore();

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef(null);

  /* ── Attach streams to video elements ── */
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /* ── Auto-hide controls during active video call ── */
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (callState === "active" && callType === "video") {
      hideTimer.current = setTimeout(() => setShowControls(false), 4000);
    }
  };

  useEffect(() => {
    if (callState === "active") resetHideTimer();
    else setShowControls(true);
    return () => hideTimer.current && clearTimeout(hideTimer.current);
  }, [callState]);

  /* ── Nothing to render when idle ── */
  if (callState === "idle") return null;

  const isVideo  = callType === "video";
  const isActive = callState === "active";

  const statusText = {
    calling:    "Calling...",
    incoming:   "Incoming call",
    connecting: "Connecting...",
    active:     formatDuration(callDuration),
    ended:      "Call ended",
  }[callState] || "";

  const remoteAvatar = getAvatarUrl(
    { profilePicture: remoteUserAvatar },
    remoteUserName
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ── Backdrop ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d2137] to-[#091a14]" />

      {/* ════════════════════════════════════════════
          VIDEO CALL MODE
          ════════════════════════════════════════════ */}
      {isVideo && (
        <>
          {/* Remote full-screen video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              isActive && remoteStream ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Subtle dark gradient over video for UI contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          {/* Local PiP */}
          <div className="absolute top-5 right-5 w-28 h-36 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20 bg-[#111]">
            {isCameraOff ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#202c33] gap-2">
                <FaVideoSlash className="text-white/40 w-7 h-7" />
                <span className="text-white/30 text-[10px]">Camera off</span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          AUDIO CALL / PRE-CONNECT STATE (avatar + rings)
          ════════════════════════════════════════════ */}
      {(!isVideo || !isActive || !remoteStream) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-6 pointer-events-none">
          {/* Pulsing avatar rings */}
          <div className="relative flex items-center justify-center">
            {(callState === "calling" || callState === "incoming") && (
              <>
                <span
                  className="absolute w-44 h-44 rounded-full border border-white/10 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <span
                  className="absolute w-56 h-56 rounded-full border border-white/5 animate-ping"
                  style={{ animationDuration: "2.5s" }}
                />
                <span
                  className="absolute w-64 h-64 rounded-full border border-white/[0.03] animate-ping"
                  style={{ animationDuration: "3s" }}
                />
              </>
            )}
            <img
              src={remoteAvatar}
              alt={remoteUserName}
              className="relative z-10 w-36 h-36 rounded-full object-cover border-4 border-white/20 shadow-2xl"
            />
          </div>

          {/* Name + status */}
          <div className="text-center">
            <h2 className="text-white text-2xl font-semibold tracking-wide drop-shadow-lg">
              {remoteUserName}
            </h2>
            <p
              className={`text-sm mt-1 font-medium drop-shadow ${
                callState === "active" ? "text-[#25d366]" :
                callState === "ended"  ? "text-red-400/80" :
                "text-white/60 animate-pulse"
              }`}
            >
              {statusText}
            </p>
          </div>
        </div>
      )}

      {/* Active video: top info bar */}
      {isVideo && isActive && (
        <div
          className={`absolute top-0 left-0 right-0 px-5 pt-4 pb-3 z-20 flex items-center gap-3 transition-opacity duration-500 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={remoteAvatar}
            alt={remoteUserName}
            className="w-9 h-9 rounded-full object-cover border-2 border-white/30"
          />
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{remoteUserName}</p>
            <p className="text-[#25d366] text-xs font-medium">{formatDuration(callDuration)}</p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          CONTROLS ZONE
          ════════════════════════════════════════════ */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-500 ${
          isVideo && isActive && !showControls
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        {/* ─ INCOMING CALL BAR ─ */}
        {callState === "incoming" && (
          <div className="flex flex-col items-center gap-5 pb-14 pt-4">
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold">
              {isVideo ? "📹  Video call" : "📞  Voice call"}
            </p>
            <div className="flex items-center gap-12">
              {/* Decline */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={rejectCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95"
                >
                  <FaPhoneSlash className="w-6 h-6" />
                </button>
                <span className="text-white/60 text-xs">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 animate-bounce"
                >
                  <FaPhone className="w-6 h-6" />
                </button>
                <span className="text-[#25d366] text-xs font-medium">Accept</span>
              </div>
            </div>
          </div>
        )}

        {/* ─ ACTIVE / CALLING CONTROLS ─ */}
        {(callState === "calling" || callState === "connecting" || isActive) && (
          <div className="flex flex-col items-end gap-4 pb-10 pt-4 px-6">
            {/* Controls row */}
            <div className="w-full flex items-end justify-center gap-4 sm:gap-7">
              {/* Mic */}
              <CtrlBtn
                onClick={toggleMute}
                active={isMuted}
                icon={isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
                label={isMuted ? "Unmute" : "Mute"}
              />

              {/* Camera (video only) */}
              {isVideo && (
                <CtrlBtn
                  onClick={toggleCamera}
                  active={isCameraOff}
                  icon={isCameraOff ? <FaVideoSlash className="w-5 h-5" /> : <MdVideocam className="w-5 h-5" />}
                  label={isCameraOff ? "Cam off" : "Camera"}
                />
              )}

              {/* End call — prominent centre */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
                  title="End call"
                >
                  <FaPhoneSlash className="w-6 h-6" />
                </button>
                <span className="text-[10px] text-white/70 font-medium">End</span>
              </div>

              {/* Speaker */}
              <CtrlBtn
                onClick={toggleSpeaker}
                active={isSpeakerOff}
                icon={isSpeakerOff ? <FaVolumeMute className="w-5 h-5" /> : <FaVolumeUp className="w-5 h-5" />}
                label={isSpeakerOff ? "Speaker off" : "Speaker"}
              />

              {/* Flip camera placeholder (mobile feel) */}
              {isVideo && (
                <CtrlBtn
                  onClick={() => {}}
                  icon={<MdFlipCameraAndroid className="w-5 h-5" />}
                  label="Flip"
                />
              )}
            </div>
          </div>
        )}

        {/* ─ CALL ENDED STATE ─ */}
        {callState === "ended" && (
          <div className="flex justify-center pb-14">
            <p className="text-red-400/80 text-sm font-medium animate-pulse">Call ended</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
