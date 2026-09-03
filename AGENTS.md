# AGENTS.md — runtime context for AI agents and reviewers

Garnet records what an exact CI execution did, binds that evidence to the head
SHA, and publishes it as an **Execution Profile**. Garnet records; the reviewer
and repository policy decide.

This repository is the public reference for that loop. It also keeps a merge
gate (`.stamphog/`, `tools/pr-approval-agent/`) as an example of repository
policy consuming an Execution Profile. The gate's decisions are the policy's,
not Garnet's. If you are an AI coding agent or an AI reviewer operating in this
repo, read this first.

## Code Review Rules (if you are reviewing a pull request)

Follow the consumption contract in [`docs/SPINE.md`](docs/SPINE.md)
(**Record → Mirror → Verdict → Utterance**) via its adapter
[`REVIEW.md`](REVIEW.md) before finalizing any review. In short:

1. Read the **Runtime evidence (Garnet)** section of the PR description
   (between `<!-- garnet:evidence:begin -->` and `<!-- garnet:evidence:end -->`).
   It is a verbatim mirror of the Garnet Runtime Review comment: the
   kernel-recorded Execution Profile of what this PR's CI executed, every
   execution chain root-to-action and every outbound destination. Use it only
   when its `<!-- garnet:commit <sha> -->` equals the PR head.
2. Apply the fail-closed verdict table (`recorded` / `unchanged` / `changed` /
   `undeterminable`) and speak exactly one utterance, prefixed exactly
   `Runtime evidence (Garnet, head <sha7>): `. Cross-check the diff against
   the record: name any recorded destination or execution chain the diff does
   not explain, or state that recorded behaviour is explained by the change.
3. A missing, stale, or unparseable profile is `undeterminable`. Say "no
   runtime evidence"; that is never the same as a clean run. The evidence never
   approves or refuses anything; the judgment is yours.

## If you are WRITING a change

Each demo PR adds exactly one dependency to `npm-testbed/app/package.json`. CI
installs and first-imports it under the Garnet sensor (Jibril, eBPF), so the
Execution Profile carries the install's real process tree and egress. Keep changes
small and single-purpose so the runtime signal stays legible.

## Repository layout

| Path | What it is |
|------|-----------|
| `tools/pr-approval-agent/` | The vendored PostHog "stamphog" review engine (see `NOTICE.md`). |
| `tools/pr-approval-agent/garnet_runtime.py` | The Garnet consumer — the one integration point. |
| `tools/owners/` | The ownership resolver the engine consumes. |
| `.stamphog/` | The declarative gate policy (`policy.yml`, `review-guidance.md`). |
| `npm-testbed/` | The real minimal workload that each demo PR changes. |
| `.github/workflows/garnet-record.yml` | Records the install under the Garnet sensor; posts the Execution Profile. |
| `.github/workflows/stamphog-review.yml` | Runs the policy example against a PR (Garnet-grounded). |
| `.github/workflows/proof-check.yml` | Re-asserts the README's public proof loop and the policy example. |

## The one rule that matters

The gate hard-denies dependency/lockfile changes by default (they can pull in
third-party code). The Execution Profile is what the policy reads to clear a
*clean* dependency PR and to keep a *poisoned* one denied, with the offending
destination named. Same diff; the recorded execution is the only variable. The
policy decides what that recording means.
