/* ==========================================================================
   CE touch-edit + sync layer (phone web Studio, owner 2026-09-09)
   Canva-style on iPhone/Android:
   - Long-press (~450ms) on a text block = edit it (contenteditable), tap
     outside to commit. Double-tap works too.
   - Drag = move with magnetic snapping (the desktop engine, driven by
     pointer events that work identically on touch).
   - Saves: writes the edited deck into localStorage (ce_deck_edits) and
     publishes to the SYNC ENDPOINT when configured. The Mac app and the
     web both read that store — one version everywhere.
   - Desktop editing behavior is untouched (dblclick path stays).
   ========================================================================== */
(function () {
  'use strict';
  if (window.__CE_TOUCH_EDIT__) return;
  window.__CE_TOUCH_EDIT__ = true;

  var LONG_PRESS_MS = 430;

  /* ── F-TE01 · the touch-edit session, and its ONE teardown ────────────────
     Every fix below hangs off this state. The layer had no teardown at all:
     a long-press armed `contenteditable="true"`, marked the node
     `.ce-canvas-editing-active` and left it focused, and NOTHING in this file
     owned the way out. index.html's tab handlers, the back button, the drawer,
     the Escape key and the studio close each had their own idea of what
     "leave this screen" means, so a mid-edit tab switch stranded all of it.
     `outsideTap` is registered LAZILY on the entry into a real edit (not at
     load), which is the whole reason this is idempotent: there is exactly one
     live listener per edit session, and teardown() always removes it. */
  var session = { el: null, outsideTap: null };
  var listeners = [];
  /* Observe targets bound by THIS layer, recorded at registration, so teardown
     never has to guess the instrument panel's selector from the inside. */
  var observerTargets = [];
  var observers = [];
  var armSweepTimer = 0;
  var dockEnsureTimer = 0;

  function publishVisualViewport() {
    var vv = window.visualViewport;
    var height = vv ? vv.height : window.innerHeight;
    var inset = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty('--ce-visual-viewport-height', Math.round(height) + 'px');
    document.documentElement.style.setProperty('--ce-keyboard-inset', Math.round(inset) + 'px');
  }
  publishVisualViewport();
  window.addEventListener('resize', publishVisualViewport, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', publishVisualViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', publishVisualViewport, { passive: true });
  }

  /* The ONE resolution of "which stage may a touch edit attach to", shared by
     the arming pass and the teardown so the two can never look at different
     elements. Deliberately NOT a fallback to #studio: see the note on
     armTouchEditing below.

     F-TE01 (touch-edit, 2026-09-23): scope is load-bearing, and a bare
     `document.querySelector` gets it WRONG. The library and the filmstrip render
     30+ `.ce-poem-stage` preview nodes, so the first document-wide match is a
     thumbnail — arming it would put `touch-action:none` on a preview card and
     write the long-press into `state.currentSlideIdx` (the selected slide, not
     the thumbnail's slide), which is the exact bug the note below describes.
     Resolve from the LIVE STUDIO ROOT down, and only accept a stage that
     actually contains the editable the caller is asking about. */
  function activeTouchStage(root, el) {
    var scope = root || document.getElementById('studio') || document;
    var stages = scope.querySelectorAll('#ce-real-stage, .ce-carousel-slide-stage, .ce-postcore-stage, .ce-poem-stage, .ce-studio-post-frame, #active-studio-canvas');
    if (!stages.length) return null;
    if (!el) return stages[0];
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].contains(el)) return stages[i];
    }
    return null;
  }

  /* A shared 'is this ours' test for an outside tap: the element, its grip, the
     studio's own edit affordances (drag handle / block grip) and the draggable
     boxes all count as inside. Kept as one predicate so the dismiss handler and
     the teardown can never disagree about what a tap-outside is. */
  function touchEditInside(el, t) {
    if (!el || !t) return false;
    if (el === t || (el.contains && el.contains(t))) return true;
    return !!(t.closest && t.closest('.ce-block-drag-grip, .ce-drag-handle-bar, .ce-draggable-box'));
  }

  /* F-TE01 (touch-edit, 2026-09-23): the reasons that genuinely DROP an edit.
     'outside' is deliberately NOT one of them — an outside tap is how the blur
     commits on a phone, so it takes the save path, not the warning path. */
  var DROPPING_REASONS = { tab: 1, unmount: 1, close: 1, 'losing-text': 1 };

  /* F-TE01 (touch-edit, 2026-09-23): the honest notice. An abandoned edit is a
     LOSS, and the layer used to lose it in total silence — the node was left
     dirty-looking in the DOM and the record was never written, so the canvas
     showed text a reload would not bring back. The caller says WHY (`reason`),
     this turns that into one sentence naming what happened and what is left.
     A teardown with nothing typed says nothing, because nothing was lost. */
  function notifyEditDrop(el, reason, changed) {
    if (!changed) return;
    if (!window.showAppToast) return;
    if (reason === 'tab') {
      window.showAppToast('Edit discarded — you left the Studio before saving it');
    } else if (reason === 'losing-text') {
      /* The 'input' listener could not be attached, so the 500ms live-save was
         never armed: the text exists only in the DOM node. Discarding is the
         only honest option, and it has to be said out loud. */
      window.showAppToast('Edit discarded — the canvas was replaced before it could be saved');
    } else {
      window.showAppToast('Edit kept in the canvas only — it was not saved before you left');
    }
  }

  /* ── F-TE01 · window.ceTouchEdit.teardown(reason) ────────────────────────
     Safe to call at ANY time, from anywhere, any number of times. It is a
     no-op when no edit is live (so a caller never has to test first), and it
     is the only place that releases what a touch edit acquires:
       1. the pending long-press timer (an in-flight press must not arm a
          contenteditable on a screen the user has already left),
       2. the live contenteditable + .ce-canvas-editing-active class + focus,
       3. the lazily-registered outside-tap dismiss listener,
       4. the armed/dirty bookkeeping on every node of the ACTIVE stage.
     `reason` is 'tab' | 'close' | 'unmount' | anything else — it only decides
     the wording of the notice, never whether the release happens.

     WHAT IT INTENTIONALLY DOES NOT DO: roll back text the user already typed.
     The commit path (scheduleCommit → el.__cePendingText) exists precisely so a
     canvas re-render cannot eat keystrokes, so tearing that down would be the
     data loss this function exists to prevent. If an edit is still dirty the
     drop is REPORTED (notifyEditDrop) rather than silently swallowed — but the
     'input' handler is a listener on the node itself and therefore empty at
     this point; re-reading innerText here would write DOM text back over a
     record that closeStudio is about to save (the poison slideHTML warns about
     at index.html:13054). Honest notice over a silent overwrite. */
  function ceTouchEditTeardown(reason) {
    var el = session.el;
    if (el) {
      if (el.__ceTouchLpTimer) { clearTimeout(el.__ceTouchLpTimer); el.__ceTouchLpTimer = 0; }
      if (el.__ceTouchCommitTimer) { clearTimeout(el.__ceTouchCommitTimer); el.__ceTouchCommitTimer = 0; }
      var wasEditing = el.getAttribute('contenteditable') === 'true';
      /* F-TE01 (touch-edit, 2026-09-23): "changed" is read from the live text,
         NOT from __cePendingText. A keydown Escape commits immediately and
         CLEARS the pending payload before blur ever runs, so a pending-based
         test read every Escape as "nothing was typed" and stayed silent about a
         real edit that was about to be thrown away. */
      var startText = String(el.__ceTouchStartText || '');
      var liveText = '';
      try { if (el.isConnected) liveText = String(el.innerText || el.textContent || '').trim(); } catch (_lt) { liveText = ''; }
      var changed = wasEditing && startText !== liveText;
      /* Blur BEFORE releasing the caret: the 'blur' listener is what commits the
         500ms pending payload, and it is also what lets the OUTSIDE-TAP path
         classify this as an ordinary commit instead of a lost edit. Removing
         `contenteditable` first (the old order) meant blur fired against a node
         that was no longer editable, so `commit()` bailed on its recovery
         branch and a dismissed edit produced no save at all. */
      if (wasEditing) {
        try { el.blur(); } catch (_bl) {}
      }
      el.removeAttribute('contenteditable');
      el.classList.remove('ce-canvas-editing-active');
      if (wasEditing && document.activeElement === el) {
        /* Blur alone leaves WebKit's caret session alive on some iOS builds, so
           the on-screen keyboard outlives the edit; moving focus to the body is
           what dismisses it. */
        try { document.body && document.body.focus({ preventScroll: true }); } catch (_bf) {}
      }
      /* Only a reason that actually DROPS the edit earns a warning. An outside
         tap is the normal way to finish on a phone: the blur above already
         committed it, so warning there would be the layer crying wolf about a
         save it just performed. */
      if (wasEditing && DROPPING_REASONS[reason]) notifyEditDrop(el, reason, changed);
    }
    if (session.outsideTap) {
      document.removeEventListener('pointerdown', session.outsideTap, true);
      session.outsideTap = null;
    }
    session.el = null;
    /* Release the bookkeeping on every node of the LIVE studio root. The arming
       marker is what made this layer refuse to re-arm a node, so a stale marker
       is how a node comes back from another tab as a touch-action:none box that
       answers no gesture at all. Scope matters: the library renders 30+ stage
       previews whose text nodes were never armed, and walking those from the
       document would clear markers this layer never set. */
    var scope = document.getElementById('studio') || document;
    scope.querySelectorAll('[data-ce-block], .kickline[data-ce-edit], #studio-editable-text').forEach(function (n) {
      n.__ceTouchArmed = false;
      n.__ceTouchDirty = false;
      n.__cePendingText = null;
      n.__ceTouchStartText = '';
      if (n.__ceTouchLpTimer) { clearTimeout(n.__ceTouchLpTimer); n.__ceTouchLpTimer = 0; }
      if (n.__ceTouchCommitTimer) { clearTimeout(n.__ceTouchCommitTimer); n.__ceTouchCommitTimer = 0; }
    });
    /* F-TE01 (touch-edit, 2026-09-23): the extension list. Everything this
       layer installs outside its own closures — the sync-discovery pair, the
       tools sheet's Escape/outside-tap pair, the tools observer — is recorded
       at install time and released here, so a teardown really is "nothing of
       mine is still attached". Observers are disconnected for the same reason:
       one that outlives a teardown keeps scheduling sweeps that re-arm a stage
       nothing is editing. */
    /* F-RX1 (touch-edit, 2026-09-23): the phone tools sheet is the layer's ONLY
       portal (the inspector node is moved to `body > aside.ce-tools-sheet` at
       z-sheet/50vh and only `reset()` sends it home), so a route teardown that
       drained its listeners without calling reset() left a detached fixed panel
       with no dismiss and no Escape — exactly the "next Studio item inherits a
       fixed 'Close tools' panel" state ensureDockTools guards against. `reset()`
       is idempotent (restore() no-ops when nothing is portaled), so calling it
       here is safe when no sheet is open, and it runs BEFORE the listener and
       observer drain below so the sheet can never be left attached to a dead
       layer. closeStudio's own reset stays as the second owner. */
    try { window.__CE_RESET_PHONE_TOOLS__ && window.__CE_RESET_PHONE_TOOLS__(); } catch (_rpt) {}
    for (var i = listeners.length - 1; i >= 0; i--) {
      var L = listeners[i];
      try { L.target.removeEventListener(L.type, L.fn, L.opts); } catch (_rl) {}
    }
    listeners.length = 0;
    /* The tools-sheet IIFE is a separate closure and cannot see `listeners`, so
       it hands its pair over through `window.ceTouchEdit.__ext`. Drain it here:
       one teardown, one behaviour, no second copy of the removal logic. */
    var ext = (window.ceTouchEdit && window.ceTouchEdit.__ext) || [];
    for (var k = ext.length - 1; k >= 0; k--) {
      var E = ext[k];
      try {
        if (E.observer) E.observer.disconnect();
        else E.target.removeEventListener(E.type, E.fn, E.opts);
      } catch (_re) {}
    }
    if (ext.length) ext.length = 0;
    /* F-TE20 (touch-edit, 2026-09-23): every flag that guards a listener
       registration must be cleared in the SAME teardown that removes that
       listener. The drain above removes the tools-sheet Escape handler and the
       outside-tap dismiss handler, but those two are gated by flags that
       outlive the removal, so the next re-arm reads "already bound" on a
       listener that no longer exists: after the first tab change Escape was
       dead forever, and the outside tap stayed dead whenever the same toggle
       node was reused (its flag lives on `t`, not in `__ext`, so the drain
       could not reach it). Reset both here so re-arming restores both gestures.
       The observer flag is cleared further below for the same reason. */
    window.__CE_TOOLS_ESC_BOUND__ = false;
    var toggleNode = document.getElementById('ce-tools-toggle');
    if (toggleNode) toggleNode.__ceToolsDismissBound = false;
    /* F-TE01 (touch-edit, 2026-09-23): the tools-sheet observer is the one
       extension that is SINGLETON PER SESSION rather than per install, because
       `window.__CE_DOCK_TOOLS_OBSERVER__` is the flag arm() uses to avoid
       stacking a second one. Disconnecting it without clearing that flag makes
       the next `arm()` a no-op forever: the dock sweep then never runs again,
       which is exactly how the first open kept its toggle wired and every open
       after it did not. Clear the flag so the next route cycle re-arms. */
    /* F-TE20 (touch-edit, 2026-09-23): same invariant as the two flags above —
       the guard is cleared unconditionally, not only when a live observer
       happened to be recorded, so a teardown can never leave the guard set on
       an observer it did not actually install (the MutationObserver guard can
       be set with `__CE_DOCK_TOOLS_OBS__` still null). "Arm once" must mean
       "armed and installed", never "armed at some point in the past". */
    if (window.__CE_DOCK_TOOLS_OBSERVER__) {
      window.__CE_DOCK_TOOLS_OBSERVER__ = false;
      window.__CE_DOCK_TOOLS_OBS__ = null;
    }
    for (var j = observers.length - 1; j >= 0; j--) {
      try { observers[j].disconnect(); } catch (_ro) {}
    }
    observers.length = 0;
    observerTargets.length = 0;
    /* F-TE01 (touch-edit, 2026-09-23): the document observer above is the
       layer's ONLY re-arm signal, so `armSweep` has to be re-armed by hand or
       teardown permanently disables the feature it is meant to clean up after.
       The observer is rebuilt here rather than left running, because a
       teardown that leaves the render signal attached is not a teardown — and
       a teardown that removes it and does not put it back is how the SECOND
       studio open came back with `__ceTouchArmed` undefined and a poem text box
       that answered no long-press at all. */
    armBaseObserver();
    if (armSweepTimer) { clearTimeout(armSweepTimer); armSweepTimer = 0; }
    if (dockEnsureTimer) { clearTimeout(dockEnsureTimer); dockEnsureTimer = 0; }
    return true;
  }
  window.ceTouchEdit = window.ceTouchEdit || {};
  window.ceTouchEdit.teardown = ceTouchEditTeardown;
  window.__CE_TEARDOWN_TOUCH_EDIT__ = ceTouchEditTeardown;

  /* The one-outside-tap dismiss. Registered on ENTRY into an edit and removed
     by teardown(), so it is never stacked: before this, `blur` was the only way
     out on the phone and nothing said where "outside" is, so an edit survived
     until the user happened to tap a control that stole focus. Capture phase,
     so the tap reaches the editor before any studio handler moves the slide.
     An INSIDE tap is left completely alone — it is what places the caret. */
  function armOutsideTap() {
    if (session.outsideTap) return;
    session.outsideTap = function (e) {
      var el = session.el;
      if (!el) { ceTouchEditTeardown('outside'); return; }
      if (touchEditInside(el, e.target)) return;
      ceTouchEditTeardown('outside');
    };
    document.addEventListener('pointerdown', session.outsideTap, true);
  }

  function bridge() {
    return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ceBridge;
  }

  function armTouchEditing(container) {
    if (!container) return;
    /* Only the active authored canvas is editable. The old fallback to the
       whole #studio armed filmstrip thumbnails and look-picker minis; their
       text blocks then received touch-action:none and a long-press wrote into
       state.currentSlideIdx (the selected slide, not the thumbnail's slide).
       A missing stage is safer than arming a preview node. */
    var stage = activeTouchStage(container);
    if (!stage) return;
    var editables = stage.querySelectorAll('[data-ce-block="content"], [data-ce-block="hook"], [data-ce-block="body"], .kickline[data-ce-edit], #studio-editable-text');
    editables.forEach(function (el) {
      /* Belt and braces: an authored stage can nest previews of its own, so
         re-check containment against the stage that will actually be edited. */
      if (!stage.contains(el)) return;
      if (el.__ceTouchArmed) return;
      el.__ceTouchArmed = true;
      el.style.touchAction = 'none';

      var lpFired = false, downPt = null;

      /* F-TE01 (touch-edit, 2026-09-23): the long-press timer lives on the NODE
         (`el.__ceTouchLpTimer`), not in a closure the node's marker cannot
         reach. The closure copy was unreachable from outside, so a press still
         counting down when the user switched tabs had no way to be cancelled
         and armed a contenteditable on a screen the user had already left. */
      el.addEventListener('pointerdown', function (e) {
        if (el.getAttribute('contenteditable') === 'true') return;
        if (e.pointerType === 'mouse') return; // desktop keeps dblclick
        lpFired = false;
        downPt = { x: e.clientX, y: e.clientY };
        clearTimeout(el.__ceTouchLpTimer);
        el.__ceTouchLpTimer = setTimeout(function () {
          el.__ceTouchLpTimer = 0;
          lpFired = true;
          try { navigator.vibrate && navigator.vibrate(12); } catch (_) {}
          var before = window.studioSnapshot ? window.studioSnapshot() : null;
          el.setAttribute('contenteditable', 'true');
          el.classList.add('ce-canvas-editing-active');
          el.focus();
          // place the caret at the tap point
          try {
            var range = document.caretRangeFromPoint ? document.caretRangeFromPoint(downPt.x, downPt.y) : null;
            var sel = window.getSelection();
            if (range && sel) { sel.removeAllRanges(); sel.addRange(range); }
          } catch (_) {}
          el.__ceTouchBefore = before;
          el.__ceTouchStartText = String(el.innerText || el.textContent || '').trim();
          /* F-TE01 (touch-edit, 2026-09-23): the entry marker the teardown
             reads, set exactly once per edit session, then the one outside-tap
             dismiss is armed. */
          session.el = el;
          armOutsideTap();
        }, LONG_PRESS_MS);
      });

      var cancelLP = function (e) {
        if (el.__ceTouchLpTimer && downPt && e.clientX != null &&
            Math.abs(e.clientX - downPt.x) + Math.abs(e.clientY - downPt.y) > 12) {
          clearTimeout(el.__ceTouchLpTimer); el.__ceTouchLpTimer = 0;
        }
      };
      el.addEventListener('pointermove', cancelLP);
      el.addEventListener('pointercancel', function () { clearTimeout(el.__ceTouchLpTimer); el.__ceTouchLpTimer = 0; });

      el.addEventListener('pointerup', function () {
        clearTimeout(el.__ceTouchLpTimer); el.__ceTouchLpTimer = 0;
      });

      // Commit on input (debounced) — the canvas can re-render mid-edit and
      // replace this node, which kills blur; live-save is also Canva-style.
      var commitTimer = 0;
      var commit = function () {
        el.__ceTouchCommitTimer = 0;
        if (window.__CE_TOUCH_TRACE__) console.log('[ce-touch] commit fire', { attr: el.getAttribute('contenteditable'), pending: el.__cePendingText != null });
        commitTimer = 0;
        if (el.getAttribute('contenteditable') !== 'true') {
          // node may have been swapped out mid-edit — recover from cloned text
          if (!el.__cePendingText) return;
        }
        var newText = (el.innerText || el.textContent || '').trim();
        var pending = el.__cePendingText;
        if (pending != null) newText = pending;
        el.__cePendingText = null;
        if (!newText) return;
        var state = window.state;
        var idx = (state && state.currentSlideIdx) || 0;
        var deck = window.studioDeck ? window.studioDeck() : null;
        if (window.__CE_TOUCH_TRACE__) console.log('[ce-touch] commit data', { newText: newText.slice(0, 30), idx: idx, hasDeck: !!(deck && deck.slides), hasState: !!state });
        if (deck && deck.slides && deck.slides[idx]) {
          deck.slides[idx].text = newText;
          deck.slides[idx].html = newText;
          deck.updatedAt = Date.now();
          state.studioDirty = true;
          if (window.__CE_PERSIST_DECK_EDIT__) window.__CE_PERSIST_DECK_EDIT__(deck);
        }
      };
      var scheduleCommit = function () {
        if (el.getAttribute('contenteditable') !== 'true') return;
        el.__ceTouchDirty = true;
        el.__cePendingText = (el.innerText || '').trim();
        clearTimeout(commitTimer);
        commitTimer = setTimeout(commit, 500);
        el.__ceTouchCommitTimer = commitTimer;
      };
      el.addEventListener('input', scheduleCommit);
      el.addEventListener('blur', function () {
        clearTimeout(commitTimer);
        commit();
      });
    });
  }
  window.__CE_ARM_TOUCH_EDITING__ = armTouchEditing;

  /* ---- Persistence + sync -------------------------------------------------
     ce_deck_edits: { deckId: { look, slides, updatedAt } } in localStorage —
     the offline copy the site boots with (your edits survive reload).
     Sync endpoint: the Mac runs the sync server behind a capability path.
     P0-1 (b-core, 2026-09-19): the capability is a PER-INSTALL random token
     that lives only on the Mac (~/.director_os/secrets/ce-sync-capability) —
     it is NOT in this bundle, which is public. Discovery asks the Mac's own
     LAN rail for it same-origin (seed, below), and for the funnel host the
     capability is resolved through the /pair bootstrap or the owner's stored
     ce_sync_endpoint. A bundle that carries no capability is the point.
     Every save POSTs the deck there; the Mac app reads the same store, so both
     sides show ONE version (last-write-wins per deck by updatedAt). */
  var SYNC_PATH = '';   /* P0-1: no capability ships in the public bundle. */
  function ceSyncCapPath() {
    /* The LAN rail seeds `ce_sync_cap` same-origin (Mac-issued, never public).
       A stored endpoint may itself carry the capability (legacy cache) — in
       that case no separate cap is needed. */
    try { return localStorage.getItem('ce_sync_cap') || ''; } catch (_c) { return ''; }
  }
  function ceSyncWithCap(base) {
    /* Append the capability to a bare host/port base when the stored cap is
       not already present in it. A base with no cap and no stored cap is
       returned unchanged so the caller's /health probe fails honestly. */
    var cap = ceSyncCapPath();
    if (!cap) return base;
    if (base.indexOf('/' + cap) >= 0) return base;
    return String(base).replace(/\/+$/, '') + '/' + cap;
  }

  /* Share mode is URL-marked ONLY (Atlas MC-2 root fix, 2026-09-10): the
     owner's root URL is ALWAYS the full app. Manager links carry #share
     (?share=1 also accepted) and get the trimmed read-only view + icon rail.
     Keying this on the stored write key locked the OWNER out — never again. */
  try {
    if (/(#|\?|&)share(=1)?\b/.test(location.hash + ' ' + location.search)) {
      document.documentElement.classList.add('ce-share');
    }
  } catch (_) {}
  /* Anti-flicker veil: paint the app background instantly, lift after the
     first library render settles (owner: "when I open it first it flickers"). */
  try {
    if (!document.getElementById('ce-boot-veil')) {
      var v = document.createElement('style');
      v.id = 'ce-boot-veil-style';
      v.textContent = '#ce-boot-veil{position:fixed;inset:0;z-index:var(--z-veil);background:#121016;transition:opacity .25s ease}';
      document.documentElement.appendChild(v);
      var veil = document.createElement('div');
      veil.id = 'ce-boot-veil';
      document.body ? document.body.appendChild(veil) : document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(veil); });
      window.__CE_LIFT_VEIL__ = function () {
        var el = document.getElementById('ce-boot-veil');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); var st = document.getElementById('ce-boot-veil-style'); st && st.remove(); }, 300);
      };
      /* Lift sources: the app source calls __CE_LIFT_VEIL__ the moment the
         first real rail faces mount + paint (ceLiftBootVeil). The timers
         here are only safety nets — long enough that the data-driven lift
         wins on a healthy boot, short enough that a broken boot still
         reveals the app. */
      setTimeout(function () { window.__CE_LIFT_VEIL__ && window.__CE_LIFT_VEIL__(); }, 6000);
      /* F-TE01 (touch-edit, 2026-09-23): the backstop only exists to catch a
         boot whose data-driven lift never ran. Leaving it attached means it
         fires on a `load` that can happen long after boot — i.e. it re-lifts a
         veil that has nothing to do with it. Self-removing, and recorded in the
         extension list so nothing this layer installs is invisible to it. */
      var veilLoadBackstop = function () {
        setTimeout(function () { window.__CE_LIFT_VEIL__ && window.__CE_LIFT_VEIL__(); }, 3500);
        window.removeEventListener('load', veilLoadBackstop);
      };
      window.addEventListener('load', veilLoadBackstop);
    }
  } catch (_) {}
  /* iOS-style edge gesture (owner 2026-09-11: "I want to move back… put my
     finger on left side and sweep right so it should move back like how iOS
     app works cleanly").
     Two defects lived here and they were the same defect:
       1. the ONLY nav-back gesture was a TWO-FINGER swipe (index.html
          installAppBackGesture), which nobody discovers;
       2. THIS handler claimed the natural ONE-FINGER left-edge swipe and spent
          it opening the nav drawer.
     So the owner's instinctive back-swipe popped the drawer and back never
     fired — he read that as "the sidebar keeps opening weirdly" AND "back does
     not work". One finger from the left edge now behaves like iOS: go BACK when
     there is anywhere to go back to (studio open → close it; any other tab →
     Library), and open the drawer only when back has nothing to do — i.e. at
     the Library root, which is where a drawer makes sense. Two-finger swipes
     and the desktop trackpad gesture are untouched, and a gesture that begins
     on a horizontal rail/track is left to that rail. */
  try {
    var CE_EDGE_PX = 24;
    var edgeStart = null;
    var edgeFired = false;
    var edgeIsRail = function (t) {
      return !!(t && t.closest && t.closest('[data-ce-horizontal-scroll], .ce-carousel-slide-scroll, .ce-filmstrip-track, .ce-rail-track, .ce-look-picker, .ce-hook-options-list'));
    };
    document.addEventListener('touchstart', function (e) {
      edgeFired = false;
      edgeStart = null;
      if (!e.touches || e.touches.length !== 1) return;
      var t = e.touches[0];
      if (t && t.clientX <= CE_EDGE_PX && !edgeIsRail(e.target)) edgeStart = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!edgeStart || edgeFired) return;
      var t = e.touches && e.touches[0];
      if (!t) return;
      var dy = t.clientY - edgeStart.y;
      if (Math.abs(dy) > 60) { edgeStart = null; return; }   // vertical scroll is never ours
      if (t.clientX - edgeStart.x <= 40) return;
      edgeFired = true;
      edgeStart = null;
      try { e.preventDefault(); } catch (_) {}
      /* Owner law 2026-09-13 (deep audit P1-4). This used to call the MUTATING
         __CE_APP_BACK__() and `return` on its truthiness, so the drawer branch below
         was UNREACHABLE whenever history was non-empty — the nav drawer could only be
         opened by an edge swipe right after boot, or after a previous back had
         consumed the single entry. A mis-swipe near the left edge also silently
         navigated him out of the panel he was reading, and the swipe that followed
         opened the drawer instead of undoing it.
         Ask the READ-ONLY depth query first (window.__CE_NAV_HISTORY_DEPTH__, exposed
         for exactly this purpose and, until now, called from nowhere): with a step to
         undo, undo it; with nothing to undo, the swipe opens the drawer. The drawer is
         therefore never contingent on navigation state. */
      var navDepth = 0;
      try { if (typeof window.__CE_NAV_HISTORY_DEPTH__ === 'function') navDepth = Number(window.__CE_NAV_HISTORY_DEPTH__()) || 0; } catch (_dep) {}
      /* Studio is itself the topmost route even when its tab trail is empty.
         A fresh card-open therefore has navDepth=0; sending that edge swipe to
         the drawer branch opened an invisible z-115 drawer beneath Studio z-200
         and stripped the Studio background inert state. Close Studio first. */
      var studioOpen = false;
      try { studioOpen = !!document.querySelector('#studio.open'); } catch (_studioProbe) {}
      if (studioOpen) {
        try { if (typeof window.__CE_APP_BACK__ === 'function') window.__CE_APP_BACK__(); } catch (_studioBack) {}
        return;
      }
      if (navDepth > 0) {
        var wentBack = false;
        try { if (typeof window.__CE_APP_BACK__ === 'function') wentBack = !!window.__CE_APP_BACK__(); } catch (_b) {}
        if (wentBack) return;
      }
      var sb = document.querySelector('.sidebar');
      if (sb && sb.classList.contains('collapsed')) {
        var tg = document.getElementById('sidebar-toggle');
        tg && tg.click();
      }
    }, { passive: false });
    var edgeReset = function () { edgeStart = null; };
    document.addEventListener('touchend', edgeReset, { passive: true });
    document.addEventListener('touchcancel', edgeReset, { passive: true });
  } catch (_) {}
  // W7: honest degradation — when the Mac is unreachable (in-app Chromium
  // webviews deny Local-Network-Access, Mac asleep, cellular), never leave a
  // silent dead button. Surface the manual route once and record the mode.
  window.__CE_SYNC_UNREACHABLE__ = false;
  /* F-DUR (hank/ce-touch-edit, 2026-09-22): the toast latch is separate from
     the unreachable STATE. The state is refreshed on every failure (so
     ce_last_sync_error always names the newest cause); the toast fires once
     per outage and the latch resets only when a sync actually succeeds, so
     a NEW outage is reported instead of being swallowed by the last one's. */
  var unreachableToastShown = false;
  function markUnreachable(mode) {
    window.__CE_SYNC_UNREACHABLE__ = true;
    try { localStorage.setItem('ce_last_sync_error', mode + ' @ ' + new Date().toISOString()); } catch (_) {}
    if (unreachableToastShown) return;
    unreachableToastShown = true;
    /* Queued edits are named in the failure toast — a count that exists but
       is never surfaced is the same lie as the count not existing. */
    var queued = 0;
    try { queued = countUnsyncedEdits(); } catch (_q) { queued = 0; }
    window.__CE_UNSYNCED_EDITS__ = queued;
    if (window.showAppToast) window.showAppToast(
      queued > 0
        ? 'Mac unreachable — ' + queued + (queued === 1 ? ' edit' : ' edits') + ' queued'
        : 'Mac unreachable — open in Safari or use Download-for-phone');
    console.warn('[ce-sync] unreachable:', mode);
  }
  var reachFlapGuard = 0;
  function markReachable() {
    // flap guard (audit 9.14): only clear when actually flagged, and not
    // more than once a minute.
    if (!window.__CE_SYNC_UNREACHABLE__) return;
    /* F-05 (cloud/ce-ui, 2026-09-21): a single successful call is NOT proof the
       phone is in sync — edits can still be queued behind it. Only report
       healthy when nothing is waiting; otherwise name the real pending count
       so the surface cannot claim a sync it has not performed. */
    var pending = 0;
    try { pending = countUnsyncedEdits(); } catch (_c) { pending = 0; }
    if (pending > 0) {
      window.__CE_UNSYNCED_EDITS__ = pending;
      try { localStorage.setItem('ce_last_sync_error', 'pending-edits @ ' + new Date().toISOString()); } catch (_) {}
      if (window.showAppToast) window.showAppToast(pending === 1 ? '1 edit still waiting for your Mac' : pending + ' edits still waiting for your Mac');
      return;
    }
    window.__CE_UNSYNCED_EDITS__ = 0;
    var now = Date.now();
    if (now - reachFlapGuard < 60000) return;
    reachFlapGuard = now;
    window.__CE_SYNC_UNREACHABLE__ = false;
    unreachableToastShown = false;   /* proven reachability re-arms the one-toast-per-outage latch */
    try { localStorage.removeItem('ce_last_sync_error'); } catch (_) {}
  }
  function findSyncEndpoint(cb) {
    /* P0-1 pairing bootstrap: a device holding the WRITE KEY (pasted once from
       the Mac — the high-privilege secret) may ask the funnel's /pair door for
       the capability. A visitor without the key gets 404 and learns nothing;
       the bundle itself carries no capability, so reading the public JS is
       worth nothing. Resolves the legacy "capability in the bundle" exposure. */
    var CE_FUNNEL_HOST = 'https://tushars-macbook-air.tail697d80.ts.net';
    function pairViaFunnel(done) {
      var key = getWriteKey();
      if (!key) { done(false); return; }
      fetch(CE_FUNNEL_HOST + '/pair', { mode: 'cors', headers: { 'X-CE-Sync-Key': key } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.ok && j.cap) {
            try {
              localStorage.setItem('ce_sync_cap', String(j.cap));
              localStorage.setItem('ce_sync_endpoint', CE_FUNNEL_HOST + '/' + j.cap);
            } catch (_s) {}
            done(true);
          } else done(false);
        })
        .catch(function () { done(false); });
    }
    function discover() {
      var cands = [];
      if (location.hostname === 'doalfaaz.github.io' || location.protocol === 'file:') {
        /* P0-1: the public door carries no capability anymore. The funnel is
           still the transport, but the path must be resolved at pair time:
           the owner's device stores ce_sync_endpoint once (seeded by the Mac
           through the LAN rail, or entered via the pairing flow below) and it
           is revalidated by the cached-endpoint probe. A brand-new public
           visitor resolves nothing — by design. */
        cands = [];
        var cachedEp = '';
        try { cachedEp = localStorage.getItem('ce_sync_endpoint') || ''; } catch (_e) {}
        if (cachedEp) cands.push(cachedEp.replace(/\/+$/, ''));
        if (!cands.length && getWriteKey()) {
          // Owner device that has never paired on this origin (or lost its
          // cache): ask the funnel for the capability, then proceed.
          pairViaFunnel(function (ok) {
            if (!ok) { markUnreachable('discovery-failed'); cb(null); return; }
            window.__CE_SYNC_ENDPOINT__ = localStorage.getItem('ce_sync_endpoint') || '';
            cb(window.__CE_SYNC_ENDPOINT__ || null);
          });
          return;
        }
      } else if (/^https?:\/\/(localhost|127\.|192\.168\.|10\.)/.test(location.origin)) {
        // LAN rail / loopback dev. First candidate: the rail's same-origin
        // /ce-sync proxy (this is what the seed stores, so a missing cache
        // still resolves); second: direct loopback for local dev. Capability
        // appended from the Mac-issued ce_sync_cap seed (never a bundle
        // constant — P0-1).
        var cap = ceSyncCapPath();
        var lanProxy = location.origin.replace(/\/+$/, '') + '/ce-sync' + (cap ? '/' + cap : '');
        var direct = ceSyncWithCap(location.origin.replace(/:\d+$/, ':4145'));
        cands = [lanProxy, direct];
      }
      var i = 0;
      var tryNext = function () {
        if (i >= cands.length) { markUnreachable('discovery-failed'); cb(null); return; }
        var base = cands[i++];
        fetch(base + '/health', { mode: 'cors' })
          .then(function (r) { return r.ok ? base : null; })
          .then(function (ok) {
            if (ok) {
              try { localStorage.setItem('ce_sync_endpoint', ok); } catch (_) {}
              cb(ok);
            } else tryNext();
          })
          .catch(function () { tryNext(); });
      };
      tryNext();
    }
    // Endpoint sticks across reloads once discovered — but revalidate the
    // cached value once per boot so a dead endpoint never wedges sync.
    try {
      var cached = localStorage.getItem('ce_sync_endpoint');
      if (cached && !findSyncEndpoint.revalidated) {
        findSyncEndpoint.revalidated = true;
        fetch(cached + '/health', { mode: 'cors' })
          .then(function (r) {
            if (r.ok) { window.__CE_SYNC_ENDPOINT__ = cached; cb(cached); }
            else { try { localStorage.removeItem('ce_sync_endpoint'); } catch (_) {} discover(); }
          })
          .catch(function () {
            try { localStorage.removeItem('ce_sync_endpoint'); } catch (_) {}
            discover();
          });
        return;
      }
    } catch (_) {}
    if (window.__CE_SYNC_ENDPOINT__) { cb(window.__CE_SYNC_ENDPOINT__); return; }
    discover();
  }
  // OWNER LAW / AUDIT FIX (2026-09-11): public visitors must not probe the
  // private sync endpoint at page load. A device that already holds the owner's
  // sync key is different: its cached endpoint is revalidated by the owner-boot
  // arm below, then one remote pull runs without waiting for a gesture. No key
  // means no private-network request; the static bundle remains the visitor path.
  // Discover lazily for public visitors: every sync action still requires an
  // interaction first, and `window.__CE_SYNC_ENDPOINT__` short-circuits once
  // resolved (see the guard inside findSyncEndpoint).
  var __ceSyncDiscoveryArmed = false;
  function armSyncDiscovery() {
    if (__ceSyncDiscoveryArmed) return;
    __ceSyncDiscoveryArmed = true;
    findSyncEndpoint(function (base) { if (base) window.__CE_SYNC_ENDPOINT__ = base; });
  }
  window.__CE_ARM_SYNC__ = armSyncDiscovery;
  /* F-TE01 (touch-edit, 2026-09-23): `{ once: true, passive: true }` on a
     listener registry that is never torn down. `once` removes the listener
     after the first invocation, but a listener that has NOT yet fired keeps
     its slot for the life of the page — and armSyncDiscovery is made
     idempotent by its own flag below, so the `once` was never load-bearing.
     Recorded through on() so the teardown has one list to walk. */
  var on = function (target, type, fn, opts) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, fn, opts);
    listeners.push({ target: target, type: type, fn: fn, opts: opts });
  };
  on(document, 'pointerdown', armSyncDiscovery, { passive: true });
  on(document, 'keydown', armSyncDiscovery, { passive: true });
  // A stale cached endpoint is still revalidated lazily, on the same trigger.
  // Owner sync is different from public-visitor discovery: when this device
  // already holds the write key and an endpoint cache, pull once on boot so
  // Mac-authored edits are visible without requiring a sacrificial tap.
  function armOwnerSyncOnBoot() {
    if (!getWriteKey()) return;
    findSyncEndpoint(function (base) {
      if (!base) return;
      window.__CE_SYNC_ENDPOINT__ = base;
      pullOwnerSyncOnce();
    });
  }
  function pullOwnerSyncOnce() {
    if (window.__CE_SYNC_BOOT_PULL_STARTED__) return;
    window.__CE_SYNC_BOOT_PULL_STARTED__ = true;
    if (typeof pullRemoteEdits === 'function') pullRemoteEdits();
  }
  setTimeout(armOwnerSyncOnBoot, 350);

  /* ---- Write key (P0-2) ---------------------------------------------------
     Writes on the sync server require the shared write key (X-CE-Sync-Key
     header, always — never a URL param, see the 2026-09-22 note below).
     The owner pastes it ONCE via prompt(); it lives in
     localStorage `ce_sync_key`. This helper is for WRITES: the server now
     key-gates the data reads too (/bank, /schedule-requests, /decks), so a
     caller that needs one of those must send the same key — see
     ops/ce_deck_sync.py do_GET (WL1696). */
  function getWriteKey() {
    try { return localStorage.getItem('ce_sync_key') || ''; } catch (_) { return ''; }
  }
  function ensureWriteKey(cb) {
    var k = getWriteKey();
    if (k) { cb(k); return; }
    var entered = '';
    try { entered = window.prompt('Paste your CE sync write key (one time):', '') || ''; } catch (_) {}
    if (!entered) { cb(''); return; }
    try { localStorage.setItem('ce_sync_key', entered.trim()); } catch (_) {}
    cb(entered.trim());
  }
  /* BANK-TRUTH (saved-bank lane, 2026-09-21): the Saved Bank's unpaired empty
     state offers "Pair this device" — it must run THIS prompt, not a second
     copy of the pairing flow. One pairing path, one place to fix it. */
  window.__CE_ENSURE_WRITE_KEY__ = ensureWriteKey;

  var persistFailToastShown = false;
  window.__CE_PERSIST_DECK_EDIT__ = function (deck) {
    if (!deck || !deck.id) return;
    var store = {};
    try { store = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) {}
    store[deck.id] = {
      look: deck.look,
      title: deck.title,
      slides: deck.slides,
      updatedAt: Date.now()
    };
    var persistFailed = false;
    try { localStorage.setItem('ce_deck_edits', JSON.stringify(store)); } catch (_) {
      persistFailed = true;
      /* BO: a failed localStorage write meant the edit lived only in memory —
         a reload silently lost it while the UI read as if it were kept. Record
         the state so a surface can warn. */
      window.__CE_PERSIST_LAST_ERROR__ = 'localstorage-write-failed @ ' + new Date().toISOString();
      try { console.warn('[ce-sync] deck edit persisted in memory only — localStorage write failed'); } catch (_w) {}
      /* F-DUR (hank/ce-touch-edit, 2026-09-22): the diagnostic flag above was
         written for nothing to read — the user saw a normal save while the
         edit could not survive a reload. This is NOT a Mac-reachability
         failure, so it gets its own honest line, once per failure episode
         (a later successful write re-arms it). */
      if (!persistFailToastShown) {
        persistFailToastShown = true;
        /* F-DUR (hank/ce-touch-edit, 2026-09-22): __CE_PERSIST_LAST_ERROR__ was
           WRITTEN above and read by NOTHING in the repo (grep: 1 live write,
           0 reads) — a diagnostic the owner never sees is the silent failure
           it was meant to expose. Surface it on the SAME toast, not a new
           mechanism: the recorded cause is appended so the user sees WHY the
           edit will not survive a reload. */
        var persistCause = window.__CE_PERSIST_LAST_ERROR__ || 'localstorage-write-failed';
        if (window.showAppToast) window.showAppToast('Edit kept in memory only — storage full; it will not survive a reload (' + persistCause + ')');
      }
    }
    if (!persistFailed) persistFailToastShown = false;
    if (!window.__CE_SYNC_ENDPOINT__) {
      /* BO: no endpoint meant the edit stayed local with no signal at all —
         expose the count of pushed-but-unsynced edits so the shelf surface can
         say "N edits waiting for your Mac".
         F-B04: this used to be `+= 1`, an INCREMENT — so the number was a count
         of write ATTEMPTS, not of records still waiting, and it could never go
         down when a drain succeeded. It is now recomputed from the store, which
         is the thing the claim is actually about. */
      window.__CE_UNSYNCED_EDITS__ = countUnsyncedEdits();
      return;
    }
    /* F-08 (cloud/ce-ui, 2026-09-21): an oversize-guard + 403-retry `attempt`
       chain and its `send`/payload scaffolding used to sit here and were NEVER
       called — this path delegates to pushDeckEdit (below), which owns the same
       guard chain for both the write and the drain. Dead protection reads as
       protection, so it is gone rather than left unreachable. */
    pushDeckEdit(deck.id, store[deck.id], null);
  };

  /* ── F-B04 · the push chain, extracted so the DRAIN can reuse it ───────────
     `done(status)` is called with:
        'ok'     the server took this edit
        'stale'  the server kept an OLDER copy (LWW loss) — still waiting
        'fail'   rejected or unreachable — still waiting
     The counter is refreshed from the store in every terminal branch, so no
     single write can clear a count that belongs to other records. */
  function pushDeckEdit(deckId, record, done) {
    var payload = { deckId: deckId, deck: record };
    var base = window.__CE_SYNC_ENDPOINT__;
    function send(key, viaGet) {
      var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      /* F-SEC (audit 2026-09-22): the GET fallback carried the write key as `&k=`
         in the URL, so every fallback write put a live credential into browser
         history, the server request line and any proxy log. The server accepts
         `X-CE-Sync-Key` on GET (ce-lan-serve.py advertises it in
         Access-Control-Allow-Headers and _proxy forwards it), so the key travels
         as a header on BOTH verbs and never in the URL. */
      /* F-DUR (hank/ce-touch-edit, 2026-09-22): a fetch whose promise never
         settled used to wedge the whole chain — neither .then nor .catch
         ran, drainInFlight stayed true, and every later retry was blocked
         while the edit looked saved. Every write is now capped at 15s: the
         AbortController cancels the request where supported, and the race
         settles the promise even where it is not. A timeout resolves to a
         marked result ({timeout:true}) so the caller records the real cause
         and treats it exactly like a network failure — GET fallback, edit
         stays queued, drain releases. */
      var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
      var reqOpts = viaGet
        ? { headers: key ? { 'X-CE-Sync-Key': key } : {} }
        : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key }, body: JSON.stringify(payload) };
      if (ctrl) reqOpts.signal = ctrl.signal;
      var req = fetch(base + (viaGet ? '/set?d=' + encodeURIComponent(b64) : '/decks'), reqOpts).then(
        function (r) {
          return r.text().then(
            function (txt) {
              var body = null;
              try { body = txt ? JSON.parse(txt) : null; } catch (_pe) { body = null; }
              return { status: r.status, body: body };
            },
            function () { return { status: r.status, body: null }; }
          );
        },
        function (err) {
          if (ctrl && ctrl.signal && ctrl.signal.aborted) return { status: 0, timeout: true };
          if (err && err.name === 'AbortError') return { status: 0, timeout: true };
          return null;
        }
      );
      var timeoutP = new Promise(function (resolve) {
        var t = setTimeout(function () {
          try { if (ctrl) ctrl.abort(); } catch (_ab) {}
          resolve({ status: 0, timeout: true });
        }, 15000);
        req.then(function () { clearTimeout(t); }, function () { clearTimeout(t); });
      });
      return Promise.race([req, timeoutP]);
    }
    var GET_SET_MAX_JSON_BYTES = 45056;
    function attempt(key, viaGet) {
      if (viaGet) {
        var jsonBytes = 0;
        try {
          var json = JSON.stringify(payload);
          jsonBytes = (typeof TextEncoder === 'function')
            ? new TextEncoder().encode(json).length
            : encodeURIComponent(json).replace(/%[0-9A-Fa-f]{2}/g, 'x').length;
        } catch (_b) {}
        if (jsonBytes > GET_SET_MAX_JSON_BYTES) {
          markUnreachable('deck-too-large-for-phone-sync');
          return Promise.resolve({ status: 0, oversize: true });
        }
      }
      return send(key, viaGet).then(function (res) {
        if (res && res.status === 403) {
          try { localStorage.removeItem('ce_sync_key'); } catch (_) {}
          return new Promise(function (resolve) {
            ensureWriteKey(function (newKey) {
              if (!newKey) { resolve(null); return; }
              attempt(newKey, viaGet).then(resolve);
            });
          });
        }
        if ((!res || res.timeout) && !viaGet) return attempt(key || getWriteKey(), true);
        return res;
      });
    }
    attempt(getWriteKey(), false).then(function (res) {
      if (!res || !res.status || res.status >= 400) {
        /* The oversize branch already recorded its precise cause; do not
           overwrite 'deck-too-large-for-phone-sync' with a generic miss. */
        if (!(res && res.oversize)) {
          markUnreachable(res && res.timeout ? 'timeout' : 'write-rejected-' + (res && res.status ? res.status : 'network'));
        }
        if (done) done('fail');
        return;
      }
      if (res.body && res.body.stale === true) {
        markUnreachable('edit-superseded-by-newer-remote-copy');
        if (done) done('stale');
        return;
      }
      markReachable();
      window.__CE_UNSYNCED_EDITS__ = countUnsyncedEdits();
      if (done) done('ok');
    }).catch(function () {
      markUnreachable('write-failed');
      if (done) done('fail');
    });
  }

  /* How many records in ce_deck_edits are NOT yet known to the Mac. The pull
     path records what the server last served in `ce_deck_synced_at` (id ->
     updatedAt), so "waiting" is local.updatedAt > synced[id] — the same
     comparison the drain uses, so the number and the action can never disagree. */
  function countUnsyncedEdits() {
    var store = {}, synced = {};
    try { store = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) { return 0; }
    try { synced = JSON.parse(localStorage.getItem('ce_deck_synced_at') || '{}'); } catch (_) {}
    var n = 0;
    Object.keys(store).forEach(function (id) {
      var mine = (store[id] && store[id].updatedAt) || 0;
      if (mine > (synced[id] || 0)) n++;
    });
    return n;
  }

  /* The drain. Walks every waiting record and re-pushes it, oldest first, and
     STOPS at the first failure — an unreachable Mac must not be hammered, and a
     partially-drained queue is reported honestly rather than zeroed. Runs only
     on the reachability transition (see pullRemoteEdits), which is the moment
     the endpoint is proven live. */
  var drainInFlight = false;
  function drainUnsyncedEdits() {
    if (drainInFlight || !window.__CE_SYNC_ENDPOINT__) return;
    var store = {}, synced = {};
    try { store = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) { return; }
    try { synced = JSON.parse(localStorage.getItem('ce_deck_synced_at') || '{}'); } catch (_) {}
    var waiting = Object.keys(store).filter(function (id) {
      return ((store[id] && store[id].updatedAt) || 0) > (synced[id] || 0);
    }).sort(function (a, b) { return (store[a].updatedAt || 0) - (store[b].updatedAt || 0); });
    if (!waiting.length) { window.__CE_UNSYNCED_EDITS__ = 0; return; }
    drainInFlight = true;
    var i = 0;
    (function next() {
      if (i >= waiting.length) {
        drainInFlight = false;
        window.__CE_UNSYNCED_EDITS__ = countUnsyncedEdits();
        return;
      }
      var id = waiting[i++];
      pushDeckEdit(id, store[id], function (status) {
        if (status !== 'ok') {
          /* Stopped — the Mac is not taking writes right now. Leave the rest
             queued; the next successful pull tries again. */
          drainInFlight = false;
          window.__CE_UNSYNCED_EDITS__ = countUnsyncedEdits();
          return;
        }
        try {
          synced[id] = store[id].updatedAt;
          localStorage.setItem('ce_deck_synced_at', JSON.stringify(synced));
        } catch (_) {}
        next();
      });
    })();
  }
  window.__CE_DRAIN_UNSYNCED_EDITS__ = drainUnsyncedEdits;

  // Boot: re-apply locally-edited decks over the static payload so the site
  // shows YOUR version, and keep the arm hook attached to every canvas render.
  function applyLocalEdits() {
    var store = {};
    try { store = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) { return; }
    /* A2-P2-1 (prime audit): no supersede guard meant a deck deleted from
       the library was RESURRECTED into __CE_DECKS_FULL__ by its stale local
       edit on every boot. Overlay only decks the baked payloads still know
       (static index or share-decks full payload). A deck created on the Mac
       after the last bake is not lost: pullRemoteEdits brings it, with its
       edits, from the live sync store. */
    var known = {};
    try { (window.__STATIC_DECK_INDEX__ || []).forEach(function (d) { if (d && d.id) known[String(d.id)] = 1; }); } catch (_) {}
    try { ((window.__CE_FULL_DECKS__ || {}).decks || []).forEach(function (d) { if (d && d.id) known[String(d.id)] = 1; }); } catch (_) {}
    Object.keys(store).forEach(function (id) {
      var rec = store[id];
      if (!rec || !Array.isArray(rec.slides) || !rec.slides.length) return;
      if (!known[id]) { try { delete store[id]; } catch (_) {} return; }
      window.__CE_DECKS_FULL__ = window.__CE_DECKS_FULL__ || {};
      window.__CE_DECKS_FULL__[id] = Object.assign({}, window.__CE_DECKS_FULL__[id] || {}, rec, { id: id });
    });
    // Persist the purge so ghost records do not re-grow every boot.
    try { localStorage.setItem('ce_deck_edits', JSON.stringify(store)); } catch (_) {}
  }
  applyLocalEdits();

  // Pull remote edits (from the Mac app) so the phone shows the app's version.
  // Runs on boot and every 60s while the page is visible. Three consecutive
  // failed pulls (P0-3) clear the cached endpoint and re-run discovery — a
  // stale endpoint can never wedge sync permanently.
  var pullFailures = 0;
  function healEndpointIfDead() {
    if (pullFailures < 3) return;
    try { localStorage.removeItem('ce_sync_endpoint'); } catch (_) {}
    window.__CE_SYNC_ENDPOINT__ = null;
    /* F-06 (cloud/ce-ui, 2026-09-21): this used to reset pullFailures to 0
       BEFORE the caller tested `pullFailures === 0`, so a third consecutive
       failed pull made the app declare the unreachable Mac reachable and
       delete its own error record. Reset the counter only AFTER the caller has
       decided reachability from the pre-heal value; the error record stays in
       place until a genuinely successful pull clears it. */
    /* BO-P8: the silent re-discovery could leave the owner staring at a stale
       deck with no error state — name it once per heal. */
    if (window.showAppToast) window.showAppToast('Mac still unreachable — showing your last synced copy');
    findSyncEndpoint(function (b) { if (b) window.__CE_SYNC_ENDPOINT__ = b; });
  }
  function healResetPullFailures() { pullFailures = 0; }
  function pullRemoteEdits() {
    // F-02: reads are key-gated. Share visitors (no key) skip silently —
    // they read the static share-decks payload, never the private store.
    if (!window.__CE_SYNC_ENDPOINT__ || document.hidden) return;
    var key = getWriteKey();
    if (!key) return;
    var base = window.__CE_SYNC_ENDPOINT__;
    /* F-DUR (hank/ce-touch-edit, 2026-09-22, sibling of the write-path fix): a
       pull whose fetch never settles left the phone on a stale deck with NO
       signal — `pullFailures` stayed flat, `markUnreachable` never fired, and
       the UI read as if the copy were current. Every pull is now capped at 15s:
       the AbortController cancels the request where supported (the same pattern
       as pushDeckEdit's send), and the abort lands in the existing .catch below,
       so it takes the normal failure path (name the cause, heal, retry). The
       success path is unchanged. */
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    var pullOpts = { headers: { 'X-CE-Sync-Key': key } };
    if (ctrl) pullOpts.signal = ctrl.signal;
    var pullTimer = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (_ab) {} }, 15000);
    fetch(base + '/decks', pullOpts)
      .then(function (r) { clearTimeout(pullTimer); return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.decks) { pullFailures++; markUnreachable('pull-' + pullFailures); healEndpointIfDead(); healResetPullFailures(); return; }
        pullFailures = 0;
        markReachable();
        var local = {};
        try { local = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) {}
        /* F-B04: a pull that SUCCEEDED is proof the Mac is reachable — the one
           moment a stranded edit can be expected to land. Record what the server
           just served (so "waiting" has a real baseline) and drain the queue.
           This is the path that did not exist: before it, a phone edit made
           while the Mac was away waited forever. */
        try {
          var syncedNow = {};
          try { syncedNow = JSON.parse(localStorage.getItem('ce_deck_synced_at') || '{}'); } catch (_) {}
          Object.keys(data.decks).forEach(function (id) {
            var r = data.decks[id];
            if (r && (r.updatedAt || 0) > (syncedNow[id] || 0)) syncedNow[id] = r.updatedAt || 0;
          });
          localStorage.setItem('ce_deck_synced_at', JSON.stringify(syncedNow));
        } catch (_) {}
        drainUnsyncedEdits();
        Object.keys(data.decks).forEach(function (id) {
          var remote = data.decks[id];
          var mine = local[id];
          if (remote && Array.isArray(remote.slides)) {
            if (!mine || (remote.updatedAt || 0) > (mine.updatedAt || 0)) {
              local[id] = remote;
              window.__CE_DECKS_FULL__ = window.__CE_DECKS_FULL__ || {};
              window.__CE_DECKS_FULL__[id] = Object.assign({}, window.__CE_DECKS_FULL__[id] || {}, remote, { id: id });
              // P1: tell the owner when the OPEN deck just changed underneath
              // him (one version everywhere). Reopening the deck serves the
              // fresh version; a dirty canvas is never touched mid-edit.
              try {
                var st = window.state;
                var openId = st && st.currentItem && String(st.currentItem.id || '');
                if (openId && openId === id && !st.studioDirty &&
                    typeof window.showAppToast === 'function') {
                  window.showAppToast('Updated from your Mac/phone');
                }
              } catch (_) {}
            }
          }
        });
        try { localStorage.setItem('ce_deck_edits', JSON.stringify(local)); } catch (_) {}
      })
      .catch(function (err) {
        clearTimeout(pullTimer);
        pullFailures++;
        markUnreachable((err && err.name === 'AbortError') ? 'pull-timeout' : 'pull-network');
        healEndpointIfDead();
        healResetPullFailures();
      });
  }
  // test/probe hook (final refinement): deterministic pull for E2E checks
  window.__CE_PULL_REMOTE_EDITS__ = pullRemoteEdits;
  setTimeout(pullOwnerSyncOnce, 1200);
  setInterval(pullRemoteEdits, 60000);


  /* ---- Schedule from phone (owner 2026-09-09) ----------------------------
     The phone queues a schedule request to the Mac's engine via the sync
     server. Laws enforced in three layers: this UI (date min = today+7),
     the sync server (server-side week-out + IG-cap checks), and the Mac
     scheduling engine (the only token holder). Schedule-only — there is no
     publish-now anywhere in this path. */
  var SYNC_IST = '+05:30';
  function istFloorPlus7DateStr() {
    var now = new Date(Date.now() + 7 * 864e5 + 5.5 * 3600 * 1000);
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function istDateStrFromUnix(sec) {
    var d = new Date((sec + 5.5 * 3600) * 1000);
    return d.toISOString().slice(0, 10);
  }
  /* Owner 2026-09-11 — relay outcome reconciliation (lane13-F005).
     The sheet used to stop at "Queued…" and never read the Mac back, so a
     schedule the engine REFUSED looked exactly like one that landed: the only
     honest next move looked like scheduling it again, and that is how a deck
     gets double-booked. The server doors for this already existed
     (GET /schedule-requests, POST /schedule-requests/retry) but no client ever
     called them. This closes the loop: after the POST returns its row id the
     sheet polls the row's REAL state and reports what actually happened, and a
     refused row gets the server's own retry door. Never publishes anything —
     the Mac's engine still owns every decision. */
  function ceScheduleMount(key) {
    var ep = window.__CE_SYNC_ENDPOINT__;
    if (!ep || !key) return;
    fetch(ep + '/schedule-requests', { headers: { 'X-CE-Sync-Key': key } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var rows = ((j && j.requests) || []).filter(function (row) { return row && (row.state === 'failed' || row.state === 'needs_verification'); });
        if (!rows.length) {
          /* F-11 (cloud/ce-ui, 2026-09-21): this was an early return, so the
             normal "nothing failed" case said nothing and the probe result
             vanished. It is information, not a failure: state it calmly. */
          if (window.showAppToast) window.showAppToast('All clear: no schedules are waiting to be retried.', { tone: 'info' });
          return;
        }
        window.__CE_SCHED_FAILED__ = rows;
        var n = rows.length;
        var verifyCount = rows.filter(function (row) { return row.state === 'needs_verification'; }).length;
        if (verifyCount > 0) {
          if (window.showAppToast) window.showAppToast(verifyCount === 1 ? 'A schedule needs verification on Meta’s clock' : verifyCount + ' schedules need verification on Meta’s clock');
        } else if (window.showAppToast) window.showAppToast(n === 1 ? 'A schedule failed on your Mac — open Schedule to retry' : n + ' schedules failed on your Mac — open Schedule to retry');
      })
      .catch(function () {
        /* BO: a failed schedule-row probe used to vanish — the Mac-side failure
           stayed invisible on this surface. Record it; do not claim a state. */
        window.__CE_SCHED_PROBE_FAILED__ = Date.now();
        try { console.warn('[ce-sync] schedule failed-row probe failed'); } catch (_w) {}
      });
  }
  function ceScheduleRow(key, id) {
    var ep = window.__CE_SYNC_ENDPOINT__;
    if (!ep || !id) return Promise.resolve(null);
    return fetch(ep + '/schedule-requests', { headers: { 'X-CE-Sync-Key': key } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var rows = (j && j.requests) || [];
        for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === id) return rows[i];
        return null;
      })
      .catch(function () { return null; });
  }
  function ceScheduleWatch(key, id, statusEl, retryEl, onDone) {
    // 2026-09-11 audit F1 (P1): the engine's true latency is 84-913s (measured on
    // live relay rows) while this watch stopped at 9 x 4s = 36s and left a frozen
    // optimistic line — a REFUSED schedule then looked identical to a landed one,
    // which is what invites the re-tap that double-books. Watch the real budget,
    // then keep a slow poll and say honestly what is known.
    var tries = 0, FAST_TRIES = 45, FAST_MS = 4000, SLOW_MS = 15000, MAX_MS = 20 * 60 * 1000;
    var startedAt = Date.now();
    var waited = function () { return Math.round((Date.now() - startedAt) / 1000); };
    var keepWatching = function () {
      if (Date.now() - startedAt >= MAX_MS) {
        statusEl.textContent = 'Still unconfirmed after 20 min — re-open this sheet to check again.';
        return;
      }
      setTimeout(tick, tries < FAST_TRIES ? FAST_MS : SLOW_MS);
    };
    var why = function (row) {
      var res = row && row.result;
      var msg = (res && (res.error || res.message || res.detail)) || row && row.error;
      if (msg && typeof msg === 'object') msg = JSON.stringify(msg);
      return String(msg || 'the engine refused it').slice(0, 160);
    };
    var armRetry = function (row) {
      if (!retryEl) return;
      retryEl.style.display = '';
      retryEl.onclick = function () {
        retryEl.disabled = true;
        statusEl.textContent = 'Re-queuing\u2026';
        fetch(window.__CE_SYNC_ENDPOINT__ + '/schedule-requests/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key },
          body: JSON.stringify({ id: id })
        }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
          .then(function (out) {
            retryEl.disabled = false;
            if (out.s === 200) {
              retryEl.style.display = 'none';
              statusEl.textContent = 'Re-queued \u2014 waiting for your Mac to pick it up (it must be running).';
              ceScheduleWatch(key, id, statusEl, retryEl);
            } else {
              statusEl.textContent = (out.j && out.j.error) ? out.j.error : 'Retry did not go through \u2014 the row could not be re-queued on your Mac. Re-open this sheet to check its state.';
            }
          }, function () { retryEl.disabled = false; statusEl.textContent = 'Network failed on retry \u2014 the retry never reached your Mac. Check the Wi-Fi and tap Retry again.'; });
      };
    };
    var tick = function () {
      tries++;
      ceScheduleRow(key, id).then(function (row) {
        if (!row) { keepWatching(); return; }
        var st = String(row.state || '');
        if (st === 'pending' || st === 'queued' || st === 'scheduling') {
          statusEl.textContent = waited() < 45
            ? 'Queued \u2014 your Mac has not picked it up yet (it must be running).'
            : 'Still waiting on your Mac \u2014 ' + waited() + 's so far, last checked just now.';
          keepWatching();
          return;
        }
        /* F-S-NNR (cloud/ce-ui, 2026-09-21): the Mac books a phone row with
           publishNow false (App/CEMetaPublisher.swift:936), so even a row the
           Mac reports back as 'scheduled' is booked on Meta's clock and may
           still be hours or days from going live. The old 'it landed' line
           read as proof the post was up. Only the row's own state is claimed
           here; the scheduled minute is named when the row carries one. */
        if (st === 'scheduled' || st === 'published') {
          var booked = '';
          if (row.scheduleUnixMs) {
            try { booked = ' for ' + new Date(Number(row.scheduleUnixMs)).toLocaleString(); } catch (_b) {}
          }
          statusEl.textContent = 'Booked on Meta\u2019s clock' + booked + ' \u2014 that is the time it should go live. Your Mac cannot confirm the actual publish here.';
          if (retryEl) retryEl.style.display = 'none';
          if (window.showAppToast) window.showAppToast('Your Mac booked it on Meta\u2019s clock' + booked);
          if (typeof onDone === 'function') onDone('scheduled');
          return;
        }
        if (st === 'needs_verification') {
          statusEl.textContent = 'Needs verification: the app restarted during scheduling. Check Meta’s clock before doing anything else.';
          if (retryEl) retryEl.style.display = 'none';
          if (typeof onDone === 'function') onDone('needs_verification');
          return;
        }
        if (st === 'failed') {
          statusEl.textContent = 'Did not go through: ' + why(row);
          armRetry(row);
          if (typeof onDone === 'function') onDone('failed');
          return;
        }
        statusEl.textContent = 'Mac says: ' + st;
      });
    };
    setTimeout(tick, 4000);
  }
  window.__CE_PHONE_SCHEDULE__ = function () {
    var deck = window.studioDeck ? window.studioDeck() : null;
    if (!deck || !deck.slides || !deck.slides.length) { if (window.showAppToast) window.showAppToast('Open a deck first'); return; }
    var old = document.getElementById('ce-sched-sheet');
    if (old) old.remove();
    var returnFocus = document.activeElement;
    var sheet = document.createElement('div');
    sheet.id = 'ce-sched-sheet';
    /* A11y (cloud/ce-ui, 2026-09-21): this was a bare div — a screen reader
       saw no dialog at all. Name it, mark it modal, trap focus inside and give
       Escape a close path; focus returns to whatever opened it. */
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Schedule');
    sheet.style.cssText = 'position:fixed;inset:0;z-index:var(--z-toast-hi);background:rgba(0,0,0,.55);display:flex;align-items:flex-end;';
    var slides = deck.slides.length;
    function esc(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    var safeTitle = esc(String(deck.title || deck.id).slice(0, 40));
    var safeMin = esc(istFloorPlus7DateStr());
    var safeTime = esc((window.CE_SCHEDULE_DEFAULTS || {}).timeValue || '11:30');
    sheet.innerHTML =
      '<div style="width:100%;background:#1c1a24;color:#fff;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font-family:-apple-system,system-ui,sans-serif;">' +
      '<div id="ce-sched-title" style="font-weight:700;font-size:var(--fs-body);margin-bottom:10px">Schedule \u201C' + safeTitle + '\u201D on Meta\u2019s clock</div>' +
      '<label style="font-size:var(--fs-overline);opacity:.75" for="ce-sched-platform">Platform</label>' +
      '<select id="ce-sched-platform" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<option value="facebook">Facebook — fully automatic, holds on Meta\u2019s clock</option>' +
      '<option value="instagram">Instagram — fires from the Mac at its minute (\u226410 slides)</option></select>' +
      '<label style="font-size:var(--fs-overline);opacity:.75" id="ce-sched-datelabel" for="ce-sched-date">Date (a week+ out — owner law)</label>' +
      '<input id="ce-sched-date" type="date" min="' + safeMin + '" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<label style="font-size:var(--fs-overline);opacity:.75" for="ce-sched-time">Time (IST)</label>' +
      '<input id="ce-sched-time" type="time" value="' + safeTime + '" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<label style="font-size:var(--fs-overline);opacity:.75" for="ce-sched-caption">Caption</label>' +
      '<textarea id="ce-sched-caption" rows="3" style="width:100%;padding:10px;margin:4px 0 12px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444;box-sizing:border-box"></textarea>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="ce-sched-go" style="flex:1;padding:12px;border:0;border-radius:10px;font-weight:700;background:var(--accent);color:#fff;font-size:var(--fs-body)">Schedule (week+ out)</button>' +
      '<button id="ce-sched-cancel" style="padding:12px 18px;border:1px solid #555;border-radius:10px;background:transparent;color:#fff;font-weight:700">Cancel</button></div>' +
      '<div id="ce-sched-status" role="status" aria-live="polite" aria-atomic="true" style="font-size:var(--fs-overline);opacity:.8;margin-top:8px;min-height:16px"></div>' +
      '<button id="ce-sched-retry" type="button" style="display:none;width:100%;margin-top:8px;padding:11px;border:1px solid var(--accent);border-radius:10px;background:transparent;color:var(--accent-text);font-weight:700;font-size:var(--fs-secondary)">Retry this schedule</button></div>';
    document.body.appendChild(sheet);
    /* A11y: Escape closes, focus is trapped while the dialog is open, and the
       trigger regains focus on close. Hostile/refused messages stay until the
       user acts — a 1.1s self-clear cannot be read. */
    var onKeydown = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      if (e.key !== 'Tab') return;
      var focusables = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      var list = [];
      for (var i = 0; i < focusables.length; i++) {
        var f = focusables[i];
        if (!f.disabled && f.offsetParent !== null) list.push(f);
      }
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    function clearPending() {
      if (sheet.__ceStatusTimer) { clearTimeout(sheet.__ceStatusTimer); sheet.__ceStatusTimer = 0; }
    }
    function closeSheet() {
      clearPending();
      document.removeEventListener('keydown', onKeydown, true);
      sheet.remove();
      try { if (returnFocus && returnFocus.focus) returnFocus.focus(); } catch (_rf) {}
    }
    sheet.__ceClose = closeSheet;
    document.addEventListener('keydown', onKeydown, true);
    setTimeout(function () {
      var firstField = sheet.querySelector('#ce-sched-platform');
      if (firstField) try { firstField.focus(); } catch (_ff) {}
    }, 0);
    /* Production consent (owner 2026-09-10): the SERVER is the floor's single
       truth — when its ce_allow_soon marker is on, near dates are legitimate
       production schedules, so the min follows the live floor instead of the
       hardcoded week+. Health failure keeps the strict +7 default. */
    try {
      var ep0 = window.__CE_SYNC_ENDPOINT__;
      if (ep0) {
        fetch(ep0 + '/health', { mode: 'cors' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (h) {
            if (!h || !h.weekOutFloorUnix) return;
            var minStr = istDateStrFromUnix(h.weekOutFloorUnix);
            var dateEl = sheet.querySelector('#ce-sched-date');
            var labelEl = sheet.querySelector('#ce-sched-datelabel');
            if (dateEl) dateEl.min = minStr;
            if (labelEl && minStr !== istFloorPlus7DateStr()) labelEl.textContent = 'Date (from ' + minStr + ' — production mode)';
          })
          .catch(function () {});
      }
    } catch (_f) {}
    var cap = '';
    try { cap = ((window.state && window.state.igCaption) || (deck.slides[0] && (deck.slides[0].html || deck.slides[0].text)) || '').replace(/<[^>]+>/g, ''); } catch (_) {}
    sheet.querySelector('#ce-sched-caption').value = cap;
    sheet.querySelector('#ce-sched-cancel').onclick = function () { closeSheet(); };
    // Owner 2026-09-11: a schedule that failed on the Mac used to be invisible on
    // the phone. Ask the relay on open and say it out loud.
    try { ensureWriteKey(function (k) { ceScheduleMount(k); }); } catch (_mm) {}
    sheet.querySelector('#ce-sched-go').onclick = function () {
      var platform = sheet.querySelector('#ce-sched-platform').value;
      var date = sheet.querySelector('#ce-sched-date').value;
      var time = sheet.querySelector('#ce-sched-time').value || (window.CE_SCHEDULE_DEFAULTS||{}).poemMorningValue || '11:30';
      var caption = sheet.querySelector('#ce-sched-caption').value.trim();
      var status = sheet.querySelector('#ce-sched-status');
      if (!date) { status.textContent = 'Date is missing \u2014 pick the day this should go on Meta, then tap Schedule again.'; return; }
      if (platform === 'instagram' && slides > 10) { status.textContent = 'This deck has ' + slides + ' slides, over Instagram\u2019s 10-slide API cap \u2014 use Download-for-phone and post it by hand.'; return; }
      if (!caption) { status.textContent = 'Caption is empty \u2014 Meta needs one, so nothing was queued. Add it and tap Schedule again.'; return; }
      var unixMs = new Date(date + 'T' + time + ':00' + SYNC_IST).getTime();
      var payload = { deckId: deck.id, platform: platform, caption: caption, scheduleUnixMs: unixMs, slidesCount: slides };
      var btn = sheet.querySelector('#ce-sched-go');
      if (window.__CE_SYNC_UNREACHABLE__) { status.textContent = 'Mac unreachable \u2014 nothing was queued. Open this in Safari, or use Download-for-phone.'; return; }
      btn.disabled = true; status.textContent = 'Sending to your Mac\u2026';
      function submit(key) {
        var ep = window.__CE_SYNC_ENDPOINT__;
        if (!ep) { status.textContent = 'Sync endpoint not found \u2014 nothing was queued. Make sure the Mac app is open on the same Wi-Fi, then tap Schedule again.'; btn.disabled = false; return Promise.resolve(null); }
        return fetch(ep + '/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
      }
      ensureWriteKey(function (key) {
        if (!key) { status.textContent = 'Write key missing \u2014 nothing was queued. Pair this phone with your Mac again, then tap Schedule.'; btn.disabled = false; return; }
        submit(key).then(function (res) {
          if (res && res.status === 403) {
            try { localStorage.removeItem('ce_sync_key'); } catch (_) {}
            ensureWriteKey(function (k2) {
              if (!k2) { status.textContent = 'Write key missing \u2014 nothing was queued. Pair this phone with your Mac again, then tap Schedule.'; btn.disabled = false; return; }
              submit(k2).then(function (r2) { finish(r2, k2); }, function () { status.textContent = 'Network dropped \u2014 nothing was queued. Check the Wi-Fi and tap Schedule again.'; btn.disabled = false; });
            });
            return;
          }
          finish(res, key);
        });
      });
      function finish(res, usedKey) {
        var statusEl = sheet.querySelector('#ce-sched-status');
        var retryEl = sheet.querySelector('#ce-sched-retry');
        // Audit F2 (P1): the relay now refuses a second live row for the same
        // deck+time. Say so plainly and leave the button latched.
        if (res && res.status === 409) {
          btn.disabled = true;
          statusEl.textContent = 'Already scheduled for that time'
            + (res.body && res.body.state ? ' (row state: ' + res.body.state + ')' : '')
            + ' \u2014 it was not queued twice.';
          if (window.showAppToast) window.showAppToast('Already scheduled for that time');
          return;
        }
        btn.disabled = false;
        if (res && res.status === 200 && res.body && res.body.ok) {
          status.textContent = 'Queued \u2014 waiting for your Mac to pick it up and book it on Meta\u2019s clock (the Mac must be running; the phone cannot confirm the booking).';
          if (window.showAppToast) window.showAppToast('Schedule queued to your Mac');
          // Owner 2026-09-11: the sheet used to close 2.6s after "Queued", so the
          // real outcome (landed / refused) was never seen. It now stays open and
          // reports the Mac's own verdict; Done closes it.
          var rowId = res.body.id;
          if (rowId && usedKey) {
            btn.disabled = true;   // latched while the row is live — a second tap cannot double-book
            sheet.querySelector('#ce-sched-cancel').textContent = 'Done';
            ceScheduleWatch(usedKey, rowId, statusEl, retryEl, function (terminal) {
              if (terminal === 'failed') btn.disabled = false;   // retry path stays reachable
            });
          }
        } else {
          status.textContent = (res && res.body && res.body.error) ? res.body.error : 'Nothing queued: the Mac could not create the schedule row. Check that it is running and reachable, then tap Schedule again.';
        }
      }
    };
  };
  /* ---- Post now from the phone (owner 2026-09-19, b-postnow) ----------------
     The studio header's ghost "Post now ▾" lands here when there is no native
     bridge. The phone NEVER holds a token: it queues a publish REQUEST on the
     Mac's sync server (POST /post-request, write-key gated). The request lands
     in the SAME queue file the Mac relay already drains, so the Mac executes
     it through its own consent arm and the row's state/result syncs back as
     the honest status below. */
  function cePostNowWatch(key, id) {
    var tries = 0;
    var say = function (m) { if (window.showAppToast) window.showAppToast(m); };
    var tick = function () {
      tries++;
      ceScheduleRow(key, id).then(function (row) {
        if (!row) { if (tries < 30) setTimeout(tick, 4000); return; }
        var st = String(row.state || '');
        if (st === 'scheduled' || st === 'published') {
          /* F-S-NNR (cloud/ce-ui, 2026-09-21): this said '@doalfaaz goes live
             within ~3 min'. Nothing in this row supports that: the Mac books
             phone rows with publishNow false (App/CEMetaPublisher.swift:936),
             so 'scheduled' means a booking on Meta's clock, and for a post-now
             row that minute is the one the sync server stamped
             (now + 150s, ops/ce_deck_sync.py). The phone still receives no
             confirmation that anything reached Meta's feed, so it says queued
             and names the booked minute instead of inventing a live window. */
          var booked = '';
          if (row.scheduleUnixMs) {
            try { booked = ' for ' + new Date(Number(row.scheduleUnixMs)).toLocaleString(); } catch (_b) {}
          }
          say('Queued on your Mac' + booked + ' \u2014 it cannot confirm the post went live.');
          return;
        }
        if (st === 'failed' || st === 'needs_verification' || st === 'superseded') {
          var res = row && row.result;
          var msg = (res && (res.error || res.message || res.detail)) || (row && row.error) || 'the Mac refused it';
          if (msg && typeof msg === 'object') msg = JSON.stringify(msg);
          say('Post did not go through: ' + String(msg).slice(0, 140));
          return;
        }
        if (tries < 30) setTimeout(tick, 4000);   // ~2 min of honest watching
      });
    };
    setTimeout(tick, 4000);
  }
  window.__CE_PHONE_POSTNOW__ = function (opts) {
    var say = function (m) { if (window.showAppToast) window.showAppToast(m); };
    var st = window.state || {};
    var item = st.currentItem;
    if (!item) { say('Open a piece first — nothing was sent.'); return; }
    var type = st.currentType || 'carousel';
    var deck = window.studioDeck ? window.studioDeck() : null;
    var slides = (deck && Array.isArray(deck.slides) && deck.slides.length) ? deck.slides.length
      : (type === 'poem' ? 1 : (Number(item.slideCount || item.slides) || 1));
    var deckId = String(item.id || item.content_id || (deck && deck.id) || '');
    if (!deckId) { say('This piece has no id — nothing was sent.'); return; }
    /* The caption ships VERBATIM in the engine's media payload, so build it
       through the same getMetaFormattedCaption the Mac dispatch uses —
       picked line (or none) + handle + hashtags, never a phone-only rewrite. */
    var caption = '';
    try {
      var q = { type: type, item: item, igCaption: (opts && opts.caption) || '', igNoCaption: !!(opts && opts.caption === null) };
      caption = (typeof window.__getMetaFormattedCaption === 'function')
        ? String(window.__getMetaFormattedCaption(q) || '')
        : String(q.igCaption || '');
    } catch (_c) { caption = String((opts && opts.caption) || ''); }
    if (!caption.trim()) { say('Pick a caption — nothing was sent.'); return; }
    var payload = { deckId: deckId, caption: caption, slidesCount: slides, platform: 'instagram', kind: 'post_now', type: type };
    var submit = function (key) {
      var ep = window.__CE_SYNC_ENDPOINT__;
      if (!ep) { say('Mac unreachable — sync endpoint not found, so nothing was sent. Open this in Safari, or use Download-for-phone.'); return Promise.resolve(null); }
      return fetch(ep + '/post-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); });
    };
    var finish = function (res, usedKey) {
      if (res && res.s === 200 && res.j && res.j.ok) {
        // F-S18 (cloud/ce-ui, 2026-09-20): HTTP 200 means the request row is
        // queued, not that the post is live — only cePostNowWatch's row state
        // may say live/scheduled.
        say('Queued on your Mac - waiting for it to pick the row up\u2026');
        if (res.j.id && usedKey) cePostNowWatch(usedKey, res.j.id);
        return;
      }
      say((res && res.j && res.j.error) ? res.j.error : 'Nothing queued: the Mac could not create the request row. Check that it is running and signed in to Meta, then try again.');
    };
    if (window.__CE_SYNC_UNREACHABLE__) { say('Mac unreachable \u2014 nothing was sent. Open this in Safari, or use Download-for-phone.'); return; }
    findSyncEndpoint(function (base) {
      if (base) window.__CE_SYNC_ENDPOINT__ = base;
      ensureWriteKey(function (key) {
        if (!key) { say('Write key missing \u2014 nothing was sent. Pair this phone with your Mac again.'); return; }
        submit(key).then(function (res) {
          if (res && res.s === 403) {
            try { localStorage.removeItem('ce_sync_key'); } catch (_) {}
            ensureWriteKey(function (k2) {
              if (!k2) { say('Write key missing \u2014 nothing was sent. Pair this phone with your Mac again.'); return; }
              submit(k2).then(function (r2) { finish(r2, k2); }, function () { say('Network dropped \u2014 nothing was sent. Check the Wi-Fi and tap Post now again.'); });
            });
            return;
          }
          finish(res, key);
        }, function () { say('Mac unreachable \u2014 nothing was sent. Open this in Safari, or use Download-for-phone.'); });
      });
    });
  };

  // Inject the Schedule button next to the pack button inside the studio topbar.
  function armScheduleButton() {
    // Owner 2026-09-11 (audit: "duplicate Schedule affordance"): this web-layer
    // button exists because the PHONE topbar has no native Schedule. On a wide
    // surface the app already draws its own studio-schedule-btn, so injecting a
    // second one put two Schedule pills side by side in the desktop topbar. The
    // phone form factor owns this button; everywhere else it is withdrawn.
    if (!document.documentElement.classList.contains('ce-phone')) {
      var stale = document.getElementById('ce-web-schedule-btn');
      if (stale) stale.remove();
      return;
    }
    // Sit beside the pack button wherever it CURRENTLY lives: the phone-mode
    // reparent moves the pack out of the hidden more-menu into the topbar, so
    // a naive one-time insert strands this button inside the hidden menu.
    var pack = document.getElementById('studio-download-pack-btn');
    var home = (pack && pack.parentElement) || document.querySelector('.studio-primary-actions');
    if (!home) return;
    var btn = document.getElementById('ce-web-schedule-btn');
    var justCreated = false;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'ce-web-schedule-btn';
      btn.textContent = 'Schedule';
      btn.title = 'Queue this piece for your Mac to book on Meta\u2019s clock (a week+ out)';
      btn.style.cssText = 'display:inline-flex; align-items:center; min-height:40px; padding:8px 14px; font-weight:700; border-radius:10px; color:#fff; background:#2e6f5e; border:1px solid rgba(255,255,255,0.14); cursor:pointer;';
      // H01-7 FIX (2026-09-15, lane H01_DEEP_PANEL_AUDIT): this control was a COMPLETELY silent
      // no-op on the phone web bundle - measured "threw: null, and no toast, no status text, no
      // error". The phone surface is a REVIEW surface served publicly, so a control that looks
      // live and does nothing is the worst combination: the owner cannot tell a refusal from a
      // success.
      // F-04 (cloud/ce-ui, 2026-09-21): the old handler short-circuited on an absent ceBridge,
      // but __CE_PHONE_SCHEDULE__ does NOT need the native bridge — it queues through the sync
      // server (POST /schedule) on the web/LAN surface too. Gating on ceBridge made a working
      // path a dead no-op there. Call it whenever it is callable; the sync layer itself reports
      // "Mac unreachable / write key needed" honestly when it cannot reach the Mac.
      btn.onclick = function () {
        if (typeof window.__CE_PHONE_SCHEDULE__ === 'function') {
          try { window.__CE_PHONE_SCHEDULE__(); } catch (e) {
            if (window.showAppToast) window.showAppToast('Schedule failed: ' + ((e && e.message) || String(e)) + ' \u2014 nothing was queued for Meta. Reload the page and try again.');
          }
          return;
        }
        if (window.showAppToast) window.showAppToast('Scheduling needs the Mac app \u2014 nothing was queued. Open the studio on your Mac, or use Download-for-phone.');
      };
      justCreated = true;
    }
    /* No surface can schedule without the real path (native bridge or the sync
       server). Never present a visible control that cannot perform its action. */
    var hasBridge = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ceBridge);
    var hasSchedulePath = typeof window.__CE_PHONE_SCHEDULE__ === 'function' &&
      (hasBridge || !!window.__CE_SYNC_ENDPOINT__);
    if (!hasSchedulePath) {
      if (btn) btn.remove();
      return;
    }
    if (btn.parentElement !== home) {
      home.insertBefore(btn, (pack && pack.parentElement === home) ? pack : home.firstChild);
    } else if (!justCreated) {
      var r = btn.getBoundingClientRect();
      if (getComputedStyle(btn).display === 'none' || r.width === 0) {
        home.insertBefore(btn, (pack && pack.parentElement === home) ? pack : home.firstChild);
      }
    }
  }
  window.__CE_SCHEDULE_BUTTON__ = armScheduleButton;

  /* P1-phone-download (2026-09-20): the pack button must SAY what the sheet
     does before the owner taps it. The label is resolved by the pack layer
     (window.__CE_PACK_LABEL__, one owner for the promise) and applied here, on
     the same sweep that already runs on every studio render — a relabel that
     only happened at click time would still be a surprise on the first run.
     Never touches the label while a render is in flight (aria-busy) so the
     live "Rendering slide 3 of 8…" progress is not overwritten. */
  function armPackLabel() {
    var btn = document.getElementById('studio-download-pack-btn');
    if (!btn) return;
    if (btn.getAttribute('aria-busy') === 'true') return;
    if (typeof window.__CE_PACK_LABEL__ !== 'function') return;
    var want = window.__CE_PACK_LABEL__();
    if (!want || !want.label) return;
    var label = btn.querySelector('.ce-pack-label');
    var current = label ? label.textContent : btn.textContent;
    if (String(current || '').trim() === want.label) return;
    if (label) { label.textContent = want.label; } else { btn.textContent = want.label; }
    btn.setAttribute('title', want.title || want.label);
  }
  window.__CE_ARM_PACK_LABEL__ = armPackLabel;
  var origOpen = window.openStudio;
  if (typeof origOpen === 'function') {
    window.openStudio = function () {
      applyLocalEdits();
      var r = origOpen.apply(this, arguments);
      setTimeout(function () {
        var stage = document.getElementById('studio');
        if (stage) armTouchEditing(stage);
      }, 600);
      return r;
    };
  }
  // Keep arming: any .ce-render-block with content-bearing data-ce-block that
  // is not yet armed gets armed, whenever it appears (renders replace nodes).
  function armSweep() {
    /* A8-P1-3 (share read-only law): #share visitors get the trimmed VIEW,
       never the owner's edit/schedule powers. ce-share is URL-marked only
       (ce-touch-edit boot), so this gate cannot lock the owner out. */
    if (document.documentElement.classList.contains('ce-share')) return;
    var studio = document.getElementById('studio');
    if (!studio) return;
    armTouchEditing(studio);
    armScheduleButton();
    armPackLabel();
  }
  /* F-TE01 (touch-edit, 2026-09-23): `armTimer`/`dockEnsureTimer` and the two
     MutationObservers are now declared ONCE at the top of the IIFE and stored,
     because an arm()/armSweep() pass that ran twice used to install a SECOND
     live observer per call — each with its own debounce timer, each scheduling
     its own sweep. Idempotency here is the load-bearing part: the arming pass
     is what sets `__ceTouchArmed`, and duplicate observers made "attached
     once" impossible to reason about from the outside. */
  var scheduleArmSweep = function () {
    if (armSweepTimer) return;
    armSweepTimer = setTimeout(function () { armSweepTimer = 0; armSweep(); }, 240);
  };
  /* Extracted so the teardown can rebuild it: see the note in
     ceTouchEditTeardown. Declared as a function so it is hoisted above the
     teardown that calls it. */
  function armBaseObserver() {
    if (typeof MutationObserver !== 'function') return;
    var mo = new MutationObserver(scheduleArmSweep);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    observers.push(mo);
    observerTargets.push(document.documentElement);
  }
  armBaseObserver();
  /* `tick` polls for the first real shelf face so the veil can lift. It used to
     be `setInterval(armSweep, 2500)` — a permanent re-entry point that re-armed
     whatever node happened to be in the stage 2.5s later. That is the sweep's
     own bug class: re-entry must be triggered by a RENDER, and the observer
     above is the render signal. The poll stops as soon as the veil is lifted,
     which is the only thing it was ever for. */
  var veilPoll = setInterval(function () {
    /* A7-P1-6: skeletons are .pure-card.deck-card too (aria-hidden) — the
       poll must match REAL faces only, or the veil lifts over spinners. */
    if (document.querySelector('.pure-card.deck-card:not([aria-hidden]), .ce-rail-track .pure-card:not([aria-hidden])')) {
      clearInterval(veilPoll);
      window.__CE_LIFT_VEIL__ && window.__CE_LIFT_VEIL__();
    }
  }, 200);
  setTimeout(function () { clearInterval(veilPoll); }, 6000);
  setTimeout(armSweep, 800);
})();
/* ==========================================================================
   "Download for phone" on a POEM (owner 2026-09-11)
   The carousel pack renders decks through CarouselCore.slideHTML and refused
   the poem surface outright ("Open a carousel or post first." while a poem WAS
   open). A poem is not a deck, so this rasterizes the open poem canvas at post
   resolution and hands back a PNG (+ the poem text on the clipboard).

   Why it inlines CSS/fonts/images: an SVG rendered through <img> is an isolated
   document — it CANNOT fetch the page stylesheet, the shipped woff2 faces, or
   the photo-design backdrops. The first build of this function failed exactly
   there ("svg render failed"). So the clone is made self-contained first:
   page CSS (with fonts rewritten to data: URLs) + every image/background as a
   data: URL, then the SVG/foreignObject snapshot.

   Returns false when no poem is open, so the caller keeps its honest guard.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__CE_POEM_PACK__) return;

  function say(msg) {
    try {
      if (typeof window.__CE_PACK_SAY__ === 'function') window.__CE_PACK_SAY__(msg);
      else if (window.showAppToast) window.showAppToast(msg);
    } catch (_e) {}
  }

  function openPoem() {
    try {
      var st = window.__CE_STATE__ || window.state || {};
      if (st.currentType !== 'poem' || !st.currentItem) return null;
      return st.currentItem;
    } catch (_e) { return null; }
  }

  function authoredBox(canvas) {
    var zoom = parseFloat(canvas.style.zoom) || 1;
    var w = parseFloat(canvas.style.width) || 580;
    var h = 0;
    var parts = String(canvas.style.aspectRatio || '').split('/');
    if (parts.length === 2 && parseFloat(parts[0]) > 0 && parseFloat(parts[1]) > 0) {
      h = w * (parseFloat(parts[1]) / parseFloat(parts[0]));
    } else {
      h = (canvas.offsetHeight / zoom) || 725;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }

  function fetchAsDataUrl(url) {
    return fetch(url, { mode: 'cors', credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); })
      .then(function (b) {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { res(fr.result); };
          fr.onerror = rej;
          fr.readAsDataURL(b);
        });
      });
  }

  var ABS = function (u) { try { return new URL(u, document.baseURI).href; } catch (_e) { return u; } };

  /* ASCII, ordered, bounded phone filenames: doalfaaz-YYYY-MM-DD-NN.png.
     Never Devanagari: the final class admits only a-z0-9 and '-'.
     doalfaaz-  11 + date 10 + '-' + NN 2 + '.png' 4 = 27 chars without a slug. */
  function asciiSlug(text, max) {
    var s = String(text == null ? '' : text)
      .replace(/<[^>]+>/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!s) return '';
    if (max && s.length > max) s = s.slice(0, max).replace(/-+$/g, '');
    return s;
  }
  function localDateStamp() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function downloadName(stamp, index, slug) {
    var base = 'doalfaaz-' + stamp + '-' + String(index).padStart(2, '0');
    // 48-char ceiling: 18 are fixed (doalfaaz-DATE-NN), 4 the extension.
    var room = 48 - base.length - 4;
    if (slug && room > 2) base += '-' + slug.slice(0, room);
    return base.slice(0, 44) + '.png';
  }
  function dataUrlToFile(dataUrl, name) {
    var b64 = dataUrl.split(',')[1];
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, { type: 'image/png' });
  }
  /* Files that were rendered but whose sheet iOS refused, almost always because
     the render outlived the transient activation the tap granted (WebKit allows
     "a few seconds"; a 14-slide render does not fit). Holding the FILES — not
     the dataUrls — is the point: the retry tap reaches share() with no work
     between the gesture and the call, which is the one thing iOS requires. */
  var pendingSheet = null;

  /* One share sheet for the whole pack (owner 2026-09-20): sharing the images
     one at a time forced a re-tap and a second "Save Image" per file.
     `names` (optional) overrides the per-image filename; otherwise the
     ordered doalfaaz-DATE-NN pattern is used.
     `opts.onProgress(done, total)` fires immediately before a sheet opens, so
     the caller can promise what the sheet is about to do.
     Returns:
       { outcome: 'shared'|'download'|'aborted'|'needs-tap', saved, total, sharedIndex }
       — counts, not a boolean, so a caller can say WHICH files the sheet
       carried when iOS refuses the set and only the first file goes out. */
  async function saveImages(dataUrls, slug, names, opts) {
    var o = opts || {};
    var stamp = localDateStamp();
    var nameFor = function (i) { return (names && names[i]) || downloadName(stamp, i + 1, slug); };
    var total = dataUrls.length;
    var progress = typeof o.onProgress === 'function' ? o.onProgress : function () {};
    var files = dataUrls.map(function (u, i) { return dataUrlToFile(u, nameFor(i)); });
    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    var anchorAll = function () {
      dataUrls.forEach(function (u, i) {
        var a = document.createElement('a');
        a.href = u;
        a.download = nameFor(i);
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    };
    if (isIOS && navigator.share && files.length) {
      var canAll = !navigator.canShare || navigator.canShare({ files: files });
      var canOne = total > 1 && (!navigator.canShare || navigator.canShare({ files: [files[0]] }));
      if (canAll || canOne) {
        /* Exactly ONE share() call per attempt, always: the whole set when iOS
           accepts it, otherwise the first file — never a sheet per file. */
        var set = canAll ? files : [files[0]];
        progress(total, total);
        try {
          await navigator.share({ files: set });
          pendingSheet = null;
          return { outcome: 'shared', saved: set.length, total: total, sharedIndex: canAll ? -1 : 0 };
        } catch (err) {
          // Dismissing the sheet is a deliberate stop, not a licence to
          // silently fire a download behind the user's back.
          if (err && err.name === 'AbortError') { pendingSheet = null; return { outcome: 'aborted', saved: 0, total: total }; }
          /* NotAllowedError (or anything else): keep every rendered file and
             tell the caller a second tap will open the sheet instantly. Never
             silently reroute an iOS save to the Files download path. */
          pendingSheet = { files: files, count: total };
          return { outcome: 'needs-tap', saved: 0, total: total };
        }
      }
    }
    anchorAll();
    return { outcome: 'download', saved: total, total: total };
  }

  window.__CE_PENDING_SHEET_COUNT__ = function () { return pendingSheet ? pendingSheet.count : 0; };
  /* Called from the button the owner taps next: share() is the FIRST await, so
     the tap's activation is still live when the sheet is asked for. */
  window.__CE_FLUSH_PENDING_SHEET__ = async function () {
    var p = pendingSheet;
    if (!p) return null;
    try {
      await navigator.share({ files: p.files });
      pendingSheet = null;
      return { outcome: 'shared', saved: p.count, total: p.count };
    } catch (e) {
      if (e && e.name === 'AbortError') { pendingSheet = null; return { outcome: 'aborted', saved: 0, total: p.count }; }
      return { outcome: 'needs-tap', saved: 0, total: p.count };
    }
  };

  /* Page CSS with @font-face src: url(...) rewritten to data: URLs, so the SVG
     renders in the shipped Laila / Poppins faces instead of a fallback. */
  function collectCss() {
    var text = '';
    var fontFetches = [];
    try {
      Array.prototype.forEach.call(document.styleSheets, function (ss) {
        var rules = null;
        try { rules = ss.cssRules; } catch (_c) { rules = null; }
        if (!rules) return;
        Array.prototype.forEach.call(rules, function (r) {
          var t = r.cssText || '';
          if (t.indexOf('@font-face') !== -1) {
            t = t.replace(/url\((['"]?)([^'")]+)\1\)/g, function (m, q, u) {
              if (/^data:/.test(u)) return m;
              var abs = ABS(u);
              var ph = '__FONT' + fontFetches.length + '__';
              fontFetches.push({ ph: ph, url: abs });
              return 'url(' + ph + ')';
            });
          }
          text += t + '\n';
        });
      });
    } catch (_e) {}
    return Promise.all(fontFetches.map(function (f) {
      return fetchAsDataUrl(f.url).then(function (d) { return { ph: f.ph, data: d }; }).catch(function () { return null; });
    })).then(function (done) {
      done.forEach(function (d) { if (d) text = text.split(d.ph).join(d.data); });
      return text;
    });
  }

  /* Every <img> + CSS background-image inside the clone becomes a data: URL. */
  function inlineAssets(origRoot, cloneRoot) {
    var jobs = [];
    var oImgs = origRoot.querySelectorAll('img');
    var cImgs = cloneRoot.querySelectorAll('img');
    Array.prototype.forEach.call(cImgs, function (img, i) {
      var src = (oImgs[i] && (oImgs[i].currentSrc || oImgs[i].src)) || img.getAttribute('src') || '';
      if (!src || /^data:/.test(src)) return;
      img.setAttribute('src', ABS(src));
      jobs.push(fetchAsDataUrl(ABS(src)).then(function (d) { img.setAttribute('src', d); }).catch(function () {}));
    });
    var oAll = origRoot.querySelectorAll('*');
    var cAll = cloneRoot.querySelectorAll('*');
    Array.prototype.forEach.call(cAll, function (el, i) {
      var orig = oAll[i];
      if (!orig) return;
      var bg = '';
      try { bg = getComputedStyle(orig).backgroundImage || ''; } catch (_b) { bg = ''; }
      if (!bg || bg === 'none' || bg.indexOf('url(') === -1) return;
      var m = bg.match(/url\((['"]?)([^'")]+)\1\)/);
      if (!m || /^data:/.test(m[2])) return;
      var abs = ABS(m[2]);
      jobs.push(fetchAsDataUrl(abs).then(function (d) {
        el.style.backgroundImage = 'url("' + d + '")';
      }).catch(function () {}));
    });
    return Promise.all(jobs);
  }

  window.__CE_SAVE_IMAGES__ = saveImages;
  window.__CE_DOWNLOAD_NAME__ = downloadName;
  window.__CE_ASCII_SLUG__ = asciiSlug;

  window.__CE_POEM_PACK__ = async function (extraDataUrls) {
    var poem = openPoem();
    var canvas = document.getElementById('active-studio-canvas');
    if (!poem || !canvas) return false;

    var box = authoredBox(canvas);
    var scale = Math.min(1350 / box.h, 1080 / box.w);   // IG-safe, aspect kept
    var W = Math.max(1, Math.round(box.w * scale));
    var H = Math.max(1, Math.round(box.h * scale));
    say('Rendering your poem at ' + W + '×' + H + '…');

    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + W + 'px;height:' + H +
      'px;overflow:hidden;z-index:var(--z-under);';
    var inner = document.createElement('div');
    inner.style.cssText = 'width:' + box.w + 'px;height:' + box.h + 'px;transform:scale(' + scale +
      ');transform-origin:top left;';
    var clone = canvas.cloneNode(true);
    clone.style.zoom = '';
    clone.style.transform = '';
    clone.style.width = box.w + 'px';
    clone.style.height = box.h + 'px';
    // Preview chrome is allowed to round the card; exported pixels are the
    // authored canvas. Remove only outer preview clipping in the clone.
    [clone].concat(Array.from(clone.querySelectorAll('.ce-poem-stage, .ce-poem-canvas, .ce-poem-face, .ce-post-face, .ce-real-face')))
      .forEach(function (frame) {
        frame.style.borderRadius = '0';
        frame.style.overflow = 'visible';
        frame.style.clipPath = 'none';
        frame.style.maskImage = 'none';
        frame.style.webkitMaskImage = 'none';
      });
    inner.style.overflow = 'visible';
    Array.prototype.forEach.call(clone.querySelectorAll('.is-selected, .ce-drag-ghost, [contenteditable]'),
      function (n) { n.classList.remove('is-selected', 'ce-drag-ghost'); n.removeAttribute('contenteditable'); });

    try {
      var css = await collectCss();
      await inlineAssets(canvas, clone);
      /* WebKit/Safari does not load raster images referenced from inside an
         SVG-as-<img> foreignObject (the carousel pack survives because its looks
         are pure CSS gradients). Photo poems therefore rasterized as text on
         black — the owner's "exports without any theme or background".
         Ground-truth fix: paint the photo with drawImage onto the output canvas
         BEFORE the SVG pass, and make the photo layer + canvas root transparent
         in the clone so the SVG composites over the photo (scrim/shadows are
         CSS and survive inside the SVG). Targeted: only when a raster photo
         actually backs the stage; paper poems keep their CSS-painted ground. */
      var __photoImg = null;
      var __photoLayer = canvas.querySelector('.ce-poem-photo-layer');
      if (__photoLayer) {
        var __bg = getComputedStyle(__photoLayer).backgroundImage || '';
        var __m = __bg.match(/url\((['"]?)([^'")]+)\1\)/);
        var __photoUrl = __m ? (/^data:/.test(__m[2]) ? __m[2] : ABS(__m[2])) : null;
        if (__photoUrl) {
          /* Decode through fetch/FileReader first. A direct remote Image can silently
             fail in iOS WebKit even when fetch() is 200; the SVG then succeeds but the
             pre-painted photo never exists, producing the owner's black text-only PNG. */
          __photoImg = await fetchAsDataUrl(__photoUrl).then(function (dataUrl) {
            return new Promise(function (res) {
              var im = new Image();
              im.onload = function () { res(im); };
              im.onerror = function () { res(null); };
              im.src = dataUrl;
              setTimeout(function () { res(im.complete && im.naturalWidth ? im : null); }, 6000);
            });
          }).catch(function () { return null; });
          if (__photoImg) {
            var __cl = clone.querySelector('.ce-poem-photo-layer');
            if (__cl) {
              __cl.style.setProperty('background-image', 'none', 'important');
              __cl.style.setProperty('background-color', 'transparent', 'important');
            }
            /* `active-studio-canvas` carries a background SHORTHAND (`background:#111`),
               so changing only background-color leaves the opaque black paint over the
               pre-painted photo in WebKit's SVG composite. Clear the shorthand at every
               outer canvas/frame layer, then the SVG text/shade remains translucent over
               the real raster ground. */
            clone.style.setProperty('background', 'transparent', 'important');
            clone.style.setProperty('background-color', 'transparent', 'important');
            var __st = clone.querySelector('.ce-poem-stage, .ce-poem-canvas');
            if (__st) {
              __st.style.setProperty('background', 'transparent', 'important');
              __st.style.setProperty('background-color', 'transparent', 'important');
            }
          }
        }
      }
      var styleTag = document.createElement('style');
      /* Inside an XML document, <style> content is character data: raw '<' or
         '&' in the page CSS (content:"<", media queries aside) makes the SVG
         unparseable. Escape, then it is valid in both worlds. */
      styleTag.textContent = String(css || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;');
      inner.appendChild(styleTag);
      inner.appendChild(clone);
      holder.appendChild(inner);
      document.body.appendChild(holder);

      await new Promise(function (r) { setTimeout(r, 320); });
      /* An SVG loaded through <img> is parsed as XML: void tags must be
         self-closed and stray ampersands escaped, or the whole document fails
         to parse ("svg render failed", nothing drawn). The carousel pack gets
         away with a lighter pass because its markup is generated; this clone is
         arbitrary studio DOM, so it gets the full treatment. */
      var xmlSafe = holder.innerHTML
        .replace(/<br\s*\/?>/gi, '<br/>')
        .replace(/<(img|hr|input|source|meta|link)((?:[^>"']|"[^"]*"|'[^']*')*?)\/?>/gi, '<$1$2/>')
        .replace(/&nbsp;/g, '\u00a0')
        .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;');
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
        '<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:' +
        W + 'px;height:' + H + 'px;">' + xmlSafe + '</div></foreignObject></svg>';
      try {
        var parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
        var perr = parsed.querySelector('parsererror');
        if (perr) { say('Poem render blocked by an XML error: ' + String(perr.textContent || '').slice(0, 120)); return true; }
      } catch (_pv) {}
      var img = new Image();
      var src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await new Promise(function (res, rej) {
        var tries = 0;
        img.onload = res;
        img.onerror = function () {
          if (tries++ < 2) setTimeout(function () { img.src = src; }, 280);
          else rej(new Error('svg render failed'));
        };
        img.src = src;
      });
      var out = document.createElement('canvas');
      out.width = W; out.height = H;
      var cx = out.getContext('2d');
      cx.fillStyle = '#ffffff';
      cx.fillRect(0, 0, W, H);
      /* photo ground first (cover-fit, same law as the on-screen layer), then the
         SVG pass composites text + scrim over it. Without this, WebKit's
         no-raster-in-foreignObject rule silently drops the background and the
         export lands as plain text on black (owner 2026-09-13). */
      if (__photoImg) {
        var iw = __photoImg.naturalWidth || 1, ih = __photoImg.naturalHeight || 1;
        var s = Math.max(W / iw, H / ih);
        var dw = iw * s, dh = ih * s;
        cx.drawImage(__photoImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
      cx.drawImage(img, 0, 0, W, H);
      var dataUrl = out.toDataURL('image/png');

      /* A caller that loops slides hands its already-rendered PNGs down here
         so the whole pack leaves in ONE share sheet (extraDataUrls). */
      var dataUrls = [dataUrl].concat(Array.isArray(extraDataUrls) ? extraDataUrls.filter(Boolean) : []);
      var slug = asciiSlug(poem.title || '', 18);
      var res = await saveImages(dataUrls, slug, null, {
        onProgress: function () { say('Poem rendered at ' + W + '\u00d7' + H + ' \u2014 opening the share sheet\u2026'); },
      });
      if (res.outcome === 'aborted') return true;
      var first = downloadName(localDateStamp(), 1, slug);
      var copied = false;
      try {
        var edit = document.getElementById('studio-editable-text');
        var text = (edit ? edit.innerText : (poem.text || '')).trim();
        if (text) { await navigator.clipboard.writeText(text); copied = true; }
      } catch (_c) { copied = false; }
      var label = dataUrls.length === 1
        ? first
        : (dataUrls.length + ' images (' + first + ' \u2026)');
      /* P1-phone-download: the end state names the step that is left instead of
         claiming a save the sheet has not performed, and a refused sheet keeps
         the rendered file so the next tap costs nothing. Every branch below
         states only what this code has actually observed: 'Saved' is shown only
         after saveImages reported the plain download outcome, and the Photos
         branches say the save is still the user's tap. */
      if (res.outcome === 'needs-tap') {
        say('Rendered ' + label + ' \u2014 not in Photos yet; tap Save to Photos once more and it lands there' +
          (copied ? ' (poem text copied).' : '.'));
      } else if (res.outcome === 'shared') {
        say('Rendered ' + label + ' (' + W + '\u00d7' + H + ') \u2014 not in Photos yet; tap Save Image in the share sheet and it lands there' +
          (copied ? ' (poem text copied).' : '.'));
      } else {
        say('Saved ' + label + ' (' + W + '\u00d7' + H + ')' + (copied ? ' \u2014 poem text copied.' : '.'));
      }
      return true;
    } catch (err) {
      say('Download failed: ' + (err && err.message ? err.message : err) + ' \u2014 nothing was saved or shared. Check the Wi-Fi and try again.');
      return true;
    } finally {
      holder.remove();
    }
  };
})();


// ── Phone carousel Tools ownership: one final owner, one sheet contract.
// The old implementation moved the button but left the inspector inside the
// gallery's desktop stacking/flex context. That produced a toggled class with
// Presentation painted above Tools and an empty-looking sheet. This owner
// portals the whole inspector to body for the open state and restores it.
(function () {
  function ensureDockTools() {
    /* F-TE01 (touch-edit, 2026-09-23): a route switch (tab button, back button)
       destroys or empties the editor while the inspector is portaled to <body>.
       The dock's own reset() already handles "the editor is still here", but
       nothing ran when the editor was GONE — the detached 50vh fixed panel then
       hung over whatever tab the user landed on. Reap it by the same rule that
       defines a live dock: its toggle must still point at a CONNECTED editor. */
    Array.prototype.forEach.call(document.querySelectorAll('body > aside.ce-studio-inspector.ce-tools-sheet'), function (d) {
      var tg = d.querySelector('#ce-tools-toggle');
      if (tg && tg.__ceToolsEditor && tg.__ceToolsEditor.isConnected) return;
      var editors = document.querySelectorAll('.ce-carousel-editor');
      for (var i = 0; i < editors.length; i++) {
        if (editors[i].contains(d)) return;
      }
      try { d.remove(); } catch (_orph) {}
    });
    /* P0 W3-P2 (2026-09-19): any in-sheet action that re-renders the studio
       canvas (design pick, font tool, move/duplicate/delete slide, typo slider,
       add slide) swaps #studio-canvas.innerHTML. That swap builds a FRESH
       `.ce-studio-inspector` inside the editor, while the OLD inspector is still
       portaled to <body> with openSheet()'s inline fixed styles. Result: two
       inspector nodes — the live one (a 56px TOOLS rail inside the workspace)
       and the ORPHANED 50vh sheet still covering the bottom half of the phone.
       The toggle the user sees hit-tests into the orphan's caption textarea, so
       Tools can never be reopened by finger: the owner's "carousel studio is
       messing too much".
       Reap every non-live dock BEFORE resolving the dock, and remember that a
       sheet was open so the user's intent survives the re-render. */
    var docks = Array.prototype.slice.call(document.querySelectorAll('.ce-studio-inspector'));
    var staleSheet = false;
    if (docks.length > 1) {
      var liveDock = null;
      docks.forEach(function (d) {
        if (!liveDock && d.closest && (d.closest('.studio-workspace') || d.closest('.ce-carousel-editor'))) liveDock = d;
      });
      if (liveDock) {
        docks.forEach(function (d) {
          if (d === liveDock) return;
          if (d.classList && d.classList.contains('ce-tools-sheet')) staleSheet = true;
          try { d.remove(); } catch (_reap) {}
        });
      }
    }
    var t = document.getElementById('ce-tools-toggle');
    var dock = document.querySelector('aside.ce-studio-inspector, .ce-studio-inspector');
    if (!t || !dock) return;
    var syncToggleLabel = function (open) {
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      var label = t.querySelector('.ce-tools-toggle-label');
      if (label) label.textContent = open ? 'Close tools' : 'Tools';
    };
    if (t.parentElement !== dock || dock.firstElementChild !== t) dock.insertBefore(t, dock.firstElementChild);
    var editor = dock.closest('.ce-carousel-editor') || t.__ceToolsEditor || document.querySelector('.ce-carousel-editor');
    if (!editor) return;
    if (t.__ceToolsEditor === editor) {
      if (editor.classList.contains('ce-tools-open') && t.__ceToolsOpen) t.__ceToolsOpen();
      /* If some other path closed the sheet (class removed without the toggle),
         the portal must still come home — otherwise the dock stays a fixed
         62vh overlay and the slide is covered with the TOOLS bar closed. */
      if (!editor.classList.contains('ce-tools-open') && t.__ceToolsRestore) t.__ceToolsRestore();
      if (t.__ceToolsCaptureHome) t.__ceToolsCaptureHome();
      /* A canvas re-render re-emits the toggle markup with aria-expanded="false"
         and the "Tools" label even while the sheet is up, so the control lied
         about the state it owned. Re-sync it to the class that actually drives
         the sheet. */
      syncToggleLabel(editor.classList.contains('ce-tools-open'));
      t.style.setProperty('position', 'static', 'important');
      t.style.setProperty('display', 'flex', 'important');
      t.style.setProperty('width', '100%', 'important');
      t.style.setProperty('height', '44px', 'important');
      t.style.setProperty('pointer-events', 'auto', 'important');
      return;
    }
    /* PORTAL HOME — captured from the dock's REAL parent, never from the dock itself.
       (The previous owner wrote `originalParent = dock`, so restore() ran
       dock.appendChild(dock) → HierarchyRequestError, the portal styles were never
       cleared, and a closed Tools sheet stayed a 62vh fixed overlay covering the
       slide — the owner's 2026-09-12 screenshot. The home is re-captured whenever
       the studio legitimately re-renders the dock while it is NOT portaled.) */
    var homeParent = dock.parentElement;
    var homeNext = dock.nextSibling;
    var homeStyle = dock.getAttribute('style');
    var portaled = false;
    function captureHome() {
      if (portaled) return;
      homeParent = dock.parentElement;
      homeNext = dock.nextSibling;
      homeStyle = dock.getAttribute('style');
    }
    function restore() {
      if (!portaled) return;
      try {
        if (homeParent && homeParent !== dock) {
          if (homeNext && homeNext.parentNode === homeParent) homeParent.insertBefore(dock, homeNext);
          else homeParent.appendChild(dock);
        } else if (dock.parentElement) {
          dock.parentElement.insertBefore(dock, dock.nextSibling); // stay put, just drop portal
        }
      } catch (_e) { /* detached mid-teardown: styles still need clearing below */ }
      dock.style.cssText = '';
      if (homeStyle != null) dock.setAttribute('style', homeStyle);
      dock.classList.remove('ce-tools-sheet');
      var scroll = dock.querySelector('.ce-inspector-scroll');
      if (scroll) scroll.style.cssText = '';
      var pinned = dock.querySelector('.ce-inspector-pinned');
      if (pinned) pinned.style.cssText = '';
      portaled = false;
    }
    function reset() {
      /* Studio can be destroyed by a route switch while the inspector is
         portaled to <body>.  Closing the editor must close the sheet first;
         otherwise the detached editor remains the portal's owner and the
         next Studio item inherits a fixed "Close tools" panel. */
      try { editor.classList.remove('ce-tools-open'); } catch (_e) {}
      try { t.setAttribute('aria-expanded', 'false'); } catch (_e2) {}
      var label = t.querySelector('.ce-tools-toggle-label');
      if (label) label.textContent = 'Tools';
      restore();
    }
    function openSheet() {
      if (!portaled) { document.body.appendChild(dock); portaled = true; }
      dock.classList.add('ce-tools-sheet');
      dock.style.setProperty('position', 'fixed', 'important');
      dock.style.setProperty('left', '0', 'important');
      dock.style.setProperty('right', '0', 'important');
      /* W12-F2 (2026-09-21) — THE SHEET RESTS ON THE SHIPBAR BAND, never on the
         viewport bottom. The band (`.studio-shipbar`, placed by placeShipBar as
         the last row of the studio column) carries `#studio-post-btn`, the app's
         ONE primary ship control. With `bottom: 0` the sheet's pinned caption
         footer (96px) and the band (57px at 402x874) occupied the SAME pixels,
         and because this dock is portaled to <body> at z-index 500 while the
         band lives inside `#studio` (z-index 200), the caption textarea painted
         over the ship control — measured occluded at its own centre point, so
         the primary action was untappable whenever the tools sheet was open.
         No z-index inside #studio can win that race (a descendant cannot escape
         its ancestor's stacking context), which is why raising the band's own
         z-index changed nothing. The fix is geometric and uses the ONE published
         source of truth for the band's height: placeShipBar already writes
         `--ce-shipbar-h` for the disclosure chip, so the sheet anchors off the
         same number and the two bands tile instead of overlap. Desktop leaves
         the var unset (0px) and is byte-identical to before. */
      dock.style.setProperty('bottom', 'var(--ce-shipbar-h, 0px)', 'important');
      dock.style.setProperty('top', 'auto', 'important');
      dock.style.setProperty('width', '100vw', 'important');
      dock.style.setProperty('min-width', '0', 'important');
      dock.style.setProperty('max-width', 'none', 'important');
      /* Sheet height law (owner 2026-09-13): the slide must stay the majority of the
         canvas while tools are open. 62vh left the hero a ~180px sliver on a 874px
         phone; 50vh keeps ~430px of editor. The grid scrolls inside its own viewport.

         F-TE01 (touch-edit, 2026-09-23): and it must not eat the whole screen
         either. A 50vh sheet whose band holds a textarea, the design grid and the
         caption footer is taller than 50vh of CONTENT, so the sheet itself has to
         be scrollable or its lower rows are simply unreachable on a 402x874 phone.
         `overscroll-behavior: contain` keeps that scroll from chaining into the
         library underneath, and `touch-action: manipulation` stops the 300ms
         double-tap-zoom delay on every control inside the sheet.

         MO-SHEET (fix/mobile-overhaul, 2026-09-21): the sheet is anchored `bottom: 0`
         and 50vh tall, so it covered the SHIPBAR — the in-flow band at the bottom of
         the studio column that owns the primary "Send to Plan" control. MEASURED
         402x874 with tools open: sheet y=437..874 (h=437), shipbar y=817..874,
         #studio-post-btn y=824..868. The button's centre resolved to
         `textarea#ce-deck-caption-editor` — the brief's
         "`#studio-post-btn` is occluded by `TEXTAREA#ce-deck-caption-editor`",
         and the `surface-capture-floor` gate fails on exactly this.
         A sheet must never cover the primary ship control (the same law the layer
         ladder states). The band's real height is already published by
         placeShipBar() as `--ce-shipbar-h` on the documentElement, so the sheet
         lifts by exactly that much instead of by a second hard-coded number that
         would drift the moment the band's contents change. */
      var shipbarH = 0;
      try {
        shipbarH = parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue('--ce-shipbar-h')) || 0;
      } catch (_eShip) { shipbarH = 0; }
      dock.style.setProperty('bottom', 'calc(' + shipbarH + 'px + var(--ce-keyboard-inset, 0px))', 'important');
      dock.style.setProperty('--ce-tools-sheet-h', 'min(62dvh, 560px, calc(var(--ce-visual-viewport-height, 100dvh) - var(--ce-shipbar-h, 0px) - env(safe-area-inset-top, 0px) - 32px))');
      dock.style.setProperty('height', 'var(--ce-tools-sheet-h)', 'important');
      dock.style.setProperty('max-height', 'var(--ce-tools-sheet-h)', 'important');
      dock.style.setProperty('min-height', 'min(180px, var(--ce-tools-sheet-h))', 'important');
      dock.style.setProperty('display', 'block', 'important');
      dock.style.setProperty('overflow-y', 'auto', 'important');
      dock.style.setProperty('overflow-x', 'hidden', 'important');
      dock.style.setProperty('overscroll-behavior', 'contain', 'important');
      dock.style.setProperty('touch-action', 'manipulation', 'important');
      dock.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      /* MO-LADDER (fix/mobile-overhaul, 2026-09-21): this was the literal 500 while the
         ladder already defines --z-sheet: 500 for exactly this element. A second copy of
         the number is how the two drift apart, so read the rung. */
      dock.style.setProperty('z-index', 'var(--z-sheet)', 'important');
      dock.style.setProperty('box-sizing', 'border-box', 'important');
      /* D-05 (2026-09-21, manager): this inline write is the LAST word on the
         sheet's ground — it is what an actual tap produces, and an inline
         `!important` beats every stylesheet rule that is not itself `!important`
         on the same property. The literal rgba(12,13,18,0.98) was authored for
         the dark studio with the theme never asked, so on cream the sheet stayed
         near-black under near-black text: measured 402x874, light theme,
         `#ce-studio-inspector .ce-tools-toggle` rgba-composited rgb(24,22,27)
         on rgb(17,18,22) = 1.04:1 (invisible) and `.ce-inspector-label`
         rgb(107,101,119) on rgb(17,18,22) = 3.35:1 (sub-AA). Dark measured
         17.20:1 / 5.38:1 and is correct, so only the bright branch moves.
         The ground is asked of the same body class the rest of the app toggles
         (`document.body.classList.contains('bright-theme')`, set by
         applyTheme / the boot script from localStorage `ce_theme`), and the
         cream value is the bright chrome's own rgba(248,246,240,.78) glass at
         the sheet's authored 0.98 alpha — not a new color. ce-mobile.css
         re-states the same pair so the sheet is correct whether or not this
         function ran (the sheet also exists in the `:906` /
         `.ce-carousel-editor` CSS path); the two can never disagree because the
         theme test is the same one. */
      var brightSheet = false;
      try { brightSheet = document.body.classList.contains('bright-theme'); } catch (_eBright) { }
      dock.style.setProperty('background',
        brightSheet ? 'rgba(248, 246, 240, 0.98)' : 'rgba(12, 13, 18, 0.98)', 'important');
      dock.style.setProperty('color', brightSheet ? '#18161b' : '#f3f1ec', 'important');
      var scroll = dock.querySelector('.ce-inspector-scroll');
      var pinned = dock.querySelector('.ce-inspector-pinned');
      if (scroll) {
        scroll.style.setProperty('position', 'absolute', 'important');
        /* MO-SHEET2 (fix/mobile-overhaul, 2026-09-21): the bottom inset was a
           hard-coded 96px, authored when the pinned band was 96px tall. The band's
           real height is now MEASURED (its caption section is 73px), so a hard-coded
           96px left the scroll region 23px short of the band and the last row of
           design swatches sat under the sheet's own footer. Measured before:
           .ce-look-picker spans y=508..1433 (925px) while the scroll region ends at
           y=721, so swatches at y=742+ were painted under the band and
           elementFromPoint at their centres returned `div.studio-shipbar`.
           The band is measured here, in the same pass that positions it, so the two
           can never drift apart. */
        var pinnedH = 0;
        try {
          var pinnedEl = dock.querySelector('.ce-inspector-pinned');
          if (pinnedEl) {
            pinnedH = Math.round(pinnedEl.getBoundingClientRect().height);
            if (!pinnedH) pinnedH = parseFloat(getComputedStyle(pinnedEl).height) || 0;
          }
        } catch (_ePinned) { pinnedH = 0; }
        if (!pinnedH) pinnedH = 96;   /* pre-layout fallback: the authored value */
        scroll.style.setProperty('inset', '44px 0 ' + pinnedH + 'px 0', 'important');
        scroll.style.setProperty('display', 'block', 'important');
        scroll.style.setProperty('overflow-y', 'auto', 'important');
        scroll.style.setProperty('overflow-x', 'hidden', 'important');
        /* The portal dock is already full-bleed at x=0; 100vw here re-introduced a
           1px sideways clip the audit flagged (auditor order 9, 2026-09-13). */
        scroll.style.setProperty('width', '100%', 'important');
        scroll.style.setProperty('box-sizing', 'border-box', 'important');
        scroll.querySelectorAll('.ce-dock-column').forEach(function (column) {
          column.style.setProperty('position', 'static', 'important');
          column.style.setProperty('display', 'block', 'important');
          column.style.setProperty('width', '100%', 'important');
          column.style.setProperty('height', 'auto', 'important');
          column.style.setProperty('overflow', 'visible', 'important');
        });
      }
      if (pinned) {
        pinned.style.setProperty('position', 'absolute', 'important');
        pinned.style.setProperty('inset', 'auto 0 0 0', 'important');
        pinned.style.setProperty('display', 'flex', 'important');
        pinned.style.setProperty('width', '100vw', 'important');
        pinned.style.setProperty('height', '96px', 'important');
        pinned.style.setProperty('overflow-y', 'auto', 'important');
      }
    }
    function toggle(event) {
      if (event) { event.preventDefault(); event.stopImmediatePropagation(); }
      var open = !editor.classList.contains('ce-tools-open');
      editor.classList.toggle('ce-tools-open', open);
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      var label = t.querySelector('.ce-tools-toggle-label');
      if (label) label.textContent = open ? 'Close tools' : 'Tools';
      if (open) openSheet(); else restore();
      /* This capture-phase owner stopImmediatePropagation()s the app's own toggle
         handler, which used to run fitCarouselEditorSlides() — with it gone, the
         freshly-portal'd design-picker minis stayed unscaled 1080x1350 in 180x225
         windows and painted as flat corner swatches (owner 2026-09-13). The fit
         pass belongs to the sheet, not the click path that was removed. */
      try { if (window.__CE_FIT_CAROUSEL_EDITOR_SLIDES__) requestAnimationFrame(window.__CE_FIT_CAROUSEL_EDITOR_SLIDES__); } catch (_fitErr) {}
    }
    t.addEventListener('click', toggle, true);
    t.__ceToolsEditor = editor;
    t.__ceToolsRestore = restore;
    t.__ceToolsOpen = openSheet;
    t.__ceToolsReset = reset;
    t.__ceToolsCaptureHome = captureHome;
    window.__CE_RESET_PHONE_TOOLS__ = reset;
    /* F-TE01 (touch-edit, 2026-09-23): Escape, outside-tap and the route
       boundary. The sheet is portaled to <body> at z-sheet (500) and covered
       the slide and shipbar at 50vh; the ONLY way out was tapping the 44px
       "Close tools" pill. Escape is the keyboard parity the rest of the app
       already honours, the outside tap is the phone's natural one, and the
       route boundary closes it when the studio itself is being left. All three
       call reset(), which is the function that restores the portal home — so
       they cannot leave an orphaned fixed panel behind. */
    if (!t.__ceToolsDismissBound) {
      t.__ceToolsDismissBound = true;
      var dismissOnOutside = function (e) {
        if (!portaled || !editor.classList.contains('ce-tools-open')) return;
        var tgt = e.target;
        if (tgt && (dock.contains(tgt) || t.contains(tgt) || (tgt.closest && tgt.closest('.ce-tools-toggle')))) return;
        reset();
      };
      document.addEventListener('pointerdown', dismissOnOutside, true);
      /* F-TE01 (touch-edit, 2026-09-23): this sheet lives in its own IIFE, so the
         teardown's listener list is not in scope — pass the extension through
         the one shared teardown the layer publishes. The pair is therefore
         released by `window.ceTouchEdit.teardown()` exactly like everything the
         other IIFE installs. */
      var sheetExt = window.ceTouchEdit.__ext || (window.ceTouchEdit.__ext = []);
      sheetExt.push({ target: document, type: 'pointerdown', fn: dismissOnOutside, opts: true });
    }
    t.style.setProperty('position', 'static', 'important');
    t.style.setProperty('display', 'flex', 'important');
    t.style.setProperty('align-items', 'center', 'important');
    t.style.setProperty('justify-content', 'center', 'important');
    t.style.setProperty('width', '100%', 'important');
    t.style.setProperty('height', '44px', 'important');
    t.style.setProperty('pointer-events', 'auto', 'important');
  }
  var dockEnsureTimer = 0;   /* declared once at the top of the IIFE */
  var scheduleDockEnsure = function () {
    if (dockEnsureTimer) return;
    dockEnsureTimer = setTimeout(function () {
      dockEnsureTimer = 0;
      ensureDockTools();
    }, 80);
  };
  function arm() {
    /* F-TE01 (touch-edit, 2026-09-23): Escape is registered at the ARM level,
       not inside ensureDockTools(). The dock does not exist on a poem route, so
       a sheet-scoped Escape listener could never be installed there, and the
       previous location meant the key the rest of the app already treats as
       "dismiss" was dead on exactly the surfaces it matters most. Idempotent by
       the same flag pattern as the observer below. */
    if (!window.__CE_TOOLS_ESC_BOUND__) {
      window.__CE_TOOLS_ESC_BOUND__ = true;
      var escFn = function (e) {
        if (e.key !== 'Escape') return;
        if (typeof window.__CE_RESET_PHONE_TOOLS__ !== 'function') return;
        if (!document.querySelector('.ce-carousel-editor.ce-tools-open')) return;
        e.preventDefault();
        try { window.__CE_RESET_PHONE_TOOLS__(); } catch (_esc) {}
      };
      document.addEventListener('keydown', escFn, true);
      (window.ceTouchEdit.__ext || (window.ceTouchEdit.__ext = []))
        .push({ target: document, type: 'keydown', fn: escFn, opts: true });
    }
    /* The observer runs the dock sweep unconditionally — it is created before
       the dock is resolved because `ensureDockTools()` returns early whenever
       the surface has no `.ce-studio-inspector` at all, and poems have none.
       Installing the render signal only after a successful dock resolution
       meant a poem-only route never got one, so nothing re-armed after the
       studio was rebuilt. The observer only schedules a debounced sweep; the
       sweep is what decides whether there is a dock to wire. */
    if (!window.__CE_DOCK_TOOLS_OBSERVER__) {
      window.__CE_DOCK_TOOLS_OBSERVER__ = true;
      var target = document.body || document.documentElement;
      if (target && typeof MutationObserver === 'function') {
        var ob = new MutationObserver(scheduleDockEnsure);
        ob.observe(target, { childList: true, subtree: true });
        (window.ceTouchEdit.__ext || (window.ceTouchEdit.__ext = []))
          .push({ observer: ob });
        /* Remember the LIVE observer so a later teardown disconnects exactly
           this one, and only this one. */
        window.__CE_DOCK_TOOLS_OBS__ = ob;
      }
    }
    ensureDockTools();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();
