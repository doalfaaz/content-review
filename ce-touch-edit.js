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
      v.textContent = '#ce-boot-veil{position:fixed;inset:0;z-index:100000;background:#121016;transition:opacity .25s ease}';
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
      window.addEventListener('load', function () { setTimeout(function () { window.__CE_LIFT_VEIL__ && window.__CE_LIFT_VEIL__(); }, 3500); });
    }
  } catch (_) {}
  /* Edge-swipe: swipe in from the LEFT edge opens the nav drawer (owner:
     "swipe left and see the tabs"), with the app's own scrim + tap-outside. */
  try {
    var edgeStart = null;
    document.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      if (t && t.clientX <= 28) edgeStart = { x: t.clientX, y: t.clientY };
      else edgeStart = null;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!edgeStart) return;
      var t = e.touches[0];
      if (t.clientX - edgeStart.x > 48 && Math.abs(t.clientY - edgeStart.y) < 60) {
        edgeStart = null;
        var sb = document.querySelector('.sidebar');
        if (sb && sb.classList.contains('collapsed')) {
          var tg = document.getElementById('sidebar-toggle');
          tg && tg.click();
        }
      }
    }, { passive: true });
  } catch (_) {}
  // W7: honest degradation — when the Mac is unreachable (in-app Chromium
  // webviews deny Local-Network-Access, Mac asleep, cellular), never leave a
  // silent dead button. Surface the manual route once and record the mode.
  window.__CE_SYNC_UNREACHABLE__ = false;
  function markUnreachable(mode) {
    if (window.__CE_SYNC_UNREACHABLE__) return;
    window.__CE_SYNC_UNREACHABLE__ = true;
    try { localStorage.setItem('ce_last_sync_error', mode + ' @ ' + new Date().toISOString()); } catch (_) {}
    if (window.showAppToast) window.showAppToast('Mac unreachable — open in Safari or use Download-for-phone');
    console.warn('[ce-sync] unreachable:', mode);
  }
  var reachFlapGuard = 0;
  function markReachable() {
    // flap guard (audit 9.14): only clear when actually flagged, and not
    // more than once a minute.
    if (!window.__CE_SYNC_UNREACHABLE__) return;
    var now = Date.now();
    if (now - reachFlapGuard < 60000) return;
    reachFlapGuard = now;
    window.__CE_SYNC_UNREACHABLE__ = false;
    try { localStorage.removeItem('ce_last_sync_error'); } catch (_) {}
  }
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
  // OWNER LAW / AUDIT FIX (2026-09-11): do NOT probe the sync endpoint at page load.
  // The endpoint lives on the owner's private tailnet. Probing it from a public
  // visitor's browser (a) discloses the hostname in every visitor's network log and
  // (b) produces an unavoidable console error (TLS/network failure from anywhere that
  // cannot reach the tailnet), which tripped the pack-webkit-oracle gates x3.
  // Discover LAZILY instead: on the first real pointer/key interaction, which is also
  // the only time sync can actually be used. Nothing is lost — every sync action
  // requires an interaction first, and `window.__CE_SYNC_ENDPOINT__` short-circuits the
  // discovery once resolved (see the guard inside findSyncEndpoint).
  var __ceSyncDiscoveryArmed = false;
  function armSyncDiscovery() {
    if (__ceSyncDiscoveryArmed) return;
    __ceSyncDiscoveryArmed = true;
    findSyncEndpoint(function (base) { if (base) window.__CE_SYNC_ENDPOINT__ = base; });
  }
  window.__CE_ARM_SYNC__ = armSyncDiscovery;
  document.addEventListener('pointerdown', armSyncDiscovery, { once: true, passive: true });
  document.addEventListener('keydown', armSyncDiscovery, { once: true, passive: true });
  // A stale cached endpoint is still revalidated lazily, on the same trigger.

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
    attempt(getWriteKey(), false).then(function (res) {
      if (!res) markUnreachable('write-failed'); else markReachable();
    }).catch(function () { markUnreachable('write-failed'); });
  };

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
    pullFailures = 0;
    findSyncEndpoint(function (b) { if (b) window.__CE_SYNC_ENDPOINT__ = b; });
  }
  function pullRemoteEdits() {
    // F-02: reads are key-gated. Share visitors (no key) skip silently —
    // they read the static share-decks payload, never the private store.
    if (!window.__CE_SYNC_ENDPOINT__ || document.hidden) return;
    var key = getWriteKey();
    if (!key) return;
    var base = window.__CE_SYNC_ENDPOINT__;
    fetch(base + '/decks', { headers: { 'X-CE-Sync-Key': key } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.decks) { pullFailures++; healEndpointIfDead(); if (pullFailures === 0) markReachable(); else markUnreachable('pull-' + pullFailures); return; }
        pullFailures = 0;
        markReachable();
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
        markUnreachable('pull-network');
        healEndpointIfDead();
      });
  }
  // test/probe hook (final refinement): deterministic pull for E2E checks
  window.__CE_PULL_REMOTE_EDITS__ = pullRemoteEdits;
  setTimeout(pullRemoteEdits, 1200);
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
  window.__CE_PHONE_SCHEDULE__ = function () {
    var deck = window.studioDeck ? window.studioDeck() : null;
    if (!deck || !deck.slides || !deck.slides.length) { if (window.showAppToast) window.showAppToast('Open a deck first'); return; }
    var old = document.getElementById('ce-sched-sheet');
    if (old) old.remove();
    var sheet = document.createElement('div');
    sheet.id = 'ce-sched-sheet';
    sheet.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;';
    var slides = deck.slides.length;
    sheet.innerHTML =
      '<div style="width:100%;background:#1c1a24;color:#fff;border-radius:16px 16px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font-family:-apple-system,system-ui,sans-serif;">' +
      '<div style="font-weight:800;font-size:15px;margin-bottom:10px">Schedule \u201C' + String(deck.title || deck.id).slice(0, 40) + '\u201D on Meta\u2019s clock</div>' +
      '<label style="font-size:12px;opacity:.75">Platform</label>' +
      '<select id="ce-sched-platform" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<option value="facebook">Facebook — fully automatic, holds on Meta\u2019s clock</option>' +
      '<option value="instagram">Instagram — fires from the Mac at its minute (\u226410 slides)</option></select>' +
      '<label style="font-size:12px;opacity:.75" id="ce-sched-datelabel">Date (a week+ out — owner law)</label>' +
      '<input id="ce-sched-date" type="date" min="' + istFloorPlus7DateStr() + '" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<label style="font-size:12px;opacity:.75">Time (IST)</label>' +
      '<input id="ce-sched-time" type="time" value="11:30" style="width:100%;padding:10px;margin:4px 0 10px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444">' +
      '<label style="font-size:12px;opacity:.75">Caption</label>' +
      '<textarea id="ce-sched-caption" rows="3" style="width:100%;padding:10px;margin:4px 0 12px;border-radius:8px;background:#2a2733;color:#fff;border:1px solid #444;box-sizing:border-box"></textarea>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="ce-sched-go" style="flex:1;padding:12px;border:0;border-radius:10px;font-weight:800;background:#d4576b;color:#fff;font-size:14px">Schedule (week+ out)</button>' +
      '<button id="ce-sched-cancel" style="padding:12px 18px;border:1px solid #555;border-radius:10px;background:transparent;color:#fff;font-weight:700">Cancel</button></div>' +
      '<div id="ce-sched-status" style="font-size:12px;opacity:.8;margin-top:8px;min-height:16px"></div></div>';
    document.body.appendChild(sheet);
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
    sheet.querySelector('#ce-sched-cancel').onclick = function () { sheet.remove(); };
    sheet.querySelector('#ce-sched-go').onclick = function () {
      var platform = sheet.querySelector('#ce-sched-platform').value;
      var date = sheet.querySelector('#ce-sched-date').value;
      var time = sheet.querySelector('#ce-sched-time').value || '11:30';
      var caption = sheet.querySelector('#ce-sched-caption').value.trim();
      var status = sheet.querySelector('#ce-sched-status');
      if (!date) { status.textContent = 'Pick a date first.'; return; }
      if (platform === 'instagram' && slides > 10) { status.textContent = 'IG carousels cap at 10 slides (Meta API). Use Download-for-phone + manual posting.'; return; }
      if (!caption) { status.textContent = 'Add a caption.'; return; }
      var unixMs = new Date(date + 'T' + time + ':00' + SYNC_IST).getTime();
      var payload = { deckId: deck.id, platform: platform, caption: caption, scheduleUnixMs: unixMs, slidesCount: slides };
      var btn = sheet.querySelector('#ce-sched-go');
      if (window.__CE_SYNC_UNREACHABLE__) { status.textContent = 'Mac unreachable — open in Safari or use Download-for-phone.'; return; }
      btn.disabled = true; status.textContent = 'Sending to your Mac\u2026';
      function submit(key) {
        var ep = window.__CE_SYNC_ENDPOINT__;
        if (!ep) { status.textContent = 'Sync endpoint not discovered yet — check the Mac is reachable.'; btn.disabled = false; return Promise.resolve(null); }
        return fetch(ep + '/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CE-Sync-Key': key },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); });
      }
      ensureWriteKey(function (key) {
        if (!key) { status.textContent = 'Write key needed for scheduling.'; btn.disabled = false; return; }
        submit(key).then(function (res) {
          if (res && res.status === 403) {
            try { localStorage.removeItem('ce_sync_key'); } catch (_) {}
            ensureWriteKey(function (k2) {
              if (!k2) { status.textContent = 'Write key needed.'; btn.disabled = false; return; }
              submit(k2).then(function (r2) { finish(r2); }, function () { status.textContent = 'Network failed.'; btn.disabled = false; });
            });
            return;
          }
          finish(res);
        });
      });
      function finish(res) {
        btn.disabled = false;
        if (res && res.status === 200 && res.body && res.body.ok) {
          status.textContent = 'Queued. Your Mac schedules it on Meta\u2019s clock within ~30s (must be running).';
          if (window.showAppToast) window.showAppToast('Schedule queued to your Mac');
          setTimeout(function () { sheet.remove(); }, 2600);
        } else {
          status.textContent = (res && res.body && res.body.error) ? res.body.error : 'Could not queue the schedule.';
        }
      }
    };
  };
  // Inject the Schedule button next to the pack button inside the studio topbar.
  function armScheduleButton() {
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
      btn.title = 'Queue this piece on Meta\u2019s clock (a week+ out)';
      btn.style.cssText = 'display:inline-flex; align-items:center; min-height:40px; padding:8px 14px; font-weight:800; border-radius:10px; color:#fff; background:#2e6f5e; border:1px solid rgba(255,255,255,0.14); cursor:pointer;';
      btn.onclick = function () { try { window.__CE_PHONE_SCHEDULE__(); } catch (e) { if (window.showAppToast) window.showAppToast('Schedule failed: ' + e.message); } };
      justCreated = true;
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
  }
  var mo = new MutationObserver(function () { setTimeout(armSweep, 120); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
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
  setInterval(armSweep, 2500); // safety net for replaced nodes
})();
