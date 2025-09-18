import express from 'express';
import {
  createCommunity,
  deleteCommunity,
  getAllCommunities,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  makeAdmin,
  removeMember,
  getUserCommunities,
  getCommunityMembers,
  demoteAdmin
} from "../controllers/communityController.js";
import upload from "../middleware/uploadMiddleware.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
// Get all communities
router.get('/', getAllCommunities);

// Get a specific community
router.get('/:id', getCommunity);

// Get communities for a user
router.get('/user/:userId', getUserCommunities);

// Get members of a community with detailed information
router.get('/:id/members', getCommunityMembers);

// Protected routes (authentication required)
// Create a new community with file uploads
// Using upload.fields to handle multiple file types
router.post('/', verifyToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
]), createCommunity);

// Delete a community
router.delete('/:id', verifyToken, deleteCommunity);

// Join a community
router.post('/:id/join', verifyToken, joinCommunity);

// Leave a community
router.post('/:id/leave', verifyToken, leaveCommunity);

// Admin actions
router.put('/:id/admin', verifyToken, makeAdmin);
router.put('/:id/demote', verifyToken, demoteAdmin);
router.delete('/:id/member/:memberId', verifyToken, removeMember);

export default router;