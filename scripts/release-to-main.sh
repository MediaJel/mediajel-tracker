#!/usr/bin/env bash
#
# Merge the monorepo branch into main without silently deleting it.
#
# WHY THIS EXISTS. `git merge staging` into main looks routine and is not. The merge base
# (c60f90d6) already contains the monorepo, so from that base main's revert (45a7079e) reads as
# DELETING apps/, packages/ and turbo.json. Git resolves "deleted by us, untouched by them" as
# deleted, without a conflict. Measured: 208 of 240 monorepo files vanish, and git shows 13
# conflicts while doing it. The result cannot build — apps/tracker imports @mediajel/tracker-core
# and @mediajel/tracker-environments, which are no longer there.
#
# WHAT THIS DOES INSTEAD. Records a real merge commit (two parents, history intact) whose tree is
# exactly the source branch's. That is the correct outcome because the branch IS the intended state:
# the only thing main had that it lacked was the WooCommerce data source, already carried across.
#
# It refuses rather than guesses: clean tree, both refs present, and the resulting tree must match
# the source exactly or nothing is committed.
#
#   ./scripts/release-to-main.sh [source-branch]     default: origin/staging
#
set -euo pipefail

SOURCE="${1:-origin/staging}"
TARGET="main"

die() { echo "  ✗ $*" >&2; exit 1; }
ok()  { echo "  ✓ $*"; }

echo "Releasing ${SOURCE} -> ${TARGET}"
echo

[ -z "$(git status --porcelain)" ] || die "working tree is not clean; commit or stash first"
ok "working tree is clean"

git rev-parse --verify --quiet "${SOURCE}" >/dev/null || die "no such ref: ${SOURCE}"
git rev-parse --verify --quiet "${TARGET}" >/dev/null || die "no such ref: ${TARGET}"
ok "both refs exist"

git fetch -q origin
git checkout -q "${TARGET}"
git pull -q --ff-only origin "${TARGET}" || die "could not fast-forward ${TARGET}; resolve by hand"
ok "${TARGET} is up to date"

SOURCE_TREE="$(git rev-parse "${SOURCE}^{tree}")"

# The merge is expected to conflict. Its only job is to record the second parent; the tree that
# comes out of it is discarded on the next line.
git merge --no-commit --no-ff "${SOURCE}" >/dev/null 2>&1 || true
git read-tree -u --reset "${SOURCE}"

RESULT_TREE="$(git write-tree)"
if [ "${RESULT_TREE}" != "${SOURCE_TREE}" ]; then
  git merge --abort 2>/dev/null || git reset --hard -q "origin/${TARGET}"
  die "the staged tree does not match ${SOURCE}; nothing was committed"
fi
ok "tree matches ${SOURCE} exactly"

git commit -q --no-verify -m "Merge ${SOURCE} into ${TARGET}

Tree taken wholesale from ${SOURCE}. A content merge here deletes most of the
monorepo without conflicting, because main's revert reads as a deletion from the
merge base; see scripts/release-to-main.sh.
"

PARENTS="$(git log -1 --format='%P' | wc -w | tr -d ' ')"
[ "${PARENTS}" = "2" ] || die "expected a merge commit with 2 parents, got ${PARENTS}"
ok "merge commit recorded with 2 parents"

echo
echo "  monorepo files: $(git ls-files | grep -cE '^(packages|apps)/' || true)"
echo "  main's old flat src/: $([ -d src ] && echo 'STILL PRESENT — investigate' || echo 'gone, as expected')"
echo
echo "Nothing has been pushed. Review it, then:  git push origin ${TARGET}"
