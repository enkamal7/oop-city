





/* ==========================================================

   OOP CITY — script.js  (vanilla JavaScript, no dependencies)

   Sections: utils · FX · city art · scenes · progress ·

             districts (5) · source editor · finale · boot

   ========================================================== */

'use strict';

(() => {

 

/* ---------------------------------------------------------

   UTILS

--------------------------------------------------------- */

const $  = (s, r = document) => r.querySelector(s);

const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const sleep = ms => new Promise(res => setTimeout(res, ms));

const NS = 'http://www.w3.org/2000/svg';

const svgEl = (tag, attrs = {}, parent) => {

  const e = document.createElementNS(NS, tag);

  for (const k in attrs) e.setAttribute(k, attrs[k]);

  if (parent) parent.appendChild(e);

  return e;

};

const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const pad3 = n => String(n).padStart(3, '0');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const wait = ms => sleep(reduceMotion ? Math.min(ms, 40) : ms);

 

function rng(seed) { // small seeded PRNG so the skyline is identical on every load

  return function () {

    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;

    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

  };

}

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

 

/* ---------- tiny Java syntax highlighter ---------- */

const KEYWORDS = new Set(['class', 'extends', 'implements', 'interface', 'public', 'private', 'protected', 'void', 'int', 'double', 'boolean', 'new', 'return', 'if', 'else', 'for', 'static', 'final', 'this', 'super', 'true', 'false', 'null', 'import', 'abstract']);

function hl(line) {

  const re = /(\/\/.*)|("(?:[^"\\]|\\.)*")|(@\w+)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b/g;

  let out = '', last = 0, m;

  while ((m = re.exec(line))) {

    out += esc(line.slice(last, m.index));

    if (m[1]) out += `<span class="tk-c">${esc(m[1])}</span>`;

    else if (m[2]) out += `<span class="tk-s">${esc(m[2])}</span>`;

    else if (m[3]) out += `<span class="tk-a">${esc(m[3])}</span>`;

    else if (m[4]) out += `<span class="tk-n">${m[4]}</span>`;

    else {

      const w = m[5];

      if (KEYWORDS.has(w)) out += `<span class="tk-k">${w}</span>`;

      else if (/^[A-Z]/.test(w)) out += `<span class="tk-t">${w}</span>`;

      else if (line[re.lastIndex] === '(') out += `<span class="tk-f">${w}</span>`;

      else out += w;

    }

    last = re.lastIndex;

  }

  return out + esc(line.slice(last));

}

function renderCode(el, code) {

  const lines = code.split('\n');

  el.innerHTML = lines.map((l, i) =>

    `<div class="ln" style="--i:${Math.min(i, 40)}"><span class="no">${i + 1}</span><span class="src">${hl(l) || ' '}</span></div>`).join('');

}

function scrollInside(box, el, center) {

  const top = el.offsetTop, bottom = top + el.offsetHeight;

  if (center || top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - box.clientHeight / 2);

}

function flashLine(el, needle, ms = 1500) {

  const ln = $$('.ln', el).find(d => $('.src', d).textContent.includes(needle));

  if (!ln) return;

  ln.classList.add('hot');

  scrollInside(el, ln);

  setTimeout(() => ln.classList.remove('hot'), ms);

}

function termPush(el, text, cls = '') {

  const d = document.createElement('div');

  d.className = 't-line ' + cls;

  d.textContent = text;

  el.appendChild(d);

  while (el.children.length > 60) el.removeChild(el.firstChild);

  el.scrollTop = el.scrollHeight;

  return d;

}

 

/* ---------------------------------------------------------

   SOUND (optional, synthesized — off by default)

--------------------------------------------------------- */

const sound = { on: false, ctx: null };

function audio() {

  if (!sound.ctx) { try { sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { sound.ctx = null; } }

  return sound.ctx;

}

function tone({ type = 'sine', f0, f1, dur = .2, gain = .12, delay = 0, lp }) {

  if (!sound.on) return;

  const ctx = audio(); if (!ctx) return;

  const t = ctx.currentTime + delay;

  const o = ctx.createOscillator(), g = ctx.createGain();

  o.type = type;

  o.frequency.setValueAtTime(f0, t);

  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);

  g.gain.setValueAtTime(0.0001, t);

  g.gain.exponentialRampToValueAtTime(gain, t + .02);

  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let node = o;

  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }

  node.connect(g); g.connect(ctx.destination);

  o.start(t); o.stop(t + dur + .05);

}

const sfx = {

  click: () => tone({ type: 'square', f0: 660, f1: 880, dur: .06, gain: .04 }),

  ok: () => { tone({ f0: 520, f1: 780, dur: .12, gain: .07 }); tone({ f0: 780, f1: 1040, dur: .14, gain: .06, delay: .1 }); },

  deny: () => tone({ type: 'sawtooth', f0: 220, f1: 90, dur: .35, gain: .08, lp: 900 }),

  dog: () => { tone({ type: 'sawtooth', f0: 320, f1: 140, dur: .14, gain: .12, lp: 1200 }); tone({ type: 'sawtooth', f0: 300, f1: 130, dur: .16, gain: .12, delay: .2, lp: 1200 }); },

  cat: () => { tone({ type: 'triangle', f0: 520, f1: 980, dur: .22, gain: .1 }); tone({ type: 'triangle', f0: 980, f1: 560, dur: .3, gain: .1, delay: .2 }); },

  cow: () => tone({ type: 'sawtooth', f0: 150, f1: 105, dur: .85, gain: .12, lp: 520 }),

  engine: () => tone({ type: 'sawtooth', f0: 70, f1: 150, dur: .9, gain: .08, lp: 400 })

};

 

/* ---------------------------------------------------------

   AMBIENT PARTICLES (canvas)

--------------------------------------------------------- */

const fx = $('#fx'), ctx2 = fx.getContext('2d');

let W = 0, H = 0, parts = [], bursts = [];

function fxResize() {

  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth; H = window.innerHeight;

  fx.width = W * dpr; fx.height = H * dpr;

  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

  const n = Math.round(Math.min(90, (W * H) / 16000));

  parts = Array.from({ length: n }, () => ({

    x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + .4,

    vx: (Math.random() - .5) * .18, vy: -Math.random() * .28 - .04,

    h: Math.random() < .22 ? 268 : 190, a: Math.random() * .55 + .15

  }));

}

function fxTick() {

  ctx2.clearRect(0, 0, W, H);

  for (const p of parts) {

    p.x += p.vx; p.y += p.vy;

    if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }

    if (p.x < -6) p.x = W + 6; if (p.x > W + 6) p.x = -6;

    ctx2.fillStyle = `hsla(${p.h},100%,70%,${p.a})`;

    ctx2.beginPath(); ctx2.arc(p.x, p.y, p.r, 0, 6.283); ctx2.fill();

  }

  for (let i = bursts.length - 1; i >= 0; i--) {

    const b = bursts[i];

    b.x += b.vx; b.y += b.vy; b.vy += .06; b.life -= 1;

    if (b.life <= 0) { bursts.splice(i, 1); continue; }

    ctx2.fillStyle = `hsla(${b.h},100%,70%,${Math.min(1, b.life / 40)})`;

    ctx2.fillRect(b.x, b.y, b.s, b.s);

  }

  requestAnimationFrame(fxTick);

}

function burst(n = 140) {

  if (reduceMotion) return;

  for (let i = 0; i < n; i++) {

    const a = Math.random() * 6.283, s = Math.random() * 7 + 2;

    bursts.push({ x: W / 2, y: H * .42, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, s: Math.random() * 3 + 1.5, h: [190, 215, 268, 300][i % 4], life: 90 + Math.random() * 60 });

  }

}

 

/* ---------------------------------------------------------

   CITY ART (procedural parts of the SVG)

--------------------------------------------------------- */

function skyline(g, o) {

  const r = rng(o.seed);

  let x = o.x0;

  while (x < o.x1) {

    const w = o.minW + r() * (o.maxW - o.minW), h = o.minH + r() * (o.maxH - o.minH);

    svgEl('rect', { x, y: o.base - h, width: w, height: h, class: 'fb', fill: o.fill, stroke: o.stroke, 'stroke-width': 1 }, g);

    if (r() < .3) svgEl('rect', { x: x + w / 2 - 1, y: o.base - h - 14, width: 2, height: 14, fill: o.stroke }, g);

    const cols = Math.floor((w - 6) / 9), rows = Math.floor((h - 10) / 14);

    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {

      if (r() < o.lit) svgEl('rect', { x: x + 4 + i * 9, y: o.base - h + 8 + j * 14, width: 4, height: 5, class: 'fw', fill: o.win }, g);

    }

    x += w + (r() < .3 ? 5 : 1);

  }

}

function buildCityArt() {

  const r = rng(7);

  const sky = $('#skyLayer');

  for (let i = 0; i < 70; i++) {

    const c = svgEl('circle', { cx: -500 + r() * 2200, cy: -120 + r() * 380, r: r() * 1.1 + .3 }, sky);

    c.style.animationDelay = (r() * 4).toFixed(2) + 's';

    c.style.animationDuration = (3 + r() * 4).toFixed(1) + 's';

  }

  skyline($('#farLayer'), { seed: 21, x0: -800, x1: 2000, base: 540, minW: 28, maxW: 64, minH: 70, maxH: 300, fill: '#08102a', stroke: 'rgba(77,141,255,.18)', win: 'rgba(77,141,255,.5)', lit: .16 });

  // windows of main buildings

  $$('.wins').forEach(g => {

    const x = +g.dataset.x, y = +g.dataset.y, w = +g.dataset.w, h = +g.dataset.h, c = +g.dataset.c, rr = +g.dataset.r;

    const cw = w / c, ch = h / rr;

    for (let i = 0; i < c; i++) for (let j = 0; j < rr; j++) {

      const on = r() < .62;

      const rect = svgEl('rect', { x: x + i * cw + cw * .18, y: y + j * ch + ch * .2, width: cw * .64, height: ch * .6, class: 'w' + (on ? ' on' : '') }, g);

      if (on && r() < .3) { rect.classList.add('fl'); rect.style.setProperty('--fd', (4 + r() * 6).toFixed(1) + 's'); rect.style.setProperty('--fl', (-r() * 6).toFixed(1) + 's'); }

    }

  });

  // street lamps

  const lamps = $('#lamps');

  for (let x = -760; x < 1960; x += 150) {

    svgEl('line', { class: 'lp', x1: x, y1: 556, x2: x, y2: 522 }, lamps);

    svgEl('circle', { class: 'lh', cx: x, cy: 520, r: 3 }, lamps);

  }

  // drones

  const drones = $('#drones');

  [[90, 32, -4], [170, 44, -20], [60, 38, -11]].forEach(([y, t, d]) => {

    const dr = svgEl('circle', { class: 'drone', cx: 0, cy: y, r: 2.4 }, drones);

    dr.style.setProperty('--t', t + 's'); dr.style.setProperty('--d', d + 's');

  });

  // landing skyline

  const ls = $('#landSky');

  skyline(ls, { seed: 3, x0: -20, x1: 1640, base: 420, minW: 30, maxW: 90, minH: 60, maxH: 330, fill: '#070d24', stroke: 'rgba(41,227,255,.45)', win: 'rgba(41,227,255,.75)', lit: .22 });

}

 

/* ---------------------------------------------------------

   SCENE MANAGER

--------------------------------------------------------- */

const body = document.body;

const world = $('#cityWorld');

const cityViewport = $('#cityViewport');

let current = 'landing';

let navBusy = false;

 

function show(id) {

  current = id;

  body.dataset.scene = id;

  $$('.scene').forEach(s => {

    const on = s.id === id;

    s.classList.toggle('is-active', on);

    s.setAttribute('aria-hidden', on ? 'false' : 'true');

    s.inert = !on;

  });

  const sc = $('#' + id);

  const h = $('h1,h2', sc);

  if (h) { h.tabIndex = -1; try { h.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }

  if (sc.scrollTo) sc.scrollTo(0, 0);

}

let toastT;

function toast(msg) {

  const t = $('#toast');

  t.textContent = msg; t.classList.add('show');

  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000);

}

 

async function enterCity() {

  if (navBusy) return; navBusy = true;

  sfx.click();

  body.classList.add('entering');

  await wait(1250);

  show('city');

  arriveCity();

  await wait(900);

  body.classList.remove('entering');

  navBusy = false;

}

function arriveCity() {

  const b = $('#buildings');

  b.classList.remove('city-arrive'); void b.getBoundingClientRect(); b.classList.add('city-arrive');

  requestAnimationFrame(() => { cityViewport.scrollLeft = (cityViewport.scrollWidth - cityViewport.clientWidth) / 2; });

}

 

async function openDistrict(key) {

  if (navBusy || current !== 'city') return; navBusy = true;

  sfx.click();

  const bld = $(`.bld[data-d="${key}"]`);

  const br = bld.getBoundingClientRect(), wr = world.getBoundingClientRect();

  const ox = ((br.left + br.width / 2 - wr.left) / wr.width) * 100;

  const oy = ((br.top + br.height / 2 - wr.top) / wr.height) * 100;

  world.style.transformOrigin = `${ox}% ${oy}%`;

  world.classList.add('zooming');

  await wait(850);

  show('d-' + key);

  districts[key].enter();

  navBusy = false;

}

function returnToCity() {

  if (navBusy || current === 'city' || current === 'landing' || current === 'finale') return;

  sfx.click();

  if (current === 'source') { editor.stop(); }

  world.classList.add('instant', 'zooming');

  void world.offsetWidth;

  show('city');

  requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('instant', 'zooming')));

  refreshProgress();

}

 

/* ---------------------------------------------------------

   PROGRESS

--------------------------------------------------------- */

const KEYS = ['class', 'encap', 'abstr', 'inher', 'poly'];

const NAMES = { class: 'CLASS FACTORY', encap: 'ENCAPSULATION BANK', abstr: 'ABSTRACTION CONTROL CENTER', inher: 'INHERITANCE TOWER', poly: 'POLYMORPHISM ARENA' };

const done = { class: false, encap: false, abstr: false, inher: false, poly: false };

const doneCount = () => KEYS.filter(k => done[k]).length;

let unlockAnnounced = false;

 

function refreshProgress() {

  const n = doneCount();

  $('#pgCount').textContent = n;

  $('#progress').setAttribute('aria-valuenow', n);

  $$('.pg-track i').forEach(i => i.classList.toggle('on', done[i.dataset.k]));

  KEYS.forEach(k => {

    $(`.bld[data-d="${k}"]`).classList.toggle('done', done[k]);

    $(`.dock-item[data-d="${k}"]`).classList.toggle('done', done[k]);

  });

  const sb = $('#btnSource');

  const open = n === 5;

  sb.disabled = !open; sb.setAttribute('aria-disabled', String(!open)); sb.classList.toggle('on', open);

  $('#srcLabel').textContent = open ? 'OPEN THE SOURCE CODE →' : `SOURCE CODE LOCKED — ${n}/5 DISTRICTS VISITED`;

}

function completeDistrict(key) {

  if (done[key]) return;

  done[key] = true;

  sfx.ok();

  const cta = $(`#d-${key} .done-cta`);

  cta.hidden = false;

  refreshProgress();

  if (doneCount() === 5) toast('ALL DISTRICTS CLEARED — SOURCE CODE UNLOCKED');

  else toast(`${NAMES[key]} — COMPLETE  (${doneCount()}/5)`);

}

function Objectives(key) {

  const ul = $(`.obj-list[data-for="${key}"]`);

  const items = $$('li', ul);

  return {

    hit(id) {

      const li = ul.querySelector(`[data-o="${id}"]`);

      if (!li || li.classList.contains('ok')) return;

      li.classList.add('ok');

      if (items.every(i => i.classList.contains('ok'))) completeDistrict(key);

    },

    reset() { items.forEach(i => i.classList.remove('ok')); $(`#d-${key} .done-cta`).hidden = true; }

  };

}

 

/* ---------------------------------------------------------

   DISTRICT 1 — CLASS FACTORY

--------------------------------------------------------- */

const factory = (() => {

  const obj = Objectives('class');

  const codeEl = $('#codeClass'), mainEl = $('#codeMain'), objsEl = $('#objects'), emptyEl = $('#objEmpty');

  const btn = $('#btnCreate');

  const CLASS_SRC = `class Car {

    String color;

    int speed;

 

    void accelerate() {

        speed += 10;

    }

}`;

  const COLORS = [['Red', '#ff4d5e'], ['Blue', '#4d8dff'], ['Green', '#38e08c'], ['Yellow', '#ffd23f'], ['Violet', '#a77bff'], ['White', '#e8f1ff'], ['Orange', '#ff8a3d'], ['Teal', '#2fe6d0']];

  let cars = [], mainLines = [];

  const carSvg = hex => `<svg class="car-svg" viewBox="0 0 120 52" style="color:${hex}" aria-hidden="true"><path d="M6 36 L14 22 Q18 16 26 16 L72 16 Q82 16 90 24 L106 28 Q114 30 114 36 L114 40 L6 40 Z" fill="${hex}" fill-opacity=".8" stroke="${hex}" stroke-width="1.5"/><path d="M28 19 L68 19 Q76 19 82 25 L24 25 Z" fill="#06101f" opacity=".85"/><circle cx="32" cy="40" r="8" fill="#050a1a" stroke="${hex}" stroke-width="2.5"/><circle cx="90" cy="40" r="8" fill="#050a1a" stroke="${hex}" stroke-width="2.5"/></svg>`;

 

  function renderMain() {

    renderCode(mainEl, mainLines.length ? mainLines.join('\n') : '// Press CREATE OBJECT: each click runs  new Car()');

    $$('.ln', mainEl).slice(-3).forEach(l => l.classList.add('new'));

    mainEl.scrollTop = mainEl.scrollHeight;

  }

  function sync() {

    emptyEl.hidden = cars.length > 0;

    btn.disabled = cars.length >= 6;

    btn.textContent = cars.length >= 6 ? 'FACTORY LINE FULL' : 'CREATE OBJECT';

  }

  function nextColor() {

    if (cars.length === 0) return COLORS[0];                 // first object is always Red / 40

    const free = COLORS.filter(c => !cars.some(k => k.name === c[0]));

    return free[Math.floor(Math.random() * free.length)];

  }

  function create() {

    if (cars.length >= 6) return;

    sfx.click();

    const [name, hex] = nextColor();

    const id = cars.length + 1;

    const car = { id, name, hex, speed: id === 1 ? 40 : 20 + 10 * Math.floor(Math.random() * 10) };

    cars.push(car);

    const el = document.createElement('div');

    el.className = 'obj';

    el.innerHTML = `${carSvg(hex)}<div class="obj-id">Car #${pad3(id)}</div>

      <div class="obj-f"><span>color</span> = <b>"${name}"</b></div>

      <div class="obj-f"><span>speed</span> = <b class="spd">${car.speed}</b></div>

      <button type="button" class="btn-mini" aria-label="Call accelerate on Car ${pad3(id)}">accelerate()</button>`;

    $('.btn-mini', el).addEventListener('click', () => {

      car.speed += 10; sfx.click();

      $('.spd', el).textContent = car.speed;

      el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');

      mainLines.push(`car${id}.accelerate();   // car${id}.speed is now ${car.speed}`);

      renderMain(); flashLine(codeEl, 'speed += 10');

      obj.hit('accel');

    });

    objsEl.appendChild(el);

    mainLines.push(`Car car${id} = new Car();`, `car${id}.color = "${name}";`, `car${id}.speed = ${car.speed};`, '');

    renderMain(); flashLine(codeEl, 'class Car');

    sync();

    if (cars.length >= 3) obj.hit('create3');

  }

  function clear() { cars = []; objsEl.innerHTML = ''; mainLines = []; renderMain(); sync(); }

  btn.addEventListener('click', create);

  $('#btnClearCars').addEventListener('click', () => { sfx.click(); clear(); });

  return {

    enter() { renderCode(codeEl, CLASS_SRC); renderMain(); sync(); },

    reset() { clear(); obj.reset(); renderCode(codeEl, CLASS_SRC); }

  };

})();

 

/* ---------------------------------------------------------

   DISTRICT 2 — ENCAPSULATION BANK

--------------------------------------------------------- */

const bank = (() => {

  const obj = Objectives('encap');

  const codeEl = $('#codeBank'), term = $('#bankTerm'), vault = $('#vault');

  const SRC = `class BankAccount {

    private double balance;

 

    public void deposit(double amount) {

        if (amount > 0) {

            balance += amount;

        }

    }

 

    public boolean withdraw(double amount) {

        if (amount > 0 && amount <= balance) {

            balance -= amount;

            return true;

        }

        return false;

    }

 

    public double getBalance() {

        return balance;

    }

}`;

  let balance = 0, readT;

  const fmt = n => '$ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lit = x => Number.isInteger(x) ? x.toFixed(1) : String(x);

  const getAmt = () => parseFloat($('#amt').value);

  function gate(name, bad) {

    const g = $(`.gate[data-g="${name}"]`);

    g.classList.add(bad ? 'bad' : 'on');

    setTimeout(() => g.classList.remove('on', 'bad'), 900);

  }

  function pulse() { vault.classList.remove('pulse'); void vault.offsetWidth; vault.classList.add('pulse'); }

  function amountOrWarn(label) {

    const a = getAmt();

    if (Number.isNaN(a)) { termPush(term, 'Enter a number first — the amount field is empty.', 'err'); return null; }

    termPush(term, `account.${label}(${lit(a)});`, 'call');

    return a;

  }

  function deposit() {

    const a = amountOrWarn('deposit'); if (a === null) return;

    flashLine(codeEl, 'balance += amount');

    if (a > 0) {

      balance = Math.round((balance + a) * 100) / 100;

      gate('deposit'); pulse(); sfx.ok();

      termPush(term, `OK — deposit accepted. The new balance stays private inside the vault.`, 'ok');

      obj.hit('deposit');

    } else {

      gate('deposit', true); sfx.deny();

      termPush(term, 'IGNORED — deposit() only accepts amount > 0. The method validates every request.', 'err');

    }

  }

  function withdraw() {

    const a = amountOrWarn('withdraw'); if (a === null) return;

    flashLine(codeEl, 'balance -= amount');

    if (a > 0 && a <= balance) {

      balance = Math.round((balance - a) * 100) / 100;

      gate('withdraw'); pulse(); sfx.ok();

      termPush(term, 'true — withdrawal approved.', 'ok');

    } else {

      gate('withdraw', true); sfx.deny();

      termPush(term, a <= 0 ? 'false — amount must be greater than 0.' : 'false — insufficient funds. Rules live inside withdraw().', 'err');

    }

  }

  function view() {

    gate('get'); sfx.click();

    flashLine(codeEl, 'return balance;');

    termPush(term, 'double b = account.getBalance();', 'call');

    termPush(term, `b = ${lit(balance)}   // a copy of the value is returned; the field stays private`, 'out');

    const rv = $('#readVal');

    rv.textContent = fmt(balance);

    clearTimeout(readT); readT = setTimeout(() => { rv.textContent = '—'; }, 4000);

    obj.hit('view');

  }

  function hack() {

    sfx.deny();

    flashLine(codeEl, 'private double balance');

    termPush(term, 'System.out.println(account.balance);', 'call');

    termPush(term, 'ACCESS DENIED — PRIVATE FIELD', 'err');

    termPush(term, 'error: balance has private access in BankAccount', 'err');

    vault.classList.remove('denied'); void vault.offsetWidth; vault.classList.add('denied');

    setTimeout(() => vault.classList.remove('denied'), 2200);

    obj.hit('hack');

  }

  $('#btnDeposit').addEventListener('click', deposit);

  $('#btnWithdraw').addEventListener('click', withdraw);

  $('#btnView').addEventListener('click', view);

  $('#btnHack').addEventListener('click', hack);

  $('#amt').addEventListener('keydown', e => { if (e.key === 'Enter') deposit(); });

  function reset() {

    balance = 0; term.innerHTML = ''; $('#readVal').textContent = '—'; $('#amt').value = 100;

    vault.classList.remove('denied');

    termPush(term, '// BankAccount account = new BankAccount();   balance starts at 0.0', 'dim');

    obj.reset();

  }

  return { enter() { renderCode(codeEl, SRC); }, reset() { reset(); renderCode(codeEl, SRC); }, init: reset };

})();

 

/* ---------------------------------------------------------

   DISTRICT 3 — ABSTRACTION CONTROL CENTER

--------------------------------------------------------- */

const control = (() => {

  const obj = Objectives('abstr');

  const codeEl = $('#codeAbstr'), con = $('#console');

  const VISIBLE = `// WHAT THE DRIVER SEES — a small, simple interface

interface Drivable {

    void start();

    void accelerate();

    void brake();

}

 

// Client code: no engine, no sensors, no wiring.

Drivable car = new Car();

car.start();

car.accelerate();

car.brake();`;

  const HIDDEN = `// WHAT IS HIDDEN — the implementation inside Car

class Car implements Drivable {

    private Engine engine = new Engine();

    private SensorArray sensors = new SensorArray();

    private FuelInjection fuelInjection = new FuelInjection();

    private ECU ecu = new ECU();

    private Transmission transmission = new Transmission();

    private boolean running;

    private int speed;

 

    @Override

    public void start() {

        sensors.runSelfCheck();

        ecu.loadEngineMap();

        fuelInjection.primePump();

        engine.ignite();

        transmission.shiftToNeutral();

        running = true;

    }

 

    @Override

    public void accelerate() {

        if (running) {

            fuelInjection.increaseFlow();

            transmission.shiftUp();

            speed += 20;

        }

    }

 

    @Override

    public void brake() {

        ecu.applyBrakeForce();

        speed = Math.max(0, speed - 30);

    }

}   // Engine, ECU, ... classes omitted`;

  let running = false, speed = 0, busy = false, tab = 'visible', xray = false;

  const needle = $('#needle');

  function drawTicks() {

    const t = $('#ticks'); t.innerHTML = '';

    for (let i = 0; i <= 10; i++) {

      const a = (-180 + i * 18) * Math.PI / 180, r1 = 70, r2 = i % 5 === 0 ? 60 : 64;

      svgEl('line', { x1: 100 + Math.cos(a) * r1, y1: 100 + Math.sin(a) * r1, x2: 100 + Math.cos(a) * r2, y2: 100 + Math.sin(a) * r2 }, t);

    }

  }

  function setTab(t) {

    tab = t;

    $$('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });

    renderCode(codeEl, t === 'visible' ? VISIBLE : HIDDEN);

  }

  function setSpeed(s) {

    speed = s;

    $('#speedVal').textContent = s;

    needle.style.transform = `rotate(${-90 + (s / 200) * 180}deg)`;

  }

  function status(txt, warn) {

    const el = $('#ctlStatus'); el.textContent = txt;

    el.classList.remove('warn'); if (warn) { void el.offsetWidth; el.classList.add('warn'); }

  }

  const call = t => { $('#callLine').textContent = t; };

  async function start() {

    if (busy) return;

    call('car.start();');

    if (running) { status('ENGINE ALREADY RUNNING', true); return; }

    busy = true; sfx.engine();

    status('ENGINE STARTED');

    running = true; obj.hit('start');

    const lis = $$('#systems li');

    lis.forEach(l => l.classList.remove('on'));

    setTab('hidden'); flashLine(codeEl, 'public void start()', 2600);

    con.classList.add('reveal');

    for (const li of lis) { await wait(380); li.classList.add('on'); }

    await wait(850);

    con.classList.remove('reveal');

    await wait(500);

    if (!xray) lis.forEach(l => l.classList.remove('on'));

    setTab('visible');

    busy = false;

  }

  function accelerate() {

    call('car.accelerate();'); sfx.click();

    if (!running) { status('START THE ENGINE FIRST', true); return; }

    setSpeed(Math.min(200, speed + 20)); status(`SPEED ${speed} KM/H`);

    obj.hit('accel');

  }

  function brake() {

    call('car.brake();'); sfx.click();

    setSpeed(Math.max(0, speed - 30));

    status(running ? (speed === 0 ? 'STOPPED' : `SPEED ${speed} KM/H`) : 'ENGINE OFF');

    obj.hit('brake');

  }

  function togglePeek() {

    xray = !xray;

    const b = $('#btnXray');

    b.setAttribute('aria-pressed', String(xray));

    b.textContent = xray ? 'HIDE THE IMPLEMENTATION' : 'PEEK BEHIND THE INTERFACE';

    con.classList.toggle('reveal', xray);

    $$('#systems li').forEach(l => l.classList.toggle('on', xray));

    setTab(xray ? 'hidden' : 'visible');

  }

  $('#btnStart').addEventListener('click', start);

  $('#btnAccel').addEventListener('click', accelerate);

  $('#btnBrake').addEventListener('click', brake);

  $('#btnXray').addEventListener('click', togglePeek);

  $$('.tab').forEach(b => b.addEventListener('click', () => { sfx.click(); setTab(b.dataset.tab); }));

  function reset() {

    running = false; busy = false; xray = false;

    con.classList.remove('reveal'); $$('#systems li').forEach(l => l.classList.remove('on'));

    const b = $('#btnXray'); b.setAttribute('aria-pressed', 'false'); b.textContent = 'PEEK BEHIND THE INTERFACE';

    setSpeed(0); status('ENGINE OFF'); call('car.start();'); setTab('visible'); obj.reset();

  }

  return { enter() { setTab(tab); }, reset, init() { drawTicks(); reset(); } };

})();

 

/* ---------------------------------------------------------

   DISTRICT 4 — INHERITANCE TOWER

--------------------------------------------------------- */

const tower = (() => {

  const obj = Objectives('inher');

  const codeEl = $('#codeTower'), term = $('#towerTerm'), tree = $('#tree');

  const DEFS = {

    Vehicle: { parent: null, fields: ['int speed'], own: [{ n: 'move()', out: 'Moving...' }],

      src: `class Vehicle {

    int speed;

 

    void move() {

        System.out.println("Moving...");

    }

}` },

    Car: { parent: 'Vehicle', fields: [], own: [{ n: 'openTrunk()', out: 'Trunk opened' }],

      src: `class Car extends Vehicle {

    void openTrunk() {

        System.out.println("Trunk opened");

    }

}` },

    Bike: { parent: 'Vehicle', fields: [], own: [{ n: 'ringBell()', out: 'Ring ring!' }],

      src: `class Bike extends Vehicle {

    void ringBell() {

        System.out.println("Ring ring!");

    }

}` },

    Tesla: { parent: 'Car', fields: [], own: [{ n: 'autopilot()', out: 'Autopilot engaged' }],

      src: `class Tesla extends Car {

    void autopilot() {

        System.out.println("Autopilot engaged");

    }

}` },

    BMW: { parent: 'Car', fields: [], own: [{ n: 'sportMode()', out: 'Sport mode on' }],

      src: `class BMW extends Car {

    void sportMode() {

        System.out.println("Sport mode on");

    }

}` }

  };

  const POS = { Vehicle: [220, 46], Car: [120, 170], Bike: [320, 170], Tesla: [60, 300], BMW: [180, 300] };

  const NW = 104, NH = 38;

  const paths = {}, nodes = {};

  let sel = 'Vehicle', animating = false;

  const chainOf = n => { const c = []; while (n) { c.unshift(n); n = DEFS[n].parent; } return c; };

 

  function build() {

    tree.innerHTML = '';

    svgEl('path', { class: 'tower-bg', d: 'M150 10 H290 L350 360 H90 Z' }, tree);

    Object.keys(DEFS).forEach(n => {

      const p = DEFS[n].parent; if (!p) return;

      const [px, py] = POS[p], [cx, cy] = POS[n];

      const my = (py + NH / 2 + cy - NH / 2) / 2;

      const path = svgEl('path', { class: 'conn', d: `M${px} ${py + NH / 2} V${my} H${cx} V${cy - NH / 2}` }, tree);

      paths[n] = path;

      const t = svgEl('text', { class: 'ext', x: (px + cx) / 2 + (cx < px ? -8 : 8), y: my - 5, 'text-anchor': cx < px ? 'end' : 'start' }, tree);

      t.textContent = 'extends';

    });

    Object.keys(DEFS).forEach(n => {

      const [x, y] = POS[n];

      const g = svgEl('g', { class: 'nd', tabindex: 0, role: 'button', 'aria-label': `Select class ${n}`, 'data-n': n }, tree);

      svgEl('rect', { x: x - NW / 2, y: y - NH / 2, width: NW, height: NH, rx: 6 }, g);

      const t = svgEl('text', { x, y: y + 5 }, g); t.textContent = n.toUpperCase();

      g.addEventListener('click', () => select(n, true));

      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n, true); } });

      nodes[n] = g;

    });

  }

  function resolve(n) {

    const chain = chainOf(n), fields = [], methods = [];

    chain.forEach(c => {

      DEFS[c].fields.forEach(f => fields.push({ n: f, from: c, own: c === n }));

      DEFS[c].own.forEach(m => methods.push({ n: m.n, out: m.out, from: c, own: c === n }));

    });

    return { chain, fields, methods };

  }

  function select(n, user) {

    sel = n;

    Object.entries(nodes).forEach(([k, g]) => { g.classList.toggle('sel', k === n); g.classList.toggle('anc', chainOf(n).includes(k) && k !== n); });

    const { chain, fields, methods } = resolve(n);

    $('#inspName').textContent = n;

    $('#inspChain').textContent = chain.slice().reverse().join(' → ');

    const fEl = $('#inspFields'), mEl = $('#inspMethods');

    fEl.innerHTML = ''; mEl.innerHTML = '';

    fields.forEach(f => {

      const b = document.createElement('button');

      b.type = 'button'; b.className = 'chip-b ' + (f.own ? 'own' : 'inh');

      b.innerHTML = `${esc(f.n)}<small>${f.own ? 'own' : 'inherited from ' + f.from}</small>`;

      b.addEventListener('click', () => {

        termPush(term, `System.out.println(${n.toLowerCase()}.speed);`, 'call'); termPush(term, '0', 'out');

      });

      fEl.appendChild(b);

    });

    methods.forEach(m => {

      const b = document.createElement('button');

      b.type = 'button'; b.className = 'chip-b ' + (m.own ? 'own' : 'inh');

      b.innerHTML = `${esc(m.n)}<small>${m.own ? 'own' : 'inherited from ' + m.from}</small>`;

      b.addEventListener('click', () => {

        sfx.click(); b.classList.remove('fire'); void b.offsetWidth; b.classList.add('fire');

        termPush(term, `${n.toLowerCase()}.${m.n};${m.own ? '' : '   // inherited from ' + m.from}`, 'call');

        termPush(term, m.out, 'out');

        flashLine(codeEl, m.out);

        if (!m.own) obj.hit('call');

      });

      mEl.appendChild(b);

    });

    // code panel: the whole chain, root first

    $('#towerFile').textContent = n + '.java';

    renderCode(codeEl, chain.map(c => DEFS[c].src).join('\n\n'));

    if (user) { if (n !== 'Vehicle') obj.hit('sub'); flow(n); }

  }

  function travel(path, label, dur, down = true) {

    return new Promise(res => {

      const len = path.getTotalLength();

      const g = svgEl('g', { class: 'chip' }, tree);

      svgEl('rect', { x: -label.length * 3.1 - 5, y: -8, width: label.length * 6.2 + 10, height: 16, rx: 8 }, g);

      const t = svgEl('text', { y: 3 }, g); t.textContent = label;

      const t0 = performance.now();

      (function step(now) {

        const k = Math.min(1, (now - t0) / dur);

        const p = path.getPointAtLength(down ? k * len : (1 - k) * len);

        g.setAttribute('transform', `translate(${p.x} ${p.y})`);

        if (k < 1) requestAnimationFrame(step); else { g.remove(); res(); }

      })(t0);

    });

  }

  async function flow(n) {

    if (animating) return;

    const chain = chainOf(n);

    if (chain.length < 2) { return; }

    animating = true;

    const dur = reduceMotion ? 30 : 750;

    for (let i = 1; i < chain.length; i++) {

      const labels = [];

      resolve(chain[i - 1]).fields.concat(resolve(chain[i - 1]).methods).forEach(x => labels.push(x.n.replace('int ', '')));

      await Promise.all(labels.map((l, j) => sleep(j * 260).then(() => travel(paths[chain[i]], l, dur))));

      nodes[chain[i]].classList.add('flash'); setTimeout(() => nodes[chain[i]].classList.remove('flash'), 500);

    }

    animating = false;

  }

  $('#btnFlow').addEventListener('click', () => { sfx.click(); if (sel === 'Vehicle') { select('Car', true); } else flow(sel); });

  function reset() {

    term.innerHTML = ''; termPush(term, '// Click a class, then call its methods.', 'dim');

    select('Vehicle', false); obj.reset();

  }

  return { enter() { select(sel, false); }, reset, init() { build(); reset(); } };

})();

 

/* ---------------------------------------------------------

   DISTRICT 5 — POLYMORPHISM ARENA

--------------------------------------------------------- */

const arena = (() => {

  const obj = Objectives('poly');

  const svg = $('#arenaSvg'), term = $('#polyTerm'), codeEl = $('#codePoly'), mainEl = $('#codePolyMain');

  const SRC = `class Animal {

    void makeSound() {

        System.out.println("Animal sound");

    }

}

 

class Dog extends Animal {

    @Override

    void makeSound() {

        System.out.println("Woof!");

    }

}

 

class Cat extends Animal {

    @Override

    void makeSound() {

        System.out.println("Meow!");

    }

}

 

class Cow extends Animal {

    @Override

    void makeSound() {

        System.out.println("Moo!");

    }

}`;

  const A = {

    dog: { cls: 'Dog', say: 'WOOF!', out: 'Woof!', x: 170, y: 292 },

    cat: { cls: 'Cat', say: 'MEOW!', out: 'Meow!', x: 300, y: 82 },

    cow: { cls: 'Cow', say: 'MOO!', out: 'Moo!', x: 430, y: 292 }

  };

  const CX = 300, CY = 205;

  let sel = 'dog', busy = false;

  const els = {};

 

  const figures = {

    dog: `<path class="face" d="M-22 -22 Q-22 -34 0 -34 Q22 -34 22 -22 L22 10 Q22 28 0 30 Q-22 28 -22 10 Z"/><path class="face" d="M-22 -24 Q-42 -22 -38 8 Q-30 10 -22 -2 Z"/><path class="face" d="M22 -24 Q42 -22 38 8 Q30 10 22 -2 Z"/><ellipse class="face-d" cx="0" cy="12" rx="11" ry="8"/><circle class="face-f" cx="0" cy="6" r="3.5"/><circle class="face-f" cx="-9" cy="-9" r="2.6"/><circle class="face-f" cx="9" cy="-9" r="2.6"/>`,

    cat: `<path class="face" d="M-26 -4 Q-26 -24 0 -24 Q26 -24 26 -4 Q26 26 0 28 Q-26 26 -26 -4 Z"/><path class="face" d="M-26 -10 L-23 -38 L-7 -22 Z"/><path class="face" d="M26 -10 L23 -38 L7 -22 Z"/><path class="face-f" d="M-4 6 L4 6 L0 11 Z"/><path class="face-d" d="M-7 14 Q0 18 7 14 M-12 8 L-30 4 M-12 12 L-30 14 M12 8 L30 4 M12 12 L30 14"/><path class="face-f" d="M-13 -7 Q-9 -12 -5 -7 Q-9 -4 -13 -7 Z M13 -7 Q9 -12 5 -7 Q9 -4 13 -7 Z"/>`,

    cow: `<path class="face" d="M-22 -22 L22 -22 Q28 -22 26 -6 L22 18 Q20 30 0 30 Q-20 30 -22 18 L-26 -6 Q-28 -22 -22 -22 Z"/><path class="face-d" d="M-20 -22 Q-30 -36 -38 -32 M20 -22 Q30 -36 38 -32"/><ellipse class="face" cx="-34" cy="-12" rx="9" ry="5" transform="rotate(-20 -34 -12)"/><ellipse class="face" cx="34" cy="-12" rx="9" ry="5" transform="rotate(20 34 -12)"/><rect class="face-d" x="-14" y="10" width="28" height="15" rx="7"/><circle class="face-f" cx="-5" cy="18" r="2"/><circle class="face-f" cx="5" cy="18" r="2"/><circle class="face-f" cx="-9" cy="-8" r="2.6"/><circle class="face-f" cx="9" cy="-8" r="2.6"/><path class="face-d" d="M-4 -22 Q0 -12 6 -18"/>`

  };

 

  function build() {

    svg.innerHTML = '';

    svgEl('circle', { class: 'ar-f', cx: CX, cy: CY, r: 200 }, svg);

    const a = svgEl('g', { class: 'spin-a' }, svg);

    svgEl('circle', { class: 'ar-o', cx: CX, cy: CY, r: 200 }, a);

    svgEl('circle', { class: 'ar-t', cx: CX, cy: CY, r: 188 }, a);

    const b = svgEl('g', { class: 'spin-b' }, svg);

    svgEl('circle', { class: 'ar-m', cx: CX, cy: CY, r: 140 }, b);

    svgEl('circle', { class: 'ar-o', cx: CX, cy: CY, r: 100, 'stroke-opacity': .35 }, svg);

    els.wave = svgEl('circle', { class: 'wave', cx: CX, cy: CY, r: 20 }, svg);

    els.beam = svgEl('line', { class: 'beamL', x1: CX, y1: CY, x2: A.dog.x, y2: A.dog.y }, svg);

    const core = svgEl('g', {}, svg);

    svgEl('polygon', { class: 'core-h', points: hexPts(CX, CY, 46) }, core);

    let t = svgEl('text', { class: 'core-t', x: CX, y: CY - 2 }, core); t.textContent = 'animal';

    t = svgEl('text', { class: 'core-s', x: CX, y: CY + 14 }, core); t.textContent = 'Animal';

    Object.entries(A).forEach(([k, v]) => {

      const g = svgEl('g', { class: 'an', tabindex: 0, role: 'button', 'aria-label': `Point the Animal reference at a ${v.cls}` }, svg);

      svgEl('circle', { class: 'ped', cx: v.x, cy: v.y, r: 52 }, g);

      const pos = svgEl('g', { transform: `translate(${v.x} ${v.y - 2})` }, g);

      const fig = svgEl('g', { class: 'fig' }, pos); fig.innerHTML = figures[k];

      t = svgEl('text', { x: v.x, y: v.y + 74 }, g); t.textContent = v.cls.toUpperCase();

      t = svgEl('text', { class: 'sub', x: v.x, y: v.y + 88 }, g); t.textContent = `new ${v.cls}()`;

      g.addEventListener('click', () => pick(k));

      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(k); } });

      els[k] = g;

    });

    pick(sel, true);

  }

  function hexPts(cx, cy, r) { return Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 6; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(' '); }

 

  function liveCode() {

    const v = A[sel];

    renderCode(mainEl, `Animal a1 = new Dog();

Animal a2 = new Cat();

 

a1.makeSound();   // Woof!

a2.makeSound();   // Meow!

 

// live — you choose the object behind the reference

Animal animal = new ${v.cls}();

animal.makeSound();   // ${v.out}`);

  }

  function pick(k, silent) {

    sel = k;

    Object.entries(A).forEach(([key]) => els[key] && els[key].classList.toggle('sel', key === k));

    els.beam.setAttribute('x2', A[k].x); els.beam.setAttribute('y2', A[k].y);

    $$('.ref').forEach(r => { const on = r.dataset.a === k; r.classList.toggle('on', on); r.setAttribute('aria-checked', String(on)); });

    $('#infoObj').textContent = A[k].cls;

    $('#infoRun').textContent = `${A[k].cls}.makeSound()`;

    liveCode();

    if (!silent) sfx.click();

  }

  function speak(k) {

    const v = A[k];

    els[k].classList.remove('speak'); void els[k].getBoundingClientRect(); els[k].classList.add('speak');

    setTimeout(() => els[k].classList.remove('speak'), 800);

    const bub = $(`.bubble[data-a="${k}"]`);

    bub.classList.remove('show'); void bub.offsetWidth; bub.classList.add('show');

    sfx[k]();

    const pb = $('#pbOut'); pb.textContent = v.say; pb.classList.remove('pop'); void pb.offsetWidth; pb.classList.add('pop');

    termPush(term, v.out, 'out');

    flashLine(codeEl, `"${v.out}"`, 1400);

    obj.hit(k);

  }

  function shockwave() {

    els.wave.classList.remove('go'); void els.wave.getBoundingClientRect(); els.wave.classList.add('go');

  }

  async function call() {

    if (busy) return; busy = true;

    termPush(term, 'animal.makeSound();', 'call');

    shockwave(); await wait(450);

    speak(sel);

    await wait(900); busy = false;

  }

  async function zoo() {

    if (busy) return; busy = true;

    termPush(term, 'Animal[] zoo = { new Dog(), new Cat(), new Cow() };', 'dim');

    termPush(term, 'for (Animal a : zoo) a.makeSound();', 'call');

    shockwave(); await wait(450);

    for (const k of ['dog', 'cat', 'cow']) { speak(k); await wait(850); }

    $('#pbOut').textContent = 'DIFFERENT BEHAVIOR';

    busy = false;

  }

  $('#btnCall').addEventListener('click', call);

  $('#btnZoo').addEventListener('click', zoo);

  $$('.ref').forEach(r => r.addEventListener('click', () => pick(r.dataset.a)));

  function reset() {

    sel = 'dog'; busy = false; term.innerHTML = '';

    termPush(term, '// The reference type is Animal. The object behind it decides the behavior.', 'dim');

    $('#pbOut').textContent = 'DIFFERENT BEHAVIOR';

    obj.reset(); build(); renderCode(codeEl, SRC);

  }

  return { enter() { renderCode(codeEl, SRC); liveCode(); }, reset, init() { reset(); } };

})();

 

const districts = { class: factory, encap: bank, abstr: control, inher: tower, poly: arena };

 

/* ---------------------------------------------------------

   FINAL SOURCE-CODE EXPERIENCE

--------------------------------------------------------- */

const editor = (() => {

  const codeEl = $('#edCode'), out = $('#edOut'), status = $('#edStatus');

  const runBtn = $('#btnRun'), finBtn = $('#btnFinish'), skipBtn = $('#btnSkip');

  // [text, concept-key]

  const L = [

    ['// OOPCity.java — all five concepts working together', ''],

    ['', ''],

    ['// ABSTRACTION: callers only need to know WHAT a vehicle can do', 'abstr'],

    ['interface Drivable {', 'abstr'],

    ['    void start();', 'abstr'],

    ['    void accelerate();', 'abstr'],

    ['}', 'abstr'],

    ['', ''],

    ['// CLASS: a blueprint with state (fields) and behavior (methods)', 'class'],

    ['class Vehicle implements Drivable {', 'class'],

    ['    private final String name;   // ENCAPSULATION: hidden state', 'encap'],

    ['    protected int speed;', 'class'],

    ['', ''],

    ['    Vehicle(String name) {', 'class'],

    ['        this.name = name;', 'class'],

    ['    }', 'class'],

    ['', ''],

    ['    public String getName() {    // controlled access', 'encap'],

    ['        return name;', 'encap'],

    ['    }', 'encap'],

    ['', ''],

    ['    @Override', 'class'],

    ['    public void start() {', 'class'],

    ['        System.out.println(name + ": engine started");', 'class'],

    ['    }', 'class'],

    ['', ''],

    ['    @Override', 'class'],

    ['    public void accelerate() {', 'class'],

    ['        speed += 10;', 'class'],

    ['    }', 'class'],

    ['', ''],

    ['    void move() {', 'class'],

    ['        System.out.println(name + " is moving at " + speed + " km/h");', 'class'],

    ['    }', 'class'],

    ['}', 'class'],

    ['', ''],

    ['// INHERITANCE: Car extends Vehicle, reuses it and adds openTrunk()', 'inher'],

    ['class Car extends Vehicle {', 'inher'],

    ['    Car(String name) {', 'inher'],

    ['        super(name);', 'inher'],

    ['    }', 'inher'],

    ['', ''],

    ['    void openTrunk() {', 'inher'],

    ['        System.out.println(getName() + ": trunk opened");', 'inher'],

    ['    }', 'inher'],

    ['', ''],

    ['    @Override                    // POLYMORPHISM: overriding move()', 'poly'],

    ['    void move() {', 'poly'],

    ['        System.out.println(getName() + " is driving at " + speed + " km/h");', 'poly'],

    ['    }', 'poly'],

    ['}', 'inher'],

    ['', ''],

    ['class Bike extends Vehicle {', 'inher'],

    ['    Bike(String name) {', 'inher'],

    ['        super(name);', 'inher'],

    ['    }', 'inher'],

    ['', ''],

    ['    @Override', 'poly'],

    ['    public void start() {', 'poly'],

    ['        System.out.println(getName() + ": ready to pedal");', 'poly'],

    ['    }', 'poly'],

    ['', ''],

    ['    @Override', 'poly'],

    ['    void move() {', 'poly'],

    ['        System.out.println(getName() + " is pedalling at " + speed + " km/h");', 'poly'],

    ['    }', 'poly'],

    ['}', 'inher'],

    ['', ''],

    ['// ENCAPSULATION: private balance, changed only through validated methods', 'encap'],

    ['class BankAccount {', 'encap'],

    ['    private double balance;', 'encap'],

    ['', ''],

    ['    public void deposit(double amount) {', 'encap'],

    ['        if (amount > 0) {', 'encap'],

    ['            balance += amount;', 'encap'],

    ['        }', 'encap'],

    ['    }', 'encap'],

    ['', ''],

    ['    public boolean withdraw(double amount) {', 'encap'],

    ['        if (amount > 0 && amount <= balance) {', 'encap'],

    ['            balance -= amount;', 'encap'],

    ['            return true;', 'encap'],

    ['        }', 'encap'],

    ['        return false;', 'encap'],

    ['    }', 'encap'],

    ['', ''],

    ['    public double getBalance() {', 'encap'],

    ['        return balance;', 'encap'],

    ['    }', 'encap'],

    ['}', 'encap'],

    ['', ''],

    ['// OBJECTS INTERACT', 'class'],

    ['public class OOPCity {', 'class'],

    ['    public static void main(String[] args) {', 'class'],

    ['        BankAccount account = new BankAccount();   // object', 'class'],

    ['        account.deposit(100);', 'class'],

    ['', ''],

    ['        Car tesla = new Car("Tesla");', 'class'],

    ['        tesla.openTrunk();                          // Car\'s own method', 'inher'],

    ['', ''],

    ['        Vehicle[] traffic = { tesla, new Car("BMW"), new Bike("City Bike") };', 'poly'],

    ['', ''],

    ['        for (Vehicle v : traffic) {                 // one type, many behaviors', 'poly'],

    ['            v.start();', 'poly'],

    ['            v.accelerate();', 'abstr'],

    ['            v.accelerate();', 'abstr'],

    ['            v.move();', 'poly'],

    ['            account.withdraw(2.50);                 // toll', 'encap'],

    ['        }', 'poly'],

    ['', ''],

    ['        System.out.println("Balance: " + account.getBalance());', 'encap'],

    ['    }', 'class'],

    ['}', 'class']

  ];

  const OUT = [

    ['Tesla: trunk opened', 'inher'],

    ['Tesla: engine started', 'class'],

    ['Tesla is driving at 20 km/h', 'poly'],

    ['BMW: engine started', 'class'],

    ['BMW is driving at 20 km/h', 'poly'],

    ['City Bike: ready to pedal', 'poly'],

    ['City Bike is pedalling at 20 km/h', 'poly'],

    ['Balance: 92.5', 'encap']

  ];

  const TAGS = { class: 'CLASS', encap: 'ENCAP', abstr: 'ABSTR', inher: 'INHERIT', poly: 'POLY' };

  let token = 0, skip = false, rows = [];

 

  function prepare() {

    codeEl.innerHTML = L.map(([t, k], i) =>

      `<div class="ln pending" ${k ? `data-k="${k}"` : ''}><span class="no">${i + 1}</span><span class="src">${hl(t) || ' '}</span></div>`).join('');

    rows = $$('.ln', codeEl);

    codeEl.classList.remove('focus');

    $$('#edLegend button').forEach(b => b.classList.remove('on'));

    out.innerHTML = ''; termPush(out, '$ terminal ready', 'dim');

    runBtn.disabled = true; finBtn.disabled = true;

  }

  async function type() {

    const my = ++token; skip = false;

    prepare(); status.textContent = 'COMPILING THE CITY…';

    for (let i = 0; i < rows.length; i++) {

      if (my !== token) return;

      rows[i].classList.remove('pending');

      if (!skip) { rows[i].classList.add('typing'); if (i > 0) rows[i - 1].classList.remove('typing'); }

      scrollInside(codeEl, rows[i]);

      if (!skip) await wait(rows[i].textContent.trim().length > 3 ? 48 : 16);

    }

    if (my !== token) return;

    rows.forEach(r => r.classList.remove('typing'));

    status.textContent = 'READY — PRESS RUN';

    runBtn.disabled = false; skipBtn.hidden = true;

  }

  async function run() {

    runBtn.disabled = true;

    const my = token;

    status.textContent = 'RUNNING…'; out.innerHTML = '';

    termPush(out, '$ javac OOPCity.java && java OOPCity', 'call');

    await wait(600);

    for (const [txt, k] of OUT) {

      if (my !== token) return;

      const d = document.createElement('div');

      d.className = 't-line out';

      d.style.setProperty('--k', ({ class: '41,227,255', encap: '77,141,255', abstr: '155,123,255', inher: '90,240,208', poly: '215,123,255' })[k]);

      d.innerHTML = `<span></span><em>${TAGS[k]}</em>`;

      $('span', d).textContent = txt;

      out.appendChild(d); out.scrollTop = out.scrollHeight;

      sfx.click();

      await wait(480);

    }

    status.textContent = 'PROCESS FINISHED — EXIT CODE 0';

    termPush(out, 'Process finished with exit code 0', 'ok');

    finBtn.disabled = false; runBtn.disabled = false; runBtn.textContent = 'RUN AGAIN ▶';

    sfx.ok();

  }

  function setFocus(k) {

    const was = $(`#edLegend button[data-k="${k}"]`).classList.contains('on');

    $$('#edLegend button').forEach(b => b.classList.remove('on'));

    rows.forEach(r => r.classList.remove('lit'));

    if (was) { codeEl.classList.remove('focus'); return; }

    $(`#edLegend button[data-k="${k}"]`).classList.add('on');

    codeEl.classList.add('focus');

    rows.forEach(r => { if (r.dataset.k === k) r.classList.add('lit'); });

    const first = rows.find(r => r.dataset.k === k); if (first) scrollInside(codeEl, first, true);

  }

  $$('#edLegend button').forEach(b => b.addEventListener('click', () => { sfx.click(); setFocus(b.dataset.k); }));

  runBtn.addEventListener('click', run);

  skipBtn.addEventListener('click', () => { skip = true; });

  finBtn.addEventListener('click', () => { sfx.ok(); showFinale(); });

  return {

    async open() {

      if (navBusy) return; navBusy = true;

      sfx.engine();

      const sw = $('#sweep'); sw.classList.remove('go'); void sw.offsetWidth; sw.classList.add('go');

      world.classList.add('zooming');

      await wait(700);

      show('source');

      skipBtn.hidden = false; runBtn.textContent = 'RUN ▶';

      navBusy = false;

      world.classList.add('instant'); world.classList.add('zooming');

      type();

      await wait(500); sw.classList.remove('go');

    },

    stop() { token++; }

  };

})();

 

/* ---------------------------------------------------------

   FINALE

--------------------------------------------------------- */

function showFinale() {

  show('finale');

  setTimeout(() => burst(), 900);

}

function exploreAgain() {

  sfx.click();

  KEYS.forEach(k => { done[k] = false; districts[k].reset(); });

  unlockAnnounced = false;

  refreshProgress();

  world.classList.add('instant', 'zooming'); void world.offsetWidth;

  show('city');

  requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('instant', 'zooming')));

  arriveCity();

}

 

/* ---------------------------------------------------------

   WIRING + BOOT

--------------------------------------------------------- */

function wire() {

  $('#btnEnter').addEventListener('click', enterCity);

  $('#btnReturn').addEventListener('click', returnToCity);

  $('#btnAgain').addEventListener('click', exploreAgain);

  $('#btnSource').addEventListener('click', () => { if (doneCount() === 5) editor.open(); });

  $('#btnSound').addEventListener('click', e => {

    sound.on = !sound.on;

    e.currentTarget.textContent = sound.on ? 'SOUND ON' : 'SOUND OFF';

    e.currentTarget.setAttribute('aria-pressed', String(sound.on));

    if (sound.on) { const c = audio(); if (c && c.state === 'suspended') c.resume(); sfx.ok(); }

  });

  $$('.bld').forEach(b => {

    b.addEventListener('click', () => openDistrict(b.dataset.d));

    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDistrict(b.dataset.d); } });

  });

  $$('.dock-item').forEach(b => b.addEventListener('click', () => openDistrict(b.dataset.d)));

  $$('.done-cta').forEach(b => b.addEventListener('click', returnToCity));

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && (current.startsWith('d-') || current === 'source')) returnToCity(); });

  window.addEventListener('resize', fxResize);

}

 

function boot() {

  buildCityArt();

  KEYS.forEach(k => { if (districts[k].init) districts[k].init(); });

  refreshProgress();

  fxResize(); fxTick();

  wire();

}

boot();

 

})();

 









