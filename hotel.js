/* SH1DEN'S — the hotel floor (rooms to rent, each with its own TV), the DJ's paid song requests (heard only in the
   dance room), and the house jazz from a YouTube link the host sets. Runs on top of net.js and bar.js. */
(function () {
'use strict';
const $ = (id) => document.getElementById(id);
const NET = () => window.NET || {}, BAR = () => window.BAR || {};
const RENT = 500, WEEK = 604800000, DJ_PRICE = 100, DISCOUNT = 0.2, DJ_MAX = 600;
const YT_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
let db = null, started = false;
let rooms = {}, roomTv = {}, djNow = null, djQ = [], jazzVid = '', myCoins = null, djDurKnown = {};
const now = () => (NET().now ? NET().now() : Date.now());
const ts = () => NET().ts();
const uid = () => NET().uid;
const isAdmin = () => !!NET().isAdmin;
const isHost = () => !!(BAR().isHost && BAR().isHost());
const myName = () => (NET().myName && NET().myName()) || '';
const live = (r) => !!(r && r.uid && r.s + r.w * WEEK > now());
function ownerOf(i) { const r = rooms[i]; return live(r) ? r.uid : null; }
function myRoom() { const u = uid(); if (!u) return -1; for (let i = 0; i < 8; i++) if (ownerOf(i) === u) return i; return -1; }
function isGuest(u) { if (!u) return false; for (let i = 0; i < 8; i++) if (ownerOf(i) === u) return true; return false; }
const hotelOpen = () => isHost() || !!(window.BAR_CONFIG && window.BAR_CONFIG.hotelOpen);
const entered = () => !!($('gate') && $('gate').hidden);
const fmt = (n) => Number(n || 0).toLocaleString();
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function panel(id, title) {
  const p = el('section', 'panel'); p.id = id; p.hidden = true;
  const h = el('header'); h.appendChild(el('h2', null, title));
  const x = el('button', 'x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = () => { p.hidden = true; };
  h.appendChild(x); p.appendChild(h);
  const body = el('div', 'hbody'); p.appendChild(body);
  $('stage').appendChild(p);
  return { p, body };
}
async function fetchTitle(id) {
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { signal: ctl.signal });
    clearTimeout(tm); if (!r.ok) return '';
    const j = await r.json(); return String(j.title || '').slice(0, 120);
  } catch (e) { return ''; }
}
const toast = (t) => BAR().toast && BAR().toast(t);

// ---------------------------------------------------------------- the hotel desk (talk to Charon)
const H = panel('hotelPanel', 'Hotel Sh1den');
function renderHotel() {
  const b = H.body; b.textContent = '';
  b.appendChild(el('p', 'small', 'Upstairs: eight rooms, each with its own TV that only you can put videos on. Guests get ' + Math.round(DISCOUNT * 100) + '% off the shop and their YouTube links jump the cinema queue. ' + fmt(RENT) + ' sh1den coins a week.'));
  if (!hotelOpen()) b.appendChild(el('p', 'note', 'The second floor is under construction. Rooms open soon.'));
  else if (isHost() && !(window.BAR_CONFIG && window.BAR_CONFIG.hotelOpen)) b.appendChild(el('p', 'note', 'Host preview: only you can go up while it\'s under construction.'));
  const mine = myRoom(), ul = el('ul', 'hotelList');
  for (let i = 0; i < 8; i++) {
    const r = rooms[i], li = el('li'), num = 201 + i;
    li.appendChild(el('b', null, String(num)));
    const st = el('span', 'hst');
    if (live(r)) st.textContent = (r.uid === uid() ? 'Yours' : 'Taken by ' + r.name) + ' · until ' + new Date(r.s + r.w * WEEK).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    else st.textContent = 'Free';
    li.appendChild(st);
    const btn = (label, fn, cls, off) => { const x = el('button', 'mini ' + (cls || ''), label); x.type = 'button'; x.disabled = !!off; x.onclick = fn; li.appendChild(x); };
    if (live(r) && r.uid === uid()) {
      btn('Renew +1 week', () => rent(i, true), 'primary', !hotelOpen());
      btn('Go to my room', () => { H.p.hidden = true; BAR().setView('room' + i); }, '', !hotelOpen());
    } else if (!live(r)) {
      const broke = !isAdmin() && ((myCoins && myCoins.n) || 0) < RENT;
      btn('Rent · ' + fmt(RENT) + ' 🪙', () => rent(i, false), 'primary', !hotelOpen() || mine >= 0 || broke || !myName());
    }
    ul.appendChild(li);
  }
  b.appendChild(ul);
  const msg = el('div', 'msg'); msg.id = 'hotelMsg'; msg.setAttribute('role', 'status'); b.appendChild(msg);
}
async function rent(i, renew) {
  const m = $('hotelMsg'), u = uid(), r = rooms[i];
  if (!db || !u || !myName()) { if (m) m.textContent = 'Make your character first.'; return; }
  const upd = {};
  upd['hotel/rooms/' + i] = renew && live(r) && r.uid === u ? { uid: u, name: myName(), s: r.s, w: r.w + 1 } : { uid: u, name: myName(), s: ts(), w: 1 };
  upd['hotelguest/' + u] = { r: String(i) };
  if (!isAdmin()) {
    const have = (myCoins && +myCoins.n) || 0;
    if (have < RENT) { if (m) m.textContent = 'Not enough sh1den coins.'; return; }
    upd['coins/' + u + '/n'] = have - RENT; upd['coins/' + u + '/s'] = ((myCoins && +myCoins.s) || 0) + RENT;
  }
  try { await db.ref().update(upd); if (m) m.textContent = renew ? 'Renewed for another week.' : 'Room ' + (201 + i) + ' is yours. The key\'s at the desk.'; toast(renew ? 'Room renewed.' : 'You rented room ' + (201 + i) + '.'); }
  catch (e) { if (m) m.textContent = "Couldn't book it. The room's Firebase rules may need updating."; }
}
function openHotel() { renderHotel(); H.p.hidden = false; }
// a button for it in Charon's menu
function addCharonButton() {
  const dm = $('drinkMenu'); if (!dm || $('dmHotel')) return;
  const b = el('button', null, '🛎 Hotel rooms'); b.type = 'button'; b.id = 'dmHotel';
  b.onclick = () => { dm.hidden = true; openHotel(); };
  const quiet = dm.querySelector('button.quiet'); dm.insertBefore(b, quiet || null);
}

// ---------------------------------------------------------------- the DJ: pay to play your song (audio only, dance room only)
const D = panel('djPanel', 'Request a song');
function renderDj() {
  const b = D.body; b.textContent = '';
  b.appendChild(el('p', 'small', 'Pay the DJ ' + fmt(DJ_PRICE) + ' sh1den coins and he\'ll play your song. Paste a YouTube link; only the sound plays, and only in the dance room. Songs up to 10 minutes. Hotel guests skip the line.'));
  const row = el('div', 'inline'); const inp = el('input'); inp.id = 'djInput'; inp.placeholder = 'https://youtube.com/watch?v=…'; inp.setAttribute('aria-label', 'YouTube link');
  const go = el('button', 'primary', isAdmin() ? 'Play (free)' : 'Pay ' + fmt(DJ_PRICE) + ' 🪙'); go.type = 'button'; go.onclick = () => requestSong(inp.value);
  row.append(inp, go); b.appendChild(row);
  const msg = el('div', 'msg'); msg.id = 'djMsg'; msg.setAttribute('role', 'status'); b.appendChild(msg);
  b.appendChild(el('h3', null, 'Now playing'));
  b.appendChild(el('p', 'small', djNow ? (djNow.title || 'A request') + ' · from ' + djNow.name : 'The DJ\'s own set.'));
  if (djNow && isAdmin()) { const sk = el('button', 'mini danger', 'Skip this song'); sk.type = 'button'; sk.onclick = () => advanceDj(true); b.appendChild(sk); }
  if (djQ.length) {
    b.appendChild(el('h3', null, 'Up next'));
    const ol = el('ol', 'djq');
    for (const q of orderedQueue()) {
      const li = el('li', null, (q.title || 'A request') + ' · ' + q.name + (isGuest(q.uid) ? ' ★' : ''));
      if (isAdmin() || q.uid === uid()) { const x = el('button', 'mini', 'Remove'); x.type = 'button'; x.onclick = () => db.ref('djq/' + q.key).remove().catch(() => { }); li.appendChild(x); }
      ol.appendChild(li);
    }
    b.appendChild(ol);
  }
}
const orderedQueue = () => djQ.filter((q) => isGuest(q.uid)).concat(djQ.filter((q) => !isGuest(q.uid)));
async function requestSong(text) {
  const m = $('djMsg'), match = String(text || '').match(YT_RE), u = uid();
  if (!match) { m.textContent = "That isn't a YouTube link."; return; }
  if (!db || !u || !myName()) { m.textContent = 'Make your character first.'; return; }
  if (djQ.filter((q) => q.uid === u).length >= 2 && !isAdmin()) { m.textContent = 'You already have two songs waiting.'; return; }
  const have = (myCoins && +myCoins.n) || 0;
  if (!isAdmin() && have < DJ_PRICE) { m.textContent = 'Not enough sh1den coins.'; return; }
  m.textContent = 'Handing the DJ your song…';
  const title = await fetchTitle(match[1]), key = db.ref('djq').push().key, upd = {};
  upd['djq/' + key] = Object.assign({ v: match[1], uid: u, name: myName(), t: ts() }, title ? { title } : {});
  if (!isAdmin()) { upd['coins/' + u + '/n'] = have - DJ_PRICE; upd['coins/' + u + '/s'] = ((myCoins && +myCoins.s) || 0) + DJ_PRICE; }
  try { await db.ref().update(upd); m.textContent = 'The DJ nods. Your song is in the queue.'; $('djInput').value = ''; if (NET().say) NET().say('🎵 paid the DJ to play ' + (title ? '"' + title + '"' : 'a song')); }
  catch (e) { m.textContent = "Couldn't send it. The room's Firebase rules may need updating."; }
}
let djAdvancing = 0;
function advanceDj(force) {
  if (!db || Date.now() - djAdvancing < 4000) return;
  djAdvancing = Date.now();
  const q = orderedQueue()[0], upd = {};
  upd['dj/now'] = q ? Object.assign({ v: q.v, id: q.key, uid: q.uid, name: q.name, at: ts() }, q.title ? { title: String(q.title).slice(0, 150) } : {}) : null;
  if (q) upd['djq/' + q.key] = null;
  db.ref().update(upd).catch(() => { if (force) toast("Couldn't skip it."); });
}
// a little menu at the DJ: request a song, or change the house music
let menuEl = null;
function openDjMenu(x, y) {
  if (!menuEl) {
    menuEl = el('div'); menuEl.id = 'npcMenu'; menuEl.setAttribute('role', 'menu'); menuEl.hidden = true; $('stage').appendChild(menuEl);
    document.addEventListener('pointerdown', (e) => { if (menuEl && !menuEl.hidden && !menuEl.contains(e.target)) menuEl.hidden = true; });
  }
  menuEl.textContent = '';
  menuEl.appendChild(el('div', 'dmTitle', 'The DJ'));
  const item = (label, fn) => { const b = el('button', null, label); b.type = 'button'; b.onclick = () => { menuEl.hidden = true; fn(); }; menuEl.appendChild(b); };
  item('🎵 Pay to play your song (' + fmt(DJ_PRICE) + ' 🪙)', () => { renderDj(); D.p.hidden = false; });
  item('🎶 Change the house music', () => BAR().changeMusic && BAR().changeMusic());
  if (djNow && isAdmin()) item('⏭ Skip the request', () => advanceDj(true));
  const r = $('stage').getBoundingClientRect();
  menuEl.hidden = false;
  menuEl.style.left = Math.max(12, Math.min(r.width - 240, x - r.left + 10)) + 'px';
  menuEl.style.top = Math.max(60, Math.min(r.height - 180, y - r.top - 40)) + 'px';
}

// ---------------------------------------------------------------- room TVs (only the room's guest posts; you hear it only in the room)
const T = panel('roomTvPanel', 'Your TV');
let tvRoom = -1;
function openRoomTv(i) {
  tvRoom = i;
  const b = T.body; b.textContent = '';
  const mine = ownerOf(i) === uid() || isHost();
  b.appendChild(el('p', 'small', mine ? 'Paste a YouTube link to put it on your TV. Only people in your room can hear it.' : 'This is someone else\'s TV.'));
  if (mine) {
    const row = el('div', 'inline'), inp = el('input'); inp.placeholder = 'https://youtube.com/watch?v=…'; inp.setAttribute('aria-label', 'YouTube link');
    const go = el('button', 'primary', 'Play'); go.type = 'button';
    const msg = el('div', 'msg');
    go.onclick = async () => {
      const m = String(inp.value).match(YT_RE); if (!m) { msg.textContent = "That isn't a YouTube link."; return; }
      try { await db.ref('hotel/tv/' + i).set({ v: m[1], at: ts(), name: myName() || 'guest' }); msg.textContent = 'Playing.'; inp.value = ''; }
      catch (e) { msg.textContent = "Couldn't play it. The room's Firebase rules may need updating."; }
    };
    row.append(inp, go); b.appendChild(row);
    const stop = el('button', 'mini', 'Turn the TV off'); stop.type = 'button'; stop.onclick = () => db.ref('hotel/tv/' + i).remove().then(() => { msg.textContent = 'TV off.'; }).catch(() => { });
    b.append(stop, msg);
  }
  T.p.hidden = false;
}

// ---------------------------------------------------------------- house jazz (host sets a YouTube link; it loops as the bar's default music)
function addHostJazz() {
  const box = $('adminBox'); if (!box || $('jazzBox')) return;
  const w = el('div'); w.id = 'jazzBox';
  w.innerHTML = '<h3>House jazz</h3><p class="small">Paste a YouTube link (a long royalty-free jazz mix works best). It loops as the bar\'s default music, quietly, for everyone.</p>' +
    '<div class="inline"><input id="jazzInput" placeholder="https://youtube.com/watch?v=…" aria-label="Jazz YouTube link"><button type="button" id="jazzSet" class="primary">Use it</button></div>' +
    '<div class="row"><button type="button" id="jazzOff" class="mini">Back to the built-in jazz</button></div><div class="msg" id="jazzMsg"></div>';
  const remove = $('remWho') ? $('remWho').closest('.donate') : null;
  if (remove && remove.nextSibling) box.insertBefore(w, remove.nextSibling); else box.appendChild(w);
  $('jazzSet').onclick = () => {
    const m = String($('jazzInput').value).match(YT_RE); if (!m) { $('jazzMsg').textContent = "That isn't a YouTube link."; return; }
    db.ref('music/jazz').set(m[1]).then(() => { $('jazzMsg').textContent = 'The bar is playing it now.'; $('jazzInput').value = ''; }).catch(() => { $('jazzMsg').textContent = "Couldn't set it. The room's Firebase rules may need updating."; });
  };
  $('jazzOff').onclick = () => db.ref('music/jazz').remove().then(() => { $('jazzMsg').textContent = 'Built-in jazz is back.'; }).catch(() => { });
}

// ---------------------------------------------------------------- the three hidden players
const P = { dj: null, jazz: null, room: null }, ready = { dj: false, jazz: false, room: false }, loaded = { dj: '', jazz: '', room: '' };
let djDurNow = 0;
function makePlayers() {
  if (!window.YT || !window.YT.Player || P.dj) return !!P.dj;
  const vars = { controls: 0, disablekb: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, modestbranding: 1, origin: location.origin };
  P.dj = new YT.Player('djPlayer', { width: 240, height: 240, playerVars: vars, events: { onReady: () => { ready.dj = true; }, onStateChange: (e) => { if (e.data === 0) djEnded(); } } });
  P.jazz = new YT.Player('jazzPlayer', { width: 240, height: 240, playerVars: vars, events: { onReady: () => { ready.jazz = true; }, onStateChange: (e) => { if (e.data === 0 && P.jazz) { P.jazz.seekTo(0, true); P.jazz.playVideo(); } } } });
  if ($('roomPlayer')) P.room = new YT.Player('roomPlayer', { width: 960, height: 540, playerVars: vars, events: { onReady: () => { ready.room = true; }, onStateChange: () => { } } });
  return true;
}
function djEnded() {
  if (!djNow || !ready.dj) return;
  const ct = P.dj.getCurrentTime ? P.dj.getCurrentTime() : 0, d = djDurNow || P.dj.getDuration();
  if (d && ct >= d - 3) advanceDj(); else P.dj.playVideo();
}
function audioTick() {
  if (!started) return;
  makePlayers();
  const info = BAR().jukeInfo ? BAR().jukeInfo() : { muted: true }, on = entered() && !info.muted;
  const view = BAR().viewRoom ? BAR().viewRoom() : '';
  // the DJ's request: loaded for everyone so it stays in time, heard only in the dance room
  if (djNow && ready.dj) {
    const key = djNow.id, exp = Math.max(0, (now() - djNow.at) / 1000);
    if (loaded.dj !== key) { loaded.dj = key; djDurNow = djDurKnown[key] || 0; P.dj.loadVideoById({ videoId: djNow.v, startSeconds: exp }); }
    const hear = on && view === 'dance';
    P.dj.setVolume(70); if (hear) P.dj.unMute(); else P.dj.mute();
    BAR().duck && BAR().duck('dj', hear);
    const st = P.dj.getPlayerState();
    if (st === 1) {
      const d = P.dj.getDuration();
      if (d > 0 && !djDurNow) { djDurNow = d; if (!djDurKnown[key]) { djDurKnown[key] = d; if (d > DJ_MAX) { toast('That song is longer than 10 minutes, so the DJ skipped it.'); advanceDj(); } else db.ref('dj/dur/' + key).set(Math.round(d)).catch(() => { }); } }
      if (Math.abs(P.dj.getCurrentTime() - exp) > 4 && (!djDurNow || exp < djDurNow - 2)) P.dj.seekTo(exp, true);
    } else if (st === 2 || st === 5 || st === -1) P.dj.playVideo();
    if ((djDurNow && exp > djDurNow + 3) || (!djDurNow && exp > DJ_MAX + 60)) advanceDj();
  } else {
    if (ready.dj && loaded.dj) { P.dj.stopVideo(); loaded.dj = ''; }
    BAR().duck && BAR().duck('dj', false);
    if (!djNow && djQ.length && entered()) advanceDj();
  }
  // house jazz: plays where the built-in jazz would
  if (BAR().setExtJazz) BAR().setExtJazz(!!jazzVid);
  if (ready.jazz) {
    const want = !!jazzVid && on && info.track === 0 && !info.ducked;
    if (jazzVid && loaded.jazz !== jazzVid) { loaded.jazz = jazzVid; P.jazz.cueVideoById({ videoId: jazzVid }); }
    if (!jazzVid && loaded.jazz) { P.jazz.stopVideo(); loaded.jazz = ''; }
    if (jazzVid) {
      P.jazz.setVolume(32);
      const st = P.jazz.getPlayerState();
      if (want && st !== 1 && st !== 3) { P.jazz.unMute(); P.jazz.playVideo(); }
      if (!want && st === 1) P.jazz.pauseVideo();
    }
  }
  // the hotel room TV the camera is in
  const ri = BAR().viewHotelRoom ? BAR().viewHotelRoom() : -1, tv = ri >= 0 ? roomTv[ri] : null;
  if ($('roomIdle')) $('roomIdle').hidden = !!tv;
  if (ready.room) {
    if (tv) {
      const key = ri + ':' + tv.v + '@' + tv.at, exp = Math.max(0, (now() - tv.at) / 1000);
      if (loaded.room !== key) { loaded.room = key; P.room.loadVideoById({ videoId: tv.v, startSeconds: exp }); }
      P.room.setVolume(70); if (on) P.room.unMute(); else P.room.mute();
      const st = P.room.getPlayerState(); if (st === 2 || st === 5) P.room.playVideo();
    } else if (loaded.room) { P.room.stopVideo(); loaded.room = ''; }
  }
  BAR().duck && BAR().duck('room', !!tv && on);
}

// ---------------------------------------------------------------- start
let defaulted = false;
function start() {
  if (started) return;
  db = NET().db ? NET().db() : null; if (!db || !uid()) return;
  started = true;
  db.ref('hotel/rooms').on('value', (s) => { rooms = s.val() || {}; if (!H.p.hidden) renderHotel(); maybeDefaultRoom(); });
  db.ref('hotel/tv').on('value', (s) => { roomTv = s.val() || {}; });
  db.ref('dj/now').on('value', (s) => { djNow = s.val(); if (!D.p.hidden) renderDj(); });
  db.ref('djq').orderByKey().limitToFirst(40).on('value', (s) => { djQ = []; s.forEach((c) => { const v = c.val(); if (v && v.v) djQ.push(Object.assign({ key: c.key }, v)); }); if (!D.p.hidden) renderDj(); });
  db.ref('dj/dur').on('child_added', (s) => { djDurKnown[s.key] = s.val(); });
  db.ref('music/jazz').on('value', (s) => { jazzVid = s.val() || ''; });
  db.ref('coins/' + uid()).on('value', (s) => { myCoins = s.val(); });
  setInterval(audioTick, 700);
  setInterval(() => { addCharonButton(); if (isAdmin()) addHostJazz(); }, 1500);
}
// coming in: if you have a room upstairs, you start in it
function maybeDefaultRoom() {
  if (defaulted || !entered() || !hotelOpen()) return;
  const i = myRoom(); if (i < 0) return;
  defaulted = true; BAR().setView && BAR().setView('room' + i);
}
setInterval(() => { start(); if (started) maybeDefaultRoom(); }, 800);

window.HOTEL = { ownerOf, myRoom, isGuest: (u) => isGuest(u), discount: (u) => (isGuest(u) ? DISCOUNT : 0), openHotel, openDjMenu, openRoomTv };
})();
