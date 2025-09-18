# Friendship System

## Overview
The friendship system allows users to connect with each other through friend requests, manage their friends list, and view friendship status.

## Features

### 1. Friend Requests
- **Send Friend Request**: Users can send friend requests to other users
- **Accept/Reject Requests**: Users can accept or reject incoming friend requests
- **Cancel Sent Requests**: Users can cancel friend requests they've sent
- **Request Status Tracking**: System tracks pending, accepted, and rejected requests

### 2. Friends Management
- **Friends List**: View all current friends with their profiles
- **Remove Friends**: Remove users from friends list
- **Friends Count**: Display total number of friends on profiles
- **Friends Tab**: Dedicated page to manage friends and requests

### 3. Profile Integration
- **Friendship Button**: Dynamic button showing current friendship status
- **Friends Count**: Displayed in profile stats
- **Friends Tab**: Shows user's friends in profile view

## API Endpoints

### Friend Requests
- `POST /api/friendship/send-request` - Send friend request
- `POST /api/friendship/accept-request/:requestId` - Accept friend request
- `POST /api/friendship/reject-request/:requestId` - Reject friend request
- `DELETE /api/friendship/cancel-request/:targetUserId` - Cancel sent request

### Friends Management
- `GET /api/friendship/friends/:userId` - Get user's friends list
- `DELETE /api/friendship/remove-friend/:friendId` - Remove friend
- `GET /api/friendship/requests` - Get friend requests (received and sent)
- `GET /api/friendship/status/:targetUserId` - Get friendship status with user

## Database Schema

### User Model Updates
```javascript
{
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users"
  }],
  friendRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
    createdAt: { type: Date, default: Date.now }
  }],
  sentFriendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users"
  }]
}
```

## Frontend Components

### 1. FriendshipButton Component
- Reusable component for profile pages
- Shows different states: Add Friend, Request Sent, Friends, Remove Friend
- Handles all friendship actions
- Real-time status updates

### 2. Friends Page
- Tabbed interface for Friends, Requests, and Sent Requests
- Badge counters for each section
- Accept/Reject/Cancel actions
- Remove friend functionality

### 3. Profile Integration
- Friends count in stats
- Friends tab in profile view
- Friendship button for non-own profiles

## Usage Examples

### Sending a Friend Request
```javascript
const response = await fetch('/api/friendship/send-request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ targetUserId: 'user_id' }),
});
```

### Getting Friendship Status
```javascript
const response = await fetch(`/api/friendship/status/${targetUserId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Using FriendshipButton Component
```javascript
<FriendshipButton 
  targetUserId={userId}
  onFriendshipChange={refreshData}
/>
```

## Security Features
- Authentication required for all friendship operations
- Users can only view friends of their own profile or their friends
- Proper validation for all friendship actions
- Protection against self-friending

## UI Features
- Real-time status updates
- Loading states for all actions
- Error handling with user-friendly messages
- Responsive design for all screen sizes
- Badge counters for pending requests
- Tabbed interface for easy navigation
