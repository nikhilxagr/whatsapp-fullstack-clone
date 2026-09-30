import axiosInstance from "./url.service";
import useServerStore from "../store/useServerStore";

export const register = async ({ email, password, phoneNumber, phoneSuffix }) => {
  try {
    const res = await axiosInstance.post("/auth/register", {
      email,
      password,
      phoneNumber: phoneNumber || undefined,
      phoneSuffix: phoneSuffix || undefined,
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const verifyEmail = async ({ email, otp }) => {
  try {
    const res = await axiosInstance.post("/auth/verify-email", { email, otp });
    const token = res.data?.data?.token || res.data?.token;
    if (token && typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const loginWithEmail = async ({ email, password }) => {
  try {
    const res = await axiosInstance.post("/auth/login/email", { email, password });
    const token = res.data?.data?.token || res.data?.token;
    if (token && typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const loginWithPhone = async ({ phoneNumber, phoneSuffix, password }) => {
  try {
    const res = await axiosInstance.post("/auth/login/phone", { phoneNumber, phoneSuffix, password });
    const token = res.data?.data?.token || res.data?.token;
    if (token && typeof localStorage !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const checkUserAuth = async () => {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null;
  if (!token) {
    // No saved token: avoid blocking UI and trigger background warm-up
    useServerStore.getState().warmUp();
    return { isAuthenticated: false, user: null };
  }

  try {
    const res = await axiosInstance.get("/auth/check-auth");
    if (res.data.status === "success") {
      const user = res.data.data?.user || res.data.data;
      return { isAuthenticated: true, user };
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    return { isAuthenticated: false, user: null };
  } catch {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    return { isAuthenticated: false, user: null };
  }
};

export const updateUserProfile = async (data) => {
  try {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const res = await axiosInstance.put("/auth/update-profile", data, {
      headers: isFormData
        ? {}
        : { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const logoutUser = async () => {
  try {
    const res = await axiosInstance.post("/auth/logout");
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    return res.data;
  } catch (err) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    throw err.response?.data || err.message;
  }
};

export const getAllUsers = async () => {
  try {
    const res = await axiosInstance.get("/auth/users");
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};
