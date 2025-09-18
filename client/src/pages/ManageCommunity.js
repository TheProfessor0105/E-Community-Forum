import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  Alert,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ArrowUpward as PromoteIcon,
  ArrowDownward as DemoteIcon,
  PersonRemove as RemoveIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import axios from 'axios';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`community-tabpanel-${index}`}
      aria-labelledby={`community-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function ManageCommunity() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthor, setIsAuthor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  
  // Confirmation dialogs
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'post' or 'member'
  
  // Member action menu
  const [memberMenuAnchorEl, setMemberMenuAnchorEl] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Tabs
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchCommunityData = async () => {
      setLoading(true);
      try {
        // Fetch community details
        const response = await fetch(`/api/communities/${communityId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch community data');
        }
        
        const communityData = await response.json();
        setCommunity(communityData);
        
        // Check if current user is author or admin
        if (currentUser) {
          setIsAuthor(communityData.authorId === currentUser._id);
          setIsAdmin(communityData.admins && communityData.admins.includes(currentUser._id));
          
          // Get current user's friends
          if (currentUser.friends) {
            setFriends(Array.isArray(currentUser.friends) ? currentUser.friends : []);
          }
          
          // Check for pending friend requests in notifications
          try {
            const notificationsResponse = await axios.get(`/api/notifications/${currentUser._id}`);
            const notifications = notificationsResponse.data || [];
            
            console.log("Current user notifications:", notifications);
            
            // Track members who have outgoing friend requests
            const outgoingRequests = notifications
              .filter(n => n.type === 'outgoing_friend_request')
              .map(n => n.receiverId)
              .filter(Boolean);
            
            // Track members who have sent incoming friend requests
            const incomingRequests = notifications
              .filter(n => n.type === 'friend_request')
              .map(n => n.senderId)
              .filter(Boolean);
            
            console.log("Outgoing friend requests:", outgoingRequests);
            console.log("Incoming friend requests:", incomingRequests);
            
            // Combine both - we can't send requests to either of these groups
            const allPendingRequests = [...outgoingRequests, ...incomingRequests];
            setPendingFriendRequests(allPendingRequests);
          } catch (error) {
            console.error('Error fetching notifications:', error);
          }
        }
        
        // Fetch members with details
        const membersResponse = await fetch(`/api/communities/${communityId}/members`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!membersResponse.ok) {
          throw new Error('Failed to fetch community members');
        }
        
        const membersData = await membersResponse.json();
        setMembers(membersData);
        
        // Fetch posts
        const postsResponse = await fetch(`/api/posts/community/${communityId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!postsResponse.ok) {
          throw new Error('Failed to fetch community posts');
        }
        
        const postsData = await postsResponse.json();
        setPosts(postsData);
        
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data');
        console.error('Error fetching community data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityData();
  }, [communityId, token, currentUser]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Member management functions
  const handleMemberMenuOpen = (event, member) => {
    setMemberMenuAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMemberMenuClose = () => {
    setMemberMenuAnchorEl(null);
    setSelectedMember(null);
  };

  const handlePromoteMember = async () => {
    if (!selectedMember) return;
    
    try {
      const response = await fetch(`/api/communities/${communityId}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: currentUser._id,
          member: selectedMember._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to promote member');
      }

      // Update members list
      setMembers(prev => 
        prev.map(member => 
          member._id === selectedMember._id 
            ? { ...member, isAdmin: true } 
            : member
        )
      );
      
      setSuccess(`${selectedMember.username} has been promoted to admin`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to promote member');
      setTimeout(() => setError(''), 3000);
    }
    
    handleMemberMenuClose();
  };

  const handleDemoteMember = async () => {
    if (!selectedMember) return;
    
    try {
      console.log('Attempting to demote admin:', {
        communityId,
        userId: currentUser._id,
        member: selectedMember._id
      });
      
      const response = await fetch(`/api/communities/${communityId}/demote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: currentUser._id,
          member: selectedMember._id
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Demote admin failed:', responseData);
        throw new Error(responseData.message || 'Failed to demote admin');
      }

      console.log('Demote admin success:', responseData);

      // Update members list
      setMembers(prev => 
        prev.map(member => 
          member._id === selectedMember._id 
            ? { ...member, isAdmin: false } 
            : member
        )
      );
      
      setSuccess(`${selectedMember.username} has been demoted to regular member`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error in demote function:', err);
      setError(err.message || 'Failed to demote admin');
      setTimeout(() => setError(''), 3000);
    }
    
    handleMemberMenuClose();
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    setDeleteTarget(selectedMember);
    setDeleteType('member');
    setDeleteConfirmOpen(true);
    handleMemberMenuClose();
  };

  const handleDeletePost = (post) => {
    setDeleteTarget(post);
    setDeleteType('post');
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      if (deleteType === 'member') {
        // Remove member
        const response = await fetch(`/api/communities/${communityId}/member/${deleteTarget._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            userId: currentUser._id,
            member: deleteTarget._id
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to remove member');
        }

        // Update members list
        setMembers(prev => prev.filter(member => member._id !== deleteTarget._id));
        setSuccess(`${deleteTarget.username} has been removed from the community`);
      } else if (deleteType === 'post') {
        // Check if admin is trying to delete author's post
        if (!isAuthor && deleteTarget.author._id === community.authorId) {
          setError("You don't have permission to delete the community author's posts");
          setTimeout(() => setError(''), 3000);
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
          setDeleteType('');
          return;
        }
        
        // Delete post
        const response = await fetch(`/api/posts/${deleteTarget._id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete post');
        }

        // Update posts list
        setPosts(prev => prev.filter(post => post._id !== deleteTarget._id));
        setSuccess('Post has been deleted successfully');
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || `Failed to ${deleteType === 'member' ? 'remove member' : 'delete post'}`);
      setTimeout(() => setError(''), 3000);
    }
    
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    setDeleteType('');
  };

  // Send friend request
  const handleSendFriendRequest = async (receiverId) => {
    try {
      console.log("==== SEND FRIEND REQUEST CLIENT SIDE ====");
      console.log("Current user:", currentUser);
      console.log("Sending friend request from", currentUser._id, "to", receiverId);
      
      if (!currentUser || !currentUser._id) {
        setError("You must be logged in to send a friend request");
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      const response = await axios.post('/api/users/friend-request', {
        userId: currentUser._id,
        receiverId
      });
      
      console.log("Friend request response:", response);
      console.log("Response data:", response.data);
      
      // Update pending requests - use the receiverId from the response to ensure accuracy
      if (response.data && response.data.notification) {
        const receiverIdFromResponse = response.data.notification.receiverId;
        console.log("Adding to pending requests:", receiverIdFromResponse);
        setPendingFriendRequests(prev => [...prev, receiverIdFromResponse]);
      } else {
        // Fallback if response structure changes
        console.log("Adding to pending requests (fallback):", receiverId);
        setPendingFriendRequests(prev => [...prev, receiverId]);
      }
      
      setSuccess('Friend request sent successfully');
      setTimeout(() => setSuccess(''), 3000);
      console.log("==== SEND FRIEND REQUEST COMPLETED ====");
    } catch (error) {
      console.error("Error sending friend request:", error);
      
      // Log more details about the error
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      }
      
      setError(error.response?.data?.message || 'Failed to send friend request');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Render checks
  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Typography>Loading community management...</Typography>
        </Container>
      </>
    );
  }

  if (!community || (!isAdmin && !isAuthor)) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">
            You don't have permission to manage this community
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate(`/community/${communityId}`)}>
              Return to Community
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ mb: 4 }}>
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee'
          }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Manage Community: {community.name}
              </Typography>
              <Chip 
                label={isAuthor ? "Community Author" : "Community Admin"} 
                color={isAuthor ? "primary" : "secondary"} 
                variant="outlined" 
                size="small"
                sx={{ mr: 1 }}
              />
              <Chip 
                label={community.privacy === 'public' ? "Public Community" : "Read-Only Community"} 
                color="default" 
                variant="outlined" 
                size="small" 
              />
            </Box>
            <Button
              variant="outlined"
              onClick={() => navigate(`/community/${communityId}`)}
            >
              Return to Community
            </Button>
          </Box>

          {/* Success/Error messages */}
          {success && (
            <Alert severity="success" sx={{ mx: 3, mt: 2 }}>
              {success}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
              {error}
            </Alert>
          )}

          {/* Debug button for refreshing notifications */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', m: 2 }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={async () => {
                try {
                  const response = await axios.get(`/api/notifications/${currentUser._id}`);
                  console.log("DEBUG - Current notifications:", response.data);
                  setSuccess("Notifications fetched. Check console for details.");
                  setTimeout(() => setSuccess(''), 3000);
                } catch (err) {
                  console.error("Error fetching notifications:", err);
                  setError("Error fetching notifications");
                  setTimeout(() => setError(''), 3000);
                }
              }}
            >
              Debug: Check Notifications
            </Button>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="community management tabs">
              <Tab label="Members" id="community-tab-0" />
              <Tab label="Posts" id="community-tab-1" />
            </Tabs>
          </Box>

          {/* Members Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Community Members ({members.length})
            </Typography>
            
            <List>
              {members.map((member) => {
                const isCurrentUser = member._id === currentUser?._id;
                const isMemberAuthor = member._id === community.authorId;
                const isMemberAdmin = community.admins?.includes(member._id);
                const isFriend = currentUser?.friends?.includes(member._id);
                const hasPendingRequest = pendingFriendRequests.includes(member._id);
                
                return (
                  <ListItem
                    key={member._id}
                    divider
                    secondaryAction={
                      <>
                        {!isCurrentUser && !isMemberAuthor && (
                          <>
                            {(isAuthor || isAdmin) && (
                              <IconButton 
                                edge="end" 
                                onClick={(e) => handleMemberMenuOpen(e, member)}
                                disabled={!isAuthor && isMemberAdmin}
                                sx={{ ml: 1 }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            )}
                            
                            {!isFriend && !hasPendingRequest && (
                              <Button
                                startIcon={<PersonAddIcon />}
                                size="small"
                                onClick={() => handleSendFriendRequest(member._id)}
                                sx={{ mr: 1 }}
                              >
                                Add Friend
                              </Button>
                            )}
                            
                            {hasPendingRequest && (
                              <Button
                                size="small"
                                disabled
                                sx={{ mr: 1 }}
                              >
                                Request Sent
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar 
                        src={member.avatar} 
                        alt={member.username}
                        onClick={() => navigate(`/profile/${member._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {member.username[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/profile/${member._id}`)}
                          >
                            {member.username}
                          </Typography>
                          {isCurrentUser && (
                            <Chip size="small" label="You" sx={{ ml: 1 }} />
                          )}
                          {isMemberAuthor && (
                            <Chip size="small" color="primary" label="Author" sx={{ ml: 1 }} />
                          )}
                          {isMemberAdmin && !isMemberAuthor && (
                            <Chip size="small" color="secondary" label="Admin" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {member.bio ? member.bio.substring(0, 60) + (member.bio.length > 60 ? '...' : '') : 'No bio available'}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* Member Actions Menu */}
            <Menu
              anchorEl={memberMenuAnchorEl}
              open={Boolean(memberMenuAnchorEl)}
              onClose={handleMemberMenuClose}
            >
              {isAuthor && (
                <>
                  {!community.admins?.includes(selectedMember?._id) ? (
                    <MenuItem onClick={handlePromoteMember}>
                      <ListItemAvatar>
                        <PromoteIcon fontSize="small" />
                      </ListItemAvatar>
                      <ListItemText>Promote to Admin</ListItemText>
                    </MenuItem>
                  ) : (
                    <MenuItem onClick={handleDemoteMember}>
                      <ListItemAvatar>
                        <DemoteIcon fontSize="small" />
                      </ListItemAvatar>
                      <ListItemText>Demote to Member</ListItemText>
                    </MenuItem>
                  )}
                </>
              )}
              <MenuItem onClick={handleRemoveMember}>
                <ListItemAvatar>
                  <RemoveIcon fontSize="small" />
                </ListItemAvatar>
                <ListItemText>Remove from Community</ListItemText>
              </MenuItem>
            </Menu>
          </TabPanel>

          {/* Posts Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Community Posts ({posts.length})
            </Typography>
            
            {posts.length === 0 ? (
              <Alert severity="info">No posts in this community yet</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {posts.map((post) => (
                  <Card key={post._id}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" component="div">
                          {post.title}
                        </Typography>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeletePost(post)}
                          disabled={
                            (!isAuthor && post.author._id === community.authorId) || // Prevent admins from deleting author's posts
                            (!isAuthor && !isAdmin && post.author._id !== currentUser?._id)
                          }
                          title={
                            (!isAuthor && post.author._id === community.authorId) 
                              ? "Author's posts cannot be deleted by admins" 
                              : "Delete post"
                          }
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography color="text.secondary" gutterBottom>
                        Posted by{' '}
                        <span
                          style={{ cursor: 'pointer', color: '#1976d2' }}
                          onClick={() => navigate(`/profile/${post.author?._id}`)}
                        >
                          {post.author?.username}
                        </span>
                        {' '}on {new Date(post.createdAt).toLocaleDateString()}
                      </Typography>
                      
                      {post.image && (
                        <CardMedia
                          component="img"
                          height="140"
                          image={post.image}
                          alt={post.title}
                          sx={{ objectFit: 'cover', my: 2, borderRadius: 1 }}
                        />
                      )}
                      
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {post.content && post.content.length > 150
                          ? `${post.content.substring(0, 150)}...`
                          : post.content}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => navigate(`/post/${post._id}`)}>
                        View Post
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}
          </TabPanel>
        </Paper>

        {/* Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>
            {deleteType === 'member' ? 'Remove Member' : 'Delete Post'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteType === 'member' 
                ? `Are you sure you want to remove ${deleteTarget?.username} from this community?`
                : 'Are you sure you want to delete this post? This action cannot be undone.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              {deleteType === 'member' ? 'Remove' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default ManageCommunity; 