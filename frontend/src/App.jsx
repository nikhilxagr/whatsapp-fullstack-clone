import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/user-login/Login';
import { ProtectedRoute, PublicRoute } from './Protected';
import useUserStore from './store/useUserStore';
import { logoutUser } from './services/userService';
import './App.css';

function App() {
  const { user, clearUser } = useUserStore();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error(e);
    } finally {
      clearUser();
    }
  };

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <Routes>
        {/* Public Routes (Only accessible when NOT logged in) */}
        <Route element={<PublicRoute />}>
          <Route path="/user-login" element={<Login />} />
          <Route path="/login" element={<Navigate to="/user-login" replace />} />
        </Route>

        {/* Protected Routes (Only accessible when logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <div className="min-h-screen bg-[#111b21] flex flex-col justify-center items-center p-4">
                <div className="bg-[#202c33] text-white p-8 rounded-2xl shadow-2xl text-center border border-gray-700 max-w-md w-full">
                  <img
                    src={user?.profilePicture || "https://avatar.iran.liara.run/public"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-green-500 object-cover"
                  />
                  <h1 className="text-2xl font-bold text-green-500">
                    {user?.username || "WhatsApp User"}
                  </h1>
                  <p className="mt-1 text-gray-300 text-sm">
                    {user?.phoneNumber || user?.email || "Authenticated"}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 italic">
                    "{user?.about || "Hey there! I am using WhatsApp."}"
                  </p>
                  <button
                    onClick={handleLogout}
                    className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition shadow-md"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            }
          />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;