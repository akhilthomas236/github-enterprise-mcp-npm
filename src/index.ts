import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import express, { Request, Response } from 'express';
import session from 'express-session';
import passport from 'passport';
import { configureGitHubAuth, ensureAuthenticated, getUserFromToken, User } from './auth/githubAuth.js';
import { GitHubService } from './services/githubService.js';
import { ResponseFormatter } from './utils/responseFormatter.js';
import { printConfigDiagnostics, logError, logInfo, logWarning } from './utils/debug.js';
import config from './config/config.js';

// Store authenticated users and their tokens
const authenticatedUsers = new Map<string, User>();

// Authentication method handling
const isTokenAuth = config.github.authMethod === 'token';

// Initialize authentication based on selected method
const initializeAuthentication = async (): Promise<boolean> => {
  // Token-based authentication with HTTP Basic Auth support
  if (isTokenAuth && config.github.token) {
    console.log('Using token-based authentication with HTTP Basic Auth support');

    // Create Express app for HTTP Basic Authentication
    const app = express();
    
    // Initialize passport
    app.use(passport.initialize());
    
    // Configure GitHub authentication (this will set up HTTP Basic Auth)
    configureGitHubAuth();
    
    // Add route for HTTP Basic Authentication (similar to Git)
    app.get('/api/auth/basic', 
      passport.authenticate('basic', { session: false }),
      (req: Request, res: Response) => {
        const user = req.user as User;
        if (user) {
          authenticatedUsers.set(user.id, user);
          res.status(200).json({
            authenticated: true,
            message: `Successfully authenticated as ${user.username}`,
            username: user.username
          });
        } else {
          res.status(401).json({
            authenticated: false,
            message: "Authentication failed"
          });
        }
      }
    );
    
    // Start API server for Basic Auth
    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`HTTP Basic Auth server running at http://localhost:${PORT}`);
      console.log(`Use curl -u 'username:token' http://localhost:${PORT}/api/auth/basic to test`);
    });
    
    try {
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
  // OAuth-based authentication (requires web server)
  else if (!isTokenAuth) {
    console.log('Using OAuth-based authentication with HTTP Basic Auth fallback');
    // Create Express app for OAuth authentication
    const app = express();

    // Configure session middleware
    app.use(session(config.session));

    // Initialize passport and session
    app.use(passport.initialize());
    app.use(passport.session());

    // Configure GitHub authentication (including HTTP Basic Auth)
    configureGitHubAuth();

    // Add route for HTTP Basic Authentication (similar to Git)
    app.get('/api/auth/basic', 
      passport.authenticate('basic', { session: false }),
      (req: Request, res: Response) => {
        const user = req.user as User;
        if (user) {
          authenticatedUsers.set(user.id, user);
          res.status(200).json({
            authenticated: true,
            message: `Successfully authenticated as ${user.username}`,
            username: user.username
          });
        } else {
          res.status(401).json({
            authenticated: false,
            message: "Authentication failed"
          });
        }
      });

    // Serve a simple home page
    app.get('/', (req: Request, res: Response) => {
      if (req.isAuthenticated() && req.user) {
        const user = req.user as User;
        res.send(`
          <h1>GitHub Enterprise MCP Server</h1>
          <p>Successfully authenticated as ${user.username}</p>
          <p>You can now use this MCP server with GitHub Copilot!</p>
          <p><strong>For Git-compatible authentication:</strong> Use your personal access token as the password with HTTP Basic Authentication.</p>
        `);
      } else {
        res.send(`
          <h1>GitHub Enterprise MCP Server</h1>
          <p>Please <a href="/auth/github">login with GitHub Enterprise</a> to use this MCP server.</p>
          <p>Or authenticate using HTTP Basic Authentication with your personal access token.</p>
        `);
      }
    });

    // GitHub auth routes
    app.get('/auth/github', passport.authenticate('github'));
    app.get(
      '/auth/github/callback',
      passport.authenticate('github', { failureRedirect: '/' }),
      (req: Request, res: Response) => {
        // Store authenticated user
        if (req.user) {
          const user = req.user as User;
          authenticatedUsers.set(user.id, user);
        }
        res.redirect('/');
      }
    );

    // Simple API endpoint to check authentication status
    app.get('/api/status', ensureAuthenticated, (req: Request, res: Response) => {
      if (req.user) {
        const user = req.user as User;
        res.json({
          authenticated: true,
          user: user.username,
        });
      } else {
        res.status(401).json({ authenticated: false });
      }
    });

    // Start the Express server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      console.log(`Authentication server running at http://localhost:${PORT}`);
      console.log(`Please authenticate at http://localhost:${PORT}/auth/github`);
    });

    return true;
  } else {
    console.error('No authentication method configured. Please set up token or OAuth authentication.');
    return false;
  }
};

// Create MCP server instance
const server = new McpServer({
  name: config.mcp.name,
  version: config.mcp.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register MCP tools for GitHub repository operations
const registerMcpTools = () => {
  // Tool: List repositories
  server.tool(
    'list-repositories',
    'List repositories for the authenticated user',
    {},
    async () => {
      try {
        // Get the first authenticated user (for simplicity)
        // In a production environment, you would match the user to the request
        const user = authenticatedUsers.values().next().value;
        
        if (!user) {
          return ResponseFormatter.error('No authenticated user. Please authenticate at the server URL.');
        }
        
        const githubService = new GitHubService(user);
        const repositories = await githubService.listRepositories();
        
        return ResponseFormatter.success(
          `Found ${repositories.length} repositories:\n\n` +
          repositories.map(repo => 
            `- ${repo.full_name} (${repo.visibility})\n  ${repo.description || 'No description'}\n  Default branch: ${repo.default_branch}`
          ).join('\n\n')
        );
      } catch (error) {
        console.error('Error listing repositories:', error);
        return ResponseFormatter.error(error);
      }
    }
  );

  // Tool: Create branch
  server.tool(
    'create-branch',
    'Create a new branch in a GitHub repository',
    {
      owner: z.string().describe('Repository owner/organization'),
      repo: z.string().describe('Repository name'),
      branch: z.string().describe('New branch name'),
      sourceBranch: z.string().optional().describe('Source branch to create from (optional)'),
    },
    async (request) => {
      try {
        const { owner, repo, branch, sourceBranch } = request;
        
        // Get the first authenticated user (for simplicity)
        const user = authenticatedUsers.values().next().value;
        
        if (!user) {
          return ResponseFormatter.error('No authenticated user. Please authenticate at the server URL.');
        }
        
        const githubService = new GitHubService(user);
        const result = await githubService.createBranch(owner, repo, branch, sourceBranch);
        
        return ResponseFormatter.success(
          `Successfully created branch "${branch}" in repository ${owner}/${repo}` +
          (sourceBranch ? ` from source branch "${sourceBranch}"` : '')
        );
      } catch (error) {
        console.error('Error creating branch:', error);
        return ResponseFormatter.error(error);
      }
    }
  );

  // Tool: List branches
  server.tool(
    'list-branches',
    'List branches in a GitHub repository',
    {
      owner: z.string().describe('Repository owner/organization'),
      repo: z.string().describe('Repository name'),
    },
    async (request) => {
      try {
        const { owner, repo } = request;
        
        // Get the first authenticated user (for simplicity)
        const user = authenticatedUsers.values().next().value;
        
        if (!user) {
          return ResponseFormatter.error('No authenticated user. Please authenticate at the server URL.');
        }
        
        const githubService = new GitHubService(user);
        const branches = await githubService.listBranches(owner, repo);
        
        return ResponseFormatter.success(
          `Branches in repository ${owner}/${repo}:\n\n` +
          branches.map(branch => 
            `- ${branch.name}${branch.protected ? ' (protected)' : ''}`
          ).join('\n')
        );
      } catch (error) {
        console.error('Error listing branches:', error);
        return ResponseFormatter.error(error);
      }
    }
  );

  // Tool: Get repository info
  server.tool(
    'get-repository',
    'Get information about a GitHub repository',
    {
      owner: z.string().describe('Repository owner/organization'),
      repo: z.string().describe('Repository name'),
    },
    async (request) => {
      try {
        const { owner, repo } = request;
        
        // Get the first authenticated user (for simplicity)
        const user = authenticatedUsers.values().next().value;
        
        if (!user) {
          return ResponseFormatter.error('No authenticated user. Please authenticate at the server URL.');
        }
        
        const githubService = new GitHubService(user);
        const repository = await githubService.getRepository(owner, repo);
        
        return ResponseFormatter.success(
          `Repository: ${repository.full_name}\n` +
          `Description: ${repository.description || 'No description'}\n` +
          `Visibility: ${repository.visibility}\n` +
          `Default branch: ${repository.default_branch}\n` +
          `URL: ${repository.html_url}\n` +
          `Last updated: ${new Date(repository.updated_at).toLocaleString()}`
        );
      } catch (error) {
        console.error('Error getting repository:', error);
        return ResponseFormatter.error(error);
      }
    }
  );
};

// Main function to run the MCP server
async function main() {
  // Print configuration diagnostics on startup
  printConfigDiagnostics();
  
  // Validate API URL format
  if (config.github.enterpriseApiUrl) {
    try {
      const url = new URL(config.github.enterpriseApiUrl);
      logInfo(`Using GitHub API URL: ${url.toString()}`);
      
      // Warn about common incorrect formats
      if (url.pathname.includes('/api/v3') && url.hostname === 'github.com') {
        logWarning(`GitHub.com API should be 'https://api.github.com' not 'https://github.com/api/v3'`);
      }
    } catch (error) {
      logError(`Invalid GitHub API URL: ${config.github.enterpriseApiUrl}`, error);
      process.exit(1);
    }
  }
  
  // Initialize authentication
  const authInitialized = await initializeAuthentication();
  if (!authInitialized) {
    logError('Failed to initialize authentication. Exiting...');
    process.exit(1);
  }
  
  // Register MCP tools
  registerMcpTools();
  
  // Set up MCP server with stdio transport for Copilot
  const transport = new StdioServerTransport();
  
  try {
    await server.connect(transport);
    logInfo('GitHub Enterprise MCP Server running');
  } catch (error) {
    logError('Error connecting MCP server:', error);
    process.exit(1);
  }
}

// Run the server
main().catch(error => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
