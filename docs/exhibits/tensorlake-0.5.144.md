# Exhibit — tensorlake@0.5.144, install-path runtime record

A runtime receipt for a real malicious npm package: the install exits cleanly,
and the kernel-level record shows what actually ran.

## Package

- `tensorlake` 0.5.144 — published to npm 2026-10-08, later unpublished
  (upstream discussion: [tensorlakeai/tensorlake#1014](https://github.com/tensorlakeai/tensorlake/issues/1014)).
- Exact tarball, preserved before the unpublish:
  `sha512-8qtxbz+jaeJLjfseUFuyRSdkvz3fT3zodPXHM88NwjgbgVfCHdN20Uy50N0x9D5L76dbB1enSNx157guBQKiPQ==`

## Capture context

Controlled replay of the exact published tarball on an ephemeral GitHub-hosted
runner in a private analysis repo, recorded at the kernel by Garnet Runtime
Review. CI indicators were removed to exercise the package's non-CI install
path — the version's install hook is dormant on CI by design. The CI surface
(job `build`, step `Install dependencies`) is a normal dependency install.

- Execution Profile: https://app.garnet.ai/public/runs/37722531248?profile=01a1198c-d07b-7722-ba4d-20b0af03f68b
- Profile JSON: https://app.garnet.ai/api/public/runs/37722531248?profile=01a1198c-d07b-7722-ba4d-20b0af03f68b

## What the record shows

`npm install` completes with exit code 0 and no unusual lifecycle output. The
kernel record underneath:

- `bash → node (step: "Install dependencies")` — the install hook
  (`node lib/setup.mjs`) spawns a chain that fetches a second-stage binary
  from `github.com` and `release-assets.githubusercontent.com`.
- A detached process (`bun`, reparented to `systemd` so it outlives npm)
  attempts connections to Ethereum RPC endpoints
  (`canary.shark.multi-rpc.com`, `eth.llamarpc.com`,
  `ethereum.publicnode.com`), `iseekaigogo.com`, and the cloud metadata
  service (`169.254.169.254`).
- No persistence artifacts were left on the runner and no processes survived
  the job.

## Non-claims

- This is a controlled replay, not an organic in-the-wild capture.
- Destinations are kernel-recorded connection attempts; no successful
  exfiltration is claimed.
- The record shows a connection attempt to the cloud metadata address; it
  does not show whether that attempt was answered or blocked.
