import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useUserStore from "./store/useUserStore";
import { checkUserAuth } from "./services/userService";

export const ProtectedRoute = () => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const result = await checkUserAuth();
        if (result.isAuthenticated) {
          setUser(result.user);
        } else {
          clearUser();
        }
      } catch (err) {
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };
    verifyAuth();
  }, [setUser, clearUser]);

  if (isChecking) return <div>Loading...</div>;

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/user-login" state={{ from: location }} replace />
  );
};

export const PublicRoute = () => {
  const { isAuthenticated } = useUserStore();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};
