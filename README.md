# Infra Starter Pack

[![CI](https://github.com/hamedrabah/infra-starter-pack/actions/workflows/ci.yml/badge.svg)](https://github.com/hamedrabah/infra-starter-pack/actions/workflows/ci.yml)
[![Replay QA self-test](https://github.com/hamedrabah/infra-starter-pack/actions/workflows/replay-self-test.yml/badge.svg)](https://github.com/hamedrabah/infra-starter-pack/actions/workflows/replay-self-test.yml)
[![Node.js 20+](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Turn a checked-out repository into Mintlify documentation and a Replay QA runtime-quality loop.

```text
repository source → evidence-based docs → running preview → root-caused bugs
                         Mintlify            Replay QA
```

## Status

This is an early, tested `0.1.0` release candidate. The GitHub source works today; the package has not yet been published to npm.

```bash
npx github:hamedrabah/infra-starter-pack init .
```

After the first npm release, the shorter command will be `npx infra-starter-pack init .`.

## What it does

1. **Scans repository evidence** — languages, frameworks, package scripts, OpenAPI specifications, and common JavaScript/TypeScript HTTP route declarations.
2. **Generates Mintlify docs** — `docs.json`, four MDX guides, an evidence report, and a pinned documentation-validation workflow.
3. **Connects to Replay QA** — creates a QA project for a running web app, waits for autonomous exploration, and retrieves root-caused bug reports.
4. **Protects existing work** — records hashes in `.infra-starter/manifest.json`, refreshes unchanged generated files, and stops before overwriting user edits.
5. **Dogfoods Replay** — deploys this repository's [showcase](https://hamedrabah.github.io/infra-starter-pack/) and targets it with a scheduled Replay QA quality gate.

Replay QA tests a **running web application**, not source code in isolation. Source scanning describes what exists; Replay supplies behavioral evidence about whether it works.

## Quick start

Inspect a repository without changing it:

```bash
npx github:hamedrabah/infra-starter-pack scan .
npx github:hamedrabah/infra-starter-pack scan . --json
```

Generate and validate the Mintlify starter:

```bash
npx github:hamedrabah/infra-starter-pack init .
npx --yes mint@4.2.808 validate
```

Connect the repository to Mintlify through the Mintlify dashboard to deploy the generated site.

## Replay QA

Create a token in Replay QA settings, keep it in the environment, and point the command at a running deployment:

```bash
export REPLAY_QA_TOKEN="lqa_..."

npx github:hamedrabah/infra-starter-pack replay . \
  --target-url "https://preview.example.com" \
  --budget 20 \
  --wait \
  --fail-on-bugs \
  --report infra-reports/replay-qa.json
```

For `localhost`, reverse-proxy mode is selected automatically. Follow the setup URL returned by Replay QA. The CLI never writes the token to disk, and reports are created with owner-only permissions.

For pull-request automation, install the Replay QA GitHub App from a Replay QA project. Replay documents this as the native path for testing pushes and pull requests without maintaining another workflow file.

### How this repo dogfoods Replay

The `site/` showcase deploys through GitHub Pages. `.github/workflows/replay-self-test.yml` then:

1. Waits for the public site.
2. Creates a Replay QA project through this package's own API client.
3. Waits for autonomous exploration and runtime analysis.
4. Writes the report as a private-permission artifact.
5. Fails when Replay returns open bugs.

Add `REPLAY_QA_TOKEN` as a GitHub Actions repository secret to activate the scheduled run. When the secret is absent, the workflow reports a notice and performs no scan rather than pretending Replay ran.

## Generated files

| Path | Purpose |
| --- | --- |
| `docs.json` | Mintlify site configuration and OpenAPI navigation |
| `docs/index.mdx` | Repository introduction |
| `docs/architecture.mdx` | Detected technical inventory and scripts |
| `docs/api-overview.mdx` | OpenAPI sources and heuristic route inventory |
| `docs/quality.mdx` | Replay QA operating guide |
| `docs/infra-starter-scan.json` | Machine-readable scan evidence |
| `.github/workflows/infra-starter.yml` | Mintlify validation on pushes and pull requests |
| `.infra-starter/manifest.json` | Ownership hashes used for safe regeneration |

Run `init` again to refresh unmodified generated files. If a generated target was edited manually, the CLI exits before changing any target. Use `--force` only when replacing those edits is intentional.

## Supported detection

- Languages: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, and C# by file inventory.
- Frameworks: Next.js, React, Express, Fastify, Hono, NestJS, Vue, Svelte, Astro, and Remix from package metadata.
- API contracts: OpenAPI or Swagger JSON/YAML files.
- Route heuristics: common Express-style declarations and Next.js API route filenames.

Route detection is deliberately labeled as heuristic. It does not execute source code and does not replace an OpenAPI contract.

## CLI reference

```text
infra-starter scan [directory] [--json]
infra-starter init [directory] [--force] [--target-url URL] [--wait]
infra-starter replay [directory] --target-url URL [--budget N] [--wait] [--fail-on-bugs]
```

Run `npx github:hamedrabah/infra-starter-pack --help` for all options.

## Trust boundaries

- Repository content is treated as data; the scanner does not execute project scripts.
- Existing non-generated and user-modified generated files are not overwritten by default.
- Replay target URLs must use HTTP(S) and cannot contain embedded credentials.
- POST project creation is never automatically retried, preventing accidental duplicate Replay projects.
- Idempotent Replay status requests retry temporary rate-limit and server failures.
- OpenAPI remains the authoritative source for published API reference pages.

## Development

```bash
git clone https://github.com/hamedrabah/infra-starter-pack.git
cd infra-starter-pack
npm ci
npm run check
npm run test:coverage
npm pack --dry-run
```

CI tests Node.js 20 and 22. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CHANGELOG.md](CHANGELOG.md).

## Official references

- [Mintlify OpenAPI setup](https://www.mintlify.com/docs/api-playground/openapi-setup)
- [Mint CLI validation](https://www.mintlify.com/docs/cli/commands)
- [Replay QA overview](https://docs.replay.io/basics/replay-qa/overview)
- [Replay QA OpenAPI specification](https://loop-qa.replay.io/api/v1/openapi.json)

## License

[MIT](LICENSE)
