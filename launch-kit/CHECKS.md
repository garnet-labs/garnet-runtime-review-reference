# GitHub Checks for Runtime Review

## Layer 1: Garnet record ready

Use the App's `Garnet record ready` check as the default timing signal **when enabled**. It requires the App's Checks permission and is off by default in the current deployment. The Runtime Review comment remains available without it.

The check starts as `in_progress` once recording starts on the PR head. It completes with `success` for a finalized usable result, including new behavior, or `neutral` when the result is incomplete or unavailable. A runtime difference does not turn this check red.

The title can say **Garnet record: unchanged**, **Garnet record: new behavior**, **Garnet record: new behavior (first record)**, or **Garnet record: incomplete**. The JSON block in the check summary includes `outcome`, `status`, and `head_sha`; it can also include `capture_quality`, `scope`, counts, and `details_url`. The check and MCP `pr_review` use the same App record. The check's `outcome` corresponds to MCP `result` when the record is usable. The check summary is not the full MCP response.

To avoid reviewing before the record is ready, route the Garnet App's completed check to your PR reviewer (Claude Code, Greptile, Codex, or Cursor) through an integration that can consume it. In GitHub Actions the trigger is [`check_run: { types: [completed] }`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run). The workflow must be on the default branch, and GitHub suppresses this trigger for check suites created by Actions or whose head SHA is associated with Actions. Filter for the Garnet App and the exact check name, and compare the payload's check head to the current PR head, not the workflow's `GITHUB_SHA`. This is integration wiring, not a built-in trigger verified for each reviewer. If the signal is unavailable, use the App comment and report missing evidence as unknown.

Layer 1 is non-blocking unless you make it a required check. [GitHub accepts both `success` and `neutral` for required checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks#check-statuses-and-conclusions), so requiring it does not require complete capture or no runtime changes. Neither result approves a PR.

## Layer 2: optional repository policy

For a red-check trigger or to enforce a rule in Branch Protection, use a separate check. Copy the [opt-in workflow](snippets/runtime-diff.yml) to `.github/workflows/garnet-runtime-diff.yml` on your default branch. It listens for the Garnet App comment and does not require Layer 1 to be enabled. It does not install the App or change its permissions.

The example is for public repositories: `garnet/runtime-diff` succeeds only when the current-head `pr_review` result is finalized and reports `unchanged` with declared best-effort or complete capture. That means no new behavior **within the recorded comparison scope**, not that capture was complete. New behavior, a missing comparison, and unknown capture fail the **repository policy**, not the Garnet readiness check. If your policy requires complete capture, a best-effort result cannot meet it.

Review that policy before requiring the check. A PR that never gets an App comment will not get this check. An integration can consume the failed check if it subscribes to that event; a check created with `GITHUB_TOKEN` does not start a second Actions workflow. Use the same workflow to dispatch any Actions-based follow-up.
