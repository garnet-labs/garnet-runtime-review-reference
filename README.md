# Garnet Runtime Review — the public proof loop

[![Proof check](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/workflows/proof-check.yml/badge.svg)](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/workflows/proof-check.yml)

Garnet is the execution-evidence layer for code review. It records what an exact
CI execution did, binds that evidence to the head SHA, and gives humans and
review agents an Execution Profile they can use to make a better merge decision.
Garnet records; the reviewer and repository policy decide.

This repository is where you can read that artifact in the open, on a live pull
request, without an account.

---

## The live proof

**Exhibit pull request:**
[#29 — `deps(testbed): add chart-helpers@1.0.0`](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/29)

**Head SHA:** `23bbd8859904af464185d0bb4d1f93ff75ef8864`

**Execution Profile**, public, no login:
[app.garnet.ai/public/runs/32909555254](https://app.garnet.ai/public/runs/32909555254?profile=01a03b31-6120-7364-bbc0-f263e7f55ce0)

**The same profile as JSON**, public, no login:
[app.garnet.ai/api/public/runs/32909555254](https://app.garnet.ai/api/public/runs/32909555254?profile=01a03b31-6120-7364-bbc0-f263e7f55ce0)

**CI run that produced it:**
[run 32909555254](https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/32909555254), job `record`

The pull request carries a Runtime Review comment written by the Garnet GitHub
App. The comment is bound to head `23bbd88` and compares it with the previously
recorded commit `5a6561f` — that is the comparison pair, previous recorded
commit to head, not pull-request base to head.

The JSON endpoint returns the same profile the page renders:

```console
$ curl -s "https://app.garnet.ai/api/public/runs/32909555254?profile=01a03b31-6120-7364-bbc0-f263e7f55ce0" | head -c 320
{"profiles":[{"schema_version":"runtime-review-public/v3","timestamp":"2026-08-25T23:11:26.335552549Z","run":{"profile_id":"01a03b31-6120-7364-bbc0-f263e7f55ce0","run_id":"32909555254","repository":"garnet-labs/garnet-runtime-review-reference","workflow":"Garnet Record (install under sensor)","job":"record","commit_sha":"303616fa
```

The `commit_sha` in the JSON is `303616fa63129940ee79276fff5c355ad263714e`, the
`refs/pull/29/merge` commit the runner checked out. The head SHA the comment
binds to is `23bbd88`. Both are true; they are different commits and the profile
names each one.

## What this evidence shows, and what it does not decide

An Execution Profile records:

- every process that ran in the job, as a path from the runner's root process to
  an action — one such path is an execution chain;
- the actions those processes took, today outbound connections, and the
  destination each connection went to;
- which job, workflow and run produced the recording, and which commit it is
  bound to.

It does not judge, block, or approve anything. It carries no score and no
verdict. The reviewer reads it, or repository policy consumes it, and the
decision stays there.

## Read the comment

Real bytes from the Runtime Review comment on the exhibit pull request
([comment 5416650121](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/29#issuecomment-5416650121)),
copied without edits, from the first marker through the end of the recorded
tree:

````text
<!-- garnet:commit 23bbd8859904af464185d0bb4d1f93ff75ef8864 -->
<!-- garnet:summary {"contract":"6.10.0","githubMeta":"2026-08-08","commit":"23bbd8859904af464185d0bb4d1f93ff75ef8864","previous":"5a6561f0912030d9f938027a521241d6a300d599","jobs":1,"changed":0,"unchanged":1,"noOutbound":0,"vanished":0,"added":0,"removed":0,"backgroundAdded":4,"backgroundRemoved":0,"vanishedDestinations":0,"chains":17,"destinations":12,"recorded":"2026-08-25 23:11:26 UTC","kinds":["network"]} -->
**Execution Profiles recorded for 1 job, triggered by [`23bbd88`](https://github.com/garnet-labs/garnet-runtime-review-reference/commit/23bbd8859904af464185d0bb4d1f93ff75ef8864)**

> *1&nbsp;job unchanged · compared with [`5a6561f`](https://github.com/garnet-labs/garnet-runtime-review-reference/commit/5a6561f0912030d9f938027a521241d6a300d599)*
> <sub>recorded at the kernel by Garnet · 2026-08-25 23:11 UTC</sub>

<details><summary><code>Garnet Record (install under sensor)</code> / <a href="https://github.com/garnet-labs/garnet-runtime-review-reference/actions/runs/32909555254"><code>record</code>&nbsp;↗</a> · 12&nbsp;destinations</summary>

```diff
@@ 5a6561f (previous) vs 23bbd88 (current) @@
  Runner.Worker
  ├─ node
  │  ├─ ○ api.github[.]com
  │  ├─ ○ github[.]com
  │  └─ ○ release-assets.githubusercontent[.]com
  ├─ bash
  │  └─ node (step: "Install dependencies (the workload)")
  │     ├─ dash
  │     │  └─ node
  │     │     ├─ ○ api.ipify[.]org
  │     │     ├─ ○ httpbin[.]org
  │     │     └─ ○ ip-api[.]com
  │     └─ ○ registry.npmjs[.]org
  └─ ○ localhost (dns resolver)
 
+ systemd (runner background · +4)
+ ├─ python3.12
+ │  └─ python3.12
+ │     ├─ ○ 168.63.129.16
+ │     └─ ○ 169.254.169.254 (cloud metadata)
+ ├─ hosted-compute-agent
+ │  └─ sudo
+ │     └─ provjobd (ran from /tmp/…)
+ │        └─ ○ hosted-compute-watchdog-prod-iad-01[.]githubapp (github infra)
+ └─ systemd-networkd
+    └─ ○ ip6-allrouters
```
````

Five things to read in it:

1. `<!-- garnet:commit 23bbd88... -->`. The comment is bound to one head SHA. A
   profile recorded on another commit is a different profile.
2. `<!-- garnet:summary ... -->`. The machine-readable line: contract `6.10.0`,
   `chains: 17`, `destinations: 12`, `recorded: 2026-08-25 23:11:26 UTC`.
3. `@@ 5a6561f (previous) vs 23bbd88 (current) @@`. The comparison pair is
   stated in the comment itself: head against the previously recorded commit,
   not pull-request base against head.
4. `Runner.Worker -> bash -> node (step: "Install dependencies (the workload)")
   -> dash -> node -> api.ipify[.]org`. Read downward, that is one execution
   chain. `○` marks the action at the end of it, here an outbound connection.
   The step name says which workflow step ran the process.
5. `+ systemd (runner background · +4)`. The runner's own infrastructure,
   recorded and kept separate from the workflow's processes.

The comment closes with a legend that explains these symbols. That legend is
part of the comment, not recorded data.

## Try this in your repository

1. Install the Garnet GitHub App: <https://github.com/apps/garnet-runtime-review>.
   The App owns the Runtime Review comment on your pull requests.
2. Add the sensor step to the job you want recorded, as the first step — every
   step after it is recorded. Stable release:

   ```yaml
   - uses: garnet-org/action@3d47f4a9004f7356c980a0e8d420ef5984750e3c # v2.2.0
     with:
       api_token: ${{ secrets.GARNET_API_TOKEN }}
   ```

   Release candidate, if you want the newer sensor pin (`v2.3.0` is not tagged
   yet; `v2.3.0-rc.1` is a prerelease and `v2.17.0-rc.9` is a Jibril prerelease):

   ```yaml
   - uses: garnet-org/action@c747ff1f597c84579e10173301a31c30bb815181 # v2.3.0-rc.1
     with:
       api_token: ${{ secrets.GARNET_API_TOKEN }}
       jibril_version: "v2.17.0-rc.9"
   ```

3. Open a pull request. When the job finishes, the App posts the Runtime Review
   comment with the public Execution Profile link, bound to that head SHA.

Quickstart and reference: <https://docs.garnet.ai/quickstart>. Action source and
inputs: <https://github.com/garnet-org/action>.

## Repository policy example (optional)

Garnet produces the Execution Profile. Deciding what to do with it is repository
policy. This repository also keeps an older experiment, from July 2026, that
shows one way to consume a profile: a vendored copy of PostHog's open-source
"stamphog" merge gate reads the public Runtime Review comment and lets a clean
dependency install lift its own `deps_toolchain` deny, while off-baseline egress
keeps the deny and names the destination.

That experiment consumes evidence; it does not produce it, and its behaviour is
this repository's policy, not Garnet's.

- Demonstration pull requests, all from 2026-07-27 to 2026-07-28, recorded by an
  earlier renderer contract:
  [#1](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/1),
  [#2](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/2),
  [#3](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/3),
  [#6](https://github.com/garnet-labs/garnet-runtime-review-reference/pull/6).
- Write-up: [`PROOF.md`](PROOF.md). Integration point:
  [`tools/pr-approval-agent/garnet_runtime.py`](tools/pr-approval-agent/garnet_runtime.py).
  Attribution: [`NOTICE.md`](NOTICE.md).
- Reviewer-grounding contract for the AI reviewers this repository runs:
  [`REVIEW.md`](REVIEW.md), with the shared delivery contract in
  [`docs/SPINE.md`](docs/SPINE.md).

## Versions used by the exhibit run

- **Action ref in the workflow:** `garnet-org/action@v2`
  (probe: `git show 23bbd88:.github/workflows/garnet-record.yml`)
- **What `v2` resolves to today:** `3d47f4a9004f7356c980a0e8d420ef5984750e3c`,
  the same commit as tag `v2.2.0`
  (probe: `git ls-remote --tags https://github.com/garnet-org/action`)
- **Jibril version:** `v2.16.0`
  (probe: the job log of run 32909555254, line `Jibril Version: v2.16.0`)
- **Runtime Review contract:** `6.10.0`
  (probe: the `garnet:summary` marker in the App comment)
- **Recorded:** 2026-08-25 23:11 UTC
  (probe: the `garnet:summary` marker)

`v2` is a floating major tag and can move. Pin to a tag SHA, as the blocks above
do, if you want a fixed ref.

The [proof check](.github/workflows/proof-check.yml) workflow re-runs
[`scripts/check-proof.mjs`](scripts/check-proof.mjs) on every push to `main` and
weekly. It asserts, logged out, that the exhibit pull request, the Execution
Profile page and the JSON endpoint all answer 200, that the head SHA in this
README is the pull request's current head, and that this file stays inside the
vocabulary. It only reads.
