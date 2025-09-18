import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getUserFriends,
  getFriendRequests,
  removeFriend,
  cancelFriendRequest,
  getFriendshipStatus
} from '../controllers/friendshipController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Send friend request
router.post('/send-request', sendFriendRequest);

// Accept friend request
router.post('/accept-request/:requestId', acceptFriendRequest);

// Reject friend request
router.post('/reject-request/:requestId', rejectFriendRequest);

// Get user's friends
router.get('/friends/:userId', getUserFriends);

// Get friend requests (received and sent)
router.get('/requests', getFriendRequests);

// Remove friend
router.delete('/remove-friend/:friendId', removeFriend);

// Cancel sent friend request
router.delete('/cancel-request/:targetUserId', cancelFriendRequest);

// Get friendship status with another user
router.get('/status/:targetUserId', getFriendshipStatus);

export default router;
