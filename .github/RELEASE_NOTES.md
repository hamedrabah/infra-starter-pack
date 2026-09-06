An installable package with a verifiable build trail.

- Package tarball and SHA-256 checksums.
- SPDX inventory of the locked production dependencies used for this release.
- GitHub build-provenance and SBOM attestations tied to the package digest.
- Public OpenSSF Scorecard workflow and immutable action references.
- A complete sample report generated from the checked-in fixture.

See [the verification commands](https://github.com/hamedrabah/infra-starter-pack/blob/v0.1.1/docs/releases.md).

The scanner's behavior is unchanged. The package is distributed through this
GitHub release; it is not published to the npm registry.
