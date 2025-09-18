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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Grid,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Pagination,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Message as MessageIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import Navbar from '../components/Navbar';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'tech', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'politics', label: 'Politics' },
  { value: 'other', label: 'Other' }
];

function Discussions() {
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'general',
    tags: '',
    maxParticipants: 50
  });

  useEffect(() => {
    fetchDiscussions();
  }, [page, selectedCategory, searchTerm]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/discussions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiscussions(data.discussions);
        setTotalPages(data.totalPages);
      } else {
        setError('Failed to fetch discussions');
      }
    } catch (error) {
      console.error('Error fetching discussions:', error);
      setError('Error fetching discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async () => {
    try {
      const tagsArray = createForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch('/api/discussions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          tags: tagsArray,
          maxParticipants: parseInt(createForm.maxParticipants)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOpenCreateDialog(false);
        setCreateForm({
          title: '',
          description: '',
          category: 'general',
          tags: '',
          maxParticipants: 50
        });
        fetchDiscussions();
        navigate(`/discussion/${data.discussion._id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create discussion');
      }
    } catch (error) {
      console.error('Error creating discussion:', error);
      setError('Error creating discussion');
    }
  };

  const handleJoinDiscussion = async (discussionId) => {
    try {
      // First check if user is already a participant
      const checkResponse = await fetch(`/api/discussions/${discussionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        // If already a participant, navigate directly
        if (checkData.isParticipant) {
          navigate(`/discussion/${discussionId}`);
          return;
        }
      }

      // If not a participant, try to join
      const response = await fetch(`/api/discussions/${discussionId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        navigate(`/discussion/${discussionId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to join discussion');
      }
    } catch (error) {
      console.error('Error joining discussion:', error);
      setError('Error joining discussion');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && discussions.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Live Discussions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join live discussions with other community members
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Search and Filter Controls */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search discussions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Discussions Grid */}
        <Grid container spacing={3}>
          {discussions.map((discussion) => (
            <Grid item xs={12} md={6} lg={4} key={discussion._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={discussion.creator.avatar}
                      sx={{ mr: 1 }}
                    >
                      {discussion.creator.firstname?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {discussion.creator.firstname} {discussion.creator.lastname}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(discussion.createdAt)}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="h6" component="h2" gutterBottom>
                    {discussion.title}
                  </Typography>

                  {discussion.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {discussion.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip
                      icon={<CategoryIcon />}
                      label={discussion.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${discussion.participants.length}/${discussion.maxParticipants}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                    <Chip
                      icon={<MessageIcon />}
                      label={discussion.messages.length}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  </Box>

                  {discussion.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {discussion.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {discussion.tags.length > 3 && (
                        <Chip
                          label={`+${discussion.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleJoinDiscussion(discussion._id)}
                    fullWidth
                  >
                    {discussion.participants.some(p => p._id === user?._id) 
                      ? 'Continue Discussion' 
                      : 'Join Discussion'
                    }
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}

        {/* Create Discussion FAB */}
        <Fab
          color="primary"
          aria-label="create discussion"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpenCreateDialog(true)}
        >
          <AddIcon />
        </Fab>

        {/* Create Discussion Dialog */}
        <Dialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Discussion</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              fullWidth
              variant="outlined"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={createForm.category}
                label="Category"
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              >
                {categories.slice(1).map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Tags (comma-separated)"
              fullWidth
              variant="outlined"
              value={createForm.tags}
              onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Max Participants"
              type="number"
              fullWidth
              variant="outlined"
              value={createForm.maxParticipants}
              onChange={(e) => setCreateForm({ ...createForm, maxParticipants: e.target.value })}
              inputProps={{ min: 2, max: 100 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateDiscussion}
              variant="contained"
              disabled={!createForm.title.trim()}
            >
              Create Discussion
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default Discussions;
