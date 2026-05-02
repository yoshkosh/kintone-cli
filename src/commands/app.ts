import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { attachEndpoint } from "../schema-option.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  requireOpts,
} from "./shared.js";

export const registerAppCommands = (program: Command): { app: Command } => {
  const app = program.command("app").description("App operations (/k/v1/app)");

  // GET /k/v1/app.json — query: id(必須), lang
  const appGet = app
    .command("get")
    .description("Get app info")
    .option("--id <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["id"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { id: opts.id };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(appGet, { method: "GET", path: "/k/v1/app.json" });

  // --- form-fields ---

  const formFields = app
    .command("form-fields")
    .description("App form field operations (/k/v1/app/form/fields)");

  // GET /k/v1/app/form/fields.json — query: app(必須), lang
  const formFieldsGet = formFields
    .command("get")
    .description("Get form fields (live)")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app/form/fields.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formFieldsGet, {
    method: "GET",
    path: "/k/v1/app/form/fields.json",
  });

  // --- form-layout ---

  const formLayout = app
    .command("form-layout")
    .description("App form layout operations (/k/v1/app/form/layout)");

  // GET /k/v1/app/form/layout.json — query: app(必須)
  const formLayoutGet = formLayout
    .command("get")
    .description("Get form layout (live)")
    .option("--app <id>", "App ID")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app/form/layout.json",
        params: { app: opts.app },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formLayoutGet, {
    method: "GET",
    path: "/k/v1/app/form/layout.json",
  });

  // --- settings ---

  const settings = app
    .command("settings")
    .description("App settings operations (/k/v1/app/settings)");

  // GET /k/v1/app/settings.json — query: app(必須), lang
  const settingsGet = settings
    .command("get")
    .description("Get app settings (live)")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/app/settings.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(settingsGet, {
    method: "GET",
    path: "/k/v1/app/settings.json",
  });

  // --- apps (plural) ---

  const apps = program
    .command("apps")
    .description("Apps operations (/k/v1/apps)");

  // GET /k/v1/apps.json — query: 全てオプション
  const appsGet = apps
    .command("get")
    .description("Get apps list")
    .option("--ids <ids>", "Comma-separated App IDs")
    .option("--codes <codes>", "Comma-separated App codes")
    .option("--space-ids <ids>", "Comma-separated Space IDs")
    .option("--name <name>", "App name filter")
    .option("--offset <n>", "Offset")
    .option("--limit <n>", "Limit")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = {};
      if (opts.ids) params.ids = opts.ids.split(",").map(Number);
      if (opts.codes) params.codes = opts.codes.split(",");
      if (opts.spaceIds) params.spaceIds = opts.spaceIds.split(",").map(Number);
      if (opts.name) params.name = opts.name;
      if (opts.offset) params.offset = opts.offset;
      if (opts.limit) params.limit = opts.limit;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/apps.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(appsGet, { method: "GET", path: "/k/v1/apps.json" });

  return { app };
};
