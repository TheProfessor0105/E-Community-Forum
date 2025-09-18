import express from 'express';
import { 
  getUserProfile, 
  updateUserProfile, 
  uploadProfileImage,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  createTestNotification
} from "../controllers/userController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
// Get user profile
router.get('/:id', getUserProfile);

// Protected routes (authentication required)
// Update user profile
router.put('/:id', verifyToken, updateUserProfile);

// Upload user profile image
router.post('/upload-image', verifyToken, upload.single('image'), uploadProfileImage);

// Friend request routes
router.post('/friend-request', verifyToken, sendFriendRequest);
router.post('/accept-friend', verifyToken, acceptFriendRequest);
router.post('/reject-friend', verifyToken, rejectFriendRequest);

// Debug route - create test notification (no auth required for testing)
router.get('/test-notification/:userId', createTestNotification);

export default router;
