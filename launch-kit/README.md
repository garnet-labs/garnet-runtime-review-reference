# Garnet Runtime Review launch kit

Record what your CI jobs do. The Garnet GitHub App posts a Runtime Review comment on the pull request, with links to the recorded jobs' Execution Profiles.

## Set up Runtime Review

1. Install the [Garnet GitHub App](https://github.com/apps/garnet-runtime-review) on your repository.
2. Add the [pinned Garnet step](snippets/setup.yml) after checkout in each Linux x86_64 job you want to record, before your builds and tests. Keep your current job permissions and add `contents: read` and `id-token: write` for GitHub OIDC. Open a PR and look for the Runtime Review comment after CI finishes.

[Try it in a new repository](sample/README.md) with a working workflow and a first-PR walkthrough.

[15-minute validation reference](VALIDATION.md) for co-founders and beta testers: setup, author self-check, and AI review.

[GitHub Checks](CHECKS.md): use the App's readiness signal when enabled, or opt in to a separate repository policy check.

## Give your reviewers the record

- [`REVIEW.md`](snippets/REVIEW.md): tell reviewers how to read and cite the current-head evidence.
- [`AGENTS.md`](snippets/AGENTS.md): tell coding agents how to check their own PR after a push.
- [Skills](skills/) and [plugins](plugins/README.md): use the same install, author, and review instructions in Devin, Claude Code, and Cursor.

[Setup docs](https://docs.garnet.ai/quickstart) · [Read runtime evidence](https://docs.garnet.ai/consume) · [Runner coverage](https://docs.garnet.ai/coverage)
