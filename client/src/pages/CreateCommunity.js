import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stack,
  Input,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';

function CreateCommunity() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'public', // Default to public
  });
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [error, setError] = useState('');
  const [tags, setTags] = useState([]);
  const [generatingTags, setGeneratingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]); // Store all available tags from database
  const token = useSelector((state) => state.auth.token);
  const currentUser = useSelector((state) => state.auth.user);
  
  // Fetch suggested tags when component mounts
  useEffect(() => {
    fetchSuggestedTags();
  }, [token]);
  
  // Fetch all tags from the server for suggestions
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create form data to send files
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('authorId', currentUser._id);
      formDataToSend.append('privacy', formData.privacy);
      
      // Add tags
      if (tags.length > 0) {
        // Send tags as JSON string since FormData doesn't handle arrays well
        formDataToSend.append('tags', JSON.stringify(tags));
      }
      
      // Add files if they exist
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }
      
      if (coverFile) {
        formDataToSend.append('coverImage', coverFile);
      }
      
      console.log('Creating community with data:', formData);
      console.log('Tags:', tags);
      
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error creating community');
      }

      navigate(`/community/${data._id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogoFile = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const clearCoverFile = () => {
    setCoverFile(null);
    setCoverPreview(null);
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
  
  // Generate tags based on community title and description using server API
  const generateTags = async () => {
    if (!formData.name && !formData.description) {
      setError('Please enter a community name or description first');
      return;
    }
    
    setGeneratingTags(true);
    setError('');
    
    try {
      console.log('Generating tags for:', {
        title: formData.name,
        description: formData.description
      });
      
      // Use our backend endpoint that will also update the global tag list
      const response = await fetch('/api/tags/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.name,
          description: formData.description,
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
          formData.name ? `#${formData.name.split(' ')[0].toLowerCase()}` : '#community'
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

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create a Community
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Community Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              margin="normal"
              helperText="Choose a unique name for your community"
            />

            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              multiline
              rows={4}
              margin="normal"
              helperText="Describe what your community is about"
            />

            {/* Community Type Selection */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="community-type-label">Community Type</InputLabel>
              <Select
                labelId="community-type-label"
                id="privacy"
                name="privacy"
                value={formData.privacy}
                label="Community Type"
                onChange={handleChange}
              >
                <MenuItem value="public">Public (Anyone can post)</MenuItem>
                <MenuItem value="read-only">Read Only (Only admins can post)</MenuItem>
              </Select>
              <FormHelperText>
                {formData.privacy === 'public' 
                  ? 'All members can create posts in this community' 
                  : 'Only admins can create posts in this community'}
              </FormHelperText>
            </FormControl>
            
            {/* Tags Input */}
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Autocomplete
                  multiple
                  id="tags-input"
                  options={suggestedTags} 
                  freeSolo
                  value={tags}
                  onChange={handleTagsChange}
                  renderTags={(value, getTagProps) =>
                    value.map((tag, index) => (
                      <Chip
                        label={tag}
                        {...getTagProps({ index })}
                        key={index}
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Tags"
                      placeholder="Add up to 5 tags"
                      helperText="Add tags to help others discover your community"
                      fullWidth
                    />
                  )}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={generateTags}
                  disabled={generatingTags || (!formData.name && !formData.description)}
                  startIcon={generatingTags ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
                  sx={{ height: 56 }}
                >
                  {generatingTags ? 'Generating...' : 'Generate Tags'}
                </Button>
              </Stack>
              <FormHelperText>
                Tags help users discover your community. You can add up to 5 tags.
              </FormHelperText>
            </Box>

            {/* Logo Upload */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Community Logo
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </Button>
                {logoFile && (
                  <Typography variant="body2">
                    {logoFile.name}
                    <IconButton size="small" onClick={clearLogoFile} sx={{ ml: 1 }}>
                      <ClearIcon />
                    </IconButton>
                  </Typography>
                )}
              </Stack>
              {logoPreview && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }}
                  />
                </Box>
              )}
            </Box>

            {/* Cover Image Upload */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Community Cover Image
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Upload Cover
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                </Button>
                {coverFile && (
                  <Typography variant="body2">
                    {coverFile.name}
                    <IconButton size="small" onClick={clearCoverFile} sx={{ ml: 1 }}>
                      <ClearIcon />
                    </IconButton>
                  </Typography>
                )}
              </Stack>
              {coverPreview && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={coverPreview}
                    alt="Cover Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                  />
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
              >
                Create Community
              </Button>
              <Button
                sx={{ ml: 2 }}
                variant="outlined"
                onClick={() => navigate('/')}
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

export default CreateCommunity;