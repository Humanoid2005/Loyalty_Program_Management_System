export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
export const BACK_LINK = import.meta.env.VITE_BACK_LINK || FRONTEND_URL
export const EVENT_NAME=  import.meta.env.VITE_EVENT_NAME || "";
export const EVENT_YEAR = import.meta.env.VITE_EVENT_YEAR || "";
export const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || "default_secret_key";