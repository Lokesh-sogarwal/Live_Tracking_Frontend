const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to Flask Backend (Port 5001)
  app.use(
    ['/view', '/auth', '/api', '/billing'], 
    createProxyMiddleware({
      target: 'https://live-tracking-backend-057p.onrender.com',
      changeOrigin: true,
    })
  );

  // Proxy WebSocket connection to Python Backend (Port 5001)
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'https://live-tracking-backend-057p.onrender.com',
      changeOrigin: true,
      ws: true,
    })
  );
  

  // Proxy Data & Bus services to Python Backend (Port 5001)
  app.use(
    ['/data', '/get_data', '/bus','/get_routes','/user_details','/chat_users','/profile','/notifications', '/chat','/permissions/matrix'], 
    createProxyMiddleware({
      target: 'https://live-tracking-backend-057p.onrender.com',
      changeOrigin: true,
    })
  );
};
