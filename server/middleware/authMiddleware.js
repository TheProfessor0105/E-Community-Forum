import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const SECRET = process.env.JWT_SECRET || "MERN_SECRET_KEY";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required. No token provided." });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
};

export const verifyAdmin = (req, res, next) => {
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: "Admin privileges required." });
  }
}; 