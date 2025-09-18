import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { AuthProvider } from './context/AuthContext';
import { login } from './redux/authSlice';
import { getStoredToken, isTokenValid } from './utils/tokenUtils';
import { restoreUserData } from './utils/authUtils';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import CreatePost from './pages/CreatePost';
import CreateCommunity from './pages/CreateCommunity';
import CommunityPage from './pages/CommunityPage';
import Explore from './pages/Explore';
import PostPage from './pages/PostPage';
import ManageCommunity from './pages/ManageCommunity';
import NotificationsPage from './pages/NotificationsPage';
import Discussions from './pages/Discussions';
import DiscussionPage from './pages/DiscussionPage';
import Friends from './pages/Friends';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const isAuth = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  
  // Check token on app load
  useEffect(() => {
    // If we don't have a token in Redux but have one in localStorage, initialize Redux with it
    if (!isAuth) {
      const storedToken = getStoredToken();
      if (storedToken && isTokenValid(storedToken)) {
        // Restore user data from server
        restoreUserData(storedToken).then(userData => {
          if (userData) {
            dispatch(login({ token: storedToken, user: userData }));
            console.log('Restored user data from server');
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('token');
            console.log('Invalid token, removed from localStorage');
          }
        });
      }
    }
  }, [isAuth, dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={isAuth ? <Home /> : <Navigate to="/login" />}
            />
            <Route
              path="/login"
              element={!isAuth ? <Login /> : <Navigate to="/" />}
            />
            <Route
              path="/profile/:userId"
              element={<Profile />}
            />
            <Route
              path="/create-post"
              element={isAuth ? <CreatePost /> : <Navigate to="/login" />}
            />
            <Route
              path="/create-community"
              element={isAuth ? <CreateCommunity /> : <Navigate to="/login" />}
            />
            <Route
              path="/community/:communityId"
              element={isAuth ? <CommunityPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/explore"
              element={isAuth ? <Explore /> : <Navigate to="/login" />}
            />
            <Route
              path="/post/:postId"
              element={isAuth ? <PostPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/manage-community/:communityId"
              element={isAuth ? <ManageCommunity /> : <Navigate to="/login" />}
            />
            <Route
              path="/notifications"
              element={isAuth ? <NotificationsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/discussions"
              element={isAuth ? <Discussions /> : <Navigate to="/login" />}
            />
            <Route
              path="/discussion/:discussionId"
              element={isAuth ? <DiscussionPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/friends"
              element={isAuth ? <Friends /> : <Navigate to="/login" />}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 