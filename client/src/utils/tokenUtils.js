// Token utility functions

// Get token from localStorage
export const getStoredToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

// Check if token is valid (not expired)
export const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // JWT tokens are in format: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return false;
    
    // Decode the base64 payload
    const decoded = JSON.parse(atob(payload));
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}; 