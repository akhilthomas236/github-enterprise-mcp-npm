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
    this.octokit = new Octokit({
      auth: user.accessToken,
      ...(config.github.enterpriseApiUrl && {
        baseUrl: config.github.enterpriseApiUrl,
      }),
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
   * Get repo metadata
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Repository metadata
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
      };
    } catch (error) {
      console.error('Error getting repository:', error);
      throw error;
    }
  }
}
