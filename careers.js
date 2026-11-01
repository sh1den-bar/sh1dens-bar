/* SH1DEN'S — careers and the inventory.
   Every place in town has a ladder of jobs, from cleaner to owner. A new player picks a starting job (or stays unemployed),
   and moves up only when the place's owner (or the host, while it has no owner) promotes them. Switching to another
   career starts you over at level 1. Pay is listed so everyone can see what's ahead, but nothing pays out until the
   places are built. The inventory shows your wallet, a 20-slot pocket and everything you own. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {};
const BAR = () => window.BAR || {};
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const fmt = (n) => (+n || 0).toLocaleString();
const now = () => (NET().now ? NET().now() : Date.now());
const uid = () => NET().uid;
const DAY = 86400000;
const TS = () => (NET().ts ? NET().ts() : Date.now());

// ---------------------------------------------------------------- the catalogue
// Role ids carry their rank (t0 = starting jobs ... t4 = owner); the database rules read that prefix.
// pay = planned coins per hour on shift (placeholder numbers, tuned once every place is built); n = how many people can hold it.
const RANKS = ['Starting', 'Staff', 'Senior', 'Management', 'Owner'];
const WAIT_DAYS = [0, 1, 3, 7, 14];   // days in the rank below before you can ask for this one
const PLACES = [
  { id: 'bank', name: 'Bank', blurb: 'Vaults, loans and armoured trucks. The richest building in town.', roles: [
    ['t0-cleaner', 'Cleaner', 8, 3, 'Keeps the marble shining after hours.'],
    ['t0-receptionist', 'Receptionist', 10, 2, 'First face customers see; books appointments.'],
    ['t0-guard', 'Security guard', 12, 4, 'Watches the doors and the cameras.'],
    ['t1-teller', 'Bank teller', 18, 4, 'Handles deposits and withdrawals at the counter.'],
    ['t1-driver', 'Money delivery driver', 22, 3, 'Drives the armoured van between the bank and businesses.'],
    ['t2-agent', 'Bank agent', 30, 3, 'Opens accounts, sells savings plans, wins clients.'],
    ['t2-loans', 'Loan officer', 34, 2, 'Approves (or refuses) loans for players and businesses.'],
    ['t3-manager', 'Branch manager', 50, 1, 'Runs the floor, the staff and the vault codes.'],
    ['t4-owner', 'Bank owner', 0, 1, 'Owns the bank. Takes a cut of everything that moves through it.']] },
  { id: 'cardealer', name: 'Car dealership', blurb: 'New and used cars, a workshop and a tow truck.', roles: [
    ['t0-washer', 'Car washer', 8, 3, 'Keeps every car on the lot spotless.'],
    ['t0-lot', 'Lot attendant', 9, 2, 'Parks, moves and guards the cars for sale.'],
    ['t0-apprentice', 'Mechanic apprentice', 10, 3, 'Hands the tools over and learns the trade.'],
    ['t1-mechanic', 'Mechanic', 18, 3, 'Repairs and tunes customers\' cars.'],
    ['t1-sales', 'Car salesperson', 16, 3, 'Sells cars on commission.'],
    ['t1-tow', 'Tow-truck driver', 17, 2, 'Picks up broken-down and badly parked cars.'],
    ['t2-senior', 'Senior mechanic', 28, 2, 'Engine rebuilds and custom paint jobs.'],
    ['t2-salesmgr', 'Sales manager', 30, 1, 'Sets prices and runs the sales team.'],
    ['t3-manager', 'Dealership manager', 45, 1, 'Runs the whole dealership.'],
    ['t4-owner', 'Dealership owner', 0, 1, 'Owns the lot, the workshop and the stock.']] },
  { id: 'clothes', name: 'Clothes store', blurb: 'Suits, streetwear and made-to-measure tailoring.', roles: [
    ['t0-cleaner', 'Cleaner', 7, 2, 'Keeps the shop floor and changing rooms tidy.'],
    ['t0-stock', 'Stock clerk', 8, 2, 'Unpacks deliveries and fills the racks.'],
    ['t0-cashier', 'Cashier', 9, 2, 'Rings up sales at the till.'],
    ['t1-sales', 'Sales assistant', 14, 3, 'Helps customers find their look.'],
    ['t1-seam', 'Seamstress', 15, 2, 'Alterations and repairs.'],
    ['t2-tailor', 'Tailor', 26, 2, 'Made-to-measure suits for the town\'s high rollers.'],
    ['t2-stylist', 'Stylist', 24, 2, 'Dresses window displays and VIP customers.'],
    ['t3-manager', 'Store manager', 40, 1, 'Runs the store, orders the stock.'],
    ['t4-owner', 'Store owner', 0, 1, 'Owns the store and its brand.']] },
  { id: 'court', name: 'Courthouse', blurb: 'Trials, fines and sentences. Where the town\'s rules are enforced.', roles: [
    ['t0-janitor', 'Janitor', 8, 2, 'Keeps the halls of justice clean.'],
    ['t0-clerk', 'Court clerk', 10, 2, 'Files cases and keeps the records.'],
    ['t1-bailiff', 'Bailiff', 16, 3, 'Keeps order in the courtroom.'],
    ['t1-paralegal', 'Paralegal', 17, 3, 'Prepares cases for the lawyers.'],
    ['t2-lawyer', 'Defence lawyer', 32, 4, 'Represents players on trial.'],
    ['t2-prosecutor', 'Prosecutor', 32, 2, 'Brings the case against the accused.'],
    ['t3-judge', 'Judge', 55, 2, 'Hears the cases and passes sentence.'],
    ['t4-owner', 'Chief justice', 0, 1, 'Runs the courthouse and appoints its judges.']] },
  { id: 'realty', name: 'Real estate', blurb: 'The houses on the residential streets and the mansions up the road.', roles: [
    ['t0-gardener', 'Gardener', 8, 3, 'Keeps the lawns and hedges in shape.'],
    ['t0-handyman', 'Handyman', 10, 3, 'Fixes taps, doors and the occasional window.'],
    ['t1-agent', 'Property agent', 18, 3, 'Shows houses and signs tenants.'],
    ['t1-caretaker', 'Caretaker', 15, 2, 'Looks after the empty properties and collects keys.'],
    ['t2-senior', 'Senior agent', 30, 2, 'Handles the mansions and the big-money deals.'],
    ['t3-manager', 'Agency manager', 45, 1, 'Sets the rents and runs the agency.'],
    ['t4-owner', 'Agency owner', 0, 1, 'Owns the agency and its listings.']] },
  { id: 'bar', name: "Sh1den's bar", blurb: 'The bar on Main Street: drinks, dancing, poker and the hotel upstairs.', owned: 'sh1denfps', roles: [
    ['t0-cleaner', 'Cleaner', 7, 2, 'Mops up after closing.'],
    ['t0-dish', 'Dishwasher', 7, 2, 'Glasses in, glasses out.'],
    ['t0-barback', 'Barback', 9, 2, 'Restocks the bar and carries the ice.'],
    ['t0-housekeeper', 'Hotel housekeeper', 8, 2, 'Makes up the rooms upstairs.'],
    ['t1-bartender', 'Bartender', 15, 2, 'Pours the drinks next to Charon.'],
    ['t1-waiter', 'Waiter', 12, 3, 'Takes drinks to the tables and the lounge.'],
    ['t1-bouncer', 'Bouncer', 14, 2, 'Works the door with Cerberus.'],
    ['t1-desk', 'Hotel receptionist', 13, 1, 'Checks guests in and hands out keys.'],
    ['t2-dj', 'DJ', 24, 1, 'Runs the dance room.'],
    ['t2-dealer', 'Card dealer', 22, 2, 'Deals the poker games in Casino Royale.'],
    ['t3-manager', 'Bar manager', 40, 1, 'Runs the bar, the staff and the hotel.'],
    ['t4-owner', 'Owner', 0, 1, 'sh1den. Not for sale.']] }
];
const PLACE = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const UNEMPLOYED = { place: 'none', role: 't0-unemployed' };
const UNEMPLOYED_PAY = 1;   // what everyone gets for hanging around now: 1 coin every 5 minutes
const tierOf = (role) => +((role || '').match(/^t(\d)/) || [0, 0])[1];
function roleInfo(place, role) {
  if (place === 'none' || !PLACE[place]) return { name: 'Unemployed', pay: UNEMPLOYED_PAY * 12, n: 0, desc: 'No job yet. You still get a coin every 5 minutes for being in town.' };
  const r = PLACE[place].roles.find((x) => x[0] === role);
  return r ? { name: r[1], pay: r[2], n: r[3], desc: r[4] } : { name: role, pay: 0, n: 0, desc: '' };
}
const jobTitle = (c) => (!c || c.place === 'none' ? 'Unemployed' : PLACE[c.place] ? PLACE[c.place].name + ' · ' + roleInfo(c.place, c.role).name : 'Unemployed');

// ---------------------------------------------------------------- state
let db = null, mine = null, all = {}, apps = {}, owners = {}, items = {}, loaded = false, offline = false;
const isAdmin = () => !!NET().isAdmin;
const myName = () => (NET().myName && NET().myName()) || '';
// who runs a place: its owner, or the host while nobody owns it (the bar is always sh1den's)
function canManage(place) {
  if (isAdmin()) return true;
  return !!(owners[place] && owners[place] === uid());
}
const staffOf = (place) => Object.entries(all).filter(([, c]) => c && c.place === place).map(([u, c]) => Object.assign({ uid: u }, c));
const holders = (place, role) => staffOf(place).filter((c) => c.role === role);

async function save(target, c) {
  if (offline || !db) { if (target === uid() || !db) { mine = c; try { localStorage.setItem('sh1den-career', JSON.stringify(c)); } catch (e) { } render(); } return true; }
  try { await db.ref('careers/' + target).set(c); return true; } catch (e) { toast("Couldn't change that. The room's Firebase rules may need updating."); return false; }
}
function toast(t) { if (BAR().toast) BAR().toast(t); }
function careerFor(place, role, keep) {
  return { place, role, since: offline || !db ? Date.now() : TS(), lvl: keep ? keep.lvl || 1 : 1, xp: keep ? keep.xp || 0 : 0, name: myName() || (keep && keep.name) || 'player' };
}

// ---------------------------------------------------------------- picking a career (first visit, or switching)
let pickThen = null;
function buildPicker() {
  if ($('careerPick')) return;
  const p = el('section', 'panel'); p.id = 'careerPick'; p.hidden = true; p.setAttribute('aria-label', 'Choose your profession');
  p.innerHTML = '<header><h2>Choose your profession</h2><button class="x" type="button" id="cpClose" aria-label="Close">✕</button></header>' +
    '<p id="cpIntro"></p><div id="cpList" class="cplist"></div><div class="msg" id="cpMsg" role="status"></div>';
  $('stage').appendChild(p);
  $('cpClose').onclick = () => { p.hidden = true; if (pickThen && mine) { const f = pickThen; pickThen = null; f(); } };
}
function openPicker(first, then) {
  buildPicker(); pickThen = then || null;
  const p = $('careerPick'), list = $('cpList');
  $('cpIntro').textContent = first
    ? 'Everyone in town has a job, from cleaning the bank\'s floors to owning it. Pick where you start. You move up when the owner promotes you, and every place\'s pay is listed so you can see what\'s ahead. (Nothing pays out until the places open; for now everyone gets a coin every 5 minutes.)'
    : 'Switching to a new career starts you again at level 1 in a starting job. Your current job: ' + jobTitle(mine) + '.';
  $('cpClose').hidden = !!first && !mine;
  list.textContent = '';
  const pick = (place, role, label) => async (e) => {
    const b = e.currentTarget;
    if (mine && !first && !b.dataset.armed) { b.dataset.armed = '1'; const t0 = b.textContent; b.textContent = 'Click again: start over as ' + label; setTimeout(() => { delete b.dataset.armed; b.textContent = t0; }, 4000); return; }
    const ok = await save(uid(), careerFor(place, role));
    if (!ok) return;
    if (db && !offline) { mine = careerFor(place, role); mine.since = Date.now(); }
    if (db && !offline) { const a = apps; for (const pl in a) if (a[pl] && a[pl][uid()]) db.ref('jobapps/' + pl + '/' + uid()).remove().catch(() => { }); }
    toast(place === 'none' ? 'You\'re unemployed. Look around town and pick a job any time from 💼 Jobs.' : 'You\'re now a ' + label.toLowerCase() + '. Good luck.');
    p.hidden = true; render();
    if (pickThen) { const f = pickThen; pickThen = null; f(); }
  };
  for (const P of PLACES) {
    const card = el('div', 'cpcard');
    const h = el('div', 'cphead'); h.append(el('b', '', P.name), el('span', 'small', P.blurb)); card.appendChild(h);
    const row = el('div', 'cproles');
    for (const [id, name, pay, n, desc] of P.roles.filter((r) => tierOf(r[0]) === 0)) {
      const full = holders(P.id, id).length >= n && !(mine && mine.place === P.id && mine.role === id);
      const b = el('button', 'cprole'); b.type = 'button'; b.title = desc;
      b.append(el('span', '', name), el('span', 'cppay', pay + ' 🪙/h · ' + holders(P.id, id).length + '/' + n));
      if (mine && mine.place === P.id && mine.role === id) { b.disabled = true; b.lastChild.textContent = 'your job'; }
      else if (full) { b.disabled = true; b.lastChild.textContent = 'full'; }
      b.onclick = pick(P.id, id, name); row.appendChild(b);
    }
    card.appendChild(row);
    const up = P.roles.filter((r) => tierOf(r[0]) > 0).map((r) => r[1]);
    card.appendChild(el('div', 'small cpladder', 'Leads to: ' + up.join(' → ')));
    list.appendChild(card);
  }
  const un = el('button', 'cpunemp'); un.type = 'button'; un.textContent = 'Stay unemployed for now';
  if (mine && mine.place === 'none') un.disabled = true;
  un.onclick = pick('none', 't0-unemployed', 'unemployed'); list.appendChild(un);
  p.hidden = false;
}
// run cb once the player has a career (asks first if they don't)
function ensure(cb) {
  if (mine) { cb && cb(); return; }
  if (!loaded) { setTimeout(() => ensure(cb), 400); return; }
  openPicker(true, cb);
}

// ---------------------------------------------------------------- the job centre
function buildJobs() {
  if ($('jobsPanel')) return;
  const p = el('section', 'panel'); p.id = 'jobsPanel'; p.hidden = true; p.setAttribute('aria-label', 'Jobs');
  p.innerHTML = '<header><h2>Jobs</h2><button class="x" type="button" id="jobsClose" aria-label="Close">✕</button></header>' +
    '<div id="jobMine" class="jobmine"></div><div class="chattabs" role="tablist" id="jobTabs"></div><div id="jobBody" class="jobbody"></div><div class="msg" id="jobMsg" role="status"></div>';
  $('stage').appendChild(p);
  $('jobsClose').onclick = () => { p.hidden = true; };
}
let jobTab = null;
function openJobs() { buildJobs(); $('jobsPanel').hidden = false; ensure(() => render()); render(); }
function since(t) { const d = Math.max(0, now() - (+t || now())); return d < 3600000 ? Math.max(1, Math.round(d / 60000)) + ' min' : d < DAY ? (d / 3600000).toFixed(1) + ' h' : Math.floor(d / DAY) + ' days'; }
function render() {
  renderCardLine();
  renderInv();
  const p = $('jobsPanel'); if (!p || p.hidden) return;
  const me = $('jobMine'); me.textContent = '';
  const info = mine ? roleInfo(mine.place, mine.role) : null;
  const top = el('div', 'jobnow');
  top.append(el('b', '', mine ? jobTitle(mine) : 'No job picked yet'));
  if (mine) top.append(el('span', 'small', (mine.place === 'none' ? '' : RANKS[tierOf(mine.role)] + ' rank · ') + 'Level ' + (mine.lvl || 1) + ' · in this job ' + since(mine.since) + ' · pay ' + info.pay + ' 🪙/h' + (mine.place === 'none' ? '' : ' (starts when ' + PLACE[mine.place].name.toLowerCase() + ' opens)')));
  const sw = el('button', 'mini', mine ? 'Change career' : 'Pick a job'); sw.type = 'button'; sw.onclick = () => openPicker(!mine);
  top.appendChild(sw); me.appendChild(top);
  // tabs: one per place, yours first
  const tabs = $('jobTabs'); tabs.textContent = '';
  const order = PLACES.slice().sort((a, b) => (mine && a.id === mine.place ? -1 : mine && b.id === mine.place ? 1 : 0));
  if (!jobTab || !PLACE[jobTab]) jobTab = (mine && PLACE[mine.place]) ? mine.place : PLACES[0].id;
  for (const P of order) { const b = el('button', P.id === jobTab ? 'on' : '', P.name); b.type = 'button'; b.onclick = () => { jobTab = P.id; render(); }; tabs.appendChild(b); }
  renderPlace(PLACE[jobTab]);
}
function renderPlace(P) {
  const body = $('jobBody'); body.textContent = '';
  const ownerUid = P.owned ? null : owners[P.id];
  const ownerName = P.owned ? P.owned : ownerUid ? ((all[ownerUid] && all[ownerUid].name) || 'someone') : 'nobody yet (the host runs it)';
  body.append(el('p', 'small', P.blurb + ' Owner: ' + ownerName + '.'));
  const myTier = mine && mine.place === P.id ? tierOf(mine.role) : -1;
  const myApp = apps[P.id] && apps[P.id][uid()];
  for (let t = 0; t <= 4; t++) {
    const rs = P.roles.filter((r) => tierOf(r[0]) === t); if (!rs.length) continue;
    body.appendChild(el('div', 'rankhead', RANKS[t] + (t > 0 ? ' · ' + WAIT_DAYS[t] + (WAIT_DAYS[t] === 1 ? ' day' : ' days') + ' in the rank below' : '')));
    for (const [id, name, pay, n, desc] of rs) {
      const hs = holders(P.id, id);
      const row = el('div', 'jobrow');
      const left = el('div', 'jobl');
      left.append(el('b', '', name), el('span', 'small', desc));
      const who = el('span', 'small jobwho', hs.length ? hs.map((h) => h.name || '?').join(', ') : 'nobody yet');
      left.appendChild(who);
      row.appendChild(left);
      const right = el('div', 'jobr');
      right.appendChild(el('span', 'cppay', t === 4 ? (P.owned ? 'not for sale' : 'owner') : pay + ' 🪙/h · ' + hs.length + '/' + n));
      // what you can do about it
      if (mine && mine.place === P.id && mine.role === id) right.appendChild(el('span', 'tagme', 'you'));
      else if (t === 0 && !(mine && mine.place === P.id && myTier > 0)) {
        const b = el('button', 'mini', mine && mine.place === P.id ? 'Move here' : 'Start here'); b.type = 'button';
        b.disabled = hs.length >= n;
        b.onclick = () => openPicker(false);
        if (mine && mine.place === P.id) b.onclick = async () => { await save(uid(), careerFor(P.id, id, mine)); };
        right.appendChild(b);
      } else if (mine && mine.place === P.id && t === myTier + 1 && !(P.owned && t === 4)) {
        const wait = WAIT_DAYS[t] * DAY - (now() - (+mine.since || now()));
        if (myApp && myApp.role === id) {
          const b = el('button', 'mini', 'Applied · withdraw'); b.type = 'button';
          b.onclick = () => db && db.ref('jobapps/' + P.id + '/' + uid()).remove().catch(() => { });
          right.appendChild(b);
        } else {
          const b = el('button', 'mini primary', wait > 0 ? 'Apply in ' + since(now() - wait) : 'Apply'); b.type = 'button';
          b.disabled = wait > 0 || !db || offline;
          b.onclick = () => apply(P.id, id, name);
          right.appendChild(b);
        }
      }
      row.appendChild(right); body.appendChild(row);
    }
  }
  if (canManage(P.id) && !P.owned) renderManage(P, body);
  else if (P.owned && isAdmin()) renderManage(P, body);
}
async function apply(place, role, name) {
  if (!db) return;
  try { await db.ref('jobapps/' + place + '/' + uid()).set({ role, name: myName() || (mine && mine.name) || 'player', t: TS() }); $('jobMsg').textContent = 'Applied for ' + name + '. The owner decides.'; }
  catch (e) { $('jobMsg').textContent = "Couldn't apply. The room's Firebase rules may need updating."; }
}
// owners (and the host) see the applications and their staff
function renderManage(P, body) {
  const box = el('div', 'jobmanage');
  box.appendChild(el('h3', '', isAdmin() && !(owners[P.id] === uid()) ? 'Run it (host)' : 'Run your ' + P.name.toLowerCase()));
  const list = Object.entries(apps[P.id] || {});
  box.appendChild(el('div', 'rankhead', 'Applications'));
  if (!list.length) box.appendChild(el('p', 'small', 'Nobody has applied.'));
  for (const [u, a] of list) {
    const row = el('div', 'jobrow');
    const cur = all[u];
    row.appendChild(el('div', 'jobl', (a.name || '?') + ' wants ' + roleInfo(P.id, a.role).name + (cur ? ' (now ' + roleInfo(cur.place, cur.role).name + ', ' + since(cur.since) + ')' : '')));
    const r = el('div', 'jobr');
    const ok = el('button', 'mini primary', 'Promote'); ok.type = 'button';
    ok.disabled = holders(P.id, a.role).length >= roleInfo(P.id, a.role).n || (tierOf(a.role) === 4 && !isAdmin());
    ok.onclick = async () => { const c = Object.assign({}, cur || {}, { place: P.id, role: a.role, since: TS(), name: a.name || (cur && cur.name) || 'player' }); c.lvl = (cur && cur.place === P.id && cur.lvl) || 1; c.xp = (cur && cur.place === P.id && cur.xp) || 0; if (await save(u, c)) { db.ref('jobapps/' + P.id + '/' + u).remove().catch(() => { }); if (tierOf(a.role) === 4) db.ref('places/' + P.id).set({ owner: u, name: a.name || '', t: TS() }).catch(() => { }); } };
    const no = el('button', 'mini danger', 'Decline'); no.type = 'button';
    no.onclick = () => db.ref('jobapps/' + P.id + '/' + u).remove().catch(() => { });
    r.append(ok, no); row.appendChild(r); box.appendChild(row);
  }
  box.appendChild(el('div', 'rankhead', 'Staff'));
  const st = staffOf(P.id).filter((c) => c.uid !== uid() || isAdmin());
  if (!st.length) box.appendChild(el('p', 'small', 'No staff yet.'));
  for (const c of st.sort((a, b) => tierOf(b.role) - tierOf(a.role))) {
    if (tierOf(c.role) === 4) continue;
    const row = el('div', 'jobrow');
    row.appendChild(el('div', 'jobl', (c.name || '?') + ' · ' + roleInfo(P.id, c.role).name + ' · ' + since(c.since)));
    const r = el('div', 'jobr');
    const fire = el('button', 'mini danger', 'Let go'); fire.type = 'button';
    fire.onclick = async (e) => { const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Let go'; }, 3000); return; } await save(c.uid, { place: 'none', role: 't0-unemployed', since: TS(), lvl: 1, xp: 0, name: c.name || 'player' }); };
    r.appendChild(fire); row.appendChild(r); box.appendChild(row);
  }
  // the host hands out ownership (or takes it back) until there's a way to buy places
  if (isAdmin() && !P.owned) {
    box.appendChild(el('div', 'rankhead', 'Owner'));
    const row = el('div', 'inline');
    const sel = el('select'); sel.setAttribute('aria-label', 'Owner of ' + P.name);
    const o0 = el('option', '', 'Nobody (host runs it)'); o0.value = ''; sel.appendChild(o0);
    const chars = (NET().allChars ? NET().allChars() : []).slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const ch of chars) { const o = el('option', '', ch.name); o.value = ch.uid; sel.appendChild(o); }
    sel.value = owners[P.id] || '';
    const go = el('button', 'mini', 'Set owner'); go.type = 'button';
    go.onclick = async () => {
      const u = sel.value, prev = owners[P.id];
      try {
        const upd = {};
        upd['places/' + P.id] = u ? { owner: u, name: (chars.find((c) => c.uid === u) || {}).name || '', t: TS() } : null;
        if (u) upd['careers/' + u] = { place: P.id, role: 't4-owner', since: TS(), lvl: (all[u] && all[u].place === P.id && all[u].lvl) || 1, xp: (all[u] && all[u].place === P.id && all[u].xp) || 0, name: (chars.find((c) => c.uid === u) || {}).name || 'player' };
        if (prev && prev !== u) upd['careers/' + prev] = { place: 'none', role: 't0-unemployed', since: TS(), lvl: 1, xp: 0, name: (all[prev] && all[prev].name) || 'player' };
        await db.ref().update(upd); $('jobMsg').textContent = u ? 'Owner set.' : 'Nobody owns it now.';
      } catch (e) { $('jobMsg').textContent = "Couldn't change the owner. The room's Firebase rules may need updating."; }
    };
    row.append(sel, go); box.appendChild(row);
  }
  body.appendChild(box);
}
// the business card gets a job line
function renderCardLine() {
  const card = $('bizCard'); if (!card) return;
  let line = $('bizJob');
  if (!line) { line = el('div', 'bizjob'); line.id = 'bizJob'; const more = card.querySelector('.bizmore'); card.insertBefore(line, more); }
  line.textContent = mine ? jobTitle(mine) : 'No job yet';
}

// ---------------------------------------------------------------- inventory: wallet, a 20-slot pocket, and everything you own
const POCKET = 20;
// tiny pixel icons, drawn from strings ('.' = clear, letters = palette)
const ICONS = {
  key: { p: { o: '#2a1c06', g: '#e8c25a', h: '#fff1b8' }, a: ['..oooo..', '.ohggho.', '.og..go.', '.ohggho.', '..oggo..', '...gg...', '...ggo..', '...gg...', '...ggo..', '...oo...'] },
  carkey: { p: { o: '#101014', g: '#3a3a44', h: '#9a9aa8', r: '#c8143c' }, a: ['.oooooo.', 'oghhhhgo', 'ogrggrgo', 'oggggggo', '.oooooo.', '...hh...', '...hh...', '...hho..', '...hh...', '...oo...'] },
  cig: { p: { o: '#2a2a2a', w: '#f0ece0', f: '#d88a3a', e: '#ff5a1a', s: '#9a9aa0' }, a: ['......s.', '.....s..', '......s.', '........', '........', 'ooooooooo', 'wwwwwwffe', 'ooooooooo'] },
  cigar: { p: { o: '#1a0e06', b: '#6a3a1a', d: '#4a2410', r: '#c8143c', e: '#ff5a1a', s: '#9a9aa0' }, a: ['.......s', '......s.', '.......s', '........', 'oooooooo', 'bbdrrbbe', 'bbdrrbbe', 'oooooooo'] },
  martini: { p: { o: '#2a2a30', g: '#c8d4dc', l: '#d8dc98', r: '#c8143c' }, a: ['oooooooo', 'ogllllgo', '.ogllgo.', '..oggo..', '...og...', '...og...', '...og...', '.oooooo.'] },
  whiskey: { p: { o: '#2a2a30', g: '#c8d4dc', w: '#c87a2a' }, a: ['........', 'oooooooo', 'og....go', 'og....go', 'ogwwwwgo', 'ogwwwwgo', 'oggggggo', 'oooooooo'] },
  beer: { p: { o: '#2a1a06', f: '#f4f0e0', b: '#e0a030', g: '#c8d4dc' }, a: ['.ffffff.', 'offffffo', 'obbbbbbo', 'obbbbbbog', 'obbbbbbo.g', 'obbbbbbog', 'obbbbbbo', 'oooooooo'] },
  cola: { p: { o: '#1a0a06', c: '#3a1a10', g: '#c8d4dc', r: '#c8143c' }, a: ['....r...', '....r...', '.oooroo.', '.ogccgo.', '.occcco.', '.occcco.', '.occcco.', '.oooooo.'] },
  coin: { p: { o: '#5a3a06', g: '#f0c040', h: '#fff1b8' }, a: ['..oooo..', '.oghggo.', 'oghgggo.', 'oggoggo.', 'oggoggo.', 'ogggggo.', '.oggggo.', '..oooo..'] },
  shirt: { p: { o: '#101014', c: '#5a5a70', h: '#8a8aa0' }, a: ['.oo..oo.', 'ochoohco', 'occhhcco', '.occcco.', '.occcco.', '.occcco.', '.occcco.', '.oooooo.'] },
  paw: { p: { o: '#1a1206', b: '#8a5a2a' }, a: ['.o.oo.o.', 'obo..obo', '.o.bb.o.', '..obbo..', '.obbbbo.', '.obbbbo.', '..oooo..', '........'] },
  spark: { p: { o: '#3a2a06', y: '#ffd060', w: '#ffffff' }, a: ['...y....', '...y....', '..ywy...', 'yywwwyy.', '..ywy...', '...y....', '...y....', '........'] },
  cursor: { p: { o: '#140d05', g: '#c9a24e', h: '#f6e2a0' }, a: ['o.......', 'oo......', 'oho.....', 'ohgo....', 'ohggo...', 'ohgggo..', 'ohgoooo.', 'oo.go...'] },
  suit: { p: { o: '#0a0a0c', b: '#1a1a22', w: '#e8e8f0', r: '#c8143c' }, a: ['.oo..oo.', 'obwwwwbo', 'obbwrbbo', '.obwrbo.', '.obbbbo.', '.obbbbo.', '.obbbbo.', '.oooooo.'] }
};
const iconCache = {};
function icon(kind) {
  if (iconCache[kind]) return iconCache[kind];
  const I = ICONS[kind] || ICONS.spark, w = Math.max(...I.a.map((r) => r.length)), h = I.a.length, S = 3;
  const c = document.createElement('canvas'); c.width = w * S; c.height = h * S;
  const x = c.getContext('2d');
  I.a.forEach((row, j) => [...row].forEach((ch, i) => { const col = I.p[ch]; if (col) { x.fillStyle = col; x.fillRect(i * S, j * S, S, S); } }));
  return (iconCache[kind] = c.toDataURL());
}
const DRINK_NAMES = { martini: 'Martini', whiskey: 'Whiskey', beer: 'Beer', cola: 'Cola' };
function pocketItems() {
  const out = [];
  const st = BAR().getMyState ? BAR().getMyState() : null;
  if (st && st.d && DRINK_NAMES[st.d]) out.push({ k: st.d, name: DRINK_NAMES[st.d], note: 'In your hand. Charon will take it back if you ask.' });
  const sm = NET().mySmoke ? NET().mySmoke() : null;
  if (sm && sm.k && sm.e > now()) out.push({ k: sm.k === 'cigar' ? 'cigar' : 'cig', name: sm.k === 'cigar' ? 'Cigar' : 'Cigarette', note: Math.ceil((sm.e - now()) / 60000) + ' min left' });
  const room = window.HOTEL && window.HOTEL.myRoom ? window.HOTEL.myRoom() : -1;
  if (room != null && room >= 0) out.push({ k: 'key', name: 'Room ' + (201 + room) + ' key', note: 'Your hotel room upstairs.' });
  if (window.EXTRAS && window.EXTRAS.myCar && window.EXTRAS.myCar()) out.push({ k: 'carkey', name: 'Car keys', note: 'Your car is parked in the valet lot.' });
  for (const [k, n] of Object.entries(items || {})) if (+n > 0) out.push({ k: ICONS[k] ? k : 'spark', name: k.charAt(0).toUpperCase() + k.slice(1).replace(/-/g, ' '), n: +n, note: '' });
  return out;
}
function buildInv() {
  if ($('invPanel')) return;
  const p = el('section', 'panel'); p.id = 'invPanel'; p.hidden = true; p.setAttribute('aria-label', 'Inventory');
  p.innerHTML = '<header><h2>Inventory</h2><button class="x" type="button" id="invClose" aria-label="Close">✕</button></header>' +
    '<div class="wallet"><img alt="" id="invCoinIco"><b id="invCash">0</b><span class="small">sh1den coins</span></div>' +
    '<div class="rankhead">Pocket <span class="small" id="invCount"></span></div><div class="pocket" id="invPocket"></div><div class="small" id="invNote" role="status"></div>' +
    '<div class="rankhead">Owned</div><div id="invOwned" class="owned"></div>';
  $('stage').appendChild(p);
  $('invClose').onclick = () => { p.hidden = true; };
  $('invCoinIco').src = icon('coin');
}
function openInv() { buildInv(); const p = $('invPanel'); p.hidden = !p.hidden; renderInv(); }
function renderInv() {
  const p = $('invPanel'); if (!p || p.hidden) return;
  const host = isAdmin() && myName().toLowerCase() === 'sh1denfps';
  $('invCash').textContent = host ? '∞' : fmt(window.EXTRAS && window.EXTRAS.myCoins ? window.EXTRAS.myCoins() : 0);
  const its = pocketItems(), grid = $('invPocket'); grid.textContent = '';
  $('invCount').textContent = its.length + ' / ' + POCKET;
  for (let i = 0; i < POCKET; i++) {
    const it = its[i], s = el('button', 'slot' + (it ? '' : ' empty')); s.type = 'button';
    if (it) {
      const im = el('img'); im.src = icon(it.k); im.alt = ''; s.appendChild(im);
      if (it.n > 1) s.appendChild(el('span', 'qty', String(it.n)));
      s.title = it.name + (it.note ? ' · ' + it.note : '');
      s.onclick = () => { $('invNote').textContent = it.name + (it.note ? ': ' + it.note : ''); };
    } else s.setAttribute('aria-label', 'Empty slot');
    grid.appendChild(s);
  }
  // owned: clothes, pets, effects, cursors, suits
  const box = $('invOwned'); box.textContent = '';
  const S = window.SOCIAL && window.SOCIAL.catalog ? window.SOCIAL.catalog() : null, owned = window.SOCIAL && window.SOCIAL.owned ? window.SOCIAL.owned() : {};
  const groups = [['clothes', 'Clothes', 'shirt', 'outfit'], ['pets', 'Pets', 'paw', 'pet'], ['misc', 'Effects', 'spark', 'fx'], ['cursors', 'Cursors', 'cursor', 'cursor']];
  let any = false;
  for (const [tab, label, ic, slot] of groups) {
    const have = S && S[tab] ? S[tab].filter(([id]) => owned[id]) : [];
    if (!have.length) continue;
    any = true;
    box.appendChild(el('div', 'small ownhead', label));
    for (const [id, name] of have) {
      const row = el('div', 'ownrow');
      const im = el('img'); im.src = icon(ic); im.alt = ''; row.appendChild(im);
      row.appendChild(el('span', '', name));
      const on = slot === 'cursor' ? (window.CURSORS && window.CURSORS.current() === id) : (owned.eq && owned.eq[slot] === id);
      const b = el('button', 'mini', on ? 'Take off' : 'Use'); b.type = 'button';
      b.onclick = () => { if (window.SOCIAL && window.SOCIAL.useItem) window.SOCIAL.useItem(slot, on ? (slot === 'cursor' ? 'default' : 'none') : id); setTimeout(renderInv, 300); };
      row.appendChild(b); box.appendChild(row);
    }
  }
  if (!any) box.appendChild(el('p', 'small', 'Nothing yet. Clothes, pets, effects and cursors from the Game shop show up here.'));
}

// ---------------------------------------------------------------- start up
function start() {
  if (db) return;
  if (!NET().online || !NET().db || !NET().db()) return;
  db = NET().db();
  db.ref('careers/' + uid()).on('value', (s) => { mine = s.val(); loaded = true; render(); });
  db.ref('careers').on('value', (s) => { all = s.val() || {}; render(); });
  db.ref('jobapps').on('value', (s) => { apps = s.val() || {}; render(); });
  db.ref('places').on('value', (s) => { const v = s.val() || {}; owners = {}; for (const k in v) if (v[k] && v[k].owner) owners[k] = v[k].owner; render(); });
  db.ref('items/' + uid()).on('value', (s) => { items = s.val() || {}; renderInv(); });
}
function offlineStart() {
  offline = true; loaded = true;
  try { mine = JSON.parse(localStorage.getItem('sh1den-career') || 'null'); } catch (e) { mine = null; }
  render();
}
const boot = setInterval(() => {
  if (NET().online && NET().db && NET().db() && uid()) { clearInterval(boot); start(); }
}, 700);
setTimeout(() => { if (!db) { clearInterval(boot); offlineStart(); } }, 8000);
setInterval(() => { renderInv(); const p = $('jobsPanel'); if (p && !p.hidden) render(); }, 15000);

// buttons on the bottom bar, the keyboard (J = jobs, I = inventory), and "make a character" asks for a job first
function wireUi() {
  const jb = $('jobsBtn'); if (jb) jb.onclick = () => { const p = $('jobsPanel'); if (p && !p.hidden) p.hidden = true; else openJobs(); };
  const ib = $('invBtn'); if (ib) ib.onclick = openInv;
  window.addEventListener('keydown', (e) => {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyI') openInv();
    if (e.code === 'KeyJ') { const p = $('jobsPanel'); if (p && !p.hidden) p.hidden = true; else openJobs(); }
  });
  const cb = $('createBtn');
  if (cb && cb.onclick) { const orig = cb.onclick; cb.onclick = (e) => ensure(() => orig.call(cb, e)); }
  // first visit: once you're in, pick a job, then make your character
  for (const id of ['enter', 'enterQuiet']) {
    const b = $(id); if (!b) continue;
    b.addEventListener('click', () => setTimeout(() => ensure(() => { if (!(BAR().getMine && BAR().getMine()) && BAR().openCreator) BAR().openCreator(); }), 900));
  }
}
wireUi();
window.CAREERS = { PLACES, RANKS, openJobs, openPicker, openInv, ensure, mine: () => mine, title: () => jobTitle(mine), roleInfo, tierOf };
})();
