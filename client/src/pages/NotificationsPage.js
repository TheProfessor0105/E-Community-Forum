import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Box,
  IconButton,
  ButtonGroup
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import GroupsIcon from '@mui/icons-material/Groups';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Navbar from '../components/Navbar';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { debugToken } from '../utils/tokenDebug';

// Function to get token, with localStorage fallback
const getAuthToken = (reduxToken) => {
  if (reduxToken) return reduxToken;
  
  // Try to get from localStorage as fallback
  const localToken = localStorage.getItem('token');
  if (localToken) {
    console.log("Retrieved token from localStorage");
    return localToken;
  }
  
  console.error("No authentication token found in Redux or localStorage");
  return null;
};

// Create axios instance with auth interceptor
const authAxios = axios.create();

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector((state) => state.auth.user);
  const reduxToken = useSelector((state) => state.auth.token);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  // Initialize token from Redux or localStorage
  useEffect(() => {
    const authToken = getAuthToken(reduxToken);
    setToken(authToken);
  }, [reduxToken]);

  // Debug token when it changes
  useEffect(() => {
    if (token) {
      const tokenInfo = debugToken(token);
      console.log("Token debug info:", tokenInfo);
      
      if (!tokenInfo.valid) {
        console.error("TOKEN VALIDATION FAILED:", tokenInfo.error);
      }
    } else {
      console.error("NO TOKEN AVAILABLE");
    }
  }, [token]);

  // Set up axios interceptor when token changes
  useEffect(() => {
    // Clear any previous interceptors
    authAxios.interceptors.request.clear();
    
    // Add a new interceptor
    authAxios.interceptors.request.use(
      (config) => {
        // Set content type for POST, PUT, PATCH requests
        if (['post', 'put', 'patch'].includes(config.method)) {
          config.headers['Content-Type'] = 'application/json';
        }
        
        const currentToken = getAuthToken(token);
        if (currentToken) {
          // Ensure token has Bearer prefix
          const formattedToken = currentToken.startsWith('Bearer ') ? currentToken : `Bearer ${currentToken}`;
          config.headers['Authorization'] = formattedToken;
          console.log("Setting Authorization header:", formattedToken.substring(0, 20) + '...');
        } else {
          console.warn("No token available for request");
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }, [token]);

  useEffect(() => {
    if (currentUser?._id) {
      console.log("Current user:", currentUser);
      console.log("Auth token available:", !!token);
      fetchNotifications();
      
      // Set up periodic refresh
      const refreshInterval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
      
      // Clean up interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [currentUser, token]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      console.log("Fetching notifications with token:", token ? `Bearer ${token.substring(0, 15)}...` : "No token");
      
      const response = await authAxios.get(`/api/notifications/${currentUser._id}`);
      
      console.log("Received notifications:", response.data);
      setNotifications(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authAxios.put(`/api/notifications/${currentUser._id}/read-all`);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      await authAxios.delete(`/api/notifications/${currentUser._id}`, {
        data: { notificationId }
      });
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Utility function to try multiple auth methods
  const executeAuthenticatedRequest = async (endpoint, data, method = 'post') => {
    // Get the most up-to-date token
    const currentToken = getAuthToken(token);
    
    if (!currentToken) {
      console.error("No authentication token available");
      return { 
        success: false, 
        error: new Error("Authentication token missing"),
        message: "You need to be logged in to perform this action"
      };
    }

    // Format the token with Bearer prefix if needed
    const formattedToken = currentToken.startsWith('Bearer ') ? currentToken : `Bearer ${currentToken}`;
    
    console.log(`Executing ${method} to ${endpoint} with ${formattedToken.substring(0, 15)}...`);
    
    // Try with direct fetch first instead of axios
    try {
      console.log(`Attempting ${method.toUpperCase()} request to ${endpoint} with fetch`);
      const fetchResponse = await fetch(endpoint, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': formattedToken
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await fetchResponse.json();
      
      if (!fetchResponse.ok) {
        console.error(`Fetch request failed: ${fetchResponse.status}`, responseData);
        throw new Error(responseData.message || `Request failed with status ${fetchResponse.status}`);
      }
      
      console.log("Fetch request succeeded:", responseData);
      return { success: true, data: responseData };
    } catch (fetchError) {
      console.error("Fetch API failed:", fetchError);
      
      // Try with axios as fallback
      try {
        console.log(`Attempting ${method.toUpperCase()} request to ${endpoint} with direct axios`);
        // Use direct axios instead of our intercepted instance
        const response = await axios({
          method,
          url: endpoint,
          data,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': formattedToken
          }
        });
        
        return { success: true, data: response.data };
      } catch (axiosError) {
        console.error(`Direct axios request failed:`, axiosError);
        return { 
          success: false, 
          error: axiosError,
          message: axiosError.message || "Authentication failed"
        };
      }
    }
  };

  // Accept friend request
  const handleAcceptFriend = async (notification, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      console.log("===== ACCEPTING FRIEND REQUEST =====");
      console.log("Notification object:", notification);
      console.log("All notification fields:", Object.keys(notification).join(", "));
      console.log("Notification type:", notification.type);
      
      // Check for sender ID in different possible fields
      let senderId = null;
      
      // Try all possible field names that might contain the sender ID
      if (notification.senderId) senderId = notification.senderId;
      else if (notification.fromUser) senderId = notification.fromUser;
      // Check nested field patterns
      else if (notification.sender && notification.sender._id) senderId = notification.sender._id;
      else if (notification.sender && notification.sender.id) senderId = notification.sender.id;
      // Check for other field formats based on notification structure
      else if (notification.userId) senderId = notification.userId;
      else if (notification.from) senderId = notification.from;
      
      console.log("Found sender ID:", senderId);
      
      // Make sure we have the required fields
      if (!senderId) {
        console.error("Missing sender ID in notification:", notification);
        // If we still can't find an ID, try to use any ID-looking field
        const idFields = Object.keys(notification).filter(key => 
          (key.includes('id') || key.includes('Id') || key.includes('user') || key.includes('User')) && 
          notification[key] && 
          typeof notification[key] === 'string'
        );
        
        console.log("Potential ID fields:", idFields);
        
        if (idFields.length > 0) {
          // Use the first ID-looking field that's not the current user's ID or the notification ID
          for (const field of idFields) {
            if (notification[field] !== currentUser._id && notification[field] !== notification.id) {
              senderId = notification[field];
              console.log(`Using ${field} as senderId:`, senderId);
              break;
            }
          }
        }
        
        if (!senderId) {
          alert("Cannot accept friend request: missing sender information");
          return;
        }
      }
      
      // Prepare request data
      const requestData = {
        userId: currentUser._id,
        senderId: senderId,
        notificationId: notification.id
      };
      
      console.log("Request data:", requestData);
      console.log("Token available:", !!token);
      
      const result = await executeAuthenticatedRequest('/api/users/accept-friend', requestData);
      
      if (result.success) {
        console.log("Friend request accepted successfully:", result.data);
        
        // Remove notification from the list
        setNotifications(prevNotifications => 
          prevNotifications.filter(n => n.id !== notification.id)
        );
      } else {
        console.error("Failed to accept friend request:", result.message);
        alert(`Error accepting friend request: ${result.message}`);
      }
    } catch (error) {
      console.error('Error in handleAcceptFriend:', error);
      alert(`Error accepting friend request: ${error.message}`);
    }
  };

  // Reject friend request
  const handleRejectFriend = async (notification, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      console.log("===== REJECTING FRIEND REQUEST =====");
      console.log("Notification object:", notification);
      console.log("All notification fields:", Object.keys(notification).join(", "));
      console.log("Notification type:", notification.type);
      
      // Check for sender ID in different possible fields
      let senderId = null;
      
      // Try all possible field names that might contain the sender ID
      if (notification.senderId) senderId = notification.senderId;
      else if (notification.fromUser) senderId = notification.fromUser;
      // Check nested field patterns
      else if (notification.sender && notification.sender._id) senderId = notification.sender._id;
      else if (notification.sender && notification.sender.id) senderId = notification.sender.id;
      // Check for other field formats based on notification structure
      else if (notification.userId) senderId = notification.userId;
      else if (notification.from) senderId = notification.from;
      
      console.log("Found sender ID:", senderId);
      
      // Make sure we have the required fields
      if (!senderId) {
        console.error("Missing sender ID in notification:", notification);
        // If we still can't find an ID, try to use any ID-looking field
        const idFields = Object.keys(notification).filter(key => 
          (key.includes('id') || key.includes('Id') || key.includes('user') || key.includes('User')) && 
          notification[key] && 
          typeof notification[key] === 'string'
        );
        
        console.log("Potential ID fields:", idFields);
        
        if (idFields.length > 0) {
          // Use the first ID-looking field that's not the current user's ID or the notification ID
          for (const field of idFields) {
            if (notification[field] !== currentUser._id && notification[field] !== notification.id) {
              senderId = notification[field];
              console.log(`Using ${field} as senderId:`, senderId);
              break;
            }
          }
        }
        
        if (!senderId) {
          alert("Cannot reject friend request: missing sender information");
          return;
        }
      }
      
      // Prepare request data
      const requestData = {
        userId: currentUser._id,
        notificationId: notification.id,
        senderId: senderId
      };
      
      console.log("Request data:", requestData);
      
      const result = await executeAuthenticatedRequest('/api/users/reject-friend', requestData);
      
      if (result.success) {
        console.log("Friend request rejected successfully:", result.data);
        
        // Remove notification from the list
        setNotifications(prevNotifications => 
          prevNotifications.filter(n => n.id !== notification.id)
        );
      } else {
        console.error("Failed to reject friend request:", result.message);
        alert(`Error rejecting friend request: ${result.message}`);
      }
    } catch (error) {
      console.error('Error in handleRejectFriend:', error);
      alert(`Error rejecting friend request: ${error.message}`);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
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
        // Don't navigate for friend requests
        break;
      case 'friend_request_accepted':
        navigate(`/profile/${notification.userId}`);
        break;
      default:
        break;
    }
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
      default:
        return <NotificationsIcon />;
    }
  };
  
  // Format date for display
  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  // Debug function to log friend request notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const friendRequests = notifications.filter(n => n.type === 'friend_request');
      if (friendRequests.length > 0) {
        console.log("Found friend request notifications:", friendRequests);
      }
    }
  }, [notifications]);

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              Notifications
            </Typography>
            {notifications.length > 0 && (
              <Button 
                startIcon={<DoneAllIcon />}
                onClick={markAllAsRead}
                disabled={notifications.every(n => n.isRead)}
              >
                Mark all as read
              </Button>
            )}
          </Box>
          
          {loading ? (
            <Typography>Loading notifications...</Typography>
          ) : notifications.length === 0 ? (
            <Typography>You don't have any notifications.</Typography>
          ) : (
            <List>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem 
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                      '&:hover': {
                        bgcolor: notification.isRead ? 'action.hover' : 'action.selected',
                      },
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      cursor: 'pointer'
                    }}
                  >
                    <Box display="flex" width="100%" alignItems="center" mb={notification.type === 'friend_request' ? 1 : 0}>
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={notification.message}
                        secondary={formatTime(notification.timestamp)}
                        primaryTypographyProps={{
                          fontWeight: notification.isRead ? 'normal' : 'bold'
                        }}
                      />
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={(e) => deleteNotification(notification.id, e)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    {notification.type === 'friend_request' && (
                      <Box width="100%" display="flex" justifyContent="flex-end">
                        <ButtonGroup>
                          <Button 
                            startIcon={<CheckIcon />} 
                            color="primary"
                            onClick={(e) => handleAcceptFriend(notification, e)}
                          >
                            Accept
                          </Button>
                          <Button 
                            startIcon={<CloseIcon />} 
                            color="error"
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
        </Paper>
      </Container>
    </>
  );
}

export default NotificationsPage; 