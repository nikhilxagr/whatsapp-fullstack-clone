import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/userService";

// Loading screen while verifying session
const AuthLoader = () => (
  <div className="fixed inset-0 bg-[#eae6df] dark:bg-[#111b21] flex flex-col items-center justify-between py-12 z-50 transition-colors">
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-[#00a884] flex items-center justify-center shadow-lg shadow-[#00a884]/20 mb-6 animate-pulse">
        <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c.969.529 1.777.817 2.806.817 3.18 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.768-5.767-5.768zm0-2.172c4.418 0 8 3.582 8 8s-3.582 8-8 8c-1.42 0-2.75-.37-3.906-1.018l-4.525 1.189 1.209-4.412c-.732-1.218-1.159-2.639-1.159-4.159 0-4.418 3.582-8 8-8z" />
        </svg>
      </div>
      <div className="w-48 h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-[#00a884] rounded-full animate-indeterminate" />
      </div>
      <p className="text-xs font-semibold tracking-wider text-[#54656f] dark:text-[#8696a0] uppercase mt-4">
        WhatsApp Web
      </p>
    </div>
    <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
      <svg className="w-3.5 h-3.5 text-[#00a884]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      <span>End-to-end encrypted</span>
    </div>
  </div>
);

// Protects route by verifying session
export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verify = async () => {
      try {
        const result = await checkUserAuth();
        if (result.isAuthenticated && result.user) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch {
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verify();
  }, []);

  if (isChecking) return <AuthLoader />;

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/user-login" state={{ from: location }} replace />
  );
};


export const PublicRoute = () => {
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verify = async () => {
      try {
        const result = await checkUserAuth();
        if (result.isAuthenticated && result.user) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch {
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verify();
  }, []);

  if (isChecking) return <AuthLoader />;

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};
