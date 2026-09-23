# Waitlist craft pass 3 — 2026-09-24

Scope: `waitlist.html` and `ab2-waitlist.html` at the repo root only. No other
file touched; nothing committed. Every link target, the `wa.me`
payloads (`[ab2:wl]` on `waitlist.html`, `[ab2:wl2]` on `ab2-waitlist.html`),
the 10–13 digit validation, the 1.4s success panel and the JS-off fallback
behave exactly as before.

Both pages were served on `127.0.0.1:8791` and captured full-length at
320x568, 390x844, 1024x768 and 1440x900 (Playwright 1.57.0 from
`content-engine-macos/qa/node_modules`) into `shots-20260924-waitlist/`
pre-edit. No horizontal overflow on either page at any width. The two
`ERR_CONNECTION_RESET` / `ERR_SOCKET_NOT_CONNECTED` console entries on
`waitlist.html` at 1024/1440 were not reproducible from the server log (all
200s); nothing in this pass touched them.

## waitlist.html (dark/gold build)

| what was wrong | change | file:line |
|---|---|---|
| Hero eyebrow said `first 50 seats at ₹999`, which reads as a price available now instead of the doors-open rung | reads `Waitlist first · first 50 seats ₹999 when doors open` | waitlist.html:462 |
| Hero sub restated the whole ladder and closed on a bare `₹1,999` with no label | trimmed to `then ₹1,499, then ₹1,999 standing`; the ladder block below carries the detail | waitlist.html:465 |
| Ladder note said `does not fall` and `each block` while the rungs are called steps | `The price rises as each step fills, and it never falls.` | waitlist.html:484 |
| CTA was `Join the waitlist` — the visitor could not tell what would happen | `Join the waitlist on WhatsApp` on the button, the JS-off fallback link and the final CTA | waitlist.html:501, 507, 638 |
| The line under the form ran three ideas together and was the third restatement of "nothing charged" | `Joining the waitlist is free. One tap opens WhatsApp with the message already typed; you press Send. Nothing is charged, and no seat is held.` — free stated once, at the action | waitlist.html:503 |
| JS-off note described the link instead of the act | `…opens WhatsApp with the same message already typed. You press Send.` | waitlist.html:508 |
| Success panel said `Your message is ready` and `Nothing was sent.`, which stops short of telling the visitor the one thing left to do | `Press Send in WhatsApp.` title; body `Nothing has been sent yet. You are on the list once you press Send there.` | waitlist.html:510, 512 |
| Instagram fallback did not say the same waitlist message works there | `message @doalfaaz directly with the same message` | waitlist.html:524 |
| "moving early also costs less" nudged against the page's own take-your-time line | `Early is cheaper, not mandatory…` | waitlist.html:629 |
| Final card priced `The first 50 seats are ₹999` with no doors-open anchor and did not say the waitlist holds nothing | `The first 50 seats are ₹999 when doors open. The waitlist is free and holds nothing.` | waitlist.html:637 |
| 52px button labels were `nowrap`, so the longer label could not wrap at 320 without clipping | at ≤360px the label wraps; the 52px touch height is untouched | waitlist.html:203-206 |

## ab2-waitlist.html (sepia/serif build)

| what was wrong | change | file:line |
|---|---|---|
| ₹999 rung tag read `opens here`, ambiguous about timing | `when doors open` — matches the other page and the offer facts | ab2-waitlist.html:360 |
| ₹1,499 rung said `The next block` with no gate named, unlike its sibling page | `The next block, after 50` | ab2-waitlist.html:364 |
| The first ladder note buried "free" in bold mid-sentence and never said the waitlist does not reserve | `Joining the waitlist is free, and it does not hold or reserve a seat. When doors open, your WhatsApp is where the message lands.` | ab2-waitlist.html:372 |
| The ladder never stated the rise/never-falls rule that a first-time reader needs | added `The price rises as each step fills, and it never falls.` to the refund note | ab2-waitlist.html:373 |
| CTA was `Join the waitlist` — no indication of the handoff mechanism | `Join the waitlist on WhatsApp` on the button and the JS-off fallback | ab2-waitlist.html:469, 472 |
| `What happens next` duplicated "free and nothing is charged" and omitted the no-hold fact | `Joining is free; nothing is charged and no seat is held.` | ab2-waitlist.html:481 |
| Success panel said `Your message is ready in WhatsApp.` with no next act | `Press Send in WhatsApp.` title; body adds `You are on the list once you press Send there.` | ab2-waitlist.html:486, 488 |
| Closing line `What is left is one word.` no longer matched what the reader must actually do | `What is left is one message, and it holds nothing.` | ab2-waitlist.html:452 |
| "Take your time" sat above a form with nothing saying waiting costs nothing | `The waitlist holds nothing, so nothing is lost by waiting.` | ab2-waitlist.html:455 |
| 54px button label had `text-overflow: ellipsis`, so a longer label could be cut at 320 | dropped the ellipsis so the label wraps; 54px touch height kept | ab2-waitlist.html:242-243 |
| label `nowrap` could not wrap at 320 | at ≤360px `.cta` and its span wrap | ab2-waitlist.html:320 |

## Claims check

Both pages, after this pass, assert only: first 50 seats ₹999 (applying when
doors open), next block ₹1,499 after 50 fill, standing ₹1,999, price rises as
steps fill and never falls, paid once, lifetime access, 15+ hours recorded,
50+ lessons, the book included, two recorded live sessions, 14-day refund on
one message with no reason asked, waitlist free via WhatsApp and holding
nothing. No banned phrasing remains: no "live now", "open at ₹999", "open
now", purchase-today wording, reader/follower counts, countdowns, dates, seat
counters or seat-hold wording. The pre-existing counted/soft evidence block on
`waitlist.html` (81%, 1,000+, 5 batches, 450+ floor, 10% quoted norm) is
grade-labelled and was left untouched.

## Not verified here

This worktree was not built, tested or re-screenshotted per work rules; all
findings come from the pre-edit captures and static reading. The lead's
validation should re-shoot both pages at the four widths to confirm the
longer CTA label wraps cleanly at 320, that nothing overlaps the success
panel, and that the two console entries on `waitlist.html` at 1024/1440 are
absent.
