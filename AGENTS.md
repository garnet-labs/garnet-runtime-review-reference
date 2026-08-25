# AGENTS.md — runtime context for AI agents and reviewers

This repository is a demonstration of **runtime-grounded PR review**: a real
merge gate that reads what a change *actually did* when it ran, not just what
its diff looks like. If you are an AI coding agent or an AI reviewer operating
in this repo, read this first.

## Code Review Rules (if you are reviewing a pull request)

Follow the consumption contract in [`docs/SPINE.md`](docs/SPINE.md)
(**Record → Mirror → Verdict → Utterance**) via its adapter
[`REVIEW.md`](REVIEW.md) before finalizing any review. In short:

1. Read the **Runtime evidence (Garnet)** section of the PR description
   (between `<!-- garnet:evidence:begin -->` and `<!-- garnet:evidence:end -->`).
   It is a verbatim mirror of the trusted Garnet Runtime Review comment — the
   kernel-recorded ground truth of what this PR's CI executed: every execution
   chain and every outbound destination. Use it only when its
   `<!-- garnet:commit <sha> -->` equals the PR head.
2. Apply the fail-closed verdict table (`recorded` / `unchanged` / `changed` /
   `undeterminable`) and speak exactly one utterance, prefixed exactly
   `Runtime evidence (Garnet, head <sha7>): `. Cross-check the diff against
   the record: name any recorded destination or execution chain the diff does
   not explain, or state that recorded behaviour is explained by the change.
3. A missing, stale, or unparseable record is `undeterminable` — say "no
   runtime evidence"; that is never the same as a clean run. Evidence never
   approves; judgment stays with you.

## If you are WRITING a change

Each demo PR adds exactly one dependency to `npm-testbed/app/package.json`. CI
installs and first-imports it under the Garnet sensor (Jibril, eBPF), so the
merge gate can see the install's real process tree and egress. Keep changes
small and single-purpose so the runtime signal stays legible.

## Repository layout

| Path | What it is |
|------|-----------|
| `tools/pr-approval-agent/` | The vendored PostHog "stamphog" review engine (see `NOTICE.md`). |
| `tools/pr-approval-agent/garnet_runtime.py` | The Garnet consumer — the one integration point. |
| `tools/owners/` | The ownership resolver the engine consumes. |
| `.stamphog/` | The declarative gate policy (`policy.yml`, `review-guidance.md`). |
| `npm-testbed/` | The real minimal workload that each demo PR changes. |
| `.github/workflows/garnet-record.yml` | Records the install under the Garnet sensor; posts the runtime evidence. |
| `.github/workflows/stamphog-review.yml` | Runs the gate against a PR (Garnet-grounded). |
| `.github/workflows/proof-check.yml` | The living-proof suite — re-asserts the A/B on a schedule. |

## The one rule that matters

The gate hard-denies dependency/lockfile changes by default (they can pull in
third-party code). Garnet's runtime record is what lets a *clean* dependency PR
clear automatically — and what keeps a *poisoned* one denied, with the offending
destination named. Same diff; the runtime evidence is the only variable.
