# GitHub Enterprise MCP Server

A Model Context Protocol (MCP) server for GitHub Enterprise that supports repository operations like listing repositories and creating branches, with SSO authentication support. This package enables GitHub Copilot to interact with your GitHub Enterprise repositories.

## Features

- Authentication options:
  - Personal Access Token authentication via HTTP Basic Auth (recommended, Git-compatible)
  - GitHub Enterprise SSO/OAuth authentication
- Repository operations:
  - List repositories
  - Create branches
  - List branches
  - Get repository information
- MCP server integration with GitHub Copilot
- Works with GitHub Enterprise instances that use SSO-based login

## Prerequisites

- Node.js (v18 or later)
- A GitHub Enterprise instance
- A GitHub Personal Access Token with appropriate scopes (recommended)

## Installation

### Option 1: Install globally

```bash
npm install -g github-enterprise-mcp
```

### Option 2: Run directly with npx

```bash
npx github-enterprise-mcp --token=your_github_token
```

### Option 3: Install as a development dependency

```bash
npm install --save-dev github-enterprise-mcp
```

## Quick Start

```bash
# Run with a Personal Access Token
github-enterprise-mcp --token=ghp_yourtokenhere

# Specify port
github-enterprise-mcp --port=4000 --token=ghp_yourtokenhere

# Specify GitHub Enterprise URL
github-enterprise-mcp --enterprise-url=https://github.yourcompany.com --token=ghp_yourtokenhere
```

### 3. Authentication Setup

#### Option 1: Token-Based Authentication (Recommended)

1. In your GitHub Enterprise instance, create a Personal Access Token:
   - Go to Settings > Developer Settings > Personal Access Tokens
   - Create a new token with the following scopes:
     - `repo` (Full control of private repositories)
     - `read:org` (Read organization membership)
   - Copy the generated token
   
   If your GitHub Enterprise instance uses SSO authentication, you might also need an MFA bearer token to authenticate API requests.

2. Create a `.env` file in the root of the project:

```
# Server configuration
PORT=3000

# GitHub Enterprise configuration
GH_ENTERPRISE_URL=https://github.example.com
GH_ENTERPRISE_API_URL=https://github.example.com/api/v3

# Authentication method (use 'token')
GH_AUTH_METHOD=token

# Token authentication
GH_TOKEN=your_personal_access_token
GH_USERNAME=your_github_username
GH_MFA_BEARER_TOKEN=your_mfa_bearer_token_if_required_for_sso

# Session configuration (still needed for some internal operations)
SESSION_SECRET=some_secure_random_string
```

#### Option 2: OAuth-Based Authentication

1. In your GitHub Enterprise instance:
   - Go to Settings > Developer Settings > OAuth Apps
   - Create a new OAuth App with:
     - Application name: GitHub Enterprise MCP
     - Homepage URL: http://localhost:3000
     - Authorization callback URL: http://localhost:3000/auth/github/callback
   - After creating, note the Client ID and generate a Client Secret

2. Create a `.env` file in the root of the project:

```
# Server configuration
PORT=3000

# GitHub Enterprise configuration
GH_ENTERPRISE_URL=https://github.example.com
GH_ENTERPRISE_API_URL=https://github.example.com/api/v3

# Authentication method (use 'oauth')
GH_AUTH_METHOD=oauth

# OAuth authentication
GH_CLIENT_ID=your_client_id
GH_CLIENT_SECRET=your_client_secret
GH_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Session configuration
SESSION_SECRET=some_secure_random_string
```

Replace placeholders with your actual GitHub Enterprise URLs and credentials.

### 4. Build and start the server

```bash
npm run build
npm start
```

## Using with GitHub Copilot

To use this MCP server with GitHub Copilot, you'll need to:

1. Start the server: `npm start`
2. Authentication process:
   - **For token-based authentication**: The server will authenticate automatically using the token provided in the `.env` file
   - **For OAuth-based authentication**: Open the server URL in your browser (http://localhost:3000) and sign in with your GitHub Enterprise credentials
3. Configure your VS Code settings to use this MCP server with Copilot

### VS Code Configuration

In VS Code, create or edit `.vscode/settings.json` in your project:

```json
{
  "mcp.servers": {
    "github-enterprise": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/github-mcp/dist/index.js"]
    }
  }
}
```

## Using with npx

You can run the GitHub Enterprise MCP Server directly using npx without installing it globally:

```bash
npx github-enterprise-mcp --token=YOUR_GITHUB_TOKEN
```

### Command Line Options

The CLI supports the following options:

```
Options:
  --help, -h               Display the help message
  --version, -v            Display version information
  --port=NUMBER            Set the server port (default: 3000)
  --token=TOKEN            Set GitHub Personal Access Token
  --mfa-token=TOKEN        Set GitHub MFA bearer token for SSO authentication
  --enterprise-url=URL     Set GitHub Enterprise URL (default: https://github.com)
  --api-url=URL            Set GitHub API URL (default: https://api.github.com)
```

### Examples

Basic usage with GitHub.com:
```bash
npx github-enterprise-mcp --token=ghp_yourtokenhere
```

With custom port:
```bash
npx github-enterprise-mcp --port=4000 --token=ghp_yourtokenhere
```

With MFA bearer token (for SSO authentication):
```bash
npx github-enterprise-mcp --token=ghp_yourtokenhere --mfa-token=mfa_yourmfatokenhere
```

With GitHub Enterprise:
```bash
npx github-enterprise-mcp --token=ghp_yourtokenhere \
  --enterprise-url=https://github.example.com \
  --api-url=https://github.example.com/api/v3
```

### Using as a Development Dependency

You can also add the MCP server as a project dependency:

```bash
# Add as a development dependency
npm install --save-dev github-enterprise-mcp

# Add script to package.json
# "scripts": {
#   "mcp-server": "github-enterprise-mcp --token=YOUR_TOKEN"
# }

# Run using npm script
npm run mcp-server
```

## Development

To run in development mode with automatic reloading:

```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Port to run the web server (default: 3000) |
| GH_ENTERPRISE_URL | GitHub Enterprise URL (e.g., https://github.example.com) |
| GH_ENTERPRISE_API_URL | GitHub Enterprise API URL (e.g., https://github.example.com/api/v3) |
| GH_AUTH_METHOD | Authentication method: 'token' or 'oauth' |
| GH_TOKEN | Personal Access Token (for token authentication) |
| GH_MFA_BEARER_TOKEN | MFA Bearer token for "MFA:bearer" header (optional) |
| GH_USERNAME | GitHub username (for token authentication) |
| GH_CLIENT_ID | GitHub OAuth App Client ID (for OAuth authentication) |
| GH_CLIENT_SECRET | GitHub OAuth App Client Secret (for OAuth authentication) |
| GH_CALLBACK_URL | OAuth callback URL (for OAuth authentication) |
| SESSION_SECRET | Secret for session encryption |

## MCP Tools

This server provides the following tools for GitHub Copilot to use:

- `list-repositories`: List repositories for the authenticated user
- `create-branch`: Create a new branch in a GitHub repository
- `list-branches`: List branches in a GitHub repository
- `get-repository`: Get information about a GitHub repository

## Authentication Methods

### Token-based Authentication (Recommended)

This method uses a Personal Access Token (PAT) with HTTP Basic Authentication, similar to how Git handles authentication:

1. Create a Personal Access Token in your GitHub Enterprise instance with the appropriate scopes:
   - `repo` (Full control of repositories)
   - `user` (Read-only access to user profile info)

2. Configure the `.env` file:

```
# Authentication method
GH_AUTH_METHOD=token

# Token authentication
GH_TOKEN=your_personal_access_token
```

3. Start the server:

```bash
npm start
```

4. The server will authenticate using your token, and will also accept HTTP Basic Authentication requests where the token is provided as the password (like Git).

#### Testing HTTP Basic Authentication

You can test HTTP Basic Auth using curl:

```bash
# Replace YOUR_PAT with your Personal Access Token
# The username can be anything when using token authentication
curl -u 'username:YOUR_PAT' http://localhost:3000/api/auth/basic
```

A successful response will look like:

```json
{
  "authenticated": true,
  "message": "Successfully authenticated as your_username",
  "username": "your_username"
}
```

### OAuth-based Authentication

For environments where you can't use a Personal Access Token or need multiple users to authenticate:

1. Create an OAuth App in your GitHub Enterprise instance as described in the [Setup](#setup) section.

2. Configure the `.env` file:

```
# Authentication method
GH_AUTH_METHOD=oauth

# OAuth authentication
GH_CLIENT_ID=your_client_id
GH_CLIENT_SECRET=your_client_secret
GH_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

3. Start the server:

```bash
npm start
```

4. Open the server URL in your browser and authenticate with your GitHub Enterprise credentials.

## Troubleshooting

### API URL Configuration

One of the most common issues is incorrect GitHub API URL configuration:

- **For GitHub.com**:
  - Enterprise URL: `https://github.com`
  - API URL: `https://api.github.com`  (Not `https://github.com/api/v3`)

- **For GitHub Enterprise Server**:
  - Enterprise URL: `https://github.example.com`
  - API URL: `https://github.example.com/api/v3`

### Authentication Issues

If you see an error message like "Failed to authenticate with provided token":

1. Verify your token has the necessary scopes (at minimum: `repo` and `user`)
2. Ensure your token is valid and hasn't expired
3. Check the API URL configuration (see above)
4. For enterprise installations, ensure your token has access to that instance

### MCP Integration Issues

When using the MCP server with VS Code:

1. Make sure the `.vscode/mcp.json` configuration has the correct environment variables 
2. Ensure the server builds successfully before starting it
3. Check the error messages in the VS Code output panel for details

You can run the server manually to see detailed error output:

```bash
npm run build
node dist/index.js
```

## VS Code Integration

To integrate the GitHub Enterprise MCP Server with VS Code, you can use a `mcp.json` file in your `.vscode` directory. This allows GitHub Copilot to communicate with your GitHub Enterprise instance.

### Creating an mcp.json file

1. Create a `.vscode` directory in your project if it doesn't exist yet
2. Create an `mcp.json` file inside the `.vscode` directory with the following content:

```json
{
  "servers": {
    "github-enterprise-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["--no-install", "github-enterprise-mcp"],
      "env": {
        "GH_AUTH_METHOD": "token",
        "GH_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "GH_MFA_BEARER_TOKEN": "mfa_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "GH_ENTERPRISE_URL": "https://github.com",
        "GH_ENTERPRISE_API_URL": "https://api.github.com"
      }
    }
  }
}
```

Replace the values with your own:
- `GH_TOKEN`: Your GitHub Personal Access Token (masked here for security)
- `GH_MFA_BEARER_TOKEN`: Your GitHub MFA bearer token (if your GitHub Enterprise instance requires SSO authentication)
- `GH_ENTERPRISE_URL`: Your GitHub Enterprise instance URL
- `GH_ENTERPRISE_API_URL`: Your GitHub Enterprise API URL

### Using with a Local Development Version

If you're developing the MCP server locally, you can point to your local version instead:

```json
{
  "servers": {
    "github-enterprise-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "GH_AUTH_METHOD": "token",
        "GH_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "GH_ENTERPRISE_URL": "https://github.com",
        "GH_ENTERPRISE_API_URL": "https://api.github.com"
      }
    }
  }
}
```

After creating the `mcp.json` file, restart VS Code for the changes to take effect.
