// src/utils/config.js

// By default, React scripts sets NODE_ENV to 'development' in local dev, 
// and 'production' when building.
// But Vercel can also set custom env vars.

// Use Vite environment variable `VITE_API_URL` in production
// Falls back to current origin for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

console.log("API Base URL:", API_BASE_URL);

export default API_BASE_URL;
