import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/upload.routes.js';
import analyticsRoutes from './routes/analytics.routes.js'; 

const app = express();

// --- 1. PRO-LEVEL CORS CONFIG ---
const allowedOrigins = [
  'http://localhost:5173', // Local Vite development
  'https://the-new-deployed-url' // The new live frontend URL
];

app.use(cors({
  origin: function (origin, callback) {

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// --- 2. MIDDLEWARE ---
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- 3. ROUTES ---
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes); 


app.get('/', (req, res) => {
    res.json({ 
        status: 'Operational', 
        service: 'Fleet  API',
        timestamp: new Date() 
    });
});

// --- 4. GLOBAL ERROR HANDLER ---
// Prevents the server from crashing if a route fails
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;