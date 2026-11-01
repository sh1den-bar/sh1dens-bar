/* SH1DEN'S — people and coins: the player menu (business cards, giving coins), the slot machines,
   the shop (clothes, pets, effects), the beggar, and coins for whoever's video is on the cinema TV. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR;
const stage = document.getElementById('stage');
let db = null, coinsAll = {}, perks = {}, inv = {}, buffs = {}, myCoins = null;
const uid = () => NET().uid;
const now = () => (NET().now ? NET().now() : Date.now());
const ts = () => NET().ts();
const fmt = (n) => (+n || 0).toLocaleString();
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
function hasChar() { return !!(NET().charOf && NET().charOf(uid())); }
function toast(t) { BAR().toast(t); }

// ---------------------------------------------------------------- the catalogue (prices are also checked by the database rules)
const SHOP = {
  clothes: [
    ['trench', 'Long black trench coat & shades', 400], ['vampire', 'Vampire set: cape, collar, fangs', 600], ['hillbilly', 'Hillbilly set: overalls & straw hat', 250],
    ['pirate', 'Pirate set: tricorn & eyepatch', 350], ['cowboy', 'Cowboy set: wide-brim hat & bandana', 300],
    ['bear', 'Bear costume', 500], ['frog', 'Frog costume', 450], ['chicken', 'Chicken costume', 300]
  ],
  pets: [['parrot', 'Parrot (sits on your shoulder)', 300], ['dog', 'Dog (sits by your feet, wags)', 500], ['cat', 'Black cat with glowing eyes', 400],
    ['demon', 'Floating little demon', 1200], ['angel', 'Floating little angel', 1200]],
  misc: [['aura-gold', 'Gold glow', 800], ['aura-blue', 'Blue glow', 500], ['aura-purple', 'Purple glow', 500], ['aura-green', 'Green glow', 500],
    ['smelly', 'Stink cloud (with flies)', 50], ['haze', 'Permanent haze (red eyes, slow sway)', 300]]
};
const SLOT_OF = { clothes: 'outfit', pets: 'pet', misc: 'fx' };
const BEGGAR_SHOP = [['high', 'A joint', 25, 'Red eyes and a heavy, slow sway for 30 minutes'], ['twitch', '"Mystery pills"', 40, 'Red eyes and the twitches for 30 minutes']];

// ---------------------------------------------------------------- DOM: panels built once
function build() {
  const pm = el('div', 'popmenu'); pm.id = 'playerMenu'; pm.hidden = true; stage.appendChild(pm);
  const cm = el('div', 'modal'); cm.id = 'cardModal'; cm.hidden = true; stage.appendChild(cm);
  const rq = el('div', 'reqbox'); rq.id = 'cardReq'; rq.hidden = true; stage.appendChild(rq);
  const sl = el('section', 'panel'); sl.id = 'slotsPanel'; sl.hidden = true; stage.appendChild(sl);
  sl.innerHTML = '<header><h2>Slots</h2><button class="x" type="button" id="slotsClose" aria-label="Close">✕</button></header>' +
    '<div class="reels"><span class="reel" id="r0">7</span><span class="reel" id="r1">7</span><span class="reel" id="r2">7</span></div>' +
    '<div class="msg" id="slotMsg" role="status"></div>' +
    '<div class="row" style="align-items:center"><label class="check" style="gap:6px">Bet <select id="slotBet"></select></label><button type="button" class="primary" id="slotSpin">Spin</button><span id="slotBal" style="margin-left:auto;color:#ffd98a"></span></div>' +
    '<details><summary>Paytable</summary><div class="paytable" id="payTable"></div></details>';
  const sh = el('section', 'panel'); sh.id = 'shopPanel'; sh.hidden = true; stage.appendChild(sh);
  sh.innerHTML = '<header><h2>Shop</h2><button class="x" type="button" id="shopClose" aria-label="Close">✕</button></header>' +
    '<div class="chattabs" role="tablist"><button type="button" class="on" data-tab="clothes">Clothes</button><button type="button" data-tab="pets">Pets</button><button type="button" data-tab="misc">Misc</button></div>' +
    '<div id="shopBal" style="color:#ffd98a"></div><div id="shopList" class="shoplist"></div><div class="msg" id="shopMsg" role="status"></div>';
  const bg = el('section', 'panel'); bg.id = 'beggarPanel'; bg.hidden = true; stage.appendChild(bg);
  $('slotsClose').onclick = () => { sl.hidden = true; };
  $('shopClose').onclick = () => { sh.hidden = true; };
  for (const b of sh.querySelectorAll('[data-tab]')) b.onclick = () => { shopTab = b.dataset.tab; for (const o of sh.querySelectorAll('[data-tab]')) o.classList.toggle('on', o === b); renderShop(); };
  for (const b of BETS) { const o = el('option', '', fmt(b) + ' coins'); o.value = b; $('slotBet').appendChild(o); }
  $('slotBet').value = '10';
  $('slotSpin').onclick = spin;
  $('payTable').innerHTML = PAYS.map(([sym, m]) => '<div><span>' + sym + ' ' + sym + ' ' + sym + '</span><b>×' + m + '</b></div>').join('') + '<div><span>🍒 🍒 (any two)</span><b>×2</b></div>';
  const btn = $('shopBtn'); if (btn) btn.onclick = () => { if (sh.hidden) openShop(); else sh.hidden = true; };
  document.addEventListener('pointerdown', (e) => { if (!pm.hidden && !pm.contains(e.target)) pm.hidden = true; }, true);
}

// ---------------------------------------------------------------- the player menu
function openPlayerMenu(p, x, y) {
  const pm = $('playerMenu'); pm.textContent = '';
  pm.appendChild(el('div', 'dmTitle', p.name));
  const b1 = el('button', '', 'See their business card'); b1.type = 'button'; b1.onclick = () => { pm.hidden = true; showCard(p.uid, p.name); };
  const b2 = el('button', '', 'Show them my business card'); b2.type = 'button'; b2.onclick = () => { pm.hidden = true; offerCard(p); };
  const b3 = el('button', '', 'Give them coins'); b3.type = 'button'; b3.onclick = () => { pm.hidden = true; giveCoins(p); };
  pm.append(b1, b2, b3);
  const r = stage.getBoundingClientRect();
  pm.hidden = false;
  pm.style.left = Math.max(12, Math.min(r.width - 220, x - r.left + 10)) + 'px';
  pm.style.top = Math.max(60, Math.min(r.height - 200, y - r.top - 60)) + 'px';
}
// a business card for anyone: name, role, hours, coins and the suit they wear
const TIERS = [[0, 'Regular'], [100, 'Silver'], [250, 'Gold'], [500, 'Platinum'], [750, 'Emerald'], [1000, 'Diamond']];
async function showCard(who, name) {
  if (!db) return;
  const [c, pr] = await Promise.all([db.ref('coins/' + who).once('value'), db.ref('presence/' + who).once('value')]);
  const v = c.val() || {}, pres = pr.val() || {}, h = (+v.m || 0) / 60;
  let tier = TIERS[0]; for (const t of TIERS) if (h >= t[0]) tier = t;
  const owner = (name || '').toLowerCase() === 'sh1denfps', co = !owner && pres && pres.a === true;
  const wear = perks[who] && perks[who].wear;
  const m = $('cardModal'); m.textContent = '';
  const card = el('div', 'bigcard');
  card.appendChild(el('div', 'bcTop', "SH1DEN'S · MEMBER CARD"));
  card.appendChild(el('div', 'bcName', name));
  card.appendChild(el('div', 'bizrole ' + (owner ? 'ruby' : co ? 'co' : tier[1].toLowerCase()), owner ? 'Owner' : co ? 'Co-owner' : tier[1] + ' member'));
  const st = el('div', 'bcStats');
  st.append(el('span', '', 'Time here'), el('b', '', (h >= 10 ? Math.floor(h) : h.toFixed(1)) + ' h'), el('span', '', 'Coins'), el('b', '', fmt(v.n)), el('span', '', 'Suit'), el('b', '', wear && wear !== 'none' ? wear[0].toUpperCase() + wear.slice(1) + ' tuxedo' : 'Their own clothes'));
  card.appendChild(st);
  const close = el('button', '', 'Close'); close.type = 'button'; close.onclick = () => { m.hidden = true; };
  m.append(card, close); m.hidden = false;
}
// showing your card asks the other person first; they can say no
async function offerCard(p) {
  if (!db || !hasChar()) { toast('Make a character first.'); return; }
  try { await db.ref('cardreq/' + p.uid + '/' + uid()).set({ name: NET().myName(), t: ts() }); toast('Asked ' + p.name + ' if they want to see your card.'); }
  catch (e) { toast("Couldn't send that. The room's Firebase rules may need updating."); }
}
function listenRequests() {
  db.ref('cardreq/' + uid()).on('value', (s) => {
    const reqs = []; s.forEach((c) => { const v = c.val() || {}; if (v.t && now() - v.t < 120000) reqs.push({ from: c.key, name: v.name }); else db.ref('cardreq/' + uid() + '/' + c.key).remove().catch(() => { }); });
    const box = $('cardReq');
    if (!reqs.length) { box.hidden = true; return; }
    const r = reqs[0]; box.textContent = '';
    box.appendChild(el('div', '', r.name + ' wants to show you their business card.'));
    const yes = el('button', 'primary', 'Accept'), no = el('button', '', 'Decline'); yes.type = no.type = 'button';
    const done = () => db.ref('cardreq/' + uid() + '/' + r.from).remove().catch(() => { });
    yes.onclick = () => { done(); showCard(r.from, r.name); };
    no.onclick = done;
    const row = el('div', 'row'); row.append(yes, no); box.appendChild(row); box.hidden = false;
  });
}
// ---------------------------------------------------------------- giving coins to someone (to help them into a game)
function giveCoins(p) {
  if (!db || !hasChar()) { toast('Make a character first.'); return; }
  const m = $('cardModal'); m.textContent = '';
  const box = el('div', 'bigcard');
  box.appendChild(el('div', 'bcTop', 'GIVE COINS'));
  box.appendChild(el('div', 'bcName', p.name));
  box.appendChild(el('p', '', 'You have ' + fmt(myCoins && myCoins.n) + ' coins. Handy if they need a buy-in for poker or pool.'));
  const inp = el('input'); inp.type = 'number'; inp.min = 1; inp.max = 10000; inp.value = 10;
  const msg = el('div', 'msg');
  const go = el('button', 'primary', 'Give'); go.type = 'button';
  const cancel = el('button', '', 'Cancel'); cancel.type = 'button'; cancel.onclick = () => { m.hidden = true; };
  go.onclick = async () => {
    const amt = Math.floor(+inp.value || 0), have = (myCoins && myCoins.n) || 0;
    if (amt < 1 || amt > 10000) { msg.textContent = 'Between 1 and 10,000 coins.'; return; }
    if (amt > have) { msg.textContent = "You don't have that many."; return; }
    const them = (await db.ref('coins/' + p.uid).once('value')).val();
    if (!them) { msg.textContent = "They haven't started earning coins yet. Try again in a few minutes."; return; }
    const gid = db.ref('gifts').push().key, upd = {};
    upd['gifts/' + gid] = { from: uid(), to: p.uid, amt, t: ts() };
    upd['coins/' + uid() + '/n'] = have - amt; upd['coins/' + uid() + '/g'] = gid;
    upd['coins/' + p.uid + '/n'] = (them.n || 0) + amt; upd['coins/' + p.uid + '/g'] = gid;
    try { await db.ref().update(upd); m.hidden = true; toast('You gave ' + p.name + ' ' + fmt(amt) + ' coins.'); NET().say('🪙 gave ' + p.name + ' ' + fmt(amt) + ' coins'); }
    catch (e) { msg.textContent = "Couldn't send them. The room's Firebase rules may need updating."; }
  };
  const row = el('div', 'row'); row.append(inp, go, cancel);
  box.append(row, msg); m.appendChild(box); m.hidden = false;
}

// ---------------------------------------------------------------- the slot machines (any number of people can play at once)
const SYMS = [['🍒', 30], ['🍋', 25], ['🔔', 18], ['BAR', 12], ['7', 8], ['💎', 5]];
const PAYS = [['💎', 200], ['7', 80], ['BAR', 30], ['🔔', 15], ['🍋', 8], ['🍒', 5]];
const BETS = [5, 10, 25, 50, 100, 250, 500];
const ANNOUNCE = 1000;
let spinning = false;
function pick() {
  const r = new Uint32Array(1); crypto.getRandomValues(r);
  let x = r[0] % 98; for (const [s, w] of SYMS) { if (x < w) return s; x -= w; } return '🍒';
}
async function spin() {
  if (spinning) return;
  if (!db || !hasChar()) { $('slotMsg').textContent = 'Make a character first.'; return; }
  const bet = +$('slotBet').value, have = (myCoins && myCoins.n) || 0;
  if (have < bet) { $('slotMsg').textContent = "You don't have enough coins for that bet."; return; }
  spinning = true; $('slotSpin').disabled = true; $('slotMsg').textContent = '';
  const res = [pick(), pick(), pick()];
  let mult = 0;
  if (res[0] === res[1] && res[1] === res[2]) mult = PAYS.find((p) => p[0] === res[0])[1];
  else if (res.filter((r) => r === '🍒').length === 2) mult = 2;
  const win = bet * mult;
  // the reels spin and stop one by one
  const reels = [$('r0'), $('r1'), $('r2')], start = performance.now();
  const anim = () => {
    const t = performance.now() - start;
    reels.forEach((r, i) => { if (t < 700 + i * 350) r.textContent = SYMS[Math.floor(Math.random() * SYMS.length)][0]; else r.textContent = res[i]; r.classList.toggle('stop', t >= 700 + i * 350); });
    if (t < 1500) requestAnimationFrame(anim); else finish();
  };
  requestAnimationFrame(anim);
  const write = (async () => {
    const upd = {};
    upd['spins/' + uid()] = { bet, win, t: ts() };
    upd['coins/' + uid() + '/n'] = have - bet + win;
    await db.ref().update(upd);
  })();
  async function finish() {
    try {
      await write;
      const net = win - bet;
      $('slotMsg').textContent = win ? 'You win ' + fmt(win) + ' coins!' : 'No luck. Lost ' + fmt(bet) + '.';
      if (Math.abs(net) >= ANNOUNCE) NET().say(net > 0 ? '🎰 just won ' + fmt(win) + ' coins on the slots!' : '🎰 just lost ' + fmt(bet) + ' coins on the slots');
    } catch (e) { $('slotMsg').textContent = "That spin didn't go through (give it a second between spins)."; }
    spinning = false; $('slotSpin').disabled = false;
  }
}
function openSlots() { const p = $('slotsPanel'); p.hidden = false; renderBal(); }

// ---------------------------------------------------------------- the shop
let shopTab = 'clothes';
function openShop() { $('shopPanel').hidden = false; renderShop(); }
function renderShop() {
  const list = $('shopList'); if (!list || $('shopPanel').hidden) return;
  list.textContent = '';
  const mine = inv[uid()] || {}, eq = mine.eq || {}, slot = SLOT_OF[shopTab];
  for (const [id, name, price] of SHOP[shopTab]) {
    const row = el('div', 'shoprow');
    row.append(el('span', '', name));
    const owned = !!mine[id];
    const b = el('button', owned ? '' : 'primary', owned ? (eq[slot] === id ? 'Take off' : 'Use') : fmt(price) + ' 🪙'); b.type = 'button';
    b.onclick = () => (owned ? equip(slot, eq[slot] === id ? 'none' : id) : buy(id, price, slot));
    if (!owned && ((myCoins && myCoins.n) || 0) < price) b.disabled = true;
    row.appendChild(b); list.appendChild(row);
  }
  renderBal();
}
async function buy(id, price, slot) {
  if (!db || !hasChar()) { $('shopMsg').textContent = 'Make a character first.'; return; }
  const have = (myCoins && myCoins.n) || 0;
  if (have < price) { $('shopMsg').textContent = 'Not enough coins.'; return; }
  const upd = {};
  upd['coins/' + uid() + '/n'] = have - price; upd['coins/' + uid() + '/s'] = ((myCoins && +myCoins.s) || 0) + price;
  upd['inv/' + uid() + '/' + id] = true;
  upd['inv/' + uid() + '/eq/' + slot] = id;
  try { await db.ref().update(upd); $('shopMsg').textContent = 'Bought and put on.'; }
  catch (e) { $('shopMsg').textContent = "Couldn't buy that. The room's Firebase rules may need updating."; }
}
function equip(slot, id) { db.ref('inv/' + uid() + '/eq/' + slot).set(id).catch(() => { $('shopMsg').textContent = "Couldn't change that."; }); }
function renderBal() {
  const t = 'Your coins: ' + fmt(myCoins && myCoins.n);
  if ($('shopBal')) $('shopBal').textContent = t;
  if ($('slotBal')) $('slotBal').textContent = fmt(myCoins && myCoins.n) + ' 🪙';
}

// ---------------------------------------------------------------- the beggar: give him a coin and he'll sell you something
async function openBeggar() {
  const p = $('beggarPanel'); p.textContent = '';
  p.appendChild(el('header')).append(el('h2', '', 'Old Tobias'), Object.assign(el('button', 'x', '✕'), { type: 'button', onclick: () => { p.hidden = true; } }));
  if (!db || !hasChar()) { p.appendChild(el('p', '', 'He holds out his cup. (Make a character to give him a coin.)')); p.hidden = false; return; }
  p.appendChild(el('p', '', '"Spare a coin, friend?" He rattles a paper cup.'));
  const give = el('button', 'primary', 'Drop a coin in his cup'); give.type = 'button';
  const msg = el('div', 'msg');
  give.onclick = async () => {
    const have = (myCoins && myCoins.n) || 0;
    if (have < 1) { msg.textContent = "You don't have a coin to spare."; return; }
    const upd = {}; upd['coins/' + uid() + '/n'] = have - 1; upd['coins/' + uid() + '/s'] = ((myCoins && +myCoins.s) || 0) + 1;
    try { await db.ref().update(upd); } catch (e) { msg.textContent = "Couldn't give it."; return; }
    p.textContent = '';
    p.appendChild(el('header')).append(el('h2', '', 'Old Tobias'), Object.assign(el('button', 'x', '✕'), { type: 'button', onclick: () => { p.hidden = true; } }));
    p.appendChild(el('p', '', '"Bless you." He leans in and opens his coat. "Psst. Looking for something?"'));
    for (const [k, name, price, desc] of BEGGAR_SHOP) {
      const row = el('div', 'shoprow'); row.append(el('span', '', name + ' · ' + desc));
      const b = el('button', 'primary', fmt(price) + ' 🪙'); b.type = 'button';
      b.onclick = async () => {
        const h = (myCoins && myCoins.n) || 0;
        if (h < price) { m2.textContent = 'Not enough coins.'; return; }
        const u = {}; u['coins/' + uid() + '/n'] = h - price; u['coins/' + uid() + '/s'] = ((myCoins && +myCoins.s) || 0) + price; u['buffs/' + uid() + '/' + k] = ts();
        try { await db.ref().update(u); m2.textContent = 'Lasts 30 minutes.'; toast(k === 'high' ? 'Your eyes go red. Everything is slow and fine.' : 'Uh oh. You start twitching.'); }
        catch (e) { m2.textContent = "Couldn't buy that. The room's Firebase rules may need updating."; }
      };
      row.appendChild(b); p.appendChild(row);
    }
    const m2 = el('div', 'msg'); p.appendChild(m2);
  };
  p.append(give, msg); p.hidden = false;
}

// ---------------------------------------------------------------- coins for whoever's video is on the cinema TV, by how many are watching
const TV_MAX = 20;
setInterval(async () => {
  if (!db || !myCoins || !NET().onlineList) return;
  const cur = (await db.ref('tv/current').once('value')).val();
  if (!cur || cur.uid !== uid()) return;
  if (myCoins.v && now() - myCoins.v < 58000) return;
  const watching = NET().onlineList().filter((p) => p.uid !== uid() && typeof p.s === 'string' && p.s.startsWith('cinema-')).length;
  if (!watching) return;
  const amt = Math.min(TV_MAX, watching), upd = {};
  upd['coins/' + uid() + '/n'] = (myCoins.n || 0) + amt; upd['coins/' + uid() + '/v'] = ts();
  try { await db.ref().update(upd); toast('+' + amt + ' coins: ' + watching + (watching === 1 ? ' person is' : ' people are') + ' watching your video'); } catch (e) { }
}, 60000);

// ---------------------------------------------------------------- start
function start() {
  if (db || !NET().online || !NET().db || !NET().db()) return;
  db = NET().db();
  db.ref('coins/' + uid()).on('value', (s) => { myCoins = s.val(); renderBal(); renderShop(); });
  db.ref('perks').on('value', (s) => { perks = s.val() || {}; });
  db.ref('inv').on('value', (s) => { inv = s.val() || {}; BAR().setInv(inv); renderShop(); });
  db.ref('buffs').on('value', (s) => { buffs = s.val() || {}; BAR().setBuffs(buffs); });
  setInterval(() => BAR().setBuffs(buffs), 60000);   // effects wear off
  listenRequests();
}
build();
const boot = setInterval(() => { if (NET().online && NET().db && NET().db()) { clearInterval(boot); start(); } }, 1000);
window.SOCIAL = { openPlayerMenu, openSlots, openShop, openBeggar, showCard };
})();
