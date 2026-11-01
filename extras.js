/* SH1DEN'S — sh1den coins, rewards, the leaderboard plaque, random events, the restroom blackout and the private car lot. */
(function () {
'use strict';
const cfg = window.BAR_CONFIG || {};
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR;
// what coins buy inside the bar (kinds: prio = a video straight onto the cinema TV, event = a bar event for everyone, perk = a lasting unlock)
const REWARDS = cfg.rewards || [
  { id: 'prio', kind: 'prio', name: 'Priority video: your YouTube link plays on the cinema TV right now', cost: 150 },
  { id: 'round', kind: 'event', name: 'Buy a round for the whole bar', cost: 200 },
  { id: 'overdrive', kind: 'event', name: 'Dance floor overdrive', cost: 120 },
  { id: 'storm', kind: 'event', name: 'Make it storm outside', cost: 80 },
  { id: 'gold', kind: 'perk', name: 'The gold tuxedo: a shining gold suit, yours for good', cost: 1000000 }
];
const VIP_SPEND = cfg.vipAfterSpending || 1000;
const YT = /(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
let perks = {};
const spent = () => (mine && +mine.s) || 0;
const EVENTS = [['siren', 'Siren drive-by'], ['storm', 'Thunderstorm'], ['eyes', 'Paintings watch'], ['round', 'Round on the house'], ['coin', 'Gold coin hint'],
  ['phone', 'Phone rings'], ['cat', 'Black cat'], ['guest', 'Mystery guest'], ['overdrive', 'Dance floor overdrive'], ['blackout', 'Power cut (restroom)']];
const COIN_MS = 600000, PASSIVE_MS = 300000, LOCK_MS = 300000;

let db = null, mine = null, board = [], allCoins = [], redeems = [], cars = {}, coinClaim = null, lastBlackout = null, joinedAt = Date.now();
let started = false, offlineMode = false;
const hash32 = (n) => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; };
const now = () => (NET().now ? NET().now() : Date.now());
const ts = () => NET().ts();
const myUid = () => NET().uid;
const hasChar = () => !!(NET().charOf && NET().charOf(myUid()));
const isAdmin = () => !!NET().isAdmin;
const actingHost = () => isAdmin() && (NET().myName && NET().myName() || '').toLowerCase() === 'sh1denfps';
function msg(t) { const m = $('coinsMsg'); if (m) m.textContent = t || ''; }

// ---------------------------------------------------------------- spooky opt-out (stored on this device)
let spooky = true;
try { spooky = localStorage.getItem('sh1den-bar-spooky') !== 'off'; } catch (e) { }

// ---------------------------------------------------------------- start once the room is connected
function start() {
  if (started || !NET().online || !NET().db) return;
  db = NET().db(); if (!db) return;
  started = true; joinedAt = Date.now();
  BAR().setSpooky(spooky);
  db.ref('coins').orderByChild('n').limitToLast(11).on('value', (s) => {
    const l = []; s.forEach((c) => { const v = c.val() || {}; l.push({ uid: c.key, name: v.name, n: +v.n || 0 }); });
    board = l.filter((c) => (c.name || '').toLowerCase() !== 'sh1denfps').sort((a, b) => b.n - a.n); BAR().setLeaderboard(board); renderPanel();
  });
  db.ref('coins/' + myUid()).on('value', (s) => {
    mine = s.val(); renderHud(); renderPanel(); renderCard(); autoTux();
    const vipNow = spent() >= VIP_SPEND;
    NET().setVipMember(vipNow); BAR().setVipMember(vipNow);
  });
  db.ref('perks').on('value', (s) => { perks = s.val() || {}; BAR().setPerks(perks); renderPanel(); renderGoldBtn(); renderCard(); autoTux(); });
  db.ref('events/coin').on('value', (s) => { coinClaim = s.val(); updateCoin(); });
  db.ref('events/now').on('value', (s) => {
    const v = s.val(); if (!v || !v.k || !v.t) return;
    if (now() - v.t < 20000 && v.t > joinedAt + (now() - Date.now()) - 2000 && v.k !== 'blackout') BAR().runEvent(v.k, v.seed || 1);
  });
  db.ref('events/blackout').on('value', (s) => {
    const v = s.val(); lastBlackout = v;
    if (!v || !v.t) return;
    const fresh = now() - v.t < 15000;
    if (fresh) BAR().runEvent('blackout', v.t, { v: v.v, vn: v.vn });
    if (v.v) BAR().setVictim({ uid: v.v, until: v.t + 5500 + LOCK_MS });
  });
  db.ref('cars').on('value', (s) => { cars = s.val() || {}; updateLot(); renderCarPicker(); ownerCar(); });
  setInterval(tick, 5000); tick();
  setInterval(hostTick, 60000);
  adminChanged();
}
function tick() {
  if (!db) return;
  passive(); updateCoin(); updateLot(); renderHud();
}
// ---------------------------------------------------------------- earning: one coin every 5 minutes inside, AFK counts
let busy = false;
async function passive() {
  if (busy || !hasChar() || NET().isBanned()) return;
  const name = NET().myName();
  busy = true;
  try {
    const keepS = (o) => { if (mine && mine.s !== undefined) o.s = mine.s; if (mine && mine.m !== undefined) o.m = mine.m; return o; };
    if (!mine) { await db.ref('coins/' + myUid()).set({ n: 0, name, t: ts(), c: 0, s: 0 }); }
    else if (mine.s === undefined) { await db.ref('coins/' + myUid()).set({ n: mine.n, name: mine.name, t: mine.t, c: mine.c || 0, s: 0 }); }
    else if (mine.name !== name) { await db.ref('coins/' + myUid()).set(keepS({ n: mine.n, name, t: mine.t, c: mine.c || 0 })); }
    else if (now() >= (mine.t || 0) + PASSIVE_MS) { const o = keepS({ n: (mine.n || 0) + 1, name, t: ts(), c: mine.c || 0 }); o.m = (mine.m || 0) + 5; await db.ref('coins/' + myUid()).set(o); }
  } catch (e) { /* the server clock may be a hair behind; try again next tick */ }
  busy = false;
}
// ---------------------------------------------------------------- the gold coin of the moment
const slotNow = () => Math.floor(now() / COIN_MS);
function updateCoin() {
  if (offlineMode) return;
  const slot = slotNow();
  const claimed = coinClaim && coinClaim.s >= slot;
  // it turns up a minute into its ten-minute window
  if (claimed || now() - slot * COIN_MS < 60000) { BAR().setCoin(null); return; }
  BAR().setCoin({ slot, spot: hash32(slot * 13 + 5) % BAR().coinSpots() });
}
async function claimCoin() {
  if (!db) { BAR().toast('The room is offline.'); return; }
  if (!hasChar()) { BAR().openCreator(); return; }
  if (BAR().isLocked()) return;
  const slot = slotNow();
  if (coinClaim && coinClaim.s >= slot) { BAR().toast('Too slow, someone got it.'); updateCoin(); return; }
  try { await db.ref('events/coin').set({ s: slot, u: myUid(), t: ts() }); }
  catch (e) { BAR().toast('Too slow, someone got it.'); return; }
  try {
    const cur = (await db.ref('coins/' + myUid()).once('value')).val() || { n: 0, t: 0, c: 0 };
    await db.ref('coins/' + myUid()).set(Object.assign({ n: (cur.n || 0) + 5, name: NET().myName(), t: cur.t, c: slot }, cur.s !== undefined ? { s: cur.s } : {}, cur.m !== undefined ? { m: cur.m } : {}));
    BAR().toast('A gold coin! +5');
    NET().say('picked up a gold coin 🪙');
  } catch (e) { BAR().toast("Couldn't bank the coin. The room's Firebase rules may need updating."); }
}
// ---------------------------------------------------------------- spending
async function redeem(r) {
  if (!db || !hasChar()) { msg('Create a character first.'); return; }
  const have = (mine && mine.n) || 0;
  if (have < r.cost) { msg('You need ' + (r.cost - have).toLocaleString() + ' more coins for that.'); return; }
  const note = ($('redeemNote').value || '').trim().slice(0, 80);
  const yt = note.match(YT);
  if (r.kind === 'prio' && !yt) { msg('Paste a YouTube link in the box above first.'); return; }
  if (r.kind === 'perk' && perks[myUid()] && perks[myUid()][r.id]) { msg('You already have that.'); return; }
  if (mine.s === undefined) { try { await db.ref('coins/' + myUid() + '/s').set(0); mine.s = 0; } catch (e) { } }
  const id = db.ref('redeems').push().key, upd = {};
  upd['coins/' + myUid() + '/n'] = have - r.cost;
  upd['coins/' + myUid() + '/s'] = spent() + r.cost;
  upd['redeems/' + id] = { uid: myUid(), name: NET().myName(), r: r.id, cost: r.cost, note, t: ts() };
  if (r.kind === 'perk') upd['perks/' + myUid() + '/' + r.id] = true;
  try { await db.ref().update(upd); }
  catch (e) { msg("Couldn't redeem that. The room's Firebase rules may need updating."); return; }
  $('redeemNote').value = '';
  if (r.kind === 'prio') {
    const ok = await NET().playPriority(yt[0], id);
    msg(ok ? 'Your video is on the cinema TV now.' : 'Paid, but the TV didn’t switch. A host can refund it.');
    if (ok) NET().say('🪙 paid ' + r.cost + ' coins to put their video on the TV');
  } else if (r.kind === 'event') {
    const e = {}; e['events/now'] = { k: r.id, t: ts(), by: NET().myName(), seed: Math.floor(Math.random() * 1e6), rid: id }; e['events/used/' + id] = true;
    try { await db.ref().update(e); msg('Done!'); NET().say('🪙 ' + r.name.toLowerCase() + '!'); }
    catch (err) { msg('Paid, but it didn’t start. A host can refund it.'); }
  } else {
    msg('Yours now: ' + r.name.split(':')[0] + '.'); NET().say('🪙 just bought ' + r.name.split(':')[0].toLowerCase() + '!');
  }
}
// ---------------------------------------------------------------- the private car lot: an admin's car is only parked while they're here
function updateLot() {
  if (!BAR() || !BAR().setLotCars) return;
  const list = [];
  const hostCar = Object.entries(cars).find(([, c]) => c && (c.name || '').toLowerCase() === 'sh1denfps');
  const hostHere = offlineMode || (NET().hostOnline && NET().hostOnline());
  if (hostHere) {
    const c = hostCar ? hostCar[1] : { style: 'coupe', color: 0 };
    list.push({ uid: hostCar ? hostCar[0] : 'host', style: c.style, color: +c.color || 0, bay: 0, name: 'sh1denfps' });
  }
  const others = Object.entries(cars).filter(([uid, c]) => c && (c.name || '').toLowerCase() !== 'sh1denfps').sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
  others.forEach(([uid, c], i) => { if (i < 7 && NET().isOnline && NET().isOnline(uid)) list.push({ uid, style: c.style, color: +c.color || 0, bay: i + 1, name: c.name || '' }); });
  BAR().setLotCars(list);
}
// ---------------------------------------------------------------- the daily blackout: only ever fired by the host's own device
async function fireBlackout() {
  if (!db || !isAdmin()) return;
  const people = NET().onlineList().filter((p) => p.uid !== myUid() && !p.o && !(typeof p.s === 'string' && p.s.startsWith('vip')) && !p.h && NET().charOf(p.uid));
  const pick = people.length ? people[Math.floor(Math.random() * people.length)] : null;
  const c = pick && NET().charOf(pick.uid);
  try { await db.ref('events/blackout').set({ day: Math.floor(now() / 86400000), t: ts(), v: pick ? pick.uid : '', vn: c ? c.name : '' }); }
  catch (e) { BAR().toast("Couldn't cut the power. The room's Firebase rules may need updating."); }
}
function hostTick() {
  if (!db || !actingHost()) return;
  const day = Math.floor(now() / 86400000);
  if (lastBlackout && lastBlackout.day === day) return;
  if (Date.now() - joinedAt < 20 * 60000) return;
  if (Math.random() < 1 / 90) fireBlackout();
}
async function triggerEvent(k) {
  if (!db || !isAdmin()) return;
  if (k === 'blackout') { fireBlackout(); return; }
  try { await db.ref('events/now').set({ k, t: ts(), by: NET().myName() || 'host', seed: Math.floor(Math.random() * 1e6) }); }
  catch (e) { BAR().toast("Couldn't start that. The room's Firebase rules may need updating."); }
}

// ---------------------------------------------------------------- UI
// ---------------------------------------------------------------- membership: hours in the bar earn tuxedos, shown on your business card
const TIERS = [[0, '', 'Regular'], [100, 'silver', 'Silver'], [250, 'gold', 'Gold'], [500, 'platinum', 'Platinum'], [750, 'emerald', 'Emerald'], [1000, 'diamond', 'Diamond']];
const TUX_NAMES = { silver: 'Silver tuxedo', gold: 'Gold tuxedo', platinum: 'Platinum tuxedo', emerald: 'Emerald tuxedo', diamond: 'Diamond tuxedo', ruby: 'Ruby tuxedo' };
const hours = () => ((mine && +mine.m) || 0) / 60;
const isOwner = () => (NET().myName && (NET().myName() || '').toLowerCase() === 'sh1denfps') && isAdmin();
function tierOf(h) { let t = TIERS[0]; for (const x of TIERS) if (h >= x[0]) t = x; return t; }
function unlockedTux() {
  if (isAdmin()) return Object.keys(TUX_NAMES).filter((k) => k !== 'ruby' || isOwner());
  const h = hours(), out = TIERS.filter((x) => x[1] && h >= x[0]).map((x) => x[1]);
  if (perks[myUid()] && perks[myUid()].gold && !out.includes('gold')) out.push('gold');
  return out;
}
// when you reach a new level you're put in its suit, unless you'd picked something else
let lastBest = null;
function autoTux() {
  if (!db || !mine || isAdmin()) return;
  const best = tierOf(hours())[1];
  if (lastBest === null) { lastBest = best; }
  const p = perks[myUid()] || {};
  if (best && best !== lastBest && (!p.wear || p.wear === lastBest)) db.ref('perks/' + myUid() + '/wear').set(best).catch(() => { });
  else if (best && !p.wear && p.wear !== 'none' && !p.gold) db.ref('perks/' + myUid() + '/wear').set(best).catch(() => { });
  lastBest = best;
}
function renderCard() {
  const card = $('bizCard'); if (!card) return;
  const named = NET().myName && NET().myName();
  card.hidden = !named;
  if (!named) return;
  const h = hours(), tier = tierOf(h), next = TIERS.find((x) => x[0] > h);
  const role = isOwner() ? 'Owner' : isAdmin() ? 'Co-owner' : tier[2] + ' member';
  $('bizName').textContent = named;
  $('bizRole').textContent = role;
  $('bizRole').className = 'bizrole ' + (isOwner() ? 'ruby' : isAdmin() ? 'co' : tier[1] || 'reg');
  $('bizHours').textContent = h >= 10 ? Math.floor(h).toLocaleString() + ' h' : h.toFixed(1) + ' h';
  $('bizCoins').textContent = ((mine && mine.n) || 0).toLocaleString() + ' 🪙';
  $('bizNext').textContent = isAdmin() ? 'Every tuxedo is yours to wear.' : next ? (next[0] - h).toFixed(1) + ' h to ' + next[2] : 'Top level reached.';
  const sel = $('bizTux'), opts = unlockedTux(), cur = (perks[myUid()] && perks[myUid()].wear) || (perks[myUid()] && perks[myUid()].gold ? 'gold' : 'none');
  const key = opts.join(',') + '|' + cur;
  if (sel.dataset.key !== key) {
    sel.dataset.key = key; sel.textContent = '';
    for (const [v, t] of [['none', 'Normal clothes']].concat(opts.map((k) => [k, TUX_NAMES[k]]))) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); }
    sel.value = opts.includes(cur) ? cur : 'none';
    sel.disabled = !opts.length;
    $('bizTuxRow').title = opts.length ? '' : 'Spend 100 hours in the bar to earn your first tuxedo';
  }
}
function wireCard() {
  const sel = $('bizTux'); if (!sel) return;
  sel.onchange = () => { if (!db) return; db.ref('perks/' + myUid() + '/wear').set(sel.value).catch(() => BAR().toast("Couldn't change your suit. The room's Firebase rules may need updating.")); };
  setInterval(renderCard, 30000);
}
function renderHud() {
  const b = $('coinBtnN'); if (!b) return;
  b.textContent = actingHost() ? '∞' : ((mine && mine.n) || 0).toLocaleString();
  const left = mine ? Math.max(0, (mine.t || 0) + PASSIVE_MS - now()) : PASSIVE_MS;
  const nx = $('coinNext'); if (nx) nx.textContent = hasChar() ? 'Next coin for hanging out in ' + Math.ceil(left / 60000) + ' min' : 'Make a character to start earning';
}
function renderPanel() {
  const p = $('coinsPanel'); if (!p || p.hidden) return;
  $('coinBal').textContent = actingHost() ? '∞ coins (the house)' : ((mine && mine.n) || 0).toLocaleString() + ' coins';
  const vp = $('vipProgress');
  if (vp) vp.textContent = spent() >= VIP_SPEND ? '★ VIP: you can go in the VIP lounge.' : 'Spend ' + VIP_SPEND.toLocaleString() + ' coins in total to get into the VIP lounge (' + spent().toLocaleString() + ' spent so far).';
  const rl = $('rewardList'); rl.textContent = '';
  for (const r of REWARDS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'reward';
    b.innerHTML = '<span></span><b></b>'; b.firstChild.textContent = r.name; b.lastChild.textContent = r.cost.toLocaleString() + ' 🪙';
    const owned = r.kind === 'perk' && perks[myUid()] && perks[myUid()][r.id];
    if (owned) b.lastChild.textContent = 'owned';
    b.disabled = owned || !hasChar() || ((mine && mine.n) || 0) < r.cost;
    b.onclick = () => redeem(r); rl.appendChild(b);
  }
  const lb = $('coinBoard'); lb.textContent = '';
  board.forEach((e, i) => { const li = document.createElement('li'); li.textContent = (i + 1) + '. ' + (e.name || '?') + ' — ' + e.n; lb.appendChild(li); });
  if (!board.length) { const li = document.createElement('li'); li.textContent = 'Nobody has any coins yet.'; lb.appendChild(li); }
  $('spookyChk').checked = spooky;
  renderAdmin();
}
function renderAdmin() {
  const box = $('coinAdmin'); if (!box) return;
  box.hidden = !isAdmin();
  if (!isAdmin()) return;
  const rq = $('redeemList'); rq.textContent = '';
  if (!redeems.length) { const li = document.createElement('li'); li.textContent = 'No redeems waiting.'; rq.appendChild(li); }
  for (const r of redeems) {
    const li = document.createElement('li');
    const rw = REWARDS.find((x) => x.id === r.r);
    li.textContent = (r.name || '?') + ': ' + (rw ? rw.name : r.r) + (r.note ? ' — "' + r.note + '"' : '') + ' ';
    const done = document.createElement('button'); done.type = 'button'; done.className = 'mini'; done.textContent = 'Done';
    done.onclick = () => db.ref('redeems/' + r.id).remove().catch(() => { });
    const back = document.createElement('button'); back.type = 'button'; back.className = 'mini danger'; back.textContent = 'Refund';
    back.onclick = async () => { const c = allCoins.find((x) => x.uid === r.uid); const upd = {}; upd['redeems/' + r.id] = null; if (c) upd['coins/' + r.uid + '/n'] = c.n + (r.cost || 0); await db.ref().update(upd).catch(() => { }); };
    li.append(done, back); rq.appendChild(li);
  }
  renderDonate();
}
let adminOn = false;
function adminChanged() {
  if (!db) return;
  if (isAdmin() && !adminOn) {
    adminOn = true;
    db.ref('redeems').limitToLast(30).on('value', (s) => { redeems = []; s.forEach((c) => { redeems.push(Object.assign({ id: c.key }, c.val())); }); renderPanel(); });
    db.ref('coins').orderByChild('n').limitToLast(60).on('value', (s) => { allCoins = []; s.forEach((c) => { const v = c.val() || {}; allCoins.push({ uid: c.key, name: v.name, n: +v.n || 0 }); }); allCoins.sort((a, b) => b.n - a.n); renderPanel(); });
  }
  buildHostTools();
}
// host tools: event buttons and "my car"
function buildHostTools() {
  const box = $('adminBox'); if (!box || $('hostExtras')) { renderCarPicker(); return; }
  const wrap = document.createElement('div'); wrap.id = 'hostExtras'; wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
  wrap.innerHTML = '<h3 style="margin:0">Events</h3><p>Everyone in the bar sees these. The power cut sends someone to the restroom stall for 5 minutes.</p><div class="row" id="eventBtns"></div>';
  box.appendChild(wrap);
  const cb = $('carBox');
  if (cb) cb.innerHTML = '<h3 style="margin:6px 0 0">My car</h3><p class="small">Parked out back while you\'re here. sh1den always gets bay 1.</p>' +
    '<div class="inline"><select id="carStyle" aria-label="Car"></select><select id="carColor" aria-label="Color"></select></div>' +
    '<div class="row"><button type="button" id="carSave" class="mini">Park it</button><button type="button" id="carRemove" class="mini danger">Remove my car</button></div><div class="msg" id="carMsg"></div>';
  const eb = $('eventBtns');
  for (const [k, name] of EVENTS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mini' + (k === 'blackout' ? ' danger' : ''); b.textContent = name; b.onclick = () => triggerEvent(k); eb.appendChild(b); }
  for (const [k, n] of BAR().carStyles()) { const o = document.createElement('option'); o.value = k; o.textContent = n; $('carStyle').appendChild(o); }
  BAR().carColors().forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; $('carColor').appendChild(o); });
  $('carSave').onclick = async () => {
    try { await db.ref('cars/' + myUid()).set({ style: $('carStyle').value, color: +$('carColor').value, name: NET().myName() || 'host', t: ts() }); $('carMsg').textContent = 'Parked.'; }
    catch (e) { $('carMsg').textContent = "Couldn't park it. The room's Firebase rules may need updating."; }
  };
  $('carRemove').onclick = () => db.ref('cars/' + myUid()).remove().then(() => { $('carMsg').textContent = 'Car removed.'; }).catch(() => { });
  renderCarPicker();
}
// ---------------------------------------------------------------- host window: give or take coins for anyone, kick and mute
let charList = [];
function renderDonate() {
  const sel = $('donWho'); if (!sel || !isAdmin()) return;
  const list = (NET().allChars ? NET().allChars() : []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const key = list.map((c) => c.uid).join(',');
  if (sel.dataset.key !== key) {
    const keep = sel.value; sel.dataset.key = key; sel.textContent = '';
    for (const c of list) { const o = document.createElement('option'); o.value = c.uid; o.textContent = c.name + (NET().isOnline(c.uid) ? ' · here' : ''); sel.appendChild(o); }
    if (keep) sel.value = keep;
  }
  charList = list;
  const rs = $('remWho');
  if (rs) {
    const others = list.filter((c) => c.uid !== myUid() && c.name.toLowerCase() !== 'sh1denfps'), rk = others.map((c) => c.uid).join(',');
    if (rs.dataset.key !== rk) { const keep = rs.value; rs.dataset.key = rk; rs.textContent = ''; for (const c of others) { const o = document.createElement('option'); o.value = c.uid; o.textContent = c.name + (NET().isOnline(c.uid) ? ' · here' : ''); rs.appendChild(o); } if (keep) rs.value = keep; }
  }
}
// wipe someone from the bar: character, name, coins (so the leaderboard), shop items, perks, car; kick them out, optionally ban
function wireRemove() {
  const msg = $('remMsg');
  const go = (ban) => async (e) => {
    const b = e.currentTarget, who = $('remWho').value, c = charList.find((x) => x.uid === who);
    if (!who || !c) return;
    if (!b.dataset.armed) { b.dataset.armed = '1'; const t0 = b.textContent; b.textContent = 'Click again: ' + c.name; setTimeout(() => { delete b.dataset.armed; b.textContent = t0; }, 4000); return; }
    delete b.dataset.armed; b.textContent = ban ? 'Remove & ban' : 'Remove';
    const up = {};
    for (const k of ['chars', 'coins', 'inv', 'perks', 'buffs', 'cars', 'mutes']) up[k + '/' + who] = null;
    up['names/' + c.name.toLowerCase()] = null;
    if (NET().isOnline(who)) up['kicks/' + who] = ts();
    if (ban) up['bans/' + who] = true;
    try { await db.ref().update(up); msg.textContent = c.name + (ban ? ' was removed and banned.' : ' was removed from the bar.'); renderDonate(); renderMods(); }
    catch (err) { msg.textContent = "Couldn't remove them. The room's Firebase rules may need updating."; }
  };
  $('remGo').onclick = go(false); $('remBan').onclick = go(true);
}
// the owner's car: dark metallic red, set once
function ownerCar() {
  try {
    if (!isAdmin() || (NET().myName() || '').toLowerCase() !== 'sh1denfps' || localStorage.getItem('sh1den-car-red') || !db) return;
    const c = cars[myUid()] || {};
    localStorage.setItem('sh1den-car-red', '1');
    db.ref('cars/' + myUid()).set({ style: c.style || 'roadster', color: 14, name: NET().myName(), t: ts() }).catch(() => localStorage.removeItem('sh1den-car-red'));
  } catch (e) { }
}
async function adjustCoins(target, f, label) {
  const ref = db.ref('coins/' + target), cur = (await ref.once('value')).val();
  const c = charList.find((x) => x.uid === target);
  const base = cur || { n: 0, name: c ? c.name : 'player', t: ts(), c: 0, s: 0, m: 0 };
  const n = Math.max(0, Math.floor(f(+base.n || 0)));
  if (cur) await db.ref('coins/' + target + '/n').set(n); else await ref.set(Object.assign({}, base, { n }));
  return { name: base.name, n };
}
function wireDonate() {
  const amt = () => Math.max(0, Math.floor(+$('donAmt').value || 0)), msgEl = $('donMsg');
  const run = async (f, verb) => {
    const who = $('donWho').value; if (!who) return;
    try { const r = await adjustCoins(who, f); msgEl.textContent = r.name + ' now has ' + r.n.toLocaleString() + ' sh1den coins.'; if (verb) NET().say('🪙 ' + verb.replace('{n}', r.name)); }
    catch (e) { msgEl.textContent = "Couldn't change that."; }
  };
  $('donGive').onclick = () => run((n) => n + amt(), 'gave {n} ' + amt().toLocaleString() + ' sh1den coins');
  $('donTake').onclick = () => run((n) => n - amt());
  $('donSet').onclick = () => run(() => amt());
  $('donAll').onclick = async () => {
    const here = charList.filter((c) => NET().isOnline(c.uid));
    for (const c of here) { try { await adjustCoins(c.uid, (n) => n + amt()); } catch (e) { } }
    msgEl.textContent = 'Gave ' + here.length + ' people ' + amt().toLocaleString() + ' each.';
    NET().say('🪙 the house just gave everyone here ' + amt().toLocaleString() + ' sh1den coins!');
  };
}
function renderMods() {
  const ul = $('modList'); if (!ul || !isAdmin()) return;
  const here = (NET().onlineList ? NET().onlineList() : []).map((p) => ({ p, c: NET().charOf(p.uid) })).filter((x) => x.c && x.p.uid !== myUid());
  ul.textContent = '';
  if (!here.length) { const li = document.createElement('li'); li.textContent = 'Nobody else is here right now.'; ul.appendChild(li); return; }
  for (const { c } of here) {
    const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = c.name; li.appendChild(b);
    const muted = NET().mutedUntil && NET().mutedUntil(c.uid) > now();
    for (const [lab, fn, cls] of [[muted ? 'Unmute' : 'Mute 10 min', () => db.ref('mutes/' + c.uid).set(muted ? null : now() + 600000), ''], ['Kick', () => db.ref('kicks/' + c.uid).set(ts()), 'danger']]) {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'mini ' + cls; x.textContent = lab;
      x.onclick = () => fn().then(() => { BAR().toast(lab.split(' ')[0] + ': ' + c.name); renderMods(); }).catch(() => BAR().toast("Couldn't do that. The room's Firebase rules may need updating."));
      li.appendChild(x);
    }
    ul.appendChild(li);
  }
}
function renderGoldBtn() { const b = $('goldMe'); if (b) b.textContent = perks[myUid()] && perks[myUid()].gold ? 'Take off the gold tuxedo' : 'Wear the gold tuxedo'; }
function renderCarPicker() {
  renderGoldBtn();
  const c = cars[myUid()]; if (!c || !$('carStyle')) return;
  $('carStyle').value = c.style; $('carColor').value = String(c.color || 0);
}
function openCoins() {
  const p = $('coinsPanel'); if (!p) return;
  p.hidden = false; renderPanel();
  for (const id of ['whoPanel', 'creator']) { const o = $(id); if (o && id === 'whoPanel') o.hidden = true; }
}
function wire() {
  const b = $('coinBtn'); if (b) b.onclick = () => { const p = $('coinsPanel'); if (p.hidden) openCoins(); else p.hidden = true; };
  const x = $('coinsClose'); if (x) x.onclick = () => { $('coinsPanel').hidden = true; };
  const sp = $('spookyChk');
  if (sp) sp.onchange = () => {
    spooky = sp.checked;
    try { localStorage.setItem('sh1den-bar-spooky', spooky ? 'on' : 'off'); } catch (e) { }
    BAR().setSpooky(spooky);
    if (NET().refreshPresence) NET().refreshPresence();
  };
  setInterval(renderHud, 15000);
  wireCard();
  if ($('donGive')) wireDonate();
  if ($('remGo')) wireRemove();
}

window.EXTRAS = {
  myCoins: () => (mine && mine.n) || 0,
  mySpent: spent,
  hasCoinsRecord: () => !!mine,
  start, claimCoin, openCoins, adminChanged: () => { start(); adminChanged(); renderCard(); renderDonate(); renderMods(); },
  presenceChanged() { start(); updateLot(); renderCard(); renderDonate(); renderMods(); },
  renderHost() { renderDonate(); renderMods(); ownerCar(); },
  offline() {
    offlineMode = true;
    BAR().setSpooky(spooky); updateLot();
    // offline preview: a coin you can see, and a demo leaderboard
    BAR().setCoin({ slot: 0, spot: 0 });
    BAR().setLeaderboard([{ name: 'sh1denfps', n: 120 }, { name: 'regular_one', n: 45 }, { name: 'night_owl', n: 12 }]);
  },
  triggerEvent
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
