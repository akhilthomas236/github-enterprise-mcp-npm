import express from 'express';
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { BasicStrategy } from 'passport-http';
import { Octokit } from '@octokit/rest';
import config from '../config/config.js';

// Define user type for TypeScript
export interface User {
  id: string;
  username: string;
  accessToken: string;
  profile: any;
}

// Store authenticated users and their tokens
const authenticatedUsers = new Map<string, User>();

// Get MFA Bearer token from environment variable
const mfaBearerToken = process.env.GH_MFA_BEARER_TOKEN || '';

/**
 * Get user information from GitHub using a token
 * @param token GitHub Personal Access Token with appropriate scopes
 * @returns User object if successful, null if authentication fails
 */
export const getUserFromToken = async (token: string): Promise<User | null> => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    console.error('Invalid token provided: Token must be a non-empty string');
    return null;
  }

  try {
    // Log MFA token status before creating GitHub API client
    console.log(`[MFA Token Status] Available: ${!!mfaBearerToken}, Length: ${mfaBearerToken?.length || 0}`);
    
    // Create a GitHub API client with the token and MFA bearer header
    const octokit = new Octokit({
      auth: token,
      ...(config.github.enterpriseApiUrl && {
        baseUrl: config.github.enterpriseApiUrl,
      }),
      request: {
        headers: {
          // Format MFA header according to GitHub Enterprise requirements
          // Most instances use "MFA: bearer TOKEN" format
          "MFA": mfaBearerToken ? `bearer ${mfaBearerToken}` : '',
          // Some GitHub Enterprise instances might use these alternate formats:
          // "X-GitHub-OTP": mfaBearerToken || '',
          // "X-MFA-Token": mfaBearerToken || '',
        },
        hook: {
          beforeRequest: (request: any) => {
            // Make a deep copy for logging to avoid modifying the original request
            const maskedRequest = JSON.parse(JSON.stringify(request));
            
            // Log the raw headers for debugging (before masking)
            console.log('[DEBUG] Raw request headers keys:', Object.keys(request.headers));
            
            // Mask auth token if present in headers
            if (maskedRequest.headers && maskedRequest.headers.authorization) {
              maskedRequest.headers = { 
                ...maskedRequest.headers,
                authorization: 'Bearer xxxx' + (maskedRequest.headers.authorization as string).substring((maskedRequest.headers.authorization as string).length - 4)
              };
            }
            
            // Mask MFA token if present in headers and log its presence
            if (maskedRequest.headers && maskedRequest.headers.MFA) {
              console.log('[DEBUG] MFA header is present with value length:', (request.headers.MFA as string).length);
              maskedRequest.headers = { 
                ...maskedRequest.headers,
                MFA: (maskedRequest.headers.MFA as string).replace(/bearer\s+([^$]+)/, 'bearer xxxx' + (maskedRequest.headers.MFA as string).substring((maskedRequest.headers.MFA as string).length - 4))
              };
            } else {
              console.log('[DEBUG] MFA header is NOT present in request headers');
            }
            
            // Check for alternate MFA header formats
            ['X-GitHub-OTP', 'X-MFA-Token'].forEach(headerName => {
              if (maskedRequest.headers && maskedRequest.headers[headerName]) {
                console.log(`[DEBUG] ${headerName} header is present`);
              }
            });
            
            // Log the masked request details
            console.log('GitHub API Request:', {
              method: maskedRequest.method,
              url: maskedRequest.url,
              headers: maskedRequest.headers,
              // Don't log body to avoid exposing sensitive data
            });
          }
        }
      }
    });
    
    // Get user information to verify the token works
    const { data: userInfo } = await octokit.users.getAuthenticated();
    
    if (!userInfo || !userInfo.id) {
      console.error('Invalid user information returned from GitHub');
      return null;
    }
    
    // Create user object with GitHub profile info and token
    const user: User = {
      id: userInfo.id.toString(),
      username: userInfo.login,
      accessToken: token,
      profile: userInfo,
    };
    
    return user;
  } catch (error: any) {
    if (error?.status === 401) {
      console.error('Authentication failed: Invalid or expired token');
    } else if (error?.status === 403) {
      console.error('Authentication failed: Rate limit exceeded or insufficient permissions');
    } else {
      console.error('Error authenticating with token:', error);
    }
    return null;
  }
};

/**
 * Configure GitHub HTTP Basic Authentication for use with Git-style authentication
 * where token is provided as the password
 */
export const setupBasicAuth = (app: express.Express): void => {
  // Configure HTTP Basic Authentication strategy
  passport.use(new BasicStrategy(
    async (username: string, password: string, done: (error: Error | null, user?: any, options?: any) => void) => {
      try {
        // In Git-style auth, the token is provided as the password
        // The username can be anything, but we'll validate the token
        const token = password;
        
        // Validate the token by getting the user
        const user = await getUserFromToken(token);
        
        if (user) {
          // Store the user in our authenticated users map
          authenticatedUsers.set(user.id, user);
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (error) {
        return done(error instanceof Error ? error : new Error(String(error)));
      }
    }
  ));

  // Initialize Passport middleware
  app.use(passport.initialize());
  
  // Set up a route to test basic authentication
  app.get('/api/auth/basic', 
    passport.authenticate('basic', { session: false }),
    (req, res) => {
      const user = req.user as User;
      res.json({
        authenticated: true,
        message: `Successfully authenticated as ${user.username}`,
        username: user.username
      });
    }
  );
  
  // Add middleware to check authentication for API routes
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('basic', { session: false }, (err: Error | null, user?: any, info?: any) => {
      if (err) { return next(err); }
      
      if (user) {
        req.user = user;
        return next();
      }
      
      // If authentication fails, return a 401 with WWW-Authenticate header
      res.setHeader('WWW-Authenticate', 'Basic realm="GitHub Enterprise MCP Server"');
      return res.status(401).json({ error: 'Authentication required' });
    })(req, res, next);
  });
  
  console.log('HTTP Basic Authentication for GitHub has been set up');
};

/**
 * Get all authenticated users
 */
export const getAuthenticatedUsers = (): Map<string, User> => {
  return authenticatedUsers;
};

/**
 * Initialize authentication with a token from config
 * Returns true if successful, false otherwise
 */
export const initializeTokenAuth = async (): Promise<boolean> => {
  if (config.github.token) {
    try {
      console.log('Authenticating with configured token...');
      const user = await getUserFromToken(config.github.token);
      
      if (user) {
        authenticatedUsers.set(user.id, user);
        console.log(`Successfully authenticated as ${user.username} using token`);
        return true;
      } else {
        console.error('Failed to authenticate with provided token');
        return false;
      }
    } catch (error) {
      console.error('Error during token authentication:', error);
      return false;
    }
  }
  
  console.warn('No token configured for authentication');
  return false;
};
