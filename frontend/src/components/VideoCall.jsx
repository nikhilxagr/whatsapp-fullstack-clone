import React, { useEffect, useRef } from "react";
import {
  FaMicrophone, FaMicrophoneSlash,
  FaVideo, FaVideoSlash,
  FaPhoneSlash, FaPhone,
} from "react-icons/fa";
import useCallStore from "../store/useCallStore";
import { getAvatarUrl } from "../utils/avatarUtil";

/* Fullscreen overlay shown during calling / active / incoming states */
const VideoCall = () => {
  const {
    callState, callType,
    remoteUserName, remoteUserAvatar,
    localStream, remoteStream,
    isMuted, isCameraOff,
    acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  /* Attach MediaStream objects to <video> elements */
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

  if (callState === "idle") return null;

  const isVideo = callType === "video";
  const statusLabel = callState === "calling" ? "Calling..." : callState === "incoming" ? "Incoming call..." : "Connected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Remote video / avatar */}
      <div className="absolute inset-0">
        {callState === "active" && isVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <img
              src={getAvatarUrl({ profilePicture: remoteUserAvatar }, remoteUserName)}
              alt={remoteUserName}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl"
            />
            <h2 className="text-white text-2xl font-semibold tracking-wide">{remoteUserName}</h2>
            <p className="text-white/60 text-sm animate-pulse">{statusLabel}</p>
          </div>
        )}
      </div>

      {/* Local video (picture-in-picture) */}
      {isVideo && (
        <div className="absolute top-6 right-6 w-36 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-10 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
          />
          {isCameraOff && (
            <div className="w-full h-full flex items-center justify-center bg-[#202c33]">
              <FaVideoSlash className="text-white/40 w-8 h-8" />
            </div>
          )}
        </div>
      )}

      {/* Caller info overlay when not active */}
      {callState === "active" && isVideo && (
        <div className="absolute top-6 left-6 text-white z-10">
          <p className="text-lg font-semibold drop-shadow-lg">{remoteUserName}</p>
          <p className="text-xs text-white/60">In call</p>
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6 z-10">
        {/* Incoming call: Accept + Reject */}
        {callState === "incoming" ? (
          <>
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
              title="Decline"
            >
              <FaPhoneSlash className="w-6 h-6" />
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95"
              title="Accept"
            >
              <FaPhone className="w-6 h-6" />
            </button>
          </>
        ) : (
          <>
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <FaMicrophoneSlash className="w-5 h-5" /> : <FaMicrophone className="w-5 h-5" />}
            </button>

            {/* End call */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
              title="End call"
            >
              <FaPhoneSlash className="w-6 h-6" />
            </button>

            {/* Camera toggle (video only) */}
            {isVideo && (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${isCameraOff ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"}`}
                title={isCameraOff ? "Turn on camera" : "Turn off camera"}
              >
                {isCameraOff ? <FaVideoSlash className="w-5 h-5" /> : <FaVideo className="w-5 h-5" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
