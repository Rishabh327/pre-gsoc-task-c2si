# pre-gsoc-task-c2si

Pre-GSoC task submission for [c2siorg/Webiu issue #541](https://github.com/c2siorg/Webiu/issues/541).

---

## Task 1 — Design

**Designing a Scalable GitHub Data Aggregation System**

See the full design document:

- 📄 [Task 1 Design Explanation](docs/task-1-design.md) — architecture, core components, rate limit handling, update mechanism, storage strategy, scalability plan, performance optimization, failure handling, API flow, and technology choices.
- 🗺️ [Architecture Diagram (Mermaid)](docs/architecture.mmd) — standalone Mermaid source file.

---

## Task 2 — Development

**GitHub Repository Intelligence Analyzer**

A Next.js web application that analyzes GitHub repositories and computes:

- **Activity Score** (0–100) — how actively the repo is maintained and used
- **Complexity Score** (0–100) — how complex the codebase is
- **Learning Difficulty** — Beginner / Intermediate / Advanced classification

📄 [Task 2 Design & Formula Documentation](docs/task-2.md)

### Live Demo

> Deploy your own instance (see [Deployment](#deployment) below).

### Features

- Textarea input for multiple GitHub repository URLs (up to 10 at once)
- Supports URL formats: `https://github.com/owner/repo`, `github.com/owner/repo`, `owner/repo`
- Per-repository structured report: metadata, fetched stats, computed scores, breakdowns, and warnings
- In-memory response caching (5-minute TTL) to minimize redundant API calls
- GitHub API rate limit display (remaining requests + reset time)
- Graceful handling of: invalid URLs, private/missing repos, archived repos, empty repos, rate limit errors
- Toggle-able score breakdown table and raw JSON view per result

### Running Locally

```bash
# 1. Install dependencies
npm install

# 2. (Recommended) Set your GitHub token for higher API rate limits
cp .env.example .env.local
# Then edit .env.local and add:  GITHUB_TOKEN=ghp_your_token_here

# 3. Start the development server
npm run dev

# Open http://localhost:3000
```

> **Without `GITHUB_TOKEN`**: GitHub allows 60 unauthenticated requests/hour.  
> **With `GITHUB_TOKEN`**: 5,000 authenticated requests/hour.  
> Each repository analysis uses approximately 4–5 API calls.

### Running Tests

```bash
npm test
```

### API Usage

You can also call the analysis endpoint directly:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://github.com/facebook/react", "vercel/next.js"]}'
```

Response format:
```json
{
  "reports": [
    {
      "input": "https://github.com/facebook/react",
      "status": "success",
      "stats": { "stars": 228000, "forks": 46500, ... },
      "scores": {
        "activityScore": 86.4,
        "complexityScore": 73.2,
        "learningDifficulty": "Advanced"
      },
      "breakdown": { "activity": { ... }, "complexity": { ... } },
      "warnings": [],
      "analyzedAt": "2026-03-29T12:00:00.000Z",
      "cached": false
    }
  ],
  "rateLimit": { "remaining": 4990, "limit": 5000, "resetAt": "..." },
  "analyzedAt": "2026-03-29T12:00:00.000Z"
}
```

### Deployment

#### Vercel (recommended)

1. Fork / clone this repository
2. Connect it to [Vercel](https://vercel.com/new)
3. Set the `GITHUB_TOKEN` environment variable under Project → Settings → Environment Variables
4. Deploy — Vercel auto-detects Next.js and uses `vercel.json` for configuration

```bash
# Or deploy via CLI
npm install -g vercel
vercel
vercel env add GITHUB_TOKEN production
```

#### Netlify

Netlify supports Next.js via the `@netlify/plugin-nextjs` adapter:

```bash
npm install -g netlify-cli
netlify init
netlify env:set GITHUB_TOKEN ghp_your_token_here
netlify deploy --prod
```

### Sample Outputs

Pre-generated reports for 5 repositories are in [`docs/samples/`](docs/samples/):

| Repository | File | Difficulty |
|---|---|---|
| `facebook/react` | [react.json](docs/samples/react.json) | Advanced |
| `vercel/next.js` | [nextjs.json](docs/samples/nextjs.json) | Advanced |
| `torvalds/linux` | [linux.json](docs/samples/linux.json) | Advanced |
| `firstcontributions/first-contributions` | [first-contributions.json](docs/samples/first-contributions.json) | Beginner |
| `sindresorhus/awesome` | [awesome.json](docs/samples/awesome.json) | Beginner |

### Formula Summary

| Metric | Key Inputs | Range |
|---|---|---|
| Activity Score | stars, forks, recent commits (90d), open issues, contributors, archived | 0–100 |
| Complexity Score | num languages, contributors, total commits, project age | 0–100 |
| Learning Difficulty | complexity score thresholds (≤33 Beginner, ≤66 Intermediate, >66 Advanced) | — |

See [docs/task-2.md](docs/task-2.md) for full formula details, assumptions, and limitations.
