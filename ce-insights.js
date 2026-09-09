/* ce-insights.js — maps the native Meta insights payload (CEMetaInsights.swift)
   into a view model for Grow + Launch. Pure functions only — no DOM, no
   network — so qa/meta-insights-mapper.test.mjs can drive it with fixtures.
   Every number here comes from the payload; nothing is invented. */
(function () {
  'use strict';

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function str(v) {
    return String(v == null ? '' : v);
  }

  function parseTs(v) {
    if (!v) return 0;
    var t = Date.parse(str(v));
    return isNaN(t) ? 0 : Math.floor(t / 1000);
  }

  function mapIgPost(m) {
    if (!m) return null;
    var likes = num(m.likes);
    var comments = num(m.comments);
    return {
      id: str(m.id),
      platform: 'instagram',
      caption: str(m.caption),
      mediaType: str(m.mediaType || 'IMAGE').toUpperCase(),
      permalink: str(m.permalink),
      ts: parseTs(m.timestamp),
      timestamp: str(m.timestamp),
      likes: likes,
      comments: comments,
      eng: likes + comments,
      thumb: str(m.thumb || m.mediaUrl || '')
    };
  }

  function mapFbPost(p) {
    if (!p) return null;
    return {
      id: str(p.id),
      platform: 'facebook',
      caption: str(p.message),
      mediaType: 'POST',
      permalink: str(p.permalink),
      ts: parseTs(p.created_time),
      timestamp: str(p.created_time),
      likes: null,   // engagement counts need pages_read_user_content — never faked
      comments: null,
      eng: null,
      thumb: str(p.picture || '')
    };
  }

  /* Recent window vs prior window, measured in posts (not days) so a sparse
     posting history still yields a real delta. */
  function windowDeltas(postsSortedByTsDesc, span) {
    var recent = postsSortedByTsDesc.slice(0, span);
    var prior = postsSortedByTsDesc.slice(span, span * 2);
    function avg(list) {
      if (!list.length) return null;
      var sum = 0;
      list.forEach(function (p) { sum += p.eng; });
      return sum / list.length;
    }
    var ra = avg(recent);
    var pa = avg(prior);
    var deltaPct = null;
    if (ra !== null && pa !== null && pa > 0) deltaPct = Math.round(((ra - pa) / pa) * 100);
    return { recent: recent, prior: prior, recentAvg: ra, priorAvg: pa, deltaPct: deltaPct };
  }

  function cadenceLabel(postsSortedByTsDesc) {
    if (postsSortedByTsDesc.length < 2) return null;
    var gaps = [];
    for (var i = 0; i < postsSortedByTsDesc.length - 1 && i < 19; i++) {
      var gap = postsSortedByTsDesc[i].ts - postsSortedByTsDesc[i + 1].ts;
      if (gap > 0) gaps.push(gap);
    }
    if (!gaps.length) return null;
    gaps.sort(function (a, b) { return a - b; });
    var median = gaps[Math.floor(gaps.length / 2)];
    var days = median / 86400;
    if (days < 1) return 'multiple times a day';
    if (days < 1.6) return 'about daily';
    return 'every ' + (Math.round(days * 10) / 10) + ' days';
  }

  /* Follower delta vs the newest history row at least `minAgeSec` old. */
  function followerDelta(history, key, latest) {
    if (!Array.isArray(history) || !history.length || latest == null) return null;
    var nowTs = num(history[history.length - 1] && history[history.length - 1].ts);
    var base = null;
    for (var i = history.length - 1; i >= 0; i--) {
      var row = history[i];
      if (num(row[key]) > 0 && num(row.ts) <= nowTs - 20 * 3600) { base = row; break; }
    }
    if (!base) return null;
    return { delta: num(latest) - num(base[key]), sinceTs: num(base.ts) };
  }

  function ceMapMetaInsights(payload) {
    if (!payload || typeof payload !== 'object' || payload.ok === false) {
      return { ok: false, error: str(payload && payload.error) || 'No Meta insights data' };
    }
    var page = payload.page || {};
    var ig = payload.ig || {};
    var igMedia = (Array.isArray(payload.igMedia) ? payload.igMedia : []).map(mapIgPost).filter(Boolean);
    var fbPosts = (Array.isArray(payload.pagePosts) ? payload.pagePosts : []).map(mapFbPost).filter(Boolean);
    var scheduled = (Array.isArray(payload.scheduledPosts) ? payload.scheduledPosts : []).map(function (p) {
      return { id: str(p.id), message: str(p.message), unix: num(p.scheduled_publish_time) };
    }).filter(function (p) { return p.unix > 0; });
    scheduled.sort(function (a, b) { return a.unix - b.unix; });

    igMedia.sort(function (a, b) { return b.ts - a.ts; });
    var byEng = igMedia.slice().sort(function (a, b) { return b.eng - a.eng || b.ts - a.ts; });
    var deltas = windowDeltas(igMedia, 10);
    var history = Array.isArray(payload.history) ? payload.history : [];
    var gaps = Array.isArray(payload.scopeGaps) ? payload.scopeGaps.map(function (g) {
      return { permission: str(g.permission), unlocks: str(g.unlocks), status: str(g.status || 'missing') };
    }) : [];

    var nowSec = Math.floor(Date.now() / 1000);
    var igFollowers = ig.followers != null ? num(ig.followers) : null;
    var fbFollowers = page.followers != null ? num(page.followers) : null;

    return {
      ok: true,
      cached: !!payload.cached,
      stale: !!payload.stale,
      error: str(payload.error || ''),
      fetchedAt: num(payload.fetchedAt),
      syncedIst: str(payload.fetchedAtIst),
      systemUser: str(payload.meName),
      grantedScopes: Array.isArray(payload.grantedScopes) ? payload.grantedScopes : [],
      gaps: gaps,
      ig: {
        username: str(ig.username || payload.igUsername),
        name: str(ig.name),
        followers: igFollowers,
        follows: ig.follows != null ? num(ig.follows) : null,
        mediaCount: ig.mediaCount != null ? num(ig.mediaCount) : null,
        profilePic: str(ig.profilePic)
      },
      fb: {
        name: str(page.name),
        username: str(page.username),
        followers: fbFollowers,
        id: str(page.id || payload.pageId)
      },
      followers: {
        ig: igFollowers,
        fb: fbFollowers,
        total: (igFollowers || 0) + (fbFollowers || 0),
        igDelta: followerDelta(history, 'igFollowers', igFollowers),
        fbDelta: followerDelta(history, 'fbFollowers', fbFollowers)
      },
      igPosts: byEng,                       // best-first
      igRecent: igMedia,                    // recency-first
      stats: {
        recentAvg: deltas.recentAvg,
        priorAvg: deltas.priorAvg,
        deltaPct: deltas.deltaPct,
        recentWindowN: deltas.recent.length,
        priorWindowN: deltas.prior.length,
        bestPost: byEng[0] || null,
        cadence: cadenceLabel(igMedia),
        postsInWindow: igMedia.length
      },
      fbPosts: fbPosts,
      scheduled: {
        count: scheduled.length,
        next: scheduled.find(function (p) { return p.unix > nowSec; }) || null,
        items: scheduled
      },
      hasAudience: igFollowers != null || fbFollowers != null,
      hasIgPosts: igMedia.length > 0,
      hasFbPosts: fbPosts.length > 0
    };
  }

  if (typeof window !== 'undefined') window.ceMapMetaInsights = ceMapMetaInsights;
  if (typeof module !== 'undefined' && module.exports) module.exports = { ceMapMetaInsights: ceMapMetaInsights };
})();
