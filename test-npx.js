#!/usr/bin/env node

// Test script to simulate running via npx
console.log('Testing GitHub Enterprise MCP Server via npx...');

// Import the CLI script directly
import('../dist/cli.js')
  .catch(error => {
    console.error('Failed to load CLI:', error);
    process.exit(1);
  });
