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

export const toGuestSpaceId = (global: GlobalOptions): number | undefined => {
  if (global.guestSpaceId === undefined) return undefined;
  // NOTE: 非数値や 0 は buildPath でパスが書き換えられず通常パスを呼んでしまうため、
  // 黙って無視せず API 呼び出し前にエラーにする。
  if (!/^[1-9]\d*$/.test(global.guestSpaceId)) {
    throw new Error("--guest-space-id must be a positive integer");
  }
  return Number(global.guestSpaceId);
};

// NOTE: フラグ値を JSON ボディの integer に変換する。Number() は "abc" を NaN (JSON では
// null) に、"" を 0 に黙って変換するため使わず、整数でなければ API 呼び出し前にエラーにする。
// 負数は kintone が revision の -1 (チェックしない) などで使うため許容する。
export const toInteger = ({ name, value }: { name: string; value: string }): number => {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`--${name} must be an integer`);
  }
  return Number(value);
};

export const writeJson = (data: unknown): void => {
  process.stdout.write(JSON.stringify(data, undefined, 2) + "\n");
};

export const dryRunOutput = (info: { method: string; path: string; body?: unknown }): void => {
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

// NOTE: noGuestSpace の逆ガード。spec にゲストスペース用パスしか存在しない API 向け。
// 指定なしで実行すると存在しない /k/v1/ 側のパスを呼ぶことになるため、API 呼び出し前に
// CLI 側でエラーを返す。
export const requireGuestSpace = (
  global: GlobalOptions,
  commandName: string,
  opts?: { schema?: unknown },
): void => {
  // NOTE: --schema 指定時は副作用ゼロを保つため必須検証もバイパスする
  if (opts?.schema) return;
  if (!global.guestSpaceId) {
    throw new Error(`--guest-space-id is required for "${commandName}"`);
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
