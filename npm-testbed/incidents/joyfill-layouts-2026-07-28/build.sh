#!/usr/bin/env bash
# Builds both replay tarballs from src/. Benign fixtures; see README.md.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
for variant in clean impacted; do
  work="$(mktemp -d)"
  cp -r "$here/src/$variant/." "$work/pkg/" 2>/dev/null || { mkdir -p "$work/pkg" && cp -r "$here/src/$variant/." "$work/pkg/"; }
  ( cd "$work/pkg" && npm pack --pack-destination "$here" >/dev/null )
  rm -rf "$work"
done
ls -1 "$here"/*.tgz
