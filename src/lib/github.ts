import type {
  GitHubUser,
  GitHubRepo,
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubMilestone,
} from "./types";

const GITHUB_API = "https://api.github.com";

// GitHub API client
export class GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${GITHUB_API}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Not found");
      }
      if (response.status === 403) {
        throw new Error("Rate limit exceeded or insufficient permissions");
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  // Get authenticated user
  async getUser(): Promise<GitHubUser> {
    return this.fetch<GitHubUser>("/user");
  }

  // Get user's repos
  async getRepos(): Promise<GitHubRepo[]> {
    return this.fetch<GitHubRepo[]>("/user/repos?per_page=100&sort=pushed");
  }

  // Get commits for a repo (since a date)
  async getCommits(owner: string, repo: string, since?: string): Promise<GitHubCommit[]> {
    const params = new URLSearchParams({ per_page: "100" });
    if (since) {
      params.set("since", since);
    }
    return this.fetch<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?${params}`);
  }

  // Get closed issues for a repo (since a date)
  async getClosedIssues(owner: string, repo: string, since?: string): Promise<GitHubIssue[]> {
    const params = new URLSearchParams({
      state: "closed",
      per_page: "100",
    });
    if (since) {
      params.set("since", since);
    }
    return this.fetch<GitHubIssue[]>(`/repos/${owner}/${repo}/issues?${params}`);
  }

  // Get merged PRs for a repo
  async getMergedPRs(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams({
      state: "closed",
      per_page: "100",
    });
    const prs = await this.fetch<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls?${params}`);
    return prs.filter((pr) => pr.merged_at !== null);
  }

  // Get milestones for a repo
  async getMilestones(owner: string, repo: string): Promise<GitHubMilestone[]> {
    const params = new URLSearchParams({
      state: "all",
      per_page: "100",
    });
    return this.fetch<GitHubMilestone[]>(`/repos/${owner}/${repo}/milestones?${params}`);
  }

  // Get repo details
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.fetch<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  // Get open issues count
  async getOpenIssuesCount(owner: string, repo: string): Promise<number> {
    const repo_data = await this.getRepo(owner, repo);
    // open_issues_count includes PRs, but it's a good approximation
    return (repo_data as GitHubRepo & { open_issues_count?: number }).open_issues_count || 0;
  }
}

// OAuth helpers
export const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

export function getGitHubAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user repo",
    state,
  });
  return `${GITHUB_OAUTH_URL}?${params}`;
}

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

// Helper to check if user has committed today
export function hasCommittedToday(commits: GitHubCommit[]): boolean {
  const today = new Date().toISOString().split("T")[0];
  return commits.some((c) => c.commit.author.date.startsWith(today));
}

// Group commits by date
export function groupCommitsByDate(commits: GitHubCommit[]): Map<string, GitHubCommit[]> {
  const grouped = new Map<string, GitHubCommit[]>();
  for (const commit of commits) {
    const date = commit.commit.author.date.split("T")[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(commit);
  }
  return grouped;
}

// Group issues by closed date
export function groupIssuesByClosedDate(issues: GitHubIssue[]): Map<string, GitHubIssue[]> {
  const grouped = new Map<string, GitHubIssue[]>();
  for (const issue of issues) {
    if (issue.closed_at) {
      const date = issue.closed_at.split("T")[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(issue);
    }
  }
  return grouped;
}
