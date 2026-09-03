// Asserts that the proof loop in README.md is still true, logged out.
//
// Checks, in order:
//   1. every URL the README names for the exhibit answers 200 without credentials
//      (the pull request, the Execution Profile page, the JSON endpoint, the run)
//   2. the JSON endpoint really returns JSON for the profile the README names
//   3. the head SHA in the README equals the exhibit pull request's current head
//   4. all four surfaces describe one execution: the workflow run's head_sha is
//      the README head SHA, its id is the run the JSON names, and the JSON's
//      commit_sha is either that head or the pull request's merge commit
//   5. the garnet:summary marker quoted in the README binds to the same head
//   6. the README stays inside the ratified vocabulary
//
// Read-only: no writes to the repository, no token required for the public
// checks. GITHUB_TOKEN, when present, is used only to raise the GitHub API rate
// limit for check 3.

import { readFile } from "node:fs/promises";

const README = new URL("../README.md", import.meta.url);
const REPO = "garnet-labs/garnet-runtime-review-reference";

const BANNED = [
  "process chain",
  "root-to-destination",
  "run profile",
  "runtime profile",
  "runtime record",
  "runtime records",
  "execution record",
  "field note",
  "runtime observation",
  "behavioral assertion",
  "behavioural assertion",
];

const failures = [];
const notes = [];

function check(ok, message) {
  if (ok) notes.push(`ok    ${message}`);
  else failures.push(`FAIL  ${message}`);
}

async function status(url) {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  return res;
}

const readme = await readFile(README, "utf8");

const prMatch = readme.match(
  new RegExp(`https://github\\.com/${REPO}/pull/(\\d+)`),
);
if (!prMatch) {
  console.error("FAIL  README names no exhibit pull request");
  process.exit(1);
}
const prNumber = prMatch[1];
const prUrl = `https://github.com/${REPO}/pull/${prNumber}`;

const profileUrl = readme.match(
  /https:\/\/app\.garnet\.ai\/public\/runs\/\d+\?profile=[0-9a-f-]+/,
)?.[0];
const jsonUrl = readme.match(
  /https:\/\/app\.garnet\.ai\/api\/public\/runs\/\d+\?profile=[0-9a-f-]+/,
)?.[0];
const runUrl = readme.match(
  new RegExp(`https://github\\.com/${REPO}/actions/runs/\\d+`),
)?.[0];
const headSha = readme.match(/Head SHA:\*\*\s*`([0-9a-f]{40})`/)?.[1];
const runId = runUrl?.match(/runs\/(\d+)/)?.[1];

const headers = { accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) {
  headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function api(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

check(Boolean(profileUrl), "README names an Execution Profile permalink");
check(Boolean(jsonUrl), "README names a public JSON endpoint");
check(Boolean(runUrl), "README names the CI run");
check(Boolean(headSha), "README names a full head SHA");

for (const url of [prUrl, profileUrl, jsonUrl, runUrl].filter(Boolean)) {
  const res = await status(url);
  check(res.status === 200, `200 logged out: ${url} (got ${res.status})`);
}

let jsonProfile;
if (jsonUrl) {
  const res = await status(jsonUrl);
  const body = await res.json().catch(() => null);
  const profileId = new URL(jsonUrl).searchParams.get("profile");
  const jsonRunId = jsonUrl.match(/runs\/(\d+)/)[1];
  jsonProfile = body?.profiles?.[0]?.run;
  check(
    jsonProfile?.profile_id === profileId && jsonProfile?.run_id === jsonRunId,
    `JSON endpoint returns profile ${profileId} of run ${jsonRunId}`,
  );
  check(
    jsonProfile?.repository === REPO,
    `JSON endpoint profile belongs to ${REPO}`,
  );
  check(
    jsonRunId === runId,
    `JSON endpoint and README name the same run (${jsonRunId} vs ${runId})`,
  );
}

let mergeCommitSha;
if (headSha) {
  const { status: prStatus, body: pr } = await api(`pulls/${prNumber}`);
  check(
    prStatus === 200,
    `GitHub API answered 200 for PR #${prNumber} (got ${prStatus}: ${pr.message ?? ""})`,
  );
  mergeCommitSha = pr.merge_commit_sha;
  check(
    pr.head?.sha === headSha,
    `README head SHA equals PR #${prNumber} head (README ${headSha}, PR ${pr.head?.sha})`,
  );
  check(pr.state === "open", `PR #${prNumber} is open (state ${pr.state})`);
}

// The four surfaces have to describe one execution, not four plausible ones.
if (runId && headSha) {
  const { status: runStatus, body: run } = await api(`actions/runs/${runId}`);
  check(
    runStatus === 200,
    `GitHub API answered 200 for run ${runId} (got ${runStatus}: ${run.message ?? ""})`,
  );
  check(
    run.head_sha === headSha,
    `Run ${runId} ran on the README head SHA (run ${run.head_sha}, README ${headSha})`,
  );
  check(
    String(run.id) === runId,
    `Run ${runId} is the run the JSON endpoint names`,
  );

  const commitSha = jsonProfile?.commit_sha;
  if (commitSha === headSha) {
    check(true, `JSON commit_sha is the head SHA (${commitSha})`);
  } else if (commitSha && commitSha === mergeCommitSha) {
    check(
      true,
      `JSON commit_sha is PR #${prNumber}'s merge commit, the ref the runner checked out (${commitSha})`,
    );
  } else {
    check(
      false,
      `JSON commit_sha ${commitSha} is neither the head SHA ${headSha} nor the merge commit ${mergeCommitSha}`,
    );
  }
}

// The comment excerpt quoted in the README has to bind to the same head.
const marker = readme.match(/<!--\s*garnet:summary\s*(\{.*?\})\s*-->/s)?.[1];
if (marker) {
  const summary = JSON.parse(marker);
  check(
    summary.commit === headSha,
    `Quoted garnet:summary marker binds to the head SHA (marker ${summary.commit}, README ${headSha})`,
  );
}
const commitMarker = readme.match(
  /<!--\s*garnet:commit\s+([0-9a-f]{40})\s*-->/,
)?.[1];
if (commitMarker) {
  check(
    commitMarker === headSha,
    `Quoted garnet:commit marker binds to the head SHA (marker ${commitMarker}, README ${headSha})`,
  );
}

const lower = readme.toLowerCase();
for (const term of BANNED) {
  check(!lower.includes(term), `README does not use "${term}"`);
}

for (const line of notes) console.log(line);
for (const line of failures) console.error(line);
console.log(
  `\n${notes.length} passed, ${failures.length} failed — exhibit PR #${prNumber}`,
);
process.exit(failures.length === 0 ? 0 : 1);
