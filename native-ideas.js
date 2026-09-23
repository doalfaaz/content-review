(function () {
  'use strict';
  /* Idempotency guard (cloud/ce-ui, 2026-09-21): a second injection of this
     script used to build a second module instance, which added a SECOND
     document click listener — every tap then ran handleClick twice (double
     navigation, double copy, double schedule). The first injection is the one
     owner; a repeat is a plain no-op. */
  if (window.__CE_IDEAS_IMPL__) return;

  var filter = 'all';
  var language = 'english';
  var structuredOnly = false;
  var filterMenuOpen = false;
  var openGroups = Object.create(null);
  /* ADA P1-1 (ideas-ada, 2026-09-23): the card outline's expanded state is
     owned HERE, next to the markup that renders it, so cardHtml can bake
     `is-open` + `aria-expanded` on the first paint of every re-render. The
     host handler no longer keeps a parallel keyed map re-applied by a
     MutationObserver — one state owner, one toggle path. */
  var openCards = Object.create(null);
  var context = { query: '' };
  var mounted = false;

  var TOPIC_PRIORITY = [
    'Spirituality & Psychology Bridge',
    'Shadow & Power',
    'Deep Psychology',
    'Dark Psychology',
    'Trauma & Origins',
    'Creator Mind, Visibility and Launch Fear',
    'Self-Compassion & Inner Climate',
    'Healing & Integration',
    'Shame, Secrecy and the Private Courtroom',
    'Grief, Ambiguous Loss & Unlived Lives',
    'Meaning, Purpose & Dharma',
    'Witness & Meta-Awareness',
    'Vedanta & Non-Dual',
    'Bhagavad Gita',
    'Karma & Action',
    'Consciousness & Awareness',
    'Identity & Self',
    'Mind & Cognition'
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function strip(value) {
    return String(value == null ? '' : value)
      .replace(/<br\s*\/?>(\s*)/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/[—–]/g, ', ')
      .replace(/\s+,/g, ',')
      .replace(/,\s+,/g, ',')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleOf(item) {
    return strip(item && (item.name || item.title || item.topic) || 'Idea');
  }

  function topicOf(item) {
    var topic = strip(item && (item.topic || item.category) || 'Ideas');
    if (!topic) return 'Ideas';
    return topic.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function categoryOf(item) {
    var category = strip(item && (item.cat || item.category) || '').toLowerCase();
    if (category.indexOf('philos') >= 0) return 'philosophy';
    if (category.indexOf('psych') >= 0) return 'psychology';
    if (category.indexOf('story') >= 0) return 'stories';
    return category || 'ideas';
  }

  function languageOf(item) {
    var source = item || {};
    var text = [source.cat, source.topic, source.name, source.title, source.hook, source.crux].join(' ');
    return /hinglish/i.test(text) || /[\u0900-\u097F]/.test(text) ? 'hinglish' : 'english';
  }

  function pointsOf(item) {
    var raw = item && (Array.isArray(item.outline) ? item.outline : item.points);
    if (!Array.isArray(raw)) return [];
    return raw.map(function (point) {
      if (point && typeof point === 'object') {
        return { label: strip(point.b || point.label || ''), text: strip(point.t || point.text || ''), subpoints: Array.isArray(point.s) ? point.s.map(strip).filter(Boolean) : [] };
      }
      return { label: '', text: strip(point), subpoints: [] };
    }).filter(function (point) { return point.label || point.text || point.subpoints.length; });
  }

  // Outline points are structured {label, text, subpoints}; serialize them the
  // way the card renders them. String-coercing a point produces the literal
  // "[object Object]" leak this path once shipped into Write drafts.
  function outlineLine(point) {
    if (!point || typeof point !== 'object') return strip(point);
    var text = point.label ? point.label + ': ' + point.text : point.text;
    if (point.subpoints && point.subpoints.length) {
      text += '\n' + point.subpoints.map(function (subpoint) { return '  - ' + subpoint; }).join('\n');
    }
    return text;
  }

  function bodyOf(item) {
    var source = item || {};
    if (Array.isArray(source.outline)) {
      var outlineText = source.outline.map(outlineLine).filter(Boolean).join(' ');
      if (outlineText) return outlineText;
    }
    return strip(source.crux || source.hook || source.body || '');
  }

  function searchableText(item) {
    return [item && item.cat, item && item.topic, titleOf(item), item && item.hook, item && item.crux, item && item.body]
      .concat(pointsOf(item).map(function (point) { return point.label + ' ' + point.text + ' ' + point.subpoints.join(' '); }))
      .join(' ')
      .toLowerCase();
  }

  function richScore(item) {
    return bodyOf(item).length + titleOf(item).length + pointsOf(item).reduce(function (total, point) {
      return total + point.label.length + point.text.length + point.subpoints.join(' ').length;
    }, 0);
  }

  // Share the exact richness rule with the fallback renderer so title
  // deduplication cannot choose a different authored record by surface.
  window.__CE_IDEA_RICH_SCORE__ = richScore;

  function dedupe(items) {
    var seen = Object.create(null);
    var result = [];
    items.forEach(function (item) {
      var key = titleOf(item).toLowerCase();
      if (!key) return;
      if (seen[key] == null) {
        seen[key] = result.length;
        result.push(item);
      } else if (richScore(item) > richScore(result[seen[key]])) {
        result[seen[key]] = item;
      }
    });
    return result;
  }

  function sourceItems() {
    return Array.isArray(window.__HTML_IDEAS__) ? window.__HTML_IDEAS__.filter(function (item) {
      return item && typeof item === 'object' && titleOf(item) !== 'Idea';
    }) : [];
  }

  /* The deduped, richest-wins source list never changes while the page is up
     (window.__HTML_IDEAS__ is baked at load). Recomputing dedupe + richScore
     across all 704 records on every filter/search keystroke was pure waste —
     cache it and only recompute if the host array is replaced. */
  var __dedupedCache = null;
  var __dedupedCacheFor = null;
  function dedupedSource() {
    if (__dedupedCache && __dedupedCacheFor === window.__HTML_IDEAS__) return __dedupedCache;
    __dedupedCache = dedupe(sourceItems());
    __dedupedCacheFor = window.__HTML_IDEAS__;
    return __dedupedCache;
  }

  function matches(item) {
    if (filter === 'psychology' && categoryOf(item) !== 'psychology') return false;
    if (filter === 'philosophy' && categoryOf(item) !== 'philosophy') return false;
    if (languageOf(item) !== language) return false;
    if (structuredOnly && !pointsOf(item).length && !bodyOf(item)) return false;
    /* WL5067/WL2344/WL2287 (2026-09-19): this file is a SEPARATE script from
       index.html's IIFE, so it could not see ceSearchFold and compared raw
       substrings — an NFC-typed query could never reach an NFD corpus word.
       Use the shared fold when the host page exposes it; the raw compare
       stays as the standalone fallback so this file is still self-sufficient. */
    var __raw = String(context.query || '').trim();
    var query = (typeof window.ceSearchFold === 'function')
      ? window.ceSearchFold(__raw)
      : __raw.toLowerCase();
    if (!query) return true;
    var __hay = searchableText(item);
    if (typeof window.ceSearchHit === 'function') return window.ceSearchHit(__hay, query);
    return __hay.toLowerCase().indexOf(query) >= 0;
  }

  function priority(topic) {
    var index = TOPIC_PRIORITY.map(function (value) { return value.toLowerCase(); }).indexOf(topic.toLowerCase());
    return index >= 0 ? index : 1000;
  }

  function groupedItems() {
    var groups = Object.create(null);
    var order = [];
    dedupedSource().filter(matches).forEach(function (item) {
      var topic = topicOf(item);
      var key = topic.toLowerCase();
      if (!groups[key]) {
        groups[key] = { key: key, topic: topic, category: categoryOf(item), items: [] };
        order.push(key);
      }
      groups[key].items.push(item);
    });
    return order.map(function (key) { return groups[key]; }).sort(function (left, right) {
      var byPriority = priority(left.topic) - priority(right.topic);
      return byPriority || left.topic.localeCompare(right.topic);
    }).map(function (group) {
      // 2026-08-26: outline-pending shells sink below substantive cards inside their
      // topic group (stable within each side) — ready work reads first, honest
      // "outline pending" labels stay visible, nothing is hidden or lost.
      var ranked = group.items.map(function (item, i) {
        var intro = bodyOf(item);
        var points = pointsOf(item);
        return { item: item, i: i, ready: !!(intro || points.length) };
      });
      ranked.sort(function (a, b) { return (a.ready === b.ready) ? a.i - b.i : (a.ready ? -1 : 1); });
      group.items = ranked.map(function (r) { return r.item; });
      return group;
    });
  }

  function cardText(item) {
    return [titleOf(item), topicOf(item), item && item.hook, item && item.crux, bodyOf(item)]
      .concat(pointsOf(item).map(function (point) { return [point.label, point.text].concat(point.subpoints).join(' '); }))
      .map(strip).filter(Boolean).join('\n\n');
  }

  function pointHtml(point) {
    var lead = point.label ? '<strong>' + esc(point.label) + ':</strong> ' : '';
    var subpoints = point.subpoints.length
      ? '<ul class="ce-ideas-subpoints">' + point.subpoints.map(function (subpoint) { return '<li>' + esc(subpoint) + '</li>'; }).join('') + '</ul>'
      : '';
    return '<div class="ce-ideas-point">' + lead + esc(point.text) + subpoints + '</div>';
  }

  /* aria-controls splits on whitespace, so the outline ids need a token — an
     authored idea id can contain spaces or quotes. The raw id stays on the
     button's data attribute (matched by string compare, no selector). */
  function outlineToken(value) {
    return Array.from(String(value == null ? '' : value))
      .map(function (ch) { return ch.codePointAt(0).toString(16); }).join('-') || 'idea';
  }

  function cardHtml(item) {
    var points = pointsOf(item);
    var intro = bodyOf(item);
    var title = titleOf(item);
    var pending = !intro && !points.length;
    var id = String(item.id || title);
    var token = outlineToken(id);
    var isOpen = !!openCards[id];
    /* The outline is three sibling regions (intro / points / pending), each hid
       den by the host's collapsed-card rule. aria-controls takes a
       space-separated id list, so the button points at exactly the regions
       this card rendered — the relationship is real even while collapsed. */
    var outlineIds = [];
    var introId = '';
    var pointsId = '';
    var pendingId = '';
    if (intro) { introId = 'ce-idea-intro-' + token; outlineIds.push(introId); }
    if (points.length) { pointsId = 'ce-idea-points-' + token; outlineIds.push(pointsId); }
    if (pending) { pendingId = 'ce-idea-pending-' + token; outlineIds.push(pendingId); }
    var controls = outlineIds.length ? ' aria-controls="' + esc(outlineIds.join(' ')) + '"' : '';
    return '<article class="ce-ideas-card' + (isOpen ? ' is-open' : '') + '" data-ce-idea-id="' + esc(id) + '">' +
      '<h3><button type="button" class="ce-ideas-card-toggle" data-ce-ideas-card-toggle="' + esc(id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '"' + controls + '>' + esc(title) + '</button></h3>' +
      (intro ? '<div class="ce-ideas-card-intro"' + (introId ? ' id="' + esc(introId) + '"' : '') + '>' + esc(intro) + '</div>' : '') +
      (points.length ? '<div class="ce-ideas-points"' + (pointsId ? ' id="' + esc(pointsId) + '"' : '') + '>' + points.map(pointHtml).join('') + '</div>' : '') +
      (pending ? '<div class="ce-ideas-card-pending"' + (pendingId ? ' id="' + esc(pendingId) + '"' : '') + '>Structured outline pending for this idea.</div>' : '') +
      '<div class="ce-ideas-card-actions">' +
      /* F-ID10 (ideas-copy, 2026-09-23): "Take forward" named a destination only the
         toast knew, and "Schedule" collided with Plan's Meta-clock meaning while
         this button only writes a local draft row. Both labels now name the outcome,
         and data-ce-idea-label matches so labelOf() restores the same text. */
      '<button type="button" class="ce-ideas-action is-primary" data-ce-idea-forward="' + esc(item.id || title) + '" data-ce-idea-label="Draft in Write">Draft in Write</button>' +
      '<button type="button" class="ce-ideas-action" data-ce-idea-schedule="' + esc(item.id || title) + '" data-ce-idea-label="Schedule draft">Schedule draft</button>' +
      '<button type="button" class="ce-ideas-action" data-ce-idea-copy="' + esc(item.id || title) + '" data-ce-idea-label="Copy">Copy</button>' +
      '<span class="ce-ideas-action-status" aria-live="polite"></span>' +
      '</div></article>';
  }

  function controlsHtml() {
    /* F-13 (cloud/ce-ui, 2026-09-21): these toggles carried only the visual
       is-active class — a screen reader could not tell which filter was on.
       aria-pressed mirrors each toggle's visual state exactly. */
    return '<div class="ce-ideas-controls" aria-label="Ideas filters">' +
      '<span class="ce-ideas-filter-group" role="group" aria-label="Idea category">' +
      ['all', 'psychology', 'philosophy'].map(function (value) {
        var label = value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1);
        return '<button type="button" class="ce-ideas-filter ' + (filter === value ? 'is-active' : '') + '" data-ce-ideas-filter="' + value + '" aria-pressed="' + (filter === value ? 'true' : 'false') + '">' + label + '</button>';
      }).join('') + '</span>' +
      '<span class="ce-ideas-filter-group ce-ideas-language" role="group" aria-label="Idea language">' +
      ['english', 'hinglish'].map(function (value) {
        return '<button type="button" class="ce-ideas-filter ' + (language === value ? 'is-active' : '') + '" data-ce-ideas-language="' + value + '" aria-pressed="' + (language === value ? 'true' : 'false') + '">' + value.charAt(0).toUpperCase() + value.slice(1) + '</button>';
      }).join('') + '</span>' +
      '<span class="ce-ideas-filter-menu-wrap">' +
      '<button type="button" class="ce-ideas-filter-menu ' + (structuredOnly ? 'is-active' : '') + '" data-ce-ideas-filter-menu aria-haspopup="true" aria-expanded="' + (filterMenuOpen ? 'true' : 'false') + '" aria-pressed="' + (structuredOnly ? 'true' : 'false') + '" aria-controls="ce-ideas-filter-popover">Filters</button>' +
      '<span class="ce-ideas-filter-popover" id="ce-ideas-filter-popover" ' + (filterMenuOpen ? '' : 'hidden') + '>' +
      '<button type="button" class="ce-ideas-menu-item ' + (structuredOnly ? 'is-active' : '') + '" data-ce-ideas-structured="toggle" aria-pressed="' + (structuredOnly ? 'true' : 'false') + '">Structured outlines only</button>' +
      '<button type="button" class="ce-ideas-menu-item" data-ce-ideas-clear>Clear filters</button>' +
      '</span></span></div>';
  }

  function sectionHtml(group, index) {
    var isOpen = !!openGroups[group.key];
    return '<section class="ce-ideas-section ' + (isOpen ? 'is-open' : '') + '" data-ce-ideas-group="' + esc(group.key) + '">' +
      '<button type="button" class="ce-ideas-section-head" data-ce-ideas-group-toggle="' + esc(group.key) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
      '<span class="ce-ideas-section-number">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="ce-ideas-section-title">' + esc(group.topic) + '</span>' +
      /* F-ID12 (ideas-copy, 2026-09-23): the badge said "1 cards"; the chevron is a
         decoration and must not be announced. */
      '<span class="ce-ideas-section-meta"><span class="ce-ideas-count">' + group.items.length + (group.items.length === 1 ? ' card' : ' cards') + '</span><span class="ce-ideas-chevron" aria-hidden="true">⌄</span></span>' +
      '</button>' +
      (isOpen ? '<div class="ce-ideas-card-grid">' + group.items.map(cardHtml).join('') + '</div>' : '') +
      '</section>';
  }

  // Each action button owns its authored label. The label is read from the
  // button's own data attribute (falling back to its text) so a restore can
  // never borrow another button's label.
  function labelOf(button) {
    if (!button) return '';
    var authored = button.getAttribute && button.getAttribute('data-ce-idea-label');
    if (authored) return authored;
    return button.textContent || '';
  }

  // The card's polite live region is the single owner of transient status
  // text, so assistive technology announces the outcome. The button keeps its
  // identity: its label is written to the region, never over the button.
  // F-14 (cloud/ce-ui, 2026-09-21): `success` only paints the is-success tint.
  // It is NEVER a claim on its own — every caller passes true only for a state
  // it has actually observed (a clipboard write that resolved, a queue row the
  // host bridge reported it created).
  function setStatus(button, text, success) {
    if (!button) return;
    var card = button.closest ? button.closest('.ce-ideas-card') : null;
    var region = card ? card.querySelector('.ce-ideas-action-status[aria-live]') : null;
    var authored = labelOf(button);
    if (region) region.textContent = text;
    if (success) button.classList.add('is-success');
    window.setTimeout(function () {
      if (!button.isConnected) return;
      button.textContent = authored;
      button.classList.remove('is-success');
      if (region && region.isConnected) region.textContent = '';
    }, 1100);
  }

  function copyItem(item, button) {
    var text = cardText(item);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus(button, 'Copied to clipboard', true); }).catch(function () { setStatus(button, 'Copy blocked by the browser — select the text and copy it by hand.', false); });
      return;
    }
    setStatus(button, 'Copy unavailable — this browser has no clipboard access. Select the text and copy it by hand.', false);
  }

  function scheduleIdeaItem(item, button) {
    if (!item) return;
    var existing = document.getElementById('ce-idea-schedule-modal');
    if (existing) {
      try { if (typeof window.__CE_SET_MODAL_BACKGROUND__ === 'function') window.__CE_SET_MODAL_BACKGROUND__(false); } catch (_oldModalBg) {}
      existing.remove();
    }
    var opener = button || null;
    var now = new Date();
    var today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    var modal = document.createElement('div');
    modal.id = 'ce-idea-schedule-modal';
    modal.className = 'ce-idea-schedule-modal';
    modal.dataset.ceScheduleTarget = String(item.id || titleOf(item) || '');
    try {
      var scheduleState = window.__CE_STATE__ || window.state;
      if (scheduleState) scheduleState.scheduleTarget = { id: String(item.id || ''), title: titleOf(item), date: today, time: '9:00 PM' };
    } catch (_scheduleState) {}
    modal.innerHTML = '<div class="ce-idea-schedule-card" role="dialog" aria-modal="true" aria-labelledby="ce-idea-schedule-title">' +
      /* F-ID11 (ideas-copy, 2026-09-23): one action was described by three nouns
         (idea, draft slot, Draft). Title, note and button now all say draft. */
      '<div class="ce-idea-schedule-head"><div><strong id="ce-idea-schedule-title">Schedule a draft</strong><span>' + esc(titleOf(item)) + '</span></div><button type="button" data-ce-idea-schedule-close aria-label="Close">×</button></div>' +
      '<p class="ce-idea-schedule-note">This adds a draft slot to Plan for that date and time. Shape it in Write before publishing — nothing posts on its own.</p>' +
      '<label>Date<input type="date" data-ce-idea-schedule-date min="' + today + '" value="' + today + '"></label>' +
      '<label>Time<input type="time" data-ce-idea-schedule-time value="21:00"></label>' +
      '<div class="ce-idea-schedule-actions"><button type="button" data-ce-idea-schedule-cancel>Cancel</button><button type="button" class="is-primary" data-ce-idea-schedule-save>Add draft to Plan</button></div>' +
      '<p class="ce-idea-schedule-error" data-ce-idea-schedule-error role="alert" aria-live="assertive" hidden style="margin:8px 0 0;color:#ffb4b4;font-size:13px;line-height:1.35"></p>' +
      '</div>';
    document.body.appendChild(modal);
    try { if (typeof window.__CE_SET_MODAL_BACKGROUND__ === 'function') window.__CE_SET_MODAL_BACKGROUND__(true); } catch (_modalBg) {}
    var close = function () {
      modal.removeEventListener('keydown', onKeydown);
      try {
        var scheduleState = window.__CE_STATE__ || window.state;
        if (scheduleState) scheduleState.scheduleTarget = null;
      } catch (_scheduleClear) {}
      try { if (typeof window.__CE_SET_MODAL_BACKGROUND__ === 'function') window.__CE_SET_MODAL_BACKGROUND__(false); } catch (_modalBgClose) {}
      modal.remove();
      // Restore focus to the control that opened the dialog, when it is still
      // mounted; otherwise leave focus on the document body rather than a
      // detached node.
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
    function onKeydown(event) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    }
    modal.addEventListener('keydown', onKeydown);
    modal.querySelector('[data-ce-idea-schedule-close]').onclick = close;
    modal.querySelector('[data-ce-idea-schedule-cancel]').onclick = close;
    modal.addEventListener('click', function (event) { if (event.target === modal) close(); });
    modal.querySelector('[data-ce-idea-schedule-save]').onclick = function () {
      var date = modal.querySelector('[data-ce-idea-schedule-date]').value;
      var time = modal.querySelector('[data-ce-idea-schedule-time]').value;
      if (!date || !time) return;
      try {
        var scheduleState = window.__CE_STATE__ || window.state;
        if (scheduleState) scheduleState.scheduleTarget = { id: String(item.id || ''), title: titleOf(item), date: date, time: time };
      } catch (_scheduleUpdate) {}
      var parts = time.split(':').map(Number);
      var h = parts[0], minute = parts[1];
      var label = (h % 12 || 12) + ':' + String(minute).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
      /* A queue row only exists if the host bridge exists AND accepts the row.
         A missing bridge or a rejected row is not a schedule: keep the dialog
         open, say so on the card's polite region, and do not fire the
         scheduled hook on an item that never entered the queue. */
      var bridge = window.__CE_ADD_TO_QUEUE__;
      var row = (typeof bridge === 'function')
        ? bridge('idea', item, { ideaSource: 'ideas' }, { scheduleDate: date, scheduleTime: label, scheduled: true, readyToPost: false })
        : false;
      if (row !== false) {
        if (typeof window.__CE_IDEA_SCHEDULED__ === 'function') window.__CE_IDEA_SCHEDULED__(item, date, label);
        /* F-14 (cloud/ce-ui, 2026-09-21): the host bridge only reports that it
           wrote a queue row in this browser's own store. It cannot know whether
           the Mac received it, so the status names the row and stops there. */
        setStatus(button, 'Draft slot added to Plan for ' + date + ' ' + label, true);
        close();
        return;
      }
      /* F-10 (cloud/ce-ui, 2026-09-21): the failure was announced only on the
         card's live region, which self-clears after 1.1s while this dialog
         stayed open — the reason vanished before it could be read or acted on.
         Keep it in the dialog until the user changes something or retries. */
      setStatus(button, 'Not scheduled', false);
      var errEl = modal.querySelector('[data-ce-idea-schedule-error]');
      if (errEl) {
        errEl.textContent = 'Not scheduled: the queue door did not accept a row, so nothing was added to Plan. Check the Mac app is available, then try again.';
        errEl.hidden = false;
      }
    };
    var input = modal.querySelector('[data-ce-idea-schedule-date]');
    if (input) input.focus();
  }
  // Take forward: the canon action for an idea. Shape it into a post/poem first
  // (Write); Queue stays the staging lane for finished artifacts.
  function takeForwardItem(item, button) {
    try {
      var title = titleOf(item);
      var bodyText = bodyOf(item);
      var outline = pointsOf(item);
      var draftLines = [];
      if (title) draftLines.push(title);
      if (item.hook) draftLines.push('', strip(item.hook));
      if (item.crux) draftLines.push('', strip(item.crux));
      if (outline && outline.length) {
        draftLines.push('');
        outline.slice(0, 8).forEach(function (p) { draftLines.push('• ' + outlineLine(p)); });
      }
      var draft = draftLines.join('\n').trim() || bodyText || cardText(item);
      if (typeof window.__CE_STATE__ !== 'undefined') {
        window.__CE_STATE__.writeDraft = draft;
        /* F-E3 fix (2026-09-18): route through the shared persist contract so a
           quota failure surfaces instead of silently dropping the drafted idea
           while the button still claims '✓ Taken to Write'. */
        var __draftOk = (typeof window.cePersistOrWarn === 'function')
          ? window.cePersistOrWarn('ce_write_draft', draft)
          : (function () { try { localStorage.setItem('ce_write_draft', draft); return true; } catch (_e) { return false; } })();
        if (!__draftOk) { setStatus(button, 'Draft not saved — this browser’s storage is full. Clear some space and tap again.', false); return; }
      }
      if (typeof window.__CE_NAVIGATE__ === 'function') window.__CE_NAVIGATE__('write');
      setStatus(button, 'Draft saved and taken to Write', true);
    } catch (e) {
      setStatus(button, 'Could not open this idea as a draft — reload the page and try again.', false);
    }
  }

  function render(nextContext) {
    if (nextContext) context = nextContext;
    var view = document.getElementById('view');
    if (!view) return;
    var groups = groupedItems();
    var visibleCount = groups.reduce(function (total, group) { return total + group.items.length; }, 0);
    if (groups.length && !Object.keys(openGroups).some(function (key) { return openGroups[key]; })) openGroups[groups[0].key] = true;
    /* ADA P2-2 (ideas-copy, 2026-09-23): "632 ideas to explore" against the 8
       cards of the single auto-opened group reads as data loss on a phone.
       Qualify the raw total with how many of the visible topic groups are
       actually open, computed from openGroups (the same state sectionHtml
       renders), so filtering, expansion and the empty state all stay honest. */
    var topicCounts = groups.map(function (group) { return group.key; });
    var openTopicCount = topicCounts.filter(function (key) { return !!openGroups[key]; }).length;
    var summaryCounts = visibleCount + (visibleCount === 1 ? ' idea to explore' : ' ideas to explore') +
      (groups.length ? ' · ' + openTopicCount + ' of ' + groups.length + (groups.length === 1 ? ' topic open' : ' topics open') : '');
    /* The hidden #meta topbar channel is gone (W9, 2026-09-18) — the summary
       line inside the surface below is the visible owner of the count. */
    view.className = 'view ce-ideas-parity';
    /* Reuse the controls + summary nodes across re-renders and swap only the
       sections list. A filter/search keystroke used to rewrite the whole
       surface through one large innerHTML assignment (controls, summary and
       every visible card); now the chrome survives and only the list is
       updated. Visible results are identical — the list markup is the same
       string the whole-surface write produced. */
    var list = view.querySelector('.ce-ideas-list');
    var chromeOk = !!view.querySelector('.ce-ideas-controls') && !!view.querySelector('.ce-ideas-summary');
    if (!list || !chromeOk) {
      view.innerHTML = controlsHtml() +
        '<div class="ce-ideas-summary"><span>' + summaryCounts + '</span>' + (structuredOnly ? '<span>structured outlines</span>' : '') + '</div>' +
        /* A11Y-05 (master-20260923): the surface title is a real h2, so the topic
           headers below it land at h3 with an h2 parent and the document keeps
           one h1. Visually hidden — the shell has no painted Ideas h1, and the
           count line is the visible owner of the surface name. */
        '<h2 class="ce-visually-hidden">Ideas</h2>' +
        '<div class="ce-ideas-list"></div>';
      list = view.querySelector('.ce-ideas-list');
    } else {
      var summary = view.querySelector('.ce-ideas-summary');
      var summaryHtml = '<span>' + summaryCounts + '</span>' + (structuredOnly ? '<span>structured outlines</span>' : '');
      if (summary.innerHTML !== summaryHtml) summary.innerHTML = summaryHtml;
      var controls = view.querySelector('.ce-ideas-controls');
      var controlsFresh = controlsHtml();
      if (controls.outerHTML !== controlsFresh) {
        var holder = document.createElement('div');
        holder.innerHTML = controlsFresh;
        controls.replaceWith(holder.firstChild);
      }
    }
    if (!list) return;
    /* F-ID13 (ideas-copy, 2026-09-23): the empty copy led with "filters" even when
       the user had only typed a search and touched no filter. */
    list.innerHTML = groups.length ? groups.map(sectionHtml).join('') : '<div class="ce-ideas-empty">' + (String(context.query || '').trim() ? 'No ideas match that search — try another word.' : 'No ideas match these filters yet — clear one and try again.') + '</div>';
  }

  function findItem(id) {
    return dedupedSource().find(function (item) { return String(item.id || titleOf(item)) === String(id); }) || null;
  }

  /* ADA P1-1 (ideas-ada, 2026-09-23): the single toggle path for a card's
     outline. The title button and the article-level touch convenience both
     land here, so the class and aria-expanded can never disagree. Updates
     the live card in place (no re-render) and records the state so the next
     render() bakes it into the rebuilt markup. Matching by data attribute
     instead of a selector avoids quoting/escaping an authored id. */
  function cardElement(id) {
    var cards = document.querySelectorAll('#view.ce-ideas-parity .ce-ideas-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-ce-idea-id') === String(id)) return cards[i];
    }
    return null;
  }

  function toggleCard(id) {
    var key = String(id == null ? '' : id);
    if (!key) return false;
    var next = !openCards[key];
    openCards[key] = next;
    var card = cardElement(key);
    if (!card) return next;
    card.classList.toggle('is-open', next);
    var toggle = card.querySelector('[data-ce-ideas-card-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
    return next;
  }

  function handleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest('#view.ce-ideas-parity *') : null;
    if (!target) return;
    var scheduleButton = target.closest('[data-ce-idea-schedule]');
    if (scheduleButton) {
      event.preventDefault();
      event.stopPropagation();
      scheduleIdeaItem(findItem(scheduleButton.getAttribute('data-ce-idea-schedule')), scheduleButton);
      return;
    }
    var filterButton = target.closest('[data-ce-ideas-filter]');
    if (filterButton) {
      event.preventDefault();
      filter = filterButton.getAttribute('data-ce-ideas-filter') || 'all';
      openGroups = Object.create(null);
      filterMenuOpen = false;
      render();
      return;
    }
    var languageButton = target.closest('[data-ce-ideas-language]');
    if (languageButton) {
      event.preventDefault();
      language = languageButton.getAttribute('data-ce-ideas-language') || 'english';
      openGroups = Object.create(null);
      filterMenuOpen = false;
      render();
      return;
    }
    if (target.closest('[data-ce-ideas-filter-menu]')) {
      event.preventDefault();
      filterMenuOpen = !filterMenuOpen;
      render();
      // Move focus into the popover when it opens so keyboard users land on
      // its first item; the trigger keeps the expanded state in its markup.
      if (filterMenuOpen) {
        var popover = document.getElementById('ce-ideas-filter-popover');
        var firstItem = popover ? popover.querySelector('button') : null;
        if (firstItem) firstItem.focus();
      }
      return;
    }
    if (target.closest('[data-ce-ideas-structured]')) {
      event.preventDefault();
      structuredOnly = !structuredOnly;
      filterMenuOpen = false;
      openGroups = Object.create(null);
      render();
      return;
    }
    if (target.closest('[data-ce-ideas-clear]')) {
      event.preventDefault();
      filter = 'all';
      language = 'english';
      structuredOnly = false;
      filterMenuOpen = false;
      openGroups = Object.create(null);
      /* F-09 (cloud/ce-ui, 2026-09-21): the empty state offers this action as
         the remedy when nothing matches, but it left the SEARCH QUERY intact —
         so a query with no hits stayed empty and the promised remedy was a
         no-op. Clear the query too (host state + the visible search field) and
         re-run, mirroring the host's own clear-search escape. */
      context = { query: '' };
      try {
        var hostState = window.__CE_STATE__ || window.state;
        if (hostState) hostState.searchQuery = '';
        var searchInput = document.getElementById('search');
        if (searchInput) searchInput.value = '';
      } catch (_q) {}
      render();
      return;
    }
    var groupToggle = target.closest('[data-ce-ideas-group-toggle]');
    if (groupToggle) {
      event.preventDefault();
      var key = groupToggle.getAttribute('data-ce-ideas-group-toggle');
      openGroups[key] = !openGroups[key];
      render();
      return;
    }
    /* The card title button. It is a real <button>, so Enter and Space arrive
       here as clicks — keyboard and pointer share this one branch. */
    var cardToggle = target.closest('[data-ce-ideas-card-toggle]');
    if (cardToggle) {
      event.preventDefault();
      toggleCard(cardToggle.getAttribute('data-ce-ideas-card-toggle'));
      return;
    }
    var copyButton = target.closest('[data-ce-idea-copy]');
    if (copyButton) {
      event.preventDefault();
      event.stopPropagation();
      copyItem(findItem(copyButton.getAttribute('data-ce-idea-copy')), copyButton);
      return;
    }
    var forwardButton = target.closest('[data-ce-idea-forward]');
    if (forwardButton) {
      event.preventDefault();
      event.stopPropagation();
      takeForwardItem(findItem(forwardButton.getAttribute('data-ce-idea-forward')), forwardButton);
    }
  }

  document.addEventListener('click', handleClick, false);
  /* The one owner of this surface. A repeat injection hits the guard at the top
     and returns before binding a second listener. teardown() lets a host that
     genuinely wants to unmount remove the listener cleanly. */
  window.__CE_IDEAS_IMPL__ = {
    teardown: function () { document.removeEventListener('click', handleClick, false); }
  };
  /* The card-outline toggle, exposed so the host's article-level tap handler
     goes through this same state instead of keeping its own copy. */
  window.__CE_IDEA_TOGGLE_CARD__ = toggleCard;

  window.__CE_IDEA_SCHEDULED__ = function (item, date, label) {
    try {
      var st = window.__CE_STATE__ || window.state;
      if (!st || !Array.isArray(st.queueItems)) return;
      var key = String(item && (item.id || item.name || item.topic) || '');
      var row = st.queueItems.find(function (q) {
        return q && q.type === 'idea' && String(q.item && (q.item.id || q.item.name || q.item.topic) || '') === key;
      });
      if (!row) return;
      row.auditStatus = 'DRAFT';
      row.statusReason = 'Scheduled draft idea — shape it in Write before it can post.';
      row.readyToPost = false;
      row.scheduled = true;
      row.scheduleSlot = String(date) + ' · ' + String(label);
      try {
        /* F-03 fix (2026-09-18): same shared contract — this writes the SAME
           ce_queue_items store index.html guards exclusively. */
        if (typeof window.cePersistOrWarn === 'function') window.cePersistOrWarn('ce_queue_items', JSON.stringify(st.queueItems));
        else localStorage.setItem('ce_queue_items', JSON.stringify(st.queueItems));
      } catch (_e) {}
      if (typeof window.__CE_UPDATE_TOPBAR_QUEUE__ === 'function') window.__CE_UPDATE_TOPBAR_QUEUE__();
    } catch (_e2) {}
  };

  mounted = true;
  window.__CE_IDEAS_RENDER__ = render;
  window.__CE_IDEAS_RENDERER__ = { render: render, setContext: function (nextContext) { context = nextContext || {}; } };
  // The surface owns its own mount; render when the host view is present.
  // Gating on the bright theme left Ideas blank in the default theme, so the
  // tab only painted after an unrelated theme toggle. Skip when the host has
  // already mounted its own Ideas render, and mark ours so a second boot pass
  // cannot overwrite it.
  if (mounted && document.getElementById('view') && !window.__CE_IDEAS_MOUNTED_BY_HOST__) {
    window.__CE_IDEAS_BOOT_RENDERED__ = true;
    render();
  }
})();
