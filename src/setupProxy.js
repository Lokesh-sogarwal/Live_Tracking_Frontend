const { createProxyMiddleware } = require('http-proxy-middleware');

// Local development only (`npm start`): when REACT_APP_API_URL is unset the app calls its
// own origin and these prefixes are forwarded to the backend. Defaults to the local Node
// API; it previously pointed at the production Render backend.
const target = process.env.DEV_PROXY_TARGET || 'http://localhost:5001';

const API_PREFIXES = ['/view', '/auth', '/api', '/data', '/bus', '/chat', '/permissions', '/chatbot', '/health'];

// Some API prefixes are also app pages (/chat, /permissions). Browser navigations ask for
// HTML and must be served by the React app, otherwise a reload of those pages shows the
// API's JSON 404. Only API-style requests are proxied.
const isApiRequest = (pathname, req) =>
  API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
  !(req.headers.accept || '').includes('text/html');

module.exports = function (app) {
  app.use(createProxyMiddleware(isApiRequest, { target, changeOrigin: true }));
  app.use('/socket.io', createProxyMiddleware({ target, changeOrigin: true, ws: true }));
};
