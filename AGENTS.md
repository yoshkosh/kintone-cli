# AGENTS.md

Conventions for coding agents (Codex, Cursor, Claude Code, …) and human
contributors working **on** this repository. If you are an agent looking for
how to **use** the published CLI, read `skills/kt/SKILL.md` instead — it ships
in the npm tarball and is the user-facing surface.

## Project at a glance

- An **unofficial** third-party CLI — not affiliated with or endorsed by
  Cybozu, Inc. (the vendor of kintone). Keep this distinction visible in
  user-facing surfaces (README, SKILL.md, `--help` output, npm description).
- A schema-validated CLI facade over the kintone REST API, designed for AI
  agents and humans. The CLI binary is `kt` (also `kintone-cli`).
- TypeScript, ESM only, Node.js ≥ 22 (uses built-in `fetch`).
- The OpenAPI Specification (`third_party/rest-api-spec/openapi.yaml`) is
  vendored, converted to `dist/spec.json` at build time, and used at runtime
  for `--schema` introspection and `--json` payload validation.

## Build, test, run

The repository is canonically managed with **pnpm** (`pnpm-lock.yaml`,
`packageManager` field). `corepack enable` once, then:

```bash
pnpm install --frozen-lockfile
pnpm build                # tsc + scripts/build-spec.mjs
pnpm test                 # build-spec + vitest run
pnpm test:watch
node dist/index.js --help # run the locally built CLI
```

## Source of truth

- API shape — request/response, parameters, schemas — comes from the **kintone
  official OpenAPI Specification** (<https://github.com/kintone/rest-api-spec>).
  Do **not** infer behavior from third-party docs (Context7, blog posts) when
  the spec has an answer. The vendored copy in `third_party/rest-api-spec/` is
  the working reference; refresh it via `gh api` if you need the latest.
- Design decisions are recorded in [`docs/decisions.md`](docs/decisions.md)
  (Japanese). Open spec/operational details live in
  [`docs/spec.md`](docs/spec.md) and [`docs/ideas.md`](docs/ideas.md).
  Read them before changing established behavior; if a change overturns an
  ADR, update `docs/decisions.md` in the same PR.

## Code conventions

- **Modules**: ESM. Imports use the `.js` extension even for `.ts` source.
- **Types**: prefer `type` aliases over `interface`. Avoid classes unless
  there is a clear reason (e.g. `KintoneAPIError`).
- **Functions**: arrow functions over `function` declarations. Multi-argument
  functions take a destructured options object; positional arguments are only
  acceptable when there is one argument or a widely known order
  (`slice(start, end)`, `clamp(value, min, max)`).
- **Null vs undefined**: prefer `undefined`. Use `null` only when a
  downstream contract requires it.
- **Comments**: explain _why_, never _what_. Mark intentional design comments
  with `// NOTE: …`. Public exports get short English JSDoc when shape alone
  is not enough.
- **File hygiene**: every file ends with a newline.
- **Tests**: colocated as `src/**/*.test.ts`; excluded from the build via
  `tsconfig.exclude`. HTTP is mocked with `undici`'s `MockAgent` (see
  `docs/decisions.md` 2026-04-16 entries).

## Things that are out of scope here

- Re-explaining how to _use_ the CLI — that is `skills/kt/SKILL.md` and
  `README.md`.
- Restating the release process — that lives in `prompts/release-plan.md`
  during the pre-public-release period and will graduate to a top-level doc
  later.
