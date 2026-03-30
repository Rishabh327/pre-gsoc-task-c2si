import Analyzer from "./components/Analyzer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            🔍 GitHub Repository Intelligence Analyzer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg mx-auto">
            Enter GitHub repository URLs to compute{" "}
            <strong>Activity Score</strong>,{" "}
            <strong>Complexity Estimation</strong>, and{" "}
            <strong>Learning Difficulty</strong> classification.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Pre-GSoC Task 2 —{" "}
            <a
              href="https://github.com/c2siorg/Webiu/issues/541"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-500"
            >
              c2siorg/Webiu #541
            </a>
          </p>
        </div>

        <Analyzer />

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 dark:text-gray-600 space-y-1">
          <p>
            Uses the{" "}
            <a
              href="https://docs.github.com/en/rest"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              GitHub REST API
            </a>{" "}
            via Octokit. Set{" "}
            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
              GITHUB_TOKEN
            </code>{" "}
            for higher rate limits (5,000 req/hr vs 60 req/hr).
          </p>
          <p>
            See{" "}
            <a
              href="https://github.com/Rishabh327/pre-gsoc-task-c2si/blob/main/docs/task-2.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              docs/task-2.md
            </a>{" "}
            for formula details and assumptions.
          </p>
        </footer>
      </div>
    </main>
  );
}
