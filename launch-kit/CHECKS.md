# GitHub Checks for Runtime Review

## Layer 1: Garnet record ready

The GitHub App's optional `Garnet record ready` check is off in production. Publishing it requires both the production record-status flag and the App's Checks permission. The Garnet Action itself posts no check, and the Runtime Review comment does not require one.

The check starts as `in_progress` once recording starts on the PR head. It completes with `success` for a finalized usable result, including new behavior, or `neutral` when the result is incomplete or unavailable. A runtime difference does not turn this check red.

The title can say **Garnet record: unchanged**, **Garnet record: new behavior**, **Garnet record: new behavior (first record)**, or **Garnet record: incomplete**. The check summary's JSON is derived from the same `garnet:summary` marker as MCP `pr_review`, but has a different shape. It includes `outcome`, `status`, and `head_sha`; it can also include `capture_quality`, `scope`, counts, and `details_url`. For a usable record, the check's `outcome` corresponds to MCP's `result`.

When the check is enabled, a reviewer that runs in GitHub Actions (such as Claude Code Action) can use [`on: { check_run: { types: [completed] } }`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run) to avoid reviewing before the check completes. The workflow must be on the default branch, and GitHub suppresses this trigger for check suites created by Actions or whose head SHA is associated with Actions. Filter for the Garnet App and the exact check name, and compare the payload's check head to the current PR head, not the workflow's `GITHUB_SHA`. If the signal is unavailable, use the App comment and report missing evidence as unknown.

Layer 1 is non-blocking unless you make it a required check. [GitHub accepts both `success` and `neutral` for required checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks#check-statuses-and-conclusions), so requiring it does not require complete capture or no runtime changes. Neither result approves a PR.

## Layer 2: optional repository policy

For a red-check trigger or a Branch Protection rule, opt in to a separate, repository-owned policy check. The repository defines when it fails; Garnet does not provide this check as part of setup. The policy can read the App comment or `pr_review` without enabling Layer 1. Verify that evidence is finalized and bound to the current PR head before applying the policy. Missing or partial capture is unknown, and a best-effort result cannot pass a policy that requires complete capture.
