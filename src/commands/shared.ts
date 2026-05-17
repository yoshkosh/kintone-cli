import { readFile } from "node:fs/promises";
import { Command, CommanderError } from "commander";

export type GlobalOptions = {
  authType?: string;
  guestSpaceId?: string;
};

export const requireOpts = (opts: Record<string, unknown>, names: readonly string[]): void => {
  // NOTE: --schema は完全副作用ゼロを保証するため必須検証もスキップする
  if (opts.schema) return;
  for (const name of names) {
    if (opts[name] === undefined) {
      throw new CommanderError(
        1,
        "commander.missingArgument",
        `error: required option '--${name}' not specified`,
      );
    }
  }
};

export const getGlobalOptions = (cmd: Command): GlobalOptions => {
  const root = cmd.optsWithGlobals();
  return {
    authType: root.authType,
    guestSpaceId: root.guestSpaceId,
  };
};

export const toGuestSpaceId = (global: GlobalOptions): number | undefined =>
  global.guestSpaceId ? Number(global.guestSpaceId) : undefined;

export const writeJson = (data: unknown): void => {
  process.stdout.write(JSON.stringify(data, undefined, 2) + "\n");
};

export const dryRunOutput = (info: {
  method: string;
  path: string;
  params?: unknown;
  body?: unknown;
}): void => {
  writeJson({ dryRun: true, ...info });
};

export const noGuestSpace = (
  global: GlobalOptions,
  commandName: string,
  opts?: { schema?: unknown },
): void => {
  // NOTE: --schema 指定時は副作用ゼロを保つため guest 制約もバイパスする
  if (opts?.schema) return;
  if (global.guestSpaceId) {
    throw new Error(`--guest-space-id is not supported for "${commandName}"`);
  }
};

// NOTE: `@<path>` プレフィックスでファイル読み込みを許容する。curl/gh と同じ規約。
// 有効な JSON は `@` で始まらないため prefix の曖昧性はゼロ。シェル ARG_MAX 回避策。
export const parseJsonOption = async (raw: string): Promise<unknown> => {
  if (!raw.startsWith("@")) {
    return JSON.parse(raw);
  }
  const path = raw.slice(1);
  if (path === "") {
    throw new Error("--json @path: empty path after '@'");
  }
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new Error(`--json @path: file not found: ${path}`);
    }
    throw new Error(`--json @path: failed to read ${path}: ${e.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`--json @path: invalid JSON in ${path}: ${(err as Error).message}`);
  }
};
