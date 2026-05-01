// src/utils/config.js

// By default, React scripts sets NODE_ENV to 'development' in local dev, 
// and 'production' when building.
// But Vercel can also set custom env vars.

// Create React App (CRA) uses process.env.REACT_APP_* variables
// For production, set REACT_APP_API_URL in .env file or Vercel environment variables
// For local dev, falls back to current origin (same-origin requests via setupProxy.js)
const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin;

console.log("API Base URL:", API_BASE_URL);

export default API_BASE_URL;
