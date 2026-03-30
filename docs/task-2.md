# Task 2 — Development: GitHub Repository Intelligence Analyzer

## Overview

This document describes the formulas, assumptions, limitations, and implementation details for the **GitHub Repository Intelligence Analyzer** built as Task 2 of the pre-GSoC submission for [c2siorg/Webiu #541](https://github.com/c2siorg/Webiu/issues/541).

---

## 1. Activity Score

**Purpose:** Measures how actively a repository is currently being used and maintained.

**Formula:**

```
activityScore = clamp(0, 100,
    starComponent
  + forkComponent
  + commitComponent
  + issueComponent
  + contributorComponent
  + archivedPenalty
)
```

| Component | Formula | Max |
|---|---|---|
| `starComponent` | `min(35, log₁₀(stars + 1) × 14)` | 35 |
| `forkComponent` | `min(20, log₁₀(forks + 1) × 10)` | 20 |
| `commitComponent` | `min(25, log₁₀(recentCommits90d + 1) × 10)` | 25 |
| `issueComponent` | `min(10, log₁₀(openIssues + 1) × 4)` | 10 |
| `contributorComponent` | `min(10, log₁₀(contributors + 1) × 5)` | 10 |
| `archivedPenalty` | `−30` if archived, else `0` | — |

**Rationale:**
- Logarithmic scaling prevents mega-repos (millions of stars) from dominating at the expense of smaller active repos.
- Recent commits (last 90 days) capture current activity better than total commit count.
- Stars and forks together represent community interest and adoption.
- Open issues indicate an active user base that is reporting problems and requesting features.
- Archived penalty reflects that archived repos are frozen in time and not actively maintained.

**Score interpretation:**
| Range | Interpretation |
|---|---|
| 0–20 | Low activity — likely inactive, new, or archived |
| 21–50 | Moderate activity — growing or niche project |
| 51–80 | High activity — popular and well maintained |
| 81–100 | Very high activity — major popular project |

---

## 2. Complexity Score

**Purpose:** Estimates the inherent complexity of the codebase, which reflects how hard it is to understand, navigate, and contribute to it.

**Formula:**

```
complexityScore = clamp(0, 100,
    languageComponent
  + contributorComponent
  + commitComponent
  + ageComponent
)
```

| Component | Formula | Max |
|---|---|---|
| `languageComponent` | `min(20, numLanguages × 4)` | 20 |
| `contributorComponent` | `min(30, log₁₀(contributors + 1) × 15)` | 30 |
| `commitComponent` | `min(30, log₁₀(totalCommits + 1) × 8)` | 30 |
| `ageComponent` | `min(20, ageInYears × 4)` | 20 |

**Rationale:**
- **Languages:** Polyglot codebases require knowledge of multiple ecosystems and toolchains.
- **Contributors:** More contributors generally means more code patterns, coding styles, and conventions to navigate.
- **Total commits:** A large commit history implies more accumulated code, more refactors, and more historical context needed to understand the codebase.
- **Age:** Older projects tend to accumulate technical debt, legacy patterns, and deeper domain knowledge requirements.

**Score interpretation:**
| Range | Interpretation |
|---|---|
| 0–33 | Low complexity — focused or young codebase |
| 34–66 | Medium complexity — established multi-component project |
| 67–100 | High complexity — large, multi-language, long-lived codebase |

---

## 3. Learning Difficulty Classification

Maps directly from the **Complexity Score** using fixed thresholds:

| Complexity Score | Classification |
|---|---|
| 0 – 33 | **Beginner** |
| 34 – 66 | **Intermediate** |
| 67 – 100 | **Advanced** |

**Rationale for thresholds:**
- The three-tier classification mirrors common open-source contribution labels (good-first-issue, help-wanted, etc.).
- Equal-width buckets (33 points each) are used to avoid arbitrary weighting; the complexity formula itself handles the differentiation.

---

## 4. Data Fetched from GitHub API

The analyzer uses the **GitHub REST API via Octokit** (`@octokit/rest`). The following data points are fetched per repository:

| Data Point | API Endpoint | Used In |
|---|---|---|
| Repository metadata (stars, forks, open issues, archived, size, default branch, license, topics, timestamps) | `GET /repos/{owner}/{repo}` | Both scores |
| Languages breakdown | `GET /repos/{owner}/{repo}/languages` | Complexity |
| Contributors count | `GET /repos/{owner}/{repo}/contributors?per_page=1` + `Link` header | Both scores |
| Recent commits (last 90 days) | `GET /repos/{owner}/{repo}/commits?since=<90d ago>&per_page=100` | Activity |
| Total commit count | `GET /repos/{owner}/{repo}/stats/commit_activity` (fallback: list commits) | Complexity |
| Rate limit status | `GET /rate_limit` | Informational |

---

## 5. Rate Limit Handling

| Strategy | Details |
|---|---|
| **Authenticated requests** | When `GITHUB_TOKEN` is set, the limit is 5,000 requests/hour (vs 60/hour unauthenticated) |
| **Concurrency control** | Repos are analyzed in batches of 3 to avoid request spikes |
| **In-memory caching** | Results are cached for 5 minutes per serverless instance (keyed by normalized URL) |
| **Graceful 403/429 handling** | API errors due to rate limiting return a user-friendly message instead of crashing |
| **Contributor count optimization** | Fetches only 1 contributor + reads the `Link` header to find the last page count — avoids paginating through all contributors |
| **Informational rate-limit display** | After every analysis, the UI shows remaining requests and reset time |

---

## 6. Edge Cases

| Edge Case | Handling |
|---|---|
| **Invalid URL** | Returns an error report with a descriptive message; does not crash |
| **Private or deleted repo** | GitHub returns 404 — caught and returned as an error report |
| **Empty repository** | Detected via `size === 0`; commit fetching is skipped; a warning is added |
| **Archived repository** | Detected via `archived === true`; activity score is penalized by −30 points; a warning is added |
| **No language data** | Falls back to 0 for the language component; a warning is added |
| **Rate limit exceeded** | 403/429 status is caught; a descriptive message is returned with advice to set `GITHUB_TOKEN` |
| **Inaccessible repo (legal)** | HTTP 451 is caught with a specific message |
| **Missing contributors** | Defaults to 0; scoring proceeds with remaining available data |

---

## 7. Assumptions and Limitations

- **Commit activity stats endpoint** (`/repos/{owner}/{repo}/stats/commit_activity`) may return `202 Accepted` on the first request while GitHub computes the stats asynchronously. The analyzer falls back to the commits list endpoint in this case.
- **Recent commits** are capped at 100 per fetch (the API maximum). Repos with more than 100 commits in 90 days still get the maximum commit component score.
- **Total commit count** uses the commit activity stats API (which only covers the last 52 weeks). For very old repos, this under-counts total commits, slightly under-estimating complexity.
- **Private repositories** cannot be analyzed without a token that has access to them.
- **Organization repositories** with disabled statistics may return empty data for some endpoints.
- **Fork count** includes all forks, not just active ones. A high fork count on a tutorial/template repo may inflate the activity score.
- The in-memory cache is per-serverless-instance and is not shared across instances. Persistent caching (e.g. Vercel KV / Upstash Redis) was not implemented to avoid requiring additional environment variables for the demo.

---

## 8. Architecture

```
Browser (React/Next.js)
    │
    │  POST /api/analyze { urls: [...] }
    ▼
API Route (Next.js App Router — /app/api/analyze/route.ts)
    │
    ├─ Input validation (max 10 URLs, string filtering)
    │
    ├─ analyzeRepos() — lib/analyzer.ts
    │     ├─ parseRepoUrl() — lib/utils.ts
    │     ├─ In-memory cache check
    │     ├─ Octokit REST calls (batched, concurrency=3)
    │     └─ computeScores() — lib/scoring.ts
    │           ├─ computeActivityScore()
    │           ├─ computeComplexityScore()
    │           └─ classifyLearningDifficulty()
    │
    └─ Response: { reports: RepoReport[], rateLimit, analyzedAt }
```

---

## 9. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Optional but strongly recommended | GitHub Personal Access Token (PAT) or GitHub App installation token. Increases rate limit from 60 to 5,000 requests/hour. |

Without `GITHUB_TOKEN`, the analyzer is limited to 60 unauthenticated requests per hour. Each repository analysis uses approximately 4–5 API requests.

### Setting `GITHUB_TOKEN` locally

```bash
# .env.local (never commit this file)
GITHUB_TOKEN=ghp_your_token_here
```

### Setting on Vercel

```
vercel env add GITHUB_TOKEN
```

---

## 10. Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/Rishabh327/pre-gsoc-task-c2si.git
cd pre-gsoc-task-c2si

# 2. Install dependencies
npm install

# 3. (Optional) Add your GitHub token
echo "GITHUB_TOKEN=ghp_your_token_here" > .env.local

# 4. Start the development server
npm run dev

# Open http://localhost:3000
```

### Running tests

```bash
npm test
```

---

## 11. Deployment on Vercel

The application is configured for Vercel with `vercel.json`. The API route runs as a Node.js serverless function.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set production environment variable
vercel env add GITHUB_TOKEN production
```

Or connect the GitHub repository directly in the [Vercel dashboard](https://vercel.com/new) and set `GITHUB_TOKEN` under Project → Settings → Environment Variables.

---

## 12. Sample Outputs

Pre-generated sample reports for 5 repositories are available in [`docs/samples/`](./samples/):

| Repository | File |
|---|---|
| `facebook/react` | [`react.json`](./samples/react.json) |
| `vercel/next.js` | [`nextjs.json`](./samples/nextjs.json) |
| `torvalds/linux` | [`linux.json`](./samples/linux.json) |
| `firstcontributions/first-contributions` | [`first-contributions.json`](./samples/first-contributions.json) |
| `sindresorhus/awesome` | [`awesome.json`](./samples/awesome.json) |

*Note: Sample outputs were generated at a point in time and scores will differ slightly when re-run due to changing star counts, recent commit activity, and contributor numbers.*
