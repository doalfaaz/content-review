# PARITY_GATE_RECEIPT — content-review parity guard (P6)

Branch `cloud/parity-guard` off `origin/snapshot/wip-20260920` (`5d85e36`).
Reference contract: `qa/pages-parity-gate.mjs` in `content-engine-studio`.

## What was built

| piece | file | contract |
|---|---|---|
| Guard script | `tools/parity_guard.sh` | 4 checks; exits 1 on the first failing class; every check prints PASS/FAIL/SKIP with evidence |
| CI check | `.github/workflows/parity-guard.yml` | runs the guard on every push/PR to `main` (`CI=1` makes local-only checks SKIP) |
| Optional pre-commit | `.githooks/pre-commit` | opt-in via `git config core.hooksPath .githooks` — refuses a commit that would ship drift |
| Docs | `README.md` §Parity guard | how to run, how to opt in |

## The three drift modes covered (from the F-S11 post-mortem)

| mode | check | where |
|---|---|---|
| served artifacts dirty/uncommitted | `git status --porcelain` over tracked-and-untracked, minus meta/tooling paths | local + CI |
| local `main` ahead of `origin/main` | `git rev-list --count @{upstream}..HEAD` on `main` | local (CI trivially clean) |
| phone mirror ≠ `origin/main` bytes | sha256 of `~/.local/share/ce-phone/*` vs `git show origin/main:*` per core file | local only — CI SKIPs |
| bundle completeness | every core file present, non-empty, `./`-referenced by `index.html` | local + CI |

## Verification (each failure mode exercised for real)

| control | observed |
|---|---|
| clean tree | `PARITY GUARD: PASS` (mirror SKIP — absent here, honestly reported) |
| `echo x >> ce-mobile.css` | FAIL — `uncommitted changes to served artifacts` |
| `touch fonts/rogue.ttf` (untracked in served dir) | FAIL — same check |
| empty commit on `main` ahead of `origin/main` | FAIL — `local main is 1 commit(s) ahead … F-S11` |
| mirror dir w/ `origin/main` bytes + one drifted file | FAIL — `phone mirror drifts from origin/main: ce-mobile.css` |
| mirror == origin/main for all 7 files | PASS — `mirror == origin/main for every core file` |

## Honest limits

- CI cannot see the owner's LAN mirror or unpushed local commits — those
  checks SKIP on the runner by design (they are the local lane's job).
- The guard never pushes, never publishes, never touches `main`. Merging
  this PR adds the guard only; the site bundle is untouched.
- `snapshot/wip-20260920` carries 7 commits ahead of `origin/main` — the
  guard treats a feature branch as informational; the ahead-check fires only
  on `main` itself.

## Local verify

```bash
bash tools/parity_guard.sh
git config core.hooksPath .githooks   # opt-in pre-commit
```
