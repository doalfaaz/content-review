/* Generated verbatim from protected ContentEngine.html.
   "Do not hand-edit" is aspirational, not real: regenerating from the source
   HTML would discard every hand-fix applied since. In practice this file IS
   hand-edited. Its `const BASE` template literal (the `.pc-*` template CSS,
   around line 4792) is PARTIALLY mirrored into ../legacy-renderers/renderers.css
   — that file, not this one, is what design-raster-export.ts (the real
   publish/export path) actually reads. A `.pc-*` rule edited here without the
   identical edit landing in renderers.css will silently drift: the live
   preview and the exported/published output disagree with no error anywhere.
   See renderers.css's header for the incident this caused (2026-07-25) and
   tests/legacy-renderers-pc-css-sync.test.ts, which now gates it. */

/* source: codex-merged-blocks-js */
'use strict';
/* blocks.js — the 12 Codex "PART A2" infographic block types for @doalfaaz's carousel engine.
   Matches carousel_core.js house style exactly:
     - palette-aware: every color comes from the .slide CSS vars --bg/--ink/--sub/--acc/--acc2/--panel/--line
     - defensive: every field read with (x || fallback); never throws on partial/empty data
     - works on ANY look (dark or light) because it only ever references the vars, never a literal palette
     - inline SVG for chart/diagram GEOMETRY, HTML text laid OVER the SVG for readability (crisp @1080px PNG)
   Angle / x-y math is computed here in JS (CSS cos()/sin() and color-mix are avoided for headless-render safety).

   module.exports = { render(kind, d) -> HTML string, css: '<all block CSS as one string>' }
   Class prefix .ib-*  (infographic block) so it never collides with core's .bk-*.               */
(function (root) {

  // ---------- tiny defensive helpers ----------
  // Infographic block fields are plain authored text, never trusted markup.
  // Keep this helper distinct from the later layout normalizer in CarouselCore.
  function escapeBlockText(t){
    return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function txt(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); }
  function arr(a){ return Array.isArray(a) ? a : (a == null ? [] : [a]); }
  function num(v, dflt){ v = parseFloat(v); return isFinite(v) ? v : (dflt || 0); }
  function clamp(v, lo, hi){ v = num(v, lo); return v < lo ? lo : (v > hi ? hi : v); }
  // cycle through accents for N items when no explicit color given (keeps multi-segment charts legible on any look)
  function autoColor(i){ return (i % 2) ? 'var(--acc2,var(--acc))' : 'var(--acc)'; }
  // resolve a Codex "color" token ("accent"/"accent2"/raw #hex/"") to a CSS value, palette-aware.
  // Empty/unknown → alternate by index so a colorless 3-segment donut doesn't collapse to one solid accent.
  function segColor(c, i){
    c = txt(c).toLowerCase();
    if (!c) return autoColor(i);                       // no color specified → alternate accents
    if (c === 'accent' || c === 'acc') return 'var(--acc)';
    if (c === 'accent2' || c === 'acc2') return 'var(--acc2,var(--acc))';
    if (c === 'line') return 'var(--line)';
    if (c === 'sub') return 'var(--sub)';
    if (c === 'ink') return 'var(--ink)';
    if (/^#|^rgb|^hsl/.test(c)) return c;              // raw literal (Codex GOLD data passes real hex zones)
    return autoColor(i);                               // any other word → alternate accents
  }
  function polar(cx, cy, r, deg){ const a = (deg - 90) * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }
  function f(n){ return Math.round(n * 100) / 100; }

  // ============================================================================
  //  RENDER
  // ============================================================================
  function render(kind, d){
    d = d || {};

    /* 1 ── bar_truth_weight ─ horizontal bars, label left, value chip right, fill below */
    if (kind === 'bar_truth_weight'){
      const unit = txt(d.unit);
      const items = arr(d.items).slice(0, 6);
      const rows = items.map((it, i) => {
        const v = clamp(it && it.value, 0, 100);
        const fill = it && it.tone === 'accent2' ? 'var(--acc2,var(--acc))' : autoColor(i);
        const suffix = /percent|%/.test(unit) ? '%' : '';
        return `<div class="ib-barRow">
          <div class="ib-barMeta"><span class="ib-barLab">${escapeBlockText(it && it.label)}</span><span class="ib-barVal">${f(v)}${suffix}</span></div>
          <div class="ib-barTrack"><div class="ib-barFill" style="width:${f(v)}%;background:${fill};"></div></div>
          ${it && it.note ? `<div class="ib-barNote">${escapeBlockText(it.note)}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="ib-bar">${d.title ? `<div class="ib-capTitle">${escapeBlockText(d.title)}</div>` : ''}${rows}</div>`;
    }

    /* 2 ── donut_three_forces ─ SVG stroke-segment donut, labels outside w/ leader lines, truth centered */
    if (kind === 'donut_three_forces'){
      const segs = arr(d.segments).slice(0, 5);
      const total = segs.reduce((s, x) => s + clamp(x && x.value, 0, 100), 0) || 1;
      const cx = 360, cy = 360, R = 230, SW = 62, C = 2 * Math.PI * R;
      let acc = 0;
      const strokes = [], leaders = [];
      segs.forEach((sg, i) => {
        const frac = clamp(sg && sg.value, 0, 100) / total;
        const col = segColor(sg && sg.color, i);
        const dash = frac * C, gap = C - dash, rot = (acc / total) * 360;
        strokes.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-dasharray="${f(dash)} ${f(gap)}" transform="rotate(${f(rot - 90)} ${cx} ${cy})"/>`);
        // leader line + external label anchor at the segment mid-angle
        const midDeg = (acc + frac * total / 2) / total * 360;
        const p1 = polar(cx, cy, R + SW / 2, midDeg);
        const p2 = polar(cx, cy, R + 74, midDeg);
        const right = p2.x >= cx;
        leaders.push({ col, p1, p2, right, label: sg && sg.label, note: sg && sg.note, val: f(clamp(sg && sg.value, 0, 100)) });
        acc += frac * total;
      });
      const leaderSvg = leaders.map(L =>
        `<line x1="${f(L.p1.x)}" y1="${f(L.p1.y)}" x2="${f(L.p2.x)}" y2="${f(L.p2.y)}" stroke="${L.col}" stroke-width="2.4"/>` +
        `<line x1="${f(L.p2.x)}" y1="${f(L.p2.y)}" x2="${f(L.right ? L.p2.x + 30 : L.p2.x - 30)}" y2="${f(L.p2.y)}" stroke="${L.col}" stroke-width="2.4"/>`
      ).join('');
      const labs = leaders.map(L => {
        const right = L.right;
        const leftPct = clamp((L.p2.x + 34) / 720 * 100, 0, 68);
        const rightPct = clamp((720 - (L.p2.x - 34)) / 720 * 100, 0, 68);
        return `<div class="ib-donLab ${right ? 'r' : 'l'}" style="left:${right ? f(leftPct) : 'auto'}${right ? '%' : ''};${right ? '' : `right:${f(rightPct)}%;`}top:${f((L.p2.y) / 720 * 100)}%;">
          <b style="color:${L.col};">${escapeBlockText(L.label)}</b>${L.note ? `<span>${escapeBlockText(L.note)}</span>` : ''}
        </div>`;
      }).join('');
      return `<div class="ib-donut"><div class="ib-donWrap">
        <svg viewBox="0 0 720 720" class="ib-donSvg">
          <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line)" stroke-width="${SW}"/>
          ${strokes.join('')}${leaderSvg}
        </svg>
        <div class="ib-donCenter">${escapeBlockText(d.center)}</div>
        ${labs}
      </div></div>`;
    }

    /* 3 ── matrix_2x2 ─ 2x2 grid, axis labels outside, one active cell accented */
    if (kind === 'matrix_2x2'){
      const ax = d.axes || {};
      const items = arr(d.items);
      // place items by their q (1..4) → TL,TR,BL,BR ; fall back to natural order
      const byQ = {}; items.forEach((it, i) => { const q = num(it && it.q, i + 1); byQ[q] = it; });
      const order = [1, 2, 3, 4];
      const cells = order.map(q => {
        const it = byQ[q] || {};
        return `<div class="ib-cell${it.active ? ' active' : ''}">
          ${it.tag ? `<div class="ib-cellTag">${escapeBlockText(it.tag)}</div>` : ''}
          <div class="ib-cellH">${escapeBlockText(it.title)}</div>
          <div class="ib-cellT">${escapeBlockText(it.text)}</div>
        </div>`;
      }).join('');
      return `<div class="ib-matrixWrap">
        <div class="ib-axY top">${escapeBlockText(ax.yTop)}</div>
        <div class="ib-matrixMid">
          <div class="ib-axX left">${escapeBlockText(ax.xLeft)}</div>
          <div class="ib-matrix">${cells}</div>
          <div class="ib-axX right">${escapeBlockText(ax.xRight)}</div>
        </div>
        <div class="ib-axY bot">${escapeBlockText(ax.yBottom)}</div>
      </div>`;
    }

    /* 4 ── comparison_table ─ 2-col table, strong header, left struck/faded, right accented */
    if (kind === 'comparison_table'){
      const cols = arr(d.columns); const c0 = cols[0] || 'Myth', c1 = cols[1] || 'Truth';
      const rows = arr(d.rows).slice(0, 5).map(r => `<div class="ib-cmpRow">
        <div class="ib-cmpCell left">${escapeBlockText(r && r.left)}</div>
        <div class="ib-cmpCell right">${escapeBlockText(r && r.right)}${r && r.signal ? `<span class="ib-cmpSig">${escapeBlockText(r.signal)}</span>` : ''}</div>
      </div>`).join('');
      return `<div class="ib-cmpTable">
        <div class="ib-cmpHead">${escapeBlockText(c0)}</div><div class="ib-cmpHead r">${escapeBlockText(c1)}</div>
        ${rows}
      </div>`;
    }

    /* 5 ── ranking_ladder ─ stepped ladder, wide at bottom → narrow at top */
    if (kind === 'ranking_ladder'){
      let items = arr(d.items).slice(0, 5);
      // Codex data gives explicit rank (1=base..N=top). Sort ascending so column-reverse stacks 1 at bottom.
      items = items.slice().sort((a, b) => num(a && a.rank, 0) - num(b && b.rank, 0));
      const n = items.length || 1;
      const steps = items.map((it, i) => {
        const w = 96 - i * (44 / Math.max(n - 1, 1));   // 96%→52% top
        const on = it && it.tone === 'accent';
        return `<div class="ib-step${on ? ' on' : ''}" style="width:${f(w)}%;">
          <div class="ib-rank">${escapeBlockText(it && it.rank != null ? it.rank : (i + 1))}</div>
          <div class="ib-stepBody"><div class="ib-stepLab">${escapeBlockText(it && it.label)}</div>${it && it.text ? `<div class="ib-stepT">${escapeBlockText(it.text)}</div>` : ''}</div>
        </div>`;
      }).join('');
      return `<div class="ib-ladder">${d.title ? `<div class="ib-capTitle">${escapeBlockText(d.title)}</div>` : ''}<div class="ib-ladderStack">${steps}</div></div>`;
    }

    /* 6 ── timeline_rail_horizontal ─ horizontal rail, nodes alternate above/below, x in % */
    if (kind === 'timeline_rail_horizontal'){
      const items = arr(d.items).slice(0, 6);
      const n = items.length || 1;
      const nodes = items.map((it, i) => {
        // honor explicit x (0..100); else distribute evenly with padding
        let x = it && it.x != null ? clamp(it.x, 0, 100) : (n === 1 ? 50 : 8 + (84) * i / (n - 1));
        const up = i % 2 === 0;
        return `<div class="ib-node" style="left:${f(x)}%;"></div>
          <div class="ib-event ${up ? 'up' : 'down'}" style="left:${f(x)}%;">
            <div class="ib-eventCard">
              ${it && it.tag ? `<div class="ib-eventTag">${escapeBlockText(it.tag)}</div>` : ''}
              <div class="ib-eventH">${escapeBlockText(it && it.title)}</div>
              ${it && it.text ? `<div class="ib-eventT">${escapeBlockText(it.text)}</div>` : ''}
            </div>
          </div>`;
      }).join('');
      const ends = (d.start || d.end)
        ? `<div class="ib-railEnds"><span>${escapeBlockText(d.start)}</span><span>${escapeBlockText(d.end)}</span></div>` : '';
      return `<div class="ib-railWrap"><div class="ib-rail">${nodes}</div>${ends}</div>`;
    }

    /* 7 ── process_loop ─ 4-6 nodes on a circle around a center sentence, curved SVG arrows, optional break node */
    if (kind === 'process_loop'){
      const items = arr(d.items).slice(0, 6);
      const n = items.length || 1;
      const SZ = 760, cx = SZ / 2, cy = SZ / 2, R = 300;      // ring radius for node CENTERS
      const NW = 200, NH = 122;                                // node card size
      const breakName = txt(d.break_at).toLowerCase();
      // arc segments between consecutive node centers (drawn slightly inside the ring)
      const AR = R;                                            // arrow arc radius
      const arcs = [];
      for (let i = 0; i < n; i++){
        const a0 = (i / n) * 360, a1 = ((i + 1) / n) * 360;
        // gap so the arrow doesn't dive under the node card
        const pad = 20;
        const s = polar(cx, cy, AR, a0 + pad), e = polar(cx, cy, AR, a1 - pad);
        const large = 0, sweep = 1;
        const isBreak = breakName && items[(i + 1) % n] && txt(items[(i + 1) % n].label).toLowerCase() === breakName;
        arcs.push(`<path d="M ${f(s.x)} ${f(s.y)} A ${AR} ${AR} 0 ${large} ${sweep} ${f(e.x)} ${f(e.y)}" fill="none" stroke="${isBreak ? 'var(--acc)' : 'var(--line)'}" stroke-width="${isBreak ? 4 : 2.6}" ${isBreak ? 'stroke-dasharray="2 12" stroke-linecap="round"' : ''} marker-end="url(#ibLoopArrow)"/>`);
      }
      const nodes = items.map((it, i) => {
        const ang = (i / n) * 360;
        const p = polar(cx, cy, R, ang);
        const isBreak = breakName && txt(it && it.label).toLowerCase() === breakName;
        const L = f((p.x - NW / 2) / SZ * 100), T = f((p.y - NH / 2) / SZ * 100);
        return `<div class="ib-loopNode${isBreak ? ' brk' : ''}" style="left:${L}%;top:${T}%;width:${f(NW / SZ * 100)}%;">
          <div class="ib-loopLab">${escapeBlockText(it && it.label)}</div>${it && it.text ? `<div class="ib-loopT">${escapeBlockText(it.text)}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="ib-loop"><div class="ib-loopWrap">
        <svg viewBox="0 0 ${SZ} ${SZ}" class="ib-loopSvg">
          <defs><marker id="ibLoopArrow" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="var(--acc)"/></marker></defs>
          ${arcs.join('')}
        </svg>
        <div class="ib-loopCenter">${escapeBlockText(d.center)}</div>
        ${nodes}
      </div></div>`;
    }

    /* 8 ── sketch_model ─ hand-drawn diagram; SVG shapes w/ turbulence displacement, HTML text over for readability */
    if (kind === 'sketch_model'){
      const parts = arr(d.parts).slice(0, 7);
      const W = 900, H = 580;
      const computedParts = parts.map((pt, i) => {
        const rawX = clamp(pt && pt.x, 14, 86);
        const rawY = clamp(pt && pt.y, 4, 96);
        const shape = txt(pt && pt.shape).toLowerCase() || 'box';
        return {
          idx: i,
          raw: pt,
          x: rawX / 100 * W,
          y: rawY / 100 * H,
          pctX: rawX,
          pctY: rawY,
          shape: shape,
          label: pt && pt.label ? String(pt.label) : '',
          text: pt && pt.text ? String(pt.text) : '',
          isContainer: false,
          nestedIn: null
        };
      });

      computedParts.forEach(p1 => {
        if (p1.shape === 'box') {
          computedParts.forEach(p2 => {
            if (p1.idx !== p2.idx && p2.shape !== 'arrow') {
              const dx = Math.abs(p1.x - p2.x);
              const dy = Math.abs(p1.y - p2.y);
              if (dx < 180 && dy < 130) {
                p1.isContainer = true;
                p2.nestedIn = p1.idx;
              }
            }
          });
        }
      });

      const shapes = computedParts.map(pt => {
        const x = pt.x, y = pt.y;
        if (pt.shape === 'circle'){
          const rx = pt.nestedIn != null ? 104 : 118;
          const ry = pt.nestedIn != null ? 74 : 86;
          return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rx}" ry="${ry}" fill="color-mix(in srgb, var(--panel) 90%, var(--bg) 10%)" stroke="var(--acc)" stroke-width="3.2" filter="url(#ibRough)"/>`;
        }
        if (pt.shape === 'arrow'){
          return `<path d="M ${f(x - 110)} ${f(y)} L ${f(x + 100)} ${f(y)} M ${f(x + 100)} ${f(y)} L ${f(x + 78)} ${f(y - 16)} M ${f(x + 100)} ${f(y)} L ${f(x + 78)} ${f(y + 16)}" fill="none" stroke="var(--acc2,var(--acc))" stroke-width="3.4" stroke-linecap="round" filter="url(#ibRough)"/>`;
        }
        if (pt.isContainer) {
          const bw = 320, bh = 175;
          return `<rect x="${f(x - bw / 2)}" y="${f(y - bh / 2)}" width="${bw}" height="${bh}" rx="20" fill="color-mix(in srgb, var(--panel) 60%, transparent)" stroke="var(--acc)" stroke-width="2.6" stroke-dasharray="6 4" filter="url(#ibRough)"/>`;
        }
        return `<rect x="${f(x - 120)}" y="${f(y - 74)}" width="240" height="148" rx="16" fill="color-mix(in srgb, var(--panel) 85%, var(--bg) 15%)" stroke="var(--acc)" stroke-width="3.2" filter="url(#ibRough)"/>`;
      }).join('');

      const labels = computedParts.map(pt => {
        if (pt.shape === 'arrow') {
          if (!pt.label && !pt.text) return '';
          return `<div class="ib-skPart ib-skArrowPart" style="left:${f(pt.pctX)}%;top:${f(pt.pctY - 5)}%;">
            ${pt.label ? `<div class="ib-skArrowLab">${escapeBlockText(pt.label)}</div>` : ''}
            ${pt.text ? `<div class="ib-skArrowT">${escapeBlockText(pt.text)}</div>` : ''}
          </div>`;
        }
        if (pt.isContainer) {
          return `<div class="ib-skPart ib-skContainerPart" style="left:${f(pt.pctX)}%;top:${f(pt.pctY - 10)}%;">
            ${pt.label ? `<div class="ib-skLab ib-skContainerLab">${escapeBlockText(pt.label)}</div>` : ''}
            ${pt.text ? `<div class="ib-skT ib-skContainerT">${escapeBlockText(pt.text)}</div>` : ''}
          </div>`;
        }
        return `<div class="ib-skPart${pt.nestedIn != null ? ' ib-skNestedPart' : ''}" style="left:${f(pt.pctX)}%;top:${f(pt.pctY)}%;">
          ${pt.label ? `<div class="ib-skLab">${escapeBlockText(pt.label)}</div>` : ''}${pt.text ? `<div class="ib-skT">${escapeBlockText(pt.text)}</div>` : ''}
        </div>`;
      }).join('');

      return `<div class="ib-sketch">${d.title ? `<div class="ib-skTitle">${escapeBlockText(d.title)}</div>` : ''}
        <div class="ib-skStage">
          <svg viewBox="0 0 ${W} ${H}" class="ib-skSvg" preserveAspectRatio="xMidYMid meet">
            <defs><filter id="ibRough"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter></defs>
            ${shapes}
          </svg>
          ${labels}
        </div>
        ${d.note ? `<div class="ib-skNote">${escapeBlockText(d.note)}</div>` : ''}
      </div>`;
    }

    /* 9 ── spectrum_scale ─ single horizontal scale, 3 zones, a marker; intensity not judgment */
    if (kind === 'spectrum_scale'){
      let zones = arr(d.zones).slice(0, 4);
      if (!zones.length) zones = [{ from: 0, to: 33 }, { from: 33, to: 66 }, { from: 66, to: 100 }];
      // clamp each zone, then snap from_i to the previous zone's to so non-contiguous
      // zones don't blend across gaps in the hard-stop gradient.
      let prevTo = null;
      const zr = zones.map((z, i) => {
        let from = clamp(z && z.from, 0, 100), to = clamp(z && z.to, 0, 100);
        if (prevTo != null) from = prevTo;
        if (to < from) to = from;
        prevTo = to;
        return { from: from, to: to, col: segColor(z && z.color, i), label: z && z.label };
      });
      // build a hard-stop gradient from the snapped zone ranges (palette-aware defaults if no color)
      const stops = zr.map(z => `${z.col} ${f(z.from)}% ${f(z.to)}%`).join(', ');
      const zLabels = zr.map(z => {
        const mid = (z.from + z.to) / 2;
        return `<div class="ib-specZ" style="left:${f(mid)}%;"><b style="color:${z.col};">${escapeBlockText(z.label)}</b></div>`;
      }).join('');
      const m = d.marker || {};
      const mv = clamp(m.value, 6, 94);
      return `<div class="ib-spectrum">
        <div class="ib-specEnds"><span>${escapeBlockText(d.left)}</span><span>${escapeBlockText(d.right)}</span></div>
        <div class="ib-specTrackWrap">
          <div class="ib-specTrack" style="background:linear-gradient(90deg, ${stops});"></div>
          <div class="ib-specMarker" style="left:${f(mv)}%;"><div class="ib-specStem"></div><div class="ib-specFlag">${escapeBlockText(m.label)}</div></div>
        </div>
        <div class="ib-specZones">${zLabels}</div>
      </div>`;
    }

    /* 10 ── iceberg_layers ─ visible tip / submerged body / deepest root, HTML text over SVG layers */
    if (kind === 'iceberg_layers'){
      const surface = arr(d.surface).slice(0, 1);
      const hidden = arr(d.hidden).slice(0, 1);
      const rootL = arr(d.root).slice(0, 1);
      const layerHtml = (items, cls) => items.map(it => `<div class="ib-iceItem"><b>${escapeBlockText(it && it.label)}</b>${it && it.text ? `<span>${escapeBlockText(it.text)}</span>` : ''}</div>`).join('');
      return `<div class="ib-iceberg">
        <svg viewBox="0 0 720 760" class="ib-iceSvg" preserveAspectRatio="xMidYMid meet">
          <polygon points="360,32 512,232 208,232" fill="var(--panel)" stroke="var(--line)" stroke-width="2.5"/>
          <line x1="24" y1="232" x2="696" y2="232" stroke="var(--acc)" stroke-width="2.5" stroke-dasharray="10 12"/>
          <polygon points="176,238 544,238 648,540 72,540" fill="var(--panel)" stroke="var(--line)" stroke-width="2.5" opacity="0.72"/>
          <rect x="96" y="556" width="528" height="150" rx="10" fill="var(--panel)" stroke="var(--line)" stroke-width="2.5" opacity="0.55"/>
        </svg>
        <div class="ib-iceWater">waterline</div>
        <div class="ib-iceLayer surface">${layerHtml(surface)}</div>
        <div class="ib-iceLayer hidden">${layerHtml(hidden)}</div>
        <div class="ib-iceLayer root">${layerHtml(rootL)}</div>
      </div>`;
    }

    /* 11 ── funnel_filter ─ descending widths, big noisy input → one clear output */
    if (kind === 'funnel_filter'){
      const stages = arr(d.stages).slice(0, 6);
      const n = stages.length || 1;
      const rows = stages.map((st, i) => {
        const w = st && st.width != null ? clamp(st.width, 40, 100) : (100 - i * (60 / Math.max(n - 1, 1)));
        return `<div class="ib-fnStage" style="width:${f(w)}%;">
          <div class="ib-fnLab">${escapeBlockText(st && st.label)}</div>${st && st.text ? `<div class="ib-fnT">${escapeBlockText(st.text)}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="ib-funnel">${d.title ? `<div class="ib-capTitle">${escapeBlockText(d.title)}</div>` : ''}
        <div class="ib-fnStack">${rows}</div>
        ${d.output ? `<div class="ib-fnOut">${escapeBlockText(d.output)}</div>` : ''}
      </div>`;
    }

    /* 12 ── mind_map_radial ─ center idea + 5-7 branch cards, SVG connector lines, angle/dist computed in JS */
    if (kind === 'mind_map_radial'){
      const branches = arr(d.branches).slice(0, 7);
      const n = branches.length || 1;
      const W = 900, H = 760, cx = W / 2, cy = H / 2;
      const RX = 320, RY = 288;                                 // elliptical spread so cards fit the 900x760 stage
      const CW = 246, CH = 120;                                 // branch card size
      const lines = [], cards = [];
      branches.forEach((b, i) => {
        // honor explicit angle; else spread evenly starting from top
        const ang = b && b.angle != null ? num(b.angle) : (-90 + i * (360 / n));
        const a = ang * Math.PI / 180;
        const bx = cx + Math.cos(a) * RX, by = cy + Math.sin(a) * RY;
        lines.push(`<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(bx)}" y2="${f(by)}" stroke="${b && b.active ? 'var(--acc)' : 'var(--line)'}" stroke-width="2.4" stroke-dasharray="6 8"/>`);
        const L = f((bx - CW / 2) / W * 100), T = f((by - CH / 2) / H * 100);
        cards.push(`<div class="ib-mmBranch${b && b.active ? ' on' : ''}" style="left:${L}%;top:${T}%;width:${f(CW / W * 100)}%;">
          <div class="ib-mmLab">${escapeBlockText(b && b.label)}</div>${b && b.text ? `<div class="ib-mmT">${escapeBlockText(b.text)}</div>` : ''}
        </div>`);
      });
      return `<div class="ib-mindmap"><div class="ib-mmWrap">
        <svg viewBox="0 0 ${W} ${H}" class="ib-mmSvg" preserveAspectRatio="xMidYMid meet">${lines.join('')}</svg>
        <div class="ib-mmCenter">${escapeBlockText(d.center)}</div>
        ${cards.join('')}
      </div></div>`;
    }

    /* 13 ── decision_tree ─ one question → 2 branches, each with then/next */
    if (kind === 'decision_tree'){
      const branches = arr(d.branches).slice(0, 2);
      const cells = branches.map(b => `<div class="ib-branch">
        <div class="ib-branchIf">${escapeBlockText(b && b.if)}</div>
        <div class="ib-branchThen">${escapeBlockText(b && b.then)}</div>
        ${b && b.next ? `<div class="ib-branchNext">${escapeBlockText(b.next)}</div>` : ''}
      </div>`).join('');
      return `<div class="ib-tree">
        <div class="ib-treeQ">${escapeBlockText(d.question)}</div>
        <div class="ib-treeConn"></div>
        <div class="ib-branches">${cells}</div>
      </div>`;
    }

    return '';
  }

  // ============================================================================
  //  CSS — one string. All color via --bg/--ink/--sub/--acc/--acc2/--panel/--line.
  //  var(--acc2,var(--acc)) so looks that don't set --acc2 degrade gracefully.
  //  Sizing tuned for the 1080x1350 slide (safe area ~908px, block diagram area ~740px).
  // ============================================================================
  var css = `
  /* shared block caption title (blocks that carry their own inner title) */
  .ib-capTitle{ font-family:'Poppins'; font-weight:800; font-size:34px; color:var(--ink); margin-bottom:26px; letter-spacing:-.3px; line-height:1.16; }

  /* 1 · bar_truth_weight */
  .ib-bar{ display:flex; flex-direction:column; gap:30px; }
  .ib-barRow{ display:flex; flex-direction:column; gap:12px; }
  .ib-barMeta{ display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
  .ib-barLab{ font-family:'Poppins','Laila'; font-weight:700; font-size:34px; color:var(--ink); line-height:1.15; }
  .ib-barVal{ font-family:'Poppins'; font-weight:800; font-size:36px; color:var(--acc); letter-spacing:-1px; }
  .ib-barTrack{ height:30px; border:1.5px solid var(--line); border-radius:6px; background:var(--panel); overflow:hidden; }
  .ib-barFill{ height:100%; border-radius:4px; min-width:6px; box-shadow:0 1px 6px rgba(0,0,0,.14); }
  .ib-barNote{ font-family:'Poppins','Laila'; font-weight:300; font-size:28px; color:var(--sub); line-height:1.4; }

  /* 2 · donut_three_forces */
  .ib-donut{ display:flex; justify-content:center; }
  .ib-donWrap{ position:relative; width:100%; max-width:820px; aspect-ratio:1/1; }
  .ib-donSvg{ position:absolute; inset:0; width:100%; height:100%; }
  .ib-donCenter{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:44%; text-align:center; font-family:'Poppins','Laila'; font-weight:700; font-size:34px; line-height:1.28; color:var(--ink); }
  .ib-donLab{ position:absolute; width:26%; transform:translateY(-50%); font-family:'Poppins','Laila'; line-height:1.24; word-break:break-word; }
  .ib-donLab.r{ text-align:left; }
  .ib-donLab.l{ text-align:right; }
  .ib-donLab b{ display:block; font-weight:700; font-size:30px; }
  .ib-donLab span{ display:block; font-weight:300; font-size:25px; color:var(--sub); margin-top:4px; line-height:1.32; }

  /* 3 · matrix_2x2 */
  .ib-matrixWrap{ display:flex; flex-direction:column; align-items:center; gap:14px; }
  .ib-axY{ font-family:'Poppins'; font-weight:700; font-size:22px; letter-spacing:.12em; text-transform:uppercase; color:var(--sub); }
  .ib-matrixMid{ display:flex; align-items:stretch; gap:14px; width:100%; }
  .ib-axX{ display:flex; align-items:center; font-family:'Poppins'; font-weight:700; font-size:22px; letter-spacing:.12em; text-transform:uppercase; color:var(--sub); writing-mode:vertical-rl; }
  .ib-axX.left{ transform:rotate(180deg); }
  .ib-matrix{ flex:1; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; border:1.5px solid var(--line); min-height:660px; }
  .ib-cell{ padding:36px 32px; border:1px solid var(--line); background:var(--panel); display:flex; flex-direction:column; }
  .ib-cell.active{ box-shadow:inset 0 0 0 4px var(--acc); }
  .ib-cellTag{ font-family:'Poppins'; font-weight:800; font-size:22px; letter-spacing:2px; text-transform:uppercase; color:var(--acc); margin-bottom:12px; }
  .ib-cellH{ font-family:'Poppins'; font-weight:700; font-size:38px; color:var(--ink); margin-bottom:10px; line-height:1.14; }
  .ib-cellT{ font-family:'Poppins','Laila'; font-weight:300; font-size:29px; color:var(--sub); line-height:1.4; }

  /* 4 · comparison_table */
  .ib-cmpTable{ display:grid; grid-template-columns:1fr 1fr; border:1.5px solid var(--line); border-radius:6px; overflow:hidden; }
  .ib-cmpHead{ font-family:'Poppins'; font-weight:800; font-size:26px; letter-spacing:.1em; text-transform:uppercase; background:var(--ink); color:var(--bg); padding:26px 30px; }
  .ib-cmpHead.r{ background:var(--acc); }
  .ib-cmpRow{ display:contents; }
  .ib-cmpCell{ padding:28px 30px; border-top:1px solid var(--line); font-family:'Poppins','Laila'; font-size:31px; line-height:1.36; }
  .ib-cmpCell.left{ color:var(--sub); text-decoration:line-through; text-decoration-color:var(--acc); text-decoration-thickness:3px; opacity:.75; }
  .ib-cmpCell.right{ color:var(--ink); font-weight:700; border-left:1px solid var(--line); }
  .ib-cmpSig{ display:block; margin-top:8px; font-family:'Poppins'; font-weight:700; font-size:20px; letter-spacing:1.5px; text-transform:uppercase; color:var(--acc); }

  /* 5 · ranking_ladder */
  .ib-ladderStack{ display:flex; flex-direction:column-reverse; gap:14px; align-items:center; }
  .ib-step{ min-height:96px; border:1.5px solid var(--line); border-radius:12px; background:var(--panel); display:grid; grid-template-columns:78px 1fr; align-items:center; padding:0 30px; gap:22px; }
  .ib-step.on{ border-color:var(--acc); box-shadow:inset 0 0 0 3px var(--acc); }
  .ib-rank{ font-family:'Poppins'; font-weight:900; font-size:44px; line-height:1; color:var(--acc); text-align:center; }
  .ib-stepBody{ min-width:0; }
  .ib-stepLab{ font-family:'Poppins','Laila'; font-weight:700; font-size:34px; color:var(--ink); line-height:1.14; }
  .ib-stepT{ font-family:'Poppins','Laila'; font-weight:300; font-size:27px; color:var(--sub); margin-top:4px; line-height:1.34; }

  /* 6 · timeline_rail_horizontal */
  .ib-railWrap{ display:flex; flex-direction:column; gap:22px; }
  .ib-rail{ position:relative; height:640px; }
  .ib-rail:before{ content:''; position:absolute; left:40px; right:40px; top:50%; height:4px; background:var(--line); transform:translateY(-50%); }
  .ib-node{ position:absolute; top:50%; transform:translate(-50%,-50%); width:26px; height:26px; border-radius:50%; background:var(--acc); box-shadow:0 0 0 10px var(--panel), 0 0 0 12px var(--line); z-index:2; }
  .ib-event{ position:absolute; width:250px; transform:translateX(-50%); }
  .ib-event.up{ bottom:calc(50% + 40px); }
  .ib-event.down{ top:calc(50% + 40px); }
  .ib-eventCard{ border:1.5px solid var(--line); border-radius:12px; background:var(--panel); padding:22px 24px; }
  .ib-eventTag{ font-family:'Poppins'; font-weight:800; font-size:21px; letter-spacing:1.5px; color:var(--acc); margin-bottom:8px; }
  .ib-eventH{ font-family:'Poppins'; font-weight:700; font-size:32px; color:var(--ink); line-height:1.14; }
  .ib-eventT{ font-family:'Poppins','Laila'; font-weight:300; font-size:26px; color:var(--sub); margin-top:6px; line-height:1.34; }
  .ib-railEnds{ display:flex; justify-content:space-between; font-family:'Poppins'; font-weight:700; font-size:24px; letter-spacing:.1em; text-transform:uppercase; color:var(--sub); padding:0 30px; }

  /* 7 · process_loop */
  .ib-loop{ display:flex; justify-content:center; }
  .ib-loopWrap{ position:relative; width:100%; max-width:860px; aspect-ratio:1/1; }
  .ib-loopSvg{ position:absolute; inset:0; width:100%; height:100%; }
  .ib-loopCenter{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:38%; text-align:center; font-family:'Poppins','Laila'; font-weight:700; font-size:32px; line-height:1.3; color:var(--acc); }
  .ib-loopNode{ position:absolute; transform:translateY(0); border:1.5px solid var(--line); border-radius:14px; background:var(--panel); padding:18px 18px; text-align:center; box-sizing:border-box; }
  .ib-loopNode.brk{ border-color:var(--acc); box-shadow:inset 0 0 0 3px var(--acc); }
  .ib-loopLab{ font-family:'Poppins','Laila'; font-weight:700; font-size:26px; color:var(--ink); line-height:1.1; }
  .ib-loopT{ font-family:'Poppins','Laila'; font-weight:300; font-size:24px; color:var(--sub); margin-top:5px; line-height:1.28; }

  /* 8 · sketch_model */
  .ib-skTitle{ font-family:'Bradley Hand','Comic Sans MS','Poppins','Laila',cursive; font-weight:700; font-size:38px; color:var(--ink); margin-bottom:14px; line-height:1.2; }
  .ib-skStage{ position:relative; width:100%; aspect-ratio:900/580; max-height:540px; }
  .ib-skSvg{ position:absolute; inset:0; width:100%; height:100%; }
  .ib-skPart{ position:absolute; transform:translate(-50%,-50%); width:230px; text-align:center; }
  .ib-skLab{ font-family:'Bradley Hand','Comic Sans MS','Poppins','Laila',cursive; font-weight:700; font-size:30px; color:var(--ink); line-height:1.14; }
  .ib-skT{ font-family:'Bradley Hand','Comic Sans MS','Poppins','Laila',cursive; font-weight:400; font-size:24px; color:var(--sub); margin-top:4px; line-height:1.24; }
  .ib-skNote{ font-family:'Bradley Hand','Comic Sans MS','Poppins','Laila',cursive; font-weight:400; font-size:26px; color:var(--sub); margin-top:14px; line-height:1.32; }
  .ib-skContainerPart{ width:320px; transform:translate(-50%,-105%); pointer-events:none; }
  .ib-skContainerLab{ font-size:25px; color:var(--acc); letter-spacing:.04em; text-transform:uppercase; font-weight:700; }
  .ib-skContainerT{ font-size:22px; color:var(--sub); margin-top:2px; }
  .ib-skArrowPart{ width:200px; background:var(--bg); border:1.5px dashed var(--acc2, var(--line)); border-radius:8px; padding:3px 8px; box-shadow:0 2px 8px rgba(0,0,0,0.12); }
  .ib-skArrowLab{ font-size:22px; font-weight:700; color:var(--acc); line-height:1.15; }
  .ib-skArrowT{ font-size:19px; color:var(--sub); line-height:1.2; margin-top:2px; }

  /* 9 · spectrum_scale */
  .ib-spectrum{ display:flex; flex-direction:column; gap:0; padding:20px 0; }
  .ib-specEnds{ display:flex; justify-content:space-between; font-family:'Poppins'; font-weight:700; font-size:28px; color:var(--ink); margin-bottom:22px; }
  .ib-specTrackWrap{ position:relative; }
  .ib-specTrack{ height:36px; border-radius:6px; border:1.5px solid var(--line); }
  .ib-specMarker{ position:absolute; top:-24px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; }
  .ib-specStem{ width:4px; height:96px; background:var(--ink); }
  .ib-specFlag{ margin-top:8px; font-family:'Poppins','Laila'; font-weight:700; font-size:28px; color:var(--ink); background:var(--panel); border:1.5px solid var(--ink); border-radius:8px; padding:6px 16px; white-space:nowrap; }
  .ib-specZones{ position:relative; height:44px; margin-top:14px; }
  .ib-specZ{ position:absolute; transform:translateX(-50%); font-family:'Poppins'; font-weight:700; font-size:26px; letter-spacing:.06em; text-transform:uppercase; }

  /* 10 · iceberg_layers */
  .ib-iceberg{ position:relative; width:100%; max-width:720px; margin:0 auto; aspect-ratio:720/760; }
  .ib-iceSvg{ position:absolute; inset:0; width:100%; height:100%; }
  .ib-iceWater{ position:absolute; right:2%; top:26%; transform:translateY(-50%); font-family:'Poppins'; font-weight:700; font-size:20px; letter-spacing:.14em; text-transform:uppercase; color:var(--acc); }
  .ib-iceLayer{ position:absolute; left:50%; transform:translateX(-50%); width:70%; text-align:center; display:flex; flex-direction:column; gap:10px; }
  .ib-iceLayer.surface{ top:22%; width:34%; }
  .ib-iceLayer.hidden{ top:44%; width:66%; }
  .ib-iceLayer.root{ top:75%; width:64%; }
  .ib-iceItem b{ display:block; font-family:'Poppins','Laila'; font-weight:700; font-size:22px; letter-spacing:.1em; text-transform:uppercase; color:var(--acc); }
  .ib-iceItem span{ display:block; font-family:'Poppins','Laila'; font-weight:300; font-size:24px; color:var(--ink); line-height:1.3; margin-top:3px; }

  /* 11 · funnel_filter */
  .ib-fnStack{ display:flex; flex-direction:column; gap:16px; align-items:center; }
  .ib-fnStage{ min-height:96px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:14px 24px; background:var(--panel); border:1.5px solid var(--line); box-sizing:border-box; clip-path:polygon(6% 0,94% 0,86% 100%,14% 100%); }
  .ib-fnLab{ font-family:'Poppins','Laila'; font-weight:700; font-size:32px; color:var(--ink); line-height:1.12; }
  .ib-fnT{ font-family:'Poppins','Laila'; font-weight:300; font-size:26px; color:var(--sub); margin-top:4px; line-height:1.3; }
  .ib-fnOut{ margin-top:24px; border-top:4px solid var(--acc); padding-top:24px; text-align:center; font-family:'Poppins','Laila'; font-weight:700; font-size:36px; color:var(--ink); line-height:1.32; }

  /* 12 · mind_map_radial */
  .ib-mindmap{ display:flex; justify-content:center; }
  .ib-mmWrap{ position:relative; width:100%; max-width:900px; aspect-ratio:900/760; }
  .ib-mmSvg{ position:absolute; inset:0; width:100%; height:100%; }
  .ib-mmCenter{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:27%; min-height:150px; display:flex; align-items:center; justify-content:center; text-align:center; border:2px solid var(--acc); border-radius:16px; background:var(--panel); padding:18px; font-family:'Poppins','Laila'; font-weight:700; font-size:32px; line-height:1.22; color:var(--ink); box-sizing:border-box; }
  .ib-mmBranch{ position:absolute; transform:translateY(0); border:1.5px solid var(--line); border-radius:12px; background:var(--panel); padding:16px 18px; text-align:center; box-sizing:border-box; }
  .ib-mmBranch.on{ border-color:var(--acc); box-shadow:inset 0 0 0 3px var(--acc); }
  .ib-mmLab{ font-family:'Poppins','Laila'; font-weight:700; font-size:29px; color:var(--ink); line-height:1.12; word-break:break-word; }
  .ib-mmT{ font-family:'Poppins','Laila'; font-weight:300; font-size:24px; color:var(--sub); margin-top:5px; line-height:1.28; word-break:break-word; }

  /* 13 · decision_tree */
  .ib-tree{ display:flex; flex-direction:column; align-items:center; }
  .ib-treeQ{ width:100%; border:2px solid var(--ink); border-radius:12px; background:var(--panel); padding:32px 30px; text-align:center; font-family:'Poppins','Laila'; font-weight:800; font-size:38px; color:var(--ink); line-height:1.22; box-sizing:border-box; }
  .ib-treeConn{ width:2px; height:40px; background:var(--line); }
  .ib-branches{ position:relative; display:grid; grid-template-columns:1fr 1fr; gap:28px; width:100%; }
  .ib-branches:before{ content:''; position:absolute; top:-20px; left:25%; right:25%; height:2px; background:var(--line); }
  .ib-branch{ position:relative; border:1.5px solid var(--line); border-radius:12px; background:var(--panel); padding:32px 28px; box-sizing:border-box; }
  .ib-branch:before{ content:''; position:absolute; top:-40px; left:50%; width:2px; height:40px; background:var(--line); }
  .ib-branchIf{ font-family:'Poppins','Laila'; font-weight:800; font-size:24px; letter-spacing:.06em; text-transform:uppercase; color:var(--acc); margin-bottom:14px; }
  .ib-branchThen{ font-family:'Poppins','Laila'; font-weight:800; font-size:34px; color:var(--ink); line-height:1.18; }
  .ib-branchNext{ font-family:'Poppins','Laila'; font-weight:300; font-size:27px; color:var(--sub); margin-top:12px; line-height:1.34; }
  `;

  var API = { render: render, css: css };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CarouselBlocks = API;

})(typeof self !== 'undefined' ? self : this);

/* source: codex-merged-carousel-core-js */
'use strict';
/* carousel_core.js — SINGLE SOURCE OF TRUTH for looks + slide rendering.
   Consumed by BOTH render.cjs (Node headless PNG export) and design_studio.html (live browser).
   Each LOOK = a distinct crafted aesthetic MOVEMENT: palette + typography + a subtle background graphic.
   Fonts: Laila = Devanagari/Hindi, Poppins = Hinglish default, but any well-fitting system font is fair game
   (Didot, Baskerville, Hoefler Text, Futura, Rockwell, Georgia, Courier New, Bradley Hand — all installed).
   Add a look here once → PNG export + Studio both get it. */
(function (root) {

  // ---- shared slide skeleton (identical in Node + browser) ----
  const SLIDE_BASE_CSS = `
  .slide, .slide *{ box-sizing:border-box; }
  .slide{ width:1080px; height:1350px; padding:96px 92px 120px; display:flex; flex-direction:column; position:relative; overflow:hidden; }
  .hook, .body, .poem, .profile, .bubble .body, .bk-title, .bk-h, .bk-t{ overflow-wrap:break-word; }
  .pu{ white-space:nowrap; } /* v357 typeset: phrase units never break mid-phrase */
  .slide .gfx{ position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
  .slide .top-b{ height:40px; position:relative; z-index:2; }
  /* A6: fixed bottom band for page counter/arrow — content must not enter. */
  .slide .mid{ flex:1; display:flex; flex-direction:column; justify-content:center; position:relative; z-index:2; min-width:0; padding-bottom:28px; max-height:calc(1350px - 96px - 120px - 40px); overflow:hidden; }
  .slide .foot{ display:flex; align-items:center; justify-content:space-between; position:relative; z-index:2; }
  .brand{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:4px; text-align:right; }
  .pageno{ font-family:'Poppins'; font-weight:400; font-size:26px; letter-spacing:1px; }
  .arrow{ opacity:.85; }
  .kickline{ display:flex; align-items:center; gap:22px; margin-bottom:44px; }
  .num{ display:block; margin-bottom:16px; }
  .ce-render-block[style*="--ce-font-family"] > :is(.hook,.body,.poem,.profile,.bubble,.bk-title),
  .ce-render-block[style*="--ce-font-family"] .kt,
  .ce-render-block.foot[style*="--ce-font-family"] > *{ font-family:var(--ce-font-family) !important; }
  .ce-render-block[style*="--ce-font-size"] > :is(.hook,.body,.poem,.profile,.bubble,.bk-title),
  .ce-render-block[style*="--ce-font-size"] .kt,
  .ce-render-block.foot[style*="--ce-font-size"] > *{ font-size:var(--ce-font-size) !important; }
  .ce-render-block[style*="--ce-font-weight"] > :is(.hook,.body,.poem,.profile,.bubble,.bk-title),
  .ce-render-block[style*="--ce-font-weight"] .kt,
  .ce-render-block.foot[style*="--ce-font-weight"] > *{ font-weight:var(--ce-font-weight) !important; }
  .ce-render-block[style*="--ce-text-align"] > :is(.hook,.body,.poem,.profile,.bubble,.bk-title),
  .ce-render-block[style*="--ce-text-align"] .kt,
  .ce-render-block.foot[style*="--ce-text-align"] > *{ text-align:var(--ce-text-align) !important; }
  .ce-render-block[style*="--ce-text-color"] > :is(.hook,.body,.poem,.profile,.bubble,.bk-title),
  .ce-render-block[style*="--ce-text-color"] .kt,
  .ce-render-block.foot[style*="--ce-text-color"] > *{ color:var(--ce-text-color) !important; }

  /* ---- infographic blocks (palette from --vars on .slide) ---- */
  .bk-title{ font-family:'Poppins'; font-weight:700; font-size:40px; color:var(--ink); margin-bottom:20px; line-height:1.24; letter-spacing:-.5px; }
  .bk-foot{ font-family:'Poppins'; font-weight:400; font-size:28px; color:var(--sub); margin-top:18px; line-height:1.44; }
  .bk-tag{ font-family:'Poppins'; font-weight:700; font-size:23px; letter-spacing:2px; text-transform:uppercase; color:var(--acc); margin-bottom:12px; }
  .bk-h{ font-family:'Poppins'; font-weight:700; font-size:42px; color:var(--ink); margin-bottom:12px; line-height:1.22; }
  .bk-t{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:33px; color:var(--sub); line-height:1.52; }
  .bk-quad{ display:grid; grid-template-columns:1fr 1fr; gap:22px; }
  .bk-cell{ border:2px solid var(--line); border-radius:18px; padding:36px 32px; background:var(--panel); }
  .bk-cols{ display:flex; gap:22px; }
  .bk-col{ flex:1; border-top:4px solid var(--acc); padding-top:24px; }
  .bk-cmp{ display:flex; gap:20px; align-items:center; }
  .bk-cmp-a{ flex:1; border:2px solid var(--line); border-radius:16px; padding:36px; opacity:.72; }
  .bk-cmp-a .bk-t{ text-decoration:line-through; text-decoration-color:var(--acc); text-decoration-thickness:3px; }
  /* A3: long left column — dim-italic, not strike (equal-dignity / overflow). */
  .bk-cmp-a.bk-cmp-a--dim .bk-t{ text-decoration:none; font-style:italic; opacity:.7; }
  .bk-cmp-mid{ font-size:60px; color:var(--acc); font-family:'Poppins'; }
  .bk-cmp-b{ flex:1.15; border:2px solid var(--acc); border-radius:16px; padding:36px; background:var(--panel); }
  .bk-gauge{ display:flex; flex-direction:column; gap:30px; }
  .bk-zbar{ height:38px; border-radius:9px; margin-bottom:14px; box-shadow:0 2px 8px rgba(0,0,0,.12); }
  .bk-zlab{ font-family:'Poppins','Laila'; font-weight:300; font-size:36px; color:var(--ink); }
  .bk-zlab b{ font-weight:700; }
  .bk-scr{ text-align:center; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:46px 24px; }
  .bk-scr-mark{ font-family:'Laila'; font-size:56px; color:var(--acc); opacity:.55; line-height:1.14; margin-bottom:12px; }
  .bk-scr-v{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:62px; color:var(--ink); line-height:1.54; }
  .bk-scr-tr{ font-family:'Poppins'; font-style:italic; font-size:30px; color:var(--sub); margin-top:22px; line-height:1.52; }
  .bk-scr-m{ font-family:'Poppins','Laila'; font-weight:300; font-size:33px; color:var(--sub); margin-top:16px; line-height:1.52; }
  .bk-scr-ref{ font-family:'Poppins'; font-weight:600; font-size:26px; color:var(--acc); letter-spacing:1px; margin-top:26px; }
  .bk-stat{ text-align:center; }
  .bk-stat-n{ font-family:'Poppins'; font-weight:800; font-size:230px; color:var(--acc); line-height:.86; letter-spacing:-4px; }
  .bk-stat-l{ font-family:'Poppins','Laila'; font-weight:400; font-size:42px; color:var(--sub); margin-top:18px; line-height:1.47; }
  .bk-steps{ display:flex; flex-direction:column; gap:22px; }
  .bk-step{ display:flex; gap:22px; align-items:flex-start; }
  .bk-snum{ flex:0 0 auto; width:58px; height:58px; border-radius:50%; background:var(--acc); color:var(--bg); font-family:'Poppins'; font-weight:800; font-size:30px; display:flex; align-items:center; justify-content:center; }
  .bk-step .bk-t{ font-size:38px; color:var(--ink); padding-top:6px; }
  .bk-check{ display:flex; flex-direction:column; gap:20px; }
  .bk-ci{ display:flex; gap:20px; align-items:flex-start; }
  .bk-cx{ flex:0 0 auto; width:50px; height:50px; border-radius:12px; background:var(--acc); color:var(--bg); font-weight:800; font-size:30px; display:flex; align-items:center; justify-content:center; }
  .bk-ci .bk-t{ font-size:38px; color:var(--ink); padding-top:4px; }
  .bk-annot{ text-align:center; }
  .bk-annot-t{ font-family:'Poppins','Laila',sans-serif; font-weight:700; font-size:62px; line-height:1.3; color:var(--ink); display:inline-block; max-width:100%; word-break:break-word; overflow-wrap:break-word; }
  .bk-annot-n{ font-family:'Poppins'; font-weight:300; font-size:34px; color:var(--sub); margin-top:30px; line-height:1.52; }
  .bk-venn svg{ display:block; margin:0 auto 8px; max-width:760px; }
  .bk-venn-labs{ display:flex; justify-content:space-between; gap:16px; }
  .bk-venn-l,.bk-venn-r,.bk-venn-m{ flex:1; text-align:center; font-family:'Poppins','Laila'; font-weight:300; font-size:30px; color:var(--sub); line-height:1.44; }
  .bk-venn-l b,.bk-venn-r b,.bk-venn-m b{ font-weight:700; color:var(--ink); font-size:33px; }
  .bk-venn-m b{ color:var(--acc); }
  .bk-tl-row{ display:flex; justify-content:space-between; margin-top:-6px; }
  .bk-tl-step{ flex:1; text-align:center; }
  .bk-tl-dot{ width:24px; height:24px; border-radius:50%; background:var(--acc); margin:0 auto 16px; box-shadow:0 0 0 6px var(--panel); }
  .bk-tl-lab{ font-family:'Poppins','Laila'; font-weight:300; font-size:29px; color:var(--sub); line-height:1.44; padding:0 6px; }
  .bk-tl-lab b{ color:var(--ink); font-weight:700; font-size:32px; }
  .bk-pict{ display:flex; gap:26px; justify-content:center; }
  .bk-pi{ flex:1; text-align:center; }
  .bk-pi-ic{ width:120px; height:120px; color:var(--acc); margin-bottom:20px; }
  .bk-pi-h{ font-family:'Poppins'; font-weight:700; font-size:40px; color:var(--ink); margin-bottom:10px; }
  .bk-pi .bk-t{ text-align:center; }
  .bk-flow{ display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
  .bk-fnode{ border:2px solid var(--acc); border-radius:14px; padding:26px 30px; font-family:'Poppins','Laila'; font-weight:600; font-size:36px; color:var(--ink); background:var(--panel); text-align:center; }
  .bk-farrow{ font-size:52px; color:var(--acc); font-family:'Poppins'; }
  /* photo block — his real image, duotone-tinted to the look's accent (palette-aware, belongs on any look) */
  .bk-photo{ display:flex; flex-direction:column; align-items:center; }
  .bk-photo-frame{ position:relative; width:100%; max-width:884px; border-radius:18px; overflow:hidden; box-shadow:0 12px 44px rgba(0,0,0,.20); }
  .bk-photo-frame .im{ width:100%; height:744px; background-size:cover; background-position:center 28%; filter:grayscale(1) contrast(1.06) brightness(1.02); }
  .bk-photo-frame .tone{ position:absolute; inset:0; background:var(--acc); mix-blend-mode:color; opacity:.32; pointer-events:none; }
  .bk-photo-frame .shade{ position:absolute; inset:0; background:linear-gradient(0deg,rgba(0,0,0,.30),transparent 52%); pointer-events:none; }
  .bk-photo-tag{ position:absolute; left:28px; bottom:24px; z-index:2; font-family:'Poppins'; font-weight:700; font-size:26px; letter-spacing:2px; text-transform:uppercase; color:#fff; text-shadow:0 2px 12px rgba(0,0,0,.55); }
  .bk-photo-cap{ font-family:'Poppins','Laila'; font-weight:400; font-size:31px; color:var(--sub); margin-top:24px; line-height:1.5; text-align:center; }`;

  function ARROWSVG(c) {
    return `<svg width="66" height="42" viewBox="0 0 66 42" fill="none"><path d="M3 27 C 18 27, 27 8, 46 8 M46 8 L 39 3 M46 8 L 41 15" stroke="${c}" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>`;
  }

  // Prefix every bare selector with `.look-<id> ` so many looks coexist on one page (browser).
  function nsCSS(bare, lookId) {
    const pfx = '.look-' + lookId + ' ';
    return bare.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, body) =>
      sel.split(',').map(s => { s = s.trim(); return s ? pfx + s : s; }).join(', ') + '{' + body + '}');
  }

  // Layout coordinates are an additive Studio contract. Existing authored faces
  // have no layout object and therefore render byte-for-byte as before. Studio
  // writes small layout and typography overrides here without replacing the
  // authored look or losing the source HTML.
  function layoutStyle(s, key, index) {
    const layout = s && s.layout ? s.layout : null;
    const source = key === 'element'
      ? (layout && layout.elements && layout.elements[index])
      : (layout && layout[key]);
    if (!source) return '';
    const x = Math.max(-420, Math.min(420, Number(source.x) || 0));
    const y = Math.max(-520, Math.min(520, Number(source.y) || 0));
    const styles = [];
    if (x || y) styles.push(`transform:translate(${x}px,${y}px)`);
    const families = {
      Poppins: "'Poppins','Laila',sans-serif",
      Laila: "'Laila','Noto Sans Devanagari',serif",
      Georgia: "Georgia,'Laila',serif",
      Baskerville: "Baskerville,'Laila',serif",
      Futura: "Futura,'Poppins','Laila',sans-serif",
      Courier: "'Courier New','Laila',monospace"
    };
    if (families[source.fontFamily]) styles.push(`--ce-font-family:${families[source.fontFamily]}`);
    const fontSize = Number(source.fontSize);
    if (Number.isFinite(fontSize)) styles.push(`--ce-font-size:${Math.max(20, Math.min(120, Math.round(fontSize)))}px`);
    const fontWeight = Number(source.fontWeight);
    if ([300, 400, 500, 600, 700, 800].includes(fontWeight)) styles.push(`--ce-font-weight:${fontWeight}`);
    if (['left', 'center', 'right'].includes(source.textAlign)) styles.push(`--ce-text-align:${source.textAlign}`);
    if (/^#[0-9a-f]{6}$/i.test(String(source.color || ''))) styles.push(`--ce-text-color:${source.color}`);
    return styles.length ? styles.join(';') + ';' : '';
  }

  function renderStudioElement(element) {
    const e = element || {};
    const kind = e.type || e.role || 'body';
    const html = e.html || e.text || e.title || '';
    if (kind === 'hook') return `<div class="hook">${html}</div>${e.sub ? `<div class="sub">${e.sub}</div>` : ''}`;
    if (kind === 'poem') return `<div class="poem">${html}</div>`;
    if (kind === 'profile' || kind === 'cta') return `<div class="profile">${html}</div>`;
    if (kind === 'bubble' || e.bubble || kind === 'quote') return `<div class="bubble"><div class="body">${html}</div>${e.kicker ? `<div class="kicker">${e.kicker}</div>` : ''}</div>`;
    if (kind === 'block') return `${e.title ? `<div class="bk-title">${e.title}</div>` : ''}${renderBlock(e.block, e.data)}${e.foot ? `<div class="bk-foot">${e.foot}</div>` : ''}`;
    return `<div class="body">${e.num ? `<span class="num">${e.num}</span>` : ''}${html}</div>`;
  }

  function renderStudioElements(s) {
    const elements = s && Array.isArray(s.elements) ? s.elements : [];
    return elements.map((element, index) => `<div class="ce-extra-element ce-render-block" data-ce-block="element" data-ce-element-index="${index}" style="${layoutStyle(s, 'element', index)}">${renderStudioElement(element)}</div>`).join('');
  }

  // Build one slide's HTML (the .slide element). look = look id (for graphic + arrow).
  function slideHTML(s, i, n, lookId) {
    const L = LOOKS[lookId] || {};
    // A5: machinery stamps (CONFIRMED / CASE NOTE / cryptic codes) only on slide 1 + one interior.
    const stampHeavy = L.graphic && /CONFIRMED|CASE NOTE|NOTE\s*\d+|A\d+\s*·\s*B\d+|YOU ARE HERE/i.test(L.graphic);
    const allowStampGfx = !stampHeavy || i === 0 || i === Math.min(3, Math.max(1, n - 2));
    const gfx = L.graphic && allowStampGfx ? `<div class="gfx">${L.graphic}</div>` : '';
    const brand = '<div class="brand">@DOALFAAZ</div>';
    let content;
    if (s.role === 'hook') content = `<div class="hook">${s.html}</div>${s.sub ? `<div class="sub">${s.sub}</div>` : ''}`;
    else if (s.role === 'poem') content = `<div class="poem">${s.html}</div>`;
    else if (s.role === 'profile') content = `<div class="profile">${s.html}</div>`;
    else if (s.role === 'block') content = `${s.title ? `<div class="bk-title">${s.title}</div>` : ''}${renderBlock(s.block, s.data)}${s.foot ? `<div class="bk-foot">${s.foot}</div>` : ''}`;
    else if (s.bubble) content = `<div class="bubble"><div class="body">${s.html}</div>${s.kicker ? `<div class="kicker">${s.kicker}</div>` : ''}</div>`;
    else content = `<div class="body">${s.num ? `<span class="num">${s.num}</span>` : ''}${s.html}</div>`;
    // Hide cryptic machinery codes and BTS strategy labels in kicklines.
    // Pillar vocabulary (teaching/story/objection/sales family) never belongs
    // on an audience design — fold it into the clean editorial labels instead
    // of rendering it raw. Authored editorial kickers pass through untouched.
    var kickRaw = String(s.kickline || '').trim();
    if (/^[A-Z]\d+\s*·/.test(kickRaw) || /YOU ARE HERE/i.test(kickRaw)) {
      kickRaw = '';
    } else {
      kickRaw = kickRaw.replace(/^Section\s+[A-Z0-9]+:\s*/i, '').trim();
      if (/teaching|authority|educate|framework|strategy|practice|decode/i.test(kickRaw)) {
        kickRaw = 'Samjho';
      } else if (/objection|sales|conversion|warmup|offer|waitlist/i.test(kickRaw)) {
        kickRaw = 'Gaur Karo';
      } else if (/story|recognition|founder|narrative/i.test(kickRaw)) {
        kickRaw = 'Ek Kahani';
      }
    }
    const kickOk = !!kickRaw;
    const kick = kickOk ? `<div class="kickline ce-render-block" data-ce-block="kicker" style="${layoutStyle(s, 'kicker')}"><span class="rule"></span><span class="kt">${kickRaw}</span></div>` : '';
    // Density-aware breathing relief: measure the authored text this slide actually
    // carries (tags + JSON keys stripped) and stamp it so CSS can open leading and
    // step type down instead of letting dense blocks ride the .mid clip.
    const densChars = (((s.html || '') + ' ' + (s.title || '') + ' ' + (s.foot || '') + ' ' + JSON.stringify(s.data || {}))
      .replace(/<[^>]+>/g, ' ').replace(/"[a-z_]+"\s*:/gi, ' ').replace(/[{}\[\]"]/g, ' ').replace(/\s+/g, ' ').trim()).length;
    const density = densChars > 560 ? 'hi' : (densChars > 420 ? 'md' : '');
    const renderedContent = `<div class="ce-render-block ce-render-block-content${density ? ` ce-dense-${density}` : ''}" data-ce-density="${density}" data-ce-block="content" style="${layoutStyle(s, 'content')}">${content}${renderStudioElements(s)}</div>`;
    // Owner invariant (2026-07-19): page counter ("01 / 09") only belongs on multi-slide
    // carousels. One-slide decks never paint "01 / 01" — single-flag posts keep the quiet
    // "full note in caption" foot; other one-slide decks leave the foot empty.
    const foot = n <= 1
      ? (s.single
        ? `<span class="pageno" style="letter-spacing:2px;">&#10022;&nbsp;&nbsp;full note in caption</span>`
        : '')
      : `<span class="pageno">${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</span>${i < n - 1 ? `<span class="arrow">${ARROWSVG(L.arrow || '#888')}</span>` : ''}`;
    return `<div class="slide" style="${palStyle(lookId)}">${gfx}<div class="top-b">${brand}</div><div class="mid">${kick}${renderedContent}</div><div class="foot ce-render-block" data-ce-block="footer" style="${layoutStyle(s, 'footer')}">${foot}</div></div>`;
  }

  // ================= LOOKS — each a distinct movement =================
  const LOOKS = {

    /* ---------- the original core six ---------- */
    midnight: { name: 'Midnight Ink', chip: '#ffffff', bg: '#000', arrow: '#6a6a6a',
      graphic: `<div style="position:absolute;top:-260px;left:50%;transform:translateX(-50%);width:960px;height:620px;background:radial-gradient(closest-side,rgba(255,255,255,.055),transparent);"></div>`,
      css: `
      .slide{ background:#000; color:#c4c4c4; }
      .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:78px; line-height:1.44; color:#fff; letter-spacing:.3px; }
      .hook .lat{ font-family:'Poppins'; font-weight:300; font-style:italic; }
      .hook b{ color:#fff; font-weight:600; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:33px; color:#b8b8b8; margin-top:44px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:50px; line-height:1.62; color:#c4c4c4; letter-spacing:.2px; }
      .body b, .poem b{ color:#fff; font-weight:500; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:34px; color:#fff; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:70px; line-height:1.62; color:#e9e9e9; }
      .bubble{ border:1.5px solid #3f3f3f; border-radius:12px 190px 12px 12px; padding:64px 58px 70px; }
      .bubble .body{ color:#d4d4d4; font-size:52px; }
      .kicker{ font-family:'Laila'; font-weight:400; font-size:33px; color:#b0b0b0; margin-top:38px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:40px; line-height:1.66; color:#c9c9c9; text-align:center; }
      .profile b{ color:#fff; font-weight:600; }
      .brand{ color:#5f5f5f; } .pageno{ color:#565656; }
      .kickline .rule{ width:44px; height:2px; background:#b8b8b8; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#b8b8b8; }` },

    paper: { name: 'Paper & Silence', chip: '#b0602f', bg: '#f1ece0', arrow: '#b0602f',
      graphic: `<div style="position:absolute;inset:0;background:radial-gradient(80% 60% at 30% 20%,rgba(176,96,47,.05),transparent 60%);"></div>`,
      css: `
      .slide{ background:#f1ece0; color:#2c2925; }
      .kickline .rule{ width:64px; height:1.5px; background:#b0602f; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#b0602f; }
      .hook{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:76px; line-height:1.46; color:#22201c; }
      .hook .lat{ font-family:'Poppins'; font-weight:500; }
      .hook b{ color:#b0602f; font-weight:700; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:32px; color:#6b665e; margin-top:40px; line-height:1.61; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.66; color:#3a362f; }
      .body b, .poem b{ color:#b0602f; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:34px; color:#b0602f; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:68px; line-height:1.62; color:#22201c; }
      .bubble{ border:1.5px solid #cbbfa8; border-radius:10px; padding:58px 56px; }
      .kicker{ font-family:'Laila'; font-weight:500; font-size:32px; color:#6b665e; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#4a453d; text-align:center; }
      .profile b{ color:#b0602f; font-weight:600; }
      .brand{ color:#a99e88; } .pageno{ color:#b3a892; }` },

    loud: { name: 'Loud Type', chip: '#ee4b2b', bg: '#f4f3ee', arrow: '#161616',
      graphic: `<div style="position:absolute;right:-80px;bottom:-120px;font-family:'Poppins';font-weight:800;font-size:520px;color:rgba(238,75,43,.05);line-height:.7;">”</div>`,
      css: `
      .slide{ background:#f4f3ee; color:#161616; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:800; font-size:96px; line-height:1.18; letter-spacing:-1.5px; color:#161616; }
      .hook b{ color:#ee4b2b; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#5a5a5a; margin-top:40px; line-height:1.57; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:50px; line-height:1.54; color:#242424; }
      .body b, .poem b{ color:#ee4b2b; font-weight:700; }
      .body .num{ font-family:'Poppins'; font-weight:800; font-size:40px; color:#ee4b2b; display:block; margin-bottom:16px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:66px; line-height:1.62; color:#161616; }
      .bubble{ background:#161616; color:#f4f3ee; border-radius:8px; padding:58px 56px; }
      .bubble .body{ color:#f4f3ee; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:30px; color:#ee4b2b; margin-top:30px; }
      .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.61; color:#242424; text-align:center; }
      .profile b{ color:#ee4b2b; font-weight:700; }
      .brand{ color:#9a9a9a; } .pageno{ color:#161616; font-weight:700; }
      .kickline .rule{ display:none; }
      .kickline .kt{ background:#161616; color:#f4f3ee; padding:8px 18px; font-family:'Poppins'; font-weight:800; font-size:22px; letter-spacing:3px; text-transform:uppercase; }` },

    grid: { name: 'Editorial Grid', chip: '#1b3a6b', bg: '#fbfbf9', arrow: '#14161a',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(20,22,26,.035) 1px,transparent 1px);background-size:180px 100%;"></div>`,
      css: `
      .slide{ background:#fbfbf9; color:#14161a; }
      .mid{ justify-content:flex-start; padding-top:26px; }
      .hook{ font-family:'Poppins'; font-weight:600; font-size:70px; line-height:1.22; letter-spacing:-1px; color:#14161a; border-top:2px solid #14161a; padding-top:30px; }
      .hook b{ color:#1b3a6b; font-weight:700; }
      .kickline{ margin-bottom:0; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:20px; letter-spacing:4px; text-transform:uppercase; color:#1b3a6b; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#5c5f66; margin-top:34px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:46px; line-height:1.56; color:#2a2d33; border-top:1px solid #d8d6cf; padding-top:34px; }
      .body b, .poem b{ color:#1b3a6b; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:700; font-size:30px; color:#1b3a6b; letter-spacing:2px; display:block; margin-bottom:14px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:62px; line-height:1.62; color:#14161a; text-align:center; border-top:1px solid #d8d6cf; border-bottom:1px solid #d8d6cf; padding:44px 0; }
      .bubble{ border:2px solid #14161a; border-radius:0; padding:52px 50px; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:26px; color:#1b3a6b; margin-top:28px; letter-spacing:1px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#2a2d33; text-align:center; border-top:1px solid #d8d6cf; padding-top:34px; }
      .profile b{ color:#1b3a6b; font-weight:600; }
      .brand{ color:#b8bcc4; } .pageno{ color:#14161a; font-weight:600; }` },

    dusk: { name: 'Dusk Gradient', chip: '#e6b566', bg: '#452450', arrow: '#e6b566',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1.4px);background-size:34px 34px;opacity:.5;"></div>`,
      css: `
      .slide{ background:linear-gradient(158deg,#241d47 0%,#452450 52%,#7c3b40 100%); color:#e9dcc9; }
      .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:80px; line-height:1.42; color:#f6ecdd; letter-spacing:.3px; }
      .hook b{ color:#e6b566; font-weight:600; } .hook .lat{ font-family:'Poppins'; font-weight:300; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:32px; color:#d3c2ae; margin-top:40px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:49px; line-height:1.62; color:#e2d4c1; letter-spacing:.2px; }
      .body b, .poem b{ color:#e6b566; font-weight:500; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:34px; color:#e6b566; display:block; margin-bottom:14px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:70px; line-height:1.62; color:#f6ecdd; }
      .bubble{ border:1.5px solid rgba(230,181,102,.4); border-radius:14px; padding:60px 56px; background:rgba(255,255,255,.04); }
      .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#d3c2ae; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#e2d4c1; text-align:center; }
      .profile b{ color:#e6b566; font-weight:600; }
      .brand{ color:#b39d84; } .pageno{ color:#c9b7a0; }
      .kickline .rule{ width:44px; height:2px; background:#e6b566; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#e6b566; }` },

    riso: { name: 'Duotone Riso', chip: '#f0533f', bg: '#efe7d6', arrow: '#20308f',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(#f0533f 1.1px,transparent 1.3px);background-size:7px 7px;opacity:.12;mix-blend-mode:multiply;"></div>`,
      css: `
      .slide{ background:#efe7d6; color:#20308f; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:800; font-size:98px; line-height:1.17; letter-spacing:-1.5px; color:#20308f; }
      .hook b{ color:#f0533f; text-shadow:3px 3px 0 rgba(43,58,160,.28); }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#41519a; margin-top:38px; line-height:1.54; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:50px; line-height:1.52; color:#20308f; }
      .body b, .poem b{ color:#f0533f; font-weight:700; }
      .body .num{ font-family:'Poppins'; font-weight:800; font-size:40px; color:#f0533f; display:block; margin-bottom:14px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:66px; line-height:1.62; color:#20308f; }
      .bubble{ background:#20308f; color:#efe7d6; border-radius:8px; padding:58px 54px; }
      .bubble .body{ color:#efe7d6; } .bubble b{ color:#ffcf6b; }
      .kicker{ font-family:'Poppins'; font-weight:700; font-size:30px; color:#f0533f; margin-top:28px; }
      .profile{ font-family:'Poppins'; font-weight:500; font-size:38px; line-height:1.56; color:#20308f; text-align:center; }
      .profile b{ color:#f0533f; font-weight:700; }
      .brand{ color:#8f96c4; } .pageno{ color:#20308f; font-weight:700; }
      .kickline .rule{ display:none; }
      .kickline .kt{ background:#20308f; color:#efe7d6; padding:8px 18px; font-family:'Poppins'; font-weight:800; font-size:22px; letter-spacing:3px; text-transform:uppercase; }` },

    /* ---------- the second wave ---------- */
    brut: { name: 'Brutalist', chip: '#2f4cf0', bg: '#faf8f2', arrow: '#111111',
      graphic: `<div style="position:absolute;top:52px;left:52px;right:52px;bottom:52px;border:2px solid rgba(17,17,17,.12);"></div>`,
      css: `
      .slide{ background:#faf8f2; color:#111; border:14px solid #111; }
      .kickline .rule{ width:0; }
      .kickline .kt{ background:#111; color:#faf8f2; padding:9px 20px; font-family:'Poppins'; font-weight:800; letter-spacing:4px; text-transform:uppercase; font-size:24px; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:800; font-size:104px; line-height:.98; letter-spacing:-2px; color:#111; }
      .hook b{ color:#2f4cf0; font-weight:800; box-shadow:inset 0 -.09em 0 rgba(47,76,240,.28); }
      .sub{ font-family:'Poppins'; font-weight:600; font-size:32px; color:#111; margin-top:38px; line-height:1.52; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:49px; line-height:1.54; color:#111; }
      .body b, .poem b{ background:#ffe14d; color:#111; font-weight:700; padding:0 6px; }
      .body .num{ display:block; background:#111; color:#faf8f2; width:66px; height:66px; text-align:center; line-height:66px; font-family:'Poppins'; font-weight:800; font-size:34px; margin-bottom:22px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:66px; line-height:1.62; color:#111; text-align:center; border-top:5px solid #111; border-bottom:5px solid #111; padding:40px 0; }
      .bubble{ border:6px solid #111; border-radius:0; padding:50px 48px; }
      .kicker{ font-family:'Poppins'; font-weight:800; font-size:26px; color:#2f4cf0; margin-top:26px; letter-spacing:2px; }
      .profile{ font-family:'Poppins'; font-weight:500; font-size:38px; line-height:1.56; color:#111; text-align:center; }
      .profile b{ background:#ffe14d; padding:0 6px; font-weight:700; }
      .brand{ color:#111; font-weight:800; } .pageno{ color:#111; font-weight:800; }` },

    cover: { name: 'Magazine Cover', chip: '#d8a24a', bg: '#3d1219', arrow: '#d8a24a',
      graphic: `<div style="position:absolute;top:-120px;left:-40px;font-family:'Didot',serif;font-size:640px;color:rgba(216,162,74,.06);line-height:.8;">“</div>`,
      css: `
      .slide{ background:#3d1219; color:#efe4d3; }
      .kickline{ border-bottom:1px solid rgba(239,228,211,.28); padding-bottom:22px; margin-bottom:48px; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:20px; letter-spacing:6px; text-transform:uppercase; color:#d8a24a; }
      .hook{ font-family:'Laila','Didot',serif; font-weight:600; font-size:82px; line-height:1.36; color:#f4ecdd; letter-spacing:.2px; }
      .hook .lat{ font-family:'Didot',serif; font-weight:400; } .hook b{ color:#d8a24a; font-weight:700; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#c7b49a; margin-top:38px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#e6dac6; }
      .body b, .poem b{ color:#d8a24a; font-weight:600; }
      .body .num{ font-family:'Didot',serif; font-weight:700; font-size:44px; color:#d8a24a; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Didot',serif; font-weight:500; font-size:70px; line-height:1.62; color:#f4ecdd; text-align:center; }
      .bubble{ border:1.5px solid rgba(216,162,74,.5); border-radius:6px; padding:58px 54px; }
      .kicker{ font-family:'Laila'; font-weight:500; font-size:32px; color:#c7b49a; margin-top:32px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#e6dac6; text-align:center; }
      .profile b{ color:#d8a24a; font-weight:600; }
      .brand{ color:#9c7d52; } .pageno{ color:#b89a6a; }` },

    note: { name: 'Note to Self', chip: '#e0524b', bg: '#fbf9f2', arrow: '#e0524b',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(#e0524b,#e0524b);background-size:2px 100%;background-repeat:no-repeat;background-position:64px 0;"></div>`,
      css: `
      .slide{ background:#fbf9f2; color:#2a2a28; }
      .kickline .rule{ width:0; }
      .kickline .kt{ background:#e0524b; color:#fff; padding:7px 15px; font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:.5px; border-radius:3px; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:600; font-size:70px; line-height:1.26; color:#2a2a28; letter-spacing:-.5px; }
      .hook b{ color:#e0524b; font-weight:700; }
      .sub{ font-family:'Poppins'; font-weight:300; font-style:italic; font-size:31px; color:#6a675e; margin-top:34px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:47px; line-height:1.62; color:#3a3833; }
      .body b, .poem b{ color:#e0524b; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:700; font-size:32px; color:#e0524b; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:66px; line-height:1.62; color:#2a2a28; }
      .bubble{ border:1.5px solid #e2ddcf; border-radius:8px; padding:54px 50px; background:rgba(255,255,255,.5); }
      .kicker{ font-family:'Poppins'; font-weight:600; font-style:italic; font-size:28px; color:#e0524b; margin-top:30px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#3a3833; text-align:center; }
      .profile b{ color:#e0524b; font-weight:600; }
      .brand{ color:#b3ad9c; } .pageno{ color:#b3ad9c; }` },

    aura: { name: 'Soft Aura', chip: '#6b5cf0', bg: '#dae4ff', arrow: '#6b5cf0',
      graphic: `<div style="position:absolute;width:640px;height:640px;right:-160px;top:-160px;border-radius:50%;background:radial-gradient(closest-side,rgba(107,92,240,.16),transparent);"></div><div style="position:absolute;width:520px;height:520px;left:-140px;bottom:-160px;border-radius:50%;background:radial-gradient(closest-side,rgba(240,140,180,.14),transparent);"></div>`,
      css: `
      .slide{ background:radial-gradient(125% 95% at 18% 12%,#ffe3d0 0%,#f6d9ef 38%,#dae4ff 72%,#d6f0e7 100%); color:#34303a; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:600; font-size:84px; line-height:1.22; letter-spacing:-1px; color:#34303a; }
      .hook b{ color:#6b5cf0; font-weight:700; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:32px; color:#5f5a68; margin-top:36px; line-height:1.57; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:49px; line-height:1.56; color:#45414c; }
      .body b, .poem b{ color:#6b5cf0; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:700; font-size:34px; color:#6b5cf0; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:68px; line-height:1.62; color:#34303a; }
      .bubble{ background:rgba(255,255,255,.55); border-radius:22px; padding:58px 54px; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:29px; color:#6b5cf0; margin-top:30px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#45414c; text-align:center; }
      .profile b{ color:#6b5cf0; font-weight:600; }
      .brand{ color:#8a8494; } .pageno{ color:#7a7484; }
      .kickline .rule{ width:44px; height:2px; background:#6b5cf0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#6b5cf0; }` },

    /* ---------- the third wave (this session, Opus MAX) ---------- */
    blueprint: { name: 'Blueprint', chip: '#5cc8ff', bg: '#0e2f52', arrow: '#5cc8ff',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(120,180,230,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(120,180,230,.10) 1px,transparent 1px);background-size:64px 64px;"></div><div style="position:absolute;top:44px;left:44px;width:34px;height:34px;border-top:2px solid rgba(150,200,240,.5);border-left:2px solid rgba(150,200,240,.5);"></div><div style="position:absolute;top:44px;right:44px;width:34px;height:34px;border-top:2px solid rgba(150,200,240,.5);border-right:2px solid rgba(150,200,240,.5);"></div><div style="position:absolute;bottom:44px;left:44px;width:34px;height:34px;border-bottom:2px solid rgba(150,200,240,.5);border-left:2px solid rgba(150,200,240,.5);"></div><div style="position:absolute;bottom:44px;right:44px;width:34px;height:34px;border-bottom:2px solid rgba(150,200,240,.5);border-right:2px solid rgba(150,200,240,.5);"></div>`,
      css: `
      .slide{ background:#0e2f52; color:#cfe3f5; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:88px; line-height:1.2; letter-spacing:-1px; color:#eaf3fb; }
      .hook b{ color:#5cc8ff; }
      .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#5cc8ff; }
      .kickline .rule{ width:60px; height:1px; background:#5cc8ff; }
      .sub{ font-family:'Courier New',monospace; font-weight:400; font-size:28px; color:#9fc0dc; margin-top:34px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:47px; line-height:1.56; color:#dbe9f6; }
      .body b, .poem b{ color:#5cc8ff; font-weight:600; }
      .body .num{ display:block; font-family:'Courier New',monospace; font-weight:700; font-size:30px; color:#5cc8ff; margin-bottom:14px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:64px; line-height:1.62; color:#eaf3fb; }
      .bubble{ border:1.5px solid rgba(120,180,230,.5); border-radius:4px; padding:52px; background:rgba(10,40,70,.4); }
      .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; color:#5cc8ff; margin-top:26px; letter-spacing:1px; }
      .profile{ font-family:'Courier New',monospace; font-weight:400; font-size:36px; line-height:1.61; color:#dbe9f6; text-align:center; }
      .profile b{ color:#5cc8ff; font-weight:700; }
      .brand{ font-family:'Courier New',monospace; color:#7fa8ca; } .pageno{ font-family:'Courier New',monospace; color:#7fa8ca; }` },

    kraft: { name: 'Kraft & Stamp', chip: '#9a4a25', bg: '#c3a878', arrow: '#7a4a2a',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(90,60,30,.10) 1px,transparent 1.4px);background-size:9px 9px;"></div><div style="position:absolute;top:88px;right:88px;width:196px;height:196px;border:3px solid rgba(120,60,40,.32);border-radius:50%;transform:rotate(-12deg);"></div><div style="position:absolute;top:110px;right:110px;width:152px;height:152px;border:1.5px solid rgba(120,60,40,.28);border-radius:50%;transform:rotate(-12deg);"></div>`,
      css: `
      .slide{ background:#c3a878; color:#3a2e1c; }
      .hook{ font-family:'Rockwell','Poppins',serif; font-weight:700; font-size:82px; line-height:1.24; color:#33281a; }
      .hook b{ color:#9a4a25; }
      .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#7a4a2a; }
      .kickline .rule{ width:50px; height:2px; background:#7a4a2a; }
      .sub{ font-family:'Courier New',monospace; font-size:29px; color:#6a5638; margin-top:32px; line-height:1.56; }
      .body{ font-family:'Courier New',monospace; font-weight:400; font-size:44px; line-height:1.61; color:#40331f; }
      .body b, .poem b{ color:#9a4a25; font-weight:700; }
      .body .num{ display:block; font-family:'Rockwell',serif; font-weight:700; font-size:40px; color:#9a4a25; margin-bottom:14px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:64px; line-height:1.62; color:#33281a; }
      .bubble{ border:2px dashed rgba(120,60,40,.5); border-radius:6px; padding:52px; }
      .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; color:#9a4a25; margin-top:26px; }
      .profile{ font-family:'Courier New',monospace; font-weight:400; font-size:36px; line-height:1.61; color:#40331f; text-align:center; }
      .profile b{ color:#9a4a25; font-weight:700; }
      .brand{ color:#8a6f48; } .pageno{ color:#8a6f48; }` },

    garden: { name: 'Botanical', chip: '#9a7b3f', bg: '#eef1e6', arrow: '#9a7b3f',
      graphic: `<svg width="340" height="420" viewBox="0 0 100 124" style="position:absolute;top:-24px;right:8px;opacity:.28"><g fill="none" stroke="#9a7b3f" stroke-width="0.7"><path d="M62 122 C 58 84, 68 52, 82 16"/><path d="M64 100 C 52 96, 46 88, 44 78"/><ellipse cx="42" cy="77" rx="10" ry="4.4" transform="rotate(28 42 77)" fill="#9a7b3f" fill-opacity="0.22" stroke="none"/><path d="M68 78 C 80 74, 86 66, 88 56"/><ellipse cx="90" cy="55" rx="10" ry="4.4" transform="rotate(-28 90 55)" fill="#9a7b3f" fill-opacity="0.22" stroke="none"/><path d="M72 56 C 60 52, 54 44, 52 34"/><ellipse cx="50" cy="33" rx="9" ry="4" transform="rotate(30 50 33)" fill="#9a7b3f" fill-opacity="0.22" stroke="none"/><path d="M78 34 C 88 30, 92 24, 93 16"/><ellipse cx="95" cy="15" rx="8" ry="3.6" transform="rotate(-30 95 15)" fill="#9a7b3f" fill-opacity="0.22" stroke="none"/></g></svg>`,
      css: `
      .slide{ background:#eef1e6; color:#2f3a2c; }
      .hook{ font-family:'Baskerville','Laila',serif; font-weight:600; font-size:80px; line-height:1.34; color:#2b3527; }
      .hook b{ color:#9a7b3f; font-style:normal; }
      .kickline .kt{ font-family:'Baskerville',serif; font-weight:600; font-size:24px; letter-spacing:4px; text-transform:uppercase; color:#9a7b3f; font-style:italic; }
      .kickline .rule{ width:56px; height:1px; background:#9a7b3f; }
      .sub{ font-family:'Baskerville',serif; font-size:33px; color:#5f6b58; margin-top:34px; line-height:1.56; }
      .body{ font-family:'Baskerville','Laila',serif; font-weight:400; font-size:47px; line-height:1.61; color:#39432f; }
      .body b, .poem b{ color:#9a7b3f; font-weight:600; }
      .body .num{ font-family:'Baskerville',serif; font-weight:700; font-style:italic; font-size:42px; color:#9a7b3f; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Baskerville',serif; font-weight:500; font-size:66px; line-height:1.62; color:#2b3527; text-align:center; }
      .bubble{ border:1px solid #c7cbb8; border-radius:2px; padding:56px; }
      .kicker{ font-family:'Baskerville',serif; font-size:32px; color:#5f6b58; margin-top:30px; }
      .profile{ font-family:'Baskerville',serif; font-weight:400; font-size:38px; line-height:1.61; color:#39432f; text-align:center; }
      .profile b{ color:#9a7b3f; font-weight:600; }
      .brand{ color:#a3a893; } .pageno{ color:#a3a893; }` },

    press: { name: 'Newsprint', chip: '#8a1a1a', bg: '#f2efe6', arrow: '#8a1a1a',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(0,0,0,.16) 1px,transparent 1.3px);background-size:6px 6px;opacity:.28;"></div>`,
      css: `
      .slide{ background:#f2efe6; color:#1a1a1a; }
      .mid{ justify-content:flex-start; padding-top:30px; }
      .hook{ font-family:'Rockwell','Poppins',serif; font-weight:700; font-size:86px; line-height:1.14; letter-spacing:-1px; color:#111; border-bottom:4px solid #111; padding-bottom:26px; }
      .hook b{ color:#8a1a1a; }
      .kickline{ margin-bottom:14px; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Georgia',serif; font-weight:700; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#8a1a1a; }
      .sub{ font-family:'Georgia',serif; font-style:italic; font-size:30px; color:#444; margin-top:26px; line-height:1.56; }
      .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:45px; line-height:1.58; color:#222; border-top:1px solid #cbc6b8; padding-top:28px; }
      .body b, .poem b{ color:#8a1a1a; font-weight:700; }
      .body .num{ font-family:'Rockwell',serif; font-weight:700; font-size:32px; color:#8a1a1a; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:62px; line-height:1.62; color:#111; text-align:center; border-top:2px solid #111; border-bottom:2px solid #111; padding:38px 0; }
      .bubble{ border:3px double #111; padding:48px; }
      .kicker{ font-family:'Georgia',serif; font-style:italic; font-weight:700; font-size:26px; color:#8a1a1a; margin-top:26px; }
      .profile{ font-family:'Georgia',serif; font-weight:400; font-size:38px; line-height:1.61; color:#222; text-align:center; }
      .profile b{ color:#8a1a1a; font-weight:700; }
      .brand{ font-family:'Georgia',serif; color:#555; } .pageno{ font-family:'Georgia',serif; color:#555; }` },

    neon: { name: 'Neon Night', chip: '#00f0ff', bg: '#0a0a12', arrow: '#ff3df0',
      graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:420px;background:repeating-linear-gradient(90deg,rgba(0,240,255,.16) 0 2px,transparent 2px 74px);transform:perspective(300px) rotateX(62deg);transform-origin:bottom;opacity:.45;"></div><div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:repeating-linear-gradient(0deg,rgba(0,240,255,.14) 0 2px,transparent 2px 60px);transform:perspective(300px) rotateX(62deg);transform-origin:bottom;opacity:.4;"></div>`,
      css: `
      .slide{ background:radial-gradient(120% 80% at 50% 118%,#1a1030 0%,#0a0a12 62%); color:#d8d0ff; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:92px; line-height:1.18; letter-spacing:-1px; color:#ffffff; text-shadow:0 0 26px rgba(120,90,255,.6); }
      .hook b{ color:#00f0ff; text-shadow:0 0 26px rgba(0,240,255,.85); }
      .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#ff3df0; text-shadow:0 0 14px rgba(255,61,240,.7); }
      .kickline .rule{ width:56px; height:2px; background:#ff3df0; box-shadow:0 0 10px #ff3df0; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:31px; color:#a9a0d8; margin-top:34px; line-height:1.57; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.52; color:#cfc8f0; }
      .body b, .poem b{ color:#00f0ff; font-weight:600; text-shadow:0 0 14px rgba(0,240,255,.6); }
      .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:700; font-size:34px; color:#ff3df0; margin-bottom:14px; text-shadow:0 0 12px rgba(255,61,240,.7); }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:66px; line-height:1.62; color:#ffffff; text-shadow:0 0 20px rgba(120,90,255,.5); }
      .bubble{ border:1.5px solid rgba(0,240,255,.5); border-radius:8px; padding:54px; box-shadow:inset 0 0 30px rgba(0,240,255,.14); }
      .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#ff3df0; margin-top:26px; text-shadow:0 0 12px rgba(255,61,240,.6); }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#cfc8f0; text-align:center; }
      .profile b{ color:#00f0ff; font-weight:600; }
      .brand{ color:#6a5faa; } .pageno{ color:#6a5faa; }` },

    memphis: { name: 'Memphis Pop', chip: '#ff5b7f', bg: '#fbf4e7', arrow: '#1e1e24',
      graphic: `<svg viewBox="0 0 1080 1350" style="position:absolute;inset:0"><circle cx="126" cy="1150" r="28" fill="#3d7bff" fill-opacity="0.5"/><path d="M840 170 q30 -42 60 0 t60 0" stroke="#ff5b7f" stroke-width="9" fill="none" stroke-opacity="0.55"/><polygon points="980,1090 1024,1176 936,1176" fill="#ffcf3f" fill-opacity="0.6"/><g fill="#0bbfa6" fill-opacity="0.5"><circle cx="150" cy="210" r="9"/><circle cx="192" cy="210" r="9"/><circle cx="150" cy="252" r="9"/><circle cx="192" cy="252" r="9"/></g><rect x="900" y="1200" width="34" height="34" fill="#ff5b7f" fill-opacity="0.5" transform="rotate(18 917 1217)"/></svg>`,
      css: `
      .slide{ background:#fbf4e7; color:#1e1e24; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:92px; line-height:1.19; letter-spacing:-1px; color:#1e1e24; }
      .hook b{ color:#ff5b7f; }
      .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#0bbfa6; }
      .kickline .rule{ width:50px; height:4px; background:#ffcf3f; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:31px; color:#55555f; margin-top:32px; line-height:1.54; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:48px; line-height:1.56; color:#28282f; }
      .body b, .poem b{ color:#ff5b7f; font-weight:700; }
      .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:700; font-size:36px; color:#3d7bff; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:64px; line-height:1.62; color:#1e1e24; }
      .bubble{ border:4px solid #1e1e24; border-radius:16px; padding:50px; background:#fff7ea; }
      .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#0bbfa6; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.56; color:#28282f; text-align:center; }
      .profile b{ color:#ff5b7f; font-weight:700; }
      .brand{ color:#a9a49a; } .pageno{ color:#1e1e24; font-weight:700; }` },

    marble: { name: 'Marble Luxe', chip: '#a8863f', bg: '#f4f2ec', arrow: '#a8863f',
      graphic: `<svg style="position:absolute;inset:0" width="1080" height="1350" viewBox="0 0 1080 1350" preserveAspectRatio="none" fill="none"><g stroke="#c6bfae" stroke-linecap="round"><path d="M-40 300 C 260 258, 470 420, 700 366 S 1000 322, 1120 372" stroke-width="1.4" opacity=".65"/><path d="M300 322 C 380 356, 420 420, 452 505" stroke-width=".9" opacity=".45"/><path d="M700 366 C 740 420, 730 500, 760 560" stroke-width=".8" opacity=".38"/><path d="M-40 980 C 320 1060, 660 900, 1120 1030" stroke-width="1.2" opacity=".55"/><path d="M420 1002 C 480 1050, 500 1110, 540 1180" stroke-width=".8" opacity=".38"/><path d="M760 -30 C 800 220, 720 430, 830 700 S 860 1000, 812 1180" stroke-width="1" opacity=".42"/></g><!-- single gold hairline vein — the signature --><path d="M-40 316 C 270 272, 470 436, 700 380 S 1000 336, 1120 386" stroke="#a8863f" stroke-width=".7" opacity=".4"/></svg>`,
      css: `
      .slide{ background:#f6f4ee; color:#26241f; }
      .hook{ font-family:'Didot','Laila',serif; font-weight:600; font-size:88px; line-height:1.36; color:#1f1d18; letter-spacing:.3px; font-style:normal; }
      .hook b{ color:#a8863f; }
      .kickline .kt{ font-family:'Didot',serif; font-weight:400; font-size:24px; letter-spacing:6px; text-transform:uppercase; color:#5c584e; }
      .kickline .rule{ width:56px; height:1px; background:#a8863f; }
      .sub{ font-family:'Didot',serif; font-size:33px; color:#5c584e; margin-top:34px; line-height:1.56; }
      .body{ font-family:'Baskerville','Laila',serif; font-weight:400; font-size:47px; line-height:1.61; color:#33302a; }
      .body b, .poem b{ color:#a8863f; font-weight:600; }
      .body .num{ font-family:'Didot',serif; font-weight:700; font-size:44px; color:#a8863f; display:block; margin-bottom:12px; }
      .poem{ font-family:'Laila','Didot',serif; font-weight:500; font-size:66px; line-height:1.62; color:#1f1d18; text-align:center; font-style:normal; }
      .bubble{ border:1px solid #cdbf9a; border-radius:2px; padding:56px; }
      .kicker{ font-family:'Didot',serif; font-size:32px; color:#5c584e; margin-top:30px; }
      .profile{ font-family:'Didot',serif; font-weight:400; font-size:38px; line-height:1.61; color:#33302a; text-align:center; }
      .profile b{ color:#a8863f; font-weight:600; }
      .brand{ color:#a49d8c; } .pageno{ color:#a49d8c; }` },

    chalk: { name: 'Chalkboard', chip: '#ffe08a', bg: '#24332d', arrow: '#ffe08a',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1.5px);background-size:6px 6px;opacity:.4;"></div>`,
      css: `
      .slide{ background:#24332d; color:#e8e6dd; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:600; font-size:68px; line-height:1.36; color:#f3f1e8; letter-spacing:-0.2px; }
      .hook b{ color:#ffe08a; font-weight:700; }
      .kickline .kt{ font-family:'Poppins',sans-serif; font-weight:650; font-size:22px; letter-spacing:.18em; text-transform:uppercase; color:#ffe08a; }
      .kickline .rule{ width:56px; height:2px; background:#ffe08a; border-radius:2px; }
      .sub{ font-family:'Poppins',sans-serif; font-weight:350; font-size:28px; color:#c7d0be; margin-top:32px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:350; font-size:44px; line-height:1.6; color:#dcdcd0; }
      .body b, .poem b{ color:#ffe08a; font-weight:600; }
      .body .num{ display:inline-block; font-family:'Poppins',sans-serif; font-weight:700; font-size:32px; color:#ffe08a; margin-bottom:8px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:60px; line-height:1.64; color:#f3f1e8; }
      .bubble{ border:1.5px solid rgba(255,255,255,.2); border-radius:12px; padding:48px 52px; background:rgba(255,255,255,.02); }
      .kicker{ font-family:'Poppins',sans-serif; font-weight:600; font-size:24px; color:#ffe08a; margin-top:28px; }
      .profile{ font-family:'Poppins',sans-serif; font-weight:350; font-size:36px; line-height:1.6; color:#dcdcd0; text-align:center; }
      .profile b{ color:#ffe08a; font-weight:600; }
      .brand{ color:#8a9382; letter-spacing:2px; } .pageno{ color:#8a9382; }` },

    slate: { name: 'Slate & Chalk', chip: '#ffe08a', bg: '#24332d', arrow: '#ffe08a',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(237,240,231,.04) 1px,transparent 1px);background-size:100% 56px;opacity:.5;"></div>`,
      css: `
      .slide{ background:#24332d; color:#d6dbd1; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:550; font-size:68px; line-height:1.36; letter-spacing:.2px; color:#edf0e7; }
      .hook b{ color:#ffe08a; font-weight:650; }
      .kickline .kt{ font-family:'Poppins',sans-serif; font-weight:600; font-size:21px; letter-spacing:.2em; text-transform:uppercase; color:#ffe08a; }
      .kickline .rule{ width:56px; height:2px; background:#ffe08a; border-radius:2px; }
      .sub{ font-family:'Poppins',sans-serif; font-weight:300; font-size:28px; color:#9fb0a5; margin-top:32px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#d6dbd1; letter-spacing:.3px; }
      .body b, .poem b{ color:#ffe08a; font-weight:600; }
      .body .num{ font-family:'Poppins',sans-serif; font-weight:600; font-size:27px; color:#edf0e7; border:2px solid rgba(237,240,231,.5); border-radius:50%; width:56px; height:56px; display:inline-flex; align-items:center; justify-content:center; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f2f4ec; }
      .bubble{ border:2px dashed rgba(237,240,231,.30); border-radius:10px; padding:52px 54px; }
      .kicker{ font-family:'Laila',serif; font-weight:500; font-size:28px; color:#9fb0a5; margin-top:32px; }
      .profile{ font-family:'Poppins',sans-serif; font-weight:300; font-size:36px; line-height:1.6; color:#d6dbd1; text-align:center; }
      .profile b{ color:#edf0e7; font-weight:600; }
      .brand{ color:#728279; letter-spacing:2px; } .pageno{ color:#728279; }` },

    zen: { name: 'Ensō Zen', chip: '#b23a2e', bg: '#f6f3ec', arrow: '#b23a2e',
      graphic: `<svg viewBox="0 0 100 100" style="position:absolute;top:50%;left:50%;width:840px;height:840px;transform:translate(-50%,-50%);opacity:.08"><path d="M74 28 A 33 33 0 1 0 80 62" fill="none" stroke="#26221c" stroke-width="7" stroke-linecap="round"/></svg><div style="position:absolute;bottom:104px;right:98px;width:60px;height:60px;background:#b23a2e;opacity:.82;border-radius:4px;"></div>`,
      css: `
      .slide{ background:#f6f3ec; color:#2a2620; }
      .mid{ justify-content:center; }
      .hook{ font-family:'Hoefler Text','Laila',serif; font-weight:500; font-size:78px; line-height:1.46; color:#26221c; text-align:center; }
      .hook b{ color:#b23a2e; }
      .kickline{ justify-content:center; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Hoefler Text',serif; font-weight:500; font-size:22px; letter-spacing:6px; text-transform:uppercase; color:#9a9284; }
      .sub{ font-family:'Hoefler Text',serif; font-style:italic; font-size:32px; color:#6b6455; margin-top:34px; line-height:1.56; text-align:center; }
      .body{ font-family:'Hoefler Text','Laila',serif; font-weight:400; font-size:48px; line-height:1.66; color:#332e26; text-align:center; }
      .body b, .poem b{ color:#b23a2e; font-weight:600; }
      .poem{ font-family:'Laila','Hoefler Text',serif; font-weight:500; font-size:68px; line-height:1.62; color:#26221c; text-align:center; }
      .bubble{ border:1px solid #d8d1c2; border-radius:2px; padding:56px; }
      .kicker{ font-family:'Hoefler Text',serif; font-style:italic; font-size:32px; color:#6b6455; margin-top:30px; text-align:center; }
      .profile{ font-family:'Hoefler Text',serif; font-weight:400; font-size:38px; line-height:1.61; color:#332e26; text-align:center; }
      .profile b{ color:#b23a2e; font-weight:600; }
      .brand{ color:#a7a08f; } .pageno{ color:#a7a08f; }` },

    bauhaus: { name: 'Bauhaus', chip: '#d1341f', bg: '#efe9dd', arrow: '#161616',
      graphic: `<svg viewBox="0 0 1080 1350" style="position:absolute;inset:0"><circle cx="70" cy="130" r="150" fill="#d1341f" fill-opacity="0.13"/><path d="M1080 1350 L1080 1090 L850 1350 Z" fill="#1c50b0" fill-opacity="0.13"/><path d="M1080 130 A150 150 0 0 0 930 280 L1080 280 Z" fill="#f2b400" fill-opacity="0.18"/></svg>`,
      css: `
      .slide{ background:#efe9dd; color:#1a1a1a; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:90px; line-height:1.18; letter-spacing:-1px; color:#161616; }
      .hook b{ color:#d1341f; }
      .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#1c50b0; }
      .kickline .rule{ width:50px; height:4px; background:#f2b400; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:31px; color:#4a4a4a; margin-top:32px; line-height:1.54; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:48px; line-height:1.56; color:#242424; }
      .body b, .poem b{ color:#d1341f; font-weight:700; }
      .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:700; font-size:36px; color:#1c50b0; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:64px; line-height:1.62; color:#161616; }
      .bubble{ border:0; border-radius:0; padding:52px; background:#1a1a1a; color:#efe9dd; }
      .bubble .body{ color:#efe9dd; } .bubble b{ color:#f2b400; }
      .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#1c50b0; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.56; color:#242424; text-align:center; }
      .profile b{ color:#d1341f; font-weight:700; }
      .brand{ color:#9a958a; } .pageno{ color:#161616; font-weight:700; }` },

    journal: { name: 'Journal', chip: '#c9603f', bg: '#fcfaf2', arrow: '#c9603f',
      graphic: `<div style="position:absolute;inset:0;background-image:repeating-linear-gradient(transparent,transparent 62px,#e7e2d2 62px,#e7e2d2 63px);"></div><div style="position:absolute;top:70px;left:50%;transform:translateX(-50%) rotate(-3deg);width:220px;height:50px;background:rgba(180,200,160,.4);"></div>`,
      css: `
      .slide{ background:#fcfaf2; color:#33302a; }
      .hook{ font-family:'Bradley Hand','Poppins',cursive; font-weight:700; font-size:90px; line-height:1.22; color:#2c2924; }
      .hook b{ color:#c9603f; }
      .kickline .kt{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:30px; letter-spacing:1px; color:#c9603f; }
      .kickline .rule{ width:0; }
      .sub{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:36px; color:#6a655a; margin-top:28px; line-height:1.52; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:46px; line-height:1.64; color:#3a362e; }
      .body b, .poem b{ color:#c9603f; font-weight:600; }
      .body .num{ display:block; font-family:'Bradley Hand',cursive; font-weight:700; font-size:48px; color:#c9603f; margin-bottom:8px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:64px; line-height:1.62; color:#2c2924; }
      .bubble{ border:2px solid #d8d0bc; border-radius:10px; padding:52px; background:rgba(255,255,255,.5); }
      .kicker{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:34px; color:#c9603f; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#3a362e; text-align:center; }
      .profile b{ color:#c9603f; font-weight:600; }
      .brand{ color:#b0aa99; } .pageno{ color:#b0aa99; }` },

    sunrise: { name: 'Sunrise', chip: '#c23b2b', bg: '#ffb27a', arrow: '#c23b2b',
      graphic: `<div style="position:absolute;left:50%;bottom:-280px;transform:translateX(-50%);width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,#fff3d6 0%,rgba(255,243,214,.55) 38%,transparent 70%);"></div>`,
      css: `
      .slide{ background:linear-gradient(180deg,#ffd9a0 0%,#ffb27a 45%,#ff8f6b 100%); color:#4a2318; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:700; font-size:86px; line-height:1.22; letter-spacing:-1px; color:#5a2a1a; }
      .hook b{ color:#c23b2b; }
      .kickline .kt{ font-family:'Poppins',sans-serif; font-weight:700; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#c23b2b; }
      .kickline .rule{ width:52px; height:3px; background:#c23b2b; border-radius:2px; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:32px; color:#7a3d28; margin-top:32px; line-height:1.57; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.56; color:#54291b; }
      .body b, .poem b{ color:#c23b2b; font-weight:600; }
      .body .num{ display:block; font-family:'Poppins',sans-serif; font-weight:800; font-size:34px; color:#c23b2b; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:66px; line-height:1.62; color:#4a2318; }
      .bubble{ border:1.5px solid rgba(90,42,26,.3); border-radius:18px; padding:54px; background:rgba(255,240,215,.4); }
      .kicker{ font-family:'Poppins',sans-serif; font-weight:600; font-size:28px; color:#c23b2b; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.61; color:#54291b; text-align:center; }
      .profile b{ color:#c23b2b; font-weight:600; }
      .brand{ color:#9a5a44; } .pageno{ color:#8a4a34; }` },

    /* ---------- fourth wave ---------- */
    transit: { name: 'Transit Sign', chip: '#f5a623', bg: '#232326', arrow: '#f5a623',
      graphic: `<div style="position:absolute;top:78px;left:88px;width:92px;height:92px;border-radius:50%;background:#f5a623;display:flex;align-items:center;justify-content:center;font-family:'Futura';font-weight:800;font-size:50px;color:#232326;">&#8594;</div><div style="position:absolute;right:-30px;bottom:120px;font-family:'Futura';font-weight:800;font-size:340px;color:rgba(245,166,35,.06);line-height:.7;">&#8599;</div>`,
      css: `
      .slide{ background:#232326; color:#f2f2ef; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:94px; line-height:1.18; letter-spacing:-1px; color:#fff; }
      .hook b{ color:#f5a623; }
      .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#f5a623; }
      .kickline .rule{ width:56px; height:4px; background:#f5a623; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#a7a7a2; margin-top:34px; line-height:1.54; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:49px; line-height:1.56; color:#e2e2dd; }
      .body b, .poem b{ color:#f5a623; font-weight:700; }
      .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:800; font-size:36px; color:#f5a623; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:66px; line-height:1.62; color:#fff; }
      .bubble{ border:3px solid #f5a623; border-radius:8px; padding:52px; }
      .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#f5a623; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.56; color:#e2e2dd; text-align:center; } .profile b{ color:#f5a623; font-weight:700; }
      .brand{ color:#7a7a76; } .pageno{ color:#f5a623; font-weight:700; }` },

    vapor: { name: 'Vaporwave', chip: '#5ffbf1', bg: '#5b2a8c', arrow: '#5ffbf1',
      graphic: `<div style="position:absolute;left:50%;top:220px;transform:translateX(-50%);width:420px;height:420px;border-radius:50%;background:linear-gradient(180deg,#ffe15a,#ff5f8f);opacity:.45;"></div><div style="position:absolute;left:0;right:0;bottom:0;height:360px;background:repeating-linear-gradient(90deg,rgba(95,251,241,.28) 0 2px,transparent 2px 60px);transform:perspective(280px) rotateX(66deg);transform-origin:bottom;opacity:.5;"></div>`,
      css: `
      .slide{ background:linear-gradient(180deg,#2a1758 0%,#5b2a8c 42%,#c9418f 78%,#f0857d 100%); color:#fdf0ff; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:90px; line-height:1.2; color:#fff; text-shadow:0 0 22px rgba(95,251,241,.5),2px 2px 0 rgba(255,60,160,.5); }
      .hook b{ color:#5ffbf1; }
      .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:6px; text-transform:uppercase; color:#5ffbf1; }
      .kickline .rule{ width:56px; height:2px; background:#5ffbf1; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:31px; color:#f0d0f5; margin-top:34px; line-height:1.54; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.52; color:#f6e6fb; }
      .body b, .poem b{ color:#5ffbf1; font-weight:600; }
      .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:700; font-size:34px; color:#ffe15a; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:66px; line-height:1.62; color:#fff; text-shadow:0 0 18px rgba(95,251,241,.4); }
      .bubble{ border:1.5px solid rgba(95,251,241,.5); border-radius:10px; padding:52px; background:rgba(40,10,60,.3); }
      .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#ffe15a; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.56; color:#f6e6fb; text-align:center; } .profile b{ color:#5ffbf1; font-weight:600; }
      .brand{ color:#c79fd6; } .pageno{ color:#f0d0f5; }` },

    letterpress: { name: 'Letterpress', chip: '#7c5a2a', bg: '#e9e3d5', arrow: '#7c5a2a',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(90,70,40,.05) 1px,transparent 1.3px);background-size:8px 8px;"></div><div style="position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:130px;height:1px;background:#9a8a6a;"></div><div style="position:absolute;left:50%;bottom:145px;transform:translateX(-50%);width:9px;height:9px;background:#9a8a6a;border-radius:50%;"></div>`,
      css: `
      .slide{ background:#e9e3d5; color:#3a3229; }
      .hook{ font-family:'Baskerville','Laila',serif; font-weight:600; font-size:80px; line-height:1.34; color:#2e281f; text-shadow:0 1px 0 rgba(255,255,255,.6),0 -1px 0 rgba(0,0,0,.1); }
      .hook b{ color:#7c5a2a; }
      .kickline .kt{ font-family:'Copperplate','Baskerville',serif; font-weight:600; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#7c5a2a; }
      .kickline .rule{ width:56px; height:1px; background:#7c5a2a; }
      .sub{ font-family:'Baskerville',serif; font-style:italic; font-size:33px; color:#645a48; margin-top:32px; line-height:1.56; }
      .body{ font-family:'Baskerville','Laila',serif; font-weight:400; font-size:47px; line-height:1.62; color:#3a3229; text-shadow:0 1px 0 rgba(255,255,255,.5); }
      .body b, .poem b{ color:#7c5a2a; font-weight:600; }
      .poem{ font-family:'Laila','Baskerville',serif; font-weight:500; font-size:66px; line-height:1.62; color:#2e281f; text-align:center; }
      .bubble{ border:1px solid #c3b79d; border-radius:2px; padding:56px; }
      .kicker{ font-family:'Baskerville',serif; font-style:italic; font-size:32px; color:#645a48; margin-top:30px; }
      .profile{ font-family:'Baskerville',serif; font-weight:400; font-size:38px; line-height:1.56; color:#3a3229; text-align:center; } .profile b{ color:#7c5a2a; font-weight:600; }
      .brand{ color:#a89c82; } .pageno{ color:#a89c82; }` },

    woodcut: { name: 'Woodcut', chip: '#b0301f', bg: '#efe6d0', arrow: '#b0301f',
      graphic: `<div style="position:absolute;inset:0;background-image:repeating-linear-gradient(92deg,rgba(26,23,18,.05) 0 3px,transparent 3px 12px);"></div>`,
      css: `
      .slide{ background:#efe6d0; color:#1a1712; }
      .hook{ font-family:'Rockwell','Poppins',serif; font-weight:700; font-size:86px; line-height:1.22; color:#1a1712; letter-spacing:-.5px; }
      .hook b{ color:#b0301f; }
      .kickline .kt{ font-family:'Rockwell',serif; font-weight:700; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#b0301f; }
      .kickline .rule{ width:54px; height:3px; background:#1a1712; }
      .sub{ font-family:'Rockwell',serif; font-size:30px; color:#5a5344; margin-top:30px; line-height:1.56; }
      .body{ font-family:'Rockwell','Laila',serif; font-weight:400; font-size:46px; line-height:1.56; color:#2a2519; }
      .body b, .poem b{ color:#b0301f; font-weight:700; }
      .body .num{ display:block; font-family:'Rockwell',serif; font-weight:700; font-size:36px; color:#b0301f; margin-bottom:12px; }
      .poem{ font-family:'Laila','Rockwell',serif; font-weight:500; font-size:64px; line-height:1.62; color:#1a1712; }
      .bubble{ border:3px solid #1a1712; border-radius:0; padding:50px; }
      .kicker{ font-family:'Rockwell',serif; font-weight:700; font-size:26px; color:#b0301f; margin-top:26px; }
      .profile{ font-family:'Rockwell',serif; font-weight:400; font-size:38px; line-height:1.56; color:#2a2519; text-align:center; } .profile b{ color:#b0301f; font-weight:700; }
      .brand{ color:#8a8168; } .pageno{ color:#1a1712; font-weight:700; }` },

    data: { name: 'Data Viz', chip: '#0a7cff', bg: '#fbfbfa', arrow: '#0a7cff',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(20,20,30,.03) 1px,transparent 1px);background-size:100% 72px;"></div><svg viewBox="0 0 1080 1350" style="position:absolute;inset:0"><g fill="#0a7cff" fill-opacity="0.08"><rect x="110" y="1012" width="60" height="118"/><rect x="200" y="960" width="60" height="170"/><rect x="290" y="1048" width="60" height="82"/><rect x="380" y="922" width="60" height="208"/><rect x="470" y="990" width="60" height="140"/></g></svg>`,
      css: `
      .slide{ background:#fbfbfa; color:#1c1c22; }
      .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:80px; line-height:1.22; letter-spacing:-1px; color:#16161c; }
      .hook b{ color:#0a7cff; }
      .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:21px; letter-spacing:2px; text-transform:uppercase; color:#0a7cff; }
      .kickline .rule{ width:56px; height:2px; background:#0a7cff; }
      .sub{ font-family:'Courier New',monospace; font-size:27px; color:#5a5a64; margin-top:32px; line-height:1.56; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:46px; line-height:1.56; color:#2a2a32; }
      .body b, .poem b{ color:#0a7cff; font-weight:600; }
      .body .num{ display:block; font-family:'Courier New',monospace; font-weight:700; font-size:28px; color:#0a7cff; margin-bottom:12px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:62px; line-height:1.62; color:#16161c; }
      .bubble{ border:1.5px solid #d3d3da; border-radius:6px; padding:52px; }
      .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:23px; color:#0a7cff; margin-top:26px; }
      .profile{ font-family:'Courier New',monospace; font-weight:400; font-size:36px; line-height:1.56; color:#2a2a32; text-align:center; } .profile b{ color:#0a7cff; font-weight:700; }
      .brand{ font-family:'Courier New',monospace; color:#9a9aa4; } .pageno{ font-family:'Courier New',monospace; color:#9a9aa4; }` },

    deco: { name: 'Art Deco', chip: '#c8a24a', bg: '#141414', arrow: '#c8a24a',
      graphic: `<svg viewBox="0 0 1080 1350" style="position:absolute;inset:0"><g stroke="#c8a24a" stroke-opacity="0.32" stroke-width="2" fill="none"><path d="M540 58 L432 200 M540 58 L486 212 M540 58 L540 224 M540 58 L594 212 M540 58 L648 200"/><path d="M540 1292 L432 1150 M540 1292 L486 1138 M540 1292 L540 1126 M540 1292 L594 1138 M540 1292 L648 1150"/></g></svg>`,
      css: `
      .slide{ background:#141414; color:#efe6cf; }
      .mid{ justify-content:center; }
      .hook{ font-family:'Didot','Laila',serif; font-weight:600; font-size:80px; line-height:1.34; color:#f4ecd6; letter-spacing:.5px; text-align:center; }
      .hook b{ color:#c8a24a; }
      .kickline{ justify-content:center; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Copperplate','Didot',serif; font-weight:600; font-size:22px; letter-spacing:6px; text-transform:uppercase; color:#c8a24a; }
      .sub{ font-family:'Didot',serif; font-style:italic; font-size:32px; color:#b3a988; margin-top:32px; line-height:1.56; text-align:center; }
      .body{ font-family:'Didot','Laila',serif; font-weight:400; font-size:47px; line-height:1.61; color:#e6dcc2; text-align:center; }
      .body b, .poem b{ color:#c8a24a; font-weight:600; }
      .poem{ font-family:'Laila','Didot',serif; font-weight:500; font-size:66px; line-height:1.62; color:#f4ecd6; text-align:center; }
      .bubble{ border:1px solid #6a5a30; border-radius:0; padding:56px; }
      .kicker{ font-family:'Didot',serif; font-style:italic; font-size:32px; color:#b3a988; margin-top:30px; text-align:center; }
      .profile{ font-family:'Didot',serif; font-weight:400; font-size:38px; line-height:1.56; color:#e6dcc2; text-align:center; } .profile b{ color:#c8a24a; font-weight:600; }
      .brand{ color:#8a7a4e; } .pageno{ color:#a8955e; }` },

    tape: { name: 'Tape Collage', chip: '#c9603f', bg: '#e6ddc9', arrow: '#c9603f',
      graphic: `<div style="position:absolute;top:168px;left:56px;right:56px;bottom:200px;background:#fffdf6;box-shadow:0 6px 22px rgba(0,0,0,.12);transform:rotate(-.5deg);"></div><div style="position:absolute;top:150px;left:200px;width:180px;height:44px;background:rgba(200,180,120,.5);transform:rotate(-4deg);"></div><div style="position:absolute;top:150px;right:200px;width:180px;height:44px;background:rgba(150,190,170,.5);transform:rotate(3deg);"></div>`,
      css: `
      .slide{ background:#e6ddc9; color:#33302a; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:700; font-size:78px; line-height:1.24; color:#2c2924; }
      .hook b{ color:#c9603f; }
      .kickline .kt{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:30px; color:#c9603f; } .kickline .rule{ width:0; }
      .sub{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:34px; color:#6a655a; margin-top:28px; line-height:1.52; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:45px; line-height:1.61; color:#3a362e; }
      .body b, .poem b{ color:#c9603f; font-weight:600; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:63px; line-height:1.62; color:#2c2924; }
      .bubble{ background:#fff; border:1px solid #e0d8c4; border-radius:2px; padding:50px; box-shadow:4px 4px 0 rgba(0,0,0,.07); }
      .kicker{ font-family:'Bradley Hand',cursive; font-weight:700; font-size:32px; color:#c9603f; margin-top:26px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.56; color:#3a362e; text-align:center; } .profile b{ color:#c9603f; font-weight:600; }
      .brand{ color:#a89e86; } .pageno{ color:#a89e86; }` },

    /* ---------- fifth wave ---------- */
    terminal: { name: 'Terminal', chip: '#35d07f', bg: '#0b1410', arrow: '#35d07f',
      graphic: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(53,208,127,.04) 0 2px,transparent 2px 5px);"></div><div style="position:absolute;top:82px;left:88px;font-family:'Courier New';font-weight:700;font-size:30px;color:#35d07f;">&gt;_</div>`,
      css: `.slide{ background:#0b1410; color:#7fe6a8; } .hook{ font-family:'Courier New',monospace; font-weight:700; font-size:76px; line-height:1.28; color:#d6ffe6; } .hook b{ color:#35d07f; } .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:2px; color:#35d07f; } .kickline .rule{ width:40px; height:2px; background:#35d07f; } .sub{ font-family:'Courier New',monospace; font-size:28px; color:#5a9c74; margin-top:30px; line-height:1.56; } .body{ font-family:'Courier New',monospace; font-weight:400; font-size:42px; line-height:1.58; color:#a9e6c2; } .body b, .poem b{ color:#35d07f; font-weight:700; } .body .num{ display:block; font-family:'Courier New',monospace; font-weight:700; font-size:30px; color:#35d07f; margin-bottom:12px; } .poem{ font-family:'Laila','Courier New',serif; font-weight:400; font-size:62px; line-height:1.62; color:#d6ffe6; } .bubble{ border:1.5px solid #2a5c3f; border-radius:4px; padding:50px; background:rgba(20,50,35,.4); } .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; color:#35d07f; margin-top:24px; } .profile{ font-family:'Courier New',monospace; font-size:36px; color:#a9e6c2; text-align:center; } .profile b{ color:#35d07f; } .brand{ font-family:'Courier New',monospace; color:#4a7c5e; } .pageno{ font-family:'Courier New',monospace; color:#4a7c5e; }` },

    manuscript: { name: 'Manuscript', chip: '#a01e1e', bg: '#ece0c4', arrow: '#a01e1e',
      graphic: `<div style="position:absolute;top:52px;left:52px;right:52px;bottom:52px;border:1px solid rgba(176,141,63,.5);"></div><div style="position:absolute;top:44px;left:44px;right:44px;bottom:44px;border:2px solid rgba(160,30,30,.3);"></div>`,
      css: `.slide{ background:#ece0c4; color:#3a2f1e; } .hook{ font-family:'Hoefler Text','Laila',serif; font-weight:600; font-size:76px; line-height:1.36; color:#2e2413; } .hook b{ color:#a01e1e; } .kickline .kt{ font-family:'Hoefler Text',serif; font-weight:600; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#a01e1e; } .kickline .rule{ width:50px; height:2px; background:#b08d3f; } .sub{ font-family:'Hoefler Text',serif; font-style:italic; font-size:32px; color:#6a5a3a; margin-top:32px; line-height:1.56; } .body{ font-family:'Hoefler Text','Laila',serif; font-weight:400; font-size:46px; line-height:1.62; color:#3a2f1e; } .body b, .poem b{ color:#a01e1e; font-weight:600; } .poem{ font-family:'Laila','Hoefler Text',serif; font-weight:500; font-size:66px; line-height:1.62; color:#2e2413; text-align:center; } .bubble{ border:2px solid #b08d3f; border-radius:2px; padding:54px; } .kicker{ font-family:'Hoefler Text',serif; font-style:italic; font-size:32px; color:#6a5a3a; margin-top:30px; } .profile{ font-family:'Hoefler Text',serif; font-size:38px; color:#3a2f1e; text-align:center; } .profile b{ color:#a01e1e; } .brand{ color:#a39268; } .pageno{ color:#a39268; }` },

    noir: { name: 'Film Noir', chip: '#c62828', bg: '#0d0d0d', arrow: '#c62828',
      graphic: `<div style="position:absolute;top:-100px;right:-100px;width:700px;height:1600px;background:linear-gradient(120deg,transparent,rgba(255,255,255,.045),transparent);transform:rotate(20deg);"></div>`,
      css: `.slide{ background:#0d0d0d; color:#e8e8e8; } .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:700; font-size:90px; line-height:1.3; letter-spacing:-1px; color:#fff; } .hook b{ color:#c62828; } .kickline .kt{ font-family:'Futura',sans-serif; font-weight:700; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#9a9a9a; } .kickline .rule{ width:56px; height:2px; background:#c62828; } .sub{ font-family:'Poppins'; font-weight:300; font-size:32px; color:#8a8a8a; margin-top:34px; line-height:1.57; } .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.56; color:#cfcfcf; } .body b, .poem b{ color:#fff; font-weight:600; } .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.62; color:#fff; } .bubble{ border-left:5px solid #c62828; padding:40px 50px; background:#161616; } .kicker{ font-family:'Futura',sans-serif; font-weight:700; font-size:26px; color:#c62828; margin-top:26px; letter-spacing:2px; } .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; color:#cfcfcf; text-align:center; } .profile b{ color:#fff; } .brand{ color:#5a5a5a; } .pageno{ color:#5a5a5a; }` },

    oracle: { name: 'Oracle', chip: '#d9b45c', bg: '#16123a', arrow: '#d9b45c',
      graphic: `<svg viewBox="0 0 1080 1350" style="position:absolute;inset:0"><circle cx="540" cy="230" r="90" fill="none" stroke="#d9b45c" stroke-opacity="0.32" stroke-width="1.5"/><g fill="#d9b45c" fill-opacity="0.5"><circle cx="200" cy="180" r="3"/><circle cx="880" cy="300" r="3"/><circle cx="300" cy="1100" r="3"/><circle cx="820" cy="1150" r="3"/><circle cx="160" cy="700" r="2"/><circle cx="920" cy="800" r="2"/></g></svg>`,
      css: `.slide{ background:radial-gradient(120% 90% at 50% 15%,#241d5a,#100d2c 70%); color:#e6ddf5; } .mid{ justify-content:center; } .hook{ font-family:'Didot','Laila',serif; font-weight:500; font-size:78px; line-height:1.44; color:#f2ecff; text-align:center; } .hook b{ color:#d9b45c; } .kickline{ justify-content:center; } .kickline .rule{ width:0; } .kickline .kt{ font-family:'Didot',serif; font-weight:400; font-size:22px; letter-spacing:6px; text-transform:uppercase; color:#d9b45c; } .sub{ font-family:'Didot',serif; font-style:italic; font-size:32px; color:#b0a6d0; margin-top:32px; line-height:1.56; text-align:center; } .body{ font-family:'Didot','Laila',serif; font-weight:400; font-size:47px; line-height:1.61; color:#d8cfee; text-align:center; } .body b, .poem b{ color:#d9b45c; font-weight:600; } .poem{ font-family:'Laila','Didot',serif; font-weight:500; font-size:66px; line-height:1.62; color:#f2ecff; text-align:center; } .bubble{ border:1px solid rgba(217,180,92,.4); border-radius:4px; padding:54px; } .kicker{ font-family:'Didot',serif; font-style:italic; font-size:32px; color:#b0a6d0; margin-top:30px; text-align:center; } .profile{ font-family:'Didot',serif; font-size:38px; color:#d8cfee; text-align:center; } .profile b{ color:#d9b45c; } .brand{ color:#7a6fa0; } .pageno{ color:#9a8fc0; }` },

    ledger: { name: 'Ledger', chip: '#c0392b', bg: '#f4f7f3', arrow: '#c0392b',
      graphic: `<div style="position:absolute;inset:0;background-image:linear-gradient(rgba(60,110,80,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(60,110,80,.07) 1px,transparent 1px);background-size:40px 40px;"></div><div style="position:absolute;left:120px;top:0;bottom:0;width:2px;background:rgba(192,57,43,.4);"></div>`,
      css: `.slide{ background:#f4f7f3; color:#1f2a24; } .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:700; font-size:74px; line-height:1.24; color:#182019; letter-spacing:-.5px; } .hook b{ color:#c0392b; } .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:21px; letter-spacing:2px; text-transform:uppercase; color:#2c5f8a; } .kickline .rule{ width:50px; height:2px; background:#c0392b; } .sub{ font-family:'Courier New',monospace; font-size:28px; color:#5a6a5e; margin-top:30px; line-height:1.56; } .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:46px; line-height:1.56; color:#28332b; } .body b, .poem b{ color:#c0392b; font-weight:600; } .body .num{ display:block; font-family:'Courier New',monospace; font-weight:700; font-size:30px; color:#2c5f8a; margin-bottom:12px; } .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:62px; line-height:1.62; color:#182019; } .bubble{ border:1.5px solid #cdd8ce; border-radius:4px; padding:52px; background:rgba(255,255,255,.6); } .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:23px; color:#c0392b; margin-top:26px; } .profile{ font-family:'Poppins'; font-size:38px; color:#28332b; text-align:center; } .profile b{ color:#c0392b; } .brand{ color:#9aa89e; } .pageno{ color:#9aa89e; }` },

    cyanotype: { name: 'Cyanotype', chip: '#bfe3f5', bg: '#0d3f63', arrow: '#bfe3f5',
      graphic: `<svg width="360" height="440" viewBox="0 0 100 124" style="position:absolute;top:-20px;right:0;opacity:.14"><g fill="#eaf4fa"><path d="M60 122 C 56 84 66 52 80 16 C 78 40 70 60 62 80 Z"/><ellipse cx="44" cy="76" rx="12" ry="5" transform="rotate(28 44 76)"/><ellipse cx="90" cy="54" rx="12" ry="5" transform="rotate(-28 90 54)"/><ellipse cx="52" cy="34" rx="10" ry="4" transform="rotate(30 52 34)"/></g></svg>`,
      css: `.slide{ background:#0d3f63; color:#eaf4fa; } .hook{ font-family:'Baskerville','Laila',serif; font-weight:600; font-size:78px; line-height:1.34; color:#f4fbff; } .hook b{ color:#bfe3f5; font-style:normal; } .kickline .kt{ font-family:'Baskerville',serif; font-weight:600; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#bfe3f5; font-style:italic; } .kickline .rule{ width:54px; height:1px; background:#bfe3f5; } .sub{ font-family:'Baskerville',serif; font-size:32px; color:#a6cbe0; margin-top:32px; line-height:1.56; } .body{ font-family:'Baskerville','Laila',serif; font-weight:400; font-size:47px; line-height:1.61; color:#dcecf5; } .body b, .poem b{ color:#fff; font-weight:600; } .poem{ font-family:'Laila','Baskerville',serif; font-weight:500; font-size:66px; line-height:1.62; color:#f4fbff; text-align:center; } .bubble{ border:1px solid rgba(191,227,245,.4); border-radius:2px; padding:54px; } .kicker{ font-family:'Baskerville',serif; font-size:32px; color:#a6cbe0; margin-top:30px; } .profile{ font-family:'Baskerville',serif; font-size:38px; color:#dcecf5; text-align:center; } .profile b{ color:#fff; } .brand{ color:#6a9ab5; } .pageno{ color:#6a9ab5; }` },

    street: { name: 'Street Stencil', chip: '#f2c500', bg: '#2c2c2c', arrow: '#f2c500',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(0,0,0,.15) 1px,transparent 1.5px);background-size:6px 6px;opacity:.4;"></div><div style="position:absolute;bottom:-60px;left:-40px;width:340px;height:340px;background:radial-gradient(circle,rgba(242,197,0,.16),transparent 65%);"></div>`,
      css: `.slide{ background:#2c2c2c; color:#efefe9; } .hook{ font-family:'Futura','Poppins',sans-serif; font-weight:800; font-size:96px; line-height:1.16; letter-spacing:-1px; text-transform:uppercase; color:#fff; } .hook b{ color:#f2c500; } .kickline .kt{ font-family:'Futura',sans-serif; font-weight:800; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#f2c500; background:#000; padding:6px 12px; } .kickline .rule{ width:0; } .sub{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#b0b0a8; margin-top:32px; line-height:1.52; } .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:48px; line-height:1.56; color:#deded6; } .body b, .poem b{ color:#f2c500; font-weight:700; } .body .num{ display:block; font-family:'Futura',sans-serif; font-weight:800; font-size:38px; color:#f2c500; margin-bottom:10px; } .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:64px; line-height:1.62; color:#fff; } .bubble{ border:3px solid #f2c500; border-radius:0; padding:50px; } .kicker{ font-family:'Futura',sans-serif; font-weight:800; font-size:26px; color:#f2c500; margin-top:26px; text-transform:uppercase; } .profile{ font-family:'Poppins'; font-size:38px; color:#deded6; text-align:center; } .profile b{ color:#f2c500; } .brand{ color:#7a7a72; } .pageno{ color:#f2c500; font-weight:700; }` },

    typewriter: { name: 'Typewriter', chip: '#8a6a2a', bg: '#f2ece0', arrow: '#8a6a2a',
      graphic: `<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(90,80,60,.05) 1px,transparent 1.3px);background-size:7px 7px;"></div>`,
      css: `.slide{ background:#f2ece0; color:#26221c; } .hook{ font-family:'Courier New',monospace; font-weight:700; font-size:70px; line-height:1.34; color:#1c1913; } .hook b{ color:#1c1913; background:#ffe08a; padding:0 4px; } .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:2px; text-transform:uppercase; color:#8a6a2a; } .kickline .rule{ width:44px; height:2px; background:#8a6a2a; } .sub{ font-family:'Courier New',monospace; font-size:29px; color:#6a6155; margin-top:30px; line-height:1.56; } .body{ font-family:'Courier New',monospace; font-weight:400; font-size:43px; line-height:1.61; color:#2e2820; } .body b, .poem b{ color:#1c1913; background:#ffe08a; padding:0 3px; font-weight:700; } .poem{ font-family:'Laila','Courier New',serif; font-weight:500; font-size:64px; line-height:1.62; color:#1c1913; } .bubble{ border:1px dashed #b8ad96; border-radius:2px; padding:50px; } .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; color:#8a6a2a; margin-top:26px; } .profile{ font-family:'Courier New',monospace; font-size:36px; color:#2e2820; text-align:center; } .profile b{ background:#ffe08a; } .brand{ font-family:'Courier New',monospace; color:#a89e86; } .pageno{ font-family:'Courier New',monospace; color:#a89e86; }` },

  
    museum: { name:"Museum Plate", chip:"#8e2d22", bg:"#f3efe3", arrow:"#8e2d22",
      graphic:"<svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><filter id=\"mus-grain\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.72\" numOctaves=\"2\" stitchTiles=\"stitch\"/><feColorMatrix type=\"saturate\" values=\"0\"/></filter><rect width=\"1080\" height=\"1350\" filter=\"url(#mus-grain)\" opacity=\"0.055\"/></svg><div style=\"position:absolute;top:58px;left:58px;right:58px;bottom:58px;border:1px solid rgba(142,45,34,.3);\"></div><div style=\"position:absolute;top:70px;left:70px;right:70px;bottom:70px;border:1px solid rgba(142,45,34,.16);\"></div><div style=\"position:absolute;top:62px;left:74px;font-family:'Courier New',monospace;font-size:18px;letter-spacing:2px;color:rgba(24,21,18,.55);\">ACC. NO. 07 · IDEA STUDY</div>",
      css:"\n    .slide{ background:#f3efe3; color:#181512; }\n    .kickline{ border-bottom:1px solid #c9b99a; padding-bottom:22px; margin-bottom:44px; } .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Poppins'; font-weight:650; font-size:23px; letter-spacing:.18em; text-transform:uppercase; color:#8e2d22; }\n    .hook{ font-family:'Didot','Laila','Georgia',serif; font-weight:700; font-size:82px; line-height:1.12; color:#181512; letter-spacing:.2px; }\n    .hook .lat{ font-family:'Didot','Georgia',serif; font-weight:400; font-style:italic; }\n    .hook b{ color:#8e2d22; font-weight:700; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:31px; color:#756d60; margin-top:36px; line-height:1.35; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:43px; line-height:1.55; color:#2b2721; }\n    .body b, .poem b{ color:#8e2d22; font-weight:700; }\n    .body .num{ font-family:'Didot','Georgia',serif; font-weight:700; font-size:42px; color:#8e2d22; display:block; margin-bottom:14px; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.62; color:#181512; text-align:center; }\n    .bubble{ border:1px solid #c9b99a; border-radius:3px; padding:56px; background:#faf7ee; }\n    .kicker{ font-family:'Georgia',serif; font-style:italic; font-size:31px; color:#756d60; margin-top:30px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:34px; line-height:1.42; color:#2b2721; text-align:center; }\n    .profile b{ color:#8e2d22; font-weight:700; }\n    .foot{ border-top:1px solid #c9b99a; padding-top:20px; }\n    .brand{ font-family:'Poppins'; font-weight:600; color:#8e2d22; letter-spacing:3px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:22px; letter-spacing:2px; color:#756d60; }\n    .pageno::before{ content:'PLATE '; }" },
    footnote: { name:"Footnote Journal", chip:"#b33a2f", bg:"#fbfaf4", arrow:"#b33a2f",
      graphic:"<div style=\"position:absolute;inset:0;background-image:repeating-linear-gradient(90deg,transparent 0 73px,rgba(17,24,39,.06) 73px 74px);\"></div><div style=\"position:absolute;inset:0;background-image:repeating-linear-gradient(transparent 0 53px,rgba(17,24,39,.05) 53px 54px);\"></div><div style=\"position:absolute;top:96px;bottom:96px;left:86px;width:1px;background:rgba(179,58,47,.35);\"></div><div style=\"position:absolute;top:150px;left:44px;font-family:'Courier New',monospace;font-weight:700;font-size:24px;color:rgba(179,58,47,.55);\">§</div>",
      css:"\n    .slide{ background:#fbfaf4; color:#111827; }\n    .mid{ justify-content:flex-start; padding-top:24px; }\n    .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; letter-spacing:2px; text-transform:uppercase; color:#b33a2f; }\n    .hook{ font-family:'Hoefler Text','Laila','Georgia',serif; font-weight:700; font-size:78px; line-height:1.1; color:#111827; }\n    .hook b{ color:#b33a2f; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#64748b; margin-top:30px; line-height:1.35; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:40px; line-height:1.58; color:#1f2937; }\n    .body b, .poem b{ color:#b33a2f; font-weight:700; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:700; font-size:26px; color:#b33a2f; display:block; margin-bottom:12px; }\n    .body .num::after{ content:''; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#111827; }\n    .bubble{ border-left:3px solid #b33a2f; border-top:1px solid #d8d1c2; border-right:1px solid #d8d1c2; border-bottom:1px solid #d8d1c2; border-radius:0 6px 6px 0; padding:48px 52px; background:#ffffff; }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#b33a2f; margin-top:26px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:31px; line-height:1.42; color:#1f2937; text-align:center; }\n    .profile b{ color:#b33a2f; font-weight:700; }\n    .brand{ font-family:'Courier New',monospace; color:#64748b; letter-spacing:2px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#64748b; }" },
    palimpsest: { name:"Palimpsest Manuscript", chip:"#9c2f1d", bg:"#efe1c2", arrow:"#9c2f1d",
      graphic:"<svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><filter id=\"pal-n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/><feColorMatrix type=\"saturate\" values=\"0\"/></filter><rect width=\"1080\" height=\"1350\" filter=\"url(#pal-n)\" opacity=\"0.07\"/></svg><div style=\"position:absolute;inset:0;background-image:repeating-linear-gradient(transparent 0 67px,rgba(46,36,19,.06) 67px 68px);\"></div><div style=\"position:absolute;right:60px;bottom:40px;font-family:'Laila',serif;font-weight:600;font-size:340px;line-height:.8;color:rgba(33,22,15,.04);pointer-events:none;\">अहम्</div><svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" preserveAspectRatio=\"none\" style=\"position:absolute;inset:0\"><path d=\"M60 66 C 400 58, 700 74, 1020 62 C 1028 400, 1016 950, 1024 1288 C 680 1296, 380 1280, 56 1290 C 64 900, 52 420, 60 66 Z\" fill=\"none\" stroke=\"#9c2f1d\" stroke-width=\"2\" stroke-opacity=\"0.5\"/></svg><div style=\"position:absolute;top:150px;right:70px;width:150px;height:52px;border:1.5px solid #1d4f78;border-radius:26px;display:flex;align-items:center;justify-content:center;font-family:'Poppins';font-weight:700;font-size:20px;letter-spacing:1px;color:#1d4f78;\">NOTE 03</div>",
      css:"\n    .slide{ background:#efe1c2; color:#21160f; }\n    .kickline .rule{ width:46px; height:2px; background:#9c2f1d; }\n    .kickline .kt{ font-family:'Poppins'; font-weight:700; font-size:24px; letter-spacing:.14em; text-transform:uppercase; color:#9c2f1d; }\n    .hook{ font-family:'Baskerville','Laila','Georgia',serif; font-weight:600; font-size:76px; line-height:1.38; color:#21160f; }\n    .hook b{ color:#9c2f1d; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#715d42; margin-top:32px; line-height:1.4; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:42px; line-height:1.6; color:#2e2413; }\n    .body b, .poem b{ color:#9c2f1d; font-weight:700; }\n    .body .num{ font-family:'Baskerville',serif; font-weight:700; font-size:40px; color:#1d4f78; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Baskerville',serif; font-weight:600; font-size:66px; line-height:1.7; color:#21160f; text-align:center; }\n    .poem b{ color:#9c2f1d; }\n    .bubble{ border:1.5px solid rgba(156,47,29,.5); border-radius:4px; padding:54px; background:#f8edcf; }\n    .kicker{ font-family:'Poppins'; font-weight:700; font-size:21px; letter-spacing:1px; color:#1d4f78; margin-top:26px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:32px; line-height:1.44; color:#2e2413; text-align:center; }\n    .profile b{ color:#9c2f1d; font-weight:700; }\n    .brand{ font-family:'Poppins'; color:#9c2f1d; letter-spacing:3px; }\n    .pageno{ font-family:'Poppins'; font-size:24px; color:#715d42; }" },
    casefile: { name:"Casefile Redline", chip:"#c51f1a", bg:"#f6f1e7", arrow:"#c51f1a",
      graphic:"<svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><filter id=\"cf-n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\"/><feColorMatrix type=\"saturate\" values=\"0\"/></filter><rect width=\"1080\" height=\"1350\" filter=\"url(#cf-n)\" opacity=\"0.03\"/></svg><div style=\"position:absolute;top:60px;left:70px;width:40px;height:2px;background:#c51f1a;opacity:0.8;\"></div>",
      css:"\n    .slide{ background:#f6f1e7; color:#171717; }\n    .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:23px; letter-spacing:2px; text-transform:uppercase; color:#c51f1a; background:rgba(197,31,26,.1); padding:6px 14px; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:850; font-size:78px; line-height:1.12; letter-spacing:-1px; color:#171717; }\n    .hook b{ color:#c51f1a; }\n    .sub{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:28px; color:#5f6268; margin-top:34px; line-height:1.4; }\n    .body{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:34px; line-height:1.45; color:#171717; }\n    .body b, .poem b{ color:#c51f1a; }\n    .body .num{ font-family:'Poppins'; font-weight:850; font-size:34px; color:#234d6b; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:60px; line-height:1.62; color:#171717; text-align:center; }\n    .poem b{ color:#c51f1a; }\n    .bubble{ border:1px solid #c9c0b2; border-left:6px solid #c51f1a; border-radius:6px; padding:44px 48px; background:#fffaf0; }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#234d6b; margin-top:24px; letter-spacing:1px; }\n    .profile{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:31px; line-height:1.44; color:#171717; text-align:center; }\n    .profile b{ color:#c51f1a; }\n    .brand{ font-family:'Courier New',monospace; color:#5f6268; letter-spacing:2px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#5f6268; }\n    .pageno::before{ content:'FILE '; }" },
    therapylab: { name:"Therapy Lab Report", chip:"#177a5b", bg:"#eef7f3", arrow:"#177a5b",
      graphic:"<div style=\"position:absolute;inset:0;background-image:linear-gradient(rgba(23,122,91,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(23,122,91,.10) 1px,transparent 1px);background-size:48px 48px;\"></div><div style=\"position:absolute;top:150px;left:70px;right:70px;height:80px;border:1px solid #b8d6cc;border-radius:8px;background:#ffffff;display:flex;align-items:center;padding:0 30px;gap:20px;\"><span style=\"width:14px;height:14px;border-radius:50%;background:#177a5b;\"></span><span style=\"font-family:'Courier New',monospace;font-weight:700;font-size:22px;letter-spacing:2px;color:#64746f;\">INNER LAB · REPORT</span><span style=\"margin-left:auto;font-family:'Courier New',monospace;font-weight:700;font-size:20px;color:#d8912f;\">PATTERN ✓</span></div><svg width=\"1080\" height=\"120\" viewBox=\"0 0 1080 120\" style=\"position:absolute;left:0;bottom:110px;opacity:.22\"><path d=\"M0 60 H360 L400 60 L420 22 L440 96 L460 60 L500 60 L520 40 L540 60 H1080\" fill=\"none\" stroke=\"#177a5b\" stroke-width=\"3\"/></svg>",
      css:"\n    .slide{ background:#eef7f3; color:#1b2a28; }\n    .mid{ padding-top:150px; }\n    .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:2px; text-transform:uppercase; color:#177a5b; background:#ffffff; border:1px solid #b8d6cc; border-radius:6px; padding:6px 14px; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:800; font-size:78px; line-height:1.08; letter-spacing:-.5px; color:#1b2a28; }\n    .hook b{ color:#177a5b; }\n    .sub{ font-family:'Poppins','Laila'; font-weight:500; font-size:30px; color:#64746f; margin-top:34px; line-height:1.4; }\n    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:38px; line-height:1.48; color:#243836; }\n    .body b, .poem b{ color:#177a5b; font-weight:700; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:700; font-size:27px; color:#d8912f; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:58px; line-height:1.65; color:#1b2a28; text-align:center; }\n    .poem b{ color:#177a5b; }\n    .bubble{ border:1px solid #b8d6cc; border-radius:6px; padding:46px 50px; background:#ffffff; }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#d8912f; margin-top:24px; letter-spacing:1px; }\n    .profile{ font-family:'Poppins','Laila'; font-weight:500; font-size:31px; line-height:1.44; color:#243836; text-align:center; }\n    .profile b{ color:#177a5b; font-weight:700; }\n    .brand{ font-family:'Courier New',monospace; color:#64746f; letter-spacing:2px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#64746f; }" },
    broadsheet: { name:"Poetry Broadsheet", chip:"#b81423", bg:"#f7f0df", arrow:"#b81423",
      graphic:"<div style=\"position:absolute;left:0;right:0;top:0;height:1350px;background:linear-gradient(90deg,transparent 0 49%,rgba(0,0,0,.055) 50%,transparent 51%);\"></div><div style=\"position:absolute;top:0;left:0;width:280px;height:280px;background-image:radial-gradient(#15110d 0 1px,transparent 1.5px);background-size:9px 9px;opacity:.07;\"></div><div style=\"position:absolute;bottom:0;right:0;width:280px;height:280px;background-image:radial-gradient(#15110d 0 1px,transparent 1.5px);background-size:9px 9px;opacity:.07;\"></div><div style=\"position:absolute;top:150px;left:70px;right:70px;height:76px;border-top:3px solid #15110d;border-bottom:1px solid #15110d;display:flex;align-items:center;justify-content:space-between;\"><span style=\"font-family:'Didot',serif;font-weight:800;font-size:30px;letter-spacing:6px;color:#15110d;\">THE DOALFAAZ</span><span style=\"font-family:'Poppins';font-weight:800;font-size:18px;letter-spacing:2px;color:#b81423;\">ISSUE · काव्य</span></div>",
      css:"\n    .slide{ background:#f7f0df; color:#15110d; }\n    .mid{ padding-top:152px; }\n    .kickline{ border-bottom:1px solid #bcae95; padding-bottom:18px; margin-bottom:40px; } .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Poppins'; font-weight:800; font-size:22px; letter-spacing:.14em; text-transform:uppercase; color:#b81423; }\n    .hook{ font-family:'Didot','Laila','Georgia',serif; font-weight:800; font-size:84px; line-height:1.12; color:#15110d; }\n    .hook b{ color:#b81423; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#61584d; margin-top:34px; line-height:1.4; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:40px; line-height:1.5; color:#241d16; }\n    .body b, .poem b{ color:#b81423; font-weight:700; }\n    .body .num{ font-family:'Didot',serif; font-weight:800; font-size:46px; color:#0f5d68; display:block; margin-bottom:10px; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:650; font-size:66px; line-height:1.58; color:#15110d; text-align:center; border-top:2px solid #15110d; border-bottom:2px solid #15110d; padding:40px 0; }\n    .poem b{ color:#b81423; }\n    .bubble{ border:1px solid #bcae95; border-top:4px solid #b81423; border-radius:2px; padding:52px; background:#fff8e8; }\n    .kicker{ font-family:'Poppins'; font-weight:800; font-size:22px; color:#0f5d68; margin-top:28px; letter-spacing:1px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:32px; line-height:1.44; color:#241d16; text-align:center; }\n    .profile b{ color:#b81423; font-weight:700; }\n    .brand{ font-family:'Didot',serif; color:#61584d; letter-spacing:4px; }\n    .pageno{ font-family:'Georgia',serif; font-size:26px; color:#61584d; }" },
    fieldmap: { name:"Field Map Contour", chip:"#b65f2a", bg:"#edf1ed", arrow:"#b65f2a",
      graphic:"<svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><g fill=\"none\" stroke=\"#2d6a72\" stroke-width=\"1.2\" stroke-opacity=\"0.13\"><path d=\"M-40 300 C 260 220, 520 360, 760 260 C 940 190, 1060 300, 1140 250\"/><path d=\"M-40 360 C 260 280, 520 420, 760 320 C 940 250, 1060 360, 1140 310\"/><path d=\"M-40 430 C 280 350, 540 500, 780 400 C 960 330, 1070 430, 1160 380\"/><path d=\"M-40 900 C 300 1000, 560 840, 800 960 C 980 1050, 1080 940, 1160 990\"/><path d=\"M-40 970 C 300 1070, 560 910, 800 1030 C 980 1120, 1080 1010, 1160 1060\"/><ellipse cx=\"560\" cy=\"640\" rx=\"150\" ry=\"110\"/><ellipse cx=\"560\" cy=\"640\" rx=\"90\" ry=\"66\"/></g><path d=\"M180 260 C 360 520, 700 560, 620 900 C 560 1120, 820 1160, 900 1080\" fill=\"none\" stroke=\"#b65f2a\" stroke-width=\"2.4\" stroke-dasharray=\"4 12\" stroke-linecap=\"round\" stroke-opacity=\"0.55\"/><circle cx=\"900\" cy=\"1080\" r=\"12\" fill=\"#b65f2a\"/><circle cx=\"900\" cy=\"1080\" r=\"22\" fill=\"none\" stroke=\"#b65f2a\" stroke-width=\"2\"/><text x=\"66\" y=\"1290\" font-family=\"Courier New,monospace\" font-size=\"19\" fill=\"#68746b\" opacity=\"0.6\">A1 · B2 · YOU ARE HERE</text></svg>",
      css:"\n    .slide{ background:#edf1ed; color:#18201c; }\n    .kickline .rule{ width:46px; height:2px; background:#b65f2a; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:2px; text-transform:uppercase; color:#b65f2a; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:800; font-size:80px; line-height:1.08; letter-spacing:-.5px; color:#18201c; }\n    .hook b{ color:#b65f2a; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#68746b; margin-top:32px; line-height:1.4; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:40px; line-height:1.52; color:#26302a; }\n    .body b, .poem b{ color:#b65f2a; font-weight:700; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:700; font-size:26px; color:#2d6a72; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:60px; line-height:1.68; color:#18201c; text-align:center; }\n    .poem b{ color:#b65f2a; }\n    .bubble{ border:1px solid #9fb0a4; border-radius:10px; padding:48px 52px; background:rgba(249,251,247,.82); }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#2d6a72; margin-top:26px; letter-spacing:1px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:32px; line-height:1.44; color:#26302a; text-align:center; }\n    .profile b{ color:#b65f2a; font-weight:700; }\n    .brand{ font-family:'Courier New',monospace; color:#68746b; letter-spacing:2px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#68746b; }" },
    noirstage: { name:"Noir Theatre", chip:"#e02323", bg:"#070707", arrow:"#e02323",
      graphic:"<div style=\"position:absolute;inset:0;background:radial-gradient(46% 40% at 35% 22%,rgba(53,34,27,.9) 0%,transparent 60%);\"></div><div style=\"position:absolute;top:0;bottom:0;left:0;width:200px;background:linear-gradient(90deg,rgba(0,0,0,.85),transparent);\"></div><div style=\"position:absolute;top:0;bottom:0;right:0;width:200px;background:linear-gradient(270deg,rgba(0,0,0,.85),transparent);\"></div><div style=\"position:absolute;top:0;bottom:0;left:72px;width:1px;background:rgba(224,35,35,.55);\"></div><svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><path d=\"M420 -60 L680 -60 L900 620 L200 620 Z\" fill=\"rgba(240,193,75,.05)\"/></svg>",
      css:"\n    .slide{ background:#070707; color:#f5efe5; }\n    .kickline .rule{ width:44px; height:2px; background:#e02323; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#f0c14b; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:900; font-size:86px; line-height:1.12; letter-spacing:-1px; color:#f5efe5; }\n    .hook b{ color:#e02323; font-weight:900; }\n    .sub{ font-family:'Poppins','Laila'; font-weight:500; font-size:30px; color:#a8a095; margin-top:34px; line-height:1.4; }\n    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:40px; line-height:1.48; color:#e6ded2; }\n    .body b, .poem b{ color:#e02323; font-weight:700; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:700; font-size:28px; color:#f0c14b; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:62px; line-height:1.62; color:#f5efe5; text-align:center; }\n    .poem b{ color:#e02323; }\n    .bubble{ border:1px solid #39312d; border-radius:4px; padding:48px 52px; background:#121212; }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#f0c14b; margin-top:26px; letter-spacing:1px; }\n    .profile{ font-family:'Poppins','Laila'; font-weight:500; font-size:31px; line-height:1.44; color:#e6ded2; text-align:center; }\n    .profile b{ color:#e02323; font-weight:700; }\n    .brand{ font-family:'Poppins'; color:#8a8278; letter-spacing:3px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#8a8278; }" },
    departure: { name:"Departure Board", chip:"#ffd21f", bg:"#111411", arrow:"#ffd21f",
      graphic:"<div style=\"position:absolute;top:150px;left:68px;right:68px;height:78px;background:#191d19;border:1px solid #30382f;border-radius:6px;display:flex;align-items:center;padding:0 28px;gap:18px;\"><span style=\"font-family:'Courier New',monospace;font-weight:700;font-size:24px;letter-spacing:3px;color:#ffd21f;\">DEPARTURES</span><span style=\"margin-left:auto;font-family:'Courier New',monospace;font-weight:700;font-size:22px;color:#2bc7a5;\">ON TIME · 00:00</span></div><div style=\"position:absolute;left:68px;right:68px;top:320px;bottom:210px;background:repeating-linear-gradient(#1c211c 0 43px,#151915 43px 86px);border:1px solid #30382f;border-radius:6px;opacity:.9;\"></div><div style=\"position:absolute;left:68px;right:68px;top:320px;bottom:210px;background-image:repeating-linear-gradient(transparent 0 85px,rgba(0,0,0,.5) 85px 86px);border-radius:6px;\"></div>",
      css:"\n    .slide{ background:#111411; color:#f7f4df; }\n    .mid{ padding-top:150px; }\n    .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; letter-spacing:2px; text-transform:uppercase; color:#ffd21f; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:900; font-size:80px; line-height:1.12; letter-spacing:-1px; color:#f7f4df; }\n    .hook b{ color:#ffd21f; }\n    .sub{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:28px; color:#9ca39a; margin-top:34px; line-height:1.4; }\n    .body{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:34px; line-height:1.4; color:#f0edd8; }\n    .body b, .poem b{ color:#ffd21f; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:700; font-size:30px; color:#2bc7a5; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Poppins',serif; font-weight:600; font-size:58px; line-height:1.6; color:#f7f4df; text-align:center; }\n    .poem b{ color:#ffd21f; }\n    .bubble{ border:1px solid #30382f; border-left:4px solid #ffd21f; border-radius:6px; padding:44px 48px; background:#191d19; }\n    .kicker{ font-family:'Courier New',monospace; font-weight:700; font-size:22px; color:#2bc7a5; margin-top:24px; letter-spacing:1px; }\n    .profile{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:31px; line-height:1.44; color:#f0edd8; text-align:center; }\n    .profile b{ color:#ffd21f; }\n    .brand{ font-family:'Courier New',monospace; color:#9ca39a; letter-spacing:3px; }\n    .pageno{ font-family:'Courier New',monospace; font-size:24px; color:#ffd21f; }" },
    sacredgeo: { name:"Sacred Geometry System", chip:"#b76e33", bg:"#fbf4e6", arrow:"#b76e33",
      graphic:"<div style=\"position:absolute;inset:0;background-image:radial-gradient(rgba(183,110,51,.28) 1px,transparent 1.4px);background-size:18px 18px;opacity:.06;\"></div><svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><g fill=\"none\" stroke=\"#b76e33\" stroke-opacity=\"0.18\" stroke-width=\"1.4\"><circle cx=\"540\" cy=\"675\" r=\"120\"/><circle cx=\"540\" cy=\"675\" r=\"220\"/><circle cx=\"540\" cy=\"675\" r=\"330\"/><path d=\"M540 345 L830 845 L250 845 Z\"/><path d=\"M540 1005 L250 505 L830 505 Z\"/><line x1=\"540\" y1=\"300\" x2=\"540\" y2=\"1050\"/><line x1=\"165\" y1=\"675\" x2=\"915\" y2=\"675\"/></g></svg><div style=\"position:absolute;bottom:96px;right:92px;width:66px;height:66px;border-radius:50%;border:2px solid rgba(183,110,51,.5);display:flex;align-items:center;justify-content:center;font-family:'Poppins';font-weight:800;font-size:24px;color:rgba(183,110,51,.7);\">ॐ</div>",
      css:"\n    .slide{ background:#fbf4e6; color:#151515; }\n    .mid{ justify-content:center; }\n    .kickline{ justify-content:center; } .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.2em; text-transform:uppercase; color:#b76e33; }\n    .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:70px; line-height:1.34; letter-spacing:0; color:#1d1a15; text-align:center; }\n    .hook b{ color:#b76e33; font-weight:600; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#6b6257; margin-top:34px; line-height:1.5; text-align:center; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:40px; line-height:1.55; color:#26241f; text-align:center; }\n    .body b, .poem b{ color:#b76e33; font-weight:700; }\n    .body .num{ font-family:'Poppins'; font-weight:700; font-size:26px; letter-spacing:2px; color:#173f6b; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:60px; line-height:1.65; color:#151515; text-align:center; }\n    .poem b{ color:#b76e33; }\n    .bubble{ border:1px solid #cbb68b; border-radius:4px; padding:52px; background:#fffaf0; }\n    .kicker{ font-family:'Poppins'; font-weight:700; font-size:22px; color:#173f6b; margin-top:26px; letter-spacing:1px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:32px; line-height:1.44; color:#26241f; text-align:center; }\n    .profile b{ color:#b76e33; font-weight:700; }\n    .brand{ font-family:'Poppins'; color:#6b6257; letter-spacing:3px; }\n    .pageno{ font-family:'Poppins'; font-size:24px; color:#6b6257; }" },
    xerox: { name:"Xerox Zine Proof", chip:"#ef2347", bg:"#f6f2e8", arrow:"#ef2347",
      graphic:"<svg width=\"1080\" height=\"1350\" viewBox=\"0 0 1080 1350\" style=\"position:absolute;inset:0\"><filter id=\"xz-n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.95\" numOctaves=\"2\" stitchTiles=\"stitch\"/><feColorMatrix type=\"saturate\" values=\"0\"/></filter><rect width=\"1080\" height=\"1350\" filter=\"url(#xz-n)\" opacity=\"0.08\"/></svg><div style=\"position:absolute;top:150px;left:74px;width:120px;height:120px;border:5px solid rgba(8,8,8,.5);border-radius:50%;transform:rotate(-8deg);\"></div><div style=\"position:absolute;bottom:210px;right:96px;width:172px;height:92px;border:4px solid rgba(239,35,71,.42);transform:rotate(6deg);\"></div><div style=\"position:absolute;top:58px;left:44px;width:150px;height:44px;background:rgba(198,198,186,.55);transform:rotate(-18deg);\"></div><div style=\"position:absolute;top:150px;right:52px;width:150px;height:44px;background:rgba(198,198,186,.55);transform:rotate(14deg);\"></div>",
      css:"\n    .slide{ background:#f6f2e8; color:#080808; }\n    .kickline .rule{ width:0; }\n    .kickline .kt{ font-family:'Courier New',monospace; font-weight:800; font-size:24px; letter-spacing:2px; text-transform:uppercase; color:#ffffff; background:#ef2347; padding:5px 13px; }\n    .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:900; font-size:88px; line-height:1.12; letter-spacing:-2px; color:#080808; text-shadow:5px 4px 0 rgba(239,35,71,.42); }\n    .hook b{ color:#ef2347; }\n    .sub{ font-family:'Courier New','Laila',monospace; font-weight:700; font-size:28px; color:#4f4f4f; margin-top:34px; line-height:1.35; }\n    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:650; font-size:42px; line-height:1.32; color:#080808; }\n    .body b, .poem b{ color:#ef2347; font-weight:800; }\n    .body .num{ font-family:'Courier New',monospace; font-weight:800; font-size:34px; color:#20a66b; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Poppins',serif; font-weight:700; font-size:62px; line-height:1.62; color:#080808; text-align:center; }\n    .poem b{ color:#ef2347; }\n    .bubble{ border:3px solid #111111; border-radius:0; padding:46px 48px; background:#ffffff; box-shadow:6px 6px 0 rgba(239,35,71,.3); }\n    .kicker{ font-family:'Courier New',monospace; font-weight:800; font-size:22px; color:#20a66b; margin-top:24px; letter-spacing:1px; }\n    .profile{ font-family:'Poppins','Laila'; font-weight:650; font-size:31px; line-height:1.4; color:#080808; text-align:center; }\n    .profile b{ color:#ef2347; font-weight:800; }\n    .brand{ font-family:'Courier New',monospace; font-weight:800; color:#080808; letter-spacing:2px; }\n    .pageno{ font-family:'Courier New',monospace; font-weight:700; font-size:24px; color:#4f4f4f; }" },
    monsoon: { name:"Monsoon Window", chip:"#d69b3a", bg:"#172225", arrow:"#d69b3a",
      graphic:"<div style=\"position:absolute;inset:0;background-image:repeating-linear-gradient(100deg,transparent 0 22px,rgba(255,255,255,.12) 23px 24px);filter:blur(.4px);\"></div><div style=\"position:absolute;left:0;right:0;bottom:0;height:430px;background:linear-gradient(0deg,rgba(111,176,184,.16),transparent);\"></div><div style=\"position:absolute;top:-130px;right:-90px;width:540px;height:540px;border-radius:50%;background:radial-gradient(closest-side,rgba(214,155,58,.20),transparent);\"></div><div style=\"position:absolute;bottom:240px;left:92px;font-family:'Georgia',serif;font-size:130px;line-height:.55;color:rgba(214,155,58,.4);\">&bdquo;</div>",
      css:"\n    .slide{ background:#172225; color:#f6f0e6; }\n    .kickline .rule{ width:44px; height:1.5px; background:#d69b3a; }\n    .kickline .kt{ font-family:'Poppins'; font-weight:650; font-size:22px; letter-spacing:.14em; text-transform:uppercase; color:#d69b3a; }\n    .hook{ font-family:'Baskerville','Laila','Georgia',serif; font-weight:600; font-size:76px; line-height:1.32; color:#f6f0e6; }\n    .hook .lat{ font-family:'Baskerville','Georgia',serif; font-style:italic; font-weight:400; }\n    .hook b{ color:#d69b3a; }\n    .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#b4c0bc; margin-top:34px; line-height:1.45; }\n    .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:40px; line-height:1.58; color:#e6e2d6; }\n    .body b, .poem b{ color:#d69b3a; font-weight:700; }\n    .body .num{ font-family:'Baskerville',serif; font-weight:700; font-size:40px; color:#6fb0b8; display:block; margin-bottom:12px; }\n    .poem{ font-family:'Laila','Baskerville',serif; font-weight:600; font-size:62px; line-height:1.72; color:#f6f0e6; text-align:center; }\n    .poem b{ color:#d69b3a; }\n    .bubble{ border:1px solid #385056; border-radius:10px; padding:50px 52px; background:rgba(232,238,233,.06); }\n    .kicker{ font-family:'Poppins'; font-weight:600; font-size:22px; color:#8a9894; margin-top:26px; letter-spacing:1px; }\n    .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:32px; line-height:1.44; color:#e6e2d6; text-align:center; }\n    .profile b{ color:#d69b3a; font-weight:700; }\n    .brand{ font-family:'Baskerville',serif; color:#8a9894; letter-spacing:3px; }\n    .pageno{ font-family:'Georgia',serif; font-size:24px; color:#8a9894; }" },

    /* ---------- Literary pack (doalfaaz_8_new_carousel_looks_READY, embedded 2026-07-08) ---------- */
  // Qalam Wash — ink-wash qalam study; best for intimate poetry, memory, and restrained grief.
  qalamWash: { name: 'Qalam Wash', chip: '#2b2621', bg: '#f2eee6', arrow: '#8b8072',
    graphic: `<div style="position:absolute;left:-180px;top:72px;width:560px;height:980px;background:radial-gradient(closest-side,rgba(43,38,33,.105),rgba(43,38,33,.040) 46%,transparent 72%);filter:blur(18px);opacity:.72;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#f2eee6; color:#4d453d; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:74px; line-height:1.46; color:#27221d; letter-spacing:.1px; }
    .hook b{ color:#1d1915; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(127,74,48,.52); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#8a7d6e; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#51483f; letter-spacing:.05px; }
    .body b{ color:#211d19; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#8a4b31; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.64; color:#302922; }
    .poem b{ color:#15120f; font-weight:500; }
    .bubble{ border:1.4px solid rgba(74,63,52,.26); border-radius:18px 160px 18px 18px; padding:62px 58px 68px; }
    .bubble .body{ color:#3f3831; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#8f725f; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#463e36; text-align:center; }
    .profile b{ color:#1f1a16; font-weight:600; }
    .brand{ color:#9a9084; } .pageno{ color:#9a9084; }` },

  // Terracotta Fresco — aged Indian wall pigment; best for Vedanta, longing, and embodied spirituality.
  terracottaFresco: { name: 'Terracotta Fresco', chip: '#8b3f2a', bg: '#d9b892', arrow: '#8f6a4f',
    graphic: `<div style="position:absolute;inset:0;background:radial-gradient(circle at 82% 18%,rgba(255,236,201,.22),transparent 30%),radial-gradient(circle at 10% 94%,rgba(125,55,35,.12),transparent 38%),linear-gradient(135deg,rgba(255,255,255,.10),transparent 42%,rgba(76,37,28,.08));opacity:.72;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#d9b892; color:#493329; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:72px; line-height:1.48; color:#2f211b; letter-spacing:.05px; }
    .hook b{ color:#7b2f20; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:11px; text-decoration-color:rgba(123,47,32,.42); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#735844; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#493329; letter-spacing:.05px; }
    .body b{ color:#2b1f19; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#8b3f2a; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:66px; line-height:1.58; color:#34251e; }
    .poem b{ color:#772f21; font-weight:500; }
    .bubble{ border:1.5px solid rgba(72,44,33,.28); border-radius:16px 150px 16px 16px; padding:62px 58px 68px; }
    .bubble .body{ color:#3f2c23; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#7f4d39; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#3f2c23; text-align:center; }
    .profile b{ color:#211714; font-weight:600; }
    .brand{ color:#866550; } .pageno{ color:#866550; }
    .kickline .rule{ width:44px; height:2px; background:#8b3f2a; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#8b3f2a; }` },

  // Wasli Miniature Margin — quiet miniature-painting border discipline; best for Gita/Vedanta reflections.
  wasliMiniature: { name: 'Wasli Miniature Margin', chip: '#154f5c', bg: '#f3e7d0', arrow: '#9c7f56',
    graphic: `<div style="position:absolute;inset:46px;border:1px solid rgba(21,79,92,.28);box-shadow:inset 0 0 0 10px rgba(151,61,38,.055),inset 0 0 0 13px rgba(21,79,92,.095);border-radius:3px;opacity:.82;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#f3e7d0; color:#4a3826; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:72px; line-height:1.47; color:#302315; letter-spacing:.08px; }
    .hook b{ color:#154f5c; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(151,61,38,.38); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#8c714b; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.63; color:#4a3826; letter-spacing:.05px; }
    .body b{ color:#154f5c; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#973d26; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:66px; line-height:1.62; color:#352716; }
    .poem b{ color:#154f5c; font-weight:500; }
    .bubble{ border:1.4px solid rgba(21,79,92,.24); border-radius:14px 145px 14px 14px; padding:62px 58px 68px; }
    .bubble .body{ color:#3f2f20; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#973d26; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#45331f; text-align:center; }
    .profile b{ color:#154f5c; font-weight:600; }
    .brand{ color:#a98d65; } .pageno{ color:#a98d65; }
    .kickline .rule{ width:44px; height:2px; background:#973d26; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#973d26; }` },

  // Silver Gelatin Essay — soft monochrome photo-paper mood; best for psychology, identity, and self-observation.
  silverGelatin: { name: 'Silver Gelatin Essay', chip: '#e9e6df', bg: '#171716', arrow: '#787773',
    graphic: `<div style="position:absolute;right:-190px;top:-120px;width:640px;height:1540px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.075),rgba(255,255,255,.025),transparent);filter:blur(22px);opacity:.78;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#171716; color:#a8a6a0; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:74px; line-height:1.46; color:#f0ede6; letter-spacing:.05px; }
    .hook b{ color:#ffffff; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(177,174,166,.48); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#8b8984; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#aaa7a0; letter-spacing:.05px; }
    .body b{ color:#f2efe8; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#e9e6df; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.6; color:#e8e5de; }
    .poem b{ color:#fff; font-weight:500; }
    .bubble{ border:1.4px solid rgba(233,230,223,.24); border-radius:16px 150px 16px 16px; padding:62px 58px 68px; }
    .bubble .body{ color:#c7c4bd; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#98958e; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#c9c6bf; text-align:center; }
    .profile b{ color:#fff; font-weight:600; }
    .brand{ color:#74716b; } .pageno{ color:#74716b; }
    .kickline .rule{ width:44px; height:2px; background:#e9e6df; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#e9e6df; }` },

  // Khaadi Linen — handwoven textile minimalism; best for calm teachings and everyday inner-work notes.
  khaadiLinen: { name: 'Khaadi Linen', chip: '#2d4558', bg: '#e9e1d0', arrow: '#9a8d79',
    graphic: `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(45,69,88,.035) 1px,transparent 1px),linear-gradient(0deg,rgba(61,55,47,.030) 1px,transparent 1px);background-size:34px 34px,38px 38px;opacity:.62;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#e9e1d0; color:#4a443a; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:74px; line-height:1.46; color:#2f2a23; letter-spacing:.05px; }
    .hook b{ color:#2d4558; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(45,69,88,.34); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#8a806e; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#4a443a; letter-spacing:.05px; }
    .body b{ color:#2d4558; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#805f3c; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.62; color:#342f27; }
    .poem b{ color:#2d4558; font-weight:500; }
    .bubble{ border:1.4px solid rgba(45,69,88,.22); border-radius:16px 150px 16px 16px; padding:62px 58px 68px; }
    .bubble .body{ color:#403a31; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#805f3c; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#423c33; text-align:center; }
    .profile b{ color:#2d4558; font-weight:600; }
    .brand{ color:#9a8f7d; } .pageno{ color:#9a8f7d; }
    .kickline .rule{ width:44px; height:2px; background:#2d4558; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#2d4558; }` },

  // Copper Patina Archive — oxidized archive metal and old ink; best for ego, time, and inner archaeology.
  copperPatina: { name: 'Copper Patina Archive', chip: '#b6784a', bg: '#14231f', arrow: '#60736b',
    graphic: `<div style="position:absolute;left:-220px;bottom:-260px;width:780px;height:780px;background:radial-gradient(closest-side,rgba(182,120,74,.18),rgba(182,120,74,.045) 48%,transparent 72%);filter:blur(20px);opacity:.76;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#14231f; color:#9fb0a8; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:72px; line-height:1.48; color:#f1eadf; letter-spacing:.05px; }
    .hook b{ color:#d1a06f; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(209,160,111,.42); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#7f948b; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#adbbb4; letter-spacing:.05px; }
    .body b{ color:#efe5d7; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#d1a06f; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:66px; line-height:1.62; color:#eee5d8; }
    .poem b{ color:#d1a06f; font-weight:500; }
    .bubble{ border:1.4px solid rgba(209,160,111,.28); border-radius:16px 150px 16px 16px; padding:62px 58px 68px; }
    .bubble .body{ color:#c5d0ca; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#b98a5f; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#c5d0ca; text-align:center; }
    .profile b{ color:#f1eadf; font-weight:600; }
    .brand{ color:#63786f; } .pageno{ color:#63786f; }
    .kickline .rule{ width:44px; height:2px; background:#b6784a; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#b6784a; }` },

  // Limewash Courtyard — quiet plaster architecture and shade; best for silence, surrender, and slow clarity.
  limewashCourtyard: { name: 'Limewash Courtyard', chip: '#6f7b5d', bg: '#ece6d8', arrow: '#9d927f',
    graphic: `<div style="position:absolute;right:-148px;top:150px;width:430px;height:760px;border:1.5px solid rgba(111,123,93,.20);border-radius:220px 220px 18px 18px;box-shadow:0 0 0 28px rgba(111,123,93,.030);opacity:.86;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#ece6d8; color:#49493f; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:74px; line-height:1.46; color:#313229; letter-spacing:.05px; }
    .hook b{ color:#6f7b5d; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(111,123,93,.36); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#858170; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#4c4b41; letter-spacing:.05px; }
    .body b{ color:#34352c; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#6f7b5d; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.62; color:#36372e; }
    .poem b{ color:#6f7b5d; font-weight:500; }
    .bubble{ border:1.4px solid rgba(111,123,93,.24); border-radius:18px 155px 18px 18px; padding:62px 58px 68px; }
    .bubble .body{ color:#414137; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#777b63; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#44443a; text-align:center; }
    .profile b{ color:#313229; font-weight:600; }
    .brand{ color:#9d9788; } .pageno{ color:#9d9788; }` },

  // Twilight Ghazal — muted mehfil-at-dusk atmosphere; best for shers, distance, and nocturnal longing.
  twilightGhazal: { name: 'Twilight Ghazal', chip: '#c09a71', bg: '#211b26', arrow: '#6f6473',
    graphic: `<div style="position:absolute;right:88px;top:78px;width:360px;height:360px;background:radial-gradient(closest-side,rgba(192,154,113,.145),rgba(192,154,113,.040) 52%,transparent 73%);filter:blur(10px);opacity:.70;pointer-events:none;"></div>`,
    css: `
    .slide{ background:#211b26; color:#a99fac; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:72px; line-height:1.48; color:#f3ede3; letter-spacing:.05px; }
    .hook b{ color:#c09a71; font-weight:600; text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:12px; text-decoration-color:rgba(192,154,113,.42); }
    .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#928695; margin-top:42px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:48px; line-height:1.64; color:#b8afba; letter-spacing:.05px; }
    .body b{ color:#f3ede3; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:500; font-size:32px; color:#c09a71; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.6; color:#eee6dc; }
    .poem b{ color:#c09a71; font-weight:500; }
    .bubble{ border:1.4px solid rgba(192,154,113,.26); border-radius:16px 150px 16px 16px; padding:62px 58px 68px; }
    .bubble .body{ color:#d0c8d1; font-size:50px; line-height:1.62; }
    .kicker{ font-family:'Laila'; font-weight:400; font-size:32px; color:#c09a71; margin-top:36px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:39px; line-height:1.68; color:#d0c8d1; text-align:center; }
    .profile b{ color:#f3ede3; font-weight:600; }
    .brand{ color:#6f6473; } .pageno{ color:#6f6473; }
    .kickline .rule{ width:44px; height:2px; background:#c09a71; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#c09a71; }` },

    /* ---------- Fable additions (2026-07-08): four register gaps, hand-crafted ---------- */
    cinema: { name: 'Cinema Still', chip: '#dcc27d', bg: '#101318', arrow: '#dcc27d',
      graphic: `<div style="position:absolute;top:0;left:0;right:0;height:128px;background:#06070a;"></div><div style="position:absolute;bottom:0;left:0;right:0;height:128px;background:#06070a;"></div><svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0"><filter id="cin-g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#cin-g)" opacity="0.05"/></svg><div style="position:absolute;top:60px;left:-120px;width:520px;height:420px;background:radial-gradient(closest-side,rgba(220,194,125,.10),transparent);"></div>`,
      css: `
      .slide{ background:#101318; color:#cfccc2; }
      .kickline .rule{ width:40px; height:1px; background:#dcc27d; }
      .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#dcc27d; }
      .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#eceade; text-shadow:0 2px 24px rgba(0,0,0,.5); }
      .hook .lat{ font-style:italic; font-weight:400; }
      .hook b{ color:#dcc27d; font-weight:500; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8e9096; margin-top:36px; line-height:1.6; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#cfccc2; }
      .body b, .poem b{ color:#f2efe4; font-weight:500; }
      .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#dcc27d; letter-spacing:3px; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#eceade; text-align:center; }
      .bubble{ border:1px solid #262b33; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.025); }
      .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8e9096; margin-top:30px; letter-spacing:2px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#cfccc2; text-align:center; }
      .profile b{ color:#dcc27d; font-weight:500; }
      .brand{ color:#5c6068; letter-spacing:3px; } .pageno{ color:#5c6068; }` },

    jharokha: { name: 'Peacock Court', chip: '#c9a24b', bg: '#11393b', arrow: '#c9a24b',
      graphic: `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0"><g fill="none" stroke="#c9a24b" stroke-width="1.6" stroke-opacity="0.5"><path d="M420 168 Q420 84 480 84 Q510 40 540 30 Q570 40 600 84 Q660 84 660 168"/><line x1="420" y1="168" x2="660" y2="168"/></g><g fill="#c9a24b" fill-opacity="0.14"><circle cx="150" cy="1220" r="3"/><circle cx="210" cy="1250" r="3"/><circle cx="270" cy="1222" r="3"/><circle cx="870" cy="1236" r="3"/><circle cx="930" cy="1210" r="3"/></g></svg>`,
      css: `
      .slide{ background:#11393b; color:#e7dfc9; }
      .kickline{ justify-content:center; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:550; font-size:21px; letter-spacing:.22em; text-transform:uppercase; color:#c9a24b; }
      .hook{ font-family:'Laila','Georgia',serif; font-weight:560; font-size:66px; line-height:1.44; color:#f1e9d6; text-align:center; }
      .hook b{ color:#c9a24b; font-weight:600; }
      .sub{ font-family:'Georgia','Laila',serif; font-style:italic; font-size:30px; color:#a8b3a0; margin-top:34px; line-height:1.5; text-align:center; }
      .body{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:42px; line-height:1.6; color:#e7dfc9; }
      .body b, .poem b{ color:#c9a24b; font-weight:600; }
      .body .num{ font-family:'Laila',serif; font-weight:600; font-size:34px; color:#c9a24b; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.72; color:#f1e9d6; text-align:center; }
      .bubble{ border:1px solid rgba(201,162,75,.55); border-radius:110px 110px 12px 12px; padding:64px 56px 56px; background:rgba(201,162,75,.05); }
      .kicker{ font-family:'Poppins'; font-weight:550; font-size:22px; color:#c9a24b; margin-top:28px; letter-spacing:2px; }
      .profile{ font-family:'Georgia','Laila',serif; font-weight:400; font-size:34px; line-height:1.56; color:#e7dfc9; text-align:center; }
      .profile b{ color:#c9a24b; font-weight:600; }
      .brand{ color:#7e8f7f; letter-spacing:3px; } .pageno{ color:#7e8f7f; }` },

    haldi: { name: 'Morning Haldi', chip: '#a85a28', bg: '#f4dfa4', arrow: '#a85a28',
      graphic: `<div style="position:absolute;top:-160px;right:-140px;width:560px;height:560px;border-radius:50%;background:radial-gradient(closest-side,rgba(203,130,44,.20),transparent);"></div><svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0"><g fill="#a85a28" fill-opacity="0.12"><circle cx="120" cy="1160" r="4"/><circle cx="175" cy="1210" r="3"/><circle cx="118" cy="1258" r="3"/><circle cx="940" cy="180" r="4"/><circle cx="900" cy="240" r="3"/></g></svg>`,
      css: `
      .slide{ background:#f4dfa4; color:#3a2c18; }
      .kickline .rule{ width:52px; height:2px; background:#a85a28; }
      .kickline .kt{ font-family:'Poppins'; font-weight:650; font-size:21px; letter-spacing:.16em; text-transform:uppercase; color:#a85a28; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:620; font-size:74px; line-height:1.36; letter-spacing:-.5px; color:#3a2c18; }
      .hook b{ color:#a85a28; font-weight:700; background:linear-gradient(transparent 80%, rgba(168,90,40,.24) 80%); }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#7c6238; margin-top:36px; line-height:1.58; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:46px; line-height:1.6; color:#48371e; }
      .body b, .poem b{ color:#a85a28; font-weight:650; }
      .body .num{ font-family:'Poppins'; font-weight:700; font-size:32px; color:#a85a28; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:62px; line-height:1.64; color:#3a2c18; text-align:center; }
      .bubble{ border:1.5px solid #d9bd7d; border-radius:14px; padding:54px 54px; background:#f9efd2; }
      .kicker{ font-family:'Laila'; font-weight:600; font-size:28px; color:#7c6238; margin-top:32px; }
      .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.6; color:#48371e; text-align:center; }
      .profile b{ color:#a85a28; font-weight:700; }
      .brand{ color:#b0975e; } .pageno{ color:#a8905a; }` },

    slate: { name: 'Slate & Chalk', chip: '#edf0e7', bg: '#24332d', arrow: '#9fb0a5',
      graphic: `<div style="position:absolute;top:120px;left:60%;width:420px;height:300px;background:radial-gradient(closest-side,rgba(255,255,255,.05),transparent);transform:rotate(-9deg);"></div><div style="position:absolute;bottom:180px;left:-60px;width:520px;height:120px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.045),transparent);transform:rotate(-5deg);"></div>`,
      css: `
      .slide{ background:#24332d; color:#d6dbd1; }
      .kickline .rule{ width:56px; height:2px; background:rgba(237,240,231,.55); border-radius:2px; }
      .kickline .kt{ font-family:'Poppins'; font-weight:550; font-size:21px; letter-spacing:.2em; text-transform:uppercase; color:#b9c6bb; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:70px; line-height:1.36; letter-spacing:.5px; color:#edf0e7; text-shadow:0 0 14px rgba(237,240,231,.14); }
      .hook b{ color:#edf0e7; font-weight:600; background:linear-gradient(transparent 82%, rgba(237,240,231,.42) 82%); }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:30px; color:#9fb0a5; margin-top:36px; line-height:1.58; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#d6dbd1; letter-spacing:.3px; }
      .body b, .poem b{ color:#f2f4ec; font-weight:550; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:27px; color:#edf0e7; border:2px solid rgba(237,240,231,.5); border-radius:50%; width:56px; height:56px; display:inline-flex; align-items:center; justify-content:center; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f2f4ec; text-align:center; }
      .bubble{ border:2px dashed rgba(237,240,231,.30); border-radius:10px; padding:52px 54px; }
      .kicker{ font-family:'Laila'; font-weight:500; font-size:28px; color:#9fb0a5; margin-top:32px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.6; color:#d6dbd1; text-align:center; }
      .profile b{ color:#edf0e7; font-weight:600; }
      .brand{ color:#728279; letter-spacing:2px; } .pageno{ color:#728279; }` },

    oneline: { name: 'One-Line Verdict', chip: '#1d1a16', bg: '#fbfaf4', arrow: '#b39c74',
      graphic: `<div style="position:absolute;left:50%;transform:translateX(-50%);bottom:210px;width:34px;height:2px;background:#b39c74;"></div>`,
      css: `
      .slide{ background:#fbfaf4; color:#1d1a16; }
      .mid{ justify-content:center; }
      .kickline{ justify-content:center; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:550; font-size:20px; letter-spacing:.26em; text-transform:uppercase; color:#b39c74; }
      .hook{ font-family:'Laila','Georgia',serif; font-weight:520; font-size:84px; line-height:1.4; color:#1d1a16; text-align:center; }
      .hook b{ color:#1d1a16; font-weight:650; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:28px; color:#8f877a; margin-top:44px; line-height:1.6; text-align:center; }
      .body{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:56px; line-height:1.6; color:#2a2620; text-align:center; }
      .body b, .poem b{ color:#1d1a16; font-weight:650; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:30px; color:#b39c74; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:450; font-size:66px; line-height:1.66; color:#1d1a16; text-align:center; }
      .bubble{ border:0; padding:40px 30px; }
      .kicker{ font-family:'Poppins'; font-weight:550; font-size:22px; color:#8f877a; margin-top:34px; letter-spacing:2px; text-align:center; }
      .profile{ font-family:'Poppins'; font-weight:350; font-size:37px; line-height:1.62; color:#2a2620; text-align:center; }
      .profile b{ color:#1d1a16; font-weight:650; }
      .brand{ color:#b3ab9c; letter-spacing:3px; } .pageno{ color:#b3ab9c; }` },

    smoke: { name: 'Smoke Room', chip: '#c9c4bb', bg: '#0e0d0c', arrow: '#6e6a63',
      graphic: `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0"><path d="M770 1350 C 740 1130, 850 1010, 790 850 C 745 730, 830 640, 800 520" fill="none" stroke="rgba(214,208,196,.14)" stroke-width="26" stroke-linecap="round" style="filter:blur(14px)"/><path d="M790 1350 C 775 1180, 845 1080, 810 940" fill="none" stroke="rgba(214,208,196,.10)" stroke-width="10" stroke-linecap="round" style="filter:blur(6px)"/></svg><div style="position:absolute;bottom:-140px;left:-120px;width:560px;height:420px;background:radial-gradient(closest-side,rgba(201,175,134,.07),transparent);"></div>`,
      css: `
      .slide{ background:#0e0d0c; color:#a8a49b; }
      .kickline .rule{ width:38px; height:1px; background:#6e6a63; }
      .kickline .kt{ font-family:'Poppins'; font-weight:450; font-size:20px; letter-spacing:.24em; text-transform:uppercase; color:#8d887e; }
      .hook{ font-family:'Laila','Georgia',serif; font-weight:340; font-size:70px; line-height:1.48; color:#e6e2d8; }
      .hook .lat{ font-style:italic; }
      .hook b{ color:#f2eee2; font-weight:550; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7c786f; margin-top:40px; line-height:1.6; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:46px; line-height:1.66; color:#b5b1a6; }
      .body b, .poem b{ color:#f2eee2; font-weight:500; }
      .body .num{ font-family:'Laila',serif; font-weight:500; font-size:38px; color:#c9af86; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:340; font-size:64px; line-height:1.68; color:#eae6da; text-align:center; }
      .bubble{ border:1px solid #262420; border-radius:10px; padding:54px 56px; background:rgba(255,255,255,.02); }
      .kicker{ font-family:'Laila'; font-weight:400; font-size:28px; color:#8d887e; margin-top:32px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#b5b1a6; text-align:center; }
      .profile b{ color:#e6e2d8; font-weight:550; }
      .brand{ color:#57534c; letter-spacing:3px; } .pageno{ color:#57534c; }` },

    doubt: { name: 'Doubt Clinic', chip: '#177a5b', bg: '#f4f1ea', arrow: '#177a5b',
      graphic: `<div style="position:absolute;top:110px;right:96px;font-family:Georgia,serif;font-size:300px;line-height:1;color:rgba(23,122,91,.06);">?</div>`,
      css: `
      .slide{ background:#f4f1ea; color:#2b2924; }
      .kickline .rule{ width:46px; height:2px; background:#177a5b; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:20px; letter-spacing:.18em; text-transform:uppercase; color:#177a5b; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:560; font-size:66px; line-height:1.36; letter-spacing:-.3px; color:#22201b; }
      .hook b{ color:#177a5b; font-weight:650; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7a756a; margin-top:38px; line-height:1.58; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:350; font-size:45px; line-height:1.62; color:#3a3730; }
      .body b, .poem b{ color:#177a5b; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:650; font-size:30px; color:#177a5b; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:450; font-size:62px; line-height:1.62; color:#22201b; text-align:center; }
      .bubble{ border:1px solid #ddd6c6; border-radius:14px; padding:52px 54px; background:#faf8f1; }
      .kicker{ font-family:'Poppins'; font-weight:550; font-size:23px; color:#7a756a; margin-top:30px; letter-spacing:1px; }
      .profile{ font-family:'Poppins'; font-weight:350; font-size:37px; line-height:1.6; color:#3a3730; text-align:center; }
      .profile b{ color:#177a5b; font-weight:650; }
      .brand{ color:#a9a496; } .pageno{ color:#a9a496; }` },

    invitation: { name: 'Invitation Card', chip: '#c8a35c', bg: '#161411', arrow: '#c8a35c',
      graphic: `<div style="position:absolute;top:96px;left:50%;transform:translateX(-50%);width:70px;height:1.5px;background:rgba(200,163,92,.6);"></div><div style="position:absolute;bottom:96px;left:50%;transform:translateX(-50%);width:70px;height:1.5px;background:rgba(200,163,92,.6);"></div>`,
      css: `
      .slide{ background:#161411; color:#cfc8b8; }
      .mid{ justify-content:center; }
      .kickline{ justify-content:center; } .kickline .rule{ width:0; }
      .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:20px; letter-spacing:.3em; text-transform:uppercase; color:#c8a35c; }
      .hook{ font-family:'Laila','Georgia',serif; font-weight:480; font-size:68px; line-height:1.42; color:#efe9da; text-align:center; }
      .hook b{ color:#c8a35c; font-weight:600; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#938d7d; margin-top:38px; line-height:1.6; text-align:center; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#cfc8b8; text-align:center; }
      .body b, .poem b{ color:#efe9da; font-weight:550; }
      .body .num{ font-family:'Laila',serif; font-weight:500; font-size:36px; color:#c8a35c; }
      .poem{ font-family:'Laila','Georgia',serif; font-weight:420; font-size:62px; line-height:1.66; color:#efe9da; text-align:center; }
      .bubble{ border:1px solid rgba(200,163,92,.35); border-radius:6px; padding:56px 58px; }
      .kicker{ font-family:'Poppins'; font-weight:500; font-size:22px; color:#938d7d; margin-top:32px; letter-spacing:2px; text-align:center; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#cfc8b8; text-align:center; }
      .profile b{ color:#c8a35c; font-weight:600; }
      .brand{ color:#6e6858; letter-spacing:3px; } .pageno{ color:#6e6858; }` },

    /* ---------- Artist Fleet waves 1+2 (2026-07-08): 36 looks, master-reviewed ---------- */
    witness: { name: 'Witness Room', chip: '#e2cf9e', bg: '#14110c', arrow: '#e2cf9e',
  graphic: `<svg style="position:absolute;left:84px;bottom:104px;opacity:.5;" width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wtl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ead9ae" stop-opacity=".32"/><stop offset="1" stop-color="#ead9ae" stop-opacity=".03"/></linearGradient></defs><g transform="skewX(-16)"><rect x="60" y="0" width="300" height="250" fill="url(#wtl)"/><line x1="210" y1="0" x2="210" y2="250" stroke="#14110c" stroke-width="7"/><line x1="60" y1="125" x2="360" y2="125" stroke="#14110c" stroke-width="7"/></g></svg>`,
  css: `
  .slide{ background:#14110c; color:#cfc8ba; }
  .kickline .rule{ width:44px; height:1px; background:#e2cf9e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#e2cf9e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#ece5d4; }
  .hook b{ color:#e2cf9e; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8f887a; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.66; color:#cfc8ba; }
  .body b, .poem b{ color:#f0e9d8; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e2cf9e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#ece5d4; text-align:center; }
  .bubble{ border:1px solid #2a251c; border-radius:6px; padding:54px 56px; background:rgba(234,217,174,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f887a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#cfc8ba; text-align:center; }
  .profile b{ color:#e2cf9e; font-weight:500; }
  .brand{ color:#5c5545; letter-spacing:3px; } .pageno{ color:#5c5545; }` },

    ahamseal: { name: 'Aham Seal', chip: '#9c2b1f', bg: '#f2e9d6', arrow: '#9c2b1f',
  graphic: `<svg style="position:absolute;right:84px;top:88px;opacity:.55;" width="172" height="172" viewBox="0 0 172 172" xmlns="http://www.w3.org/2000/svg"><circle cx="86" cy="86" r="80" fill="none" stroke="#9c2b1f" stroke-width="2.5"/><circle cx="86" cy="86" r="65" fill="none" stroke="#9c2b1f" stroke-width="1" stroke-dasharray="2 6"/><text x="86" y="110" text-anchor="middle" font-family="Laila,Georgia,serif" font-size="56" fill="#9c2b1f">अहं</text></svg>`,
  css: `
  .slide{ background:#f2e9d6; color:#4a3d2d; }
  .kickline .rule{ width:44px; height:1px; background:#9c2b1f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#9c2b1f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#3b2f22; }
  .hook b{ color:#9c2b1f; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7c6f5c; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4a3d2d; }
  .body b, .poem b{ color:#9c2b1f; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#9c2b1f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#3b2f22; text-align:center; }
  .bubble{ border:1px solid #ddd0b4; border-radius:4px; padding:54px 56px; background:#ece1c9; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7c6f5c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4a3d2d; text-align:center; }
  .profile b{ color:#9c2b1f; font-weight:500; }
  .brand{ color:#a2937a; letter-spacing:3px; } .pageno{ color:#a2937a; }` },

    upanishad: { name: 'Upanishad Dawn', chip: '#e8b26b', bg: '#0b0e22', arrow: '#e8b26b',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:430px;background:linear-gradient(to top,rgba(226,166,98,.20),rgba(226,166,98,.05) 45%,rgba(226,166,98,0) 78%);"></div><div style="position:absolute;left:0;right:0;bottom:308px;height:1px;background:linear-gradient(90deg,rgba(238,190,120,0),rgba(238,190,120,.55) 30%,rgba(238,190,120,.55) 70%,rgba(238,190,120,0));"></div>`,
  css: `
  .slide{ background:#0b0e22; color:#c9c7d6; }
  .kickline .rule{ width:44px; height:1px; background:#e8b26b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#e8b26b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#edeaf2; }
  .hook b{ color:#e8b26b; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8d8ba0; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.66; color:#c9c7d6; }
  .body b, .poem b{ color:#f0ede6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e8b26b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#edeaf2; text-align:center; }
  .bubble{ border:1px solid #232748; border-radius:8px; padding:54px 56px; background:rgba(232,178,107,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d8ba0; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c9c7d6; text-align:center; }
  .profile b{ color:#e8b26b; font-weight:500; }
  .brand{ color:#565672; letter-spacing:3px; } .pageno{ color:#565672; }` },

    netineti: { name: 'Neti Neti', chip: '#a8422c', bg: '#f8f5ee', arrow: '#a8422c',
  graphic: `<div style="position:absolute;top:100px;left:96px;width:132px;height:2px;background:#a8422c;opacity:.45;transform:rotate(-3deg);"></div><div style="position:absolute;top:130px;left:122px;width:94px;height:2px;background:#a8422c;opacity:.28;transform:rotate(-3deg);"></div>`,
  css: `
  .slide{ background:#f8f5ee; color:#3d3a32; }
  .kickline .rule{ width:40px; height:1px; background:#a8422c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#a8422c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.46; color:#26241f; }
  .hook b{ color:#26241f; font-weight:500; text-decoration:line-through; text-decoration-color:rgba(168,66,44,.7); text-decoration-thickness:3px; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8a8577; margin-top:40px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.68; color:#3d3a32; }
  .body b, .poem b{ color:#a8422c; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a8422c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#26241f; text-align:center; }
  .bubble{ border:1px solid #e3ddcd; border-radius:2px; padding:56px 58px; background:#f1ede2; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a8577; margin-top:32px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3d3a32; text-align:center; }
  .profile b{ color:#a8422c; font-weight:500; }
  .brand{ color:#b3ad9c; letter-spacing:3px; } .pageno{ color:#b3ad9c; }` },

    kurukshetra: { name: 'Kurukshetra Dust', chip: '#cf9440', bg: '#1d1710', arrow: '#cf9440',
  graphic: `<div style="position:absolute;bottom:0;left:0;right:0;height:440px;background:linear-gradient(to top,rgba(207,148,64,.13),rgba(207,148,64,0));"></div><svg style="position:absolute;bottom:-300px;right:-260px;width:860px;height:860px;opacity:.2;" viewBox="0 0 860 860" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M110 640 A 400 400 0 0 1 812 486" stroke="#cf9440" stroke-width="2.5"/><path d="M160 600 A 340 340 0 0 1 760 470" stroke="#cf9440" stroke-width="1" opacity=".45"/></svg>`,
  css: `
  .slide{ background:#1d1710; color:#d6cab2; }
  .kickline .rule{ width:40px; height:1px; background:#cf9440; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#cf9440; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#efe5cf; }
  .hook b{ color:#cf9440; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#a89a7d; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#d6cab2; }
  .body b, .poem b{ color:#f4ead4; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#cf9440; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#efe5cf; text-align:center; }
  .bubble{ border:1px solid #3a3222; border-radius:8px; padding:54px 56px; background:rgba(207,148,64,.035); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#96896e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#d6cab2; text-align:center; }
  .profile b{ color:#cf9440; font-weight:500; }
  .brand{ color:#6a5f4c; letter-spacing:3px; } .pageno{ color:#6a5f4c; }` },

    manthan: { name: 'Manthan', chip: '#d4ad5e', bg: '#0a141f', arrow: '#d4ad5e',
  graphic: `<div style="position:absolute;bottom:0;left:0;right:0;height:380px;background:linear-gradient(to top,rgba(3,8,14,.8),rgba(3,8,14,0));"></div><svg style="position:absolute;top:0;right:70px;width:320px;height:1350px;opacity:.2;" viewBox="0 0 320 1350" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M160 1350 C 30 1090, 300 880, 165 630 C 55 425, 265 235, 175 40" stroke="#d4ad5e" stroke-width="2"/></svg>`,
  css: `
  .slide{ background:#0a141f; color:#c8d3da; }
  .kickline .rule{ width:40px; height:1px; background:#d4ad5e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#d4ad5e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#e8eef2; }
  .hook b{ color:#d4ad5e; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7c8b96; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c8d3da; }
  .body b, .poem b{ color:#f0f4f6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#d4ad5e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#e8eef2; text-align:center; }
  .bubble{ border:1px solid #223140; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7c8b96; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c8d3da; text-align:center; }
  .profile b{ color:#d4ad5e; font-weight:500; }
  .brand{ color:#4c5a64; letter-spacing:3px; } .pageno{ color:#4c5a64; }` },

    vanvaas: { name: 'Vanvaas', chip: '#a9c297', bg: '#101b13', arrow: '#a9c297',
  graphic: `<svg style="position:absolute;bottom:80px;right:90px;width:400px;height:620px;opacity:.34;" viewBox="0 0 400 620" xmlns="http://www.w3.org/2000/svg" fill="#a9c297"><ellipse cx="90" cy="588" rx="13" ry="21" opacity=".9"/><ellipse cx="165" cy="536" rx="12" ry="19" opacity=".75"/><ellipse cx="118" cy="470" rx="11" ry="17" opacity=".62"/><ellipse cx="192" cy="414" rx="10" ry="15" opacity=".5"/><ellipse cx="150" cy="350" rx="9" ry="13" opacity=".4"/><ellipse cx="220" cy="298" rx="8" ry="11" opacity=".3"/><ellipse cx="184" cy="238" rx="7" ry="10" opacity=".22"/><ellipse cx="248" cy="190" rx="6" ry="8" opacity=".15"/><ellipse cx="216" cy="136" rx="5" ry="7" opacity=".1"/><ellipse cx="272" cy="94" rx="4" ry="6" opacity=".06"/></svg>`,
  css: `
  .slide{ background:#101b13; color:#c9d2c2; }
  .kickline .rule{ width:40px; height:1px; background:#a9c297; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a9c297; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#e9eedf; }
  .hook b{ color:#a9c297; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#83907c; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c9d2c2; }
  .body b, .poem b{ color:#f1f4e9; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a9c297; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#e9eedf; text-align:center; }
  .bubble{ border:1px solid #263a29; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.02); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#83907c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c9d2c2; text-align:center; }
  .profile b{ color:#a9c297; font-weight:500; }
  .brand{ color:#51604d; letter-spacing:3px; } .pageno{ color:#51604d; }` },

    bhasma: { name: 'Bhasma', chip: '#96503a', bg: '#dad6cf', arrow: '#96503a',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:.05"><filter id="bhasmaGrainFull"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#bhasmaGrainFull)"/></svg><svg style="position:absolute;top:150px;left:-90px;width:1280px;height:340px;overflow:visible" viewBox="0 0 1280 340" fill="none"><defs><filter id="bhasmaAsh1" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="44"/></filter><filter id="bhasmaAsh2" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.12" numOctaves="3" seed="17"/><feDisplacementMap in="SourceGraphic" scale="60"/></filter><filter id="bhasmaAshTex" x="-10%" y="-40%" width="120%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.28" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18" result="d"/><feComponentTransfer in="d"><feFuncA type="linear" slope="0.9"/></feComponentTransfer></filter></defs><!-- wide faded halo --><g filter="url(#bhasmaAsh2)" opacity=".08"><path d="M0 190 C 310 96, 640 240, 950 150 S 1210 120, 1280 170" stroke="#57524c" stroke-width="190" stroke-linecap="round"/></g><!-- main rubbed stroke --><g filter="url(#bhasmaAsh1)" opacity=".12"><path d="M0 188 C 310 98, 640 236, 950 148 S 1210 118, 1280 168" stroke="#57524c" stroke-width="120" stroke-linecap="round"/></g><!-- dense core, dry-brush broken --><g filter="url(#bhasmaAshTex)" opacity=".15"><path d="M40 182 C 330 102, 620 228, 930 146 S 1190 120, 1250 164" stroke="#4a453f" stroke-width="48" stroke-linecap="round" stroke-dasharray="150 22 84 12 110 26"/></g><!-- ash specks drifting off the band --><g fill="#57524c"><circle cx="180" cy="92" r="2.6" opacity=".25"/><circle cx="262" cy="240" r="2" opacity=".2"/><circle cx="420" cy="252" r="3" opacity=".22"/><circle cx="505" cy="84" r="1.8" opacity=".16"/><circle cx="618" cy="262" r="2.4" opacity=".24"/><circle cx="700" cy="96" r="2" opacity=".14"/><circle cx="812" cy="230" r="2.8" opacity=".2"/><circle cx="905" cy="80" r="1.6" opacity=".14"/><circle cx="1010" cy="222" r="2.4" opacity=".18"/><circle cx="1105" cy="108" r="2" opacity=".12"/><circle cx="335" cy="66" r="1.6" opacity=".14"/><circle cx="742" cy="268" r="1.8" opacity=".16"/></g></svg>`,
  css: `
  .slide{ background:#dad6cf; color:#3a3733; }
  .kickline .rule{ width:40px; height:1px; background:#96503a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#96503a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#262421; }
  .hook b{ color:#96503a; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7d776f; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3a3733; }
  .body b, .poem b{ color:#191715; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#96503a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#262421; text-align:center; }
  .bubble{ border:1px solid #c3bcb1; border-radius:8px; padding:54px 56px; background:rgba(0,0,0,.028); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7d776f; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3a3733; text-align:center; }
  .profile b{ color:#96503a; font-weight:500; }
  .brand{ color:#a29b90; letter-spacing:3px; } .pageno{ color:#a29b90; }` },

    kohl: { name: 'Kohl Study', chip: '#c9a9a0', bg: '#0c0a0d', arrow: '#c9a9a0',
  graphic: `<svg style="position:absolute;top:0;left:0;height:100%;width:170px;opacity:.5;" viewBox="0 0 170 1350" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><filter id="kohlblur" x="-60%" y="-20%" width="240%" height="140%"><feGaussianBlur stdDeviation="34"/></filter></defs><ellipse cx="8" cy="240" rx="52" ry="330" fill="#2b2530" filter="url(#kohlblur)"/><ellipse cx="-4" cy="720" rx="64" ry="420" fill="#262029" filter="url(#kohlblur)"/><ellipse cx="10" cy="1180" rx="46" ry="300" fill="#2b2530" filter="url(#kohlblur)"/></svg>`,
  css: `
  .slide{ background:#0c0a0d; color:#d8d2c6; }
  .kickline .rule{ width:40px; height:1px; background:#c9a9a0; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#c9a9a0; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#efe9db; }
  .hook b{ color:#c9a9a0; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8b8580; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#d8d2c6; }
  .body b, .poem b{ color:#f3ede0; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c9a9a0; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#efe9db; text-align:center; }
  .bubble{ border:1px solid #2a2430; border-radius:8px; padding:54px 56px; background:rgba(201,169,160,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8b8580; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#d8d2c6; text-align:center; }
  .profile b{ color:#c9a9a0; font-weight:500; }
  .brand{ color:#59524f; letter-spacing:3px; } .pageno{ color:#59524f; }` },

    raatsyahi: { name: 'Raat Syahi', chip: '#a9bdd8', bg: '#080c16', arrow: '#a9bdd8',
  graphic: `<div style="position:absolute;top:150px;left:96px;right:96px;height:1px;background:linear-gradient(90deg,transparent,rgba(169,189,216,.55) 18%,rgba(226,236,248,.6) 50%,rgba(169,189,216,.55) 82%,transparent);opacity:.6;"></div>`,
  css: `
  .slide{ background:#080c16; color:#c9d0dc; }
  .kickline .rule{ width:40px; height:1px; background:#a9bdd8; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a9bdd8; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#e6ebf3; }
  .hook b{ color:#a9bdd8; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7d8698; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c9d0dc; }
  .body b, .poem b{ color:#eef2f8; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a9bdd8; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#e6ebf3; text-align:center; }
  .bubble{ border:1px solid #1a2233; border-radius:8px; padding:54px 56px; background:rgba(169,189,216,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7d8698; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c9d0dc; text-align:center; }
  .profile b{ color:#a9bdd8; font-weight:500; }
  .brand{ color:#4c5568; letter-spacing:3px; } .pageno{ color:#4c5568; }` },

    ember: { name: 'Ember Hearth', chip: '#dd9752', bg: '#0e0a07', arrow: '#dd9752',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:radial-gradient(ellipse 90% 100% at 50% 108%, rgba(221,151,82,.30), rgba(160,84,34,.12) 45%, transparent 72%);opacity:.6;"></div>`,
  css: `
  .slide{ background:#0e0a07; color:#d9cfc2; }
  .kickline .rule{ width:40px; height:1px; background:#dd9752; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#dd9752; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f0e7d9; }
  .hook b{ color:#dd9752; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#93867a; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#d9cfc2; }
  .body b, .poem b{ color:#f5ecdd; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#dd9752; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f0e7d9; text-align:center; }
  .bubble{ border:1px solid #2c211a; border-radius:8px; padding:54px 56px; background:rgba(221,151,82,.045); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#93867a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#d9cfc2; text-align:center; }
  .profile b{ color:#dd9752; font-weight:500; }
  .brand{ color:#5d5147; letter-spacing:3px; } .pageno{ color:#5d5147; }` },

    velvet: { name: 'Velvet Stage', chip: '#dcc19a', bg: '#150a0e', arrow: '#dcc19a',
  graphic: `<div style="position:absolute;left:0;right:0;top:0;height:760px;background:radial-gradient(ellipse 62% 55% at 50% 8%, rgba(240,228,204,.11), rgba(240,228,204,.04) 48%, transparent 74%);opacity:.6;"></div>`,
  css: `
  .slide{ background:#150a0e; color:#dcd2c1; }
  .kickline .rule{ width:40px; height:1px; background:#dcc19a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#dcc19a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f2e8d5; }
  .hook b{ color:#dcc19a; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#95857e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#dcd2c1; }
  .body b, .poem b{ color:#f6eeda; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#dcc19a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f2e8d5; text-align:center; }
  .bubble{ border:1px solid #33191f; border-radius:8px; padding:54px 56px; background:rgba(240,228,204,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#95857e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#dcd2c1; text-align:center; }
  .profile b{ color:#dcc19a; font-weight:500; }
  .brand{ color:#63524e; letter-spacing:3px; } .pageno{ color:#63524e; }` },

    morningpage: { name: 'Morning Page', chip: '#9a6a40', bg: '#fbf7ef', arrow: '#9a6a40',
  graphic: `<svg style="position:absolute;top:64px;right:70px;width:150px;height:150px;opacity:.13;" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#8a5a30" stroke-width="6" stroke-linecap="round" stroke-dasharray="205 38" transform="rotate(-34 50 50)"/><circle cx="50" cy="50" r="37" fill="none" stroke="#8a5a30" stroke-width="1.5" stroke-dasharray="150 80" transform="rotate(110 50 50)"/></svg>`,
  css: `
  .slide{ background:#fbf7ef; color:#4a4234; }
  .kickline .rule{ width:40px; height:1px; background:#9a6a40; }
  .kickline .kt{ font-family:'Courier New','Poppins',monospace; font-weight:600; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#9a6a40; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#352b1d; }
  .hook b{ color:#9a6a40; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8a8172; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4a4234; }
  .body b, .poem b{ color:#2e2517; font-weight:500; }
  .body .num{ font-family:'Courier New','Poppins',monospace; font-weight:700; font-size:30px; color:#9a6a40; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#352b1d; text-align:center; }
  .bubble{ border:1px solid #e4d9c2; border-radius:8px; padding:54px 56px; background:rgba(154,106,64,.05); }
  .kicker{ font-family:'Courier New','Poppins',monospace; font-weight:600; font-size:23px; color:#8a8172; margin-top:30px; letter-spacing:2.5px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4a4234; text-align:center; }
  .profile b{ color:#9a6a40; font-weight:500; }
  .brand{ color:#b3a68e; letter-spacing:3px; } .pageno{ color:#b3a68e; }` },

    cottonsky: { name: 'Cotton Sky', chip: '#7fa8c9', bg: '#fdfefe', arrow: '#6f9cc0',
  graphic: `<div style="position:absolute;top:0;left:0;right:0;height:430px;background:linear-gradient(180deg,rgba(176,207,231,.34),rgba(176,207,231,0));"></div>`,
  css: `
  .slide{ background:#fdfefe; color:#3d454f; }
  .kickline .rule{ width:40px; height:1px; background:#6f9cc0; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6f9cc0; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.48; color:#28313c; }
  .hook b{ color:#54809f; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8d97a1; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3d454f; }
  .body b, .poem b{ color:#222b35; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6f9cc0; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#28313c; text-align:center; }
  .bubble{ border:1px solid #dfe9f1; border-radius:10px; padding:54px 56px; background:rgba(176,207,231,.10); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d97a1; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3d454f; text-align:center; }
  .profile b{ color:#54809f; font-weight:500; }
  .brand{ color:#a9b4be; letter-spacing:3px; } .pageno{ color:#a9b4be; }` },

    chandni: { name: 'Chandni', chip: '#8ba7c7', bg: '#f6f8fa', arrow: '#6e8cb0',
  graphic: `<div style="position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:940px;height:940px;background:radial-gradient(circle,rgba(198,206,218,.42),rgba(198,206,218,0) 62%);"></div>`,
  css: `
  .slide{ background:#f6f8fa; color:#4b5260; }
  .kickline .rule{ width:40px; height:1px; background:#8ba7c7; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6e8cb0; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#3a4150; }
  .hook b{ color:#5f7fa6; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#98a0ac; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4b5260; }
  .body b, .poem b{ color:#333a48; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6e8cb0; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#3a4150; text-align:center; }
  .bubble{ border:1px solid #e0e5ec; border-radius:8px; padding:54px 56px; background:rgba(139,167,199,.07); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#98a0ac; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4b5260; text-align:center; }
  .profile b{ color:#5f7fa6; font-weight:500; }
  .brand{ color:#adb4bf; letter-spacing:3px; } .pageno{ color:#adb4bf; }` },

    postcard: { name: 'Post Card', chip: '#96522c', bg: '#f7f0df', arrow: '#96522c',
  graphic: `<svg style="position:absolute;top:70px;right:64px;width:168px;height:168px;opacity:.13;" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#6b4a2e" stroke-width="2"/><circle cx="50" cy="50" r="34" fill="none" stroke="#6b4a2e" stroke-width="1" stroke-dasharray="4 5"/></svg><div style="position:absolute;top:268px;right:64px;width:290px;opacity:.14;"><div style="height:1px;background:#6b4a2e;margin-bottom:36px;"></div><div style="height:1px;background:#6b4a2e;margin-bottom:36px;"></div><div style="height:1px;background:#6b4a2e;"></div></div>`,
  css: `
  .slide{ background:#f7f0df; color:#4e3b28; }
  .kickline .rule{ width:40px; height:1px; background:#96522c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#96522c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#3c2b19; }
  .hook b{ color:#96522c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#94836d; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4e3b28; }
  .body b, .poem b{ color:#332413; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#96522c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#3c2b19; text-align:center; }
  .bubble{ border:1px solid #e3d6ba; border-radius:6px; padding:54px 56px; background:rgba(107,74,46,.05); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#94836d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4e3b28; text-align:center; }
  .profile b{ color:#96522c; font-weight:500; }
  .brand{ color:#b5a486; letter-spacing:3px; } .pageno{ color:#b5a486; }` },

    attachthread: { name: 'Attachment Thread', chip: '#b04a44', bg: '#ede9e1', arrow: '#b04a44',
  graphic: `<svg viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:.55;"><path d="M148 236 C 430 330, 260 640, 560 810 S 880 1080, 932 1168" fill="none" stroke="#b04a44" stroke-width="2.5" stroke-linecap="round"/><circle cx="148" cy="236" r="7" fill="#b04a44"/><circle cx="932" cy="1168" r="7" fill="#b04a44"/><circle cx="148" cy="236" r="18" fill="none" stroke="#b04a44" stroke-width="1" opacity=".45"/><circle cx="932" cy="1168" r="18" fill="none" stroke="#b04a44" stroke-width="1" opacity=".45"/></svg>`,
  css: `
  .slide{ background:#ede9e1; color:#4a463e; }
  .kickline .rule{ width:40px; height:1px; background:#b04a44; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#b04a44; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.44; color:#2f2b25; }
  .hook b{ color:#b04a44; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8a857b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4a463e; }
  .body b, .poem b{ color:#2f2b25; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#b04a44; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2f2b25; text-align:center; }
  .bubble{ border:1px solid #ddd6c9; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a857b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4a463e; text-align:center; }
  .profile b{ color:#b04a44; font-weight:500; }
  .brand{ color:#a49d8f; letter-spacing:3px; } .pageno{ color:#a49d8f; }` },

    innerchild: { name: 'Inner Child Room', chip: '#cf7950', bg: '#f7ecdd', arrow: '#cf7950',
  graphic: `<div style="position:absolute;top:104px;right:112px;width:296px;height:520px;background:linear-gradient(180deg,rgba(238,196,130,.32),rgba(238,196,130,.05));transform:skewX(-7deg);border-radius:6px;"></div><svg viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:.5;"><path d="M120 1150 q 60 -9 118 -3 q 74 8 142 -2 q 58 -8 116 2 q 50 9 96 1" fill="none" stroke="#cf7950" stroke-width="6" stroke-linecap="round"/></svg>`,
  css: `
  .slide{ background:#f7ecdd; color:#5a4c3f; }
  .kickline .rule{ width:44px; height:5px; background:#cf7950; border-radius:3px; transform:rotate(-1.2deg); }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#cf7950; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.44; color:#453a30; }
  .hook b{ color:#cf7950; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8a7a68; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#5a4c3f; }
  .body b, .poem b{ color:#453a30; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#cf7950; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#453a30; text-align:center; }
  .bubble{ border:1px solid #e8d9c6; border-radius:10px; padding:54px 56px; background:rgba(255,252,246,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a8a78; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#5a4c3f; text-align:center; }
  .profile b{ color:#cf7950; font-weight:500; }
  .brand{ color:#a8987f; letter-spacing:3px; } .pageno{ color:#b3a18f; }` },

    triggerscan: { name: 'Trigger Scan', chip: '#c8705d', bg: '#f4eee7', arrow: '#c8705d',
  graphic: `<svg viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:.6;"><line x1="104" y1="180" x2="104" y2="1170" stroke="#dcccbc" stroke-width="1.5"/><circle cx="104" cy="360" r="26" fill="#c8705d" opacity=".14"/><circle cx="104" cy="360" r="7" fill="#c8705d" opacity=".55"/><circle cx="104" cy="700" r="26" fill="#c8705d" opacity=".14"/><circle cx="104" cy="700" r="7" fill="#c8705d" opacity=".55"/><circle cx="104" cy="1040" r="26" fill="#c8705d" opacity=".14"/><circle cx="104" cy="1040" r="7" fill="#c8705d" opacity=".55"/></svg>`,
  css: `
  .slide{ background:#f4eee7; color:#4d463c; }
  .kickline .rule{ width:40px; height:1px; background:#c8705d; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#c8705d; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.44; color:#3c362e; }
  .hook b{ color:#c8705d; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#948a7d; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4d463c; }
  .body b, .poem b{ color:#3c362e; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c8705d; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#3c362e; text-align:center; }
  .bubble{ border:1px solid #e4dacd; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#948a7d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4d463c; text-align:center; }
  .profile b{ color:#c8705d; font-weight:500; }
  .brand{ color:#a89d8d; letter-spacing:3px; } .pageno{ color:#a89d8d; }` },

    boundaryline: { name: 'Boundary Line', chip: '#7c5136', bg: '#f2ecdf', arrow: '#7c5136',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:512px;background:rgba(64,52,40,.05);"></div><div style="position:absolute;left:96px;right:96px;bottom:512px;height:3px;background:#3f3226;opacity:.6;"></div>`,
  css: `
  .slide{ background:#f2ecdf; color:#4f463a; }
  .kickline .rule{ width:40px; height:2px; background:#7c5136; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#7c5136; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.44; color:#383026; }
  .hook b{ color:#7c5136; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8f8574; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4f463a; }
  .body b, .poem b{ color:#383026; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7c5136; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#383026; text-align:center; }
  .bubble{ border:1px solid #ded4c2; border-radius:6px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f8574; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4f463a; text-align:center; }
  .profile b{ color:#7c5136; font-weight:500; }
  .brand{ color:#a79c87; letter-spacing:3px; } .pageno{ color:#a79c87; }` },

    mehfil: { name: 'Mehfil Candle', chip: '#e3b768', bg: '#1a1109', arrow: '#e3b768',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:800px;background:radial-gradient(62% 54% at 50% 100%, rgba(230,185,110,.20), rgba(230,185,110,.05) 55%, rgba(230,185,110,0) 78%);"></div><div style="position:absolute;bottom:96px;left:50%;transform:translateX(-50%);width:10px;height:22px;border-radius:50% 50% 42% 42%;background:rgba(244,214,150,.55);filter:blur(2px);"></div><div style="position:absolute;top:0;left:0;right:0;height:240px;background:linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,0));"></div>`,
  css: `
  .slide{ background:#1a1109; color:#ddd0b8; }
  .kickline .rule{ width:40px; height:1px; background:#e3b768; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e3b768; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f3e8d1; }
  .hook b{ color:#e3b768; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#a5947a; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#ddd0b8; }
  .body b, .poem b{ color:#f6ecd6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e3b768; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f0e4cb; text-align:center; }
  .bubble{ border:1px solid #33271a; border-radius:8px; padding:54px 56px; background:rgba(255,240,214,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a5947a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#ddd0b8; text-align:center; }
  .profile b{ color:#e3b768; font-weight:500; }
  .brand{ color:#6b5b45; letter-spacing:3px; } .pageno{ color:#6b5b45; }` },

    diwan: { name: 'Diwan Page', chip: '#14655a', bg: '#f3ecda', arrow: '#14655a',
  graphic: `<div style="position:absolute;top:42px;left:42px;right:42px;bottom:42px;border:2px solid rgba(20,101,90,.45);"></div><div style="position:absolute;top:56px;left:56px;right:56px;bottom:56px;border:1px solid rgba(20,101,90,.26);"></div>`,
  css: `
  .slide{ background:#f3ecda; color:#3c3222; }
  .kickline .rule{ width:40px; height:1px; background:#14655a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#14655a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#33291d; text-align:center; }
  .hook b{ color:#14655a; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8a7f6a; margin-top:36px; line-height:1.6; text-align:center; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3c3222; }
  .body b, .poem b{ color:#14655a; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#14655a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2f261b; text-align:center; }
  .bubble{ border:1px solid rgba(20,101,90,.28); border-radius:4px; padding:54px 56px; background:rgba(20,101,90,.045); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a7f6a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3c3222; text-align:center; }
  .profile b{ color:#14655a; font-weight:500; }
  .brand{ color:#a3987f; letter-spacing:3px; } .pageno{ color:#a3987f; }` },

    takhti: { name: 'Takhti', chip: '#ecd9a4', bg: '#52402e', arrow: '#ecd9a4',
  graphic: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(88deg, rgba(28,18,9,.10) 0 2px, rgba(28,18,9,0) 2px 62px, rgba(28,18,9,.06) 62px 64px, rgba(28,18,9,0) 64px 138px);opacity:.55;"></div><div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(0deg, rgba(24,15,7,.28), rgba(24,15,7,0));"></div>`,
  css: `
  .slide{ background:#52402e; color:#e6dcc7; }
  .kickline .rule{ width:40px; height:1px; background:#ecd9a4; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#ecd9a4; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f0e7d6; }
  .hook b{ color:#f7efdc; font-weight:500; background:linear-gradient(95deg, rgba(236,217,164,.75), rgba(236,217,164,.12)) no-repeat left 94% / 100% 7px; padding-bottom:6px; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#c4b295; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#e6dcc7; }
  .body b, .poem b{ color:#f7efdc; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#ecd9a4; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f0e7d6; text-align:center; }
  .bubble{ border:1px solid rgba(240,231,214,.16); border-radius:8px; padding:54px 56px; background:rgba(0,0,0,.14); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#c4b295; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#e6dcc7; text-align:center; }
  .profile b{ color:#ecd9a4; font-weight:500; }
  .brand{ color:#a08b6d; letter-spacing:3px; } .pageno{ color:#a08b6d; }` },

    radif: { name: 'Radif', chip: '#6f3760', bg: '#dcdade', arrow: '#6f3760',
  graphic: `<div style="position:absolute;right:96px;top:846px;width:132px;height:1px;background:rgba(111,55,96,.34);"></div><div style="position:absolute;right:96px;top:934px;width:132px;height:1px;background:rgba(111,55,96,.16);"></div>`,
  css: `
  .slide{ background:#dcdade; color:#35323c; }
  .kickline .rule{ width:40px; height:1px; background:#6f3760; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6f3760; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#2e2b35; }
  .hook b{ color:#6f3760; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7b7683; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#35323c; }
  .body b{ color:#6f3760; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6f3760; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2e2b35; text-align:center; }
  .poem b{ color:#6f3760; font-weight:500; text-shadow:0 1.15em 0 rgba(111,55,96,.12); }
  .bubble{ border:1px solid #c6c2cc; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7b7683; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#35323c; text-align:center; }
  .profile b{ color:#6f3760; font-weight:500; }
  .brand{ color:#9a95a3; letter-spacing:3px; } .pageno{ color:#9a95a3; }` },

    script: { name: 'Script Margin', chip: '#c98da0', bg: '#f8f8f5', arrow: '#a85c70',
  graphic: `<div style="position:absolute;top:0;bottom:0;left:0;width:10px;background:#c98da0;opacity:.28;"></div><div style="position:absolute;top:0;bottom:0;left:74px;width:1px;background:#c98da0;opacity:.45;"></div>`,
  css: `
  .slide{ background:#f8f8f5; color:#2b2e33; }
  .kickline .rule{ width:40px; height:1px; background:#a85c70; }
  .kickline .kt{ font-family:'Courier New','Courier',monospace; font-weight:700; font-size:22px; letter-spacing:.2em; text-transform:uppercase; color:#565b63; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#22252a; }
  .hook b{ color:#a85c70; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7d8188; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3a3d43; }
  .body b, .poem b{ color:#1c1f24; font-weight:500; }
  .body .num{ font-family:'Courier New','Courier',monospace; font-weight:700; font-size:30px; color:#a85c70; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#22252a; text-align:center; }
  .bubble{ border:1px solid #e0e1da; border-radius:4px; padding:54px 56px; background:#ffffff; }
  .kicker{ font-family:'Courier New','Courier',monospace; font-weight:700; font-size:22px; color:#7d8188; margin-top:30px; letter-spacing:2px; text-transform:uppercase; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3a3d43; text-align:center; }
  .profile b{ color:#a85c70; font-weight:500; }
  .brand{ color:#9a9ea5; letter-spacing:3px; } .pageno{ color:#9a9ea5; }` },

    greenroom: { name: 'Green Room', chip: '#e6b578', bg: '#26201b', arrow: '#e6b578',
  graphic: `<svg style="position:absolute;top:0;left:0;width:100%;height:220px;opacity:.55;" viewBox="0 0 1080 220" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="grBulb" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#f2d09a" stop-opacity=".85"/><stop offset="38%" stop-color="#e6b578" stop-opacity=".3"/><stop offset="100%" stop-color="#e6b578" stop-opacity="0"/></radialGradient></defs><circle cx="140" cy="4" r="78" fill="url(#grBulb)"/><circle cx="340" cy="4" r="78" fill="url(#grBulb)"/><circle cx="540" cy="4" r="78" fill="url(#grBulb)"/><circle cx="740" cy="4" r="78" fill="url(#grBulb)"/><circle cx="940" cy="4" r="78" fill="url(#grBulb)"/><circle cx="140" cy="4" r="9" fill="#f2d9ab" opacity=".8"/><circle cx="340" cy="4" r="9" fill="#f2d9ab" opacity=".8"/><circle cx="540" cy="4" r="9" fill="#f2d9ab" opacity=".8"/><circle cx="740" cy="4" r="9" fill="#f2d9ab" opacity=".8"/><circle cx="940" cy="4" r="9" fill="#f2d9ab" opacity=".8"/></svg>`,
  css: `
  .slide{ background:#26201b; color:#d9cec0; }
  .kickline .rule{ width:40px; height:1px; background:#e6b578; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e6b578; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f0e6d6; }
  .hook b{ color:#e6b578; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#948a7d; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#d9cec0; }
  .body b, .poem b{ color:#f5ecdc; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e6b578; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f0e6d6; text-align:center; }
  .bubble{ border:1px solid #3c332a; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#948a7d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#d9cec0; text-align:center; }
  .profile b{ color:#e6b578; font-weight:500; }
  .brand{ color:#6d6357; letter-spacing:3px; } .pageno{ color:#6d6357; }` },

    roughcut: { name: 'Rough Cut', chip: '#e0973c', bg: '#0b0b0d', arrow: '#e0973c',
  graphic: `<svg style="position:absolute;left:0;right:0;bottom:150px;width:100%;height:120px;opacity:.55;" viewBox="0 0 1080 120" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="28" x2="1080" y2="28" stroke="#2b2b30" stroke-width="1"/><line x1="0" y1="92" x2="1080" y2="92" stroke="#2b2b30" stroke-width="1"/><rect x="90" y="38" width="240" height="44" fill="none" stroke="#33333a" stroke-width="1.5"/><rect x="390" y="38" width="240" height="44" fill="none" stroke="#33333a" stroke-width="1.5"/><rect x="690" y="38" width="240" height="44" fill="none" stroke="#33333a" stroke-width="1.5"/><line x1="472" y1="6" x2="472" y2="114" stroke="#e0973c" stroke-width="3"/><path d="M462 0 L482 0 L472 14 Z" fill="#e0973c"/></svg>`,
  css: `
  .slide{ background:#0b0b0d; color:#c9c7c1; }
  .kickline .rule{ width:40px; height:1px; background:#e0973c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e0973c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#ebe8e0; }
  .hook b{ color:#e0973c; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#85837e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c9c7c1; }
  .body b, .poem b{ color:#f0ede4; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e0973c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#ebe8e0; text-align:center; }
  .bubble{ border:1px solid #232327; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#85837e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c9c7c1; text-align:center; }
  .profile b{ color:#e0973c; font-weight:500; }
  .brand{ color:#57565a; letter-spacing:3px; } .pageno{ color:#57565a; }` },

    ringlight: { name: 'Ring Light', chip: '#a2793c', bg: '#e8e4dd', arrow: '#a2793c',
  graphic: `<svg style="position:absolute;top:-170px;right:-210px;width:760px;height:760px;opacity:.45;" viewBox="0 0 760 760" xmlns="http://www.w3.org/2000/svg"><circle cx="380" cy="380" r="330" fill="none" stroke="#cbc2b2" stroke-width="34"/><circle cx="380" cy="380" r="330" fill="none" stroke="#f7f3ea" stroke-width="6" opacity=".7"/></svg>`,
  css: `
  .slide{ background:#e8e4dd; color:#3a3833; }
  .kickline .rule{ width:40px; height:1px; background:#a2793c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a2793c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#2e2c27; }
  .hook b{ color:#a2793c; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7c7970; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#45423c; }
  .body b, .poem b{ color:#26241f; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a2793c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2e2c27; text-align:center; }
  .bubble{ border:1px solid #d6d0c5; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.45); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7c7970; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#45423c; text-align:center; }
  .profile b{ color:#a2793c; font-weight:500; }
  .brand{ color:#a09a8e; letter-spacing:3px; } .pageno{ color:#a09a8e; }` },

    baarish: { name: 'Pehli Baarish', chip: '#2f7d72', bg: '#e8ddc5', arrow: '#2f7d72',
  graphic: `<div style="position:absolute;top:0;left:0;right:0;height:360px;background:linear-gradient(180deg,rgba(74,55,36,.22),rgba(74,55,36,.08) 58%,rgba(74,55,36,0));"></div><div style="position:absolute;top:0;left:17%;width:1px;height:310px;background:linear-gradient(180deg,rgba(58,42,26,.45),rgba(58,42,26,0));"></div><div style="position:absolute;top:0;left:39%;width:1px;height:210px;background:linear-gradient(180deg,rgba(58,42,26,.35),rgba(58,42,26,0));"></div><div style="position:absolute;top:0;left:64%;width:1px;height:280px;background:linear-gradient(180deg,rgba(47,125,114,.4),rgba(47,125,114,0));"></div><div style="position:absolute;top:0;left:85%;width:1px;height:180px;background:linear-gradient(180deg,rgba(58,42,26,.3),rgba(58,42,26,0));"></div>`,
  css: `
  .slide{ background:#e8ddc5; color:#4a3a2c; }
  .kickline .rule{ width:40px; height:1px; background:#2f7d72; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#2f7d72; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#33261a; }
  .hook b{ color:#2f7d72; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8d7c65; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#4a3a2c; }
  .body b, .poem b{ color:#241a10; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#2f7d72; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#33261a; text-align:center; }
  .bubble{ border:1px solid rgba(74,58,44,.18); border-radius:8px; padding:54px 56px; background:rgba(74,58,44,.045); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d7c65; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#4a3a2c; text-align:center; }
  .profile b{ color:#2f7d72; font-weight:600; }
  .brand{ color:#a3906f; letter-spacing:3px; } .pageno{ color:#a3906f; }` },

    loo: { name: 'Loo', chip: '#a8502a', bg: '#f4eddb', arrow: '#a8502a',
  graphic: `<svg style="position:absolute;top:44%;left:0;width:100%;height:280px;opacity:.4;" viewBox="0 0 1080 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M0 70 Q 90 48 180 70 T 360 70 T 540 70 T 720 70 T 900 70 T 1080 70" fill="none" stroke="#a8502a" stroke-width="1.5" opacity=".3"/><path d="M-60 190 Q 30 170 120 190 T 300 190 T 480 190 T 660 190 T 840 190 T 1020 190 T 1200 190" fill="none" stroke="#8a6a4d" stroke-width="1" opacity=".22"/></svg>`,
  css: `
  .slide{ background:#f4eddb; color:#584434; }
  .kickline .rule{ width:40px; height:1px; background:#a8502a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a8502a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#493729; }
  .hook b{ color:#a8502a; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#a38e74; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#584434; }
  .body b, .poem b{ color:#33261b; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a8502a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#493729; text-align:center; }
  .bubble{ border:1px solid rgba(88,68,52,.16); border-radius:8px; padding:54px 56px; background:rgba(168,80,42,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a38e74; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#584434; text-align:center; }
  .profile b{ color:#a8502a; font-weight:600; }
  .brand{ color:#b8a685; letter-spacing:3px; } .pageno{ color:#b8a685; }` },

    kohra: { name: 'Kohra', chip: '#5a7186', bg: '#dde2e6', arrow: '#5a7186',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:520px;background:linear-gradient(0deg,rgba(246,249,251,.6),rgba(246,249,251,.32) 45%,rgba(246,249,251,0));"></div><div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(0deg,rgba(251,253,254,.5),rgba(251,253,254,0));"></div>`,
  css: `
  .slide{ background:#dde2e6; color:#48525c; }
  .kickline .rule{ width:40px; height:1px; background:#5a7186; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5a7186; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#333d46; }
  .hook b{ color:#5a7186; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#79858f; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#59646e; }
  .body b, .poem b{ color:#2c353d; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5a7186; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#3d4750; text-align:center; }
  .bubble{ border:1px solid rgba(72,82,92,.16); border-radius:8px; padding:54px 56px; background:rgba(251,253,254,.35); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8b959e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#59646e; text-align:center; }
  .profile b{ color:#5a7186; font-weight:600; }
  .brand{ color:#9aa4ac; letter-spacing:3px; } .pageno{ color:#9aa4ac; }` },

    purnima: { name: 'Purnima', chip: '#e9e4d2', bg: '#0b0f1c', arrow: '#e9e4d2',
  graphic: `<div style="position:absolute;top:-270px;left:320px;width:440px;height:440px;border-radius:50%;background:#e9e4d2;opacity:.5;box-shadow:0 0 140px 50px rgba(233,228,210,.16);"></div>`,
  css: `
  .slide{ background:#0b0f1c; color:#c9cabc; }
  .kickline .rule{ width:40px; height:1px; background:#e9e4d2; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e9e4d2; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#eeeadb; }
  .hook b{ color:#e9e4d2; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7d8296; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c9cabc; }
  .body b, .poem b{ color:#f3f0e2; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e9e4d2; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#eeeadb; text-align:center; }
  .bubble{ border:1px solid #232a3d; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7d8296; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c9cabc; text-align:center; }
  .profile b{ color:#e9e4d2; font-weight:500; }
  .brand{ color:#565b6c; letter-spacing:3px; } .pageno{ color:#565b6c; }` },

    tapri: { name: 'Chai Tapri', chip: '#e5a54f', bg: '#2b2017', arrow: '#e5a54f',
  graphic: `<div style="position:absolute;left:-90px;bottom:-110px;width:430px;height:430px;border-radius:50%;background:radial-gradient(circle,rgba(232,164,74,.30) 0%,rgba(232,164,74,.10) 45%,transparent 68%);"></div><svg style="position:absolute;left:118px;bottom:150px;opacity:.26;" width="70" height="260" viewBox="0 0 70 260" fill="none"><path d="M36 260 C 14 210, 58 168, 32 112 C 14 72, 48 40, 34 0" stroke="#ecb679" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  css: `
  .slide{ background:linear-gradient(172deg,#31251a 0%,#291e14 58%,#2b1f13 100%); color:#ddceb8; }
  .kickline .rule{ width:40px; height:1px; background:#e5a54f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e5a54f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#f2e6cf; }
  .hook b{ color:#e5a54f; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#9c8c74; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#ddceb8; }
  .body b, .poem b{ color:#f6ecd8; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e5a54f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#f2e6cf; text-align:center; }
  .bubble{ border:1px solid #423325; border-radius:8px; padding:54px 56px; background:rgba(229,165,79,.05); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9c8c74; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#ddceb8; text-align:center; }
  .profile b{ color:#e5a54f; font-weight:500; }
  .brand{ color:#6f5f49; letter-spacing:3px; } .pageno{ color:#6f5f49; }` },

    localtrain: { name: 'Local Train', chip: '#e2ae5e', bg: '#1d252e', arrow: '#e2ae5e',
  graphic: `<div style="position:absolute;top:41%;left:0;right:0;height:104px;background:linear-gradient(90deg,transparent 0%,rgba(226,174,94,.14) 18%,rgba(242,198,122,.24) 52%,rgba(226,174,94,.10) 84%,transparent 100%);filter:blur(3px);"></div><svg style="position:absolute;top:0;right:150px;opacity:.14;" width="96" height="210" viewBox="0 0 96 210" fill="none"><line x1="48" y1="0" x2="48" y2="96" stroke="#c7ccd3" stroke-width="5"/><path d="M48 96 L24 172 Q48 196 72 172 Z" stroke="#c7ccd3" stroke-width="5" stroke-linejoin="round"/></svg>`,
  css: `
  .slide{ background:linear-gradient(180deg,#212a34 0%,#1a222b 100%); color:#c7ccd3; }
  .kickline .rule{ width:40px; height:1px; background:#e2ae5e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e2ae5e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#eaedf0; }
  .hook b{ color:#e2ae5e; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#828f9b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c7ccd3; }
  .body b, .poem b{ color:#f3f0e2; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e2ae5e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#eaedf0; text-align:center; }
  .bubble{ border:1px solid #2a3440; border-radius:8px; padding:54px 56px; background:rgba(226,174,94,.045); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#828f9b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c7ccd3; text-align:center; }
  .profile b{ color:#e2ae5e; font-weight:500; }
  .brand{ color:#545f6b; letter-spacing:3px; } .pageno{ color:#545f6b; }` },

    haveli: { name: 'Haveli Wall', chip: '#39456e', bg: '#ede4d0', arrow: '#39456e',
  graphic: `<svg style="position:absolute;top:0;left:0;width:1080px;height:430px;" viewBox="0 0 1080 430" preserveAspectRatio="none"><defs><filter id="haveliTear" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="26"/></filter><filter id="haveliTear2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.016 0.07" numOctaves="3" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34"/></filter><filter id="haveliPlasterGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0.10 0 0 0 0 0.12 0 0 0 0 0.22 0 0 0 .5 0"/><feComposite operator="in" in2="SourceGraphic"/></filter><clipPath id="haveliBandClip"><path d="M0 0 H1080 V266 C 998 298, 942 244, 856 284 C 764 328, 704 254, 612 294 C 522 332, 452 262, 356 298 C 268 330, 198 274, 116 306 C 66 326, 28 292, 0 312 Z"/></clipPath></defs><!-- deep layer (oldest plaster) — extended past canvas edges so displacement never exposes the top --><g filter="url(#haveliTear)"><path d="M-60 -60 H1140 V266 C 998 298, 942 244, 856 284 C 764 328, 704 254, 612 294 C 522 332, 452 262, 356 298 C 268 330, 198 274, 116 306 C 66 326, 28 292, -60 312 Z" fill="#39456e" fill-opacity=".50"/></g><!-- upper layer (newer coat) --><g filter="url(#haveliTear2)"><path d="M-60 -60 H1140 V148 C 970 180, 880 130, 770 164 C 650 200, 560 136, 440 170 C 330 200, 240 148, 130 178 C 80 192, 34 164, -60 182 Z" fill="#2f3a60" fill-opacity=".55"/></g><!-- grain lives INSIDE the band only --><g clip-path="url(#haveliBandClip)"><rect width="1080" height="430" fill="#39456e" opacity="0" /><rect width="1080" height="430" filter="url(#haveliPlasterGrain)" opacity=".22"/></g><!-- limewash highlight hugging the tear edge --><g filter="url(#haveliTear)"><path d="M0 312 C 28 292, 66 326, 116 306 C 198 274, 268 330, 356 298 C 452 262, 522 332, 612 294 C 704 254, 764 328, 856 284 C 942 244, 998 298, 1080 266" stroke="#f4ecd9" stroke-opacity=".65" stroke-width="3" fill="none"/></g><!-- soft shadow the plaster casts on the wall --><g filter="url(#haveliTear)"><path d="M0 318 C 28 298, 66 332, 116 312 C 198 280, 268 336, 356 304 C 452 268, 522 338, 612 300 C 704 260, 764 334, 856 290 C 942 250, 998 304, 1080 272" stroke="#4a4433" stroke-opacity=".18" stroke-width="10" fill="none" transform="translate(0 8)"/></g></svg>`,
  css: `
  .slide{ background:#ede4d0; color:#3d372a; }
  .kickline .rule{ width:40px; height:1px; background:#39456e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#2c3346; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#302b20; }
  .hook b{ color:#39456e; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8c8069; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3d372a; }
  .body b, .poem b{ color:#221e14; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#39456e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#302b20; text-align:center; }
  .bubble{ border:1px solid #d6c9ac; border-radius:8px; padding:54px 56px; background:rgba(57,69,110,.05); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8c8069; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3d372a; text-align:center; }
  .profile b{ color:#39456e; font-weight:500; }
  .brand{ color:#a09378; letter-spacing:3px; } .pageno{ color:#a09378; }` },

    dhaba: { name: 'Raat Dhaba', chip: '#f0b95e', bg: '#101a14', arrow: '#f0b95e',
  graphic: `<div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:720px;height:620px;background:radial-gradient(ellipse at 50% 0%,rgba(240,185,94,.24) 0%,rgba(240,185,94,.09) 42%,transparent 66%);clip-path:polygon(41% 0,59% 0,97% 100%,3% 100%);"></div><div style="position:absolute;top:26px;left:50%;transform:translateX(-50%);width:14px;height:14px;border-radius:50%;background:rgba(255,216,146,.5);box-shadow:0 0 22px 8px rgba(240,185,94,.28);"></div><svg style="position:absolute;right:30px;top:190px;opacity:.5;" width="36" height="640" viewBox="0 0 36 640" fill="none"><circle cx="18" cy="20" r="7" fill="#f0b95e" fill-opacity=".9"/><circle cx="14" cy="210" r="6" fill="#f0b95e" fill-opacity=".55"/><circle cx="20" cy="410" r="7" fill="#f0b95e" fill-opacity=".8"/><circle cx="15" cy="610" r="6" fill="#f0b95e" fill-opacity=".5"/></svg>`,
  css: `
  .slide{ background:linear-gradient(178deg,#121d16 0%,#0e1811 100%); color:#c8d1c6; }
  .kickline .rule{ width:40px; height:1px; background:#f0b95e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#f0b95e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#edf0e6; }
  .hook b{ color:#f0b95e; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7e8b7e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#c8d1c6; }
  .body b, .poem b{ color:#f2f2e4; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#f0b95e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#edf0e6; text-align:center; }
  .bubble{ border:1px solid #223028; border-radius:8px; padding:54px 56px; background:rgba(240,185,94,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7e8b7e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#c8d1c6; text-align:center; }
  .profile b{ color:#f0b95e; font-weight:500; }
  .brand{ color:#59645a; letter-spacing:3px; } .pageno{ color:#59645a; }` },

    /* ---------- Artist Fleet wave 3 (2026-07-09): 36 looks from D18/D19 concepts + 2 originals, master-curated ---------- */
    tanpuraDrone: { name: 'Tanpura Drone', chip: '#B28A49', bg: '#120F0B', arrow: '#B28A49',
  graphic: `<div style="position:absolute;top:0;bottom:0;left:86%;width:1px;background:rgba(178,138,73,.42);"></div><div style="position:absolute;top:0;bottom:0;left:89%;width:1px;background:rgba(178,138,73,.26);"></div><svg style="position:absolute;left:50%;transform:translateX(-50%);bottom:110px;" width="760" height="430" viewBox="0 0 760 430" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="380" cy="215" rx="356" ry="192" stroke="#B28A49" stroke-opacity=".10" stroke-width="1"/><ellipse cx="380" cy="215" rx="268" ry="140" stroke="#B28A49" stroke-opacity=".08" stroke-width="1"/><ellipse cx="380" cy="215" rx="182" ry="90" stroke="#B28A49" stroke-opacity=".06" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#120F0B; color:#CFC4AC; }
  .kickline .rule{ width:40px; height:1px; background:#B28A49; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B28A49; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#E8DDC4; }
  .hook b{ color:#B28A49; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8C8170; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#CFC4AC; }
  .body b, .poem b{ color:#F0E7D0; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B28A49; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#E8DDC4; text-align:center; }
  .bubble{ border:1px solid #2C251B; border-radius:8px; padding:54px 56px; background:rgba(232,221,196,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8C8170; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#CFC4AC; text-align:center; }
  .profile b{ color:#B28A49; font-weight:500; }
  .brand{ color:#5E5545; letter-spacing:3px; } .pageno{ color:#5E5545; }` },

    taalCycle: { name: 'Taal Cycle', chip: '#C64A32', bg: '#F6F0E4', arrow: '#C64A32',
  graphic: `<svg style="position:absolute;left:0;bottom:150px;" width="260" height="240" viewBox="0 0 260 240" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="41" r="5.5" fill="#C64A32"/><circle cx="36" cy="43" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="54" cy="47" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="72" cy="53" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="89" cy="61" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="105" cy="70" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="120" cy="80" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="135" cy="92" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="148" cy="105" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="160" cy="120" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="170" cy="135" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="179" cy="151" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="187" cy="168" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="193" cy="186" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="197" cy="204" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/><circle cx="199" cy="223" r="4" stroke="#2A2119" stroke-opacity=".28" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#F6F0E4; color:#4A3F32; }
  .kickline .rule{ width:40px; height:1px; background:#C64A32; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C64A32; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.46; color:#2A2119; }
  .hook b{ color:#C64A32; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7A6D5C; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.6; color:#4A3F32; }
  .body b, .poem b{ color:#2A2119; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C64A32; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#2A2119; text-align:center; }
  .bubble{ border:1px solid #DDD2BC; border-radius:8px; padding:54px 56px; background:rgba(42,33,25,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7A6D5C; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4A3F32; text-align:center; }
  .profile b{ color:#C64A32; font-weight:500; }
  .brand{ color:#A79A83; letter-spacing:3px; } .pageno{ color:#A79A83; }` },

    alaapBreath: { name: 'Alaap Breath', chip: '#C09366', bg: '#FBF7EF', arrow: '#C09366',
  graphic: `<svg style="position:absolute;left:0;top:33%;width:100%;" viewBox="0 0 1080 220" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 158 C 130 158, 210 122, 330 120 C 440 118, 500 168, 620 158 C 740 148, 800 98, 910 96 C 970 95, 1030 106, 1080 104" stroke="#C09366" stroke-opacity=".34" stroke-width="1.5"/></svg>`,
  css: `
  .slide{ background:#FBF7EF; color:#4E443B; }
  .kickline .rule{ width:40px; height:1px; background:#C09366; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C09366; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#332B25; }
  .hook b{ color:#C09366; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A7C6C; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4E443B; }
  .body b, .poem b{ color:#332B25; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C09366; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.74; color:#332B25; text-align:center; }
  .bubble{ border:1px solid #E3D9C8; border-radius:8px; padding:54px 56px; background:rgba(51,43,37,.02); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7C6C; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4E443B; text-align:center; }
  .profile b{ color:#C09366; font-weight:500; }
  .brand{ color:#B3A692; letter-spacing:3px; } .pageno{ color:#B3A692; }` },

    raagRegister: { name: 'Raag Register', chip: '#7B3E2A', bg: '#ECE4D2', arrow: '#7B3E2A',
  graphic: `<svg style="position:absolute;top:0;right:0;height:100%;" width="120" height="1350" viewBox="0 0 120 1350" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="36" y1="110" x2="36" y2="1240" stroke="#201913" stroke-opacity=".1" stroke-width="1"/><text x="58" y="220" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">सा</text><text x="58" y="380" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">रे</text><text x="58" y="540" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">ग</text><text x="58" y="700" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">म</text><text x="58" y="860" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">प</text><text x="58" y="1020" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">ध</text><text x="58" y="1180" font-family="Laila,serif" font-size="26" fill="#201913" fill-opacity=".08">नि</text></svg>`,
  css: `
  .slide{ background:#ECE4D2; color:#443A2E; }
  .kickline .rule{ width:40px; height:1px; background:rgba(32,25,19,.4); }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6E6250; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.46; color:#201913; }
  .hook b{ color:#201913; font-weight:500; background:linear-gradient(#7B3E2A,#7B3E2A) 0 100%/100% 3px no-repeat; padding-bottom:6px; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6E6250; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.6; color:#443A2E; }
  .body b, .poem b{ color:#201913; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#201913; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#201913; text-align:center; }
  .bubble{ border:1px solid #D4C8AE; border-radius:8px; padding:54px 56px; background:rgba(32,25,19,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6E6250; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#443A2E; text-align:center; }
  .profile b{ color:#201913; font-weight:500; }
  .brand{ color:#9C8F76; letter-spacing:3px; } .pageno{ color:#9C8F76; }` },

    palmleafPothi: { name: 'Palmleaf Pothi', chip: '#8B2E1B', bg: '#D8C28E', arrow: '#8B2E1B',
  graphic: `<div style="position:absolute;top:0;left:0;right:0;height:10px;background:linear-gradient(180deg,rgba(48,37,21,.12),rgba(48,37,21,0));"></div><div style="position:absolute;bottom:0;left:0;right:0;height:10px;background:linear-gradient(0deg,rgba(48,37,21,.12),rgba(48,37,21,0));"></div><div style="position:absolute;top:189px;left:70px;width:262px;height:1px;background:rgba(48,37,21,.32);"></div><div style="position:absolute;top:176px;left:116px;width:26px;height:26px;border-radius:50%;border:1px solid rgba(48,37,21,.38);background:rgba(48,37,21,.10);"></div><div style="position:absolute;top:176px;left:240px;width:26px;height:26px;border-radius:50%;border:1px solid rgba(48,37,21,.38);background:rgba(48,37,21,.10);"></div>`,
  css: `
  .slide{ background:#D8C28E; color:#453521; }
  .kickline .rule{ width:40px; height:1px; background:rgba(48,37,21,.45); }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6E5C3E; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#302515; }
  .hook b{ color:#8B2E1B; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6E5C3E; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#453521; }
  .body b, .poem b{ color:#8B2E1B; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8B2E1B; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#302515; text-align:center; }
  .bubble{ border:1px solid rgba(48,37,21,.24); border-radius:6px; padding:54px 56px; background:rgba(255,248,230,.34); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6E5C3E; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#453521; text-align:center; }
  .profile b{ color:#8B2E1B; font-weight:500; }
  .brand{ color:#8A7550; letter-spacing:3px; } .pageno{ color:#8A7550; }` },

    cardCatalogue: { name: 'Card Catalogue', chip: '#6E8565', bg: '#F0E3C8', arrow: '#6E8565',
  graphic: `<div style="position:absolute;top:64px;right:64px;width:196px;border:1.5px solid rgba(74,86,66,.75);border-radius:3px;background:rgba(110,133,101,.10);padding:12px 16px 10px;text-align:center;"><div style="font-family:'Courier New',monospace;font-weight:500;font-size:22px;letter-spacing:2px;color:#3E4A38;">NO. DA·107</div><div style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:3px;color:#6B5D46;margin-top:4px;">SELF / MOH</div></div><div style="position:absolute;left:96px;right:96px;top:842px;height:64px;border-bottom:1px solid rgba(44,36,26,.22);"><span style="position:absolute;left:0;bottom:8px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:3px;color:#8B7D66;">VISHAY</span><span style="position:absolute;left:190px;bottom:8px;font-family:'Laila',serif;font-size:26px;color:#4A3E2C;">pehchaan · attachment</span></div><div style="position:absolute;left:96px;right:96px;top:906px;height:64px;border-bottom:1px solid rgba(44,36,26,.22);"><span style="position:absolute;left:0;bottom:8px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:3px;color:#8B7D66;">CROSS-REF</span><span style="position:absolute;left:190px;bottom:8px;font-family:'Laila',serif;font-size:26px;color:#4A3E2C;">dekho card DA·92</span></div><div style="position:absolute;left:96px;right:96px;top:970px;height:64px;border-bottom:1px solid rgba(44,36,26,.22);"><span style="position:absolute;left:0;bottom:8px;font-family:'Courier New',monospace;font-size:14px;letter-spacing:3px;color:#8B7D66;">FILED</span><span style="position:absolute;left:190px;bottom:8px;font-family:'Laila',serif;font-size:26px;color:#4A3E2C;">@doalfaaz archive</span></div><div style="position:absolute;left:50%;bottom:74px;transform:translateX(-50%);width:34px;height:34px;border-radius:50%;background:#E3D4B4;border:1.5px solid rgba(44,36,26,.28);box-shadow:inset 0 2px 4px rgba(44,36,26,.22);"></div>`,
  css: `
  .slide{ background:#F0E3C8; color:#3E3427; }
  .kickline .rule{ width:40px; height:1px; background:#556B4C; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#4A3E2C; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.46; color:#1D1710; }
  .hook b{ color:#3E5236; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6B5D46; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3E3427; }
  .body b, .poem b{ color:#2C241A; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5B7452; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2C241A; text-align:center; }
  .bubble{ border:1px solid rgba(44,36,26,.20); border-radius:4px; padding:54px 56px; background:rgba(255,250,238,.42); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6F6046; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3E3427; text-align:center; }
  .profile b{ color:#5B7452; font-weight:500; }
  .brand{ color:#94805C; letter-spacing:3px; } .pageno{ color:#94805C; }` },

    blueCarbon: { name: 'Blue Carbon', chip: '#315D9A', bg: '#E7EEF7', arrow: '#315D9A',
  graphic: ``,
  css: `
  .slide{ background:#E7EEF7; color:#2C3E50; }
  .kickline .rule{ width:40px; height:1px; background:#315D9A; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5A6B7D; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#192B3A; }
  .hook b{ color:#315D9A; font-weight:500; text-shadow:2px 2px 0 rgba(49,93,154,.09); }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#5A6B7D; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#2C3E50; }
  .body b{ color:#192B3A; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#315D9A; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#192B3A; text-align:center; }
  .poem b{ color:#315D9A; font-weight:500; text-shadow:2px 2px 0 rgba(49,93,154,.09); }
  .bubble{ border:1px solid rgba(25,43,58,.14); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.45); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#5A6B7D; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#2C3E50; text-align:center; }
  .profile b{ color:#315D9A; font-weight:500; }
  .brand{ color:#8195A8; letter-spacing:3px; } .pageno{ color:#8195A8; }` },

    proofMargin: { name: 'Proof Margin', chip: '#496D8C', bg: '#FAF7EF', arrow: '#496D8C',
  graphic: `<div style="position:absolute;top:296px;left:74px;font-family:Georgia,serif;font-size:34px;line-height:1;color:#496D8C;opacity:.85;">^</div><div style="position:absolute;top:354px;left:70px;width:44px;height:1px;background:rgba(73,109,140,.6);"></div>`,
  css: `
  .slide{ background:#FAF7EF; color:#3A342C; }
  .kickline .rule{ width:40px; height:1px; background:rgba(36,32,27,.4); }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6A645A; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#24201B; }
  .hook b{ color:#496D8C; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6A645A; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3A342C; }
  .body b, .poem b{ color:#496D8C; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#496D8C; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#24201B; text-align:center; }
  .bubble{ border:1px solid rgba(36,32,27,.16); border-radius:6px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6A645A; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3A342C; text-align:center; }
  .profile b{ color:#496D8C; font-weight:500; }
  .brand{ color:#9B937F; letter-spacing:3px; } .pageno{ color:#9B937F; }` },

    ajrakhEdge: { name: 'Ajrakh Edge', chip: '#D58B5B', bg: '#111B27', arrow: '#D58B5B',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:36px;"><svg width="100%" height="36" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><defs><pattern id="ajrEdgeP" width="90" height="36" patternUnits="userSpaceOnUse"><rect width="90" height="36" fill="#0B121B"/><path d="M0 4.5h90" stroke="#D58B5B" stroke-width="1" opacity=".45"/><path d="M0 31.5h90" stroke="#D58B5B" stroke-width="1" opacity=".45"/><rect x="38" y="11" width="14" height="14" transform="rotate(45 45 18)" fill="none" stroke="#D58B5B" stroke-width="1.4" opacity=".8"/><circle cx="45" cy="18" r="2" fill="#EFE7D6" opacity=".6"/><circle cx="11" cy="18" r="2.4" fill="#D58B5B" opacity=".5"/><circle cx="79" cy="18" r="2.4" fill="#D58B5B" opacity=".5"/></pattern></defs><rect width="100%" height="36" fill="url(#ajrEdgeP)"/></svg></div>`,
  css: `
  .slide{ background:#111B27; color:#D9D2C2; }
  .kickline .rule{ width:40px; height:1px; background:#D58B5B; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#D58B5B; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:65px; line-height:1.5; color:#F3ECDB; }
  .hook b{ color:#D58B5B; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8C97A3; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#D9D2C2; }
  .body b, .poem b{ color:#EFE7D6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#D58B5B; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#F3ECDB; text-align:center; }
  .bubble{ border:1px solid #22303E; border-radius:8px; padding:54px 56px; background:rgba(239,231,214,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8C97A3; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#D9D2C2; text-align:center; }
  .profile b{ color:#D58B5B; font-weight:500; }
  .brand{ color:#586675; letter-spacing:3px; } .pageno{ color:#586675; }` },

    mirrorShard: { name: 'Mirror Shard', chip: '#7E9EB1', bg: '#F8F2E7', arrow: '#7E9EB1',
  graphic: `<div style="position:absolute;top:152px;right:72px;width:170px;height:170px;"><svg viewBox="0 0 170 170" width="170" height="170" xmlns="http://www.w3.org/2000/svg"><rect x="87" y="12" width="36" height="36" transform="rotate(45 105 30)" fill="#7E9EB1" fill-opacity=".13" stroke="#7E9EB1" stroke-opacity=".55" stroke-width="1"/><path d="M97 27l12-12" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".9"/><rect x="46" y="64" width="28" height="28" transform="rotate(45 60 78)" fill="#7E9EB1" fill-opacity=".13" stroke="#7E9EB1" stroke-opacity=".55" stroke-width="1"/><path d="M54 75l9-9" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".9"/><rect x="101" y="93" width="22" height="22" transform="rotate(45 112 104)" fill="#7E9EB1" fill-opacity=".13" stroke="#7E9EB1" stroke-opacity=".55" stroke-width="1"/><path d="M107 102l7-7" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".9"/></svg></div>`,
  css: `
  .slide{ background:#F8F2E7; color:#3A322A; }
  .kickline .rule{ width:40px; height:1px; background:#7E9EB1; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#7E9EB1; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:65px; line-height:1.5; color:#28201A; }
  .hook b{ color:#7E9EB1; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7B7264; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3A322A; }
  .body b, .poem b{ color:#28201A; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7E9EB1; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#28201A; text-align:center; }
  .bubble{ border:1px solid #E6DCCB; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7B7264; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3A322A; text-align:center; }
  .profile b{ color:#7E9EB1; font-weight:500; }
  .brand{ color:#A79D8B; letter-spacing:3px; } .pageno{ color:#A79D8B; }` },

    indigoVat: { name: 'Indigo Vat', chip: '#1F4E78', bg: '#F3F0E8', arrow: '#1F4E78',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:420px;overflow:hidden;pointer-events:none;"><svg width="100%" height="420" viewBox="0 0 1080 420" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><filter id="ivBloomB" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="30"/></filter></defs><path d="M-60 420 L-60 310 C40 262 140 338 265 296 C370 262 430 330 555 306 C670 286 715 214 830 256 C930 292 1000 246 1140 300 L1140 420 Z" fill="#1F4E78" opacity=".16" filter="url(#ivBloomB)"/></svg></div>`,
  css: `
  .slide{ background:#F3F0E8; color:#33384A; }
  .kickline .rule{ width:40px; height:1px; background:#1F4E78; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#1F4E78; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#202533; }
  .hook b{ color:#1F4E78; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6E7480; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#33384A; }
  .body b, .poem b{ color:#202533; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#1F4E78; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#202533; text-align:center; }
  .bubble{ border:1px solid #DFDACC; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6E7480; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#33384A; text-align:center; }
  .profile b{ color:#1F4E78; font-weight:500; }
  .brand{ color:#9B9789; letter-spacing:3px; } .pageno{ color:#9B9789; }` },

    chikankariTrace: { name: 'Chikankari Trace', chip: '#C8BFA8', bg: '#FBFAF5', arrow: '#C8BFA8',
  graphic: `<div style="position:absolute;top:70px;left:70px;width:300px;height:220px;pointer-events:none;"><svg viewBox="0 0 300 220" width="300" height="220" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M9.5 178 C61.5 130 49.5 68 119.5 46 C169.5 30 207.5 54 237.5 32" stroke="#E9E4D6" stroke-width="2" stroke-dasharray="8 7"/><path d="M8 176 C60 128 48 66 118 44 C168 28 206 52 236 30" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8 7"/><path d="M118 44 c-13 -19 -6 -33 10 -39 c4 15 -2 29 -10 39 z" fill="#FFFFFF" stroke="#E9E4D6" stroke-width="1"/><path d="M46 132 c-10 -14 -5 -25 7 -30 c3 12 -1 22 -7 30 z" fill="#FFFFFF" stroke="#E9E4D6" stroke-width="1"/></g></svg></div>`,
  css: `
  .slide{ background:#FBFAF5; color:#413C33; }
  .kickline .rule{ width:40px; height:1px; background:#C8BFA8; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8A8578; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:64px; line-height:1.52; color:#2E2B26; }
  .hook b{ color:#2E2B26; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A8578; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.66; color:#413C33; }
  .body b, .poem b{ color:#2E2B26; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8A8578; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:59px; line-height:1.72; color:#2E2B26; text-align:center; }
  .bubble{ border:1px solid #ECE8DD; border-radius:8px; padding:54px 56px; background:#FFFFFF; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A8578; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#413C33; text-align:center; }
  .profile b{ color:#2E2B26; font-weight:500; }
  .brand{ color:#AFA893; letter-spacing:3px; } .pageno{ color:#AFA893; }` },

    lacBangle: { name: 'Lac Bangle', chip: '#B8322A', bg: '#241512', arrow: '#B8322A',
  graphic: `<div style="position:absolute;top:150px;right:-640px;width:960px;height:960px;border:1px solid rgba(184,50,42,.55);border-radius:50%;"></div><div style="position:absolute;top:170px;right:-620px;width:920px;height:920px;border:1px solid rgba(184,50,42,.28);border-radius:50%;"></div>`,
  css: `
  .slide{ background:#241512; color:#DCC6B2; }
  .kickline .rule{ width:40px; height:1px; background:#B8322A; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B8322A; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#F5E7D8; }
  .hook b{ color:#D65046; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#B39C89; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#DCC6B2; }
  .body b, .poem b{ color:#F5E7D8; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B8322A; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#F5E7D8; text-align:center; }
  .bubble{ border:1px solid #3E2A22; border-radius:8px; padding:54px 56px; background:rgba(245,231,216,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#B39C89; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#DCC6B2; text-align:center; }
  .profile b{ color:#D65046; font-weight:500; }
  .brand{ color:#7A5F4E; letter-spacing:3px; } .pageno{ color:#7A5F4E; }` },

    trunkKeyhole: { name: 'Trunk Keyhole', chip: '#B0773A', bg: '#211A15', arrow: '#B0773A',
  graphic: `<svg style="position:absolute;right:84px;bottom:170px;" width="118" height="162" viewBox="0 0 118 162"><rect x="0.5" y="0.5" width="117" height="161" rx="12" fill="rgba(176,119,58,.08)" stroke="rgba(176,119,58,.55)" stroke-width="1"/><circle cx="59" cy="64" r="16" fill="#211A15"/><path d="M51 74 L43 122 L75 122 L67 74 Z" fill="#211A15"/></svg>`,
  css: `
  .slide{ background:#211A15; color:#D6C3A4; }
  .kickline .rule{ width:40px; height:1px; background:#B0773A; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B0773A; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.48; color:#F1E1C6; }
  .hook b{ color:#CE9350; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#A9947A; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#D6C3A4; }
  .body b, .poem b{ color:#F1E1C6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B0773A; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#F1E1C6; text-align:center; }
  .bubble{ border:1px solid #3A2E23; border-radius:8px; padding:54px 56px; background:rgba(241,225,198,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#A9947A; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#D6C3A4; text-align:center; }
  .profile b{ color:#CE9350; font-weight:500; }
  .brand{ color:#6E5B45; letter-spacing:3px; } .pageno{ color:#6E5B45; }` },

    gramophoneGroove: { name: 'Gramophone Groove', chip: '#C79646', bg: '#160F0B', arrow: '#C79646',
  graphic: `<div style="position:absolute;left:-980px;top:75px;width:1200px;height:1200px;border:1px solid rgba(199,150,70,.4);border-radius:50%;"></div><div style="position:absolute;left:-1210px;top:-75px;width:1500px;height:1500px;border:1px solid rgba(199,150,70,.26);border-radius:50%;"></div><div style="position:absolute;left:-1450px;top:-225px;width:1800px;height:1800px;border:1px solid rgba(199,150,70,.16);border-radius:50%;"></div><div style="position:absolute;left:118px;top:604px;width:300px;height:1px;background:rgba(199,150,70,.55);transform:rotate(-16deg);transform-origin:left center;"></div><div style="position:absolute;left:403px;top:518px;width:5px;height:5px;border-radius:50%;background:rgba(199,150,70,.55);"></div>`,
  css: `
  .slide{ background:#160F0B; color:#D8C8A6; }
  .kickline .rule{ width:40px; height:1px; background:#C79646; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C79646; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#F2E5C9; }
  .hook b{ color:#E0B269; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#9C8B72; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#D8C8A6; }
  .body b, .poem b{ color:#F2E5C9; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C79646; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.72; color:#F2E5C9; text-align:center; }
  .bubble{ border:1px solid #332619; border-radius:8px; padding:54px 56px; background:rgba(242,229,201,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9C8B72; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#D8C8A6; text-align:center; }
  .profile b{ color:#E0B269; font-weight:500; }
  .brand{ color:#66573F; letter-spacing:3px; } .pageno{ color:#66573F; }` },

    telegramSlip: { name: 'Telegram Slip', chip: '#4C6B7A', bg: '#F3E9CF', arrow: '#241E16',
  graphic: `<div style="position:absolute;top:0;left:0;right:0;height:14px;background-image:radial-gradient(circle at 50% 0, rgba(36,30,22,.16) 7px, transparent 8px);background-size:77px 14px;background-repeat:repeat-x;"></div><div style="position:absolute;top:0;right:0;width:230px;height:230px;background:rgba(36,30,22,.04);clip-path:polygon(0 0,100% 0,100% 100%);"></div><div style="position:absolute;top:160px;right:-40px;width:320px;height:1px;background:rgba(36,30,22,.22);transform:rotate(-45deg);"></div><div style="position:absolute;top:140px;right:92px;padding:10px 20px;border:1px solid rgba(76,107,122,.65);color:rgba(76,107,122,.8);font-family:'Poppins';font-weight:500;font-size:15px;letter-spacing:.3em;text-transform:uppercase;transform:rotate(-6deg);">Received</div>`,
  css: `
  .slide{ background:#F3E9CF; color:#4A4133; }
  .kickline .rule{ width:40px; height:1px; background:#241E16; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#6E6350; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.46; color:#241E16; }
  .hook b{ color:#241E16; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6E6350; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4A4133; }
  .body b, .poem b{ color:#241E16; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#241E16; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#241E16; text-align:center; }
  .bubble{ border:1px solid #D9CBA8; border-radius:4px; padding:54px 56px; background:rgba(36,30,22,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6E6350; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4A4133; text-align:center; }
  .profile b{ color:#241E16; font-weight:500; }
  .brand{ color:#8A7A5C; letter-spacing:3px; } .pageno{ color:#8A7A5C; }` },

    banyanAerial: { name: 'Banyan Aerial', chip: '#5B6F43', bg: '#F1E8D4', arrow: '#5B6F43',
  graphic: `<svg style="position:absolute;top:0;right:0;width:420px;height:640px;" viewBox="0 0 420 640" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M300 0 C296 92 305 172 298 244" stroke="#2B261D" stroke-width="1.4" opacity=".5"/><path d="M298 244 C270 340 250 442 246 552" stroke="#2B261D" stroke-width="1" opacity=".36"/><path d="M298 244 C301 352 307 456 304 580" stroke="#2B261D" stroke-width="1" opacity=".36"/><path d="M298 244 C327 332 349 422 357 504" stroke="#2B261D" stroke-width="1" opacity=".36"/><circle cx="298" cy="244" r="3" fill="#5B6F43"/></svg>`,
  css: `
  .slide{ background:#F1E8D4; color:#3E372A; }
  .kickline .rule{ width:40px; height:1px; background:#5B6F43; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5B6F43; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#2B261D; }
  .hook b{ color:#5B6F43; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#6E6350; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#3E372A; }
  .body b, .poem b{ color:#2B261D; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5B6F43; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2B261D; text-align:center; }
  .bubble{ border:1px solid #DCCFAF; border-radius:8px; padding:54px 56px; background:rgba(43,38,29,.035); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6E6350; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#3E372A; text-align:center; }
  .profile b{ color:#5B6F43; font-weight:600; }
  .brand{ color:#9A8E76; letter-spacing:3px; } .pageno{ color:#9A8E76; }` },

    peepalShadow: { name: 'Peepal Shadow', chip: '#6F8F5F', bg: '#FAF7EF', arrow: '#6F8F5F',
  graphic: `<svg style="position:absolute;top:110px;right:-70px;width:520px;height:780px;transform:rotate(16deg);" viewBox="0 0 520 780" xmlns="http://www.w3.org/2000/svg"><path d="M260 46 C152 76 82 164 86 282 C90 400 170 472 240 522 C252 532 256 548 258 588 L262 712 C263 724 267 724 268 712 L272 588 C274 548 278 532 290 522 C360 472 440 400 444 282 C448 164 378 76 270 46 C266 45 264 45 260 46 Z" fill="#242018" opacity=".09"/><circle cx="265" cy="46" r="4" fill="#6F8F5F"/></svg>`,
  css: `
  .slide{ background:#FAF7EF; color:#413B2F; }
  .kickline .rule{ width:40px; height:1px; background:#6F8F5F; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6F8F5F; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#242018; }
  .hook b{ color:#6F8F5F; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7B7466; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#413B2F; }
  .body b, .poem b{ color:#242018; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6F8F5F; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#242018; text-align:center; }
  .bubble{ border:1px solid #E3DCC9; border-radius:8px; padding:54px 56px; background:rgba(36,32,24,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7B7466; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#413B2F; text-align:center; }
  .profile b{ color:#6F8F5F; font-weight:600; }
  .brand{ color:#A39B87; letter-spacing:3px; } .pageno{ color:#A39B87; }` },

    sundialNoon: { name: 'Sundial Noon', chip: '#B06D2F', bg: '#EFE0BC', arrow: '#B06D2F',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><path d="M540 1350 L540 1214 L586 1350 Z" fill="#2A2117" opacity=".8"/><path d="M540 1214 L98 272" stroke="#2A2117" stroke-width="1.2" opacity=".4"/><circle cx="98" cy="272" r="3.5" fill="#B06D2F"/></svg>`,
  css: `
  .slide{ background:#EFE0BC; color:#453824; }
  .kickline .rule{ width:40px; height:1px; background:#B06D2F; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B06D2F; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#2A2117; }
  .hook b{ color:#B06D2F; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#77664E; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#453824; }
  .body b, .poem b{ color:#2A2117; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B06D2F; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2A2117; text-align:center; }
  .bubble{ border:1px solid #D9C48F; border-radius:8px; padding:54px 56px; background:rgba(42,33,23,.045); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#77664E; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#453824; text-align:center; }
  .profile b{ color:#B06D2F; font-weight:600; }
  .brand{ color:#9C8A66; letter-spacing:3px; } .pageno{ color:#9C8A66; }` },

    brassCompass: { name: 'Brass Compass', chip: '#C99A45', bg: '#151719', arrow: '#C99A45',
  graphic: `<svg style="position:absolute;left:120px;bottom:240px;width:120px;height:210px;" viewBox="0 0 120 210" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 210 L51 186 L60 162 L69 186 Z" fill="#C99A45"/><path d="M60 162 L60 82" stroke="#C99A45" stroke-width="1.2"/><path d="M52 90 L60 82 L68 90" stroke="#C99A45" stroke-width="1.2" opacity=".8"/><circle cx="60" cy="197" r="2.5" fill="#151719"/></svg>`,
  css: `
  .slide{ background:#151719; color:#CFC8B6; }
  .kickline .rule{ width:40px; height:1px; background:#C99A45; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C99A45; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#EEE4CE; }
  .hook b{ color:#C99A45; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8E8875; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#CFC8B6; }
  .body b, .poem b{ color:#F3EBD8; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C99A45; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#EEE4CE; text-align:center; }
  .bubble{ border:1px solid #2A2E34; border-radius:8px; padding:54px 56px; background:rgba(238,228,206,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8E8875; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#CFC8B6; text-align:center; }
  .profile b{ color:#C99A45; font-weight:500; }
  .brand{ color:#5F6470; letter-spacing:3px; } .pageno{ color:#5F6470; }` },

    malaCount: { name: 'Mala Count', chip: '#A65A3A', bg: '#EFE8D9', arrow: '#A65A3A',
  graphic: `<svg style="position:absolute;top:0;right:30px;width:64px;height:1350px;" viewBox="0 0 64 1350" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="44" cy="160" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="38" cy="254" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="34" cy="348" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="29" cy="442" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="26" cy="536" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="24" cy="630" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="24" cy="724" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="26" cy="818" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="29" cy="912" r="5.5" fill="#A65A3A"/><circle cx="34" cy="1006" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="38" cy="1100" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/><circle cx="44" cy="1194" r="4" stroke="#2D261E" stroke-opacity=".28" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#EFE8D9; color:#2D261E; }
  .kickline .rule{ width:40px; height:1px; background:#A65A3A; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#A65A3A; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#2D261E; }
  .hook b{ color:#A65A3A; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A7E6C; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#4A4133; }
  .body b, .poem b{ color:#2D261E; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#A65A3A; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2D261E; text-align:center; }
  .bubble{ border:1px solid #DCD1B8; border-radius:8px; padding:54px 56px; background:rgba(45,38,30,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7E6C; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#4A4133; text-align:center; }
  .profile b{ color:#A65A3A; font-weight:500; }
  .brand{ color:#A99C85; letter-spacing:3px; } .pageno{ color:#A99C85; }` },

    templeBell: { name: 'Temple Bell', chip: '#C49A4F', bg: '#181310', arrow: '#C49A4F',
  graphic: `<svg style="position:absolute;top:0;right:330px;width:240px;height:300px;" viewBox="0 0 240 300" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#EDE1C7" stroke-opacity=".14" stroke-width="1"><line x1="120" y1="0" x2="120" y2="34"/><path d="M120,34 C162,34 196,68 196,152 L196,196 L44,196 L44,152 C44,68 78,34 120,34 Z"/><line x1="28" y1="196" x2="212" y2="196"/></g><circle cx="120" cy="226" r="5" fill="#C49A4F"/></svg>`,
  css: `
  .slide{ background:#181310; color:#D8CCB2; }
  .kickline .rule{ width:40px; height:1px; background:#C49A4F; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C49A4F; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#EDE1C7; }
  .hook b{ color:#C49A4F; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#9A8F7B; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#D8CCB2; }
  .body b, .poem b{ color:#F3EAD6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C49A4F; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#EDE1C7; text-align:center; }
  .bubble{ border:1px solid #2E2620; border-radius:8px; padding:54px 56px; background:rgba(237,225,199,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9A8F7B; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#D8CCB2; text-align:center; }
  .profile b{ color:#C49A4F; font-weight:500; }
  .brand{ color:#6B6151; letter-spacing:3px; } .pageno{ color:#6B6151; }` },

    shankhSpiral: { name: 'Shankh Spiral', chip: '#BC8B45', bg: '#F6F0E2', arrow: '#BC8B45',
  graphic: `<svg style="position:absolute;left:-48px;bottom:150px;width:238px;height:238px;" viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M40,170 A130,130 0 1 1 300,170 A105,105 0 1 1 90,170 A82,82 0 1 1 254,170 A60,60 0 1 1 134,170 A40,40 0 1 1 214,170 A22,22 0 1 1 170,170" stroke="#2C241A" stroke-opacity=".13" stroke-width="1.4"/><circle cx="170" cy="170" r="4.5" fill="#BC8B45"/></svg>`,
  css: `
  .slide{ background:#F6F0E2; color:#2C241A; }
  .kickline .rule{ width:40px; height:1px; background:#BC8B45; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#BC8B45; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#2C241A; }
  .hook b{ color:#BC8B45; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#877B64; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#483E2E; }
  .body b, .poem b{ color:#2C241A; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#BC8B45; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2C241A; text-align:center; }
  .bubble{ border:1px solid #E1D6BA; border-radius:8px; padding:54px 56px; background:rgba(44,36,26,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#877B64; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#483E2E; text-align:center; }
  .profile b{ color:#BC8B45; font-weight:500; }
  .brand{ color:#A79A7E; letter-spacing:3px; } .pageno{ color:#A79A7E; }` },

    aangan: { name: 'Aangan Rangoli', chip: '#B84A3F', bg: '#F5EDDC', arrow: '#B84A3F',
  graphic: `<svg style="position:absolute;right:56px;bottom:142px;width:180px;height:180px;" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg"><g fill="#3A2F22" fill-opacity=".14"><circle cx="10" cy="10" r="2.5"/><circle cx="50" cy="10" r="2.5"/><circle cx="90" cy="10" r="2.5"/><circle cx="130" cy="10" r="2.5"/><circle cx="170" cy="10" r="2.5"/><circle cx="10" cy="50" r="2.5"/><circle cx="50" cy="50" r="2.5"/><circle cx="90" cy="50" r="2.5"/><circle cx="130" cy="50" r="2.5"/><circle cx="170" cy="50" r="2.5"/><circle cx="10" cy="90" r="2.5"/><circle cx="50" cy="90" r="2.5"/><circle cx="90" cy="90" r="2.5"/><circle cx="130" cy="90" r="2.5"/><circle cx="170" cy="90" r="2.5"/><circle cx="10" cy="130" r="2.5"/><circle cx="90" cy="130" r="2.5"/><circle cx="130" cy="130" r="2.5"/><circle cx="170" cy="130" r="2.5"/><circle cx="10" cy="170" r="2.5"/><circle cx="50" cy="170" r="2.5"/><circle cx="90" cy="170" r="2.5"/><circle cx="130" cy="170" r="2.5"/><circle cx="170" cy="170" r="2.5"/></g><path d="M10,170 Q10,90 90,90" stroke="#3A2F22" stroke-opacity=".12" stroke-width="1"/><path d="M50,170 Q130,170 130,90" stroke="#3A2F22" stroke-opacity=".12" stroke-width="1"/><circle cx="50" cy="130" r="3" fill="#B84A3F"/></svg>`,
  css: `
  .slide{ background:#F5EDDC; color:#3A2F22; }
  .kickline .rule{ width:40px; height:1px; background:#B84A3F; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B84A3F; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#3A2F22; }
  .hook b{ color:#B84A3F; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8B7D66; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#524634; }
  .body b, .poem b{ color:#3A2F22; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B84A3F; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#3A2F22; text-align:center; }
  .bubble{ border:1px solid #E1D4B8; border-radius:8px; padding:54px 56px; background:rgba(58,47,34,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8B7D66; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#524634; text-align:center; }
  .profile b{ color:#B84A3F; font-weight:500; }
  .brand{ color:#A89980; letter-spacing:3px; } .pageno{ color:#A89980; }` },

    stepwellEcho: { name: 'Stepwell Echo', chip: '#7D5A38', bg: '#E8DDC7', arrow: '#7D5A38',
  graphic: `<div style="position:absolute;right:0;bottom:0;width:560px;height:660px;border-top:1px solid rgba(125,90,56,.36);border-left:1px solid rgba(125,90,56,.36);"></div><div style="position:absolute;right:0;bottom:0;width:452px;height:534px;border-top:1px solid rgba(125,90,56,.27);border-left:1px solid rgba(125,90,56,.27);"></div><div style="position:absolute;right:0;bottom:0;width:344px;height:408px;border-top:1px solid rgba(125,90,56,.19);border-left:1px solid rgba(125,90,56,.19);"></div><div style="position:absolute;right:0;bottom:0;width:236px;height:282px;border-top:1px solid rgba(125,90,56,.12);border-left:1px solid rgba(125,90,56,.12);"></div><div style="position:absolute;right:0;bottom:0;width:128px;height:156px;border-top:1px solid rgba(125,90,56,.07);border-left:1px solid rgba(125,90,56,.07);"></div>`,
  css: `
  .slide{ background:#E8DDC7; color:#3A3226; }
  .kickline .rule{ width:40px; height:1px; background:#7D5A38; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#7D5A38; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#2E261C; }
  .hook b{ color:#7D5A38; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6E6250; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3A3226; }
  .body b, .poem b{ color:#2E261C; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7D5A38; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2E261C; text-align:center; }
  .bubble{ border:1px solid #CBBD9F; border-radius:8px; padding:54px 56px; background:rgba(46,38,28,.035); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7C65; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3A3226; text-align:center; }
  .profile b{ color:#7D5A38; font-weight:500; }
  .brand{ color:#9A8C73; letter-spacing:3px; } .pageno{ color:#9A8C73; }` },

    ghatStone: { name: 'Ghat Stone', chip: '#8F5A37', bg: '#D8D0BF', arrow: '#8F5A37',
  graphic: `<svg style="position:absolute;left:0;bottom:0;width:1080px;height:560px;" viewBox="0 0 1080 560" preserveAspectRatio="none"><defs><linearGradient id="ghatSt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3C29C"/><stop offset=".08" stop-color="#C3B089"/><stop offset="1" stop-color="#AE9971"/></linearGradient><linearGradient id="ghatSt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CBB88F"/><stop offset=".08" stop-color="#BBA77E"/><stop offset="1" stop-color="#A38E66"/></linearGradient><linearGradient id="ghatSt3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C2AE83"/><stop offset=".08" stop-color="#B29D73"/><stop offset="1" stop-color="#96815B"/></linearGradient><filter id="ghatStoneGrain"><feTurbulence type="fractalNoise" baseFrequency="0.16 0.5" numOctaves="3" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 0.32 0 0 0 0 0.26 0 0 0 0 0.16 0 0 0 .4 0"/><feComposite operator="in" in2="SourceGraphic"/></filter></defs><!-- step 1 (highest) --><g><rect x="0" y="12" width="126" height="168" fill="url(#ghatSt1)"/><rect x="0" y="12" width="126" height="7" fill="#E7DBBB" opacity=".95"/><rect x="119" y="19" width="7" height="161" fill="#5f5138" opacity=".38"/><rect x="0" y="12" width="126" height="168" filter="url(#ghatStoneGrain)" opacity=".5"/><path d="M0 100 L82 96 L126 102" stroke="#6d5c40" stroke-width="1.6" fill="none" opacity=".35"/></g><!-- step 2 --><g><rect x="0" y="180" width="204" height="170" fill="url(#ghatSt2)"/><rect x="0" y="180" width="204" height="7" fill="#E7DBBB" opacity=".9"/><rect x="196" y="187" width="8" height="163" fill="#5f5138" opacity=".4"/><rect x="0" y="180" width="204" height="170" filter="url(#ghatStoneGrain)" opacity=".5"/><path d="M0 272 L120 266 L204 274" stroke="#6d5c40" stroke-width="1.6" fill="none" opacity=".32"/><path d="M88 187 L92 266" stroke="#6d5c40" stroke-width="1.3" opacity=".25"/><path d="M148 274 L150 350" stroke="#6d5c40" stroke-width="1.3" opacity=".22"/></g><!-- step 3 (widest, walks into the water) --><g><rect x="0" y="350" width="290" height="210" fill="url(#ghatSt3)"/><rect x="0" y="350" width="290" height="7" fill="#E7DBBB" opacity=".85"/><rect x="281" y="357" width="9" height="203" fill="#5f5138" opacity=".42"/><rect x="0" y="350" width="290" height="210" filter="url(#ghatStoneGrain)" opacity=".55"/><path d="M0 440 L168 434 L290 442" stroke="#6d5c40" stroke-width="1.6" fill="none" opacity=".3"/><path d="M128 357 L132 434" stroke="#6d5c40" stroke-width="1.3" opacity=".24"/><!-- old flood stain just above the waterline --><rect x="0" y="364" width="290" height="30" fill="#57503C" opacity=".12"/></g><!-- water: rust waterline + translucent wash below; the stone continues, darker, submerged --><line x1="0" y1="398" x2="1080" y2="398" stroke="#8F5A37" stroke-width="2.5" opacity=".8"/><rect x="0" y="400" width="1080" height="160" fill="#7A6F55" opacity=".10"/><rect x="0" y="400" width="290" height="160" fill="#4C4130" opacity=".16"/><!-- faint reflection of the step edge --><path d="M290 400 L286 476" stroke="#5f5138" stroke-width="2" opacity=".14"/><!-- ripples --><path d="M330 428 C 430 422 520 434 638 427" stroke="#8F5A37" stroke-width="1.4" opacity=".3" fill="none"/><path d="M470 470 C 570 464 660 476 798 468" stroke="#8F5A37" stroke-width="1.3" opacity=".18" fill="none"/><path d="M700 422 C 800 416 890 426 1028 420" stroke="#8F5A37" stroke-width="1.3" opacity=".22" fill="none"/><path d="M360 516 C 470 510 570 522 700 514" stroke="#8F5A37" stroke-width="1.2" opacity=".12" fill="none"/></svg>`,
  css: `
  .slide{ background:#D8D0BF; color:#37301F; }
  .kickline .rule{ width:40px; height:1px; background:#8F5A37; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8F5A37; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#201B14; }
  .hook b{ color:#8F5A37; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6B6151; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#37301F; }
  .body b, .poem b{ color:#201B14; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8F5A37; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#201B14; text-align:center; }
  .bubble{ border:1px solid #BDB29C; border-radius:8px; padding:54px 56px; background:rgba(32,27,20,.04); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#847863; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#37301F; text-align:center; }
  .profile b{ color:#8F5A37; font-weight:500; }
  .brand{ color:#938A74; letter-spacing:3px; } .pageno{ color:#938A74; }` },

    dehleezLine: { name: 'Dehleez Line', chip: '#9E3D2E', bg: '#F2E7D0', arrow: '#9E3D2E',
  graphic: `<div style="position:absolute;left:96px;bottom:190px;width:432px;height:1px;background:rgba(43,33,24,.34);"></div><div style="position:absolute;left:96px;bottom:190px;width:1px;height:412px;background:rgba(43,33,24,.34);"></div><div style="position:absolute;left:90px;bottom:184px;width:13px;height:13px;border-radius:50%;background:#9E3D2E;"></div>`,
  css: `
  .slide{ background:#F2E7D0; color:#41372B; }
  .kickline .rule{ width:40px; height:1px; background:#9E3D2E; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#9E3D2E; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#2B2118; }
  .hook b{ color:#9E3D2E; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#7A6C57; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#41372B; }
  .body b, .poem b{ color:#2B2118; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#9E3D2E; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2B2118; text-align:center; }
  .bubble{ border:1px solid #D8C9AB; border-radius:8px; padding:54px 56px; background:rgba(43,33,24,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#94856C; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#41372B; text-align:center; }
  .profile b{ color:#9E3D2E; font-weight:500; }
  .brand{ color:#A2937A; letter-spacing:3px; } .pageno{ color:#A2937A; }` },

    ittar: { name: 'Ittar', chip: '#C99552', bg: '#241A0F', arrow: '#C99552',
  graphic: `<svg style="position:absolute;left:92px;bottom:88px;width:220px;height:560px;" viewBox="0 0 220 560" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="itTrail" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#C99552" stop-opacity=".5"/><stop offset=".7" stop-color="#C99552" stop-opacity=".18"/><stop offset="1" stop-color="#C99552" stop-opacity="0"/></linearGradient></defs><path d="M100 412 C 132 348, 70 296, 100 228 C 128 168, 76 108, 96 28" stroke="url(#itTrail)" stroke-width="1"/><path d="M88 418 L88 440 L64 462 L58 522 L74 556 L126 556 L142 522 L136 462 L112 440 L112 418" stroke="#C99552" stroke-opacity=".55" stroke-width="1"/><path d="M64 462 L136 462 M64 462 L100 556 M136 462 L100 556" stroke="#C99552" stroke-opacity=".28" stroke-width="1"/><path d="M82 418 L118 418" stroke="#C99552" stroke-opacity=".55" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#241A0F; color:#D8CBB2; }
  .kickline .rule{ width:40px; height:1px; background:#C99552; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#C99552; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#EFE3CC; }
  .hook b{ color:#C99552; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#9D8D74; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#D8CBB2; }
  .body b, .poem b{ color:#F5EBD6; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#C99552; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#EFE3CC; text-align:center; }
  .bubble{ border:1px solid #3E3020; border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9D8D74; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#D8CBB2; text-align:center; }
  .profile b{ color:#C99552; font-weight:500; }
  .brand{ color:#6E5F49; letter-spacing:3px; } .pageno{ color:#6E5F49; }` },

    vagusThread: { name: 'Vagus Thread', chip: '#6D9B8C', bg: '#F8F2EA', arrow: '#6D9B8C',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><path d="M258 62 C 344 226 210 392 314 552 C 418 712 598 728 658 898 C 714 1056 850 1100 914 1290" stroke="#2B2420" stroke-opacity=".13" stroke-width="1.5"/><circle cx="306" cy="486" r="5" fill="#6D9B8C"/><circle cx="306" cy="486" r="11" stroke="#6D9B8C" stroke-opacity=".3"/><circle cx="646" cy="866" r="5" fill="#6D9B8C"/><circle cx="646" cy="866" r="11" stroke="#6D9B8C" stroke-opacity=".3"/><circle cx="886" cy="1200" r="5" fill="#6D9B8C"/><circle cx="886" cy="1200" r="11" stroke="#6D9B8C" stroke-opacity=".3"/></svg>`,
  css: `
  .slide{ background:#F8F2EA; color:#43392F; }
  .kickline .rule{ width:40px; height:1px; background:#B9AD9C; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8A7D6E; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:64px; line-height:1.48; color:#2B2420; }
  .hook b{ color:#4E7A6D; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A7D6E; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#43392F; }
  .body b, .poem b{ color:#2B2420; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6D9B8C; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:58px; line-height:1.72; color:#2B2420; text-align:center; }
  .bubble{ border:1px solid #E4D9C7; border-radius:10px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7D6E; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#43392F; text-align:center; }
  .profile b{ color:#4E7A6D; font-weight:500; }
  .brand{ color:#A99C8A; letter-spacing:3px; } .pageno{ color:#A99C8A; }` },

    breathingSquare: { name: 'Breathing Square', chip: '#7D9271', bg: '#EAF0E7', arrow: '#7D9271',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><rect x="724" y="812" width="252" height="252" rx="52" stroke="#7D9271" stroke-opacity=".55" stroke-width="1"/><path d="M712 800 L698 786 M988 800 L1002 786 M988 1076 L1002 1090 M712 1076 L698 1090" stroke="#7D9271" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  css: `
  .slide{ background:#EAF0E7; color:#3B4942; }
  .kickline .rule{ width:40px; height:1px; background:#C3CFBC; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6B7A70; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:64px; line-height:1.48; color:#22302B; }
  .hook b{ color:#5C7355; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#6B7A70; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#3B4942; }
  .body b, .poem b{ color:#22302B; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5C7355; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:58px; line-height:1.72; color:#22302B; text-align:center; }
  .bubble{ border:1px solid #D5DFD0; border-radius:10px; padding:54px 56px; background:rgba(255,255,255,.45); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#6B7A70; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3B4942; text-align:center; }
  .profile b{ color:#5C7355; font-weight:500; }
  .brand{ color:#93A198; letter-spacing:3px; } .pageno{ color:#93A198; }` },

    mirrorNeuron: { name: 'Mirror Neuron', chip: '#8CA6C8', bg: '#101112', arrow: '#8CA6C8',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><g stroke="#EAE2D4" stroke-opacity=".22" stroke-width="1" stroke-linecap="round"><path d="M0 1012 C160 1004 300 1016 440 1002 C480 998 512 990 530 982"/><path d="M296 1010 C356 964 420 946 472 926 C494 918 512 902 522 888"/><path d="M344 1013 C402 1052 458 1068 502 1082 C516 1088 528 1102 534 1116"/><path d="M418 1005 C448 1022 476 1030 500 1032"/><path d="M1080 996 C920 1006 780 994 646 1006 C606 1010 572 1000 552 990"/><path d="M792 999 C730 1048 664 1064 612 1082 C590 1090 572 1104 562 1118"/><path d="M742 998 C686 958 632 942 590 928 C576 922 564 908 556 894"/><path d="M668 1004 C638 988 610 980 586 978"/></g><circle cx="541" cy="986" r="4.5" fill="#8CA6C8"/></svg>`,
  css: `
  .slide{ background:#101112; color:#C9C2B4; }
  .kickline .rule{ width:40px; height:1px; background:#33363B; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8F949C; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:64px; line-height:1.48; color:#EAE2D4; }
  .hook b{ color:#8CA6C8; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8F949C; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#C9C2B4; }
  .body b, .poem b{ color:#F1EADB; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8CA6C8; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:58px; line-height:1.72; color:#EAE2D4; text-align:center; }
  .bubble{ border:1px solid #26282C; border-radius:10px; padding:54px 56px; background:rgba(255,255,255,.025); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8F949C; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#C9C2B4; text-align:center; }
  .profile b{ color:#8CA6C8; font-weight:500; }
  .brand{ color:#5B5E63; letter-spacing:3px; } .pageno{ color:#5B5E63; }` },

    matchboxNote: { name: 'Matchbox Note', chip: '#D35C38', bg: '#F5EBDD', arrow: '#D35C38',
  graphic: `<div style="position:absolute;left:-60px;bottom:96px;width:600px;height:13px;background:#E4D2B6;border-radius:0 4px 4px 0;box-shadow:inset 0 -1px 0 rgba(45,33,24,.16);"></div><div style="position:absolute;left:526px;bottom:92px;width:36px;height:21px;background:#D35C38;border-radius:11px;"></div>`,
  css: `
  .slide{ background:#F5EBDD; color:#463527; }
  .kickline .rule{ width:40px; height:1px; background:#C9B8A2; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8A7965; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:64px; line-height:1.48; color:#2D2118; }
  .hook b{ color:#2D2118; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A7965; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#463527; }
  .body b, .poem b{ color:#2D2118; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5A4632; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:58px; line-height:1.72; color:#2D2118; text-align:center; }
  .bubble{ border:1px solid #E3D3BE; border-radius:10px; padding:54px 56px; background:rgba(255,255,255,.45); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7965; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#463527; text-align:center; }
  .profile b{ color:#2D2118; font-weight:600; }
  .brand{ color:#AE9E8A; letter-spacing:3px; } .pageno{ color:#AE9E8A; }` },

    pinboardMap: { name: 'Pinboard Map', chip: '#5C7C8D', bg: '#EFE2C6', arrow: '#5C7C8D',
  graphic: `<svg style="position:absolute;top:66px;left:66px;width:225px;height:118px;overflow:visible;" viewBox="0 0 225 118" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="14" y1="92" x2="104" y2="20" stroke="#241C16" stroke-width="1" opacity=".2"/><line x1="104" y1="20" x2="206" y2="66" stroke="#241C16" stroke-width="1" opacity=".2"/><circle cx="14" cy="92" r="7" fill="#241C16" opacity=".2"/><circle cx="206" cy="66" r="7" fill="#241C16" opacity=".2"/><circle cx="104" cy="20" r="8" fill="#5C7C8D"/></svg>`,
  css: `
  .slide{ background:#EFE2C6; color:#3E362C; }
  .kickline .rule{ width:40px; height:1px; background:#5C7C8D; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5C7C8D; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#241C16; }
  .hook b{ color:#5C7C8D; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8A7B63; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#3E362C; }
  .body b, .poem b{ color:#241C16; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5C7C8D; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#241C16; text-align:center; }
  .bubble{ border:1px solid #DCCBA2; border-radius:8px; padding:54px 56px; background:rgba(36,28,22,.035); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8A7B63; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#3E362C; text-align:center; }
  .profile b{ color:#5C7C8D; font-weight:500; }
  .brand{ color:#A6947A; letter-spacing:3px; } .pageno{ color:#A6947A; }` },

    foldingMap: { name: 'Folding Map', chip: '#6C8A70', bg: '#F2EDDE', arrow: '#6C8A70',
  graphic: `<div style="position:absolute;top:0;bottom:0;left:356px;width:2px;background:linear-gradient(180deg,rgba(44,42,34,0),rgba(44,42,34,.09) 30%,rgba(44,42,34,.09) 70%,rgba(44,42,34,0));"></div><div style="position:absolute;top:0;bottom:0;left:718px;width:2px;background:linear-gradient(180deg,rgba(44,42,34,0),rgba(44,42,34,.09) 30%,rgba(44,42,34,.09) 70%,rgba(44,42,34,0));"></div><svg style="position:absolute;top:74px;left:66px;width:300px;height:96px;overflow:visible;" viewBox="0 0 300 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 78 C 48 66, 64 34, 108 40 S 190 74, 232 52 S 272 24, 288 20" stroke="#6C8A70" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"/><circle cx="288" cy="20" r="5" fill="#6C8A70"/></svg>`,
  css: `
  .slide{ background:#F2EDDE; color:#45412F; }
  .kickline .rule{ width:40px; height:1px; background:#6C8A70; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6C8A70; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#2C2A22; }
  .hook b{ color:#6C8A70; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#86816F; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#45412F; }
  .body b, .poem b{ color:#2C2A22; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6C8A70; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2C2A22; text-align:center; }
  .bubble{ border:1px solid #DBD3BC; border-radius:8px; padding:54px 56px; background:rgba(44,42,34,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#86816F; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#45412F; text-align:center; }
  .profile b{ color:#6C8A70; font-weight:500; }
  .brand{ color:#A29B85; letter-spacing:3px; } .pageno{ color:#A29B85; }` },

    chauparCross: { name: 'Chaupar Cross', chip: '#B64D37', bg: '#F1E4C7', arrow: '#B64D37',
  graphic: `<svg style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:780px;height:780px;" viewBox="0 0 780 780" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#2A2017" stroke-width="1.5" opacity=".06"><rect x="312" y="6" width="156" height="768"/><rect x="6" y="312" width="768" height="156"/><line x1="364" y1="6" x2="364" y2="774"/><line x1="416" y1="6" x2="416" y2="774"/><line x1="6" y1="364" x2="774" y2="364"/><line x1="6" y1="416" x2="774" y2="416"/><line x1="312" y1="102" x2="468" y2="102"/><line x1="312" y1="198" x2="468" y2="198"/><line x1="312" y1="582" x2="468" y2="582"/><line x1="312" y1="678" x2="468" y2="678"/><line x1="102" y1="312" x2="102" y2="468"/><line x1="198" y1="312" x2="198" y2="468"/><line x1="582" y1="312" x2="582" y2="468"/><line x1="678" y1="312" x2="678" y2="468"/></g><rect x="368" y="106" width="44" height="44" fill="#B64D37" opacity=".8"/></svg>`,
  css: `
  .slide{ background:#F1E4C7; color:#43372A; }
  .kickline .rule{ width:40px; height:1px; background:#B64D37; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#B64D37; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#2A2017; }
  .hook b{ color:#B64D37; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8C7C5F; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#43372A; }
  .body b, .poem b{ color:#2A2017; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#B64D37; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#2A2017; text-align:center; }
  .bubble{ border:1px solid #DECDA6; border-radius:8px; padding:54px 56px; background:rgba(42,32,23,.035); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8C7C5F; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#43372A; text-align:center; }
  .profile b{ color:#B64D37; font-weight:500; }
  .brand{ color:#A68C5F; letter-spacing:3px; } .pageno{ color:#A68C5F; }` },

    kundliGrid: { name: 'Kundli Grid', chip: '#A24433', bg: '#F4EAD7', arrow: '#A24433',
  graphic: `<svg style="position:absolute;right:66px;bottom:66px;width:352px;height:322px;" viewBox="0 0 352 322" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#282018" stroke-width="1.2" opacity=".11"><rect x="1" y="1" width="350" height="320"/><line x1="1" y1="1" x2="351" y2="321"/><line x1="351" y1="1" x2="1" y2="321"/><path d="M176 1 L351 161 L176 321 L1 161 Z"/></g><circle cx="176" cy="88" r="5" fill="#A24433" opacity=".9"/></svg>`,
  css: `
  .slide{ background:#F4EAD7; color:#443A2B; }
  .kickline .rule{ width:40px; height:1px; background:#A24433; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#A24433; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:66px; line-height:1.5; color:#282018; }
  .hook b{ color:#A24433; font-weight:500; }
  .sub{ font-family:'Poppins'; font-weight:300; font-size:29px; color:#8B7C62; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.64; color:#443A2B; }
  .body b, .poem b{ color:#282018; font-weight:500; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#A24433; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:60px; line-height:1.7; color:#282018; text-align:center; }
  .bubble{ border:1px solid #E0D2B4; border-radius:8px; padding:54px 56px; background:rgba(40,32,24,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8B7C62; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:300; font-size:37px; line-height:1.62; color:#443A2B; text-align:center; }
  .profile b{ color:#A24433; font-weight:500; }
  .brand{ color:#A9976F; letter-spacing:3px; } .pageno{ color:#A9976F; }` },



  chilman: { name: 'Chilman', chip: '#a8763c', bg: '#f4efe6', arrow: '#a8763c',
  graphic: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.15) 0 120px,rgba(255,255,255,0) 120px 158px,rgba(120,100,70,.05) 158px 159px,rgba(255,255,255,0) 159px 214px);"></div><div style="position:absolute;left:0;right:0;top:0;height:430px;background:linear-gradient(180deg,rgba(255,251,240,.65),rgba(255,251,240,0));"></div>`,
  css: `
  .slide{ background:#f4efe6; color:#5d5347; }
  .kickline .rule{ width:40px; height:1px; background:#a8763c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a8763c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#453d33; }
  .hook b{ color:#a8763c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9a8b78; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5d5347; }
  .body b, .poem b{ color:#382f26; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a8763c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#4a4136; text-align:center; }
  .bubble{ border:1px solid rgba(69,61,51,.16); border-radius:10px; padding:54px 56px; background:rgba(255,251,242,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a8b78; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5d5347; text-align:center; }
  .profile b{ color:#a8763c; font-weight:600; }
  .brand{ color:#ad9f8c; letter-spacing:3px; } .pageno{ color:#ad9f8c; }` },

  rann: { name: 'Rann', chip: '#7f8f99', bg: '#f2f1eb', arrow: '#7f8f99',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:465px;background:linear-gradient(0deg,rgba(255,255,252,.6),rgba(255,255,252,0));"></div><div style="position:absolute;left:0;right:0;bottom:465px;height:1px;background:rgba(127,143,153,.45);"></div><div style="position:absolute;left:0;right:0;bottom:466px;height:110px;background:linear-gradient(0deg,rgba(127,143,153,.08),rgba(127,143,153,0));"></div>`,
  css: `
  .slide{ background:#f2f1eb; color:#5c615f; }
  .kickline .rule{ width:40px; height:1px; background:#7f8f99; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#7f8f99; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.46; color:#474b4c; }
  .hook b{ color:#7f8f99; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9ba099; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5c615f; }
  .body b, .poem b{ color:#30393b; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7f8f99; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#454a49; text-align:center; }
  .bubble{ border:1px solid rgba(71,75,76,.15); border-radius:6px; padding:54px 56px; background:rgba(255,255,254,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9ba099; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5c615f; text-align:center; }
  .profile b{ color:#7f8f99; font-weight:600; }
  .brand{ color:#a7aba3; letter-spacing:3px; } .pageno{ color:#a7aba3; }` },

  mogra: { name: 'Mogra', chip: '#6d8459', bg: '#faf8f2', arrow: '#6d8459',
  graphic: `<svg style="position:absolute;top:60px;left:0;width:100%;height:260px" viewBox="0 0 1080 260" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M-20 58 Q540 244 1100 58" stroke="rgba(109,132,89,.4)" stroke-width="1"/><g fill="rgba(255,255,255,.9)" stroke="rgba(109,132,89,.35)" stroke-width="1"><ellipse cx="40" cy="93" rx="7.5" ry="13"/><ellipse cx="140" cy="120" rx="7.5" ry="13"/><ellipse cx="240" cy="140" rx="7.5" ry="13"/><ellipse cx="340" cy="155" rx="7.5" ry="13"/><ellipse cx="440" cy="164" rx="7.5" ry="13"/><ellipse cx="540" cy="167" rx="7.5" ry="13"/><ellipse cx="640" cy="164" rx="7.5" ry="13"/><ellipse cx="740" cy="155" rx="7.5" ry="13"/><ellipse cx="840" cy="140" rx="7.5" ry="13"/><ellipse cx="940" cy="120" rx="7.5" ry="13"/><ellipse cx="1040" cy="93" rx="7.5" ry="13"/></g></svg>`,
  css: `
  .slide{ background:#faf8f2; color:#5d6252; }
  .kickline .rule{ width:40px; height:1px; background:#6d8459; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6d8459; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#454a3c; }
  .hook b{ color:#6d8459; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9aa08d; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5d6252; }
  .body b, .poem b{ color:#2f3529; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6d8459; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#434a39; text-align:center; }
  .bubble{ border:1px solid rgba(69,74,60,.15); border-radius:14px; padding:54px 56px; background:rgba(255,255,252,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9aa08d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5d6252; text-align:center; }
  .profile b{ color:#6d8459; font-weight:600; }
  .brand{ color:#a9ad9c; letter-spacing:3px; } .pageno{ color:#a9ad9c; }` },

  malmal: { name: 'Malmal', chip: '#b07f88', bg: '#fbfaf6', arrow: '#b07f88',
  graphic: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(77,71,65,.04) 0 1px,rgba(0,0,0,0) 1px 8px),repeating-linear-gradient(90deg,rgba(77,71,65,.04) 0 1px,rgba(0,0,0,0) 1px 8px);"></div><div style="position:absolute;right:-180px;top:-180px;width:620px;height:620px;background:radial-gradient(circle,rgba(255,255,255,.85),rgba(255,255,255,0) 68%);"></div>`,
  css: `
  .slide{ background:#fbfaf6; color:#635c54; }
  .kickline .rule{ width:40px; height:1px; background:#b07f88; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#b07f88; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.48; color:#4d4741; }
  .hook b{ color:#b07f88; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#a49b90; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#635c54; }
  .body b, .poem b{ color:#322d27; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#b07f88; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#4a443d; text-align:center; }
  .bubble{ border:1px solid rgba(77,71,65,.13); border-radius:4px; padding:54px 56px; background:rgba(255,255,255,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a49b90; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#635c54; text-align:center; }
  .profile b{ color:#b07f88; font-weight:600; }
  .brand{ color:#b0a89d; letter-spacing:3px; } .pageno{ color:#b0a89d; }` },

  patang: { name: 'Patang', chip: '#cf6f2b', bg: '#edf3f6', arrow: '#cf6f2b',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M846 128 L896 190 L846 252 L796 190 Z" fill="#cf6f2b" opacity=".9"/><path d="M846 128 L846 252 M796 190 L896 190" stroke="rgba(255,255,255,.5)" stroke-width="1"/><path d="M846 252 q10 30 -2 52" stroke="#cf6f2b" stroke-width="1.2" opacity=".7"/><path d="M844 304 C 760 480, 470 800, 40 1210" stroke="rgba(60,74,84,.32)" stroke-width="1.2"/></svg>`,
  css: `
  .slide{ background:#edf3f6; color:#55636d; }
  .kickline .rule{ width:40px; height:1px; background:#cf6f2b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#cf6f2b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#3c4a54; }
  .hook b{ color:#cf6f2b; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8d9ba5; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#55636d; }
  .body b, .poem b{ color:#26343e; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#cf6f2b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#3a4852; text-align:center; }
  .bubble{ border:1px solid rgba(60,74,84,.15); border-radius:12px; padding:54px 56px; background:rgba(255,255,255,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d9ba5; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#55636d; text-align:center; }
  .profile b{ color:#cf6f2b; font-weight:600; }
  .brand{ color:#9aa8b1; letter-spacing:3px; } .pageno{ color:#9aa8b1; }` },

  hansa: { name: 'Hansa', chip: '#4e7c77', bg: '#f7f6f0', arrow: '#4e7c77',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:440px;background:linear-gradient(0deg,rgba(236,239,232,.85),rgba(236,239,232,0));"></div><svg style="position:absolute;left:0;bottom:72px;width:100%;height:340px" viewBox="0 0 1080 340" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="330" cy="230" rx="80" ry="11" stroke="rgba(168,95,110,.6)" stroke-width="1.6"/><ellipse cx="330" cy="230" rx="150" ry="21" stroke="rgba(78,124,119,.45)" stroke-width="1"/><ellipse cx="330" cy="230" rx="228" ry="32" stroke="rgba(78,124,119,.28)" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#f7f6f0; color:#59615f; }
  .kickline .rule{ width:40px; height:1px; background:#4e7c77; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#4e7c77; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#424a49; }
  .hook b{ color:#4e7c77; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9aa19c; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#59615f; }
  .body b, .poem b{ color:#2b3332; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#4e7c77; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#404846; text-align:center; }
  .bubble{ border:1px solid rgba(66,74,73,.14); border-radius:8px; padding:54px 56px; background:rgba(252,253,250,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9aa19c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#59615f; text-align:center; }
  .profile b{ color:#4e7c77; font-weight:600; }
  .brand{ color:#a5aba5; letter-spacing:3px; } .pageno{ color:#a5aba5; }` },

  pankh: { name: 'Pankh', chip: '#877a94', bg: '#f5f4ef', arrow: '#877a94',
  graphic: `<svg style="position:absolute;top:96px;right:76px;width:190px;height:300px;opacity:.55" viewBox="0 0 190 300" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="rgba(135,122,148,.6)" stroke-width="1.1"><path d="M96 292 C 92 218, 90 130, 108 16"/><path d="M101 74 q-30 4 -46 24"/><path d="M99 106 q-34 6 -52 28"/><path d="M97 140 q-36 8 -54 30"/><path d="M95 176 q-34 10 -50 30"/><path d="M104 70 q26 2 40 20"/><path d="M101 104 q30 4 46 24"/><path d="M99 138 q32 6 48 26"/><path d="M97 174 q30 8 46 26"/></svg>`,
  css: `
  .slide{ background:#f5f4ef; color:#5f5a66; }
  .kickline .rule{ width:40px; height:1px; background:#877a94; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#877a94; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:400; font-size:68px; line-height:1.48; color:#48444e; }
  .hook b{ color:#877a94; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9d97a4; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5f5a66; }
  .body b, .poem b{ color:#322e3a; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#877a94; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#46414d; text-align:center; }
  .bubble{ border:1px solid rgba(72,68,78,.13); border-radius:6px; padding:54px 56px; background:rgba(255,255,255,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9d97a4; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5f5a66; text-align:center; }
  .profile b{ color:#877a94; font-weight:600; }
  .brand{ color:#aaa5b0; letter-spacing:3px; } .pageno{ color:#aaa5b0; }
  .kickline .rule{ width:44px; height:2px; background:#5c5170; }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.16em; text-transform:uppercase; color:#5c5170; }` },

  nibTest: { name: 'Nib Test', chip: '#8a5a2e', bg: '#f5efe1', arrow: '#8a5a2e',
  graphic: `<div style="position:absolute;top:0;bottom:0;left:132px;width:1px;background:rgba(54,43,30,.12);"></div><svg style="position:absolute;left:28px;top:210px;width:80px;height:760px;" viewBox="0 0 80 760" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 30 C40 8 64 34 40 52 C20 66 24 92 52 84" stroke="#8a5a2e" stroke-opacity=".17" stroke-width="2" stroke-linecap="round"/><path d="M14 150 q26 -18 52 0 q-26 20 -52 0" stroke="#8a5a2e" stroke-opacity=".15" stroke-width="1.5"/><path d="M18 260 h44 M18 276 h32" stroke="#8a5a2e" stroke-opacity=".14" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="400" r="9" fill="#8a5a2e" fill-opacity=".15"/><path d="M16 540 c14 -30 34 -30 48 0 c-14 26 -34 26 -48 0" stroke="#8a5a2e" stroke-opacity=".13" stroke-width="1.5"/><path d="M20 690 l40 -26 M20 664 l40 26" stroke="#8a5a2e" stroke-opacity=".14" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  css: `
  .slide{ background:#f5efe1; color:#5c5240; }
  .kickline .rule{ width:40px; height:1px; background:#8a5a2e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8a5a2e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#362b1e; }
  .hook b{ color:#8a5a2e; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#94886f; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5c5240; }
  .body b, .poem b{ color:#2e2416; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8a5a2e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#3c3122; text-align:center; }
  .bubble{ border:1px solid rgba(54,43,30,.14); border-radius:6px; padding:54px 56px; background:rgba(251,246,234,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#94886f; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5c5240; text-align:center; }
  .profile b{ color:#8a5a2e; font-weight:600; }
  .brand{ color:#a89b80; letter-spacing:3px; } .pageno{ color:#a89b80; }` },

  
waxLetter: { name: 'Sealed Letter', chip: '#8c2f2c', bg: '#f8f3e9', arrow: '#8c2f2c',
  graphic: `<div style="position:absolute;left:0;right:0;top:446px;height:1px;background:rgba(59,51,42,.08);"></div><div style="position:absolute;left:0;right:0;top:898px;height:1px;background:rgba(59,51,42,.08);"></div><div style="position:absolute;right:116px;bottom:196px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 38% 34%,#a84038,#7e2723 68%);box-shadow:0 1px 0 rgba(59,51,42,.18);"></div><div style="position:absolute;right:126px;bottom:206px;width:32px;height:32px;border-radius:50%;border:1px solid rgba(248,240,228,.5);"></div>`,
  css: `
  .slide{ background:#f8f3e9; color:#615749; }
  .kickline .rule{ width:40px; height:1px; background:#8c2f2c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.3em; text-transform:uppercase; color:#8c2f2c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:65px; line-height:1.48; color:#3b332a; }
  .hook b{ color:#8c2f2c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9a8d7b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#615749; }
  .body b, .poem b{ color:#332b22; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8c2f2c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#42392e; text-align:center; }
  .bubble{ border:1px solid rgba(59,51,42,.15); border-radius:4px; padding:54px 58px; background:rgba(253,250,242,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a8d7b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#615749; text-align:center; }
  .profile b{ color:#8c2f2c; font-weight:600; }
  .brand{ color:#ab9e8a; letter-spacing:3px; } .pageno{ color:#ab9e8a; }` },

  
sokhta: { name: 'Sokhta', chip: '#3a4f78', bg: '#f4e9e3', arrow: '#3a4f78',
  graphic: `<div style="position:absolute;left:-220px;bottom:60px;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(58,79,120,.15) 0%,rgba(58,79,120,.09) 36%,rgba(58,79,120,.03) 58%,rgba(58,79,120,0) 70%);filter:blur(3px);"></div><div style="position:absolute;left:410px;bottom:180px;width:12px;height:12px;border-radius:50%;background:rgba(58,79,120,.12);filter:blur(1px);"></div><div style="position:absolute;left:360px;bottom:252px;width:7px;height:7px;border-radius:50%;background:rgba(58,79,120,.10);"></div>`,
  css: `
  .slide{ background:#f4e9e3; color:#6a5a52; }
  .kickline .rule{ width:40px; height:1px; background:#3a4f78; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#3a4f78; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#40332d; }
  .hook b{ color:#3a4f78; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#a5928a; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#6a5a52; }
  .body b, .poem b{ color:#372a24; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#3a4f78; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#463830; text-align:center; }
  .bubble{ border:1px solid rgba(64,51,45,.13); border-radius:12px; padding:54px 56px; background:rgba(250,243,239,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a5928a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#6a5a52; text-align:center; }
  .profile b{ color:#3a4f78; font-weight:600; }
  .brand{ color:#b3a098; letter-spacing:3px; } .pageno{ color:#b3a098; }` },

  
qalamtarash: { name: 'Qalamtarash', chip: '#6d7c46', bg: '#eae9db', arrow: '#6d7c46',
  graphic: `<svg style="position:absolute;right:84px;bottom:130px;width:320px;height:160px;" viewBox="0 0 320 160" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 132 q22 -74 92 -66 q-54 24 -60 70" stroke="#6d7c46" stroke-opacity=".17" stroke-width="2" stroke-linecap="round"/><path d="M132 138 q40 -60 96 -44 q-48 16 -58 52" stroke="#6d7c46" stroke-opacity=".14" stroke-width="1.5" stroke-linecap="round"/><path d="M242 140 q18 -40 62 -36 q-34 14 -38 40" stroke="#6d7c46" stroke-opacity=".12" stroke-width="1.5" stroke-linecap="round"/><path d="M96 150 h150" stroke="#35362a" stroke-opacity=".10" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#eae9db; color:#5d5e4c; }
  .kickline .rule{ width:40px; height:1px; background:#6d7c46; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6d7c46; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#35362a; }
  .hook b{ color:#6d7c46; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#92937e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5d5e4c; }
  .body b, .poem b{ color:#2b2c21; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6d7c46; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#3c3d30; text-align:center; }
  .bubble{ border:1px solid rgba(53,54,42,.14); border-radius:8px; padding:54px 56px; background:rgba(244,243,232,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#92937e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5d5e4c; text-align:center; }
  .profile b{ color:#6d7c46; font-weight:600; }
  .brand{ color:#a1a28c; letter-spacing:3px; } .pageno{ color:#a1a28c; }` },

  
dawaat: { name: 'Dawaat', chip: '#2c3752', bg: '#f2f1ec', arrow: '#2c3752',
  graphic: `<div style="position:absolute;top:130px;right:118px;width:156px;height:156px;border-radius:50%;border:1.5px solid rgba(44,55,82,.16);"></div><div style="position:absolute;top:144px;right:132px;width:128px;height:128px;border-radius:50%;border:1px solid rgba(44,55,82,.12);"></div><div style="position:absolute;top:306px;right:250px;width:6px;height:6px;border-radius:50%;background:rgba(44,55,82,.16);"></div>`,
  css: `
  .slide{ background:#f2f1ec; color:#555a63; }
  .kickline .rule{ width:40px; height:1px; background:#2c3752; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#2c3752; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#22252c; }
  .hook b{ color:#2c3752; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8f949c; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#555a63; }
  .body b, .poem b{ color:#1c1f26; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#2c3752; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#2b2f38; text-align:center; }
  .bubble{ border:1px solid rgba(34,37,44,.13); border-radius:8px; padding:54px 56px; background:rgba(250,250,247,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f949c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#555a63; text-align:center; }
  .profile b{ color:#2c3752; font-weight:600; }
  .brand{ color:#9da2aa; letter-spacing:3px; } .pageno{ color:#9da2aa; }` },

  
musavvada: { name: 'Musavvada', chip: '#c0392b', bg: '#eeeae1', arrow: '#c0392b',
  graphic: `<div style="position:absolute;left:124px;bottom:184px;width:340px;"><div style="height:13px;border-radius:3px;background:rgba(58,58,54,.06);position:relative;transform:rotate(-.6deg);"><div style="position:absolute;left:-6px;right:-10px;top:5px;height:2px;background:rgba(58,58,54,.16);transform:rotate(-1.2deg);"></div></div><div style="height:13px;width:78%;border-radius:3px;background:rgba(58,58,54,.06);position:relative;margin-top:30px;transform:rotate(.4deg);"><div style="position:absolute;left:-8px;right:-6px;top:6px;height:2px;background:rgba(192,57,43,.17);transform:rotate(1deg);"></div></div><div style="height:13px;width:56%;border-radius:3px;background:rgba(58,58,54,.06);position:relative;margin-top:30px;"><div style="position:absolute;left:-4px;right:-12px;top:5px;height:2px;background:rgba(58,58,54,.15);transform:rotate(-.8deg);"></div></div></div>`,
  css: `
  .slide{ background:#eeeae1; color:#5f5e58; }
  .kickline .rule{ width:40px; height:1px; background:#c0392b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#96948b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:65px; line-height:1.48; color:#3a3a36; }
  .hook b{ color:#c0392b; font-weight:600; text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:12px; text-decoration-color:rgba(192,57,43,.4); }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#96948b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5f5e58; }
  .body b, .poem b{ color:#2e2e2a; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c0392b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#403f3a; text-align:center; }
  .bubble{ border:1px dashed rgba(58,58,54,.22); border-radius:6px; padding:54px 56px; background:rgba(246,243,234,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#96948b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5f5e58; text-align:center; }
  .profile b{ color:#c0392b; font-weight:600; }
  .brand{ color:#a5a399; letter-spacing:3px; } .pageno{ color:#a5a399; }` },

  
pencilStub: { name: 'Pencil Stub', chip: '#a3502e', bg: '#e9eae9', arrow: '#a3502e',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:230px;background:linear-gradient(0deg,rgba(44,47,49,.07),rgba(44,47,49,0));"></div><svg style="position:absolute;left:120px;bottom:150px;width:260px;height:40px;" viewBox="0 0 260 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 24 q70 -14 130 -6" stroke="#2c2f31" stroke-opacity=".10" stroke-width="9" stroke-linecap="round"/><path d="M6 24 q70 -14 130 -6 q64 8 118 2" stroke="#2c2f31" stroke-opacity=".16" stroke-width="4" stroke-linecap="round"/></svg>`,
  css: `
  .slide{ background:#e9eae9; color:#55595b; }
  .kickline .rule{ width:40px; height:1px; background:#a3502e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8e9294; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#2c2f31; }
  .hook b{ color:#a3502e; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8e9294; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#55595b; }
  .body b, .poem b{ color:#232628; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a3502e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#34383a; text-align:center; }
  .bubble{ border:1px solid rgba(44,47,49,.14); border-radius:8px; padding:54px 56px; background:rgba(243,244,243,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8e9294; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#55595b; text-align:center; }
  .profile b{ color:#a3502e; font-weight:600; }
  .brand{ color:#9ca0a1; letter-spacing:3px; } .pageno{ color:#9ca0a1; }` },

  
teenBaje: { name: 'Teen Baje', chip: '#c9a24b', bg: '#14171f', arrow: '#c9a24b',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:296px;height:1px;background:rgba(233,227,210,.13);"></div><svg style="position:absolute;right:104px;bottom:304px;width:430px;height:130px;" viewBox="0 0 430 130" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="44" cy="102" r="24" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><circle cx="104" cy="102" r="24" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><path d="M68 98 q6 -10 12 0" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><path d="M196 126 v-30 q0 -8 8 -8 h32 q8 0 8 8 v30" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><path d="M204 88 h32" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><path d="M214 84 L258 18 l6 4 -42 66" stroke="#e9e3d2" stroke-opacity=".13" stroke-width="1.2"/><circle cx="360" cy="90" r="36" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/><path d="M360 90 v-24 M360 90 h17" stroke="#c9a24b" stroke-opacity=".4" stroke-width="1.5" stroke-linecap="round"/><path d="M360 46 v-8" stroke="#e9e3d2" stroke-opacity=".15" stroke-width="1.5"/></svg>`,
  css: `
  .slide{ background:#14171f; color:#b9b2a0; }
  .kickline .rule{ width:40px; height:1px; background:#c9a24b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#c9a24b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#e9e3d2; }
  .hook b{ color:#c9a24b; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7c8090; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#b9b2a0; }
  .body b, .poem b{ color:#f2ecda; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c9a24b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#ddd6c2; text-align:center; }
  .bubble{ border:1px solid rgba(233,227,210,.14); border-radius:8px; padding:54px 56px; background:rgba(233,227,210,.05); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7c8090; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#b9b2a0; text-align:center; }
  .profile b{ color:#c9a24b; font-weight:600; }
  .brand{ color:#6f7482; letter-spacing:3px; } .pageno{ color:#6f7482; }` },

  
retdaan: { name: 'Retdaan', chip: '#7c5522', bg: '#eee3ca', arrow: '#7c5522',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:280px;background-image:radial-gradient(rgba(60,49,32,.30) 1px,transparent 1.6px),radial-gradient(rgba(60,49,32,.22) 1px,transparent 1.5px),radial-gradient(rgba(124,85,34,.24) 1px,transparent 1.6px);background-size:38px 38px,57px 57px,83px 83px;background-position:0 0,19px 27px,41px 11px;opacity:.55;-webkit-mask-image:linear-gradient(0deg,#000 30%,transparent 100%);mask-image:linear-gradient(0deg,#000 30%,transparent 100%);"></div>`,
  css: `
  .slide{ background:#eee3ca; color:#66573d; }
  .kickline .rule{ width:40px; height:1px; background:#7c5522; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#7c5522; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#3c3120; }
  .hook b{ color:#7c5522; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#998a6c; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#66573d; }
  .body b, .poem b{ color:#332917; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7c5522; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#443826; text-align:center; }
  .bubble{ border:1px solid rgba(60,49,32,.15); border-radius:6px; padding:54px 56px; background:rgba(247,239,220,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#998a6c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#66573d; text-align:center; }
  .profile b{ color:#7c5522; font-weight:600; }
  .brand{ color:#a89871; letter-spacing:3px; } .pageno{ color:#a89871; }` },

  
splitNib: { name: 'Split Nib', chip: '#31527b', bg: '#e4e9ed', arrow: '#31527b',
  graphic: `<div style="position:absolute;top:110px;right:0;width:330px;height:330px;background-image:repeating-linear-gradient(45deg,rgba(49,82,123,.13) 0 1px,transparent 1px 10px),repeating-linear-gradient(-45deg,rgba(49,82,123,.13) 0 1px,transparent 1px 10px);-webkit-mask-image:radial-gradient(circle at 100% 12%,#000 32%,transparent 74%);mask-image:radial-gradient(circle at 100% 12%,#000 32%,transparent 74%);"></div><svg style="position:absolute;top:404px;right:210px;width:60px;height:70px;" viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 4 q-20 26 -18 44 q2 16 18 18 q16 -2 18 -18 q2 -18 -18 -44" stroke="#31527b" stroke-opacity=".2" stroke-width="1.5"/><path d="M30 22 v34" stroke="#31527b" stroke-opacity=".2" stroke-width="1.5"/><circle cx="30" cy="42" r="3.5" stroke="#31527b" stroke-opacity=".2" stroke-width="1.2"/></svg>`,
  css: `
  .slide{ background:#e4e9ed; color:#52616f; }
  .kickline .rule{ width:40px; height:1px; background:#31527b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#31527b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#26313d; }
  .hook b{ color:#31527b; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8b98a4; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#52616f; }
  .body b, .poem b{ color:#1e2833; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#31527b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#2e3a46; text-align:center; }
  .bubble{ border:1px solid rgba(38,49,61,.14); border-radius:8px; padding:54px 56px; background:rgba(241,244,247,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8b98a4; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#52616f; text-align:center; }
  .profile b{ color:#31527b; font-weight:600; }
  .brand{ color:#98a4af; letter-spacing:3px; } .pageno{ color:#98a4af; }` },

  viraam: { name: 'Viraam', chip: '#a03e2d', bg: '#f4efe6', arrow: '#a03e2d',
  graphic: `<div style="position:absolute;right:154px;bottom:238px;width:170px;height:1px;background:#2e2a24;opacity:.22;"></div><div style="position:absolute;right:132px;bottom:234px;width:3px;height:150px;background:#2e2a24;opacity:.15;"></div>`,
  css: `
  .slide{ background:#f4efe6; color:#4a4339; }
  .kickline .rule{ width:40px; height:1px; background:#a03e2d; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a03e2d; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.5; color:#2b2620; }
  .hook b{ color:#a03e2d; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8f8577; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5a5347; }
  .body b, .poem b{ color:#2b2620; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a03e2d; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.74; color:#363028; text-align:center; }
  .bubble{ border:1px solid rgba(46,42,36,.14); border-radius:8px; padding:54px 56px; background:rgba(250,246,238,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f8577; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5a5347; text-align:center; }
  .profile b{ color:#a03e2d; font-weight:600; }
  .brand{ color:#a29885; letter-spacing:3px; } .pageno{ color:#a29885; }` },

  
kumbhak: { name: 'Kumbhak', chip: '#a8c4b4', bg: '#14161a', arrow: '#a8c4b4',
  graphic: `<svg style="position:absolute;left:0;bottom:150px;width:100%;height:140px;" viewBox="0 0 1080 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 118 C150 118 210 26 320 26 L760 26 C870 26 930 118 1080 118" fill="none" stroke="#a8c4b4" stroke-width="1" opacity=".3"/><line x1="320" y1="26" x2="760" y2="26" stroke="#a8c4b4" stroke-width="1" opacity=".62"/></svg>`,
  css: `
  .slide{ background:#14161a; color:#aeb6bf; }
  .kickline .rule{ width:40px; height:1px; background:#a8c4b4; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a8c4b4; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.48; color:#e6eaef; }
  .hook b{ color:#a8c4b4; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7e8791; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.66; color:#aeb6bf; }
  .body b, .poem b{ color:#e6eaef; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a8c4b4; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:58px; line-height:1.76; color:#d8dce2; text-align:center; }
  .bubble{ border:1px solid rgba(216,220,226,.12); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.028); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7e8791; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#aeb6bf; text-align:center; }
  .profile b{ color:#a8c4b4; font-weight:600; }
  .brand{ color:#5c666f; letter-spacing:3px; } .pageno{ color:#5c666f; }` },

  
anugoonj: { name: 'Anugoonj', chip: '#c97b4a', bg: '#1b1512', arrow: '#c97b4a',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#c97b4a"><circle cx="815" cy="1055" r="120" stroke-width="1" opacity=".26"/><circle cx="815" cy="1055" r="265" stroke-width="1" opacity=".15"/><circle cx="815" cy="1055" r="440" stroke-width="1" opacity=".08"/><circle cx="815" cy="1055" r="645" stroke-width="1" opacity=".04"/></g></svg>`,
  css: `
  .slide{ background:#1b1512; color:#b5a795; }
  .kickline .rule{ width:40px; height:1px; background:#c97b4a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#c97b4a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#efe5d6; }
  .hook b{ color:#c97b4a; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#96897b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#b5a795; }
  .body b, .poem b{ color:#efe5d6; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c97b4a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:59px; line-height:1.74; color:#e8ded1; text-align:center; }
  .bubble{ border:1px solid rgba(232,222,209,.12); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.026); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#96897b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#b5a795; text-align:center; }
  .profile b{ color:#c97b4a; font-weight:600; }
  .brand{ color:#6e5b4a; letter-spacing:3px; } .pageno{ color:#6e5b4a; }` },

  
azaan: { name: 'Azaan', chip: '#d9a48c', bg: '#252e42', arrow: '#d9a48c',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:620px;background:linear-gradient(0deg,rgba(217,164,140,.16),rgba(217,164,140,0));"></div><svg style="position:absolute;left:0;bottom:190px;width:100%;height:260px;" viewBox="0 0 1080 260" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g stroke="#d9a48c" stroke-width="1"><line x1="0" y1="252" x2="1080" y2="252" opacity=".34"/><line x1="70" y1="192" x2="1010" y2="192" opacity=".22"/><line x1="160" y1="132" x2="920" y2="132" opacity=".14"/><line x1="270" y1="70" x2="810" y2="70" opacity=".08"/><line x1="390" y1="12" x2="690" y2="12" opacity=".04"/></g></svg>`,
  css: `
  .slide{ background:#252e42; color:#b4b8c6; }
  .kickline .rule{ width:40px; height:1px; background:#d9a48c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#d9a48c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:65px; line-height:1.48; color:#eee9e1; }
  .hook b{ color:#d9a48c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8e93a6; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#b4b8c6; }
  .body b, .poem b{ color:#eee9e1; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#d9a48c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:59px; line-height:1.74; color:#e9e4dc; text-align:center; }
  .bubble{ border:1px solid rgba(233,228,220,.13); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8e93a6; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#b4b8c6; text-align:center; }
  .profile b{ color:#d9a48c; font-weight:600; }
  .brand{ color:#5a6484; letter-spacing:3px; } .pageno{ color:#5a6484; }` },

  
ankahaa: { name: 'Ankahaa', chip: '#7d5a3c', bg: '#e9e4dd', arrow: '#7d5a3c',
  graphic: `<div style="position:absolute;left:120px;right:120px;bottom:200px;height:430px;border:1px solid rgba(58,53,47,.17);border-radius:14px;"></div><div style="position:absolute;left:166px;bottom:544px;font-family:Georgia,serif;font-size:66px;line-height:1;color:#3a352f;opacity:.14;">&#8220;</div>`,
  css: `
  .slide{ background:#e9e4dd; color:#5b544a; }
  .kickline .rule{ width:40px; height:1px; background:#7d5a3c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#7d5a3c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.5; color:#332e28; }
  .hook b{ color:#7d5a3c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8d857a; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5b544a; }
  .body b, .poem b{ color:#332e28; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#7d5a3c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:59px; line-height:1.72; color:#3a352f; text-align:center; }
  .bubble{ border:1px solid rgba(58,53,47,.14); border-radius:8px; padding:54px 56px; background:rgba(242,238,232,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d857a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5b544a; text-align:center; }
  .profile b{ color:#7d5a3c; font-weight:600; }
  .brand{ color:#a39a8c; letter-spacing:3px; } .pageno{ color:#a39a8c; }` },

  
barfbaari: { name: 'Barfbaari', chip: '#5b7f99', bg: '#eef2f5', arrow: '#5b7f99',
  graphic: `<svg style="position:absolute;inset:0;width:100%;height:100%;" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><g fill="#3f4a54"><circle cx="170" cy="190" r="3" opacity=".12"/><circle cx="540" cy="110" r="2.4" opacity=".08"/><circle cx="880" cy="240" r="3.2" opacity=".11"/><circle cx="320" cy="430" r="2.2" opacity=".07"/><circle cx="730" cy="520" r="2.8" opacity=".09"/><circle cx="120" cy="700" r="2.4" opacity=".08"/><circle cx="950" cy="760" r="2.2" opacity=".06"/><circle cx="450" cy="880" r="3" opacity=".1"/><circle cx="820" cy="1000" r="2.4" opacity=".07"/><circle cx="230" cy="1060" r="2.8" opacity=".09"/><circle cx="620" cy="1150" r="2.2" opacity=".06"/></g><line x1="90" y1="1185" x2="990" y2="1185" stroke="#3f4a54" stroke-width="1" opacity=".16"/></svg>`,
  css: `
  .slide{ background:#eef2f5; color:#5a6771; }
  .kickline .rule{ width:40px; height:1px; background:#5b7f99; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5b7f99; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:63px; line-height:1.54; color:#333d47; }
  .hook b{ color:#5b7f99; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8b98a3; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.66; color:#5a6771; }
  .body b, .poem b{ color:#333d47; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5b7f99; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:58px; line-height:1.78; color:#3f4a54; text-align:center; }
  .bubble{ border:1px solid rgba(63,74,84,.13); border-radius:8px; padding:54px 56px; background:rgba(248,250,252,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8b98a3; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5a6771; text-align:center; }
  .profile b{ color:#5b7f99; font-weight:600; }
  .brand{ color:#9fabb4; letter-spacing:3px; } .pageno{ color:#9fabb4; }` },

  
antaraal: { name: 'Antaraal', chip: '#6b5d8c', bg: '#f1ece2', arrow: '#6b5d8c',
  graphic: `<div style="position:absolute;left:150px;right:150px;top:298px;height:1px;background:#33302a;opacity:.2;"></div><div style="position:absolute;left:150px;right:150px;bottom:298px;height:1px;background:#33302a;opacity:.2;"></div><div style="position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#6b5d8c;opacity:.18;"></div>`,
  css: `
  .slide{ background:#f1ece2; color:#59544a; }
  .kickline .rule{ width:40px; height:1px; background:#6b5d8c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#6b5d8c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.5; color:#2e2b25; }
  .hook b{ color:#6b5d8c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8f887a; margin-top:36px; line-height:1.62; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#59544a; }
  .body b, .poem b{ color:#2e2b25; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#6b5d8c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:59px; line-height:1.74; color:#38342d; text-align:center; }
  .bubble{ border:1px solid rgba(51,48,42,.14); border-radius:8px; padding:54px 56px; background:rgba(248,244,236,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f887a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#59544a; text-align:center; }
  .profile b{ color:#6b5d8c; font-weight:600; }
  .brand{ color:#a49c8b; letter-spacing:3px; } .pageno{ color:#a49c8b; }` },

  
aramgah: { name: 'Aramgah', chip: '#5e6f52', bg: '#f6f1e4', arrow: '#5e6f52',
  graphic: `<div style="position:absolute;right:110px;top:-240px;width:640px;height:920px;border-radius:320px 320px 0 0;background:radial-gradient(ellipse at 50% 32%,rgba(74,68,56,.13),rgba(74,68,56,0) 72%);"></div><div style="position:absolute;right:150px;top:150px;width:560px;height:640px;border-radius:280px 280px 0 0;border:1px solid rgba(74,68,56,.10);border-bottom:none;"></div>`,
  css: `
  .slide{ background:#f6f1e4; color:#5f584a; }
  .kickline .rule{ width:40px; height:1px; background:#5e6f52; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5e6f52; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:65px; line-height:1.48; color:#3a3529; }
  .hook b{ color:#5e6f52; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#97907f; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5f584a; }
  .body b, .poem b{ color:#3a3529; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5e6f52; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#453f32; text-align:center; }
  .bubble{ border:1px solid rgba(74,68,56,.14); border-radius:8px; padding:54px 56px; background:rgba(251,247,236,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#97907f; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5f584a; text-align:center; }
  .profile b{ color:#5e6f52; font-weight:600; }
  .brand{ color:#a89f8b; letter-spacing:3px; } .pageno{ color:#a89f8b; }` },

  
fermata: { name: 'Fermata', chip: '#c2a35c', bg: '#17151b', arrow: '#c2a35c',
  graphic: `<svg style="position:absolute;right:110px;top:150px;width:300px;height:190px;" viewBox="0 0 300 190" xmlns="http://www.w3.org/2000/svg"><path d="M12 172 A138 138 0 0 1 288 172" fill="none" stroke="#c2a35c" stroke-width="1" opacity=".38"/><circle cx="150" cy="128" r="7" fill="#c2a35c" opacity=".18"/></svg>`,
  css: `
  .slide{ background:#17151b; color:#aba6b6; }
  .kickline .rule{ width:40px; height:1px; background:#c2a35c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#c2a35c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:65px; line-height:1.46; color:#ece8f0; }
  .hook b{ color:#c2a35c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#837e90; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#aba6b6; }
  .body b, .poem b{ color:#ece8f0; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c2a35c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:59px; line-height:1.74; color:#ddd8e4; text-align:center; }
  .bubble{ border:1px solid rgba(221,216,228,.12); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.028); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#837e90; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#aba6b6; text-align:center; }
  .profile b{ color:#c2a35c; font-weight:600; }
  .brand{ color:#575165; letter-spacing:3px; } .pageno{ color:#575165; }` },

  kuaan: { name: 'Kuaan', chip: '#9fc0d4', bg: '#1e2024', arrow: '#9fc0d4',
  graphic: `<div style="position:absolute;right:130px;top:110px;width:260px;height:260px;border-radius:50%;border:1px solid rgba(159,192,212,.35);background:radial-gradient(circle at 50% 44%,rgba(159,192,212,.17),rgba(159,192,212,.08) 58%,rgba(159,192,212,.02) 82%);"></div><div style="position:absolute;right:96px;top:76px;width:328px;height:328px;border-radius:50%;border:1px solid rgba(159,192,212,.10);"></div>`,
  css: `
  .slide{ background:#1e2024; color:#b6bec5; }
  .kickline .rule{ width:40px; height:1px; background:#9fc0d4; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#9fc0d4; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#dfe3e6; }
  .hook b{ color:#9fc0d4; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#90979e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#aeb6bd; }
  .body b, .poem b{ color:#f2f5f7; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#9fc0d4; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#d3dade; text-align:center; }
  .bubble{ border:1px solid rgba(223,227,230,.13); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#90979e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#aeb6bd; text-align:center; }
  .profile b{ color:#9fc0d4; font-weight:600; }
  .brand{ color:#6a7178; letter-spacing:3px; } .pageno{ color:#6a7178; }` },

  
aks: { name: 'Aks', chip: '#5e7f99', bg: '#d9d7d2', arrow: '#5e7f99',
  graphic: `<div style="position:absolute;left:150px;right:170px;bottom:96px;height:280px;border-radius:50%;background:radial-gradient(ellipse at 50% 38%,rgba(158,180,196,.18),rgba(158,180,196,.07) 58%,rgba(158,180,196,0) 74%);"></div><div style="position:absolute;left:300px;bottom:240px;width:220px;height:1px;background:rgba(255,255,255,.55);transform:rotate(-2deg);"></div><div style="position:absolute;left:560px;bottom:196px;width:120px;height:1px;background:rgba(255,255,255,.35);transform:rotate(-2deg);"></div>`,
  css: `
  .slide{ background:#d9d7d2; color:#4a5158; }
  .kickline .rule{ width:40px; height:1px; background:#5e7f99; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#5e7f99; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#373e45; }
  .hook b{ color:#5e7f99; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#84898e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#4f565d; }
  .body b, .poem b{ color:#23292f; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#5e7f99; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#3a424a; text-align:center; }
  .bubble{ border:1px solid rgba(55,62,69,.14); border-radius:8px; padding:54px 56px; background:rgba(240,239,235,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#84898e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#4f565d; text-align:center; }
  .profile b{ color:#5e7f99; font-weight:600; }
  .brand{ color:#989b9d; letter-spacing:3px; } .pageno{ color:#989b9d; }` },

  
taalab: { name: 'Taalab', chip: '#a85f6e', bg: '#e6ebe3', arrow: '#a85f6e',
  graphic: `<div style="position:absolute;left:50%;bottom:-260px;width:640px;height:640px;transform:translateX(-50%);border:1px solid rgba(51,70,60,.13);border-radius:50%;"></div><div style="position:absolute;left:50%;bottom:-150px;width:420px;height:420px;transform:translateX(-50%);border:1px solid rgba(51,70,60,.18);border-radius:50%;"></div><div style="position:absolute;left:50%;bottom:-52px;width:220px;height:220px;transform:translateX(-50%);border:1px solid rgba(168,95,110,.32);border-radius:50%;"></div>`,
  css: `
  .slide{ background:#e6ebe3; color:#4a5a50; }
  .kickline .rule{ width:40px; height:1px; background:#a85f6e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a85f6e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#33463c; }
  .hook b{ color:#a85f6e; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7d8a80; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#4d5e53; }
  .body b, .poem b{ color:#25332b; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a85f6e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#37493f; text-align:center; }
  .bubble{ border:1px solid rgba(51,70,60,.14); border-radius:8px; padding:54px 56px; background:rgba(247,250,245,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7d8a80; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#4d5e53; text-align:center; }
  .profile b{ color:#a85f6e; font-weight:600; }
  .brand{ color:#93a096; letter-spacing:3px; } .pageno{ color:#93a096; }` },

  
geelaPatthar: { name: 'Geela Patthar', chip: '#8fb6c4', bg: '#14171a', arrow: '#8fb6c4',
  graphic: `<div style="position:absolute;top:0;bottom:0;left:640px;width:150px;background:linear-gradient(180deg,rgba(143,182,196,0),rgba(143,182,196,.10) 35%,rgba(143,182,196,.14) 55%,rgba(143,182,196,0) 88%);transform:skewX(-9deg);"></div><div style="position:absolute;top:0;bottom:0;left:820px;width:1px;background:linear-gradient(180deg,rgba(143,182,196,0),rgba(143,182,196,.35) 50%,rgba(143,182,196,0));transform:skewX(-9deg);"></div>`,
  css: `
  .slide{ background:#14171a; color:#b3bcc2; }
  .kickline .rule{ width:40px; height:1px; background:#8fb6c4; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#8fb6c4; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#dadfe3; }
  .hook b{ color:#8fb6c4; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8d979e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#a9b2b9; }
  .body b, .poem b{ color:#eef2f4; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8fb6c4; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#ced6db; text-align:center; }
  .bubble{ border:1px solid rgba(218,223,227,.13); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d979e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#a9b2b9; text-align:center; }
  .profile b{ color:#8fb6c4; font-weight:600; }
  .brand{ color:#646c72; letter-spacing:3px; } .pageno{ color:#646c72; }` },

  
matka: { name: 'Matka', chip: '#c98a5e', bg: '#1b2226', arrow: '#c98a5e',
  graphic: `<div style="position:absolute;left:-160px;top:-160px;width:1400px;height:1670px;border:190px solid rgba(148,92,58,.14);border-radius:50%;"></div><div style="position:absolute;left:28px;top:28px;width:1024px;height:1294px;border:1px solid rgba(201,138,94,.38);border-radius:50%;"></div><div style="position:absolute;left:330px;top:300px;width:420px;height:130px;border-radius:50%;background:radial-gradient(ellipse,rgba(111,139,150,.10),rgba(111,139,150,0) 70%);"></div>`,
  css: `
  .slide{ background:#1b2226; color:#bdb4a9; }
  .kickline .rule{ width:40px; height:1px; background:#c98a5e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#c98a5e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#e7dfd4; }
  .hook b{ color:#c98a5e; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9d948a; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#b4aba0; }
  .body b, .poem b{ color:#f3ede4; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c98a5e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#dcd4c8; text-align:center; }
  .bubble{ border:1px solid rgba(231,223,212,.13); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9d948a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#b4aba0; text-align:center; }
  .profile b{ color:#c98a5e; font-weight:600; }
  .brand{ color:#6e6a62; letter-spacing:3px; } .pageno{ color:#6e6a62; }` },

  
shabnam: { name: 'Shabnam', chip: '#ad8f4f', bg: '#eef1e7', arrow: '#ad8f4f',
  graphic: `<div style="position:absolute;left:-40px;bottom:300px;width:1160px;height:1px;background:linear-gradient(90deg,rgba(60,74,53,0),rgba(60,74,53,.26) 25%,rgba(60,74,53,.26) 75%,rgba(60,74,53,0));transform:rotate(-4deg);"></div><div style="position:absolute;left:660px;bottom:318px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(173,143,79,.5);background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.55),rgba(173,143,79,.06) 70%);box-shadow:0 10px 18px rgba(60,74,53,.10);"></div>`,
  css: `
  .slide{ background:#eef1e7; color:#4d5946; }
  .kickline .rule{ width:40px; height:1px; background:#ad8f4f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#ad8f4f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#3c4a35; }
  .hook b{ color:#ad8f4f; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#87907e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#505c49; }
  .body b, .poem b{ color:#2b3625; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#ad8f4f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#404e39; text-align:center; }
  .bubble{ border:1px solid rgba(60,74,53,.14); border-radius:8px; padding:54px 56px; background:rgba(250,252,246,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#87907e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#505c49; text-align:center; }
  .profile b{ color:#ad8f4f; font-weight:600; }
  .brand{ color:#9aa191; letter-spacing:3px; } .pageno{ color:#9aa191; }` },

  
deepdhara: { name: 'Deep Dhaara', chip: '#e8a24b', bg: '#10151f', arrow: '#e8a24b',
  graphic: `<div style="position:absolute;right:200px;top:230px;width:16px;height:16px;border-radius:50%;background:rgba(232,162,75,.9);box-shadow:0 0 40px 12px rgba(232,162,75,.16);"></div><div style="position:absolute;right:207px;top:266px;width:2px;height:560px;background:linear-gradient(180deg,rgba(232,162,75,.32),rgba(232,162,75,.10) 55%,rgba(232,162,75,0));"></div><div style="position:absolute;left:0;right:0;bottom:0;height:220px;background:linear-gradient(0deg,rgba(70,96,122,.10),rgba(70,96,122,0));"></div>`,
  css: `
  .slide{ background:#10151f; color:#b7b3a7; }
  .kickline .rule{ width:40px; height:1px; background:#e8a24b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#e8a24b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#e8e2d4; }
  .hook b{ color:#e8a24b; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8e94a1; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#aeaa9e; }
  .body b, .poem b{ color:#f4efe3; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e8a24b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#ddd7c9; text-align:center; }
  .bubble{ border:1px solid rgba(232,226,212,.12); border-radius:8px; padding:54px 56px; background:rgba(255,255,255,.03); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8e94a1; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#aeaa9e; text-align:center; }
  .profile b{ color:#e8a24b; font-weight:600; }
  .brand{ color:#5f6672; letter-spacing:3px; } .pageno{ color:#5f6672; }` },

  
jalsyahi: { name: 'Jal-Syahi', chip: '#3e4c7a', bg: '#f4f2ec', arrow: '#3e4c7a',
  graphic: `<div style="position:absolute;top:-140px;left:600px;width:430px;height:660px;border-radius:50%;background:radial-gradient(ellipse at 50% 14%,rgba(62,76,122,.14),rgba(62,76,122,.05) 48%,rgba(62,76,122,0) 72%);"></div><div style="position:absolute;top:150px;left:700px;width:150px;height:360px;border-radius:50%;background:radial-gradient(ellipse at 50% 0%,rgba(62,76,122,.10),rgba(62,76,122,0) 70%);"></div><div style="position:absolute;top:60px;left:790px;width:1px;height:280px;background:linear-gradient(180deg,rgba(62,76,122,.30),rgba(62,76,122,0));"></div>`,
  css: `
  .slide{ background:#f4f2ec; color:#434852; }
  .kickline .rule{ width:40px; height:1px; background:#3e4c7a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#3e4c7a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#2a2f3a; }
  .hook b{ color:#3e4c7a; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8a8d94; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#494e58; }
  .body b, .poem b{ color:#1e222b; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#3e4c7a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#2e3440; text-align:center; }
  .bubble{ border:1px solid rgba(42,47,58,.13); border-radius:8px; padding:54px 56px; background:rgba(252,251,247,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a8d94; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#494e58; text-align:center; }
  .profile b{ color:#3e4c7a; font-weight:600; }
  .brand{ color:#9c9e9f; letter-spacing:3px; } .pageno{ color:#9c9e9f; }` },

  
jheel: { name: 'Jheel', chip: '#3f6b62', bg: '#e4edea', arrow: '#3f6b62',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:440px;background:linear-gradient(180deg,rgba(63,107,98,.06),rgba(63,107,98,.13));"></div><div style="position:absolute;left:0;right:0;bottom:440px;height:1px;background:rgba(47,68,64,.30);"></div><div style="position:absolute;left:120px;bottom:400px;width:160px;height:1px;background:rgba(47,68,64,.16);"></div><div style="position:absolute;left:150px;bottom:372px;width:90px;height:1px;background:rgba(47,68,64,.10);"></div>`,
  css: `
  .slide{ background:#e4edea; color:#43564f; }
  .kickline .rule{ width:40px; height:1px; background:#3f6b62; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#3f6b62; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#2f4440; }
  .hook b{ color:#3f6b62; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#7c8f8b; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#475a54; }
  .body b, .poem b{ color:#20312d; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#3f6b62; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#334843; text-align:center; }
  .bubble{ border:1px solid rgba(47,68,64,.14); border-radius:8px; padding:54px 56px; background:rgba(246,251,249,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7c8f8b; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#475a54; text-align:center; }
  .profile b{ color:#3f6b62; font-weight:600; }
  .brand{ color:#92a29d; letter-spacing:3px; } .pageno{ color:#92a29d; }` },

  metroLine: { name: 'Metro Line', chip: '#2a5caa', bg: '#f2f0ec', arrow: '#2a5caa',
  graphic: `<div style="position:absolute;left:120px;right:120px;bottom:170px;height:2px;background:rgba(35,40,46,.14);"></div><div style="position:absolute;left:120px;right:120px;bottom:158px;height:26px;display:flex;justify-content:space-between;align-items:center;"><div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(35,40,46,.16);background:#f2f0ec;"></div><div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(35,40,46,.16);background:#f2f0ec;"></div><div style="width:26px;height:26px;border-radius:50%;background:#2a5caa;box-shadow:0 0 0 6px rgba(42,92,170,.12);"></div><div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(35,40,46,.16);background:#f2f0ec;"></div><div style="width:14px;height:14px;border-radius:50%;border:2px solid rgba(35,40,46,.16);background:#f2f0ec;"></div></div>`,
  css: `
  .slide{ background:#f2f0ec; color:#4a525b; }
  .kickline .rule{ width:34px; height:8px; background:#2a5caa; border-radius:4px; }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.3em; text-transform:uppercase; color:#2a5caa; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.42; color:#23282e; }
  .hook b{ color:#2a5caa; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8a8f95; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#4a525b; }
  .body b, .poem b{ color:#1d2126; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:600; font-size:30px; color:#2a5caa; letter-spacing:3px; border-bottom:3px solid #2a5caa; padding-bottom:6px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#2b3138; text-align:center; }
  .bubble{ background:#fbfaf7; border:1px solid #dcd9d1; border-left:6px solid #2a5caa; border-radius:10px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a8f95; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#4a525b; text-align:center; }
  .profile b{ color:#2a5caa; font-weight:600; }
  .brand{ color:#9aa0a6; letter-spacing:3px; } .pageno{ color:#9aa0a6; }` },

  railingShadow: { name: 'Balcony 5PM', chip: '#b4622d', bg: '#f7edda', arrow: '#b4622d',
  graphic: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(64deg,rgba(122,82,42,.08) 0px,rgba(122,82,42,.08) 12px,rgba(122,82,42,0) 12px,rgba(122,82,42,0) 104px);"></div><div style="position:absolute;left:0;right:0;top:0;height:300px;background:linear-gradient(180deg,rgba(255,214,150,.18),rgba(255,214,150,0));"></div>`,
  css: `
  .slide{ background:#f7edda; color:#5b4c3b; }
  .kickline .rule{ width:40px; height:1px; background:#b4622d; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#b4622d; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#382c20; }
  .hook b{ color:#b4622d; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9a8a76; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5b4c3b; }
  .body b, .poem b{ color:#2f251a; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#b4622d; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#43362a; text-align:center; }
  .bubble{ border:1px solid rgba(122,82,42,.18); border-radius:6px; background:rgba(253,246,234,.6); padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a8a76; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5b4c3b; text-align:center; }
  .profile b{ color:#b4622d; font-weight:600; }
  .brand{ color:#ab9c86; letter-spacing:3px; } .pageno{ color:#ab9c86; }` },

  terraceHour: { name: 'Terrace Hour', chip: '#e8a13d', bg: '#1b2430', arrow: '#e8a13d',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:140px;height:1px;background:rgba(232,228,218,.28);"></div><div style="position:absolute;left:140px;bottom:141px;width:90px;height:44px;border:1px solid rgba(232,228,218,.22);border-bottom:none;"></div><div style="position:absolute;left:230px;bottom:141px;width:150px;height:26px;border:1px solid rgba(232,228,218,.22);border-bottom:none;"></div><div style="position:absolute;right:170px;bottom:141px;width:60px;height:58px;border:1px solid rgba(232,228,218,.22);border-bottom:none;border-radius:6px 6px 0 0;"></div><div style="position:absolute;right:196px;bottom:170px;width:10px;height:12px;background:#e8a13d;box-shadow:0 0 18px rgba(232,161,61,.55);"></div>`,
  css: `
  .slide{ background:#1b2430; color:#c3c9d2; }
  .kickline .rule{ width:40px; height:1px; background:#e8a13d; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#e8a13d; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#eee9de; }
  .hook b{ color:#e8a13d; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#96a0af; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#c3c9d2; }
  .body b, .poem b{ color:#f4f0e6; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e8a13d; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#e6e3da; text-align:center; }
  .bubble{ border:1px solid rgba(232,228,218,.14); border-radius:8px; background:rgba(255,255,255,.03); padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#96a0af; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c3c9d2; text-align:center; }
  .profile b{ color:#e8a13d; font-weight:600; }
  .brand{ color:#77808d; letter-spacing:3px; } .pageno{ color:#77808d; }` },

  wetSignal: { name: 'Signal Red', chip: '#e04a3f', bg: '#161216', arrow: '#e04a3f',
  graphic: `<div style="position:absolute;right:150px;top:140px;width:26px;height:26px;border-radius:50%;background:#e04a3f;box-shadow:0 0 34px 10px rgba(224,74,63,.35);"></div><div style="position:absolute;right:128px;top:180px;bottom:0;width:70px;background:linear-gradient(180deg,rgba(224,74,63,.14),rgba(224,74,63,0) 75%);"></div>`,
  css: `
  .slide{ background:#161216; color:#cfc6c9; }
  .kickline .rule{ width:40px; height:1px; background:#e04a3f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#e04a3f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#f1ecea; }
  .hook b{ color:#e04a3f; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9d9298; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#cfc6c9; }
  .body b, .poem b{ color:#f6f1ef; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e04a3f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#ece7e6; text-align:center; }
  .bubble{ background:rgba(255,255,255,.035); border:1px solid rgba(224,74,63,.22); border-radius:8px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9d9298; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#cfc6c9; text-align:center; }
  .profile b{ color:#e04a3f; font-weight:600; }
  .brand{ color:#7c7176; letter-spacing:3px; } .pageno{ color:#7c7176; }` },

  milkDawn: { name: 'Doodh Dawn', chip: '#3f6f9e', bg: '#eaeff3', arrow: '#3f6f9e',
  graphic: `<div style="position:absolute;left:0;right:0;top:0;height:260px;background:linear-gradient(180deg,rgba(235,178,138,.16),rgba(235,178,138,0));"></div><div style="position:absolute;left:130px;right:130px;bottom:190px;height:1px;background:rgba(47,72,96,.18);"></div><div style="position:absolute;left:170px;bottom:191px;width:36px;height:48px;border:2px solid #3f6f9e;border-radius:4px 4px 8px 8px;transform:rotate(-4deg);background:rgba(251,253,255,.6);"></div><div style="position:absolute;left:177px;bottom:214px;width:23px;height:2px;background:#3f6f9e;transform:rotate(-4deg);"></div>`,
  css: `
  .slide{ background:#eaeff3; color:#51606d; }
  .kickline .rule{ width:8px; height:8px; border-radius:50%; background:#3f6f9e; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#3f6f9e; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.48; color:#2c3945; }
  .hook b{ color:#3f6f9e; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8b97a1; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#51606d; }
  .body b, .poem b{ color:#243039; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#3f6f9e; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#33414e; text-align:center; }
  .bubble{ background:rgba(252,254,255,.7); border:1px solid rgba(63,111,158,.16); border-radius:12px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8b97a1; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#51606d; text-align:center; }
  .profile b{ color:#3f6f9e; font-weight:600; }
  .brand{ color:#9baab4; letter-spacing:3px; } .pageno{ color:#9baab4; }` },

  maidaanCrease: { name: 'Maidaan Chalk', chip: '#a6452f', bg: '#e7dfcd', arrow: '#a6452f',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:420px;background:linear-gradient(0deg,rgba(196,182,150,.16),rgba(196,182,150,0));"></div><div style="position:absolute;left:150px;right:150px;bottom:200px;height:2px;background:rgba(255,255,255,.65);box-shadow:0 0 6px rgba(255,255,255,.3);"></div><div style="position:absolute;left:260px;bottom:200px;width:2px;height:70px;background:rgba(255,255,255,.55);"></div><div style="position:absolute;right:260px;bottom:200px;width:2px;height:70px;background:rgba(255,255,255,.55);"></div>`,
  css: `
  .slide{ background:#e7dfcd; color:#5c5140; }
  .kickline .rule{ width:40px; height:2px; background:#a6452f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#a6452f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#3a3225; }
  .hook b{ color:#a6452f; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#988b74; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#5c5140; }
  .body b, .poem b{ color:#2e2719; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a6452f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#443a2b; text-align:center; }
  .bubble{ border:2px dashed rgba(68,58,43,.25); background:rgba(250,246,236,.5); border-radius:4px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#988b74; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5c5140; text-align:center; }
  .profile b{ color:#a6452f; font-weight:600; }
  .brand{ color:#a2957c; letter-spacing:3px; } .pageno{ color:#a2957c; }` },

  meterDown: { name: 'Meter Down', chip: '#f2b52a', bg: '#191817', arrow: '#f2b52a',
  graphic: `<div style="position:absolute;right:170px;top:140px;width:3px;height:64px;background:#f2b52a;"></div><div style="position:absolute;right:122px;top:196px;width:54px;height:18px;background:#f2b52a;border-radius:3px;transform:rotate(24deg);"></div><div style="position:absolute;left:0;right:0;bottom:150px;height:1px;background:rgba(242,181,42,.22);"></div>`,
  css: `
  .slide{ background:#191817; color:#cfc9bc; }
  .kickline .rule{ width:40px; height:2px; background:#f2b52a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.3em; text-transform:uppercase; color:#f2b52a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.44; color:#f4efe3; }
  .hook b{ color:#f2b52a; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9d968a; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#cfc9bc; }
  .body b, .poem b{ color:#faf6ea; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:600; font-size:28px; color:#191817; background:#f2b52a; padding:4px 16px; border-radius:6px; letter-spacing:2px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#efe9dc; text-align:center; }
  .bubble{ background:#232220; border:1px solid rgba(242,181,42,.25); border-left:5px solid #f2b52a; border-radius:8px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9d968a; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#cfc9bc; text-align:center; }
  .profile b{ color:#f2b52a; font-weight:600; }
  .brand{ color:#7e786c; letter-spacing:3px; } .pageno{ color:#7e786c; }` },

  pgWindow: { name: 'PG Window', chip: '#d9b27c', bg: '#242a33', arrow: '#d9b27c',
  graphic: `<div style="position:absolute;right:120px;top:150px;width:300px;height:380px;background:rgba(238,224,196,.10);transform:skewX(-8deg);"></div><div style="position:absolute;right:268px;top:150px;width:2px;height:380px;background:rgba(238,224,196,.14);transform:skewX(-8deg);"></div><div style="position:absolute;right:120px;top:338px;width:300px;height:2px;background:rgba(238,224,196,.14);transform:skewX(-8deg);"></div>`,
  css: `
  .slide{ background:#242a33; color:#c2c8d0; }
  .kickline .rule{ width:40px; height:1px; background:#d9b27c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#d9b27c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:66px; line-height:1.46; color:#e9ebee; }
  .hook b{ color:#d9b27c; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8f97a2; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#c2c8d0; }
  .body b, .poem b{ color:#f0f2f4; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#d9b27c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#e1e4e8; text-align:center; }
  .bubble{ background:rgba(255,255,255,.03); border:1px solid rgba(217,178,124,.18); border-radius:8px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f97a2; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c2c8d0; text-align:center; }
  .profile b{ color:#d9b27c; font-weight:600; }
  .brand{ color:#727a86; letter-spacing:3px; } .pageno{ color:#727a86; }` },

  liftPanel: { name: 'Lift Panel', chip: '#7fb4d8', bg: '#1e2126', arrow: '#7fb4d8',
  graphic: `<div style="position:absolute;right:150px;top:280px;display:flex;flex-direction:column;gap:36px;"><div style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(227,230,234,.16);"></div><div style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(227,230,234,.16);"></div><div style="width:16px;height:16px;border-radius:50%;background:#7fb4d8;box-shadow:0 0 22px rgba(127,180,216,.5);"></div><div style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(227,230,234,.16);"></div><div style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(227,230,234,.16);"></div></div>`,
  css: `
  .slide{ background:#1e2126; color:#c5c9cf; }
  .kickline .rule{ width:16px; height:16px; border:2px solid #7fb4d8; border-radius:50%; background:transparent; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#7fb4d8; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:64px; line-height:1.46; color:#ebedf0; }
  .hook b{ color:#7fb4d8; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8d939c; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#c5c9cf; }
  .body b, .poem b{ color:#f1f3f5; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:600; font-size:30px; color:#7fb4d8; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#e3e6ea; text-align:center; }
  .bubble{ background:#262a30; border:1px solid #343a42; border-radius:10px; padding:54px 56px; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8d939c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c5c9cf; text-align:center; }
  .profile b{ color:#7fb4d8; font-weight:600; }
  .brand{ color:#6f757e; letter-spacing:3px; } .pageno{ color:#6f757e; }` },

  kalava: { name: 'Kalava', chip: '#b3382c', bg: '#f6f1e6', arrow: '#b3382c',
  graphic: `<svg style="position:absolute;left:0;bottom:150px;width:100%;height:130px;" viewBox="0 0 1080 130" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,60 C160,44 340,80 540,62 C740,44 920,78 1080,58" stroke="#b3382c" stroke-width="1.5" opacity=".55"/><path d="M0,70 C160,86 340,50 540,70 C740,88 920,52 1080,70" stroke="#d9a027" stroke-width="1.5" opacity=".5"/><circle cx="540" cy="66" r="8" stroke="#b3382c" stroke-width="1.5" opacity=".65" fill="none"/><path d="M536,73 L522,102 M545,72 L556,100" stroke="#b3382c" stroke-width="1.5" opacity=".45"/></svg>`,
  css: `
  .slide{ background:#f6f1e6; color:#4a4036; }
  .kickline .rule{ width:44px; height:2px; background:linear-gradient(90deg,#b3382c 50%,#d9a027 50%); }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#b3382c; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:64px; line-height:1.46; color:#383026; }
  .hook b{ color:#b3382c; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8f8577; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5a5044; }
  .body b, .poem b{ color:#322a21; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:600; font-size:30px; color:#b3382c; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#443a2e; text-align:center; }
  .bubble{ border:1px solid rgba(179,56,44,.22); border-radius:6px; padding:54px 56px; background:rgba(253,250,243,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a8f80; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5a5044; text-align:center; }
  .profile b{ color:#b3382c; font-weight:600; }
  .brand{ color:#a89c8a; letter-spacing:3px; } .pageno{ color:#a89c8a; }` },

  
mehndi: { name: 'Mehndi', chip: '#8b4a26', bg: '#f5e8da', arrow: '#8b4a26',
  graphic: `<svg style="position:absolute;right:70px;bottom:120px;width:340px;height:340px;" viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mhFade" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8b4a26" stop-opacity=".65"/><stop offset="1" stop-color="#8b4a26" stop-opacity="0"/></linearGradient></defs><path d="M60,300 C-20,220 30,90 150,70 C260,52 320,140 290,210 C266,266 190,270 170,220 C152,176 200,140 236,164" stroke="url(#mhFade)" stroke-width="1.5"/><path d="M112,252 C146,230 192,236 214,258" stroke="#8b4a26" stroke-width="1" opacity=".3"/><circle cx="150" cy="70" r="3" fill="#8b4a26" opacity=".4"/></svg>`,
  css: `
  .slide{ background:#f5e8da; color:#54402f; }
  .kickline .rule{ width:40px; height:1px; background:#8b4a26; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#8b4a26; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:64px; line-height:1.48; color:#42291b; }
  .hook b{ color:#8b4a26; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9c8574; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5f4936; }
  .body b, .poem b{ color:#332013; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8b4a26; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:58px; line-height:1.74; color:#4a3021; text-align:center; }
  .bubble{ border:1px solid rgba(139,74,38,.2); border-radius:20px; padding:54px 56px; background:rgba(250,241,231,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a58c79; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5f4936; text-align:center; }
  .profile b{ color:#8b4a26; font-weight:600; }
  .brand{ color:#b09a87; letter-spacing:3px; } .pageno{ color:#b09a87; }` },

  
anjuri: { name: 'Anjuri', chip: '#e8963f', bg: '#191007', arrow: '#e8963f',
  graphic: `<div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:radial-gradient(ellipse 420px 300px at 50% 88%, rgba(232,150,63,.16), rgba(232,150,63,0) 70%);"></div><svg style="position:absolute;left:50%;bottom:110px;transform:translateX(-50%);width:300px;height:190px;" viewBox="0 0 300 190" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M150,58 C138,80 136,96 150,108 C164,96 161,78 150,58" fill="#e8963f" opacity=".85"/><path d="M150,108 C147,118 147,124 150,130" stroke="#e8963f" stroke-width="1.5" opacity=".5"/><path d="M52,132 C88,168 212,168 248,132" stroke="#e8963f" stroke-width="1.5" opacity=".55"/><path d="M74,150 C104,178 196,178 226,150" stroke="#e8963f" stroke-width="1" opacity=".3"/></svg>`,
  css: `
  .slide{ background:#191007; color:#cbb894; }
  .kickline .rule{ width:40px; height:1px; background:#e8963f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#e8963f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:68px; line-height:1.44; color:#f2e3c8; }
  .hook b{ color:#e8963f; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#a08d6e; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#c4b190; }
  .body b, .poem b{ color:#f2e3c8; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#e8963f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#e9d9b8; text-align:center; }
  .bubble{ border:1px solid rgba(232,150,63,.25); border-radius:8px; padding:54px 56px; background:rgba(36,26,14,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8f7c5d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c4b190; text-align:center; }
  .profile b{ color:#e8963f; font-weight:600; }
  .brand{ color:#7d6c50; letter-spacing:3px; } .pageno{ color:#7d6c50; }` },

  
pranam: { name: 'Pranam', chip: '#c2401f', bg: '#faf8f3', arrow: '#33312c',
  graphic: `<svg style="position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:220px;height:240px;" viewBox="0 0 220 240" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M84,10 C111,66 111,174 84,230" stroke="#33312c" stroke-width="1.5" opacity=".5"/><path d="M136,10 C109,66 109,174 136,230" stroke="#33312c" stroke-width="1.5" opacity=".5"/><circle cx="110" cy="120" r="4" fill="#c2401f"/></svg>`,
  css: `
  .slide{ background:#faf8f3; color:#4a4841; }
  .kickline .rule{ width:28px; height:1px; background:#33312c; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.3em; text-transform:uppercase; color:#8e8b82; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:70px; line-height:1.44; color:#33312c; }
  .hook b{ color:#c2401f; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8e8b82; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.64; color:#55534b; }
  .body b, .poem b{ color:#26241f; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8e8b82; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:58px; line-height:1.76; color:#3a3833; text-align:center; }
  .bubble{ border:1px solid #e7e3d8; border-radius:4px; padding:56px 58px; background:#ffffff; }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#9a978d; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#55534b; text-align:center; }
  .profile b{ color:#c2401f; font-weight:600; }
  .brand{ color:#a5a297; letter-spacing:3px; } .pageno{ color:#a5a297; }` },

  
achaar: { name: 'Achaar Dhoop', chip: '#a52a1a', bg: '#f4da92', arrow: '#4a3110',
  graphic: `<div style="position:absolute;inset:0;background:linear-gradient(118deg,rgba(255,249,222,.55),rgba(255,249,222,0) 46%);"></div><svg style="position:absolute;right:100px;bottom:230px;width:300px;height:400px;overflow:visible" viewBox="0 0 300 400" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="achaarHatch" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="9" stroke="#8a1f12" stroke-width="1.4" opacity=".55"/></pattern><pattern id="achaarHatch2" width="9" height="9" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="9" stroke="#8a1f12" stroke-width="1" opacity=".3"/></pattern></defs><!-- hard dhoop shadow cast to lower-left --><path d="M70 366 L-64 396 L96 398 L216 392 Z" fill="#4a3110" opacity=".16"/><!-- glass body --><path d="M74,120 C58,190 56,290 76,356 C81,374 219,374 224,356 C244,290 242,190 226,120 Z" fill="#fdf3d3" opacity=".65"/><!-- pickle fill (achaar) --><path d="M70,168 C62,230 62,300 78,352 C84,368 216,368 222,352 C238,300 238,230 230,168 Z" fill="#c05a17" opacity=".55"/><!-- pickle chunks --><g fill="#8a3a0c" opacity=".5"><ellipse cx="112" cy="220" rx="16" ry="10" transform="rotate(-18 112 220)"/><ellipse cx="176" cy="252" rx="18" ry="11" transform="rotate(24 176 252)"/><ellipse cx="132" cy="300" rx="15" ry="9" transform="rotate(8 132 300)"/><ellipse cx="196" cy="318" rx="13" ry="8" transform="rotate(-30 196 318)"/><ellipse cx="98" cy="330" rx="12" ry="8" transform="rotate(40 98 330)"/><ellipse cx="160" cy="196" rx="12" ry="7" transform="rotate(-40 160 196)"/></g><!-- oil line --><path d="M70 168 C 110 158 190 158 230 168" stroke="#8a3a0c" stroke-width="2" opacity=".5"/><!-- glass outline (strong) --><path d="M74,120 C58,190 56,290 76,356 C81,374 219,374 224,356 C244,290 242,190 226,120" stroke="#4a3110" stroke-width="3" opacity=".85"/><!-- glass highlight --><path d="M92,140 C82,200 82,280 94,336" stroke="#fff6db" stroke-width="7" stroke-linecap="round" opacity=".55"/><!-- cloth top: taller dome so the hatching reads --><path d="M64,118 C78,58 222,58 236,118 C214,134 86,134 64,118 Z" fill="#f3e4c2"/><path d="M64,118 C78,58 222,58 236,118 C214,134 86,134 64,118 Z" fill="url(#achaarHatch)"/><path d="M64,118 C78,58 222,58 236,118 C214,134 86,134 64,118 Z" fill="url(#achaarHatch2)"/><path d="M64,118 C78,58 222,58 236,118 C214,134 86,134 64,118 Z" stroke="#4a3110" stroke-width="2.4" opacity=".8"/><!-- cloth peak knot --><path d="M136,66 C142,50 158,50 164,66" stroke="#4a3110" stroke-width="2.4" opacity=".8" fill="none"/><path d="M64,116 C100,102 200,102 236,116" stroke="#a52a1a" stroke-width="4.5" opacity=".9"/><path d="M64,120 C100,108 200,108 236,120" stroke="#a52a1a" stroke-width="2.5" opacity=".6"/><path d="M228,118 l26,22 M232,114 l30,10" stroke="#a52a1a" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>`,
  css: `
  .slide{ background:#f4da92; color:#553f16; }
  .kickline .rule{ width:44px; height:2px; background:#a52a1a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.24em; text-transform:uppercase; color:#a52a1a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:620; font-size:62px; line-height:1.46; color:#42300f; }
  .hook b{ color:#a52a1a; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8a6d33; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.6; color:#553f16; }
  .body b, .poem b{ color:#2f2208; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:700; font-size:30px; color:#a52a1a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:58px; line-height:1.7; color:#4a3512; text-align:center; }
  .bubble{ border:1px solid rgba(74,49,16,.18); border-radius:10px; padding:54px 56px; background:rgba(255,244,208,.55); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8a6d33; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#553f16; text-align:center; }
  .profile b{ color:#a52a1a; font-weight:600; }
  .brand{ color:#97803f; letter-spacing:3px; } .pageno{ color:#97803f; }` },

  
tulsi: { name: 'Tulsi Sandhya', chip: '#a8c47a', bg: '#223a38', arrow: '#a8c47a',
  graphic: `<svg style="position:absolute;left:50%;bottom:110px;transform:translateX(-50%);width:300px;height:310px;" viewBox="0 0 300 310" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60,310 L60,276 L240,276 L240,310 M82,276 L82,244 L218,244 L218,276 M102,244 L102,216 L198,216 L198,244" stroke="#a8c47a" stroke-width="1.5" opacity=".45"/><path d="M116,216 L108,178 L192,178 L184,216" stroke="#a8c47a" stroke-width="1.5" opacity=".5"/><path d="M150,178 C150,150 148,124 150,98" stroke="#a8c47a" stroke-width="1.5" opacity=".6"/><path d="M150,152 C136,146 128,132 132,118 C146,124 152,138 150,152 M150,130 C164,124 172,110 168,96 C154,102 148,116 150,130 M150,108 C142,100 140,86 146,76 C156,84 156,98 150,108" stroke="#a8c47a" stroke-width="1" opacity=".55"/><path d="M258,266 C252,276 252,284 258,290 C264,284 264,275 258,266" fill="#e0a34c" opacity=".9"/><path d="M246,292 C250,300 266,300 270,292" stroke="#e0a34c" stroke-width="1.5" opacity=".5"/></svg>`,
  css: `
  .slide{ background:#223a38; color:#bccec2; }
  .kickline .rule{ width:40px; height:1px; background:#a8c47a; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#a8c47a; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:64px; line-height:1.46; color:#dce8de; }
  .hook b{ color:#a8c47a; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#8aa398; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#bccec2; }
  .body b, .poem b{ color:#e8f1e8; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a8c47a; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.72; color:#d7e5d6; text-align:center; }
  .bubble{ border:1px solid rgba(168,196,122,.22); border-radius:8px; padding:54px 56px; background:rgba(43,70,68,.45); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#7e978c; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#bccec2; text-align:center; }
  .profile b{ color:#a8c47a; font-weight:600; }
  .brand{ color:#6d857b; letter-spacing:3px; } .pageno{ color:#6d857b; }` },

  
bhaap: { name: 'Bhaap', chip: '#d9a13b', bg: '#1d222f', arrow: '#d9a13b',
  graphic: `<svg style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);width:320px;height:420px;" viewBox="0 0 320 420" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="stm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#eef0f4" stop-opacity=".5"/><stop offset="1" stop-color="#eef0f4" stop-opacity="0"/></linearGradient></defs><ellipse cx="160" cy="352" rx="96" ry="20" stroke="#d9a13b" stroke-width="1.5" opacity=".6"/><path d="M64,352 C66,372 72,388 84,398 M256,352 C254,372 248,388 236,398" stroke="#d9a13b" stroke-width="1" opacity=".35"/><path d="M118,330 C98,290 138,258 118,214 C102,178 130,140 118,104" stroke="url(#stm)" stroke-width="1.5"/><path d="M162,336 C186,288 142,250 168,200 C188,162 152,118 172,66" stroke="url(#stm)" stroke-width="1.5"/><path d="M206,330 C226,296 192,262 212,222 C228,190 204,150 216,118" stroke="url(#stm)" stroke-width="1"/></svg>`,
  css: `
  .slide{ background:#1d222f; color:#c3c9d6; }
  .kickline .rule{ width:40px; height:1px; background:#d9a13b; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#d9a13b; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:70px; line-height:1.44; color:#eef0f4; }
  .hook b{ color:#d9a13b; font-weight:600; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#9aa2b5; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#c3c9d6; }
  .body b, .poem b{ color:#eef0f4; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#d9a13b; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.74; color:#e4e7ee; text-align:center; }
  .bubble{ border:1px solid rgba(217,161,59,.22); border-radius:10px; padding:54px 56px; background:rgba(38,44,60,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#848da3; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c3c9d6; text-align:center; }
  .profile b{ color:#d9a13b; font-weight:600; }
  .brand{ color:#707a92; letter-spacing:3px; } .pageno{ color:#707a92; }` },

  
gaanth: { name: 'Gaanth', chip: '#a04a52', bg: '#f2e3e0', arrow: '#a04a52',
  graphic: `<svg style="position:absolute;left:0;bottom:160px;width:100%;height:120px;" viewBox="0 0 1080 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,64 C220,52 430,76 510,62 C534,58 540,38 560,38 C578,38 584,54 570,64 C558,72 542,66 546,54" stroke="#a04a52" stroke-width="1.5" opacity=".55"/><path d="M562,62 C740,52 930,74 1080,62" stroke="#a04a52" stroke-width="1.5" opacity=".55"/><path d="M0,96 C260,86 520,104 780,92 C880,88 990,98 1080,92" stroke="#a04a52" stroke-width="1" opacity=".16"/></svg>`,
  css: `
  .slide{ background:#f2e3e0; color:#5d484d; }
  .kickline .rule{ width:44px; height:0; border-top:1px dashed #a04a52; }
  .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.28em; text-transform:uppercase; color:#a04a52; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:64px; line-height:1.48; color:#453036; }
  .hook b{ color:#a04a52; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#a08388; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#5d484d; }
  .body b, .poem b{ color:#3a282d; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#a04a52; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:58px; line-height:1.74; color:#4c353b; text-align:center; }
  .bubble{ border:1px dashed rgba(160,74,82,.35); border-radius:8px; padding:54px 56px; background:rgba(249,239,237,.6); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#a8898e; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#5d484d; text-align:center; }
  .profile b{ color:#a04a52; font-weight:600; }
  .brand{ color:#ab9297; letter-spacing:3px; } .pageno{ color:#ab9297; }` },

  
niwala: { name: 'Pehla Niwala', chip: '#c9973f', bg: '#243b28', arrow: '#c9973f',
  graphic: `<svg style="position:absolute;left:50%;bottom:90px;transform:translateX(-50%);width:340px;height:300px;" viewBox="0 0 340 300" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="150" cy="170" r="118" stroke="#c9973f" stroke-width="1.5" opacity=".5"/><circle cx="150" cy="170" r="100" stroke="#c9973f" stroke-width="1" opacity=".22"/><circle cx="296" cy="64" r="18" stroke="#c9973f" stroke-width="1.5" opacity=".8"/></svg>`,
  css: `
  .slide{ background:#243b28; color:#c8d2bd; }
  .kickline .rule{ width:40px; height:1px; background:#c9973f; }
  .kickline .kt{ font-family:'Poppins'; font-weight:500; font-size:21px; letter-spacing:.26em; text-transform:uppercase; color:#c9973f; }
  .hook{ font-family:'Laila','Georgia',serif; font-weight:600; font-size:66px; line-height:1.44; color:#e9e9d8; }
  .hook b{ color:#c9973f; font-weight:700; }
  .sub{ font-family:'Poppins'; font-weight:400; font-size:29px; color:#94a98f; margin-top:36px; line-height:1.6; }
  .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:44px; line-height:1.62; color:#c8d2bd; }
  .body b, .poem b{ color:#eef0dd; font-weight:600; }
  .body .num{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#c9973f; letter-spacing:3px; }
  .poem{ font-family:'Laila','Georgia',serif; font-weight:500; font-size:60px; line-height:1.7; color:#e2e6cf; text-align:center; }
  .bubble{ border:1px solid rgba(201,151,63,.25); border-radius:8px; padding:54px 56px; background:rgba(41,71,51,.5); }
  .kicker{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#84997f; margin-top:30px; letter-spacing:2px; }
  .profile{ font-family:'Poppins'; font-weight:400; font-size:37px; line-height:1.62; color:#c8d2bd; text-align:center; }
  .profile b{ color:#c9973f; font-weight:600; }
  .brand{ color:#748a70; letter-spacing:3px; } .pageno{ color:#748a70; }` },

  };

  // ================= INFOGRAPHIC BLOCKS: real visual structures, palette-aware =================
  // per-look palette so blocks (quadrant/columns/compare/gauge/scripture/stat/steps) adopt each look's colours
  const PAL = {
    /* A4: body/sub on pure black must clear ~4.5:1 (footnote-scale exempt). */
    midnight:{bg:'#000',ink:'#fff',sub:'#9a9a9a',acc:'#ffffff',acc2:'#c9c9c9',panel:'#141414',line:'#3a3a3a'},
    paper:{bg:'#f1ece0',ink:'#22201c',sub:'#6b665e',acc:'#b0602f',acc2:'#8a5a30',panel:'#e7dfce',line:'#cbbfa8'},
    loud:{bg:'#f4f3ee',ink:'#161616',sub:'#5a5a5a',acc:'#ee4b2b',acc2:'#161616',panel:'#ffffff',line:'#dcdcd4'},
    grid:{bg:'#fbfbf9',ink:'#14161a',sub:'#5c5f66',acc:'#1b3a6b',acc2:'#14161a',panel:'#ffffff',line:'#d8d6cf'},
    dusk:{bg:'#3a2350',ink:'#f6ecdd',sub:'#d3c2ae',acc:'#e6b566',acc2:'#f6ecdd',panel:'rgba(255,255,255,.06)',line:'rgba(230,181,102,.4)'},
    riso:{bg:'#efe7d6',ink:'#20308f',sub:'#41519a',acc:'#f0533f',acc2:'#20308f',panel:'#ffffff',line:'rgba(32,48,143,.25)'},
    brut:{bg:'#faf8f2',ink:'#111',sub:'#333',acc:'#2f4cf0',acc2:'#111',panel:'#ffffff',line:'#111'},
    cover:{bg:'#3d1219',ink:'#f4ecdd',sub:'#c7b49a',acc:'#d8a24a',acc2:'#f4ecdd',panel:'rgba(255,255,255,.05)',line:'rgba(216,162,74,.4)'},
    note:{bg:'#fbf9f2',ink:'#2a2a28',sub:'#6a675e',acc:'#e0524b',acc2:'#2a2a28',panel:'#ffffff',line:'#e2ddcf'},
    aura:{bg:'#e9def0',ink:'#34303a',sub:'#5f5a68',acc:'#6b5cf0',acc2:'#c15b8a',panel:'rgba(255,255,255,.6)',line:'rgba(0,0,0,.1)'},
    blueprint:{bg:'#0e2f52',ink:'#eaf3fb',sub:'#9fc0dc',acc:'#5cc8ff',acc2:'#eaf3fb',panel:'rgba(10,40,70,.5)',line:'rgba(120,180,230,.35)'},
    kraft:{bg:'#c3a878',ink:'#33281a',sub:'#6a5638',acc:'#9a4a25',acc2:'#33281a',panel:'rgba(255,255,255,.35)',line:'rgba(122,74,42,.45)'},
    garden:{bg:'#eef1e6',ink:'#2b3527',sub:'#5f6b58',acc:'#9a7b3f',acc2:'#2b3527',panel:'#ffffff',line:'#c7cbb8'},
    press:{bg:'#f2efe6',ink:'#111',sub:'#444',acc:'#8a1a1a',acc2:'#111',panel:'#ffffff',line:'#cbc6b8'},
    neon:{bg:'#0a0a12',ink:'#fff',sub:'#a9a0d8',acc:'#00f0ff',acc2:'#ff3df0',panel:'rgba(20,16,38,.7)',line:'rgba(0,240,255,.3)'},
    memphis:{bg:'#fbf4e7',ink:'#1e1e24',sub:'#55555f',acc:'#ff5b7f',acc2:'#3d7bff',panel:'#fff7ea',line:'#1e1e24'},
    marble:{bg:'#f4f2ec',ink:'#1f1d18',sub:'#5c584e',acc:'#a8863f',acc2:'#1f1d18',panel:'#ffffff',line:'#cdbf9a'},
    chalk:{bg:'#28322c',ink:'#f3f1e8',sub:'#c7d0be',acc:'#ffe08a',acc2:'#8fd4a8',panel:'rgba(255,255,255,.08)',line:'rgba(255,255,255,.3)'},
    zen:{bg:'#f6f3ec',ink:'#26221c',sub:'#6b6455',acc:'#b23a2e',acc2:'#26221c',panel:'#ffffff',line:'#d8d1c2'},
    bauhaus:{bg:'#efe9dd',ink:'#161616',sub:'#4a4a4a',acc:'#d1341f',acc2:'#1c50b0',panel:'#ffffff',line:'#161616'},
    journal:{bg:'#fcfaf2',ink:'#2c2924',sub:'#6a655a',acc:'#c9603f',acc2:'#2c2924',panel:'#ffffff',line:'#d8d0bc'},
    sunrise:{bg:'#ffb27a',ink:'#4a2318',sub:'#7a3d28',acc:'#c23b2b',acc2:'#4a2318',panel:'rgba(255,240,215,.7)',line:'rgba(90,42,26,.3)'},
    transit:{bg:'#232326',ink:'#fff',sub:'#a7a7a2',acc:'#f5a623',acc2:'#fff',panel:'#141416',line:'rgba(245,166,35,.4)'},
    vapor:{bg:'#5b2a8c',ink:'#fff',sub:'#f0d0f5',acc:'#5ffbf1',acc2:'#ffe15a',panel:'rgba(40,10,60,.35)',line:'rgba(95,251,241,.4)'},
    letterpress:{bg:'#e9e3d5',ink:'#2e281f',sub:'#645a48',acc:'#7c5a2a',acc2:'#2e281f',panel:'#ffffff',line:'#c3b79d'},
    woodcut:{bg:'#efe6d0',ink:'#1a1712',sub:'#5a5344',acc:'#b0301f',acc2:'#1a1712',panel:'#ffffff',line:'#1a1712'},
    data:{bg:'#fbfbfa',ink:'#16161c',sub:'#5a5a64',acc:'#0a7cff',acc2:'#16161c',panel:'#ffffff',line:'#d3d3da'},
    deco:{bg:'#141414',ink:'#f4ecd6',sub:'#b3a988',acc:'#c8a24a',acc2:'#f4ecd6',panel:'rgba(255,255,255,.04)',line:'#6a5a30'},
    tape:{bg:'#e6ddc9',ink:'#2c2924',sub:'#6a655a',acc:'#c9603f',acc2:'#2c2924',panel:'#fffdf6',line:'#e0d8c4'},
    terminal:{bg:'#0b1410',ink:'#d6ffe6',sub:'#5a9c74',acc:'#35d07f',acc2:'#d6ffe6',panel:'rgba(20,50,35,.4)',line:'#2a5c3f'},
    manuscript:{bg:'#ece0c4',ink:'#2e2413',sub:'#6a5a3a',acc:'#a01e1e',acc2:'#b08d3f',panel:'#fff',line:'#c9b78f'},
    noir:{bg:'#0d0d0d',ink:'#fff',sub:'#8a8a8a',acc:'#c62828',acc2:'#fff',panel:'#161616',line:'#333'},
    oracle:{bg:'#16123a',ink:'#f2ecff',sub:'#b0a6d0',acc:'#d9b45c',acc2:'#f2ecff',panel:'rgba(255,255,255,.05)',line:'rgba(217,180,92,.4)'},
    ledger:{bg:'#f4f7f3',ink:'#182019',sub:'#5a6a5e',acc:'#c0392b',acc2:'#2c5f8a',panel:'#fff',line:'#cdd8ce'},
    cyanotype:{bg:'#0d3f63',ink:'#f4fbff',sub:'#a6cbe0',acc:'#bfe3f5',acc2:'#fff',panel:'rgba(255,255,255,.06)',line:'rgba(191,227,245,.4)'},
    street:{bg:'#2c2c2c',ink:'#fff',sub:'#b0b0a8',acc:'#f2c500',acc2:'#fff',panel:'#1c1c1c',line:'#f2c500'},
    typewriter:{bg:'#f2ece0',ink:'#1c1913',sub:'#6a6155',acc:'#8a6a2a',acc2:'#1c1913',panel:'#fff',line:'#b8ad96'},
  
    museum:{"bg":"#f3efe3","ink":"#181512","sub":"#756d60","acc":"#8e2d22","acc2":"#5c584e","panel":"#faf7ee","line":"#c9b99a"},
    footnote:{"bg":"#fbfaf4","ink":"#111827","sub":"#64748b","acc":"#b33a2f","acc2":"#334155","panel":"#ffffff","line":"#d8d1c2"},
    palimpsest:{"bg":"#efe1c2","ink":"#21160f","sub":"#715d42","acc":"#9c2f1d","acc2":"#1d4f78","panel":"#f8edcf","line":"#c1a878"},
    casefile:{"bg":"#f6f1e7","ink":"#171717","sub":"#5f6268","acc":"#c51f1a","acc2":"#234d6b","panel":"#fffaf0","line":"#c9c0b2"},
    therapylab:{"bg":"#eef7f3","ink":"#1b2a28","sub":"#64746f","acc":"#177a5b","acc2":"#d8912f","panel":"#ffffff","line":"#b8d6cc"},
    broadsheet:{"bg":"#f7f0df","ink":"#15110d","sub":"#61584d","acc":"#b81423","acc2":"#0f5d68","panel":"#fff8e8","line":"#bcae95"},
    fieldmap:{"bg":"#edf1ed","ink":"#18201c","sub":"#68746b","acc":"#b65f2a","acc2":"#2d6a72","panel":"#f9fbf7","line":"#9fb0a4"},
    noirstage:{"bg":"#070707","ink":"#f5efe5","sub":"#a8a095","acc":"#e02323","acc2":"#f0c14b","panel":"#121212","line":"#39312d"},
    departure:{"bg":"#111411","ink":"#f7f4df","sub":"#9ca39a","acc":"#ffd21f","acc2":"#2bc7a5","panel":"#191d19","line":"#30382f"},
    sacredgeo:{"bg":"#fbf4e6","ink":"#151515","sub":"#6b6257","acc":"#b76e33","acc2":"#173f6b","panel":"#fffaf0","line":"#cbb68b"},
    cinema:{bg:'#101318',ink:'#eceade',sub:'#8e9096',acc:'#dcc27d',acc2:'#f2efe4',panel:'#181c23',line:'#262b33'},
    jharokha:{bg:'#11393b',ink:'#f1e9d6',sub:'#a8b3a0',acc:'#c9a24b',acc2:'#e7dfc9',panel:'#16443f',line:'#2d5350'},
    haldi:{bg:'#f4dfa4',ink:'#3a2c18',sub:'#7c6238',acc:'#a85a28',acc2:'#48371e',panel:'#f9efd2',line:'#d9bd7d'},
    slate:{bg:'#24332d',ink:'#edf0e7',sub:'#9fb0a5',acc:'#edf0e7',acc2:'#b9c6bb',panel:'#2b3c35',line:'#3d4f47'},
    qalamWash:{bg:'#f2eee6',ink:'#27221d',sub:'#8a7d6e',acc:'#8a4b31',acc2:'#1d1915',panel:'#eae4d8',line:'#cfc6b6'},
    terracottaFresco:{bg:'#d9b892',ink:'#2f211b',sub:'#735844',acc:'#7b2f20',acc2:'#8b3f2a',panel:'#e3c8a6',line:'#b99772'},
    wasliMiniature:{bg:'#f3e7d0',ink:'#2b2318',sub:'#7d6a4c',acc:'#154f5c',acc2:'#9c7f56',panel:'#f8efdd',line:'#d8c49c'},
    silverGelatin:{bg:'#171716',ink:'#e9e6df',sub:'#8b8a85',acc:'#c9c6bd',acc2:'#f2f0e9',panel:'#202020',line:'#33322f'},
    khaadiLinen:{bg:'#e9e1d0',ink:'#2f2c25',sub:'#7d7666',acc:'#2d4558',acc2:'#4a443a',panel:'#f0e9da',line:'#cec4ac'},
    copperPatina:{bg:'#14231f',ink:'#d9d2c4',sub:'#8ba095',acc:'#b6784a',acc2:'#e4ddce',panel:'#1b2d28',line:'#31463f'},
    limewashCourtyard:{bg:'#ece6d8',ink:'#38352c',sub:'#8b8574',acc:'#6f7b5d',acc2:'#4a463b',panel:'#f2ecdf',line:'#d2cab6'},
    twilightGhazal:{bg:'#211b26',ink:'#e9e2d4',sub:'#9a8fa0',acc:'#c09a71',acc2:'#f3ede3',panel:'#2a2331',line:'#3c3444'},
    oneline:{bg:'#fbfaf4',ink:'#1d1a16',sub:'#8f877a',acc:'#b39c74',acc2:'#2a2620',panel:'#f4f1e7',line:'#ddd6c6'},
    smoke:{bg:'#0e0d0c',ink:'#e6e2d8',sub:'#7c786f',acc:'#c9af86',acc2:'#f2eee2',panel:'#171614',line:'#262420'},
    doubt:{bg:'#f4f1ea',ink:'#22201b',sub:'#7a756a',acc:'#177a5b',acc2:'#3a3730',panel:'#faf8f1',line:'#ddd6c6'},
    invitation:{bg:'#161411',ink:'#efe9da',sub:'#938d7d',acc:'#c8a35c',acc2:'#cfc8b8',panel:'#1e1b17',line:'#332e26'},
    witness:{bg:'#14110c',ink:'#ece5d4',sub:'#8f887a',acc:'#e2cf9e',acc2:'#6b5f45',panel:'#1b1710',line:'#2a251c'},
    ahamseal:{bg:'#f2e9d6',ink:'#3b2f22',sub:'#7c6f5c',acc:'#9c2b1f',acc2:'#c07a4a',panel:'#ece1c9',line:'#ddd0b4'},
    upanishad:{bg:'#0b0e22',ink:'#edeaf2',sub:'#8d8ba0',acc:'#e8b26b',acc2:'#4a4468',panel:'#12152e',line:'#232748'},
    netineti:{bg:'#f8f5ee',ink:'#26241f',sub:'#8a8577',acc:'#a8422c',acc2:'#c9c2ae',panel:'#f1ede2',line:'#e3ddcd'},
    kurukshetra:{bg:'#1d1710',ink:'#d6cab2',sub:'#96896e',acc:'#cf9440',acc2:'#8a5a26',panel:'#241d14',line:'#3a3222'},
    manthan:{bg:'#0a141f',ink:'#c8d3da',sub:'#7c8b96',acc:'#d4ad5e',acc2:'#2c4257',panel:'#101b28',line:'#223140'},
    vanvaas:{bg:'#101b13',ink:'#c9d2c2',sub:'#83907c',acc:'#a9c297',acc2:'#6f8a5f',panel:'#16241a',line:'#263a29'},
    bhasma:{bg:'#dad6cf',ink:'#3a3733',sub:'#7d776f',acc:'#96503a',acc2:'#57524c',panel:'#d1ccc4',line:'#c3bcb1'},
    kohl:{bg:'#0c0a0d',ink:'#efe9db',sub:'#8b8580',acc:'#c9a9a0',acc2:'#2b2530',panel:'#141117',line:'#2a2430'},
    raatsyahi:{bg:'#080c16',ink:'#e6ebf3',sub:'#7d8698',acc:'#a9bdd8',acc2:'#1a2233',panel:'#0e1420',line:'#1a2233'},
    ember:{bg:'#0e0a07',ink:'#f0e7d9',sub:'#93867a',acc:'#dd9752',acc2:'#a05422',panel:'#16100b',line:'#2c211a'},
    velvet:{bg:'#150a0e',ink:'#f2e8d5',sub:'#95857e',acc:'#dcc19a',acc2:'#33191f',panel:'#1d0f14',line:'#33191f'},
    morningpage:{bg:'#fbf7ef',ink:'#4a4234',sub:'#8a8172',acc:'#9a6a40',acc2:'#c2a173',panel:'#f4ecdd',line:'#e4d9c2'},
    cottonsky:{bg:'#fdfefe',ink:'#3d454f',sub:'#8d97a1',acc:'#6f9cc0',acc2:'#b0cfe7',panel:'#f2f7fb',line:'#dfe9f1'},
    chandni:{bg:'#f6f8fa',ink:'#4b5260',sub:'#98a0ac',acc:'#6e8cb0',acc2:'#c6ced9',panel:'#eef1f6',line:'#e0e5ec'},
    postcard:{bg:'#f7f0df',ink:'#4e3b28',sub:'#94836d',acc:'#96522c',acc2:'#c08b5e',panel:'#f0e7cf',line:'#e3d6ba'},
    attachthread:{bg:'#ede9e1',ink:'#2f2b25',sub:'#8a857b',acc:'#b04a44',acc2:'#d8a09a',panel:'#f5f2ec',line:'#ddd6c9'},
    innerchild:{bg:'#f7ecdd',ink:'#453a30',sub:'#9a8a78',acc:'#cf7950',acc2:'#eec482',panel:'#fdf5ea',line:'#e8d9c6'},
    triggerscan:{bg:'#f4eee7',ink:'#3c362e',sub:'#948a7d',acc:'#c8705d',acc2:'#e6c0b5',panel:'#faf6f0',line:'#e4dacd'},
    boundaryline:{bg:'#f2ecdf',ink:'#383026',sub:'#8f8574',acc:'#7c5136',acc2:'#b39268',panel:'#f9f4ea',line:'#ded4c2'},
    mehfil:{bg:'#1a1109',ink:'#ecdfc6',sub:'#a5947a',acc:'#e3b768',acc2:'#8a6f3f',panel:'#221709',line:'#33271a'},
    diwan:{bg:'#f3ecda',ink:'#33291d',sub:'#8a7f6a',acc:'#14655a',acc2:'#7fa79b',panel:'#ede4cd',line:'#d8cfb5'},
    takhti:{bg:'#52402e',ink:'#f0e7d6',sub:'#c4b295',acc:'#ecd9a4',acc2:'#8a6f4a',panel:'#483726',line:'#6a563e'},
    radif:{bg:'#dcdade',ink:'#35323c',sub:'#7b7683',acc:'#6f3760',acc2:'#b39ab0',panel:'#e7e5e9',line:'#c6c2cc'},
    script:{bg:'#f8f8f5',ink:'#2b2e33',sub:'#7d8188',acc:'#a85c70',acc2:'#c98da0',panel:'#ffffff',line:'#e0e1da'},
    greenroom:{bg:'#26201b',ink:'#d9cec0',sub:'#948a7d',acc:'#e6b578',acc2:'#f2d09a',panel:'#2e2721',line:'#3c332a'},
    roughcut:{bg:'#0b0b0d',ink:'#c9c7c1',sub:'#85837e',acc:'#e0973c',acc2:'#33333a',panel:'#131315',line:'#232327'},
    ringlight:{bg:'#e8e4dd',ink:'#3a3833',sub:'#7c7970',acc:'#a2793c',acc2:'#cbc2b2',panel:'#f0ede6',line:'#d6d0c5'},
    baarish:{bg:'#e8ddc5',ink:'#33261a',sub:'#8d7c65',acc:'#2f7d72',acc2:'#4a3a2c',panel:'#e0d4b9',line:'#cfc2a4'},
    loo:{bg:'#f4eddb',ink:'#493729',sub:'#a38e74',acc:'#a8502a',acc2:'#8a6a4d',panel:'#ede5cf',line:'#ddd2b9'},
    kohra:{bg:'#dde2e6',ink:'#333d46',sub:'#8b959e',acc:'#5a7186',acc2:'#9aa8b3',panel:'#e7ebee',line:'#c8cfd5'},
    purnima:{bg:'#0b0f1c',ink:'#eeeadb',sub:'#7d8296',acc:'#e9e4d2',acc2:'#565b6c',panel:'#121628',line:'#232a3d'},
    tapri:{bg:'#2b2017',ink:'#ddceb8',sub:'#9c8c74',acc:'#e5a54f',acc2:'#ecb679',panel:'#332619',line:'#423325'},
    localtrain:{bg:'#1d252e',ink:'#c7ccd3',sub:'#828f9b',acc:'#e2ae5e',acc2:'#f2c67a',panel:'#242e39',line:'#2a3440'},
    haveli:{bg:'#ede4d0',ink:'#3d372a',sub:'#8c8069',acc:'#39456e',acc2:'#8a8fae',panel:'#e5dabf',line:'#d6c9ac'},
    dhaba:{bg:'#101a14',ink:'#c8d1c6',sub:'#7e8b7e',acc:'#f0b95e',acc2:'#ffd892',panel:'#16211a',line:'#223028'},
    tanpuraDrone:{bg:'#120F0B',ink:'#E8DDC4',sub:'#8C8170',acc:'#B28A49',acc2:'#8A6A38',panel:'#1A1610',line:'#2C251B'},
    taalCycle:{bg:'#F6F0E4',ink:'#2A2119',sub:'#7A6D5C',acc:'#C64A32',acc2:'#9A3826',panel:'#EFE7D6',line:'#DDD2BC'},
    alaapBreath:{bg:'#FBF7EF',ink:'#332B25',sub:'#8A7C6C',acc:'#C09366',acc2:'#A4794F',panel:'#F3EDE1',line:'#E3D9C8'},
    raagRegister:{bg:'#ECE4D2',ink:'#201913',sub:'#6E6250',acc:'#7B3E2A',acc2:'#5E2F20',panel:'#E4DAC4',line:'#D4C8AE'},
    palmleafPothi:{bg:'#D8C28E',ink:'#302515',sub:'#6E5C3E',acc:'#8B2E1B',acc2:'#5E4A2E',panel:'#CFB77E',line:'#B9A26A'},
    cardCatalogue:{bg:'#F0E3C8',ink:'#2C241A',sub:'#6F6046',acc:'#6E8565',acc2:'#9A7B45',panel:'#E7D7B4',line:'#D6C49E'},
    blueCarbon:{bg:'#E7EEF7',ink:'#192B3A',sub:'#5A6B7D',acc:'#315D9A',acc2:'#7A93B5',panel:'#DDE6F2',line:'#C3D0E0'},
    proofMargin:{bg:'#FAF7EF',ink:'#24201B',sub:'#6A645A',acc:'#496D8C',acc2:'#955C43',panel:'#F1EBDD',line:'#E0D8C6'},
    ajrakhEdge:{bg:'#111B27',ink:'#EFE7D6',sub:'#8C97A3',acc:'#D58B5B',acc2:'#A8663C',panel:'#18242F',line:'#22303E'},
    mirrorShard:{bg:'#F8F2E7',ink:'#28201A',sub:'#7B7264',acc:'#7E9EB1',acc2:'#5E7E92',panel:'#FDF9F0',line:'#E6DCCB'},
    indigoVat:{bg:'#F3F0E8',ink:'#202533',sub:'#6E7480',acc:'#1F4E78',acc2:'#3B6A96',panel:'#FAF8F1',line:'#DFDACC'},
    chikankariTrace:{bg:'#FBFAF5',ink:'#2E2B26',sub:'#8A8578',acc:'#C8BFA8',acc2:'#A8A08C',panel:'#FFFFFF',line:'#ECE8DD'},
    lacBangle:{bg:'#241512',ink:'#F5E7D8',sub:'#B39C89',acc:'#B8322A',acc2:'#D65046',panel:'#2E1D17',line:'#3E2A22'},
    trunkKeyhole:{bg:'#211A15',ink:'#F1E1C6',sub:'#A9947A',acc:'#B0773A',acc2:'#CE9350',panel:'#2A211A',line:'#3A2E23'},
    gramophoneGroove:{bg:'#160F0B',ink:'#F2E5C9',sub:'#9C8B72',acc:'#C79646',acc2:'#E0B269',panel:'#20160F',line:'#332619'},
    telegramSlip:{bg:'#F3E9CF',ink:'#241E16',sub:'#6E6350',acc:'#4C6B7A',acc2:'#8A7A5C',panel:'#EBDFC0',line:'#D9CBA8'},
    banyanAerial:{bg:'#F1E8D4',ink:'#2B261D',sub:'#6E6350',acc:'#5B6F43',acc2:'#A98F5C',panel:'#EAE0C8',line:'#DCCFAF'},
    peepalShadow:{bg:'#FAF7EF',ink:'#242018',sub:'#7B7466',acc:'#6F8F5F',acc2:'#B0A489',panel:'#F2EDDE',line:'#E3DCC9'},
    sundialNoon:{bg:'#EFE0BC',ink:'#2A2117',sub:'#77664E',acc:'#B06D2F',acc2:'#8A7346',panel:'#E6D4A8',line:'#D9C48F'},
    brassCompass:{bg:'#151719',ink:'#EEE4CE',sub:'#8E8875',acc:'#C99A45',acc2:'#6F7B8A',panel:'#1C1F23',line:'#2A2E34'},
    malaCount:{bg:'#EFE8D9',ink:'#2D261E',sub:'#8A7E6C',acc:'#A65A3A',acc2:'#8C6A4F',panel:'#E7DDC7',line:'#DCD1B8'},
    templeBell:{bg:'#181310',ink:'#EDE1C7',sub:'#9A8F7B',acc:'#C49A4F',acc2:'#8F6F3A',panel:'#221B14',line:'#2E2620'},
    shankhSpiral:{bg:'#F6F0E2',ink:'#2C241A',sub:'#877B64',acc:'#BC8B45',acc2:'#8A6532',panel:'#EFE6D0',line:'#E1D6BA'},
    aangan:{bg:'#F5EDDC',ink:'#3A2F22',sub:'#8B7D66',acc:'#B84A3F',acc2:'#8F3A31',panel:'#EDE2C9',line:'#E1D4B8'},
    stepwellEcho:{bg:'#E8DDC7',ink:'#2E261C',sub:'#6E6250',acc:'#7D5A38',acc2:'#4A3B28',panel:'#EFE6D3',line:'#CBBD9F'},
    ghatStone:{bg:'#D8D0BF',ink:'#201B14',sub:'#6B6151',acc:'#8F5A37',acc2:'#4E4334',panel:'#E2DBCB',line:'#BDB29C'},
    dehleezLine:{bg:'#F2E7D0',ink:'#2B2118',sub:'#7A6C57',acc:'#9E3D2E',acc2:'#5A4A36',panel:'#F8F0DD',line:'#D8C9AB'},
    ittar:{bg:'#241A0F',ink:'#EFE3CC',sub:'#9D8D74',acc:'#C99552',acc2:'#8A6B45',panel:'#2E2214',line:'#3E3020'},
    vagusThread:{bg:'#F8F2EA',ink:'#2B2420',sub:'#8A7D6E',acc:'#6D9B8C',acc2:'#4E7A6D',panel:'#F1E7D6',line:'#E4D9C7'},
    breathingSquare:{bg:'#EAF0E7',ink:'#22302B',sub:'#6B7A70',acc:'#7D9271',acc2:'#5C7355',panel:'#E1E9DD',line:'#D5DFD0'},
    mirrorNeuron:{bg:'#101112',ink:'#EAE2D4',sub:'#8F949C',acc:'#8CA6C8',acc2:'#A9BEDA',panel:'#17181B',line:'#26282C'},
    matchboxNote:{bg:'#F5EBDD',ink:'#2D2118',sub:'#8A7965',acc:'#D35C38',acc2:'#A8442A',panel:'#EEE1CE',line:'#E3D3BE'},
    pinboardMap:{bg:'#EFE2C6',ink:'#241C16',sub:'#8A7B63',acc:'#5C7C8D',acc2:'#A6947A',panel:'#E7D8B8',line:'#DCCBA2'},
    foldingMap:{bg:'#F2EDDE',ink:'#2C2A22',sub:'#86816F',acc:'#6C8A70',acc2:'#A29B85',panel:'#EAE4D0',line:'#DBD3BC'},
    chauparCross:{bg:'#F1E4C7',ink:'#2A2017',sub:'#8C7C5F',acc:'#B64D37',acc2:'#A68C5F',panel:'#E9DAB6',line:'#DECDA6'},
    kundliGrid:{bg:'#F4EAD7',ink:'#282018',sub:'#8B7C62',acc:'#A24433',acc2:'#A9976F',panel:'#ECDFC6',line:'#E0D2B4'},
    xerox:{"bg":"#f6f2e8","ink":"#080808","sub":"#4f4f4f","acc":"#ef2347","acc2":"#20a66b","panel":"#ffffff","line":"#111111"},
    monsoon:{"bg":"#172225","ink":"#f6f0e6","sub":"#b4c0bc","acc":"#d69b3a","acc2":"#6fb0b8","panel":"#1f2d30","line":"#385056"},
    chilman:{bg:'#f4efe6',ink:'#453d33',sub:'#9a8b78',acc:'#a8763c',acc2:'#d9c9ac',panel:'#fdf8ee',line:'#e3d9c8'},
    rann:{bg:'#f2f1eb',ink:'#474b4c',sub:'#9ba099',acc:'#7f8f99',acc2:'#c9c6ba',panel:'#fdfdfa',line:'#dcdbd2'},
    mogra:{bg:'#faf8f2',ink:'#454a3c',sub:'#9aa08d',acc:'#6d8459',acc2:'#c9cfb8',panel:'#fffffc',line:'#e0e0d2'},
    malmal:{bg:'#fbfaf6',ink:'#4d4741',sub:'#a49b90',acc:'#b07f88',acc2:'#ddd6cc',panel:'#ffffff',line:'#e6e1d8'},
    patang:{bg:'#edf3f6',ink:'#3c4a54',sub:'#8d9ba5',acc:'#cf6f2b',acc2:'#8fa4b0',panel:'#ffffff',line:'#d5dee3'},
    hansa:{bg:'#f7f6f0',ink:'#424a49',sub:'#9aa19c',acc:'#4e7c77',acc2:'#c3bfa8',panel:'#fcfdfa',line:'#deded4'},
    pankh:{bg:'#f5f4ef',ink:'#48444e',sub:'#9d97a4',acc:'#877a94',acc2:'#c7c1ce',panel:'#ffffff',line:'#e0deda'},
    nibTest:{bg:'#f5efe1',ink:'#362b1e',sub:'#94886f',acc:'#8a5a2e',acc2:'#b9915c',panel:'#fbf6ea',line:'#ddd2bc'},
    waxLetter:{bg:'#f8f3e9',ink:'#3b332a',sub:'#9a8d7b',acc:'#8c2f2c',acc2:'#c05a4a',panel:'#fdfaf2',line:'#e2d8c6'},
    sokhta:{bg:'#f4e9e3',ink:'#40332d',sub:'#a5928a',acc:'#3a4f78',acc2:'#7488ab',panel:'#faf3ef',line:'#e0d1c9'},
    qalamtarash:{bg:'#eae9db',ink:'#35362a',sub:'#92937e',acc:'#6d7c46',acc2:'#9aa66f',panel:'#f4f3e8',line:'#d6d5c2'},
    dawaat:{bg:'#f2f1ec',ink:'#22252c',sub:'#8f949c',acc:'#2c3752',acc2:'#5b6a8d',panel:'#fafaf7',line:'#dcdbd3'},
    musavvada:{bg:'#eeeae1',ink:'#3a3a36',sub:'#96948b',acc:'#c0392b',acc2:'#6b6a64',panel:'#f6f3ea',line:'#d9d5c9'},
    pencilStub:{bg:'#e9eae9',ink:'#2c2f31',sub:'#8e9294',acc:'#a3502e',acc2:'#c57c54',panel:'#f3f4f3',line:'#d3d5d4'},
    teenBaje:{bg:'#14171f',ink:'#e9e3d2',sub:'#7c8090',acc:'#c9a24b',acc2:'#8d99b8',panel:'#1c202b',line:'#2c3140'},
    retdaan:{bg:'#eee3ca',ink:'#3c3120',sub:'#998a6c',acc:'#7c5522',acc2:'#ab8446',panel:'#f7efdc',line:'#dccfae'},
    splitNib:{bg:'#e4e9ed',ink:'#26313d',sub:'#8b98a4',acc:'#31527b',acc2:'#6d89aa',panel:'#f1f4f7',line:'#ccd5dc'},
    viraam:{bg:'#f4efe6',ink:'#2b2620',sub:'#8f8577',acc:'#a03e2d',acc2:'#c8b9a4',panel:'#faf6ee',line:'#ded4c4'},
    kumbhak:{bg:'#14161a',ink:'#e6eaef',sub:'#7e8791',acc:'#a8c4b4',acc2:'#5c666f',panel:'#1b1e24',line:'#2a2f36'},
    anugoonj:{bg:'#1b1512',ink:'#efe5d6',sub:'#96897b',acc:'#c97b4a',acc2:'#6e5b4a',panel:'#241c17',line:'#352a22'},
    azaan:{bg:'#252e42',ink:'#eee9e1',sub:'#8e93a6',acc:'#d9a48c',acc2:'#5a6484',panel:'#2c3550',line:'#3a4460'},
    ankahaa:{bg:'#e9e4dd',ink:'#332e28',sub:'#8d857a',acc:'#7d5a3c',acc2:'#b8ae9f',panel:'#f2eee8',line:'#d4ccc1'},
    barfbaari:{bg:'#eef2f5',ink:'#333d47',sub:'#8b98a3',acc:'#5b7f99',acc2:'#b7c5d0',panel:'#f8fafc',line:'#d5dde3'},
    antaraal:{bg:'#f1ece2',ink:'#2e2b25',sub:'#8f887a',acc:'#6b5d8c',acc2:'#b9b0a0',panel:'#f8f4ec',line:'#dcd4c5'},
    aramgah:{bg:'#f6f1e4',ink:'#3a3529',sub:'#97907f',acc:'#5e6f52',acc2:'#c3bba6',panel:'#fbf7ec',line:'#e0d8c5'},
    fermata:{bg:'#17151b',ink:'#ece8f0',sub:'#837e90',acc:'#c2a35c',acc2:'#575165',panel:'#1f1c25',line:'#2e2a38'},
    kuaan:{bg:'#1e2024',ink:'#dfe3e6',sub:'#90979e',acc:'#9fc0d4',acc2:'#59636c',panel:'#26292e',line:'#34383e'},
    aks:{bg:'#d9d7d2',ink:'#373e45',sub:'#84898e',acc:'#5e7f99',acc2:'#9db4c4',panel:'#e6e5e1',line:'#c6c4be'},
    taalab:{bg:'#e6ebe3',ink:'#33463c',sub:'#7d8a80',acc:'#a85f6e',acc2:'#5f7d6d',panel:'#f3f6f1',line:'#ccd5cc'},
    geelaPatthar:{bg:'#14171a',ink:'#dadfe3',sub:'#8d979e',acc:'#8fb6c4',acc2:'#5b6b74',panel:'#1d2226',line:'#2c3339'},
    matka:{bg:'#1b2226',ink:'#e7dfd4',sub:'#9d948a',acc:'#c98a5e',acc2:'#6f8b96',panel:'#232b30',line:'#374045'},
    shabnam:{bg:'#eef1e7',ink:'#3c4a35',sub:'#87907e',acc:'#ad8f4f',acc2:'#6c8161',panel:'#f8faf3',line:'#d6dcc9'},
    deepdhara:{bg:'#10151f',ink:'#e8e2d4',sub:'#8e94a1',acc:'#e8a24b',acc2:'#46607a',panel:'#171e2a',line:'#252e3d'},
    jalsyahi:{bg:'#f4f2ec',ink:'#2a2f3a',sub:'#8a8d94',acc:'#3e4c7a',acc2:'#8b93b4',panel:'#fbfaf6',line:'#dcdad2'},
    jheel:{bg:'#e4edea',ink:'#2f4440',sub:'#7c8f8b',acc:'#3f6b62',acc2:'#84a49c',panel:'#f1f7f5',line:'#c9d8d3'},
    metroLine:{bg:'#f2f0ec',ink:'#23282e',sub:'#8a8f95',acc:'#2a5caa',acc2:'#d9a13b',panel:'#fbfaf7',line:'#dcd9d1'},
    railingShadow:{bg:'#f7edda',ink:'#382c20',sub:'#9a8a76',acc:'#b4622d',acc2:'#e0a75f',panel:'#fdf6ea',line:'#e4d4ba'},
    terraceHour:{bg:'#1b2430',ink:'#eee9de',sub:'#96a0af',acc:'#e8a13d',acc2:'#8fa3c0',panel:'#232d3b',line:'#394454'},
    wetSignal:{bg:'#161216',ink:'#f1ecea',sub:'#9d9298',acc:'#e04a3f',acc2:'#f2b13f',panel:'#211b20',line:'#3a3138'},
    milkDawn:{bg:'#eaeff3',ink:'#2c3945',sub:'#8b97a1',acc:'#3f6f9e',acc2:'#e2a97e',panel:'#fbfdff',line:'#d3dce3'},
    maidaanCrease:{bg:'#e7dfcd',ink:'#3a3225',sub:'#988b74',acc:'#a6452f',acc2:'#7d8a5c',panel:'#faf6ec',line:'#d6cbb2'},
    meterDown:{bg:'#191817',ink:'#f4efe3',sub:'#9d968a',acc:'#f2b52a',acc2:'#c8471f',panel:'#232220',line:'#3a3833'},
    pgWindow:{bg:'#242a33',ink:'#e9ebee',sub:'#8f97a2',acc:'#d9b27c',acc2:'#5f81a8',panel:'#2d343f',line:'#3e4652'},
    liftPanel:{bg:'#1e2126',ink:'#ebedf0',sub:'#8d939c',acc:'#7fb4d8',acc2:'#e0642e',panel:'#262a30',line:'#343a42'},
    kalava:{bg:'#f6f1e6',ink:'#383026',sub:'#8f8577',acc:'#b3382c',acc2:'#d9a027',panel:'#fdfaf3',line:'#e6ddcb'},
    mehndi:{bg:'#f5e8da',ink:'#42291b',sub:'#9c8574',acc:'#8b4a26',acc2:'#b3703f',panel:'#faf1e7',line:'#e6d3c0'},
    anjuri:{bg:'#191007',ink:'#f2e3c8',sub:'#a08d6e',acc:'#e8963f',acc2:'#b3612a',panel:'#241a0e',line:'#3a2c19'},
    pranam:{bg:'#faf8f3',ink:'#33312c',sub:'#8e8b82',acc:'#c2401f',acc2:'#6b675c',panel:'#ffffff',line:'#e7e3d8'},
    achaar:{bg:'#f4da92',ink:'#42300f',sub:'#8a6d33',acc:'#a52a1a',acc2:'#7d5710',panel:'#f9e7b4',line:'#dfc178'},
    tulsi:{bg:'#223a38',ink:'#dce8de',sub:'#8aa398',acc:'#a8c47a',acc2:'#e0a34c',panel:'#2b4644',line:'#37524e'},
    bhaap:{bg:'#1d222f',ink:'#eef0f4',sub:'#9aa2b5',acc:'#d9a13b',acc2:'#7c88a8',panel:'#262c3c',line:'#343b4e'},
    gaanth:{bg:'#f2e3e0',ink:'#453036',sub:'#a08388',acc:'#a04a52',acc2:'#c98a92',panel:'#f9efed',line:'#e3cdc9'},
    niwala:{bg:'#243b28',ink:'#e9e9d8',sub:'#94a98f',acc:'#c9973f',acc2:'#7ba36b',panel:'#294733',line:'#33543e'},
  };
  function palStyle(look){ const p = PAL[look] || PAL.midnight; return `--bg:${p.bg};--ink:${p.ink};--sub:${p.sub};--acc:${p.acc};--acc2:${p.acc2};--panel:${p.panel};--line:${p.line};`; }
  // hand-drawn (rough) SVG primitives — slightly irregular = "sketched by hand", not vector-perfect
  function roughEllipse(cx, cy, rx, ry){
    return `M ${cx-rx} ${cy+3} C ${cx-rx+2} ${cy-ry*1.05}, ${cx-rx*0.45} ${cy-ry}, ${cx+4} ${cy-ry+2} C ${cx+rx*0.6} ${cy-ry-2}, ${cx+rx} ${cy-ry*0.45}, ${cx+rx-2} ${cy} C ${cx+rx+2} ${cy+ry*1.05}, ${cx+rx*0.4} ${cy+ry}, ${cx-2} ${cy+ry-2} C ${cx-rx*0.6} ${cy+ry+2}, ${cx-rx-2} ${cy+ry*0.5}, ${cx-rx} ${cy+3} Z`;
  }
  const roughUnderline = `<svg viewBox="0 0 300 20" preserveAspectRatio="none" style="width:100%;height:18px;display:block;margin-top:6px;"><path d="M4 12 C 60 6, 120 16, 180 9 S 280 8, 296 13" fill="none" stroke="var(--acc)" stroke-width="4" stroke-linecap="round"/></svg>`;
  // simple hand-drawn icon set (viewBox 0 0 100 100, strokes use currentColor => set color:var(--acc))
  const ICONS = {
    eye:   '<path d="M6 50 C 30 20, 70 20, 94 50 C 70 80, 30 80, 6 50 Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="13" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="50" cy="50" r="4" fill="currentColor"/>',
    chain: '<rect x="20" y="30" width="30" height="20" rx="10" fill="none" stroke="currentColor" stroke-width="4"/><rect x="48" y="48" width="30" height="20" rx="10" fill="none" stroke="currentColor" stroke-width="4"/>',
    heart: '<path d="M50 82 C 10 52, 16 20, 40 26 C 48 28, 50 36, 50 36 C 50 36, 52 28, 60 26 C 84 20, 90 52, 50 82 Z" fill="none" stroke="currentColor" stroke-width="4"/>',
    mind:  '<path d="M35 78 C 15 74, 12 40, 30 30 C 34 14, 66 12, 70 30 C 88 36, 86 66, 68 72 C 66 82, 40 84, 35 78 Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M50 30 V70 M50 44 C 40 44, 40 54, 50 54 M50 44 C 62 44, 62 56, 50 56" fill="none" stroke="currentColor" stroke-width="3"/>',
    path:  '<path d="M30 88 C 30 66, 70 62, 70 44 C 70 28, 34 28, 34 14" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="2 10" stroke-linecap="round"/><circle cx="34" cy="14" r="6" fill="currentColor"/>',
    seed:  '<path d="M50 88 V52 M50 60 C 30 56, 26 34, 46 34 M50 52 C 74 50, 78 26, 54 28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    scale: '<path d="M50 16 V30 M24 34 H76 M50 30 V70 M40 78 H60" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 34 L14 54 H34 Z M76 34 L66 54 H86 Z" fill="none" stroke="currentColor" stroke-width="3"/>',
    door:  '<rect x="28" y="18" width="44" height="66" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="62" cy="52" r="4" fill="currentColor"/>',
  };
  // curated SHLOK library — themed Gita verses for scripture cards (matched by keyword)
  const SHLOKS = [
    { k:['attach','pakad','chipak','moh','desire','chah'], verse:'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते।', tr:'dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate', meaning:'Jis cheez pe baar-baar dhyaan jaata hai — usi se lagaav (attachment) paida hota hai.', ref:'Bhagavad Gita 2.62' },
    { k:['anger','gussa','krodh','react'], verse:'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः।', tr:'krodhād bhavati sammohaḥ sammohāt smṛti-vibhramaḥ', meaning:'Krodh se bhram, bhram se smriti ka naash — aur wahin se patan shuru hota hai.', ref:'Bhagavad Gita 2.63' },
    { k:['self','witness','sakshi','main kaun','aham','atma','dekhne'], verse:'न जायते म्रियते वा कदाचिन्नायं भूत्वा भविता वा न भूयः।', tr:'na jāyate mriyate vā kadācin', meaning:'Yeh (tum) na kabhi janmta hai, na marta hai — jo dekhne wala hai, wo badalta nahi.', ref:'Bhagavad Gita 2.20' },
    { k:['action','karm','effort','result','outcome'], verse:'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', tr:'karmaṇy evādhikāras te mā phaleṣu kadācana', meaning:'Karm pe tera haq hai — phal pe kabhi nahi. Isliye phal ki chinta chhod, karm kar.', ref:'Bhagavad Gita 2.47' },
    { k:['change','impermanent','badal','anitya','sukh dukh','temporary'], verse:'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।', tr:'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ', meaning:'Sukh-dukh, thand-garmi — sab aate-jaate hain. Inhe sehna seekh, ye sthir nahi.', ref:'Bhagavad Gita 2.14' },
    { k:['mind','mann','control','discipline','habit'], verse:'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।', tr:'uddhared ātmanātmānaṁ nātmānam avasādayet', meaning:'Khud ko khud hi upar utho — khud ko girao mat. Tum apne dost ho, dushman bhi.', ref:'Bhagavad Gita 6.5' },
    { k:['equanimity','balance','santulan','samta','stable'], verse:'समत्वं योग उच्यते।', tr:'samatvaṁ yoga ucyate', meaning:'Sukh mein, dukh mein — dono mein sam (balanced) rehna: yahi yoga hai.', ref:'Bhagavad Gita 2.48' },
    { k:['fear','dar','refuge','surrender','let go','chhod'], verse:'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।', tr:'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja', meaning:'Sab pakad chhod ke, bas ek jagah samarpan kar de — dar khud chhoot jaayega.', ref:'Bhagavad Gita 18.66' },
    { k:['duty','swadharma','apna','path','purpose'], verse:'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।', tr:'śreyān sva-dharmo viguṇaḥ para-dharmāt', meaning:'Adhoora apna raasta bhi, doosron ke perfect raaste se behtar hai.', ref:'Bhagavad Gita 3.35' },
    { k:['nature','prakriti','automatic','response','conditioning'], verse:'न हि कश्चित्क्षणमपि जातु तिष्ठत्यकर्मकृत्।', tr:'na hi kaścit kṣaṇam api jātu tiṣṭhaty akarma-kṛt', meaning:'Koi ek pal bhi bina kuch kiye nahi reh sakta — prakriti ke gun karm mein dhakel dete hain.', ref:'Bhagavad Gita 3.5' },
  ];
  function shlokFor(text){
    const t = (text || '').toLowerCase();
    let best = null, bestN = 0;
    for (const s of SHLOKS){ const n = s.k.filter(k => t.includes(k)).length; if (n > bestN){ bestN = n; best = s; } }
    return bestN > 0 ? best : null;
  }

  // renderBlock — each returns HTML that styles itself from the --pal CSS vars set on .slide
  function renderBlock(kind, d){
    d = d || {};
    if (kind === 'quadrant') return `<div class="bk-quad">${(d.items||[]).map(it=>`<div class="bk-cell"><div class="bk-tag">${it.tag||''}</div><div class="bk-h">${it.title||''}</div><div class="bk-t">${it.text||''}</div></div>`).join('')}</div>`;
    if (kind === 'columns') return `<div class="bk-cols">${(d.items||[]).map(it=>`<div class="bk-col"><div class="bk-tag">${it.tag||''}</div><div class="bk-t">${it.text||''}</div></div>`).join('')}</div>`;
    if (kind === 'compare') {
      const aText = (d.a && d.a.text) || '';
      const aLines = String(aText).split(/\n/).filter(Boolean).length || 1;
      // A3: strikethrough only for short myth-vs-truth; longer → dim-italic (not false-strike).
      const aDim = aLines > 4 || String(aText).length > 140;
      const aCls = aDim ? 'bk-cmp-a bk-cmp-a--dim' : 'bk-cmp-a';
      return `<div class="bk-cmp"><div class="${aCls}"><div class="bk-tag bk-x">${d.a&&d.a.tag||'Myth'}</div><div class="bk-t">${aText}</div></div><div class="bk-cmp-mid">&#8594;</div><div class="bk-cmp-b"><div class="bk-tag">${d.b&&d.b.tag||'Truth'}</div><div class="bk-t">${d.b&&d.b.text||''}</div></div></div>`;
    }
    if (kind === 'gauge') return `<div class="bk-gauge">${(d.zones||[]).map(z=>`<div class="bk-zrow"><div class="bk-zbar" style="width:${z.w||70}%;background:${z.color}"></div><div class="bk-zlab"><b style="color:${z.color}">${z.label}</b> ${z.text||''}</div></div>`).join('')}</div>`;
    if (kind === 'scripture') return `<div class="bk-scr"><div class="bk-scr-mark">॥</div><div class="bk-scr-v">${d.verse||''}</div>${d.tr?`<div class="bk-scr-tr">${d.tr}</div>`:''}${d.meaning?`<div class="bk-scr-m">${d.meaning}</div>`:''}<div class="bk-scr-ref">&#8212; ${d.ref||''}</div></div>`;
    if (kind === 'stat') return `<div class="bk-stat"><div class="bk-stat-n">${d.n||''}</div><div class="bk-stat-l">${d.label||''}</div></div>`;
    if (kind === 'steps') return `<div class="bk-steps">${(d.items||[]).map((it,i)=>`<div class="bk-step"><div class="bk-snum">${i+1}</div><div class="bk-t">${typeof it==='string'?it:(it.text||'')}</div></div>`).join('')}</div>`;
    if (kind === 'checklist') return `<div class="bk-check">${(d.items||[]).map(it=>`<div class="bk-ci"><span class="bk-cx">&#10003;</span><div class="bk-t">${typeof it==='string'?it:(it.text||'')}</div></div>`).join('')}</div>`;
    if (kind === 'annotate') return `<div class="bk-annot"><div class="bk-annot-t">${d.text||''}</div>${roughUnderline}${d.note?`<div class="bk-annot-n">${d.note}</div>`:''}</div>`;
    if (kind === 'venn') return `<div class="bk-venn"><svg viewBox="0 0 640 420" style="width:100%;height:auto;"><path d="${roughEllipse(240,200,170,150)}" fill="var(--acc)" fill-opacity="0.14" stroke="var(--acc)" stroke-width="3"/><path d="${roughEllipse(400,200,170,150)}" fill="var(--acc2)" fill-opacity="0.14" stroke="var(--acc2)" stroke-width="3"/></svg><div class="bk-venn-labs"><div class="bk-venn-l"><b>${d.a&&d.a.label||''}</b><br>${d.a&&d.a.text||''}</div><div class="bk-venn-m"><b>${d.mid&&d.mid.label||''}</b><br>${d.mid&&d.mid.text||''}</div><div class="bk-venn-r"><b>${d.b&&d.b.label||''}</b><br>${d.b&&d.b.text||''}</div></div></div>`;
    if (kind === 'timeline') return `<div class="bk-tl"><svg viewBox="0 0 1000 40" preserveAspectRatio="none" style="width:100%;height:34px;"><path d="M10 22 C 260 12, 520 30, 990 20" fill="none" stroke="var(--line)" stroke-width="4"/></svg><div class="bk-tl-row">${(d.items||[]).map(it=>`<div class="bk-tl-step"><div class="bk-tl-dot"></div><div class="bk-tl-lab"><b>${it.tag||''}</b><br>${it.text||''}</div></div>`).join('')}</div></div>`;
    if (kind === 'pictorial') return `<div class="bk-pict">${(d.items||[]).map(it=>`<div class="bk-pi"><svg class="bk-pi-ic" viewBox="0 0 100 100">${ICONS[it.icon]||ICONS.eye}</svg><div class="bk-pi-h">${it.title||''}</div><div class="bk-t">${it.text||''}</div></div>`).join('')}</div>`;
    if (kind === 'flow') return `<div class="bk-flow">${(d.items||[]).map((it,i)=>`<div class="bk-fnode">${typeof it==='string'?it:(it.text||'')}</div>${i<(d.items.length-1)?'<div class="bk-farrow">&#8594;</div>':''}`).join('')}</div>`;
    // his REAL photo, baked in on merit (audit #4). Palette-aware duotone so it belongs to any look
    // instead of reading as a pasted-in snapshot. src = a face-harvest frame or a Photos-app export.
    if (kind === 'photo') return `<div class="bk-photo"><div class="bk-photo-frame"><div class="im" style="background-image:url('${d.src||''}')"></div><div class="tone"></div><div class="shade"></div>${d.tag?`<div class="bk-photo-tag">${d.tag}</div>`:''}</div>${d.caption?`<div class="bk-photo-cap">${d.caption}</div>`:''}</div>`;
    // ONE REGISTRY: delegate the 8 Codex infographic blocks (.ib-*) — donut_three_forces, process_loop,
    // sketch_model, spectrum_scale, iceberg_layers, funnel_filter, mind_map_radial, decision_tree.
    // (blocks.js loads before this in the browser; lazy-required in node so render.cjs gets them too.)
    const IB = blocksMod();
    if (IB && IB.render) { const h = IB.render(kind, d); if (h) return h; }
    return '';
  }
  // resolve the CarouselBlocks module in both worlds (browser <script> already set it; node lazy-requires)
  function blocksMod(){ if (root.CarouselBlocks) return root.CarouselBlocks; if (typeof require !== 'undefined') { try { return (root.CarouselBlocks = require('./blocks.js')); } catch (e) {} } return null; }

  // ================= BAKE: real card -> 10+ composed slides (deterministic, no LLM) =================
  const NUMBERED = new Set(['grid','blueprint','loud','brut','bauhaus','press','kraft','memphis','riso','neon','sunrise','chalk']);
  const PILLAR_KICKER = {
    'Course Bridge / Proof':'Ek Baat', 'Story / Recognition':'Recognition',
    'FAQ / Sales / DM':'Samjho', 'Teach / Practice / Solution':'Decode', 'Truth / Observation':'Sach',
  };
  function esc(t){ return String(t==null?'':t).replace(/\s+/g,' ').trim(); }
  function nl2br(t){ return esc(t).replace(/\s*\/\s*/g,'<br>').replace(/\n+/g,'<br>'); }
  /* v357 typeset: wrap the text segments of an html string (around/inside <b>) in
   * phrase-unit .pu spans so the browser can only break between breath units.
   * Never runs senseWrapHTML across tag boundaries (D3 risk note). */
  function puWrap(html){
    var DT = (typeof window !== 'undefined') && window.DoalfaazTypeset;
    if (!DT) return html;
    return String(html).split(/(<\/?b>|<br\s*\/?>)/i).map(function(seg){
      if (/^<\/?b>$/i.test(seg) || /^<br\s*\/?>$/i.test(seg)) return seg;
      if (!seg || !seg.trim()) return seg;
      var lead = /^\s/.test(seg) ? ' ' : '', trail = /\s$/.test(seg) ? ' ' : '';
      /* identity escFn: this pipeline has always inserted card text raw — keep byte-identical */
      return lead + DT.senseWrapHTML(seg, function(s){ return s; }) + trail;
    }).join('');
  }
  // ---- voiceGuard (VOICE_AUDIT §4 option B, 2026-07-10): render-time tu->tum register guard ----
  // Deterministic rule map derived from the confirmed (auto-fixable) corrections in voice_corrections.json.
  // Applied ONLY inside emphCore() below (non-poem body/hook/cta render path) — NEVER inside emphPoem()
  // or any poem/_poems/Devanagari-poem render path (his poetic voice keeps tu, per the audit's own rule).
  const VOICE_TU_MAP = [
    ['tujhse','tumse'], ['tujhko','tumko'], ['tujhe','tumhe'],
    ['tera','tumhara'], ['tere','tumhare'], ['teri','tumhari'],
    ['tujh','tum'], ['tu','tum'],
  ];
  const VOICE_IMPERATIVE_MAP = [
    ['samajh','samjho'], ['dekh','dekho'], ['likh','likho'], ['rakh','rakho'],
    ['ruk','ruko'], ['soch','socho'], ['bol','bolo'], ['kar','karo'],
    ['de','do'], ['le','lo'], ['ja','jao'], ['aa','aao'], ['sun','suno'],
  ];
  // morphology exclusions (VOICE_AUDIT §4): nouns ("teri soch"), subjunctives ("na de"/"chahe...de"/"koi keh de"),
  // conjunctive participles ("soch kar"), contractions ("kar'ta", "sun-na") — word-boundary matching only, never mid-word.
  const VOICE_POSSESSIVE_BEFORE = /(?:teri|tera|tere|tumhari|tumhara|tumhare|meri|mera|mere|uski|uska|uske|iski|iska|apni|apna|apne|unki|unka|unke|humari|hamari|hamara|hamare)$/i;
  const VOICE_ADJACENT_SKIP = /(?:^|\s)(na)\s*$/i;
  const VOICE_CLAUSE_SKIP = /\b(koi|chahe)\b/i;
  const VOICE_CLAUSE_BOUNDARY = /[.!?—–\n]/;
  const VOICE_PARTICIPLE_STEMS = /(?:samajh|dekh|likh|rakh|ruk|soch|bol|kar|de|le|ja|aa|sun|keh|maan|jaan|pehchaan)$/i;
  function voiceCase(orig, rep){
    if (orig === orig.toUpperCase() && orig.length > 1) return rep.toUpperCase();
    if (orig[0] === orig[0].toUpperCase()) return rep[0].toUpperCase() + rep.slice(1);
    return rep;
  }
  function voiceGuard(text){
    if (text == null) return text;
    let out = String(text);
    for (const pair of VOICE_TU_MAP) {
      const tok = pair[0], rep = pair[1];
      const re = new RegExp("(?<![A-Za-z'’])(" + tok + ")(?![A-Za-z'’])", 'gi');
      out = out.replace(re, function(m){ return voiceCase(m, rep); });
    }
    for (const pair of VOICE_IMPERATIVE_MAP) {
      const tok = pair[0], rep = pair[1];
      const re = new RegExp("([\\s\"'‘’“”(]|^)(" + tok + ")(?=['’”]?\\s*(?:[-–—,.!?)\"'‘’“”]|<|$))(?![A-Za-z'’])(?!-[A-Za-z])", 'gi');
      out = out.replace(re, function(m, pre, word, offset, str){
        const beforeRaw = str.slice(0, offset + pre.length);
        const beforeTrim = beforeRaw.trim();
        if (VOICE_POSSESSIVE_BEFORE.test(beforeTrim)) return m;
        if (VOICE_ADJACENT_SKIP.test(beforeRaw)) return m;
        var i = beforeRaw.length - 1; while (i >= 0 && !VOICE_CLAUSE_BOUNDARY.test(beforeRaw[i])) i--;
        if (VOICE_CLAUSE_SKIP.test(beforeRaw.slice(i + 1))) return m;
        if (tok === 'kar') {
          const stem = beforeTrim.replace(/[-–—,.!?"'’]+$/, '').trim();
          if (VOICE_PARTICIPLE_STEMS.test(stem)) return m;
        }
        return pre + voiceCase(word, rep);
      });
    }
    return out;
  }
  // bold the "punch": the clause after the last em-dash / colon, else the final sentence
  function emph(t){ return puWrap(emphCore(t)); }
  function emphCore(t){
    t = esc(t);
    t = voiceGuard(t);
    // 1) short punchy tail after an em-dash (great for hooks/one-liners)
    for (const sep of [' — ', ' – ']) {
      const i = t.lastIndexOf(sep);
      if (i > 8) { const tail = t.slice(i + sep.length); if (tail.length <= 72 && !/[.?!।].*[.?!।]/.test(tail)) return t.slice(0, i + sep.length) + '<b>' + tail + '</b>'; }
    }
    // 2) bold the FINAL sentence (the punch) when there are several
    const sents = t.match(/[^.?!।]+[.?!।]+|\S[^.?!।]*$/g);
    if (sents && sents.length > 1) {
      const last = sents[sents.length - 1].trim();
      if (last.length >= 6 && last.length <= 118) return t.slice(0, t.length - last.length) + '<b>' + last + '</b>';
    }
    // 3) label with a short value → bold the value
    const ci = t.indexOf(': ');
    if (ci > 0) { const val = t.slice(ci + 2); if (val.length >= 4 && val.length <= 72) return t.slice(0, ci + 2) + '<b>' + val + '</b>'; }
    return t;
  }
  // bold the last line of a poem (the detonation)
  function emphPoem(t){
    const DT = (typeof window !== 'undefined') && window.DoalfaazTypeset;
    const wrapL = DT ? (l => DT.senseWrapHTML(l, s => s)) : (l => l);   /* v357 typeset */
    const lines = esc(t).split(/\s*\/\s*|\n+/).filter(Boolean).map(wrapL);
    if (lines.length > 1) { lines[lines.length - 1] = '<b>' + lines[lines.length - 1] + '</b>'; }
    return lines.join('<br>');
  }
  function sentenceGroups(text, target){
    const sents = esc(text).match(/[^.?!।]+[.?!।]+|\S[^.?!।]*$/g) || [text];
    const groups = []; let cur = '';
    for (const s of sents){
      const st = s.trim();
      if (cur && (cur.length + st.length) > target){ groups.push(cur); cur = st; }
      else cur += (cur ? ' ' : '') + st;
    }
    if (cur) groups.push(cur);
    return groups;
  }
  function cleanBlock(b){ return esc(b).replace(/^['"“”‘’—–\-:.\s]+/, '').trim(); }
  function splitBody(body, target){
    body = esc(body); target = target || 250;
    let blocks;
    if (body.includes('***')) {
      blocks = body.split(/\s*\*\*\*\s*/).map(s => s.trim()).filter(Boolean);
    } else {
      // structured sections: "Fight FIGHT", standalone SHOUT headers (>=4 caps) → break before them
      const HDR = /(?:^|[\s.!?'"”)])((?:[A-Z][a-z]+\s+)?[A-Z]{4,})(?=[\s'"“:—-])/g;
      let hit = false; const marked = body.replace(HDR, (m, h, off) => { if (off === 0) return m; hit = true; return '' + h; });
      const parts = hit ? marked.split('').map(s => s.trim()).filter(s => s.length > 3) : null;
      blocks = (parts && parts.length >= 3) ? parts : sentenceGroups(body, target);
    }
    const out = [];
    for (let b of blocks){ if (b.length > target * 1.9) sentenceGroups(b, target).forEach(x => out.push(cleanBlock(x))); else out.push(cleanBlock(b)); }
    return out.filter(b => b.length > 2);
  }
  // card = a studio_data card {title,hooks:[{t,s}],poems:[{t,role,s}],body,cta,pillar,...}
  // opts = { hookIndex, minSlides(=10), profile(=true), target }
  function bake(card, lookId, opts){
    opts = opts || {};
    const numbered = NUMBERED.has(lookId);
    const slides = [];
    const hook = (card.hooks && card.hooks[opts.hookIndex || 0]) || (card.hooks && card.hooks[0]) || { t: card.title };
    slides.push({ role: 'hook', kickline: opts.kicker || PILLAR_KICKER[card.pillar] || 'Ek Baat', html: emph(hook.t) });
    const poems = (card.poems || []).slice();
    const opener = poems.find(p => p.role === 'opener');
    const closer = poems.find(p => p.role === 'closer');
    const mids = poems.filter(p => p !== opener && p !== closer);
    if (opener) slides.push({ role: 'poem', html: emphPoem(opener.t) });
    // grow target down if we need more slides to clear minSlides
    let blocks = splitBody(card.body, opts.target || 250);
    const want = (opts.minSlides || 10) - 4; // reserve hook+opener+closer+cta(+profile)
    if (blocks.length < want) blocks = splitBody(card.body, 165);
    const midAt = Math.floor(blocks.length / 2);
    blocks.forEach((b, i) => {
      slides.push({ role: 'body', num: numbered ? String(i + 1).padStart(2, '0') : undefined, html: emph(b) });
      if (mids[0] && i === midAt) slides.push({ role: 'poem', html: emphPoem(mids[0].t) });
    });
    if (closer) slides.push({ role: 'poem', html: emphPoem(closer.t) });
    slides.push({ role: 'body', bubble: true,
      html: card.cta ? emph(card.cta) : ( (window.__dzCtaOverlay && window.__dzCtaOverlay[card.id]) ? emph(window.__dzCtaOverlay[card.id]) : 'Agar yeh laga —<br><b>save kar lo. Tumhe yaad rahega.</b>' ),
      kicker: 'save · @doalfaaz' });
    if (opts.profile !== false) slides.push({ role: 'profile',
      html: '<b>Tushar Mehrotra</b> · @doalfaaz<br>NIT · ex-Deloitte · 650+ lives transformed<br><b>Link in bio.</b>' });
    return { look: lookId, title: card.title, cardId: card.id, slides };
  }

  // ================= DESIGN TAXONOMY: groups + auto-suggest best-fit per card =================
  // Visual-technique clusters (how a look actually LOOKS, not a mood label) — each look has exactly
  // one primary home in LOOK_GROUP; a few that genuinely straddle two aesthetics also get a
  // LOOK_GROUP_SECONDARY entry so the Studio can cross-list them at the tail of a second shelf.
  const LOOK_GROUP = {
    midnight:'Dark & Moody', noir:'Dark & Moody', oracle:'Dark & Moody', departure:'Dark & Moody',
    noirstage:'Dark & Moody', monsoon:'Dark & Moody', cinema:'Dark & Moody',
    smoke:'Dark & Moody', silverGelatin:'Dark & Moody', twilightGhazal:'Dark & Moody',
    haldi:'Gradient & Vibrant', slate:'Handwritten & Artifact',
    qalamWash:'Literary & Minimal', khaadiLinen:'Literary & Minimal', oneline:'Literary & Minimal',
    jharokha:'Indian & Classical', terracottaFresco:'Indian & Classical', wasliMiniature:'Indian & Classical', limewashCourtyard:'Indian & Classical',
    copperPatina:'Handwritten & Artifact', doubt:'Editorial & Newsprint', invitation:'Bold & Punchy',
    witness:'Night & Flame', ember:'Night & Flame', velvet:'Night & Flame', mehfil:'Night & Flame', greenroom:'Night & Flame', dhaba:'Night & Flame',
    upanishad:'Dark & Moody', manthan:'Dark & Moody', vanvaas:'Dark & Moody', kohl:'Dark & Moody', raatsyahi:'Dark & Moody', roughcut:'Dark & Moody', purnima:'Dark & Moody', localtrain:'Dark & Moody',
    baarish:'Season & Sky', loo:'Season & Sky', kohra:'Season & Sky', cottonsky:'Season & Sky', chandni:'Season & Sky',
    ahamseal:'Indian & Classical', kurukshetra:'Indian & Classical', diwan:'Indian & Classical', takhti:'Indian & Classical', tapri:'Indian & Classical',
    netineti:'Literary & Minimal', bhasma:'Literary & Minimal', morningpage:'Literary & Minimal', postcard:'Literary & Minimal', attachthread:'Literary & Minimal', boundaryline:'Literary & Minimal', radif:'Literary & Minimal',
    innerchild:'Handwritten & Artifact', haveli:'Handwritten & Artifact',
    triggerscan:'Technical & Diagram', ringlight:'Editorial & Newsprint', script:'Terminal & Monospace',
    tanpuraDrone:'Raag & Craft', taalCycle:'Raag & Craft', alaapBreath:'Raag & Craft', raagRegister:'Raag & Craft',
    ajrakhEdge:'Raag & Craft', mirrorShard:'Raag & Craft', malaCount:'Raag & Craft', shankhSpiral:'Raag & Craft',
    aangan:'Raag & Craft', chauparCross:'Raag & Craft', kundliGrid:'Raag & Craft',
    palmleafPothi:'Indian & Classical', stepwellEcho:'Indian & Classical', ghatStone:'Indian & Classical',
    cardCatalogue:'Handwritten & Artifact', telegramSlip:'Handwritten & Artifact',
    blueCarbon:'Literary & Minimal', indigoVat:'Literary & Minimal', chikankariTrace:'Literary & Minimal',
    dehleezLine:'Literary & Minimal', matchboxNote:'Literary & Minimal', foldingMap:'Literary & Minimal',
    proofMargin:'Editorial & Newsprint',
    lacBangle:'Dark & Moody', trunkKeyhole:'Dark & Moody', gramophoneGroove:'Dark & Moody',
    brassCompass:'Dark & Moody', ittar:'Dark & Moody', mirrorNeuron:'Dark & Moody',
    templeBell:'Night & Flame',
    banyanAerial:'Season & Sky', peepalShadow:'Season & Sky', sundialNoon:'Season & Sky',
    vagusThread:'Technical & Diagram', breathingSquare:'Technical & Diagram', pinboardMap:'Technical & Diagram',
    dusk:'Gradient & Vibrant', aura:'Gradient & Vibrant', sunrise:'Gradient & Vibrant', vapor:'Gradient & Vibrant', 
    loud:'Bold & Punchy', brut:'Bold & Punchy', neon:'Bold & Punchy', transit:'Bold & Punchy', street:'Bold & Punchy', cover:'Bold & Punchy',
    grid:'Editorial & Newsprint', press:'Editorial & Newsprint', journal:'Editorial & Newsprint', footnote:'Editorial & Newsprint',
    broadsheet:'Editorial & Newsprint', museum:'Editorial & Newsprint', ledger:'Editorial & Newsprint',
    blueprint:'Technical & Diagram', data:'Technical & Diagram', fieldmap:'Technical & Diagram', therapylab:'Technical & Diagram',
    paper:'Literary & Minimal', zen:'Literary & Minimal', garden:'Literary & Minimal', manuscript:'Literary & Minimal',
    palimpsest:'Literary & Minimal', marble:'Literary & Minimal', chalk:'Literary & Minimal', letterpress:'Literary & Minimal',
    memphis:'Geometric & Pattern', bauhaus:'Geometric & Pattern', riso:'Geometric & Pattern', sacredgeo:'Geometric & Pattern',
    woodcut:'Geometric & Pattern', deco:'Geometric & Pattern',
    note:'Handwritten & Artifact', tape:'Handwritten & Artifact', kraft:'Handwritten & Artifact', casefile:'Handwritten & Artifact', xerox:'Handwritten & Artifact',
    terminal:'Terminal & Monospace', typewriter:'Terminal & Monospace',
    chilman:'Season & Sky',
    rann:'Season & Sky',
    mogra:'Season & Sky',
    malmal:'Literary & Minimal',
    patang:'Season & Sky',
    hansa:'Literary & Minimal',
    pankh:'Literary & Minimal',
    nibTest:'Handwritten & Artifact',
    waxLetter:'Handwritten & Artifact',
    sokhta:'Handwritten & Artifact',
    qalamtarash:'Literary & Minimal',
    dawaat:'Literary & Minimal',
    musavvada:'Editorial & Newsprint',
    pencilStub:'Literary & Minimal',
    teenBaje:'Handwritten & Artifact',
    retdaan:'Handwritten & Artifact',
    splitNib:'Literary & Minimal',
    viraam:'Literary & Minimal',
    kumbhak:'Dark & Moody',
    anugoonj:'Night & Flame',
    azaan:'Season & Sky',
    ankahaa:'Literary & Minimal',
    barfbaari:'Season & Sky',
    antaraal:'Literary & Minimal',
    aramgah:'Season & Sky',
    fermata:'Dark & Moody',
    kuaan:'Dark & Moody',
    aks:'Season & Sky',
    taalab:'Season & Sky',
    geelaPatthar:'Dark & Moody',
    matka:'Dark & Moody',
    shabnam:'Season & Sky',
    deepdhara:'Dark & Moody',
    jalsyahi:'Literary & Minimal',
    jheel:'Literary & Minimal',
    metroLine:'Editorial & Newsprint',
    railingShadow:'Literary & Minimal',
    terraceHour:'Dark & Moody',
    wetSignal:'Night & Flame',
    milkDawn:'Literary & Minimal',
    maidaanCrease:'Literary & Minimal',
    meterDown:'Night & Flame',
    pgWindow:'Dark & Moody',
    liftPanel:'Dark & Moody',
    kalava:'Indian & Classical',
    mehndi:'Indian & Classical',
    anjuri:'Night & Flame',
    pranam:'Literary & Minimal',
    achaar:'Indian & Classical',
    tulsi:'Night & Flame',
    bhaap:'Night & Flame',
    gaanth:'Literary & Minimal',
    niwala:'Indian & Classical',
  };
  // secondary home = shown a second time, appended after a divider at the tail of that group's shelf
  const LOOK_GROUP_SECONDARY = {
    dusk: 'Dark & Moody',
    cyanotype: 'Technical & Diagram',
    casefile: 'Bold & Punchy',
    xerox: 'Bold & Punchy',
    cover: 'Editorial & Newsprint',
    jharokha: 'Geometric & Pattern',
  };
  const GROUP_ORDER = ['Dark & Moody','Night & Flame','Gradient & Vibrant','Season & Sky','Bold & Punchy','Editorial & Newsprint','Technical & Diagram','Literary & Minimal','Indian & Classical','Raag & Craft','Geometric & Pattern','Handwritten & Artifact','Terminal & Monospace'];
  // CORE = signature set (weight first everywhere). RETIRED = hidden from gallery + never
  // suggested (definitions kept so render.cjs stays byte-safe; reversible). See look_curation.json.
  const CORE = new Set(['midnight','paper','grid','dusk','cover','noir','letterpress','zen','palimpsest','broadsheet','oracle']);
  const RETIRED = new Set(['neon','vapor','memphis','street','departure','transit','terminal','sunrise','chalk','bauhaus','tape','xerox','noirstage']);
  const isActive = (l) => LOOKS[l] && !RETIRED.has(l);
  // curated best-fit design order per pillar (taste, not fuzzy match) — active looks only, core-weighted
  const PILLAR_LOOKS = {
    'Truth / Observation':          ['casefile','oneline','netineti','boundaryline','blueCarbon','proofMargin','telegramSlip','midnight','noir','silverGelatin','cinema','press','smoke','cover','riso','ledger','footnote'],
    'Teach / Practice / Solution':  ['grid','slate','takhti','khaadiLinen','triggerscan','breathingSquare','morningpage','stepwellEcho','cardCatalogue','pinboardMap','limewashCourtyard','blueprint','therapylab','data','fieldmap','letterpress','museum','loud'],
    'Story / Recognition':          ['journal','cinema','qalamWash','postcard','innerchild','tapri','localtrain','script','gramophoneGroove','trunkKeyhole','foldingMap','note','paper','dusk','haldi','copperPatina','palimpsest','kraft','noir','midnight'],
    'Course Bridge / Proof':        ['cover','grid','letterpress','invitation','ahamseal','witness','upanishad','brassCompass','marble','jharokha','wasliMiniature','museum','midnight','blueprint','paper'],
    'FAQ / Sales / DM':             ['doubt','grid','invitation','matchboxNote','brassCompass','loud','note','casefile','data','blueprint','riso','press'],
  };
  // light world/family nudge: emotional/poetry → literary+dark first; hot-take/myth → bold+artistic
  const LOOK_DEMOTIONS = { jheel:'hansa', taalab:'hansa', blueCarbon:'cyanotype',
  indigoVat:'cyanotype', chandni:'kohra', cottonsky:'kohra' };
const LOOK_DIGNITY = { kurukshetra:'sacred', ahamseal:'sacred', upanishad:'sacred', innerchild:'tender' };
function suggestLooks(card){
    const base = (PILLAR_LOOKS[card && card.pillar] || GROUP_ORDER.flatMap(g => Object.keys(LOOK_GROUP).filter(l => LOOK_GROUP[l] === g))).slice();
    const blob = ((card && (card.world + ' ' + card.family + ' ' + card.title)) || '').toLowerCase();
    const boost = [];
    // Poem-aesthetic boost ONLY for poem kind — never push sher faces onto teaching posts/carousels
    // (brain audit Sol/Fix #5 — Matchmaker keyword boost at ~4578).
    const kind = String((card && (card.kind || card.type || '')) || '').toLowerCase();
    const isPoemKind = kind === 'poem' || kind === 'poems';
    if (isPoemKind && /poem|poet|mirror|emotion|loss|reflect|silence|akela|dukh/.test(blob)) boost.push('broadsheet','qalamWash','twilightGhazal','mehfil','diwan','radif','purnima','chandni','tanpuraDrone','gramophoneGroove','chikankariTrace','ittar','jharokha','palimpsest','museum','paper','zen','smoke','dusk','midnight','cover','monsoon','noir');
    if (/myth|truth|scam|lie|hot|bold|reframe/.test(blob)) boost.push('casefile','oneline','riso','brut','loud','press','noir','silverGelatin');
    if (/heal|rest|self|gentle|soft|practice|joy|chai|morning/.test(blob)) boost.push('therapylab','haldi','baarish','kohra','innerchild','triggerscan','alaapBreath','breathingSquare','vagusThread','aangan','taalCycle','malaCount','limewashCourtyard','khaadiLinen','aura','garden','note','monsoon','paper');
    if (/story|founder|personal|journey|transform|shoot|camera|film/.test(blob)) boost.push('cinema','qalamWash','greenroom','roughcut','ringlight','haveli','localtrain','copperPatina','fieldmap','journal','note','kraft','palimpsest');
    if (/spiritual|advaita|aham|gita|vedanta|cosmic|dharma|brahma|god/.test(blob)) boost.push('witness','ahamseal','upanishad','netineti','bhasma','kurukshetra','manthan','vanvaas','templeBell','shankhSpiral','malaCount','kundliGrid','peepalShadow','banyanAerial','sacredgeo','wasliMiniature','terracottaFresco','jharokha','palimpsest','oracle','museum','broadsheet','zen');
    if (/teach|lesson|class|guru|student|learn/.test(blob)) boost.push('slate','grid','khaadiLinen','letterpress');
    if (/doubt|question|objection|faq|confus/.test(blob)) boost.push('doubt','grid','footnote');
    if (/attach|relationship|rishta|pyaar|love|breakup/.test(blob)) boost.push('attachthread','mirrorNeuron','lacBangle','dehleezLine','twilightGhazal','velvet');
    if (/sale|offer|enroll|join|course|invite/.test(blob)) boost.push('invitation','cover','letterpress');
    // CORE-first, RETIRED filtered out entirely (never suggest a retired look)
    const seen = new Set(), out = [];
    [...boost, ...base, ...[...CORE], ...Object.keys(LOOKS)].forEach(l => { if (isActive(l) && !seen.has(l)) { seen.add(l); out.push(l); } });
    // LEARN: if the loop layer is present (browser Studio / node with loop.js), re-rank by his REAL taste
    // (Laplace-smoothed kept-rate prior). With zero taste data reorder() returns `out` unchanged — so
    // render.cjs (which doesn't load loop.js) is byte-for-byte unaffected. This is the missing flywheel.
    let ranked = out;
    if (typeof LOOK_DEMOTIONS === 'object' && Array.isArray(ranked)) {
      const leads = new Set(Object.values(LOOK_DEMOTIONS));
      const demoted = new Set(Object.keys(LOOK_DEMOTIONS));
      const hasLead = new Set(ranked.filter(id => leads.has(id)));
      ranked = ranked.filter(id => !(demoted.has(id) && hasLead.has(LOOK_DEMOTIONS[id])));
      ranked = ranked.filter(id => !demoted.has(id)).concat(ranked.filter(id => demoted.has(id)));
    }
    if (typeof LOOK_DIGNITY === 'object' && Array.isArray(ranked)) {
      const blobD = ((card && (card.world + ' ' + card.family + ' ' + card.pillar + ' ' + card.title)) || '').toLowerCase();
      const sacredOk = /vedanta|gita|advaita|aham|dharma|self.?inquiry|upanishad|sakshi/.test(blobD);
      const tenderOk = /inner.?child|childhood|bachpan|gawah|healing|tender/.test(blobD);
      const salesy = /launch|sales|price|offer|waitlist|₹|999/.test(blobD);
      ranked = ranked.filter(id => {
        const dignity = LOOK_DIGNITY[id];
        if (!dignity) return true;
        if (dignity === 'sacred' && !sacredOk) return false;
        if (dignity === 'tender' && (!tenderOk || salesy)) return false;
        return true;
      });
    }
    if (root.DoalfaazLoop && root.DoalfaazLoop.reorder) { try { return root.DoalfaazLoop.reorder(card, ranked); } catch (e) {} }
    return ranked;
  }

  // ================= SINGLE IMAGE-POSTS: 3-5 design variations per post =================
  // card = {hooks:[{t,s}], poems:[{role,t}], title, ...}. Returns [{look, kind, slide(single)}]
  function postVariations(card){
    const looks = suggestLooks(card);
    const hooks = (card.hooks || []).map(h => typeof h === 'string' ? h : h.t).filter(Boolean);
    const poems = (card.poems || []).map(p => typeof p === 'string' ? p : p.t).filter(Boolean);
    const line0 = hooks[0] || card.title || '';
    const line1 = hooks[1] || '';
    const out = [];
    const add = (look, kind, s) => { if (look) out.push({ look, kind, slide: Object.assign({ single: true }, s) }); };
    add(looks[0], 'hook', { role: 'hook', html: emph(line0) });
    add(looks[1], 'hook', { role: 'hook', html: emph(line0) });
    if (line1 && line1 !== line0) add(looks[2], 'hook', { role: 'hook', html: emph(line1) });
    if (poems[0]) add(looks[poems.length && 3] || looks[3] || looks[2], 'poem', { role: 'poem', html: emphPoem(poems[0]) });
    add(looks[4] || looks[2], 'hook', { role: 'hook', html: emph(line0) });
    // de-dup by look+kind
    const seen = new Set();
    return out.filter(v => {
      const k = v.look + '|' + v.kind + '|' + v.slide.html.slice(0, 20);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 5);
  }

  // ================= YOUTUBE THUMBNAILS (16:9, huge text, click-grade) =================
  const THUMB_BASE_CSS = `
  .ythumb{ width:1280px; height:720px; display:flex; flex-direction:column; justify-content:center; padding:70px 82px; position:relative; overflow:hidden; font-family:'Poppins',sans-serif; }
  .ythumb .yt-txt{ font-weight:800; font-size:128px; line-height:1.14; letter-spacing:-3px; }
  .ythumb .yt-brand{ position:absolute; bottom:46px; left:82px; font-family:'Poppins'; font-weight:700; font-size:27px; letter-spacing:3px; }
  .yt-blast{ background:#ffcf1f; color:#141414; } .yt-blast .yt-txt b{ background:#e0231f; color:#fff; padding:2px 16px; box-decoration-break:clone; -webkit-box-decoration-break:clone; } .yt-blast .yt-brand{ color:#141414; }
  .yt-neont{ background:radial-gradient(120% 100% at 50% 15%,#1c1140,#070710); color:#fff; } .yt-neont .yt-txt{ text-shadow:0 0 34px rgba(120,90,255,.6); } .yt-neont .yt-txt b{ color:#00f0ff; text-shadow:0 0 34px rgba(0,240,255,.9); } .yt-neont .yt-brand{ color:#6a5faa; }
  .yt-split{ background:linear-gradient(103deg,#14161a 0 60%,#ee4b2b 60% 100%); color:#fff; } .yt-split .yt-txt{ max-width:64%; } .yt-split .yt-txt b{ color:#ffcf1f; } .yt-split .yt-brand{ color:#8a8a8a; }
  .yt-marker{ background:#f2f0e8; color:#141414; } .yt-marker .yt-txt b{ background:#ffe14d; padding:2px 12px; box-decoration-break:clone; -webkit-box-decoration-break:clone; } .yt-marker .yt-brand{ color:#9a9a90; }
  .yt-shock{ background:#e0231f; color:#fff; } .yt-shock .yt-txt b{ background:#141414; color:#fff; padding:2px 16px; box-decoration-break:clone; -webkit-box-decoration-break:clone; } .yt-shock .yt-brand{ color:#ffd0cd; }
  .yt-cleant{ background:#0f0f13; color:#fff; } .yt-cleant .yt-txt b{ color:#57e08f; border-bottom:8px solid #57e08f; } .yt-cleant .yt-brand{ color:#7a7a82; }
  .yt-face{ position:absolute; top:0; bottom:0; width:55%; background-size:cover; background-position:center 12%; }
  .yt-facer{ background:#141414; color:#fff; } .yt-facer .yt-face{ right:0; } .yt-facer .yt-face::after{ content:''; position:absolute; inset:0; background:linear-gradient(90deg,#141414 3%,rgba(20,20,20,0) 48%),linear-gradient(0deg,rgba(20,20,20,.55),transparent 38%); } .yt-facer .yt-txt{ max-width:48%; font-size:108px; } .yt-facer .yt-txt b{ color:#ffcf1f; } .yt-facer .yt-brand{ color:#9a9a9a; }
  .yt-facel{ background:#141414; color:#fff; align-items:flex-end; text-align:right; } .yt-facel .yt-face{ left:0; } .yt-facel .yt-face::after{ content:''; position:absolute; inset:0; background:linear-gradient(270deg,#141414 3%,rgba(20,20,20,0) 48%),linear-gradient(0deg,rgba(20,20,20,.55),transparent 38%); } .yt-facel .yt-txt{ max-width:48%; font-size:108px; } .yt-facel .yt-txt b{ color:#00f0ff; } .yt-facel .yt-brand{ left:auto; right:82px; color:#9a9a9a; }
  .yt-facepop{ background:#ffcf1f; color:#141414; } .yt-facepop .yt-face{ right:0; } .yt-facepop .yt-face::after{ content:''; position:absolute; inset:0; background:linear-gradient(90deg,#ffcf1f 3%,rgba(255,207,31,0) 46%); } .yt-facepop .yt-txt{ max-width:50%; font-size:104px; } .yt-facepop .yt-txt b{ background:#e0231f; color:#fff; padding:2px 14px; box-decoration-break:clone; -webkit-box-decoration-break:clone; } .yt-facepop .yt-brand{ color:#141414; }`;
  const THUMB_STYLES = { blast:'Blast', neont:'Neon', split:'Split', marker:'Marker', shock:'Shock', cleant:'Clean', facer:'Face · R', facel:'Face · L', facepop:'Face · Pop' };
  function thumbHTML(v){ const st = THUMB_STYLES[v.style] ? v.style : 'blast'; const face = (v.face && /^face/.test(st)) ? `<div class="yt-face" style="background-image:url('${v.face}')"></div>` : ''; return `<div class="ythumb yt-${st}">${face}<div class="yt-txt">${v.text}</div><div class="yt-brand">@DOALFAAZ</div></div>`; }
  function wc(s){ return esc(s).split(/\s+/).filter(Boolean).length; }
  function thumbPhrase(s){
    s = esc(s).replace(/["'“”‘’]/g, '').replace(/[.?!]+$/, '').trim();
    if (wc(s) <= 5) return s;
    // break into COMPLETE clauses (never a mid-sentence word slice)
    const clauses = s.split(/\s*[—–\-:;,]\s*/).map(x => x.trim()).filter(x => wc(x) >= 2);
    const short = clauses.filter(c => wc(c) >= 2 && wc(c) <= 5).sort((a, b) => wc(a) - wc(b));
    if (short.length) return short[0];                       // a clean short clause
    const four = clauses.filter(c => wc(c) <= 7).sort((a, b) => wc(a) - wc(b))[0];
    if (four) return four.split(/\s+/).slice(0, 5).join(' '); // shortest clause, capped
    return (clauses[0] || s).split(/\s+/).slice(0, 4).join(' ');
  }
  function thumbEmph(s){ const w = esc(s).split(' '); if (w.length <= 2) return '<b>' + w.join(' ') + '</b>'; const k = Math.min(2, Math.max(1, Math.round(w.length / 3))); return w.slice(0, -k).join(' ') + ' <b>' + w.slice(-k).join(' ') + '</b>'; }
  function cleanThumbCands(card){
    const raw = [card.title, ...((card.hooks || []).map(h => typeof h === 'string' ? h : h.t))].filter(Boolean);
    const out = [];
    for (const s of raw){
      const base = esc(s).replace(/["'“”‘’]/g, '');
      const clauses = base.split(/\s*[—–\-:;,]\s*/).map(x => x.replace(/[.?!]+$/, '').trim());
      for (const c of clauses){
        if (wc(c) < 2 || wc(c) > 5) continue;
        if (/^[a-z]/.test(c)) continue;                                       // mid-sentence (lowercase start)
        if (/^(aur|par|kyunki|isliye|ya|jo|ki|ke|to|toh|woh|wahi|phir|lekin|magar|kyun)\b/i.test(c)) continue; // connectors
        out.push(c);
      }
      const whole = base.replace(/[.?!]+$/, '').trim();
      if (wc(whole) >= 2 && wc(whole) <= 5 && /^[A-Z0-9'‘"]/.test(whole)) out.push(whole);
    }
    out.sort((a, b) => (Number(/[=≠]/.test(b)) - Number(/[=≠]/.test(a))) || wc(a) - wc(b));
    const seen = new Set(), uniq = [];
    for (const c of out){ const k = c.toLowerCase(); if (!seen.has(k)){ seen.add(k); uniq.push(c); } }
    return uniq;
  }
  function thumbVariations(card){
    let use = cleanThumbCands(card).slice(0, 3);
    if (!use.length) use = [thumbPhrase(card.title || 'Watch this')];
    const styles = Object.keys(THUMB_STYLES);
    const out = [];
    use.forEach((txt, i) => { out.push({ style: styles[(i * 2) % styles.length], text: thumbEmph(txt), raw: txt }); out.push({ style: styles[(i * 2 + 1) % styles.length], text: thumbEmph(txt), raw: txt }); });
    return out.slice(0, 6);
  }

  const API = { LOOKS, CORE, RETIRED, isActive, slideHTML, nsCSS, ARROWSVG, SLIDE_BASE_CSS, bake, splitBody, emph, LOOK_GROUP, LOOK_GROUP_SECONDARY, GROUP_ORDER, PILLAR_LOOKS, suggestLooks, renderBlock, blockCSS: () => { const m = blocksMod(); return m ? m.css : ''; }, PAL, palStyle, SHLOKS, shlokFor, ICONS, postVariations, THUMB_BASE_CSS, THUMB_STYLES, thumbHTML, thumbVariations };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.CarouselCore = API;

})(typeof window !== 'undefined' ? window : globalThis);

/* source: codex-merged-post-core-js */
/* post_core — SINGLE-IMAGE POST designs for @doalfaaz (1080x1350 standalone poster art).
 * Poetry is the star. Mirrors thumb3.js: exports BASE (css) + html(templateId,v) rendered
 * via headless screenshot (page 1080x1350, deviceScaleFactor 2).
 *
 * Implements ALL 16 B1 templates from CODEX_DESIGN_EXPANSION.md PART B, obeying each
 * template's palette / layout / deva_treatment / bg_recipe / ornaments EXACTLY, plus the
 * B2 core rules (deva line-height >=1.55, accent ONLY the resolving line, danda sparingly).
 * Textures are CSS / inline-SVG only (no raster assets).
 *
 * v fields: {
 *   poem   — Devanagari sher, "\n" between lines -> rendered as stacked lines (last line accented)
 *   last   — (optional) explicit accent/resolving line; overrides the auto-accented final poem line
 *   line1, line2 — Roman Hinglish mirror one-liner (two-part)
 *   big    — hero word (Devanagari concept: मोह / जलन / दुख …)
 *   kicker — tiny roman kicker (SHER / INNER NOTE …)
 *   meaning— roman-hinglish meaning (scripture card)
 *   ref    — reference chip (scripture)
 *   handle — @handle (defaults @doalfaaz)
 * }
 * UMD: require() in node -> module.exports ; browser -> window.PostCore
 */
(function (root, f) {
  if (typeof module === 'object' && module.exports) module.exports = f();
  else root.PostCore = f();
}(typeof self !== 'undefined' ? self : this, function () {

  // ---------- helpers ----------
  const esc = s => (s == null ? '' : String(s));
  const H = v => (v && v.handle) ? esc(v.handle) : '@doalfaaz';
  /* v357 typeset: phrase-unit wrap for flowing text sinks (identity esc — this
   * pipeline has always inserted text raw). Requires .pc .pu{white-space:nowrap}. */
  const pu = s => { s = esc(s); const DT = (typeof window !== 'undefined') && window.DoalfaazTypeset;
    return (DT && s) ? DT.senseWrapHTML(s, x => x) : s; };

  // Split a Devanagari poem ("\n" separated) into <div.pl> lines; the LAST line (or an
  // explicit v.last) becomes the accented resolving line (.pl.last). Obeys B2: accent only
  // the resolving line, never every line.
  function poemLines(v, cls) {
    cls = cls || 'pl';
    const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    let lines = raw.length ? raw.split('\n') : [];
    if (!lines.length && v.big) lines = [esc(v.big)];                  // fallback hero for non-poem cards
    let last = (v.last != null && v.last !== '') ? esc(v.last) : null;
    if (last == null && lines.length > 1) { last = lines.pop(); }         // P0-4: never pop a single flat sentence as if it were a poem's final line — that's how a mechanical accent lands on a random trailing word instead of a deliberate poem-closing line.         // auto: final poem line resolves
    const body = lines.map(l => `<div class="${cls}">${l ? pu(l) : '&nbsp;'}</div>`).join('');
    const tail = last != null ? `<div class="${cls} last">${pu(last)}</div>` : '';
    return body + tail;
  }
  // simple <br>-joined variant (when a template wants a single flowing block)
  const poemBr = v => {
    const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    const lines = raw.length ? raw.split('\n') : [];
    if (v.last != null && v.last !== '') lines.push(esc(v.last));
    return lines.map((l, i, a) => i === a.length - 1 ? `<span class="last">${pu(l)}</span>` : pu(l)).join('<br>');
  };

  // Reusable inline-SVG paper/photocopy grain (data-URI) — CSS/SVG texture only.
  const grain = (bf, oct, seed, op) =>
    `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='${bf}' numOctaves='${oct}' seed='${seed}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='${op}'/%3E%3C/svg%3E");`;

  const DANDA = '॥';

  // ---------- BASE: shared + per-template CSS ----------
  const BASE = `
  .pc{ position:relative; width:1080px; height:1350px; overflow:hidden; box-sizing:border-box;
       font-family:'Poppins','Helvetica Neue',sans-serif; }
  .pc *{ box-sizing:border-box; }
  .pc .deva{ font-family:'Laila','Kohinoor Devanagari','Devanagari Sangam MN',serif; }
  .pc .grain{ position:absolute; inset:0; pointer-events:none; }
  .pc .mark{ position:absolute; font-family:'Poppins',sans-serif; font-weight:600; letter-spacing:.14em;
             font-size:22px; z-index:8; }
  .pc .kick{ font-family:'Poppins',sans-serif; font-weight:700; letter-spacing:.16em; text-transform:uppercase;
             font-size:22px; z-index:6; }
  /* a poem "stack": each line = .pl ; resolving line = .pl.last */
  .pc .stack{ position:absolute; z-index:5; }
  .pc .stack .pl{ margin:0; }
  .pc .pu{ white-space:nowrap; } /* v357 typeset: phrase units never break mid-phrase */

  /* ============================================================= 1) SHER — BLACK ALTAR
     Sacred dark sher, vast negative space, ॥ above, gold accent last line. */
  .pc-altar{ background:#070707; color:#f3eadc; }
  .pc-altar .glow{ position:absolute; inset:0;
      background:radial-gradient(circle at 50% 18%, rgba(216,162,74,.13) 0, transparent 38%); }
  .pc-altar .grain{ ${grain(0.9, 2, 4, 0.045)} mix-blend-mode:screen; opacity:.9; }
  .pc-altar .orn{ position:absolute; top:250px; left:0; right:0; text-align:center; z-index:6; }
  .pc-altar .orn .d{ font-size:52px; color:#d8a24a; opacity:.65; }
  .pc-altar .orn .hr{ display:inline-block; width:72px; height:1px; background:#d8a24a; opacity:.5;
      vertical-align:middle; margin:0 26px; }
  .pc-altar .stack{ left:138px; top:335px; width:804px; text-align:center; }
  .pc-altar .pl{ font-weight:600; font-size:72px; line-height:1.68; color:#f3eadc; word-spacing:.04em; }
  .pc-altar .pl.last{ font-weight:650; font-size:76px; line-height:1.58; color:#d8a24a; }
  .pc-altar .mark{ left:0; right:0; bottom:108px; text-align:center; color:#9f9688; }
  .pc-altar .mark .dot{ display:inline-block; width:6px; height:6px; border-radius:50%; background:#d8a24a;
      margin-left:10px; vertical-align:middle; }

  /* ============================================================= 2) SHER — MANUSCRIPT MARGIN
     Parchment, ruled lines, left commentary rail w/ red ticks, ॥ after final line only. */
  .pc-manuscript{ background:#efe1c2; color:#21160f; }
  .pc-manuscript .rule{ position:absolute; inset:0;
      background-image:repeating-linear-gradient(180deg, transparent 0 67px, rgba(33,22,15,.09) 67px 68px);
      opacity:.6; }
  .pc-manuscript .grain{ ${grain(0.72, 2, 7, 0.07)} mix-blend-mode:multiply; }
  .pc-manuscript .border{ position:absolute; inset:0; z-index:2; pointer-events:none; }
  .pc-manuscript .rail{ position:absolute; left:74px; top:220px; width:42px; height:640px; z-index:4; }
  .pc-manuscript .rail i{ display:block; width:22px; height:2px; background:#9c2f1d; opacity:.55;
      margin:0 0 44px 0; }
  .pc-manuscript .tika{ position:absolute; left:150px; top:255px; width:12px; height:12px; border-radius:50%;
      background:#9c2f1d; z-index:5; }
  .pc-manuscript .note{ position:absolute; right:78px; top:238px; z-index:5; font-family:'Poppins',sans-serif;
      font-weight:700; font-size:18px; letter-spacing:.06em; color:#fff; background:#1d4f78;
      padding:6px 14px; border-radius:16px; }
  .pc-manuscript .stack{ left:150px; top:295px; width:780px; text-align:left; }
  .pc-manuscript .pl{ font-weight:600; font-size:64px; line-height:1.75; color:#21160f; }
  .pc-manuscript .pl.last .d2{ color:#9c2f1d; }
  .pc-manuscript .pl.last{ color:#9c2f1d; }
  .pc-manuscript .ref{ position:absolute; left:150px; top:1180px; z-index:5; font-family:'Georgia',serif;
      font-size:24px; color:#735f42; }
  .pc-manuscript .mark{ right:78px; bottom:70px; color:#735f42; }

  /* ============================================================= 3) SHER — RISO DUAL-INK
     Off-white, red sun blob + blue misregistered dup, halftone, young/printed. */
  .pc-riso{ background:#fff3d6; color:#17120e; }
  .pc-riso .sun{ position:absolute; left:470px; top:300px; width:430px; height:430px; border-radius:50%;
      background:#e84b3c; mix-blend-mode:multiply; opacity:.9; z-index:2; }
  .pc-riso .sun.b{ background:#2565b7; transform:translate(10px,10px); opacity:.55; z-index:1; }
  .pc-riso .halftone{ position:absolute; inset:0; z-index:2;
      background-image:repeating-radial-gradient(circle, rgba(23,18,14,.14) 0 1.2px, transparent 1.4px 7px);
      -webkit-mask-image:radial-gradient(60% 60% at 100% 0%, #000 0, transparent 70%),
                         radial-gradient(50% 50% at 0% 100%, #000 0, transparent 70%);
      -webkit-mask-composite:source-over; mask-image:radial-gradient(60% 60% at 100% 0%, #000 0, transparent 70%),
                         radial-gradient(50% 50% at 0% 100%, #000 0, transparent 70%); }
  .pc-riso .grain{ ${grain(0.95, 2, 9, 0.05)} mix-blend-mode:multiply; }
  .pc-riso .issue{ position:absolute; right:80px; top:96px; z-index:6; font-family:'Poppins',sans-serif;
      font-weight:800; font-size:20px; letter-spacing:.14em; color:#17120e; opacity:.7; }
  .pc-riso .stack{ left:86px; top:310px; width:790px; z-index:5; text-align:left; }
  .pc-riso .pl{ font-weight:700; font-size:70px; line-height:1.48; color:#17120e; }
  .pc-riso .pl.first{ font-size:82px; }
  .pc-riso .pl.last{ color:#17120e; }
  .pc-riso .pl.last .u{ display:inline; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 12' preserveAspectRatio='none'%3E%3Cpath d='M1,7 Q30,2 55,6 T99,5' stroke='%23e84b3c' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:0 100%; background-size:100% .3em; }
  .pc-riso .mark{ right:80px; bottom:70px; color:#6e6254; }

  /* ============================================================= 4) SHER — INK WASH
     Soft, translucent teal ink-wash blob, slow literary rhythm, tiny accent (last 2 words). */
  .pc-inkwash{ background:#f6f2ea; color:#141414; }
  .pc-inkwash .wash{ position:absolute; left:210px; top:210px; width:660px; height:660px; z-index:2;
      background:#1f5d63; opacity:.10; filter:blur(10px);
      border-radius:56% 44% 47% 53% / 55% 52% 48% 45%; }
  .pc-inkwash .wash2{ position:absolute; left:150px; top:150px; width:780px; height:780px; z-index:1;
      background:#1f5d63; opacity:.035; filter:blur(28px); border-radius:50%; }
  .pc-inkwash .drop{ position:absolute; left:150px; top:320px; width:9px; height:9px; border-radius:50%;
      background:#1f5d63; opacity:.5; z-index:4; }
  .pc-inkwash .grain{ ${grain(0.85, 2, 3, 0.035)} mix-blend-mode:multiply; }
  .pc-inkwash .stack{ left:150px; top:360px; width:780px; z-index:5; text-align:left; }
  .pc-inkwash .pl{ font-family:'Devanagari Sangam MN','Laila',serif; font-weight:500; font-size:58px;
      line-height:1.86; color:#141414; }
  .pc-inkwash .pl.last{ color:#141414; }
  .pc-inkwash .pl.last .t{ color:#1f5d63; }
  .pc-inkwash .mark{ left:82px; bottom:135px; color:#6f6b63; }

  /* ============================================================= 5) SHER — DANDA COLUMN
     Narrow refined column, oversized ॥ in left column (not inline), two vertical rules. */
  .pc-danda{ background:#fbfaf5; color:#171717; }
  .pc-danda .v1{ position:absolute; left:205px; top:0; bottom:0; width:1px; background:#ded6c7; opacity:.5; }
  .pc-danda .v2{ position:absolute; left:875px; top:0; bottom:0; width:1px; background:#ded6c7; opacity:.5; }
  .pc-danda .bigd{ position:absolute; left:126px; top:290px; z-index:4; font-size:92px; color:#b42a1f;
      line-height:1; }
  .pc-danda .stack{ left:250px; top:285px; width:580px; z-index:5; text-align:center; }
  .pc-danda .pl{ font-weight:650; font-size:68px; line-height:1.72; color:#171717; }
  .pc-danda .pl.last{ color:#b42a1f; }
  .pc-danda .date{ position:absolute; left:250px; bottom:118px; z-index:5; font-family:'Poppins',sans-serif;
      font-weight:700; font-size:15px; letter-spacing:.24em; color:#8a8176; text-transform:uppercase; }
  .pc-danda .mark{ left:0; right:0; bottom:82px; text-align:center; color:#8a8176; }

  /* ============================================================= 6) MIRROR — WHITE ROOM
     One Roman line huge, optional small 2nd line, mirror line under punch, single red period. */
  .pc-whiteroom{ background:#f8f8f4; color:#101010; }
  .pc-whiteroom .floor{ position:absolute; left:50%; bottom:180px; transform:translateX(-50%);
      width:760px; height:120px; border-radius:50%;
      background:radial-gradient(ellipse at center, rgba(16,16,16,.08) 0, transparent 70%); }
  .pc-whiteroom .grain{ ${grain(0.9, 2, 5, 0.02)} mix-blend-mode:multiply; }
  .pc-whiteroom .l1{ position:absolute; left:84px; top:370px; width:912px; z-index:5;
      font-family:'Poppins',sans-serif; font-weight:850; font-size:88px; line-height:1.02; color:#101010; }
  .pc-whiteroom .l1 .p{ color:#d42020; }
  .pc-whiteroom .l1 .u{ background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 10' preserveAspectRatio='none'%3E%3Cpath d='M1,6 L99,5' stroke='%23d42020' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:0 100%; background-size:100% .18em; }
  .pc-whiteroom .l2{ position:absolute; left:88px; top:760px; width:820px; z-index:5;
      font-family:'Georgia',serif; font-style:italic; font-weight:400; font-size:44px; line-height:1.35;
      color:#6a6a63; }
  .pc-whiteroom .mark{ left:84px; bottom:70px; color:#6a6a63; }

  /* ============================================================= 7) MIRROR — REDACTED TRUTH
     Black, redaction bar over setup, huge white reveal, CASE NOTE chip, small red arrow. */
  .pc-redacted{ background:#111111; color:#f4eee3; }
  .pc-redacted .grain{ ${grain(0.95, 2, 8, 0.07)} mix-blend-mode:screen; }
  .pc-redacted .chip{ position:absolute; left:86px; top:150px; z-index:6; font-family:'Courier New',monospace;
      font-weight:700; font-size:20px; letter-spacing:.14em; color:#fff; background:#3b302b; padding:8px 16px;
      text-transform:uppercase; }
  /* stack (2026-07-25 fix): .setup and .reveal were both absolutely positioned at hardcoded
     tops (260px / 430px). The 170px gap only fits a ONE-line setup (56px x 1.12 = 63px), so
     any setup running to 2+ lines ran straight through the reveal. Flowing them inside one
     absolutely-positioned stack (cf. .pc-mechmargin .stack) makes the reveal sit below the
     setup's ACTUAL rendered height; the 96px margin reproduces the original 1-line spacing. */
  .pc-redacted .stack{ position:absolute; left:86px; top:260px; width:860px; z-index:5; }
  .pc-redacted .setup{ position:static; width:820px; margin:0 0 96px;
      font-family:'Poppins',sans-serif; font-weight:900; font-size:56px; line-height:1.12; color:#f4eee3; }
  .pc-redacted .setup .r{ position:relative; background:#f4eee3; color:transparent; padding:0 .12em;
      -webkit-box-decoration-break:clone; box-decoration-break:clone; }
  .pc-redacted .reveal{ position:static; width:860px;
      font-family:'Poppins',sans-serif; font-weight:900; font-size:104px; line-height:1.0; color:#fff; }
  .pc-redacted .reveal .rw{ color:#ef2020; }
  .pc-redacted .exp{ position:absolute; left:90px; top:875px; width:780px; z-index:5;
      font-family:'Poppins',sans-serif; font-weight:500; font-size:40px; line-height:1.4; color:#9f998f; }
  .pc-redacted .arrow{ position:absolute; left:86px; top:815px; z-index:6; }
  .pc-redacted .mark{ right:60px; bottom:60px; color:#9f998f; }

  /* ============================================================= 8) QUOTE — BROADSHEET
     Old broadsheet, masthead, fold line, corner halftone, huge ghost quote mark. */
  .pc-broadsheet{ background:#f7f0df; color:#15110d; }
  .pc-broadsheet .fold{ position:absolute; inset:0; z-index:1;
      background:linear-gradient(90deg, transparent 0 49%, rgba(0,0,0,.055) 50%, transparent 51%); }
  .pc-broadsheet .halftone{ position:absolute; inset:0; z-index:1;
      background-image:radial-gradient(circle, #15110d 0 1px, transparent 1.5px); background-size:9px 9px;
      opacity:.07;
      -webkit-mask-image:radial-gradient(40% 30% at 0% 0%, #000 0, transparent 70%),
                         radial-gradient(40% 30% at 100% 100%, #000 0, transparent 70%);
      mask-image:radial-gradient(40% 30% at 0% 0%, #000 0, transparent 70%),
                 radial-gradient(40% 30% at 100% 100%, #000 0, transparent 70%); }
  .pc-broadsheet .masthead{ position:absolute; left:70px; top:70px; width:940px; z-index:5;
      border-top:3px solid #15110d; border-bottom:3px solid #15110d; padding:14px 0;
      display:flex; align-items:baseline; justify-content:space-between; }
  .pc-broadsheet .masthead .m{ font-family:'Poppins',sans-serif; font-weight:800; font-size:30px;
      letter-spacing:.14em; text-transform:uppercase; }
  .pc-broadsheet .masthead .iss{ font-family:'Poppins',sans-serif; font-weight:700; font-size:18px;
      letter-spacing:.1em; color:#61584d; }
  .pc-broadsheet .qmark{ position:absolute; left:40px; top:150px; z-index:2; font-family:Georgia,serif;
      font-size:420px; line-height:1; color:#15110d; opacity:.08; }
  .pc-broadsheet .quote{ position:absolute; left:86px; top:280px; width:900px; z-index:5; }
  .pc-broadsheet .quote .q{ font-family:'Didot','Georgia',serif; font-weight:800; font-size:84px;
      line-height:1.02; color:#15110d; }
  .pc-broadsheet .quote.deva .q{ font-family:'Laila','Kohinoor Devanagari',serif; font-weight:650;
      font-size:64px; line-height:1.65; }
  .pc-broadsheet .quote .q .last{ color:#b81423; }
  .pc-broadsheet .attr{ position:absolute; left:86px; top:1110px; z-index:5; font-family:'Poppins',sans-serif;
      font-weight:700; font-size:26px; letter-spacing:.08em; color:#61584d; }
  .pc-broadsheet .mark{ right:70px; bottom:64px; color:#61584d; }

  /* ============================================================= 9) SCRIPTURE — MARGIN CARD
     Shloka/sher top, roman meaning below, reference chip, copper border, sacred geometry. */
  .pc-scripture{ background:#fff8e6; color:#24170e; }
  .pc-scripture .geo{ position:absolute; left:50%; top:46%; transform:translate(-50%,-50%); z-index:1;
      opacity:.12; }
  .pc-scripture .frame{ position:absolute; inset:64px; z-index:2; border:1px solid #b76e33; pointer-events:none; }
  .pc-scripture .ref{ position:absolute; right:96px; top:96px; z-index:6; font-family:'Poppins',sans-serif;
      font-weight:700; font-size:20px; letter-spacing:.1em; color:#183f66; border:1px solid #183f66;
      padding:6px 14px; border-radius:4px; }
  .pc-scripture .seal{ position:absolute; left:50%; top:236px; transform:translateX(-50%); z-index:5;
      width:10px; height:10px; border-radius:50%; background:#b76e33; }
  .pc-scripture .stack{ left:122px; top:280px; width:836px; z-index:5; text-align:center; }
  .pc-scripture .pl{ font-family:'Laila','Kohinoor Devanagari',serif; font-weight:600; font-size:62px;
      line-height:1.68; color:#24170e; }
  .pc-scripture .pl.last{ color:#b76e33; }
  .pc-scripture .copper{ position:absolute; left:50%; top:730px; transform:translateX(-50%); width:120px;
      height:2px; background:#b76e33; z-index:5; }
  .pc-scripture .meaning{ position:absolute; left:150px; top:788px; width:780px; z-index:5;
      font-family:'Georgia',serif; font-weight:400; font-size:34px; line-height:1.45; color:#76624a;
      text-align:center; }
  .pc-scripture .mark{ left:0; right:0; bottom:88px; text-align:center; color:#76624a; }

  /* ============================================================= 10) GRADIENT — POETRY HORIZON
     Night->teal gradient, warm horizon glow, tiny kicker, gold last line if it resolves. */
  .pc-horizon{ color:#fff1df;
      background:linear-gradient(180deg,#10161c 0%,#15252b 55%,#5ca7b8 100%); }
  .pc-horizon .glow{ position:absolute; inset:0;
      background:radial-gradient(circle at 50% 82%, rgba(240,179,79,.28) 0, transparent 42%); }
  .pc-horizon .hz{ position:absolute; left:0; right:0; top:1010px; height:1px;
      background:linear-gradient(90deg, transparent, rgba(240,179,79,.6), transparent); z-index:4; }
  .pc-horizon .grain{ ${grain(0.9, 2, 6, 0.05)} mix-blend-mode:screen; }
  .pc-horizon .kick{ position:absolute; left:120px; top:282px; color:#f0b34f; z-index:6; }
  .pc-horizon .stack{ left:118px; top:355px; width:844px; z-index:5; text-align:left; }
  .pc-horizon .pl{ font-weight:600; font-size:64px; line-height:1.72; color:#fff1df; }
  .pc-horizon .pl.last{ color:#f0b34f; }
  .pc-horizon .mark{ left:120px; bottom:70px; color:#b7c4c9; }

  /* ============================================================= 11) NEGATIVE SPACE — BREATH
     ~60% blank above; tiny small poem low; one horizon line; fragile. */
  .pc-breath{ background:#f9f8f2; color:#191919; }
  .pc-breath .hz{ position:absolute; left:132px; top:545px; width:816px; height:1px; background:#191919;
      opacity:.35; z-index:4; }
  .pc-breath .dot{ position:absolute; left:132px; top:566px; width:7px; height:7px; border-radius:50%;
      background:#2f6f67; z-index:4; }
  .pc-breath .grain{ ${grain(0.85, 2, 2, 0.02)} mix-blend-mode:multiply; }
  .pc-breath .stack{ left:132px; top:610px; width:650px; z-index:5; text-align:left; }
  .pc-breath .pl{ font-weight:500; font-size:44px; line-height:1.95; color:#191919; }
  .pc-breath .pl.last{ color:#191919; }
  .pc-breath .pl.last .t{ color:#2f6f67; }
  .pc-breath .mark{ left:132px; bottom:70px; color:#77736b; }

  /* ============================================================= 12) TORN PAPER SHER
     Dark bg, torn cream paper slab (uneven clip), red tape, typewriter label, red sting. */
  .pc-torn{ background:#151515; color:#f6eddb; }
  .pc-torn .slab{ position:absolute; left:86px; top:240px; width:908px; height:780px; z-index:3;
      background:#f6eddb; transform:rotate(-.3deg); box-shadow:0 22px 80px rgba(0,0,0,.38);
      clip-path:polygon(0% 2%,7% 0.5%,15% 1.8%,26% 0.4%,38% 1.6%,50% 0.3%,63% 1.5%,74% 0.4%,86% 1.7%,95% 0.6%,100% 2%,
                        99.4% 20%,100% 40%,99.5% 62%,100% 80%,99.3% 98%,
                        92% 99.6%,80% 98.3%,67% 99.7%,54% 98.4%,42% 99.6%,30% 98.3%,18% 99.7%,8% 98.6%,0% 98%,
                        0.6% 78%,0% 58%,0.5% 38%,0% 18%); }
  .pc-torn .slab .fiber{ position:absolute; inset:0; ${grain(0.9, 2, 11, 0.06)} mix-blend-mode:multiply;
      opacity:.9; }
  .pc-torn .tape{ position:absolute; left:120px; top:214px; width:180px; height:52px; z-index:5;
      background:rgba(201,37,37,.72); transform:rotate(-6deg); }
  .pc-torn .label{ position:absolute; left:150px; top:958px; z-index:5; font-family:'Courier New',monospace;
      font-weight:700; font-size:22px; letter-spacing:.06em; color:#777068; }
  .pc-torn .stack{ left:150px; top:365px; width:780px; z-index:5; text-align:left; }
  .pc-torn .pl{ font-weight:700; font-size:66px; line-height:1.58; color:#17120e; }
  .pc-torn .pl.last{ color:#c92525; }
  .pc-torn .mark{ left:0; right:0; bottom:60px; text-align:center; color:#777068; }

  /* ============================================================= 13) HAND NOTE — SUNDAY
     Ruled notebook page, red margin line, tape corners, hand-written single line + small note. */
  .pc-handnote{ background:#f1eadc; color:#1c1a17; }
  .pc-handnote .page{ position:absolute; left:84px; top:120px; width:912px; height:1080px; z-index:2;
      background:#f1eadc;
      background-image:repeating-linear-gradient(180deg, transparent 0 53px, rgba(28,26,23,.10) 53px 54px);
      box-shadow:0 10px 40px rgba(0,0,0,.14); }
  .pc-handnote .page .margin{ position:absolute; left:64px; top:0; bottom:0; width:2px; background:#b94b32;
      opacity:.7; }
  .pc-handnote .grain{ ${grain(0.8, 2, 4, 0.03)} mix-blend-mode:multiply; }
  .pc-handnote .tp{ position:absolute; width:120px; height:40px; background:rgba(209,196,174,.75); z-index:5; }
  .pc-handnote .tp.a{ left:120px; top:104px; transform:rotate(-8deg); }
  .pc-handnote .tp.b{ right:120px; top:110px; transform:rotate(7deg); }
  /* stack (2026-07-25 fix): .line, .arw and .accd were absolutely positioned at hardcoded tops
     (390 / 520 / 640) that only leave room for a ONE-line .line (78px x 1.28 = 100px/line). A
     2-line line ran through the arrow and a 3-4 line one ran through the big red accent word.
     Flowing all three inside one absolutely-positioned stack anchors each to the previous
     element's ACTUAL rendered height; margins reproduce the original 1-line spacing. */
  /* stack (2026-07-25 fix): .line, .arw, .accd and .note were absolutely positioned at hardcoded
     tops (390 / 520 / 640 / 950) that only leave room for a ONE-line .line (78px x 1.28 = 100px
     per line). A 2-line line ran through the arrow and a 4-line one ran through the big red accent
     word. All four now flow inside one absolutely-positioned flex column, so each element anchors
     to the previous one's ACTUAL rendered height. Height 655px = the original 390 top through the
     note's original bottom, and .note's margin-top:auto pins it to that bottom — so a short line
     reproduces the original layout exactly, while a long one pushes the note down instead of
     letting the accent word land on top of it. */
  .pc-handnote .stack{ position:absolute; left:130px; top:390px; width:800px; height:655px;
      display:flex; flex-direction:column; z-index:5; }
  .pc-handnote .line{ position:static; width:800px; margin:0 0 30px;
      font-family:'Bradley Hand','Poppins',cursive; font-weight:600; font-size:78px; line-height:1.28;
      color:#1c1a17; }
  .pc-handnote .line .p{ color:#b94b32; }
  .pc-handnote .accd{ position:static; margin:0 0 28px; font-family:'Laila',serif;
      font-weight:600; font-size:70px; line-height:1.2; color:#b94b32; }
  .pc-handnote .note{ position:static; width:780px; margin-top:auto;
      font-family:'Poppins',sans-serif; font-weight:500; font-size:34px; line-height:1.4; color:#746b5c; }
  .pc-handnote .arw{ position:static; margin:0 0 83px 20px; z-index:6; }
  .pc-handnote .mark{ right:150px; bottom:150px; color:#746b5c; }

  /* ============================================================= 14) BOLD WORD POEM
     Black, one HUGE Devanagari concept word (red-stroke shadow) + sher below. */
  .pc-boldword{ background:#0d0d0d; color:#f6f0e6; }
  .pc-boldword .rg{ position:absolute; left:50%; top:230px; transform:translate(-50%,-50%); width:820px;
      height:620px; z-index:1;
      background:radial-gradient(circle, rgba(227,38,38,.20) 0, transparent 62%); }
  .pc-boldword .grain{ ${grain(0.95, 2, 7, 0.05)} mix-blend-mode:screen; }
  .pc-boldword .big{ position:absolute; left:70px; top:130px; width:940px; z-index:4; text-align:center;
      font-family:'Laila','Kohinoor Devanagari',serif; font-weight:800; font-size:178px; line-height:.95;
      color:#f6f0e6; text-shadow:6px 6px 0 #e32626; }
  .pc-boldword .scratch{ position:absolute; left:50%; top:388px; transform:translateX(-50%); width:560px;
      height:24px; z-index:4; }
  .pc-boldword .kick{ position:absolute; left:0; right:0; top:470px; text-align:center; color:#e32626; z-index:6; }
  .pc-boldword .stack{ left:110px; top:560px; width:860px; z-index:5; text-align:center; }
  .pc-boldword .pl{ font-weight:550; font-size:56px; line-height:1.7; color:#f6f0e6; }
  .pc-boldword .pl.last{ color:#f6f0e6; }
  .pc-boldword .pl.last .t{ color:#e32626; }
  .pc-boldword .seal{ position:absolute; right:70px; bottom:118px; z-index:5; width:12px; height:12px;
      border-radius:50%; background:#e32626; }
  .pc-boldword .mark{ right:70px; bottom:70px; color:#a79e92; }

  /* ============================================================= 15) COURT ORDER — MIRROR
     Official order sheet, double border, huge verdict, VERDICT stamp, case #, signature. */
  .pc-court{ background:#f4efe4; color:#141414; }
  .pc-court .sheet{ position:absolute; left:82px; top:95px; width:916px; height:1130px; z-index:2;
      background:#f4efe4; border:3px double #141414; box-shadow:0 12px 40px rgba(0,0,0,.12); }
  .pc-court .grain{ ${grain(0.8, 2, 5, 0.035)} mix-blend-mode:multiply; }
  .pc-court .caseno{ position:absolute; left:128px; top:150px; z-index:5; font-family:'Courier New',monospace;
      font-weight:700; font-size:22px; letter-spacing:.1em; color:#65615a; }
  .pc-court .head{ position:absolute; left:0; right:0; top:210px; text-align:center; z-index:5;
      font-family:'Courier New',monospace; font-weight:700; font-size:24px; letter-spacing:.3em;
      color:#141414; }
  .pc-court .verdict{ position:absolute; left:128px; top:365px; width:820px; z-index:5;
      font-family:'Poppins',sans-serif; font-weight:900; font-size:76px; line-height:1.06; color:#141414; }
  .pc-court .verdict .p{ color:#b71919; }
  .pc-court .body{ position:absolute; left:128px; top:760px; width:760px; z-index:5;
      font-family:'Courier New',monospace; font-weight:700; font-size:28px; line-height:1.5; color:#65615a; }
  .pc-court .stamp{ position:absolute; right:120px; bottom:210px; z-index:6; border:3px solid #b71919;
      color:#b71919; font-family:'Courier New',monospace; font-weight:700; font-size:34px; letter-spacing:.12em;
      padding:12px 22px; transform:rotate(-11deg); text-transform:uppercase; opacity:.9;
      border-radius:6px; }
  .pc-court .sig{ position:absolute; left:128px; bottom:170px; width:340px; z-index:5;
      border-top:2px solid #141414; padding-top:8px; font-family:'Courier New',monospace; font-size:20px;
      color:#65615a; }
  .pc-court .mark{ right:120px; bottom:130px; color:#65615a; }

  /* ============================================================= 16) BLESSING THREAD
     Deep green woven texture, gold thread curve, poem along center, red knot near last line. */
  .pc-blessing{ background:#10201d; color:#fff4e8; }
  .pc-blessing .weave{ position:absolute; inset:0; z-index:1;
      background:repeating-linear-gradient(45deg, rgba(255,255,255,.035) 0 1px, transparent 1px 10px); }
  .pc-blessing .thread{ position:absolute; inset:0; z-index:2; pointer-events:none; }
  .pc-blessing .grain{ ${grain(0.9, 2, 8, 0.04)} mix-blend-mode:screen; }
  .pc-blessing .knot{ position:absolute; z-index:5; width:14px; height:14px; border-radius:50%;
      background:#b74432; box-shadow:0 0 0 4px rgba(183,68,50,.25); }
  .pc-blessing .stack{ left:130px; top:365px; width:820px; z-index:5; text-align:center; }
  .pc-blessing .pl{ font-weight:600; font-size:60px; line-height:1.78; color:#fff4e8; }
  .pc-blessing .pl.last{ font-weight:650; font-size:64px; line-height:1.65; color:#e0b85a; }
  .pc-blessing .mark{ left:0; right:0; bottom:70px; text-align:center; color:#b8c7c0; }
  

  /* ===== artist-fleet post templates (2026-07-09, master-reviewed) =====
     position:absolute (2026-07-25 sweep): this whole batch was authored against the
     1080x1350 card with left/top/right/bottom offsets, but — unlike every template
     ABOVE this line — never opted its children into positioned layout. BASE only makes
     .grain/.mark/.stack absolute, so every other part (.title/.rule/.q/.para/.pane/…)
     computed to position:static and its offsets were inert: parts collapsed into normal
     flow, stacking flush against the card's top-left edge (brand wordmarks sheared at
     y=0, body copy touching x=0, decorative rules/diagrams clipped off-canvas). Same
     defect and same fix already landed for .pc-receipt; this closes the other 26
     templates in the batch. Parent .pc is position:relative, so absolute resolves
     against the card itself. */
.pc-mechmargin{ background:#f7f3ea; color:#20211d; }
.pc-mechmargin .rule{ position:absolute; left:120px; top:150px; width:1px; height:1060px; background:#c7aa72; }
.pc-mechmargin .title{ position:absolute; left:170px; top:158px; width:760px; text-align:left; font-size:48px; line-height:1.22; font-weight:620; color:#20211d; }
.pc-mechmargin .stack{ left:170px; top:352px; width:700px; text-align:left; z-index:5; }
.pc-mechmargin .pl{ font-size:30px; line-height:1.55; font-weight:420; color:#3b3a33; margin-bottom:28px; }
.pc-mechmargin .pl.last{ font-weight:580; color:#20211d; }
.pc-mechmargin .diag{ position:absolute; left:660px; top:1040px; width:300px; height:170px; opacity:.18; }
.pc-mechmargin .mark{ left:170px; bottom:64px; font-size:20px; color:#8b8577; }

.pc-receipt{ background:#faf6ea; color:#242320; }
/* position:absolute (2026-07-25 fix): every offset child below declares top/bottom/left
   offsets, but this template never opted them into positioned layout the way every other
   .pc-* template does (cf. .pc-redacted / .pc-handnote). They computed to position:static,
   so the offsets were inert: the receipt collapsed into normal flow (brand labels clipped
   at y=0, red total rule floating mid-card, ~85% of the canvas empty). Parent .pc is
   already position:relative, so absolute here resolves against the 1080x1350 card. */
.pc-receipt .lbl{ position:absolute; top:96px; font-family:'Courier New',Courier,monospace; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:#8f887a; }
.pc-receipt .l1{ left:110px; width:500px; text-align:left; }
.pc-receipt .l2{ right:110px; width:400px; text-align:right; }
.pc-receipt .claim{ position:absolute; left:110px; top:280px; width:860px; text-align:left; z-index:5; }
.pc-receipt .claim .pl{ font-size:46px; line-height:1.7; font-weight:520; color:#242320; margin-bottom:18px; }
.pc-receipt .claim .pl.last{ display:none; }
.pc-receipt .totrule{ position:absolute; left:110px; bottom:300px; width:860px; height:2px; background:#b3402e; }
.pc-receipt .total{ position:absolute; left:110px; bottom:158px; width:860px; text-align:left; font-size:44px; line-height:1.6; font-weight:640; color:#242320; }
.pc-receipt .mark{ left:110px; bottom:70px; font-family:'Courier New',Courier,monospace; font-size:13px; letter-spacing:2px; color:#8f887a; }

.pc-dmprompt{ background:#fbf8f0; color:#26241f; }
.pc-dmprompt .q{ position:absolute; left:120px; top:470px; width:840px; text-align:center; font-size:48px; line-height:1.55; font-weight:500; color:#26241f; z-index:5; }
.pc-dmprompt .pen{ position:absolute; left:400px; top:800px; width:280px; height:3px; background:#8f6a4f; border-radius:3px; opacity:.85; transform:rotate(-0.6deg); }
.pc-dmprompt .cue{ position:absolute; left:120px; top:856px; width:840px; text-align:center; font-size:18px; letter-spacing:1px; color:#96907f; }
.pc-dmprompt .mark{ left:0; right:0; bottom:70px; width:1080px; text-align:center; font-size:19px; color:#a39d8d; }

.pc-softredline{ background:#fbf8f1; color:#232220; }
.pc-softredline .note{ position:absolute; left:150px; top:350px; width:600px; text-align:left; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; font-weight:560; color:#b8382c; }
.pc-softredline .redline{ position:absolute; left:150px; top:398px; width:2px; height:520px; background:#b8382c; opacity:.9; }
.pc-softredline .para{ position:absolute; left:210px; top:400px; width:730px; text-align:left; z-index:5; }
.pc-softredline .pl{ font-size:44px; line-height:1.55; font-weight:500; color:#232220; margin-bottom:10px; }
.pc-softredline .pl.last{ text-decoration:underline; text-decoration-color:#b8382c; text-decoration-thickness:3px; text-underline-offset:12px; }
.pc-softredline .mark{ left:210px; bottom:66px; font-size:20px; color:#8d877a; }

.pc-witnesspost{ background:#14110c; color:#efe9dc; }
.pc-witnesspost .pane{ position:absolute; left:-170px; bottom:-140px; width:560px; height:840px; background:linear-gradient(168deg, rgba(226,207,158,0.14) 0%, rgba(226,207,158,0.055) 52%, rgba(226,207,158,0) 100%); transform:skewX(-16deg); z-index:1; }
.pc-witnesspost .stack{ left:452px; top:196px; width:530px; z-index:5; }
.pc-witnesspost .pl{ font-size:46px; line-height:1.85; font-weight:480; color:#efe9dc; }
.pc-witnesspost .pl.last{ color:#e2cf9e; }
.pc-witnesspost .mark{ left:452px; bottom:86px; font-size:25px; color:#8d8371; z-index:5; }

.pc-diwanpost{ background:#f3ecda; color:#26211a; }
.pc-diwanpost .fr-outer{ position:absolute; left:42px; top:42px; width:994px; height:1264px; border:2px solid rgba(20,101,90,0.45); z-index:1; }
.pc-diwanpost .fr-inner{ position:absolute; left:56px; top:56px; width:966px; height:1236px; border:1px solid rgba(20,101,90,0.26); z-index:1; }
.pc-diwanpost .stack{ left:140px; top:388px; width:800px; text-align:center; z-index:5; }
.pc-diwanpost .pl{ font-size:46px; line-height:1.8; font-weight:500; color:#26211a; }
.pc-diwanpost .pl.last{ color:#14655a; }
.pc-diwanpost .mark{ left:140px; bottom:118px; width:800px; text-align:center; font-size:25px; color:#8a7f68; z-index:5; }

.pc-chikanpost{ background:#fbfaf5; color:#2b2925; }
.pc-chikanpost .stitch{ position:absolute; left:-28px; top:58px; width:540px; height:440px; z-index:1; }
.pc-chikanpost .stack{ left:150px; top:552px; width:770px; z-index:5; }
.pc-chikanpost .pl{ font-size:44px; line-height:1.9; font-weight:460; color:#2b2925; }
.pc-chikanpost .mark{ left:150px; bottom:104px; font-size:24px; color:#726d62; z-index:5; }
.pc-chikanpost .rule{ position:absolute; left:150px; bottom:84px; width:112px; height:1px; background:#d9d2bd; z-index:5; }

.pc-ittarpost{ background:radial-gradient(circle at 24% 88%, #2c2013 0%, #241a0f 58%); color:#e8d9bf; }
.pc-ittarpost .bottle{ position:absolute; left:88px; bottom:84px; width:210px; height:344px; z-index:2; }
.pc-ittarpost .stack{ left:428px; top:330px; width:560px; z-index:5; }
.pc-ittarpost .pl{ font-size:46px; line-height:1.8; font-weight:480; color:#e8d9bf; }
.pc-ittarpost .pl.last{ color:#c99552; }
.pc-ittarpost .mark{ left:428px; bottom:86px; font-size:25px; color:#93805e; z-index:5; }

.pc-takhtipost{ background-color:#52402e; color:#f2ead6; }
.pc-takhtipost .grain{ left:0; top:0; width:1080px; height:1350px; z-index:1;
  background:repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 176px, rgba(0,0,0,0.16) 176px, rgba(0,0,0,0.16) 179px, rgba(255,255,255,0.04) 179px, rgba(255,255,255,0.04) 181px); }
.pc-takhtipost .title{ position:absolute; left:120px; top:150px; width:840px; z-index:5;
  font-size:52px; line-height:1.4; font-weight:520; color:#f2ead6; }
.pc-takhtipost .bigu{ border-bottom:5px solid rgba(242,234,214,0.85); padding-bottom:5px; }
.pc-takhtipost .points{ position:absolute; left:120px; top:440px; width:840px; z-index:5; }
.pc-takhtipost .pl{ font-size:34px; line-height:1.7; font-weight:420; color:rgba(242,234,214,0.92); margin-bottom:26px; }
.pc-takhtipost .mark{ left:120px; bottom:78px; z-index:5; font-size:26px; letter-spacing:0.06em; color:rgba(242,234,214,0.5); }

.pc-telegrampost{ background:#f3e9cf; color:#241e16; }
.pc-telegrampost .perf{ position:absolute; left:0; top:0; width:1080px; height:34px; z-index:3;
  background-image:radial-gradient(circle at 27px 8px, #d9cba6 9px, rgba(0,0,0,0) 10px);
  background-size:54px 34px; background-repeat:repeat-x; }
.pc-telegrampost .fold{ position:absolute; right:0; top:0; width:360px; height:360px; z-index:2;
  background:linear-gradient(225deg, rgba(36,30,22,0.10), rgba(36,30,22,0) 55%); }
.pc-telegrampost .stamp{ position:absolute; right:104px; top:196px; z-index:6; transform:rotate(-6deg);
  border:3px solid #5a6b7d; color:#5a6b7d; padding:12px 26px;
  font-size:24px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; line-height:1; }
.pc-telegrampost .title{ position:absolute; left:120px; top:200px; width:560px; z-index:5;
  font-size:50px; line-height:1.35; font-weight:620; color:#241e16; }
.pc-telegrampost .points{ position:absolute; left:120px; top:500px; width:840px; z-index:5; }
.pc-telegrampost .pl{ font-size:33px; line-height:1.65; font-weight:450; color:#2b2418; margin-bottom:24px; }
.pc-telegrampost .ref{ position:absolute; left:120px; bottom:142px; width:840px; z-index:5;
  font-family:'Courier New', Courier, monospace; font-size:15px; line-height:1.6;
  letter-spacing:0.14em; text-transform:uppercase; color:#6b5f49; }
.pc-telegrampost .mark{ left:120px; bottom:76px; z-index:5; font-size:26px; color:#8a7c60; }

.pc-stepwellpost{ background:#e8ddc7; color:#3a3226; }
.pc-stepwellpost .step{ position:absolute; right:0; bottom:0; z-index:1; border-style:solid; border-color:transparent; border-width:0; }
.pc-stepwellpost .st1{ width:140px; height:110px; border-top:2px solid rgba(90,74,56,0.50); border-left:2px solid rgba(90,74,56,0.50); }
.pc-stepwellpost .st2{ width:220px; height:180px; border-top:2px solid rgba(90,74,56,0.38); border-left:2px solid rgba(90,74,56,0.38); }
.pc-stepwellpost .st3{ width:300px; height:250px; border-top:2px solid rgba(90,74,56,0.27); border-left:2px solid rgba(90,74,56,0.27); }
.pc-stepwellpost .st4{ width:380px; height:320px; border-top:2px solid rgba(90,74,56,0.17); border-left:2px solid rgba(90,74,56,0.17); }
.pc-stepwellpost .st5{ width:460px; height:390px; border-top:2px solid rgba(90,74,56,0.09); border-left:2px solid rgba(90,74,56,0.09); }
.pc-stepwellpost .title{ position:absolute; left:120px; top:170px; width:780px; z-index:5;
  font-size:50px; line-height:1.35; font-weight:560; color:#5a4a38; }
.pc-stepwellpost .big{ color:#7d5a38; }
.pc-stepwellpost .points{ position:absolute; left:120px; top:480px; width:800px; z-index:5; }
.pc-stepwellpost .pl{ font-size:32px; line-height:1.65; font-weight:440; color:#3a3226; margin-bottom:24px; }
.pc-stepwellpost .mark{ left:120px; bottom:80px; z-index:5; font-size:26px; color:#8d7c62; }

.pc-radifpost{ background:#dcdade; color:#2e2b35; }
.pc-radifpost .line{ position:absolute; left:120px; top:50%; transform:translateY(-56%); width:840px; z-index:5;
  text-align:center; font-size:56px; line-height:1.7; font-weight:500; color:#2e2b35; }
.pc-radifpost .echo{ color:#6f3760;
  text-shadow:0 14px 0 rgba(111,55,96,0.14), 0 28px 0 rgba(111,55,96,0.06); }
.pc-radifpost .rules{ position:absolute; right:88px; top:50%; transform:translateY(-50%); z-index:4; }
.pc-radifpost .rules i{ display:block; width:70px; height:3px; background:#2e2b35; margin:16px 0; }
.pc-radifpost .rules i:nth-child(1){ opacity:0.35; }
.pc-radifpost .rules i:nth-child(2){ opacity:0.20; }
.pc-radifpost .rules i:nth-child(3){ opacity:0.09; }
.pc-radifpost .mark{ left:0; bottom:80px; width:1080px; z-index:5;
  text-align:center; font-size:26px; letter-spacing:0.08em; color:#8b8794; }

/* sher-diptych — the charged gap */
.pc-diptych{ background:#f6f3ea; color:#201d18; }
.pc-diptych .kick{ position:absolute; left:132px; top:96px; font-size:22px; color:#8d867a; }
.pc-diptych .upper{ position:absolute; left:132px; top:210px; width:720px; }
.pc-diptych .upper .pl{ font-weight:500; font-size:52px; line-height:1.85; }
.pc-diptych .hush{ position:absolute; left:539px; top:635px; width:2px; height:115px; background:#c9c2b2; }
.pc-diptych .lower{ position:absolute; right:132px; bottom:300px; width:780px; text-align:right; }
.pc-diptych .lower .pl{ font-weight:600; font-size:56px; line-height:1.8; color:#8a2f1d; }
.pc-diptych .mark{ right:132px; bottom:88px; font-size:24px; color:#8d867a; }

/* lughat-card — dictionary page */
.pc-lughat{ background:#fbfaf4; color:#1b1916; }
.pc-lughat .guide{ position:absolute; left:110px; top:104px; font-size:22px; color:#a09a8c; }
.pc-lughat .pageno{ position:absolute; right:110px; top:104px; font-size:22px; color:#a09a8c; }
.pc-lughat .rule{ position:absolute; left:110px; top:152px; width:860px; height:1px; background:#1b1916; }
.pc-lughat .word{ position:absolute; left:110px; top:220px; width:860px; font-weight:700; font-size:116px; line-height:1.7; }
.pc-lughat .pron{ position:absolute; left:110px; top:462px; font-size:30px; line-height:1.7; color:#8d867a; }
.pc-lughat .defn{ position:absolute; left:110px; top:566px; width:800px; font-size:34px; line-height:1.8; color:#3a362f; }
.pc-lughat .defn .num{ color:#a09a8c; }
.pc-lughat .usage{ position:absolute; left:150px; top:772px; width:740px; border-left:2px solid #dcd6c6; padding-left:38px; }
.pc-lughat .ulabel{ font-size:22px; color:#a09a8c; margin-bottom:18px; }
.pc-lughat .pl{ font-size:32px; font-weight:500; line-height:1.85; color:#4a453c; }
.pc-lughat .pl.last{ color:#8a2f1d; }
.pc-lughat .mark{ left:110px; bottom:80px; font-size:24px; color:#a09a8c; }

/* ek-lafz-saans — the whisper word */
.pc-saansword{ background:#fcfbf7; color:#26231e; }
.pc-saansword .kick{ position:absolute; left:0; top:335px; width:1080px; text-align:center; font-size:22px; color:#b3ac9d; }
.pc-saansword .word{ position:absolute; left:60px; top:420px; width:960px; text-align:center; font-weight:300; font-size:205px; line-height:1.7; color:#57514a; }
.pc-saansword .under{ position:absolute; left:190px; top:846px; width:700px; text-align:center; font-weight:400; font-size:26px; line-height:1.9; color:#8d867a; }
.pc-saansword .mark{ left:0; bottom:84px; width:1080px; text-align:center; font-size:22px; color:#c4bdae; }

/* do-aawaazein — dialogue at dusk */
.pc-dialog{ background:#15171c; color:#e9e4d8; }
.pc-dialog .kick{ position:absolute; left:132px; top:110px; font-size:22px; color:#6d6a60; }
.pc-dialog .stage{ position:absolute; left:132px; top:300px; width:816px; }
.pc-dialog .pl{ font-weight:500; font-size:42px; line-height:1.8; margin-bottom:46px; max-width:640px; }
.pc-dialog .pl::before{ content:'— '; color:#6d6a60; }
.pc-dialog .pl:nth-child(even){ margin-left:176px; font-weight:400; color:#98917f; }
.pc-dialog .pl.last{ color:#e0a458; }
.pc-dialog .mark{ left:132px; bottom:88px; font-size:24px; color:#6d6a60; }

/* chitthi-post — unposted letter */
.pc-chitthi{ background:#f4eedd; color:#2a251c; }
.pc-chitthi .stamp{ position:absolute; right:110px; top:96px; width:150px; height:170px; border:2px dashed #b9b09a; font-size:20px; line-height:1.7; color:#a2987f; display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; }
.pc-chitthi .salut{ position:absolute; left:132px; top:300px; font-size:38px; font-weight:600; }
.pc-chitthi .body{ position:absolute; left:180px; top:430px; width:720px; }
.pc-chitthi .pl{ font-size:36px; font-weight:500; line-height:2.0; }
.pc-chitthi .pl.last{ color:#8a4a1f; }
.pc-chitthi .fold{ position:absolute; left:0; top:880px; width:1080px; height:1px; background:#e0d7c0; }
.pc-chitthi .sign{ position:absolute; right:132px; bottom:250px; text-align:right; font-size:28px; line-height:1.9; color:#5a5142; }
.pc-chitthi .ps{ position:absolute; left:132px; bottom:110px; width:816px; font-size:24px; line-height:1.8; color:#8d8471; }

/* silsila-dots — moments on a dotted road */
.pc-silsila{ background:#f8f6ef; color:#1e1b16; }
.pc-silsila .kick{ position:absolute; left:238px; top:130px; font-size:22px; color:#9a9384; }
.pc-silsila .stack{ left:238px; top:300px; width:700px; }
.pc-silsila .stack::before{ content:''; position:absolute; left:-58px; top:14px; bottom:0; border-left:2px dotted #b9b19d; }
.pc-silsila .pl{ position:relative; font-size:38px; font-weight:500; line-height:1.8; margin-bottom:54px; }
.pc-silsila .pl::before{ content:''; position:absolute; left:-66px; top:26px; width:14px; height:14px; border-radius:50%; background:#f8f6ef; border:2px solid #6b6455; }
.pc-silsila .pl.last{ color:#8a2f1d; font-weight:600; }
.pc-silsila .pl.last::before{ background:#8a2f1d; border-color:#8a2f1d; }
.pc-silsila .tail{ position:absolute; left:238px; bottom:190px; width:660px; font-size:24px; line-height:1.8; color:#9a9384; }
.pc-silsila .mark{ left:238px; bottom:96px; font-size:24px; color:#9a9384; }

/* qaus-post — life inside parentheses */
.pc-qaus{ background:#f7f5ee; color:#232019; }
.pc-qaus .qo{ position:absolute; left:64px; top:320px; font-size:560px; font-weight:100; line-height:1; color:#ddd6c4; }
.pc-qaus .qc{ position:absolute; right:64px; bottom:320px; font-size:560px; font-weight:100; line-height:1; color:#ddd6c4; }
.pc-qaus .kick{ position:absolute; left:0; top:120px; width:1080px; text-align:center; font-size:22px; color:#a29b8b; }
.pc-qaus .stack{ left:230px; top:0; width:620px; height:1350px; display:flex; flex-direction:column; justify-content:center; z-index:5; }
.pc-qaus .pl{ font-size:44px; font-weight:500; line-height:1.9; text-align:center; }
.pc-qaus .pl.last{ color:#8a2f1d; }
.pc-qaus .mark{ left:0; bottom:90px; width:1080px; text-align:center; font-size:22px; color:#a29b8b; }

/* ── sawaal-hawa : contemplative question card ─────────────── */
.pc-sawaal{ background:#f9f8f3; color:#1c1a16; }
.pc-sawaal .kick{ position:absolute; left:140px; top:150px; font-size:23px; letter-spacing:7px; text-transform:uppercase; color:#8d887c; }
.pc-sawaal .rule{ position:absolute; left:140px; top:222px; width:56px; height:5px; background:#bf4d20; }
.pc-sawaal .q{ position:absolute; left:140px; top:300px; width:660px; font-size:58px; line-height:1.6; font-weight:600; }
.pc-sawaal .cue{ position:absolute; left:140px; bottom:190px; width:660px; font-size:26px; line-height:1.6; font-style:italic; color:#8d887c; }
.pc-sawaal .cue .dot{ display:inline-block; width:12px; height:12px; border:2px solid #8d887c; border-radius:50%; margin-right:14px; vertical-align:middle; }
.pc-sawaal .mark{ right:140px; bottom:80px; font-size:24px; color:#a9a498; }

/* ── ek-abhyaas : soft checklist, one circle filled ────────── */
.pc-abhyas{ background:#f7f4ea; color:#211e18; }
.pc-abhyas .kick{ position:absolute; left:132px; top:140px; font-size:22px; letter-spacing:7px; text-transform:uppercase; color:#948e7e; }
.pc-abhyas .head{ position:absolute; left:132px; top:200px; width:780px; font-size:52px; font-weight:700; line-height:1.4; }
.pc-abhyas .list{ position:absolute; left:132px; top:410px; width:800px; }
.pc-abhyas .pl{ position:relative; padding-left:60px; font-size:40px; line-height:1.55; margin-bottom:46px; color:#2b271f; }
.pc-abhyas .pl::before{ content:""; position:absolute; left:0; top:12px; width:24px; height:24px; border:2.5px solid #a29a87; border-radius:50%; background:transparent; }
.pc-abhyas .pl:first-child::before{ background:#0f6b4f; border-color:#0f6b4f; }
.pc-abhyas .note{ position:absolute; left:132px; bottom:150px; width:740px; font-size:28px; line-height:1.6; font-style:italic; color:#948e7e; }
.pc-abhyas .mark{ right:132px; bottom:76px; font-size:24px; color:#aaa393; }

/* ── dehleez : threshold before/after ──────────────────────── */
.pc-dehleez{ background:#faf8f1; color:#191712; }
.pc-dehleez .wash{ position:absolute; left:0; top:0; width:1080px; height:568px; background:#ece7d9; }
.pc-dehleez .tag{ font-size:21px; letter-spacing:7px; text-transform:uppercase; color:#9a937f; }
.pc-dehleez .t1{ position:absolute; left:140px; top:120px; }
.pc-dehleez .t2{ position:absolute; left:140px; top:706px; }
.pc-dehleez .before{ position:absolute; left:140px; top:196px; width:700px; font-size:42px; line-height:1.6; color:#7d766a; }
.pc-dehleez .cross{ position:absolute; left:0; top:565px; width:1080px; height:6px; background:#b3401b; }
.pc-dehleez .xlabel{ position:absolute; left:140px; top:600px; width:800px; font-size:27px; font-weight:600; line-height:1.5; }
.pc-dehleez .after{ position:absolute; left:140px; top:766px; width:780px; }
.pc-dehleez .pl{ font-size:46px; line-height:1.7; margin-bottom:8px; }
.pc-dehleez .mark{ right:140px; bottom:72px; font-size:24px; color:#9a937f; }

/* ── tippani : studied text with margin annotations ────────── */
.pc-tippani{ background:#fbfaf5; color:#171511; }
.pc-tippani .claim{ position:absolute; left:120px; top:360px; width:600px; font-size:64px; line-height:1.5; font-weight:700; }
.pc-tippani .an{ font-size:24px; line-height:1.55; font-style:italic; color:#8b8574; }
.pc-tippani .a1{ position:absolute; left:770px; top:300px; width:220px; transform:rotate(-3deg); }
.pc-tippani .a2{ position:absolute; left:790px; top:650px; width:200px; transform:rotate(2deg); }
.pc-tippani .a3{ position:absolute; left:150px; top:880px; width:540px; transform:rotate(-1.5deg); color:#a04b18; }
.pc-tippani .ln{ height:2px; background:#c9c2b0; }
.pc-tippani .l1{ position:absolute; left:700px; top:340px; width:58px; transform:rotate(24deg); }
.pc-tippani .l2{ position:absolute; left:718px; top:668px; width:58px; transform:rotate(-18deg); }
.pc-tippani .mark{ right:120px; bottom:80px; font-size:24px; color:#a9a291; }

/* ── pravesh-ticket : side-perforated admit-one ticket ─────── */
.pc-pravesh{ background:#1a1712; color:#211c12; }
.pc-pravesh .paper{ position:absolute; left:40px; top:110px; width:1000px; height:1130px; background:#f5f0e2; }
.pc-pravesh .stub{ position:absolute; left:40px; top:110px; width:212px; height:1130px; background:#ede6d1; }
.pc-pravesh .admit{ position:absolute; left:88px; top:260px; height:820px; writing-mode:vertical-rl; transform:rotate(180deg); font-size:30px; letter-spacing:12px; font-weight:700; color:#b3541c; }
.pc-pravesh .serial{ position:absolute; left:158px; top:420px; height:520px; writing-mode:vertical-rl; transform:rotate(180deg); font-family:ui-monospace,Menlo,monospace; font-size:20px; letter-spacing:6px; color:#8a7f6a; }
.pc-pravesh .perf{ position:absolute; left:252px; top:110px; width:0; height:1130px; border-left:4px dotted #b7ad93; }
.pc-pravesh .notch{ width:44px; height:44px; border-radius:50%; background:#1a1712; }
.pc-pravesh .n1{ position:absolute; left:232px; top:88px; }
.pc-pravesh .n2{ position:absolute; left:232px; top:1218px; }
.pc-pravesh .kick{ position:absolute; left:320px; top:210px; width:640px; font-size:24px; letter-spacing:3px; line-height:1.5; color:#948a72; }
.pc-pravesh .big{ position:absolute; left:320px; top:320px; width:640px; font-size:56px; line-height:1.4; font-weight:800; }
.pc-pravesh .terms{ position:absolute; left:320px; top:640px; width:640px; }
.pc-pravesh .pl{ font-size:30px; line-height:1.65; margin-bottom:24px; color:#4a4436; }
.pc-pravesh .pl::before{ content:"— "; color:#948a72; }
.pc-pravesh .entry{ position:absolute; left:320px; bottom:220px; width:640px; font-size:34px; font-weight:600; line-height:1.5; }
.pc-pravesh .mark{ right:80px; bottom:56px; font-size:24px; color:#8d8570; }

/* ── teen-morh : 3-beat story separated by air ─────────────── */
.pc-morh{ background:#f9f8f2; color:#1b1914; }
.pc-morh .bno{ position:absolute; left:132px; font-family:ui-monospace,Menlo,monospace; font-size:22px; letter-spacing:8px; color:#a29b89; }
.pc-morh .b1{ position:absolute; top:130px; }
.pc-morh .b2{ position:absolute; top:470px; }
.pc-morh .b3{ position:absolute; top:920px; color:#b8431c; }
.pc-morh .beat{ position:absolute; left:132px; width:780px; }
.pc-morh .s1{ position:absolute; top:178px; font-size:38px; line-height:1.6; color:#7c7566; }
.pc-morh .s2{ position:absolute; top:518px; }
.pc-morh .pl{ font-size:42px; line-height:1.7; }
.pc-morh .s3{ position:absolute; top:968px; font-size:50px; line-height:1.5; font-weight:700; }
.pc-morh .mark{ right:132px; bottom:70px; font-size:24px; color:#a29b89; }

/* ── nishaan : bookmark ribbon on the line that stopped you ── */
.pc-nishaan{ background:#faf7ef; color:#201d16; }
.pc-nishaan .kick{ position:absolute; right:120px; top:110px; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#9d9683; }
.pc-nishaan .page{ position:absolute; left:210px; top:230px; width:730px; }
.pc-nishaan .pl{ font-size:40px; line-height:1.8; color:#57503f; }
.pc-nishaan .wash{ position:absolute; left:170px; top:676px; width:800px; height:190px; background:#f0e9d7; }
.pc-nishaan .ribbon{ position:absolute; left:96px; top:0; width:16px; height:800px; background:#8e2f14; clip-path:polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 22px), 0 100%); }
.pc-nishaan .markline{ position:absolute; left:210px; top:702px; width:720px; font-size:48px; line-height:1.5; font-weight:700; }
.pc-nishaan .why{ position:absolute; left:210px; top:920px; width:680px; font-size:27px; line-height:1.6; font-style:italic; color:#9d9683; }
.pc-nishaan .mark{ right:120px; bottom:80px; font-size:24px; color:#a8a18d; }

/* ── teeka : big claim, sermon in the footnote ─────────────── */
.pc-teeka{ background:#fbf9f3; color:#181510; }
.pc-teeka .claim{ position:absolute; left:130px; top:280px; width:800px; font-size:68px; line-height:1.45; font-weight:700; }
.pc-teeka .star{ color:#c04a17; font-size:44px; vertical-align:super; margin-left:8px; }
.pc-teeka .frule{ position:absolute; left:130px; top:880px; width:140px; height:2px; background:#c6bfad; }
.pc-teeka .fstar{ position:absolute; left:130px; top:914px; font-size:30px; color:#8f8875; }
.pc-teeka .foot{ position:absolute; left:172px; top:920px; width:740px; }
.pc-teeka .pl{ font-size:29px; line-height:1.65; margin-bottom:10px; color:#5b5443; }
.pc-teeka .flast{ position:absolute; left:172px; top:1130px; width:740px; font-size:30px; font-weight:600; line-height:1.5; }
.pc-teeka .mark{ right:130px; bottom:70px; font-size:24px; color:#a49d8b; }
`;

  // ---------- inline-SVG ornament builders ----------
  // small right-pointing arrow (redacted / hand-note)
  const arrowSVG = (c, w) => `<svg width="${w||70}" height="30" viewBox="0 0 70 30" fill="none">
      <path d="M2 15 H60 M48 5 L62 15 L48 25" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  // rough scratch underline (bold-word hero)
  const scratchSVG = c => `<svg width="560" height="24" viewBox="0 0 560 24" fill="none" preserveAspectRatio="none">
      <path d="M6 15 Q150 4 300 13 T554 11" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/></svg>`;
  // irregular red manuscript border (data-driven, drawn as inline svg)
  const msBorderSVG = c => `<svg width="1080" height="1350" viewBox="0 0 1080 1350" fill="none" preserveAspectRatio="none" style="opacity:.42">
      <path d="M54 60 Q60 55 120 58 T540 56 T960 58 Q1024 56 1026 120 T1024 675 T1026 1230 Q1024 1294 960 1292 T540 1294 T120 1292 Q56 1294 54 1230 T56 675 T54 60Z"
        stroke="${c}" stroke-width="2" fill="none"/></svg>`;
  // sacred-geometry mandala (scripture card)
  const geoSVG = c => `<svg width="720" height="720" viewBox="0 0 720 720" fill="none" stroke="${c}" stroke-width="1.2">
      <circle cx="360" cy="360" r="120"/><circle cx="360" cy="360" r="220"/><circle cx="360" cy="360" r="330"/>
      <path d="M360 30 L646 525 L74 525 Z"/><path d="M360 690 L74 195 L646 195 Z"/>
      <line x1="360" y1="30" x2="360" y2="690"/><line x1="30" y1="360" x2="690" y2="360"/></svg>`;
  // gold blessing thread — one flowing curve top-left -> bottom-right
  const threadSVG = c => `<svg width="1080" height="1350" viewBox="0 0 1080 1350" fill="none" preserveAspectRatio="none">
      <path d="M80 120 C 300 300, 200 560, 540 620 S 900 900, 950 1230" stroke="${c}" stroke-width="2"
        fill="none" opacity=".75" stroke-linecap="round"/></svg>`;

  // ---------- per-template HTML builders ----------
  const T = {
    'sher-black-altar': v => `
      <div class="glow"></div><div class="grain"></div>
      <div class="orn"><span class="hr"></span><span class="d deva">${DANDA}</span><span class="hr"></span></div>
      <div class="stack deva">${poemLines(v)}</div>
      <div class="mark">${H(v)}<span class="dot"></span></div>`,

    'sher-manuscript-margin': v => `
      <div class="rule"></div><div class="grain"></div>
      <div class="border">${msBorderSVG('#9c2f1d')}</div>
      <div class="tika"></div>
      <div class="rail"><i></i><i></i><i></i><i></i><i></i></div>
      ${v.kicker ? `<div class="note">${esc(v.kicker)}</div>` : ''}
      <div class="stack deva">${poemLines(v)}</div>
      ${v.ref ? `<div class="ref">${esc(v.ref)}</div>` : ''}
      <div class="mark">${H(v)}</div>`,

    'sher-riso-dual-ink': v => {
      const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
      let lines = raw.length ? raw.split('\n') : [];
      let last = (v.last != null && v.last !== '') ? esc(v.last) : (lines.length > 1 ? lines.pop() : null); // P0-4: only pop a genuine multi-line poem's closing line — a single flat sentence has no 'final line' to accent, so leave it as one plain body paragraph instead of mechanically highlighting its last word.
      const body = lines.map((l, i) =>
        `<div class="pl${i === 0 ? ' first' : ''}">${l ? pu(l) : '&nbsp;'}</div>`).join('');
      const tail = last != null ? `<div class="pl last"><span class="u">${last}</span></div>` : '';
      return `
      <div class="sun b"></div><div class="sun"></div><div class="halftone"></div><div class="grain"></div>
      <div class="issue">${esc(v.kicker || 'ISSUE 01')}</div>
      <div class="stack deva">${body}${tail}</div>
      <div class="mark">${H(v)}</div>`;
    },

    'sher-ink-wash': v => {
      const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
      let lines = raw.length ? raw.split('\n') : [];
      let last = (v.last != null && v.last !== '') ? esc(v.last) : (lines.length > 1 ? lines.pop() : null); // P0-4: only pop a genuine multi-line poem's closing line — a single flat sentence has no 'final line' to accent, so leave it as one plain body paragraph instead of mechanically highlighting its last word.
      // accent only the final TWO words of the resolving line
      let tail = '';
      if (last != null) {
        const parts = last.trim().split(/\s+/);
        if (parts.length > 2) {
          const head = parts.slice(0, -2).join(' ');
          const t2 = parts.slice(-2).join(' ');
          tail = `<div class="pl last">${head} <span class="t">${t2}</span></div>`;
        } else {
          tail = `<div class="pl last"><span class="t">${last}</span></div>`;
        }
      }
      const body = lines.map(l => `<div class="pl">${l ? pu(l) : '&nbsp;'}</div>`).join('');
      return `
      <div class="wash2"></div><div class="wash"></div><div class="drop"></div><div class="grain"></div>
      <div class="stack">${body}${tail}</div>
      <div class="mark">${H(v)}</div>`;
    },

    'sher-danda-column': v => `
      <div class="v1"></div><div class="v2"></div>
      <div class="bigd deva">${DANDA}</div>
      <div class="stack deva">${poemLines(v)}</div>
      <div class="date">${esc(v.kicker || 'DOALFAAZ')}</div>
      <div class="mark">${H(v)}</div>`,

    'mirror-white-room': v => {
      const l1 = pu(v.line1 || v.poem);
      return `
      <div class="floor"></div><div class="grain"></div>
      <div class="l1">${l1}</div>
      ${v.line2 ? `<div class="l2">${pu(v.line2)}</div>` : ''}
      <div class="mark">${H(v)}</div>`;
    },

    'mirror-redacted-truth': v => {
      // line1 = setup (a phrase to redact via <span class=r>), line2 = huge reveal, meaning = small exp
      const setup = pu(v.line1 || '');
      const reveal = pu(v.line2 || v.big || v.poem || '');
      return `
      <div class="grain"></div>
      <div class="chip">${esc(v.kicker || 'CASE NOTE')}</div>
      <div class="stack">
        ${setup ? `<div class="setup">${setup}</div>` : ''}
        ${reveal ? `<div class="reveal">${reveal}</div>` : ''}
      </div>
      <div class="arrow">${arrowSVG('#ef2020', 70)}</div>
      ${v.meaning ? `<div class="exp">${esc(v.meaning)}</div>` : ''}
      <div class="mark">${H(v)}</div>`;
    },

    'quote-broadsheet': v => {
      const isDeva = /[ऀ-ॿ]/.test(v.poem || '');
      const inner = isDeva ? poemBr(v) : `${pu(v.line1 || v.poem)}${v.line2 ? '<br>' + pu(v.line2) : ''}`;
      return `
      <div class="fold"></div><div class="halftone"></div>
      <div class="masthead"><span class="m">${esc(v.kicker || 'DOALFAAZ')}</span><span class="iss">${esc(v.ref || 'NO. 01')}</span></div>
      <div class="qmark">&ldquo;</div>
      <div class="quote${isDeva ? ' deva' : ''}"><div class="q${isDeva ? ' deva' : ''}">${inner}</div></div>
      <div class="attr">${H(v)}</div>
      <div class="mark">${H(v)}</div>`;
    },

    'scripture-margin-card': v => `
      <div class="geo">${geoSVG('#b76e33')}</div><div class="frame"></div>
      ${v.ref ? `<div class="ref">${esc(v.ref)}</div>` : ''}
      <div class="seal"></div>
      <div class="stack deva">${poemLines(v)}</div>
      <div class="copper"></div>
      ${v.meaning ? `<div class="meaning">${esc(v.meaning)}</div>` : ''}
      <div class="mark">${H(v)}</div>`,

    'gradient-poetry-horizon': v => `
      <div class="glow"></div><div class="hz"></div><div class="grain"></div>
      ${v.kicker ? `<div class="kick">${esc(v.kicker)}</div>` : ''}
      <div class="stack deva">${poemLines(v)}</div>
      <div class="mark">${H(v)}</div>`,

    'negative-space-breath': v => {
      const raw = (esc(v.poem) || esc(v.line1 || '')).replace(/\r/g, '');
      let lines = raw.length ? raw.split('\n') : [];
      let last = (v.last != null && v.last !== '') ? esc(v.last) : (lines.length > 1 ? lines.pop() : null); // P0-4: only pop a genuine multi-line poem's closing line — a single flat sentence has no 'final line' to accent, so leave it as one plain body paragraph instead of mechanically highlighting its last word.
      // no accent unless one FINAL word gets teal
      let tail = '';
      if (last != null) {
        const parts = last.trim().split(/\s+/);
        const head = parts.slice(0, -1).join(' ');
        const w = parts.slice(-1)[0];
        tail = `<div class="pl last">${head ? head + ' ' : ''}<span class="t">${w}</span></div>`;
      }
      const body = lines.map(l => `<div class="pl">${l ? pu(l) : '&nbsp;'}</div>`).join('');
      return `
      <div class="hz"></div><div class="dot"></div><div class="grain"></div>
      <div class="stack deva">${body}${tail}</div>
      <div class="mark">${H(v)}</div>`;
    },

    'torn-paper-sher': v => `
      <div class="slab"><div class="fiber"></div></div>
      <div class="tape"></div>
      <div class="stack deva">${poemLines(v)}</div>
      <div class="label">${esc(v.kicker || 'found note')}</div>
      <div class="mark">${H(v)}</div>`,

    'hand-note-sunday': v => {
      const l1 = pu(v.line1 || v.poem);
      return `
      <div class="page"><div class="margin"></div></div><div class="grain"></div>
      <div class="tp a"></div><div class="tp b"></div>
      <div class="stack">
        <div class="line">${l1}</div>
        <div class="arw">${arrowSVG('#b94b32', 84)}</div>
        ${v.big ? `<div class="accd deva">${esc(v.big)}</div>` : ''}
        ${v.line2 ? `<div class="note">${pu(v.line2)}</div>` : (v.meaning ? `<div class="note">${pu(v.meaning)}</div>` : '')}
      </div>
      <div class="mark">${H(v)}</div>`;
    },

    'bold-word-poem': v => {
      const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
      let lines = raw.length ? raw.split('\n') : [];
      let last = (v.last != null && v.last !== '') ? esc(v.last) : (lines.length > 1 ? lines.pop() : null); // P0-4: only pop a genuine multi-line poem's closing line — a single flat sentence has no 'final line' to accent, so leave it as one plain body paragraph instead of mechanically highlighting its last word.
      let tail = '';
      if (last != null) {
        const parts = last.trim().split(/\s+/);
        if (parts.length > 2) {
          const head = parts.slice(0, -2).join(' ');
          tail = `<div class="pl last">${head} <span class="t">${parts.slice(-2).join(' ')}</span></div>`;
        } else tail = `<div class="pl last"><span class="t">${last}</span></div>`;
      }
      const body = lines.map(l => `<div class="pl">${l ? pu(l) : '&nbsp;'}</div>`).join('');
      return `
      <div class="rg"></div><div class="grain"></div>
      <div class="big deva">${esc(v.big || 'मोह')}</div>
      <div class="scratch">${scratchSVG('#e32626')}</div>
      ${v.kicker ? `<div class="kick">${esc(v.kicker)}</div>` : ''}
      <div class="stack deva">${body}${tail}</div>
      <div class="seal"></div>
      <div class="mark">${H(v)}</div>`;
    },

    'court-order-mirror': v => {
      const verdict = pu(v.line1 || v.poem);
      return `
      <div class="sheet"></div><div class="grain"></div>
      <div class="caseno">${esc(v.ref || 'CASE NO. 001 / SELF v. SELF')}</div>
      <div class="head">${esc(v.kicker || 'ORDER OF THE COURT')}</div>
      <div class="verdict">${verdict}</div>
      ${v.line2 || v.meaning ? `<div class="body">${pu(v.line2 || v.meaning)}</div>` : ''}
      <div class="stamp">${esc(v.big || 'VERDICT')}</div>
      <div class="sig">${H(v)}</div>
      <div class="mark">${H(v)}</div>`;
    },

    'blessing-thread': v => {
      // place red knot near the resolving line (bottom of centered stack, right-ish)
      const raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
      const n = (raw.length ? raw.split('\n').length : 0) + (v.last ? 1 : 0);
      return `
      <div class="weave"></div><div class="thread">${threadSVG('#e0b85a')}</div><div class="grain"></div>
      <div class="stack deva">${poemLines(v)}</div>
      <div class="knot" style="left:735px;top:${335 + Math.max(1, n - 1) * 118 + 40}px"></div>
      <div class="mark">${H(v)}</div>`;
    },
  

    /* -- artist-fleet post templates (2026-07-09) -- */
    'mechanism-margin': v => `<div class="rule"></div><div class="title">${pu(v.line1 || v.big || '')}</div><div class="stack deva">${poemLines(v)}</div><svg class="diag" viewBox="0 0 300 170" xmlns="http://www.w3.org/2000/svg"><polyline points="10,150 92,150 92,88 178,88 178,30 290,30" fill="none" stroke="#2f5d52" stroke-width="2"/><circle cx="290" cy="30" r="5" fill="#2f5d52"/></svg><div class="mark">${H(v)}</div>`,

    'quiet-receipt': v => `<div class="lbl l1">${esc(v.kicker || '')}</div><div class="lbl l2">${esc(v.ref || '')}</div><div class="claim deva">${poemLines(v)}</div><div class="totrule"></div><div class="total deva">${esc(v.last || String(v.poem || '').trim().split('\n').pop() || '')}</div><div class="mark">${H(v)}</div>`,

    'quiet-dm-prompt': v => `<div class="q deva">${pu(v.line1 || (v.poem || '').split('\n')[0] || '')}</div><div class="pen"></div><div class="cue">${esc(v.kicker || 'reply with one word')}</div><div class="mark">${H(v)}</div>`,

    'soft-redline-truth': v => `<div class="note">${esc(v.kicker || '')}</div><div class="redline"></div><div class="para deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'witness-lamp-post': v => `<div class="pane"></div><div class="stack deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'diwan-frame-post': v => `<div class="fr-outer"></div><div class="fr-inner"></div><div class="stack deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'chikankari-post': v => `<svg class="stitch" viewBox="0 0 540 440" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M-24 312 C 110 190, 226 268, 306 148 C 366 60, 470 44, 556 92" stroke="#e9e4d6" stroke-width="3" stroke-dasharray="2 15" stroke-linecap="round"/><path d="M-24 308 C 110 186, 226 264, 306 144 C 366 56, 470 40, 556 88" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="2 15" stroke-linecap="round"/></svg><div class="stack deva">${poemLines(v)}</div><div class="mark">${H(v)}</div><div class="rule"></div>`,

    'ittar-post': v => `<svg class="bottle" viewBox="0 0 220 360" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="itr-fade" gradientUnits="userSpaceOnUse" x1="110" y1="196" x2="112" y2="10"><stop offset="0" stop-color="#c99552" stop-opacity="0.55"/><stop offset="1" stop-color="#c99552" stop-opacity="0"/></linearGradient></defs><g stroke="#c99552" stroke-opacity="0.55" stroke-width="1" stroke-linejoin="round"><path d="M96 216 L110 202 L124 216 L110 230 Z"/><path d="M103 230 L103 246 M117 230 L117 246"/><path d="M103 246 L72 268 L63 314 L80 344 L140 344 L157 314 L148 268 L117 246 Z"/><path d="M72 268 L148 268 M88 258 L78 316 M132 258 L142 316"/></g><path d="M110 196 C 132 152, 86 118, 112 72 C 128 44, 104 26, 114 10" stroke="url(#itr-fade)" stroke-width="1.2" stroke-linecap="round"/></svg><div class="stack deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'takhti-post': v => `<div class="grain"></div><div class="title">${pu(v.line1||'')} <span class="bigu">${esc(v.big||'')}</span></div><div class="points deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'telegram-post': v => `<div class="perf"></div><div class="fold"></div><div class="stamp">${esc(v.kicker||'RECEIVED')}</div><div class="title">${pu(v.line1||'')}</div><div class="points deva">${poemLines(v)}</div><div class="ref">${esc(v.ref||'')}</div><div class="mark">${H(v)}</div>`,

    'stepwell-post': v => `<div class="step st1"></div><div class="step st2"></div><div class="step st3"></div><div class="step st4"></div><div class="step st5"></div><div class="title">${pu(v.line1||'')}<br><span class="big">${esc(v.big||'')}</span></div><div class="points deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,

    'radif-post': v => `<div class="line deva">${(t=>{const w=t.trim().split(/\s+/);const l=w.pop()||'';return (w.length?esc(w.join(' '))+' ':'')+'<span class="echo">'+esc(l)+'</span>';})(v.line1||(v.poem||'').split('\n')[0]||'')}</div><div class="rules"><i></i><i></i><i></i></div><div class="mark">${H(v)}</div>`,
    'sher-diptych': v => `<div class="kick deva">${esc(v.kicker||'')}</div><div class="upper deva">${(v.poem||'').split('\n').slice(0,-1).map(l=>`<div class="pl">${esc(l)}</div>`).join('')}</div><div class="hush"></div><div class="lower deva"><div class="pl last">${esc((v.poem||'').split('\n').slice(-1)[0])}</div></div><div class="mark">${H(v)}</div>`,
    'lughat-card': v => `<div class="guide deva">${esc(v.big||'')}</div><div class="pageno deva">लुग़त</div><div class="rule"></div><div class="word deva">${esc(v.big||'')}</div><div class="pron deva">/ ${esc(v.kicker||'')} /</div><div class="defn deva"><span class="num">१.</span> ${esc(v.meaning||'')}</div><div class="usage deva"><div class="ulabel deva">प्रयोग —</div>${poemLines(v)}</div><div class="mark">${H(v)}</div>`,
    'ek-lafz-saans': v => `<div class="kick deva">${esc(v.kicker||'')}</div><div class="word deva">${esc(v.big||'')}</div><div class="under deva">${esc(v.meaning||'')}</div><div class="mark">${H(v)}</div>`,
    'do-aawaazein': v => `<div class="kick deva">${esc(v.kicker||'दो आवाज़ें')}</div><div class="stage deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,
    'chitthi-post': v => `<div class="stamp deva">${esc(v.ref||'')}</div><div class="salut deva">${esc(v.kicker||'')},</div><div class="body deva">${poemLines(v)}</div><div class="fold"></div><div class="sign deva">— तुम्हारा,<br>${H(v)}</div><div class="ps deva">पुनश्च — ${esc(v.meaning||'')}</div>`,
    'silsila-dots': v => `<div class="kick deva">${esc(v.kicker||'')}</div><div class="stack deva">${poemLines(v)}</div><div class="tail deva">${esc(v.meaning||'')}</div><div class="mark">${H(v)}</div>`,
    'qaus-post': v => `<div class="qo">(</div><div class="qc">)</div><div class="kick deva">${esc(v.kicker||'')}</div><div class="stack deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,
    'sawaal-hawa': v => `<div class="kick">${esc(v.kicker||'एक सवाल')}</div><div class="rule"></div><div class="q deva">${pu(v.line1||v.big||'')}</div><div class="cue"><span class="dot"></span>${esc(v.meaning||'जवाब मत दीजिए — दो मिनट इसके साथ बैठिए')}</div><div class="mark">${H(v)}</div>`,
    'ek-abhyaas': v => `<div class="kick">${esc(v.kicker||'अभ्यास')}</div><div class="head deva">${esc(v.big||v.line1||'')}</div><div class="list deva">${poemLines(v)}</div><div class="note">${esc(v.last||'आज सिर्फ़ पहला। बाक़ी अपने दिन ख़ुद चुन लेंगे।')}</div><div class="mark">${H(v)}</div>`,
    'dehleez': v => `<div class="wash"></div><div class="tag t1">पहले</div><div class="before deva">${esc(v.line1||'')}</div><div class="cross"></div><div class="xlabel deva">${esc(v.kicker||'दहलीज़')}</div><div class="tag t2">बाद</div><div class="after deva">${poemLines(v)}</div><div class="mark">${H(v)}</div>`,
    'tippani': v => `<div class="claim deva">${esc(v.big||v.line1||'')}</div><div class="ln l1"></div><div class="an a1">${esc(v.kicker||'यहीं रुकिए')}</div><div class="ln l2"></div><div class="an a2">${esc(v.ref||'पढ़ते वक़्त का नोट')}</div><div class="an a3">${esc(v.meaning||v.last||'')}</div><div class="mark">${H(v)}</div>`,
    'pravesh-ticket': v => `<div class="paper"></div><div class="stub"></div><div class="admit">प्रवेश · ADMIT ONE</div><div class="serial">${esc(v.ref||'TICKET NO. 001')}</div><div class="perf"></div><div class="notch n1"></div><div class="notch n2"></div><div class="kick">${esc(v.kicker||'सिर्फ़ एक आदमी के लिए')}</div><div class="big deva">${esc(v.big||v.line1||'')}</div><div class="terms deva">${poemLines(v)}</div><div class="entry deva">${esc(v.last||'')}</div><div class="mark">${H(v)}</div>`,
    'teen-morh': v => `<div class="bno b1">01</div><div class="beat s1 deva">${esc(v.line1||'')}</div><div class="bno b2">02</div><div class="beat s2 deva">${poemLines(v)}</div><div class="bno b3">03</div><div class="beat s3 deva">${esc(v.last||'')}</div><div class="mark">${H(v)}</div>`,
    'nishaan': v => `<div class="kick">${esc(v.kicker||'जिस लाइन पर रुकना पड़ा')}</div><div class="page deva">${poemLines(v)}</div><div class="wash"></div><div class="ribbon"></div><div class="markline deva">${esc(v.last||'')}</div><div class="why">${esc(v.meaning||'')}</div><div class="mark">${H(v)}</div>`,
    'teeka': v => `<div class="claim deva">${esc(v.big||v.line1||'')}<span class="star">*</span></div><div class="frule"></div><div class="fstar">*</div><div class="foot deva">${poemLines(v)}</div><div class="flast deva">${esc(v.last||'')}</div><div class="mark">${H(v)}</div>`,
  };

  const TEMPLATES = Object.keys(T);

  // explicit template-id -> css-class table (authoritative)
  const CLS = {
    'sher-black-altar': 'pc-altar',
    'sher-manuscript-margin': 'pc-manuscript',
    'sher-riso-dual-ink': 'pc-riso',
    'sher-ink-wash': 'pc-inkwash',
    'sher-danda-column': 'pc-danda',
    'mirror-white-room': 'pc-whiteroom',
    'mirror-redacted-truth': 'pc-redacted',
    'quote-broadsheet': 'pc-broadsheet',
    'scripture-margin-card': 'pc-scripture',
    'gradient-poetry-horizon': 'pc-horizon',
    'negative-space-breath': 'pc-breath',
    'torn-paper-sher': 'pc-torn',
    'hand-note-sunday': 'pc-handnote',
    'bold-word-poem': 'pc-boldword',
    'court-order-mirror': 'pc-court',
    'blessing-thread': 'pc-blessing',
    'mechanism-margin': 'pc-mechmargin',
    'quiet-receipt': 'pc-receipt',
    'quiet-dm-prompt': 'pc-dmprompt',
    'soft-redline-truth': 'pc-softredline',
    'witness-lamp-post': 'pc-witnesspost',
    'diwan-frame-post': 'pc-diwanpost',
    'chikankari-post': 'pc-chikanpost',
    'ittar-post': 'pc-ittarpost',
    'takhti-post': 'pc-takhtipost',
    'telegram-post': 'pc-telegrampost',
    'stepwell-post': 'pc-stepwellpost',
    'radif-post': 'pc-radifpost',
    'sher-diptych': 'pc-diptych',
    'lughat-card': 'pc-lughat',
    'ek-lafz-saans': 'pc-saansword',
    'do-aawaazein': 'pc-dialog',
    'chitthi-post': 'pc-chitthi',
    'silsila-dots': 'pc-silsila',
    'qaus-post': 'pc-qaus',
    'sawaal-hawa': 'pc-sawaal',
    'ek-abhyaas': 'pc-abhyas',
    'dehleez': 'pc-dehleez',
    'tippani': 'pc-tippani',
    'pravesh-ticket': 'pc-pravesh',
    'teen-morh': 'pc-morh',
    'nishaan': 'pc-nishaan',
    'teeka': 'pc-teeka',
  };

  function html(templateId, v) {
    v = v || {};
    const id = T[templateId] ? templateId : 'sher-black-altar';
    return `<div class="pc ${CLS[id]}">${T[id](v)}</div>`;
  }

  // ---------- TREATMENTS: B2 Devanagari display treatments ----------
  const TREATMENTS = {
    core_rules: [
      "Set shers as poems, not quotes: preserve intentional line breaks and leave breathing room above and below.",
      "Ideal sher length 3-5 lines. 6 lines -> 50-56px + quiet template. >6 lines -> split or caption.",
      "Do not letterspace full Devanagari lines. Normal tracking, optional word-spacing .02-.05em.",
      "Line-height >=1.55 for bold poster treatments, 1.7-1.95 for literary treatments.",
      "Accent the punch/resolving line (usually final). Never accent every line.",
      "Danda sparingly: one top ornament, OR one closing ॥, OR one side-column symbol. Not all three.",
      "Roman Hinglish only as a tiny kicker/date/caption seed; it must not compete with the sher."
    ],
    font_stacks: {
      default_poem: "Laila, Kohinoor Devanagari, Devanagari Sangam MN, serif",
      literary_slow: "Devanagari Sangam MN, Laila, Georgia, serif",
      clean_modern: "Kohinoor Devanagari, Laila, sans-serif",
      poster_heavy: "Laila, Kohinoor Devanagari, serif"
    },
    display_treatments: [
      {
        id: "altar-laila", use_for: "sacred dark sher",
        css: "font-family:Laila,Kohinoor Devanagari,serif;font-weight:600;font-size:72px;line-height:1.68;text-align:center;color:var(--ink)",
        accent: "last line color #d8a24a; add single ॥ above at 52px opacity .65"
      },
      {
        id: "sangam-literary", use_for: "soft grief or reflective poem",
        css: "font-family:Devanagari Sangam MN,Laila,serif;font-weight:500;font-size:56px;line-height:1.88;text-align:left;color:var(--ink)",
        accent: "one final word color #1f5d63; no frame"
      },
      {
        id: "kohinoor-clean", use_for: "minimal post or concept-led sher",
        css: "font-family:Kohinoor Devanagari,Laila,sans-serif;font-weight:700;font-size:68px;line-height:1.52;text-align:left;color:var(--ink)",
        accent: "thin underline under the concept word, not color on every line"
      },
      {
        id: "cutpaper-heavy", use_for: "bold youth poster",
        css: "font-family:Laila,Kohinoor Devanagari,serif;font-weight:800;font-size:84px;line-height:1.26;text-align:left;color:#111;text-shadow:5px 5px 0 var(--accent)",
        accent: "use only for 1 to 3 lines; never for delicate poems"
      },
      {
        id: "manuscript-margin", use_for: "Vedanta or scripture-adjacent sher",
        css: "font-family:Laila,Devanagari Sangam MN,serif;font-weight:600;font-size:62px;line-height:1.76;text-align:left;color:#21160f",
        accent: "final line #9c2f1d; add marginal red ticks aligned to each line"
      }
    ],
    ornament_rules: {
      danda: "Use ॥ as a visual pause. Size 42-92px depending template. Opacity .45-.8 unless it is the hero.",
      rules: "Hairlines 1-1.5px. Outside the poem block, not under every line.",
      dots: "1-3 dots max. Gold or red. Mark breath, not corners.",
      roman_kicker: "18-24px Poppins or Courier uppercase (INNER NOTE, SHER, DOALFAAZ). Under 22 chars."
    }
  };

  /* v357 typeset: full fit pass (shrink-only autosize + widow-kill) over a MOUNTED
   * PostCore poster. Runs post-layout, once per element.
   *
   * P0-2 root cause (owner-facing "type doesn't fit the box, both directions" — cards
   * overflowing AND cards leaving huge dead fields): this pass used to (a) SKIP any
   * element whose children carried an accent span (.t/.u — the templates' own
   * "highlight the punch word/line" markup) and (b) never target `.big`/`.stamp`/`.word`/
   * `.accd`/`.claim`/`.bigu` at all. Those are exactly the elements most likely to hold a
   * long line at a huge fixed design-size (bold-word-poem's `.big` ships at 178px with NO
   * shrink path) — so the ONE elements needing autofit most were the ones structurally
   * excluded from it, live-measured 2026-07-26: pc-blessing's `.pl.last` overflowed its
   * 820px line box by 164px at the 1080px canvas because it carries a `.t` accent span and
   * was silently skipped. fitElementKeepAccent (below) re-fits AND re-wraps whichever
   * accent child (`<b>` or `<span class="t"|"u">`) it finds, so shrinking never drops the
   * accent styling — nothing is excluded from autofit anymore. */
  function fitMounted(rootEl, context) {
    const DT = (typeof window !== 'undefined') && window.DoalfaazTypeset;
    if (!DT || !rootEl || !rootEl.querySelectorAll) return;
    const requestedFloor = Math.max(18, Number(context && context.minSize) || 18);
    requestAnimationFrame(() => {
      rootEl.querySelectorAll(
        '.pc .pl,.pc .l1,.pc .l2,.pc .q,.pc .title,.pc .verdict,.pc .setup,.pc .line,.pc .note,' +
        '.pc .big,.pc .stamp,.pc .word,.pc .accd,.pc .claim,.pc .bigu,.pc .total,.pc .head'
      ).forEach(el => {
        try {
          if (!el.clientWidth) return;
          // Library faces can be mounted after an earlier low-floor fit. Refit
          // only when the new surface asks for a stronger optical floor.
          if (el.__fitDone && Number(el.__fitFloor || 0) >= requestedFloor) return;
          el.__fitDone = 1;
          el.__fitFloor = requestedFloor;
          const fit = DT.fitElementKeepAccent || DT.fitElementKeepBold || DT.fitElement;
          let options = { minSize: 18 };
          if (el.matches('.pc-broadsheet .q')) options = { boxH: 720, minSize: 24 };
          else if (el.matches('.pc-mechmargin .title')) options = { boxH: 150, minSize: 22 };
          else if (el.matches('.pc-receipt .claim')) options = { boxH: 700, minSize: 22 };
          else if (el.matches('.pc-receipt .total')) options = { boxH: 150, minSize: 20 };
          else if (el.matches('.pc-whiteroom .l1')) options = { boxH: 300, minSize: 22 };
          else if (el.matches('.pc-whiteroom .l2')) options = { boxH: 260, minSize: 18 };
          else if (el.matches('.pc-sawaal .q')) options = { boxH: 560, minSize: 22 };
          // A shelf optical floor belongs to the authored message, never to
          // micro-copy such as a kicker, annotation, or decorative stamp.
          // Enlarging `.pc-softredline .note` to 48px made its three-line FAQ
          // label collide with the actual post. Fit those labels normally and
          // reserve the stronger floor for the readable publishing content.
          const isMicrocopy = el.matches('.pc .note,.pc .stamp');
          options.minSize = isMicrocopy
            ? (options.minSize || 18)
            : Math.max(options.minSize || 18, requestedFloor);
          fit(el, options);   // maxSize = computed size → only ever shrinks
          if (requestedFloor > 18 && !isMicrocopy) {
            const paintedSize = parseFloat(getComputedStyle(el).fontSize) || 0;
            if (paintedSize < requestedFloor) el.style.fontSize = requestedFloor + 'px';
          }
        } catch (e) {}
      });
    });
  }
  return { BASE, TEMPLATES, html, TREATMENTS, fitMounted };
}));

/* source: doalfaaz-v357-typeset-js */
/* ================================================================
 * doalfaaz_typeset — phrase-aware poetry line breaking + fitting (P-TYPE, v357)
 * Per D3_TYPOGRAPHY_FIX.md. UMD-ish, no deps. window.DoalfaazTypeset
 * Law: break where the breath breaks (— , । ? ! ; :), never mid-phrase;
 *      glue words never end a line; no single-word widows; font autosizes (shrink-only).
 * Render-only: never write typeset output back to any store.
 * ================================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DoalfaazTypeset = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Words that must NOT end a rendered line (bind to what follows).
  // Roman Hinglish particles/genitives/postpositions + Devanagari mirrors.
  const GLUE = new Set([
    'aur','par','ki','ke','ka','to','hi','bhi','ya','na','se','ko','me','mein',
    'और','पर','कि','की','के','का','तो','ही','भी','या','ना','न','से','को','में'
  ]);
  // Unit-closing sense punctuation, kept attached to the LEFT word.
  // NOTE: this rule OUTRANKS the glue rule — "pattern ka —" MAY end a line
  // because the dash closes the breath even though "ka" is a glue word.
  const SENSE_END = /[—–,।?!;:.](['"’”)»]*)$/;
  const DASH_ONLY = /^[—–-]+$/;
  const NBSP = ' ';

  const words = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const bare  = w => w.replace(/[^\p{L}\p{N}ऀ-ॿ]+/gu, '').toLowerCase();
  // May this word legally end a line? Punctuation boundary outranks glue.
  const canEndLine = w => SENSE_END.test(w) || !GLUE.has(bare(w));

  /* ---- 1) tokenize(text) -> phrase units --------------------------- */
  function tokenize(text) {
    const ws = words(text), units = []; let cur = [];
    for (const w of ws) {
      if (DASH_ONLY.test(w) && cur.length) {          // standalone "—" binds LEFT…
        cur[cur.length - 1] += NBSP + w;              // …with a no-break space
        units.push(cur.join(' ')); cur = [];          // …and closes the breath
        continue;
      }
      cur.push(w);
      if (SENSE_END.test(w)) { units.push(cur.join(' ')); cur = []; }
    }
    if (cur.length) units.push(cur.join(' '));
    return units;
  }

  /* ---- soft-split ONE over-long unit at a legal space --------------
   * Prefer the LATEST cut whose left part fits (fullest first line),
   * never cut after a glue word, never leave a <2-word remainder.   */
  function softSplit(unit, fitsW) {
    const ws = unit.split(' ');
    if (ws.length < 3) return null;
    for (let cut = ws.length - 2; cut >= 1; cut--) {
      if (ws.length - cut < 2) continue;             // remainder >= 2 words
      if (!canEndLine(ws[cut - 1])) continue;        // no dangling glue word
      const left = ws.slice(0, cut).join(' ');
      if (fitsW(left)) return [left, ws.slice(cut).join(' ')];
    }
    // desperate: no legal fitting cut (caller retries smaller font)
    return null;
  }

  /* ---- balance: move whole units to minimize width variance --------
   * Line count is already fixed; only shifts a line's LAST unit down. */
  function balance(lineUnits, mw) {
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (let i = 0; i + 1 < lineUnits.length; i++) {
        const a = lineUnits[i], b = lineUnits[i + 1];
        if (a.length < 2) continue;
        const u = a[a.length - 1];
        const wa = mw(a.join(' ')), wb = mw(b.join(' '));
        const na = mw(a.slice(0, -1).join(' ')), nb = mw([u].concat(b).join(' '));
        // only if it reduces raggedness and the receiving line still fits
        if (nb <= mw.boxW && (Math.abs(na - nb) < Math.abs(wa - wb))) {
          a.pop(); b.unshift(u); moved = true;
        }
      }
      if (!moved) break;
    }
  }

  /* ---- 2) fit(unitsOrText, opts) -> { fontSize, lines[] } ----------
   * opts: { boxW, boxH, maxSize, minSize, step, lineHeight, measure }
   * measure(text, sizePx) -> width px  (canvas or DOM — caller supplies) */
  function fit(unitsOrText, opts) {
    const boxW = opts.boxW, boxH = opts.boxH || Infinity;
    const lh = opts.lineHeight || 1.6, step = opts.step || 2;
    const maxSize = opts.maxSize;
    const minSize = opts.minSize || Math.max(16, Math.round(maxSize * 0.55));
    const baseUnits = Array.isArray(unitsOrText) ? unitsOrText.slice() : tokenize(unitsOrText);
    if (!baseUnits.length) return { fontSize: maxSize, lines: [] };
    let fallback = null;

    for (let size = maxSize; size >= minSize; size -= step) {
      const mw = t => opts.measure(t, size); mw.boxW = boxW;
      const fitsW = t => mw(t) <= boxW;

      // resolve over-long units by recursive legal soft-splits
      let units = [], ok = true;
      for (const u of baseUnits) {
        const queue = [u];
        while (queue.length) {
          const q = queue.shift();
          if (fitsW(q)) { units.push(q); continue; }
          const sp = softSplit(q, fitsW);
          if (!sp) { ok = false; break; }
          units.push(sp[0]); queue.unshift(sp[1]);
        }
        if (!ok) break;
      }
      if (!ok) { if (!fallback) fallback = greedy(baseUnits, mw, size); continue; }

      // greedy pack of WHOLE units into lines
      const lineUnits = []; let cur = [];
      for (const u of units) {
        const t = cur.concat(u).join(' ');
        if (cur.length && !fitsW(t)) { lineUnits.push(cur); cur = [u]; }
        else cur.push(u);
      }
      if (cur.length) lineUnits.push(cur);

      // no-widow: last line >= 2 words (merge-up / pull-down / smaller font)
      if (lineUnits.length > 1) {
        const lastLine = lineUnits[lineUnits.length - 1].join(' ').split(' ');
        if (lastLine.length < 2) {
          const prev = lineUnits[lineUnits.length - 2];
          const pw = prev.join(' ').split(' ');
          if (pw.length >= 3 && canEndLine(pw[pw.length - 2]) &&
              fitsW(pw[pw.length - 1] + ' ' + lastLine.join(' '))) {
            // pull one word down (kept legal by canEndLine on the new prev tail)
            const donor = pw.pop();
            lineUnits[lineUnits.length - 2] = [pw.join(' ')];
            lineUnits[lineUnits.length - 1] = [donor + ' ' + lastLine.join(' ')];
          } else if (fitsW(prev.join(' ') + ' ' + lastLine.join(' '))) {
            lineUnits[lineUnits.length - 2] = prev.concat(lineUnits.pop());
          } else continue;                              // -> smaller font
        }
      }

      if (lineUnits.length * size * lh > boxH) continue; // too tall -> smaller font

      balance(lineUnits, mw);
      return { fontSize: size, lines: lineUnits.map(l => l.join(' ')) };
    }
    // hard floor: min size, plain greedy (still never splits inside a word)
    if (!fallback) {
      const mw = t => opts.measure(t, minSize); mw.boxW = boxW;
      fallback = greedy(baseUnits, mw, minSize);
    }
    return fallback;
  }

  function greedy(units, mw, size) {
    const lines = []; let cur = '';
    for (const w of units.join(' ').split(' ')) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && mw(t) > mw.boxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return { fontSize: size, lines };
  }

  /* ---- measurers ---------------------------------------------------- */
  // DOM: shaped exactly like the target element (Devanagari-correct).
  function domMeasurer(el) {
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;' +
      'font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight +
      ';font-style:' + cs.fontStyle + ';letter-spacing:' + cs.letterSpacing +
      ';word-spacing:' + cs.wordSpacing + ';text-transform:' + cs.textTransform + ';';
    (el.ownerDocument.body || el.ownerDocument.documentElement).appendChild(probe);
    const cache = new Map();
    const fn = (t, size) => {
      const k = size + '|' + t; if (cache.has(k)) return cache.get(k);
      probe.style.fontSize = size + 'px'; probe.textContent = t;
      const w = probe.getBoundingClientRect().width; cache.set(k, w); return w;
    };
    fn.dispose = () => probe.remove();
    return fn;
  }
  // Canvas (export path): fontTemplate e.g. '520 {SIZE}px "Noto Sans Devanagari"'
  function canvasMeasurer(ctx, fontTemplate) {
    return (t, size) => { ctx.font = fontTemplate.replace('{SIZE}', String(size)); return ctx.measureText(t).width; };
  }

  /* ---- fitElement: one-call DOM integration -------------------------
   * Re-breaks + autosizes an already-rendered text element in place.
   * Respects authored line breaks (<br> / \n): each authored line is
   * fitted separately so a sher's own structure is never merged.      */
  const escHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function fitElement(el, o) {
    o = o || {};
    const cs = getComputedStyle(el);
    const maxSize = o.maxSize || parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) ? parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) : 1.6;
    const boxW = o.boxW || el.clientWidth;
    const boxH = o.boxH || Infinity;
    if (!boxW || !maxSize) return null;
    const authored = el.innerHTML.split(/<br\s*\/?>/i).map(h => {
      const d = el.ownerDocument.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    if (!authored.length) return null;
    const measure = domMeasurer(el);
    try {
      // find one font size that fits ALL authored lines, then emit each line's breaks
      const minSize = o.minSize || Math.max(16, Math.round(maxSize * 0.55));
      // A browsing surface may request a stronger optical floor than the
      // element's fallback computed size. Starting below that floor made the
      // loop skip entirely (16px max vs 48px floor), leaving shelf cards
      // technically hydrated but visually blank. Begin at the usable floor;
      // the fitting pass can still shrink down to it, never below it.
      let size = Math.max(maxSize, minSize), results = null;
      for (; size >= minSize; size -= (o.step || 2)) {
        results = authored.map(t => fit(t, { boxW, boxH: Infinity, maxSize: size, minSize: size, lineHeight: lh, measure }));
        const totalLines = results.reduce((n, r) => n + r.lines.length, 0);
        const allLines = results.flatMap(r => r.lines);
        const widest = allLines.length ? Math.max.apply(null, allLines.map(l => measure(l, size))) : 0;
        if (widest <= boxW && totalLines * size * lh <= boxH) break;
      }
      if (!results) return null;
      if (size < minSize) size = minSize;
      el.style.fontSize = size + 'px';
      const lines = results.flatMap(r => r.lines);
      el.innerHTML = lines.map(escHtml).join('<br>');
      return { fontSize: size, lines };
    } finally { measure.dispose(); }
  }

  /* ---- fitElementKeepBold: fitElement + re-apply the <b> accent -----
   * CarouselCore's emph()/emphPoem() bold the "punch"; fitElement emits
   * plain text, so re-wrap the punch substring across the new lines.  */
  function fitElementKeepBold(el, o) {
    const b = el.querySelector && el.querySelector('b');
    const boldText = b ? String(b.textContent).replace(/\s+/g, ' ').trim() : '';
    const r = fitElement(el, o);
    if (!r || !boldText) return r;
    const normalize = s => s.replace(/ /g, ' ');
    const target = normalize(boldText);
    const joined = r.lines.map(normalize).join(' ');
    const start = joined.indexOf(target);
    if (start < 0) return r;                    // punch not found verbatim — leave unbolded
    const end = start + target.length;
    let off = 0;
    el.innerHTML = r.lines.map(ln => {
      const s = off, e = off + ln.length; off = e + 1;
      if (e <= start || s >= end) return escHtml(ln);
      const a = Math.max(start - s, 0), z = Math.min(end - s, ln.length);
      return escHtml(ln.slice(0, a)) + '<b>' + escHtml(ln.slice(a, z)) + '</b>' + escHtml(ln.slice(z));
    }).join('<br>');
    return r;
  }

  /* ---- senseWrapHTML: cheap CSS-only stage (no measurement) ---------
   * Wrap each phrase unit in a no-break span; browser may then ONLY
   * break between units. Use where a JS pass can't run (string-built HTML).
   * Requires CSS:  .pu{ white-space:nowrap }                            */
  function senseWrapHTML(text, escFn) {
    const e = escFn || escHtml;
    return tokenize(text).map(u => '<span class="pu">' + e(u) + '</span>').join(' ');
  }

  /* ---- fitElementKeepAccent: fitElementKeepBold, generalized to PostCore's own
   * accent markup -----------------------------------------------------
   * PostCore templates mark their "punch" with <b> in some places and with
   * <span class="t"> / <span class="u"> in others (bold-word-poem, negative-space-breath,
   * sher-ink-wash, …). fitElementKeepBold only ever looked for a literal <b>, so shrinking
   * any element whose accent was a `.t`/`.u` span had no bold-safe path — which is why
   * fitMounted excluded them entirely (see fitMounted's comment). This finds whichever
   * accent child is present (first match wins — templates use exactly one kind per
   * element) and re-wraps the SAME tag/class across the refitted lines, so shrink-to-fit
   * never silently drops the design's own emphasis. */
  function fitElementKeepAccent(el, o) {
    const accentEl = el.querySelector && el.querySelector('b, span.t, span.u');
    const accentText = accentEl ? String(accentEl.textContent).replace(/\s+/g, ' ').trim() : '';
    const accentTag = accentEl ? accentEl.tagName.toLowerCase() : 'b';
    const accentClass = accentEl && accentTag === 'span' ? accentEl.className : '';
    const r = fitElement(el, o);
    if (!r || !accentText) return r;
    const normalize = s => s.replace(/ /g, ' ');
    const target = normalize(accentText);
    const joined = r.lines.map(normalize).join(' ');
    const start = joined.indexOf(target);
    if (start < 0) return r;                    // accent text not found verbatim — leave unaccented
    const end = start + target.length;
    const openTag = accentTag === 'span' ? `<span class="${accentClass}">` : `<${accentTag}>`;
    const closeTag = accentTag === 'span' ? '</span>' : `</${accentTag}>`;
    let off = 0;
    el.innerHTML = r.lines.map(ln => {
      const s = off, e = off + ln.length; off = e + 1;
      if (e <= start || s >= end) return escHtml(ln);
      const a = Math.max(start - s, 0), z = Math.min(end - s, ln.length);
      return escHtml(ln.slice(0, a)) + openTag + escHtml(ln.slice(a, z)) + closeTag + escHtml(ln.slice(z));
    }).join('<br>');
    return r;
  }

  return { tokenize, fit, fitElement, fitElementKeepBold, fitElementKeepAccent, senseWrapHTML, domMeasurer, canvasMeasurer, GLUE };
}));
window.__DOALFAAZ_V357_TYPESET__ = { version: 'v357-ptype', law: 'break_where_the_breath_breaks' };

/* source: doalfaaz-v381-atelier-batch1-js */
'use strict';
/* v381 atelier batch1 — runtime-merge of frag_offer.cjs + frag_announce.cjs (2026-07-10).
   ADDITIVE ONLY: registers new looks/pal/groups into window.CarouselCore and new
   single-card templates into window.PostCore via a wrapping html(). The protected
   LOOKS / PAL / T literals are never edited. Last-wins, idempotent. */
(function () {
  var esc = function (s) { return (s == null ? '' : String(s)); };
  var H = function (v) { return (v && v.handle) ? esc(v.handle) : '@doalfaaz'; };
  /* pu = IDENTITY here (matches the node-side bake the ADES proofs were graded on).
     Live DoalfaazTypeset senseWrapHTML returns whole sentences as single .pu nowrap
     units for these fragments' long turn-lines -> card overflow; fitMounted skips
     them (non-pu child spans). The fragments were designed + proofed with identity. */
  var pu = esc;
  function poemLines(v, cls) {
    cls = cls || 'pl';
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (!lines.length && v.big) lines = [esc(v.big)];
    var last = (v.last != null && v.last !== '') ? esc(v.last) : null;
    if (last == null && lines.length > 1) { last = lines.pop(); }         // P0-4: never pop a single flat sentence as if it were a poem's final line — that's how a mechanical accent lands on a random trailing word instead of a deliberate poem-closing line.
    var body = lines.map(function (l) { return '<div class="' + cls + '">' + (l ? pu(l) : '&nbsp;') + '</div>'; }).join('');
    var tail = last != null ? '<div class="' + cls + ' last">' + pu(last) + '</div>' : '';
    return body + tail;
  }
  var poemBr = function (v) {
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (v.last != null && v.last !== '') lines.push(esc(v.last));
    return lines.map(function (l, i, a) { return i === a.length - 1 ? '<span class="last">' + pu(l) + '</span>' : pu(l); }).join('<br>');
  };
  var DANDA = '\u0965';

  var LOOKS = {}, PAL = {}, GROUP = {};
  LOOKS["sankalpPatra"] = { name: "Sankalp Patra", chip: "#9d2b1e", bg: "#f6f1e4", arrow: "#9d2b1e",
    graphic: `<div style="position:absolute;inset:0;">
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <filter id="sankpGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="47"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 0 0.08 0 0 0 0.05 0"/></filter>
        <rect width="1080" height="1350" filter="url(#sankpGrain)"/>
        <filter id="sankpLaid"><feTurbulence type="turbulence" baseFrequency="0.002 0.09" numOctaves="1" seed="9"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.16 0 0 0 0.035 0"/></filter>
        <rect width="1080" height="1350" filter="url(#sankpLaid)"/>
        <rect x="34" y="34" width="1012" height="1282" fill="none" stroke="#c9bb9c" stroke-width="1.4"/>
        <rect x="42" y="42" width="996" height="1266" fill="none" stroke="#c9bb9c" stroke-width="0.6" opacity=".7"/>
      </svg>
      <svg style="position:absolute;top:158px;right:88px;width:150px;height:150px;" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <circle cx="75" cy="75" r="66" fill="none" stroke="#9d2b1e" stroke-width="1.6" stroke-dasharray="3.5 5" opacity=".85"/>
        <circle cx="75" cy="75" r="52" fill="none" stroke="#9d2b1e" stroke-width="1" opacity=".55"/>
        <text x="75" y="92" text-anchor="middle" font-family="Laila" font-size="46" fill="#9d2b1e" opacity=".9">संकल्प</text>
      </svg>
    </div>`,
    css: `
    .slide{ background:#f6f1e4; color:#28211a; }
    .kickline .rule{ width:56px; height:1px; background:#9d2b1e; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#9d2b1e; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:68px; line-height:1.5; color:#28211a; letter-spacing:.2px; max-width:840px; }
    .hook b{ color:#9d2b1e; font-weight:600; }
    .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#7a6f5c; margin-top:40px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:45px; line-height:1.62; color:#443b2e; border-top:2px solid #28211a; padding-top:42px; }
    .body b{ color:#9d2b1e; font-weight:600; }
    .body .num{ font-family:'Poppins'; font-weight:600; font-size:29px; color:#8a6a34; letter-spacing:3px; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:62px; line-height:1.62; color:#28211a; border-top:1px solid #d9cdb4; border-bottom:1px solid #d9cdb4; padding:44px 4px; }
    .poem b{ color:#9d2b1e; font-weight:600; }
    .bubble{ background:#fffdf6; border:1px solid #d9cdb4; border-top:2px solid #28211a; padding:56px 54px 60px; box-shadow:0 2px 0 rgba(40,33,26,.05); }
    .bubble .body{ border-top:none; padding-top:0; font-size:44px; color:#3a3226; }
    .kicker{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:3px; text-transform:uppercase; color:#8a6a34; margin-top:34px; }
    .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.66; color:#4a4234; text-align:center; }
    .profile b{ color:#9d2b1e; font-weight:600; }
    .brand{ color:#7a6f5c; } .pageno{ color:#7a6f5c; }` };
  LOOKS["munaadi"] = { name: "Munaadi", chip: "#c03a2b", bg: "#f2e8d0", arrow: "#1d1a14",
    graphic: `<div style="position:absolute;inset:0;">
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <filter id="mndGrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="12"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.2 0 0 0 0 0.15 0 0 0 0 0.06 0 0 0 0.05 0"/></filter>
        <rect width="1080" height="1350" filter="url(#mndGrain)"/>
        <g><path d="M 931.6 286.1 A 77.9 77.9 0 1 1 931.5 133.9" fill="none" stroke="#c03a2b" stroke-width="2.60" opacity="0.34"/>
<path d="M 886.6 351.4 A 144.2 144.2 0 1 1 1012.1 103.4" fill="none" stroke="#77694c" stroke-width="2.47" opacity="0.32" stroke-dasharray="7 18"/>
<path d="M 944.7 423.5 A 215.5 215.5 0 0 1 818.1 17.5" fill="none" stroke="#77694c" stroke-width="2.34" opacity="0.30"/>
<path d="M 963.3 474.0 A 268.4 268.4 0 0 1 752.4 -3.5" fill="none" stroke="#77694c" stroke-width="2.21" opacity="0.28" stroke-dasharray="16 25"/>
<path d="M 922.4 560.6 A 350.7 350.7 0 0 1 738.6 -93.1" fill="none" stroke="#c03a2b" stroke-width="2.08" opacity="0.26"/>
<path d="M 938.5 627.6 A 418.2 418.2 0 1 1 917.4 -208.2" fill="none" stroke="#77694c" stroke-width="1.95" opacity="0.24" stroke-dasharray="8 9"/>
<path d="M 976.0 678.9 A 472.9 472.9 0 0 1 712.4 -217.3" fill="none" stroke="#77694c" stroke-width="1.82" opacity="0.22" stroke-dasharray="15 24"/>
<path d="M 915.3 750.0 A 540.0 540.0 0 1 1 1200.4 -248.4" fill="none" stroke="#77694c" stroke-width="1.69" opacity="0.20"/>
<path d="M 1040.2 820.0 A 622.7 622.7 0 1 1 1329.5 -254.7" fill="none" stroke="#c03a2b" stroke-width="1.56" opacity="0.18" stroke-dasharray="11 9"/>
<path d="M 1064.3 882.6 A 689.0 689.0 0 0 1 226.1 198.2" fill="none" stroke="#77694c" stroke-width="1.43" opacity="0.16"/>
<path d="M 911.0 965.0 A 755.0 755.0 0 1 1 1440.9 -331.7" fill="none" stroke="#77694c" stroke-width="1.30" opacity="0.14" stroke-dasharray="21 13"/>
<path d="M 774.2 1007.6 A 810.0 810.0 0 0 1 750.7 -583.2" fill="none" stroke="#77694c" stroke-width="1.17" opacity="0.12"/>
<path d="M 797.3 1088.5 A 886.3 886.3 0 0 1 360.9 -481.7" fill="none" stroke="#c03a2b" stroke-width="1.04" opacity="0.10" stroke-dasharray="17 20"/>
<path d="M 901.9 1163.3 A 953.4 953.4 0 1 1 1601.4 -451.8" fill="none" stroke="#77694c" stroke-width="0.91" opacity="0.08" stroke-dasharray="21 12"/>
<circle cx="704.2" cy="220.8" r="1.3" fill="#77694c" opacity="0.32"/>
<circle cx="609.6" cy="96.8" r="1.3" fill="#77694c" opacity="0.15"/>
<circle cx="363.2" cy="301.8" r="1.6" fill="#77694c" opacity="0.16"/>
<circle cx="351.6" cy="650.6" r="1.4" fill="#77694c" opacity="0.20"/>
<circle cx="1173.1" cy="123.3" r="2.7" fill="#77694c" opacity="0.15"/>
<circle cx="1188.0" cy="585.0" r="1.1" fill="#77694c" opacity="0.23"/>
<circle cx="199.0" cy="377.9" r="1.8" fill="#77694c" opacity="0.24"/>
<circle cx="126.8" cy="277.3" r="2.8" fill="#77694c" opacity="0.21"/>
<circle cx="881.0" cy="68.4" r="2.1" fill="#77694c" opacity="0.25"/>
<circle cx="665.9" cy="552.6" r="2.5" fill="#77694c" opacity="0.18"/>
<circle cx="944.8" cy="691.6" r="2.8" fill="#77694c" opacity="0.29"/>
<circle cx="496.8" cy="0.0" r="3.6" fill="#77694c" opacity="0.29"/></g>
      </svg>
    </div>`,
    css: `
    .slide{ background:#f2e8d0; color:#1d1a14; }
    .kickline{ margin-bottom:48px; }
    .kickline .rule{ display:none; }
    .kickline .kt{ display:inline-flex; align-items:center; background:#1d1a14; color:#f2e8d0; padding:14px 28px; border-radius:4px; font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:3px; text-transform:uppercase; }
    .kickline .kt::before{ content:""; width:10px; height:10px; border-radius:50%; background:#c03a2b; margin-right:16px; }
    .hook{ font-family:'Poppins'; font-weight:800; font-size:100px; line-height:1.08; letter-spacing:-2.5px; color:#1d1a14; }
    .hook b{ color:#c03a2b; font-weight:800; }
    .sub{ font-family:'Poppins'; font-weight:400; font-size:32px; line-height:1.55; color:#77694c; margin-top:44px; max-width:900px; }
    .sub b{ color:#1d1a14; font-weight:600; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:46px; line-height:1.56; color:#2e2a20; }
    .body b{ color:#c03a2b; font-weight:700; }
    .body .num{ font-family:'Poppins'; font-weight:800; font-size:38px; color:#c03a2b; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:62px; line-height:1.6; color:#1d1a14; }
    .poem b{ color:#c03a2b; font-weight:600; }
    .bubble{ background:#1d1a14; color:#f2e8d0; border-radius:8px; padding:58px 56px; }
    .bubble .body{ color:#f2e8d0; font-size:48px; }
    .bubble .body b{ color:#fbf6e8; font-weight:700; border-bottom:3px solid #c03a2b; padding-bottom:2px; }
    .kicker{ font-family:'Poppins'; font-weight:700; font-size:24px; letter-spacing:4px; text-transform:uppercase; color:#cfc1a0; margin-top:32px; }
    .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.6; color:#2e2a20; text-align:center; }
    .profile b{ color:#c03a2b; font-weight:700; }
    .brand{ color:#77694c; } .pageno{ color:#77694c; }` };
  LOOKS["baithak"] = { name: "Baithak", chip: "#1f5c4d", bg: "#f5efe2", arrow: "#1f5c4d",
    graphic: `<div style="position:absolute;inset:0;">
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <filter id="btkGrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.045 0"/></filter>
        <rect width="1080" height="1350" filter="url(#btkGrain)"/>
        <g transform="translate(92,1096)" stroke="#82755d" stroke-width="2.6" fill="none" opacity=".55" stroke-linecap="round">
          <line x1="0" y1="0" x2="896" y2="0"/>
          <line x1="40" y1="2" x2="34" y2="40"/><line x1="856" y1="2" x2="862" y2="40"/>
          <line x1="120" y1="2" x2="118" y2="40" opacity=".6"/><line x1="776" y1="2" x2="778" y2="40" opacity=".6"/>
          <g transform="translate(742,-8)">
            <path d="M 0 -28 q 0 -22 22 -22 h 40 q 22 0 22 22 v 4 q 0 24 -22 24 h -40 q -22 0 -22 -24 z" opacity=".95"/>
            <path d="M 86 -40 q 18 -2 14 16 q -3 12 -16 8" opacity=".8"/>
            <path d="M 24 -62 q 5 -12 -2 -22 M 44 -66 q 5 -12 -2 -22 M 62 -62 q 5 -12 -2 -22" opacity=".5"/>
          </g>
        </g>
      </svg>
    </div>`,
    css: `
    .slide{ background:#f5efe2; color:#26211a; }
    .kickline .rule{ width:56px; height:1px; background:#1f5c4d; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#1f5c4d; }
    .hook{ font-family:'Poppins'; font-weight:600; font-size:68px; line-height:1.32; letter-spacing:-.5px; color:#26211a; }
    .hook b{ color:#1f5c4d; font-weight:700; }
    .sub{ font-family:'Poppins'; font-weight:400; font-size:31px; color:#82755d; margin-top:40px; line-height:1.58; }
    .body{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:50px; line-height:1.58; color:#33291d; }
    .body b{ color:#1f5c4d; font-weight:600; }
    .body .num{ font-family:'Poppins'; font-weight:600; font-size:27px; color:#b3762c; letter-spacing:3px; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:62px; line-height:1.6; color:#26211a; }
    .poem b{ color:#1f5c4d; font-weight:600; }
    .bubble{ position:relative; background:#fffcf3; border:1.5px solid #ddd2b8; border-radius:18px; padding:52px 56px; box-shadow:0 3px 0 rgba(38,33,26,.06); }
    .bubble::after{ content:""; position:absolute; left:74px; bottom:-17px; width:30px; height:30px; background:#fffcf3; border-right:1.5px solid #ddd2b8; border-bottom:1.5px solid #ddd2b8; transform:rotate(45deg); }
    .bubble .body{ font-family:'Poppins','Laila',sans-serif; font-weight:600; font-size:44px; line-height:1.34; color:#26211a; letter-spacing:-.5px; }
    .bubble .body b{ color:#1f5c4d; font-weight:700; }
    .kicker{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:#b3762c; margin-top:30px; }
    .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.62; color:#4a4234; text-align:center; }
    .profile b{ color:#1f5c4d; font-weight:600; }
    .brand{ color:#82755d; } .pageno{ color:#82755d; }` };
  LOOKS["chitthi"] = { name: "Chitthi", chip: "#a8352a", bg: "#e9e2cf", arrow: "#a8352a",
    graphic: `<div style="position:absolute;inset:0;">
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <filter id="chtGrain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="23"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.28 0 0 0 0 0.22 0 0 0 0 0.1 0 0 0 0.05 0"/></filter>
        <rect width="1080" height="1350" filter="url(#chtGrain)"/>
        <path d="M 54 0 C 66 220, 44 420, 58 640 C 70 860, 46 1080, 60 1350" fill="none" stroke="#a8352a" stroke-width="3.4" opacity=".5"/>
        <path d="M 60 0 C 50 240, 70 460, 52 700 C 44 920, 68 1140, 54 1350" fill="none" stroke="#c98a3a" stroke-width="2.2" opacity=".45"/>
      </svg>
    </div>`,
    css: `
    .slide{ background:#e9e2cf; color:#292317; }
    .kickline .rule{ width:56px; height:1px; background:#a8352a; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:5px; text-transform:uppercase; color:#a8352a; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:64px; line-height:1.52; color:#292317; }
    .hook b{ font-weight:500; background:linear-gradient(transparent 68%, rgba(168,53,42,.24) 68%); }
    .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#83765a; margin-top:40px; line-height:1.58; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:400; font-size:45px; line-height:1.6; color:#3a3222; }
    .body b{ color:#a8352a; font-weight:600; }
    .body .num{ font-family:'Poppins'; font-weight:600; font-size:28px; color:#33556e; letter-spacing:2px; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:62px; line-height:1.62; color:#292317; }
    .poem b{ font-weight:500; background:linear-gradient(transparent 68%, rgba(168,53,42,.24) 68%); }
    .bubble{ position:relative; background:#fdfaf1; border:1px solid #d3c7a6; padding:72px 64px 60px; transform:rotate(-.9deg); box-shadow:0 2px 0 rgba(41,35,23,.05), 0 22px 54px rgba(41,35,23,.14); }
    .bubble::before{ content:""; position:absolute; left:0; right:0; top:0; height:7px; background:repeating-linear-gradient(90deg, #a8352a 0 26px, transparent 26px 40px); opacity:.55; }
    .bubble .body{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:54px; line-height:1.56; color:#292317; }
    .bubble .body b{ font-weight:500; background:linear-gradient(transparent 68%, rgba(168,53,42,.24) 68%); color:#292317; }
    .kicker{ font-family:'Poppins'; font-weight:500; font-size:26px; color:#83765a; margin-top:44px; }
    .kicker::before{ content:""; display:inline-block; width:44px; height:1.5px; background:#83765a; margin-right:18px; vertical-align:middle; }
    .profile{ font-family:'Poppins'; font-weight:400; font-size:38px; line-height:1.62; color:#4a4030; text-align:center; }
    .profile b{ color:#a8352a; font-weight:600; }
    .brand{ color:#83765a; } .pageno{ color:#83765a; }` };
  LOOKS["tasveer"] = { name: "Tasveer", chip: "#c99a4b", bg: "#141210", arrow: "#c99a4b",
    graphic: `<div style="position:absolute;inset:0;">
      <div style="position:absolute;inset:0;background:radial-gradient(620px 780px at 38% 40%, #4a3b26 0%, #362b1b 34%, #221c12 62%, #141210 88%), #141210;"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(11deg, rgba(15,13,10,.94) 0%, rgba(15,13,10,.72) 34%, rgba(15,13,10,.12) 62%, rgba(15,13,10,.28) 100%);"></div>
      <svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;">
        <filter id="tsvFilm"><feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed="88"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.85 0 0 0 0 0.74 0 0 0 0 0.52 0 0 0 0.07 0"/></filter>
        <rect width="1080" height="1350" filter="url(#tsvFilm)"/>
        <g><path d="M 388.5 889.6 q 4.6 213.9 0 427.7" stroke="#e8dcc0" stroke-width="1.31" fill="none" opacity="0.14"/>
<path d="M 708.9 724.6 q 2.9 84.5 0 169.1" stroke="#e8dcc0" stroke-width="0.81" fill="none" opacity="0.08"/>
<path d="M 736.2 806.7 q 2.7 184.0 0 368.0" stroke="#e8dcc0" stroke-width="1.23" fill="none" opacity="0.07"/>
<path d="M 563.0 250.6 q -12.8 242.3 0 484.7" stroke="#e8dcc0" stroke-width="0.64" fill="none" opacity="0.09"/>
<path d="M 802.1 575.8 q 4.8 258.6 0 517.1" stroke="#e8dcc0" stroke-width="0.67" fill="none" opacity="0.10"/>
<path d="M 603.8 826.2 q -6.9 198.7 0 397.5" stroke="#e8dcc0" stroke-width="0.59" fill="none" opacity="0.11"/>
<path d="M 926.1 873.2 q -1.9 186.9 0 373.8" stroke="#e8dcc0" stroke-width="1.31" fill="none" opacity="0.09"/></g>
      </svg>
      <div style="position:absolute;inset:34px;border:1px solid rgba(201,154,75,.4);"></div>
      <div style="position:absolute;right:120px;bottom:21px;background:#141210;padding:2px 14px;font-family:'Poppins';font-weight:600;font-size:19px;letter-spacing:4px;color:#c99a4b;">TASVEER</div>
    </div>`,
    css: `
    .slide{ background:#141210; color:#f0ebe0; }
    .mid{ justify-content:flex-end; padding-bottom:30px; }
    .kickline{ margin-bottom:36px; }
    .kickline .rule{ display:none; }
    .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:5px; text-transform:uppercase; color:#c99a4b; }
    .hook{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:66px; line-height:1.5; color:#f0ebe0; max-width:880px; }
    .hook b{ color:#c99a4b; font-weight:600; }
    .sub{ font-family:'Poppins'; font-weight:500; font-size:27px; color:#9a917f; margin-top:44px; letter-spacing:1px; line-height:1.6; }
    .sub::before{ content:""; display:block; width:72px; height:2px; background:#c99a4b; margin-bottom:26px; }
    .sub b{ color:#f0ebe0; font-weight:600; }
    .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.62; color:#d9d2c2; max-width:880px; }
    .body b{ color:#c99a4b; font-weight:500; }
    .body .num{ font-family:'Poppins'; font-weight:600; font-size:28px; color:#c99a4b; letter-spacing:3px; }
    .poem{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:64px; line-height:1.6; color:#f0ebe0; max-width:880px; }
    .poem b{ color:#c99a4b; font-weight:600; }
    .bubble{ background:rgba(29,26,22,.82); border:1px solid rgba(201,154,75,.4); padding:56px 54px; }
    .bubble .body{ color:#f0ebe0; font-weight:400; }
    .kicker{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:4px; text-transform:uppercase; color:#c99a4b; margin-top:32px; }
    .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#d9d2c2; }
    .profile b{ color:#f0ebe0; font-weight:600; }
    .brand{ color:#9a917f; } .pageno{ color:#c99a4b; letter-spacing:2px; }` };
  PAL["sankalpPatra"] = {"bg":"#f6f1e4","ink":"#28211a","sub":"#7a6f5c","acc":"#9d2b1e","acc2":"#8a6a34","panel":"#fffdf6","line":"#d9cdb4"};
  PAL["munaadi"] = {"bg":"#f2e8d0","ink":"#1d1a14","sub":"#77694c","acc":"#c03a2b","acc2":"#1c3a5e","panel":"#fbf6e8","line":"#d9caa6"};
  PAL["baithak"] = {"bg":"#f5efe2","ink":"#26211a","sub":"#82755d","acc":"#1f5c4d","acc2":"#b3762c","panel":"#fffcf3","line":"#ddd2b8"};
  PAL["chitthi"] = {"bg":"#e9e2cf","ink":"#292317","sub":"#83765a","acc":"#a8352a","acc2":"#33556e","panel":"#fdfaf1","line":"#d3c7a6"};
  PAL["tasveer"] = {"bg":"#141210","ink":"#f0ebe0","sub":"#9a917f","acc":"#c99a4b","acc2":"#7d3327","panel":"#1d1a16","line":"#37322a"};
  GROUP["sankalpPatra"] = "Handwritten & Artifact";
  GROUP["munaadi"] = "Bold & Punchy";
  GROUP["baithak"] = "Editorial & Newsprint";
  GROUP["chitthi"] = "Handwritten & Artifact";
  GROUP["tasveer"] = "Dark & Moody";

  var TPL = {};
  TPL["proof-student-line"] = { cls: "pc-proofline", fn: v => `
  <div class="wm">@DOALFAAZ</div>
  <div class="eyebrow"><div class="rule"></div><div class="txt">${esc(v.proof_eyebrow || 'Ek student ki line')}</div></div>
  <div class="quotezone">
    <div class="bigq">&ldquo;</div>
    <div class="quote">${esc(v.proof_quote || 'Pehli baar mujhe samajh aaya ki main apne pain ko <span class="turn">identity</span> bana raha tha.')}</div>
    <div class="attrib">
      <div class="dash"></div>
      <div class="who">${esc(v.proof_attrib || 'AB 1.0 student')}</div>
      <div class="consent">${esc(v.proof_consent || '&middot; apni marzi se share ki')}</div>
    </div>
  </div>
  <div class="hold">
    <div class="ht">${esc(v.proof_hold || 'Ye line mere saath reh gayi. Naam unki privacy hai &mdash; <b>line unki himmat.</b> Proof ka matlab yahan noise nahi, seriousness hai.')}</div>
  </div>
  <div class="foot">
    <div class="counter">${esc(v.proof_counter || '01 / 12')}</div>
    <div class="fbrand">${esc(v.foot_brand || 'Aham Brahmasmi 2.0')}</div>
  </div>` };
  TPL["faq-seedhe-jawab"] = { cls: "pc-faqjawab", fn: v => `
  <div class="wm">@DOALFAAZ</div>
  <div class="eyebrow"><div class="rule"></div><div class="txt">${esc(v.faq_eyebrow || 'Seedhe jawab')}</div></div>
  <div class="qzone">
    <div class="qmark">${esc(v.faq_num || 'SAWAAL 07')}</div>
    <div class="q">${esc(v.faq_q || 'Kya ye therapy hai?')}</div>
  </div>
  <div class="acard">
    <div class="nahi">${esc(v.faq_verdict || 'Nahi.')}</div>
    <div class="a">${esc(v.faq_a || 'Ye therapy ka replacement nahi hai. Ye psychology aur Vedanta ka <b>structured study path</b> hai. Kaam aapko karna hoga &mdash; course structure dega.')}</div>
  </div>
  <div class="foot">
    <div class="counter">${esc(v.faq_counter || '07 / 59')}</div>
    <div class="fbrand">${esc(v.foot_brand || 'Aham Brahmasmi 2.0 &middot; FAQ')}</div>
  </div>` };
  TPL["faq-boundary-stack"] = { cls: "pc-faqboundary", fn: v => `
  <div class="wm">@DOALFAAZ</div>
  <div class="eyebrow"><div class="rule"></div><div class="txt">${esc(v.bnd_eyebrow || 'Pehle hi clear kar dun')}</div></div>
  <div class="head"><div class="h1">${esc(v.bnd_title || 'Ye course kya <em>nahi</em> hai.')}</div></div>
  <div class="ledger">${(Array.isArray(v.bnd_rows) && v.bnd_rows.length ? v.bnd_rows
      : ['Therapy', 'Religion ya ritual', 'Motivation', 'Instant solution'])
      .map(r => (typeof r === 'string' ? { what: r } : (r || {})))
      .map(r => `<div class="row"><div class="what">${esc(r.what || '')}</div><div class="no">${esc(r.no || 'nahi')}</div></div>`)
      .join('')}</div>
  <div class="turnz">
    <div class="h2">${esc(v.bnd_turn || 'Ye ek <span class="hl">study path</span> hai.')}</div>
    <div class="tb">${esc(v.bnd_body || 'Psychology aur Vedanta, ek structure mein. Kaam aapko karna hoga &mdash; course structure dega.')}</div>
  </div>
  <div class="foot">
    <div class="counter">${esc(v.bnd_counter || '01 / 05')}</div>
    <div class="fbrand">${esc(v.foot_brand || 'Aham Brahmasmi 2.0 &middot; FAQ')}</div>
  </div>` };
  TPL["offer-fact-sheet"] = { cls: "pc-offerfact", fn: v => `
  <div class="wm">@DOALFAAZ</div>
  <div class="eyebrow"><div class="rule"></div><div class="txt">${esc(v.offer_eyebrow || 'Ab open hai')}</div></div>
  <div class="name">
    <div class="h1">${esc(v.offer_name || 'Aham Brahmasmi 2.0')}</div>
    <div class="who">${esc(v.offer_whofor || 'Un logon ke liye jo psychology samajh chuke hain, par apne patterns se free feel nahi kar pa rahe.')}</div>
  </div>
  <div class="card">
    <div class="pricerow">
      <div class="price">${esc(v.offer_price_now || '&#8377;999')}</div>
      <div class="tier"><span>${esc(v.offer_deadline || 'Ye price <b>Sunday raat tak</b> hai.')}</span><br>
      <span>${esc(v.offer_price_later || 'Uske baad page band nahi hoga &mdash; price &#8377;1,999 ho jaayegi.')}</span></div>
    </div>
    <div class="incl">${(Array.isArray(v.offer_inclusions) && v.offer_inclusions.length ? v.offer_inclusions
        : ['Recorded lectures', 'Per-lecture notes', 'Lifetime access', 'Community'])
        .map(it => `<div class="it">${esc(typeof it === 'string' ? it : (it && it.what) || '')}</div>`)
        .join('')}<div class="it guarantee">${esc(v.offer_guarantee || '100% refund guarantee')}</div></div>
  </div>
  <div class="cta">
    <div class="main">${esc(v.offer_cta || 'Page <span class="ul">link bio mein</span> hai. Aaram se padh lijiye.')}</div>
    <div class="soft">${esc(v.offer_cta_soft || 'Faisla shaant dimaag se lena.')}</div>
  </div>
  <div class="foot">
    <span>${esc(v.offer_counter || 'Launch &middot; Cart open')}</span>
    <span>${esc(v.foot_brand || 'Aham Brahmasmi 2.0')}</span>
  </div>` };
  TPL["offer-calendar-truth"] = { cls: "pc-offercal", fn: v => `
  <div class="wm">@DOALFAAZ</div>
  <div class="eyebrow"><div class="rule"></div><div class="txt">${esc(v.dl_eyebrow || 'Ek hi deadline hai')}</div></div>
  <div class="head">
    <div class="h1">${esc(v.dl_headline || 'Enrollment <b>Sunday raat</b> band ho jaayega.')}</div>
  </div>
  <div class="cal">${(Array.isArray(v.dl_week) && v.dl_week.length ? v.dl_week
      : [{ dow: 'THU', dt: '09', state: 'past' },
         { dow: 'FRI', dt: '10', state: 'today', tag: (v.dl_today || 'AAJ') },
         { dow: 'SAT', dt: '11' },
         { dow: 'SUN', dt: (v.dl_date || '12'), state: 'last', tag: 'RAAT TAK' }])
      .map(d => (typeof d === 'string' ? { dow: d.split(/\s+/)[0] || '', dt: d.split(/\s+/)[1] || '' } : (d || {})))
      .map(d => `<div class="day${d.state ? ' ' + esc(d.state) : ''}"><div class="dow">${esc(d.dow || '')}</div><div class="dt">${esc(d.dt || '')}</div>${d.tag ? `<div class="tag">${esc(d.tag)}</div>` : ''}</div>`)
      .join('')}</div>
  <div class="reason">
    <div class="rt">${esc(v.dl_reason || 'Reason simple hai: main is launch ko khinchna nahi chahta. <b>Iske baad mujhe onboarding aur course delivery par dhyaan dena hai.</b>')}</div>
  </div>
  <div class="fact">
    <div class="price">${esc(v.dl_price || 'Is tier par price <b>&#8377;999</b> &mdash; uske baad &#8377;1,999.')}</div>
    <div class="calm">${esc(v.dl_cta || 'Faisla shaant dimaag se lena.')}</div>
  </div>
  <div class="foot">
    <span>${esc(v.dl_counter || 'Launch &middot; Deadline')}</span>
    <span>${esc(v.foot_brand || 'Aham Brahmasmi 2.0')}</span>
  </div>` };
  TPL["pattika-offer"] = { cls: "pc-pattika", fn: v => `
  <div class="plaster"></div>
  <div class="wm">@DOALFAAZ</div>
  <div class="placard">
    <div class="artist">${esc(v.artist || 'TUSHAR MEHROTRA&nbsp;&nbsp;&middot;&nbsp;&nbsp;b. 1996, BANARAS')}</div>
    <div class="hr"></div>
    <div class="title">${esc(v.title || 'अहम् ब्रह्मास्मि')}</div>
    <div class="subtitle">${esc(v.subtitle || 'Aham Brahmasmi &mdash; 2.0')}</div>
    <div class="medium">${esc(v.medium || 'Vedanta &amp; modern psychology &middot; 50 recorded lessons &middot; 10&ndash;15 hrs<br>lifetime access &middot; notes with every lecture &middot; 650+ students so far')}</div>
    <div class="desc">${esc(v.epigraph || '&ldquo;Psychology gives you the map.<br>Vedanta gives you the one who reads the map.&rdquo;')}</div>
    <div class="prow">
      <div class="edition">${esc(v.terms || 'Self-paced &mdash; begins the day you do.<br>100% refund guarantee, no questions.')}</div>
      <div class="price">${esc(v.price || '₹999')}<span class="dot"></span></div>
    </div>
  </div>
  <div class="wallnote">${esc(v.wallnote || 'DOALFAAZ.COM&nbsp;&nbsp;&mdash;&nbsp;&nbsp;LINK IN BIO')}</div>` };

  var TPL_CSS = `
/* ===== atelier proof-student-line ===== */

  .pc-proofline{ background:#F7F6F2; color:#16150F; -webkit-font-smoothing:antialiased; }
  .pc-proofline .wm{ position:absolute; top:64px; right:88px; font-size:19px; letter-spacing:.34em;
      color:#B9B4A8; font-weight:500; }
  .pc-proofline .eyebrow{ position:absolute; top:170px; left:96px; display:flex; align-items:center; gap:18px; }
  .pc-proofline .eyebrow .rule{ width:54px; height:2px; background:#B23A3A; }
  .pc-proofline .eyebrow .txt{ font-size:23px; letter-spacing:.30em; color:#8A857A; font-weight:600;
      text-transform:uppercase; }
  .pc-proofline .quotezone{ position:absolute; left:96px; right:96px; top:342px; }
  .pc-proofline .bigq{ font-family:Georgia,'Times New Roman',serif; font-size:230px; line-height:.6;
      color:#EADFC8; position:absolute; top:-10px; left:-14px; }
  .pc-proofline .quote{ margin:0; padding-top:108px; font-family:Georgia,serif; font-weight:400;
      font-size:70px; line-height:1.44; color:#16150F; letter-spacing:.002em; position:relative; }
  .pc-proofline .quote .turn{ color:#B23A3A; }
  .pc-proofline .attrib{ margin-top:72px; display:flex; align-items:center; gap:16px; }
  .pc-proofline .attrib .dash{ width:36px; height:2px; background:#16150F; }
  .pc-proofline .attrib .who{ font-size:26px; font-weight:600; color:#16150F; }
  .pc-proofline .attrib .consent{ font-size:22px; color:#8A857A; font-weight:400; }
  .pc-proofline .hold{ position:absolute; left:96px; right:96px; bottom:186px;
      border-top:1px solid #ECE9E1; padding-top:48px; }
  .pc-proofline .hold .ht{ margin:0; font-size:30px; line-height:1.65; color:#5B564B; font-weight:400; }
  .pc-proofline .hold .ht b{ color:#16150F; font-weight:600; }
  .pc-proofline .foot{ position:absolute; left:96px; right:96px; bottom:66px; display:flex;
      justify-content:space-between; align-items:baseline; }
  .pc-proofline .foot .counter{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; }
  .pc-proofline .foot .fbrand{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; text-transform:uppercase; }

/* ===== atelier faq-seedhe-jawab ===== */

  .pc-faqjawab{ background:#F7F6F2; color:#16150F; -webkit-font-smoothing:antialiased; }
  .pc-faqjawab .wm{ position:absolute; top:64px; right:88px; font-size:19px; letter-spacing:.34em;
      color:#B9B4A8; font-weight:500; }
  .pc-faqjawab .eyebrow{ position:absolute; top:170px; left:96px; display:flex; align-items:center; gap:18px; }
  .pc-faqjawab .eyebrow .rule{ width:54px; height:2px; background:#23306B; }
  .pc-faqjawab .eyebrow .txt{ font-size:23px; letter-spacing:.30em; color:#8A857A; font-weight:600;
      text-transform:uppercase; }
  .pc-faqjawab .qzone{ position:absolute; left:96px; right:96px; top:290px; }
  .pc-faqjawab .qmark{ font-size:25px; font-weight:600; color:#23306B; letter-spacing:.22em; margin-bottom:30px; }
  .pc-faqjawab .q{ margin:0; font-size:96px; line-height:1.16; font-weight:600; letter-spacing:-.012em;
      color:#16150F; }
  .pc-faqjawab .acard{ position:absolute; left:96px; right:96px; top:648px; background:#FFFFFF;
      border:1px solid #ECE9E1; border-radius:28px; padding:76px 80px 72px;
      box-shadow:0 1px 2px rgba(20,18,10,.04), 0 8px 28px rgba(20,18,10,.06); }
  .pc-faqjawab .nahi{ font-size:80px; font-weight:600; color:#1F7A4D; line-height:1; margin:0 0 44px; }
  .pc-faqjawab .a{ margin:0; font-size:37px; line-height:1.64; color:#3E3A31; font-weight:400; }
  .pc-faqjawab .a b{ color:#16150F; font-weight:600; }
  .pc-faqjawab .foot{ position:absolute; left:96px; right:96px; bottom:66px; display:flex;
      justify-content:space-between; align-items:baseline; }
  .pc-faqjawab .foot .counter{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; }
  .pc-faqjawab .foot .fbrand{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; text-transform:uppercase; }

/* ===== atelier faq-boundary-stack ===== */

  .pc-faqboundary{ background:#F7F6F2; color:#16150F; -webkit-font-smoothing:antialiased; }
  .pc-faqboundary .wm{ position:absolute; top:64px; right:88px; font-size:19px; letter-spacing:.34em;
      color:#B9B4A8; font-weight:500; }
  .pc-faqboundary .eyebrow{ position:absolute; top:170px; left:96px; display:flex; align-items:center; gap:18px; }
  .pc-faqboundary .eyebrow .rule{ width:54px; height:2px; background:#B23A3A; }
  .pc-faqboundary .eyebrow .txt{ font-size:23px; letter-spacing:.30em; color:#8A857A; font-weight:600;
      text-transform:uppercase; }
  .pc-faqboundary .head{ position:absolute; left:96px; right:96px; top:262px; }
  .pc-faqboundary .head .h1{ margin:0; font-size:72px; line-height:1.2; font-weight:600; letter-spacing:-.01em; }
  .pc-faqboundary .head .h1 em{ font-style:normal; color:#B23A3A; }
  .pc-faqboundary .ledger{ position:absolute; left:96px; right:96px; top:428px; }
  .pc-faqboundary .row{ display:flex; justify-content:space-between; align-items:baseline;
      padding:27px 4px; border-bottom:1px solid #ECE9E1; }
  .pc-faqboundary .row .what{ font-size:40px; font-weight:500; color:#8A857A; }
  .pc-faqboundary .row .no{ font-size:30px; font-weight:600; color:#B23A3A; letter-spacing:.02em; }
  .pc-faqboundary .turnz{ position:absolute; left:96px; right:96px; bottom:198px; }
  .pc-faqboundary .turnz .h2{ margin:0; font-size:64px; line-height:1.25; font-weight:600; color:#16150F; }
  .pc-faqboundary .turnz .h2 .hl{ background:linear-gradient(transparent 62%, #D81B4F 62%, #D81B4F 94%, transparent 94%); }
  .pc-faqboundary .turnz .tb{ margin:24px 0 0; font-size:29px; line-height:1.6; color:#5B564B; }
  .pc-faqboundary .foot{ position:absolute; left:96px; right:96px; bottom:66px; display:flex;
      justify-content:space-between; align-items:baseline; }
  .pc-faqboundary .foot .counter{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; }
  .pc-faqboundary .foot .fbrand{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; text-transform:uppercase; }

/* ===== atelier offer-fact-sheet ===== */

  .pc-offerfact{ background:#F7F6F2; color:#16150F; -webkit-font-smoothing:antialiased; }
  .pc-offerfact .wm{ position:absolute; top:64px; right:88px; font-size:19px; letter-spacing:.34em;
      color:#B9B4A8; font-weight:500; }
  .pc-offerfact .eyebrow{ position:absolute; top:150px; left:96px; display:flex; align-items:center; gap:18px; }
  .pc-offerfact .eyebrow .rule{ width:54px; height:2px; background:#1F7A4D; }
  .pc-offerfact .eyebrow .txt{ font-size:23px; letter-spacing:.30em; color:#8A857A; font-weight:600;
      text-transform:uppercase; }
  .pc-offerfact .name{ position:absolute; left:96px; right:96px; top:216px; }
  .pc-offerfact .name .h1{ margin:0; font-size:72px; font-weight:600; letter-spacing:-.01em; line-height:1.15; }
  .pc-offerfact .name .who{ margin:18px 0 0; font-size:29px; line-height:1.55; color:#5B564B; max-width:820px; }
  .pc-offerfact .card{ position:absolute; left:96px; right:96px; top:492px; background:#FFFFFF;
      border:1px solid #ECE9E1; border-radius:28px; padding:56px 68px 52px;
      box-shadow:0 1px 2px rgba(20,18,10,.04), 0 8px 28px rgba(20,18,10,.06); }
  .pc-offerfact .pricerow{ display:flex; align-items:baseline; gap:28px; padding-bottom:36px;
      border-bottom:1px solid #ECE9E1; }
  .pc-offerfact .price{ font-size:96px; font-weight:600; letter-spacing:-.02em; line-height:1; }
  .pc-offerfact .tier{ font-size:25px; color:#5B564B; line-height:1.5; }
  .pc-offerfact .tier b{ color:#16150F; font-weight:600; }
  .pc-offerfact .incl{ margin:34px 0 0; display:grid; grid-template-columns:1fr 1fr; column-gap:36px; }
  .pc-offerfact .incl .it{ display:flex; align-items:baseline; gap:18px; font-size:29px; color:#3E3A31;
      padding:13px 0; font-weight:400; }
  .pc-offerfact .incl .it::before{ content:""; width:9px; height:9px; border-radius:50%; background:#1F7A4D;
      flex:0 0 auto; position:relative; top:-4px; }
  .pc-offerfact .incl .it.guarantee{ grid-column:1 / -1; color:#16150F; font-weight:500; margin-top:8px;
      border-top:1px solid #ECE9E1; padding-top:26px; }
  .pc-offerfact .cta{ position:absolute; left:96px; right:96px; bottom:152px; }
  .pc-offerfact .cta .main{ margin:0; font-size:31px; line-height:1.6; color:#16150F; }
  .pc-offerfact .cta .main .ul{ border-bottom:5px solid #D81B4F; padding-bottom:2px; }
  .pc-offerfact .cta .soft{ margin:12px 0 0; color:#8A857A; font-size:26px; line-height:1.6; }
  .pc-offerfact .foot{ position:absolute; left:96px; right:96px; bottom:66px; display:flex;
      justify-content:space-between; align-items:baseline; }
  .pc-offerfact .foot span{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; text-transform:uppercase; }
.pc-offerfact .price{ white-space:nowrap; }

/* ===== atelier offer-calendar-truth ===== */

  .pc-offercal{ background:#F7F6F2; color:#16150F; -webkit-font-smoothing:antialiased; }
  .pc-offercal .wm{ position:absolute; top:64px; right:88px; font-size:19px; letter-spacing:.34em;
      color:#B9B4A8; font-weight:500; }
  .pc-offercal .eyebrow{ position:absolute; top:170px; left:96px; display:flex; align-items:center; gap:18px; }
  .pc-offercal .eyebrow .rule{ width:54px; height:2px; background:#23306B; }
  .pc-offercal .eyebrow .txt{ font-size:23px; letter-spacing:.30em; color:#8A857A; font-weight:600;
      text-transform:uppercase; }
  .pc-offercal .head{ position:absolute; left:96px; right:96px; top:262px; }
  .pc-offercal .head .h1{ margin:0; font-size:72px; line-height:1.24; font-weight:600; letter-spacing:-.01em; }
  .pc-offercal .head .h1 b{ font-weight:600; }
  .pc-offercal .cal{ position:absolute; left:96px; right:96px; top:560px; display:flex; gap:18px; }
  .pc-offercal .day{ flex:1; background:#FFFFFF; border:1px solid #ECE9E1; border-radius:20px;
      padding:30px 0 26px; text-align:center;
      box-shadow:0 1px 2px rgba(20,18,10,.03), 0 6px 20px rgba(20,18,10,.04); }
  .pc-offercal .day .dow{ font-size:21px; letter-spacing:.16em; color:#8A857A; font-weight:600; }
  .pc-offercal .day .dt{ font-size:40px; font-weight:600; margin-top:12px; color:#3E3A31; }
  .pc-offercal .day.past .dt, .pc-offercal .day.past .dow{ color:#CFCABE; }
  .pc-offercal .day.today{ border-color:#23306B; }
  .pc-offercal .day.today .tag{ font-size:17px; color:#23306B; letter-spacing:.14em; font-weight:600; margin-top:10px; }
  .pc-offercal .day.last{ background:#16150F; border-color:#16150F; }
  .pc-offercal .day.last .dow{ color:#D8D2C4; }
  .pc-offercal .day.last .dt{ color:#D81B4F; }
  .pc-offercal .day.last .tag{ font-size:17px; color:#D81B4F; letter-spacing:.14em; font-weight:600; margin-top:10px; }
  .pc-offercal .reason{ position:absolute; left:96px; right:96px; top:826px; }
  .pc-offercal .reason .rt{ margin:0; font-size:31px; line-height:1.62; color:#3E3A31; max-width:860px; }
  .pc-offercal .reason .rt b{ color:#16150F; font-weight:600; }
  .pc-offercal .fact{ position:absolute; left:96px; right:96px; bottom:176px; border-top:1px solid #ECE9E1;
      padding-top:38px; display:flex; justify-content:space-between; align-items:baseline; gap:40px; }
  .pc-offercal .fact .price{ font-size:33px; color:#16150F; font-weight:500; }
  .pc-offercal .fact .price b{ font-weight:600; }
  .pc-offercal .fact .calm{ font-size:27px; color:#8A857A; }
  .pc-offercal .foot{ position:absolute; left:96px; right:96px; bottom:66px; display:flex;
      justify-content:space-between; align-items:baseline; }
  .pc-offercal .foot span{ font-size:19px; color:#B9B4A8; letter-spacing:.18em; text-transform:uppercase; }

/* ===== atelier pattika-offer ===== */

  .pc-pattika{ background:#EDEBE4; color:#191510; -webkit-font-smoothing:antialiased; }
  .pc-pattika .plaster{ position:absolute; inset:0; opacity:.35; pointer-events:none;
      background-image:radial-gradient(rgba(120,112,95,.08) 1px,transparent 1px); background-size:7px 7px; }
  .pc-pattika .wm{ position:absolute; top:64px; right:96px; font-family:'Poppins',sans-serif;
      font-weight:500; font-size:15px; line-height:1; letter-spacing:.22em; color:#8E897A; }
  .pc-pattika .placard{ position:absolute; left:150px; top:220px; width:780px; box-sizing:border-box;
      padding:84px 88px 72px; background:#FBFAF6; border:1px solid #DAD5C6;
      box-shadow:0 2px 3px rgba(30,26,16,.05), 0 26px 60px rgba(30,26,16,.10); }
  .pc-pattika .artist{ font-family:'Poppins',sans-serif; font-weight:600; font-size:14px; line-height:1;
      letter-spacing:.24em; color:#8E897A; }
  .pc-pattika .hr{ height:1px; background:#E3DFD2; margin:40px 0 48px; }
  .pc-pattika .title{ font-family:'Tiro Devanagari Hindi','Laila',serif; font-size:96px; line-height:1.25;
      color:#191510; margin:0; font-weight:400; }
  .pc-pattika .subtitle{ font-family:Didot,'Hoefler Text',Georgia,serif; font-style:italic; font-size:30px;
      color:#4A453A; margin-top:10px; }
  .pc-pattika .medium{ font-family:'Poppins',sans-serif; font-weight:500; font-size:16.5px; line-height:1.75;
      color:#8E897A; margin-top:44px; letter-spacing:.02em; }
  .pc-pattika .desc{ font-family:'Hoefler Text',Baskerville,Georgia,serif; font-size:27px; line-height:1.7;
      color:#2A2519; margin-top:44px; }
  .pc-pattika .prow{ display:flex; justify-content:space-between; align-items:flex-end; margin-top:64px; }
  .pc-pattika .edition{ font-family:'Poppins',sans-serif; font-weight:500; font-size:14.5px; line-height:1.8;
      color:#8E897A; max-width:380px; }
  .pc-pattika .price{ font-family:Didot,'Hoefler Text',Georgia,serif; font-size:52px; color:#191510;
      display:flex; align-items:baseline; gap:14px; }
  .pc-pattika .price .dot{ width:13px; height:13px; border-radius:50%; background:#B0421F;
      position:relative; top:-3px; }
  .pc-pattika .wallnote{ position:absolute; left:0; top:1246px; width:1080px; text-align:center;
      font-family:'Poppins',sans-serif; font-weight:500; font-size:14px; line-height:1;
      letter-spacing:.2em; color:#8E897A; }
`;
  var BLOCK_FN = function (kind, d) {
    d = d || {};
    if (kind === 'offer') return `<div class="bk-ofr"><div class="bk-ofr-rows">${(d.rows||[]).map(r=>`<div class="bk-ofr-row"><span class="bk-ofr-k">${r.label||''}</span><span class="bk-ofr-v">${r.value||''}${r.sub?`<small>${r.sub}</small>`:''}</span></div>`).join('')}</div>${(d.price||d.note||d.tier)?`<div class="bk-ofr-bar"><div class="bk-ofr-price"><sup>&#8377;</sup>${String(d.price==null?'':d.price).replace(/^₹\s*/,'')}</div><div class="bk-ofr-note">${d.tier?`<b>${d.tier}</b><br>`:''}${d.note||''}</div></div>`:''}</div>`;
      if (kind === 'qa') return `<div class="bk-qa"><div class="bk-qa-q"><div class="bk-qa-eb bk-qa-eb2">${d.qtag||'Tumne poocha'}</div><div class="bk-qa-qt">${d.q||''}</div></div><div class="bk-qa-a"><div class="bk-qa-eb">${d.atag||'Mera jawaab'}</div><div class="bk-qa-at">${d.a||''}</div>${d.plain?`<div class="bk-qa-plain">${d.plain}</div>`:''}</div></div>`;
      if (kind === 'proof') return `<div class="bk-prf"><div class="bk-prf-letter">${d.stamp?`<svg class="bk-prf-stamp" viewBox="0 0 132 132"><circle cx="66" cy="66" r="58" fill="none" stroke="var(--acc2)" stroke-width="2" stroke-dasharray="4 5" opacity=".7"/>${String(d.stamp).split(/\s*\|\s*/).slice(0,2).map((ln,i,ar)=>`<text x="66" y="${ar.length>1?56+i*26:74}" text-anchor="middle" font-family="Poppins" font-weight="600" font-size="15" letter-spacing="2" fill="var(--acc2)" opacity=".85">${ln}</text>`).join('')}</svg>`:''}<div class="bk-prf-msg">${d.msg||''}</div>${d.who?`<div class="bk-prf-from"><span class="bk-prf-dash"></span><span>${d.who}</span></div>`:''}<div class="bk-prf-consent">${typeof d.consent==='string'?d.consent:'inki ijaazat se — lafz unke, naam unki marzi ka'}</div></div>${d.response?`<div class="bk-prf-resp">${d.response}</div>`:''}</div>`;
      if (kind === 'announce') return `<div class="bk-anc">${d.date?`<div class="bk-anc-chiprow"><span class="bk-anc-chip"><span class="bk-anc-dot"></span>${d.date}</span></div>`:''}<div class="bk-anc-hook">${d.hook||''}</div>${d.keyword?`<div class="bk-anc-kwrow"><span class="bk-anc-kwlab">${d.kwlab||'Comment karo —'}</span><span class="bk-anc-kw">${String(d.keyword).toUpperCase()}</span></div>`:''}${d.foot?`<div class="bk-anc-foot">${d.foot}</div>`:''}</div>`;
    
    return null;
  };
  var BLOCK_CSS = `
/* ---- offer (Sankalp Patra geometry: truth-sheet rows + quiet display price) ---- */
  .bk-ofr-rows{ border-top:2px solid var(--ink); }
  .bk-ofr-row{ display:flex; align-items:baseline; justify-content:space-between; gap:40px; padding:30px 6px; border-bottom:1px solid var(--line); }
  .bk-ofr-k{ font-family:'Poppins'; font-weight:500; font-size:29px; color:var(--sub); white-space:nowrap; }
  .bk-ofr-v{ font-family:'Poppins'; font-weight:600; font-size:31px; color:var(--ink); text-align:right; line-height:1.4; }
  .bk-ofr-v b{ color:var(--acc); }
  .bk-ofr-v small{ display:block; font-weight:400; font-size:22px; color:var(--sub); margin-top:6px; }
  .bk-ofr-bar{ display:flex; align-items:baseline; gap:40px; margin-top:58px; }
  .bk-ofr-price{ font-family:'Fraunces','Didot',Georgia,serif; font-weight:300; font-size:150px; line-height:1; color:var(--ink); letter-spacing:-2px; }
  .bk-ofr-price sup{ font-size:52px; font-weight:400; color:var(--acc2); letter-spacing:0; }
  .bk-ofr-note{ font-family:'Poppins'; font-weight:400; font-size:26px; line-height:1.55; color:var(--sub); }
  .bk-ofr-note b{ color:var(--acc); font-weight:600; }
  /* ---- qa (Baithak geometry: question bubble + calm larger answer) ---- */
  .bk-qa-q{ position:relative; background:var(--panel); border:1.5px solid var(--line); border-radius:18px; padding:48px 52px; max-width:820px; box-shadow:0 3px 0 rgba(0,0,0,.05); }
  .bk-qa-q::after{ content:""; position:absolute; left:74px; bottom:-16px; width:28px; height:28px; background:var(--panel); border-right:1.5px solid var(--line); border-bottom:1.5px solid var(--line); transform:rotate(45deg); }
  .bk-qa-eb{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:3px; text-transform:uppercase; color:var(--acc); margin-bottom:22px; }
  .bk-qa-eb2{ color:var(--acc2); margin-bottom:16px; }
  .bk-qa-qt{ font-family:'Poppins'; font-weight:600; font-size:44px; line-height:1.34; color:var(--ink); letter-spacing:-.5px; }
  .bk-qa-a{ margin-top:66px; max-width:860px; }
  .bk-qa-at{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:50px; line-height:1.56; color:var(--ink); }
  .bk-qa-at b{ color:var(--acc); font-weight:600; }
  .bk-qa-plain{ font-family:'Poppins'; font-weight:400; font-size:30px; line-height:1.6; color:var(--sub); margin-top:30px; max-width:720px; }
  /* ---- proof (Chitthi geometry: tilted torn-edge letter + consent microline) ---- */
  .bk-prf-letter{ position:relative; background:var(--panel); border:1px solid var(--line); padding:70px 64px 54px; transform:rotate(-.9deg); box-shadow:0 2px 0 rgba(0,0,0,.05), 0 22px 54px rgba(0,0,0,.14); }
  .bk-prf-letter::before{ content:""; position:absolute; left:0; right:0; top:0; height:7px; background:repeating-linear-gradient(90deg, var(--acc) 0 26px, transparent 26px 40px); opacity:.55; }
  .bk-prf-stamp{ position:absolute; top:30px; right:40px; width:130px; height:130px; transform:rotate(8deg); }
  .bk-prf-msg{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:54px; line-height:1.56; color:var(--ink); max-width:760px; }
  .bk-prf-msg b{ color:var(--acc); font-weight:600; }
  .bk-prf-from{ display:flex; align-items:center; gap:20px; margin-top:44px; font-family:'Poppins'; font-weight:500; font-size:29px; color:var(--sub); }
  .bk-prf-dash{ width:44px; height:1.5px; background:var(--sub); }
  .bk-prf-consent{ margin-top:14px; font-family:'Poppins'; font-weight:400; font-size:21px; letter-spacing:1px; color:var(--sub); opacity:.85; }
  .bk-prf-resp{ margin-top:54px; max-width:840px; font-family:'Poppins'; font-weight:400; font-size:31px; line-height:1.6; color:var(--sub); }
  .bk-prf-resp b{ color:var(--ink); font-weight:600; }
  /* ---- announce (Munaadi geometry: datechip + giant hook + bordered keyword) ---- */
  .bk-anc-chiprow{ margin-bottom:44px; }
  .bk-anc-chip{ display:inline-flex; align-items:center; gap:16px; background:var(--ink); color:var(--bg); font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:3px; text-transform:uppercase; padding:14px 28px; border-radius:4px; }
  .bk-anc-dot{ width:10px; height:10px; border-radius:50%; background:var(--acc); }
  .bk-anc-hook{ font-family:'Poppins'; font-weight:800; font-size:108px; line-height:1.07; letter-spacing:-3px; color:var(--ink); }
  .bk-anc-hook b, .bk-anc-hook em{ font-style:normal; color:var(--acc); font-weight:800; }
  .bk-anc-kwrow{ margin-top:58px; display:flex; align-items:center; gap:26px; }
  .bk-anc-kwlab{ font-family:'Poppins'; font-weight:500; font-size:27px; color:var(--sub); }
  .bk-anc-kw{ font-family:'Poppins'; font-weight:800; font-size:44px; letter-spacing:6px; text-transform:uppercase; color:var(--acc); border:3px solid var(--acc); border-radius:10px; padding:14px 30px 14px 36px; background:var(--panel); box-shadow:6px 6px 0 var(--line); }
  .bk-anc-foot{ margin-top:56px; font-family:'Laila','Poppins',serif; font-weight:400; font-size:27px; line-height:1.5; color:var(--sub); }
`;

  function install() {
    var CC = window.CarouselCore, PC = window.PostCore;
    if (!CC || !PC || !PC.html) return false;
    if (!CC.__atelier_batch1) {
      Object.keys(LOOKS).forEach(function (k) { if (!CC.LOOKS[k]) CC.LOOKS[k] = LOOKS[k]; });
      Object.keys(PAL).forEach(function (k) { if (!CC.PAL[k]) CC.PAL[k] = PAL[k]; });
      Object.keys(GROUP).forEach(function (k) { if (!CC.LOOK_GROUP[k]) CC.LOOK_GROUP[k] = GROUP[k]; });
      ["Handwritten & Artifact","Bold & Punchy","Editorial & Newsprint","Dark & Moody"].forEach(function (g) {
        if (CC.GROUP_ORDER && CC.GROUP_ORDER.indexOf(g) < 0) CC.GROUP_ORDER.push(g);
      });
      if (BLOCK_FN) {
        var IB = window.CarouselBlocks;
        if (IB && IB.render && !IB.__atelier_batch1) {
          var origIB = IB.render;
          IB.render = function (kind, d) { var h = BLOCK_FN(kind, d); return (h != null && h !== '') ? h : origIB(kind, d); };
          IB.css = (IB.css || '') + '\n' + BLOCK_CSS;
          IB.__atelier_batch1 = true;
        }
      }
      CC.__atelier_batch1 = true;
    }
    if (!PC.__atelier_batch1 && Object.keys(TPL).length) {
      var origHtml = PC.html;
      PC.html = function (id, v) {
        var t = TPL[id];
        if (t) { v = v || {}; return '<div class="pc ' + t.cls + '">' + t.fn(v) + '</div>'; }
        return origHtml(id, v);
      };
      if (PC.TEMPLATES) Object.keys(TPL).forEach(function (id) { if (PC.TEMPLATES.indexOf(id) < 0) PC.TEMPLATES.push(id); });
      PC.BASE = PC.BASE + '\n' + TPL_CSS;
      try { var st = document.getElementById('v357-poem-postcore-css'); if (st) st.textContent += '\n' + TPL_CSS; } catch (e) {}
      PC.__atelier_batch1 = true;
    }
    return true;
  }
  if (!install()) {
    var n = 0, t = setInterval(function () { if (install() || ++n > 60) clearInterval(t); }, 250);
    document.addEventListener('DOMContentLoaded', install);
  }
})();

/* source: doalfaaz-v381-atelier-batch2-js */
'use strict';
/* v381 atelier batch2 — runtime-merge of frag_mirror.cjs + frag_story.cjs (2026-07-10).
   ADDITIVE ONLY: registers new looks/pal/groups into window.CarouselCore and new
   single-card templates into window.PostCore via a wrapping html(). The protected
   LOOKS / PAL / T literals are never edited. Last-wins, idempotent. */
(function () {
  var esc = function (s) { return (s == null ? '' : String(s)); };
  var H = function (v) { return (v && v.handle) ? esc(v.handle) : '@doalfaaz'; };
  /* pu = IDENTITY here (matches the node-side bake the ADES proofs were graded on).
     Live DoalfaazTypeset senseWrapHTML returns whole sentences as single .pu nowrap
     units for these fragments' long turn-lines -> card overflow; fitMounted skips
     them (non-pu child spans). The fragments were designed + proofed with identity. */
  var pu = esc;
  function poemLines(v, cls) {
    cls = cls || 'pl';
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (!lines.length && v.big) lines = [esc(v.big)];
    var last = (v.last != null && v.last !== '') ? esc(v.last) : null;
    if (last == null && lines.length > 1) { last = lines.pop(); }         // P0-4: never pop a single flat sentence as if it were a poem's final line — that's how a mechanical accent lands on a random trailing word instead of a deliberate poem-closing line.
    var body = lines.map(function (l) { return '<div class="' + cls + '">' + (l ? pu(l) : '&nbsp;') + '</div>'; }).join('');
    var tail = last != null ? '<div class="' + cls + ' last">' + pu(last) + '</div>' : '';
    return body + tail;
  }
  var poemBr = function (v) {
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (v.last != null && v.last !== '') lines.push(esc(v.last));
    return lines.map(function (l, i, a) { return i === a.length - 1 ? '<span class="last">' + pu(l) + '</span>' : pu(l); }).join('<br>');
  };
  var DANDA = '\u0965';

  var LOOKS = {}, PAL = {}, GROUP = {};
  LOOKS["roshandaan"] = { name: "Roshandaan", chip: "#e0a63c", bg: "#131009", arrow: "#e0a63c",
    graphic: `<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;"><defs><linearGradient id="rshdBeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0be62" stop-opacity=".52"/><stop offset=".5" stop-color="#e0a63c" stop-opacity=".16"/><stop offset="1" stop-color="#e0a63c" stop-opacity="0"/></linearGradient><filter id="rshdSoft"><feGaussianBlur stdDeviation="18"/></filter><filter id="rshdGrain"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="31"/><feColorMatrix type="matrix" values="0 0 0 0 0.9 0 0 0 0 0.8 0 0 0 0 0.55 0 0 0 0.05 0"/></filter></defs><rect width="1080" height="1920" fill="#131009"/><rect x="806" y="118" width="182" height="126" rx="60" fill="none" stroke="#39311f" stroke-width="3"/><line x1="897" y1="122" x2="897" y2="240" stroke="#39311f" stroke-width="3"/><polygon points="806,150 992,150 640,1160 190,1160" fill="url(#rshdBeam)" filter="url(#rshdSoft)"/><g><circle cx="833.0" cy="355.7" r="0.9" fill="#e8c27a" opacity="0.27"/><circle cx="562.0" cy="808.1" r="2.5" fill="#e8c27a" opacity="0.18"/><circle cx="778.2" cy="525.8" r="2.4" fill="#e8c27a" opacity="0.18"/><circle cx="827.7" cy="473.1" r="2.7" fill="#e8c27a" opacity="0.32"/><circle cx="624.1" cy="1003.8" r="3.1" fill="#e8c27a" opacity="0.10"/><circle cx="669.9" cy="828.0" r="1.9" fill="#e8c27a" opacity="0.18"/><circle cx="618.3" cy="777.5" r="1.6" fill="#e8c27a" opacity="0.17"/><circle cx="795.3" cy="640.4" r="2.0" fill="#e8c27a" opacity="0.11"/><circle cx="524.2" cy="822.7" r="1.6" fill="#e8c27a" opacity="0.22"/><circle cx="689.7" cy="366.0" r="0.8" fill="#e8c27a" opacity="0.42"/><circle cx="669.3" cy="625.5" r="2.0" fill="#e8c27a" opacity="0.20"/><circle cx="737.0" cy="377.5" r="2.8" fill="#e8c27a" opacity="0.44"/><circle cx="924.8" cy="156.2" r="1.0" fill="#e8c27a" opacity="0.19"/><circle cx="656.5" cy="626.8" r="2.9" fill="#e8c27a" opacity="0.22"/><circle cx="628.8" cy="626.5" r="2.8" fill="#e8c27a" opacity="0.31"/><circle cx="373.4" cy="1094.1" r="1.0" fill="#e8c27a" opacity="0.09"/><circle cx="807.2" cy="272.2" r="1.4" fill="#e8c27a" opacity="0.18"/><circle cx="639.4" cy="791.4" r="2.2" fill="#e8c27a" opacity="0.17"/><circle cx="736.7" cy="532.2" r="1.4" fill="#e8c27a" opacity="0.17"/><circle cx="694.1" cy="550.5" r="2.3" fill="#e8c27a" opacity="0.17"/><circle cx="564.1" cy="661.2" r="1.5" fill="#e8c27a" opacity="0.25"/><circle cx="344.6" cy="1092.8" r="1.3" fill="#e8c27a" opacity="0.09"/><circle cx="787.5" cy="491.0" r="2.4" fill="#e8c27a" opacity="0.33"/><circle cx="708.9" cy="546.5" r="2.2" fill="#e8c27a" opacity="0.17"/><circle cx="738.3" cy="462.2" r="2.4" fill="#e8c27a" opacity="0.14"/><circle cx="943.5" cy="194.9" r="3.1" fill="#e8c27a" opacity="0.15"/><circle cx="828.8" cy="577.5" r="1.3" fill="#e8c27a" opacity="0.11"/><circle cx="873.2" cy="336.6" r="2.9" fill="#e8c27a" opacity="0.25"/><circle cx="822.9" cy="174.6" r="1.7" fill="#e8c27a" opacity="0.42"/><circle cx="400.2" cy="1072.4" r="1.5" fill="#e8c27a" opacity="0.11"/><circle cx="581.7" cy="687.7" r="1.4" fill="#e8c27a" opacity="0.31"/><circle cx="481.0" cy="968.2" r="1.9" fill="#e8c27a" opacity="0.09"/><circle cx="563.2" cy="819.1" r="2.7" fill="#e8c27a" opacity="0.09"/><circle cx="383.8" cy="1088.1" r="3.0" fill="#e8c27a" opacity="0.11"/><circle cx="825.2" cy="156.5" r="1.5" fill="#e8c27a" opacity="0.49"/><circle cx="589.0" cy="872.2" r="1.4" fill="#e8c27a" opacity="0.11"/><circle cx="735.6" cy="464.5" r="3.1" fill="#e8c27a" opacity="0.20"/><circle cx="698.7" cy="897.0" r="2.8" fill="#e8c27a" opacity="0.19"/><circle cx="277.2" cy="1121.3" r="2.2" fill="#e8c27a" opacity="0.09"/><circle cx="642.9" cy="525.3" r="0.9" fill="#e8c27a" opacity="0.37"/><circle cx="472.2" cy="1015.1" r="2.4" fill="#e8c27a" opacity="0.13"/><circle cx="628.3" cy="538.3" r="2.1" fill="#e8c27a" opacity="0.28"/><circle cx="749.0" cy="447.9" r="2.3" fill="#e8c27a" opacity="0.28"/><circle cx="650.5" cy="911.9" r="1.8" fill="#e8c27a" opacity="0.18"/><circle cx="741.2" cy="511.2" r="1.4" fill="#e8c27a" opacity="0.34"/><circle cx="693.5" cy="870.5" r="2.2" fill="#e8c27a" opacity="0.14"/><circle cx="795.3" cy="322.4" r="3.1" fill="#e8c27a" opacity="0.25"/><circle cx="572.9" cy="810.1" r="0.9" fill="#e8c27a" opacity="0.21"/><circle cx="866.1" cy="297.0" r="2.9" fill="#e8c27a" opacity="0.40"/><circle cx="469.9" cy="965.9" r="2.3" fill="#e8c27a" opacity="0.13"/><circle cx="973.6" cy="158.5" r="3.1" fill="#e8c27a" opacity="0.33"/><circle cx="797.7" cy="515.4" r="0.9" fill="#e8c27a" opacity="0.17"/><circle cx="584.2" cy="800.8" r="1.1" fill="#e8c27a" opacity="0.24"/><circle cx="581.5" cy="1029.9" r="3.0" fill="#e8c27a" opacity="0.13"/><circle cx="545.6" cy="650.3" r="2.8" fill="#e8c27a" opacity="0.28"/><circle cx="958.1" cy="233.5" r="3.2" fill="#e8c27a" opacity="0.16"/><circle cx="523.3" cy="1061.7" r="2.6" fill="#e8c27a" opacity="0.10"/><circle cx="368.0" cy="1031.9" r="2.9" fill="#e8c27a" opacity="0.12"/><circle cx="704.1" cy="716.8" r="1.4" fill="#e8c27a" opacity="0.12"/><circle cx="796.4" cy="372.9" r="0.8" fill="#e8c27a" opacity="0.16"/><circle cx="765.1" cy="294.3" r="2.6" fill="#e8c27a" opacity="0.15"/><circle cx="367.2" cy="970.1" r="1.4" fill="#e8c27a" opacity="0.10"/><circle cx="562.4" cy="821.1" r="1.6" fill="#e8c27a" opacity="0.16"/><circle cx="509.5" cy="812.9" r="1.9" fill="#e8c27a" opacity="0.17"/><circle cx="474.8" cy="1150.8" r="2.8" fill="#e8c27a" opacity="0.08"/><circle cx="850.0" cy="204.3" r="2.7" fill="#e8c27a" opacity="0.34"/><circle cx="228.2" cy="1158.1" r="1.1" fill="#e8c27a" opacity="0.08"/><circle cx="963.9" cy="213.5" r="2.8" fill="#e8c27a" opacity="0.53"/><circle cx="756.2" cy="670.9" r="2.3" fill="#e8c27a" opacity="0.14"/><circle cx="588.4" cy="740.9" r="1.5" fill="#e8c27a" opacity="0.11"/><circle cx="572.7" cy="929.4" r="3.1" fill="#e8c27a" opacity="0.12"/><circle cx="897.2" cy="237.6" r="2.0" fill="#e8c27a" opacity="0.10"/><circle cx="427.9" cy="1147.1" r="1.4" fill="#e8c27a" opacity="0.08"/><circle cx="411.1" cy="1124.8" r="0.8" fill="#e8c27a" opacity="0.09"/><circle cx="722.9" cy="696.6" r="1.1" fill="#e8c27a" opacity="0.28"/><circle cx="831.6" cy="190.2" r="2.4" fill="#e8c27a" opacity="0.53"/><circle cx="872.3" cy="168.6" r="1.8" fill="#e8c27a" opacity="0.29"/><circle cx="492.6" cy="824.5" r="1.2" fill="#e8c27a" opacity="0.22"/><circle cx="580.3" cy="662.1" r="2.2" fill="#e8c27a" opacity="0.32"/><circle cx="843.8" cy="305.6" r="2.7" fill="#e8c27a" opacity="0.20"/><circle cx="731.6" cy="445.7" r="2.8" fill="#e8c27a" opacity="0.38"/><circle cx="462.2" cy="968.4" r="2.4" fill="#e8c27a" opacity="0.09"/><circle cx="799.5" cy="585.4" r="1.4" fill="#e8c27a" opacity="0.17"/><circle cx="549.2" cy="1015.3" r="2.9" fill="#e8c27a" opacity="0.11"/><circle cx="566.8" cy="654.6" r="2.6" fill="#e8c27a" opacity="0.15"/><circle cx="766.2" cy="350.2" r="2.1" fill="#e8c27a" opacity="0.12"/><circle cx="745.8" cy="572.2" r="1.4" fill="#e8c27a" opacity="0.29"/><circle cx="560.7" cy="761.8" r="1.6" fill="#e8c27a" opacity="0.16"/><circle cx="844.7" cy="520.5" r="3.1" fill="#e8c27a" opacity="0.21"/><circle cx="635.7" cy="613.1" r="3.0" fill="#e8c27a" opacity="0.27"/><circle cx="560.2" cy="699.0" r="3.0" fill="#e8c27a" opacity="0.18"/><circle cx="534.4" cy="1050.5" r="0.9" fill="#e8c27a" opacity="0.11"/><circle cx="567.9" cy="1091.6" r="2.3" fill="#e8c27a" opacity="0.11"/><circle cx="530.9" cy="653.7" r="1.9" fill="#e8c27a" opacity="0.13"/><circle cx="762.9" cy="457.6" r="2.4" fill="#e8c27a" opacity="0.10"/><circle cx="742.4" cy="407.2" r="1.4" fill="#e8c27a" opacity="0.18"/><circle cx="764.5" cy="455.0" r="2.8" fill="#e8c27a" opacity="0.11"/><circle cx="683.3" cy="790.8" r="2.1" fill="#e8c27a" opacity="0.22"/><circle cx="576.0" cy="1075.5" r="1.1" fill="#e8c27a" opacity="0.09"/><circle cx="368.5" cy="1053.7" r="3.0" fill="#e8c27a" opacity="0.11"/><circle cx="679.4" cy="496.8" r="2.4" fill="#e8c27a" opacity="0.30"/><circle cx="637.6" cy="637.2" r="1.6" fill="#e8c27a" opacity="0.32"/><circle cx="571.1" cy="685.2" r="1.2" fill="#e8c27a" opacity="0.13"/><circle cx="493.7" cy="1020.2" r="1.3" fill="#e8c27a" opacity="0.11"/><circle cx="640.5" cy="622.6" r="2.0" fill="#e8c27a" opacity="0.35"/><circle cx="688.8" cy="665.7" r="1.2" fill="#e8c27a" opacity="0.15"/><circle cx="709.9" cy="586.1" r="2.2" fill="#e8c27a" opacity="0.32"/><circle cx="928.5" cy="236.6" r="2.9" fill="#e8c27a" opacity="0.23"/><circle cx="820.0" cy="300.2" r="2.7" fill="#e8c27a" opacity="0.18"/><circle cx="757.8" cy="711.0" r="1.3" fill="#e8c27a" opacity="0.15"/></g><rect width="1080" height="1920" filter="url(#rshdGrain)"/></svg>`,
    css: `
      .slide{ width:1080px; height:1920px; padding:230px 96px 360px; background:#131009; color:#9c8f74; }
      .brand{ text-align:left; color:#9c8f74; font-size:22px; letter-spacing:4px; }
      .hook{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:84px; line-height:1.38; color:#f3ead6; }
      .hook b{ color:#e0a63c; font-weight:600; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#9c8f74; margin-top:60px; line-height:1.6; }
      .body{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:58px; line-height:1.58; color:#e6dcc4; }
      .body b{ color:#e0a63c; font-weight:600; }
      .body .num{ display:inline-block; font-family:'Poppins'; font-weight:600; font-size:30px; letter-spacing:2px; color:#131009; background:#e0a63c; border-radius:6px; padding:14px 28px; margin:0 26px 44px 0; vertical-align:middle; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:68px; line-height:1.68; color:#f3ead6; }
      .poem b{ color:#e0a63c; font-weight:600; }
      .bubble{ border:1.5px solid #39311f; border-radius:14px; background:rgba(30,25,16,.55); padding:60px 56px 64px; }
      .bubble .body{ font-size:52px; color:#e6dcc4; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:2px; text-transform:uppercase; color:#e0a63c; margin-top:38px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:40px; line-height:1.66; color:#e6dcc4; text-align:center; }
      .profile b{ color:#f3ead6; font-weight:600; }
      .kickline{ margin-bottom:48px; gap:20px; }
      .kickline .rule{ width:64px; height:1px; background:#e0a63c; opacity:.7; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:.25em; text-transform:uppercase; color:#e0a63c; }
      .brand{ font-family:'Poppins'; font-weight:600; }
      .pageno{ color:#6f6450; } .arrow{ opacity:1; }` };
  LOOKS["storyEkBaat"] = { name: "Story · Ek Baat", chip: "#C9603F", bg: "#F4F1EA", arrow: "#C9603F",
    graphic: `<div style="position:absolute;inset:0;background:radial-gradient(1200px 900px at 90% -6%, rgba(201,96,63,.05), transparent 60%);"></div>`,
    css: `
      .slide{ width:1080px; height:1920px; padding:250px 96px 310px; background:#F4F1EA; color:#1A1813; }
      .brand{ color:#B9B3A4; font-weight:500; font-size:24px; letter-spacing:.12em; }
      .kickline{ position:relative; margin-bottom:150px; gap:18px; }
      .kickline .rule{ width:34px; height:3px; background:#C9603F; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:.34em; text-transform:uppercase; color:#8A857A; }
      .kickline::after{ content:''; position:absolute; left:52px; top:66px; width:34px; height:5px; border-radius:3px; background:#C9603F; box-shadow:46px 0 0 #DDD6C6, 92px 0 0 #DDD6C6; }
      .hook{ font-family:'Poppins'; font-weight:300; font-size:62px; line-height:1.44; color:#1A1813; }
      .hook b{ font-weight:600; color:#C9603F; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:30px; color:#8A857A; margin-top:56px; line-height:1.56; letter-spacing:.04em; }
      .body{ font-family:'Poppins'; font-weight:300; font-size:50px; line-height:1.56; color:#1A1813; }
      .body b{ font-weight:600; color:#C9603F; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:2px; color:#C9603F; margin-bottom:26px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:60px; line-height:1.62; color:#1A1813; }
      .poem b{ font-weight:600; color:#C9603F; }
      .bubble{ border:2px solid #DDD6C6; border-radius:18px; background:rgba(236,231,219,.6); padding:56px 52px 60px; }
      .bubble .body{ font-size:46px; color:#1A1813; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:.08em; color:#8A857A; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:40px; line-height:1.66; color:#4A463C; text-align:center; }
      .profile b{ color:#1A1813; font-weight:600; }
      .pageno{ color:#B9B3A4; }` };
  LOOKS["storyEkSawaal"] = { name: "Story · Ek Sawaal", chip: "#C9A15A", bg: "#131210", arrow: "#C9A15A",
    graphic: `<div style="position:absolute;inset:0;background:radial-gradient(1100px 900px at 50% 122%, rgba(201,161,90,.10), transparent 62%);"></div><div style="position:absolute;left:0;right:0;top:960px;text-align:center;font-family:'Poppins';font-weight:500;font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:#3A3730;">&#183; POLL YAHAN &#183;</div>`,
    css: `
      .slide{ width:1080px; height:1920px; padding:250px 96px 310px; background:#131210; color:#8A8271; }
      .mid{ justify-content:flex-start; padding-top:14px; }
      .brand{ color:#57534A; font-weight:500; font-size:24px; letter-spacing:.12em; }
      .kickline{ margin-bottom:56px; gap:18px; }
      .kickline .rule{ width:34px; height:3px; background:#C9A15A; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:.34em; text-transform:uppercase; color:#6E6A5E; }
      .hook{ font-family:'Poppins'; font-weight:300; font-size:52px; line-height:1.42; color:#D9D3C4; }
      .hook b{ font-weight:600; color:#C9A15A; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:30px; color:#8A8271; margin-top:48px; line-height:1.56; }
      .body{ font-family:'Poppins'; font-weight:300; font-size:46px; line-height:1.52; color:#C4BDAA; }
      .body b{ font-weight:600; color:#C9A15A; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:2px; color:#C9A15A; margin-bottom:24px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:60px; line-height:1.6; color:#EDE8DC; margin:20px 0 0; }
      .poem b{ font-weight:600; color:#C9A15A; }
      .bubble{ margin-top:auto; border:0; border-top:1.5px solid #2A2822; border-radius:0; padding:44px 0 0; }
      .bubble .body{ font-size:38px; line-height:1.5; color:#8A8271; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.14em; text-transform:uppercase; color:#57534A; margin-top:30px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:40px; line-height:1.66; color:#C4BDAA; text-align:center; margin-top:auto; }
      .profile b{ color:#EDE8DC; font-weight:600; }
      .pageno{ color:#57534A; }` };
  LOOKS["storyInvite"] = { name: "Story · Quiet Invite", chip: "#9A7B3F", bg: "#F4F1EA", arrow: "#9A7B3F",
    graphic: `<div style="position:absolute;inset:0;background:radial-gradient(1200px 1000px at 50% 118%, rgba(201,161,90,.10), transparent 62%);"></div><div style="position:absolute;left:0;right:0;top:1430px;text-align:center;font-family:'Poppins';font-weight:500;font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:#C9C2B0;">&#183; LINK YAHAN &#183;</div>`,
    css: `
      .slide{ width:1080px; height:1920px; padding:250px 96px 310px; background:#F4F1EA; color:#1A1813; }
      .brand{ color:#B9B3A4; font-weight:500; font-size:24px; letter-spacing:.12em; }
      .kickline{ margin-bottom:130px; gap:18px; }
      .kickline .rule{ width:34px; height:3px; background:#9A7B3F; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:.34em; text-transform:uppercase; color:#8A857A; }
      .hook{ font-family:'Poppins'; font-weight:300; font-size:66px; line-height:1.45; color:#1A1813; }
      .hook b{ font-weight:600; color:#1A1813; }
      .hook::after{ content:''; display:block; width:120px; height:3px; background:#9A7B3F; margin-top:64px; }
      .sub{ font-family:'Poppins'; font-weight:400; font-size:34px; color:#4A463C; margin-top:56px; line-height:1.55; }
      .body{ font-family:'Poppins'; font-weight:400; font-size:44px; line-height:1.5; color:#4A463C; }
      .body b{ font-weight:600; color:#9A7B3F; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:26px; letter-spacing:2px; color:#9A7B3F; margin-bottom:24px; }
      .poem{ font-family:'Laila','Poppins',serif; font-weight:300; font-size:60px; line-height:1.6; color:#1A1813; }
      .poem b{ font-weight:600; color:#9A7B3F; }
      .bubble{ border:2px solid #E2DCCB; border-radius:18px; background:rgba(236,231,219,.55); padding:56px 52px 60px; }
      .bubble .body{ font-size:44px; color:#1A1813; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:.08em; color:#8A857A; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:40px; line-height:1.66; color:#4A463C; text-align:center; }
      .profile b{ color:#1A1813; font-weight:600; }
      .pageno{ color:#B9B3A4; }` };
  PAL["roshandaan"] = {"bg":"#131009","ink":"#f3ead6","sub":"#9c8f74","acc":"#e0a63c","acc2":"#c03a2b","panel":"#1e1910","line":"#39311f"};
  PAL["storyEkBaat"] = {"bg":"#F4F1EA","ink":"#1A1813","sub":"#8A857A","acc":"#C9603F","acc2":"#9A7B3F","panel":"#ECE7DB","line":"#DDD6C6"};
  PAL["storyEkSawaal"] = {"bg":"#131210","ink":"#EDE8DC","sub":"#8A8271","acc":"#C9A15A","acc2":"#6E6A5E","panel":"#1C1B17","line":"#2A2822"};
  PAL["storyInvite"] = {"bg":"#F4F1EA","ink":"#1A1813","sub":"#4A463C","acc":"#9A7B3F","acc2":"#C9603F","panel":"#ECE7DB","line":"#E2DCCB"};
  GROUP["roshandaan"] = "Story 9:16";
  GROUP["storyEkBaat"] = "Story 9:16";
  GROUP["storyEkSawaal"] = "Story 9:16";
  GROUP["storyInvite"] = "Story 9:16";

  var TPL = {};
  TPL["aaina-paper"] = { cls: "pc-aainapaper", fn: v => {
  const br = s => esc(s).split('\n').map(l => pu(l)).join('<br>');
  const setup = (v.setup != null && v.setup !== '') ? v.setup : 'Tumhara problem clarity ki\nkami nahi hai.';
  const turn = (v.turn != null && v.turn !== '') ? v.turn : 'Problem ye hai ki\nclarity tumhare purane\nnervous system mein';
  const payoff = (v.payoff != null && v.payoff !== '') ? v.payoff : '\ntik nahi paati.';
  const counter = (v.counter != null && v.counter !== '') ? v.counter : 'samajh aata hai, par badalta nahi · 01';
  return `
      <div class="wash"></div>
      <div class="eyebrow"><span class="dash">—</span>Aaina</div>
      <div class="handle">${H(v)}</div>
      <div class="line">
        <span class="setup">${br(setup)}</span>
        <span class="second">${br(turn)} <span class="tp">${br(payoff)}</span></span>
      </div>
      <div class="rulebar"></div>
      <div class="foot">${esc(counter)}</div>
      <div class="arr">↗</div>`;
} };
  TPL["aaina-midnight"] = { cls: "pc-aainamidnight", fn: v => {
  const br = s => esc(s).split('\n').map(l => pu(l)).join('<br>');
  const setup = (v.setup != null && v.setup !== '') ? v.setup : 'Samajh sab aata hai.\nBadalta kuch nahi.';
  const turn = (v.turn != null && v.turn !== '') ? v.turn : 'Kyunki samajhna dimaag ka kaam tha —';
  const payoff = (v.payoff != null && v.payoff !== '') ? v.payoff : 'badalna, nervous system ka.';
  const counter = (v.counter != null && v.counter !== '') ? v.counter : 'AAINA · 02';
  return `
      <div class="wash"></div>
      <div class="eyebrow"><span class="dash">—</span>Aaina</div>
      <div class="handle">${H(v)}</div>
      <div class="line">${br(setup)}<span class="s2">${br(turn)} <span class="tp">${br(payoff)}</span></span></div>
      <div class="counter">${esc(counter)}</div>
      <div class="arr">↗</div>`;
} };
  TPL["aaina-margin"] = { cls: "pc-aainamargin", fn: v => {
  const br = s => esc(s).split('\n').map(l => pu(l)).join('<br>');
  const setup = (v.setup != null && v.setup !== '') ? v.setup : 'Tum kaam se nahi bhaag rahe.';
  const turn = (v.turn != null && v.turn !== '') ? v.turn : 'Tum us feeling se bhaag rahe ho\njo shuru karne se theek\npehle aati hai.';
  const payoff = (v.payoff != null && v.payoff !== '') ? v.payoff : 'feeling se bhaag rahe ho';
  const note = (v.note != null && v.note !== '') ? v.note : 'procrastination nahi, protection.';
  const counter = (v.counter != null && v.counter !== '') ? v.counter : 'AAINA · 03';
  const rawTurn = esc(turn), rawPay = esc(payoff);
  let turnHtml;
  const i = rawPay ? rawTurn.indexOf(rawPay) : -1;
  if (i >= 0) {
    // ONE emphasis move: hand-underline the payoff phrase in place (wrap-safe)
    turnHtml = br(rawTurn.slice(0, i)) + `<span class="mk">${br(rawPay)}</span>` + br(rawTurn.slice(i + rawPay.length));
  } else {
    turnHtml = br(rawTurn) + (rawPay ? ` <span class="mk">${br(rawPay)}</span>` : '');
  }
  return `
      <div class="marginline"></div>
      <div class="eyebrow"><span class="dash">—</span>Aaina</div>
      <div class="handle">${H(v)}</div>
      <div class="block">
        <div class="line">${br(setup)}<br><br>${turnHtml}</div>
        <div class="note"><span class="tick">—</span>${br(note)}</div>
      </div>
      <div class="foot">${esc(counter)}</div>
      <div class="arr">↗</div>`;
} };

  var TPL_CSS = `
/* ===== atelier aaina-paper ===== */

    /* AAINA 01 — Paper mirror: empty top half = the pause; weight-jump on the diagnosis,
       terracotta on the final phrase only. */
    .pc-aainapaper{ background:#F4F1EA; color:#1A1813; }
    .pc-aainapaper .wash{ position:absolute; inset:0; pointer-events:none;
      background:
        radial-gradient(1200px 800px at 85% -10%, rgba(201,96,63,.045), transparent 60%),
        radial-gradient(900px 700px at -10% 110%, rgba(26,24,19,.035), transparent 55%); }
    .pc-aainapaper .eyebrow{ position:absolute; left:96px; top:118px;
      font-size:26px; font-weight:600; letter-spacing:.34em; color:#8A857A; text-transform:uppercase; }
    .pc-aainapaper .eyebrow .dash{ color:#C9603F; margin-right:18px; font-weight:400; }
    .pc-aainapaper .handle{ position:absolute; right:96px; top:118px;
      font-size:24px; font-weight:500; letter-spacing:.12em; color:#B9B3A4; }
    .pc-aainapaper .line{ position:absolute; left:96px; right:60px; bottom:322px;
      font-size:58px; line-height:1.48; letter-spacing:-0.005em; }
    .pc-aainapaper .line .setup{ font-weight:300; color:#3A362C; }
    .pc-aainapaper .line .second{ display:block; margin-top:48px; font-weight:600; color:#1A1813; }
    .pc-aainapaper .line .tp{ color:#C9603F; }
    .pc-aainapaper .rulebar{ position:absolute; left:96px; bottom:222px; width:120px; height:3px;
      background:#C9603F; opacity:.9; }
    .pc-aainapaper .foot{ position:absolute; left:96px; bottom:138px; font-size:22px; font-weight:500;
      letter-spacing:.09em; color:#A39D8E; text-transform:uppercase; }
    .pc-aainapaper .arr{ position:absolute; right:96px; bottom:130px; font-size:34px; color:#C9603F;
      font-weight:300; }

/* ===== atelier aaina-midnight ===== */

    /* AAINA 02 — Midnight mirror: brass candle-glow from the bottom edge; dead-center line,
       two-beat rhythm, payoff drops to its own brass block. */
    .pc-aainamidnight{ background:#131210; color:#EDE8DC; }
    .pc-aainamidnight .wash{ position:absolute; inset:0; pointer-events:none;
      background:
        radial-gradient(1100px 900px at 50% 118%, rgba(201,161,90,.15), transparent 62%),
        radial-gradient(900px 700px at 108% -8%, rgba(237,232,220,.03), transparent 55%); }
    .pc-aainamidnight .eyebrow{ position:absolute; left:96px; top:118px;
      font-size:26px; font-weight:600; letter-spacing:.34em; color:#6E6A5E; text-transform:uppercase; }
    .pc-aainamidnight .eyebrow .dash{ color:#C9A15A; margin-right:18px; font-weight:400; }
    .pc-aainamidnight .handle{ position:absolute; right:96px; top:118px;
      font-size:24px; font-weight:500; letter-spacing:.12em; color:#57534A; }
    .pc-aainamidnight .line{ position:absolute; left:96px; right:150px; top:50%; transform:translateY(-50%);
      font-size:68px; line-height:1.44; font-weight:300; color:#D9D3C4; }
    .pc-aainamidnight .line .s2{ display:block; margin-top:58px; }
    .pc-aainamidnight .line .tp{ display:block; font-weight:600; color:#C9A15A; }
    .pc-aainamidnight .counter{ position:absolute; left:96px; bottom:126px; font-size:24px; font-weight:500;
      letter-spacing:.28em; color:#57534A; }
    .pc-aainamidnight .arr{ position:absolute; right:96px; bottom:120px; font-size:34px; color:#C9A15A;
      font-weight:300; }

/* ===== atelier aaina-margin ===== */

    /* AAINA 03 — Margin note: notebook margin rule; ONE emphasis move = hand-swiped terracotta
       underline (wrap-safe); italic pencil-note reframe below the paragraph. */
    .pc-aainamargin{ background:#F4F1EA; color:#1A1813; }
    .pc-aainamargin .marginline{ position:absolute; left:150px; top:0; bottom:0; width:2px;
      background:#E5DFD0; }
    .pc-aainamargin .eyebrow{ position:absolute; left:190px; top:118px;
      font-size:26px; font-weight:600; letter-spacing:.34em; color:#8A857A; text-transform:uppercase; }
    .pc-aainamargin .eyebrow .dash{ color:#C9603F; margin-right:18px; font-weight:400; }
    .pc-aainamargin .handle{ position:absolute; right:96px; top:118px;
      font-size:24px; font-weight:500; letter-spacing:.12em; color:#B9B3A4; }
    /* bottom-anchored (mock specimen still tops out at ~430px) so long auto-fill text grows
       UP into the whitespace instead of colliding with the foot/counter furniture */
    .pc-aainamargin .block{ position:absolute; left:190px; right:90px; bottom:212px; }
    .pc-aainamargin .line{ font-size:54px; line-height:1.52; font-weight:400; color:#1A1813; }
    .pc-aainamargin .line .mk{
      background:linear-gradient(90deg, rgba(201,96,63,.5), rgba(201,96,63,.5)) left 92% / 100% 10px no-repeat;
      -webkit-box-decoration-break:clone; box-decoration-break:clone; padding-bottom:4px; }
    .pc-aainamargin .note{ margin-top:72px; font-size:40px; font-style:italic; font-weight:500;
      color:#C9603F; letter-spacing:.01em; }
    .pc-aainamargin .note .tick{ margin-right:14px; }
    .pc-aainamargin .foot{ position:absolute; left:190px; bottom:132px; font-size:24px; font-weight:500;
      letter-spacing:.06em; color:#8A857A; }
    .pc-aainamargin .arr{ position:absolute; right:96px; bottom:126px; font-size:34px; color:#C9603F;
      font-weight:300; }
`;
  var BLOCK_FN = null, BLOCK_CSS = "";

  function install() {
    var CC = window.CarouselCore, PC = window.PostCore;
    if (!CC || !PC || !PC.html) return false;
    if (!CC.__atelier_batch2) {
      Object.keys(LOOKS).forEach(function (k) { if (!CC.LOOKS[k]) CC.LOOKS[k] = LOOKS[k]; });
      Object.keys(PAL).forEach(function (k) { if (!CC.PAL[k]) CC.PAL[k] = PAL[k]; });
      Object.keys(GROUP).forEach(function (k) { if (!CC.LOOK_GROUP[k]) CC.LOOK_GROUP[k] = GROUP[k]; });
      ["Story 9:16"].forEach(function (g) {
        if (CC.GROUP_ORDER && CC.GROUP_ORDER.indexOf(g) < 0) CC.GROUP_ORDER.push(g);
      });
      if (BLOCK_FN) {
        var IB = window.CarouselBlocks;
        if (IB && IB.render && !IB.__atelier_batch2) {
          var origIB = IB.render;
          IB.render = function (kind, d) { var h = BLOCK_FN(kind, d); return (h != null && h !== '') ? h : origIB(kind, d); };
          IB.css = (IB.css || '') + '\n' + BLOCK_CSS;
          IB.__atelier_batch2 = true;
        }
      }
      CC.__atelier_batch2 = true;
    }
    if (!PC.__atelier_batch2 && Object.keys(TPL).length) {
      var origHtml = PC.html;
      PC.html = function (id, v) {
        var t = TPL[id];
        if (t) { v = v || {}; return '<div class="pc ' + t.cls + '">' + t.fn(v) + '</div>'; }
        return origHtml(id, v);
      };
      if (PC.TEMPLATES) Object.keys(TPL).forEach(function (id) { if (PC.TEMPLATES.indexOf(id) < 0) PC.TEMPLATES.push(id); });
      PC.BASE = PC.BASE + '\n' + TPL_CSS;
      try { var st = document.getElementById('v357-poem-postcore-css'); if (st) st.textContent += '\n' + TPL_CSS; } catch (e) {}
      PC.__atelier_batch2 = true;
    }
    return true;
  }
  if (!install()) {
    var n = 0, t = setInterval(function () { if (install() || ++n > 60) clearInterval(t); }, 250);
    document.addEventListener('DOMContentLoaded', install);
  }
})();

/* source: doalfaaz-v381-atelier-batch3-js */
'use strict';
/* v381 atelier batch3 — runtime-merge of frag_poem.cjs + frag_sig.cjs (2026-07-10).
   ADDITIVE ONLY: registers new looks/pal/groups into window.CarouselCore and new
   single-card templates into window.PostCore via a wrapping html(). The protected
   LOOKS / PAL / T literals are never edited. Last-wins, idempotent. */
(function () {
  var esc = function (s) { return (s == null ? '' : String(s)); };
  var H = function (v) { return (v && v.handle) ? esc(v.handle) : '@doalfaaz'; };
  /* pu = IDENTITY here (matches the node-side bake the ADES proofs were graded on).
     Live DoalfaazTypeset senseWrapHTML returns whole sentences as single .pu nowrap
     units for these fragments' long turn-lines -> card overflow; fitMounted skips
     them (non-pu child spans). The fragments were designed + proofed with identity. */
  var pu = esc;
  function poemLines(v, cls) {
    cls = cls || 'pl';
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (!lines.length && v.big) lines = [esc(v.big)];
    var last = (v.last != null && v.last !== '') ? esc(v.last) : null;
    if (last == null && lines.length > 1) { last = lines.pop(); }         // P0-4: never pop a single flat sentence as if it were a poem's final line — that's how a mechanical accent lands on a random trailing word instead of a deliberate poem-closing line.
    var body = lines.map(function (l) { return '<div class="' + cls + '">' + (l ? pu(l) : '&nbsp;') + '</div>'; }).join('');
    var tail = last != null ? '<div class="' + cls + ' last">' + pu(last) + '</div>' : '';
    return body + tail;
  }
  var poemBr = function (v) {
    var raw = (esc(v.poem) || esc(v.big) || esc(v.line1 || '')).replace(/\r/g, '');
    var lines = raw.length ? raw.split('\n') : [];
    if (v.last != null && v.last !== '') lines.push(esc(v.last));
    return lines.map(function (l, i, a) { return i === a.length - 1 ? '<span class="last">' + pu(l) + '</span>' : pu(l); }).join('<br>');
  };
  var DANDA = '\u0965';

  var LOOKS = {}, PAL = {}, GROUP = {};
  LOOKS["bhorRekha"] = { name: "Bhor Rekha", chip: "#B0421F", bg: "#F2EBDD", arrow: "#B0421F",
    graphic: `<div style="position:absolute;inset:0;"><svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="1040" width="1080" height="310" fill="#E8DFCC"/><rect x="0" y="1033" width="1080" height="7" fill="#221D15" opacity="0.85"/><rect x="40.0" y="1027.3" width="22.0" height="5.7" fill="#221D15" opacity="0.8"/><rect x="126.7" y="1007.4" width="44.6" height="25.6" fill="#221D15" opacity="0.8"/><rect x="237.9" y="1023.8" width="31.9" height="9.2" fill="#221D15" opacity="0.8"/><path d="M 246.9 1033 L 253.9 998.8 L 260.9 1033 Z" fill="#221D15" opacity="0.8"/><rect x="382.3" y="1019.0" width="26.7" height="14.0" fill="#221D15" opacity="0.8"/><rect x="454.3" y="1013.5" width="36.8" height="19.5" fill="#221D15" opacity="0.8"/><rect x="509.7" y="1016.9" width="17.9" height="16.1" fill="#221D15" opacity="0.8"/><rect x="605.4" y="1017.5" width="22.1" height="15.5" fill="#221D15" opacity="0.8"/><rect x="696.1" y="1003.1" width="12.0" height="29.9" fill="#221D15" opacity="0.8"/><path d="M 695.1 1033 L 702.1 970.3 L 709.1 1033 Z" fill="#221D15" opacity="0.8"/><rect x="791.0" y="1008.0" width="50.5" height="25.0" fill="#221D15" opacity="0.8"/><rect x="961.1" y="1009.7" width="19.8" height="23.3" fill="#221D15" opacity="0.8"/><rect x="1027.5" y="1004.7" width="29.6" height="28.3" fill="#221D15" opacity="0.8"/><circle cx="760" cy="988" r="44" fill="#B0421F"/><rect x="712" y="1001" width="96" height="5" fill="#F2EBDD"/><rect x="712" y="1014" width="96" height="7" fill="#F2EBDD"/><path d="M 161.7 206 Q 170.5 195.0 176 206 Q 181.5 195.0 190.3 206" stroke="#221D15" stroke-width="3.3" fill="none" opacity="0.55" stroke-linecap="round"/><path d="M 226.3 176 Q 233.5 167.0 238 176 Q 242.5 167.0 249.7 176" stroke="#221D15" stroke-width="2.7" fill="none" opacity="0.44" stroke-linecap="round"/><path d="M 284.9 200 Q 290.5 193.0 294 200 Q 297.5 193.0 303.1 200" stroke="#221D15" stroke-width="2.1" fill="none" opacity="0.34" stroke-linecap="round"/><path d="M163.0 1052.0h56.7M1042.1 1052.0h27.8M315.9 1052.0h61.6M159.0 1052.0h29.3M649.2 1052.0h92.5M923.4 1052.0h71.9M910.9 1052.0h94.6M489.2 1052.0h35.5M855.2 1052.0h72.0M102.3 1052.0h44.7M632.8 1052.0h55.3M232.1 1052.0h38.1M847.9 1052.0h49.3M432.8 1052.0h32.5M733.5 1052.0h20.6M634.2 1052.0h69.6M237.1 1052.0h91.2M147.1 1052.0h67.6M516.1 1052.0h30.8M602.2 1052.0h22.1M611.3 1052.0h65.8M847.7 1052.0h94.4M870.9 1052.0h54.5M610.9 1052.0h42.5M714.8 1052.0h90.5" stroke="#221D15" stroke-width="2.1" stroke-linecap="round" fill="none" opacity="0.51"/><path d="M737.1 1053.0h50.8" stroke="#B0421F" stroke-width="2.7" stroke-linecap="round" fill="none" opacity="0.84"/><path d="M304.0 1060.9h96.6M212.1 1060.9h21.2M214.8 1060.9h91.0M960.5 1060.9h83.5M95.0 1060.9h52.2M1018.6 1060.9h36.3M95.0 1060.9h64.4M102.9 1060.9h77.3M430.9 1060.9h91.1M914.2 1060.9h39.7M68.7 1060.9h55.4M499.0 1060.9h73.9M679.4 1060.9h94.3M739.5 1060.9h55.6M472.6 1060.9h26.4M633.6 1060.9h72.3M140.6 1060.9h62.9M919.7 1060.9h33.9M772.9 1060.9h78.7M366.2 1060.9h61.3M609.9 1060.9h55.6M258.4 1060.9h44.0M722.9 1060.9h61.8M778.0 1060.9h88.7M56.6 1060.9h94.7" stroke="#221D15" stroke-width="2.1" stroke-linecap="round" fill="none" opacity="0.50"/><path d="M737.3 1061.9h68.7M745.7 1061.9h68.2" stroke="#B0421F" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.83"/><path d="M659.3 1070.7h26.0M706.2 1070.7h26.0M979.7 1070.7h39.2M405.9 1070.7h66.3M588.7 1070.7h22.4M407.1 1070.7h59.9M1022.2 1070.7h54.3M359.7 1070.7h97.5M834.4 1070.7h34.5M665.1 1070.7h102.1M148.4 1070.7h37.2M978.6 1070.7h106.2M81.2 1070.7h73.8M984.1 1070.7h106.0M985.5 1070.7h63.1M414.0 1070.7h85.6M655.5 1070.7h82.4M269.3 1070.7h58.8M878.3 1070.7h25.9M186.9 1070.7h24.8M488.8 1070.7h87.5M84.3 1070.7h62.1M924.0 1070.7h22.8M985.8 1070.7h95.4" stroke="#221D15" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.49"/><path d="M763.9 1071.7h31.8M745.9 1071.7h26.1" stroke="#B0421F" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.82"/><path d="M969.5 1081.4h64.2M200.8 1081.4h109.3M467.6 1081.4h52.9M322.7 1081.4h53.6M907.8 1081.4h57.8M226.8 1081.4h86.4M602.3 1081.4h58.1M642.3 1081.4h69.9M984.9 1081.4h95.8M72.9 1081.4h100.5M177.8 1081.4h42.8M715.3 1081.4h100.5M1003.0 1081.4h76.4M462.1 1081.4h85.1M909.8 1081.4h42.1M361.2 1081.4h96.6M109.6 1081.4h78.8M757.6 1081.4h93.5M348.8 1081.4h57.4M885.6 1081.4h46.3M89.8 1081.4h110.2M87.4 1081.4h41.4M197.1 1081.4h112.5M465.0 1081.4h95.2" stroke="#221D15" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0.47"/><path d="M729.3 1082.4h69.6M731.4 1082.4h57.5" stroke="#B0421F" stroke-width="2.9" stroke-linecap="round" fill="none" opacity="0.80"/><path d="M846.7 1093.0h26.8M276.1 1093.0h24.8M309.8 1093.0h65.1M744.5 1093.0h71.1M5.5 1093.0h46.8M204.4 1093.0h85.2M891.1 1093.0h48.8M799.3 1093.0h94.1M478.5 1093.0h105.1M556.7 1093.0h80.6M650.7 1093.0h65.4M313.7 1093.0h48.5M742.2 1093.0h34.0M522.5 1093.0h39.3M8.0 1093.0h66.9M264.9 1093.0h88.6M611.4 1093.0h101.2M116.0 1093.0h114.1M478.2 1093.0h113.8M978.7 1093.0h90.5M718.7 1093.0h54.1M699.7 1093.0h73.1M310.3 1093.0h42.0" stroke="#221D15" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.46"/><path d="M722.8 1094.0h46.3" stroke="#B0421F" stroke-width="3.0" stroke-linecap="round" fill="none" opacity="0.79"/><path d="M497.8 1105.5h126.1M149.4 1105.5h84.9M348.3 1105.5h87.9M355.9 1105.5h34.0M608.9 1105.5h58.3M559.8 1105.5h78.7M446.4 1105.5h43.7M13.7 1105.5h120.2M788.9 1105.5h109.7M707.3 1105.5h98.4M315.6 1105.5h65.7M79.1 1105.5h113.1M227.1 1105.5h67.7M572.3 1105.5h84.8M893.5 1105.5h43.8M789.9 1105.5h51.0M315.9 1105.5h109.1M234.6 1105.5h89.6M922.4 1105.5h42.1M334.3 1105.5h33.9M679.0 1105.5h57.2M534.9 1105.5h122.8" stroke="#221D15" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.45"/><path d="M772.4 1106.5h39.2M747.2 1106.5h73.8" stroke="#B0421F" stroke-width="3.1" stroke-linecap="round" fill="none" opacity="0.78"/><path d="M316.1 1118.9h32.0M533.7 1118.9h57.8M178.2 1118.9h48.7M320.2 1118.9h30.5M906.9 1118.9h123.4M791.7 1118.9h55.6M283.5 1118.9h119.9M312.3 1118.9h94.9M796.9 1118.9h73.3M227.0 1118.9h102.3M674.2 1118.9h114.4M509.8 1118.9h47.7M321.9 1118.9h58.4M323.5 1118.9h92.8M60.4 1118.9h72.2M379.7 1118.9h117.1M514.4 1118.9h47.0M172.4 1118.9h119.0M155.4 1118.9h93.8M626.4 1118.9h68.7M290.1 1118.9h125.3M419.1 1118.9h125.9" stroke="#221D15" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.43"/><path d="M740.6 1119.9h56.5M700.8 1119.9h62.6" stroke="#B0421F" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0.76"/><path d="M722.1 1133.2h125.4M568.0 1133.2h40.3M615.0 1133.2h55.1M328.6 1133.2h101.7M247.0 1133.2h79.5M287.5 1133.2h60.3M556.2 1133.2h143.2M542.7 1133.2h49.9M766.8 1133.2h95.1M771.7 1133.2h81.3M666.8 1133.2h83.5M893.7 1133.2h58.9M785.0 1133.2h122.4M658.5 1133.2h132.3M912.9 1133.2h139.9M491.5 1133.2h136.6M758.3 1133.2h55.3M16.0 1133.2h51.7M889.5 1133.2h92.6M421.6 1133.2h39.3M523.7 1133.2h98.1" stroke="#221D15" stroke-width="2.7" stroke-linecap="round" fill="none" opacity="0.39"/><path d="M692.7 1134.2h53.1" stroke="#B0421F" stroke-width="3.3" stroke-linecap="round" fill="none" opacity="0.70"/><path d="M144.7 1148.4h65.1M679.9 1148.4h111.6M503.1 1148.4h136.7M564.9 1148.4h141.1M675.3 1148.4h103.7M869.9 1148.4h93.8M894.6 1148.4h134.8M247.8 1148.4h58.0M339.4 1148.4h62.7M84.4 1148.4h131.5M627.1 1148.4h104.1M910.8 1148.4h92.7M714.6 1148.4h36.4M143.8 1148.4h113.1M370.6 1148.4h65.4M727.6 1148.4h76.6M481.1 1148.4h137.7M650.6 1148.4h136.4M421.1 1148.4h151.3M46.6 1148.4h71.1" stroke="#221D15" stroke-width="2.8" stroke-linecap="round" fill="none" opacity="0.34"/><path d="M717.9 1149.4h47.8M730.5 1149.4h71.7" stroke="#B0421F" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.62"/><path d="M193.9 1164.5h73.9M891.5 1164.5h51.7M91.4 1164.5h129.6M33.2 1164.5h85.5M73.7 1164.5h42.7M248.3 1164.5h137.0M883.9 1164.5h109.2M718.8 1164.5h108.8M444.7 1164.5h47.6M799.7 1164.5h103.6M705.3 1164.5h151.4M87.7 1164.5h58.8M119.1 1164.5h149.3M27.0 1164.5h60.4M154.8 1164.5h136.6M991.4 1164.5h76.7M665.3 1164.5h52.9M88.4 1164.5h128.1M701.9 1164.5h125.9" stroke="#221D15" stroke-width="2.9" stroke-linecap="round" fill="none" opacity="0.30"/><path d="M688.0 1165.5h60.3M724.2 1165.5h41.4" stroke="#B0421F" stroke-width="3.6" stroke-linecap="round" fill="none" opacity="0.55"/><path d="M280.8 1181.5h46.4M935.1 1181.5h102.1M933.1 1181.5h98.2M969.4 1181.5h51.8M848.5 1181.5h156.8M807.5 1181.5h102.2M218.5 1181.5h94.2M724.6 1181.5h125.0M889.5 1181.5h155.2M622.9 1181.5h152.0M216.5 1181.5h79.8M483.7 1181.5h91.1M721.8 1181.5h68.5M251.6 1181.5h80.1M620.4 1181.5h71.3M481.2 1181.5h43.5M638.8 1181.5h149.0M792.4 1181.5h167.1" stroke="#221D15" stroke-width="3.0" stroke-linecap="round" fill="none" opacity="0.25"/><path d="M665.5 1182.5h104.7M687.9 1182.5h100.2" stroke="#B0421F" stroke-width="3.7" stroke-linecap="round" fill="none" opacity="0.48"/><path d="M454.7 1199.4h182.6M475.0 1199.4h156.3M347.8 1199.4h71.4M871.9 1199.4h75.1M252.0 1199.4h137.1M636.5 1199.4h39.1M466.5 1199.4h86.2M512.4 1199.4h41.6M535.6 1199.4h95.4M955.8 1199.4h130.8M1005.0 1199.4h49.2M113.0 1199.4h74.5M861.8 1199.4h66.4M247.5 1199.4h136.4M84.9 1199.4h145.7M787.5 1199.4h182.2M411.3 1199.4h151.4" stroke="#221D15" stroke-width="3.1" stroke-linecap="round" fill="none" opacity="0.21"/><path d="M683.7 1200.4h123.9" stroke="#B0421F" stroke-width="3.8" stroke-linecap="round" fill="none" opacity="0.40"/><path d="M290.0 1218.2h43.9M867.0 1218.2h96.0M454.4 1218.2h131.2M1014.0 1218.2h75.5M135.5 1218.2h166.1M252.5 1218.2h111.1M346.0 1218.2h113.0M607.2 1218.2h83.6M545.8 1218.2h156.1M318.9 1218.2h188.3M642.7 1218.2h178.4M252.5 1218.2h83.5M634.2 1218.2h73.2M442.3 1218.2h185.1M122.0 1218.2h156.2M625.9 1218.2h60.6" stroke="#221D15" stroke-width="3.3" stroke-linecap="round" fill="none" opacity="0.17"/><path d="M628.5 1219.2h104.1M679.4 1219.2h76.7" stroke="#B0421F" stroke-width="4.0" stroke-linecap="round" fill="none" opacity="0.33"/><path d="M404.0 1237.9h167.7M481.6 1237.9h183.0M832.6 1237.9h201.2M165.5 1237.9h172.0M934.4 1237.9h55.2M328.1 1237.9h54.8M159.7 1237.9h74.2M103.5 1237.9h93.6M600.5 1237.9h119.3M458.6 1237.9h69.3M370.2 1237.9h104.7M678.0 1237.9h54.0M297.4 1237.9h110.1M983.0 1237.9h91.4M994.8 1237.9h66.1" stroke="#221D15" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.12"/><path d="M652.1 1238.9h130.4M643.6 1238.9h53.3" stroke="#B0421F" stroke-width="4.1" stroke-linecap="round" fill="none" opacity="0.26"/><path d="M308.7 1258.5h203.0M523.3 1258.5h148.2M898.3 1258.5h90.3M640.7 1258.5h134.9M764.7 1258.5h135.9M652.1 1258.5h182.9M593.9 1258.5h151.6M331.6 1258.5h212.4M614.1 1258.5h120.0M645.6 1258.5h92.7M422.0 1258.5h50.7M27.1 1258.5h150.4M28.7 1258.5h218.1M856.5 1258.5h115.9" stroke="#221D15" stroke-width="3.6" stroke-linecap="round" fill="none" opacity="0.09"/><path d="M615.0 1259.5h83.8" stroke="#B0421F" stroke-width="4.3" stroke-linecap="round" fill="none" opacity="0.19"/><path d="M527.1 1280.0h159.1M307.7 1280.0h113.8M434.5 1280.0h149.3M174.0 1280.0h150.9M723.6 1280.0h175.2M705.0 1280.0h144.0M819.5 1280.0h219.5M60.2 1280.0h70.7M295.3 1280.0h50.6M905.9 1280.0h130.3M357.0 1280.0h140.2M763.2 1280.0h176.2M267.8 1280.0h187.9" stroke="#221D15" stroke-width="3.7" stroke-linecap="round" fill="none" opacity="0.07"/><path d="M827.5 1281.0h56.6M637.7 1281.0h72.1" stroke="#B0421F" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.16"/><path d="M484.6 1302.4h228.1M370.9 1302.4h55.3M410.5 1302.4h50.7M767.0 1302.4h172.2M296.5 1302.4h236.7M16.2 1302.4h167.0M65.1 1302.4h120.6M25.4 1302.4h158.1M706.9 1302.4h110.9M809.3 1302.4h80.8M360.9 1302.4h215.8M195.4 1302.4h79.8" stroke="#221D15" stroke-width="3.9" stroke-linecap="round" fill="none" opacity="0.07"/><path d="M840.7 1303.4h56.2M625.8 1303.4h133.1" stroke="#B0421F" stroke-width="4.6" stroke-linecap="round" fill="none" opacity="0.16"/><path d="M454.6 1325.7h141.0M369.1 1325.7h232.4M880.0 1325.7h72.5M688.6 1325.7h183.9M575.1 1325.7h75.2M745.0 1325.7h242.5M693.9 1325.7h144.2M871.3 1325.7h161.0M248.1 1325.7h232.8M847.0 1325.7h214.1" stroke="#221D15" stroke-width="4.0" stroke-linecap="round" fill="none" opacity="0.06"/><path d="M826.7 1326.7h78.0M593.9 1326.7h169.7" stroke="#B0421F" stroke-width="4.8" stroke-linecap="round" fill="none" opacity="0.15"/></svg></div>`,
    css: `
      .slide{ background:#F2EBDD; color:#221D15; }
      .kickline .rule{ width:34px; height:2px; background:#B0421F; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:.18em; text-transform:uppercase; color:#B0421F; }
      .hook{ font-family:'Laila','Poppins',serif; font-weight:500; font-size:74px; line-height:1.5; color:#221D15; }
      .hook .lat{ font-family:'Poppins'; font-weight:400; }
      .hook b{ color:#B0421F; font-weight:600; }
      .sub{ font-family:'Poppins'; font-weight:300; font-size:31px; color:#8C8474; margin-top:40px; line-height:1.58; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:47px; line-height:1.62; color:#464032; }
      .body b, .poem b{ color:#B0421F; font-weight:500; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:33px; color:#B0421F; }
      .poem{ font-family:'Tiro Devanagari Hindi','Laila',serif; font-weight:400; font-size:64px; line-height:1.72; color:#221D15; }
      .bubble{ border:1.5px solid #d8cfba; border-radius:10px; padding:56px 54px; background:rgba(242,235,221,.6); }
      .bubble .body{ color:#221D15; font-size:48px; }
      .kicker{ font-family:'Tiro Devanagari Hindi','Laila',serif; font-weight:400; font-size:27px; color:#8C8474; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#464032; text-align:center; }
      .profile b{ color:#B0421F; font-weight:600; }
      .brand{ color:#8C8474; } .pageno{ color:#8C8474; }` };
  LOOKS["shirorekha"] = { name: "Shirorekha", chip: "#B0421F", bg: "#FAF7F0", arrow: "#96907F",
    graphic: `<div style="position:absolute;inset:0;"><svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><g transform="translate(986,482) scale(-1.05,1.05)"><path d="M-5 -8 L-5 0 M5 -8 L5 0" stroke="#191510" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="0" cy="-19" rx="17" ry="12" fill="#191510"/><circle cx="13" cy="-31" r="8" fill="#191510"/><path d="M20 -32 L31 -29 L20 -26 Z" fill="#191510"/><path d="M-14 -22 L-34 -30 L-28 -18 Z" fill="#191510"/></g></svg></div>`,
    css: `
      .slide{ background:#FAF7F0; color:#191510; }
      .kickline{ position:absolute; top:-46px; left:4px; margin-bottom:0; }
      .kickline .rule{ width:34px; height:2px; background:#B0421F; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:22px; letter-spacing:.18em; text-transform:uppercase; color:#B0421F; }
      .hook{ position:absolute; left:-92px; right:-92px; top:346px; padding:56px 96px 0; border-top:4px solid #191510; font-family:'Laila','Poppins',serif; font-weight:500; font-size:64px; line-height:1.52; color:#191510; }
      .hook b{ color:#B0421F; font-weight:600; }
      .sub{ display:none; }
      .poem{ position:absolute; left:-92px; right:-92px; top:271px; padding:0 96px; font-family:'Tiro Devanagari Hindi','Laila',serif; font-weight:400; font-size:88px; line-height:210px; color:#191510; background-image:repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 75px, #191510 75px, #191510 79px, rgba(0,0,0,0) 79px, rgba(0,0,0,0) 210px); }
      .poem b{ font-weight:400; color:#B0421F; }
      .body{ position:absolute; left:-92px; right:-92px; top:346px; padding:54px 96px 0; border-top:4px solid #191510; font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:42px; line-height:1.7; color:#2a251c; }
      .body b{ color:#B0421F; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:29px; color:#B0421F; letter-spacing:2px; }
      .bubble{ position:absolute; left:-92px; right:-92px; top:346px; padding:56px 96px 0; border-top:4px solid #191510; }
      .bubble .body{ position:static; border-top:none; padding:0; font-family:'Laila','Poppins',serif; font-weight:400; font-size:52px; line-height:1.6; color:#191510; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:24px; letter-spacing:.18em; text-transform:uppercase; color:#B0421F; margin-top:44px; }
      .profile{ position:absolute; left:-92px; right:-92px; top:346px; padding:60px 96px 0; border-top:4px solid #191510; font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.7; color:#2a251c; text-align:center; }
      .profile b{ color:#191510; font-weight:600; }
      .brand{ color:#96907F; } .pageno{ color:#96907F; }` };
  LOOKS["qatra"] = { name: "Qatra", chip: "#7A2E1D", bg: "#EFE7D7", arrow: "#7A2E1D",
    graphic: `<div style="position:absolute;inset:0;"><svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><defs><filter id="sigQtrPaper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.50  0 0 0 0 0.40  0 0 0 0.55 0"/><feComposite operator="in" in2="SourceGraphic"/></filter><filter id="sigQtrBleed" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.032" numOctaves="4" seed="11" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="52" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="sigQtrFine" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="0.085" numOctaves="3" seed="23" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter></defs><rect x="0" y="0" width="1080" height="1350" filter="url(#sigQtrPaper)" fill="#EFE7D7" opacity="0.5"/><path d="M347.5 1262.3L356.1 1264.0M1054.5 706.2L1056.6 723.9M652.9 532.1L657.3 535.4M168.8 533.7L172.7 539.3M17.9 1246.0L7.5 1248.2M881.2 398.7L887.1 402.5M217.0 856.0L224.0 865.2M290.5 482.7L301.3 486.2M52.0 1102.5L58.2 1119.3M377.1 1038.0L386.5 1053.0M838.9 693.3L835.7 700.2M960.2 185.0L968.7 199.7M111.9 8.2L117.9 24.1M453.0 829.1L457.0 831.7M153.8 997.0L158.4 1007.9M578.5 1242.2L584.9 1244.0M323.4 163.8L309.7 171.7M650.0 281.4L648.4 286.8M482.8 880.4L485.7 886.5M482.3 342.8L479.1 348.2M127.1 631.8L130.0 643.4M676.9 1239.6L684.8 1244.9M207.7 1097.6L194.6 1107.8M498.0 1299.1L511.0 1308.2M888.1 1172.3L893.3 1185.8M471.5 356.0L471.4 360.4M349.0 358.9L346.4 364.8M677.4 1333.6L686.2 1337.9M144.4 789.4L141.1 793.4M994.3 508.2L1010.8 511.1M1073.4 148.4L1068.9 158.0M861.2 920.8L851.0 932.8M594.7 304.4L591.9 313.1M140.3 498.0L146.4 513.9M651.7 1130.8L656.1 1145.2M584.2 1239.6L591.0 1254.1M20.5 944.5L24.8 959.3M567.5 352.9L570.8 356.5M981.9 583.3L979.1 592.4M731.5 751.5L735.3 762.1M724.7 551.7L728.5 568.0M185.9 730.0L181.5 732.7M931.8 1002.3L946.4 1006.0M562.4 527.5L554.0 541.4M295.4 1344.0L294.9 1358.2M812.3 506.5L808.6 514.8M582.9 73.6L578.5 88.9M812.1 397.3L802.8 402.2M346.4 88.4L350.8 88.7M478.0 233.1L487.9 247.7M90.4 284.7L101.9 296.7M888.8 310.2L895.5 310.2M505.6 754.6L510.1 756.0M736.5 851.8L723.2 853.4M292.5 175.2L288.4 186.6M270.8 1109.7L265.3 1112.7" stroke="#B9AD92" stroke-width="1" fill="none" opacity="0.22"/><path d="M255.2 460.0L263.3 470.9M889.7 957.1L892.9 970.3M353.1 148.1L356.7 158.6M831.9 296.4L837.5 305.0M9.5 573.7L23.5 574.9M649.9 887.1L649.3 891.9M77.3 47.8L72.1 53.5M677.9 550.2L670.9 555.0M754.4 260.9L744.6 271.1M248.6 606.1L260.3 616.7M583.7 515.4L588.8 522.5M418.1 1164.4L420.4 1168.0M645.8 530.8L647.2 547.2M697.9 193.7L705.0 193.8M492.5 1341.8L500.2 1356.9M843.8 166.7L847.1 170.7M313.5 1207.9L315.7 1216.6M1023.1 1091.3L1020.7 1095.6M602.2 1088.1L610.8 1094.9M776.9 388.3L771.2 392.3M275.3 602.9L261.0 609.5M467.7 574.3L457.2 581.4M372.6 908.2L373.7 923.7M552.8 507.1L564.0 520.0M55.6 1140.8L48.9 1143.8M1029.1 871.1L1020.8 875.2M34.1 710.2L35.2 720.3M969.3 512.8L969.8 526.5M643.1 117.6L648.2 132.3M47.0 208.3L30.9 213.5M549.6 890.6L541.0 896.8M512.7 46.4L512.0 59.6M653.5 150.0L655.4 154.6M569.9 581.4L559.4 591.5M155.4 181.6L147.3 197.0M694.0 1076.2L694.2 1082.3M612.8 1070.3L619.0 1078.1M975.9 355.1L985.1 366.8M72.2 873.4L64.6 881.9M1023.5 527.2L1018.1 543.7M725.0 756.0L731.3 756.0M447.2 818.8L443.1 833.1M972.2 578.1L982.8 583.0M696.5 172.8L681.2 176.9M901.7 740.8L887.7 744.9M278.5 1027.6L275.3 1040.6M814.0 307.4L812.3 312.5M285.9 531.6L295.4 539.1" stroke="#B9AD92" stroke-width="1" fill="none" opacity="0.3"/><path d="M759.0 666.5L751.7 671.2M50.7 1293.5L55.6 1300.5M1051.8 693.7L1056.5 699.0M81.1 598.0L84.5 605.1M644.5 387.2L637.6 392.6M589.6 9.2L586.0 12.0M596.0 1031.8L599.3 1044.3M454.9 1051.7L456.9 1057.4M328.2 940.9L328.1 948.8M483.7 51.9L485.5 66.4M727.4 1074.7L726.2 1082.3M560.8 1188.2L561.7 1204.7M102.5 862.8L108.1 869.0M436.7 1024.7L444.0 1027.1M580.4 421.1L579.6 435.6M35.1 581.8L48.8 582.0M258.9 16.3L272.2 23.4M144.3 1088.5L134.6 1098.8M993.0 885.6L998.4 889.3M198.7 567.7L194.9 573.3M706.5 1289.3L712.0 1297.3M316.1 313.7L330.8 320.0M457.4 826.0L458.0 831.7M363.1 199.6L373.3 209.1M1076.9 316.6L1067.7 317.5M771.5 1319.2L786.0 1322.3M249.0 902.3L256.1 910.5M391.6 817.6L394.1 831.5M113.1 221.4L109.9 235.0M954.7 537.2L950.3 549.2M661.9 634.8L653.6 635.8M705.5 1303.2L710.1 1313.7M52.2 296.7L44.9 308.5M755.1 464.8L772.4 465.1M1048.2 52.8L1035.8 55.7M726.5 562.1L727.3 573.7" stroke="#B9AD92" stroke-width="1" fill="none" opacity="0.38"/><path d="M610.9 367.0 L633.2 438.0 L589.4 492.6 L531.8 522.1 L488.6 561.1 L440.8 630.9 L375.8 582.0 L331.9 536.6 L293.1 503.8 L255.8 468.6 L166.7 441.2 L155.4 367.0 L200.1 303.2 L183.8 216.3 L294.5 231.8 L333.1 200.2 L376.9 159.5 L426.9 205.9 L512.6 117.2 L527.3 217.4 L546.7 270.5 L622.9 299.2 Z" fill="#4A4030" opacity="0.09" filter="url(#sigQtrBleed)"/><path d="M530.7 377.0 L507.4 427.8 L527.8 506.2 L481.7 554.5 L405.5 525.3 L360.0 592.3 L300.0 572.8 L264.2 516.7 L204.9 496.5 L204.3 430.6 L164.3 377.0 L197.5 321.0 L195.5 250.3 L267.1 241.4 L314.5 228.6 L360.0 226.6 L413.1 203.7 L471.6 214.2 L514.0 258.4 L509.6 325.5 Z" fill="#4A4030" opacity="0.12" filter="url(#sigQtrBleed)"/><path d="M512.1 363.0 L509.5 416.8 L472.0 453.7 L430.7 474.4 L396.1 520.0 L348.2 494.1 L297.5 496.1 L267.5 454.2 L247.3 410.3 L267.2 363.0 L241.5 313.4 L263.3 268.1 L300.0 234.5 L344.1 207.5 L394.3 217.1 L424.1 263.7 L462.4 280.8 L494.3 315.0 Z" fill="#3A3020" opacity="0.28" filter="url(#sigQtrFine)"/><path d="M474.7 342.0 L465.9 373.2 L444.2 394.7 L424.3 414.1 L398.8 424.9 L369.8 433.6 L337.8 428.6 L319.0 400.7 L305.3 372.8 L295.8 342.0 L310.4 313.2 L324.7 288.4 L346.9 272.0 L371.8 262.4 L398.8 259.1 L431.1 257.4 L453.7 280.9 L475.3 307.2 Z" fill="#241E12" opacity="0.9" filter="url(#sigQtrFine)"/><path d="M441.3 347.0 L435.0 370.3 L422.2 389.6 L403.5 402.0 L382.0 405.3 L359.2 405.4 L345.1 386.1 L328.7 370.4 L328.9 347.0 L333.9 325.9 L342.9 305.5 L359.4 289.3 L382.0 290.4 L402.6 294.2 L421.1 305.5 L433.1 324.6 Z" fill="#171208" opacity="1" filter="url(#sigQtrFine)"/><path d="M 349 427 C 346 475 356 503 352 547 C 351 570 357 583 355 598" stroke="#241E12" stroke-width="7.5" fill="none" opacity="0.72" filter="url(#sigQtrFine)" stroke-linecap="round"/><circle cx="354" cy="604" r="6.5" fill="#241E12" opacity="0.78" filter="url(#sigQtrFine)"/><path d="M442.5 488.3L473.6 556.1M480.8 436.4L546.2 491.1M236.6 324.3L214.0 320.0M519.8 360.1L592.1 364.2M254.6 395.8L220.1 407.9M534.8 352.5L615.8 352.8M256.3 315.2L251.3 313.7M373.5 508.0L371.9 547.2M454.0 463.4L496.4 527.2M254.2 350.1L234.3 349.8M254.7 301.2L238.2 294.5M501.9 396.1L554.1 414.9M227.3 296.3L218.6 293.2M530.7 334.4L583.2 328.3M263.6 441.0L241.5 457.9" stroke="#4A4030" stroke-width="0.9" fill="none" opacity="0.18" filter="url(#sigQtrFine)"/><path d="M322.2 226.6L317.8 217.1M340.6 195.6L331.7 160.4M479.5 239.4L509.3 205.6M318.2 237.7L311.9 226.2M510.6 263.0L551.1 235.4M515.5 303.4L577.3 281.3M359.4 506.5L354.0 546.9M328.7 485.7L308.3 538.5M241.7 372.3L223.9 374.9M458.2 235.6L489.5 188.9M233.6 311.4L213.9 306.0M421.9 194.6L430.7 161.2M441.9 511.1L449.7 531.0M253.5 272.4L243.2 266.0M440.9 225.9L465.3 175.6M454.7 207.6L481.9 155.0M319.9 494.9L305.3 529.4M258.5 279.3L239.1 267.6M449.1 479.7L462.4 504.3" stroke="#4A4030" stroke-width="1.3" fill="none" opacity="0.24" filter="url(#sigQtrFine)"/><path d="M251.9 378.1L215.8 385.5M301.1 220.9L287.9 199.0M411.7 493.0L427.4 562.8M511.7 327.7L586.9 313.8M247.5 336.9L225.8 334.5M237.6 321.3L213.6 316.1M325.9 197.1L314.1 163.2M416.4 210.6L426.8 170.2M266.2 426.7L238.5 444.9M268.2 449.6L236.0 477.7M239.7 368.9L219.5 371.3M451.3 242.8L457.9 232.8M507.3 360.8L550.9 363.8M381.1 513.3L381.6 593.7M453.1 471.9L463.7 489.4M463.0 244.9L480.7 222.1M365.0 507.7L358.7 573.4M509.0 294.8L566.2 269.4M285.3 439.5L277.0 447.2M431.3 477.1L453.5 531.1" stroke="#4A4030" stroke-width="1.7" fill="none" opacity="0.30" filter="url(#sigQtrFine)"/><circle cx="372.7" cy="566.5" r="1.1" fill="#241E12" opacity="0.49" filter="url(#sigQtrFine)"/><circle cx="313.4" cy="520.8" r="1.5" fill="#241E12" opacity="0.52" filter="url(#sigQtrFine)"/><circle cx="603.0" cy="375.5" r="3.7" fill="#241E12" opacity="0.34" filter="url(#sigQtrFine)"/><circle cx="240.8" cy="242.7" r="3.5" fill="#241E12" opacity="0.62" filter="url(#sigQtrFine)"/><circle cx="633.8" cy="316.9" r="1.2" fill="#241E12" opacity="0.60" filter="url(#sigQtrFine)"/><circle cx="575.1" cy="280.9" r="2.5" fill="#241E12" opacity="0.35" filter="url(#sigQtrFine)"/><circle cx="612.2" cy="338.5" r="2.2" fill="#241E12" opacity="0.53" filter="url(#sigQtrFine)"/><circle cx="559.9" cy="462.6" r="2.1" fill="#241E12" opacity="0.51" filter="url(#sigQtrFine)"/><circle cx="576.3" cy="219.6" r="1.6" fill="#241E12" opacity="0.67" filter="url(#sigQtrFine)"/><circle cx="444.7" cy="504.4" r="2.4" fill="#241E12" opacity="0.39" filter="url(#sigQtrFine)"/><circle cx="130.7" cy="288.5" r="3.1" fill="#241E12" opacity="0.62" filter="url(#sigQtrFine)"/><circle cx="367.9" cy="151.7" r="3.7" fill="#241E12" opacity="0.50" filter="url(#sigQtrFine)"/></svg></div>`,
    css: `
      .slide{ background:#EFE7D7; color:#211C13; }
      .mid{ justify-content:flex-end; padding-bottom:56px; }
      .kickline{ margin-bottom:40px; }
      .kickline .rule{ width:34px; height:2px; background:#7A2E1D; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:20px; letter-spacing:.28em; text-transform:uppercase; color:#7A2E1D; }
      .hook{ font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:58px; line-height:1.5; color:#211C13; letter-spacing:-.01em; }
      .hook b{ font-weight:700; color:#7A2E1D; }
      .sub{ font-family:'Poppins'; font-weight:500; font-size:23px; color:#8F8672; margin-top:36px; line-height:1.6; }
      .body{ font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:44px; line-height:1.66; color:#3A3324; }
      .body b{ color:#7A2E1D; font-weight:600; }
      .body .num{ font-family:'Poppins'; font-weight:700; font-size:31px; color:#7A2E1D; }
      .poem{ font-family:'Tiro Devanagari Hindi','Laila',serif; font-weight:400; font-size:58px; line-height:1.8; color:#211C13; }
      .poem b{ font-weight:400; color:#7A2E1D; }
      .bubble{ border:1.5px solid #d5cab2; border-radius:10px; padding:54px 52px; background:rgba(255,252,243,.55); }
      .bubble .body{ color:#211C13; font-size:46px; }
      .kicker{ font-family:'Poppins'; font-weight:600; font-size:23px; letter-spacing:.14em; text-transform:uppercase; color:#7A2E1D; margin-top:34px; }
      .profile{ font-family:'Poppins'; font-weight:300; font-size:38px; line-height:1.66; color:#3A3324; text-align:center; }
      .profile b{ color:#7A2E1D; font-weight:600; }
      .brand{ color:#8F8672; } .pageno{ color:#8F8672; }` };
  LOOKS["thehraav"] = { name: "Thehraav", chip: "#9A6A1F", bg: "#E9E6DF", arrow: "#9A6A1F",
    graphic: `<div style="position:absolute;inset:0;"><svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg"><defs><filter id="sigThvGr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.29  0 0 0 0 0.271  0 0 0 0 0.227  0 0 0 0.78 0"/><feComposite operator="in" in2="SourceGraphic"/></filter><filter id="sigThvCl" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0045" numOctaves="3" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.29  0 0 0 0 0.271  0 0 0 0 0.227  0 0 0 0.55 -0.12"/><feComposite operator="in" in2="SourceGraphic"/></filter><radialGradient id="sigThvRG" gradientUnits="userSpaceOnUse" cx="540" cy="680" r="770" gradientTransform="matrix(1 0 0 0.909 0 61.9)"><stop offset="0" stop-color="#000"/><stop offset="0.45" stop-color="#000"/><stop offset="0.55" stop-color="#131313"/><stop offset="0.65" stop-color="#363636"/><stop offset="0.75" stop-color="#656565"/><stop offset="0.85" stop-color="#9d9d9d"/><stop offset="0.95" stop-color="#dcdcdc"/><stop offset="1" stop-color="#fff"/></radialGradient><mask id="sigThvAp"><rect x="0" y="0" width="1080" height="1350" fill="url(#sigThvRG)"/></mask></defs><g mask="url(#sigThvAp)"><rect x="0" y="0" width="1080" height="1350" filter="url(#sigThvGr)" fill="#E9E6DF" opacity="0.5"/><rect x="0" y="0" width="1080" height="1350" filter="url(#sigThvCl)" fill="#E9E6DF" opacity="0.45"/></g><path d="M713.5 1336.1h.01M954.0 243.6h.01M826.5 1080.9h.01M9.3 377.5h.01M582.8 50.9h.01M944.4 9.6h.01M447.2 190.7h.01M599.2 1334.1h.01M867.7 1125.4h.01M572.4 1298.3h.01M1057.2 1126.3h.01M1037.6 234.9h.01M552.4 62.6h.01M401.6 1340.7h.01M890.4 1224.9h.01M190.2 129.1h.01M71.8 1338.1h.01M157.8 1117.1h.01M972.2 453.4h.01M1023.9 878.5h.01M885.9 1283.8h.01M937.3 1211.4h.01M1024.0 1048.1h.01M526.8 192.9h.01M1033.9 165.0h.01M804.3 1342.8h.01M1021.7 1208.8h.01M688.7 1076.4h.01M220.4 1225.6h.01M906.4 1333.8h.01M119.5 1340.5h.01M1073.0 771.9h.01M1067.2 948.1h.01M45.3 10.8h.01M223.2 1261.2h.01M341.4 1294.7h.01M185.2 1212.4h.01M870.7 1093.8h.01M884.5 1266.7h.01M285.3 1228.7h.01M740.6 5.1h.01M752.2 1211.4h.01M306.4 1280.9h.01M825.6 160.2h.01M485.9 45.0h.01M81.0 910.2h.01M37.2 373.0h.01M538.2 48.2h.01M111.0 595.0h.01M875.0 1271.7h.01M1066.3 644.4h.01M1017.6 124.3h.01M1005.8 952.5h.01M1064.5 321.0h.01M1002.6 1245.4h.01M749.4 1268.8h.01M916.8 1276.3h.01M179.2 1252.6h.01M225.8 1273.4h.01M189.7 212.6h.01M77.7 1263.5h.01M1002.3 11.5h.01M91.7 329.1h.01M990.1 1308.9h.01M897.9 1013.8h.01M113.9 43.3h.01M872.8 106.2h.01M764.0 1274.3h.01M7.1 1116.9h.01M831.4 1259.9h.01M932.0 1123.9h.01M452.9 1346.1h.01M1078.0 301.6h.01M890.7 250.2h.01M815.0 1137.8h.01M217.1 13.9h.01M413.7 1337.1h.01M1050.8 482.3h.01M604.7 19.5h.01M65.9 373.7h.01M1051.6 834.9h.01M944.0 16.0h.01M898.4 1064.8h.01M46.3 1185.0h.01M281.5 1329.8h.01M894.9 391.4h.01M37.3 988.4h.01M127.4 157.2h.01M44.3 215.1h.01M249.3 1064.2h.01M100.5 1052.5h.01M738.0 1183.8h.01M114.7 1153.0h.01M68.6 441.1h.01M1009.6 1185.2h.01M829.4 106.0h.01M905.4 1306.6h.01M503.4 1331.1h.01M438.6 119.6h.01M195.9 1123.9h.01M336.4 68.8h.01M572.4 26.5h.01M1037.0 268.2h.01M339.9 1060.0h.01M1078.9 1319.4h.01M941.8 1078.2h.01M771.5 1280.9h.01M460.8 237.7h.01M293.8 1072.5h.01M788.1 44.6h.01M210.8 1283.9h.01M358.7 1326.2h.01M991.2 104.6h.01M233.4 1286.7h.01M112.1 1114.3h.01M885.9 1277.7h.01M140.9 1272.6h.01M981.6 1135.8h.01M30.6 1261.5h.01M602.3 1311.7h.01M850.2 191.5h.01M426.2 1158.1h.01M35.4 1014.5h.01M1041.8 1003.3h.01M102.0 1348.8h.01M715.3 1273.3h.01M226.0 98.0h.01M383.3 56.5h.01M1039.7 404.0h.01M1008.2 872.0h.01M966.9 163.1h.01M661.5 326.7h.01M521.1 38.9h.01M339.4 19.4h.01M981.8 1087.7h.01M141.2 146.8h.01M623.4 141.5h.01M83.8 640.6h.01M114.3 192.7h.01M34.3 332.9h.01M458.1 176.1h.01M940.8 56.4h.01M870.5 24.7h.01M53.9 1330.4h.01M990.5 1054.4h.01M169.3 131.3h.01M797.5 1267.3h.01M573.5 1147.4h.01M869.8 1183.1h.01M956.7 1191.3h.01M875.6 73.4h.01M788.4 1269.4h.01M946.2 1271.7h.01M945.9 147.6h.01M736.3 1137.9h.01M928.6 1028.9h.01M119.0 1115.2h.01M366.6 220.4h.01M285.3 70.1h.01M50.2 1167.8h.01M281.8 315.1h.01M621.2 1291.7h.01M9.2 188.3h.01M27.6 561.0h.01M66.4 1095.5h.01M198.5 220.9h.01M336.9 1195.2h.01M729.0 236.2h.01M239.6 1013.5h.01M928.7 81.1h.01M62.4 1010.8h.01M1060.8 967.0h.01M146.6 1121.4h.01M1072.1 1124.3h.01M26.8 75.8h.01M880.1 1312.7h.01M59.3 815.4h.01M372.3 1168.0h.01M774.2 61.5h.01M864.6 254.9h.01M43.6 1164.4h.01M634.3 253.1h.01M799.5 1139.4h.01M134.4 155.7h.01M41.3 278.8h.01M244.1 267.6h.01M192.3 1349.8h.01M402.4 1242.9h.01M750.9 183.6h.01M214.5 1280.0h.01M19.5 2.1h.01M313.2 1217.4h.01M751.4 1227.0h.01M26.5 215.0h.01" stroke="rgba(74,69,58,.9)" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.26"/><path d="M417.1 2.0h.01M1027.7 51.5h.01M1033.6 1211.6h.01M1041.7 544.1h.01M1071.4 888.7h.01M152.0 356.4h.01M721.8 196.6h.01M726.3 23.4h.01M778.8 1336.9h.01M610.3 1239.4h.01M889.4 90.7h.01M896.4 4.3h.01M971.8 45.5h.01M81.3 1029.2h.01M942.4 1161.5h.01M267.9 83.9h.01M233.9 24.7h.01M14.4 57.5h.01M259.0 1206.5h.01M472.4 256.2h.01M292.3 262.9h.01M365.0 15.9h.01M318.8 210.1h.01M981.9 428.6h.01M153.6 19.7h.01M937.7 1233.1h.01M199.9 117.2h.01M993.7 1251.9h.01M853.4 1249.4h.01M331.6 1331.7h.01M473.8 1324.2h.01M730.9 1174.9h.01M504.3 33.4h.01M818.9 1238.6h.01M807.8 1292.3h.01M36.8 370.8h.01M224.7 1162.5h.01M978.1 142.9h.01M19.6 271.5h.01M98.2 1234.6h.01M929.7 1332.5h.01M212.0 1243.4h.01M160.9 1132.6h.01M754.5 142.2h.01M10.2 865.4h.01M850.6 1330.9h.01M890.2 81.9h.01M710.4 168.2h.01M673.3 26.8h.01M500.6 95.9h.01M73.8 179.7h.01M652.2 113.9h.01M516.5 1038.3h.01M256.7 195.1h.01M854.5 1033.7h.01M1009.6 784.9h.01M843.6 1236.4h.01M1040.2 345.4h.01M882.0 1065.0h.01M1051.6 147.0h.01M897.6 983.0h.01M872.9 70.8h.01M928.9 1094.3h.01M957.7 90.9h.01M23.0 179.1h.01M286.5 70.4h.01M123.4 730.6h.01M924.8 58.2h.01M810.1 35.2h.01M95.4 1282.4h.01M225.1 1300.5h.01M276.7 1295.8h.01M1026.3 1333.8h.01M1011.3 630.1h.01M137.7 105.9h.01M12.0 964.7h.01M1073.6 540.0h.01M999.1 1279.2h.01M1020.3 1281.0h.01M677.5 1298.5h.01M4.8 247.9h.01M862.3 137.5h.01M164.4 1258.6h.01M28.4 304.8h.01M138.3 770.2h.01M296.5 1297.2h.01M21.9 704.3h.01M772.2 139.4h.01M273.0 1078.3h.01M176.1 128.8h.01M305.9 1236.9h.01M866.1 1336.3h.01M63.0 948.2h.01M520.4 34.0h.01M865.7 43.4h.01M141.7 1242.2h.01M212.7 122.9h.01M330.1 1191.1h.01M716.4 1181.1h.01M789.2 1298.5h.01M96.3 1340.7h.01M95.1 1234.3h.01M241.3 1316.7h.01M277.8 109.5h.01M87.5 526.3h.01M520.5 1300.1h.01M141.9 1169.9h.01M42.8 586.0h.01M908.0 137.3h.01M105.5 1190.0h.01M896.0 145.8h.01M30.8 1348.8h.01M632.6 1259.7h.01M386.1 12.2h.01M824.5 1235.1h.01M170.4 366.5h.01M998.0 101.7h.01M518.0 240.5h.01M537.1 1335.4h.01M189.9 149.1h.01M808.6 1251.9h.01M12.3 173.6h.01M243.5 1089.6h.01M812.9 1334.5h.01M782.6 993.4h.01M225.8 1305.3h.01M110.4 1235.5h.01M9.1 98.9h.01M22.1 104.1h.01M846.4 1292.6h.01M1001.4 431.9h.01M355.7 1100.9h.01M482.9 1305.0h.01M988.8 7.9h.01M907.3 1287.6h.01M6.6 113.3h.01M361.4 20.7h.01M247.0 149.0h.01M297.0 7.8h.01M961.1 109.4h.01M89.5 37.4h.01M261.1 37.8h.01M38.5 575.2h.01M287.9 1306.1h.01M758.6 34.7h.01M281.7 163.1h.01M260.8 1327.1h.01M143.9 545.1h.01M1066.2 1285.4h.01M361.8 116.8h.01M513.4 24.9h.01M757.4 1229.6h.01M344.2 167.5h.01M920.1 233.8h.01M126.0 666.1h.01M1012.9 157.6h.01M255.3 217.5h.01" stroke="rgba(74,69,58,.9)" stroke-width="3.7" stroke-linecap="round" fill="none" opacity="0.32"/><path d="M896.9 972.6h.01M533.1 39.5h.01M784.8 1275.5h.01M19.0 1062.6h.01M859.8 85.2h.01M894.2 1224.9h.01M704.9 47.4h.01M929.2 247.2h.01M348.1 1046.0h.01M777.3 22.8h.01M186.6 213.9h.01M861.8 1301.7h.01M634.1 86.5h.01M826.7 1088.1h.01M200.5 1348.2h.01M527.2 1207.6h.01M146.2 1115.0h.01M1048.1 306.1h.01M353.9 1308.3h.01M808.0 48.4h.01M822.1 1181.1h.01M1000.7 1328.2h.01M200.1 1221.1h.01M455.9 151.7h.01M82.3 1195.4h.01M1001.1 1259.7h.01M235.3 970.7h.01M466.6 1087.9h.01M103.1 1172.6h.01M983.8 53.1h.01M661.0 213.5h.01M964.1 38.1h.01M410.5 231.6h.01M375.1 1304.0h.01M127.3 1048.8h.01M201.5 7.6h.01M199.8 1017.3h.01M129.3 164.1h.01M365.5 1285.0h.01M962.1 878.3h.01M963.9 1087.8h.01M1059.1 239.1h.01M960.1 131.0h.01M692.6 1119.2h.01M976.0 81.4h.01M728.8 20.8h.01M523.5 35.9h.01M896.6 324.3h.01M28.5 155.8h.01M412.3 994.0h.01M986.5 938.1h.01M977.6 1099.4h.01M360.2 57.1h.01M567.8 3.5h.01M866.3 151.4h.01M71.4 1122.2h.01M93.9 75.1h.01M168.8 251.9h.01M835.4 196.1h.01M833.0 1232.3h.01M1061.7 1279.3h.01M25.2 308.8h.01M805.5 58.1h.01M299.9 155.6h.01M163.3 248.7h.01M136.2 236.0h.01M830.4 197.2h.01M43.2 770.0h.01M910.5 34.5h.01M301.2 1295.4h.01M241.3 1324.1h.01M1064.1 1247.6h.01M192.1 1183.0h.01M133.7 44.1h.01M1014.5 508.2h.01M25.2 1214.5h.01M1005.2 1136.3h.01M1002.9 634.4h.01M24.6 1248.1h.01M20.4 1039.4h.01M294.4 112.9h.01M44.2 138.8h.01M361.7 25.2h.01M107.4 1045.3h.01M144.2 233.2h.01M428.1 5.7h.01M32.2 112.9h.01M777.8 229.1h.01M1048.1 1113.2h.01M961.1 42.9h.01M739.8 1288.7h.01M129.0 889.4h.01M416.5 1164.1h.01M241.3 115.6h.01M991.6 408.6h.01M163.0 1277.4h.01M882.9 16.9h.01M708.1 145.5h.01M970.4 1309.1h.01M596.6 1349.8h.01M770.3 1310.5h.01M1045.9 245.5h.01M563.0 1281.6h.01M953.2 365.0h.01M366.3 228.3h.01M317.8 1242.4h.01M91.3 1144.5h.01M180.3 41.5h.01M394.8 1267.7h.01M1059.7 1002.3h.01M829.8 68.2h.01M444.0 177.4h.01M855.0 160.4h.01M761.3 220.9h.01M1039.3 1052.2h.01M956.1 320.0h.01M403.7 1271.7h.01M26.0 380.0h.01M121.5 139.1h.01M126.8 1345.0h.01M828.9 292.4h.01M375.1 1140.5h.01M472.5 1184.4h.01M1021.4 168.6h.01M1022.5 427.5h.01M857.6 1183.9h.01M845.4 1178.8h.01M792.8 1156.8h.01M488.7 63.3h.01M73.5 236.7h.01M972.6 1287.9h.01M490.7 25.2h.01M138.9 323.2h.01M1075.9 334.0h.01M469.1 274.8h.01M719.0 1148.8h.01M1056.4 170.7h.01M835.2 1289.5h.01M343.6 22.9h.01M148.0 1248.7h.01M951.8 557.4h.01M171.6 1346.9h.01M452.5 1248.3h.01M379.8 1232.8h.01M55.0 455.7h.01M335.4 1119.2h.01M613.2 1212.8h.01M253.3 1002.5h.01M967.6 1284.5h.01M164.8 425.5h.01M1055.7 1201.5h.01M9.9 176.1h.01M283.3 1077.0h.01M36.1 297.2h.01M88.9 161.5h.01M71.6 58.2h.01M258.7 69.8h.01M714.2 1160.9h.01M796.6 1320.2h.01M931.5 1349.1h.01M440.0 3.3h.01M14.9 1180.3h.01M986.2 1260.4h.01M372.8 1279.9h.01M170.5 1219.5h.01M266.0 87.5h.01M391.4 1219.7h.01M663.6 9.1h.01M59.6 78.0h.01" stroke="rgba(74,69,58,.9)" stroke-width="4.8" stroke-linecap="round" fill="none" opacity="0.38"/><circle cx="927.7" cy="432.9" r="2.2" fill="rgba(74,69,58,1)" opacity="0.15"/><circle cx="76.0" cy="767.5" r="2.6" fill="rgba(74,69,58,1)" opacity="0.10"/><circle cx="956.1" cy="382.6" r="2.5" fill="rgba(74,69,58,1)" opacity="0.10"/><circle cx="7.4" cy="751.1" r="3.0" fill="rgba(74,69,58,1)" opacity="0.15"/><circle cx="114.4" cy="405.7" r="2.4" fill="rgba(74,69,58,1)" opacity="0.15"/><circle cx="804.7" cy="1049.4" r="3.8" fill="rgba(74,69,58,1)" opacity="0.10"/><circle cx="875.9" cy="340.6" r="3.7" fill="rgba(74,69,58,1)" opacity="0.12"/><circle cx="132.6" cy="776.6" r="3.4" fill="rgba(74,69,58,1)" opacity="0.10"/><circle cx="394.7" cy="256.6" r="2.7" fill="rgba(74,69,58,1)" opacity="0.18"/><circle cx="869.7" cy="1043.6" r="2.1" fill="rgba(74,69,58,1)" opacity="0.11"/><circle cx="1000.3" cy="610.9" r="2.0" fill="rgba(74,69,58,1)" opacity="0.08"/><circle cx="1029.2" cy="767.8" r="2.8" fill="rgba(74,69,58,1)" opacity="0.18"/><circle cx="17.3" cy="796.4" r="3.5" fill="rgba(74,69,58,1)" opacity="0.14"/><circle cx="701.4" cy="1074.4" r="3.5" fill="rgba(74,69,58,1)" opacity="0.08"/><circle cx="652.6" cy="318.2" r="2.2" fill="rgba(74,69,58,1)" opacity="0.11"/><circle cx="80.6" cy="618.5" r="3.5" fill="rgba(74,69,58,1)" opacity="0.14"/><circle cx="147.9" cy="847.1" r="3.6" fill="rgba(74,69,58,1)" opacity="0.16"/><circle cx="873.8" cy="1019.5" r="2.6" fill="rgba(74,69,58,1)" opacity="0.10"/></svg></div>`,
    css: `
      .slide{ background:#E9E6DF; color:#1C1912; }
      .kickline{ justify-content:center; margin-bottom:38px; }
      .kickline .rule{ display:none; }
      .kickline .kt{ font-family:'Poppins'; font-weight:600; font-size:20px; letter-spacing:.42em; text-transform:uppercase; color:#9A6A1F; }
      .hook{ align-self:center; max-width:640px; text-align:center; font-family:'Poppins','Laila',sans-serif; font-weight:500; font-size:46px; line-height:1.6; color:#1C1912; letter-spacing:-.005em; }
      .hook b{ font-weight:600; color:#1C1912; }
      .sub{ align-self:center; max-width:600px; text-align:center; font-family:'Poppins'; font-weight:400; font-size:26px; color:#8B8778; margin-top:40px; line-height:1.6; }
      .body{ align-self:center; max-width:660px; text-align:center; font-family:'Poppins','Laila',sans-serif; font-weight:300; font-size:38px; line-height:1.7; color:#2a261c; }
      .body b{ font-weight:600; color:#1C1912; }
      .body .num{ font-family:'Poppins'; font-weight:600; font-size:25px; color:#9A6A1F; letter-spacing:.2em; }
      .poem{ align-self:center; max-width:760px; text-align:center; font-family:'Tiro Devanagari Hindi','Laila',serif; font-weight:400; font-size:54px; line-height:1.9; color:#1C1912; }
      .poem b{ font-weight:400; color:#9A6A1F; }
      .bubble{ align-self:center; max-width:680px; border:none; text-align:center; padding:0; }
      .bubble .body{ font-family:'Laila','Poppins',serif; font-weight:400; font-size:44px; line-height:1.7; color:#1C1912; }
      .kicker{ text-align:center; font-family:'Poppins'; font-weight:600; font-size:21px; letter-spacing:.3em; text-transform:uppercase; color:#9A6A1F; margin-top:46px; }
      .profile{ align-self:center; text-align:center; font-family:'Poppins'; font-weight:300; font-size:36px; line-height:1.7; color:#4A453A; }
      .profile b{ font-weight:600; color:#1C1912; }
      .brand{ color:#8B8778; } .pageno{ color:#8B8778; }` };
  PAL["bhorRekha"] = {"bg":"#F2EBDD","ink":"#221D15","sub":"#8C8474","acc":"#B0421F","acc2":"#8C8474","panel":"#E8DFCC","line":"#d8cfba"};
  PAL["shirorekha"] = {"bg":"#FAF7F0","ink":"#191510","sub":"#96907F","acc":"#B0421F","acc2":"#191510","panel":"#f1ece1","line":"#e2dccc"};
  PAL["qatra"] = {"bg":"#EFE7D7","ink":"#211C13","sub":"#8F8672","acc":"#7A2E1D","acc2":"#4A4030","panel":"#f7f1e3","line":"#d5cab2"};
  PAL["thehraav"] = {"bg":"#E9E6DF","ink":"#1C1912","sub":"#8B8778","acc":"#9A6A1F","acc2":"#4A453A","panel":"#f0ede6","line":"#d6d2c6"};
  GROUP["bhorRekha"] = "Season & Sky";
  GROUP["shirorekha"] = "Literary & Minimal";
  GROUP["qatra"] = "Literary & Minimal";
  GROUP["thehraav"] = "Literary & Minimal";

  var TPL = {};
  TPL["rekha-akhand"] = { cls: "pc-rekhaakhand", fn: v => {
  const raw = String((v && v.poem) || 'दिल आज भी इस बात पर बैठ जाता है,\nमुझे गिराकर वो ख़ुद <span class="t">कैसे संभला होगा!</span>').replace(/\r/g, '');
  const ls = raw.split('\n').filter(l => l.trim());
  const first = ls.shift() || '';
  if (v && v.last) ls.push(String(v.last));
  const rest = ls.map((l, i, a) => `<div class="pl${i === a.length - 1 ? ' last' : ''}">${pu(l)}</div>`).join('');
  return `<div class="gr"></div><div class="fb"></div><div class="vg"></div><div class="wire"></div><div class="dt"></div><div class="hang deva">${pu(first)}</div><div class="rest deva">${rest}</div><div class="mark">${H(v)}</div>`;
} };
  TPL["raakh-hairline"] = { cls: "pc-raakh", fn: v => {
  const vv = (v && v.poem) ? v : Object.assign({}, v, { poem: 'नहीं मरने और नहीं जीने के बीच में\nएक जगह होती है,\nतुम मुझे <span class="t">वहाँ छोड़कर</span> गए थे।' });
  return `<div class="plm"></div><div class="gr"></div><div class="stack deva">${poemLines(vv)}</div><div class="mark">${H(v)}</div>`;
} };
  TPL["deepshikha"] = { cls: "pc-deepshikha", fn: v => {
  const vv = (v && v.poem) ? v : Object.assign({}, v, { poem: 'अब मैं पुराने पते पर रहता नहीं,\nजो मुझसे मिलना है,\nभीतर आया करो।' });
  return `<div class="flm"></div><div class="dawn"></div><div class="gr"></div><div class="orn deva">${DANDA}</div><div class="stack deva">${poemLines(vv)}</div><div class="diya"></div><div class="mark">${H(v)}</div>`;
} };
  TPL["sutra-patra"] = { cls: "pc-sutrapatra", fn: v => {
  const raw = String((v && v.poem) || 'पिंजरा तोड़ने की पहली शर्त है,\nपिंजरे को पहचानना').replace(/\r/g, '');
  const ls = raw.split('\n').filter(l => l.trim());
  if (v && v.last) ls.push(String(v.last));
  const vn = esc((v && v.vnum) || '॥१॥');
  const body = ls.map((l, i, a) => `<div class="pl">${pu(l)}${i === a.length - 1 ? ` <span class="num">${vn}</span>` : ''}</div>`).join('');
  return `<div class="gr"></div><div class="fox"></div><div class="rl t1"></div><div class="rl t2"></div><div class="band"></div><div class="rl b1"></div><div class="rl b2"></div><div class="hole"></div><div class="leaf e1"></div><div class="leaf e2"></div><div class="leaf e3"></div><div class="lbl deva">सूत्र</div><div class="stack deva">${body}</div><div class="mark">${H(v)}</div>`;
} };
  TPL["stambh"] = { cls: "pc-stambh", fn: v => {
  const raw = String((v && v.poem) || 'इतने ग़ुरूर से कोई गया\nहमें छोड़कर,\nहम भी नहीं लौटे\nफिर कभी उस मोड़ पर।').replace(/\r/g, '');
  const ls = raw.split('\n').filter(l => l.trim());
  if (v && v.last) ls.push(String(v.last));
  const nres = Math.max(1, Math.floor(ls.length / 2));
  const body = ls.map((l, i) => `<div class="pl${i >= ls.length - nres ? ' rs' : ''}">${pu(l)}</div>`).join('');
  return `<div class="spk"></div><div class="stn"></div><div class="lt"></div><div class="stack deva"><div class="plumb"></div>${body}</div><div class="mark">${H(v)}</div>`;
} };

  var TPL_CSS = `
/* ===== atelier rekha-akhand ===== */

  .pc-rekhaakhand{ background:#f4efe6; }
  .pc-rekhaakhand .gr{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' seed='26'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); mix-blend-mode:multiply; }
  .pc-rekhaakhand .fb{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Cpath d='M504.5 807l63.9 -0.7M670.2 815l94.2 -0.3M722.8 375.8l131.4 1.9M696.4 404l42.1 -0.9M517.1 952.1l46.3 -1.1M233.4 62.6l102.2 -0.2M978.3 1118.1l156.1 1.4M1069 907.5l99.1 -0.4M471.5 14.3l132.9 -1.1M852.6 968.4l32.1 -2M775 65.9l99.2 -0.8M208.8 104.6l99.8 0.9M1061.5 410.8l48.9 -0.5M766.9 939.9l67 -0.2M813.6 1023.5l41 0.7M260 1275l149.3 0.3M465.2 742.9l76.2 0.6M379.7 773.4l102.5 0.5M484 159.6l89.5 -1.8M570.7 1031.9l91.3 0.8M638.1 646.1l76.2 1.2M81.7 754.4l34.3 0.6M820.5 346.8l33.5 -1.3M404 1087.4l75 0.7M221 925.2l108.9 -1.6M1057.8 866.8l140.3 1.6M483 174.6l97.9 1.5M307.5 405.6l93.1 -1.6M1072.1 235.7l130.6 -0.4M134.2 838.8l69.8 1.5M971.5 87.9l114.5 -0.3M618.8 545.4l118.4 0.1M531.8 314.3l71.5 1.9M510.4 833.5l45 1.8M46.6 131l112.5 -0.9M344.4 894.2l94 -1.1M534.3 1040.4l50 -1.8M564.4 622.1l43.2 1.2M260.9 1108.3l111.2 -1M319.2 1240.5l72.7 -1.6M403.9 305.7l43.8 0.1' stroke='rgb(90,75,55)' stroke-opacity='0.042' stroke-width='.8' fill='none'/%3E%3Cpath d='M855.3 265.7l74 1.4M122.8 1171.7l90.6 -1.1M729.4 745.3l50.2 -2M656.2 151l114.8 0.6M189.3 685.4l105 1.8M366.1 33.4l124.1 -1.8M265.1 925.9l124 -0.4M370.3 757.1l96.1 -0.3M608.9 793.7l56.5 1.5M587.3 1242.5l150.7 1M113.9 1198.9l68.5 -1.5M87.3 797.9l89.9 0.5M709.8 310.8l131.4 -1.6M25.7 204.5l56.3 -1.9M821.7 727.9l132.8 -0.2M1032.2 492.3l58.5 -0.9M983.9 439.8l118.1 -1.8M439.1 38.1l72.5 -0.2M499.2 817.2l51.4 -0.3M462.2 660.9l140 0.2M693.1 1320.4l78.1 -1.4M771.7 829l116.2 -0.2M745.6 1077.6l49.8 -0.6M87 966.1l71.2 -1.7M707.6 843.1l54.8 1.9M881.6 180.5l135.9 -1.4M718.4 411.1l63.4 0.4M569.2 723.6l49.6 -1.7M1075.5 1071.3l42.2 1.1M963.4 445.4l144.1 -1.9M74.6 762.7l38.5 -0.1M126.7 1112.7l31.7 1.5M325.1 770l86.2 -0.5M984.3 1069.6l146.8 -1.1M61.1 1217.3l147 -0.2M756.4 851.6l114.1 0.9M813.8 585.5l81.6 -0.9M702.8 1126.2l155.1 1.9M117.6 985.8l156.4 -1.6M932.5 132.6l74.4 0.4M456.8 149.3l142.3 -1M418.8 693.9l62.3 -0.4M253.6 719.8l119.8 -1.6M292.5 753.2l35.9 -1.3M828.1 1078l130.5 -0.3M622.1 426.1l46.7 1.8M187.4 693.1l85.7 0.5M774.8 282.3l106.9 -0.3M52.3 1327.5l55.6 -0.8M425.4 422.8l39.4 -0.5M569.8 893l81.1 1.3' stroke='rgb(90,75,55)' stroke-opacity='0.016' stroke-width='.8' fill='none'/%3E%3Cpath d='M839.4 1219.7l135.2 -1.8M492.4 586l112.8 1.7M649 1349l58.1 1.3M464.2 480.7l150 0.6M811.8 61l102.8 -1.5M503.3 685.2l55.1 -1.8M777.6 510.1l41.1 1.9M872.5 287.2l110.7 -1.6M1052.6 1296.7l149.9 0.5M971.4 732.9l73.3 -0.9M178.9 505.4l156.6 -1M100.1 1163.8l121.5 -0.7M216.9 488.4l143 -0.7M300.9 241.6l146.1 -0.3M862.7 435.7l118.8 0.3M425.8 839.7l154.3 0M17.9 249.9l62.5 1.4M474.5 399.4l156.5 0.2M255.1 325.3l43.4 0.1M123.3 445.5l93.8 0.9M337.3 557.8l104.5 1.9M347.2 398.4l151.1 1.3M572.5 691.7l127.7 0.4M126.3 938.3l112.1 -2M120 226.6l76.6 -1.6M151.2 637.8l157 -0.6M220.2 682.3l58 1.4M543 342l125.1 -0.6M956.4 464.9l106.2 -1.6M1025.7 236l55.8 0.3M776.7 969.9l100.9 1.2M430.7 1061.2l62.2 1.9M407.1 1209.5l96.5 1.7M681.2 317.2l35.7 0.3M510.9 1054.7l86.9 -1.1M245.9 465.1l84.2 0.3M113.5 1334.1l115.7 -0.3M780.4 435l30.1 1M822.2 719.5l69.3 0.5M502.1 1262.8l60.9 -0.7M380.6 180.9l158.9 0.8M9.3 641.6l49.2 -1.7M745.6 425.5l143.3 -0.2M274.9 989.7l36.3 0.9M77.1 1020.7l65.8 1.2M1041 411.1l71.7 1.6M110.3 967.7l64.5 -0.8M817.7 472.9l118.3 -1.6M808.6 378.8l155.2 0.7M769.4 665l86.7 0.4M313.7 466.9l64.8 1.6M801.4 1013.8l145.5 -1.4M929.4 263l52.9 -1.1M852.6 897.1l47.4 0.9M674.2 272.2l53.6 -0.2M467.6 1317.4l63 1.3M217.9 1218.5l57.7 0.9M405.7 667.6l73.1 -0.9M446.7 11.7l86.6 -0.4' stroke='rgb(90,75,55)' stroke-opacity='0.02' stroke-width='.8' fill='none'/%3E%3Cpath d='M878 948.3l124.5 0.4M398 232.2l56.7 0.7M84.6 828.3l68.6 1.3M959.7 1123.3l148.2 1.3M902.5 935.3l95.9 0.7M380.8 96l139.8 0.1M963.4 415.3l33.9 0.1M873.2 911.4l63.7 1.4M472 530.6l63.6 -1.6M680.7 612l127.7 -2M465.4 404.6l72.1 -1.8M143.3 562.4l31.4 -0.7M1005.4 1297.4l155 -0.2M336.6 771.7l156.7 0.4M1049.4 1097.3l33.8 -2M702.8 259.8l34.7 1.8M207.5 321.1l49.4 0M625.4 437l66.8 1.6M191.6 882.3l147.3 -0.1M285.4 405.2l73.8 -0.6M499.2 677.5l77.8 0.2M593.1 706.6l59 -0.4M5.9 1262.6l136.3 1.1M168.6 447.5l45.7 1.5M1028.6 1134.7l43 1.1M790.7 1345.2l96.7 1.1M866.9 718.7l39.5 0.5M358.3 1261.8l65.6 0.3M1042.3 581.1l95.5 -0.9M99.4 1322.3l125.4 -0.6M889.4 111.7l77.6 -0.9M152.6 270.9l101.7 0.1M244 309.4l137.3 -1M880.5 1336.6l155.2 0.3M91.9 916l150.3 1.2M911.7 1010.7l106.2 1M110.2 508.1l89.2 1.1M125.8 1224.3l73.2 1M365.1 1172.5l35.1 1.8M777.3 724.6l120.1 1.4M1074.4 1284.4l76.8 -0.3M833 126.7l40.4 0.7M382.5 385.8l97.3 -1.1M743.7 1237.6l61.7 1M923.2 204.1l104.8 0.8M748.1 219.2l72.4 -0.1' stroke='rgb(90,75,55)' stroke-opacity='0.027' stroke-width='.8' fill='none'/%3E%3Cpath d='M238.7 1155.3l84.3 -1.6M262.1 1241.4l141.5 1.4M777.6 782.4l35.4 1.2M806.9 712.1l30.9 -1.9M856.7 852.7l103 -2M456.6 1213.7l78.8 -0.4M81.2 111.2l40 1.9M217.4 70.9l116.9 0M215.6 224.2l57.3 -0.3M663.2 13.6l69.6 -1.1M679.6 950.1l106.8 0.8M399.7 827.4l69.8 1.8M257.6 1126.5l119.2 -1.3M480.4 695.6l115 -1.4M709.9 1235.6l71.8 -1.1M526 1332.8l92.9 1.6M461.6 585.1l49.3 -1M1075.2 174l152.7 0.7M854.6 908l54.4 1.7M454.9 662.9l121.6 -2M199.4 456.3l101.3 -1.6M761.9 148.5l73.2 -1.9M189.9 426.5l93.5 -0.7M8.5 744.1l36.1 -1.2M960.8 219l135.9 -1.3M618.8 584.4l153.8 0.3M231.4 466.2l110.4 1.3M893.7 1117.6l35.8 0.2M218.7 45.8l127.2 1.7M750.7 892.7l48.5 -0.8M305 1312.2l129.4 -0.6M907 859.5l153.8 0.9M312 1281l153.6 1M587.7 1297.7l30.2 1.8M236.3 51.7l121.5 0.4M866.6 494.8l122.6 -0.6M27.3 235.5l135.5 -1.8M966.9 718.5l124.1 -0.6M468.4 498.1l139.2 -0.9M293.9 1320.3l120 0.1M81.5 200.2l72.1 -1.6M294.5 758.5l77.4 1M89.2 153.3l157.4 0.2' stroke='rgb(90,75,55)' stroke-opacity='0.023' stroke-width='.8' fill='none'/%3E%3Cpath d='M81.9 28.3l56.8 0.8M63.1 257.8l154 0.6M100.8 842.7l86.9 1.9M394 472.5l65.9 -1.8M50.5 1163.3l117 -0.3M164.8 710.5l71.8 1.9M1071.9 361l58.8 -0.4M864.3 465.7l39 0.6M724.1 1017.1l133.9 1.6M385.7 760.7l38.8 -1.4M951.7 944l45.1 -0.7M665 183.5l30.6 2M803.9 1319.3l111 1.9M247.8 745.9l136.1 -1.2M119.3 122.5l142.7 1.4M688.4 385l90.8 1M380.4 339.6l154.8 1.5M787.4 420l145.7 -0.8M183.4 1326.5l148.4 -1.5M277.1 990.2l115.1 -1.5M929.4 1128.1l74.3 -0.2M509.4 159.8l45.8 -1.4M471 770.7l108.2 1.7M732.2 1118l146.4 -1.6M196.6 1140.3l52.8 0.8M1039.2 461l106.4 -1M109 1214.5l137.9 -0.5M272.1 228.1l132.7 1.6M267.5 122l145.1 1M976.8 202.2l115.1 -0.9M775.1 1091.3l132.1 -1.8' stroke='rgb(90,75,55)' stroke-opacity='0.031' stroke-width='.8' fill='none'/%3E%3Cpath d='M3.2 213.3l47.4 -0.1M672 1293.9l61.7 0.8M158.6 141.1l125.1 -0.2M476.6 1209.9l150.5 1.8M399 35l140.5 -0.8M100.2 308.9l116.4 -1.5M919.2 677l89.6 -0.5M992 90.1l80.7 1.9M648.4 185.9l126.2 -1.7M246.1 795l36.8 -1.7M315.9 792.1l93.8 -1.4M916.5 1204.8l99.8 0.1M885.4 1084l72.7 -1.1M888.3 1158.1l141.8 -1.6M520.2 1204.3l140.5 -0.7M766.4 34.9l46.8 -0.8M147.7 110.3l150 1.2M252.8 1074.5l122.8 0.3M432.7 624.1l38.3 -1M76.7 1270.6l91.8 -0.5M429.3 80.4l120.6 -1.5M426.1 743.7l96 -1.4M711.8 554.4l126 -1.7M740.6 1317.5l83.9 -1.4M277.7 986.2l145 -1.2M1011.1 612.4l38.5 1.9M62.5 1211.8l74.9 -1.6M345 1208.3l99.9 -0.6M1077.5 1184.4l94.4 -0.6M515.9 1290.1l152.1 0.2M565.2 392.8l52.2 0.3M350.8 145.4l135.3 1.7M906.3 827.8l118.3 0.5M205.6 795.7l52.4 1.9M257 1304.3l48.3 -1M1003.4 1120l150.9 -1.5M342.9 427.9l72.4 0.6M994.7 603.8l127.7 1.7M196.9 1163.2l49.7 -0.4M86.4 197.6l57.4 1.3M284 411.5l62.7 -0.2M127.5 644.7l159 1.6M56.4 287.3l95.1 0.6M263.1 589.9l98.7 -1.9M1009 817l94.7 -0.5M759 525.6l116.8 0.6M674.9 3.6l60.9 -0.9M573.7 1168.5l67.6 -1.4M591.9 29.4l112.9 1.4M750.5 654.1l51 0.2M398.3 499.9l43.6 1.6M554.7 90.7l64 -1.1M751.4 597.5l126 -0.7' stroke='rgb(90,75,55)' stroke-opacity='0.039' stroke-width='.8' fill='none'/%3E%3Cpath d='M246.8 1108.1l159.3 0.8M748.9 335.3l61.8 -1.4M631.6 778.6l159.8 1M630 572.9l79.2 0.3M183.9 1298.6l88.4 -1M633.3 862.5l150.5 0M8.9 727.6l155.4 -0.1M1017.9 1239.8l47 2M542 440.2l60.6 -0.7M572.7 48.1l63.7 0.8M1075.5 951l73.8 -1.8M256.3 62.9l108.2 -2M409.2 762.1l102.1 -1.7M1073.1 10.7l39.5 1.8M1055.5 783.2l114 -1.6M775.1 856.4l58.3 -0.4M750.3 1007.6l79.6 1.1M305.5 329.2l45.8 -1.7M729 144.9l42.3 -1.8M1050 854.9l106.8 -1.5M486.8 234.1l54 2M952.2 257.3l129.1 1M835.4 339.7l30.9 0M171.7 266.4l37.1 -0.7M775 429.1l146.7 1.2M413.2 1268.5l53 -0.5M468.4 805l98.1 0.8M424.1 920.1l57.2 0.7M236.7 291.1l86.5 0.6M914.7 474.3l108.5 1.3M251.2 504.3l142 -0.9M206.1 1009.4l113.7 -2M712.8 1030.7l138.2 0.8M351 237.9l118.3 -1M348.8 883.5l118.9 1.4M362.1 1304.8l104.4 -0.5M598.6 1009.4l135.2 -0.9M1009.2 652.1l91.1 -0.6M222.3 1241.1l101.4 0.3M581.4 1207.3l77.6 -1.4M634 291.1l145.8 1.3M128.9 653.9l95.9 0.4M845.6 186.6l158.1 -1.7M788.4 200.8l33.2 -1.6M857.6 528.1l142.4 -1.3M671.6 1342.4l134.8 0M944.8 123l74.7 1.7M363.1 1172.6l147.2 1.4M74 826.3l89.6 -1.6M869.9 534.4l87 0M793.1 528.4l94.1 0.2M696.4 443.6l32.9 -1.9M78.4 771.9l146.2 1.3M482.7 1004.9l58.7 1.1M790.7 443.7l78.4 0.9M885.6 826.2l66 0.6' stroke='rgb(90,75,55)' stroke-opacity='0.035' stroke-width='.8' fill='none'/%3E%3C/svg%3E"); background-size:1080px 1350px; mix-blend-mode:multiply; }
  .pc-rekhaakhand .vg{ position:absolute; inset:0; z-index:1; background:radial-gradient(1000px circle at 540px 668px, rgba(0,0,0,0) 42%, rgba(75,60,40,.10) 100%); }
  .pc-rekhaakhand .wire{ position:absolute; left:0; right:0; top:536px; height:3px; background:#191713; z-index:2; }
  .pc-rekhaakhand .dt{ position:absolute; top:532px; left:1006px; width:11px; height:11px; border-radius:50%; background:#a8321f; z-index:4; }
  .pc-rekhaakhand .hang{ position:absolute; left:0; right:0; top:520px; z-index:3; text-align:center;
      font-family:'Kohinoor Devanagari','Noto Sans Devanagari',sans-serif; font-weight:500;
      font-size:64px; line-height:1; color:#191713; }
  .pc-rekhaakhand .rest{ position:absolute; left:60px; right:60px; top:734px; z-index:3; text-align:center; }
  .pc-rekhaakhand .rest .pl{ font-family:'Kohinoor Devanagari','Noto Sans Devanagari',sans-serif;
      font-weight:500; font-size:64px; line-height:1.6; color:#191713; }
  .pc-rekhaakhand .rest .pl.last{ color:#191713; }
  .pc-rekhaakhand .rest .pl .t{ color:#a8321f; }
  .pc-rekhaakhand .mark{ left:0; right:0; bottom:96px; text-align:center; font-weight:500; font-size:22px;
      letter-spacing:.34em; color:#191713; opacity:.34; }

/* ===== atelier raakh-hairline ===== */

  .pc-raakh{ background:linear-gradient(180deg,#101017 0,#0c0c10 55%,#0a0a0d 100%); }
  .pc-raakh .plm{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Cdefs%3E%3CradialGradient id='p0'%3E%3Cstop offset='0' stop-color='rgb(70,68,84)'/%3E%3Cstop offset='1' stop-color='rgb(70,68,84)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='p1'%3E%3Cstop offset='0' stop-color='rgb(62,60,76)'/%3E%3Cstop offset='1' stop-color='rgb(62,60,76)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='p2'%3E%3Cstop offset='0' stop-color='rgb(74,70,86)'/%3E%3Cstop offset='1' stop-color='rgb(74,70,86)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='p3'%3E%3Cstop offset='0' stop-color='rgb(58,56,72)'/%3E%3Cstop offset='1' stop-color='rgb(58,56,72)' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='277.2' cy='710.6' r='32.4' fill='url(%23p0)' opacity='0.028'/%3E%3Ccircle cx='259.9' cy='695.5' r='32.4' fill='url(%23p0)' opacity='0.027'/%3E%3Ccircle cx='263' cy='678.9' r='32' fill='url(%23p0)' opacity='0.027'/%3E%3Ccircle cx='256.6' cy='664.1' r='31.8' fill='url(%23p0)' opacity='0.026'/%3E%3Ccircle cx='270.2' cy='654.3' r='31.9' fill='url(%23p0)' opacity='0.025'/%3E%3Ccircle cx='271.7' cy='644.3' r='31.8' fill='url(%23p0)' opacity='0.025'/%3E%3Ccircle cx='263.3' cy='619.3' r='31.6' fill='url(%23p0)' opacity='0.024'/%3E%3Ccircle cx='244.2' cy='598.8' r='31.2' fill='url(%23p0)' opacity='0.024'/%3E%3Ccircle cx='260.4' cy='589.2' r='31.3' fill='url(%23p0)' opacity='0.023'/%3E%3Ccircle cx='282.5' cy='574.6' r='31.4' fill='url(%23p0)' opacity='0.022'/%3E%3Ccircle cx='288' cy='553.9' r='31.1' fill='url(%23p0)' opacity='0.022'/%3E%3Ccircle cx='269.5' cy='538.3' r='30.9' fill='url(%23p0)' opacity='0.021'/%3E%3Ccircle cx='269.8' cy='525.1' r='30.9' fill='url(%23p0)' opacity='0.02'/%3E%3Ccircle cx='282.4' cy='514' r='30.5' fill='url(%23p0)' opacity='0.02'/%3E%3Ccircle cx='297.4' cy='499' r='30.5' fill='url(%23p0)' opacity='0.019'/%3E%3Ccircle cx='315' cy='482.3' r='30.5' fill='url(%23p0)' opacity='0.018'/%3E%3Ccircle cx='332.6' cy='471.4' r='30.3' fill='url(%23p0)' opacity='0.018'/%3E%3Ccircle cx='340.1' cy='457.7' r='30.3' fill='url(%23p0)' opacity='0.017'/%3E%3Ccircle cx='361.2' cy='431.7' r='30.1' fill='url(%23p0)' opacity='0.017'/%3E%3Ccircle cx='370.4' cy='410.9' r='29.8' fill='url(%23p0)' opacity='0.016'/%3E%3Ccircle cx='380.2' cy='401.7' r='29.8' fill='url(%23p0)' opacity='0.015'/%3E%3Ccircle cx='400.2' cy='380.6' r='29.9' fill='url(%23p0)' opacity='0.015'/%3E%3Ccircle cx='401.2' cy='360.8' r='29.7' fill='url(%23p0)' opacity='0.014'/%3E%3Ccircle cx='384.2' cy='340.4' r='29.7' fill='url(%23p0)' opacity='0.013'/%3E%3Ccircle cx='400.8' cy='324.9' r='29.5' fill='url(%23p0)' opacity='0.013'/%3E%3Ccircle cx='403.4' cy='306.5' r='29.5' fill='url(%23p0)' opacity='0.012'/%3E%3Ccircle cx='415.9' cy='281.1' r='29.4' fill='url(%23p0)' opacity='0.011'/%3E%3Ccircle cx='431.5' cy='271.6' r='29.2' fill='url(%23p0)' opacity='0.011'/%3E%3Ccircle cx='428' cy='250.4' r='28.9' fill='url(%23p0)' opacity='0.01'/%3E%3Ccircle cx='419.5' cy='232.4' r='29' fill='url(%23p0)' opacity='0.01'/%3E%3Ccircle cx='418' cy='210.1' r='28.9' fill='url(%23p0)' opacity='0.009'/%3E%3Ccircle cx='407.5' cy='192.9' r='28.7' fill='url(%23p0)' opacity='0.008'/%3E%3Ccircle cx='406.6' cy='184.5' r='28.6' fill='url(%23p0)' opacity='0.008'/%3E%3Ccircle cx='398.3' cy='164.6' r='28.6' fill='url(%23p0)' opacity='0.007'/%3E%3Ccircle cx='390' cy='145.3' r='28.6' fill='url(%23p0)' opacity='0.006'/%3E%3Ccircle cx='373.5' cy='121' r='28.4' fill='url(%23p0)' opacity='0.006'/%3E%3Ccircle cx='392.9' cy='102.1' r='28.2' fill='url(%23p0)' opacity='0.005'/%3E%3Ccircle cx='387.8' cy='92.6' r='28.3' fill='url(%23p0)' opacity='0.004'/%3E%3Ccircle cx='392.7' cy='80.7' r='28.2' fill='url(%23p0)' opacity='0.004'/%3E%3Ccircle cx='413.7' cy='68.5' r='28' fill='url(%23p0)' opacity='0.003'/%3E%3Ccircle cx='431.5' cy='49.4' r='27.8' fill='url(%23p0)' opacity='0.003'/%3E%3Ccircle cx='412.8' cy='24.7' r='27.7' fill='url(%23p0)' opacity='0.002'/%3E%3Ccircle cx='423.9' cy='-2.6' r='27.6' fill='url(%23p0)' opacity='0.001'/%3E%3Ccircle cx='444.5' cy='-14.1' r='27.3' fill='url(%23p0)' opacity='0.001'/%3E%3Ccircle cx='658.6' cy='755.7' r='47.4' fill='url(%23p1)' opacity='0.028'/%3E%3Ccircle cx='664.4' cy='732.2' r='47.4' fill='url(%23p1)' opacity='0.027'/%3E%3Ccircle cx='660.8' cy='710.2' r='46.9' fill='url(%23p1)' opacity='0.027'/%3E%3Ccircle cx='673.6' cy='693.6' r='46.7' fill='url(%23p1)' opacity='0.026'/%3E%3Ccircle cx='689.7' cy='666.3' r='46.3' fill='url(%23p1)' opacity='0.026'/%3E%3Ccircle cx='673.5' cy='647' r='46.3' fill='url(%23p1)' opacity='0.025'/%3E%3Ccircle cx='653.9' cy='637.7' r='45.9' fill='url(%23p1)' opacity='0.025'/%3E%3Ccircle cx='655.8' cy='613.8' r='45.9' fill='url(%23p1)' opacity='0.024'/%3E%3Ccircle cx='678.6' cy='587.1' r='45.6' fill='url(%23p1)' opacity='0.024'/%3E%3Ccircle cx='657.4' cy='570.1' r='45.2' fill='url(%23p1)' opacity='0.023'/%3E%3Ccircle cx='673.1' cy='556.6' r='45.4' fill='url(%23p1)' opacity='0.023'/%3E%3Ccircle cx='659.7' cy='529' r='45.1' fill='url(%23p1)' opacity='0.022'/%3E%3Ccircle cx='653.2' cy='506.9' r='45.1' fill='url(%23p1)' opacity='0.022'/%3E%3Ccircle cx='638.5' cy='498.1' r='45.1' fill='url(%23p1)' opacity='0.021'/%3E%3Ccircle cx='642.7' cy='487.1' r='44.6' fill='url(%23p1)' opacity='0.02'/%3E%3Ccircle cx='665.7' cy='472.9' r='44.3' fill='url(%23p1)' opacity='0.02'/%3E%3Ccircle cx='674' cy='447.1' r='44.1' fill='url(%23p1)' opacity='0.019'/%3E%3Ccircle cx='690.8' cy='421.7' r='44.1' fill='url(%23p1)' opacity='0.019'/%3E%3Ccircle cx='696.8' cy='407.1' r='43.8' fill='url(%23p1)' opacity='0.018'/%3E%3Ccircle cx='674.5' cy='398.2' r='43.6' fill='url(%23p1)' opacity='0.018'/%3E%3Ccircle cx='669.7' cy='375.3' r='43.6' fill='url(%23p1)' opacity='0.017'/%3E%3Ccircle cx='681.3' cy='357.1' r='43.5' fill='url(%23p1)' opacity='0.017'/%3E%3Ccircle cx='665.3' cy='342.6' r='43.4' fill='url(%23p1)' opacity='0.016'/%3E%3Ccircle cx='679.2' cy='327.9' r='43' fill='url(%23p1)' opacity='0.016'/%3E%3Ccircle cx='700.5' cy='316.4' r='42.5' fill='url(%23p1)' opacity='0.015'/%3E%3Ccircle cx='708.4' cy='299.2' r='42.2' fill='url(%23p1)' opacity='0.015'/%3E%3Ccircle cx='730.1' cy='280.3' r='42.3' fill='url(%23p1)' opacity='0.014'/%3E%3Ccircle cx='720.6' cy='257.9' r='42.1' fill='url(%23p1)' opacity='0.013'/%3E%3Ccircle cx='719.1' cy='236.5' r='42' fill='url(%23p1)' opacity='0.013'/%3E%3Ccircle cx='725.3' cy='220.1' r='41.9' fill='url(%23p1)' opacity='0.012'/%3E%3Ccircle cx='706.3' cy='201.1' r='41.9' fill='url(%23p1)' opacity='0.012'/%3E%3Ccircle cx='713.2' cy='183.7' r='41.8' fill='url(%23p1)' opacity='0.011'/%3E%3Ccircle cx='718.7' cy='165.7' r='41.5' fill='url(%23p1)' opacity='0.011'/%3E%3Ccircle cx='728.9' cy='140.1' r='41.3' fill='url(%23p1)' opacity='0.01'/%3E%3Ccircle cx='745' cy='115.9' r='41' fill='url(%23p1)' opacity='0.01'/%3E%3Ccircle cx='752.4' cy='101.8' r='40.9' fill='url(%23p1)' opacity='0.009'/%3E%3Ccircle cx='760.6' cy='82.5' r='40.8' fill='url(%23p1)' opacity='0.009'/%3E%3Ccircle cx='765.7' cy='69.9' r='40.6' fill='url(%23p1)' opacity='0.008'/%3E%3Ccircle cx='779.3' cy='49.1' r='40.3' fill='url(%23p1)' opacity='0.008'/%3E%3Ccircle cx='792.6' cy='34.8' r='40.1' fill='url(%23p1)' opacity='0.007'/%3E%3Ccircle cx='808.7' cy='14.2' r='39.8' fill='url(%23p1)' opacity='0.006'/%3E%3Ccircle cx='829.6' cy='-9.6' r='39.6' fill='url(%23p1)' opacity='0.006'/%3E%3Ccircle cx='827.6' cy='-20.1' r='39.6' fill='url(%23p1)' opacity='0.005'/%3E%3Ccircle cx='850.3' cy='-29.1' r='39.3' fill='url(%23p1)' opacity='0.005'/%3E%3Ccircle cx='835.5' cy='-37.8' r='39.4' fill='url(%23p1)' opacity='0.004'/%3E%3Ccircle cx='852.9' cy='-54.4' r='39.2' fill='url(%23p1)' opacity='0.004'/%3E%3Ccircle cx='859.8' cy='-65.3' r='39.2' fill='url(%23p1)' opacity='0.003'/%3E%3Ccircle cx='878.5' cy='-77.7' r='38.7' fill='url(%23p1)' opacity='0.003'/%3E%3Ccircle cx='857.3' cy='-105.4' r='38.8' fill='url(%23p1)' opacity='0.002'/%3E%3Ccircle cx='847.2' cy='-127.2' r='38.7' fill='url(%23p1)' opacity='0.002'/%3E%3Ccircle cx='829.5' cy='-153.2' r='38.4' fill='url(%23p1)' opacity='0.001'/%3E%3Ccircle cx='806.6' cy='-169.4' r='38.5' fill='url(%23p1)' opacity='0.001'/%3E%3Ccircle cx='841.5' cy='612.8' r='46.8' fill='url(%23p2)' opacity='0.028'/%3E%3Ccircle cx='848.2' cy='593.1' r='46.6' fill='url(%23p2)' opacity='0.027'/%3E%3Ccircle cx='848.2' cy='582.3' r='46.7' fill='url(%23p2)' opacity='0.027'/%3E%3Ccircle cx='855' cy='564.7' r='46.5' fill='url(%23p2)' opacity='0.026'/%3E%3Ccircle cx='835.4' cy='542.6' r='46.1' fill='url(%23p2)' opacity='0.025'/%3E%3Ccircle cx='849.4' cy='523.6' r='46.1' fill='url(%23p2)' opacity='0.024'/%3E%3Ccircle cx='849.9' cy='513.7' r='46' fill='url(%23p2)' opacity='0.024'/%3E%3Ccircle cx='870' cy='488.4' r='45.5' fill='url(%23p2)' opacity='0.023'/%3E%3Ccircle cx='851.7' cy='460.8' r='45.4' fill='url(%23p2)' opacity='0.022'/%3E%3Ccircle cx='867.7' cy='433.9' r='45.3' fill='url(%23p2)' opacity='0.021'/%3E%3Ccircle cx='869.3' cy='407.4' r='44.9' fill='url(%23p2)' opacity='0.021'/%3E%3Ccircle cx='891.6' cy='385.1' r='44.8' fill='url(%23p2)' opacity='0.02'/%3E%3Ccircle cx='903.8' cy='376.9' r='44.7' fill='url(%23p2)' opacity='0.019'/%3E%3Ccircle cx='883' cy='366.1' r='44.3' fill='url(%23p2)' opacity='0.018'/%3E%3Ccircle cx='869.6' cy='341.9' r='43.8' fill='url(%23p2)' opacity='0.018'/%3E%3Ccircle cx='877' cy='327.2' r='43.3' fill='url(%23p2)' opacity='0.017'/%3E%3Ccircle cx='875.3' cy='300.4' r='43.1' fill='url(%23p2)' opacity='0.016'/%3E%3Ccircle cx='878.4' cy='290.8' r='42.8' fill='url(%23p2)' opacity='0.015'/%3E%3Ccircle cx='866.4' cy='263.7' r='42.6' fill='url(%23p2)' opacity='0.015'/%3E%3Ccircle cx='845.5' cy='241.5' r='42.2' fill='url(%23p2)' opacity='0.014'/%3E%3Ccircle cx='837.5' cy='219.3' r='42' fill='url(%23p2)' opacity='0.013'/%3E%3Ccircle cx='817' cy='204.4' r='41.7' fill='url(%23p2)' opacity='0.013'/%3E%3Ccircle cx='807.5' cy='192.5' r='41.2' fill='url(%23p2)' opacity='0.012'/%3E%3Ccircle cx='787.8' cy='167.5' r='41.3' fill='url(%23p2)' opacity='0.011'/%3E%3Ccircle cx='790.5' cy='157.5' r='40.9' fill='url(%23p2)' opacity='0.01'/%3E%3Ccircle cx='777.2' cy='143.8' r='40.5' fill='url(%23p2)' opacity='0.01'/%3E%3Ccircle cx='795.3' cy='116.4' r='40.3' fill='url(%23p2)' opacity='0.009'/%3E%3Ccircle cx='774.5' cy='102.3' r='39.8' fill='url(%23p2)' opacity='0.008'/%3E%3Ccircle cx='765.1' cy='76.6' r='39.6' fill='url(%23p2)' opacity='0.007'/%3E%3Ccircle cx='753.7' cy='63.1' r='39.6' fill='url(%23p2)' opacity='0.007'/%3E%3Ccircle cx='760.6' cy='48.1' r='39.5' fill='url(%23p2)' opacity='0.006'/%3E%3Ccircle cx='768' cy='20.2' r='39.5' fill='url(%23p2)' opacity='0.005'/%3E%3Ccircle cx='764.6' cy='2.8' r='39.5' fill='url(%23p2)' opacity='0.004'/%3E%3Ccircle cx='760.9' cy='-10.6' r='39.1' fill='url(%23p2)' opacity='0.004'/%3E%3Ccircle cx='759.6' cy='-19' r='38.6' fill='url(%23p2)' opacity='0.003'/%3E%3Ccircle cx='745.3' cy='-40.5' r='38.6' fill='url(%23p2)' opacity='0.002'/%3E%3Ccircle cx='730.9' cy='-60.2' r='38.7' fill='url(%23p2)' opacity='0.001'/%3E%3Ccircle cx='708.3' cy='-71.5' r='38.4' fill='url(%23p2)' opacity='0.001'/%3E%3Ccircle cx='172.7' cy='608.5' r='42.5' fill='url(%23p3)' opacity='0.028'/%3E%3Ccircle cx='182.9' cy='588' r='42.3' fill='url(%23p3)' opacity='0.027'/%3E%3Ccircle cx='192.1' cy='571.5' r='42.1' fill='url(%23p3)' opacity='0.026'/%3E%3Ccircle cx='203.1' cy='551.4' r='41.8' fill='url(%23p3)' opacity='0.025'/%3E%3Ccircle cx='181.2' cy='538.9' r='41.9' fill='url(%23p3)' opacity='0.025'/%3E%3Ccircle cx='204' cy='517.5' r='42' fill='url(%23p3)' opacity='0.024'/%3E%3Ccircle cx='197.6' cy='507.2' r='42.1' fill='url(%23p3)' opacity='0.023'/%3E%3Ccircle cx='177.6' cy='489.1' r='42.1' fill='url(%23p3)' opacity='0.022'/%3E%3Ccircle cx='199.9' cy='464.3' r='42' fill='url(%23p3)' opacity='0.021'/%3E%3Ccircle cx='221.6' cy='438.7' r='41.5' fill='url(%23p3)' opacity='0.02'/%3E%3Ccircle cx='227.9' cy='419.2' r='41.6' fill='url(%23p3)' opacity='0.019'/%3E%3Ccircle cx='239.3' cy='394.5' r='41.5' fill='url(%23p3)' opacity='0.018'/%3E%3Ccircle cx='231.7' cy='382.1' r='41.6' fill='url(%23p3)' opacity='0.018'/%3E%3Ccircle cx='230.4' cy='361.7' r='41.3' fill='url(%23p3)' opacity='0.017'/%3E%3Ccircle cx='220.2' cy='345.8' r='41.3' fill='url(%23p3)' opacity='0.016'/%3E%3Ccircle cx='213.8' cy='332.1' r='41.1' fill='url(%23p3)' opacity='0.015'/%3E%3Ccircle cx='224.4' cy='323.5' r='40.9' fill='url(%23p3)' opacity='0.014'/%3E%3Ccircle cx='228.3' cy='312.6' r='40.5' fill='url(%23p3)' opacity='0.013'/%3E%3Ccircle cx='222.2' cy='303.1' r='40.5' fill='url(%23p3)' opacity='0.012'/%3E%3Ccircle cx='240.3' cy='290.8' r='40.4' fill='url(%23p3)' opacity='0.011'/%3E%3Ccircle cx='235' cy='274.7' r='40.4' fill='url(%23p3)' opacity='0.011'/%3E%3Ccircle cx='243.1' cy='257.5' r='40' fill='url(%23p3)' opacity='0.01'/%3E%3Ccircle cx='243.4' cy='239.3' r='39.7' fill='url(%23p3)' opacity='0.009'/%3E%3Ccircle cx='226.9' cy='220.4' r='39.7' fill='url(%23p3)' opacity='0.008'/%3E%3Ccircle cx='230.5' cy='197.7' r='39.8' fill='url(%23p3)' opacity='0.007'/%3E%3Ccircle cx='232.7' cy='189.6' r='39.5' fill='url(%23p3)' opacity='0.006'/%3E%3Ccircle cx='248.5' cy='164.5' r='39.5' fill='url(%23p3)' opacity='0.005'/%3E%3Ccircle cx='240.2' cy='141.9' r='39.6' fill='url(%23p3)' opacity='0.004'/%3E%3Ccircle cx='235.6' cy='129.6' r='39.3' fill='url(%23p3)' opacity='0.004'/%3E%3Ccircle cx='220.4' cy='105.2' r='39.2' fill='url(%23p3)' opacity='0.003'/%3E%3Ccircle cx='220' cy='78.9' r='39.1' fill='url(%23p3)' opacity='0.002'/%3E%3Ccircle cx='212.4' cy='68.3' r='38.7' fill='url(%23p3)' opacity='0.001'/%3E%3Cpath d='M87.7 371.2h1.2M559.8 87.6h1.2M109.6 294.2h1.2M551.4 331.7h1.2M188.1 275.4h1.2M280.4 22h1.2M544.3 254.6h1.2M1076.9 825.8h1.2M790.1 255.4h1.2M713.1 735.2h1.2M375.3 458.1h1.2M102.2 567.3h1.2M60.9 440h1.2M440.9 12.6h1.2M901.6 37.3h1.2M538 490.4h1.2M706.9 865.8h1.2M503.2 466.7h1.2M939.2 491.4h1.2M172.6 539.3h1.2M778.7 694.4h1.2M847.7 496.1h1.2M529.1 622.1h1.2M883.1 780.6h1.2M545.3 249.9h1.2M932 105.5h1.2M592.7 116.4h1.2M1064.8 583.6h1.2M445.3 288.7h1.2M633.9 613.9h1.2M604.1 251.1h1.2M736.1 627h1.2M65.8 165h1.2M671.6 414.2h1.2M355.5 467.1h1.2M1016.1 881h1.2M368.4 717.6h1.2M777.3 246.1h1.2M627.1 666.7h1.2M109.8 559.9h1.2M556.2 771h1.2M358.3 830.1h1.2' stroke='rgb(160,156,170)' stroke-opacity='0.011' stroke-width='1.2' fill='none'/%3E%3Cpath d='M493.7 281.4h1.2M754.1 269.8h1.2M380 485.9h1.2M542.8 618.9h1.2M85.8 867.2h1.2M557.2 865.4h1.2M683.4 517.2h1.2M245.1 843.6h1.2M368.9 433.3h1.2M354.2 744h1.2M675.3 620h1.2M483.5 842.6h1.2M864.3 736.7h1.2M716.8 620.1h1.2M1006.5 780h1.2M525.5 722.6h1.2M131.8 36.6h1.2M1061.7 862.5h1.2M1062.1 146.8h1.2M350.2 380.7h1.2M505.3 520.6h1.2M662.1 204.1h1.2M552.3 849.4h1.2M946.4 412h1.2M548.5 827.6h1.2M492.8 889.5h1.2M1066.6 108.2h1.2M501.3 733.2h1.2' stroke='rgb(160,156,170)' stroke-opacity='0.089' stroke-width='1.2' fill='none'/%3E%3Cpath d='M746.9 196.5h1.2M416.5 557.8h1.2M1010 243.8h1.2M909.7 750.1h1.2M887.3 65.7h1.2M346.5 148.5h1.2M1023.5 301.4h1.2M755.1 793.1h1.2M801 201.9h1.2M161 703.7h1.2M96.3 97.9h1.2M111.6 361.5h1.2M54.6 18h1.2M791.4 555.5h1.2M169.8 337.7h1.2M121.3 668.9h1.2M810.9 842.4h1.2M811.8 477h1.2M145.9 157.1h1.2M364.4 355.2h1.2M644.6 524.7h1.2M95.4 893.6h1.2M621 367.8h1.2M510.5 555.8h1.2M594.9 548.3h1.2M976.6 371.5h1.2M214.6 754.9h1.2M773.4 541.7h1.2M164.2 820.3h1.2' stroke='rgb(160,156,170)' stroke-opacity='0.064' stroke-width='1.2' fill='none'/%3E%3Cpath d='M733.4 340.7h1.2M1068.3 192.8h1.2M962.6 280.5h1.2M502.8 323.4h1.2M39.8 503h1.2M741 595.6h1.2M387.9 566.2h1.2M132.8 828.4h1.2M348.6 641.8h1.2M341.7 311.3h1.2M233.1 179.2h1.2M826 662.1h1.2M323.3 801.9h1.2M561 147.1h1.2M559.9 73.5h1.2M1.5 881.7h1.2M976.5 674.8h1.2M122.1 698.2h1.2M324.6 192h1.2M407.8 716.7h1.2M741 215.4h1.2M545.4 270h1.2M832.8 612.4h1.2M576.6 476.3h1.2M461.7 616h1.2M427.9 432.8h1.2M468.8 517.8h1.2M419.3 153.7h1.2M252.3 70.7h1.2M431.6 33.7h1.2M700.6 876h1.2' stroke='rgb(160,156,170)' stroke-opacity='0.038' stroke-width='1.2' fill='none'/%3E%3C/svg%3E"); background-size:1080px 1350px; filter:blur(2px); }
  .pc-raakh .gr{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='11'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); mix-blend-mode:screen; opacity:.22; }
  .pc-raakh .stack{ left:118px; right:118px; bottom:192px; text-align:left; }
  .pc-raakh .pl{ font-family:'October Compressed Devanagari','ITF Devanagari','Kohinoor Devanagari',sans-serif;
      font-weight:100; font-size:63px; line-height:2.0; color:#bdbac4; }
  .pc-raakh .pl.last{ color:#8f8a97; }
  .pc-raakh .pl.last .t{ color:#c9a689; }
  .pc-raakh .mark{ left:120px; bottom:92px; font-weight:400; font-size:21px; letter-spacing:.32em;
      color:#b9b6c0; opacity:.22; }

/* ===== atelier deepshikha ===== */

  .pc-deepshikha{ background:linear-gradient(180deg,#0d0705 0,#140a08 62%,#1c0e08 100%); }
  .pc-deepshikha .flm{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Cdefs%3E%3CradialGradient id='f0' gradientUnits='userSpaceOnUse' cx='540' cy='1050' r='99.9' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.052'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f1' gradientUnits='userSpaceOnUse' cx='540' cy='1043' r='137.3' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.045'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f2' gradientUnits='userSpaceOnUse' cx='540' cy='1036' r='153.7' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.038'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f3' gradientUnits='userSpaceOnUse' cx='540' cy='1029' r='204.4' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.033'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f4' gradientUnits='userSpaceOnUse' cx='540' cy='1022' r='227' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.028'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f5' gradientUnits='userSpaceOnUse' cx='540' cy='1015' r='259.3' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.024'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f6' gradientUnits='userSpaceOnUse' cx='540' cy='1008' r='297.8' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.021'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f7' gradientUnits='userSpaceOnUse' cx='540' cy='1001' r='349.9' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.018'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f8' gradientUnits='userSpaceOnUse' cx='540' cy='994' r='373.6' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.016'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f9' gradientUnits='userSpaceOnUse' cx='540' cy='987' r='426.9' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.013'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f10' gradientUnits='userSpaceOnUse' cx='540' cy='980' r='449.8' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.012'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f11' gradientUnits='userSpaceOnUse' cx='540' cy='973' r='481.7' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.01'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f12' gradientUnits='userSpaceOnUse' cx='540' cy='966' r='522' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.009'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f13' gradientUnits='userSpaceOnUse' cx='540' cy='959' r='570.5' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.007'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f14' gradientUnits='userSpaceOnUse' cx='540' cy='952' r='597.9' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.006'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f15' gradientUnits='userSpaceOnUse' cx='540' cy='945' r='621.2' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.005'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f16' gradientUnits='userSpaceOnUse' cx='540' cy='938' r='653.6' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.005'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f17' gradientUnits='userSpaceOnUse' cx='540' cy='931' r='691.6' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.004'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f18' gradientUnits='userSpaceOnUse' cx='540' cy='924' r='727.9' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.003'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f19' gradientUnits='userSpaceOnUse' cx='540' cy='917' r='764.4' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.003'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f20' gradientUnits='userSpaceOnUse' cx='540' cy='910' r='806' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.003'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f21' gradientUnits='userSpaceOnUse' cx='540' cy='903' r='844.6' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.002'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f22' gradientUnits='userSpaceOnUse' cx='540' cy='896' r='891.1' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.002'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f23' gradientUnits='userSpaceOnUse' cx='540' cy='889' r='923.1' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.002'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f24' gradientUnits='userSpaceOnUse' cx='540' cy='882' r='946.2' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.001'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f25' gradientUnits='userSpaceOnUse' cx='540' cy='875' r='990.8' fx='540' fy='1050'%3E%3Cstop offset='0' stop-color='rgb(255,180,92)' stop-opacity='0.001'/%3E%3Cstop offset='1' stop-color='rgb(255,140,60)' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='540' cy='1050' r='99.9' fill='url(%23f0)'/%3E%3Ccircle cx='540' cy='1043' r='137.3' fill='url(%23f1)'/%3E%3Ccircle cx='540' cy='1036' r='153.7' fill='url(%23f2)'/%3E%3Ccircle cx='540' cy='1029' r='204.4' fill='url(%23f3)'/%3E%3Ccircle cx='540' cy='1022' r='227' fill='url(%23f4)'/%3E%3Ccircle cx='540' cy='1015' r='259.3' fill='url(%23f5)'/%3E%3Ccircle cx='540' cy='1008' r='297.8' fill='url(%23f6)'/%3E%3Ccircle cx='540' cy='1001' r='349.9' fill='url(%23f7)'/%3E%3Ccircle cx='540' cy='994' r='373.6' fill='url(%23f8)'/%3E%3Ccircle cx='540' cy='987' r='426.9' fill='url(%23f9)'/%3E%3Ccircle cx='540' cy='980' r='449.8' fill='url(%23f10)'/%3E%3Ccircle cx='540' cy='973' r='481.7' fill='url(%23f11)'/%3E%3Ccircle cx='540' cy='966' r='522' fill='url(%23f12)'/%3E%3Ccircle cx='540' cy='959' r='570.5' fill='url(%23f13)'/%3E%3Ccircle cx='540' cy='952' r='597.9' fill='url(%23f14)'/%3E%3Ccircle cx='540' cy='945' r='621.2' fill='url(%23f15)'/%3E%3Ccircle cx='540' cy='938' r='653.6' fill='url(%23f16)'/%3E%3Ccircle cx='540' cy='931' r='691.6' fill='url(%23f17)'/%3E%3Ccircle cx='540' cy='924' r='727.9' fill='url(%23f18)'/%3E%3Ccircle cx='540' cy='917' r='764.4' fill='url(%23f19)'/%3E%3Ccircle cx='540' cy='910' r='806' fill='url(%23f20)'/%3E%3Ccircle cx='540' cy='903' r='844.6' fill='url(%23f21)'/%3E%3Ccircle cx='540' cy='896' r='891.1' fill='url(%23f22)'/%3E%3Ccircle cx='540' cy='889' r='923.1' fill='url(%23f23)'/%3E%3Ccircle cx='540' cy='882' r='946.2' fill='url(%23f24)'/%3E%3Ccircle cx='540' cy='875' r='990.8' fill='url(%23f25)'/%3E%3Ccircle cx='476.3' cy='646.7' r='1.2' fill='rgb(233,180,91)' opacity='0.115'/%3E%3Ccircle cx='390.4' cy='569.6' r='1.5' fill='rgb(233,180,91)' opacity='0.037'/%3E%3Ccircle cx='689.1' cy='1013.4' r='1.1' fill='rgb(233,180,91)' opacity='0.352'/%3E%3Ccircle cx='517.9' cy='682.7' r='1.8' fill='rgb(233,180,91)' opacity='0.236'/%3E%3Ccircle cx='433.3' cy='823.5' r='2.1' fill='rgb(233,180,91)' opacity='0.313'/%3E%3Ccircle cx='347.7' cy='883' r='1' fill='rgb(233,180,91)' opacity='0.162'/%3E%3Ccircle cx='403' cy='604.2' r='1.9' fill='rgb(233,180,91)' opacity='0.068'/%3E%3Ccircle cx='338.5' cy='706.1' r='1' fill='rgb(233,180,91)' opacity='0.209'/%3E%3Ccircle cx='335.2' cy='882.9' r='1.2' fill='rgb(233,180,91)' opacity='0.235'/%3E%3Ccircle cx='301.1' cy='990.7' r='1.2' fill='rgb(233,180,91)' opacity='0.217'/%3E%3Ccircle cx='301.5' cy='515' r='1.8' fill='rgb(233,180,91)' opacity='0.025'/%3E%3Ccircle cx='497.2' cy='789.3' r='1.2' fill='rgb(233,180,91)' opacity='0.201'/%3E%3Ccircle cx='774.9' cy='856.4' r='2.4' fill='rgb(233,180,91)' opacity='0.15'/%3E%3Ccircle cx='393.8' cy='683.2' r='1.5' fill='rgb(233,180,91)' opacity='0.087'/%3E%3Ccircle cx='351.3' cy='661.1' r='2' fill='rgb(233,180,91)' opacity='0.151'/%3E%3Ccircle cx='672.4' cy='742.4' r='1.2' fill='rgb(233,180,91)' opacity='0.143'/%3E%3Ccircle cx='646.2' cy='744.1' r='1.5' fill='rgb(233,180,91)' opacity='0.285'/%3E%3Ccircle cx='653.2' cy='971.1' r='1' fill='rgb(233,180,91)' opacity='0.224'/%3E%3Ccircle cx='446.9' cy='1048.9' r='1.5' fill='rgb(233,180,91)' opacity='0.138'/%3E%3Ccircle cx='654.5' cy='877.8' r='2.3' fill='rgb(233,180,91)' opacity='0.212'/%3E%3Ccircle cx='398.7' cy='760.1' r='2.4' fill='rgb(233,180,91)' opacity='0.24'/%3E%3Ccircle cx='326.6' cy='970.3' r='2.1' fill='rgb(233,180,91)' opacity='0.395'/%3E%3Ccircle cx='306.8' cy='901.2' r='1.5' fill='rgb(233,180,91)' opacity='0.274'/%3E%3Ccircle cx='801.2' cy='575.9' r='1' fill='rgb(233,180,91)' opacity='0.038'/%3E%3Ccircle cx='813' cy='1017.2' r='1.1' fill='rgb(233,180,91)' opacity='0.34'/%3E%3Ccircle cx='575.8' cy='946.6' r='1.6' fill='rgb(233,180,91)' opacity='0.22'/%3E%3Ccircle cx='487.4' cy='582.3' r='0.8' fill='rgb(233,180,91)' opacity='0.136'/%3E%3Ccircle cx='812.3' cy='769.3' r='1.6' fill='rgb(233,180,91)' opacity='0.149'/%3E%3Ccircle cx='655.3' cy='652.2' r='1.3' fill='rgb(233,180,91)' opacity='0.206'/%3E%3Ccircle cx='452.1' cy='880.9' r='1.9' fill='rgb(233,180,91)' opacity='0.205'/%3E%3Ccircle cx='598.7' cy='722.5' r='1.2' fill='rgb(233,180,91)' opacity='0.274'/%3E%3Ccircle cx='744.6' cy='828.4' r='2.3' fill='rgb(233,180,91)' opacity='0.09'/%3E%3Ccircle cx='493' cy='870.5' r='1.4' fill='rgb(233,180,91)' opacity='0.317'/%3E%3Ccircle cx='711.7' cy='714.3' r='1.6' fill='rgb(233,180,91)' opacity='0.195'/%3E%3Ccircle cx='318.9' cy='783.6' r='2.1' fill='rgb(233,180,91)' opacity='0.275'/%3E%3Ccircle cx='347' cy='1046.2' r='0.9' fill='rgb(233,180,91)' opacity='0.132'/%3E%3Ccircle cx='349' cy='711.4' r='2.4' fill='rgb(233,180,91)' opacity='0.158'/%3E%3Ccircle cx='350.1' cy='592.7' r='1.4' fill='rgb(233,180,91)' opacity='0.108'/%3E%3Ccircle cx='409.6' cy='983.8' r='2.4' fill='rgb(233,180,91)' opacity='0.127'/%3E%3Ccircle cx='635.7' cy='643' r='1.1' fill='rgb(233,180,91)' opacity='0.075'/%3E%3Ccircle cx='717.4' cy='653.2' r='1.6' fill='rgb(233,180,91)' opacity='0.122'/%3E%3Ccircle cx='417.7' cy='552.3' r='2.3' fill='rgb(233,180,91)' opacity='0.103'/%3E%3Ccircle cx='370.9' cy='862.6' r='0.9' fill='rgb(233,180,91)' opacity='0.214'/%3E%3Ccircle cx='428.7' cy='812' r='1' fill='rgb(233,180,91)' opacity='0.247'/%3E%3Ccircle cx='777.9' cy='617.8' r='1.2' fill='rgb(233,180,91)' opacity='0.096'/%3E%3Ccircle cx='554.2' cy='764.4' r='2.3' fill='rgb(233,180,91)' opacity='0.292'/%3E%3Ccircle cx='576.2' cy='645.6' r='1' fill='rgb(233,180,91)' opacity='0.217'/%3E%3Ccircle cx='721.5' cy='1043.7' r='1.9' fill='rgb(233,180,91)' opacity='0.3'/%3E%3Ccircle cx='531.1' cy='776.1' r='1.5' fill='rgb(233,180,91)' opacity='0.309'/%3E%3Ccircle cx='564.2' cy='660.3' r='1.6' fill='rgb(233,180,91)' opacity='0.216'/%3E%3Ccircle cx='487' cy='930.1' r='1.2' fill='rgb(233,180,91)' opacity='0.261'/%3E%3Ccircle cx='661.3' cy='491.5' r='1.2' fill='rgb(233,180,91)' opacity='0.041'/%3E%3Ccircle cx='693.7' cy='672.6' r='1.1' fill='rgb(233,180,91)' opacity='0.208'/%3E%3Ccircle cx='311.6' cy='856.4' r='1' fill='rgb(233,180,91)' opacity='0.218'/%3E%3Ccircle cx='788.5' cy='689.5' r='1.5' fill='rgb(233,180,91)' opacity='0.126'/%3E%3Ccircle cx='802.7' cy='1016.2' r='1.4' fill='rgb(233,180,91)' opacity='0.214'/%3E%3Ccircle cx='353' cy='590.9' r='2' fill='rgb(233,180,91)' opacity='0.052'/%3E%3Ccircle cx='735.3' cy='599.1' r='1.9' fill='rgb(233,180,91)' opacity='0.084'/%3E%3Ccircle cx='484.2' cy='878.5' r='2.1' fill='rgb(233,180,91)' opacity='0.446'/%3E%3Ccircle cx='762.3' cy='711' r='1.5' fill='rgb(233,180,91)' opacity='0.197'/%3E%3Ccircle cx='782.1' cy='678.3' r='1.3' fill='rgb(233,180,91)' opacity='0.133'/%3E%3Ccircle cx='383.4' cy='810' r='1.6' fill='rgb(233,180,91)' opacity='0.107'/%3E%3Ccircle cx='710.8' cy='758.2' r='1.6' fill='rgb(233,180,91)' opacity='0.252'/%3E%3Ccircle cx='793.9' cy='867' r='2' fill='rgb(233,180,91)' opacity='0.178'/%3E%3C/svg%3E"); background-size:1080px 1350px; }
  .pc-deepshikha .dawn{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' seed='27'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E"); background-color:#c47a3a;
      background-blend-mode:multiply; mix-blend-mode:screen; opacity:.14;
      -webkit-mask-image:radial-gradient(640px circle at 540px 1050px,#000 0,transparent 100%);
      mask-image:radial-gradient(640px circle at 540px 1050px,#000 0,transparent 100%); }
  .pc-deepshikha .gr{ position:absolute; left:0; right:0; top:0; height:520px; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='10'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      mix-blend-mode:screen; opacity:.3; }
  .pc-deepshikha .orn{ position:absolute; left:0; right:0; top:318px; z-index:3; text-align:center;
      font-family:'Devanagari MT',serif; font-size:50px; color:#d8a24a; opacity:.6; }
  .pc-deepshikha .stack{ left:110px; right:110px; top:440px; text-align:center; }
  .pc-deepshikha .pl{ font-family:'Laila','Kohinoor Devanagari',serif; font-weight:400;
      font-size:64px; line-height:1.92; color:#c9b394; }
  .pc-deepshikha .pl.last{ font-size:71px; padding-top:6px; color:#e9b45b; }
  .pc-deepshikha .diya{ position:absolute; left:50%; top:1046px; transform:translateX(-50%); z-index:3;
      width:7px; height:7px; border-radius:50%; background:#ffd98f;
      box-shadow:0 0 18px 7px rgba(255,196,110,.75),0 0 70px 34px rgba(230,140,60,.28),0 0 160px 80px rgba(190,90,35,.12); }
  .pc-deepshikha .mark{ left:0; right:0; bottom:96px; text-align:center; font-weight:400; font-size:21px;
      letter-spacing:.34em; color:#cbb694; opacity:.30; }

/* ===== atelier sutra-patra ===== */

  .pc-sutrapatra{ background:#efe8d8; }
  .pc-sutrapatra .gr{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='2' seed='71'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E"); mix-blend-mode:multiply; }
  .pc-sutrapatra .fox{ position:absolute; inset:0; z-index:1;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Cdefs%3E%3CradialGradient id='fx'%3E%3Cstop offset='0' stop-color='rgb(140,100,50)'/%3E%3Cstop offset='1' stop-color='rgb(140,100,50)' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='756.6' cy='300.7' r='14.3' fill='url(%23fx)' opacity='0.037'/%3E%3Ccircle cx='635.2' cy='225' r='16.8' fill='url(%23fx)' opacity='0.07'/%3E%3Ccircle cx='181.7' cy='131.6' r='11.2' fill='url(%23fx)' opacity='0.05'/%3E%3Ccircle cx='383.8' cy='1031.6' r='4.7' fill='url(%23fx)' opacity='0.068'/%3E%3Ccircle cx='481.5' cy='163.5' r='15.3' fill='url(%23fx)' opacity='0.055'/%3E%3Ccircle cx='276.2' cy='286.8' r='12.3' fill='url(%23fx)' opacity='0.05'/%3E%3Ccircle cx='491' cy='146.8' r='12.6' fill='url(%23fx)' opacity='0.041'/%3E%3Ccircle cx='121.1' cy='132.2' r='6.5' fill='url(%23fx)' opacity='0.066'/%3E%3Ccircle cx='119.3' cy='638.2' r='13.3' fill='url(%23fx)' opacity='0.054'/%3E%3Ccircle cx='922.4' cy='1039.7' r='5.9' fill='url(%23fx)' opacity='0.035'/%3E%3Ccircle cx='975.5' cy='211.6' r='15.4' fill='url(%23fx)' opacity='0.037'/%3E%3Ccircle cx='592.6' cy='114.4' r='11.9' fill='url(%23fx)' opacity='0.071'/%3E%3Ccircle cx='680.4' cy='917.1' r='3.7' fill='url(%23fx)' opacity='0.054'/%3E%3Ccircle cx='106' cy='625.5' r='15' fill='url(%23fx)' opacity='0.066'/%3E%3Ccircle cx='698.3' cy='1232' r='13.9' fill='url(%23fx)' opacity='0.048'/%3E%3Ccircle cx='543.9' cy='151.9' r='11.6' fill='url(%23fx)' opacity='0.069'/%3E%3Ccircle cx='13.5' cy='1274.6' r='14.3' fill='url(%23fx)' opacity='0.041'/%3E%3C/svg%3E"),radial-gradient(1050px circle at 540px 675px,rgba(0,0,0,0) 47%,rgba(100,75,40,.14) 100%);
      background-size:1080px 1350px,1080px 1350px; mix-blend-mode:multiply; }
  .pc-sutrapatra .band{ position:absolute; left:0; right:0; top:428px; height:474px; background:#f7f1e2; z-index:2;
      box-shadow:0 1px 0 rgba(120,90,50,.18),0 -1px 0 rgba(120,90,50,.18); }
  .pc-sutrapatra .rl{ position:absolute; left:0; right:0; height:2px; background:#8a1e12; z-index:3; }
  .pc-sutrapatra .rl.t1{ top:414px; } .pc-sutrapatra .rl.t2{ top:422px; height:1px; opacity:.55; }
  .pc-sutrapatra .rl.b1{ top:908px; } .pc-sutrapatra .rl.b2{ top:915px; height:1px; opacity:.55; }
  .pc-sutrapatra .hole{ position:absolute; top:652px; left:100px; z-index:4; width:32px; height:32px; border-radius:50%;
      background:#e6dcc4; box-shadow:inset 0 2px 5px rgba(80,55,25,.6),inset 0 -1px 2px rgba(255,252,240,.7),0 0 0 1.5px rgba(110,80,40,.4); }
  .pc-sutrapatra .leaf{ position:absolute; left:50%; transform:translateX(-50%); height:2px;
      background:rgba(120,90,50,.30); z-index:3; }
  .pc-sutrapatra .leaf.e1{ top:1128px; width:660px; }
  .pc-sutrapatra .leaf.e2{ top:1142px; width:590px; opacity:.75; }
  .pc-sutrapatra .leaf.e3{ top:1156px; width:508px; opacity:.5; }
  .pc-sutrapatra .lbl{ position:absolute; left:0; right:0; top:300px; z-index:3; text-align:center;
      font-family:'Devanagari MT',serif; font-weight:400; font-size:30px; color:#8a1e12; opacity:.85; }
  .pc-sutrapatra .stack{ left:200px; right:150px; top:428px; height:474px; display:flex; flex-direction:column;
      justify-content:center; text-align:center; z-index:4; }
  .pc-sutrapatra .pl{ font-family:'Devanagari MT','Shobhika',serif; font-weight:400; font-size:63px;
      line-height:1.9; color:#221b10; }
  .pc-sutrapatra .pl .num{ color:#8a1e12; margin-left:.45em; font-size:54px; }
  .pc-sutrapatra .mark{ left:0; right:0; bottom:92px; text-align:center; font-weight:500; font-size:21px;
      letter-spacing:.34em; color:#221b10; opacity:.32; }

/* ===== atelier stambh ===== */

  .pc-stambh{ background:linear-gradient(180deg,#2c2e34 0,#26282d 50%,#202127 100%); }
  .pc-stambh .spk{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='25'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E"); mix-blend-mode:overlay; opacity:.5; }
  .pc-stambh .stn{ position:absolute; inset:0; z-index:1; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350' viewBox='0 0 1080 1350'%3E%3Cpath d='M72 1210.2l109.5 15.3M1057.9 1084.7l141.9 19.9M358.7 1279.6l215.3 30.1M1017 1088.1l207.9 29.1M439.7 46.9l122.1 17.1M321.4 362.8l148.1 20.7M12.9 1048.2l147.9 20.7M663.6 964.3l120 16.8M486.5 1096.1l265 37.1M1046.4 172l131.3 18.4M518.1 884.9l99.4 13.9M257.2 96l172.6 24.2M762.7 645.3l166.2 23.3M782.2 26.8l178.4 25M212.7 339.4l77.9 10.9' stroke='rgb(0,0,0)' stroke-opacity='0.026' stroke-width='.9' fill='none'/%3E%3Cpath d='M199.8 1009.7l147.4 20.6M1044.3 344.5l72.9 10.2M84.9 530.9l201.2 28.2M866.1 75.8l188.7 26.4M828.7 1168.6l78 10.9M150.8 1018.6l134.6 18.8M238.4 595.5l98.2 13.8M1040.1 340.8l175.9 24.6M1066.9 1202.8l137.6 19.3M624.7 1195.3l146.2 20.5M882.3 107.7l273.6 38.3M801.7 720.5l256.1 35.9M761.9 478.5l210.1 29.4M833.3 469.9l233.7 32.7M486.3 324l271 37.9M454.9 409.9l152.9 21.4M1046.3 944.2l261.3 36.6M70.7 801.1l172.3 24.1M305.1 672.1l153.4 21.5M-13.5 703.7l151.4 21.2' stroke='rgb(190,196,208)' stroke-opacity='0.026' stroke-width='.9' fill='none'/%3E%3Cpath d='M1086.8 1269.7l208.1 29.1M132.1 237.5l212.2 29.7M947.4 308.4l268.8 37.6M745.8 1269.5l189.6 26.5M701 322l163.7 22.9M349 1068.3l128.8 18M923 372.6l210.9 29.5M450.9 113.1l251.4 35.2M1070 435.3l105.3 14.7M508.5 520.8l225.1 31.5M546.8 584.3l108.5 15.2M554.4 851.1l212.7 29.8M933.2 608.5l243.6 34.1M459.8 841.9l207.2 29' stroke='rgb(190,196,208)' stroke-opacity='0.031' stroke-width='.9' fill='none'/%3E%3Cpath d='M446.5 453.5l270.8 37.9M810.1 928.4l246.2 34.5M1087.3 763l236.3 33.1M1121.2 411.7l254 35.6M639.7 481.4l139.1 19.5M615.9 416.4l130.2 18.2M-21.9 177.5l231.3 32.4M375.6 628.9l81.9 11.5M1012.8 940.6l223.5 31.3M22.2 1077.8l76.9 10.8M800.7 144l245.2 34.3M988.5 1334l91 12.7M1019.9 291.4l137.4 19.2M726.9 827.7l132.4 18.5M881.5 1290.7l160.5 22.5M468.8 213.1l239.8 33.6M570.9 1116.9l277.9 38.9M143.2 996.2l69.1 9.7' stroke='rgb(190,196,208)' stroke-opacity='0.019' stroke-width='.9' fill='none'/%3E%3Cpath d='M1079.3 255.5l157.6 22.1M359.7 773.9l141.4 19.8M122.3 838.8l171.2 24M1125.8 1246.6l161 22.5M805.1 436.4l148.7 20.8M757.1 906.9l113.2 15.8M1118.2 203.1l240.7 33.7M38.4 963.4l252.7 35.4M437.3 829.3l81.9 11.5M118.6 782.8l274.5 38.4M796.6 757.1l90.9 12.7M1012.1 794.1l83.7 11.7' stroke='rgb(0,0,0)' stroke-opacity='0.019' stroke-width='.9' fill='none'/%3E%3Cpath d='M339 17.2l203.1 28.4M906.4 914.1l70.1 9.8M288.7 170.5l207.8 29.1M566.8 11.5l254.1 35.6M49 86.9l221 30.9M111.1 938.9l173.3 24.3M1076.7 723.9l250.1 35M-22.3 1039.7l147.5 20.7M31.3 825.9l148.8 20.8M162 1211l130.5 18.3M928.7 676.4l196.8 27.6M751.3 469.9l92.7 13M712.9 1095l249.7 35M201.8 650.4l245.6 34.4M149.7 756.1l167.4 23.4' stroke='rgb(0,0,0)' stroke-opacity='0.041' stroke-width='.9' fill='none'/%3E%3Cpath d='M725.2 560.7l64.5 9M550.4 564.7l185.6 26M827 46.8l83.1 11.6M1054.8 741.9l229.4 32.1M1119.1 486.8l125.9 17.6M270.2 285.8l127 17.8M333.7 608.7l230.2 32.2M674.4 890.2l212.8 29.8M281.5 490.4l93.2 13M847 181.8l84.9 11.9M60.9 431.5l120.3 16.8M-10.7 319.9l193.7 27.1M79.2 1268.3l74.2 10.4M67 1265.9l254 35.6M110.9 438.9l150.9 21.1M517.6 1095.1l125.6 17.6M807.3 449.6l267.3 37.4M884.4 854.1l83.8 11.7M596.8 839.4l204.2 28.6' stroke='rgb(0,0,0)' stroke-opacity='0.034' stroke-width='.9' fill='none'/%3E%3Cpath d='M1011.7 375l181.6 25.4M993.9 461.3l176.2 24.7M587.5 938.3l103.5 14.5M596.8 76.2l126.6 17.7M929.5 1276.1l63.2 8.8M-4.2 148.8l227.2 31.8M980.1 1281.7l87 12.2M432 197.3l64.1 9M965.2 294l85 11.9M137.7 347l135.5 19M442.1 378.8l210.6 29.5M855.2 1059.9l216.4 30.3M375.5 664.8l102.9 14.4M1022.9 158.6l251.9 35.3M391.5 724.2l157.3 22M271.2 52.5l113 15.8M501.5 330.7l159.1 22.3' stroke='rgb(190,196,208)' stroke-opacity='0.013' stroke-width='.9' fill='none'/%3E%3Cpolyline points='842 0 855.9 26.8 845.8 57.3 857.3 94.1 848.7 116.2 846.6 144.7 861.1 187.1 865.8 214.6 872.6 252.2 871.8 280.2 868.6 311.7' fill='none' stroke='rgb(0,0,0)' stroke-opacity='.34' stroke-width='1.4'/%3E%3Cpolyline points='842 0 855.9 26.8 845.8 57.3 857.3 94.1 848.7 116.2 846.6 144.7 861.1 187.1 865.8 214.6 872.6 252.2 871.8 280.2 868.6 311.7' fill='none' stroke='rgb(220,225,235)' stroke-opacity='.05' stroke-width='2.6'/%3E%3C/svg%3E"); background-size:1080px 1350px; }
  .pc-stambh .lt{ position:absolute; inset:0; z-index:1;
      background:radial-gradient(1500px circle at 240px 120px,rgba(225,230,240,.07) 0,rgba(0,0,0,.16) 100%); }
  .pc-stambh .plumb{ position:absolute; left:-40px; top:16px; bottom:4px; width:3px; z-index:3;
      background:linear-gradient(180deg,rgba(201,162,92,.85),rgba(138,106,52,.35)); }
  .pc-stambh .stack{ left:132px; right:100px; top:420px; text-align:left; }
  .pc-stambh .pl{ font-family:'Shree Devanagari 714','Tiro Sanskrit',serif; font-weight:700;
      font-size:88px; line-height:1.74; color:#131519;
      text-shadow:0 3px 1px rgba(216,224,238,.20),0 -2px 2px rgba(0,0,0,.78); }
  .pc-stambh .pl.rs{ color:#121316; text-shadow:0 3px 1px rgba(219,183,114,.34),0 -2px 2px rgba(0,0,0,.8); }
  .pc-stambh .mark{ right:100px; bottom:92px; text-align:right; font-weight:500; font-size:21px;
      letter-spacing:.32em; color:#41464f; text-shadow:0 1px 1px rgba(0,0,0,.5); }
`;
  var BLOCK_FN = null, BLOCK_CSS = "";

  function install() {
    var CC = window.CarouselCore, PC = window.PostCore;
    if (!CC || !PC || !PC.html) return false;
    if (!CC.__atelier_batch3) {
      Object.keys(LOOKS).forEach(function (k) { if (!CC.LOOKS[k]) CC.LOOKS[k] = LOOKS[k]; });
      Object.keys(PAL).forEach(function (k) { if (!CC.PAL[k]) CC.PAL[k] = PAL[k]; });
      Object.keys(GROUP).forEach(function (k) { if (!CC.LOOK_GROUP[k]) CC.LOOK_GROUP[k] = GROUP[k]; });
      ["Season & Sky","Literary & Minimal"].forEach(function (g) {
        if (CC.GROUP_ORDER && CC.GROUP_ORDER.indexOf(g) < 0) CC.GROUP_ORDER.push(g);
      });
      if (BLOCK_FN) {
        var IB = window.CarouselBlocks;
        if (IB && IB.render && !IB.__atelier_batch3) {
          var origIB = IB.render;
          IB.render = function (kind, d) { var h = BLOCK_FN(kind, d); return (h != null && h !== '') ? h : origIB(kind, d); };
          IB.css = (IB.css || '') + '\n' + BLOCK_CSS;
          IB.__atelier_batch3 = true;
        }
      }
      CC.__atelier_batch3 = true;
    }
    if (!PC.__atelier_batch3 && Object.keys(TPL).length) {
      var origHtml = PC.html;
      PC.html = function (id, v) {
        var t = TPL[id];
        if (t) { v = v || {}; return '<div class="pc ' + t.cls + '">' + t.fn(v) + '</div>'; }
        return origHtml(id, v);
      };
      if (PC.TEMPLATES) Object.keys(TPL).forEach(function (id) { if (PC.TEMPLATES.indexOf(id) < 0) PC.TEMPLATES.push(id); });
      PC.BASE = PC.BASE + '\n' + TPL_CSS;
      try { var st = document.getElementById('v357-poem-postcore-css'); if (st) st.textContent += '\n' + TPL_CSS; } catch (e) {}
      PC.__atelier_batch3 = true;
    }
    return true;
  }
  if (!install()) {
    var n = 0, t = setInterval(function () { if (install() || ++n > 60) clearInterval(t); }, 250);
    document.addEventListener('DOMContentLoaded', install);
  }
})();
