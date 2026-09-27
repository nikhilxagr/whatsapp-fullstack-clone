import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/user-login/Login";
import HomePage from "./components/HomePage";
import VideoCall from "./components/VideoCall";
import StatusViewer from "./components/status/StatusViewer";
import StatusUploadModal from "./components/status/StatusUploadModal";
import { ProtectedRoute, PublicRoute } from "./Protected";
import "./App.css";

import useUserStore from "./store/useUserStore";
import useChatStore from "./store/useChatStore";
import useCallStore from "./store/useCallStore";
import useStatusStore from "./store/useStatusStore";
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
    useStatusStore.getState().fetchAllStatusData();

    const socket = getSocket();
    if (socket) {
      socket.on("userUpdated", () => fetchConversations());

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

      socket.off("newStatus");
      socket.off("statusViewed");
      socket.off("statusDeleted");

      socket.on("newStatus",     (payload) => useStatusStore.getState().onNewStatus(payload));
      socket.on("statusViewed",  (payload) => useStatusStore.getState().onStatusViewed(payload));
      socket.on("statusDeleted", (payload) => useStatusStore.getState().onStatusDeleted(payload));
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
        s.off("newStatus");
        s.off("statusViewed");
        s.off("statusDeleted");
      }
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <VideoCall />
      <StatusViewer />
      <StatusUploadModal />
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