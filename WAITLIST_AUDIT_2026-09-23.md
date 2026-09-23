# Waitlist pages — audit 2026-09-23 (Iris 5, read-only)

Scope: `waitlist.html` and `ab2-waitlist.html` only. Truth: `OFFER.md`; rules: `ART_DIRECTION_2026-09-23.md` (U1–U10).
Method: served on `:8925`, Playwright chromium at 320/375/768/1440. Fields filled (Tushar / 919876543210); wa.me href read from the handler and from the live `retry.href`/`window.location` capture; JS-off pass with `javaScriptEnabled:false`. 16 JPEG q60 shots in `/tmp/audit_wl2/` (deleted).

## What passes (measured, not asserted)

- **Offer truth: both pages match OFFER.md.** ₹999 / first 50 → ₹1,499 → ₹1,999; paid once, lifetime, 14-day one-message refund, 15+ hours / 10+ on day one / 50+ lessons / 5+ hour psychology sequence / book / two recorded lives. No forbidden phrase (no "single price", "no tiers", "no deadline", "no upsell") on either page.
- **Currency:** `₹` everywhere on both. No "Rs". (U3 ✓)
- **Horizontal overflow:** `scrollWidth == clientWidth` at all four widths on both pages. No clipped text node except one false positive below. (U7 ✓)
- **Contrast:** every text/background pair clears its floor. Lowest measured: `--text3` #918a82 on #09090c = 5.83:1; `--gold-dim` #a08550 on `--surface` = 5.02:1, on the rung-live blend 4.65:1; ab2 `--ink3` #6f6855 on `--paper` = 4.84:1, `--madder` #8e3b26 on page = 6.53:1, `--green` #2f6b41 = 5.24:1, bubble text #10240f on #dcf8c6 = 14.27:1. All ≥ 4.5 (≥3 for the ≥24px price).
- **wa.me handoff works on both.** Filled + submitted, no navigation performed; decoded payload: `[ab2:wl]` / `[ab2:wl2]` + `Name: Tushar` + `WhatsApp: 919876543210` + `First 50 seats are ₹999…`. Number `919179222991` correct on both.
- **Success panel fires on both:** `#wlDone` visible, `#wlDoneMsg` = "WhatsApp opened with your waitlist message ready to send.", button label restored, button re-enabled.
- **No-JS:** `waitlist.html` hides the form (`<noscript>` + `#wlForm{display:none}`) and shows the static `#wlFallback` wa.me link with a correct pre-filled message. `ab2-waitlist.html` keeps the form (dead without JS) **and** shows the `#wlFallback` link, whose payload is only `[ab2:wl2] Waitlist for Aham Brahmasmi 2.0` — no name/number fields, so the fallback sends an incomplete lead.
- **Small text on phone:** no sentence-level text under 15px. The only sub-15px items are the 11.2px `◆`/`✕` glyphs (decorative, `aria-hidden`) on `waitlist.html` and the 12px `.field-hint` on ab2 (`field-hint` is a meta hint; acceptable but see P2).
- **Targets ≥48px:** all except the ab2 in-copy Instagram link (21px tall) — see P2.

## P0 — both pages

**P0-1 (waitlist.html) — the preview bubble never shows the real message.**
`waitlist.html:435` renders a hard-coded `span.wa-bubble` with the placeholders `Name: (your name)` / `WhatsApp: (your number)`. Unlike `ab2-waitlist.html:416+486` (`bubble.textContent = msg` in the submit handler), `waitlist.html`'s script never updates it. Measured at submit: bubble still reads `…Name: (your name)WhatsApp: (your number)…` after the form is filled. The visitor is shown a message that is not the one they are asked to send. Violates U1 (preview must be the real outgoing message) and OFFER.md's "you are registered on WhatsApp and told the moment it opens".
Fix: give the span an id (`id="wlBubble"`, `waitlist.html:435`) and in the submit handler, next to `retry.href = url;` (`waitlist.html:621`), add `document.getElementById('wlBubble').textContent = msg;` — mirror `ab2-waitlist.html:486`.

**P0-2 (both) — primary button label wraps at 320px.**
`waitlist.html:421` and `ab2-waitlist.html:409` both render `Join the waitlist on WhatsApp`, which measured 2.3 lines at 320px on a 246px button (wl) and 2.5 lines on 288px (ab2). U8: "The default label is 'Join the waitlist'" and it must fit on one line at 320.
Fix: set the button span text to `Join the waitlist` on both; move "on WhatsApp" into the reassurance line beneath (`.cta-sub` wl:423 / `.next-step` ab2:417). The `wa.me` handoff is already stated in those lines.

**P0-3 (both) — WhatsApp bubble is drawn as an incoming message (U1).**
Measured: `waitlist.html` bubble `border-radius: 3px 12px 12px 12px` (tail top-left), background `#161619` (the page's own `--bg3`, no WhatsApp tint); `ab2-waitlist.html` bubble `border-radius: 10px 10px 10px 2px` (tail bottom-left), background `#dcf8c6` — the **incoming** tint. U1 requires a **right-aligned outgoing** bubble with a tail, the outgoing tint, and a `now ✓✓` stamp. `waitlist.html` has no stamp; ab2's `hasStamp` matched only because the word "now" appears in prose.
Fix: right-align the bubble (`align-self:flex-end` / `margin-left:auto`) and mirror the radius so the tail is on the right — `waitlist.html:209` → `border-radius: 12px 3px 12px 12px`; `ab2-waitlist.html:228` → `border-radius: 10px 10px 2px 10px`. Give the bubble the outgoing tint and add a small muted "now ✓✓" line inside it.

## P1 — both pages

**P1-4 (both) — repeated reassurance (U4).** "Joining is free / nothing is charged" appears as a whole-clause promise **5×** on `waitlist.html` (lines 380, 407, 423, 427, 542 — plus 432) and **3×** on `ab2-waitlist.html` (311, 417, 424). U4: once per CTA.
Fix: keep the clause in exactly one handoff line under the CTA (wl:423, ab2:417) and delete the standing repetitions — remove "Joining the waitlist is free and nothing is charged." from wl:380 and the "Joining the waitlist costs nothing." from wl:407; and delete it from `ab2:424` (the success panel already says "Nothing was sent from this page, and nothing is charged now").

**P1-5 (both) — caps labels longer than 24 characters (U5).**
`waitlist.html:377` "Waitlist first · first 50 seats at ₹999" = 39 chars, letter-spaced uppercase.
`ab2-waitlist.html:296` "The ladder, before anything else" = 32; `:319` "The record, with the working shown" = 34; `:415` `.bubble-label` "Your WhatsApp opens with this message already typed" = 51; `:277` masthead-sub = 44; `:289` hero-route = 65.
Fix: set each of these to sentence case in the text face (drop `text-transform:uppercase`/letter-spacing), keeping caps only for ≤24-char labels ("One door", "The letter", "Why a poet teaches this").

**P1-6 (ab2-waitlist.html) — meta copy about the page (U6).**
`ab2-waitlist.html:320` "None of these are rounded up. Where a number is a floor or a quoted norm, it says so on the line, because that is the only way the strong ones mean anything." — describes the page's own honesty method. The per-line `grade` chips already mark each weak figure where it stands.
Fix: delete `ab2-waitlist.html:320`; the graded list (321–327) carries the meaning without the meta sentence.

**P1-7 (ab2-waitlist.html) — no-JS fallback sends an incomplete lead.**
`ab2-waitlist.html:411` `#wlFallbackLink` href text is only `[ab2:wl2] Waitlist for Aham Brahmasmi 2.0`. With JS on the form builds the full message, but with JS off this link is the only path and it drops name + number.
Fix: make the static href match the full template with `(your name)`/`(your number)` placeholders, as `waitlist.html:425` does.

## P2

**P2-8 (waitlist.html:435) — self-narrating caption.** "Press Send. That is the whole signup." narrates the page's method (U6). Trim to "Press Send."

**P2-9 (waitlist.html:541-542) — stray unbalanced `</p>`.** The `no-pressure` block closes a paragraph that was never opened (no `<p>` on 541/542). Harmless visually, invalid HTML. Wrap the two lines in `<p>`.

**P2-10 (ab2-waitlist.html:428) — in-copy Instagram link target is 21px tall.** Under the 48px phone target floor. Add `display:inline-flex;align-items:center;min-height:48px;` as `waitlist.html:229` does.

**P2-11 (ab2-waitlist.html:198) — `.field-hint` is 12px.** It is sentence-level explanatory copy ("With country code. This is where the reply lands."), not a caps label; it falls under the 15px phone floor while `waitlist.html:426` renders the same string at 15px. Raise to `--fs-small`.

**P2-12 (both) — no phone dock at all (U2 gap, not a fault).** U2 describes a dock that may be "simply absent with JS off". Neither page has any dock element (`(no dock element)` measured). Since both CTAs sit in the offer/door card within the first scroll, this reads as a deliberate omission; flag only so the choice is on record. If a dock is wanted, cap it at 64px with "₹999 · first 50 seats" left and "Join waitlist" right, and hide it via IntersectionObserver while the hero/final CTA is visible.

## Weak / unclear copy, with rewrites

| Page:line | Now | Rewrite |
|---|---|---|
| wl:380 | "Joining the waitlist is free and nothing is charged. When doors open, the first 50 seats are ₹999…" | "The first 50 seats are ₹999. Then ₹1,499, then ₹1,999. Join the waitlist to be told when doors open." |
| wl:407 | "Joining the waitlist costs nothing." | delete (covered by the one handoff line) |
| wl:435 | "Press Send. That is the whole signup." | "Press Send." |
| wl:542 | "moving early also costs less" | "the price steps up, so early seats cost least" |
| ab2:320 | "the only way the strong ones mean anything" | delete (meta) |
| ab2:417 | "I reply from this number with the details and the moment doors open." | "I will reply with the details and tell you when doors open." |

## Ranked summary

| # | Page | Rule | Severity | file:line | Fix |
|---|---|---|---|---|---|
| 1 | wl | U1/OFFER | **P0** | 435, 621 | live-update bubble with the built `msg` |
| 2 | both | U8 | **P0** | wl:421 / ab2:409 | label = "Join the waitlist" |
| 3 | both | U1 | **P0** | wl:209 / ab2:228 | right-aligned outgoing bubble + tint + `now ✓✓` |
| 4 | both | U4 | P1 | wl:380,407,542 / ab2:311,424 | one reassurance line per CTA |
| 5 | both | U5 | P1 | wl:377 / ab2:277,289,296,319,415 | sentence case for >24-char labels |
| 6 | ab2 | U6 | P1 | 320 | delete meta sentence |
| 7 | ab2 | no-JS | P1 | 411 | full message in fallback href |
| 8 | wl | U6 | P2 | 435 | drop "That is the whole signup." |
| 9 | wl | HTML | P2 | 541-542 | add `<p>` |
| 10 | ab2 | targets | P2 | 428 | 48px inline link |
| 11 | ab2 | type | P2 | 198 | `.field-hint` to 15px |
| 12 | both | U2 | P2 | — | no dock present (record the choice) |

Unfinished: none. Blockers: none. Screenshots deleted.
