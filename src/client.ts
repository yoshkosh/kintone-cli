import { resolveAuth, buildAuthHeaders } from "./auth.js";

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  authType?: string;
  guestSpaceId?: number;
};

export const getBaseUrl = (): string => {
  const url = process.env.KINTONE_BASE_URL;
  if (!url) {
    throw new Error("KINTONE_BASE_URL is not set.");
  }
  return url.replace(/\/$/, "");
};

export const buildPath = (path: string, guestSpaceId?: number): string => {
  if (guestSpaceId) {
    return path.replace("/k/v1/", `/k/guest/${guestSpaceId}/v1/`);
  }
  return path;
};

const appendQueryParams = (url: URL, params: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        url.searchParams.set(`${key}[${index}]`, String(item));
      });
    } else {
      url.searchParams.set(key, String(value));
    }
  }
};

export const kintoneRequest = async <T = unknown>(options: RequestOptions): Promise<T> => {
  const baseUrl = getBaseUrl();
  const auth = resolveAuth(options.authType);
  const headers: Record<string, string> = {
    ...buildAuthHeaders(auth),
  };

  const fullPath = buildPath(options.path, options.guestSpaceId);
  const url = new URL(fullPath, baseUrl);

  if (options.params) {
    appendQueryParams(url, options.params);
  }

  const fetchOptions: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), fetchOptions);
  const responseBody = await response.text();

  if (!response.ok) {
    const error = new Error(responseBody);
    error.name = "KintoneAPIError";
    throw error;
  }

  if (!responseBody) {
    return {} as T;
  }

  return JSON.parse(responseBody) as T;
};
