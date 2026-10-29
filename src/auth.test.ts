import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetch as undiciFetch, MockAgent, setGlobalDispatcher } from "undici";
import { buildAuthHeaders, resolveAuth } from "./auth.js";

const BASE_URL = "https://example.cybozu.com";

// Test fixtures using CHANGEME (gitleaks-recognized placeholder).
const CLIENT_ID = "CHANGEME-client";
const CLIENT_SECRET = "CHANGEME-secret";
// Contains every character URLSearchParams must escape in a form body.
const REFRESH_TOKEN = "CHANGEME+1&x=2%20";
const ACCESS_TOKEN = "test-access-token";
const BASIC_HEADER = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`;

const OAUTH_AUTH = {
  type: "oauth",
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  refreshToken: REFRESH_TOKEN,
} as const;

const TOKEN_REQUEST = {
  path: "/oauth2/token",
  method: "POST",
  headers: { Authorization: BASIC_HEADER, "Content-Type": "application/x-www-form-urlencoded" },
  body: "grant_type=refresh_token&refresh_token=CHANGEME%2B1%26x%3D2%2520",
} as const;

const AUTH_ENV_KEYS = [
  "KINTONE_API_TOKEN",
  "KINTONE_USERNAME",
  "KINTONE_PASSWORD",
  "KINTONE_OAUTH_CLIENT_ID",
  "KINTONE_OAUTH_CLIENT_SECRET",
  "KINTONE_OAUTH_REFRESH_TOKEN",
] as const;

const stubOAuthEnv = (overrides: Partial<Record<string, string>> = {}): void => {
  vi.stubEnv("KINTONE_OAUTH_CLIENT_ID", overrides.KINTONE_OAUTH_CLIENT_ID ?? CLIENT_ID);
  vi.stubEnv("KINTONE_OAUTH_CLIENT_SECRET", overrides.KINTONE_OAUTH_CLIENT_SECRET ?? CLIENT_SECRET);
  vi.stubEnv("KINTONE_OAUTH_REFRESH_TOKEN", overrides.KINTONE_OAUTH_REFRESH_TOKEN ?? REFRESH_TOKEN);
};

describe("resolveAuth", () => {
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const key of AUTH_ENV_KEYS) {
      vi.stubEnv(key, "");
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const warnings = (): string =>
    consoleErrSpy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");

  it("prefers api-token, then oauth, then password", () => {
    vi.stubEnv("KINTONE_API_TOKEN", "token-value");
    stubOAuthEnv();
    vi.stubEnv("KINTONE_USERNAME", "CHANGEME");
    vi.stubEnv("KINTONE_PASSWORD", "CHANGEME");
    expect(resolveAuth().type).toBe("api-token");

    vi.stubEnv("KINTONE_API_TOKEN", "");
    expect(resolveAuth().type).toBe("oauth");
    expect(warnings()).toContain("Multiple auth methods detected. Using oauth.");

    vi.stubEnv("KINTONE_OAUTH_CLIENT_ID", "");
    vi.stubEnv("KINTONE_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("KINTONE_OAUTH_REFRESH_TOKEN", "");
    expect(resolveAuth().type).toBe("password");
  });

  describe("partial OAuth configuration", () => {
    it("names the missing variables when nothing else is configured", () => {
      stubOAuthEnv({ KINTONE_OAUTH_REFRESH_TOKEN: "" });

      expect(() => resolveAuth()).toThrow(/No authentication configured/);
      expect(() => resolveAuth()).toThrow(/missing KINTONE_OAUTH_REFRESH_TOKEN/);
    });

    it("names the missing variables for --auth-type oauth", () => {
      stubOAuthEnv({ KINTONE_OAUTH_CLIENT_ID: "", KINTONE_OAUTH_CLIENT_SECRET: "" });
      vi.stubEnv("KINTONE_USERNAME", "CHANGEME");
      vi.stubEnv("KINTONE_PASSWORD", "CHANGEME");

      expect(() => resolveAuth("oauth")).toThrow(
        'Authentication type "oauth" is not configured (incomplete OAuth configuration: missing KINTONE_OAUTH_CLIENT_ID, KINTONE_OAUTH_CLIENT_SECRET).',
      );
    });

    it("warns and falls back to another method when auto-selecting", () => {
      stubOAuthEnv({ KINTONE_OAUTH_CLIENT_SECRET: "" });
      vi.stubEnv("KINTONE_USERNAME", "CHANGEME");
      vi.stubEnv("KINTONE_PASSWORD", "CHANGEME");

      expect(resolveAuth().type).toBe("password");
      expect(warnings()).toContain(
        "Incomplete OAuth configuration (missing KINTONE_OAUTH_CLIENT_SECRET); ignoring OAuth.",
      );
    });

    it("stays silent when --auth-type picks another method explicitly", () => {
      stubOAuthEnv({ KINTONE_OAUTH_CLIENT_SECRET: "" });
      vi.stubEnv("KINTONE_USERNAME", "CHANGEME");
      vi.stubEnv("KINTONE_PASSWORD", "CHANGEME");

      expect(resolveAuth("password").type).toBe("password");
      expect(warnings()).toBe("");
    });
  });
});

describe("buildAuthHeaders", () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    vi.stubGlobal("fetch", undiciFetch);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await mockAgent.close();
  });

  it("password → X-Cybozu-Authorization", async () => {
    const headers = await buildAuthHeaders({
      auth: { type: "password", username: "CHANGEME", password: "CHANGEME" },
      baseUrl: BASE_URL,
    });
    expect(headers).toEqual({
      "X-Cybozu-Authorization": Buffer.from("CHANGEME:CHANGEME").toString("base64"),
    });
  });

  it("api-token → X-Cybozu-API-Token", async () => {
    const headers = await buildAuthHeaders({
      auth: { type: "api-token", token: "token-value" },
      baseUrl: BASE_URL,
    });
    expect(headers).toEqual({ "X-Cybozu-API-Token": "token-value" });
  });

  describe("oauth", () => {
    it("exchanges the refresh token (Basic auth, form-encoded body) for a Bearer header", async () => {
      mockAgent
        .get(BASE_URL)
        .intercept(TOKEN_REQUEST)
        .reply(200, { access_token: ACCESS_TOKEN, token_type: "bearer", expires_in: 3600 });

      const headers = await buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL });

      expect(headers).toEqual({ Authorization: `Bearer ${ACCESS_TOKEN}` });
      mockAgent.assertNoPendingInterceptors();
    });

    it("resolves the token endpoint relative to a base URL with a trailing path", async () => {
      // getBaseUrl() strips a trailing slash, but a bare origin and "/k" prefix must both work.
      mockAgent.get(BASE_URL).intercept(TOKEN_REQUEST).reply(200, { access_token: ACCESS_TOKEN });

      await buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: `${BASE_URL}/k` });

      mockAgent.assertNoPendingInterceptors();
    });

    it("refuses a non-HTTPS token endpoint before sending anything", async () => {
      // No interceptor: any request would fail with a MockAgent network error instead.
      await expect(
        buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: "http://example.cybozu.com" }),
      ).rejects.toThrow('OAuth token endpoint requires HTTPS (got "http:").');
    });

    it("does not follow a redirect from the token endpoint", async () => {
      mockAgent
        .get(BASE_URL)
        .intercept({ path: "/oauth2/token", method: "POST" })
        .reply(307, "", { headers: { location: "https://elsewhere.example/oauth2/token" } });

      await expect(buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL })).rejects.toThrow(
        "OAuth token exchange failed (HTTP 307)",
      );
    });

    it("reports RFC 6749 error fields and nothing else from an error body", async () => {
      mockAgent
        .get(BASE_URL)
        .intercept({ path: "/oauth2/token", method: "POST" })
        .reply(400, {
          error: "invalid_grant",
          error_description: "The refresh token is invalid.",
          echoed_request: `refresh_token=${REFRESH_TOKEN} secret=${CLIENT_SECRET}`,
        });

      const promise = buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL });

      await expect(promise).rejects.toThrow(
        "OAuth token exchange failed (HTTP 400): invalid_grant (The refresh token is invalid.)",
      );
      await expect(promise).rejects.not.toThrow(/CHANGEME/);
    });

    it("reports only the status for a non-JSON error body", async () => {
      mockAgent
        .get(BASE_URL)
        .intercept({ path: "/oauth2/token", method: "POST" })
        .reply(502, `<html>Bad Gateway: ${CLIENT_SECRET}</html>`);

      await expect(buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL })).rejects.toThrow(
        /^OAuth token exchange failed \(HTTP 502\)$/,
      );
    });

    it("wraps a network failure", async () => {
      // No interceptor registered: disableNetConnect() makes fetch reject.
      await expect(buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL })).rejects.toThrow(
        /^OAuth token exchange request failed: /,
      );
    });

    it.each([
      ["non-JSON body", "not json"],
      ["JSON null", "null"],
      ["missing access_token", JSON.stringify({ token_type: "bearer" })],
      ["non-string access_token", JSON.stringify({ access_token: 123 })],
      ["empty access_token", JSON.stringify({ access_token: "" })],
      ["access_token with CR/LF", JSON.stringify({ access_token: "abc\r\nX-Injected: 1" })],
    ])("rejects a 200 response with %s", async (_label, body) => {
      mockAgent.get(BASE_URL).intercept({ path: "/oauth2/token", method: "POST" }).reply(200, body);

      await expect(buildAuthHeaders({ auth: OAUTH_AUTH, baseUrl: BASE_URL })).rejects.toThrow(
        "OAuth token endpoint response is missing a valid access_token.",
      );
    });
  });
});
