# Wiring your own review harness to Garnet

This demo integrates Garnet with PostHog's stamphog gate, but the pattern is
general. Modern AI review harnesses share the same three integration surfaces;
Garnet plugs into any of them. Use this as a checklist for your own gate.

## The three lanes

Most harnesses expose one or more of these. Garnet can feed all three; pick the
lane(s) your gate already has.

### Lane A — Constitution (prose the reviewing LLM reads)
A repo file that your reviewer treats as trusted instructions (`AGENTS.md`,
`CLAUDE.md`, `.cursorrules`, a review-guidance prompt). Add a clause telling the
reviewer to locate the Garnet Runtime Review comment, cross-check the diff
against the recorded process tree and egress, and cite it. See
[`REVIEW.md`](../REVIEW.md) and [`AGENTS.md`](../AGENTS.md) here.

**Best for:** LLM-first reviewers with no deterministic gate. Lowest lift.

### Lane B — Signals (machine-readable state on the PR)
Garnet posts a public PR comment with stable markers:
`<!-- garnet-runtime-review -->` (the record) and `<!-- garnet:commit <sha> -->`
(the head pin). Any tool that reads issue comments can consume it as structured
state. This demo parses it in
[`garnet_runtime.py`](../tools/pr-approval-agent/garnet_runtime.py).

**Best for:** harnesses that already read PR check-runs / labels / comments as
state. Deterministic and testable.

### Lane C — Deterministic policy/gates (config that names trusted inputs)
If your gate has a rules layer (deny-lists, tiers, allow-lists), add Garnet as a
**scoped bypass input**, exactly like a migration-risk or SAST check: a clean,
head-pinned runtime record lifts a specific deny; off-baseline egress keeps it.
This is the strongest integration because it is auditable and can't be
prompt-injected.

**Best for:** gates that already hard-deny a risky file class (deps, migrations,
infra) and want to safely auto-clear the provably-clean subset.

### Lane D — Delivery and timing (what the reviewer actually sees, and when)
Lanes A–C assume the reviewer can see the record. In practice most hosted
review tools read the diff and the pull request description, not issue
comments, and they review as soon as the pull request opens — before the
recording job has finished. Both defects show up as "no runtime evidence" first
passes even when the record posts a few minutes later. Fix both on the repo
side:

1. **Mirror** the head-bound record into a stable block in the pull request
   description (`<!-- garnet:evidence:begin -->` … `<!-- garnet:evidence:end -->`),
   from a privileged `workflow_run` workflow that trusts only the Garnet App
   logins (`garnet-runtime-review[bot]`, `garnet-runtime-review-dev[bot]`,
   `garnet-ai[bot]`), never `github-actions[bot]`, and never a pending
   placeholder.
2. **Re-request** the configured review tools once per head, only after the
   record is finalized for the exact head and `garnet/evidence` has succeeded
   for it. Reviewer output stays telemetry; `garnet/evidence` and branch
   protection remain the only enforcement path.
3. Keep **one canonical `REVIEW.md`** and thin per-tool adapters
   (`.coderabbit.yaml`, `.greptile/`, `.cursor/BUGBOT.md`,
   `.github/copilot-instructions.md`, `.pr_agent.toml`, agent skills) that
   point at it, rather than a different contract per tool.

The reference implementation of this lane is `replay stage2` in
<https://github.com/garnet-labs/garnet-replay> (`docs/stage2.md`,
`docs/consumption-roadmap.md`); it also records the consumption funnel per
pull request (delivered → visible → grounded → observation → decision impact).
A grounding line or a copied head SHA is not proof the reviewer read the
record; only an evidence-specific detail repeated from the record is.

## The contract, distilled

Whatever lane you use, the consumption rule is the same and deliberately
conservative:

```
runtime-assured  ⇔  a Garnet comment exists
                 ∧  it is pinned to the PR head SHA
                 ∧  it is final (not the in-flight "pending" variant)
                 ∧  every WORKLOAD egress ∈ the ecosystem baseline
                    (registry + local resolver; runner infra excluded)

anything else    ⇒  deny applies normally  (safe default)
off-baseline     ⇒  deny applies normally + name the destinations as evidence
```

Baseline egress per ecosystem (extend as needed):

| Ecosystem | Workload baseline |
|---|---|
| npm | `registry.npmjs.org`, `localhost` |
| PyPI | `pypi.org`, `files.pythonhosted.org`, `localhost` |
| Cargo | `static.crates.io`, `index.crates.io`, `localhost` |

Runner scaffolding egress (`github.com`, `api.github.com`, `*.githubusercontent.com`)
is reported but never counted against the workload — it is the runner's own
control plane, not the change's behaviour.

## Recording side (one Action step)

Add the Garnet Action to the job that installs/builds the change, before the
heavy work, so the install runs under the sensor:

```yaml
- name: Garnet Runtime Visibility
  uses: garnet-org/action@v2
  with:
    api_token: ${{ secrets.GARNET_API_TOKEN }}
```

See [`.github/workflows/garnet-record.yml`](../.github/workflows/garnet-record.yml)
for the full recording job (install → smoke → export → post the record).

## Failure modes to design for

- **No record** (fork PR without secrets, sensor unavailable): treat as *no
  evidence*, not a clean run — WAIT or route to a human.
- **Stale record** (head moved): ignore it; WAIT for the new head's record.
- **Pending record** (recording still running): WAIT, don't race it.
- **First pass before the record** (reviewer ran when the pull request
  opened): the honest first-pass line is "no runtime evidence for this head";
  re-request the review after `garnet/evidence` succeeds instead of prompting
  the tool to speculate (Lane D).
- **Record in the wrong channel** (tool does not read issue comments): mirror
  the record into the pull request description; do not rely on the comment
  alone for LLM reviewers (Lane D).
- **Legend / illustrative content**: consume the *structured* record, and keep
  raw comment prose out of untrusted LLM context so example values aren't read as
  data. (We hit this; the proof suite now guards it.)
