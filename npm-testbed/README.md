# npm top-10 testbed

A realistic demonstration of Garnet's core value workflow: dependency changes
reviewed with **runtime evidence**, not just the diff.

## The loop

1. **Open a batch PR** — dispatch
   [`npm testbed — open batch PR`](../.github/workflows/npm-testbed-open-pr.yml).
   It picks the next package from [`top10.json`](top10.json) (or an explicit
   override) and opens one PR adding that single dependency to
   [`app/package.json`](app/package.json). One package per PR, in download-
   rank order.
2. **CI records the run** —
   [`npm testbed CI`](../.github/workflows/npm-testbed-ci.yml) starts the
   Garnet sensor (`garnet-org/action@v2`, Jibril eBPF), runs `npm install`
   and the [smoke test](app/smoke/run.mjs) (first import + one exercised
   export), and exports the execution record as an artifact. The installed
   Garnet integration posts the **Garnet Runtime Review** comment — the
   factual record of every recorded execution chain and outbound destination.
3. **The coverage gap is quantified** — the same CI renders
   [`scripts/coverage-gap.mjs`](scripts/coverage-gap.mjs): a sticky PR
   comment + Step Summary contrasting the reviewable diff (a few lines in
   one manifest) with the recorded execution surface (transitive packages
   installed, processes recorded, outbound domains contacted — and how many
   of those appear anywhere in the diff).
4. **AI reviewers are re-grounded** — after CI completes,
   [`npm testbed — AI reviewer grounding`](../.github/workflows/npm-testbed-reviewer-grounding.yml)
   re-triggers Devin Review (public v3 API) and requests a GitHub Copilot
   review, so reviews land AFTER the runtime evidence exists.
   [`REVIEW.md`](../REVIEW.md) tells reviewers exactly how to use it:
   cross-check the diff against recorded behavior and flag anything the diff
   does not explain.

## What this showcases

1. **The coverage gap** — lines reviewed in the diff vs the execution
   surface actually exercised: a 2-line `package.json` change routinely
   installs dozens of transitive packages, spawns many processes, and
   contacts several domains, none of which are visible in the diff.
2. **Grounded AI review** — reviewers citing the Garnet Runtime Review
   comment can factually verify (or flag) runtime behavior — install
   scripts, unexpected egress, unexpected execution chains — that no static
   diff review could see.

## Configuration

| Where | Name | Purpose |
| --- | --- | --- |
| secret | `GARNET_API_TOKEN` | starts/registers the Jibril sensor (already configured) |
| secret | `DEVIN_API_TOKEN` | optional — enables the Devin Review re-trigger |
| variable | `DEVIN_ORG_ID` | optional — Devin organization id for the re-trigger |

Copilot review requests use the built-in `GITHUB_TOKEN` and no-op with a
notice if Copilot code review is not enabled on the repository. Greptile is
re-triggered with an `@greptileai review` comment (posted once per PR head,
deduplicated by an HTML marker) and no-ops if Greptile is not active on the
PR; its grounding instructions come from `AGENTS.md` + `REVIEW.md`.
