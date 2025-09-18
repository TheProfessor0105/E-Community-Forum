import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  createDiscussion,
  getAllDiscussions,
  getDiscussionById,
  joinDiscussion,
  leaveDiscussion,
  addMessage,
  updateMessage,
  deleteDiscussion,
  getUserDiscussions
} from '../controllers/discussionController.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create a new discussion
router.post('/', createDiscussion);

// Get all active discussions (with optional filtering)
router.get('/', getAllDiscussions);

// Get user's discussions
router.get('/my-discussions', getUserDiscussions);

// Get a specific discussion by ID
router.get('/:discussionId', getDiscussionById);

// Join a discussion
router.post('/:discussionId/join', joinDiscussion);

// Leave a discussion
router.post('/:discussionId/leave', leaveDiscussion);

// Add a message to discussion
router.post('/:discussionId/messages', addMessage);

// Update a message
router.put('/:discussionId/messages/:messageId', updateMessage);

// Delete a discussion (creator only)
router.delete('/:discussionId', deleteDiscussion);

export default router;
