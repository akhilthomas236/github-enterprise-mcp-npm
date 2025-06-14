/**
 * Repository-related type definitions
 */

/**
 * GitHub repository information
 */
export interface GitHubRepository {
  id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: string;
  };
  private: boolean;
  description?: string;
  url: string;
  html_url: string;
  visibility: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

/**
 * GitHub branch information
 */
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}
