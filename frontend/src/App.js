import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PhoneLogin from './components/PhoneLogin';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-[#111b21] flex flex-col justify-center items-center p-4">
        {/* Top decorative WhatsApp green banner */}
        <div className="fixed top-0 left-0 w-full h-32 bg-[#00a884] z-0"></div>

        <div className="relative z-10 w-full max-w-md">
          <Routes>
            <Route
              path="/login"
              element={
                currentUser ? (
                  <Navigate to="/" replace />
                ) : (
                  <PhoneLogin onLoginSuccess={(user) => setCurrentUser(user)} />
                )
              }
            />
            <Route
              path="/"
              element={
                currentUser ? (
                  <div className="bg-[#202c33] text-white p-6 rounded-2xl shadow-xl text-center border border-gray-700">
                    <h1 className="text-2xl font-bold text-[#00a884]">WhatsApp Web</h1>
                    <p className="mt-2 text-gray-200">Welcome, {currentUser.phoneNumber || "User"}!</p>
                    <p className="text-sm text-gray-400 mt-1">Authenticated via Firebase</p>
                    <button
                      onClick={() => setCurrentUser(null)}
                      className="mt-6 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition"
                    >
                      Log Out
                    </button>
                  </div>
                ) : (
                  <PhoneLogin onLoginSuccess={(user) => setCurrentUser(user)} />
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;