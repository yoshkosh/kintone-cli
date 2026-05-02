import { Command, CommanderError } from "commander";
import { getEndpointSchema, type HttpMethod } from "./spec.js";

type EndpointMeta = { method: HttpMethod; path: string };

const endpointMetaMap = new WeakMap<Command, EndpointMeta>();

export const attachEndpoint = (
  command: Command,
  meta: EndpointMeta,
): Command => {
  endpointMetaMap.set(command, meta);
  return command;
};

const walkAll = (root: Command, visit: (cmd: Command) => void): void => {
  for (const child of root.commands) {
    visit(child);
    walkAll(child, visit);
  }
};

export const installSchemaOption = (program: Command): void => {
  walkAll(program, (cmd) => {
    const meta = endpointMetaMap.get(cmd);
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
