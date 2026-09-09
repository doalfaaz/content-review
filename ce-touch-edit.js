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

  function bridge() {
    return window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ceBridge;
  }

  function armTouchEditing(container) {
    if (!container) return;
    var stage = container.querySelector('#ce-real-stage') || container;
    var editables = container.querySelectorAll('[data-ce-block="content"], [data-ce-block="hook"], [data-ce-block="body"], .kickline[data-ce-edit]');
    editables.forEach(function (el) {
      if (el.__ceTouchArmed) return;
      el.__ceTouchArmed = true;
      el.style.touchAction = 'none';

      var lpTimer = 0, lpFired = false, downPt = null;

      el.addEventListener('pointerdown', function (e) {
        if (el.getAttribute('contenteditable') === 'true') return;
        if (e.pointerType === 'mouse') return; // desktop keeps dblclick
        lpFired = false;
        downPt = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(function () {
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
        }, LONG_PRESS_MS);
      });

      var cancelLP = function (e) {
        if (lpTimer && downPt && e.clientX != null &&
            Math.abs(e.clientX - downPt.x) + Math.abs(e.clientY - downPt.y) > 12) {
          clearTimeout(lpTimer); lpTimer = 0;
        }
      };
      el.addEventListener('pointermove', cancelLP);
      el.addEventListener('pointercancel', function () { clearTimeout(lpTimer); lpTimer = 0; });

      el.addEventListener('pointerup', function () {
        clearTimeout(lpTimer); lpTimer = 0;
      });

      // Commit on input (debounced) — the canvas can re-render mid-edit and
      // replace this node, which kills blur; live-save is also Canva-style.
      var commitTimer = 0;
      var commit = function () {
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
        el.__cePendingText = (el.innerText || '').trim();
        clearTimeout(commitTimer);
        commitTimer = setTimeout(commit, 500);
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
     Sync endpoint discovery: same-Wi-Fi Mac runs the sync server on :4145 —
     candidates are probed once; the first that answers wins. Every save POSTs
     the deck there; the Mac app reads the same store, so both sides show ONE
     version (last-write-wins per deck by updatedAt). */
  function findSyncEndpoint(cb) {
    // Endpoint sticks across reloads once discovered (localStorage cache).
    try {
      var cached = localStorage.getItem('ce_sync_endpoint');
      if (cached) { window.__CE_SYNC_ENDPOINT__ = cached; cb(cached); return; }
    } catch (_) {}
    if (window.__CE_SYNC_ENDPOINT__) { cb(window.__CE_SYNC_ENDPOINT__); return; }
    var cands = [];
    if (location.hostname === 'doalfaaz.github.io' || location.protocol === 'file:') {
      // Tailscale HTTPS first (valid cert, works on cellular too), then LAN.
      cands = ['https://tushars-macbook-air.tail697d80.ts.net', 'http://192.168.1.35:4145'];
    } else if (/^https?:\/\/(localhost|127\.|192\.168\.|10\.)/.test(location.origin)) {
      cands = [location.origin.replace(/:\d+$/, ':4145')];
    }
    var i = 0;
    var tryNext = function () {
      if (i >= cands.length) { cb(null); return; }
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
  findSyncEndpoint(function (base) { if (base) window.__CE_SYNC_ENDPOINT__ = base; });

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
    try { localStorage.setItem('ce_deck_edits', JSON.stringify(store)); } catch (_) {}
    if (window.__CE_SYNC_ENDPOINT__) {
      var payload = { deckId: deck.id, deck: store[deck.id] };
      var url = window.__CE_SYNC_ENDPOINT__ + '/decks';
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {
        // WebKit/Safari: public->private POST bodies are blocked; simple GET
        // write still passes. GET /set?d=<b64> applies the same payload.
        var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        return fetch(window.__CE_SYNC_ENDPOINT__ + '/set?d=' + encodeURIComponent(b64));
      }).catch(function () {});
    }
  };

  // Boot: re-apply locally-edited decks over the static payload so the site
  // shows YOUR version, and keep the arm hook attached to every canvas render.
  function applyLocalEdits() {
    var store = {};
    try { store = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) { return; }
    Object.keys(store).forEach(function (id) {
      var rec = store[id];
      if (rec && Array.isArray(rec.slides) && rec.slides.length) {
        window.__CE_DECKS_FULL__ = window.__CE_DECKS_FULL__ || {};
        window.__CE_DECKS_FULL__[id] = Object.assign({}, window.__CE_DECKS_FULL__[id] || {}, rec, { id: id });
      }
    });
  }
  applyLocalEdits();

  // Pull remote edits (from the Mac app) so the phone shows the app's version.
  // Runs on boot and every 60s while the page is visible.
  function pullRemoteEdits() {
    if (!window.__CE_SYNC_ENDPOINT__ || document.hidden) return;
    fetch(window.__CE_SYNC_ENDPOINT__ + '/decks')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.decks) return;
        var local = {};
        try { local = JSON.parse(localStorage.getItem('ce_deck_edits') || '{}'); } catch (_) {}
        Object.keys(data.decks).forEach(function (id) {
          var remote = data.decks[id];
          var mine = local[id];
          if (remote && Array.isArray(remote.slides)) {
            if (!mine || (remote.updatedAt || 0) > (mine.updatedAt || 0)) {
              local[id] = remote;
              window.__CE_DECKS_FULL__ = window.__CE_DECKS_FULL__ || {};
              window.__CE_DECKS_FULL__[id] = Object.assign({}, window.__CE_DECKS_FULL__[id] || {}, remote, { id: id });
            }
          }
        });
        localStorage.setItem('ce_deck_edits', JSON.stringify(local));
      })
      .catch(function () {});
  }
  setTimeout(pullRemoteEdits, 1200);
  setInterval(pullRemoteEdits, 60000);


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
    var studio = document.getElementById('studio');
    if (!studio) return;
    armTouchEditing(studio);
  }
  var mo = new MutationObserver(function () { setTimeout(armSweep, 120); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(armSweep, 800);
  setInterval(armSweep, 2500); // safety net for replaced nodes
})();
