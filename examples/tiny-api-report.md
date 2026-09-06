# Infrastructure report: tiny-api

> Generated from repository evidence by [Infra Starter Pack](https://github.com/hamedrabah/infra-starter-pack).

## Repository signals

- **Files scanned:** 3
- **Source files:** 1
- **Languages:** JavaScript (1)
- **Frameworks:** React, Express
- **Package manager:** Not detected
- **OpenAPI contracts:** 1
- **Observed or inferred routes:** 2

## Recommended controls

| Tool | Fit | Evidence |
| --- | --- | --- |
| TruffleHog | Add now | Every repository can accidentally commit credentials; this check needs no vendor token. |
| Socket | Add now | 1 dependency manifest was detected. Socket adds install-time and pull-request supply-chain policy. |
| Stainless | Add now | 1 OpenAPI contract was detected, so generated client SDKs can stay synchronized with the API. |
| Braintrust | Conditional | Use when the repository adds model calls, prompts, or agent workflows; generic repositories do not need an eval platform yet. |

## Evidence boundaries

This report does not execute repository code. Route detection is heuristic; OpenAPI remains the authoritative source for API documentation. Hosted integrations require explicit authentication by the repository owner.

