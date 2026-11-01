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
// shapes on a 32x32 grid: the arrow's tip is its top-left corner, the hand points straight up with the index finger
const ARROW = [[2, 2], [2, 25], [8, 19], [12, 28], [16, 26], [12, 17], [20, 17]];
function handPath(x) {
  x.beginPath();
  x.moveTo(11, 2); x.lineTo(15, 2); x.lineTo(15, 12);            // index finger
  x.lineTo(18, 11); x.lineTo(20, 12); x.lineTo(21, 11); x.lineTo(23, 12); x.lineTo(24, 12); x.lineTo(26, 14); // knuckles
  x.lineTo(26, 22); x.lineTo(23, 29); x.lineTo(12, 29);          // palm
  x.lineTo(6, 22); x.lineTo(4, 17); x.lineTo(6, 15); x.lineTo(9, 18); x.lineTo(11, 18); // thumb
  x.closePath();
}
function arrowPath(x) { x.beginPath(); ARROW.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); }
function draw(kind, hand) {
  const p = P[kind] || P.brass, c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'), path = () => (hand ? handPath(x) : arrowPath(x));
  x.imageSmoothingEnabled = false;
  if (p.flame) {
    // flames licking up behind it
    for (let k = 0; k < 5; k++) { x.fillStyle = k % 2 ? '#ff6a1a' : '#ffd040'; const bx = hand ? 9 + k * 4 : 3 + k * 3, by = hand ? 6 + (k % 2) * 3 : 10 + k * 2; x.beginPath(); x.moveTo(bx, by + 6); x.lineTo(bx + 2, by - 2 - (k % 3) * 2); x.lineTo(bx + 4, by + 6); x.fill(); }
  }
  if (p.glow) { x.shadowColor = p.glow; x.shadowBlur = 4; }
  path(); x.lineWidth = 3; x.strokeStyle = p.line; x.lineJoin = 'round'; x.stroke();
  x.shadowBlur = 0;
  const g = x.createLinearGradient(0, 0, 24, 30); g.addColorStop(0, p.hi); g.addColorStop(0.35, p.fill); g.addColorStop(1, p.shade);
  path(); x.fillStyle = g; x.fill();
  x.save(); path(); x.clip();
  if (p.facets) { x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1; for (const [a, b, c2, d] of [[2, 10, 14, 18], [6, 24, 18, 12], [10, 4, 22, 26], [4, 16, 24, 20]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); } }
  if (p.spots) { x.fillStyle = p.spots; for (const [a, b] of [[5, 12], [9, 20], [14, 24], hand ? [20, 18] : [6, 18]]) x.fillRect(a, b, 3, 2); x.fillStyle = p.stitch; for (let k = 0; k < 4; k++) x.fillRect(hand ? 12 + k * 3 : 4 + k * 2, hand ? 21 : 14 + k * 2, 1, 3); }
  if (p.bones) { x.fillStyle = '#2a2a2a'; if (hand) { x.fillRect(13, 6, 1, 1); x.fillRect(13, 9, 1, 1); x.fillRect(19, 15, 1, 4); x.fillRect(22, 15, 1, 4); x.fillRect(14, 22, 8, 1); } else { x.fillRect(5, 12, 4, 1); x.fillRect(5, 17, 6, 1); x.fillRect(9, 22, 4, 1); } }
  if (p.sparkle) { x.fillStyle = '#ffffff'; for (const [a, b] of hand ? [[13, 5], [20, 20], [9, 24]] : [[4, 7], [8, 16], [13, 23]]) { x.fillRect(a, b, 1, 1); x.fillRect(a - 1, b, 3, 1); x.fillRect(a, b - 1, 1, 3); } }
  x.restore();
  // a crisp highlight along the leading edge
  x.strokeStyle = p.hi; x.lineWidth = 1; x.beginPath();
  if (hand) { x.moveTo(12, 3); x.lineTo(12, 12); } else { x.moveTo(3, 4); x.lineTo(3, 20); }
  x.stroke();
  return c.toDataURL('image/png');
}
const cache = {};
function css(kind) {
  if (!cache[kind]) cache[kind] = { arrow: 'url(' + draw(kind, false) + ') 2 2, default', hand: 'url(' + draw(kind, true) + ') 13 2, pointer' };
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
