import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/user-login/Login";
import HomePage from "./components/HomePage";
import { ProtectedRoute, PublicRoute } from "./Protected";
import "./App.css";

import useUserStore from "./store/useUserStore";
import useChatStore from "./store/useChatStore";
import { initializeSocket, disconnectSocket, getSocket } from "./services/chat.service";

function App() {
  const { user } = useUserStore();
  const { setCurrentUser, fetchConversations, cleanUp } = useChatStore();

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
      socket.on("userUpdated", () => {
        fetchConversations();
      });
    }

    return () => {
      const s = getSocket();
      if (s) {
        s.off("userUpdated");
      }
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
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