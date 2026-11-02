/* SH1DEN'S — custom mouse cursors: a pointer, and a hand over anything you can use. Drawn here as pixel art,
   so nothing to download. The house cursor is art-deco brass; more in the shop, and rank cursors come with hours. */
(function () {
'use strict';
// [id, name, price (0 = not sold), palette]
const P = {
  brass: { fill: '#c9a24e', shade: '#7c5c22', hi: '#f6e2a0', line: '#140d05' },
  neon: { fill: '#ff4fb8', shade: '#b0207a', hi: '#ffd0ee', line: '#2a0018', glow: 'rgba(255,60,170,0.9)' },
  zombie: { fill: '#7aa860', shade: '#456a34', hi: '#b4d48c', line: '#0f180b', spots: '#3a5a26', stitch: '#8a1010' },
  skull: { fill: '#ece6d2', shade: '#b4ac94', hi: '#ffffff', line: '#161616', bones: true },
  flame: { fill: '#ffb030', shade: '#e0401a', hi: '#fff3a0', line: '#2a0a00', flame: true, glow: 'rgba(255,120,30,0.8)' },
  gold: { fill: '#e8b83a', shade: '#9a6a12', hi: '#fff3b8', line: '#2a1a04', sparkle: true, glow: 'rgba(255,200,80,0.7)' },
  diamond: { fill: '#bfeaff', shade: '#6fb4dc', hi: '#ffffff', line: '#0a2a40', facets: true, glow: 'rgba(160,230,255,0.8)' },
  silver: { fill: '#d6dce6', shade: '#8a94a4', hi: '#ffffff', line: '#14171c' },
  rgold: { fill: '#ffcf5a', shade: '#a8781a', hi: '#fff4c0', line: '#2a1a04', glow: 'rgba(255,207,90,0.6)' },
  platinum: { fill: '#eef3ff', shade: '#a8b0c8', hi: '#ffffff', line: '#16181e', glow: 'rgba(230,240,255,0.6)' },
  emerald: { fill: '#40e090', shade: '#178a52', hi: '#c0ffe0', line: '#04180e', facets: true, glow: 'rgba(64,224,144,0.6)' },
  rdiamond: { fill: '#9ae6ff', shade: '#3a9ad0', hi: '#ffffff', line: '#062030', facets: true, glow: 'rgba(154,230,255,0.8)' },
  ruby: { fill: '#e0204a', shade: '#8a0420', hi: '#ff9ab4', line: '#200008', facets: true, glow: 'rgba(255,40,90,0.85)' }
};
const SHOP = [['cur-neon', 'Neon pink', 250, 'neon'], ['cur-zombie', 'Zombie hand', 300, 'zombie'], ['cur-skull', 'Skeleton', 400, 'skull'],
  ['cur-flame', 'Flame', 600, 'flame'], ['cur-gold', 'Golden', 800, 'gold'], ['cur-diamond', 'Diamond', 1500, 'diamond']];
const RANK = [['rank-silver', 'Silver member', 'silver', 1], ['rank-gold', 'Gold member', 'rgold', 2], ['rank-platinum', 'Platinum member', 'platinum', 3],
  ['rank-emerald', 'Emerald member', 'emerald', 4], ['rank-diamond', 'Diamond member', 'rdiamond', 5]];
const TIER_N = { '': 0, silver: 1, gold: 2, platinum: 3, emerald: 4, diamond: 5 };
// pixel art: each letter is one chunky pixel (drawn 2x2 on screen). O outline, H highlight, F fill, S shade
const ARROW = ['O.......', 'OO......', 'OHO.....', 'OHFO....', 'OHFFO...', 'OHFFFO..', 'OHFFFFO.', 'OHFFFFFO', 'OHFFOOOO', 'OHSOSO..', 'OSO.OSO.', 'OO..OSO.', '.....OO.'];
const HAND = ['...OO......', '..OHFO.....', '..OHFO.....', '..OHFO.....', '..OHFOOO...', '..OHFOHFOO.', '..OHFOHFOFO', 'OOOHFFFFFFO', 'OHOHFFFFFFO', 'OHFHFFFFFFO', '.OHFFFFFFFO', '..OFFFFFFSO', '...OFFFFSO.', '....OOOOO..'];
const PX = 2;   // screen pixels per art pixel
function hexA(c, a) { const m = c.match(/^#(..)(..)(..)$/); return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : c; }
function draw(kind, hand) {
  const p = P[kind] || P.brass, art = hand ? HAND : ARROW, w = Math.max(...art.map((r) => r.length)), h = art.length;
  const c = document.createElement('canvas'); c.width = (w + 2) * PX; c.height = (h + 2) * PX;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const at = (i, j) => (art[j] && art[j][i]) || '.';
  // a one-pixel glow round the outside for the shiny ones
  if (p.glow) {
    x.fillStyle = p.glow;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (at(i, j) !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(i + a, j + b) === 'O')) x.fillRect((i + 1) * PX, (j + 1) * PX, PX, PX);
    }
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = at(i, j); if (ch === '.') continue;
    let col = ch === 'O' ? p.line : ch === 'H' ? p.hi : ch === 'S' ? p.shade : p.fill;
    if (ch === 'F') {
      if (p.flame) col = j < h * 0.35 ? '#fff3a0' : j < h * 0.6 ? '#ffb030' : j < h * 0.8 ? '#ff6a1a' : '#e0401a';
      if (p.spots && (i * 7 + j * 3) % 9 === 0) col = p.spots;
      if (p.facets) col = (i + j) % 3 === 0 ? p.hi : (i + j) % 3 === 1 ? p.fill : p.shade;
      if (p.bones && (i + j * 2) % 5 === 0) col = p.shade;
      if (p.sparkle && (i * 5 + j) % 11 === 0) col = '#ffffff';
    }
    if (ch === 'S' && p.stitch && j % 2) col = p.stitch;
    x.fillStyle = col; x.fillRect((i + 1) * PX, (j + 1) * PX, PX, PX);
  }
  return c.toDataURL('image/png');
}
// where the click lands: the arrow's tip, the end of the pointing finger
const HOT = { arrow: [PX, PX], hand: [Math.round(4.5 * PX), PX] };
const cache = {};
function css(kind) {
  if (!cache[kind]) cache[kind] = { arrow: 'url(' + draw(kind, false) + ') ' + HOT.arrow.join(' ') + ', default', hand: 'url(' + draw(kind, true) + ') ' + HOT.hand.join(' ') + ', pointer' };
  return cache[kind];
}
const paletteOf = (id) => { const s = SHOP.find((x) => x[0] === id); if (s) return s[3]; const r = RANK.find((x) => x[0] === id); if (r) return r[2]; return id === 'ruby' ? 'ruby' : 'brass'; };
function apply(id) {
  const c = css(paletteOf(id)), root = document.documentElement.style;
  root.setProperty('--cur', c.arrow); root.setProperty('--cur-hand', c.hand);
}
// what you may pick: the house cursor, shop cursors you own, rank cursors up to your rank (hosts: all, the owner: ruby too)
function available() {
  const out = [['default', 'House (brass)']];
  const E = window.EXTRAS || {}, tier = E.myTier ? E.myTier() : '', n = TIER_N[tier] || 0;
  for (const [id, name, , need] of RANK) if (n >= need) out.push([id, name]);
  if (E.isOwner && E.isOwner()) out.push(['ruby', 'Ruby (owner)']);
  const owned = (window.SOCIAL && window.SOCIAL.owned) ? window.SOCIAL.owned() : {};
  for (const [id, name] of SHOP) if (owned[id]) out.push([id, name]);
  return out;
}
const KEY = 'sh1den-cursor';
function current() { try { return localStorage.getItem(KEY) || 'default'; } catch (e) { return 'default'; } }
function set(id) { try { localStorage.setItem(KEY, id); } catch (e) { } apply(id); }
// fall back to the house cursor if a saved one isn't allowed any more
function check() { const id = current(); if (id !== 'default' && !available().some((a) => a[0] === id)) apply('default'); else apply(id); }
apply(current());
setInterval(check, 15000);
window.CURSORS = { SHOP, available, current, set, apply, preview: (id) => css(paletteOf(id)) };
})();
