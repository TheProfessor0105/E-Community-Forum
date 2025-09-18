import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Button,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

function FriendshipButton({ targetUserId, onFriendshipChange }) {
  const { token, user } = useSelector((state) => state.auth);
  const [status, setStatus] = useState('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetUserId && user?._id !== targetUserId) {
      fetchFriendshipStatus();
    }
  }, [targetUserId, user?._id]);

  const fetchFriendshipStatus = async () => {
    try {
      const response = await fetch(`/api/friendship/status/${targetUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      } else {
        setStatus('none');
      }
    } catch (error) {
      console.error('Error fetching friendship status:', error);
      setStatus('none');
    }
  };

  const handleSendRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/friendship/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });

      if (response.ok) {
        setStatus('request_sent');
        setError('');
        if (onFriendshipChange) onFriendshipChange();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Error sending friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/friendship/cancel-request/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStatus('none');
        setError('');
        if (onFriendshipChange) onFriendshipChange();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to cancel friend request');
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      setError('Error cancelling friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/friendship/remove-friend/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setStatus('none');
        setError('');
        if (onFriendshipChange) onFriendshipChange();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      setError('Error removing friend');
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile
  if (user?._id === targetUserId) {
    return null;
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <Button
        variant="outlined"
        disabled
        startIcon={<CircularProgress size={16} />}
      >
        Loading...
      </Button>
    );
  }

  // Render different buttons based on status
  switch (status) {
    case 'friends':
      return (
        <>
          <Button
            variant="outlined"
            color="error"
            onClick={handleRemoveFriend}
            disabled={loading}
            startIcon={<PersonRemoveIcon />}
          >
            {loading ? 'Removing...' : 'Remove Friend'}
          </Button>
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError('')}
          >
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Snackbar>
        </>
      );

    case 'request_sent':
      return (
        <>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleCancelRequest}
            disabled={loading}
            startIcon={<CancelIcon />}
          >
            {loading ? 'Cancelling...' : 'Cancel Request'}
          </Button>
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError('')}
          >
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Snackbar>
        </>
      );

    case 'request_received':
      return (
        <>
          <Button
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={<CheckIcon />}
          >
            Accept Request
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={loading}
            startIcon={<CloseIcon />}
          >
            Reject Request
          </Button>
        </>
      );

    case 'none':
    default:
      return (
        <>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendRequest}
            disabled={loading}
            startIcon={<PersonAddIcon />}
          >
            {loading ? 'Sending...' : 'Add Friend'}
          </Button>
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={() => setError('')}
          >
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Snackbar>
        </>
      );
  }
}

export default FriendshipButton;
