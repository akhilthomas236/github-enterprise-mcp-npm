/**
 * Special configuration handling for MCP server environment
 * This allows the server to run properly when invoked through VS Code's MCP integration
 */

import config from './config.js';

/**
 * Check if the server is running in an MCP context and provide fallback values
 * for required configuration settings to ensure proper operation
 */
export const validateMcpConfig = (): boolean => {
  let isValid = true;
  
  // Check authentication method configuration
  if (!config.github.authMethod) {
    console.log('MCP Config: No authentication method specified, defaulting to token');
    config.github.authMethod = 'token';
  }
  
  // For token auth, ensure we have a minimal valid configuration
  if (config.github.authMethod === 'token') {
    if (!config.github.token) {
      // Check if GH_TOKEN is provided in environment but not loaded
      if (process.env.GH_TOKEN) {
        config.github.token = process.env.GH_TOKEN;
        console.log('MCP Config: Using token from environment');
      } else {
        console.error('MCP Config: No GitHub token configured. Please set GH_TOKEN in mcp.json or .env file');
        isValid = false;
      }
    }
  }
  
  // For OAuth auth, ensure we have proper OAuth configuration
  else if (config.github.authMethod === 'oauth') {
    if (!config.github.clientId || !config.github.clientSecret) {
      console.error('MCP Config: OAuth authentication requires clientId and clientSecret');
      isValid = false;
    }
  }
  
  return isValid;
};
