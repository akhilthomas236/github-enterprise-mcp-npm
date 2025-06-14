/**
 * Programmatic API for GitHub Enterprise MCP Server
 * This demonstrates how to use the MCP server as a library in your own application
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { configureGitHubAuth, getUserFromToken } from './auth/githubAuth.js';
import { z } from 'zod';
import { GitHubService } from './services/githubService.js';
import { ResponseFormatter } from './utils/responseFormatter.js';

// Re-export types
export * from './types/index.js';

/**
 * Configuration options for the MCP server
 */
export interface McpServerOptions {
  token?: string;
  mfaBearerToken?: string;
  enterpriseUrl?: string;
  apiUrl?: string;
  port?: number | string;
  debug?: boolean;
}

/**
 * Create and configure an MCP server instance
 */
export async function createMcpServer(options: McpServerOptions = {}) {
  // Apply options
  if (options.token) {
    process.env.GH_TOKEN = options.token;
    process.env.GH_AUTH_METHOD = 'token';
  }
  
  if (options.mfaBearerToken) {
    process.env.GH_MFA_BEARER_TOKEN = options.mfaBearerToken;
  }
  
  if (options.enterpriseUrl) {
    process.env.GH_ENTERPRISE_URL = options.enterpriseUrl;
  }
  
  if (options.apiUrl) {
    process.env.GH_ENTERPRISE_API_URL = options.apiUrl;
  }
  
  if (options.port) {
    process.env.PORT = String(options.port);
  }
  
  // Set up debug logging if requested
  if (options.debug) {
    process.env.LOG_LEVEL = '3';
  }
  
  // Initialize authentication
  const user = options.token ? await getUserFromToken(options.token) : null;
  
  // Create MCP server instance
  const server = new McpServer({
    name: 'github-enterprise-mcp',
    version: '1.0.2',
    capabilities: {
      resources: {},
      tools: {},
    },
  });
  
  // Register tools
  if (user) {
    // Register list-repositories tool
    server.tool(
      'list-repositories',
      'List repositories for the authenticated user',
      {},
      async () => {
        try {
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

    // Register create-branch tool
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
  } else {
    throw new Error('Authentication required. Please provide a valid token.');
  }
  
  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(options: McpServerOptions = {}) {
  const server = await createMcpServer(options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

// Default export for convenience
export default { createMcpServer, startMcpServer };
