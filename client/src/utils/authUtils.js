// Authentication utilities for token management across the app

/**
 * Gets the best available authentication token from multiple sources
 * @param {string} reduxToken - Token from Redux store (can be null)
 * @returns {string|null} The best available token or null if none found
 */
export const getBestToken = (reduxToken) => {
  // First try Redux store token
  if (reduxToken) return reduxToken;
  
  // Then try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // No token available
  return null;
};

/**
 * Creates authorization headers with the best available token
 * @param {string} reduxToken - Token from Redux store (can be null)
 * @returns {Object} Headers object with Authorization if token available
 */
export const getAuthHeaders = (reduxToken) => {
  const authToken = getBestToken(reduxToken);
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
};

/**
 * Restore user data from server using stored token
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} User data or null if failed
 */
export const restoreUserData = async (token) => {
  try {
    const result = await authFetch('/api/auth/me', { method: 'GET' }, token);
    
    if (result.success && result.user) {
      return result.user;
    }
    
    return null;
  } catch (error) {
    console.error('Error restoring user data:', error);
    return null;
  }
};

/**
 * Make an authenticated API request with proper error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {string} reduxToken - Token from Redux state
 * @returns {Promise} Response data or error
 */
export const authFetch = async (url, options = {}, reduxToken) => {
  const authToken = getBestToken(reduxToken);
  
  // Add authorization header if token available
  const headers = {
    ...(options.headers || {}),
  };
  
  // Only set Content-Type if not already set (for FormData uploads)
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Send cookies if any
    });
    
    // Handle no content responses
    if (response.status === 204) {
      return { success: true };
    }
    
    // For network errors (e.g., server not running, connection refused)
    if (!response.ok) {
      console.error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    let data;
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Error parsing JSON response:", e, "Raw response:", text);
        throw new Error(`Invalid JSON response from server: ${e.message}`);
      }
    } catch (e) {
      console.error("Error reading response:", e);
      throw new Error(`Failed to read server response: ${e.message}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    // If data is a direct array or object without success property, wrap it
    if (Array.isArray(data)) {
      return { success: true, data: data };
    } else if (typeof data === 'object') {
      // Add success flag if not present
      return { success: true, ...data };
    } else {
      return { success: true, data: data };
    }
  } catch (error) {
    // Check if it's a CORS error
    if (error.message && error.message.includes('NetworkError') || 
        error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error(`CORS or network error when connecting to ${url}`);
      console.error('This is likely a CORS issue or the server is not running');
      
      return { 
        success: false, 
        message: `Cannot connect to the server. This may be due to CORS restrictions or the server is not running.`,
        corsIssue: true
      };
    }
    
    console.error(`API request failed: ${url}`, error);
    return { 
      success: false, 
      message: error.message || 'API request failed'
    };
  }
}; 