# Security policy

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing credentials, private repository content, Replay reports, or exploit details.

Include the affected version, impact, minimal reproduction, and any suggested mitigation. You should receive an acknowledgment within five business days.

## Supported versions

Until the first stable release, security fixes are applied to the latest published `0.x` version only.

## Credential handling

- Pass Replay credentials through `REPLAY_QA_TOKEN`; never put them in command arguments or committed configuration.
- Generated Replay reports use owner-only file permissions and are ignored by the starter's `.gitignore`.
- Treat generated API inventories as untrusted repository-derived content and review them before publishing.
