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
} from "../shared.js";

export const registerAppFormFieldsCommands = ({
  app,
  previewApp,
}: {
  app: Command;
  previewApp: Command;
}): void => {
  // --- live form-fields ---
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

  // --- preview form-fields ---
  const previewFormFields = previewApp
    .command("form-fields")
    .description("Preview form field operations (/k/v1/preview/app/form/fields)");

  // GET /k/v1/preview/app/form/fields.json
  const previewFormFieldsGet = previewFormFields
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
  attachEndpoint(previewFormFieldsGet, {
    method: "GET",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // POST /k/v1/preview/app/form/fields.json
  const previewFormFieldsAdd = previewFormFields
    .command("add")
    .description("Add form fields (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(previewFormFieldsAdd, {
    method: "POST",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // PUT /k/v1/preview/app/form/fields.json
  const previewFormFieldsUpdate = previewFormFields
    .command("update")
    .description("Update form fields (pre-live)")
    .option("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      requireOpts(opts, ["json"]);
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);
      validateJsonOrThrow(cmd, opts, body);

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
  attachEndpoint(previewFormFieldsUpdate, {
    method: "PUT",
    path: "/k/v1/preview/app/form/fields.json",
  });

  // DELETE /k/v1/preview/app/form/fields.json
  const previewFormFieldsDelete = previewFormFields
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
  attachEndpoint(previewFormFieldsDelete, {
    method: "DELETE",
    path: "/k/v1/preview/app/form/fields.json",
  });
};
