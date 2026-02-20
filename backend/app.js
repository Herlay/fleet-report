import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();


const allowedOrigins = [
  'http://localhost:5173',               
  'https://fleet-report.vercel.app'      
];

app.use(cors({
  origin: (origin, callback) => {
   
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

//  MIDDLEWARE

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ROUTES
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'Operational',
    service: 'Fleet API',
    timestamp: new Date()
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('ERROR:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

export default app;