# Changelog

This project follows [Semantic Versioning](https://semver.org/). Until `1.0.0`, minor versions may include breaking changes documented here.

## Unreleased

### Added

- Repository scanner for languages, frameworks, OpenAPI documents, and common JavaScript/TypeScript HTTP routes.
- Mintlify configuration, MDX pages, scan report, and GitHub Actions generation.
- Replay QA project creation, status polling, bug retrieval, and private JSON reports.
- Content-hashed generation manifest for safe refreshes and conflict detection.

### Security

- Replay tokens are accepted through environment variables rather than command arguments.
- Replay target URLs reject non-HTTP protocols and embedded credentials.
