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
      const c = p.cols[i];
      let lc = [s2l(c[0]), s2l(c[1]), s2l(c[2])];
      for (const v of t) {
        let n = fn[i];
        if (acc) n = norm(acc.get(v[0].toFixed(4) + ',' + v[1].toFixed(4) + ',' + v[2].toFixed(4)));
        // a part can shade itself per vertex (car paint: darker sills, lighter tops, a reflection line)
        if (p.shade) { const sc = p.shade(v, n, c); lc = [s2l(Math.min(255, sc[0])), s2l(Math.min(255, sc[1])), s2l(Math.min(255, sc[2]))]; }
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
// the tuxedo collection: earned with hours in the bar (gold can also be bought), any of them for hosts, ruby for the owner
const TUXES = {
  silver: { jacket: [196, 200, 210], pants: [170, 174, 186], shirt: [20, 20, 24], tie: [12, 12, 14], lapel: [120, 124, 136], square: [236, 236, 240], glow: 0xdfe8ff, spark: 0xffffff },
  gold: { jacket: [222, 178, 66], pants: [204, 160, 56], shirt: [22, 20, 18], tie: [10, 10, 12], lapel: [160, 120, 36], square: [250, 236, 190], glow: 0xffc860, spark: 0xffe6a0 },
  platinum: { jacket: [226, 228, 234], pants: [204, 206, 214], shirt: [28, 30, 36], tie: [180, 186, 200], lapel: [150, 154, 166], square: [200, 220, 255], glow: 0xe6f0ff, spark: 0xf4f8ff },
  emerald: { jacket: [22, 118, 70], pants: [16, 92, 54], shirt: [10, 14, 12], tie: [200, 170, 80], lapel: [10, 60, 36], square: [220, 196, 110], glow: 0x40ff9a, spark: 0xb0ffd8 },
  diamond: { jacket: [206, 236, 250], pants: [172, 212, 234], shirt: [18, 24, 32], tie: [240, 250, 255], lapel: [130, 180, 210], square: [255, 255, 255], glow: 0x9ae6ff, spark: 0xffffff },
  ruby: { jacket: [156, 12, 46], pants: [112, 8, 34], shirt: [16, 6, 10], tie: [22, 4, 10], lapel: [70, 4, 24], square: [255, 130, 180], glow: 0xb0102c, spark: 0xff4466 },
  midnight: { jacket: [52, 22, 104], pants: [36, 14, 76], shirt: [10, 8, 18], tie: [12, 6, 22], lapel: [24, 8, 52], square: [190, 150, 255], glow: 0x5020c0, spark: 0x9a6aff }
};
function costumeParts(k, C, P, O, F) {
  const hc = [0, 1.69, 0];
  const hat = (brimR, brimY, crownR, crownH, col, n) => { P('head', cyl(V(0, brimY, -0.005), V(0, brimY + 0.018, -0.005), brimR, brimR, col, { n: n || 14 })); P('head', cyl(V(0, brimY + 0.018, -0.005), V(0, brimY + 0.018 + crownH, -0.005), crownR, crownR * 0.9, col.map((v) => v * 0.9), { n: n || 12 })); };
  const mask = (col) => P('head', loft([rring(1.53, 0.18, 0.18, 0, 0, 14), rring(1.6, 0.27, 0.26, 0, 0.004, 14), rring(1.7, 0.29, 0.28, 0, 0.006, 14), rring(1.8, 0.26, 0.25, 0, 0, 14), rring(1.87, 0.17, 0.16, 0, -0.006, 14), rring(1.9, 0.06, 0.06, 0, -0.008, 14)], col, { smooth: true, amt: 0.03 }));
  if (k === 'trench') {
    // a long coat down to the shins, split at the back, with a turned-up collar
    P('hips', loft([rring(1.02, 0.39, 0.27, 0, 0, 14), rring(0.88, 0.41, 0.29, 0, 0, 14)], C.topc, { smooth: true, cap: false }));
    for (const sd of [-1, 1]) {
      const th = sd > 0 ? 'thL' : 'thR', kn = sd > 0 ? 'knL' : 'knR';
      P(th, loft([rring(0.92, 0.22, 0.29, sd * 0.11, 0, 12), rring(0.7, 0.24, 0.3, sd * 0.12, 0, 12), rring(0.5, 0.25, 0.31, sd * 0.125, 0, 12)], C.topc, { smooth: true, cap: false }));
      P(kn, loft([rring(0.52, 0.25, 0.31, sd * 0.125, 0.004, 12), rring(0.32, 0.26, 0.32, sd * 0.13, 0.004, 12)], C.topc, { smooth: true, cap: false }));
    }
    P('spine', loft([rring(1.42, 0.24, 0.2, 0, -0.01, 14), rring(1.56, 0.25, 0.21, 0, -0.02, 14)], C.topc.map((v) => v * 1.4), { smooth: true, cap: false }));
  } else if (k === 'hillbilly') {
    // denim overalls bib and straps, a frayed straw hat
    P('spine', box(-0.12, 0.12, 1.0, 1.3, 0.11, 0.135, C.pants, 0.03));
    for (const s of [-1, 1]) { P('spine', tube([V(s * 0.1, 1.3, 0.13), V(s * 0.12, 1.45, 0.07), V(s * 0.11, 1.42, -0.12), V(s * 0.08, 1.05, -0.13)], [0.014, 0.014, 0.014, 0.014], C.pants, { n: 4 })); P('spine', cyl(V(s * 0.1, 1.29, 0.13), V(s * 0.1, 1.29, 0.142), 0.012, 0.012, [200, 180, 90], { n: 6 })); }
    hat(0.24, 1.8, 0.12, 0.1, [214, 186, 110]);
    for (let a = 0; a < 6.2; a += 0.7) P('head', box(Math.cos(a) * 0.24 - 0.01, Math.cos(a) * 0.24 + 0.01, 1.795, 1.8, Math.sin(a) * 0.24 - 0.01, Math.sin(a) * 0.24 + 0.01, [190, 160, 90], 0.05));
    O('head', tube([V(0.04, 1.6, 0.11), V(0.07, 1.585, 0.16)], [0.004, 0.003], [220, 200, 140], { n: 4 }));
  } else if (k === 'vampire') {
    // a stand-up collar and a long cape, black outside and blood red inside
    P('spine', loft([rring(1.42, 0.3, 0.24, 0, -0.04, 14), rring(1.62, 0.36, 0.3, 0, -0.07, 14)], [12, 8, 10], { cap: false, smooth: true }));
    P('spine', loft([[V(-0.25, 1.46, -0.1), V(0.25, 1.46, -0.1)], [V(-0.36, 0.9, -0.2), V(0.36, 0.9, -0.2)], [V(-0.44, 0.35, -0.26), V(0.44, 0.35, -0.26)]], [14, 8, 12], { amt: 0.02 }));
    P('spine', loft([[V(-0.24, 1.45, -0.09), V(0.24, 1.45, -0.09)], [V(-0.35, 0.9, -0.19), V(0.35, 0.9, -0.19)], [V(-0.43, 0.36, -0.25), V(0.43, 0.36, -0.25)]], [120, 8, 20], { amt: 0.03 }));
    O('head', box(0.02, 0.028, 1.6, 1.618, 0.096, 0.1, [240, 236, 228], 0)); O('head', box(-0.028, -0.02, 1.6, 1.618, 0.096, 0.1, [240, 236, 228], 0));
  } else if (k === 'pirate') {
    // tricorn hat, eyepatch, gold buttons and a sash
    P('head', cyl(V(0, 1.81, -0.005), V(0, 1.83, -0.005), 0.23, 0.23, [20, 16, 14], { n: 3 }));
    P('head', cyl(V(0, 1.83, -0.005), V(0, 1.92, -0.005), 0.12, 0.1, [20, 16, 14], { n: 10 }));
    O('head', box(-0.06, -0.025, 1.672, 1.708, 0.1, 0.116, [10, 10, 10], 0.02));
    O('head', tube([V(-0.11, 1.74, 0.0), V(-0.06, 1.715, 0.105), V(0.06, 1.74, 0.1), V(0.11, 1.75, 0.0)], [0.004, 0.004, 0.004, 0.004], [10, 10, 10], { n: 4 }));
    for (const y of [1.05, 1.15, 1.25, 1.35]) for (const s of [-1, 1]) O('spine', cyl(V(s * 0.06, y, 0.128), V(s * 0.06, y, 0.138), 0.01, 0.01, [214, 176, 80], { n: 6 }));
    P('hips', loft([rring(0.94, 0.37, 0.25, 0, 0, 14), rring(1.01, 0.37, 0.25, 0, 0, 14)], [170, 30, 40], { amt: 0.04 }));
  } else if (k === 'cowboy') {
    // wide-brim hat with a band, a bandana and a big buckle
    hat(0.25, 1.79, 0.11, 0.13, [110, 76, 46]);
    P('head', cyl(V(0, 1.812, -0.005), V(0, 1.835, -0.005), 0.112, 0.112, [40, 26, 18], { n: 12 }));
    P('spine', loft([rring(1.42, 0.17, 0.16, 0, 0.0, 12), rring(1.47, 0.16, 0.15, 0, 0, 12)], [150, 30, 30], { amt: 0.04 }));
    O('hips', box(-0.05, 0.05, 0.93, 1.0, 0.118, 0.132, [214, 186, 110], 0.03));
  } else if (k === 'bear') {
    mask(C.topc);
    for (const s of [-1, 1]) { P('head', cyl(V(s * 0.12, 1.86, -0.02), V(s * 0.12, 1.86, 0.02), 0.055, 0.055, C.topc.map((v) => v * 0.9), { n: 10 })); P('head', cyl(V(s * 0.12, 1.86, 0.02), V(s * 0.12, 1.86, 0.025), 0.03, 0.03, [180, 140, 110], { n: 8 })); }
    P('head', cyl(V(0, 1.64, 0.12), V(0, 1.64, 0.2), 0.07, 0.06, [170, 130, 96], { n: 10 }));
    P('head', cyl(V(0, 1.665, 0.198), V(0, 1.665, 0.212), 0.022, 0.018, [20, 14, 12], { n: 8 }));
    for (const s of [-1, 1]) O('head', box(s * 0.06 - 0.014, s * 0.06 + 0.014, 1.72, 1.746, 0.136, 0.146, [10, 8, 8], 0));
  } else if (k === 'frog') {
    mask(C.topc);
    for (const s of [-1, 1]) { P('head', cyl(V(s * 0.09, 1.86, 0.03), V(s * 0.09, 1.95, 0.05), 0.065, 0.055, C.topc, { n: 10 })); P('head', cyl(V(s * 0.09, 1.92, 0.08), V(s * 0.09, 1.92, 0.1), 0.045, 0.04, [240, 240, 230], { n: 10 })); P('head', cyl(V(s * 0.09, 1.92, 0.1), V(s * 0.09, 1.92, 0.106), 0.02, 0.02, [10, 10, 10], { n: 8 })); }
    O('head', tube([V(-0.11, 1.62, 0.1), V(0, 1.6, 0.142), V(0.11, 1.62, 0.1)], [0.008, 0.008, 0.008], [40, 80, 30], { n: 4 }));
    P('spine', box(-0.12, 0.12, 1.02, 1.3, 0.13, 0.145, [200, 220, 140], 0.03));
  } else if (k === 'ninja') {
    // a black hood with an eye slit and a red headband with tails
    mask(C.topc);
    O('head', box(-0.085, 0.085, 1.672, 1.712, 0.128, 0.142, [196, 150, 120], 0.02));
    for (const sd of [-1, 1]) O('head', box(sd * 0.045 - 0.012, sd * 0.045 + 0.012, 1.685, 1.697, 0.142, 0.146, [10, 8, 8], 0));
    P('head', loft([rring(1.75, 0.3, 0.29, 0, 0.004, 14), rring(1.79, 0.29, 0.28, 0, 0.004, 14)], [170, 20, 28], { amt: 0.03 }));
    P('head', tube([V(0.03, 1.77, -0.14), V(0.08, 1.7, -0.22), V(0.12, 1.6, -0.25)], [0.02, 0.016, 0.01], [170, 20, 28], { n: 4 }));
    P('spine', loft([rring(0.97, 0.37, 0.25, 0, 0, 14), rring(1.03, 0.37, 0.25, 0, 0, 14)], [40, 40, 46], { amt: 0.04 }));
  } else if (k === 'chef') {
    // a tall white toque, a red neckerchief and a double row of buttons
    P('head', cyl(V(0, 1.8, -0.005), V(0, 1.86, -0.005), 0.12, 0.13, [240, 240, 236], { n: 12 }));
    P('head', loft([rring(1.86, 0.27, 0.27, 0, -0.005, 12), rring(1.98, 0.32, 0.32, 0, -0.005, 12), rring(2.06, 0.3, 0.3, 0, -0.005, 12), rring(2.09, 0.2, 0.2, 0, -0.005, 12)], [244, 244, 240], { smooth: true, amt: 0.03 }));
    P('spine', loft([rring(1.4, 0.17, 0.16, 0, 0.0, 12), rring(1.46, 0.165, 0.155, 0, 0, 12)], [200, 30, 34], { amt: 0.04 }));
    for (const y of [1.05, 1.15, 1.25, 1.35]) for (const sd of [-1, 1]) O('spine', cyl(V(sd * 0.05, y, 0.128), V(sd * 0.05, y, 0.138), 0.011, 0.011, [210, 210, 214], { n: 6 }));
  } else if (k === 'king') {
    // a gold crown with red stones, and a long red robe with a white fur collar
    P('head', cyl(V(0, 1.8, -0.005), V(0, 1.86, -0.005), 0.125, 0.125, [214, 170, 60], { n: 12 }));
    for (let a = 0; a < 6.28; a += 1.047) P('head', cyl(V(Math.cos(a) * 0.11, 1.86, Math.sin(a) * 0.11 - 0.005), V(Math.cos(a) * 0.105, 1.93, Math.sin(a) * 0.105 - 0.005), 0.025, 0.004, [214, 170, 60], { n: 4 }));
    O('head', box(-0.015, 0.015, 1.815, 1.845, 0.117, 0.13, [200, 20, 40], 0));
    P('spine', loft([[V(-0.26, 1.46, -0.1), V(0.26, 1.46, -0.1)], [V(-0.4, 0.9, -0.2), V(0.4, 0.9, -0.2)], [V(-0.5, 0.15, -0.3), V(0.5, 0.15, -0.3)]], [150, 16, 30], { amt: 0.03 }));
    P('spine', loft([rring(1.4, 0.44, 0.3, 0, -0.02, 14), rring(1.5, 0.44, 0.3, 0, -0.03, 14)], [236, 232, 224], { smooth: true, amt: 0.05 }));
  } else if (k === 'skeleton') {
    // white bones painted on black: a skull face, ribs, and bones down the arms and legs
    mask([226, 222, 210]);
    for (const sd of [-1, 1]) O('head', box(sd * 0.05 - 0.028, sd * 0.05 + 0.028, 1.67, 1.72, 0.128, 0.142, [10, 8, 8], 0));
    O('head', box(-0.012, 0.012, 1.63, 1.655, 0.136, 0.146, [10, 8, 8], 0));
    for (let i = -3; i <= 3; i++) O('head', box(i * 0.016 - 0.005, i * 0.016 + 0.005, 1.585, 1.61, 0.12, 0.132, [10, 8, 8], 0));
    O('spine', box(-0.012, 0.012, 1.0, 1.42, 0.128, 0.136, [226, 222, 210], 0));
    for (let k2 = 0; k2 < 5; k2++) { const y = 1.36 - k2 * 0.07, w = 0.14 - k2 * 0.012; O('spine', box(-w, w, y, y + 0.022, 0.126, 0.134, [226, 222, 210], 0)); }
    for (const sd of [-1, 1]) {
      O(sd > 0 ? 'thL' : 'thR', box(sd * 0.106 - 0.012, sd * 0.106 + 0.012, 0.56, 0.9, 0.06, 0.07, [226, 222, 210], 0));
      O(sd > 0 ? 'knL' : 'knR', box(sd * 0.108 - 0.012, sd * 0.108 + 0.012, 0.14, 0.46, 0.05, 0.06, [226, 222, 210], 0));
    }
  } else if (k === 'astronaut') {
    // a round helmet with a dark gold visor, a backpack and mission patches
    P('head', loft([rring(1.5, 0.22, 0.22, 0, 0, 14), rring(1.58, 0.32, 0.32, 0, 0, 14), rring(1.7, 0.36, 0.36, 0, 0, 14), rring(1.83, 0.32, 0.32, 0, 0, 14), rring(1.92, 0.2, 0.2, 0, 0, 14), rring(1.95, 0.06, 0.06, 0, 0, 14)], [236, 236, 232], { smooth: true, amt: 0.02 }));
    O('head', loft([[V(-0.12, 1.78, 0.15), V(0.12, 1.78, 0.15), V(0.13, 1.6, 0.15), V(-0.13, 1.6, 0.15)], [V(-0.12, 1.78, 0.172), V(0.12, 1.78, 0.172), V(0.13, 1.6, 0.172), V(-0.13, 1.6, 0.172)]], [60, 44, 14], { amt: 0.02 }));
    P('spine', box(-0.17, 0.17, 1.0, 1.42, -0.25, -0.13, [210, 210, 206], 0.04));
    O('spine', box(0.07, 0.13, 1.28, 1.34, 0.128, 0.138, [40, 80, 200], 0)); O('spine', box(-0.13, -0.07, 1.28, 1.34, 0.128, 0.138, [200, 40, 40], 0));
  } else if (k === 'chicken') {
    mask(C.topc);
    P('head', cyl(V(0, 1.68, 0.12), V(0, 1.66, 0.25), 0.05, 0.004, [240, 160, 40], { n: 8 }));
    for (const [y, z] of [[1.93, 0.05], [1.95, 0.0], [1.93, -0.05]]) P('head', cyl(V(0, 1.88, z), V(0, y, z), 0.03, 0.025, [210, 30, 30], { n: 8 }));
    P('head', cyl(V(0, 1.6, 0.13), V(0, 1.55, 0.14), 0.03, 0.02, [210, 30, 30], { n: 8 }));
    for (const s of [-1, 1]) O('head', box(s * 0.07 - 0.014, s * 0.07 + 0.014, 1.73, 1.756, 0.13, 0.14, [10, 8, 8], 0));
    for (const s of [-1, 1]) P(s > 0 ? 'shL' : 'shR', loft([[V(s * 0.25, 1.4, -0.08), V(s * 0.25, 1.4, 0.08)], [V(s * 0.38, 1.05, -0.1), V(s * 0.38, 1.05, 0.1)]], [236, 232, 220], { amt: 0.04 }));
  }
}
// shop outfits: full-body costumes bought with coins (colours and shapes are original)
const COSTUMES = {
  trench: { name: 'Long black trench coat', top: 'leather', topc: [16, 16, 18], pants: [14, 14, 16], bottom: 'trousers', shoe: 'boots', look: { eyes: 2 } },
  hillbilly: { name: 'Hillbilly set', top: 'turtle', topc: [150, 40, 36], pants: [52, 70, 104], bottom: 'jeans', shoe: 'boots', look: { beard: 2 } },
  vampire: { name: 'Vampire set', top: 'suitdark', topc: [18, 12, 16], pants: [16, 12, 14], bottom: 'trousers', shoe: 'dress', look: { skin: 0, head: 1, hair: 1, beard: 0, eyes: 0 } },
  pirate: { name: 'Pirate set', top: 'leather', topc: [130, 26, 30], pants: [44, 32, 24], bottom: 'trousers', shoe: 'boots', look: { beard: 2, eyes: 0 } },
  cowboy: { name: 'Cowboy set', top: 'bomber', topc: [120, 78, 44], pants: [52, 70, 104], bottom: 'jeans', shoe: 'boots', look: { eyes: 0 } },
  bear: { name: 'Bear costume', top: 'hoodie', topc: [96, 64, 40], pants: [96, 64, 40], bottom: 'trousers', shoe: 'boots', fur: true, look: { head: 7, beard: 0, eyes: 0 } },
  frog: { name: 'Frog costume', top: 'hoodie', topc: [70, 140, 60], pants: [70, 140, 60], bottom: 'trousers', shoe: 'sneakers', fur: true, look: { head: 7, beard: 0, eyes: 0 } },
  chicken: { name: 'Chicken costume', top: 'hoodie', topc: [232, 228, 216], pants: [232, 228, 216], bottom: 'trousers', shoe: 'sneakers', fur: true, look: { head: 7, beard: 0, eyes: 0 } },
  ninja: { name: 'Ninja', top: 'turtle', topc: [16, 16, 20], pants: [16, 16, 20], bottom: 'trousers', shoe: 'sneakers', look: { head: 7, beard: 0, eyes: 0 } },
  chef: { name: 'Chef', top: 'turtle', topc: [236, 234, 226], pants: [40, 40, 44], bottom: 'trousers', shoe: 'sneakers', look: { eyes: 0 } },
  king: { name: 'King', top: 'suitdark', topc: [72, 20, 92], pants: [40, 12, 52], bottom: 'trousers', shoe: 'dress', look: { beard: 2 } },
  skeleton: { name: 'Skeleton suit', top: 'turtle', topc: [14, 14, 16], pants: [14, 14, 16], bottom: 'trousers', shoe: 'sneakers', look: { head: 7, beard: 0, eyes: 0 } },
  astronaut: { name: 'Astronaut', top: 'hoodie', topc: [226, 226, 222], pants: [226, 226, 222], bottom: 'trousers', shoe: 'boots', look: { head: 7, beard: 0, eyes: 0 } }
};
function buildParts(look, seed) {
  const COSK = typeof look.outfit === 'string' && look.outfit.startsWith('cos-') ? look.outfit.slice(4) : '';
  const COS = COSK ? COSTUMES[COSK] : null;
  if (COS) look = Object.assign({}, look, COS.look);
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
  const TUXK = typeof look.outfit === 'string' && look.outfit.startsWith('tux-') ? look.outfit.slice(4) : '';
  const TUXC = TUXK ? TUXES[TUXK] : null, GOLDSUIT = !!TUXC;
  const JACKET = COS ? COS.topc : look.outfit === 'barman' ? [222, 218, 208] : GOLDSUIT ? TUXC.jacket : SWIM ? SKIN : LOOK.jacket[look.jacket][1];
  const RIB = look.outfit === 'barman' ? [206, 202, 192] : JACKET.map((v) => v * 0.6);
  const CARGO = COS ? COS.pants : GOLDSUIT ? TUXC.pants : LOOK.pants[look.pants][1];
  const CARGO_D = CARGO.map((v) => v * 0.74);
  const BOOT = [16, 14, 13], SOLE = [9, 8, 8], WEB = [20, 20, 19], GUN = [72, 74, 76], ZIP = [78, 78, 82];
  const RIM = [18, 18, 20], LENS = look.eyes === 2 ? [6, 6, 8] : [96, 108, 108], LENS_HI = look.eyes === 2 ? [60, 62, 70] : [170, 182, 180];
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
  const TOP = COS ? COS.top : look.outfit === 'barman' ? 'barman' : GOLDSUIT ? 'suitdark' : SWIM ? 'swim' : ['bomber', 'suit', 'suitdark', 'hoodie', 'leather', 'tank', 'turtle'][look.top || 0] || 'bomber';
  const BOTTOM = COS ? COS.bottom : SWIM ? 'swim' : look.outfit === 'barman' || GOLDSUIT ? 'trousers' : ['cargo', 'jeans', 'trousers', 'skirt'][look.bottom || 0] || 'cargo';
  const SHOE = COS ? COS.shoe : SWIM ? 'bare' : look.outfit === 'barman' || GOLDSUIT ? 'dress' : ['boots', 'sneakers', 'dress'][look.shoes || 0] || 'boots';
  const TOPC = COS ? COS.topc : look.outfit === 'barman' || GOLDSUIT ? JACKET : LOOK.jacket[look.jacket][1];
  const BOTC = CARGO;
  const hW = F ? 1.06 : 1, lW = F ? 0.88 : 1, sX = F ? 0.9 : 1;
  const SHIRT = GOLDSUIT ? TUXC.shirt : TOP === 'suitdark' ? [22, 22, 26] : [226, 222, 212];
  const TIE = GOLDSUIT ? TUXC.tie : TOP === 'suitdark' ? [10, 10, 12] : [110, 26, 32];

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
    if (GOLDSUIT) {
      // peaked satin lapels in a deeper shade, and a pocket square
      const LAP = TUXC.lapel;
      for (const sd of [-1, 1]) {
        O('spine', loft([[V(sd * 0.018, 1.18, fz + 0.004), V(sd * 0.12, 1.38, fz - 0.02), V(sd * 0.165, 1.42, 0.07), V(sd * 0.1, 1.45, 0.085)],
          [V(sd * 0.018, 1.18, fz + 0.01), V(sd * 0.12, 1.38, fz - 0.014), V(sd * 0.165, 1.42, 0.076), V(sd * 0.1, 1.45, 0.091)]], LAP, { amt: 0.015 }));
      }
      O('spine', box(0.085, 0.14, 1.3, 1.34, fz - 0.012, fz + 0.004, TUXC.square, 0.02));
      if (TUXK === 'ruby' || TUXK === 'midnight') {
        // the owner's suit (and Matenro's in midnight purple): a gem brooch set in gold, a gold watch chain, satin piping and extra buttons
        O('spine', cyl(V(-0.1, 1.36, fz - 0.006), V(-0.1, 1.36, fz + 0.012), 0.022, 0.02, [176, 136, 52], { n: 10, amt: 0.02 }));
        O('spine', cyl(V(-0.1, 1.36, fz + 0.006), V(-0.1, 1.36, fz + 0.02), 0.015, 0.008, TUXK === 'midnight' ? [150, 96, 255] : [235, 30, 62], { n: 10, amt: 0.02 }));
        O('spine', tube([V(-0.1, 1.06, fz + 0.002), V(-0.05, 1.03, fz + 0.012), V(0, 1.05, fz + 0.012), V(0.06, 1.03, fz + 0.01), V(0.11, 1.06, fz + 0.002)], [0.004, 0.004, 0.004, 0.004, 0.004], [196, 154, 60], { n: 4, smooth: true }));
        for (const y of [1.02, 1.08, 1.14, 1.2]) O('spine', cyl(V(0.05, y, fz - 0.002), V(0.05, y, fz + 0.007), 0.007, 0.007, [12, 2, 4], { n: 8, amt: 0.02 }));
        for (const sd of [-1, 1]) O('spine', tube([V(sd * 0.2, 1.0, 0.12), V(sd * 0.23, 1.2, 0.09), V(sd * 0.21, 1.4, 0.06)], [0.004, 0.004, 0.004], TUXC.lapel, { n: 4, smooth: true }));
      }
    }
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
    P(shK, loft([rring(1.35, 0.17 * aw, 0.16 * aw, ax(0.225), -0.005, 10), rring(1.42, 0.175 * aw, 0.165 * aw, ax(0.222), -0.005, 10), rring(1.47, 0.14 * aw, 0.14 * aw, ax(0.215), -0.005, 10), rring(1.5, 0.07 * aw, 0.08 * aw, ax(0.205), -0.005, 10)], sleeveCol, { smooth: true, amt: 0.03 }));
    P(elK, tube([add(el, V(0, 0.03, 0)), el, V(ax(0.33), 1.0, 0.01), cuffCol ? cuff0 : wr], [0.06 * aw, 0.064 * aw, 0.064 * aw, 0.062 * aw], sleeveCol, { n: 10 }));
    if (cuffCol) P(elK, cyl(cuff0, wr, 0.055 * (TOP === 'suit' || TOP === 'suitdark' ? 0.9 : 1) * lW, 0.05 * lW, cuffCol, { n: 10, smooth: true }));
    if (GOLDSUIT) {
      const cl = add(cuff0, V(s * 0.035, 0, 0.03));
      P(elK, cyl(cl, add(cl, V(s * 0.012, 0, 0)), 0.011, 0.011, TUXK === 'ruby' ? [230, 28, 58] : TUXK === 'midnight' ? [140, 90, 240] : [214, 176, 80], { n: 8, amt: 0.02 }));
      for (let k = 0; k < (TUXK === 'ruby' || TUXK === 'midnight' ? 4 : 3); k++) { const b = add(cuff0, mul(sub(el, cuff0), 0.08 + k * 0.06)); P(elK, cyl(add(b, V(s * 0.055, 0, 0)), add(b, V(s * 0.064, 0, 0)), 0.007, 0.007, TUXC.lapel, { n: 6, amt: 0.02 })); }
    }
    const hx = wr[0] + s * 0.004, hz = wr[2] + 0.008, hs = F ? 0.88 : 1;
    P(elK, loft([rring(0.895, 0.036 * hs, 0.074 * hs, hx, hz, 10), rring(0.845, 0.038 * hs, 0.086 * hs, hx, hz + 0.004, 10),
      rring(0.80, 0.034 * hs, 0.084 * hs, hx - s * 0.002, hz + 0.008, 10), rring(0.76, 0.026 * hs, 0.066 * hs, hx - s * 0.006, hz + 0.01, 10)], SKIN, { smooth: true }));
    P(elK, tube([V(hx - s * 0.012, 0.86, hz + 0.035), V(hx - s * 0.02, 0.825, hz + 0.05), V(hx - s * 0.022, 0.805, hz + 0.052)], [0.011 * hs, 0.01 * hs, 0.008 * hs], SKIN_SHAD, { n: 6 }));
  }
  if (TOP === 'barman') {
    for (const s of [-1, 1]) O(s > 0 ? 'shL' : 'shR', cyl(V(s * 0.262, 1.3, -0.008), V(s * 0.268, 1.27, -0.009), 0.074, 0.073, [24, 24, 28], { n: 10, smooth: true, amt: 0.02 }));
  } else if (TOP === 'bomber') O('shL', box(0.333 * sX, 0.35 * sX, 1.215, 1.30, -0.032, 0.018, ribCol, 0.03));
  if (COS) costumeParts(COSK, COS, P, O, F);
  return { B, B2, ember };
}

// a heavier build for the door staff: a broad chest and shoulders, a thick neck and big arms
function buffUp(B, B2) {
  const bell = (y, c, w) => Math.exp(-Math.pow((y - c) / w, 2) / 2);
  const torso = (v) => { const y = v[1], fx = 1.05 + 0.18 * bell(y, 1.34, 0.13), fz = 1.05 + 0.2 * bell(y, 1.28, 0.12); return [v[0] * fx, y, v[2] * fz]; };
  const limb = (a, b, k, dx) => (v) => {
    const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(v, a), ab) / dot(ab, ab))), c = add(a, mul(ab, t));
    const o = add(c, mul(sub(v, c), typeof k === 'function' ? k(v) : k));
    return [o[0] + dx, o[1], o[2]];
  };
  const map = { spine: torso };
  for (const [sh, el, e] of [['shL', 'elL', 1], ['shR', 'elR', -1]]) {
    map[sh] = limb(PIV[sh], PIV[el], (v) => (v[1] > PIV[sh][1] - 0.04 ? 1.1 : 1.3), 0.03 * e);
    map[el] = limb(PIV[el], add(PIV[el], [0.03 * e, -0.27, 0.02]), (v) => (v[1] < PIV[el][1] - 0.28 ? 1.1 : 1.22), 0.03 * e);
  }
  for (const BB of [B, B2]) for (const k in map) for (const p of BB[k] || []) p.tris = p.tris.map((t) => t.map(map[k]));
}
function getGeos(look, seed) {
  const key = lookToCode(look) + ':' + (look.outfit || '') + ':' + seed + (look.buff ? ':buff' : '');
  if (geoCache.has(key)) return geoCache.get(key);
  const { B, B2, ember } = buildParts(look, seed);
  if (look.buff) buffUp(B, B2);
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

// ---------------------------------------------------------------- NPC idle loops
const smooth01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
// hands folded low in front, arms folded across the chest, a hand pressed to the earpiece, checking the phone
const BNC_CROSS = { 'shL.x': -0.35, 'shL.z': -0.1, 'elL.x': -1.45, 'elL.z': -1.35, 'shR.x': -0.35, 'shR.z': 0.1, 'elR.x': -1.25, 'elR.z': 1.35, 'spine.x': -0.04 };
const BNC_LARM = { 'shL.x': -0.35, 'shL.z': -0.1, 'elL.x': -1.45, 'elL.z': -1.35 };
const NPC_LOOPS = {
  // the door staff: arms folded, looking the street over; a word into the earpiece, a glance at the phone
  bouncer: {
    len: 40,
    base: (b, t) => { b.thL.rotation.z = 0.1; b.thR.rotation.z = -0.1; b.hips.position.x = 0.012 * Math.sin(t * 0.37); },
    segs: [
      [0, (t) => Object.assign({ 'head.y': 0.6 * Math.sin(t * 0.31), 'spine.y': 0.08 * Math.sin(t * 0.31 - 0.7), 'head.x': 0.04 }, BNC_CROSS)],
      [11, (t, u) => Object.assign({ 'shR.x': -0.9, 'shR.z': -0.85, 'elR.x': -2.45, 'elR.y': 0.55, 'head.z': 0.12, 'head.x': 0.06 + 0.07 * Math.max(0, Math.sin(t * 3.1)) * (u > 1.2 ? 1 : 0), 'head.y': -0.25 }, BNC_LARM)],
      [16, (t) => Object.assign({ 'head.y': -0.4 + 0.25 * Math.sin(t * 0.5), 'head.x': 0.02 }, BNC_CROSS)],
      [23, (t) => ({ 'shR.x': -0.45, 'shR.z': 0.05, 'elR.x': -1.5 + 0.03 * Math.sin(t * 5), 'elR.z': 0.75, 'shL.x': -0.4, 'shL.z': -0.05, 'elL.x': -1.45, 'elL.z': -0.8, 'head.x': 0.42, 'spine.x': 0.06 })],
      [31, (t) => Object.assign({ 'head.y': 0.5 * Math.sin(t * 0.27 + 1) }, BNC_CROSS)]
    ]
  },
  // the valet at his desk: the ledger, a look outside, a call, a sip of coffee, a stretch
  valet: {
    len: 36,
    base: (b) => { b.hips.position.y -= 0.45; b.thL.rotation.x = b.thR.rotation.x = -1.5; b.knL.rotation.x = b.knR.rotation.x = 1.45; b.thL.rotation.z = 0.1; b.thR.rotation.z = -0.1; },
    segs: [
      [0, (t) => ({ 'spine.x': 0.22, 'head.x': 0.38, 'head.y': 0.1 * Math.sin(t * 0.4), 'shR.x': -0.95, 'shR.z': 0.18, 'elR.x': -0.85 + 0.07 * Math.sin(t * 7), 'elR.y': 0.08 * Math.sin(t * 2.3), 'shL.x': -0.85, 'shL.z': -0.22, 'elL.x': -0.85 })],
      [12, (t) => ({ 'spine.x': 0.05, 'shL.x': -0.85, 'shL.z': -0.2, 'elL.x': -0.9, 'shR.x': -0.85, 'shR.z': 0.2, 'elR.x': -0.9, 'head.y': 0.75 * Math.sin(t * 0.45), 'head.x': -0.05 })],
      [18, (t) => ({ 'spine.x': -0.05, 'spine.z': 0.05, 'shR.x': -0.9, 'shR.z': -0.85, 'elR.x': -2.45, 'elR.y': 0.55, 'shL.x': -0.8, 'shL.z': -0.2, 'elL.x': -0.9, 'head.z': 0.2, 'head.y': 0.3 * Math.sin(t * 0.6) })],
      [26, (t, u) => { const k = Math.max(0, Math.sin(u * 1.6)); return { 'spine.x': -0.06, 'shR.x': -0.6 - 0.7 * k, 'shR.z': 0.15, 'elR.x': -1.3 - 0.85 * k, 'shL.x': -0.85, 'shL.z': -0.2, 'elL.x': -0.9, 'head.x': -0.08 * k }; }],
      [31, (t, u) => { const k = smooth01(u / 1.2) * smooth01((5 - u) / 1.2); return { 'spine.x': -0.18 * k, 'shL.z': 2.6 * k, 'shR.z': -2.6 * k, 'shL.x': -0.85 * (1 - k), 'shR.x': -0.85 * (1 - k), 'elL.x': -0.9 * (1 - k), 'elR.x': -0.9 * (1 - k), 'elL.z': 0.3 * k, 'elR.z': -0.3 * k, 'head.x': -0.3 * k }; }]
    ]
  }
};
const npcLoopT = (ch, t) => { const L = NPC_LOOPS[ch.act]; return L ? (t + (ch.phase || 0) * 60) % L.len : 0; };

// relaxed ways to sit on a sofa or an armchair (one per person, picked from their seed)
function relaxSit(b, v, t, ph, beat) {
  const br = 0.02 * Math.sin(t * 1.3 + ph * 7);
  b.spine.rotation.x += br;
  if (v === 1) {            // legs crossed, one arm along the armrest
    b.thR.rotation.x = -1.62; b.thR.rotation.z = 0.3; b.knR.rotation.x = 1.2;
    b.thL.rotation.z = 0.04; b.spine.rotation.x = -0.22 + br;
    b.shR.rotation.x = -0.2; b.shR.rotation.z = -0.25; b.elR.rotation.x = -0.6;
    b.head.rotation.y = 0.3 * Math.sin(t * 0.2 + ph * 4);
  } else if (v === 2) {     // leaning forward, elbows on the knees, hands together, nodding along
    b.spine.rotation.x = 0.32 + br;
    b.shL.rotation.x = b.shR.rotation.x = -0.6; b.shL.rotation.z = -0.05; b.shR.rotation.z = 0.05;
    b.elL.rotation.x = b.elR.rotation.x = -1.35; b.elL.rotation.z = -0.65; b.elR.rotation.z = 0.65;
    b.head.rotation.x = -0.18 + 0.08 * Math.abs(Math.sin(Math.PI * beat));
  } else if (v === 3) {     // sprawled: knees apart, both arms out along the back
    b.spine.rotation.x = -0.3 + br; b.thL.rotation.z = 0.32; b.thR.rotation.z = -0.32; b.knL.rotation.x = b.knR.rotation.x = 1.15;
    b.shL.rotation.x = 0.55; b.shR.rotation.x = 0.55; b.shL.rotation.z = 0.8; b.shR.rotation.z = -0.8; b.elL.rotation.x = b.elR.rotation.x = -0.2;
    b.head.rotation.x = -0.1; b.head.rotation.y = 0.4 * Math.sin(t * 0.15 + ph * 3);
  } else if (v === 4) {     // chin in hand, thinking
    b.spine.rotation.x = 0.16 + br; b.spine.rotation.z = -0.05;
    b.shR.rotation.x = -0.95; b.shR.rotation.z = 0.12; b.elR.rotation.x = -2.25;
    b.shL.rotation.x = -0.35; b.elL.rotation.x = -1.0;
    b.head.rotation.x = 0.12; b.head.rotation.z = 0.08;
  } else {                  // upright and easy, now and then shifting in the seat
    const sh = Math.max(0, Math.sin(t * 0.21 + ph * 9)) ** 6;
    b.hips.position.x += 0.03 * sh; b.spine.rotation.z = 0.06 * sh;
  }
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
    // everyone sits a little differently: turned to chat, a foot up on the rail tapping along, or slouched on one elbow
    const v = Math.floor(((ph * 13.7) % 1) * 4);
    if (v === 1) { b.spine.rotation.y = 0.35; b.head.rotation.y += 0.35; b.shR.rotation.x = -0.25; b.elR.rotation.x = -0.5; b.shR.rotation.z = 0.05; }
    else if (v === 2) { b.thL.rotation.x = -1.25; b.knL.rotation.x = 1.95; b.knR.rotation.x = 1.45 + 0.1 * Math.abs(Math.sin(PI * beat)); }
    else if (v === 3) { b.spine.rotation.x = 0.2; b.spine.rotation.z = 0.08; b.shR.rotation.x = -1.0; b.elR.rotation.x = -2.1; b.elR.rotation.z = 0.3; b.head.rotation.z = 0.12; }
  } else if (act === 'lean') {
    b.spine.rotation.x = -0.05 + 0.012 * Math.sin(t * 1.7 + ph);
    b.thL.rotation.x = -0.25; b.knL.rotation.x = 0.5; b.thL.rotation.z = 0.05;
    b.shL.rotation.x = b.shR.rotation.x = -0.5; b.shL.rotation.z = -0.35; b.shR.rotation.z = 0.35;
    b.elL.rotation.x = b.elR.rotation.x = -1.55; b.elL.rotation.y = -0.4; b.elR.rotation.y = 0.4;
    b.head.rotation.x = 0.07 * Math.abs(Math.sin(PI * beat)); b.head.rotation.y = 0.4 * Math.sin(t * 0.25 + ph * 3);
  } else if (act === 'sitlow' || act === 'lounge' || act === 'club') {
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
    } else {
      b.head.rotation.y = 0.15 * Math.sin(t * 0.17 + ph * 5);
      relaxSit(b, Math.floor(((ph * 7.31) % 1) * 5), t, ph, beat);
    }
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
  } else if (act === 'ben') {
    // Ben at his monitors: typing, a phone call, a smoke, stubbing it out
    b.hips.position.y = 0.95 - 0.45;
    b.thL.rotation.x = b.thR.rotation.x = -1.5; b.knL.rotation.x = b.knR.rotation.x = 1.45;
    b.thL.rotation.z = 0.12; b.thR.rotation.z = -0.12;
    const T = (t + ph * 40) % 40;
    const type = () => {
      b.spine.rotation.x = 0.18;
      b.shL.rotation.x = b.shR.rotation.x = -1.0; b.shL.rotation.z = -0.22; b.shR.rotation.z = 0.22;
      b.elL.rotation.x = -0.75 + 0.06 * Math.sin(t * 19); b.elR.rotation.x = -0.75 + 0.06 * Math.sin(t * 23 + 1);
      b.head.rotation.x = -0.12 + 0.04 * Math.sin(t * 0.7); b.head.rotation.y = 0.25 * Math.sin(t * 0.4);
    };
    if (T < 16 || T >= 37) type();
    else if (T < 22) {
      b.spine.rotation.x = -0.05; b.spine.rotation.z = 0.06;
      b.shR.rotation.x = -1.3; b.shR.rotation.z = 0.55; b.elR.rotation.x = -2.25;
      b.shL.rotation.x = -0.6; b.elL.rotation.x = -0.9; b.shL.rotation.z = -0.2;
      b.head.rotation.z = 0.22; b.head.rotation.y = 0.3 * Math.sin(t * 0.6);
    } else if (T < 34) {
      const u = Math.max(0, Math.sin((T - 22) * 1.6));
      b.spine.rotation.x = -0.08;
      b.shR.rotation.x = -0.55 - 0.75 * u; b.elR.rotation.x = -1.3 - 0.8 * u; b.shR.rotation.z = 0.15;
      b.shL.rotation.x = -0.9; b.elL.rotation.x = -0.8; b.shL.rotation.z = -0.25;
      b.head.rotation.x = -0.1 - 0.12 * u;
    } else {
      b.spine.rotation.x = 0.4;
      b.shR.rotation.x = -1.0; b.elR.rotation.x = -0.35; b.shR.rotation.z = 0.35 + 0.08 * Math.sin(t * 14);
      b.shL.rotation.x = -0.7; b.elL.rotation.x = -0.6;
      b.head.rotation.x = 0.35;
    }
  } else if (act === 'floorsit') {
    // sitting on the ground against the wall, knees up, one arm out with the cup
    b.hips.position.y = 0.17;
    b.thL.rotation.x = b.thR.rotation.x = -1.2; b.knL.rotation.x = b.knR.rotation.x = 1.9;
    b.thL.rotation.z = 0.25; b.thR.rotation.z = -0.25;
    b.spine.rotation.x = -0.15 + 0.03 * Math.sin(t * 0.8);
    b.shR.rotation.x = -1.1 - 0.15 * Math.max(0, Math.sin(t * 0.9)); b.elR.rotation.x = -0.4;
    b.shL.rotation.x = -0.5; b.elL.rotation.x = -1.2; b.shL.rotation.z = -0.2;
    b.head.rotation.x = 0.35 + 0.1 * Math.sin(t * 0.5); b.head.rotation.y = 0.3 * Math.sin(t * 0.3);
  } else if (act === 'bouncer' || act === 'valet') {
    // a loop of idle moments, eased into each other (see NPC_LOOPS)
    const L = NPC_LOOPS[act], T = (t + ph * 60) % L.len;
    let i = L.segs.length - 1; while (L.segs[i][0] > T) i--;
    const end = i + 1 < L.segs.length ? L.segs[i + 1][0] : L.len, nxt = L.segs[(i + 1) % L.segs.length][1];
    const a = L.segs[i][1](t, T - L.segs[i][0]), w = T > end - 0.8 ? smooth01((T - end + 0.8) / 0.8) : 0;
    const bb = w > 0 ? nxt(t, 0) : null;
    if (L.base) L.base(b, t);
    const keys = new Set(Object.keys(a)); if (bb) for (const k in bb) keys.add(k);
    for (const k of keys) {
      const [bone, ax] = k.split('.'), v = (a[k] || 0) * (1 - w) + (bb ? (bb[k] || 0) * w : 0);
      if (bone === 'hips') b.hips.position[ax] += v; else b[bone].rotation[ax] += v;
    }
    if (ch.nodUntil && ch.nodUntil > performance.now()) { const u = (ch.nodUntil - performance.now()) / 1600; b.head.rotation.y *= 1 - Math.sin(u * Math.PI); b.head.rotation.x += 0.12 * Math.sin(u * Math.PI * 3); }
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
    const cyc = (t + ph * 9) % (act === 'club' ? 14 : 9);
    const u = cyc < 2.2 ? Math.sin((cyc / 2.2) * PI) : 0;
    b.shL.rotation.x = -0.45 - 0.75 * u; b.shL.rotation.z = -0.12; b.shL.rotation.y = 0;
    b.elL.rotation.x = -1.25 - 0.75 * u; b.elL.rotation.y = 0; b.elL.rotation.z = 0;
    b.head.rotation.x -= 0.15 * u;
  }
  // in the lounge, everyone at a table raises a glass together every so often
  if (act === 'club' && ch.toastN >= 2) {
    const T = (t + (ch.toastT || 0) * 11) % 34;
    if (T < 3.4) {
      const k = smooth01(T / 0.7) * smooth01((3.4 - T) / 0.7), clink = T > 1.5 && T < 1.9 ? 0.05 * Math.sin((T - 1.5) * 40) : 0;
      const mix = (a, v) => a * (1 - k) + v * k;
      b.shL.rotation.x = mix(b.shL.rotation.x, -1.35 + clink); b.shL.rotation.z = mix(b.shL.rotation.z, -0.18);
      b.elL.rotation.x = mix(b.elL.rotation.x, -0.5); b.elL.rotation.z = mix(b.elL.rotation.z, 0);
      b.spine.rotation.x = mix(b.spine.rotation.x, 0.12); b.head.rotation.x = mix(b.head.rotation.x, -0.08); b.head.rotation.y *= 1 - k;
    }
  }
}

// ---------------------------------------------------------------- scene: a five-room art deco venue
// Floor plan (x to the right, z toward the front; the camera starts in the main bar):
//   [ Pool room ][ VIP lounge ]
//   [ TV room   ][ Main bar   ][ Lounge ][ Dance room ]
const canvas = document.getElementById('c');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setClearColor(0x04060a, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x04060a, 7, 17);
const camera = new THREE.PerspectiveCamera(46, 1, 0.15, 170);

const signFont = '"Limelight", "Poiret One", Georgia, serif';
const ROOMS = {
  // the restroom sits inside the dance room's front corner, so it is listed first
  wcM: { x0: 14, x1: 18.4, z0: -10.4, z1: -8.0, name: "Men's room", hidden: true },
  wcW: { x0: 14, x1: 18.4, z0: -8.0, z1: -5.6, name: "Women's room", hidden: true },
  wc: { x0: 14, x1: 18.4, z0: -10.4, z1: -5.6, name: 'Restroom', hidden: true },
  card: { x0: -17, x1: -11.8, z0: -4, z1: 4, name: 'Casino Royale' },
  sec: { x0: -17, x1: -13, z0: -11, z1: -4, name: 'Security' },
  bar: { x0: -5, x1: 5, z0: -4, z1: 4, name: 'Main bar' },
  lounge: { x0: 5, x1: 14, z0: -4, z1: 4, name: 'Lounge' },
  dance: { x0: 14, x1: 23, z0: -4, z1: 4, name: 'Dance room' },
  tv: { x0: -13, x1: -5, z0: -11, z1: -4, name: 'TV room' },
  pool: { x0: -11.8, x1: -5, z0: -4, z1: 4, name: 'Pool room' },
  vest: { x0: -5, x1: -3.3, z0: -5.9, z1: -4, name: 'VIP entrance' },
  vip: { x0: -5, x1: 2, z0: -11, z1: -4, name: 'VIP lounge' },
  swim: { x0: 5, x1: 14, z0: -12, z1: -4, name: 'Pool lounge' },
  change: { x0: 2, x1: 5, z0: -11, z1: -4, name: 'Changing room' },
  street: { x0: -84, x1: 36, z0: 4, z1: 17.4, name: 'Street', outside: true },
  alley: { x0: -14, x1: 15, z0: -35, z1: -11, name: 'Backstreet', outside: true },
  drive: { x0: 15, x1: 38, z0: -62, z1: 4, name: 'Valet drive', outside: true },
  carpark: { x0: -88, x1: -14.2, z0: -72, z1: 4, name: 'Car park', outside: true },
  backalley: { x0: -84.2, x1: -19.8, z0: -70.2, z1: 4, name: 'Back alley', outside: true },
  golf: { x0: -50, x1: 120, z0: -275, z1: -62, name: 'Golf club', outside: true }
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
const danceLight = pLight(0x4a7cff, 1.8, 8, 18.5, 2.8, 0);
const danceLight2 = pLight(0x6a4aff, 1.2, 7, 21.5, 2.6, -2.5);
// tv room
pLight(0x2c4c8c, 0.7, 8, -8, 2.8, -5.0);
// pool room: the long lamp over the table
const poolLamp = pLight(0xfff0c8, 1.4, 4.2, -9.4, 1.9, 0.4);
const pokerLamp = pLight(0xffe2c0, 1.3, 4.5, -13.9, 2.1, -0.3);
// vip: the glowing disc and the pink cove light
const fireLight = pLight(0xff2a8a, 1.4, 5, -1.1, 1.6, -10.2);
// pool lounge: hot magenta and red, plus a cool glow coming off the water
const swimLights = [pLight(0xff2a8a, 1.5, 8, 7.0, 2.7, -6.0), pLight(0xff3040, 1.2, 7, 12.0, 2.7, -10.5)];
const waterLight = pLight(0x7ad8ff, 1.0, 4.5, 9.5, 0.2, -8.0);
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
const decal = (opts) => new THREE.MeshBasicMaterial(Object.assign({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 }, opts));
// paint, lines and paths lying on the ground: their own steady layer, pulled forward so they always sit on top
const groundDecalMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
const GD = [];
// which floor an x position belongs to (the basement and hotel are built far off to the side)
function zoneAtX(x) { return x > 150 ? 'f2' : x > 80 ? 'base' : 'main'; }
// merged static geometry is split into chunks per floor and per 24 m square, so far or hidden chunks can be skipped
// anything flat lying on a floor or the ground (painted lines, paths, lane markings) is drawn without the PS1 vertex
// wobble: the wobble bends each surface's depth differently, which is what makes thin layers flicker against each other
const flatRoomMat = new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -3 });
// outside, everything static is drawn steady: the street, the drive, the car park, the buildings and the golf course.
// (inside the bar the wobble stays, it's part of the look and the rooms were checked for flicker with it on)
function isFlatPart(p) {
  const v = p.tris[0][0], x = v[0], z = v[2];
  // anything thin lying right on a floor (inlays, borders, mats) is steady too, like the floors themselves
  let y0 = Infinity, y1 = -Infinity; for (const t of p.tris) for (const q of t) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
  if (y1 - y0 < 0.06 && y1 < 0.1 && y0 > -0.05) return true;
  if (zoneAtX(x) !== 'main') return false;
  return x < -17.3 || x > 23.3 || z > 4.3 || z < -12.3;
}
function addStatic(parts, mat) {
  const by = new Map();
  for (const p of parts) {
    const v = p.tris[0] && p.tris[0][0]; const z = v ? zoneAtX(v[0]) : 'main';
    const flat = !mat && v && isFlatPart(p) ? 'F' : '';
    const k = (v ? z + ':' + Math.floor(v[0] / 24) + ',' + Math.floor(v[2] / 24) : z) + flat;
    if (!by.has(k)) by.set(k, []); by.get(k).push(p);
  }
  let last = null;
  for (const [k, ps] of by) { const m = new THREE.Mesh(toGeometry(ps), k.endsWith('F') ? flatRoomMat : mat || roomMat); m.userData.zone = k.split(':')[0]; scene.add(m); last = m; }
  return last;
}
function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; }

// floors
const floorMats = {};
function floorFor(r, tex, tile) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const g = new THREE.PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2));
  scaleUV(g, w / tile, d / tile);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));   // floors stay steady (no wobble) so rugs never flicker on them
  m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); scene.add(m);
  return m;
}
for (const t of [marbleTex, concreteTex, carpetTex, woodTex, vipTex]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
floorFor(ROOMS.bar, marbleTex, 2);
floorFor(ROOMS.dance, concreteTex, 2);
floorFor(ROOMS.lounge, woodTex, 1.6);
{ const vf = floorFor(ROOMS.vest, vipTex, 0.8); vf.material.polygonOffset = true; vf.material.polygonOffsetFactor = -1; vf.material.polygonOffsetUnits = -4; vf.position.y = 0.004; }
floorFor(ROOMS.tv, carpetTex, 0.8);
floorFor(ROOMS.pool, luxCarpetTex, 1.4);
floorFor(ROOMS.card, cardFloorTex, 1.2);
const wcFloor = floorFor(ROOMS.wc, wcFloorTex, 0.8);
floorFor(ROOMS.vip, vipTex, 0.8);
swimFloorTex.wrapS = swimFloorTex.wrapT = THREE.RepeatWrapping;
// the pool lounge floor is laid around the pool so the pool can sit below floor level
{
  const r = ROOMS.swim, X0 = 7.4, X1 = 11.6, Z0 = -9.6, Z1 = -6.4;
  for (const [x0, x1, z0, z1] of [[r.x0, r.x1, r.z0, Z0], [r.x0, r.x1, Z1, r.z1], [r.x0, X0, Z0, Z1], [X1, r.x1, Z0, Z1]]) {
    const w = x1 - x0, d = z1 - z0, g = new THREE.PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2));
    scaleUV(g, w / 1.5, d / 1.5);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) + (x0 - r.x0) / 1.5); uv.setY(i, uv.getY(i) + (z0 - r.z0) / 1.5); }
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: swimFloorTex }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); scene.add(m);
  }
}

// walls: each room gets its own inward-facing walls (seen from inside, invisible from behind),
// with doorway gaps given as [from, to] distances along the wall
const WALL_H = 3.2, DOOR_H = 2.4;
// lounge: walnut panelling below a brass rail, deep red damask above
const panelTex = canvasTex(64, 128, (x, w, h) => {
  x.fillStyle = 'rgb(58,12,16)'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < 72; j += 8) for (let i = 0; i < w; i += 8) { x.fillStyle = 'rgb(84,20,24)'; const o = (j / 8) % 2 ? 4 : 0; x.fillRect(i + o + 3, j + 1, 2, 2); x.fillRect(i + o + 2, j + 2, 4, 2); x.fillRect(i + o + 3, j + 4, 2, 2); }
  x.fillStyle = 'rgb(150,112,54)'; x.fillRect(0, 72, w, 2);
  x.fillStyle = 'rgb(44,26,16)'; x.fillRect(0, 74, w, h - 74);
  for (let i = 0; i < w; i += 32) { x.fillStyle = 'rgb(30,17,10)'; x.fillRect(i + 3, 79, 26, 1); x.fillRect(i + 3, 79, 1, 42); x.fillRect(i + 3, 120, 26, 1); x.fillRect(i + 28, 79, 1, 42); x.fillStyle = 'rgb(56,34,20)'; x.fillRect(i + 5, 81, 22, 38); }
  x.fillStyle = 'rgb(22,13,8)'; x.fillRect(0, h - 4, w, 4);
});
// dance room: black acoustic slats with a thin blue line
const clubWallTex = canvasTex(32, 64, (x, w, h) => {
  x.fillStyle = 'rgb(12,12,16)'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 4) { x.fillStyle = 'rgb(20,20,26)'; x.fillRect(i, 0, 3, h); }
  x.fillStyle = 'rgb(40,60,140)'; x.fillRect(0, 40, w, 1);
});
const wallMats = {
  panel: ps1(new THREE.MeshLambertMaterial({ map: panelTex })),
  club: ps1(new THREE.MeshLambertMaterial({ map: clubWallTex })),
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
roomWalls(ROOMS.bar, { right: [DOOR.barDance], left: [DOOR.barTv], front: [[4.1, 5.9]], back: [[0.4, 1.4]] }, wallMats.deco);
roomWalls(ROOMS.lounge, { left: [DOOR.barDance], back: [[3.6, 5.4]], right: [[3, 5]] }, wallMats.panel);
roomWalls(ROOMS.dance, { left: [[3, 5]] }, wallMats.club);
roomWalls(ROOMS.swim, { front: [[3.6, 5.4]], left: [[5.0, 6.2]], right: [[2.6, 3.6], [4.4, 5.4]] }, wallMats.brick);
roomWalls(ROOMS.change, { right: [[4.0, 5.2]] }, wallMats.brick);
roomWalls(ROOMS.tv, { front: [DOOR.tvPool], left: [[0.15, 1.25]] }, wallMats.deco);
roomWalls(ROOMS.sec, { right: [[0.15, 1.25]] }, wallMats.brick);
floorFor(ROOMS.sec, concreteTex, 2);
roomWalls(ROOMS.pool, { back: [[1.8, 3.4]], right: [DOOR.barTv], left: [[6.2, 7.6]] }, wallMats.green);
roomWalls(ROOMS.card, { right: [[6.2, 7.6]] }, wallMats.lacquer);
// the restroom: inside walls only show when you're in there; the walls facing the dance room always do
// the restroom: an annex off the pool lounge (door in its right wall, z -8.6..-7.4); tiled inside, stone outside
{
  const r = ROOMS.wc, ti = (ax, az, bx, bz, nx, nz, y0, y1) => wallPlane(ax, az, bx, bz, nx, nz, y0, y1, wallMats.tile, 1.2);
  ti(r.x0, r.z0 + 0.02, r.x1, r.z0 + 0.02, 0, 1, 0, WALL_H); ti(r.x0, r.z1 - 0.02, r.x1, r.z1 - 0.02, 0, -1, 0, WALL_H);
  ti(r.x1 - 0.02, r.z0, r.x1 - 0.02, r.z1, -1, 0, 0, WALL_H);
  ti(r.x0 + 0.02, r.z0, r.x0 + 0.02, -9.4, 1, 0, 0, WALL_H); ti(r.x0 + 0.02, -8.4, r.x0 + 0.02, -7.6, 1, 0, 0, WALL_H); ti(r.x0 + 0.02, -6.6, r.x0 + 0.02, r.z1, 1, 0, 0, WALL_H);
  ti(r.x0 + 0.02, -9.4, r.x0 + 0.02, -8.4, 1, 0, DOOR_H, WALL_H); ti(r.x0 + 0.02, -7.6, r.x0 + 0.02, -6.6, 1, 0, DOOR_H, WALL_H);
  // the partition between the men's and the women's
  ti(r.x0, -7.98, r.x1, -7.98, 0, 1, 0, WALL_H); ti(r.x0, -8.02, r.x1, -8.02, 0, -1, 0, WALL_H);
  // the outside of the annex
  const so = (ax, az, bx, bz, nx, nz) => wallPlane(ax, az, bx, bz, nx, nz, 0, WALL_H + 0.1, wallMats.brick, 2);
  so(r.x0, r.z0 - 0.02, r.x1 + 0.02, r.z0 - 0.02, 0, -1); so(r.x0, r.z1 + 0.02, r.x1 + 0.02, r.z1 + 0.02, 0, 1); so(r.x1 + 0.02, r.z0 - 0.02, r.x1 + 0.02, r.z1 + 0.02, 1, 0);
}
// the VIP lounge is entered from the main bar through a small vestibule in its corner, left of Charon
wallLine(-5, -11, 2, -11, 0, 1, [[0.6, 1.8]], wallMats.red, 2);
wallLine(-3.3, -4, 2, -4, 0, -1, [], wallMats.red, 2);
wallLine(-5, -11, -5, -5.9, 1, 0, [], wallMats.red, 2);
wallLine(2, -11, 2, -4, -1, 0, [], wallMats.red, 2);
wallLine(-3.3, -5.9, -3.3, -4, 1, 0, [], wallMats.red, 2);
wallLine(-5, -5.9, -3.3, -5.9, 0, -1, [[0.4, 1.4]], wallMats.red, 2);
roomWalls(ROOMS.vest, { front: [[0.4, 1.4]], back: [[0.4, 1.4]] }, wallMats.red);

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
doorFrame(8.6, -4, 10.4, -4); doorFrame(5, -1, 5, 1); doorFrame(-5, 0.5, -5, 2.5); doorFrame(-10, -4, -8.4, -4); doorFrame(14, -1, 14, 1); doorFrame(-4.6, -4, -3.6, -4); doorFrame(-4.6, -5.9, -3.6, -5.9);
// the VIP doors stay closed: black lacquer leaves with brass kick plates and round porthole windows
for (const z of [-4, -5.9]) for (const e of [-1, 1]) {
  const x0 = e < 0 ? -4.55 : -4.1, x1 = e < 0 ? -4.1 : -3.65;
  S.push(box(x0, x1, 0, 2.38, z - 0.035, z + 0.035, [14, 12, 16], 0.02));
  S.push(box(x0 + 0.03, x1 - 0.03, 0.04, 0.3, z - 0.045, z + 0.045, BRASS_D, 0.02));
  S.push(cyl(V((x0 + x1) / 2, 1.6, z - 0.046), V((x0 + x1) / 2, 1.6, z + 0.046), 0.11, 0.11, BRASS, { n: 12, amt: 0.02 }));
  G.push(cyl(V((x0 + x1) / 2, 1.6, z - 0.05), V((x0 + x1) / 2, 1.6, z + 0.05), 0.085, 0.085, [255, 70, 150], { n: 12, amt: 0 }));
  S.push(box(e < 0 ? x1 - 0.06 : x0 + 0.02, e < 0 ? x1 - 0.02 : x0 + 0.06, 0.9, 1.3, z - 0.06, z + 0.06, BRASS, 0.02));
} doorFrame(-4.4, -11, -3.2, -11); doorFrame(5, -7.0, 5, -5.8);

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
// jukebox in the billiards room, against the front wall by the bar door (built facing +x, turned to face into the room)
const JUKE = { x: -5.75, z: 3.985 };
S.push(...placeParts([box(0, 0.5, 0, 1.2, -0.4, 0.4, LACQUER), cyl(V(0.25, 1.2, -0.4), V(0.25, 1.2, 0.4), 0.25, 0.25, LACQUER, { n: 12 }),
  tube([V(0.51, 0.05, -0.38), V(0.51, 1.2, -0.38), V(0.51, 1.38, -0.22), V(0.51, 1.45, 0), V(0.51, 1.38, 0.22), V(0.51, 1.2, 0.38), V(0.51, 0.05, 0.38)], [0.014, 0.014, 0.014, 0.014, 0.014, 0.014, 0.014], BRASS, { n: 4, smooth: false, amt: 0.04 })], JUKE.x, JUKE.z, Math.PI / 2, 0));
// a dark backing board for the coin leaderboard, where the jukebox used to stand next to Charon
S.push(box(-4.99, -4.97, 0.96, 2.44, -2.22, -0.98, [40, 30, 16], 0.02));
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

// ===== DANCE ROOM (east of the lounge): light-up floor, DJ riser with an LED wall, mirror ball, lasers, neon =====
const DF = { x: 18.3, z: 0, n: 6, s: 0.75 };
S.push(box(DF.x - DF.s * 3 - 0.06, DF.x + DF.s * 3 + 0.06, -0.02, 0.012, DF.z - DF.s * 3 - 0.06, DF.z + DF.s * 3 + 0.06, BRASS_D, 0.02));
// DJ booth on a low riser against the far wall
S.push(box(21.5, 23.0, 0, 0.16, -2.2, 2.2, [18, 18, 22], 0.03));
G.push(box(21.47, 21.5, 0.06, 0.1, -2.2, 2.2, [70, 110, 255], 0));
S.push(box(21.9, 22.6, 0.16, 1.16, -1.3, 1.3, LACQUER));
S.push(box(21.88, 21.9, 0.26, 1.06, -1.2, 1.2, BRASS_D, 0.03));
S.push(box(21.85, 22.65, 1.16, 1.21, -1.35, 1.35, MARBLE));
for (const z of [-0.55, 0.55]) {
  S.push(cyl(V(22.25, 1.21, z), V(22.25, 1.24, z), 0.2, 0.2, [30, 30, 34], { n: 12 }));
  S.push(cyl(V(22.25, 1.24, z), V(22.25, 1.25, z), 0.16, 0.16, [12, 12, 14], { n: 12 }));
  G.push(cyl(V(22.25, 1.25, z), V(22.25, 1.252, z), 0.03, 0.03, [120, 160, 255], { n: 8, amt: 0 }));
}
S.push(box(22.1, 22.4, 1.21, 1.26, -0.2, 0.2, [40, 40, 46], 0.03));
for (let k = 0; k < 6; k++) G.push(box(22.12 + (k % 3) * 0.1, 22.16 + (k % 3) * 0.1, 1.26, 1.265, -0.15 + Math.floor(k / 3) * 0.2, -0.1 + Math.floor(k / 3) * 0.2, [[255, 60, 160], [60, 220, 255], [255, 200, 60]][k % 3], 0));
G.push(box(21.875, 21.88, 0.36, 0.46, -1.1, 1.1, [80, 120, 255], 0));
// speaker stacks in the corners, bigger at the DJ end
for (const [x, z, big] of [[22.4, -3.3, 1], [22.4, 3.3, 1], [14.6, -3.4, 0], [14.6, 3.4, 0]]) {
  const h = big ? 2.1 : 1.6;
  S.push(box(x - 0.36, x + 0.36, 0, h, z - 0.36, z + 0.36, LACQUER));
  const f = x > 18 ? -1 : 1;
  for (const [y, r] of big ? [[0.45, 0.24], [1.15, 0.24], [1.75, 0.13]] : [[0.45, 0.22], [1.1, 0.13]]) {
    S.push(cyl(V(x + f * 0.36, y, z), V(x + f * 0.37, y, z), r + 0.02, r + 0.02, BRASS_D, { n: 12 }));
    S.push(cyl(V(x + f * 0.365, y, z), V(x + f * 0.39, y, z), r, r, [24, 24, 28], { n: 12 }));
  }
}
// a drinks ledge with stools along the front wall, a long booth bench along the back
S.push(box(15.3, 21.0, 1.0, 1.06, 3.55, 3.95, MARBLE)); S.push(box(15.3, 21.0, 0.0, 1.0, 3.85, 3.95, LACQUER));
G.push(box(15.3, 21.0, 0.96, 0.98, 3.54, 3.56, [90, 70, 255], 0));
const DANCE_STOOLS = [15.9, 16.9, 17.9, 19.4, 20.4];
for (const x of DANCE_STOOLS) {
  S.push(cyl(V(x, 0, 3.2), V(x, 0.03, 3.2), 0.2, 0.18, [24, 24, 28], { n: 10 }));
  S.push(cyl(V(x, 0.03, 3.2), V(x, 0.68, 3.2), 0.03, 0.03, [150, 152, 160], { n: 6 }));
  S.push(cyl(V(x, 0.68, 3.2), V(x, 0.74, 3.2), 0.19, 0.19, [30, 22, 40], { n: 12 }));
}
S.push(box(15.0, 21.2, 0.08, 0.42, -3.95, -3.45, [30, 24, 44])); S.push(box(15.0, 21.2, 0.42, 1.0, -3.98, -3.8, [36, 28, 52]));
G.push(box(15.0, 21.2, 0.03, 0.06, -3.44, -3.42, [140, 70, 255], 0));
const DANCE_BENCH = [15.6, 16.6, 17.6, 18.6, 19.6, 20.6];
// light rig across the ceiling, the mirror ball hanging from it
S.push(box(15.2, 22.0, 3.05, 3.12, -0.05, 0.05, [30, 30, 34], 0.03));
S.push(box(DF.x - 0.05, DF.x + 0.05, 3.05, 3.12, -3.6, 3.6, [30, 30, 34], 0.03));
S.push(cyl(V(DF.x, 3.05, DF.z), V(DF.x, 2.82, DF.z), 0.008, 0.008, [150, 152, 160], { n: 4 }));
const mirrorBall = (() => {
  const P = [], R = 0.26, rings = [];
  for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + Math.PI * k / 8, r = Math.max(0.001, Math.cos(a) * R); rings.push(rring(Math.sin(a) * R, r * 2, r * 2, 0, 0, 16, 2)); }
  P.push(loft(rings, [170, 172, 180], { amt: 0.35 }));
  const m = new THREE.Mesh(toGeometry(P), ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 120, specular: 0xffffff, emissive: 0x202030 })));
  m.position.set(DF.x, 2.55, DF.z); scene.add(m); return m;
})();
// the LED wall behind the DJ: a little equaliser that dances to the jukebox
const ledCanvas = document.createElement('canvas'); ledCanvas.width = 32; ledCanvas.height = 14;
const ledTex = new THREE.CanvasTexture(ledCanvas); ledTex.magFilter = THREE.NearestFilter; ledTex.minFilter = THREE.NearestFilter;
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.55), new THREE.MeshBasicMaterial({ map: ledTex, fog: false })); m.position.set(22.88, 2.1, 0); m.rotation.y = -Math.PI / 2; scene.add(m); }
S.push(box(22.9, 22.97, 1.27, 2.93, -1.86, 1.86, [10, 10, 12], 0.02));
// neon strips around the top of the walls, all one colour that moves with the music
const danceNeonMat = new THREE.MeshBasicMaterial({ color: 0x4a7cff, fog: false });
{
  const P = [];
  P.push(box(14.05, 22.95, 3.08, 3.12, 3.92, 3.96, [255, 255, 255], 0), box(14.05, 22.95, 3.08, 3.12, -3.96, -3.92, [255, 255, 255], 0));
  P.push(box(22.92, 22.96, 3.08, 3.12, -3.95, 3.95, [255, 255, 255], 0), box(14.04, 14.08, 3.08, 3.12, -3.95, 3.95, [255, 255, 255], 0));
  for (const z of [-3.93, 3.93]) for (const x of [16, 18.3, 20.6]) P.push(box(x - 0.02, x + 0.02, 0.4, 2.9, z - 0.02, z + 0.02, [255, 255, 255], 0));
  scene.add(new THREE.Mesh(toGeometry(P), danceNeonMat));
}
// laser fans from the DJ riser and the mirror ball's sparkles on the walls
const lasers = [];
for (let k = 0; k < 3; k++) {
  const mat = new THREE.MeshBasicMaterial({ color: [0x40ff90, 0xff40c0, 0x40c8ff][k], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 9, 4, 1, true), mat);
  beam.rotation.z = Math.PI / 2; beam.position.x = -4.5;
  const pivot = new THREE.Group(); pivot.position.set(22.3, 2.95, -0.9 + k * 0.9); pivot.add(beam); scene.add(pivot);
  lasers.push({ pivot, mat, k });
}
const SPARK_N = 90, sparkPos = new Float32Array(SPARK_N * 3), sparkDir = [];
for (let i = 0; i < SPARK_N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); sparkDir.push([r * Math.cos(a), -Math.abs(u) * 0.8 - 0.05, r * Math.sin(a)]); }
const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.06, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
sparks.frustumCulled = false; scene.add(sparks);
const danceHazeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(120,150,255,0.45)'); g.addColorStop(1, 'rgba(90,110,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const DANCE_HAZE = [];
for (let i = 0; i < 6; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: danceHazeTex, color: i % 2 ? 0x8a6aff : 0x5a8aff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.scale.set(3.6, 1.4, 1); sp.position.set(15.6 + (i % 3) * 2.8, 0.7 + (i % 2) * 1.2, -1.8 + Math.floor(i / 3) * 3.6); scene.add(sp); DANCE_HAZE.push({ sp, x: sp.position.x, k: i });
}
let ledBeat = -1;
function danceFxTick(dt, t, beat) {
  const near = Math.hypot(camera.position.x - 18.5, camera.position.z) < 16;
  mirrorBall.rotation.y = t * 0.6;
  const hue = [0x4a7cff, 0x8a4aff, 0xff4ab8, 0x3ad0ff][Math.floor(beat / 16) % 4];
  danceNeonMat.color.setHex(hue);
  const kb = Math.pow(1 - (beat % 1), 2);
  danceNeonMat.color.multiplyScalar(0.55 + 0.45 * kb);
  for (const h of DANCE_HAZE) { h.sp.position.x = h.x + 0.5 * Math.sin(t * 0.09 + h.k); h.sp.material.opacity = 0.12 + 0.06 * Math.sin(t * 0.4 + h.k); }
  const sec = Math.floor(beat / 32) % 4;
  for (const L of lasers) {
    L.pivot.rotation.y = 0.45 * Math.sin(t * 0.9 + L.k * 2.1); L.pivot.rotation.z = -0.18 - 0.12 * Math.sin(t * 0.7 + L.k);
    L.mat.opacity = sec === 1 || sec === 3 ? 0.35 * (0.4 + 0.6 * kb) : 0;
  }
  if (!near) { sparks.visible = false; return; }
  sparks.visible = true;
  const c = Math.cos(t * 0.6), s = Math.sin(t * 0.6), bx = DF.x, by = 2.55, bz = DF.z;
  for (let i = 0; i < SPARK_N; i++) {
    const d = sparkDir[i], dx = d[0] * c - d[2] * s, dz = d[0] * s + d[2] * c, dy = d[1];
    let k = 99;
    if (dx > 0) k = Math.min(k, (22.9 - bx) / dx); else if (dx < 0) k = Math.min(k, (14.1 - bx) / dx);
    if (dz > 0) k = Math.min(k, (3.9 - bz) / dz); else if (dz < 0) k = Math.min(k, (-3.9 - bz) / dz);
    if (dy < 0) k = Math.min(k, (0.03 - by) / dy);
    sparkPos[i * 3] = bx + dx * k; sparkPos[i * 3 + 1] = by + dy * k; sparkPos[i * 3 + 2] = bz + dz * k;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  const qb = Math.floor(beat * 4);
  if (qb !== ledBeat) {
    ledBeat = qb;
    const x = ledCanvas.getContext('2d'); x.fillStyle = '#05060c'; x.fillRect(0, 0, 32, 14);
    const pal = ['#3a6cff', '#8a4aff', '#ff4ab8', '#3ad0ff'], base = Math.floor(beat / 16) % 4;
    for (let i = 0; i < 16; i++) {
      const h = Math.max(1, Math.round(12 * Math.abs(Math.sin(i * 0.7 + beat * 1.3)) * (0.5 + 0.5 * kb) * (0.6 + 0.4 * Math.random())));
      x.fillStyle = pal[(base + (i > 10 ? 1 : 0)) % 4]; x.fillRect(i * 2, 13 - h, 1, h);
      x.fillStyle = '#ffffff'; x.fillRect(i * 2, 12 - h, 1, 1);
    }
    ledTex.needsUpdate = true;
  }
}

// ===== LOUNGE (where the dance room used to be): walnut panelling, red damask, leather wingbacks, a fire =====
const L_OXB = [74, 22, 20], L_COGNAC = [104, 56, 28], L_GREEN = [26, 48, 34], L_WAL = [58, 34, 20], L_WAL_D = [36, 21, 13];
const LOUNGE_TABLES = [], LOUNGE_CLUB = [];
// a deep wingback armchair, built facing +z around the sitter (seat top at 0.45)
function wingChair(x, z, yaw, col) {
  const P = [], d = col.map((v) => v * 0.72), btn = col.map((v) => v * 0.45);
  P.push(box(-0.36, 0.36, 0.07, 0.3, -0.38, 0.34, d, 0.04));
  P.push(loft([rring(0.3, 0.6, 0.56, 0, 0.06, 12, 5), rring(0.43, 0.6, 0.56, 0, 0.06, 12, 5), rring(0.46, 0.54, 0.5, 0, 0.06, 12, 5)], col, { smooth: true, amt: 0.04 }));
  P.push(loft([[V(-0.34, 0.3, -0.39), V(0.34, 0.3, -0.39), V(0.34, 0.3, -0.21), V(-0.34, 0.3, -0.21)],
    [V(-0.35, 0.9, -0.42), V(0.35, 0.9, -0.42), V(0.35, 0.9, -0.26), V(-0.35, 0.9, -0.26)],
    [V(-0.33, 1.12, -0.45), V(0.33, 1.12, -0.45), V(0.33, 1.12, -0.31), V(-0.33, 1.12, -0.31)],
    [V(-0.25, 1.18, -0.45), V(0.25, 1.18, -0.45), V(0.25, 1.18, -0.34), V(-0.25, 1.18, -0.34)]], col, { amt: 0.04 }));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - (r % 2); k++) {
    const bx = -0.21 + k * 0.14 + (r % 2) * 0.07, by = 0.58 + r * 0.17, bz = -0.21 - (by - 0.3) * 0.08 - 0.005;
    P.push(box(bx - 0.012, bx + 0.012, by - 0.012, by + 0.012, bz - 0.006, bz + 0.004, btn, 0));
  }
  for (const e of [-1, 1]) {
    // wings and rolled arms
    P.push(loft([[V(e * 0.33, 0.62, -0.42), V(e * 0.4, 0.62, -0.42), V(e * 0.4, 0.62, -0.05), V(e * 0.33, 0.62, -0.05)], [V(e * 0.33, 1.08, -0.44), V(e * 0.41, 1.08, -0.44), V(e * 0.41, 1.02, -0.12), V(e * 0.33, 1.02, -0.12)]], col, { amt: 0.04 }));
    P.push(box(e * 0.3 - (e > 0 ? 0 : 0.12), e * 0.3 + (e > 0 ? 0.12 : 0), 0.3, 0.6, -0.38, 0.33, col, 0.04));
    P.push(tube([V(e * 0.37, 0.62, -0.38), V(e * 0.38, 0.64, 0.0), V(e * 0.37, 0.62, 0.35)], [0.075, 0.08, 0.075], col, { n: 8, amt: 0.04 }));
    for (const zz of [-0.32, 0.28]) P.push(cyl(V(e * 0.3, 0, zz), V(e * 0.3, 0.07, zz), 0.03, 0.04, L_WAL_D, { n: 6 }));
  }
  S.push(...placeParts(P, x, z, yaw, 0));
}
function chesterfield(x, z, yaw, len, col) {
  const P = [], d = col.map((v) => v * 0.72), btn = col.map((v) => v * 0.45), h = len / 2;
  P.push(box(-h, h, 0.07, 0.3, -0.42, 0.38, d, 0.04));
  P.push(loft([rring(0.3, len - 0.3, 0.6, 0, 0.06, 14, 6), rring(0.44, len - 0.3, 0.6, 0, 0.06, 14, 6), rring(0.47, len - 0.36, 0.54, 0, 0.06, 14, 6)], col, { smooth: true, amt: 0.04 }));
  P.push(box(-h, h, 0.3, 0.86, -0.44, -0.22, col, 0.04));
  P.push(tube([V(-h, 0.86, -0.33), V(0, 0.88, -0.33), V(h, 0.86, -0.33)], [0.09, 0.09, 0.09], col, { n: 8, amt: 0.04 }));
  for (let r = 0; r < 2; r++) for (let k = 0; k < Math.floor(len / 0.18); k++) {
    const bx = -h + 0.2 + k * 0.18 + (r % 2) * 0.09; if (bx > h - 0.15) continue;
    P.push(box(bx - 0.012, bx + 0.012, 0.56 + r * 0.16 - 0.012, 0.56 + r * 0.16 + 0.012, -0.226, -0.216, btn, 0));
  }
  for (const e of [-1, 1]) {
    P.push(box(e * h - (e > 0 ? 0.16 : 0), e * h + (e > 0 ? 0 : 0.16), 0.3, 0.78, -0.42, 0.38, col, 0.04));
    P.push(tube([V(e * (h - 0.08), 0.8, -0.42), V(e * (h - 0.07), 0.82, 0.0), V(e * (h - 0.08), 0.8, 0.38)], [0.09, 0.095, 0.09], col, { n: 8, amt: 0.04 }));
    for (const zz of [-0.36, 0.32]) P.push(cyl(V(e * (h - 0.08), 0, zz), V(e * (h - 0.08), 0.07, zz), 0.03, 0.04, L_WAL_D, { n: 6 }));
  }
  S.push(...placeParts(P, x, z, yaw, 0));
}
// a green-shaded banker's lamp: a little pool of light on each table
function bankLamp(x, y, z) {
  S.push(box(x - 0.09, x + 0.09, y, y + 0.025, z - 0.06, z + 0.06, BRASS_D, 0.03));
  S.push(cyl(V(x, y + 0.025, z), V(x, y + 0.3, z), 0.012, 0.012, BRASS, { n: 5 }));
  S.push(loft([[V(x - 0.17, y + 0.27, z - 0.05), V(x + 0.17, y + 0.27, z - 0.05), V(x + 0.17, y + 0.27, z + 0.08), V(x - 0.17, y + 0.27, z + 0.08)], [V(x - 0.16, y + 0.36, z - 0.01), V(x + 0.16, y + 0.36, z - 0.01), V(x + 0.16, y + 0.36, z + 0.03), V(x - 0.16, y + 0.36, z + 0.03)]], [20, 92, 46], { amt: 0.03 }));
  G.push(box(x - 0.15, x + 0.15, y + 0.268, y + 0.272, z - 0.04, z + 0.07, [255, 220, 150], 0));
}
function decanterSet(x, y, z) {
  S.push(loft([rring(y, 0.1, 0.1, x, z, 10, 2), rring(y + 0.12, 0.12, 0.12, x, z, 10, 2), rring(y + 0.2, 0.06, 0.06, x, z, 10, 2), rring(y + 0.26, 0.035, 0.035, x, z, 10, 2)], [120, 74, 30], { smooth: true, amt: 0.03 }));
  S.push(loft([rring(y + 0.26, 0.05, 0.05, x, z, 8, 2), rring(y + 0.3, 0.06, 0.06, x, z, 8, 2), rring(y + 0.33, 0.01, 0.01, x, z, 8, 2)], [180, 196, 206], { smooth: true, amt: 0.03 }));
  for (const [dx, dz] of [[0.14, 0.05], [-0.12, 0.1]]) S.push(cyl(V(x + dx, y, z + dz), V(x + dx, y + 0.07, z + dz), 0.03, 0.034, [150, 110, 50], { n: 8, amt: 0.03 }));
}
function lTable(x, z, kind) {
  if (kind === 'low') {
    S.push(box(x - 0.55, x + 0.55, 0.36, 0.42, z - 0.3, z + 0.3, L_WAL, 0.04));
    S.push(box(x - 0.5, x + 0.5, 0.42, 0.44, z - 0.26, z + 0.26, [30, 46, 36], 0.03));
    for (const [dx, dz] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]]) S.push(cyl(V(x + dx, 0, z + dz), V(x + dx, 0.36, z + dz), 0.025, 0.03, L_WAL_D, { n: 6 }));
    decanterSet(x - 0.2, 0.44, z);
    for (const dx of [0.2, 0.32]) { S.push(cyl(V(x + dx, 0.44, z - 0.05), V(x + dx, 0.47, z - 0.05), 0.022, 0.022, [230, 220, 200], { n: 8 })); G.push(cyl(V(x + dx, 0.47, z - 0.05), V(x + dx, 0.5, z - 0.05), 0.004, 0.002, [255, 190, 90], { n: 4, amt: 0 })); }
    return;
  }
  S.push(cyl(V(x, 0, z), V(x, 0.04, z), 0.26, 0.24, L_WAL_D, { n: 12 }));
  S.push(cyl(V(x, 0.04, z), V(x, 0.56, z), 0.05, 0.04, L_WAL, { n: 8 }));
  S.push(cyl(V(x, 0.56, z), V(x, 0.6, z), 0.44, 0.44, L_WAL, { n: 18, amt: 0.04 }));
  S.push(cyl(V(x, 0.6, z), V(x, 0.605, z), 0.38, 0.38, [36, 52, 40], { n: 18, amt: 0.03 }));
  bankLamp(x + 0.1, 0.605, z - 0.12);
  decanterSet(x - 0.16, 0.605, z + 0.1);
  S.push(cyl(V(x + 0.18, 0.605, z + 0.17), V(x + 0.18, 0.625, z + 0.17), 0.06, 0.05, [30, 30, 34], { n: 10 }));
  S.push(cyl(V(x + 0.14, 0.63, z + 0.16), V(x + 0.26, 0.632, z + 0.2), 0.012, 0.012, [96, 60, 30], { n: 5 }));
}
// table groups: three wingbacks round each table, the fireside sofa and two chairs at the coffee table
function tableGroup(tx, tz, seats, kind) {
  const ti = LOUNGE_TABLES.length; LOUNGE_TABLES.push({ x: tx, z: tz, seats: [] });
  lTable(tx, tz, kind);
  for (const [x, z, col, sofa] of seats) {
    const yaw = Math.atan2(tx - x, tz - z);
    if (!sofa) wingChair(x, z, yaw, col);
    LOUNGE_CLUB.push([x, z, sofa ? 0 : yaw, ti]);
  }
}
tableGroup(6.5, 2.55, [[5.6, 2.55, L_OXB], [7.4, 2.55, L_COGNAC], [6.5, 1.65, L_OXB]]);
tableGroup(12.5, 2.55, [[11.6, 2.55, L_COGNAC], [13.4, 2.55, L_OXB], [12.5, 1.65, L_COGNAC]]);
tableGroup(6.5, -2.55, [[5.6, -2.55, L_GREEN], [7.4, -2.55, L_OXB], [6.5, -1.65, L_GREEN]]);
tableGroup(12.5, -2.55, [[11.6, -2.55, L_OXB], [13.4, -2.55, L_GREEN], [12.5, -1.65, L_OXB]]);
chesterfield(9.5, 1.82, 0, 1.9, L_OXB);
tableGroup(9.5, 2.75, [[8.95, 1.85, L_OXB, 1], [9.5, 1.85, L_OXB, 1], [10.05, 1.85, L_OXB, 1], [8.45, 2.95, L_COGNAC], [10.55, 2.95, L_COGNAC]], 'low');
// the fireplace on the front wall: black marble surround, brass fender, a log fire; a painting over the mantel
{
  const FX = 9.5, MB = [22, 22, 26];
  S.push(box(FX - 1.1, FX + 1.1, 0, 0.05, 3.3, 3.98, [40, 38, 40], 0.03));
  for (const e of [-1, 1]) S.push(box(FX + e * 0.5 - (e > 0 ? 0 : 0.4), FX + e * 0.5 + (e > 0 ? 0.4 : 0), 0.05, 1.265, 3.72, 3.975, MB, 0.03));
  S.push(box(FX - 0.5, FX + 0.5, 0.86, 1.265, 3.72, 3.975, MB, 0.03));
  S.push(box(FX - 0.5, FX + 0.5, 0.05, 0.86, 3.94, 3.98, [8, 6, 6], 0.02));
  for (const e of [-1, 1]) S.push(box(FX + e * 0.5 - 0.01, FX + e * 0.5 + 0.01, 0.05, 0.86, 3.73, 3.94, [10, 8, 8], 0.02));
  S.push(box(FX - 1.05, FX + 1.05, 1.3, 1.38, 3.6, 3.98, MB, 0.03));
  S.push(box(FX - 1.06, FX + 1.06, 1.27, 1.295, 3.62, 3.975, BRASS, 0.02));
  for (const e of [-1, 1]) S.push(box(FX + e * 0.62 - 0.08, FX + e * 0.62 + 0.08, 0.05, 1.265, 3.66, 3.725, MB, 0.03));
  S.push(box(FX - 0.6, FX + 0.6, 0.05, 0.14, 3.38, 3.42, BRASS, 0.02));
  for (const [x0, x1] of [[-0.35, 0.3], [-0.25, 0.38]]) S.push(cyl(V(FX + x0, 0.18, 3.82), V(FX + x1, 0.22, 3.86), 0.06, 0.06, [50, 30, 18], { n: 6 }));
  G.push(box(FX - 0.32, FX + 0.32, 0.14, 0.2, 3.78, 3.92, [255, 110, 30], 0));
  for (const dx of [-0.75, 0.75]) { S.push(cyl(V(FX + dx, 1.38, 3.8), V(FX + dx, 1.62, 3.8), 0.025, 0.025, [236, 228, 210], { n: 6 })); G.push(cyl(V(FX + dx, 1.62, 3.8), V(FX + dx, 1.67, 3.8), 0.008, 0.003, [255, 190, 90], { n: 4, amt: 0 })); }
  S.push(box(FX - 0.12, FX + 0.12, 1.38, 1.62, 3.78, 3.9, L_WAL, 0.03)); G.push(cyl(V(FX, 1.52, 3.776), V(FX, 1.52, 3.772), 0.07, 0.07, [230, 220, 190], { n: 10, amt: 0 }));
  S.push(box(FX - 0.66, FX + 0.66, 1.62, 2.64, 3.93, 3.97, BRASS_D, 0.03));
}
const loungePainting = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.86), decal({ map: canvasTex(32, 24, (x, w, h) => {
  for (let j = 0; j < h; j++) { const k = j / h; x.fillStyle = `rgb(${Math.round(40 + 70 * k)},${Math.round(30 + 40 * k)},${Math.round(30 + 10 * k)})`; x.fillRect(0, j, w, 1); }
  x.fillStyle = 'rgb(22,30,20)'; for (let i = 0; i < w; i++) { const hh = 6 + Math.round(3 * Math.sin(i * 0.4) + 2 * Math.sin(i * 1.3)); x.fillRect(i, h - hh, 1, hh); }
  x.fillStyle = 'rgb(220,180,110)'; x.fillRect(20, 5, 3, 3);
  x.fillStyle = 'rgb(30,20,14)'; x.fillRect(8, 12, 1, 8); x.fillRect(6, 11, 5, 3);
}) }));
loungePainting.position.set(9.5, 2.13, 3.925); loungePainting.rotation.y = Math.PI; scene.add(loungePainting);
// bookcases either side of the fire, a drinks cabinet and a long-case clock at the back
function bookcase(x0, x1, z0, z1, face) {
  S.push(box(x0, x1, 0, 0.1, z0, z1, L_WAL_D, 0.03));
  S.push(box(x0, x1, 0.1, 2.55, face > 0 ? z0 : z1 - 0.04, face > 0 ? z0 + 0.04 : z1, L_WAL_D, 0.03));
  for (const xx of [x0, x1 - 0.04]) S.push(box(xx, xx + 0.04, 0.1, 2.55, z0, z1, L_WAL_D, 0.03));
  S.push(box(x0 - 0.03, x1 + 0.03, 2.55, 2.63, z0 - (face < 0 ? 0.04 : 0), z1 + (face > 0 ? 0.04 : 0), L_WAL, 0.03));
  const fz = face > 0 ? z1 : z0, back = face > 0 ? z0 + 0.04 : z1 - 0.04;
  const BOOK = [[90, 20, 20], [30, 50, 36], [24, 30, 60], [110, 80, 40], [60, 30, 50], [140, 120, 90], [40, 40, 44]];
  for (let s = 0; s < 5; s++) {
    const y = 0.12 + s * 0.48;
    S.push(box(x0 + 0.03, x1 - 0.03, y - 0.03, y, Math.min(fz, back), Math.max(fz, back), L_WAL, 0.03));
    let bx = x0 + 0.06;
    while (bx < x1 - 0.1) {
      const w = 0.035 + rr() * 0.04, h = 0.26 + rr() * 0.12;
      if (rr() < 0.06) { bx += 0.12; continue; }
      const zA = back, zB = back + face * (0.18 + rr() * 0.04);
      S.push(box(bx, bx + w, y, y + h, Math.min(zA, zB), Math.max(zA, zB), BOOK[Math.floor(rr() * BOOK.length)], 0.12));
      bx += w + 0.004;
    }
  }
}
bookcase(5.3, 8.1, 3.62, 3.98, -1);
bookcase(10.9, 13.7, 3.62, 3.98, -1);
S.push(box(7.3, 8.3, 0, 0.95, -3.98, -3.55, L_WAL_D, 0.03)); S.push(box(7.28, 8.32, 0.95, 0.99, -3.985, -3.53, MARBLE, 0.03));
for (let k = 0; k < 5; k++) S.push(cyl(V(7.45 + k * 0.18, 0.99, -3.75), V(7.45 + k * 0.18, 1.15 + (k % 2) * 0.08, -3.75), 0.035, 0.03, [[110, 60, 20], [40, 70, 40], [160, 120, 50]][k % 3], { n: 8, amt: 0.04 }));
S.push(box(13.3, 13.85, 0, 2.15, -3.98, -3.62, L_WAL_D, 0.03)); S.push(cyl(V(13.575, 1.75, -3.61), V(13.575, 1.75, -3.6), 0.17, 0.17, [220, 210, 180], { n: 14, amt: 0 }));
S.push(box(13.36, 13.79, 0.5, 1.4, -3.63, -3.6, [20, 14, 10], 0.02)); S.push(cyl(V(13.575, 1.2, -3.61), V(13.575, 0.75, -3.61), 0.008, 0.008, BRASS, { n: 4 })); S.push(cyl(V(13.575, 0.72, -3.615), V(13.575, 0.72, -3.605), 0.05, 0.05, BRASS, { n: 8 }));
// red velvet drapes on the side walls, two brass chandeliers with candle bulbs
for (const [x, nx] of [[5.06, 1], [13.94, -1]]) for (const zc of [-2.6, 2.6]) {
  for (let k = 0; k < 6; k++) { const z = zc - 0.55 + k * 0.22; S.push(tube([V(x, 0.02, z), V(x + nx * (0.05 + 0.03 * (k % 2)), 1.4, z), V(x, 2.95, z)], [0.07, 0.08, 0.06], [92, 12, 20], { n: 6, amt: 0.08 })); }
  S.push(box(x - 0.04, x + 0.04, 2.95, 3.02, zc - 0.7, zc + 0.7, BRASS, 0.02));
}
for (const cx of [7.25, 11.75]) {
  S.push(cyl(V(cx, 3.2, 0), V(cx, 2.75, 0), 0.01, 0.01, BRASS_D, { n: 4 }));
  S.push(loft([rring(2.62, 0.04, 0.04, cx, 0, 8, 2), rring(2.68, 0.2, 0.2, cx, 0, 8, 2), rring(2.76, 0.08, 0.08, cx, 0, 8, 2)], BRASS, { amt: 0.03 }));
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, ax = cx + Math.cos(a) * 0.48, az = Math.sin(a) * 0.48;
    S.push(tube([V(cx, 2.66, 0), V(cx + Math.cos(a) * 0.3, 2.56, Math.sin(a) * 0.3), V(ax, 2.62, az)], [0.012, 0.012, 0.012], BRASS, { n: 4 }));
    S.push(cyl(V(ax, 2.62, az), V(ax, 2.7, az), 0.02, 0.016, [236, 228, 210], { n: 6 }));
    G.push(loft([rring(2.7, 0.01, 0.01, ax, az, 6, 2), rring(2.74, 0.05, 0.05, ax, az, 6, 2), rring(2.79, 0.01, 0.01, ax, az, 6, 2)], [255, 200, 120], { amt: 0 }));
  }
}
const loungeLights = [7.25, 11.75].map((x) => pLight(0xffa860, 0.85, 6.5, x, 2.4, 0));
const hearthLight = pLight(0xff7a30, 1.1, 5.5, 9.5, 0.7, 3.2);
// flames: a few flickering additive cards in the firebox
const flameTex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 32; const x = c.getContext('2d'), g = x.createLinearGradient(0, 32, 0, 0); g.addColorStop(0, 'rgba(255,200,80,0.95)'); g.addColorStop(0.5, 'rgba(255,110,30,0.7)'); g.addColorStop(1, 'rgba(255,60,10,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(8, 0); x.quadraticCurveTo(16, 20, 8, 32); x.quadraticCurveTo(0, 20, 8, 0); x.fill(); return new THREE.CanvasTexture(c); })();
const FLAMES = [];
for (let k = 0; k < 4; k++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.set(9.5 - 0.27 + k * 0.18, 0.36, 3.84); sp.scale.set(0.2, 0.36, 1); scene.add(sp); FLAMES.push(sp);
}
function loungeTick(dt, t) {
  const f = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1) + 0.1 * Math.sin(t * 2.1);
  hearthLight.intensity = 1.1 * f;
  FLAMES.forEach((sp, k) => { const s = 0.85 + 0.25 * Math.abs(Math.sin(t * (5 + k) + k * 2)); sp.scale.set(0.18 + 0.04 * Math.sin(t * 9 + k), 0.34 * s, 1); sp.material.opacity = 0.7 + 0.3 * Math.sin(t * 11 + k * 3); });
  for (const l of loungeLights) l.intensity = 0.85 + 0.03 * Math.sin(t * 3.1 + l.position.x);
}
// a Persian rug by the fire and a runner down the middle
const loungeRugTex = (field, border) => canvasTex(32, 48, (x, w, h) => {
  x.fillStyle = border; x.fillRect(0, 0, w, h);
  x.fillStyle = '#c8a050'; x.fillRect(2, 2, w - 4, h - 4);
  x.fillStyle = field; x.fillRect(3, 3, w - 6, h - 6);
  for (let j = 6; j < h - 6; j += 6) for (let i = 6; i < w - 6; i += 6) { x.fillStyle = (i + j) % 12 ? '#2a3050' : '#c8a050'; x.fillRect(i, j, 2, 2); }
  x.fillStyle = '#d8b060'; x.fillRect(w / 2 - 5, h / 2 - 8, 10, 16); x.fillStyle = field; x.fillRect(w / 2 - 3, h / 2 - 6, 6, 12); x.fillStyle = '#2a3050'; x.fillRect(w / 2 - 1, h / 2 - 3, 2, 6);
});
{
  const r1 = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), decal({ map: loungeRugTex('#6a1418', '#1e2440') })); r1.rotation.x = -Math.PI / 2; r1.position.set(9.5, 0.012, 2.35); scene.add(r1);
  const r2 = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.2), decal({ map: loungeRugTex('#4a1014', '#1e2440') })); r2.rotation.x = -Math.PI / 2; r2.position.set(9.5, 0.012, 0); scene.add(r2);
  for (const [x, z] of [[6.5, 2.55], [12.5, 2.55], [6.5, -2.55], [12.5, -2.55]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), decal({ map: loungeRugTex('#3a1a12', '#14181e') })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.011, z); scene.add(r); }
}

// ===== TV ROOM =====
// big screen on the left wall (x = -13), facing the couches
const TV = { x: -12.93, y: 1.75, z: -7.5, w: 3.6, h: 2.02 };
S.push(box(-12.99, -12.95, TV.y - TV.h / 2 - 0.1, TV.y + TV.h / 2 + 0.1, TV.z - TV.w / 2 - 0.1, TV.z + TV.w / 2 + 0.1, [12, 12, 16], 0.03));
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
sconce(-12.97, TV.z + 2.6, 1);

// ===== POOL ROOM (next to the bar): the pool table, a poker table, cue rack and a corner bar =====
const PT = { x: -9.4, z: -0.2, l: 2.6, w: 1.45 };
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
chandelierLinear(PT.x, PT.z, 2.6, 1.5, 0.24);
// three slot machines in the back corner: black and gold cabinets, lit reels, a lever, a lit sign on top
const SLOT_X = [-11.5, -11.0, -10.5];
for (const x of SLOT_X) {
  const z0 = -3.98, z1 = -3.45, CAB = [18, 14, 16], GLD = [176, 136, 52];
  S.push(box(x - 0.22, x + 0.22, 0, 0.8, z0, z1, CAB, 0.03));
  S.push(box(x - 0.2, x + 0.2, 0.8, 1.55, z0, z1 - 0.12, CAB, 0.03));
  S.push(box(x - 0.23, x + 0.23, 0.78, 0.82, z0, z1 + 0.02, GLD, 0.02), box(x - 0.23, x + 0.23, 1.55, 1.6, z0, z1 - 0.1, GLD, 0.02));
  S.push(box(x - 0.2, x + 0.2, 0.8, 0.92, z1 - 0.12, z1, [30, 24, 26], 0.03));
  G.push(box(x - 0.16, x + 0.16, 1.05, 1.32, z1 - 0.125, z1 - 0.118, [255, 236, 190], 0));
  for (const dx of [-0.105, 0, 0.105]) G.push(box(x + dx - 0.045, x + dx + 0.045, 1.1, 1.27, z1 - 0.13, z1 - 0.126, [[230, 40, 50], [250, 210, 60], [70, 200, 120]][Math.round((dx + 0.105) / 0.105)], 0));
  G.push(box(x - 0.2, x + 0.2, 1.6, 1.78, z0, z0 + 0.04, [255, 120, 160], 0));
  S.push(cyl(V(x + 0.24, 1.0, z1 - 0.2), V(x + 0.24, 1.35, z1 - 0.2), 0.012, 0.012, [190, 190, 196], { n: 5 }));
  S.push(cyl(V(x + 0.24, 1.35, z1 - 0.2), V(x + 0.24, 1.4, z1 - 0.2), 0.035, 0.035, [200, 30, 40], { n: 8 }));
  S.push(box(x - 0.12, x + 0.12, 0.42, 0.5, z1 - 0.01, z1 + 0.04, GLD, 0.02));
}
// cue rack on the wall to the card room
S.push(box(-11.79, -11.69, 0.9, 1.0, -3.3, -1.7, LUX_BLACK)); S.push(box(-11.79, -11.69, 1.6, 1.7, -3.3, -1.7, LUX_BLACK));
S.push(box(-11.7, -11.68, 1.66, 1.68, -3.3, -1.7, LUX_GOLD, 0.02));
for (let k = 0; k < 6; k++) S.push(cyl(V(-11.73, 0.92, -3.15 + k * 0.28), V(-11.73, 2.3, -3.15 + k * 0.28), 0.014, 0.008, [150, 110, 70], { n: 4 }));
// a small self-serve bar along the front wall: backlit bottle shelves, a black counter with a pink glow underneath
const MINIBAR = { px: -9.0, pz: 3.985, len: 2.0 };
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
  P.push(cyl(V(1.3, 1.04, 0.34), V(1.3, 1.2, 0.34), 0.07, 0.05, [170, 120, 60], { n: 8, amt: 0.05 }));
  P.push(cyl(V(1.3, 1.2, 0.34), V(1.3, 1.3, 0.34), 0.02, 0.03, [200, 210, 220], { n: 6, amt: 0.04 }));
  for (const x of [1.62, 1.74, 1.86]) P.push(cyl(V(x, 1.04, 0.4), V(x, 1.12, 0.4), 0.032, 0.035, [170, 182, 188], { n: 8, amt: 0.04 }));
  for (const lx of [0.55, 1.45]) {
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
doorFrame(14, -9.4, 14, -8.4); doorFrame(14, -7.6, 14, -6.6);
// solid doors on the restroom and the VIP's back door, so the camera can't peek through
function doorLeaf(px, pz, yaw, w) {
  const WOOD = [34, 20, 16], WOOD_D = [22, 13, 10], P = [box(0, w, 0, DOOR_H - 0.02, -0.03, 0.03, WOOD, 0.03)];
  for (const e of [-1, 1]) {
    P.push(box(0.1, w - 0.1, 0.15, 1.05, e * 0.03, e * 0.04, WOOD_D, 0.02), box(0.1, w - 0.1, 1.2, DOOR_H - 0.15, e * 0.03, e * 0.04, WOOD_D, 0.02));
    P.push(cyl(V(w - 0.14, 1.0, e * 0.03), V(w - 0.14, 1.0, e * 0.09), 0.02, 0.02, BRASS, { n: 5 }), box(w - 0.24, w - 0.1, 0.98, 1.02, e * 0.09, e * 0.11, BRASS, 0.02));
  }
  S.push(...placeParts(P, px, pz, yaw, 0));
}
doorLeaf(14, -7.4, Math.PI / 2, 1.2);
doorLeaf(-4.4, -11, 0, 1.2);
// ===== SECURITY OFFICE: Ben's cubbyhole behind the cinema, a wall of CCTV monitors and a very messy desk =====
doorFrame(-13, -10.85, -13, -9.75);
doorLeaf(-13, -9.75, Math.PI / 2, 1.1);
const SEC_MON = [];      // [z, y] of each monitor's centre on the left wall
{
  const DESK = [40, 34, 30], DESK_T = [58, 50, 42], MET = [44, 46, 50], BEZ = [14, 14, 16];
  // the desk along the monitor wall, on metal legs
  S.push(box(-16.98, -16.1, 0.72, 0.76, -9.6, -5.9, DESK_T, 0.04));
  for (const z of [-9.5, -6.0]) for (const x of [-16.9, -16.2]) S.push(box(x - 0.025, x + 0.025, 0, 0.72, z - 0.025, z + 0.025, MET, 0.02));
  S.push(box(-16.98, -16.95, 0.3, 0.72, -9.6, -5.9, DESK, 0.03));
  // the monitor wall: three by three on a steel frame
  S.push(box(-16.99, -16.96, 0.88, 2.58, -9.45, -6.05, [24, 24, 28], 0.02));
  for (const z of [-8.85, -7.75, -6.65]) for (const y of [1.15, 1.7, 2.25]) {
    S.push(box(-16.96, -16.84, y - 0.27, y + 0.27, z - 0.52, z + 0.52, BEZ, 0.02));
    SEC_MON.push([z, y]);
  }
  // keyboard, mouse, a desk phone, the ashtray and the mess
  S.push(box(-16.55, -16.35, 0.76, 0.785, -8.05, -7.45, [26, 26, 30], 0.02), box(-16.54, -16.36, 0.785, 0.79, -8.02, -7.48, [60, 60, 66], 0.05));
  S.push(box(-16.5, -16.42, 0.76, 0.785, -7.2, -7.12, [30, 30, 34], 0.02));
  S.push(box(-16.85, -16.6, 0.76, 0.84, -9.35, -9.05, [24, 24, 28], 0.02), box(-16.84, -16.62, 0.84, 0.88, -9.34, -9.06, [36, 36, 40], 0.02));
  S.push(cyl(V(-16.4, 0.76, -6.6), V(-16.4, 0.79, -6.6), 0.08, 0.07, [70, 70, 76], { n: 8 }));
  for (let k = 0; k < 6; k++) { const a = k * 1.1; S.push(cyl(V(-16.4 + Math.cos(a) * 0.04, 0.795, -6.6 + Math.sin(a) * 0.04), V(-16.4 + Math.cos(a) * 0.075, 0.8, -6.6 + Math.sin(a) * 0.075), 0.006, 0.006, k % 2 ? [220, 214, 200] : [196, 150, 90], { n: 4, amt: 0 })); }
  S.push(box(-16.75, -16.62, 0.76, 0.78, -6.35, -6.25, [200, 30, 30], 0.03), box(-16.74, -16.63, 0.78, 0.785, -6.34, -6.26, [230, 230, 230], 0.02));
  // energy drink cans: standing, tipped over, one crushed
  const CANS = [[[30, 140, 60], -16.75, -8.3], [[20, 60, 160], -16.7, -6.95], [[20, 20, 22], -16.82, -7.1], [[30, 140, 60], -16.3, -9.2], [[200, 200, 40], -16.88, -8.55]];
  for (const [c, x, z] of CANS) { S.push(cyl(V(x, 0.76, z), V(x, 0.885, z), 0.032, 0.032, c, { n: 7, amt: 0.04 })); S.push(cyl(V(x, 0.885, z), V(x, 0.892, z), 0.026, 0.026, [190, 190, 196], { n: 6, amt: 0 })); }
  S.push(cyl(V(-16.3, 0.79, -6.2), V(-16.18, 0.79, -6.05), 0.032, 0.032, [20, 60, 160], { n: 7, amt: 0.04 }));
  S.push(cyl(V(-16.52, 0.76, -9.45), V(-16.52, 0.81, -9.45), 0.036, 0.02, [30, 140, 60], { n: 6, amt: 0.08 }));
  for (const [x, z] of [[-14.2, -10.6], [-13.4, -6.3], [-15.0, -4.3]]) S.push(cyl(V(x, 0, z), V(x + 0.11, 0.03, z + 0.05), 0.032, 0.032, [30, 140, 60], { n: 6, amt: 0.05 }));
  // paper, a pizza box, a bin overflowing with cans
  S.push(box(-16.7, -16.45, 0.76, 0.765, -8.95, -8.65, [210, 206, 194], 0.03), box(-16.62, -16.38, 0.765, 0.77, -8.9, -8.6, [196, 192, 180], 0.03));
  S.push(box(-14.6, -14.0, 0, 0.05, -4.7, -4.1, [150, 110, 60], 0.03));
  S.push(cyl(V(-13.5, 0, -4.5), V(-13.5, 0.55, -4.5), 0.18, 0.2, [36, 36, 40], { n: 8 }));
  for (let k = 0; k < 5; k++) S.push(cyl(V(-13.5 + Math.cos(k * 1.3) * 0.08, 0.55, -4.5 + Math.sin(k * 1.3) * 0.08), V(-13.5 + Math.cos(k * 1.3) * 0.1, 0.66, -4.5 + Math.sin(k * 1.3) * 0.1), 0.032, 0.032, k % 2 ? [30, 140, 60] : [20, 60, 160], { n: 6, amt: 0.04 }));
  // office chair
  S.push(cyl(V(-15.8, 0.02, -7.75), V(-15.8, 0.45, -7.75), 0.025, 0.025, MET, { n: 5 }));
  for (let k = 0; k < 5; k++) { const a = k * 1.2566; S.push(box(-15.8 + Math.cos(a) * 0.05 - 0.02, -15.8 + Math.cos(a) * 0.05 + 0.02, 0.02, 0.05, -7.75 - 0.02, -7.75 + 0.02, MET, 0.02), cyl(V(-15.8, 0.04, -7.75), V(-15.8 + Math.cos(a) * 0.3, 0.04, -7.75 + Math.sin(a) * 0.3), 0.015, 0.015, MET, { n: 4 })); }
  S.push(box(-16.02, -15.58, 0.43, 0.5, -7.98, -7.52, [24, 24, 26], 0.04));
  S.push(box(-15.6, -15.52, 0.5, 1.15, -7.95, -7.55, [24, 24, 26], 0.04));
  // a filing cabinet, a dim lamp, a gold nameplate
  S.push(box(-14.2, -13.6, 0, 1.3, -10.95, -10.4, [56, 58, 62], 0.04));
  for (const y of [0.4, 0.85, 1.2]) S.push(box(-14.15, -13.65, y - 0.02, y, -10.41, -10.39, [30, 30, 34], 0.02));
  S.push(box(-14.15, -13.95, 2.9, 3.0, -7.7, -7.5, [30, 30, 34], 0.02)); G.push(box(-14.12, -13.98, 2.88, 2.9, -7.67, -7.53, [255, 236, 200], 0));
  S.push(box(-16.4, -16.2, 0.76, 0.84, -6.05, -5.92, [40, 30, 16], 0.02));
}
const benPlate = goldSign('BEN', 96, 32, 22); CARD_SIGNS.push(benPlate);
{
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.067), decal({ map: benPlate.tex, transparent: true }));
  m.position.set(-16.3, 0.8, -5.91); m.rotation.y = 0; scene.add(m);
  const ds = goldSign('SECURITY · BEN', 256, 64, 30); CARD_SIGNS.push(ds);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), decal({ map: ds.tex, transparent: true }));
  d.position.set(-12.97, 2.62, -10.3); d.rotation.y = Math.PI / 2; scene.add(d);
}
// the dance floor's blue and violet glow, held steady in here (it flickers now and then, see below)
const secLight = pLight(0x4a7cff, 1.6, 6.5, -15.2, 2.7, -7.6);
const secLight2 = pLight(0x6a4aff, 1.0, 5.5, -14.0, 2.5, -9.6);
const SEC_NEON = [];
// two spotlights hanging from the ceiling, like the dance floor's, but fixed in place: a cone of blue and of violet light
const SEC_BEAMS = [];
for (const [x, z, col, tz] of [[-15.6, -8.3, 0x4a7cff, 0.12], [-14.4, -6.9, 0x6a4aff, -0.1]]) {
  S.push(box(x - 0.09, x + 0.09, 3.0, 3.2, z - 0.09, z + 0.09, [26, 26, 30], 0.03), cyl(V(x, 2.92, z), V(x, 3.0, z), 0.07, 0.09, [40, 40, 46], { n: 8 }));
  G.push(cyl(V(x, 2.905, z), V(x, 2.92, z), 0.06, 0.06, [200, 220, 255], { n: 8, amt: 0 }));
  const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.9, 10, 1, true), mat); cone.position.y = -1.45;
  const pivot = new THREE.Group(); pivot.position.set(x, 2.92, z); pivot.rotation.z = tz; pivot.add(cone); scene.add(pivot); SEC_BEAMS.push(mat);
}
for (const [ax, az, bx, bz] of [[-16.97, -10.97, -16.97, -4.03], [-16.97, -10.97, -13.03, -10.97], [-16.97, -4.03, -13.03, -4.03]]) {
  const m = new THREE.Mesh(toGeometry([box(Math.min(ax, bx) - (ax === bx ? 0.01 : 0), Math.max(ax, bx) + (ax === bx ? 0.01 : 0), 3.02, 3.06, Math.min(az, bz) - (az === bz ? 0.01 : 0), Math.max(az, bz) + (az === bz ? 0.01 : 0), [74, 124, 255], 0)]), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  scene.add(m); SEC_NEON.push(m);
}
// a poster on the back wall: an original synthwave night-drive print
{
  const tex = canvasTex(32, 46, (x, w, h) => {
    for (let j = 0; j < h; j++) { const k = j / h; x.fillStyle = `rgb(${Math.round(20 + 120 * k)},${Math.round(10 + 20 * k)},${Math.round(60 + 40 * (1 - k))})`; x.fillRect(0, j, w, 1); }
    for (let j = 0; j < 9; j++) { x.fillStyle = j % 2 ? '#ff7a3a' : '#ffcc4a'; const r = 9 - j; x.fillRect(16 - r, 16 + j, r * 2, 1); }
    x.fillStyle = '#1a0830'; x.fillRect(0, 25, w, h - 25);
    x.strokeStyle = '#ff3aa8'; x.lineWidth = 1;
    for (let i = -16; i <= 48; i += 6) { x.beginPath(); x.moveTo(16, 25); x.lineTo(i, h); x.stroke(); }
    for (const y of [27, 30, 34, 39, 45]) { x.fillStyle = '#ff3aa8'; x.fillRect(0, y, w, 1); }
    x.fillStyle = '#05020a'; x.fillRect(4, 13, 1, 12); x.fillRect(2, 13, 5, 1); x.fillRect(1, 14, 2, 1); x.fillRect(6, 14, 2, 1);
    x.fillStyle = '#9ae6ff'; x.fillRect(3, 3, 26, 1); x.fillStyle = '#e8f6ff'; x.font = '6px monospace'; x.fillText('NIGHT', 7, 9);
  });
  const frame = new THREE.Mesh(toGeometry([box(-16.0, -15.1, 1.05, 2.37, -10.99, -10.965, [20, 20, 24], 0.02)]), roomMat); scene.add(frame);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.2), new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(-15.55, 1.71, -10.955); scene.add(m);
}
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
// velvet rope in front of the VIP door, in the main bar
for (const x of [-4.85, -3.35]) {
  S.push(cyl(V(x, 0, -3.55), V(x, 0.03, -3.55), 0.13, 0.12, BRASS_D, { n: 8 }));
  S.push(cyl(V(x, 0.03, -3.55), V(x, 0.95, -3.55), 0.025, 0.025, BRASS, { n: 6 }));
  S.push(cyl(V(x, 0.95, -3.55), V(x, 1.01, -3.55), 0.045, 0.03, BRASS, { n: 6 }));
}
S.push(tube([V(-4.85, 0.9, -3.55), V(-4.47, 0.72, -3.57), V(-4.1, 0.66, -3.58), V(-3.72, 0.72, -3.57), V(-3.35, 0.9, -3.55)], [0.022, 0.022, 0.022, 0.022, 0.022], VELVET, { n: 5 }));
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
for (const [x0, x1, z0, z1] of [[-4.985, -4.96, -10.98, -5.92], [-3.296, -3.275, -5.9, -4.02], [-4.98, -4.62, -5.925, -5.904], [-3.58, -3.3, -5.925, -5.904], [1.96, 1.985, -10.98, -4.02], [-4.98, -4.4, -10.985, -10.96], [-3.2, FX - 1.46, -10.985, -10.96], [FX + 1.46, 1.98, -10.985, -10.96]]) {
  S.push(box(x0, x1, 0, 0.85, z0, z1, MARBLE_BK, 0.03));
  S.push(box(x0 - (x1 - x0 < 0.1 ? 0.005 : 0), x1 + (x1 - x0 < 0.1 ? 0.005 : 0), 0.85, 0.875, z0, z1, [60, 58, 62], 0.02));
}
G.push(box(-4.99, -4.93, 2.98, 3.02, -10.97, -5.93, PINK, 0)); G.push(box(-3.296, -3.24, 2.98, 3.02, -5.9, -4.03, PINK, 0)); G.push(box(1.93, 1.99, 2.98, 3.02, -10.97, -4.03, PINK, 0));
for (const [x, z] of [[-4.94, -10.0], [-3.255, -5.0], [1.94, -10.0], [1.94, -5.6]]) G.push(box(x - 0.012, x + 0.012, 0.95, 1.02, z - 0.13, z + 0.13, PINK_HI, 0));
// the pink wash the cove strips throw down the side walls
const washTex = canvasTex(4, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) { const k = Math.pow(1 - j / (h - 1), 2.2); x.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(20 * k)},${Math.round(80 * k)})`; x.fillRect(0, j, w, 1); }
});
const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
for (const [x, z0, z1, ry] of [[-4.95, -10.97, -5.93, Math.PI / 2], [-3.27, -5.88, -4.03, Math.PI / 2], [1.95, -10.97, -4.03, -Math.PI / 2]]) {
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
const SW = { x: 9.5, z: -8.0, x0: 7.4, x1: 11.6, z0: -9.6, z1: -6.4, water: -0.14, deep: -1.0 };
// basin: sunk into the floor, tiled walls going down, a thin stone coping flush with the floor
const TILE = [168, 196, 206], TILE_D = [120, 150, 164];
for (const [x0, x1, z0, z1, nx, nz] of [[SW.x0, SW.x1, SW.z0, SW.z0, 0, 1], [SW.x0, SW.x1, SW.z1, SW.z1, 0, -1], [SW.x0, SW.x0, SW.z0, SW.z1, 1, 0], [SW.x1, SW.x1, SW.z0, SW.z1, -1, 0]]) {
  const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(len, -SW.deep, Math.ceil(len * 3), 3);
  const m = new THREE.Mesh(g, ps1(new THREE.MeshLambertMaterial({ map: canvasTex(16, 8, (x, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { x.fillStyle = i % 4 === 0 || j % 4 === 0 ? 'rgb(80,120,140)' : `rgb(${150 + rr() * 20},${190 + rr() * 16},${205 + rr() * 16})`; x.fillRect(i, j, 1, 1); } }), side: THREE.FrontSide })));
  m.material.map.wrapS = m.material.map.wrapT = THREE.RepeatWrapping; scaleUV(g, len / 1.2, 1);
  m.position.set((x0 + x1) / 2 + nx * 0.002, SW.deep / 2, (z0 + z1) / 2 + nz * 0.002); m.rotation.y = Math.atan2(nx, nz); scene.add(m);
}
for (const [x0, x1, z0, z1] of [[SW.x0 - 0.22, SW.x1 + 0.22, SW.z0 - 0.22, SW.z0], [SW.x0 - 0.22, SW.x1 + 0.22, SW.z1, SW.z1 + 0.22], [SW.x0 - 0.22, SW.x0, SW.z0, SW.z1], [SW.x1, SW.x1 + 0.22, SW.z0, SW.z1]])
  S.push(box(x0, x1, 0, 0.035, z0, z1, [214, 206, 196], 0.03));
// steps down into the water at one end
for (let k = 0; k < 3; k++) S.push(box(SW.x1 - 0.35 - k * 0.3, k ? SW.x1 - 0.35 - (k - 1) * 0.3 : SW.x1 - 0.02, SW.deep + 0.002, -0.25 - k * 0.22, SW.z - 0.6 + 0.004 * k, SW.z + 0.6 - 0.004 * k, TILE, 0.04));
const poolFloorTex = canvasTex(16, 16, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const grout = i % 4 === 0 || j % 4 === 0;
    x.fillStyle = grout ? 'rgb(70,120,150)' : `rgb(${110 + rr() * 20},${170 + rr() * 20},${200 + rr() * 20})`; x.fillRect(i, j, 1, 1);
  }
}, [8, 6]);
const poolFloor = new THREE.Mesh(new THREE.PlaneGeometry(SW.x1 - SW.x0, SW.z1 - SW.z0), decal({ map: poolFloorTex, fog: false }));
poolFloor.rotation.x = -Math.PI / 2; poolFloor.position.set(SW.x, SW.deep, SW.z); scene.add(poolFloor);
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
const water = new THREE.Mesh(new THREE.PlaneGeometry(SW.x1 - SW.x0 - 0.004, SW.z1 - SW.z0 - 0.004, 8, 6), waterMat);
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
// a row of small candles along the coping
for (let x = SW.x0 - 0.1; x <= SW.x1 + 0.1; x += 0.6) for (const z of [SW.z0 - 0.12, SW.z1 + 0.12]) {
  S.push(cyl(V(x, 0.035, z), V(x, 0.11, z), 0.02, 0.02, [230, 220, 196], { n: 5, amt: 0.03 }));
  G.push(cyl(V(x, 0.11, z), V(x, 0.135, z), 0.01, 0.003, [255, 200, 120], { n: 4, amt: 0 }));
}
// pink and violet neon along the top of the walls, plus a soft pink haze hanging in the air
for (const [x0, x1, z0, z1, c] of [[5.05, 13.95, -11.95, -11.9, [255, 60, 170]], [5.05, 13.95, -4.1, -4.05, [170, 70, 255]], [5.05, 5.1, -11.95, -4.05, [255, 60, 170]], [13.9, 13.95, -11.95, -4.05, [170, 70, 255]]])
  G.push(box(x0, x1, 2.98, 3.03, z0, z1, c, 0));
for (const [x, y, z] of [[6.0, 2.85, -11.85], [13.0, 2.85, -4.15]]) pLight(0xd040ff, 1.0, 6.5, x, y, z);

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
const GLASS_D = [16, 20, 26], RUBBER = [14, 14, 15], RIM_C = [150, 152, 158], CAR_BLK = [10, 10, 11], CAR_TRIM = [26, 26, 28];
// a reflection map for the paint: a dark city at night, warm street lights low on the horizon and a faint sky glow above
const carEnv = (() => {
  const face = (kind) => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    if (kind === 'top') { x.fillStyle = '#0c0d12'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#2a2c36'; x.fillRect(12, 12, 8, 8); }
    else if (kind === 'bottom') { x.fillStyle = '#050506'; x.fillRect(0, 0, 32, 32); }
    else {
      const g = x.createLinearGradient(0, 0, 0, 32); g.addColorStop(0, '#0a0b10'); g.addColorStop(0.45, '#1c1c24'); g.addColorStop(0.55, '#09090c'); g.addColorStop(1, '#030304');
      x.fillStyle = g; x.fillRect(0, 0, 32, 32);
      for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#ffd9a0' : '#f4b870'; x.fillRect(3 + k * 8 + (kind.length % 3), 12, 2, 3); }
      x.fillStyle = '#2c2e3a'; x.fillRect(0, 15, 32, 1);
    }
    return c;
  };
  const tex = new THREE.CubeTexture([face('px'), face('nx'), face('top'), face('bottom'), face('pz'), face('nzz')]);
  tex.needsUpdate = true;
  return tex;
})();
const carPaintMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 60, specular: 0x3a3a40, envMap: carEnv, combine: THREE.AddOperation, reflectivity: 0.14 }));
const carGlassMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 110, specular: 0x8a8a8a, envMap: carEnv, combine: THREE.AddOperation, reflectivity: 0.32 }));
const carChromeMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0xb0b0b0, envMap: carEnv, combine: THREE.MixOperation, reflectivity: 0.45 }));
// paint shading: darker toward the sills, lighter on the upward faces, and a bright reflection line just under the shoulder
function paintShade(belt) {
  return (v, n, c) => {
    const y = v[1];
    const k = 0.58 + 0.42 * Math.min(1, Math.max(0, (y - 0.15) / Math.max(0.1, belt - 0.15))) + 0.22 * Math.max(0, n[1]);
    const side = 1 - Math.abs(n[1]);
    const streak = Math.exp(-Math.pow((y - belt * 0.9) / 0.04, 2)) * side;
    // the highlight scales with the paint: a bright line on light colours, a faint cold sheen on black
    const lum = (c[0] + c[1] + c[2]) / 765, add = (30 * streak + 22 * Math.pow(Math.max(0, n[1]), 4)) * (0.22 + 0.78 * Math.min(1, lum * 2.5));
    const flake = 1 + 0.06 * Math.sin(v[0] * 91 + v[1] * 57 + v[2] * 73);
    return [c[0] * k * flake + add, c[1] * k * flake + add, c[2] * k * flake + add * 1.15];
  };
}
// a flat slab from a polygon in the x-y plane, between z0 and z1 (side windows, buttresses, panels)
function slabXY(poly, z0, z1, col, amt) {
  return loft([poly.map(([x, y]) => V(x, y, z0)), poly.map(([x, y]) => V(x, y, z1))], col, { amt: amt == null ? 0.02 : amt });
}
// a slim bar between two points (lamp strips, trim, wipers)
function bar3(a, b, r, col) { return cyl(a, b, r, r, col, { n: 4, amt: 0.02, rot: Math.PI / 4 }); }
function xyRing(cx, cy, z, r, n) { const p = []; for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n; p.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); } return p; }
// detailed wheels: tyre with rounded shoulders, a dished rim with spokes, brake disc and caliper; fronts can be steered
function carWheelSet(K, o) {
  const r = o.r, w = o.w, n = 20, rimC = o.rim || RIM_C, cal = o.caliper || [150, 20, 24];
  // the tyre's outer face sits just proud of the body side, so the bodywork never slices through the wheel
  if (o.half) o.track = Math.max(o.track, 2 * (o.half + 0.014) - w);
  for (const [x, front] of [[o.xs[0], false], [o.xs[1], true]]) for (const e of [-1, 1]) {
    const W = [], C = [], zc = e * o.track / 2, zo = zc + e * w / 2, zi = zc - e * w / 2;
    W.push(loft([xyRing(x, r, zi, r * 0.8, n), xyRing(x, r, zi + e * w * 0.12, r * 0.98, n), xyRing(x, r, zc, r, n), xyRing(x, r, zo - e * w * 0.12, r * 0.98, n), xyRing(x, r, zo, r * 0.82, n)], RUBBER, { amt: 0.02, smooth: true, cap: false }));
    W.push(cyl(V(x, r, zi), V(x, r, zi + e * 0.01), r * 0.82, r * 0.82, [8, 8, 9], { n: 16, amt: 0 }));
    // rim: polished lip, a deep dark barrel, brake disc and caliper seen through the spokes
    C.push(loft([xyRing(x, r, zo, r * 0.82, n), xyRing(x, r, zo + e * 0.008, r * 0.74, n), xyRing(x, r, zo - e * 0.01, r * 0.72, n)], rimC, { amt: 0.02, cap: false }));
    W.push(cyl(V(x, r, zo - e * 0.13), V(x, r, zo - e * 0.12), r * 0.8, r * 0.8, [26, 26, 28], { n: 16, amt: 0.02 }));
    W.push(cyl(V(x, r, zo - e * 0.08), V(x, r, zo - e * 0.065), r * 0.58, r * 0.58, [86, 84, 82], { n: 14, amt: 0.04 }));
    W.push(box(x - 0.1, x + 0.06, r + r * 0.34, r + r * 0.56, zo - e * 0.075 - 0.03, zo - e * 0.075 + 0.03, cal, 0.02));
    const sp = o.spokes || 5;
    for (let k = 0; k < sp; k++) {
      const a = k * 2 * Math.PI / sp + 0.3;
      for (const d of o.split ? [-0.08, 0.08] : [0]) {
        const aa = a + d;
        C.push(cyl(V(x + Math.cos(a) * r * 0.12, r + Math.sin(a) * r * 0.12, zo + e * 0.004), V(x + Math.cos(aa) * r * 0.7, r + Math.sin(aa) * r * 0.7, zo - e * 0.012), 0.022, 0.014, rimC, { n: 4, amt: 0.02 }));
      }
    }
    C.push(cyl(V(x, r, zo - e * 0.002), V(x, r, zo + e * 0.02), r * 0.15, r * 0.11, rimC, { n: 10, amt: 0.02 }));
    W.push(cyl(V(x, r, zo + e * 0.02), V(x, r, zo + e * 0.024), r * 0.07, r * 0.07, CAR_BLK, { n: 8, amt: 0 }));
    if (front && o.steer) for (const L of [W, C]) placeParts(L.map((q) => { q.tris = q.tris.map((t) => t.map((v) => [v[0] - x, v[1], v[2] - zc])); return q; }), x, zc, o.steer, 0);
    K.P.push(...W); K.C.push(...C);
    // a black arch liner around the top of each wheel, on the body side
    if (o.half) {
      const pts = [];
      for (let k = 0; k <= 10; k++) { const a = Math.PI * (-0.08 + 1.16 * k / 10); pts.push(V(x + Math.cos(a) * (r + 0.05), r + Math.sin(a) * (r + 0.05), e * (o.half - 0.012))); }
      K.P.push(tube(pts, pts.map(() => 0.02), CAR_BLK, { n: 4, amt: 0.02 }));
    }
  }
}
// body helpers
const yzBody = (stations, n, pw) => stations.map(([x, b, t, w]) => yzRing(x, b, t, w, n, pw));
function doorDetails(K, half, seams, y0, y1, handles, hy) {
  for (const e of [-1, 1]) {
    for (const x of seams) K.P.push(box(x - 0.006, x + 0.006, y0, y1, e * half - 0.006, e * half + 0.006, [8, 8, 9], 0.02));
    for (const x of handles) K.C.push(box(x - 0.09, x + 0.09, hy - 0.016, hy + 0.016, e * (half + 0.012) - 0.008, e * (half + 0.012) + 0.008, CHROME_GRILLE, 0.02));
  }
}
function plates(K, xf, xr, y, yr) {
  for (const [x, d, yy] of [[xf, 1, y], [xr, -1, yr == null ? y : yr]]) {
    const y = yy;
    K.P.push(box(x - 0.008, x + 0.008, y - 0.075, y + 0.075, -0.27, 0.27, [16, 16, 18], 0.02));
    K.P.push(box(x + d * 0.006 - 0.004, x + d * 0.006 + 0.004, y - 0.06, y + 0.06, -0.25, 0.25, [214, 212, 200], 0.02));
    for (let k = 0; k < 6; k++) { const z = -0.17 + k * 0.068; K.P.push(box(x + d * 0.012 - 0.002, x + d * 0.012 + 0.002, y - 0.03, y + 0.03, z - 0.018, z + 0.018, [30, 30, 40], 0)); }
  }
}
function mirrors(K, x, y, z, color) {
  for (const e of [-1, 1]) {
    // the stalk reaches down and in to the door, so the mirror never floats off the body
    K.P.push(bar3(V(x + 0.06, y - 0.13, e * (z - 0.17)), V(x, y - 0.02, e * z), 0.016, CAR_BLK));
    K.B.push(loft([yzRing(x - 0.07, y - 0.05, y + 0.05, 0.16, 10, 3).map((p) => V(p[0], p[1], p[2] + e * z)), yzRing(x + 0.03, y - 0.055, y + 0.055, 0.18, 10, 3).map((p) => V(p[0], p[1], p[2] + e * z)), yzRing(x + 0.08, y - 0.04, y + 0.04, 0.14, 10, 3).map((p) => V(p[0], p[1], p[2] + e * z))], color, { amt: 0.02, smooth: true }));
    K.L.push(box(x + 0.075, x + 0.085, y - 0.01, y + 0.005, e * z - 0.05, e * z + 0.05, [255, 170, 60], 0));
  }
}
function carParts(kind, color, opts) {
  opts = opts || {};
  const K = { P: [], L: [], B: [], G: [], C: [] };
  const P = K.P, L = K.L, B = K.B;
  const head = [255, 246, 226], drl = [235, 244, 255], tail = [215, 18, 22], tailD = [110, 8, 10], amber = [255, 160, 40];
  const shadeAll = (belt) => { const f = paintShade(belt); for (const p of B) p.shade = f; };
  if (kind === 'suv') {
    // an original full-size luxury SUV: upright and square, floating black roof pillars, big chrome grille, side steps
    B.push(loft(yzBody([[-2.52, 0.44, 0.98, 1.86], [-2.44, 0.36, 1.04, 1.94], [-2.2, 0.32, 1.08, 1.98], [-1.2, 0.3, 1.1, 1.98], [0.8, 0.3, 1.1, 1.98], [1.9, 0.3, 1.09, 1.98], [2.3, 0.33, 1.05, 1.96], [2.46, 0.38, 0.99, 1.9], [2.53, 0.46, 0.9, 1.82]], 22, 4.2), color, { amt: 0.015, smooth: true }));
    K.G.push(loft(yzBody([[-2.34, 1.08, 1.74, 1.86], [-2.2, 1.08, 1.8, 1.84], [0.75, 1.08, 1.82, 1.8], [1.4, 1.08, 1.12, 1.88]], 18, 4), GLASS_D, { amt: 0.02 }));
    B.push(loft(yzBody([[-2.3, 1.78, 1.84, 1.78], [-2.15, 1.79, 1.88, 1.8], [0.7, 1.8, 1.89, 1.78], [0.86, 1.8, 1.84, 1.74]], 16, 4), color, { amt: 0.015, smooth: true }));
    for (const e of [-1, 1]) {
      // pillars: body-coloured A and D, black B and C
      B.push(slabXY([[1.42, 1.08], [1.36, 1.12], [0.78, 1.8], [0.68, 1.8]], e * 0.9, e * 0.94, color));
      P.push(slabXY([[0.12, 1.08], [0.24, 1.08], [0.24, 1.8], [0.12, 1.8]], e * 0.905, e * 0.935, CAR_BLK));
      P.push(slabXY([[-1.16, 1.08], [-1.04, 1.08], [-1.04, 1.8], [-1.16, 1.8]], e * 0.905, e * 0.935, CAR_BLK));
      B.push(slabXY([[-2.36, 1.08], [-2.06, 1.08], [-2.1, 1.8], [-2.3, 1.8]], e * 0.9, e * 0.935, color));
      // chrome window line, roof rail, side step
      K.C.push(box(-2.2, 1.38, 1.075, 1.095, e * 0.985 - 0.012, e * 0.985 + 0.012, CHROME_GRILLE, 0.02));
      P.push(box(-1.9, 0.6, 1.9, 1.94, e * 0.72 - 0.03, e * 0.72 + 0.03, CAR_BLK, 0.02));
      for (const x of [-1.85, 0.55]) P.push(box(x - 0.04, x + 0.04, 1.87, 1.92, e * 0.72 - 0.03, e * 0.72 + 0.03, CAR_BLK, 0.02));
      P.push(box(-1.1, 1.05, 0.33, 0.4, e * 1.0 - 0.07, e * 1.0 + 0.07, CAR_BLK, 0.02));
      K.C.push(box(-1.1, 1.05, 0.395, 0.41, e * 1.06 - 0.012, e * 1.06 + 0.012, CHROME_GRILLE, 0.02));
      // headlights: dark housings with two projectors and a light strip; tail lights wrapping the corners
      P.push(box(2.42, 2.548, 0.84, 0.98, e * 0.7 - 0.2, e * 0.7 + 0.2, [20, 22, 26], 0.02));
      for (const dz of [-0.09, 0.09]) L.push(cyl(V(2.548, 0.9, e * 0.7 + dz), V(2.558, 0.9, e * 0.7 + dz), 0.045, 0.045, head, { n: 10, amt: 0 }));
      L.push(box(2.548, 2.556, 0.955, 0.972, e * 0.7 - 0.19, e * 0.7 + 0.19, drl, 0));
      L.push(box(2.47, 2.556, 0.5, 0.56, e * 0.72 - 0.08, e * 0.72 + 0.08, head, 0));
      L.push(box(-2.53, -2.47, 0.78, 1.04, e * 0.8 - 0.1, e * 0.8 + 0.1, tail, 0));
      L.push(box(-2.5, -2.3, 0.98, 1.04, e * 0.94 - 0.03, e * 0.94 + 0.03, tail, 0));
      L.push(box(-2.535, -2.525, 0.8, 1.02, e * 0.8 - 0.05, e * 0.8 + 0.05, tailD, 0));
      K.C.push(cyl(V(-2.4, 0.4, e * 0.6), V(-2.56, 0.4, e * 0.6), 0.05, 0.05, CHROME_GRILLE, { n: 10, amt: 0.02 }));
    }
    // grille: chrome frame, dark mesh, horizontal bars; lower intake and a silver skid plate
    K.C.push(box(2.5, 2.56, 0.5, 0.96, -0.5, 0.5, CHROME_GRILLE, 0.02));
    P.push(box(2.555, 2.57, 0.54, 0.92, -0.45, 0.45, [12, 12, 14], 0.02));
    for (let y = 0.58; y < 0.92; y += 0.065) K.C.push(box(2.565, 2.58, y - 0.01, y + 0.01, -0.44, 0.44, CHROME_GRILLE, 0.02));
    P.push(box(2.48, 2.56, 0.36, 0.48, -0.7, 0.7, CAR_BLK, 0.02));
    K.C.push(box(2.42, 2.5, 0.3, 0.36, -0.55, 0.55, [130, 132, 138], 0.02));
    L.push(box(-2.52, -2.5, 1.6, 1.64, -0.25, 0.25, tail, 0));
    doorDetails(K, 0.995, [1.36, 0.18, -1.1], 0.48, 1.06, [0.75, -0.6], 1.0);
    mirrors(K, 1.25, 1.2, 1.08, color);
    plates(K, 2.57, -2.53, 0.42, 0.62);
    carWheelSet(K, { xs: [-1.6, 1.6], track: 1.72, r: 0.42, w: 0.3, spokes: 6, split: true, rim: [168, 170, 176], caliper: [20, 20, 22], half: 0.99 });
    shadeAll(1.1);
  } else if (kind === 'super') {
    // an original wedge supercar: very low, wide haunches, a small canopy set forward, side intakes, a fixed rear wing
    const prof = [[-2.25, 0.32, 0.78, 1.7], [-2.15, 0.27, 0.84, 1.88], [-2.0, 0.25, 0.86, 1.96], [-1.6, 0.23, 0.88, 2.02], [-1.2, 0.22, 0.88, 2.02], [-0.6, 0.21, 0.84, 1.98], [0, 0.2, 0.78, 1.96], [0.6, 0.2, 0.7, 1.96], [1.2, 0.2, 0.62, 1.98], [1.6, 0.21, 0.56, 1.96], [1.9, 0.22, 0.5, 1.9], [2.15, 0.24, 0.44, 1.8], [2.3, 0.27, 0.4, 1.66], [2.36, 0.3, 0.37, 1.5]];
    B.push(loft(yzBody(prof, 24, 3.4), color, { amt: 0.015, smooth: true }));
    K.G.push(loft([yzRing(-1.3, 0.8, 0.86, 1.6, 18, 3.2), yzRing(-0.9, 0.8, 1.12, 1.42, 18, 3.2), yzRing(0.1, 0.75, 1.14, 1.36, 18, 3.2), yzRing(0.55, 0.7, 0.92, 1.5, 18, 3.2), yzRing(0.9, 0.62, 0.68, 1.6, 18, 3.2)], GLASS_D, { amt: 0.02, smooth: true }));
    B.push(loft([yzRing(-0.95, 1.08, 1.13, 1.0, 12, 3), yzRing(-0.3, 1.12, 1.16, 1.0, 12, 3), yzRing(0.2, 1.1, 1.13, 0.96, 12, 3)], color, { amt: 0.015, smooth: true }));
    P.push(box(-2.3, -2.0, 1.02, 1.06, -0.85, 0.85, CAR_BLK, 0.02));
    for (const e of [-1, 1]) {
      P.push(box(-2.2, -2.1, 0.8, 1.02, e * 0.6 - 0.02, e * 0.6 + 0.02, CAR_BLK, 0.02));
      // a big side intake behind the door, and a carbon sill
      P.push(slabXY([[-0.95, 0.38], [-0.35, 0.62], [-0.35, 0.36], [-0.95, 0.32]], e * 0.99, e * 1.012, [8, 8, 9]));
      for (let k = 0; k < 4; k++) P.push(box(-0.9 + k * 0.14, -0.88 + k * 0.14, 0.34, 0.56, e * 1.006 - 0.012, e * 1.006 + 0.012, [40, 40, 44], 0.02));
      P.push(box(-1.3, 1.0, 0.2, 0.26, e * 0.99 - 0.03, e * 0.99 + 0.03, [18, 18, 20], 0.02));
      // slim headlights with three LED dots, a light blade at the back
      P.push(slabXY([[2.24, 0.45], [1.92, 0.52], [1.9, 0.48], [2.24, 0.41]], e * 0.48, e * 0.82, [16, 18, 22]));
      for (let k = 0; k < 3; k++) L.push(cyl(V(2.1 - k * 0.08, 0.47 + k * 0.015, e * (0.58 + k * 0.07)), V(2.12 - k * 0.08, 0.47 + k * 0.015, e * (0.58 + k * 0.07)), 0.022, 0.022, head, { n: 8, amt: 0 }));
      L.push(bar3(V(2.22, 0.445, e * 0.5), V(1.93, 0.515, e * 0.8), 0.008, drl));
      K.C.push(cyl(V(-2.2, 0.36, e * 0.18), V(-2.38, 0.36, e * 0.18), 0.055, 0.055, [120, 110, 100], { n: 10, amt: 0.02 }));
    }
    L.push(box(-2.27, -2.22, 0.66, 0.7, -0.8, 0.8, tail, 0));
    L.push(box(-2.275, -2.265, 0.6, 0.66, -0.7, 0.7, tailD, 0));
    P.push(box(2.2, 2.42, 0.18, 0.22, -0.85, 0.85, CAR_BLK, 0.02));
    P.push(box(2.28, 2.372, 0.24, 0.34, -0.6, 0.6, [8, 8, 9], 0.02));
    P.push(box(-2.32, -2.0, 0.17, 0.3, -0.75, 0.75, CAR_BLK, 0.02));
    for (const z of [-0.5, -0.25, 0, 0.25, 0.5]) P.push(box(-2.34, -2.02, 0.17, 0.31, z - 0.01, z + 0.01, [30, 30, 32], 0.02));
    // engine cover louvres
    for (let k = 0; k < 6; k++) P.push(box(-1.95 + k * 0.12, -1.9 + k * 0.12, 0.885, 0.9, -0.4, 0.4, [12, 12, 13], 0.02));
    doorDetails(K, 1.0, [0.95, -0.4], 0.4, 0.72, [], 0);
    mirrors(K, 0.75, 0.86, 0.98, color);
    carWheelSet(K, { xs: [-1.4, 1.4], track: 1.76, r: 0.36, w: 0.32, spokes: 10, rim: [40, 40, 44], caliper: [220, 170, 30] });
    shadeAll(0.8);
  } else if (kind === 'saloon') {
    // an original long luxury saloon: upright chrome grille, long bonnet, formal roofline, chrome everywhere
    B.push(loft(yzBody([[-2.66, 0.38, 0.9, 1.78], [-2.55, 0.32, 0.98, 1.9], [-2.3, 0.3, 1.0, 1.94], [-1.0, 0.29, 1.0, 1.95], [1.0, 0.29, 0.99, 1.95], [2.2, 0.3, 0.98, 1.93], [2.5, 0.33, 0.94, 1.9], [2.64, 0.38, 0.86, 1.82]], 22, 3.8), color, { amt: 0.015, smooth: true }));
    K.G.push(loft(yzBody([[-1.95, 0.98, 1.02, 1.8], [-1.55, 0.98, 1.5, 1.66], [0.5, 0.98, 1.52, 1.66], [1.2, 0.98, 1.02, 1.8]], 16, 3.6), GLASS_D, { amt: 0.02 }));
    B.push(loft(yzBody([[-1.5, 1.49, 1.55, 1.6], [-1.3, 1.5, 1.58, 1.62], [0.35, 1.51, 1.58, 1.62], [0.52, 1.5, 1.54, 1.58]], 14, 3.6), color, { amt: 0.015, smooth: true }));
    for (const e of [-1, 1]) {
      B.push(slabXY([[1.2, 1.0], [1.08, 1.0], [0.46, 1.5], [0.56, 1.52]], e * 0.86, e * 0.89, color));
      P.push(slabXY([[-0.44, 0.99], [-0.32, 0.99], [-0.32, 1.52], [-0.44, 1.52]], e * 0.82, e * 0.85, CAR_BLK));
      B.push(slabXY([[-1.98, 1.0], [-1.6, 1.0], [-1.45, 1.52], [-1.6, 1.52]], e * 0.86, e * 0.89, color));
      K.C.push(box(-1.95, 1.18, 0.985, 1.0, e * 0.97 - 0.01, e * 0.97 + 0.01, CHROME_GRILLE, 0.02));
      K.C.push(box(-2.3, 2.3, 0.6, 0.625, e * 0.975 - 0.01, e * 0.975 + 0.01, CHROME_GRILLE, 0.02));
      K.C.push(box(-1.2, 1.1, 0.3, 0.34, e * 0.97 - 0.01, e * 0.97 + 0.01, CHROME_GRILLE, 0.02));
      P.push(box(2.55, 2.66, 0.72, 0.86, e * 0.68 - 0.2, e * 0.68 + 0.2, [22, 24, 28], 0.02));
      L.push(cyl(V(2.65, 0.79, e * 0.58), V(2.67, 0.79, e * 0.58), 0.05, 0.05, head, { n: 10, amt: 0 }));
      L.push(cyl(V(2.65, 0.79, e * 0.78), V(2.67, 0.79, e * 0.78), 0.05, 0.05, head, { n: 10, amt: 0 }));
      L.push(box(2.65, 2.67, 0.7, 0.715, e * 0.68 - 0.18, e * 0.68 + 0.18, drl, 0));
      L.push(box(-2.67, -2.6, 0.7, 0.88, e * 0.72 - 0.14, e * 0.72 + 0.14, tail, 0));
      L.push(box(-2.675, -2.665, 0.73, 0.85, e * 0.72 - 0.08, e * 0.72 + 0.08, tailD, 0));
      K.C.push(cyl(V(-2.5, 0.36, e * 0.55), V(-2.7, 0.36, e * 0.55), 0.05, 0.05, CHROME_GRILLE, { n: 10, amt: 0.02 }));
    }
    // tall vertical-slat grille in a heavy chrome surround
    K.C.push(box(2.6, 2.68, 0.44, 0.9, -0.4, 0.4, CHROME_GRILLE, 0.02));
    P.push(box(2.675, 2.69, 0.47, 0.87, -0.35, 0.35, [16, 16, 18], 0.02));
    for (let z = -0.31; z <= 0.32; z += 0.062) K.C.push(box(2.685, 2.7, 0.47, 0.87, z - 0.012, z + 0.012, CHROME_GRILLE, 0.02));
    K.C.push(box(2.58, 2.68, 0.36, 0.4, -0.9, 0.9, CHROME_GRILLE, 0.02));
    K.C.push(box(-2.68, -2.58, 0.4, 0.44, -0.88, 0.88, CHROME_GRILLE, 0.02));
    doorDetails(K, 0.975, [1.18, -0.38, -1.75], 0.44, 0.97, [0.55, -0.9], 0.88);
    mirrors(K, 1.05, 1.08, 1.0, color);
    plates(K, 2.71, -2.66, 0.3, 0.5);
    carWheelSet(K, { xs: [-1.65, 1.65], track: 1.74, r: 0.38, w: 0.27, spokes: 7, split: true, rim: [190, 192, 198], caliper: [30, 30, 34], half: 0.975 });
    shadeAll(0.98);
  } else if (kind === 'sedan') {
    B.push(loft(yzBody([[-2.32, 0.36, 0.84, 1.7], [-2.22, 0.3, 0.9, 1.78], [-1.9, 0.28, 0.92, 1.8], [1.6, 0.28, 0.88, 1.8], [2.1, 0.29, 0.84, 1.78], [2.32, 0.36, 0.72, 1.7]], 20, 3.5), color, { amt: 0.015, smooth: true }));
    K.G.push(loft(yzBody([[-1.72, 0.86, 0.95, 1.7], [-1.15, 0.86, 1.42, 1.56], [0.35, 0.86, 1.42, 1.56], [1.08, 0.86, 0.93, 1.7]], 16, 3.5), GLASS_D, { amt: 0.02 }));
    B.push(loft(yzBody([[-1.1, 1.4, 1.46, 1.48], [0.3, 1.4, 1.46, 1.48]], 12, 3.5), color, { amt: 0.015 }));
    for (const e of [-1, 1]) {
      P.push(slabXY([[-0.42, 0.88], [-0.32, 0.88], [-0.32, 1.41], [-0.42, 1.41]], e * 0.78, e * 0.81, CAR_BLK));
      P.push(box(2.18, 2.33, 0.6, 0.73, e * 0.58 - 0.2, e * 0.58 + 0.2, [24, 26, 30], 0.02));
      L.push(box(2.32, 2.335, 0.63, 0.7, e * 0.58 - 0.16, e * 0.58 + 0.16, head, 0));
      L.push(box(-2.33, -2.24, 0.66, 0.8, e * 0.62 - 0.17, e * 0.62 + 0.17, tail, 0));
    }
    P.push(box(2.3, 2.34, 0.42, 0.58, -0.4, 0.4, [14, 14, 16], 0.02));
    K.C.push(box(2.33, 2.345, 0.5, 0.52, -0.38, 0.38, CHROME_GRILLE, 0.02));
    doorDetails(K, 0.9, [1.05, -0.37, -1.6], 0.42, 0.86, [0.4, -0.9], 0.78);
    mirrors(K, 0.95, 0.98, 0.94, color);
    plates(K, 2.34, -2.33, 0.48);
    carWheelSet(K, { xs: [-1.4, 1.4], track: 1.6, r: 0.34, w: 0.24, spokes: 5, rim: RIM_C, caliper: [40, 40, 44], half: 0.9 });
    shadeAll(0.88);
  } else if (kind === 'gt86') {
    // an original small 2+2 sports coupe in the spirit of a GT86: long low bonnet with raised front wings, the cabin set back,
    // a fastback with a ducktail, swept headlamps, a wide trapezoid mouth, fender vents and twin round exhausts
    const prof = [[-2.13, 0.38, 0.78, 1.3], [-2.08, 0.32, 0.84, 1.52], [-1.96, 0.27, 0.9, 1.66], [-1.76, 0.23, 0.93, 1.74], [-1.4, 0.21, 0.93, 1.78], [-1.0, 0.2, 0.92, 1.78],
      [-0.5, 0.2, 0.9, 1.76], [0, 0.2, 0.88, 1.76], [0.4, 0.2, 0.86, 1.77], [0.8, 0.2, 0.82, 1.77], [1.2, 0.2, 0.79, 1.77], [1.6, 0.2, 0.76, 1.76], [1.9, 0.22, 0.72, 1.72], [2.05, 0.26, 0.66, 1.62], [2.12, 0.32, 0.57, 1.36]];
    B.push(loft(yzBody(prof, 28, 3.6), color, { amt: 0.012, smooth: true }));
    // raised front wings over the wheels and muscular rear haunches
    for (const e of [-1, 1]) {
      // (over each wheel the wing's underside clears the top of the tyre: wheel radius 0.33, wheels at x -1.26 and 1.31)
      const clr = (x, y0) => (Math.min(Math.abs(x + 1.26), Math.abs(x - 1.31)) < 0.44 ? Math.max(y0, 0.71) : y0);
      const fen = (st) => B.push(loft(st.map(([x, y0, y1, w, z]) => yzRing(x, clr(x, y0), Math.max(y1, clr(x, y0) + 0.08), w, 12, 2.6).map((p) => V(p[0], p[1], p[2] + e * z))), color, { amt: 0.012, smooth: true }));
      fen([[0.72, 0.62, 0.8, 0.16, 0.7], [1.0, 0.6, 0.86, 0.3, 0.72], [1.35, 0.6, 0.87, 0.32, 0.72], [1.7, 0.58, 0.82, 0.28, 0.72], [1.98, 0.54, 0.7, 0.16, 0.7]]);
      fen([[-0.8, 0.66, 0.86, 0.14, 0.74], [-1.05, 0.64, 0.95, 0.28, 0.75], [-1.45, 0.64, 0.96, 0.3, 0.75], [-1.8, 0.62, 0.92, 0.24, 0.73], [-2.0, 0.6, 0.84, 0.12, 0.7]]);
      // the little vent behind each front wheel
      P.push(slabXY([[0.62, 0.62], [0.42, 0.66], [0.42, 0.6], [0.62, 0.56]], e * 0.875, e * 0.89, [8, 8, 9]));
      for (let k = 0; k < 3; k++) K.C.push(box(0.6 - k * 0.07, 0.62 - k * 0.07, 0.58, 0.64, e * 0.887 - 0.006, e * 0.887 + 0.006, [60, 60, 66], 0.02));
      // side skirts
      P.push(box(-1.0, 0.95, 0.19, 0.27, e * 0.88 - 0.035, e * 0.88 + 0.035, CAR_BLK, 0.02));
    }
    // the greenhouse: windscreen, roof, a long fastback rear screen
    K.G.push(loft([yzRing(0.47, 0.84, 0.885, 1.5, 14, 3), yzRing(0.22, 0.84, 1.08, 1.42, 14, 3), yzRing(-0.08, 0.84, 1.245, 1.34, 14, 3), yzRing(-0.5, 0.86, 1.28, 1.3, 14, 3),
      yzRing(-0.9, 0.88, 1.21, 1.3, 14, 3), yzRing(-1.25, 0.9, 1.04, 1.36, 14, 3), yzRing(-1.52, 0.92, 0.95, 1.44, 14, 3)], GLASS_D, { amt: 0.02, smooth: true }));
    // body-coloured roof skin with a double bubble, and the fastback's sail panels
    B.push(loft([yzRing(-0.02, 1.235, 1.262, 1.22, 14, 3), yzRing(-0.3, 1.262, 1.29, 1.22, 14, 3), yzRing(-0.62, 1.262, 1.29, 1.2, 14, 3), yzRing(-0.88, 1.21, 1.236, 1.18, 14, 3)], color, { amt: 0.012, smooth: true }));
    for (const e of [-1, 1]) {
      const lean = (poly, zo, zi, col) => loft([poly.map(([x, y]) => V(x, y, e * (zo - (y - 0.86) * 0.32))), poly.map(([x, y]) => V(x, y, e * (zi - (y - 0.86) * 0.32)))], col, { amt: 0.012 });
      B.push(lean([[-0.86, 1.22], [-0.98, 1.2], [-1.6, 0.92], [-1.2, 0.9]], 0.7, 0.6, color));
      B.push(lean([[0.47, 0.875], [0.43, 0.875], [-0.06, 1.245], [-0.02, 1.245]], 0.73, 0.69, color));
      P.push(lean([[-0.36, 0.88], [-0.44, 0.88], [-0.44, 1.26], [-0.36, 1.26]], 0.69, 0.66, CAR_BLK));
      P.push(bar3(V(0.45, 0.875, e * 0.76), V(-1.2, 0.905, e * 0.775), 0.008, [6, 6, 6]));
    }
    // ducktail and a small lip spoiler
    B.push(loft([yzRing(-1.6, 0.9, 0.95, 1.5, 12, 3), yzRing(-1.95, 0.92, 0.97, 1.46, 12, 3), yzRing(-2.06, 0.93, 0.99, 1.34, 12, 3)], color, { amt: 0.012, smooth: true }));
    // the face: a wide trapezoid mouth with a honeycomb mesh, fog-light pods, a slim splitter
    P.push(slabXY([[2.14, 0.27], [2.1, 0.5], [2.07, 0.5], [2.1, 0.27]], -0.5, 0.5, [8, 8, 9]));
    for (let j = 0; j < 4; j++) for (let k = 0; k < 9; k++) P.push(box(2.12, 2.13, 0.3 + j * 0.05, 0.325 + j * 0.05, -0.44 + k * 0.1 + (j % 2) * 0.05, -0.41 + k * 0.1 + (j % 2) * 0.05, [36, 36, 40], 0));
    P.push(box(1.98, 2.18, 0.18, 0.21, -0.78, 0.78, CAR_BLK, 0.02));
    for (const e of [-1, 1]) {
      P.push(slabXY([[2.12, 0.3], [2.08, 0.42], [2.04, 0.42], [2.06, 0.3]], e * 0.58, e * 0.76, [8, 8, 9]));
      L.push(box(2.08, 2.1, 0.33, 0.37, e * 0.62 - 0.05, e * 0.62 + 0.05, head, 0));
      // swept headlamps: dark housing, two projectors, an L-shaped light strip
      P.push(loft([[V(2.06, 0.6, e * 0.42), V(2.02, 0.66, e * 0.46), V(2.0, 0.66, e * 0.46), V(2.04, 0.59, e * 0.42)], [V(1.76, 0.71, e * 0.82), V(1.7, 0.75, e * 0.84), V(1.68, 0.74, e * 0.84), V(1.74, 0.7, e * 0.82)]], [14, 16, 20], { amt: 0.02 }));
      for (const [x, z] of [[1.97, 0.53], [1.87, 0.64]]) L.push(cyl(V(x, 0.645 + (2 - x) * 0.25, e * z), V(x + 0.02, 0.645 + (2 - x) * 0.25, e * z), 0.03, 0.03, head, { n: 10, amt: 0 }));
      L.push(bar3(V(2.04, 0.6, e * 0.43), V(1.74, 0.71, e * 0.82), 0.007, drl));
      L.push(box(1.62, 1.68, 0.56, 0.59, e * 0.865 - 0.006, e * 0.865 + 0.006, amber, 0));
      // wide rear clusters: red outer, a dark inner band, a white reverse lamp
      P.push(loft([[V(-2.09, 0.74, e * 0.36), V(-2.07, 0.84, e * 0.38), V(-2.05, 0.84, e * 0.38), V(-2.07, 0.74, e * 0.36)], [V(-1.9, 0.74, e * 0.84), V(-1.86, 0.84, e * 0.84), V(-1.84, 0.84, e * 0.84), V(-1.88, 0.74, e * 0.84)]], [30, 4, 6], { amt: 0.02 }));
      L.push(bar3(V(-2.085, 0.82, e * 0.38), V(-1.875, 0.82, e * 0.83), 0.012, tail));
      L.push(bar3(V(-2.09, 0.77, e * 0.5), V(-1.93, 0.77, e * 0.8), 0.01, tailD));
      L.push(box(-2.105, -2.095, 0.75, 0.78, e * 0.42 - 0.04, e * 0.42 + 0.04, [235, 235, 230], 0));
      // twin round exhausts, one each side, and a black diffuser
      K.C.push(cyl(V(-1.95, 0.27, e * 0.5), V(-2.16, 0.27, e * 0.5), 0.05, 0.054, CHROME_GRILLE, { n: 14, amt: 0.02 }));
      P.push(cyl(V(-2.159, 0.27, e * 0.5), V(-2.162, 0.27, e * 0.5), 0.04, 0.04, [6, 6, 6], { n: 12, amt: 0 }));
    }
    P.push(box(-2.12, -1.92, 0.19, 0.32, -0.4, 0.4, CAR_BLK, 0.02));
    for (const z of [-0.27, -0.09, 0.09, 0.27]) P.push(box(-2.13, -1.94, 0.19, 0.33, z - 0.01, z + 0.01, [26, 26, 28], 0.02));
    P.push(box(-2.11, -2.09, 0.76, 0.82, -0.36, 0.36, CAR_BLK, 0.02));
    // a peek of the interior: dash, two bucket seats, the wheel
    P.push(box(0.18, 0.44, 0.7, 0.86, -0.66, 0.66, [12, 12, 13], 0.02));
    for (const e of [-1, 1]) { P.push(box(-0.6, -0.18, 0.32, 0.5, e * 0.36 - 0.21, e * 0.36 + 0.21, [24, 20, 24], 0.04)); P.push(box(-0.66, -0.52, 0.48, 1.08, e * 0.36 - 0.2, e * 0.36 + 0.2, [24, 20, 24], 0.04)); }
    { const ring = []; for (let k = 0; k <= 12; k++) { const a = 2 * Math.PI * k / 12; ring.push(V(0.1 + Math.sin(a) * 0.03, 0.88 + Math.cos(a) * 0.16, -0.36 + Math.sin(a) * 0.16)); } P.push(tube(ring, ring.map(() => 0.016), CAR_BLK, { n: 4 })); }
    doorDetails(K, 0.89, [0.44, -0.8], 0.3, 0.86, [-0.62], 0.78);
    mirrors(K, 0.35, 0.92, 0.94, color);
    plates(K, 2.145, -2.12, 0.42, 0.6);
    carWheelSet(K, { xs: [-1.26, 1.31], track: 1.54, r: 0.33, w: 0.23, spokes: 10, rim: [58, 56, 64], caliper: [214, 170, 50], half: 0.9 });
    shadeAll(0.82);
  } else if (kind === 'roadster') {
    // an original small two-seat roadster with a fastback folding hardtop: long bonnet with fender peaks, the cabin
    // sitting back over the rear wheels, flying buttresses, slim swept lamps and round twin tail lights
    B.push(loft(yzBody([[-1.98, 0.32, 0.66, 1.46], [-1.9, 0.26, 0.73, 1.62], [-1.7, 0.22, 0.77, 1.72], [-1.3, 0.2, 0.79, 1.74], [-0.8, 0.19, 0.79, 1.72], [-0.2, 0.19, 0.775, 1.7], [0.45, 0.19, 0.765, 1.72], [0.95, 0.19, 0.745, 1.74], [1.4, 0.19, 0.725, 1.74], [1.72, 0.2, 0.69, 1.7], [1.88, 0.22, 0.62, 1.6], [1.96, 0.26, 0.55, 1.42], [1.99, 0.3, 0.5, 1.2]], 26, 3.4), color, { amt: 0.012, smooth: true }));
    // fender peaks over the front wheels and a rear haunch
    for (const e of [-1, 1]) {
      // (over each wheel, clear of the tyre top: wheel radius 0.31, wheels at x -1.12 and 1.18)
      const clr = (x, y0) => (Math.min(Math.abs(x + 1.12), Math.abs(x - 1.18)) < 0.42 ? Math.max(y0, 0.67) : y0);
      const fen = (st) => B.push(loft(st.map(([x, y0, y1, w]) => yzRing(x, clr(x, y0), Math.max(y1, clr(x, y0) + 0.06), w, 10, 2.6).map((p) => V(p[0], p[1], p[2] + e * 0.66))), color, { amt: 0.012, smooth: true }));
      fen([[0.45, 0.6, 0.74, 0.18], [0.8, 0.6, 0.79, 0.3], [1.2, 0.6, 0.795, 0.32], [1.55, 0.58, 0.76, 0.28], [1.82, 0.52, 0.66, 0.18]]);
      fen([[-1.78, 0.6, 0.74, 0.18], [-1.4, 0.62, 0.825, 0.3], [-1.0, 0.62, 0.825, 0.3], [-0.6, 0.62, 0.79, 0.18]]);
    }
    // cockpit: windscreen, piano-black roof panel, buttresses, a small vertical rear window
    K.G.push(loft([[V(0.44, 0.77, -0.64), V(0.44, 0.77, 0.64), V(0.42, 0.785, 0.64), V(0.42, 0.785, -0.64)], [V(-0.12, 1.13, -0.57), V(-0.12, 1.13, 0.57), V(-0.14, 1.145, 0.57), V(-0.14, 1.145, -0.57)]], GLASS_D, { amt: 0.02 }));
    P.push(loft([yzRing(-0.14, 1.12, 1.17, 1.16, 12, 3), yzRing(-0.4, 1.13, 1.18, 1.16, 12, 3), yzRing(-0.66, 1.1, 1.15, 1.12, 12, 3)], [8, 8, 10], { amt: 0.01, smooth: true }));
    for (const e of [-1, 1]) {
      // the cabin leans in toward the roof (tumblehome), so its sides are slanted slabs
      const lean = (poly, zo, zi, col) => loft([poly.map(([x, y]) => V(x, y, e * (zo - (y - 0.78) * 0.38))), poly.map(([x, y]) => V(x, y, e * (zi - (y - 0.78) * 0.38)))], col, { amt: 0.012 });
      B.push(lean([[-0.6, 1.16], [-0.7, 1.16], [-1.42, 0.8], [-1.1, 0.785], [-0.75, 0.86]], 0.715, 0.52, color));
      P.push(lean([[0.46, 0.775], [0.42, 0.775], [-0.15, 1.14], [-0.11, 1.14]], 0.665, 0.62, CAR_BLK));
      K.G.push(lean([[0.36, 0.785], [-0.12, 1.12], [-0.6, 1.12], [-0.7, 0.8]], 0.705, 0.695, GLASS_D));
      P.push(bar3(V(0.4, 0.79, e * 0.72), V(-0.68, 0.8, e * 0.72), 0.008, [6, 6, 6]));
    }
    P.push(slabXY([[-0.66, 1.12], [-0.74, 1.12], [-0.84, 0.82], [-0.76, 0.82]], -0.42, 0.42, [10, 10, 12]));
    K.G.push(slabXY([[-0.75, 1.07], [-0.82, 0.86], [-0.85, 0.86], [-0.78, 1.07]], -0.38, 0.38, GLASS_D));
    // interior just visible through the glass
    P.push(box(0.2, 0.42, 0.62, 0.78, -0.62, 0.62, [12, 12, 13], 0.02));
    for (const e of [-1, 1]) { P.push(box(-0.62, -0.2, 0.32, 0.5, e * 0.33 - 0.2, e * 0.33 + 0.2, [30, 22, 18], 0.04)); P.push(box(-0.66, -0.52, 0.48, 1.0, e * 0.33 - 0.19, e * 0.33 + 0.19, [30, 22, 18], 0.04)); }
    { const ring = []; for (let k = 0; k <= 12; k++) { const a = 2 * Math.PI * k / 12; ring.push(V(0.12 + Math.sin(a) * 0.03, 0.82 + Math.cos(a) * 0.15, -0.33 + Math.sin(a) * 0.15)); } P.push(tube(ring, ring.map(() => 0.015), CAR_BLK, { n: 4 })); }
    // the face: a wide low mouth with a fine mesh, slim swept headlamps with a projector and a light strip
    P.push(slabXY([[2.0, 0.28], [2.0, 0.46], [1.97, 0.47], [1.97, 0.27]], -0.42, 0.42, [10, 10, 11]));
    for (let k = 0; k < 7; k++) for (let j = 0; j < 3; j++) P.push(box(2.0, 2.008, 0.3 + j * 0.055, 0.33 + j * 0.055, -0.38 + k * 0.11, -0.33 + k * 0.11, [34, 34, 38], 0));
    P.push(box(1.88, 2.02, 0.2, 0.235, -0.62, 0.62, CAR_BLK, 0.02));
    for (const e of [-1, 1]) {
      P.push(loft([[V(1.94, 0.56, e * 0.4), V(1.91, 0.6, e * 0.42), V(1.89, 0.6, e * 0.42), V(1.92, 0.55, e * 0.4)], [V(1.72, 0.64, e * 0.76), V(1.66, 0.68, e * 0.78), V(1.64, 0.67, e * 0.78), V(1.7, 0.63, e * 0.76)]], [16, 18, 22], { amt: 0.02 }));
      L.push(cyl(V(1.86, 0.6, e * 0.52), V(1.88, 0.6, e * 0.52), 0.032, 0.032, head, { n: 10, amt: 0 }));
      L.push(bar3(V(1.93, 0.575, e * 0.42), V(1.7, 0.655, e * 0.76), 0.007, drl));
      L.push(box(1.5, 1.56, 0.48, 0.51, e * 0.85 - 0.006, e * 0.85 + 0.006, amber, 0));
      // round twin tail lights: a glowing outer ring around a darker centre
      for (const z of [0.5, 0.7]) {
        const ring = []; for (let k = 0; k <= 14; k++) { const a = 2 * Math.PI * k / 14; ring.push(V(-1.975, 0.6 + Math.cos(a) * 0.055, e * z + Math.sin(a) * 0.055)); }
        L.push(tube(ring, ring.map(() => 0.012), tail, { n: 4, amt: 0 }));
        L.push(cyl(V(-1.97, 0.6, e * z), V(-1.985, 0.6, e * z), 0.03, 0.03, tailD, { n: 10, amt: 0 }));
      }
      K.C.push(cyl(V(-1.85, 0.27, e * 0.24), V(-2.02, 0.27, e * 0.24), 0.045, 0.048, CHROME_GRILLE, { n: 12, amt: 0.02 }));
      P.push(cyl(V(-2.019, 0.27, e * 0.24), V(-2.022, 0.27, e * 0.24), 0.034, 0.034, [6, 6, 6], { n: 10, amt: 0 }));
    }
    L.push(box(-1.93, -1.9, 0.775, 0.785, -0.14, 0.14, tail, 0));
    B.push(box(-1.95, -1.72, 0.77, 0.8, -0.6, 0.6, color, 0.01));
    P.push(box(-2.0, -1.84, 0.2, 0.3, -0.58, 0.58, CAR_BLK, 0.02));
    doorDetails(K, 0.865, [0.42, -0.66], 0.36, 0.74, [-0.5], 0.68);
    mirrors(K, 0.3, 0.86, 0.8, color);
    plates(K, 2.005, -1.99, 0.42);
    carWheelSet(K, { xs: [-1.12, 1.18], track: 1.5, r: 0.31, w: 0.21, spokes: 10, rim: [64, 66, 72], caliper: [190, 24, 30], half: 0.868, steer: opts.steer });
    shadeAll(0.74);
  } else {
    // an original open-top sports coupe: flared arches, long low hood, open cockpit with a raked windscreen,
    // ducktail wing, splitter, diffuser and spoked wheels (front wheels steered, like it just pulled up)
    const prof = [[-2.28, 0.36, 0.82, 1.6], [-2.2, 0.3, 0.9, 1.74], [-2.02, 0.26, 0.94, 1.84], [-1.75, 0.24, 0.95, 1.9], [-1.35, 0.24, 0.94, 1.95],
      [-0.95, 0.24, 0.93, 1.9], [-0.4, 0.23, 0.92, 1.84], [0.3, 0.23, 0.9, 1.84], [0.85, 0.23, 0.84, 1.89], [1.38, 0.24, 0.78, 1.95],
      [1.8, 0.25, 0.7, 1.88], [2.12, 0.27, 0.6, 1.78], [2.3, 0.3, 0.52, 1.62], [2.38, 0.36, 0.46, 1.46]];
    B.push(loft(yzBody(prof, 24, 3.6), color, { amt: 0.015, smooth: true }));
    const BLK = CAR_BLK, TRIM = [24, 22, 22], LEATH = [112, 72, 44], LEATH_D = [86, 54, 32], CHROME = [170, 172, 178];
    P.push(box(2.18, 2.46, 0.19, 0.23, -0.78, 0.78, BLK, 0.02));
    P.push(box(2.32, 2.4, 0.27, 0.41, -0.52, 0.52, BLK, 0.02));
    P.push(box(-2.34, -2.04, 0.17, 0.29, -0.72, 0.72, BLK, 0.02));
    for (const z of [-0.45, -0.15, 0.15, 0.45]) P.push(box(-2.36, -2.06, 0.17, 0.3, z - 0.012, z + 0.012, TRIM, 0.02));
    for (const e of [-1, 1]) {
      P.push(box(-1.0, 0.95, 0.19, 0.27, e * 0.86 - 0.05, e * 0.86 + 0.05, BLK, 0.02));
      K.C.push(cyl(V(-2.24, 0.3, e * 0.55), V(-2.4, 0.3, e * 0.55), 0.048, 0.048, CHROME, { n: 10, amt: 0.02 }));
      P.push(cyl(V(-2.395, 0.3, e * 0.55), V(-2.405, 0.3, e * 0.55), 0.034, 0.034, [6, 6, 6], { n: 8, amt: 0 }));
      L.push(box(1.98, 2.24, 0.57, 0.62, e * 0.62 - 0.17, e * 0.62 + 0.17, head, 0));
      L.push(box(2.18, 2.3, 0.49, 0.52, e * 0.55 - 0.15, e * 0.55 + 0.15, [255, 250, 240], 0));
    }
    mirrors(K, 0.5, 0.98, 0.95, color);
    L.push(box(-2.3, -2.25, 0.74, 0.78, -0.74, 0.74, tail, 0));
    for (const e of [-1, 1]) L.push(box(-2.29, -2.24, 0.62, 0.74, e * 0.66 - 0.06, e * 0.66 + 0.06, tail, 0));
    P.push(box(-2.2, -1.92, 1.02, 1.05, -0.8, 0.8, BLK, 0.02));
    for (const e of [-1, 1]) P.push(box(-2.1, -2.02, 0.92, 1.02, e * 0.55 - 0.02, e * 0.55 + 0.02, BLK, 0.02));
    P.push(box(-1.3, 0.56, 0.88, 0.957, -0.72, 0.72, [20, 16, 14], 0.03));
    P.push(box(0.4, 0.62, 0.88, 1.03, -0.72, 0.72, TRIM, 0.03));
    for (const e of [-1, 1]) {
      const z = e * 0.4;
      P.push(box(-0.5, 0.05, 0.95, 1.02, z - 0.22, z + 0.22, LEATH, 0.04));
      P.push(box(-0.64, -0.5, 0.95, 1.32, z - 0.22, z + 0.22, LEATH, 0.04));
      P.push(box(-0.63, -0.53, 1.32, 1.43, z - 0.12, z + 0.12, LEATH_D, 0.04));
      K.C.push(tube([V(-0.7, 0.95, z - 0.2), V(-0.7, 1.3, z - 0.18), V(-0.7, 1.36, z), V(-0.7, 1.3, z + 0.18), V(-0.7, 0.95, z + 0.2)], [0.02, 0.02, 0.02, 0.02, 0.02], CHROME, { n: 6 }));
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
    const ws = (x0, y0, x1, y1, t) => [V(x0, y0, -0.72), V(x0, y0, 0.72), V(x0 + t, y0, 0.72), V(x0 + t, y0, -0.72), V(x1, y1, -0.68), V(x1, y1, 0.68), V(x1 + t, y1, 0.68), V(x1 + t, y1, -0.68)];
    { const q = ws(0.6, 0.92, 0.32, 1.22, 0.02); K.G.push(loft([q.slice(0, 4), q.slice(4)], [44, 56, 68], { amt: 0.02 })); }
    for (const e of [-1, 1]) P.push(cyl(V(0.62, 0.9, e * 0.74), V(0.33, 1.23, e * 0.7), 0.018, 0.018, BLK, { n: 5 }));
    P.push(cyl(V(0.33, 1.23, -0.7), V(0.33, 1.23, 0.7), 0.018, 0.018, BLK, { n: 5 }));
    plates(K, 2.41, -2.36, 0.36);
    carWheelSet(K, { xs: [-1.35, 1.38], track: 1.7, r: 0.35, w: 0.27, spokes: 5, rim: [150, 152, 158], caliper: [200, 160, 40], half: 0.95, steer: opts.steer || 0 });
    shadeAll(0.92);
  }
  return K;
}
// one car as a group of meshes: plain parts, glowing lamps, glossy paint, glass and chrome
function carGroup(K, extra, gem) {
  const g = new THREE.Group();
  const add = (parts, mat) => { if (parts.length) { const m = new THREE.Mesh(toGeometry(parts), mat); g.add(m); return m; } return null; };
  add(K.P.concat(extra || []), roomMat); add(K.L, glowMat); add(K.G, carGlassMat); add(K.C, carChromeMat);
  // a gem paint job (the owner's ruby, Matenro's midnight purple): the same faceted, light-catching finish as their tuxedos
  const body = add(K.B, gem ? gemPaintMat(gem) : carPaintMat);
  if (gem && body) facetPaint(body.geometry, gem);
  return g;
}
const gemPaints = {};
function gemPaintMat(kind) {
  // the tuxedo's gem finish, a little calmer on big body panels so the colour stays deep instead of washing out
  if (!gemPaints[kind]) gemPaints[kind] = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 70, specular: GEM[kind][2], envMap: gemCube(kind), combine: THREE.AddOperation, reflectivity: 0.2 }));
  return gemPaints[kind];
}
function facetPaint(geo, kind) {
  const col = geo.attributes && geo.attributes.color; if (!col) return;
  const a = col.array, r = rngFrom(hashStr('paint' + kind) + a.length);
  for (let i = 0; i < a.length; i += 9) {
    const k = 0.72 + r() * 0.62, warm = (r() - 0.5) * 0.2;
    for (let j = 0; j < 9; j += 3) { a[i + j] = Math.min(1, a[i + j] * k * (1 + warm)); a[i + j + 1] = Math.min(1, a[i + j + 1] * k); a[i + j + 2] = Math.min(1, a[i + j + 2] * k * (1 - warm)); }
  }
  col.needsUpdate = true;
}
function parkCar(kind, color, x, z, yaw, y, opts) {
  const g = carGroup(carParts(kind, color, opts));
  g.position.set(x, y || 0, z); g.rotation.y = yaw; scene.add(g);
  return g;
}

// outside walls are only drawn while the camera is outside at street level (from above they'd hide the rooms)
const FACADES = [];
function groundPlane(x0, x1, z0, z1, tex, tile, y) {
  const w = x1 - x0, d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d, Math.ceil(w / 2), Math.max(1, Math.ceil(d / 2)));
  scaleUV(g, w / tile, d / tile);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex }));
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
const ST = { x0: -84, x1: 20.6, walk0: 4, curb0: 6.6, curb1: 13.4, walk1: 15.4 }, ROAD_Y = -0.12;   // past x1 the street bends left round the corner
groundPlane(ST.x0, ST.x1, ST.walk0, ST.curb0 - 0.12, pavingTex, 1.2, 0);
groundPlane(ST.x0, ST.x1, ST.curb0 - 0.12, ST.curb1 + 0.12, asphaltTex, 3, ROAD_Y);
groundPlane(ST.x0, ST.x1, ST.curb1 + 0.12, ST.walk1 + 2, pavingTex, 1.2, 0);
S.push(box(ST.x0, ST.x1, ROAD_Y, 0, ST.curb0 - 0.12, ST.curb0, [74, 74, 80], 0.03));
S.push(box(ST.x0, ST.x1, ROAD_Y, 0, ST.curb1, ST.curb1 + 0.12, [74, 74, 80], 0.03));
const PARK_Z = ST.curb0 + 2.25, LANE_Z = (PARK_Z + ST.curb1) / 2;
for (let x = ST.x0 + 1; x < ST.x1; x += 3.2) GD.push(box(x, x + 1.6, ROAD_Y, ROAD_Y + 0.012, LANE_Z - 0.06, LANE_Z + 0.06, [190, 166, 84], 0.03));
for (const z of [PARK_Z]) GD.push(box(ST.x0, ST.x1, ROAD_Y, ROAD_Y + 0.01, z - 0.05, z + 0.05, [150, 150, 150], 0.03));

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
facade(-17, 4.01, 23, 4.01, 0, 1, [[16.1, 17.9]]);   // front, entrance at x -0.9..0.9
facade(-17.01, -11, -17.01, 4, -1, 0);                // left side: security office and card room
facade(14.01, -12, 14.01, -4, 1, 0);                  // right side, behind the dance room
facade(14, -4.01, 23, -4.01, 0, -1);                  // back of the dance room
facade(23.01, -4, 23.01, 4, 1, 0);                    // the dance room's end wall
facade(-17, -11.01, 5, -11.01, 0, -1, [[12.6, 13.8]]);  // back of billiards + VIP, back door at x -4.4..-3.2
facade(5.01, -12, 5.01, -11, -1, 0);                  // the step out at the pool lounge
facade(5, -12.01, 14, -12.01, 0, -1);                 // back of the pool lounge
// a brass band and cornice along the front
S.push(box(-17, 23, 3.3, 3.36, 4.01, 4.06, BRASS_D, 0.03));
S.push(box(-17.1, 23.1, FAC_H - 0.1, FAC_H, 4.0, 4.25, [20, 20, 24], 0.03));
// tall front windows, warm light behind frosted glass
for (const x of [-15, -11, -8, -5, 5, 8, 11, 16, 19.5]) {
  S.push(box(x - 0.68, x + 0.68, 0.9, 0.98, 4.02, 4.14, BRASS_D, 0.03));
  G.push(box(x - 0.6, x + 0.6, 0.98, 2.6, 4.02, 4.035, x > 14 ? [46, 34, 104] : [92, 62, 34], 0));
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

// black SUVs parked along the curb (the entrance stays clear)
const PARKED = [-10.5, -5.0, 5.0, 10.5];
PARKED.forEach((x, i) => parkCar('suv', [[9, 9, 11], [11, 11, 14], [9, 9, 11], [12, 12, 15]][i], x, ST.curb0 + 1.1, 0, ROAD_Y));

// passing traffic in both lanes, looping from one end of the street to the other
const TRAFFIC = [
  { kind: 'sedan', color: [44, 46, 52], z: LANE_Z - 1.05, dir: 1, speed: 8.5, x: -20 },
  { kind: 'suv', color: [13, 13, 15], z: LANE_Z - 1.05, dir: 1, speed: 7.2, x: 8 },
  { kind: 'sedan', color: [96, 96, 102], z: LANE_Z + 1.05, dir: -1, speed: 9.5, x: 18 },
  { kind: 'sedan', color: [70, 22, 26], z: LANE_Z + 1.05, dir: -1, speed: 8.0, x: -6 },
  { kind: 'saloon', color: [22, 40, 70], z: LANE_Z - 1.05, dir: 1, speed: 7.8, x: -60 },
  { kind: 'sedan', color: [150, 150, 150], z: LANE_Z + 1.05, dir: -1, speed: 8.8, x: -45 }
];
// each lane runs along the main street, round the bend and down the side street; a car's place is a distance along it
const TR_X0 = -92, TR_Z1 = -66, TCX = 20.6, TCZ = 2.0;
function lanePos(r, s) {
  const A = TCX - TR_X0, B = r * Math.PI / 2;
  if (s < A) return [TR_X0 + s, TCZ + r, 1, 0];
  if (s < A + B) { const a = (s - A) / r; return [TCX + r * Math.sin(a), TCZ + r * Math.cos(a), Math.cos(a), -Math.sin(a)]; }
  return [TCX + r, TCZ - (s - A - B), 0, -1];
}
const laneLen = (r) => TCX - TR_X0 + r * Math.PI / 2 + TCZ - TR_Z1;
const beamTex = canvasTex(16, 16, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const u = i / (w - 1), v = Math.abs(j / (h - 1) - 0.5) * 2, k = Math.max(0, (1 - u) * (1 - v * v));
    x.fillStyle = `rgb(${Math.round(255 * k)},${Math.round(226 * k)},${Math.round(176 * k)})`; x.fillRect(i, j, 1, 1);
  }
});
const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -16 });
const traffic = [];
for (const tc of TRAFFIC) {
  const grp = carGroup(carParts(tc.kind, tc.color));
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.4), beamMat);
  beam.rotation.x = -Math.PI / 2; beam.position.set(2.3 + 2.75, 0.02, 0); grp.add(beam);
  tc.r = tc.z - TCZ; tc.L = laneLen(tc.r); tc.s = tc.x - TR_X0;
  scene.add(grp); traffic.push({ grp, tc });
}
function driveTraffic(dt) {
  for (const { grp, tc } of traffic) {
    tc.s += tc.dir * tc.speed * dt;
    if (tc.s > tc.L) tc.s -= tc.L; if (tc.s < 0) tc.s += tc.L;
    const [x, z, hx, hz] = lanePos(tc.r, tc.s);
    grp.position.set(x, ROAD_Y, z); grp.rotation.y = Math.atan2(-hz * tc.dir, hx * tc.dir);
  }
}
driveTraffic(0);

// ===== BACKSTREET: a walled courtyard behind the VIP with a round valet drive =====
const AL = { x0: -14, x1: 15, z0: -35, z1: -11 };
groundPlane(AL.x0, 5, AL.z0, -11.02, wetTex, 3, 0);
groundPlane(5, AL.x1, AL.z0, -12.02, wetTex, 3, 0);
// the far side of the courtyard: the back of another building, and high walls left and right (an arch on the right for the drive)
facade(-14.01, AL.z0, -14.01, -11.0, 1, 0, [[1.5, 4.5]]);   // a gate through to the car park, by Old Tobias
facade(-14.06, -11.0, -14.06, AL.z0, -1, 0, [[19.5, 22.5]]);
facade(15.01, -12.0, 15.01, AL.z0, -1, 0, [[8.3, 12.2]]);   // the arch for the drive at z -24.2..-20.3
facade(14.0, -12.01, 15.0, -12.01, 0, 1);
// the round drive: a raised island with a fountain, a ring of granite setts, and eight bays fanned around it
const LOT = { x: 0, z: -22.5, ri: 2.2, ro: 5.0, R: 7.9, rb: 10.5 };
const settTex = canvasTex(32, 32, (x, w, h) => {
  x.fillStyle = 'rgb(16,16,19)'; x.fillRect(0, 0, w, h);
  for (let j = 0; j < h; j += 4) for (let i = (j / 4) % 2 ? -3 : 0; i < w; i += 6) {
    const v = 42 + Math.floor(rr() * 22); x.fillStyle = `rgb(${v},${v},${v + 4})`; x.fillRect(i + 1, j + 1, 5, 3);
  }
});
const graniteTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [22, 22, 26], 4);
  for (let k = 0; k < 40; k++) { const v = 60 + Math.floor(rr() * 50); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 1, 1); }
  x.fillStyle = 'rgb(12,12,14)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
});
const stoneLTex = canvasTex(16, 16, (x, w, h) => {
  noiseFill(x, w, h, [96, 92, 86], 5);
  x.fillStyle = 'rgb(60,58,54)'; x.fillRect(0, 0, w, 1); x.fillRect(0, 0, 1, h);
});
for (const t of [settTex, graniteTex, stoneLTex]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
const flatMat = (tex, units) => new THREE.MeshLambertMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: units });
function ringPlane(r0, r1, mat, tile, y) {
  const g = r0 > 0 ? new THREE.RingGeometry(r0, r1, 64, 2) : new THREE.CircleGeometry(r1, 48);
  scaleUV(g, 2 * r1 / tile, 2 * r1 / tile);
  const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(LOT.x, y, LOT.z); scene.add(m);
  return m;
}
ringPlane(LOT.ro, LOT.rb + 0.6, flatMat(graniteTex, -2), 1.6, 0.02);
ringPlane(LOT.ri, LOT.ro, flatMat(settTex, -4), 1.1, 0.04);
groundPlane(4.6, AL.x1 + 0.8, LOT.z - 1.6, LOT.z + 1.6, settTex, 1.1, 0.06);
groundPlane(-5.2, -2.4, LOT.z + LOT.ro + 0.05, -11.6, stoneLTex, 1.0, 0.07);
// pieces of a ring (curbs, hedges, inlays), each its own small box so the faces point the right way
const ang = (a) => [Math.sin(a), -Math.cos(a)];
function arcBox(r0, r1, y0, y1, a0, a1, steps, col, amt) {
  const out = [];
  for (let k = 0; k < steps; k++) {
    const sec = [];
    for (const a of [a0 + (a1 - a0) * k / steps, a0 + (a1 - a0) * (k + 1) / steps]) {
      const [s, c] = ang(a);
      sec.push([V(LOT.x + s * r0, y0, LOT.z + c * r0), V(LOT.x + s * r0, y1, LOT.z + c * r0), V(LOT.x + s * r1, y1, LOT.z + c * r1), V(LOT.x + s * r1, y0, LOT.z + c * r1)]);
    }
    out.push(loft(sec, col, { amt: amt == null ? 0.04 : amt }));
  }
  return out;
}
const MARBLE_W = [198, 194, 186], HEDGE = [30, 62, 34], BRONZE = [70, 54, 34];
const D2R = Math.PI / 180;
S.push(...arcBox(LOT.ri - 0.12, LOT.ri + 0.1, 0, 0.2, 0, 2 * Math.PI, 48, MARBLE_W, 0.03));
G.push(...arcBox(LOT.ro - 0.035, LOT.ro + 0.035, 0.05, 0.065, 0, 2 * Math.PI, 96, [200, 160, 80], 0));
// the island: dark lawn, four clipped cypress cones, and a three-tier fountain lit from below
ringPlane(0, LOT.ri - 0.1, new THREE.MeshLambertMaterial({ map: canvasTex(16, 16, (x, w, h) => noiseFill(x, w, h, [26, 52, 28], 10)) }), 1.2, 0.16);
for (let k = 0; k < 4; k++) {
  const [s, c] = ang(Math.PI / 4 + k * Math.PI / 2), x = LOT.x + s * 1.7, z = LOT.z + c * 1.7;
  S.push(cyl(V(x, 0.16, z), V(x, 0.42, z), 0.2, 0.18, [120, 110, 100], { n: 10 }));
  S.push(loft([rring(0.42, 0.42, 0.42, x, z, 10, 2), rring(0.9, 0.5, 0.5, x, z, 10, 2), rring(1.5, 0.34, 0.34, x, z, 10, 2), rring(2.0, 0.04, 0.04, x, z, 10, 2)], HEDGE, { smooth: true, amt: 0.1 }));
}
{
  const fx = LOT.x, fz = LOT.z;
  S.push(loft([rring(0.16, 2.5, 2.5, fx, fz, 28, 2), rring(0.55, 2.5, 2.5, fx, fz, 28, 2), rring(0.6, 2.62, 2.62, fx, fz, 28, 2), rring(0.64, 2.5, 2.5, fx, fz, 28, 2), rring(0.64, 2.3, 2.3, fx, fz, 28, 2), rring(0.3, 2.3, 2.3, fx, fz, 28, 2)], MARBLE_W, { amt: 0.03, cap: false, center: [fx, 2, fz] }));
  S.push(cyl(V(fx, 0.3, fz), V(fx, 1.25, fz), 0.16, 0.11, MARBLE_W, { n: 12 }));
  S.push(loft([rring(1.2, 0.2, 0.2, fx, fz, 20, 2), rring(1.32, 1.2, 1.2, fx, fz, 20, 2), rring(1.42, 1.3, 1.3, fx, fz, 20, 2), rring(1.42, 1.16, 1.16, fx, fz, 20, 2), rring(1.36, 0.2, 0.2, fx, fz, 20, 2)], MARBLE_W, { amt: 0.03, smooth: true }));
  S.push(cyl(V(fx, 1.36, fz), V(fx, 1.85, fz), 0.07, 0.05, MARBLE_W, { n: 10 }));
  S.push(loft([rring(1.82, 0.08, 0.08, fx, fz, 16, 2), rring(1.9, 0.56, 0.56, fx, fz, 16, 2), rring(1.96, 0.6, 0.6, fx, fz, 16, 2), rring(1.92, 0.08, 0.08, fx, fz, 16, 2)], MARBLE_W, { amt: 0.03, smooth: true }));
  S.push(loft([rring(1.96, 0.1, 0.1, fx, fz, 10, 2), rring(2.08, 0.14, 0.14, fx, fz, 10, 2), rring(2.22, 0.02, 0.02, fx, fz, 10, 2)], BRASS, { amt: 0.03, smooth: true }));
  G.push(loft([rring(0.56, 2.28, 2.28, fx, fz, 28, 2), rring(0.56, 0.01, 0.01, fx, fz, 28, 2)], [52, 104, 132], { amt: 0.05, cap: false }));
  G.push(loft([rring(1.38, 1.14, 1.14, fx, fz, 20, 2), rring(1.38, 0.01, 0.01, fx, fz, 20, 2)], [70, 130, 160], { amt: 0.05, cap: false }));
  for (let k = 0; k < 8; k++) { const [s, c] = ang(k * Math.PI / 4); G.push(cyl(V(fx + s * 1.18, 0.6, fz + c * 1.18), V(fx + s * 1.18, 0.62, fz + c * 1.18), 0.05, 0.05, [200, 230, 255], { n: 6, amt: 0 })); }
}
const fountainWater = new THREE.Group(); scene.add(fountainWater);
let fountainTick = () => {};
{
  const wm = new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const parts = [];
  // falling sheets from the two bowls and a jet from the top
  for (let k = 0; k < 10; k++) {
    const [s, c] = ang(k * Math.PI / 5);
    parts.push(tube([V(s * 1.3, 1.4, c * 1.3), V(s * 1.45, 1.1, c * 1.45), V(s * 1.55, 0.6, c * 1.55)], [0.035, 0.03, 0.02], [255, 255, 255], { n: 4 }));
    if (k % 2 === 0) parts.push(tube([V(s * 0.6, 1.95, c * 0.6), V(s * 0.72, 1.7, c * 0.72), V(s * 0.8, 1.42, c * 0.8)], [0.025, 0.02, 0.015], [255, 255, 255], { n: 4 }));
  }
  parts.push(cyl(V(0, 2.2, 0), V(0, 2.65, 0), 0.03, 0.01, [255, 255, 255], { n: 6 }));
  const m = new THREE.Mesh(toGeometry(parts), wm); m.position.set(LOT.x, 0, LOT.z); fountainWater.add(m);
  fountainTick = (dt, t) => { wm.opacity = 0.26 + 0.08 * Math.sin(t * 5.3) + 0.04 * Math.sin(t * 11.7); m.rotation.y = t * 0.15; };
}
// the bays: brass lines, a marble wheel stop at the back of each, and a numbered plate on a post
const BAY_A = [-120, -90, -60, -30, 0, 30, 60, 120].map((d) => d * D2R);   // bay 1 is the closest to the back door
const LOT_BAYS = BAY_A.map((a) => { const [s, c] = ang(a); return [LOT.x + s * LOT.R, LOT.z + c * LOT.R]; });
function groundStrip(ax, az, bx, bz, w, y, col, h) {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * w / 2, nz = dx / l * w / 2;
  const q = (yy) => [V(ax + nx, yy, az + nz), V(bx + nx, yy, bz + nz), V(bx - nx, yy, bz - nz), V(ax - nx, yy, az - nz)];
  return loft([q(y), q(y + (h || 0.008))], col, { amt: 0.02 });
}
// a long painted line, cut into short pieces so the PS1 wobble can't sink it into the ground
function paintLine(ax, az, bx, bz, w, y, col, n) {
  const out = []; n = n || 12;
  for (let k = 0; k < n; k++) out.push(groundStrip(ax + (bx - ax) * k / n, az + (bz - az) * k / n, ax + (bx - ax) * (k + 1) / n, az + (bz - az) * (k + 1) / n, w, y, col, 0.012));
  return out;
}
for (const a of [...new Set(BAY_A.flatMap((b) => [Math.round(b / D2R) - 15, Math.round(b / D2R) + 15]))].map((d) => d * D2R)) {
  const [s, c] = ang(a);
  G.push(...paintLine(LOT.x + s * (LOT.ro + 0.25), LOT.z + c * (LOT.ro + 0.25), LOT.x + s * LOT.rb, LOT.z + c * LOT.rb, 0.08, 0.045, [200, 160, 80], 14));
}
for (const a of BAY_A) {
  const [s, c] = ang(a), [ts, tc] = [c, -s];
  const r = LOT.rb - 0.35, x = LOT.x + s * r, z = LOT.z + c * r;
  S.push(groundStrip(x - ts * 0.75, z - tc * 0.75, x + ts * 0.75, z + tc * 0.75, 0.15, 0.0, MARBLE_W, 0.1));
  const px = LOT.x + s * (LOT.rb + 0.35), pz = LOT.z + c * (LOT.rb + 0.35);
  S.push(cyl(V(px, 0, pz), V(px, 0.06, pz), 0.1, 0.09, BRONZE, { n: 8 }));
  S.push(cyl(V(px, 0.06, pz), V(px, 1.08, pz), 0.025, 0.025, BRASS, { n: 6 }));
}
// a low clipped hedge around the far side of the drive, lit bollards and twin-globe lamps behind it
S.push(...arcBox(LOT.rb + 0.75, LOT.rb + 1.3, 0.12, 0.7, -100 * D2R, 66 * D2R, 30, HEDGE, 0.12));
S.push(...arcBox(LOT.rb + 0.7, LOT.rb + 1.35, 0, 0.12, -100 * D2R, 66 * D2R, 30, [60, 58, 56], 0.04));
for (const d of [-105, -75, -45, -15, 15, 45]) {
  const [s, c] = ang(d * D2R), x = LOT.x + s * (LOT.rb + 0.45), z = LOT.z + c * (LOT.rb + 0.45);
  S.push(cyl(V(x, 0, z), V(x, 0.62, z), 0.07, 0.07, BRONZE, { n: 8 }));
  G.push(cyl(V(x, 0.5, z), V(x, 0.58, z), 0.072, 0.072, [255, 214, 150], { n: 8, amt: 0 }));
  S.push(cyl(V(x, 0.62, z), V(x, 0.66, z), 0.08, 0.06, BRONZE, { n: 8 }));
}
for (const d of [-80, -27, 27]) {
  const [s, c] = ang(d * D2R), x = LOT.x + s * (LOT.rb + 1.7), z = LOT.z + c * (LOT.rb + 1.7);
  S.push(cyl(V(x, 0, z), V(x, 0.3, z), 0.16, 0.12, [20, 20, 22], { n: 8 }));
  S.push(cyl(V(x, 0.3, z), V(x, 3.4, z), 0.06, 0.045, [20, 20, 22], { n: 8 }));
  S.push(cyl(V(x - 0.45, 3.4, z), V(x + 0.45, 3.4, z), 0.025, 0.025, [20, 20, 22], { n: 5 }));
  for (const e of [-1, 1]) {
    S.push(cyl(V(x + e * 0.45, 3.4, z), V(x + e * 0.45, 3.5, z), 0.03, 0.03, [20, 20, 22], { n: 6 }));
    G.push(loft([rring(3.5, 0.08, 0.08, x + e * 0.45, z, 10, 2), rring(3.62, 0.26, 0.26, x + e * 0.45, z, 10, 2), rring(3.78, 0.2, 0.2, x + e * 0.45, z, 10, 2), rring(3.84, 0.04, 0.04, x + e * 0.45, z, 10, 2)], [255, 226, 180], { smooth: true, amt: 0 }));
  }
}
// the archway in from the side street: stone piers, brass lanterns, open iron gates
for (const zz of [LOT.z - 1.85, LOT.z + 1.85]) {
  S.push(box(14.4, 15.0, 0, 2.7, zz - 0.3, zz + 0.3, [64, 62, 60], 0.04));
  S.push(box(14.34, 15.06, 2.7, 2.82, zz - 0.36, zz + 0.36, [86, 84, 80], 0.03));
  S.push(box(14.2, 14.34, 1.7, 2.1, zz - 0.09, zz + 0.09, BRASS_D, 0.03));
  G.push(box(14.22, 14.32, 1.75, 2.05, zz - 0.07, zz + 0.07, [255, 210, 140], 0));
  const e = zz < LOT.z ? -1 : 1;
  for (let k = 0; k <= 8; k++) { const u = k / 8, gx = 14.35 - u * 1.25 * 0.6, gz = zz - e * 0.3 - e * u * 1.25 * 0.8; S.push(cyl(V(gx, 0.05, gz), V(gx, 1.9 + 0.15 * Math.sin(Math.PI * u), gz), 0.012, 0.012, [16, 16, 18], { n: 4 })); }
  S.push(cyl(V(14.35, 1.85, zz - e * 0.3), V(14.35 - 0.75, 1.85, zz - e * 0.3 - e * 1.0), 0.015, 0.015, [16, 16, 18], { n: 4 }));
  S.push(cyl(V(14.35, 0.4, zz - e * 0.3), V(14.35 - 0.75, 0.4, zz - e * 0.3 - e * 1.0), 0.015, 0.015, [16, 16, 18], { n: 4 }));
}
for (const zz of [LOT.z - 1.65, LOT.z + 1.65]) S.push(box(4.8, AL.x1 + 0.8, 0, 0.1, zz - 0.07, zz + 0.07, MARBLE_W, 0.03));
// a red carpet from the VIP back door to the drive, with brass stanchions and velvet ropes
{ const g = new THREE.PlaneGeometry(0.8, -11.6 - (LOT.z + LOT.ro + 0.1), 1, 24); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: canvasTex(8, 8, (x, w, h) => noiseFill(x, w, h, [120, 14, 24], 8)), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -10 }));
  m.rotation.x = -Math.PI / 2; m.position.set(-3.8, 0.1, (-11.6 + LOT.z + LOT.ro + 0.1) / 2); scene.add(m); }
for (const x of [-4.55, -3.05]) {
  const zs = [-12.4, -14.0, -15.6, -17.0];
  for (const z of zs) {
    S.push(cyl(V(x, 0.06, z), V(x, 0.12, z), 0.12, 0.11, BRASS_D, { n: 8 }));   // sits on the walkway
    S.push(cyl(V(x, 0.12, z), V(x, 0.95, z), 0.022, 0.022, BRASS, { n: 6 }));
    S.push(cyl(V(x, 0.95, z), V(x, 1.0, z), 0.035, 0.03, BRASS, { n: 6 }));
  }
  for (let k = 0; k < zs.length - 1; k++) S.push(tube([V(x, 0.93, zs[k]), V(x, 0.72, (zs[k] + zs[k + 1]) / 2), V(x, 0.93, zs[k + 1])], [0.022, 0.022, 0.022], VELVET, { n: 5 }));
}
// one warm light over the fountain for the whole drive
const carLamp = pLight(0xffe2c0, 1.5, 17, LOT.x, 4.4, LOT.z);
// reserved plates on the posts at the back of each bay, with the owner's name when they're here
const lotPlates = LOT_BAYS.map((b, i) => {
  const c = document.createElement('canvas'); c.width = 160; c.height = 48;
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.24), decal({ map: tex, side: THREE.DoubleSide }));
  const [s, cc] = ang(BAY_A[i]);
  m.position.set(LOT.x + s * (LOT.rb + 0.35), 1.2, LOT.z + cc * (LOT.rb + 0.35)); m.rotation.y = -BAY_A[i]; scene.add(m);
  const draw = (name) => {
    const x = c.getContext('2d');
    x.fillStyle = '#0d0c0e'; x.fillRect(0, 0, 160, 48); x.strokeStyle = '#b8924a'; x.lineWidth = 2; x.strokeRect(2, 2, 156, 44);
    x.fillStyle = '#e7c98a'; x.font = '20px "Limelight", Georgia, serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(String(i + 1), 10, 25);
    x.font = '11px "IBM Plex Mono", monospace'; x.fillStyle = name ? '#efe2c2' : '#7d705a'; x.fillText(name ? name.slice(0, 14) : 'RESERVED', 36, 25);
    tex.needsUpdate = true;
  };
  draw(''); return { draw, name: '' };
});
// the cars themselves: rebuilt whenever someone arrives, leaves or repaints; parked nose-out, facing the fountain
const lotCars = new Map();
function setLotCars(list) {
  const want = new Map((list || []).map((c) => [c.uid, c]));
  for (const [uid, g] of lotCars) {
    const c = want.get(uid);
    if (!c || g.userData.key !== c.style + c.color + c.bay + (c.name || '')) { scene.remove(g); lotCars.delete(uid); }
  }
  lotPlates.forEach((p, i) => { const c = (list || []).find((o) => o.bay === i); const nm = c ? c.name : ''; if (nm !== p.name) { p.name = nm; p.draw(nm); } });
  for (const c of list || []) {
    if (lotCars.has(c.uid) || c.bay < 0 || c.bay >= LOT_BAYS.length) continue;
    const col = CAR_COLORS[c.color] || CAR_COLORS[0], sig = signatureCar(c.name);
    const g = sig ? carGroup(carParts(sig.style, TUXES[sig.gem].jacket.map((v) => Math.round(v * 0.78))), null, sig.gem) : carGroup(carParts(CAR_STYLES.includes(c.style) ? c.style : 'super', col[1]));
    const a = BAY_A[c.bay];
    g.position.set(LOT_BAYS[c.bay][0], 0.02, LOT_BAYS[c.bay][1]); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); g.userData.key = c.style + c.color + c.bay + (c.name || '');
    scene.add(g); lotCars.set(c.uid, g);
  }
}
const CAR_STYLES = ['roadster', 'coupe', 'super', 'saloon', 'suv'];
// two cars are one of a kind: sh1den's roadster in ruby, and Matenro's GT86-style coupe in midnight purple
function signatureCar(name) {
  const n = (name || '').toLowerCase();
  return n === 'sh1denfps' ? { style: 'roadster', gem: 'ruby' } : n === 'matenro' ? { style: 'gt86', gem: 'midnight' } : null;
}
const CAR_STYLE_NAMES = { roadster: 'Hardtop roadster', coupe: 'Open-top coupe', super: 'Wedge supercar', saloon: 'Luxury saloon', suv: 'Armoured SUV' };
const CAR_COLORS = [['Racing red', [176, 18, 24]], ['Black', [14, 14, 16]], ['Midnight blue', [18, 26, 60]], ['Gunmetal', [62, 64, 70]], ['Pearl white', [222, 220, 212]], ['Royal purple', [70, 20, 90]], ['Emerald', [16, 80, 52]], ['Gold', [176, 140, 60]],
  ['Candy red', [150, 6, 22]], ['Liquid silver', [150, 154, 160]], ['Machine gray', [92, 94, 98]], ['Deep teal', [14, 66, 74]], ['Desert sand', [168, 150, 118]], ['Sky blue', [70, 120, 170]], ['Dark cherry metallic', [86, 8, 16]]];
// ---- the valet booth by the archway: black lacquer and brass, glass all round, a desk, a key cabinet and a lamp
const VB = { x0: 11.6, x1: 13.4, z0: -18.0, z1: -16.4 };
{
  const { x0, x1, z0, z1 } = VB, T = 0.05, LQ = LACQUER, WAL = [74, 48, 30];
  S.push(box(x0 - 0.1, x1 + 0.1, 0, 0.12, z0 - 0.1, z1 + 0.1, MARBLE_W, 0.03));
  // low walls, a solid back wall and a door on the east side
  S.push(box(x0, x1, 0.12, 1.0, z0, z0 + T, LQ)); S.push(box(x0, x0 + T, 0.12, 1.0, z0, z1, LQ));
  S.push(box(x0, x1, 0.12, 2.25, z1 - T, z1, LQ)); S.push(box(x1 - T, x1, 0.12, 2.25, z0 + 0.7, z1, LQ));
  S.push(box(x1 - T, x1, 0.12, 1.0, z0, z0 + 0.7, LQ));
  S.push(box(x1 - 0.004, x1 + 0.004, 1.0, 1.02, z0 + 0.74, z1 - 0.1, BRASS, 0.02));
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) S.push(box(x - 0.04, x + 0.04, 0.12, 2.25, z - 0.04, z + 0.04, BRASS_D, 0.03));
  S.push(box(x0, x1, 0.98, 1.03, z0 - 0.02, z0 + 0.07, BRASS, 0.02)); S.push(box(x0 - 0.02, x0 + 0.07, 0.98, 1.03, z0, z1, BRASS, 0.02));
  for (const x of [x0 + 0.6, x0 + 1.2]) S.push(box(x - 0.015, x + 0.015, 1.03, 2.2, z0 - 0.01, z0 + 0.02, BRASS_D, 0.02));
  // roof with an overhang and a brass band
  S.push(box(x0 - 0.3, x1 + 0.3, 2.25, 2.38, z0 - 0.4, z1 + 0.15, LQ));
  S.push(box(x0 - 0.31, x1 + 0.31, 2.23, 2.27, z0 - 0.41, z1 + 0.16, BRASS, 0.02));
  // desk under the front window, a ledger, a lamp, a phone; the key cabinet on the back wall
  S.push(box(x0 + 0.06, x1 - 0.06, 0.72, 0.77, z0 + 0.06, z0 + 0.58, WAL, 0.04));
  S.push(box(x0 + 0.08, x1 - 0.08, 0.12, 0.72, z0 + 0.06, z0 + 0.12, WAL, 0.04));
  S.push(box(12.2, 12.66, 0.77, 0.79, z0 + 0.22, z0 + 0.5, [210, 200, 176], 0.03));
  S.push(box(12.18, 12.68, 0.765, 0.775, z0 + 0.2, z0 + 0.52, [60, 16, 20], 0.03));
  S.push(cyl(V(13.05, 0.77, z0 + 0.4), V(13.05, 0.79, z0 + 0.4), 0.07, 0.07, BRASS_D, { n: 8 }));
  S.push(cyl(V(13.05, 0.79, z0 + 0.4), V(13.0, 1.08, z0 + 0.3), 0.012, 0.012, BRASS, { n: 4 }));
  G.push(loft([rring(1.02, 0.06, 0.06, 13.0, z0 + 0.3, 8, 2), rring(1.08, 0.16, 0.16, 13.0, z0 + 0.3, 8, 2), rring(1.12, 0.14, 0.14, 13.0, z0 + 0.3, 8, 2)], [70, 130, 80], { amt: 0 }));
  S.push(box(11.82, 12.0, 0.77, 0.82, z0 + 0.28, z0 + 0.46, [16, 16, 18], 0.03));
  S.push(box(x0 + 0.35, x1 - 0.35, 1.05, 1.85, z1 - 0.12, z1 - T, WAL, 0.04));
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
    const x = x0 + 0.45 + k * 0.17, y = 1.72 - r * 0.2;
    S.push(cyl(V(x, y, z1 - 0.12), V(x, y, z1 - 0.16), 0.006, 0.006, BRASS, { n: 4 }));
    if ((r * 6 + k) % 3 !== 1) S.push(box(x - 0.018, x + 0.018, y - 0.09, y - 0.02, z1 - 0.15, z1 - 0.13, [[20, 20, 22], [140, 20, 24], [200, 200, 200]][(r + k) % 3], 0.03));
  }
  // the chair
  const cx = 12.5, cz = -17.0;
  for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; S.push(cyl(V(cx, 0.15, cz), V(cx + Math.cos(a) * 0.26, 0.13, cz + Math.sin(a) * 0.26), 0.018, 0.018, [20, 20, 22], { n: 4 })); }
  S.push(cyl(V(cx, 0.14, cz), V(cx, 0.42, cz), 0.025, 0.025, [120, 120, 126], { n: 6 }));
  S.push(box(cx - 0.24, cx + 0.24, 0.42, 0.48, cz - 0.22, cz + 0.22, [24, 20, 18], 0.04));
  S.push(box(cx - 0.22, cx + 0.22, 0.5, 1.0, cz + 0.2, cz + 0.26, [24, 20, 18], 0.04));
  // a small podium outside for the keys
  S.push(box(11.0, 11.4, 0.0, 1.02, -18.75, -18.45, LQ)); S.push(box(10.96, 11.44, 1.02, 1.08, -18.82, -18.4, BRASS, 0.02));
}
const valetSign = goldSign('VALET', 192, 40, 30); CARD_SIGNS.push(valetSign);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.23), decal({ map: valetSign.tex, transparent: true })); m.position.set((VB.x0 + VB.x1) / 2, 2.31, VB.z0 - 0.415); m.rotation.y = Math.PI; scene.add(m); }
{
  const gm = new THREE.MeshBasicMaterial({ color: 0x9ab8c8, transparent: true, opacity: 0.1, depthWrite: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(VB.x1 - VB.x0, 1.17), gm); front.position.set((VB.x0 + VB.x1) / 2, 1.615, VB.z0 + 0.01); scene.add(front);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(VB.z1 - VB.z0, 1.17), gm); side.position.set(VB.x0 + 0.01, 1.615, (VB.z0 + VB.z1) / 2); side.rotation.y = Math.PI / 2; scene.add(side);
  const side2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.17), gm); side2.position.set(VB.x1 - 0.01, 1.615, VB.z0 + 0.35); side2.rotation.y = Math.PI / 2; scene.add(side2);
}
const boothLight = pLight(0xffdcae, 0.9, 5, 12.5, 2.0, -17.2);
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


// ===== OTHER FLOORS: built far from the bar, so from inside one of them nothing else is in view =====
// a spiral staircase: wedge steps round a brass pole, a helical handrail
function spiralStairs(cx, cz, r, y0, y1, a0, steps, turn, wood) {
  const dy = (y1 - y0) / steps, da = turn / steps, P = [];
  for (let k = 0; k < steps; k++) {
    const a = a0 + k * da, y = y0 + (k + 1) * dy;
    P.push(...placeParts([loft([[V(0.07, y - 0.05, -0.05), V(r, y - 0.05, -0.2), V(r, y - 0.05, 0.2), V(0.07, y - 0.05, 0.05)], [V(0.07, y, -0.05), V(r, y, -0.2), V(r, y, 0.2), V(0.07, y, 0.05)]], wood, { amt: 0.05 })], cx, cz, a, 0));
    if (k % 2 === 0) { const c = Math.cos(a), s = Math.sin(a); P.push(cyl(V(cx + c * (r - 0.04), y, cz - s * (r - 0.04)), V(cx + c * (r - 0.04), y + 0.9, cz - s * (r - 0.04)), 0.01, 0.01, BRASS_D, { n: 4 })); }
  }
  P.push(cyl(V(cx, y0, cz), V(cx, y1 + 0.2, cz), 0.06, 0.06, BRASS_D, { n: 8 }));
  const rail = [];
  for (let k = 0; k <= steps; k++) { const a = a0 + k * da, y = y0 + k * dy + 0.9; rail.push(V(cx + Math.cos(a) * (r - 0.04), y, cz - Math.sin(a) * (r - 0.04))); }
  P.push(tube(rail, rail.map(() => 0.022), BRASS, { n: 5 }));
  return P;
}
// in the main bar: a spiral stair up to the hotel floor in the corner right of the back bar
const STAIR2 = { x: 4.15, z: -3.15 };
S.push(...spiralStairs(STAIR2.x, STAIR2.z, 0.78, 0, 3.2, -Math.PI / 2, 16, Math.PI * 1.7, [52, 32, 20]));
S.push(cyl(V(STAIR2.x, 0, STAIR2.z), V(STAIR2.x, 0.02, STAIR2.z), 0.9, 0.9, [30, 26, 24], { n: 18, amt: 0.02 }));
const stairSign = goldSign('HOTEL', 128, 32, 22); CARD_SIGNS.push(stairSign);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), decal({ map: stairSign.tex, transparent: true })); m.position.set(4.97, 2.15, -3.15); m.rotation.y = -Math.PI / 2; scene.add(m); }
// behind the bar, between the counter and the back shelves: a trapdoor
const TRAP = { x: -1.9, z: -3.17 };
{
  const P = [];
  P.push(box(TRAP.x - 0.38, TRAP.x + 0.38, 0.0, 0.025, TRAP.z - 0.26, TRAP.z + 0.26, [46, 30, 18], 0.06));
  for (let k = 0; k < 5; k++) P.push(box(TRAP.x - 0.37 + k * 0.15, TRAP.x - 0.365 + k * 0.15, 0.025, 0.028, TRAP.z - 0.25, TRAP.z + 0.25, [24, 16, 10], 0));
  for (const dz of [-0.17, 0.17]) P.push(box(TRAP.x - 0.36, TRAP.x + 0.36, 0.025, 0.035, TRAP.z + dz - 0.025, TRAP.z + dz + 0.025, [40, 40, 44], 0.04));
  P.push(tube([V(TRAP.x + 0.2, 0.04, TRAP.z - 0.06), V(TRAP.x + 0.27, 0.04, TRAP.z), V(TRAP.x + 0.2, 0.04, TRAP.z + 0.06), V(TRAP.x + 0.13, 0.04, TRAP.z), V(TRAP.x + 0.2, 0.04, TRAP.z - 0.06)], [0.01, 0.01, 0.01, 0.01, 0.01], [70, 70, 76], { n: 4 }));
  S.push(...P);
}

// ===== THE BASEMENT (under the bar): one bare bulb, brick, an empty chair in the middle =====
const BASE = { x0: 96.5, x1: 103.5, z0: -3, z1: 3, cx: 100, cz: 0 };
const baseFloorTex = canvasTex(32, 32, (x, w, h) => {
  noiseFill(x, w, h, [34, 33, 31], 7);
  x.fillStyle = 'rgba(10,10,8,0.5)'; for (let k = 0; k < 4; k++) x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 3 + Math.floor(rr() * 6), 2 + Math.floor(rr() * 4));
  x.fillStyle = 'rgb(22,22,20)'; x.fillRect(0, 15, w, 1); x.fillRect(15, 0, 1, h);
});
baseFloorTex.wrapS = baseFloorTex.wrapT = THREE.RepeatWrapping;
{
  const r = { x0: BASE.x0, x1: BASE.x1, z0: BASE.z0, z1: BASE.z1 };
  floorFor(r, baseFloorTex, 1.6);
  roomWalls(r, {}, wallMats.brick);
  const W = [62, 44, 26], WD = [44, 30, 18], IRON = [40, 40, 44], RUST = [92, 52, 30];
  // a drain under the chair, and darker stains round it
  S.push(cyl(V(100, 0.0, 0), V(100, 0.012, 0), 0.16, 0.16, [16, 16, 18], { n: 12 }));
  for (let k = 0; k < 6; k++) S.push(box(99.88 + k * 0.05, 99.9 + k * 0.05, 0.012, 0.016, -0.12, 0.12, [6, 6, 6], 0));
  // the chair: plain wood, rope round the arms and legs
  { const P = [], cx = 100, cz = 0.3;
    P.push(box(-0.24, 0.24, 0.42, 0.47, -0.22, 0.22, W, 0.08));
    for (const [dx, dz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) P.push(box(dx - 0.025, dx + 0.025, 0, 0.42, dz - 0.025, dz + 0.025, WD, 0.06));
    for (const dx of [-0.2, 0.2]) P.push(box(dx - 0.025, dx + 0.025, 0.47, 1.02, -0.22, -0.17, WD, 0.06));
    P.push(box(-0.22, 0.22, 0.8, 0.9, -0.22, -0.18, W, 0.08));
    for (const e of [-1, 1]) {
      P.push(box(e * 0.22 - 0.03, e * 0.22 + 0.03, 0.66, 0.7, -0.2, 0.18, W, 0.08));
      P.push(box(e * 0.22 - 0.02, e * 0.22 + 0.02, 0.47, 0.66, 0.15, 0.19, WD, 0.06));
      for (const y of [0.67, 0.12]) P.push(loft([rring(y - 0.02, 0.07, 0.07, e * 0.2, y > 0.5 ? 0.0 : 0.18, 8, 2), rring(y + 0.02, 0.07, 0.07, e * 0.2, y > 0.5 ? 0.0 : 0.18, 8, 2)], [150, 128, 90], { amt: 0.1 }));
    }
    S.push(...placeParts(P, cx, cz, Math.PI, 0)); }
  // a workbench on the left wall: tools laid out, a car battery with jump leads, tape, a gooseneck lamp aimed at the chair
  S.push(box(96.55, 97.25, 0.85, 0.9, -1.5, 1.5, W, 0.08));
  for (const z of [-1.4, 1.4]) S.push(box(96.6, 97.2, 0, 0.85, z - 0.04, z + 0.04, WD, 0.06));
  S.push(box(96.58, 97.22, 0.25, 0.29, -1.45, 1.45, WD, 0.08));
  S.push(box(96.6, 96.85, 0.9, 1.08, -1.2, -0.85, [30, 30, 32], 0.04)); for (const dz of [-1.12, -0.93]) S.push(cyl(V(96.7, 1.08, dz), V(96.7, 1.11, dz), 0.025, 0.025, dz < -1 ? [180, 30, 30] : [30, 30, 30], { n: 6 }));
  S.push(tube([V(96.7, 1.1, -1.12), V(96.95, 1.0, -0.9), V(97.1, 0.92, -0.55)], [0.008, 0.008, 0.008], [170, 30, 30], { n: 4 }));
  S.push(tube([V(96.7, 1.1, -0.93), V(96.9, 0.98, -0.7), V(97.05, 0.92, -0.45)], [0.008, 0.008, 0.008], [20, 20, 20], { n: 4 }));
  S.push(box(96.95, 97.15, 0.9, 0.93, -0.25, -0.05, IRON, 0.05)); S.push(box(96.92, 97.18, 0.9, 0.94, 0.2, 0.28, [120, 30, 30], 0.05));
  S.push(box(96.8, 97.15, 0.9, 0.925, 0.45, 0.52, [110, 110, 116], 0.04)); S.push(box(96.75, 96.82, 0.9, 0.93, 0.44, 0.53, [70, 40, 20], 0.05));
  S.push(cyl(V(97.0, 0.9, 0.9), V(97.0, 0.97, 0.9), 0.06, 0.06, [150, 150, 150], { n: 10 }));
  S.push(box(96.62, 96.72, 0.9, 1.05, 1.1, 1.3, [40, 60, 40], 0.05));
  S.push(cyl(V(97.05, 0.9, 1.2), V(97.05, 0.95, 1.2), 0.06, 0.07, IRON, { n: 8 }));
  S.push(tube([V(97.05, 0.95, 1.2), V(97.1, 1.4, 1.1), V(97.4, 1.55, 0.9), V(97.55, 1.5, 0.75)], [0.01, 0.01, 0.01, 0.01], IRON, { n: 4 }));
  S.push(loft([rring(1.5, 0.05, 0.05, 97.58, 0.72, 8, 2), rring(1.43, 0.16, 0.16, 97.62, 0.68, 8, 2)], [30, 60, 30], { amt: 0.03, cap: false }));
  G.push(cyl(V(97.62, 1.43, 0.68), V(97.62, 1.44, 0.68), 0.06, 0.06, [255, 240, 200], { n: 8, amt: 0 }));
  // a pegboard of tools above it
  S.push(box(96.52, 96.55, 1.2, 2.2, -1.4, 1.4, [96, 76, 52], 0.06));
  for (const [z, y, w2, h2, c] of [[-1.1, 1.6, 0.04, 0.4, IRON], [-0.8, 1.7, 0.18, 0.04, IRON], [-0.5, 1.55, 0.05, 0.3, [130, 30, 30]], [-0.2, 1.65, 0.3, 0.1, [150, 150, 156]], [0.2, 1.6, 0.04, 0.45, [70, 46, 24]], [0.55, 1.75, 0.2, 0.05, IRON], [0.9, 1.6, 0.08, 0.3, [200, 160, 40]], [1.15, 1.55, 0.04, 0.35, IRON]])
    S.push(box(96.55, 96.58, y - h2 / 2, y + h2 / 2, z - w2 / 2, z + w2 / 2, c, 0.05));
  for (let k = 0; k < 3; k++) S.push(tube([V(96.6, 2.2, -1.3 + k * 0.08), V(96.62, 1.7 - k * 0.1, -1.25 + k * 0.08), V(96.6, 1.25 - k * 0.05, -1.3 + k * 0.08)], [0.012, 0.012, 0.012], [70, 70, 74], { n: 4 }));
  // the back wall: a corkboard of photos joined with red string; a steel safe; a pallet of cash and a money bag
  S.push(box(98.6, 100.6, 1.3, 2.4, -2.99, -2.95, [120, 84, 50], 0.06));
  S.push(box(98.55, 100.65, 1.27, 2.43, -2.995, -2.98, WD, 0.04));
  const pins = [[98.9, 2.15], [99.5, 2.2], [100.2, 2.1], [99.2, 1.65], [99.9, 1.55], [100.4, 1.7]];
  for (const [x, y] of pins) { S.push(box(x - 0.1, x + 0.1, y - 0.07, y + 0.07, -2.95, -2.94, [210, 205, 190], 0.04)); S.push(box(x - 0.07, x + 0.07, y - 0.05, y + 0.04, -2.94, -2.935, [60, 56, 54], 0.1)); }
  for (const [a, b] of [[0, 3], [3, 1], [1, 4], [4, 2], [2, 5], [0, 4]]) { const p = pins[a], q = pins[b]; S.push(cyl(V(p[0], p[1], -2.93), V(q[0], q[1], -2.93), 0.004, 0.004, [200, 20, 20], { n: 3 })); }
  S.push(box(102.75, 103.45, 0, 1.0, -1.95, -1.25, [50, 54, 58], 0.03)); S.push(cyl(V(102.75, 0.62, -1.6), V(102.72, 0.62, -1.6), 0.11, 0.11, [150, 150, 150], { n: 12 }));
  for (const y of [0.3, 0.85]) S.push(box(102.72, 102.75, y - 0.04, y + 0.04, -1.9, -1.8, [120, 120, 126], 0.03));
  S.push(box(96.7, 97.9, 0, 0.12, 2.0, 2.85, [110, 82, 50], 0.08));
  for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 4; k++) S.push(box(96.8 + k * 0.26, 97.02 + k * 0.26, 0.12 + r2 * 0.09, 0.2 + r2 * 0.09, 2.1 + (r2 % 2) * 0.05, 2.65 + (r2 % 2) * 0.05, [60, 96, 54], 0.06));
  for (let k = 0; k < 4; k++) S.push(box(96.82 + k * 0.26, 96.85 + k * 0.26, 0.12, 0.39, 2.1, 2.7, [220, 214, 196], 0));
  S.push(loft([rring(0, 0.4, 0.4, 98.25, 2.5, 10, 2), rring(0.25, 0.5, 0.5, 98.25, 2.5, 10, 2), rring(0.45, 0.32, 0.32, 98.25, 2.5, 10, 2), rring(0.55, 0.08, 0.08, 98.25, 2.5, 10, 2)], [150, 128, 90], { smooth: true, amt: 0.08 }));
  // crates and burlap sacks, two barrels, a metal shelf with cans and jars, a bucket
  for (const [x, z, y0, s] of [[102.7, 2.3, 0, 0.5], [102.7, 1.65, 0, 0.5], [102.72, 2.3, 0.5, 0.42]]) S.push(box(x - s / 2, x + s / 2, y0, y0 + s, z - s / 2, z + s / 2, [96, 70, 40], 0.08));
  for (const [x, z] of [[101.7, 2.55], [102.2, 2.6], [101.95, 2.2]]) S.push(loft([rring(0, 0.38, 0.32, x, z, 10, 2), rring(0.18, 0.46, 0.38, x, z, 10, 2), rring(0.32, 0.34, 0.3, x, z, 10, 2), rring(0.4, 0.1, 0.1, x, z, 10, 2)], [128, 104, 70], { smooth: true, amt: 0.08 }));
  for (const z of [-0.6, 0.15]) { S.push(cyl(V(103.15, 0, z), V(103.15, 0.85, z), 0.28, 0.28, RUST, { n: 12, amt: 0.08 })); for (const y of [0.15, 0.7]) S.push(cyl(V(103.15, y, z), V(103.15, y + 0.04, z), 0.29, 0.29, [50, 30, 18], { n: 12 })); }
  S.push(box(103.1, 103.45, 0, 1.9, 0.9, 1.6, IRON, 0.03));
  for (const y of [0.5, 1.0, 1.5]) { S.push(box(103.1, 103.45, y, y + 0.03, 0.9, 1.6, [60, 60, 64], 0.03)); for (let k = 0; k < 4; k++) S.push(cyl(V(103.27, y + 0.03, 0.98 + k * 0.17), V(103.27, y + 0.2, 0.98 + k * 0.17), 0.05, 0.05, [[120, 90, 40], [60, 80, 60], [160, 150, 120], [90, 30, 30]][(k + Math.round(y * 2)) % 4], { n: 8 })); }
  S.push(cyl(V(99.0, 0, 1.4), V(99.0, 0.32, 1.4), 0.15, 0.17, [110, 110, 116], { n: 10 }));
  // a straight wooden stair coming down from the ceiling along the back wall (the way in from the trapdoor)
  for (let k = 0; k < 10; k++) {
    const x = 103.4 - k * 0.28, y = 3.0 - (k + 1) * 0.3;
    S.push(box(x - 0.28, x, y, y + 0.04, -2.95, -2.15, W, 0.08));
  }
  for (const z of [-2.95, -2.15]) S.push(tube([V(103.45, 3.2, z), V(100.6, 0.0, z)], [0.03, 0.03], WD, { n: 4 }));
  S.push(tube([V(103.4, 4.0, -2.12), V(100.7, 0.9, -2.12)], [0.02, 0.02], WD, { n: 4 }));
  for (let k = 0; k < 5; k++) { const x = 103.2 - k * 0.6; S.push(cyl(V(x, 3.0 - (103.4 - x) / 0.28 * 0.3 + 0.05, -2.12), V(x, 3.95 - (103.4 - x) / 0.28 * 0.3, -2.12), 0.012, 0.012, WD, { n: 4 })); }
  // pipes along the top of the walls, and a bare bulb on a cord (it swings; see the hook)
  S.push(cyl(V(96.6, 2.9, -2.9), V(103.4, 2.9, -2.9), 0.05, 0.05, RUST, { n: 6 }));
  S.push(cyl(V(96.6, 2.75, 2.9), V(103.4, 2.75, 2.9), 0.035, 0.035, [70, 72, 76], { n: 6 }));
  S.push(box(103.3, 103.45, 2.0, 2.1, -1.4, 0.2, [30, 30, 32], 0.03));
  G.push(box(103.32, 103.34, 1.97, 2.0, -1.35, 0.15, [170, 230, 180], 0));
}
const baseBulb = new THREE.Group(); baseBulb.position.set(100, 3.2, 0.3); scene.add(baseBulb);
baseBulb.add(new THREE.Mesh(toGeometry([cyl(V(0, 0, 0), V(0, -1.05, 0), 0.006, 0.006, [20, 20, 20], { n: 4 }), cyl(V(0, -1.05, 0), V(0, -1.12, 0), 0.025, 0.025, [60, 56, 50], { n: 6 })]), roomMat));
baseBulb.add(new THREE.Mesh(toGeometry([loft([rring(-1.12, 0.05, 0.05, 0, 0, 8, 2), rring(-1.18, 0.09, 0.09, 0, 0, 8, 2), rring(-1.24, 0.03, 0.03, 0, 0, 8, 2)], [255, 230, 170], { smooth: true, amt: 0 })]), glowMat));

// ===== THE HOTEL FLOOR (upstairs): a corridor with eight rooms, four on each side =====
const HF = { x0: 196, x1: 221, z0: -1.2, z1: 1.2 };
const HOTEL_ROOMS = [];
for (let i = 0; i < 8; i++) {
  const side = i < 4 ? 1 : -1, x0 = 200.5 + (i % 4) * 5;
  HOTEL_ROOMS.push({ i, side, x0, x1: x0 + 5, z0: side > 0 ? 1.2 : -7.0, z1: side > 0 ? 7.0 : -1.2, num: 201 + i, door: x0 + 2.5, tv: { x: x0 + 5 - 0.04, y: 1.45, z: side * 4.2, w: 1.4, h: 0.79 } });
}
{
  const hall = { x0: HF.x0, x1: HF.x1, z0: HF.z0, z1: HF.z1 };
  floorFor(hall, runnerTex, 0.8);
  roomWalls(hall, {}, wallMats.panel);
  for (const x of [199, 203, 208, 213, 218]) for (const z of [-1.17, 1.17]) sconceZ(x, z, z < 0 ? 1 : -1);
  // the landing at the top of the spiral stair, with a brass rail round the opening
  S.push(...spiralStairs(197.4, 0, 0.75, -1.45, -0.03, -Math.PI / 2 + Math.PI * 1.7 * 0.55, 7, Math.PI * 1.7 * 0.45, [52, 32, 20]));
  S.push(cyl(V(197.4, 0.004, 0), V(197.4, 0.01, 0), 0.82, 0.82, [6, 6, 7], { n: 18, amt: 0 }));
  for (let k = 0; k < 3; k++) { const a = -Math.PI * 0.2 - k * 0.5; S.push(...placeParts([box(0.08, 0.72, 0.01, 0.03, -0.17, 0.17, [44, 28, 18], 0.05)], 197.4, 0, a, -0.12 * k)); }
  const rail = []; for (let k = 0; k <= 14; k++) { const a = -Math.PI * 0.25 + Math.PI * 1.5 * k / 14; rail.push(V(197.4 + Math.cos(a) * 0.86, 0.95, Math.sin(a) * 0.86)); }
  S.push(tube(rail, rail.map(() => 0.022), BRASS, { n: 5 }));
  for (let k = 0; k <= 14; k += 2) { const p = rail[k]; S.push(cyl(V(p[0], 0, p[2]), V(p[0], 0.95, p[2]), 0.012, 0.012, BRASS_D, { n: 4 })); }
  // a console with flowers at the far end, under the hotel's name
  S.push(box(220.5, 220.97, 0, 0.85, -0.7, 0.7, L_WAL, 0.04)); S.push(box(220.48, 220.98, 0.85, 0.89, -0.72, 0.72, MARBLE, 0.03));
  S.push(cyl(V(220.75, 0.89, 0), V(220.75, 1.15, 0), 0.08, 0.06, [200, 196, 186], { n: 10 })); for (let k = 0; k < 7; k++) S.push(cyl(V(220.75, 1.1, 0), V(220.75 + Math.cos(k) * 0.15, 1.4 + (k % 3) * 0.06, Math.sin(k) * 0.15), 0.025, 0.04, [[150, 20, 30], [210, 200, 190], [140, 30, 60]][k % 3], { n: 5 }));
}
const hotelName = goldSign('HOTEL SH1DEN', 256, 40, 26); CARD_SIGNS.push(hotelName);
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.28), decal({ map: hotelName.tex, transparent: true })); m.position.set(220.97, 2.1, 0); m.rotation.y = -Math.PI / 2; scene.add(m); }
const ROOM_THEME = [[96, 18, 26], [24, 44, 70], [30, 60, 40], [110, 80, 40], [70, 24, 70], [26, 26, 30], [120, 60, 30], [40, 70, 80]];
const roomTvGlass = [];
for (const R of HOTEL_ROOMS) {
  const { x0, x1, z0, z1, side } = R, theme = ROOM_THEME[R.i];
  const W2 = (u0, u1, w0, w1) => [x0 + u0, x0 + u1, Math.min(side * (1.2 + w0), side * (1.2 + w1)), Math.max(side * (1.2 + w0), side * (1.2 + w1))];
  const bx = (u0, u1, y0, y1, w0, w1, col, amt) => { const [a, b, c, d] = W2(u0, u1, w0, w1); return box(a, b, y0, y1, c, d, col, amt); };
  floorFor({ x0, x1, z0, z1 }, R.i % 2 ? vipTex : luxCarpetTex, R.i % 2 ? 0.8 : 1.4);
  roomWalls({ x0, x1, z0, z1 }, {}, R.i % 2 ? wallMats.panel : wallMats.deco);
  // the door, seen from the corridor and from inside, with its number over it
  for (const [wa, wb] of [[-0.05, -0.002], [0.002, 0.05]]) {
    S.push(bx(2.0, 3.0, 0, 2.2, wa, wb, L_WAL_D, 0.03));
    S.push(bx(2.06, 2.94, 0.1, 1.0, wa + (wa < 0 ? -0.006 : 0.006), wb + (wa < 0 ? -0.006 : 0.006), L_WAL, 0.03));
    S.push(bx(2.06, 2.94, 1.1, 2.1, wa + (wa < 0 ? -0.006 : 0.006), wb + (wa < 0 ? -0.006 : 0.006), L_WAL, 0.03));
    S.push(bx(2.78, 2.86, 1.0, 1.06, wa < 0 ? wa - 0.03 : wb, wa < 0 ? wa : wb + 0.03, BRASS, 0.02));
  }
  const ns = goldSign(String(R.num), 96, 32, 24); CARD_SIGNS.push(ns);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.14), decal({ map: ns.tex, transparent: true })); m.position.set(x0 + 2.5, 2.38, side * 1.2 - side * 0.01); m.rotation.y = side > 0 ? Math.PI : 0; scene.add(m); }
  // the bed against the back wall: tufted headboard, nightstands with lamps
  S.push(bx(0.7, 2.3, 0.12, 0.42, 3.75, 5.76, L_WAL_D, 0.04));
  S.push(bx(0.72, 2.28, 0.42, 0.6, 3.78, 5.74, [226, 222, 214], 0.03));
  S.push(bx(0.69, 2.31, 0.58, 0.66, 3.74, 5.0, theme, 0.05));
  for (const u of [1.1, 1.9]) S.push(bx(u - 0.32, u + 0.32, 0.6, 0.74, 5.25, 5.65, [236, 232, 224], 0.04));
  S.push(bx(0.6, 2.4, 0.12, 1.4, 5.74, 5.8, theme.map((v) => v * 0.7), 0.05));
  for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) S.push(bx(0.78 + k * 0.29, 0.81 + k * 0.29, 0.85 + j * 0.25, 0.88 + j * 0.25, 5.735, 5.74, theme.map((v) => v * 0.4), 0));
  for (const u of [0.42, 2.58]) {
    S.push(bx(u - 0.2, u + 0.2, 0, 0.52, 5.35, 5.78, L_WAL, 0.04));
    S.push(cyl(V(x0 + u, 0.52, side * (1.2 + 5.55)), V(x0 + u, 0.82, side * (1.2 + 5.55)), 0.04, 0.03, BRASS, { n: 6 }));
    G.push(loft([rring(0.8, 0.26, 0.26, x0 + u, side * (1.2 + 5.55), 10, 2), rring(1.0, 0.18, 0.18, x0 + u, side * (1.2 + 5.55), 10, 2)], [255, 214, 160], { amt: 0, cap: false }));
  }
  // a loveseat facing the TV on the far wall, a low table between
  chesterfield(x0 + 0.52, side * (1.2 + 3.0), Math.PI / 2, 1.4, theme.map((v) => Math.min(255, v * 1.1)));
  S.push(bx(1.55, 2.35, 0.32, 0.36, 2.6, 3.4, L_WAL, 0.04)); for (const [u, w] of [[1.6, 2.65], [2.3, 2.65], [1.6, 3.35], [2.3, 3.35]]) S.push(bx(u - 0.02, u + 0.02, 0, 0.32, w - 0.02, w + 0.02, L_WAL_D, 0.03));
  S.push(bx(4.55, 4.97, 0, 0.5, 2.1, 3.9, L_WAL_D, 0.04));
  S.push(bx(4.93, 4.965, 1.0, 1.9, 2.2, 3.8, [10, 10, 12], 0.02));
  const tg = new THREE.Mesh(new THREE.PlaneGeometry(R.tv.w, R.tv.h), decal({ color: 0x000000, opacity: 0, blending: THREE.NoBlending, fog: false }));
  tg.position.set(R.tv.x - 0.005, R.tv.y, R.tv.z); tg.rotation.y = -Math.PI / 2; scene.add(tg); roomTvGlass.push(tg);
  // a minibar fridge by the door, a window onto the city with heavy curtains
  S.push(bx(4.3, 4.95, 0, 0.85, 0.1, 0.65, [30, 30, 34], 0.03)); S.push(bx(4.32, 4.93, 0.84, 0.86, 0.12, 0.63, L_WAL, 0.03));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: windowTex }));
  win.position.set(x0 + 3.85, 1.65, side * (1.2 + 5.79)); win.rotation.y = side > 0 ? Math.PI : 0; scene.add(win);
  S.push(bx(3.1, 4.6, 0.92, 0.96, 5.7, 5.8, BRASS_D, 0.03)); S.push(bx(3.1, 4.6, 2.34, 2.38, 5.7, 5.8, BRASS_D, 0.03));
  for (const u of [2.95, 4.75]) for (let k = 0; k < 3; k++) { const uu = u - 0.1 + k * 0.1, w = 5.7; S.push(tube([V(x0 + uu, 0.02, side * (1.2 + w)), V(x0 + uu + 0.02, 1.3, side * (1.2 + w - 0.05)), V(x0 + uu, 2.5, side * (1.2 + w))], [0.05, 0.06, 0.05], [92, 12, 20], { n: 6, amt: 0.08 })); }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.0), decal({ map: loungeRugTex(R.i % 2 ? '#2a1a40' : '#4a1014', '#14181e') }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(x0 + 2.0, 0.012, side * (1.2 + 3.0)); scene.add(rug);
}

// ================================================================ THE FOREST: textured trees in four kinds, merged into chunks so far ones can be skipped
// pines (stacked drooping tiers of needles), oaks (a forked trunk under clumps of leaves), birches (white bark, airy crowns), bushes
function hash32(n) { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }
const FOREST = [];
function tree(x, z, s) { FOREST.push({ k: 'oak', x, z, s }); }
function pineTree(x, z, s) { FOREST.push({ k: 'pine', x, z, s }); }
function birch(x, z, s) { FOREST.push({ k: 'birch', x, z, s }); }
function bush(x, z, s) { FOREST.push({ k: 'bush', x, z, s }); }
const leafTex = canvasTex(64, 64, (x, w, h) => {
  const r = rngFrom(77); x.fillStyle = 'rgb(118,128,104)'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 520; k++) {   // overlapping leaves, lighter on top, dark gaps between
    const px = r() * w, py = r() * h, s = 1.5 + r() * 2.6, v = 70 + Math.floor(r() * 120);
    x.fillStyle = `rgb(${v},${Math.min(255, v + 20)},${Math.floor(v * 0.75)})`; x.beginPath(); x.ellipse(px, py, s, s * 0.6, r() * 3, 0, 7); x.fill();
  }
  for (let k = 0; k < 60; k++) { x.fillStyle = 'rgba(20,24,16,0.7)'; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2, 2); }
});
const needleTex = canvasTex(64, 64, (x, w, h) => {
  const r = rngFrom(78); x.fillStyle = 'rgb(70,86,70)'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 900; k++) { const px = Math.floor(r() * w), py = Math.floor(r() * h), v = 50 + Math.floor(r() * 110); x.fillStyle = `rgb(${Math.floor(v * 0.8)},${v},${Math.floor(v * 0.8)})`; x.fillRect(px, py, 1, 2 + Math.floor(r() * 3)); }
  for (let j = 6; j < h; j += 9) { x.fillStyle = 'rgba(16,22,16,0.55)'; x.fillRect(0, j, w, 1); }   // layered branch shadows
});
const barkTex = canvasTex(32, 64, (x, w, h) => {
  const r = rngFrom(79); x.fillStyle = 'rgb(150,150,150)'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 140; k++) { const px = Math.floor(r() * w), v = 60 + Math.floor(r() * 120); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(px, Math.floor(r() * h), 1, 3 + Math.floor(r() * 10)); }
});
const birchTex = canvasTex(32, 64, (x, w, h) => {
  const r = rngFrom(80); x.fillStyle = 'rgb(230,228,220)'; x.fillRect(0, 0, w, h);
  for (let k = 0; k < 40; k++) { x.fillStyle = 'rgb(30,30,32)'; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3 + Math.floor(r() * 9), 1 + Math.floor(r() * 2)); }
  for (let k = 0; k < 120; k++) { x.fillStyle = 'rgba(160,156,146,0.6)'; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }
});
for (const t of [leafTex, needleTex, barkTex, birchTex]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
const FOREST_MATS = {
  leaf: ps1(new THREE.MeshLambertMaterial({ map: leafTex, vertexColors: true, flatShading: true })),
  needle: ps1(new THREE.MeshLambertMaterial({ map: needleTex, vertexColors: true, flatShading: true })),
  bark: ps1(new THREE.MeshLambertMaterial({ map: barkTex, vertexColors: true })),
  birch: ps1(new THREE.MeshLambertMaterial({ map: birchTex, vertexColors: true }))
};
// a piece of a tree: any three.js shape, made rough (each corner nudged by a fixed amount, so faces still meet), tinted and placed
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();
function forestPiece(bucket, mat, geo, pos, rot, scl, tint, rough, seed, shade) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  if (rough) for (let i = 0; i < p.count; i++) {
    const kx = Math.round(p.getX(i) * 100), ky = Math.round(p.getY(i) * 100), kz = Math.round(p.getZ(i) * 100), hsh = hash32(kx * 73856093 ^ ky * 19349663 ^ kz * 83492791 ^ seed);
    p.setXYZ(i, p.getX(i) + ((hsh & 255) / 255 - 0.5) * rough, p.getY(i) + (((hsh >> 8) & 255) / 255 - 0.5) * rough, p.getZ(i) + (((hsh >> 16) & 255) / 255 - 0.5) * rough);
  }
  _e.set(rot[0], rot[1], rot[2]); _q.setFromEuler(_e); _v.set(pos[0], pos[1], pos[2]); _sc.set(scl[0], scl[1], scl[2]);
  _m4.compose(_v, _q, _sc); g.applyMatrix4(_m4);
  g.computeVertexNormals();
  // colour: the tint, darker toward the bottom of each piece (self-shadow) and a little noisy
  const n = p.count, col = new Float32Array(n * 3);
  let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < n; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let i = 0; i < n; i++) {
    const u = y1 > y0 ? (p.getY(i) - y0) / (y1 - y0) : 1, k = (shade === undefined ? 0.62 : shade) + (1 - (shade === undefined ? 0.62 : shade)) * u, jit = 0.92 + ((hash32(i * 2654435761 ^ seed) & 255) / 255) * 0.16;
    col[i * 3] = tint[0] / 255 * k * jit; col[i * 3 + 1] = tint[1] / 255 * k * jit; col[i * 3 + 2] = tint[2] / 255 * k * jit;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  (bucket[mat] = bucket[mat] || []).push(g);
}
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry(), keys = ['position', 'normal', 'uv', 'color'], sizes = [3, 3, 2, 3];
  keys.forEach((k, ki) => {
    const arr = new Float32Array(n * sizes[ki]); let o = 0;
    for (const g of list) { const a = g.attributes[k]; if (a) arr.set(a.array, o); o += g.attributes.position.count * sizes[ki]; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, sizes[ki]));
  });
  return out;
}
function buildForest() {
  const cells = new Map();
  for (const t of FOREST) {
    const key = Math.floor(t.x / 30) + ',' + Math.floor(t.z / 30);
    if (!cells.has(key)) cells.set(key, {});
    const B = cells.get(key), s = t.s, seed = hash32(Math.round(t.x * 100) ^ Math.round(t.z * 100) * 31), r = rngFrom(seed), yaw = r() * 6.28;
    if (t.k === 'pine') {
      const tint = [[60, 96, 66], [52, 86, 62], [70, 104, 70], [58, 90, 74]][Math.floor(r() * 4)];
      forestPiece(B, 'bark', new THREE.CylinderGeometry(0.1 * s, 0.17 * s, 2.0 * s, 6, 2), [t.x, 1.0 * s, t.z], [0, yaw, 0], [1, 1, 1], [120, 88, 64], 0.03 * s, seed, 0.7);
      const tiers = 4 + Math.floor(r() * 2);
      for (let k = 0; k < tiers; k++) {
        const u = k / tiers, rad = (1.9 - 1.45 * u) * s, hgt = (1.9 - 0.5 * u) * s, y = (1.1 + k * 1.05) * s + hgt / 2;
        forestPiece(B, 'needle', new THREE.ConeGeometry(rad, hgt, 9, 2, false), [t.x + (r() - 0.5) * 0.15, y, t.z + (r() - 0.5) * 0.15], [(r() - 0.5) * 0.12, yaw + k * 0.7, (r() - 0.5) * 0.12], [1, 1, 1], tint, 0.22 * s, seed + k, 0.5);
      }
      forestPiece(B, 'needle', new THREE.ConeGeometry(0.35 * s, 1.1 * s, 6, 1), [t.x, (1.1 + tiers * 1.05 + 0.3) * s, t.z], [0, yaw, 0], [1, 1, 1], tint, 0.05, seed + 9, 0.6);
    } else if (t.k === 'oak') {
      const tint = [[74, 112, 58], [86, 120, 60], [66, 104, 56], [104, 118, 58], [120, 104, 52]][Math.floor(r() * 5)];
      const lean = (r() - 0.5) * 0.12;
      forestPiece(B, 'bark', new THREE.CylinderGeometry(0.14 * s, 0.24 * s, 2.4 * s, 7, 3), [t.x, 1.2 * s, t.z], [lean, yaw, lean], [1, 1, 1], [110, 86, 64], 0.06 * s, seed, 0.65);
      // two or three limbs fork out of the trunk
      const limbs = 2 + Math.floor(r() * 2);
      for (let k = 0; k < limbs; k++) {
        const a = yaw + k * (6.28 / limbs), tilt = 0.6 + r() * 0.3;
        forestPiece(B, 'bark', new THREE.CylinderGeometry(0.06 * s, 0.11 * s, 1.5 * s, 5, 1), [t.x + Math.sin(a) * 0.35 * s, 2.6 * s, t.z + Math.cos(a) * 0.35 * s], [Math.cos(a) * tilt, 0, -Math.sin(a) * tilt], [1, 1, 1], [104, 82, 62], 0.03 * s, seed + 20 + k, 0.7);
      }
      // the crown: a big clump in the middle and smaller ones around it
      const blobs = 6 + Math.floor(r() * 3);
      for (let k = 0; k < blobs; k++) {
        const a = r() * 6.28, d = k === 0 ? 0 : (0.7 + r() * 0.7) * s, rad = (k === 0 ? 1.45 : 0.85 + r() * 0.45) * s;
        forestPiece(B, 'leaf', new THREE.IcosahedronGeometry(rad, 1), [t.x + Math.sin(a) * d, (3.3 + (k === 0 ? 0.3 : (r() - 0.3) * 1.0)) * s, t.z + Math.cos(a) * d], [r() * 3, r() * 3, 0], [1, 0.78 + r() * 0.15, 1], tint, 0.3 * s, seed + 40 + k, 0.55);
      }
    } else if (t.k === 'birch') {
      const tint = [[120, 150, 70], [104, 140, 66], [140, 150, 74]][Math.floor(r() * 3)];
      const lean = (r() - 0.5) * 0.2;
      forestPiece(B, 'birch', new THREE.CylinderGeometry(0.07 * s, 0.11 * s, 3.8 * s, 6, 3), [t.x, 1.9 * s, t.z], [lean, yaw, -lean * 0.5], [1, 1, 1], [236, 234, 226], 0.03 * s, seed, 0.8);
      for (let k = 0; k < 4; k++) {
        const a = r() * 6.28, d = (0.2 + r() * 0.5) * s;
        forestPiece(B, 'leaf', new THREE.IcosahedronGeometry((0.6 + r() * 0.35) * s, 1), [t.x + Math.sin(a) * d + lean * 2.5 * s, (3.1 + r() * 1.3) * s, t.z + Math.cos(a) * d], [r() * 3, r() * 3, 0], [0.85, 1.15, 0.85], tint, 0.22 * s, seed + 60 + k, 0.6);
      }
    } else {
      const tint = [[52, 92, 46], [60, 100, 50], [46, 82, 44], [70, 96, 48]][Math.floor(r() * 4)];
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) { const a = r() * 6.28, d = (k ? 0.35 : 0) * s; forestPiece(B, 'leaf', new THREE.IcosahedronGeometry((0.45 + r() * 0.3) * s, 1), [t.x + Math.sin(a) * d, (0.32 + r() * 0.15) * s, t.z + Math.cos(a) * d], [r() * 3, r() * 3, 0], [1.1, 0.75, 1.1], tint, 0.16 * s, seed + 80 + k, 0.45); }
      if (r() < 0.35) for (let k = 0; k < 6; k++) { const a = r() * 6.28, d = 0.3 * s; G.push(cyl(V(t.x + Math.sin(a) * d * 1.4, 0.55 * s, t.z + Math.cos(a) * d * 1.4), V(t.x + Math.sin(a) * d * 1.4, 0.6 * s, t.z + Math.cos(a) * d * 1.4), 0.04, 0.03, [[255, 240, 220], [255, 214, 90], [230, 150, 220]][Math.floor(r() * 3)], { n: 5, amt: 0 })); }
    }
  }
  for (const [, B] of cells) for (const mat in B) { const m = new THREE.Mesh(mergeGeos(B[mat]), FOREST_MATS[mat]); scene.add(m); }
  FOREST.length = 0;
}

// ================================================================ OUTSIDE: the street turns the corner, the valet drive, and the big public car park
// ---- the corner: past the dance room the street bends left and runs down the side of the building
const CC = { x: ST.x1, z: 2.0 }, CRI = ST.curb0 - CC.z, CRO = ST.curb1 - CC.z;   // turn centre, inner and outer curb radius
const SS = { x0: CC.x + CRI, x1: CC.x + CRO, z1: CC.z, z0: -66.2 };                  // the side street's road
const groundAt = (x0, x1, z0, z1, mat, tile, y) => { const m = groundPlane(x0, x1, z0, z1, asphaltTex, tile, y); m.material = mat; return m; };
const pavingMat = new THREE.MeshLambertMaterial({ map: pavingTex }), asphaltMat = new THREE.MeshLambertMaterial({ map: asphaltTex });
const lawnTex = canvasTex(16, 16, (x, w, h) => { noiseFill(x, w, h, [24, 44, 24], 9); for (let k = 0; k < 18; k++) { x.fillStyle = 'rgb(40,66,34)'; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 1, 2); } });
lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping;
const lawnMat = new THREE.MeshLambertMaterial({ map: lawnTex });
// a quarter ring around the turn centre, laid flat
function cornerRing(r0, r1, mat, tile, y) {
  const g = r0 > 0 ? new THREE.RingGeometry(r0, r1, 24, 2, -Math.PI / 2, Math.PI / 2) : new THREE.CircleGeometry(r1, 24, -Math.PI / 2, Math.PI / 2);
  scaleUV(g, 2 * r1 / tile, 2 * r1 / tile);
  const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.set(CC.x, y, CC.z); scene.add(m);
  return m;
}
cornerRing(CRI - 0.12, CRO + 0.12, asphaltMat, 3, ROAD_Y);
{ const m = cornerRing(0, CRI - 0.12, pavingMat, 1.2, -0.02); m.material = new THREE.MeshLambertMaterial({ map: pavingTex, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8 }); }   // tucked behind the dance room floor where it runs under it
cornerRing(CRO + 0.12, CRO + 4.2, pavingMat, 1.2, 0);
// curbs round the bend, in short pieces
const cAt = (r, a) => [CC.x + r * Math.sin(a), CC.z + r * Math.cos(a)];
for (let k = 0; k < 16; k++) {
  const a0 = (k / 16) * Math.PI / 2, a1 = ((k + 1) / 16) * Math.PI / 2;
  for (const [r0, r1] of [[CRI - 0.12, CRI], [CRO, CRO + 0.12]]) {
    const q = (y) => [V(...[cAt(r0, a0)[0], y, cAt(r0, a0)[1]]), V(cAt(r0, a1)[0], y, cAt(r0, a1)[1]), V(cAt(r1, a1)[0], y, cAt(r1, a1)[1]), V(cAt(r1, a0)[0], y, cAt(r1, a0)[1])];
    S.push(loft([q(ROAD_Y), q(0)], [74, 74, 80], { amt: 0.03 }));
  }
  if (k % 2 === 0) { const L = LANE_Z - CC.z, m0 = cAt(L, a0 + 0.02), m1 = cAt(L, a1 - 0.02); GD.push(groundStrip(m0[0], m0[1], m1[0], m1[1], 0.12, ROAD_Y, [190, 166, 84])); }
}
// the side street itself: road, curbs, centre dashes, sidewalks both sides
groundAt(SS.x0 - 0.12, SS.x1 + 0.12, SS.z0, SS.z1, asphaltMat, 3, ROAD_Y);
S.push(box(SS.x0 - 0.12, SS.x0, ROAD_Y, 0, SS.z0, SS.z1, [74, 74, 80], 0.03));
S.push(box(SS.x1, SS.x1 + 0.12, ROAD_Y, 0, SS.z0, SS.z1, [74, 74, 80], 0.03));
const SIDE_X = CC.x + (LANE_Z - CC.z);
for (let z = SS.z1 - 1; z > SS.z0; z -= 3.2) GD.push(box(SIDE_X - 0.06, SIDE_X + 0.06, ROAD_Y, ROAD_Y + 0.012, z - 1.6, z, [190, 166, 84], 0.03));
groundAt(23.02, SS.x0 - 0.12, SS.z0, CC.z, pavingMat, 1.2, -0.02);
groundAt(SS.x1 + 0.12, SS.x1 + 4.2, SS.z0, CC.z, pavingMat, 1.2, 0);
// sodium street lamps: the same warm yellow as the dance floor's glow, these ones just don't pulse
const SODIUM = [255, 196, 84], SODIUM_HEX = 0xffc454;
// a soft pool of lamp light on the ground under each head (cheaper and more PS1 than real light for every lamp)
const poolTex = canvasTex(32, 32, (x, w, h) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const d = Math.hypot(i - w / 2 + 0.5, j - h / 2 + 0.5) / (w / 2), k = Math.max(0, 1 - d), v = k * k;
    x.fillStyle = `rgb(${Math.round(255 * v)},${Math.round(176 * v)},${Math.round(60 * v)})`; x.fillRect(i, j, 1, 1);
  }
});
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -20 });
function lightPool(x, z, r, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), poolMat); m.rotation.x = -Math.PI / 2; m.position.set(x, (y || 0) + 0.03, z); scene.add(m); return m; }
function lampPost(x, z, ax, az, h) {
  h = h || 4.4;
  lightPool(x + ax * 0.9, z + az * 0.9, h * 0.95, x < -15 && z < -13 ? 0 : -0.1);
  S.push(cyl(V(x, 0, z), V(x, 0.12, z), 0.15, 0.13, [20, 20, 22], { n: 8 }));
  S.push(cyl(V(x, 0.12, z), V(x, h, z), 0.055, 0.04, [20, 20, 22], { n: 6 }));
  const hx = x + ax * 0.9, hz = z + az * 0.9;
  S.push(cyl(V(x, h, z), V(hx, h + 0.05, hz), 0.03, 0.03, [20, 20, 22], { n: 4 }));
  S.push(cyl(V(hx, h + 0.12, hz), V(hx, h - 0.06, hz), 0.09, 0.24, [30, 30, 34], { n: 8 }));
  G.push(cyl(V(hx, h - 0.07, hz), V(hx, h - 0.11, hz), 0.2, 0.17, SODIUM, { n: 8, amt: 0 }));
  return [hx, h - 0.3, hz];
}
const SIDE_LAMPS = [-6, -19, -32, -45, -58].map((z) => lampPost(SS.x0 - 0.5, z, 1, 0));
[SIDE_LAMPS[0], SIDE_LAMPS[2]].forEach(([x, y, z]) => pLight(SODIUM_HEX, 1.3, 13, x, y, z));
for (const a of [0.35, 1.2]) { const [x, z] = cAt(CRO + 0.6, a); lampPost(x, z, -Math.sin(a), -Math.cos(a)); }

// ---- the valet drive: from the side street through a planted entrance to the arch in the courtyard wall
groundAt(23.02, SS.x0 - 0.1, LOT.z - 1.6, LOT.z + 1.6, flatMat(settTex, -6), 1.1, 0.034);
groundAt(AL.x1 + 0.8, 23.02, LOT.z - 1.6, LOT.z + 1.6, flatMat(settTex, -6), 1.1, 0.032);
for (const zz of [LOT.z - 1.65, LOT.z + 1.65]) S.push(box(AL.x1 + 0.8, SS.x0 - 0.12, 0, 0.1, zz - 0.07, zz + 0.07, MARBLE_W, 0.03));
groundAt(AL.x1 + 0.05, 22.98, LOT.z + 1.75, -12.05, lawnMat, 1.4, 0.01);
groundAt(18.45, 22.98, -12.05, -4.05, lawnMat, 1.4, 0.01);
groundAt(AL.x1 + 0.05, 22.98, SS.z0, LOT.z - 1.75, lawnMat, 1.4, 0.01);
// clipped hedges lining the drive, cypress cones at both ends, beds of flowers in front of the hedges
function cone(x, z, s) {
  S.push(cyl(V(x, 0, z), V(x, 0.36, z), 0.26, 0.24, [110, 102, 94], { n: 10 }));
  S.push(loft([rring(0.36, 0.4 * s, 0.4 * s, x, z, 10, 2), rring(0.9 * s, 0.5 * s, 0.5 * s, x, z, 10, 2), rring(1.6 * s, 0.34 * s, 0.34 * s, x, z, 10, 2), rring(2.2 * s, 0.04, 0.04, x, z, 10, 2)], HEDGE, { smooth: true, amt: 0.1 }));
}
for (const e of [-1, 1]) {
  const zh = LOT.z + e * 2.25;
  S.push(box(17.2, 22.0, 0, 0.75, zh - 0.28, zh + 0.28, HEDGE, 0.12));
  S.push(box(17.15, 22.05, 0, 0.12, zh - 0.32, zh + 0.32, [60, 58, 56], 0.04));
  cone(22.6, LOT.z + e * 2.35, 1.1); cone(16.4, LOT.z + e * 2.35, 0.9);
  const zf = LOT.z + e * 2.95, fr = rngFrom(e > 0 ? 71 : 73);
  for (let x = 17.3; x < 22; x += 0.22) {
    const c = [[200, 40, 60], [230, 190, 60], [240, 120, 170], [250, 250, 240]][Math.floor(fr() * 4)];
    S.push(box(x, x + 0.12, 0.02, 0.18 + fr() * 0.12, zf - 0.08 + fr() * 0.16, zf + 0.04 + fr() * 0.1, c, 0.05));
  }
}
// a low hedge along the sidewalk, broken for the drive
for (const [z0, z1] of [[LOT.z + 3.4, -4.4], [SS.z0 + 0.5, LOT.z - 3.4]]) S.push(box(22.55, 22.95, 0, 0.55, z0, z1, HEDGE, 0.12));
// a few trees on the lawns
for (const [x, z, s] of [[19.2, -8.5, 0.95], [18.6, -14.8, 1.1], [19.4, -29.5, 1.05], [18.8, -37.5, 0.9], [19.6, -46, 1.0], [18.7, -54, 0.95]]) tree(x, z, s);
// a stone sign on the lawn by the entrance, lit from below
{
  const sx = 21.2, sz = LOT.z + 4.3;
  S.push(box(sx - 0.15, sx + 0.15, 0, 1.15, sz - 1.1, sz + 1.1, [70, 68, 64], 0.04));
  S.push(box(sx - 0.2, sx + 0.2, 1.15, 1.22, sz - 1.16, sz + 1.16, [96, 92, 86], 0.03));
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#121014'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#b8924a'; x.lineWidth = 3; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#e7c98a'; x.textAlign = 'center'; x.font = '34px "Limelight", Georgia, serif'; x.fillText("SH1DEN'S", 128, 46);
  x.font = '16px "IBM Plex Mono", monospace'; x.fillStyle = '#cdbb94'; x.fillText('VALET  ·  MEMBERS', 128, 76);
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.75), decal({ map: tex })); m.position.set(sx + 0.16, 0.65, sz); m.rotation.y = Math.PI / 2; scene.add(m);
  setTimeout(() => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { x.fillStyle = '#121014'; x.fillRect(6, 6, 244, 84); x.fillStyle = '#e7c98a'; x.font = '34px "Limelight", Georgia, serif'; x.fillText("SH1DEN'S", 128, 46); x.font = '16px "IBM Plex Mono", monospace'; x.fillStyle = '#cdbb94'; x.fillText('VALET  ·  MEMBERS', 128, 76); tex.needsUpdate = true; }); }, 0);
  for (const e of [-1, 1]) G.push(box(sx + 0.3, sx + 0.42, 0.02, 0.1, sz + e * 0.8 - 0.06, sz + e * 0.8 + 0.06, [255, 220, 150], 0));
}
for (const e of [-1, 1]) lampPost(22.3, LOT.z + e * 3.6, 0, -e);
pLight(SODIUM_HEX, 1.2, 12, 21.0, 3.4, LOT.z);

// ---- the public car park: behind the hotel on the beggar's side, in off the main street
const PK2 = { x0: -80, x1: -20, z0: -66, z1: -14 };
groundAt(PK2.x0, PK2.x1, PK2.z0, PK2.z1, asphaltMat, 3.2, 0);
groundAt(-27, -20, PK2.z1, ST.walk0, asphaltMat, 3.2, 0.012);            // the way in, off the main street
groundAt(-48, -27.02, PK2.z1, ST.walk0 - 0.02, lawnMat, 1.4, 0.0);           // lawn between the street and the car park
groundAt(-19.98, -17.05, -11.0, ST.walk0 - 0.02, lawnMat, 1.4, 0.0);
groundAt(-19.98, AL.x0 - 0.05, PK2.z0, -11.0, lawnMat, 1.4, 0.0);
groundAt(PK2.x0 - 6, -48, PK2.z1, ST.walk0 - 0.02, lawnMat, 1.4, 0.0);
// a paved path from the car park to a gate in the courtyard wall, right by Old Tobias
// curb round the edge, a chain-link fence on the far sides
S.push(box(PK2.x0 - 0.15, PK2.x1, 0, 0.14, PK2.z1 - 0.15, PK2.z1, [74, 74, 80], 0.03));
for (const [x0, x1, z0, z1] of [[PK2.x0 - 0.15, PK2.x0, PK2.z0, PK2.z1], [PK2.x1, PK2.x1 + 0.15, PK2.z0, -33.4], [PK2.x1, PK2.x1 + 0.15, -30.6, PK2.z1 - 7]]) S.push(box(x0, x1, 0, 0.14, z0, z1, [74, 74, 80], 0.03));
for (let x = PK2.x0; x <= PK2.x1; x += 2.5) S.push(cyl(V(x, 0, PK2.z0), V(x, 2.0, PK2.z0), 0.03, 0.03, [70, 72, 76], { n: 4 }));
for (let z = PK2.z0; z <= PK2.z1 - 2; z += 2.5) S.push(cyl(V(PK2.x0, 0, z), V(PK2.x0, 2.0, z), 0.03, 0.03, [70, 72, 76], { n: 4 }));
{
  const fenceTex = canvasTex(16, 16, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(120,124,130,0.9)'; x.lineWidth = 1; for (let i = -16; i < 32; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 16); x.stroke(); x.beginPath(); x.moveTo(i + 16, 0); x.lineTo(i, 16); x.stroke(); } });
  fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping;
  const fm = new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3, fog: true, color: 0x6a6c70 });
  const w1 = PK2.x1 - PK2.x0, g1 = new THREE.PlaneGeometry(w1, 1.9); scaleUV(g1, w1 / 0.8, 1.9 / 0.8);
  const m1 = new THREE.Mesh(g1, fm); m1.position.set((PK2.x0 + PK2.x1) / 2, 1.0, PK2.z0); scene.add(m1);
  const w2 = PK2.z1 - 2 - PK2.z0, g2 = new THREE.PlaneGeometry(w2, 1.9); scaleUV(g2, w2 / 0.8, 1.9 / 0.8);
  const m2 = new THREE.Mesh(g2, fm); m2.position.set(PK2.x0, 1.0, (PK2.z0 + PK2.z1 - 2) / 2); m2.rotation.y = Math.PI / 2; scene.add(m2);
  S.push(cyl(V(PK2.x0, 1.95, PK2.z0), V(PK2.x1, 1.95, PK2.z0), 0.02, 0.02, [70, 72, 76], { n: 4 }));
  S.push(cyl(V(PK2.x0, 1.95, PK2.z0), V(PK2.x0, 1.95, PK2.z1 - 2), 0.02, 0.02, [70, 72, 76], { n: 4 }));

}
// the bays: five rows of eighteen, painted white, a concrete wheel stop at the head of each
const BAY_W = 2.6, BAY_D = 5.2, BX0 = -77, NB = 18, BX1 = BX0 + NB * BAY_W;
const PROWS = [{ z: -14.4, dir: -1 }, { z: -31.9, dir: 1 }, { z: -31.9, dir: -1 }, { z: -49.5, dir: 1 }, { z: -49.5, dir: -1 }];   // head line z, which way the bay runs from it
const LINE_W = [214, 214, 206];
for (const r of PROWS) {
  const zb = r.z + r.dir * BAY_D;
  for (let k = 0; k <= NB; k++) GD.push(...paintLine(BX0 + k * BAY_W, r.z, BX0 + k * BAY_W, zb, 0.09, 0.006, LINE_W, 3));
  for (let k = 0; k < NB; k++) { const cx = BX0 + (k + 0.5) * BAY_W, sz = r.z + r.dir * 0.45; S.push(box(cx - 0.8, cx + 0.8, 0, 0.13, sz - 0.1, sz + 0.1, [120, 118, 112], 0.04)); }
}
for (const z of [-31.9, -49.5]) GD.push(...paintLine(BX0, z, BX1, z, 0.09, 0.006, LINE_W, 24));
// arrows and a painted "EXIT" in the aisles
for (const [x, z, a] of [[-24, -24, 0], [-24, -41, Math.PI], [-24, -58, 0], [-50, -23, -Math.PI / 2], [-50, -40.7, Math.PI / 2]]) {
  const s = Math.sin(a), c = Math.cos(a), P2 = (u, v) => [x + u * c - v * s, z + u * s + v * c];
  const shaft = [P2(-1.2, 0), P2(0.5, 0)], h1 = [P2(0.5, -0.4), P2(1.1, 0)], h2 = [P2(0.5, 0.4), P2(1.1, 0)];
  for (const [p, q] of [shaft, h1, h2]) GD.push(groundStrip(p[0], p[1], q[0], q[1], 0.16, 0.006, LINE_W));
}
// planted islands at the end of each double row, with a tree; tall lamps along the middle of the rows
for (const z of [-31.9, -49.5]) {
  const x0 = BX1 + 0.3, x1 = BX1 + 2.3;
  const za = z - BAY_D + 0.3, zb2 = z + BAY_D - 0.3;
  for (const [a, b, c, d] of [[x0, x1, za, za + 0.14], [x0, x1, zb2 - 0.14, zb2], [x0, x0 + 0.14, za, zb2], [x1 - 0.14, x1, za, zb2]]) S.push(box(a, b, 0, 0.18, c, d, [86, 84, 80], 0.04));
  groundAt(x0 + 0.12, x1 - 0.12, za + 0.12, zb2 - 0.12, lawnMat, 1.2, 0.12);
  tree((x0 + x1) / 2, z + 2.6, 0.75); tree((x0 + x1) / 2, z - 2.6, 0.7);
}
const PARK_LAMPS = [];
for (const z of [-31.9, -49.5]) for (const k of [3, 9, 15]) {
  const x = BX0 + k * BAY_W;
  S.push(cyl(V(x, 0, z), V(x, 0.5, z), 0.24, 0.22, [96, 94, 90], { n: 10 }));
  for (const e of [-1, 1]) PARK_LAMPS.push(lampPost(x, z, 0, e * 0.6, 6.2));
}
for (const x of [-68, -49, -30]) PARK_LAMPS.push(lampPost(x, PK2.z1 + 0.6, 0, -1, 5.0));
lampPost(PK2.x0 + 7, PK2.z0 + 0.8, 0, 1, 5.0);   // one over the dumpster corner
// a lantern over the gate through to the courtyard
S.push(box(AL.x0 - 0.3, AL.x0 - 0.02, 2.55, 2.62, -32.2, -31.8, [20, 20, 22], 0.03));
S.push(box(AL.x0 - 0.42, AL.x0 - 0.18, 2.2, 2.55, -32.12, -31.88, [26, 26, 30], 0.03));
G.push(box(AL.x0 - 0.4, AL.x0 - 0.2, 2.24, 2.5, -32.1, -31.9, SODIUM, 0));
lightPool(AL.x0 - 1.5, -32, 2.6);
for (const [x, y, z] of [PARK_LAMPS[0], PARK_LAMPS[4], PARK_LAMPS[7], PARK_LAMPS[10], PARK_LAMPS[13]]) pLight(SODIUM_HEX, 1.6, 17, x, y, z);
// a few cars left here overnight
{
  const pr = rngFrom(4242), kinds = ['sedan', 'sedan', 'suv', 'saloon', 'coupe', 'sedan', 'super', 'roadster'];
  const cols = [[44, 46, 52], [96, 96, 102], [120, 26, 30], [22, 40, 70], [150, 150, 150], [16, 16, 18], [70, 64, 52], [36, 60, 46], [180, 176, 166], [110, 80, 30]];
  const taken = new Set();
  for (let n = 0; n < 26; n++) {
    const ri = Math.floor(pr() * PROWS.length), k = Math.floor(pr() * NB), key = ri + ':' + k;
    if (taken.has(key)) continue; taken.add(key);
    const r = PROWS[ri], cx = BX0 + (k + 0.5) * BAY_W, cz = r.z + r.dir * (BAY_D / 2 + 0.15);
    const nose = pr() < 0.8 ? -r.dir : r.dir;   // most pull in nose first, a few back in
    parkCar(kinds[Math.floor(pr() * kinds.length)], cols[Math.floor(pr() * cols.length)], cx, cz, Math.atan2(-nose, 0) + (pr() - 0.5) * 0.08, 0);
  }
}
// litter: crumpled paper, cans, a bag or two; bins and a dumpster by the fence
{
  const tr = rngFrom(777);
  for (let n = 0; n < 90; n++) {
    const x = PK2.x0 + 1 + tr() * (PK2.x1 - PK2.x0 - 2), z = PK2.z0 + 1 + tr() * (PK2.z1 - PK2.z0 - 2), kind = tr();
    if (kind < 0.45) { const s = 0.05 + tr() * 0.06, v = 150 + Math.floor(tr() * 90); S.push(box(x - s, x + s, 0.005, 0.03 + tr() * 0.04, z - s * 0.8, z + s * 0.8, [v, v, v - 10], 0.25)); }
    else if (kind < 0.75) { const a = tr() * Math.PI, dx = Math.cos(a) * 0.06, dz = Math.sin(a) * 0.06; S.push(cyl(V(x - dx, 0.033, z - dz), V(x + dx, 0.033, z + dz), 0.033, 0.033, [[180, 30, 30], [170, 170, 176], [30, 70, 150], [40, 120, 50]][Math.floor(tr() * 4)], { n: 6 })); }
    else if (kind < 0.88) { S.push(loft([rring(0, 0.12, 0.1, x, z, 7, 2), rring(0.1, 0.18, 0.15, x, z, 7, 2), rring(0.2, 0.1, 0.09, x, z, 7, 2), rring(0.24, 0.02, 0.02, x, z, 7, 2)], [22, 22, 24], { smooth: true, amt: 0.3 })); }
    else { const a = tr() * 6.28; S.push(box(x - 0.11, x + 0.11, 0.004, 0.014, z - 0.07, z + 0.07, [150, 120, 80], 0.2)); if (a > 5) S.push(box(x - 0.2, x + 0.2, 0.004, 0.012, z + 0.1, z + 0.35, [210, 200, 170], 0.1)); }
  }
  const bin = (x, z) => {
    S.push(cyl(V(x, 0, z), V(x, 0.92, z), 0.3, 0.32, [34, 52, 40], { n: 10, amt: 0.08 }));
    for (const y of [0.25, 0.6]) S.push(cyl(V(x, y, z), V(x, y + 0.05, z), 0.335, 0.335, [26, 40, 30], { n: 10 }));
    S.push(cyl(V(x, 0.92, z), V(x, 1.0, z), 0.34, 0.3, [22, 30, 24], { n: 10 }));
    S.push(cyl(V(x + 0.15, 0.94, z), V(x + 0.35, 0.02, z + 0.1), 0.02, 0.02, [200, 200, 190], { n: 4 }));   // something hanging out
  };
  for (const [x, z] of [[-21.2, -16], [-21.2, -40], [-21.2, -60], [-44, -15], [-62, -15], [AL.x0 - 0.6, -29.6]]) bin(x, z);
  // the dumpster in the far corner, lid propped, bags piled beside it
  const dx = PK2.x0 + 3, dz = PK2.z0 + 2.2;
  S.push(box(dx - 1.1, dx + 1.1, 0.12, 1.35, dz - 0.75, dz + 0.75, [30, 70, 46], 0.08));
  S.push(box(dx - 1.15, dx + 1.15, 1.32, 1.4, dz - 0.8, dz + 0.8, [24, 56, 36], 0.05));
  S.push(loft([[V(dx - 1.1, 1.4, dz + 0.75), V(dx + 1.1, 1.4, dz + 0.75), V(dx + 1.1, 1.42, dz + 0.75), V(dx - 1.1, 1.42, dz + 0.75)], [V(dx - 1.1, 2.1, dz + 0.25), V(dx + 1.1, 2.1, dz + 0.25), V(dx + 1.1, 2.12, dz + 0.25), V(dx - 1.1, 2.12, dz + 0.25)]], [20, 44, 30], { amt: 0.05 }));
  for (const e of [-1, 1]) S.push(cyl(V(dx + e * 0.9, 0, dz + e * 0.5), V(dx + e * 0.9, 0.12, dz + e * 0.5), 0.08, 0.08, [16, 16, 18], { n: 6 }));
  for (const [ox, oz, r] of [[1.6, 0.4, 0.34], [1.9, -0.2, 0.3], [1.5, -0.6, 0.28], [2.3, 0.3, 0.26]]) { const x = dx + ox, z = dz + oz; S.push(loft([rring(0, r * 0.6, r * 0.6, x, z, 8, 2), rring(r * 0.7, r, r, x, z, 8, 2), rring(r * 1.3, r * 0.8, r * 0.8, x, z, 8, 2), rring(r * 1.6, 0.05, 0.05, x, z, 8, 2)], [14, 14, 16], { smooth: true, amt: 0.2 })); }
  for (const [ox, oz, s] of [[-1.6, 0.9, 0.5], [-1.9, 0.2, 0.4], [-1.5, 0.2, 0.35]]) S.push(box(dx + ox - s / 2, dx + ox + s / 2, 0, s * 0.8, dz + oz - s / 2, dz + oz + s / 2, [130, 100, 66], 0.12));
}
// a "P" sign on a post at the way in
{
  const sx = -27.6, sz = 2.4;
  S.push(cyl(V(sx, 0, sz), V(sx, 2.6, sz), 0.04, 0.04, [30, 30, 34], { n: 6 }));
  S.push(box(sx - 0.05, sx + 0.05, 2.0, 2.9, sz - 0.45, sz + 0.45, [24, 50, 120], 0.03));
  G.push(box(sx + 0.05, sx + 0.06, 2.15, 2.75, sz - 0.3, sz + 0.3, [240, 240, 250], 0));
  G.push(box(sx + 0.061, sx + 0.07, 2.25, 2.65, sz - 0.18, sz + 0.06, [24, 50, 120], 0));
  G.push(box(sx + 0.061, sx + 0.07, 2.45, 2.55, sz - 0.06, sz + 0.12, [240, 240, 250], 0));
}

// ---- people walking about outside (they're not players, just passers-by)
const WALKERS = [
  { path: [[-23.5, 5.3], [-23.5, -22], [-60, -23], [-60, -41], [-23.5, -41], [-23.5, -22]], speed: 1.25 },
  { path: [[-30, -58], [-74, -58], [-74, -40], [-30, -40]], speed: 1.1 },
  { path: [[-36, -22.5], [-20.5, -32], [-15.2, -32], [-20.5, -32]], speed: 1.0 },
  { path: [[24.1, 1.2], [24.1, -55]], speed: 1.3 },
  { path: [[-80, 15.6], [18, 15.6]], speed: 1.35 },
  { path: [[-70, -23], [-28, -23.5]], speed: 1.15 },
  { path: [[33.2, -50], [33.2, 0.5], [31.0, 9.0], [26.5, 13.6], [20.6, 15.4], [-40, 15.4]], speed: 1.2 }
].map((w, i) => {
  // pre-measure each path so the walker's position is just a distance along it
  const pts = w.path.concat(w.path.length > 2 ? [w.path[0]] : []), segs = [];
  let L = 0; for (let k = 0; k < pts.length - 1; k++) { const d = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); segs.push([pts[k], pts[k + 1], L, d]); L += d; }
  return { segs, L, loop: w.path.length > 2, speed: w.speed, s: (i * 13.7) % L, dir: 1, look: randomLook(rngFrom(900 + i * 17)), ch: null };
});
const bagParts = () => [cyl(V(0, -0.45, -0.2), V(0, 0.35, -0.24), 0.12, 0.12, [40, 70, 50], { n: 8 }), cyl(V(0, 0.35, -0.24), V(0, 0.42, -0.24), 0.13, 0.13, [200, 196, 186], { n: 8 }), cyl(V(-0.04, 0.4, -0.22), V(-0.06, 0.62, -0.2), 0.02, 0.02, [190, 190, 196], { n: 4 }), cyl(V(0.05, 0.4, -0.25), V(0.07, 0.66, -0.27), 0.02, 0.02, [190, 190, 196], { n: 4 }), box(-0.06, 0.1, 0.62, 0.7, -0.28, -0.18, [60, 60, 66], 0.02)];
function walkersRebuild() {
  for (const w of WALKERS) {
    w.ch = addChar(w.look, '', { npc: true, seedName: 'walker' }); w.ch.act = 'walk';
    if (w.bag && w.ch.bones && w.ch.bones.spine) { const m = new THREE.Mesh(toGeometry(bagParts()), charMat); m.rotation.z = 0.35; w.ch.bones.spine.add(m); }
  }
  walkersTick(0);
}
function walkersTick(dt) {
  for (const w of WALKERS) {
    w.s += w.dir * w.speed * dt;
    if (w.loop) w.s = ((w.s % w.L) + w.L) % w.L;
    else if (w.s > w.L) { w.s = w.L; w.dir = -1; } else if (w.s < 0) { w.s = 0; w.dir = 1; }
    const sg = w.segs.find((g) => w.s >= g[2] && w.s <= g[2] + g[3]) || w.segs[w.segs.length - 1];
    const u = sg[3] ? (w.s - sg[2]) / sg[3] : 0, x = sg[0][0] + (sg[1][0] - sg[0][0]) * u, z = sg[0][1] + (sg[1][1] - sg[0][1]) * u;
    if (!w.ch) continue;
    w.ch.root.position.set(x, 0, z);
    w.ch.root.rotation.y = Math.atan2((sg[1][0] - sg[0][0]) * w.dir, (sg[1][1] - sg[0][1]) * w.dir);
  }
}

const GOLF_FLAGS = [], GOLF_TREES = [];
// pieces of a ring (or ellipse) around any centre, as small boxes so faces point the right way
function arcRing(cx, cz, r0, r1, y0, y1, col, n, sx, sz, a0, a1) {
  sx = sx || 1; sz = sz || 1; a0 = a0 || 0; a1 = a1 === undefined ? Math.PI * 2 : a1;
  const out = [], P = (r, a, y) => V(cx + Math.sin(a) * r * sx, y, cz - Math.cos(a) * r * sz);
  for (let k = 0; k < n; k++) {
    const u0 = a0 + (a1 - a0) * k / n, u1 = a0 + (a1 - a0) * (k + 1) / n;
    out.push(loft([[P(r0, u0, y0), P(r0, u1, y0), P(r1, u1, y0), P(r1, u0, y0)], [P(r0, u0, y1), P(r0, u1, y1), P(r1, u1, y1), P(r1, u0, y1)]], col, { amt: 0.03 }));
  }
  return out;
}
const golfPoolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xb8c8ff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -20 });
// ================================================================ THE BLOCKS: real buildings across the street and round the corner
// brick and stone walls with window bays, ledges and cornices, shops at street level, fire escapes,
// and busy roofs (stair huts, AC units, vents breathing steam, water tanks, aerials, rubbish); windows light up and go dark through the night
const facadeTex = (base, mortar, trim, seed) => {
  const t = canvasTex(64, 64, (x, w, h) => {
    const r = rngFrom(seed);
    // brick courses (or stone blocks), a little uneven
    x.fillStyle = `rgb(${mortar})`; x.fillRect(0, 0, w, h);
    for (let j = 0; j < h; j += 4) for (let i = (j / 4) % 2 ? -4 : 0; i < w; i += 8) { const v = (r() - 0.5) * 26; x.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.8},${base[2] + v * 0.7})`; x.fillRect(i + 1, j + 1, 7, 3); }
    // the window: stone surround, dark glass, a mullion, a sill and a lintel
    x.fillStyle = `rgb(${trim})`; x.fillRect(16, 10, 32, 38); x.fillRect(13, 46, 38, 4); x.fillRect(14, 7, 36, 4);
    x.fillStyle = 'rgb(14,16,22)'; x.fillRect(19, 13, 26, 32);
    x.fillStyle = 'rgba(70,84,110,0.35)'; x.fillRect(20, 14, 5, 30);   // a glint on the glass
    x.fillStyle = `rgb(${trim})`; x.fillRect(31, 13, 2, 32); x.fillRect(19, 27, 26, 2);
    // grime streaks under the sill
    for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(16 + Math.floor(r() * 32), 50, 1, 4 + Math.floor(r() * 10)); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const FACADES_LIB = [
  facadeTex([96, 44, 36], [46, 40, 38], [150, 140, 126], 1),     // red brick
  facadeTex([70, 52, 42], [36, 32, 30], [120, 112, 100], 2),     // brown brick
  facadeTex([88, 86, 82], [52, 50, 48], [150, 146, 138], 3),     // grey stone
  facadeTex([112, 84, 58], [60, 50, 40], [170, 160, 140], 4),    // tan brick
  facadeTex([58, 74, 62], [30, 36, 32], [168, 160, 138], 5),     // painted green brick, flaking
  facadeTex([48, 40, 38], [24, 22, 22], [96, 90, 84], 6),        // sooty black brick (the warehouse)
  facadeTex([150, 136, 110], [80, 72, 60], [70, 60, 50], 7)      // cream paint over brick, dark trim
].map((t) => new THREE.MeshLambertMaterial({ map: t, emissiveMap: t, emissive: 0x3a3632 }));
// a wall, as two triangles with the window grid lined up to its bottom-left corner
function wallGeo(ax, az, bx, bz, y0, y1, nx, nz) {
  // the triangles face (-dz, dx) for a wall running a -> b; flip the run if that points inward
  if ((bx - ax) * nz - (bz - az) * nx < 0) { [ax, bx] = [bx, ax]; [az, bz] = [bz, az]; }
  const len = Math.hypot(bx - ax, bz - az), g = new THREE.BufferGeometry();
  const u1 = len / 3, v0 = y0 / 3.2, v1 = y1 / 3.2;
  g.setAttribute('position', new THREE.Float32BufferAttribute([ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, u1, v0, u1, v1, 0, v0, u1, v1, 0, v1], 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz], 3));
  return g;
}
// the lit windows: one small glowing pane per window, switched on and off a few at a time
const litMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 });
const litGeo = new THREE.PlaneGeometry(1.2, 1.45);
const BLOCK_LIGHTS = [];
const SMOKE_VENTS = [];
const ROOF_SPOTS = [];
function building(o) {
  const { x0, x1, z0, z1, h, front, seed } = o, r = rngFrom(seed), mat = FACADES_LIB[o.mat !== undefined ? o.mat : seed % 4];
  const sides = [[x0, z1, x1, z1, 0, 1], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0], [x1, z1, x1, z0, 1, 0]];
  const geos = [], wins = [];
  for (const [ax, az, bx, bz, nx, nz] of sides) {
    geos.push(wallGeo(ax, az, bx, bz, 0, h, nx, nz));
    if ((o.join === 'x' && nx) || (o.join === 'z' && nz)) continue;   // a shared wall: no windows or trim
    const len = Math.hypot(bx - ax, bz - az), cols = Math.floor(len / 3 + 1e-6), floors = Math.floor(h / 3.2);
    for (let c = 0; c < cols; c++) for (let f = 1; f < floors; f++) {
      const u = (c + 0.5) * 3, x = ax + (bx - ax) / len * u + nx * 0.03, z = az + (bz - az) / len * u + nz * 0.03, y = f * 3.2 + 1.75;
      wins.push([x, y, z, Math.atan2(nx, nz)]);
    }
    // a ledge at every floor and a heavy cornice at the top
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let f = 1; f < floors; f++) S.push(groundStrip(ax + nx * 0.08, az + nz * 0.08, bx + nx * 0.08, bz + nz * 0.08, 0.14, f * 3.2 - 0.06, [60, 56, 52], 0.08));
    S.push(groundStrip(ax + nx * 0.21, az + nz * 0.21, bx + nx * 0.21, bz + nz * 0.21, 0.4, h - 0.47, [56, 52, 48], 0.4));
  }
  const wm = new THREE.Mesh(mergeGeos(geos.map((g) => g)), mat); scene.add(wm);
  // the windows' lights
  const im = new THREE.InstancedMesh(litGeo, litMat, wins.length), dm = new THREE.Object3D(), col = new THREE.Color();
  const on = [];
  wins.forEach(([x, y, z, a], i) => {
    dm.position.set(x, y, z); dm.rotation.set(0, a, 0); const lit = r() < 0.32; on.push(lit); dm.scale.setScalar(lit ? 1 : 0); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
    col.set([0xffcf8a, 0xffc070, 0xfff0c8, 0xa8c8ff, 0x9ff0d0, 0xff9ab0][Math.floor(r() * 6)]).multiplyScalar(0.8 + r() * 0.25); im.setColorAt(i, col);
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.frustumCulled = false; Object.assign(im.userData, { zone: 'main', cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, rad: Math.hypot(x1 - x0, z1 - z0) / 2 + 1 });
  scene.add(im); BLOCK_LIGHTS.push({ im, wins, on, r: rngFrom(seed * 7) });
  // the roof: tar, a parapet round the edge
  S.push(box(x0, x1, h - 0.02, h + 0.04, z0, z1, [34, 34, 38], 0.05));
  // (the side runs fit between the front and back ones, so no two faces ever lie on top of each other at the corners)
  for (const [a, b, c, d] of [[x0, x1, z1 - 0.3, z1], [x0, x1, z0, z0 + 0.3], [x0, x0 + 0.3, z0 + 0.3, z1 - 0.3], [x1 - 0.3, x1, z0 + 0.3, z1 - 0.3]]) { S.push(box(a, b, h, h + 0.85, c, d, [70, 66, 62], 0.05)); S.push(box(a, b, h + 0.85, h + 0.95, c, d, [96, 92, 88], 0.03)); }
  const W = x1 - x0, D = z1 - z0, rp = (fx, fz) => [x0 + 0.8 + fx * (W - 1.6), z0 + 0.8 + fz * (D - 1.6)];
  // the stair hut with its door and a bulb over it
  { const [hx, hz] = rp(r() * 0.4 + 0.05, r() * 0.4 + 0.05); S.push(box(hx, hx + 2.4, h, h + 2.6, hz, hz + 2.2, [74, 70, 66], 0.05)); S.push(box(hx - 0.1, hx + 2.5, h + 2.6, h + 2.7, hz - 0.1, hz + 2.3, [44, 42, 40], 0.03)); S.push(box(hx + 0.7, hx + 1.6, h + 0.02, h + 2.1, hz + 2.2, hz + 2.24, [40, 50, 60], 0.05)); G.push(box(hx + 1.05, hx + 1.25, h + 2.25, h + 2.4, hz + 2.22, hz + 2.3, [255, 220, 150], 0)); lightPool(hx + 1.15, hz + 2.9, 1.6, h + 0.05); }
  // AC units, humming, with a fan grille on top and a pipe down into the roof
  for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) {
    const [ax, az] = rp(0.45 + r() * 0.5, r());
    S.push(box(ax - 0.65, ax + 0.65, h, h + 1.0, az - 0.5, az + 0.5, [150, 150, 146], 0.06));
    S.push(cyl(V(ax, h + 1.0, az), V(ax, h + 1.04, az), 0.38, 0.38, [30, 30, 32], { n: 12 }));
    for (let g2 = -2; g2 <= 2; g2++) S.push(box(ax - 0.36, ax + 0.36, h + 1.04, h + 1.05, az + g2 * 0.14 - 0.015, az + g2 * 0.14 + 0.015, [120, 120, 118], 0));
    S.push(cyl(V(ax + 0.65, h + 0.3, az), V(ax + 1.1, h + 0.3, az), 0.06, 0.06, [100, 100, 104], { n: 6 }));
    S.push(cyl(V(ax + 1.1, h + 0.3, az), V(ax + 1.1, h, az), 0.06, 0.06, [100, 100, 104], { n: 6 }));
  }
  // vents and stacks, some breathing out steam
  for (let k = 0, n = 2 + Math.floor(r() * 3); k < n; k++) {
    const [vx, vz] = rp(r(), r()), vh = 0.7 + r() * 1.6, rad = 0.12 + r() * 0.14;
    S.push(cyl(V(vx, h, vz), V(vx, h + vh, vz), rad, rad, [90, 88, 86], { n: 8 }));
    S.push(cyl(V(vx, h + vh, vz), V(vx, h + vh + 0.12, vz), rad * 1.7, rad * 0.4, [70, 68, 66], { n: 8 }));
    if (r() < 0.6) SMOKE_VENTS.push([vx, h + vh + 0.15, vz, rad]);
  }
  // roof hatches and skylights
  for (let k = 0, n = Math.floor(r() * 3); k < n; k++) { const [sx, sz] = rp(r(), r()); S.push(box(sx - 0.5, sx + 0.5, h, h + 0.35, sz - 0.5, sz + 0.5, [80, 80, 84], 0.04)); G.push(box(sx - 0.42, sx + 0.42, h + 0.38, h + 0.42, sz - 0.42, sz + 0.42, r() < 0.5 ? [120, 140, 170] : [40, 44, 56], 0)); }
  // a wooden water tank on the tall ones, an aerial or a dish on most
  if (h > 13 && r() < 0.8) {
    const [tx, tz] = rp(0.3 + r() * 0.4, 0.3 + r() * 0.4);
    for (const [ox, oz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) S.push(cyl(V(tx + ox, h, tz + oz), V(tx + ox * 0.8, h + 2.2, tz + oz * 0.8), 0.06, 0.06, [40, 40, 44], { n: 4 }));
    S.push(cyl(V(tx, h + 2.2, tz), V(tx, h + 2.3, tz), 1.35, 1.35, [40, 40, 44], { n: 14 }));
    S.push(cyl(V(tx, h + 2.3, tz), V(tx, h + 4.8, tz), 1.25, 1.3, [110, 80, 54], { n: 14 }));
    for (const y of [2.8, 3.6, 4.4]) S.push(cyl(V(tx, h + y, tz), V(tx, h + y + 0.06, tz), 1.3, 1.3, [36, 36, 40], { n: 14 }));
    S.push(loft([rring(h + 4.8, 1.32, 1.32, tx, tz, 14, 2), rring(h + 5.8, 0.05, 0.05, tx, tz, 14, 2)], [60, 52, 46], { amt: 0.05 }));
  }
  if (r() < 0.7) { const [ax, az] = rp(r(), r()); S.push(cyl(V(ax, h, az), V(ax, h + 3.5, az), 0.03, 0.02, [60, 60, 66], { n: 4 })); for (const y of [2.4, 2.9, 3.3]) S.push(cyl(V(ax - 0.4, h + y, az), V(ax + 0.4, h + y, az), 0.012, 0.012, [60, 60, 66], { n: 3 })); G.push(cyl(V(ax, h + 3.5, az), V(ax, h + 3.58, az), 0.05, 0.04, [255, 40, 40], { n: 5, amt: 0 })); }
  if (r() < 0.5) { const [dx, dz] = rp(r(), r()); S.push(cyl(V(dx, h, dz), V(dx, h + 0.7, dz), 0.04, 0.04, [70, 70, 74], { n: 4 })); S.push(loft([rring(h + 0.7, 0.05, 0.05, dx + 0.1, dz, 10, 2), rring(h + 0.9, 0.42, 0.42, dx + 0.25, dz, 10, 2), rring(h + 0.95, 0.45, 0.45, dx + 0.28, dz, 10, 2)], [200, 200, 196], { amt: 0.04 })); }
  // rubbish up here too: a crate, a bucket, bags, a broken chair, cans
  for (let k = 0, n = 4 + Math.floor(r() * 6); k < n; k++) {
    const [lx, lz] = rp(r(), r()), kind = r();
    if (kind < 0.3) S.push(box(lx - 0.25, lx + 0.25, h, h + 0.4, lz - 0.2, lz + 0.2, [120, 92, 60], 0.12));
    else if (kind < 0.5) S.push(loft([rring(h, 0.25, 0.22, lx, lz, 7, 2), rring(h + 0.3, 0.33, 0.3, lx, lz, 7, 2), rring(h + 0.5, 0.02, 0.02, lx, lz, 7, 2)], [16, 16, 18], { smooth: true, amt: 0.25 }));
    else if (kind < 0.65) S.push(cyl(V(lx, h, lz), V(lx, h + 0.35, lz), 0.15, 0.17, [[180, 60, 40], [60, 90, 150], [200, 190, 160]][Math.floor(r() * 3)], { n: 8 }));
    else { const a = r() * 6.28; S.push(cyl(V(lx, h + 0.035, lz), V(lx + Math.cos(a) * 0.12, h + 0.035, lz + Math.sin(a) * 0.12), 0.034, 0.034, [[180, 30, 30], [170, 170, 176], [40, 120, 50]][Math.floor(r() * 3)], { n: 6 })); }
  }
  ROOF_SPOTS.push({ x0, x1, z0, z1, h, rp });
  // street level: shops along the front, with lit windows, awnings and a sign
  if (front && !o.alley) {
    const [ax, az, bx, bz, nx, nz] = sides[front === 'z1' ? 0 : front === 'z0' ? 1 : front === 'x0' ? 2 : 3], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const shops = Math.max(1, Math.floor(len / 5.5)), sw = len / shops;
    for (let k = 0; k < shops; k++) {
      const c = (k + 0.5) * sw, cx = ax + ux * c + nx * 0.05, cz = az + uz * c + nz * 0.05, hw = sw / 2 - 0.35, open = r() < 0.65;
      const P = (u, y, out) => V(cx + ux * u + nx * out, y, cz + uz * u + nz * out);
      const quad = (u0, u1, y0, y1, out, col, glow) => (glow ? G : S).push(loft([[P(u0, y0, out), P(u1, y0, out), P(u1, y0, out + 0.04), P(u0, y0, out + 0.04)], [P(u0, y1, out), P(u1, y1, out), P(u1, y1, out + 0.04), P(u0, y1, out + 0.04)]], col, { amt: glow ? 0 : 0.04 }));
      quad(-hw - 0.2, hw + 0.2, 0, 3.4, 0, [30, 28, 28]);                                  // the shopfront frame
      quad(-hw, hw - 1.2, 0.5, 2.6, 0.12, open ? [255, 214, 150] : [26, 30, 38], open);     // the window, lit if they're open
      quad(hw - 1.0, hw - 0.1, 0.02, 2.4, 0.12, [44, 34, 28]);                              // the door
      if (!open) for (let y = 0.6; y < 2.6; y += 0.18) quad(-hw, hw - 1.2, y, y + 0.06, 0.22, [74, 76, 80]);   // shutters down
      const ac = [[150, 30, 40], [30, 90, 60], [40, 60, 130], [140, 110, 40], [80, 40, 100]][Math.floor(r() * 5)];
      // a striped canvas awning sloping out over the window, with a scalloped valance
      const nS = Math.max(4, Math.round((2 * hw + 0.2) / 0.45)), aw = (2 * hw + 0.2) / nS;
      for (let s2 = 0; s2 < nS; s2++) {
        const u0 = -hw - 0.1 + s2 * aw, u1 = u0 + aw, c2 = s2 % 2 ? [236, 230, 220] : ac;
        S.push(loft([[P(u0, 2.9, 0.05), P(u1, 2.9, 0.05), P(u1, 2.42, 1.15), P(u0, 2.42, 1.15)], [P(u0, 2.94, 0.05), P(u1, 2.94, 0.05), P(u1, 2.46, 1.15), P(u0, 2.46, 1.15)]], c2, { amt: 0.04 }));
        S.push(loft([[P(u0, 2.24, 1.15), P(u1, 2.24, 1.15), P(u1, 2.24, 1.18), P(u0, 2.24, 1.18)], [P(u0, 2.46, 1.15), P(u1, 2.46, 1.15), P(u1, 2.46, 1.18), P(u0, 2.46, 1.18)]], c2, { amt: 0.04 }));
      }
      // shelves and goods behind the glass
      if (open) for (const y of [0.9, 1.4, 1.9]) { quad(-hw + 0.1, hw - 1.3, y, y + 0.05, 0.2, [90, 64, 40]); for (let u = -hw + 0.2; u < hw - 1.4; u += 0.22) quad(u, u + 0.14, y + 0.05, y + 0.22 + ((u * 7) % 0.12), 0.21, [[180, 60, 50], [60, 120, 170], [220, 200, 120], [90, 150, 80]][Math.floor(Math.abs(u * 13)) % 4]); }
      quad(-hw + 0.3, hw - 0.3, 2.95, 3.3, 0.12, open ? [ac[0] + 60, ac[1] + 60, ac[2] + 60] : [50, 50, 54], open);   // the sign band
      if (open) lightPool(cx + nx * 1.4, cz + nz * 1.4, 2.2, 0);
    }
  }
  // a black iron fire escape zig-zagging down one side of the front
  if (front && h > 8 && r() < 0.7) {
    const [ax, az, bx, bz, nx, nz] = sides[front === 'z1' ? 0 : front === 'z0' ? 1 : front === 'x0' ? 2 : 3], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const u0 = Math.min(len - 4, 2 + Math.floor(r() * Math.max(1, len / 3 - 2)) * 3), floors = Math.floor(h / 3.2), IRON = [24, 24, 26];
    const Q = (u, y, out) => V(ax + ux * u + nx * out, y, az + uz * u + nz * out);
    for (let f = 1; f < floors; f++) {
      const y = f * 3.2 - 0.3;
      S.push(loft([[Q(u0, y, 0.05), Q(u0 + 3.2, y, 0.05), Q(u0 + 3.2, y, 1.0), Q(u0, y, 1.0)], [Q(u0, y + 0.05, 0.05), Q(u0 + 3.2, y + 0.05, 0.05), Q(u0 + 3.2, y + 0.05, 1.0), Q(u0, y + 0.05, 1.0)]], IRON, { amt: 0.03 }));
      for (const uu of [u0, u0 + 3.2]) S.push(cyl(Q(uu, y, 1.0), Q(uu, y + 0.95, 1.0), 0.02, 0.02, IRON, { n: 3 }));
      S.push(cyl(Q(u0, y + 0.95, 1.0), Q(u0 + 3.2, y + 0.95, 1.0), 0.02, 0.02, IRON, { n: 3 }));
      for (let k = 1; k < 8; k++) S.push(cyl(Q(u0 + k * 0.4, y, 1.0), Q(u0 + k * 0.4, y + 0.95, 1.0), 0.008, 0.008, IRON, { n: 3 }));
      if (f > 1) { const a = f % 2 ? u0 + 0.3 : u0 + 2.9, b = f % 2 ? u0 + 2.9 : u0 + 0.3; S.push(cyl(Q(a, y, 0.55), Q(b, y - 3.2, 0.55), 0.05, 0.05, IRON, { n: 4 })); }
    }
  }
}
// the blocks: across the main street from the bar, round the corner, along the side street, behind the courtyard
{
  const r = rngFrom(4040), fronts = [];
  for (let x = ST.x0 + 1, k = 0; x < 20.2; k++) {
    const w = Math.min(20.2 - x, 9 + Math.floor(r() * 3) * 3), h = [7.2, 10.4, 13.6, 16.8, 20.0, 23.2][Math.floor(r() * 6)];
    if (w < 6) break;
    fronts.push({ join: 'x', x0: x, x1: x + w, z0: 16.8, z1: 16.8 + 9 + r() * 6, h, front: 'z0', seed: 100 + k });
    x += w;
  }
  // the bar's neighbour across the road is a squat two-storey, so its roof shows from the street
  const mid = fronts.find((b) => b.x0 <= 2 && b.x1 >= -2) || fronts[Math.floor(fronts.length / 2)];
  mid.h = 7.2; mid.stoner = true;
  fronts.push({ x0: 21, x1: 34, z0: 17.8, z1: 30, h: 16.8, front: 'z0', seed: 160 });
  fronts.push({ x0: 36.6, x1: 48.6, z0: 2.2, z1: 15.5, h: 20, front: 'x0', seed: 161 });
  fronts.push({ x0: 36.6, x1: 46.2, z0: -13.6, z1: 1.6, h: 13.6, front: 'x0', seed: 162 });
  fronts.push({ x0: AL.x0, x1: AL.x1, z0: -44.5, z1: -35.1, h: 10.4, front: null, seed: 163 });
  for (const b of fronts) building(b);
  ROOF_SPOTS.stoner = fronts.find((b) => b.stoner);
}
// paving across the corner plot where the old flat fronts stood
cornerRing(CRO + 4.2, 46, pavingMat, 1.2, 0);   // outside the bend's sidewalk, up to the corner buildings (never over the road)
// ================================================================ THE BACK ALLEY: round the outside of the car park fence, old tenements and a warehouse,
// pigeon coops on the roofs, a big water tower, laundry lines, back doors and the bins nobody empties
const ALY = { w: 4, xw: -84, zs: -70 };   // west lane x -84..-80 (up to the main street), south lane z -70..-66 (east to a dead end)
{
  const alleyTex = canvasTex(32, 32, (x, w, h) => {
    noiseFill(x, w, h, [26, 26, 30], 10);
    for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(70,84,110,0.35)'; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 4 + Math.floor(rr() * 8), 2 + Math.floor(rr() * 3)); }   // wet patches
    for (let k = 0; k < 30; k++) { x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 1 + Math.floor(rr() * 2), 1); }               // cracks and grime
  });
  alleyTex.wrapS = alleyTex.wrapT = THREE.RepeatWrapping;
  const am = new THREE.MeshLambertMaterial({ map: alleyTex, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  { const m = groundPlane(-84, -80.05, -70, ST.walk0 - 0.02, alleyTex, 2.6, 0.01); m.material = am; }
  { const m = groundPlane(-80.05, -20, -70, -66.05, alleyTex, 2.6, 0.01); m.material = am; }
  // a gutter down the middle of each lane
  GD.push(groundStrip(-82, -69.5, -82, ST.walk0 - 0.3, 0.18, 0.0, [14, 14, 16], 0.016));
  GD.push(groundStrip(-80, -68, -21, -68, 0.18, 0.0, [14, 14, 16], 0.016));
  for (let k = 0; k < 9; k++) { const z = -64 + k * 7.5; GD.push(box(-82.3, -81.7, 0, 0.02, z - 0.25, z + 0.25, [40, 40, 44], 0.02)); }   // drain grates
}
// the buildings that back onto the alley: a sooty warehouse, tenements in painted brick, a corner block with a pawn shop
const ALLEY_BLOCKS = [];
{
  const r = rngFrom(5151);
  // south row, facing north onto the lane
  for (let x = -84, k = 0; x < -21; k++) {
    const w = Math.min(-21 - x, [10, 12, 15, 9][k % 4]), h = [13.6, 20, 10.4, 23.2, 16.8][k % 5];
    if (w < 6) break;
    ALLEY_BLOCKS.push({ join: 'x', x0: x, x1: x + w, z0: -84, z1: -70.3, h, front: 'z1', seed: 300 + k, mat: 4 + (k % 3), alley: true });
    x += w;
  }
  // west row, facing east onto the lane
  for (let z = -84, k = 0; z < 1; k++) {
    const d = Math.min(1 - z, [11, 13, 9, 14][k % 4]), h = [16.8, 10.4, 23.2, 13.6, 20][k % 5];
    if (d < 6) break;
    ALLEY_BLOCKS.push({ join: 'z', x0: -98, x1: -84.3, z0: z, z1: z + d, h, front: 'x1', seed: 330 + k, mat: 4 + ((k + 1) % 3), alley: true });
    z += d;
  }
  ALLEY_BLOCKS.forEach((b) => building(b));
  // a dead end at the east of the south lane: a brick wall with a bricked-up arch
  S.push(box(-20.2, -19.8, 0, 4.2, -70.3, -65.95, [70, 44, 36], 0.05));
  S.push(box(-20.25, -20.2, 1.0, 3.2, -69.2, -67.1, [60, 38, 32], 0.04));
}
// back doors with a caged bulb over each, and the junk that piles up behind shops
{
  const r = rngFrom(6262);
  const backDoor = (x, z, nx, nz) => {
    const ux = -nz, uz = nx, P = (u, y, o) => V(x + ux * u + nx * o, y, z + uz * u + nz * o);
    S.push(loft([[P(-0.55, 0, 0.02), P(0.55, 0, 0.02), P(0.55, 0, 0.1), P(-0.55, 0, 0.1)], [P(-0.55, 2.3, 0.02), P(0.55, 2.3, 0.02), P(0.55, 2.3, 0.1), P(-0.55, 2.3, 0.1)]], [[60, 70, 64], [80, 40, 34], [44, 50, 60]][Math.floor(r() * 3)], { amt: 0.06 }));
    S.push(loft([[P(-0.7, 2.3, 0.02), P(0.7, 2.3, 0.02), P(0.7, 2.3, 0.4), P(-0.7, 2.3, 0.4)], [P(-0.7, 2.36, 0.02), P(0.7, 2.36, 0.02), P(0.7, 2.36, 0.4), P(-0.7, 2.36, 0.4)]], [30, 30, 34], { amt: 0.03 }));
    G.push(cyl(P(0, 2.55, 0.18), P(0, 2.72, 0.18), 0.06, 0.06, [255, 214, 140], { n: 6, amt: 0 }));
    S.push(cyl(P(0, 2.5, 0.18), P(0, 2.78, 0.18), 0.08, 0.08, [30, 30, 32], { n: 4 }));
    lightPool(x + nx * 1.2, z + nz * 1.2, 2.0, 0.01);
  };
  for (const b of ALLEY_BLOCKS) {
    if (b.front === 'z1') for (let x = b.x0 + 2.5; x < b.x1 - 1.5; x += 6 + r() * 4) backDoor(x, b.z1, 0, 1);
    else for (let z = b.z0 + 2.5; z < b.z1 - 1.5; z += 6 + r() * 4) backDoor(b.x1, z, 1, 0);
  }
  // dumpsters, pallets, crates, a mattress, an old sofa, piles of bags
  const dumpster = (x, z, a, col) => {
    const c = Math.cos(a), s = Math.sin(a), P = (u, y, v) => V(x + u * c - v * s, y, z + u * s + v * c), q = (u0, u1, y0, y1, v0, v1) => [[P(u0, y0, v0), P(u1, y0, v0), P(u1, y0, v1), P(u0, y0, v1)], [P(u0, y1, v0), P(u1, y1, v0), P(u1, y1, v1), P(u0, y1, v1)]];
    S.push(loft(q(-1.0, 1.0, 0.12, 1.25, -0.7, 0.7), col, { amt: 0.08 }));
    S.push(loft(q(-1.05, 1.05, 1.25, 1.32, -0.75, 0.75), col.map((v) => v * 0.8), { amt: 0.05 }));
    for (const [u, v] of [[-0.85, -0.55], [0.85, -0.55], [-0.85, 0.55], [0.85, 0.55]]) S.push(cyl(P(u, 0, v), P(u, 0.12, v), 0.08, 0.08, [16, 16, 18], { n: 6 }));
  };
  const bags = (x, z, n) => { for (let k = 0; k < n; k++) { const bx = x + (r() - 0.5) * 1.4, bz = z + (r() - 0.5) * 1.0, rad = 0.22 + r() * 0.12; S.push(loft([rring(0, rad * 0.7, rad * 0.7, bx, bz, 8, 2), rring(rad * 0.8, rad, rad, bx, bz, 8, 2), rring(rad * 1.5, rad * 0.7, rad * 0.7, bx, bz, 8, 2), rring(rad * 1.8, 0.04, 0.04, bx, bz, 8, 2)], [[14, 14, 16], [20, 26, 40], [40, 36, 30]][Math.floor(r() * 3)], { smooth: true, amt: 0.25 })); } };
  const pallet = (x, z, y) => { for (let k = 0; k < 5; k++) S.push(box(x - 0.6, x + 0.6, y + 0.1, y + 0.14, z - 0.5 + k * 0.24, z - 0.42 + k * 0.24, [150, 120, 84], 0.12)); for (const dz of [-0.45, 0, 0.45]) S.push(box(x - 0.6, x + 0.6, y, y + 0.1, z + dz - 0.05, z + dz + 0.05, [120, 96, 64], 0.12)); };
  dumpster(-82.9, -40, Math.PI / 2, [30, 70, 46]); bags(-82.6, -37.5, 5);
  dumpster(-82.9, -12, Math.PI / 2, [40, 60, 100]); bags(-82.7, -14.5, 3);
  dumpster(-55, -69.0, 0, [120, 60, 30]); bags(-52.5, -69.1, 4);
  dumpster(-31, -69.0, 0, [30, 70, 46]); bags(-28.6, -69.2, 6);
  for (const [x, z] of [[-83.2, -60], [-46, -69.3], [-38, -69.3]]) { pallet(x, z, 0); pallet(x, z, 0.14); if (r() < 0.7) pallet(x + 0.05, z, 0.28); }
  // a stained mattress against the wall, a sofa someone dumped, a shopping trolley on its side
  S.push(loft([[V(-83.92, 0, -52.6), V(-83.92, 0, -51.2), V(-83.5, 0, -51.2), V(-83.5, 0, -52.6)], [V(-83.95, 1.9, -52.6), V(-83.95, 1.9, -51.2), V(-83.75, 1.9, -51.2), V(-83.75, 1.9, -52.6)]], [190, 180, 150], { amt: 0.12 }));
  S.push(box(-66.4, -64.6, 0, 0.42, -69.75, -69.0, [96, 60, 70], 0.1)); S.push(box(-66.4, -64.6, 0.42, 0.95, -69.95, -69.65, [96, 60, 70], 0.1)); for (const x of [-66.5, -64.5]) S.push(box(x - 0.12, x + 0.12, 0, 0.62, -69.95, -69.0, [86, 52, 62], 0.1));
  { const tx = -44, tz = -67.2; for (let k = 0; k < 6; k++) S.push(cyl(V(tx - 0.4 + k * 0.16, 0.05, tz - 0.3), V(tx - 0.4 + k * 0.16, 0.05, tz + 0.5), 0.012, 0.012, [170, 170, 176], { n: 3 })); for (const zz of [-0.3, 0.5]) S.push(cyl(V(tx - 0.42, 0.05, tz + zz), V(tx + 0.42, 0.05, tz + zz), 0.015, 0.015, [170, 170, 176], { n: 3 })); for (const xx of [-0.42, 0.42]) S.push(cyl(V(tx + xx, 0.05, tz - 0.3), V(tx + xx, 0.6, tz - 0.32), 0.015, 0.015, [170, 170, 176], { n: 3 })); S.push(cyl(V(tx - 0.42, 0.6, tz - 0.32), V(tx + 0.42, 0.6, tz - 0.32), 0.015, 0.015, [170, 170, 176], { n: 3 })); }
  // litter all down both lanes
  for (let n = 0; n < 120; n++) {
    const west = r() < 0.5, x = west ? -83.8 + r() * 3.6 : -79 + r() * 58, z = west ? -69 + r() * 72 : -69.8 + r() * 3.6, kind = r();
    if (kind < 0.45) { const s = 0.05 + r() * 0.07, v = 140 + Math.floor(r() * 100); S.push(box(x - s, x + s, 0.012, 0.04 + r() * 0.04, z - s * 0.8, z + s * 0.8, [v, v, v - 10], 0.25)); }
    else if (kind < 0.75) { const a = r() * Math.PI, dx = Math.cos(a) * 0.06, dz = Math.sin(a) * 0.06; S.push(cyl(V(x - dx, 0.045, z - dz), V(x + dx, 0.045, z + dz), 0.033, 0.033, [[180, 30, 30], [170, 170, 176], [30, 70, 150], [40, 120, 50]][Math.floor(r() * 4)], { n: 6 })); }
    else if (kind < 0.9) S.push(box(x - 0.24, x + 0.24, 0.012, 0.022, z - 0.17, z + 0.17, [200, 196, 180], 0.1));
    else S.push(box(x - 0.2, x + 0.2, 0.012, 0.2, z - 0.15, z + 0.15, [130, 100, 66], 0.12));
  }
  // steam rising from a grate in the west lane
  SMOKE_VENTS.push([-82, 0.1, -30, 0.3], [-82, 0.1, -26, 0.3]);
  // laundry strung across the west lane from the tenements to poles on the fence, sheets and shirts on the lines
  for (const z of [-58, -33, -8]) {
    const y0 = 5.4 + r() * 2, y1 = 3.2;
    S.push(cyl(V(-79.6, 0, z), V(-79.6, y1 + 0.2, z), 0.05, 0.05, [80, 80, 86], { n: 5 }));
    const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push(V(-84.3 + u * 4.7, y0 + (y1 - y0) * u - 0.5 * Math.sin(u * Math.PI), z)); }
    for (let k = 0; k < 8; k++) S.push(cyl(pts[k], pts[k + 1], 0.008, 0.008, [200, 200, 196], { n: 3 }));
    for (let k = 1; k < 8; k += 1 + Math.floor(r() * 2)) {
      const p = { x: pts[k][0], y: pts[k][1] }, c = [[220, 210, 190], [180, 60, 60], [60, 90, 150], [230, 200, 80], [240, 240, 236], [90, 140, 90]][Math.floor(r() * 6)], hgt = 0.35 + r() * 0.5, w = 0.25 + r() * 0.3;
      S.push(loft([[V(p.x - w, p.y - hgt, z - 0.01), V(p.x + w, p.y - hgt, z - 0.01), V(p.x + w, p.y - hgt, z + 0.01), V(p.x - w, p.y - hgt, z + 0.01)], [V(p.x - w, p.y, z - 0.01), V(p.x + w, p.y, z - 0.01), V(p.x + w, p.y, z + 0.01), V(p.x - w, p.y, z + 0.01)]], c, { amt: 0.08 }));
    }
  }
  // a few lamps on brackets down the lanes
  for (const z of [-62, -45, -28, -11]) lampPost(-83.7, z, 1, 0, 4.0);
  for (const x of [-70, -50, -30]) lampPost(x, -69.7, 0, 1, 4.0);
  pLight(0xffc454, 1.1, 12, -82.8, 3.6, -36); pLight(0xffc454, 1.1, 12, -50, 3.6, -68.8);
}
// up on the roofs: pigeon coops (a whole flock lives up here), a big old water tower, a billboard
{
  const r = rngFrom(7373);
  const wireTex = canvasTex(16, 16, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(190,190,180,0.9)'; x.lineWidth = 1; for (let i = 0; i < 16; i += 4) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, 16); x.stroke(); x.beginPath(); x.moveTo(0, i + 0.5); x.lineTo(16, i + 0.5); x.stroke(); } });
  wireTex.wrapS = wireTex.wrapT = THREE.RepeatWrapping;
  const wireMat = new THREE.MeshLambertMaterial({ map: wireTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  const wirePanel = (ax, az, bx, bz, y0, y1) => { const len = Math.hypot(bx - ax, bz - az), g = new THREE.PlaneGeometry(len, y1 - y0); scaleUV(g, len / 0.5, (y1 - y0) / 0.5); const m = new THREE.Mesh(g, wireMat); m.position.set((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2); m.rotation.y = Math.atan2(-(bz - az), bx - ax); scene.add(m); };
  const pigeon = (x, y, z, a) => {
    const c = [[120, 124, 132], [90, 94, 104], [160, 160, 166], [70, 60, 56]][Math.floor(r() * 4)];
    const s = Math.sin(a), co = Math.cos(a), P = (u, yy, v) => V(x + u * co - v * s, y + yy, z + u * s + v * co);
    S.push(loft([[P(-0.05, 0.03, -0.1), P(0.05, 0.03, -0.1), P(0.05, 0.03, 0.1), P(-0.05, 0.03, 0.1)], [P(-0.07, 0.12, -0.12), P(0.07, 0.12, -0.12), P(0.07, 0.12, 0.08), P(-0.07, 0.12, 0.08)], [P(-0.03, 0.16, -0.14), P(0.03, 0.16, -0.14), P(0.03, 0.16, 0.0), P(-0.03, 0.16, 0.0)]], c, { amt: 0.12 }));
    S.push(cyl(P(0, 0.12, 0.08), P(0, 0.22, 0.12), 0.035, 0.03, c.map((v) => v * 0.8), { n: 5 }));
    S.push(box(x - 0.012 + co * 0, x + 0.012, y + 0.2, y + 0.215, z - 0.012, z + 0.012, [200, 160, 60], 0));
  };
  const coop = (B) => {
    const W = 3.6, D = 2.2, H = 2.1, x0 = B.x0 + 1.4 + r() * Math.max(0.5, B.x1 - B.x0 - W - 2.8), z0 = B.z0 + 1.4 + r() * Math.max(0.5, B.z1 - B.z0 - D - 2.8), y = B.h, WOOD = [104, 78, 52];
    S.push(box(x0 - 0.1, x0 + W + 0.1, y, y + 0.35, z0 - 0.1, z0 + D + 0.1, [70, 52, 36], 0.06));   // raised on a frame
    for (const [px, pz] of [[0, 0], [W, 0], [0, D], [W, D], [W / 2, 0], [W / 2, D]]) S.push(box(x0 + px - 0.05, x0 + px + 0.05, y + 0.35, y + 0.35 + H, z0 + pz - 0.05, z0 + pz + 0.05, WOOD, 0.06));
    S.push(loft([[V(x0 - 0.2, y + 0.35 + H, z0 - 0.25), V(x0 + W + 0.2, y + 0.35 + H, z0 - 0.25), V(x0 + W + 0.2, y + 0.35 + H, z0 + D + 0.25), V(x0 - 0.2, y + 0.35 + H, z0 + D + 0.25)], [V(x0 - 0.2, y + 0.55 + H, z0 - 0.25), V(x0 + W + 0.2, y + 0.55 + H, z0 - 0.25), V(x0 + W + 0.2, y + 0.75 + H, z0 + D + 0.25), V(x0 - 0.2, y + 0.75 + H, z0 + D + 0.25)]], [60, 60, 66], { amt: 0.05 }));
    S.push(box(x0, x0 + W, y + 0.35, y + 0.35 + H, z0 + D - 0.06, z0 + D, WOOD, 0.08));   // solid back wall with nesting holes
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) S.push(box(x0 + 0.3 + i * 0.85, x0 + 0.65 + i * 0.85, y + 0.8 + j * 0.7, y + 1.1 + j * 0.7, z0 + D - 0.07, z0 + D - 0.06, [20, 16, 12], 0));
    const yy0 = y + 0.36, yy1 = y + 0.34 + H;
    wirePanel(x0, z0 + 0.01, x0 + W, z0 + 0.01, yy0, yy1); wirePanel(x0 + 0.01, z0, x0 + 0.01, z0 + D, yy0, yy1); wirePanel(x0 + W - 0.01, z0, x0 + W - 0.01, z0 + D, yy0, yy1);
    for (let k = 0; k < 7; k++) pigeon(x0 + 0.3 + r() * (W - 0.6), y + 0.35 + (r() < 0.5 ? 0 : 0.7), z0 + 0.3 + r() * (D - 0.8), r() * 6.28);   // inside
    for (let k = 0; k < 6; k++) pigeon(x0 - 0.2 + r() * (W + 0.4), y + 0.55 + H + (r() * 0.15), z0 - 0.1 + r() * (D + 0.2), r() * 6.28);  // on the roof of it
    for (let k = 0; k < 8; k++) { const px = B.x0 + 0.15 + r() * (B.x1 - B.x0 - 0.3), pz = r() < 0.5 ? B.z0 + 0.15 : B.z1 - 0.15; pigeon(px, B.h + 0.95, pz, r() * 6.28); }    // lined up on the parapet
    // a bucket of feed and a stool
    S.push(cyl(V(x0 + W + 0.6, y, z0 + 0.4), V(x0 + W + 0.6, y + 0.35, z0 + 0.4), 0.15, 0.17, [140, 140, 146], { n: 8 }));
    S.push(cyl(V(x0 + W + 0.6, y + 0.36, z0 + 1.1), V(x0 + W + 0.6, y + 0.4, z0 + 1.1), 0.18, 0.18, [104, 78, 52], { n: 8 }));
  };
  const bigTower = (B) => {
    const tx = (B.x0 + B.x1) / 2 + (r() - 0.5) * 2, tz = (B.z0 + B.z1) / 2 + (r() - 0.5) * 2, y = B.h, IRON = [36, 36, 40];
    for (const [ox, oz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { S.push(cyl(V(tx + ox, y, tz + oz), V(tx + ox * 0.85, y + 4.2, tz + oz * 0.85), 0.09, 0.08, IRON, { n: 5 })); }
    for (const yy of [1.4, 2.8]) { const k = 1 - yy / 4.2 * 0.15; for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) S.push(cyl(V(tx + a[0] * 1.6 * k, y + yy, tz + a[1] * 1.6 * k), V(tx + b[0] * 1.6 * k, y + yy, tz + b[1] * 1.6 * k), 0.035, 0.035, IRON, { n: 4 })); }
    for (const [a, b] of [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]]) S.push(cyl(V(tx + a[0] * 1.55, y + 0.2, tz + a[1] * 1.55), V(tx + b[0] * 1.4, y + 4.0, tz + b[1] * 1.4), 0.025, 0.025, IRON, { n: 3 }));
    S.push(cyl(V(tx, y + 4.2, tz), V(tx, y + 4.35, tz), 2.1, 2.1, IRON, { n: 16 }));
    S.push(cyl(V(tx, y + 4.35, tz), V(tx, y + 8.2, tz), 1.95, 2.0, [112, 82, 56], { n: 16, amt: 0.08 }));
    for (const yy of [4.9, 5.9, 6.9, 7.8]) S.push(cyl(V(tx, y + yy, tz), V(tx, y + yy + 0.07, tz), 2.02, 2.02, IRON, { n: 16 }));
    S.push(loft([rring(y + 8.2, 2.05, 2.05, tx, tz, 16, 2), rring(y + 9.4, 0.15, 0.15, tx, tz, 16, 2), rring(y + 9.6, 0.02, 0.02, tx, tz, 16, 2)], [58, 50, 44], { amt: 0.06 }));
    S.push(cyl(V(tx, y + 9.4, tz), V(tx, y + 9.9, tz), 0.04, 0.03, IRON, { n: 4 }));
    // a ladder up the side and a catwalk ring
    for (let k = 0; k < 18; k++) S.push(cyl(V(tx + 2.05, y + 4.4 + k * 0.22, tz - 0.25), V(tx + 2.05, y + 4.4 + k * 0.22, tz + 0.25), 0.012, 0.012, IRON, { n: 3 }));
    for (const e of [-0.25, 0.25]) S.push(cyl(V(tx + 2.05, y + 4.35, tz + e), V(tx + 2.05, y + 8.4, tz + e), 0.02, 0.02, IRON, { n: 3 }));
    S.push(...arcRing(tx, tz, 2.1, 2.6, y + 4.25, y + 4.3, IRON, 24));
  };
  const billboard = (B) => {
    const bx = B.x0 + 1.2, bz = (B.z0 + B.z1) / 2, y = B.h, W = Math.min(9, B.z1 - B.z0 - 1);
    for (const e of [-W / 2 + 0.4, W / 2 - 0.4]) { S.push(cyl(V(bx, y, bz + e), V(bx, y + 6.5, bz + e), 0.1, 0.1, [40, 40, 44], { n: 5 })); S.push(cyl(V(bx + 1.2, y, bz + e), V(bx, y + 4, bz + e), 0.06, 0.06, [40, 40, 44], { n: 4 })); }
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 96); gr.addColorStop(0, '#1a2a4a'); gr.addColorStop(1, '#4a1a3a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 96);
    x.fillStyle = '#ffe08a'; x.font = '30px "Limelight", Georgia, serif'; x.textAlign = 'center'; x.fillText('CHARON', 128, 44); x.font = '15px "IBM Plex Mono", monospace'; x.fillStyle = '#f4e6d0'; x.fillText('LONDON DRY GIN  ·  ONE WAY TICKET', 128, 74);
    x.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 40; k++) x.fillRect(Math.random() * 256, Math.random() * 96, 2 + Math.random() * 10, 1);   // peeling
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W * 0.375), new THREE.MeshBasicMaterial({ map: t, fog: true })); m.position.set(bx - 0.08, y + 2.5 + W * 0.19, bz); m.rotation.y = Math.PI / 2; scene.add(m);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { x.fillStyle = gr; x.fillRect(0, 0, 256, 96); x.fillStyle = '#ffe08a'; x.font = '30px "Limelight", Georgia, serif'; x.fillText('CHARON', 128, 44); x.font = '15px "IBM Plex Mono", monospace'; x.fillStyle = '#f4e6d0'; x.fillText('LONDON DRY GIN  ·  ONE WAY TICKET', 128, 74); t.needsUpdate = true; });
    S.push(box(bx - 0.05, bx + 0.05, y + 2.4, y + 2.5 + W * 0.39, bz - W / 2 - 0.05, bz + W / 2 + 0.05, [30, 30, 34], 0.03));
    for (const e of [-W / 3, 0, W / 3]) { S.push(cyl(V(bx - 0.1, y + 2.3, bz + e), V(bx - 0.7, y + 2.2, bz + e), 0.02, 0.02, [40, 40, 44], { n: 3 })); G.push(cyl(V(bx - 0.7, y + 2.25, bz + e), V(bx - 0.75, y + 2.1, bz + e), 0.08, 0.05, [255, 240, 210], { n: 6, amt: 0 })); }
  };
  const south = ALLEY_BLOCKS.filter((b) => b.front === 'z1'), west = ALLEY_BLOCKS.filter((b) => b.front === 'x1');
  coop(south[1]); coop(south[3] || south[0]); coop(west[1]); coop(west[4] || west[2]);
  bigTower(south[2] || south[0]); bigTower(west[3] || west[0]);
  billboard(west[west.length - 1]);
}

// steam out of the vents: a few dozen soft puffs rising and fading
{
  const per = 6, N = SMOKE_VENTS.length * per, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const puffTex = canvasTex(32, 32, (x, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const d = Math.hypot(i - 15.5, j - 15.5) / 16, a = Math.max(0, 1 - d); x.fillStyle = `rgba(200,200,204,${(a * a * 0.9).toFixed(3)})`; x.fillRect(i, j, 1, 1); } });
  const pm = new THREE.PointsMaterial({ map: puffTex, size: 1.6, transparent: true, opacity: 0.38, depthWrite: false, color: 0xb8bcc4, fog: true });
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; pts.userData.anyZone = true; scene.add(pts);
  BLOCK_LIGHTS.smoke = (t) => {
    SMOKE_VENTS.forEach(([x, y, z, rad], v) => { for (let k = 0; k < per; k++) { const u = ((t * 0.22 + k / per + v * 0.37) % 1), i = (v * per + k) * 3; pos[i] = x + Math.sin(t * 0.7 + v + k) * 0.3 * u + u * 0.9; pos[i + 1] = y + u * 3.2; pos[i + 2] = z + Math.cos(t * 0.5 + k) * 0.25 * u; } });
    geo.attributes.position.needsUpdate = true;
  };
}
// every couple of seconds a few windows somewhere switch on or off
let blockFlipT = 0;
function blocksTick(dt, t) {
  if (BLOCK_LIGHTS.smoke) BLOCK_LIGHTS.smoke(t);
  blockFlipT -= dt; if (blockFlipT > 0) return; blockFlipT = 1.2;
  const dm = new THREE.Object3D();
  for (const b of BLOCK_LIGHTS) {
    if (b.r() > 0.5 || !b.wins.length) continue;
    const i = Math.floor(b.r() * b.wins.length), [x, y, z, a] = b.wins[i];
    b.on[i] = !b.on[i]; dm.position.set(x, y, z); dm.rotation.set(0, a, 0); dm.scale.setScalar(b.on[i] ? 1 : 0); dm.updateMatrix();
    b.im.setMatrixAt(i, dm.matrix); b.im.instanceMatrix.needsUpdate = true;
  }
}
// the stoner on the roof across the road: a bench, a lamp, a radio, him
{
  const B = ROOF_SPOTS.stoner, h = B.h, bx = (B.x0 + B.x1) / 2 + 1.5, bz = B.z0 + 2.2;
  S.push(box(bx - 0.9, bx + 0.9, h + 0.42, h + 0.48, bz - 0.22, bz + 0.22, [110, 80, 50], 0.06));
  S.push(box(bx - 0.9, bx + 0.9, h + 0.55, h + 0.95, bz + 0.2, bz + 0.26, [110, 80, 50], 0.06));
  for (const e of [-0.8, 0.8]) S.push(box(bx + e - 0.04, bx + e + 0.04, h, h + 0.45, bz - 0.2, bz + 0.2, [36, 36, 40], 0.03));
  S.push(box(bx + 1.2, bx + 1.55, h, h + 0.22, bz - 0.15, bz + 0.1, [30, 30, 34], 0.04)); G.push(box(bx + 1.25, bx + 1.4, h + 0.08, h + 0.16, bz - 0.16, bz - 0.15, [120, 255, 140], 0));   // a little radio
  for (let k = 0; k < 5; k++) S.push(cyl(V(bx - 1.3 + k * 0.08, h, bz + 0.3 - k * 0.05), V(bx - 1.3 + k * 0.08, h + 0.24, bz + 0.3 - k * 0.05), 0.033, 0.033, [40, 120, 50], { n: 6 }));   // empty cans
  // a camping lantern on a crate, and a string of fairy lights along the parapet
  S.push(box(bx - 1.55, bx - 1.05, h, h + 0.4, bz - 0.25, bz + 0.25, [120, 92, 60], 0.12));
  S.push(cyl(V(bx - 1.3, h + 0.4, bz), V(bx - 1.3, h + 0.46, bz), 0.08, 0.08, [30, 30, 34], { n: 8 }));
  G.push(cyl(V(bx - 1.3, h + 0.46, bz), V(bx - 1.3, h + 0.66, bz), 0.07, 0.07, [255, 200, 120], { n: 8, amt: 0 }));
  lightPool(bx - 0.6, bz, 2.8, h + 0.05);
  for (let k = 0; k < 16; k++) { const x = B.x0 + 1 + k * ((B.x1 - B.x0 - 2) / 15); G.push(cyl(V(x, h + 0.92 - 0.12 * Math.sin((k % 4) / 4 * Math.PI), B.z0 + 0.15), V(x, h + 0.98 - 0.12 * Math.sin((k % 4) / 4 * Math.PI), B.z0 + 0.15), 0.04, 0.04, [[255, 120, 140], [255, 220, 120], [140, 220, 255], [180, 255, 160]][k % 4], { n: 5, amt: 0 })); }
  ROOF_SPOTS.stonerSeat = [bx, h, bz];
}
// rubbish in the streets: wrappers and cans in the gutters, bags out by the shops, newspapers, a hydrant or two
{
  const tr = rngFrom(919), litter = (x, z, y) => {
    const kind = tr(); y = y || 0;
    if (kind < 0.4) { const s = 0.05 + tr() * 0.06, v = 150 + Math.floor(tr() * 90); S.push(box(x - s, x + s, y + 0.005, y + 0.03 + tr() * 0.04, z - s * 0.8, z + s * 0.8, [v, v, v - 10], 0.25)); }
    else if (kind < 0.7) { const a = tr() * Math.PI, dx = Math.cos(a) * 0.06, dz = Math.sin(a) * 0.06; S.push(cyl(V(x - dx, y + 0.033, z - dz), V(x + dx, y + 0.033, z + dz), 0.033, 0.033, [[180, 30, 30], [170, 170, 176], [30, 70, 150], [40, 120, 50]][Math.floor(tr() * 4)], { n: 6 })); }
    else if (kind < 0.85) { S.push(box(x - 0.22, x + 0.22, y + 0.004, y + 0.012, z - 0.16, z + 0.16, [200, 196, 180], 0.1)); }
    else S.push(box(x - 0.1, x + 0.1, y + 0.004, y + 0.06, z - 0.07, z + 0.07, [150, 30, 30], 0.15));
  };
  for (let n = 0; n < 160; n++) { const x = ST.x0 + 2 + tr() * (ST.x1 - ST.x0 - 3), side = tr(); const z = side < 0.3 ? ST.curb0 + 0.15 + tr() * 0.25 : side < 0.6 ? ST.curb1 - 0.15 - tr() * 0.25 : side < 0.8 ? ST.walk0 + 0.4 + tr() * 2.0 : ST.curb1 + 0.4 + tr() * 2.6; if (Math.abs(x) < 3 && z < 7) continue; litter(x, z, z > ST.curb0 && z < ST.curb1 ? ROAD_Y : 0); }
  for (let n = 0; n < 50; n++) { const z = -60 + tr() * 60, x = tr() < 0.5 ? SS.x0 + 0.2 + tr() * 0.3 : SS.x1 - 0.2 - tr() * 0.3; litter(x, z, ROAD_Y); }
  // bin bags piled at the curb outside the shops across the road
  for (let x = ST.x0 + 6; x < 18; x += 9 + tr() * 9) for (let k = 0, n = 2 + Math.floor(tr() * 3); k < n; k++) { const bx = x + (tr() - 0.5) * 1.2, bz = ST.curb1 + 0.45 + tr() * 0.4, r2 = 0.24 + tr() * 0.1; S.push(loft([rring(0, r2 * 0.7, r2 * 0.7, bx, bz, 8, 2), rring(r2 * 0.8, r2, r2, bx, bz, 8, 2), rring(r2 * 1.5, r2 * 0.7, r2 * 0.7, bx, bz, 8, 2), rring(r2 * 1.8, 0.04, 0.04, bx, bz, 8, 2)], [14, 14, 16], { smooth: true, amt: 0.25 })); }
  // fire hydrants and newspaper boxes on the far sidewalk
  for (const x of [-62, -31, -9, 13]) { S.push(cyl(V(x, 0, ST.curb1 + 0.5), V(x, 0.55, ST.curb1 + 0.5), 0.12, 0.12, [190, 30, 30], { n: 8 })); S.push(cyl(V(x, 0.55, ST.curb1 + 0.5), V(x, 0.68, ST.curb1 + 0.5), 0.1, 0.03, [190, 30, 30], { n: 8 })); S.push(cyl(V(x - 0.18, 0.4, ST.curb1 + 0.5), V(x + 0.18, 0.4, ST.curb1 + 0.5), 0.05, 0.05, [170, 26, 26], { n: 6 })); }
  for (const [x, c] of [[-44, [30, 70, 150]], [-20, [200, 160, 30]], [-19.4, [40, 120, 60]], [6, [180, 40, 40]]]) { S.push(box(x - 0.25, x + 0.25, 0, 1.05, ST.curb1 + 1.0, ST.curb1 + 1.45, c, 0.05)); G.push(box(x - 0.18, x + 0.18, 0.75, 0.95, ST.curb1 + 0.98, ST.curb1 + 1.0, [220, 220, 200], 0)); }
  // puddles shining under the lamps
  const pud = new THREE.MeshBasicMaterial({ color: 0x1c2638, transparent: true, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -12, fog: true });
  for (let n = 0; n < 14; n++) { const g = new THREE.CircleGeometry(0.3 + tr() * 0.5, 10); const m = new THREE.Mesh(g, pud); m.rotation.x = -Math.PI / 2; m.scale.set(1.6, 0.8 + tr() * 0.5, 1); m.position.set(ST.x0 + 4 + tr() * (ST.x1 - ST.x0 - 6), ROAD_Y + 0.02, ST.curb0 + 0.6 + tr() * (ST.curb1 - ST.curb0 - 1.2)); scene.add(m); }
}

// ================================================================ THE GOLF CLUB: down the side street, past the trees, six holes under floodlights
// the course as data; golf.js plays on the same numbers (BAR.golfCourse)
const GOLF = {
  bounds: { x0: -10, x1: 80, z0: -232, z1: -72 },
  holes: [
    { par: 4, tee: [36, -82], pin: [48, -166], green: [48, -166, 7, 6], fw: [[37, -96], [46, -152]], fwr: 7.5, bunkers: [[55.5, -161, 2.6], [40, -152, 2.2]], water: [] },
    { par: 3, tee: [58, -180], pin: [71, -126], green: [71, -126, 6.5, 6], fw: [[67, -143], [69.5, -137]], fwr: 5.5, bunkers: [[77.5, -129, 2.3]], water: [[64, -153, 6.5, 4.2]] },
    { par: 3, tee: [74, -114], pin: [64, -84], green: [64, -84, 6, 5.5], fw: [], fwr: 0, bunkers: [[70.5, -92, 2.8]], water: [] },
    { par: 4, tee: [20, -88], pin: [10, -152], green: [10, -152, 7, 6.5], fw: [[20, -102], [12, -142]], fwr: 7.5, bunkers: [[17, -158, 2.4]], water: [[3, -120, 4.6, 8]] },
    { par: 3, tee: [4, -164], pin: [-2, -212], green: [-2, -212, 6.5, 6], fw: [[3, -176], [0, -200]], fwr: 5.5, bunkers: [[4.5, -208, 2.3], [-8, -214, 2]], water: [] },
    { par: 3, tee: [8, -224], pin: [50, -214], green: [50, -214, 6.5, 6], fw: [[19, -222.5], [40, -216]], fwr: 6, bunkers: [[46, -207.5, 2.2]], water: [[30, -228.8, 6, 2.6]] }
  ]
};
GOLF.holes.forEach((h, i) => { h.n = i + 1; h.len = Math.round(Math.hypot(h.pin[0] - h.tee[0], h.pin[1] - h.tee[1])); });
// how far each playing surface sits above the ground (the ball and the golfer stand on it)
const LIFT = { tee: 0.14, green: 0.12, fringe: 0.085, fairway: 0.05 };
const golfLift = (x, z) => LIFT[golfSurface(x, z)] || 0;
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz; let u = l2 ? ((x - a[0]) * dx + (z - a[1]) * dz) / l2 : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u); };
// bunkers sit cleanly in the rough: nudge any that clip a fairway or a green's fringe out until they don't
function nudgeBunkers() {
  for (const h of GOLF.holes) for (const b of h.bunkers) for (let it = 0; it < 80; it++) {
    let mx = 0, mz = 0;
    for (const o of GOLF.holes) {
      if (o.fw.length) { const d = segDist(b[0], b[1], o.fw[0], o.fw[1]); if (d < o.fwr + b[2] + 0.5) { const dx = o.fw[1][0] - o.fw[0][0], dz = o.fw[1][1] - o.fw[0][1], l2 = dx * dx + dz * dz; let u = ((b[0] - o.fw[0][0]) * dx + (b[1] - o.fw[0][1]) * dz) / l2; u = Math.max(0, Math.min(1, u)); const cx = o.fw[0][0] + dx * u, cz = o.fw[0][1] + dz * u, n = Math.hypot(b[0] - cx, b[1] - cz) || 1; mx += (b[0] - cx) / n; mz += (b[1] - cz) / n; } }
      if (inEll(b[0], b[1], o.green, 1.6 + b[2] + 0.4)) { const n = Math.hypot(b[0] - o.green[0], b[1] - o.green[1]) || 1; mx += (b[0] - o.green[0]) / n; mz += (b[1] - o.green[1]) / n; }
    }
    if (!mx && !mz) break;
    b[0] += mx * 0.25; b[1] += mz * 0.25;
  }
}
const inEll = (x, z, e, pad) => { const rx = e[2] + (pad || 0), rz = e[3] + (pad || 0); return ((x - e[0]) / rx) ** 2 + ((z - e[1]) / rz) ** 2 <= 1; };
nudgeBunkers();
// what the ball is sitting on at a point
function golfSurface(x, z) {
  const B = GOLF.bounds;
  if (x < B.x0 || x > B.x1 || z < B.z0 || z > B.z1) return 'ob';
  for (const h of GOLF.holes) {
    for (const w of h.water) if (inEll(x, z, w)) return 'water';
    for (const b of h.bunkers) if (Math.hypot(x - b[0], z - b[1]) <= b[2]) return 'bunker';
    if (inEll(x, z, h.green)) return 'green';
  }
  for (const h of GOLF.holes) {
    if (inEll(x, z, h.green, 1.6)) return 'fringe';
    if (h.fw.length && segDist(x, z, h.fw[0], h.fw[1]) <= h.fwr) return 'fairway';
    if (Math.abs(x - h.tee[0]) <= 2.6 && Math.abs(z - h.tee[1]) <= 2.6) return 'tee';
  }
  return 'rough';
}
{
  // ---- ground: rough everywhere, then fairways, fringes, greens, bunkers and water laid on top
  const flatShape = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); return s; };
  const ellPts = (e, pad, n) => { const out = []; for (let k = 0; k < (n || 40); k++) { const a = (k / (n || 40)) * Math.PI * 2; out.push([e[0] + Math.cos(a) * (e[2] + pad), e[1] + Math.sin(a) * (e[3] + pad)]); } return out; };
  const capPts = (a, b, r, n) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), out = []; n = n || 14;
    for (let k = 0; k <= n; k++) { const t = ang + Math.PI / 2 + (k / n) * Math.PI; out.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]); }
    for (let k = 0; k <= n; k++) { const t = ang - Math.PI / 2 + (k / n) * Math.PI; out.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]); }
    return out;
  };
  // flat pieces for things that lie on the ground, and raised ones (a gentle bevelled lip) for the playing surfaces
  const lay = (pts, mat, y, uvs) => {
    const g = new THREE.ShapeGeometry(flatShape(pts));
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / uvs, uv.getY(i) / uvs);
    const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); return m;
  };
  const raise = (pts, mat, top, uvs, bevel) => {
    const bt = Math.min(0.03, top * 0.45), depth = Math.max(0.005, top - bt * 2 + 0.02);
    const g = new THREE.ExtrudeGeometry(flatShape(pts), { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 12 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / uvs, uv.getY(i) / uvs);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.y = top - depth - bt; scene.add(m); return m;
  };
  // grass textures with real blades, clover, worn patches; mown stripes on fairways, a checkerboard cut on the greens
  const grass = (base, opts) => canvasTex(64, 64, (x, w, h) => {
    const o = opts || {}, r = rngFrom(hashStr(base.join(',') + (o.seed || '')));
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, w, h);
    if (o.stripe) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const band = o.stripe === 'check' ? (Math.floor(i / 16) + Math.floor(j / 16)) % 2 : Math.floor((i + j) / 16) % 2;
      if (band) { x.fillStyle = `rgba(255,255,255,${o.amt || 0.07})`; x.fillRect(i, j, 1, 1); }
    }
    for (let k = 0; k < (o.blades || 900); k++) {
      const v = (r() - 0.5) * (o.var || 40), px = Math.floor(r() * w), py = Math.floor(r() * h), len = 1 + Math.floor(r() * (o.len || 3));
      x.fillStyle = `rgb(${Math.max(0, base[0] + v * 0.7)},${Math.max(0, base[1] + v)},${Math.max(0, base[2] + v * 0.6)})`;
      x.fillRect(px, py, 1, len);
    }
    for (let k = 0; k < (o.clover || 0); k++) { x.fillStyle = `rgba(${base[0] + 18},${base[1] + 34},${base[2] + 14},0.8)`; const px = Math.floor(r() * w), py = Math.floor(r() * h); x.fillRect(px, py, 2, 2); }
    for (let k = 0; k < (o.patches || 0); k++) { x.fillStyle = `rgba(${o.patchCol || '70,60,30'},0.35)`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 5, 0, 7); x.fill(); }
    for (let k = 0; k < (o.flowers || 0); k++) { x.fillStyle = ['#e8e4d0', '#e8d24a', '#c8a0e8'][Math.floor(r() * 3)]; x.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }
  });
  const gm = (tex, units, emi, factor) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return new THREE.MeshLambertMaterial({ map: tex, emissive: emi || 0x000000, polygonOffset: true, polygonOffsetFactor: factor || -1, polygonOffsetUnits: units }); };
  const roughTex = grass([22, 42, 21], { blades: 1400, var: 46, len: 4, clover: 40, patches: 6, patchCol: '60,52,26', flowers: 10, seed: 'r' });
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  const roughMat = new THREE.MeshLambertMaterial({ map: roughTex, emissive: 0x040904 });
  GOLF.roughMat = roughMat; GOLF.roughTex = roughTex;
  const B = GOLF.bounds;
  for (const [a, b, c, d] of [[B.x0 - 40, B.x1 + 40, B.z0 - 40, -80], [B.x0 - 40, 22, -80, -66.2], [35.2, B.x1 + 40, -80, -66.2], [22, 35.2, -80, -77.4], [36.25, B.x1 + 40, -66.2, 2]]) { const m = groundPlane(a, b, c, d, roughTex, 2.4, 0); m.material = roughMat; }
  const firstCut = gm(grass([30, 60, 28], { blades: 1100, var: 34, len: 3, clover: 20, seed: 'c' }), -4, 0x060c06, -2);
  const fwMat = gm(grass([46, 96, 40], { stripe: 'diag', amt: 0.09, blades: 900, var: 24, len: 2, seed: 'f' }), -6, 0x081408, -3);
  const teeMat = gm(grass([52, 104, 46], { stripe: 'diag', amt: 0.06, blades: 800, var: 20, len: 2, seed: 't' }), -6, 0x081408, -3);
  const fringeMat = gm(grass([50, 104, 44], { blades: 900, var: 22, len: 2, seed: 'g' }), -8, 0x0a180a, -4);
  const greenMat = gm(grass([78, 160, 64], { stripe: 'check', amt: 0.08, blades: 700, var: 16, len: 1, seed: 'p' }), -10, 0x123012, -5);
  const sandMat = gm(canvasTex(64, 64, (x, w, h) => {
    noiseFill(x, w, h, [196, 178, 130], 14);
    for (let j = 2; j < h; j += 5) { x.fillStyle = 'rgba(120,100,64,0.35)'; for (let i = 0; i < w; i++) x.fillRect(i, j + Math.round(Math.sin(i / 7) * 1.2), 1, 1); }   // rake lines
    for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(255,248,220,0.5)'; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 1, 1); }
  }), -7, 0x14100a, -5);
  const mudMat = gm(canvasTex(32, 32, (x, w, h) => noiseFill(x, w, h, [44, 38, 28], 12)), -6, 0x000000, -4);
  const waterMat = new THREE.MeshBasicMaterial({ map: (() => { const t = canvasTex(64, 64, (x, w, h) => { noiseFill(x, w, h, [16, 40, 62], 6); for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${120 + Math.floor(rr() * 60)},${170 + Math.floor(rr() * 50)},230,${0.25 + rr() * 0.3})`; x.fillRect(Math.floor(rr() * w), Math.floor(rr() * h), 3 + Math.floor(rr() * 8), 1); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })(), polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -10, fog: true });
  GOLF.waterTex = waterMat.map;
  const fwEdge = (h) => capPts(h.fw[0], h.fw[1], h.fwr + 1.8);
  for (const h of GOLF.holes) {
    // the first cut of rough hugs the fairway, then the fairway itself sits a few centimetres proud
    if (h.fw.length) { lay(fwEdge(h), firstCut, 0.002 + h.n * 0.004, 6); raise(capPts(h.fw[0], h.fw[1], h.fwr), fwMat, LIFT.fairway, 8, 0.5); }
    raise([[h.tee[0] - 2.6, h.tee[1] - 2.6], [h.tee[0] + 2.6, h.tee[1] - 2.6], [h.tee[0] + 2.6, h.tee[1] + 2.6], [h.tee[0] - 2.6, h.tee[1] + 2.6]], teeMat, LIFT.tee, 3, 0.35);
    raise(ellPts(h.green, 1.6, 48), fringeMat, LIFT.fringe, 4, 0.45);
    raise(ellPts(h.green, 0, 48), greenMat, LIFT.green, 4, 0.3);
    for (const b of h.bunkers) {
      lay(ellPts([b[0], b[1], b[2], b[2]], 0.05, 24), sandMat, 0.008, 3);
      S.push(...arcRing(b[0], b[1], b[2] - 0.05, b[2] + 0.12, 0, 0.11, [196, 178, 130], 24));     // the sand banks up to the lip
      S.push(...arcRing(b[0], b[1], b[2] + 0.12, b[2] + 0.42, 0, 0.13, [34, 70, 30], 24));       // and a grassy lip round the outside
      // a rake left in the sand
      const ra = hashStr('rake' + b[0]) % 628 / 100, rx = b[0] + Math.cos(ra) * b[2] * 0.4, rz = b[1] + Math.sin(ra) * b[2] * 0.4;
      S.push(cyl(V(rx, 0.03, rz), V(rx + Math.cos(ra) * 1.5, 0.12, rz + Math.sin(ra) * 1.5), 0.015, 0.015, [150, 120, 80], { n: 4 }));
      S.push(box(rx - 0.2, rx + 0.2, 0.01, 0.05, rz - 0.04, rz + 0.04, [60, 60, 66], 0.03));
    }
    for (const w of h.water) {
      const m = Math.max(w[2], w[3]), sx = w[2] / m, sz = w[3] / m;
      lay(ellPts(w, 0.9, 40), mudMat, 0.006, 3);
      lay(ellPts(w, 0, 40), waterMat, 0.01, 5);
      // stones round the bank, and reeds and lily pads
      const wr = rngFrom(hashStr('pond' + w[0]));
      for (let k = 0; k < 46; k++) { const a = (k / 46) * Math.PI * 2 + wr() * 0.1, rr2 = 1 + 0.06 + wr() * 0.08; const x = w[0] + Math.cos(a) * w[2] * rr2, z = w[1] + Math.sin(a) * w[3] * rr2, s = 0.12 + wr() * 0.16, g = 70 + Math.floor(wr() * 40); S.push(loft([rring(0, s, s * 0.8, x, z, 6, 2), rring(s * 0.7, s * 0.9, s * 0.7, x, z, 6, 2), rring(s * 1.1, 0.02, 0.02, x, z, 6, 2)], [g, g - 4, g - 10], { amt: 0.25 })); }
      for (let k = 0; k < 60; k++) {
        const a = wr() * Math.PI * 2, rr2 = 0.8 + wr() * 0.28, x = w[0] + Math.cos(a) * w[2] * rr2, z = w[1] + Math.sin(a) * w[3] * rr2, hgt = 0.5 + wr() * 0.8, lean = (wr() - 0.5) * 0.25;
        S.push(cyl(V(x, 0, z), V(x + lean, hgt, z + lean * 0.5), 0.012, 0.006, [46 + Math.floor(wr() * 30), 80 + Math.floor(wr() * 40), 36], { n: 3 }));
        if (wr() < 0.25) S.push(cyl(V(x + lean, hgt * 0.8, z + lean * 0.5), V(x + lean * 1.1, hgt * 0.95, z + lean * 0.55), 0.03, 0.028, [70, 46, 26], { n: 5 }));   // a cattail
      }
      for (let k = 0; k < 9; k++) { const a = wr() * Math.PI * 2, rr2 = 0.3 + wr() * 0.5, x = w[0] + Math.cos(a) * w[2] * rr2, z = w[1] + Math.sin(a) * w[3] * rr2, s = 0.18 + wr() * 0.14; S.push(cyl(V(x, 0.03, z), V(x, 0.045, z), s, s, [40, 96, 46], { n: 9 })); if (wr() < 0.4) G.push(cyl(V(x + s * 0.3, 0.045, z), V(x + s * 0.3, 0.09, z), 0.05, 0.03, [255, 200, 230], { n: 6, amt: 0 })); }
      void sx; void sz;
    }
    // the cup, the flag on its pole, and the tee markers and sign
    const [px, pz] = h.pin;
    const cup = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), new THREE.MeshBasicMaterial({ color: 0x050505, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -10 }));
    cup.rotation.x = -Math.PI / 2; cup.position.set(px, LIFT.green + 0.004, pz); scene.add(cup);
    S.push(cyl(V(px, LIFT.green, pz), V(px, 2.3, pz), 0.018, 0.018, [236, 236, 230], { n: 5 }));
    G.push(cyl(V(px, 2.3, pz), V(px, 2.36, pz), 0.03, 0.02, [255, 240, 200], { n: 6, amt: 0 }));
    const fc = document.createElement('canvas'); fc.width = 64; fc.height = 40; const fx = fc.getContext('2d');
    fx.fillStyle = '#c8142c'; fx.fillRect(0, 0, 64, 40); fx.fillStyle = '#fff4e0'; fx.font = 'bold 26px "IBM Plex Mono", monospace'; fx.textAlign = 'center'; fx.textBaseline = 'middle'; fx.fillText(String(h.n), 32, 21);
    const ft = new THREE.CanvasTexture(fc); ft.magFilter = THREE.NearestFilter; ft.encoding = THREE.sRGBEncoding;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), new THREE.MeshBasicMaterial({ map: ft, side: THREE.DoubleSide, fog: true }));
    const fg = new THREE.Group(); fg.position.set(px, 2.05, pz); flag.position.set(0.36, 0, 0); fg.add(flag); scene.add(fg);
    GOLF_FLAGS.push(fg);
    for (const e of [-1, 1]) { const ta = Math.atan2(h.pin[0] - h.tee[0], h.pin[1] - h.tee[1]), tx = h.tee[0] + Math.cos(ta) * e * 1.4, tz = h.tee[1] - Math.sin(ta) * e * 1.4; S.push(loft([rring(LIFT.tee, 0.07, 0.07, tx, tz, 8, 2), rring(LIFT.tee + 0.1, 0.09, 0.09, tx, tz, 8, 2), rring(LIFT.tee + 0.17, 0.02, 0.02, tx, tz, 8, 2)], [30, 80, 200], { smooth: true, amt: 0.05 })); }
    const ang = Math.atan2(h.pin[0] - h.tee[0], h.pin[1] - h.tee[1]), sx = h.tee[0] - Math.sin(ang) * 3.4 + Math.cos(ang) * 2.4, sz = h.tee[1] - Math.cos(ang) * 3.4 - Math.sin(ang) * 2.4;
    S.push(cyl(V(sx, 0, sz), V(sx, 1.0, sz), 0.04, 0.04, [60, 44, 30], { n: 5 }));
    const sc = document.createElement('canvas'); sc.width = 96; sc.height = 64; const sxx = sc.getContext('2d');
    sxx.fillStyle = '#16241a'; sxx.fillRect(0, 0, 96, 64); sxx.strokeStyle = '#e2b467'; sxx.lineWidth = 2; sxx.strokeRect(2, 2, 92, 60);
    sxx.fillStyle = '#e2b467'; sxx.textAlign = 'center'; sxx.font = 'bold 22px "IBM Plex Mono", monospace'; sxx.fillText('HOLE ' + h.n, 48, 26); sxx.font = '14px "IBM Plex Mono", monospace'; sxx.fillStyle = '#d8e8d0'; sxx.fillText('PAR ' + h.par + ' · ' + h.len + 'm', 48, 48);
    const st = new THREE.CanvasTexture(sc); st.magFilter = THREE.NearestFilter; st.encoding = THREE.sRGBEncoding;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.48), decal({ map: st, side: THREE.DoubleSide })); sm.position.set(sx, 1.18, sz); sm.rotation.y = ang + Math.PI; scene.add(sm);
  }
  // ---- trees: a belt round the course and copses between the holes, never on a hole's line of play
  const treeOK = (x, z) => {
    if (x < -16 && z > -88) return false;   // the back alley and its buildings
    if (golfSurface(x, z) !== 'rough' && golfSurface(x, z) !== 'ob') return false;
    for (const h of GOLF.holes) { if (segDist(x, z, h.tee, h.pin) < Math.max(9, h.fwr + 4)) return false; if (Math.hypot(x - h.tee[0], z - h.tee[1]) < 6) return false; }
    if (Math.hypot(x - 28.6, z - -71) < 9 || (x > 22 && x < 35 && z > -80) || (x > 33 && x < 56 && z > -78)) return false;   // the turnaround and the clubhouse
    return true;
  };
  const tr = rngFrom(31337);
  const plant = (x, z, s) => { const k = tr(); if (k < 0.45) pineTree(x, z, s); else if (k < 0.8) tree(x, z, s); else birch(x, z, s * 0.95); };
  for (let n = 0; n < 4000 && GOLF_TREES.length < 300; n++) {
    const x = B.x0 - 30 + tr() * (B.x1 - B.x0 + 60), z = B.z0 - 30 + tr() * (B.z1 - B.z0 + 40);
    const edge = x < B.x0 + 4 || x > B.x1 - 4 || z < B.z0 + 4;
    if (!edge && tr() < 0.55) continue;
    if (!treeOK(x, z)) continue;
    if (GOLF_TREES.some(([a, b]) => Math.hypot(a - x, b - z) < 3.2)) continue;
    const s = 0.8 + tr() * 0.6; plant(x, z, s); GOLF_TREES.push([x, z, s]);
  }
  // a tree line down the far side of the side street, where the buildings used to be, and a few up the lawn by the drive
  for (let n = 0; n < 600 && GOLF_TREES.length < 380; n++) {
    const x = 36.5 + tr() * 24, z = -15 - tr() * 48;
    if (x > 33 && x < 56 && z < -60) continue;
    if (GOLF_TREES.some(([a, b]) => Math.hypot(a - x, b - z) < 3)) continue;
    const s = 0.8 + tr() * 0.6; plant(x, z, s); GOLF_TREES.push([x, z, s]);
  }
  // the strip behind the courtyard, between the car park and the drive: lawn and a copse
  { const m = groundPlane(AL.x0 - 0.05, AL.x1 + 0.05, -66.2, AL.z0 - 0.05, roughTex, 1.6, 0); m.material = roughMat; }
  for (let n = 0; n < 200 && GOLF_TREES.length < 420; n++) {
    const x = AL.x0 + 1.5 + tr() * (AL.x1 - AL.x0 - 3), z = AL.z0 - 12 - tr() * 19;
    if (GOLF_TREES.some(([a, b]) => Math.hypot(a - x, b - z) < 3)) continue;
    const s = 0.8 + tr() * 0.6; plant(x, z, s); GOLF_TREES.push([x, z, s]);
  }
  // rolling hills beyond the trees
  for (const [x, z, w, d, h] of [[-40, -150, 26, 60, 7], [-36, -230, 30, 34, 9], [110, -120, 34, 70, 10], [104, -210, 30, 40, 8], [30, -270, 60, 26, 11], [-30, -90, 18, 22, 5], [96, -60, 26, 22, 6]]) {
    S.push(loft([rring(-0.2, w, d, x, z, 16, 2), rring(h * 0.4, w * 0.82, d * 0.82, x, z, 16, 2), rring(h * 0.8, w * 0.5, d * 0.5, x, z, 16, 2), rring(h, w * 0.18, d * 0.18, x, z, 16, 2)], [22, 42, 24], { smooth: true, amt: 0.08 }));
  }
  // a winding cart path
  const pathPts = [[30, -76], [31.5, -95], [33, -120], [32, -150], [33, -180], [30, -205], [23, -223]];
  for (let k = 0; k < pathPts.length - 1; k++) { const [a, b] = [pathPts[k], pathPts[k + 1]]; GD.push(groundStrip(a[0], a[1], b[0], b[1], 1.6, 0.0, [70, 66, 58], 0.012)); }

  // ---- floodlights on tall masts at the corners, bathing the course in pale light
  for (const [x, z, ax, az] of [[31, -110, 1, -1], [31, -190, -1, 1], [B.x1 + 2, -150, -1, 0], [B.x0 - 2, -125, 1, 0]]) {
    S.push(cyl(V(x, 0, z), V(x, 13, z), 0.18, 0.12, [56, 58, 62], { n: 6 }));
    S.push(box(x - 1.3, x + 1.3, 12.6, 13.0, z - 0.1, z + 0.1, [40, 42, 46], 0.02));
    for (let k = -1; k <= 1; k++) { S.push(box(x + k * 0.85 - 0.36, x + k * 0.85 + 0.36, 13.0, 13.7, z - 0.25, z + 0.25, [30, 30, 34], 0.03)); G.push(box(x + k * 0.85 - 0.3, x + k * 0.85 + 0.3, 13.06, 13.64, z + az * 0.26 - 0.01, z + az * 0.26 + 0.01, [236, 244, 255], 0)); }
    const pool = lightPool(x + ax * 14, z + az * 14, 26, 0.16); pool.material = golfPoolMat;
  }
  pLight(0xdfe8ff, 1.3, 46, 31, 12, -110); pLight(0xdfe8ff, 1.3, 46, 52, 12, -190); pLight(0xdfe8ff, 1.2, 40, 8, 12, -150);

  // ---- the turnaround at the end of the side street, and the clubhouse beside it
  { const g = new THREE.CircleGeometry(6.2, 28); scaleUV(g, 12.4 / 3, 12.4 / 3); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: asphaltTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); m.rotation.x = -Math.PI / 2; m.position.set(28.6, ROAD_Y + 0.015, -71); scene.add(m); }
  S.push(...arcRing(28.6, -71, 6.2, 6.32, ROAD_Y, 0, [74, 74, 80], 36, 1, 1, Math.PI * 1.36, Math.PI * 2.64));
  S.push(loft([rring(ROAD_Y, 2.2, 2.2, 28.6, -71, 14, 2), rring(0.3, 2.2, 2.2, 28.6, -71, 14, 2)], [86, 84, 80], { amt: 0.04 }));
  tree(28.6, -71, 0.9);
  {
    const x0 = 37, x1 = 52, z0 = -70.5, z1 = -63, H = 3.4, wood = [70, 50, 34], trim = [214, 206, 188];
    S.push(box(x0, x1, 0, 0.3, z0 - 1.2, z1, [96, 92, 86], 0.03));                       // a stone plinth and porch
    S.push(box(x0, x1, 0.3, H, z0, z1, wood, 0.05));
    S.push(box(x0 - 0.3, x1 + 0.3, H, H + 0.25, z0 - 0.3, z1 + 0.3, trim, 0.03));
    S.push(loft([[V(x0 - 0.5, H + 0.25, z0 - 0.6), V(x1 + 0.5, H + 0.25, z0 - 0.6), V(x1 + 0.5, H + 0.25, z1 + 0.6), V(x0 - 0.5, H + 0.25, z1 + 0.6)], [V(x0 + 2, H + 2.4, (z0 + z1) / 2 - 0.2), V(x1 - 2, H + 2.4, (z0 + z1) / 2 - 0.2), V(x1 - 2, H + 2.4, (z0 + z1) / 2 + 0.2), V(x0 + 2, H + 2.4, (z0 + z1) / 2 + 0.2)]], [40, 54, 46], { amt: 0.05 }));
    for (let x = x0 + 1.2; x < x1 - 1; x += 2.4) { G.push(box(x, x + 1.3, 1.0, 2.5, z0 - 0.05, z0 + 0.01, [255, 206, 140], 0)); S.push(box(x - 0.08, x + 1.38, 0.92, 1.0, z0 - 0.1, z0 + 0.02, trim, 0.03)); }
    for (let x = x0 + 0.6; x <= x1; x += 3.6) S.push(cyl(V(x, 0.3, z0 - 1.05), V(x, H, z0 - 1.05), 0.09, 0.09, trim, { n: 8 }));
    S.push(box(x0, x1, H - 0.2, H, z0 - 1.2, z0, trim, 0.03));
    const c = document.createElement('canvas'); c.width = 320; c.height = 64; const cx = c.getContext('2d');
    cx.fillStyle = '#122016'; cx.fillRect(0, 0, 320, 64); cx.strokeStyle = '#e2b467'; cx.lineWidth = 3; cx.strokeRect(3, 3, 314, 58);
    cx.fillStyle = '#e7c98a'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = '30px "Limelight", Georgia, serif'; cx.fillText("SH1DEN'S GOLF CLUB", 160, 34);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), decal({ map: t })); m.position.set((x0 + x1) / 2, H + 0.95, z0 - 0.62); m.rotation.y = Math.PI; scene.add(m);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { cx.fillStyle = '#122016'; cx.fillRect(6, 6, 308, 52); cx.fillStyle = '#e7c98a'; cx.font = '30px "Limelight", Georgia, serif'; cx.fillText("SH1DEN'S GOLF CLUB", 160, 34); t.needsUpdate = true; });
    lightPool((x0 + x1) / 2, z0 - 3, 6);
    // golf carts parked by the porch
    for (const [gx, gz] of [[39.5, -74.5], [42.3, -74.5], [45.1, -74.5]]) {
      S.push(box(gx - 0.62, gx + 0.62, 0.3, 0.75, gz - 1.1, gz + 1.1, [230, 228, 220], 0.05));
      S.push(box(gx - 0.6, gx + 0.6, 0.75, 1.05, gz + 0.1, gz + 0.5, [40, 40, 44], 0.04));
      for (const [ox, oz] of [[-0.55, -0.9], [0.55, -0.9], [-0.55, 0.9], [0.55, 0.9]]) { S.push(cyl(V(gx + ox, 0.75, gz + oz), V(gx + ox, 1.75, gz + oz), 0.025, 0.025, [30, 30, 34], { n: 4 })); S.push(cyl(V(gx + ox * 1.05 - 0.07, 0.22, gz + oz), V(gx + ox * 1.05 + 0.07, 0.22, gz + oz), 0.22, 0.22, [18, 18, 20], { n: 10 })); }
      S.push(box(gx - 0.7, gx + 0.7, 1.75, 1.82, gz - 1.2, gz + 1.2, [36, 70, 50], 0.03));
      S.push(box(gx - 0.18, gx + 0.18, 0.75, 1.3, gz + 0.85, gz + 1.05, [60, 50, 40], 0.05));   // a bag of clubs on the back
    }
  }
  // ---- the details that make it feel lived in
  // bushes along the edges of the fairways and round the greens, and in clumps under the trees
  {
    const br = rngFrom(4711);
    for (const h of GOLF.holes) {
      if (h.fw.length) for (let k = 0; k < 7; k++) {
        const u = br(), side = br() < 0.5 ? -1 : 1, ax = h.fw[0][0] + (h.fw[1][0] - h.fw[0][0]) * u, az = h.fw[0][1] + (h.fw[1][1] - h.fw[0][1]) * u;
        const ang = Math.atan2(h.fw[1][1] - h.fw[0][1], h.fw[1][0] - h.fw[0][0]), d = h.fwr + 3.2 + br() * 3;
        const x = ax - Math.sin(ang) * d * side, z = az + Math.cos(ang) * d * side;
        if (golfSurface(x, z) === 'rough') bush(x, z, 0.8 + br() * 0.6);
      }
      for (let k = 0; k < 5; k++) { const a = br() * 6.28, x = h.green[0] + Math.cos(a) * (h.green[2] + 4.5 + br() * 2), z = h.green[1] + Math.sin(a) * (h.green[3] + 4.5 + br() * 2); if (golfSurface(x, z) === 'rough' && segDist(x, z, h.tee, h.pin) > 6) bush(x, z, 0.7 + br() * 0.5); }
    }
    for (const [x, z] of GOLF_TREES) if (br() < 0.4) { const a = br() * 6.28; bush(x + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2, 0.7 + br() * 0.6); }
    for (const [x, z] of [[36, -76.5], [40, -76.8], [47.5, -76.8], [51.5, -76.5], [33, -77.5]]) bush(x, z, 0.9);   // in front of the clubhouse
  }
  // grass tufts and wild flowers everywhere the ball isn't meant to be: crossed cards, thousands of them, one draw per patch
  {
    const tuftTex = canvasTex(32, 32, (x, w, h) => {
      x.clearRect(0, 0, w, h); const r = rngFrom(99);
      for (let k = 0; k < 16; k++) { const bx = 3 + r() * 26, top = 2 + r() * 14, lean = (r() - 0.5) * 8, v = 90 + Math.floor(r() * 120); x.strokeStyle = `rgb(${Math.floor(v * 0.6)},${v},${Math.floor(v * 0.45)})`; x.lineWidth = 1 + (r() < 0.4 ? 1 : 0); x.beginPath(); x.moveTo(bx, h); x.quadraticCurveTo(bx + lean * 0.3, (h + top) / 2, bx + lean, top); x.stroke(); }
    });
    const flowerTex = canvasTex(32, 32, (x, w, h) => {
      x.clearRect(0, 0, w, h); const r = rngFrom(98);
      for (let k = 0; k < 9; k++) { const bx = 4 + r() * 24, top = 6 + r() * 14; x.strokeStyle = 'rgb(60,110,50)'; x.lineWidth = 1; x.beginPath(); x.moveTo(bx, h); x.lineTo(bx + (r() - 0.5) * 4, top); x.stroke(); x.fillStyle = '#ffffff'; x.fillRect(bx - 1.5, top - 1.5, 3, 3); }
    });
    for (const t of [tuftTex, flowerTex]) { t.magFilter = THREE.NearestFilter; }
    const card = (w, hgt) => { const a = new THREE.PlaneGeometry(w, hgt); a.translate(0, hgt / 2, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const out = mergeGeos([a.toNonIndexed(), b.toNonIndexed()]); out.deleteAttribute('color'); return out; };
    const tuftGeo = card(0.55, 0.38), flowerGeo = card(0.42, 0.34);
    const tuftMat = ps1(new THREE.MeshLambertMaterial({ map: tuftTex, alphaTest: 0.5, side: THREE.DoubleSide }));
    const flowerMat = ps1(new THREE.MeshLambertMaterial({ map: flowerTex, alphaTest: 0.5, side: THREE.DoubleSide }));
    const cells = new Map(), gr = rngFrom(2024), dm = new THREE.Object3D(), col = new THREE.Color();
    const put = (x, z, flower) => {
      const key = Math.floor(x / 40) + ',' + Math.floor(z / 40) + (flower ? 'f' : '');
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push([x, z, flower]);
    };
    const B2 = GOLF.bounds;
    for (let n = 0; n < 26000; n++) {
      const x = B2.x0 - 14 + gr() * (B2.x1 - B2.x0 + 28), z = B2.z0 - 14 + gr() * (B2.z1 - B2.z0 + 14);
      const s = golfSurface(x, z);
      if (s !== 'rough' && s !== 'ob') continue;
      if (x < -16 && z > -88) continue;
      // thicker by the trees and the edges of play, thinner out in the open
      let near = 0; for (const h of GOLF.holes) { if (h.fw.length) near = Math.max(near, 1 - Math.abs(segDist(x, z, h.fw[0], h.fw[1]) - h.fwr - 3) / 6); }
      if (gr() > 0.18 + near * 0.5) continue;
      if (Math.hypot(x - 28.6, z + 71) < 7 || (x > 36 && x < 53 && z > -72)) continue;
      put(x, z, gr() < 0.12);
    }
    // the lawns by the drive, behind the courtyard and along the side street too
    for (const [x0, x1, z0, z1, n] of [[15.2, 22.6, -66, -4.5, 900], [AL.x0 + 0.5, AL.x1 - 0.5, -66, -36, 900], [-47, -28, -13.5, 3.5, 500], [-19.8, -14.3, -64, 3.5, 450], [35, 62, -64, -14, 900]]) {
      for (let k = 0; k < n; k++) { const x = x0 + gr() * (x1 - x0), z = z0 + gr() * (z1 - z0); if (Math.abs(z - LOT.z) < 2.6 && x > 15) continue; put(x, z, gr() < 0.15); }
    }
    for (const [key, list] of cells) {
      const flower = key.endsWith('f'), im = new THREE.InstancedMesh(flower ? flowerGeo : tuftGeo, flower ? flowerMat : tuftMat, list.length);
      list.forEach(([x, z], i) => {
        const s = 0.6 + gr() * 0.9; dm.position.set(x, 0, z); dm.rotation.set(0, gr() * 3.14, 0); dm.scale.set(s, s * (0.8 + gr() * 0.5), s); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
        if (flower) col.set([0xf4f0e0, 0xf2d24a, 0xc8a0f0, 0xf08ab0][Math.floor(gr() * 4)]);
        else { const dry = gr() < 0.15; col.setRGB(dry ? 0.85 : 0.55 + gr() * 0.25, dry ? 0.8 : 0.75 + gr() * 0.25, dry ? 0.45 : 0.45 + gr() * 0.2); }
        im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      // the instances' own spread, so the far patches are skipped like everything else past the fog
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of list) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      Object.assign(im.userData, { zone: 'main', cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, rad: Math.hypot(x1 - x0, z1 - z0) / 2 + 1 });
      im.frustumCulled = false; scene.add(im);
    }
  }
  // course furniture: benches and ball washers at the tees, bins, yardage posts down the fairways
  for (const h of GOLF.holes) {
    const a = Math.atan2(h.pin[0] - h.tee[0], h.pin[1] - h.tee[1]), px = Math.cos(a), pz = -Math.sin(a);
    const bx = h.tee[0] - px * 4.2 - Math.sin(a) * 1.0, bz = h.tee[1] - pz * 4.2 - Math.cos(a) * 1.0;
    // a slatted bench
    for (let k = 0; k < 3; k++) S.push(groundStrip(bx - px * 0.12 * k - Math.sin(a) * 0.8, bz - pz * 0.12 * k - Math.cos(a) * 0.8, bx - px * 0.12 * k + Math.sin(a) * 0.8, bz - pz * 0.12 * k + Math.cos(a) * 0.8, 0.09, 0.42, [120, 88, 56], 0.04));
    for (const e of [-0.7, 0.7]) S.push(cyl(V(bx + Math.sin(a) * e, 0, bz + Math.cos(a) * e), V(bx + Math.sin(a) * e, 0.44, bz + Math.cos(a) * e), 0.03, 0.03, [40, 40, 44], { n: 4 }));
    S.push(groundStrip(bx - px * 0.3 - Math.sin(a) * 0.8, bz - pz * 0.3 - Math.cos(a) * 0.8, bx - px * 0.3 + Math.sin(a) * 0.8, bz - pz * 0.3 + Math.cos(a) * 0.8, 0.07, 0.75, [120, 88, 56], 0.25));
    // a ball washer on a post, and a little bin
    const wx = h.tee[0] + px * 3.6, wz = h.tee[1] + pz * 3.6;
    S.push(cyl(V(wx, 0, wz), V(wx, 0.85, wz), 0.035, 0.035, [30, 60, 40], { n: 5 }));
    S.push(box(wx - 0.12, wx + 0.12, 0.85, 1.12, wz - 0.08, wz + 0.08, [36, 90, 56], 0.04));
    S.push(cyl(V(wx + 0.13, 1.0, wz), V(wx + 0.13, 1.25, wz), 0.012, 0.012, [200, 200, 200], { n: 4 }));
    S.push(cyl(V(wx - 0.6, 0, wz), V(wx - 0.6, 0.6, wz), 0.18, 0.2, [36, 60, 44], { n: 8, amt: 0.06 }));
    // yardage posts: red at 100 m, white at 50 m, from the flag, on the edge of the fairway
    if (h.fw.length) for (const [d, c] of [[100, [200, 40, 40]], [50, [236, 236, 230]], [25, [230, 200, 60]]]) {
      const L = Math.hypot(h.pin[0] - h.tee[0], h.pin[1] - h.tee[1]); if (d > L - 8) continue;
      const u = 1 - d / L, x = h.tee[0] + (h.pin[0] - h.tee[0]) * u + px * (h.fwr + 0.8), z = h.tee[1] + (h.pin[1] - h.tee[1]) * u + pz * (h.fwr + 0.8);
      S.push(cyl(V(x, 0, z), V(x, 0.7, z), 0.05, 0.05, [230, 230, 224], { n: 6 })); S.push(cyl(V(x, 0.7, z), V(x, 0.82, z), 0.06, 0.06, c, { n: 6 }));
    }
  }
  // low lanterns along the cart path
  for (let k = 0; k < pathPts.length - 1; k++) {
    const [a, b] = [pathPts[k], pathPts[k + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 4; d < L; d += 11) { const u = d / L, x = a[0] + (b[0] - a[0]) * u + 1.1, z = a[1] + (b[1] - a[1]) * u; S.push(cyl(V(x, 0, z), V(x, 0.55, z), 0.06, 0.06, [36, 36, 40], { n: 6 })); G.push(cyl(V(x, 0.44, z), V(x, 0.52, z), 0.065, 0.065, [255, 210, 140], { n: 6, amt: 0 })); S.push(cyl(V(x, 0.55, z), V(x, 0.6, z), 0.08, 0.05, [36, 36, 40], { n: 6 })); lightPool(x, z, 1.4); }
  }
  // fireflies drifting over the rough, ducks on the ponds, a greenkeeper mowing the far fairway
  {
    const N = 280, pos = new Float32Array(N * 3), base = [], fr = rngFrom(6060);
    for (let i = 0; i < N; i++) {
      let x = 0, z = 0; for (let t = 0; t < 30; t++) { x = GOLF.bounds.x0 + fr() * (GOLF.bounds.x1 - GOLF.bounds.x0); z = GOLF.bounds.z0 + fr() * (GOLF.bounds.z1 - GOLF.bounds.z0); if (golfSurface(x, z) === 'rough') break; }
      base.push([x, 0.4 + fr() * 1.6, z, fr() * 6.28, 0.3 + fr() * 0.7]);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flies = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd6ff8a, size: 0.13, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    flies.frustumCulled = false; flies.userData.anyZone = true; scene.add(flies);
    GOLF.life = [(t) => {
      for (let i = 0; i < N; i++) { const b = base[i], w = t * b[4] + b[3]; pos[i * 3] = b[0] + Math.sin(w) * 1.2; pos[i * 3 + 1] = b[1] + Math.sin(w * 1.7) * 0.35; pos[i * 3 + 2] = b[2] + Math.cos(w * 0.8) * 1.2; }
      geo.attributes.position.needsUpdate = true;
      flies.material.opacity = 0.55 + 0.35 * Math.sin(t * 2.3);
    }];
    // ducks: white body, green head, orange beak, paddling slow circles
    const duckParts = (h) => [loft([rring(0.0, 0.1, 0.16, 0, 0, 8, 2), rring(0.1, 0.14, 0.22, 0, 0, 8, 2), rring(0.18, 0.08, 0.14, 0, -0.02, 8, 2)], h ? [236, 232, 220] : [120, 92, 60], { smooth: true, amt: 0.05 }), loft([rring(0.18, 0.05, 0.05, 0, 0.13, 6, 2), rring(0.28, 0.065, 0.065, 0, 0.15, 6, 2), rring(0.36, 0.01, 0.01, 0, 0.15, 6, 2)], h ? [30, 90, 50] : [110, 84, 56], { smooth: true, amt: 0.05 }), box(-0.025, 0.025, 0.27, 0.3, 0.2, 0.28, [240, 150, 40], 0.02)];
    const ducks = [];
    for (const h of GOLF.holes) for (const w of h.water) for (let k = 0; k < 3; k++) { const g = new THREE.Mesh(toGeometry(duckParts(k !== 2)), roomMat); scene.add(g); ducks.push({ g, w, ph: k * 2.1 + w[0], sp: 0.08 + k * 0.03 }); }
    GOLF.life.push((t) => { for (const d of ducks) { const a = t * d.sp + d.ph, x = d.w[0] + Math.cos(a) * d.w[2] * 0.55, z = d.w[1] + Math.sin(a) * d.w[3] * 0.55; d.g.position.set(x, 0.03 + 0.01 * Math.sin(t * 2 + d.ph), z); d.g.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI; } });
    // the greenkeeper on a ride-on mower, headlight on, going up and down the fourth fairway
    const mower = new THREE.Group();
    mower.add(new THREE.Mesh(toGeometry([box(-0.55, 0.55, 0.18, 0.55, -0.9, 0.7, [190, 40, 30], 0.04), box(-0.62, 0.62, 0.0, 0.2, -0.95, 0.75, [40, 40, 44], 0.03), box(-0.25, 0.25, 0.55, 0.85, -0.6, -0.1, [30, 30, 34], 0.03), box(-0.24, 0.24, 0.85, 1.35, -0.55, -0.25, [70, 90, 120], 0.05), loft([rring(1.35, 0.13, 0.13, 0, -0.4, 8, 2), rring(1.6, 0.11, 0.11, 0, -0.4, 8, 2)], [210, 170, 130], { smooth: true }), box(-0.16, 0.16, 1.62, 1.68, -0.56, -0.24, [230, 200, 60], 0.03)]), roomMat));
    for (const [ox, oz, rad] of [[-0.6, 0.55, 0.2], [0.6, 0.55, 0.2], [-0.6, -0.75, 0.28], [0.6, -0.75, 0.28]]) mower.add(new THREE.Mesh(toGeometry([cyl(V(ox - 0.06, rad, oz), V(ox + 0.06, rad, oz), rad, rad, [16, 16, 18], { n: 8 })]), roomMat));
    mower.add(new THREE.Mesh(toGeometry([box(-0.1, 0.1, 0.35, 0.45, 0.72, 0.76, [255, 240, 200], 0)]), glowMat));
    const beam = lightPool(0, 0, 2.2); scene.remove(beam); beam.position.set(0, 0.03 - 0, 2.6); mower.add(beam);
    scene.add(mower);
    const h4 = GOLF.holes[3], A4 = h4.fw[0], B4 = h4.fw[1], L4 = Math.hypot(B4[0] - A4[0], B4[1] - A4[1]), ang4 = Math.atan2(B4[0] - A4[0], B4[1] - A4[1]);
    GOLF.life.push((t) => {
      const lanes = 6, period = L4 / 1.6, k = Math.floor(t / period) % lanes, u = (t % period) / period, dir = k % 2 ? -1 : 1, s = dir > 0 ? u : 1 - u;
      const off = (k / (lanes - 1) - 0.5) * (h4.fwr * 1.6), x = A4[0] + (B4[0] - A4[0]) * s + Math.cos(ang4) * off, z = A4[1] + (B4[1] - A4[1]) * s - Math.sin(ang4) * off;
      mower.position.set(x, LIFT.fairway, z); mower.rotation.y = ang4 + (dir > 0 ? 0 : Math.PI);
    });
  }
  // a few late-night golfers walking the cart path with their bags
  for (let i = 0; i < 3; i++) {
    const pts = pathPts.map(([x, z]) => [x + 0.5 * (i - 1), z]);
    const L = []; let tot = 0; for (let k = 0; k < pts.length - 1; k++) { const d = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); L.push([pts[k], pts[k + 1], tot, d]); tot += d; }
    WALKERS.push({ segs: L, L: tot, loop: false, speed: 0.9 + i * 0.15, s: (i * 37) % tot, dir: i % 2 ? -1 : 1, look: randomLook(rngFrom(1700 + i * 9)), ch: null, bag: true });
  }

  buildForest();
  if (GOLF.life) for (const f of GOLF.life) f(0);   // put the mower and the ducks where they belong before anyone looks
  // Pan the starter, at his podium by the first tee
  S.push(box(33.4, 34.2, 0, 1.05, -79.3, -78.7, [70, 50, 34], 0.04)); S.push(box(33.3, 34.3, 1.05, 1.12, -79.4, -78.6, [214, 206, 188], 0.03));
  lampPost(30.5, -80, 1, 0, 4.4);
}

// ---- what golf.js needs from the world: balls, the aiming marker, golfers standing at their ball, the camera
const golfBallMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x404040 });
const golfBalls = new Map();   // uid -> { mesh, ring }
const ringGeo = new THREE.RingGeometry(0.16, 0.24, 16);
function golfSetBalls(list) {
  const want = new Set((list || []).map((b) => b.uid));
  for (const [uid, b] of golfBalls) if (!want.has(uid)) { scene.remove(b.g); golfBalls.delete(uid); }
  for (const b of list || []) {
    let o = golfBalls.get(b.uid);
    if (!o) {
      const g = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), golfBallMat); g.add(mesh);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: b.color || 0xffc870, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; g.add(ring);
      scene.add(g); o = { g, mesh, ring }; golfBalls.set(b.uid, o); g.userData.anyZone = true;
    }
    o.mesh.position.set(0, (b.y || 0) + 0.075, 0); o.ring.position.y = -((b.y || 0)) + 0.05; o.ring.visible = !b.y || b.y < 0.05;
    o.g.position.set(b.x, golfLift(b.x, b.z), b.z); o.g.visible = b.visible !== false;
  }
}
const golfMarker = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 20), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
golfMarker.rotation.x = -Math.PI / 2; golfMarker.visible = false; golfMarker.userData.anyZone = true; scene.add(golfMarker);
const golfAimLine = new THREE.Mesh(toGeometry([box(-0.04, 0.04, 0, 0.01, 0, 1, [255, 214, 120], 0)]), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false }));
golfAimLine.visible = false; golfAimLine.userData.anyZone = true; scene.add(golfAimLine);
function golfAim(o) {
  if (!o) { golfMarker.visible = golfAimLine.visible = false; return; }
  golfMarker.visible = true; golfMarker.position.set(o.tx, golfLift(o.tx, o.tz) + 0.02, o.tz);
  const d = Math.hypot(o.tx - o.x, o.tz - o.z);
  golfAimLine.visible = true; golfAimLine.position.set(o.x, golfLift(o.x, o.z) + 0.02, o.z); golfAimLine.rotation.y = Math.atan2(o.tx - o.x, o.tz - o.z); golfAimLine.scale.set(1, 1, Math.max(0.5, d));
}
// golfers: the players in a round leave their seat and stand at their ball, club in hand
let golfers = {};
function golfSetPlayers(map) {
  const was = Object.keys(golfers).sort().join(','), now = Object.keys(map || {}).sort().join(',');
  golfers = map || {};
  // someone came off the course: put everybody back in their seats
  if (was !== now && was.split(',').some((u) => u && !(map || {})[u])) rebuild();
}
const clubParts = () => [cyl(V(0, 0, 0), V(0, -0.95, 0.02), 0.009, 0.007, [190, 190, 196], { n: 4 }), box(-0.02, 0.05, -1.0, -0.94, -0.02, 0.06, [60, 60, 66], 0.02), cyl(V(0, 0.02, 0), V(0, -0.2, 0.004), 0.016, 0.014, [20, 20, 22], { n: 5 })];
function golferOverride(ch, t) {
  const gp = ch.uid && golfers[ch.uid];
  if (!gp) { if (ch.golfClub) ch.golfClub.visible = false; return false; }
  // stand side-on to the line of play, the ball just ahead of the feet
  const h = gp.yaw, fx = -Math.cos(h), fz = Math.sin(h);
  ch.root.position.set(gp.x - fx * 0.62, golfLift(gp.x, gp.z), gp.z - fz * 0.62);
  ch.root.rotation.y = h - Math.PI / 2;
  if (!ch.golfClub && ch.bones && ch.bones.elR) { ch.golfClub = new THREE.Mesh(toGeometry(clubParts()), charMat); ch.golfClub.position.set(0, -0.3, 0.02); ch.bones.elR.add(ch.golfClub); }
  if (ch.golfClub) ch.golfClub.visible = true;
  const u = gp.swingAt ? (performance.now() - gp.swingAt) / 1000 : -1;
  golfPose(ch, u, t);
  return true;
}
// address, backswing, strike and follow-through, from the swing's start time
function golfPose(ch, u, t) {
  const b = ch.bones;
  b.spine.rotation.x = 0.42; b.head.rotation.x = 0.35;
  b.thL.rotation.x = b.thR.rotation.x = -0.12; b.knL.rotation.x = b.knR.rotation.x = 0.22; b.hips.position.y = 0.95 - 0.04;
  b.thL.rotation.z = 0.1; b.thR.rotation.z = -0.1;
  let sw = 0;   // how far the arms have turned round: 0 at address, + back over the right shoulder, - through to the left
  if (u >= 0 && u < 0.7) sw = 2.1 * Math.sin((u / 0.7) * Math.PI / 2);
  else if (u >= 0.7 && u < 0.85) sw = 2.1 - 4.3 * ((u - 0.7) / 0.15);
  else if (u >= 0.85 && u < 2.4) sw = -2.2;
  else sw = 0.04 * Math.sin(t * 1.3 + (ch.phase || 0) * 9);   // a small waggle while lining up
  b.shL.rotation.x = b.shR.rotation.x = -0.5 - Math.abs(sw) * 0.35;
  b.shL.rotation.z = 0.32 + sw * 0.55; b.shR.rotation.z = -0.32 + sw * 0.55;
  b.elL.rotation.x = b.elR.rotation.x = -0.15 - Math.max(0, Math.abs(sw) - 1) * 0.5;
  b.spine.rotation.y = sw * 0.35; b.head.rotation.y = -sw * 0.25;
}
let golfCamFollow = null;
function golfCam(o) {
  golfCamFollow = o && o.follow ? o : null;
  if (!o) return;
  follow = null; velYaw = velPitch = 0;
  const apply = () => Object.assign(camT, { free: false, tx: o.x, ty: o.ty || 0.9, tz: o.z, d: o.d || 6.5, yaw: o.yaw, pitch: o.pitch || 0.24 });
  if (o.cut) cutTo(apply); else apply();
}

ROOMS.base = { x0: BASE.x0, x1: BASE.x1, z0: BASE.z0, z1: BASE.z1, name: 'Basement' };
ROOMS.f2 = { x0: HF.x0, x1: HF.x1, z0: HF.z0, z1: HF.z1, name: 'Hotel corridor' };
for (const R of HOTEL_ROOMS) ROOMS['h' + R.i] = { x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1, name: 'Room ' + R.num };
addStatic(S);
addStatic(G, glowMat);
addStatic(GD, groundDecalMat);
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
jukeFace.position.set(JUKE.x, 0.8, JUKE.z - 0.52); jukeFace.rotation.y = Math.PI; scene.add(jukeFace);

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
doorSign('LOUNGE', 4.97, 0, -Math.PI / 2); doorSign('BAR', 5.03, 0, Math.PI / 2);
doorSign('DANCE', 13.97, 0, -Math.PI / 2); doorSign('LOUNGE', 14.03, 0, Math.PI / 2);
doorSign('BILLIARDS', -4.97, 1.5, Math.PI / 2); doorSign('BAR', -5.03, 1.5, -Math.PI / 2);
doorSign('CINEMA', -9.2, -3.97, 0); doorSign('BILLIARDS', -9.2, -4.03, Math.PI);
doorSign('CASINO ROYALE', -11.77, 2.9, Math.PI / 2); doorSign('BILLIARDS', -11.83, 2.9, -Math.PI / 2);
doorSign('MEN', 13.97, -8.9, -Math.PI / 2); doorSign('POOL', 14.05, -8.9, Math.PI / 2); doorSign('WOMEN', 13.97, -7.1, -Math.PI / 2); doorSign('POOL', 14.05, -7.1, Math.PI / 2);
SIGNS.push(...CARD_SIGNS);
doorSign('POOL', 9.5, -3.97, 0); doorSign('LOUNGE', 9.5, -4.03, Math.PI);
doorSign('VIP', -4.1, -3.97, 0); doorSign('BAR', -4.1, -4.03, Math.PI); doorSign('VIP', -4.1, -5.87, 0); doorSign('BAR', -4.1, -5.93, Math.PI);
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
const tvLight = new THREE.PointLight(0x9aa6ff, 0, 9, 1.4); tvLight.position.set(-11.4, TV.y, TV.z); scene.add(tvLight);
let tvOn = false, cssRenderer = null, cssScene = null, roomCss = null;
// the TV's glow follows the colours of what's playing (sampled from the video's thumbnail when the browser allows it)
let tvPalette = [new THREE.Color(0x9aa6ff), new THREE.Color(0xb0c0ff), new THREE.Color(0x8090e0), new THREE.Color(0xc0b0ff)], tvVid = '';
function setTvVideo(id) {
  if (!id || id === tvVid) return; tvVid = id;
  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = 4; c.height = 2; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 4, 2);
      const d = x.getImageData(0, 0, 4, 2).data, pal = [];
      for (let i = 0; i < 8; i++) { const col = new THREE.Color(d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255); const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.2 + 0.1), Math.max(0.45, hsl.l)); pal.push(col); }
      tvPalette = pal;
    } catch (e) { /* the thumbnail can't be read here; keep the default glow */ }
  };
  img.src = 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg';
}
// while the cinema TV is playing, the room's own lights go down so the screen lights the room
const cinemaLights = [];
const cinemaHook = () => {
  if (!cinemaLights.length) scene.traverse((o) => { if (o.isPointLight && o !== tvLight && inRoomXZ(o.position, ROOMS.tv)) { cinemaLights.push(o); o.userData.base = o.intensity; } });
  if (blackout) return;
  const k = tvOn && !pokerOn ? 0.2 : 1;
  for (const L of cinemaLights) L.intensity = L.userData.base * k;
};
const inRoomXZ = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1;
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
  const rel = document.getElementById('roomScreen');
  if (rel) { roomCss = new THREE.CSS3DObject(rel); rel.style.pointerEvents = 'none'; roomCss.rotation.y = -Math.PI / 2; roomCss.position.set(0, -50, 0); cssScene.add(roomCss); }
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
const HOST_LOOK = { jacket: 0, pants: 1, skin: 2, head: 7, hair: 1, beard: 4, eyes: 2, smoke: 2, dance: 3, spot: 1, body: 0, top: 2, bottom: 2, shoes: 2 };
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
[-9.55, -10.45].forEach((x, i) => addSpot('pool-stool-' + i, 3, 'sit', x, 3.035, 0, 'Sit at the self-serve bar', hitBox(x, 0.45, 3.035, 0.45, 0.9, 0.45)));
POOL_SOFA.forEach(([x, z, yaw], i) => addSpot('pool-sofa-' + i, 3, 'sitlow', x, z, yaw, 'Chill on the sofa', hitBox(x, 0.45, z, 0.6, 0.9, 0.6)));
[[-11.3, -1.0, Math.PI / 2], [-7.9, 3.0, Math.PI + 0.3], [-7.4, -2.6, -0.6], [-7.0, 2.4, Math.PI + 0.5]].forEach(([x, z, yaw], i) =>
  addSpot('pool-watch-' + i, 3, 'lean', x, z, yaw, 'Watch the game', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// card room: five seats at the table (the dealer has the sixth), and room to stand and watch
POKER_SEATS.forEach(([x, z, yaw], i) => addSpot('poker-seat-' + i, 10, 'poker', x, z, yaw, 'Sit in on poker', hitBox(x, 0.45, z, 0.55, 0.9, 0.55)));
[[-12.5, -3.2], [-16.3, 1.6], [-12.6, -1.9], [-16.2, -2.0]].forEach(([x, z], i) =>
  addSpot('card-watch-' + i, 10, 'lean', x, z, yawTo(x, z, PK.x, PK.z), 'Watch the game', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// restroom, split in two: the men's (cat 9) and the women's (cat 15); nobody chooses the stalls
addSpot('wcm-sink', 9, 'lean', 15.1, -8.5, 0, 'Wash your hands', hitBox(15.1, 0.9, -8.5, 0.45, 1.8, 0.45));
[[15.6, -9.3, Math.PI / 2], [16.3, -9.6, Math.PI / 2 - 0.4]].forEach(([x, z, yaw], i) => addSpot('wcm-wait-' + i, 9, 'lean', x, z, yaw, "Hang out in the men's room", hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
[[15.1, 'wcw-sink-0'], [16.1, 'wcw-sink-1']].forEach(([x, id]) => addSpot(id, 15, 'lean', x, -6.5, 0, 'Fix your hair in the mirror', hitBox(x, 0.9, -6.5, 0.45, 1.8, 0.45)));
addSpot('wcw-wait-0', 15, 'lean', 15.5, -7.4, Math.PI / 2, "Hang out in the women's room", hitBox(15.5, 0.9, -7.4, 0.45, 1.8, 0.45));
SPOT_BY_ID['wc-stall-m'] = { id: 'wc-stall-m', cat: 9, act: 'slump', x: 17.78, z: -9.79, yaw: -Math.PI / 2, label: '', hit: hitBox(0, -9, 0, 0, 0, 0) };
SPOT_BY_ID['wc-stall-w'] = { id: 'wc-stall-w', cat: 15, act: 'slump', x: 17.78, z: -6.21, yaw: -Math.PI / 2, label: '', hit: hitBox(0, -9, 0, 0, 0, 0) };
// VIP lounge: the host's armchair is his alone
VIP_CHAIRS.forEach(([x, z, yaw], i) => addSpot('vip-chair-' + i, 4, i === 0 ? 'lounge' : 'sitlow', x, z, yaw,
  i === 0 ? "The host's seat" : 'Sink into the sofa', hitBox(x, 0.45, z, 0.7, 0.9, 0.7), { hostOnly: i === 0 }));
[[-4.5, -9.8, Math.PI / 4], [1.5, -10.4, -Math.PI / 4], [-3.7, -4.75, Math.PI * 0.85], [1.4, -5.4, -Math.PI * 0.8]].forEach(([x, z, yaw], i) =>
  addSpot('vip-stand-' + i, 4, 'lean', x, z, yaw, 'Hang out in the lounge', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// pool lounge: wading in the water, daybeds, and standing room around the edge
// seats in the water: backs against the long sides of the pool, facing the middle
for (const [i, x] of [8.0, 9.0, 10.0, 11.0].entries()) {
  addSpot('swim-water-' + i + '0', 5, 'soak', x, SW.z0 + 0.24, 0, 'Get in the pool', hitBox(x, 0.1, SW.z0 + 0.45, 0.9, 0.4, 0.9), { y: -0.62 });
  addSpot('swim-water-' + i + '1', 5, 'soak', x, SW.z1 - 0.24, Math.PI, 'Get in the pool', hitBox(x, 0.1, SW.z1 - 0.45, 0.9, 0.4, 0.9), { y: -0.62 });
}
DAYBEDS.forEach(([x, z], i) => addSpot('swim-bed-' + i, 5, 'sitlow', x, z + 0.15, 0, 'Lie back on a daybed', hitBox(x, 0.45, z, 0.85, 0.9, 1.7)));
[[6.4, -8.0, Math.PI / 2], [12.6, -9.4, -Math.PI / 2], [6.6, -6.2, 2.2], [12.4, -6.2, -2.2], [8.0, -5.0, Math.PI], [11.0, -5.0, Math.PI]].forEach(([x, z, yaw], i) =>
  addSpot('swim-side-' + i, 5, 'lean', x, z, yaw, 'Hang out by the pool', hitBox(x, 0.9, z, 0.45, 1.8, 0.45)));
// the street: by the door, smoking by the windows, leaning on the parked SUVs
const standHit = (x, z) => hitBox(x, 0.9, z, 0.45, 1.8, 0.45);
[[-1.75, 4.45, 0.15], [1.75, 4.45, -0.15]].forEach(([x, z, yaw], i) => addSpot('street-door-' + i, 6, 'lean', x, z, yaw, 'Hang out by the door', standHit(x, z)));
[[-3.9, 4.4, 0.35], [3.9, 4.4, -0.35], [-7.8, 4.4, 0.2], [7.8, 4.4, -0.2]].forEach(([x, z, yaw], i) => addSpot('street-wall-' + i, 6, 'lean', x, z, yaw, 'Lean on the wall outside', standHit(x, z)));
PARKED.forEach((x, i) => addSpot('street-suv-' + i, 6, 'lean', x + 0.6, ST.curb0 - 0.32, Math.PI, 'Lean on the SUV', standHit(x + 0.6, ST.curb0 - 0.32)));
// the backstreet: by the cars in the lot, at the back door, on the crates
[-105, -75, -15, 45].forEach((d, i) => { const a = d * D2R, x = LOT.x + Math.sin(a) * (LOT.rb + 0.2), z = LOT.z - Math.cos(a) * (LOT.rb + 0.2); addSpot('alley-car-' + i, 7, 'lean', x, z, -a, 'Hang out by the cars', standHit(x, z)); });
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
// dance room: stools at the drinks ledge, the booth bench along the back
DANCE_STOOLS.forEach((x, i) => addSpot('dance-stool-' + i, 0, 'sit', x, 3.2, 0, 'Sit at the ledge', hitBox(x, 0.45, 3.2, 0.5, 0.9, 0.5)));
DANCE_BENCH.forEach((x, i) => addSpot('dance-bench-' + i, 0, 'sitlow', x, -3.62, 0, 'Sit on the bench', hitBox(x, 0.4, -3.62, 0.6, 0.8, 0.6)));
// the lounge: wingbacks round the tables, the chesterfield by the fire
LOUNGE_CLUB.forEach(([x, z, yaw, ti]) => { const id = 'lt' + ti + '-' + LOUNGE_TABLES[ti].seats.length; addSpot(id, 11, 'club', x, z, yaw, ti === 4 ? 'Sit by the fire' : 'Sit in the lounge', hitBox(x, 0.5, z, 0.7, 1.0, 0.7), { table: ti }); LOUNGE_TABLES[ti].seats.push(id); });
function overflowSpot(idx) {
  const a = idx * 2.4, rx = 3.0 + (idx % 3) * 0.4, rz = 2.9 + (idx % 2) * 0.4;
  const x = Math.min(21.2, DF.x + Math.cos(a) * rx), z = Math.max(-3.6, Math.min(3.6, DF.z + Math.sin(a) * rz));
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
  if (vic) { const ch = people.find((c) => c.uid && c.uid === vic.uid); if (ch) claim(ch, SPOT_BY_ID[ch.look && ch.look.body === 1 ? 'wc-stall-w' : 'wc-stall-m']); }
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

// players online from the phone version get a little phone next to their name
// on top of whatever they're doing (sitting, leaning...): both hands up holding the phone, head down, thumbs going
function phonePose(ch, t) {
  const b = ch.bones, ph = (ch.phase || 0) * 10, tap = Math.sin(t * 9 + ph) * 0.04, look = Math.max(0, Math.sin(t * 0.21 + ph)) > 0.92;
  b.shR.rotation.x = -0.45; b.shR.rotation.z = -0.1; b.shR.rotation.y = 0.8;
  b.elR.rotation.x = -1.5 + tap; b.elR.rotation.y = 0; b.elR.rotation.z = 0;
  b.shL.rotation.x = -0.45; b.shL.rotation.z = 0.1; b.shL.rotation.y = -0.8;
  b.elL.rotation.x = -1.55 - tap; b.elL.rotation.y = 0; b.elL.rotation.z = 0;
  // every so often they glance up from the screen
  b.head.rotation.x = look ? 0.05 : 0.5; b.head.rotation.y = 0;
}
function phoneTag(ch, on) {
  ch.onPhone = !!on;
  // and the character itself stands there looking down at a phone, its screen glowing
  if (on && !ch.phoneMesh && ch.bones && ch.bones.elR) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(toGeometry([box(-0.032, 0.032, -0.13, 0.0, -0.009, 0.009, [18, 18, 20], 0.02)]), charMat));
    g.add(new THREE.Mesh(toGeometry([box(-0.027, 0.027, -0.122, -0.008, 0.009, 0.012, [120, 190, 255], 0)]), glowMat));
    g.position.set(0.0, -0.27, 0.035); g.rotation.set(-0.35, 0, 0);
    ch.bones.elR.add(g); ch.phoneMesh = g;
  }
  if (ch.phoneMesh) ch.phoneMesh.visible = !!on;
  if (!ch.label) return;
  let ph = ch.label.querySelector('.ph');
  if (on && !ph) { ph = document.createElement('span'); ph.className = 'ph'; ph.title = 'On the phone'; ch.label.appendChild(ph); }
  else if (!on && ph) ph.remove();
}
function dropLabel(ch) { if (!ch) return; if (ch.label) { ch.label.remove(); ch.label = null; } if (ch.bubbleEl) { ch.bubbleEl.remove(); ch.bubbleEl = null; } }
function clearCrowd() { for (const ch of crowd) { scene.remove(ch.root); if (ch !== draftChar) dropLabel(ch); } crowd.length = 0; }
function addChar(look, name, opts) {
  opts = opts || {};
  const seed = hashStr(name || opts.seedName || 'npc');
  const ch = makeCharacter(look, name, seed);
  ch.phase = (seed % 1000) / 1000;
  ch.host = !!opts.host; ch.npc = !!opts.npc; ch.npcKey = opts.seedName || ''; ch.mine = !!opts.mine; ch.uid = opts.uid || null;
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
  dj.act = 'dj'; dj.root.position.set(22.85, 0.16, 0); dj.root.rotation.y = -Math.PI / 2;
  rebuildHooks();
  // the host, in his armchair in the VIP lounge
  const hostEntry = roster.find((e) => e.name.toLowerCase() === HOST_NAME.toLowerCase());
  const host = addChar(hostLookFrom(hostEntry && hostEntry.code), HOST_NAME, { host: true });
  const seen = new Set([HOST_NAME.toLowerCase()]);
  let haveMine = false;
  for (const e of roster.slice(-80)) {
    const key = e.name.toLowerCase();
    if (key === HOST_NAME.toLowerCase()) { host.uid = e.uid; wantFrom(host, e); phoneTag(host, e.m); if (myUid && e.uid === myUid) { host.mine = true; haveMine = true; } continue; }
    if (seen.has(key)) continue; seen.add(key);
    const mine = myUid ? e.uid === myUid : !!(myEntry && myEntry.name.toLowerCase() === key);
    if (mine) haveMine = true;
    const ch = addChar(withSmoke(codeToLook(e.code), e), e.name, { mine, uid: e.uid });
    phoneTag(ch, e.m);
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
    swapOutfit(ch, sp && (sp.cat === 5 || sp.cat === 8) ? 'swim' : tuxFor(ch));
    setGoldGlow(ch, (ch.outfit || '').startsWith('tux-') ? ch.outfit.slice(4) : '');
    dressExtras(ch);
    setGlass(ch, ch.act === 'pool' || ch.onPhone ? null : ch.drink || (ch.act === 'club' ? (ch.phase > 0.5 ? 'whiskey' : 'martini') : null));
    const pd = lastDrinks.get(key);
    if (ch.drink && pd !== undefined && pd !== ch.drink) bartenderSays(ch.drink, ch.name);
    lastDrinks.set(key, ch.drink || '');
  }
  if (keepDraft) { scene.add(keepDraft.root); crowd.push(keepDraft); }
  updateRosterUI();
  applyRanks();
}

// ---------------------------------------------------------------- music (original tracks, Web Audio)
// Original tracks for a late-night hotel bar. Two jazz pieces open the night; the jukebox rotates the jazz
// every 48 bars unless a visitor picks something else.
const TRACKS = [
  { name: 'Smoke & Brass', gain: 4, bpm: 116, swing: 0, swing8: 0.33, prog: [[36, 51, 55, 58, 62], [41, 51, 57, 62, 67], [46, 50, 53, 57, 60], [43, 53, 56, 59, 62]] }, // Cm9 F13 Bbmaj9 G7b9 — swing trio + vibes
  { name: 'Blue Hour', gain: 7, bpm: 68, swing: 0, swing8: 0.33, prog: [[39, 55, 58, 62, 65], [36, 51, 55, 58, 62], [41, 56, 60, 63, 67], [46, 56, 62, 67, 60]] },  // Ebmaj9 Cm9 Fm9 Bb13 — brushed ballad
  { name: 'Velvet Rope', bpm: 112, swing: 0, prog: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]] },          // Am Am F G — dark electro
  { name: 'Last Round', gain: 1.5, bpm: 86, swing: 0, swing8: 0.33, prog: [[38, 41, 45, 48, 52], [43, 47, 50, 53, 57], [36, 40, 43, 47, 50], [45, 49, 52, 55, 58]] }, // Dm9 G13 Cmaj9 A7 — noir lounge
  { name: 'Midnight Ledger', bpm: 118, swing: 0, prog: [[40, 43, 47], [36, 40, 43], [43, 47, 50], [42, 45, 49]] },    // Em C G F#dim — darkwave
  { name: 'Quiet Contract', bpm: 128, swing: 0, prog: [[38, 41, 45], [38, 41, 45], [38, 41, 45], [36, 39, 43]] }      // Dm Dm Dm Cm — industrial techno
];
const JAZZ_TRACKS = [0, 1, 3];
const rnd = (k) => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
let trackIdx = 0, pinnedTrack = false, pendingTrack = -1;
// the dance room plays the bar's original electronic set, only while you're in there; everywhere else the shared jukebox
const DANCE_TRACKS = [2, 4, 5];
let sharedTrack = 0, danceHere = false, danceSel = 0;
let SPB = 60 / TRACKS[0].bpm;
let actx = null, master = null, bus = null, muted = false, nextStep = 0, stepIdx = 0, schedTimer = null, ducked = false;
let beatBase = 0, beatT0 = 0;
const MASTER_VOL = 0.36;
// the volume knob in the top bar (0..1) scales the jukebox, the TVs, the DJ and the jazz
const userVol = () => { const v = window.SH_VOL; return typeof v === 'number' && v >= 0 ? v : 1; };
const masterLevel = () => Math.max(0.0001, MASTER_VOL * userVol());
window.addEventListener('shvol', () => { if (master && actx && !ducked) master.gain.setTargetAtTime(masterLevel(), actx.currentTime, 0.1); if (SFX.gain) SFX.gain.gain.value = 0.35 * userVol(); });
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let noiseBuf = null;
function startAudio() {
  if (actx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = ducked ? 0.0001 : masterLevel();
  // each track has its own level: the soft jazz is mixed up to sit at a steady, gentle volume
  bus = actx.createGain(); bus.gain.value = TRACKS[trackIdx].gain || 1; bus.connect(master);
  // a gentle low-pass and a soft compressor keep it warm in the background instead of punchy
  const soft = actx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 6500; soft.Q.value = 0.5;
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  master.connect(soft); soft.connect(comp); comp.connect(actx.destination);
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
  env(g, t, 0.003, peak || 0.9, low ? 0.22 : 0.28); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.35);
}
function noise(t, freq, q, peak, dcy, type) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq; f.Q.value = q;
  const g = actx.createGain(); env(g, t, 0.002, peak, dcy);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.3); s.stop(t + dcy + 0.05);
}
function tone(t, midi, dur, type, peak, cutoff, detune, attack) {
  const o = actx.createOscillator(); o.type = type; o.frequency.value = mtof(midi); if (detune) o.detune.value = detune;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = 4;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const STEPS = [
  // Smoke & Brass: a swinging piano trio with vibes — ride cymbal, hi-hat on 2 and 4, walking bass, Charleston comping
  function (t, s, bar, ch, sec, st) {
    const tr = TRACKS[trackIdx], next = tr.prog[(bar + 1) % 4];
    if (s === 0 || s === 4 || s === 6 || s === 8 || s === 12 || s === 14) noise(t, 6500, 0.7, s % 4 === 2 ? 0.016 : 0.028, 0.45);
    if (s === 4 || s === 12) noise(t, 3500, 3, 0.02, 0.035, 'bandpass');
    if (s % 4 === 0) noise(t, 2400, 0.4, 0.008, SPB * 0.9, 'bandpass');
    if (s === 0 || s === 8) kick(t, 0.1, true);
    if (s % 2 === 0 && s && rnd(bar * 16 + s) < 0.1) noise(t, 1800, 0.7, 0.026, 0.12, 'bandpass');
    if (s % 4 === 0 && (sec > 0 || s % 8 === 0)) {
      const r = ch[0], walk = sec > 0 ? [r, r + ((ch[1] - r) % 12), r + 7, next[0] + (bar % 2 ? -1 : 1)][s / 4] : [r, r + 7][s / 8];
      tone(t, walk, SPB * (sec > 0 ? 0.85 : 1.8), 'triangle', 0.2, 600, 0, 0.008);
      tone(t, walk, SPB * (sec > 0 ? 0.8 : 1.7), 'sine', 0.1, 400, 0, 0.008);
    }
    const comp = [[0, 6], [6, 14], [4, 10], [0, 10]][bar % 4];
    if (comp.includes(s)) for (const n of ch.slice(1)) { tone(t, n, SPB * (s === 0 ? 1.4 : 0.7), 'triangle', 0.024, 1600, 0, 0.004); tone(t, n + 12, SPB * 0.5, 'sine', 0.008, 3000, 2, 0.004); }
    if (sec >= 1 && s % 2 === 0 && !(bar % 4 === 3 && s >= 8) && rnd(bar * 31 + s) < (sec === 3 ? 0.25 : 0.42)) {
      const n = ch[1 + Math.floor(rnd(bar * 7 + s * 3) * 4)] + 12;
      tone(t, n, st * 5, 'sine', 0.04, 4000, 0, 0.003); tone(t, n + 12, st * 2, 'sine', 0.008, 5000, 0, 0.003);
    }
  },
  // Blue Hour: a slow brushed ballad — two-feel bass, rolled piano chords, a soft muted horn line
  function (t, s, bar, ch, sec, st) {
    const tr = TRACKS[trackIdx], next = tr.prog[(bar + 1) % 4];
    if (s % 4 === 0) noise(t, 2200, 0.35, 0.01, SPB * 1.1, 'bandpass');
    if (s === 4 || s === 12) noise(t, 3200, 3, 0.014, 0.04, 'bandpass');
    if (s === 0 || s === 8) noise(t, 6800, 0.7, 0.014, 0.6);
    if (s === 0) kick(t, 0.08, true);
    if (s === 0 || s === 8 || (s === 12 && bar % 2)) {
      const r = ch[0], n = s === 0 ? r : s === 8 ? r + 7 : next[0] - 1;
      tone(t, n, SPB * (s === 12 ? 0.9 : 1.8), 'triangle', 0.2, 550, 0, 0.012); tone(t, n, SPB * 1.6, 'sine', 0.1, 350, 0, 0.012);
    }
    if (s === 0) ch.slice(1).forEach((n, k) => tone(t + k * 0.035, n, SPB * 3.2, 'triangle', 0.022, 1500, 0, 0.006));
    if (s === 10 && bar % 2 === 0) for (const n of ch.slice(1, 4)) tone(t, n, SPB * 0.8, 'triangle', 0.014, 1400, 0, 0.006);
    if (sec >= 1 && (s % 4 === 0 || s === 6) && !(bar % 4 === 3 && s >= 8) && rnd(bar * 17 + s) < 0.5) {
      const n = ch[1 + Math.floor(rnd(bar * 5 + s) * 4)] + 12;
      tone(t, n, SPB * 1.8, 'triangle', 0.035, 1300, 0, 0.05); tone(t, n, SPB * 1.6, 'sine', 0.02, 900, 4, 0.06);
    }
  },
  // Velvet Rope: dark electro, gritty pulsing bass, metallic hats, sparse minor stabs
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0 && !(sec === 0 && bar % 8 < 2)) kick(t, 0.95);
    if (s === 4 || s === 12) { noise(t, 1500, 0.9, 0.24, 0.16, 'bandpass'); noise(t, 5000, 0.6, 0.06, 0.08); }
    if (s % 2 === 1) noise(t, 9500, 1.2, s % 4 === 3 ? 0.07 : 0.035, 0.03);
    if (s % 2 === 1 || s === 0) tone(t, ch[0] - 24, st * 0.95, 'sawtooth', 0.2, 260 + 400 * ((s % 8) / 8), 0);
    if (s % 2 === 1) tone(t, ch[0] - 12, st * 0.6, 'square', 0.05, 900, 0);
    if (sec >= 2 && s % 4 === 2) tone(t, ch[(s / 2 + bar) % 3] + 24, st * 1.2, 'square', 0.03, 2600, 0);
  },
  // Last Round: noir lounge, brushed snare, ride cymbal, walking bass, soft electric piano
  function (t, s, bar, ch, sec, st) {
    const tr = TRACKS[trackIdx], next = tr.prog[(bar + 1) % 4];
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
  // Midnight Ledger: darkwave, gated snare, galloping bass
  function (t, s, bar, ch, sec, st) {
    if (s % 4 === 0) kick(t, 0.85);
    if (s === 4 || s === 12) { noise(t, 1200, 0.7, 0.26, 0.22, 'bandpass'); noise(t, 6000, 0.5, 0.05, 0.18); }
    if (s % 4 === 2) noise(t, 8000, 0.8, 0.07, 0.04);
    if (s % 4 !== 1) tone(t, ch[0] - 12 + (s % 4 === 3 ? 7 : 0), st * 0.9, 'sawtooth', 0.15, 420 + 220 * Math.sin(bar * 0.7), 0);
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
  if (bus) bus.gain.setValueAtTime(TRACKS[i].gain || 1, t);
  stepIdx = 0; updateTrackUI();
}
function schedule() {
  while (nextStep < actx.currentTime + 0.12) {
    if (stepIdx % 16 === 0) {
      if (pendingTrack >= 0) { setTrackNow(pendingTrack, nextStep); pendingTrack = -1; }
      else if (danceHere && stepIdx > 0 && stepIdx % (16 * 48) === 0) { danceSel = (danceSel + 1) % DANCE_TRACKS.length; setTrackNow(DANCE_TRACKS[danceSel], nextStep); }
      else if (!pinnedTrack && !extJazz && stepIdx > 0 && stepIdx % (16 * 48) === 0) { const j = JAZZ_TRACKS.indexOf(trackIdx); setTrackNow(j >= 0 ? JAZZ_TRACKS[(j + 1) % JAZZ_TRACKS.length] : (trackIdx + 1) % TRACKS.length, nextStep); }
    }
    const tr = TRACKS[trackIdx], st = SPB / 4;
    const s = stepIdx % 16, bar = Math.floor(stepIdx / 16), ch = tr.prog[bar % 4], sec = Math.floor(bar / 8) % 4;
    const t = nextStep + (s % 2 === 1 ? tr.swing * st : 0) + (tr.swing8 && s % 4 === 2 ? tr.swing8 * st * 2 : 0);
    if (!ducked && !(extJazz && JAZZ_TRACKS.includes(trackIdx))) STEPS[trackIdx](t, s, bar, ch, sec, st);
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
const duckers = {};
let extJazz = false;
function duck(key, on) {
  duckers[key] = !!on;
  const d = Object.keys(duckers).some((k) => duckers[k]);
  if (d === ducked) return;
  ducked = d;
  if (master) master.gain.setTargetAtTime(ducked ? 0.0001 : masterLevel(), actx.currentTime, 0.4);
  updateTrackUI();
}
function setDucked(on) { duck('tv', on); }
function updateTrackUI() {
  const el = document.getElementById('track');
  if (el) el.textContent = ducked ? 'Jukebox: paused' : 'Jukebox: ' + (extJazz && JAZZ_TRACKS.includes(trackIdx) ? 'House jazz' : TRACKS[trackIdx].name);
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
  dance: { tx: 18.6, ty: 1.0, tz: 0, d: 7, yaw: -1.25, pitch: 0.45 },
  lounge: { tx: 9.5, ty: 0.9, tz: 1.2, d: 6.5, yaw: Math.PI - 0.55, pitch: 0.42 },
  tv: { tx: -10.5, ty: 1.4, tz: -7.5, d: 6, yaw: Math.PI / 2, pitch: 0.16 },
  pool: { tx: -8.9, ty: 0.9, tz: 0.0, d: 7, yaw: 0.85, pitch: 0.6 },
  card: { tx: -14.4, ty: 0.9, tz: 0.0, d: 6, yaw: -1.25, pitch: 0.5 },
  viptv: { tx: VTV.x, ty: 1.5, tz: VTV.z - 1.6, d: 4, yaw: Math.PI, pitch: 0.08 },
  sec: { tx: -16.0, ty: 1.3, tz: -7.6, d: 4.6, yaw: 0.8, pitch: 0.35 },
  wc: { tx: 15.6, ty: 0, tz: -8.0, d: 10, yaw: -0.55, pitch: 1.0, free: true },
  wcM: { tx: 15.8, ty: 0, tz: -9.2, d: 8, yaw: -0.55, pitch: 1.0, free: true },
  wcW: { tx: 15.8, ty: 0, tz: -6.8, d: 8, yaw: -0.55, pitch: 1.0, free: true },
  vip: { tx: -1.3, ty: 1.0, tz: -8.9, d: 5.5, yaw: 0.2, pitch: 0.3 },
  swim: { tx: 9.5, ty: 0.7, tz: -8.0, d: 6.5, yaw: 0.0, pitch: 0.55 },
  change: { tx: 3.5, ty: 1.0, tz: -8.2, d: 5, yaw: 0.0, pitch: 0.5 },
  street: { tx: 0, ty: 1.6, tz: 6.2, d: 9, yaw: 0.0, pitch: 0.22 },
  alley: { tx: 2.0, ty: 0.9, tz: -21.5, d: 12, yaw: -0.25, pitch: 0.5 },
  drive: { tx: 20.5, ty: 1.0, tz: -22.5, d: 11, yaw: 1.25, pitch: 0.32 },
  carpark: { tx: -40, ty: 1.0, tz: -30, d: 14, yaw: 0.75, pitch: 0.38 },
  backalley: { tx: -82, ty: 1.4, tz: -52, d: 9, yaw: 2.6, pitch: 0.18 },
  golf: { tx: 37, ty: 1.2, tz: -90, d: 13, yaw: 0.35, pitch: 0.3 },
  map: { tx: -4, ty: 0, tz: -60, d: 75, yaw: 0, pitch: 1.3, free: true }
};
VIEWS.basement = { tx: 100, ty: 0.9, tz: 0, d: 6.5, yaw: 0.7, pitch: 0.6 };
VIEWS.f2 = { tx: 208.5, ty: 0, tz: 0, d: 13, yaw: 0, pitch: 1.05, free: true };
for (const R of HOTEL_ROOMS) VIEWS['room' + R.i] = { tx: R.x0 + 2.5, ty: 0.9, tz: R.side * 4.1, d: 6, yaw: R.side > 0 ? Math.PI - 0.6 : -0.6, pitch: 0.6 };
for (const k in VIEWS) VIEWS[k].free = !!VIEWS[k].free;
let cam = Object.assign({}, VIEWS.bar), camT = Object.assign({}, VIEWS.bar), follow = null;
let camDist = cam.d, velYaw = 0, velPitch = 0, lastMoveT = 0, idleT = 0;
let isMod = false, vipMember = false;
const vipOk = () => isMod || vipMember;
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
const floor2Ok = () => isHostEntry() || !!(window.BAR_CONFIG && window.BAR_CONFIG.hotelOpen);
const roomOk = (i) => isHostEntry() || !!(window.HOTEL && window.HOTEL.ownerOf(i) === myUid && myUid);
function setView(name) {
  if ((name === 'vip' || name === 'viptv') && !vipOk()) return;
  if ((name === 'f2' || /^room\d$/.test(name)) && !floor2Ok()) { toast('The second floor is under construction. Come back soon.'); return; }
  if (/^room\d$/.test(name) && !roomOk(+name.slice(4))) { toast(window.HOTEL && window.HOTEL.ownerOf(+name.slice(4)) ? "That room's taken. The door's locked." : 'That room is free. Ask Charon at the bar to rent it.'); return; }
  if (name === 'card' && !cardOpen && !isMod) { toast('Casino Royale is closed. Poker nights only happen when sh1den is in.'); return; }
  follow = null; velYaw = velPitch = 0;
  cutTo(() => Object.assign(camT, VIEWS[name]));
}
function inVip(ch) { return roomAt(ch.root.position.x, ch.root.position.z) === ROOMS.vip; }
function focusChar(ch) {
  if (inVip(ch) && !vipOk() && !ch.mine) return;
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
  if (drag && drag.mid) canvas.style.cursor = 'var(--cur, default)';
  drag = null;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
const maxD = () => (camT.free ? 75 : 14);
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
const BIRD = { pitch: 1.3, d: 14, x0: -86, x1: 84, z0: -236, z1: 17 };
// which floor the camera is on: the bar, the basement or the hotel, each with its own bounds for free looking
const zoneOf = zoneAtX;
// ---------------------------------------------------------------- only draw the floor you're on
// every static thing gets tagged with its floor once; the other floors switch off, anything past the fog is skipped,
// and only the nearest few lights stay on (a fixed number, so phones never recompile shaders as you move around)
// phones and tablets always get the gentle settings, even when they open the full bar (add ?lite to try them on a computer)
const LITE = /[?&]lite\b/.test(location.search) || /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const LIGHT_BUDGET = LITE ? 6 : 12;
let cullZone = null, cullTagged = false, lightTimer = 0;
const _bb = new THREE.Box3();
function tagZones() {
  for (const o of scene.children) {
    if (o.userData.zone || o.isLight || o.userData.anyZone) continue;
    if (crowd.some((c) => c.root === o)) continue;
    _bb.setFromObject(o);
    if (_bb.isEmpty()) continue;
    const a = zoneAtX(_bb.min.x), b = zoneAtX(_bb.max.x);
    o.userData.zone = a === b ? a : 'any';
    o.userData.cx = (_bb.min.x + _bb.max.x) / 2; o.userData.cz = (_bb.min.z + _bb.max.z) / 2;
    o.userData.rad = Math.hypot(_bb.max.x - _bb.min.x, _bb.max.z - _bb.min.z) / 2;
  }
  cullTagged = true;
}
const fogCut = () => (scene.fog ? scene.fog.far + 3 : 999);
function applyZone(z) {
  cullZone = z;
  for (const o of scene.children) {
    const t = o.userData.zone; if (!t || t === 'any' || o.isLight) continue;
    o.visible = t === z && (o.userData.cx === undefined || Math.hypot(o.userData.cx - camera.position.x, o.userData.cz - camera.position.z) - o.userData.rad < fogCut());
  }
}
function pickLights(z) {
  const cand = [];
  for (const o of scene.children) {
    if (!o.isPointLight && !o.isSpotLight) continue;
    if (o.userData.always) { o.visible = true; continue; }
    if (zoneAtX(o.position.x) !== z) { o.visible = false; continue; }
    const d = Math.hypot(o.position.x - cam.tx, o.position.z - cam.tz) - (o.distance || 10) * 0.5 + (o.intensity > 0.05 ? 0 : 50);
    cand.push([d, o]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  cand.forEach(([, o], i) => { o.visible = i < LIGHT_BUDGET; });
}
function zoneCullHook(dt) {
  if (!cullTagged) tagZones();
  const z = zoneOf(cam.tx);
  if (z !== cullZone) { tagZones(); applyZone(z); lightTimer = 0; }
  lightTimer -= dt;
  if (lightTimer <= 0) { lightTimer = 0.25; pickLights(z); applyZone(z); }
}
function zoneBounds() {
  const z = zoneOf(camT.tx);
  return z === 'f2' ? { x0: 196.5, x1: 220.5, z0: -6.5, z1: 6.5 } : z === 'base' ? { x0: 97, x1: 103, z0: -2.6, z1: 2.6 } : BIRD;
}
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
    const Z = zoneBounds();
    camT.tx = Math.max(Z.x0, Math.min(Z.x1, camT.tx + (fx * mz + rx * mx) / len * speed * dt));
    camT.tz = Math.max(Z.z0, Math.min(Z.z1, camT.tz + (fz * mz + rz * mx) / len * speed * dt));
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
      // tags only for people in the room you're looking at (walls don't hide HTML tags, so others would show through)
      if (here && r !== here) show = false;
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
  scene.fog.near = camDist > 12 ? Math.max(30, camDist * 0.6) : outside ? 12 : 7; scene.fog.far = camDist > 12 ? Math.max(70, camDist * 2.2) : outside ? 42 : 17;
  if (roomAt(cam.tx, cam.tz) === ROOMS.golf || golfCamFollow) { scene.fog.near = Math.max(scene.fog.near, 28); scene.fog.far = Math.max(scene.fog.far, 125); }   // you need to see the flag
  // the outside walls only show from street level outside the building
  const cx = camera.position.x, cz = camera.position.z;
  const inBuilding = (cx > -17 && cx < 14 && cz < 4 && cz > (cx > 5 ? -12 : -11)) || (cx >= 14 && cx < 23 && cz < 4 && cz > -4);
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
  { id: 'jukebox', label: 'Change the music', hit: hitBox(JUKE.x, 0.75, JUKE.z - 0.3, 0.9, 1.5, 0.6), cat: 3, floor: [JUKE.x, JUKE.z - 0.85], size: 0.45 },
  { id: 'djbooth', label: 'Talk to the DJ', hit: hitBox(22.25, 0.75, 0, 0.8, 1.2, 2.7), cat: 0, floor: [21.4, 0], size: 0.6 },
  { id: 'viptv', label: 'Watch the VIP TV', hit: hitBox(VTV.x, VTV.y, VTV.z - 0.1, VTV.w + 0.2, VTV.h + 0.3, 0.3), cat: 4, floor: [VTV.x, VTV.z - 0.7], size: 0.7 },
  { id: 'tv', label: 'Watch the TV', hit: hitBox(-12.9, 1.75, TV.z, 0.3, 2.1, 3.7), cat: 2, floor: [-12.3, TV.z], size: 0.7 },
  { id: 'humidor', label: 'Take a cigar (30 min)', hit: hitBox(1.0, 1.0, -4.26, 1.1, 1.96, 0.5), cat: 4, floor: [1.0, -4.85], size: 0.6 },
  { id: 'minibar', label: 'Pour yourself a drink', hit: hitBox(-10.0, 1.2, 3.75, 2.0, 2.4, 0.55), cat: 3, floor: [-10.0, 3.2], size: 0.8 },
  { id: 'wcdoor-m', label: "Men's room", hit: hitBox(13.9, 1.2, -8.9, 0.4, 2.4, 1.0), cat: 5, floor: [13.5, -8.9], size: 0.45 },
  { id: 'wcdoor-w', label: "Women's room", hit: hitBox(13.9, 1.2, -7.1, 0.4, 2.4, 1.0), cat: 5, floor: [13.5, -7.1], size: 0.45 },
  { id: 'carddoor', label: 'Casino Royale', hit: hitBox(-11.8, 1.2, 2.9, 0.3, 2.4, 1.4), cat: 3, floor: [-11.4, 2.9], size: 0.5 },
  { id: 'plaque', label: 'Coin leaderboard', hit: hitBox(-4.85, 1.7, -1.6, 0.3, 1.5, 1.2), cat: 1, floor: [-4.4, -1.6], size: 0.5 },
  { id: 'slots', label: 'Play the slot machines', hit: hitBox(-11.0, 0.9, -3.65, 1.7, 1.8, 0.7), cat: 3, floor: [-11.0, -3.05], size: 0.7 },
  { id: 'beggar', label: 'The old man with a cup', hit: hitBox(-13.1, 0.5, -34.3, 0.9, 1.0, 0.9), cat: 7, floor: [-12.6, -33.8], size: 0.5 },
  { id: 'bouncer-front', label: 'Talk to Cerberus', hit: hitBox(-1.2, 1.0, 5.15, 0.75, 2.0, 0.75), cat: 6, floor: [-1.0, 5.7], size: 0.45 },
  { id: 'bouncer-back', label: 'Talk to Plutus', hit: hitBox(-2.6, 1.0, -11.8, 0.75, 2.0, 0.75), cat: 7, floor: [-2.5, -12.4], size: 0.45 },
  { id: 'coin', label: 'Pick up the gold coin', hit: hitBox(0, -50, 0, 0.6, 0.6, 0.6), cat: 1, floor: [0, -50], size: 0.35 },
  { id: 'dealer', label: 'The card table', hit: hitBox(DEALER.x, 1.0, DEALER.z, 0.7, 2.0, 0.7), cat: 10, floor: [DEALER.x, DEALER.z], size: 0.45 },
  { id: 'pooltable', label: 'Play pool', hit: hitBox(PT.x, 0.45, PT.z, PT.l, 0.9, PT.w), cat: 3, floor: [PT.x, PT.z], size: 1.2 }
];
// the basement
addSpot('base-chair', 12, 'sitlow', 100, 0.3, Math.PI, 'Sit in the chair…', hitBox(100, 0.5, 0.3, 0.6, 1.0, 0.6));
addSpot('base-lean-0', 12, 'lean', 101.2, -1.7, Math.PI / 4, 'Stand at the foot of the stairs', standHit(101.2, -1.7));
addSpot('base-lean-1', 12, 'lean', 97.7, -0.4, -Math.PI / 2, 'Look over the tools', standHit(97.7, -0.4));
addSpot('base-lean-2', 12, 'lean', 99.4, 2.5, Math.PI, 'Lean on the wall', standHit(99.4, 2.5));
addSpot('base-crate', 12, 'sitlow', 102.7, 1.65, -Math.PI / 2, 'Sit on a crate', hitBox(102.7, 0.4, 1.65, 0.6, 0.8, 0.6), { y: 0.05 });
// the hotel corridor and the rooms (a room's seats are only for whoever has the room)
[[203, -0.8, 0], [210.5, 0.8, Math.PI], [216, -0.8, 0]].forEach(([x, z, yaw], i) => addSpot('f2-lean-' + i, 13, 'lean', x, z, yaw, 'Wait in the corridor', standHit(x, z)));
for (const R of HOTEL_ROOMS) {
  const c = 20 + R.i, z = (w) => R.side * (1.2 + w);
  [2.7, 3.3].forEach((w, k) => addSpot('h' + R.i + '-sofa-' + k, c, 'sitlow', R.x0 + 0.55, z(w), Math.PI / 2, 'Watch your TV', hitBox(R.x0 + 0.55, 0.45, z(w), 0.6, 0.9, 0.6), { room: R.i }));
  addSpot('h' + R.i + '-bed', c, 'lounge', R.x0 + 1.5, z(5.15), R.side > 0 ? Math.PI : 0, 'Lie back on the bed', hitBox(R.x0 + 1.5, 0.6, z(4.6), 1.6, 0.6, 1.8), { room: R.i, y: 0.16 });
  OBJECTS.push({ id: 'door-' + R.i, label: 'Room ' + R.num, hit: hitBox(R.door, 1.1, R.side * 1.15, 1.0, 2.2, 0.25), cat: 13, floor: [R.door, R.side * 0.75], size: 0.5 });
  OBJECTS.push({ id: 'roomexit-' + R.i, label: 'Back to the corridor', hit: hitBox(R.door, 1.1, R.side * 1.25, 1.0, 2.2, 0.2), cat: c, floor: [R.door, R.side * 1.7], size: 0.5 });
  OBJECTS.push({ id: 'roomtv-' + R.i, label: 'Put a video on your TV', hit: hitBox(R.tv.x - 0.05, R.tv.y, R.tv.z, 0.15, R.tv.h + 0.2, R.tv.w + 0.2), cat: c, floor: [R.tv.x - 0.6, R.tv.z], size: 0.6 });
}
OBJECTS.push({ id: 'trapdoor', label: 'A trapdoor…', hit: hitBox(TRAP.x, 0.05, TRAP.z, 0.8, 0.12, 0.56), cat: 1, floor: [TRAP.x, TRAP.z], size: 0.45 });
OBJECTS.push({ id: 'stairs2', label: 'Upstairs: the hotel', hit: hitBox(STAIR2.x, 1.2, STAIR2.z, 1.6, 2.4, 1.6), cat: 1, floor: [STAIR2.x, STAIR2.z + 0.9], size: 0.7 });
OBJECTS.push({ id: 'stairsdown', label: 'Back downstairs to the bar', hit: hitBox(197.4, 0.5, 0, 1.8, 1.0, 1.8), cat: 13, floor: [197.4, 0], size: 0.8 });
OBJECTS.push({ id: 'baseup', label: 'Climb back up', hit: hitBox(102.0, 1.2, -2.55, 3.0, 2.4, 0.9), cat: 12, floor: [101.0, -2.0], size: 0.6 });
OBJECTS.push({ id: 'dj', label: 'Talk to the DJ', hit: hitBox(22.85, 1.1, 0, 0.6, 1.9, 0.7), cat: 0, floor: [21.6, 0], size: 0.5 });
const CAT_ROOM = { 15: ROOMS.wcW, 11: ROOMS.lounge, 12: ROOMS.base, 13: ROOMS.f2, 0: ROOMS.dance, 1: ROOMS.bar, 2: ROOMS.tv, 3: ROOMS.pool, 4: ROOMS.vip, 5: ROOMS.swim, 6: ROOMS.street, 7: ROOMS.alley, 8: ROOMS.change, 9: ROOMS.wcM, 10: ROOMS.card };
for (const R of HOTEL_ROOMS) CAT_ROOM[20 + R.i] = ROOMS['h' + R.i];
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
  if (tg.kind === 'npc') return { ok: true, text: npcName(tg) };
  if (!hasCharacter()) return { ok: true, text: 'Create a character to hang out here', needChar: true };
  if (tg.kind === 'object') {
    if (tg.o.id === 'bartender') {
      const me = myChar();
      return { ok: true, text: me && me.glassId ? 'Order another drink' : 'Order a drink' };
    }
    if (tg.o.id === 'carddoor' && !cardOpen) return { ok: isMod, text: isMod ? 'Casino Royale (closed, host tools)' : 'Closed · private game tonight' };
    return { ok: true, text: tg.o.label };
  }
  const s = tg.s, owner = spotOwner.get(s.id);
  if (owner && owner.mine) return { ok: false, text: "You're here" };
  if (s.hostOnly) return { ok: !!(myChar() && myChar().host) && !owner, text: owner ? (owner.name || 'Taken') + "'s spot" : (s.lockText || "The host's chair") };
  if (s.cat === 4 && !vipOk()) return { ok: false, text: 'VIP only: spend 1,000 coins to get in' };
  if (s.cat === 10 && !cardOpen && !(myChar() && myChar().host)) return { ok: false, text: 'Closed · private game' };
  if (owner && owner.uid && !owner.npc) return { ok: true, text: owner.name + ' · options', player: owner };
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
    if (!vipOk() && room === ROOMS.vip && !(tg.kind === 'spot' && tg.s.hostOnly && myChar() && myChar().host)) continue;
    if (raycaster.ray.intersectBox(tg.box, hitPoint)) {
      const d = hitPoint.distanceTo(raycaster.ray.origin);
      if (d < bestD) { bestD = d; best = tg; }
    }
  }
  // the staff and regulars of the house can be clicked too (a box round each of them)
  for (const ch of crowd) {
    if (!ch.npc || !NPC_TALK[ch.npcKey] || !ch.root.visible) continue;
    const p = ch.root.position;
    if (here && roomAt(p.x, p.z) !== here) continue;
    npcBox.min.set(p.x - 0.32, p.y, p.z - 0.32); npcBox.max.set(p.x + 0.32, p.y + 1.85, p.z + 0.32);
    if (raycaster.ray.intersectBox(npcBox, hitPoint)) {
      const d = hitPoint.distanceTo(raycaster.ray.origin) - 0.3;   // people win ties with the furniture they stand at
      if (d < bestD) { bestD = d; best = { kind: 'npc', ch, key: ch.npcKey }; }
    }
  }
  // furniture that IS a person (the bar counter is Charon, the cup is Old Tobias...) counts as that person
  if (best && best.kind === 'object' && OBJ_NPC[best.o.id]) {
    const key = OBJ_NPC[best.o.id], ch = crowd.find((c) => c.npc && c.npcKey === key);
    if (ch) best = { kind: 'npc', ch, key, o: best.o };
  }
  return best;
}
const npcBox = new THREE.Box3();
function showHover(tg, x, y, touch) {
  hovered = tg;
  if (!tg) { ring.visible = false; hintEl.hidden = true; canvas.style.cursor = 'var(--cur, default)'; return; }
  const info = describe(tg);
  if (tg.kind === 'spot') { ring.position.set(tg.s.hit.x, 0.03, tg.s.hit.z); ring.scale.setScalar(Math.max(tg.s.hit.sx, tg.s.hit.sz) * 0.55); }
  else if (tg.kind === 'npc') { const p = tg.ch.root.position; ring.position.set(p.x, p.y + 0.03, p.z); ring.scale.setScalar(0.5); }
  else { ring.position.set(tg.o.floor[0], 0.03, tg.o.floor[1]); ring.scale.setScalar(tg.o.size); }
  ring.visible = true;
  ringMat.color.setHex(info.ok ? 0xffc870 : 0x8a8a96);
  // the hint says which button does what: left click talks to people, right click opens the options
  hintEl.textContent = info.text + (touch ? '' : tg.kind === 'npc' ? '  ·  click: talk  ·  right-click: options' : info.ok ? '  ·  right-click' : '');
  hintEl.classList.toggle('off', !info.ok);
  hintEl.hidden = false;
  const r = stage.getBoundingClientRect();
  hintEl.style.transform = 'translate(' + Math.round(x - r.left + 14) + 'px,' + Math.round(y - r.top + 16) + 'px)';
  canvas.style.cursor = info.ok ? 'var(--cur-hand, pointer)' : 'var(--cur, not-allowed)';
}
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  lastPointer = { x: e.clientX, y: e.clientY };
  if (drag && upInfo && (Math.abs(e.clientX - upInfo.x0) > 4 || Math.abs(e.clientY - upInfo.y0) > 4)) { showHover(null); return; }
  showHover(pickTarget(e.clientX, e.clientY), e.clientX, e.clientY, false);
});
canvas.addEventListener('pointerleave', () => { if (!armed) showHover(null); });
canvas.addEventListener('pointerdown', () => { closeDrinkMenu(); });
// the mouse: left click is for menus and for talking to people; RIGHT click is the action button,
// it opens a little menu of what you can do with the thing under the cursor. Phones: a tap opens that menu.
canvas.addEventListener('pointerup', (e) => {
  const d0 = upInfo; upInfo = null;
  if (e.button !== 0 && e.button !== 2) return;
  if (!d0 || Math.abs(e.clientX - d0.x0) > 6 || Math.abs(e.clientY - d0.y0) > 6 || performance.now() - d0.t0 > 600) return;
  const tg = pickTarget(e.clientX, e.clientY);
  if (e.pointerType === 'touch') {
    armed = null;
    if (!tg) { showHover(null); closeCtx(); return; }
    showHover(tg, e.clientX, e.clientY, true);
    openActions(tg, e.clientX, e.clientY, true);
    return;
  }
  if (e.button === 2) { if (tg) openActions(tg, e.clientX, e.clientY, false); else closeCtx(); return; }
  closeCtx();
  if (tg && tg.kind === 'npc') npcTalk(tg);
});
// ---- people of the house: a line when you click them, their own menu on right click
const OBJ_NPC = { bartender: 'bartender', beggar: 'beggar', dealer: 'minos', dj: 'dj', djbooth: 'dj', 'bouncer-front': 'cerberus', 'bouncer-back': 'plutus' };
const NPC_TALK = {
  bartender: { name: 'Charon', lines: ["What'll it be?", 'Every soul pays the ferryman. Five coins a glass.', "I've poured for worse crowds. Not many.", 'The ice is fresh. The gossip is fresher.', "Sit, drink, stay a while. Nobody's in a hurry down here.", "Looking for a room upstairs? Right-click me, I've got keys."] },
  beggar: { name: 'Old Tobias', lines: ['Spare a coin for an old man?', "I wasn't always like this, you know. Had a bar once. Bigger than this one.", "*cough* Don't mind the smell. It's character.", 'Psst. I got things. Right-click if you want to see.', 'The rats round here know more than the cops.'] },
  minos: { name: 'Minos', lines: ['Cards are honest. People less so.', 'Take a seat when you are ready to lose.', 'House rules: no crying at the table.', 'I judge every hand fairly. Mostly.'] },
  dj: { name: 'The DJ', lines: ['You hear that bassline? Mine.', 'Requests go in the jar. Right-click me.', '*nods to the beat*', "Next one's a banger, trust."] },
  cerberus: { name: 'Cerberus', talk: () => bouncerTalk('front') },
  plutus: { name: 'Plutus', talk: () => bouncerTalk('back') },
  ben: { name: 'Ben', lines: ['Cameras see everything. I see the cameras.', 'Quiet night. Keep it that way.', "*doesn't look up from his phone*", "If it's on tape, it happened."] },
  valet: { name: 'Phlegyas', lines: ['Keys? I keep every car in town safe.', "Nice night for a drive. Shame you're drinking.", 'Bay one is the boss. Always.', 'I park it, I polish it, I never joyride it. Much.'] },
  pan: { name: 'Pan', lines: ['Fresh greens tonight. Lights stay on till sunrise.', "Six holes, par twenty. Most people don't break thirty.", 'Mind the pond on the second. It eats balls.', 'Right-click me to start a round, or to join one.', 'Swing easy. The ball does the rest.'] },
  stranger: { name: '???', lines: ['…', "You shouldn't be looking at me.", 'I was never here.', 'Ask Charon about the basement. Or don\'t.'] }
};
const npcName = (tg) => (NPC_TALK[tg.key] && NPC_TALK[tg.key].name) || tg.ch.name || 'Someone';
function npcTalk(tg) {
  const n = NPC_TALK[tg.key]; if (!n) return;
  if (n.talk) { n.talk(); return; }
  if (tg.key === 'bartender' && Math.random() < 0.5 && typeof bartenderGreet === 'function') { bartenderGreet(); return; }
  showBubbleOn(tg.ch, n.lines[Math.floor(Math.random() * n.lines.length)]);
}
// ---- the action menu
const ctxMenu = document.createElement('div'); ctxMenu.className = 'popmenu'; ctxMenu.id = 'ctxMenu'; ctxMenu.hidden = true; ctxMenu.setAttribute('role', 'menu'); stage.appendChild(ctxMenu);
function closeCtx() { ctxMenu.hidden = true; }
document.addEventListener('pointerdown', (e) => { if (!ctxMenu.hidden && !ctxMenu.contains(e.target)) closeCtx(); }, true);
function placeMenu(m, x, y) {
  const r = stage.getBoundingClientRect(); m.hidden = false;
  const w = m.offsetWidth || 200, h = m.offsetHeight || 120;
  m.style.left = Math.max(12, Math.min(r.width - w - 12, x - r.left + 10)) + 'px';
  m.style.top = Math.max(60, Math.min(r.height - h - 70, y - r.top - 10)) + 'px';
}
function ctxShow(title, opts, x, y) {
  ctxMenu.textContent = '';
  const h = document.createElement('div'); h.className = 'dmTitle'; h.textContent = title; ctxMenu.appendChild(h);
  for (const [label, fn, off] of opts) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = !!off;
    b.onclick = () => { closeCtx(); fn(); };
    ctxMenu.appendChild(b);
  }
  placeMenu(ctxMenu, x, y);
  showHover(null);
}
function openActions(tg, x, y, touch) {
  closeDrinkMenu(); closeCtx();
  if (tg.kind === 'npc') {
    const n = NPC_TALK[tg.key] || {}, name = npcName(tg), talk = ['Talk', () => npcTalk(tg)];
    if (tg.key === 'bartender') { drinkFrom = 'bar'; $('dmCig').hidden = false; openDrinkMenu(x, y); if (touch) npcTalk(tg); showHover(null); return; }
    if (tg.key === 'beggar') { ctxShow(name, [talk, ['See what he\'s got', () => window.SOCIAL && window.SOCIAL.openBeggar()]], x, y); return; }
    if (tg.key === 'dj') { ctxShow(name, [talk, ['Request a song', () => (window.HOTEL && window.HOTEL.openDjMenu ? window.HOTEL.openDjMenu(x, y) : changeMusic())]], x, y); return; }
    if (tg.key === 'pan') { if (window.GOLF) window.GOLF.openMenu(x, y, talk); else ctxShow(name, [talk], x, y); return; }
    if (tg.key === 'minos') { ctxShow(name, [talk, ['Join the poker table', () => (window.POKER ? window.POKER.open() : setView('card'))]], x, y); return; }
    ctxShow(name, [talk], x, y); return;
  }
  const info = describe(tg);
  if (info.player) { if (window.SOCIAL) window.SOCIAL.openPlayerMenu({ uid: info.player.uid, name: info.player.name }, x, y); showHover(null); return; }
  if (info.needChar) { ctxShow('New here?', [['Create your character', () => openCreator()]], x, y); return; }
  // one thing to do with most furniture, but the menu has room for more later
  const title = tg.kind === 'spot' ? (CAT_ROOM[tg.s.cat] && CAT_ROOM[tg.s.cat].name) || 'Here' : 'Here';
  ctxShow(title, [[info.ok ? info.text : info.text, () => activate(tg, x, y), !info.ok]], x, y);
}
let upInfo = null;
canvas.addEventListener('pointerdown', (e) => { upInfo = { x0: e.clientX, y0: e.clientY, t0: performance.now() }; }, true);

function activate(tg, x, y) {
  if (myLock()) { toast("You can't move yet."); return; }
  const id0 = tg.kind === 'object' ? tg.o.id : '';
  // looking around doesn't need a character
  if (id0 === 'plaque') { if (window.EXTRAS) window.EXTRAS.openCoins(); showHover(null); return; }
  if (id0 === 'carddoor') { setView('card'); showHover(null); return; }
  if (id0 === 'dealer') { if (window.POKER) window.POKER.open(); showHover(null); return; }
  if (id0 === 'slots') { if (window.SOCIAL) window.SOCIAL.openSlots(); showHover(null); return; }
  if (id0 === 'beggar') { if (window.SOCIAL) window.SOCIAL.openBeggar(); showHover(null); return; }
  if (id0 === 'bouncer-front' || id0 === 'bouncer-back') { bouncerTalk(id0.slice(8)); showHover(null); return; }
  if (id0 === 'trapdoor') { enterBasement(); showHover(null); return; }
  if (id0 === 'baseup') { leaveBasement(); showHover(null); return; }
  if (id0 === 'stairs2') { goUpstairs(); showHover(null); return; }
  if (id0 === 'stairsdown') { goDownstairs(); showHover(null); return; }
  if (id0.startsWith('door-')) { setView('room' + id0.slice(5)); showHover(null); return; }
  if (id0.startsWith('roomexit-')) { setView('f2'); showHover(null); return; }
  if (id0.startsWith('roomtv-')) { if (window.HOTEL) window.HOTEL.openRoomTv(+id0.slice(7)); showHover(null); return; }
  if (id0 === 'dj' || id0 === 'djbooth') { if (window.HOTEL) window.HOTEL.openDjMenu(x, y); else changeMusic(); showHover(null); return; }
  const info = describe(tg);
  if (info.player) { if (window.SOCIAL) window.SOCIAL.openPlayerMenu({ uid: info.player.uid, name: info.player.name }, x, y); showHover(null); return; }
  if (info.needChar) { openCreator(); return; }
  if (!info.ok) return;
  if (tg.kind === 'spot') {
    if (tg.s.room !== undefined && !roomOk(tg.s.room)) { toast("That's not your room."); return; }
    if (/^pool-cue-/.test(tg.s.id) && window.POOL) { window.POOL.open(); return; }
    if (/^poker-seat-/.test(tg.s.id) && window.POKER) { window.POKER.open(); return; }
    goTo(tg.s.id); return;
  }
  const id = tg.o.id;
  if (id === 'bartender') { drinkFrom = 'bar'; $('dmCig').hidden = false; openDrinkMenu(x, y); }
  else if (id === 'minibar') { drinkFrom = 'minibar'; $('dmCig').hidden = true; openDrinkMenu(x, y); }
  else if (id === 'humidor') giveSmoke('cigar');
  else if (id === 'wcdoor-m' || id === 'wcdoor-w') {
    const w = id === 'wcdoor-w', free = SPOT_LIST.find((s) => s.cat === (w ? 15 : 9) && (!spotOwner.has(s.id) || spotOwner.get(s.id).mine));
    if (free) goTo(free.id); else toast("It's full in there.");
    setView(w ? 'wcW' : 'wcM');
  }
  else if (id === 'coin') { if (window.EXTRAS) window.EXTRAS.claimCoin(); }
  else if (id === 'jukebox' || id === 'djbooth') changeMusic();
  else if (id === 'viptv') setView('viptv');
  else if (id === 'tv') { setView('tv'); if (window.UI) window.UI.openTv(); }
  else if (id === 'pooltable') {
    if (window.POOL) window.POOL.open();
    else { const free = ['pool-cue-0', 'pool-cue-1'].find((sid) => !spotOwner.has(sid) || spotOwner.get(sid).mine); if (free) goTo(free); }
  }
  showHover(null);
}
// the trapdoor: down into the basement, and back up
function enterBasement() {
  setView('basement');
  if (hasCharacter() && !spotOwner.has('base-lean-0')) goTo('base-lean-0');
  if (!localStorage.getItem('sh1den-basement')) { try { localStorage.setItem('sh1den-basement', '1'); } catch (e) { } setTimeout(() => toast('You found the basement. Nobody talks about the basement.'), 700); }
}
function leaveBasement() {
  setView('bar');
  const me = myChar(), sp = me && SPOT_BY_ID[me.spot];
  if (sp && sp.cat === 12) { const free = SPOT_LIST.find((s) => s.cat === 1 && s.act === 'lean' && !spotOwner.has(s.id)); goTo(free ? free.id : ''); }
}
function goUpstairs() {
  if (!floor2Ok()) { toast('The second floor is under construction. Come back soon.'); return; }
  const mine = window.HOTEL && window.HOTEL.myRoom && window.HOTEL.myRoom();
  setView(mine != null && mine >= 0 ? 'room' + mine : 'f2');
}
function goDownstairs() {
  setView('bar');
  const me = myChar(), sp = me && SPOT_BY_ID[me.spot];
  if (sp && (sp.cat === 13 || sp.cat >= 20)) { const free = SPOT_LIST.find((s) => s.cat === 1 && s.act === 'lean' && !spotOwner.has(s.id)); goTo(free ? free.id : ''); }
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
  for (const b of drinkMenu.querySelectorAll('button[data-drink]')) b.textContent = b.dataset.drink + (drinkFrom === 'bar' ? ' · ' + DRINK_PRICE + ' 🪙' : ' · on the house');
  const r = stage.getBoundingClientRect();
  drinkMenu.hidden = false;
  const w = drinkMenu.offsetWidth || 180, h = drinkMenu.offsetHeight || 180;
  drinkMenu.style.left = Math.max(12, Math.min(r.width - w - 12, x - r.left + 10)) + 'px';
  drinkMenu.style.top = Math.max(60, Math.min(r.height - h - 70, y - r.top - h / 2)) + 'px';
  const first = drinkMenu.querySelector('button'); if (first) first.focus();
}
let drinkFrom = 'bar';
function closeDrinkMenu() { if (drinkMenu) drinkMenu.hidden = true; }
// Charon charges: a drink is 5 sh1den coins, a cigarette 10 (the hosts drink on the house; the VIP minibar is free)
const DRINK_PRICE = 5, CIG_PRICE = 10;
async function payCharon(n, what) {
  if (drinkFrom !== 'bar' || !window.EXTRAS || !window.EXTRAS.spend) return true;
  const ok = await window.EXTRAS.spend(n);
  if (!ok) toast("You can't afford " + what + ' (' + n + ' sh1den coins).');
  return ok;
}
async function orderDrink(id) {
  closeDrinkMenu();
  const cur = myState.d || (myChar() && myChar().drink) || '';
  if (id && id !== cur && !(await payCharon(DRINK_PRICE, 'that drink'))) return;
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
    const b = document.createElement('button'); b.type = 'button'; b.textContent = d.name; b.dataset.drink = d.name;
    b.onclick = () => orderDrink(d.id); drinkMenu.appendChild(b);
  }
  const none = document.createElement('button'); none.type = 'button'; none.className = 'quiet'; none.textContent = 'Put my drink down';
  none.onclick = () => orderDrinkNone(); drinkMenu.appendChild(none);
  const cig = document.createElement('button'); cig.type = 'button'; cig.id = 'dmCig'; cig.textContent = 'A cigarette (10 min) · ' + CIG_PRICE + ' 🪙';
  cig.onclick = async () => { closeDrinkMenu(); const me = myChar(); if (!me) { openCreator(); return; } if (me.host) { giveSmoke('cig'); return; } if (await payCharon(CIG_PRICE, 'a cigarette')) giveSmoke('cig'); };
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
  if (danceHere) { danceSel = (danceSel + 1) % DANCE_TRACKS.length; pickTrack(DANCE_TRACKS[danceSel]); toast('The DJ drops ' + TRACKS[DANCE_TRACKS[danceSel]].name + '.'); return; }
  const next = (sharedTrack + 1) % TRACKS.length;
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
PRE_HOOKS.push((dt, t) => { if (zoneOf(cam.tx) === 'main') blocksTick(dt, t); });
// the stoner on the roof across the road: not a talker, just there, slowly swaying to his radio
const STONER_LOOK = { jacket: 3, pants: 0, skin: 3, head: 2, hair: 3, beard: 1, eyes: 1, smoke: 1, dance: 3, spot: 1, body: 0, top: 3, bottom: 0, shoes: 0 };
REBUILD_HOOKS.push(() => { const [x, y, z] = ROOF_SPOTS.stonerSeat; const c = addChar(STONER_LOOK, '', { npc: true, seedName: 'stoner' }); c.act = 'sitlow'; c.root.position.set(x, y + 0.03, z); c.root.rotation.y = Math.PI; });
// Pan, the starter at the golf club, and the flags waving on the greens
const PAN_LOOK = { jacket: 1, pants: 1, skin: 2, head: 3, hair: 2, beard: 2, eyes: 0, smoke: 0, dance: 3, spot: 1, body: 0, top: 2, bottom: 1, shoes: 1 };
REBUILD_HOOKS.push(() => { const p = addChar(PAN_LOOK, 'Pan', { npc: true, seedName: 'pan', staff: true }); p.act = 'stand'; p.root.position.set(34.75, 0, -79); p.root.rotation.y = -Math.PI / 2; });
PRE_HOOKS.push((dt, t) => {
  if (zoneOf(cam.tx) !== 'main' || cam.tz > -40) return;
  GOLF_FLAGS.forEach((f, i) => { f.rotation.y = 0.5 * Math.sin(t * 0.7 + i) + 0.18 * Math.sin(t * 3.1 + i * 2); });
  if (GOLF.waterTex) GOLF.waterTex.offset.set((t * 0.02) % 1, (t * 0.011) % 1);
  if (GOLF.life) for (const f of GOLF.life) f(t);
});
PRE_HOOKS.push((dt) => walkersTick(dt));
REBUILD_HOOKS.push(walkersRebuild);
PRE_HOOKS.push(zoneCullHook);
PRE_HOOKS.push((dt) => tourHook(dt));
POST_HOOKS.push(cinemaHook);
PRE_HOOKS.push((dt, t) => fountainTick(dt, t));
// who is sitting at which lounge table (they toast together when two or more share one)
PRE_HOOKS.push(() => {
  const cnt = {};
  for (const ch of crowd) { const s = ch.act === 'club' && ch.spot && SPOT_BY_ID[ch.spot]; if (s) cnt[s.table] = (cnt[s.table] || 0) + 1; }
  for (const ch of crowd) { const s = ch.act === 'club' && ch.spot && SPOT_BY_ID[ch.spot]; if (s) { ch.toastN = cnt[s.table]; ch.toastT = s.table; } }
});
POST_HOOKS.push((dt, t, beat) => danceFxTick(dt, t, beat));
POST_HOOKS.push(() => { const inD = camRoom() === ROOMS.dance; if (inD !== danceHere) { danceHere = inD; pickTrack(inD ? DANCE_TRACKS[danceSel] : sharedTrack); } });
POST_HOOKS.push((dt, t) => loungeTick(dt, t));
// (hash32 is defined near the top so the forest can use it while the world is built)
const camRoom = () => (camT.free ? null : roomAt(cam.tx, cam.tz));

// ---- the restroom fittings: three stalls, a double vanity, dryer; the roof comes off for whoever is in there
const wcGroup = new THREE.Group(); scene.add(wcGroup);
const wcLight = new THREE.PointLight(0xfff0d8, 1.0, 5.5, 1.5); wcLight.position.set(16.2, 2.8, -8.0); wcGroup.add(wcLight);
{
  const P = [], Lg = [];
  const ST_C = [52, 54, 60], ST_D = [34, 36, 40], PORC = [224, 222, 216], CHR = [170, 172, 178], GOLD = [150, 112, 54];
  const FX = 17.0, BX = 18.38;               // stall fronts / back wall
  const STALLS = [[-10.38, -9.2], [-9.2, -8.04], [-7.96, -6.8], [-6.8, -5.62]];
  for (const [a, b] of STALLS) {
    P.push(box(FX, FX + 0.04, 0.12, 2.05, a, a + 0.15, ST_C, 0.03), box(FX, FX + 0.04, 0.12, 2.05, b - 0.15, b, ST_C, 0.03));
    P.push(box(FX, FX + 0.04, 1.9, 2.05, a + 0.15, b - 0.15, ST_D, 0.02));
    if (b !== -8.04 && b !== -5.62) P.push(box(FX + 0.04, BX, 0.12, 2.05, b - 0.02, b + 0.02, ST_C, 0.03));
    const c = (a + b) / 2;
    P.push(box(BX - 0.17, BX, 0.42, 0.82, c - 0.2, c + 0.2, PORC, 0.02));
    P.push(cyl(V(BX - 0.4, 0, c), V(BX - 0.4, 0.38, c), 0.13, 0.18, PORC, { n: 8 }));
    P.push(cyl(V(BX - 0.4, 0.38, c), V(BX - 0.4, 0.42, c), 0.2, 0.2, [236, 234, 228], { n: 8 }));
    P.push(box(BX - 0.08, BX - 0.04, 0.82, 0.86, c - 0.04, c + 0.04, CHR, 0.02));
  }
  // stall doors: one open and one locked on each side
  P.push(box(FX + 0.04, FX + 1.0, 0.15, 1.88, STALLS[0][0] + 0.17, STALLS[0][0] + 0.2, ST_C, 0.03));
  P.push(box(FX + 0.005, FX + 0.035, 0.15, 1.88, STALLS[1][0] + 0.16, STALLS[1][1] - 0.16, ST_C, 0.03));
  P.push(box(FX + 0.005, FX + 0.035, 0.15, 1.88, STALLS[2][0] + 0.16, STALLS[2][1] - 0.16, ST_C, 0.03));
  P.push(box(FX + 0.04, FX + 1.0, 0.15, 1.88, STALLS[3][1] - 0.2, STALLS[3][1] - 0.17, ST_C, 0.03));
  for (const k of [1, 2]) Lg.push(box(FX - 0.015, FX, 1.05, 1.09, STALLS[k][1] - 0.3, STALLS[k][1] - 0.24, [220, 30, 30], 0));
  // men's: two urinals on the end wall, a basin and mirror on the partition, the dryer
  for (const x of [15.4, 16.2]) {
    P.push(box(x - 0.18, x + 0.18, 0.45, 1.1, -10.38, -10.2, PORC, 0.02));
    P.push(box(x - 0.14, x + 0.14, 0.5, 0.95, -10.2, -10.12, [236, 234, 228], 0.02));
    P.push(cyl(V(x, 1.1, -10.3), V(x, 1.3, -10.3), 0.015, 0.015, CHR, { n: 5 }));
  }
  P.push(box(15.6, 15.8, 0.95, 1.3, -10.38, -10.3, [60, 60, 64], 0.02));
  P.push(box(14.5, 15.7, 0.8, 0.86, -8.4, -8.03, [20, 20, 22], 0.03)); P.push(box(14.55, 15.65, 0, 0.8, -8.35, -8.03, [30, 30, 34], 0.03));
  P.push(box(14.93, 15.27, 0.86, 0.9, -8.33, -8.06, PORC, 0.02)); P.push(cyl(V(15.1, 0.86, -8.08), V(15.1, 1.02, -8.08), 0.015, 0.015, CHR, { n: 5 }));
  P.push(box(14.55, 15.65, 1.12, 2.0, -8.05, -8.03, [132, 144, 150], 0.02)); P.push(box(14.52, 15.68, 1.09, 1.12, -8.06, -8.03, GOLD, 0.02), box(14.52, 15.68, 2.0, 2.03, -8.06, -8.03, GOLD, 0.02));
  P.push(box(16.3, 16.6, 1.1, 1.38, -8.05, -8.03 + 0.0, [180, 182, 186], 0.03));
  P.push(cyl(V(16.6, 0, -10.15), V(16.6, 0.5, -10.15), 0.13, 0.15, [140, 142, 148], { n: 8 }));
  // women's: a long vanity with two basins and a gold-framed mirror on the end wall, a dryer by the door
  P.push(box(14.5, 16.7, 0.8, 0.86, -6.1, -5.62, [20, 20, 22], 0.03));
  P.push(box(14.55, 16.65, 0, 0.8, -6.04, -5.62, [30, 30, 34], 0.03));
  for (const x of [15.1, 16.1]) {
    P.push(box(x - 0.17, x + 0.17, 0.86, 0.9, -6.05, -5.72, PORC, 0.02));
    P.push(cyl(V(x, 0.86, -5.68), V(x, 1.02, -5.68), 0.015, 0.015, CHR, { n: 5 }), cyl(V(x, 1.02, -5.68), V(x, 1.0, -5.78), 0.012, 0.012, CHR, { n: 5 }));
  }
  P.push(box(14.55, 16.65, 1.12, 2.0, -5.64, -5.62, [132, 144, 150], 0.02));
  P.push(box(14.52, 16.68, 1.09, 1.12, -5.66, -5.62, GOLD, 0.02), box(14.52, 16.68, 2.0, 2.03, -5.66, -5.62, GOLD, 0.02));
  Lg.push(box(14.6, 16.6, 2.08, 2.12, -5.7, -5.64, [255, 236, 200], 0));
  P.push(box(15.6, 15.9, 1.1, 1.38, -7.97, -7.85, [180, 182, 186], 0.03));
  P.push(cyl(V(16.6, 0, -7.75), V(16.6, 0.45, -7.75), 0.13, 0.15, [140, 142, 148], { n: 8 }));
  // ceiling lamps
  for (const z of [-9.4, -6.8]) Lg.push(box(15.6, 16.8, 3.08, 3.12, z - 0.15, z + 0.15, [255, 240, 214], 0));
  wcGroup.add(new THREE.Mesh(toGeometry(P), roomMat), new THREE.Mesh(toGeometry(Lg), glowMat));
}
// a roof over the annex: what happens in the restroom stays in the restroom, unless you're in there too
// a solid slab that sits down over the wall tops on every side, so there's no gap to peek through
const wcRoof = new THREE.Mesh(new THREE.BoxGeometry(ROOMS.wc.x1 - ROOMS.wc.x0 + 0.3, 0.22, ROOMS.wc.z1 - ROOMS.wc.z0 + 0.3), new THREE.MeshLambertMaterial({ color: 0x1c1a1e }));
wcRoof.position.set((ROOMS.wc.x0 + ROOMS.wc.x1) / 2 + 0.05, WALL_H + 0.06, (ROOMS.wc.z0 + ROOMS.wc.z1) / 2); scene.add(wcRoof);
const inRoom = (ch, r) => { const p = ch.root.position; return p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1; };
POST_HOOKS.push(() => {
  const me = crowd.find((c) => c.mine);
  const cr = camRoom(); const open = cr === ROOMS.wc || cr === ROOMS.wcM || cr === ROOMS.wcW || !!(me && inRoom(me, ROOMS.wc));
  wcRoof.visible = !open; wcLight.visible = open;
  if (!open) for (const ch of crowd) if (inRoom(ch, ROOMS.wc)) ch.root.visible = false;
});

// ---- VIP glass: everyone but the hosts sees the lounge through a dark smoked tint, without name tags or chat
const vipTint = new THREE.Mesh(new THREE.BoxGeometry(6.94, 3.15, 6.94), new THREE.MeshBasicMaterial({ color: 0x14040e, transparent: true, opacity: 0.74, depthWrite: false, fog: false }));
vipTint.position.set(-1.5, 1.6, -7.5); vipTint.renderOrder = 4; scene.add(vipTint);
const hiddenInVip = (ch) => (!vipOk() && !ch.mine && inRoom(ch, ROOMS.vip)) || (!ch.mine && HOTEL_ROOMS.some((R2) => inRoom(ch, ROOMS['h' + R2.i]) && !roomOk(R2.i)));
POST_HOOKS.push(() => { vipTint.visible = !vipOk(); });

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
  (h) => ({ x: -2.55, yaw: -0.94, act: 'bt_board' }),
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
plaque.position.set(-4.955, 1.7, -1.6); plaque.rotation.y = Math.PI / 2; scene.add(plaque);
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
// event sound effects are switched off: the only sounds in the bar are the two TVs and the jukebox
const SFX_ON = false;
function sfxOut() {
  if (!SFX_ON || !actx || muted) return null;
  if (!SFX.gain) { SFX.gain = actx.createGain(); SFX.gain.gain.value = 0.35 * userVol(); SFX.gain.connect(actx.destination); }
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
  policeCar.add(carGroup(carParts('sedan', [18, 18, 22]), [box(-0.6, 0.6, 0.32, 0.86, 0.9, 0.93, [220, 220, 220], 0.02), box(-0.6, 0.6, 0.32, 0.86, -0.93, -0.9, [220, 220, 220], 0.02)]));
}
const sirenR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2020 })); sirenR.position.set(-0.4, 1.52, -0.28);
const sirenB = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: 0x2050ff })); sirenB.position.set(-0.4, 1.52, 0.28);
const sirenLight = new THREE.PointLight(0xff2020, 0, 14, 1.5); sirenLight.position.set(0, 2.2, 0);
policeCar.add(sirenR, sirenB, sirenLight); policeCar.visible = false; scene.add(policeCar);
// the limo and the stranger in the long coat
const limo = new THREE.Group();
limo.add(carGroup(carParts('saloon', [10, 10, 12]))); limo.scale.set(1.45, 1, 1);
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
const RAIN_N = 1300, rainPos = new Float32Array(RAIN_N * 6);
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x8090a8, transparent: true, opacity: 0.55 }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const rainSeed = [];
for (let i = 0; i < RAIN_N; i++) rainSeed.push(i % 2 ? [-26 + Math.random() * 54, 4.2 + Math.random() * 11.2, Math.random() * 9] : [-14 + Math.random() * 29, -35 + Math.random() * 23.8, Math.random() * 9]);
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

// ---- Ben, the night watchman, and his CCTV wall: each monitor is a live picture from a camera in one of the rooms
const BEN_LOOK = { jacket: 1, pants: 0, skin: 1, head: 2, hair: 0, beard: 1, eyes: 1, smoke: 1, dance: 3, spot: 1, body: 0, top: 3, bottom: 1, shoes: 1 };
let ben = null;
const benPhone = new THREE.Mesh(toGeometry([box(-0.025, 0.025, -0.11, 0.07, -0.02, 0.02, [20, 20, 22], 0.02)]), charMat);
benPhone.position.set(0, -0.3, 0.06);
REBUILD_HOOKS.push(() => {
  ben = addChar(BEN_LOOK, 'Ben', { npc: true, seedName: 'ben', staff: true });
  ben.act = 'ben'; ben.root.position.set(-15.92, 0, -7.75); ben.root.rotation.y = -Math.PI / 2;
  ben.bones.elR.add(benPhone);
});
PRE_HOOKS.push((dt, t) => { if (ben) { const T = (t + ben.phase * 40) % 40; benPhone.visible = T >= 16 && T < 22; } });
const SEC_FEEDS = [
  ['BAR', [4.6, 2.9, 3.6], [0, 1, -1.2]], ['DANCE', [22.6, 2.9, 3.6], [18, 0.6, 0]], ['POOL LOUNGE', [13.6, 2.9, -4.4], [9, 0.5, -8]],
  ['CINEMA', [-5.4, 2.9, -4.4], [-10, 1, -8]], ['BILLIARDS', [-5.4, 2.9, 3.6], [-9.4, 0.5, -0.2]], ['CASINO', [-12.2, 2.9, 3.6], [-14.6, 0.5, 0]],
  ['STREET', [6, 3.6, 4.6], [0, 0.6, 9]], ['BACKSTREET', [12.5, 4.2, -12.4], [0, 0.5, -23]], null
];
const secCams = [];
SEC_FEEDS.forEach((f, i) => {
  const [z, y] = SEC_MON[i];
  let mat;
  if (f) {
    const rt = new THREE.WebGLRenderTarget(160, 120, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const cam = new THREE.PerspectiveCamera(72, 4 / 3, 0.1, 40); cam.position.set(...f[1]); cam.lookAt(...f[2]);
    secCams.push({ rt, cam });
    mat = new THREE.MeshBasicMaterial({ map: rt.texture, color: 0xc4e6cc, fog: false });
  } else {
    mat = new THREE.MeshBasicMaterial({ map: canvasTex(32, 24, (x, w, h) => { for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) { const v = 20 + Math.floor(Math.random() * 60); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(k, j, 1, 1); } x.fillStyle = '#000'; x.fillRect(4, 9, 24, 7); x.fillStyle = '#ff4fa8'; x.font = '6px monospace'; x.fillText('VIP', 11, 15); }), fog: false });
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.5), mat);
  m.position.set(-16.835, y, z); m.rotation.y = Math.PI / 2; scene.add(m);
  // a camera label and a blinking REC dot in the corner
  if (f) {
    const ls = goldSign(f[0], 128, 22, 12); SIGNS.push(ls);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), decal({ map: ls.tex, transparent: true }));
    lab.position.set(-16.83, y + 0.2, z + 0.28); lab.rotation.y = Math.PI / 2; scene.add(lab);
  }
});
const recDots = new THREE.Group(); scene.add(recDots);
for (const [z, y] of SEC_MON) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false })); d.position.set(-16.828, y + 0.2, z - 0.42); d.rotation.y = Math.PI / 2; recDots.add(d); }
let secIdx = 0, secFrame = 0, secFlick = 0;
POST_HOOKS.push((dt, t) => {
  if (blackout) return;
  const now = performance.now();
  if (now > secFlick + 600 && Math.random() < dt / 9) secFlick = now;
  const e = now - secFlick, on = e > 600 || (Math.floor(e / 60) % 3 !== 1);
  const k = on ? 1 : 0.15;
  secLight.intensity = 1.6 * k; secLight2.intensity = 1.0 * k;
  for (const m of SEC_NEON) m.visible = on;
  for (const m of SEC_BEAMS) m.opacity = on ? 0.13 : 0.02;
});
const secCenter = new THREE.Vector3(-15, 1, -7.5);
POST_HOOKS.push((dt, t) => {
  recDots.visible = Math.floor(t * 1.5) % 2 === 0;
  // only film while someone is actually looking at the office
  const near = camRoom() === ROOMS.sec || (camT.free && Math.hypot(cam.tx - secCenter.x, cam.tz - secCenter.z) < 14) || camera.position.distanceTo(secCenter) < 9;
  if (!near || secFrame++ % 2) return;
  const c = secCams[secIdx++ % secCams.length];
  renderer.setRenderTarget(c.rt); renderer.render(scene, c.cam); renderer.setRenderTarget(null);
});

// ---- VIP access: hosts, plus anyone who has spent 1,000 coins
function applyVipAccess() {
  const ok = vipOk();
  $('v-vip').hidden = !ok;
  if (roomSel) { const o = roomSel.querySelector('option[value="vip"]'); if (o) o.hidden = o.disabled = !ok; }
}
// ---- the gold tuxedo: a shining gold suit with a warm glow around whoever wears it
let perks = {};
const goldGlowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,214,110,0.75)'); g.addColorStop(0.45, 'rgba(255,190,70,0.28)'); g.addColorStop(1, 'rgba(255,170,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const goldGlows = new Set();
// which tuxedo someone is wearing (what they picked in their card; bought gold falls back to gold)
function tuxFor(ch) {
  const eq = ch.uid && inv[ch.uid] && inv[ch.uid].eq;
  if (eq && eq.outfit && COSTUMES[eq.outfit] && inv[ch.uid][eq.outfit]) return 'cos-' + eq.outfit;
  const p = ch.uid && perks[ch.uid];
  if (!p) return '';
  if (p.wear && TUXES[p.wear]) return 'tux-' + p.wear;
  if (p.wear === 'none') return '';
  return p.gold ? 'tux-gold' : '';
}
// tuxedos catch the light: a shinier material on the whole body, extra glossy red for the ruby
const tuxMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x6a6a6a }));
const tuxOverMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x6a6a6a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }));
const rubyMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 22, specular: 0x3a1410, emissive: 0x0c0203 }));
const rubyOverMat = ps1(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 22, specular: 0x3a1410, emissive: 0x0c0203, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }));
const haloTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 10, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(0.75, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
// tuxedos: no glow any more, the cloth itself is cut like a gemstone: faceted, metallic, catching the light in
// flashes of its own colour (ruby, gold, emerald...) as the wearer moves
const GEM = {
  silver: [[226, 232, 246], [150, 160, 182], 0xb8c0d0], gold: [[255, 206, 96], [196, 140, 40], 0xd8a040], platinum: [[240, 244, 255], [180, 188, 210], 0xd0d8f0],
  emerald: [[90, 255, 160], [20, 150, 80], 0x40c080], diamond: [[220, 240, 255], [150, 190, 230], 0xe0f0ff], ruby: [[255, 40, 110], [200, 10, 60], 0xff3070],
  midnight: [[160, 100, 255], [60, 20, 150], 0x8050ff]
};
const gemMats = {};
function gemCube(kind) {
  const [hi, lo] = GEM[kind];
  const face = (seed) => {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), r = rngFrom(seed);
    x.fillStyle = 'rgb(' + lo.map((v) => Math.round(v * 0.18)).join(',') + ')'; x.fillRect(0, 0, 16, 16);
    for (let k = 0; k < 9; k++) {
      const pick = r(), col = pick < 0.18 ? [255, 255, 255] : pick < 0.6 ? hi : lo, a = 0.35 + 0.65 * r();
      x.fillStyle = 'rgba(' + col.join(',') + ',' + a.toFixed(2) + ')';
      x.beginPath(); x.moveTo(r() * 16, r() * 16); x.lineTo(r() * 16, r() * 16); x.lineTo(r() * 16, r() * 16); x.fill();
    }
    return c;
  };
  const tex = new THREE.CubeTexture([0, 1, 2, 3, 4, 5].map((k) => face(hashStr(kind) + k * 97)));
  tex.needsUpdate = true; return tex;
}
function gemMat(kind, over) {
  const key = kind + (over ? ':o' : '');
  if (!gemMats[key]) gemMats[key] = ps1(new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, flatShading: true, shininess: 80, specular: GEM[kind][2], envMap: gemCube(kind), combine: THREE.AddOperation, reflectivity: 0.42 },
    over ? { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 } : {})));
  return gemMats[key];
}
// break the suit's flat colour into facets: each triangle a little lighter or darker, a little warmer or cooler
function facetSuit(geo, kind) {
  if (!geo || geo.userData.faceted || !geo.attributes || !geo.attributes.color) return;
  geo.userData.faceted = true;
  const T = TUXES[kind], targets = [T.jacket, T.pants, T.lapel].map((c) => c.map((v) => s2l(v)));
  const col = geo.attributes.color.array, r = rngFrom(hashStr(kind) + col.length);
  for (let i = 0; i < col.length; i += 9) {
    const c = [col[i], col[i + 1], col[i + 2]];
    if (!targets.some((t) => Math.abs(t[0] - c[0]) + Math.abs(t[1] - c[1]) + Math.abs(t[2] - c[2]) < 0.12)) continue;
    const k = 0.55 + r() * 0.9, warm = (r() - 0.5) * 0.25;
    for (let j = 0; j < 9; j += 3) { col[i + j] = Math.min(1, c[0] * k * (1 + warm)); col[i + j + 1] = Math.min(1, c[1] * k); col[i + j + 2] = Math.min(1, c[2] * k * (1 - warm)); }
  }
  geo.attributes.color.needsUpdate = true;
}
function setGoldGlow(ch, kind) {
  if (ch.glowKind === kind) return;
  ch.glowKind = kind;
  const T = kind && TUXES[kind];
  if (!T || !GEM[kind]) return;
  ch.root.traverse((o) => {
    if (!o.isMesh || !o.userData.body || o.parent === ch.bones.head) return;
    facetSuit(o.geometry, kind);
    o.material = gemMat(kind, o.material === charOverMat);
  });
  goldGlows.add(ch);
}
// a slow shimmer: the facets' reflection breathes a little
POST_HOOKS.push((dt, t) => {
  for (const k in gemMats) gemMats[k].reflectivity = 0.36 + 0.1 * Math.sin(t * 1.7 + k.length);
});

// ---- the shop: pets that tag along, glows and smells, and the beggar's 30-minute "effects"
let inv = {}, buffs = {};
const BUFF_MS = 30 * 60000;
const buffOn = (uid, k) => !!(uid && buffs[uid] && buffs[uid][k] && serverNow() - buffs[uid][k] < BUFF_MS);
const petGeo = (() => {
  const g = {};
  const BLK = [12, 10, 12];
  // parrot: red and blue, sits on the shoulder
  g.parrot = toGeometry([cyl(V(0, 0, 0), V(0, 0.14, 0.01), 0.045, 0.035, [200, 30, 30], { n: 8 }), cyl(V(0, 0.14, 0.01), V(0, 0.2, 0.02), 0.035, 0.03, [210, 40, 30], { n: 8 }),
    cyl(V(0, 0.17, 0.045), V(0, 0.15, 0.08), 0.015, 0.002, [240, 220, 120], { n: 5 }), box(-0.05, -0.035, 0.02, 0.12, -0.03, 0.03, [40, 80, 200], 0.03), box(0.035, 0.05, 0.02, 0.12, -0.03, 0.03, [40, 80, 200], 0.03),
    cyl(V(0, 0.01, -0.02), V(0, -0.1, -0.06), 0.02, 0.008, [240, 200, 40], { n: 5 }), box(-0.02, -0.01, 0.17, 0.18, 0.03, 0.035, BLK, 0), box(0.01, 0.02, 0.17, 0.18, 0.03, 0.035, BLK, 0)]);
  // dog: a little brown dog sitting by your feet
  const DOG = [120, 80, 46];
  g.dog = toGeometry([box(-0.08, 0.08, 0.12, 0.26, -0.18, 0.08, DOG, 0.04), box(-0.07, 0.07, 0.24, 0.38, 0.02, 0.14, DOG, 0.04), box(-0.04, 0.04, 0.26, 0.31, 0.14, 0.2, DOG.map((v) => v * 0.8), 0.03),
    box(-0.075, -0.05, 0.3, 0.38, 0.06, 0.09, DOG.map((v) => v * 0.6), 0.02), box(0.05, 0.075, 0.3, 0.38, 0.06, 0.09, DOG.map((v) => v * 0.6), 0.02),
    ...[[-0.05, 0.05], [0.05, 0.05], [-0.05, -0.15], [0.05, -0.15]].map(([x, z]) => box(x - 0.022, x + 0.022, 0, 0.14, z - 0.022, z + 0.022, DOG, 0.03)),
    box(-0.03, -0.015, 0.33, 0.345, 0.141, 0.146, BLK, 0), box(0.015, 0.03, 0.33, 0.345, 0.141, 0.146, BLK, 0), box(-0.012, 0.012, 0.29, 0.31, 0.2, 0.21, BLK, 0)]);
  g.dogTail = toGeometry([cyl(V(0, 0, 0), V(0, 0.1, -0.06), 0.015, 0.008, DOG, { n: 5 })]);
  // cat: black, tail curled up
  g.cat = toGeometry([box(-0.06, 0.06, 0.08, 0.2, -0.12, 0.06, BLK, 0.03), box(-0.055, 0.055, 0.2, 0.3, 0.0, 0.1, BLK, 0.03), box(-0.05, -0.02, 0.3, 0.34, 0.03, 0.06, BLK, 0), box(0.02, 0.05, 0.3, 0.34, 0.03, 0.06, BLK, 0),
    ...[[-0.04, 0.04], [0.04, 0.04], [-0.04, -0.1], [0.04, -0.1]].map(([x, z]) => box(x - 0.018, x + 0.018, 0, 0.1, z - 0.018, z + 0.018, BLK, 0.02)), cyl(V(0, 0.12, -0.12), V(0, 0.3, -0.2), 0.012, 0.008, BLK, { n: 4 })]);
  g.catEyes = toGeometry([box(-0.035, -0.015, 0.25, 0.265, 0.1, 0.104, [230, 210, 60], 0), box(0.015, 0.035, 0.25, 0.265, 0.1, 0.104, [230, 210, 60], 0)]);
  // demon and angel: small floating figures by your shoulder
  g.demon = toGeometry([cyl(V(0, -0.08, 0), V(0, 0.08, 0), 0.05, 0.06, [130, 16, 20], { n: 8 }), cyl(V(0, 0.08, 0), V(0, 0.16, 0), 0.05, 0.04, [140, 20, 24], { n: 8 }),
    cyl(V(-0.03, 0.15, 0), V(-0.05, 0.22, 0), 0.012, 0.002, [30, 10, 10], { n: 4 }), cyl(V(0.03, 0.15, 0), V(0.05, 0.22, 0), 0.012, 0.002, [30, 10, 10], { n: 4 }),
    box(-0.16, -0.04, 0.0, 0.1, -0.03, -0.02, [60, 10, 14], 0.02), box(0.04, 0.16, 0.0, 0.1, -0.03, -0.02, [60, 10, 14], 0.02), cyl(V(0, -0.08, -0.02), V(0, -0.18, -0.08), 0.008, 0.002, [40, 6, 8], { n: 4 })]);
  g.demonEyes = toGeometry([box(-0.025, -0.01, 0.12, 0.135, 0.04, 0.045, [255, 200, 40], 0), box(0.01, 0.025, 0.12, 0.135, 0.04, 0.045, [255, 200, 40], 0)]);
  g.angel = toGeometry([cyl(V(0, -0.08, 0), V(0, 0.08, 0), 0.06, 0.04, [240, 238, 230], { n: 8 }), cyl(V(0, 0.08, 0), V(0, 0.16, 0), 0.045, 0.04, [236, 206, 176], { n: 8 }),
    box(-0.18, -0.04, -0.02, 0.12, -0.03, -0.02, [250, 250, 245], 0.02), box(0.04, 0.18, -0.02, 0.12, -0.03, -0.02, [250, 250, 245], 0.02)]);
  g.halo = toGeometry([cyl(V(0, 0.2, 0), V(0, 0.208, 0), 0.05, 0.05, [255, 230, 140], { n: 12 })]);
  return g;
})();
const PET_ANIM = new Set();
function makePet(ch, kind) {
  const grp = new THREE.Group(); grp.userData.kind = kind;
  if (kind === 'parrot') {
    grp.add(new THREE.Mesh(petGeo.parrot, charMat));
    grp.position.set(-0.2 - PIV.spine[0], 1.47 - PIV.spine[1], -0.02 - PIV.spine[2]);
    ch.bones.spine.add(grp);
  } else if (kind === 'dog' || kind === 'cat') {
    grp.add(new THREE.Mesh(petGeo[kind], charMat));
    if (kind === 'dog') { const tail = new THREE.Mesh(petGeo.dogTail, charMat); tail.position.set(0, 0.22, -0.18); grp.add(tail); grp.userData.tail = tail; }
    else grp.add(new THREE.Mesh(petGeo.catEyes, glowMat));
    grp.position.set(0.48, 0, 0.25); grp.rotation.y = -0.5; ch.root.add(grp);
  } else {
    grp.add(new THREE.Mesh(petGeo[kind], charMat));
    if (kind === 'demon') grp.add(new THREE.Mesh(petGeo.demonEyes, glowMat)); else grp.add(new THREE.Mesh(petGeo.halo, glowMat));
    const lg = new THREE.PointLight(kind === 'demon' ? 0xff3010 : 0xfff0c0, 0.5, 1.6, 1.5); grp.add(lg);
    grp.position.set(kind === 'demon' ? -0.45 : 0.45, 1.75, -0.15); ch.root.add(grp);
  }
  return grp;
}
// a cloud of drifting particles (glows, stink lines) parented to a character
function makeAura(ch, color, n, opts) {
  const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: (opts && opts.size) || 0.03, transparent: true, opacity: 0.85, depthWrite: false, blending: opts && opts.normal ? THREE.NormalBlending : THREE.AdditiveBlending }));
  pts.frustumCulled = false; ch.root.add(pts); return pts;
}
const FX_COLORS = { 'aura-gold': 0xffc860, 'aura-blue': 0x60a0ff, 'aura-purple': 0xb060ff, 'aura-green': 0x50ff90 };
const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false });
function dressExtras(ch) {
  if (!ch.uid) return;
  const I = inv[ch.uid] || {}, eq = I.eq || {};
  // pet
  if (eq.pet && I[eq.pet] && petGeo[eq.pet]) { ch.pet = makePet(ch, eq.pet); PET_ANIM.add(ch); }
  // shop effect: a coloured glow, a stink cloud with flies, or a permanent haze
  const fx = eq.fx && I[eq.fx] ? eq.fx : '';
  if (FX_COLORS[fx] && !ch.glow) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldGlowTex, color: FX_COLORS[fx], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.scale.set(0.85, 1.75, 1); sp.position.set(0, 0.95, 0); ch.root.add(sp); ch.fxGlow = sp; ch.fxPts = makeAura(ch, FX_COLORS[fx], 14); ch.fxKind = 'glow'; PET_ANIM.add(ch);
  }
  if (fx === 'smelly') { ch.fxPts = makeAura(ch, 0x7a9a30, 24, { size: 0.04, normal: true }); ch.flies = makeAura(ch, 0x101010, 5, { size: 0.025, normal: true }); ch.fxKind = 'smell'; PET_ANIM.add(ch); }
  // red eyes while high (a 30-minute effect from the beggar, or the permanent haze from the shop)
  const high = fx === 'haze' && I.haze || buffOn(ch.uid, 'high') || buffOn(ch.uid, 'twitch');
  if (high) {
    const z = (ch.look.eyes === 0 ? 0.0995 : 0.118) - PIV.head[2];
    for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.012), redEyeMat); e.position.set(sd * 0.042, 1.69 - PIV.head[1], z); ch.bones.head.add(e); }
    ch.high = true; ch.hazePts = makeAura(ch, 0xb8b8b0, 10, { size: 0.05, normal: true }); PET_ANIM.add(ch);
  }
  ch.twitch = buffOn(ch.uid, 'twitch');
}
POST_HOOKS.push((dt, t) => {
  for (const ch of PET_ANIM) {
    if (!crowd.includes(ch)) { PET_ANIM.delete(ch); continue; }
    if (ch.pet) {
      const k = ch.pet.userData.kind;
      if (k === 'demon' || k === 'angel') { ch.pet.position.y = 1.75 + 0.08 * Math.sin(t * 2 + ch.phase * 5); ch.pet.rotation.y = 0.4 * Math.sin(t * 0.7); }
      if (k === 'dog' && ch.pet.userData.tail) ch.pet.userData.tail.rotation.z = 0.6 * Math.sin(t * 12);
      if (k === 'parrot') ch.pet.rotation.z = 0.1 * Math.sin(t * 1.3);
    }
    if (ch.fxPts) {
      const a = ch.fxPts.geometry.attributes.position, n = a.count, smell = ch.fxKind === 'smell';
      for (let i = 0; i < n; i++) {
        const u = (t * (smell ? 0.2 : 0.35) + i / n + ch.phase) % 1, ang = i * 2.39 + t * 0.5;
        a.setXYZ(i, Math.cos(ang) * (smell ? 0.25 + 0.08 * Math.sin(u * 12 + i) : 0.32), 0.2 + u * (smell ? 1.9 : 1.7), Math.sin(ang) * (smell ? 0.25 : 0.32));
      }
      a.needsUpdate = true;
      if (ch.fxGlow) ch.fxGlow.material.opacity = 0.4 + 0.15 * Math.sin(t * 2 + ch.phase * 6);
    }
    if (ch.flies) {
      const a = ch.flies.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) { const ang = t * (3 + i) + i * 1.3; a.setXYZ(i, Math.cos(ang) * 0.25, 1.85 + 0.08 * Math.sin(t * 7 + i), Math.sin(ang * 1.3) * 0.25); }
      a.needsUpdate = true;
    }
    if (ch.hazePts) {
      const a = ch.hazePts.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) { const u = (t * 0.15 + i / a.count) % 1; a.setXYZ(i, 0.05 * Math.sin(u * 9 + i), 1.75 + u * 0.7, 0.12 + 0.06 * Math.cos(u * 7 + i)); }
      a.needsUpdate = true;
      // a slow, heavy-lidded sway
      ch.bones.head.rotation.z += 0.12 * Math.sin(t * 0.9 + ch.phase * 4); ch.bones.spine.rotation.z += 0.04 * Math.sin(t * 0.7 + ch.phase * 3);
    }
  }
  // twitching: sudden jerks of the head and arms
  for (const ch of crowd) {
    if (!ch.twitch) continue;
    const k = Math.floor(t * 6 + ch.phase * 50);
    if (hash32(k) % 7 === 0) { const r = (hash32(k * 3) % 100) / 100 - 0.5; ch.bones.head.rotation.y += r * 0.9; ch.bones.head.rotation.z += r * 0.5; ch.bones.shR.rotation.z += r * 0.6; ch.bones.shL.rotation.x += r * 0.4; }
  }
});
// ---- the beggar in the corner of the parking lot: ragged, sitting on the ground, cup out, and he smells
const BEGGAR_LOOK = { jacket: 3, pants: 0, skin: 2, head: 4, hair: 4, beard: 2, eyes: 0, smoke: 0, dance: 3, spot: 7, body: 0, top: 3, bottom: 0, shoes: 0 };
REBUILD_HOOKS.push(() => {
  const b = addChar(BEGGAR_LOOK, 'Old Tobias', { npc: true, seedName: 'beggar' });
  b.act = 'floorsit'; b.root.position.set(-13.1, 0, -34.3); b.root.rotation.y = 0.8;
  const cup = new THREE.Mesh(toGeometry([cyl(V(0, -0.05, 0), V(0, 0.06, 0), 0.035, 0.04, [180, 170, 150], { n: 8 }), cyl(V(0, -0.04, 0), V(0, 0.05, 0), 0.03, 0.035, [40, 34, 30], { n: 8 })]), charMat);
  cup.position.set(0.04, -0.33, 0.1); b.bones.elR.add(cup);
  b.fxPts = makeAura(b, 0x7a9a30, 24, { size: 0.04, normal: true }); b.flies = makeAura(b, 0x101010, 6, { size: 0.025, normal: true }); b.fxKind = 'smell'; b.phase = 0.3; PET_ANIM.add(b);
});
// ragged details on the ground around him: cardboard, a bottle, a bundle
scene.add(new THREE.Mesh(toGeometry([box(-13.7, -12.5, 0.03, 0.05, -34.85, -33.95, [120, 96, 64], 0.06), cyl(V(-12.55, 0, -34.55), V(-12.55, 0.24, -34.55), 0.035, 0.03, [40, 70, 40], { n: 6 }),
  box(-13.85, -13.45, 0, 0.3, -34.9, -34.55, [70, 60, 50], 0.08)]), roomMat));

// ---- trash bags piled next to Tobias
scene.add(new THREE.Mesh(toGeometry([
  loft([rring(0.0, 0.42, 0.38, -13.85, -33.65, 10), rring(0.2, 0.52, 0.46, -13.85, -33.65, 10), rring(0.42, 0.44, 0.4, -13.85, -33.65, 10), rring(0.52, 0.16, 0.14, -13.85, -33.67, 10)], [18, 18, 20], { smooth: true, amt: 0.06 }),
  loft([rring(0.0, 0.36, 0.34, -13.55, -33.2, 10), rring(0.18, 0.44, 0.4, -13.55, -33.2, 10), rring(0.36, 0.36, 0.33, -13.55, -33.2, 10), rring(0.45, 0.12, 0.12, -13.56, -33.22, 10)], [24, 30, 22], { smooth: true, amt: 0.06 }),
  loft([rring(0.42, 0.34, 0.3, -13.8, -33.5, 10), rring(0.58, 0.38, 0.34, -13.8, -33.5, 10), rring(0.72, 0.28, 0.25, -13.8, -33.5, 10), rring(0.78, 0.1, 0.1, -13.8, -33.52, 10)], [14, 14, 16], { smooth: true, amt: 0.06 }),
  cyl(V(-13.86, 0.52, -33.67), V(-13.86, 0.6, -33.67), 0.03, 0.01, [220, 200, 60], { n: 5 })]), roomMat));
// ---- security on the doors: two big bald men in black suits and dark shades, with earpieces,
// one at the front entrance and one at the VIP back door; and the valet in his booth by the drive
const BOUNCER_LOOK = { jacket: 0, pants: 1, skin: 4, head: 7, hair: 1, beard: 1, eyes: 2, smoke: 0, dance: 3, spot: 6, body: 0, top: 2, bottom: 2, shoes: 2, buff: true };
const VALET_LOOK = { jacket: 6, pants: 1, skin: 0, head: 3, hair: 1, beard: 0, eyes: 0, smoke: 0, dance: 3, spot: 7, body: 0, top: 1, bottom: 2, shoes: 2 };
const NPC_PROPS = [], BOUNCERS = {};
// talk to the door: the answer depends on who you are here
const BOUNCER_LINES = {
  front: {
    boss: ["Evening, boss. Place is all yours.", "Boss. Quiet night so far, I'll keep it that way.", "Good to see you, boss. Your armchair's waiting.", "Boss. Nobody gets past me without your say-so."],
    member: ["You're on the list. Go on in.", "Evening. Enjoy yourself, behave yourself.", "I know your face. Go ahead.", "In you go. The jazz is on.", "Coat check's inside. Have a good night."],
    none: ["Sorry, members only. Can't let you in.", "You're not on the list, pal. Make yourself a character first.", "No name, no entry. Members only.", "Nice try. Come back when you're a member."]
  },
  back: {
    boss: ["Boss. The VIP's clear, go right through.", "Evening, boss. Lounge is warmed up for you.", "Boss. Your car's in bay one, keys with Phlegyas."],
    vip: ["VIP. Right this way.", "Go on through. Mind the carpet.", "You've earned it. In you go.", "Evening. Enjoy the lounge."],
    member: ["Sorry, this door's VIP only.", "Not tonight. Spend a thousand sh1den coins and we'll talk.", "Front door's round the corner, friend.", "VIPs only back here. Nothing personal."],
    none: ["Members only, and this is the VIP door. Can't let you in.", "Who are you? Turn around."]
  }
};
function bouncerTalk(k) {
  const b = BOUNCERS[k]; if (!b) return;
  const me = myChar(), boss = isMod || !!(me && me.host);
  const L = BOUNCER_LINES[k], pool = boss ? L.boss : !me ? L.none : k === 'back' ? (vipOk() ? L.vip : L.member) : L.member;
  showBubbleOn(b, pool[Math.floor(Math.random() * pool.length)]);
  b.nodUntil = performance.now() + 1600;
}
function npcProp(ch, bone, parts, x, y, z, show) {
  const m = new THREE.Mesh(toGeometry(parts), charMat); m.position.set(x, y, z); ch.bones[bone].add(m);
  NPC_PROPS.push({ ch, m, show });
  return m;
}
const phoneParts = () => [box(-0.03, 0.03, -0.12, 0.0, -0.008, 0.008, [18, 18, 20], 0.02), box(-0.026, 0.026, -0.115, -0.005, 0.008, 0.01, [70, 110, 150], 0)];
REBUILD_HOOKS.push(() => {
  NPC_PROPS.length = 0;
  for (const [name, x, z, yaw, k] of [['Cerberus', -1.2, 5.15, 0.2, 'front'], ['Plutus', -2.6, -11.8, Math.PI + 0.35, 'back']]) {
    const b = addChar(BOUNCER_LOOK, name, { npc: true, seedName: name.toLowerCase(), staff: true });
    BOUNCERS[k] = b;
    b.act = 'bouncer'; b.root.position.set(x, 0, z); b.root.rotation.y = yaw;
    // earpiece in the right ear with a coiled wire down into the collar
    const ear = new THREE.Mesh(toGeometry([box(-0.012, 0.012, -0.012, 0.012, -0.012, 0.012, [14, 14, 16], 0.02),
      tube([V(-0.004, -0.01, -0.006), V(0.0, -0.06, -0.03), V(0.012, -0.11, -0.045), V(0.02, -0.15, -0.05)], [0.004, 0.004, 0.004, 0.004], [200, 210, 220], { n: 4 })]), charMat);
    ear.position.set(-0.098, 0.105, 0.0); b.bones.head.add(ear);
    npcProp(b, 'elR', phoneParts(), 0, -0.29, 0.05, (T) => T >= 23.4 && T < 30.6);
  }
  const v = addChar(VALET_LOOK, 'Phlegyas', { npc: true, seedName: 'valet', staff: true });
  v.act = 'valet'; v.root.position.set(12.5, 0, -17.02); v.root.rotation.y = Math.PI;
  npcProp(v, 'elR', phoneParts(), 0, -0.3, 0.06, (T) => T >= 18.3 && T < 25.7);
  npcProp(v, 'elR', [cyl(V(0, -0.05, 0), V(0, 0.05, 0), 0.035, 0.032, [236, 232, 222], { n: 10 }), cyl(V(0, 0.04, 0), V(0, 0.05, 0), 0.03, 0.03, [60, 36, 20], { n: 10 })], 0.0, -0.3, 0.06, (T) => T >= 26.3 && T < 30.7);
});
PRE_HOOKS.push((dt, t) => { for (const p of NPC_PROPS) p.m.visible = p.show(npcLoopT(p.ch, t)); });
// ---- a soft pink haze drifting through the pool lounge
const hazeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(255,120,220,0.5)'); g.addColorStop(1, 'rgba(255,90,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const HAZE = [];
for (let i = 0; i < 9; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, color: i % 3 ? 0xff6ad0 : 0xb070ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.scale.set(3.4, 1.6, 1); sp.position.set(5.8 + (i % 3) * 3.4, 1.2 + (i % 2) * 0.9, -11 + Math.floor(i / 3) * 3.2); scene.add(sp); HAZE.push({ sp, x: sp.position.x, z: sp.position.z, k: i });
}
POST_HOOKS.push((dt, t) => { for (const h of HAZE) { h.sp.position.x = h.x + 0.6 * Math.sin(t * 0.07 + h.k); h.sp.position.z = h.z + 0.4 * Math.cos(t * 0.05 + h.k * 2); h.sp.material.opacity = 0.16 + 0.07 * Math.sin(t * 0.3 + h.k); } });

// ---- small 3D previews (the shop and the character window): a spinning figure in its own little renderer
const PREVIEWS = [];
function makePreview(cv) {
  let r = null;
  try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true }); } catch (e) { return { show() { } }; }
  r.outputEncoding = THREE.sRGBEncoding; r.setPixelRatio(1); r.setSize(cv.width, cv.height, false); r.setClearColor(0x0a0809, 1);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff4e8, 0x302838, 0.9));
  const key = new THREE.DirectionalLight(0xffe0c0, 0.9); key.position.set(1.5, 2.5, 2.5); sc.add(key);
  const rim = new THREE.PointLight(0xff60c0, 0.8, 6); rim.position.set(-1.5, 1.8, -1.5); sc.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: 0x1c1416 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const cam = new THREE.PerspectiveCamera(28, cv.width / cv.height, 0.1, 30); cam.position.set(0, 1.15, 4.6); cam.lookAt(0, 0.95, 0);
  let ch = null;
  const P = {
    cv,
    show(spec) {
      if (ch) { sc.remove(ch.root); ch = null; }
      if (!spec || !spec.look) return;
      const I = (spec.uid && inv[spec.uid]) || {}, eq = I.eq || {};
      let outfit = spec.outfit;
      if (outfit === undefined && spec.uid) outfit = tuxFor({ uid: spec.uid }) || '';
      const look = Object.assign({}, spec.look, { outfit: outfit || undefined });
      ch = makeCharacter(look, '', 7); ch.phase = 0.2; ch.look = look;
      const tux = (outfit || '').startsWith('tux-') ? outfit.slice(4) : '';
      if (tux) setGoldGlow(ch, tux);
      const pet = spec.pet !== undefined ? spec.pet : eq.pet && I[eq.pet] ? eq.pet : '';
      if (pet && petGeo[pet]) ch.pet = makePet(ch, pet);
      const fx = spec.fx !== undefined ? spec.fx : eq.fx && I[eq.fx] ? eq.fx : '';
      if (FX_COLORS[fx]) { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldGlowTex, color: FX_COLORS[fx], transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })); g.scale.set(0.85, 1.75, 1); g.position.y = 0.95; ch.root.add(g); }
      if (fx === 'smelly' || FX_COLORS[fx] || fx === 'haze') {
        const a = makeAura(ch, fx === 'smelly' ? 0x7a9a30 : fx === 'haze' ? 0xb8b8b0 : FX_COLORS[fx], 20, { size: 0.05, normal: fx !== 'glow' });
        const at = a.geometry.attributes.position; for (let i = 0; i < at.count; i++) at.setXYZ(i, (Math.random() - 0.5) * 0.7, 0.2 + Math.random() * 1.8, (Math.random() - 0.5) * 0.7);
      }
      sc.add(ch.root);
    },
    render(t, beat) {
      if (!cv.isConnected || cv.offsetParent === null) return;
      if (ch) { pose(ch, 'dance', beat, t); ch.root.rotation.y = t * 0.8; if (ch.glow) ch.glow.material.opacity = 0.45; }
      r.render(sc, cam);
    }
  };
  PREVIEWS.push(P);
  return P;
}
POST_HOOKS.push((dt, t, beat) => { for (const p of PREVIEWS) p.render(t, beat); });
let creatorPreview = null;
{ const cv = document.getElementById('previewCanvas'); if (cv) creatorPreview = makePreview(cv); }
const myLook = () => { const me = crowd.find((c) => c.mine && c !== draftChar); return me ? Object.assign({}, me.look, { outfit: undefined }) : myEntry ? codeToLook(myEntry.code) : HOST_LOOK; };

// keep the card room, Charon's tag and the VIP rules in step with each rebuild
function rebuildHooks() { for (const f of REBUILD_HOOKS) f(); }
// name tags show the member rank (hours in the bar); hosts are diamond, the owner ruby
let RANKS = {};
const RANK_CLASSES = ['rank-silver', 'rank-gold', 'rank-platinum', 'rank-emerald', 'rank-diamond'];
function applyRanks() {
  for (const ch of crowd) {
    if (!ch.label || ch.host || ch.npc) continue;
    ch.label.classList.remove(...RANK_CLASSES);
    ch.label.classList.toggle('midnight', (ch.name || '').toLowerCase() === 'matenro');
    const r = ch.uid && RANKS[ch.uid];
    if (r && !ch.label.classList.contains('midnight')) ch.label.classList.add('rank-' + r);
  }
}

// ---------------------------------------------------------------- render loop
let pixels = true;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  const scale = pixels ? Math.max(2, Math.round(Math.min(w, h) / 380)) : 1;
  renderer.setPixelRatio(pixels || LITE ? 1 : Math.min(devicePixelRatio, 2));
  renderer.setSize(Math.max(1, Math.round(w / scale)), Math.max(1, Math.round(h / scale)), false);
  snap.value.set(Math.round(w / scale / 1.5), Math.round(h / scale / 1.5));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (cssRenderer) cssRenderer.setSize(w, h);
}
new ResizeObserver(resize).observe(stage); resize();

const clock = new THREE.Clock();
const creatorEl = document.getElementById('creator'), formEl = document.getElementById('form');
let sHead = 0;
// phones: draw at most 30 frames a second, 12 when nobody has touched the screen for a while, and nothing while the tab is hidden
let lastFrameAt = 0, lastInputAt = performance.now();
for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, () => { lastInputAt = performance.now(); }, { passive: true, capture: true });
function tick() {
  if (LITE) {
    const n = performance.now(), idle = n - lastInputAt > 15000 || !enteredGame;   // the welcome card only needs a slow backdrop
    if (document.hidden || n - lastFrameAt < (idle ? 80 : 32)) { requestAnimationFrame(tick); return; }
    lastFrameAt = n;
  }
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, beat = beatNow();
  for (const f of PRE_HOOKS) f(dt, t, beat);
  // while you're editing your look, hide your old character (never the bartender) so only the preview shows
  const editing = !creatorEl.hidden && !formEl.hidden;
  for (const ch of crowd) {
    ch.root.visible = !(editing && ch.mine && !ch.host && ch !== draftChar) && (ch === draftChar || cullZone === null || zoneOf(ch.root.position.x) === cullZone && (ch.mine || Math.hypot(ch.root.position.x - camera.position.x, ch.root.position.z - camera.position.z) < fogCut()));
    pose(ch, ch.act, beat + (ch.act === 'dance' ? 0 : ch.phase), t);
    golferOverride(ch, t);
    if (ch.npcKey === 'stoner') { ch.bones.head.rotation.z += 0.16 * Math.sin(t * 0.6); ch.bones.head.rotation.x += 0.12; ch.bones.spine.rotation.z += 0.05 * Math.sin(t * 0.45); ch.bones.spine.rotation.x -= 0.12; }
    if (ch.onPhone) phonePose(ch, t);
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
  tvLight.intensity = tvOn && !pokerOn ? 1.5 + 0.35 * Math.sin(t * 7) * Math.sin(t * 2.3) + 0.25 * Math.sin(t * 1.3) : pokerOn ? 0.8 : 0;
  if (tvOn) { const n = tvPalette.length, u = (t * 0.25) % n, i0 = Math.floor(u), f = u - i0; tvLight.color.copy(tvPalette[i0]).lerp(tvPalette[(i0 + 1) % n], f); }
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
// ---- the other floors: two lights that follow the camera to whichever one it's on, the exit and stairs buttons
const floorLights = [pLight(0xffd8a0, 0, 7, 0, -50, 0), pLight(0xffd8a0, 0, 6, 0, -50, 0)];
let floorKey = '', floorRoom = -1;
// rooms you don't hold the key to are behind the same smoked glass as the VIP lounge
const roomTints = HOTEL_ROOMS.map((R2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(4.94, 3.15, 5.74), new THREE.MeshBasicMaterial({ color: 0x14040e, transparent: true, opacity: 0.8, depthWrite: false, fog: false })); m.position.set(R2.x0 + 2.5, 1.6, (R2.z0 + R2.z1) / 2); m.renderOrder = 4; m.visible = false; scene.add(m); return m; });
POST_HOOKS.push((dt, t) => {
  const r = roomAt(cam.tx, cam.tz), zone = zoneOf(cam.tx);
  const HR = camT.free ? null : HOTEL_ROOMS.find((Q) => ROOMS['h' + Q.i] === r);
  const key = zone === 'base' ? 'base' : HR ? 'h' : zone === 'f2' ? 'f2' : '';
  for (const R2 of HOTEL_ROOMS) roomTints[R2.i].visible = zone === 'f2' && !roomOk(R2.i);
  const [A, B] = floorLights;
  const swing = 0.12 * Math.sin(t * 0.9), swing2 = 0.06 * Math.sin(t * 1.3 + 1);
  baseBulb.rotation.z = swing; baseBulb.rotation.x = swing2;
  if (key === 'base') {
    A.color.setHex(0xffcf8a); A.position.set(100 + Math.sin(swing) * 1.1, 2.0, 0.3 - Math.sin(swing2) * 1.1); A.distance = 8; A.intensity = Math.random() < 0.015 ? 0.5 : 1.6;
    B.color.setHex(0x9affb0); B.position.set(102.9, 2.0, -0.6); B.distance = 5; B.intensity = Math.random() < 0.05 ? 0.05 : 0.45;
  } else if (key === 'f2') {
    A.color.setHex(0xffc890); A.position.set(202, 2.6, 0); A.distance = 10; A.intensity = 1.1;
    B.color.setHex(0xffc890); B.position.set(214, 2.6, 0); B.distance = 10; B.intensity = 1.1;
  } else if (key === 'h') {
    A.color.setHex(0xffd0a0); A.position.set(HR.x0 + 2.5, 2.7, HR.side * 4.1); A.distance = 7; A.intensity = 0.95;
    B.color.setHex(0xffb070); B.position.set(HR.x0 + 1.5, 1.0, HR.side * 6.5); B.distance = 4; B.intensity = 0.7;
  } else { A.intensity = 0; B.intensity = 0; }
  const room = HR ? HR.i : -1;
  if (roomCss && room !== floorRoom) {
    if (HR) { roomCss.position.set(HR.tv.x - 0.012, HR.tv.y, HR.tv.z); roomCss.scale.setScalar(HR.tv.w / 960); roomCss.element.style.display = ''; }
    else { roomCss.position.set(0, -50, 0); roomCss.element.style.display = 'none'; }
  }
  floorRoom = room;
  if (key !== floorKey) { floorKey = key; updateFloorUI(); }
});
function updateFloorUI() {
  const ex = $('exitBase'); if (ex) ex.hidden = floorKey !== 'base';
  const fb = $('floorBtn'); if (fb) { fb.textContent = floorKey === 'f2' || floorKey === 'h' ? '⇣ Downstairs' : '⇡ Upstairs'; fb.hidden = floorKey === 'base'; }
}
if ($('exitBase')) $('exitBase').onclick = () => leaveBasement();
if ($('floorBtn')) $('floorBtn').onclick = () => (floorKey === 'f2' || floorKey === 'h' ? goDownstairs() : goUpstairs());
updateFloorUI();
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
    if (vip && !vipOk() && !ch.mine) b.disabled = true;
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
let previewOutfit;
function refreshDraft() {
  renderOptions();
  removeDraft();
  const nm = $('nm').value.trim() || 'you';
  const me = crowd.find((c) => c.mine && c !== draftChar);
  const fit = previewOutfit !== undefined ? previewOutfit : me ? tuxFor(me) : '';
  const dressed = Object.assign({}, draft, { outfit: fit || undefined });
  draftChar = makeCharacter(dressed, nm, hashStr(nm.toLowerCase()));
  if (me) { draftChar.uid = me.uid; setGoldGlow(draftChar, (dressed.outfit || '').startsWith('tux-') ? dressed.outfit.slice(4) : ''); }
  if (creatorPreview) creatorPreview.show({ look: draft, uid: me && me.uid, outfit: fit || '' });
  draftChar.phase = 0.3; draftChar.act = 'dance';
  draftChar.root.position.set(0, 0, 1.2); draftChar.root.rotation.y = 0.2;
  scene.add(draftChar.root); crowd.push(draftChar);
  focusChar(draftChar);
}
const hostCustom = (code) => typeof code === 'string' && code.length >= 15 && code[14] === '9';
function hostLookFrom(code) { return hostCustom(code) ? Object.assign(codeToLook(code), { smoke: 2 }) : HOST_LOOK; }
const isHostEntry = () => !!(myEntry && myEntry.name.toLowerCase() === HOST_NAME.toLowerCase());
function openCreator() {
  // new characters start without a cigarette; they can pick one in the Smoke option
  // smokes come from the bartender and the humidor now, so the preview never has one
  draft = Object.assign(isHostEntry() ? Object.assign({}, hostLookFrom(myEntry.code)) : myEntry ? codeToLook(myEntry.code) : randomLook(Math.random), { smoke: 0 });
  if (window.SOCIAL && window.SOCIAL.creatorOpened) window.SOCIAL.creatorOpened();
  if (draft.spot === 4 && !isMod) draft.spot = 1;
  $('nm').value = myEntry ? myEntry.name : '';
  $('nmErr').hidden = true;
  $('creator').hidden = false; $('done').hidden = true; $('form').hidden = false;
  refreshDraft();
}
function closeCreator() {
  previewOutfit = undefined;
  removeDraft();
  const pw = document.getElementById('previewWin'); if (pw) pw.hidden = true;
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
  const code = lookToCode(draft) + (name.toLowerCase() === HOST_NAME.toLowerCase() ? '9' : '');
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
  $('gate').hidden = true; gateWanted = false; enteredGame = true; endTour();
  if (withSound) { startAudio(); setMuted(false); }
  else setMuted(true);
  $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? 'Sound off' : 'Sound on';
  if (window.NET && window.NET.onEnter) window.NET.onEnter(withSound);
}
$('enter').onclick = () => enterBar(true);
$('enterQuiet').onclick = () => enterBar(false);
$('mute').onclick = () => { setMuted(!muted); $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? 'Sound off' : 'Sound on'; };
$('track').onclick = () => { if (hasCharacter() || !(window.NET && window.NET.online)) changeMusic(); else { toast('Create a character to change the music.'); } };
for (const v of ['bar', 'lounge', 'dance', 'swim', 'tv', 'pool', 'card', 'sec', 'vip', 'change', 'street', 'alley', 'map']) $('v-' + v).onclick = () => setView(v);
// phones: one dropdown instead of a row of room buttons
const roomSel = $('roomSelect');
if (roomSel) roomSel.onchange = () => { const v = roomSel.value; if (v) setView(v); setTimeout(() => { roomSel.value = ''; }, 300); };
$('findMe').onclick = () => { const me = crowd.find((c) => c.mine); if (me) focusChar(me); else openCreator(); };

// ---------------------------------------------------------------- API for the room layer (net.js)
window.BAR = {
  setRegulars(list) { roster = Array.isArray(list) ? list.filter((e) => e && NAME_RE.test(e.name) && CODE_RE.test(e.code)) : []; rebuild(); },
  setMyUid(uid) { myUid = uid; rebuild(); },
  setMine(entry) { if (entry && NAME_RE.test(entry.name) && CODE_RE.test(entry.code)) { myEntry = entry; saveMine(entry); $('createBtn').textContent = 'Edit my character'; rebuild(); } },
  getMine() { return myEntry; },
  bubble: showBubble,
  setDucked,
  duck,
  setExtJazz(on) { extJazz = !!on; updateTrackUI(); },
  jukeInfo: () => ({ track: trackIdx, jazz: JAZZ_TRACKS.includes(trackIdx), ducked, muted, extJazz, running: !!(actx && actx.state === 'running') }),
  setView(v) { setView(v); },
  isHost: () => isHostEntry(),
  myUid: () => myUid,
  hotelRooms: () => HOTEL_ROOMS.map((R) => ({ i: R.i, num: R.num })),
  floor2Ok: () => floor2Ok(),
  setRanks(m) { RANKS = m || {}; applyRanks(); },
  tableOf(id) { id = id || ''; let m = id.match(/^(lt\d)-/); if (m) return m[1]; m = id.match(/^(bar-table-\d)/); if (m) return m[1]; return id.startsWith('pool-sofa') ? 'pool-sofa' : null; },
  zone: () => zoneOf(cam.tx),
  roomName: (k) => (ROOMS[k] ? ROOMS[k].name : ''),
  viewHotelRoom: () => floorRoom,
  changeMusic() { changeMusic(); },
  setTvOn(on) { tvOn = !!on; },
  setTvVideo(id) { setTvVideo(id); },
  setPokerCam(on) { setPokerCam(on); },
  pokerCount() { return pokerPlayers().length; },
  poolTable: () => POOL_TABLE,
  setPoolBalls(b) { setPoolBalls(b); },
  goTo(id) { goTo(id); },
  hasCharacter() { return hasCharacter(); },
  toast(t) { toast(t); },
  // the cinema's sound is only for people in the cinema (no character yet: whoever is looking at it)
  meInCinema() { const me = crowd.find((c) => c.mine); const sp = me && SPOT_BY_ID[me.spot]; if (sp) return sp.cat === 2; return !camT.free && roomAt(cam.tx, cam.tz) === ROOMS.tv; },
  meInVip() { const me = crowd.find((c) => c.mine); const sp = me && SPOT_BY_ID[me.spot]; return !!sp && sp.cat === 4; },
  viewRoom() { if (camT.free) return 'map'; const r = roomAt(cam.tx, cam.tz); for (const k in ROOMS) if (ROOMS[k] === r) return k; return ''; },
  getMyState() { return myState; },
  _pose(look, act, t, ph, extra) { const ch = Object.assign({ bones: {}, phase: ph || 0, look }, extra || {}); for (const k of ZERO) ch.bones[k] = { rotation: { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, position: { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } } }; pose(ch, act, 0, t); const o = {}; for (const k of ZERO) o[k] = [ch.bones[k].rotation.x, ch.bones[k].rotation.y, ch.bones[k].rotation.z, ch.bones[k].position.x, ch.bones[k].position.y, ch.bones[k].position.z]; return { o, PIV, PARENT }; },
  _car(kind, color) { const K = carParts(kind, color || [176, 18, 24]); const out = []; for (const [k, arr] of Object.entries(K)) for (const part of arr) part.tris.forEach((t, i) => out.push([t.map((v) => v.slice()), part.shade ? part.shade(t[0], norm(cross(sub(t[1], t[0]), sub(t[2], t[0]))), part.cols[i]) : part.cols[i], k])); return out; },
  _parts(look) { const r = buildParts(Object.assign(randomLook(Math.random), look), 1); if (look.buff) buffUp(r.B, r.B2); return { B: r.B, B2: r.B2 }; },
  setJukebox(i, by, fresh) {
    if (!(i >= 0 && i < TRACKS.length)) return;
    sharedTrack = i;
    if (!danceHere && i !== trackIdx) pickTrack(i);
    pinnedTrack = true;
    if (fresh) toast((by ? by + ' put on ' : 'Now playing: ') + TRACKS[i].name);
  },
  toast,
  setMod(on) {
    isMod = !!on;
    applyVipAccess();
    if (!vipOk() && roomAt(camT.tx, camT.tz) === ROOMS.vip && !(follow && follow.mine)) setView('bar');
    updateRosterUI();
    if (!creatorEl.hidden && !formEl.hidden) renderOptions();
  },
  focusTv() { setView('tv'); },
  focusVipTv() { setView('viptv'); },
  openCreator,
  // v42
  setVipMember(on) { vipMember = !!on; applyVipAccess(); rebuild(); },
  setInv(v) { inv = v || {}; rebuild(); if (draft && creatorPreview) creatorPreview.show({ look: draft, uid: myUid }); },
  makePreview(cv) { return makePreview(cv); },
  myLook() { return myLook(); },
  previewDraft(outfit) { if (outfit !== undefined) previewOutfit = outfit; if (draft) refreshDraft(); },
  setBuffs(v) { buffs = v || {}; rebuild(); },
  costumes: () => Object.fromEntries(Object.entries(COSTUMES).map(([k, c]) => [k, c.name])),
  setPerks(p) { perks = p || {}; rebuild(); },
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
  golfCourse: () => ({ holes: GOLF.holes, bounds: GOLF.bounds, surface: golfSurface }),
  golfSetBalls, golfAim, golfSetPlayers, golfCam,
  myUid: () => myUid,
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
// ---- the loading tour: once the bar is built the loading screen thins out and the camera drifts through a few rooms,
// which also gets every room's shaders ready before you walk in
const TOUR = [['bar', 'Polishing the bar…'], ['dance', 'Warming up the dance floor…'], ['pool', 'Racking the pool table…'], ['lounge', 'Plumping the cushions…'], ['street', 'Lighting the neon…']];
let touring = false, tourI = 0, tourT = 0, gateWanted = false, enteredGame = false;
function tourShot(i) {
  const [v, label] = TOUR[i % TOUR.length];
  if (VIEWS[v]) { follow = null; cutTo(() => { Object.assign(camT, VIEWS[v]); camT.free = false; }); }
  if (window.LOAD) window.LOAD.set(Math.min(100, 70 + i * 6), i >= TOUR.length - 1 ? 'Ready.' : label);
}
function startTour() {
  if (enteredGame) { $('loading').hidden = true; if (window.LOAD) window.LOAD.done(); return; }   // clicked in before the bar finished loading
  // phones skip the tour: straight to the welcome card over a still view of the bar
  if (LITE) { $('loading').hidden = true; if (window.LOAD) window.LOAD.done(); $('gate').classList.add('tour'); return; }
  touring = true; tourI = 0; tourT = 0;
  gateWanted = !$('gate').hidden; $('gate').hidden = true;   // the welcome card waits until the loading bar is done
  $('loading').classList.add('tour'); $('gate').classList.add('tour');
  tourShot(0);
}
function tourHook(dt) {
  if (!touring) return;
  camT.yaw += dt * 0.07;
  const now = performance.now();
  if (!tourT) tourT = now;
  if (now - tourT > 2600) {
    tourT = now; tourI++;
    if (tourI >= TOUR.length) { touring = false; return; }   // one lap is enough; rest on the last shot
    if (tourI === TOUR.length - 1 && !$('loading').hidden) { tourShot(tourI); setTimeout(() => { $('loading').hidden = true; $('gate').hidden = gateWanted ? false : $('gate').hidden; if (window.LOAD) window.LOAD.done(); }, 900); }
    else tourShot(tourI);
  }
}
function endTour() {
  if (!touring && !$('gate').classList.contains('tour')) return;
  touring = false; $('loading').hidden = true; $('gate').classList.remove('tour');
  setView('bar');
}
(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('28px "VT323"'), document.fonts.load('46px "Limelight"')]).catch(() => { }) : Promise.resolve()).then(() => {
  drawNeon(true);
  rebuild();
  startTour();
  if (window.NET && window.NET.start) window.NET.start();
});
tick();
})();
