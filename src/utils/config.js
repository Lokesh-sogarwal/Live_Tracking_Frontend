// src/utils/config.js

// By default, React scripts sets NODE_ENV to 'development' in local dev, 
// and 'production' when building.
// But Vercel can also set custom env vars.

// Best practice: Set REACT_APP_API_BASE_URL in your .env file or Vercel dashboard.
// If not set, we fallback to localhost for development.

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:5001";

console.log("API Base URL:", API_BASE_URL);

export default API_BASE_URL;
