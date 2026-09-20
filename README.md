# Content Review — CE phone/web surface

GitHub Pages build of the Content Engine Studio app for phone review + editing
(owner + manager). Live: https://doalfaaz.github.io/content-review/

## One version everywhere
This index.html is GENERATED from the app's own `Resources/index.html` by
`web/build_pages_merge.py` in the main repo (`content-engine-macos`). Never
hand-edit index.html here — edit the app source and re-run the merge script.

## Phone editing + sync
- Long-press a text block to edit (Canva-style); commits are debounced.
- Edits persist in localStorage (`ce_deck_edits`) and push to the Mac's sync
  server; the Mac app pulls them, and app saves flow back — last-write-wins
  by `updatedAt`. One version everywhere.
- Transport: Tailscale Funnel HTTPS -> loopback sync server, behind a
  capability path. Writes additionally need the shared write key (the owner
  is prompted once; read-only visitors never are). See the `ce-deck-sync`
  skill in the main repo for the full architecture and laws.

## Download for phone
Topbar button renders every slide at 1080x1350 and hands them to the iOS
share sheet (or downloads), plus copies the caption — the manual route for
IG carousels over 10 slides (Meta API cap).

## Parity guard (F-S11)

The live site is `origin/main` — nothing else. `tools/parity_guard.sh` fails
when the bundle drifts: uncommitted changes to served files, local `main`
ahead of `origin/main`, or a stale phone mirror (`~/.local/share/ce-phone`).
CI runs the bundle-completeness half on every push/PR to `main`;
local-only halves (mirror, unpushed work) skip honestly there.

```bash
bash tools/parity_guard.sh                          # run it any time
git config core.hooksPath .githooks                 # opt-in: guard on every commit
```
