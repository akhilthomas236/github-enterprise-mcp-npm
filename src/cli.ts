#!/usr/bin/env node
// filepath: /Users/annmariyajoshy/vibecoding/github-mcp/src/cli.ts
/**
 * Command-line interface for GitHub MCP Server
 * This script allows running the MCP server via npx
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, '../package.json');

// ASCII art logo for a more professional CLI appearance
const displayLogo = () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │                                         │
  │      GitHub Enterprise MCP Server       │
  │                                         │
  └─────────────────────────────────────────┘
  `);
};

/**
 * Parse command line arguments
 * Supports:
 * --help: Display help information
 * --version: Display version information
 * --port=3000: Set the server port
 * --token=xxx: Set GitHub token
 * --mfa-token=xxx: Set GitHub MFA bearer token
 * --enterprise-url=url: Set GitHub Enterprise URL
 * --api-url=url: Set GitHub API URL
 */
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options: CommandOptions = {
    help: false,
    version: false,
    port: process.env.PORT || '3000',
    token: process.env.GH_TOKEN || '',
    mfaBearerToken: process.env.GH_MFA_BEARER_TOKEN || '',
    enterpriseUrl: process.env.GH_ENTERPRISE_URL || 'https://github.com',
    apiUrl: process.env.GH_ENTERPRISE_API_URL || 'https://api.github.com'
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg.startsWith('--port=')) {
      options.port = arg.split('=')[1];
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg.startsWith('--enterprise-url=')) {
      options.enterpriseUrl = arg.split('=')[1];
    } else if (arg.startsWith('--api-url=')) {
      options.apiUrl = arg.split('=')[1];
    } else if (arg.startsWith('--mfa-token=')) {
      options.mfaBearerToken = arg.split('=')[1];
    }
  }

  return options;
};

/**
 * Display help information
 */
const displayHelp = () => {
  console.log(`
Usage: npx github-enterprise-mcp [options]

Options:
  --help, -h               Display this help message
  --version, -v            Display version information
  --port=NUMBER            Set the server port (default: 3000)
  --token=TOKEN            Set GitHub Personal Access Token
  --mfa-token=TOKEN        Set GitHub MFA bearer token for SSO authentication
  --enterprise-url=URL     Set GitHub Enterprise URL (default: https://github.com)
  --api-url=URL            Set GitHub API URL (default: https://api.github.com)

Examples:
  npx github-enterprise-mcp --token=ghp_yourtokenhere
  npx github-enterprise-mcp --port=4000 --token=ghp_yourtokenhere
  npx github-enterprise-mcp --token=ghp_yourtokenhere --mfa-token=mfa_yourmfatokenhere

Environment Variables:
  PORT                     Server port
  GH_TOKEN                 GitHub Personal Access Token
  GH_MFA_BEARER_TOKEN      GitHub MFA bearer token for SSO authentication
  GH_AUTH_METHOD           Authentication method (token or oauth)
  GH_ENTERPRISE_URL        GitHub Enterprise URL
  GH_ENTERPRISE_API_URL    GitHub Enterprise API URL

For more information, visit: https://github.com/akhilthomas236/github-enterprise-mcp
`);
};

/**
 * Display version information
 */
const displayVersion = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(`GitHub Enterprise MCP Server v${packageJson.version}`);
  } catch (error) {
    console.log('Version information not available');
  }
};

/**
 * Run the MCP server with the provided options
 */
const runServer = (options: CommandOptions) => {
  // Set environment variables based on command line arguments
  process.env.PORT = options.port;
  process.env.GH_AUTH_METHOD = 'token';
  if (options.token) process.env.GH_TOKEN = options.token;
  if (options.mfaBearerToken) process.env.GH_MFA_BEARER_TOKEN = options.mfaBearerToken;
  process.env.GH_ENTERPRISE_URL = options.enterpriseUrl;
  process.env.GH_ENTERPRISE_API_URL = options.apiUrl;

  try {
    // Find the path to the main file
    const mainFilePath = path.resolve(__dirname, 'index.js');
    
    // Check if the file exists
    if (!fs.existsSync(mainFilePath)) {
      console.error(`Error: Main file not found at ${mainFilePath}`);
      console.error('Make sure you have built the project with "npm run build" before running.');
      process.exit(1);
    }

    console.log(`Starting GitHub MCP Server on port ${options.port}...`);
    
    // Spawn the server process
    const server = spawn('node', [mainFilePath], {
      stdio: 'inherit',
      env: process.env
    });

    // Handle server termination
    server.on('close', (code) => {
      if (code !== 0) {
        console.error(`Server process exited with code ${code}`);
      }
      process.exit(code);
    });

    // Handle process termination signals
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      server.kill('SIGTERM');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Interface for command line options
 */
interface CommandOptions {
  help: boolean;
  version: boolean;
  port: string;
  token: string;
  mfaBearerToken: string;
  enterpriseUrl: string;
  apiUrl: string;
}

// Main execution
const main = () => {
  displayLogo();
  
  const options = parseArgs();
  
  if (options.help) {
    displayHelp();
    process.exit(0);
  }
  
  if (options.version) {
    displayVersion();
    process.exit(0);
  }
  
  // Validate token
  if (!options.token) {
    console.error('Error: GitHub token is required');
    console.error('Please provide a token using --token=YOUR_TOKEN or set the GH_TOKEN environment variable');
    console.error('Run with --help for more information');
    process.exit(1);
  }
  
  runServer(options);
};

main();
