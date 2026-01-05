import axios from 'axios';

// Create a single axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // Your FastAPI URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attaches Token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;