# Release Notes - v1.0.2

## MFA Bearer Token Support

This version adds comprehensive support for GitHub Enterprise instances that require MFA (Multi-Factor Authentication) using bearer tokens, which is common in SSO (Single Sign-On) authentication scenarios.

### New Features

- Added `--mfa-token` CLI option to specify the MFA bearer token
- Updated documentation with MFA token examples and configuration details
- Added MFA token support to the programmatic API in wrapper.ts
- Updated the VS Code mcp.json configuration example to include the MFA token

### Usage Examples

Command line usage with MFA token:
```bash
npx github-enterprise-mcp --token=ghp_yourtokenhere --mfa-token=mfa_yourmfatokenhere
```

Environment variable configuration:
```
GH_TOKEN=your_personal_access_token
GH_MFA_BEARER_TOKEN=your_mfa_bearer_token
```

VS Code integration with mcp.json:
```json
{
  "servers": {
    "github-enterprise-mcp": {
      "env": {
        "GH_TOKEN": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "GH_MFA_BEARER_TOKEN": "mfa_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Technical Details

The MFA bearer token is added as a custom "MFA" header with the format: `MFA: bearer TOKEN` in all API requests to GitHub Enterprise.

For security purposes, all tokens are masked in log outputs, showing only the last 4 characters.
