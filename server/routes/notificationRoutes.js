import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount
} from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Add CORS headers middleware for notification routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Get user notifications - protected with authentication
router.get('/', verifyToken, getUserNotifications);

// Get unread notification count - protected with authentication
router.get('/count', verifyToken, async (req, res) => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting notification count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read - protected with authentication
router.put('/read', verifyToken, markNotificationAsRead);

// Mark all notifications as read - protected with authentication
router.put('/read-all', verifyToken, markAllNotificationsAsRead);

// Delete notification - protected with authentication
router.delete('/', verifyToken, deleteNotification);

export default router; 