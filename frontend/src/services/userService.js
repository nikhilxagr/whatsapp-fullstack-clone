import axiosInstance from "./url.service";

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
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const loginWithEmail = async ({ email, password }) => {
  try {
    const res = await axiosInstance.post("/auth/login/email", { email, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const loginWithPhone = async ({ phoneNumber, phoneSuffix, password }) => {
  try {
    const res = await axiosInstance.post("/auth/login/phone", { phoneNumber, phoneSuffix, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const checkUserAuth = async () => {
  try {
    const res = await axiosInstance.get("/auth/check-auth");
    if (res.data.status === "success") {
      const user = res.data.data?.user || res.data.data;
      return { isAuthenticated: true, user };
    }
    return { isAuthenticated: false, user: null };
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

export const updateUserProfile = async (data) => {
  try {
    const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
    const res = await axiosInstance.put("/auth/update-profile", data, {
      headers: isFormData
        ? { "Content-Type": "multipart/form-data" }
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
    return res.data;
  } catch (err) {
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
