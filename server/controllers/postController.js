import PostModel from "../models/postModel.js";
import UserModel from "../models/userModel.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import fs from 'fs';
import path from 'path';

// Get all posts
export const getAllPosts = async (req, res) => {
  try {
    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('community', 'name');
    
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get posts by user
export const getUserPosts = async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Convert userId to ObjectId if it's a valid ObjectId string
    let authorId;
    try {
      authorId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const posts = await PostModel.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('community', 'name');
    
    // Add comment count from embedded comments array
    const postsWithCommentCounts = posts.map((post) => {
      const postObj = post.toObject();
      postObj.commentCount = post.comments ? post.comments.length : 0;
      return postObj;
    });
    
    res.status(200).json(postsWithCommentCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get posts by community
export const getCommunityPosts = async (req, res) => {
  const { communityId } = req.params;
  
  try {
    const posts = await PostModel.find({ community: communityId })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar')
      .populate('community', 'name');
    
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create post
export const createPost = async (req, res) => {
  const { title, content, community, tags: tagsJson } = req.body;
  const userId = req.user?.id;
  
  try {
    // Validate input
    if (!title || !content || !community) {
      return res.status(400).json({ message: "Title, content, and community are required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required to create posts" });
    }

    // Check if the community exists
    const communityData = await mongoose.model('Communities').findById(community);
    
    if (!communityData) {
      return res.status(404).json({ message: "Community not found" });
    }
    
    // Check if the community is read-only or if the user is an admin
    if (communityData.privacy === 'read-only' && !communityData.admins.includes(userId)) {
      return res.status(403).json({ message: "This is a read-only community. Only admins can create posts." });
    }

    // Parse tags if they exist
    let tags = [];
    if (tagsJson) {
      try {
        tags = JSON.parse(tagsJson);
        console.log("Parsed tags for post:", tags);
      } catch (parseError) {
        console.error("Error parsing tags:", parseError);
        // Continue without tags if parsing fails
      }
    }

    // Initialize post data
    const postData = {
      title,
      content,
      author: userId,
      community,
      tags,
      likes: [],
      dislikes: [],
      comments: []
    };

    // If an image was uploaded, process it with Cloudinary
    if (req.file) {
      try {
        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
          folder: 'posts',
          resource_type: 'image'
        });

        // Add image URL to post data
        postData.image = cloudinaryResult.secure_url;

        // Clean up the local file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        // Continue without the image if Cloudinary upload fails
      }
    }

    // Create and save the post
    const newPost = new PostModel(postData);
    await newPost.save();
    
    // Populate the saved post
    const populatedPost = await PostModel.findById(newPost._id)
      .populate('author', 'username avatar')
      .populate('community', 'name');
    
    if (!populatedPost) {
      return res.status(500).json({ message: "Failed to create post" });
    }
    
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    
    // Clean up any uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ message: error.message });
  }
};

// Get post
export const getPost = async (req, res) => {
  const { id } = req.params;
  
  try {
    const post = await PostModel.findById(id)
      .populate('author', 'username avatar')
      .populate('community', 'name');
      
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a post
export const updatePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, content } = req.body;
  
  try {
    const post = await PostModel.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: "You can only update your own posts" });
    }
    
    const updatedPost = await PostModel.findByIdAndUpdate(
      id,
      { title, content },
      { new: true }
    )
    .populate('author', 'username avatar')
    .populate('community', 'name');
    
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete post
export const deletePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    const post = await PostModel.findById(id)
      .populate('community')
      .populate('author');
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Get the community data to check if user is author or admin
    const community = post.community;
    const isPostAuthor = post.author._id.toString() === userId;
    const isCommunityAuthor = community && community.authorId === userId;
    const isCommunityAdmin = community && community.admins && community.admins.includes(userId);
    const isPostFromCommunityAuthor = post.author._id.toString() === community.authorId;
    
    // Allow deletion if:
    // 1. User is the post author
    // 2. User is the community author (can delete any post)
    // 3. User is a community admin (can delete any post EXCEPT the community author's posts)
    if (!isPostAuthor && !isCommunityAuthor && (!isCommunityAdmin || isPostFromCommunityAuthor)) {
      // Special error for admins trying to delete author's posts
      if (isCommunityAdmin && isPostFromCommunityAuthor) {
        return res.status(403).json({ 
          message: "Community admins cannot delete posts created by the community author" 
        });
      }
      
      return res.status(403).json({ 
        message: "You can only delete your own posts or posts in communities where you are an admin" 
      });
    }
    
    // If the post has an image, delete it from Cloudinary
    if (post.image && post.image.includes('cloudinary.com')) {
      try {
        // Extract the public_id from the URL
        const splitUrl = post.image.split('/');
        const filename = splitUrl[splitUrl.length - 1];
        const publicId = `posts/${filename.split('.')[0]}`;
        
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
        // Continue with post deletion even if image deletion fails
      }
    }
    
    await PostModel.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: error.message });
  }
};

// Like a post
export const likePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // Validate authentication
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find post by ID
    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already liked - if so, remove the like (toggle behavior)
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      await post.save();
      return res.status(200).json(post);
    }

    // Remove from dislikes if present
    if (post.dislikes.includes(userId)) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userId.toString());
    }

    // Add to likes
    post.likes.push(userId);
    await post.save();

    // Send notification to post author if it's not the same person liking
    if (post.author.toString() !== userId.toString()) {
      try {
        // Import required models and functions
        const { addNotification } = await import("../controllers/notificationController.js");
        const user = await UserModel.findById(userId, 'username avatar firstname lastname');
        
        // Create notification
        const notification = {
          type: 'post_like',
          message: `${user.firstname} ${user.lastname} liked your post`,
          postId: post._id.toString(),
          likerName: `${user.firstname} ${user.lastname}`,
          likerUsername: user.username,
          likerAvatar: user.avatar || "",
        };
        
        // Add notification to post author
        await addNotification(post.author.toString(), notification);
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Continue even if notification fails
      }
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error liking post:", error);
    res.status(500).json({ message: error.message });
  }
};

// Dislike a post
export const dislikePost = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    // Validate authentication
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Find post by ID
    const post = await PostModel.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already disliked - if so, remove the dislike (toggle behavior)
    if (post.dislikes.includes(userId)) {
      post.dislikes = post.dislikes.filter(id => id.toString() !== userId.toString());
      await post.save();
      return res.status(200).json(post);
    }

    // Remove from likes if present
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    }

    // Add to dislikes
    post.dislikes.push(userId);
    await post.save();

    // Send notification to post author if it's not the same person disliking
    if (post.author.toString() !== userId.toString()) {
      try {
        // Import required models and functions
        const { addNotification } = await import("../controllers/notificationController.js");
        const user = await UserModel.findById(userId, 'username avatar firstname lastname');
        
        // Create notification
        const notification = {
          type: 'post_dislike',
          message: `${user.firstname} ${user.lastname} disliked your post`,
          postId: post._id.toString(),
          dislikerName: `${user.firstname} ${user.lastname}`,
          dislikerUsername: user.username,
          dislikerAvatar: user.avatar || "",
        };
        
        // Add notification to post author
        await addNotification(post.author.toString(), notification);
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Continue even if notification fails
      }
    }

    res.status(200).json(post);
  } catch (error) {
    console.error("Error disliking post:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get post comments
export const getPostComments = async (req, res) => {
  const { id } = req.params;
  
  try {
    const post = await PostModel.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Initialize comments as an empty array if it doesn't exist
    const comments = post.comments || [];
    
    // Make sure comments is an array before processing
    if (!Array.isArray(comments)) {
      return res.status(200).json([]);
    }
    
    // Populate author information for each comment
    const populatedComments = await Promise.all(
      comments.map(async (comment) => {
        if (!comment || !comment.author) {
          return null;
        }
        const author = await UserModel.findById(comment.author, 'username avatar');
        return {
          ...comment.toObject(),
          author
        };
      })
    ).then(results => results.filter(Boolean)); // Filter out any null comments
    
    res.status(200).json(populatedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add comment to post
export const addComment = async (req, res) => {
  const { id } = req.params;
  const { content, parentComment } = req.body;
  const userId = req.user?.id;
  
  try {
    // Validate input
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }
    
    if (!userId) {
      return res.status(401).json({ message: "User ID is required" });
    }
    
    const post = await PostModel.findById(id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    
    // Initialize comments array if it doesn't exist
    if (!post.comments) {
      post.comments = [];
    }
    
    if (!Array.isArray(post.comments)) {
      post.comments = [];
    }
    
    const newComment = {
      _id: new mongoose.Types.ObjectId(),
      content,
      author: userId,
      createdAt: new Date(),
      parentComment: parentComment || null
    };
    
    // Add the comment
    post.comments.push(newComment);
    await post.save();
    
    // Get author details
    const author = await UserModel.findById(userId, 'username avatar firstname lastname');
    
    const commentWithAuthor = {
      ...newComment,
      author
    };
    
    // Send notification to post author if it's not the same person commenting
    if (post.author.toString() !== userId.toString()) {
      try {
        // Import the addNotification function
        const { addNotification } = await import("../controllers/notificationController.js");
        
        // Create notification
        const notification = {
          type: 'post_comment',
          message: `${author.firstname} ${author.lastname} commented on your post`,
          postId: post._id.toString(),
          commentId: newComment._id.toString(),
          commenterName: `${author.firstname} ${author.lastname}`,
          commenterUsername: author.username,
          commenterAvatar: author.avatar || "",
        };
        
        // Add notification to post author
        await addNotification(post.author.toString(), notification);
      } catch (notificationError) {
        console.error("Error sending notification:", notificationError);
        // Continue even if notification fails
      }
    }
    
    res.status(201).json(commentWithAuthor);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ message: error.message });
  }
};