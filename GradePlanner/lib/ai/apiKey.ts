// Header the client uses to send the visitor's own Claude API key
export const CLAUDE_KEY_HEADER = "x-claude-api-key";

/**
 * Pick the Claude API key for a syllabus request. Visitors bring their own
 * key; the server's CLAUDE_API_KEY is only a local-development fallback, so a
 * public deployment never spends the operator's credits.
 */
export function resolveClaudeApiKey(
  userKey: string | null | undefined,
  env: { CLAUDE_API_KEY?: string; NODE_ENV?: string }
): string | null {
  const trimmed = userKey?.trim();
  if (trimmed) return trimmed;

  if (env.NODE_ENV !== "production" && env.CLAUDE_API_KEY) {
    return env.CLAUDE_API_KEY;
  }

  return null;
}
