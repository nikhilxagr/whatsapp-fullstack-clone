import axiosInstance from "./url.service";

export const getStatuses = async () => {
  const response = await axiosInstance.get("/status");
  return response.data;
};

export const getMyStatuses = async () => {
  const response = await axiosInstance.get("/status/my-status");
  return response.data;
};

export const createStatus = async (formData) => {
  const response = await axiosInstance.post("/status", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const viewStatus = async (statusId) => {
  const response = await axiosInstance.put(`/status/${statusId}/view`);
  return response.data;
};

export const deleteStatus = async (statusId) => {
  const response = await axiosInstance.delete(`/status/${statusId}`);
  return response.data;
};
