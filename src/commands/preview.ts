import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import { attachEndpoint } from "../schema-option.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  requireOpts,
} from "./shared.js";

export const registerPreviewCommands = (
  preview: Command,
): { previewApp: Command } => {
  const previewApp = preview
    .command("app")
    .description("Preview app operations");

  // --- deploy ---

  const deploy = previewApp
    .command("deploy")
    .description("App deploy operations (/k/v1/preview/app/deploy)");

  // GET /k/v1/preview/app/deploy.json
  const deployGet = deploy
    .command("get")
    .description("Get deploy status of apps")
    .option("--apps <ids>", "Comma-separated App IDs")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["apps"]);
      const global = getGlobalOptions(cmd);
      const apps = opts.apps.split(",").map(Number);

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/deploy.json",
        params: { apps },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(deployGet, {
    method: "GET",
    path: "/k/v1/preview/app/deploy.json",
  });

  // POST /k/v1/preview/app/deploy.json
  const deployAdd = deploy
    .command("add")
    .description("Deploy app settings to live")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/preview/app/deploy.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/deploy.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(deployAdd, {
    method: "POST",
    path: "/k/v1/preview/app/deploy.json",
  });

  // --- form-fields ---

  const formFields = previewApp
    .command("form-fields")
    .description(
      "Preview form field operations (/k/v1/preview/app/form/fields)",
    );

  // GET /k/v1/preview/app/form/fields.json
  const formFieldsGet = formFields
    .command("get")
    .description("Get form fields (pre-live)")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/form/fields.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formFieldsGet, {
    method: "GET",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // POST /k/v1/preview/app/form/fields.json
  const formFieldsAdd = formFields
    .command("add")
    .description("Add form fields (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/preview/app/form/fields.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/form/fields.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formFieldsAdd, {
    method: "POST",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // PUT /k/v1/preview/app/form/fields.json
  const formFieldsUpdate = formFields
    .command("update")
    .description("Update form fields (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/preview/app/form/fields.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/preview/app/form/fields.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formFieldsUpdate, {
    method: "PUT",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // DELETE /k/v1/preview/app/form/fields.json
  const formFieldsDelete = formFields
    .command("delete")
    .description("Delete form fields (pre-live)")
    .option("--app <id>", "App ID")
    .option("--fields <fields>", "Comma-separated field codes to delete")
    .option("--revision <revision>", "Expected revision number")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app", "fields"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = {
        app: opts.app,
        fields: opts.fields.split(","),
      };
      if (opts.revision) params.revision = opts.revision;

      if (opts.dryRun) {
        dryRunOutput({
          method: "DELETE",
          path: "/k/v1/preview/app/form/fields.json",
          params,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/preview/app/form/fields.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(formFieldsDelete, {
    method: "DELETE",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // --- preview app add ---

  // POST /k/v1/preview/app.json
  const previewAppAdd = previewApp
    .command("add")
    .description("Create a new app")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "POST",
          path: "/k/v1/preview/app.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewAppAdd, {
    method: "POST",
    path: "/k/v1/preview/app.json",
  });

  // --- preview app settings ---

  const previewSettings = previewApp
    .command("settings")
    .description("Preview app settings operations");

  // GET /k/v1/preview/app/settings.json
  const previewSettingsGet = previewSettings
    .command("get")
    .description("Get app settings (pre-live)")
    .option("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const params: Record<string, unknown> = { app: opts.app };
      if (opts.lang) params.lang = opts.lang;

      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/settings.json",
        params,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewSettingsGet, {
    method: "GET",
    path: "/k/v1/preview/app/settings.json",
  });

  // PUT /k/v1/preview/app/settings.json
  const previewSettingsUpdate = previewSettings
    .command("update")
    .description("Update app settings (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/preview/app/settings.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/preview/app/settings.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewSettingsUpdate, {
    method: "PUT",
    path: "/k/v1/preview/app/settings.json",
  });

  // --- preview app form-layout ---

  const previewFormLayout = previewApp
    .command("form-layout")
    .description("Preview form layout operations");

  // GET /k/v1/preview/app/form/layout.json
  const previewFormLayoutGet = previewFormLayout
    .command("get")
    .description("Get form layout (pre-live)")
    .option("--app <id>", "App ID")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["app"]);
      const global = getGlobalOptions(cmd);
      const result = await kintoneRequest({
        method: "GET",
        path: "/k/v1/preview/app/form/layout.json",
        params: { app: opts.app },
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewFormLayoutGet, {
    method: "GET",
    path: "/k/v1/preview/app/form/layout.json",
  });

  // PUT /k/v1/preview/app/form/layout.json
  const previewFormLayoutUpdate = previewFormLayout
    .command("update")
    .description("Update form layout (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        dryRunOutput({
          method: "PUT",
          path: "/k/v1/preview/app/form/layout.json",
          body,
        });
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/preview/app/form/layout.json",
        body,
        authType: global.authType,
        guestSpaceId: toGuestSpaceId(global),
      });
      writeJson(result);
    });
  attachEndpoint(previewFormLayoutUpdate, {
    method: "PUT",
    path: "/k/v1/preview/app/form/layout.json",
  });

  return { previewApp };
};
