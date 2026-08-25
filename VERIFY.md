# Verify it yourself

Nothing here is staged. Every claim in the [README](README.md) is a live PR and a
live CI run in this repo, and the decision logic is re-asserted continuously by
the [Living Proof](.github/workflows/proof-check.yml) workflow. Three ways to
convince yourself, from fastest to most thorough.

## 1. Read the live PRs (30 seconds, no setup)

Open the two demo PRs linked in the README. On each you will see:

- the **Garnet Runtime Review** comment — the kernel-recorded process tree and
  egress for that PR's install (marker `<!-- garnet-runtime-review -->`, pinned to
  the head SHA via `<!-- garnet:commit <sha> -->`);
- the **stamphog verdict** comment — the gate's decision and reasoning.

Same diff shape on both PRs; opposite verdict. That is the whole demo.

## 2. Run the decision logic locally (1 minute, no keys)

The gate's runtime-assurance rule is pure and unit-tested. You can prove the A/B
without any network or API key:

```bash
git clone https://github.com/garnet-labs/garnet-runtime-review-reference
cd garnet-runtime-review-demo
PYTHONPATH=tools/pr-approval-agent:tools/owners \
  python -m pytest tools/pr-approval-agent/test_garnet_runtime_proof.py -v
```

You should see the five claims pass: clean record lifts the deny, off-baseline
egress keeps it and names the destination, stale/pending/missing records WAIT,
the legend is never parsed as egress, and the bypass is scoped to dependency
files only. This is exactly what the Living Proof workflow runs on a schedule.

## 3. Run the real gate against a PR (5 minutes, deterministic mode)

The full engine runs the same deterministic gate the CI uses. From a clone with
[`uv`](https://docs.astral.sh/uv/) installed and `GH_TOKEN` in your environment:

```bash
git fetch origin "pull/<PR_NUMBER>/head"
PYTHONPATH=tools/owners uv run tools/pr-approval-agent/review_pr.py <PR_NUMBER> \
  --repo garnet-labs/garnet-runtime-review-reference \
  --dry-run
```

`--dry-run` runs the gates + the Garnet consumer (no LLM key needed) and prints
the verdict. Run it against the clean PR and the poisoned PR and watch the
`deps_toolchain` deny lift for one and stand — citing `httpbin.org` — for the
other. Drop `--dry-run` and set `ANTHROPIC_API_KEY` to also get the full
LLM verdict prose.

## Independent verification

Before publishing, the A/B was reproduced by an **independent agent** working
from a clean clone with no shared state, following a fixed brief. It confirmed:
the clean-vs-poisoned verdict flip reproduces from genuine stock-vs-integrated
engine builds; the bypass is correctly scoped (no auth/billing/migration bypass);
head-SHA staleness triggers WAIT; and `PYTHONPATH` is the one non-obvious setup
requirement. Two issues it flagged — an LLM misreading the comment's legend, and
a CI permissions crash — were fixed and are now covered by the proof suite and
the workflow permissions. One acknowledged limitation remains: GitHub-API-shaped
egress (`api.github.com`) rides the trusted runner-infra baseline and is deferred
to the reviewer layer.
