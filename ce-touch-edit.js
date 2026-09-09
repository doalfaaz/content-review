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
     Sync endpoint: the Mac runs the sync server behind a Tailscale Funnel
     capability path (server 404s anything without the secret prefix — audited
     2026-09-09: the store must never be publicly writable at the bare host).
     Every save POSTs the deck there; the Mac app reads the same store, so both
     sides show ONE version (last-write-wins per deck by updatedAt). */
  var SYNC_PATH = '/39c4ee5650102ee027bd87bcc4e9a2ea';
  function findSyncEndpoint(cb) {
    function discover() {
      var cands = [];
      if (location.hostname === 'doalfaaz.github.io' || location.protocol === 'file:') {
        // Tailscale Funnel HTTPS (valid cert, works on cellular + any browser).
        cands = ['https://tushars-macbook-air.tail697d80.ts.net' + SYNC_PATH];
      } else if (/^https?:\/\/(localhost|127\.|192\.168\.|10\.)/.test(location.origin)) {
        cands = [location.origin.replace(/:\d+$/, ':4145') + SYNC_PATH];
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
  findSyncEndpoint(function (base) { if (base) window.__CE_SYNC_ENDPOINT__ = base; });

  /* ---- Write key (P0-2) ---------------------------------------------------
     Writes on the sync server require the shared write key (X-CE-Sync-Key
     header / ?k= param). The owner pastes it ONCE via prompt(); it lives in
     localStorage `ce_sync_key`. Reads stay key-free — the manager read-view
     never triggers this. */
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
    if (!window.__CE_SYNC_ENDPOINT__) return;
    var payload = { deckId: deck.id, deck: store[deck.id] };
    var base = window.__CE_SYNC_ENDPOINT__;
    function send(key, viaGet) {
      // Resolves {status} on any HTTP response, null on network failure
      // (WebKit/Safari blocks public->private POST bodies at the network
      // level — that is a rejection, so the GET /set?d= fallback exists).
      var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      var req = viaGet
        ? fetch(base + '/set?d=' + encodeURIComponent(b64) + (key ? '&k=' + encodeURIComponent(key) : ''))
        : fetch(base + '/decks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key },
            body: JSON.stringify(payload)
          });
      return req.then(
        function (r) { return { status: r.status }; },
        function () { return null; }
      );
    }
    function attempt(key, viaGet) {
      return send(key, viaGet).then(function (res) {
        if (res && res.status === 403) {
          // Wrong/missing write key — clear it, prompt once, retry same verb.
          try { localStorage.removeItem('ce_sync_key'); } catch (_) {}
          return new Promise(function (resolve) {
            ensureWriteKey(function (newKey) {
              if (!newKey) { resolve(null); return; }
              attempt(newKey, viaGet).then(resolve);
            });
          });
        }
        if (!res && !viaGet) return attempt(key || getWriteKey(), true); // POST blocked → GET write
        return res;
      });
    }
    attempt(getWriteKey(), false).catch(function () {});
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
  // Runs on boot and every 60s while the page is visible. Three consecutive
  // failed pulls (P0-3) clear the cached endpoint and re-run discovery — a
  // stale endpoint can never wedge sync permanently.
  var pullFailures = 0;
  function healEndpointIfDead() {
    if (pullFailures < 3) return;
    try { localStorage.removeItem('ce_sync_endpoint'); } catch (_) {}
    window.__CE_SYNC_ENDPOINT__ = null;
    pullFailures = 0;
    findSyncEndpoint(function (b) { if (b) window.__CE_SYNC_ENDPOINT__ = b; });
  }
  function pullRemoteEdits() {
    if (!window.__CE_SYNC_ENDPOINT__ || document.hidden) return;
    var base = window.__CE_SYNC_ENDPOINT__;
    fetch(base + '/decks')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.decks) { pullFailures++; healEndpointIfDead(); return; }
        pullFailures = 0;
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
      .catch(function () {
        pullFailures++;
        healEndpointIfDead();
      });
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
