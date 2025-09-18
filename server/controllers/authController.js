import UserModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const SECRET = process.env.JWT_SECRET || "MERN_SECRET_KEY";

// Registering a new User
export const registerUser = async (req, res) => {
  const { username, password, firstname, lastname, email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username is already taken" });
    }

    if (email) {
      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email is already registered" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new UserModel({
      username,
      password: hashedPass,
      firstname,
      lastname,
      email,
    });

    // Save user to DB
    const user = await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        username: user.username,
        role: user.role || 'user'
      }, 
      SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user._doc;

    res.status(200).json({ 
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Allow login with either username or email
        const user = await UserModel.findOne({ 
            $or: [
                { username: email },
                { email: email }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id,
                username: user.username,
                role: user.role || 'user'
            }, 
            SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user._doc;

        res.status(200).json({ 
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}