"use client";

import { useState } from "react";
import { RepoReport } from "@/lib/types";

interface Props {
  report: RepoReport;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Beginner: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
    Intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
    Advanced: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[difficulty] ?? "bg-gray-100 text-gray-800"}`}
    >
      {difficulty}
    </span>
  );
}

function ScoreBar({ label, value, max = 100, color = "blue" }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(1)} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${colorMap[color] ?? "bg-blue-500"} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RepoCard({ report }: Props) {
  const [showJson, setShowJson] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (report.status === "error") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-lg">✗</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{report.input}</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{report.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { stats, scores, breakdown } = report;
  if (!stats || !scores) return null;

  const languageList = Object.entries(stats.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const totalBytes = languageList.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <a
            href={stats.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline text-base"
          >
            {stats.fullName}
          </a>
          {stats.isArchived && (
            <span className="ml-2 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 px-2 py-0.5 rounded-full">
              Archived
            </span>
          )}
          {stats.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              {stats.description}
            </p>
          )}
        </div>
        <DifficultyBadge difficulty={scores.learningDifficulty} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "⭐ Stars", value: stats.stars.toLocaleString() },
          { label: "🍴 Forks", value: stats.forks.toLocaleString() },
          { label: "👥 Contributors", value: stats.contributors.toLocaleString() },
          { label: "🔓 Open Issues", value: stats.openIssues.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</div>
          </div>
        ))}
      </div>

      {/* Scores */}
      <div className="space-y-3">
        <ScoreBar label="Activity Score" value={scores.activityScore} color="blue" />
        <ScoreBar label="Complexity Score" value={scores.complexityScore} color="purple" />
      </div>

      {/* Languages */}
      {languageList.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Languages</p>
          <div className="flex flex-wrap gap-2">
            {languageList.map(([lang, bytes]) => (
              <span
                key={lang}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-full"
              >
                {lang} {totalBytes > 0 ? `${((bytes / totalBytes) * 100).toFixed(1)}%` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="space-y-1.5">
          {report.warnings.map((w, i) => (
            <div key={i} className="flex gap-2 items-start text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2">
              <span>⚠</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toggles */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showBreakdown ? "Hide" : "Show"} score breakdown
        </button>
        <button
          onClick={() => setShowJson(!showJson)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showJson ? "Hide" : "Show"} raw JSON
        </button>
      </div>

      {/* Score breakdown */}
      {showBreakdown && breakdown && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-xs space-y-3">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Activity Breakdown</p>
            <table className="w-full text-gray-600 dark:text-gray-400 border-collapse">
              <tbody>
                {[
                  ["Stars", breakdown.activity.starComponent, 35],
                  ["Forks", breakdown.activity.forkComponent, 20],
                  ["Recent Commits (90d)", breakdown.activity.commitComponent, 25],
                  ["Open Issues", breakdown.activity.issueComponent, 10],
                  ["Contributors", breakdown.activity.contributorComponent, 10],
                  ["Archived Penalty", breakdown.activity.archivedPenalty, 0],
                ].map(([label, val, max]) => (
                  <tr key={String(label)} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-1 pr-4">{label}</td>
                    <td className="py-1 text-right font-mono">{Number(val).toFixed(1)}{max ? ` / ${max}` : ""}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-gray-800 dark:text-gray-200">
                  <td className="py-1 pr-4">Total</td>
                  <td className="py-1 text-right font-mono">{breakdown.activity.total.toFixed(1)} / 100</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Complexity Breakdown</p>
            <table className="w-full text-gray-600 dark:text-gray-400 border-collapse">
              <tbody>
                {[
                  ["Languages", breakdown.complexity.languageComponent, 20],
                  ["Contributors", breakdown.complexity.contributorComponent, 30],
                  ["Total Commits", breakdown.complexity.commitComponent, 30],
                  ["Project Age", breakdown.complexity.ageComponent, 20],
                ].map(([label, val, max]) => (
                  <tr key={String(label)} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-1 pr-4">{label}</td>
                    <td className="py-1 text-right font-mono">{Number(val).toFixed(1)} / {max}</td>
                  </tr>
                ))}
                <tr className="font-semibold text-gray-800 dark:text-gray-200">
                  <td className="py-1 pr-4">Total</td>
                  <td className="py-1 text-right font-mono">{breakdown.complexity.total.toFixed(1)} / 100</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw JSON */}
      {showJson && (
        <pre className="bg-gray-950 text-green-400 rounded-xl p-4 text-xs overflow-auto max-h-80 font-mono">
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}
