// Token debugging utilities

/**
 * Debug information about a JWT token
 * @param {string} token - The JWT token to examine
 * @returns {Object} An object with token information
 */
export const debugToken = (token) => {
  if (!token) {
    return { 
      valid: false, 
      error: 'No token provided'
    };
  }
  
  // Check if it's in Bearer format and extract actual token
  let tokenValue = token;
  if (token.startsWith('Bearer ')) {
    tokenValue = token.split(' ')[1];
  }
  
  try {
    // Split token into parts
    const parts = tokenValue.split('.');
    if (parts.length !== 3) {
      return { 
        valid: false, 
        error: 'Token does not have three parts (header.payload.signature)'
      };
    }
    
    // Parse header
    const header = JSON.parse(atob(parts[0]));
    
    // Parse payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    const isExpired = payload.exp && payload.exp < currentTime;
    
    // Return debug info
    return {
      valid: !isExpired,
      header,
      payload,
      isExpired,
      expiresIn: payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'No expiration',
      issueTime: payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'No issue time',
      tokenLength: tokenValue.length,
      error: isExpired ? 'Token is expired' : null
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Error parsing token: ${error.message}`
    };
  }
}; 