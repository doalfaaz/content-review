(function () {
  'use strict';

  var filter = 'all';
  var language = 'english';
  var structuredOnly = false;
  var filterMenuOpen = false;
  var openGroups = Object.create(null);
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

  function matches(item) {
    if (filter === 'psychology' && categoryOf(item) !== 'psychology') return false;
    if (filter === 'philosophy' && categoryOf(item) !== 'philosophy') return false;
    if (languageOf(item) !== language) return false;
    if (structuredOnly && !pointsOf(item).length && !bodyOf(item)) return false;
    var query = String(context.query || '').trim().toLowerCase();
    return !query || searchableText(item).indexOf(query) >= 0;
  }

  function priority(topic) {
    var index = TOPIC_PRIORITY.map(function (value) { return value.toLowerCase(); }).indexOf(topic.toLowerCase());
    return index >= 0 ? index : 1000;
  }

  function groupedItems() {
    var groups = Object.create(null);
    var order = [];
    dedupe(sourceItems()).filter(matches).forEach(function (item) {
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

  function cardHtml(item) {
    var points = pointsOf(item);
    var intro = bodyOf(item);
    var title = titleOf(item);
    var pending = !intro && !points.length;
    return '<article class="ce-ideas-card" data-ce-idea-id="' + esc(item.id || title) + '">' +
      '<h3>' + esc(title) + '</h3>' +
      (intro ? '<div class="ce-ideas-card-intro">' + esc(intro) + '</div>' : '') +
      (points.length ? '<div class="ce-ideas-points">' + points.map(pointHtml).join('') + '</div>' : '') +
      (pending ? '<div class="ce-ideas-card-pending">Structured outline pending for this idea.</div>' : '') +
      '<div class="ce-ideas-card-actions">' +
      '<button type="button" class="ce-ideas-action is-primary" data-ce-idea-forward="' + esc(item.id || title) + '">Take forward</button>' +
      '<button type="button" class="ce-ideas-action" data-ce-idea-copy="' + esc(item.id || title) + '">Copy</button>' +
      '<span class="ce-ideas-action-status" aria-live="polite"></span>' +
      '</div></article>';
  }

  function controlsHtml() {
    return '<div class="ce-ideas-controls" aria-label="Ideas filters">' +
      '<span class="ce-ideas-filter-group" role="group" aria-label="Idea category">' +
      ['all', 'psychology', 'philosophy'].map(function (value) {
        var label = value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1);
        return '<button type="button" class="ce-ideas-filter ' + (filter === value ? 'is-active' : '') + '" data-ce-ideas-filter="' + value + '">' + label + '</button>';
      }).join('') + '</span>' +
      '<span class="ce-ideas-filter-group ce-ideas-language" role="group" aria-label="Idea language">' +
      ['english', 'hinglish'].map(function (value) {
        return '<button type="button" class="ce-ideas-filter ' + (language === value ? 'is-active' : '') + '" data-ce-ideas-language="' + value + '">' + value.charAt(0).toUpperCase() + value.slice(1) + '</button>';
      }).join('') + '</span>' +
      '<span class="ce-ideas-filter-menu-wrap">' +
      '<button type="button" class="ce-ideas-filter-menu ' + (structuredOnly ? 'is-active' : '') + '" data-ce-ideas-filter-menu>Filters</button>' +
      '<span class="ce-ideas-filter-popover" ' + (filterMenuOpen ? '' : 'hidden') + '>' +
      '<button type="button" class="ce-ideas-menu-item ' + (structuredOnly ? 'is-active' : '') + '" data-ce-ideas-structured="toggle">Structured outlines only</button>' +
      '<button type="button" class="ce-ideas-menu-item" data-ce-ideas-clear>Clear filters</button>' +
      '</span></span></div>';
  }

  function sectionHtml(group, index) {
    var isOpen = !!openGroups[group.key];
    return '<section class="ce-ideas-section ' + (isOpen ? 'is-open' : '') + '" data-ce-ideas-group="' + esc(group.key) + '">' +
      '<button type="button" class="ce-ideas-section-head" data-ce-ideas-group-toggle="' + esc(group.key) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
      '<span class="ce-ideas-section-number">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="ce-ideas-section-title">' + esc(group.topic) + '</span>' +
      '<span class="ce-ideas-section-meta"><span class="ce-ideas-count">' + group.items.length + ' cards</span><span class="ce-ideas-chevron">⌄</span></span>' +
      '</button>' +
      (isOpen ? '<div class="ce-ideas-card-grid">' + group.items.map(cardHtml).join('') + '</div>' : '') +
      '</section>';
  }

  function setStatus(button, text, success) {
    if (!button) return;
    button.textContent = text;
    if (success) button.classList.add('is-success');
    window.setTimeout(function () {
      if (!button.isConnected) return;
      button.textContent = button.getAttribute('data-ce-idea-copy') ? 'Copy' : 'Take forward';
      button.classList.remove('is-success');
    }, 1100);
  }

  function copyItem(item, button) {
    var text = cardText(item);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus(button, '✓ Copied', true); }).catch(function () { setStatus(button, '⚠ Unavailable', false); });
      return;
    }
    setStatus(button, '⚠ Unavailable', false);
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
        try { localStorage.setItem('ce_write_draft', draft); } catch (_e) {}
      }
      if (typeof window.__CE_NAVIGATE__ === 'function') window.__CE_NAVIGATE__('write');
      setStatus(button, '✓ Taken to Write', true);
    } catch (e) {
      setStatus(button, '⚠ Unavailable', false);
    }
  }

  function render(nextContext) {
    if (nextContext) context = nextContext;
    var view = document.getElementById('view');
    if (!view) return;
    var all = dedupe(sourceItems());
    var groups = groupedItems();
    var visibleCount = groups.reduce(function (total, group) { return total + group.items.length; }, 0);
    if (groups.length && !Object.keys(openGroups).some(function (key) { return openGroups[key]; })) openGroups[groups[0].key] = true;
    var meta = document.getElementById('meta');
    if (meta) {
      var suffix = context.query || filter !== 'all' || language !== 'english' || structuredOnly ? ' · filtered' : '';
      meta.textContent = all.length + ' ideas across spiritual & psychological topics' + suffix;
    }
    view.className = 'view ce-ideas-parity';
    view.innerHTML = controlsHtml() +
      '<div class="ce-ideas-summary"><span>' + visibleCount + ' ideas to explore</span>' + (structuredOnly ? '<span>structured outlines</span>' : '') + '</div>' +
      (groups.length ? groups.map(sectionHtml).join('') : '<div class="ce-ideas-empty">No ideas match these filters. Clear a filter or search again.</div>');
  }

  function findItem(id) {
    return dedupe(sourceItems()).find(function (item) { return String(item.id || titleOf(item)) === String(id); }) || null;
  }

  function handleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest('#view.ce-ideas-parity *') : null;
    if (!target) return;
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

  document.addEventListener('click', handleClick, true);
  mounted = true;
  window.__CE_IDEAS_RENDER__ = render;
  window.__CE_IDEAS_RENDERER__ = { render: render, setContext: function (nextContext) { context = nextContext || {}; } };
  if (mounted && document.getElementById('view') && document.body.classList.contains('bright-theme')) render();
})();
