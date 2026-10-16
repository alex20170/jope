/* Lógica de la tienda: catálogo, búsqueda difusa, ficha 3D, sommelier, layering, carrito y pedido por WhatsApp. */
(function () {
  'use strict';

  /* ===== CONFIGURACIÓN DE LA TIENDA (editar aquí) ===== */
  var SHOP = {
    name: 'Alma Perfumería',
    whatsapp: '34600000000',   // número con prefijo de país, sin + ni espacios
    currency: '€',
    prices: {}                 // opcional: { '208': 129, 'NICH1': 189 }. Sin precio se muestra "Precio a consultar"
  };

  var DATA = window.PERFUMES || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  var byId = {}; DATA.forEach(function (p) { byId[p.id] = p; });
  var GN = { M: 'Mujer', H: 'Hombre', U: 'Unisex' };

  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return k in mem ? mem[k] : d; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };

  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2400); }
  function sparks(x, y) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span'); s.className = 'spark'; s.style.left = x + 'px'; s.style.top = y + 'px';
      var a = (i / 12) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 40;
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d - 10 + 'px');
      document.body.appendChild(s); (function (n) { setTimeout(function () { n.remove(); }, 850); })(s);
    }
  }

  /* ===== Preparación de datos e índice de búsqueda ===== */
  var ALIAS = { vanilla: 'vainilla', leather: 'cuero', amber: 'ambar', sandalwood: 'sandalo', jasmine: 'jazmin', lemon: 'limon', coffee: 'cafe', wood: 'madera', musk: 'almizcle', tobacco: 'tabaco', patchouli: 'pachuli', patchouly: 'pachuli', rose: 'rosa', chocolate: 'cacao', orange: 'naranja', coconut: 'coco', incense: 'incienso', woody: 'amader', fresh: 'fresc' };
  DATA.forEach(function (p) {
    p._n = norm(p.name); p._o = norm(p.house);
    p._notes = norm(p.top.concat(p.heart, p.base).join(' ')); p._f = norm(p.family || '');
    p._h = [p._n, p._o, p._f, p._notes, norm(p.id)].join(' ');
    p._w = {}; p._h.split(/[^a-z0-9]+/).forEach(function (w) { if (w.length > 2) p._w[w] = 1; }); p._w = Object.keys(p._w);
    p.isNicho = p.c === 'N';
  });
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 9;
    var prev = [], i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) { var cur = [i]; for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  function scoreP(p, toks) {
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = ALIAS[toks[i]] || toks[i], s = 0;
      if (norm(p.id) === t) s = 8;
      else if (p._n.indexOf(t) === 0) s = 6;
      else if (p._n.indexOf(t) > -1) s = 5;
      else if (p._o.indexOf(t) > -1) s = 4;
      else if (p._notes.indexOf(t) > -1) s = 2.5;
      else if (p._f.indexOf(t) > -1) s = 1.8;
      else if (t.length >= 4) { for (var k = 0; k < p._w.length; k++) { if (lev(t, p._w[k]) <= 1) { s = 1.2; break; } } }
      if (!s) return 0; total += s;
    }
    return total;
  }

  /* ===== Acordes y afinidad ===== */
  var AX = ['Cítrico', 'Floral', 'Amaderado', 'Dulce', 'Especiado', 'Fresco', 'Ámbar y almizcle', 'Cuero y humo'];
  var AXC = ['#c79a1e', '#c8587a', '#7b5632', '#d0692a', '#a8372a', '#2f9c8c', '#7d5fb0', '#6e625b'];
  var KW = [
    /bergamota|lim[oó]n|lima|naranja|mandarina|toronja|pomelo|c[ií]tric|yuzu|neroli|petit grain|kumquat|abr[oó]tano/,
    /rosa|jazm|azahar|peon|iris|nardos|muguete|lirio|orqu[ií]d|gardenia|magnolia|fresia|violeta|ylang|azucena|heliotropo|flor|lila|geranio|floral|camelia|mimosa/,
    /cedro|s[aá]ndalo|vetiver|pachul|oud|aoud|madera|musgo|cipr[eé]s|roble|abedul|gaiac|amberwood|amader|palo de rosa|pino|caoba|cashmeran|cachemira/,
    /vainilla|caramelo|prelin|praliné|haba tonka|cacao|chocolate|miel|az[uú]car|caf[eé]|coco|almendra|crema|fresa|algod[oó]n|gourmand|golos[oa]|dulce|frutos secos|helado|pistacho|dátil|datil/,
    /pimienta|canela|clavo|jengibre|cardamomo|azafr[aá]n|nuez moscada|comino|especi|cilantro|alcaravea|malagueta/,
    /menta|lavanda|romero|salvia|marin|acu[aá]tic|agua|pepino|mel[oó]n|verde|t[eé]\b|albahaca|calone|aromát|fougère|bambú|hierba|eucalipto|tomillo|sal\b/,
    /[aá]mbar|almizcle|benju[ií]|incienso|mirra|l[aá]dano|ambroxan|resina|ambreta|[aá]mbar gris|musk|olibano|oliba/,
    /cuero|tabaco|gamuza|ahumad|abedul|humo|alquitr[aá]n|cuir/
  ];
  function vec(p) {
    if (p._v) return p._v;
    var v = [0, 0, 0, 0, 0, 0, 0, 0], W = [[p.top, 1], [p.heart, 1.3], [p.base, 1.6]];
    W.forEach(function (w) { w[0].forEach(function (n) { KW.forEach(function (re, i) { if (re.test(n.toLowerCase())) v[i] += w[1]; }); }); });
    var f = (p.family || '').toLowerCase();
    KW.forEach(function (re, i) { if (re.test(f)) v[i] += 2.2; });
    if (/oriental/.test(f)) { v[6] += 1.5; v[4] += 1; v[3] += 0.5; }
    if (/vainilla|gourmand|golos[oa]/.test(f)) v[3] += 2;
    if (/ámbar/.test(f)) v[6] += 2;
    if (/chipre/.test(f)) { v[2] += 1.2; v[0] += 0.8; }
    if (/cuero/.test(f)) v[7] += 3;
    var m = Math.max.apply(null, v) || 1; p._v = v.map(function (x) { return x / m; });
    var len = Math.sqrt(p._v.reduce(function (a, x) { return a + x * x; }, 0)) || 1; p._vn = p._v.map(function (x) { return x / len; });
    return p._v;
  }
  function cos(a, b) { var s = 0, la = 0, lb = 0; for (var i = 0; i < a.length; i++) { s += a[i] * b[i]; la += a[i] * a[i]; lb += b[i] * b[i]; } return s / (Math.sqrt(la) * Math.sqrt(lb) || 1); }
  DATA.forEach(vec);

  function radar(series) {
    var cx = 150, cy = 150, R = 92, n = AX.length, out = '<svg viewBox="-66 0 432 300" role="img" aria-label="Gráfico de acordes" style="width:100%;height:auto;display:block">';
    [0.33, 0.66, 1].forEach(function (k) { var pts = []; for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push((cx + Math.cos(a) * R * k).toFixed(1) + ',' + (cy + Math.sin(a) * R * k).toFixed(1)); } out += '<polygon points="' + pts.join(' ') + '" class="rg" stroke-width="1"/>'; });
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, lx = cx + Math.cos(a) * (R + 22), ly = cy + Math.sin(a) * (R + 20);
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * R).toFixed(1) + '" y2="' + (cy + Math.sin(a) * R).toFixed(1) + '" class="rg"/>';
      var anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
      out += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="' + anchor + '" class="rt">' + AX[i] + '</text>';
    }
    series.forEach(function (s) {
      var pts = s.v.map(function (x, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * Math.max(0.04, x); return (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1); });
      out += '<polygon points="' + pts.join(' ') + '" fill="' + s.color + '" fill-opacity="' + (s.fill == null ? 0.22 : s.fill) + '" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
    });
    return out + '</svg>';
  }

  /* ===== Motor 3D y miniaturas ===== */
  var S3 = window.Scent3D, studio = null, thumbs = null, glOK = !!(window.THREE && S3);
  function fallbackImg(p) {
    var c = glOK ? '#' + S3.liquidColor(p).getHexString() : '#c79a3a';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 525"><rect width="420" height="525" fill="#efe6d4"/><rect x="130" y="140" width="160" height="270" rx="26" fill="none" stroke="#5b3322" stroke-width="3"/><rect x="142" y="230" width="136" height="168" rx="16" fill="' + c + '" opacity=".8"/><rect x="170" y="90" width="80" height="50" rx="6" fill="#5b3322"/><text x="210" y="320" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#2c1a10">' + esc(p.name.slice(0, 16)) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.race([Promise.all([document.fonts.load('400 40px "Instrument Serif"'), document.fonts.load('400 24px "Jost"'), document.fonts.load('400 40px "Allura"')]).catch(function () { }), new Promise(function (r) { setTimeout(r, 2500); })]) : Promise.resolve();
  function getThumb(p) {
    if (window.PHOTOS && window.PHOTOS[p.id]) return Promise.resolve(window.PHOTOS[p.id]);
    if (!glOK) return Promise.resolve(fallbackImg(p));
    return fontsReady.then(function () {
      if (!thumbs) { try { thumbs = new S3.ThumbMaker(); } catch (e) { glOK = false; return fallbackImg(p); } }
      return thumbs.get(p).then(function (u) { return u || fallbackImg(p); });
    });
  }
  var imgIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (!e.isIntersecting) return; var el = e.target; imgIO.unobserve(el);
      var p = byId[el.getAttribute('data-id')]; if (!p) return;
      getThumb(p).then(function (u) { var im = $('img', el); if (!im) return; im.decoding = 'async'; im.onload = function () { im.classList.add('in'); el.classList.add('done'); }; im.src = u; });
    });
  }, { rootMargin: '400px' }) : null;
  function lazyImgs(root) {
    $$('.card-img', root).forEach(function (el) {
      if (imgIO) imgIO.observe(el); else { var p = byId[el.getAttribute('data-id')]; getThumb(p).then(function (u) { var im = $('img', el); im.decoding = 'async'; im.src = u; im.classList.add('in'); el.classList.add('done'); }); }
    });
  }

  /* ===== Favoritos y carrito ===== */
  var favs = store.get('mo_favs', []), cart = store.get('mo_cart', []);
  function isFav(id) { return favs.indexOf(id) > -1; }
  function toggleFav(id) { var i = favs.indexOf(id); if (i > -1) { favs.splice(i, 1); toast('Quitado de favoritos'); } else { favs.push(id); toast('Guardado en favoritos'); } store.set('mo_favs', favs); syncBadges(); $$('[data-fav="' + id + '"]').forEach(function (b) { b.classList.toggle('on', isFav(id)); b.setAttribute('aria-pressed', isFav(id)); }); if (favMode) renderCatalog(true); }
  function cartQty() { return cart.reduce(function (a, i) { return a + i.q; }, 0); }
  function addCart(id, q) { var it = cart.filter(function (i) { return i.id === id; })[0]; if (it) it.q += q || 1; else cart.push({ id: id, q: q || 1 }); store.set('mo_cart', cart); syncBadges(); toast(byId[id].name + ' añadido a tu pedido'); if (!$('#drawer').hidden) renderDrawer(); }
  function syncBadges() {
    var c = cartQty(), b = $('#cartCount'); b.textContent = c; b.hidden = !c;
    var f = $('#favCount'); f.textContent = favs.length; f.hidden = !favs.length;
  }
  function priceOf(id) { var v = SHOP.prices[id]; return typeof v === 'number' ? v : null; }
  function money(n) { return n.toFixed(n % 1 ? 2 : 0).replace('.', ',') + ' ' + SHOP.currency; }
  function notesLine(p) {
    var a = []; if (p.top.length) a.push('salida: ' + p.top.join(', ')); if (p.heart.length) a.push('corazón: ' + p.heart.join(', ')); if (p.base.length) a.push('fondo: ' + p.base.join(', '));
    return a.join('; ');
  }
  function waLink(text) { return 'https://wa.me/' + SHOP.whatsapp + '?text=' + encodeURIComponent(text); }
  function orderText() {
    var lines = ['Hola, quiero hacer este pedido en ' + SHOP.name + ':', ''], total = 0, allPriced = true;
    cart.forEach(function (i) {
      var p = byId[i.id], pr = priceOf(i.id);
      lines.push('• ' + i.q + ' × ' + p.name + ' — ' + p.house + ' (ref. ' + p.id + ')' + (pr != null ? ' · ' + money(pr * i.q) : ''));
      var nl = notesLine(p); if (nl) lines.push('   Notas ' + nl + '.');
      if (pr != null) total += pr * i.q; else allPriced = false;
    });
    if (cart.length && allPriced && total) { lines.push('', 'Total estimado: ' + money(total)); }
    lines.push('', '¿Me confirmas disponibilidad, formato y forma de pago? Gracias.');
    return lines.join('\n');
  }
  function singleText(p) {
    return 'Hola, me interesa este perfume de ' + SHOP.name + ':\n\n' + p.name + ' — ' + p.house + ' (ref. ' + p.id + ')\nFamilia olfativa: ' + (p.family || 'sin indicar') + '\nNotas ' + (notesLine(p) || 'no detalladas') + '.\n\n¿Me confirmas disponibilidad y precio?';
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Pedido copiado'); }, function () { fallbackCopy(t); }); else fallbackCopy(t);
  }
  function fallbackCopy(t) { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Pedido copiado'); } catch (e) { toast('No se pudo copiar. Selecciona el texto manualmente.'); } ta.remove(); }

  function renderDrawer() {
    var body = $('#drawerBody'), foot = $('#drawerFoot');
    if (!cart.length) { body.innerHTML = '<p class="drawer-empty">Tu pedido está vacío. Añade fragancias desde la colección o el sumiller.</p>'; foot.innerHTML = '<button class="btn btn-ghost" id="dClose2" type="button">Seguir explorando</button>'; $('#dClose2').onclick = closeDrawer; return; }
    var total = 0, all = true;
    body.innerHTML = cart.map(function (i) {
      var p = byId[i.id], pr = priceOf(i.id); if (pr != null) total += pr * i.q; else all = false;
      return '<div class="line-item" data-line="' + esc(i.id) + '"><img alt="" data-thumb="' + esc(i.id) + '" width="64" height="80"><div><b>' + esc(p.name) + '</b><small>' + esc(p.house) + ' · ref. ' + esc(p.id) + '</small><div class="qty"><button type="button" data-dec aria-label="Quitar uno">−</button><span>' + i.q + '</span><button type="button" data-inc aria-label="Añadir uno">+</button></div></div><div style="text-align:right"><small>' + (pr != null ? money(pr * i.q) : 'Precio a consultar') + '</small><button class="rm" type="button" data-rm>Quitar</button></div></div>';
    }).join('');
    $$('[data-thumb]', body).forEach(function (im) { getThumb(byId[im.getAttribute('data-thumb')]).then(function (u) { im.src = u; }); });
    foot.innerHTML = (all && total ? '<div style="display:flex;justify-content:space-between"><span>Total estimado</span><b>' + money(total) + '</b></div>' : '<p class="note-desc">El precio y el formato se confirman por WhatsApp.</p>') +
      '<a class="btn btn-gold" target="_blank" rel="noopener" href="' + waLink(orderText()) + '">Enviar pedido por WhatsApp</a><button class="btn btn-ghost" id="copyOrder" type="button">Copiar el pedido</button>';
    $('#copyOrder').onclick = function () { copyText(orderText()); };
  }
  function openDrawer() { renderDrawer(); $('#scrim').hidden = false; $('#drawer').hidden = false; document.body.style.overflow = 'hidden'; var c = $('#drawerClose'); if (c) c.focus(); }
  function closeDrawer() { $('#scrim').hidden = true; $('#drawer').hidden = true; document.body.style.overflow = ''; }
  $('#drawerBody').addEventListener('click', function (e) {
    var line = e.target.closest('[data-line]'); if (!line) return; var id = line.getAttribute('data-line'), it = cart.filter(function (i) { return i.id === id; })[0];
    if (e.target.closest('[data-inc]')) it.q++; else if (e.target.closest('[data-dec]')) it.q = Math.max(1, it.q - 1); else if (e.target.closest('[data-rm]')) cart = cart.filter(function (i) { return i.id !== id; }); else return;
    store.set('mo_cart', cart); syncBadges(); renderDrawer();
  });
  $('#cartBtn').onclick = openDrawer; $('#drawerClose').onclick = closeDrawer; $('#scrim').onclick = closeDrawer; $('#conciergeBtn').onclick = openDrawer;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });

  /* ===== Catálogo ===== */
  var PAGE = 48, shown = PAGE, F = 'all', favMode = false, list = [];
  var FILTERS = [['all', 'Todos'], ['M', 'Mujer'], ['H', 'Hombre'], ['U', 'Unisex'], ['N', '✨ Nicho'], ['NEW', 'Novedades']];
  $('#filters').innerHTML = FILTERS.map(function (f) { return '<button class="chip" type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === 'all') + '">' + f[1] + '</button>'; }).join('');
  var fams = {}; DATA.forEach(function (p) { if (p.family) fams[p.family] = (fams[p.family] || 0) + 1; });
  $('#famSel').innerHTML = '<option value="">Todas las familias</option>' + Object.keys(fams).sort().map(function (f) { return '<option value="' + esc(f) + '">' + esc(f) + ' (' + fams[f] + ')</option>'; }).join('');
  function match(p) {
    if (favMode && !isFav(p.id)) return false;
    if (F === 'M' || F === 'H' || F === 'U') { if (p.g !== F) return false; } else if (F === 'N') { if (!p.isNicho) return false; } else if (F === 'NEW') { if (!p.isNew) return false; }
    var fam = $('#famSel').value; if (fam && p.family !== fam) return false; return true;
  }
  function renderCatalog(keep) {
    var raw = $('#q').value.trim(), toks = norm(raw).split(/[^a-z0-9]+/).filter(Boolean), sort = $('#sortSel').value;
    list = DATA.filter(match).map(function (p) { return { p: p, s: toks.length ? scoreP(p, toks) : 1 }; }).filter(function (x) { return x.s > 0; });
    if (toks.length && sort === 'rel') list.sort(function (a, b) { return b.s - a.s; });
    else if (sort === 'az') list.sort(function (a, b) { return a.p.name.localeCompare(b.p.name, 'es'); });
    else if (sort === 'house') list.sort(function (a, b) { return a.p.house.localeCompare(b.p.house, 'es') || a.p.name.localeCompare(b.p.name, 'es'); });
    else if (sort === 'new') list.sort(function (a, b) { return (b.p.isNew | 0) - (a.p.isNew | 0); });
    if (!keep) shown = PAGE;
    var vis = list.slice(0, shown);
    $('#count').textContent = (favMode ? 'Tus favoritos: ' : '') + list.length + (list.length === 1 ? ' fragancia' : ' fragancias') + (raw ? ' para “' + raw + '”' : '');
    $('#grid').innerHTML = vis.length ? vis.map(function (x) { return card(x.p); }).join('') : '<div class="empty" style="grid-column:1/-1"><p>' + (favMode ? 'Aún no tienes favoritos. Toca el corazón de una fragancia para guardarla.' : 'No hay resultados. Prueba con otra nota, otra casa o quita algún filtro.') + '</p></div>';
    $('#moreBtn').hidden = list.length <= shown;
    lazyImgs($('#grid'));
  }
  function card(p) {
    return '<article class="card"><div class="tags">' + (p.special ? '<span class="tag">Nicho especial</span>' : p.isNicho ? '<span class="tag">Nicho</span>' : '') + (p.isNew ? '<span class="tag rose">Novedad</span>' : '') + '</div>' +
      '<button class="icon-btn fav' + (isFav(p.id) ? ' on' : '') + '" type="button" data-fav="' + esc(p.id) + '" aria-pressed="' + isFav(p.id) + '" aria-label="Favorito: ' + esc(p.name) + '"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.8c0 5.4-7.5 10-7.5 10z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>' +
      '<button class="card-img" type="button" data-open="' + esc(p.id) + '" data-id="' + esc(p.id) + '" aria-label="Ver ficha de ' + esc(p.name) + '"><img alt="Frasco de ' + esc(p.name) + '" width="420" height="525" loading="lazy" decoding="async"><span class="quick">Ver ficha</span></button>' +
      '<div class="card-body"><span class="card-house">' + esc(p.house) + '</span><h3 class="card-name">' + esc(p.name) + '</h3><span class="card-fam">' + esc(p.family || GN[p.g]) + ' · ' + GN[p.g] + '</span>' +
      '<div class="card-foot"><span class="ref">ref. ' + esc(p.id) + '</span><button class="btn sm" type="button" data-add="' + esc(p.id) + '">Añadir</button></div></div></article>';
  }
  $('#grid').addEventListener('click', function (e) {
    var a = e.target.closest('[data-add]'), f = e.target.closest('[data-fav]'), o = e.target.closest('[data-open]');
    if (a) addCart(a.getAttribute('data-add')); else if (f) toggleFav(f.getAttribute('data-fav')); else if (o) openModal(byId[o.getAttribute('data-open')]);
  });
  $('#filters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; F = b.getAttribute('data-f'); $$('#filters .chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b); }); renderCatalog(); });
  var qT; $('#q').addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { renderCatalog(); }, 120); });
  $('#famSel').onchange = function () { renderCatalog(); }; $('#sortSel').onchange = function () { renderCatalog(); };
  $('#moreBtn').onclick = function () { shown += PAGE; renderCatalog(true); };
  $('#favBtn').onclick = function () { favMode = !favMode; $('#favBtn').classList.toggle('on', favMode); renderCatalog(); if (favMode) $('#coleccion').scrollIntoView({ behavior: 'smooth' }); };

  /* ===== Recorrido 3D por familias (scroll) ===== */
  var CH = [
    { id: '1001', fam: 'Cítrico y fresco', line: 'Bergamota, limón y aire de mar. La luz de las primeras horas del día.' },
    { id: '48', fam: 'Floral', line: 'Rosa, jazmín e iris. Una elegancia que se reconoce a varios metros.' },
    { id: 'NICH1', fam: 'Ámbar y oriental', line: 'Azafrán, ámbar gris y resinas. Cálido, denso y difícil de olvidar.' },
    { id: '227', fam: 'Tabaco y cuero', line: 'Hojas de tabaco, haba tonka y maderas oscuras. Carácter sin adornos.' },
    { id: '442', fam: 'Dulce y goloso', line: 'Café, vainilla y almendra. La estela por la que te preguntan.' }
  ].filter(function (c) { return byId[c.id]; });
  var chIdx = -1, heroCur = null, story = $('#inicio'), chT;
  $('#chRail').innerHTML = CH.map(function (c, i) { return '<li><button class="dot" type="button" data-ch="' + i + '" aria-label="' + esc(c.fam) + '"><span>' + esc(c.fam) + '</span><i></i></button></li>'; }).join('');
  function setChapter(i, force) {
    if (i === chIdx && !force) return; chIdx = i; var c = CH[i], p = byId[c.id]; heroCur = p;
    $('#chKicker').textContent = 'Familia ' + (i + 1) + ' de ' + CH.length;
    $('#chTitle').textContent = c.fam; $('#chLine').textContent = c.line;
    $('#chHouse').textContent = p.house + ' · ref. ' + p.id; $('#chName').textContent = p.name;
    $('#chNotes').innerHTML = p.top.slice(0, 3).concat(p.heart.slice(0, 1)).map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('');
    $('#chOpen').onclick = function () { openModal(p); }; $('#chAdd').onclick = function () { addCart(p.id); };
    var cp = $('#storyCopy'); cp.classList.remove('swap'); void cp.offsetWidth; cp.classList.add('swap');
    $$('#chRail .dot').forEach(function (b, k) { b.classList.toggle('on', k === i); b.setAttribute('aria-current', k === i); });
    var im = $('#heroImg'), src = (window.CUTS && window.CUTS[p.id]) || (window.PHOTOS && window.PHOTOS[p.id]) || fallbackImg(p);
    im.classList.remove('in'); im.onload = function () { im.classList.add('in'); }; im.alt = 'Frasco de ' + p.name; im.src = src; if (im.complete && im.naturalWidth) im.classList.add('in');
    if (glOK) $('#heroGlow').style.setProperty('--tint', '#' + S3.liquidColor(p).getHexString());
  }
  function onScroll() { $('#cue').classList.toggle('gone', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#chRail').addEventListener('click', function (e) { var b = e.target.closest('[data-ch]'); if (b) setChapter(+b.getAttribute('data-ch')); });
  // Precarga las fotos del recorrido para que cambien al instante
  CH.forEach(function (c) { var u = window.CUTS && window.CUTS[c.id]; if (u) { var i = new Image(); i.src = u; } });
  // El visor 3D solo se crea si alguien pulsa «Vista 3D» en una ficha: la portada queda ligera
  function getStudio() {
    if (studio || !glOK) return studio;
    var c = document.createElement('canvas'); c.className = 'm-canvas'; $('#modalStage').insertBefore(c, $('#modalStage').firstChild);
    try { studio = new S3.Studio(c, {}); } catch (e) { glOK = false; c.remove(); studio = null; }
    return studio;
  }
  function initStudio() { setChapter(0); }

  /* ===== Ficha detallada con visor 360° y pirámide ===== */
  var dlg = $('#dlg'), modalP = null;
  function durLabel(p) {
    var long = /oud|ámbar|ambar|almizcle|vainilla|sándalo|sandalo|pachul|incienso|benju|cuero|musgo|ládano|ladano|ambroxan|haba tonka|cachemira|mirra|cedro/, n = 0;
    p.base.forEach(function (b) { if (long.test(b.toLowerCase())) n++; });
    return n >= 5 ? '+12 h a 24 h' : n >= 3 ? '10 a 12 h' : n >= 1 ? '7 a 9 h' : '6 a 8 h';
  }
  function similar(p) {
    return DATA.filter(function (q) { return q.id !== p.id && (p.g === 'U' || q.g === 'U' || q.g === p.g); }).map(function (q) { return { q: q, s: cos(p._vn, q._vn) }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4).map(function (x) { return x.q; });
  }
  function tier(title, sub, arr) { return '<div class="tier"><h4>' + title + '</h4><small>' + sub + '</small>' + (arr.length ? arr.map(function (n) { return '<button type="button" class="note" data-note>' + esc(n) + '</button>'; }).join('') : '<span class="note-desc">Sin detallar</span>') + '</div>'; }
  function openModal(p) {
    modalP = p; var hasNotes = p.top.length || p.heart.length || p.base.length, sims = similar(p);
    var photo = window.PHOTOS && window.PHOTOS[p.id];
    dlg.innerHTML = '<div class="m-wrap"><div class="m-view"><button class="icon-btn m-close" id="mClose" type="button" aria-label="Cerrar ficha">✕</button>' +
      (photo ? '<div class="m-tabs" role="tablist" aria-label="Tipo de vista"><button type="button" role="tab" id="tabFoto" aria-selected="true">Foto</button><button type="button" role="tab" id="tab3d" aria-selected="false">Vista 3D</button></div>' +
        '<div class="m-photo" id="mPhotoWrap"><img id="mPhoto" src="' + esc(photo) + '" alt="Frasco de ' + esc(p.name) + '" width="640" height="800"><span class="zoom-hint">Toca la foto para ampliar</span></div>' : '') +
      '<div class="stage" id="modalStage"' + (photo ? ' hidden' : '') + '><div class="stage-ui"><button class="icon-btn sm" id="mZoomOut" type="button" aria-label="Alejar">−</button><button class="icon-btn sm" id="mZoomIn" type="button" aria-label="Acercar">+</button><button class="icon-btn sm" id="mMist" type="button" aria-label="Soltar niebla de oro">✦</button></div><div class="stage-hint">Arrastra para girar · representación 3D ilustrativa</div></div></div>' +
      '<div class="m-info"><div><span class="m-house">' + esc(p.house) + '</span><h2>' + esc(p.name) + '</h2></div>' +
      '<div class="meta"><span class="gold">ref. ' + esc(p.id) + '</span><span>' + GN[p.g] + '</span>' + (p.family ? '<span>' + esc(p.family) + '</span>' : '') + (p.special ? '<span class="gold">Nicho especial</span>' : p.isNicho ? '<span class="gold">Nicho</span>' : '') + (p.isNew ? '<span class="gold">Novedad</span>' : '') + '</div>' +
      '<div class="m-actions"><button class="btn btn-gold" type="button" id="mAdd">Añadir a mi pedido</button><a class="btn" target="_blank" rel="noopener" href="' + waLink(singleText(p)) + '">Consultar por WhatsApp</a><button class="icon-btn' + (isFav(p.id) ? ' on' : '') + '" type="button" data-fav="' + esc(p.id) + '" aria-pressed="' + isFav(p.id) + '" aria-label="Favorito"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.5 2.8c0 5.4-7.5 10-7.5 10z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>' +
      (priceOf(p.id) != null ? '<p><b>' + money(priceOf(p.id)) + '</b></p>' : '<p class="note-desc">Precio a consultar. Te lo confirmamos por WhatsApp.</p>') +
      (hasNotes ? '<div><h3>Pirámide olfativa</h3><div class="pyr-scene" id="pyrScene"><div class="pyr">' + tier('Salida', 'se percibe los primeros 15 minutos', p.top) + tier('Corazón', 'el alma de la fragancia, de 2 a 4 horas', p.heart) + tier('Fondo', 'la fijación sobre la piel', p.base) + '</div></div><p class="dur">Duración en piel estimada por sus notas de fondo: <b>' + durLabel(p) + '</b>. Toca una nota para liberar chispas.</p></div>' : '<div><h3>Descripción</h3><p class="note-desc">' + esc(p.desc || 'El catálogo no detalla las notas de esta fragancia. Pregúntanos por WhatsApp y te las confirmamos.') + '</p></div>') +
      '<div class="m-two"><div><h3>Acordes</h3><div class="radar-wrap" style="margin:0">' + radar([{ v: p._v, color: '#a56b3a' }]) + '</div></div><div><h3>Parecidos</h3><div class="similar">' + sims.map(function (q) { return '<button type="button" data-sim="' + esc(q.id) + '">' + esc(q.name) + '</button>'; }).join('') + '</div></div></div></div></div>';
    if (!dlg.open) dlg.showModal();
    function show3d() {
      $('#modalStage').hidden = false; if ($('#mPhotoWrap')) $('#mPhotoWrap').hidden = true;
      if (getStudio()) {
        studio.paused = false; studio.scrollMode = false; studio.offX = 0; studio.offY = 0; studio.offYW = 0; var ms = $('#modalStage'); ms.insertBefore(studio.canvas, ms.firstChild); studio.canvas.setAttribute('aria-label', 'Frasco de ' + p.name + ' en 3D. Arrastra para girarlo.');
        if (studio.ro) { studio.ro.disconnect(); studio.ro.observe(ms); } studio.zf = 1; studio.resize(); studio.setPerfume(p, false, true); studio.auto = true;
        $('#mZoomIn').onclick = function () { studio.zoom(-1); }; $('#mZoomOut').onclick = function () { studio.zoom(1); }; $('#mMist').onclick = function () { studio.burst(0.22); };
      } else if (!$('#modalStage .nogl')) $('#modalStage').insertAdjacentHTML('afterbegin', '<div class="nogl">Visor 3D no disponible en este dispositivo.</div>');
    }
    function showPhoto() { $('#modalStage').hidden = true; $('#mPhotoWrap').hidden = false; if (studio) studio.paused = true; }
    if (photo) {
      if (studio) studio.paused = true;
      $('#tabFoto').onclick = function () { $('#tabFoto').setAttribute('aria-selected', 'true'); $('#tab3d').setAttribute('aria-selected', 'false'); showPhoto(); };
      $('#tab3d').onclick = function () { $('#tab3d').setAttribute('aria-selected', 'true'); $('#tabFoto').setAttribute('aria-selected', 'false'); show3d(); };
      var pw = $('#mPhotoWrap');
      pw.addEventListener('pointermove', function (e) { var r = pw.getBoundingClientRect(); pw.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%'); pw.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%'); });
      pw.addEventListener('click', function () { pw.classList.toggle('zoom'); });
    } else show3d();
    $('#mClose').onclick = function () { dlg.close(); };
    $('#mAdd').onclick = function () { addCart(p.id); };
    var ps = $('#pyrScene'); if (ps) ps.addEventListener('pointermove', function (e) { var r = ps.getBoundingClientRect(); $('.pyr', ps).style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 36 + 'deg'); });
  }
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) { dlg.close(); return; }
    var n = e.target.closest('[data-note]'); if (n) { var r = n.getBoundingClientRect(); sparks(r.left + r.width / 2, r.top + r.height / 2); if (studio) studio.burst(0.08); return; }
    var f = e.target.closest('[data-fav]'); if (f) { toggleFav(f.getAttribute('data-fav')); return; }
    var s = e.target.closest('[data-sim]'); if (s) { openModal(byId[s.getAttribute('data-sim')]); dlg.querySelector('.m-info').scrollTop = 0; }
  });
  dlg.addEventListener('close', function () { if (studio) studio.paused = true; });

  /* ===== Le Sommelier Olfactif ===== */
  var Q = [
    { t: '¿Para qué momento lo buscas?', o: [['Día y trabajo', 'Limpio, discreto, para varias horas', [0.6, 0.3, 0, 0, 0, 0.8, 0, 0]], ['Cena y noche', 'Cálido, con presencia', [0, 0.1, 0.5, 0.5, 0.4, 0, 0.6, 0.1]], ['Evento especial', 'Elegante y recordado', [0, 0.4, 0.3, 0.3, 0.1, 0, 0.5, 0.2]], ['Verano y escapada', 'Ligero y luminoso', [0.8, 0.2, 0, 0, 0, 0.8, 0, 0]]] },
    { t: '¿Qué estela prefieres?', o: [['Íntima', 'Solo la nota quien se acerca', [0.3, 0.5, 0, 0, 0, 0.4, 0.1, 0]], ['Equilibrada', 'Presente sin imponerse', [0.2, 0.3, 0.3, 0.3, 0.2, 0.2, 0.3, 0.1]], ['Imponente', 'Se nota al entrar en una sala', [0, 0, 0.5, 0.4, 0.5, 0, 0.7, 0.3]]] },
    { t: '¿Qué sensaciones te atraen?', w: 1.7, o: [['Frescura cítrica', 'Bergamota, limón, aire de mar', [1, 0.1, 0, 0, 0, 0.7, 0, 0]], ['Misterio amaderado', 'Maderas, cuero, humo y resinas', [0, 0, 1, 0, 0.3, 0, 0.5, 0.6]], ['Dulzura golosa', 'Vainilla, cacao, café, caramelo', [0, 0.2, 0, 1, 0.2, 0, 0.4, 0]], ['Elegancia floral', 'Rosa, jazmín, iris, azahar', [0.1, 1, 0, 0.1, 0, 0, 0.2, 0]]] }
  ];
  var ans = [], sg = 'all';
  function som() {
    var box = $('#som'), step = ans.length, prog = '<div class="som-prog" aria-hidden="true">' + [0, 1, 2].map(function (i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    if (step < 3) {
      var q = Q[step];
      box.innerHTML = prog + '<h3>' + q.t + '</h3><div class="opts">' + q.o.map(function (o, i) { return '<button type="button" class="opt" data-i="' + i + '"><b>' + o[0] + '</b><span>' + o[1] + '</span></button>'; }).join('') + '</div>' + (step ? '<p style="margin-top:18px"><button class="link" id="somBack" type="button">Volver a la pregunta anterior</button></p>' : '');
      var bk = $('#somBack'); if (bk) bk.onclick = function () { ans.pop(); som(); };
      return;
    }
    var t = [0, 0, 0, 0, 0, 0, 0, 0]; ans.forEach(function (a, qi) { var w = Q[qi].w || 1; a.forEach(function (x, i) { t[i] += x * w; }); });
    var res = DATA.filter(function (p) { return sg === 'all' || p.g === sg || p.g === 'U'; }).map(function (p) { return { p: p, c: cos(t, p._v) }; }).sort(function (a, b) { return b.c - a.c; }).slice(0, 3);
    var top = res[0].c || 1;
    box.innerHTML = prog + '<h3>Estas tres fragancias encajan contigo</h3><div class="pills" role="group" aria-label="Filtrar recomendación">' + [['all', 'Para todos'], ['M', 'Para ella'], ['H', 'Para él']].map(function (x) { return '<button class="chip" type="button" data-sg="' + x[0] + '" aria-pressed="' + (sg === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="som-res">' + res.map(function (r) { var pct = Math.max(52, Math.min(99, Math.round(99 - (top - r.c) * 100 * 1.2))); return '<div class="res"><img alt="Frasco de ' + esc(r.p.name) + '" data-r="' + esc(r.p.id) + '" width="420" height="525"><div class="res-body"><div class="match">' + pct + '%<small>de afinidad</small></div><div class="bar"><i style="width:' + pct + '%"></i></div><div><b>' + esc(r.p.name) + '</b><div class="note-desc">' + esc(r.p.house) + ' · ' + esc(r.p.family || GN[r.p.g]) + '</div></div><div class="res-actions"><button class="btn sm" type="button" data-try="' + esc(r.p.id) + '">Ver ficha</button><button class="btn btn-ghost sm" type="button" data-addr="' + esc(r.p.id) + '">Añadir</button></div></div></div>'; }).join('') + '</div><p style="margin-top:22px"><button class="link" id="somRestart" type="button">Repetir el test</button></p>';
    $$('[data-r]', box).forEach(function (im) { getThumb(byId[im.getAttribute('data-r')]).then(function (u) { im.src = u; }); });
    $('#somRestart').onclick = function () { ans = []; som(); };
  }
  $('#som').addEventListener('click', function (e) {
    var o = e.target.closest('[data-i]'); if (o) { ans.push(Q[ans.length].o[+o.getAttribute('data-i')][2]); som(); return; }
    var s = e.target.closest('[data-sg]'); if (s) { sg = s.getAttribute('data-sg'); som(); return; }
    var t = e.target.closest('[data-try]'); if (t) { openModal(byId[t.getAttribute('data-try')]); return; }
    var a = e.target.closest('[data-addr]'); if (a) addCart(a.getAttribute('data-addr'));
  });

  /* ===== Scent Layering Lab ===== */
  var labels = {}; var dl = $('#dl'); DATA.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); }).forEach(function (p) { var l = p.name + ' · ' + p.house; labels[norm(l)] = p; dl.insertAdjacentHTML('beforeend', '<option value="' + esc(l) + '"></option>'); });
  function resolve(txt) {
    var k = norm(txt.trim()); if (!k) return null; if (labels[k]) return labels[k];
    var toks = k.split(/[^a-z0-9]+/).filter(Boolean), best = null, bs = 0; DATA.forEach(function (p) { var s = scoreP(p, toks); if (s > bs) { bs = s; best = p; } }); return best;
  }
  function lay() {
    var a = resolve($('#layA').value), b = resolve($('#layB').value), out = $('#layOut');
    if (!a || !b) { out.innerHTML = '<p class="note-desc" style="grid-column:1/-1">Elige dos fragancias para ver el análisis de acordes.</p>'; return; }
    if (a.id === b.id) { out.innerHTML = '<p class="note-desc" style="grid-column:1/-1">Has elegido la misma fragancia dos veces. Cambia una para ver la combinación.</p>'; return; }
    var sim = cos(a._vn, b._vn), mix = a._v.map(function (x, i) { return Math.min(1, (x + b._v[i]) / 1.6); });
    var topAx = mix.map(function (x, i) { return [x, i]; }).sort(function (x, y) { return y[0] - x[0]; }).slice(0, 3).map(function (x) { return AX[x[1]].toLowerCase(); });
    var weight = function (p) { return p._v[2] + p._v[3] + p._v[6] + p._v[7] + p._v[4]; }, heavy = weight(a) >= weight(b) ? a : b, light = heavy === a ? b : a;
    var title, text;
    if (sim >= 0.78) { title = 'Combinación equilibrada'; text = 'Comparten el mismo carácter. Se refuerzan y la estela gana profundidad sin que ninguna tape a la otra.'; }
    else if (sim >= 0.45) { title = 'Combinación seductora'; text = 'Se parecen lo justo para unirse y se diferencian lo bastante para crear misterio. Es la mezcla que más conversación genera.'; }
    else { title = 'Combinación audaz'; text = 'Sus acordes son opuestos y el contraste se nota. Funciona mejor si dejas que cada una ocupe su zona.'; }
    var pct = Math.round(sim * 100);
    out.innerHTML = '<div><div class="lab-pair"><figure><img alt="Frasco de ' + esc(a.name) + '" data-l="' + esc(a.id) + '"><figcaption><b>' + esc(a.name) + '</b><small>' + esc(a.house) + '</small></figcaption></figure><figure><img alt="Frasco de ' + esc(b.name) + '" data-l="' + esc(b.id) + '"><figcaption><b>' + esc(b.name) + '</b><small>' + esc(b.house) + '</small></figcaption></figure></div></div>' +
      '<div class="verdict"><span class="pct">' + pct + '% de afinidad entre acordes</span><h3>' + title + '</h3><p>' + text + ' La mezcla resulta sobre todo ' + topAx.join(', ') + '.</p><div class="radar-wrap">' + radar([{ v: a._v, color: '#a56b3a' }, { v: b._v, color: '#5b3322' }, { v: mix, color: '#2c1a10', fill: 0.05, dash: true }]) + '</div><div class="legend"><span><i style="background:#a56b3a"></i>' + esc(a.name) + '</span><span><i style="background:#5b3322"></i>' + esc(b.name) + '</span><span><i style="background:#2c1a10"></i>Mezcla</span></div>' +
      '<p class="tip">Aplica ' + esc(heavy.name) + ' primero en las muñecas y ' + esc(light.name) + ' después en el cuello o la ropa. La más ligera se queda arriba y la más densa sostiene el fondo.</p><div class="res-actions" style="margin-top:14px"><button class="btn sm" type="button" id="layAdd">Añadir las dos a mi pedido</button></div></div>';
    $$('[data-l]', out).forEach(function (im) { getThumb(byId[im.getAttribute('data-l')]).then(function (u) { im.src = u; }); });
    $('#layAdd').onclick = function () { addCart(a.id); addCart(b.id); };
  }
  var lT; ['#layA', '#layB'].forEach(function (s) { $(s).addEventListener('input', function () { clearTimeout(lT); lT = setTimeout(lay, 200); }); $(s).addEventListener('change', lay); });

  /* ===== Arranque ===== */
  $('#waFab').href = waLink('Hola, quiero información sobre sus perfumes en ' + SHOP.name + '.');
  $('#footTxt').textContent = SHOP.name + ' · Catálogo 2026 con ' + DATA.length + ' referencias. Fotografías del catálogo 2026, ampliadas y retocadas para la web.';
  var ex = ['NICH1', '208'].filter(function (i) { return byId[i]; });
  if (ex.length === 2) { $('#layA').value = byId[ex[0]].name + ' · ' + byId[ex[0]].house; $('#layB').value = byId[ex[1]].name + ' · ' + byId[ex[1]].house; }
  /* ===== Bienvenida: el logo se escribe y la tienda se abre como un iris ===== */
  var intro = $('#intro'), introDone = false;
  document.body.classList.add('has-intro'); document.body.style.overflow = 'hidden';
  function enter() {
    if (introDone) return; introDone = true;
    var b = $('#inEnter').getBoundingClientRect(), r = intro.getBoundingClientRect();
    intro.style.setProperty('--cx', (b.left + b.width / 2 - r.left) + 'px'); intro.style.setProperty('--cy', (b.top + b.height / 2 - r.top) + 'px');
    intro.classList.add('out'); document.body.classList.add('entered');
    setTimeout(function () { intro.hidden = true; document.body.style.overflow = ''; document.body.classList.remove('has-intro'); }, 1550);
  }
  $('#inEnter').addEventListener('click', enter);
  document.addEventListener('keydown', function (e) { if (!introDone && (e.key === 'Enter' || e.key === 'Escape')) enter(); });
  (function dust() {
    var c = $('#introDust'), x = c.getContext('2d'), W, H, P = [], dpr = Math.min(window.devicePixelRatio || 1, 2), mx = 0.5, my = 0.5;
    function rs() { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    rs(); window.addEventListener('resize', rs);
    intro.addEventListener('pointermove', function (e) { mx = e.clientX / (innerWidth || 1); my = e.clientY / (innerHeight || 1); });
    var n = (matchMedia('(max-width: 720px)').matches ? 55 : 110);
    for (var i = 0; i < n; i++) P.push({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 1.6, s: 0.00004 + Math.random() * 0.00012, o: Math.random(), ph: Math.random() * 6.28 });
    (function tick(t) {
      if (intro.hidden) return; requestAnimationFrame(tick); x.clearRect(0, 0, W, H);
      P.forEach(function (q) {
        q.y -= q.s * 16; if (q.y < -0.02) { q.y = 1.02; q.x = Math.random(); }
        var px = (q.x + Math.sin(t / 2400 + q.ph) * 0.012 + (mx - 0.5) * q.z * 0.012) * W, py = q.y * H, r = q.z * 2.6;
        var al = (0.18 + 0.4 * q.o) * Math.min(1, q.y * 4, (1 - q.y) * 4 + 0.2);
        var g = x.createRadialGradient(px, py, 0, px, py, r * 3); g.addColorStop(0, 'rgba(184,146,74,' + al.toFixed(3) + ')'); g.addColorStop(1, 'rgba(184,146,74,0)');
        x.fillStyle = g; x.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
      });
    })(0);
  })();

  /* ===== Banda de casas ===== */
  (function () {
    var hc = {}; DATA.forEach(function (p) { hc[p.house] = (hc[p.house] || 0) + 1; });
    var names = Object.keys(hc).sort(function (a, b) { return hc[b] - hc[a]; }).slice(0, 26), h = names.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('');
    $('#mq').innerHTML = h + h;
  })();

  /* ===== Carril de nicho ===== */
  (function () {
    var rail = $('#nicheRail'), L = DATA.filter(function (p) { return p.isNicho; }).sort(function (a, b) { return (b.special | 0) - (a.special | 0) || (b.isNew | 0) - (a.isNew | 0); });
    rail.innerHTML = L.map(card).join(''); lazyImgs(rail);
    rail.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), f = e.target.closest('[data-fav]'), o = e.target.closest('[data-open]');
      if (a) addCart(a.getAttribute('data-add')); else if (f) toggleFav(f.getAttribute('data-fav')); else if (o) openModal(byId[o.getAttribute('data-open')]);
    });
    $('#railPrev').onclick = function () { rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' }); };
    $('#railNext').onclick = function () { rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }); };
  })();

  /* ===== Títulos que emergen ===== */
  (function () {
    var hs = $$('.rv'); if (!('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('js-rv');
    hs.forEach(function (h) { var i = 0; h.innerHTML = h.textContent.split(' ').map(function (w) { return '<span class="rv-w"><span style="--i:' + (i++) + '">' + esc(w) + '</span></span>'; }).join(' '); });
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.3 });
    hs.forEach(function (h) { io.observe(h); });
  })();

  /* ===== Polvo dorado tras el cursor ===== */
  (function () {
    if (!window.matchMedia || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas'); c.className = 'trail'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
    var x = c.getContext('2d'), P = [], W, H, run = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function rs() { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; x.setTransform(dpr, 0, 0, dpr, 0, 0); } rs(); window.addEventListener('resize', rs);
    function tick() {
      x.clearRect(0, 0, W, H);
      P = P.filter(function (p) { return p.l > 0; });
      P.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.012; p.l -= 0.018; x.fillStyle = 'rgba(176,128,60,' + Math.max(0, p.l) * 0.7 + ')'; x.beginPath(); x.arc(p.x, p.y, p.r * p.l + 0.3, 0, 6.28); x.fill(); });
      if (P.length) requestAnimationFrame(tick); else run = false;
    }
    window.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; for (var i = 0; i < 2; i++) P.push({ x: e.clientX + (Math.random() - 0.5) * 8, y: e.clientY + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.7) * 0.7, r: 1.2 + Math.random() * 2.2, l: 1 }); if (P.length > 90) P.splice(0, P.length - 90); if (!run) { run = true; requestAnimationFrame(tick); } });
  })();

  syncBadges(); renderCatalog(); som(); lay(); initStudio();
  function noteAxes(n) { var r = [], t = String(n).toLowerCase(); KW.forEach(function (re, i) { if (re.test(t)) r.push(i); }); return r; }
  window.__app = { DATA: DATA, openModal: openModal, getThumb: getThumb, addCart: addCart, cos: cos, radar: radar, AX: AX, AXC: AXC, noteAxes: noteAxes, esc: esc, getStudio: function () { return studio; }, toast: toast };
})();
