# Third-Party Notices

This package includes material derived from third-party works. Each component
listed below retains its original copyright and is distributed under its
original license. The package as a whole is licensed under the MIT License
(see [`LICENSE`](LICENSE)); the notices in this file apply only to the
specific bundled components identified.

---

## Kintone REST API OpenAPI Specification

- **Component**: `dist/spec.json`
- **Origin**: [kintone/openapi-spec](https://github.com/kintone/openapi-spec)
- **Upstream tag**: `v1` (commit `1585b411ace680092fa7667acf53723ecb7bd81e`)
- **Upstream version**: `2026.8.31` (`info.version` of the bundled OpenAPI document)
- **Vendored source**: `third_party/openapi-spec/openapi.yaml`
  - Converted to JSON at build time by `scripts/build-spec.mjs` and emitted as `dist/spec.json`.
- **Copyright**: Copyright (c) 2026 Cybozu, Inc.
- **License**: MIT No Attribution (SPDX: `MIT-0`)
- **License text**: <https://opensource.org/license/mit-0>
- **Upstream LICENSE file**: <https://github.com/kintone/openapi-spec/blob/v1/LICENSE>

The OpenAPI document is bundled unmodified in content; only its serialization
format is transformed (YAML to JSON) for runtime consumption. No editorial
changes are applied to the upstream specification.

MIT-0 does not require attribution. The origin, tag, and version are recorded
above so that the bundled document can be traced back to its upstream source
and refreshed from the same tag series.
