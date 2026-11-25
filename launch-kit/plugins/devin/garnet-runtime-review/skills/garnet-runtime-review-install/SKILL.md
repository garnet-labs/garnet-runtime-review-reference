---
name: garnet-runtime-review-install
description: Add Garnet Runtime Review to existing GitHub Actions pull request jobs. Use when asked to install Garnet or record what CI did at runtime.
---

# Install Garnet Runtime Review

Install the [Garnet GitHub App](https://github.com/apps/garnet-runtime-review) on the repository so it can post the Runtime Review comment. If you cannot install it, ask the repository owner to do so and continue preparing the workflow changes.

1. Read `.github/workflows/` and find the workflows and jobs that actually build, test, or otherwise run the pull request workload. Follow calls to repository-owned reusable workflows and instrument the jobs that run the steps. Do not change events or conditions to run jobs that did not already run for PRs.
2. For each eligible Linux x86_64 job, add one Garnet step immediately after `actions/checkout` and before installs, builds, and tests. If the job already uses Garnet, check its placement, permissions, and pin; do not add a second step or skip other jobs. Flag jobs without checkout, unsupported runners, or reusable workflows you cannot edit rather than guessing. In a matrix, use `job_index: ${{ strategy.job-index }}` so each recorded leg stays distinct.
3. Give each instrumented job `contents: read` and `id-token: write` for GitHub OIDC. Preserve existing effective permissions; adding a job-level block replaces workflow-level grants. Do not add a token or sensor override. Use this pin:

   ```yaml
   permissions:
     contents: read
     id-token: write

   steps:
     - uses: actions/checkout@v6
     - uses: garnet-org/action@24833a47c19aad605bb10bcd9b8cad8f318ca187 # v2.6.0
   ```

4. Create `.github/workflows/ci.yml` only if the repository has no PR CI. Use `pull_request` and `push` to the default branch, an `ubuntu-latest` job, and the project's real build or test commands after the steps above. Do not add a parallel recording-only workflow to a repository that already has PR CI.
5. Validate the workflow changes and summarize which jobs will be recorded and why any were left out. On the first instrumented PR, check that the current-head Runtime Review comment covers the jobs that ran. Use `garnet-runtime-review-before-ready` to read the record before asking for review. Runtime evidence describes what the recorded jobs did; it does not approve the PR.
