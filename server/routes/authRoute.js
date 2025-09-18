import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/me', verifyToken, (req, res) => {
  res.json({ 
    success: true, 
    user: {
      _id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      avatar: req.user.avatar,
      bio: req.user.bio
    }
  });
});

export default router