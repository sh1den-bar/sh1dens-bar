/* SH1DEN'S — golf at the club down the side street. Up to four players, three or six holes, optional bets.
   Everyone sees the same round: the shot's numbers go in the database and every screen flies the same ball. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR || {};
const toast = (t) => BAR().toast && BAR().toast(t);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const r3 = (v) => Math.round(v * 1000) / 1000;
const COLORS = ['#ffd060', '#6ad0ff', '#ff7aa0', '#9be070'];
const MAX_BET = 100000;
let C = null;   // the course, from bar.js

// ---------------------------------------------------------------- clubs and the ball's flight
const D2R = Math.PI / 180;
const CLUBS = {
  driver: { name: 'Driver', v: 41, loft: 13 * D2R, carry: 75 },
  iron: { name: 'Iron', v: 26.6, loft: 22 * D2R, carry: 50 },
  wedge: { name: 'Wedge', v: 16.1, loft: 40 * D2R, carry: 26 },
  putter: { name: 'Putter', v: 6.2, loft: 0, carry: 18 }
};
const CLUB_ORDER = ['driver', 'iron', 'wedge', 'putter'];
const BOUNCE = { green: 0.22, fringe: 0.24, fairway: 0.3, tee: 0.3, rough: 0.14, bunker: 0.04 };
const KEEP = { green: 0.72, fringe: 0.62, fairway: 0.6, tee: 0.6, rough: 0.34, bunker: 0.12 };
const ROLL = { green: 1.05, fringe: 1.9, fairway: 2.5, tee: 2.5, rough: 6.0, bunker: 14 };
const LIE = { green: 1, fringe: 1, fairway: 1, tee: 1, rough: 0.82, bunker: 0.6 };
const CUP_R = 0.12, DT = 1 / 60;
// deterministic: the same numbers give the same flight on every screen
function simulate(hole, from, yaw, pow, club) {
  const cl = CLUBS[club] || CLUBS.iron, pin = C.holes[hole].pin;
  const lie = C.surface(from[0], from[1]);
  const liePow = club === 'putter' ? 1 : (club === 'wedge' && lie === 'bunker' ? 0.88 : LIE[lie] || 1);
  const sp = cl.v * Math.max(0.02, Math.min(1, pow)) * liePow;
  let x = from[0], z = from[1], y = 0;
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  let vh = sp * Math.cos(cl.loft), vy = sp * Math.sin(cl.loft), rolling = cl.loft === 0;
  const frames = [[x, y, z]];
  let result = 'rest', last = [x, z], firstLand = null;
  for (let step = 0; step < 60 * 25; step++) {
    if (!rolling) {
      x += dx * vh * DT; z += dz * vh * DT; y += vy * DT; vy -= 9.8 * DT;
      if (y <= 0) {
        y = 0;
        const s = C.surface(x, z);
        if (!firstLand) firstLand = [x, z];
        if (s === 'water' || s === 'ob') { result = s; frames.push([x, 0, z]); break; }
        if (Math.hypot(x - pin[0], z - pin[1]) < CUP_R && Math.abs(vy) < 9) { result = 'holed'; x = pin[0]; z = pin[1]; frames.push([x, -0.05, z]); break; }
        vy = -vy * (BOUNCE[s] || 0.2); vh *= KEEP[s] || 0.5;
        if (vy < 1.1) { vy = 0; rolling = true; }
      }
    } else {
      const s = C.surface(x, z);
      if (s === 'water' || s === 'ob') { result = s; break; }
      vh -= (ROLL[s] || 3) * DT;
      if (vh <= 0.04) { vh = 0; frames.push([x, 0, z]); break; }
      x += dx * vh * DT; z += dz * vh * DT;
      if (Math.hypot(x - pin[0], z - pin[1]) < CUP_R) {
        if (vh < 2.4) { result = 'holed'; x = pin[0]; z = pin[1]; frames.push([x, -0.05, z]); break; }
      }
    }
    frames.push([x, y, z]); last = [x, z];
  }
  const end = result === 'holed' ? [pin[0], pin[1]] : [x, z];
  return { frames, result, end: [r3(end[0]), r3(end[1])], last, firstLand };
}
// where to put the ball after the water: back along the line it came in on, onto dry land
function dropFrom(hole, from, at) {
  const dx = from[0] - at[0], dz = from[1] - at[1], d = Math.hypot(dx, dz) || 1;
  for (let k = 2; k < 60; k += 1) { const x = at[0] + dx / d * k, z = at[1] + dz / d * k; const s = C.surface(x, z); if (s !== 'water' && s !== 'ob') return [r3(x), r3(z)]; }
  return from;
}
// how far a club carries at this power, before it bounces (for the aiming marker)
function carry(from, yaw, pow, club) {
  const cl = CLUBS[club], lie = C.surface(from[0], from[1]), lp = club === 'putter' ? 1 : (club === 'wedge' && lie === 'bunker' ? 0.88 : LIE[lie] || 1);
  const v = cl.v * pow * lp;
  const d = club === 'putter' ? (v * v) / (2 * ROLL.green) : (v * v * Math.sin(2 * cl.loft)) / 9.8;
  return [from[0] + Math.sin(yaw) * d, from[1] + Math.cos(yaw) * d];
}

// ---------------------------------------------------------------- the round, shared through the database
let game = null, ref = null, lastSeq = 0, firstLoad = true, anim = null;
let aimYaw = 0, club = 'driver', power = 0, charging = null, freeCam = false, aimKeys = { l: 0, r: 0 }, lastTurnKey = '';
let menuEl = null, panel = null, hud = null, panelOpen = false, setup = { holes: 3, bet: 0 };
const clampBet = (v) => Math.max(0, Math.min(MAX_BET, Math.floor(+v || 0)));
const me = () => NET().uid;
const inRound = () => !!(game && game.p && game.p[me()] && !game.p[me()].out);
const P = (uid) => (game && game.p && game.p[uid]) || null;
const holeOf = () => (game ? game.hole || 0 : 0);
const myTurn = () => !!(game && game.phase === 'play' && game.turn === me() && !anim);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const strokesOf = (p, h) => (p && p.s && +p.s[h]) || 0;
const totalOf = (p) => { let t = 0; if (p && p.s) for (const k in p.s) t += +p.s[k] || 0; return t; };

function norm(g) {
  if (!g || !g.phase) return null;
  const arr = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a - b).map((k) => v[k]) : []);
  g.p = g.p || {}; g.order = arr(g.order).filter((u) => g.p[u]); g.winners = arr(g.winners);
  if (g.shot && g.shot.from) g.shot.from = arr(g.shot.from).map(Number);
  for (const u in g.p) { const p = g.p[u]; p.s = p.s || {}; if (p.ball) p.ball = [+p.ball[0], +p.ball[1]]; }
  return g;
}
function start() {
  const n = NET();
  if (!n.db || !n.db() || !BAR().golfCourse) { setTimeout(start, 900); return; }
  C = BAR().golfCourse();
  ref = n.db().ref('games/golf');
  ref.on('value', (s) => {
    game = norm(s.val());
    if (game && game.shot && game.shot.seq > lastSeq) {
      lastSeq = game.shot.seq;
      if (!firstLoad && !(anim && anim.seq === game.shot.seq)) playShot(game.shot);
    }
    if (firstLoad && game && game.shot) lastSeq = game.shot.seq;
    firstLoad = false;
    payDebts();
    sync(); render();
  });
  requestAnimationFrame(loop);
}

// ---- joining and leaving
async function create() {
  const n = NET();
  if (!ref) { toast('Still connecting.'); return; }
  if (!n.myName || !n.myName()) { toast('Create your character first.'); return; }
  if (setup.bet && !canAfford(setup.bet)) { toast("You don't have " + setup.bet + ' coins for that bet.'); return; }
  const mine = { name: n.myName(), c: 0, s: {}, bid: clampBet(setup.bet) };
  let made = false;
  await ref.transaction((g) => {
    made = false;
    const stale = g && g.phase === 'wait' && !n.isOnline(g.host);
    const deadPlay = g && g.phase === 'play' && !Object.keys(g.p || {}).some((u) => n.isOnline(u) && !(g.p[u] || {}).out);
    if (g && g.phase && g.phase !== 'over' && !stale && !deadPlay) return;   // someone's already out there
    made = true;
    const keepDebts = g && g.phase === 'over' && g.p && Object.keys(g.p).some((u) => g.p[u].owe && !g.p[u].paid);
    if (keepDebts) toast('The last round still has unpaid bets; they pay when those players come back.');
    return { phase: 'wait', seq: ((g && g.seq) || 0) + 1, host: n.uid, holes: setup.holes, start: 0, bet: 0, order: [n.uid], p: { [n.uid]: mine }, t: n.ts(), msg: '' };
  });
  if (made) { n.say && n.say('⛳ ' + mine.name + ' is starting a round of golf (' + setup.holes + ' holes' + (setup.bet ? ', ' + setup.bet + ' coins suggested' : '') + '). Right-click Pan at the golf club to join!'); BAR().setView && BAR().setView('golf'); }
  else toast('A round is already on. Join it, or wait for it to finish.');
  panelOpen = true; render();
}
async function join() {
  const n = NET();
  if (!ref || !game || game.phase !== 'wait') return;
  if (!n.myName || !n.myName()) { toast('Create your character first.'); return; }
  let ok = false;
  await ref.transaction((g) => {
    ok = false;
    if (!g || g.phase !== 'wait') return;
    const order = g.order || [];
    if (order.includes(n.uid)) { ok = true; return; }
    if (order.length >= 4) return;
    ok = true;
    const p = Object.assign({}, g.p); p[n.uid] = { name: n.myName(), c: order.length, s: {}, bid: clampBet(setup.bet) };
    return Object.assign({}, g, { order: order.concat([n.uid]), p, seq: (g.seq || 0) + 1 });
  });
  if (ok) { n.say && n.say('⛳ ' + n.myName() + ' joined the golf round (' + Math.min(4, (game.order || []).length) + '/4).'); BAR().setView && BAR().setView('golf'); }
  else toast("Couldn't join: the round is full or already started.");
  panelOpen = true; render();
}
// ---- the bet: everyone puts in the amount they'd like; if they differ, everyone votes for one of the amounts on the table
function betState(g) {
  const ps = g.order.map((u) => g.p[u]), opts = [...new Set(ps.map((p) => clampBet(p.bid)))].sort((a, b) => a - b);
  if (opts.length <= 1) return { agreed: true, amount: opts[0] || 0, opts, tally: {} };
  const tally = {}; let voted = 0;
  for (const p of ps) if (p.vote !== undefined && p.vote !== null && opts.includes(+p.vote)) { tally[+p.vote] = (tally[+p.vote] || 0) + 1; voted++; }
  if (voted < ps.length) return { agreed: false, amount: null, opts, tally, voted };
  // most votes wins; a tie goes to the smaller amount
  const best = opts.slice().sort((a, b) => (tally[b] || 0) - (tally[a] || 0) || a - b)[0];
  return { agreed: true, amount: best, opts, tally, voted, byVote: true };
}
function setMine(field, v) { if (game && game.p[me()] && game.phase === 'wait') NET().db().ref('games/golf/p/' + me() + '/' + field).set(v).catch(() => { }); }
function propose(v) {
  v = clampBet(v);
  if (v && !canAfford(v)) { toast("You don't have " + v + ' coins.'); return; }
  const db = NET().db(), up = {};
  up['games/golf/p/' + me() + '/bid'] = v;
  // a new amount on the table means everyone votes again
  for (const u of game.order) up['games/golf/p/' + u + '/vote'] = null;
  up['games/golf/seq'] = (game.seq || 0) + 1;
  db.ref().update(up).catch(() => toast("Couldn't change it."));
}
function vote(v) { if (v && !canAfford(v)) { toast("You can't vote for a bet you can't pay (" + v + ' coins).'); return; } setMine('vote', v); }
function teeOff() {
  if (!game || game.phase !== 'wait' || game.host !== me()) return;
  const bs = betState(game);
  if (!bs.agreed) { toast('Everyone has to vote on the bet first.'); return; }
  const g = JSON.parse(JSON.stringify(game)), h = 0;
  g.bet = g.order.length > 1 ? bs.amount : 0;
  g.order.forEach((u, i) => { g.p[u].ball = teeSpot(h, i); g.p[u].holed = false; g.p[u].s = {}; });
  Object.assign(g, { phase: 'play', hole: h, turn: g.order[0], seq: g.seq + 1, msg: (g.bet ? 'Playing for ' + g.bet + ' coins each. ' : '') + 'Hole 1. ' + g.p[g.order[0]].name + ' has the honour.', shot: null, t: NET().ts() });
  ref.set(g).catch(() => toast("Couldn't start. The room's Firebase rules may need updating."));
  NET().say && NET().say('⛳ Tee off! ' + g.order.map((u) => g.p[u].name).join(', ') + ' on the first tee' + (g.bet ? ', playing for ' + g.bet + ' coins each.' : '.'));
}
function leave() {
  if (!game || !game.p[me()]) { panelOpen = false; render(); return; }
  if (game.phase === 'wait') {
    const g = JSON.parse(JSON.stringify(game));
    g.order = g.order.filter((u) => u !== me()); delete g.p[me()];
    if (!g.order.length) { ref.remove().catch(() => { }); }
    else { if (g.host === me()) g.host = g.order[0]; g.seq++; ref.set(g).catch(() => { }); }
  } else if (game.phase === 'play') {
    const g = JSON.parse(JSON.stringify(game));
    g.p[me()].out = true; g.msg = g.p[me()].name + ' walked off the course.';
    advance(g); g.seq++;
    ref.set(g).catch(() => { });
  }
  BAR().golfCam && BAR().golfCam(null);
  render();
}
function skipPlayer(uid) {
  if (!game || game.phase !== 'play' || !game.p[uid] || NET().isOnline(uid)) return;
  const g = JSON.parse(JSON.stringify(game));
  g.p[uid].out = true; g.msg = g.p[uid].name + ' went home, so they are out of the round.';
  advance(g); g.seq++;
  ref.set(g).catch(() => { });
}
function teeSpot(h, i) {
  const t = C.holes[h].tee, p = C.holes[h].pin, a = Math.atan2(p[0] - t[0], p[1] - t[1]);
  const off = (i - 1.5) * 0.7;   // side by side across the tee box
  return [r3(t[0] + Math.cos(a) * off), r3(t[1] - Math.sin(a) * off)];
}

// ---- after every shot: who's next, the next hole, or the end
const MAX_STROKES = 10;
function advance(g) {
  const h = g.hole, pin = C.holes[h].pin;
  const live = g.order.filter((u) => !g.p[u].out);
  if (!live.length) { finish(g); return; }
  const playing = live.filter((u) => !g.p[u].holed && strokesOf(g.p[u], h) < MAX_STROKES);
  if (playing.length) {
    // whoever is furthest from the flag plays next (on the tee: the honour order)
    const onTee = playing.filter((u) => strokesOf(g.p[u], h) === 0);
    g.turn = onTee.length ? onTee[0] : playing.slice().sort((a, b) => dist(g.p[b].ball, pin) - dist(g.p[a].ball, pin))[0];
    return;
  }
  // hole done
  const scores = live.map((u) => g.p[u].name + ' ' + strokesOf(g.p[u], h)).join(', ');
  if (h + 1 >= (g.start || 0) + g.holes) { g.msg = 'Hole ' + (h + 1) + ': ' + scores + '.'; finish(g); return; }
  const nh = h + 1;
  // the best score on the last hole tees off first
  const order = live.slice().sort((a, b) => strokesOf(g.p[a], h) - strokesOf(g.p[b], h));
  order.forEach((u, i) => { g.p[u].ball = teeSpot(nh, i); g.p[u].holed = false; });
  g.hole = nh; g.turn = order[0];
  g.msg = 'Hole ' + (h + 1) + ': ' + scores + '. On to hole ' + (nh + 1) + ', ' + g.p[order[0]].name + ' first.';
}
function finish(g) {
  g.phase = 'over'; g.turn = '';
  const live = g.order.filter((u) => !g.p[u].out);
  const totals = g.order.map((u) => [u, totalOf(g.p[u])]);
  const best = live.length ? Math.min(...live.map((u) => totalOf(g.p[u]))) : 0;
  const winners = live.filter((u) => totalOf(g.p[u]) === best);
  g.winners = winners;
  if (g.bet && winners.length && g.order.length > 1) {
    // everyone who didn't win owes the bet, split between the winners
    for (const u of g.order) if (!winners.includes(u)) { g.p[u].owe = g.bet; g.p[u].paid = false; }
  }
  const names = winners.map((u) => g.p[u].name).join(' & ');
  g.msg = (g.msg ? g.msg + ' ' : '') + (winners.length ? names + (winners.length > 1 ? ' tie' : ' wins') + ' with ' + best + ' (' + (best - parOf(g)) + ' vs par ' + parOf(g) + ').' : 'Nobody finished.') + (g.bet && g.order.length > 1 ? ' Bets: ' + g.bet + ' coins each to the winner' + (winners.length > 1 ? 's.' : '.') : '');
  void totals;
}
const parOf = (g) => { let p = 0; for (let h = g.start || 0; h < (g.start || 0) + g.holes; h++) p += C.holes[h].par; return p; };

// ---- taking a shot
function shoot(pow) {
  if (!myTurn()) return;
  const h = holeOf(), p = P(me()), from = p.ball;
  const shot = { by: me(), from: [r3(from[0]), r3(from[1])], yaw: Math.round(aimYaw * 10000) / 10000, pow: r3(pow), club, hole: h, seq: game.seq + 1 };
  const res = simulate(h, shot.from, shot.yaw, shot.pow, shot.club);
  const g = JSON.parse(JSON.stringify(game)), mp = g.p[me()];
  mp.s[h] = strokesOf(mp, h) + 1;
  let note = '';
  if (res.result === 'water') { mp.s[h] += 1; mp.ball = dropFrom(h, shot.from, res.end); note = ' Splash! +1, dropped by the water.'; }
  else if (res.result === 'ob') { mp.s[h] += 1; mp.ball = shot.from; note = ' Out of bounds. +1, play it again.'; }
  else mp.ball = res.end;
  if (res.result === 'holed') { mp.holed = true; note = ' In the hole in ' + mp.s[h] + '!' + (mp.s[h] === 1 ? ' HOLE IN ONE!' : ''); }
  else if (mp.s[h] >= MAX_STROKES) { mp.holed = true; note += ' Picks up at ' + MAX_STROKES + '.'; }
  g.msg = mp.name + ' · ' + CLUBS[club].name + note;
  advance(g);
  g.shot = shot; g.seq = shot.seq; g.t = NET().ts();
  anim = makeAnim(shot, res);
  lastSeq = shot.seq;
  ref.set(g).catch(() => toast("Couldn't send the shot. The room's Firebase rules may need updating."));
  if (res.result === 'holed' && mp.s[h] === 1) NET().say && NET().say('⛳ HOLE IN ONE for ' + mp.name + ' on hole ' + (h + 1) + '!');
  if (g.phase === 'over') NET().say && NET().say('⛳ ' + g.msg);
}
function makeAnim(shot, res) { return { seq: shot.seq, by: shot.by, res, t0: performance.now() + 900, yaw: shot.yaw, from: shot.from, club: shot.club }; }
function playShot(shot) {
  if (!C || shot.hole === undefined) return;
  anim = makeAnim(shot, simulate(shot.hole, shot.from, shot.yaw, shot.pow, shot.club));
}

// ---------------------------------------------------------------- every frame: balls, golfers, camera, aiming
function loop() {
  requestAnimationFrame(loop);
  if (!C || !BAR().golfSetBalls) return;
  const now = performance.now();
  let flying = null;
  if (anim) {
    const k = Math.floor((now - anim.t0) / 1000 * 60), fr = anim.res.frames;
    if (k >= fr.length + 50) { anim = null; render(); }
    else flying = { uid: anim.by, pos: fr[Math.max(0, Math.min(fr.length - 1, k))], started: k >= 0 };
  }
  // the balls
  const balls = [], players = {};
  if (game && game.phase === 'play') {
    game.order.forEach((u, i) => {
      const p = game.p[u]; if (!p || p.out || !p.ball) return;
      let pos = [p.ball[0], 0, p.ball[1]];
      if (anim && anim.by === u) pos = flying && flying.started ? flying.pos : [anim.from[0], 0, anim.from[1]];
      const inCup = p.holed && !(anim && anim.by === u) && dist(p.ball, C.holes[game.hole].pin) < 0.2;
      balls.push({ uid: u, x: pos[0], y: Math.max(0, pos[1]), z: pos[2], color: THREE_COLOR(COLORS[p.c % 4]), visible: !inCup && pos[1] > -0.04 });
      // the golfer stands at their ball (or where they hit from, while it's flying), facing the line
      const at = anim && anim.by === u ? anim.from : p.ball;
      const yaw = anim && anim.by === u ? anim.yaw : (u === me() && myTurn() ? aimYaw : yawTo(at, C.holes[game.hole].pin));
      players[u] = { x: at[0], z: at[1], yaw, swingAt: anim && anim.by === u ? anim.t0 - 700 : 0 };
    });
  }
  BAR().golfSetBalls(balls);
  BAR().golfSetPlayers(players);
  // aiming: rotate with the keys, show where it's going to land
  if (myTurn()) {
    const dt = 1 / 60; aimYaw += (aimKeys.r - aimKeys.l) * dt * (aimKeys.fine ? 0.18 : 0.7);
    if (charging) { const u = ((now - charging) / 1000) % 2.2; power = u < 1.1 ? u / 1.1 : 2 - u / 1.1; }
    const p = P(me()).ball, t = carry(p, aimYaw, charging ? Math.max(0.05, power) : 1, club);
    BAR().golfAim({ x: p[0], z: p[1], tx: t[0], tz: t[1] });
    drawMeter();
  } else BAR().golfAim(null);
  // the camera: behind the ball for whoever is playing, following it in the air
  if (inRound() && game.phase === 'play' && !freeCam) {
    if (flying && flying.started) {
      const pos = flying.pos;
      BAR().golfCam({ x: pos[0], z: pos[2], ty: Math.max(0.6, pos[1] * 0.6 + 0.6), yaw: anim.yaw + Math.PI, d: 10, pitch: 0.3, follow: true });
    } else if (game.turn && P(game.turn) && P(game.turn).ball) {
      const b = P(game.turn).ball, y = game.turn === me() && myTurn() ? aimYaw : yawTo(b, C.holes[game.hole].pin);
      const putting = C.surface(b[0], b[1]) === 'green';
      BAR().golfCam({ x: b[0], z: b[1], ty: 0.9, yaw: y + Math.PI, d: putting ? 4 : 6.5, pitch: putting ? 0.42 : 0.22, follow: true });
    }
  }
  // a new turn of mine: point at the flag and pick a sensible club
  const tk = game && game.phase === 'play' ? game.turn + ':' + game.seq : '';
  if (tk !== lastTurnKey && !anim) { lastTurnKey = tk; if (myTurn()) newTurn(); render(); }
}
function THREE_COLOR(hex) { return parseInt(hex.slice(1), 16); }
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
function newTurn() {
  const b = P(me()).ball, pin = C.holes[holeOf()].pin, d = dist(b, pin), lie = C.surface(b[0], b[1]);
  aimYaw = yawTo(b, pin);
  club = lie === 'green' || (lie === 'fringe' && d < 14) ? 'putter' : d > 58 ? 'driver' : d > 32 ? 'iron' : d > 14 ? 'wedge' : 'putter';
  power = 0; charging = null;
  if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { }
  toast('⛳ Your shot. ' + Math.round(d) + 'm to the flag.');
}

// ---------------------------------------------------------------- bets: the losers pay the winners, through ordinary coin gifts
function canAfford(n) { const E = window.EXTRAS; return !n || (E && E.myCoins && E.myCoins() >= n) || (NET().isAdmin); }
let paying = false;
async function payDebts() {
  if (paying || !game || game.phase !== 'over' || !game.p) return;
  const mine = game.p[me()];
  if (!mine || !mine.owe || mine.paid || !game.winners || !game.winners.length) return;
  paying = true;
  try {
    const db = NET().db(), share = Math.floor(mine.owe / game.winners.length);
    for (const w of game.winners) {
      if (share <= 0) break;
      const [a, b] = await Promise.all([db.ref('coins/' + me()).once('value'), db.ref('coins/' + w).once('value')]);
      const meC = a.val(), them = b.val();
      if (!meC || !them) continue;
      const amt = Math.min(share, meC.n || 0); if (amt <= 0) continue;
      const gid = db.ref('gifts').push().key, upd = {};
      upd['gifts/' + gid] = { from: me(), to: w, amt, t: NET().ts() };
      upd['coins/' + me() + '/n'] = (meC.n || 0) - amt; upd['coins/' + me() + '/g'] = gid;
      upd['coins/' + w + '/n'] = (them.n || 0) + amt; upd['coins/' + w + '/g'] = gid;
      await db.ref().update(upd);
      toast('⛳ You paid ' + game.p[w].name + ' ' + amt + ' coins for the golf.');
    }
    await NET().db().ref('games/golf/p/' + me() + '/paid').set(true);
  } catch (e) { /* try again on the next update */ }
  paying = false;
}

// ---------------------------------------------------------------- what everyone sees
function sync() {
  // leaving the course when the round is over (or you dropped out): give the camera back
  if (!inRound() || !game || game.phase !== 'play') { BAR().golfCam && BAR().golfCam(null); }
}
function openMenu(x, y, talk) {
  if (!menuEl) {
    menuEl = el('div', 'popmenu'); menuEl.id = 'golfMenu'; menuEl.hidden = true; $('stage').appendChild(menuEl);
    document.addEventListener('pointerdown', (e) => { if (menuEl && !menuEl.hidden && !menuEl.contains(e.target)) menuEl.hidden = true; }, true);
  }
  menuEl.textContent = '';
  menuEl.appendChild(el('div', 'dmTitle', 'Pan · the starter'));
  const item = (label, fn) => { const b = el('button', null, label); b.type = 'button'; b.onclick = () => { menuEl.hidden = true; fn(); }; menuEl.appendChild(b); };
  if (talk) item('Talk', talk[1]);
  const g = game, mine = g && g.p && g.p[me()];
  if (!g || g.phase === 'over') item('Start a round…', () => { panelOpen = true; render(); });
  else if (g.phase === 'wait' && !mine) item('Join ' + g.p[g.host].name + "'s round", join);
  if (g && g.phase !== 'over') item(mine ? 'Scorecard' : 'Watch the round', () => { panelOpen = true; render(); });
  if (g && g.phase === 'over') item('Last scorecard', () => { panelOpen = true; render(); });
  const r = $('stage').getBoundingClientRect();
  menuEl.hidden = false;
  menuEl.style.left = Math.max(12, Math.min(r.width - 220, x - r.left + 10)) + 'px';
  menuEl.style.top = Math.max(60, Math.min(r.height - menuEl.offsetHeight - 70, y - r.top - 10)) + 'px';
}
function buildPanel() {
  panel = el('section', 'panel'); panel.id = 'golfPanel'; panel.hidden = true; panel.setAttribute('aria-label', 'Golf');
  panel.innerHTML = '<header><h2>Golf</h2><button class="x" type="button" id="golfClose" aria-label="Close">✕</button></header><div id="golfBody"></div>';
  $('stage').appendChild(panel);
  $('golfClose').onclick = () => { panelOpen = false; render(); };
  hud = el('div'); hud.id = 'golfHud'; hud.hidden = true; $('stage').appendChild(hud);
  hud.innerHTML =
    '<div class="ghInfo" id="ghInfo"></div>' +
    '<div class="ghRow" id="ghClubs"></div>' +
    '<div class="ghRow"><button type="button" id="ghL" title="Aim left (A)">◀</button><button type="button" id="ghFlag">Aim at flag</button><button type="button" id="ghR" title="Aim right (D)">▶</button><button type="button" id="ghCam">Free camera</button></div>' +
    '<div class="ghRow"><div class="ghMeter"><i id="ghPow"></i><b></b></div><button type="button" class="primary" id="ghSwing" title="Hold, let go to hit (Space)">Hold to swing</button></div>';
  for (const k of CLUB_ORDER) { const b = el('button', null, CLUBS[k].name); b.type = 'button'; b.dataset.club = k; b.onclick = () => { club = k; render(); }; $('ghClubs').appendChild(b); }
  const hold = (id, key) => { const b = $(id); const on = (v) => (e) => { e.preventDefault(); aimKeys[key] = v; }; b.addEventListener('pointerdown', on(1)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, on(0)); };
  hold('ghL', 'l'); hold('ghR', 'r');
  $('ghFlag').onclick = () => { if (myTurn()) aimYaw = yawTo(P(me()).ball, C.holes[holeOf()].pin); };
  $('ghCam').onclick = () => { freeCam = !freeCam; $('ghCam').setAttribute('aria-pressed', freeCam ? 'true' : 'false'); if (freeCam) BAR().golfCam(null); };
  const sw = $('ghSwing');
  sw.addEventListener('pointerdown', (e) => { e.preventDefault(); if (myTurn()) charging = performance.now(); });
  const go = () => { if (charging) { const p = Math.max(0.03, power); charging = null; shoot(p); } };
  sw.addEventListener('pointerup', go); sw.addEventListener('pointercancel', () => { charging = null; });
  // on your turn the keys aim and swing (and don't move the camera)
  const ours = (e) => /^(Space|KeyA|KeyD|ArrowLeft|ArrowRight|Digit[1-4])$/.test(e.code);
  addEventListener('keydown', (e) => {
    if (!myTurn() || freeCam || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || !ours(e)) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Space' && !e.repeat) charging = performance.now();
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') aimKeys.l = 1; if (e.code === 'KeyD' || e.code === 'ArrowRight') aimKeys.r = 1;
    aimKeys.fine = e.shiftKey;
    if (/^Digit[1-4]$/.test(e.code)) { club = CLUB_ORDER[+e.code.slice(5) - 1]; render(); }
  }, true);
  addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') aimKeys.l = 0; if (e.code === 'KeyD' || e.code === 'ArrowRight') aimKeys.r = 0;
    aimKeys.fine = e.shiftKey;
    if (!ours(e) || !myTurn()) return;
    e.stopPropagation();
    if (e.code === 'Space') go();
  }, true);
}
function drawMeter() {
  const i = $('ghPow'); if (!i) return;
  i.style.width = Math.round((charging ? power : 0) * 100) + '%';
  i.classList.toggle('hot', power > 0.92 && !!charging);
}
function render() {
  if (!panel) buildPanel();
  const g = game, mine = g && g.p && g.p[me()];
  // the shot controls, only on your turn
  hud.hidden = !myTurn();
  if (myTurn()) {
    const h = C.holes[holeOf()], b = P(me()).ball, lie = C.surface(b[0], b[1]);
    $('ghInfo').textContent = 'Hole ' + h.n + ' · par ' + h.par + ' · ' + Math.round(dist(b, h.pin)) + 'm to the flag · stroke ' + (strokesOf(mine, holeOf()) + 1) + ' · lie: ' + lie;
    for (const bt of $('ghClubs').querySelectorAll('button')) { bt.setAttribute('aria-pressed', bt.dataset.club === club ? 'true' : 'false'); bt.textContent = CLUBS[bt.dataset.club].name + ' ' + CLUBS[bt.dataset.club].carry + 'm'; }
  }
  panel.hidden = !panelOpen;
  if (!panelOpen) return;
  // don't rebuild under someone's fingers while they type an amount
  const ae = document.activeElement;
  if (ae && ae.tagName === 'INPUT' && panel.contains(ae)) { clearTimeout(render.t); render.t = setTimeout(render, 900); return; }
  const body = $('golfBody'); body.textContent = '';
  if (!g || (g.phase === 'over' && !mine && !panelOpen)) { }
  if (!g || g.phase === 'over') {
    if (g && g.phase === 'over') body.appendChild(card(g));
    body.appendChild(el('h3', null, 'New round'));
    const r = el('div', 'row'); r.appendChild(el('span', 'glabel', 'Length'));
    for (const v of [3, 6]) { const b = el('button', null, v + ' holes'); b.type = 'button'; b.setAttribute('aria-pressed', setup.holes === v ? 'true' : 'false'); b.onclick = () => { setup.holes = v; render(); }; r.appendChild(b); }
    body.appendChild(r);
    body.appendChild(betInput('Your bet', setup.bet, (v) => { setup.bet = v; }));
    body.appendChild(el('p', null, 'Up to 4 players. Everyone suggests a bet when they join; if the amounts differ, you vote. Lowest score wins and everyone else pays the winner.'));
    const go = el('button', 'primary', 'Start the round'); go.type = 'button'; go.onclick = create; body.appendChild(go);
    return;
  }
  body.appendChild(card(g));
  if (g.msg) body.appendChild(el('p', 'gmsg', g.msg));
  const btns = el('div', 'row');
  const B = (t, fn, cls) => { const b = el('button', cls || null, t); b.type = 'button'; b.onclick = fn; btns.appendChild(b); };
  if (g.phase === 'wait') {
    body.appendChild(el('p', null, (g.order.length) + '/4 players · ' + g.holes + ' holes. ' + (g.host === me() ? 'Tee off when everyone is in.' : 'Waiting for ' + g.p[g.host].name + ' to tee off.')));
    body.appendChild(betBox(g, mine));
    if (!mine && g.order.length < 4) { body.appendChild(betInput('Your bet', setup.bet, (v) => { setup.bet = v; })); B('Join', join, 'primary'); }
    if (g.host === me()) { const ok = betState(g).agreed; B(ok ? 'Tee off' : 'Tee off (waiting for votes)', teeOff, 'primary'); if (!ok) btns.lastChild.disabled = true; }
    if (mine) B('Leave', leave);
  } else if (g.phase === 'play') {
    const t = g.turn && g.p[g.turn];
    body.appendChild(el('p', null, anim ? 'Ball in the air…' : myTurn() ? 'Your shot: pick a club, aim with ◀ ▶ (or A / D), hold the swing button (or Space) and let go.' : t ? t.name + ' is up.' : ''));
    if (t && g.turn !== me() && !NET().isOnline(g.turn)) B('Skip ' + t.name + ' (gone)', () => skipPlayer(g.turn));
    if (mine && !mine.out) B('Walk off', leave);
  }
  if (NET().isAdmin) B('Reset (host)', () => ref.remove().catch(() => { }));
  body.appendChild(btns);
}
function betInput(label, val, set) {
  const r = el('div', 'row'); r.appendChild(el('span', 'glabel', label));
  const inp = el('input'); inp.type = 'number'; inp.min = 0; inp.max = MAX_BET; inp.step = 5; inp.value = val || 0; inp.style.width = '90px';
  inp.oninput = () => set(clampBet(inp.value));
  r.appendChild(inp); r.appendChild(el('span', 'glabel', 'coins'));
  for (const q of [0, 25, 100, 500]) { const b = el('button', 'mini', q ? '+' + q : '0'); b.type = 'button'; b.onclick = () => { const v = q ? clampBet((+inp.value || 0) + q) : 0; inp.value = v; set(v); }; r.appendChild(b); }
  return r;
}
// the bet table in the lobby: what each player wants, and the vote when they disagree
function betBox(g, mine) {
  const box = el('div', 'gbet'), bs = betState(g);
  box.appendChild(el('div', 'gbetTitle', 'The bet'));
  const ul = el('ul', 'gbids');
  for (const u of g.order) { const p = g.p[u], li = el('li'); li.appendChild(el('span', null, p.name)); li.appendChild(el('b', null, clampBet(p.bid) ? clampBet(p.bid) + ' 🪙' : 'no bet')); if (!bs.agreed || bs.byVote) li.appendChild(el('i', null, p.vote !== undefined && p.vote !== null ? '✓ voted' : '…')); li.firstChild.style.color = COLORS[p.c % 4]; ul.appendChild(li); }
  box.appendChild(ul);
  if (mine) box.appendChild(betInput('Change mine', clampBet(mine.bid), (v) => { clearTimeout(betInput.t); betInput.t = setTimeout(() => propose(v), 700); }));
  if (bs.opts.length > 1) {
    box.appendChild(el('p', null, 'The amounts differ, so everyone votes. Most votes wins; a tie goes to the smaller bet.'));
    const vr = el('div', 'row');
    for (const v of bs.opts) {
      const b = el('button', null, (v ? v + ' 🪙' : 'No bet') + ' · ' + (bs.tally[v] || 0)); b.type = 'button';
      b.setAttribute('aria-pressed', mine && +mine.vote === v ? 'true' : 'false'); b.disabled = !mine; b.onclick = () => vote(v); vr.appendChild(b);
    }
    box.appendChild(vr);
  }
  box.appendChild(el('p', 'gbetNow', bs.agreed ? (bs.amount ? 'Playing for ' + bs.amount + ' coins each' + (bs.byVote ? ' (voted)' : '') + '.' : 'No bet: just for fun.') : 'Waiting for ' + (g.order.length - (bs.voted || 0)) + ' vote' + (g.order.length - (bs.voted || 0) > 1 ? 's' : '') + '.'));
  return box;
}
function card(g) {
  const t = el('table', 'gcard'), start = g.start || 0;
  const head = el('tr'); head.appendChild(el('th', null, ''));
  for (let h = start; h < start + g.holes; h++) head.appendChild(el('th', h === g.hole && g.phase === 'play' ? 'now' : null, String(h + 1)));
  head.appendChild(el('th', null, 'Tot'));
  const par = el('tr', 'par'); par.appendChild(el('td', null, 'Par'));
  for (let h = start; h < start + g.holes; h++) par.appendChild(el('td', null, String(C.holes[h].par)));
  par.appendChild(el('td', null, String(parOf(g))));
  t.append(head, par);
  for (const u of g.order) {
    const p = g.p[u], tr = el('tr');
    const nm = el('td', 'gname', p.name + (p.out ? ' (out)' : '') + (g.winners && g.winners.includes(u) ? ' 🏆' : '')); nm.style.color = COLORS[p.c % 4];
    tr.appendChild(nm);
    for (let h = start; h < start + g.holes; h++) { const s = strokesOf(p, h); const td = el('td', null, s ? String(s) : '–'); if (s && s < C.holes[h].par) td.className = 'under'; else if (s > C.holes[h].par) td.className = 'over'; tr.appendChild(td); }
    tr.appendChild(el('td', 'tot', String(totalOf(p))));
    t.appendChild(tr);
  }
  return t;
}

window.GOLF = { openMenu, open: () => { panelOpen = true; render(); }, simulate: (...a) => simulate(...a), _state: () => game, _shoot: (pow) => shoot(pow), _aim: (y, c) => { if (y !== undefined) aimYaw = y; if (c) club = c; }, clubs: CLUBS };
let inited = false;
function init() { if (inited || !$('stage')) return; inited = true; buildPanel(); start(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
