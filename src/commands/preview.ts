import { Command } from "commander";
import { kintoneRequest } from "../client.js";

type GlobalOptions = {
  authType?: string;
  guestSpaceId?: string;
};

const getGlobalOptions = (cmd: Command): GlobalOptions => {
  const root = cmd.optsWithGlobals();
  return {
    authType: root.authType,
    guestSpaceId: root.guestSpaceId,
  };
};

const guestSpaceId = (global: GlobalOptions): number | undefined =>
  global.guestSpaceId ? Number(global.guestSpaceId) : undefined;

export const registerPreviewCommands = (program: Command): void => {
  const preview = program
    .command("preview")
    .description("Preview (pre-live) operations (/k/v1/preview)");

  const previewApp = preview
    .command("app")
    .description("Preview app operations");

  // --- deploy ---

  const deploy = previewApp
    .command("deploy")
    .description("App deploy operations (/k/v1/preview/app/deploy)");

  // GET /k/v1/preview/app/deploy.json — クエリパラメータ: apps[](必須)
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
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // POST /k/v1/preview/app/deploy.json — requestBody: apps(必須), revert
  deploy
    .command("add")
    .description("Deploy app settings to live")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            {
              dryRun: true,
              method: "POST",
              path: "/k/v1/preview/app/deploy.json",
              body,
            },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/deploy.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // --- form-fields ---

  const formFields = previewApp
    .command("form-fields")
    .description(
      "Preview form field operations (/k/v1/preview/app/form/fields)",
    );

  // GET /k/v1/preview/app/form/fields.json — クエリパラメータ: app(必須), lang
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
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // POST /k/v1/preview/app/form/fields.json — requestBody: app(必須), properties(必須), revision
  formFields
    .command("add")
    .description("Add form fields (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            {
              dryRun: true,
              method: "POST",
              path: "/k/v1/preview/app/form/fields.json",
              body,
            },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "POST",
        path: "/k/v1/preview/app/form/fields.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // PUT /k/v1/preview/app/form/fields.json — requestBody: app(必須), properties(必須), revision
  formFields
    .command("update")
    .description("Update form fields (pre-live)")
    .requiredOption("--json <payload>", "Raw JSON payload")
    .option("--dry-run", "Validate without executing")
    .action(async (opts, cmd) => {
      const global = getGlobalOptions(cmd);
      const body = JSON.parse(opts.json);

      if (opts.dryRun) {
        process.stdout.write(
          JSON.stringify(
            {
              dryRun: true,
              method: "PUT",
              path: "/k/v1/preview/app/form/fields.json",
              body,
            },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "PUT",
        path: "/k/v1/preview/app/form/fields.json",
        body,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });

  // DELETE /k/v1/preview/app/form/fields.json — クエリパラメータ: app(必須), fields[](必須), revision
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
        process.stdout.write(
          JSON.stringify(
            {
              dryRun: true,
              method: "DELETE",
              path: "/k/v1/preview/app/form/fields.json",
              params,
            },
            undefined,
            2,
          ) + "\n",
        );
        return;
      }

      const result = await kintoneRequest({
        method: "DELETE",
        path: "/k/v1/preview/app/form/fields.json",
        params,
        authType: global.authType,
        guestSpaceId: guestSpaceId(global),
      });
      process.stdout.write(JSON.stringify(result, undefined, 2) + "\n");
    });
};
