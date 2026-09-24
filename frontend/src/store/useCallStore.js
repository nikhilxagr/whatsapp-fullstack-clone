import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import useUserStore from "./useUserStore";
import { toast } from "react-toastify";

/* ── STUN / TURN ICE configuration ────────────────────────────────── */
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

/* ── Internal timer state (outside store to avoid serialisation issues) ─ */
let _durationInterval = null;

const startDurationTimer = (set) => {
  stopDurationTimer();
  _durationInterval = setInterval(() => {
    set((s) => ({ callDuration: s.callDuration + 1 }));
  }, 1000);
};

const stopDurationTimer = () => {
  if (_durationInterval) {
    clearInterval(_durationInterval);
    _durationInterval = null;
  }
};

/* ── Store ─────────────────────────────────────────────────────────── */
const useCallStore = create((set, get) => ({
  /* Call state machine:
     "idle" | "calling" | "incoming" | "connecting" | "active" | "ended" */
  callState: "idle",
  callType: null,       // "video" | "audio"
  callDuration: 0,      // seconds since call became active

  /* Remote peer info */
  remoteUserId: null,
  remoteUserName: null,
  remoteUserAvatar: null,

  /* Media streams */
  localStream: null,
  remoteStream: null,

  /* Media controls */
  isMuted: false,
  isCameraOff: false,
  isSpeakerOff: false,

  /* WebRTC internals */
  peerConnection: null,
  pendingOffer: null,
  pendingCandidates: [],

  /* ── Private: create RTCPeerConnection ─────────────────────────── */
  _createPeerConnection: () => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    /* Forward ICE candidates to remote peer */
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      const { remoteUserId } = get();
      const socket = getSocket();
      if (socket && remoteUserId) {
        socket.emit("call:ice-candidate", { to: remoteUserId, candidate });
      }
    };

    /* Attach incoming remote media stream */
    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack received:", event.track.kind, event.streams);
      let stream = event.streams && event.streams[0];
      if (!stream) {
        const currentRemoteStream = get().remoteStream;
        if (currentRemoteStream) {
          currentRemoteStream.addTrack(event.track);
          stream = currentRemoteStream;
        } else {
          stream = new MediaStream([event.track]);
        }
      }
      set({ remoteStream: stream, callState: "active" });
      startDurationTimer(set);
    };

    const handleConnected = () => {
      if (get().callState !== "active") {
        set({ callState: "active" });
        startDurationTimer(set);
      }
    };

    /* Auto-cleanup or activate on connection state changes */
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] connectionState:", pc.connectionState);
      if (pc.connectionState === "connected") {
        handleConnected();
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        get()._cleanup("ended");
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        handleConnected();
      }
    };

    return pc;
  },

  /* ── Caller: initiate an outgoing call ─────────────────────────── */
  startCall: async (remoteUser, callType = "video") => {
    const socket = getSocket();
    if (!socket) {
      toast.error("Socket not connected. Try again.");
      return;
    }

    /* Prevent double-calling */
    if (get().callState !== "idle") return;

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      });

      const pc = get()._createPeerConnection();
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });
      await pc.setLocalDescription(offer);

      const currentUser = useUserStore.getState().user;

      set({
        callState: "calling",
        callType,
        callDuration: 0,
        remoteUserId: remoteUser._id,
        remoteUserName: remoteUser.username || remoteUser.name,
        remoteUserAvatar: remoteUser.profilePicture,
        localStream,
        peerConnection: pc,
        pendingCandidates: [],
      });

      socket.emit("call:offer", {
        to: remoteUser._id,
        offer,
        callType,
        from: currentUser?._id,
        callerName: currentUser?.username || "WhatsApp Contact",
        callerAvatar: currentUser?.profilePicture || null,
      });
    } catch (err) {
      console.error("startCall error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Camera/microphone permission denied.");
      } else if (err.name === "NotFoundError") {
        toast.error("No camera or microphone found.");
      } else {
        toast.error("Failed to start call.");
      }
      get()._cleanup("idle");
    }
  },

  /* ── Callee: accept the incoming call ──────────────────────────── */
  acceptCall: async () => {
    const socket = getSocket();
    const { pendingOffer, remoteUserId, callType, pendingCandidates } = get();
    if (!socket || !pendingOffer) return;

    set({ callState: "connecting" });

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      });

      const pc = get()._createPeerConnection();
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));

      /* Drain any queued ICE candidates */
      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      set({ localStream, peerConnection: pc, pendingCandidates: [] });

      socket.emit("call:answer", { to: remoteUserId, answer });
    } catch (err) {
      console.error("acceptCall error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Camera/microphone permission denied.");
      } else {
        toast.error("Failed to connect call.");
      }
      get()._cleanup("idle");
    }
  },

  /* ── Callee: decline the incoming call ─────────────────────────── */
  rejectCall: () => {
    const socket = getSocket();
    const { remoteUserId } = get();
    if (socket && remoteUserId) {
      socket.emit("call:reject", { to: remoteUserId });
    }
    get()._cleanup("idle");
  },

  /* ── Either peer: end or cancel a call ─────────────────────────── */
  endCall: () => {
    const socket = getSocket();
    const { remoteUserId } = get();
    if (socket && remoteUserId) {
      socket.emit("call:end", { to: remoteUserId });
    }
    get()._cleanup("ended");
  },

  /* ── Socket event handlers ─────────────────────────────────────── */

  onIncomingCall: ({ from, offer, callType, callerName, callerAvatar }) => {
    /* Ignore if already in a call */
    if (get().callState !== "idle") {
      const socket = getSocket();
      if (socket) socket.emit("call:reject", { to: from });
      return;
    }
    set({
      callState: "incoming",
      callType: callType || "video",
      callDuration: 0,
      remoteUserId: from,
      remoteUserName: callerName || "Incoming Call",
      remoteUserAvatar: callerAvatar || null,
      pendingOffer: offer,
      pendingCandidates: [],
    });
  },

  onCallAnswered: async ({ answer }) => {
    console.log("[WebRTC] onCallAnswered received");
    const { peerConnection, pendingCandidates } = get();
    if (!peerConnection) return;
    try {
      if (peerConnection.signalingState === "stable") {
        console.log("[WebRTC] signalingState is already stable");
        return;
      }
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      set({ callState: "connecting" });

      /* Drain queued ICE candidates received before answer */
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      set({ pendingCandidates: [] });
    } catch (err) {
      console.error("onCallAnswered error:", err);
    }
  },

  onRemoteIceCandidate: async ({ candidate }) => {
    if (!candidate) return;
    const { peerConnection } = get();
    try {
      if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        set((s) => ({ pendingCandidates: [...s.pendingCandidates, candidate] }));
      }
    } catch (err) {
      console.warn("ICE candidate error:", err.message);
    }
  },

  onCallRejected: () => {
    toast.info("Call was declined.");
    get()._cleanup("idle");
  },

  onCallEnded: () => {
    get()._cleanup("ended");
  },

  /* ── Media controls ────────────────────────────────────────────── */

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
    set({ isCameraOff: !isCameraOff });
  },

  toggleSpeaker: () => {
    set((s) => ({ isSpeakerOff: !s.isSpeakerOff }));
  },

  /* ── Internal cleanup ──────────────────────────────────────────── */
  _cleanup: (nextState = "idle") => {
    const { localStream, peerConnection } = get();
    stopDurationTimer();
    localStream?.getTracks().forEach((t) => t.stop());
    peerConnection?.close();
    set({
      callState: nextState,
      callType: null,
      callDuration: 0,
      remoteUserId: null,
      remoteUserName: null,
      remoteUserAvatar: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOff: false,
      peerConnection: null,
      pendingOffer: null,
      pendingCandidates: [],
    });

    /* After a brief "ended" flash, go back to idle */
    if (nextState === "ended") {
      setTimeout(() => set({ callState: "idle" }), 1500);
    }
  },
}));

export default useCallStore;
