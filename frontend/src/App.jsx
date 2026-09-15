import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/user-login/Login';
import HomePage from './components/HomePage';
import { ProtectedRoute, PublicRoute } from './Protected';
import './App.css';

function App() {
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
          <Route path="/" element={<HomePage />} />
          <Route path="/status" element={<HomePage />} />
          <Route path="/settings" element={<HomePage />} />
          <Route path="/user-profile" element={<HomePage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;