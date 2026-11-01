/* SH1DEN'S — 2-player pool: join at the table, take turns pulling back the cue, balls roll on every screen. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR || {};

// ---------------------------------------------------------------- table and physics
// the same size as the 3D table's cloth, in metres
const T = (window.BAR && window.BAR.poolTable && window.BAR.poolTable()) || { W: 2.36, H: 1.21, R: 0.028 };
const W = T.W, H = T.H, R = T.R;
const POCKETS = [[0, 0, 0.068], [W / 2, -0.01, 0.058], [W, 0, 0.068], [0, H, 0.068], [W / 2, H + 0.01, 0.058], [W, H, 0.068]];
const DT = 1 / 240, MAX_V = 4.6;
const SOLIDS = [1, 2, 3, 4, 5, 6, 7], STRIPES = [9, 10, 11, 12, 13, 14, 15];

function rack() {
  const b = [];
  b[0] = [W * 0.25, H / 2, 0];
  // triangle, apex on the foot spot; 8 in the middle, one solid and one stripe in the back corners
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const fx = W * 0.72, gap = R * 2.02;
  let k = 0;
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) {
    const id = order[k++];
    b[id] = [fx + row * gap * 0.866, H / 2 + (i - row / 2) * gap, 0];
  }
  return b;
}
const copyBalls = (b) => b.map((x) => [x[0], x[1], x[2] ? 1 : 0]);

// deterministic: everyone runs exactly the same numbers, so every screen sees the same roll
function simulate(start, ang, pow) {
  const n = 16, x = [], y = [], vx = [], vy = [], inP = [];
  for (let i = 0; i < n; i++) { x[i] = start[i][0]; y[i] = start[i][1]; vx[i] = 0; vy[i] = 0; inP[i] = !!start[i][2]; }
  const v0 = 0.25 + (MAX_V - 0.25) * Math.max(0, Math.min(1, pow));
  vx[0] = Math.cos(ang) * v0; vy[0] = Math.sin(ang) * v0;
  const frames = [], potted = [];
  let first = -1;
  const snap = () => { const f = new Float32Array(n * 3); for (let i = 0; i < n; i++) { f[i * 3] = x[i]; f[i * 3 + 1] = y[i]; f[i * 3 + 2] = inP[i] ? 1 : 0; } frames.push(f); };
  snap();
  for (let step = 1; step < 240 * 20; step++) {
    let moving = false;
    for (let i = 0; i < n; i++) {
      if (inP[i]) continue;
      const sp = Math.hypot(vx[i], vy[i]);
      if (sp > 0) {
        const dec = (0.42 + 0.1 * sp) * DT;
        if (sp <= dec || sp < 0.004) { vx[i] = 0; vy[i] = 0; continue; }
        const k = (sp - dec) / sp; vx[i] *= k; vy[i] *= k;
        x[i] += vx[i] * DT; y[i] += vy[i] * DT; moving = true;
      }
    }
    // pockets first, then cushions
    for (let i = 0; i < n; i++) {
      if (inP[i]) continue;
      for (const [px, py, pr] of POCKETS) {
        if (Math.hypot(x[i] - px, y[i] - py) < pr) { inP[i] = true; vx[i] = vy[i] = 0; potted.push(i); break; }
      }
      if (inP[i]) continue;
      if (x[i] < R) { x[i] = R; vx[i] = -vx[i] * 0.78; } else if (x[i] > W - R) { x[i] = W - R; vx[i] = -vx[i] * 0.78; }
      if (y[i] < R) { y[i] = R; vy[i] = -vy[i] * 0.78; } else if (y[i] > H - R) { y[i] = H - R; vy[i] = -vy[i] * 0.78; }
    }
    for (let i = 0; i < n; i++) {
      if (inP[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (inP[j]) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i], d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = 2 * R - d;
        x[i] -= nx * over / 2; y[i] -= ny * over / 2; x[j] += nx * over / 2; y[j] += ny * over / 2;
        const rel = (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
        if (rel > 0) {
          const imp = rel * 0.975;
          vx[i] -= imp * nx; vy[i] -= imp * ny; vx[j] += imp * nx; vy[j] += imp * ny;
          if (first < 0 && (i === 0 || j === 0)) first = i === 0 ? j : i;
          moving = true;
        }
      }
    }
    if (step % 4 === 0) snap();
    if (!moving) break;
  }
  snap();
  const end = [];
  for (let i = 0; i < n; i++) end[i] = [x[i], y[i], inP[i] ? 1 : 0];
  return { frames, end, potted, first };
}

// ---------------------------------------------------------------- rules (simplified 8-ball)
function groupOf(id) { return id >= 1 && id <= 7 ? 'solids' : id >= 9 && id <= 15 ? 'stripes' : ''; }
function placeCue(balls) {
  const b = copyBalls(balls);
  let cx = W * 0.25, cy = H / 2;
  for (let tries = 0; tries < 40; tries++) {
    const clear = b.every((o, i) => i === 0 || o[2] || Math.hypot(o[0] - cx, o[1] - cy) > 2.2 * R);
    if (clear) break;
    cy = H / 2 + ((tries % 2 ? 1 : -1) * Math.ceil((tries + 1) / 2) * R * 2.4);
    if (cy < R || cy > H - R) { cx -= R * 2.4; cy = H / 2; }
  }
  b[0] = [cx, cy, 0];
  return b;
}
function judge(g, res) {
  const me = g.turn, other = me === 'a' ? 'b' : 'a';
  const groups = { a: g.ga || '', b: g.gb || '' };
  const names = { a: g.p.a.name, b: g.p.b.name };
  const pots = res.potted.filter((i) => i !== 0);
  const scratch = res.potted.includes(0);
  const out = { balls: res.end, turn: me, ga: groups.a, gb: groups.b, phase: 'play', winner: '', msg: '' };
  if (pots.includes(8)) {
    const mine = groups[me] === 'solids' ? SOLIDS : groups[me] === 'stripes' ? STRIPES : null;
    const cleared = mine && mine.every((i) => res.end[i][2]);
    out.phase = 'over';
    out.winner = cleared && !scratch ? me : other;
    out.msg = cleared && !scratch ? names[me] + ' sinks the 8 and wins!' : names[me] + ' sank the 8 too early. ' + names[other] + ' wins!';
    return out;
  }
  if (!groups[me] && !scratch && pots.length) {
    groups[me] = groupOf(pots[0]); groups[other] = groups[me] === 'solids' ? 'stripes' : 'solids';
    out.ga = groups.a; out.gb = groups.b;
  }
  const own = pots.some((i) => groupOf(i) === groups[me]);
  if (scratch) { out.balls = placeCue(res.end); out.turn = other; out.msg = names[me] + ' scratched. ' + names[other] + "'s turn."; }
  else if (own || (!groups[me] && pots.length)) { out.msg = names[me] + ' potted ' + pots.length + (pots.length > 1 ? ' balls' : ' ball') + ' and goes again.'; }
  else { out.turn = other; out.msg = (pots.length ? names[me] + " potted the other player's ball. " : '') + names[other] + "'s turn."; }
  return out;
}

// ---------------------------------------------------------------- shared state
let game = null, ref = null, lastShotSeq = 0, anim = null, shown = rack(), panelOpen = false, drag = null, firstLoad = true;
const mySlot = () => { const n = NET(); if (!game || !game.p || !n.uid) return ''; if (game.p.a && game.p.a.uid === n.uid) return 'a'; if (game.p.b && game.p.b.uid === n.uid) return 'b'; return ''; };
const myTurn = () => game && game.phase === 'play' && game.turn === mySlot() && !anim;

function start() {
  const n = NET();
  if (!n.db || !n.db()) { setTimeout(start, 800); return; }
  ref = n.db().ref('games/pool');
  ref.on('value', (s) => {
    const g = s.val();
    game = g && g.phase ? g : null;
    if (game && game.balls) game.balls = normBalls(game.balls);
    if (game && game.shot && game.shot.from) game.shot.from = normBalls(game.shot.from);
    // a new shot: everyone plays the same roll back
    if (game && game.shot && game.shot.seq > lastShotSeq) {
      lastShotSeq = game.shot.seq;
      if (!firstLoad) playShot(game.shot);
    }
    if (game && game.shot && firstLoad) lastShotSeq = game.shot.seq;
    firstLoad = false;
    if (!anim) shown = game && game.balls ? game.balls : rack();
    BAR().setPoolBalls && BAR().setPoolBalls(shown);
    render();
  });
  requestAnimationFrame(loop);
}
function normBalls(b) {
  const out = [];
  for (let i = 0; i < 16; i++) { const v = b[i] || [0, 0, 1]; out[i] = [+v[0] || 0, +v[1] || 0, v[2] ? 1 : 0]; }
  return out;
}

async function join() {
  const n = NET();
  if (!ref) { BAR().toast && BAR().toast('The room is still connecting.'); return; }
  if (!n.myName || !n.myName()) { BAR().toast && BAR().toast('Create your character first.'); return; }
  const me = { uid: n.uid, name: n.myName() };
  let became = '';
  const res = await ref.transaction((g) => {
    became = '';
    const stale = (p) => !p || !n.isOnline(p.uid);
    if (!g || !g.phase || g.phase === 'over' || (g.phase === 'wait' && stale(g.p && g.p.a))) {
      became = 'a';
      return { phase: 'wait', seq: ((g && g.seq) || 0) + 1, p: { a: me }, t: n.ts() };
    }
    if (g.phase === 'wait') {
      if (g.p.a.uid === me.uid) return; // already waiting
      became = 'b';
      return Object.assign({}, g, { phase: 'play', seq: g.seq + 1, p: { a: g.p.a, b: me }, turn: 'a', ga: '', gb: '', balls: rack(), shot: null, winner: '', msg: g.p.a.name + ' breaks.', t: n.ts() });
    }
    return; // a game is on: watch
  });
  if (!res || !res.committed) { panelOpen = true; render(); return; }
  if (became === 'a') {
    BAR().goTo && BAR().goTo('pool-cue-0');
    n.say('🎱 ' + me.name + ' is up for pool (1/2). Click the pool table in the billiards room to play!');
  } else if (became === 'b') {
    BAR().goTo && BAR().goTo('pool-cue-1');
    const a = res.snapshot.val().p.a.name;
    n.say('🎱 Pool (2/2): ' + a + ' vs ' + me.name + '. Game on!');
  }
  panelOpen = true; render();
}
function leave() {
  const slot = mySlot();
  if (!ref || !slot || !game) { panelOpen = false; render(); return; }
  if (game.phase === 'wait') ref.remove().catch(() => { });
  else if (game.phase === 'play') {
    const other = slot === 'a' ? 'b' : 'a';
    // if the other player already went home, the one still at the table takes it
    const gone = !NET().isOnline(game.p[other].uid);
    const win = gone ? slot : other;
    ref.update({ phase: 'over', winner: win, msg: gone ? game.p[other].name + ' left, so ' + game.p[slot].name + ' wins.' : game.p[slot].name + ' left the table. ' + game.p[other].name + ' wins!', seq: game.seq + 1 }).catch(() => { });
  }
  panelOpen = false; render();
}
function reset() { if (ref && NET().isAdmin) ref.remove().catch(() => { }); }
function shoot(ang, pow) {
  if (!myTurn() || !game.balls) return;
  const res = simulate(game.balls, ang, pow);
  const out = judge(game, res);
  const seq = game.seq + 1;
  const upd = Object.assign({}, out, { seq, shot: { by: game.turn, ang, pow, from: game.balls, seq }, t: NET().ts() });
  // play it here right away; the database echo is recognised as already played
  lastShotSeq = seq;
  playShot({ ang, pow, from: game.balls }, res);
  ref.update(upd).catch(() => { BAR().toast && BAR().toast("Couldn't send the shot. The room's Firebase rules may need updating."); });
  if (out.phase === 'over') NET().say('🎱 ' + out.msg);
}

// ---------------------------------------------------------------- animation
function playShot(shot, pre) {
  const res = pre || simulate(shot.from, shot.ang, shot.pow);
  anim = { res, t0: performance.now() + 220, strike: { ang: shot.ang, pow: shot.pow, t0: performance.now() }, from: shot.from };
}
function loop() {
  if (anim) {
    const t = (performance.now() - anim.t0) / 1000;
    const fr = anim.res.frames, idx = t * 60;
    if (t < 0) shown = anim.from;
    else if (idx >= fr.length - 1) { anim = null; shown = game && game.balls ? game.balls : shown; }
    else {
      const i0 = Math.floor(idx), k = idx - i0, a = fr[i0], b = fr[i0 + 1], cur = [];
      for (let i = 0; i < 16; i++) {
        const pa = a[i * 3 + 2] || b[i * 3 + 2];
        cur[i] = [a[i * 3] + (b[i * 3] - a[i * 3]) * k, a[i * 3 + 1] + (b[i * 3 + 1] - a[i * 3 + 1]) * k, pa];
      }
      shown = cur;
    }
    BAR().setPoolBalls && BAR().setPoolBalls(shown);
    if (!anim) render();
  }
  if (panelOpen) draw();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- the panel: top-down table you shoot on
const PAD = 0.09; // the rail around the cloth, in metres
let cv = null, ctx = null, scale = 1;
function layout() {
  cv = $('poolCanvas'); if (!cv) return;
  const wrap = cv.parentElement, avail = Math.min(wrap.clientWidth || 700, 760);
  scale = avail / (W + PAD * 2);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.round(avail) + 'px'; cv.style.height = Math.round((H + PAD * 2) * scale) + 'px';
  cv.width = Math.round(avail * dpr); cv.height = Math.round((H + PAD * 2) * scale * dpr);
  ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const toPx = (x, y) => [(x + PAD) * scale, (y + PAD) * scale];
function fromEvent(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale - PAD, (e.clientY - r.top) / scale - PAD]; }
const COLS = ['#ece8dc', '#dcb21e', '#1e3caa', '#be1e1e', '#5a2882', '#e66e14', '#146e3c', '#781818', '#0e0e0e', '#dcb21e', '#1e3caa', '#be1e1e', '#5a2882', '#e66e14', '#146e3c', '#781818'];
function draw() {
  if (!ctx) layout();
  if (!ctx) return;
  const w = (W + PAD * 2) * scale, h = (H + PAD * 2) * scale;
  ctx.clearRect(0, 0, w, h);
  // rail and cloth
  ctx.fillStyle = '#121012'; roundRect(0, 0, w, h, 14 * scale / 60); ctx.fill(); ctx.strokeStyle = '#ba8e46'; ctx.lineWidth = 2; roundRect(3, 3, w - 6, h - 6, 12 * scale / 60); ctx.stroke();
  ctx.fillStyle = '#7a1626'; ctx.fillRect(PAD * scale, PAD * scale, W * scale, H * scale);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.strokeRect(PAD * scale, PAD * scale, W * scale, H * scale);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (const fx of [0.25, 0.5, 0.75]) { const [px, py] = toPx(W * fx, -0.05); ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); { const [a, b] = toPx(W * 0.25, 0); const [c, d] = toPx(W * 0.25, H); ctx.moveTo(a, b); ctx.lineTo(c, d); } ctx.stroke();
  ctx.fillStyle = '#050505';
  for (const [px0, py0, pr] of POCKETS) { const [px, py] = toPx(px0, py0); ctx.beginPath(); ctx.arc(px, py, pr * scale * 0.78, 0, 7); ctx.fill(); }
  // balls
  const balls = shown || rack();
  for (let i = 0; i < 16; i++) {
    const b = balls[i]; if (!b || b[2]) continue;
    const [px, py] = toPx(b[0], b[1]), r = R * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(px + r * 0.15, py + r * 0.2, r, 0, 7); ctx.fill();
    ctx.fillStyle = i >= 9 ? '#ece8dc' : COLS[i]; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    if (i >= 9) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.clip(); ctx.fillStyle = COLS[i]; ctx.fillRect(px - r, py - r * 0.55, r * 2, r * 1.1); ctx.restore(); }
    if (i > 0) { ctx.fillStyle = '#f4f0e6'; ctx.beginPath(); ctx.arc(px, py, r * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold ' + Math.max(7, Math.round(r * 0.62)) + 'px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i), px, py + 0.5); }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.25, 0, 7); ctx.fill();
  }
  // the cue: while you aim, and for a moment as it strikes
  const cue = balls[0];
  if (cue && !cue[2]) {
    if (drag && drag.aim) drawCue(cue, drag.ang, drag.pow, true);
    else if (anim && anim.strike) {
      const k = (performance.now() - anim.strike.t0) / 220;
      if (k < 1.4) drawCue(anim.from[0], anim.strike.ang, anim.strike.pow * Math.max(0, 1 - k), false);
    }
  }
}
function drawCue(cue, ang, pow, guide) {
  const [cx, cy] = toPx(cue[0], cue[1]), dx = Math.cos(ang), dy = Math.sin(ang), r = R * scale;
  if (guide) {
    ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + dx * r, cy + dy * r); ctx.lineTo(cx + dx * 0.9 * scale, cy + dy * 0.9 * scale); ctx.stroke(); ctx.setLineDash([]);
  }
  const back = r * 1.4 + pow * 0.32 * scale, len = 1.25 * scale;
  const sx = cx - dx * back, sy = cy - dy * back, ex = cx - dx * (back + len), ey = cy - dy * (back + len);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a2010'; ctx.lineWidth = Math.max(4, r * 0.75); ctx.beginPath(); ctx.moveTo(sx - dx * len * 0.65, sy - dy * len * 0.65); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = '#c99a5c'; ctx.lineWidth = Math.max(3, r * 0.5); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx * len * 0.65, sy - dy * len * 0.65); ctx.stroke();
  ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = Math.max(3, r * 0.5); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx * 4, sy - dy * 4); ctx.stroke();
  if (guide) {
    const bw = 120, bx = 14, by = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 4, by - 4, bw + 8, 16);
    ctx.fillStyle = pow > 0.8 ? '#ff6a4a' : '#e2b467'; ctx.fillRect(bx, by, bw * pow, 8);
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// drag anywhere on the table: the cue sits on the side you pull toward, pull further for more power, let go to shoot
function aimFrom(p) {
  const cue = (shown || [])[0]; if (!cue) return null;
  const dx = cue[0] - p[0], dy = cue[1] - p[1], d = Math.hypot(dx, dy);
  if (d < 1e-4) return null;
  return { ang: Math.atan2(dy, dx), dist: d };
}
function wireCanvas() {
  cv = $('poolCanvas');
  cv.addEventListener('pointerdown', (e) => {
    if (!myTurn()) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const a = aimFrom(fromEvent(e)); if (!a) return;
    drag = { d0: a.dist, ang: a.ang, pow: 0, aim: true };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const a = aimFrom(fromEvent(e)); if (!a) return;
    drag.ang = a.ang; drag.pow = Math.max(0, Math.min(1, (a.dist - Math.min(drag.d0, 0.12)) / 0.55));
  });
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.pow > 0.02 && myTurn()) shoot(d.ang, d.pow);
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', () => { drag = null; });
}

function render() {
  const panel = $('poolPanel'); if (!panel) return;
  panel.hidden = !panelOpen;
  if (!panelOpen) return;
  const slot = mySlot(), n = NET();
  const line = $('poolPlayers'), st = $('poolStatus');
  if (!game) { line.textContent = 'Nobody at the table'; st.textContent = 'Click "Play" to wait for an opponent.'; }
  else {
    const nm = (k) => (game.p[k] ? game.p[k].name : '…');
    const grp = (k) => { const gg = k === 'a' ? game.ga : game.gb; return gg ? ' (' + gg + ')' : ''; };
    line.textContent = game.phase === 'wait' ? nm('a') + ' is waiting for an opponent (1/2)' : nm('a') + grp('a') + '  vs  ' + nm('b') + grp('b');
    if (game.phase === 'wait') st.textContent = slot ? 'Waiting for someone to join (1/2). It was posted in the chat.' : 'Click "Play" to take them on.';
    else if (game.phase === 'over') st.textContent = (game.msg || '') + ' Click "Play" for a new game.';
    else st.textContent = (game.msg ? game.msg + ' ' : '') + (anim ? '' : myTurn() ? 'Your shot: drag back from the cue ball and let go.' : nm(game.turn) + ' is shooting…');
  }
  const canJoin = !game || game.phase === 'over' || (game.phase === 'wait' && !slot);
  $('poolJoin').hidden = !canJoin;
  $('poolLeave').hidden = !slot || game.phase === 'over';
  $('poolReset').hidden = !(n.isAdmin && game);
  cv && cv.classList.toggle('myturn', myTurn());
}

function open() {
  if (BAR().hasCharacter && !BAR().hasCharacter()) { BAR().toast && BAR().toast('Create a character to play pool.'); return; }
  panelOpen = true; layout(); render();
  // sit down at the table if a seat is waiting for you
  if (!game || game.phase === 'over' || (game.phase === 'wait' && !mySlot())) join();
}
window.POOL = { open, join, leave, simulate, rack, judge, _state: () => game };

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
let inited = false;
function init() {
  if (inited || !$('poolPanel')) return; inited = true;
  wireCanvas();
  $('poolJoin').onclick = join;
  $('poolLeave').onclick = leave;
  $('poolReset').onclick = reset;
  $('poolClose').onclick = () => { panelOpen = false; drag = null; render(); };
  window.addEventListener('resize', () => { if (panelOpen) layout(); });
  BAR().setPoolBalls && BAR().setPoolBalls(rack());
  start();
}
})();
