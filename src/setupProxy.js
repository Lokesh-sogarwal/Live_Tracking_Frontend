const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to Flask Backend (Port 5001)
  app.use(
    ['/view', '/auth', '/api'], 
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );

  // Proxy WebSocket connection to Python Backend (Port 5001)
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true,
    })
  );
  

  // Proxy Data & Bus services to Python Backend (Port 5001)
  app.use(
    ['/data', '/get_data', '/bus','/get_routes','/user_details','/chat_users','/profile','/notifications', '/chat','/permissions/matrix'], 
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
    })
  );
};
