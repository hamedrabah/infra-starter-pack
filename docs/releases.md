# Verify a release

Tagged releases from v0.1.1 include an installable package, SHA-256 checksums,
an SPDX dependency inventory, and GitHub artifact attestations.

Download the package and checksum file with the GitHub CLI:

```bash
gh release download v0.1.1 --repo hamedrabah/infra-starter-pack \
  --pattern 'infra-starter-pack-*.tgz' --pattern SHA256SUMS \
  --pattern sbom.spdx.json
shasum -a 256 -c SHA256SUMS
```

Verify that GitHub Actions built this exact package from this repository:

```bash
gh attestation verify infra-starter-pack-0.1.1.tgz \
  --repo hamedrabah/infra-starter-pack \
  --signer-workflow hamedrabah/infra-starter-pack/.github/workflows/release.yml
```

Verify its dependency-inventory attestation:

```bash
gh attestation verify infra-starter-pack-0.1.1.tgz \
  --repo hamedrabah/infra-starter-pack \
  --signer-workflow hamedrabah/infra-starter-pack/.github/workflows/release.yml \
  --predicate-type https://spdx.dev/Document/v2.3
```

The SPDX file records the production dependency versions in the release's
package lock. Dependencies are not bundled into the package; installing it later
can resolve newer versions within its declared ranges. The attestation connects
the package to its build and inventory. It does not certify the code as bug-free.

Install the downloaded package to use it locally:

```bash
npm install --global ./infra-starter-pack-0.1.1.tgz
infra-starter scan .
```

The separate [OpenSSF Scorecard](https://scorecard.dev/viewer/?uri=github.com/hamedrabah/infra-starter-pack)
publishes automated checks of this repository's maintenance and security practices.
Its results update on main-branch pushes and weekly. Each check includes its scope
and limitations; the score is not a security certification.
