# Infra Starter Pack

Turn a checked-out GitHub repository into publishable API docs and a runtime QA loop:

```bash
npx infra-starter-pack init
```

The command scans the repository, creates a Mintlify documentation starter, finds OpenAPI files and common JavaScript/TypeScript routes, and adds GitHub Actions validation. If you have a running build and a Replay QA token, it can immediately launch autonomous browser testing:

```bash
export REPLAY_QA_TOKEN="lqa_..."
npx infra-starter-pack init \
  --target-url "https://preview.example.com" \
  --wait \
  --report infra-reports/replay-qa.json
```

## What it actually does

1. **Repository scan** — inventories languages, frameworks, package scripts, OpenAPI specs, and common HTTP route declarations.
2. **Mintlify output** — writes `docs.json`, four MDX guides, and a machine-readable scan report. OpenAPI 3.x specs become interactive API-reference navigation.
3. **Replay QA** — creates a project through Replay's public REST API for a deployed or localhost web app. Replay explores the app, writes and runs tests, captures runtime recordings, and returns root-caused bugs.
4. **GitHub workflow** — validates Mintlify on pushes/PRs and offers a manual Replay QA run with repository secrets.

Replay QA tests a **running web app**, not arbitrary source code in isolation. That distinction is intentional: source scanning describes what exists; Replay supplies behavioral evidence about whether the product works.

## Commands

```bash
# Inspect without writing files
npx infra-starter-pack scan .
npx infra-starter-pack scan . --json

# Generate or refresh the starter
npx infra-starter-pack init .

# Start Replay QA separately
npx infra-starter-pack replay . \
  --target-url "https://preview.example.com" \
  --budget 20 \
  --wait \
  --report infra-reports/replay-qa.json
```

For `localhost`, the CLI automatically requests Replay's reverse-proxy mode. Follow the setup URL returned by Replay QA.

## Required setup

- Node.js 20+
- Mintlify: connect the repository in the Mintlify dashboard, then run `npx mint@latest validate` locally.
- Replay QA: generate an API token in Replay QA settings and store it as `REPLAY_QA_TOKEN`.
- GitHub Actions: add `REPLAY_QA_TOKEN` as a secret and `REPLAY_QA_TARGET_URL` as a repository variable.

You can alternatively install the Replay QA GitHub App from your Replay QA project. Replay will then test pushes and pull requests without the generated workflow.

Official references: [Mintlify OpenAPI setup](https://www.mintlify.com/docs/api-playground/openapi-setup), [Mint CLI validation](https://www.mintlify.com/docs/cli/commands), [Replay QA overview](https://docs.replay.io/basics/replay-qa/overview), and the [Replay QA OpenAPI specification](https://loop-qa.replay.io/api/v1/openapi.json).

## Safety and trust

- Existing non-generated target files are never overwritten unless `--force` is passed.
- Replay tokens are read from the environment and are never written to disk.
- Heuristically detected routes are labeled as an inventory, not presented as an authoritative API contract.
- OpenAPI is the authoritative source for Mintlify API reference pages.

## Development

```bash
npm install
npm test
npm run check
```

## Publish

The package name must be available on npm before publishing. After setting the final name and npm account:

```bash
npm publish
```

## Product thesis

Mintlify turns repository knowledge into an interface for humans and agents. Replay QA supplies runtime evidence when the generated or edited app behaves incorrectly. Together, the starter creates a simple loop: **understand the system → exercise the system → diagnose failures → improve the system**.
