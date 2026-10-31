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

// ---------------------------------------------------------------- character looks
const LOOK = {
  jacket: [['Black', [30, 30, 32]], ['Olive', [54, 58, 38]], ['Charcoal', [56, 56, 58]], ['Brown', [64, 44, 30]], ['Navy', [30, 35, 48]], ['Oxblood', [62, 26, 24]]],
  pants: [['Black cargo', [44, 44, 43]], ['Jet black', [24, 24, 24]], ['Olive cargo', [62, 64, 44]], ['Urban gray', [78, 78, 78]]],
  skin: [['Pale', [232, 192, 164]], ['Light', [210, 162, 126]], ['Tan', [150, 102, 78]], ['Brown', [112, 74, 54]], ['Deep', [76, 50, 38]]],
  head: [['Shaved', 0], ['Short hair', 1], ['Beanie', 2], ['Cap', 3]],
  hair: [['Dark brown', [40, 28, 22]], ['Black', [18, 16, 16]], ['Blond', [170, 136, 80]], ['Ginger', [128, 60, 30]], ['Gray', [120, 118, 114]]],
  beard: [['None', 0], ['Stubble', 1], ['Full beard', 2]],
  eyes: [['Bare eyes', 0], ['Round glasses', 1], ['Shades', 2]],
  smoke: [['No smoke', 0], ['Cigarette', 1]],
  dance: [['Bounce', 0], ['Two-step', 1], ['Hands up', 2], ['Head nod', 3]],
  spot: [['Dance floor', 0], ['At the bar', 1], ['Lounge', 2]]
};
const KEYS = ['jacket', 'pants', 'skin', 'head', 'hair', 'beard', 'eyes', 'smoke', 'dance', 'spot'];
const LABELS = { jacket: 'Jacket', pants: 'Pants', skin: 'Skin', head: 'Head', hair: 'Hair color', beard: 'Beard', eyes: 'Eyes', smoke: 'Smoke', dance: 'Dance move', spot: 'Hangout' };

function lookToCode(l) { return KEYS.map((k) => l[k]).join(''); }
function codeToLook(c) {
  const l = {};
  KEYS.forEach((k, i) => { const d = parseInt(c[i], 10); l[k] = isNaN(d) ? 0 : d % LOOK[k].length; });
  return l;
}
function randomLook(r) { const l = {}; KEYS.forEach((k) => { l[k] = Math.floor(r() * LOOK[k].length); }); return l; }
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
  const SKIN = LOOK.skin[look.skin][1];
  const SKIN_SHAD = SKIN.map((v) => v * 0.83);
  const LIP = SKIN.map((v) => v * 0.72);
  const HAIR = LOOK.hair[look.hair][1];
  const JACKET = LOOK.jacket[look.jacket][1];
  const RIB = JACKET.map((v) => v * 0.6);
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
    P('head', loft(upper.map((p) => headRing(p, 0.0018, clamp[p[0]])), stub, { amt: 0.06, smooth: true, center: hc }));
  } else if (look.head === 1) {
    const c2 = Object.assign({}, clamp, { 1.738: 0.06, 1.762: 0.095 });
    P('head', loft(upper.map((p) => headRing(p, 0.008, c2[p[0]])), HAIR, { amt: 0.08, smooth: true, center: hc }));
  } else if (look.head === 2) {
    const BEANIE = JACKET.map((v, i) => Math.min(255, v * 1.25 + [8, 6, 4][i]));
    const rings = PROFILE.slice(9).map((p) => headRing(p, 0.013, p[0] < 1.72 ? -0.02 : null));
    rings.push(headRing([1.848, 0.012, 0.01, 0.014, -0.016], 0));
    P('head', loft(rings, BEANIE, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([headRing(PROFILE[10], 0.017), headRing(PROFILE[11], 0.016)], BEANIE.map((v) => v * 0.8), { amt: 0.04, smooth: true, center: hc }));
    P('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), SKIN.map((v) => v * 0.5), { amt: 0.05, smooth: true, center: hc }));
  } else {
    const CAP = JACKET.map((v) => Math.min(255, v * 1.3));
    P('head', loft(PROFILE.slice(10).map((p) => headRing(p, 0.01)), CAP, { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([rring(1.755, 0.15, 0.09, 0, 0.125, 10, 2.4), rring(1.762, 0.15, 0.09, 0, 0.13, 10, 2.4)], CAP.map((v) => v * 0.85), { amt: 0.04 }));
    P('head', loft(upper.slice(0, 5).map((p) => headRing(p, 0.0018, clamp[p[0]])), HAIR, { amt: 0.06, smooth: true, center: hc }));
  }
  if (look.beard === 2) {
    P('head', loft(PROFILE.slice(0, 6).map((p, i) => headRing(p, 0.0075 * (1 - 0.7 * i / 5))), HAIR.map((v) => v * 1.1 + 4), { amt: 0.05, smooth: true, center: hc }));
    P('head', loft([rring(1.622, 0.07, 0.016, 0, 0.098, 8), rring(1.636, 0.05, 0.014, 0, 0.104, 8)], HAIR, { amt: 0.03, smooth: true }));
  } else if (look.beard === 1) {
    P('head', loft(PROFILE.slice(0, 6).map((p) => headRing(p, 0.0016)), SKIN.map((v, i) => v * 0.55 + HAIR[i] * 0.15), { amt: 0.05, smooth: true, center: hc }));
  }
  P('head', loft([rring(1.606, 0.04, 0.012, 0, 0.099, 8), rring(1.613, 0.044, 0.012, 0, 0.101, 8)], LIP, { amt: 0.03, smooth: true }));
  P('head', loft([rring(1.722, 0.020, 0.014, 0, 0.100, 8), rring(1.700, 0.022, 0.020, 0, 0.108, 8), rring(1.676, 0.026, 0.028, 0, 0.114, 8),
    rring(1.658, 0.034, 0.034, 0, 0.117, 8), rring(1.646, 0.044, 0.032, 0, 0.114, 8), rring(1.639, 0.030, 0.020, 0, 0.108, 8)], SKIN, { amt: 0.03, smooth: true }));
  for (const s of [-1, 1]) P('head', tube([V(s * 0.093, 1.682, 0.004), V(s * 0.110, 1.684, -0.004)], [0.026, 0.022], SKIN_SHAD, { n: 10 }));
  if (look.eyes === 0) {
    for (const s of [-1, 1]) P('head', box(s * 0.042 - 0.011, s * 0.042 + 0.011, 1.684, 1.695, 0.088, 0.0985, [14, 11, 10], 0.02));
  } else {
    for (const s of [-1, 1]) {
      const cx = s * 0.043;
      P('head', cyl(V(cx, 1.69, 0.108), V(cx, 1.69, 0.1135), 0.034, 0.034, RIM, { n: 14, amt: 0.02 }));
      P('head', cyl(V(cx, 1.69, 0.109), V(cx, 1.69, 0.1165), 0.0285, 0.0285, LENS, { n: 14, amt: 0.03 }));
      P('head', box(cx - 0.016 + s * 0.004, cx - 0.004 + s * 0.004, 1.698, 1.708, 0.1165, 0.1172, LENS_HI, 0.02));
      P('head', box(s * 0.077 - 0.004, s * 0.077 + 0.004, 1.692, 1.699, 0.06, 0.112, RIM, 0.02));
      P('head', box(s * 0.1015 - 0.003, s * 0.1015 + 0.003, 1.692, 1.699, -0.03, 0.065, RIM, 0.02));
    }
    P('head', box(-0.012, 0.012, 1.696, 1.703, 0.112, 0.118, RIM, 0.02));
  }
  const ember = [];
  if (look.smoke) {
    const m = V(0.026, 1.609, 0.100), d = norm(V(0.38, -0.30, 1.0));
    P('head', cyl(sub(m, mul(d, 0.004)), add(m, mul(d, 0.026)), 0.0058, 0.0058, [176, 120, 66], { amt: 0.02 }));
    P('head', cyl(add(m, mul(d, 0.026)), add(m, mul(d, 0.084)), 0.0055, 0.0055, [222, 216, 200], { amt: 0.02 }));
    ember.push(cyl(add(m, mul(d, 0.084)), add(m, mul(d, 0.093)), 0.0057, 0.0045, [255, 104, 28], { amt: 0 }));
  }

  // pelvis, belt
  P('hips', loft([rring(0.84, 0.30, 0.20, 0, 0.005, 14), rring(0.92, 0.345, 0.222, 0, 0, 14), rring(1.0, 0.34, 0.22, 0, 0, 14)], CARGO, { smooth: true }));
  P('hips', loft([rring(0.945, 0.352, 0.232, 0, 0, 14), rring(0.99, 0.355, 0.234, 0, 0, 14)], WEB, { amt: 0.03 }));
  P('hips', box(-0.032, 0.032, 0.94, 0.995, 0.112, 0.124, GUN, 0.03));

  // legs
  for (const s of [-1, 1]) {
    const th = s > 0 ? 'thL' : 'thR', kn = s > 0 ? 'knL' : 'knR';
    P(th, tube([V(s * 0.10, 0.97, 0), V(s * 0.104, 0.72, 0.004), V(s * 0.106, 0.48, 0.008)], [0.08, 0.076, 0.066], CARGO, { n: 10 }));
    P(th, box(s * 0.176 - 0.011, s * 0.176 + 0.011, 0.60, 0.73, -0.042, 0.042, CARGO_D, 0.04));
    P(th, box(s * 0.178 - 0.013, s * 0.178 + 0.013, 0.715, 0.75, -0.046, 0.046, CARGO, 0.04));
    P(kn, tube([V(s * 0.106, 0.52, 0.008), V(s * 0.108, 0.32, 0), V(s * 0.11, 0.22, 0)], [0.066, 0.063, 0.062], CARGO, { n: 10 }));
    P(kn, box(s * 0.106 - 0.045, s * 0.106 + 0.045, 0.44, 0.56, 0.05, 0.073, CARGO_D, 0.04));
    P(kn, cyl(V(s * 0.11, 0.23, 0), V(s * 0.11, 0.29, 0), 0.072, 0.066, CARGO_D, { n: 10, smooth: true }));
    P(kn, cyl(V(s * 0.11, 0.07, 0), V(s * 0.11, 0.25, 0), 0.068, 0.065, BOOT, { n: 10 }));
    P(kn, loft([rring(0.022, 0.118, 0.29, s * 0.11, 0.035, 12, 3.5), rring(0.07, 0.122, 0.285, s * 0.11, 0.037, 12, 3.5),
      rring(0.105, 0.112, 0.22, s * 0.11, 0.012, 12, 3), rring(0.13, 0.10, 0.15, s * 0.11, -0.002, 12, 2.6)], BOOT));
    P(kn, loft([rring(0.0, 0.124, 0.298, s * 0.11, 0.035, 12, 3.5), rring(0.024, 0.124, 0.298, s * 0.11, 0.035, 12, 3.5)], SOLE, { amt: 0.03 }));
    P(kn, box(s * 0.11 - 0.016, s * 0.11 + 0.016, 0.10, 0.24, 0.06, 0.07, WEB, 0.04));
  }

  // torso
  P('spine', cyl(V(0, 1.43, -0.006), V(0, 1.585, -0.01), 0.056, 0.054, SKIN_SHAD, { n: 12, smooth: true }));
  P('spine', loft([rring(0.985, 0.336, 0.218, 0, 0, 14), rring(1.04, 0.342, 0.222, 0, 0, 14)], RIB, { amt: 0.03, smooth: true }));
  P('spine', loft([rring(1.035, 0.356, 0.234, 0, 0.002, 14), rring(1.10, 0.368, 0.238, 0, 0.004, 14), rring(1.20, 0.38, 0.24, 0, 0.005, 14),
    rring(1.30, 0.41, 0.24, 0, 0, 14), rring(1.38, 0.435, 0.238, 0, -0.003, 14), rring(1.44, 0.40, 0.222, 0, -0.006, 14),
    rring(1.475, 0.25, 0.17, 0, -0.01, 14)], JACKET, { smooth: true }));
  P('spine', loft([rring(1.44, 0.17, 0.152, 0, -0.008, 14), rring(1.475, 0.165, 0.148, 0, -0.009, 14), rring(1.51, 0.152, 0.138, 0, -0.01, 14)], RIB, { cap: false, amt: 0.03, smooth: true }));
  P('spine', tube([V(0, 0.99, 0.113), V(0, 1.05, 0.12), V(0, 1.15, 0.122), V(0, 1.27, 0.123), V(0, 1.37, 0.12), V(0, 1.445, 0.106), V(0, 1.49, 0.07)], [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005], ZIP, { n: 4, smooth: false }));
  for (const s of [-1, 1]) P('spine', box(s * 0.11 - 0.006, s * 0.11 + 0.006, 1.08, 1.17, 0.112, 0.124, RIB, 0.03));

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
  P('shL', box(0.333, 0.35, 1.215, 1.30, -0.032, 0.018, RIB, 0.03));
  return { B, ember };
}

function getGeos(look, seed) {
  const key = lookToCode(look) + ':' + seed;
  if (geoCache.has(key)) return geoCache.get(key);
  const { B, ember } = buildParts(look, seed);
  const geos = {};
  for (const k in B) geos[k] = toGeometry(B[k], PIV[k]);
  geos.ember = ember.length ? toGeometry(ember, PIV.head) : null;
  geoCache.set(key, geos);
  return geos;
}

const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a1c });
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
    bones[k] = g;
    (par ? bones[par] : root).add(g);
  }
  let ember = null;
  if (geos.ember) { ember = new THREE.Mesh(geos.ember, emberMat); bones.head.add(ember); }
  let tag = null;
  if (name) { tag = makeTag(name); tag.position.set(0, 0.42, 0); bones.head.add(tag); }
  return { root, bones, ember, tag, look, name, seed };
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
  } else if (act === 'bartend') {
    const w = t * 2.2;
    b.spine.rotation.x = 0.12;
    b.shR.rotation.x = -0.95 + 0.12 * Math.sin(w); b.shR.rotation.z = 0.15 * Math.cos(w); b.elR.rotation.x = -0.75;
    b.shL.rotation.x = -0.6; b.elL.rotation.x = -1.2; b.shL.rotation.z = -0.15;
    b.head.rotation.x = 0.1 + 0.06 * Math.abs(Math.sin(PI * beat)); b.head.rotation.y = 0.3 * Math.sin(t * 0.4);
  }
}

// ---------------------------------------------------------------- scene
const canvas = document.getElementById('c');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x070606, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x070606, 7, 17);
const camera = new THREE.PerspectiveCamera(46, 1, 0.15, 40);

scene.add(new THREE.HemisphereLight(0x6e655d, 0x0c0908, 0.5));
const barLights = [];
for (const x of [-2, 0, 2]) {
  const l = new THREE.PointLight(0xffa860, 1.15, 5.5, 1.6); l.position.set(x, 2.5, -2.6); scene.add(l); barLights.push(l);
}
const danceLight = new THREE.PointLight(0xff3020, 1.6, 6.5, 1.4); danceLight.position.set(1.4, 2.6, 1.0); scene.add(danceLight);
const neonLight = new THREE.PointLight(0xff2a2a, 0.9, 4.5, 1.6); neonLight.position.set(0, 2.5, -3.6); scene.add(neonLight);
const jukeLight = new THREE.PointLight(0xffb040, 0.7, 2.8, 1.6); jukeLight.position.set(-4.2, 1.2, -1.6); scene.add(jukeLight);
const lampLight = new THREE.PointLight(0xffc890, 0.8, 3.6, 1.6); lampLight.position.set(-3.4, 1.9, 2.0); scene.add(lampLight);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.encoding = THREE.sRGBEncoding;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rr = rngFrom(42);
const floorTex = canvasTex(32, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = ((i >> 3) + (j >> 3)) % 2 ? 30 : 22, n = rr() * 7;
    x.fillStyle = `rgb(${v + n + 2},${v + n},${v + n - 3})`; x.fillRect(i, j, 1, 1);
  }
}, [10, 8]);
const wallTex = canvasTex(32, 64, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const plank = Math.floor(i / 8), seam = i % 8 === 0;
    const v = seam ? 10 : 26 + (plank * 37 % 7) + rr() * 6;
    x.fillStyle = `rgb(${v + 6},${v + 2},${v - 2})`; x.fillRect(i, j, 1, 1);
  }
  x.fillStyle = 'rgb(14,11,9)'; x.fillRect(0, 40, w, 2);
}, [8, 1]);

const roomMat = ps1(new THREE.MeshLambertMaterial({ vertexColors: true }));
function addStatic(parts) { const m = new THREE.Mesh(toGeometry(parts), roomMat); scene.add(m); return m; }
function plane(w, h, mat, segW, segH) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h, segW || 8, segH || 4), mat); }

// floor + walls (walls face inward so the camera can see in from outside)
const floor = plane(10, 8, ps1(new THREE.MeshLambertMaterial({ map: floorTex })), 20, 16);
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const wallMat = ps1(new THREE.MeshLambertMaterial({ map: wallTex }));
const wb = plane(10, 3.2, wallMat, 20, 6); wb.position.set(0, 1.6, -4); scene.add(wb);
const wl = plane(8, 3.2, wallMat, 16, 6); wl.position.set(-5, 1.6, 0); wl.rotation.y = Math.PI / 2; scene.add(wl);
const wr = plane(8, 3.2, wallMat, 16, 6); wr.position.set(5, 1.6, 0); wr.rotation.y = -Math.PI / 2; scene.add(wr);

RNG = rngFrom(7);
const WOOD = [56, 36, 24], WOOD_D = [34, 22, 15], METAL = [62, 62, 64], LEATHER = [44, 16, 14], CHROME = [120, 120, 124];
const S = [];
// bar counter
S.push(box(-3, 3, 0, 1.0, -3.0, -2.6, WOOD_D));
S.push(box(-3.1, 3.1, 1.0, 1.06, -3.05, -2.5, WOOD));
S.push(box(-3, 3, 0.18, 0.22, -2.62, -2.56, CHROME, 0.02));
// back shelves + bottles
for (const y of [1.25, 1.65]) S.push(box(-2.8, 2.8, y, y + 0.04, -3.98, -3.72, WOOD));
S.push(box(-2.9, 2.9, 0, 1.0, -3.98, -3.6, WOOD_D));
const BOTTLES = [[40, 80, 40], [90, 50, 20], [130, 120, 100], [30, 50, 70], [110, 30, 30], [60, 40, 20]];
for (const y of [1.29, 1.69]) for (let x = -2.65; x < 2.7; x += 0.17 + rr() * 0.08) {
  const c = BOTTLES[Math.floor(rr() * BOTTLES.length)], h = 0.2 + rr() * 0.1;
  S.push(cyl(V(x, y, -3.85), V(x, y + h, -3.85), 0.035, 0.03, c, { n: 6 }));
  S.push(cyl(V(x, y + h, -3.85), V(x, y + h + 0.07, -3.85), 0.012, 0.012, c, { n: 5 }));
}
// stools
const STOOLS = [];
for (let i = 0; i < 7; i++) {
  const x = -2.5 + i * (5 / 6);
  STOOLS.push([x, -2.15]);
  S.push(cyl(V(x, 0, -2.15), V(x, 0.03, -2.15), 0.2, 0.2, METAL, { n: 8 }));
  S.push(cyl(V(x, 0.03, -2.15), V(x, 0.68, -2.15), 0.03, 0.03, CHROME, { n: 6 }));
  S.push(cyl(V(x, 0.3, -2.15), V(x, 0.32, -2.15), 0.15, 0.15, CHROME, { n: 8 }));
  S.push(cyl(V(x, 0.68, -2.15), V(x, 0.76, -2.15), 0.19, 0.19, LEATHER, { n: 10 }));
}
// glasses on the counter
for (let i = 0; i < 9; i++) { const x = -2.7 + rr() * 5.4; S.push(cyl(V(x, 1.06, -2.75), V(x, 1.17, -2.75), 0.035, 0.04, [150, 150, 140], { n: 6, amt: 0.1 })); }
// jukebox
S.push(box(-4.95, -4.45, 0, 1.25, -2.0, -1.2, [60, 30, 22]));
S.push(cyl(V(-4.7, 1.25, -2.0), V(-4.7, 1.25, -1.2), 0.25, 0.25, [60, 30, 22], { n: 10 }));
// lounge: booth + table
S.push(box(-4.95, -4.4, 0, 0.45, 0.8, 3.2, LEATHER));
S.push(box(-4.98, -4.82, 0.45, 1.15, 0.8, 3.2, LEATHER));
S.push(cyl(V(-3.6, 0, 2.0), V(-3.6, 0.72, 2.0), 0.05, 0.05, METAL, { n: 6 }));
S.push(cyl(V(-3.6, 0.72, 2.0), V(-3.6, 0.76, 2.0), 0.5, 0.5, WOOD, { n: 10 }));
S.push(cyl(V(-3.6, 0, 2.0), V(-3.6, 0.03, 2.0), 0.28, 0.28, METAL, { n: 8 }));
S.push(cyl(V(-3.5, 0.76, 1.9), V(-3.5, 0.82, 1.9), 0.06, 0.04, [70, 70, 72], { n: 8 }));
S.push(cyl(V(-3.4, 0.76, 2.2), V(-3.4, 1.0, 2.2), 0.012, 0.012, METAL, { n: 5 }));
S.push(cyl(V(-3.4, 1.0, 2.2), V(-3.4, 1.12, 2.2), 0.08, 0.12, [140, 110, 70], { n: 8 }));
// speakers by the dance floor
for (const z of [-1.6, 3.4]) {
  S.push(box(3.9, 4.6, 0, 1.3, z - 0.35, z + 0.35, [18, 18, 19]));
  S.push(cyl(V(3.88, 0.4, z), V(3.86, 0.4, z), 0.22, 0.22, [40, 40, 42], { n: 10 }));
  S.push(cyl(V(3.88, 0.95, z), V(3.86, 0.95, z), 0.13, 0.13, [40, 40, 42], { n: 10 }));
}
// ceiling lamp shades over the bar
for (const x of [-2, 0, 2]) {
  S.push(cyl(V(x, 3.2, -2.6), V(x, 2.62, -2.6), 0.01, 0.01, [20, 20, 20], { n: 4 }));
  S.push(cyl(V(x, 2.62, -2.6), V(x, 2.5, -2.6), 0.06, 0.2, [150, 110, 60], { n: 8 }));
}
addStatic(S);

// jukebox face, neon sign (unlit, glowing)
const jukeFace = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.7), new THREE.MeshBasicMaterial({ map: canvasTex(16, 18, (x) => {
  x.fillStyle = '#2a120c'; x.fillRect(0, 0, 16, 18);
  for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#ffb040' : '#ff6a1c'; x.fillRect(2, 2 + i * 2, 12, 1); }
  x.fillStyle = '#ffd890'; x.fillRect(4, 16, 8, 1);
}) }));
jukeFace.position.set(-4.44, 0.85, -1.6); jukeFace.rotation.y = Math.PI / 2; scene.add(jukeFace);

const neonCanvas = document.createElement('canvas'); neonCanvas.width = 256; neonCanvas.height = 64;
const neonTex = new THREE.CanvasTexture(neonCanvas); neonTex.magFilter = THREE.NearestFilter; neonTex.minFilter = THREE.NearestFilter; neonTex.encoding = THREE.sRGBEncoding;
function drawNeon(on) {
  const x = neonCanvas.getContext('2d');
  x.clearRect(0, 0, 256, 64);
  x.font = '54px ' + tagFont; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = on ? '#ff2a2a' : 'transparent'; x.shadowBlur = on ? 10 : 0;
  x.fillStyle = on ? '#ff6a5a' : '#3a1414'; x.fillText("SH1DEN'S", 128, 34);
  neonTex.needsUpdate = true;
}
drawNeon(true);
const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true }));
neon.position.set(0, 2.5, -3.96); scene.add(neon);

// big TV on the right wall: a black screen in 3D, with the YouTube player laid over it in CSS 3D
const TV = { y: 2.05, z: 0.9, w: 2.4, h: 1.35 };
addStatic([box(4.93, 5.0, TV.y - TV.h / 2 - 0.07, TV.y + TV.h / 2 + 0.07, TV.z - TV.w / 2 - 0.07, TV.z + TV.w / 2 + 0.07, [20, 20, 22], 0.03),
  box(4.96, 5.0, TV.y - TV.h / 2 - 0.3, TV.y - TV.h / 2 - 0.07, TV.z - 0.06, TV.z + 0.06, [30, 30, 32], 0.03)]);
const tvGlass = new THREE.Mesh(new THREE.PlaneGeometry(TV.w, TV.h), new THREE.MeshBasicMaterial({ color: 0x050506 }));
tvGlass.position.set(4.925, TV.y, TV.z); tvGlass.rotation.y = -Math.PI / 2; scene.add(tvGlass);
const tvLight = new THREE.PointLight(0x9aa6ff, 0, 3.8, 1.6); tvLight.position.set(4.3, TV.y, TV.z); scene.add(tvLight);
let tvOn = false, cssRenderer = null, cssScene = null;
if (THREE.CSS3DRenderer && document.getElementById('tvScreen')) {
  cssScene = new THREE.Scene();
  cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.domElement.className = 'css3d';
  stage.insertBefore(cssRenderer.domElement, canvas.nextSibling);
  const el = document.getElementById('tvScreen');
  const obj = new THREE.CSS3DObject(el);
  el.style.pointerEvents = 'none';
  obj.position.set(4.918, TV.y, TV.z); obj.rotation.y = -Math.PI / 2; obj.scale.setScalar(TV.w / 960);
  cssScene.add(obj);
}

// dance floor tiles
const DF = { x: 1.6, z: 1.0, n: 4, s: 0.75 };
const tiles = [];
const TILE_COL = [new THREE.Color(0x5a0e0a), new THREE.Color(0x8a4a10), new THREE.Color(0x3a3a3e), new THREE.Color(0x24120e)];
for (let i = 0; i < DF.n; i++) for (let j = 0; j < DF.n; j++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(DF.s - 0.04, DF.s - 0.04),
    new THREE.MeshBasicMaterial({ color: 0x220a08, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 }));
  m.renderOrder = 1;
  m.rotation.x = -Math.PI / 2;
  m.position.set(DF.x + (i - 1.5) * DF.s, 0.012, DF.z + (j - 1.5) * DF.s);
  scene.add(m); tiles.push({ m, i, j });
}

// ---------------------------------------------------------------- smoke particles
const SMAX = 900;
const sPos = new Float32Array(SMAX * 3).fill(-99);
const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const smoke = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0x8c8780, size: 0.016, transparent: true, opacity: 0.35, depthWrite: false }));
smoke.frustumCulled = false; scene.add(smoke);

// ---------------------------------------------------------------- crowd
const HOST_LOOK = { jacket: 0, pants: 0, skin: 2, head: 0, hair: 0, beard: 2, eyes: 1, smoke: 1, dance: 3, spot: 1 };
const crowd = [];
const tmpV = new THREE.Vector3();

const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const LOUNGE = [[-4.8, -0.85, Math.PI / 2], [-4.8, -0.2, Math.PI / 2], [-4.8, 0.45, Math.PI / 2],
  [-2.95, 2.45, yawTo(-2.95, 2.45, -3.6, 2.0)], [-3.05, 1.35, yawTo(-3.05, 1.35, -3.6, 2.0)], [-3.6, 2.95, Math.PI], [4.8, 0.9, -Math.PI / 2]];
function slotsFor(spot, idx, rand) {
  if (spot === 1 && idx < STOOLS.length) { const s = STOOLS[idx]; return { act: 'sit', x: s[0], z: s[1] + 0.06, yaw: Math.PI }; }
  if (spot === 2 && idx < LOUNGE.length) { const a = LOUNGE[idx]; return { act: 'lean', x: a[0], z: a[1], yaw: a[2] }; }
  if (idx < 16 || spot === 0) {
    const k = idx % 16, i = k % 4, j = Math.floor(k / 4);
    const ring = Math.floor(idx / 16);
    if (ring === 0) return { act: 'dance', x: DF.x + (i - 1.5) * DF.s + (rand() - 0.5) * 0.2, z: DF.z + (j - 1.5) * DF.s + (rand() - 0.5) * 0.2, yaw: (rand() - 0.5) * 1.6 };
  }
  const a = idx * 2.4, r = 2.0 + (idx % 3) * 0.45;
  return { act: 'dance', x: DF.x + Math.cos(a) * r * 0.7, z: DF.z + Math.sin(a) * r * 0.6, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
}

function placeAll() {
  const counts = [0, 0, 0];
  for (const ch of crowd) {
    if (ch.host || ch === draftChar) continue;
    let spot = ch.look.spot;
    if (spot === 1 && counts[1] >= STOOLS.length) spot = 0;
    if (spot === 2 && counts[2] >= LOUNGE.length) spot = 0;
    const r = rngFrom(ch.seed + 99);
    const s = slotsFor(spot, counts[spot]++, r);
    ch.act = s.act; ch.root.position.set(s.x, 0, s.z); ch.root.rotation.y = s.yaw;
  }
}

function clearCrowd() { for (const ch of crowd) scene.remove(ch.root); crowd.length = 0; }
function addChar(look, name, opts) {
  opts = opts || {};
  const seed = hashStr(name || 'npc');
  const ch = makeCharacter(look, name, seed);
  ch.phase = (seed % 1000) / 1000;
  ch.host = !!opts.host; ch.mine = !!opts.mine; ch.uid = opts.uid || null;
  if (opts.mine && ch.tag) { ch.bones.head.remove(ch.tag); ch.tag = makeTag(name + ' (you)', '#ff8a5a'); ch.tag.position.set(0, 0.42, 0); ch.bones.head.add(ch.tag); }
  scene.add(ch.root); crowd.push(ch);
  return ch;
}

let roster = [];
let myEntry = null, myUid = null;
const HOST_NAME = 'sh1denfps';
function rebuild() {
  const keepDraft = draftChar;
  clearCrowd();
  const host = addChar(HOST_LOOK, HOST_NAME, { host: true });
  host.act = 'bartend'; host.root.position.set(0.4, 0, -3.35); host.root.rotation.y = 0;
  const seen = new Set([HOST_NAME.toLowerCase()]);
  let haveMine = false;
  for (const e of roster.slice(-80)) {
    const key = e.name.toLowerCase();
    if (key === HOST_NAME.toLowerCase()) { host.uid = e.uid; if (myUid && e.uid === myUid) { host.mine = true; haveMine = true; } continue; }
    if (seen.has(key)) continue; seen.add(key);
    const mine = myUid ? e.uid === myUid : !!(myEntry && myEntry.name.toLowerCase() === key);
    if (mine) haveMine = true;
    addChar(codeToLook(e.code), e.name, { mine, uid: e.uid });
  }
  if (myEntry && !haveMine && !seen.has(myEntry.name.toLowerCase())) addChar(codeToLook(myEntry.code), myEntry.name, { mine: true, uid: myUid });
  placeAll();
  if (keepDraft) { scene.add(keepDraft.root); crowd.push(keepDraft); }
  updateRosterUI();
}

// ---------------------------------------------------------------- music (original tracks, Web Audio)
// Four original loops. The jukebox rotates them every 48 bars unless a visitor picks one.
const TRACKS = [
  { name: 'Last Call', bpm: 108, swing: 0, prog: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [40, 44, 47]] },   // Am Am F E
  { name: 'Neon Rain', bpm: 92, swing: 0, prog: [[38, 41, 45], [34, 38, 41], [36, 40, 43], [33, 36, 40]] },    // Dm Bb C Am
  { name: 'Static Floor', bpm: 124, swing: 0, prog: [[40, 43, 47], [40, 43, 47], [36, 40, 43], [38, 42, 45]] }, // Em Em C D
  { name: 'Dust Room', bpm: 84, swing: 0.2, prog: [[41, 45, 48, 52], [40, 43, 47, 50], [38, 41, 45, 48], [43, 47, 50, 53]] } // Fmaj7 Em7 Dm7 G7
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
  // Last Call: driving dark house
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0 && sec !== 3) kick(t);
    if (s % 4 === 2) noise(t, 7000, 0.7, 0.16, 0.05);
    if (s % 2 === 1 && sec >= 1) noise(t, 9000, 0.7, 0.05, 0.025);
    if ((s === 4 || s === 12) && sec !== 0) noise(t, 1600, 0.8, 0.22, 0.14, 'bandpass');
    if (s % 4 === 2 || s === 15) tone(t, ch[0] - 12, st * 1.6, 'sawtooth', 0.22, 380 + 120 * Math.sin(bar), 0);
    if (s === 0) for (const n of ch) { tone(t, n + 12, SPB * 4, 'sawtooth', 0.035, 900, -7); tone(t, n + 12, SPB * 4, 'sawtooth', 0.035, 900, 7); }
    if (sec >= 2 && s % 2 === 0) tone(t, ch[ARP[(s / 2) % 8]] + 24, st * 1.5, 'square', 0.04, 2200, 0);
  },
  // Neon Rain: slow, wide pads, glassy bells
  function (t, s, bar, ch, sec, st) {
    if (s === 0 || s === 10) kick(t, 0.75, true);
    if (s === 8 && sec !== 0) noise(t, 2200, 0.6, 0.18, 0.22, 'bandpass');
    if (s % 4 === 2 && sec >= 1) noise(t, 8000, 0.7, 0.06, 0.04);
    if (s === 0) {
      for (const n of ch) { tone(t, n + 12, SPB * 4.2, 'sawtooth', 0.03, 700, -10, 0.6); tone(t, n + 12, SPB * 4.2, 'triangle', 0.04, 1200, 9, 0.6); }
      tone(t, ch[0] - 12, SPB * 3.5, 'sine', 0.28, 300, 0, 0.02);
    }
    if (sec >= 1 && (s === 3 || s === 6 || s === 11 || s === 14)) tone(t, ch[(s + bar) % 3] + 24 + (s === 14 ? 12 : 0), st * 6, 'triangle', 0.05, 4000, 0);
  },
  // Static Floor: fast, rolling bass, open hats
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0 && !(sec === 3 && bar % 8 >= 6)) kick(t, 0.95);
    if (s % 4 === 2) noise(t, 6000, 0.8, 0.14, 0.12);
    if (s % 2 === 1) noise(t, 10000, 0.7, 0.04, 0.02);
    if (s % 8 === 4 && sec >= 1) noise(t, 1400, 0.9, 0.2, 0.12, 'bandpass');
    if (s % 4 !== 0) tone(t, ch[0] - 12 + (s % 4 === 3 ? 12 : 0), st * 0.9, 'sawtooth', 0.16, 300 + 500 * ((bar % 4) / 4), 0);
    if (s === 0 && sec >= 1) for (const n of ch) tone(t, n + 12, SPB * 2, 'square', 0.025, 1400, 5);
    if (sec >= 2 && s % 2 === 1) tone(t, ch[ARP[(s + bar) % 8]] + 24, st * 0.8, 'sawtooth', 0.035, 3000, 0);
  },
  // Dust Room: lo-fi, swung, warm keys with crackle
  function (t, s, bar, ch, sec, st) {
    if (s === 0 || s === 11) kick(t, 0.7, true);
    if (s === 4 || s === 12) noise(t, 1800, 0.7, 0.16, 0.16, 'bandpass');
    if (s % 2 === 0) noise(t, 7500, 0.7, 0.045, 0.03);
    if (s % 4 === 1) noise(t, 3000, 0.5, 0.012, 0.01);
    if (s === 0 || s === 7) for (const n of ch) tone(t, n + 12, SPB * 1.6, 'triangle', 0.05, 1600, 3, 0.02);
    if (s === 0) tone(t, ch[0] - 12, SPB * 2, 'sine', 0.3, 260, 0);
    if (s === 10) tone(t, ch[2] - 12, SPB * 1, 'sine', 0.22, 260, 0);
    if (sec >= 2 && (s === 2 || s === 9 || s === 14)) tone(t, ch[(s + bar) % 4] + 24, st * 3, 'sine', 0.04, 3000, 0);
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
    const t = nextStep + (s % 2 === 1 ? tr.swing * st : 0);
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
const VIEWS = { room: { tx: 0, ty: 1.1, tz: 0.2, d: 9.2, yaw: 0.0, pitch: 0.42 }, bar: { tx: 0, ty: 1.25, tz: -2.6, d: 4.4, yaw: 0.25, pitch: 0.2 }, dance: { tx: 1.6, ty: 1.0, tz: 1.0, d: 5.2, yaw: -0.4, pitch: 0.3 }, lounge: { tx: -3.8, ty: 1.0, tz: 1.2, d: 4.6, yaw: 0.9, pitch: 0.25 }, tv: { tx: 4.9, ty: 1.95, tz: 0.9, d: 4.0, yaw: -Math.PI / 2, pitch: 0.06 } };
let cam = Object.assign({}, VIEWS.room), camT = Object.assign({}, VIEWS.room), follow = null;
function setView(name) { follow = null; Object.assign(camT, VIEWS[name]); }
function focusChar(ch) { follow = ch; camT.d = 2.3; camT.pitch = 0.12; camT.yaw = ch.root.rotation.y + (ch.act === 'sit' ? 0.6 : 0); }
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  camT.yaw -= (e.clientX - drag.x) * 0.006;
  camT.pitch = Math.max(0.02, Math.min(1.2, camT.pitch + (e.clientY - drag.y) * 0.004));
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); camT.d = Math.max(1.2, Math.min(14, camT.d * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
let pinch = null;
canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2) { pinch = null; return; }
  const dd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (pinch) camT.d = Math.max(1.2, Math.min(14, camT.d * pinch / dd));
  pinch = dd;
});

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
  }

  // lights + floor on the beat
  const bi = Math.floor(beat), bf = beat - bi;
  const pulse = Math.pow(1 - bf, 3);
  for (const tl of tiles) {
    const c = TILE_COL[(tl.i + tl.j + Math.floor(bi / 2)) % 4];
    const on = ((tl.i * 3 + tl.j * 5 + bi) % 3) === 0;
    tl.m.material.color.copy(c).multiplyScalar(on ? 0.6 + 0.8 * pulse : 0.25);
  }
  const hue = [0xff3020, 0xff8a20, 0xb0b0c0, 0xff3020][Math.floor(bi / 8) % 4];
  danceLight.color.setHex(hue); danceLight.intensity = 0.9 + 1.2 * pulse;
  const flick = Math.sin(t * 13) > 0.97 ? 0.3 : 1;
  neonLight.intensity = 0.9 * flick;
  if ((flick < 1) !== tick.off) { tick.off = flick < 1; drawNeon(!tick.off); }
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
    for (let k = 0; k < 18 && si < SMAX; k++, si++) {
      const L = ((t * 0.3 + k / 18 + ch.phase) % 1);
      sPos[si * 3] = tmpV.x + Math.sin(k * 2.39 + t * 0.8 + L * 4) * 0.035 * L + L * 0.04;
      sPos[si * 3 + 1] = tmpV.y + L * 0.45;
      sPos[si * 3 + 2] = tmpV.z + Math.cos(k * 1.7 + t * 0.6) * 0.035 * L;
    }
  }
  for (let k = si; k < sHead; k++) sPos[k * 3 + 1] = -99;
  sHead = si; sGeo.attributes.position.needsUpdate = true;

  // camera
  if (follow) {
    follow.bones.head.getWorldPosition(tmpV);
    camT.tx = tmpV.x; camT.ty = tmpV.y - 0.25; camT.tz = tmpV.z;
  }
  const k = Math.min(1, dt * 4);
  for (const key of ['tx', 'ty', 'tz', 'd', 'pitch']) cam[key] += (camT[key] - cam[key]) * k;
  let dy = camT.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.yaw += dy * k;
  camera.position.set(cam.tx + Math.sin(cam.yaw) * cam.d * Math.cos(cam.pitch), cam.ty + Math.sin(cam.pitch) * cam.d, cam.tz + Math.cos(cam.yaw) * cam.d * Math.cos(cam.pitch));
  camera.lookAt(cam.tx, cam.ty, cam.tz);
  renderer.render(scene, camera);
  if (cssRenderer) cssRenderer.render(cssScene, camera);
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
function updateRosterUI() {
  const people = crowd.filter((c) => !c.host && c !== draftChar);
  $('count').textContent = people.length === 1 ? '1 regular' : people.length + ' regulars';
  const ul = $('who'); ul.textContent = '';
  for (const ch of crowd) {
    if (ch === draftChar) continue;
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button';
    b.textContent = ch.name + (ch.host ? ' · host' : ch.mine ? ' · you' : '');
    b.onclick = () => focusChar(ch);
    li.appendChild(b); ul.appendChild(li);
  }
}

// speech bubbles over characters
function makeBubble(text) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const nxt = cur ? cur + ' ' + w : w;
    if (nxt.length > 24 && cur) { lines.push(cur); cur = w; } else cur = nxt;
    if (lines.length === 2) break;
  }
  if (lines.length < 2 && cur) lines.push(cur);
  if (lines.length === 2 && words.join(' ').length > lines.join(' ').length) lines[1] = lines[1].slice(0, 22) + '…';
  for (let i = 0; i < lines.length; i++) if (lines[i].length > 26) lines[i] = lines[i].slice(0, 25) + '…';
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = '26px ' + tagFont;
  const w = Math.ceil(Math.max(...lines.map((l) => x.measureText(l).width))) + 20, h = lines.length * 26 + 16;
  c.width = w; c.height = h + 8;
  x.fillStyle = 'rgba(236,228,214,0.95)'; x.fillRect(0, 0, w, h);
  x.beginPath(); x.moveTo(w / 2 - 7, h); x.lineTo(w / 2 + 7, h); x.lineTo(w / 2, h + 8); x.fill();
  x.font = '26px ' + tagFont; x.fillStyle = '#140f0c'; x.textBaseline = 'top';
  lines.forEach((l, i) => x.fillText(l, 10, 8 + i * 26));
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false }));
  sp.scale.set(w / (h + 8) * (0.12 * (h + 8) / 36), 0.12 * (h + 8) / 36, 1);
  return sp;
}
function showBubble(uid, text) {
  const ch = crowd.find((c) => c.uid && c.uid === uid);
  if (!ch) return;
  if (ch.bubble) { ch.bones.head.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble.material.dispose(); }
  ch.bubble = makeBubble(text);
  ch.bubble.position.set(0, 0.6, 0);
  ch.bones.head.add(ch.bubble);
  ch.bubbleUntil = clock.elapsedTime + 7;
}
function expireBubbles() {
  for (const ch of crowd) if (ch.bubble && clock.elapsedTime > ch.bubbleUntil) {
    ch.bones.head.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble.material.dispose(); ch.bubble = null;
  }
}

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
    prev.onclick = () => { draft[k] = (draft[k] + LOOK[k].length - 1) % LOOK[k].length; refreshDraft(); };
    next.onclick = () => { draft[k] = (draft[k] + 1) % LOOK[k].length; refreshDraft(); };
    row.append(lab, prev, val, next); box.appendChild(row);
  }
}
function removeDraft() {
  if (!draftChar) return;
  scene.remove(draftChar.root); const i = crowd.indexOf(draftChar); if (i >= 0) crowd.splice(i, 1); draftChar = null;
}
function refreshDraft() {
  renderOptions();
  removeDraft();
  const nm = $('nm').value.trim() || 'you';
  draftChar = makeCharacter(draft, nm, hashStr(nm.toLowerCase()));
  draftChar.phase = 0.3; draftChar.act = 'dance';
  draftChar.root.position.set(-1.9, 0, 1.6); draftChar.root.rotation.y = 0.35;
  scene.add(draftChar.root); crowd.push(draftChar);
  focusChar(draftChar);
}
function openCreator() {
  draft = myEntry ? codeToLook(myEntry.code) : randomLook(Math.random);
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
$('track').onclick = () => { pickTrack((trackIdx + 1) % TRACKS.length); };
for (const v of ['room', 'bar', 'dance', 'lounge', 'tv']) $('v-' + v).onclick = () => setView(v);
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
  focusTv() { setView('tv'); },
  openCreator
};

// ---------------------------------------------------------------- boot
myEntry = loadMine();
if (myEntry) $('createBtn').textContent = 'Edit my character';
updateTrackUI();
(document.fonts && document.fonts.load ? document.fonts.load('28px "VT323"').catch(() => { }) : Promise.resolve()).then(() => {
  drawNeon(true);
  rebuild();
  $('loading').hidden = true;
  if (window.NET && window.NET.start) window.NET.start();
});
tick();
})();
