/**
 * Parses a GitHub repository URL into owner and name components.
 * Supports: https://github.com/owner/repo, github.com/owner/repo, owner/repo
 */
export function parseRepoUrl(url: string): { owner: string; name: string } | null {
  const trimmed = url.trim();
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    /^github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
    /^([^/]+)\/([^/]+?)(?:\.git)?$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return { owner: match[1], name: match[2] };
    }
  }
  return null;
}
