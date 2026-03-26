import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
} from "./shared.js";

type AppSettingDef = {
  subcommand: string;
  description: string;
  livePath: string;
  previewPath: string;
  hasLang: boolean;
};

const APP_SETTINGS: AppSettingDef[] = [
  {
    subcommand: "views",
    description: "App views",
    livePath: "/k/v1/app/views.json",
    previewPath: "/k/v1/preview/app/views.json",
    hasLang: true,
  },
  {
    subcommand: "customize",
    description: "App JavaScript/CSS customization",
    livePath: "/k/v1/app/customize.json",
    previewPath: "/k/v1/preview/app/customize.json",
    hasLang: false,
  },
  {
    subcommand: "reports",
    description: "App reports (graphs)",
    livePath: "/k/v1/app/reports.json",
    previewPath: "/k/v1/preview/app/reports.json",
    hasLang: true,
  },
  {
    subcommand: "status",
    description: "App process management",
    livePath: "/k/v1/app/status.json",
    previewPath: "/k/v1/preview/app/status.json",
    hasLang: true,
  },
  {
    subcommand: "actions",
    description: "App actions",
    livePath: "/k/v1/app/actions.json",
    previewPath: "/k/v1/preview/app/actions.json",
    hasLang: true,
  },
  {
    subcommand: "admin-notes",
    description: "App admin notes",
    livePath: "/k/v1/app/adminNotes.json",
    previewPath: "/k/v1/preview/app/adminNotes.json",
    hasLang: false,
  },
  {
    subcommand: "notifications-general",
    description: "App general notifications",
    livePath: "/k/v1/app/notifications/general.json",
    previewPath: "/k/v1/preview/app/notifications/general.json",
    hasLang: false,
  },
  {
    subcommand: "notifications-per-record",
    description: "App per-record notifications",
    livePath: "/k/v1/app/notifications/perRecord.json",
    previewPath: "/k/v1/preview/app/notifications/perRecord.json",
    hasLang: true,
  },
  {
    subcommand: "notifications-reminder",
    description: "App reminder notifications",
    livePath: "/k/v1/app/notifications/reminder.json",
    previewPath: "/k/v1/preview/app/notifications/reminder.json",
    hasLang: true,
  },
];

const registerSettingGet = ({
  parent,
  path,
  hasLang,
}: {
  parent: Command;
  path: string;
  hasLang: boolean;
}): void => {
  const cmd = parent
    .command("get")
    .description("Get setting")
    .requiredOption("--app <id>", "App ID");

  if (hasLang) {
    cmd.option("--lang <lang>", "Language: default, en, zh, ja, user");
  }

  cmd.action(async (opts, c) => {
    const global = getGlobalOptions(c);
    const params: Record<string, unknown> = { app: opts.app };
    if (opts.lang) params.lang = opts.lang;

    const result = await kintoneRequest({
      method: "GET",
      path,
      params,
      authType: global.authType,
      guestSpaceId: toGuestSpaceId(global),
    });
    writeJson(result);
  });
};

const registerSettingUpdate = ({
  parent,
  path,
}: {
  parent: Command;
  path: string;
}): void => {
  parent
    .command("update")
    .description("Update setting")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({ method: "PUT", path, body });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path,
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
};

export const registerAppSettingsCommands = ({
  app,
  previewApp,
}: {
  app: Command;
  previewApp: Command;
}): void => {
  for (const def of APP_SETTINGS) {
    const liveSub = app.command(def.subcommand).description(def.description);
    registerSettingGet({
      parent: liveSub,
      path: def.livePath,
      hasLang: def.hasLang,
    });

    const previewSub = previewApp
      .command(def.subcommand)
      .description(`Preview ${def.description.toLowerCase()}`);
    registerSettingGet({
      parent: previewSub,
      path: def.previewPath,
      hasLang: def.hasLang,
    });
    registerSettingUpdate({ parent: previewSub, path: def.previewPath });
  }
};
