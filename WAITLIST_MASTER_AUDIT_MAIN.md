# WAITLIST_MASTER_AUDIT_MAIN — `waitlist.html` (Gus, read-only)

Date: 2026-09-23 · Repo: `/Users/tushar/Documents/ChatGPT/Builds/content-review-pages`
Served: `python3 -m http.server 8832` (repo root) · Playwright chromium via
`content-engine-macos/qa/node_modules/playwright` · Scratch `/tmp/wl-main/`
Screenshots: `WAITLIST_MASTER_SHOTS/main/` (30 PNGs)
Prior reads: `WAITLIST_AUDIT_2026-09-23.md`, `WAITLIST_RECOVERY_AUDIT_2026-09-23.md`
Truth: `/Users/tushar/Desktop/AB2-WEBSITES-10/reference/OFFER.md`

**Headline.** The page has moved on from the prior audit and most of its P0s are now
VERIFIED-ALREADY (live bubble, outgoing bubble, one-line button, balanced HTML, trimmed
reassurance). Two real defects remain: a **fabricated scale claim** ("a quarter million
readers") that OFFER.md does not support, and **no numeric sanity check** on the phone
field, so garbage digits submit. Plus one numeric understatement ("15-hour" vs OFFER's
"15+").

---

## Findings

| id | severity | viewport | observed | screenshot | file:line | exact fix |
|---|---|---|---|---|---|---|
| F-01 | **P1** | all | **Unsupported claim.** "Tushar writes poetry to a quarter million readers." No follower/reader figure exists in OFFER.md; the only counted audience figure there is *1,000+ students taught*. This is the one line that asserts reach the offer contract cannot back. | `wl-768-full.png` | `waitlist.html:482` | Replace with a sourced figure or drop the clause: `Tushar has taught 5 live batches to 1,000+ students.` (If a real reader count is wanted, add it to OFFER.md first, then quote it.) |
| F-02 | **P1** | 320, 390 | **No numeric sanity on the phone field.** `0000000000` (10 digits, all zeros) passes `validate()`, the form submits, and WhatsApp opens. `[0-9]{10,13}` is the only rule; no `^0` guard, no rejection of repeated-zero or obviously-fake numbers. Garbage leads are handed off. | `wl-320-num-error.png` | `waitlist.html:662-668` (validate), `:440` (input) | Add a cheap guard before accept: reject when the digits are all zeros / fewer than 6 non-zero digits; show the existing `#wlNumErr` string. Do not tighten the digit-count (spaced `91 98765-43210` must still normalise through). |
| F-03 | **P2** | all | **Numeric understatement vs OFFER.** Hero says "A 15-hour recorded course". OFFER.md's product table says **15+ hours** (and the page itself uses "15+" in the meta description, ladder-note `:429`, and teaser `:494`). Two truths on one page. | `wl-390-fold.png` | `waitlist.html:403` | Change to `A 15+ hour recorded course` to match OFFER.md and the page's own other three mentions. |
| F-04 | **P2** | 320 | **Bubble inline element exceeds its container by 8px.** `.wa-bubble` computed `scrollWidth` 246 vs `clientWidth` 238 at 320px (308 vs 300 at 390). The negative-`right:-8px` tail is inside the measured box; text is not clipped visually (page `scrollWidth == clientWidth`, no horizontal overflow) but the element itself is 8px wider than its parent. | `wl-320-join.png`, `wl-390-bubble-zoom.png` | `waitlist.html:223-232` | Give `.wa-bubble` `max-width: calc(100% - 8px)` so the box (tail included) fits the column. Cosmetic; no text loss today. |
| F-05 | **P2** | all | **Reassurance still stated 3×.** "Joining the waitlist is free and nothing is charged" appears in the hero (`:403`), the ladder note (`:430`), and the handoff line (`:446`). U4 wants once per CTA. Down from 6×, but still three whole-clause promises. | `wl-390-full.png` | `waitlist.html:403`, `:430`, `:446` | Keep `:446` (the CTA handoff line); trim the hero and ladder-note copies to the price statement only. |
| F-06 | **P2** | all | **Long caption still names the mechanism.** "Press Send in WhatsApp. This is the message:" plus the success panel's "Nothing was sent from this page." narrate the page's own method (U6). | `wl-390-success.png` | `waitlist.html:458`, `:455` | Optional: trim `:458` to "This is the message:" and `:455` to "Nothing was sent." |
| F-07 | **P2** | — | **No phone dock (record-only).** No dock element exists; both CTAs sit above the fold in the offer/door card, so it reads as deliberate. Flagged only so the choice is on record (U2). | `wl-390-fold.png` | — | None required. If added: cap 64px, "₹999 · first 50 seats" left, "Join waitlist" right, hidden while hero/final CTA visible. |

### Verified-already (prior-audit P0/P1 now fixed — do not redo)

- **Live bubble (was P0-1):** `#wlBubble` is updated on every `input` via `liveBubble()`, and the preview and the payload share one `buildMsg()` (`waitlist.html:631`, `:648-660`). Typed `Tushar` / `919876543210` → bubble == decoded `text=` of the `wa.me` URL, character-for-character (byte-level match, `beh.json`).
- **Outgoing bubble (was P0-3):** right-aligned (`margin: 10px 8px 10px auto`), tail on the **right** (`border-radius: 12px 12px 3px 12px`, `::after` at `right:-8px; bottom:0`), outgoing tint `#dcf8c6`, `now ✓✓` stamp present. Matches WhatsApp's outgoing geometry.
- **One-line button (was P0-2):** label is "Join the waitlist", renders on one line at 320px (52px tall, 246px wide).
- **Balanced HTML (was P2-9):** all tags balanced (`div section span a button label h2 h3 p main footer` deltas 0).
- **Reassurance reduced (was P1-4):** 6× → 3× (see F-05).

### Measured passes

- **Contrast (computed):** all pairs clear floor. Bubble text `#10240f` on `#dcf8c6` = 14.27:1; `--text3` `#918a82` on `#09090c` = 5.83:1; `--gold-dim` `#a08550` on surface = 5.02:1. Button `#09090c` on `#c8a96e` clears large-text. Placeholder `#918a82` on input `#161619` ≥ 4.5.
- **Overflow:** `scrollWidth == clientWidth` at 320 / 390 / 768 / 1440. No off-screen elements. (Element-level 8px noted as F-04.)
- **Safe areas:** `viewport-fit=cover` present; `env(safe-area-inset-*)` used on nav and section padding; `100svh`→`100dvh` fallback present.
- **Focus rings:** `#wlName`, `#wlNum`, `#wlBtn` all show `3px solid rgb(232,213,168)` (`--gold-pale`) with 2–3px offset on `:focus-visible`.
- **Targets:** primary button 52px; retry + inline links `inline-flex` + `min-height:48px`.
- **Validation/error states:** empty name → `#wlNameErr` "Please enter your name so the message can be addressed.", focused, `aria-invalid=true`, `role=alert`, no navigation. Name-only → `#wlNumErr` "Enter your WhatsApp number with country code, 10 to 13 digits…". Letters / `+` / emoji / 14-digit → all rejected, no nav. Errors clear on next input.
- **Preview matches payload (behaviour §4):** across `Tushar`, `Aarav 🌱`, `  Poornima  ` (trimmed), `Ravi 👨‍👩‍👧`, `A` — bubble text == URL-decoded `text=` param every time (`beh.json`, `match:true` ×5). Spaced `91 98765-43210` normalises to `919876543210` and matches.
- **Handoff, not opened:** navigation intercepted; `wa.me/919179222991` correct; success panel `#wlDone` visible with "WhatsApp opened with your waitlist message ready to send."; retry link carries the full URL; button re-enabled.
- **No-JS fallback works:** with `javaScriptEnabled:false` the form is hidden and `#wlFallback` shows a plain `wa.me` link decoded to `[ab2:wl] … Name: (your name) … WhatsApp: (your number) … First 50 seats are ₹999…` — a complete, honest lead path.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, 0 elements carry a running animation; `scroll-behavior:auto`, transitions off.
- **Console/errors:** 0 page errors, 0 console errors at every viewport.

---

## Copy — every visible string

| # | Current | Verdict | Proposed rewrite | Reason |
|---|---|---|---|---|
| 1 | `Aham Brahmasmi 2.0` (nav) | OK | — | Brand + version, correct. |
| 2 | `Waitlist first · first 50 seats at ₹999` | OK | — | Matches OFFER ladder step 1. Sentence case (not caps). |
| 3 | `End the argument with yourself.` | OK | — | Strong promise line, no claim. |
| 4 | `अहम् ब्रह्मास्मि` | OK | — | Devanagari title, `lang="hi"`. |
| 5 | `A 15-hour recorded course…` | **Fix (F-03)** | `A 15+ hour recorded course…` | OFFER says 15+ hours; page contradicts itself. |
| 6 | `Joining the waitlist is free and nothing is charged.` | Trim (F-05) | delete here | 3rd of 3 whole-clause reassurances. |
| 7 | `When doors open, the first 50 seats are ₹999, then the price steps up to ₹1,499, then ₹1,999.` | OK | — | Exact ladder match. |
| 8 | `"Main 3 saal ke liye gayab ho gaya tha…"` | OK | — | Voice quote, no claim. |
| 9 | `The price ladder` (label) | OK | — | 16 chars, sentence case. |
| 10 | `₹999 / first 50` · `₹1,499 / next` · `₹1,999 / final` | OK | — | Matches OFFER exactly. |
| 11 | `opens here` (rung tag) | OK | — | Short, correct. |
| 12 | `Price rises as each block fills, and it does not fall…` | OK | — | Matches OFFER "does not fall". |
| 13 | `Paid once. Access is lifetime. 14 days… no reason asked.` | OK | — | Word-for-word OFFER line. |
| 14 | `15+ hours recorded · 10+ hours on day one · 50+ lessons · the psychology sequence is 5+ hours · companion book · two recorded live sessions` | OK | — | Every figure matches OFFER product table. |
| 15 | `Two recorded live sessions are included at every price. Joining the waitlist costs nothing.` | Trim | keep first sentence | Second sentence is reassurance #2. |
| 16 | `Join the waitlist` (form title + button) | OK | — | Matches OFFER. |
| 17 | `Your name` / `Your WhatsApp number` (labels) | OK | — | Clear, associated via `for=`. |
| 18 | `With country code. The opening notice arrives here.` | OK | — | Useful hint, `aria-describedby`. |
| 19 | `One tap opens WhatsApp with your message ready. You press Send. Joining is free and nothing is charged.` | OK (keep as the one line) | — | This is the surviving handoff reassurance. |
| 20 | `No script needed: this plain link opens WhatsApp with the same message ready.` | OK | — | No-JS fallback note, honest. |
| 21 | `Your message is ready in WhatsApp.` / `WhatsApp opened with your waitlist message ready to send.` | OK | — | Truthful state, no fabricated send. |
| 22 | `Press Send in the chat to join the waitlist. Nothing was sent from this page.` | OK | — | NNR-honest. |
| 23 | `WhatsApp did not open? Tap to try again` | OK | — | Good recovery affordance. |
| 24 | `Press Send in WhatsApp. This is the message:` | OK (minor, F-06) | `This is the message:` | Mild method-narration. |
| 25 | `Prefer Instagram? message @doalfaaz directly` | OK | — | Real handle, real link. |
| 26 | `81% Finished it` / `1,000+ Students taught` / `5 Live batches` | OK | — | All three counted in OFFER. |
| 27 | `81% finished the internal run… the usual completion figure… is about 10%, a quoted norm… 450+ books… a floor, not a count.` | OK | — | Matches OFFER's grading rules exactly — weak figures marked weak. |
| 28 | **`Tushar writes poetry to a quarter million readers.`** | **Fix (F-01)** | `Tushar has taught 5 live batches to 1,000+ students.` | **Not in OFFER.md.** Unbacked scale claim. |
| 29 | `He has also taught 5 live batches to 1,000+ students, and 81% of them finished the internal run.` | OK | — | Counted, matches OFFER. |
| 30 | `Same voice, same honesty: the poems name the feeling, the course does the work underneath it.` | OK | — | Positioning, no claim. |
| 31 | `15+ Hours · 50+ Lessons` (teaser) | OK | — | Matches OFFER. |
| 32 | `Take your time. Faisla shaant dimaag se lena. The first 50 seats are ₹999 and the price steps up after that, so moving early also costs less.` | OK | — | Honest, no false urgency. |
| 33 | `Ready when you are` / `The first 50 seats are ₹999. Paid once, access is lifetime.` | OK | — | Matches OFFER. |
| 34 | `Aham Brahmasmi 2.0 · Do Alfaaz · Banaras` / `Ye therapy nahi, religion nahi, motivation nahi. Ye inquiry hai.` | OK | — | Identity footer, no claim. |
| 35 | `<meta description>` / `og:description` | OK | — | "15+ hours… ₹999… ₹1,499… ₹1,999… 14-day refund" — matches OFFER. |

**Claims beyond OFFER.md:** one — F-01 ("quarter million readers"), `waitlist.html:482`.
Everything else (prices, ladder mechanics, 81%, 1,000+, 5 batches, 450+ floor, 10% norm,
15+/10+/50+/5+ hours, lifetime, 14-day refund, two recorded sessions) is either verbatim
from OFFER.md or an explicitly-graded soft figure. No forbidden phrase present (no
"single price", "no tiers", "no deadline", "no upsell").

**Waitlist-reserves-nothing check:** no string on the page implies a reserved seat or an
exclusive session. The page says the waitlist produces a WhatsApp message and a door
notice only — consistent with the offer contract.

---

## Screenshot index — `WAITLIST_MASTER_SHOTS/main/`

| File | What it shows |
|---|---|
| `wl-320-fold.png` / `wl-390-fold.png` / `wl-768-fold.png` / `wl-1440-fold.png` | Above-the-fold at each width |
| `wl-320-full.png` / `wl-390-full.png` / `wl-768-full.png` / `wl-1440-full.png` | Full page |
| `wl-320-join.png` / `wl-390-join.png` / `wl-768-join.png` / `wl-1440-join.png` | Join section, fields + live bubble |
| `wl-320-empty-error.png`, `wl-390-empty-error.png`, `wl-*-empty-error-join.png` | Empty-submit error states |
| `wl-320-num-error.png`, `wl-390-num-error.png`, `wl-*-num-error-join.png` | Invalid-number error states |
| `wl-390-focus.png` | Focus ring on field |
| `wl-390-bubble-zoom.png`, `wl-390-tail-corner.png` | Bubble tail geometry, close up |
| `wl-390-nojs.png`, `wl-390-nojs-join.png` | JS-off fallback link |
| `wl-390-reduced-motion.png` | Reduced-motion rendering |
| `wl-390-success.png`, `wl-390-success-join.png`, `wl-390-success-full.png` | Post-submit success panel |

---

## Unfinished / blockers

None. Read-only respected: no repo file was edited except this report; screenshots written
only under `WAITLIST_MASTER_SHOTS/main/`; scratch data under `/tmp/wl-main/`.
F-01 is the item that needs an owner decision (supply a real reader figure or drop the
clause) — it is the only finding that cannot be fixed from OFFER.md alone.
