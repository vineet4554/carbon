require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const securityHeadersMiddleware = require('./middleware/security');

// Initialize database connection
connectDB();

const app = express();

// Security headers middleware
app.use(securityHeadersMiddleware);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8001',
  'http://127.0.0.1:8001',
  'https://carbon-footprint-dun.vercel.app',
  'https://ecopliot.vercel.app',
];
if (process.env.NEXT_PUBLIC_API_URL) {
  allowedOrigins.push(process.env.NEXT_PUBLIC_API_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or regex
    const isAllowed = allowedOrigins.includes(origin) || 
                      /https:\/\/carbon-footprint-.*\.vercel\.app/.test(origin) ||
                      /https:\/\/ecopliot-.*\.vercel\.app/.test(origin);
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Route
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EcoPilot AI Node.js Backend',
    environment: process.env.ENVIRONMENT || 'development'
  });
});

// Health check Route
app.get('/health', async (req, res) => {
  let dbStatus = 'healthy';
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      dbStatus = 'unhealthy (disconnected)';
    }
  } catch (err) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  res.json({
    status: dbStatus.includes('unhealthy') ? 'unhealthy' : 'healthy',
    database: dbStatus,
    environment: process.env.ENVIRONMENT || 'development'
  });
});

// Register routers
const authRouter = require('./routes/auth');
const footprintRouter = require('./routes/footprint');
const billRouter = require('./routes/bill');
const roomRouter = require('./routes/room');
const coachRouter = require('./routes/coach');
const twinRouter = require('./routes/twin');
const gamificationRouter = require('./routes/gamification');
const reportRouter = require('./routes/report');

app.use('/api/auth', authRouter);
app.use('/api/footprint', footprintRouter);
app.use('/api/bills', billRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/coach', coachRouter);
app.use('/api/twin', twinRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/reports', reportRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled exception:', err);
  const isProduction = process.env.ENVIRONMENT === 'production';
  res.status(500).json({
    detail: isProduction ? 'Internal Server Error' : `Internal Server Error: ${err.message}`,
    type: err.name
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoPilot Backend server running on http://localhost:${PORT}`);
});
