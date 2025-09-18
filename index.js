import express from 'express';
import authRoute from './routes/authRoute.js';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import postRoute from './routes/postRoute.js';
import communityRoute from './routes/communityRoute.js';
import tagRoute from './routes/tagRoute.js';
import userRoute from './routes/userRoute.js';
import notificationRoute from './routes/notificationRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { verifyToken } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecommunity";

// CORS middleware - enables cross-origin requests
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Client origins
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add CORS preflight options for all routes
app.options('*', cors());

// Middleware
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

// Simple test route for connection testing
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// Custom route handler to avoid express URL parsing issues
// Routes
app.use('/api/auth', authRoute);
app.use('/api/posts', postRoute);
app.use('/api/communities', communityRoute);
app.use('/api/tags', tagRoute);
app.use('/api/users', userRoute);
app.use('/api/notifications', notificationRoute);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() =>
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    )
  )
  .catch((error) => console.log(`Error connecting to MongoDB: ${error.message}`));

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  return res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
}); 