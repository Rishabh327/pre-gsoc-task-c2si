/**
 * Scoring engine for GitHub Repository Intelligence Analyzer.
 *
 * ## Activity Score (0–100)
 * Measures how actively a repository is maintained and used.
 *
 * Components (weights sum to 100 before cap):
 *   starComponent       = min(35, log10(stars + 1) × 14)
 *   forkComponent       = min(20, log10(forks + 1) × 10)
 *   commitComponent     = min(25, log10(recentCommits90d + 1) × 10)
 *   issueComponent      = min(10, log10(openIssues + 1) × 4)
 *   contributorComponent= min(10, log10(contributors + 1) × 5)
 *   archivedPenalty     = −30 if archived, else 0
 *
 *   activityScore = clamp(0, 100, sum of above)
 *
 * ## Complexity Score (0–100)
 * Estimates how complex the codebase is to understand and contribute to.
 *
 * Components:
 *   languageComponent    = min(20, numLanguages × 4)
 *   contributorComponent = min(30, log10(contributors + 1) × 15)
 *   commitComponent      = min(30, log10(totalCommits + 1) × 8)
 *   ageComponent         = min(20, ageInYears × 4)
 *
 *   complexityScore = clamp(0, 100, sum of above)
 *
 * ## Learning Difficulty
 *   complexityScore  0–33  → Beginner
 *   complexityScore 34–66  → Intermediate
 *   complexityScore 67–100 → Advanced
 */

import { RepoStats, Scores, ScoreBreakdown } from "./types";

function log10(x: number): number {
  return Math.log10(x);
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeActivityScore(stats: RepoStats): {
  score: number;
  breakdown: ScoreBreakdown["activity"];
} {
  const starComponent = clamp(0, 35, log10(stats.stars + 1) * 14);
  const forkComponent = clamp(0, 20, log10(stats.forks + 1) * 10);
  const commitComponent = clamp(0, 25, log10(stats.recentCommits + 1) * 10);
  const issueComponent = clamp(0, 10, log10(stats.openIssues + 1) * 4);
  const contributorComponent = clamp(
    0,
    10,
    log10(stats.contributors + 1) * 5
  );
  const archivedPenalty = stats.isArchived ? -30 : 0;

  const total = clamp(
    0,
    100,
    starComponent +
      forkComponent +
      commitComponent +
      issueComponent +
      contributorComponent +
      archivedPenalty
  );

  return {
    score: Math.round(total * 10) / 10,
    breakdown: {
      starComponent: Math.round(starComponent * 10) / 10,
      forkComponent: Math.round(forkComponent * 10) / 10,
      commitComponent: Math.round(commitComponent * 10) / 10,
      issueComponent: Math.round(issueComponent * 10) / 10,
      contributorComponent: Math.round(contributorComponent * 10) / 10,
      archivedPenalty,
      total: Math.round(total * 10) / 10,
    },
  };
}

export function computeComplexityScore(stats: RepoStats): {
  score: number;
  breakdown: ScoreBreakdown["complexity"];
} {
  const numLanguages = Object.keys(stats.languages).length;
  const ageInYears = stats.ageInDays / 365;

  const languageComponent = clamp(0, 20, numLanguages * 4);
  const contributorComponent = clamp(
    0,
    30,
    log10(stats.contributors + 1) * 15
  );
  const commitComponent = clamp(0, 30, log10(stats.totalCommits + 1) * 8);
  const ageComponent = clamp(0, 20, ageInYears * 4);

  const total = clamp(
    0,
    100,
    languageComponent + contributorComponent + commitComponent + ageComponent
  );

  return {
    score: Math.round(total * 10) / 10,
    breakdown: {
      languageComponent: Math.round(languageComponent * 10) / 10,
      contributorComponent: Math.round(contributorComponent * 10) / 10,
      commitComponent: Math.round(commitComponent * 10) / 10,
      ageComponent: Math.round(ageComponent * 10) / 10,
      total: Math.round(total * 10) / 10,
    },
  };
}

export function classifyLearningDifficulty(
  complexityScore: number
): "Beginner" | "Intermediate" | "Advanced" {
  if (complexityScore <= 33) return "Beginner";
  if (complexityScore <= 66) return "Intermediate";
  return "Advanced";
}

export function computeScores(stats: RepoStats): {
  scores: Scores;
  breakdown: ScoreBreakdown;
} {
  const activityResult = computeActivityScore(stats);
  const complexityResult = computeComplexityScore(stats);
  const learningDifficulty = classifyLearningDifficulty(
    complexityResult.score
  );

  return {
    scores: {
      activityScore: activityResult.score,
      complexityScore: complexityResult.score,
      learningDifficulty,
    },
    breakdown: {
      activity: activityResult.breakdown,
      complexity: complexityResult.breakdown,
    },
  };
}
