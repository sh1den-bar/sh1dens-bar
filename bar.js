/* SH1DEN'S — PS1 bar. Procedural characters, room, dances, music. Three.js r128 global. */
(function () {
'use strict';

// ---------------------------------------------------------------- utils
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function s2l(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
const V = (x, y, z) => [x, y, z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// ---------------------------------------------------------------- mesh building
let RNG = Math.random;
function jit(c, amt) { const k = 1 + (RNG() * 2 - 1) * amt; return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)]; }

function Part(smooth) { this.tris = []; this.cols = []; this.smooth = !!smooth; }
Part.prototype.tri = function (a, b, c, col) { this.tris.push([a, b, c]); this.cols.push(col); };
Part.prototype.quad = function (a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); };
Part.prototype.fix = function (center) {
  if (!center) {
    let s = [0, 0, 0];
    for (const t of this.tris) s = add(s, add(t[0], add(t[1], t[2])));
    center = mul(s, 1 / (3 * this.tris.length));
  }
  for (const t of this.tris) {
    const n = cross(sub(t[1], t[0]), sub(t[2], t[0]));
    const c = mul(add(t[0], add(t[1], t[2])), 1 / 3);
    if (dot(n, sub(c, center)) < 0) { const tmp = t[1]; t[1] = t[2]; t[2] = tmp; }
  }
  return this;
};

function loft(rings, col, o) {
  o = o || {};
  const amt = o.amt == null ? 0.07 : o.amt;
  const p = new Part(o.smooth);
  const n = rings[0].length;
  for (let r = 0; r < rings.length - 1; r++) {
    const r0 = rings[r], r1 = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      p.quad(r0[i], r0[j], r1[j], r1[i], jit(o.colfn ? o.colfn(r, i) : col, amt));
    }
  }
  if (o.cap !== false) {
    for (const ring of [rings[0], rings[rings.length - 1]]) {
      const c = jit(col, amt);
      for (let i = 1; i < n - 1; i++) p.tri(ring[0], ring[i], ring[i + 1], c);
    }
  }
  return p.fix(o.center);
}
function rect(y, w, d, cx, cz) {
  cx = cx || 0; cz = cz || 0;
  return [V(cx - w / 2, y, cz - d / 2), V(cx + w / 2, y, cz - d / 2), V(cx + w / 2, y, cz + d / 2), V(cx - w / 2, y, cz + d / 2)];
}
function rring(y, w, d, cx, cz, n, pw) {
  cx = cx || 0; cz = cz || 0; n = n || 12; pw = pw || 3;
  const pts = [];
  for (let k = 0; k < n; k++) {
    const t = 2 * Math.PI * (k + 0.5) / n, c = Math.cos(t), s = Math.sin(t);
    pts.push(V(cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / pw) * w / 2, y, cz + Math.sign(s) * Math.pow(Math.abs(s), 2 / pw) * d / 2));
  }
  return pts;
}
function box(x0, x1, y0, y1, z0, z1, col, amt) {
  return loft([rect(y0, x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2), rect(y1, x1 - x0, z1 - z0, (x0 + x1) / 2, (z0 + z1) / 2)], col, { amt: amt == null ? 0.07 : amt });
}
function tube(points, radii, col, o) {
  o = o || {};
  const n = o.n || 8, rot = o.rot || 0;
  const rings = points.map((p, i) => {
    const a = norm(sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]));
    const h = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(a, h)), v = cross(a, u);
    const ring = [];
    for (let k = 0; k < n; k++) {
      const t = rot + 2 * Math.PI * k / n;
      ring.push(add(p, add(mul(u, Math.cos(t) * radii[i]), mul(v, Math.sin(t) * radii[i]))));
    }
    return ring;
  });
  return loft(rings, col, { amt: o.amt == null ? 0.06 : o.amt, smooth: o.smooth !== false, cap: o.cap });
}
function cyl(p0, p1, r0, r1, col, o) { o = Object.assign({ smooth: false }, o || {}); return tube([p0, p1], [r0, r1], col, o); }

function toGeometry(parts, pivot) {
  pivot = pivot || [0, 0, 0];
  let count = 0; for (const p of parts) count += p.tris.length * 3;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  for (const p of parts) {
    const fn = p.tris.map((t) => norm(cross(sub(t[1], t[0]), sub(t[2], t[0]))));
    let acc = null;
    if (p.smooth) {
      acc = new Map();
      p.tris.forEach((t, i) => { for (const v of t) { const k = v[0].toFixed(4) + ',' + v[1].toFixed(4) + ',' + v[2].toFixed(4); const a = acc.get(k); acc.set(k, a ? add(a, fn[i]) : fn[i]); } });
    }
    p.tris.forEach((t, i) => {
      const c = p.cols[i], lc = [s2l(c[0]), s2l(c[1]), s2l(c[2])];
      for (const v of t) {
        let n = fn[i];
        if (acc) n = norm(acc.get(v[0].toFixed(4) + ',' + v[1].toFixed(4) + ',' + v[2].toFixed(4)));
        pos[o] = v[0] - pivot[0]; pos[o + 1] = v[1] - pivot[1]; pos[o + 2] = v[2] - pivot[2];
        nor[o] = n[0]; nor[o + 1] = n[1]; nor[o + 2] = n[2];
        col[o] = lc[0]; col[o + 1] = lc[1]; col[o + 2] = lc[2];
        o += 3;
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ---------------------------------------------------------------- PS1 material
const snap = { value: new THREE.Vector2(160, 120) }, snapOn = { value: 1 };
function ps1(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = snap; sh.uniforms.uSnapOn = snapOn;
    sh.vertexShader = 'uniform vec2 uSnap; uniform float uSnapOn;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n if (uSnapOn > 0.5) { vec2 s = gl_Position.xy / gl_Position.w; s = floor(s * uSnap + 0.5) / uSnap; gl_Position.xy = s * gl_Position.w; }');
  };
  return mat;
}
const charMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true }));
const charOverMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }));

// ---------------------------------------------------------------- character looks
const LOOK = {
  jacket: [['Black', [30, 30, 32]], ['Olive', [54, 58, 38]], ['Charcoal', [56, 56, 58]], ['Brown', [64, 44, 30]], ['Navy', [30, 35, 48]], ['Oxblood', [62, 26, 24]], ['Ivory', [196, 192, 182]], ['Camel', [150, 110, 70]]],
  pants: [['Washed black', [44, 44, 43]], ['Jet black', [24, 24, 24]], ['Olive', [62, 64, 44]], ['Urban gray', [78, 78, 78]], ['Denim', [52, 70, 104]], ['Khaki', [132, 114, 82]], ['Navy', [30, 34, 50]]],
  skin: [['Pale', [232, 192, 164]], ['Light', [210, 162, 126]], ['Tan', [150, 102, 78]], ['Brown', [112, 74, 54]], ['Deep', [76, 50, 38]]],
  head: [['Shaved', 0], ['Short hair', 1], ['Beanie', 2], ['Cap', 3], ['Long hair', 4], ['Ponytail', 5], ['Bob', 6], ['Bald', 7]],
  hair: [['Dark brown', [40, 28, 22]], ['Black', [18, 16, 16]], ['Blond', [170, 136, 80]], ['Ginger', [128, 60, 30]], ['Gray', [120, 118, 114]]],
  beard: [['None', 0], ['Stubble', 1], ['Full beard', 2], ['Pointed moustache', 3], ['Moustache & chin beard', 4]],
  eyes: [['Bare eyes', 0], ['Round glasses', 1], ['Shades', 2]],
  smoke: [['No smoke', 0], ['Cigarette', 1], ['Cigar', 2]],
  dance: [['Bounce', 0], ['Two-step', 1], ['Hands up', 2], ['Head nod', 3]],
  spot: [['Dance room', 0], ['Main bar', 1], ['TV room', 2], ['Billiards', 3], ['VIP lounge (mods)', 4], ['Pool lounge', 5], ['Street', 6], ['Backstreet', 7]],
  body: [['Male', 0], ['Female', 1]],
  top: [['Bomber jacket', 0], ['Suit', 1], ['Suit, dark shirt', 2], ['Hoodie', 3], ['Leather jacket', 4], ['Tank top', 5], ['Turtleneck', 6]],
  bottom: [['Cargo pants', 0], ['Jeans', 1], ['Trousers', 2], ['Skirt', 3]],
  shoes: [['Combat boots', 0], ['Sneakers', 1], ['Dress shoes', 2]]
};
// the save code is one digit per option in this order (new options go on the end so older codes still work)
const KEYS = ['jacket', 'pants', 'skin', 'head', 'hair', 'beard', 'eyes', 'smoke', 'dance', 'spot', 'body', 'top', 'bottom', 'shoes'];
// the order the creator shows them in
const UI_KEYS = ['body', 'skin', 'head', 'hair', 'beard', 'eyes', 'top', 'jacket', 'bottom', 'pants', 'shoes', 'dance', 'spot'];
const LABELS = { body: 'Body', jacket: 'Top color', pants: 'Bottom color', top: 'Top', bottom: 'Bottom', shoes: 'Shoes', skin: 'Skin', head: 'Hair / hat', hair: 'Hair color', beard: 'Beard', eyes: 'Eyes', smoke: 'Smoke', dance: 'Dance move', spot: 'Hangout' };
const CODE_RE = /^\d{10,16}$/;

function lookToCode(l) { return KEYS.map((k) => l[k]).join(''); }
function codeToLook(c) {
  const l = {};
  KEYS.forEach((k, i) => { const d = parseInt(c[i], 10); l[k] = isNaN(d) ? 0 : d % LOOK[k].length; });
  return l;
}
function randomLook(r) {
  const l = {}; KEYS.forEach((k) => { l[k] = Math.floor(r() * LOOK[k].length); });
  if (l.spot === 4) l.spot = 1;
  if (l.body === 1) { if (r() < 0.85) l.beard = 0; if (r() < 0.7) l.head = 4 + Math.floor(r() * 3); }
  return l;
}
const NAME_RE = /^[A-Za-z0-9_]{3,25}$/;
function parseBarCode(text) {
  const m = String(text).trim().replace(/^!bar\s+/i, '').match(/^([A-Za-z0-9_]{3,25})-(\d{10})$/);
  return m ? { name: m[1], code: m[2] } : null;
}

// ---------------------------------------------------------------- head geometry
const PROFILE = [
  [1.546, 0.030, 0.020, 0.018, 0.078], [1.556, 0.050, 0.034, 0.036, 0.066], [1.572, 0.068, 0.050, 0.060, 0.048],
  [1.592, 0.082, 0.066, 0.084, 0.030], [1.615, 0.091, 0.081, 0.098, 0.015], [1.640, 0.096, 0.092, 0.104, 0.006],
  [1.662, 0.098, 0.097, 0.107, 0.001], [1.680, 0.0985, 0.099, 0.109, -0.001], [1.697, 0.0985, 0.101, 0.110, -0.003],
  [1.716, 0.097, 0.101, 0.111, -0.004], [1.738, 0.095, 0.097, 0.111, -0.006], [1.762, 0.091, 0.090, 0.107, -0.009],
  [1.785, 0.082, 0.078, 0.097, -0.011], [1.804, 0.067, 0.061, 0.080, -0.013], [1.818, 0.045, 0.040, 0.054, -0.014],
  [1.827, 0.018, 0.016, 0.022, -0.015]
];
const HS = 18;
function faceMod(y, xn, front) {
  if (front <= 0) return 0;
  const ax = Math.abs(xn); let d = 0;
  if (ax > 0.2 && ax < 0.8) { d -= 0.008 * Math.exp(-Math.pow((y - 1.688) / 0.012, 2)); d += 0.005 * Math.exp(-Math.pow((y - 1.717) / 0.008, 2)); }
  if (ax > 0.55 && ax < 0.95) d += 0.004 * Math.exp(-Math.pow((y - 1.664) / 0.014, 2));
  if (ax < 0.45) d -= 0.003 * Math.exp(-Math.pow((y - 1.612) / 0.006, 2));
  return d * front;
}
function headRing(p, push, zclamp) {
  const [h, a, bf, bb, cz] = p; push = push || 0;
  const pts = [];
  for (let k = 0; k < HS; k++) {
    const t = 2 * Math.PI * k / HS + Math.PI / HS, c = Math.cos(t), s = Math.sin(t);
    const b = s > 0 ? bf : bb;
    const xn = Math.sign(c) * Math.pow(Math.abs(c), 0.85);
    const x = xn * (a + push);
    let z = Math.sign(s) * Math.pow(Math.abs(s), 0.9) * (b + push) + faceMod(h, xn, Math.pow(Math.max(s, 0), 2)) + cz;
    if (zclamp != null) z = Math.min(z, zclamp);
    pts.push(V(x, h, z));
  }
  return pts;
}

// ---------------------------------------------------------------- character builder
// bones (world rest positions)
const PIV = {
  hips: [0, 0.95, 0], spine: [0, 1.0, 0], head: [0, 1.50, -0.008],
  shL: [0.215, 1.41, -0.005], elL: [0.305, 1.12, -0.012], shR: [-0.215, 1.41, -0.005], elR: [-0.305, 1.12, -0.012],
  thL: [0.10, 0.95, 0], knL: [0.106, 0.50, 0.008], thR: [-0.10, 0.95, 0], knR: [-0.106, 0.50, 0.008]
};
const PARENT = { spine: 'hips', head: 'spine', shL: 'spine', elL: 'shL', shR: 'spine', elR: 'shR', thL: 'hips', knL: 'thL', thR: 'hips', knR: 'knR' };
PARENT.knR = 'thR';

const geoCache = new Map();
function buildParts(look, seed) {
  RNG = rngFrom(seed);
  const B = {}; for (const k in PIV) B[k] = [];
  const P = (k, p) => B[k].push(p);
  // thin layers that sit millimetres above another surface (stubble, beard, pockets, zipper) get drawn with a depth bias
  const B2 = {}; for (const k in PIV) B2[k] = [];
  const O = (k, p) => B2[k].push(p);
  const SKIN = LOOK.skin[look.skin][1];
  const SKIN_SHAD = SKIN.map((v) => v * 0.83);
  const F = look.body === 1;
  const LIP = F ? SKIN.map((v, i) => v * 0.62 + [70, 22, 30][i]) : SKIN.map((v) => v * 0.72);
  const HAIR = LOOK.hair[look.hair][1];
  // swimwear in the pool lounge: bare top and feet, swim shorts in a colour picked from the jacket choice
  const SWIM = look.outfit === 'swim';
  const SHORTS = [[30, 110, 120], [170, 40, 50], [30, 50, 110], [24, 24, 28], [220, 214, 200], [190, 140, 40], [200, 60, 120], [40, 130, 80]][look.jacket] || [30, 110, 120];
  const JACKET = look.outfit === 'barman' ? [222, 218, 208] : SWIM ? SKIN : LOOK.jacket[look.jacket][1];
  const RIB = look.outfit === 'barman' ? [206, 202, 192] : JACKET.map((v) => v * 0.6);
  const CARGO = LOOK.pants[look.pants][1];
  const CARGO_D = CARGO.map((v) => v * 0.74);
  const BOOT = [16, 14, 13], SOLE = [9, 8, 8], WEB = [20, 20, 19], GUN = [72, 74, 76], ZIP = [78, 78, 82];
  const RIM = [18, 18, 20], LENS = look.eyes === 2 ? [14, 14, 16] : [96, 108, 108], LENS_HI = look.eyes === 2 ? [70, 72, 80] : [170, 182, 180];
  const hc = [0, 1.69, 0];

  // head: a softer, narrower jaw for the female body
  const PROF = F ? PROFILE.map((p) => (p[0] < 1.645 ? [p[0], p[1] * (0.9 + 0.1 * (p[0] - 1.546) / 0.1), p[2] * 0.96, p[3] * 0.96, p[4]] : p)) : PROFILE;
  const BALD = look.head === 7;
  P('head', loft(PROF.map((p) => headRing(p)), SKIN, { amt: BALD ? 0.012 : 0.025, smooth: true, center: hc,
    colfn: (ri, i) => { const h = PROF[ri][0], t = 2 * Math.PI * i / HS + Math.PI / HS; return (h < 1.57 || (!BALD && Math.abs(Math.cos(t)) > 0.8 && h > 1.73)) ? SKIN_SHAD : SKIN; } }));
  const clamp = { 1.640: -0.07, 1.662: -0.062, 1.680: -0.052, 1.697: -0.04, 1.716: -0.022, 1.738: 0.048, 1.762: 0.079 };
  const upper = PROF.slice(5);
  const c2 = Object.assign({}, clamp, { 1.738: 0.06, 1.762: 0.095 });
  if (look.head === 0) {
    const stub = [SKIN[0] * 0.44 + HAIR[0] * 0.2, SKIN[1] * 0.44 + HAIR[1] * 0.2, SKIN[2] * 0.44 + HAIR[2] * 0.2];
    O('head', loft(upper.map((p) => headRing(p, 0.0018, clamp[p[0]])), stub, { amt: 0.06, smooth: true, center: hc }));
  } else if (look.head === 1) {
    O('head', loft(upper.map((p) => headRing(p, 0.008, c2[p[0]])), HAIR, { amt: 0.08, smooth: true, center: hc }));
  } else if (look.head === 2) {
    const BEANIE = JACKET.map((v, i) => Math.min(255, v * 1.25 + [8, 6, 4][i]));
    const rings = PROF.slice(9).map((p) => headRing(p, 0.013, p[0] < 1.72 ? -0.02 : null));
    rings.push(headRing([1.848, 0.012, 0.01, 0.014, -0.016], 0));
    P('head', loft(rings, BEANIE, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([headRing(PROF[10], 0.017), headRing(PROF[11], 0.016)], BEANIE.map((v) => v * 0.8), { amt: 0.04, smooth: true, center: hc }));
    O('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), SKIN.map((v) => v * 0.5), { amt: 0.05, smooth: true, center: hc }));
  } else if (look.head === 3) {
    const CAP = JACKET.map((v) => Math.min(255, v * 1.3));
    P('head', loft(PROF.slice(10).map((p) => headRing(p, 0.01)), CAP, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([rring(1.755, 0.15, 0.09, 0, 0.125, 10, 2.4), rring(1.762, 0.15, 0.09, 0, 0.13, 10, 2.4)], CAP.map((v) => v * 0.85), { amt: 0.04 }));
    O('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), HAIR, { amt: 0.06, smooth: true, center: hc }));
  } else if (look.head === 7) {
    // bald: bare scalp, nothing on top
  } else {
    // longer styles: a fuller crown, hair down the sides to the jaw, then the style's own shape
    O('head', loft(upper.map((p) => headRing(p, 0.01, c2[p[0]])), HAIR, { amt: 0.07, smooth: true, center: hc }));
    if (look.head === 4 || look.head === 6) {
      // sides and back, open at the face
      const sideClamp = (h) => (h < 1.74 ? 0.035 : null);
      P('head', loft(PROF.slice(3, 11).map((p) => headRing(p, 0.016, sideClamp(p[0]))), HAIR.map((v) => v * 0.92), { amt: 0.06, smooth: true, center: hc }));
    }
    if (look.head === 4) {
      // long hair falling down the back
      P('head', loft([rring(1.66, 0.2, 0.09, 0, -0.085, 10, 2.6), rring(1.5, 0.23, 0.08, 0, -0.115, 10, 2.6), rring(1.36, 0.22, 0.06, 0, -0.13, 10, 2.6), rring(1.3, 0.18, 0.04, 0, -0.13, 10, 2.4)], HAIR.map((v) => v * 0.9), { amt: 0.06, smooth: true }));
    } else if (look.head === 5) {
      // ponytail with a band
      P('head', tube([V(0, 1.75, -0.108), V(0, 1.68, -0.15), V(0, 1.56, -0.16), V(0, 1.46, -0.15)], [0.032, 0.036, 0.028, 0.012], HAIR.map((v) => v * 0.92), { n: 8 }));
      O('head', cyl(V(0, 1.735, -0.118), V(0, 1.72, -0.128), 0.026, 0.026, [20, 20, 22], { n: 8, amt: 0.02 }));
    }
  }
  if (look.beard === 2) {
    O('head', loft(PROF.slice(0, 6).map((p, i) => headRing(p, 0.0075 * (1 - 0.7 * i / 5))), HAIR.map((v) => v * 1.1 + 4), { amt: 0.05, smooth: true, center: hc }));
    O('head', loft([rring(1.622, 0.07, 0.016, 0, 0.098, 8), rring(1.636, 0.05, 0.014, 0, 0.104, 8)], HAIR, { amt: 0.03, smooth: true }));
  } else if (look.beard === 3) {
    // a thin moustache with long tips drooping past the corners of the mouth
    const M = HAIR.map((v) => v * 0.9);
    for (const s of [-1, 1]) O('head', tube([V(0, 1.626, 0.105), V(s * 0.02, 1.625, 0.103), V(s * 0.036, 1.62, 0.098), V(s * 0.049, 1.611, 0.092),
      V(s * 0.057, 1.596, 0.087), V(s * 0.061, 1.58, 0.082), V(s * 0.064, 1.562, 0.077)], [0.0038, 0.005, 0.0046, 0.0038, 0.003, 0.0021, 0.0009], M, { n: 6 }));
  } else if (look.beard === 4) {
    // a full moustache curving down and out, plus a narrow strip from the lip into a pointed chin beard
    const M = HAIR.map((v) => v * 0.9);
    for (const s of [-1, 1]) O('head', tube([V(0, 1.628, 0.106), V(s * 0.018, 1.627, 0.105), V(s * 0.034, 1.621, 0.1), V(s * 0.046, 1.609, 0.094),
      V(s * 0.053, 1.595, 0.089), V(s * 0.059, 1.584, 0.086)], [0.0078, 0.0098, 0.009, 0.0076, 0.0054, 0.0018], M, { n: 7 }));
    O('head', tube([V(0, 1.599, 0.1005), V(0, 1.586, 0.101), V(0, 1.571, 0.1025), V(0, 1.557, 0.1035), V(0, 1.545, 0.1005), V(0, 1.531, 0.089), V(0, 1.515, 0.077)],
      [0.0055, 0.0072, 0.0092, 0.0115, 0.0108, 0.0068, 0.0014], M, { n: 7 }));
  } else if (look.beard === 1) {
    O('head', loft(PROF.slice(0, 6).map((p) => headRing(p, 0.0016)), SKIN.map((v, i) => v * 0.55 + HAIR[i] * 0.15), { amt: 0.05, smooth: true, center: hc }));
  }
  O('head', loft([rring(1.606, 0.04, 0.012, 0, 0.099, 8), rring(1.613, 0.044, 0.012, 0, 0.101, 8)], LIP, { amt: 0.03, smooth: true }));
  P('head', loft([rring(1.722, 0.020, 0.014, 0, 0.100, 8), rring(1.700, 0.022, 0.020, 0, 0.108, 8), rring(1.676, 0.026, 0.028, 0, 0.114, 8),
    rring(1.658, 0.034, 0.034, 0, 0.117, 8), rring(1.646, 0.044, 0.032, 0, 0.114, 8), rring(1.639, 0.030, 0.020, 0, 0.108, 8)], SKIN, { amt: 0.03, smooth: true }));
  for (const s of [-1, 1]) P('head', tube([V(s * 0.093, 1.682, 0.004), V(s * 0.110, 1.684, -0.004)], [0.026, 0.022], SKIN_SHAD, { n: 10 }));
  if (look.eyes === 0) {
    for (const s of [-1, 1]) O('head', box(s * 0.042 - 0.011, s * 0.042 + 0.011, 1.684, 1.695, 0.088, 0.0985, [14, 11, 10], 0.02));
  } else {
    for (const s of [-1, 1]) {
      const cx = s * 0.043;
      P('head', cyl(V(cx, 1.69, 0.108), V(cx, 1.69, 0.1135), 0.034, 0.034, RIM, { n: 14, amt: 0.02 }));
      P('head', cyl(V(cx, 1.69, 0.109), V(cx, 1.69, 0.1165), 0.0285, 0.0285, LENS, { n: 14, amt: 0.03 }));
      O('head', box(cx - 0.016 + s * 0.004, cx - 0.004 + s * 0.004, 1.698, 1.708, 0.1165, 0.1172, LENS_HI, 0.02));
      P('head', box(s * 0.077 - 0.004, s * 0.077 + 0.004, 1.692, 1.699, 0.06, 0.112, RIM, 0.02));
      P('head', box(s * 0.1015 - 0.003, s * 0.1015 + 0.003, 1.692, 1.699, -0.03, 0.065, RIM, 0.02));
    }
    P('head', box(-0.012, 0.012, 1.696, 1.703, 0.112, 0.118, RIM, 0.02));
  }
  const ember = [];
  if (look.smoke === 2) {
    // cigar: thick, dark leaf, gold band
    const m = V(0.028, 1.607, 0.098), d = norm(V(0.42, -0.22, 1.0));
    P('head', cyl(sub(m, mul(d, 0.006)), add(m, mul(d, 0.12)), 0.0095, 0.0105, [92, 58, 34], { amt: 0.04, n: 7 }));
    P('head', cyl(add(m, mul(d, 0.022)), add(m, mul(d, 0.034)), 0.011, 0.011, [200, 160, 70], { amt: 0.02, n: 7 }));
    ember.push(cyl(add(m, mul(d, 0.12)), add(m, mul(d, 0.128)), 0.0105, 0.009, [255, 104, 28], { amt: 0, n: 7 }));
  } else if (look.smoke) {
    const m = V(0.026, 1.609, 0.100), d = norm(V(0.38, -0.30, 1.0));
    P('head', cyl(sub(m, mul(d, 0.004)), add(m, mul(d, 0.026)), 0.0058, 0.0058, [176, 120, 66], { amt: 0.02 }));
    P('head', cyl(add(m, mul(d, 0.026)), add(m, mul(d, 0.084)), 0.0055, 0.0055, [222, 216, 200], { amt: 0.02 }));
    ember.push(cyl(add(m, mul(d, 0.084)), add(m, mul(d, 0.093)), 0.0057, 0.0045, [255, 104, 28], { amt: 0 }));
  }

  // ---- body: shape, top, bottom and shoes ----
  const TOP = look.outfit === 'barman' ? 'barman' : SWIM ? 'swim' : ['bomber', 'suit', 'suitdark', 'hoodie', 'leather', 'tank', 'turtle'][look.top || 0] || 'bomber';
  const BOTTOM = SWIM ? 'swim' : look.outfit === 'barman' ? 'trousers' : ['cargo', 'jeans', 'trousers', 'skirt'][look.bottom || 0] || 'cargo';
  const SHOE = SWIM ? 'bare' : look.outfit === 'barman' ? 'dress' : ['boots', 'sneakers', 'dress'][look.shoes || 0] || 'boots';
  const TOPC = look.outfit === 'barman' ? JACKET : LOOK.jacket[look.jacket][1];
  const BOTC = CARGO;
  const hW = F ? 1.06 : 1, lW = F ? 0.88 : 1, sX = F ? 0.9 : 1;
  const SHIRT = TOP === 'suitdark' ? [22, 22, 26] : [226, 222, 212];
  const TIE = TOP === 'suitdark' ? [10, 10, 12] : [110, 26, 32];

  // pelvis and belt
  const pelvisCol = SWIM ? SHORTS : BOTC;
  P('hips', loft([rring(0.84, 0.30 * hW, 0.20, 0, 0.005, 14), rring(0.92, 0.345 * hW, 0.222, 0, 0, 14), rring(1.0, 0.34 * (F ? 0.98 : 1), 0.22, 0, 0, 14)], pelvisCol, { smooth: true }));
  if (SWIM) O('hips', loft([rring(0.975, 0.345 * hW, 0.225, 0, 0, 14), rring(1.0, 0.342 * hW, 0.222, 0, 0, 14)], SHORTS.map((v) => v * 0.7), { amt: 0.03 }));
  else if (BOTTOM === 'skirt') {
    // a skirt to just above the knee
    P('hips', loft([rring(1.0, 0.35 * hW, 0.228, 0, 0, 14), rring(0.8, 0.42 * hW, 0.29, 0, 0.004, 14), rring(0.6, 0.48 * hW, 0.33, 0, 0.008, 14)], BOTC, { smooth: true, cap: false }));
  } else {
    const BELT = BOTTOM === 'cargo' ? WEB : BOTTOM === 'jeans' ? [70, 44, 26] : [12, 12, 14];
    O('hips', loft([rring(0.945, 0.352 * hW, 0.232, 0, 0, 14), rring(0.99, 0.355 * hW, 0.234, 0, 0, 14)], BELT, { amt: 0.03 }));
    O('hips', box(-0.032, 0.032, 0.94, 0.995, 0.112, 0.124, BOTTOM === 'cargo' ? GUN : [150, 140, 120], 0.03));
  }

  // legs and shoes
  for (const s of [-1, 1]) {
    const th = s > 0 ? 'thL' : 'thR', kn = s > 0 ? 'knL' : 'knR';
    const lx = (v) => s * v * (F ? 0.96 : 1);
    if (BOTTOM === 'swim' || BOTTOM === 'skirt') {
      // bare legs: swim shorts (or a one-piece) at the top, skin below
      if (BOTTOM === 'swim' && !F) P(th, tube([V(lx(0.10), 0.97, 0), V(lx(0.104), 0.72, 0.004)], [0.082, 0.078], SHORTS, { n: 10 }));
      if (BOTTOM === 'swim' && F) P(th, tube([V(lx(0.10), 0.97, 0), V(lx(0.102), 0.9, 0.002)], [0.08 * lW, 0.076 * lW], SHORTS, { n: 10 }));
      P(th, tube([V(lx(0.10), 0.95, 0.002), V(lx(0.104), 0.74, 0.004), V(lx(0.106), 0.48, 0.008)], [0.07 * lW, 0.064 * lW, 0.056 * lW], SKIN, { n: 10 }));
      P(kn, tube([V(lx(0.106), 0.52, 0.008), V(lx(0.108), 0.32, 0), V(lx(0.11), SHOE === 'bare' ? 0.07 : 0.1, 0)], [0.056 * lW, 0.05 * lW, 0.04 * lW], SKIN, { n: 10 }));
    } else {
      const R = BOTTOM === 'cargo' ? [0.08, 0.076, 0.066, 0.066, 0.063, 0.062] : BOTTOM === 'jeans' ? [0.074, 0.068, 0.058, 0.058, 0.053, 0.05] : [0.076, 0.07, 0.061, 0.061, 0.057, 0.056];
      const lowY = SHOE === 'boots' ? 0.22 : 0.1;
      P(th, tube([V(lx(0.10), 0.97, 0), V(lx(0.104), 0.72, 0.004), V(lx(0.106), 0.48, 0.008)], R.slice(0, 3).map((r) => r * lW), BOTC, { n: 10 }));
      P(kn, tube([V(lx(0.106), 0.52, 0.008), V(lx(0.108), 0.32, 0), V(lx(0.11), lowY, 0)], R.slice(3).map((r) => r * lW), BOTC, { n: 10 }));
      if (BOTTOM === 'cargo') {
        O(th, box(lx(0.176) - 0.011, lx(0.176) + 0.011, 0.60, 0.73, -0.042, 0.042, CARGO_D, 0.04));
        O(th, box(lx(0.178) - 0.013, lx(0.178) + 0.013, 0.715, 0.75, -0.046, 0.046, CARGO, 0.04));
        O(kn, box(lx(0.106) - 0.045, lx(0.106) + 0.045, 0.44, 0.56, 0.05, 0.073, CARGO_D, 0.04));
        if (SHOE === 'boots') O(kn, cyl(V(lx(0.11), 0.23, 0), V(lx(0.11), 0.29, 0), 0.072, 0.066, CARGO_D, { n: 10, smooth: true }));
      } else if (BOTTOM === 'jeans') {
        O(kn, cyl(V(lx(0.11), lowY, 0), V(lx(0.11), lowY + 0.035, 0), 0.054 * lW, 0.054 * lW, BOTC.map((v) => Math.min(255, v * 1.35)), { n: 10, smooth: true }));
      } else {
        O(th, tube([V(lx(0.106), 0.94, 0.07), V(lx(0.106), 0.5, 0.068)], [0.004, 0.004], BOTC.map((v) => v * 0.7), { n: 4, smooth: false }));
        O(kn, tube([V(lx(0.108), 0.5, 0.066), V(lx(0.11), lowY + 0.02, 0.058)], [0.004, 0.004], BOTC.map((v) => v * 0.7), { n: 4, smooth: false }));
      }
    }
    // shoes
    const fx = lx(0.11);
    if (SHOE === 'boots') {
      P(kn, cyl(V(fx, 0.07, 0), V(fx, 0.25, 0), 0.068 * lW, 0.065 * lW, BOOT, { n: 10 }));
      P(kn, loft([rring(0.022, 0.118 * lW, 0.29, fx, 0.035, 12, 3.5), rring(0.07, 0.122 * lW, 0.285, fx, 0.037, 12, 3.5),
        rring(0.105, 0.112 * lW, 0.22, fx, 0.012, 12, 3), rring(0.13, 0.10 * lW, 0.15, fx, -0.002, 12, 2.6)], BOOT));
      P(kn, loft([rring(0.0, 0.124 * lW, 0.298, fx, 0.035, 12, 3.5), rring(0.024, 0.124 * lW, 0.298, fx, 0.035, 12, 3.5)], SOLE, { amt: 0.03 }));
      O(kn, box(fx - 0.016, fx + 0.016, 0.10, 0.24, 0.06, 0.07, WEB, 0.04));
    } else if (SHOE === 'sneakers') {
      P(kn, loft([rring(0.025, 0.11 * lW, 0.28, fx, 0.04, 12, 3.2), rring(0.075, 0.108 * lW, 0.26, fx, 0.03, 12, 3), rring(0.11, 0.09 * lW, 0.15, fx, 0.0, 12, 2.6)], [226, 224, 218]));
      P(kn, loft([rring(0.0, 0.116 * lW, 0.29, fx, 0.04, 12, 3.4), rring(0.028, 0.116 * lW, 0.29, fx, 0.04, 12, 3.4)], [240, 238, 232], { amt: 0.02 }));
      for (const e of [-1, 1]) O(kn, box(fx + e * 0.056 * lW - 0.003, fx + e * 0.056 * lW + 0.003, 0.04, 0.085, -0.03, 0.09, [30, 30, 34], 0.03));
    } else if (SHOE === 'dress') {
      P(kn, loft([rring(0.012, 0.1 * lW, 0.28, fx, 0.045, 12, 2.6), rring(0.06, 0.1 * lW, 0.26, fx, 0.035, 12, 2.6), rring(0.1, 0.085 * lW, 0.14, fx, 0.0, 12, 2.4)], [14, 14, 16]));
      P(kn, loft([rring(0.0, 0.104 * lW, 0.285, fx, 0.045, 12, 2.6), rring(0.014, 0.104 * lW, 0.285, fx, 0.045, 12, 2.6)], [8, 8, 9], { amt: 0.02 }));
    } else {
      P(kn, loft([rring(0.0, 0.085 * lW, 0.22, fx, 0.045, 10, 3), rring(0.04, 0.09 * lW, 0.22, fx, 0.045, 10, 3), rring(0.08, 0.07 * lW, 0.12, fx, 0.01, 10, 2.5)], SKIN_SHAD, { smooth: true }));
    }
  }

  // torso
  P('spine', cyl(V(0, 1.43, -0.006), V(0, 1.585, -0.01), 0.056 * (F ? 0.92 : 1), 0.054 * (F ? 0.92 : 1), SKIN_SHAD, { n: 12, smooth: true }));
  // the torso shape: narrower shoulders and waist and a fuller chest for the female body
  const torso = (col, bulk, y0, opts) => loft([
    rring(y0, (F ? 0.31 : 0.356) + bulk, (F ? 0.214 : 0.234) + bulk, 0, 0.002, 14),
    rring(1.10, (F ? 0.3 : 0.368) + bulk, (F ? 0.205 : 0.238) + bulk, 0, 0.004, 14),
    rring(1.20, (F ? 0.32 : 0.38) + bulk, (F ? 0.225 : 0.24) + bulk, 0, F ? 0.012 : 0.005, 14),
    rring(1.29, (F ? 0.35 : 0.41) + bulk, (F ? 0.275 : 0.24) + bulk, 0, F ? 0.028 : 0, 14),
    rring(1.36, (F ? 0.37 : 0.435) + bulk, (F ? 0.24 : 0.238) + bulk, 0, F ? 0.012 : -0.003, 14),
    rring(1.44, (F ? 0.34 : 0.40) + bulk, (F ? 0.2 : 0.222) + bulk * 0.6, 0, -0.006, 14),
    rring(1.475, F ? 0.21 : 0.25, F ? 0.15 : 0.17, 0, -0.01, 14)], col, Object.assign({ smooth: true }, opts || {}));
  const ribCol = TOPC.map((v) => v * 0.6);
  if (TOP === 'swim') {
    P('spine', F ? torso(SHORTS, -0.012, 0.98) : loft([rring(0.98, 0.33, 0.212, 0, 0, 14), rring(1.10, 0.31, 0.2, 0, 0.004, 14), rring(1.22, 0.34, 0.21, 0, 0.008, 14),
      rring(1.32, 0.38, 0.22, 0, 0.004, 14), rring(1.40, 0.4, 0.21, 0, -0.004, 14), rring(1.45, 0.3, 0.17, 0, -0.008, 14),
      rring(1.48, 0.16, 0.13, 0, -0.01, 14)], SKIN, { smooth: true, amt: 0.03 }));
    if (F) P('spine', loft([rring(1.4, (0.34 - 0.012), 0.19, 0, -0.006, 14), rring(1.44, 0.326, 0.19, 0, -0.006, 14), rring(1.475, 0.2, 0.14, 0, -0.01, 14)], SKIN, { smooth: true, amt: 0.03 }));
  } else if (TOP === 'barman') {
    P('spine', loft([rring(0.985, 0.336, 0.218, 0, 0, 14), rring(1.04, 0.342, 0.222, 0, 0, 14)], RIB, { amt: 0.03, smooth: true }));
    P('spine', torso(JACKET, 0, 1.035));
    // classic hotel bartender: black waistcoat over a white shirt, black bow tie
    const VEST = [20, 20, 24], VEST_L = [34, 34, 40], BRASS_B = [170, 130, 64];
    O('spine', loft([rring(0.975, 0.35, 0.232, 0, 0.002, 14), rring(1.10, 0.38, 0.25, 0, 0.004, 14), rring(1.20, 0.392, 0.252, 0, 0.005, 14),
      rring(1.29, 0.418, 0.252, 0, 0, 14), rring(1.34, 0.43, 0.25, 0, -0.002, 14)], VEST, { smooth: true }));
    for (const s of [-1, 1]) O('spine', tube([V(s * 0.012, 1.2, 0.128), V(s * 0.075, 1.33, 0.118), V(s * 0.11, 1.42, 0.09)], [0.012, 0.012, 0.01], VEST_L, { n: 4, smooth: false }));
    for (const y of [1.04, 1.1, 1.16]) O('spine', cyl(V(0, y, 0.124), V(0, y, 0.132), 0.008, 0.008, BRASS_B, { n: 6, amt: 0.02 }));
    O('spine', loft([rring(1.445, 0.15, 0.135, 0, -0.004, 12), rring(1.5, 0.142, 0.128, 0, -0.006, 12)], [228, 224, 214], { cap: false, smooth: true, amt: 0.02 }));
    for (const s of [-1, 1]) O('spine', loft([[V(0, 1.462, 0.064), V(s * 0.05, 1.484, 0.062), V(s * 0.05, 1.444, 0.062)], [V(0, 1.462, 0.072), V(s * 0.05, 1.484, 0.07), V(s * 0.05, 1.444, 0.07)]], [12, 12, 14], { amt: 0.02 }));
    O('spine', box(-0.012, 0.012, 1.452, 1.472, 0.06, 0.078, [12, 12, 14], 0.02));
  } else if (TOP === 'suit' || TOP === 'suitdark') {
    // tailored jacket over a shirt and tie, with a short skirt of jacket over the hips
    P('spine', torso(TOPC, 0.006, 1.0));
    P('spine', loft([rring(1.04, (F ? 0.33 : 0.37) * 1, (F ? 0.235 : 0.245), 0, 0.004, 14), rring(0.9, (F ? 0.37 : 0.38), 0.25, 0, 0.006, 14), rring(0.82, (F ? 0.39 : 0.385), 0.255, 0, 0.006, 14)], TOPC, { smooth: true, cap: false }));
    const fz = F ? 0.14 : 0.128;
    O('spine', loft([[V(-0.045, 1.46, 0.1), V(0.045, 1.46, 0.1), V(0, 1.19, fz - 0.002)], [V(-0.045, 1.46, 0.106), V(0.045, 1.46, 0.106), V(0, 1.19, fz + 0.004)]], SHIRT, { amt: 0.02 }));
    O('spine', loft([[V(-0.014, 1.44, 0.108), V(0.014, 1.44, 0.108), V(0.016, 1.22, fz + 0.006), V(0, 1.2, fz + 0.007), V(-0.016, 1.22, fz + 0.006)], [V(-0.014, 1.44, 0.113), V(0.014, 1.44, 0.113), V(0.016, 1.22, fz + 0.011), V(0, 1.2, fz + 0.012), V(-0.016, 1.22, fz + 0.011)]], TIE, { amt: 0.03 }));
    for (const s of [-1, 1]) O('spine', tube([V(s * 0.01, 1.17, fz + 0.002), V(s * 0.07, 1.33, fz - 0.006), V(s * 0.115, 1.44, 0.088)], [0.015, 0.015, 0.012], TOPC.map((v) => v * 0.72), { n: 4, smooth: false }));
    for (const y of [1.08, 1.15]) O('spine', cyl(V(0, y, fz - 0.002), V(0, y, fz + 0.006), 0.008, 0.008, [10, 10, 12], { n: 6, amt: 0.02 }));
    O('spine', loft([rring(1.445, 0.15, 0.135, 0, -0.004, 12), rring(1.5, 0.142, 0.128, 0, -0.006, 12)], SHIRT, { cap: false, smooth: true, amt: 0.02 }));
    if (TOP === 'suit') O('spine', box(0.1, 0.15, 1.33, 1.36, fz - 0.01, fz + 0.002, [235, 232, 222], 0.02));
  } else if (TOP === 'hoodie') {
    P('spine', loft([rring(0.975, 0.35, 0.228, 0, 0, 14), rring(1.035, 0.356, 0.232, 0, 0, 14)], ribCol, { amt: 0.03, smooth: true }));
    P('spine', torso(TOPC, 0.014, 1.03));
    O('spine', box(-0.13, 0.13, 1.04, 1.17, F ? 0.118 : 0.126, F ? 0.132 : 0.14, TOPC.map((v) => v * 0.85), 0.03));
    P('spine', loft([rring(1.43, 0.27, 0.23, 0, -0.03, 14), rring(1.5, 0.24, 0.21, 0, -0.05, 14), rring(1.56, 0.19, 0.17, 0, -0.07, 14)], TOPC.map((v) => v * 0.9), { cap: false, smooth: true }));
    for (const s of [-1, 1]) O('spine', tube([V(s * 0.04, 1.47, 0.098), V(s * 0.045, 1.36, F ? 0.13 : 0.122), V(s * 0.046, 1.3, F ? 0.13 : 0.124)], [0.005, 0.005, 0.005], [226, 224, 218], { n: 4, smooth: false }));
  } else if (TOP === 'leather') {
    const LC = TOPC.map((v) => v * 0.8);
    P('spine', torso(LC, 0.004, 1.0));
    O('spine', loft([rring(0.99, 0.37, 0.25, 0, 0, 14), rring(1.035, 0.372, 0.252, 0, 0, 14)], LC.map((v) => v * 0.7), { amt: 0.03, smooth: true }));
    for (const s of [-1, 1]) O('spine', loft([[V(s * 0.04, 1.32, F ? 0.142 : 0.13), V(s * 0.15, 1.42, 0.1), V(s * 0.06, 1.46, 0.09)], [V(s * 0.04, 1.32, F ? 0.15 : 0.138), V(s * 0.15, 1.42, 0.108), V(s * 0.06, 1.46, 0.098)]], LC.map((v) => v * 0.7), { amt: 0.03 }));
    O('spine', tube([V(0.07, 1.0, 0.125), V(0.02, 1.2, F ? 0.135 : 0.125), V(-0.05, 1.4, 0.115)], [0.005, 0.005, 0.005], [150, 150, 156], { n: 4, smooth: false }));
  } else if (TOP === 'tank') {
    P('spine', torso(TOPC, -0.008, 0.99, { colfn: (ri) => (ri >= 5 ? SKIN : TOPC) }));
  } else if (TOP === 'turtle') {
    P('spine', torso(TOPC, -0.006, 0.99));
    P('spine', cyl(V(0, 1.42, -0.006), V(0, 1.6, -0.01), 0.066 * (F ? 0.94 : 1), 0.062 * (F ? 0.94 : 1), TOPC.map((v) => v * 0.92), { n: 12, smooth: true }));
  } else {
    // bomber jacket
    P('spine', loft([rring(0.985, 0.336, 0.218, 0, 0, 14), rring(1.04, 0.342, 0.222, 0, 0, 14)], ribCol, { amt: 0.03, smooth: true }));
    P('spine', torso(TOPC, 0, 1.035));
    P('spine', loft([rring(1.44, 0.17, 0.152, 0, -0.008, 14), rring(1.475, 0.165, 0.148, 0, -0.009, 14), rring(1.51, 0.152, 0.138, 0, -0.01, 14)], ribCol, { cap: false, amt: 0.03, smooth: true }));
    O('spine', tube([V(0, 0.99, 0.113), V(0, 1.05, 0.12), V(0, 1.15, 0.122), V(0, 1.27, F ? 0.14 : 0.123), V(0, 1.37, 0.12), V(0, 1.445, 0.106), V(0, 1.49, 0.07)], [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], ZIP, { n: 4, smooth: false }));
    for (const s of [-1, 1]) O('spine', box(s * 0.11 - 0.006, s * 0.11 + 0.006, 1.08, 1.17, 0.112, 0.124, ribCol, 0.03));
  }

  // arms
  const bareArms = TOP === 'tank' || TOP === 'swim';
  const sleeveCol = bareArms ? SKIN : TOP === 'leather' ? TOPC.map((v) => v * 0.8) : TOP === 'barman' ? JACKET : TOPC;
  const aw = (TOP === 'hoodie' ? 1.05 : TOP === 'suit' || TOP === 'suitdark' ? 0.94 : TOP === 'turtle' ? 0.86 : bareArms ? 0.78 : 1) * lW;
  for (const s of [-1, 1]) {
    const shK = s > 0 ? 'shL' : 'shR', elK = s > 0 ? 'elL' : 'elR';
    const ax = (v) => s * v * sX;
    const sh = V(ax(0.232), 1.40, -0.005), el = V(ax(0.305), 1.12, -0.012), wr = V(s * 0.35 * (F ? 0.93 : 1), 0.89, 0.03);
    const cuff0 = add(wr, mul(sub(el, wr), 0.16));
    const cuffCol = TOP === 'barman' ? RIB : TOP === 'bomber' || TOP === 'hoodie' ? ribCol : TOP === 'suit' || TOP === 'suitdark' ? SHIRT : null;
    P(shK, tube([V(ax(0.19), 1.445, -0.005), sh, V(ax(0.272), 1.26, -0.01), el], [0.068 * aw, 0.076 * aw, 0.07 * aw, 0.064 * aw], sleeveCol, { n: 10 }));
    P(elK, tube([add(el, V(0, 0.03, 0)), el, V(ax(0.33), 1.0, 0.01), cuffCol ? cuff0 : wr], [0.06 * aw, 0.064 * aw, 0.064 * aw, 0.062 * aw], sleeveCol, { n: 10 }));
    if (cuffCol) P(elK, cyl(cuff0, wr, 0.055 * (TOP === 'suit' || TOP === 'suitdark' ? 0.9 : 1) * lW, 0.05 * lW, cuffCol, { n: 10, smooth: true }));
    const hx = wr[0] + s * 0.004, hz = wr[2] + 0.008, hs = F ? 0.88 : 1;
    P(elK, loft([rring(0.895, 0.036 * hs, 0.074 * hs, hx, hz, 10), rring(0.845, 0.038 * hs, 0.086 * hs, hx, hz + 0.004, 10),
      rring(0.80, 0.034 * hs, 0.084 * hs, hx - s * 0.002, hz + 0.008, 10), rring(0.76, 0.026 * hs, 0.066 * hs, hx - s * 0.006, hz + 0.01, 10)], SKIN, { smooth: true }));
    P(elK, tube([V(hx - s * 0.012, 0.86, hz + 0.035), V(hx - s * 0.02, 0.825, hz + 0.05), V(hx - s * 0.022, 0.805, hz + 0.052)], [0.011 * hs, 0.01 * hs, 0.008 * hs], SKIN_SHAD, { n: 6 }));
  }
  if (TOP === 'barman') {
    for (const s of [-1, 1]) O(s > 0 ? 'shL' : 'shR', cyl(V(s * 0.262, 1.3, -0.008), V(s * 0.268, 1.27, -0.009), 0.074, 0.073, [24, 24, 28], { n: 10, smooth: true, amt: 0.02 }));
  } else if (TOP === 'bomber') O('shL', box(0.333 * sX, 0.35 * sX, 1.215, 1.30, -0.032, 0.018, ribCol, 0.03));
  return { B, B2, ember };
}

function getGeos(look, seed) {
  const key = lookToCode(look) + ':' + (look.outfit || '') + ':' + seed;
  if (geoCache.has(key)) return geoCache.get(key);
  const { B, B2, ember } = buildParts(look, seed);
  const geos = {}, over = {};
  for (const k in B) geos[k] = toGeometry(B[k], PIV[k]);
  for (const k in B2) if (B2[k].length) over[k] = toGeometry(B2[k], PIV[k]);
  geos.over = over;
  geos.ember = ember.length ? toGeometry(ember, PIV.head) : null;
  geoCache.set(key, geos);
  return geos;
}

const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a1c });
function addBody(g, geos, k) {
  const m = new THREE.Mesh(geos[k], charMat); m.userData.body = true; g.add(m);
  if (geos.over[k]) { const o = new THREE.Mesh(geos.over[k], charOverMat); o.userData.body = true; g.add(o); }
}
// change clothes in place (swimwear in the pool lounge, normal clothes everywhere else)
function swapOutfit(ch, outfit) {
  if ((ch.outfit || '') === (outfit || '')) return;
  const look = Object.assign({}, ch.look, { outfit: outfit || undefined });
  const geos = getGeos(look, ch.seed);
  for (const k in ch.bones) {
    const g = ch.bones[k];
    for (const c of g.children.slice()) if (c.userData && c.userData.body) g.remove(c);
    addBody(g, geos, k);
  }
  ch.ember = null;
  if (geos.ember) { ch.ember = new THREE.Mesh(geos.ember, emberMat); ch.ember.userData.body = true; ch.bones.head.add(ch.ember); }
  ch.outfit = outfit || '';
}
const labelLayer = document.getElementById('labels');
function makeCharacter(look, name, seed) {
  const geos = getGeos(look, seed);
  const root = new THREE.Group();
  const bones = {};
  for (const k of ['hips', 'spine', 'head', 'shL', 'elL', 'shR', 'elR', 'thL', 'knL', 'thR', 'knR']) {
    const g = new THREE.Group();
    const p = PIV[k], par = PARENT[k];
    const pp = par ? PIV[par] : [0, 0, 0];
    g.position.set(p[0] - pp[0], p[1] - pp[1], p[2] - pp[2]);
    addBody(g, geos, k);
    bones[k] = g;
    (par ? bones[par] : root).add(g);
  }
  let ember = null;
  if (geos.ember) { ember = new THREE.Mesh(geos.ember, emberMat); ember.userData.body = true; bones.head.add(ember); }
  // name tags are crisp HTML labels laid over the 3D view (see placeLabels), not pixelated sprites
  let label = null;
  if (name) { label = document.createElement('div'); label.className = 'nametag'; label.textContent = name; label.hidden = true; labelLayer.appendChild(label); }
  // the female body is a touch shorter
  const baseScale = look.body === 1 ? 0.96 : 1;
  root.scale.setScalar(baseScale);
  return { root, bones, ember, label, look, name, seed, baseScale };
}

// name tags
const tagFont = '"VT323", "Courier New", monospace';
function makeTag(name, accent) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = '28px ' + tagFont;
  const w = Math.ceil(ctx.measureText(name).width) + 20;
  c.width = w; c.height = 36;
  ctx.font = '28px ' + tagFont;
  ctx.fillStyle = 'rgba(8,7,6,0.72)'; ctx.fillRect(0, 0, w, 36);
  ctx.fillStyle = accent || '#e9e2d6'; ctx.textBaseline = 'middle'; ctx.fillText(name, 10, 19);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true, fog: false }));
  sp.scale.set(w / 36 * 0.13, 0.13, 1);
  return sp;
}

// ---------------------------------------------------------------- poses
const ZERO = ['hips', 'spine', 'head', 'shL', 'elL', 'shR', 'elR', 'thL', 'knL', 'thR', 'knR'];
function resetPose(ch) {
  for (const k of ZERO) ch.bones[k].rotation.set(0, 0, 0);
  ch.bones.hips.position.set(0, 0.95, 0);
}
function pose(ch, act, beat, t) {
  const b = ch.bones, ph = ch.phase || 0;
  resetPose(ch);
  const PI = Math.PI;
  if (act === 'dance') {
    const B = beat + ph * 0.0;
    const m = ch.look.dance;
    if (m === 0) { // bounce
      const k = Math.abs(Math.sin(PI * B));
      b.hips.position.y = 0.95 - 0.045 * (1 - k);
      b.thL.rotation.x = b.thR.rotation.x = -0.28 * (1 - k);
      b.knL.rotation.x = b.knR.rotation.x = 0.55 * (1 - k);
      b.spine.rotation.x = 0.08 * (1 - k);
      b.shL.rotation.x = -0.7 - 0.6 * Math.sin(PI * B); b.shR.rotation.x = -0.7 + 0.6 * Math.sin(PI * B);
      b.shL.rotation.z = 0.15; b.shR.rotation.z = -0.15;
      b.elL.rotation.x = b.elR.rotation.x = -1.3;
      b.head.rotation.x = 0.18 * (1 - k);
    } else if (m === 1) { // two-step
      const l = Math.sin(PI * B);
      b.hips.position.x = 0.05 * l; b.hips.rotation.z = -0.06 * l;
      b.spine.rotation.z = 0.1 * l;
      b.thL.rotation.x = -0.4 * Math.max(0, l); b.knL.rotation.x = 0.7 * Math.max(0, l);
      b.thR.rotation.x = -0.4 * Math.max(0, -l); b.knR.rotation.x = 0.7 * Math.max(0, -l);
      b.shL.rotation.x = 0.45 * l; b.shR.rotation.x = -0.45 * l;
      b.elL.rotation.x = b.elR.rotation.x = -0.7;
      b.head.rotation.z = -0.1 * l; b.head.rotation.x = 0.1 * Math.abs(Math.sin(PI * B * 2));
    } else if (m === 2) { // hands up
      const w = Math.sin(PI * B / 2), k = Math.abs(Math.sin(PI * B));
      b.hips.position.y = 0.95 - 0.03 * (1 - k);
      b.knL.rotation.x = b.knR.rotation.x = 0.3 * (1 - k); b.thL.rotation.x = b.thR.rotation.x = -0.15 * (1 - k);
      b.shL.rotation.z = 2.45 + 0.3 * w; b.shR.rotation.z = -2.45 + 0.3 * w;
      b.elL.rotation.z = 0.3; b.elR.rotation.z = -0.3;
      b.spine.rotation.z = -0.12 * w; b.head.rotation.z = 0.15 * w; b.head.rotation.x = -0.1;
    } else { // head nod
      const k = Math.abs(Math.sin(PI * B)), sw = Math.sin(PI * B / 2);
      b.hips.position.x = 0.03 * sw; b.spine.rotation.z = 0.05 * sw;
      b.head.rotation.x = 0.3 * k - 0.05;
      b.thL.rotation.x = -0.12; b.knL.rotation.x = 0.25 * k;
      b.shL.rotation.x = -0.25; b.shR.rotation.x = -0.9 - 0.15 * k; b.elR.rotation.x = -0.9; b.elL.rotation.x = -0.5;
      b.shR.rotation.z = -0.1;
    }
  } else if (act === 'sit') {
    b.hips.position.y = 0.95 - 0.16;
    b.thL.rotation.x = b.thR.rotation.x = -1.5;
    b.knL.rotation.x = b.knR.rotation.x = 1.45;
    b.thL.rotation.z = 0.06; b.thR.rotation.z = -0.06;
    b.spine.rotation.x = 0.08;
    b.shL.rotation.x = b.shR.rotation.x = -0.75; b.elL.rotation.x = b.elR.rotation.x = -1.05;
    b.shL.rotation.z = -0.12; b.shR.rotation.z = 0.12;
    const cyc = (t + ph * 9) % 11;
    if (cyc < 2.4) { const u = Math.sin(Math.min(1, cyc / 2.4) * PI); b.shL.rotation.x = -0.75 - 0.6 * u; b.elL.rotation.x = -1.05 - 0.9 * u; b.head.rotation.x = -0.18 * u; }
    b.head.rotation.y = 0.35 * Math.sin(t * 0.3 + ph * 5);
    b.head.rotation.x += 0.08 * Math.abs(Math.sin(PI * beat));
  } else if (act === 'lean') {
    b.spine.rotation.x = -0.05 + 0.012 * Math.sin(t * 1.7 + ph);
    b.thL.rotation.x = -0.25; b.knL.rotation.x = 0.5; b.thL.rotation.z = 0.05;
    b.shL.rotation.x = b.shR.rotation.x = -0.5; b.shL.rotation.z = -0.35; b.shR.rotation.z = 0.35;
    b.elL.rotation.x = b.elR.rotation.x = -1.55; b.elL.rotation.y = -0.4; b.elR.rotation.y = 0.4;
    b.head.rotation.x = 0.07 * Math.abs(Math.sin(PI * beat)); b.head.rotation.y = 0.4 * Math.sin(t * 0.25 + ph * 3);
  } else if (act === 'sitlow' || act === 'lounge') {
    // couch or armchair: seat about 45 cm high
    b.hips.position.y = 0.95 - 0.47;
    b.thL.rotation.x = b.thR.rotation.x = -1.45;
    b.knL.rotation.x = b.knR.rotation.x = 1.4;
    b.thL.rotation.z = 0.1; b.thR.rotation.z = -0.1;
    b.spine.rotation.x = -0.14;
    b.shL.rotation.x = b.shR.rotation.x = -0.4; b.elL.rotation.x = b.elR.rotation.x = -0.9;
    b.shL.rotation.z = -0.08; b.shR.rotation.z = 0.08;
    b.head.rotation.x = 0.1 + 0.05 * Math.abs(Math.sin(PI * beat));
    if (act === 'lounge') {
      // the host: legs stretched, one arm on the armrest, a slow look around the room
      b.knL.rotation.x = 1.0; b.thL.rotation.x = -1.3;
      b.shL.rotation.z = 0.35; b.shL.rotation.x = -0.15; b.elL.rotation.x = -0.5;
      b.shR.rotation.x = -0.55; b.elR.rotation.x = -1.3;
      b.spine.rotation.x = -0.22;
      b.head.rotation.x = 0.05; b.head.rotation.y = 0.35 * Math.sin(t * 0.22 + ph * 3);
    } else b.head.rotation.y = 0.15 * Math.sin(t * 0.17 + ph * 5);
  } else if (act === 'poker') {
    // seated at the poker table, forearms on the rail, now and then peeking at the cards or tossing in chips
    b.hips.position.y = 0.95 - 0.45;
    b.thL.rotation.x = b.thR.rotation.x = -1.45;
    b.knL.rotation.x = b.knR.rotation.x = 1.35;
    b.thL.rotation.z = 0.08; b.thR.rotation.z = -0.08;
    b.spine.rotation.x = 0.12;
    const peek = Math.max(0, Math.sin(t * 0.7 + ph * 9)), toss = Math.max(0, Math.sin(t * 0.45 + ph * 5) - 0.85) * 6;
    b.shL.rotation.x = -1.05 - 0.25 * peek; b.elL.rotation.x = -0.75 - 0.5 * peek; b.shL.rotation.z = -0.25;
    b.shR.rotation.x = -1.0 - 0.3 * toss; b.elR.rotation.x = -0.6 + 0.3 * toss; b.shR.rotation.z = 0.2;
    b.head.rotation.x = 0.28 - 0.12 * peek; b.head.rotation.y = 0.2 * Math.sin(t * 0.3 + ph * 4);
  } else if (act === 'pool') {
    // bent over the table, cue stroking
    const st = Math.sin(t * 1.6 + ph * 7), aim = Math.max(0, st);
    b.hips.position.y = 0.92;
    b.spine.rotation.x = 0.75;
    b.thL.rotation.x = -0.35; b.knL.rotation.x = 0.4; b.thR.rotation.x = 0.18; b.knR.rotation.x = 0.15;
    b.head.rotation.x = -0.65;
    b.shL.rotation.x = -1.25; b.elL.rotation.x = -0.25; b.shL.rotation.z = -0.25;
    b.shR.rotation.x = -0.35 - 0.25 * aim; b.elR.rotation.x = -1.35 + 0.45 * aim; b.shR.rotation.z = 0.15;
    if (ch.cue) ch.cue.position.z = -0.08 + 0.12 * aim;
  } else if (act === 'soak') {
    // sitting in the water, back against the side, arms stretched out along the rim
    const k = Math.abs(Math.sin(PI * beat));
    b.hips.position.y = 0.95 - 0.76;
    b.thL.rotation.x = b.thR.rotation.x = -1.42;
    b.knL.rotation.x = 0.25 + 0.08 * Math.sin(t * 0.7 + ph * 3); b.knR.rotation.x = 0.35;
    b.thL.rotation.z = 0.12; b.thR.rotation.z = -0.12;
    b.spine.rotation.x = -0.22;
    b.shL.rotation.z = 1.25; b.shR.rotation.z = -1.25; b.shL.rotation.x = b.shR.rotation.x = 0.55;
    b.elL.rotation.x = b.elR.rotation.x = -0.2;
    b.head.rotation.x = -0.1 + 0.06 * k; b.head.rotation.y = 0.45 * Math.sin(t * 0.19 + ph * 4);
  } else if (act === 'wade') {
    // standing in the water: arms floating out, a slow sway with the music
    const sw = Math.sin(t * 0.9 + ph * 6), k = Math.abs(Math.sin(PI * beat));
    b.hips.position.y = 0.95 - 0.02 * k;
    b.hips.position.x = 0.03 * sw; b.spine.rotation.z = 0.05 * sw;
    b.shL.rotation.z = 0.55 + 0.12 * Math.sin(t * 1.3 + ph); b.shR.rotation.z = -0.55 - 0.12 * Math.sin(t * 1.1 + ph * 2);
    b.shL.rotation.x = b.shR.rotation.x = -0.25; b.elL.rotation.x = b.elR.rotation.x = -0.35;
    b.thL.rotation.x = -0.06; b.knL.rotation.x = 0.12;
    b.head.rotation.x = 0.08 * k; b.head.rotation.y = 0.4 * Math.sin(t * 0.21 + ph * 4);
  } else if (act === 'dj') {
    const k = Math.abs(Math.sin(PI * beat));
    b.spine.rotation.x = 0.28;
    b.hips.position.y = 0.95 - 0.02 * (1 - k);
    b.shL.rotation.x = -0.95; b.elL.rotation.x = -0.75; b.shL.rotation.z = -0.15;
    b.shR.rotation.x = -0.9 + 0.12 * Math.sin(t * 3); b.elR.rotation.x = -0.8; b.shR.rotation.z = 0.15 + 0.1 * Math.sin(t * 1.3);
    b.head.rotation.x = 0.15 + 0.3 * k; b.head.rotation.z = 0.1 * Math.sin(PI * beat / 2);
  } else if (act === 'bartend') {
    // polishing a glass with a towel, glancing up at the room now and then
    const w = t * 2.6, look = Math.max(0, Math.sin(t * 0.35));
    b.spine.rotation.x = 0.08;
    b.shL.rotation.x = -0.75; b.shL.rotation.z = -0.32; b.elL.rotation.x = -1.45;
    b.shR.rotation.x = -0.7 + 0.07 * Math.sin(w); b.shR.rotation.z = 0.36 + 0.05 * Math.cos(w); b.elR.rotation.x = -1.4 + 0.05 * Math.sin(w * 2);
    b.head.rotation.x = 0.32 - 0.34 * look; b.head.rotation.y = 0.45 * look * Math.sin(t * 0.13);
  } else if (act === 'walk') {
    const w = t * 7.5 + ph * 4, k = Math.sin(w);
    b.thL.rotation.x = -0.45 * k; b.thR.rotation.x = 0.45 * k;
    b.knL.rotation.x = 0.5 * Math.max(0, k); b.knR.rotation.x = 0.5 * Math.max(0, -k);
    b.shL.rotation.x = 0.35 * k; b.shR.rotation.x = -0.35 * k; b.elL.rotation.x = b.elR.rotation.x = -0.3;
    b.hips.position.y = 0.95 - 0.02 * Math.abs(Math.cos(w)); b.spine.rotation.x = 0.04;
  } else if (act === 'bt_wipe') {
    // wiping the counter in slow circles
    const w = t * 2.2 + ph;
    b.spine.rotation.x = 0.32;
    b.shR.rotation.x = -1.0 + 0.12 * Math.sin(w); b.shR.rotation.z = 0.2 + 0.18 * Math.cos(w); b.elR.rotation.x = -0.5;
    b.shL.rotation.x = -0.55; b.shL.rotation.z = -0.2; b.elL.rotation.x = -0.9;
    b.head.rotation.x = 0.3;
  } else if (act === 'bt_reach') {
    // tidying the bottles on the back shelf
    const u = 0.5 + 0.5 * Math.sin(t * 1.3 + ph);
    b.shR.rotation.x = -2.0 - 0.35 * u; b.elR.rotation.x = -0.35; b.shR.rotation.z = 0.15;
    b.shL.rotation.x = -0.4; b.elL.rotation.x = -0.8;
    b.head.rotation.x = -0.35; b.spine.rotation.x = -0.06;
  } else if (act === 'bt_lean') {
    // both hands on the counter, watching the room
    b.spine.rotation.x = 0.3;
    b.shL.rotation.x = b.shR.rotation.x = -0.95; b.shL.rotation.z = -0.32; b.shR.rotation.z = 0.32;
    b.elL.rotation.x = b.elR.rotation.x = -0.2;
    b.head.rotation.x = -0.2; b.head.rotation.y = 0.45 * Math.sin(t * 0.25 + ph);
    b.thL.rotation.x = 0.12; b.knL.rotation.x = 0.15;
  } else if (act === 'bt_watch') {
    // checking his pocket watch
    b.shR.rotation.x = -0.9; b.elR.rotation.x = -1.5; b.shR.rotation.z = 0.25;
    b.shL.rotation.x = -0.6; b.elL.rotation.x = -1.3; b.shL.rotation.z = -0.3;
    b.head.rotation.x = 0.5; b.spine.rotation.x = 0.06;
  } else if (act === 'bt_board') {
    // looking up at the leaderboard, hands behind his back
    b.shL.rotation.x = b.shR.rotation.x = 0.45; b.elL.rotation.x = b.elR.rotation.x = -0.9;
    b.shL.rotation.z = 0.15; b.shR.rotation.z = -0.15;
    b.head.rotation.x = -0.32 + 0.04 * Math.sin(t * 0.8); b.spine.rotation.x = -0.04;
  } else if (act === 'bt_pour') {
    // pouring, then sliding the glass across
    const u = (t * 0.8 + ph) % 1;
    b.spine.rotation.x = 0.2;
    b.shR.rotation.x = -1.3; b.shR.rotation.z = 0.25 + 0.5 * Math.max(0, Math.sin(u * PI)); b.elR.rotation.x = -0.6;
    b.shL.rotation.x = -1.1 + 0.4 * u; b.elL.rotation.x = -0.4; b.shL.rotation.z = -0.15;
    b.head.rotation.x = 0.35;
  } else if (act === 'bt_light') {
    // leaning over the bar with a lighter
    const f = Math.max(0, Math.sin(t * 4));
    b.spine.rotation.x = 0.35;
    b.shR.rotation.x = -1.45; b.elR.rotation.x = -0.5; b.shR.rotation.z = 0.05 * f;
    b.shL.rotation.x = -1.3; b.elL.rotation.x = -0.8; b.shL.rotation.z = -0.35;
    b.head.rotation.x = 0.1;
  } else if (act === 'deal') {
    // the croupier: hands over the felt, dealing now and then
    const d = Math.max(0, Math.sin(t * 1.1 + ph * 3) - 0.6) * 2.5;
    b.spine.rotation.x = 0.16;
    b.shL.rotation.x = -0.95; b.elL.rotation.x = -0.7; b.shL.rotation.z = -0.2;
    b.shR.rotation.x = -0.95 - 0.35 * d; b.elR.rotation.x = -0.7 + 0.5 * d; b.shR.rotation.z = 0.2 + 0.4 * d;
    b.head.rotation.x = 0.28; b.head.rotation.y = 0.35 * Math.sin(t * 0.3 + ph);
  } else if (act === 'slump') {
    // found in the stall: slumped on the seat, head down, arms hanging
    b.hips.position.y = 0.95 - 0.5;
    b.thL.rotation.x = b.thR.rotation.x = -1.35; b.knL.rotation.x = b.knR.rotation.x = 1.2;
    b.thL.rotation.z = 0.25; b.thR.rotation.z = -0.25;
    b.spine.rotation.x = 0.55; b.spine.rotation.z = 0.15;
    b.head.rotation.x = 0.9; b.head.rotation.z = 0.35;
    b.shL.rotation.x = 0.15; b.shR.rotation.x = 0.1; b.shL.rotation.z = 0.05; b.shR.rotation.z = -0.05;
    b.elL.rotation.x = b.elR.rotation.x = -0.1;
  }
  // holding a drink: take a sip every so often (sitting at the bar already has its own sip)
  if (ch.glass && act !== 'sit' && act !== 'pool' && act !== 'dance') {
    const cyc = (t + ph * 9) % 9;
    const u = cyc < 2.2 ? Math.sin((cyc / 2.2) * PI) : 0;
    b.shL.rotation.x = -0.45 - 0.75 * u; b.shL.rotation.z = -0.12; b.shL.rotation.y = 0;
    b.elL.rotation.x = -1.25 - 0.75 * u; b.elL.rotation.y = 0;
    b.head.rotation.x -= 0.15 * u;
  }
}

// ---------------------------------------------------------------- scene: a five-room art deco venue
// Floor plan (x to the right, z toward the front; the camera starts in the main bar):
//   [ Pool room ][ VIP lounge ]
//   [ TV room   ][ Main bar   ][ Dance room ]
const canvas = document.getElementById('c');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x04060a, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x04060a, 7, 17);
const camera = new THREE.PerspectiveCamera(46, 1, 0.15, 80);

const signFont = '"Limelight", "Poiret One", Georgia, serif';
const ROOMS = {
  // the restroom sits inside the dance room's front corner, so it is listed first
  wc: { x0: 11.85, x1: 13.95, z0: 2.05, z1: 3.95, name: 'Restroom', hidden: true },
  card: { x0: -17, x1: -11.8, z0: -4, z1: 4, name: 'Card room' },
  bar: { x0: -5, x1: 5, z0: -4, z1: 4, name: 'Main bar' },
  dance: { x0: 5, x1: 14, z0: -4, z1: 4, name: 'Dance room' },
  tv: { x0: -13, x1: -5, z0: -11, z1: -4, name: 'TV room' },
  pool: { x0: -11.8, x1: -5, z0: -4, z1: 4, name: 'Pool room' },
  vip: { x0: -5, x1: 2, z0: -11, z1: -4, name: 'VIP lounge' },
  swim: { x0: 5, x1: 14, z0: -12, z1: -4, name: 'Pool lounge' },
  change: { x0: 2, x1: 5, z0: -11, z1: -4, name: 'Changing room' },
  street: { x0: -26, x1: 28, z0: 4, z1: 15.4, name: 'Street', outside: true },
  alley: { x0: -14, x1: 15, z0: -19, z1: -11, name: 'Backstreet', outside: true }
};
function roomAt(x, z) {
  for (const k in ROOMS) { const r = ROOMS[k]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r; }
  return null;
}

scene.add(new THREE.HemisphereLight(0x3a4a66, 0x080706, 0.55));
function pLight(color, intensity, dist, x, y, z) { const l = new THREE.PointLight(color, intensity, dist, 1.5); l.position.set(x, y, z); scene.add(l); return l; }
// main bar
pLight(0x3f6fc0, 1.0, 8, 0, 2.9, 2.4);
const barLights = [-2, 0, 2].map((x) => pLight(0xffb070, 1.2, 4.8, x, 2.35, -2.6));
const backBar = pLight(0xffa048, 0.9, 3.6, 0, 1.8, -3.55);
const neonLight = pLight(0xffc070, 0.7, 4, 0, 2.85, -3.5);
// dance room
const danceLight = pLight(0x4a7cff, 1.8, 8, 9.5, 2.8, 0);
const danceLight2 = pLight(0x6a4aff, 1.2, 7, 12.5, 2.6, -2.5);
// tv room
pLight(0x2c4c8c, 0.7, 8, -8, 2.8, -5.0);
// pool room: the long lamp over the table
const poolLamp = pLight(0xfff0c8, 1.4, 4.2, -9.4, 1.9, 0.4);
const pokerLamp = pLight(0xffe2c0, 1.3, 4.5, -13.9, 2.1, -0.3);
// vip: the glowing disc and the pink cove light
const fireLight = pLight(0xff2a8a, 1.4, 5, -1.1, 1.6, -10.2);
// pool lounge: hot magenta and red, plus a cool glow coming off the water
const swimLights = [pLight(0xff2a8a, 1.5, 8, 7.0, 2.7, -6.0), pLight(0xff3040, 1.2, 7, 12.0, 2.7, -10.5)];
const waterLight = pLight(0x7ad8ff, 1.0, 4.5, 9.5, 0.9, -8.0);
const candleLight = pLight(0xffa860, 0.7, 4, 9.5, 0.9, -11.3);
pLight(0xff3c96, 0.9, 4.2, -1.5, 2.9, -7.8);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.encoding = THREE.sRGBEncoding;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rr = rngFrom(42);
function noiseFill(x, w, h, base, amt) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = rr() * amt;
    x.fillStyle = `rgb(${Math.round(base[0] + n)},${Math.round(base[1] + n)},${Math.round(base[2] + n)})`; x.fillRect(i, j, 1, 1);
  }
}
// black marble with pale veins and gold grout (main bar)
const marbleTex = canvasTex(64, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = (((i >> 5) + (j >> 5)) % 2 ? 16 : 12) + rr() * 4;
    x.fillStyle = `rgb(${v},${v + 1},${v + 4})`; x.fillRect(i, j, 1, 1);
  }
  for (let k = 0; k < 9; k++) {
    let px = rr() * w, py = rr() * h; const dx = rr() - 0.5, dy = rr() - 0.5;
    x.fillStyle = `rgba(150,155,165,${0.18 + rr() * 0.2})`;
    for (let s = 0; s < 40; s++) { x.fillRect(Math.floor(px) % w, Math.floor(py) % h, 1, 1); px += dx * 2 + (rr() - 0.5); py += dy * 2 + (rr() - 0.5); }
  }
  x.fillStyle = 'rgb(70,56,30)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 32, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(32, 0, 1, h);
});
// dark concrete (dance room)
const concreteTex = canvasTex(32, 32, (x, w, h) => { noiseFill(x, w, h, [14, 15, 18], 6); });
// navy carpet with a small deco diamond (tv room)
const carpetTex = canvasTex(16, 16, (x, w, h) => {
  noiseFill(x, w, h, [14, 18, 34], 5);
  x.fillStyle = 'rgb(70,58,34)'; for (let k = 0; k < 4; k++) { x.fillRect(8 + k, 4 + k, 1, 1); x.fillRect(8 - k, 4 + k, 1, 1); x.fillRect(8 + k, 12 - k, 1, 1); x.fillRect(8 - k, 12 - k, 1, 1); }
});
// dark herringbone wood (pool room)
const woodTex = canvasTex(32, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const band = Math.floor(((i + j) % 32) / 4) % 2, seam = (i + j) % 8 === 0 || (i - j + 64) % 16 === 0;
    const v = seam ? 12 : (band ? 30 : 25) + rr() * 5;
    x.fillStyle = `rgb(${v + 8},${v + 2},${v - 4})`; x.fillRect(i, j, 1, 1);
  }
});
// oxblood carpet with gold pattern (vip)
const vipTex = canvasTex(16, 16, (x, w, h) => {
  noiseFill(x, w, h, [18, 14, 16], 5);
  x.fillStyle = 'rgb(30,22,26)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
});
// lacquered deco wall panel with brass strips and a fan frieze
const wallTex = canvasTex(64, 128, (x, w, h) => {
  noiseFill(x, w, h, [13, 14, 18], 3);
  x.fillStyle = 'rgb(22,24,32)'; x.fillRect(6, 30, 52, 92);
  x.fillStyle = 'rgb(16,17,24)'; x.fillRect(9, 33, 46, 86);
  x.fillStyle = 'rgb(122,94,46)';
  x.fillRect(0, 0, 2, h); x.fillRect(31, 34, 1, 84);
  x.fillRect(0, 22, w, 1); x.fillRect(0, 26, w, 1); x.fillRect(0, 124, w, 2);
  for (let f = 0; f < 2; f++) {
    const cx = 16 + f * 32, cy = 21;
    for (let a = 0; a < 7; a++) { const ang = Math.PI + (a / 6) * Math.PI; for (let r = 2; r < 14; r++) x.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 1, 1); }
    for (let a = 0; a <= 24; a++) { const ang = Math.PI + (a / 24) * Math.PI; x.fillRect(Math.round(cx + Math.cos(ang) * 14), Math.round(cy + Math.sin(ang) * 14), 1, 1); }
  }
}, [1, 1]);
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
// dark green fabric wall for the pool room, red damask for the vip
const greenWallTex = canvasTex(32, 64, (x, w, h) => {
  noiseFill(x, w, h, [16, 13, 15], 3);
  x.fillStyle = 'rgb(10,8,10)'; x.fillRect(3, 3, 26, 34); x.fillRect(3, 44, 26, 18);
  x.fillStyle = 'rgb(20,16,18)'; x.fillRect(4, 4, 24, 32); x.fillRect(4, 45, 24, 16);
  x.fillStyle = 'rgb(126,96,48)'; x.fillRect(0, 0, 1, h); x.fillRect(0, 40, w, 1);
});
// billiards: deep red carpet with a gold lattice
const luxCarpetTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [46, 8, 14], 5);
  x.fillStyle = 'rgb(30,4,9)';
  for (let k = 0; k < w; k++) { x.fillRect(k, (k + 8) % h, 1, 1); x.fillRect(k, (h - k + 8) % h, 1, 1); }
  x.fillStyle = 'rgb(140,104,44)';
  for (const [cx, cy] of [[8, 0], [24, 16], [8, 32], [24, -16]]) { x.fillRect(cx - 1, cy, 3, 1); x.fillRect(cx, cy - 1, 1, 3); }
  x.fillStyle = 'rgb(88,62,28)'; for (let k = 0; k < w; k += 4) { x.fillRect(k, 16, 1, 1); x.fillRect(16, k, 1, 1); }
});
luxCarpetTex.wrapS = luxCarpetTex.wrapT = THREE.RepeatWrapping;
// card room: black marble with gold veins, black lacquer walls with gold inlay
const cardFloorTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [12, 11, 13], 4);
  x.fillStyle = 'rgb(46,42,40)'; for (let k = 0; k < 40; k++) x.fillRect(Math.floor((k * 7 + Math.sin(k) * 9 + 32) % w), Math.floor((k * 5) % h), 1, 1);
  x.fillStyle = 'rgb(150,112,52)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
});
const lacquerWallTex = canvasTex(32, 64, (x, w, h) => {
  noiseFill(x, w, h, [9, 8, 10], 2);
  x.fillStyle = 'rgb(18,16,18)'; x.fillRect(4, 6, 24, 30); x.fillRect(4, 42, 24, 18);
  x.fillStyle = 'rgb(160,122,58)'; x.fillRect(4, 6, 24, 1); x.fillRect(4, 35, 24, 1); x.fillRect(4, 6, 1, 30); x.fillRect(27, 6, 1, 30);
  x.fillRect(4, 42, 24, 1); x.fillRect(4, 59, 24, 1); x.fillRect(0, 39, w, 1);
});
// restroom: small white tiles, dark grout, a black-and-white floor
const wcTileTex = canvasTex(32, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const g = i % 4 === 0 || j % 4 === 0; const v = g ? 70 : 196 + rr() * 14; x.fillStyle = `rgb(${v},${v},${v + 4})`; x.fillRect(i, j, 1, 1); }
  x.fillStyle = 'rgb(20,20,22)'; x.fillRect(0, 40, w, 3);
});
const wcFloorTex = canvasTex(8, 8, (x, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { x.fillStyle = ((i >> 2) + (j >> 2)) % 2 ? '#141416' : '#cfcac0'; x.fillRect(i, j, 1, 1); } });
for (const t of [cardFloorTex, lacquerWallTex, wcTileTex, wcFloorTex]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
greenWallTex.wrapS = greenWallTex.wrapT = THREE.RepeatWrapping;
// vip: dark fluted wood panels (lit pink from above by the cove lights)
const redWallTex = canvasTex(32, 64, (x, w, h) => {
  noiseFill(x, w, h, [30, 18, 20], 5);
  for (let i = 0; i < w; i += 4) { x.fillStyle = 'rgb(14,8,10)'; x.fillRect(i, 0, 1, h); x.fillStyle = 'rgb(40,26,28)'; x.fillRect(i + 2, 0, 1, h); }
});
redWallTex.wrapS = redWallTex.wrapT = THREE.RepeatWrapping;
// dark brick for the pool lounge
const brickTex = canvasTex(32, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const row = Math.floor(j / 4), off = row % 2 ? 4 : 0, mortar = j % 4 === 3 || (i + off) % 8 === 7;
    const v = mortar ? 10 : 28 + rr() * 10 + ((Math.floor((i + off) / 8) * 7 + row * 3) % 5) * 2;
    x.fillStyle = mortar ? 'rgb(12,6,8)' : `rgb(${Math.round(v + 14)},${Math.round(v * 0.45)},${Math.round(v * 0.5)})`; x.fillRect(i, j, 1, 1);
  }
});
brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
// dark polished concrete with a magenta sheen
const swimFloorTex = canvasTex(32, 32, (x, w, h) => { noiseFill(x, w, h, [18, 10, 16], 7); });
// a swirl-pattern rug
const swirlTex = canvasTex(64, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = i - 32, dy = j - 32, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
    const band = Math.floor((r + a * 2.2) / 3.2) % 2;
    x.fillStyle = band ? 'rgb(150,26,70)' : 'rgb(30,6,16)'; x.fillRect(i, j, 1, 1);
  }
});

// furniture and glowing bits get a depth bias so they always win against the floor and walls they touch
const roomMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -3 }));
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -8 });
const decal = (opts) => new THREE.MeshBasicMaterial(Object.assign({ polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -8 }, opts));
function addStatic(parts, mat) { const m = new THREE.Mesh(toGeometry(parts), mat || roomMat); scene.add(m); return m; }
function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; }

// floors
const floorMats = {};
function floorFor(r, tex, tile) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const g = new THREE.PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2));
  scaleUV(g, w / tile, d / tile);
  const m = new THREE.Mesh(g, ps1(new THREE.MeshLambertMaterial({ map: tex })));
  m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); scene.add(m);
  return m;
}
for (const t of [marbleTex, concreteTex, carpetTex, woodTex, vipTex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
floorFor(ROOMS.bar, marbleTex, 2);
floorFor(ROOMS.dance, concreteTex, 2);
floorFor(ROOMS.tv, carpetTex, 0.8);
floorFor(ROOMS.pool, luxCarpetTex, 1.4);
floorFor(ROOMS.card, cardFloorTex, 1.2);
const wcFloor = floorFor(ROOMS.wc, wcFloorTex, 0.6);
floorFor(ROOMS.vip, vipTex, 0.8);
swimFloorTex.wrapS = swimFloorTex.wrapT = THREE.RepeatWrapping;
floorFor(ROOMS.swim, swimFloorTex, 1.5);

// walls: each room gets its own inward-facing walls (seen from inside, invisible from behind),
// with doorway gaps given as [from, to] distances along the wall
const WALL_H = 3.2, DOOR_H = 2.4;
const wallMats = {
  deco: ps1(new THREE.MeshLambertMaterial({ map: wallTex })),
  green: ps1(new THREE.MeshLambertMaterial({ map: greenWallTex })),
  red: ps1(new THREE.MeshLambertMaterial({ map: redWallTex })),
  brick: ps1(new THREE.MeshLambertMaterial({ map: brickTex })),
  lacquer: ps1(new THREE.MeshLambertMaterial({ map: lacquerWallTex })),
  tile: ps1(new THREE.MeshLambertMaterial({ map: wcTileTex }))
};
const DOOR_PARTS = [];
function wallPlane(ax, az, bx, bz, nx, nz, y0, y1, mat, texW) {
  const len = Math.hypot(bx - ax, bz - az), h = y1 - y0;
  const g = new THREE.PlaneGeometry(len, h, Math.max(1, Math.ceil(len * 2)), Math.max(1, Math.ceil(h * 2)));
  scaleUV(g, len / texW, h / WALL_H);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + y0 / WALL_H);
  const m = new THREE.Mesh(g, mat);
  m.position.set((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
  m.rotation.y = Math.atan2(nx, nz);
  scene.add(m);
  return m;
}
function wallLine(ax, az, bx, bz, nx, nz, gaps, mat, texW) {
  const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
  const P = (d) => [ax + ux * d, az + uz * d];
  let cur = 0;
  for (const [g0, g1] of (gaps || []).slice().sort((a, b) => a[0] - b[0])) {
    if (g0 > cur) { const p = P(cur), q = P(g0); wallPlane(p[0], p[1], q[0], q[1], nx, nz, 0, WALL_H, mat, texW); }
    const p = P(g0), q = P(g1); wallPlane(p[0], p[1], q[0], q[1], nx, nz, DOOR_H, WALL_H, mat, texW);
    cur = g1;
  }
  if (cur < len) { const p = P(cur), q = P(len); wallPlane(p[0], p[1], q[0], q[1], nx, nz, 0, WALL_H, mat, texW); }
}
function roomWalls(r, gaps, mat) {
  // back (z0, faces +z), front (z1, faces -z), left (x0, faces +x), right (x1, faces -x)
  wallLine(r.x0, r.z0, r.x1, r.z0, 0, 1, gaps.back, mat, 2);
  wallLine(r.x0, r.z1, r.x1, r.z1, 0, -1, gaps.front, mat, 2);
  wallLine(r.x0, r.z0, r.x0, r.z1, 1, 0, gaps.left, mat, 2);
  wallLine(r.x1, r.z0, r.x1, r.z1, -1, 0, gaps.right, mat, 2);
}
// doorways (distances measured along each wall from its x0 / z0 end)
const DOOR = {
  barDance: [3, 5],      // x = 5, z -1..1
  barTv: [4.5, 6.5],     // x = -5, z 0.5..2.5
  tvPool: [3, 4.6],      // z = -4, x -10..-8.4
  poolVip: [2.5, 4]      // x = -5, z -8.5..-7
};
roomWalls(ROOMS.bar, { right: [DOOR.barDance], left: [DOOR.barTv], front: [[4.1, 5.9]] }, wallMats.deco);
roomWalls(ROOMS.dance, { left: [DOOR.barDance], back: [[3.6, 5.4]] }, wallMats.deco);
roomWalls(ROOMS.swim, { front: [[3.6, 5.4]], left: [[5.0, 6.2]] }, wallMats.brick);
roomWalls(ROOMS.change, { right: [[4.0, 5.2]] }, wallMats.brick);
roomWalls(ROOMS.tv, { front: [DOOR.tvPool], right: [DOOR.poolVip] }, wallMats.deco);
roomWalls(ROOMS.pool, { back: [[1.8, 3.4]], right: [DOOR.barTv], left: [[6.2, 7.6]] }, wallMats.green);
roomWalls(ROOMS.card, { right: [[6.2, 7.6]] }, wallMats.lacquer);
// the restroom: inside walls only show when you're in there; the walls facing the dance room always do
const WC_MESHES = [];
{
  const r = ROOMS.wc;
  const inner = (ax, az, bx, bz, nx, nz, y0, y1) => WC_MESHES.push(wallPlane(ax, az, bx, bz, nx, nz, y0, y1, wallMats.tile, 1.2));
  inner(r.x0, r.z0, r.x1, r.z0, 0, 1, 0, WALL_H); inner(r.x0, r.z1, r.x1, r.z1, 0, -1, 0, WALL_H); inner(r.x1, r.z0, r.x1, r.z1, -1, 0, 0, WALL_H);
  inner(r.x0, r.z0, r.x0, 2.7, 1, 0, 0, WALL_H); inner(r.x0, 3.5, r.x0, r.z1, 1, 0, 0, WALL_H); inner(r.x0, 2.7, r.x0, 3.5, 1, 0, DOOR_H, WALL_H);
  // seen from the dance floor: a plain wall with a door
  wallPlane(11.8, 2.0, 11.8, 2.7, -1, 0, 0, WALL_H, wallMats.deco, 2); wallPlane(11.8, 3.5, 11.8, 4.0, -1, 0, 0, WALL_H, wallMats.deco, 2);
  wallPlane(11.8, 2.7, 11.8, 3.5, -1, 0, DOOR_H, WALL_H, wallMats.deco, 2);
  wallPlane(11.8, 2.0, 14.0, 2.0, 0, -1, 0, WALL_H, wallMats.deco, 2);
}
roomWalls(ROOMS.vip, { left: [DOOR.poolVip], back: [[0.6, 1.8]] }, wallMats.red);

RNG = rngFrom(7);
const LACQUER = [16, 17, 22], MARBLE = [26, 27, 32], MARBLE_L = [58, 58, 64], BRASS = [150, 112, 54], BRASS_D = [96, 72, 36];
const LEATHER = [34, 20, 18], LEATHER_B = [58, 34, 22], VELVET = [70, 14, 18], GLASS = [150, 160, 166], GREEN = [52, 96, 72], GREEN_D = [34, 70, 54];
const S = [], G = [];
const tubeB = (pts, r, col) => S.push(tube(pts, pts.map(() => r), col, { n: 4, smooth: false, amt: 0.04 }));

// brass door frames: posts and lintel, visible from both sides
function doorFrame(x0, z0, x1, z1) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (const [px, pz] of [[x0, z0], [x1, z1]]) {
    if (alongX) S.push(box(px - 0.05, px + 0.05, 0, DOOR_H + 0.05, pz - 0.08, pz + 0.08, BRASS_D, 0.03));
    else S.push(box(px - 0.08, px + 0.08, 0, DOOR_H + 0.05, pz - 0.05, pz + 0.05, BRASS_D, 0.03));
  }
  if (alongX) S.push(box(Math.min(x0, x1) - 0.06, Math.max(x0, x1) + 0.06, DOOR_H, DOOR_H + 0.08, z0 - 0.095, z0 + 0.095, BRASS, 0.03));
  else S.push(box(x0 - 0.095, x0 + 0.095, DOOR_H, DOOR_H + 0.08, Math.min(z0, z1) - 0.06, Math.max(z0, z1) + 0.06, BRASS, 0.03));
}
doorFrame(8.6, -4, 10.4, -4); doorFrame(5, -1, 5, 1); doorFrame(-5, 0.5, -5, 2.5); doorFrame(-10, -4, -8.4, -4); doorFrame(-5, -8.5, -5, -7); doorFrame(-4.4, -11, -3.2, -11); doorFrame(5, -7.0, 5, -5.8);

// ===== MAIN BAR =====
// counter: lacquered front with brass fluting, black marble top, brass foot rail
S.push(box(-3, 3, 0, 1.0, -3.0, -2.6, LACQUER));
for (let x = -2.85; x <= 2.86; x += 0.3) S.push(box(x - 0.012, x + 0.012, 0.08, 0.96, -2.61, -2.572, BRASS_D, 0.04));
S.push(box(-3.1, 3.1, 0, 0.06, -3.02, -2.57, BRASS_D, 0.03));
S.push(box(-3.12, 3.12, 1.0, 1.06, -3.06, -2.48, MARBLE, 0.05));
S.push(box(-3.12, 3.12, 1.0, 1.012, -2.49, -2.47, BRASS, 0.03));
S.push(cyl(V(-3, 0.2, -2.52), V(3, 0.2, -2.52), 0.018, 0.018, BRASS, { n: 6 }));
for (const x of [-2.6, 0, 2.6]) S.push(cyl(V(x, 0, -2.56), V(x, 0.2, -2.52), 0.012, 0.012, BRASS, { n: 4 }));
// back bar
S.push(box(-2.9, 2.9, 0, 1.0, -3.98, -3.6, LACQUER));
S.push(box(-2.95, 2.95, 1.0, 1.03, -3.985, -3.56, MARBLE));
for (const y of [1.3, 1.72]) {
  S.push(box(-2.75, 2.75, y, y + 0.03, -3.98, -3.74, MARBLE_L, 0.04));
  S.push(box(-2.75, 2.75, y + 0.03, y + 0.036, -3.75, -3.74, BRASS, 0.03));
}
const BOTTLES = [[52, 92, 60], [120, 70, 26], [170, 150, 110], [40, 60, 90], [120, 34, 34], [80, 56, 30], [190, 190, 180]];
for (const y of [1.03, 1.336, 1.756]) for (let x = -2.65; x < 2.7; x += 0.15 + rr() * 0.08) {
  if (y === 1.03 && Math.abs(x - 0.4) < 0.5) continue;
  const c = BOTTLES[Math.floor(rr() * BOTTLES.length)], h = 0.2 + rr() * 0.1, z = -3.84 + rr() * 0.06;
  S.push(cyl(V(x, y, z), V(x, y + h, z), 0.034, 0.03, c, { n: 6 }));
  S.push(cyl(V(x, y + h, z), V(x, y + h + 0.07, z), 0.011, 0.011, c, { n: 5 }));
}
const archGlow = canvasTex(16, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const dx = (i - w / 2) / (w / 2), dy = (j - h * 0.62) / (h * 0.7);
    const k = Math.max(0, 1 - Math.sqrt(dx * dx * 0.8 + dy * dy));
    x.fillStyle = `rgb(${Math.round(18 + 170 * k)},${Math.round(12 + 100 * k)},${Math.round(8 + 40 * k)})`; x.fillRect(i, j, 1, 1);
  }
});
const archMat = decal({ map: archGlow });
for (let a = 0; a < 5; a++) {
  const cx = -2.2 + a * 1.1, y0 = 1.03, y1 = 2.25, r = 0.46;
  const pts = [V(cx - r, y0, -3.96), V(cx - r, y1, -3.96)];
  for (let k = 1; k < 8; k++) { const ang = Math.PI - (k / 8) * Math.PI; pts.push(V(cx + Math.cos(ang) * r, y1 + Math.sin(ang) * r, -3.96)); }
  pts.push(V(cx + r, y1, -3.96), V(cx + r, y0, -3.96));
  tubeB(pts, 0.016, BRASS);
  for (let k = 1; k < 6; k++) { const ang = Math.PI - (k / 6) * Math.PI; tubeB([V(cx, y1, -3.965), V(cx + Math.cos(ang) * r, y1 + Math.sin(ang) * r, -3.965)], 0.007, BRASS_D); }
  tubeB([V(cx - r, y1, -3.965), V(cx + r, y1, -3.965)], 0.008, BRASS_D);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, (y1 - y0) + r), archMat);
  glow.position.set(cx, (y0 + y1 + r) / 2, -3.985); scene.add(glow);
}
for (const x of [-3.45, 3.45]) {
  S.push(box(x - 0.18, x + 0.18, 0, 3.2, -3.4, -3.04, LACQUER));
  for (const y of [0.1, 1.05, 2.9]) S.push(box(x - 0.19, x + 0.19, y, y + 0.04, -3.41, -3.03, BRASS, 0.03));
  for (let k = -1; k <= 1; k++) S.push(box(x + k * 0.09 - 0.008, x + k * 0.09 + 0.008, 0.15, 2.88, -3.05, -3.018, BRASS_D, 0.03));
}
// stools
const STOOLS = [];
for (let i = 0; i < 7; i++) {
  const x = -2.5 + i * (5 / 6);
  STOOLS.push([x, -2.15]);
  S.push(cyl(V(x, 0, -2.15), V(x, 0.025, -2.15), 0.19, 0.17, BRASS_D, { n: 10 }));
  S.push(cyl(V(x, 0.025, -2.15), V(x, 0.68, -2.15), 0.028, 0.028, BRASS, { n: 6 }));
  S.push(cyl(V(x, 0.3, -2.15), V(x, 0.315, -2.15), 0.15, 0.15, BRASS, { n: 10 }));
  S.push(loft([rring(0.68, 0.36, 0.36, x, -2.15, 12, 2), rring(0.74, 0.4, 0.4, x, -2.15, 12, 2), rring(0.775, 0.36, 0.36, x, -2.15, 12, 2)], LEATHER, { smooth: true }));
}
function martini(x, y, z) {
  S.push(cyl(V(x, y, z), V(x, y + 0.005, z), 0.03, 0.03, GLASS, { n: 6, amt: 0.05 }));
  S.push(cyl(V(x, y + 0.005, z), V(x, y + 0.08, z), 0.004, 0.004, GLASS, { n: 4, amt: 0.05 }));
  S.push(cyl(V(x, y + 0.08, z), V(x, y + 0.14, z), 0.004, 0.05, GLASS, { n: 8, amt: 0.08 }));
  S.push(cyl(V(x, y + 0.115, z), V(x, y + 0.118, z), 0.03, 0.03, [190, 200, 170], { n: 8, amt: 0.03 }));
}
for (let i = 0; i < 7; i++) martini(-2.55 + i * (5 / 6) + 0.12, 1.06, -2.72);
function succulent(x, y, z, s) {
  S.push(box(x - 0.09 * s, x + 0.09 * s, y, y + 0.11 * s, z - 0.09 * s, z + 0.09 * s, [20, 20, 24], 0.03));
  for (let k = 0; k < 9; k++) {
    const ang = k * 2.4, len = (0.07 + (k % 3) * 0.025) * s, up = 0.04 + (k % 2) * 0.03;
    const bx = x + Math.cos(ang) * 0.015, bz = z + Math.sin(ang) * 0.015, by = y + 0.11 * s;
    S.push(cyl(V(bx, by, bz), V(bx + Math.cos(ang) * len, by + up * s, bz + Math.sin(ang) * len), 0.018 * s, 0.004, k % 2 ? GREEN : GREEN_D, { n: 4, amt: 0.08 }));
  }
}
succulent(-2.9, 1.06, -2.75, 1); succulent(2.9, 1.06, -2.75, 1);
// standing tables near the entrance
function highTable(x, z) {
  S.push(cyl(V(x, 0, z), V(x, 0.03, z), 0.22, 0.2, BRASS_D, { n: 10 }));
  S.push(cyl(V(x, 0.03, z), V(x, 1.05, z), 0.03, 0.03, BRASS, { n: 6 }));
  S.push(cyl(V(x, 1.05, z), V(x, 1.09, z), 0.32, 0.32, MARBLE, { n: 12 }));
}
const HIGH_TABLES = [];
// a dark red carpet runner from the door to the bar, branching off to the billiards and dance doorways
const runnerTex = canvasTex(16, 16, (x, w, h) => {
  noiseFill(x, w, h, [52, 8, 14], 6);
  x.fillStyle = 'rgb(74,14,22)'; for (let i = 0; i < w; i += 4) for (let j = (i / 4) % 2 ? 2 : 0; j < h; j += 4) x.fillRect(i + 1, j + 1, 2, 2);
});
runnerTex.wrapS = runnerTex.wrapT = THREE.RepeatWrapping;
const runnerMat = decal({ map: runnerTex });
function runner(x0, x1, z0, z1) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  scaleUV(g, (x1 - x0) / 0.5, (z1 - z0) / 0.5);
  const m = new THREE.Mesh(g, runnerMat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.024, (z0 + z1) / 2); scene.add(m);
}
runner(-0.75, 0.75, -2.0, 3.98); runner(-4.98, -0.75, 0.8, 2.2); runner(0.75, 4.98, -0.7, 0.7);
// a thin gold edge all the way round, open at the doorways
const RUNNER_EDGE = [[-0.75, -2.0, -0.75, 0.8], [-0.75, 2.2, -0.75, 3.98], [0.75, -2.0, 0.75, -0.7], [0.75, 0.7, 0.75, 3.98], [-0.75, -2.0, 0.75, -2.0],
  [-4.98, 0.8, -0.75, 0.8], [-4.98, 2.2, -0.75, 2.2], [0.75, -0.7, 4.98, -0.7], [0.75, 0.7, 4.98, 0.7]];
for (const [ax, az, bx, bz] of RUNNER_EDGE) S.push(box(Math.min(ax, bx) - 0.015, Math.max(ax, bx) + 0.015, 0, 0.034, Math.min(az, bz) - 0.015, Math.max(az, bz) + 0.015, [150, 112, 54], 0.02));
// lounge corners by the entrance: copper leather banquettes with puffed backs, a pink glow underneath,
// and a low brass-and-glass table with an ice bowl, bottles, glasses and an ashtray
const COPPER_L = [170, 110, 62], COPPER_LD = [128, 80, 44], BANQ_BASE = [24, 20, 22], GLOW_PINK = [255, 70, 170];
const LOUNGE_SEATS = [];
const glowTex = canvasTex(4, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) { const k = Math.pow(j / (h - 1), 2.4); x.fillStyle = `rgb(${Math.round(200 * k)},${Math.round(30 * k)},${Math.round(120 * k)})`; x.fillRect(0, j, w, 1); }
});
const floorGlowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
// a glow patch on the floor: bright along the edge a-b, fading out by `depth` in direction (nx, nz)
function floorGlow(ax, az, bx, bz, nx, nz, depth) {
  const g = new THREE.BufferGeometry(), y = 0.03;
  const pos = new Float32Array([ax, y, az, bx, y, bz, bx + nx * depth, y, bz + nz * depth, ax, y, az, bx + nx * depth, y, bz + nz * depth, ax + nx * depth, y, az + nz * depth]);
  const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]); // v = 0 (brightest) along the edge
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, floorGlowMat); m.renderOrder = 2; scene.add(m);
}
// one straight run of banquette, built facing +z (its back along local z = 0) and turned into place
function banquette(px, pz, yaw, len, col, colD) {
  const P = [], D = 0.66, COPPER = col || COPPER_L, COPPER_D = colD || COPPER_LD;
  P.push(box(0, len, 0.07, 0.42, 0.05, D - 0.06, BANQ_BASE, 0.03));
  P.push(loft([rect(0.42, len, D - 0.02, len / 2, D / 2 + 0.01), rect(0.5, len, D - 0.02, len / 2, D / 2 + 0.01)], COPPER, { amt: 0.04 }));
  P.push(box(0, len, 0.42, 0.62, 0, 0.18, COPPER_D, 0.04));
  // puffed rolls along the back, in sections like the tufted original
  const secs = Math.max(1, Math.round(len / 0.62)), sl = len / secs;
  for (let k = 0; k < secs; k++) for (const [y, z, r] of [[0.66, 0.12, 0.11], [0.88, 0.09, 0.1]]) {
    const a = k * sl + 0.03, b = (k + 1) * sl - 0.03;
    P.push(tube([V(a, y, z), V(a + 0.04, y, z + 0.01), V((a + b) / 2, y + 0.01, z + 0.03), V(b - 0.04, y, z + 0.01), V(b, y, z)], [r * 0.7, r * 0.95, r * 1.08, r * 0.95, r * 0.7], COPPER, { n: 8 }));
  }
  S.push(...placeParts(P, px, pz, yaw, 0));
  // the strip of pink light tucked under the seat
  G.push(...placeParts([box(0.02, len - 0.02, 0.01, 0.035, D - 0.07, D - 0.05, GLOW_PINK, 0)], px, pz, yaw, 0));
  const c = Math.cos(yaw), sn = Math.sin(yaw), W2 = (lx, lz) => [px + lx * c + lz * sn, pz - lx * sn + lz * c];
  const [ax, az] = W2(0, D - 0.04), [bx, bz] = W2(len, D - 0.04);
  floorGlow(ax, az, bx, bz, sn, c, 0.55);
  return W2;
}
function loungeTable(x, z) {
  const BR = [176, 134, 66], w = 0.48, d = 0.32, h = 0.46;
  for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(box(x + ex * w - 0.015, x + ex * w + 0.015, 0, h, z + ez * d - 0.015, z + ez * d + 0.015, BR, 0.02));
  for (const y of [0.08, h - 0.02]) {
    S.push(box(x - w, x + w, y, y + 0.02, z - d - 0.015, z - d + 0.015, BR, 0.02)); S.push(box(x - w, x + w, y, y + 0.02, z + d - 0.015, z + d + 0.015, BR, 0.02));
    S.push(box(x - w - 0.015, x - w + 0.015, y, y + 0.02, z - d, z + d, BR, 0.02)); S.push(box(x + w - 0.015, x + w + 0.015, y, y + 0.02, z - d, z + d, BR, 0.02));
  }
  S.push(box(x - w + 0.015, x + w - 0.015, h - 0.015, h, z - d + 0.015, z + d - 0.015, [26, 30, 36], 0.03));
  S.push(box(x - w + 0.015, x + w - 0.015, 0.095, 0.1, z - d + 0.015, z + d - 0.015, [26, 30, 36], 0.03));
  // silver ice bowl with bottles chilling in it
  S.push(loft([rring(h, 0.18, 0.18, x - 0.12, z, 12, 2), rring(h + 0.1, 0.34, 0.34, x - 0.12, z, 12, 2), rring(h + 0.11, 0.35, 0.35, x - 0.12, z, 12, 2)], [176, 180, 188], { amt: 0.04, cap: false }));
  S.push(cyl(V(x - 0.12, h + 0.07, z), V(x - 0.12, h + 0.08, z), 0.15, 0.15, [200, 220, 232], { n: 12, amt: 0.08 }));
  for (const [bx, bz, col] of [[-0.18, -0.05, [24, 70, 40]], [-0.07, 0.05, [110, 60, 20]], [-0.13, 0.08, [20, 20, 24]]]) {
    S.push(cyl(V(x + bx, h + 0.04, z + bz), V(x + bx, h + 0.27, z + bz), 0.035, 0.035, col, { n: 8, amt: 0.04 }));
    S.push(cyl(V(x + bx, h + 0.27, z + bz), V(x + bx, h + 0.36, z + bz), 0.013, 0.013, col, { n: 6, amt: 0.04 }));
    S.push(cyl(V(x + bx, h + 0.36, z + bz), V(x + bx, h + 0.38, z + bz), 0.014, 0.014, [200, 170, 80], { n: 6, amt: 0.02 }));
  }
  // glasses, a tumbler with whiskey, an ashtray with a cigarette
  martini(x + 0.2, h, z - 0.12); martini(x + 0.3, h, z + 0.05);
  S.push(cyl(V(x + 0.16, h, z + 0.15), V(x + 0.16, h + 0.08, z + 0.15), 0.035, 0.038, [170, 182, 188], { n: 8, amt: 0.04 }));
  S.push(cyl(V(x + 0.16, h + 0.005, z + 0.15), V(x + 0.16, h + 0.035, z + 0.15), 0.033, 0.033, [170, 100, 34], { n: 8, amt: 0.03 }));
  S.push(cyl(V(x + 0.36, h, z + 0.2), V(x + 0.36, h + 0.025, z + 0.2), 0.06, 0.055, [40, 40, 46], { n: 10, amt: 0.03 }));
  S.push(cyl(V(x + 0.33, h + 0.03, z + 0.2), V(x + 0.42, h + 0.032, z + 0.22), 0.005, 0.005, [236, 232, 224], { n: 4, amt: 0 }));
}
// front-left corner: along the front wall and a short leg on the billiards wall
banquette(-2.2, 3.95, Math.PI, 2.75);
banquette(-4.95, 3.3, Math.PI / 2, 0.66);
loungeTable(-3.35, 2.55);
// front-right corner: along the front wall and down the wall toward the dance room door
banquette(4.95, 3.95, Math.PI, 2.75);
banquette(4.95, 1.2, -Math.PI / 2, 2.1);
loungeTable(3.45, 2.4);
for (const x of [-4.3, -3.6, -2.9]) LOUNGE_SEATS.push([x, 3.6, Math.PI]);
LOUNGE_SEATS.push([-4.6, 2.98, Math.PI / 2]);
for (const x of [2.9, 3.6, 4.3]) LOUNGE_SEATS.push([x, 3.6, Math.PI]);
for (const z of [1.55, 2.25, 2.95]) LOUNGE_SEATS.push([4.6, z, -Math.PI / 2]);
// jukebox on the left wall
S.push(box(-4.95, -4.45, 0, 1.2, -2.0, -1.2, LACQUER));
S.push(cyl(V(-4.7, 1.2, -2.0), V(-4.7, 1.2, -1.2), 0.25, 0.25, LACQUER, { n: 12 }));
tubeB([V(-4.44, 0.05, -1.98), V(-4.44, 1.2, -1.98), V(-4.44, 1.38, -1.82), V(-4.44, 1.45, -1.6), V(-4.44, 1.38, -1.38), V(-4.44, 1.2, -1.22), V(-4.44, 0.05, -1.22)], 0.014, BRASS);
// pendants over the bar
for (const x of [-2, 0, 2]) {
  S.push(cyl(V(x, 3.2, -2.6), V(x, 2.5, -2.6), 0.008, 0.008, BRASS, { n: 4 }));
  S.push(cyl(V(x, 2.5, -2.6), V(x, 2.38, -2.6), 0.03, 0.17, BRASS, { n: 10 }));
  G.push(cyl(V(x, 2.39, -2.6), V(x, 2.33, -2.6), 0.07, 0.05, [255, 210, 150], { n: 8, amt: 0 }));
}
// entrance: double doors in the front wall with a canopy light
S.push(box(-0.9, -0.02, 0, 2.4, 3.94, 3.99, [28, 18, 14]));
S.push(box(0.02, 0.9, 0, 2.4, 3.94, 3.99, [28, 18, 14]));
for (const x of [-0.12, 0.12]) S.push(box(x - 0.015, x + 0.015, 0.9, 1.4, 3.89, 3.945, BRASS, 0.02));
for (const [x0, x1] of [[-0.8, -0.12], [0.12, 0.8]]) S.push(box(x0, x1, 1.5, 2.25, 3.915, 3.945, [60, 50, 40], 0.05));
doorFrame(-0.9, 4, 0.9, 4);
G.push(cyl(V(0, 2.62, 3.95), V(0, 2.62, 3.8), 0.09, 0.07, [255, 210, 150], { n: 8, amt: 0 }));
// sconces
function sconce(wx, z, dir) {
  for (let k = 0; k <= 4; k++) { const ang = Math.PI * (0.15 + 0.7 * k / 4); tubeB([V(wx, 2.1, z), V(wx + dir * 0.03, 2.1 + Math.sin(ang) * 0.22, z + Math.cos(ang) * 0.22)], 0.008, BRASS); }
  G.push(cyl(V(wx, 2.12, z), V(wx + dir * 0.06, 2.12, z), 0.05, 0.04, [255, 196, 130], { n: 8, amt: 0 }));
}
function sconceZ(x, wz, dir) {
  for (let k = 0; k <= 4; k++) { const ang = Math.PI * (0.15 + 0.7 * k / 4); tubeB([V(x, 2.1, wz), V(x + Math.cos(ang) * 0.22, 2.1 + Math.sin(ang) * 0.22, wz + dir * 0.03)], 0.008, BRASS); }
  G.push(cyl(V(x, 2.12, wz), V(x, 2.12, wz + dir * 0.06), 0.05, 0.04, [255, 196, 130], { n: 8, amt: 0 }));
}
sconce(-4.97, -0.6, 1); sconce(4.97, -2.6, -1); sconce(4.97, 2.6, -1); sconce(-4.97, 3.4, 1);

// ===== DANCE ROOM =====
const DF = { x: 9.3, z: 0, n: 6, s: 0.75 };
S.push(box(DF.x - DF.s * 3 - 0.06, DF.x + DF.s * 3 + 0.06, -0.02, 0.012, DF.z - DF.s * 3 - 0.06, DF.z + DF.s * 3 + 0.06, BRASS_D, 0.02));
// DJ booth against the far wall
S.push(box(12.9, 13.6, 0, 1.0, -1.3, 1.3, LACQUER));
S.push(box(12.88, 12.9, 0.1, 0.9, -1.2, 1.2, BRASS_D, 0.03));
S.push(box(12.85, 13.65, 1.0, 1.05, -1.35, 1.35, MARBLE));
for (const z of [-0.55, 0.55]) {
  S.push(cyl(V(13.25, 1.05, z), V(13.25, 1.08, z), 0.2, 0.2, [30, 30, 34], { n: 10 }));
  S.push(cyl(V(13.25, 1.08, z), V(13.25, 1.09, z), 0.16, 0.16, [12, 12, 14], { n: 10 }));
}
S.push(box(13.1, 13.4, 1.05, 1.1, -0.2, 0.2, [40, 40, 46], 0.03));
G.push(box(12.875, 12.88, 0.2, 0.3, -1.1, 1.1, [80, 120, 255], 0));
// speaker stacks in the corners
for (const [x, z] of [[13.4, -3.3], [13.4, 3.3], [5.6, -3.4], [5.6, 3.4]]) {
  S.push(box(x - 0.35, x + 0.35, 0, 1.6, z - 0.35, z + 0.35, LACQUER));
  const f = x > 9 ? -1 : 1;
  for (const [y, r] of [[0.45, 0.22], [1.1, 0.13]]) {
    S.push(cyl(V(x + f * 0.36, y, z), V(x + f * 0.37, y, z), r + 0.02, r + 0.02, BRASS_D, { n: 12 }));
    S.push(cyl(V(x + f * 0.365, y, z), V(x + f * 0.39, y, z), r, r, [24, 24, 28], { n: 12 }));
  }
}
// light rig bar across the ceiling
S.push(box(6.2, 13.0, 3.05, 3.12, -0.05, 0.05, [30, 30, 34], 0.03));
S.push(box(9.25, 9.35, 3.05, 3.12, -3.6, 3.6, [30, 30, 34], 0.03));

// ===== TV ROOM =====
// big screen on the left wall (x = -13), facing the couches
const TV = { x: -12.93, y: 1.75, z: -7.5, w: 3.6, h: 2.02 };
S.push(box(-13.0, -12.95, TV.y - TV.h / 2 - 0.1, TV.y + TV.h / 2 + 0.1, TV.z - TV.w / 2 - 0.1, TV.z + TV.w / 2 + 0.1, [12, 12, 16], 0.03));
for (const [y0, y1, z0, z1] of [[TV.y - TV.h / 2 - 0.12, TV.y - TV.h / 2 - 0.04, TV.z - TV.w / 2 - 0.12, TV.z + TV.w / 2 + 0.12],
  [TV.y + TV.h / 2 + 0.04, TV.y + TV.h / 2 + 0.12, TV.z - TV.w / 2 - 0.12, TV.z + TV.w / 2 + 0.12],
  [TV.y - TV.h / 2 - 0.12, TV.y + TV.h / 2 + 0.12, TV.z - TV.w / 2 - 0.12, TV.z - TV.w / 2 - 0.04],
  [TV.y - TV.h / 2 - 0.12, TV.y + TV.h / 2 + 0.12, TV.z + TV.w / 2 + 0.04, TV.z + TV.w / 2 + 0.12]]) S.push(box(-12.97, -12.92, y0, y1, z0, z1, BRASS_D, 0.03));
S.push(box(-12.95, -12.4, 0, 0.45, TV.z - 1.4, TV.z + 1.4, LACQUER));
S.push(box(-12.95, -12.38, 0.45, 0.47, TV.z - 1.42, TV.z + 1.42, BRASS, 0.03));
// two rows of couches facing the screen, three seats each
const COUCH_SEATS = [];
function couch(cx, cz, len) {
  const x0 = cx - 0.42, x1 = cx + 0.42;
  S.push(box(x0, x1, 0.08, 0.42, cz - len / 2, cz + len / 2, LEATHER_B));
  S.push(box(x1 - 0.2, x1, 0.42, 0.95, cz - len / 2, cz + len / 2, LEATHER_B));
  for (const e of [-1, 1]) S.push(box(x0, x1, 0.08, 0.62, cz + e * len / 2 - (e > 0 ? 0.14 : 0), cz + e * len / 2 + (e < 0 ? 0.14 : 0), LEATHER_B));
  S.push(box(x0 + 0.02, x1 - 0.2, 0.42, 0.47, cz - len / 2 + 0.15, cz + len / 2 - 0.15, [72, 44, 30], 0.05));
  for (const e of [-1, 1]) for (const f of [-1, 1]) S.push(cyl(V(cx + f * 0.35, 0, cz + e * (len / 2 - 0.06)), V(cx + f * 0.35, 0.08, cz + e * (len / 2 - 0.06)), 0.025, 0.025, BRASS, { n: 4 }));
  for (const o of [-0.55, 0, 0.55]) COUCH_SEATS.push([cx - 0.05, cz + o]);
}
for (const cx of [-10.0, -7.6]) for (const cz of [-1.6, 1.6]) couch(cx, TV.z + cz, 2.0);
S.push(box(-11.4, -10.8, 0, 0.4, TV.z - 1.0, TV.z + 1.0, LACQUER));
S.push(box(-11.42, -10.78, 0.4, 0.43, TV.z - 1.02, TV.z + 1.02, MARBLE));
martini(-11.1, 0.43, TV.z - 0.4); succulent(-11.1, 0.43, TV.z + 0.5, 1);
sconce(-12.97, TV.z - 3.0, 1); sconce(-12.97, TV.z + 3.0, 1);

// ===== POOL ROOM (next to the bar): the pool table, a poker table, cue rack and a corner bar =====
const PT = { x: -9.4, z: 0.4, l: 2.6, w: 1.45 };
const LUX_BLACK = [16, 14, 16], LUX_GOLD = [186, 142, 70], LUX_RED = [128, 20, 30], LUX_LEATHER = [22, 18, 18], LUX_CHROME = [176, 180, 188];
// two heavy pedestal legs on a black plinth instead of four wooden ones
for (const dx of [-1, 1]) {
  S.push(box(PT.x + dx * (PT.l / 2 - 0.45) - 0.16, PT.x + dx * (PT.l / 2 - 0.45) + 0.16, 0.03, 0.62, PT.z - PT.w / 2 + 0.2, PT.z + PT.w / 2 - 0.2, LUX_BLACK, 0.03));
  S.push(box(PT.x + dx * (PT.l / 2 - 0.45) - 0.17, PT.x + dx * (PT.l / 2 - 0.45) + 0.17, 0.3, 0.33, PT.z - PT.w / 2 + 0.19, PT.z + PT.w / 2 - 0.19, LUX_GOLD, 0.02));
}
S.push(box(PT.x - PT.l / 2 + 0.3, PT.x + PT.l / 2 - 0.3, 0, 0.03, PT.z - PT.w / 2 + 0.15, PT.z + PT.w / 2 - 0.15, LUX_BLACK, 0.02));
S.push(box(PT.x - PT.l / 2, PT.x + PT.l / 2, 0.6, 0.76, PT.z - PT.w / 2, PT.z + PT.w / 2, LUX_BLACK, 0.03));
S.push(box(PT.x - PT.l / 2 - 0.005, PT.x + PT.l / 2 + 0.005, 0.66, 0.675, PT.z - PT.w / 2 - 0.005, PT.z + PT.w / 2 + 0.005, LUX_GOLD, 0.02));
S.push(box(PT.x - PT.l / 2 + 0.12, PT.x + PT.l / 2 - 0.12, 0.76, 0.78, PT.z - PT.w / 2 + 0.12, PT.z + PT.w / 2 - 0.12, LUX_RED, 0.03));
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(box(PT.x + dx * (PT.l / 2 - 0.12) - 0.07, PT.x + dx * (PT.l / 2 - 0.12) + 0.07, 0.76, 0.845, PT.z + dz * (PT.w / 2 - 0.12) - 0.07, PT.z + dz * (PT.w / 2 - 0.12) + 0.07, LUX_GOLD, 0.02));
for (const e of [-1, 1]) {
  S.push(box(PT.x - PT.l / 2 + 0.05, PT.x + PT.l / 2 - 0.05, 0.78, 0.84, PT.z + e * (PT.w / 2 - 0.06) - 0.06, PT.z + e * (PT.w / 2 - 0.06) + 0.06, LUX_LEATHER, 0.03));
  S.push(box(PT.x + e * (PT.l / 2 - 0.06) - 0.06, PT.x + e * (PT.l / 2 - 0.06) + 0.06, 0.78, 0.84, PT.z - PT.w / 2 + 0.05, PT.z + PT.w / 2 - 0.05, LUX_LEATHER, 0.03));
  // diamond sights on the rails
  for (let k = 1; k < 8; k++) if (k !== 4) S.push(box(PT.x - PT.l / 2 + PT.l * k / 8 - 0.008, PT.x - PT.l / 2 + PT.l * k / 8 + 0.008, 0.84, 0.842, PT.z + e * (PT.w / 2 - 0.04) - 0.008, PT.z + e * (PT.w / 2 - 0.04) + 0.008, [230, 226, 214], 0));
}
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) S.push(cyl(V(PT.x + dx * (PT.l / 2 - 0.14), 0.77, PT.z + dz * (PT.w / 2 - 0.14)), V(PT.x + dx * (PT.l / 2 - 0.14), 0.792, PT.z + dz * (PT.w / 2 - 0.14)), 0.05, 0.05, [6, 6, 6], { n: 8, amt: 0 }));
// the balls are their own meshes so the pool game can move them
const POOL_BALL_COLS = [[236, 232, 220], [222, 178, 30], [30, 60, 170], [190, 30, 30], [90, 40, 130], [230, 110, 20], [20, 110, 60], [120, 24, 24], [14, 14, 14],
  [222, 178, 30], [30, 60, 170], [190, 30, 30], [90, 40, 130], [230, 110, 20], [20, 110, 60], [120, 24, 24]];
const POOL_TABLE = { W: PT.l - 0.24, H: PT.w - 0.24, R: 0.028, y: 0.78 + 0.028 };
const poolBallMeshes = POOL_BALL_COLS.map((col, i) => {
  const R = POOL_TABLE.R, rings = [];
  for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + Math.PI * k / 6, r = Math.max(0.0005, Math.cos(a) * R); rings.push(rring(Math.sin(a) * R, r * 2, r * 2, 0, 0, 10, 2)); }
  const stripe = i >= 9, white = [236, 232, 220];
  const geo = toGeometry([loft(rings, col, { amt: 0.02, smooth: true, colfn: (ri) => (stripe && (ri <= 1 || ri >= 5) ? white : col) })]);
  const m = new THREE.Mesh(geo, roomMat); scene.add(m); return m;
});
function setPoolBalls(balls) {
  for (let i = 0; i < 16; i++) {
    const b = balls && balls[i], m = poolBallMeshes[i];
    if (!b || b[2]) { m.visible = false; continue; }
    m.visible = true;
    m.position.set(PT.x - POOL_TABLE.W / 2 + b[0], POOL_TABLE.y, PT.z - POOL_TABLE.H / 2 + b[1]);
  }
}
// crystal chandeliers: rings of hanging crystal drops under a chrome crown
const CRYSTAL = [214, 224, 238];
function chandelierRound(cx, cz, y, r) {
  S.push(cyl(V(cx, y + 0.06, cz), V(cx, y + 0.1, cz), r + 0.03, r + 0.03, LUX_CHROME, { n: 20, amt: 0.03 }));
  S.push(cyl(V(cx, y + 0.1, cz), V(cx, 3.2, cz), 0.01, 0.01, LUX_CHROME, { n: 4 }));
  [[r, 0.42, 30], [r * 0.68, 0.55, 22], [r * 0.36, 0.66, 12]].forEach(([rr2, len, n], tier) => {
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * (k + tier * 0.5) / n, x = cx + Math.cos(a) * rr2, z = cz + Math.sin(a) * rr2, l = len * (0.85 + 0.15 * ((k * 7) % 3) / 2);
      (k % 4 ? S : G).push(cyl(V(x, y + 0.06, z), V(x, y + 0.06 - l, z), 0.008, 0.012, k % 4 ? CRYSTAL : [255, 246, 226], { n: 4, amt: 0.1 }));
    }
  });
  G.push(cyl(V(cx, y + 0.05, cz), V(cx, y + 0.04, cz), r * 0.9, r * 0.9, [255, 238, 210], { n: 16, amt: 0 }));
}
function chandelierLinear(cx, cz, y, len, d) {
  S.push(box(cx - len / 2 - 0.03, cx + len / 2 + 0.03, y + 0.06, y + 0.1, cz - d / 2 - 0.03, cz + d / 2 + 0.03, LUX_CHROME, 0.03));
  for (const x of [cx - len / 2 + 0.1, cx + len / 2 - 0.1]) S.push(cyl(V(x, y + 0.1, cz), V(x, 3.2, cz), 0.008, 0.008, LUX_CHROME, { n: 4 }));
  let k = 0;
  for (let x = cx - len / 2; x <= cx + len / 2 + 1e-6; x += 0.06) for (const z of [cz - d / 2, cz, cz + d / 2]) {
    const l = 0.28 + 0.12 * Math.abs(Math.sin(k * 1.7));
    (k % 5 ? S : G).push(cyl(V(x, y + 0.06, z), V(x, y + 0.06 - l, z), 0.008, 0.011, k % 5 ? CRYSTAL : [255, 246, 226], { n: 4, amt: 0.1 }));
    k++;
  }
  G.push(box(cx - len / 2, cx + len / 2, y + 0.045, y + 0.055, cz - d / 2, cz + d / 2, [255, 238, 210], 0));
}
chandelierLinear(PT.x, PT.z, 2.25, 1.7, 0.3);
// cue rack on the wall to the card room
S.push(box(-11.79, -11.69, 0.9, 1.0, -3.3, -1.7, LUX_BLACK)); S.push(box(-11.79, -11.69, 1.6, 1.7, -3.3, -1.7, LUX_BLACK));
S.push(box(-11.7, -11.68, 1.66, 1.68, -3.3, -1.7, LUX_GOLD, 0.02));
for (let k = 0; k < 6; k++) S.push(cyl(V(-11.73, 0.92, -3.15 + k * 0.28), V(-11.73, 2.3, -3.15 + k * 0.28), 0.014, 0.008, [150, 110, 70], { n: 4 }));
// a small self-serve bar along the front wall: backlit bottle shelves, a black counter with a pink glow underneath
const MINIBAR = { px: -8.9, pz: 3.985, len: 2.6 };
{
  const L = MINIBAR.len, P = [], Gl = [], D = 0.6;
  P.push(box(0, L, 0.05, 1.0, 0, D - 0.03, LUX_BLACK, 0.03));
  for (let x = 0.3; x < L - 0.1; x += 0.45) P.push(box(x - 0.004, x + 0.004, 0.12, 0.95, D - 0.032, D - 0.028, LUX_GOLD, 0.02));
  P.push(box(-0.02, L + 0.02, 1.0, 1.04, 0, D, [34, 34, 40], 0.05));
  P.push(box(-0.02, L + 0.02, 1.0, 1.04, D - 0.005, D + 0.005, LUX_GOLD, 0.02));
  Gl.push(box(0.02, L - 0.02, 0.012, 0.035, D - 0.06, D - 0.035, GLOW_PINK, 0));
  P.push(box(0, L, 1.04, 2.75, 0, 0.015, [10, 9, 11], 0.02));
  for (const [x0, x1] of [[-0.03, 0], [L, L + 0.03]]) P.push(box(x0, x1, 1.04, 2.78, 0, 0.27, LUX_BLACK, 0.02));
  const BOTTLE_C = [[24, 70, 40], [120, 64, 20], [170, 150, 110], [30, 50, 90], [130, 30, 30], [210, 210, 200], [20, 20, 24]];
  [1.45, 1.9, 2.35].forEach((sy, row) => {
    P.push(box(0, L, sy - 0.025, sy, 0, 0.26, [26, 24, 28], 0.02));
    Gl.push(box(0.02, L - 0.02, sy - 0.03, sy - 0.025, 0.02, 0.24, [255, 232, 196], 0));
    for (let x = 0.12, k = row * 3; x < L - 0.08; x += 0.16 + ((k * 5) % 3) * 0.03, k++) {
      if (row === 1 && k % 4 === 0) { P.push(cyl(V(x, sy, 0.13), V(x, sy + 0.08, 0.13), 0.032, 0.035, [170, 182, 188], { n: 8, amt: 0.04 })); continue; }
      const c = BOTTLE_C[k % BOTTLE_C.length], hgt = 0.2 + ((k * 3) % 4) * 0.025;
      P.push(cyl(V(x, sy, 0.13), V(x, sy + hgt, 0.13), 0.035, 0.032, c, { n: 7, amt: 0.04 }));
      P.push(cyl(V(x, sy + hgt, 0.13), V(x, sy + hgt + 0.07, 0.13), 0.012, 0.012, c, { n: 5, amt: 0.04 }));
    }
  });
  P.push(cyl(V(0.6, 1.04, 0.32), V(0.6, 1.22, 0.32), 0.09, 0.11, LUX_CHROME, { n: 10, amt: 0.04 }));
  P.push(cyl(V(0.6, 1.15, 0.32), V(0.6, 1.42, 0.32), 0.035, 0.035, [24, 70, 40], { n: 7, amt: 0.04 }));
  P.push(cyl(V(1.5, 1.04, 0.34), V(1.5, 1.2, 0.34), 0.07, 0.05, [170, 120, 60], { n: 8, amt: 0.05 }));
  P.push(cyl(V(1.5, 1.2, 0.34), V(1.5, 1.3, 0.34), 0.02, 0.03, [200, 210, 220], { n: 6, amt: 0.04 }));
  for (const x of [1.9, 2.05, 2.2]) P.push(cyl(V(x, 1.04, 0.4), V(x, 1.12, 0.4), 0.032, 0.035, [170, 182, 188], { n: 8, amt: 0.04 }));
  for (const lx of [0.8, 1.9]) {
    P.push(cyl(V(lx, 0, 0.95), V(lx, 0.02, 0.95), 0.2, 0.18, LUX_CHROME, { n: 10 }));
    P.push(cyl(V(lx, 0.02, 0.95), V(lx, 0.66, 0.95), 0.025, 0.025, LUX_CHROME, { n: 6 }));
    P.push(loft([rring(0.66, 0.38, 0.38, lx, 0.95, 12, 2), rring(0.74, 0.42, 0.42, lx, 0.95, 12, 2), rring(0.78, 0.36, 0.36, lx, 0.95, 12, 2)], [124, 16, 30], { smooth: true }));
  }
  S.push(...placeParts(P, MINIBAR.px, MINIBAR.pz, Math.PI, 0)); G.push(...placeParts(Gl, MINIBAR.px, MINIBAR.pz, Math.PI, 0));
  martini(MINIBAR.px - 1.05, 1.04, MINIBAR.pz - 0.42); martini(MINIBAR.px - 1.2, 1.04, MINIBAR.pz - 0.42);
  floorGlow(MINIBAR.px - 0.02, MINIBAR.pz - D + 0.03, MINIBAR.px - L + 0.02, MINIBAR.pz - D + 0.03, 0, -1, 0.6);
}
sconceZ(-10.9, -3.97, 1);
// ===== CARD ROOM: black lacquer, gold, a smoked mirror wall; the poker table runs lengthwise with the dealer at the side =====
const PK = { x: -14.6, z: 0.0, w: 1.25, d: 2.3 };
const FELT = [130, 20, 30], RAIL = [14, 12, 14], PK_WOOD = [20, 18, 20];
S.push(cyl(V(PK.x, 0, PK.z), V(PK.x, 0.04, PK.z), 0.5, 0.48, RAIL, { n: 12 }));
S.push(cyl(V(PK.x, 0.04, PK.z), V(PK.x, 0.66, PK.z), 0.18, 0.22, RAIL, { n: 10 }));
S.push(loft([rring(0.62, PK.w - 0.15, PK.d - 0.2, PK.x, PK.z, 20, 2), rring(0.74, PK.w + 0.1, PK.d + 0.1, PK.x, PK.z, 20, 2)], PK_WOOD, { amt: 0.04 }));
S.push(loft([rring(0.74, PK.w, PK.d, PK.x, PK.z, 24, 2), rring(0.775, PK.w, PK.d, PK.x, PK.z, 24, 2)], FELT, { amt: 0.03 }));
S.push(loft([rring(0.74, PK.w + 0.22, PK.d + 0.22, PK.x, PK.z, 24, 2), rring(0.795, PK.w + 0.24, PK.d + 0.24, PK.x, PK.z, 24, 2), rring(0.815, PK.w + 0.1, PK.d + 0.1, PK.x, PK.z, 24, 2), rring(0.79, PK.w - 0.01, PK.d - 0.01, PK.x, PK.z, 24, 2)], RAIL, { amt: 0.03, smooth: true, cap: false }));
S.push(loft([rring(0.776, PK.w - 0.42, PK.d - 0.5, PK.x, PK.z, 24, 2), rring(0.7775, PK.w - 0.42, PK.d - 0.5, PK.x, PK.z, 24, 2)], [200, 170, 90], { amt: 0.02, cap: false }));
S.push(loft([rring(0.7, PK.w + 0.255, PK.d + 0.255, PK.x, PK.z, 24, 2), rring(0.725, PK.w + 0.255, PK.d + 0.255, PK.x, PK.z, 24, 2)], LUX_CHROME, { amt: 0.02, cap: false }));
// the house logo on the felt, at the far end from the dealer
const CARD_SIGNS = [];
const feltLogo = goldSign("SH1DEN'S", 256, 64, 40); CARD_SIGNS.push(feltLogo);
const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), decal({ map: feltLogo.tex, transparent: true }));
logoMesh.rotation.x = -Math.PI / 2; logoMesh.rotation.z = Math.PI / 2; logoMesh.position.set(PK.x - 0.25, 0.782, PK.z); scene.add(logoMesh);
// whiskey glasses resting on the rail
for (const a of [2.2, 3.4, 4.1]) { const gx = PK.x + Math.cos(a) * (PK.w / 2 + 0.06), gz = PK.z + Math.sin(a) * (PK.d / 2 + 0.06);
  S.push(cyl(V(gx, 0.815, gz), V(gx, 0.895, gz), 0.034, 0.037, [170, 182, 188], { n: 8, amt: 0.04 })); S.push(cyl(V(gx, 0.82, gz), V(gx, 0.85, gz), 0.032, 0.032, [170, 100, 34], { n: 8, amt: 0.03 })); }
const CHIP_COLS = [[180, 24, 30], [20, 20, 24], [230, 228, 220], [30, 70, 160], [30, 120, 60]];
const chipStack = (x, z, col, n) => { for (let k = 0; k < n; k++) S.push(cyl(V(x, 0.776 + k * 0.0042, z), V(x, 0.776 + k * 0.0042 + 0.0038, z), 0.02, 0.02, k % 2 ? col : col.map((v) => v * 0.82), { n: 8, amt: 0.02 })); };
// the dealer's chip tray in front of him
{
  const tx = PK.x + PK.w / 2 - 0.12;
  S.push(box(tx - 0.07, tx + 0.07, 0.776, 0.8, PK.z - 0.3, PK.z + 0.3, [26, 22, 24], 0.03));
  for (let k = 0; k < 6; k++) for (let j = 0; j < 7; j++) S.push(cyl(V(tx - 0.035 + (k % 2) * 0.07, 0.79, PK.z - 0.26 + k * 0.004 + j * 0.075), V(tx - 0.035 + (k % 2) * 0.07, 0.83, PK.z - 0.26 + k * 0.004 + j * 0.075), 0.019, 0.019, CHIP_COLS[j % 5], { n: 6, amt: 0.03 }));
}
// six seats around the oval; the one facing the dealer side is his place, so five chairs for players
const POKER_SEATS = [];
const DEALER = { x: PK.x + PK.w / 2 + 0.42, z: PK.z, yaw: -Math.PI / 2 };
for (let i = 1; i < 6; i++) {
  const a = Math.PI * 2 * i / 6, ca = Math.cos(a), sa = Math.sin(a);
  const ex = PK.x + ca * (PK.w / 2 + 0.5), ez = PK.z + sa * (PK.d / 2 + 0.5), yaw = Math.atan2(PK.x - ex, PK.z - ez);
  // red velvet, button-tufted, on chrome legs
  const VEL = [124, 16, 30], VEL_D = [92, 10, 22];
  const chair = [loft([rect(0.38, 0.5, 0.48, 0, 0), rect(0.47, 0.52, 0.5, 0, 0), rect(0.5, 0.48, 0.46, 0, 0)], VEL, { amt: 0.03 }),
    loft([rect(0.48, 0.52, 0.12, 0, -0.24), rect(0.86, 0.5, 0.12, 0, -0.27), rect(0.98, 0.42, 0.1, 0, -0.29)], VEL, { amt: 0.03 })];
  for (const by of [0.6, 0.72, 0.84]) for (const bx of [-0.16, 0, 0.16]) chair.push(box(bx - 0.008, bx + 0.008, by - 0.008, by + 0.008, -0.188 - (by - 0.48) * 0.08, -0.176 - (by - 0.48) * 0.08, VEL_D, 0));
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) chair.push(cyl(V(lx, 0, lz), V(lx * 0.9, 0.38, lz * 0.9), 0.014, 0.018, LUX_CHROME, { n: 5 }));
  S.push(...placeParts(chair, ex, ez, yaw, 0));
  POKER_SEATS.push([ex + Math.sin(yaw) * 0.02, ez + Math.cos(yaw) * 0.02, yaw, ca, sa]);
}
chandelierRound(PK.x, PK.z, 2.5, 0.62);
// smoked mirror on the left wall, gold coves along the top of every wall, a deep red oval rug
{
  const mirTex = canvasTex(16, 32, (x, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = 0.5 + 0.5 * Math.sin((i + j * 0.6) * 0.35); x.fillStyle = `rgb(${Math.round(22 + 16 * k)},${Math.round(20 + 14 * k)},${Math.round(24 + 18 * k)})`; x.fillRect(i, j, 1, 1); } });
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.8), decal({ map: mirTex }));
  mir.position.set(-16.96, 1.75, 0); mir.rotation.y = Math.PI / 2; scene.add(mir);
  S.push(box(-16.99, -16.93, 0.8, 0.85, -2.55, 2.55, LUX_GOLD, 0.02)); S.push(box(-16.99, -16.93, 2.65, 2.7, -2.55, 2.55, LUX_GOLD, 0.02));
  const r = ROOMS.card;
  for (const [x0, x1, z0, z1] of [[r.x0, r.x1, r.z0, r.z0 + 0.05], [r.x0, r.x1, r.z1 - 0.05, r.z1], [r.x0, r.x0 + 0.05, r.z0, r.z1], [r.x1 - 0.05, r.x1, r.z0, 2.2], [r.x1 - 0.05, r.x1, 3.6, r.z1]])
    G.push(box(x0, x1, 3.0, 3.03, z0, z1, [255, 214, 150], 0));
  const rugTex2 = canvasTex(32, 32, (x, w, h) => {
    noiseFill(x, w, h, [70, 8, 16], 6);
    x.strokeStyle = 'rgb(170,128,58)'; x.lineWidth = 1; x.beginPath(); x.ellipse(16, 16, 14, 14, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(16, 16, 11, 11, 0, 0, 7); x.stroke();
  });
  const rug2 = new THREE.Mesh(new THREE.CircleGeometry(1, 32), decal({ map: rugTex2 }));
  rug2.rotation.x = -Math.PI / 2; rug2.scale.set(1.7, 2.6, 1); rug2.position.set(PK.x, 0.024, PK.z); scene.add(rug2);
}
// champagne trolley by the front wall, a glass case of high-value chips in the back corner
{
  const cx = -16.2, cz = 3.2;
  S.push(box(cx - 0.35, cx + 0.35, 0.78, 0.8, cz - 0.22, cz + 0.22, LUX_GOLD, 0.02)); S.push(box(cx - 0.35, cx + 0.35, 0.25, 0.27, cz - 0.22, cz + 0.22, LUX_GOLD, 0.02));
  for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(cyl(V(cx + ex * 0.33, 0.06, cz + ez * 0.2), V(cx + ex * 0.33, 0.8, cz + ez * 0.2), 0.012, 0.012, LUX_GOLD, { n: 4 }));
  for (const [ex, ez] of [[-1, -1], [1, 1]]) S.push(cyl(V(cx + ex * 0.33, 0.06, cz + ez * 0.2), V(cx + ex * 0.33, 0.0, cz + ez * 0.2), 0.05, 0.05, [20, 20, 22], { n: 8 }));
  S.push(cyl(V(cx - 0.12, 0.8, cz), V(cx - 0.12, 0.98, cz), 0.1, 0.12, LUX_CHROME, { n: 10, amt: 0.04 }));
  S.push(cyl(V(cx - 0.12, 0.9, cz), V(cx - 0.12, 1.2, cz), 0.04, 0.04, [20, 40, 24], { n: 7, amt: 0.04 }));
  S.push(cyl(V(cx - 0.12, 1.2, cz), V(cx - 0.12, 1.24, cz), 0.025, 0.025, [210, 180, 90], { n: 6, amt: 0.02 }));
  for (const [ox, oz] of [[0.12, -0.08], [0.22, 0.06], [0.1, 0.1]]) { S.push(cyl(V(cx + ox, 0.8, cz + oz), V(cx + ox, 0.88, cz + oz), 0.004, 0.004, [200, 210, 220], { n: 4 })); S.push(cyl(V(cx + ox, 0.88, cz + oz), V(cx + ox, 0.92, cz + oz), 0.006, 0.045, [200, 210, 220], { n: 8, amt: 0.05 })); }
  const qx = -16.4, qz = -3.35;
  S.push(box(qx - 0.4, qx + 0.4, 0, 0.9, qz - 0.3, qz + 0.3, LUX_BLACK, 0.03)); S.push(box(qx - 0.41, qx + 0.41, 0.9, 0.93, qz - 0.31, qz + 0.31, LUX_GOLD, 0.02));
  for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { const col = CHIP_COLS[(k + j) % 5]; for (let c = 0; c < 6; c++) S.push(cyl(V(qx - 0.27 + k * 0.18, 0.93 + c * 0.0045, qz - 0.15 + j * 0.15), V(qx - 0.27 + k * 0.18, 0.934 + c * 0.0045, qz - 0.15 + j * 0.15), 0.022, 0.022, c % 2 ? col : col.map((v) => v * 0.8), { n: 8, amt: 0.02 })); }
  G.push(box(qx - 0.38, qx + 0.38, 1.42, 1.44, qz - 0.28, qz + 0.28, [255, 236, 200], 0));
  const caseGlass = new THREE.Mesh(toGeometry([box(qx - 0.4, qx + 0.4, 0.93, 1.45, qz - 0.3, qz + 0.3, [180, 200, 210], 0)]), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.18, depthWrite: false }));
  caseGlass.renderOrder = 2; scene.add(caseGlass);
}
// the door to the card room: shut, roped off and signed whenever the host is away
doorFrame(-11.8, 2.2, -11.8, 3.6);
const cardClosed = new THREE.Group(); scene.add(cardClosed);
{
  const P = [box(-11.84, -11.76, 0, DOOR_H, 2.22, 2.89, [20, 16, 18]), box(-11.84, -11.76, 0, DOOR_H, 2.91, 3.58, [20, 16, 18])];
  for (const z of [2.84, 2.96]) P.push(box(-11.74, -11.7, 1.0, 1.35, z - 0.012, z + 0.012, LUX_GOLD, 0.02));
  for (const z of [2.45, 3.35]) { P.push(cyl(V(-11.35, 0, z), V(-11.35, 0.03, z), 0.13, 0.12, BRASS_D, { n: 8 })); P.push(cyl(V(-11.35, 0.03, z), V(-11.35, 0.95, z), 0.025, 0.025, BRASS, { n: 6 })); }
  P.push(tube([V(-11.35, 0.9, 2.45), V(-11.38, 0.68, 2.9), V(-11.35, 0.9, 3.35)], [0.022, 0.022, 0.022], VELVET, { n: 5 }));
  cardClosed.add(new THREE.Mesh(toGeometry(P), roomMat));
  const sign = goldSign('CLOSED · PRIVATE GAME', 320, 40, 22); CARD_SIGNS.push(sign);
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), decal({ map: sign.tex, transparent: true }));
  sm.position.set(-11.7, 1.75, 2.9); sm.rotation.y = Math.PI / 2; cardClosed.add(sm);
}
// a red version of the entrance banquettes in the corner between the cinema and bar doors
const VELVET_R = [126, 16, 30], VELVET_RD = [92, 10, 22], POOL_SOFA = [];
banquette(-8.25, -3.95, 0, 3.2, VELVET_R, VELVET_RD);
banquette(-5.05, -3.29, -Math.PI / 2, 3.4, VELVET_R, VELVET_RD);
loungeTable(-6.5, -2.3);
for (const x of [-7.7, -7.0, -6.3, -5.6]) POOL_SOFA.push([x, -3.62, 0]);
for (const z of [-2.7, -2.0, -1.3, -0.6]) POOL_SOFA.push([-5.38, z, -Math.PI / 2]);
// velvet rope in front of the VIP door
for (const z of [-8.75, -6.75]) {
  S.push(cyl(V(-5.4, 0, z), V(-5.4, 0.03, z), 0.13, 0.12, BRASS_D, { n: 8 }));
  S.push(cyl(V(-5.4, 0.03, z), V(-5.4, 0.95, z), 0.025, 0.025, BRASS, { n: 6 }));
  S.push(cyl(V(-5.4, 0.95, z), V(-5.4, 1.01, z), 0.045, 0.03, BRASS, { n: 6 }));
}
S.push(tube([V(-5.4, 0.9, -8.75), V(-5.43, 0.72, -8.25), V(-5.45, 0.66, -7.75), V(-5.43, 0.72, -7.25), V(-5.4, 0.9, -6.75)], [0.022, 0.022, 0.022, 0.022, 0.022], VELVET, { n: 5 }));
sconceZ(-6.2, -10.97, 1); sconceZ(-12.0, -10.97, 1);


// gothic portraits in the billiards room: original vampire nobles, each with a pool cue instead of a sword
function paintingTex(kind) {
  return canvasTex(32, 44, (x, w, h) => {
    const P = (c, i, j, ww, hh) => { x.fillStyle = c; x.fillRect(i, j, ww || 1, hh || 1); };
    const grad = (top, bot) => { for (let j = 0; j < h; j++) { const k = j / (h - 1); P(`rgb(${Math.round(top[0] + (bot[0] - top[0]) * k)},${Math.round(top[1] + (bot[1] - top[1]) * k)},${Math.round(top[2] + (bot[2] - top[2]) * k)})`, 0, j, w, 1); } };
    const ell = (c, cx, cy, rx, ry) => { for (let j = -ry; j <= ry; j++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry)))); P(c, cx - hw, cy + j, hw * 2 + 1, 1); } };
    const body = (c, y0, w0, w1) => { for (let j = y0; j < h; j++) { const ww = Math.round(w0 + (w1 - w0) * (j - y0) / (h - 1 - y0)); P(c, 16 - (ww >> 1), j, ww, 1); } };
    const cue = (x0, y0, x1, y1) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) {
        const t = k / n, i = Math.round(x0 + (x1 - x0) * t), j = Math.round(y0 + (y1 - y0) * t);
        P(t < 0.3 ? '#3a2010' : t < 0.34 ? '#c8b070' : t > 0.95 ? '#e8e6dc' : '#b48a52', i, j, t < 0.3 ? 2 : 1, 1);
      }
      P('#4a6ab0', x1, y1, 1, 1);
    };
    if (kind === 0) {            // the countess, by a moonlit arch
      grad([44, 6, 16], [10, 2, 4]);
      P('#1c1640', 10, 4, 12, 13); ell('#1c1640', 16, 4, 6, 3); ell('#d8d0b8', 16, 8, 3, 3);
      P('#0c0808', 9, 6, 14, 24);
      body('#5a0a14', 20, 12, 26); P('#1a0408', 11, 19, 3, 4); P('#1a0408', 18, 19, 3, 4);
      ell('#d9c8bc', 16, 12, 4, 5); P('#d9c8bc', 15, 17, 3, 3);
      P('#6a0a10', 14, 11); P('#6a0a10', 18, 11); P('#a0101c', 15, 15, 3, 1);
      for (let i = 12; i < 21; i += 2) P('#c8a040', i, 22);
      cue(4, 43, 27, 5); P('#d9c8bc', 20, 16, 2, 2); P('#d9c8bc', 10, 32, 2, 2);
    } else if (kind === 1) {     // the duke, cape and high collar, cue held like a staff
      grad([20, 10, 26], [5, 2, 8]); ell('#3a1a0a', 5, 30, 4, 6); P('#ffb050', 5, 27, 1, 2);
      body('#0c0a0e', 18, 14, 32);
      for (let j = 20; j < 34; j++) { const ww = Math.round((j - 20) * 0.6); P('#7a0c14', 16 - ww, j, 1, 1); P('#7a0c14', 15 + ww, j, 1, 1); }
      P('#0c0a0e', 8, 12, 4, 9); P('#0c0a0e', 20, 12, 4, 9); P('#7a0c14', 9, 13, 2, 7); P('#7a0c14', 21, 13, 2, 7);
      ell('#d4c4b6', 16, 11, 4, 5); P('#d4c4b6', 15, 16, 3, 3);
      P('#0a0808', 12, 5, 8, 3); P('#0a0808', 15, 8, 2, 1);
      P('#c8a040', 14, 11); P('#c8a040', 18, 11); P('#0a0808', 13, 10, 2, 1); P('#0a0808', 17, 10, 2, 1); P('#6a1018', 15, 14, 3, 1);
      P('#e0dcd0', 14, 18, 4, 3);
      cue(26, 43, 26, 2); P('#d4c4b6', 25, 26, 3, 2);
    } else if (kind === 2) {     // the host: bald, round shades, moustache and pointed chin beard, cigar
      grad([28, 8, 34], [4, 2, 6]); ell('#7a0e48', 16, 12, 10, 10); ell('#9a1660', 16, 12, 7, 7);
      body('#101012', 23, 18, 30); P('#1e1e22', 14, 23, 4, 6); P('#28282c', 15, 23, 2, 9);
      ell('#9a6650', 16, 13, 5, 7); P('#9a6650', 14, 20, 5, 3); P('#b07a62', 14, 8, 3, 2);
      for (const cx of [13, 18]) { P('#111', cx - 1, 11, 3, 1); P('#111', cx - 1, 13, 3, 1); P('#111', cx - 2, 12, 1, 1); P('#111', cx + 2, 12, 1, 1); P('#5a7070', cx - 1, 12, 3, 1); }
      P('#111', 15, 12, 2, 1);
      P('#0a0808', 13, 16, 7, 1); P('#0a0808', 12, 17, 2, 2); P('#0a0808', 19, 17, 2, 2);
      P('#0a0808', 15, 18, 2, 5); P('#0a0808', 16, 23, 1, 1);
      P('#5a3018', 18, 17, 4, 1); P('#ff4010', 22, 17, 1, 1); P('#b0b0b0', 23, 15, 1, 1); P('#909090', 24, 13, 1, 1);
      cue(3, 41, 29, 21);
    } else {                     // a hooded figure in a gothic window under a full moon
      grad([10, 10, 30], [3, 3, 8]);
      P('#1a2050', 6, 10, 20, 26); ell('#1a2050', 16, 10, 10, 7); ell('#e0dcc8', 16, 10, 4, 4);
      for (const [bx, by] of [[9, 6], [22, 5], [25, 12]]) { P('#050508', bx - 1, by, 1, 1); P('#050508', bx + 1, by, 1, 1); P('#050508', bx, by + 1, 1, 1); }
      ell('#060408', 16, 19, 5, 6); body('#060408', 22, 12, 30);
      P('#ff2020', 14, 19); P('#ff2020', 18, 19);
      cue(6, 43, 26, 8); P('#3a3040', 21, 23, 2, 2);
    }
    // darker edges, like old varnish
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
  });
}
const PAINTINGS = [];
function painting(kind, px, pz, yaw, cy) {
  PAINTINGS.push({ kind, px, pz, yaw, cy });
  const GOLD = [150, 112, 54], GOLD_D = [96, 72, 36], cw = 0.72, ch = 0.99, f = 0.07;
  const parts = [];
  parts.push(box(-cw / 2 - f, cw / 2 + f, cy + ch / 2, cy + ch / 2 + f, 0.012, 0.075, GOLD, 0.03));
  parts.push(box(-cw / 2 - f, cw / 2 + f, cy - ch / 2 - f, cy - ch / 2, 0.012, 0.075, GOLD, 0.03));
  parts.push(box(-cw / 2 - f, -cw / 2, cy - ch / 2, cy + ch / 2, 0.012, 0.075, GOLD_D, 0.03));
  parts.push(box(cw / 2, cw / 2 + f, cy - ch / 2, cy + ch / 2, 0.012, 0.075, GOLD_D, 0.03));
  parts.push(box(-cw / 2, cw / 2, cy - ch / 2, cy + ch / 2, 0.012, 0.03, [8, 6, 6], 0.02));
  // a little brass picture light over the frame
  parts.push(box(-0.22, 0.22, cy + ch / 2 + f + 0.06, cy + ch / 2 + f + 0.1, 0.06, 0.18, GOLD, 0.03));
  parts.push(cyl(V(0, cy + ch / 2 + f + 0.08, 0.012), V(0, cy + ch / 2 + f + 0.08, 0.1), 0.012, 0.012, GOLD_D, { n: 4 }));
  S.push(...placeParts(parts, px, pz, yaw, 0));
  G.push(...placeParts([box(-0.2, 0.2, cy + ch / 2 + f + 0.055, cy + ch / 2 + f + 0.062, 0.08, 0.17, [255, 226, 170], 0)], px, pz, yaw, 0));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshLambertMaterial({ map: paintingTex(kind) }));
  m.position.set(px + Math.sin(yaw) * 0.034, cy, pz + Math.cos(yaw) * 0.034); m.rotation.y = yaw; scene.add(m);
}
painting(0, -15.2, 4.0, Math.PI, 1.85);
painting(3, -6.8, 4.0, Math.PI, 1.85);
painting(1, -6.8, -4.0, 0, 1.85);
painting(2, -14.4, -4.0, 0, 2.0);

// ===== VIP LOUNGE: dark panels, pink neon, a glowing disc behind a tall plant, cognac leather sofas =====
const FX = -1.1;                       // centre of the feature wall
const PINK = [255, 46, 150], PINK_HI = [255, 120, 200];
const COGNAC = [138, 76, 38], COGNAC_D = [100, 52, 26], COGNAC_HI = [156, 90, 48];
const MARBLE_BK = [18, 18, 20];
// feature wall: a dark recessed square outlined in neon, with the glowing disc and a plant in front
S.push(box(FX - 1.4, FX + 1.4, 0.35, 2.95, -10.99, -10.965, [8, 6, 9], 0.02));
for (const [x0, x1, y0, y1] of [[FX - 1.44, FX + 1.44, 2.93, 2.97], [FX - 1.44, FX + 1.44, 0.33, 0.37], [FX - 1.44, FX - 1.4, 0.33, 2.97], [FX + 1.4, FX + 1.44, 0.33, 2.97]])
  G.push(box(x0, x1, y0, y1, -10.965, -10.94, PINK, 0));
const discTex = canvasTex(64, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const r = Math.hypot(i - w / 2 + 0.5, j - h / 2 + 0.5) / (w / 2), k = Math.max(0, 1 - r * r);
    x.fillStyle = `rgb(${Math.round(236 + 19 * k)},${Math.round(40 + 120 * k)},${Math.round(150 + 70 * k)})`; x.fillRect(i, j, 1, 1);
  }
});
const disc = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28), decal({ map: discTex, fog: false }));
disc.position.set(FX, 1.62, -10.92); scene.add(disc);
S.push(box(FX - 1.38, FX + 1.38, 0.37, 0.43, -10.965, -10.72, [16, 12, 14], 0.03));
S.push(cyl(V(FX, 0.43, -10.83), V(FX, 0.68, -10.83), 0.1, 0.13, [12, 12, 14], { n: 10 }));
for (let k = 0; k < 24; k++) {
  const a = (k / 24) * Math.PI * 2, lean = 0.06 + (k % 4) * 0.045, h = 1.1 + ((k * 7) % 5) * 0.16;
  const bx = FX + Math.cos(a) * 0.04, bz = -10.83 + Math.sin(a) * 0.03;
  const tx = bx + Math.cos(a) * lean * 3, tz = Math.max(-10.88, bz + Math.sin(a) * lean * 1.2);
  S.push(tube([V(bx, 0.66, bz), V((bx + tx) / 2, 0.66 + h * 0.55, (bz + tz) / 2), V(tx, 0.66 + h, tz)], [0.02, 0.014, 0.003], k % 2 ? [22, 30, 20] : [30, 38, 24], { n: 4 }));
}
// black marble dado with small pink lights above it, neon cove strips along the tops of the side walls
for (const [x0, x1, z0, z1] of [[-4.985, -4.96, -10.98, -8.5], [-4.985, -4.96, -7.0, -4.02], [1.96, 1.985, -10.98, -4.02], [-4.98, -4.4, -10.985, -10.96], [-3.2, FX - 1.46, -10.985, -10.96], [FX + 1.46, 1.98, -10.985, -10.96]]) {
  S.push(box(x0, x1, 0, 0.85, z0, z1, MARBLE_BK, 0.03));
  S.push(box(x0 - (x1 - x0 < 0.1 ? 0.005 : 0), x1 + (x1 - x0 < 0.1 ? 0.005 : 0), 0.85, 0.875, z0, z1, [60, 58, 62], 0.02));
}
for (const [x0, x1] of [[-4.99, -4.93], [1.93, 1.99]]) G.push(box(x0, x1, 2.98, 3.02, -10.97, -4.03, PINK, 0));
for (const [x, z] of [[-4.94, -10.0], [-4.94, -5.4], [1.94, -10.0], [1.94, -5.6]]) G.push(box(x - 0.012, x + 0.012, 0.95, 1.02, z - 0.13, z + 0.13, PINK_HI, 0));
// the pink wash the cove strips throw down the side walls
const washTex = canvasTex(4, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) { const k = Math.pow(1 - j / (h - 1), 2.2); x.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(20 * k)},${Math.round(80 * k)})`; x.fillRect(0, j, w, 1); }
});
const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
for (const [x, z0, z1, ry] of [[-4.95, -10.97, -8.5, Math.PI / 2], [-4.95, -7.0, -4.03, Math.PI / 2], [1.95, -10.97, -4.03, -Math.PI / 2]]) {
  const y0 = z1 > -7.1 && z0 > -7.1 || x > 0 ? 1.0 : 1.0;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 3.0 - y0), washMat);
  m.position.set(x, (3.0 + y0) / 2, (z0 + z1) / 2); m.rotation.y = ry; scene.add(m);
}
// a patterned rug and two round wooden tables
const rugTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [150, 122, 98], 10);
  x.fillStyle = 'rgb(40,24,20)'; x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2); x.fillRect(0, 0, 2, h); x.fillRect(w - 2, 0, 2, h);
  x.fillStyle = 'rgb(150,60,40)';
  for (let j = 5; j < h - 4; j += 6) for (let i = 5; i < w - 4; i += 6) { x.fillRect(i + 1, j, 1, 3); x.fillRect(i, j + 1, 3, 1); }
  x.fillStyle = 'rgb(70,40,30)'; for (let i = 4; i < w - 4; i += 2) { x.fillRect(i, 3, 1, 1); x.fillRect(i, h - 4, 1, 1); }
});
const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), decal({ map: rugTex }));
rug.rotation.x = -Math.PI / 2; rug.position.set(FX, 0.024, -8.55); scene.add(rug);
// a big round glass table: chrome rim and pedestal, a crystal ashtray, cigars, cutters, cards and chips
const CHROME_C = [170, 174, 182], CIGAR = [92, 58, 32], BAND = [196, 156, 64];
const GT = { x: FX, z: -8.6, r: 0.8, y: 0.44 };
S.push(cyl(V(GT.x, 0, GT.z), V(GT.x, 0.05, GT.z), 0.36, 0.34, CHROME_C, { n: 16, amt: 0.03 }));
S.push(cyl(V(GT.x, 0.03, GT.z), V(GT.x, GT.y - 0.02, GT.z), 0.055, 0.055, CHROME_C, { n: 10, amt: 0.03 }));
S.push(cyl(V(GT.x, GT.y - 0.02, GT.z), V(GT.x, GT.y - 0.015, GT.z), 0.25, 0.25, CHROME_C, { n: 12, amt: 0.03 }));
S.push(cyl(V(GT.x, GT.y - 0.022, GT.z), V(GT.x, GT.y + 0.002, GT.z), GT.r + 0.012, GT.r + 0.012, CHROME_C, { n: 28, amt: 0.02, cap: false }));
const tableGlassMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false }));
const tableGlass = new THREE.Mesh(toGeometry([cyl(V(GT.x, GT.y - 0.02, GT.z), V(GT.x, GT.y, GT.z), GT.r, GT.r, [150, 190, 200], { n: 28, amt: 0.02 })]), tableGlassMat);
tableGlass.renderOrder = 2; scene.add(tableGlass);
// crystal ashtray, cut like a diamond, with two cigars resting on it (one still burning)
{
  const ax = GT.x, az = GT.z, y = GT.y + 0.001;
  S.push(loft([rring(y, 0.17, 0.17, ax, az, 8, 2), rring(y + 0.03, 0.27, 0.27, ax, az, 8, 2), rring(y + 0.055, 0.29, 0.29, ax, az, 8, 2), rring(y + 0.062, 0.25, 0.25, ax, az, 8, 2)], [196, 212, 224], { amt: 0.14 }));
  S.push(cyl(V(ax, y + 0.05, az), V(ax, y + 0.0625, az), 0.1, 0.1, [36, 38, 44], { n: 8, amt: 0.03 }));
  for (const [dx, dz, ex, ez, lit] of [[0.02, 0.01, 0.2, 0.07, true], [-0.03, -0.01, -0.19, -0.1, false]]) {
    S.push(cyl(V(ax + dx, y + 0.068, az + dz), V(ax + ex, y + 0.064, az + ez), 0.011, 0.011, CIGAR, { n: 6, amt: 0.03 }));
    const bx = ax + dx + (ex - dx) * 0.78, bz = az + dz + (ez - dz) * 0.78;
    S.push(cyl(V(bx - (ex - dx) * 0.04, y + 0.065, bz - (ez - dz) * 0.04), V(bx + (ex - dx) * 0.04, y + 0.065, bz + (ez - dz) * 0.04), 0.0118, 0.0118, BAND, { n: 6, amt: 0.02 }));
    if (lit) { S.push(cyl(V(ax + dx, y + 0.068, az + dz), V(ax + dx - (ex - dx) * 0.12, y + 0.068, az + dz - (ez - dz) * 0.12), 0.0112, 0.0112, [150, 148, 144], { n: 6, amt: 0.05 })); G.push(cyl(V(ax + dx - (ex - dx) * 0.12, y + 0.068, az + dz - (ez - dz) * 0.12), V(ax + dx - (ex - dx) * 0.13, y + 0.068, az + dz - (ez - dz) * 0.13), 0.0105, 0.009, [255, 90, 30], { n: 6, amt: 0 })); }
  }
  // loose cigars
  for (const [x0, z0, ang] of [[0.36, 0.2, 0.4], [0.4, 0.26, 0.55], [-0.42, -0.3, 2.2]]) {
    const L = 0.15, c = Math.cos(ang), sn = Math.sin(ang);
    S.push(cyl(V(ax + x0, y + 0.011, az + z0), V(ax + x0 + c * L, y + 0.011, az + z0 + sn * L), 0.011, 0.011, CIGAR, { n: 6, amt: 0.03 }));
    S.push(cyl(V(ax + x0 + c * L * 0.72, y + 0.011, az + z0 + sn * L * 0.72), V(ax + x0 + c * L * 0.8, y + 0.011, az + z0 + sn * L * 0.8), 0.0118, 0.0118, BAND, { n: 6, amt: 0.02 }));
  }
  // cigar cutters
  for (const [x0, z0, col] of [[-0.36, 0.22, CHROME_C], [0.28, -0.36, [24, 24, 28]]]) {
    S.push(box(ax + x0 - 0.035, ax + x0 + 0.035, y, y + 0.012, az + z0 - 0.015, az + z0 + 0.015, col, 0.03));
    S.push(cyl(V(ax + x0, y + 0.012, az + z0), V(ax + x0, y + 0.0125, az + z0), 0.01, 0.01, [6, 6, 6], { n: 6, amt: 0 }));
  }
  // playing cards, a deck and some poker chips
  const cards = [];
  [[0.12, 0.42, 0.3], [0.2, 0.46, -0.5], [0.05, 0.5, 1.1], [-0.18, 0.44, 0.7], [-0.52, 0.05, 1.6], [0.5, -0.12, 2.6]].forEach(([x0, z0, ang], k) => {
    const yy = y + 0.0012 * k;
    const card = [box(-0.032, 0.032, yy, yy + 0.0012, -0.045, 0.045, [236, 232, 224], 0.02), box(-0.008, 0.008, yy + 0.0012, yy + 0.0016, -0.012, 0.012, k % 2 ? [190, 20, 30] : [16, 16, 18], 0)];
    S.push(...placeParts(card, ax + x0, az + z0, ang, 0));
  });
  S.push(...placeParts([box(-0.032, 0.032, y, y + 0.025, -0.045, 0.045, [236, 232, 224], 0.02), box(-0.03, 0.03, y + 0.025, y + 0.0256, -0.043, 0.043, [150, 20, 30], 0.02)], ax - 0.3, az - 0.42, 0.2, 0));
  [[-0.5, 0.3, [180, 24, 30], 6], [-0.44, 0.36, [20, 20, 24], 4], [-0.54, 0.38, [230, 228, 220], 8]].forEach(([x0, z0, col, n]) => {
    for (let k = 0; k < n; k++) S.push(cyl(V(ax + x0, y + k * 0.0042, az + z0), V(ax + x0, y + k * 0.0042 + 0.0038, az + z0), 0.02, 0.02, k % 2 ? col : col.map((v) => v * 0.85), { n: 8, amt: 0.02 }));
  });
}
// cognac leather sofas: a long one under the disc and two curved ones facing each other
const VIP_CHAIRS = [];
function sofaParts(len, curve) {
  // built facing +z (the way a seated character looks), centred on the seat
  const P = [], half = len / 2;
  const arcZ = (x) => -0.42 + curve * (x / half) * (x / half);
  P.push(loft([rring(0.06, len - 0.1, 0.86, 0, 0.02, 16, 3.5), rring(0.36, len, 0.9, 0, 0.02, 16, 3.5), rring(0.44, len - 0.08, 0.84, 0, 0.03, 16, 3.5)], COGNAC, { amt: 0.04, smooth: true }));
  const n = 10, back = [], low = [];
  for (let i = 0; i <= n; i++) { const x = -half + 0.12 + (len - 0.24) * i / n; back.push(V(x, 0.74, arcZ(x))); low.push(V(x, 0.5, arcZ(x) + 0.03)); }
  P.push(tube(back, back.map(() => 0.17), COGNAC_HI, { n: 10 }));
  P.push(tube(low, low.map(() => 0.19), COGNAC, { n: 10 }));
  for (const e of [-1, 1]) P.push(tube([V(e * (half - 0.08), 0.52, arcZ(e * (half - 0.08)) + 0.05), V(e * (half - 0.06), 0.55, 0.12), V(e * (half - 0.1), 0.5, 0.38)], [0.14, 0.15, 0.13], COGNAC_HI, { n: 10 }));
  // tufting buttons on the back
  for (let i = 1; i < n; i += 2) { const x = back[i][0]; P.push(cyl(V(x, 0.74, arcZ(x) + 0.16), V(x, 0.74, arcZ(x) + 0.175), 0.012, 0.012, COGNAC_D, { n: 4, amt: 0 })); }
  for (const e of [-1, 1]) for (const f of [-1, 1]) P.push(cyl(V(e * (half - 0.2), 0, f * 0.3), V(e * (half - 0.2), 0.06, f * 0.3), 0.03, 0.03, [20, 14, 10], { n: 4 }));
  return P;
}
function sofa(cx, cz, yaw, len, curve, seats) {
  S.push(...placeParts(sofaParts(len, curve), cx, cz, yaw, 0));
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const lx of seats) VIP_CHAIRS.push([cx + lx * c + 0.06 * s, cz - lx * s + 0.06 * c, yaw]);
}
sofa(FX, -10.15, 0, 2.6, 0.08, [0, -0.82, 0.82]);                    // the host sits in the middle
sofa(-3.45, -8.05, Math.PI / 2 - 0.3, 1.9, 0.32, [-0.42, 0.42]);
sofa(0.95, -8.05, -Math.PI / 2 + 0.3, 1.9, 0.32, [-0.42, 0.42]);
// the VIP's own TV, on its front wall (hosts choose what plays on it)
const VTV = { x: -1.5, y: 1.68, z: -4.09, w: 2.4, h: 1.35 };
{
  const T = [];
  T.push(box(VTV.x - VTV.w / 2 - 0.06, VTV.x + VTV.w / 2 + 0.06, VTV.y - VTV.h / 2 - 0.06, VTV.y + VTV.h / 2 + 0.06, -4.065, -4.04, [10, 10, 12], 0.02));
  // the same dark recess and pink neon square as the disc wall, framing the TV
  const RX = VTV.w / 2 + 0.32, RY0 = 0.62, RY1 = 2.78;
  T.push(box(VTV.x - RX, VTV.x + RX, RY0, RY1, -4.03, -4.012, [8, 6, 9], 0.02));
  for (const [x0, x1, y0, y1] of [[VTV.x - RX - 0.04, VTV.x + RX + 0.04, RY1 - 0.02, RY1 + 0.02], [VTV.x - RX - 0.04, VTV.x + RX + 0.04, RY0 - 0.02, RY0 + 0.02], [VTV.x - RX - 0.04, VTV.x - RX, RY0 - 0.02, RY1 + 0.02], [VTV.x + RX, VTV.x + RX + 0.04, RY0 - 0.02, RY1 + 0.02]])
    G.push(box(x0, x1, y0, y1, -4.055, -4.03, PINK, 0));
  // low media console with a pink light underneath
  T.push(box(VTV.x - 1.1, VTV.x + 1.1, 0.06, 0.48, -4.46, -4.015, [16, 14, 16], 0.03));
  T.push(box(VTV.x - 1.12, VTV.x + 1.12, 0.48, 0.51, -4.48, -4.015, [60, 58, 62], 0.02));
  for (const dx of [-0.37, 0.37]) T.push(box(VTV.x + dx - 0.005, VTV.x + dx + 0.005, 0.1, 0.44, -4.465, -4.455, [40, 30, 34], 0.02));
  S.push(...T);
  G.push(box(VTV.x - 1.05, VTV.x + 1.05, 0.045, 0.06, -4.44, -4.05, PINK, 0));
}
succulent(-4.55, 0, -4.45, 2.2);
// a tall glass-front humidor beside the TV, stocked with cigars (a few gaps where some have been smoked)
{
  const HX0 = 0.45, HX1 = 1.55, HZ0 = -4.5, HZ1 = -4.02, WOOD_H = [48, 28, 18], CEDAR = [150, 96, 58];
  S.push(box(HX0, HX1, 0, 0.12, HZ0, HZ1, WOOD_H));
  S.push(box(HX0, HX1, 1.9, 1.96, HZ0 - 0.02, HZ1, WOOD_H));
  S.push(box(HX0, HX0 + 0.05, 0.12, 1.9, HZ0, HZ1, WOOD_H)); S.push(box(HX1 - 0.05, HX1, 0.12, 1.9, HZ0, HZ1, WOOD_H));
  S.push(box(HX0 + 0.05, HX1 - 0.05, 0.12, 1.9, HZ1 - 0.04, HZ1, CEDAR, 0.05));
  const shelves = [0.5, 0.9, 1.3, 1.66];
  for (const sy of shelves) S.push(box(HX0 + 0.05, HX1 - 0.05, sy - 0.02, sy, HZ0 + 0.03, HZ1 - 0.04, CEDAR, 0.04));
  // bundles of cigars lying side by side, three high; some bundles are short or gone (already smoked)
  shelves.forEach((sy, row) => {
    for (let k = 0; k < 6; k++) {
      const x0 = HX0 + 0.09 + k * 0.158, missing = (k * 5 + row * 3) % 7;
      const high = missing === 0 ? 0 : missing === 3 ? 1 : missing === 5 ? 2 : 3;
      for (let lay = 0; lay < high; lay++) for (const dz of [0.08, 0.104, 0.128]) {
        const y = sy + 0.011 + lay * 0.021;
        S.push(cyl(V(x0, y, HZ0 + dz), V(x0 + 0.14, y, HZ0 + dz), 0.0105, 0.0105, (k + lay) % 3 ? CIGAR : [110, 70, 38], { n: 5, amt: 0.05 }));
        if (dz === 0.08) S.push(cyl(V(x0 + 0.1, y, HZ0 + dz), V(x0 + 0.113, y, HZ0 + dz), 0.0113, 0.0113, BAND, { n: 5, amt: 0.02 }));
      }
    }
  });
  // two open cigar boxes on the bottom
  for (const [bx0, bx1] of [[HX0 + 0.08, HX0 + 0.48], [HX0 + 0.56, HX1 - 0.08]]) {
    S.push(box(bx0, bx1, 0.12, 0.2, HZ0 + 0.06, HZ1 - 0.08, [120, 74, 40], 0.04));
    S.push(box(bx0 + 0.01, bx1 - 0.01, 0.2, 0.201, HZ0 + 0.07, HZ1 - 0.09, [70, 40, 22], 0.02));
    for (let x = bx0 + 0.03; x < bx1 - 0.02; x += 0.03) S.push(cyl(V(x, 0.212, HZ0 + 0.09), V(x, 0.212, HZ1 - 0.11), 0.011, 0.011, CIGAR, { n: 5, amt: 0.05 }));
    S.push(box(bx0, bx1, 0.2, 0.42, HZ1 - 0.1, HZ1 - 0.08, [120, 74, 40], 0.04));
  }
  // glass door in a thin frame, a brass handle, a warm light inside, and a little hygrometer
  for (const [x0, x1, y0, y1] of [[HX0, HX1, 0.12, 0.16], [HX0, HX1, 1.86, 1.9], [HX0, HX0 + 0.05, 0.12, 1.9], [HX1 - 0.05, HX1, 0.12, 1.9]]) S.push(box(x0, x1, y0, y1, HZ0 - 0.03, HZ0, WOOD_H, 0.03));
  S.push(box(HX1 - 0.09, HX1 - 0.07, 0.8, 1.2, HZ0 - 0.06, HZ0 - 0.03, BRASS, 0.02));
  G.push(box(HX0 + 0.08, HX1 - 0.08, 1.84, 1.86, HZ0 + 0.04, HZ1 - 0.06, [255, 214, 160], 0));
  S.push(cyl(V(HX0 + 0.22, 1.7, HZ0 - 0.035), V(HX0 + 0.22, 1.7, HZ0 - 0.045), 0.045, 0.045, BRASS, { n: 10, amt: 0.02 }));
  S.push(cyl(V(HX0 + 0.22, 1.7, HZ0 - 0.045), V(HX0 + 0.22, 1.7, HZ0 - 0.047), 0.037, 0.037, [230, 224, 200], { n: 10, amt: 0 }));
  const humGlass = new THREE.Mesh(new THREE.PlaneGeometry(HX1 - HX0 - 0.1, 1.7), new THREE.MeshLambertMaterial({ color: 0x8fa4b0, transparent: true, opacity: 0.16, depthWrite: false }));
  humGlass.position.set((HX0 + HX1) / 2, 1.01, HZ0 - 0.015); humGlass.rotation.y = Math.PI; humGlass.renderOrder = 2; scene.add(humGlass);
}

// ===== CHANGING ROOM (between the VIP and the pool lounge, only reachable from the pool) =====
const changeTileTex = canvasTex(16, 16, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const grout = i % 4 === 0 || j % 4 === 0, n = rr() * 10;
    x.fillStyle = grout ? 'rgb(30,26,30)' : `rgb(${Math.round(70 + n)},${Math.round(64 + n)},${Math.round(68 + n)})`; x.fillRect(i, j, 1, 1);
  }
});
changeTileTex.wrapS = changeTileTex.wrapT = THREE.RepeatWrapping;
floorFor(ROOMS.change, changeTileTex, 0.8);
// lockers along the VIP side
const LOCKER = [38, 44, 48], LOCKER_D = [26, 30, 34];
S.push(box(2.06, 2.48, 0, 1.95, -10.8, -4.4, LOCKER));
for (let z = -10.8; z < -4.45; z += 0.4) {
  S.push(box(2.48, 2.5, 0.06, 1.9, z + 0.02, z + 0.38, LOCKER_D, 0.03));
  for (const y of [1.6, 1.66, 1.72]) S.push(box(2.5, 2.51, y, y + 0.02, z + 0.1, z + 0.3, [14, 16, 18], 0.02));
  S.push(box(2.5, 2.53, 0.95, 1.05, z + 0.32, z + 0.34, BRASS, 0.02));
}
S.push(box(2.06, 2.52, 1.95, 2.0, -10.82, -4.38, BRASS_D, 0.03));
// two wooden benches down the middle
const BENCHES = [[-9.3, 1.9], [-5.6, 1.6]];
for (const [cz, len] of BENCHES) {
  S.push(box(3.22, 3.78, 0.4, 0.46, cz - len / 2, cz + len / 2, [120, 84, 50], 0.05));
  for (const dz of [-len / 2 + 0.15, len / 2 - 0.15]) S.push(box(3.3, 3.7, 0, 0.4, cz + dz - 0.05, cz + dz + 0.05, [26, 26, 30], 0.03));
}
// mirror and vanity on the pool side, a towel rail on the back wall
S.push(box(4.6, 4.98, 0.85, 0.9, -10.6, -8.0, MARBLE_L, 0.04));
S.push(box(4.7, 4.98, 0, 0.85, -10.55, -8.05, LACQUER));
const mirrorMat = decal({ color: 0x6a7684 });
const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), mirrorMat);
mirror.position.set(4.975, 1.55, -9.3); mirror.rotation.y = -Math.PI / 2; scene.add(mirror);
S.push(box(4.94, 4.97, 2.02, 2.08, -10.55, -8.05, BRASS, 0.03));
G.push(box(4.93, 4.96, 2.08, 2.12, -10.5, -8.1, [255, 236, 200], 0));
S.push(cyl(V(2.6, 1.5, -10.92), V(4.4, 1.5, -10.92), 0.015, 0.015, BRASS, { n: 5 }));
const TOWELS = [[176, 196, 206], [234, 230, 220], [150, 40, 70], [234, 230, 220]];
TOWELS.forEach((c, i) => { const x = 2.85 + i * 0.45; S.push(box(x - 0.17, x + 0.17, 0.9, 1.52, -10.95, -10.88, c, 0.04)); });
const changeLight = pLight(0xffe8d0, 0.9, 6, 3.5, 2.8, -7.6);

// ===== POOL LOUNGE (behind the dance room): magenta light, dark brick, candles, a glowing shallow pool =====
const SW = { x: 9.5, z: -8.0, x0: 7.4, x1: 11.6, z0: -9.6, z1: -6.4, water: 0.42 };
// basin: a low tiled rim, a glowing tiled floor and a rippling water surface
const TILE = [168, 196, 206], TILE_D = [120, 150, 164];
for (const [x0, x1, z0, z1] of [[SW.x0 - 0.25, SW.x1 + 0.25, SW.z0 - 0.25, SW.z0], [SW.x0 - 0.25, SW.x1 + 0.25, SW.z1, SW.z1 + 0.25],
  [SW.x0 - 0.25, SW.x0, SW.z0, SW.z1], [SW.x1, SW.x1 + 0.25, SW.z0, SW.z1]]) {
  const endCap = z1 - z0 < 3.3 && x1 - x0 < 0.3;
  S.push(box(x0, x1, 0, 0.5, z0, z1, TILE_D, 0.05));
  const e = endCap ? 0.005 : 0.01;
  S.push(box(x0 - e, x1 + e, 0.5, endCap ? 0.535 : 0.54, z0 - 0.01, z1 + 0.01, TILE, 0.04));
}
const poolFloorTex = canvasTex(16, 16, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const grout = i % 4 === 0 || j % 4 === 0;
    x.fillStyle = grout ? 'rgb(70,120,150)' : `rgb(${110 + rr() * 20},${170 + rr() * 20},${200 + rr() * 20})`; x.fillRect(i, j, 1, 1);
  }
}, [8, 6]);
const poolFloor = new THREE.Mesh(new THREE.PlaneGeometry(SW.x1 - SW.x0, SW.z1 - SW.z0), decal({ map: poolFloorTex, fog: false }));
poolFloor.rotation.x = -Math.PI / 2; poolFloor.position.set(SW.x, 0.03, SW.z); scene.add(poolFloor);
const waterTex = canvasTex(64, 64, (x, w, h) => {
  x.fillStyle = 'rgb(90,170,210)'; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(230,250,255,0.75)'; x.lineWidth = 1;
  for (let k = 0; k < 26; k++) {
    let px = rr() * w, py = rr() * h; x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 4; s++) { px += (rr() - 0.5) * 18; py += (rr() - 0.5) * 18; x.lineTo(px, py); }
    x.stroke();
  }
}, [3, 2]);
const waterMat = new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.62, depthWrite: false, fog: false, side: THREE.DoubleSide });
const water = new THREE.Mesh(new THREE.PlaneGeometry(SW.x1 - SW.x0, SW.z1 - SW.z0, 8, 6), waterMat);
water.rotation.x = -Math.PI / 2; water.position.set(SW.x, SW.water, SW.z); water.renderOrder = 3; scene.add(water);
// columns with gold bands at the corners of the room
for (const [x, z] of [[6.2, -5.0], [12.8, -5.0], [6.2, -11.2], [12.8, -11.2]]) {
  S.push(box(x - 0.22, x + 0.22, 0, 3.2, z - 0.22, z + 0.22, [70, 22, 26]));
  for (const y of [0.1, 2.9]) S.push(box(x - 0.24, x + 0.24, y, y + 0.05, z - 0.24, z + 0.24, BRASS, 0.03));
}
// daybeds along the back wall, facing the water
const DAYBEDS = [];
for (const x of [7.6, 9.5, 11.4]) {
  S.push(box(x - 0.42, x + 0.42, 0.05, 0.36, -11.75, -10.05, [30, 12, 18]));
  S.push(box(x - 0.4, x + 0.4, 0.36, 0.44, -11.7, -10.1, [110, 26, 58], 0.05));
  S.push(box(x - 0.42, x + 0.42, 0.36, 0.95, -11.8, -11.55, [30, 12, 18]));
  for (const [dx, dz] of [[-0.36, -11.7], [0.36, -11.7], [-0.36, -10.1], [0.36, -10.1]]) S.push(cyl(V(x + dx, 0, dz), V(x + dx, 0.05, dz), 0.025, 0.025, BRASS, { n: 4 }));
  DAYBEDS.push([x, -10.85]);
}
// candle clusters on pedestals in the corners
const CANDLES = [[5.5, -11.5], [13.5, -11.5], [5.5, -4.5], [13.5, -4.5], [8.5, -11.85], [10.5, -11.85]];
for (const [x, z] of CANDLES) {
  S.push(box(x - 0.18, x + 0.18, 0, 0.62, z - 0.18, z + 0.18, [26, 10, 14]));
  [[0, 0, 0.2], [0.08, 0.05, 0.14], [-0.07, 0.06, 0.1], [0.04, -0.08, 0.17]].forEach(([dx, dz, hh]) => {
    S.push(cyl(V(x + dx, 0.62, z + dz), V(x + dx, 0.62 + hh, z + dz), 0.025, 0.025, [230, 220, 196], { n: 6, amt: 0.03 }));
    G.push(cyl(V(x + dx, 0.62 + hh, z + dz), V(x + dx, 0.62 + hh + 0.03, z + dz), 0.012, 0.004, [255, 200, 120], { n: 4, amt: 0 }));
  });
}
// a mirrored row of small candles along the pool rim
for (let x = SW.x0 - 0.1; x <= SW.x1 + 0.1; x += 0.6) for (const z of [SW.z0 - 0.12, SW.z1 + 0.12]) {
  S.push(cyl(V(x, 0.54, z), V(x, 0.62, z), 0.02, 0.02, [230, 220, 196], { n: 5, amt: 0.03 }));
  G.push(cyl(V(x, 0.62, z), V(x, 0.645, z), 0.01, 0.003, [255, 200, 120], { n: 4, amt: 0 }));
}

// ===== OUTSIDE: the street in front of the entrance and the backstreet behind the VIP =====
// generic low-poly vehicles, built facing +x, then turned and placed (y offset for the road surface)
function placeParts(parts, px, pz, yaw, py) {
  const c = Math.cos(yaw), s = Math.sin(yaw); py = py || 0;
  for (const p of parts) p.tris = p.tris.map((t) => t.map((v) => [v[0] * c + v[2] * s + px, v[1] + py, -v[0] * s + v[2] * c + pz]));
  return parts;
}
// a rounded cross-section in the y-z plane at position x, for shaping car bodies along their length
function yzRing(x, yb, yt, w, n, pw) {
  n = n || 12; pw = pw || 3;
  const pts = [], cy = (yb + yt) / 2, hy = (yt - yb) / 2;
  for (let k = 0; k < n; k++) {
    const t = 2 * Math.PI * (k + 0.5) / n, c = Math.cos(t), s = Math.sin(t);
    pts.push(V(x, cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / pw) * hy, Math.sign(c) * Math.pow(Math.abs(c), 2 / pw) * w / 2));
  }
  return pts;
}
const CHROME_GRILLE = [190, 192, 198];
const GLASS_D = [16, 20, 26], RUBBER = [12, 12, 13], RIM_C = [120, 122, 128];
function carWheels(P, xs, track, r, w) {
  for (const x of xs) for (const e of [-1, 1]) {
    const zi = e * (track / 2 - w / 2), zo = e * (track / 2 + w / 2);
    P.push(cyl(V(x, r, zi), V(x, r, zo), r, r, RUBBER, { n: 10, amt: 0.03 }));
    P.push(cyl(V(x, r, zo), V(x, r, zo + e * 0.012), r * 0.62, r * 0.62, RIM_C, { n: 8, amt: 0.03 }));
  }
}
function carParts(kind, color, opts) {
  const P = [], L = [];
  const dark = color.map((v) => Math.round(v * 0.6));
  const head = [255, 244, 220], tail = [210, 22, 22];
  if (kind === 'suv') {
    P.push(loft([yzRing(-2.45, 0.38, 1.0, 1.9, 12, 4), yzRing(-2.3, 0.32, 1.1, 1.96, 12, 4), yzRing(2.2, 0.32, 1.1, 1.96, 12, 4), yzRing(2.45, 0.42, 1.0, 1.9, 12, 4)], color, { amt: 0.03 }));
    P.push(loft([yzRing(-2.25, 1.0, 1.82, 1.8, 12, 4), yzRing(0.75, 1.0, 1.82, 1.76, 12, 4), yzRing(1.3, 1.0, 1.3, 1.82, 12, 4)], GLASS_D, { amt: 0.03 }));
    P.push(box(-2.2, 0.7, 1.8, 1.86, -0.84, 0.84, color, 0.03));
    for (const x of [-1.0, 0.25]) P.push(box(x - 0.05, x + 0.05, 1.0, 1.81, -0.91, 0.91, color, 0.03));
    P.push(box(2.4, 2.5, 0.5, 0.88, -0.55, 0.55, [10, 10, 11], 0.03));
    for (const e of [-1, 1]) {
      L.push(box(2.38, 2.49, 0.9, 0.98, e * 0.66 - 0.2, e * 0.66 + 0.2, head, 0));
      L.push(box(-2.5, -2.4, 0.8, 0.96, e * 0.74 - 0.13, e * 0.74 + 0.13, tail, 0));
    }
    carWheels(P, [-1.55, 1.55], 1.86, 0.42, 0.3);
    P.push(box(-2.3, 2.3, 0.28, 0.34, -1.0, 1.0, dark, 0.03));
  } else if (kind === 'super') {
    // an original wedge supercar: very low, wide haunches, a small canopy set forward, a fixed rear wing
    const prof = [[-2.25, 0.32, 0.78, 1.7], [-2.0, 0.25, 0.86, 1.96], [-1.2, 0.22, 0.88, 2.02], [0, 0.2, 0.78, 1.98], [1.2, 0.2, 0.62, 1.98], [1.9, 0.22, 0.5, 1.9], [2.3, 0.27, 0.4, 1.7]];
    P.push(loft(prof.map(([x, b, t, w]) => yzRing(x, b, t, w, 18, 3.4)), color, { amt: 0.025, smooth: true }));
    P.push(loft([yzRing(-1.3, 0.8, 0.86, 1.6, 16, 3.2), yzRing(-0.9, 0.8, 1.12, 1.42, 16, 3.2), yzRing(0.1, 0.75, 1.14, 1.36, 16, 3.2), yzRing(0.9, 0.62, 0.68, 1.6, 16, 3.2)], GLASS_D, { amt: 0.03, smooth: true }));
    P.push(box(-2.3, -2.0, 1.02, 1.06, -0.85, 0.85, [10, 10, 11], 0.02));
    for (const e of [-1, 1]) {
      P.push(box(-2.2, -2.1, 0.8, 1.02, e * 0.6 - 0.02, e * 0.6 + 0.02, [10, 10, 11], 0.02));
      P.push(box(-0.6, 0.3, 0.3, 0.55, e * 0.98 - 0.02, e * 0.98 + 0.02, [10, 10, 11], 0.02));
      L.push(box(1.95, 2.25, 0.46, 0.5, e * 0.6 - 0.2, e * 0.6 + 0.2, head, 0));
    }
    L.push(box(-2.27, -2.22, 0.66, 0.7, -0.8, 0.8, tail, 0));
    P.push(box(2.2, 2.42, 0.18, 0.22, -0.85, 0.85, [10, 10, 11], 0.02));
    carWheels(P, [-1.4, 1.4], 1.78, 0.36, 0.3);
  } else if (kind === 'saloon') {
    // an original long luxury saloon: upright chrome grille, long bonnet, formal roofline
    P.push(loft([yzRing(-2.6, 0.36, 0.92, 1.8, 14, 3.6), yzRing(-2.4, 0.3, 1.0, 1.92, 14, 3.6), yzRing(2.3, 0.3, 0.98, 1.92, 14, 3.6), yzRing(2.6, 0.38, 0.86, 1.84, 14, 3.6)], color, { amt: 0.025, smooth: true }));
    P.push(loft([yzRing(-1.9, 0.98, 1.02, 1.8, 14, 3.6), yzRing(-1.5, 0.98, 1.52, 1.64, 14, 3.6), yzRing(0.5, 0.98, 1.52, 1.64, 14, 3.6), yzRing(1.15, 0.98, 1.02, 1.8, 14, 3.6)], GLASS_D, { amt: 0.03 }));
    P.push(box(-1.45, 0.45, 1.5, 1.56, -0.8, 0.8, color, 0.03));
    for (const x of [-0.5]) P.push(box(x - 0.05, x + 0.05, 0.98, 1.5, -0.83, 0.83, color, 0.03));
    P.push(box(2.6, 2.64, 0.45, 0.88, -0.38, 0.38, CHROME_GRILLE, 0.03));
    for (let z = -0.32; z <= 0.33; z += 0.08) P.push(box(2.64, 2.65, 0.47, 0.86, z - 0.01, z + 0.01, [40, 40, 44], 0.02));
    for (const e of [-1, 1]) {
      L.push(box(2.52, 2.64, 0.72, 0.84, e * 0.68 - 0.18, e * 0.68 + 0.18, head, 0));
      L.push(box(-2.64, -2.56, 0.7, 0.86, e * 0.72 - 0.14, e * 0.72 + 0.14, tail, 0));
      P.push(box(-2.3, 2.3, 0.62, 0.64, e * 0.96 - 0.01, e * 0.96 + 0.01, CHROME_GRILLE, 0.02));
    }
    carWheels(P, [-1.6, 1.6], 1.8, 0.37, 0.28);
  } else if (kind === 'sedan') {
    P.push(loft([yzRing(-2.3, 0.35, 0.86, 1.72, 12, 3.5), yzRing(-2.1, 0.28, 0.92, 1.8, 12, 3.5), yzRing(2.05, 0.28, 0.86, 1.8, 12, 3.5), yzRing(2.3, 0.36, 0.72, 1.72, 12, 3.5)], color, { amt: 0.03 }));
    P.push(loft([yzRing(-1.7, 0.86, 0.95, 1.7, 12, 3.5), yzRing(-1.15, 0.86, 1.42, 1.56, 12, 3.5), yzRing(0.35, 0.86, 1.42, 1.56, 12, 3.5), yzRing(1.05, 0.86, 0.93, 1.7, 12, 3.5)], GLASS_D, { amt: 0.03 }));
    P.push(box(-1.1, 0.3, 1.4, 1.46, -0.74, 0.74, color, 0.03));
    for (const e of [-1, 1]) {
      L.push(box(2.2, 2.33, 0.62, 0.72, e * 0.58 - 0.18, e * 0.58 + 0.18, head, 0));
      L.push(box(-2.33, -2.24, 0.68, 0.8, e * 0.6 - 0.16, e * 0.6 + 0.16, tail, 0));
    }
    carWheels(P, [-1.4, 1.4], 1.66, 0.34, 0.24);
  } else {
    // an original open-top sports coupe: flared arches, long low hood, open cockpit with a raked windscreen,
    // ducktail wing, splitter, diffuser and spoked wheels (front wheels steered, like it just pulled up)
    const prof = [[-2.28, 0.36, 0.82, 1.6], [-2.2, 0.3, 0.9, 1.74], [-2.02, 0.26, 0.94, 1.84], [-1.75, 0.24, 0.95, 1.9], [-1.35, 0.24, 0.94, 1.95],
      [-0.95, 0.24, 0.93, 1.9], [-0.4, 0.23, 0.92, 1.84], [0.3, 0.23, 0.9, 1.84], [0.85, 0.23, 0.84, 1.89], [1.38, 0.24, 0.78, 1.95],
      [1.8, 0.25, 0.7, 1.88], [2.12, 0.27, 0.6, 1.78], [2.3, 0.3, 0.52, 1.62], [2.38, 0.36, 0.46, 1.46]];
    P.push(loft(prof.map(([x, b, t, w]) => yzRing(x, b, t, w, 20, 3.6)), color, { amt: 0.025, smooth: true }));
    const BLK = [10, 10, 11], TRIM = [24, 22, 22], LEATH = [112, 72, 44], LEATH_D = [86, 54, 32], CHROME = [170, 172, 178];
    // aero: splitter, grille, diffuser with fins, side skirts, exhausts
    P.push(box(2.18, 2.46, 0.19, 0.23, -0.78, 0.78, BLK, 0.02));
    P.push(box(2.32, 2.4, 0.27, 0.41, -0.52, 0.52, BLK, 0.02));
    P.push(box(-2.34, -2.04, 0.17, 0.29, -0.72, 0.72, BLK, 0.02));
    for (const z of [-0.45, -0.15, 0.15, 0.45]) P.push(box(-2.36, -2.06, 0.17, 0.3, z - 0.012, z + 0.012, TRIM, 0.02));
    for (const e of [-1, 1]) {
      P.push(box(-1.0, 0.95, 0.19, 0.27, e * 0.86 - 0.05, e * 0.86 + 0.05, BLK, 0.02));
      P.push(cyl(V(-2.24, 0.3, e * 0.55), V(-2.4, 0.3, e * 0.55), 0.048, 0.048, CHROME, { n: 8, amt: 0.02 }));
      P.push(cyl(V(-2.395, 0.3, e * 0.55), V(-2.405, 0.3, e * 0.55), 0.034, 0.034, [6, 6, 6], { n: 8, amt: 0 }));
      // mirrors on stalks
      P.push(cyl(V(0.55, 0.9, e * 0.84), V(0.5, 0.98, e * 0.96), 0.012, 0.012, BLK, { n: 4 }));
      P.push(box(0.42, 0.56, 0.95, 1.04, e * 0.95 - 0.07, e * 0.95 + 0.07, color, 0.03));
      // slim headlights, a full-width light bar at the back
      L.push(box(1.98, 2.24, 0.57, 0.62, e * 0.62 - 0.17, e * 0.62 + 0.17, head, 0));
      L.push(box(2.18, 2.3, 0.49, 0.52, e * 0.55 - 0.15, e * 0.55 + 0.15, [255, 250, 240], 0));
    }
    L.push(box(-2.3, -2.25, 0.74, 0.78, -0.74, 0.74, tail, 0));
    for (const e of [-1, 1]) L.push(box(-2.29, -2.24, 0.62, 0.74, e * 0.66 - 0.06, e * 0.66 + 0.06, tail, 0));
    // ducktail wing on two posts
    P.push(box(-2.2, -1.92, 1.02, 1.05, -0.8, 0.8, BLK, 0.02));
    for (const e of [-1, 1]) P.push(box(-2.1, -2.02, 0.92, 1.02, e * 0.55 - 0.02, e * 0.55 + 0.02, BLK, 0.02));
    // open cockpit: tub, dash, seats, steering wheel, roll hoops and the folded top
    P.push(box(-1.3, 0.56, 0.88, 0.957, -0.72, 0.72, [20, 16, 14], 0.03));
    P.push(box(0.4, 0.62, 0.88, 1.03, -0.72, 0.72, TRIM, 0.03));
    for (const e of [-1, 1]) {
      const z = e * 0.4;
      P.push(box(-0.5, 0.05, 0.95, 1.02, z - 0.22, z + 0.22, LEATH, 0.04));
      P.push(box(-0.64, -0.5, 0.95, 1.32, z - 0.22, z + 0.22, LEATH, 0.04));
      P.push(box(-0.63, -0.53, 1.32, 1.43, z - 0.12, z + 0.12, LEATH_D, 0.04));
      P.push(tube([V(-0.7, 0.95, z - 0.2), V(-0.7, 1.3, z - 0.18), V(-0.7, 1.36, z), V(-0.7, 1.3, z + 0.18), V(-0.7, 0.95, z + 0.2)], [0.02, 0.02, 0.02, 0.02, 0.02], CHROME, { n: 5 }));
    }
    P.push(box(-1.2, -0.86, 0.95, 1.0, -0.62, 0.62, LEATH_D, 0.04));
    P.push(box(-1.3, -1.2, 0.95, 1.18, -0.62, 0.62, LEATH_D, 0.04));
    P.push(box(-1.68, -1.32, 0.93, 1.01, -0.7, 0.7, BLK, 0.03));
    {
      const ring = [];
      for (let k = 0; k <= 14; k++) { const a = 2 * Math.PI * k / 14; ring.push(V(0.3 + Math.sin(a) * 0.03, 1.07 + Math.cos(a) * 0.16, -0.4 + Math.sin(a) * 0.16)); }
      P.push(tube(ring, ring.map(() => 0.016), BLK, { n: 5 }));
      P.push(cyl(V(0.3, 1.07, -0.4), V(0.5, 0.99, -0.4), 0.02, 0.02, BLK, { n: 5 }));
    }
    // raked windscreen in a thin frame
    const ws = (x0, y0, x1, y1, t) => [V(x0, y0, -0.72), V(x0, y0, 0.72), V(x0 + t, y0, 0.72), V(x0 + t, y0, -0.72), V(x1, y1, -0.68), V(x1, y1, 0.68), V(x1 + t, y1, 0.68), V(x1 + t, y1, -0.68)];
    { const q = ws(0.6, 0.92, 0.32, 1.22, 0.02); P.push(loft([q.slice(0, 4), q.slice(4)], [44, 56, 68], { amt: 0.02 })); }
    for (const e of [-1, 1]) P.push(cyl(V(0.62, 0.9, e * 0.74), V(0.33, 1.23, e * 0.7), 0.018, 0.018, BLK, { n: 5 }));
    P.push(cyl(V(0.33, 1.23, -0.7), V(0.33, 1.23, 0.7), 0.018, 0.018, BLK, { n: 5 }));
    // spoked wheels, the fronts turned in
    const steer = (opts && opts.steer) || 0;
    for (const [x, front] of [[-1.35, false], [1.38, true]]) for (const e of [-1, 1]) {
      const W = [], r = 0.35, zc = e * 0.85, zo = zc + e * 0.135, zi = zc - e * 0.135;
      W.push(cyl(V(x, r, zi), V(x, r, zo), r, r, RUBBER, { n: 16, amt: 0.03 }));
      W.push(cyl(V(x, r, zo), V(x, r, zo + e * 0.004), r * 0.7, r * 0.7, [36, 36, 40], { n: 14, amt: 0.02 }));
      W.push(box(x - 0.16, x - 0.04, r + 0.02, r + 0.16, zo - e * 0.05 - 0.025, zo - e * 0.05 + 0.025, [200, 160, 40], 0.02));
      for (let k = 0; k < 5; k++) {
        const a = k * 2 * Math.PI / 5;
        W.push(cyl(V(x, r, zo + e * 0.012), V(x + Math.cos(a) * r * 0.66, r + Math.sin(a) * r * 0.66, zo + e * 0.012), 0.022, 0.016, [150, 152, 158], { n: 4, amt: 0.02 }));
      }
      W.push(cyl(V(x, r, zo + e * 0.006), V(x, r, zo + e * 0.025), 0.045, 0.04, [150, 152, 158], { n: 8, amt: 0.02 }));
      if (front && steer) placeParts(W.map((w) => { w.tris = w.tris.map((t) => t.map((v) => [v[0] - x, v[1], v[2] - zc])); return w; }), x, zc, steer, 0);
      P.push(...W);
    }
  }
  return { P, L };
}
function parkCar(kind, color, x, z, yaw, y, opts) {
  const c = carParts(kind, color, opts);
  S.push(...placeParts(c.P, x, z, yaw, y)); G.push(...placeParts(c.L, x, z, yaw, y));
}

// outside walls are only drawn while the camera is outside at street level (from above they'd hide the rooms)
const FACADES = [];
function groundPlane(x0, x1, z0, z1, tex, tile, y) {
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d, Math.ceil(w / 2), Math.max(1, Math.ceil(d / 2)));
  scaleUV(g, w / tile, d / tile);
  const m = new THREE.Mesh(g, ps1(new THREE.MeshLambertMaterial({ map: tex })));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y || 0, (z0 + z1) / 2); scene.add(m);
  return m;
}
const asphaltTex = canvasTex(32, 32, (x, w, h) => noiseFill(x, w, h, [17, 18, 21], 8));
const pavingTex = canvasTex(16, 16, (x, w, h) => {
  noiseFill(x, w, h, [42, 42, 46], 6);
  x.fillStyle = 'rgb(22,22,26)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
});
const wetTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [14, 15, 18], 7);
  for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(70,84,110,0.55)'; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 5 + Math.floor(rr() * 7), 2 + Math.floor(rr() * 3)); }
});
for (const t of [asphaltTex, pavingTex, wetTex]) t.wrapS = t.wrapT = THREE.RepeatWrapping;

// the street: sidewalk at floor level, road a curb lower
const ST = { x0: -26, x1: 28, walk0: 4, curb0: 6.6, curb1: 13.4, walk1: 15.4 }, ROAD_Y = -0.12;
groundPlane(ST.x0, ST.x1, ST.walk0, ST.curb0 - 0.12, pavingTex, 1.2, 0);
groundPlane(ST.x0, ST.x1, ST.curb0 - 0.12, ST.curb1 + 0.12, asphaltTex, 3, ROAD_Y);
groundPlane(ST.x0, ST.x1, ST.curb1 + 0.12, ST.walk1 + 2, pavingTex, 1.2, 0);
S.push(box(ST.x0, ST.x1, ROAD_Y, 0, ST.curb0 - 0.12, ST.curb0, [74, 74, 80], 0.03));
S.push(box(ST.x0, ST.x1, ROAD_Y, 0, ST.curb1, ST.curb1 + 0.12, [74, 74, 80], 0.03));
const PARK_Z = ST.curb0 + 2.25, LANE_Z = (PARK_Z + ST.curb1) / 2;
for (let x = ST.x0 + 1; x < ST.x1; x += 3.2) S.push(box(x, x + 1.6, ROAD_Y, ROAD_Y + 0.012, LANE_Z - 0.06, LANE_Z + 0.06, [190, 166, 84], 0.03));
for (const z of [PARK_Z]) S.push(box(ST.x0, ST.x1, ROAD_Y, ROAD_Y + 0.01, z - 0.05, z + 0.05, [150, 150, 150], 0.03));

// the building's outside walls: dark stone, taller than the rooms, with the entrance and the back door cut in
const stoneTex = canvasTex(32, 64, (x, w, h) => {
  noiseFill(x, w, h, [26, 25, 29], 5);
  x.fillStyle = 'rgb(15,15,19)'; for (let j = 0; j < h; j += 8) x.fillRect(0, j, w, 1);
  for (let j = 0; j < h; j += 16) x.fillRect((j / 16) % 2 ? 16 : 0, j, 1, 8);
});
stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
const stoneMat = ps1(new THREE.MeshLambertMaterial({ map: stoneTex }));
const FAC_H = 6.5;
function facade(ax, az, bx, bz, nx, nz, gaps) {
  const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
  const P2 = (d) => [ax + ux * d, az + uz * d];
  const piece = (d0, d1, y0) => { const p = P2(d0), q = P2(d1); FACADES.push(wallPlane(p[0], p[1], q[0], q[1], nx, nz, y0, FAC_H, stoneMat, 2.5)); };
  let cur = 0;
  for (const [g0, g1] of gaps || []) { if (g0 > cur) piece(cur, g0, 0); piece(g0, g1, DOOR_H); cur = g1; }
  if (cur < len) piece(cur, len, 0);
}
facade(-17, 4.01, 14, 4.01, 0, 1, [[16.1, 17.9]]);   // front, entrance at x -0.9..0.9
facade(-17.01, -4, -17.01, 4, -1, 0);                 // left side of the billiards room
facade(-17, -4.01, -13, -4.01, 0, -1);                // the step back to the cinema
facade(-13.01, -11, -13.01, -4, -1, 0);               // left side of the cinema
facade(14.01, -12, 14.01, 4, 1, 0);                   // right side
facade(-13, -11.01, 5, -11.01, 0, -1, [[8.6, 9.8]]);  // back of billiards + VIP, back door at x -4.4..-3.2
facade(5.01, -12, 5.01, -11, -1, 0);                  // the step out at the pool lounge
facade(5, -12.01, 14, -12.01, 0, -1);                 // back of the pool lounge
// a brass band and cornice along the front
S.push(box(-17, 14, 3.3, 3.36, 4.01, 4.06, BRASS_D, 0.03));
S.push(box(-17.1, 14.1, FAC_H - 0.1, FAC_H, 4.0, 4.25, [20, 20, 24], 0.03));
// tall front windows, warm light behind frosted glass
for (const x of [-15, -11, -8, -5, 5, 8, 11]) {
  S.push(box(x - 0.68, x + 0.68, 0.9, 0.98, 4.02, 4.14, BRASS_D, 0.03));
  G.push(box(x - 0.6, x + 0.6, 0.98, 2.6, 4.02, 4.035, [92, 62, 34], 0));
  for (const dx of [-0.2, 0.2]) S.push(box(x + dx - 0.02, x + dx + 0.02, 0.98, 2.6, 4.035, 4.06, [18, 18, 22], 0.03));
  S.push(box(x - 0.62, x + 0.62, 2.6, 2.68, 4.02, 4.08, [18, 18, 22], 0.03));
}
// entrance canopy, sign, rope and plants
S.push(box(-1.6, 1.6, 2.62, 2.74, 4.06, 5.6, LACQUER));
S.push(box(-1.62, 1.62, 2.58, 2.62, 5.5, 5.62, BRASS, 0.03));
for (const x of [-1.5, 1.5]) S.push(cyl(V(x, 2.7, 5.5), V(x, 3.3, 4.08), 0.012, 0.012, BRASS, { n: 4 }));
for (const x of [-0.9, 0, 0.9]) G.push(cyl(V(x, 2.62, 4.9), V(x, 2.59, 4.9), 0.07, 0.06, [255, 210, 150], { n: 8, amt: 0 }));
for (const [x, z] of [[-2.2, 4.5], [-1.4, 5.5], [2.2, 4.5], [1.4, 5.5]]) {
  S.push(cyl(V(x, 0, z), V(x, 0.04, z), 0.13, 0.12, BRASS_D, { n: 8 }));
  S.push(cyl(V(x, 0.04, z), V(x, 1.0, z), 0.025, 0.025, BRASS, { n: 6 }));
  S.push(cyl(V(x, 1.0, z), V(x, 1.06, z), 0.04, 0.03, BRASS, { n: 6 }));
}
for (const e of [-1, 1]) S.push(tube([V(e * 2.2, 0.98, 4.5), V(e * 1.85, 0.74, 5.0), V(e * 1.4, 0.98, 5.5)], [0.022, 0.022, 0.022], VELVET, { n: 5 }));
succulent(-3.3, 0, 4.4, 3); succulent(3.3, 0, 4.4, 3);
S.push(box(-1.85, 1.85, 3.35, 3.4, 4.02, 4.26, BRASS_D, 0.03));
S.push(box(-1.85, 1.85, 4.12, 4.17, 4.02, 4.26, BRASS_D, 0.03));
const entranceLight = pLight(0xffc890, 1.3, 7, 0, 2.4, 5.2);

// street lamps (only two of them actually cast light, to keep the light count down)
const STREET_LAMPS = [-15, -6, 6, 15];
for (const x of STREET_LAMPS) {
  S.push(cyl(V(x, 0, 6.2), V(x, 0.1, 6.2), 0.14, 0.12, [20, 20, 22], { n: 8 }));
  S.push(cyl(V(x, 0.1, 6.2), V(x, 4.2, 6.2), 0.05, 0.04, [20, 20, 22], { n: 6 }));
  S.push(cyl(V(x, 4.2, 6.2), V(x, 4.25, 7.1), 0.03, 0.03, [20, 20, 22], { n: 4 }));
  S.push(cyl(V(x, 4.32, 7.1), V(x, 4.14, 7.1), 0.08, 0.22, [30, 30, 34], { n: 8 }));
  G.push(cyl(V(x, 4.13, 7.1), V(x, 4.09, 7.1), 0.18, 0.15, [255, 214, 160], { n: 8, amt: 0 }));
}
const lampLights = [-6, 6].map((x) => pLight(0xffc890, 1.4, 11, x, 3.9, 7.3));

// buildings across the street: dark fronts with a scatter of lit windows
const windowTex = canvasTex(32, 64, (x, w, h) => {
  x.fillStyle = 'rgb(12,12,16)'; x.fillRect(0, 0, w, h);
  for (let j = 4; j < h - 6; j += 10) for (let i = 3; i < w - 3; i += 8) {
    const lit = rr() < 0.3;
    x.fillStyle = lit ? (rr() < 0.6 ? 'rgb(214,164,88)' : 'rgb(160,180,204)') : 'rgb(24,26,34)';
    x.fillRect(i, j, 4, 6);
  }
});
windowTex.wrapS = windowTex.wrapT = THREE.RepeatWrapping;
const windowMat = new THREE.MeshBasicMaterial({ map: windowTex });
for (let x = ST.x0, k = 0; x < ST.x1; k++) {
  const w = 6 + (k * 7) % 5, h = 7 + (k * 5) % 6;
  const g = new THREE.PlaneGeometry(w, h);
  scaleUV(g, w / 3.2, h / 6.4);
  const m = new THREE.Mesh(g, windowMat);
  m.position.set(x + w / 2, h / 2, ST.walk1 + 0.3); m.rotation.y = Math.PI; scene.add(m);
  S.push(box(x + 0.05, x + w - 0.05, 0, 0.5, ST.walk1 + 0.1, ST.walk1 + 0.28, [24, 24, 28], 0.03));
  x += w;
}

// black SUVs parked along the curb (the entrance stays clear)
const PARKED = [-10.5, -5.0, 5.0, 10.5];
for (const x of PARKED) parkCar('suv', [13, 13, 15], x, ST.curb0 + 1.1, 0, ROAD_Y);

// passing traffic in both lanes, looping from one end of the street to the other
const TRAFFIC = [
  { kind: 'sedan', color: [44, 46, 52], z: LANE_Z - 1.05, dir: 1, speed: 8.5, x: -20 },
  { kind: 'suv', color: [13, 13, 15], z: LANE_Z - 1.05, dir: 1, speed: 7.2, x: 8 },
  { kind: 'sedan', color: [96, 96, 102], z: LANE_Z + 1.05, dir: -1, speed: 9.5, x: 18 },
  { kind: 'sedan', color: [70, 22, 26], z: LANE_Z + 1.05, dir: -1, speed: 8.0, x: -6 }
];
const beamTex = canvasTex(16, 16, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = i / (w - 1), v = Math.abs(j / (h - 1) - 0.5) * 2, k = Math.max(0, (1 - u) * (1 - v * v));
    x.fillStyle = `rgb(${Math.round(255 * k)},${Math.round(226 * k)},${Math.round(176 * k)})`; x.fillRect(i, j, 1, 1);
  }
});
const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -16 });
const traffic = [];
for (const tc of TRAFFIC) {
  const c = carParts(tc.kind, tc.color);
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(toGeometry(c.P), roomMat));
  grp.add(new THREE.Mesh(toGeometry(c.L), glowMat));
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.4), beamMat);
  beam.rotation.x = -Math.PI / 2; beam.position.set(2.3 + 2.75, 0.02, 0); grp.add(beam);
  grp.position.set(tc.x, ROAD_Y, tc.z); grp.rotation.y = tc.dir > 0 ? 0 : Math.PI;
  scene.add(grp); traffic.push({ grp, tc });
}
function driveTraffic(dt) {
  for (const { grp, tc } of traffic) {
    tc.x += tc.dir * tc.speed * dt;
    if (tc.dir > 0 && tc.x > ST.x1 + 6) tc.x = ST.x0 - 6;
    if (tc.dir < 0 && tc.x < ST.x0 - 6) tc.x = ST.x1 + 6;
    grp.position.x = tc.x;
  }
}

// ===== BACKSTREET =====
const AL = { x0: -14, x1: 15, z0: -19, z1: -11 };
groundPlane(AL.x0, 5, AL.z0, -11.02, wetTex, 3, 0);
groundPlane(5, AL.x1, AL.z0, -12.02, wetTex, 3, 0);
// the far side of the alley: the back of another building
{
  const w = AL.x1 - AL.x0, g = new THREE.PlaneGeometry(w, 7);
  scaleUV(g, w / 3.2, 7 / 6.4);
  const m = new THREE.Mesh(g, windowMat); m.position.set((AL.x0 + AL.x1) / 2, 3.5, AL.z0 - 0.02); scene.add(m);
}
// ===== PRIVATE LOT: numbered bays for the hosts' cars; a car is only here while its owner is online =====
const LOT_BAYS = [-3.8, -0.6, 2.6, 5.8, 9.0, -7.0, -10.2, 12.2];     // bay 1 is right by the back door
const LOT_Z = -16.3;
for (const x of [-11.8, -8.6, -5.4, -2.2, 1.0, 4.2, 7.4, 10.6, 13.8]) S.push(box(x - 0.04, x + 0.04, 0, 0.03, -19.0, -14.2, [200, 198, 190], 0.02));
for (const bx of LOT_BAYS) S.push(box(bx - 0.7, bx + 0.7, 0, 0.12, -18.75, -18.55, [90, 90, 94], 0.04));
// a boom barrier at the lot's exit, two tall lot lamps
S.push(box(14.3, 14.55, 0, 1.1, -19.0, -18.75, [40, 40, 44], 0.03));
for (let k = 0; k < 8; k++) S.push(box(14.38, 14.48, 0.95, 1.05, -18.75 + k * 0.6, -18.75 + (k + 1) * 0.6, k % 2 ? [220, 220, 216] : [190, 30, 30], 0.02));
for (const lx of [-2.2, 7.4]) {
  S.push(cyl(V(lx, 0, -18.8), V(lx, 4.4, -18.8), 0.06, 0.05, [24, 24, 28], { n: 6 }));
  S.push(box(lx - 0.35, lx + 0.35, 4.35, 4.45, -18.9, -18.3, [30, 30, 34], 0.03));
  G.push(box(lx - 0.3, lx + 0.3, 4.33, 4.35, -18.85, -18.35, [255, 236, 210], 0));
}
const carLamp = pLight(0xffe8d0, 1.3, 13, 2.6, 4.2, -16.0);
// reserved plates on the wall at the head of each bay, with the owner's name when they're here
const lotPlates = LOT_BAYS.map((bx, i) => {
  const c = document.createElement('canvas'); c.width = 160; c.height = 48;
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.33), decal({ map: tex }));
  m.position.set(bx, 1.75, -18.97); scene.add(m);
  const draw = (name) => {
    const x = c.getContext('2d');
    x.fillStyle = '#0d0c0e'; x.fillRect(0, 0, 160, 48); x.strokeStyle = '#b8924a'; x.lineWidth = 2; x.strokeRect(2, 2, 156, 44);
    x.fillStyle = '#e7c98a'; x.font = '20px "Limelight", Georgia, serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(String(i + 1), 10, 25);
    x.font = '11px "IBM Plex Mono", monospace'; x.fillStyle = name ? '#efe2c2' : '#7d705a'; x.fillText(name ? name.slice(0, 14) : 'RESERVED', 36, 25);
    tex.needsUpdate = true;
  };
  draw(''); return { draw, name: '' };
});
// the cars themselves: rebuilt whenever someone arrives, leaves or repaints
const lotCars = new Map();
function setLotCars(list) {
  const want = new Map((list || []).map((c) => [c.uid, c]));
  for (const [uid, g] of lotCars) {
    const c = want.get(uid);
    if (!c || g.userData.key !== c.style + c.color + c.bay) { scene.remove(g); lotCars.delete(uid); }
  }
  lotPlates.forEach((p, i) => { const c = (list || []).find((o) => o.bay === i); const nm = c ? c.name : ''; if (nm !== p.name) { p.name = nm; p.draw(nm); } });
  for (const c of list || []) {
    if (lotCars.has(c.uid) || c.bay < 0 || c.bay >= LOT_BAYS.length) continue;
    const col = CAR_COLORS[c.color] || CAR_COLORS[0];
    const parts = carParts(CAR_STYLES.includes(c.style) ? c.style : 'super', col[1]);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(toGeometry(parts.P), roomMat)); g.add(new THREE.Mesh(toGeometry(parts.L), glowMat));
    g.position.set(LOT_BAYS[c.bay], 0, LOT_Z); g.rotation.y = -Math.PI / 2; g.userData.key = c.style + c.color + c.bay;
    scene.add(g); lotCars.set(c.uid, g);
  }
}
const CAR_STYLES = ['coupe', 'super', 'saloon', 'suv'];
const CAR_STYLE_NAMES = { coupe: 'Open-top coupe', super: 'Wedge supercar', saloon: 'Luxury saloon', suv: 'Armoured SUV' };
const CAR_COLORS = [['Racing red', [176, 18, 24]], ['Black', [14, 14, 16]], ['Midnight blue', [18, 26, 60]], ['Gunmetal', [62, 64, 70]], ['Pearl white', [222, 220, 212]], ['Royal purple', [70, 20, 90]], ['Emerald', [16, 80, 52]], ['Gold', [176, 140, 60]]];
// back door: steps and a caged lamp over it
S.push(box(-4.6, -3.0, 0, 0.16, -11.6, -11.02, [50, 50, 54], 0.03));
S.push(box(-4.05, -3.55, 2.56, 2.66, -11.24, -11.02, [30, 30, 34], 0.03));
G.push(box(-3.95, -3.65, 2.5, 2.56, -11.2, -11.06, [255, 220, 160], 0));
const backLight = pLight(0xffd8a0, 1.1, 6, -3.8, 2.3, -11.9);
// dumpster, crates, a pallet
S.push(box(-10.2, -8.2, 0, 1.25, -12.3, -11.15, [26, 54, 40])); S.push(box(-10.25, -8.15, 1.25, 1.33, -12.35, -11.1, [20, 42, 32]));
const CRATES = [[-6.1, -12.4], [-6.1, -13.3]];
const CRATE_C = [96, 70, 40];
for (const [x, z] of CRATES) { S.push(box(x - 0.3, x + 0.3, 0, 0.46, z - 0.3, z + 0.3, CRATE_C)); S.push(box(x - 0.31, x + 0.31, 0.18, 0.24, z - 0.31, z + 0.31, [70, 50, 28], 0.03)); }
S.push(box(-7.3, -6.7, 0, 0.42, -11.75, -11.15, CRATE_C)); S.push(box(-7.25, -6.75, 0.42, 0.84, -11.72, -11.18, CRATE_C));
S.push(box(4.0, 5.2, 0, 0.14, -11.9, -11.1, [80, 64, 40]));
// fire escape up the billiards wall
for (const x of [-11.1, -10.5]) S.push(cyl(V(x, 0.9, -11.18), V(x, 6.2, -11.18), 0.015, 0.015, [40, 40, 44], { n: 4 }));
for (let y = 1.1; y < 6.2; y += 0.35) S.push(cyl(V(-11.1, y, -11.18), V(-10.5, y, -11.18), 0.01, 0.01, [40, 40, 44], { n: 4 }));
S.push(box(-11.9, -9.7, 3.2, 3.26, -12.1, -11.03, [36, 36, 40], 0.03));
for (const x of [-11.9, -9.7]) S.push(cyl(V(x, 3.26, -12.1), V(x, 4.1, -12.1), 0.012, 0.012, [40, 40, 44], { n: 4 }));
S.push(cyl(V(-11.9, 4.1, -12.1), V(-9.7, 4.1, -12.1), 0.012, 0.012, [40, 40, 44], { n: 4 }));


addStatic(S);
addStatic(G, glowMat);
for (const [x, z] of [[6.3, -8.0], [12.7, -8.0]]) {
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), decal({ map: swirlTex }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(x, 0.024, z); scene.add(rug);
}

// jukebox face and the gold sign (unlit, glowing)
const jukeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.7), decal({ map: canvasTex(16, 18, (x) => {
  x.fillStyle = '#1a120a'; x.fillRect(0, 0, 16, 18);
  for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#ffc060' : '#d48a2a'; x.fillRect(2 + i * 2, 2, 1, 13); }
  x.fillStyle = '#ffe0a0'; x.fillRect(3, 16, 10, 1);
}) }));
jukeFace.position.set(-4.43, 0.8, -1.6); jukeFace.rotation.y = Math.PI / 2; scene.add(jukeFace);

function goldSign(text, w, h, px) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.encoding = THREE.sRGBEncoding;
  const draw = () => {
    const x = c.getContext('2d'); x.clearRect(0, 0, w, h);
    x.font = px + 'px ' + signFont; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(255,190,100,0.9)'; x.shadowBlur = 10;
    const g = x.createLinearGradient(0, h * 0.15, 0, h * 0.85); g.addColorStop(0, '#fff0c8'); g.addColorStop(0.5, '#e7b86a'); g.addColorStop(1, '#a8772e');
    x.fillStyle = g; x.fillText(text, w / 2, h / 2 + 2);
    x.shadowBlur = 0; x.fillStyle = '#c8964a'; x.fillRect(w * 0.12, h - 4, w * 0.76, 2); x.fillRect(w * 0.12, 2, w * 0.76, 2);
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}
const mainSign = goldSign("SH1DEN'S", 320, 64, 46);
function drawNeon() { for (const s of SIGNS) s.draw(); }
const SIGNS = [mainSign];
const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.52), decal({ map: mainSign.tex, transparent: true }));
neon.position.set(0, 2.92, -3.95); scene.add(neon);
// small signs over each doorway, on both sides
function doorSign(text, x, z, rotY) {
  const s = goldSign(text, 256, 40, 28); SIGNS.push(s);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.24), decal({ map: s.tex, transparent: true }));
  m.position.set(x, 2.72, z); m.rotation.y = rotY; scene.add(m);
}
doorSign('DANCE', 4.97, 0, -Math.PI / 2); doorSign('BAR', 5.03, 0, Math.PI / 2);
doorSign('BILLIARDS', -4.97, 1.5, Math.PI / 2); doorSign('BAR', -5.03, 1.5, -Math.PI / 2);
doorSign('CINEMA', -9.2, -3.97, 0); doorSign('BILLIARDS', -9.2, -4.03, Math.PI);
doorSign('CARD ROOM', -11.77, 2.9, Math.PI / 2); doorSign('BILLIARDS', -11.83, 2.9, -Math.PI / 2);
doorSign('RESTROOM', 11.77, 3.1, -Math.PI / 2); doorSign('DANCE', 11.88, 3.1, Math.PI / 2);
SIGNS.push(...CARD_SIGNS);
doorSign('POOL', 9.5, -3.97, 0); doorSign('DANCE', 9.5, -4.03, Math.PI);
doorSign('VIP', -5.03, -7.75, -Math.PI / 2); doorSign('CINEMA', -4.97, -7.75, Math.PI / 2);
doorSign('BACKSTREET', -3.8, -10.97, 0); doorSign('POOL', 4.97, -6.4, -Math.PI / 2); doorSign('CHANGING', 5.03, -6.4, Math.PI / 2); doorSign('VIP', -3.8, -11.05, Math.PI);
// the big sign over the street entrance
const outSign = goldSign("SH1DEN'S", 320, 64, 46); SIGNS.push(outSign);
const outSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.68), decal({ map: outSign.tex, transparent: true }));
outSignMesh.position.set(0, 3.75, 4.27); scene.add(outSignMesh);

// the TV: a black screen in 3D, with the YouTube player laid over it in CSS 3D
// the screen punches a see-through hole in the 3D picture; the video sits behind the canvas and shows only through it,
// so walls and people in front of the TV hide it properly
const tvGlass = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), decal({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, fog: false }));
tvGlass.position.set(TV.x, TV.y, TV.z); tvGlass.rotation.y = Math.PI / 2; scene.add(tvGlass);
const tvHoleMat = tvGlass.material;
// the poker broadcast: a camera straight above the poker table, shown on the cinema TV with a high-stakes overlay
const pokerRT = new THREE.WebGLRenderTarget(640, 360, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const pokerCam = new THREE.PerspectiveCamera(33, 640 / 360, 2.9, 8);   // the near plane cuts away the chandelier
pokerCam.up.set(1, 0, 0); pokerCam.position.set(PK.x, 4.6, PK.z); pokerCam.lookAt(PK.x, 0, PK.z);
const pokerScreenMat = new THREE.MeshBasicMaterial({ map: pokerRT.texture, fog: false });
const pokerHud = document.createElement('canvas'); pokerHud.width = 640; pokerHud.height = 360;
const pokerHudTex = new THREE.CanvasTexture(pokerHud); pokerHudTex.minFilter = THREE.LinearFilter;
const pokerHudMesh = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), new THREE.MeshBasicMaterial({ map: pokerHudTex, transparent: true, fog: false, depthWrite: false }));
pokerHudMesh.position.set(TV.x + 0.006, TV.y, TV.z); pokerHudMesh.rotation.y = Math.PI / 2; pokerHudMesh.visible = false; pokerHudMesh.renderOrder = 3; scene.add(pokerHudMesh);
let pokerOn = false, pokerFrame = 0, pokerHudAt = 0, pokerState = null;
function setPokerCam(on) {
  pokerOn = !!on;
  tvGlass.material = pokerOn ? pokerScreenMat : tvHoleMat;
  pokerHudMesh.visible = pokerOn;
}
const pokerPlayers = () => crowd.filter((c) => c.spot && c.spot.startsWith('poker-seat-') && c.root.visible !== false);
const SUIT_CH = { s: '♠', h: '♥', d: '♦', c: '♣' };
function drawCard(x, px, py, w, h, c) {
  x.fillStyle = '#f4efe4'; x.fillRect(px, py, w, h); x.strokeStyle = '#b8924a'; x.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
  const red = c[1] === 'h' || c[1] === 'd';
  x.fillStyle = red ? '#b01820' : '#141414'; x.font = 'bold 15px "IBM Plex Mono", monospace'; x.textBaseline = 'middle'; x.textAlign = 'center';
  x.fillText(c[0] === 'T' ? '10' : c[0], px + w / 2, py + h * 0.32); x.font = '18px serif'; x.fillText(SUIT_CH[c[1]] || '', px + w / 2, py + h * 0.7);
  x.textAlign = 'left';
}
function drawPokerHud() {
  const x = pokerHud.getContext('2d'), w = 640, h = 360;
  x.clearRect(0, 0, w, h);
  // vignette and a thin gold frame
  const g = x.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.65)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(214,170,90,0.85)'; x.lineWidth = 2; x.strokeRect(10, 10, w - 20, h - 20);
  x.strokeStyle = 'rgba(214,170,90,0.35)'; x.lineWidth = 1; x.strokeRect(15, 15, w - 30, h - 30);
  // title plate
  x.fillStyle = 'rgba(8,6,6,0.82)'; x.fillRect(20, 20, 300, 44);
  x.fillStyle = '#e7c98a'; x.font = '22px "Limelight", Georgia, serif'; x.textBaseline = 'middle'; x.fillText("SH1DEN'S  HIGH STAKES", 32, 37);
  x.fillStyle = '#b8a27a'; x.font = '11px "IBM Plex Mono", monospace'; x.fillText("NO-LIMIT TEXAS HOLD'EM · PRIVATE TABLE", 32, 56);
  // live tag, blinking
  const on = Math.floor(performance.now() / 600) % 2 === 0;
  x.fillStyle = 'rgba(8,6,6,0.82)'; x.fillRect(w - 98, 20, 78, 26);
  x.fillStyle = on ? '#e3262f' : '#6a1216'; x.beginPath(); x.arc(w - 84, 33, 6, 0, 7); x.fill();
  x.fillStyle = '#f2ead8'; x.font = 'bold 13px "IBM Plex Mono", monospace'; x.fillText('LIVE', w - 72, 34);
  // a name plate by every seated player
  const v = new THREE.Vector3();
  for (const ch of pokerPlayers()) {
    if (!ch.name) continue;
    ch.root.updateMatrixWorld(true); v.set(0, 0.42, 0); ch.bones.head.localToWorld(v); v.project(pokerCam);
    const px = (v.x + 1) / 2 * w, py = (1 - v.y) / 2 * h;
    x.font = '13px "IBM Plex Mono", monospace';
    const tw = x.measureText(ch.name).width + 16;
    x.fillStyle = 'rgba(10,6,6,0.85)'; x.fillRect(px - tw / 2, py - 30, tw, 20);
    x.strokeStyle = 'rgba(214,170,90,0.8)'; x.strokeRect(px - tw / 2 + 0.5, py - 29.5, tw - 1, 19);
    x.fillStyle = '#efe2c2'; x.fillText(ch.name, px - tw / 2 + 8, py - 20);
  }
  // the board and the pot, from the live game
  const st = pokerState;
  if (st && st.board && st.board.length) {
    const cw = 34, chh = 48, x0 = w / 2 - (st.board.length * (cw + 6)) / 2;
    st.board.forEach((c, i) => drawCard(x, x0 + i * (cw + 6), h / 2 - chh / 2, cw, chh, c));
  }
  if (st && st.pot) { x.fillStyle = 'rgba(8,6,6,0.82)'; x.fillRect(w / 2 - 60, h / 2 + 32, 120, 22); x.fillStyle = '#e7c98a'; x.font = '13px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText('POT ' + st.pot.toLocaleString(), w / 2, h / 2 + 44); x.textAlign = 'left'; }
  // lower third
  x.fillStyle = 'rgba(8,6,6,0.82)'; x.fillRect(20, h - 52, 300, 32);
  x.fillStyle = '#b8a27a'; x.font = '12px "IBM Plex Mono", monospace';
  const n = st && st.players ? st.players : pokerPlayers().length;
  x.fillText(n ? n + (n === 1 ? ' PLAYER' : ' PLAYERS') + ' AT THE TABLE · BLINDS 10/20' + (st && st.stage ? ' · ' + st.stage.toUpperCase() : '') : 'TABLE OPEN · TAKE A SEAT', 32, h - 36);
  pokerHudTex.needsUpdate = true;
}
const vipGlass = new THREE.Mesh(new THREE.PlaneGeometry(VTV.w, VTV.h), decal({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, fog: false }));
vipGlass.position.set(VTV.x, VTV.y, VTV.z); vipGlass.rotation.y = Math.PI; scene.add(vipGlass);
const tvLight = new THREE.PointLight(0x9aa6ff, 0, 6, 1.5); tvLight.position.set(-11.6, TV.y, TV.z); scene.add(tvLight);
let tvOn = false, cssRenderer = null, cssScene = null;
if (THREE.CSS3DRenderer && document.getElementById('tvScreen')) {
  cssScene = new THREE.Scene();
  cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.domElement.className = 'css3d';
  stage.insertBefore(cssRenderer.domElement, canvas);
  const el = document.getElementById('tvScreen');
  const obj = new THREE.CSS3DObject(el);
  el.style.pointerEvents = 'none';
  obj.position.set(TV.x + 0.008, TV.y, TV.z); obj.rotation.y = Math.PI / 2; obj.scale.setScalar(TV.w / 960);
  cssScene.add(obj);
  const vel = document.getElementById('vipScreen');
  if (vel) {
    const vobj = new THREE.CSS3DObject(vel);
    vel.style.pointerEvents = 'none';
    vobj.position.set(VTV.x, VTV.y, VTV.z - 0.008); vobj.rotation.y = Math.PI; vobj.scale.setScalar(VTV.w / 960);
    cssScene.add(vobj);
  }
}

// dance floor tiles and light beams
const tiles = [];
const TILE_COL = [new THREE.Color(0x10224a), new THREE.Color(0x2c4f9a), new THREE.Color(0x8a96c0), new THREE.Color(0x24164a)];
for (let i = 0; i < DF.n; i++) for (let j = 0; j < DF.n; j++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(DF.s - 0.04, DF.s - 0.04),
    new THREE.MeshBasicMaterial({ color: 0x0a1020, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -16 }));
  m.renderOrder = 1;
  m.rotation.x = -Math.PI / 2;
  m.position.set(DF.x + (i - (DF.n - 1) / 2) * DF.s, 0.02, DF.z + (j - (DF.n - 1) / 2) * DF.s);
  scene.add(m); tiles.push({ m, i, j });
}
const beams = [];
for (let k = 0; k < 4; k++) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x4a7cff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.0, 8, 1, true), mat);
  cone.position.y = -1.5;
  const pivot = new THREE.Group(); pivot.position.set(DF.x - 2.2 + k * 1.45, 3.05, (k % 2 ? 1 : -1) * 0.05); pivot.add(cone);
  scene.add(pivot); beams.push({ pivot, mat, k });
}

// ---------------------------------------------------------------- smoke particles
const SMAX = 1200;
const sPos = new Float32Array(SMAX * 3).fill(-99);
const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const smoke = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x8c8780, size: 0.018, transparent: true, opacity: 0.35, depthWrite: false }));
smoke.frustumCulled = false; scene.add(smoke);

// ---------------------------------------------------------------- crowd
const HOST_LOOK = { jacket: 0, pants: 1, skin: 2, head: 7, hair: 1, beard: 4, eyes: 1, smoke: 2, dance: 3, spot: 1, body: 0, top: 2, bottom: 2, shoes: 2 };
const BARTENDER_LOOK = { jacket: 2, pants: 1, skin: 4, head: 1, hair: 1, beard: 1, eyes: 0, smoke: 0, dance: 3, spot: 1, outfit: 'barman' };
const DJ_LOOK = { jacket: 4, pants: 1, skin: 3, head: 3, hair: 1, beard: 1, eyes: 2, smoke: 0, dance: 3, spot: 0 };
const crowd = [];
const tmpV = new THREE.Vector3();
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// every place a regular can be. cat matches the creator's hangout choice:
// 0 dance room, 1 main bar, 2 cinema, 3 billiards, 4 VIP (mods only)
const SPOT_LIST = [], SPOT_BY_ID = {};
function addSpot(id, cat, act, x, z, yaw, label, hit, extra) {
  const s = Object.assign({ id, cat, act, x, z, yaw, label, hit }, extra || {});
  SPOT_LIST.push(s); SPOT_BY_ID[id] = s;
}
const hitBox = (x, y, z, sx, sy, sz) => ({ x, y, z, sx, sy, sz });
// main bar
STOOLS.forEach(([x, z], i) => addSpot('bar-stool-' + i, 1, 'sit', x, z + 0.06, Math.PI, 'Sit at the bar', hitBox(x, 0.45, z, 0.5, 0.9, 0.5)));
LOUNGE_SEATS.forEach(([x, z, yaw], i) => addSpot('bar-sofa-' + i, 1, 'sitlow', x, z, yaw, 'Chill on the sofa', hitBox(x, 0.45, z, 0.6, 0.9, 0.6)));
HIGH_TABLES.forEach(([x, z], i) => {
  for (const [k, ox, oz] of [['a', -0.45, 0.1], ['b', 0.45, -0.1]]) {
    const px = x + ox, pz = z + oz;
    addSpot('bar-table-' + i + k, 1, 'lean', px, pz, yawTo(px, pz, x, z), 'Stand at the table', hitBox(px, 0.9, pz, 0.45, 1.8, 0.45));
  }
});
addSpot('bar-wall-0', 1, 'lean', -4.75, -0.2, Math.PI / 2, 'Lean on the wall', hitBox(-4.75, 0.9, -0.2, 0.45, 1.8, 0.5));
addSpot('bar-wall-1', 1, 'lean', 4.75, -2.0, -Math.PI / 2, 'Lean on the wall', hitBox(4.75, 0.9, -2.0, 0.45, 1.8, 0.5));
// cinema
COUCH_SEATS.forEach(([x, z], i) => addSpot('cinema-seat-' + i, 2, 'sitlow', x, z, -Math.PI / 2, 'Sit and watch', hitBox(x, 0.32, z, 0.7, 0.64, 0.52)));
[[-5.6, TV.z - 3.0, -Math.PI / 2 - 0.4], [-5.6, TV.z + 3.1, -Math.PI / 2 + 0.4], [-6.3, TV.z - 1.9, -Math.PI / 2]].forEach(([x, z, yaw], i) =>
  addSpot('cinema-stand-' + i, 2, 'lean', x, z, yaw, 'Stand at the back', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// billiards
addSpot('pool-cue-0', 3, 'pool', PT.x - PT.l / 2 - 0.55, PT.z - 0.25, Math.PI / 2, 'Play pool', hitBox(PT.x - PT.l / 2 - 0.5, 0.8, PT.z - 0.25, 0.6, 1.6, 0.6));
addSpot('pool-cue-1', 3, 'pool', PT.x + PT.l / 2 + 0.55, PT.z + 0.2, -Math.PI / 2, 'Play pool', hitBox(PT.x + PT.l / 2 + 0.5, 0.8, PT.z + 0.2, 0.6, 1.6, 0.6));
[-9.7, -10.8].forEach((x, i) => addSpot('pool-stool-' + i, 3, 'sit', x, 3.035, 0, 'Sit at the self-serve bar', hitBox(x, 0.45, 3.035, 0.45, 0.9, 0.45)));
POOL_SOFA.forEach(([x, z, yaw], i) => addSpot('pool-sofa-' + i, 3, 'sitlow', x, z, yaw, 'Chill on the sofa', hitBox(x, 0.45, z, 0.6, 0.9, 0.6)));
[[-11.3, -3.45, 0.6], [-7.9, 3.0, Math.PI + 0.3], [-10.2, -3.4, 0.2], [-6.0, 2.9, Math.PI + 0.6]].forEach(([x, z, yaw], i) =>
  addSpot('pool-watch-' + i, 3, 'lean', x, z, yaw, 'Watch the game', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// card room: five seats at the table (the dealer has the sixth), and room to stand and watch
POKER_SEATS.forEach(([x, z, yaw], i) => addSpot('poker-seat-' + i, 10, 'poker', x, z, yaw, 'Sit in on poker', hitBox(x, 0.45, z, 0.55, 0.9, 0.55)));
[[-12.5, -3.2], [-16.3, 1.6], [-12.6, -1.9], [-16.2, -2.0]].forEach(([x, z], i) =>
  addSpot('card-watch-' + i, 10, 'lean', x, z, yawTo(x, z, PK.x, PK.z), 'Watch the game', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// restroom: the sink, and the stall (nobody chooses the stall)
addSpot('wc-sink', 9, 'lean', 12.35, 2.5, Math.PI, 'Wash your hands', hitBox(12.35, 0.9, 2.5, 0.45, 1.8, 0.45));
addSpot('wc-wait', 9, 'lean', 12.3, 3.55, -Math.PI / 2 + 0.4, 'Wait for the stall', hitBox(12.3, 0.9, 3.55, 0.45, 1.8, 0.45));
SPOT_BY_ID['wc-stall-0'] = { id: 'wc-stall-0', cat: 9, act: 'slump', x: 13.42, z: 2.52, yaw: -Math.PI / 2, label: '', hit: hitBox(0, -9, 0, 0, 0, 0) };
// VIP lounge: the host's armchair is his alone
VIP_CHAIRS.forEach(([x, z, yaw], i) => addSpot('vip-chair-' + i, 4, i === 0 ? 'lounge' : 'sitlow', x, z, yaw,
  i === 0 ? "The host's seat" : 'Sink into the sofa', hitBox(x, 0.45, z, 0.7, 0.9, 0.7), { hostOnly: i === 0 }));
[[-4.5, -9.8, Math.PI / 4], [1.5, -10.4, -Math.PI / 4], [-3.7, -4.75, Math.PI * 0.85], [1.4, -5.4, -Math.PI * 0.8]].forEach(([x, z, yaw], i) =>
  addSpot('vip-stand-' + i, 4, 'lean', x, z, yaw, 'Hang out in the lounge', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// pool lounge: wading in the water, daybeds, and standing room around the edge
// seats in the water: backs against the long sides of the pool, facing the middle
for (const [i, x] of [8.0, 9.0, 10.0, 11.0].entries()) {
  addSpot('swim-water-' + i + '0', 5, 'soak', x, SW.z0 + 0.24, 0, 'Get in the pool', hitBox(x, 0.3, SW.z0 + 0.45, 0.9, 0.6, 0.9));
  addSpot('swim-water-' + i + '1', 5, 'soak', x, SW.z1 - 0.24, Math.PI, 'Get in the pool', hitBox(x, 0.3, SW.z1 - 0.45, 0.9, 0.6, 0.9));
}
DAYBEDS.forEach(([x, z], i) => addSpot('swim-bed-' + i, 5, 'sitlow', x, z + 0.15, 0, 'Lie back on a daybed', hitBox(x, 0.45, z, 0.85, 0.9, 1.7)));
[[6.4, -8.0, Math.PI / 2], [12.6, -8.0, -Math.PI / 2], [6.6, -6.2, 2.2], [12.4, -6.2, -2.2], [8.0, -5.0, Math.PI], [11.0, -5.0, Math.PI]].forEach(([x, z, yaw], i) =>
  addSpot('swim-side-' + i, 5, 'lean', x, z, yaw, 'Hang out by the pool', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// the street: by the door, smoking by the windows, leaning on the parked SUVs
const standHit = (x, z) => hitBox(x, 0.9, z, 0.45, 1.8, 0.45);
[[-1.75, 4.45, 0.15], [1.75, 4.45, -0.15]].forEach(([x, z, yaw], i) => addSpot('street-door-' + i, 6, 'lean', x, z, yaw, 'Hang out by the door', standHit(x, z)));
[[-3.9, 4.4, 0.35], [3.9, 4.4, -0.35], [-7.8, 4.4, 0.2], [7.8, 4.4, -0.2]].forEach(([x, z, yaw], i) => addSpot('street-wall-' + i, 6, 'lean', x, z, yaw, 'Lean on the wall outside', standHit(x, z)));
PARKED.forEach((x, i) => addSpot('street-suv-' + i, 6, 'lean', x + 0.6, ST.curb0 - 0.32, Math.PI, 'Lean on the SUV', standHit(x + 0.6, ST.curb0 - 0.32)));
// the backstreet: by the cars in the lot, at the back door, on the crates
[-2.2, 1.0, 4.2, 7.4].forEach((x, i) => addSpot('alley-car-' + i, 7, 'lean', x, -13.3, Math.PI, 'Hang out by the cars', standHit(x, -13.3)));
addSpot('alley-door-0', 7, 'lean', -3.9, -11.85, Math.PI - 0.3, 'Step out back', standHit(-3.9, -11.85));
CRATES.forEach(([x, z], i) => addSpot('alley-crate-' + i, 7, 'sitlow', x, z, Math.PI / 2, 'Sit on a crate', hitBox(x, 0.4, z, 0.65, 0.8, 0.65)));
[[2.6, -11.45, Math.PI], [-8.6, -12.7, Math.PI - 0.4], [3.6, -12.4, Math.PI + 0.5]].forEach(([x, z, yaw], i) => addSpot('alley-wall-' + i, 7, 'lean', x, z, yaw, 'Hang out in the backstreet', standHit(x, z)));
// changing room: sit on the benches, check the mirror, lean on the lockers (you change into swimwear here too)
BENCHES.forEach(([cz, len], b) => [-0.45, 0.45].forEach((o, k) => addSpot('change-bench-' + b + k, 8, 'sitlow', k ? 3.42 : 3.58, cz + o, k ? Math.PI / 2 : -Math.PI / 2, 'Sit on the bench', hitBox(3.5, 0.3, cz + o, 0.6, 0.6, 0.7))));
addSpot('change-mirror-0', 8, 'lean', 4.35, -9.3, Math.PI / 2, 'Check the mirror', standHit(4.35, -9.3));
addSpot('change-locker-0', 8, 'lean', 2.75, -7.5, -Math.PI / 2, 'Lean on the lockers', standHit(2.75, -7.5));
// dance floor: one spot per tile, filled from the middle outward
{
  const r = rngFrom(5), order = [];
  for (let i = 0; i < DF.n; i++) for (let j = 0; j < DF.n; j++) order.push([i, j, Math.abs(i - 2.5) + Math.abs(j - 2.5)]);
  order.sort((a, b) => a[2] - b[2]);
  for (const [i, j] of order) {
    const cx = DF.x + (i - 2.5) * DF.s, cz = DF.z + (j - 2.5) * DF.s;
    addSpot('dance-' + i + '-' + j, 0, 'dance', cx + (r() - 0.5) * 0.16, cz + (r() - 0.5) * 0.16, -Math.PI / 2 + (r() - 0.5) * 1.8, 'Dance here', hitBox(cx, 0.03, cz, DF.s - 0.04, 0.08, DF.s - 0.04));
  }
}
function overflowSpot(idx) {
  const a = idx * 2.4, rx = 3.0 + (idx % 3) * 0.4, rz = 2.9 + (idx % 2) * 0.4;
  const x = Math.min(13.0, DF.x + Math.cos(a) * rx), z = Math.max(-3.6, Math.min(x > 11.5 ? 1.7 : 3.6, DF.z + Math.sin(a) * rz));
  return { id: 'overflow-' + idx, cat: 0, act: 'dance', x, z, yaw: yawTo(x, z, DF.x, DF.z) };
}

function putAt(ch, s) {
  ch.act = s.act; ch.spot = s.id;
  ch.root.position.set(s.x, s.y || 0, s.z); ch.root.rotation.y = s.yaw;
  setCue(ch, ch.act === 'pool');
}
const spotOwner = new Map(); // spot id -> character, refreshed by placeAll
function placeAll() {
  spotOwner.clear();
  const people = crowd.filter((ch) => !ch.npc && ch !== draftChar);
  const claim = (ch, s) => { spotOwner.set(s.id, ch); putAt(ch, s); ch.placed = true; };
  for (const ch of people) ch.placed = false;
  // 0. whoever was found in the restroom stays slumped in the stall for a while
  const vic = victimNow();
  if (vic) { const ch = people.find((c) => c.uid && c.uid === vic.uid); if (ch) claim(ch, SPOT_BY_ID['wc-stall-0']); }
  // 1. people who clicked somewhere, earliest click first (a seat goes to whoever took it first)
  const chosen = people.filter((ch) => ch.want && SPOT_BY_ID[ch.want]).sort((a, b) => (a.wantT || 0) - (b.wantT || 0));
  for (const ch of chosen) {
    const s = SPOT_BY_ID[ch.want];
    if (ch.placed || spotOwner.has(s.id) || (s.hostOnly && !ch.host) || (s.cat === 10 && !cardOpen && !ch.host)) continue;
    claim(ch, s);
  }
  // 2. the host keeps his armchair unless he went somewhere else
  for (const ch of people) if (ch.host && !ch.placed && !spotOwner.has('vip-chair-0')) claim(ch, SPOT_BY_ID['vip-chair-0']);
  // 3. everyone else goes to a free spot in the room they picked in the creator
  let over = 0;
  for (const ch of people) {
    if (ch.placed) continue;
    const free = (cat) => SPOT_LIST.find((s) => s.cat === cat && !s.hostOnly && !spotOwner.has(s.id));
    const s = free(ch.look.spot) || (ch.look.spot === 4 && free(1)) || free(0) || free(5);
    if (s) claim(ch, s); else putAt(ch, overflowSpot(over++));
  }
}

// a pool cue held in front of the chest while playing
const cueGeo = toGeometry([cyl(V(-0.13, 0.22, -0.3), V(-0.13, 0.22 + 0.93 * 1.4, -0.3 + 1.4), 0.016, 0.008, [150, 110, 70], { n: 5 }),
  cyl(V(-0.13, 0.22, -0.3), V(-0.13, 0.22 + 0.93 * 0.45, -0.3 + 0.45), 0.018, 0.017, [30, 20, 14], { n: 5 })]);
function setCue(ch, on) {
  if (on && !ch.cue) { ch.cue = new THREE.Mesh(cueGeo, charMat); ch.bones.spine.add(ch.cue); }
  else if (!on && ch.cue) { ch.bones.spine.remove(ch.cue); ch.cue = null; }
}

function dropLabel(ch) { if (!ch) return; if (ch.label) { ch.label.remove(); ch.label = null; } if (ch.bubbleEl) { ch.bubbleEl.remove(); ch.bubbleEl = null; } }
function clearCrowd() { for (const ch of crowd) { scene.remove(ch.root); if (ch !== draftChar) dropLabel(ch); } crowd.length = 0; }
function addChar(look, name, opts) {
  opts = opts || {};
  const seed = hashStr(name || opts.seedName || 'npc');
  const ch = makeCharacter(look, name, seed);
  ch.phase = (seed % 1000) / 1000;
  ch.host = !!opts.host; ch.npc = !!opts.npc; ch.mine = !!opts.mine; ch.uid = opts.uid || null;
  if (ch.label) { if (opts.mine) { ch.label.textContent = name + ' (you)'; ch.label.classList.add('mine'); } if (opts.host) ch.label.classList.add('host'); if (opts.staff) ch.label.classList.add('staff'); }
  scene.add(ch.root); crowd.push(ch);
  return ch;
}

let roster = [];
let myEntry = null, myUid = null;
const lastSpots = new Map(), lastDrinks = new Map();
// smokes aren't part of a look any more: a cigarette from the bartender (10 min) or a cigar from the VIP humidor (30 min)
const serverNow = () => (window.NET && window.NET.now ? window.NET.now() : Date.now());
function withSmoke(look, e) {
  const on = !!(e && e.k && e.e > serverNow());
  return Object.assign({}, look, { smoke: on ? (e.k === 'cigar' ? 2 : 1) : 0 });
}
let localSmoke = null;
function giveSmoke(kind) {
  const me = myChar();
  if (!me) { openCreator(); return; }
  if (me.host) { toast('You always have your cigar.'); return; }
  const mins = kind === 'cigar' ? 30 : 10;
  if (window.NET && window.NET.online && window.NET.setSmoke) window.NET.setSmoke(kind, mins);
  else { localSmoke = { k: kind, e: Date.now() + mins * 60000 }; rebuild(); }
  if (kind === 'cig') charonDo('bt_light', 2.6);
  toast(kind === 'cigar' ? 'A cigar from the humidor. It lasts 30 minutes.' : 'The bartender lights you a cigarette. It lasts 10 minutes.');
}
// when a smoke burns out, take it away
setInterval(() => { const t = serverNow(); if (crowd.some((c) => c.smokeUntil && c.smokeUntil < t)) rebuild(); }, 10000);
function wantFrom(ch, e) {
  if (!ch || !e) return ch;
  ch.want = e.s && SPOT_BY_ID[e.s] ? e.s : null; ch.wantT = e.t || 0; ch.drink = e.d || '';
  return ch;
}
const HOST_NAME = 'sh1denfps';
function rebuild() {
  const keepDraft = draftChar;
  clearCrowd();
  // staff: a bartender behind the bar and a DJ in the dance room
  const bt = addChar(BARTENDER_LOOK, 'Charon', { npc: true, seedName: 'bartender', staff: true });
  bartender = bt;
  setGlass(bt, 'whiskey'); giveTowel(bt);
  bt.act = 'bartend'; bt.root.position.set(0.4, 0, -3.35); bt.root.rotation.y = 0;
  const dj = addChar(DJ_LOOK, '', { npc: true, seedName: 'dj' });
  dj.act = 'dj'; dj.root.position.set(13.85, 0, 0); dj.root.rotation.y = -Math.PI / 2;
  rebuildHooks();
  // the host, in his armchair in the VIP lounge
  const host = addChar(HOST_LOOK, HOST_NAME, { host: true });
  const seen = new Set([HOST_NAME.toLowerCase()]);
  let haveMine = false;
  for (const e of roster.slice(-80)) {
    const key = e.name.toLowerCase();
    if (key === HOST_NAME.toLowerCase()) { host.uid = e.uid; wantFrom(host, e); if (myUid && e.uid === myUid) { host.mine = true; haveMine = true; } continue; }
    if (seen.has(key)) continue; seen.add(key);
    const mine = myUid ? e.uid === myUid : !!(myEntry && myEntry.name.toLowerCase() === key);
    if (mine) haveMine = true;
    const ch = addChar(withSmoke(codeToLook(e.code), e), e.name, { mine, uid: e.uid });
    ch.smokeUntil = ch.look.smoke ? e.e : 0;
    wantFrom(ch, e);
  }
  if (myEntry && !haveMine && !seen.has(myEntry.name.toLowerCase())) {
    const ch = addChar(withSmoke(codeToLook(myEntry.code), localSmoke), myEntry.name, { mine: true, uid: myUid });
    ch.smokeUntil = ch.look.smoke && localSmoke ? localSmoke.e : 0;
    wantFrom(ch, { s: myState.s, d: myState.d, t: 1 });
  }
  if (!(window.NET && window.NET.online)) { const me = crowd.find((c) => c.mine); if (me && !me.want) wantFrom(me, { s: myState.s, d: myState.d, t: 1 }); }
  placeAll();
  // pop people in when they moved, and hand out their drinks
  for (const ch of crowd) {
    if (ch.npc || ch === draftChar) continue;
    const key = ch.uid || ch.name;
    const prev = lastSpots.get(key);
    if (prev && prev !== ch.spot) ch.pop = 0;
    lastSpots.set(key, ch.spot);
    const sp = SPOT_BY_ID[ch.spot];
    swapOutfit(ch, sp && (sp.cat === 5 || sp.cat === 8) ? 'swim' : '');
    setGlass(ch, ch.act === 'pool' ? null : ch.drink);
    const pd = lastDrinks.get(key);
    if (ch.drink && pd !== undefined && pd !== ch.drink) bartenderSays(ch.drink, ch.name);
    lastDrinks.set(key, ch.drink || '');
  }
  if (keepDraft) { scene.add(keepDraft.root); crowd.push(keepDraft); }
  updateRosterUI();
}

// ---------------------------------------------------------------- music (original tracks, Web Audio)
// Four original tracks for a late-night hotel bar. The jukebox rotates them every 48 bars unless a visitor picks one.
const TRACKS = [
  { name: 'Velvet Rope', bpm: 112, swing: 0, prog: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]] },          // Am Am F G — dark electro
  { name: 'Last Round', bpm: 86, swing: 0, swing8: 0.33, prog: [[38, 41, 45, 48, 52], [43, 47, 50, 53, 57], [36, 40, 43, 47, 50], [45, 49, 52, 55, 58]] }, // Dm9 G13 Cmaj9 A7 — noir lounge
  { name: 'Midnight Ledger', bpm: 118, swing: 0, prog: [[40, 43, 47], [36, 40, 43], [43, 47, 50], [42, 45, 49]] },    // Em C G F#dim — darkwave
  { name: 'Quiet Contract', bpm: 128, swing: 0, prog: [[38, 41, 45], [38, 41, 45], [38, 41, 45], [36, 39, 43]] }      // Dm Dm Dm Cm — industrial techno
];
let trackIdx = 0, pinnedTrack = false, pendingTrack = -1;
let SPB = 60 / TRACKS[0].bpm;
let actx = null, master = null, muted = false, nextStep = 0, stepIdx = 0, schedTimer = null, ducked = false;
let beatBase = 0, beatT0 = 0;
const MASTER_VOL = 0.55;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let noiseBuf = null;
function startAudio() {
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = ducked ? 0.0001 : MASTER_VOL;
  const comp = actx.createDynamicsCompressor(); master.connect(comp); comp.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextStep = actx.currentTime + 0.1; stepIdx = 0;
  beatBase = beatNow(); beatT0 = nextStep; clockMode = 'audio';
  schedTimer = setInterval(schedule, 25);
  updateTrackUI();
}
function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
function kick(t, peak, low) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.setValueAtTime(low ? 100 : 130, t); o.frequency.exponentialRampToValueAtTime(low ? 38 : 42, t + 0.12);
  env(g, t, 0.003, peak || 0.9, low ? 0.22 : 0.28); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
}
function noise(t, freq, q, peak, dcy, type) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); env(g, t, 0.002, peak, dcy);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.3); s.stop(t + dcy + 0.05);
}
function tone(t, midi, dur, type, peak, cutoff, detune, attack) {
  const o = actx.createOscillator(); o.type = type; o.frequency.value = mtof(midi); if (detune) o.detune.value = detune;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 4;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const STEPS = [
  // Velvet Rope: dark electro, gritty pulsing bass, metallic hats, sparse minor stabs
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0 && !(sec === 0 && bar % 8 < 2)) kick(t, 0.95);
    if (s === 4 || s === 12) { noise(t, 1500, 0.9, 0.24, 0.16, 'bandpass'); noise(t, 5000, 0.6, 0.06, 0.08); }
    if (s % 2 === 1) noise(t, 9500, 1.2, s % 4 === 3 ? 0.07 : 0.035, 0.03);
    if (s % 2 === 1 || s === 0) tone(t, ch[0] - 24, st * 0.95, 'sawtooth', 0.2, 260 + 400 * ((s % 8) / 8), 0);
    if (s % 2 === 1) tone(t, ch[0] - 12, st * 0.6, 'square', 0.05, 900, 0);
    if (sec >= 1 && (s === 0 || s === 10)) for (const n of ch) tone(t, n + 12, st * 3, 'sawtooth', 0.03, 1600, -6);
    if (sec >= 2 && s % 4 === 2) tone(t, ch[(s / 2 + bar) % 3] + 24, st * 1.2, 'square', 0.03, 2600, 0);
  },
  // Last Round: noir lounge, brushed snare, ride cymbal, walking bass, soft electric piano
  function (t, s, bar, ch, sec, st) {
    const tr = TRACKS[1], next = tr.prog[(bar + 1) % 4];
    if (s === 0 || s === 4 || s === 6 || s === 8 || s === 12 || s === 14) noise(t, 8500, 1.5, s % 4 === 2 ? 0.035 : 0.055, 0.28);
    if (s % 2 === 0) noise(t, 2800, 0.5, 0.025, 0.12, 'bandpass');
    if (s === 4 || s === 12) noise(t, 2000, 0.6, 0.06, 0.2, 'bandpass');
    if (s === 0 || s === 10) kick(t, 0.35, true);
    if (s % 4 === 0) {
      const walk = [ch[0], ch[1], ch[2], next[0] - 1][s / 4];
      tone(t, walk - 12, SPB * 0.92, 'triangle', 0.28, 700, 0, 0.01);
    }
    if (s === 0 || s === 6) for (const n of ch.slice(1)) { tone(t, n + 12, SPB * 1.6, 'sine', 0.045, 2400, 0, 0.005); tone(t, n + 24, SPB * 0.5, 'triangle', 0.012, 3000, 3, 0.005); }
    if (sec >= 2 && (s === 3 || s === 9 || s === 14)) tone(t, ch[(s + bar) % ch.length] + 24, st * 3, 'sine', 0.035, 3500, 0);
  },
  // Midnight Ledger: darkwave, gated snare, galloping bass, wide pads
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0) kick(t, 0.85);
    if (s === 4 || s === 12) { noise(t, 1200, 0.7, 0.26, 0.22, 'bandpass'); noise(t, 6000, 0.5, 0.05, 0.18); }
    if (s % 4 === 2) noise(t, 8000, 0.8, 0.07, 0.04);
    if (s % 4 !== 1) tone(t, ch[0] - 12 + (s % 4 === 3 ? 7 : 0), st * 0.9, 'sawtooth', 0.15, 420 + 220 * Math.sin(bar * 0.7), 0);
    if (s === 0) for (const n of ch) { tone(t, n + 12, SPB * 4.1, 'sawtooth', 0.026, 1100, -9, 0.3); tone(t, n + 12, SPB * 4.1, 'sawtooth', 0.026, 1100, 9, 0.3); }
    if (sec >= 1 && s % 2 === 0) tone(t, ch[ARP[(s / 2 + bar) % 8]] + 24, st * 1.6, 'square', 0.03, 2000, 0);
  },
  // Quiet Contract: industrial techno, rumbling kick, offbeat metal, one-note stab
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0 && !(sec === 3 && bar % 8 >= 6)) { kick(t, 1.0); tone(t + st * 0.5, ch[0] - 36, st * 1.4, 'sine', 0.18, 140, 0); }
    if (s % 4 === 2) { noise(t, 7000, 2.5, 0.12, 0.09); tone(t, 86, st * 0.4, 'square', 0.012, 6000, 0); }
    if (s % 2 === 1) noise(t, 11000, 1.0, 0.03, 0.02);
    if (s % 8 === 4 && sec >= 1) noise(t, 900, 1.2, 0.22, 0.1, 'bandpass');
    if (sec >= 1 && (s === 3 || s === 11 || (s === 14 && bar % 2))) for (const n of ch) tone(t, n + 12, st * 1.2, 'sawtooth', 0.035, 1200 + 600 * (bar % 4) / 4, 0);
    if (sec >= 2 && s % 4 === 1) tone(t, ch[0] + 24, st * 0.5, 'square', 0.02, 3000, 0);
  }
];
function setTrackNow(i, t) {
  const b = beatAt(t);
  trackIdx = i; SPB = 60 / TRACKS[i].bpm; beatBase = b; beatT0 = t;
  stepIdx = 0; updateTrackUI();
}
function schedule() {
  while (nextStep < actx.currentTime + 0.12) {
    if (stepIdx % 16 === 0) {
      if (pendingTrack >= 0) { setTrackNow(pendingTrack, nextStep); pendingTrack = -1; }
      else if (!pinnedTrack && stepIdx > 0 && stepIdx % (16 * 48) === 0) setTrackNow((trackIdx + 1) % TRACKS.length, nextStep);
    }
    const tr = TRACKS[trackIdx], st = SPB / 4;
    const s = stepIdx % 16, bar = Math.floor(stepIdx / 16), ch = tr.prog[bar % 4], sec = Math.floor(bar / 8) % 4;
    const t = nextStep + (s % 2 === 1 ? tr.swing * st : 0) + (tr.swing8 && s % 4 === 2 ? tr.swing8 * st * 2 : 0);
    if (!ducked) STEPS[trackIdx](t, s, bar, ch, sec, st);
    nextStep += st; stepIdx++;
  }
}
function pickTrack(i) {
  pinnedTrack = true;
  if (!actx) { trackIdx = i; SPB = 60 / TRACKS[i].bpm; updateTrackUI(); return; }
  pendingTrack = i;
  // switch at the next step instead of waiting a whole bar
  const t = Math.max(actx.currentTime + 0.05, nextStep);
  nextStep = t; stepIdx = 0; pendingTrack = -1; setTrackNow(i, t);
}
function setDucked(on) {
  ducked = !!on;
  if (master) master.gain.setTargetAtTime(ducked ? 0.0001 : MASTER_VOL, actx.currentTime, 0.4);
  updateTrackUI();
}
function updateTrackUI() {
  const el = document.getElementById('track');
  if (el) el.textContent = ducked ? 'Jukebox: paused for TV' : 'Jukebox: ' + TRACKS[trackIdx].name;
}
function setMuted(m) {
  muted = m;
  if (window.NET && window.NET.setMuted) window.NET.setMuted(m);
  if (!actx) { if (!m) startAudio(); return; }
  if (m) actx.suspend(); else actx.resume();
}
const clock0 = performance.now();
let clockMode = 'perf';
function beatAt(t) { return beatBase + Math.max(0, (t - beatT0)) / SPB; }
function beatNow() {
  if (actx && actx.state === 'running' && clockMode === 'audio') return beatAt(actx.currentTime);
  return beatBase + (performance.now() - clock0) / 1000 / SPB;
}

// ---------------------------------------------------------------- camera
// one view per room; the camera stays inside the room it looks at (so walls never block it), except the map
const VIEWS = {
  bar: { tx: 0, ty: 1.2, tz: -1.4, d: 7, yaw: 0.0, pitch: 0.42 },
  dance: { tx: 9.6, ty: 1.0, tz: 0, d: 7, yaw: -1.25, pitch: 0.45 },
  tv: { tx: -10.5, ty: 1.4, tz: -7.5, d: 6, yaw: Math.PI / 2, pitch: 0.16 },
  pool: { tx: -8.9, ty: 0.9, tz: 0.0, d: 7, yaw: 0.85, pitch: 0.6 },
  card: { tx: -14.4, ty: 0.9, tz: 0.0, d: 6, yaw: -1.25, pitch: 0.5 },
  wc: { tx: 12.7, ty: 0.9, tz: 3.0, d: 2.2, yaw: Math.PI / 2, pitch: 0.75 },
  vip: { tx: -1.3, ty: 1.0, tz: -8.9, d: 5.5, yaw: 0.2, pitch: 0.3 },
  swim: { tx: 9.5, ty: 0.7, tz: -8.0, d: 6.5, yaw: 0.0, pitch: 0.55 },
  change: { tx: 3.5, ty: 1.0, tz: -8.2, d: 5, yaw: 0.0, pitch: 0.5 },
  street: { tx: 0, ty: 1.6, tz: 6.2, d: 9, yaw: 0.0, pitch: 0.22 },
  alley: { tx: -2.6, ty: 0.9, tz: -15.2, d: 7, yaw: 0.55, pitch: 0.32 },
  map: { tx: 0.5, ty: 0, tz: -1.8, d: 34, yaw: 0, pitch: 1.3, free: true }
};
for (const k in VIEWS) VIEWS[k].free = !!VIEWS[k].free;
let cam = Object.assign({}, VIEWS.bar), camT = Object.assign({}, VIEWS.bar), follow = null;
let camDist = cam.d, velYaw = 0, velPitch = 0, lastMoveT = 0, idleT = 0;
let isMod = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fadeEl = document.getElementById('fade');
// moving to a different room cuts through a quick fade instead of flying through the walls
function cutTo(apply) {
  const before = camT.free ? null : roomAt(camT.tx, camT.tz);
  apply();
  const after = camT.free ? null : roomAt(camT.tx, camT.tz);
  if (!before || !after || before === after) return;
  const snapNow = () => { Object.assign(cam, camT); camDist = camT.d; };
  if (reducedMotion || !fadeEl) { snapNow(); return; }
  fadeEl.style.opacity = '1';
  setTimeout(() => { snapNow(); fadeEl.style.opacity = '0'; }, 170);
}
function setView(name) {
  if (name === 'vip' && !isMod) return;
  if (name === 'card' && !cardOpen && !isMod) { toast('The card room is closed. Poker nights only happen when sh1den is in.'); return; }
  follow = null; velYaw = velPitch = 0;
  cutTo(() => Object.assign(camT, VIEWS[name]));
}
function inVip(ch) { return roomAt(ch.root.position.x, ch.root.position.z) === ROOMS.vip; }
function focusChar(ch) {
  if (inVip(ch) && !isMod && !ch.mine) return;
  velYaw = velPitch = 0;
  cutTo(() => {
    follow = ch; camT.free = false; camT.d = 2.4; camT.pitch = 0.18;
    camT.yaw = ch.root.rotation.y + (/sit|lounge/.test(ch.act) ? 0.6 : 0.3);
    ch.bones.head.getWorldPosition(tmpV); camT.tx = tmpV.x; camT.ty = tmpV.y - 0.25; camT.tz = tmpV.z;
  });
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  // mouse: hold the middle button and drag to turn and tilt the camera (left click is for picking spots)
  if (e.pointerType === 'mouse' && e.button !== 1) return;
  if (e.pointerType === 'mouse') { e.preventDefault(); canvas.style.cursor = 'move'; }
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), mid: e.pointerType === 'mouse' }; velYaw = velPitch = 0; canvas.setPointerCapture(e.pointerId);
});
// stop the browser's middle-click auto-scroll from kicking in over the bar
canvas.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const now = performance.now(), edt = Math.max(1 / 240, (now - drag.t) / 1000);
  const dyaw = -(e.clientX - drag.x) * 0.006, dpitch = (e.clientY - drag.y) * 0.004;
  camT.yaw += dyaw;
  camT.pitch = Math.max(0.02, Math.min(camT.free ? 1.5 : 1.25, camT.pitch + dpitch));
  // remember how fast you were dragging, so the camera glides on after you let go
  velYaw = velYaw * 0.6 + (dyaw / edt) * 0.4; velPitch = velPitch * 0.6 + (dpitch / edt) * 0.4;
  drag = { x: e.clientX, y: e.clientY, t: now, mid: drag.mid }; lastMoveT = now;
});
const endDrag = () => {
  // middle-drag stops dead like a classic MMO camera; a finger flick glides a little
  if (drag && (drag.mid || performance.now() - lastMoveT > 90)) velYaw = velPitch = 0;
  if (drag && drag.mid) canvas.style.cursor = 'default';
  drag = null;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
const maxD = () => (camT.free ? 40 : 14);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camT.d = Math.max(1.2, Math.min(maxD(), camT.d * (1 + Math.sign(e.deltaY) * 0.12))); }, { passive: false });
let pinch = null;
canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2) { pinch = null; return; }
  const dd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (pinch) camT.d = Math.max(1.2, Math.min(maxD(), camT.d * pinch / dd));
  pinch = dd;
});
// how far the camera can back away from the target before leaving the room
function roomReach(r, ox, oz, dx, dz) {
  let t = 99; const m = 0.3;
  if (dx > 1e-4) t = Math.min(t, (r.x1 - m - ox) / dx); else if (dx < -1e-4) t = Math.min(t, (r.x0 + m - ox) / dx);
  if (dz > 1e-4) t = Math.min(t, (r.z1 - m - oz) / dz); else if (dz < -1e-4) t = Math.min(t, (r.z0 + m - oz) / dz);
  return Math.max(0.35, t);
}
// keyboard: WASD / arrow keys pan the bird's-eye view, Q/E turn it, Shift moves faster
const keys = {};
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyQ: 'q', KeyE: 'e' };
function typing(e) { const el = e.target; return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }
window.addEventListener('keydown', (e) => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = KEYMAP[e.code];
  if (k) { keys[k] = true; e.preventDefault(); }
  if (e.key === 'Shift') keys.fast = true;
});
window.addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = false;
  if (e.key === 'Shift') keys.fast = false;
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const BIRD = { pitch: 1.3, d: 14, x0: -20, x1: 22, z0: -18.5, z1: 15 };
function keyboardPan(dt) {
  const mx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), mz = (keys.f ? 1 : 0) - (keys.b ? 1 : 0), rot = (keys.e ? 1 : 0) - (keys.q ? 1 : 0);
  if (!mx && !mz && !rot) return;
  if (!camT.free) {
    // switch into the bird's-eye view right above where you were looking
    follow = null; velYaw = velPitch = 0;
    camT.free = true; camT.pitch = BIRD.pitch; camT.d = Math.max(camT.d, BIRD.d); camT.ty = 0;
  }
  if (rot) camT.yaw += rot * dt * 1.6;
  if (mx || mz) {
    const len = Math.hypot(mx, mz), speed = Math.max(3, camT.d * 0.55) * (keys.fast ? 2.2 : 1);
    const fx = -Math.sin(camT.yaw), fz = -Math.cos(camT.yaw), rx = Math.cos(camT.yaw), rz = -Math.sin(camT.yaw);
    camT.tx = Math.max(BIRD.x0, Math.min(BIRD.x1, camT.tx + (fx * mz + rx * mx) / len * speed * dt));
    camT.tz = Math.max(BIRD.z0, Math.min(BIRD.z1, camT.tz + (fz * mz + rz * mx) / len * speed * dt));
  }
}
// keep every name tag over its character's head, crisp and always on top; people in other rooms are dimmed
const labelV = new THREE.Vector3();
function placeLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const here = camT.free ? null : roomAt(cam.tx, cam.tz);
  camera.updateMatrixWorld();
  for (const ch of crowd) {
    const el = ch.label;
    if (!el && !ch.bubbleEl && !bubbleStore.has(bubbleKey(ch))) continue;
    let show = ch.root.visible, x = 0, y = 0, op = 1, dist = 0;
    if (show) {
      ch.root.updateMatrixWorld(true);
      labelV.set(0, 0.42, 0); ch.bones.head.localToWorld(labelV);
      dist = labelV.distanceTo(camera.position);
      labelV.project(camera);
      if (labelV.z > 1 || labelV.z < -1 || Math.abs(labelV.x) > 1.1 || Math.abs(labelV.y) > 1.1 || dist > 40) show = false;
      x = Math.round((labelV.x + 1) / 2 * w); y = Math.round((1 - labelV.y) / 2 * h);
      const r = roomAt(ch.root.position.x, ch.root.position.z);
      op = here && r !== here ? 0.45 : 1;
      if (hiddenInVip(ch)) show = false;
    }
    if (el) {
      if (el.hidden === show) el.hidden = !show;
      if (show) {
        el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)';
        el.style.opacity = String(op);
        el.style.zIndex = String(1000 - Math.round(dist * 10));
      }
    }
    syncBubble(ch, x, y, show, op);
    if (ch.bubbleEl && show) ch.bubbleEl.style.zIndex = String(2000 - Math.round(dist * 10));
  }
}
function updateCamera(dt, t) {
  keyboardPan(dt);
  if (!drag) {
    camT.yaw += velYaw * dt;
    camT.pitch = Math.max(0.02, Math.min(camT.free ? 1.5 : 1.25, camT.pitch + velPitch * dt));
    const decay = Math.exp(-dt * 3.2); velYaw *= decay; velPitch *= decay;
  }
  if (follow) {
    follow.bones.head.getWorldPosition(tmpV);
    camT.tx = tmpV.x; camT.ty = tmpV.y - 0.25; camT.tz = tmpV.z;
  }
  // smooth, frame-rate independent easing; turning responds faster while you drag
  const kPos = 1 - Math.exp(-dt * 5), kRot = 1 - Math.exp(-dt * (drag ? 16 : 7)), kZoom = 1 - Math.exp(-dt * 6);
  for (const key of ['tx', 'ty', 'tz']) cam[key] += (camT[key] - cam[key]) * kPos;
  cam.pitch += (camT.pitch - cam.pitch) * kRot;
  let dy = camT.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.yaw += dy * kRot;
  camDist += (camT.d - camDist) * kZoom;
  // a slow, barely-there drift so the room never looks frozen
  idleT = drag || Math.abs(velYaw) > 0.01 ? 0 : idleT + dt;
  const drift = reducedMotion ? 0 : Math.min(1, idleT / 4) * 0.025 * Math.sin(t * 0.21);
  const yaw = cam.yaw + drift, cp = Math.cos(cam.pitch);
  const dx = Math.sin(yaw) * cp, dyv = Math.sin(cam.pitch), dz = Math.cos(yaw) * cp;
  let d = camDist;
  if (!camT.free) {
    // near a wall the camera moves in closer along its line of sight instead of sliding sideways
    const r = roomAt(cam.tx, cam.tz);
    if (r) d = Math.min(d, roomReach(r, cam.tx, cam.tz, dx, dz));
  }
  camera.position.set(cam.tx + dx * d, Math.max(0.4, cam.ty + dyv * d), cam.tz + dz * d);
  const outRoom = camT.free ? null : roomAt(cam.tx, cam.tz);
  const outside = !!(outRoom && outRoom.outside);
  scene.fog.near = camDist > 12 ? 30 : outside ? 12 : 7; scene.fog.far = camDist > 12 ? 70 : outside ? 42 : 17;
  // the outside walls only show from street level outside the building
  const cx = camera.position.x, cz = camera.position.z;
  const inBuilding = cx > -13 && cx < 14 && cz < 4 && cz > (cx > 5 ? -12 : -11);
  const showFacade = camera.position.y < 7.5 && !inBuilding;
  if (FACADES[0].visible !== showFacade) for (const f of FACADES) f.visible = showFacade;
  camera.lookAt(cam.tx, cam.ty, cam.tz);
}

// ---------------------------------------------------------------- drinks held in the left hand
const DRINKS = [
  { id: 'martini', name: 'Martini' },
  { id: 'whiskey', name: 'Whiskey' },
  { id: 'beer', name: 'Beer' },
  { id: 'cola', name: 'Cola' }
];
const DRINK_BY_ID = Object.fromEntries(DRINKS.map((d) => [d.id, d]));
const GLASS_C = [170, 182, 188];
const drinkGeos = {
  martini: toGeometry([cyl(V(0, -0.04, 0), V(0, -0.035, 0), 0.026, 0.026, GLASS_C, { n: 6, amt: 0 }), cyl(V(0, -0.035, 0), V(0, 0.02, 0), 0.004, 0.004, GLASS_C, { n: 4, amt: 0 }),
    cyl(V(0, 0.02, 0), V(0, 0.07, 0), 0.004, 0.042, GLASS_C, { n: 8, amt: 0 }), cyl(V(0, 0.05, 0), V(0, 0.052, 0), 0.03, 0.03, [205, 210, 170], { n: 8, amt: 0 })]),
  whiskey: toGeometry([cyl(V(0, -0.03, 0), V(0, 0.03, 0), 0.03, 0.032, GLASS_C, { n: 8, amt: 0 }), cyl(V(0, -0.025, 0), V(0, 0.005, 0), 0.031, 0.031, [170, 100, 34], { n: 8, amt: 0 })]),
  beer: toGeometry([cyl(V(0, -0.05, 0), V(0, 0.07, 0), 0.03, 0.036, [190, 140, 50], { n: 8, amt: 0 }), cyl(V(0, 0.07, 0), V(0, 0.09, 0), 0.037, 0.037, [236, 230, 210], { n: 8, amt: 0 })]),
  cola: toGeometry([cyl(V(0, -0.05, 0), V(0, 0.06, 0), 0.028, 0.03, [40, 20, 16], { n: 8, amt: 0 }), cyl(V(0, 0.06, 0), V(0, 0.08, 0), 0.031, 0.031, GLASS_C, { n: 8, amt: 0 }),
    cyl(V(0.012, 0.05, 0), V(0.02, 0.12, 0), 0.004, 0.004, [200, 50, 40], { n: 4, amt: 0 })])
};
function setGlass(ch, drink) {
  const want = drink && drinkGeos[drink] ? drink : null;
  if (ch.glassId === want) return;
  if (ch.glass) { ch.bones.elL.remove(ch.glass); ch.glass = null; }
  ch.glassId = want;
  if (!want) return;
  const g = new THREE.Group();
  g.position.set(0.04, -0.33, 0.075); // in the left palm
  g.add(new THREE.Mesh(drinkGeos[want], charMat));
  ch.bones.elL.add(g); ch.glass = g;
}
const towelGeo = toGeometry([box(-0.035, 0.035, -0.06, 0.04, -0.018, 0.018, [234, 230, 220], 0.03), box(-0.03, 0.03, -0.11, -0.06, -0.012, 0.012, [224, 220, 210], 0.03)]);
function giveTowel(ch) {
  const g = new THREE.Group(); g.position.set(-0.04, -0.33, 0.075);
  g.add(new THREE.Mesh(towelGeo, charMat)); ch.bones.elR.add(g); ch.towel = g;
}
function keepGlassUpright(ch) {
  if (!ch.glass) return;
  const b = ch.bones;
  ch.glass.rotation.x = -(b.spine.rotation.x + b.shL.rotation.x + b.elL.rotation.x);
  ch.glass.rotation.z = -(b.spine.rotation.z + b.shL.rotation.z + b.elL.rotation.z);
}

// ---------------------------------------------------------------- click to hang out
// hover anything you can use and it lights up; click (or tap twice on a phone) to go there
const OBJECTS = [
  { id: 'bartender', label: 'Order a drink', hit: hitBox(0.4, 1.1, -3.1, 0.9, 2.0, 0.9), cat: 1, floor: [0.4, -2.75], size: 0.5 },
  { id: 'jukebox', label: 'Change the music', hit: hitBox(-4.7, 0.75, -1.6, 0.6, 1.5, 0.9), cat: 1, floor: [-4.25, -1.6], size: 0.45 },
  { id: 'djbooth', label: 'Change the music', hit: hitBox(13.25, 0.6, 0, 0.8, 1.2, 2.7), cat: 0, floor: [12.5, 0], size: 0.6 },
  { id: 'tv', label: 'Watch the TV', hit: hitBox(-12.9, 1.75, TV.z, 0.3, 2.1, 3.7), cat: 2, floor: [-12.3, TV.z], size: 0.7 },
  { id: 'humidor', label: 'Take a cigar (30 min)', hit: hitBox(1.0, 1.0, -4.26, 1.1, 1.96, 0.5), cat: 4, floor: [1.0, -4.85], size: 0.6 },
  { id: 'minibar', label: 'Pour yourself a drink', hit: hitBox(-10.2, 1.2, 3.75, 2.6, 2.4, 0.55), cat: 3, floor: [-10.2, 3.2], size: 0.8 },
  { id: 'wcdoor', label: 'Restroom', hit: hitBox(11.75, 1.2, 3.1, 0.3, 2.4, 0.8), cat: 0, floor: [11.4, 3.1], size: 0.5 },
  { id: 'wcout', label: 'Back to the dance floor', hit: hitBox(11.95, 1.2, 3.1, 0.2, 2.4, 0.8), cat: 9, floor: [12.15, 3.1], size: 0.4 },
  { id: 'carddoor', label: 'Card room', hit: hitBox(-11.8, 1.2, 2.9, 0.3, 2.4, 1.4), cat: 3, floor: [-11.4, 2.9], size: 0.5 },
  { id: 'plaque', label: 'Coin leaderboard', hit: hitBox(4.3, 1.8, -3.9, 1.2, 1.5, 0.3), cat: 1, floor: [4.3, -3.4], size: 0.5 },
  { id: 'coin', label: 'Pick up the gold coin', hit: hitBox(0, -50, 0, 0.6, 0.6, 0.6), cat: 1, floor: [0, -50], size: 0.35 },
  { id: 'dealer', label: 'The card table', hit: hitBox(DEALER.x, 1.0, DEALER.z, 0.7, 2.0, 0.7), cat: 10, floor: [DEALER.x, DEALER.z], size: 0.45 },
  { id: 'pooltable', label: 'Play pool', hit: hitBox(PT.x, 0.45, PT.z, PT.l, 0.9, PT.w), cat: 3, floor: [PT.x, PT.z], size: 1.2 }
];
const CAT_ROOM = { 0: ROOMS.dance, 1: ROOMS.bar, 2: ROOMS.tv, 3: ROOMS.pool, 4: ROOMS.vip, 5: ROOMS.swim, 6: ROOMS.street, 7: ROOMS.alley, 8: ROOMS.change, 9: ROOMS.wc, 10: ROOMS.card };
const targets = SPOT_LIST.map((s) => ({ kind: 'spot', s, box: new THREE.Box3(new THREE.Vector3(s.hit.x - s.hit.sx / 2, s.hit.y - s.hit.sy / 2, s.hit.z - s.hit.sz / 2), new THREE.Vector3(s.hit.x + s.hit.sx / 2, s.hit.y + s.hit.sy / 2, s.hit.z + s.hit.sz / 2)) }))
  .concat(OBJECTS.map((o) => ({ kind: 'object', o, box: new THREE.Box3(new THREE.Vector3(o.hit.x - o.hit.sx / 2, o.hit.y - o.hit.sy / 2, o.hit.z - o.hit.sz / 2), new THREE.Vector3(o.hit.x + o.hit.sx / 2, o.hit.y + o.hit.sy / 2, o.hit.z + o.hit.sz / 2)) })));

const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc870, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -16, fog: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24), ringMat);
ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 2; scene.add(ring);
const hintEl = document.getElementById('hint');
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const hitPoint = new THREE.Vector3();
let hovered = null, armed = null, lastPointer = null;
let myState = { s: '', d: '' };

function hasCharacter() { return !!crowd.find((c) => c.mine); }
function myChar() { return crowd.find((c) => c.mine); }
// what a target would do for you right now: { ok, text }
function describe(tg) {
  if (!hasCharacter()) return { ok: true, text: 'Create a character to hang out here', needChar: true };
  if (tg.kind === 'object') {
    if (tg.o.id === 'bartender') {
      const me = myChar();
      return { ok: true, text: me && me.glassId ? 'Order another drink' : 'Order a drink' };
    }
    if (tg.o.id === 'carddoor' && !cardOpen) return { ok: isMod, text: isMod ? 'Card room (closed, host tools)' : 'Closed · private game tonight' };
    return { ok: true, text: tg.o.label };
  }
  const s = tg.s, owner = spotOwner.get(s.id);
  if (owner && owner.mine) return { ok: false, text: "You're here" };
  if (s.hostOnly) return { ok: !!(myChar() && myChar().host) && !owner, text: owner ? (owner.name || 'Taken') + "'s spot" : (s.lockText || "The host's chair") };
  if (s.cat === 4 && !isMod) return { ok: false, text: 'Mods only' };
  if (s.cat === 10 && !cardOpen && !(myChar() && myChar().host)) return { ok: false, text: 'Closed · private game' };
  if (owner) return { ok: false, text: 'Taken by ' + (owner.name || 'someone') };
  return { ok: true, text: s.label };
}
function pickTarget(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  // only things in the room you're looking at (everything, from the map)
  const here = camT.free ? null : roomAt(cam.tx, cam.tz);
  let best = null, bestD = Infinity;
  for (const tg of targets) {
    const room = tg.kind === 'spot' ? CAT_ROOM[tg.s.cat] : CAT_ROOM[tg.o.cat];
    if (here && room !== here) continue;
    if (!isMod && room === ROOMS.vip && !(tg.kind === 'spot' && tg.s.hostOnly && myChar() && myChar().host)) continue;
    if (raycaster.ray.intersectBox(tg.box, hitPoint)) {
      const d = hitPoint.distanceTo(raycaster.ray.origin);
      if (d < bestD) { bestD = d; best = tg; }
    }
  }
  return best;
}
function showHover(tg, x, y, touch) {
  hovered = tg;
  if (!tg) { ring.visible = false; hintEl.hidden = true; canvas.style.cursor = 'default'; return; }
  const info = describe(tg);
  if (tg.kind === 'spot') { ring.position.set(tg.s.hit.x, 0.03, tg.s.hit.z); ring.scale.setScalar(Math.max(tg.s.hit.sx, tg.s.hit.sz) * 0.55); }
  else { ring.position.set(tg.o.floor[0], 0.03, tg.o.floor[1]); ring.scale.setScalar(tg.o.size); }
  ring.visible = true;
  ringMat.color.setHex(info.ok ? 0xffc870 : 0x8a8a96);
  hintEl.textContent = info.text + (touch && info.ok ? ' (tap again)' : '');
  hintEl.classList.toggle('off', !info.ok);
  hintEl.hidden = false;
  const r = stage.getBoundingClientRect();
  hintEl.style.transform = 'translate(' + Math.round(x - r.left + 14) + 'px,' + Math.round(y - r.top + 16) + 'px)';
  canvas.style.cursor = info.ok ? 'pointer' : 'not-allowed';
}
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  lastPointer = { x: e.clientX, y: e.clientY };
  if (drag && upInfo && (Math.abs(e.clientX - upInfo.x0) > 4 || Math.abs(e.clientY - upInfo.y0) > 4)) { showHover(null); return; }
  showHover(pickTarget(e.clientX, e.clientY), e.clientX, e.clientY, false);
});
canvas.addEventListener('pointerleave', () => { if (!armed) showHover(null); });
canvas.addEventListener('pointerdown', () => { closeDrinkMenu(); });
canvas.addEventListener('pointerup', (e) => {
  const d0 = upInfo; upInfo = null;
  if (e.button !== 0) return; // only the left button picks a spot
  if (!d0 || Math.abs(e.clientX - d0.x0) > 6 || Math.abs(e.clientY - d0.y0) > 6 || performance.now() - d0.t0 > 600) return;
  const tg = pickTarget(e.clientX, e.clientY);
  if (e.pointerType === 'touch') {
    // phones have no hover: the first tap shows what it is, the second does it
    if (!tg) { armed = null; showHover(null); return; }
    if (armed !== tg) { armed = tg; showHover(tg, e.clientX, e.clientY, true); return; }
    armed = null;
  }
  if (tg) activate(tg, e.clientX, e.clientY);
});
let upInfo = null;
canvas.addEventListener('pointerdown', (e) => { upInfo = { x0: e.clientX, y0: e.clientY, t0: performance.now() }; }, true);

function activate(tg, x, y) {
  if (myLock()) { toast("You can't move yet."); return; }
  const id0 = tg.kind === 'object' ? tg.o.id : '';
  // looking around doesn't need a character
  if (id0 === 'wcdoor') { setView('wc'); showHover(null); return; }
  if (id0 === 'wcout') { setView('dance'); showHover(null); return; }
  if (id0 === 'plaque') { if (window.EXTRAS) window.EXTRAS.openCoins(); showHover(null); return; }
  if (id0 === 'carddoor') { setView('card'); showHover(null); return; }
  if (id0 === 'dealer') { if (window.POKER) window.POKER.open(); showHover(null); return; }
  const info = describe(tg);
  if (info.needChar) { openCreator(); return; }
  if (!info.ok) return;
  if (tg.kind === 'spot') {
    if (/^pool-cue-/.test(tg.s.id) && window.POOL) { window.POOL.open(); return; }
    if (/^poker-seat-/.test(tg.s.id) && window.POKER) { window.POKER.open(); return; }
    goTo(tg.s.id); return;
  }
  const id = tg.o.id;
  if (id === 'bartender') { drinkFrom = 'bar'; $('dmCig').hidden = false; openDrinkMenu(x, y); }
  else if (id === 'minibar') { drinkFrom = 'minibar'; $('dmCig').hidden = true; openDrinkMenu(x, y); }
  else if (id === 'humidor') giveSmoke('cigar');
  else if (id === 'coin') { if (window.EXTRAS) window.EXTRAS.claimCoin(); }
  else if (id === 'jukebox' || id === 'djbooth') changeMusic();
  else if (id === 'tv') { setView('tv'); const p = document.getElementById('room'); if (p && p.hidden) document.getElementById('roomBtn').click(); }
  else if (id === 'pooltable') {
    if (window.POOL) window.POOL.open();
    else { const free = ['pool-cue-0', 'pool-cue-1'].find((sid) => !spotOwner.has(sid) || spotOwner.get(sid).mine); if (free) goTo(free); }
  }
  showHover(null);
}
function goTo(spotId, drink) {
  myState = { s: spotId, d: drink !== undefined ? drink : myState.d };
  if (window.NET && window.NET.online) {
    // show it right away; the room confirms a moment later
    const e = roster.find((r) => r.uid && r.uid === myUid);
    if (e) { e.s = myState.s; e.d = myState.d; e.t = Date.now() + 9e12; rebuild(); }
    window.NET.setActivity(myState.s, myState.d);
  } else applyMyStateLocally();
}
function applyMyStateLocally() { rebuild(); }

// the bartender's drink menu
const drinkMenu = document.getElementById('drinkMenu');
function openDrinkMenu(x, y) {
  const r = stage.getBoundingClientRect();
  drinkMenu.hidden = false;
  const w = drinkMenu.offsetWidth || 180, h = drinkMenu.offsetHeight || 180;
  drinkMenu.style.left = Math.max(12, Math.min(r.width - w - 12, x - r.left + 10)) + 'px';
  drinkMenu.style.top = Math.max(60, Math.min(r.height - h - 70, y - r.top - h / 2)) + 'px';
  const first = drinkMenu.querySelector('button'); if (first) first.focus();
}
let drinkFrom = 'bar';
function closeDrinkMenu() { if (drinkMenu) drinkMenu.hidden = true; }
function orderDrink(id) {
  closeDrinkMenu();
  const me = myChar();
  // order at the bar: if you're not already at the bar, take a free stool
  let spot = myState.s || (me && me.spot) || '';
  const want = drinkFrom === 'minibar' ? 3 : 1;
  const atBar = SPOT_BY_ID[spot] && SPOT_BY_ID[spot].cat === want;
  if (!atBar) {
    const pre = want === 3 ? 'pool-stool-' : 'bar-stool-';
    const stool = SPOT_LIST.find((s) => s.id.startsWith(pre) && !spotOwner.has(s.id));
    if (stool) spot = stool.id;
  }
  goTo(spot, id);
  if (!(window.NET && window.NET.online) && id) bartenderSays(id, me ? me.name : 'you');
}
if (drinkMenu) {
  drinkMenu.textContent = '';
  const title = document.createElement('div'); title.className = 'dmTitle'; title.textContent = "What'll it be?";
  drinkMenu.appendChild(title);
  for (const d of DRINKS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = d.name;
    b.onclick = () => orderDrink(d.id); drinkMenu.appendChild(b);
  }
  const none = document.createElement('button'); none.type = 'button'; none.className = 'quiet'; none.textContent = 'Put my drink down';
  none.onclick = () => orderDrinkNone(); drinkMenu.appendChild(none);
  const cig = document.createElement('button'); cig.type = 'button'; cig.id = 'dmCig'; cig.textContent = 'A cigarette (10 min)';
  cig.onclick = () => { closeDrinkMenu(); giveSmoke('cig'); };
  drinkMenu.insertBefore(cig, none);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrinkMenu(); });
}
function orderDrinkNone() { closeDrinkMenu(); goTo(myState.s || (myChar() && myChar().spot) || '', ''); }
let bartender = null;
function bartenderSays(drinkId, name) {
  const d = DRINK_BY_ID[drinkId]; if (!d || !bartender) return;
  charonDo('bt_pour', 2.8, 'One ' + d.name.toLowerCase() + ' for ' + name + '.');
}

// shared jukebox: everyone hears the same track
function changeMusic() {
  const next = (trackIdx + 1) % TRACKS.length;
  if (window.NET && window.NET.online) window.NET.setJukebox(next);
  else { pickTrack(next); toast('Now playing: ' + TRACKS[next].name); }
}
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(text) {
  if (!toastEl) return;
  toastEl.textContent = text; toastEl.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

// ================================================================ v42: restroom, VIP glass, Charon, card room, coins, lot, events
const PRE_HOOKS = [], POST_HOOKS = [], REBUILD_HOOKS = [];
const hash32 = (n) => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; };
const camRoom = () => (camT.free ? null : roomAt(cam.tx, cam.tz));

// ---- the restroom: tiled, two stalls (one ajar), a sink and mirror, a hand dryer; only drawn when you're inside
wcFloor.position.y = 0.03;
const wcGroup = new THREE.Group(); scene.add(wcGroup);
const wcLight = new THREE.PointLight(0xfff0d8, 0.9, 3.2, 1.5); wcLight.position.set(12.9, 2.8, 3.0); wcGroup.add(wcLight);
{
  const P = [], Lg = [];
  const ST_C = [52, 54, 60], ST_D = [34, 36, 40], PORC = [224, 222, 216], CHR = [170, 172, 178];
  // stall fronts with two doorways, and the partition between the stalls
  P.push(box(12.9, 12.94, 0.12, 2.05, 2.06, 2.2, ST_C, 0.03), box(12.9, 12.94, 0.12, 2.05, 2.85, 3.15, ST_C, 0.03), box(12.9, 12.94, 0.12, 2.05, 3.8, 3.94, ST_C, 0.03));
  P.push(box(12.9, 12.94, 1.9, 2.05, 2.2, 2.85, ST_D, 0.02), box(12.9, 12.94, 1.9, 2.05, 3.15, 3.8, ST_D, 0.02));
  P.push(box(12.94, 13.94, 0.12, 2.05, 2.98, 3.02, ST_C, 0.03));
  // stall 1's door hangs open; stall 2 is locked
  P.push(box(12.95, 13.57, 0.15, 1.88, 2.215, 2.245, ST_C, 0.03));
  P.push(box(12.905, 12.935, 0.15, 1.88, 3.16, 3.79, ST_C, 0.03));
  Lg.push(box(12.885, 12.9, 1.05, 1.09, 3.66, 3.72, [220, 30, 30], 0));
  // toilets against the back wall, facing out
  for (const z of [2.52, 3.48]) {
    P.push(box(13.76, 13.93, 0.42, 0.82, z - 0.2, z + 0.2, PORC, 0.02));
    P.push(cyl(V(13.55, 0, z), V(13.55, 0.38, z), 0.13, 0.18, PORC, { n: 8 }));
    P.push(cyl(V(13.55, 0.38, z), V(13.55, 0.42, z), 0.2, 0.2, [236, 234, 228], { n: 8 }));
    P.push(box(13.86, 13.9, 0.82, 0.86, z - 0.04, z + 0.04, CHR, 0.02));
  }
  // vanity, basin, tap and mirror on the side wall
  P.push(box(11.95, 12.75, 0.8, 0.86, 2.06, 2.5, [20, 20, 22], 0.03));
  P.push(box(12.0, 12.7, 0, 0.8, 2.06, 2.42, [30, 30, 34], 0.03));
  P.push(box(12.2, 12.5, 0.86, 0.9, 2.12, 2.4, PORC, 0.02));
  P.push(cyl(V(12.35, 0.86, 2.1), V(12.35, 1.02, 2.1), 0.015, 0.015, CHR, { n: 5 }), cyl(V(12.35, 1.02, 2.1), V(12.35, 1.0, 2.2), 0.012, 0.012, CHR, { n: 5 }));
  P.push(box(12.0, 12.7, 1.12, 1.92, 2.06, 2.08, [132, 144, 150], 0.02));
  P.push(box(11.97, 12.73, 1.09, 1.12, 2.06, 2.1, [150, 112, 54], 0.02), box(11.97, 12.73, 1.92, 1.95, 2.06, 2.1, [150, 112, 54], 0.02));
  // hand dryer and a bin by the door
  P.push(box(12.2, 12.5, 1.1, 1.38, 3.82, 3.94, [180, 182, 186], 0.03), box(12.28, 12.42, 1.06, 1.1, 3.84, 3.9, [60, 60, 64], 0.02));
  P.push(cyl(V(12.15, 0, 3.75), V(12.15, 0.5, 3.75), 0.13, 0.15, [140, 142, 148], { n: 8 }));
  // ceiling lamp
  Lg.push(box(12.6, 13.2, 3.08, 3.12, 2.8, 3.2, [255, 240, 214], 0));
  wcGroup.add(new THREE.Mesh(toGeometry(P), roomMat), new THREE.Mesh(toGeometry(Lg), glowMat));
}
// a flat roof so you can't peek into the restroom from the dance floor
const wcRoof = new THREE.Mesh(new THREE.PlaneGeometry(ROOMS.wc.x1 - ROOMS.wc.x0 + 0.2, ROOMS.wc.z1 - ROOMS.wc.z0 + 0.1), new THREE.MeshLambertMaterial({ color: 0x18171a }));
wcRoof.rotation.x = -Math.PI / 2; wcRoof.position.set((ROOMS.wc.x0 + ROOMS.wc.x1) / 2 - 0.05, WALL_H - 0.01, (ROOMS.wc.z0 + ROOMS.wc.z1) / 2); scene.add(wcRoof);
const inRoom = (ch, r) => { const p = ch.root.position; return p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1; };
POST_HOOKS.push(() => {
  const inside = camRoom() === ROOMS.wc;
  wcGroup.visible = inside; wcFloor.visible = inside; wcRoof.visible = !inside;
  for (const m of WC_MESHES) m.visible = inside;
  if (!inside) for (const ch of crowd) if (inRoom(ch, ROOMS.wc)) ch.root.visible = false;
});

// ---- VIP glass: everyone but the hosts sees the lounge through a dark smoked tint, without name tags or chat
const vipTint = new THREE.Mesh(new THREE.BoxGeometry(6.94, 3.15, 6.94), new THREE.MeshBasicMaterial({ color: 0x14040e, transparent: true, opacity: 0.74, depthWrite: false, fog: false }));
vipTint.position.set(-1.5, 1.6, -7.5); vipTint.renderOrder = 4; scene.add(vipTint);
const hiddenInVip = (ch) => !isMod && !ch.mine && inRoom(ch, ROOMS.vip);
POST_HOOKS.push(() => { vipTint.visible = !isMod; });

// ---- painting eyes: they glow red during a blackout (and sometimes on their own)
const EYE_UV = { 0: [[14, 11], [18, 11]], 1: [[14, 11], [18, 11]], 2: [[13.5, 12], [18.5, 12]], 3: [[14, 19], [18, 19]] };
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1010, fog: false });
const eyeGroup = new THREE.Group(); eyeGroup.visible = false; scene.add(eyeGroup);
for (const p of PAINTINGS) {
  for (const [u, v] of EYE_UV[p.kind] || []) {
    const lx = ((u + 0.5) / 32 - 0.5) * 0.72, ly = p.cy + (0.5 - (v + 0.5) / 44) * 0.99;
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.022), eyeMat);
    e.position.set(p.px + Math.cos(p.yaw) * lx + Math.sin(p.yaw) * 0.045, ly, p.pz - Math.sin(p.yaw) * lx + Math.cos(p.yaw) * 0.045);
    e.rotation.y = p.yaw; eyeGroup.add(e);
  }
}

// ---- Charon, the barman: a little routine behind the bar, the same for everyone (it runs off the server clock)
const CHARON_Z = -3.35;
const CHARON_MODES = [
  (h) => ({ x: 0.4, yaw: 0, act: 'bartend' }),
  (h) => ({ x: -1.6 + (h % 5) * 0.8, yaw: 0, act: 'bt_wipe' }),
  (h) => ({ x: h % 2 ? -1.2 : 1.8, yaw: Math.PI, act: 'bt_reach' }),
  (h) => ({ x: 2.75, yaw: 1.97, act: 'bt_board' }),
  (h) => ({ x: -0.6, yaw: 0, act: 'bt_lean' }),
  (h) => ({ x: 0.4, yaw: 0.25, act: 'bartend' }),
  (h) => ({ x: 1.2, yaw: 0.2, act: 'bt_watch' })
];
const charonAt = (slot) => { const h = hash32(slot); return CHARON_MODES[h % CHARON_MODES.length](h >>> 8); };
let charonReact = null;
function charonDo(act, secs, line) {
  charonReact = { act, until: performance.now() + secs * 1000 };
  if (line && bartender) showBubbleOn(bartender, line);
}
const btTarget = targets.find((tg) => tg.kind === 'object' && tg.o.id === 'bartender');
PRE_HOOKS.push(() => {
  const bt = bartender; if (!bt) return;
  const T = serverNow() / 14000, slot = Math.floor(T), f = (T - slot) * 14;
  const cur = charonAt(slot), prev = charonAt(slot - 1);
  let x = cur.x, yaw = cur.yaw, act = cur.act;
  const walk = Math.abs(cur.x - prev.x) / 1.1;
  if (f < walk) { x = prev.x + (cur.x - prev.x) * (f / walk); yaw = cur.x > prev.x ? Math.PI / 2 : -Math.PI / 2; act = 'walk'; }
  if (charonReact && charonReact.until > performance.now()) { act = charonReact.act; yaw = 0; } else charonReact = null;
  bt.act = act; bt.root.position.set(x, 0, CHARON_Z);
  let dy = yaw - bt.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); bt.root.rotation.y += dy * 0.2;
  if (btTarget) { btTarget.box.min.x = x - 0.45; btTarget.box.max.x = x + 0.45; btTarget.o.floor[0] = x; }
});

// ---- card room: open only while the host is in the building; Minos deals
let cardOpen = false;
const MINOS_LOOK = { jacket: 0, pants: 1, skin: 1, head: 1, hair: 1, beard: 0, eyes: 0, smoke: 0, dance: 3, spot: 1, body: 0, top: 1, bottom: 2, shoes: 2 };
REBUILD_HOOKS.push(() => {
  cardClosed.visible = !cardOpen;
  if (!cardOpen) return;
  const m = addChar(MINOS_LOOK, 'Minos', { npc: true, seedName: 'minos', staff: true });
  m.act = 'deal'; m.root.position.set(DEALER.x, 0, DEALER.z); m.root.rotation.y = DEALER.yaw;
});
function setCardOpen(on) {
  on = !!on; if (on === cardOpen) return;
  cardOpen = on;
  if (!on && camRoom() === ROOMS.card && !isMod) setView('pool');
  rebuild();
}

// ---- the murder in the restroom: the victim sits slumped in stall 1 for five minutes and can't do anything
let victim = null;   // { uid, until }
const victimNow = () => (victim && victim.until > serverNow() ? victim : null);
const lockOverlay = document.createElement('div'); lockOverlay.id = 'lockOverlay'; lockOverlay.hidden = true; stage.appendChild(lockOverlay);
function myLock() { const v = victimNow(); return v && myUid && v.uid === myUid ? v : null; }
setInterval(() => {
  const v = myLock();
  lockOverlay.hidden = !v;
  if (v) { const s = Math.ceil((v.until - serverNow()) / 1000); lockOverlay.innerHTML = '<b>You were found in the restroom stall.</b><span>Nobody saw a thing. You can move again in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '</span>'; }
  if (victim && !victimNow()) { victim = null; rebuild(); }
}, 1000);

// ---- gold coins: one turns up somewhere every ten minutes, the first to click it gets it
const COIN_SPOTS = [[-3, 1.6, 1], [2.6, 2.4, 1], [3.6, -1.2, 1], [7, -2.6, 0], [12.4, -3, 0], [7.2, 3.2, 0], [-7, -9.4, 2], [-6.2, 1.6, 3], [-11.1, -0.9, 3],
  [6.6, -11.2, 5], [13.1, -10.3, 5], [-6, 6, 6], [8, 6.2, 6], [-9.2, -13.4, 7], [11, -12.6, 7], [3.5, -10.4, 8]];
const coinTarget = targets.find((tg) => tg.kind === 'object' && tg.o.id === 'coin');
const coinMesh = new THREE.Group();
coinMesh.add(new THREE.Mesh(toGeometry([cyl(V(0, -0.012, 0), V(0, 0.012, 0), 0.11, 0.11, [214, 168, 60], { n: 12, amt: 0.02 }), cyl(V(0, -0.016, 0), V(0, 0.016, 0), 0.07, 0.07, [240, 200, 90], { n: 12, amt: 0 })]), glowMat));
coinMesh.children[0].rotation.x = Math.PI / 2; coinMesh.visible = false; scene.add(coinMesh);
const coinLight = new THREE.PointLight(0xffc860, 0, 2.2, 1.5); coinMesh.add(coinLight);
let coinNow = null;
function setCoin(c) {
  coinNow = c && COIN_SPOTS[c.spot] ? c : null;
  if (!coinNow) { coinMesh.visible = false; coinTarget.box.min.set(0, -60, 0); coinTarget.box.max.set(0, -59, 0); return; }
  const [x, z, cat] = COIN_SPOTS[coinNow.spot];
  coinMesh.position.set(x, 0.32, z); coinMesh.visible = true;
  coinTarget.o.cat = cat; coinTarget.o.floor = [x, z];
  coinTarget.box.min.set(x - 0.35, 0, z - 0.35); coinTarget.box.max.set(x + 0.35, 0.8, z + 0.35);
}
POST_HOOKS.push((dt, t) => { if (coinMesh.visible) { coinMesh.rotation.y = t * 2.4; coinMesh.position.y = 0.32 + 0.05 * Math.sin(t * 3); coinLight.intensity = 0.8 + 0.3 * Math.sin(t * 6); } });

// ---- the leaderboard plaque on the bar's back wall, by Charon
const plaqueC = document.createElement('canvas'); plaqueC.width = 220; plaqueC.height = 280;
const plaqueTex = new THREE.CanvasTexture(plaqueC); plaqueTex.minFilter = THREE.LinearFilter; plaqueTex.encoding = THREE.sRGBEncoding;
const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), decal({ map: plaqueTex }));
plaque.position.set(4.3, 1.8, -3.965); scene.add(plaque);
function drawPlaque(list) {
  const x = plaqueC.getContext('2d'), w = 220, h = 280;
  x.fillStyle = '#0d0b0c'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#b8924a'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8); x.lineWidth = 1; x.strokeRect(11, 11, w - 22, h - 22);
  x.fillStyle = '#e7c98a'; x.font = '22px "Limelight", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('HIGH ROLLERS', w / 2, 34);
  x.fillStyle = '#8a7650'; x.font = '10px "IBM Plex Mono", monospace'; x.fillText('MOST GOLD COINS', w / 2, 54);
  x.fillStyle = '#b8924a'; x.fillRect(30, 64, w - 60, 1);
  x.textAlign = 'left'; x.font = '13px "IBM Plex Mono", monospace';
  (list || []).slice(0, 10).forEach((e, i) => {
    const y = 84 + i * 19;
    x.fillStyle = i === 0 ? '#ffd27a' : i < 3 ? '#e7c98a' : '#cfc3a6';
    x.fillText((i + 1) + '. ' + String(e.name || '?').slice(0, 14), 22, y);
    x.textAlign = 'right'; x.fillText(String(e.n), w - 22, y); x.textAlign = 'left';
  });
  if (!(list && list.length)) { x.fillStyle = '#6d6250'; x.textAlign = 'center'; x.fillText('No coins yet', w / 2, 120); }
  plaqueTex.needsUpdate = true;
}
drawPlaque([]);

// ---- random events: the same for everyone, roughly once an hour, plus a button for each in the host tools
const SFX = { gain: null };
function sfxOut() {
  if (!actx || muted) return null;
  if (!SFX.gain) { SFX.gain = actx.createGain(); SFX.gain.gain.value = 0.35; SFX.gain.connect(actx.destination); }
  return SFX.gain;
}
function tone(freq, t0, dur, type, vol, freq2) {
  const out = sfxOut(); if (!out) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if (freq2) o.frequency.linearRampToValueAtTime(freq2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol || 0.3, t0 + 0.02); g.gain.setValueAtTime(vol || 0.3, t0 + dur - 0.05); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noiseBurst(t0, dur, vol, cutoff) {
  const out = sfxOut(); if (!out) return;
  const n = Math.floor(actx.sampleRate * dur), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = actx.createBufferSource(); s.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 400;
  const g = actx.createGain(); g.gain.value = vol || 0.5;
  s.connect(f); f.connect(g); g.connect(out); s.start(t0);
}
let spooky = true;
const fx = { until: {} };
const fxOn = (k) => (fx.until[k] || 0) > performance.now();
// a police car tearing past on the street, lights going
const policeCar = new THREE.Group();
{
  const parts = carParts('sedan', [18, 18, 22]);
  policeCar.add(new THREE.Mesh(toGeometry(parts.P.concat([box(-0.6, 0.6, 0.3, 0.92, 0.91, 0.94, [220, 220, 220], 0.02), box(-0.6, 0.6, 0.3, 0.92, -0.94, -0.91, [220, 220, 220], 0.02)])), roomMat));
  policeCar.add(new THREE.Mesh(toGeometry(parts.L), glowMat));
}
const sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 })); sirenR.position.set(-0.4, 1.52, -0.28);
const sirenB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0x2050ff })); sirenB.position.set(-0.4, 1.52, 0.28);
const sirenLight = new THREE.PointLight(0xff2020, 0, 14, 1.5); sirenLight.position.set(0, 2.2, 0);
policeCar.add(sirenR, sirenB, sirenLight); policeCar.visible = false; scene.add(policeCar);
// the limo and the stranger in the long coat
const limo = new THREE.Group();
{ const parts = carParts('saloon', [10, 10, 12]); limo.add(new THREE.Mesh(toGeometry(parts.P), roomMat), new THREE.Mesh(toGeometry(parts.L), glowMat)); limo.scale.set(1.45, 1, 1); }
limo.visible = false; scene.add(limo);
const GUEST_LOOK = { jacket: 0, pants: 1, skin: 0, head: 4, hair: 1, beard: 0, eyes: 2, smoke: 0, dance: 3, spot: 6, body: 0, top: 1, bottom: 2, shoes: 2 };
REBUILD_HOOKS.push(() => {
  if (!fxOn('guest')) return;
  const g = addChar(GUEST_LOOK, '???', { npc: true, seedName: 'stranger' });
  g.act = 'lean'; g.root.position.set(1.1, 0, 5.3); g.root.rotation.y = Math.PI + 0.3;
});
// a black cat that wanders through the bar
const cat = new THREE.Group();
{
  const C = [12, 12, 14];
  const P = [box(-0.2, 0.2, 0.14, 0.3, -0.07, 0.07, C, 0.03), box(0.18, 0.32, 0.2, 0.34, -0.06, 0.06, C, 0.03), box(0.24, 0.28, 0.34, 0.39, -0.055, -0.025, C, 0), box(0.24, 0.28, 0.34, 0.39, 0.025, 0.055, C, 0)];
  for (const [lx, lz] of [[-0.15, -0.05], [-0.15, 0.05], [0.14, -0.05], [0.14, 0.05]]) P.push(box(lx - 0.02, lx + 0.02, 0, 0.15, lz - 0.02, lz + 0.02, C, 0.02));
  P.push(cyl(V(-0.2, 0.26, 0), V(-0.36, 0.42, 0), 0.015, 0.012, C, { n: 4 }));
  cat.add(new THREE.Mesh(toGeometry(P), roomMat), new THREE.Mesh(toGeometry([box(0.32, 0.325, 0.27, 0.29, -0.04, -0.02, [230, 210, 60], 0), box(0.32, 0.325, 0.27, 0.29, 0.02, 0.04, [230, 210, 60], 0)]), glowMat));
}
cat.visible = false; scene.add(cat);
// rain over the street and the backstreet
const RAIN_N = 900, rainPos = new Float32Array(RAIN_N * 6);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8090a8, transparent: true, opacity: 0.55 }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const rainSeed = [];
for (let i = 0; i < RAIN_N; i++) rainSeed.push(i % 2 ? [-26 + Math.random() * 54, 4.2 + Math.random() * 11.2, Math.random() * 9] : [-14 + Math.random() * 29, -19 + Math.random() * 7.8, Math.random() * 9]);
const flashEl = document.createElement('div'); flashEl.id = 'flash'; stage.appendChild(flashEl);
const ROUND_LINES = ["This round's on the house.", 'Drinks are on Charon tonight. Don\'t get used to it.', 'Everyone, a glass on me. The ferryman pays for once.'];
const PHONE_LINES = ['…No, he isn\'t here. I\'ll tell him you called.', '…Wrong number. Nobody here goes by that name.', '…Understood. The car will be out back at midnight.', '…The coin is non-refundable, sir. Goodnight.', '…I don\'t take reservations. They take me.'];
const BLACKOUT_LINES = ['Lights are back. Somebody check the restroom.', "Fuse again. …Has anyone seen {v}? They went to the restroom.", 'Power\'s back. Mind the restroom, there\'s been an accident.'];
const pickLine = (arr, seed) => arr[hash32(seed | 0) % arr.length];
let blackout = null, overdriveFor = 0;
function runEvent(kind, seed, data) {
  seed = seed || Math.floor(serverNow() / 1000);
  const t0 = performance.now(), at = actx ? actx.currentTime + 0.05 : 0;
  if (kind === 'siren') {
    fx.until.siren = t0 + 9000;
    if (actx) for (let k = 0; k < 8; k++) { tone(720, at + k * 0.9, 0.45, 'sawtooth', 0.12, 960); tone(960, at + k * 0.9 + 0.45, 0.45, 'sawtooth', 0.12, 720); }
  } else if (kind === 'storm') {
    fx.until.storm = t0 + 90000; fx.stormNext = t0 + 2500;
  } else if (kind === 'eyes') {
    if (spooky) fx.until.eyes = t0 + 25000;
  } else if (kind === 'round') {
    fx.until.round = t0 + 60000; charonDo('bt_pour', 4, pickLine(ROUND_LINES, seed));
  } else if (kind === 'phone') {
    if (actx) for (let k = 0; k < 3; k++) { tone(440, at + k * 1.4, 0.4, 'sine', 0.2); tone(480, at + k * 1.4, 0.4, 'sine', 0.15); tone(440, at + k * 1.4 + 0.55, 0.4, 'sine', 0.2); tone(480, at + k * 1.4 + 0.55, 0.4, 'sine', 0.15); }
    setTimeout(() => charonDo('bt_watch', 6, pickLine(PHONE_LINES, seed)), 4200);
  } else if (kind === 'cat') {
    fx.until.cat = t0 + 14000;
  } else if (kind === 'guest') {
    fx.until.guest = t0 + 60000; fx.guestT0 = t0; rebuild();
    setTimeout(rebuild, 60500);
    toast('A long black car just pulled up out front…');
  } else if (kind === 'overdrive') {
    fx.until.overdrive = t0 + 45000; toast('The DJ just lost it. Dance floor overdrive!');
  } else if (kind === 'coin') {
    if (coinNow) { const r = CAT_ROOM[COIN_SPOTS[coinNow.spot][2]]; toast('A gold coin is glinting somewhere in the ' + (r ? r.name.toLowerCase() : 'bar') + '…'); }
    else toast('Charon flips a gold coin. Someone already pocketed the last one.');
  } else if (kind === 'blackout') {
    if (!spooky && !(data && myUid && data.v === myUid)) return;
    blackout = { t0, victim: data && data.vn };
    if (actx) { noiseBurst(at, 0.4, 0.6, 900); tone(60, at, 0.5, 'square', 0.15, 30); }
  }
}
const allLights = [];
scene.traverse((o) => { if (o.isLight) allLights.push(o); });
function dimLights(k) {
  for (const L of new Set(allLights.concat([sirenLight, coinLight]))) {
    const raw = L.userData.lastSet !== undefined && L.intensity === L.userData.lastSet ? L.userData.raw : L.intensity;
    L.userData.raw = raw; L.intensity = raw * k; L.userData.lastSet = L.intensity;
  }
  glowMat.color.setScalar(Math.max(0.03, k));
  if (cssRenderer) cssRenderer.domElement.style.opacity = k < 0.5 ? '0.08' : '';
}
let dimmed = false;
POST_HOOKS.push((dt, t) => {
  const now = performance.now();
  // blackout: a flicker, five seconds of dark with the portraits' eyes burning red, a flicker back
  let k = 1;
  if (blackout) {
    const e = (now - blackout.t0) / 1000;
    if (e < 0.6) k = Math.random() < 0.5 ? 0.15 : 1;
    else if (e < 5.6) k = 0.04;
    else if (e < 6.3) k = Math.random() < 0.5 ? 0.2 : 1;
    else {
      const vn = blackout.victim; blackout = null; k = 1;
      if (window.NET && window.NET.sysChat) window.NET.sysChat('Charon', pickLine(BLACKOUT_LINES, Math.floor(serverNow() / 60000)).replace('{v}', vn || 'anyone'));
    }
  }
  if (k < 1 || dimmed) { dimLights(k); dimmed = k < 1; }
  eyeGroup.visible = (spooky && (fxOn('eyes') || (blackout && (now - blackout.t0) > 600))) && (Math.random() > 0.04);
  // police car
  if (fxOn('siren')) {
    const u = 1 - (fx.until.siren - now) / 9000;
    policeCar.visible = true; policeCar.position.set(-30 + u * 60, ROAD_Y, 8.4);
    const red = Math.floor(t * 6) % 2 === 0;
    sirenR.visible = red; sirenB.visible = !red; sirenLight.color.setHex(red ? 0xff2020 : 0x2050ff); sirenLight.intensity = 3;
  } else if (policeCar.visible) { policeCar.visible = false; sirenLight.intensity = 0; }
  // storm
  if (fxOn('storm')) {
    rain.visible = true;
    for (let i = 0; i < RAIN_N; i++) {
      const [x, z, o] = rainSeed[i], y = 9 - ((t * 11 + o) % 9);
      rainPos.set([x, y, z, x + 0.05, y - 0.35, z], i * 6);
    }
    rainGeo.attributes.position.needsUpdate = true;
    if (now > fx.stormNext) {
      fx.stormNext = now + 6000 + Math.random() * 9000;
      flashEl.style.transition = 'none'; flashEl.style.opacity = '0.55';
      setTimeout(() => { flashEl.style.transition = 'opacity 0.5s'; flashEl.style.opacity = '0'; }, 90);
      if (actx) noiseBurst(actx.currentTime + 0.6 + Math.random(), 2.6, 0.8, 220);
    }
  } else if (rain.visible) rain.visible = false;
  // the cat strolls along the front of the bar
  if (fxOn('cat')) {
    const u = 1 - (fx.until.cat - now) / 14000;
    cat.visible = true; cat.position.set(-4.4 + u * 8.8, 0, 2.6 + 0.15 * Math.sin(u * 9)); cat.rotation.y = 0; cat.position.y = 0.01 * Math.abs(Math.sin(t * 9));
  } else if (cat.visible) cat.visible = false;
  // limo out front while the stranger is inside
  if (fxOn('guest')) {
    const e = (now - fx.guestT0) / 1000, left = (fx.until.guest - now) / 1000;
    limo.visible = true;
    const x = e < 4 ? -30 + 30 * (1 - Math.pow(1 - e / 4, 2)) : left < 4 ? 30 * Math.pow(1 - left / 4, 2) : 0;
    limo.position.set(x, ROAD_Y, 7.5);
  } else if (limo.visible) limo.visible = false;
  // round on the house: a glass in every free hand
  if (fxOn('round') && Math.floor(t * 2) % 2 === 0) for (const ch of crowd) if (!ch.npc && !ch.glassId && ch.act !== 'pool') setGlass(ch, 'whiskey');
  // overdrive: the floor strobes and the beams go wild
  if (fxOn('overdrive')) {
    const q = Math.floor(t * 8);
    for (const tl of tiles) tl.m.material.color.setHSL(((tl.i * 7 + tl.j * 3 + q) % 12) / 12, 1, (tl.i + tl.j + q) % 2 ? 0.55 : 0.1);
    for (const bm of beams) { bm.pivot.rotation.z = 0.9 * Math.sin(t * 3 + bm.k * 1.7); bm.mat.opacity = 0.18; bm.mat.color.setHSL((q % 12) / 12, 1, 0.6); }
    danceLight.intensity = q % 2 ? 3 : 0.4;
  }
});
// the hourly event, worked out from the server clock so everyone gets the same one at the same moment
const HOURLY = ['siren', 'storm', 'eyes', 'round', 'coin', 'phone', 'cat', 'guest', 'overdrive'];
let lastHourly = -1;
setInterval(() => {
  const now = serverNow(), hour = Math.floor(now / 3600000), h = hash32(hour * 7 + 3);
  const at = hour * 3600000 + (5 + (h % 50)) * 60000;
  if (now >= at && now < at + 20000 && lastHourly !== hour) { lastHourly = hour; runEvent(HOURLY[(h >>> 8) % HOURLY.length], hour); }
}, 2000);

// keep the card room, Charon's tag and the VIP rules in step with each rebuild
function rebuildHooks() { for (const f of REBUILD_HOOKS) f(); }

// ---------------------------------------------------------------- render loop
let pixels = true;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const scale = pixels ? Math.max(2, Math.round(Math.min(w, h) / 380)) : 1;
  renderer.setPixelRatio(pixels ? 1 : Math.min(devicePixelRatio, 2));
  renderer.setSize(Math.max(1, Math.round(w / scale)), Math.max(1, Math.round(h / scale)), false);
  snap.value.set(Math.round(w / scale / 1.5), Math.round(h / scale / 1.5));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (cssRenderer) cssRenderer.setSize(w, h);
}
new ResizeObserver(resize).observe(stage); resize();

const clock = new THREE.Clock();
const creatorEl = document.getElementById('creator'), formEl = document.getElementById('form');
let sHead = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, beat = beatNow();
  for (const f of PRE_HOOKS) f(dt, t, beat);
  // while you're editing your look, hide your old character (never the bartender) so only the preview shows
  const editing = !creatorEl.hidden && !formEl.hidden;
  for (const ch of crowd) {
    ch.root.visible = !(editing && ch.mine && !ch.host && ch !== draftChar);
    pose(ch, ch.act, beat + (ch.act === 'dance' ? 0 : ch.phase), t);
    keepGlassUpright(ch);
    if (ch.pop !== undefined && ch.pop < 1) {
      ch.pop = Math.min(1, ch.pop + dt * 3.2);
      const p = ch.pop - 1, sc = 1 + 2.2 * p * p * p + 1.2 * p * p; // ease out with a little overshoot
      ch.root.scale.setScalar(Math.max(0.02, sc) * (ch.baseScale || 1));
    }
  }
  if (ring.visible) ringMat.opacity = 0.55 + 0.3 * Math.sin(t * 5);

  // lights + floor on the beat
  const bi = Math.floor(beat), bf = beat - bi;
  const pulse = Math.pow(1 - bf, 3);
  for (const tl of tiles) {
    const c = TILE_COL[(tl.i + tl.j + Math.floor(bi / 2)) % 4];
    const on = ((tl.i * 3 + tl.j * 5 + bi) % 3) === 0;
    tl.m.material.color.copy(c).multiplyScalar(on ? 0.6 + 0.8 * pulse : 0.25);
  }
  const hue = [0x4a7cff, 0xb8c4ff, 0x6a4aff, 0x2a5cff][Math.floor(bi / 8) % 4];
  danceLight.color.setHex(hue); danceLight.intensity = 0.9 + 1.4 * pulse;
  danceLight2.color.setHex([0x6a4aff, 0x2a5cff, 0xb8c4ff, 0x4a7cff][Math.floor(bi / 8) % 4]); danceLight2.intensity = 0.6 + 0.9 * Math.pow(1 - ((beat + 0.5) % 1), 3);
  for (const bm of beams) {
    bm.pivot.rotation.z = 0.45 * Math.sin(t * 0.7 + bm.k * 1.7);
    bm.pivot.rotation.x = 0.35 * Math.sin(t * 0.53 + bm.k * 2.3);
    bm.mat.color.setHex(bm.k % 2 ? hue : 0xb8c4ff); bm.mat.opacity = 0.05 + 0.09 * pulse;
  }
  const fl = 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 4.3);
  fireLight.intensity = 1.3 + 0.12 * Math.sin(t * 0.8);
  neonLight.intensity = 0.7;
  driveTraffic(dt);
  backLight.intensity = Math.random() < 0.02 ? 0.25 : 1.1;
  waterTex.offset.set((t * 0.03) % 1, (t * 0.017) % 1);
  waterLight.intensity = 0.9 + 0.15 * Math.sin(t * 1.7);
  candleLight.intensity = 0.6 + 0.12 * Math.sin(t * 9.1) * Math.sin(t * 3.7);
  swimLights[0].intensity = 1.3 + 0.35 * pulse;
  for (const l of barLights) l.intensity = 1.1 + 0.05 * Math.sin(t * 2 + l.position.x);
  tvLight.intensity = tvOn ? 0.55 + 0.2 * Math.sin(t * 9) * Math.sin(t * 2.3) : 0;
  expireBubbles();

  // smoke
  let si = 0;
  for (const ch of crowd) {
    if (!ch.ember) continue;
    ch.ember.material.color.setRGB(1, 0.32 + 0.15 * Math.sin(t * 7 + ch.phase * 9), 0.08);
    ch.ember.updateWorldMatrix(true, false);
    const e = ch.ember.geometry.boundingSphere || (ch.ember.geometry.computeBoundingSphere(), ch.ember.geometry.boundingSphere);
    tmpV.copy(e.center).applyMatrix4(ch.ember.matrixWorld);
    const puffs = ch.look.smoke === 2 ? 28 : 18;
    for (let k = 0; k < puffs && si < SMAX; k++, si++) {
      const L = ((t * 0.3 + k / puffs + ch.phase) % 1);
      sPos[si * 3] = tmpV.x + Math.sin(k * 2.39 + t * 0.8 + L * 4) * 0.035 * L + L * 0.04;
      sPos[si * 3 + 1] = tmpV.y + L * 0.45;
      sPos[si * 3 + 2] = tmpV.z + Math.cos(k * 1.7 + t * 0.6) * 0.035 * L;
    }
  }
  for (let k = si; k < sHead; k++) sPos[k * 3 + 1] = -99;
  sHead = si; sGeo.attributes.position.needsUpdate = true;

  updateCamera(dt, t);
  for (const f of POST_HOOKS) f(dt, t, beat);
  placeLabels();
  if (pokerOn) {
    if (pokerFrame++ % 3 === 0) { renderer.setRenderTarget(pokerRT); renderer.render(scene, pokerCam); renderer.setRenderTarget(null); }
    if (performance.now() - pokerHudAt > 300) { pokerHudAt = performance.now(); drawPokerHud(); }
  }
  renderer.render(scene, camera);
  if (cssRenderer) cssRenderer.render(cssScene, camera);
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
function updateRosterUI() {
  const people = crowd.filter((c) => !c.host && !c.npc && c !== draftChar);
  $('count').textContent = people.length === 1 ? '1 character' : people.length + ' characters';
  const ul = $('who'); ul.textContent = '';
  for (const ch of crowd) {
    if (ch === draftChar || ch.npc) continue;
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button';
    const vip = inVip(ch);
    b.textContent = ch.name + (ch.host ? ' · host' : ch.mine ? ' · you' : '') + (vip ? ' · VIP' : '');
    if (vip && !isMod && !ch.mine) b.disabled = true;
    b.onclick = () => focusChar(ch);
    li.appendChild(b); ul.appendChild(li);
  }
}

// speech bubbles: crisp HTML over the 3D view like the name tags; they survive the crowd being rebuilt
const bubbleStore = new Map(); // character key -> { text, until }
const bubbleKey = (ch) => ch.uid || (ch.npc ? 'npc-' + ch.seed : ch.name) || '';
function showBubble(uid, text, name) {
  const ch = crowd.find((c) => c.uid && c.uid === uid) || (name && name.toLowerCase() === HOST_NAME ? crowd.find((c) => c.host) : null);
  if (ch) showBubbleOn(ch, text);
}
function showBubbleOn(ch, text) {
  let t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length > 90) t = t.slice(0, 88) + '…';
  bubbleStore.set(bubbleKey(ch), { text: t, until: performance.now() + 7000 });
  if (ch.bubbleEl) { ch.bubbleEl.remove(); ch.bubbleEl = null; }
}
function syncBubble(ch, x, y, visible, opacity) {
  const b = bubbleStore.get(bubbleKey(ch));
  const live = b && b.until > performance.now();
  if (!live) {
    if (b) bubbleStore.delete(bubbleKey(ch));
    if (ch.bubbleEl) { ch.bubbleEl.remove(); ch.bubbleEl = null; }
    return;
  }
  if (!ch.bubbleEl) { ch.bubbleEl = document.createElement('div'); ch.bubbleEl.className = 'bubble'; ch.bubbleEl.textContent = b.text; labelLayer.appendChild(ch.bubbleEl); }
  ch.bubbleEl.hidden = !visible;
  if (!visible) return;
  // fade out over the last second
  const left = b.until - performance.now();
  ch.bubbleEl.style.opacity = String(Math.min(opacity, left < 1000 ? left / 1000 : 1));
  ch.bubbleEl.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%) translateY(' + (ch.label ? -26 : -6) + 'px)';
}
function expireBubbles() { /* handled in placeLabels */ }

// creator
let draft = null, draftChar = null;
function loadMine() { try { const s = localStorage.getItem('sh1den-bar-me'); if (s) { const e = JSON.parse(s); if (e && NAME_RE.test(e.name) && CODE_RE.test(e.code)) return e; } } catch (e) { } return null; }
function saveMine(e) { try { localStorage.setItem('sh1den-bar-me', JSON.stringify(e)); } catch (err) { } }
function renderOptions() {
  const box = $('opts'); box.textContent = '';
  for (const k of UI_KEYS) {
    if (k === 'hair' && (draft.head === 0 || draft.head === 7) && draft.beard === 0) continue;
    const row = document.createElement('div'); row.className = 'opt';
    const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = LABELS[k];
    const prev = document.createElement('button'); prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Previous ' + LABELS[k]);
    const val = document.createElement('span'); val.className = 'val'; val.textContent = LOOK[k][draft[k]][0];
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Next ' + LABELS[k]);
    const allowed = (v) => !(k === 'spot' && v === 4 && !isMod);
    const step = (dir) => { let v = draft[k]; do { v = (v + dir + LOOK[k].length) % LOOK[k].length; } while (!allowed(v)); draft[k] = v; refreshDraft(); };
    prev.onclick = () => step(-1);
    next.onclick = () => step(1);
    row.append(lab, prev, val, next); box.appendChild(row);
  }
}
function removeDraft() {
  if (!draftChar) return;
  scene.remove(draftChar.root); dropLabel(draftChar); const i = crowd.indexOf(draftChar); if (i >= 0) crowd.splice(i, 1); draftChar = null;
}
function refreshDraft() {
  renderOptions();
  removeDraft();
  const nm = $('nm').value.trim() || 'you';
  draftChar = makeCharacter(draft, nm, hashStr(nm.toLowerCase()));
  draftChar.phase = 0.3; draftChar.act = 'dance';
  draftChar.root.position.set(0, 0, 1.2); draftChar.root.rotation.y = 0.2;
  scene.add(draftChar.root); crowd.push(draftChar);
  focusChar(draftChar);
}
function openCreator() {
  // new characters start without a cigarette; they can pick one in the Smoke option
  // smokes come from the bartender and the humidor now, so the preview never has one
  draft = Object.assign(myEntry ? codeToLook(myEntry.code) : randomLook(Math.random), { smoke: 0 });
  if (draft.spot === 4 && !isMod) draft.spot = 1;
  $('nm').value = myEntry ? myEntry.name : '';
  $('nmErr').hidden = true;
  $('creator').hidden = false; $('done').hidden = true; $('form').hidden = false;
  refreshDraft();
}
function closeCreator() {
  removeDraft();
  $('creator').hidden = true; setView('room');
}
$('nm').addEventListener('input', () => { if (draftChar) refreshDraft(); });
$('rand').onclick = () => { draft = Object.assign(randomLook(Math.random), { smoke: 0 }); refreshDraft(); };
let saving = false;
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (saving) return;
  const name = $('nm').value.trim();
  const err = $('nmErr');
  if (!NAME_RE.test(name)) { err.textContent = 'Use your Twitch name: 3–25 letters, numbers or underscores.'; err.hidden = false; $('nm').focus(); return; }
  if (name.toLowerCase() === HOST_NAME.toLowerCase() && !(window.NET && window.NET.isAdmin)) { err.textContent = 'That name belongs to the host.'; err.hidden = false; return; }
  const code = lookToCode(draft);
  saving = true; $('walkIn').disabled = true; $('walkIn').textContent = 'Walking in…';
  let res = { ok: true, local: true };
  if (window.NET && window.NET.online) res = await window.NET.saveChar(name, code, myEntry && myEntry.name);
  saving = false; $('walkIn').disabled = false; $('walkIn').textContent = 'Walk in';
  if (!res.ok) { err.textContent = res.msg; err.hidden = false; return; }
  myEntry = { name, code };
  saveMine(myEntry);
  $('doneMsg').textContent = res.local
    ? "You're in, but the room is offline right now, so only you can see your character. It's saved in this browser."
    : "You're in. Everyone in the bar can see you now. Say hi in the room chat.";
  $('form').hidden = true; $('done').hidden = false;
  removeDraft();
  rebuild();
  const me = crowd.find((c) => c.mine); if (me) focusChar(me);
  $('createBtn').textContent = 'Edit my character';
  if (window.NET && window.NET.onCharSaved) window.NET.onCharSaved();
});
$('closeCreator').onclick = closeCreator;
$('doneClose').onclick = closeCreator;
$('createBtn').onclick = openCreator;

function enterBar(withSound) {
  $('gate').hidden = true;
  if (withSound) { startAudio(); setMuted(false); }
  else setMuted(true);
  $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? 'Sound off' : 'Sound on';
  if (window.NET && window.NET.onEnter) window.NET.onEnter(withSound);
}
$('enter').onclick = () => enterBar(true);
$('enterQuiet').onclick = () => enterBar(false);
$('mute').onclick = () => { setMuted(!muted); $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? 'Sound off' : 'Sound on'; };
$('track').onclick = () => { if (hasCharacter() || !(window.NET && window.NET.online)) changeMusic(); else { toast('Create a character to change the music.'); } };
for (const v of ['bar', 'dance', 'swim', 'tv', 'pool', 'card', 'vip', 'change', 'street', 'alley', 'map']) $('v-' + v).onclick = () => setView(v);
// phones: one dropdown instead of a row of room buttons
const roomSel = $('roomSelect');
if (roomSel) roomSel.onchange = () => { const v = roomSel.value; if (v) setView(v); setTimeout(() => { roomSel.value = ''; }, 300); };
$('findMe').onclick = () => { const me = crowd.find((c) => c.mine); if (me) focusChar(me); else openCreator(); };
$('pix').onclick = () => { pixels = !pixels; snapOn.value = pixels ? 1 : 0; $('pix').setAttribute('aria-pressed', pixels ? 'true' : 'false'); resize(); };

// ---------------------------------------------------------------- API for the room layer (net.js)
window.BAR = {
  setRegulars(list) { roster = Array.isArray(list) ? list.filter((e) => e && NAME_RE.test(e.name) && CODE_RE.test(e.code)) : []; rebuild(); },
  setMyUid(uid) { myUid = uid; rebuild(); },
  setMine(entry) { if (entry && NAME_RE.test(entry.name) && CODE_RE.test(entry.code)) { myEntry = entry; saveMine(entry); $('createBtn').textContent = 'Edit my character'; rebuild(); } },
  getMine() { return myEntry; },
  bubble: showBubble,
  setDucked,
  setTvOn(on) { tvOn = !!on; },
  setPokerCam(on) { setPokerCam(on); },
  pokerCount() { return pokerPlayers().length; },
  poolTable: () => POOL_TABLE,
  setPoolBalls(b) { setPoolBalls(b); },
  goTo(id) { goTo(id); },
  hasCharacter() { return hasCharacter(); },
  toast(t) { toast(t); },
  meInVip() { const me = crowd.find((c) => c.mine); const sp = me && SPOT_BY_ID[me.spot]; return !!sp && sp.cat === 4; },
  viewRoom() { if (camT.free) return 'map'; const r = roomAt(cam.tx, cam.tz); for (const k in ROOMS) if (ROOMS[k] === r) return k; return ''; },
  getMyState() { return myState; },
  _parts(look) { const r = buildParts(Object.assign(randomLook(Math.random), look), 1); return { B: r.B, B2: r.B2 }; },
  setJukebox(i, by, fresh) {
    if (!(i >= 0 && i < TRACKS.length)) return;
    if (i !== trackIdx) pickTrack(i);
    pinnedTrack = true;
    if (fresh) toast((by ? by + ' put on ' : 'Now playing: ') + TRACKS[i].name);
  },
  toast,
  setMod(on) {
    isMod = !!on;
    $('v-vip').hidden = !isMod;
    if (roomSel) { const o = roomSel.querySelector('option[value="vip"]'); if (o) o.hidden = o.disabled = !isMod; }
    if (!isMod && roomAt(camT.tx, camT.tz) === ROOMS.vip && !(follow && follow.mine)) setView('bar');
    updateRosterUI();
    if (!creatorEl.hidden && !formEl.hidden) renderOptions();
  },
  focusTv() { setView('tv'); },
  openCreator,
  // v42
  setCardOpen,
  cardOpen: () => cardOpen,
  setVictim(v) { const was = victimNow(); victim = v && v.uid && v.until > serverNow() ? { uid: v.uid, until: v.until } : null; if (!!was !== !!victimNow() || (was && victim && was.uid !== victim.uid)) rebuild(); },
  isLocked: () => !!myLock(),
  setCoin,
  coinSpots: () => COIN_SPOTS.length,
  setLeaderboard(list) { drawPlaque(list); },
  runEvent,
  setSpooky(on) { spooky = !!on; },
  setLotCars,
  carStyles: () => CAR_STYLES.map((k) => [k, CAR_STYLE_NAMES[k]]),
  carColors: () => CAR_COLORS.map((c) => c[0]),
  setPokerState(st) { pokerState = st || null; },
  sitAt(id) { if (SPOT_BY_ID[id]) goTo(id); },
  mySpot: () => (myChar() ? myChar().spot : ''),
  myUid: () => myUid,
  charonSays(text) { if (bartender) showBubbleOn(bartender, text); }
};

// ---------------------------------------------------------------- boot
myEntry = loadMine();
if (myEntry) $('createBtn').textContent = 'Edit my character';
updateTrackUI();
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('28px "VT323"'), document.fonts.load('46px "Limelight"')]).catch(() => { }) : Promise.resolve()).then(() => {
  drawNeon(true);
  rebuild();
  $('loading').hidden = true;
  if (window.NET && window.NET.start) window.NET.start();
});
tick();
})();
