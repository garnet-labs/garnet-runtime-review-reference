// Asserts that the proof loop in README.md is still true, logged out.
//
// Checks, in order:
//   1. every URL the README names for the exhibit answers 200 without credentials
//      (the pull request, the Execution Profile page, the JSON endpoint, the run)
//   2. the JSON endpoint really returns JSON for the profile the README names
//   3. the head SHA in the README equals the exhibit pull request's current head
//   4. the README stays inside the ratified vocabulary
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
const headSha = readme.match(/\|\s*Head SHA\s*\|\s*`([0-9a-f]{40})`/)?.[1];

check(Boolean(profileUrl), "README names an Execution Profile permalink");
check(Boolean(jsonUrl), "README names a public JSON endpoint");
check(Boolean(runUrl), "README names the CI run");
check(Boolean(headSha), "README names a full head SHA");

for (const url of [prUrl, profileUrl, jsonUrl, runUrl].filter(Boolean)) {
  const res = await status(url);
  check(res.status === 200, `200 logged out: ${url} (got ${res.status})`);
}

if (jsonUrl) {
  const res = await status(jsonUrl);
  const body = await res.json().catch(() => null);
  const profileId = new URL(jsonUrl).searchParams.get("profile");
  const runId = jsonUrl.match(/runs\/(\d+)/)[1];
  const profile = body?.profiles?.[0]?.run;
  check(
    profile?.profile_id === profileId && profile?.run_id === runId,
    `JSON endpoint returns profile ${profileId} of run ${runId}`,
  );
  check(
    profile?.repository === REPO,
    `JSON endpoint profile belongs to ${REPO}`,
  );
}

if (headSha) {
  const api = `https://api.github.com/repos/${REPO}/pulls/${prNumber}`;
  const headers = { accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(api, { headers });
  const pr = await res.json();
  check(res.status === 200, `GitHub API answered 200 for PR #${prNumber} (got ${res.status}: ${pr.message ?? ""})`);
  check(
    pr.head?.sha === headSha,
    `README head SHA equals PR #${prNumber} head (README ${headSha}, PR ${pr.head?.sha})`,
  );
  check(pr.state === "open", `PR #${prNumber} is open (state ${pr.state})`);
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
