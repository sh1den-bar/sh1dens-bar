/* SH1DEN'S — no-limit Texas Hold'em at the card room table.
   The host's device runs the table (shuffles, deals and settles), so nobody can see anyone else's cards:
   each player's two cards are written where only that player (and the hosts) can read them. Chips are free play money. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR;
const SEATS = 5, SB = 10, BB = 20, TURN_MS = 30000, NEXT_MS = 7000;
const CHIPS_PER_COIN = 10, BUYINS = [10, 50, 100];   // a buy-in in gold coins; chips are cashed back to coins when you leave
const RANKS = '23456789TJQKA', SUITS = 'shdc';
const SUIT_CH = { s: '♠', h: '♥', d: '♦', c: '♣' };
let db = null, st = null, joins = {}, myHand = null, engineOn = false, wired = false, actK = 0;

// ---------------------------------------------------------------- hand evaluation (best five of seven)
function score5(cards) {
  const r = cards.map((c) => RANKS.indexOf(c[0])).sort((a, b) => b - a);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const uniq = [...new Set(r)];
  let straight = -1;
  if (uniq.length === 5) { if (r[0] - r[4] === 4) straight = r[0]; else if (r[0] === 12 && r[1] === 3) straight = 3; }
  const cnt = {}; for (const x of r) cnt[x] = (cnt[x] || 0) + 1;
  const groups = Object.entries(cnt).map(([k, n]) => [n, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = groups.map((g) => g[1]);
  if (straight >= 0 && flush) return [8, straight];
  if (groups[0][0] === 4) return [7, ...kick];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...kick];
  if (flush) return [5, ...r];
  if (straight >= 0) return [4, straight];
  if (groups[0][0] === 3) return [3, ...kick];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...kick];
  if (groups[0][0] === 2) return [1, ...kick];
  return [0, ...r];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function best7(cards) {
  let best = null;
  for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
    const five = cards.filter((_, i) => i !== a && i !== b);
    const s = score5(five); if (!best || cmp(s, best) > 0) best = s;
  }
  return best;
}
const HAND_NAMES = ['high card', 'a pair', 'two pair', 'three of a kind', 'a straight', 'a flush', 'a full house', 'four of a kind', 'a straight flush'];
const split = (s) => (s ? s.match(/.{2}/g) : []) || [];

// ---------------------------------------------------------------- the dealer (runs on one host's device)
let deck = [], holes = {};
const now = () => (NET().now ? NET().now() : Date.now());
function shuffle() {
  const d = []; for (const r of RANKS) for (const s of SUITS) d.push(r + s);
  const rnd = new Uint32Array(d.length); crypto.getRandomValues(rnd);
  for (let i = d.length - 1; i > 0; i--) { const j = rnd[i] % (i + 1); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const seatKeys = () => Array.from({ length: SEATS }, (_, i) => 's' + i);
function nextSeat(S, from, ok) {
  for (let k = 1; k <= SEATS; k++) { const i = (from + k + SEATS) % SEATS; const p = S.seats['s' + i]; if (p && ok(p)) return i; }
  return -1;
}
const live = (p) => p.st === 'in' || p.st === 'allin';
function push(S) { S.t = NET().ts(); S.eng = NET().uid; st = S; return db.ref('games/poker').set(S).catch(() => say("Couldn't update the table. The room's Firebase rules may need updating.")); }
function say(t) { const m = $('pokerMsg'); if (m) m.textContent = t || ''; }
// bring the seats in line with who has joined: newcomers sit down with 1000 chips, leavers are folded and removed
// pay a player's chips back to their gold coins (only the dealer device, a host, does this)
function payout(p) {
  const coins = Math.floor((p.stack || 0) / CHIPS_PER_COIN);
  if (db) db.ref('games/pokerjoin/' + p.uid).remove().catch(() => { });
  if (!db || coins <= 0) return;
  db.ref('coins/' + p.uid + '/n').transaction((n) => (n || 0) + coins).catch(() => { });
  if (NET().say) NET().say('♠ ' + p.name + ' cashes out ' + coins + ' coins');
}
function syncSeats(S) {
  S.seats = S.seats || {};
  for (const k of seatKeys()) {
    const p = S.seats[k];
    if (p && !Object.values(joins).some((j) => j.uid === p.uid)) {
      if (S.stage && S.stage !== 'wait' && live(p)) { p.st = 'fold'; p.gone = true; } else { payout(p); delete S.seats[k]; }
    }
  }
  const taken = new Set(Object.values(S.seats).map((p) => p.uid));
  for (const j of Object.values(joins).sort((a, b) => (a.t || 0) - (b.t || 0))) {
    if (taken.has(j.uid)) continue;
    let k = 's' + j.seat; if (S.seats[k]) { const f = seatKeys().find((x) => !S.seats[x]); if (!f) continue; k = f; }
    S.seats[k] = { uid: j.uid, name: j.name, stack: (BUYINS.includes(j.buy) ? j.buy : 0) * CHIPS_PER_COIN, bet: 0, inv: 0, st: 'sit' }; taken.add(j.uid);
  }
}
function startHand() {
  const S = JSON.parse(JSON.stringify(st || {}));
  syncSeats(S);
  for (const k of seatKeys()) { const p = S.seats[k]; if (!p) continue; if (p.gone || p.stack <= 0) { payout(p); delete S.seats[k]; continue; } p.bet = 0; p.inv = 0; p.acted = false; p.st = 'in'; }
  delete S.show; S.board = ''; S.pot = 0; S.msg = '';
  const n = Object.keys(S.seats).length;
  if (n < 2) { S.stage = 'wait'; S.toAct = -1; S.msg = 'Waiting for players (2 to start)'; return push(S); }
  S.hand = (S.hand || 0) + 1;
  S.btn = nextSeat(S, S.btn === undefined ? -1 : S.btn, () => true);
  const heads = n === 2;
  const sb = heads ? S.btn : nextSeat(S, S.btn, () => true), bb = nextSeat(S, sb, () => true);
  const post = (i, amt) => { const p = S.seats['s' + i]; const a = Math.min(amt, p.stack); p.stack -= a; p.bet += a; p.inv += a; if (!p.stack) p.st = 'allin'; };
  post(sb, SB); post(bb, BB);
  S.cur = BB; S.minR = BB; S.stage = 'preflop';
  deck = shuffle(); holes = {};
  const upd = {};
  for (const k of seatKeys()) { const p = S.seats[k]; if (!p) continue; holes[p.uid] = deck.pop() + deck.pop(); upd['pokerhands/' + p.uid] = { h: S.hand, c: holes[p.uid] }; }
  db.ref().update(upd).catch(() => say("Couldn't deal. The room's Firebase rules may need updating."));
  S.toAct = nextSeat(S, bb, (p) => p.st === 'in');
  S.dl = now() + TURN_MS;
  S.msg = 'Hand #' + S.hand + ' · blinds ' + SB + '/' + BB;
  if (S.toAct < 0) return runOut(S);
  return push(S);
}
function settleIfDone(S) {
  const inHand = Object.values(S.seats).filter(live);
  if (inHand.length === 1) {
    const w = inHand[0], pot = Object.values(S.seats).reduce((a, p) => a + p.inv, 0);
    w.stack += pot; S.pot = 0; for (const p of Object.values(S.seats)) p.bet = 0;
    S.stage = 'done'; S.toAct = -1; S.msg = w.name + ' takes ' + pot + ' (everyone folded)';
    finish(S); return true;
  }
  return false;
}
function roundDone(S) {
  const act = Object.values(S.seats).filter((p) => p.st === 'in');
  return act.every((p) => p.acted && p.bet === S.cur) || (act.length <= 1 && act.every((p) => p.bet >= S.cur));
}
function nextStreet(S) {
  for (const p of Object.values(S.seats)) { S.pot += p.bet; p.bet = 0; p.acted = false; }
  S.cur = 0; S.minR = BB;
  const b = split(S.board);
  if (S.stage === 'preflop') { deck.pop(); b.push(deck.pop(), deck.pop(), deck.pop()); S.stage = 'flop'; }
  else if (S.stage === 'flop') { deck.pop(); b.push(deck.pop()); S.stage = 'turn'; }
  else if (S.stage === 'turn') { deck.pop(); b.push(deck.pop()); S.stage = 'river'; }
  else return showdown(S);
  S.board = b.join('');
  const canAct = Object.values(S.seats).filter((p) => p.st === 'in');
  if (canAct.length <= 1) return nextStreet(S);
  S.toAct = nextSeat(S, S.btn, (p) => p.st === 'in'); S.dl = now() + TURN_MS;
  return push(S);
}
function runOut(S) { while (S.stage !== 'done') { if (nextStreet(S) === 'done') break; if (S.stage === 'done') break; } }
function showdown(S) {
  for (const p of Object.values(S.seats)) { S.pot += p.bet; p.bet = 0; }
  const board = split(S.board);
  const all = Object.values(S.seats);
  const contenders = all.filter(live).map((p) => ({ p, s: best7(board.concat(split(holes[p.uid]))) }));
  S.show = {}; for (const c of contenders) S.show[c.p.uid] = holes[c.p.uid];
  // side pots, level by level
  const levels = [...new Set(all.map((p) => p.inv).filter((v) => v > 0))].sort((a, b) => a - b);
  let prev = 0; const lines = [];
  for (const lv of levels) {
    const amt = all.reduce((a, p) => a + Math.min(p.inv, lv) - Math.min(p.inv, prev), 0);
    const elig = contenders.filter((c) => c.p.inv >= lv);
    prev = lv; if (!amt || !elig.length) continue;
    let top = elig[0].s; for (const c of elig) if (cmp(c.s, top) > 0) top = c.s;
    const win = elig.filter((c) => cmp(c.s, top) === 0);
    const share = Math.floor(amt / win.length);
    win.forEach((c, i) => { c.p.stack += share + (i === 0 ? amt - share * win.length : 0); });
    lines.push(win.map((c) => c.p.name).join(' & ') + ' win' + (win.length === 1 ? 's ' : ' ') + amt + ' with ' + HAND_NAMES[top[0]]);
  }
  S.pot = 0; S.stage = 'done'; S.toAct = -1; S.msg = lines.join(' · ');
  finish(S);
  return 'done';
}
function finish(S) {
  push(S);
  if (NET().say && S.msg) NET().say('♠ ' + S.msg);
  setTimeout(() => { if (engineOn) startHand(); }, NEXT_MS);
}
function act(uid, a, amt) {
  const S = JSON.parse(JSON.stringify(st));
  if (!S || S.toAct < 0 || !['preflop', 'flop', 'turn', 'river'].includes(S.stage)) return;
  const p = S.seats['s' + S.toAct]; if (!p || p.uid !== uid) return;
  const owe = S.cur - p.bet;
  if (a === 'fold') p.st = 'fold';
  else if (a === 'check') { if (owe > 0) return; }
  else if (a === 'call') { const c = Math.min(owe, p.stack); p.stack -= c; p.bet += c; p.inv += c; }
  else if (a === 'raise' || a === 'allin') {
    let to = a === 'allin' ? p.bet + p.stack : Math.floor(+amt || 0);
    to = Math.min(to, p.bet + p.stack);
    if (to <= S.cur) { const c = Math.min(owe, p.stack); p.stack -= c; p.bet += c; p.inv += c; }
    else {
      if (to < S.cur + S.minR && to < p.bet + p.stack) to = S.cur + S.minR;
      const add = to - p.bet; p.stack -= add; p.bet = to; p.inv += add;
      if (to - S.cur >= S.minR) S.minR = to - S.cur;
      S.cur = to;
      for (const q of Object.values(S.seats)) if (q !== p && q.st === 'in') q.acted = false;
    }
  } else return;
  if (p.st === 'in' && p.stack === 0) p.st = 'allin';
  p.acted = true;
  if (settleIfDone(S)) return;
  if (roundDone(S)) {
    const canAct = Object.values(S.seats).filter((q) => q.st === 'in');
    if (canAct.length <= 1 && Object.values(S.seats).filter(live).length > 1) { runOut(S); return; }
    nextStreet(S); return;
  }
  S.toAct = nextSeat(S, S.toAct, (q) => q.st === 'in'); S.dl = now() + TURN_MS;
  push(S);
}
const seenActs = {};
function engineStart() {
  if (!db || !NET().isAdmin) return;
  engineOn = true; renderPanel();
  db.ref('games/pokeract').on('child_added', onAct); db.ref('games/pokeract').on('child_changed', onAct);
  // a fresh dealer voids whatever hand was running and gives the chips back
  const S = JSON.parse(JSON.stringify(st || {}));
  if (S.seats) for (const p of Object.values(S.seats)) { p.stack += p.inv || 0; p.inv = 0; p.bet = 0; }
  S.stage = 'wait'; st = S; startHand();
}
function engineStop() {
  engineOn = false;
  db.ref('games/pokeract').off();
  const S = JSON.parse(JSON.stringify(st || {}));
  if (S.seats) for (const p of Object.values(S.seats)) { p.stack += p.inv || 0; p.inv = 0; p.bet = 0; payout(p); }
  S.seats = {};
  S.stage = 'closed'; S.toAct = -1; S.board = ''; S.pot = 0; delete S.show; S.msg = 'The table is closed';
  push(S); renderPanel();
}
function onAct(s) {
  const v = s.val(); if (!v || !engineOn) return;
  const key = s.key + ':' + v.k;
  if (seenActs[key]) return; seenActs[key] = 1;
  if (st && v.n === st.hand) act(s.key, v.a, v.amt);
}
setInterval(() => {
  if (!engineOn || !st) return;
  if (st.toAct >= 0 && now() > st.dl) { const p = st.seats['s' + st.toAct]; if (p) act(p.uid, st.cur > p.bet ? 'fold' : 'check'); }
  else if (st.stage === 'wait' && Object.keys(joins).length >= 2) startHand();
}, 1000);

// ---------------------------------------------------------------- players
function myUid() { return NET().uid; }
function mySeat() { if (!st || !st.seats) return null; for (const k of seatKeys()) if (st.seats[k] && st.seats[k].uid === myUid()) return { i: +k.slice(1), p: st.seats[k] }; return null; }
async function join() {
  if (!db) { say('The room is offline.'); return; }
  if (!BAR().hasCharacter()) { BAR().openCreator(); return; }
  if (!BAR().cardOpen() && !NET().isAdmin) { say('The card room is closed. Poker happens when sh1den is in.'); return; }
  const used = new Set(Object.values((st && st.seats) || {}).map((p) => p.uid));
  const usedSeats = new Set(Object.keys((st && st.seats) || {}).map((k) => +k.slice(1)).concat(Object.values(joins).filter((j) => j.uid !== myUid()).map((j) => j.seat)));
  const seat = Array.from({ length: SEATS }, (_, i) => i).find((i) => !usedSeats.has(i));
  if (seat === undefined && !used.has(myUid())) { say('The table is full.'); return; }
  if (joins[myUid()]) { say("You're already at the table."); return; }
  const buy = +$('pkBuy').value || BUYINS[0];
  const have = window.EXTRAS ? window.EXTRAS.myCoins() : 0;
  if (have < buy) { say('You need ' + buy + ' gold coins to buy in (you have ' + have + ').'); return; }
  const upd = {};
  upd['games/pokerjoin/' + myUid()] = { name: NET().myName(), seat: seat || 0, buy, t: NET().ts() };
  upd['coins/' + myUid() + '/n'] = have - buy;
  upd['coins/' + myUid() + '/s'] = (window.EXTRAS ? window.EXTRAS.mySpent() : 0) + buy;
  try { await db.ref().update(upd); BAR().sitAt('poker-seat-' + (seat || 0)); say('Bought in for ' + buy + ' coins (' + buy * CHIPS_PER_COIN + ' chips). You get your chips back as coins when you leave.'); }
  catch (e) { say("Couldn't sit down. The room's Firebase rules may need updating."); }
}
async function leave() { if (db) await db.ref('games/pokerjoin/' + myUid()).remove().catch(() => { }); }
function send(a, amt) {
  if (!db || !st) return;
  db.ref('games/pokeract/' + myUid()).set({ a, amt: amt || 0, n: st.hand, k: ++actK + Math.floor(Math.random() * 1e6) * 100, t: NET().ts() }).catch(() => say("Couldn't send that."));
}

// ---------------------------------------------------------------- the panel
function cardEl(c, hidden) {
  const s = document.createElement('span'); s.className = 'pcard' + (hidden ? ' back' : '') + (c && (c[1] === 'h' || c[1] === 'd') ? ' red' : '');
  s.textContent = hidden || !c ? '' : (c[0] === 'T' ? '10' : c[0]) + SUIT_CH[c[1]];
  return s;
}
function renderPanel() {
  const P = $('pokerPanel'); if (!P) return;
  const S = st || {};
  BAR().setPokerState({ board: split(S.board), pot: (S.pot || 0) + Object.values(S.seats || {}).reduce((a, p) => a + (p.bet || 0), 0), players: Object.keys(S.seats || {}).length, stage: S.stage === 'wait' || S.stage === 'closed' ? '' : S.stage });
  if (P.hidden) return;
  const live = S.eng && S.t && S.stage !== 'closed';
  $('pokerStatus').textContent = !db ? 'The room is offline.' : !BAR().cardOpen() && !NET().isAdmin ? 'Closed tonight. Poker happens when sh1den is in.' : !live ? 'Waiting for the dealer. A host opens the table.' : (S.msg || '');
  const bd = $('pokerBoard'); bd.textContent = '';
  const b = split(S.board); for (let i = 0; i < 5; i++) bd.appendChild(cardEl(b[i], !b[i]));
  const pot = (S.pot || 0) + Object.values(S.seats || {}).reduce((a, p) => a + (p.bet || 0), 0);
  $('pokerPot').textContent = pot ? 'Pot ' + pot : '';
  const ul = $('pokerSeats'); ul.textContent = '';
  for (const k of seatKeys()) {
    const p = (S.seats || {})[k]; const li = document.createElement('li');
    if (!p) { li.className = 'empty'; li.textContent = 'Seat ' + (+k.slice(1) + 1) + ' · open'; ul.appendChild(li); continue; }
    const turn = S.toAct === +k.slice(1);
    li.className = (turn ? 'turn ' : '') + (p.st === 'fold' ? 'folded' : '');
    const nm = document.createElement('b'); nm.textContent = p.name + (S.btn === +k.slice(1) ? ' (D)' : '');
    const info = document.createElement('span'); info.textContent = ' ' + p.stack + ' chips' + (p.bet ? ' · bet ' + p.bet : '') + (p.st === 'fold' ? ' · folded' : p.st === 'allin' ? ' · all in' : '');
    li.append(nm, info);
    const shown = S.show && S.show[p.uid];
    if (shown) { const h = document.createElement('span'); h.className = 'shown'; for (const c of split(shown)) h.appendChild(cardEl(c)); li.appendChild(h); }
    ul.appendChild(li);
  }
  // your cards and your options
  const me = mySeat();
  const hand = $('pokerHand'); hand.textContent = '';
  if (me && myHand && myHand.h === S.hand && S.stage !== 'wait') for (const c of split(myHand.c)) hand.appendChild(cardEl(c));
  const myTurn = me && S.toAct === me.i && live;
  const owe = me ? Math.max(0, (S.cur || 0) - me.p.bet) : 0;
  $('pkFold').disabled = $('pkCall').disabled = $('pkRaise').disabled = $('pkAll').disabled = !myTurn;
  $('pkCall').textContent = owe ? 'Call ' + Math.min(owe, me ? me.p.stack : 0) : 'Check';
  const minTo = (S.cur || 0) + (S.minR || BB);
  const ri = $('pkAmt'); ri.min = minTo; if (!ri.value || +ri.value < minTo) ri.value = minTo;
  if (me) ri.max = me.p.bet + me.p.stack;
  $('pkTimer').textContent = myTurn && S.dl ? 'Your turn · ' + Math.max(0, Math.ceil((S.dl - now()) / 1000)) + 's' : '';
  const joined = !!joins[myUid()];
  $('pokerJoin').hidden = joined; $('pkBuy').hidden = joined; $('pokerLeave').hidden = !joined;
  $('pokerActions').hidden = !me;
  const eng = $('pokerEngine');
  eng.hidden = !NET().isAdmin;
  eng.textContent = engineOn ? 'Close the table (stop dealing)' : 'Open the table (deal from this device)';
}
function open() { const P = $('pokerPanel'); if (!P) return; P.hidden = false; init(); renderPanel(); }
function init() {
  if (!wired) {
    wired = true;
    $('pokerClose').onclick = () => { $('pokerPanel').hidden = true; };
    $('pokerJoin').onclick = join; $('pokerLeave').onclick = leave;
    $('pkFold').onclick = () => send('fold');
    $('pkCall').onclick = () => { const me = mySeat(); send(me && (st.cur || 0) > me.p.bet ? 'call' : 'check'); };
    $('pkRaise').onclick = () => send('raise', +$('pkAmt').value);
    $('pkAll').onclick = () => send('allin');
    $('pokerEngine').onclick = () => { if (engineOn) engineStop(); else engineStart(); };
    setInterval(renderPanel, 1000);
  }
  if (db || !NET().online || !NET().db) return;
  db = NET().db();
  db.ref('games/poker').on('value', (s) => { if (!engineOn) st = s.val(); renderPanel(); });
  db.ref('games/pokerjoin').on('value', (s) => {
    joins = {}; s.forEach((c) => { const v = c.val() || {}; joins[c.key] = { uid: c.key, name: v.name, seat: +v.seat || 0, t: v.t || 0, buy: +v.buy || 0 }; });
    if (engineOn && st && (st.stage === 'wait' || st.stage === 'done' || st.stage === 'closed')) { const S = JSON.parse(JSON.stringify(st)); syncSeats(S); push(S); }
    renderPanel();
  });
  db.ref('pokerhands/' + myUid()).on('value', (s) => { myHand = s.val(); renderPanel(); });
}
window.POKER = { open, adminChanged() { init(); renderPanel(); }, _score: best7 };
// connect as soon as the room is up, so the TV overlay shows the board even with the panel closed
const boot = setInterval(() => { if (NET().online && NET().db && NET().db()) { clearInterval(boot); init(); } }, 1500);
})();
