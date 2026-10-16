/* Motor WebGL: frascos de cristal PBR, estudio de joyería y niebla dorada. Requiere THREE r150. */
(function () {
  'use strict';
  var T = window.THREE;

  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- Familia olfativa → color del líquido ---------- */
  function kind(p) {
    var f = (p.family || '').toLowerCase(), all = (p.top.concat(p.heart, p.base)).join(' ').toLowerCase();
    if (/cuero/.test(f) || /cuero|tabaco/.test(all) && /oriental|ámbar|amader/.test(f)) return 'leather';
    if (/acuátic|cítric|verde/.test(f)) return 'fresh';
    if (/gourmand|vainilla/.test(f)) return 'gourmand';
    if (/oriental|ámbar|especiad|almizcle|amader|chipre/.test(f)) return /chipre/.test(f) ? 'chypre' : 'warm';
    if (/floral|frutal|aldeh/.test(f)) return 'floral';
    if (/aromát|fougère/.test(f)) return 'fresh';
    if (/limón|bergamota|marin|menta/.test(all)) return 'fresh';
    if (/rosa|jazm|peon/.test(all)) return 'floral';
    return 'warm';
  }
  var BASE = { fresh: 0x86dccf, floral: 0xf3b6c6, warm: 0xe0a03a, leather: 0xa9611f, gourmand: 0xd98a2b, chypre: 0xc7b05a };
  function liquidColor(p) {
    var c = new T.Color(BASE[kind(p)]), h = hash(p.id), hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h + ((h % 21) - 10) / 400, Math.min(1, hsl.s * (0.9 + (h >> 5) % 20 / 100)), Math.max(0.35, Math.min(0.75, hsl.l + (((h >> 9) % 15) - 7) / 100)));
    return c;
  }

  /* ---------- Texturas auxiliares ---------- */
  function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  function sprite() {
    return canvasTex(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(196,146,74,.95)'); g.addColorStop(0.4, 'rgba(206,160,96,.45)'); g.addColorStop(1, 'rgba(206,160,96,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  }
  function envTexture() {
    return canvasTex(1024, 512, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f4ecde'); g.addColorStop(0.55, '#d8c7ad'); g.addColorStop(1, '#8a6b4f'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      function box(px, py, bw, bh, col, blur) { x.save(); x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = col; x.fillRect(px, py, bw, bh); x.restore(); }
      box(90, 60, 210, 230, '#ffffff', 50); box(440, 30, 150, 280, '#fffaf0', 50); box(700, 80, 70, 240, '#ffffff', 30); box(860, 50, 140, 220, '#fff4de', 50); box(0, 10, w, 30, '#ffffff', 30);
      x.fillStyle = '#3a2216'; x.fillRect(340, 90, 22, 220); x.fillRect(640, 100, 16, 200); x.fillRect(820, 110, 26, 190); x.fillRect(40, 320, 940, 10);
    });
  }
  function backdropTex(col) {
    var c = new T.Color(col), tint = new T.Color(0xeadcc4).lerp(c, 0.46), edge = new T.Color(0xb99f7e).lerp(c, 0.26), ts = '#' + tint.getHexString(), es = '#' + edge.getHexString();
    return canvasTex(512, 640, function (x, w, h) {
      var g = x.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.5, h * 0.78); g.addColorStop(0, ts); g.addColorStop(1, es); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.save(); x.translate(w * 0.5, h * 0.4); x.rotate(-0.55);
      for (var i = -2; i <= 2; i++) { var gg = x.createLinearGradient(i * 150 - 40, 0, i * 150 + 40, 0); gg.addColorStop(0, 'rgba(90,55,30,0)'); gg.addColorStop(0.5, 'rgba(90,55,30,.11)'); gg.addColorStop(1, 'rgba(90,55,30,0)'); x.fillStyle = gg; x.fillRect(i * 150 - 40, -700, 80, 1400); }
      x.restore();
      var fl = x.createLinearGradient(0, h * 0.62, 0, h); fl.addColorStop(0, 'rgba(120,80,50,0)'); fl.addColorStop(1, 'rgba(120,80,50,.28)'); x.fillStyle = fl; x.fillRect(0, h * 0.62, w, h * 0.38);
    });
  }

  /* ---------- Etiqueta metálica grabada ---------- */
  function plateTexture(p) {
    return canvasTex(512, 320, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f6efe1'); g.addColorStop(1, '#e6d9c3'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(91,51,34,.8)'; x.lineWidth = 4; x.strokeRect(14, 14, w - 28, h - 28); x.lineWidth = 1.2; x.strokeRect(24, 24, w - 48, h - 48);
      x.fillStyle = '#4a2818'; x.textAlign = 'center';
      x.font = '400 30px "Jost", Arial, sans-serif'; x.fillText(String(p.id).replace('NICH', 'N·'), w / 2, 76);
      var n = p.name, size = 50; do { x.font = '400 ' + size + 'px "Instrument Serif", Georgia, serif'; size -= 2; } while (x.measureText(n).width > w - 90 && size > 22);
      if (x.measureText(n).width > w - 90) { var parts = n.split(' '), half = Math.ceil(parts.length / 2); x.font = '400 34px "Instrument Serif", Georgia, serif'; x.fillText(parts.slice(0, half).join(' '), w / 2, 138); x.fillText(parts.slice(half).join(' '), w / 2, 178); }
      else x.fillText(n, w / 2, 160);
      x.font = '300 24px "Jost", Arial, sans-serif'; var hs = p.house, hsz = 24; while (x.measureText(hs).width > w - 100 && hsz > 14) { hsz--; x.font = '300 ' + hsz + 'px "Jost", Arial, sans-serif'; }
      x.fillText(hs, w / 2, 232); x.fillRect(w / 2 - 36, 254, 72, 2);
    });
  }

  /* ---------- Construcción procedural del frasco ---------- */
  var GOLD = new T.MeshStandardMaterial({ color: 0xd9b45c, metalness: 1.0, roughness: 0.15 });
  function lathe(pts, seg) { var curve = new T.SplineCurve(pts.map(function (a) { return new T.Vector2(a[0], a[1]); })); return new T.LatheGeometry(curve.getPoints(70), seg || 64); }
  function rrShape(w, h, r) { var s = new T.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + r); return s; }
  function slab(w, h, d, r, b) { var g = new T.ExtrudeGeometry(rrShape(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 6, curveSegments: 14 }); g.translate(0, 0, -d / 2); return g; }

  var PROFILES = {
    0: { name: 'slab' },
    1: { name: 'flask', pts: [[0.001, -1.3], [0.85, -1.28], [1.05, -0.8], [1.0, 0.0], [0.8, 0.7], [0.36, 1.05], [0.3, 1.3]], liq: [[0.001, -1.2], [0.75, -1.18], [0.93, -0.75], [0.88, 0.0], [0.66, 0.5], [0.3, 0.7], [0.001, 0.72]], top: 1.3, labelY: -0.3, labelR: 1.03, labelW: 1.0, labelH: 0.62 },
    2: { name: 'tower', pts: [[0.001, -1.5], [0.7, -1.5], [0.74, -1.4], [0.74, 1.0], [0.52, 1.2], [0.3, 1.3]], liq: [[0.001, -1.4], [0.62, -1.4], [0.64, -1.3], [0.64, 0.8], [0.001, 0.82]], top: 1.3, labelY: -0.2, labelR: 0.75, labelW: 0.95, labelH: 0.58 },
    3: { name: 'gem' },
    4: { name: 'drop', pts: [[0.001, -1.3], [0.6, -1.28], [1.0, -0.7], [0.88, 0.1], [0.46, 0.8], [0.28, 1.15], [0.28, 1.3]], liq: [[0.001, -1.2], [0.52, -1.18], [0.88, -0.7], [0.76, 0.05], [0.4, 0.55], [0.001, 0.58]], top: 1.3, labelY: -0.45, labelR: 0.94, labelW: 0.95, labelH: 0.6 }
  };
  function shapeFor(p) {
    var h = hash(p.id), pool = p.g === 'H' ? [0, 2, 3, 0] : p.g === 'M' ? [1, 4, 2, 1] : [0, 1, 3, 2, 4];
    return pool[h % pool.length];
  }

  function buildBottle(p) {
    var id = shapeFor(p), prof = PROFILES[id], group = new T.Group(), liqCol = liquidColor(p);
    var glassMat = new T.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.95, thickness: 1.2, roughness: 0.08, ior: 1.52, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new T.Color(0xd9b98c), attenuationDistance: 1.1, side: T.FrontSide });
    // Líquido opaco y saturado: así entra en el buffer de transmisión y se ve a través del cristal sobre el fondo claro.
    var deep = liqCol.clone(), hs = {}; deep.getHSL(hs); deep.setHSL(hs.h, Math.min(1, hs.s * 1.2), Math.max(0.3, Math.min(0.62, hs.l * 0.9))); if (deep.convertSRGBToLinear) deep.convertSRGBToLinear();
    var liqMat = new T.MeshPhysicalMaterial({ color: deep, emissive: deep, emissiveIntensity: 0.1, roughness: 0.14, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.55 });
    var glass, liquid, topY, capY, plate, labelMat = new T.MeshStandardMaterial({ map: plateTexture(p), metalness: 0.85, roughness: 0.32, envMapIntensity: 1.2 });
    var cap;
    if (id === 0) {
      glass = new T.Mesh(slab(1.7, 2.3, 1.0, 0.22, 0.12), glassMat);
      liquid = new T.Mesh(slab(1.42, 1.5, 0.74, 0.16, 0.06), liqMat); liquid.position.y = -0.28;
      topY = 1.27; plate = new T.Mesh(new T.PlaneGeometry(1.15, 0.72), labelMat); plate.position.set(0, -0.15, 0.64 + 0.01);
      cap = new T.Mesh(slab(0.95, 0.62, 0.62, 0.1, 0.05), GOLD); cap.position.y = topY + 0.5;
    } else if (id === 3) {
      glass = new T.Mesh(new T.CylinderGeometry(0.8, 1.0, 2.4, 8, 1), glassMat); glass.rotation.y = Math.PI / 8;
      liquid = new T.Mesh(new T.CylinderGeometry(0.66, 0.84, 1.55, 8, 1), liqMat); liquid.rotation.y = Math.PI / 8; liquid.position.y = -0.38;
      topY = 1.2; plate = new T.Mesh(new T.PlaneGeometry(0.92, 0.6), labelMat); plate.position.set(0, -0.2, 0.9 * Math.cos(Math.PI / 8) + 0.015);
      plate.position.z = 0.9 * 0.9239 + 0.0; var nk = new T.Mesh(new T.CylinderGeometry(0.25, 0.3, 0.3, 24), GOLD); nk.position.y = topY + 0.1; group.add(nk);
      cap = new T.Mesh(new T.CylinderGeometry(0.28, 0.6, 0.75, 8), GOLD); cap.position.y = topY + 0.62;
    } else {
      glass = new T.Mesh(lathe(prof.pts), glassMat); liquid = new T.Mesh(lathe(prof.liq), liqMat); liquid.position.y = 0;
      topY = prof.top; var th = prof.labelW / prof.labelR;
      plate = new T.Mesh(new T.CylinderGeometry(prof.labelR + 0.012, prof.labelR + 0.012, prof.labelH, 40, 1, true, -th / 2, th), labelMat); plate.position.y = prof.labelY;
      var nk2 = new T.Mesh(new T.CylinderGeometry(0.2, 0.26, 0.22, 24), GOLD); nk2.position.y = topY + 0.05; group.add(nk2);
      if (id === 1 || id === 4) cap = new T.Mesh(id === 1 ? new T.IcosahedronGeometry(0.46, 1) : new T.SphereGeometry(0.4, 32, 24), GOLD);
      else cap = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.9, 10), GOLD);
      cap.position.y = topY + (id === 2 ? 0.62 : 0.55);
    }
    var ring = new T.Mesh(new T.TorusGeometry(0.3, 0.045, 14, 40), GOLD); ring.rotation.x = Math.PI / 2; ring.position.y = topY - 0.02; group.add(ring);
    group.add(glass, liquid, plate, cap);
    // ejes de altura normalizada
    var top = cap.position.y + 0.5, bottom = id === 2 ? -1.5 : (id === 0 ? -1.27 : (id === 3 ? -1.2 : -1.3));
    var s = 3.5 / (top - bottom); group.scale.setScalar(s); group.position.y = -(top + bottom) / 2 * s;
    var wrap = new T.Group(); wrap.add(group); wrap.userData = { liquid: liqMat, color: liqCol, height: 3.5, bottomY: -1.75 };
    return wrap;
  }
  /* ---------- Foto real del frasco sobre el pedestal (recorrido) ---------- */
  var cutCache = {};
  function loadCut(url, cb) {
    if (cutCache[url]) return cb(cutCache[url]);
    if (cutWait[url]) { cutWait[url].push(cb); return; }
    cutWait[url] = [cb];
    var im = new Image();
    function finish(t) { var w = cutWait[url]; delete cutWait[url]; w.forEach(function (f) { f(t); }); }
    function made() { var t = new T.Texture(im); t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true; t.userData.shared = true; cutCache[url] = t; finish(t); }
    // decode() descomprime la imagen fuera del hilo principal, así no se atasca al usarla
    im.onload = function () { if (im.decode) im.decode().then(made, made); else made(); };
    im.onerror = function () { finish(null); };
    im.src = url;
  }
  var cutWait = {};
  var SHADOW = null;
  function shadowTex() { return SHADOW || (SHADOW = canvasTex(128, 128, function (x) { var g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(60,34,18,.55)'); g.addColorStop(0.55, 'rgba(60,34,18,.22)'); g.addColorStop(1, 'rgba(60,34,18,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); })); }
  function buildPhotoProduct(p, url, done) {
    var wrap = new T.Group(), col = liquidColor(p), H = 3.25;
    var mat = new T.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
    var plane = new T.Mesh(new T.PlaneGeometry(1, 1), mat); plane.visible = false; wrap.add(plane);
    var sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.set(0, -1.74, 0); sh.scale.set(2.6, 1.1, 1); sh.userData.keepMap = true; wrap.add(sh);
    loadCut(url, function (t) {
      if (t && plane.parent) {
        var asp = t.image.width / t.image.height, w = Math.min(H * asp, 3.4), h = w / asp;
        plane.scale.set(w, h, 1); plane.position.y = -1.75 + h / 2; mat.map = t; mat.opacity = 1; mat.needsUpdate = true; plane.visible = true;
        sh.scale.set(Math.max(1.6, w * 0.95), 0.9, 1);
      }
      if (done) done(!!t);
    });
    wrap.userData = { color: col, photo: true, height: 3.5, bottomY: -1.75 };
    return wrap;
  }
  function disposeTree(o) {
    o.traverse(function (n) { if (n.geometry) n.geometry.dispose(); if (n.material && n.material !== GOLD) { if (n.material.map && !(n.material.map.userData && n.material.map.userData.shared) && !n.userData.keepMap) n.material.map.dispose(); n.material.dispose(); } });
  }


  /* ---------- Decorado de lujo por fragancia: pedestal + atrezo según familia ---------- */
  var MARBLE = null;
  function marbleTex() {
    if (MARBLE) return MARBLE;
    MARBLE = canvasTex(512, 512, function (x, w, h) {
      x.fillStyle = '#f1ebe1'; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 30; i++) {
        x.strokeStyle = 'rgba(' + (85 + Math.random() * 55 | 0) + ',' + (80 + Math.random() * 45 | 0) + ',' + (78 + Math.random() * 40 | 0) + ',' + (0.07 + Math.random() * 0.2) + ')'; x.lineWidth = 0.5 + Math.random() * 2.4; x.beginPath();
        var px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py);
        for (var j = 0; j < 7; j++) { px += (Math.random() - 0.3) * 150; py += (Math.random() - 0.5) * 100; x.quadraticCurveTo(px + (Math.random() - 0.5) * 90, py + (Math.random() - 0.5) * 90, px, py); }
        x.stroke();
      }
      x.strokeStyle = 'rgba(196,152,64,.32)'; x.lineWidth = 1.2; for (var k = 0; k < 5; k++) { x.beginPath(); x.moveTo(Math.random() * w, 0); x.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.6, Math.random() * w, h); x.stroke(); }
    });
    MARBLE.wrapS = MARBLE.wrapT = T.RepeatWrapping; MARBLE.userData.shared = true; return MARBLE;
  }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pmat(col, o) { o = o || {}; var m = new T.MeshPhysicalMaterial({ color: col, roughness: o.r == null ? 0.4 : o.r, metalness: o.m || 0, clearcoat: o.cc || 0, transmission: o.t || 0, thickness: o.th || 0, ior: o.ior || 1.45, envMapIntensity: 1.2, sheen: o.sheen || 0, sheenColor: new T.Color(0xffffff) }); return m; }

  function makeSet(p) {
    var g = new T.Group(), h = hash(p.id), R = rng(h * 7 + 3), k = kind(p), v = h % 4, top = -1.8, anim = [];
    var dark = new T.MeshStandardMaterial({ color: 0xb89a74, metalness: 0.05, roughness: 0.8 });
    function add(m) { g.add(m); return m; }
    function ring(r, y, tube) { var t = new T.Mesh(new T.TorusGeometry(r, tube || 0.022, 12, 110), GOLD); t.rotation.x = Math.PI / 2; t.position.y = y; return add(t); }
    if (v === 0) { var d = add(new T.Mesh(new T.CylinderGeometry(1.5, 1.68, 0.26, 72), new T.MeshStandardMaterial({ color: 0xc2a47c, metalness: 0.05, roughness: 0.74 }))); d.position.y = top - 0.13; ring(1.51, top, 0.024); }
    else if (v === 1) {
      var tx = marbleTex().clone(); tx.needsUpdate = true; tx.userData.shared = true; tx.repeat.set(2, 1);
      var mb = add(new T.Mesh(new T.CylinderGeometry(1.42, 1.5, 0.62, 72), new T.MeshPhysicalMaterial({ map: marbleTex(), color: 0xffffff, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }))); mb.position.y = top - 0.31; ring(1.43, top - 0.01, 0.03); ring(1.5, top - 0.6, 0.02);
    } else if (v === 2) {
      var bx = add(new T.Mesh(new T.BoxGeometry(2.9, 0.5, 2.3), dark)); bx.position.y = top - 0.25;
      var pl = add(new T.Mesh(new T.BoxGeometry(3.05, 0.08, 2.45), GOLD)); pl.position.y = top - 0.54;
    } else {
      var lo = add(new T.Mesh(new T.CylinderGeometry(1.75, 1.85, 0.2, 72), GOLD)); lo.position.y = top - 0.4;
      var up = add(new T.Mesh(new T.CylinderGeometry(1.35, 1.45, 0.32, 72), dark)); up.position.y = top - 0.16; ring(1.36, top, 0.02);
    }
    function ground() { var a = R() * 6.283, rad = 0.95 + R() * 0.4, x = Math.cos(a) * rad, z = Math.sin(a) * rad * 0.8; if (z > 0.35 && Math.abs(x) < 0.95) x = (x < 0 ? -1 : 1) * 1.05; return [x, z]; }
    function floaty() { var sx = R() < 0.5 ? -1 : 1; return [sx * (1.5 + R() * 1.9), -1.1 + R() * 3.3, -2.2 + R() * 3.0]; }
    function fl(m, pos, sp) { m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(R() * 6, R() * 6, R() * 6); add(m); anim.push({ m: m, y0: pos[1], s: 0.5 + R() * sp, ph: R() * 6, r: (R() - 0.5) * 0.02 }); }
    var i, m, q;
    if (k === 'floral') {
      var pg = new T.SphereGeometry(0.17, 14, 10);
      for (i = 0; i < 24; i++) { m = new T.Mesh(pg, pmat(new T.Color().setHSL(0.96 + R() * 0.04, 0.55 + R() * 0.3, 0.68 + R() * 0.15), { r: 0.5, sheen: 1 })); m.scale.set(1 + R() * 0.4, 0.22, 0.7 + R() * 0.3); if (i < 9) { q = ground(); m.position.set(q[0], top + 0.03, q[1]); m.rotation.set(0, R() * 6, 0); add(m); } else fl(m, floaty(), 1); }
    } else if (k === 'fresh') {
      var bg = new T.SphereGeometry(1, 20, 14);
      for (i = 0; i < 20; i++) { m = new T.Mesh(bg, pmat(0xcff7f1, { r: 0, t: 1, th: 0.5, ior: 1.33 })); var sc = 0.05 + R() * 0.17; m.scale.setScalar(sc); if (i < 6) { q = ground(); m.position.set(q[0], top + sc * 0.9, q[1]); add(m); } else fl(m, floaty(), 1.2); }
    } else if (k === 'chypre') {
      var lg = new T.SphereGeometry(0.2, 14, 10);
      for (i = 0; i < 20; i++) { m = new T.Mesh(lg, pmat(new T.Color().setHSL(0.2 + R() * 0.08, 0.45, 0.32 + R() * 0.15), { r: 0.45, m: 0.2 })); m.scale.set(1.5, 0.06, 0.55); if (i < 7) { q = ground(); m.position.set(q[0], top + 0.03, q[1]); m.rotation.set(0, R() * 6, 0); add(m); } else fl(m, floaty(), 0.8); }
    } else if (k === 'gourmand') {
      var cg = new T.SphereGeometry(0.14, 16, 12);
      for (i = 0; i < 12; i++) { m = new T.Mesh(cg, pmat(0x2a160c, { r: 0.28, cc: 1 })); m.scale.set(1, 0.7, 1.35); q = ground(); m.position.set(q[0], top + 0.09, q[1]); m.rotation.set(R(), R() * 6, R()); add(m); }
    } else if (k === 'leather') {
      var r1 = ring(2.5, 0.2, 0.018), r2 = ring(3.1, 0.6, 0.014); r1.rotation.x = 1.25; r2.rotation.x = 1.75; r2.rotation.z = 0.4; anim.push({ m: r1, spin: 0.002 }, { m: r2, spin: -0.0014 });
    }
    var fg = new T.OctahedronGeometry(0.07, 0), nf = k === 'warm' ? 30 : 14;
    for (i = 0; i < nf; i++) { m = new T.Mesh(fg, GOLD); m.scale.setScalar(0.5 + R() * 1.2); fl(m, floaty(), 1.4); }
    g.userData.anim = anim; return g;
  }
  function animSet(g, t) { var a = g.userData.anim; for (var i = 0; i < a.length; i++) { var o = a[i]; if (o.spin) { o.m.rotation.z += o.spin; continue; } o.m.position.y = o.y0 + Math.sin(t * o.s + o.ph) * 0.12; o.m.rotation.y += o.r; o.m.rotation.x += o.r * 0.6; } }

  /* ---------- Escena de estudio compartida ---------- */
  function addStudio(scene, renderer, tint) {
    var pm = new T.PMREMGenerator(renderer), env = pm.fromEquirectangular(envTexture()).texture; scene.environment = env;
    var key = new T.DirectionalLight(0xfff0d6, 1.25); key.position.set(4, 5, 5);
    var fill = new T.DirectionalLight(0xffffff, 0.45); fill.position.set(-5, 1, 4);
    var rim = new T.DirectionalLight(0xffffff, 1.0); rim.position.set(-2, 3.5, -6);
    var rim2 = new T.DirectionalLight(0xffe8c4, 0.7); rim2.position.set(5, 1, -4);
    var glow = new T.PointLight(0xffd9a0, 0.7, 10, 1.4); glow.position.set(0, 0.3, -2.4);
    scene.add(key, fill, rim, rim2, glow, new T.HemisphereLight(0xfff6e8, 0xb99b7a, 0.28), new T.AmbientLight(0xffffff, 0.08));
    var back = new T.Mesh(new T.PlaneGeometry(26, 32), new T.MeshBasicMaterial({ map: backdropTex(tint || 0xd9a441) })); back.position.z = -6; scene.add(back);
    var ped = new T.Mesh(new T.CylinderGeometry(1.5, 1.68, 0.26, 64), new T.MeshStandardMaterial({ color: 0xd8c4a8, metalness: 0.1, roughness: 0.6 })); ped.position.y = -1.95; scene.add(ped);
    var ringMat = new T.MeshStandardMaterial({ color: 0xd9b45c, metalness: 1, roughness: 0.2 });
    var gr = new T.Mesh(new T.TorusGeometry(1.51, 0.022, 12, 96), ringMat); gr.rotation.x = Math.PI / 2; gr.position.y = -1.79; scene.add(gr);
    return { back: back, ped: ped, ring: gr, pm: pm, env: env, glow: glow };
  }

  /* ---------- Visor interactivo 360° (hero y modal) ---------- */
  function Studio(canvas, opts) {
    var self = this; opts = opts || {};
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputEncoding = T.sRGBEncoding; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.9;
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(32, 1, 0.1, 60); this.zf = 1; this.dist = 11; this.camera.position.set(0, 0.2, this.dist);
    this.stage = addStudio(this.scene, this.renderer, 0xd9a441);
    this.rig = new T.Group(); this.scene.add(this.rig); this.stage.ped.visible = false; this.stage.ring.visible = false; this.set = null;
    this.pivot = new T.Group(); this.rig.add(this.pivot);
    this.scrollMode = false; this.tYaw = 0.5; this.tzf = 1; this.offX = 0; this.offY = 0; this.pop = 1; this.paused = false;
    this.yaw = 0.5; this.pitch = 0.08; this.vyaw = 0; this.vpitch = 0; this.drag = false; this.auto = true; this.idle = 0;
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mouse = new T.Vector3(99, 99, 0); this.t = 0; this.visible = true; this.bottle = null;
    // Niebla dorada con física de amortiguación elástica
    var N = this.N = 260; this.pos = new Float32Array(N * 3); this.home = new Float32Array(N * 3); this.vel = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) { var a = Math.random() * Math.PI * 2, r = 1.8 + Math.random() * 3.4; this.home[i * 3] = Math.cos(a) * r; this.home[i * 3 + 1] = (Math.random() - 0.5) * 6.4; this.home[i * 3 + 2] = Math.sin(a) * r * 0.6 - 0.5; this.pos[i * 3] = this.home[i * 3]; this.pos[i * 3 + 1] = this.home[i * 3 + 1]; this.pos[i * 3 + 2] = this.home[i * 3 + 2]; }
    this.pgeo = new T.BufferGeometry(); this.pgeo.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    this.points = new T.Points(this.pgeo, new T.PointsMaterial({ map: sprite(), size: 0.2, transparent: true, depthWrite: false, blending: T.NormalBlending, opacity: 0.7 }));
    this.scene.add(this.points);
    // Interacción
    var last = { x: 0, y: 0 };
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', function (e) { self.drag = true; self.auto = false; last.x = e.clientX; last.y = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (x) { } canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointerup', function (e) { self.drag = false; self.idle = 0; canvas.style.cursor = 'grab'; try { canvas.releasePointerCapture(e.pointerId); } catch (x) { } });
    canvas.addEventListener('pointercancel', function () { self.drag = false; });
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect(), nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      var v = new T.Vector3(nx, ny, 0.5).unproject(self.camera).sub(self.camera.position).normalize(); var k = -self.camera.position.z / v.z; self.mouse.copy(self.camera.position).addScaledVector(v, k);
      if (self.drag) { var dx = e.clientX - last.x, dy = e.clientY - last.y; last.x = e.clientX; last.y = e.clientY; self.vyaw = dx * 0.012; self.vpitch = dy * 0.006; self.yaw += self.vyaw; self.pitch = Math.max(-0.5, Math.min(0.6, self.pitch + self.vpitch)); }
    });
    canvas.addEventListener('pointerleave', function () { self.mouse.set(99, 99, 0); });
    canvas.addEventListener('wheel', function (e) { if (e.ctrlKey || opts.wheelZoom) { e.preventDefault(); self.zoom(e.deltaY > 0 ? 1 : -1); } }, { passive: false });
    canvas.style.cursor = 'grab';
    canvas.setAttribute('tabindex', '0');
    canvas.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { self.yaw -= 0.2; self.auto = false; } else if (e.key === 'ArrowRight') { self.yaw += 0.2; self.auto = false; } else if (e.key === '+') self.zoom(-1); else if (e.key === '-') self.zoom(1); });
    if ('ResizeObserver' in window) { this.ro = new ResizeObserver(function () { self.resize(); }); this.ro.observe(canvas.parentElement || canvas); }
    if ('IntersectionObserver' in window) { this.io = new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; }); this.io.observe(canvas); }
    this.resize(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  Studio.prototype.resize = function () {
    var p = this.canvas.parentElement, w = Math.max(160, p.clientWidth), h = Math.max(200, p.clientHeight);
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.fov = 32; this.camera.updateProjectionMatrix();
    var th = 2 * Math.tan(this.camera.fov * Math.PI / 360); this.fit = Math.max(6.4 / th, 4.0 / (th * this.camera.aspect)) * 1.05; this.dist = this.fit * this.zf;
  };
  Studio.prototype.zoom = function (d) { this.zf = Math.max(0.55, Math.min(1.4, this.zf + d * 0.15)); this.dist = this.fit * this.zf; };
  /* Un "plano" completo de un perfume: decorado, frasco y fondo. Los del recorrido se guardan
     y se calientan antes de que el visitante baje, para que cambiar de capítulo no cueste nada. */
  function buildEntry(p, cut) {
    var col = liquidColor(p), e = { p: p, col: col, set: makeSet(p), back: backdropTex(col.getHex()), ready: !cut, primed: false, wait: [] };
    if (cut) {
      e.bottle = buildPhotoProduct(p, cut, function (ok) {
        if (!ok) { e.bottle = buildBottle(p); if (e.keep) e.bottle.userData.cached = true; }
        e.ready = true; var w = e.wait; e.wait = []; w.forEach(function (f) { f(); });
      });
    } else e.bottle = buildBottle(p);
    return e;
  }
  function keepEntry(e) { e.keep = true; e.set.userData.cached = true; e.back.userData.cached = true; if (e.bottle) e.bottle.userData.cached = true; return e; }
  Studio.prototype.entry = function (p, force3d) {
    var cut = !force3d && window.CUTS && window.CUTS[p.id], c = this.cache || (this.cache = {});
    if (!force3d && c[p.id]) return c[p.id];
    var e = buildEntry(p, cut);
    if (!force3d) c[p.id] = keepEntry(e);
    return e;
  };
  Studio.prototype.setPerfume = function (p, pop, force3d) {
    var self = this, tk = this.tk = (this.tk || 0) + 1, e = this.entry(p, force3d);
    // Si la foto del frasco aún no ha llegado, se deja el frasco anterior en pantalla hasta que esté lista
    if (!e.ready) { e.wait.push(function () { if (tk === self.tk) self.apply(e, pop); }); return; }
    this.apply(e, pop);
  };
  Studio.prototype.apply = function (e, pop) {
    if (this.bottle) { this.pivot.remove(this.bottle); if (!this.bottle.userData.cached) disposeTree(this.bottle); }
    if (this.set) { this.rig.remove(this.set); if (!this.set.userData.cached) disposeTree(this.set); }
    this.set = e.set; this.rig.add(this.set); this.bottle = e.bottle; this.pivot.add(this.bottle); this.current = e.p;
    if (pop && !this.reduced) { this.pop = 0; this.bottle.scale.setScalar(0.001); this.burst(0.16); } else { this.pop = 1; this.bottle.scale.setScalar(1); }
    var m = this.stage.back.material; if (m.map && !m.map.userData.cached) m.map.dispose(); m.map = e.back; m.needsUpdate = true;
    this.stage.glow.color.copy(e.col).lerp(new T.Color(0xffffff), 0.25);
  };
  /* Calienta los perfumes del recorrido: carga las fotos, compila los shaders y sube todo a la GPU
     con un dibujo de 1 píxel, de uno en uno, para que el primer scroll no se quede pillado. */
  Studio.prototype.prime = function (list) {
    this.primeQ = (this.primeQ || []).concat(list); this.primeAt = this.primeAt || 0;
    list.forEach(function (p) { var u = window.CUTS && window.CUTS[p.id]; if (u) loadCut(u, function () { }); });   // descargas en paralelo
  };
  Studio.prototype.primeStep = function () {
    var q = this.primeQ; if (!q || !q.length) return;
    var now = performance.now(); if (now < this.primeAt) return;
    var p = q[0], e = this.entry(p, false);
    if (!e.ready) { if (q.length > 1) { q.push(q.shift()); } this.primeAt = now + 100; return; }   // aún descargando: probar con otro
    q.shift(); this.primeAt = now + 180;
    if (e.primed || e === this.cache[this.current && this.current.id]) { e.primed = true; return; }
    var r = this.renderer, parts = [e.set, e.bottle], fc = [];
    this.rig.add(e.set); this.pivot.add(e.bottle);
    parts.forEach(function (o) { o.traverse(function (n) { fc.push([n, n.frustumCulled]); n.frustumCulled = false; }); });
    var pl = e.bottle.children[0], tex = pl && pl.material && pl.material.map;
    if (r.initTexture) { if (tex) r.initTexture(tex); r.initTexture(e.back); }
    r.setScissorTest(true); r.setScissor(0, 0, 1, 1);
    try { r.render(this.scene, this.camera); } catch (x) { }
    r.setScissorTest(false);
    fc.forEach(function (a) { a[0].frustumCulled = a[1]; });
    this.rig.remove(e.set); this.pivot.remove(e.bottle); e.primed = true;
  };
  Studio.prototype.burst = function (strength) { for (var i = 0; i < this.N; i++) { var ix = i * 3; this.vel[ix] += (Math.random() - 0.5) * strength; this.vel[ix + 1] += Math.random() * strength; this.vel[ix + 2] += (Math.random() - 0.5) * strength; } };
  Studio.prototype.loop = function (now) {
    requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden || this.paused) return;
    this.t += 0.016;
    if (this.scrollMode) {
      if (!this.drag) { this.yaw += (this.tYaw - this.yaw) * 0.06 + this.vyaw; this.vyaw *= 0.92; this.pitch += (0.08 - this.pitch) * 0.04; }
      this.zf += (this.tzf - this.zf) * 0.05; this.dist = this.fit * this.zf;
    } else if (!this.drag) {
      this.vyaw *= 0.94; this.vpitch *= 0.9; this.yaw += this.vyaw; this.pitch += this.vpitch;
      this.pitch += (0.08 - this.pitch) * 0.02;
      if (!this.auto) { this.idle += 1; if (this.idle > 360) this.auto = true; }
      if (this.auto && !this.reduced) this.yaw += 0.005;
    }
    var wide = this.camera.aspect > 1.15, wantX = wide ? this.offX : 0, wantY = wide ? (this.offYW || 0) : this.offY; this.rig.position.x += (wantX - this.rig.position.x) * 0.07; this.rig.position.y += (wantY - this.rig.position.y) * 0.07;
    if (this.pop < 1 && this.bottle) { this.pop = Math.min(1, this.pop + 0.03); var q = this.pop - 1, e = 1 + 2.7 * q * q * q + 1.7 * q * q; this.bottle.scale.setScalar(Math.max(0.001, e)); }
    var ph = this.bottle && this.bottle.userData.photo; this.pivot.rotation.y = ph ? Math.sin(this.yaw * 0.8) * 0.5 : this.yaw; this.pivot.rotation.x = ph ? this.pitch * 0.4 : this.pitch;
    if (this.bottle) this.bottle.position.y = this.reduced ? 0 : Math.sin(this.t * 1.2) * 0.06;
    this.camera.position.z += (this.dist - this.camera.position.z) * 0.1;
    if (this.set && !this.reduced) animSet(this.set, this.t);
    var P = this.pos, V = this.vel, H = this.home, m = this.mouse;
    for (var i = 0; i < this.N; i++) {
      var ix = i * 3, iy = ix + 1, iz = ix + 2;
      V[ix] += (H[ix] - P[ix]) * 0.012; V[iy] += (H[iy] - P[iy]) * 0.012; V[iz] += (H[iz] - P[iz]) * 0.012;
      V[iy] += Math.sin(this.t + i) * 0.0012;
      var dx = P[ix] - m.x, dy = P[iy] - m.y, d2 = dx * dx + dy * dy;
      if (d2 < 2.8) { var d = Math.sqrt(d2) + 0.12, f = (1.7 - d) * 0.05; if (f > 0) { V[ix] += dx / d * f; V[iy] += dy / d * f; V[iz] += (Math.random() - 0.5) * f; } }
      V[ix] *= 0.9; V[iy] *= 0.9; V[iz] *= 0.9; P[ix] += V[ix]; P[iy] += V[iy]; P[iz] += V[iz];
    }
    this.pgeo.attributes.position.needsUpdate = true;
    if (this.primeQ && this.primeQ.length) this.primeStep();   // se dibuja antes del fotograma real, que lo tapa
    this.renderer.render(this.scene, this.camera);
  };

  /* ---------- Generador de fotos 3D por perfume (miniaturas) ---------- */
  function ThumbMaker() {
    this.W = 520; this.H = 650;
    this.gl = document.createElement('canvas'); this.gl.width = this.W; this.gl.height = this.H;
    this.renderer = new T.WebGLRenderer({ canvas: this.gl, antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1); this.renderer.setSize(this.W, this.H, false);
    this.renderer.outputEncoding = T.sRGBEncoding; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.9;
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(30, this.W / this.H, 0.1, 60);
    this.stage = addStudio(this.scene, this.renderer, 0xd9a441); this.stage.ped.visible = false; this.stage.ring.visible = false;
    this.out = document.createElement('canvas'); this.out.width = this.W; this.out.height = this.H; this.x = this.out.getContext('2d');
    this.grain = canvasTex(160, 160, function (x, w, h) { var im = x.createImageData(w, h); for (var i = 0; i < im.data.length; i += 4) { var v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); }).image;
    this.logo = new Image(); var self0 = this; this.ready = new Promise(function (res) { self0.logo.onload = res; self0.logo.onerror = res; }); this.logo.src = 'img/logo-brown.png';
    this.cache = {}; this.queue = []; this.busy = false;
  }
  /* Revelado final de "fotografía de campaña": bloom, barrido de luz, viñeta, grano y marco dorado */
  ThumbMaker.prototype.develop = function () {
    var x = this.x, W = this.W, H = this.H;
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'contrast(1.12) saturate(1.2)'; x.drawImage(this.gl, 0, 0);
    try { x.save(); x.globalCompositeOperation = 'screen'; x.filter = 'blur(14px) brightness(1.1)'; x.globalAlpha = 0.12; x.drawImage(this.gl, 0, 0); x.restore(); } catch (e) { x.restore(); }
    x.filter = 'none';
    var sw = x.createLinearGradient(0, 0, W, H); sw.addColorStop(0.3, 'rgba(255,246,225,0)'); sw.addColorStop(0.45, 'rgba(255,246,225,.1)'); sw.addColorStop(0.6, 'rgba(255,246,225,0)'); x.fillStyle = sw; x.fillRect(0, 0, W, H);
    var vg = x.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.8); vg.addColorStop(0, 'rgba(60,32,16,0)'); vg.addColorStop(1, 'rgba(60,32,16,.34)'); x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.06; x.globalCompositeOperation = 'overlay'; x.drawImage(this.grain, 0, 0, W, H); x.restore();
    var band = x.createLinearGradient(0, H - 118, 0, H); band.addColorStop(0, 'rgba(244,237,224,0)'); band.addColorStop(0.55, 'rgba(244,237,224,.93)'); band.addColorStop(1, 'rgba(244,237,224,.98)'); x.fillStyle = band; x.fillRect(0, H - 118, W, 118);
    if (this.logo && this.logo.complete && this.logo.naturalWidth) { var lw = 132, lh = lw * this.logo.naturalHeight / this.logo.naturalWidth; x.globalAlpha = 0.92; x.drawImage(this.logo, (W - lw) / 2, H - lh - 26, lw, lh); x.globalAlpha = 1; }
    x.strokeStyle = 'rgba(91,51,34,.5)'; x.lineWidth = 1; x.strokeRect(14.5, 14.5, W - 29, H - 29); x.strokeStyle = 'rgba(91,51,34,.2)'; x.strokeRect(20.5, 20.5, W - 41, H - 41);
  };
  ThumbMaker.prototype.get = function (p) {
    var self = this; if (this.cache[p.id]) return Promise.resolve(this.cache[p.id]);
    return this.ready.then(function () { return new Promise(function (res) { self.queue.push({ p: p, res: res }); self.pump(); }); });
  };
  ThumbMaker.prototype.pump = function () {
    var self = this; if (this.busy) return; var job = this.queue.shift(); if (!job) return; this.busy = true;
    var run = function () {
      var p = job.p, url;
      if (self.cache[p.id]) url = self.cache[p.id];
      else {
        var h = hash(p.id), b = buildBottle(p), set = makeSet(p);
        b.rotation.y = -0.6 + (h % 100) / 100 * 1.2; self.scene.add(b, set);
        var low = (h >> 3) % 3; self.camera.position.set(((h >> 6) % 5 - 2) * 0.18, low === 0 ? -0.15 : low === 1 ? 0.6 : 1.1, 11.2 + (h % 3) * 0.3); self.camera.lookAt(0, low === 0 ? 0.1 : -0.3, 0);
        var m = self.stage.back.material; if (m.map) m.map.dispose(); m.map = backdropTex(b.userData.color.getHex()); m.needsUpdate = true; self.stage.glow.color.copy(b.userData.color).lerp(new T.Color(0xffffff), 0.25);
        self.renderer.render(self.scene, self.camera); self.renderer.render(self.scene, self.camera);
        try { self.develop(); url = self.out.toDataURL('image/jpeg', 0.9); } catch (e) { try { url = self.gl.toDataURL('image/jpeg', 0.9); } catch (e2) { url = ''; } }
        self.scene.remove(b, set); disposeTree(b); disposeTree(set); self.cache[p.id] = url;
      }
      job.res(url); self.busy = false; setTimeout(function () { self.pump(); }, 0);
    };
    (window.requestAnimationFrame || setTimeout)(run);
  };

  window.Scent3D = { Studio: Studio, ThumbMaker: ThumbMaker, liquidColor: liquidColor, kind: kind, hash: hash, shapeFor: shapeFor };
})();
