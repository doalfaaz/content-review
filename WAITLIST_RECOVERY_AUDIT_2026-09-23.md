# Waitlist recovery audit — 2026-09-23 (Juno, read-only)

Scope: `waitlist.html` (as it stands in this worktree, treated as work in progress) and
`ab2-waitlist.html`. Truth for offer/prices/urgency: `/Users/tushar/Desktop/AB2-WEBSITES-10/reference/OFFER.md`.
Cross-reference: `WAITLIST_AUDIT_2026-09-23.md` (Iris 5, same day). Method: source reading with
exact line anchors; no page was served, built, or edited. Prior audit findings were re-confirmed
against the current file text, not copied.

Every claim below carries a `file:line` anchor. Severity: P0 breaks the visitor's job or the offer
truth; P1 breaks a stated page rule; P2 is polish or a recorded choice.

---

## 1. Inventory — what each page actually is

| Axis | `waitlist.html` | `ab2-waitlist.html` |
|---|---|---|
| Offer | Ladder 999/1,499/1,999, paid once, lifetime, 14-day refund | Same ladder, same terms |
| Register | Dark, Poppins-sans, centred hero | Bone-paper, slab-serif, printed-masthead letter |
| CTA count | Primary form CTA (`421`) + final anchor CTA (`551`) + fallback link (`426`) | One form CTA (`409`) + fallback link (`412`) + phone/IG line (`428`) |
| Form | `#wlForm` L410–422, two fields, `novalidate`, per-field `role="alert"` errors | `#wlForm` L397–410, identical field set and error pattern |
| Live preview | Hard-coded static bubble (`435`) | Bubble filled with the real message on submit (`518`, `bubble.textContent = msg`) |
| No-JS | Form hidden (`<noscript>` L17), static fallback link with full message (`426`) | Form stays and dies; static fallback link with a **stripped** message (`412`) |
| Outgoing link | `wa.me/919179222991` with `[ab2:wl]` payload | `wa.me/919179222991` with `[ab2:wl2]` payload |
| Success state | `#wlDone` L430–434, `#wlRetry` recovery | `#wlDone` L421–425, `#wlRetry` recovery |
| Empty state | `#wlStatus:empty{height:0}` (`193`), `#wlDone[hidden]` (`201`) | `#wlStatus` L420 no collapse; `#wlDone[hidden]` |
| Mobile safe area | `viewport-fit=cover` (`5`), **no** `env(safe-area-inset-*)` anywhere | `viewport-fit=cover` (`5`), **no** `env(safe-area-inset-*)` anywhere |
| Signup-blocking defect | Yes — see P0-1 | No |

Both pages reproduce the `OFFER.md` ladder, lifetime access, 14-day one-message refund, and the
"paid once" wording, and neither uses a forbidden phrase. The offer truth is intact on both.

---

## P0 — the visitor's job is broken

**P0-1 — `waitlist.html:435` shows a message that is never the one sent.**
The bubble at `waitlist.html:435` is hard-coded literal text with `Name: (your name)` /
`WhatsApp: (your number)` placeholders. The submit handler builds the real `msg` at
`waitlist.html:641-646` and sets `retry.href = url` at `waitlist.html:648`, but never writes `msg`
into the bubble. `ab2-waitlist.html:518` does exactly that (`bubble.textContent = msg;`).
So `waitlist.html` asks the visitor to approve a preview that is not the payload.
`OFFER.md` ("you are registered on WhatsApp and told the moment it opens") and the page's own
line `waitlist.html:435` ("WhatsApp opens with this message already typed") both assert the
preview is the real one.
Change: add `id="wlBubble"` to the span at `waitlist.html:435`; next to
`waitlist.html:648` add `document.getElementById('wlBubble').textContent = msg;`. Mirror
`ab2-waitlist.html:518`.

**P0-2 — primary button label wraps at 320px on both pages.**
`waitlist.html:421` and `ab2-waitlist.html:409` both carry the label `Join the waitlist on WhatsApp`.
`waitlist.html:172-174` sets `min-height:52px; padding:0 28px` on a `400px`-max `.capture-form`
(`waitlist.html:147`) inside a `320px` viewport card with `padding: 18px 16px` under 360px
(`waitlist.html:246`); `ab2-waitlist.html:202-208` sets `width:100%` on the button inside a
`640px` `.wrap` with `padding: 0 16px` under 360px (`ab2-waitlist.html:257`). The label is 30
characters and cannot hold one line at 320px. A two-line primary CTA is an accidental layout, not
a designed one.
Change: set the button span text to `Join the waitlist` on both (`waitlist.html:421`,
`ab2-waitlist.html:409`), and move "on WhatsApp" into the reassurance line beneath
(`waitlist.html:423` `.cta-sub`, `ab2-waitlist.html:417` `.next-step`).

**P0-3 — the WhatsApp bubble is drawn as an incoming message on both pages.**
`waitlist.html:211` uses `border-radius: 3px 12px 12px 12px` — tail on the top-left — on the
page's own `--bg3` `#161619` (`waitlist.html:210`, `waitlist.html:42`), which is not the
WhatsApp outgoing tint; and the bubble has no delivery stamp. `ab2-waitlist.html:229` uses
`border-radius: 10px 10px 10px 2px` — tail on the bottom-left — on `#dcf8c6`
(`ab2-waitlist.html:228`), which is the WhatsApp **incoming** tint. Neither bubble is a
right-aligned outgoing message with a tail and a `now ✓✓` stamp. The preview is meant to be the
message the visitor is about to send, so a wrong-side bubble misstates the handoff.
Change: right-align the bubble (`align-self:flex-end` or `margin-left:auto`) and mirror the tail —
`waitlist.html:211` → `border-radius: 12px 3px 12px 12px`; `ab2-waitlist.html:229` →
`border-radius: 10px 10px 2px 10px`. Give the bubble the outgoing tint and add a small muted
`now ✓✓` line inside.

---

## P1 — a stated page rule is broken

**P1-4 — repeated reassurance on both pages.**
`waitlist.html` repeats "Joining is free / nothing is charged" as a full promise at
`waitlist.html:380`, `407`, `423`, `427`, `435`, and again at `542`. `ab2-waitlist.html` repeats it
at `ab2-waitlist.html:311`, `417`, `424`. Saying it six times makes it read as a defence, not a
fact. The success panel already states it once (`waitlist.html:433`, `ab2-waitlist.html:424`).
Change: keep the clause in exactly one handoff line under the CTA (`waitlist.html:423`,
`ab2-waitlist.html:417`) and delete the standing repetitions at `waitlist.html:380`, `407`, `542`
and `ab2-waitlist.html:424`.

**P1-5 — tracked-caps labels longer than they should be.**
`waitlist.html:377` `Waitlist first · first 50 seats at ₹999` (39 chars) and the ab2 labels
`ab2-waitlist.html:296` (32), `:319` (34), `:277` (44), `:289` (65), `:415` (51) all run as
letter-spaced uppercase. Long letter-spaced uppercase is slow to read on a phone; the technique is
for short labels only.
Change: set these to sentence case in the text face (drop `text-transform:uppercase` and
letter-spacing), keeping caps only for genuinely short labels ("One door", "The letter").

**P1-6 — `ab2-waitlist.html:320` explains the page's own method.**
`None of these are rounded up. Where a number is a floor or a quoted norm, it says so on the line,
because that is the only way the strong ones mean anything.` describes the page's honesty
mechanism instead of the product. The per-line `grade` chips at `ab2-waitlist.html:321-327`
already mark each weak figure where it stands, so the sentence is redundant and self-referential.
Change: delete `ab2-waitlist.html:320`.

**P1-7 — `ab2-waitlist.html:412` no-JS fallback sends an incomplete lead.**
The static href is only `[ab2:wl2] Waitlist for Aham Brahmasmi 2.0` — no name, no number. With JS
on, the handler builds the full message (`ab2-waitlist.html:508-513`). With JS off, the fallback
link is the only path and it drops the two fields the page just asked for. `waitlist.html:426`
shows the correct pattern with the full template and `(your name)` / `(your number)`
placeholders.
Change: make `ab2-waitlist.html:412`'s static href match the full template with the same
placeholders as `waitlist.html:426`.

---

## P2 — polish and recorded choices

**P2-8 — `waitlist.html:435` narrates the page.** `Press Send. That is the whole signup.` Trim to
`Press Send.`

**P2-9 — `waitlist.html:539-542` has an unbalanced `</p>`.** The `no-pressure` block opens `<div>`
and `<div>` (L539, L540), never a `<p>`, but closes `</p>` at `waitlist.html:542`. Invalid HTML,
harmless visually. Wrap the two lines in `<p>`.

**P2-10 — `ab2-waitlist.html:428` in-copy Instagram link is under the phone target floor.**
The link is inline in a sentence with no `min-height`. `waitlist.html:226` already applies
`display:inline-flex; align-items:center; min-height:48px;` to inline links. Apply the same.

**P2-11 — `ab2-waitlist.html:198` `.field-hint` is 12px.** The string is sentence-level
explanatory copy ("With country code. This is where the reply lands."), not a caps label, and
`waitlist.html:149` renders the identical string at `--fs-small` (15px). Raise `--fs-micro` to
`--fs-small` for this rule.

**P2-12 — no mobile safe-area handling on either page.** Both declare
`viewport-fit=cover` (`waitlist.html:5`, `ab2-waitlist.html:5`), which opts the page into the
notch area, but neither uses `env(safe-area-inset-*)`. On a notched iPhone the sticky
`waitlist.html:64-68` nav (52px, no top inset) can sit under the status bar, and the bottom
surface (`waitlist.html:338` final CTA padding `88px`; `ab2-waitlist.html:257` footer padding
`34px`) can sit under the home indicator. Either add the insets or drop `viewport-fit=cover` so
the browser letterboxes safely.
Change: on `waitlist.html:64` add `padding-top: env(safe-area-inset-top);`; on
`waitlist.html:338` use `padding-bottom: calc(88px + env(safe-area-inset-bottom));`; on
`ab2-waitlist.html:257` add `padding-bottom: calc(34px + env(safe-area-inset-bottom));`.

**P2-13 — `waitlist.html:56` uses `100vh`; `ab2-waitlist.html:50` uses `100svh`.** The two pages
disagree on the same property. On iOS `100vh` includes the collapsed URL-bar height, so the
`waitlist.html` body can be taller than the visible area by the bar height. Change
`waitlist.html:56` to `100svh` to match `ab2-waitlist.html:50`.

**P2-14 — no phone dock on either page.** `WAITLIST_AUDIT_2026-09-23.md` already records this as a
deliberate omission; restated here so the choice stays on record. The CTA sits in the first scroll
on both pages, so a dock is not required. If added, it must not cover the final CTA.

**P2-15 — `waitlist.html:338` `text-align:center` on `.final-cta` is dead.** It is overridden by
the later `.no-pressure, .final-cta, .capture-or { text-align: left; }` at `waitlist.html:361`.
Remove the dead declaration at `waitlist.html:338` so the reading-pass override is the only
source of truth.

---

## Ranked summary

| # | Page | Anchor(s) | Severity | Change |
|---|---|---|---|---|
| 1 | wl | 435, 648 | **P0** | write the built `msg` into the bubble |
| 2 | both | wl:421 / ab2:409 | **P0** | label `Join the waitlist` |
| 3 | both | wl:211 / ab2:229 | **P0** | right-aligned outgoing bubble, tint, `now ✓✓` |
| 4 | both | wl:380,407,542 / ab2:424 | P1 | one reassurance line per CTA |
| 5 | both | wl:377 / ab2:277,289,296,319,415 | P1 | sentence case for long caps labels |
| 6 | ab2 | 320 | P1 | delete the meta sentence |
| 7 | ab2 | 412 | P1 | full message in the no-JS fallback href |
| 8 | wl | 435 | P2 | drop `That is the whole signup.` |
| 9 | wl | 539-542 | P2 | balance the paragraph |
| 10 | ab2 | 428 | P2 | 48px inline link target |
| 11 | ab2 | 198 | P2 | `.field-hint` to 15px |
| 12 | both | wl:64,338 / ab2:257 | P2 | safe-area insets or drop `viewport-fit=cover` |
| 13 | wl | 56 | P2 | `100vh` → `100svh` |
| 14 | both | — | P2 | no dock present; choice on record |
| 15 | wl | 338 | P2 | remove the dead `text-align:center` |

Unfinished: none. Blockers: none. No page source was edited; no build, test, or gate was run.
