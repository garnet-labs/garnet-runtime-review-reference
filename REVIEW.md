# Reviewer grounding: Garnet Runtime Review

This file is an adapter of the repository's consumption contract,
[`docs/SPINE.md`](docs/SPINE.md) — **Record → Mirror → Verdict → Utterance**.
It applies to every reviewer of pull requests in this repository (Copilot code
review, CodeRabbit, Greptile, Qodo, Claude, Devin, Cursor, humans), especially
the **npm testbed** PRs (`deps(testbed): add <pkg> …`, head branches
`npm-testbed/dep-*`), each of which adds a single dependency to
`npm-testbed/app/package.json` and installs it in CI under the Garnet sensor.

The PR description contains a `Runtime evidence (Garnet)` section between
`<!-- garnet:evidence:begin -->` and `<!-- garnet:evidence:end -->`. When it
contains a head-bound record, the section is a verbatim mirror of the trusted
Garnet Runtime Review comment. Treat that record as ground truth of what the
recorded run observed, then cross-check it against what the diff implies.

## Grounding rules

1. Read the `<!-- garnet:commit <sha> -->` marker. Use the mirrored record only
   when that SHA equals the PR head. A different SHA, a missing section, or a
   pending section is **no runtime evidence, not a clean run** — the verdict is
   `undeterminable` (see the fail-closed table in `docs/SPINE.md`).
2. Use the `<!-- garnet:summary {...} -->` marker as the machine register. It
   is contract-versioned and keeps chain counts that do not render on the
   human surface. On snapshot comments, `previous` is `null`; branch on that
   field instead of treating the job partition as a comparison.
3. An execution chain is one root-to-action path. Today's action class is an
   outbound connection. A destination is the leaf of an outbound action and
   never the definition of a chain. Do not use "process chain" or "process
   lineage".
4. The headline is `Execution Profiles recorded for <N> job(s)`. Never claim
   true k-of-n coverage. Runtime Review records observed execution; it does not
   establish that a fixed fraction of jobs ran.
5. In a comparison, `+` is new in the current record and `−` is only in the
   previous record. Cross-check those observations against the diff — on a
   one-line dependency bump, expect registry traffic (`registry.npmjs.org`
   and friends) and flag any recorded destination or execution chain the
   dependency change does not explain: install-script activity, unexpected
   hosts, unexpected interpreters. Do not treat a missing record as absence
   of behavior.
6. Never repeat verdicts, scores, severities, baseline classifications, or
   safety judgments from Garnet. Derive review judgment from the diff.
7. Speak the utterance for your verdict — exactly one of the four shapes in
   `docs/SPINE.md`, prefixed exactly with
   `Runtime evidence (Garnet, head <sha7>): `. On `recorded` and `unchanged`,
   one line and no further runtime commentary. On `changed`, quote the delta
   one-liners verbatim, link the Execution Profile, and ask whether the delta
   is expected given the diff.

The mirror is delivery, not a summary. Do not paraphrase or dilute the
verbatim evidence region. The Garnet evidence is runtime-only: code quality,
style, logic correctness, and test coverage remain fully your job.

## Public machine surface

The logged-out machine surface also exists today:
`https://app.garnet.ai/api/public/runs/<run_id>?profile=<profile_id>` returns
`200 application/json` with `schema_version: runtime-review-public/v3`. The
HTML permalink does not content-negotiate (`Accept: application/json` still
returns HTML), and a `.json` suffix returns 404. Use the marker and linked
profile deliberately; do not invent an API URL when the comment does not
provide one.
