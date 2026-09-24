# R44 — CE mobile/phone bundle audit

Scope: phone/mobile web surface of the poetry content studio (`index.html`, `ce-mobile.css`,
`ce-touch-edit.js`, `deck_index.js`, `native-ideas.js`, all root `.js`/`.css`).
Working-tree content audited as it stands, uncommitted changes included.
Read-only except this report. No build, test or gate was run.

Ranked most severe first.

---

## CRITICAL

### C1 — A long-press poem edit is accepted on screen and then silently discarded
- **File:line** `ce-touch-edit.js` commit function (≈ lines 88–112 in `armTouchEditing`), interacting with `index.html:10670` (`function studioDeck()`).
- **Defect** `commit()` resolves the target deck with `window.studioDeck()` and only persists when `deck.slides[idx]` exists; but `studioDeck()` opens with `if (state.currentType !== 'carousel' && state.currentType !== 'post') return null;` (index.html:10671), so for a **poem** the guard `if (deck && deck.slides && deck.slides[idx])` is never entered and the edited text is never written to `ce_deck_edits` or the sync endpoint — while the block was armed, made `contenteditable`, and shown as editing.
- **Failure scenario** On a phone (390px), open a poem in Studio, long-press the poem text, type a change, tap outside. The block visibly closed as if committed, no error was raised, and the edit vanished on the next canvas re-render / reload.
- **Proposed fix** In `ce-touch-edit.js`, give `commit()` a poem branch: when the armed node is `#studio-editable-text` (or `state.currentType === 'poem'`), write through the poem path instead of `studioDeck()` — call `poemFinishTextEdit()`/`studioCapturePoemDraft()` and the existing `studioSavePoem()` plus a `localStorage` fallback under a `ce_poem_drafts` key, and raise an honest message when no branch can persist. Do not leave the `if (deck && deck.slides ...)` guard as the only write path.

### C2 — Poem text cannot be entered into edit mode by touch at all
- **File:line** `ce-touch-edit.js` `armTouchEditing` editable selector (lines ≈ 26–30) vs the poem markup at `index.html:13849` (`<div id="studio-editable-text" …>`).
- **Defect** The long-press arm list is `[data-ce-block="content"|"hook"|"body"], .kickline[data-ce-edit]`. The poem's editable node `#studio-editable-text` carries **none** of those attributes, and the poem's edit entry points are only `dblclick` (index.html:13943, 13956) and `Enter`/`F2` keydown (index.html:13965). Touch never produces a keyboard event and double-tap-to-dblclick is unreliable in mobile WebKit, so poems — the primary content of this app — have no dependable touch path into text editing.
- **Failure scenario** On a 360px phone in Safari, single-tap and long-press a poem's lines: nothing enters edit mode; only a lucky double-tap does, and on iOS it usually selects a word instead.
- **Proposed fix** Extend the arm selector in `ce-touch-edit.js` `armTouchEditing` to include `#studio-editable-text` (and `.ce-poem-stage [contenteditable]`), and on long-press call the poem's own entry function `poemBeginTextEdit()` rather than only setting `contenteditable`.

---

## HIGH

### H1 — The phone "Schedule" control is dead on the web/LAN phone surface it exists for
- **File:line** `ce-touch-edit.js` `armScheduleButton` onclick (≈ lines 1248–1262 inside the IIFE that injects `#ce-web-schedule-btn`).
- **Defect** The handler opens with `var br = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ceBridge; if (!br) { showAppToast('Scheduling needs the Mac app …'); return; }` — but the browser/LAN phone companion has no `ceBridge`, and the working, HTTP-based implementation `window.__CE_PHONE_SCHEDULE__()` is never reached. The button is injected only on `html.ce-phone` (the phone surface), i.e. precisely where the bridge is absent.
- **Failure scenario** On a 390px phone opened over the LAN (no native bridge), tap Schedule: the toast says it needs the Mac app and the real queue path (`__CE_PHONE_SCHEDULE__` → `POST /schedule`) is never called, so scheduling from the phone — the feature's stated purpose — is unavailable.
- **Proposed fix** In `armScheduleButton`'s onclick, prefer the web path: if `__CE_PHONE_SCHEDULE__` exists, call it; fall back to the `ceBridge`/`__CE_PHONE_SCHEDULE__` native dance only when the web sheet is unavailable. Remove the `if (!br) return;` early exit that makes the web surface a no-op.

### H2 — A failed or queued sync push can read as "reachable"
- **File:line** `ce-touch-edit.js` `pushDeckEdit` terminal branch (`markReachable(); window.__CE_UNSYNCED_EDITS__ = countUnsyncedEdits(); if (done) done('ok');`) and the drain path `drainUnsyncedEdits`.
- **Defect** `markReachable()` clears `__CE_SYNC_UNREACHABLE__` and removes `ce_last_sync_error` as soon as one write returns a 2xx with no `stale` flag. A drained/queued edit whose individual push succeeded is fine, but the *reachable* flag is flipped for the whole session on any single success, so the surface can present sync as healthy while other records in `ce_deck_edits` remain waiting; nothing surfaces the wait count to the user, and `__CE_UNSYNCED_EDITS__` is only read by other surfaces, not joined to the toast.
- **Failure scenario** On a 390px phone, edit deck A while the Mac is away (queued), then the Mac returns and deck B pushes OK: the errors flag clears and the "Mac unreachable" toast is not re-shown, but deck A is still unsynced; the owner reads the surface as fully synced.
- **Proposed fix** In `ce-touch-edit.js`, after `markReachable()` in `pushDeckEdit`, if `countUnsyncedEdits() > 0` keep the not-reachable presentation and show a queued toast (e.g. "N edits still waiting for your Mac") instead of a clean success; or gate the `markReachable()` call on `__CE_UNSYNCED_EDITS__ === 0`.

### H3 — `.ce-ideas-action` buttons are 38px tall on the phone surface below 44px
- **File:line** `native-ideas.css:23` (`.ce-ideas-filter,.ce-ideas-filter-menu,.ce-ideas-action,.ce-ideas-menu-item{ … min-height:38px … }`) vs the phone override at `ce-mobile.css:3432` / `ce-mobile.css:2047` which are scoped `html.ce-phone`.
- **Defect** The 44px floor for idea action buttons (Take forward / Schedule / Copy) is only applied under `html.ce-phone`. On the phone layout where `html.ce-phone` is **not** set — `apply()` sets it only for `narrowLayout || (!ipadLike && physicalSmall && coarsePointer)` (index.html:3165–3167) — but where the 76px–style narrow media query at `native-ideas.css:263` (`max-width:760px`) fires, the base 38px `min-height` governs. A 700–760px Android tablet with a fine pointer, or any device in the 700–760px band that fails the coarse-pointer test, gets sub-44px idea action buttons.
- **Failure scenario** On a 740px-wide touch device, tap "Schedule" on an idea card: the button is 38px tall, below the 44px touch law, so taps near its edge miss and hit the card body.
- **Proposed fix** Raise the base rule in `native-ideas.css:23` to `min-height:44px` for `.ce-ideas-action` specifically (the one that carries an action, not a filter chip), so the floor holds without depending on `html.ce-phone`.

---

## MEDIUM

### M1 — The poem canvas hover-only "Move" handle is invisible on touch
- **File:line** `native-studio.css:2983` / `3018` (`.ce-drag-handle-bar{opacity:0}` and `.ce-draggable-box:hover .ce-drag-handle-bar, .ce-draggable-box.is-selected .ce-drag-handle-bar{ … }`), used at `index.html:13826`.
- **Defect** The Move handle is revealed by `:hover` or `.is-selected`. Hover never happens on touch, so the only path is the tap-then-`.is-selected` transition — but `.is-selected` is applied by the click handler on `#studio-draggable-container` (index.html:13952), and that handler returns early when `state.studioPoemEditing` is true, and the container is not always selected on load. The affordance the desktop user sees ("⋮⋮ Move") is therefore usually absent on the phone.
- **Failure scenario** On a 360px phone, open a poem and try to find a drag handle: nothing is visible until the text box is tapped once, and nothing at all while editing.
- **Proposed fix** In `native-studio.css`, give `.ce-draggable-box.is-selected .ce-drag-handle-bar` an always-visible-on-phone rule (e.g. `@media (hover:none){ .ce-draggable-box .ce-drag-handle-bar{opacity:1} }`) or select the container on canvas paint so `:hover` is not required.

### M2 — `touch-action:none` on armed blocks removes page scroll from gestures starting on the canvas
- **File:line** `ce-touch-edit.js` line ≈ 32: `el.style.touchAction = 'none';` inside `armTouchEditing`.
- **Defect** Every armed text block is given `touch-action:none` permanently, so a vertical swipe that begins on that block cannot scroll the surrounding page/studio. On a poem or carousel whose text block covers most of the phone screen, the user's natural scroll gesture is swallowed and the long-press timer is what runs instead. This is a conflict between the long-press/drag gesture and page scrolling, not a deliberate tap.
- **Failure scenario** On a 390px phone with a full-bleed poem text block, swipe up to scroll the studio: nothing scrolls because the gesture started on the armed block, and a 430ms press starts an edit instead.
- **Proposed fix** In `ce-touch-edit.js`, set `touchAction = 'pan-y'` (not `none`) on armed blocks and only disable panning once a long-press has actually fired, restoring `pan-y` on blur/commit; or apply `touch-action:none` only to a small drag handle rather than the whole block.

### M3 — Loading / empty / error states missing on several phone surfaces
- **File:line** `native-ideas.js` `render()` (search for `'<div class="ce-ideas-empty">'`) and `ce-mobile.css` load/skeleton rules (e.g. `ce-mobile.css:3060` `veilPoll` path in `ce-touch-edit.js`).
- **Defect** The Ideas surface renders a single empty string (`<div class="ce-ideas-summary">` falls back to counting only) and shows no loading state while `groupedItems()` runs over `window.__HTML_IDEAS__`; there is a `.ce-ideas-empty` only for "no match". The boot veil in `ce-touch-edit.js` also lifts on `.pure-card.deck-card` presence with no explicit error state, so a fetch/parse failure paints the bare gradient with no message.
- **Failure scenario** On a 360px phone with a slow or failed data load, the Ideas tab paints blank with no spinner and no error text; on a parse failure the boot veil lifts over an empty shell.
- **Proposed fix** In `native-ideas.js render()`, render a visible loading row when `sourceItems()` is empty during first boot and a distinct error row when `window.__HTML_IDEAS__` is absent; in `ce-touch-edit.js` add a timeout branch to the veil lift that shows "Library did not load — reload" instead of only lifting.

---

## LOW

### L1 — Devanagari poems do not use the bundled Mukta stack
- **File:line** `index.html:187` (`--font-deva: "Kohinoor Devanagari", "Noto Sans Devanagari", "Devanagari Sangam MN", sans-serif;`), `native-studio.css:1716` (`font-family:'Laila','Kohinoor Devanagari','Devanagari Sangam MN',Georgia,serif`), and the `@font-face` block at `index.html:45–48` that declares **Mukta** (200/300 weights, deva + latin subsets) which is then never referenced by any Devanagari surface except the optional "Mukta Thin" picker (index.html:6317, 15446).
- **Defect** The bundled Mukta faces are shipped but the poem canvas and `--font-deva` fall through to Kohinoor / Laila / system fonts. The requirement that Devanagari poems render in the bundled Mukta stack is not met; on Android/desktop (no Kohinoor, no Laila in system) the poem falls to a generic Devanagari serif.
- **Failure scenario** On a 430px Android phone with no Kohinoor/Laila installed, a poem renders in the system Devanagari serif instead of the bundled Mukta, changing line-wrapping and the author's intended type.
- **Proposed fix** Add `'Mukta'` to the front of `--font-deva` in `index.html:187` and to the poem canvas stack in `native-studio.css:1716` (after the explicit user-selected family, before the system fallbacks), so the shipped faces are actually used.

### L2 — Duplicate `apply()` phone classifier blocks
- **File:line** `index.html:3159–3169` and `index.html:3221–3231` (two near-identical `var apply = function () { … document.documentElement.classList.toggle('ce-phone', on); … }` blocks in separate IIFEs).
- **Defect** The phone-layer classifier is defined and bound twice (resize / orientationchange / DOMContentLoaded / setInterval). Both run on every resize; they agree today, so this is latent duplication that can drift when one is edited.
- **Failure scenario** Not user-visible now; on a future edit to one copy, the phone layer would flicker between the two classifiers' decisions on a 700px boundary resize.
- **Proposed fix** Delete the earlier duplicate `apply`/`reparentPack` block at `index.html:3159–3169` (it lacks the `?cephone=` override and the shipbar placement) and keep the single later owner.

---

## Notes / limits
- `deck_index.js`, `content_data.js`, `ideas_catalog.js`, `share-decks.js` are data payloads (one line each); no mobile behaviour of their own. `ce-insights.js` is desktop analytics rendering and was checked only for shared chrome.
- `native-plan.css`, `native-saved.css`, `native-studio.css` were read for the poem canvas, tools sheet, shipbar and drag-handle rules cited above; the phone-scoped overrides in `ce-mobile.css` were the primary source for tap-target and safe-area findings.
- No device-width finding was raised for 320px clipping in the shipbar/topbar: the CSS carries measured 320px rules (`ce-mobile.css:4040–4100`) and the row fits by construction; the 44px floor holds there.
- The above findings were derived from source reading only; no runtime measurement was performed (per the brief, no build/test).
