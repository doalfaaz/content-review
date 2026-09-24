# Pages parity check — 2026-09-22

Scope: is `waitlist.html` / `ab2-waitlist.html` generated or hand-authored, what
do the parity gates actually compare, and what is the drift state of this repo
against the app source (`content-engine-macos`). Read-only audit; nothing
committed, pushed, or edited besides this file.

## Verdict up front

**`waitlist.html` and `ab2-waitlist.html` are hand-authored, pages-repo-only
files. The rewrite is safe and belongs in this repo.** Nothing in the app
source generates them, nothing overwrites them, and the deploy pipeline
explicitly protects them. Details below.

## 1. What the docs say about generated vs authored

`README.md` in this repo, lines 6–9, is the boundary statement:

> "This index.html is GENERATED from the app's own `Resources/index.html` by
> `web/build_pages_merge.py` in the main repo (`content-engine-macos`). Never
> hand-edit index.html here — edit the app source and re-run the merge script."

That is the **only** generated/authored documentation in this repo, and it
names only `index.html`. Two further boundary statements live inside the files
and in the sibling repo:

- `ce-mobile.css:2` carries an ownership banner: *"OWNED BY THE APP SOURCE
  (Resources/ce-mobile.css; merged by web/build_pages_merge.py). Never edit the
  pages copy directly."*
- `build-native.sh:513–516` (content-engine-macos): *"The waitlist twins are
  exactly that class: `waitlist.html` + `ab2-waitlist.html` exist ONLY in
  content-review-pages (21,991 bytes each, byte-identical), nothing in this
  repo or in web/build_pages_merge.py / ops/regen_static_catalogs.py generates
  them, and they are live owner-facing funnel pages."*

The absence of a complete in-repo list is itself a finding: anyone reading only
this repo's docs knows `index.html` is generated but has no local statement for
the other ~90 carried files (they must read `web/build_pages_merge.py`'s
`CARRY`/`CARRY_DIRS` lists in the sibling repo to learn it).

## 2. Generated vs hand-authored — full table

Method: every file hashed (`shasum -a 256`) and matched against the sibling
repo — `Resources/<path>` first, then repo root, then anywhere by basename.
"Match" = byte-identical counterpart exists.

### Carried from `Resources/` — byte-identical (93 files)

| File(s) | sha256 (both sides) | Counterpart |
|---|---|---|
| `ce-mobile.css` | `44d07a1b…e2542077` | `Resources/ce-mobile.css` |
| `ce-touch-edit.js` | `d53471f4…645406f0` | `Resources/ce-touch-edit.js` |
| `ce-insights.js` | `e30373b4…3dad35a39` | `Resources/ce-insights.js` |
| `content_data.js` | `1cb5e399…905c01d` | `Resources/content_data.js` |
| `ideas_catalog.js` | `d9f6268b…eee69e5` | `Resources/ideas_catalog.js` |
| `native-ideas.css` | `e5ddd656…a2e54a5` | `Resources/native-ideas.css` |
| `native-ideas.js` | `8cd38041…2fbe` | `Resources/native-ideas.js` |
| `native-plan.css` | `e2954b4f…52f351d1` | `Resources/native-plan.css` |
| `native-saved.css` | `73f3339d…fcaea54e6ea0` | `Resources/native-saved.css` |
| `native-studio.css` | `92fafca3…7f5af72554bf` | `Resources/native-studio.css` |
| `caption-bank.json` | `3ae3aa47…cda9b45f` | `Resources/caption-bank.json` |
| `likes-index.json` | `461d60a1…c13025a0` | `Resources/likes-index.json` |
| `ig-stills-index.json` | `2a64c240…b266063` | `Resources/ig-stills-index.json` |
| `manifest.webmanifest` | `06cb9b12…db013e97` | `Resources/manifest.webmanifest` |
| `apple-touch-icon.png` | `f9779120…ce5e17b1` | `Resources/apple-touch-icon.png` |
| `favicon.png` | `97734faa…95e422` | `Resources/favicon.png` |
| `legacy-renderers/renderers.{js,css,scoped.css}` | `1e3ad570…`, `d8d0fc7e…`, `b9ee4a68…` | `Resources/legacy-renderers/` |
| `fonts/` (19 .woff2) | all match | `Resources/fonts/` |
| `photo-designs/` (7 .jpeg) | all match | `Resources/photo-designs/` |
| `studio-icons/` (48 .png) | all match | `Resources/studio-icons/` |

These are exactly the `CARRY`/`CARRY_DIRS` contract of
`web/build_pages_merge.py:240–257`, plus `ig-stills-index.json`, which is *not*
in `CARRY` (the merge does not copy it) but is byte-identical to
`Resources/ig-stills-index.json` — it rides the candidate seed, and the orphan
census lists it as furniture (`pages-orphan-census-gate.sh:89–96`).

### Generated, deliberately ≠ `Resources/` counterpart

| File | pages sha256 | `Resources/` sha256 | Why it differs |
|---|---|---|---|
| `index.html` | `1a3df6416475aa6101cd2861d25d830c3f146109cf69aea23094a2f3f3a56739` (1,640,465 B) | `77d0514db06c3e1cf3e67560b78439f39b579904a508a929d6bad73d3495dbea` (1,621,542 B) | Merge output = app index + web layers (+18,923 B). **In sync**: merge gate regenerated into a copy of this tree and got byte-identical output (exit 0). |
| `deck_index.js` | `0835ea4feae0d1fd3af8d90cae4c5b8e7a207e3e77f6291fe20e7429bfa0ba2a` (1,182,204 B) | `68c4c00ae7a1e52247758fff713104988c6baace40ebb1f7acff8eea18ae333c` (162,961 B) | Rich "coverSlide" pages variant, emitted by `ops/regen_static_catalogs.py --pages-dir` — the app seed is slim by design (`build_pages_merge.py:364–374`). **Stale vs today's generator**: a fresh regen produced `0a3dbed2f208c896336613d50aa156a027cc5f797acbd0a67e233d3ac91948cd` — same size, 150,131 differing byte positions, first diff at byte 224 = added `"kickline"` inside `coverSlide`. The next deploy rewrites it; no action needed in this repo. |

### Generated artifact with no shipped generator

| File | sha256 | Status |
|---|---|---|
| `share-decks.js` | `5e7d79ee8874bd168ee5cefbc03ce3744aff7c18b84ebbd23ff9f22447f23a59` (4,023,810 B) | `window.__CE_FULL_DECKS__` snapshot (`"generatedAt":"2026-09-09T17:56:33+0530"`). No counterpart in `Resources/`; nothing in `ops/`, `web/`, `App/` writes it. Only matches are frozen qa fixture bundles (e.g. `qa/wb-ds-final/bundle/share-decks.js`). Survives via seed-carry + `ORPHAN_OK` furniture entry. Effectively frozen generated data. |

### Hand-authored, no CE-side counterpart

| File | sha256 | Bytes | Protection |
|---|---|---|---|
| `waitlist.html` | `5920377f4a3d22410d72736ddd03223f80fb8a8db2f7d425e100c5f2cf95d657` | 27,097 | `PAGES_CARRY` (`build-native.sh:537`) |
| `ab2-waitlist.html` | `5920377f4a3d22410d72736ddd03223f80fb8a8db2f7d425e100c5f2cf95d657` | 27,097 | `PAGES_CARRY` |
| `.nojekyll` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) | 0 | `PAGES_CARRY` |
| `.gitignore` | `78c46ce8…1475aba09` | 17 | furniture (`ORPHAN_OK`) |
| `README.md` | `2c70ec0d…f5f4fc5f9` | 1,238 | furniture (`ORPHAN_OK`) |
| `R44_MOBILE_AUDIT.md` | `1b7b1a33…f350e9308` | 13,862 | furniture (`ORPHAN_OK`) |
| `WAITLIST_CRAFT_NOTES_2026-09-22.md` | `fe54734e…9827befb` | 7,559 | **unprotected** — flagged by census |
| `PHONE_SURFACE_AUDIT_2026-09-22.md` | (canonical checkout only — created after this worktree's snapshot) | 26,097 | **unprotected** — flagged by census |
| `PAGES_PARITY_CHECK_2026-09-22.md` | this file | — | will also be flagged once landed |

`.git` is worktree metadata (a 120 B pointer file here; the git dir in the
canonical checkout), not content.

## 3. The waitlist verdict

**Hand-authored. The rewrite is safe.**

- No counterpart anywhere in `content-engine-macos` (the only `*waitlist*`
  hits there are a funnel JSON and a screenshot under `OUT/`).
- `build-native.sh:537`: `PAGES_CARRY="waitlist.html ab2-waitlist.html
  .nojekyll"` — the deploy's `rsync -a --delete` (`build-native.sh:903`)
  preserves them via hydrate/refuse/read-back (`build-native.sh:554–558`,
  `892–915`), proven live by `pages-carry-guard.sh` exit 0.
- `run-wave3-gates.sh:1287–1289`: *"waitlist.html / ab2-waitlist.html exist
  ONLY in the pages repo (no CE-side source, nothing regenerates them)."*
- They were byte-identical to each other at HEAD (`e7c84ad5…d786045`, 21,991 B
  each) and remain byte-identical after the rewrite (`5920377f…f95d657`,
  27,097 B each; `git diff --stat`: 527 changed lines per file, +628/−426
  combined). The `build-native.sh:514` comment's "21,991 bytes" matches HEAD
  exactly — the 27,097 B rewrite is the uncommitted change.
- Neither file is in the parity gate's `CORE` set
  (`qa/pages-parity-gate.mjs:52`), so live-vs-tree parity never inspects them —
  publish verification of the waitlist pages is manual either way.

## 4. The gates — what each compares

All gates live in the sibling repo (`content-engine-macos/qa/`); this repo
contains none.

**`qa/pages-parity-gate.mjs`** — compares the local pages tree **against the
live published site**, plus the LAN mirror. Confirmed, not refuted:

- `:52` `CORE = ['index.html','deck_index.js','content_data.js','ideas_catalog.js','share-decks.js','ce-mobile.css','ce-touch-edit.js']`
- `:55` `LIVE_ROOT = … 'https://doalfaaz.github.io/content-review'`
- `:107–113` `fetchBytes()` does a cache-busted `fetch()` of each live URL —
  **network**.
- `:136–143` fails (exit 2) when `liveSha[f] !== candSha[f]` for any CORE file.

So the gate can only go green **after** a merge propagates to GitHub Pages —
that is by design: it runs in `build-native.sh:776–777` with
`CE_PAGES_CANDIDATE="${PAGES_TARGET}"` as a pre-deploy staleness canary
("It reads the TREE, not the staged candidate: a fresh candidate is SUPPOSED to
differ from live until published", `build-native.sh:767–770`) and again in
`release.sh --post-publish` (`release.sh:173–182`). Precision note: with only
the waitlist rewrite uncommitted, this gate would still pass — the twins are
not in `CORE`.

**`qa/pages-merge-gate.sh`** — fully local, `/tmp` only. Re-runs
`build_pages_merge.py` twice (idempotency), asserts the data quadruple appears
once, asserts web-layer markers, then regenerates into a copy of the served
bundle and asserts `served index.html == fresh merge output` plus byte-equality
of every carried asset (`:49–82`). Compares local source vs local tree.

**`qa/pages-orphan-census-gate.sh`** — fully local, `TMPDIR` only. Regenerates
the whole bundle from an empty seed with the two shipped generators
(`:104–114`), computes `live files − generated files`, and requires each
remainder to be in `PAGES_CARRY` or `ORPHAN_OK` (`:124–151`). Compares local
tree vs local generator output.

**`qa/pages-carry-guard.sh`** — fully local, `TMPDIR` only. Extracts the
shipped hydrate/refuse/read-back/rsync blocks from `build-native.sh` and
executes them on throwaway trees (`:15–25`).

**`qa/q05-wl10651-nojekyll-carry.mjs`** — fully local; replays the `.nojekyll`
carry scenario. No network references.

Wiring (`qa/run-wave3-gates.sh`): `pages-merge-gate` `:986`,
`q05-nojekyll-carry` `:1089`, `pages-carry-guard` `:1292`,
`pages-orphan-census` `:1300`. `pages-parity-gate.mjs` is not a wave3 gate —
it is invoked by `build-native.sh` and `release.sh` directly.

## 5. Measured exit codes

Run from `content-engine-macos`, resolving the canonical pages tree
(`…/Builds/content-review-pages`), which I verified byte-identical to this
worktree for every shared file. All write only to `TMPDIR`.

| Check | Exit | Result |
|---|---|---|
| `bash qa/pages-carry-guard.sh` | **0** | PASS — hydrate/refuse/read-back/commit all hold; teeth + mutation controls trip |
| `bash qa/pages-merge-gate.sh` | **0** | PASS — merge idempotent, deduped, web layer present; "served bundle in sync" |
| `node qa/q05-wl10651-nojekyll-carry.mjs` | **0** | PASS — `.nojekyll` carry preserved; hazard + negative controls trip |
| `bash qa/pages-orphan-census-gate.sh` | **1** | FAIL — 2 source-less files not in `PAGES_CARRY`/`ORPHAN_OK`: `PHONE_SURFACE_AUDIT_2026-09-22.md`, `WAITLIST_CRAFT_NOTES_2026-09-22.md` (94 files regenerated, 104 live, 10 source-less, 8 protected) |
| `node qa/pages-parity-gate.mjs` | **not run** | Reaches the network: `fetch()`es `doalfaaz.github.io/content-review/*` (`:107–113`). Would compare live == candidate == mirror for the 7 CORE files. The waitlist twins are outside that set. |

## 6. Drift state vs the app source

Excluding the waitlist twins (stated separately above):

| File | pages sha256 | counterpart sha256 | Δ bytes (pages−src) | newer side | Assessment |
|---|---|---|---|---|---|
| `index.html` | `1a3df641…f3f3a56739` | `77d0514d…3495dbea` (`Resources/index.html`) | +18,923 | pages (20:43 vs 12:46)* | Not drift — merge output; gate-verified in sync |
| `deck_index.js` | `0835ea4f…f6291fe20e7429bfa0ba2a` | `68c4c00a…ae333c` (`Resources/deck_index.js`) | +1,019,243 | pages (20:43:51 vs 20:43:46)* | Not drift — the pages variant is rich by design. **But stale vs a fresh regen** (`0a3dbed2…91948cd`, first diff = `coverSlide.kickline` added); the next deploy's regen rewrites it |
| `README.md` | `2c70ec0d…f4fc5f9` | `9403cdfb…cfbe0973` (CE root README) | −686 | pages* | Different documents; both hand-authored. Not drift |
| `.gitignore` | `78c46ce8…1475aba09` | `ac05bd01…a5a5a3f` (CE root) | −3,077 | pages* | Different files (this repo ignores `/_regen_backups/` only). Not drift |

\* pages mtimes are last-deploy write stamps (~20:43:51 today), not edit times.

Every other carried file (84 of them) is **byte-identical** to `Resources/` —
zero drift. `share-decks.js` has no source counterpart by design (frozen
snapshot, ORPHAN_OK furniture).

Net drift conclusion: **no unauthorized drift**. One staleness note
(`deck_index.js` vs today's generator output) and one gate-red note (two new
`.md` files unprotected).

## 7. Recommendation

**Commit the waitlist rewrite here as-is.** Both pages are hand-authored and
carry-protected; no CE-side source exists to move the change into, and nothing
in the pipeline can overwrite them. Two follow-ups, both in the *sibling* repo:

1. `pages-orphan-census` is currently RED because
   `WAITLIST_CRAFT_NOTES_2026-09-22.md` and `PHONE_SURFACE_AUDIT_2026-09-22.md`
   (and soon this file) are source-less files not declared anywhere. Add them —
   or a dated-audit `*.md` convention — to `ORPHAN_OK` in
   `qa/pages-orphan-census-gate.sh` with a reason, else every release gate run
   stays red.
2. Optional: `share-decks.js` is a 4 MB generated payload with no living
   generator — fine today (furniture-listed), worth a line in the pages README
   so the next reader knows it is deliberate.
