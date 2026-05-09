# Security Policy

> **Note:** This is an unofficial third-party CLI and is **not affiliated with
> or endorsed by Cybozu, Inc.** (the vendor of kintone). Vulnerabilities in
> this tool should be reported to this repository's maintainer, **not** to
> Cybozu. For vulnerabilities in the kintone service itself, contact Cybozu
> through their official channels.

## Reporting a Vulnerability

This CLI handles kintone credentials (`KINTONE_API_TOKEN`, `KINTONE_PASSWORD`,
OAuth bearer tokens) and is intended for use by automated agents. If you
believe you have found a vulnerability — credential leakage, request smuggling,
or any issue that could compromise a user's kintone tenant — please report it
privately rather than opening a public issue.

Use **GitHub Private Vulnerability Reporting** for this repository:

→ <https://github.com/yoshkosh/kintone-cli/security/advisories/new>

Please include a description, reproduction steps, the affected version
(`kt --version`), and, if known, the impact and a suggested mitigation. You
can expect an acknowledgment within a few business days.

## Supported Versions

Only the latest published `0.x` version on npmjs.org receives security fixes
while the project is pre-1.0.
