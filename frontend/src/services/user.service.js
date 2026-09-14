import axiosInstance from './url.service';

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const payload = typeof phoneNumber === 'object'
      ? phoneNumber
      : { phoneNumber, phoneSuffix, email };

    const response = await axiosInstance.post('/auth/send-otp', payload);
    return response.data;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, email, otp) => {
  try {
    const payload = typeof phoneNumber === 'object'
      ? phoneNumber
      : { phoneNumber, phoneSuffix, email, otp };

    const response = await axiosInstance.post('/auth/verify-otp', payload);
    return response.data;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const updateUserProfile = async (updateData) => {
  try {
    const isFormData = typeof FormData !== 'undefined' && updateData instanceof FormData;
    const response = await axiosInstance.put('/auth/update-profile', updateData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get('/auth/check-auth');
    if (response.data.status === 'success') {
      const user = response.data.data?.user || response.data.user;
      return { isAuthenticated: true, user };
    }
    return { isAuthenticated: false, user: null };
  } catch (error) {
    return { isAuthenticated: false, user: null };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.post('/auth/logout');
    return response.data;
  } catch (error) {
    console.error('Error logging out user:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get('/auth/users');
    return response.data;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
};