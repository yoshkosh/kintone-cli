import { Command } from "commander";
import { kintoneRequest } from "../client.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
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
  deploy
    .command("get")
    .description("Get deploy status of apps")
    .requiredOption("--apps <ids>", "Comma-separated App IDs")
    .action(async (opts, cmd) => {
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

  // POST /k/v1/preview/app/deploy.json
  deploy
    .command("add")
    .description("Deploy app settings to live")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // --- form-fields ---

  const formFields = previewApp
    .command("form-fields")
    .description(
      "Preview form field operations (/k/v1/preview/app/form/fields)",
    );

  // GET /k/v1/preview/app/form/fields.json
  formFields
    .command("get")
    .description("Get form fields (pre-live)")
    .requiredOption("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
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

  // POST /k/v1/preview/app/form/fields.json
  formFields
    .command("add")
    .description("Add form fields (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // PUT /k/v1/preview/app/form/fields.json
  formFields
    .command("update")
    .description("Update form fields (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // DELETE /k/v1/preview/app/form/fields.json
  formFields
    .command("delete")
    .description("Delete form fields (pre-live)")
    .requiredOption("--app <id>", "App ID")
    .requiredOption(
      "--fields <fields>",
      "Comma-separated field codes to delete",
    )
    .option("--revision <revision>", "Expected revision number")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // --- preview app add ---

  // POST /k/v1/preview/app.json
  previewApp
    .command("add")
    .description("Create a new app")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // --- preview app settings ---

  const previewSettings = previewApp
    .command("settings")
    .description("Preview app settings operations");

  // GET /k/v1/preview/app/settings.json
  previewSettings
    .command("get")
    .description("Get app settings (pre-live)")
    .requiredOption("--app <id>", "App ID")
    .option("--lang <lang>", "Language: default, en, zh, ja, user")
    .action(async (opts, cmd) => {
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

  // PUT /k/v1/preview/app/settings.json
  previewSettings
    .command("update")
    .description("Update app settings (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  // --- preview app form-layout ---

  const previewFormLayout = previewApp
    .command("form-layout")
    .description("Preview form layout operations");

  // GET /k/v1/preview/app/form/layout.json
  previewFormLayout
    .command("get")
    .description("Get form layout (pre-live)")
    .requiredOption("--app <id>", "App ID")
    .action(async (opts, cmd) => {
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

  // PUT /k/v1/preview/app/form/layout.json
  previewFormLayout
    .command("update")
    .description("Update form layout (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
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

  return { previewApp };
};
