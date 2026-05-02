import { Command, CommanderError } from "commander";

export type GlobalOptions = {
  authType?: string;
  guestSpaceId?: string;
};

export const requireOpts = (
  opts: Record<string, unknown>,
  names: readonly string[],
): void => {
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
