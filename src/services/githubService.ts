import { Octokit } from '@octokit/rest';
import { User } from '../auth/githubAuth.js';
import config from '../config/config.js';

/**
 * GitHub service for interaction with GitHub Enterprise API
 * Handles repository operations like listing repos and creating branches
 */
export class GitHubService {
  private octokit: Octokit;
  
  /**
   * Create a new GitHub service instance with the authenticated user's token
   * @param user Authenticated user with access token
   */
  constructor(user: User) {
    // Get MFA Bearer token from environment variable for API requests
    const mfaBearerToken = process.env.GH_MFA_BEARER_TOKEN || '';
    
    // Log MFA token status before creating Octokit instance
    console.log(`[GitHubService] MFA Token Status: Available: ${!!mfaBearerToken}, Length: ${mfaBearerToken?.length || 0}`);
    
    this.octokit = new Octokit({
      auth: user.accessToken,
      ...(config.github.enterpriseApiUrl && {
        baseUrl: config.github.enterpriseApiUrl,
      }),
      request: {
        headers: {
          // Format MFA header according to GitHub Enterprise requirements
          // Most instances use "MFA: bearer TOKEN" format
          "MFA": mfaBearerToken ? `bearer ${mfaBearerToken}` : '',
          // Some GitHub Enterprise instances might use these alternate formats:
          // "X-GitHub-OTP": mfaBearerToken || '',
          // "X-MFA-Token": mfaBearerToken || '',
        },
        hook: {
          beforeRequest: (request: any) => {
            // Make a deep copy for logging to avoid modifying the original request
            const maskedRequest = JSON.parse(JSON.stringify(request));
            
            // Log the raw headers for debugging (before masking)
            console.log('[GitHubService DEBUG] Raw request headers keys:', Object.keys(request.headers));
            
            // Mask auth token if present in headers
            if (maskedRequest.headers && maskedRequest.headers.authorization) {
              maskedRequest.headers = { 
                ...maskedRequest.headers,
                authorization: 'Bearer xxxx' + (maskedRequest.headers.authorization as string).substring((maskedRequest.headers.authorization as string).length - 4)
              };
            }
            
            // Mask MFA token if present in headers and log its presence
            if (maskedRequest.headers && maskedRequest.headers.MFA) {
              console.log('[GitHubService DEBUG] MFA header is present with value length:', (request.headers.MFA as string).length);
              maskedRequest.headers = { 
                ...maskedRequest.headers,
                MFA: (maskedRequest.headers.MFA as string).replace(/bearer\\s+([^$]+)/, 'bearer xxxx' + (maskedRequest.headers.MFA as string).substring((maskedRequest.headers.MFA as string).length - 4))
              };
            } else {
              console.log('[GitHubService DEBUG] MFA header is NOT present in request headers');
            }
            
            // Check for alternate MFA header formats
            ['X-GitHub-OTP', 'X-MFA-Token'].forEach(headerName => {
              if (maskedRequest.headers && maskedRequest.headers[headerName]) {
                console.log(`[GitHubService DEBUG] ${headerName} header is present`);
              }
            });
            
            // Log the masked request details
            console.log('GitHub Service API Request:', {
              method: maskedRequest.method,
              url: maskedRequest.url,
              headers: maskedRequest.headers,
              // Don't log body to avoid exposing sensitive data
            });
          }
        }
      }
    });
  }

  /**
   * List repositories for the authenticated user
   * @returns List of repositories
   */
  async listRepositories() {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });
      
      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        visibility: repo.visibility,
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
      }));
    } catch (error) {
      console.error('Error listing repositories:', error);
      throw error;
    }
  }

  /**
   * Create a new branch in a repository
   * @param owner Repository owner
   * @param repo Repository name
   * @param branch New branch name
   * @param sourceBranch Source branch to create from (defaults to the default branch)
   * @returns Status of the branch creation
   */
  async createBranch(owner: string, repo: string, branch: string, sourceBranch?: string) {
    try {
      // If source branch not provided, get the default branch
      if (!sourceBranch) {
        const { data: repository } = await this.octokit.repos.get({
          owner,
          repo,
        });
        sourceBranch = repository.default_branch;
      }

      // Get the SHA of the source branch's latest commit
      const { data: sourceBranchRef } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${sourceBranch}`,
      });

      const sourceSha = sourceBranchRef.object.sha;

      // Create the new branch reference
      const { data } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: sourceSha,
      });

      return {
        success: true,
        ref: data.ref,
        url: data.url,
        branch,
        source_branch: sourceBranch,
      };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  /**
   * List branches in a repository
   * @param owner Repository owner
   * @param repo Repository name
   * @returns List of branches
   */
  async listBranches(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });
      
      return data.map(branch => ({
        name: branch.name,
        protected: branch.protected,
        commit: branch.commit.sha,
      }));
    } catch (error) {
      console.error('Error listing branches:', error);
      throw error;
    }
  }

  /**
   * Get repository information
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Repository information
   */
  async getRepository(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });
      
      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        html_url: data.html_url,
        visibility: data.visibility,
        default_branch: data.default_branch,
        updated_at: data.updated_at,
        owner: {
          login: data.owner.login,
          id: data.owner.id,
          type: data.owner.type,
        },
      };
    } catch (error) {
      console.error('Error getting repository information:', error);
      throw error;
    }
  }
}
