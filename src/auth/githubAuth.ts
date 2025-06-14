import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github';
import { BasicStrategy } from 'passport-http';
import { Request, Response, NextFunction } from 'express';
import { Octokit } from '@octokit/rest';
import config from '../config/config.js';

// Define user type for TypeScript
export interface User {
  id: string;
  username: string;
  accessToken: string;
  profile: any;
}

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
    const octokit = new Octokit({
      auth: token,
      ...(config.github.enterpriseApiUrl && {
        baseUrl: config.github.enterpriseApiUrl,
      }),
    });
    
    // Get user information
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
    } else if (error?.status === 404) {
      console.error(`Authentication failed: API endpoint not found at ${config.github.enterpriseApiUrl}/user`);
      console.error(`Check that your GH_ENTERPRISE_API_URL is correct. For GitHub.com it should be https://api.github.com`);
    } else {
      console.error('Error authenticating with token:', error);
    }
    return null;
  }
};

/**
 * Configure GitHub authentication strategy for Passport
 * This supports:
 * 1. HTTP Basic Authentication (like Git clone)
 * 2. GitHub OAuth authentication
 */
export const configureGitHubAuth = () => {
  // Set up HTTP Basic Authentication with token (like Git clone)
  passport.use(new BasicStrategy(
    async (username, password, done) => {
      try {
        // When using token as password with any username (Git style)
        const token = password;
        const user = await getUserFromToken(token);
        
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (error) {
        return done(error);
      }
    }
  ));

  console.log('HTTP Basic Authentication configured for GitHub');
  
  // If token authentication is the only method, skip OAuth configuration
  if (config.github.authMethod === 'token') {
    return;
  }
  
  // Configure GitHub strategy for use by Passport (for OAuth method)
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.github.clientId,
        clientSecret: config.github.clientSecret,
        callbackURL: config.github.callbackUrl,
        // For GitHub Enterprise, specify the enterprise URLs
        ...(config.github.enterpriseUrl && {
          authorizationURL: `${config.github.enterpriseUrl}/login/oauth/authorize`,
          tokenURL: `${config.github.enterpriseUrl}/login/oauth/access_token`,
          userProfileURL: `${config.github.enterpriseApiUrl}/user`,
        }),
      },
      (accessToken: string, refreshToken: string, profile: any, done: any) => {
        // Create user object with GitHub profile info and access token
        const user: User = {
          id: profile.id,
          username: profile.username,
          accessToken,
          profile,
        };
        
        return done(null, user);
      }
    )
  );

  // Serialize user for session storage
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  // Deserialize user from session storage
  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
};

/**
 * Middleware to check if the user is authenticated - handles all auth methods
 * 1. Checks for HTTP Basic Auth
 * 2. Checks for session authentication 
 * 3. Redirects to login page if not authenticated
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // First try HTTP Basic Authentication (like Git)
  passport.authenticate('basic', { session: false }, (err: Error | null, user: any, info: any) => {
    if (err) { return next(err); }
    if (user) { 
      req.user = user;
      return next();
    }
    
    // If Basic auth fails, check if already authenticated via session
    if (req.isAuthenticated()) {
      return next();
    }
    
    // If not authenticated and it's an API request, return 401 with WWW-Authenticate header
    if (req.path.startsWith('/api/')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GitHub MCP Server"');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Otherwise redirect to login page
    res.redirect('/auth/github');
  })(req, res, next);
};

/**
 * Get the authenticated user from the request
 * Works with both session authentication and Basic auth
 */
export const getAuthenticatedUser = (req: Request): User | null => {
  if (req.user) {
    return req.user as User;
  }
  return null;
};
