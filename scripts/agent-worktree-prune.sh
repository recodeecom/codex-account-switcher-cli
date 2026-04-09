#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="dev"
DRY_RUN=0
QUIET=0
declare -a SKIP_PATHS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_BRANCH="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --quiet)
      QUIET=1
      shift
      ;;
    --skip-path)
      SKIP_PATHS+=("$(cd "${2:-.}" && pwd -P)")
      shift 2
      ;;
    *)
      echo "[agent-worktree-prune] Unknown argument: $1" >&2
      echo "Usage: $0 [--base <branch>] [--dry-run] [--quiet] [--skip-path <path>]" >&2
      exit 1
      ;;
  esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[agent-worktree-prune] Not inside a git repository." >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
repo_root="$(cd "$repo_root" && pwd -P)"
current_worktree="$(pwd -P)"

log() {
  if [[ "$QUIET" -eq 0 ]]; then
    echo "$@"
  fi
}

is_skip_path() {
  local candidate="$1"
  [[ "$candidate" == "$current_worktree" ]] && return 0
  for skip in "${SKIP_PATHS[@]}"; do
    [[ "$candidate" == "$skip" ]] && return 0
  done
  return 1
}

is_clean_worktree() {
  local wt="$1"
  git -C "$wt" diff --quiet && git -C "$wt" diff --cached --quiet
}

target_ref="$BASE_BRANCH"
if git -C "$repo_root" show-ref --verify --quiet "refs/remotes/origin/${BASE_BRANCH}"; then
  git -C "$repo_root" fetch origin "$BASE_BRANCH" --quiet || true
  target_ref="origin/${BASE_BRANCH}"
elif ! git -C "$repo_root" show-ref --verify --quiet "refs/heads/${BASE_BRANCH}"; then
  echo "[agent-worktree-prune] Base branch not found: ${BASE_BRANCH}" >&2
  exit 1
fi

declare -a entries=()
mapfile -t entries < <(
  git -C "$repo_root" worktree list --porcelain | awk '
    $1 == "worktree" { wt = $2; br = "" }
    $1 == "branch" { br = $2 }
    $0 == "" { printf "%s\t%s\n", wt, br; wt = ""; br = "" }
    END { if (wt != "") printf "%s\t%s\n", wt, br }
  '
)

removed_worktrees=0
deleted_branches=0
skipped=0

for entry in "${entries[@]}"; do
  IFS=$'\t' read -r worktree_path branch_ref <<< "$entry"
  worktree_path="$(cd "$worktree_path" && pwd -P)"

  [[ "$worktree_path" != */.omx/agent-worktrees/* ]] && continue

  if is_skip_path "$worktree_path"; then
    skipped=$((skipped + 1))
    continue
  fi

  if ! is_clean_worktree "$worktree_path"; then
    log "[agent-worktree-prune] Skip dirty worktree: ${worktree_path}"
    skipped=$((skipped + 1))
    continue
  fi

  branch_name=""
  if [[ -n "$branch_ref" && "$branch_ref" == refs/heads/* ]]; then
    branch_name="${branch_ref#refs/heads/}"
  fi

  if [[ -z "$branch_name" ]]; then
    if [[ "$worktree_path" == */.omx/agent-worktrees/__integrate-* ]]; then
      log "[agent-worktree-prune] Removing stale detached integration worktree: ${worktree_path}"
      if [[ "$DRY_RUN" -eq 0 ]]; then
        git -C "$repo_root" worktree remove "$worktree_path" --force >/dev/null 2>&1 || true
      fi
      removed_worktrees=$((removed_worktrees + 1))
      continue
    fi
    skipped=$((skipped + 1))
    continue
  fi

  case "$branch_name" in
    agent/*|__agent_integrate_*)
      ;;
    *)
      skipped=$((skipped + 1))
      continue
      ;;
  esac

  if git -C "$repo_root" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    if ! git -C "$repo_root" merge-base --is-ancestor "$branch_name" "$target_ref"; then
      log "[agent-worktree-prune] Skip unmerged branch worktree: ${branch_name}"
      skipped=$((skipped + 1))
      continue
    fi
  fi

  log "[agent-worktree-prune] Removing merged worktree: ${worktree_path}"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    git -C "$repo_root" worktree remove "$worktree_path" --force >/dev/null 2>&1 || true
  fi
  removed_worktrees=$((removed_worktrees + 1))

  if git -C "$repo_root" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    if git -C "$repo_root" worktree list --porcelain | grep -Fq "branch refs/heads/${branch_name}"; then
      continue
    fi
    if [[ "$DRY_RUN" -eq 0 ]]; then
      git -C "$repo_root" branch -d "$branch_name" >/dev/null 2>&1 || true
    fi
    deleted_branches=$((deleted_branches + 1))
    log "[agent-worktree-prune] Deleted local merged branch: ${branch_name}"
  fi
done

log "[agent-worktree-prune] Summary: removed_worktrees=${removed_worktrees}, deleted_branches=${deleted_branches}, skipped=${skipped}"
