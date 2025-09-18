import express from 'express';
import { getAllTags, generateTags } from "../controllers/tagController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
// Get all available tags for recommendations
router.get('/', getAllTags);

// Protected routes (authentication required)
// Generate tags based on title and description using AI
router.post('/generate', verifyToken, generateTags);

export default router; 