const securityHeadersMiddleware = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // CSP config
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:8000 http://127.0.0.1:8000 http://localhost:8001 http://127.0.0.1:8001 https://*.vercel.app; " +
    "img-src 'self' data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline';"
  );
  
  next();
};

module.exports = securityHeadersMiddleware;
