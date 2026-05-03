# Third-Party Notices

This package includes material derived from third-party works. Each component
listed below retains its original copyright and is distributed under its
original license. The package as a whole is licensed under the MIT License
(see [`LICENSE`](LICENSE)); the notices in this file apply only to the
specific bundled components identified.

---

## kintone REST API Specification

- **Component**: `dist/spec.json`
- **Origin**: [kintone/rest-api-spec](https://github.com/kintone/rest-api-spec)
- **Upstream version**: `20250423000000` (`info.version` of the bundled OpenAPI document)
- **Vendored source**: `third_party/rest-api-spec/openapi.yaml`
  - Converted to JSON at build time by `scripts/build-spec.mjs` and emitted as `dist/spec.json`.
- **License**: Apache License, Version 2.0 (SPDX: `Apache-2.0`)
- **License text**: <https://www.apache.org/licenses/LICENSE-2.0>
- **Upstream LICENSE file**: <https://github.com/kintone/rest-api-spec/blob/main/LICENSE>

The OpenAPI document is bundled unmodified in content; only its serialization
format is transformed (YAML to JSON) for runtime consumption. No editorial
changes are applied to the upstream specification.

Per Section 4 of the Apache License 2.0, the upstream copyright, license
reference, and origin URL are reproduced above. Recipients of this package
who redistribute `dist/spec.json` must continue to satisfy the conditions of
the Apache License 2.0 with respect to that file.
