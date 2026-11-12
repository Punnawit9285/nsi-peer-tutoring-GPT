/* Student handout PDF source: node print.js [pages.json] -> dist/print.html
   Per section: question pages (no answers, two columns, many items per page), then one page per concept card.
   At the end: the answer key with Thai explanations, then the Thai explanation of every concept.
   tools/pdf.sh prints it with headless Chrome, finds the real page numbers and fills the cross-references. */
const fs = require('fs');
const rd = f => fs.readFileSync(f, 'utf8');
global.window = global;
["lib", "b", "i", "n", "s", "f", "k", "u", "o", "d", "c", "a", "p", "m", "j", "l", "e", "r", "g", "t", "h", "w", "v", "x"].forEach(f => eval(rd('data/' + f + '.js')));
eval(rd('src/thai-explain.js'));
eval(rd('src/thai-data.js'));
const S = CVS.sections, LET = 'ABCDEFGH';
const pages = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(rd(process.argv[2])) : {};
const pg = k => pages[k] ? String(pages[k]) : '00';
const eager = h => String(h).replace(/ loading="lazy"/g, '');
const isQ = it => it.t === 'q' || it.t === 'tf' || it.t === 'open';

let nQ = 0, nC = 0;
S.forEach(s => s.items.forEach(it => { if (it.t === 'c') nC++; else nQ++; }));

/* ---------- concept units: each concept page, then the quiz on that concept ---------- */
const units = [];   /* {s, c, qs} in deck order: every question follows the concept it belongs to */
S.forEach(s => { let cur = null; s.items.forEach(it => { if (it.t === 'c') { cur = { s: s, c: it, qs: [] }; units.push(cur); } else if (cur) cur.qs.push(it); else throw new Error(it.id + ' comes before any concept'); }); });

/* Cloze blanks stay empty in the PDF: each becomes a numbered box sized to its answer (the answer text is not in the file).
   The answers are listed at the back, per concept. */
const BLANKS = {};
function blankify(h, id) {
  const open = '<span class="cz">', ans = [];
  let out = '', i = 0, k;
  while ((k = h.indexOf(open, i)) >= 0) {
    const re = /<span\b|<\/span>/g; let d = 1, m; re.lastIndex = k + open.length;
    while (d && (m = re.exec(h))) d += m[0] === '</span>' ? -1 : 1;
    if (!m) throw new Error('unclosed blank in ' + id);
    const inner = h.slice(k + open.length, m.index);
    ans.push(inner);
    const chars = inner.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, 'x').length;
    const w = Math.min(16, Math.max(2.4, 0.52 * chars + 1.3)).toFixed(1);
    out += h.slice(i, k) + '<span class="czb" style="width:' + w + 'em"><i>' + ans.length + '</i></span>';
    i = m.index + 7;
  }
  BLANKS[id] = ans;
  return out + h.slice(i);
}
let nB = 0;

/* ---------- cover ---------- */
let h = '<section class="cover"><div class="eyebrow"><span class="chip kind">Peer tutoring · NS I</span><span class="chip">AC79–81 · course slides</span><span class="chip">Student handout</span></div>' +
  '<h1>Nervous System I · Anatomy &amp; Physiology</h1>' +
  '<div class="coverline"><div class="counts"><div><b>' + nC + '</b><span>concepts</span></div><div><b>' + nQ + '</b><span>questions</span></div></div>' +
  '<a class="qrlink" href="https://punnawit9285.github.io/nsi-peer-tutoring/"><span class="qrcap">Scan to open the interactive deck</span><img src="img/qr-site.svg" alt="QR code for punnawit9285.github.io/nsi-peer-tutoring"><span>punnawit9285.github.io/nsi-peer-tutoring</span></a></div>' +
  '<h3 class="minih">Contents</h3><table class="toc"><thead><tr><th>Section</th><th>Starts</th><th>Concepts · questions</th><th>Quiz answers</th><th>Blank answers</th><th>Thai concept explanations</th></tr></thead><tbody>';
S.forEach(s => {
  const qn = s.items.filter(isQ).length, cn = s.items.filter(it => it.t === 'c').length;
  h += '<tr><td><span class="tid">' + s.id + '</span>' + s.title + '</td><td>p. ' + pg('s-' + s.id) + '</td><td>' + cn + ' · ' + qn + '</td><td>p. ' + pg('a-' + s.id) + '</td><td>p. ' + pg('b-' + s.id) + '</td><td>p. ' + pg('x-' + s.id) + '</td></tr>';
});
h += '</tbody></table><p class="legend"><span class="chip core">core</span> done in the video</p></section>';

function qBlock(it) {
  let b = '<div class="pq"><div class="pqh"><b>' + it.id + '</b>' + (it.src ? '<span class="src">' + it.src + '</span>' : '') + (it.core ? '<span class="chip core">core</span>' : '') + (it.t === 'tf' ? '<span class="src">True / False</span>' : '') + (it.group ? '<span class="src">' + it.group + '</span>' : '') + '</div>';
  b += '<div class="pstem">' + it.q + '</div>';
  if (it.fig) b += '<div class="pfig">' + eager(it.fig) + '</div>';
  if (it.t === 'q') b += '<ol class="popt">' + it.o.map((o, i) => '<li><span class="L">' + LET[i] + '</span><span>' + o + '</span></li>').join('') + '</ol>';
  else if (it.t === 'tf') b += '<div class="ptf"><span><span class="L">T</span>True</span><span><span class="L">F</span>False</span></div>';
  else b += '<div class="plines"><i></i><i></i><i></i><i></i></div>';
  return b + '</div>';
}
units.forEach(u => {
  const s = u.s, it = u.c, first = s.items[0] === it;
  h += '<section class="cpage" data-id="' + it.id + '"><div class="cfit concept">' +
    (first ? '<div class="secband"><span class="chip kind">' + s.kind + '</span><span class="id">Section ' + s.id + '</span><b>' + s.title + '</b><span class="muted">' + s.blurb + '</span></div>' : '') +
    '<div class="eyebrow"><span class="id">' + it.id + '</span><span class="chip kind">Concept</span>' + (it.src ? '<span class="chip">' + it.src + '</span>' : '') + '<span class="sp"></span><span>' + s.title + '</span></div>' +
    '<h2>' + it.title + '</h2>' +
    '<div class="cbody">' + eager(blankify(it.html, it.id)) + '</div>' +
    '<p class="cfoot">' + (BLANKS[it.id].length ? BLANKS[it.id].length + ' blanks · answers p. ' + pg('b-' + s.id) + ' · ' : '') + 'Thai explanation of this concept: p. ' + pg('x-' + s.id) + '</p></div></section>';
  nB += BLANKS[it.id].length;
  if (u.qs.length) h += '<section class="quiz" data-for="' + it.id + '"><header class="quizh"><span class="id">Quiz · ' + it.id + ' ·</span><b>' + it.title + '</b><span class="sp"></span><span class="muted">' + u.qs.length + (u.qs.length === 1 ? ' question' : ' questions') + ' · answers p. ' + pg('a-' + s.id) + '</span></header><div class="qcols">' + u.qs.map(qBlock).join('') + '</div></section>';
});

/* ---------- answer key ---------- */
function ansLine(it) {
  if (it.t === 'q') { const A = [].concat(it.a); return A.map(i => '<span class="alet">' + LET[i] + '</span>').join(' ') + ' <span class="atxt">' + A.map(i => it.o[i]).join(' / ') + '</span>'; }
  if (it.t === 'tf') return '<span class="alet">' + (it.a ? 'T' : 'F') + '</span> <span class="atxt">' + (it.a ? 'True' : 'False') + '</span>';
  return '<span class="atxt">Model answer</span>';
}
h += '<section class="part"><div class="eyebrow"><span class="chip kind">Answer key</span></div><h1>เฉลยและคำอธิบาย</h1><p class="lede">Answers and Thai explanations for all ' + nQ + ' questions, grouped by the concept quiz they belong to.</p></section>';
S.forEach(s => {
  h += '<section class="aksec"><header class="akhead"><span class="id">Answer key · Section ' + s.id + '</span><b>' + s.title + '</b><span class="muted">section starts p. ' + pg('s-' + s.id) + '</span></header><div class="acols">';
  s.items.forEach(it => {
    if (it.t === 'c') { const u = units.find(x => x.c === it); if (u.qs.length) h += '<div class="akc"><b>' + it.id + '</b>' + it.title + ' <span class="muted">· quiz p. ' + pg('z-' + it.id) + '</span></div>'; return; }
    const tb = THAI_Q[it.id];
    h += '<div class="ak"><div class="akq"><b>' + it.id + '</b>' + ansLine(it) + '</div>' +
      (it.t === 'open' && it.ans ? '<p class="model">' + it.ans + '</p>' : '') +
      (tb && tb.length ? '<ul>' + tb.map(x => '<li>' + x + '</li>').join('') + '</ul>' : (it.ex ? '<p>' + it.ex + '</p>' : '')) +
      (it.flag ? '<div class="flag"><b>Recall note:</b> ' + it.flag + '</div>' : '') + '</div>';
  });
  h += '</div></section>';
});

/* ---------- answers to the concept blanks ---------- */
h += '<section class="part"><div class="eyebrow"><span class="chip kind">Concept blanks</span></div><h1>เฉลยช่องว่างใน concept</h1><p class="lede">The ' + nB + ' numbered blanks on the concept pages, concept by concept.</p></section>';
S.forEach(s => {
  h += '<section class="bksec"><header class="akhead"><span class="id">Concept blanks · Section ' + s.id + '</span><b>' + s.title + '</b></header><div class="bkcols">';
  s.items.filter(it => it.t === 'c' && BLANKS[it.id].length).forEach(it => {
    h += '<div class="bk"><div class="bkh"><b>' + it.id + '</b>' + it.title + ' <span class="muted">· p. ' + pg('k-' + it.id) + '</span></div><p class="bkl">' +
      BLANKS[it.id].map((a, i) => '<span class="bka"><i>' + (i + 1) + '</i>' + a + '</span>').join(' ') + '</p></div>';
  });
  h += '</div></section>';
});

/* ---------- Thai explanation of every concept ---------- */
h += '<section class="part"><div class="eyebrow"><span class="chip kind">Concepts in Thai</span></div><h1>อธิบาย concept เป็นภาษาไทย</h1><p class="lede">The key points and Thai explanation of each of the ' + nC + ' concept pages, in the same order.</p></section>';
S.forEach(s => {
  h += '<section class="xsec"><header class="akhead"><span class="id">Thai explanations · Section ' + s.id + '</span><b>' + s.title + '</b></header><div class="xcols">';
  s.items.filter(it => it.t === 'c').forEach(it => {
    const tx = window.THAI_EXPLAIN[it.id] || [];
    const kp = THAI_CONCEPT[it.id] || [];
    h += '<div class="xc"><div class="xch"><b>' + it.id + '</b>' + it.title + ' <span class="muted">· p. ' + pg('k-' + it.id) + '</span></div>' +
      (kp.length ? '<ul class="xkp">' + kp.map(b => '<li>' + b + '</li>').join('') + '</ul>' : '') + '<ul class="xtx">' + tx.map(p => '<li>' + p + '</li>').join('') + '</ul></div>';
  });
  h += '</div></section>';
});

/* ---------- fit each concept on one page ---------- */
const fitJs = `(function () {
  var PH = 0;
  function h(el) { return el.getBoundingClientRect().height; }
  /* Blanks are fixed-width boxes that cannot wrap, so a table squeezed beside a figure can be wider than its column
     (the scrolling wrapper then cuts it off on paper). Stack that grid (table full width, figure under it), then
     shrink any table that is still too wide. The page records what was done for tools/pdf.sh to report. */
  function wide(w) { return w.scrollWidth > w.clientWidth + 1; }
  function unclip(page) {
    var ws = page.querySelectorAll('.tblwrap'), i, g, nS = 0, minZ = 1, nC = 0;
    for (i = 0; i < ws.length; i++) {
      g = ws[i];
      while (wide(ws[i]) && (g = g.parentElement.closest('.two, .cols2, .cols3, .figpair')) && page.contains(g)) { g.classList.add('tstack'); nS++; }
    }
    for (i = 0; i < ws.length; i++) if (wide(ws[i])) {
      var z = Math.floor(ws[i].clientWidth / ws[i].scrollWidth * 1000) / 1000;
      ws[i].style.zoom = z; minZ = Math.min(minZ, z);
    }
    for (i = 0; i < ws.length; i++) if (wide(ws[i])) nC++;
    if (nS) page.setAttribute('data-tstack', nS);
    if (minZ < 1) page.setAttribute('data-tscale', minZ.toFixed(3));
    if (nC) page.setAttribute('data-tclip', nC);
  }
  function fit(page) {
    var inner = page.firstElementChild, lo = 0.4, hi = 1;
    inner.style.zoom = 1;
    unclip(page);
    if (h(page) <= PH) return 1;
    for (var i = 0; i < 10; i++) { var m = (lo + hi) / 2; inner.style.zoom = m; if (h(page) <= PH) lo = m; else hi = m; }
    inner.style.zoom = lo; return lo;
  }
  function run() {
    var probe = document.createElement('div'); probe.style.height = '266mm'; document.body.appendChild(probe); PH = h(probe); probe.remove();
    var ps = document.querySelectorAll('.cpage');
    for (var i = 0; i < ps.length; i++) {
      var z = fit(ps[i]); ps[i].setAttribute('data-zoom', z.toFixed(3));
      var q = ps[i].nextElementSibling;
      if (q && q.classList.contains('quiz')) {
        var used = q.getBoundingClientRect().bottom - ps[i].getBoundingClientRect().top;
        var together = z === 1 && used <= PH * 0.97;
        if (!together) q.style.breakBefore = 'page';
        q.setAttribute('data-place', together ? 'same-page' : 'next-page');
      }
    }
    document.documentElement.setAttribute('data-fitted', '1');
  }
  var go = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run); };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();`;

/* local copies from tools/fonts.sh when present (headless Chrome cannot always reach Google Fonts) */
const FONTS = fs.existsSync('dist/fonts/fonts.css') ? '<link rel="stylesheet" href="fonts/fonts.css">' :
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">';
const html = '<!doctype html>\n<html lang="en" data-theme="light">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Nervous System I · Anatomy &amp; Physiology · Peer tutoring · NS I · student handout</title>\n' + FONTS +
  '\n<style>\n' + rd('src/base.css') + '\n' + rd('src/print.css') + '\n</style>\n</head>\n<body>\n<main class="sheet">\n' + h + '\n</main>\n<script>' + fitJs + '</script>\n</body>\n</html>\n';
if (/<\/script/i.test(h)) throw new Error('script close tag inside content');
fs.writeFileSync('dist/print.html', html);
console.log('dist/print.html', html.length, 'bytes ·', nQ, 'questions ·', nC, 'concepts');
