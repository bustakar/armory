"use node";

import { logError } from "./lib/errors";

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

// Custom error class for GitHub API errors
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public isRateLimit: boolean = false,
    public isNotFound: boolean = false
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

// Fetch timeout in milliseconds
const FETCH_TIMEOUT = 30000; // 30 seconds

// Wrapper for fetch with timeout support
async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Common headers for GitHub API requests
function getGitHubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Handle GitHub API response errors with detailed classification
async function handleGitHubResponse(
  response: Response,
  context: string
): Promise<void> {
  if (response.ok) return;

  const isRateLimit = response.status === 403 || response.status === 429;
  const isNotFound = response.status === 404;

  // Try to get error details from response body
  let errorDetails = "";
  try {
    const body = await response.json();
    errorDetails = body.message || "";
  } catch {
    // Ignore JSON parse errors
  }

  const message = errorDetails
    ? `GitHub API error (${response.status}) in ${context}: ${errorDetails}`
    : `GitHub API error (${response.status}) in ${context}`;

  throw new GitHubAPIError(message, response.status, isRateLimit, isNotFound);
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

  try {
    const response = await fetchWithTimeout(url, {
      headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
      // 404 means repo not found or no access - return empty array
      if (response.status === 404) {
        return [];
      }
      await handleGitHubResponse(response, `fetchCommits ${owner}/${repo}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    // Handle timeout and network errors
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchCommits", error, { owner, repo, username });
      throw new GitHubAPIError("Request timed out", 0);
    }
    logError("fetchCommits", error, { owner, repo, username });
    throw new GitHubAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown"}`, 0);
  }
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

  try {
    const response = await fetchWithTimeout(url, {
      headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      await handleGitHubResponse(response, `fetchClosedIssues ${owner}/${repo}`);
    }

    const issues: GitHubIssue[] = await response.json();

    // Filter to only issues assigned to or opened by the user
    return issues.filter(
      (issue) =>
        issue.user.login === username ||
        issue.assignees.some((a) => a.login === username)
    );
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchClosedIssues", error, { owner, repo, username });
      throw new GitHubAPIError("Request timed out", 0);
    }
    logError("fetchClosedIssues", error, { owner, repo, username });
    throw new GitHubAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown"}`, 0);
  }
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

  try {
    const response = await fetchWithTimeout(url, {
      headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      await handleGitHubResponse(response, `fetchMergedPRs ${owner}/${repo}`);
    }

    const prs: GitHubPullRequest[] = await response.json();

    // Filter to only PRs authored by user and merged since the given date
    return prs.filter((pr) => {
      if (pr.user.login !== username || !pr.merged_at) return false;
      return new Date(pr.merged_at) >= since;
    });
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchMergedPRs", error, { owner, repo, username });
      throw new GitHubAPIError("Request timed out", 0);
    }
    logError("fetchMergedPRs", error, { owner, repo, username });
    throw new GitHubAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown"}`, 0);
  }
}

// Fetch GitHub user profile
export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  try {
    const response = await fetchWithTimeout("https://api.github.com/user", {
      headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
      await handleGitHubResponse(response, "fetchGitHubUser");
    }

    return response.json();
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchGitHubUser", error);
      throw new GitHubAPIError("Request timed out", 0);
    }
    logError("fetchGitHubUser", error);
    throw new GitHubAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown"}`, 0);
  }
}

// Fetch user's repos
export async function fetchUserRepos(
  token: string
): Promise<Array<{ owner: { login: string }; name: string; full_name: string; private: boolean }>> {
  try {
    const response = await fetchWithTimeout(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      {
        headers: getGitHubHeaders(token),
      }
    );

    if (!response.ok) {
      await handleGitHubResponse(response, "fetchUserRepos");
    }

    return response.json();
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchUserRepos", error);
      throw new GitHubAPIError("Request timed out", 0);
    }
    logError("fetchUserRepos", error);
    throw new GitHubAPIError(`Network error: ${error instanceof Error ? error.message : "Unknown"}`, 0);
  }
}

// Fetch PR details (body content for issue linking detection)
export async function fetchPRDetails(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPRDetails | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: getGitHubHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      await handleGitHubResponse(response, `fetchPRDetails ${owner}/${repo}#${prNumber}`);
    }

    const pr = await response.json();
    return {
      number: pr.number,
      body: pr.body,
    };
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      // For PR details, we don't want to fail the entire scan
      // Log and return null
      logError("fetchPRDetails", error, { owner, repo, prNumber });
      return null;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logError("fetchPRDetails", error, { owner, repo, prNumber });
      return null;
    }
    logError("fetchPRDetails", error, { owner, repo, prNumber });
    return null;
  }
}
