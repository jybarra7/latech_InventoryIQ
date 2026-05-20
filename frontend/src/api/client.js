import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:8000" : "");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

const buildFileFormData = (file) => {
  if (!file) {
    throw new Error("A CSV file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

export const parseApiError = (error) => {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error?.message) {
    return error.message;
  }

  return "Something went wrong while calling the API.";
};

export const runForecast = async (file, horizonDays = 90) => {
  const formData = buildFileFormData(file);

  const response = await api.post("/forecast/run", formData, {
    params: { horizon_days: horizonDays },
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export const getFutureForecast = async (
  file,
  futureDays = 30,
  { fast = false } = {}
) => {
  const formData = buildFileFormData(file);

  const response = await api.post("/forecast/future", formData, {
    params: { future_days: futureDays, fast },
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export const getForecastKpis = async (file, futureDays = 30) => {
  const formData = buildFileFormData(file);

  const response = await api.post("/forecast/kpis", formData, {
    params: { future_days: futureDays },
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export default api;
