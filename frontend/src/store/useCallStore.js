import { create } from "zustand";
import { getSocket } from "../services/chat.service";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const useCallStore = create((set, get) => ({
  callState: "idle",
  callType: null,
  remoteUserId: null,
  remoteUserName: null,
  remoteUserAvatar: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  peerConnection: null,
  pendingOffer: null,
  pendingCandidates: [],

  _createPeerConnection: () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      const socket = getSocket();
      const { remoteUserId } = get();
      if (socket && remoteUserId) {
        socket.emit("call:ice-candidate", { to: remoteUserId, candidate });
      }
    };
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      set({ remoteStream });
    };
    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        get().endCall();
      }
    };
    return pc;
  },

  startCall: async (remoteUser, callType = "video") => {
    const socket = getSocket();
    if (!socket) return;
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      const pc = get()._createPeerConnection();
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      set({ callState: "calling", callType, remoteUserId: remoteUser._id, remoteUserName: remoteUser.username, remoteUserAvatar: remoteUser.profilePicture, localStream, peerConnection: pc });
      socket.emit("call:offer", { to: remoteUser._id, offer, callType, from: socket.id, callerName: remoteUser.username, callerAvatar: remoteUser.profilePicture });
    } catch (err) {
      console.error("startCall error:", err);
      get()._cleanup();
    }
  },

  acceptCall: async () => {
    const socket = getSocket();
    const { pendingOffer, remoteUserId, callType, pendingCandidates } = get();
    if (!socket || !pendingOffer) return;
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" });
      const pc = get()._createPeerConnection();
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      for (const c of pendingCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      set({ callState: "active", localStream, peerConnection: pc, pendingCandidates: [] });
      socket.emit("call:answer", { to: remoteUserId, answer });
    } catch (err) {
      console.error("acceptCall error:", err);
      get()._cleanup();
    }
  },

  rejectCall: () => {
    const socket = getSocket();
    const { remoteUserId } = get();
    if (socket && remoteUserId) socket.emit("call:reject", { to: remoteUserId });
    get()._cleanup();
  },

  endCall: () => {
    const socket = getSocket();
    const { remoteUserId } = get();
    if (socket && remoteUserId) socket.emit("call:end", { to: remoteUserId });
    get()._cleanup();
  },

  onIncomingCall: ({ from, offer, callType, callerName, callerAvatar }) => {
    set({ callState: "incoming", callType: callType || "video", remoteUserId: from, remoteUserName: callerName, remoteUserAvatar: callerAvatar, pendingOffer: offer, pendingCandidates: [] });
  },

  onCallAnswered: async ({ answer }) => {
    const { peerConnection, pendingCandidates } = get();
    if (!peerConnection) return;
    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      for (const c of pendingCandidates) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      set({ callState: "active", pendingCandidates: [] });
    } catch (err) {
      console.error("onCallAnswered error:", err);
    }
  },

  onRemoteIceCandidate: async ({ candidate }) => {
    const { peerConnection } = get();
    if (!peerConnection) return;
    if (peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      set((s) => ({ pendingCandidates: [...s.pendingCandidates, candidate] }));
    }
  },

  onCallRejected: () => get()._cleanup(),
  onCallEnded: () => get()._cleanup(),

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

  _cleanup: () => {
    const { localStream, peerConnection } = get();
    localStream?.getTracks().forEach((t) => t.stop());
    peerConnection?.close();
    set({ callState: "idle", callType: null, remoteUserId: null, remoteUserName: null, remoteUserAvatar: null, localStream: null, remoteStream: null, isMuted: false, isCameraOff: false, peerConnection: null, pendingOffer: null, pendingCandidates: [] });
  },
}));

export default useCallStore;
