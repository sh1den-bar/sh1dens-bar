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
  jacket: [['Black', [30, 30, 32]], ['Olive', [54, 58, 38]], ['Charcoal', [56, 56, 58]], ['Brown', [64, 44, 30]], ['Navy', [30, 35, 48]], ['Oxblood', [62, 26, 24]]],
  pants: [['Black cargo', [44, 44, 43]], ['Jet black', [24, 24, 24]], ['Olive cargo', [62, 64, 44]], ['Urban gray', [78, 78, 78]]],
  skin: [['Pale', [232, 192, 164]], ['Light', [210, 162, 126]], ['Tan', [150, 102, 78]], ['Brown', [112, 74, 54]], ['Deep', [76, 50, 38]]],
  head: [['Shaved', 0], ['Short hair', 1], ['Beanie', 2], ['Cap', 3]],
  hair: [['Dark brown', [40, 28, 22]], ['Black', [18, 16, 16]], ['Blond', [170, 136, 80]], ['Ginger', [128, 60, 30]], ['Gray', [120, 118, 114]]],
  beard: [['None', 0], ['Stubble', 1], ['Full beard', 2]],
  eyes: [['Bare eyes', 0], ['Round glasses', 1], ['Shades', 2]],
  smoke: [['No smoke', 0], ['Cigarette', 1], ['Cigar', 2]],
  dance: [['Bounce', 0], ['Two-step', 1], ['Hands up', 2], ['Head nod', 3]],
  spot: [['Dance room', 0], ['Main bar', 1], ['TV room', 2], ['Pool room', 3], ['VIP lounge (mods)', 4]]
};
const KEYS = ['jacket', 'pants', 'skin', 'head', 'hair', 'beard', 'eyes', 'smoke', 'dance', 'spot'];
const LABELS = { jacket: 'Jacket', pants: 'Pants', skin: 'Skin', head: 'Head', hair: 'Hair color', beard: 'Beard', eyes: 'Eyes', smoke: 'Smoke', dance: 'Dance move', spot: 'Hangout' };

function lookToCode(l) { return KEYS.map((k) => l[k]).join(''); }
function codeToLook(c) {
  const l = {};
  KEYS.forEach((k, i) => { const d = parseInt(c[i], 10); l[k] = isNaN(d) ? 0 : d % LOOK[k].length; });
  return l;
}
function randomLook(r) { const l = {}; KEYS.forEach((k) => { l[k] = Math.floor(r() * LOOK[k].length); }); if (l.spot === 4) l.spot = 1; return l; }
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
  const LIP = SKIN.map((v) => v * 0.72);
  const HAIR = LOOK.hair[look.hair][1];
  const JACKET = look.outfit === 'barman' ? [222, 218, 208] : LOOK.jacket[look.jacket][1];
  const RIB = look.outfit === 'barman' ? [206, 202, 192] : JACKET.map((v) => v * 0.6);
  const CARGO = LOOK.pants[look.pants][1];
  const CARGO_D = CARGO.map((v) => v * 0.74);
  const BOOT = [16, 14, 13], SOLE = [9, 8, 8], WEB = [20, 20, 19], GUN = [72, 74, 76], ZIP = [78, 78, 82];
  const RIM = [18, 18, 20], LENS = look.eyes === 2 ? [14, 14, 16] : [96, 108, 108], LENS_HI = look.eyes === 2 ? [70, 72, 80] : [170, 182, 180];
  const hc = [0, 1.69, 0];

  // head
  P('head', loft(PROFILE.map((p) => headRing(p)), SKIN, { amt: 0.04, smooth: true, center: hc,
    colfn: (ri, i) => { const h = PROFILE[ri][0], t = 2 * Math.PI * i / HS + Math.PI / HS; return (h < 1.57 || (Math.abs(Math.cos(t)) > 0.8 && h > 1.73)) ? SKIN_SHAD : SKIN; } }));
  const clamp = { 1.640: -0.07, 1.662: -0.062, 1.680: -0.052, 1.697: -0.04, 1.716: -0.022, 1.738: 0.048, 1.762: 0.079 };
  const upper = PROFILE.slice(5);
  if (look.head === 0) {
    const stub = [SKIN[0] * 0.44 + HAIR[0] * 0.2, SKIN[1] * 0.44 + HAIR[1] * 0.2, SKIN[2] * 0.44 + HAIR[2] * 0.2];
    O('head', loft(upper.map((p) => headRing(p, 0.0018, clamp[p[0]])), stub, { amt: 0.06, smooth: true, center: hc }));
  } else if (look.head === 1) {
    const c2 = Object.assign({}, clamp, { 1.738: 0.06, 1.762: 0.095 });
    O('head', loft(upper.map((p) => headRing(p, 0.008, c2[p[0]])), HAIR, { amt: 0.08, smooth: true, center: hc }));
  } else if (look.head === 2) {
    const BEANIE = JACKET.map((v, i) => Math.min(255, v * 1.25 + [8, 6, 4][i]));
    const rings = PROFILE.slice(9).map((p) => headRing(p, 0.013, p[0] < 1.72 ? -0.02 : null));
    rings.push(headRing([1.848, 0.012, 0.01, 0.014, -0.016], 0));
    P('head', loft(rings, BEANIE, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([headRing(PROFILE[10], 0.017), headRing(PROFILE[11], 0.016)], BEANIE.map((v) => v * 0.8), { amt: 0.04, smooth: true, center: hc }));
    O('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), SKIN.map((v) => v * 0.5), { amt: 0.05, smooth: true, center: hc }));
  } else {
    const CAP = JACKET.map((v) => Math.min(255, v * 1.3));
    P('head', loft(PROFILE.slice(10).map((p) => headRing(p, 0.01)), CAP, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([rring(1.755, 0.15, 0.09, 0, 0.125, 10, 2.4), rring(1.762, 0.15, 0.09, 0, 0.13, 10, 2.4)], CAP.map((v) => v * 0.85), { amt: 0.04 }));
    O('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), HAIR, { amt: 0.06, smooth: true, center: hc }));
  }
  if (look.beard === 2) {
    O('head', loft(PROFILE.slice(0, 6).map((p, i) => headRing(p, 0.0075 * (1 - 0.7 * i / 5))), HAIR.map((v) => v * 1.1 + 4), { amt: 0.05, smooth: true, center: hc }));
    O('head', loft([rring(1.622, 0.07, 0.016, 0, 0.098, 8), rring(1.636, 0.05, 0.014, 0, 0.104, 8)], HAIR, { amt: 0.03, smooth: true }));
  } else if (look.beard === 1) {
    O('head', loft(PROFILE.slice(0, 6).map((p) => headRing(p, 0.0016)), SKIN.map((v, i) => v * 0.55 + HAIR[i] * 0.15), { amt: 0.05, smooth: true, center: hc }));
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

  // pelvis, belt
  P('hips', loft([rring(0.84, 0.30, 0.20, 0, 0.005, 14), rring(0.92, 0.345, 0.222, 0, 0, 14), rring(1.0, 0.34, 0.22, 0, 0, 14)], CARGO, { smooth: true }));
  O('hips', loft([rring(0.945, 0.352, 0.232, 0, 0, 14), rring(0.99, 0.355, 0.234, 0, 0, 14)], WEB, { amt: 0.03 }));
  O('hips', box(-0.032, 0.032, 0.94, 0.995, 0.112, 0.124, GUN, 0.03));

  // legs
  for (const s of [-1, 1]) {
    const th = s > 0 ? 'thL' : 'thR', kn = s > 0 ? 'knL' : 'knR';
    P(th, tube([V(s * 0.10, 0.97, 0), V(s * 0.104, 0.72, 0.004), V(s * 0.106, 0.48, 0.008)], [0.08, 0.076, 0.066], CARGO, { n: 10 }));
    O(th, box(s * 0.176 - 0.011, s * 0.176 + 0.011, 0.60, 0.73, -0.042, 0.042, CARGO_D, 0.04));
    O(th, box(s * 0.178 - 0.013, s * 0.178 + 0.013, 0.715, 0.75, -0.046, 0.046, CARGO, 0.04));
    P(kn, tube([V(s * 0.106, 0.52, 0.008), V(s * 0.108, 0.32, 0), V(s * 0.11, 0.22, 0)], [0.066, 0.063, 0.062], CARGO, { n: 10 }));
    O(kn, box(s * 0.106 - 0.045, s * 0.106 + 0.045, 0.44, 0.56, 0.05, 0.073, CARGO_D, 0.04));
    O(kn, cyl(V(s * 0.11, 0.23, 0), V(s * 0.11, 0.29, 0), 0.072, 0.066, CARGO_D, { n: 10, smooth: true }));
    P(kn, cyl(V(s * 0.11, 0.07, 0), V(s * 0.11, 0.25, 0), 0.068, 0.065, BOOT, { n: 10 }));
    P(kn, loft([rring(0.022, 0.118, 0.29, s * 0.11, 0.035, 12, 3.5), rring(0.07, 0.122, 0.285, s * 0.11, 0.037, 12, 3.5),
      rring(0.105, 0.112, 0.22, s * 0.11, 0.012, 12, 3), rring(0.13, 0.10, 0.15, s * 0.11, -0.002, 12, 2.6)], BOOT));
    P(kn, loft([rring(0.0, 0.124, 0.298, s * 0.11, 0.035, 12, 3.5), rring(0.024, 0.124, 0.298, s * 0.11, 0.035, 12, 3.5)], SOLE, { amt: 0.03 }));
    O(kn, box(s * 0.11 - 0.016, s * 0.11 + 0.016, 0.10, 0.24, 0.06, 0.07, WEB, 0.04));
  }

  // torso
  P('spine', cyl(V(0, 1.43, -0.006), V(0, 1.585, -0.01), 0.056, 0.054, SKIN_SHAD, { n: 12, smooth: true }));
  P('spine', loft([rring(0.985, 0.336, 0.218, 0, 0, 14), rring(1.04, 0.342, 0.222, 0, 0, 14)], RIB, { amt: 0.03, smooth: true }));
  P('spine', loft([rring(1.035, 0.356, 0.234, 0, 0.002, 14), rring(1.10, 0.368, 0.238, 0, 0.004, 14), rring(1.20, 0.38, 0.24, 0, 0.005, 14),
    rring(1.30, 0.41, 0.24, 0, 0, 14), rring(1.38, 0.435, 0.238, 0, -0.003, 14), rring(1.44, 0.40, 0.222, 0, -0.006, 14),
    rring(1.475, 0.25, 0.17, 0, -0.01, 14)], JACKET, { smooth: true }));
  P('spine', loft([rring(1.44, 0.17, 0.152, 0, -0.008, 14), rring(1.475, 0.165, 0.148, 0, -0.009, 14), rring(1.51, 0.152, 0.138, 0, -0.01, 14)], RIB, { cap: false, amt: 0.03, smooth: true }));
  if (look.outfit === 'barman') {
    // classic hotel bartender: black waistcoat over a white shirt, black bow tie
    const VEST = [20, 20, 24], VEST_L = [34, 34, 40], BRASS_B = [170, 130, 64];
    O('spine', loft([rring(0.975, 0.35, 0.232, 0, 0.002, 14), rring(1.10, 0.38, 0.25, 0, 0.004, 14), rring(1.20, 0.392, 0.252, 0, 0.005, 14),
      rring(1.29, 0.418, 0.252, 0, 0, 14), rring(1.34, 0.43, 0.25, 0, -0.002, 14)], VEST, { smooth: true }));
    // the V neckline: two lapel edges rising from the top button toward the shoulders
    for (const s of [-1, 1]) O('spine', tube([V(s * 0.012, 1.2, 0.128), V(s * 0.075, 1.33, 0.118), V(s * 0.11, 1.42, 0.09)], [0.012, 0.012, 0.01], VEST_L, { n: 4, smooth: false }));
    for (const y of [1.04, 1.1, 1.16]) O('spine', cyl(V(0, y, 0.124), V(0, y, 0.132), 0.008, 0.008, BRASS_B, { n: 6, amt: 0.02 }));
    // shirt collar and bow tie
    O('spine', loft([rring(1.445, 0.15, 0.135, 0, -0.004, 12), rring(1.5, 0.142, 0.128, 0, -0.006, 12)], [228, 224, 214], { cap: false, smooth: true, amt: 0.02 }));
    for (const s of [-1, 1]) O('spine', loft([[V(0, 1.462, 0.064), V(s * 0.05, 1.484, 0.062), V(s * 0.05, 1.444, 0.062)], [V(0, 1.462, 0.072), V(s * 0.05, 1.484, 0.07), V(s * 0.05, 1.444, 0.07)]], [12, 12, 14], { amt: 0.02 }));
    O('spine', box(-0.012, 0.012, 1.452, 1.472, 0.06, 0.078, [12, 12, 14], 0.02));
  } else {
    O('spine', tube([V(0, 0.99, 0.113), V(0, 1.05, 0.12), V(0, 1.15, 0.122), V(0, 1.27, 0.123), V(0, 1.37, 0.12), V(0, 1.445, 0.106), V(0, 1.49, 0.07)], [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], ZIP, { n: 4, smooth: false }));
    for (const s of [-1, 1]) O('spine', box(s * 0.11 - 0.006, s * 0.11 + 0.006, 1.08, 1.17, 0.112, 0.124, RIB, 0.03));
  }

  // arms
  for (const s of [-1, 1]) {
    const shK = s > 0 ? 'shL' : 'shR', elK = s > 0 ? 'elL' : 'elR';
    const sh = V(s * 0.232, 1.40, -0.005), el = V(s * 0.305, 1.12, -0.012), wr = V(s * 0.35, 0.89, 0.03);
    const cuff0 = add(wr, mul(sub(el, wr), 0.16));
    P(shK, tube([V(s * 0.19, 1.445, -0.005), sh, V(s * 0.272, 1.26, -0.01), el], [0.068, 0.076, 0.07, 0.064], JACKET, { n: 10 }));
    P(elK, tube([add(el, V(0, 0.03, 0)), el, V(s * 0.33, 1.0, 0.01), cuff0], [0.06, 0.064, 0.064, 0.062], JACKET, { n: 10 }));
    P(elK, cyl(cuff0, wr, 0.055, 0.05, RIB, { n: 10, smooth: true }));
    const hx = wr[0] + s * 0.004, hz = wr[2] + 0.008;
    P(elK, loft([rring(0.895, 0.036, 0.074, hx, hz, 10), rring(0.845, 0.038, 0.086, hx, hz + 0.004, 10),
      rring(0.80, 0.034, 0.084, hx - s * 0.002, hz + 0.008, 10), rring(0.76, 0.026, 0.066, hx - s * 0.006, hz + 0.01, 10)], SKIN, { smooth: true }));
    P(elK, tube([V(hx - s * 0.012, 0.86, hz + 0.035), V(hx - s * 0.02, 0.825, hz + 0.05), V(hx - s * 0.022, 0.805, hz + 0.052)], [0.011, 0.01, 0.008], SKIN_SHAD, { n: 6 }));
  }
  if (look.outfit === 'barman') {
    // sleeve garters on the white shirt sleeves
    for (const s of [-1, 1]) O(s > 0 ? 'shL' : 'shR', cyl(V(s * 0.262, 1.3, -0.008), V(s * 0.268, 1.27, -0.009), 0.074, 0.073, [24, 24, 28], { n: 10, smooth: true, amt: 0.02 }));
  } else O('shL', box(0.333, 0.35, 1.215, 1.30, -0.032, 0.018, RIB, 0.03));
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
    g.add(new THREE.Mesh(geos[k], charMat));
    if (geos.over[k]) g.add(new THREE.Mesh(geos.over[k], charOverMat));
    bones[k] = g;
    (par ? bones[par] : root).add(g);
  }
  let ember = null;
  if (geos.ember) { ember = new THREE.Mesh(geos.ember, emberMat); bones.head.add(ember); }
  // name tags are crisp HTML labels laid over the 3D view (see placeLabels), not pixelated sprites
  let label = null;
  if (name) { label = document.createElement('div'); label.className = 'nametag'; label.textContent = name; label.hidden = true; labelLayer.appendChild(label); }
  return { root, bones, ember, label, look, name, seed };
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

const ROOMS = {
  bar: { x0: -5, x1: 5, z0: -4, z1: 4, name: 'Main bar' },
  dance: { x0: 5, x1: 14, z0: -4, z1: 4, name: 'Dance room' },
  tv: { x0: -13, x1: -5, z0: -4, z1: 4, name: 'TV room' },
  pool: { x0: -13, x1: -5, z0: -11, z1: -4, name: 'Pool room' },
  vip: { x0: -5, x1: 2, z0: -11, z1: -4, name: 'VIP lounge' }
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
pLight(0x2c4c8c, 0.7, 8, -8, 2.8, 2.5);
// pool room: the long lamp over the table
const poolLamp = pLight(0xfff0c8, 1.4, 4.2, -9, 1.9, -7.5);
pLight(0x2c4c8c, 0.5, 7, -6.5, 2.8, -5);
// vip: fireplace and a reading lamp
const fireLight = pLight(0xff8a3a, 1.2, 5.5, -1.5, 0.7, -10.4);
pLight(0xffc890, 0.7, 4, 1.2, 1.6, -5.2);

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
  noiseFill(x, w, h, [40, 10, 12], 6);
  x.fillStyle = 'rgb(96,70,34)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
  for (let k = 0; k < 5; k++) x.fillRect(8 - k + 2, 3 + k * 2, 1, 1);
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
  noiseFill(x, w, h, [12, 24, 20], 4);
  x.fillStyle = 'rgb(110,84,42)'; x.fillRect(0, 0, 1, h); x.fillRect(0, 40, w, 1);
});
greenWallTex.wrapS = greenWallTex.wrapT = THREE.RepeatWrapping;
const redWallTex = canvasTex(32, 64, (x, w, h) => {
  noiseFill(x, w, h, [34, 9, 11], 5);
  x.fillStyle = 'rgba(120,40,40,0.8)';
  for (let j = 4; j < h; j += 12) for (let i = 4; i < w; i += 16) { x.fillRect(i + 3, j, 2, 1); x.fillRect(i + 1, j + 2, 6, 1); x.fillRect(i + 3, j + 4, 2, 1); }
  x.fillStyle = 'rgb(110,84,42)'; x.fillRect(0, 44, w, 1); x.fillRect(0, 0, 1, h);
});
redWallTex.wrapS = redWallTex.wrapT = THREE.RepeatWrapping;

// furniture and glowing bits get a depth bias so they always win against the floor and walls they touch
const roomMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -3 }));
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
const decal = (opts) => new THREE.MeshBasicMaterial(Object.assign({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }, opts));
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
floorFor(ROOMS.pool, woodTex, 1.2);
floorFor(ROOMS.vip, vipTex, 0.8);

// walls: each room gets its own inward-facing walls (seen from inside, invisible from behind),
// with doorway gaps given as [from, to] distances along the wall
const WALL_H = 3.2, DOOR_H = 2.4;
const wallMats = {
  deco: ps1(new THREE.MeshLambertMaterial({ map: wallTex })),
  green: ps1(new THREE.MeshLambertMaterial({ map: greenWallTex })),
  red: ps1(new THREE.MeshLambertMaterial({ map: redWallTex }))
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
roomWalls(ROOMS.dance, { left: [DOOR.barDance] }, wallMats.deco);
roomWalls(ROOMS.tv, { right: [DOOR.barTv], back: [DOOR.tvPool] }, wallMats.deco);
roomWalls(ROOMS.pool, { front: [DOOR.tvPool], right: [DOOR.poolVip] }, wallMats.green);
roomWalls(ROOMS.vip, { left: [DOOR.poolVip] }, wallMats.red);

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
  if (alongX) S.push(box(Math.min(x0, x1), Math.max(x0, x1), DOOR_H, DOOR_H + 0.08, z0 - 0.08, z0 + 0.08, BRASS, 0.03));
  else S.push(box(x0 - 0.08, x0 + 0.08, DOOR_H, DOOR_H + 0.08, Math.min(z0, z1), Math.max(z0, z1), BRASS, 0.03));
}
doorFrame(5, -1, 5, 1); doorFrame(-5, 0.5, -5, 2.5); doorFrame(-10, -4, -8.4, -4); doorFrame(-5, -8.5, -5, -7);

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
S.push(box(-2.95, 2.95, 1.0, 1.03, -4.0, -3.56, MARBLE));
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
const HIGH_TABLES = [[-2.6, 1.4], [2.6, 1.4], [-1.2, 2.9], [1.2, 2.9]];
for (const [x, z] of HIGH_TABLES) { highTable(x, z); martini(x + 0.1, 1.09, z - 0.05); }
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
const TV = { x: -12.93, y: 1.75, z: 0, w: 3.6, h: 2.02 };
S.push(box(-13.0, -12.95, TV.y - TV.h / 2 - 0.1, TV.y + TV.h / 2 + 0.1, TV.z - TV.w / 2 - 0.1, TV.z + TV.w / 2 + 0.1, [12, 12, 16], 0.03));
for (const [y0, y1, z0, z1] of [[TV.y - TV.h / 2 - 0.12, TV.y - TV.h / 2 - 0.04, TV.z - TV.w / 2 - 0.12, TV.z + TV.w / 2 + 0.12],
  [TV.y + TV.h / 2 + 0.04, TV.y + TV.h / 2 + 0.12, TV.z - TV.w / 2 - 0.12, TV.z + TV.w / 2 + 0.12],
  [TV.y - TV.h / 2 - 0.12, TV.y + TV.h / 2 + 0.12, TV.z - TV.w / 2 - 0.12, TV.z - TV.w / 2 - 0.04],
  [TV.y - TV.h / 2 - 0.12, TV.y + TV.h / 2 + 0.12, TV.z + TV.w / 2 + 0.04, TV.z + TV.w / 2 + 0.12]]) S.push(box(-12.97, -12.92, y0, y1, z0, z1, BRASS_D, 0.03));
S.push(box(-12.95, -12.4, 0, 0.45, -1.4, 1.4, LACQUER));
S.push(box(-12.95, -12.38, 0.45, 0.47, -1.42, 1.42, BRASS, 0.03));
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
for (const cx of [-10.0, -7.6]) for (const cz of [-1.6, 1.6]) couch(cx, cz, 2.0);
S.push(box(-11.4, -10.8, 0, 0.4, -1.0, 1.0, LACQUER));
S.push(box(-11.42, -10.78, 0.4, 0.43, -1.02, 1.02, MARBLE));
martini(-11.1, 0.43, -0.4); succulent(-11.1, 0.43, 0.5, 1);
sconce(-12.97, -3.0, 1); sconce(-12.97, 3.0, 1);

// ===== POOL ROOM =====
const PT = { x: -9, z: -7.5, l: 2.6, w: 1.45 };
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(box(PT.x + dx * (PT.l / 2 - 0.2) - 0.08, PT.x + dx * (PT.l / 2 - 0.2) + 0.08, 0, 0.62, PT.z + dz * (PT.w / 2 - 0.15) - 0.08, PT.z + dz * (PT.w / 2 - 0.15) + 0.08, [40, 24, 14]));
S.push(box(PT.x - PT.l / 2, PT.x + PT.l / 2, 0.6, 0.76, PT.z - PT.w / 2, PT.z + PT.w / 2, [52, 30, 18]));
S.push(box(PT.x - PT.l / 2 + 0.12, PT.x + PT.l / 2 - 0.12, 0.76, 0.78, PT.z - PT.w / 2 + 0.12, PT.z + PT.w / 2 - 0.12, [26, 84, 52], 0.04));
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.push(box(PT.x + dx * (PT.l / 2 - 0.12) - 0.07, PT.x + dx * (PT.l / 2 - 0.12) + 0.07, 0.76, 0.84, PT.z + dz * (PT.w / 2 - 0.12) - 0.07, PT.z + dz * (PT.w / 2 - 0.12) + 0.07, [44, 26, 16]));
for (const e of [-1, 1]) {
  S.push(box(PT.x - PT.l / 2, PT.x + PT.l / 2, 0.78, 0.84, PT.z + e * (PT.w / 2 - 0.06) - 0.06, PT.z + e * (PT.w / 2 - 0.06) + 0.06, [44, 26, 16]));
  S.push(box(PT.x + e * (PT.l / 2 - 0.06) - 0.06, PT.x + e * (PT.l / 2 - 0.06) + 0.06, 0.78, 0.84, PT.z - PT.w / 2, PT.z + PT.w / 2, [44, 26, 16]));
}
for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) S.push(cyl(V(PT.x + dx * (PT.l / 2 - 0.14), 0.77, PT.z + dz * (PT.w / 2 - 0.14)), V(PT.x + dx * (PT.l / 2 - 0.14), 0.792, PT.z + dz * (PT.w / 2 - 0.14)), 0.05, 0.05, [6, 6, 6], { n: 8, amt: 0 }));
const BALLS = [[230, 220, 200], [210, 170, 40], [40, 60, 170], [180, 40, 40], [90, 40, 120], [220, 110, 30], [30, 110, 60], [110, 30, 30], [14, 14, 14]];
BALLS.forEach((c, i) => {
  const bx = i === 0 ? PT.x - 0.75 : PT.x + 0.45 + Math.floor((i - 1) / 3) * 0.07, bz = i === 0 ? PT.z : PT.z + (((i - 1) % 3) - 1) * 0.07;
  S.push(cyl(V(bx, 0.78, bz), V(bx, 0.83, bz), 0.028, 0.028, c, { n: 6, amt: 0.03 }));
});
// lamp over the table
S.push(box(PT.x - 0.9, PT.x + 0.9, 2.0, 2.12, PT.z - 0.18, PT.z + 0.18, [24, 64, 40]));
for (const x of [PT.x - 0.85, PT.x + 0.85]) S.push(cyl(V(x, 2.12, PT.z), V(x, 3.2, PT.z), 0.008, 0.008, BRASS, { n: 4 }));
G.push(box(PT.x - 0.85, PT.x + 0.85, 1.995, 2.0, PT.z - 0.14, PT.z + 0.14, [255, 236, 190], 0));
// cue rack on the back wall
S.push(box(-11.2, -9.6, 0.9, 1.0, -10.98, -10.88, [44, 26, 16]));
S.push(box(-11.2, -9.6, 1.6, 1.7, -10.98, -10.88, [44, 26, 16]));
for (let k = 0; k < 6; k++) S.push(cyl(V(-11.05 + k * 0.28, 0.92, -10.92), V(-11.05 + k * 0.28, 2.3, -10.92), 0.014, 0.008, [150, 110, 70], { n: 4 }));
// bar shelf and two stools in the corner
S.push(box(-12.95, -12.6, 1.05, 1.1, -10.6, -7.2, [44, 26, 16]));
for (const z of [-9.6, -8.2]) {
  S.push(cyl(V(-12.25, 0, z), V(-12.25, 0.66, z), 0.025, 0.025, BRASS, { n: 6 }));
  S.push(cyl(V(-12.25, 0.66, z), V(-12.25, 0.74, z), 0.17, 0.17, LEATHER, { n: 10 }));
}
// velvet rope in front of the VIP door
for (const z of [-8.75, -6.75]) {
  S.push(cyl(V(-5.4, 0, z), V(-5.4, 0.03, z), 0.13, 0.12, BRASS_D, { n: 8 }));
  S.push(cyl(V(-5.4, 0.03, z), V(-5.4, 0.95, z), 0.025, 0.025, BRASS, { n: 6 }));
  S.push(cyl(V(-5.4, 0.95, z), V(-5.4, 1.01, z), 0.045, 0.03, BRASS, { n: 6 }));
}
S.push(tube([V(-5.4, 0.9, -8.75), V(-5.43, 0.72, -8.25), V(-5.45, 0.66, -7.75), V(-5.43, 0.72, -7.25), V(-5.4, 0.9, -6.75)], [0.022, 0.022, 0.022, 0.022, 0.022], VELVET, { n: 5 }));
sconceZ(-6.2, -10.97, 1); sconceZ(-12.0, -10.97, 1);

// ===== VIP CIGAR LOUNGE =====
// deco fireplace on the back wall
S.push(box(-2.7, -0.3, 0, 1.3, -10.98, -10.6, MARBLE_L));
S.push(box(-2.85, -0.15, 1.3, 1.38, -10.98, -10.5, MARBLE));
S.push(box(-2.0, -1.0, 0.1, 0.85, -10.62, -10.585, [6, 4, 4], 0.02));
tubeB([V(-2.05, 0.1, -10.58), V(-2.05, 0.85, -10.58), V(-1.5, 1.05, -10.58), V(-0.95, 0.85, -10.58), V(-0.95, 0.1, -10.58)], 0.02, BRASS);
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85 });
const flames = [];
for (let k = 0; k < 4; k++) {
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 5), fireMat);
  f.position.set(-1.8 + k * 0.2, 0.32, -10.68); scene.add(f); flames.push(f);
}
// armchairs around a low marble table
const VIP_CHAIRS = [];
function armchair(x, z, yaw) {
  const parts = [];
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const R = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const bx = (lx0, lx1, y0, y1, lz0, lz1, col) => {
    const pts0 = [], pts1 = [];
    for (const [lx, lz] of [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]]) { const p = R(lx, lz); pts0.push(V(p[0], y0, p[1])); pts1.push(V(p[0], y1, p[1])); }
    parts.push(loft([pts0, pts1], col));
  };
  bx(-0.4, 0.4, 0.1, 0.42, -0.4, 0.38, LEATHER_B);
  bx(-0.4, 0.4, 0.42, 1.0, -0.42, -0.24, LEATHER_B);
  for (const e of [-1, 1]) bx(e > 0 ? 0.28 : -0.44, e > 0 ? 0.44 : -0.28, 0.1, 0.66, -0.42, 0.38, LEATHER_B);
  bx(-0.28, 0.28, 0.42, 0.48, -0.24, 0.34, [76, 46, 30]);
  for (const [lx, lz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.33], [0.35, 0.33]]) { const p = R(lx, lz); parts.push(cyl(V(p[0], 0, p[1]), V(p[0], 0.1, p[1]), 0.025, 0.025, BRASS, { n: 4 })); }
  for (const p of parts) S.push(p);
  VIP_CHAIRS.push([x, z, yaw]);
}
armchair(-1.5, -8.4, 0); armchair(-3.0, -6.9, Math.PI / 2); armchair(0.0, -6.9, -Math.PI / 2); armchair(-1.5, -5.4, Math.PI);
S.push(cyl(V(-1.5, 0, -6.9), V(-1.5, 0.4, -6.9), 0.12, 0.12, BRASS_D, { n: 8 }));
S.push(cyl(V(-1.5, 0.4, -6.9), V(-1.5, 0.45, -6.9), 0.55, 0.55, MARBLE, { n: 14 }));
S.push(cyl(V(-1.5, 0.405, -6.9), V(-1.5, 0.44, -6.9), 0.56, 0.56, BRASS, { n: 14, amt: 0.03 }));
S.push(cyl(V(-1.3, 0.45, -7.1), V(-1.3, 0.48, -7.1), 0.08, 0.07, [40, 40, 44], { n: 8 }));
S.push(cyl(V(-1.7, 0.45, -6.7), V(-1.7, 0.55, -6.7), 0.035, 0.04, [170, 120, 60], { n: 6 }));
S.push(box(-1.85, -1.55, 0.45, 0.53, -7.15, -6.95, [70, 40, 22], 0.04));
// humidor and a reading lamp
S.push(box(0.9, 1.9, 0, 1.6, -10.98, -10.5, [44, 26, 16]));
S.push(box(0.95, 1.85, 0.9, 1.5, -10.52, -10.475, [90, 70, 50], 0.05));
S.push(box(0.95, 1.85, 1.6, 1.65, -11, -10.48, BRASS, 0.03));
S.push(cyl(V(1.2, 0, -5.2), V(1.2, 0.03, -5.2), 0.18, 0.16, BRASS_D, { n: 8 }));
S.push(cyl(V(1.2, 0.03, -5.2), V(1.2, 1.5, -5.2), 0.015, 0.015, BRASS, { n: 4 }));
S.push(cyl(V(1.2, 1.45, -5.2), V(1.2, 1.7, -5.2), 0.22, 0.12, [120, 96, 60], { n: 8 }));
sconce(1.97, -8.0, -1); sconceZ(-4.0, -10.97, 1);
succulent(1.5, 0, -4.5, 2.2);

addStatic(S);
addStatic(G, glowMat);

// jukebox face and the gold sign (unlit, glowing)
const jukeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.7), decal({ map: canvasTex(16, 18, (x) => {
  x.fillStyle = '#1a120a'; x.fillRect(0, 0, 16, 18);
  for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#ffc060' : '#d48a2a'; x.fillRect(2 + i * 2, 2, 1, 13); }
  x.fillStyle = '#ffe0a0'; x.fillRect(3, 16, 10, 1);
}) }));
jukeFace.position.set(-4.43, 0.8, -1.6); jukeFace.rotation.y = Math.PI / 2; scene.add(jukeFace);

const signFont = '"Limelight", "Poiret One", Georgia, serif';
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
doorSign('CINEMA', -4.97, 1.5, Math.PI / 2); doorSign('BAR', -5.03, 1.5, -Math.PI / 2);
doorSign('BILLIARDS', -9.2, -3.97, 0); doorSign('CINEMA', -9.2, -4.03, Math.PI);
doorSign('VIP', -5.03, -7.75, -Math.PI / 2); doorSign('BILLIARDS', -4.97, -7.75, Math.PI / 2);

// the TV: a black screen in 3D, with the YouTube player laid over it in CSS 3D
// the screen punches a see-through hole in the 3D picture; the video sits behind the canvas and shows only through it,
// so walls and people in front of the TV hide it properly
const tvGlass = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), decal({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, fog: false }));
tvGlass.position.set(TV.x, TV.y, TV.z); tvGlass.rotation.y = Math.PI / 2; scene.add(tvGlass);
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
}

// dance floor tiles and light beams
const tiles = [];
const TILE_COL = [new THREE.Color(0x10224a), new THREE.Color(0x2c4f9a), new THREE.Color(0x8a96c0), new THREE.Color(0x24164a)];
for (let i = 0; i < DF.n; i++) for (let j = 0; j < DF.n; j++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(DF.s - 0.04, DF.s - 0.04),
    new THREE.MeshBasicMaterial({ color: 0x0a1020, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 }));
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
const HOST_LOOK = { jacket: 0, pants: 0, skin: 2, head: 0, hair: 0, beard: 2, eyes: 1, smoke: 2, dance: 3, spot: 1 };
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
[[-5.4, -3.3, -Math.PI / 2 - 0.4], [-5.4, 3.3, -Math.PI / 2 + 0.4], [-6.2, -0.2, -Math.PI / 2]].forEach(([x, z, yaw], i) =>
  addSpot('cinema-stand-' + i, 2, 'lean', x, z, yaw, 'Stand at the back', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// billiards
addSpot('pool-cue-0', 3, 'pool', PT.x - PT.l / 2 - 0.55, PT.z - 0.25, Math.PI / 2, 'Play pool', hitBox(PT.x - PT.l / 2 - 0.5, 0.8, PT.z - 0.25, 0.6, 1.6, 0.6));
addSpot('pool-cue-1', 3, 'pool', PT.x + PT.l / 2 + 0.55, PT.z + 0.2, -Math.PI / 2, 'Play pool', hitBox(PT.x + PT.l / 2 + 0.5, 0.8, PT.z + 0.2, 0.6, 1.6, 0.6));
[-9.6, -8.2].forEach((z, i) => addSpot('pool-stool-' + i, 3, 'sit', -12.25, z, -Math.PI / 2, 'Sit at the corner bar', hitBox(-12.25, 0.45, z, 0.45, 0.9, 0.45)));
[[-9.0, -5.2, Math.PI], [-7.2, -5.0, Math.PI + 0.5], [-10.8, -5.0, Math.PI - 0.5], [-6.0, -9.8, -Math.PI / 2 - 0.5], [-9.0, -10.3, 0]].forEach(([x, z, yaw], i) =>
  addSpot('pool-watch-' + i, 3, 'lean', x, z, yaw, 'Watch the game', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// VIP lounge: the host's armchair is his alone
VIP_CHAIRS.forEach(([x, z, yaw], i) => addSpot('vip-chair-' + i, 4, i === 0 ? 'lounge' : 'sitlow', x - Math.sin(yaw) * 0.05, z - Math.cos(yaw) * 0.05, yaw,
  i === 0 ? "The host's chair" : 'Take an armchair', hitBox(x, 0.5, z, 0.8, 1.0, 0.8), { hostOnly: i === 0 }));
[[-4.6, -9.9, Math.PI / 4], [1.5, -9.7, -Math.PI / 4], [-4.5, -4.6, Math.PI * 0.8], [1.5, -6.6, -Math.PI / 2]].forEach(([x, z, yaw], i) =>
  addSpot('vip-stand-' + i, 4, 'lean', x, z, yaw, 'Hang out by the fire', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
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
  const x = Math.min(13.0, DF.x + Math.cos(a) * rx), z = Math.max(-3.6, Math.min(3.6, DF.z + Math.sin(a) * rz));
  return { id: 'overflow-' + idx, cat: 0, act: 'dance', x, z, yaw: yawTo(x, z, DF.x, DF.z) };
}

function putAt(ch, s) {
  ch.act = s.act; ch.spot = s.id;
  ch.root.position.set(s.x, 0, s.z); ch.root.rotation.y = s.yaw;
  setCue(ch, ch.act === 'pool');
}
const spotOwner = new Map(); // spot id -> character, refreshed by placeAll
function placeAll() {
  spotOwner.clear();
  const people = crowd.filter((ch) => !ch.npc && ch !== draftChar);
  const claim = (ch, s) => { spotOwner.set(s.id, ch); putAt(ch, s); ch.placed = true; };
  for (const ch of people) ch.placed = false;
  // 1. people who clicked somewhere, earliest click first (a seat goes to whoever took it first)
  const chosen = people.filter((ch) => ch.want && SPOT_BY_ID[ch.want]).sort((a, b) => (a.wantT || 0) - (b.wantT || 0));
  for (const ch of chosen) {
    const s = SPOT_BY_ID[ch.want];
    if (spotOwner.has(s.id) || (s.hostOnly && !ch.host)) continue;
    claim(ch, s);
  }
  // 2. the host keeps his armchair unless he went somewhere else
  for (const ch of people) if (ch.host && !ch.placed && !spotOwner.has('vip-chair-0')) claim(ch, SPOT_BY_ID['vip-chair-0']);
  // 3. everyone else goes to a free spot in the room they picked in the creator
  let over = 0;
  for (const ch of people) {
    if (ch.placed) continue;
    const free = (cat) => SPOT_LIST.find((s) => s.cat === cat && !s.hostOnly && !spotOwner.has(s.id));
    const s = free(ch.look.spot) || (ch.look.spot === 4 && free(1)) || free(0);
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
  if (ch.label) { if (opts.mine) { ch.label.textContent = name + ' (you)'; ch.label.classList.add('mine'); } if (opts.host) ch.label.classList.add('host'); }
  scene.add(ch.root); crowd.push(ch);
  return ch;
}

let roster = [];
let myEntry = null, myUid = null;
const lastSpots = new Map(), lastDrinks = new Map();
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
  const bt = addChar(BARTENDER_LOOK, '', { npc: true, seedName: 'bartender' });
  bartender = bt;
  setGlass(bt, 'whiskey'); giveTowel(bt);
  bt.act = 'bartend'; bt.root.position.set(0.4, 0, -3.35); bt.root.rotation.y = 0;
  const dj = addChar(DJ_LOOK, '', { npc: true, seedName: 'dj' });
  dj.act = 'dj'; dj.root.position.set(13.85, 0, 0); dj.root.rotation.y = -Math.PI / 2;
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
    wantFrom(addChar(codeToLook(e.code), e.name, { mine, uid: e.uid }), e);
  }
  if (myEntry && !haveMine && !seen.has(myEntry.name.toLowerCase())) wantFrom(addChar(codeToLook(myEntry.code), myEntry.name, { mine: true, uid: myUid }), { s: myState.s, d: myState.d, t: 1 });
  if (!(window.NET && window.NET.online)) { const me = crowd.find((c) => c.mine); if (me && !me.want) wantFrom(me, { s: myState.s, d: myState.d, t: 1 }); }
  placeAll();
  // pop people in when they moved, and hand out their drinks
  for (const ch of crowd) {
    if (ch.npc || ch === draftChar) continue;
    const key = ch.uid || ch.name;
    const prev = lastSpots.get(key);
    if (prev && prev !== ch.spot) ch.pop = 0;
    lastSpots.set(key, ch.spot);
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
  tv: { tx: -10.5, ty: 1.4, tz: 0, d: 6, yaw: Math.PI / 2, pitch: 0.16 },
  pool: { tx: -9, ty: 0.9, tz: -7.5, d: 6, yaw: 0.75, pitch: 0.6 },
  vip: { tx: -1.5, ty: 0.9, tz: -7.4, d: 5, yaw: 0.35, pitch: 0.42 },
  map: { tx: 0.5, ty: 0, tz: -3.6, d: 26, yaw: 0, pitch: 1.3, free: true }
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
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; velYaw = velPitch = 0; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const now = performance.now(), edt = Math.max(1 / 240, (now - drag.t) / 1000);
  const dyaw = -(e.clientX - drag.x) * 0.006, dpitch = (e.clientY - drag.y) * 0.004;
  camT.yaw += dyaw;
  camT.pitch = Math.max(0.02, Math.min(camT.free ? 1.5 : 1.25, camT.pitch + dpitch));
  // remember how fast you were dragging, so the camera glides on after you let go
  velYaw = velYaw * 0.6 + (dyaw / edt) * 0.4; velPitch = velPitch * 0.6 + (dpitch / edt) * 0.4;
  drag = { x: e.clientX, y: e.clientY, t: now }; lastMoveT = now;
});
const endDrag = () => { if (drag && performance.now() - lastMoveT > 90) velYaw = velPitch = 0; drag = null; };
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
const BIRD = { pitch: 1.3, d: 14, x0: -13.5, x1: 14.5, z0: -11.5, z1: 4.5 };
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
  scene.fog.near = camDist > 12 ? 30 : 7; scene.fog.far = camDist > 12 ? 70 : 17;
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
  { id: 'tv', label: 'Watch the TV', hit: hitBox(-12.9, 1.75, 0, 0.3, 2.1, 3.7), cat: 2, floor: [-12.3, 0], size: 0.7 },
  { id: 'pooltable', label: 'Play pool', hit: hitBox(PT.x, 0.45, PT.z, PT.l, 0.9, PT.w), cat: 3, floor: [PT.x, PT.z], size: 1.2 }
];
const CAT_ROOM = { 0: ROOMS.dance, 1: ROOMS.bar, 2: ROOMS.tv, 3: ROOMS.pool, 4: ROOMS.vip };
const targets = SPOT_LIST.map((s) => ({ kind: 'spot', s, box: new THREE.Box3(new THREE.Vector3(s.hit.x - s.hit.sx / 2, s.hit.y - s.hit.sy / 2, s.hit.z - s.hit.sz / 2), new THREE.Vector3(s.hit.x + s.hit.sx / 2, s.hit.y + s.hit.sy / 2, s.hit.z + s.hit.sz / 2)) }))
  .concat(OBJECTS.map((o) => ({ kind: 'object', o, box: new THREE.Box3(new THREE.Vector3(o.hit.x - o.hit.sx / 2, o.hit.y - o.hit.sy / 2, o.hit.z - o.hit.sz / 2), new THREE.Vector3(o.hit.x + o.hit.sx / 2, o.hit.y + o.hit.sy / 2, o.hit.z + o.hit.sz / 2)) })));

const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc870, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16, fog: false });
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
    return { ok: true, text: tg.o.label };
  }
  const s = tg.s, owner = spotOwner.get(s.id);
  if (owner && owner.mine) return { ok: false, text: "You're here" };
  if (s.hostOnly) return { ok: !!(myChar() && myChar().host) && !owner, text: owner ? (owner.name || 'Taken') + "'s spot" : "The host's chair" };
  if (s.cat === 4 && !isMod) return { ok: false, text: 'Mods only' };
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
  if (!tg) { ring.visible = false; hintEl.hidden = true; canvas.style.cursor = drag ? 'grabbing' : 'grab'; return; }
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
  const info = describe(tg);
  if (info.needChar) { openCreator(); return; }
  if (!info.ok) return;
  if (tg.kind === 'spot') { goTo(tg.s.id); return; }
  const id = tg.o.id;
  if (id === 'bartender') openDrinkMenu(x, y);
  else if (id === 'jukebox' || id === 'djbooth') changeMusic();
  else if (id === 'tv') { setView('tv'); const p = document.getElementById('room'); if (p && p.hidden) document.getElementById('roomBtn').click(); }
  else if (id === 'pooltable') {
    const free = ['pool-cue-0', 'pool-cue-1'].find((sid) => !spotOwner.has(sid) || spotOwner.get(sid).mine);
    if (free) goTo(free); else toast('Both cues are taken. Grab a spot to watch.');
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
function closeDrinkMenu() { if (drinkMenu) drinkMenu.hidden = true; }
function orderDrink(id) {
  closeDrinkMenu();
  const me = myChar();
  // order at the bar: if you're not already at the bar, take a free stool
  let spot = myState.s || (me && me.spot) || '';
  const atBar = SPOT_BY_ID[spot] && SPOT_BY_ID[spot].cat === 1;
  if (!atBar) {
    const stool = SPOT_LIST.find((s) => s.id.startsWith('bar-stool-') && !spotOwner.has(s.id));
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
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrinkMenu(); });
}
function orderDrinkNone() { closeDrinkMenu(); goTo(myState.s || (myChar() && myChar().spot) || '', ''); }
let bartender = null;
function bartenderSays(drinkId, name) {
  const d = DRINK_BY_ID[drinkId]; if (!d || !bartender) return;
  showBubbleOn(bartender, 'One ' + d.name.toLowerCase() + ' for ' + name + '.');
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

// ---------------------------------------------------------------- render loop
let pixels = true;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const scale = pixels ? Math.max(2, Math.round(Math.min(w, h) / 260)) : 1;
  renderer.setPixelRatio(pixels ? 1 : Math.min(devicePixelRatio, 2));
  renderer.setSize(Math.max(1, Math.round(w / scale)), Math.max(1, Math.round(h / scale)), false);
  snap.value.set(Math.round(w / scale / 2), Math.round(h / scale / 2));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (cssRenderer) cssRenderer.setSize(w, h);
}
new ResizeObserver(resize).observe(stage); resize();

const clock = new THREE.Clock();
const creatorEl = document.getElementById('creator'), formEl = document.getElementById('form');
let sHead = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, beat = beatNow();
  // while you're editing your look, hide your old character (never the bartender) so only the preview shows
  const editing = !creatorEl.hidden && !formEl.hidden;
  for (const ch of crowd) {
    ch.root.visible = !(editing && ch.mine && !ch.host && ch !== draftChar);
    pose(ch, ch.act, beat + (ch.act === 'dance' ? 0 : ch.phase), t);
    keepGlassUpright(ch);
    if (ch.pop !== undefined && ch.pop < 1) {
      ch.pop = Math.min(1, ch.pop + dt * 3.2);
      const p = ch.pop - 1, sc = 1 + 2.2 * p * p * p + 1.2 * p * p; // ease out with a little overshoot
      ch.root.scale.setScalar(Math.max(0.02, sc));
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
  fireLight.intensity = 1.1 * fl;
  flames.forEach((f, i) => { f.scale.set(1, 0.7 + 0.45 * Math.abs(Math.sin(t * (5 + i) + i)), 1); });
  neonLight.intensity = 0.7;
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
  placeLabels();
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
function showBubble(uid, text) {
  const ch = crowd.find((c) => c.uid && c.uid === uid);
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
function loadMine() { try { const s = localStorage.getItem('sh1den-bar-me'); if (s) { const e = JSON.parse(s); if (e && NAME_RE.test(e.name) && /^\d{10}$/.test(e.code)) return e; } } catch (e) { } return null; }
function saveMine(e) { try { localStorage.setItem('sh1den-bar-me', JSON.stringify(e)); } catch (err) { } }
function renderOptions() {
  const box = $('opts'); box.textContent = '';
  for (const k of KEYS) {
    if (k === 'hair' && draft.head === 0 && draft.beard === 0) continue;
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
  draft = myEntry ? codeToLook(myEntry.code) : randomLook(Math.random);
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
$('rand').onclick = () => { draft = randomLook(Math.random); refreshDraft(); };
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
for (const v of ['bar', 'dance', 'tv', 'pool', 'vip', 'map']) $('v-' + v).onclick = () => setView(v);
$('findMe').onclick = () => { const me = crowd.find((c) => c.mine); if (me) focusChar(me); else openCreator(); };
$('pix').onclick = () => { pixels = !pixels; snapOn.value = pixels ? 1 : 0; $('pix').setAttribute('aria-pressed', pixels ? 'true' : 'false'); resize(); };

// ---------------------------------------------------------------- API for the room layer (net.js)
window.BAR = {
  setRegulars(list) { roster = Array.isArray(list) ? list.filter((e) => e && NAME_RE.test(e.name) && /^\d{10}$/.test(e.code)) : []; rebuild(); },
  setMyUid(uid) { myUid = uid; rebuild(); },
  setMine(entry) { if (entry && NAME_RE.test(entry.name) && /^\d{10}$/.test(entry.code)) { myEntry = entry; saveMine(entry); $('createBtn').textContent = 'Edit my character'; rebuild(); } },
  getMine() { return myEntry; },
  bubble: showBubble,
  setDucked,
  setTvOn(on) { tvOn = !!on; },
  getMyState() { return myState; },
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
    if (!isMod && roomAt(camT.tx, camT.tz) === ROOMS.vip && !(follow && follow.mine)) setView('bar');
    updateRosterUI();
    if (!creatorEl.hidden && !formEl.hidden) renderOptions();
  },
  focusTv() { setView('tv'); },
  openCreator
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
