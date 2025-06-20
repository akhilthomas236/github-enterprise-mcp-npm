// GitHub Enterprise MCP Server Configuration
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
  },

  // GitHub Enterprise configuration
  github: {
    // GitHub Enterprise URL (e.g., https://github.example.com)
    enterpriseUrl: process.env.GH_ENTERPRISE_URL || '',

    // GitHub Enterprise API URL (e.g., https://github.example.com/api/v3)
    enterpriseApiUrl: process.env.GH_ENTERPRISE_API_URL || '',

    // Authentication method: 'oauth' or 'token'
    authMethod: process.env.GH_AUTH_METHOD || 'token',
    // Number of items to fetch per list operation (max: 100)

    reposPerPage: parseInt(process.env.GH_LIST_LIMIT || '100', 10),

    // GitHub OAuth App client ID (for OAuth authentication)
    clientId: process.env.GH_CLIENT_ID || '',

    // GitHub OAuth App client secret (for OAuth authentication)
    clientSecret: process.env.GH_CLIENT_SECRET || '',

    // OAuth callback URL (for OAuth authentication)
    callbackUrl: process.env.GH_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',

    // Personal Access Token (for token authentication)
    token: process.env.GH_TOKEN || '',

    // MFA bearer token for additional authentication header
    mfaBearerToken: process.env.GH_MFA_BEARER_TOKEN || '',

    // Username associated with the token (for token authentication)
    username: process.env.GH_USERNAME || '',
  },

  // MCP Server configuration
  mcp: {
    // MCP Server name
    name: 'github-enterprise-mcp',

    // MCP Server version
    version: '1.0.4',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'github-enterprise-mcp-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production',
    },
  },
};

export default config;
