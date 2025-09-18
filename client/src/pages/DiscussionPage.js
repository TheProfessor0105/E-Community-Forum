import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  People as PeopleIcon,
  ExitToApp as ExitIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import Navbar from '../components/Navbar';

function DiscussionPage() {
  const { discussionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const { socket } = useAuth();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDiscussion();
  }, [discussionId, token]);

  useEffect(() => {
    if (socket && discussion) {
      // Join the discussion room
      socket.emit('join-discussion', { discussionId });

      // Listen for new messages
      socket.on('new-message', handleNewMessage);
      socket.on('message-updated', handleMessageUpdated);

      return () => {
        socket.emit('leave-discussion', { discussionId });
        socket.off('new-message', handleNewMessage);
        socket.off('message-updated', handleMessageUpdated);
      };
    }
  }, [socket, discussion]);

  useEffect(() => {
    scrollToBottom();
  }, [discussion?.messages]);

  const fetchDiscussion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/discussions/${discussionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscussion(data.discussion);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Discussion not found');
      }
    } catch (error) {
      console.error('Error fetching discussion:', error);
      setError('Error fetching discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (data) => {
    if (data.discussionId === discussionId) {
      setDiscussion(prev => ({
        ...prev,
        messages: [...prev.messages, data.message]
      }));
    }
  };

  const handleMessageUpdated = (data) => {
    if (data.discussionId === discussionId) {
      setDiscussion(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg._id === data.messageId ? { ...msg, ...data.updatedMessage } : msg
        )
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Check if user is a participant
    if (!discussion?.participants.some(p => p._id === user?._id)) {
      setError('You must be a participant to send messages');
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`/api/discussions/${discussionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: message.trim() }),
      });

      if (response.ok) {
        setMessage('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/discussions/${discussionId}/messages/${editingMessage._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        setEditingMessage(null);
        setEditContent('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update message');
      }
    } catch (error) {
      console.error('Error updating message:', error);
      setError('Error updating message');
    }
  };

  const handleJoinDiscussion = async () => {
    try {
      const response = await fetch(`/api/discussions/${discussionId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh the discussion data
        fetchDiscussion();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join discussion');
      }
    } catch (error) {
      console.error('Error joining discussion:', error);
      setError('Error joining discussion');
    }
  };

  const handleLeaveDiscussion = async () => {
    try {
      const response = await fetch(`/api/discussions/${discussionId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/discussions');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to leave discussion');
      }
    } catch (error) {
      console.error('Error leaving discussion:', error);
      setError('Error leaving discussion');
    }
  };

  const handleDeleteDiscussion = async () => {
    try {
      const response = await fetch(`/api/discussions/${discussionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate('/discussions');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete discussion');
      }
    } catch (error) {
      console.error('Error deleting discussion:', error);
      setError('Error deleting discussion');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCreator = discussion?.creator._id === user?._id;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !discussion) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/discussions')}
          >
            Back to Discussions
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Discussion Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
             <Box sx={{ display: 'flex', alignItems: 'center' }}>
               <IconButton onClick={() => navigate('/discussions')} sx={{ mr: 1 }}>
                 <ArrowBackIcon />
               </IconButton>
               <Typography variant="h5" component="h1">
                 {discussion?.title}
               </Typography>
             </Box>
             <Box sx={{ display: 'flex', gap: 1 }}>
               <Chip
                 icon={<PeopleIcon />}
                 label={`${discussion?.participants.length}/${discussion?.maxParticipants}`}
                 color="primary"
                 variant="outlined"
               />
               {discussion?.participants.some(p => p._id === user?._id) ? (
                 <Button
                   variant="outlined"
                   startIcon={<ExitIcon />}
                   onClick={handleLeaveDiscussion}
                   color="error"
                 >
                   Leave
                 </Button>
               ) : (
                 <Button
                   variant="contained"
                   onClick={() => handleJoinDiscussion(discussionId)}
                   color="primary"
                 >
                   Join Discussion
                 </Button>
               )}
               {isCreator && (
                 <Button
                   variant="outlined"
                   color="error"
                   onClick={handleDeleteDiscussion}
                 >
                   Delete
                 </Button>
               )}
             </Box>
           </Box>

          {discussion?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {discussion.description}
            </Typography>
          )}

                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
             <Chip label={discussion?.category} color="primary" size="small" />
             {discussion?.tags.map((tag, index) => (
               <Chip key={index} label={tag} size="small" variant="outlined" />
             ))}
             {discussion?.participants.some(p => p._id === user?._id) && (
               <Chip 
                 label="Participant" 
                 color="success" 
                 size="small" 
                 variant="filled"
               />
             )}
           </Box>
        </Paper>

        {/* Messages Area */}
        <Paper sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            <List>
              {discussion?.messages.map((msg) => (
                <ListItem key={msg._id} sx={{ alignItems: 'flex-start' }}>
                  <ListItemAvatar>
                    <Avatar src={msg.sender.avatar}>
                      {msg.sender.firstname?.[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {msg.sender.firstname} {msg.sender.lastname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(msg.timestamp)}
                        </Typography>
                        {msg.edited && (
                          <Typography variant="caption" color="text.secondary">
                            (edited)
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      editingMessage?._id === msg._id ? (
                        <Box sx={{ mt: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            sx={{ mb: 1 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={handleEditMessage}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingMessage(null);
                                setEditContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="body1" sx={{ mt: 1 }}>
                          {msg.content}
                        </Typography>
                      )
                    }
                  />
                                     {msg.sender._id === user?._id && editingMessage?._id !== msg._id && discussion?.participants.some(p => p._id === user?._id) && (
                     <ListItemSecondaryAction>
                       <IconButton
                         size="small"
                         onClick={() => {
                           setEditingMessage(msg);
                           setEditContent(msg.content);
                         }}
                       >
                         <EditIcon fontSize="small" />
                       </IconButton>
                     </ListItemSecondaryAction>
                   )}
                </ListItem>
              ))}
            </List>
            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Message Input */}
          <Box sx={{ p: 2 }}>
                         <Box sx={{ display: 'flex', gap: 1 }}>
               <TextField
                 fullWidth
                 placeholder={discussion?.participants.some(p => p._id === user?._id) 
                   ? "Type your message..." 
                   : "You must be a participant to send messages"
                 }
                 value={message}
                 onChange={(e) => setMessage(e.target.value)}
                 onKeyPress={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSendMessage();
                   }
                 }}
                 multiline
                 maxRows={3}
                 disabled={!discussion?.participants.some(p => p._id === user?._id)}
               />
               <Button
                 variant="contained"
                 onClick={handleSendMessage}
                 disabled={!message.trim() || sending || !discussion?.participants.some(p => p._id === user?._id)}
                 startIcon={<SendIcon />}
               >
                 Send
               </Button>
             </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default DiscussionPage;
