/**
 * Debug utility for GitHub MCP Server
 * Provides structured logging and configuration diagnostics
 */

import config from '../config/config.js';

/**
 * Log levels for debugging
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/**
 * Current log level (can be set via environment variable)
 */
const currentLogLevel = process.env.LOG_LEVEL 
  ? parseInt(process.env.LOG_LEVEL, 10) 
  : LogLevel.INFO;

/**
 * Print configuration diagnostics at startup
 * Helps identify configuration issues early
 */
export function printConfigDiagnostics(): void {
  console.log('\n===== GitHub MCP Server Configuration =====');
  
  console.log(`\nServer Configuration:`);
  console.log(`- Port: ${config.server.port}`);

  console.log(`\nGitHub Configuration:`);
  console.log(`- Authentication Method: ${config.github.authMethod}`);
  console.log(`- GitHub Enterprise URL: ${config.github.enterpriseUrl || 'Not configured'}`);
  console.log(`- GitHub Enterprise API URL: ${config.github.enterpriseApiUrl || 'Not configured'}`);
  
  if (config.github.authMethod === 'token') {
    console.log(`- GitHub Token: ${config.github.token ? '************ (Set)' : 'Not configured'}`);
    console.log(`- GitHub Username: ${config.github.username || 'Not configured (Optional)'}`);
  } else {
    console.log(`- GitHub OAuth Client ID: ${config.github.clientId ? '************ (Set)' : 'Not configured'}`);
    console.log(`- GitHub OAuth Client Secret: ${config.github.clientSecret ? '************ (Set)' : 'Not configured'}`);
    console.log(`- OAuth Callback URL: ${config.github.callbackUrl}`);
  }

  if (!config.github.enterpriseApiUrl) {
    logError('GitHub API URL is not configured. Set GH_ENTERPRISE_API_URL in your environment.');
  }

  if (config.github.authMethod === 'token' && !config.github.token) {
    logError('Token authentication is selected but no token is provided. Set GH_TOKEN in your environment.');
  }

  if (config.github.authMethod === 'oauth' && (!config.github.clientId || !config.github.clientSecret)) {
    logError('OAuth authentication is selected but client credentials are missing. Set GH_CLIENT_ID and GH_CLIENT_SECRET in your environment.');
  }

  console.log('\n=========================================\n');
}

/**
 * Log a message with the specified log level
 */
export function log(level: LogLevel, message: string, ...args: any[]): void {
  if (level <= currentLogLevel) {
    const prefix = getLogPrefix(level);
    console.log(`${prefix} ${message}`, ...args);
  }
}

/**
 * Log an error message
 */
export function logError(message: string, error?: any): void {
  const prefix = getLogPrefix(LogLevel.ERROR);
  if (error) {
    console.error(`${prefix} ${message}`, error);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Log a warning message
 */
export function logWarning(message: string, ...args: any[]): void {
  log(LogLevel.WARN, message, ...args);
}

/**
 * Log an info message
 */
export function logInfo(message: string, ...args: any[]): void {
  log(LogLevel.INFO, message, ...args);
}

/**
 * Log a debug message
 */
export function logDebug(message: string, ...args: any[]): void {
  log(LogLevel.DEBUG, message, ...args);
}

/**
 * Get prefix for log message based on level
 */
function getLogPrefix(level: LogLevel): string {
  const timestamp = new Date().toISOString();
  switch (level) {
    case LogLevel.ERROR:
      return `[${timestamp}] [ERROR]`;
    case LogLevel.WARN:
      return `[${timestamp}] [WARN]`;
    case LogLevel.INFO:
      return `[${timestamp}] [INFO]`;
    case LogLevel.DEBUG:
      return `[${timestamp}] [DEBUG]`;
    default:
      return `[${timestamp}]`;
  }
}
