"use node";

// GitHub API types
export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
  } | null;
}

export interface GitHubIssue {
  number: number;
  state: string;
  closed_at: string | null;
  user: {
    login: string;
  };
  assignees: Array<{ login: string }>;
}

export interface GitHubPullRequest {
  number: number;
  state: string;
  merged_at: string | null;
  user: {
    login: string;
  };
  body?: string | null;
}

export interface GitHubPRDetails {
  number: number;
  body: string | null;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

// Fetch commits since a given date
export async function fetchCommits(
  token: string,
  owner: string,
  repo: string,
  username: string,
  since: Date
): Promise<GitHubCommit[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/commits`);
  url.searchParams.set("author", username);
  url.searchParams.set("since", since.toISOString());
  url.searchParams.set("per_page", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

// Fetch closed issues since a given date
export async function fetchClosedIssues(
  token: string,
  owner: string,
  repo: string,
  username: string,
  since: Date
): Promise<GitHubIssue[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`);
  url.searchParams.set("state", "closed");
  url.searchParams.set("since", since.toISOString());
  url.searchParams.set("per_page", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const issues: GitHubIssue[] = await response.json();

  // Filter to only issues assigned to or opened by the user
  return issues.filter(
    (issue) =>
      issue.user.login === username ||
      issue.assignees.some((a) => a.login === username)
  );
}

// Fetch merged PRs since a given date
export async function fetchMergedPRs(
  token: string,
  owner: string,
  repo: string,
  username: string,
  since: Date
): Promise<GitHubPullRequest[]> {
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
  url.searchParams.set("state", "closed");
  url.searchParams.set("per_page", "100");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const prs: GitHubPullRequest[] = await response.json();

  // Filter to only PRs authored by user and merged since the given date
  return prs.filter((pr) => {
    if (pr.user.login !== username || !pr.merged_at) return false;
    return new Date(pr.merged_at) >= since;
  });
}

// Fetch GitHub user profile
export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

// Fetch user's repos
export async function fetchUserRepos(
  token: string
): Promise<Array<{ owner: { login: string }; name: string; full_name: string; private: boolean }>> {
  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
}

// Fetch PR details (body content for issue linking detection)
export async function fetchPRDetails(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPRDetails | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const pr = await response.json();
  return {
    number: pr.number,
    body: pr.body,
  };
}
