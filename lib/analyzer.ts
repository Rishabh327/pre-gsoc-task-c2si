import { Octokit } from "@octokit/rest";
import { RepoStats, RepoReport } from "./types";
import { computeScores } from "./scoring";
import { parseRepoUrl } from "./utils";

export { parseRepoUrl } from "./utils";

// In-memory cache for the lifetime of a serverless function instance
const cache = new Map<string, { data: RepoReport; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  return new Octokit({ auth: token });
}

async function getRecentCommitCount(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<number> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      since: since.toISOString(),
      per_page: 100,
    });
    return response.data.length;
  } catch {
    return 0;
  }
}

async function getTotalCommitCount(
  octokit: Octokit,
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<number> {
  try {
    const { data } = await octokit.repos.getCommitActivityStats({
      owner,
      repo,
    });
    if (Array.isArray(data)) {
      return data.reduce((sum, week) => sum + (week.total || 0), 0);
    }
    return 0;
  } catch {
    try {
      const response = await octokit.repos.listCommits({
        owner,
        repo,
        sha: defaultBranch,
        per_page: 1,
      });
      const link = response.headers.link;
      if (link) {
        const match = link.match(/page=(\d+)>; rel="last"/);
        if (match) return parseInt(match[1], 10);
      }
      return response.data.length;
    } catch {
      return 0;
    }
  }
}

async function getContributorCount(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<number> {
  try {
    const response = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 1,
      anon: "false",
    });
    const link = response.headers.link;
    if (link) {
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) return parseInt(match[1], 10);
    }
    return response.data.length;
  } catch {
    return 0;
  }
}

export async function analyzeRepo(
  octokit: Octokit,
  input: string
): Promise<RepoReport> {
  const parsedAt = new Date().toISOString();
  const warnings: string[] = [];

  const cacheKey = input.trim().toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, cached: true };
  }

  const parsed = parseRepoUrl(input);
  if (!parsed) {
    return {
      input,
      status: "error",
      warnings: [],
      error: `Cannot parse "${input}" as a GitHub repository URL. Expected formats: https://github.com/owner/repo or owner/repo`,
      analyzedAt: parsedAt,
      cached: false,
    };
  }

  const { owner, name } = parsed;

  try {
    const { data: repo } = await octokit.repos.get({ owner, repo: name });

    if (repo.archived) {
      warnings.push("This repository is archived and no longer actively maintained.");
    }

    const isEmpty = repo.size === 0;
    if (isEmpty) {
      warnings.push("This repository appears to be empty (size = 0).");
    }

    let languages: Record<string, number> = {};
    try {
      const { data: langs } = await octokit.repos.listLanguages({ owner, repo: name });
      languages = langs as Record<string, number>;
    } catch {
      warnings.push("Could not fetch language data.");
    }

    if (Object.keys(languages).length === 0) {
      warnings.push("No language data available — language-based scoring uses defaults.");
    }

    const defaultBranch = repo.default_branch || "main";
    const contributors = await getContributorCount(octokit, owner, name);

    let recentCommits = 0;
    let totalCommits = 0;
    if (!isEmpty) {
      [recentCommits, totalCommits] = await Promise.all([
        getRecentCommitCount(octokit, owner, name, defaultBranch),
        getTotalCommitCount(octokit, owner, name, defaultBranch),
      ]);
    }

    const createdAt = repo.created_at ?? new Date().toISOString();
    const ageInDays = Math.max(
      0,
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const stats: RepoStats = {
      owner,
      name,
      fullName: repo.full_name,
      description: repo.description ?? null,
      url: repo.html_url,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      openIssues: repo.open_issues_count ?? 0,
      watchers: repo.watchers_count ?? 0,
      contributors,
      languages,
      recentCommits,
      totalCommits,
      ageInDays: Math.round(ageInDays),
      isArchived: repo.archived ?? false,
      isEmpty,
      defaultBranch,
      license: repo.license?.name ?? null,
      topics: repo.topics ?? [],
      createdAt,
      pushedAt: repo.pushed_at ?? null,
    };

    const { scores, breakdown } = computeScores(stats);

    if (scores.activityScore < 10) {
      warnings.push("Very low activity score — this may be an inactive or newly created repository.");
    }

    const report: RepoReport = {
      input,
      status: warnings.length > 0 ? "warning" : "success",
      stats,
      scores,
      breakdown,
      warnings,
      analyzedAt: parsedAt,
      cached: false,
    };

    cache.set(cacheKey, { data: report, expiresAt: Date.now() + CACHE_TTL_MS });
    return report;
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    let errorMsg = error?.message ?? "Unknown error";

    if (error?.status === 404) {
      errorMsg = `Repository "${owner}/${name}" not found. It may be private, renamed, or deleted.`;
    } else if (error?.status === 403) {
      errorMsg =
        "Access forbidden — the repository may be private, or you have hit the GitHub API rate limit. Set GITHUB_TOKEN to increase limits.";
    } else if (error?.status === 451) {
      errorMsg = `Repository "${owner}/${name}" is unavailable for legal reasons.`;
    } else if (error?.status === 429) {
      errorMsg = "GitHub API rate limit exceeded. Please wait before retrying, or provide a GITHUB_TOKEN.";
    }

    return {
      input,
      status: "error",
      warnings: [],
      error: errorMsg,
      analyzedAt: parsedAt,
      cached: false,
    };
  }
}

export async function analyzeRepos(inputs: string[]): Promise<{
  reports: RepoReport[];
  rateLimit?: { remaining: number; limit: number; resetAt: string };
}> {
  const octokit = createOctokit();

  const CONCURRENCY = 3;
  const reports: RepoReport[] = [];

  for (let i = 0; i < inputs.length; i += CONCURRENCY) {
    const batch = inputs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((url) => analyzeRepo(octokit, url))
    );
    reports.push(...batchResults);
  }

  let rateLimit: { remaining: number; limit: number; resetAt: string } | undefined;
  try {
    const { data } = await octokit.rateLimit.get();
    rateLimit = {
      remaining: data.rate.remaining,
      limit: data.rate.limit,
      resetAt: new Date(data.rate.reset * 1000).toISOString(),
    };
  } catch {
    // Rate limit info is optional
  }

  return { reports, rateLimit };
}
