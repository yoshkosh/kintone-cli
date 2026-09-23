import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPEC_SRC = path.join(ROOT, "third_party/openapi-spec/openapi.yaml");
const OUT_DIST = path.join(ROOT, "dist/spec.json");
const OUT_SRC = path.join(ROOT, "src/spec.json");

// NOTE: Provenance for THIRD_PARTY_NOTICES.md. MIT-0 requires no attribution,
// but the origin is stamped into the emitted JSON so a downstream consumer can
// identify the upstream source even after the YAML is dropped from the
// published tarball. Keep in sync with THIRD_PARTY_NOTICES.md.
const UPSTREAM_ORIGIN = "https://github.com/kintone/openapi-spec";
const UPSTREAM_LICENSE = "MIT-0";

const yaml = await readFile(SPEC_SRC, "utf8");
const spec = parse(yaml);

const upstreamVersion = spec?.info?.version ?? "unknown";
spec["x-kintone-cli-provenance"] = {
  origin: UPSTREAM_ORIGIN,
  upstreamVersion,
  license: UPSTREAM_LICENSE,
  notice: "See THIRD_PARTY_NOTICES.md in the @yoshkosh/kintone-cli package.",
};

const json = JSON.stringify(spec);

for (const out of [OUT_DIST, OUT_SRC]) {
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, json);
}

process.stdout.write(
  `build-spec: wrote ${OUT_DIST} and ${OUT_SRC} (${json.length} bytes, upstream ${UPSTREAM_LICENSE} ${upstreamVersion})\n`,
);
