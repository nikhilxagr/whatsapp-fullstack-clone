import axiosInstance from "./url.service";

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      otp,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateUserProfile = async (formData) => {
  try {
    const isFormData = typeof FormData !== "undefined" && formData instanceof FormData;
    const response = await axiosInstance.put("/auth/update-profile", formData, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    if (response.data.status === "success") {
      const user = response.data.data?.user || response.data.data;
      return { isAuthenticated: true, user };
    }
    return { isAuthenticated: false };
  } catch (error) {
    return { isAuthenticated: false };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post("/auth/logout");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get("/auth/users");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
