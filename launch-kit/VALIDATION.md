# Co-founder & Beta Validation Reference

Use a public GitHub repository with a Linux x86_64 pull request job. Budget 15 minutes of hands-on time; GitHub Actions queue and run time are separate. Record the PR URL, current head SHA, and comment link with each result.

## 1. Zero-signup onboarding · 7 minutes

Start with your own repository where the jobs you want to record do not already use Garnet. If you use a copy of the [sample](sample/README.md), remove the Garnet step and the job's `permissions` block from `.github/workflows/ci.yml` before starting. Keep checkout and the rest of the workflow.

Install the [Garnet GitHub App](https://github.com/apps/garnet-runtime-review) on the repository. No Garnet account or API token is needed on the public-repository GitHub OIDC path.

Paste one line into your coding agent, or apply the [setup snippet](snippets/setup.yml) by hand:

> In our existing pull request workflows, add `garnet-org/action@24833a47c19aad605bb10bcd9b8cad8f318ca187` (v2.6.0) right after `actions/checkout` in each eligible Linux x86_64 job; ensure at least `contents: read` and `id-token: write` without reducing existing grants, use `job_index` for matrix legs, and add no secrets.

Push and open a PR. **Pass:** The workflow records the intended jobs without adding a recording-only workflow. After CI, `garnet-runtime-review[bot]` posts a finalized Runtime Review comment whose `garnet:commit` and summary commit match the PR head, with declared capture and a **Full record in Garnet** link for each recorded job.

## 2. Author pre-merge self-fix · 4 minutes

Give the agent the [author instructions](snippets/AGENTS.md) or run the before-ready skill. Ask it to check the current-head comment once and compare an observed workload action with the diff. For the sample, change the example destination as described in the walkthrough. If an observed connection was unintended, fix it, push, and check the new head after CI.

**Pass:** The agent cites the current head and explains the observed action and the execution chain behind it. It never reuses evidence from the previous head. Missing, pending, stale, or partial evidence is reported as unknown without polling.

## 3. AI reviewer consumption · 4 minutes

Give a reviewer the [reviewer instructions](snippets/REVIEW.md) and the PR URL. Ask it to cite the App comment, describe one observed workload action, and state the comparison scope and capture limits. If it uses the MCP for job detail, it must match the exact linked profile ID and verify that profile's head SHA.

**Pass:** The review names only what the current-head record shows, separates workload from runner traffic, and does not treat evidence as approval. A missing or unusable record is unknown, not a clean run.

## Current limits and client checks

- Recording requires Linux x86_64 GitHub Actions runners. Native App Checks are off in production; use the Runtime Review comment.
- The workflow patcher at [app.garnet.ai/onboarding](https://app.garnet.ai/onboarding) awaits the `garnet-ui` production promotion from `dev` to `main`. Use the manual snippet in the meantime.
- **Claude Code 2.1.332:** Loaded the [kit plugin](plugins/README.md) with `--plugin-dir` and Vercel AI Gateway. All three skills were listed and the bundled Garnet MCP connected. The install skill's local dry run checked idempotency only: it found the existing step and OIDC grants and made no changes. It did not test the Journey 1 prompt on an uninstrumented workflow.
- **Cursor:** Checked the plugin manifest, bundled MCP configuration, and three `SKILL.md` files against Cursor's documented layout. No live invocation was run; the CLI was not available and no Cursor login or API key was provisioned.
