import UserModel from "../models/userModel.js";

// Add a notification to a user
export const addNotification = async (userId, notification) => {
  try {
    // Make sure the notification has the required fields
    if (!notification.message || !notification.type) {
      console.error("Invalid notification format", notification);
      return false;
    }

    // Ensure notification has timestamp and read status
    const notificationToAdd = {
      ...notification,
      timestamp: new Date(),
      isRead: false,
      id: new Date().getTime().toString() // Simple unique ID
    };

    // Add notification to user's notifications array
    await UserModel.findByIdAndUpdate(
      userId,
      { $push: { notifications: notificationToAdd } }
    );

    // Emit real-time notification to the user
    if (global.io) {
      global.io.to(`notifications-${userId}`).emit('new-notification', notificationToAdd);
      console.log(`Emitted new notification to user ${userId}:`, notificationToAdd.message);
    }

    return true;
  } catch (error) {
    console.error("Error adding notification:", error);
    return false;
  }
};

// Get unread notification count for a user
export const getUnreadNotificationCount = async (userId) => {
  try {
    const user = await UserModel.findById(userId);
    
    if (!user || !user.notifications) {
      return 0;
    }

    return user.notifications.filter(notification => !notification.isRead).length;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    return 0;
  }
};

// Get all notifications for a user
export const getUserNotifications = async (req, res) => {
  const userId = req.user.id; // Use authenticated user's ID

  try {
    console.log("Getting notifications for user:", userId);
    const user = await UserModel.findById(userId);
    
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Check if notifications array exists and is valid
    if (!user.notifications) {
      console.log("User has no notifications array:", userId);
      return res.status(200).json([]);
    }

    // Debug log the notifications
    console.log(`Found ${user.notifications.length} notifications for user ${userId}`);
    
    // Validate each notification has required fields
    const validatedNotifications = user.notifications.filter(n => {
      if (!n || !n.id || !n.type) {
        console.warn("Invalid notification found:", n);
        return false;
      }
      return true;
    });

    if (validatedNotifications.length !== user.notifications.length) {
      console.warn(`Found ${user.notifications.length - validatedNotifications.length} invalid notifications`);
    }
    
    // Sort notifications by timestamp (most recent first)
    validatedNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(validatedNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (req, res) => {
  const userId = req.user.id; // Use authenticated user's ID
  const { notificationId } = req.body;

  try {
    if (!notificationId) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the notification and update it
    const notifications = user.notifications || [];
    const notificationIndex = notifications.findIndex(n => n.id === notificationId);

    if (notificationIndex === -1) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Update the notification
    notifications[notificationIndex].isRead = true;

    // Save the updated user
    await UserModel.findByIdAndUpdate(
      userId,
      { notifications }
    );

    // Emit real-time notification update
    if (global.io) {
      global.io.to(`notifications-${userId}`).emit('notification-updated', notifications[notificationIndex]);
      console.log(`Emitted notification update to user ${userId}: marked as read`);
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  const userId = req.user.id; // Use authenticated user's ID

  try {
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Mark all notifications as read
    const notifications = user.notifications || [];
    const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));

    // Save the updated user
    await UserModel.findByIdAndUpdate(
      userId,
      { notifications: updatedNotifications }
    );

    // Emit real-time notification updates for all notifications
    if (global.io) {
      updatedNotifications.forEach(notification => {
        global.io.to(`notifications-${userId}`).emit('notification-updated', notification);
      });
      console.log(`Emitted notification updates to user ${userId}: all marked as read`);
    }

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  const userId = req.user.id; // Use authenticated user's ID
  const { notificationId } = req.body;

  try {
    if (!notificationId) {
      return res.status(400).json({ message: "Notification ID is required" });
    }

    // Remove the notification from the user's notifications array
    await UserModel.findByIdAndUpdate(
      userId,
      { $pull: { notifications: { id: notificationId } } }
    );

    // Emit real-time notification deletion
    if (global.io) {
      global.io.to(`notifications-${userId}`).emit('notification-deleted', notificationId);
      console.log(`Emitted notification deletion to user ${userId}: ${notificationId}`);
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: error.message });
  }
}; 