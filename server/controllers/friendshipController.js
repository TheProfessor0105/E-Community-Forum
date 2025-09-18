import UserModel from '../models/userModel.js';

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    if (senderId === targetUserId) {
      return res.status(400).json({ message: 'You cannot send friend request to yourself' });
    }

    // Check if target user exists
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if already friends
    const sender = await UserModel.findById(senderId);
    if (sender.friends.includes(targetUserId)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check if friend request already exists
    const existingRequest = sender.friendRequests.find(
      request => request.from.toString() === senderId && request.to.toString() === targetUserId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if target user has already sent a request
    const reverseRequest = sender.friendRequests.find(
      request => request.from.toString() === targetUserId && request.to.toString() === senderId
    );

    if (reverseRequest && reverseRequest.status === 'pending') {
      return res.status(400).json({ message: 'This user has already sent you a friend request' });
    }

    // Add friend request to sender's sent requests
    sender.sentFriendRequests.push(targetUserId);
    await sender.save();

    // Add friend request to target user's received requests
    targetUser.friendRequests.push({
      from: senderId,
      to: targetUserId,
      status: 'pending'
    });
    await targetUser.save();

    // Populate sender details for response
    await sender.populate('sentFriendRequests', 'username firstname lastname avatar');

    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully',
      sentRequests: sender.sentFriendRequests
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Error sending friend request' });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the friend request
    const friendRequest = user.friendRequests.find(
      request => request._id.toString() === requestId
    );

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request has already been processed' });
    }

    // Update request status to accepted
    friendRequest.status = 'accepted';

    // Add each user to the other's friends list
    const senderId = friendRequest.from;
    
    // Add target user to sender's friends
    const sender = await UserModel.findById(senderId);
    if (sender && !sender.friends.includes(userId)) {
      sender.friends.push(userId);
      await sender.save();
    }

    // Add sender to target user's friends
    if (!user.friends.includes(senderId)) {
      user.friends.push(senderId);
    }

    // Remove from sent requests
    user.sentFriendRequests = user.sentFriendRequests.filter(
      id => id.toString() !== senderId
    );

    await user.save();

    // Populate friends for response
    await user.populate('friends', 'username firstname lastname avatar');

    res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully',
      friends: user.friends
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request' });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the friend request
    const friendRequest = user.friendRequests.find(
      request => request._id.toString() === requestId
    );

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request has already been processed' });
    }

    // Update request status to rejected
    friendRequest.status = 'rejected';

    // Remove from sent requests of the sender
    const senderId = friendRequest.from;
    const sender = await UserModel.findById(senderId);
    if (sender) {
      sender.sentFriendRequests = sender.sentFriendRequests.filter(
        id => id.toString() !== userId
      );
      await sender.save();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ message: 'Error rejecting friend request' });
  }
};

// Get user's friends
export const getUserFriends = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if user is requesting their own friends or is a friend
    const currentUser = await UserModel.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isOwnProfile = userId === currentUserId;
    const isFriend = currentUser.friends.includes(userId);

    if (!isOwnProfile && !isFriend) {
      return res.status(403).json({ message: 'You can only view friends of your own profile or your friends' });
    }

    const user = await UserModel.findById(userId)
      .populate('friends', 'username firstname lastname avatar about livesin');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      friends: user.friends,
      friendsCount: user.friends.length
    });
  } catch (error) {
    console.error('Error fetching user friends:', error);
    res.status(500).json({ message: 'Error fetching user friends' });
  }
};

// Get friend requests
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await UserModel.findById(userId)
      .populate('friendRequests.from', 'username firstname lastname avatar')
      .populate('sentFriendRequests', 'username firstname lastname avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter pending requests
    const pendingRequests = user.friendRequests.filter(
      request => request.status === 'pending'
    );

    res.status(200).json({
      success: true,
      receivedRequests: pendingRequests,
      sentRequests: user.sentFriendRequests,
      receivedCount: pendingRequests.length,
      sentCount: user.sentFriendRequests.length
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Error fetching friend requests' });
  }
};

// Remove friend
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if they are friends
    if (!user.friends.includes(friendId)) {
      return res.status(400).json({ message: 'You are not friends with this user' });
    }

    // Remove from both users' friends lists
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    await user.save();

    const friend = await UserModel.findById(friendId);
    if (friend) {
      friend.friends = friend.friends.filter(id => id.toString() !== userId);
      await friend.save();
    }

    // Populate friends for response
    await user.populate('friends', 'username firstname lastname avatar');

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully',
      friends: user.friends,
      friendsCount: user.friends.length
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Error removing friend' });
  }
};

// Cancel sent friend request
export const cancelFriendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user.id;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request was sent
    if (!user.sentFriendRequests.includes(targetUserId)) {
      return res.status(400).json({ message: 'No friend request sent to this user' });
    }

    // Remove from sent requests
    user.sentFriendRequests = user.sentFriendRequests.filter(
      id => id.toString() !== targetUserId
    );
    await user.save();

    // Remove from target user's received requests
    const targetUser = await UserModel.findById(targetUserId);
    if (targetUser) {
      targetUser.friendRequests = targetUser.friendRequests.filter(
        request => !(request.from.toString() === userId && request.to.toString() === targetUserId)
      );
      await targetUser.save();
    }

    res.status(200).json({
      success: true,
      message: 'Friend request cancelled successfully',
      sentRequests: user.sentFriendRequests
    });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ message: 'Error cancelling friend request' });
  }
};

// Get friendship status with another user
export const getFriendshipStatus = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const userId = req.user.id;

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot check friendship status with yourself' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if they are friends
    const areFriends = user.friends.includes(targetUserId);

    // Check for pending requests
    const sentRequest = user.sentFriendRequests.includes(targetUserId);
    const receivedRequest = user.friendRequests.find(
      request => request.from.toString() === targetUserId && request.status === 'pending'
    );

    let status = 'none';
    if (areFriends) {
      status = 'friends';
    } else if (sentRequest) {
      status = 'request_sent';
    } else if (receivedRequest) {
      status = 'request_received';
    }

    res.status(200).json({
      success: true,
      status,
      areFriends,
      sentRequest,
      receivedRequest: !!receivedRequest
    });
  } catch (error) {
    console.error('Error getting friendship status:', error);
    res.status(500).json({ message: 'Error getting friendship status' });
  }
};
