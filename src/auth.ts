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

export const resolveAuth = (authType?: string): Auth => {
  const methods = detectAuthMethods();

  if (methods.length === 0) {
    throw new Error(
      "No authentication configured. Set KINTONE_API_TOKEN, KINTONE_USERNAME/KINTONE_PASSWORD, or OAuth environment variables.",
    );
  }

  if (authType) {
    const matched = methods.find((m) => m.type === authType);
    if (!matched) {
      throw new Error(`Authentication type "${authType}" is not configured.`);
    }
    return matched;
  }

  if (methods.length > 1) {
    console.error(
      `Warning: Multiple auth methods detected. Using ${methods[0].type}. Use --auth-type to specify.`,
    );
  }

  return methods[0];
};

export const buildAuthHeaders = (auth: Auth): AuthHeaders => {
  switch (auth.type) {
    case "password": {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString(
        "base64",
      );
      return { "X-Cybozu-Authorization": encoded };
    }
    case "api-token":
      return { "X-Cybozu-API-Token": auth.token };
    case "oauth":
      // TODO: OAuth token exchange using refresh token
      throw new Error("OAuth is not yet implemented.");
  }
};
