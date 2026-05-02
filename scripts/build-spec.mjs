import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_SRC = path.join(ROOT, "third_party/rest-api-spec/openapi.yaml");
const OUT_DIST = path.join(ROOT, "dist/spec.json");
const OUT_SRC = path.join(ROOT, "src/spec.json");

const yaml = await readFile(SPEC_SRC, "utf8");
const spec = parse(yaml);
const json = JSON.stringify(spec);

for (const out of [OUT_DIST, OUT_SRC]) {
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, json);
}

process.stdout.write(`build-spec: wrote ${OUT_DIST} and ${OUT_SRC} (${json.length} bytes)\n`);
