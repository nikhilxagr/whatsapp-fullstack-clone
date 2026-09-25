import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/user-login/Login";
import HomePage from "./components/HomePage";
import VideoCall from "./components/VideoCall";
import { ProtectedRoute, PublicRoute } from "./Protected";
import "./App.css";

import useUserStore from "./store/useUserStore";
import useChatStore from "./store/useChatStore";
import useCallStore from "./store/useCallStore";
import { initializeSocket, disconnectSocket, getSocket } from "./services/chat.service";

function App() {
  const { user } = useUserStore();
  const { setCurrentUser, fetchConversations, cleanUp } = useChatStore();
  const { onIncomingCall, onCallAnswered, onRemoteIceCandidate, onCallRejected, onCallEnded } = useCallStore();

  useEffect(() => {
    if (!user?._id) {
      cleanUp();
      disconnectSocket();
      return;
    }

    setCurrentUser(user);
    initializeSocket();
    fetchConversations();

    const socket = getSocket();
    if (socket) {
      socket.on("userUpdated", () => fetchConversations());

      /* WebRTC call signaling listeners */
      socket.off("call:incoming");
      socket.off("call:answered");
      socket.off("call:ice-candidate");
      socket.off("call:rejected");
      socket.off("call:ended");

      socket.on("call:incoming",      (payload) => useCallStore.getState().onIncomingCall(payload));
      socket.on("call:answered",      (payload) => useCallStore.getState().onCallAnswered(payload));
      socket.on("call:ice-candidate", (payload) => useCallStore.getState().onRemoteIceCandidate(payload));
      socket.on("call:rejected",      () => useCallStore.getState().onCallRejected());
      socket.on("call:ended",         () => useCallStore.getState().onCallEnded());
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.off("userUpdated");
        s.off("call:incoming");
        s.off("call:answered");
        s.off("call:ice-candidate");
        s.off("call:rejected");
        s.off("call:ended");
      }
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      {/* Global video call overlay — shown over everything when a call is active */}
      <VideoCall />
      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
            <Route path="/login" element={<Navigate to="/user-login" replace />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/status" element={<HomePage />} />
            <Route path="/settings" element={<HomePage />} />
            <Route path="/user-profile" element={<HomePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;