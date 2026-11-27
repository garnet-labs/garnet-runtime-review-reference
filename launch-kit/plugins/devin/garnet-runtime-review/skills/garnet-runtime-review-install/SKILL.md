---
name: garnet-runtime-review-install
description: Add Garnet Runtime Review to existing GitHub Actions pull request jobs. Use when asked to install Garnet or record what CI did at runtime.
---

# Install Garnet Runtime Review

Follow the published [agent setup guide](https://docs.garnet.ai/agent-setup.md). The Action records the job; only the Garnet GitHub App posts the Runtime Review comment.

1. Read `.github/workflows/` and find the existing workflows and jobs that build, test, or otherwise run the pull request workload. Edit those workflows in place. Keep their triggers and job conditions; do not switch to `pull_request_target` to obtain credentials.
2. Fetch [pins.txt](https://garnet.ai/pins.txt) on every setup. Copy its `uses:` line only if it reports `OK=1` and supplies a full commit SHA for `garnet-org/action`. If the manifest or a verified pin is unavailable, stop and report that you could not verify the pin. Do not use a cached SHA or a floating tag. Leave `jibril_version` unset.
3. In each eligible Linux x86_64 job, place Garnet immediately after `actions/checkout`, before installs, builds, and tests. If Garnet is already present, move or update the existing step and repair its grants as needed; do not duplicate it or skip other jobs. Flag jobs without checkout or with unsupported runners rather than guessing. In a matrix, set `job_index: ${{ strategy.job-index }}`.
4. Ensure effective `contents: read` (or an existing higher grant) and `id-token: write` for GitHub OIDC. Keep all other grants; a job-level block replaces inherited workflow grants. Only instrument a reusable workflow when you can verify that every caller is in the same repository. Trace nested and non-PR callers and verify or update both grants at every hop, preserving other grants. If any caller is external, or you cannot verify or update its grants, leave the reusable workflow unchanged and explain what is needed. If OIDC is unavailable, refer to the [quickstart fallback](https://docs.garnet.ai/quickstart.md#add-the-action-to-your-workflow); do not add a token by default.
5. If the repository has no PR CI, create a workflow at an unused path under `.github/workflows/`. Use `pull_request` and `push` to the default branch, an `ubuntu-latest` job, and the project's real build or test commands. Do not overwrite or repurpose another workflow or add a parallel recording-only workflow.
6. Validate the changes, then commit them on a new branch, push it to GitHub, and open a pull request. Do not stop after editing or validating the files unless asked to do a local-only run. If there are no changes to make, report that instead of opening an empty PR. Summarize which jobs will be recorded and why any were left out.

## Verify the first instrumented PR

If the App is not installed, send the repository owner the [App installation link](https://github.com/apps/garnet-runtime-review/installations/select_target); the owner completes installation on GitHub.

On the first instrumented PR, use `garnet-runtime-review` to check `pr_review` for the GitHub PR head. Check once after CI or on the next requested review; do not wait or poll. Report the head SHA, result, capture limits, and App comment URL. Include the exact **Full record in Garnet** link if the trusted comment provides one. If the current-head record cannot be verified, say why instead of citing an older or pending record.
