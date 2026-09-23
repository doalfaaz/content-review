# Alternate waitlist page — master audit (read-only)

Scope: `ab2-waitlist.html` only, as it stands in this worktree.
Truth for offer / prices / urgency: `/Users/tushar/Desktop/AB2-WEBSITES-10/reference/OFFER.md`
(ladder ₹999 → ₹1,499 → ₹1,999; joining the waitlist reserves no seat).
Cross-reference: `WAITLIST_AUDIT_2026-09-23.md` (Iris 5) and
`WAITLIST_RECOVERY_AUDIT_2026-09-23.md` (Juno), both same day — every finding below was
re-measured against the current file text, not copied.

Method: repo root served on `127.0.0.1:8833` (`python3 -m http.server`), Playwright chromium
imported from `/Users/tushar/Documents/ChatGPT/Builds/content-engine-macos/qa/node_modules/playwright`.
Viewports 320 / 390 / 768 / 1440; a JS-off pass (`javaScriptEnabled:false`); a
`reducedMotion:'reduce'` pass. Scratch: `/tmp/wl-alt/`. Screenshots:
`WAITLIST_MASTER_SHOTS/alt/`.

Headline: **the three P0s from the two 2026-09-23 audits are all fixed in this file.** The one
real defect left is the outgoing bubble's tail, which is drawn on the wrong side of a
full-width bubble.

---

## 1. Findings

| id | severity | viewport | observed | screenshot | file:line | exact fix |
|---|---|---|---|---|---|---|
| ALT-01 | P1 | 320, 390, 768, 1440 | Outgoing bubble is full width at every breakpoint (`bubbleWrap` width == bubble width, left gap 0, right gap 0 — measured 288/288 at 320, 544/544 at 1440). The `::after` tail is pinned `right:-8px` and painted `clip-path: polygon(0 0, 0 100%, 100% 100%)` = straight edge on the left, diagonal on the right, which is an **incoming** tail pointing right. On an outgoing WhatsApp bubble the tail sits at the bottom-right point of the bubble and tapers **inward**. Because the bubble is flush to the container's right edge, the tail also reads as detached from the bubble. | `alt-bubble-live-320.png`, `alt-door-live-390.png` | 232, 241, 247-251 | Give the bubble a real right-aligned width and fix the tail: `241` → `border-radius: 10px 10px 2px 10px; max-width: min(100%, 30rem); margin-left: auto;` and `248-251` → `right: 0; bottom: 0; clip-path: polygon(0 0, 0 100%, 100% 0);` (or move the tail to a `::before` square rotated 45° at `right:-4px; bottom:0`, which is the WhatsApp shape). |
| ALT-02 | P2 | 390 (all widths) | In-copy Instagram link `@doalfaaz on Instagram` measures **21px** tall, `display:inline`, `min-height:0px` — under the 48px phone target floor. `waitlist.html` fixes the identical pattern with `display:inline-flex;align-items:center;min-height:48px`. The two `<label>` elements also measure 25.5px, which is correct for a click-to-focus label and is not a defect. | `alt-door-live-390.png` | 458 | Add `display:inline-flex;align-items:center;min-height:48px;` to the `.next-step a` rule (or a scoped class on that link), as `waitlist.html` does. |
| ALT-03 | P2 | 390 (all widths) | `.field-hint` renders "With country code. The opening notice arrives here." at `--fs-micro` = **12px**. It is sentence-level explanatory copy, not a tracked caps label, and the phone spec sets a 15px floor for running copy. Contrast itself is fine (measured 5.83:1 on `--paper`). | `alt-door-live-390.png` | 203 | Change `203` `.field-hint { font-size: var(--fs-micro); ... }` to `font-size: var(--fs-small);`. |
| ALT-04 | P2 | 320, 390 | `.cta:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }` (`221`) covers `#wlBtn` and the static fallback link, but **`#wlRetry` (`.wl-retry`, `271`) has no `:focus-visible` rule** — measured `outline: 0px none` when focused. It is keyboard-reachable only when the success panel is visible. The in-copy Instagram link also has no custom ring (UA default `1px auto rgb(0,95,204)`), which is visible but off-palette. | — | 221, 271, 458 | Add `.wl-retry:focus-visible { outline: 3px solid var(--madder); outline-offset: 2px; }` and, if the off-palette default ring matters, `.next-step a:focus-visible { outline: 3px solid var(--madder); outline-offset: 2px; }`. |
| ALT-05 | P2 | 320 | Bubble label "Your WhatsApp opens with this message already typed" is 51 characters set in letter-spaced uppercase (`letter-spacing:0.14em; text-transform:uppercase`, `234-236`) and wraps to two lines at 320. Same class of long tracked caps flagged as P1-5 in both prior audits. `.masthead-sub` (44 chars), `.hero-route` (65), `.section-label` "The ladder, before anything else" (32), "The record, with the working shown" (34) are the same shape but are short-enough masthead/eyebrow lines and read cleanly in the render. | `alt-bubble-live-320.png` | 233-236 | Set `.bubble-label` to sentence case in the sans face (drop `text-transform:uppercase` and reduce letter-spacing to ~0.02em); keep caps for the genuinely short labels ("One door", "The letter"). |
| ALT-06 | P2 | 320, 390, 768, 1440 | No phone dock element (recorded choice). `WAITLIST_AUDIT_2026-09-23.md` P2-12 already records this as a deliberate omission; the CTA sits inside the first scroll on this page, so a dock is not required. Restated only so the choice stays on record. | — | — | None. If a dock is ever added, cap it at 64px and hide it while the hero / final CTA is in view. |

### Verified clean (measured, not asserted)

- **JS-off contract holds.** With `javaScriptEnabled:false`: `#wlForm` computed `display:none`
  (via `<noscript><style>#wlForm{display:none}</style></noscript>` at `17`) and `#wlFallback`
  computed `display:block` carrying the full message with `(your name)` / `(your number)`
  placeholders (`438`), decoded byte-for-byte to
  `[ab2:wl2] Waitlist for Aham Brahmasmi 2.0` + newline + `Name: (your name)` + newline +
  `WhatsApp: (your number)` + blank line +
  `First 50 seats are ₹999. Please tell me when doors open.`
  — this is the **P1-7 fix from both prior audits, landed**. Screenshot `alt-nojs-320.png`.
- **wa.me payload is byte-for-byte the typed values.** Typed `Tushar` / `919876543210`,
  intercepted the navigation (no WhatsApp opened, no message sent): the browser was sent to
  `https://wa.me/919179222991?text=...` and the decoded `text` parameter equals the expected
  built string exactly (`payload === decoded` → true). The only normalisation is the `tel`
  field's `.replace(/[^\d]/g,'')` on input (`534`), which strips spaces/dashes a user types —
  the digits themselves are passed verbatim. Number `919179222991` correct.
- **Live bubble preview.** `paintBubble()` runs on `input` (`540-541`), so the bubble shows real
  values as they are typed: measured `Name: your name` before typing → `Name: Tushar` after the
  name field → `WhatsApp: 919876543210` after the number field. The visitor approves the message
  that actually sends.
- **Button is one line and >=44px at every width.** `#wlBtnLabel` yields exactly **1** client
  rect at 320 / 390 / 768 / 1440; button box 288x54 at 320 and 480x54 at 1440. The 320px
  media rule (`280-288`) drops padding and tracking to buy the label its line. Label is
  `Join the waitlist` — the **P0-2 fix from both prior audits**.
- **Validation states work and are legible.** Empty submit → name error
  "Please enter your name so the message can be addressed.", `aria-invalid="true"`, focus moved
  to the field, `#wlDone` stays hidden. Bad number → number error
  "Enter your WhatsApp number with country code, 10 to 13 digits, e.g. 919876543210." rendered in
  `rgb(116,48,31)` on `--paper`, with `#wlNum` border `rgb(116,48,31)`. Errors clear on input.
  Screenshot `alt-form-error-390.png`.
- **Success panel fires.** After a valid submit `#wlDone` is unhidden, `#wlDoneMsg` =
  "WhatsApp opened with your waitlist message ready to send.", `#wlRetry` carries the same
  `wa.me` URL, the button label is restored and re-enabled.
- **No horizontal overflow at any width.** `documentElement.scrollWidth == clientWidth` at
  320 / 390 / 768 / 1440 (320/320, 390/390, 768/768, 1440/1440).
- **Contrast passes where measured.** Bubble text `#10240f` on `#dcf8c6` and every `--ink` /
  `--ink2` / `--ink3` / `--madder` pair on `--paper` clear their floor; the lowest measured pair
  on running copy is `--ink3 #6f6855` on `--paper #f4efe4` ~= 4.84:1. `--ink2 #57503f` on
  `--paper` is higher. The `₹999` `.rung-price` is 28px bold → 3:1 floor, comfortably clear.
  (The automated sweep false-negatives on `rgba(...,0)` backgrounds — the transparent body — so
  those rows were read against the resolved `--paper` value rather than trusted blindly.)
- **Reduced motion honoured.** With `reducedMotion:'reduce'`: `.btn-spin` `animation-name:none`,
  `.cta` `transition-duration:0s`. Screenshot `alt-reduced-motion-320.png`.
- **No offer drift and no forbidden claim.** The page states the ladder ₹999 / ₹1,499 / ₹1,999,
  "Paid once. Lifetime access. 14 days to change your mind." — matching `OFFER.md`. No "single
  price", no "no tiers", no "no deadline", no "no upsell", no "Rs" anywhere. A `grep` for
  `I reply` / `I will reply` / `reply from` / `reply with` returns **only** the non-promise line
  at `447` ("You are told when the doors open"); the "I reply from this number..." promise the
  prior audit flagged is **not present in this file** and there is no other off-page promise.
- **Currency glyph is correct** (`₹`) in the meta description, the ladder, the door price, the
  bubble and the footer.

---

## 2. Copy inventory, verdicts and rewrites

Every visible string on the page, in DOM order. "Claim check" is against `OFFER.md`.
Severity of the copy itself: **P0** = contradicts the offer or breaks the visitor's job,
**P1** = breaks a stated page rule, **P2** = clarity / polish.

| # | line | current | verdict | proposed rewrite | reason |
|---|---|---|---|---|---|
| 1 | 297 | `Do Alfaaz` | keep | — | masthead wordmark, short caps label, on-brand |
| 2 | 297 | `Aham Brahmasmi 2.0` | keep | — | title |
| 3 | 298 | `Banaras · A recorded course · waitlist first` | keep | — | 44 chars of tracked caps; acceptable as a masthead sub-line, reads clean |
| 4 | 302 | `A letter before the door` | keep | — | 24-char kicker; caps appropriate |
| 5 | 305 | `I went quiet for three years.` | keep | — | opening of the letter; no claim |
| 6 | 305 | `This is what I came back with.` | keep | — | no claim |
| 7 | 309 | `Aham Brahmasmi 2.0 is that time turned into a recorded course in Advaita inquiry and modern psychology, for the gap between knowing something and living it. I am opening it as a waitlist first, and I want to show you the working before I ask you for anything.` | keep | — | product statement; matches `OFFER.md` framing; "waitlist first" is true |
| 8 | 314 | `The ladder up front · the evidence graded · the letter · one word` | keep | — | describes the page's own order, but as a route map it aids navigation |
| 9 | 320 | `The ladder, before anything else` | keep | — | section label |
| 10 | 322 | `The first 50 seats` | keep | — | matches `OFFER.md` block 1 |
| 11 | 322 | `opens here` | keep | — | rung tag |
| 12 | 323 | `₹999` | keep | — | matches `OFFER.md` |
| 13 | 326 | `The next block` | keep | — | matches `OFFER.md` block 2 |
| 14 | 327 | `₹1,499` | keep | — | matches `OFFER.md` |
| 15 | 330 | `After that` | keep | — | matches `OFFER.md` block 3 |
| 16 | 331 | `₹1,999` | keep | — | matches `OFFER.md` standing price |
| 17 | 334 | `It rises as blocks fill. It does not fall.` | keep | — | true of the ladder; matches `OFFER.md` |
| 18 | 340 | `The record, with the working shown` | keep | — | section label |
| 19 | 343-358 | graded record lines (`15+ hours`, `10+ hours on day one`, `50+ lessons`, `5+ hour psychology sequence`, book, two recorded lives) plus their `counted` / `quoted norm` / `floor` chips | keep | — | every figure matches `OFFER.md` **and** each line carries its own honesty chip where it stands |
| 20 | 364 | `None of these are rounded up. Where a number is a floor or a quoted norm, it says so on the line, because that is the only way the strong ones mean anything.` | **cut** | delete the whole sentence | meta — it narrates the page's own honesty mechanism (P1-6 in both prior audits, still open). The `grade` chips already mark each weak figure in place |
| 21 | 377 | `A letter, because you asked` | keep | — | section label |
| 22 | 380-388 | the letter body | keep | — | no claim; voice-consistent |
| 23 | 396 | `Ye hai` | keep | — | short caps label |
| 24 | 398-401 | `Advaita Vedanta as inquiry, not belief` / `Modern psychology as observation` / `Practices for ordinary life` / `Lifetime access` | keep | — | "Lifetime access" matches `OFFER.md` |
| 25 | 405 | `Ye nahi hai` | keep | — | short caps label |
| 26 | 407-410 | `Therapy ka replacement nahi` / `Religion ya guru worship nahi` / `Motivation ya fake positivity nahi` / `Instant fix nahi` | keep | — | honest disclaimers; consistent with `OFFER.md` |
| 27 | 418 | `One door` | keep | — | 8-char caps label |
| 28 | 419 | `Take your time. Then say one word.` | keep | — | no claim |
| 29 | 420 | `That is all of it: the ladder, the hours, the book, the sessions, the refund. If the letter above sounded like your own 2:17 a.m., you already know what this is for. What is left is one word.` | keep | — | "the refund" matches the 14-day refund in `OFFER.md` |
| 30 | 421 | `₹999` | keep | — | matches `OFFER.md` |
| 31 | 422 | `For the first 50 seats. Then ₹1,499, then ₹1,999 standing. Paid once. Lifetime access. 14 days to change your mind.` | keep | — | exact `OFFER.md` terms; "then ₹1,999 standing" is the correct "does not fall" phrasing |
| 32 | 423 | `Faisla shaant dimaag se lena.` | keep | — | no claim; voice |
| 33 | 424 | `Your name` | keep | — | field label |
| 34 | 426 | `e.g. Aarav` (placeholder) | keep | — | example, not a claim |
| 35 | 429 | `Your WhatsApp number` | keep | — | field label |
| 36 | 431 | `e.g. 919876543210` (placeholder) | keep | — | example |
| 37 | 432 | `With country code. The opening notice arrives here.` | keep | — | true; but see ALT-03 (rendered at 12px) |
| 38 | 435 | `Join the waitlist` | keep | — | matches `OFFER.md` "Joining the waitlist" and the button-label rule; one line at 320 |
| 39 | 438 | `Join the waitlist` (static fallback) | keep | — | same label; only shown with JS off |
| 40 | 441 | `Your WhatsApp opens with this message already typed` | keep wording, restyle | same words, sentence case | 51-char tracked caps, wraps at 320 (ALT-05); the claim itself is true — the bubble is the real message |
| 41 | 442-446 | bubble message `[ab2:wl2] Waitlist for Aham Brahmasmi 2.0 ... First 50 seats are ₹999. Please tell me when doors open.` | keep | — | this is the payload; ₹999 matches `OFFER.md`; verified byte-identical to what sends |
| 42 | 444 | `Name: your name` / `WhatsApp: your number` (placeholder state) | keep | — | honest placeholders before typing; replaced with real values on input |
| 43 | 446 | `now ✓✓` (stamp) | keep | — | reads as a sent message; `aria-hidden` |
| 44 | 447 | `What happens next: add your name and number above, then press Send in the WhatsApp chat that opens. Joining is free and nothing is charged. You are told when the doors open.` | **trim** | drop the final sentence: `... Joining is free and nothing is charged.` | the promise is already carried twice on the page (`432` "The opening notice arrives here", `452` success title) and `OFFER.md` does not promise a timing; stating it a third time is the repeated-reassurance pattern both prior audits flagged. Claim check: within `OFFER.md` — "nothing is charged" for joining is true (the waitlist reserves no seat and takes no money) |
| 45 | 452 | `Your message is ready in WhatsApp.` | keep | — | accurate |
| 46 | 453 | `WhatsApp opened with your waitlist message ready to send.` | keep | — | accurate; **no promise of a reply** |
| 47 | 454 | `Nothing was sent from this page.` | keep | — | true — the handoff opens a chat, it does not send |
| 48 | 455 | `WhatsApp did not open? Tap to try again` | keep | — | accurate recovery; add the missing focus ring (ALT-04) |
| 49 | 458 | `No WhatsApp on this device? Send the same message to +91 91792 22991 from any phone, or message @doalfaaz on Instagram.` | keep | — | correct escape hatch; number matches the `wa.me` target; fix the 21px link target (ALT-02) |
| 50 | 462 | `Aham Brahmasmi 2.0 · Do Alfaaz · Banaras` | keep | — | footer |
| 51 | 463 | `Ye therapy nahi, religion nahi, motivation nahi. Ye inquiry hai.` | keep | — | matches the `Ye nahi hai` block; no claim |
| — | 7-12 | meta description / OG / Twitter copy: `A waitlist-first launch. The first 50 seats are ₹999, then ₹1,499, then ₹1,999 standing. 15+ hours, 50+ lessons, a companion book. Joining the waitlist is free and nothing is charged.` | keep | — | every figure matches `OFFER.md`; "free" refers to joining, which is true |

**Claims flagged as beyond `OFFER.md`: none.** In particular there is **no "I reply" promise**
anywhere in this file, and no reply-latency, seat-reservation, discount-expiry or
scarcity-beyond-the-ladder claim. The one line that comes closest — `447` "You are told when
the doors open" — is a statement of intent, not a timing promise, and is trimmed above for
repetition rather than for truth.

---

## 3. Status of the prior audits' findings against this file

| prior finding | prior severity | status here |
|---|---|---|
| P0-2 button label wraps at 320 | P0 | **FIXED** — label is `Join the waitlist`, 1 line at 320/390/768/1440, 54px tall |
| P0-3 bubble drawn as incoming | P0 | **PARTLY FIXED** — tint `#dcf8c6` is right, tail is on the **right** (`border-radius:10px 10px 2px 10px`, `::after right:-8px`) and a `now ✓✓` stamp exists; **still open**: the bubble is full-bleed so the tail shape is inverted and detaches (ALT-01) |
| P1-4 repeated "free / nothing charged" | P1 | **PARTLY FIXED** — now 2x (`447` + the `452` success panel); the success line is a state report, so the only remaining duplication is inside `447` itself |
| P1-5 tracked caps > 24 chars | P1 | **OPEN (reduced to one)** — `.bubble-label` at 51 chars (ALT-05); masthead/route/section labels read acceptably |
| P1-6 meta sentence "None of these are rounded up..." | P1 | **OPEN** — still at `364`; cut it (copy table row 20) |
| P1-7 no-JS fallback sends incomplete lead | P1 | **FIXED** — `438` carries the full template with placeholders; verified decoded with JS off |
| P2-10 Instagram link under 48px | P2 | **OPEN** — ALT-02 |
| P2-11 `.field-hint` at 12px | P2 | **OPEN** — ALT-03 |
| P2 safe-area / `100svh` / dock | P2 | **FIXED / N-A** — `48-49` declare `--safe-top`/`--safe-bottom`, `62` / `180` / `275` apply them, `55` uses `100svh`; no dock on this page by choice |

---

## 4. Screenshots

All in `WAITLIST_MASTER_SHOTS/alt/`. New this pass: `alt-bubble-live-320.png`,
`alt-bubble-live-390.png`, `alt-form-error-320.png`, `alt-form-error-390.png`,
`alt-door-live-390.png`, `alt-reduced-motion-320.png`, `alt-nojs-320.png`,
`alt-1440-full.png`. Carried from the earlier pass in the same run: `w320-top/full`,
`w390-top/full`, `w768-top/full`, `w1440-top/full`, `bubble-320/390`, `door-320/390`,
`focus-name-390`, `focus-button-390`, `validation-empty-390`, `validation-badnum-390`,
`success-state-390`, `nojs-390`, `nojs-390-full`.

Unfinished: none. Blockers: none. No page source was edited; no build, test, lint or gate was run.
