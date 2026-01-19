import { GitCommit } from "./types";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

export async function fetchGitHubCommits(
  owner: string,
  repo: string,
  perPage = 100,
  page = 1
): Promise<GitCommit[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      // Add auth header if GITHUB_TOKEN is available
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found`);
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Try again later.");
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const commits: GitHubCommit[] = await response.json();

  return commits.map((c) => ({
    hash: c.sha.substring(0, 7),
    message: c.commit.message,
    date: c.commit.author.date,
    author: c.commit.author.name,
  }));
}

export async function fetchAllCommits(owner: string, repo: string): Promise<GitCommit[]> {
  const allCommits: GitCommit[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const commits = await fetchGitHubCommits(owner, repo, perPage, page);
    allCommits.push(...commits);

    if (commits.length < perPage) {
      break;
    }

    page++;

    // Safety limit to prevent infinite loops
    if (page > 100) {
      break;
    }
  }

  return allCommits;
}

export async function checkRepoExists(owner: string, repo: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  return response.ok;
}
