import { describe, test, expect } from "vitest";
import { resolveClaudeApiKey } from "@/lib/ai/apiKey";

describe("resolveClaudeApiKey", () => {
  test("uses the visitor's key when one is sent", () => {
    expect(
      resolveClaudeApiKey("  sk-ant-visitor  ", {
        CLAUDE_API_KEY: "sk-ant-server",
        NODE_ENV: "production",
      })
    ).toBe("sk-ant-visitor");
  });

  test("never falls back to the server key in production", () => {
    expect(
      resolveClaudeApiKey(null, {
        CLAUDE_API_KEY: "sk-ant-server",
        NODE_ENV: "production",
      })
    ).toBeNull();
  });

  test("falls back to the server key in local development", () => {
    expect(
      resolveClaudeApiKey("", {
        CLAUDE_API_KEY: "sk-ant-server",
        NODE_ENV: "development",
      })
    ).toBe("sk-ant-server");
  });

  test("returns null when no key is available", () => {
    expect(resolveClaudeApiKey(undefined, { NODE_ENV: "development" })).toBeNull();
  });
});
