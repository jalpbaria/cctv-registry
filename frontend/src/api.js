import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const login = (username, password) => {
  return axios.post(`${API_URL}/auth/login`, { username, password });
};

export const getCameras = (token) => {
  return axios.get(`${API_URL}/cameras`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
export const addCamera = (token, cameraData) => {
  return axios.post(`${API_URL}/cameras`, cameraData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getAnalytics = (token) => {
  return axios.get(`${API_URL}/analytics/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};