import axios from "axios";

// Empty in the unified deploy (the API is same-origin); set VITE_API_URL when
// running the Vite dev server against a separately hosted backend.
const baseURL = import.meta.env.VITE_API_URL || "";

const api = axios.create({ baseURL, timeout: 20000 });

const TOKEN_KEY = "eventsphere.token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing can block storage; the in-memory header below still works.
  }
}

// Read the token per request rather than mutating axios defaults, so a token
// written in another tab is picked up without a reload.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;

/** Registered by AuthProvider so an expired session clears app state once. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Only a genuinely rejected token should sign the user out — a 401 from
    // submitting the wrong password on the login form must not.
    const isSessionFailure =
      status === 401 && (code === "TOKEN_EXPIRED" || code === "TOKEN_INVALID");

    if (isSessionFailure && onUnauthorized) onUnauthorized();

    return Promise.reject(error);
  }
);

/** Pull a human-readable message out of any error shape the API can return. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  const data = error.response?.data;
  if (typeof data === "string" && data.trim() && !data.startsWith("<")) return data;
  if (data?.error) return data.error;
  if (data?.details?.[0]?.message) return data.details[0].message;
  if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (error.message === "Network Error") return "Cannot reach the server. Is it running?";
  return error.message || fallback;
}

export default api;
