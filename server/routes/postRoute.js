import express from 'express'
import { 
  createPost, 
  deletePost, 
  dislikePost, 
  getPost, 
  likePost, 
  updatePost,
  getUserPosts,
  getCommunityPosts,
  getAllPosts,
  getPostComments,
  addComment
} from "../controllers/postController.js";
import upload from "../middleware/uploadMiddleware.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
// Get all posts
router.get('/', getAllPosts);

// Get single post
router.get('/:id', getPost);

// Get posts by user
router.get('/user/:userId', getUserPosts);

// Get posts by community
router.get('/community/:communityId', getCommunityPosts);

// Get post comments
router.get('/:id/comments', getPostComments);

// Protected routes (authentication required)
// Create post - add upload.single('image') middleware
router.post('/', verifyToken, upload.single('image'), createPost);

// Update post
router.put('/:id', verifyToken, updatePost);

// Delete post
router.delete('/:id', verifyToken, deletePost);

// Like/dislike post
router.put('/:id/like', verifyToken, likePost);
router.put('/:id/dislike', verifyToken, dislikePost);

// Add comment
router.post('/:id/comments', verifyToken, addComment);

export default router