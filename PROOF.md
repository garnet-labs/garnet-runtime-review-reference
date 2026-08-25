# Proof ledger

Every row links to a live pull request and/or CI run in this repository. Nothing
is staged or hand-edited after the fact.

## The A/B (same diff, opposite verdict)

| # | Demo PR | Runtime reality (Garnet) | Verdict without Garnet | Verdict with Garnet | Evidence |
|---|---|---|---|---|---|
| 1 | Clean — [#1](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/1) | `registry.npmjs.org` only | DENY (deps_toolchain, T2-never) | **APPROVE** | [verdict run](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/30376231711) |
| 2 | Poisoned — [#2](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/2) | postinstall → `curl httpbin.org` | DENY (blind to why) | **REFUSE**, cites `httpbin.org` | [verdict run](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/30376233945) |
| 3 | Scoped — [#3](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/3) | clean dep install + an `auth` file | DENY (deps + auth) | **still blocked** — deps deny lifted, `auth` deny stands | [verdict run](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/30376236749) |
| 6 | Transitive — [#6](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/6) | 2-deep transitive postinstall → `api.ipify.org`, `ip-api.com`, `httpbin.org` (**not in diff**) | DENY (and a diff-only reviewer sees nothing to flag) | **WITHHELD** — deny stands, all 3 transitive hosts named | [verdict run](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/30376239347) · [record run](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/30305397518) |

## What each run demonstrates

- **Clean → APPROVE.** The `deps_toolchain` deny is lifted only because the
  head-pinned Garnet record shows registry-only egress. Remove Garnet and the
  identical PR is denied.
- **Poisoned → REFUSE.** Same one-line dependency shape, but the record shows an
  undisclosed `postinstall` reaching `httpbin.org`. The deny stands and the
  verdict names the destination.
- **Scoped → still blocked.** A change touching a non-dependency file does not
  ride the bypass, proving Garnet can't be used to wave through auth/billing/
  migration edits. The verdict's grounding line shows the deps deny lifted while
  the `auth` deny remains.
- **Transitive → WITHHELD.** The most realistic case: the PR diff adds only a
  top-level `chart-helpers` dependency (a clean-looking 45-line manifest +
  lockfile). The egress lives two levels down (`chart-helpers → date-fmt →
  metrics-beacon`) in a bundled `postinstall` that never appears in the diff, so
  a diff-only or static reviewer passes it. Garnet records the install regardless
  and the gate withholds the bypass, naming all three transitive destinations as
  the evidence — head-pinned to the PR commit.

## How the runtime signal enters the decision

The Garnet record is not a bolted-on footer — it flows through stamphog's own
primitives:

1. **Deny-list gate.** A clean head-pinned record lets the dependency files
   bypass the `deps_toolchain` deny (the same mechanism as the migration-risk
   bypass). Off-baseline egress withholds that bypass, and the gate line names
   the cause inline: `deny-list: matches: deps_toolchain [Garnet: off-baseline
   egress → …]`.
2. **Gates context line.** A `runtime (Garnet):` line prints in the Gates block
   alongside `ownership:`, stating head-pin, egress classification, and whether
   the bypass was applied or withheld — one line, same shape as every other
   signal.
3. **LLM reviewer.** The same classification is handed to the reviewer,
   which cites the recorded hosts in its prose verdict (e.g. "per kernel-recorded
   runtime evidence") and in the posted review's gate-mechanics table.

Both lanes consume the identical runtime signal. The deterministic gates are
fully reproducible by anyone; the LLM lane is active on this repo
(`ANTHROPIC_API_KEY` is set) and, on every demo PR, its natural-language verdict
agrees with the gates and names the same evidence.

## The recording side

Each demo PR's install ran under the Garnet sensor via
[`garnet-record.yml`](.github/workflows/garnet-record.yml). The resulting Garnet
Runtime Review comment (head-pinned) is visible directly on each PR.

## Living proof

The [`proof-check.yml`](.github/workflows/proof-check.yml) workflow re-asserts
the full decision rule (clean lifts / off-baseline stands + names / stale +
pending + missing WAIT / legend never parsed / bypass scoped / transitive multi-
host caught + all named / grounding text says WITHHELD vs APPLIED) on every push
and weekly — 10 tests. A green [Living Proof badge](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/workflows/proof-check.yml)
means the A/B still holds on current code.

## The integration point

[`garnet_runtime.py`](tools/pr-approval-agent/garnet_runtime.py) — ~230 lines,
the dependency-territory analogue of PostHog's `migration_risk.py`. It reads only
the public Garnet PR comment. That single module is the entire delta between "the
gate denies every dep PR" and the A/B above.
