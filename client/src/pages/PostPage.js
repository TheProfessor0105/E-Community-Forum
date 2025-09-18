import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Avatar,
  Box,
  TextField,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Badge,
  Tooltip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  ListItemIcon,
  Chip,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import CommentIcon from '@mui/icons-material/Comment';
import ReplyIcon from '@mui/icons-material/Reply';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';

function PostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedComments, setExpandedComments] = useState({});
  
  // Add states for post actions
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isCommunityAdmin, setIsCommunityAdmin] = useState(false);

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setPost(data);
          setEditedTitle(data.title);
          setEditedContent(data.content);
          
          // Check if current user is a community admin
          if (data.community && currentUser) {
            const communityResponse = await fetch(`/api/communities/${data.community._id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (communityResponse.ok) {
              const communityData = await communityResponse.json();
              const isAdmin = communityData.admins && communityData.admins.includes(currentUser._id);
              const isAuthor = communityData.authorId === currentUser._id;
              setIsCommunityAdmin(isAdmin || isAuthor);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching post data:', error);
      }
    };

    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          // Organize comments into parent-child relationships
          const commentMap = {};
          const rootComments = [];
          
          // First pass: Create a map of all comments
          data.forEach(comment => {
            comment.replies = [];
            commentMap[comment._id] = comment;
          });
          
          // Second pass: Link replies to parents or add to root
          data.forEach(comment => {
            if (comment.parentComment && commentMap[comment.parentComment]) {
              commentMap[comment.parentComment].replies.push(comment);
            } else {
              rootComments.push(comment);
            }
          });
          
          setComments(rootComments);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchPostData();
    fetchComments();
  }, [postId, token, currentUser]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();
      if (response.ok) {
        // Add new comment to the list
        data.replies = [];
        setComments([...comments, data]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReplySubmit = async (commentId) => {
    if (!replyText.trim()) return;
    
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          content: replyText,
          parentComment: commentId 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Find the parent comment and add reply
        const updatedComments = [...comments];
        const addReplyToComment = (commentsArray, commentId, reply) => {
          for (let i = 0; i < commentsArray.length; i++) {
            if (commentsArray[i]._id === commentId) {
              if (!commentsArray[i].replies) {
                commentsArray[i].replies = [];
              }
              commentsArray[i].replies.push(reply);
              return true;
            }
            if (commentsArray[i].replies && commentsArray[i].replies.length > 0) {
              if (addReplyToComment(commentsArray[i].replies, commentId, reply)) {
                return true;
              }
            }
          }
          return false;
        };
        
        addReplyToComment(updatedComments, commentId, data);
        setComments(updatedComments);
        setReplyingTo(null);
        setReplyText('');
        
        // Auto-expand the comment that was replied to
        setExpandedComments({
          ...expandedComments,
          [commentId]: true
        });
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleLike = async () => {
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
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDislike = async () => {
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
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error disliking post:', error);
    }
  };

  // Format the date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if user has liked or disliked a post
  const hasLikedPost = () => post?.likes && currentUser && post.likes.includes(currentUser._id);
  const hasDislikedPost = () => post?.dislikes && currentUser && post.dislikes.includes(currentUser._id);

  const toggleReplies = (commentId) => {
    setExpandedComments({
      ...expandedComments,
      [commentId]: !expandedComments[commentId]
    });
  };

  // Handle post menu open
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // Handle post menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle post edit
  const handleEdit = () => {
    setEditMode(true);
    handleMenuClose();
  };

  // Handle post delete dialog open
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  // Handle post delete dialog close
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  // Handle post update
  const handleUpdatePost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editedTitle,
          content: editedContent,
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  // Handle post delete
  const handleDeletePost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Navigate back to the community page
        if (post.community) {
          navigate(`/community/${post.community._id}`);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Check if user can edit or delete the post
  const canModifyPost = () => {
    if (!currentUser || !post) return false;
    const isPostAuthor = post.author && post.author._id === currentUser._id;
    return isPostAuthor || isCommunityAdmin;
  };

  // Handle tag click
  const handleTagClick = (tag) => {
    // Navigate to a search page or tag-filtered page
    // For now, just navigate to home with a tag filter parameter
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  };

  const renderComment = (comment, level = 0) => (
    <React.Fragment key={comment._id}>
      <ListItem 
        alignItems="flex-start" 
        sx={{ pl: level * 4 }}
      >
        <ListItemAvatar>
          <Avatar
            src={comment.author.avatar}
            onClick={() => navigate(`/profile/${comment.author._id}`)}
            style={{ cursor: 'pointer' }}
          >
            {comment.author.username[0].toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="subtitle2"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/profile/${comment.author._id}`)}
              >
                {comment.author.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                • {formatDate(comment.createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Typography 
                variant="body2" 
                color="text.primary"
                sx={{ mt: 1, mb: 1 }}
              >
                {comment.content}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Button 
                  size="small" 
                  startIcon={<ReplyIcon />} 
                  onClick={() => {
                    setReplyingTo(replyingTo === comment._id ? null : comment._id);
                    setReplyText('');
                  }}
                >
                  Reply
                </Button>
                
                {comment.replies && comment.replies.length > 0 && (
                  <Button 
                    size="small" 
                    startIcon={<CommentIcon />} 
                    onClick={() => toggleReplies(comment._id)}
                    sx={{ ml: 2 }}
                  >
                    {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                  </Button>
                )}
              </Box>
              
              {/* Reply form */}
              {replyingTo === comment._id && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    placeholder={`Reply to ${comment.author.username}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      sx={{ mr: 1 }}
                      onClick={() => setReplyingTo(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small"
                      disabled={!replyText.trim()}
                      onClick={() => handleReplySubmit(comment._id)}
                    >
                      Reply
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <Collapse in={expandedComments[comment._id]} timeout="auto" unmountOnExit>
          <List disablePadding>
            {comment.replies.map(reply => renderComment(reply, level + 1))}
          </List>
        </Collapse>
      )}
      
      <Divider component="li" />
    </React.Fragment>
  );

  if (!post) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {post ? (
          <Paper elevation={3} sx={{ overflow: 'hidden' }}>
            {/* Post Header with Author, Time, Community */}
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={post.author?.avatar} 
                    alt={post.author?.username}
                    sx={{ width: 48, height: 48 }}
                  >
                    {post.author?.username?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${post.author?._id}`)}
                      >
                        {post.author?.username}
                      </span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Posted {formatDate(post.createdAt)} in{' '}
                      <span
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={() => post.community && navigate(`/community/${post.community._id}`)}
                      >
                        {post.community?.name}
                      </span>
                    </Typography>
                  </Box>
                </Box>
                {canModifyPost() && (
                  <>
                    <IconButton onClick={handleMenuOpen}>
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={menuAnchorEl}
                      open={Boolean(menuAnchorEl)}
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={() => {
                        handleMenuClose();
                        handleEdit();
                      }}>
                        <ListItemIcon>
                          <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Edit Post" />
                      </MenuItem>
                      <MenuItem onClick={() => {
                        handleMenuClose();
                        handleDeleteDialogOpen();
                      }}>
                        <ListItemIcon>
                          <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText primary="Delete Post" primaryTypographyProps={{ color: 'error' }} />
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Box>
              
              {/* Post Title and Content */}
              <Box sx={{ mt: 3 }}>
                {editMode ? (
                  <>
                    <TextField
                      fullWidth
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      variant="outlined"
                      margin="normal"
                      label="Title"
                    />
                    <TextField
                      fullWidth
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      variant="outlined"
                      margin="normal"
                      label="Content"
                      multiline
                      rows={8}
                    />
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleUpdatePost}
                      >
                        Save Changes
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => {
                          setEditMode(false);
                          setEditedTitle(post.title);
                          setEditedContent(post.content);
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="h4" gutterBottom>
                      {post.title}
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {post.content}
                    </Typography>
                    
                    {/* Tags section */}
                    {post.tags && post.tags.length > 0 && (
                      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {post.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            variant="outlined"
                            color="primary"
                            clickable
                            onClick={() => handleTagClick(tag)}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                    
                    {/* Post Image */}
                    {post.image && (
                      <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '500px',
                            borderRadius: '8px'
                          }} 
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
            
            {/* Post Actions: Like, Dislike, Comment */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#f9f9f9', borderTop: '1px solid #eee' }}>
              <Tooltip title="Like">
                <IconButton
                  color={hasLikedPost() ? 'primary' : 'default'}
                  onClick={handleLike}
                >
                  <Badge badgeContent={post.likes?.length || 0} color="primary">
                    {hasLikedPost() ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Dislike">
                <IconButton
                  color={hasDislikedPost() ? 'error' : 'default'}
                  onClick={handleDislike}
                >
                  <Badge badgeContent={post.dislikes?.length || 0} color="error">
                    {hasDislikedPost() ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Comments">
                <IconButton>
                  <Badge badgeContent={
                    comments.reduce((total, comment) => 
                      total + 1 + (comment.replies?.length || 0), 0)
                  } color="secondary">
                    <CommentIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ) : (
          <Typography variant="h4" align="center" sx={{ mt: 4 }}>
            Loading...
          </Typography>
        )}

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

        {/* Comments Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Comments
          </Typography>

          {/* Add Comment Form */}
          <Box component="form" onSubmit={handleCommentSubmit} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!newComment.trim()}
            >
              Post Comment
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Comments List */}
          <List>
            {comments.map(comment => renderComment(comment))}
          </List>
        </Paper>
      </Container>
    </>
  );
}

export default PostPage; 