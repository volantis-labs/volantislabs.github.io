// Volantis DB sub-site: tabs, copy buttons, hero field, benchmark chart, search lab, graph demo, docs contents.
// No libraries and no outside requests. Every part checks that its element exists.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.append(el);
    return el;
  };
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  // Top bar border after scroll.
  const top = $('.top');
  if (top) {
    const onScroll = () => top.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Tabs. A [data-tabs="group"] holds buttons [data-key]; panes [data-pane] sit in the same [data-tabset].
  // Tabs in the same group stay in step (choose Python once, see Python everywhere).
  const groups = {};
  const select = (group, key, save = true) => {
    (groups[group] || []).forEach((set) => {
      const btns = $$('[data-tabs] [data-key]', set);
      if (!btns.some((b) => b.dataset.key === key)) return;
      btns.forEach((b) => {
        const on = b.dataset.key === key;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      $$('[data-pane]', set).forEach((p) => { p.hidden = p.dataset.pane !== key; });
    });
    if (save) store.set('vdb-lang-' + group, key);
  };
  $$('[data-tabset]').forEach((set) => {
    const group = set.dataset.tabset;
    (groups[group] = groups[group] || []).push(set);
    const btns = $$('[data-tabs] [data-key]', set);
    btns.forEach((b, i) => {
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => select(group, b.dataset.key));
      b.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const next = btns[(i + d + btns.length) % btns.length];
        select(group, next.dataset.key);
        next.focus();
      });
    });
    $('[data-tabs]', set)?.setAttribute('role', 'tablist');
  });
  Object.keys(groups).forEach((g) => {
    const saved = store.get('vdb-lang-' + g);
    const first = $('[data-tabs] [data-key]', groups[g][0])?.dataset.key;
    select(g, saved || first, false);
    // A set without the saved language (for example no TypeScript tab) shows its own first tab.
    groups[g].forEach((set) => {
      const btns = $$('[data-tabs] [data-key]', set);
      if (btns.length && !btns.some((b) => b.getAttribute('aria-selected') === 'true')) {
        btns.forEach((b, i) => { b.setAttribute('aria-selected', i === 0); b.tabIndex = i === 0 ? 0 : -1; });
        $$('[data-pane]', set).forEach((p) => { p.hidden = p.dataset.pane !== btns[0].dataset.key; });
      }
    });
  });

  // Copy buttons: copy the visible pane's code, or the element named by data-copy.
  const ICON_OK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  $$('.copy').forEach((btn) => {
    const icon = btn.innerHTML;
    btn.addEventListener('click', async () => {
      const scope = btn.closest('[data-tabset]') || btn.parentElement;
      const target = btn.dataset.copy ? document.getElementById(btn.dataset.copy) : $$('[data-pane]', scope).find((p) => !p.hidden) || $('code, pre', scope);
      if (!target) return;
      const text = (target.dataset.text || target.innerText).trim();
      try { await navigator.clipboard.writeText(text); } catch {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      btn.classList.add('done'); btn.innerHTML = ICON_OK; btn.setAttribute('aria-label', 'Copied');
      setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = icon; btn.setAttribute('aria-label', 'Copy'); }, 1600);
    });
  });

  // Hero: documents as dots. A query point moves, its radius finds the nearest dots (vector),
  // and some dots light up as word matches (full text). This is a picture of the idea, not data.
  const field = $('#field');
  if (field) {
    const W = 500, H = 460;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dots = Array.from({ length: 120 }, () => ({ x: 24 + rnd() * (W - 48), y: 40 + rnd() * (H - 120) }));
    const gEdges = svgEl('g', {}, field);
    const gDots = svgEl('g', {}, field);
    const ring = svgEl('circle', { class: 'ring', cx: W / 2, cy: H / 2, r: 0 }, field);
    const q = svgEl('circle', { class: 'q', cx: W / 2, cy: H / 2, r: 9 }, field);
    const nodes = dots.map((d) => svgEl('circle', { class: 'doc', cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: 4 }, gDots));
    const lines = Array.from({ length: 5 }, () => svgEl('line', { class: 'edge' }, gEdges));
    const qText = $('#field-q'), qMode = $('#field-t');
    const scenes = [
      { x: .62, y: .34, q: 'get my money back', kw: 0, mode: 'vector · top 5' },
      { x: .3, y: .52, q: 'E-4012', kw: 1, mode: 'full text · 1 match' },
      { x: .7, y: .66, q: '¿Cómo cancelo mi suscripción?', kw: 0, mode: 'vector · top 5' },
      { x: .42, y: .28, q: 'cheaper plan for university', kw: 3, mode: 'hybrid · top 5' },
    ];
    let i = 0, timer, user = false;
    const pulse = svgEl('circle', { class: 'pulse', r: 6 }, field);
    const play = (pick) => {
      const s = pick || scenes[i++ % scenes.length];
      const qx = pick ? pick.qx : 30 + s.x * (W - 60), qy = pick ? pick.qy : 40 + s.y * (H - 130);
      if (pick) { pulse.setAttribute('cx', qx); pulse.setAttribute('cy', qy); pulse.classList.remove('go'); void pulse.getBBox(); pulse.classList.add('go'); }
      const near = dots.map((d, j) => ({ j, dist: Math.hypot(d.x - qx, d.y - qy) })).sort((a, b) => a.dist - b.dist);
      const hits = near.slice(0, 5);
      const kws = new Set();
      for (let n = 0; kws.size < s.kw; n++) kws.add(near[(n * 37 + 11) % near.length].j);
      nodes.forEach((n, j) => { n.classList.remove('hit', 'kw'); n.setAttribute('r', 4); });
      lines.forEach((l) => l.classList.remove('on'));
      q.setAttribute('cx', qx); q.setAttribute('cy', qy);
      ring.setAttribute('cx', qx); ring.setAttribute('cy', qy); ring.setAttribute('r', 0);
      if (qText) qText.innerHTML = '<i>query</i>' + s.q.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      if (qMode) qMode.textContent = s.mode;
      setTimeout(() => {
        ring.setAttribute('r', (hits[4].dist + 10).toFixed(1));
        hits.forEach((h, k) => {
          if (s.kw === 1) return;
          nodes[h.j].classList.add('hit'); nodes[h.j].setAttribute('r', 6);
          const l = lines[k];
          l.setAttribute('x1', qx); l.setAttribute('y1', qy); l.setAttribute('x2', dots[h.j].x); l.setAttribute('y2', dots[h.j].y);
          setTimeout(() => l.classList.add('on'), 120 + k * 70);
        });
        kws.forEach((j) => { nodes[j].classList.add('kw'); nodes[j].setAttribute('r', 6); });
      }, calm || pick ? 0 : 650);
    };
    play();
    const loop = () => { clearInterval(timer); if (!calm) timer = setInterval(() => { if (!document.hidden && !user) play(); }, 3600); };
    loop();
    // Click anywhere in the field: the query moves there and finds its 5 nearest documents.
    const box = field.closest('.field');
    box.addEventListener('click', (e) => {
      const pt = field.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(field.getScreenCTM().inverse());
      box.classList.add('touched');
      user = true; setTimeout(() => { user = false; }, 9000);
      play({ qx: Math.max(10, Math.min(W - 10, p.x)), qy: Math.max(10, Math.min(H - 10, p.y)), q: 'your point', kw: 0, mode: 'vector · top 5' });
    });
  }

  // Background: faint gray subgraphs that drift, turn and float slower than the page scrolls.
  (() => {
    const c = document.createElement('canvas');
    c.className = 'floaters'; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    const ctx = c.getContext('2d');
    let seed = 42, w = 0, h = 0, dpr = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const graphs = Array.from({ length: 11 }, (_, g) => {
      const n = 4 + Math.floor(rnd() * 6), big = g % 4 === 0;
      const scale = big ? 120 + rnd() * 110 : 34 + rnd() * 46;
      const pts = Array.from({ length: n }, () => ({ x: (rnd() - .5) * scale, y: (rnd() - .5) * scale, r: big ? 2.2 + rnd() * 2.6 : 1.4 + rnd() * 1.8 }));
      const edges = [];
      pts.forEach((p, a) => {
        const near = pts.map((q, b) => [b, Math.hypot(p.x - q.x, p.y - q.y)]).filter(([b]) => b !== a).sort((u, v) => u[1] - v[1]);
        near.slice(0, 1 + (rnd() > .6 ? 1 : 0)).forEach(([b]) => { if (!edges.some(([u, v]) => (u === b && v === a))) edges.push([a, b]); });
      });
      return { pts, edges, x: rnd(), y: rnd() * 1.4, vx: (rnd() - .5) * 5, vy: (rnd() - .5) * 4, rot: rnd() * 6.28, vr: (rnd() - .5) * .05, depth: .15 + rnd() * .45, alpha: big ? .045 + rnd() * .03 : .07 + rnd() * .05, ph: rnd() * 6.28 };
    });
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    let last = performance.now(), acc = 0;
    const draw = (t) => {
      const dt = Math.min(.1, (t - last) / 1000); last = t;
      ctx.clearRect(0, 0, w, h);
      const sy = scrollY;
      graphs.forEach((g) => {
        if (!calm) { g.x += (g.vx * dt) / w; g.y += (g.vy * dt) / h; g.rot += g.vr * dt; }
        const span = h * 1.6;
        let cx = ((g.x % 1) + 1) % 1 * (w + 300) - 150;
        let cy = ((((g.y * h - sy * g.depth) % span) + span) % span) - h * .3;
        cy += Math.sin(t / 4000 + g.ph) * 6;
        const cos = Math.cos(g.rot), sin = Math.sin(g.rot);
        const P = g.pts.map((p) => [cx + p.x * cos - p.y * sin, cy + p.x * sin + p.y * cos]);
        ctx.strokeStyle = `rgba(14,26,54,${g.alpha * .8})`; ctx.lineWidth = 1;
        ctx.beginPath(); g.edges.forEach(([a, b]) => { ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); }); ctx.stroke();
        ctx.fillStyle = `rgba(14,26,54,${g.alpha * 1.25})`;
        g.pts.forEach((p, k) => { ctx.beginPath(); ctx.arc(P[k][0], P[k][1], p.r, 0, 6.283); ctx.fill(); });
      });
    };
    size(); addEventListener('resize', size);
    if (calm) { draw(performance.now()); addEventListener('scroll', () => draw(performance.now()), { passive: true }); return; }
    const tick = (t) => { acc += t - (tick.l || t); tick.l = t; if (acc >= 33 && !document.hidden) { acc = 0; draw(t); } requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })();

  // Benchmark chart. Data from assets/beir-vector-p95-linear.svg in the volantis-db repo
  // (BEIR, Apple M3 Max, warm indexes, k=10). SQLite on TREC-COVID (82.36 ms) is off the chart.
  const chartBox = $('#chart');
  if (chartBox) {
    const LIBS = {
      'Volantis DB': '#b47a00', Chroma: '#6859b8', hnswlib: '#b85b43', LanceDB: '#336b87', 'sqlite-vec': '#4a4944', USearch: '#547343',
    };
    const DS = { scifact: 'SciFact', trec: 'TREC-COVID', nq: 'Natural Questions' };
    const D = [
      ['Volantis DB', 'scifact', 0.69, 0.06], ['Volantis DB', 'trec', 0.83, 0.11], ['Volantis DB', 'nq', 0.73, 0.88],
      ['Chroma', 'scifact', 0.69, 0.55], ['Chroma', 'trec', 0.84, 1.17], ['Chroma', 'nq', 0.73, 1.35],
      ['hnswlib', 'scifact', 0.69, 1.34], ['hnswlib', 'trec', 0.83, 1.67], ['hnswlib', 'nq', 0.72, 1.91],
      ['LanceDB', 'scifact', 0.69, 1.71], ['LanceDB', 'trec', 0.83, 6.14],
      ['sqlite-vec', 'scifact', 0.69, 2.53],
      ['USearch', 'scifact', 0.68, 2.28], ['USearch', 'trec', 0.83, 1.26],
    ].map(([lib, ds, ndcg, p95]) => ({ lib, ds, ndcg, p95 }));
    // Small x offsets keep dots with the same rounded nDCG from sitting on top of each other.
    const jitter = { 'Volantis DB': 0, Chroma: -0.0028, hnswlib: 0.0028, LanceDB: -0.0056, 'sqlite-vec': 0.0056, USearch: 0 };
    const VW = 1000, VH = 520, M = { l: 62, r: 22, t: 20, b: 58 };
    const svg = svgEl('svg', { viewBox: `0 0 ${VW} ${VH}`, role: 'img', 'aria-labelledby': 'chart-title' });
    chartBox.prepend(svg);
    svgEl('title', { id: 'chart-title' }, svg).textContent = 'Vector search p95 latency against nDCG@10 on three BEIR datasets. Lower and further right is better.';
    const gGrid = svgEl('g', { class: 'grid' }, svg);
    const gAxis = svgEl('g', { class: 'axis' }, svg);
    svgEl('text', { class: 'axis-title', x: (M.l + VW - M.r) / 2, y: VH - 12, 'text-anchor': 'middle' }, svg).textContent = 'NDCG@10 · MORE ACCURATE →';
    svgEl('text', { class: 'axis-title', x: 14, y: (M.t + VH - M.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(M.t + VH - M.b) / 2})` }, svg).textContent = 'P95 MS · FASTER ↓';
    const gDots = svgEl('g', {}, svg);
    const gLabs = svgEl('g', {}, svg);
    const tip = $('.tip', chartBox);
    const readout = $('#readout');
    const X = (v) => M.l + ((v - 0.66) / (0.86 - 0.66)) * (VW - M.l - M.r);
    let ymax = 7;
    const Y = (v) => VH - M.b - (v / ymax) * (VH - M.t - M.b);
    const items = D.map((d) => {
      const us = d.lib === 'Volantis DB';
      const halo = us ? svgEl('circle', { class: 'vdb-halo', r: 16 }, gDots) : null;
      const c = svgEl('circle', { class: 'dot', r: us ? 9 : 7, fill: LIBS[d.lib], stroke: '#fff', 'stroke-width': 2.5, tabindex: 0, role: 'img', 'aria-label': `${d.lib}, ${DS[d.ds]}: nDCG@10 ${d.ndcg.toFixed(2)}, p95 ${d.p95} ms` }, gDots);
      const lab = svgEl('text', { class: 'lab', fill: LIBS[d.lib] }, gLabs);
      if (us) lab.style.fontWeight = 800;
      const show = () => {
        if (!tip) return;
        const r = chartBox.getBoundingClientRect(), b = c.getBoundingClientRect();
        tip.innerHTML = `<b>${d.lib}</b> · ${DS[d.ds]}<br>p95 ${d.p95.toFixed(2)} ms · nDCG@10 ${d.ndcg.toFixed(2)}`;
        tip.style.left = Math.min(Math.max(b.left + b.width / 2 - r.left, 110), r.width - 110) + 'px';
        tip.style.top = b.top - r.top + 'px';
        tip.classList.add('on');
      };
      const hide = () => tip && tip.classList.remove('on');
      c.addEventListener('mouseenter', show); c.addEventListener('focus', show);
      c.addEventListener('mouseleave', hide); c.addEventListener('blur', hide);
      return { d, c, halo, lab };
    });
    let picked = null, curDs = 'all';
    const draw = (ds = curDs) => {
      curDs = ds;
      const sel = D.filter((d) => ds === 'all' || d.ds === ds);
      ymax = ds === 'all' ? 7 : Math.ceil(Math.max(...sel.map((d) => d.p95)) * 1.18 * 2) / 2;
      gGrid.replaceChildren(); gAxis.replaceChildren();
      const step = ymax > 4 ? 1 : ymax > 2 ? 0.5 : 0.25;
      for (let v = 0; v <= ymax + 1e-9; v += step) {
        svgEl('line', { x1: M.l, x2: VW - M.r, y1: Y(v), y2: Y(v) }, gGrid);
        svgEl('text', { x: M.l - 10, y: Y(v) + 4, 'text-anchor': 'end' }, gAxis).textContent = +v.toFixed(2);
      }
      for (let v = 0.66; v <= 0.8601; v += 0.02) {
        svgEl('line', { x1: X(v), x2: X(v), y1: M.t, y2: VH - M.b, opacity: .6 }, gGrid);
        svgEl('text', { x: X(v), y: VH - M.b + 20, 'text-anchor': 'middle' }, gAxis).textContent = v.toFixed(2);
      }
      items.forEach(({ d, c, halo, lab }) => {
        const on = ds === 'all' || d.ds === ds;
        const cx = X(d.ndcg + jitter[d.lib]), cy = Y(d.p95);
        c.setAttribute('cx', cx); c.setAttribute('cy', cy);
        const faded = picked && d.lib !== picked && d.lib !== 'Volantis DB';
        c.style.opacity = on ? (faded ? .14 : 1) : 0; c.style.pointerEvents = on ? '' : 'none';
        c.setAttribute('tabindex', on ? 0 : -1);
        if (halo) { halo.setAttribute('cx', cx); halo.setAttribute('cy', cy); halo.style.opacity = on ? .55 : 0; }
        const us = d.lib === 'Volantis DB';
        const showLab = on && !faded && (ds !== 'all' || us || d.lib === picked);
        lab.textContent = ds === 'all' ? (us ? DS[d.ds] : `${d.lib} · ${DS[d.ds]}`) : d.lib;
        const left = cx > VW - 170;
        lab.setAttribute('x', left ? cx - 16 : cx + 16);
        lab.setAttribute('y', cy + (us ? -12 : 4));
        lab.setAttribute('text-anchor', left ? 'end' : 'start');
        lab.style.opacity = showLab ? 1 : 0;
      });
      if (readout) {
        if (picked && picked !== 'Volantis DB') {
          const rows = sel.filter((d) => d.lib === picked).map((d) => { const u = D.find((x) => x.lib === 'Volantis DB' && x.ds === d.ds); return `${DS[d.ds]} ${d.p95.toFixed(2)} ms (<b>${(d.p95 / u.p95).toFixed(1)}×</b> slower)`; });
          readout.innerHTML = rows.length ? `${picked}: ${rows.join(' · ')}.` : `${picked} has no result on this dataset.`;
        } else if (ds === 'all') {
          readout.innerHTML = 'Volantis DB has the lowest p95 on all three datasets. <b>Pick a dataset</b> to compare.';
        } else {
          const us = sel.find((d) => d.lib === 'Volantis DB');
          const next = sel.filter((d) => d.lib !== 'Volantis DB').sort((a, b) => a.p95 - b.p95)[0];
          const best = [...sel].sort((a, b) => b.ndcg - a.ndcg)[0];
          let t = `Volantis DB <b>${us.p95.toFixed(2)} ms</b> · next fastest ${next.lib} ${next.p95.toFixed(2)} ms (${(next.p95 / us.p95).toFixed(1)}× slower).`;
          if (best.lib !== 'Volantis DB' && best.ndcg > us.ndcg) t += ` ${best.lib} is more accurate here: ${best.ndcg.toFixed(2)} against ${us.ndcg.toFixed(2)}.`;
          if (ds === 'trec') t += ' Not shown: sqlite-vec at 82.36 ms.';
          readout.innerHTML = t;
        }
      }
    };
    $$('#bench-chips .chip').forEach((b) => b.addEventListener('click', () => {
      $$('#bench-chips .chip').forEach((x) => x.setAttribute('aria-pressed', x === b));
      draw(b.dataset.ds);
    }));
    $$('#legend button').forEach((b) => b.addEventListener('click', () => {
      picked = picked === b.dataset.lib ? null : b.dataset.lib;
      $$('#legend button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.lib === picked));
      $('#legend').classList.toggle('picking', !!picked);
      draw();
    }));
    draw('all');
  }

  // Demo data: recorded output of the real engine (demo-results.json).
  const labBox = $('#lab'), graphBox = $('#graph'), twBox = $('#tw-space');
  const graphHooks = [];
  if (labBox || graphBox || twBox) {
    fetch('/volantis-db/demo-results.json').then((r) => r.json()).then((data) => {
      if (labBox) lab(data);
      if (twBox) towers(data);
      if (graphBox) { graph3d(data); graph(data); }
    }).catch(() => {
      [labBox, graphBox].forEach((b) => b && b.insertAdjacentHTML('beforeend', '<p class="note" style="padding:20px">The recorded results did not load. Reload the page.</p>'));
    });
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtMs = (v) => (v < 0.1 ? v.toFixed(3) : v.toFixed(2)) + ' ms';

  function lab(data) {
    const docs = new Map(data.corpus.map((d) => [d.id, d.text]));
    const chips = $('#lab-chips'), typed = $('#lab-typed'), kind = $('#lab-kind');
    const LEGS = { lexical: $('#leg-lexical'), dense: $('#leg-dense'), hybrid: $('#leg-hybrid') };
    let timer, token = 0;
    const render = (q) => {
      Object.entries(LEGS).forEach(([leg, el]) => {
        if (!el) return;
        const r = q.legs[leg];
        $('.ms', el).textContent = 'p50 ' + fmtMs(r.p50);
        const list = $('ol', el), verdict = $('.verdict', el);
        const rank = r.hits.findIndex((h) => h.id === q.answer) + 1;
        if (!r.hits.length) {
          list.innerHTML = '<div class="empty">No results.<br>The query has no word in common with any document.</div>';
        } else {
          list.innerHTML = r.hits.map((h, i) => `<li class="${h.id === q.answer ? 'right' : ''}" style="animation-delay:${calm ? 0 : i * 55}ms"><span class="r">${i + 1}</span><span class="tx">${esc(docs.get(h.id))}</span></li>`).join('');
        }
        verdict.className = 'verdict ' + (rank === 1 ? 'ok' : rank ? 'meh' : 'no');
        verdict.textContent = rank === 1 ? '✓ Right answer first' : rank ? `Right answer at #${rank}` : r.hits.length ? 'Right answer not in top 5' : '✕ Nothing found';
      });
    };
    const pick = (q, btn) => {
      $$('.chip', chips).forEach((b) => b.setAttribute('aria-pressed', b === btn));
      kind.textContent = q.kind;
      clearInterval(timer);
      const my = ++token;
      if (calm) { typed.textContent = q.text; render(q); return; }
      typed.textContent = '';
      Object.values(LEGS).forEach((el) => el && ($('ol', el).style.opacity = .35));
      let n = 0;
      const chars = [...q.text];
      timer = setInterval(() => {
        if (my !== token) return clearInterval(timer);
        typed.textContent = chars.slice(0, ++n).join('');
        if (n >= chars.length) {
          clearInterval(timer);
          Object.values(LEGS).forEach((el) => el && ($('ol', el).style.opacity = 1));
          render(q);
        }
      }, Math.max(14, 380 / chars.length));
    };
    data.queries.forEach((q, i) => {
      const b = Object.assign(document.createElement('button'), { className: 'chip', type: 'button', textContent: q.text });
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => pick(q, b));
      chips.append(b);
      if (i === 1) setTimeout(() => pick(q, b));
    });
    const m = data.meta;
    const meta = $('#lab-meta');
    if (meta) meta.textContent = `${m.engine} · ${m.model} · ${m.documents} documents · ${m.machine} · recorded ${m.recorded}`;
  }

  function graph(data) {
    const g = data.graph;
    const svg = $('#graph-svg');
    const W = 520, H = 330;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pY = (i) => 40 + i * 62, mY = (i) => 40 + i * 62;
    const PX = 92, MX = 380;
    const gE = svgEl('g', {}, svg);
    const edges = [];
    g.meetings.forEach((m, mi) => m.people.forEach((p) => {
      const pi = g.people.indexOf(p);
      const e = svgEl('path', { class: 'e', d: `M${PX + 18},${pY(pi)} C${(PX + MX) / 2},${pY(pi)} ${(PX + MX) / 2},${mY(mi)} ${MX - 70},${mY(mi)}`, fill: 'none' }, gE);
      edges.push({ e, p, m: m.title });
    }));
    const pNodes = g.people.map((p, i) => {
      const n = svgEl('g', { class: 'n person', transform: `translate(${PX},${pY(i)})` }, svg);
      svgEl('circle', { r: 17 }, n);
      svgEl('text', { x: -26, y: 4, 'text-anchor': 'end' }, n).textContent = p;
      return n;
    });
    const mNodes = g.meetings.map((m, i) => {
      const n = svgEl('g', { class: 'n meeting', transform: `translate(${MX},${mY(i)})` }, svg);
      svgEl('rect', { x: -70, y: -17, width: 140, height: 34, rx: 9 }, n);
      svgEl('text', { x: 0, y: 4, 'text-anchor': 'middle' }, n).textContent = m.title;
      const r = svgEl('text', { class: 'rank', x: 80, y: 4 }, n);
      return { n, r, title: m.title };
    });
    svgEl('text', { x: PX, y: 14, 'text-anchor': 'middle', class: 'axis-title', fill: '#8d92a0', style: 'font:700 10px ui-monospace,monospace;letter-spacing:.12em' }, svg).textContent = 'PERSON';
    svgEl('text', { x: MX, y: 14, 'text-anchor': 'middle', fill: '#8d92a0', style: 'font:700 10px ui-monospace,monospace;letter-spacing:.12em' }, svg).textContent = 'MEETING  →  NOTES';
    const chips = $('#graph-chips'), body = $('#graph-rows'), time = $('#graph-ms');
    const run = (r, btn) => {
      $$('.chip', chips).forEach((b) => b.setAttribute('aria-pressed', b === btn));
      const found = new Map(r.rows.map((row, i) => [row.meeting, i + 1]));
      const people = new Set(r.rows.flatMap((row) => row.people));
      mNodes.forEach(({ n, r: rk, title }) => { n.classList.toggle('on', found.has(title)); rk.textContent = found.has(title) ? '#' + found.get(title) : ''; });
      pNodes.forEach((n, i) => n.classList.toggle('on', people.has(g.people[i])));
      edges.forEach(({ e, m }) => e.classList.toggle('on', found.has(m)));
      body.innerHTML = r.rows.map((row) => `<tr><td>${esc(row.meeting)}</td><td class="num">${row.score.toFixed(3)}</td><td>${row.people.map(esc).join(', ')}</td></tr>`).join('');
      if (time) time.textContent = `p50 ${fmtMs(r.p50)}`;
      const q = $('#graph-q');
      if (q) q.textContent = JSON.stringify(r.q);
      graphHooks.forEach((f) => f(r));
    };
    g.runs.forEach((r, i) => {
      const b = Object.assign(document.createElement('button'), { className: 'chip', type: 'button', textContent: r.q });
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => run(r, b));
      chips.append(b);
      if (i === 0) run(r, b);
    });
  }

  // Two towers, one space: documents arrive from the document tower; a question arrives from the query tower
  // and lands next to its real top 3 vector hits (from the recorded demo).
  function towers(data) {
    const svg = $('#tw-svg'), tip = $('#tw-tip'), space = $('#tw-space');
    const W = 520, H = 440, CX = 262, CY = 236;
    const secs = [...new Set(data.corpus.map((d) => d.section))];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    [70, 130, 190].forEach((r) => svgEl('ellipse', { class: 'ring', cx: CX, cy: CY, rx: r * 1.12, ry: r }, svg));
    const centers = secs.map((sec, i) => {
      const a = (i / secs.length) * Math.PI * 2 - Math.PI / 2;
      const c = { x: CX + Math.cos(a) * 168, y: CY + Math.sin(a) * 140 };
      svgEl('text', { class: 'lbl', x: c.x, y: c.y + (Math.sin(a) > 0 ? 44 : -36), 'text-anchor': 'middle' }, svg).textContent = sec;
      return c;
    });
    const gl = svgEl('g', {}, svg);
    const pos = new Map();
    const dots = new Map(data.corpus.map((d) => {
      const c = centers[secs.indexOf(d.section)], a = rnd() * 6.283, r = 8 + rnd() * 26;
      const p = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
      pos.set(d.id, p);
      const el = svgEl('circle', { class: 'd', cx: -20, cy: p.y, r: 4.5, tabindex: 0, role: 'img', 'aria-label': d.text }, svg);
      el.style.transition = 'cx .9s cubic-bezier(.2,.8,.2,1), r .35s, opacity .35s, fill .35s';
      const show = () => {
        const b = space.getBoundingClientRect(), e = el.getBoundingClientRect();
        tip.textContent = d.text; tip.style.left = Math.min(Math.max(e.left - b.left, 120), b.width - 120) + 'px'; tip.style.top = e.top - b.top + 'px'; tip.classList.add('on');
      };
      el.addEventListener('mouseenter', show); el.addEventListener('focus', show); el.addEventListener('click', show);
      el.addEventListener('mouseleave', () => tip.classList.remove('on')); el.addEventListener('blur', () => tip.classList.remove('on'));
      return [d.id, el];
    }));
    const lines = [0, 1, 2].map(() => svgEl('line', { class: 'ql' }, gl));
    const qd = svgEl('circle', { class: 'qd', cx: W + 20, cy: CY, r: 8 }, svg);
    const docTower = $('#tower-doc'), qTower = $('#tower-q'), list = $('#tw-docs'), out = $('#tw-out'), chips = $('#tw-qs');
    const fire = (t) => { t.classList.remove('busy'); void t.offsetWidth; t.classList.add('busy'); };
    // Intro: documents go through the document tower into the space, once.
    let intro = false;
    const runIntro = () => {
      if (intro) return; intro = true;
      const docs = data.corpus;
      docs.forEach((d, i) => setTimeout(() => {
        const el = dots.get(d.id); el.setAttribute('cx', pos.get(d.id).x);
        if (i % 4 === 0) { fire(docTower); list.innerHTML = docs.slice(i, i + 3).map((x) => `<div>${esc(x.text)}</div>`).join(''); }
      }, calm ? 0 : 200 + i * 45));
      setTimeout(() => { list.innerHTML = `<div>${docs.length} help-center articles. Each one went through the document tower once.</div>`; }, calm ? 0 : 260 + docs.length * 45);
    };
    new IntersectionObserver((es, io) => es.forEach((e) => { if (e.isIntersecting) { runIntro(); io.disconnect(); } }), { threshold: .25 }).observe(space);
    const ask = (q, btn) => {
      runIntro();
      $$('.chip', chips).forEach((b) => b.setAttribute('aria-pressed', b === btn));
      const hits = q.legs.dense.hits.slice(0, 3);
      fire(qTower);
      qd.setAttribute('cx', W + 20); qd.setAttribute('cy', CY);
      lines.forEach((l) => l.classList.remove('on'));
      dots.forEach((el) => { el.classList.remove('hit'); el.classList.add('dim'); el.setAttribute('r', 4.5); });
      const wsum = [3, 2, 1].slice(0, hits.length).reduce((a, b) => a + b, 0);
      const tx = hits.reduce((a, h, i) => a + pos.get(h.id).x * [3, 2, 1][i], 0) / wsum;
      const ty = hits.reduce((a, h, i) => a + pos.get(h.id).y * [3, 2, 1][i], 0) / wsum;
      setTimeout(() => { qd.setAttribute('cx', tx); qd.setAttribute('cy', ty); }, calm ? 0 : 380);
      setTimeout(() => {
        hits.forEach((h, i) => {
          const el = dots.get(h.id); el.classList.add('hit'); el.classList.remove('dim'); el.setAttribute('r', 7 - i);
          const l = lines[i], p = pos.get(h.id);
          l.setAttribute('x1', tx); l.setAttribute('y1', ty); l.setAttribute('x2', p.x); l.setAttribute('y2', p.y); l.classList.add('on');
        });
        const docs = new Map(data.corpus.map((d) => [d.id, d.text]));
        out.innerHTML = hits.map((h, i) => `<div style="animation-delay:${i * 80}ms"><b>${i + 1}</b><span>${esc(docs.get(h.id))}${h.id === q.answer ? ' <span style="color:#7ee2a8">✓</span>' : ''}</span></div>`).join('');
      }, calm ? 0 : 1250);
    };
    data.queries.forEach((q, i) => {
      const b = Object.assign(document.createElement('button'), { className: 'chip', type: 'button', textContent: q.text });
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => ask(q, b));
      chips.append(b);
    });
  }

  // 3D graph of people, meetings and notes. The library loads only when the section is near.
  function graph3d(data) {
    const el = $('#graph-3d');
    if (!el) return;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) { el.classList.add('failed'); return; }
    const g = data.graph;
    const nodes = [
      ...g.people.map((p) => ({ id: 'p:' + p, label: p, kind: 'person' })),
      ...g.meetings.map((m) => ({ id: 'm:' + m.title, label: m.title, kind: 'meeting' })),
      ...g.meetings.map((m) => ({ id: 'n:' + m.title, label: 'Notes: ' + m.text, kind: 'note' })),
    ];
    const links = [
      ...g.meetings.flatMap((m) => m.people.map((p) => ({ source: 'p:' + p, target: 'm:' + m.title, type: 'ATTENDED' }))),
      ...g.meetings.map((m) => ({ source: 'm:' + m.title, target: 'n:' + m.title, type: 'HAS_NOTES' })),
    ];
    let hl = null, G = null, pending = null;
    const on = (n) => !hl || hl.has(n.id);
    const COL = { person: ['#f9a711', '#e6dcc6'], meeting: ['#0e1a36', '#b8bfcf'], note: ['#f07b1d', '#ece4d2'] };
    const linkOn = (l) => hl && hl.has(l.source.id ?? l.source) && hl.has(l.target.id ?? l.target);
    const apply = (r) => {
      const found = new Set(r.rows.map((row) => row.meeting));
      hl = new Set();
      r.rows.forEach((row) => { hl.add('m:' + row.meeting); hl.add('n:' + row.meeting); row.people.forEach((p) => hl.add('p:' + p)); });
      if (!G) { pending = r; return; }
      G.nodeColor(G.nodeColor()).linkColor(G.linkColor()).linkWidth(G.linkWidth()).linkDirectionalParticles(G.linkDirectionalParticles());
      G.zoomToFit(calm ? 0 : 1100, 70, (n) => hl.has(n.id));
      void found;
    };
    graphHooks.push(apply);
    const build = () => {
      G = window.ForceGraph3D({ controlType: 'orbit' })(el)
        .width(el.clientWidth).height(el.clientHeight)
        .backgroundColor('rgba(0,0,0,0)').showNavInfo(false)
        .graphData({ nodes, links })
        .nodeLabel((n) => n.label)
        .nodeVal((n) => (n.kind === 'meeting' ? 7 : n.kind === 'person' ? 4.5 : 2.2))
        .nodeResolution(20).nodeOpacity(.95)
        .nodeColor((n) => COL[n.kind][on(n) ? 0 : 1])
        .linkColor((l) => (linkOn(l) ? '#b47a00' : 'rgba(14,26,54,0.28)'))
        .linkWidth((l) => (linkOn(l) ? 1.4 : 0.35))
        .linkOpacity(.6)
        .linkDirectionalParticles((l) => (linkOn(l) ? 3 : 0))
        .linkDirectionalParticleWidth(2.2).linkDirectionalParticleSpeed(.008)
        .linkDirectionalParticleColor(() => '#f07b1d')
        .cooldownTicks(140)
        .onNodeClick((n) => {
          const d = 90 / Math.hypot(n.x || 1, n.y || 1, n.z || 1);
          G.cameraPosition({ x: n.x * (1 + d), y: n.y * (1 + d), z: n.z * (1 + d) }, n, calm ? 0 : 1100);
        });
      G.d3Force('charge').strength(-90);
      const ctl = G.controls();
      if (ctl && !calm) { ctl.autoRotate = true; ctl.autoRotateSpeed = 0.7; }
      el.addEventListener('pointerdown', () => { if (ctl) ctl.autoRotate = false; }, { once: true });
      new ResizeObserver(() => G.width(el.clientWidth).height(el.clientHeight)).observe(el);
      G.onEngineStop(() => { if (pending) { const r = pending; pending = null; apply(r); } });
      setTimeout(() => G.zoomToFit(calm ? 0 : 600, 30), 900);
      // Labels: HTML text that follows each node on screen.
      const layer = document.createElement('div');
      layer.className = 'labels3d'; layer.setAttribute('aria-hidden', 'true');
      el.append(layer);
      const tags = nodes.map((n) => {
        const t = document.createElement('span');
        t.className = 'l3d ' + n.kind;
        t.textContent = n.kind === 'note' ? 'notes' : n.label;
        layer.append(t);
        return [n, t];
      });
      let live = true;
      new IntersectionObserver((es) => es.forEach((e) => { live = e.isIntersecting; if (live) requestAnimationFrame(place); })).observe(el);
      const place = () => {
        if (!live) return;
        tags.forEach(([n, t]) => {
          if (n.x === undefined) return;
          const p = G.graph2ScreenCoords(n.x, n.y, n.z);
          t.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, ${n.kind === 'meeting' ? 12 : 9}px)`;
          t.classList.toggle('dim', !on(n));
        });
        requestAnimationFrame(place);
      };
      requestAnimationFrame(place);
    };
    const load = () => new Promise((ok, no) => {
      if (window.ForceGraph3D) return ok();
      const s = document.createElement('script');
      s.src = '/volantis-db/vendor/3d-force-graph-1.80.1.min.js'; s.onload = ok; s.onerror = no;
      document.head.append(s);
    });
    new IntersectionObserver((es, io) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      load().then(build).catch(() => el.classList.add('failed'));
    }), { rootMargin: '600px 0px' }).observe(el);
  }

  // Docs and benchmarks pages: mark the section in view in the contents list.
  const toc = $$('.toc a');
  if (toc.length) {
    const map = new Map(toc.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      toc.forEach((a) => a.classList.remove('on'));
      map.get(e.target.id)?.classList.add('on');
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
})();
