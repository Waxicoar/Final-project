import {
  SCENARIOS, GRID_STEP, MODEL_FACTORS, CITIES,
  latAmplification, annualMeanTemp, dailyTemp, isLand,
} from './data.js';

/* ============================================================
   State
   ============================================================ */

const state = {
  city: null,              // reference to a CITIES entry
  quizAnswers: [-99, -99, -99],
  currentSSP: 1,           // 0..2, can be fractional while dragging slider
  overridden: false,
  mapView: { tx: 0, ty: 0, s: 1 },
};

const CELL_CACHE = new Map();
const BASELINE_HOT_DAYS = 91; // 25% of 365, by construction

/* ============================================================
   Tiny DOM / SVG helpers
   ============================================================ */

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}, children = []) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

function h(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

/* ============================================================
   Color helpers
   ============================================================ */

function hexToRgb(hex) {
  const s = hex.replace('#', '');
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}
function rgbToHex({ r, g, b }) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function interpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  });
}
function sampleRamp(ramp, t) {
  t = Math.max(0, Math.min(1, t));
  const idx = t * (ramp.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  if (i >= ramp.length - 1) return ramp[ramp.length - 1];
  return interpColor(ramp[i], ramp[i + 1], f);
}

const MAP_RAMP = ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b',
                  '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'];
const CAL_COOL = ['#0d2b6b', '#2166ac', '#92c5de', '#dbeafe'];
const CAL_HOT  = ['#fde68a', '#f59e0b', '#dc2626', '#7f1d1d'];

const SSP_COLORS = ['#2563eb', '#d97706', '#dc2626'];

/* ============================================================
   Cell-level cache & derived quantities
   ============================================================ */

function getCell(lat, lon) {
  const key = lat.toFixed(2) + ',' + lon.toFixed(2);
  if (CELL_CACHE.has(key)) return CELL_CACHE.get(key);

  const baselineTemps = [];
  for (let d = 0; d < 365; d++) {
    baselineTemps.push(dailyTemp(lat, lon, d, 0, 0));
  }
  const sorted = [...baselineTemps].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(365 * 0.75)];

  const result = {
    lat, lon,
    baselineTemps,
    threshold,
    latAmp: latAmplification(lat),
  };
  CELL_CACHE.set(key, result);
  return result;
}

function hotDaysForCell(cell, deltaC) {
  const shift = deltaC * cell.latAmp;
  let n = 0;
  for (let d = 0; d < 365; d++) {
    if (cell.baselineTemps[d] + shift > cell.threshold) n++;
  }
  return n;
}

function currentDelta() {
  const t = state.currentSSP;
  const i0 = Math.floor(t);
  const i1 = Math.min(2, i0 + 1);
  const f = t - i0;
  return SCENARIOS[i0].delta * (1 - f) + SCENARIOS[i1].delta * f;
}

function currentScenarioLabel() {
  const t = state.currentSSP;
  if (Math.abs(t - 0) < 0.05) return `${SCENARIOS[0].label} — ${SCENARIOS[0].name}`;
  if (Math.abs(t - 1) < 0.05) return `${SCENARIOS[1].label} — ${SCENARIOS[1].name}`;
  if (Math.abs(t - 2) < 0.05) return `${SCENARIOS[2].label} — ${SCENARIOS[2].name}`;
  const lo = Math.floor(t), hi = Math.min(2, lo + 1);
  return `Between ${SCENARIOS[lo].label} and ${SCENARIOS[hi].label}`;
}

function nearestCityTo(lat, lon, exclude = null) {
  let best = null, bestD = Infinity;
  for (const c of CITIES) {
    if (c === exclude) continue;
    const dLat = c.lat - lat;
    const dLon = (c.lon - lon) * Math.cos(lat * Math.PI / 180);
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) { bestD = d; best = c; }
  }
  return { city: best, distKm: Math.sqrt(bestD) * 111 };
}

/* ============================================================
   Init
   ============================================================ */

function init() {
  populateCityList();
  setupCityInput();
  setupQuiz();
  setupMapPanZoom();
  setupSlider();
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   Act 1 — city + quiz
   ============================================================ */

function populateCityList() {
  const list = document.getElementById('cityList');
  clear(list);
  for (const c of CITIES) {
    const o = document.createElement('option');
    o.value = `${c.name}, ${c.country}`;
    list.appendChild(o);
  }
}

function setupCityInput() {
  const input = document.getElementById('cityInput');
  const btn   = document.getElementById('cityBtn');

  input.addEventListener('input', () => {
    document.getElementById('cityError').hidden = true;
  });

  btn.addEventListener('click', () => {
    const raw = input.value.trim();
    if (!raw) return;
    const city = CITIES.find(c =>
      `${c.name}, ${c.country}`.toLowerCase() === raw.toLowerCase() ||
      c.name.toLowerCase() === raw.toLowerCase()
    );
    if (!city) {
      document.getElementById('cityError').hidden = false;
      return;
    }
    state.city = city;
    document.getElementById('cityError').hidden = true;
    input.value = `${city.name}, ${city.country}`;
    document.getElementById('quiz').hidden = false;
    renderQuiz();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

const QUIZ = [
  {
    q: 'When should the world take major action to cut emissions?',
    opts: [
      { label: 'Right now — every year matters',      score: -1 },
      { label: 'Within the next decade',              score:  0 },
      { label: 'Later, when the effects are clearer', score:  1 },
    ],
  },
  {
    q: 'How should we balance economic growth and climate action?',
    opts: [
      { label: 'Environment first, even if growth slows', score: -1 },
      { label: 'A careful balance of both',              score:  0 },
      { label: 'Growth first — we\u2019ll adapt later',   score:  1 },
    ],
  },
  {
    q: 'How much personal change are you willing to make?',
    opts: [
      { label: 'Significant changes to how I live',      score: -1 },
      { label: 'Some changes, where convenient',         score:  0 },
      { label: 'Not much — I\u2019d rather not sacrifice', score:  1 },
    ],
  },
];

function setupQuiz() { /* nothing to attach — rendered below */ }

function renderQuiz() {
  const host = document.getElementById('quizQuestions');
  clear(host);

  QUIZ.forEach((item, qi) => {
    const box = h('div', { class: 'q' });
    box.appendChild(h('p', { class: 'q-text' }, [item.q]));
    const opts = h('div', { class: 'q-opts' });

    item.opts.forEach((opt, oi) => {
      const btn = h('button', {
        type: 'button',
        class: 'opt' + (state.quizAnswers[qi] === opt.score ? ' sel' : ''),
        'data-q': qi,
        'data-score': opt.score,
      }, [opt.label]);

      btn.addEventListener('click', () => {
        state.quizAnswers[qi] = opt.score;
        renderQuiz();
        renderVerdict();
      });

      opts.appendChild(btn);
    });

    box.appendChild(opts);
    host.appendChild(box);
  });
}

function sumScore() {
  if (state.quizAnswers.some(a => a === -99)) return null;
  return state.quizAnswers.reduce((a, b) => a + b, 0);
}

function suggestedSSP() {
  const s = sumScore();
  if (s === null) return null;
  if (s <= -2) return 0;
  if (s <=  1) return 1;
  return 2;
}

const SSP_DESCRIPTIONS = [
  'Rapid decarbonization. Emissions peak almost immediately and warming stays near +1.8\u202f°C. It requires aggressive global action, but it avoids the worst outcomes.',
  'A middle path. Emissions rise until mid-century, then fall slowly. Warming reaches about +2.7\u202f°C, with substantial but uneven impacts.',
  'High emissions. Fossil fuels keep rising, and warming reaches +4.4\u202f°C or more. The most severe impacts fall on the most vulnerable places.',
];

function renderVerdict() {
  const idx = suggestedSSP();
  const el = document.getElementById('verdict');
  if (idx === null) { el.hidden = true; return; }

  el.hidden = false;

  // First-time answer: align currentSSP to suggestion
  if (!state.overridden && state.currentSSP !== idx) {
    state.currentSSP = idx;
  }

  const isOverride = state.currentSSP !== idx;
  const shown = SCENARIOS[state.currentSSP] || SCENARIOS[idx];
  const shownIdx = Math.round(state.currentSSP);

  el.innerHTML = `
    <p class="verdict-kicker">${isOverride ? 'You chose to explore' : 'Based on your answers'}</p>
    <p class="verdict-ssp">${shown.label} \u2014 ${shown.name}</p>
    <p class="verdict-text">${SSP_DESCRIPTIONS[shownIdx]}</p>
    <p class="verdict-override-label">Explore a different future:</p>
    <div class="override-btns">
      ${SCENARIOS.map((s, i) =>
        `<button class="opt ${i === shownIdx ? 'sel' : ''}" data-ssp="${i}">${s.label}</button>`
      ).join('')}
    </div>
    <button class="btn" id="acceptBtn" type="button">See your 2080 \u2192</button>
  `;

  el.querySelectorAll('[data-ssp]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentSSP = parseInt(btn.dataset.ssp, 10);
      state.overridden = true;
      renderVerdict();
    });
  });

  el.querySelector('#acceptBtn').addEventListener('click', () => {
    document.getElementById('act2').hidden = false;
    renderAct2();
    document.getElementById('act2').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ============================================================
   Act 2 — map + calendar + fan
   ============================================================ */

function renderAct2() {
  if (!state.city) return;
  document.getElementById('act2Sub').textContent =
    `Your city: ${state.city.name}, ${state.city.country}  \u00b7  ` +
    `scenario: ${currentScenarioLabel()}`;
  renderMap();
  renderCalendar();
  renderFan();
  updateDynamicViews();
}

/* ----- MAP ----- */

const MAP_W = 720, MAP_H = 360;

function renderMap() {
  const el = document.getElementById('map');
  clear(el);

  el.appendChild(svgEl('rect', { x: 0, y: 0, width: MAP_W, height: MAP_H, fill: '#e6eff7' }));

  const g = svgEl('g', { id: 'mapG' });

  for (let lat = 85; lat >= -85; lat -= GRID_STEP) {
    for (let lon = -175; lon <= 175; lon += GRID_STEP) {
      if (!isLand(lat, lon)) continue;
      const x = (lon + 180) * 2 - GRID_STEP;
      const y = (90 - lat) * 2 - GRID_STEP;
      const rect = svgEl('rect', {
        x, y,
        width: GRID_STEP * 2,
        height: GRID_STEP * 2,
        'data-lat': lat,
        'data-lon': lon,
        class: 'map-cell',
        fill: '#fdae6b',
        stroke: 'rgba(255,255,255,0.35)',
        'stroke-width': 0.5,
      });
      rect.addEventListener('mouseenter', onCellHover);
      rect.addEventListener('mouseleave', onCellLeave);
      g.appendChild(rect);
    }
  }

  // Current city marker
  if (state.city) {
    const cx = (state.city.lon + 180) * 2;
    const cy = (90 - state.city.lat) * 2;
    g.appendChild(svgEl('circle', {
      cx, cy, r: 5.5, fill: '#ffffff',
      stroke: '#111111', 'stroke-width': 2.2,
    }));
  }

  el.appendChild(g);
  applyMapTransform();
  renderMapLegend();
}

function onCellHover(e) {
  const r = e.currentTarget;
  const lat = parseFloat(r.dataset.lat);
  const lon = parseFloat(r.dataset.lon);
  const cell = getCell(lat, lon);
  const hot = hotDaysForCell(cell, currentDelta());
  const ext = hot - BASELINE_HOT_DAYS;

  const tip = document.getElementById('mapTip');
  const nearest = nearestCityTo(lat, lon);
  tip.hidden = false;
  tip.innerHTML =
    `<div>${lat.toFixed(0)}\u00b0, ${lon.toFixed(0)}\u00b0` +
    `<span> \u00b7 near ${nearest.city.name}</span></div>` +
    `<div>+${ext} hot days in 2080</div>`;

  const wrap = r.closest('.map-wrap');
  const cr = r.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  tip.style.left = (cr.left - wr.left + cr.width / 2 - tip.offsetWidth / 2) + 'px';
  tip.style.top  = (cr.top  - wr.top  - tip.offsetHeight - 6) + 'px';
}
function onCellLeave() {
  document.getElementById('mapTip').hidden = true;
}

function renderMapLegend() {
  const el = document.getElementById('mapLegend');
  clear(el);
  const bar = h('div', { class: 'legend-bar' });
  bar.style.background = `linear-gradient(90deg, ${MAP_RAMP.join(', ')})`;
  const ticks = h('div', { class: 'legend-ticks' }, [
    h('span', {}, ['0']),
    h('span', {}, ['50']),
    h('span', {}, ['100']),
    h('span', {}, ['150+']),
  ]);
  el.appendChild(bar);
  el.appendChild(ticks);
  el.appendChild(h('div', { class: 'legend-title' }, ['extra days above the hot-season threshold']));
}

function applyMapTransform() {
  const g = document.getElementById('mapG');
  if (!g) return;
  const { tx, ty, s } = state.mapView;
  g.setAttribute('transform', `translate(${tx} ${ty}) scale(${s})`);
}

function setupMapPanZoom() {
  const svg = document.getElementById('map');
  let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;

  function clientToSVG(e) {
    const r = svg.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width  * MAP_W,
      y: (e.clientY - r.top)  / r.height * MAP_H,
    };
  }

  svg.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startTx = state.mapView.tx; startTy = state.mapView.ty;
    svg.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const r = svg.getBoundingClientRect();
    const sx = MAP_W / r.width;
    const sy = MAP_H / r.height;
    state.mapView.tx = startTx + (e.clientX - startX) * sx;
    state.mapView.ty = startTy + (e.clientY - startY) * sy;
    applyMapTransform();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    svg.style.cursor = 'grab';
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = clientToSVG(e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newS = Math.max(0.6, Math.min(8, state.mapView.s * factor));
    const ratio = newS / state.mapView.s;
    state.mapView.tx = p.x - (p.x - state.mapView.tx) * ratio;
    state.mapView.ty = p.y - (p.y - state.mapView.ty) * ratio;
    state.mapView.s = newS;
    applyMapTransform();
  }, { passive: false });
}

/* ----- CALENDAR ----- */

const CAL_W = 740, CAL_H = 200;
const CELL_W = 11, CELL_H = 20, CELL_GAP = 1;
const CAL_LEFT = 20, CAL_TOP = 25;

function renderCalendar() {
  const svg = document.getElementById('calendar');
  clear(svg);

  if (!state.city) return;

  // Month labels
  const months = [
    ['Jan', 0], ['Mar', 8], ['May', 17], ['Jul', 26],
    ['Sep', 35], ['Nov', 43],
  ];
  for (const [name, week] of months) {
    svg.appendChild(svgEl('text', {
      x: CAL_LEFT + week * (CELL_W + CELL_GAP),
      y: 15,
      class: 'cal-month',
    }, [name]));
  }

  // Cells (week-of-year × day-of-week)
  for (let d = 0; d < 365; d++) {
    const week = Math.floor(d / 7);
    const dow  = d % 7;
    const x = CAL_LEFT + week * (CELL_W + CELL_GAP);
    const y = CAL_TOP  + dow  * (CELL_H + CELL_GAP);
    svg.appendChild(svgEl('rect', {
      x, y, width: CELL_W, height: CELL_H,
      'data-day': d,
      class: 'cal-cell',
      fill: '#eef2f6',
      rx: 1.5,
    }));
  }

  // Static y-axis label
  svg.appendChild(svgEl('text', {
    x: 2, y: CAL_TOP + 14, class: 'axis-text',
  }, ['Mon']));
  svg.appendChild(svgEl('text', {
    x: 2, y: CAL_TOP + 6 * (CELL_H + CELL_GAP) + 12, class: 'axis-text',
  }, ['Sun']));
}

function updateCalendarColors() {
  if (!state.city) return;
  const cell = getCell(state.city.lat, state.city.lon);
  const shift = currentDelta() * cell.latAmp;
  const threshold = cell.threshold;
  const temps = cell.baselineTemps.map(t => t + shift);

  const allDev = temps.map(t => Math.abs(t - threshold));
  const range = Math.max(...allDev) || 1;

  const nodes = document.querySelectorAll('#calendar .cal-cell');
  nodes.forEach(node => {
    const d = parseInt(node.dataset.day, 10);
    const t = temps[d];
    const isHot = t > threshold;

    let color;
    if (isHot) {
      const v = Math.min(1, (t - threshold) / (range * 0.75));
      color = sampleRamp(CAL_HOT, 0.15 + v * 0.85);
    } else {
      const v = Math.min(1, (threshold - t) / (range * 0.75));
      color = sampleRamp(CAL_COOL, 0.15 + v * 0.85);
    }
    node.setAttribute('fill', color);
    node.setAttribute('stroke', isHot ? 'rgba(127,29,29,0.55)' : 'none');
    node.setAttribute('stroke-width', isHot ? 0.8 : 0);
  });

  // Hot-season count label — drawn each time on top
  const svg = document.getElementById('calendar');
  svg.querySelectorAll('.cal-stat').forEach(n => n.remove());

  const hotDays = hotDaysForCell(cell, currentDelta());
  const ext = hotDays - BASELINE_HOT_DAYS;

  svg.appendChild(svgEl('text', {
    x: CAL_W - 12, y: 15, 'text-anchor': 'end', class: 'cal-stat',
  }, [`Hot season: ${hotDays} days  (+${ext})`]));
}

/* ----- FAN CHART ----- */

function renderFan() {
  const svg = document.getElementById('fan');
  clear(svg);
  if (!state.city) return;

  const cell = getCell(state.city.lat, state.city.lon);
  const ML = 52, MR = 16, MT = 22, MB = 34;
  const W = 720, H = 230;
  const CW = W - ML - MR;
  const CH = H - MT - MB;

  // Collect all values first so we can scale y dynamically
  const yearStart = 1995, yearEnd = 2100;
  const bands = SCENARIOS.map((s, si) => {
    const band = [];
    for (let yr = yearStart; yr <= yearEnd; yr++) {
      const baseDelta = s.delta * (yr - yearStart) / (yearEnd - yearStart);
      const vals = MODEL_FACTORS.map(mf => hotDaysForCell(cell, baseDelta * mf));
      band.push({
        yr,
        min: Math.min(...vals),
        max: Math.max(...vals),
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      });
    }
    return { si, band };
  });

  let yMin = Infinity, yMax = -Infinity;
  for (const { band } of bands) {
    for (const p of band) {
      if (p.min < yMin) yMin = p.min;
      if (p.max > yMax) yMax = p.max;
    }
  }
  yMin = Math.max(0, Math.floor(yMin / 25) * 25);
  yMax = Math.min(365, Math.ceil(yMax / 25) * 25 + 25);

  const xS = (yr) => ML + (yr - yearStart) / (yearEnd - yearStart) * CW;
  const yS = (d)  => MT + CH - (d - yMin) / (yMax - yMin) * CH;

  // Y grid + labels
  const yTicks = [];
  const yStep = 50;
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);

  for (const v of yTicks) {
    svg.appendChild(svgEl('line', {
      x1: ML, x2: ML + CW, y1: yS(v), y2: yS(v),
      stroke: '#eee', 'stroke-width': 1,
    }));
    svg.appendChild(svgEl('text', {
      x: ML - 8, y: yS(v) + 3.5, 'text-anchor': 'end', class: 'axis-text',
    }, [String(v)]));
  }

  // X labels
  for (let yr = 2000; yr <= 2100; yr += 20) {
    svg.appendChild(svgEl('line', {
      x1: xS(yr), x2: xS(yr), y1: MT + CH, y2: MT + CH + 4,
      stroke: '#bbb',
    }));
    svg.appendChild(svgEl('text', {
      x: xS(yr), y: MT + CH + 17, 'text-anchor': 'middle', class: 'axis-text',
    }, [String(yr)]));
  }

  // Bands
  for (const { si, band } of bands) {
    const c = SSP_COLORS[si];

    // Filled band
    const topPath = band.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${xS(p.yr)},${yS(p.max)}`).join(' ');
    const bottomPath = [...band].reverse().map(p =>
      `L${xS(p.yr)},${yS(p.min)}`).join(' ');
    svg.appendChild(svgEl('path', {
      d: topPath + ' ' + bottomPath + ' Z',
      fill: c, opacity: 0.16,
    }));

    // Mean line
    const meanPath = band.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${xS(p.yr)},${yS(p.mean)}`).join(' ');
    svg.appendChild(svgEl('path', {
      d: meanPath, fill: 'none',
      stroke: c, 'stroke-width': 2.2, 'stroke-linejoin': 'round',
    }));
  }

  // Baseline reference
  svg.appendChild(svgEl('line', {
    x1: ML, x2: ML + CW,
    y1: yS(BASELINE_HOT_DAYS), y2: yS(BASELINE_HOT_DAYS),
    stroke: '#94a3b8', 'stroke-width': 1, 'stroke-dasharray': '4 3',
  }));
  svg.appendChild(svgEl('text', {
    x: ML + 4, y: yS(BASELINE_HOT_DAYS) - 5, class: 'fan-note',
  }, ['1995\u20132014 baseline (91 days)']));

  // Legend
  const lx = ML + CW - 8;
  ['SSP1-2.6', 'SSP2-4.5', 'SSP5-8.5'].forEach((lab, i) => {
    svg.appendChild(svgEl('rect', {
      x: lx - 150 + i * 52, y: MT - 16, width: 10, height: 10,
      fill: SSP_COLORS[i], rx: 1,
    }));
    svg.appendChild(svgEl('text', {
      x: lx - 137 + i * 52, y: MT - 7, class: 'axis-text',
    }, [lab]));
  });

  // Axis labels
  svg.appendChild(svgEl('text', {
    x: ML + CW / 2, y: H - 6, 'text-anchor': 'middle', class: 'axis-title',
  }, ['Year']));
  svg.appendChild(svgEl('text', {
    x: 12, y: MT + CH / 2, 'text-anchor': 'middle', class: 'axis-title',
    transform: `rotate(-90 12 ${MT + CH / 2})`,
  }, ['Hot season (days/year)']));
}

/* ============================================================
   Act 3 — slider + analog + takeaway
   ============================================================ */

function setupSlider() {
  const s = document.getElementById('sspSlider');
  s.addEventListener('input', () => {
    state.currentSSP = parseFloat(s.value);
    state.overridden = true;
    document.getElementById('scenarioLabel').textContent = currentScenarioLabel();
    scheduleUpdate();
  });
  document.getElementById('scenarioLabel').textContent = currentScenarioLabel();

  document.getElementById('toAct3').addEventListener('click', () => {
    document.getElementById('act3').hidden = false;
    document.getElementById('sspSlider').value = state.currentSSP;
    document.getElementById('scenarioLabel').textContent = currentScenarioLabel();
    updateDynamicViews();
    document.getElementById('act3').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

let updateQueued = false;
function scheduleUpdate() {
  if (updateQueued) return;
  updateQueued = true;
  requestAnimationFrame(() => {
    updateQueued = false;
    updateDynamicViews();
  });
}

function updateDynamicViews() {
  // Update act2 sub
  const sub = document.getElementById('act2Sub');
  if (sub && state.city) {
    sub.textContent =
      `Your city: ${state.city.name}, ${state.city.country}  \u00b7  ` +
      `scenario: ${currentScenarioLabel()}`;
  }

  // Map cells
  const delta = currentDelta();
  document.querySelectorAll('#map .map-cell').forEach(r => {
    const lat = parseFloat(r.dataset.lat);
    const lon = parseFloat(r.dataset.lon);
    const cell = getCell(lat, lon);
    const hot = hotDaysForCell(cell, delta);
    const ext = hot - BASELINE_HOT_DAYS;
    r.setAttribute('fill', sampleRamp(MAP_RAMP, ext / 150));
  });

  // Calendar
  updateCalendarColors();

  // Analog + takeaway
  renderAnalog();
  renderTakeaway();
}

function renderAnalog() {
  if (!state.city) return;
  const el = document.getElementById('analog');

  const futureMean = annualMeanTemp(state.city.lat) +
                     currentDelta() * latAmplification(state.city.lat);

  let best = null, bestDist = Infinity;
  for (const c of CITIES) {
    if (c === state.city) continue;
    if (Math.hypot(c.lat - state.city.lat, c.lon - state.city.lon) < 6) continue;
    const m = annualMeanTemp(c.lat);
    const d = Math.abs(m - futureMean);
    if (d < bestDist) { bestDist = d; best = c; }
  }

  if (!best) { el.textContent = ''; return; }

  const km = Math.round(Math.abs(state.city.lat - best.lat) * 111);
  const dir = best.lat < state.city.lat ? 'south' : 'north';

  el.innerHTML =
    `In 2080, <strong>${state.city.name}</strong>'s climate will feel more like ` +
    `today's <strong>${best.name}, ${best.country}</strong> \u2014 about ` +
    `<strong>${km}\u202fkm ${dir}</strong> of climate displacement.`;
}

function renderTakeaway() {
  if (!state.city) return;
  const el = document.getElementById('takeaway');

  const cell = getCell(state.city.lat, state.city.lon);
  const hot  = hotDaysForCell(cell, currentDelta());
  const ext  = hot - BASELINE_HOT_DAYS;

  const h126 = hotDaysForCell(cell, SCENARIOS[0].delta);
  const h585 = hotDaysForCell(cell, SCENARIOS[2].delta);
  const gap  = h585 - h126;

  // Model spread at 2080 for the current scenario
  const baseDelta = currentDelta();
  const modelVals = MODEL_FACTORS.map(mf => hotDaysForCell(cell, baseDelta * mf));
  const spread = Math.max(...modelVals) - Math.min(...modelVals);

  const gapWeeks = (gap / 7).toFixed(1);
  const spreadWeeks = (spread / 7).toFixed(1);

  el.innerHTML = `
    <h3>What this means</h3>
    <p>In 2080 under <b>${SCENARIOS[Math.round(state.currentSSP)].label}</b>,
    <strong>${state.city.name}</strong>'s hot season is
    <strong>${hot} days</strong> long \u2014 <strong>+${ext} days</strong>
    compared to 1995\u20132014.</p>
    <p>Across the whole range of futures, the gap between
    <b>SSP1-2.6</b> and <b>SSP5-8.5</b> is <strong>${gap} days</strong>
    (\u2248${gapWeeks} weeks). That is larger than the model
    spread at any single scenario (\u2248${spreadWeeks} weeks).</p>
    <p>The future your city gets is a <b>choice</b>, not a coin flip.</p>
  `;
}
