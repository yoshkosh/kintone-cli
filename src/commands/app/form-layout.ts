import { Command } from "commander";
import { kintoneRequest } from "../../client.js";
import { attachEndpoint } from "../../schema-option.js";
import { validateJsonOrThrow } from "../../validator.js";
import {
  getGlobalOptions,
  toGuestSpaceId,
  writeJson,
  dryRunOutput,
  requireOpts,
  parseJsonOption,
} from "../shared.js";

export const registerAppFormLayoutCommands = ({
  app,
  previewApp,
}: {
  app: Command;
  previewApp: Command;
}): void => {
  // --- live form-layout ---
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

  // --- preview form-layout ---
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
      const body = await parseJsonOption(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
};
