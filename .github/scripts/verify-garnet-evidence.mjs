import { pathToFileURL } from "node:url";

/**
 * Verifies the Garnet Runtime Review bytes mirrored into a PR description.
 *
 * Contract: trusted-author comment bytes must match verbatim, with exact
 * head binding via garnet:commit, line-anchored delimiters, and pointer
 * fallback at the GitHub body cap; pointers and delimiter collisions are
 * not successful byte matches.
 * Required environment: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA.
 * Optional environment: GITHUB_API_URL.
 */
const BEGIN = "<!-- garnet:evidence:begin -->"
const END = "<!-- garnet:evidence:end -->"
const BEGIN_LINE_RE = /^<!-- garnet:evidence:begin -->[ \t]*\r?$/m
const END_LINE_RE = /^<!-- garnet:evidence:end -->[ \t]*\r?$/m
const COMMIT_RE = /<!--\s*garnet:commit\s+([0-9a-f]{40})\s*-->/
const TRUSTED_AUTHORS = new Set([
  "github-actions[bot]",
  "garnet-runtime-review[bot]",
  "garnet-runtime-review-dev[bot]",
])
const GARNET_OWNED_MARKER_RE =
  /<!--\s*garnet-(?:control-plane|action)(?:-pending)?-pr-comment:v1(?::[a-z0-9.-]+)?\s*-->/

const api = process.env.GITHUB_API_URL || "https://api.github.com"
const repo = process.env.GITHUB_REPOSITORY
const prNumber = process.env.PR_NUMBER
const headSha = process.env.HEAD_SHA

async function github(path) {
  const response = await fetch(`${api}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

/**
 * @param {{user?: {login?: string}, body?: string}} comment
 * @returns {boolean}
 */
export function isTrustedEvidenceComment(comment) {
  return (
    TRUSTED_AUTHORS.has(comment?.user?.login) &&
    typeof comment?.body === "string" &&
    comment.body.includes("<!-- garnet-runtime-review -->") &&
    GARNET_OWNED_MARKER_RE.test(comment.body)
  )
}

function headBoundComment(comments) {
  return comments.find((comment) => {
    if (!isTrustedEvidenceComment(comment)) return false
    const match = COMMIT_RE.exec(comment.body)
    return match !== null && match[1] === headSha
  }) ?? null
}

/**
 * @param {string} body
 * @returns {string | null}
 */
export function extractMirroredBody(body) {
  const begin = BEGIN_LINE_RE.exec(body)
  if (!begin) return null
  const after = body.slice(begin.index)
  const end = END_LINE_RE.exec(after)
  if (!end) return null
  const block = after.slice(0, end.index)
  const marker = "<details><summary>Execution record (verbatim mirror)</summary>\n\n"
  const start = block.indexOf(marker)
  if (start < 0) return null
  const contentStart = start + marker.length
  const contentEnd = block.lastIndexOf("\n\n</details>")
  if (contentEnd < contentStart) return null
  return block.slice(contentStart, contentEnd)
}

function preambleFor(head) {
  const sha7 = head.slice(0, 7)
  return [
    `Kernel-recorded execution record for head \`${head}\`, mirrored verbatim from`,
    "the sticky Garnet Runtime Review comment on this PR so reviewers that read only",
    "the description ground in the same bytes. Facts only. Judgment stays with the",
    "reviewer. Cite grounded findings as:",
    "",
    `> Runtime evidence (Garnet, head \`${sha7}\`): \`<execution chain>\` → \`<destination>\` (\`<workflow>/<job>\`) — <Execution Profile URL>`,
    "",
  ].join("\n")
}

function extractEvidenceSection(body) {
  const begin = BEGIN_LINE_RE.exec(body)
  if (!begin) return null
  const contentStart = begin.index + begin[0].length
  const after = body.slice(contentStart)
  const end = END_LINE_RE.exec(after)
  if (!end) return null
  return after
    .slice(0, end.index)
    .replace(/^\r?\n/, "")
    .replace(/\r?\n$/, "")
}

function isHeadBoundPointer(body, head) {
  const content = extractEvidenceSection(body)
  if (content === null) return false
  const prefix = [
    "## Runtime evidence (Garnet)",
    "",
    `<!-- garnet:commit ${head} -->`,
    preambleFor(head),
  ].join("\n")
  if (!content.startsWith(prefix)) return false
  const suffix = content.slice(prefix.length)
  const sha7 = head.slice(0, 7)
  const pointerPattern =
    "^\\nThe record for head `" +
    sha7 +
    "` is not mirrored here because [^\\n]+ Read it verbatim in \\[the sticky Garnet Runtime Review comment\\]\\(https?://[^\\s)]+\\)\\.$"
  return new RegExp(pointerPattern).test(suffix)
}

/**
 * @param {string} body
 * @param {string} expectedBody
 * @param {string} head
 * @returns {"match" | "pending"}
 */
export function verifyMirroredEvidence(body, expectedBody, head) {
  const mirrored = extractMirroredBody(body)
  if (mirrored === null) {
    if (isHeadBoundPointer(body, head)) return "pending"
    throw new Error("Evidence section has no verbatim mirror or valid head-bound pointer")
  }
  if (mirrored !== expectedBody) throw new Error("Mirrored evidence bytes differ from the head-bound sticky comment")
  if (/^<!-- garnet:evidence:(?:begin|end) -->[ \t]*$/m.test(mirrored)) {
    throw new Error("Evidence bytes contain a delimiter marker")
  }
  return "match"
}

async function main() {
  if (!process.env.GITHUB_TOKEN || !repo || !prNumber || !headSha) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER and HEAD_SHA are required")
  }
  const [pr, comments] = await Promise.all([
    github(`/repos/${repo}/pulls/${prNumber}`),
    github(`/repos/${repo}/issues/${prNumber}/comments?per_page=100`),
  ])
  if (pr.head?.sha !== headSha) throw new Error("PR head moved while checking evidence")
  const comment = headBoundComment(comments)
  if (!comment) {
    console.log("No trusted head-bound comment exists; sanctity check is pending.")
    return
  }
  const result = verifyMirroredEvidence(pr.body ?? "", comment.body, headSha)
  if (result === "pending") {
    console.log("Mirrored evidence is a head-bound pointer; sanctity check is pending.")
    return
  }
  console.log("Mirrored evidence bytes match the trusted head-bound sticky comment.")
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
