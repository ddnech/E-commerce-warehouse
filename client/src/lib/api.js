import axios from "axios";

// "/api" works in dev (Vite proxy) and in Docker (nginx proxy).
// Set VITE_API_URL only if the API lives on a different address.
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const USER_TOKEN = "furnifor.token";
export const ADMIN_TOKEN = "furnifor.admin.token";

function makeClient(tokenKey, onExpired) {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || "";
      if (error.response?.status === 401 && localStorage.getItem(tokenKey) && !url.includes("/login")) {
        localStorage.removeItem(tokenKey);
        onExpired();
      }
      return Promise.reject(error);
    }
  );
  return client;
}

/** For the shop and the customer's account. */
const api = makeClient(USER_TOKEN, () => window.dispatchEvent(new Event("furnifor:logout")));

/** For the admin panel. */
export const adminApi = makeClient(ADMIN_TOKEN, () => window.location.assign("/admin/login?expired=1"));

/** Pulls a readable message out of an axios error. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) return "Can't reach the server. Is the API running?";
  return error.response.data?.message || error.response.data?.errors?.[0]?.msg || fallback;
}

/** Turns "/uploads/products/x.jpg" into a full URL when the API is on another host. */
export function assetUrl(path) {
  if (!path) return null;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  if (/^https?:\/\//.test(baseURL)) return new URL(path, baseURL).toString();
  return path;
}

export default api;
