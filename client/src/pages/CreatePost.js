import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  FormHelperText,
  Chip,
  Autocomplete,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedCommunityId = location.state?.selectedCommunity || '';
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    community: selectedCommunityId,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [communities, setCommunities] = useState([]);
  const [adminCommunities, setAdminCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [tags, setTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [generatingTags, setGeneratingTags] = useState(false);

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      try {
        // Fetch all communities
        const response = await fetch('/api/communities', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        if (response.ok) {
          setCommunities(Array.isArray(data) ? data : []);
          
          // Filter communities where the user is an admin
          if (currentUser) {
            const adminComms = data.filter(community => 
              community.admins && 
              community.admins.includes(currentUser._id)
            );
            setAdminCommunities(adminComms.map(community => community._id));
          }
          
          // If we have a selected community ID from navigation, find the community
          if (selectedCommunityId) {
            const community = data.find(c => c._id === selectedCommunityId);
            if (community) {
              setSelectedCommunity(community);
            }
          }
        } else {
          console.error('Failed to fetch communities:', data);
          setError('Failed to fetch communities. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
        setError('Error fetching communities. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
    fetchSuggestedTags();
  }, [token, currentUser, selectedCommunityId]);

  // Fetch suggested tags from the server
  const fetchSuggestedTags = async () => {
    try {
      const response = await fetch('/api/tags', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestedTags(data);
      }
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  // Handle tags change
  const handleTagsChange = (event, newTags) => {
    // Ensure each tag starts with a hashtag and limit length
    const formattedTags = newTags.map(tag => {
      // Remove spaces and special characters except hashtags
      let formattedTag = tag.trim().replace(/[^\w#]/g, '');
      // Ensure it starts with a hashtag
      if (!formattedTag.startsWith('#')) {
        formattedTag = '#' + formattedTag;
      }
      // Limit length
      return formattedTag.substring(0, 20);
    });
    
    // Limit to 5 tags
    setTags(formattedTags.slice(0, 5));
  };

  // Generate tags based on post title and content
  const generateTags = async () => {
    if (!formData.title && !formData.content) {
      setError('Please enter a post title or content first');
      return;
    }
    
    setGeneratingTags(true);
    setError('');
    
    try {
      console.log('Generating tags for post:', {
        title: formData.title,
        content: formData.content
      });
      
      // Use our backend endpoint that will also update the global tag list
      const response = await fetch('/api/tags/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.content.substring(0, 500), // Use first 500 chars of content
        }),
      });
      
      // If there's an error, parse the response text for more details
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        
        let errorMessage = 'Failed to generate tags';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
          console.error('Parsed error details:', errorData);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Generated tags:', data);
      
      if (data.tags && data.tags.length > 0) {
        setTags(data.tags);
        // Refresh suggested tags as new ones might have been added
        fetchSuggestedTags();
      } else {
        // If we somehow got no tags back, use defaults
        const defaultTags = [
          formData.title ? `#${formData.title.split(' ')[0].toLowerCase().replace(/[^\w]/g, '')}` : '#post'
        ];
        setTags(defaultTags);
        console.warn('No tags returned from API, using defaults:', defaultTags);
      }
    } catch (err) {
      console.error('Error generating tags:', err);
      setError('Failed to generate tags: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingTags(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.title || !formData.content || !formData.community) {
      setError('All fields are required');
      return;
    }
    
    // Check permissions for the selected community
    const selectedCommunity = communities.find(c => c._id === formData.community);
    
    if (selectedCommunity && selectedCommunity.privacy === 'read-only' && !adminCommunities.includes(formData.community)) {
      setError('You can only create posts in read-only communities if you are an admin');
      return;
    }
    
    setSubmitting(true);
    
    try {
      console.log('Creating post with data:', formData); // Debug log
      console.log('Tags:', tags);
      
      // Create FormData for multipart/form-data (file upload)
      const postFormData = new FormData();
      postFormData.append('title', formData.title);
      postFormData.append('content', formData.content);
      postFormData.append('community', formData.community);
      
      // Add tags if any
      if (tags.length > 0) {
        postFormData.append('tags', JSON.stringify(tags));
      }
      
      // Add image if one was selected
      if (imageFile) {
        postFormData.append('image', imageFile);
      }
      
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: postFormData,
      });

      const data = await response.json();
      console.log('Post creation response:', data); // Debug log

      if (!response.ok) {
        throw new Error(data.message || 'Error creating post');
      }

      navigate(`/post/${data._id}`);
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'An error occurred while creating the post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear error when community changes
    if (e.target.name === 'community') {
      setError('');
    }
  };

  // Filter communities to show where user is allowed to post
  const filteredCommunities = communities.filter(community => 
    // Include communities where user is admin (can post in any type)
    adminCommunities.includes(community._id) || 
    // Or public communities where user is a member
    (community.privacy === 'public' && community.members && community.members.includes(currentUser?._id))
  );

  // Check if user can post in the pre-selected community
  const canPostInSelectedCommunity = selectedCommunity && (
    (selectedCommunity.privacy === 'public' && selectedCommunity.members && selectedCommunity.members.includes(currentUser?._id)) ||
    (adminCommunities.includes(selectedCommunity._id))
  );

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create a Post
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {selectedCommunity && !canPostInSelectedCommunity && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You cannot post in this community because it is read-only and you are not an admin.
            </Alert>
          )}

          {filteredCommunities.length === 0 && !loading ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {communities.length === 0 
                ? "You need to join or create a community before you can create posts."
                : "You can only create posts in communities where you are an admin or in public communities that you've joined."}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              margin="normal"
              disabled={(selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel id="community-label">Community</InputLabel>
              <Select
                labelId="community-label"
                name="community"
                value={formData.community}
                onChange={handleChange}
                required
                label="Community"
                disabled={loading || filteredCommunities.length === 0 || selectedCommunityId}
              >
                {loading ? (
                  <MenuItem disabled>
                    <CircularProgress size={24} />
                    Loading communities...
                  </MenuItem>
                ) : filteredCommunities.length > 0 ? (
                  filteredCommunities.map((community) => (
                    <MenuItem key={community._id} value={community._id}>
                      {community.name} 
                      {community.privacy === 'read-only' && !adminCommunities.includes(community._id) && 
                        " (Read Only - You cannot post here)"}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No communities available for posting</MenuItem>
                )}
              </Select>
              {selectedCommunity ? (
                <FormHelperText>
                  {selectedCommunity.name} - {selectedCommunity.privacy === 'public' 
                    ? 'Public community' 
                    : 'Read-only community (Only admins can post)'}
                </FormHelperText>
              ) : (
                <FormHelperText>
                  {communities.some(c => c.privacy === 'read-only') ? 
                    "Note: In read-only communities, only admins can create posts" : 
                    "Select a community for your post"}
                </FormHelperText>
              )}
            </FormControl>

            <TextField
              fullWidth
              label="Content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              multiline
              rows={6}
              margin="normal"
              disabled={(selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
            />
            
            {/* Tags Input */}
            <Box sx={{ mt: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Autocomplete
                multiple
                id="post-tags"
                options={suggestedTags}
                value={tags}
                onChange={handleTagsChange}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip 
                      key={index}
                      variant="outlined" 
                      label={option} 
                      color="primary"
                      {...getTagProps({ index })} 
                    />
                  ))
                }
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Tags (up to 5)"
                    placeholder="Add tags"
                    helperText="Add relevant tags to help others find your post. Each tag should start with #"
                    fullWidth
                  />
                )}
                sx={{ flex: 1 }}
                disabled={(selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
              />
              <Button
                variant="outlined"
                color="secondary"
                onClick={generateTags}
                disabled={((!formData.title && !formData.content) || generatingTags) || (selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
                startIcon={generatingTags ? <CircularProgress size={18} /> : <AutoFixHighIcon />}
                sx={{ height: '56px', whiteSpace: 'nowrap' }}
              >
                Generate
              </Button>
            </Box>
            
            {/* Image upload section */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="post-image-upload"
                type="file"
                onChange={handleImageChange}
                disabled={(selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
              />
              <label htmlFor="post-image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mr: 2 }}
                  disabled={(selectedCommunity && !canPostInSelectedCommunity) || (filteredCommunities.length === 0 && !loading)}
                >
                  Upload Image
                </Button>
              </label>
              
              {imagePreview && (
                <Box sx={{ mt: 2, position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px',
                      borderRadius: '4px' 
                    }} 
                  />
                  <IconButton
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 0,
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.9)',
                      }
                    }}
                    onClick={clearImage}
                  >
                    <CancelIcon />
                  </IconButton>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={submitting || loading || filteredCommunities.length === 0 || (selectedCommunity && !canPostInSelectedCommunity)}
                startIcon={submitting ? <CircularProgress size={24} /> : null}
              >
                {submitting ? 'Creating...' : 'Create Post'}
              </Button>
              <Button
                sx={{ ml: 2 }}
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </>
  );
}

export default CreatePost; 