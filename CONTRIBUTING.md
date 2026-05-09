# Contributing

Thanks for taking the time to look at this project. The notes below are the
minimum needed to file a useful issue or pull request. Engineering conventions
and architectural references live in [`AGENTS.md`](AGENTS.md).

## Reporting issues

When opening an issue, please include:

- A minimal reproduction (the exact `kt` command, redacted environment, and
  the JSON or stderr output you saw).
- The kintone subdomain plan/region only if it is relevant to the bug
  (do **not** post API tokens, passwords, or session cookies).
- Your `kt --version` and `node --version`.

For suspected security issues, follow [`SECURITY.md`](SECURITY.md) instead of
filing a public issue.

## Pull requests

1. Branch from `main`.
2. Make your change. Keep the diff focused; unrelated cleanup belongs in a
   separate PR.
3. Ensure CI is green (build, type-check, and `vitest run` all pass).
4. Open a pull request describing the user-visible change and the reason.
   Reference the relevant section of [`docs/decisions.md`](docs/decisions.md)
   if your change touches an existing design decision.

## Code conventions

See [`AGENTS.md`](AGENTS.md). The short version: ESM only, `type` over
`interface`, comments explain _why_ (prefixed `// NOTE:`), and the kintone
OpenAPI Specification is the single source of truth for API shape.
