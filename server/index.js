import express from 'express';
import authRoute from './routes/authRoute.js';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import postRoute from './routes/postRoute.js';
import communityRoute from './routes/communityRoute.js';
import tagRoute from './routes/tagRoute.js';
import userRoute from './routes/userRoute.js';
import notificationRoute from './routes/notificationRoutes.js';
import discussionRoute from './routes/discussionRoute.js';
import friendshipRoute from './routes/friendshipRoute.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { verifyToken } from './middleware/authMiddleware.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

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

// Routes
app.use('/api/auth', authRoute);

// Split post routes to allow GET requests without authentication
app.use('/api/posts', postRoute);
app.use('/api/communities', communityRoute);
app.use('/api/tags', tagRoute);
app.use('/api/users', userRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/discussions', discussionRoute);
app.use('/api/friendship', friendshipRoute);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      // Handle joining notification rooms
      socket.on('join-notifications', (data) => {
        const { userId } = data;
        if (userId) {
          socket.join(`notifications-${userId}`);
          console.log(`User ${userId} joined notifications room`);
        }
      });
      
      // Handle leaving notification rooms
      socket.on('leave-notifications', (data) => {
        const { userId } = data;
        if (userId) {
          socket.leave(`notifications-${userId}`);
          console.log(`User ${userId} left notifications room`);
        }
      });
      
      // Handle joining discussion rooms
      socket.on('join-discussion', (data) => {
        const { discussionId } = data;
        if (discussionId) {
          socket.join(`discussion-${discussionId}`);
          console.log(`User joined discussion room: ${discussionId}`);
        }
      });
      
      // Handle leaving discussion rooms
      socket.on('leave-discussion', (data) => {
        const { discussionId } = data;
        if (discussionId) {
          socket.leave(`discussion-${discussionId}`);
          console.log(`User left discussion room: ${discussionId}`);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
    
    // Make io available globally for notification events
    global.io = io;
  })
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