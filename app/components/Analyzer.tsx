"use client";

import { useState } from "react";
import { AnalyzeResponse, RepoReport } from "@/lib/types";
import RepoCard from "./RepoCard";

const DEFAULT_REPOS = [
  "https://github.com/facebook/react",
  "https://github.com/vercel/next.js",
  "https://github.com/torvalds/linux",
  "https://github.com/firstcontributions/first-contributions",
  "https://github.com/sindresorhus/awesome",
].join("\n");

export default function Analyzer() {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urlList.length === 0) {
      setError("Please enter at least one GitHub repository URL.");
      setLoading(false);
      return;
    }

    if (urlList.length > 10) {
      setError("Maximum 10 repositories per request.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data: AnalyzeResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDefaults() {
    setUrls(DEFAULT_REPOS);
  }

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label
          htmlFor="repo-urls"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          GitHub Repository URLs
          <span className="ml-2 font-normal text-gray-400">(one per line, max 10)</span>
        </label>
        <textarea
          id="repo-urls"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={6}
          placeholder={
            "https://github.com/owner/repo\nowner/repo\n..."
          }
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            {loading ? "Analyzing…" : "Analyze Repositories"}
          </button>
          <button
            onClick={handleLoadDefaults}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
          >
            Load examples
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Rate limit info */}
      {result?.rateLimit && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
          <span>⚡</span>
          <span>
            GitHub API: <strong>{result.rateLimit.remaining}</strong> /{" "}
            {result.rateLimit.limit} requests remaining — resets at{" "}
            {new Date(result.rateLimit.resetAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Results
            <span className="ml-2 text-sm font-normal text-gray-400">
              {result.reports.length} repositor
              {result.reports.length === 1 ? "y" : "ies"} analyzed
            </span>
          </h2>
          {result.reports.map((report: RepoReport, i: number) => (
            <RepoCard key={i} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
