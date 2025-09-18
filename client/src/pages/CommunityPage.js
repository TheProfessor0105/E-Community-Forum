import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Avatar,
  Box,
  Divider,
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoIcon from '@mui/icons-material/Info';
import FlagIcon from '@mui/icons-material/Flag';
import BlockIcon from '@mui/icons-material/Block';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import axios from 'axios';
import { getBestToken, getAuthHeaders, authFetch } from '../utils/authUtils';

// API Base URL - Change this if your backend is running on a different URL
// Using a relative URL will bypass CORS as the browser will use the same origin
// This assumes you're using a proxy in your React app or your server is serving the frontend
const API_BASE_URL = '/api';

// Helper component to display connection errors
const ConnectionErrorDisplay = ({ message }) => (
  <Paper elevation={3} sx={{ 
    p: 3, 
    mb: 2, 
    border: '1px solid #f44336',
    borderRadius: '4px',
    bgcolor: '#ffebee' 
  }}>
    <Typography variant="h6" color="error" gutterBottom>
      Connection Error
    </Typography>
    <Typography variant="body1" paragraph>
      {message}
    </Typography>
    <Typography variant="body2" sx={{ mb: 2 }}>
      <strong>Troubleshooting steps:</strong>
    </Typography>
    <ol>
      <li>
        <Typography variant="body2">
          Make sure your server is running on port 5000
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Check that the server has CORS enabled to allow requests from your client
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Verify the API URL is correct: <code>{API_BASE_URL}</code>
        </Typography>
      </li>
      <li>
        <Typography variant="body2">
          Try using a direct fetch to test the connection:
          <code>{`
fetch("${API_BASE_URL.split('/api')[0]}", {
  method: "GET",
  headers: { "Content-Type": "application/json" }
}).then(r => console.log(r))
          `}</code>
        </Typography>
      </li>
    </ol>
    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => window.location.reload()}
      >
        Retry Connection
      </Button>
    </Box>
  </Paper>
);

function CommunityPage() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [otherAdmins, setOtherAdmins] = useState([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const openMenu = Boolean(menuAnchorEl);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [friendRequests, setFriendRequests] = useState({});
  const [requestSent, setRequestSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openError, setOpenError] = useState(false);

  useEffect(() => {
    const testServerConnection = async () => {
      try {
        console.log("Testing connection to server root URL");
        // Test connection by fetching the homepage first
        const response = await fetch('/', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log("Server test response status:", response.status);
        
        // Now try connecting to the API endpoint
        const apiResponse = await fetch(`${API_BASE_URL}/communities`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log("API test response status:", apiResponse.status);
        
        // If no error, clear any previous connection errors
        setConnectionError('');
      } catch (error) {
        console.error('Server connection test failed:', error);
        setConnectionError(
          `Cannot connect to server. ` +
          `Please check if the server is running on port 5000 and API endpoints are correctly configured. ` +
          `Error: ${error.message}`
        );
        setLoading(false);
      }
    };
    
    testServerConnection();
  }, []);

  useEffect(() => {
    // Skip fetching if there's a connection error
    if (connectionError) {
      setLoading(false);
      return;
    }
    
    const fetchCommunityData = async () => {
      try {
        if (!communityId || communityId === 'undefined') {
          console.error('Invalid community ID');
          setError('Invalid community ID. Please try again or return to explore page.');
          setLoading(false);
          return;
        }

        const authToken = getBestToken(token);
        if (!authToken) {
          console.error('No authentication token available');
          setError('You must be logged in to view this community');
          setLoading(false);
          return;
        }

        // Use API path /:id for specific community
        const response = await authFetch(`${API_BASE_URL}/communities/${communityId}`, {
          method: 'GET'
        }, authToken);

        if (response.success) {
          // Logging the response to debug
          console.log("Community data response:", response);
          
          // The community data could be directly in response.data or in response
          const communityData = response.data || response;
          
          if (communityData) {
            setCommunity(communityData);
            
            // Only try to access members if currentUser exists
            if (currentUser && currentUser._id) {
              const members = communityData.members || [];
              const admins = communityData.admins || [];
              
              setIsMember(members.includes(currentUser._id));
              setIsAdmin(admins.includes(currentUser._id));
              setIsAuthor(communityData.authorId === currentUser._id);
              
              if (admins.length > 0 && currentUser) {
                const others = admins.filter(id => id.toString() !== currentUser._id.toString());
                setOtherAdmins(others);
              }
            }
          } else {
            throw new Error('Community data not found in response');
          }
        } else {
          // Check if it's a connection error
          if (response.message && response.message.includes('Cannot connect to the server')) {
            setConnectionError(response.message);
          } else {
            throw new Error(response.message || 'Failed to fetch community');
          }
        }
      } catch (error) {
        console.error('Error fetching community:', error);
        // Check for network/connection errors
        if (error.message && (
          error.message.includes('Failed to fetch') || 
          error.message.includes('Network error') ||
          error.message.includes('Cannot connect')
        )) {
          setConnectionError(
            `Cannot connect to the server at ${API_BASE_URL.split('/api')[0]}. ` +
            `Please make sure the server is running and accessible.`
          );
        } else {
          setError('Failed to load community data');
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchCommunityPosts = async () => {
      try {
        // Skip if communityId is invalid or there's a connection error
        if (!communityId || communityId === 'undefined' || connectionError) {
          return;
        }
        
        const authToken = getBestToken(token);
        // Use posts/community/:communityId for community posts
        const response = await authFetch(`${API_BASE_URL}/posts/community/${communityId}`, {
          method: 'GET'
        }, authToken);
        
        if (response.success) {
          // Logging the response to debug
          console.log("Community posts response:", response);
          
          // Posts could be in response.data, response.posts, or response directly
          const postsData = response.data || response.posts || [];
          setPosts(postsData);
        } else {
          throw new Error(response.message || 'Failed to fetch posts');
        }
      } catch (error) {
        console.error('Error fetching community posts:', error);
        setPosts([]);
      }
    };

    fetchCommunityData();
    fetchCommunityPosts();
  }, [communityId, token, currentUser, connectionError]);

  const handleJoinCommunity = async () => {
    try {
      const authToken = getBestToken(token);
      if (!authToken) {
        console.error('No authentication token available');
        setError('You must be logged in to join a community');
        setOpenSuccess(false);
        return;
      }

      // Use /:id/join for joining community
      const response = await authFetch(`${API_BASE_URL}/communities/${communityId}/join`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser._id })
      }, authToken);

      if (response.success) {
        setIsMember(true);
        setCommunity(prevCommunity => ({
          ...prevCommunity,
          memberCount: (prevCommunity.memberCount || 0) + 1
        }));
        setSuccessMessage(response.message || 'Successfully joined community!');
        setOpenSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to join community');
      }
    } catch (error) {
      console.error('Error joining community:', error);
      setError(error.message || 'Failed to join community');
      setOpenSuccess(false);
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      const authToken = getBestToken(token);
      if (!authToken) {
        console.error('No authentication token available');
        setError('You must be logged in to leave a community');
        setOpenSuccess(false);
        return;
      }

      // Use /:id/leave for leaving community
      const response = await authFetch(`${API_BASE_URL}/communities/${communityId}/leave`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser._id })
      }, authToken);

      if (response.success) {
        setIsMember(false);
        setCommunity(prevCommunity => ({
          ...prevCommunity,
          memberCount: Math.max((prevCommunity.memberCount || 1) - 1, 0)
        }));
        setSuccessMessage(response.message || 'Successfully left community');
        setOpenSuccess(true);
      } else {
        throw new Error(response.message || 'Failed to leave community');
      }
    } catch (error) {
      console.error('Error leaving community:', error);
      setError(error.message || 'Failed to leave community');
      setOpenSuccess(false);
    }
  };

  const handleCreatePost = () => {
    navigate('/create-post', { state: { selectedCommunity: communityId } });
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Check if user can post in this community
  const canCreatePost = () => {
    if (!community) return false;
    return (community.privacy === 'public' && isMember) || isAdmin || isAuthor;
  };

  const fetchCommunityMembers = async () => {
    try {
      const authToken = getBestToken(token);
      // Use /:id/members for community members
      const response = await authFetch(`${API_BASE_URL}/communities/${communityId}/members`, {
        method: 'GET'
      }, authToken);
      
      if (response.success) {
        // Members could be in response.members, response.data, or directly in response
        const membersData = response.members || response.data || [];
        setCommunityMembers(membersData);
      } else {
        console.error('Failed to fetch community members');
      }
    } catch (error) {
      console.error('Error fetching community members:', error);
    }
  };

  const handleViewMembers = () => {
    fetchCommunityMembers();
    setMembersDialogOpen(true);
  };

  const handleFriendRequest = async (memberId, event) => {
    event.stopPropagation(); // Prevent navigation to profile
    
    if (!currentUser || !token) {
      navigate('/login');
      return;
    }
    
    try {
      console.log(`Sending friend request to member ID: ${memberId}`);
      
      // Update local state to show the request is pending
      setFriendRequests(prev => ({
        ...prev,
        [memberId]: 'pending'
      }));
      
      // Call the API to send friend request and save notification
      const authToken = getBestToken(token);
      const response = await authFetch(`${API_BASE_URL}/users/friend-request`, {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser._id,
          receiverId: memberId
        })
      }, authToken);
      
      console.log('Friend request response:', response);
      
      if (response.success) {
        // Show success message
        setRequestSent(true);
        setTimeout(() => setRequestSent(false), 3000);
      } else {
        throw new Error(response.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      // Revert the pending status if request fails
      setFriendRequests(prev => {
        const updated = {...prev};
        delete updated[memberId];
        return updated;
      });
    }
  };

  const handleDeleteCommunity = async () => {
    if (!token || !currentUser || !isAuthor) {
      setError('You do not have permission to delete this community');
      return;
    }
    
    try {
      const authToken = getBestToken(token);
      const response = await authFetch(`${API_BASE_URL}/communities/${communityId}`, {
        method: 'DELETE',
        body: JSON.stringify({ userId: currentUser._id })
      }, authToken);

      if (response.success) {
        navigate('/explore');
      } else {
        setError(response.message || 'Failed to delete community');
      }
    } catch (error) {
      console.error('Error deleting community:', error);
      setError('An error occurred while deleting the community');
    }
  };

  if (!community && !loading) {
    return (
      <div className="communityPage">
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 5, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error || (!communityId || communityId === 'undefined' ? 
              "Invalid community ID" : 
              "Community not found")}
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            {!communityId || communityId === 'undefined' ? 
              "The community ID is invalid or not specified." : 
              "This community may have been deleted or you might not have permission to view it."}
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/explore')}
            sx={{ mt: 2 }}
          >
            Go to Explore
          </Button>
        </Container>
      </div>
    );
  }

  // Display connection error if present
  if (connectionError) {
    return (
      <div className="communityPage">
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 5 }}>
          <ConnectionErrorDisplay message={connectionError} />
        </Container>
      </div>
    );
  }

  return (
    <div className="communityPage">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </div>
      ) : (
        <>
          <Navbar />

          {/* Community Header */}
          <Box 
            sx={{ 
              width: '100%', 
              backgroundColor: 'primary.main', 
              color: 'white',
              borderBottom: '1px solid #e0e0e0'
            }}
          >
            <Container maxWidth="lg">
              <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                <Avatar
                  src={community.image}
                  alt={community.name}
                  sx={{ 
                    width: 56, 
                    height: 56, 
                    border: '3px solid white',
                    backgroundColor: 'white',
                    mr: 2
                  }}
                >
                  {community.name && community.name[0].toUpperCase()}
                </Avatar>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">
                      r/{community.name}
                    </Typography>
                    {community.privacy === 'read-only' && (
                      <Tooltip title="Read-only community: Only admins can post">
                        <LockIcon sx={{ ml: 1, fontSize: '0.9rem', opacity: 0.8 }} />
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="body2">
                    {community.membersCount || community.members?.length || 0} members
                  </Typography>
                </Box>
                
                {!isMember && !isAuthor ? (
                  <Tooltip title={community.privacy === 'read-only' ? 'You can join, but only admins can post in this community.' : 'Join this community'}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleJoinCommunity}
                      sx={{ 
                        borderRadius: '20px', 
                        px: 3,
                        fontWeight: 'bold'
                      }}
                    >
                      Join
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={() => setLeaveDialogOpen(true)}
                    sx={{ 
                      borderRadius: '20px', 
                      px: 3,
                      fontWeight: 'bold',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                      }
                    }}
                  >
                    Joined
                  </Button>
                )}
                
                <IconButton 
                  aria-label="more options" 
                  sx={{ 
                    ml: 1,
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.1)',
                    }
                  }}
                  onClick={handleMenuOpen}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Container>
          </Box>

          {/* Delete Community Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
          >
            <DialogTitle color="error">Delete Community</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this community? This action cannot be undone.
                All posts and content in this community will be lost.
              </DialogContentText>
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteCommunity} color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Leave Community Dialog */}
          <Dialog
            open={leaveDialogOpen}
            onClose={() => {
              setLeaveDialogOpen(false);
              setError('');
            }}
          >
            <DialogTitle>Leave Community</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to leave this community?
                {isAdmin && !isAuthor ? " As an admin, leaving will remove your admin privileges." : ""}
                {isAuthor ? " As the author, another admin will be promoted to author if available." : ""}
              </DialogContentText>
              {isAuthor && otherAdmins.length === 0 && (
                <Typography color="warning.main" sx={{ mt: 2 }}>
                  <b>Warning:</b> As the only admin, you cannot leave this community. 
                  Please promote another member to admin first, or delete the community.
                </Typography>
              )}
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setLeaveDialogOpen(false);
                setError('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleLeaveCommunity}
                color="primary"
                disabled={isAuthor && otherAdmins.length === 0}
              >
                Leave
              </Button>
            </DialogActions>
          </Dialog>

          <Container maxWidth="lg" sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              {/* Main Content */}
              <Grid item xs={12} md={8}>
                {/* Create Post Box */}
                {canCreatePost() && (
                  <Paper sx={{ mb: 3, p: 2, display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      src={currentUser?.avatar}
                      alt={currentUser?.username}
                      sx={{ mr: 1.5 }}
                    >
                      {currentUser?.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <TextField
                      fullWidth
                      placeholder="Create Post"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          '&:hover fieldset': {
                            borderColor: '#e0e0e0',
                          },
                        }
                      }}
                      onClick={handleCreatePost}
                      InputProps={{
                        style: { cursor: 'pointer' }
                      }}
                    />
                  </Paper>
                )}

                {/* Latest Posts */}
                <Paper sx={{ mb: 3 }}>
                  <AppBar position="static" color="default" elevation={0}>
                    <Toolbar variant="dense" sx={{ borderBottom: '1px solid #e0e0e0', justifyContent: 'space-between' }}>
                      <Typography variant="body1" fontWeight="bold">
                        Posts
                      </Typography>
                      {canCreatePost() && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={handleCreatePost}
                        >
                          New Post
                        </Button>
                      )}
                    </Toolbar>
                  </AppBar>
                  
                  {posts && posts.length === 0 ? (
                    <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                      No posts in this community yet.
                    </Typography>
                  ) : (
                    <Box>
                      {posts && posts.map((post) => (
                        <Box 
                          key={post._id} 
                          sx={{ 
                            p: 2, 
                            borderBottom: '1px solid #f0f0f0',
                            '&:hover': {
                              bgcolor: '#f9f9f9',
                              cursor: 'pointer'
                            }
                          }}
                          onClick={() => navigate(`/post/${post._id}`)}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            {post.image ? (
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                  Posted by u/{post.author?.username}
                                </Typography>
                                <Typography variant="h6" gutterBottom>
                                  {post.title}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    mb: 2,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {post.content}
                                </Typography>
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Chip 
                                    icon={<ThumbUpOutlinedIcon fontSize="small" />} 
                                    label={post.likes?.length || 0} 
                                    variant="outlined" 
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/post/${post._id}`);
                                    }}
                                  />
                                  <Chip 
                                    icon={<CommentIcon fontSize="small" />} 
                                    label={post.comments?.length || 0} 
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/post/${post._id}`);
                                    }}
                                  />
                                  <Button
                                    size="small"
                                    sx={{ ml: 'auto' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/post/${post._id}`);
                                    }}
                                  >
                                    Read More
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', width: '100%' }}>
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                    Posted by u/{post.author?.username}
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    {post.title}
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      mb: 2,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {post.content}
                                  </Typography>
                                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Chip 
                                      icon={<ThumbUpOutlinedIcon fontSize="small" />} 
                                      label={post.likes?.length || 0} 
                                      variant="outlined" 
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/post/${post._id}`);
                                      }}
                                    />
                                    <Chip 
                                      icon={<CommentIcon fontSize="small" />} 
                                      label={post.comments?.length || 0} 
                                      variant="outlined"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/post/${post._id}`);
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      sx={{ ml: 'auto' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/post/${post._id}`);
                                      }}
                                    >
                                      Read More
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            )}
                            
                            {post.image && (
                              <Box sx={{ ml: 2, flexShrink: 0 }}>
                                <img 
                                  src={post.image} 
                                  alt={post.title} 
                                  style={{ 
                                    width: '120px', 
                                    height: '120px', 
                                    objectFit: 'cover',
                                    borderRadius: '4px' 
                                  }} 
                                />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              {/* Sidebar */}
              <Grid item xs={12} md={4}>
                {/* About Community */}
                <Paper sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="h6">About Community</Typography>
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" paragraph>
                      {community.description}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>{community.membersCount || community.members?.length || 0}</strong> Members
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Type:</strong> {community.privacy === 'public' ? 'Public' : 'Read-only'}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {isAdmin && (
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => navigate(`/manage-community/${communityId}`)}
                          startIcon={<InfoIcon />}
                        >
                          Manage Community
                        </Button>
                      )}
                      
                      {canCreatePost() && (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={handleCreatePost}
                          startIcon={<AddIcon />}
                        >
                          Create Post
                        </Button>
                      )}
                      
                      {isMember && !isAuthor && (
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          onClick={() => setLeaveDialogOpen(true)}
                          startIcon={<ExitToAppIcon />}
                          sx={{ mt: 1 }}
                        >
                          Leave Community
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
                
                {/* Community Tags */}
                {community.tags && community.tags.length > 0 && (
                  <Paper sx={{ mb: 3 }}>
                    <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                      <Typography variant="h6">Community Tags</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {community.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                )}
                
                {/* Community Members */}
                <Paper sx={{ mb: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Members</Typography>
                    {isAdmin && (
                      <Button 
                        variant="outlined" 
                        color="inherit" 
                        size="small"
                        onClick={() => navigate(`/manage-community/${communityId}`)}
                        sx={{ 
                          fontSize: '0.7rem', 
                          border: '1px solid rgba(255,255,255,0.5)', 
                          '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } 
                        }}
                      >
                        Manage
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>{community.membersCount || community.members?.length || 0}</strong> total members
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>{community.admins?.length || 1}</strong> administrators
                    </Typography>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: 'column' }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        size="small"
                        onClick={handleViewMembers}
                        startIcon={<PeopleIcon />}
                      >
                        View Members
                      </Button>
                      
                      {isAuthor && (
                        <Button
                          variant="outlined"
                          fullWidth
                          color="primary"
                          size="small"
                          onClick={() => navigate(`/manage-community/${communityId}`)}
                        >
                          Manage Members
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Container>
          
          {/* Community Menu */}
          <Menu
            anchorEl={menuAnchorEl}
            open={openMenu}
            onClose={handleMenuClose}
          >
            {(isAdmin || isAuthor) && (
              <MenuItem onClick={() => {
                handleMenuClose();
                navigate(`/manage-community/${communityId}`);
              }}>
                <ListItemIcon>
                  <InfoIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Manage Community</ListItemText>
              </MenuItem>
            )}
            {(isAdmin || isAuthor) && (
              <MenuItem onClick={() => {
                handleMenuClose();
                navigate(`/manage-community/${communityId}`);
              }}>
                <ListItemIcon>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Manage Members</ListItemText>
              </MenuItem>
            )}
            {isAuthor && (
              <MenuItem onClick={() => {
                handleMenuClose();
                setDeleteDialogOpen(true);
              }}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText primary="Delete Community" primaryTypographyProps={{ color: 'error' }} />
              </MenuItem>
            )}
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <InfoIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Community Info</ListItemText>
            </MenuItem>
            {!isAuthor && (
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <FlagIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Report Community</ListItemText>
              </MenuItem>
            )}
          </Menu>
          
          {/* Members Dialog */}
          <Dialog 
            open={membersDialogOpen} 
            onClose={() => setMembersDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Community Members ({communityMembers.length})
            </DialogTitle>
            <DialogContent dividers>
              {communityMembers.length === 0 ? (
                <Typography color="textSecondary" align="center">Loading members...</Typography>
              ) : (
                <List>
                  {communityMembers.map((member) => {
                    const isMemberAuthor = member._id === community.authorId;
                    const isMemberAdmin = member.isAdmin || community.admins?.includes(member._id);
                    const isCurrentUserMember = currentUser && member._id === currentUser._id;
                    const friendRequestStatus = friendRequests[member._id];
                    
                    return (
                      <ListItem 
                        key={member._id}
                        divider
                        secondaryAction={
                          !isCurrentUserMember && (
                            <IconButton
                              edge="end"
                              color={friendRequestStatus === 'pending' ? 'success' : 'primary'}
                              onClick={(e) => handleFriendRequest(member._id, e)}
                              disabled={friendRequestStatus === 'pending'}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              {friendRequestStatus === 'pending' ? <CheckIcon /> : <PersonAddIcon />}
                            </IconButton>
                          )
                        }
                        onClick={() => navigate(`/profile/${member._id}`)}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            src={member.avatar} 
                            alt={member.username}
                          >
                            {member.username?.[0]?.toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography>
                                {member.username}
                              </Typography>
                              {isCurrentUserMember && (
                                <Chip size="small" label="You" sx={{ ml: 1 }} />
                              )}
                              {isMemberAuthor && (
                                <Chip size="small" color="primary" label="Author" sx={{ ml: 1 }} />
                              )}
                              {isMemberAdmin && !isMemberAuthor && (
                                <Chip size="small" color="secondary" label="Admin" sx={{ ml: 1 }} />
                              )}
                              {friendRequestStatus === 'pending' && (
                                <Chip size="small" color="success" label="Request Sent" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="textSecondary">
                              {member.firstname} {member.lastname}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMembersDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Friend Request Success Snackbar */}
          <Snackbar
            open={requestSent}
            autoHideDuration={3000}
            onClose={() => setRequestSent(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              severity="success" 
              onClose={() => setRequestSent(false)}
              sx={{ width: '100%' }}
            >
              Friend request sent successfully!
            </Alert>
          </Snackbar>

          {/* Success and Error Snackbars */}
          <Snackbar
            open={openSuccess}
            autoHideDuration={6000}
            onClose={() => setOpenSuccess(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={() => setOpenSuccess(false)} severity="success">
              {successMessage}
            </Alert>
          </Snackbar>

          <Snackbar
            open={openError}
            autoHideDuration={6000}
            onClose={() => setOpenError(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={() => setOpenError(false)} severity="error">
              {error}
            </Alert>
          </Snackbar>
        </>
      )}
    </div>
  );
}

export default CommunityPage;