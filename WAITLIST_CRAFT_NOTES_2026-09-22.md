# Waitlist craft pass — 2026-09-22

Scope: `waitlist.html` and `ab2-waitlist.html` only. The two files were
byte-identical before this pass and remain byte-identical after it (ab2 is a
copy of the same page). No other file was touched; nothing committed.

## What changed on each page (identical on both)

**Fonts / offline.** Removed the Google Fonts `<link>` tags (preconnect +
stylesheet request). Both pages now self-host via `@font-face` using the
repo's own `fonts/` files — the same convention `index.html` already uses:
Poppins 300/400/400i/500/600/700, plus Mukta (deva range, weight 300–700) so
the ₹ glyph and any Devanagari render offline. The pages now make zero
network requests beyond the wa.me handoff itself.

**Typography.** Added a real scale on a 16px base (~1.25 ratio):
`--fs-micro` 11px caps/eyebrows, `--fs-small` 13px, `--fs-body` 16px,
`--fs-lead` 18px, `--fs-h3` 17px, `--fs-h2` 22–26px, `--fs-h1` 34–50px,
`--fs-price` 38–54px. Tracking tightens with size (-0.03em display,
+0.14–0.22em micro caps); line-height shrinks with size (1.08 h1 → 1.85
letter body). Running text is capped at `34rem` (~55–70 chars) via a
`.measure` class on hero sub, voice quote, letter body, proof note and
no-pressure. Body weight stays Poppins 300 but small text (labels, hints,
card copy, footer) moved to 400 for legibility at 11–13px.

**Layout.** The page's one job is now unmissable: the offer facts and the
capture form share one gold-bordered card directly under the hero (the
standalone offer card with its scroll-to CTA and the separate
`.cta-section` were merged into `.join-section`). The old `.cta-promise`
chip was removed as redundant — its facts are already in the card. Sticky
nav, `<main>` landmark, `<footer>` kept. Teaser/what grids stay 2-col to
560px, 1-col below. The existing small-phone and short-screen compression
media queries were kept and adapted to the merged card.

**Colour.** One committed accent (gold #c8a96e). Green is now used only
semantically (nav status dot, the "ye hai" column, the success panel);
red/orange only for errors and the "ye nahi" column. The decorative status
divider and green promise chip were removed in favour of a status dot.

**Form.** Was placeholder-as-label with `sr-only` labels; now has real
visible labels ("Your name", "Your WhatsApp number") plus a format hint on
the number field (`aria-describedby`). `type="tel"` + `inputmode="tel"` +
`autocomplete` preserved. `novalidate` added so validation is consistent
and announced instead of split between native bubbles and JS. Per-field
error text in always-rendered `role="alert"` nodes (registered at load, so
insertion announces reliably), `aria-invalid` on the failing input, focus
moved to it, errors clear on `input`. Input font-size raised to 16px so iOS
does not auto-zoom on focus. Focus styles preserved (3px gold-pale
outline, 13.74:1).

**Submit path — before and after.** Unchanged where it matters. Before:
preventDefault, trim name, strip non-digits from number, reject empty name
or number outside 10–13 digits, build
`'Interested in Aham Brahmasmi 2.0\nName: X\nWhatsApp: Y\n\nPlease send me
the course details.'`, then `window.location.href =
'https://wa.me/919179222991?text=' + encodeURIComponent(msg)`. After:
identical endpoint, identical payload, identical validation bounds. What is
new is the chrome around it: on valid submit the button disables, gains a
CSS spinner and reads "Opening WhatsApp…", a `role="status"` line paints
the pending state, and after 1.4s a visible success panel appears with a
retry `<a>` pointing at the same wa.me URL — this is the recovery path for
the silent-failure case (no WhatsApp installed, blocked navigation, or the
visitor returning to the tab). There is no network fetch on this page; the
"loading" state is the handoff itself.

**Motion.** All transitions/animations are transform+opacity only
(translateY lift on buttons/cards, `fadeUp`, spinner rotation). Easing is
`cubic-bezier(0.22,1,0.36,1)` everywhere. `prefers-reduced-motion` now also
disables smooth scroll and the spinner, not just the two animations the old
block covered.

**Copy.** Headline: "End the argument with yourself." (specific promise,
replaces the vaguer "You are not broken / entangled"). Subhead handles the
first objection (is this worth it / what if it's not for me): "A 15-hour
recorded course in Advaita inquiry and modern psychology. Watch the first
lesson tonight, keep it for life, and get a full refund within 14 days if
it is not for you." Button: "Get the course details on WhatsApp" — says
what happens next. No em-dashes in the new copy (the four `—` in the file
are inside CSS/HTML comments). The Hinglish letter, voice quote, and
is/isn't lists were left as-is — that voice is the product.

**Accessibility.** `<main>` landmark added; nav + footer keep their
implicit landmarks. Exactly one `<h1>`; order runs h1 → h2 ("What's
inside", "What it is, honestly", "Ready when you are") → h3 cards — the
"what" section previously had h3 cards under no heading. The join section
is a labelled region (`aria-labelledby="offerLabel"`). No `<img>` elements
exist on the page, so no alt text was needed; decorative icons are
`aria-hidden`.

## Contrast ratios verified (WCAG AA, computed via sRGB luminance)

| Pair | Ratio |
|---|---|
| --text #ede9e2 on --bg #09090c | 16.43:1 |
| --text on --surface #18181d (labels, card heads) | 14.62:1 |
| --text on --bg3 #161619 (input text) | 14.92:1 |
| --text2 #a8a098 on --bg | 7.71:1 |
| --text2 on --surface (facts, success body on green-tint) | 6.86:1 / 5.91:1 |
| --text3 #918a82 on --bg (voice, proof note, footer) | 5.83:1 |
| --text3 on --surface (hints, cta-sub) | 5.19:1 |
| --text3 on --bg3 (placeholders) | 5.30:1 |
| --gold #c8a96e on --bg (links, h1 em) | 8.86:1 |
| --gold on --surface (letter hl) | 7.88:1 |
| --gold on green-bg/surface (retry link) | 6.78:1 |
| --gold-dim #a08550 on --bg (eyebrow, IG link) | 5.65:1 |
| --gold-dim on --surface (teaser icons, separators) | 5.02:1 |
| --green #4ade80 on --bg (nav status) | 11.41:1 |
| --green on --surface ("ye hai" h3) | 10.15:1 |
| --green on green-bg/surface (success title) | 8.74:1 |
| --err #ff9a8a on --bg (form errors) | 9.70:1 |
| --err on --surface (field errors, "ye nahi") | 8.63:1 |
| --bg text on --gold button | 8.86:1 |
| #6a6a6a input border on --bg (non-text) | 3.68:1 |
| --gold-pale focus outline on --bg (non-text) | 13.74:1 |

Everything passes AA normal-text (4.5:1) or the 3:1 non-text floor. The
"ye nahi" column was lightened from #f87171 (6.39:1) to --err #ff9a8a
(8.63:1) to share one error hue.

## Deliberately left alone

- `index.html`, `content_data.js`, `deck_index.js`, `ce-*.js/css`,
  `photo-designs/`, `legacy-renderers/`, `studio-icons/` — generated /
  gate-guarded per the README merge-pipeline note and the task constraint.
- The wa.me endpoint, WhatsApp number, message payload, and validation
  bounds — untouched.
- The Hinglish letter, voice quote, and is/isn't list copy — authentic
  voice, part of the product.
- `.pulse` was dropped (nothing on either page used it); `.fade-up` remains
  defined for any markup that gains it.

## Not verified here

Pages were not opened in a browser or run through any checker from this
worktree (per work rules); HTML/JS was reviewed statically. The lead's
validation pass should confirm zero console errors and that the success
panel appears ~1.4s after a valid submit when wa.me navigation is blocked
(e.g. desktop browser without WhatsApp).
