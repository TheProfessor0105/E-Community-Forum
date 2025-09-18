import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Box,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  TextField,
  IconButton,
  Badge,
  Tooltip,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import FriendshipButton from '../components/FriendshipButton';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import ArticleIcon from '@mui/icons-material/Article';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getBestToken, getAuthHeaders, authFetch } from '../utils/authUtils';

// Custom styled components
const ProfileBanner = styled(Box)(({ theme }) => ({
  height: '200px',
  backgroundColor: theme.palette.primary.main,
  position: 'relative',
  borderRadius: '8px 8px 0 0',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${theme.palette.background.paper}`,
  position: 'absolute',
  bottom: '-60px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1,
}));

const ProfileTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: '1px solid #e0e0e0',
  marginBottom: theme.spacing(2),
}));

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // New state variables
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friendRequestReceived, setFriendRequestReceived] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalCommunities: 0,
    totalFriends: 0
  });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFriendDialog, setShowFriendDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const isOwnProfile = currentUser && userId === currentUser._id;
  const isAuthenticated = !!getBestToken(token);

  useEffect(() => {
    if (!userId || !token || !isAuthenticated) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await authFetch(`/api/users/${userId}`, { method: 'GET' }, token);
        
        // Handle both direct and wrapped response formats
        let userData;
        if (result.success && result.data) {
          userData = result.data;
        } else if (result._id) {
          userData = result;
        } else {
          console.error('Error fetching user data: Invalid response format');
          setError('Failed to load user data');
          return;
        }
        
        setUser(userData);
        setBioText(userData.about || '');
        setFirstName(userData.firstname || '');
        setLastName(userData.lastname || '');
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserPosts = async () => {
      try {
        const result = await authFetch(`/api/posts/user/${userId}`, { method: 'GET' }, token);
        
        // Handle both direct and wrapped response formats
        let postsData;
        if (result.success && result.data) {
          postsData = result.data;
        } else if (Array.isArray(result)) {
          postsData = result;
        } else {
          console.error('Error fetching user posts: Invalid response format');
          postsData = [];
        }
        
        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching user posts:', error);
        setPosts([]);
      }
    };

    const fetchUserCommunities = async () => {
      try {
        const result = await authFetch(`/api/communities/user/${userId}`, { method: 'GET' }, token);
        
        // Handle both direct and wrapped response formats
        let communitiesData;
        if (result.success && result.data) {
          communitiesData = result.data;
        } else if (Array.isArray(result)) {
          communitiesData = result;
        } else {
          console.error('Error fetching user communities: Invalid response format');
          communitiesData = [];
        }
        
        setCommunities(communitiesData);
      } catch (error) {
        console.error('Error fetching user communities:', error);
        setCommunities([]);
      }
    };

    // Fetch friends data
    const fetchFriendData = async () => {
      try {
        // Fetch user's friends
        const friendsResponse = await fetch(`/api/friendship/friends/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          setFriends(friendsData.friends);
        }

        // Fetch friend requests if it's own profile
        if (isOwnProfile) {
          const requestsResponse = await fetch('/api/friendship/requests', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            setFriendRequests(requestsData.receivedRequests);
          }
        }
      } catch (error) {
        console.error('Error fetching friend data:', error);
      }
    };

    // Simplified activity fetching
    const fetchActivity = async () => {
      try {
        // For now, create basic activity from posts
        const basicActivity = posts.slice(0, 5).map(post => ({
          type: 'post',
          title: `Created a post: ${post.title}`,
          description: post.content?.substring(0, 50) + '...',
          timestamp: post.createdAt,
          link: `/post/${post._id}`
        }));
        setActivity(basicActivity);
      } catch (error) {
        console.error('Error fetching activity:', error);
      }
    };

    const loadAllData = async () => {
      await fetchUserData();
      await fetchUserPosts();
      await fetchUserCommunities();
      await fetchFriendData();
      await fetchActivity();
    };

    loadAllData();
  }, [userId, token, isAuthenticated, isOwnProfile]);

  // Fetch friends data
  const fetchFriendData = async () => {
    try {
      // Fetch user's friends
      const friendsResponse = await fetch(`/api/friendship/friends/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.friends);
      }

      // Fetch friend requests if it's own profile
      if (isOwnProfile) {
        const requestsResponse = await fetch('/api/friendship/requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json();
          setFriendRequests(requestsData.receivedRequests);
        }
      }
    } catch (error) {
      console.error('Error fetching friend data:', error);
    }
  };

  // Calculate stats when data changes
  useEffect(() => {
    const calculateStats = () => {
      const calculatedStats = {
        totalPosts: posts.length,
        totalCommunities: communities.length,
        totalFriends: user?.friendsCount || friends.length
      };
      
      setStats(calculatedStats);
    };

    calculateStats();
  }, [posts, communities, friends, user]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditBio = () => {
    setIsEditing(true);
  };

  const handleSaveBio = async () => {
    if (!getBestToken(token)) return;
    
    setSavingBio(true);
    try {
      const result = await authFetch(
        `/api/users/${userId}`, 
        {
          method: 'PUT',
          body: JSON.stringify({
            about: bioText,
            firstname: firstName,
            lastname: lastName
          })
        }, 
        token
      );
      
      // Handle both direct and wrapped response formats
      let updatedUser;
      if (result.success && result.data) {
        updatedUser = result.data;
      } else if (result._id) {
        updatedUser = result;
      } else {
        console.error('Error updating user bio: Invalid response format');
        return;
      }
      
      setUser(updatedUser);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      console.log('Bio updated successfully');
    } catch (error) {
      console.error('Error updating user bio:', error);
    } finally {
      setSavingBio(false);
    }
  };

  const handleEditName = () => {
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!getBestToken(token)) return;
    
    setSavingName(true);
    try {
      const result = await authFetch(
        `/api/users/${userId}`, 
        {
          method: 'PUT',
          body: JSON.stringify({
            firstname: firstName,
            lastname: lastName,
            about: user.about || ''
          })
        }, 
        token
      );
      
      // Handle both direct and wrapped response formats
      let updatedUser;
      if (result.success && result.data) {
        updatedUser = result.data;
      } else if (result._id) {
        updatedUser = result;
      } else {
        console.error('Error updating user name: Invalid response format');
        return;
      }
      
      setUser(updatedUser);
      setIsEditingName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      console.log('Name updated successfully');
    } catch (error) {
      console.error('Error updating user name:', error);
    } finally {
      setSavingName(false);
    }
  };

  // Friend system functions
  const handleSendFriendRequest = async () => {
    if (!isAuthenticated) return;
    
    try {
      const result = await authFetch(
        '/api/users/send-friend-request',
        {
          method: 'POST',
          body: JSON.stringify({
            receiverId: userId
          })
        },
        token
      );
      
      if (result.success) {
        setFriendRequestSent(true);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!isAuthenticated) return;
    
    try {
      const result = await authFetch(
        '/api/users/accept-friend',
        {
          method: 'POST',
          body: JSON.stringify({
            senderId: userId
          })
        },
        token
      );
      
      if (result.success) {
        setIsFriend(true);
        setFriendRequestReceived(false);
        setFriendRequestSent(false);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!isAuthenticated) return;
    
    try {
      const result = await authFetch(
        '/api/users/reject-friend',
        {
          method: 'POST',
          body: JSON.stringify({
            senderId: userId
          })
        },
        token
      );
      
      if (result.success) {
        setFriendRequestReceived(false);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!isAuthenticated) return;
    
    try {
      const result = await authFetch(
        '/api/users/remove-friend',
        {
          method: 'POST',
          body: JSON.stringify({
            friendId: userId
          })
        },
        token
      );
      
      if (result.success) {
        setIsFriend(false);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleShareProfile = () => {
    setShowShareDialog(true);
  };

  const handleAvatarChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
      uploadProfileImage(event.target.files[0], 'avatar');
    }
  };

  const handleCoverChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImageFile(event.target.files[0]);
      uploadProfileImage(event.target.files[0], 'cover');
    }
  };

  const uploadProfileImage = async (file, type = 'avatar') => {
    if (!getBestToken(token) || !file) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    
    console.log('Uploading image:', { type, fileName: file.name, fileSize: file.size });
    
    try {
      const result = await authFetch(
        '/api/users/upload-image', 
        {
          method: 'POST',
          body: formData
        }, 
        token
      );
      
      console.log('Upload result:', result);
      
      if (result.success) {
        setUser(result.data.user);
        console.log('Image uploaded successfully');
      } else {
        console.error('Error uploading profile image:', result.message);
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                User not found
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                onClick={() => navigate('/')}
              >
                Go Home
              </Button>
            </Box>
          )}
        </Container>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Profile updated successfully!
          </Alert>
        )}
        <Paper elevation={2} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
          {/* Banner and Avatar */}
          <ProfileBanner sx={{ 
            backgroundImage: user.coverPicture ? `url(${user.coverPicture})` : 'none'
          }}>
            {isAuthenticated && isOwnProfile && (
              <Box sx={{ position: 'absolute', right: 16, top: 16 }}>
                <input
                  accept="image/*"
                  id="icon-button-cover"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleCoverChange}
                />
                <label htmlFor="icon-button-cover">
                  <IconButton 
                    component="span" 
                    disabled={uploadingImage}
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                    }}
                  >
                    {uploadingImage ? <CircularProgress size={24} /> : <PhotoCameraIcon />}
                  </IconButton>
                </label>
              </Box>
            )}
          </ProfileBanner>
          
          {/* Profile Content */}
          <Box sx={{ position: 'relative', mb: 8 }}>
            <ProfileAvatar 
              src={user.avatar}
              alt={user.username}
            >
              {user.username && user.username[0]?.toUpperCase()}
            </ProfileAvatar>
            
            {isAuthenticated && isOwnProfile && (
              <Box sx={{ position: 'absolute', bottom: -70, left: '50%', transform: 'translateX(-50%)' }}>
                <input
                  accept="image/*"
                  id="icon-button-avatar"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <label htmlFor="icon-button-avatar">
                  <IconButton 
                    component="span" 
                    size="small"
                    disabled={uploadingImage}
                    sx={{ 
                      bgcolor: 'rgba(0, 0, 0, 0.1)',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.2)' }
                    }}
                  >
                    {uploadingImage ? <CircularProgress size={20} /> : <PhotoCameraIcon fontSize="small" />}
                  </IconButton>
                </label>
              </Box>
            )}
          </Box>
          
          {/* User Info */}
          <Box sx={{ px: 4, py: 2, textAlign: 'center' }}>
            {isEditingName ? (
              <Box sx={{ maxWidth: '400px', mx: 'auto', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="First Name"
                    variant="outlined"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Last Name"
                    variant="outlined"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setIsEditingName(false);
                      setFirstName(user.firstname || '');
                      setLastName(user.lastname || '');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? <CircularProgress size={24} /> : 'Save'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ position: 'relative' }}>
                <Typography variant="h4" gutterBottom>
                  {user.firstname} {user.lastname}
                </Typography>
                {isAuthenticated && isOwnProfile && (
                  <IconButton 
                    size="small" 
                    onClick={handleEditName}
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 0,
                      transform: 'translateX(100%)'
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            )}
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              @{user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Member since {formatDate(user.createdAt)}
            </Typography>
            
            {/* Friend Status and Actions */}
            {isAuthenticated && !isOwnProfile && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FriendshipButton 
                  targetUserId={userId}
                  onFriendshipChange={fetchFriendData}
                />
                
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={handleShareProfile}
                  startIcon={<ShareIcon />}
                >
                  Share
                </Button>
              </Box>
            )}
            
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {stats.totalPosts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Posts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {stats.totalCommunities}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Communities
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error" fontWeight="bold">
                    {stats.totalFriends}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Friends
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {/* Bio Section */}
            <Box sx={{ mt: 3, mb: 2, maxWidth: '600px', mx: 'auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <Typography variant="h6" component="div">
                  Bio
                </Typography>
                {isAuthenticated && isOwnProfile && !isEditing && (
                  <IconButton size="small" onClick={handleEditBio} sx={{ ml: 1 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              
              {isEditing ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Write something about yourself..."
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => {
                        setIsEditing(false);
                        setBioText(user.about || '');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      onClick={handleSaveBio}
                      disabled={savingBio}
                    >
                      {savingBio ? <CircularProgress size={24} /> : 'Save'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ px: 2 }}>
                  {user.about || 'No bio provided yet.'}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Divider />
          
          {/* Tabs */}
          <Box sx={{ px: 2 }}>
            <ProfileTabs 
              value={tabValue} 
              onChange={handleTabChange} 
              centered
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label={isOwnProfile ? "My Posts" : `${user.username}'s Posts`} />
              <Tab label={isOwnProfile ? "My Communities" : `${user.username}'s Communities`} />
              <Tab label="Friends" />
              <Tab label="Activity" />
            </ProfileTabs>
            
            {/* My Posts Tab */}
            <TabPanel value={tabValue} index={0}>
              {posts.length === 0 ? (
                <Typography variant="body1" color="text.secondary" align="center">
                  {isOwnProfile 
                    ? "You haven't created any posts yet." 
                    : `${user.username} hasn't created any posts yet.`}
                </Typography>
              ) : (
                <Grid container spacing={3}>
                  {posts.map((post) => (
                    <Grid item xs={12} sm={6} md={6} lg={4} key={post._id}>
                      <Card 
                        elevation={1}
                        onClick={() => navigate(`/post/${post._id}`)}
                        sx={{ 
                          cursor: 'pointer', 
                          transition: '0.3s',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          },
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        {post.image ? (
                          <CardMedia
                            component="img"
                            sx={{
                              height: 220,
                              objectFit: 'cover',
                              objectPosition: 'center',
                              borderBottom: '1px solid rgba(0,0,0,0.08)'
                            }}
                            image={post.image}
                            alt={post.title}
                          />
                        ) : (
                          <Box 
                            sx={{ 
                              height: 15,
                              bgcolor: 'primary.light',
                              opacity: 0.3
                            }} 
                          />
                        )}
                        
                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                          <Typography variant="h6" gutterBottom noWrap>
                            {post.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {isOwnProfile 
                              ? `Posted in ${post.community?.name} • ${formatDate(post.createdAt)}`
                              : `Posted in ${post.community?.name} • ${formatDate(post.createdAt)}`
                            }
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            mt: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            height: '4.5em'
                          }}>
                            {post.content}
                          </Typography>
                        </CardContent>
                        
                        <CardActions>
                          <Tooltip title="Likes">
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                              {isAuthenticated && post.likes?.includes(currentUser?._id) ? 
                                <ThumbUpIcon fontSize="small" color="primary" /> : 
                                <ThumbUpOutlinedIcon fontSize="small" />
                              }
                              <Typography variant="body2" sx={{ ml: 0.5 }}>
                                {post.likes?.length || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                          
                          <Tooltip title="Comments">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CommentIcon fontSize="small" />
                              <Typography variant="body2" sx={{ ml: 0.5 }}>
                                {post.commentCount || post.comments?.length || 0}
                              </Typography>
                            </Box>
                          </Tooltip>
                          
                          <Button 
                            size="small" 
                            sx={{ ml: 'auto' }}
                          >
                            Read More
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>
            
            {/* My Communities Tab */}
            <TabPanel value={tabValue} index={1}>
              {communities.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {isOwnProfile 
                      ? "You haven't joined any communities yet." 
                      : `${user.username} hasn't joined any communities yet.`}
                  </Typography>
                  {isOwnProfile && (
                    <Button 
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/explore')}
                    >
                      Explore Communities
                    </Button>
                  )}
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {communities.map((community) => (
                    <Grid item xs={12} sm={6} md={4} key={community._id}>
                      <Card 
                        elevation={1}
                        onClick={() => navigate(`/community/${community._id}`)}
                        sx={{ 
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: '0.3s',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                      >
                        <CardMedia
                          component="img"
                          sx={{
                            height: 160,
                            objectFit: 'cover',
                            objectPosition: 'center',
                            borderBottom: '1px solid rgba(0,0,0,0.08)'
                          }}
                          image={community.image || 'https://source.unsplash.com/random?community'}
                          alt={community.name}
                        />
                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                          <Typography variant="h6" gutterBottom noWrap>
                            {community.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            height: '4.5em',
                            mb: 1
                          }}>
                            {community.description || 'No description available.'}
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {community.membersCount || 0} members
                            </Typography>
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small"
                            fullWidth
                            variant="text"
                            color="primary"
                          >
                            View Community
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>
            
            {/* Friends Tab */}
            <TabPanel value={tabValue} index={2}>
              {friends.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    {isOwnProfile 
                      ? "You don't have any friends yet." 
                      : `${user.username} doesn't have any friends yet.`}
                  </Typography>
                  {isOwnProfile && (
                    <Button 
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/friends')}
                    >
                      Manage Friends
                    </Button>
                  )}
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {friends.map((friend) => (
                    <Grid item xs={12} sm={6} md={4} key={friend._id}>
                      <Card 
                        elevation={1}
                        onClick={() => navigate(`/profile/${friend._id}`)}
                        sx={{ 
                          cursor: 'pointer',
                          transition: '0.3s',
                          '&:hover': { 
                            transform: 'translateY(-2px)',
                            boxShadow: 2
                          }
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                          <Avatar 
                            src={friend.avatar} 
                            alt={friend.username}
                            sx={{ width: 56, height: 56, mr: 2 }}
                          >
                            {friend.username && friend.username[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" noWrap>
                              {friend.firstname} {friend.lastname}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              @{friend.username}
                            </Typography>
                            {friend.about && (
                              <Typography variant="caption" color="text.secondary" sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {friend.about}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>
            
            {/* Activity Tab */}
            <TabPanel value={tabValue} index={3}>
              {activity.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    {isOwnProfile 
                      ? "No recent activity to display." 
                      : `${user.username} has no recent activity.`}
                  </Typography>
                </Box>
              ) : (
                <List>
                  {activity.map((item, index) => (
                    <ListItem key={index} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                      <ListItemAvatar>
                        <Avatar src={item.icon || user.avatar}>
                          {item.type === 'post' && <ArticleIcon />}
                          {item.type === 'like' && <ThumbUpIcon />}
                          {item.type === 'comment' && <CommentIcon />}
                          {item.type === 'community' && <GroupsIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={item.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {item.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(item.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                      {item.action && (
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => {
                            if (item.link) navigate(item.link);
                          }}
                        >
                          {item.action}
                        </Button>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </TabPanel>
          </Box>
        </Paper>
      </Container>
      
      {/* Friends Dialog */}
      <Dialog 
        open={showFriendDialog} 
        onClose={() => setShowFriendDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {user.username}'s Friends ({friends.length})
        </DialogTitle>
        <DialogContent>
          {friends.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No friends to display.
            </Typography>
          ) : (
            <List>
              {friends.map((friend) => (
                <ListItem key={friend._id} button onClick={() => navigate(`/profile/${friend._id}`)}>
                  <ListItemAvatar>
                    <Avatar src={friend.avatar} alt={friend.username}>
                      {friend.username && friend.username[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${friend.firstname} ${friend.lastname}`}
                    secondary={`@${friend.username}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFriendDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Share Profile Dialog */}
      <Dialog 
        open={showShareDialog} 
        onClose={() => setShowShareDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Share Profile
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Share {user.firstname}'s profile with others:
          </Typography>
          <TextField
            fullWidth
            value={window.location.href}
            variant="outlined"
            margin="dense"
            InputProps={{
              readOnly: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setShowShareDialog(false);
          }}>
            Copy Link
          </Button>
          <Button onClick={() => setShowShareDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Floating Action Button for Quick Actions */}
      {isAuthenticated && !isOwnProfile && (
        <SpeedDial
          ariaLabel="Profile actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<PersonAddIcon />}
            tooltipTitle={isFriend ? "Remove Friend" : "Add Friend"}
            onClick={isFriend ? handleRemoveFriend : handleSendFriendRequest}
          />
          <SpeedDialAction
            icon={<ShareIcon />}
            tooltipTitle="Share Profile"
            onClick={handleShareProfile}
          />
          <SpeedDialAction
            icon={<PeopleIcon />}
            tooltipTitle="View Friends"
            onClick={() => setShowFriendDialog(true)}
          />
        </SpeedDial>
      )}
    </>
  );
}

export default Profile;