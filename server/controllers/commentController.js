import PostModel from "../models/postModel.js";
import CommentModel from "../models/commentModel.js";
import UserModel from "../models/userModel.js";

export const createComment = async (req, res) => {
  const { postId, content } = req.body;
  const userId = req.user?.id;

  try {
    // Validate user authentication
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Validate required fields
    if (!postId || !content) {
      return res.status(400).json({ message: "Post ID and content are required" });
    }

    // Find the post to ensure it exists
    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create and save new comment
    const newComment = new CommentModel({
      post: postId,
      author: userId,
      content
    });
    
    await newComment.save();

    // Populate author details for the response
    const populatedComment = await CommentModel.findById(newComment._id)
      .populate("author", "username firstname lastname avatar")
      .populate("post");

    // Send notification to post author if it's not the commenter
    if (post.author.toString() !== userId.toString()) {
      try {
        // Import required models and functions
        const { addNotification } = await import("../controllers/notificationController.js");
        const user = await UserModel.findById(userId, 'username avatar firstname lastname');
        
        // Create notification
        const notification = {
          type: 'new_comment',
          message: `${user.firstname} ${user.lastname} commented on your post`,
          postId: post._id.toString(),
          commentId: newComment._id.toString(),
          commenterName: `${user.firstname} ${user.lastname}`,
          commenterUsername: user.username,
          commenterAvatar: user.avatar || "",
          commentContent: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        };
        
        // Add notification to post author
        await addNotification(post.author.toString(), notification);
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Continue even if notification fails
      }
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: error.message });
  }
}; 