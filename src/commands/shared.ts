import { Command } from "commander";

export type GlobalOptions = {
  authType?: string;
  guestSpaceId?: string;
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
