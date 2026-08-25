# Contributing

Thanks for helping improve Infra Starter Pack. Keep contributions focused on a concrete repository-documentation or runtime-QA workflow.

## Local setup

```bash
git clone https://github.com/hamedrabah/infra-starter-pack.git
cd infra-starter-pack
npm ci
npm run check
```

Node.js 20 or 22 is supported. Tests use Node's built-in test runner and do not require Mintlify or Replay accounts.

## Pull requests

1. Open an issue first for a large behavioral or CLI change.
2. Add a regression test for fixes and behavioral tests for new features.
3. Preserve existing files in target repositories. Generator changes must prove safe first-run, refresh, and conflict behavior.
4. Mock Replay API calls in tests. Never use or record a real token in fixtures.
5. Run `npm run check` and `npm pack --dry-run` before opening the pull request.

Generated output is part of the public contract. Call out changes to `docs.json`, MDX, workflows, or `.infra-starter/manifest.json` in the pull request.
