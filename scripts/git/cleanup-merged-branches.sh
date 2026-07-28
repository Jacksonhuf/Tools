#!/usr/bin/env bash
# Delete remote branches that are fully merged into a base branch.
#
# Usage:
#   ./scripts/git/cleanup-merged-branches.sh --dry-run cursor/prod-platform-wave*
#   ./scripts/git/cleanup-merged-branches.sh cursor/prod-platform-wave*
#
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  shift
fi

BASE="${CLEANUP_BASE_BRANCH:-main}"
git fetch origin "$BASE" --quiet

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 [--dry-run] <branch-pattern>..."
  echo "Example: $0 cursor/prod-platform-wave*"
  exit 1
fi

for pattern in "$@"; do
  for remote in $(git branch -r --list "origin/$pattern" | sed 's|^[[:space:]]*origin/||'); do
    if git merge-base --is-ancestor "origin/$remote" "origin/$BASE" 2>/dev/null; then
      if [[ "$DRY_RUN" == true ]]; then
        echo "[dry-run] would delete origin/$remote (merged into $BASE)"
      else
        echo "Deleting origin/$remote (merged into $BASE)"
        git push origin --delete "$remote"
      fi
    else
      echo "Skipping origin/$remote (not merged into $BASE)"
    fi
  done
done
