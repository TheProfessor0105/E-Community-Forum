import DiscussionModel from '../models/discussionModel.js';
import UserModel from '../models/userModel.js';

// Create a new discussion
export const createDiscussion = async (req, res) => {
  try {
    const { title, description, category, tags, maxParticipants } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const discussion = new DiscussionModel({
      title: title.trim(),
      description: description?.trim() || '',
      creator: userId,
      participants: [userId],
      category: category || 'general',
      tags: tags || [],
      maxParticipants: maxParticipants || 50
    });

    const savedDiscussion = await discussion.save();
    
    // Populate creator details
    await savedDiscussion.populate('creator', 'username firstname lastname avatar');
    await savedDiscussion.populate('participants', 'username firstname lastname avatar');

    res.status(201).json({
      success: true,
      message: 'Discussion created successfully',
      discussion: savedDiscussion
    });
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ message: 'Error creating discussion' });
  }
};

// Get all active discussions
export const getAllDiscussions = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const discussions = await DiscussionModel.find(query)
      .populate('creator', 'username firstname lastname avatar')
      .populate('participants', 'username firstname lastname avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DiscussionModel.countDocuments(query);

    res.status(200).json({
      success: true,
      discussions,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ message: 'Error fetching discussions' });
  }
};

// Get a specific discussion by ID
export const getDiscussionById = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user.id;

    const discussion = await DiscussionModel.findById(discussionId)
      .populate('creator', 'username firstname lastname avatar')
      .populate('participants', 'username firstname lastname avatar')
      .populate('messages.sender', 'username firstname lastname avatar');

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check if user is a participant
    const isParticipant = discussion.participants.some(
      participant => participant._id.toString() === userId
    );

    res.status(200).json({
      success: true,
      discussion,
      isParticipant
    });
  } catch (error) {
    console.error('Error fetching discussion:', error);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
};

// Join a discussion
export const joinDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user.id;

    const discussion = await DiscussionModel.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!discussion.isActive) {
      return res.status(400).json({ message: 'Discussion is not active' });
    }

    if (discussion.participants.includes(userId)) {
      return res.status(400).json({ message: 'Already a participant in this discussion' });
    }

    if (discussion.participants.length >= discussion.maxParticipants) {
      return res.status(400).json({ message: 'Discussion is full' });
    }

    discussion.participants.push(userId);
    await discussion.save();

    await discussion.populate('participants', 'username firstname lastname avatar');

    res.status(200).json({
      success: true,
      message: 'Joined discussion successfully',
      discussion
    });
  } catch (error) {
    console.error('Error joining discussion:', error);
    res.status(500).json({ message: 'Error joining discussion' });
  }
};

// Leave a discussion
export const leaveDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user.id;

    const discussion = await DiscussionModel.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!discussion.participants.includes(userId)) {
      return res.status(400).json({ message: 'Not a participant in this discussion' });
    }

    // Remove user from participants
    discussion.participants = discussion.participants.filter(
      participant => participant.toString() !== userId
    );

    await discussion.save();

    res.status(200).json({
      success: true,
      message: 'Left discussion successfully'
    });
  } catch (error) {
    console.error('Error leaving discussion:', error);
    res.status(500).json({ message: 'Error leaving discussion' });
  }
};

// Add a message to discussion
export const addMessage = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const discussion = await DiscussionModel.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (!discussion.isActive) {
      return res.status(400).json({ message: 'Discussion is not active' });
    }

    if (!discussion.participants.includes(userId)) {
      return res.status(403).json({ message: 'Must be a participant to send messages' });
    }

    const message = {
      sender: userId,
      content: content.trim(),
      timestamp: new Date()
    };

    discussion.messages.push(message);
    await discussion.save();

    // Populate the new message with sender details
    await discussion.populate('messages.sender', 'username firstname lastname avatar');
    const newMessage = discussion.messages[discussion.messages.length - 1];

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.to(`discussion-${discussionId}`).emit('new-message', {
        discussionId,
        message: newMessage
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      newMessage
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ message: 'Error adding message' });
  }
};

// Update a message
export const updateMessage = async (req, res) => {
  try {
    const { discussionId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const discussion = await DiscussionModel.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const message = discussion.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();

    await discussion.save();

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.to(`discussion-${discussionId}`).emit('message-updated', {
        discussionId,
        messageId,
        updatedMessage: message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      updatedMessage: message
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ message: 'Error updating message' });
  }
};

// Delete a discussion (creator only)
export const deleteDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user.id;

    const discussion = await DiscussionModel.findById(discussionId);
    
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    if (discussion.creator.toString() !== userId) {
      return res.status(403).json({ message: 'Only the creator can delete the discussion' });
    }

    discussion.isActive = false;
    await discussion.save();

    res.status(200).json({
      success: true,
      message: 'Discussion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    res.status(500).json({ message: 'Error deleting discussion' });
  }
};

// Get user's discussions
export const getUserDiscussions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const discussions = await DiscussionModel.find({
      participants: userId,
      isActive: true
    })
      .populate('creator', 'username firstname lastname avatar')
      .populate('participants', 'username firstname lastname avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DiscussionModel.countDocuments({
      participants: userId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      discussions,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching user discussions:', error);
    res.status(500).json({ message: 'Error fetching user discussions' });
  }
};
