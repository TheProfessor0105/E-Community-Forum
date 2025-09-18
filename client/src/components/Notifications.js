import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ButtonGroup,
  Chip,
  Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CommentIcon from '@mui/icons-material/Comment';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import { login } from '../redux/authSlice';
import { getBestToken, getAuthHeaders, authFetch } from '../utils/authUtils';

const Notifications = ({ socket }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useSelector((state) => state.auth);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Ensure token is available from localStorage if not in Redux
  useEffect(() => {
    if (!token) {
      const localToken = localStorage.getItem('token');
      if (localToken) {
        console.log("Restoring token from localStorage to Redux");
        // If we have a token in localStorage but not in Redux, restore it
        dispatch(login({ token: localToken, user: currentUser }));
      }
    }
  }, [token, currentUser, dispatch]);

  // Handle opening the notification menu
  const handleMenuOpen = (event) => {
    console.log('Notification button clicked!');
    
    // Only set anchor if it's not already set
    if (!anchorEl) {
      setAnchorEl(event.currentTarget);
    }
  };

  // Handle closing the notification menu
  const handleMenuClose = () => {
    console.log('Closing notification menu');
    setAnchorEl(null);
  };

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Check if user exists and has an ID
      if (!currentUser || !currentUser._id) {
        console.log("No current user or user ID available");
        return;
      }

      // Use the new API endpoint without userId parameter
      const apiUrl = `/api/notifications`;
      console.log("Fetching notifications from:", apiUrl);
      
      // Use authFetch utility
      const result = await authFetch(apiUrl, { method: 'GET' }, token);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch notifications');
      }
      
      const data = result.data || result;
      console.log("Notifications response received:", data);
      
      // Filter out any null or undefined notifications (defensive coding)
      const validNotifications = Array.isArray(data) ? data.filter(n => n && n.id) : [];
      
      if (validNotifications.length !== (Array.isArray(data) ? data.length : 0)) {
        console.warn("Found invalid notifications in response");
      }
      
      setNotifications(validNotifications);
      
      // Calculate unread count
      const unread = validNotifications.filter(notification => !notification.isRead).length;
      console.log(`Found ${unread} unread notifications out of ${validNotifications.length} total`);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show error to user for notification fetching failures
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on component mount and when currentUser changes
  useEffect(() => {
    // Set up online/offline event listeners
    const handleOnline = () => {
      console.log("Network connection restored");
      setIsOnline(true);
      // Fetch notifications immediately when connection is restored
      fetchNotifications();
    };
    
    const handleOffline = () => {
      console.log("Network connection lost");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (currentUser?._id) {
      fetchNotifications();
      
      // Set up periodic refresh with longer interval to reduce network load
      const refreshInterval = setInterval(() => {
        // Only fetch if we're online and not loading
        if (navigator.onLine && isOnline && !loading) {
          fetchNotifications();
        }
      }, 30000); // Refresh every 30 seconds
      
      // Clean up interval and event listeners on unmount
      return () => {
        clearInterval(refreshInterval);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [currentUser, isOnline]); // Removed loading from dependencies

  // Real-time notification handling with socket
  useEffect(() => {
    if (!socket || !currentUser?._id) return;

    // Listen for new notifications
    const handleNewNotification = (notification) => {
      console.log('Received real-time notification:', notification);
      
      // Add the new notification to the top of the list
      setNotifications(prevNotifications => {
        // Check if notification already exists to avoid duplicates
        const exists = prevNotifications.some(n => n.id === notification.id);
        if (exists) return prevNotifications;
        
        return [notification, ...prevNotifications];
      });
      
      // Update unread count
      setUnreadCount(prevCount => prevCount + 1);
    };

    // Listen for notification updates (like when marked as read)
    const handleNotificationUpdate = (updatedNotification) => {
      console.log('Received notification update:', updatedNotification);
      
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === updatedNotification.id 
            ? updatedNotification 
            : notification
        )
      );
      
      // Recalculate unread count
      setNotifications(prevNotifications => {
        const unread = prevNotifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        return prevNotifications;
      });
    };

    // Listen for notification deletion
    const handleNotificationDelete = (deletedNotificationId) => {
      console.log('Received notification deletion:', deletedNotificationId);
      
      setNotifications(prevNotifications => {
        const deleted = prevNotifications.find(n => n.id === deletedNotificationId);
        const filtered = prevNotifications.filter(n => n.id !== deletedNotificationId);
        
        // Update unread count if the deleted notification was unread
        if (deleted && !deleted.isRead) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        
        return filtered;
      });
    };

    // Join user's notification room
    socket.emit('join-notifications', { userId: currentUser._id });
    
    // Listen for real-time events
    socket.on('new-notification', handleNewNotification);
    socket.on('notification-updated', handleNotificationUpdate);
    socket.on('notification-deleted', handleNotificationDelete);
    
    // Clean up socket listeners
    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('notification-updated', handleNotificationUpdate);
      socket.off('notification-deleted', handleNotificationDelete);
      socket.emit('leave-notifications', { userId: currentUser._id });
    };
  }, [socket, currentUser]);

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      const authToken = getBestToken(token);
      
      const result = await authFetch('/api/notifications/read', {
        method: 'PUT',
        body: JSON.stringify({ notificationId })
      }, token);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to mark notification as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const result = await authFetch('/api/notifications/read-all', {
        method: 'PUT'
      }, token);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to mark all notifications as read');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Prevent menu item click event
    
    try {
      const result = await authFetch('/api/notifications', {
        method: 'DELETE',
        body: JSON.stringify({ notificationId })
      }, token);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete notification');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count if needed
      const deleted = notifications.find(notification => notification.id === notificationId);
      if (deleted && !deleted.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Accept friend request
  const handleAcceptFriend = async (notification, event) => {
    event.stopPropagation(); // Prevent propagation to parent elements
    
    try {
      console.log("Accepting friend request with notification:", notification);
      
      // Make sure we have the required fields
      if (!notification.fromUser && !notification.senderId) {
        // Try to find any ID field that might contain the sender
        const possibleSenderFields = Object.keys(notification).filter(k => 
          (k.includes('sender') || k.includes('from') || k.includes('User') || k.includes('user')) && 
          notification[k] && 
          typeof notification[k] === 'string' && 
          notification[k] !== currentUser._id
        );
        
        console.log("Possible sender ID fields:", possibleSenderFields);
        
        if (possibleSenderFields.length === 0) {
          console.error("Could not find sender ID in notification:", notification);
          return;
        }
      }
      
      // Try to find the sender ID from multiple possible fields
      const senderId = notification.senderId || 
                      notification.fromUser || 
                      notification.sender || 
                      notification.from;
      
      console.log("Using sender ID:", senderId);
      
      // Use authFetch utility
      const result = await authFetch(
        '/api/users/accept-friend',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: currentUser._id,
            senderId: senderId,
            notificationId: notification.id
          })
        },
        token
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to accept friend request');
      }
      
      console.log("Friend request accepted successfully:", result.data);
      
      // Remove notification from the list
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );
      
      // Update unread count if needed
      if (!notification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  // Reject friend request
  const handleRejectFriend = async (notification, event) => {
    event.stopPropagation(); // Prevent propagation to parent elements
    
    try {
      console.log("Rejecting friend request with notification:", notification);
      
      // Try to find the sender ID from multiple possible fields
      const senderId = notification.senderId || 
                      notification.fromUser || 
                      notification.sender || 
                      notification.from;
      
      console.log("Using sender ID:", senderId);
      
      // Use authFetch utility
      const result = await authFetch(
        '/api/users/reject-friend',
        {
          method: 'POST',
          body: JSON.stringify({
            userId: currentUser._id,
            senderId: senderId,
            notificationId: notification.id
          })
        },
        token
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to reject friend request');
      }
      
      console.log("Friend request rejected successfully:", result.data);
      
      // Remove notification from the list
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );
      
      // Update unread count if needed
      if (!notification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  // Handle notification click based on type
  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'community_removal':
      case 'admin_promotion':
      case 'admin_demotion':
      case 'new_member':
        if (notification.communityId) {
          navigate(`/community/${notification.communityId}`);
        }
        break;
      case 'friend_request':
        // Don't navigate, just show the friend request options
        break;
      case 'friend_request_accepted':
        if (notification.userId) {
          navigate(`/profile/${notification.userId}`);
        } else if (notification.senderId) {
          navigate(`/profile/${notification.senderId}`);
        }
        break;
      case 'post_like':
      case 'post_dislike':
      case 'post_comment':
      case 'new_comment':
      case 'comment_like':
      case 'comment_dislike':
        if (notification.postId) {
          navigate(`/post/${notification.postId}`);
        }
        break;
      case 'comment_reply':
        if (notification.postId) {
          navigate(`/post/${notification.postId}`);
        }
        break;
      case 'profile_visit':
        if (notification.visitorId) {
          navigate(`/profile/${notification.visitorId}`);
        }
        break;
      case 'community_invite':
        if (notification.communityId) {
          navigate(`/community/${notification.communityId}`);
        }
        break;
      default:
        console.log('Unknown notification type:', notification.type);
        // Try to navigate to post if postId exists
        if (notification.postId) {
          navigate(`/post/${notification.postId}`);
        }
        break;
    }
    
    handleMenuClose();
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_member':
        return <PeopleIcon />;
      case 'admin_promotion':
      case 'admin_demotion':
        return <PersonIcon />;
      case 'community_removal':
      case 'community_deleted':
        return <GroupsIcon />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <PersonAddIcon />;
      case 'post_like':
        return <ThumbUpIcon />;
      case 'post_dislike':
        return <ThumbDownIcon />;
      case 'post_comment':
      case 'new_comment':
      case 'comment_reply':
        return <CommentIcon />;
      case 'comment_like':
        return <ThumbUpIcon />;
      case 'comment_dislike':
        return <ThumbDownIcon />;
      case 'profile_visit':
        return <PersonIcon />;
      case 'community_invite':
        return <GroupsIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'post_like':
      case 'comment_like':
      case 'friend_request_accepted':
        return 'success';
      case 'post_dislike':
      case 'comment_dislike':
        return 'error';
      case 'admin_promotion':
        return 'primary';
      case 'admin_demotion':
      case 'community_removal':
      case 'community_deleted':
        return 'warning';
      case 'post_comment':
      case 'new_comment':
      case 'comment_reply':
        return 'info';
      case 'profile_visit':
        return 'secondary';
      case 'community_invite':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Format notification timestamp
  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  };

  return (
    <>
      <Button 
        color="inherit" 
        onClick={handleMenuOpen}
        aria-label="notifications"
        sx={{ 
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1000,
          minWidth: 'auto',
          padding: '8px',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <span style={{ fontSize: '20px' }}>🔔</span>
        {unreadCount > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: 'red',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {unreadCount}
          </Box>
        )}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: 350,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {notifications.length > 0 && (
            <Button 
              size="small" 
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {loading ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              Loading notifications...
            </Typography>
          </MenuItem>
        ) : notifications.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No notifications
            </Typography>
          </MenuItem>
        ) : (
          <List sx={{ width: '100%', p: 0 }}>
            {notifications.map(notification => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      bgcolor: notification.isRead ? 'action.hover' : 'action.selected',
                    },
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1.5
                  }}
                >
                  <Box display="flex" width="100%" alignItems="flex-start">
                    <ListItemIcon sx={{ mt: 0.5 }}>
                      <Box color={`${getNotificationColor(notification.type)}.main`}>
                        {getNotificationIcon(notification.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body2"
                            fontWeight={notification.isRead ? 'normal' : 'bold'}
                            sx={{ flexGrow: 1 }}
                          >
                            {notification.message}
                          </Typography>
                          {!notification.isRead && (
                            <Chip 
                              label="New" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={formatNotificationTime(notification.timestamp)}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary'
                      }}
                    />
                    <IconButton 
                      edge="end" 
                      aria-label="delete" 
                      size="small"
                      onClick={(e) => deleteNotification(notification.id, e)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {notification.type === 'friend_request' && (
                    <Box mt={1} mb={1} display="flex" justifyContent="flex-end" width="100%">
                      <ButtonGroup size="small">
                        <Button 
                          startIcon={<CheckIcon />} 
                          color="primary"
                          variant="contained"
                          onClick={(e) => handleAcceptFriend(notification, e)}
                        >
                          Accept
                        </Button>
                        <Button 
                          startIcon={<CloseIcon />} 
                          color="error"
                          variant="outlined"
                          onClick={(e) => handleRejectFriend(notification, e)}
                        >
                          Reject
                        </Button>
                      </ButtonGroup>
                    </Box>
                  )}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}

export default Notifications;