import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create an Axios instance with baseURL from environment or relative path
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject Authorization header if token exists
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401/403 errors to logout and redirect
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear storage and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('selected_app');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
