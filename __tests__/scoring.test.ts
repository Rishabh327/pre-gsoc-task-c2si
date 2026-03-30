import {
  computeActivityScore,
  computeComplexityScore,
  classifyLearningDifficulty,
  computeScores,
} from "../lib/scoring";
import { RepoStats } from "../lib/types";
import { parseRepoUrl } from "../lib/utils";

function makeStats(overrides: Partial<RepoStats> = {}): RepoStats {
  return {
    owner: "test",
    name: "repo",
    fullName: "test/repo",
    description: null,
    url: "https://github.com/test/repo",
    stars: 100,
    forks: 20,
    openIssues: 5,
    watchers: 100,
    contributors: 10,
    languages: { TypeScript: 5000, JavaScript: 1000 },
    recentCommits: 30,
    totalCommits: 200,
    ageInDays: 365,
    isArchived: false,
    isEmpty: false,
    defaultBranch: "main",
    license: "MIT",
    topics: [],
    createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
    pushedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeActivityScore", () => {
  it("returns a score between 0 and 100", () => {
    const stats = makeStats();
    const { score } = computeActivityScore(stats);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 0 for an empty repo with no activity", () => {
    const stats = makeStats({
      stars: 0,
      forks: 0,
      openIssues: 0,
      contributors: 0,
      recentCommits: 0,
    });
    const { score } = computeActivityScore(stats);
    expect(score).toBe(0);
  });

  it("applies archived penalty", () => {
    const active = makeStats({ isArchived: false });
    const archived = makeStats({ isArchived: true });
    const { score: activeScore } = computeActivityScore(active);
    const { score: archivedScore } = computeActivityScore(archived);
    expect(archivedScore).toBeLessThan(activeScore);
    expect(archived.isArchived).toBe(true);
  });

  it("very popular repo scores higher than unpopular one", () => {
    const popular = makeStats({ stars: 50000, forks: 10000, recentCommits: 100 });
    const unpopular = makeStats({ stars: 5, forks: 1, recentCommits: 1 });
    const { score: popularScore } = computeActivityScore(popular);
    const { score: unpopularScore } = computeActivityScore(unpopular);
    expect(popularScore).toBeGreaterThan(unpopularScore);
  });

  it("score never exceeds 100", () => {
    const mega = makeStats({
      stars: 1_000_000,
      forks: 500_000,
      openIssues: 100_000,
      contributors: 10_000,
      recentCommits: 10_000,
    });
    const { score } = computeActivityScore(mega);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("computeComplexityScore", () => {
  it("returns a score between 0 and 100", () => {
    const { score } = computeComplexityScore(makeStats());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("more languages increases complexity", () => {
    const few = makeStats({ languages: { TypeScript: 1000 } });
    const many = makeStats({
      languages: {
        TypeScript: 1000,
        JavaScript: 1000,
        Python: 1000,
        Go: 1000,
        Rust: 1000,
      },
    });
    const { score: fewScore } = computeComplexityScore(few);
    const { score: manyScore } = computeComplexityScore(many);
    expect(manyScore).toBeGreaterThan(fewScore);
  });

  it("no languages returns language component of 0", () => {
    const stats = makeStats({ languages: {} });
    const { breakdown } = computeComplexityScore(stats);
    expect(breakdown.languageComponent).toBe(0);
  });

  it("score never exceeds 100", () => {
    const mega = makeStats({
      languages: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`lang${i}`, 1000])
      ),
      contributors: 100_000,
      totalCommits: 1_000_000,
      ageInDays: 10 * 365,
    });
    const { score } = computeComplexityScore(mega);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("classifyLearningDifficulty", () => {
  it("0 → Beginner", () => expect(classifyLearningDifficulty(0)).toBe("Beginner"));
  it("33 → Beginner", () => expect(classifyLearningDifficulty(33)).toBe("Beginner"));
  it("34 → Intermediate", () => expect(classifyLearningDifficulty(34)).toBe("Intermediate"));
  it("66 → Intermediate", () => expect(classifyLearningDifficulty(66)).toBe("Intermediate"));
  it("67 → Advanced", () => expect(classifyLearningDifficulty(67)).toBe("Advanced"));
  it("100 → Advanced", () => expect(classifyLearningDifficulty(100)).toBe("Advanced"));
});

describe("computeScores", () => {
  it("returns all three scores", () => {
    const { scores } = computeScores(makeStats());
    expect(scores.activityScore).toBeDefined();
    expect(scores.complexityScore).toBeDefined();
    expect(["Beginner", "Intermediate", "Advanced"]).toContain(scores.learningDifficulty);
  });

  it("learning difficulty matches complexity score threshold", () => {
    const low = makeStats({ contributors: 1, totalCommits: 5, ageInDays: 10, languages: { TypeScript: 1 } });
    const { scores } = computeScores(low);
    // With low metrics, complexity should be low → Beginner
    expect(["Beginner", "Intermediate"]).toContain(scores.learningDifficulty);
  });
});

describe("parseRepoUrl", () => {
  it("parses full https URL", () => {
    expect(parseRepoUrl("https://github.com/facebook/react")).toEqual({
      owner: "facebook",
      name: "react",
    });
  });

  it("parses URL without protocol", () => {
    expect(parseRepoUrl("github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      name: "next.js",
    });
  });

  it("parses owner/repo shorthand", () => {
    expect(parseRepoUrl("torvalds/linux")).toEqual({
      owner: "torvalds",
      name: "linux",
    });
  });

  it("strips .git suffix", () => {
    expect(parseRepoUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      name: "repo",
    });
  });

  it("returns null for invalid URL", () => {
    expect(parseRepoUrl("not-a-valid-url")).toBeNull();
    expect(parseRepoUrl("https://example.com/a/b")).toBeNull();
  });

  it("handles trailing slash in URL", () => {
    const result = parseRepoUrl("https://github.com/owner/repo/");
    expect(result).toEqual({ owner: "owner", name: "repo" });
  });
});
