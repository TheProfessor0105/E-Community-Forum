import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Tabs,
  Tab,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '../components/Navbar';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function Explore() {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [communities, setCommunities] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const response = await fetch('/api/communities', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setCommunities(data);
        }
      } catch (error) {
        console.error('Error fetching communities:', error);
      }
    };

    const fetchTrendingPosts = async () => {
      try {
        const response = await fetch('/api/posts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          // Sort by likes count (trending)
          const sorted = [...data].sort(
            (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
          ).slice(0, 10); // Get top 10
          
          setTrendingPosts(sorted);
        }
      } catch (error) {
        console.error('Error fetching trending posts:', error);
      }
    };

    fetchCommunities();
    fetchTrendingPosts();
  }, [token]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Explore
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Communities" />
            <Tab label="Trending Posts" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {communities.map((community) => (
              <Grid item xs={12} sm={6} md={4} key={community._id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() => navigate(`/community/${community._id}`)}
                  >
                    <CardMedia
                      component="img"
                      height="140"
                      image={community.image || 'https://source.unsplash.com/random?community'}
                      alt={community.name}
                    />
                    <CardContent>
                      <Typography gutterBottom variant="h5" component="div">
                        {community.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {community.description.length > 100 
                          ? `${community.description.substring(0, 100)}...` 
                          : community.description}
                      </Typography>
                      
                      {/* Community Tags */}
                      {community.tags && community.tags.length > 0 && (
                        <Box sx={{ mt: 1, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {community.tags.slice(0, 3).map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                          {community.tags.length > 3 && (
                            <Chip 
                              label={`+${community.tags.length - 3} more`} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        {community.membersCount} members
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {trendingPosts.map((post) => (
              <React.Fragment key={post._id}>
                <ListItem
                  alignItems="flex-start"
                  button
                  onClick={() => navigate(`/post/${post._id}`)}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={post.author?.avatar}
                      alt={post.author?.username}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={post.title}
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'inline' }}
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {post.author?.username}
                        </Typography>
                        {` — ${post.content.substring(0, 100)}${
                          post.content.length > 100 ? '...' : ''
                        }`}
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {post.likes?.length || 0} likes • Posted in {post.community?.name}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </TabPanel>
      </Container>
    </>
  );
}

export default Explore; 