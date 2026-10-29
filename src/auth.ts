type PasswordAuth = {
  type: "password";
  username: string;
  password: string;
};

type ApiTokenAuth = {
  type: "api-token";
  token: string;
};

type OAuthAuth = {
  type: "oauth";
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type Auth = PasswordAuth | ApiTokenAuth | OAuthAuth;

export type AuthHeaders = Record<string, string>;

export type BuildAuthHeadersOptions = {
  auth: Auth;
  baseUrl: string;
};

const OAUTH_ENV_KEYS = [
  "KINTONE_OAUTH_CLIENT_ID",
  "KINTONE_OAUTH_CLIENT_SECRET",
  "KINTONE_OAUTH_REFRESH_TOKEN",
] as const;

const detectAuthMethods = (): Auth[] => {
  const methods: Auth[] = [];

  if (process.env.KINTONE_API_TOKEN) {
    methods.push({
      type: "api-token",
      token: process.env.KINTONE_API_TOKEN,
    });
  }

  if (
    process.env.KINTONE_OAUTH_CLIENT_ID &&
    process.env.KINTONE_OAUTH_CLIENT_SECRET &&
    process.env.KINTONE_OAUTH_REFRESH_TOKEN
  ) {
    methods.push({
      type: "oauth",
      clientId: process.env.KINTONE_OAUTH_CLIENT_ID,
      clientSecret: process.env.KINTONE_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.KINTONE_OAUTH_REFRESH_TOKEN,
    });
  }

  if (process.env.KINTONE_USERNAME && process.env.KINTONE_PASSWORD) {
    methods.push({
      type: "password",
      username: process.env.KINTONE_USERNAME,
      password: process.env.KINTONE_PASSWORD,
    });
  }

  return methods;
};

// NOTE: Only a partial set (1-2 of the 3 variables) is a misconfiguration worth
// reporting; none set is simply "OAuth not in use".
const missingOAuthEnvKeys = (): string[] => {
  const missing = OAUTH_ENV_KEYS.filter((key) => !process.env[key]);
  return missing.length === OAUTH_ENV_KEYS.length ? [] : missing;
};

export const resolveAuth = (authType?: string): Auth => {
  const methods = detectAuthMethods();
  const missingOAuth = missingOAuthEnvKeys();
  const incompleteOAuthHint =
    missingOAuth.length > 0
      ? ` (incomplete OAuth configuration: missing ${missingOAuth.join(", ")})`
      : "";

  if (methods.length === 0) {
    throw new Error(
      `No authentication configured${incompleteOAuthHint}. Set KINTONE_API_TOKEN, KINTONE_USERNAME/KINTONE_PASSWORD, or all OAuth environment variables.`,
    );
  }

  if (authType) {
    const matched = methods.find((m) => m.type === authType);
    if (!matched) {
      const hint = authType === "oauth" ? incompleteOAuthHint : "";
      throw new Error(`Authentication type "${authType}" is not configured${hint}.`);
    }
    return matched;
  }

  // NOTE: Without this, a typo in one OAuth variable silently falls back to
  // password auth, which then fails with an unrelated 2FA error from kintone.
  if (missingOAuth.length > 0) {
    console.error(
      `Warning: Incomplete OAuth configuration (missing ${missingOAuth.join(", ")}); ignoring OAuth.`,
    );
  }

  if (methods.length > 1) {
    console.error(
      `Warning: Multiple auth methods detected. Using ${methods[0].type}. Use --auth-type to specify.`,
    );
  }

  return methods[0];
};

type OAuthTokenResponse = {
  access_token?: unknown;
  error?: unknown;
  error_description?: unknown;
};

const fetchOAuthAccessToken = async ({
  auth,
  baseUrl,
}: {
  auth: OAuthAuth;
  baseUrl: string;
}): Promise<string> => {
  const tokenUrl = new URL("/oauth2/token", baseUrl);
  // NOTE: The client secret and refresh token travel in this request (RFC 6749 §3.2),
  // so refuse plain HTTP before anything is sent.
  if (tokenUrl.protocol !== "https:") {
    throw new Error(`OAuth token endpoint requires HTTPS (got "${tokenUrl.protocol}").`);
  }

  const basicCredentials = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
  }).toString();

  let response: Response;
  try {
    response = await fetch(tokenUrl.toString(), {
      method: "POST",
      // NOTE: With the default "follow", a 307/308 would re-POST the refresh token to the
      // redirect target. Node's fetch hands back the 3xx itself under "manual" (browsers
      // would return an opaque response), so it is reported through the !ok branch below.
      redirect: "manual",
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch (err) {
    throw new Error(`OAuth token exchange request failed: ${(err as Error).message}`);
  }

  const text = await response.text();
  let payload: OAuthTokenResponse | undefined;
  try {
    payload = JSON.parse(text) ?? undefined;
  } catch {
    // Non-JSON body (e.g. a proxy error page): handled by the checks below.
  }

  if (!response.ok) {
    // NOTE: Surface only the RFC 6749 §5.2 fields. An arbitrary body is never echoed, so a
    // misbehaving proxy cannot leak the credentials from the request back into stderr.
    const description =
      typeof payload?.error_description === "string" ? ` (${payload.error_description})` : "";
    const detail = typeof payload?.error === "string" ? `: ${payload.error}${description}` : "";
    throw new Error(`OAuth token exchange failed (HTTP ${response.status})${detail}`);
  }

  const accessToken = payload?.access_token;
  // NOTE: Whitespace (incl. CR/LF) would be rejected by fetch as an invalid header value,
  // with the token quoted in the error message. Fail here instead.
  if (typeof accessToken !== "string" || !/^\S+$/.test(accessToken)) {
    throw new Error("OAuth token endpoint response is missing a valid access_token.");
  }
  return accessToken;
};

/**
 * Builds the authentication header(s) for one request. For OAuth this exchanges the
 * refresh token for an access token against `${baseUrl}/oauth2/token` on every call:
 * `kt` issues a single request per process, so there is nothing worth caching.
 */
export const buildAuthHeaders = async ({
  auth,
  baseUrl,
}: BuildAuthHeadersOptions): Promise<AuthHeaders> => {
  switch (auth.type) {
    case "password": {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
      return { "X-Cybozu-Authorization": encoded };
    }
    case "api-token":
      return { "X-Cybozu-API-Token": auth.token };
    case "oauth": {
      const accessToken = await fetchOAuthAccessToken({ auth, baseUrl });
      return { Authorization: `Bearer ${accessToken}` };
    }
  }
};
