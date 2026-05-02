import type { Command } from "commander";
import type { HttpMethod } from "./spec.js";

export type EndpointMeta = { method: HttpMethod; path: string };

const endpointMetaMap = new WeakMap<Command, EndpointMeta>();

export const attachEndpoint = (
  command: Command,
  meta: EndpointMeta,
): Command => {
  endpointMetaMap.set(command, meta);
  return command;
};

export const getEndpointMeta = (command: Command): EndpointMeta | undefined =>
  endpointMetaMap.get(command);

export const walkAll = (root: Command, visit: (cmd: Command) => void): void => {
  for (const child of root.commands) {
    visit(child);
    walkAll(child, visit);
  }
};
