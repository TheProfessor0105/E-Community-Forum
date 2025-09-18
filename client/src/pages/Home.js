import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Avatar,
  Divider,
  Box,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Paper,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const currentUser = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  
  // State for post actions
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [communityAdmins, setCommunityAdmins] = useState({});
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    // Get tag from URL if available
    const params = new URLSearchParams(location.search);
    const tagParam = params.get('tag');
    if (tagParam) {
      setActiveTag(decodeURIComponent(tagParam));
    } else {
      setActiveTag(null);
    }

    // Fetch posts
    const fetchPosts = async () => {
      try {
        console.log('Fetching posts...');
        const response = await fetch('/api/posts');
        const data = await response.json();
        if (response.ok) {
          console.log(`Received ${data.length} posts from server`);
          // Log post images
          data.forEach((post, index) => {
            console.log(`Post ${index + 1}: ${post.title}, Has Image: ${!!post.image}`);
            if (post.image) {
              console.log(`- Image URL: ${post.image}`);
            }
            
            // Log tags if available
            if (post.tags && post.tags.length > 0) {
              console.log(`- Tags: ${post.tags.join(', ')}`);
            }
          });
          setPosts(data);
          
          // For each post, fetch the community admin info if needed
          if (currentUser) {
            data.forEach(post => {
              if (post.community && post.community._id) {
                fetchCommunityAdmins(post.community._id);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    // Fetch communities
    const fetchCommunities = async () => {
      try {
        const response = await fetch('/api/communities');
        const data = await response.json();
        if (response.ok) {
          setCommunities(data);
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
      }
    };

    fetchPosts();
    fetchCommunities();
  }, [currentUser, location.search]);
  
  // Filter posts when posts or active tag changes
  useEffect(() => {
    if (activeTag) {
      const filtered = posts.filter(post => 
        post.tags && post.tags.some(tag => tag === activeTag)
      );
      setFilteredPosts(filtered);
      console.log(`Filtered to ${filtered.length} posts with tag ${activeTag}`);
    } else {
      setFilteredPosts(posts);
    }
  }, [posts, activeTag]);
  
  // Fetch community admins to check permissions
  const fetchCommunityAdmins = async (communityId) => {
    if (communityAdmins[communityId]) return; // Already fetched
    
    try {
      const response = await fetch(`/api/communities/${communityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommunityAdmins(prev => ({
          ...prev,
          [communityId]: {
            admins: data.admins || [],
            authorId: data.authorId
          }
        }));
      }
    } catch (error) {
      console.error(`Error fetching community ${communityId} admins:`, error);
    }
  };

  // Handle tag click
  const handleTagClick = (tag) => {
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  };
  
  // Clear active tag filter
  const clearTagFilter = () => {
    navigate('/');
  };

  // Function to handle likes
  const handleLike = async (postId) => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the posts state with the updated post
        setPosts(posts.map(post => post._id === postId ? updatedPost : post));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Function to handle dislikes
  const handleDislike = async (postId) => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/dislike`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedPost = await response.json();
        // Update the posts state with the updated post
        setPosts(posts.map(post => post._id === postId ? updatedPost : post));
      }
    } catch (error) {
      console.error('Error disliking post:', error);
    }
  };
  
  // Menu handlers
  const handleMenuOpen = (event, post) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPost(post);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPost(null);
  };
  
  // Edit post
  const handleEditPost = () => {
    if (selectedPost) {
      navigate(`/post/${selectedPost._id}`);
    }
    handleMenuClose();
  };
  
  // Delete dialog handlers
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedPost(null);
  };
  
  // Delete post
  const handleDeletePost = async () => {
    if (!selectedPost) return;
    
    try {
      const response = await fetch(`/api/posts/${selectedPost._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove post from state
        setPosts(posts.filter(post => post._id !== selectedPost._id));
        console.log('Post deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
    
    handleDeleteDialogClose();
  };
  
  // Check if current user can modify (edit/delete) a post
  const canModifyPost = (post) => {
    if (!currentUser || !post) return false;
    
    // User is the post author
    const isPostAuthor = post.author && post.author._id === currentUser._id;
    if (isPostAuthor) return true;
    
    // Check if user is a community admin
    if (post.community && communityAdmins[post.community._id]) {
      const { admins, authorId } = communityAdmins[post.community._id];
      return admins.includes(currentUser._id) || authorId === currentUser._id;
    }
    
    return false;
  };

  // Format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if user has liked or disliked a post
  const hasLikedPost = (post) => post.likes && currentUser && post.likes.includes(currentUser._id);
  const hasDislikedPost = (post) => post.dislikes && currentUser && post.dislikes.includes(currentUser._id);

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {activeTag && (
          <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Showing posts tagged with: <Chip label={activeTag} color="primary" />
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<CloseIcon />} 
              onClick={clearTagFilter}
            >
              Clear Filter
            </Button>
          </Paper>
        )}
      
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {filteredPosts.length === 0 ? (
              <Typography variant="h6" align="center" sx={{ mt: 4, color: 'text.secondary' }}>
                {activeTag ? `No posts found with tag ${activeTag}` : 'No posts found'}
              </Typography>
            ) : (
              filteredPosts.map((post) => {
                // For debugging
                console.log(`Rendering post: ${post.title}, image: ${!!post.image}`);
                
                return (
                  <Card key={post._id} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                    {/* Post Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                      <Avatar 
                        src={post.author?.avatar}
                        alt={post.author?.username}
                        onClick={() => navigate(`/profile/${post.author?._id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        {post.author?.username?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box sx={{ ml: 1.5 }}>
                        <Typography 
                          variant="subtitle2" 
                          onClick={() => navigate(`/profile/${post.author?._id}`)}
                          sx={{ cursor: 'pointer' }}
                        >
                          {post.author?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Posted in {' '}
                          <span 
                            style={{ cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => navigate(`/community/${post.community?._id}`)}
                          >
                            {post.community?.name}
                          </span>
                          {' • '}{formatDate(post.createdAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        {canModifyPost(post) && (
                          <IconButton 
                            size="small" 
                            onClick={(event) => handleMenuOpen(event, post)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                    
                    {/* Post Content */}
                    <CardContent sx={{ py: 1 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom
                        onClick={() => navigate(`/post/${post._id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        {post.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {post.content}
                      </Typography>
                      
                      {/* Tags display */}
                      {post.tags && post.tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {post.tags.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              color={tag === activeTag ? "primary" : "default"}
                              clickable
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTagClick(tag);
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                    
                    {/* Post Image - Only show if image exists */}
                    {post.image && (
                      <Box
                        onClick={() => navigate(`/post/${post._id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <CardMedia
                          component="img"
                          height="250"
                          image={post.image}
                          alt={post.title}
                          sx={{ objectFit: 'cover' }}
                        />
                      </Box>
                    )}
                    
                    {/* Post Actions */}
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Tooltip title="Like">
                        <IconButton 
                          size="small"
                          onClick={() => handleLike(post._id)}
                          color={hasLikedPost(post) ? 'primary' : 'default'}
                        >
                          <Badge badgeContent={post.likes?.length || 0} color="primary">
                            {hasLikedPost(post) ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                          </Badge>
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Dislike">
                        <IconButton 
                          size="small"
                          onClick={() => handleDislike(post._id)}
                          color={hasDislikedPost(post) ? 'error' : 'default'}
                        >
                          <Badge badgeContent={post.dislikes?.length || 0} color="error">
                            {hasDislikedPost(post) ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
                          </Badge>
                        </IconButton>
                      </Tooltip>
                      
                      <Button 
                        size="small" 
                        startIcon={<CommentIcon />}
                        onClick={() => navigate(`/post/${post._id}`)}
                      >
                        Comments
                      </Button>
                      
                      <Button 
                        size="small"
                        onClick={() => navigate(`/post/${post._id}`)}
                        sx={{ ml: 'auto' }}
                      >
                        Read More
                      </Button>
                    </CardActions>
                  </Card>
                );
              })
            )}
          </Grid>
          
          {/* Sidebar - Communities */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Popular Communities
                </Typography>
                <List>
                  {communities && communities.length > 0 ? (
                    communities.map((community) => (
                      <React.Fragment key={community._id}>
                        <ListItem
                          button
                          onClick={() =>
                            navigate(`/community/${community._id}`)
                          }
                        >
                          <ListItemAvatar>
                            <Avatar src={community.image}>
                              {community.name && community.name[0].toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={community.name}
                            secondary={`${community.membersCount || 0} members`}
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      No communities available.
                    </Typography>
                  )}
                </List>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate('/create-community')}
                  >
                    Create Community
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      
      {/* Post Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditPost}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Post</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteDialogOpen}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Post</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeletePost} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Home; 