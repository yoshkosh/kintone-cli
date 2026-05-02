import { Command, CommanderError } from "commander";
import { getEndpointSchema } from "./spec.js";
import { getEndpointMeta, walkAll } from "./endpoint-registry.js";

export { attachEndpoint } from "./endpoint-registry.js";

export const installSchemaOption = (program: Command): void => {
  walkAll(program, (cmd) => {
    const meta = getEndpointMeta(cmd);
    if (!meta) return;
    cmd.option("--schema", "Output OpenAPI schema for this endpoint");
    cmd.hook("preAction", (_thisCommand, actionCommand) => {
      if (!actionCommand.opts().schema) return;
      const schema = getEndpointSchema(meta.method, meta.path);
      process.stdout.write(JSON.stringify(schema) + "\n");
      // NOTE: main() の exitOverride() catch 経路に乗せて exit code 0 を返すため、
      // process.exit ではなく CommanderError(0) を throw する
      throw new CommanderError(0, "schema.output", "");
    });
  });
};

// NOTE: --json を持つ全エンドポイントコマンドへ --skip-validation を一括注入する。
// 31 コマンド個別に option 宣言を書かず、新規 endpoint 追加時にも自動で揃うよう
// walkAll で一括処理する。validator.ts は opts.skipValidation を見て分岐する。
export const installSkipValidationOption = (program: Command): void => {
  walkAll(program, (cmd) => {
    if (!getEndpointMeta(cmd)) return;
    const hasJson = cmd.options.some((o) => o.long === "--json");
    if (!hasJson) return;
    cmd.option("--skip-validation", "Bypass OpenAPI request body validation");
  });
};
