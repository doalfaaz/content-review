# PHONE_SURFACE_AUDIT_2026-09-22

Deep read-only audit of the phone-first review surface (`index.html` + phone CSS/JS + the two waitlist pages). Every line number below was verified by opening the file in this worktree. No runtime/device measurement was performed — layout and gesture claims are static-analysis findings, marked as such where device behavior matters.

## Upstream-owned files — do not hand-edit

`README.md:7-9` states `index.html` is generated from the app's `Resources/index.html` by `web/build_pages_merge.py` in `content-engine-macos`. The merge carries the rest of the bundle with it, so treat as upstream-owned and fix in the app source, not here:

- `index.html`, `ce-mobile.css`, `native-ideas.css`, `native-plan.css`, `native-saved.css`, `native-studio.css`, `legacy-renderers/*`
- `ce-touch-edit.js`, `native-ideas.js`, `ce-insights.js`
- `content_data.js`, `deck_index.js`, `ideas_catalog.js`, `share-decks.js`, `caption-bank.json`, `ig-stills-index.json`, `likes-index.json`
- `fonts/`, `studio-icons/`, `photo-designs/`, `favicon.png`, `apple-touch-icon.png`, `manifest.webmanifest`

Authored-in-this-repo: `waitlist.html`, `ab2-waitlist.html`, `README.md`, the report files. **`waitlist.html` and `ab2-waitlist.html` were just rewritten by someone else, are uncommitted in the working tree, byte-identical (`cmp`), and were audited as-is.**

## Inventory (118 files, classified)

| Class | Files |
|---|---|
| Pages | `index.html` (1,640,465 B, generated), `waitlist.html`, `ab2-waitlist.html` (27,097 B each, identical) |
| Generated data bundles | `content_data.js` (8,926,236), `share-decks.js` (4,023,810), `deck_index.js` (1,182,204), `ideas_catalog.js` (662,591), `likes-index.json` (819,473), `ig-stills-index.json` (160,187), `caption-bank.json` (11,624) |
| Stylesheets | `ce-mobile.css` (239,312), `native-studio.css` (210,433), `legacy-renderers/renderers.scoped.css` (534,047), `legacy-renderers/renderers.css` (509,401 — not referenced by any HTML/JS; repo weight only), `native-plan.css` (83,004), `native-saved.css` (22,455), `native-ideas.css` (10,649) |
| Scripts | `legacy-renderers/renderers.js` (877,631), `ce-touch-edit.js` (115,513), `native-ideas.js` (32,146), `ce-insights.js` (7,123) |
| Fonts | 18 woff2 in `fonts/` (Poppins ×9, Laila ×5, Mukta ×4, slab-var) — 1,197,984 B |
| Icons/images | `studio-icons/` 47 PNGs (204,331), `photo-designs/` 7 JPEGs (1,219,678), `favicon.png`, `apple-touch-icon.png` |
| Reports/meta | `README.md`, `R44_MOBILE_AUDIT.md`, `WAITLIST_CRAFT_NOTES_2026-09-22.md`, `manifest.webmanifest`, `.nojekyll`, `.gitignore` |

---

## Findings, ranked

### 1. HIGH — Grow/audience thumbnails can never render on the phone web surface, and the shipped stills index is never loaded

`index.html:13` — the CSP allows `img-src 'self' data: file: ce-still:` only. Two emitted `<img>` sources violate it:

- `index.html:8470` — audience rows use `p.thumb`, populated from Meta `thumb`/`mediaUrl` (`ce-insights.js:32`), i.e. `*.cdninstagram.com` / `*.fbcdn.net` — blocked.
- `index.html:21784` — Grow "answer" rows call `ceGrowThumbUrl` (`index.html:23611-23624`), which falls back to `ce-still://stills/<sc>` — a custom scheme only the native app's URL handler resolves; in a browser it is a dead URL.

The local fallback can't save it either: `__CE_IG_STILLS__` is read at `index.html:7493, 7504, 7536, 23615` but **nothing ever fetches `ig-stills-index.json`** (no reference in any served JS). The 160 KB file is dead payload — compare `likes-index.json`, which got exactly this fix at `index.html:3194-3207`. Consequence chain: `cePoemHasOriginalStill`/`ceContentHasStill` (`index.html:7502-7559`) always return false on web → the "Original Instagram post" thumbnail (`index.html:17615-17635`) never appears on the phone.

- **User sees:** broken-image chips in Grow's audience/answer rows whenever Meta insights are live; photo poems never offer the original-still option.
- **Minimal fix (upstream):** fetch `./ig-stills-index.json` at boot the same way `likes-index.json` is fetched (mirror `index.html:3194-3207`), and either add Meta's CDN hosts to `img-src` or route thumbs through a same-origin proxy/`__CE_STILL_BASE__` that serves over HTTPS.

### 2. MEDIUM — ~15.8 MB of JavaScript is loaded synchronously, parser-blocking

All 8 external scripts are plain `<script src>` with no `defer`/`async` and no preload hints:

- `index.html:3169-3171` — `content_data.js` (8.93 MB), `deck_index.js` (1.18 MB), `ideas_catalog.js` (0.66 MB)
- `index.html:3231` — `ce-touch-edit.js`, `index.html:3297` — `share-decks.js` (4.02 MB), `index.html:3822` — `native-ideas.js`, `index.html:3857-3858` — `ce-insights.js`, `renderers.js` (0.88 MB)

The boot cover (`index.html:2761-2766`) is parsed before them, but a stalled download of `content_data.js` still delays first paint and the 8 s hydration-timeout clock (`index.html:26651-26655`) starts only after everything parses. On cellular this is the single largest phone cost — roughly 4 MB gzipped of JS before interactivity.

- **User sees:** the "Loading library…" cover for several seconds on cold cellular loads; the honest-failure timer can't even start while a slow script stalls the parser.
- **Minimal fix:** mark the data scripts `defer` **and** move the missing-bundle assertion (`index.html:3179-3220`) and hydration into a deferred/`DOMContentLoaded` path — `defer` alone breaks it, because the inline validator reads `ALL_CONTENT_DATA` synchronously at parse time. Order is preserved among deferred scripts, so `ce-touch-edit.js` → `share-decks.js` → the rest can all defer safely once the validator moves.

### 3. MEDIUM — a touch edit made in the last 500 ms before the page is backgrounded can be lost silently

`ce-touch-edit.js:104-109` — `scheduleCommit` arms a 500 ms `commitTimer`; the only flush paths are the timer firing and `blur` (`ce-touch-edit.js:111-114`). iOS suspends a backgrounded tab without firing either reliably, and the page's own `visibilitychange`/`pagehide` savers only flush the *Studio* autosave (`index.html:26742` checks `state.studioAutoSaveTimer`; `index.html:26814-26826` runs `studioFlushAutoSaveNow`) — the touch-edit timer is a different module's state and is never flushed. Phone users background constantly mid-gesture.

- **User sees:** type a fix, tap Home inside the 500 ms window, iOS kills/suspends the tab → reload shows the pre-edit text. No error, no queued record — the write never reached `ce_deck_edits`.
- **Minimal fix:** in `ce-touch-edit.js`, add `visibilitychange`/`pagehide` handlers that synchronously run `commit()` for any element with armed `commitTimer`/`__cePendingText` (same pattern as `studioFlushAutoSaveNow` at `index.html:17019-17044`).

### 4. MEDIUM — `touch-action:none` is permanent on every armed text block, so swipes starting on a poem can't scroll

`ce-touch-edit.js:37` — `el.style.touchAction = 'none'` is set when the block is armed and never restored. Armed blocks are exactly the big text areas (`[data-ce-block="content"|"hook"|"body"]`, `.kickline`, `#studio-editable-text`, line 33) that cover most of a canvas card. Combined with the 430 ms long-press (`ce-touch-edit.js:18, 47-61`), a scroll gesture that starts on text is captured by the edit layer. (R44 M2, still present — confirmed unchanged.)

- **User sees:** inside Studio on a phone, swiping up on the poem/deck text does nothing; doing it slowly triggers edit mode + haptic.
- **Minimal fix:** use `touch-action: pan-y` on armed blocks and switch to `none` only while a long-press/drag is actually active; restore on `pointerup`/`pointercancel`/blur.

### 5. MEDIUM — the schedule sheet keeps polling the Mac for up to 20 minutes after the sheet is closed

`ce-touch-edit.js:884-899` — `ceScheduleWatch` re-arms itself with `setTimeout(tick, …)` until `MAX_MS` (20 min). `closeSheet()` (`ce-touch-edit.js:1038-1043`) removes the DOM node and the keydown listener but sets no stop flag; `tick` keeps fetching `/schedule-requests` (`ce-touch-edit.js:872-883, 929-939`) and writing `textContent` to a detached `statusEl`.

- **User sees:** nothing on screen — the cost is background radio/battery and a `onDone` chain that fires into dead UI. On a metered connection it's ~80–300 extra requests per closed sheet.
- **Minimal fix:** set `sheet.__ceWatchStopped = true` in `closeSheet()` and bail out of `tick`/`keepWatching` when it's set (or when `statusEl.isConnected === false`).

### 6. LOW — a successful push still counts as "waiting," so recovery toasts overstate for up to a minute

`ce-touch-edit.js:625-627` — the push success branch calls `markReachable()` and recounts, but never records the record in `ce_deck_synced_at`. Only the pull path (`ce-touch-edit.js:771-778`) and the drain (`ce-touch-edit.js:682-685`) write that map. So right after the server accepts an edit, `countUnsyncedEdits()` (`ce-touch-edit.js:638-648`) still counts it → when recovering from an outage, `markReachable` (`ce-touch-edit.js:296-302`) toasts "N edits still waiting for your Mac" about edits that just landed, and `__CE_SYNC_UNREACHABLE__` stays set until the next pull (≤ 60 s, `ce-touch-edit.js:816`).

- **User sees:** "1 edit still waiting for your Mac" immediately after a write that succeeded; clears itself within a minute. Cosmetic honesty gap, not data loss — the record is on the server.
- **Minimal fix:** in the `'ok'` branch of `pushDeckEdit`, write `synced[deckId] = record.updatedAt` to `ce_deck_synced_at` exactly as `drainUnsyncedEdits` does at `ce-touch-edit.js:682-685`.

### 7. LOW — the two-finger back gesture never clears on `touchcancel`, so a cancelled gesture becomes a phantom back on the next tap

`index.html:17592-17606` — `touchstart` records `touchStart` only when `touches.length === 2`; `touchend` consumes and clears it. There is **no `touchcancel` listener** — a two-finger gesture interrupted by an OS event (incoming call, Control Center pull, app switch) leaves `touchStart` non-null. The next ordinary tap's `touchend` then computes `dx` against the stale origin; if the tap lands >70 px to its right, `appNavigateBack()` fires on a plain tap. Note the contrast: the one-finger edge gesture in the same file family *does* reset on cancel (`ce-touch-edit.js:257-259`).

- **User sees:** rarely, a random tap jumps back a surface right after an interrupted two-finger touch.
- **Minimal fix:** add `document.addEventListener('touchcancel', function(){ touchStart = null; }, { passive:true })` and also null `touchStart` when `touches.length !== 2` in the existing `touchstart`.

### 8. LOW — sidebar sub-nav rows are 36–40 px tall on the phone, under the 44 px touch floor

`ce-mobile.css:532-533` — `html.ce-phone #sidebar .nav-sub-btn { min-height:40px }` and `.nav-nest-btn { min-height:36px }`. The generic coarse-pointer floor (`ce-mobile.css:364-366`, `.nav-nest-btn { min-height:44px }`) loses on specificity to the `#sidebar`-scoped rules. These rows (poem-era filters, nested nav) are real touch targets inside the phone drawer.

- **User sees:** dense 36 px rows in the drawer — misses and fat-finger taps on adjacent rows.
- **Minimal fix:** raise both to 44 px under `html.ce-phone`; keep the visual rhythm with padding as the file's own comment at `ce-mobile.css:205-207` prescribes.

### 9. LOW — the phone long-press on a poem bypasses `poemBeginTextEdit()`, so the edit misses undo history and editing chrome

`ce-touch-edit.js:51-60` sets `contenteditable` directly and snapshots into `el.__ceTouchBefore` — a field **nothing ever reads** (set at line 60, no other reference). It never calls `poemBeginTextEdit()` (`index.html:13874-13887`), so `state.studioPoemEditing` stays false: `poemFinishTextEdit()` no-ops on blur (`index.html:13889-13890`), `studioPoemEditBefore` is never captured, and no `studioCommitHistory('Edit poem text', …)` runs — the touch edit can't be undone. The text itself still saves (the node's own `input` handler captures the draft at `index.html:14267-14272`, and the commit writes through `studioPoemDeck` at `index.html:10950-10978`), and drags are still suppressed by the `[contenteditable="true"]` guard at `index.html:14307`. R44's C1 (poem commits silently dropped) is fixed — this is the residual.

- **User sees:** a phone-edited poem can't be undone via the Studio undo; the text box never shows its `is-editing` state during a touch edit.
- **Minimal fix:** in the long-press branch, when `el.id === 'studio-editable-text'` call `window.poemBeginTextEdit()` (exported if needed) instead of setting `contenteditable` bare; or consume `__ceTouchBefore` into `studioCommitHistory` on commit.

### 10. LOW — `applyLocalEdits()` runs at script-eval time, before `share-decks.js` defines `__CE_FULL_DECKS__`

`ce-touch-edit.js:716` runs at eval; the script tag sits at `index.html:3231` while `share-decks.js` loads at `index.html:3297`. The `known` set (`ce-touch-edit.js:703-705`) therefore contains only `__STATIC_DECK_INDEX__` ids at boot, and unknown ids are deleted **and persisted** (`ce-touch-edit.js:709, 713-714`). If the generator ever emits a deck present in the full payload but absent from the static index, its queued phone edits are purged before their deck exists. (Likely zero-impact today if `deck_index.js` covers every deck — the second call inside `openStudio`, `ce-touch-edit.js:1346`, runs too late to un-delete.)

- **User sees:** potentially none today; a latent purge edge.
- **Minimal fix:** defer the first `applyLocalEdits()` to `DOMContentLoaded` (or guard the delete branch until `__CE_FULL_DECKS__` exists).

### 11. LOW — document-level non-passive `touchmove` taxes every scroll

`ce-touch-edit.js:213` — the edge-swipe `touchmove` is `{ passive: false }` on `document` so it can `preventDefault()` at line 222. Every scroll on the page now waits on a main-thread dispatch per move event. The handler early-returns quickly, but on low-end phones this is measurable input latency. The wheel handler at `index.html:17590` is also `{ passive: false }`, but wheels don't occur on touch.

- **Minimal fix:** attach the non-passive `touchmove` only while `edgeStart` is armed (inside the existing `touchstart`), and remove it on `touchend`/`touchcancel`.

### 12. LOW — two duplicate `ce-phone` classifier blocks

`index.html:3263-3272` and `index.html:3320-3335` both compute the same predicate (`narrowLayout || (!ipadLike && physicalSmall && coarsePointer)`) and both re-apply on `resize`/`orientationchange`; the second adds the `?cephone=` override. Benign today (identical outputs, last writer wins) but they can drift — R44's L2 stands.

- **Minimal fix:** keep the `forced`-aware copy and delete the first.

### 13. LOW — waitlist pages omit `-webkit-text-size-adjust`

`waitlist.html`/`ab2-waitlist.html` set `viewport-fit=cover` (line 5) but no `text-size-adjust`; the app pins it at `index.html:319`. The waitlists' 11 px `--fs-micro` labels (`waitlist.html:42`) can auto-inflate in iOS landscape.

- **Minimal fix:** add `html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }` to the waitlist stylesheet.

---

## Sync & persistence — what the user actually sees

- **Write/push fails or times out (Mac away, tunnel down):** every write races a 15 s cap (`ce-touch-edit.js:550-579`); on failure `markUnreachable` sets `__CE_SYNC_UNREACHABLE__`, records the cause in `localStorage ce_last_sync_error`, and toasts **once per outage** — "Mac unreachable — N edits queued" or "Mac unreachable — open in Safari or use Download-for-phone" (`ce-touch-edit.js:271-285`). The edit is already in `ce_deck_edits` (`ce-touch-edit.js:472-479`) and drains oldest-first on the next successful pull (`ce-touch-edit.js:656-689`, called at line 780). Nothing silent.
- **Pull times out:** `AbortController` + 15 s (`ce-touch-edit.js:754-757`); the abort lands in `.catch` and is named `pull-timeout` (`ce-touch-edit.js:805-808`). After 3 consecutive failures the cached endpoint is cleared, re-discovery runs, and the toast says "Mac still unreachable — showing your last synced copy" (`ce-touch-edit.js:723-736`).
- **Device goes offline mid-edit:** the commit writes `localStorage` first, then pushes only if an endpoint exists (`ce-touch-edit.js:479-520`); the failed push takes the same `markUnreachable` path, so the user gets the queued-edits toast and the record waits. The exception is finding 3 — the 500 ms debounce window.
- **Server has a newer copy (LWW loss):** `stale` responses mark unreachable with `edit-superseded-by-newer-remote-copy` and stay queued (`ce-touch-edit.js:620-623`) — surfaced, not silent.
- **localStorage full/blocked:** `__CE_PERSIST_DECK_EDIT__` catches the throw, records `__CE_PERSIST_LAST_ERROR__ = 'localstorage-write-failed @ …'` and toasts "Edit kept in memory only — storage full; it will not survive a reload (…)" once per episode (`ce-touch-edit.js:478-501`). Verified present — this is the persist-cause surfacing the prior session added, and it works.
- **The 15 s pull timeout is verified** at `ce-touch-edit.js:754-757` (arm) and `805-810` (AbortError → `pull-timeout` → unreachable path). Both prior-session additions are in place.

## Touch & gesture layer

- Arming: `ce-touch-edit.js:24-37` — only the active stage's text blocks; `touch-action:none` (finding 4). Long-press 430 ms (`:18, 47-61`), pointer-based, mouse excluded (`:43`), cancel paths on `pointermove >12px` (`:64-70`), `pointercancel` (`:71`), `pointerup` (`:73-75`) — the per-element gesture state cannot strand.
- One-finger left-edge back: `ce-touch-edit.js:206-259` — passive `touchstart` (`:212`), non-passive `touchmove` with `preventDefault` only after a >40 px horizontal edge swipe (`:213-222`), and `edgeStart` reset on both `touchend` **and `touchcancel`** (`:257-259`). Correct.
- Two-finger back: `index.html:17592-17606` — passive handlers, but **no `touchcancel`** (finding 7).
- Document non-passive `touchmove`: `ce-touch-edit.js:213` (finding 11).
- Blocked scrolling: only via the permanent `touch-action:none` (finding 4); the edge handler itself is correctly scoped to the left 24 px (`ce-touch-edit.js:200-211`) and bails on >60 px vertical drift (`:217-218`).

## Phone CSS checklist (`index.html` + every stylesheet)

| Check | Result |
|---|---|
| 44 px targets | Contract list `ce-mobile.css:2077-2105`; ideas coarse override `native-ideas.css:41-43`; download-pack `ce-mobile.css:243-245`. **Gaps:** sidebar sub/nest rows 40/36 px (finding 8); base `.ce-ideas-filter` stays 38 px off-phone (`native-ideas.css:30`). |
| Safe-area | `viewport-fit=cover` (`index.html:5`); ~50 `env(safe-area-inset-*)` rules in `ce-mobile.css` — topbar (`:390-395`), body bottom (`:690-691`), drawer (`:2046-2048`), modals + sched-sheet (`:2049-2068`), toast stack (`:3200, 3214-3219`). |
| Scroll containment | Drawer scrolls internally (`ce-mobile.css:539-543`); sheets/modals `overflow-y:auto` (`:2057-2068`); kanban is intentional horizontal `scroll-snap` (`native-plan.css:1147`). |
| Horizontal overflow @360/390 | No fixed-width element over 390 px found outside the transform-scaled 1080 px canvas artboards (`native-studio.css:1037, 2150`) — intentional. Static check only; no runtime measurement. |
| Fixed vs keyboard | Toast stack is dock-aware and re-measures on `visualViewport.resize` (`index.html:22843-22858`). `#ce-sched-sheet` gets `max-height:100dvh; overflow-y:auto` (`ce-mobile.css:2064-2068`) — on iOS <15.4 `dvh` is dropped, so the sheet can still tuck under the keyboard on short screens; minor. |
| Focus-zoom font size | All `input/select/textarea` → 17 px on phone (`ce-mobile.css:530`, media twin `:202-204`) — over the 16 px iOS threshold. Waitlist inputs are 16 px (`waitlist.html:145`). |
| `-webkit-text-size-adjust` | Present: `index.html:319`. **Absent on both waitlist pages** (finding 13). |

## Accessibility

- Headings: single visually-hidden `h1` (`index.html:2819`), `h2`/`h3` for panels — reasonable order.
- Focus: schedule sheet is `role="dialog" aria-modal` with a Tab trap, focus-in, Escape, and focus return (`ce-touch-edit.js:986-988, 1021-1049`); idea modal identical plus backdrop close (`native-ideas.js:350-383`) and returns focus to the opener (`:371`); poem reader modal at `index.html:8826-8843` traps focus.
- Sidebar: `inert` when collapsed (`index.html:25676-25680`), `aria-expanded` synced via MutationObserver (`index.html:25842-25847`), Escape closes (`index.html:25849-25853`).
- Live regions: toast stack `role="region" aria-live="polite"` (`index.html:22905-22908`); boot cover `aria-live` polite→assertive on failure (`index.html:3215, 4426`); schedule status `role="status"` (`ce-touch-edit.js:1015`); waitlist errors `role="alert"` (`waitlist.html:346, 352`).
- Reduced motion: universal kill (`index.html:336-357`), boot-spinner pulse fallback (`index.html:2773-2775`), waitlist equivalent (`waitlist.html:309-313`).
- Reachability: nav/filmstrip/dialog controls are real buttons with Enter/Space parity (`index.html:13243-13335`); no `user-scalable=no` — pinch zoom preserved (`index.html:5`).

## Loading / empty / error per surface

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Boot | Spinner + "Loading library…" (`index.html:2761-2766`), live ticker (`:26657-26661`), 6 s veil safety net (`ce-touch-edit.js:179-180`) | n/a | 8 s hydration timeout (`index.html:26651-26655`), missing-bundle assert (`:3179-3220`), `__CE_SHOW_BOOT_FAILURE__` (`:4413-4441`) |
| Library shelves | boot-covered | `renderNativeEmptyState` w/ CTAs (`index.html:8784-8791`; poems `:19258`, carousels `:19496`, posts `:19691`) | bundle assert above |
| Ideas | synchronous render from `__HTML_IDEAS__` (no async gap) | "No ideas match these filters…" with remedy (`native-ideas.js:495`) | schedule-modal `role="alert"` error persists (`native-ideas.js:356, 417-419`) |
| Plan | sync render | `is-empty` kanban (`index.html:20876`), disabled states w/ `aria-description` (`:21040-21041, 22423`) | toast-level |
| Saved Bank | sync render | unpaired state offers "Pair this device" → `__CE_ENSURE_WRITE_KEY__` (`ce-touch-edit.js:462-465`) | persist failures surfaced via `cePersistOrWarn` (`index.html:6043-6049`) |
| Grow / Audience | shimmer + "Syncing live Meta insights…" (`index.html:8455`) | unmeasured lanes (`index.html:21762`), "Not synced yet" (`:8484`) | `is-error` + "Retry sync" (`index.html:8457-8459`) |
| Queue previews | "Loading saved carousel…" shell (`index.html:7395`) + IntersectionObserver hydration (`:7399-7404`) | fallback preview | — |
| Schedule sheet | "Sending to your Mac…" (`ce-touch-edit.js:1090`) | "All clear…" (`:855`) | every engine state named + Retry (`:929-970, 906-928`) |
| Waitlist pages | "Opening WhatsApp…" busy state (`waitlist.html:552-555`) | n/a | field errors `role="alert"`, 1.4 s success card + `wl-retry` link (`:513-540, 556-569`) |

## Performance

| Category | Bytes |
|---|---|
| JS (8 files) | 15,827,254 |
| `index.html` | 1,640,465 |
| CSS (7 files; `renderers.css` is not referenced) | 1,609,301 |
| Images | 1,448,174 |
| Fonts | 1,197,984 |
| JSON | 991,284 |
| **Total served** | **≈ 22.7 MB** (~4.4 MB gzipped on the main path) |

- Largest file: `content_data.js` — 8,926,236 B (≈1.62 MB gzip). All scripts synchronous (finding 2).
- Fonts: all 18 `@font-face` declare `font-display:swap` (`index.html:31-55`) — no invisible-text risk.
- Images: every emitted `<img>` lives in a fixed-size CSS box — `.ce-aud-thumb` 44 px (`index.html:2265-2266`), `.ce-ans-thumb` 40→36 px (`index.html:2581-2582, 2712`), `.ce-queue-raster` fills its shell (`native-plan.css:27`) — no intrinsic-size CLS. `photo-designs/*.jpeg` are on-demand CSS backgrounds (`index.html:17622`), not upfront.
- Dead weight: `legacy-renderers/renderers.css` (509 KB, unreferenced) and `ig-stills-index.json` (160 KB, shipped but never fetched — finding 1).

## What is already good — do not touch

- The error-honesty architecture: `cePersistOrWarn` wraps every localStorage write (`index.html:6043-6049`, ~60 call sites), `__CE_SHOW_BOOT_FAILURE__` forces a visible failure cover (`index.html:4413-4441`), and the adopt-before-write merge (`index.html:6068-6091`) prevents cross-window store clobbering.
- The toast stack: bounded queue, dedupe, dock-aware positioning via measured `getBoundingClientRect` + `visualViewport` (`index.html:22843-22908`, `ce-mobile.css:3197-3219`).
- The sync queue: unsynced count recomputed from the store, drain on proven reachability, one-toast-per-outage latch, 15 s caps on both read and write (`ce-touch-edit.js:271-311, 550-579, 638-689, 754-811`).
- Phone typography contract: 17 px inputs kill iOS focus-zoom, `-webkit-text-size-adjust` pinned, bundled Mukta now leads `--font-deva` (`ce-mobile.css:2400-2402`), safe-area coverage is comprehensive.
- Both waitlist pages (newly rewritten, audited as-is): self-hosted fonts with `font-display:swap`, real `<label>`s, `inputmode="tel"`/`autocomplete="tel"`, `role="alert"` errors that persist, 52 px CTA, pending→success→retry flow, reduced-motion handling. Solid.
- The schedule reconciliation loop (sheet watches the real relay row, names every state, offers the server's retry door) — just needs the stop flag from finding 5.
- Dialog discipline: every sheet/modal checked traps focus, honors Escape, and returns focus to its opener.

## Limitations

- No runtime or device measurement was performed — no real 360/390 px overflow test, no keyboard-open screenshots, no scroll-latency profiling. Findings 4, 5, and 11 are static-analysis calls that deserve a device pass.
- Whether finding 10 can fire depends on generator behavior (whether `deck_index.js` always covers `share-decks.js` ids) — that contract lives upstream.
- `git status` in this worktree was clean; the "uncommitted" status of the waitlist files is per the delegation brief — audited as-is either way.
