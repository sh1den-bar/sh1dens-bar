/* SH1DEN'S — room layer: saved characters, room chat and the shared YouTube TV (Firebase Realtime Database). */
(function () {
'use strict';
const cfg = window.BAR_CONFIG || {};
const $ = (id) => document.getElementById(id);
const NET = window.NET = { online: false, uid: null, isAdmin: false };
const MAX_LEN = 200;
const SLOW_MS = Math.max(3, cfg.slowModeSeconds || 3) * 1000;
const MAX_QUEUE = cfg.maxQueue || 25;
const MAX_PER_USER = cfg.maxQueuePerUser || 3;
const BLOCK = (cfg.blockedWords || []).map((w) => String(w).toLowerCase()).filter(Boolean);
const YT_RE = /(?:youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

let db = null, TS = null, offset = 0, banned = false, myName = null, lastSend = 0, joinedAt = Date.now();
let current = null, queue = [], curDur = 0, durWritten = false, errored = false, tooLong = false, advancing = false;
let player = null, playerReady = false, loadedId = null, entered = false, mutedAll = false, tvVolume = 70;
let msgs = [], triedLocalSave = false;
let allChars = [], online = new Set(), lastCrowdKey = '';
// only people who have the bar open right now are shown (the bartender is always there)
function pushCrowd() {
  const here = allChars.filter((e) => online.has(e.uid) || e.uid === NET.uid).slice(-80);
  const key = here.map((e) => e.uid + e.name + e.code).join('|');
  if (key === lastCrowdKey) return;
  lastCrowdKey = key;
  window.BAR.setRegulars(here);
}

// ---------------------------------------------------------------- helpers
const now = () => Date.now() + offset;
function status(t) { $('roomStatus').textContent = t; }
function hint(t) { $('chatHint').textContent = t || ''; }
function tvMsg(t) { $('tvMsg').textContent = t || ''; }
function clean(text) {
  let out = String(text);
  for (const w of BLOCK) out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => '*'.repeat(m.length));
  return out;
}
function nameColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const pal = ['#ff8a5a', '#ffb060', '#e9d27a', '#9fd0a8', '#8fc1e8', '#c9a5f0', '#f093b0', '#d6cec2'];
  return pal[h % pal.length];
}
function fmtTime(sec) { sec = Math.max(0, Math.floor(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function configured() {
  const f = cfg.firebase;
  return !!(f && f.apiKey && !/^PASTE/i.test(f.apiKey) && f.databaseURL && window.firebase && window.firebase.database);
}
function friendly(e) {
  const c = (e && (e.code || e.message)) || '';
  if (/permission/i.test(c)) {
    if (banned) return "You're banned from this room.";
    return 'Not allowed right now. You may be posting too fast, so wait a few seconds.';
  }
  return 'Something went wrong. Try again in a moment.';
}

// ---------------------------------------------------------------- startup
NET.start = function () {
  wireUI();
  updateComposer();
  if (!configured()) {
    status('Room offline');
    hint('The room chat and TV are not set up yet. Characters are saved in this browser only.');
    showIdle(true, 'TV offline');
    return;
  }
  try { firebase.initializeApp(cfg.firebase); } catch (e) { /* already initialised */ }
  db = firebase.database();
  TS = firebase.database.ServerValue.TIMESTAMP;
  status('Connecting…');
  firebase.auth().onAuthStateChanged((u) => { if (u && !NET.uid) { NET.uid = u.uid; joined(); } });
  firebase.auth().signInAnonymously().catch((e) => {
    status('Room offline');
    hint("Couldn't join the room (" + (e.code || 'error') + ').');
  });
  loadYouTube();
};

function joined() {
  NET.online = true;
  joinedAt = Date.now();
  $('myId').textContent = NET.uid;
  window.BAR.setMyUid(NET.uid);
  db.ref('.info/serverTimeOffset').on('value', (s) => { offset = s.val() || 0; });
  db.ref('admins/' + NET.uid).on('value', (s) => { NET.isAdmin = s.exists(); $('adminBox').hidden = !NET.isAdmin; window.BAR.setMod(NET.isAdmin); renderChat(); renderQueue(); renderNow(); });
  db.ref('bans/' + NET.uid).on('value', (s) => { banned = s.exists(); updateComposer(); });

  const pres = db.ref('presence/' + NET.uid);
  db.ref('.info/connected').on('value', (s) => {
    if (s.val()) { pres.onDisconnect().remove(); pres.set(true); }
    else status('Reconnecting…');
  });
  // re-mark ourselves as here every minute, in case another tab of ours closed and cleared it
  setInterval(() => { pres.set(true).catch(() => { }); }, 60000);
  db.ref('presence').on('value', (s) => {
    const n = s.numChildren();
    status(n === 1 ? '1 here now' : n + ' here now');
    online = new Set(); s.forEach((c) => { online.add(c.key); });
    pushCrowd();
  });

  db.ref('chars').on('value', (s) => {
    const list = [];
    s.forEach((c) => { const v = c.val() || {}; list.push({ uid: c.key, name: v.name, code: v.code, t: v.t || 0 }); });
    allChars = list.sort((a, b) => a.t - b.t);
    pushCrowd();
    const mine = allChars.find((e) => e.uid === NET.uid);
    myName = mine ? mine.name : null;
    if (mine) window.BAR.setMine({ name: mine.name, code: mine.code });
    else if (!triedLocalSave) {
      // a character made while the room was offline: try to bring it into the room
      triedLocalSave = true;
      const local = window.BAR.getMine();
      if (local) NET.saveChar(local.name, local.code, null);
    }
    updateComposer();
  });

  const chat = db.ref('chat').limitToLast(60);
  chat.on('child_added', (s) => {
    const v = s.val(); if (!v || typeof v.text !== 'string') return;
    msgs.push({ key: s.key, uid: v.uid, name: v.name, text: v.text, t: v.t });
    if (msgs.length > 60) msgs.shift();
    renderChat();
    if (v.t && v.t > joinedAt + offset - 4000) window.BAR.bubble(v.uid, clean(v.text));
  });
  chat.on('child_removed', (s) => { msgs = msgs.filter((m) => m.key !== s.key); renderChat(); });

  db.ref('tv/current').on('value', (s) => {
    const v = s.val();
    current = v && v.v ? v : null;
    syncTv();
    renderNow();
  });
  db.ref('tv/queue').orderByKey().limitToFirst(MAX_QUEUE + 5).on('value', (s) => {
    queue = [];
    s.forEach((c) => { const v = c.val(); if (v && v.v) queue.push(Object.assign({ key: c.key }, v)); });
    renderQueue();
    if (!current && queue.length) advance(null);
  });
  setInterval(driftCheck, 4000);
  setInterval(renderNow, 1000);
}

// ---------------------------------------------------------------- characters
NET.saveChar = async function (name, code, oldName) {
  if (!db || !NET.uid) return { ok: false, msg: 'Still connecting to the room. Try again in a second.' };
  if (banned) return { ok: false, msg: "You're banned from this room." };
  const lower = name.toLowerCase();
  try {
    const owner = await db.ref('names/' + lower).once('value');
    if (owner.exists() && owner.val() !== NET.uid) return { ok: false, msg: 'That name is already taken. If it is yours, ask sh1denfps in Twitch chat.' };
  } catch (e) { /* fall through to the write, which the rules check anyway */ }
  const upd = {};
  upd['names/' + lower] = NET.uid;
  if (oldName && oldName.toLowerCase() !== lower) {
    try { const o = await db.ref('names/' + oldName.toLowerCase()).once('value'); if (o.val() === NET.uid) upd['names/' + oldName.toLowerCase()] = null; } catch (e) { }
  }
  upd['chars/' + NET.uid] = { name, code, t: TS };
  try {
    await db.ref().update(upd);
    myName = name; updateComposer();
    return { ok: true };
  } catch (e) {
    if (lower === 'sh1denfps') return { ok: false, msg: 'That name belongs to the host.' };
    return { ok: false, msg: "Couldn't save your character. " + friendly(e) };
  }
};
NET.onCharSaved = function () { updateComposer(); };

// ---------------------------------------------------------------- chat
function canPost(target) {
  const say = target === 'tv' ? tvMsg : hint;
  if (!NET.online) { say('The room is offline right now.'); return false; }
  if (banned) { say("You're banned from this room."); return false; }
  if (!myName) { say('Create your character first, then you can post.'); window.BAR.openCreator(); return false; }
  const wait = lastSend + SLOW_MS - Date.now();
  if (wait > 0 && !NET.isAdmin) { say('Slow mode: wait ' + Math.ceil(wait / 1000) + 's.'); return false; }
  return true;
}
async function sendChat(text) {
  text = text.trim();
  if (!text) return;
  if (/^\/tv\s+/i.test(text)) { const ok = await queueVideo(text.replace(/^\/tv\s+/i, '')); if (ok) $('chatInput').value = ''; return; }
  if (!canPost('chat')) return;
  const key = db.ref('chat').push().key;
  const upd = {};
  upd['chat/' + key] = { uid: NET.uid, name: myName, text: clean(text).slice(0, MAX_LEN), t: TS };
  upd['last/' + NET.uid] = TS;
  lastSend = Date.now();
  try { await db.ref().update(upd); $('chatInput').value = ''; hint(''); }
  catch (e) { hint(friendly(e)); }
}
function renderChat() {
  const log = $('chatLog');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.textContent = '';
  if (!msgs.length) {
    const li = document.createElement('li'); li.className = 'sys';
    li.textContent = NET.online ? 'No messages yet. Say hi.' : 'Chat is offline.';
    log.appendChild(li);
  }
  for (const m of msgs) {
    const li = document.createElement('li');
    const nm = document.createElement('b'); nm.textContent = (m.name || 'someone') + ' '; nm.style.color = nameColor(m.name || '');
    const tx = document.createElement('span'); tx.textContent = clean(m.text);
    li.append(nm, tx);
    const yt = m.text.match(YT_RE);
    if (yt) {
      const q = document.createElement('button'); q.type = 'button'; q.className = 'mini'; q.textContent = '▶ Queue on TV';
      q.onclick = () => queueVideo('https://youtu.be/' + yt[1]);
      li.appendChild(q);
    }
    if (NET.isAdmin) {
      const del = document.createElement('button'); del.type = 'button'; del.className = 'mini'; del.textContent = 'Delete';
      del.onclick = () => db.ref('chat/' + m.key).remove().catch((e) => hint(friendly(e)));
      li.appendChild(del);
      if (m.uid && m.uid !== NET.uid) {
        const ban = document.createElement('button'); ban.type = 'button'; ban.className = 'mini danger'; ban.textContent = 'Ban';
        ban.onclick = () => armBan(ban, m);
        li.appendChild(ban);
      }
    }
    log.appendChild(li);
  }
  if (atBottom) log.scrollTop = log.scrollHeight;
}
function armBan(btn, m) {
  if (btn.dataset.armed) { banUser(m.uid, m.name); return; }
  btn.dataset.armed = '1'; btn.textContent = 'Confirm ban';
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Ban'; } }, 4000);
}
async function banUser(uid, name) {
  const upd = {};
  upd['bans/' + uid] = true;
  upd['chars/' + uid] = null;
  if (name) upd['names/' + name.toLowerCase()] = null;
  for (const m of msgs) if (m.uid === uid) upd['chat/' + m.key] = null;
  for (const q of queue) if (q.uid === uid) upd['tv/queue/' + q.key] = null;
  try { await db.ref().update(upd); hint(name + ' was banned.'); } catch (e) { hint(friendly(e)); }
}
function updateComposer() {
  const inp = $('chatInput'), send = $('chatSend');
  let ph = 'Say something… (paste a YouTube link with /tv)', off = false;
  if (!NET.online) { ph = 'Chat is offline'; off = true; }
  else if (banned) { ph = "You're banned from this room"; off = true; }
  else if (!myName) { ph = 'Create your character to chat'; }
  inp.placeholder = ph; inp.disabled = off; send.disabled = off;
  $('tvInput').disabled = off; $('tvAdd').disabled = off;
}

// ---------------------------------------------------------------- TV queue
async function fetchTitle(id) {
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { signal: ctl.signal });
    clearTimeout(tm);
    if (!r.ok) return '';
    const j = await r.json();
    return String(j.title || '').slice(0, 120);
  } catch (e) { return ''; }
}
async function queueVideo(text) {
  const m = String(text).match(YT_RE);
  if (!m) { tvMsg("That isn't a YouTube link."); return false; }
  if (!canPost('tv')) return false;
  const id = m[1];
  if (!NET.isAdmin) {
    if (queue.length >= MAX_QUEUE) { tvMsg('The queue is full. Try again later.'); return false; }
    if (queue.filter((q) => q.uid === NET.uid).length >= MAX_PER_USER) { tvMsg('You already have ' + MAX_PER_USER + ' videos in the queue.'); return false; }
  }
  if ((current && current.v === id) || queue.some((q) => q.v === id)) { tvMsg("That video is already on the TV's list."); return false; }
  tvMsg('Adding…');
  const title = await fetchTitle(id);
  const key = db.ref('tv/queue').push().key;
  const upd = {};
  upd['tv/queue/' + key] = { v: id, uid: NET.uid, name: myName, title, t: TS };
  upd['last/' + NET.uid] = TS;
  lastSend = Date.now();
  try { await db.ref().update(upd); tvMsg('Added to the queue.'); $('tvInput').value = ''; return true; }
  catch (e) { tvMsg(friendly(e)); return false; }
}
function renderQueue() {
  const ol = $('tvQueue'); ol.textContent = '';
  $('tvQueueEmpty').hidden = queue.length > 0;
  queue.forEach((q, i) => {
    const li = document.createElement('li');
    const t = document.createElement('span'); t.className = 'qt'; t.textContent = (i + 1) + '. ' + (q.title || 'YouTube video');
    const by = document.createElement('span'); by.className = 'qb'; by.textContent = 'from ' + (q.name || 'someone');
    li.append(t, by);
    if (NET.isAdmin || q.uid === NET.uid) {
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'mini'; rm.textContent = 'Remove';
      rm.onclick = () => db.ref('tv/queue/' + q.key).remove().catch((e) => tvMsg(friendly(e)));
      li.appendChild(rm);
    }
    ol.appendChild(li);
  });
}
function renderNow() {
  const title = $('tvNow'), meta = $('tvBy');
  $('tvSkip').hidden = !(NET.isAdmin && current);
  if (!current) { title.textContent = 'Nothing playing'; meta.textContent = 'Post a YouTube link to start the TV.'; return; }
  let t = current.title;
  if (!t && playerReady && player.getVideoData) { const d = player.getVideoData(); t = d && d.title; }
  title.textContent = t || 'YouTube video';
  const pos = (now() - current.at) / 1000;
  meta.textContent = 'from ' + (current.name || 'someone') + ' · ' + fmtTime(pos) + (curDur ? ' / ' + fmtTime(curDur) : '');
}
function advance(endedId) {
  if (!db || advancing) return;
  if (endedId !== (current ? current.id : null)) return;
  advancing = true; setTimeout(() => { advancing = false; }, 3000);
  const q = queue[0], upd = {};
  upd['tv/current'] = q ? { v: q.v, id: q.key, uid: q.uid, name: q.name || 'someone', title: (q.title || '').slice(0, 150), at: TS } : null;
  if (q) upd['tv/queue/' + q.key] = null;
  // other visitors may advance at the same moment; the database rules let only the first one through
  db.ref().update(upd).catch(() => { });
}

// ---------------------------------------------------------------- TV player (YouTube IFrame API)
function showIdle(on, text) {
  $('tvIdle').hidden = !on;
  if (text) $('tvIdleText').textContent = text;
}
function loadYouTube() {
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('ytPlayer', {
      width: 960, height: 540,
      playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, iv_load_policy: 3, fs: 0, modestbranding: 1, origin: location.origin },
      events: {
        onReady: () => { playerReady = true; applyVolume(); syncTv(true); },
        onStateChange: onState,
        onError: () => {
          errored = true;
          tvMsg("This video can't play on the TV. It will be skipped shortly.");
        }
      }
    });
  };
  const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
}
const expected = () => (current ? (now() - current.at) / 1000 : 0);
function syncTv(force) {
  if (force) loadedId = null;
  if (!current) {
    if (playerReady && loadedId) player.stopVideo();
    loadedId = null; curDur = 0;
    showIdle(true, NET.online ? 'Post a YouTube link in the room chat' : 'TV offline');
    window.BAR.setDucked(false); window.BAR.setTvOn(false);
    return;
  }
  showIdle(false);
  window.BAR.setTvOn(true);
  updateDuck();
  if (!playerReady) return;
  if (loadedId !== current.id) {
    loadedId = current.id; curDur = 0; durWritten = false; errored = false; tooLong = false;
    const start = Math.max(0, expected());
    if (entered) player.loadVideoById({ videoId: current.v, startSeconds: start });
    else player.cueVideoById({ videoId: current.v, startSeconds: start });
    applyVolume();
    const id = current.id;
    db.ref('tv/dur/' + id).once('value', (s) => { if (s.exists() && current && current.id === id) { curDur = s.val(); durWritten = true; } });
  }
}
function onState(e) {
  if (!current) return;
  if (e.data === 1) {
    const d = player.getDuration();
    if (d > 0 && !curDur) curDur = d;
    if (d > 0 && !durWritten) {
      durWritten = true;
      db.ref('tv/dur/' + current.id).set(Math.round(d)).catch(() => {
        // too long for the room's limit: the rules then let anyone skip it after 30 seconds
        tooLong = true;
        tvMsg('This video is longer than the room allows. It will be skipped.');
      });
    }
    renderNow();
  } else if (e.data === 0) {
    advance(current.id);
  }
}
function driftCheck() {
  if (!current || !playerReady || !entered) return;
  const exp = expected();
  if (curDur && exp > curDur + 2) { advance(current.id); return; }
  if (exp > 31 && (errored || tooLong || !curDur)) { const st = player.getPlayerState(); if (errored || tooLong || st !== 1) { advance(current.id); return; } }
  const st = player.getPlayerState();
  if (st === 1 || st === 2 || st === 3) {
    const ct = player.getCurrentTime();
    if (Math.abs(ct - exp) > 2.5 && (!curDur || exp < curDur - 1)) player.seekTo(exp, true);
  }
  if (st === 2 || st === 5 || st === -1) player.playVideo();
}
function applyVolume() {
  if (!playerReady) return;
  player.setVolume(tvVolume);
  if (mutedAll || tvVolume === 0) player.mute(); else player.unMute();
  updateDuck();
}
function updateDuck() { window.BAR.setDucked(!!current && entered && !mutedAll && tvVolume > 0); }
NET.setMuted = function (m) { mutedAll = !!m; applyVolume(); };
NET.onEnter = function (withSound) { entered = true; mutedAll = !withSound; syncTv(true); applyVolume(); };

// ---------------------------------------------------------------- UI wiring
function wireUI() {
  $('chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendChat($('chatInput').value); });
  $('chatInput').addEventListener('focus', () => { if (NET.online && !myName) { hint('Create your character first, then you can post.'); } });
  $('tvForm').addEventListener('submit', (e) => { e.preventDefault(); queueVideo($('tvInput').value); });
  $('tvVol').addEventListener('input', () => { tvVolume = parseInt($('tvVol').value, 10) || 0; applyVolume(); });
  $('tvSkip').onclick = () => { if (current) { advancing = false; advance(current.id); } };
  $('tvWatch').onclick = () => window.BAR.focusTv();
  $('clearChat').onclick = async () => {
    const b = $('clearChat');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again to clear'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Clear chat'; }, 4000); return; }
    try { await db.ref('chat').remove(); hint('Chat cleared.'); } catch (e) { hint(friendly(e)); }
  };
  $('copyId').onclick = () => {
    const txt = $('myId').textContent;
    const ok = () => { $('copyId').textContent = 'Copied'; setTimeout(() => { $('copyId').textContent = 'Copy'; }, 1500); };
    const sel = () => { const r = document.createRange(); r.selectNodeContents($('myId')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(txt).then(ok, sel); } catch (e) { sel(); }
  };
  renderChat(); renderQueue(); renderNow();
}
})();
