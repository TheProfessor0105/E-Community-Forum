import UserModel from "../models/userModel.js";
import PostModel from "../models/postModel.js";
import cloudinary from "../config/cloudinary.js";
import fs from 'fs';

// Get user profile
export const getUserProfile = async (req, res) => {
  const { id } = req.params;
  
  try {
    const user = await UserModel.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user._doc;
    
    // Get post count
    const postCount = await PostModel.countDocuments({ author: id });
    
    // Get friends count
    const friendsCount = user.friends ? user.friends.length : 0;
    
    res.status(200).json({
      ...userWithoutPassword,
      postCount,
      friendsCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { username, firstname, lastname, about } = req.body;
  
  try {
    // Check if updating own profile
    if (id !== userId) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }
    
    // Check if username already exists (if changing username)
    if (username) {
      const existingUser = await UserModel.findOne({ username, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }
    
    // Update user profile
    const updatedUser = await UserModel.findByIdAndUpdate(
      id, 
      { 
        username, 
        firstname, 
        lastname, 
        about
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser._doc;
    
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  const userId = req.user.id;
  const { type = 'avatar' } = req.body;
  
  console.log('=== UPLOAD REQUEST START ===');
  console.log('User ID:', userId);
  console.log('Type:', type);
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('Request headers:', req.headers);
  
  try {
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({ 
        success: false,
        message: "No image file provided",
        error: "No file in request"
      });
    }
    
    console.log('File received:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });
    
    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
      folder: type === 'cover' ? 'cover' : 'profile',
      resource_type: 'image'
    });
    
    console.log('Cloudinary upload successful:', cloudinaryResult.secure_url);
    
    // Update user with new image URL based on type
    const updateField = type === 'cover' ? { coverPicture: cloudinaryResult.secure_url } : { avatar: cloudinaryResult.secure_url };
    
    console.log('Updating user with field:', updateField);
    
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateField,
      { new: true }
    );
    
    console.log('User updated successfully');
    
    // Clean up the local file
    fs.unlinkSync(req.file.path);
    console.log('Local file cleaned up');
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser._doc;
    
    console.log('=== UPLOAD REQUEST END ===');
    
    res.status(200).json({ 
      success: true,
      message: `${type === 'cover' ? 'Cover' : 'Profile'} image updated successfully`,
      data: { user: userWithoutPassword }
    });
  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Error uploading profile image:", error);
    
    // Clean up any uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Cleaned up file after error');
    }
    
    res.status(500).json({ 
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  const { userId, receiverId } = req.body;
  
  try {
    console.log("==== FRIEND REQUEST START ====");
    console.log("UserId:", userId, "typeof:", typeof userId);
    console.log("ReceiverId:", receiverId, "typeof:", typeof receiverId);

    if (userId === receiverId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }
    
    // First, check if both users exist
    const sender = await UserModel.findById(userId);
    if (!sender) {
      console.log("Sender not found for ID:", userId);
      return res.status(404).json({ message: "Sender not found" });
    }

    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      console.log("Receiver not found for ID:", receiverId);
      return res.status(404).json({ message: "Receiver not found" });
    }
    
    console.log("Sender found:", sender.username);
    console.log("Receiver found:", receiver.username);
    
    // Initialize notifications arrays if they don't exist
    if (!sender.notifications) sender.notifications = [];
    if (!receiver.notifications) receiver.notifications = [];
    
    // Check if a notification already exists
    console.log("Receiver notifications length:", receiver.notifications.length);

    const existingNotificationIndex = receiver.notifications.findIndex(
      n => n.type === 'friend_request' && n.senderId === userId.toString()
    );

    console.log("Existing notification check result:", existingNotificationIndex);

    if (existingNotificationIndex !== -1) {
      console.log("Existing request found at index:", existingNotificationIndex);
      return res.status(400).json({ message: "Friend request already sent" });
    }
    
    // Create notification object
    const notification = {
      type: 'friend_request',
      message: `${sender.firstname} ${sender.lastname} sent you a friend request`,
      timestamp: new Date(),
      isRead: false,
      id: new Date().getTime().toString(),
      senderId: userId.toString(),
      senderName: `${sender.firstname} ${sender.lastname}`,
      senderUsername: sender.username,
      senderAvatar: sender.avatar || ""
    };
    
    console.log("Created notification:", notification);
    
    // Create a copy of the receiver's notifications and add the new one
    // Make sure notifications array exists before spreading
    const receiverNotifications = receiver.notifications || [];
    const updatedNotifications = [...receiverNotifications, notification];
    
    // Update the receiver document directly
    receiver.notifications = updatedNotifications;
    await receiver.save();
    
    console.log("Saved notification to receiver:", receiver.username);
    console.log("Updated notifications count:", receiver.notifications.length);
    
    // Also create and save an outgoing notification for sender
    const outgoingNotification = {
      type: 'outgoing_friend_request',
      message: `You sent a friend request to ${receiver.firstname} ${receiver.lastname}`,
      timestamp: new Date(),
      isRead: true,
      id: new Date().getTime().toString() + '1',
      receiverId: receiverId.toString(),
      receiverName: `${receiver.firstname} ${receiver.lastname}`,
      receiverUsername: receiver.username,
      receiverAvatar: receiver.avatar || ""
    };
    
    // Add to sender's notifications
    // Initialize notifications array if it doesn't exist
    if (!sender.notifications) {
      sender.notifications = [];
    }
    sender.notifications.push(outgoingNotification);
    await sender.save();
    
    console.log("Saved outgoing notification to sender");
    console.log("==== FRIEND REQUEST END ====");
    
    res.status(200).json({ 
      message: "Friend request sent successfully",
      notification: outgoingNotification
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: error.message });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  const { userId, senderId, notificationId } = req.body;
  
  try {
    const user = await UserModel.findById(userId);
    const sender = await UserModel.findById(senderId);
    
    if (!user || !sender) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find the notification
    const notificationIndex = user.notifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex === -1) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    
    console.log("Accepting friend request:", { userId, senderId, notificationId });
    
    // Add each user to the other's friends array
    await UserModel.findByIdAndUpdate(
      userId,
      { 
        $addToSet: { friends: senderId },
        $pull: { notifications: { id: notificationId } }
      }
    );
    
    // Also remove any outgoing friend request notifications from the sender
    await UserModel.findByIdAndUpdate(
      senderId,
      { 
        $addToSet: { friends: userId },
        $pull: { notifications: { type: 'outgoing_friend_request', receiverId: userId.toString() } }
      }
    );
    
    // Send a notification to the sender that the request was accepted
    const notification = {
      type: 'friend_request_accepted',
      message: `${user.firstname} ${user.lastname} accepted your friend request`,
      timestamp: new Date(),
      isRead: false,
      id: new Date().getTime().toString(),
      userId: userId.toString(),
      userName: `${user.firstname} ${user.lastname}`,
      userUsername: user.username,
      userAvatar: user.avatar
    };
    
    await UserModel.findByIdAndUpdate(
      senderId,
      { $push: { notifications: notification } }
    );
    
    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: error.message });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  const { userId, notificationId, senderId } = req.body;
  
  try {
    // Find the notification to get details before removing it
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const notification = user.notifications.find(n => n.id === notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    // Get sender ID from notification if not provided
    const requestSenderId = senderId || notification.senderId;
    
    // Remove the notification from receiver
    await UserModel.findByIdAndUpdate(
      userId,
      { $pull: { notifications: { id: notificationId } } }
    );
    
    // Also remove the outgoing request notification from sender
    if (requestSenderId) {
      await UserModel.findByIdAndUpdate(
        requestSenderId,
        { $pull: { notifications: { type: 'outgoing_friend_request', receiverId: userId.toString() } } }
      );
    }
    
    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: error.message });
  }
};

// Test Notification - Debug endpoint to create a test notification
export const createTestNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("Creating test notification for user:", userId);
    console.log("Current notifications:", user.notifications || []);
    
    // Create a test notification
    const testNotification = {
      type: "test_notification",
      message: "This is a test notification",
      timestamp: new Date(),
      isRead: false,
      id: new Date().getTime().toString()
    };
    
    // If notifications array doesn't exist, create it
    if (!user.notifications) {
      user.notifications = [];
    }
    
    // Add notification directly to the user object
    user.notifications.push(testNotification);
    
    // Save the user
    await user.save();
    
    console.log("Test notification created:", testNotification);
    console.log("Updated notifications count:", user.notifications.length);
    
    return res.status(200).json({ 
      message: "Test notification created successfully",
      notification: testNotification
    });
  } catch (error) {
    console.error("Error creating test notification:", error);
    return res.status(500).json({ message: error.message });
  }
}; 