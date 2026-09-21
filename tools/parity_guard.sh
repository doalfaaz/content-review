#!/usr/bin/env bash
# parity_guard.sh — the F-S11 guard. The live public site
# (doalfaaz.github.io/content-review) serves exactly what origin/main carries,
# so any state where the tree the owner is editing (or the phone mirror the
# LAN server ships) has drifted from origin/main is a silent-staleness bug:
# the app looks current while the public site runs an older bundle.
#
# Four checks:
#   1. completeness — every served core artifact exists, non-empty, and is
#      referenced by index.html (a bundle missing a sibling is not a bundle).
#   2. cleanliness  — no uncommitted changes to any SERVED artifact. Staged,
#      unstaged and untracked-in-served-dirs all count.
#   3. unpushed     — HEAD must not be ahead of its upstream on the main line.
#      (In CI this is trivially true; the check exists for the local lane.)
#   4. mirror parity (LOCAL only) — if $CE_PHONE_MIRROR (default
#      ~/.local/share/ce-phone) exists, each served file's bytes must equal
#      `git show origin/main:<file>`. A present-but-drifted mirror FAILS; an
#      absent mirror is a SKIP with a WARN, never a pass-by-absence.
#
# Exit: 0 pass / 1 fail / never exit-0-without-evidence — every check prints
# PASS/FAIL/SKIP with what it measured.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
cd "$ROOT"

# The served core: the files index.html must reference, matching the CE-side
# contract (qa/pages-parity-gate.mjs CORE). Everything else tracked at the
# root is served too, but these seven are the phone bundle.
CORE="index.html deck_index.js content_data.js ideas_catalog.js share-decks.js ce-mobile.css ce-touch-edit.js"
MIRROR="${CE_PHONE_MIRROR:-$HOME/.local/share/ce-phone}"
FAIL=0

note()  { echo "  $*"; }
pass()  { echo "PASS  $1"; }
fail()  { echo "FAIL  $1"; FAIL=1; }
skip()  { echo "SKIP  $1"; }

# ── 1. completeness ─────────────────────────────────────────────────────────
echo "== served-bundle completeness =="
MISSING=""
for f in $CORE; do
  if [ ! -s "$f" ]; then MISSING="$MISSING $f"; fi
done
if [ -n "$MISSING" ]; then
  fail "missing/empty served artifacts:$MISSING"
else
  pass "all core files present and non-empty"
fi

if [ -s index.html ]; then
  UNREF=""
  for f in $CORE; do
    [ "$f" = "index.html" ] && continue
    grep -q "\./$f" index.html || UNREF="$UNREF $f"
  done
  if [ -n "$UNREF" ]; then
    fail "index.html does not reference:$UNREF"
  else
    pass "index.html references every sibling bundle file"
  fi
fi

# ── 2. uncommitted changes to served artifacts ──────────────────────────────
echo "== working-tree cleanliness (served artifacts) =="
# Served = every tracked file outside meta/tooling paths. Meta paths are the
# guard itself, CI config, docs and receipts — a README edit must not fail.
META_RE='(\.github/|\.githooks/|tools/|README\.md$|.*_RECEIPT\.md$|docs/)'
# git status already covers staged + unstaged + untracked (a new file in a
# served dir IS a bundle change). Filter out meta/tooling paths. The status
# column is `XY <path>` — match the path portion after the 3-char prefix.
DIRTY="$(git status --porcelain --untracked-files=all -- . 2>/dev/null | grep -vE "^.. ${META_RE}" || true)"
if [ -n "$DIRTY" ]; then
  fail "uncommitted changes to served artifacts:"
  echo "$DIRTY" | sed 's/^/    /'
else
  pass "no uncommitted changes to served artifacts"
fi

# ── 3. local ahead of origin (the F-S11 mode) ────────────────────────────────
echo "== unpushed-work check =="
CUR_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
UPSTREAM="$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)"
if [ "$CUR_BRANCH" = "main" ]; then
  if [ -n "$UPSTREAM" ]; then
    AHEAD="$(git rev-list --count "${UPSTREAM}..HEAD")"
    if [ "$AHEAD" -gt 0 ]; then
      fail "local main is $AHEAD commit(s) ahead of $UPSTREAM — the site will keep serving the stale bundle invisibly (F-S11). Push or reset before committing more."
    else
      pass "main is not ahead of $UPSTREAM"
    fi
  else
    skip "main has no upstream — cannot measure ahead-ness"
  fi
else
  note "on branch $CUR_BRANCH — ahead-check applies to main; measuring vs origin/main"
  git rev-parse --verify origin/main >/dev/null 2>&1 || git fetch origin main --quiet 2>/dev/null || true
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    # A feature branch ahead of origin/main is normal; fail only when main
    # itself is the checked-out ref and ahead. On a feature branch this is
    # informational.
    note "feature branch — ahead-of-origin is expected; no verdict"
  else
    skip "origin/main unreachable — cannot measure"
  fi
fi

# ── 4. LAN mirror parity (local lane only) ───────────────────────────────────
echo "== phone-mirror parity vs origin/main =="
if [ -n "${CI:-}" ]; then
  skip "CI run — no phone mirror on the runner (local lane only)"
elif [ ! -d "$MIRROR" ]; then
  skip "mirror dir $MIRROR absent (fresh machine) — parity unmeasured, not passed"
else
  git fetch origin main --quiet 2>/dev/null || true
  if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
    skip "origin/main unfetchable — mirror parity unmeasured"
  else
    DRIFT=""
    for f in $CORE; do
      MF="$MIRROR/$f"
      if [ ! -f "$MF" ]; then DRIFT="$DRIFT $f(mirror-missing)"; continue; fi
      OB="$(git show "origin/main:$f" 2>/dev/null | shasum -a 256 | cut -d' ' -f1)"
      MB="$(shasum -a 256 "$MF" | cut -d' ' -f1)"
      if [ "$OB" != "$MB" ]; then DRIFT="$DRIFT $f"; fi
    done
    if [ -n "$DRIFT" ]; then
      fail "phone mirror drifts from origin/main:$DRIFT — refresh ~/.local/share/ce-phone from the pages tree"
    else
      pass "mirror == origin/main for every core file"
    fi
  fi
fi

echo "== verdict =="
if [ "$FAIL" -eq 0 ]; then
  echo "PARITY GUARD: PASS"
else
  echo "PARITY GUARD: FAIL"
fi
exit "$FAIL"
