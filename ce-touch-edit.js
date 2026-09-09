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
      '<label style="font-size:12px;opacity:.75">Date (a week+ out — owner law)</label>' +
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
    var btn = document.getElementById('studio-schedule-btn');
    var justCreated = false;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'studio-schedule-btn';
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
    var studio = document.getElementById('studio');
    if (!studio) return;
    armTouchEditing(studio);
    armScheduleButton();
  }
  var mo = new MutationObserver(function () { setTimeout(armSweep, 120); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(armSweep, 800);
  setInterval(armSweep, 2500); // safety net for replaced nodes
})();
