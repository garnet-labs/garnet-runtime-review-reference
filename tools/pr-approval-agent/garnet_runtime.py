"""Decide whether dependency changes in a PR carry runtime assurance from Garnet.

Reads the sticky Garnet Runtime Review comment posted on the PR by the
installed Garnet integration (`garnet-runtime-review[bot]`). That comment is a
public PR artifact — humans read it in the PR UI and any tool that consumes
issue comments can use it. Stamphog is one such consumer; nothing in this
module is specific to Garnet's internals, only to the comment's public markers
and its recorded process-lineage/egress tree.

This module is the dependency-territory analogue of `migration_risk.py`:

    Migration risk check   →  migrations/ deny bypass (scoped to analyzed files)
    Garnet runtime record  →  deps_toolchain deny bypass (scoped to dependency files)

Head-SHA binding: the comment embeds `<!-- garnet:commit <sha> -->`. A record
whose commit differs from the PR's current head is stale and confers no
assurance — the same staleness discipline stamphog applies to reviews and
check runs (which are SHA-bound at the API level).

Decision rule (v1, deliberately conservative):
    A dependency change is runtime-assured only when ALL hold:
      1. A Garnet Runtime Review comment exists and is pinned to the PR head.
      2. The comment is a final record, not the in-flight "pending" variant.
      3. Every recorded outbound destination attributed to the *workload*
         (bold lineage — processes spawned by workflow steps, e.g. the
         `npm install` under test) is within the expected ecosystem baseline
         (package registry + local resolver). Runner scaffolding egress
         (italic lineage — Runner.Worker, provisioning daemons) is reported
         but never counted against the workload.
    Any off-baseline workload destination → no bypass, and the destinations
    are surfaced as evidence so the refusal cites what the code actually did.

Every failure mode (no comment, stale comment, pending record, malformed
tree, off-baseline egress) falls back to "deny-list applies normally," which
is the safe default.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from github import _gh_api

GARNET_BOT = "garnet-runtime-review[bot]"
COMMENT_MARKER = "<!-- garnet-runtime-review -->"
PENDING_MARKER = "garnet-control-plane-pending-pr-comment"
_COMMIT_RE = re.compile(r"<!--\s*garnet:commit\s+([0-9a-f]{40})\s*-->")
_PROFILE_URL_RE = re.compile(r"https://app\.garnet\.ai/public/runs/[^\s\")]+")

# Expected workload egress for a dependency-install run, per ecosystem.
# The npm baseline is the public registry plus the local DNS resolver.
# Off-baseline example that must NOT ride this bypass: a postinstall script
# calling webhook.site, a typosquat pulling a second-stage from a CDN, etc.
WORKLOAD_BASELINE: dict[str, frozenset[str]] = {
    "npm": frozenset({"registry.npmjs.org", "localhost"}),
    "pypi": frozenset({"pypi.org", "files.pythonhosted.org", "localhost"}),
    "cargo": frozenset({"static.crates.io", "index.crates.io", "localhost"}),
}

# GitHub-hosted runner *step* infrastructure. Bold (step-attributed) lineage
# includes the workflow's own action tooling — actions/checkout and
# actions/setup-node talk to these on every run. Documented GitHub Actions
# service domains, not workload egress in the supply-chain sense.
# Known limitation (v1): exfil disguised as GitHub API traffic rides this
# baseline; that residual risk is assigned to the reviewer prompt lane, which
# sees the full lineage and can flag api.github.com use *by the installed
# package* (as opposed to by action tooling).
RUNNER_STEP_BASELINE: frozenset[str] = frozenset(
    {
        "github.com",
        "api.github.com",
        "codeload.github.com",
        "localhost",
    }
)
RUNNER_STEP_BASELINE_SUFFIXES: tuple[str, ...] = (
    ".githubusercontent.com",
    ".githubapp",
    ".githubapp.com",
)


def _in_runner_baseline(dest: str) -> bool:
    return dest in RUNNER_STEP_BASELINE or dest.endswith(RUNNER_STEP_BASELINE_SUFFIXES)


# Dependency-shaped files the bypass may cover (mirrors the deps_toolchain
# lockfile/manifest surface). Scoped: only files in this shape AND in the PR
# diff are ever ignored — auth/billing/migration files never ride along.
_DEP_FILE_RE = re.compile(
    r"(?:^|/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|"
    r"pnpm-lock\.yaml|bun\.lockb?|requirements[-\w]*\.(?:txt|in)|poetry\.lock|"
    r"uv\.lock|Pipfile\.lock|Cargo\.(?:toml|lock)|go\.(?:mod|sum)|composer\.(?:json|lock)|"
    r"Gemfile(?:\.lock)?)$"
)


@dataclass
class GarnetRecord:
    """Parsed view of the sticky Garnet Runtime Review comment."""

    commit: str = ""
    pending: bool = False
    profile_url: str = ""
    workload_destinations: set[str] = field(default_factory=set)
    scaffold_destinations: set[str] = field(default_factory=set)

    def pinned_to(self, head_sha: str) -> bool:
        return bool(self.commit) and self.commit == head_sha

    @property
    def parsed(self) -> bool:
        """True when at least one recorded destination was extracted.

        A record from which nothing could be parsed (renderer format drift,
        truncated body) must confer no assurance — zero parsed destinations
        is indistinguishable from a failed parse, so it fails closed.
        """
        return bool(self.workload_destinations or self.scaffold_destinations)

    def off_baseline(self, ecosystem: str = "npm") -> set[str]:
        baseline = WORKLOAD_BASELINE.get(ecosystem, frozenset())
        return {
            d
            for d in self.workload_destinations
            if d not in baseline and not _in_runner_baseline(d)
        }


def fetch_garnet_record(repo: str, pr_number: int) -> GarnetRecord | None:
    """Fetch and parse the Garnet sticky comment from the PR's issue comments.

    Fetched directly (not via PRData.discussion) because the reviewer-prompt
    normalizer intentionally drops bot comments; this module consumes the
    comment as a deterministic gate input, not as prompt context.
    Returns None when no Garnet comment exists.
    """
    try:
        comments = _gh_api(f"repos/{repo}/issues/{pr_number}/comments", paginate=True)
    except Exception:
        return None
    bodies = [
        c.get("body", "")
        for c in comments
        if (c.get("user") or {}).get("login") == GARNET_BOT
        and COMMENT_MARKER in (c.get("body") or "")
    ]
    if not bodies:
        return None
    return _parse_comment(bodies[-1])


def runtime_assured_files(
    record: GarnetRecord | None, head_sha: str, pr_file_paths: list[str]
) -> set[str]:
    """Return dependency files that may bypass the deps_toolchain deny-list.

    Empty set when the record is missing, pending, stale (not pinned to the
    current head), or shows any off-baseline workload egress. The caller
    treats that as "deny-list applies normally."
    """
    if (
        record is None
        or record.pending
        or not record.pinned_to(head_sha)
        or not record.parsed
    ):
        return set()
    if record.off_baseline():
        return set()
    return {p for p in pr_file_paths if _DEP_FILE_RE.search(p)}


def runtime_summary(
    record: GarnetRecord | None,
    head_sha: str,
    assured_files: set[str] | list[str],
    touches_deps: bool,
) -> str:
    """One-line runtime signal for the Gates block, in the engine's own shape.

    This is how the Garnet record enters the decision surface: a single context
    line printed alongside `ownership:`, derived from the same record that gates
    the deps_toolchain bypass. It states plainly whether the record lifted or
    withheld the bypass and why — no separate footer, no second comment.
    """
    if record is None:
        return (
            "no head-pinned record — deps deny not lifted"
            if touches_deps
            else "no record (no dependency changes)"
        )
    sha = (record.commit or "")[:7] or "unknown"
    if record.pending:
        return f"recording in progress ({sha}) — no assurance yet"
    if not record.pinned_to(head_sha):
        return f"stale record ({sha}, not at head) — no assurance"
    if not record.parsed:
        return f"head-pinned {sha} but no destinations parsed — no assurance"
    off = sorted(record.off_baseline())
    if off:
        return f"head-pinned {sha}; off-baseline egress → {', '.join(off)}; deps bypass WITHHELD"
    n = len(list(assured_files))
    if n:
        return f"head-pinned {sha}; egress within npm baseline; deps bypass APPLIED ({n} dep file{'s' if n != 1 else ''})"
    return f"head-pinned {sha}; egress within npm baseline"


def garnet_record_pending(
    record: GarnetRecord | None, head_sha: str, pr_file_paths: list[str]
) -> bool:
    """True when the PR touches dependency files and no final head-pinned record exists.

    Mirrors `migration_check_pending`: a missing/stale/pending record on a
    dependency PR means the recording workflow simply hasn't finished for
    this head yet — WAIT rather than REFUSE, so the verdict never races the
    sensor.
    """
    if not any(_DEP_FILE_RE.search(p) for p in pr_file_paths):
        return False
    return (
        record is None
        or record.pending
        or not record.pinned_to(head_sha)
        or not record.parsed
    )


def _parse_comment(body: str) -> GarnetRecord:
    record = GarnetRecord()
    match = _COMMIT_RE.search(body)
    if match:
        record.commit = match.group(1)
    record.pending = PENDING_MARKER in body
    url = _PROFILE_URL_RE.search(body)
    if url:
        record.profile_url = url.group(0).replace("&amp;", "&")

    for pre in _job_pre_blocks(body):
        workload, scaffold = _parse_lineage_tree(pre)
        record.workload_destinations |= workload
        record.scaffold_destinations |= scaffold
    return record


def _job_pre_blocks(body: str) -> list[str]:
    """Extract the per-job lineage <pre> blocks, skipping the legend.

    The comment opens with a legend (💡 "Reading this review" / "How to
    read this") whose example tree must not be parsed as recorded egress;
    real job folds link to /actions/runs/ in their <summary>.
    """
    blocks: list[str] = []
    for section in body.split("<details")[1:]:
        summary = section.split("</summary>")[0]
        if (
            "Reading this review" in summary
            or "How to read this" in summary
            or "💡" in summary
        ):
            continue
        if "Stamphog" in summary:
            # Self-exclusion: when this review engine itself runs under the
            # sensor, its job's egress (LLM API, package fetches) is part of
            # the review scaffolding, never the workload under review.
            continue
        for pre in re.findall(r"<pre>(.*?)</pre>", section, flags=re.DOTALL):
            blocks.append(pre)
    return blocks


def _parse_lineage_tree(pre: str) -> tuple[set[str], set[str]]:
    """Split recorded destinations into workload vs scaffold attribution.

    The tree uses typography for attribution: <strong> lineage is attributed
    to a GitHub step below Runner.Worker (the workload), <em> lineage is
    runner scaffolding. A destination line (`→ dest` in action-comment
    contracts, `○ dest` in control-plane contracts ≥ 6.10) belongs to its
    nearest process ancestor, tracked by indentation depth.
    """
    workload: set[str] = set()
    scaffold: set[str] = set()
    stack: list[tuple[int, bool]] = []  # (indent, is_workload)
    control_plane = "○" in pre  # contract ≥ 6.10 renders actions as ○ bullets
    root_is_workload = False  # ○ format: Runner.Worker tree = job steps; systemd tree = runner infra

    for raw_line in pre.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        indent = len(re.match(r"^[\s│]*", line).group(0))
        rest = line[indent:]

        if control_plane and indent == 0 and "○" not in rest and "─" not in rest:
            root = re.sub(r"<[^>]+>", "", rest).strip()
            root_is_workload = root.startswith("Runner.Worker")
            continue

        if "→" in rest or "○" in rest:
            dest = _clean_destination(rest)
            if not dest:
                continue
            while stack and stack[-1][0] >= indent:
                stack.pop()
            if control_plane:
                is_workload = root_is_workload
            else:
                is_workload = stack[-1][1] if stack else False
            (workload if is_workload else scaffold).add(dest)
        elif "<strong>" in rest or "<em>" in rest:
            while stack and stack[-1][0] >= indent:
                stack.pop()
            stack.append((indent, "<strong>" in rest))
    return workload, scaffold


def _clean_destination(rest: str) -> str:
    marker = "→" if "→" in rest else "○"
    dest = rest.split(marker, 1)[1]
    dest = re.sub(r"<[^>]+>", "", dest)  # strip html tags
    dest = re.sub(r"\([^)]*\)", "", dest)  # strip annotations like (dns resolver)
    dest = re.sub(r"\[([.:])\]", r"\1", dest)  # normalize defanged names: example[.]com
    return dest.strip()
