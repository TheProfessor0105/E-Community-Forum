import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Badge
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Cancel as CancelIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import Navbar from '../components/Navbar';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`friends-tabpanel-${index}`}
      aria-labelledby={`friends-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function Friends() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      
      // Fetch friends
      const friendsResponse = await fetch(`/api/friendship/friends/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (friendsResponse.ok) {
        const friendsData = await friendsResponse.json();
        setFriends(friendsData.friends);
      }

      // Fetch friend requests
      const requestsResponse = await fetch('/api/friendship/requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setReceivedRequests(requestsData.receivedRequests);
        setSentRequests(requestsData.sentRequests);
      }
    } catch (error) {
      console.error('Error fetching friends data:', error);
      setError('Error fetching friends data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/friendship/accept-request/${requestId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFriendsData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      setError('Error accepting request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/friendship/reject-request/${requestId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFriendsData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Error rejecting request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const response = await fetch(`/api/friendship/remove-friend/${friendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFriendsData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      setError('Error removing friend');
    }
  };

  const handleCancelRequest = async (targetUserId) => {
    try {
      const response = await fetch(`/api/friendship/cancel-request/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchFriendsData();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      setError('Error cancelling request');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Friends
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your friends and friend requests
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="friends tabs">
              <Tab 
                label={
                  <Badge badgeContent={friends.length} color="primary">
                    <PeopleIcon sx={{ mr: 1 }} />
                    Friends
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={receivedRequests.length} color="secondary">
                    <PersonAddIcon sx={{ mr: 1 }} />
                    Requests
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={sentRequests.length} color="info">
                    <PersonAddIcon sx={{ mr: 1 }} />
                    Sent
                  </Badge>
                } 
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {friends.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No friends yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start connecting with other users to build your friends list
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {friends.map((friend) => (
                  <Grid item xs={12} sm={6} md={4} key={friend._id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar
                            src={friend.avatar}
                            sx={{ mr: 2, width: 56, height: 56 }}
                          >
                            {friend.firstname?.[0]}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">
                              {friend.firstname} {friend.lastname}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              @{friend.username}
                            </Typography>
                            {friend.livesin && (
                              <Typography variant="caption" color="text.secondary">
                                📍 {friend.livesin}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {friend.about && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {friend.about}
                          </Typography>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/profile/${friend._id}`)}
                          fullWidth
                        >
                          View Profile
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoveFriend(friend._id)}
                          startIcon={<PersonRemoveIcon />}
                          fullWidth
                        >
                          Remove Friend
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {receivedRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No friend requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You don't have any pending friend requests
                </Typography>
              </Box>
            ) : (
              <List>
                {receivedRequests.map((request) => (
                  <React.Fragment key={request._id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar src={request.from.avatar}>
                          {request.from.firstname?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${request.from.firstname} ${request.from.lastname}`}
                        secondary={`@${request.from.username} wants to be your friend`}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            color="success"
                            onClick={() => handleAcceptRequest(request._id)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleRejectRequest(request._id)}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {sentRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No sent requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You haven't sent any friend requests yet
                </Typography>
              </Box>
            ) : (
              <List>
                {sentRequests.map((user) => (
                  <React.Fragment key={user._id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar src={user.avatar}>
                          {user.firstname?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstname} ${user.lastname}`}
                        secondary={`@${user.username} - Request sent`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          color="error"
                          onClick={() => handleCancelRequest(user._id)}
                        >
                          <CancelIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </TabPanel>
        </Card>
      </Container>
    </Box>
  );
}

export default Friends;
