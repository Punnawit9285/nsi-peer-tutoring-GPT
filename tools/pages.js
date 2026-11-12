/* Find where each part of the handout landed. node tools/pages.js <pdftext.txt> [--check pages.json] */
const fs = require('fs');
global.window = global;
["lib", "b", "i", "n", "s", "f", "k", "u", "o", "d", "c", "a", "p", "m", "j", "l", "e", "r", "g", "t", "h", "w", "v", "x"].forEach(f => eval(fs.readFileSync('data/' + f + '.js', 'utf8')));
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('\t'); return { n: +l.slice(0, i), t: l.slice(i + 1) }; });
const first = (re, from) => { const p = lines.find(l => l.n >= (from || 1) && re.test(l.t)); return p ? p.n : 0; };
/* PDF text extraction can split words ("a n d"), so phrases are matched with all spaces removed */
const phrase = (str, from) => { const k = str.replace(/\s+/g, ''); const p = lines.find(l => l.n >= (from || 1) && l.t.replace(/\s+/g, '').includes(k)); return p ? p.n : 0; };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const out = {};
out.ans = phrase('Answer key', 2);
out.thx = phrase('Concepts in Thai', 2);
out.blk = phrase('Concept blanks', out.ans);
CVS.sections.forEach(s => {
  const cs = s.items.filter(it => it.t === 'c');
  cs.forEach(it => {
    out['k-' + it.id] = first(new RegExp('(^|[^\\w-])' + esc(it.id) + '(?![\\w])'), 2);
    const nq = s.items.slice(s.items.indexOf(it) + 1).findIndex(x => x.t === 'c');
    const hasQ = (nq < 0 ? s.items.length - s.items.indexOf(it) - 1 : nq) > 0;
    if (hasQ) out['z-' + it.id] = phrase('Quiz · ' + it.id + ' ·', out['k-' + it.id]);
  });
  out['s-' + s.id] = out['k-' + cs[0].id];
  out['a-' + s.id] = phrase('Answer key · Section ' + s.id + ' ' + s.title.split(' ')[0]);
  out['b-' + s.id] = phrase('Concept blanks · Section ' + s.id + ' ' + s.title.split(' ')[0]);
  out['x-' + s.id] = phrase('Thai explanations · Section ' + s.id + ' ' + s.title.split(' ')[0]);
});
/* every concept page must show the end of its card: a missing tail means the page clipped it */
const plain = h => String(h).replace(/<span class="cz">[\s\S]*?<\/span>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\{\{|\}\}/g, '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z]+;/g, '').replace(/\s+/g, '');
const clipped = [];
CVS.sections.forEach(s => s.items.filter(it => it.t === 'c').forEach(it => {
  /* the end of the text and the start of every figure caption must be on the page (text extraction order varies) */
  const h = String(it.html).replace(/<details\b[\s\S]*?<\/details>/g, ' '), an = x => x.replace(/[^A-Za-z0-9]/g, '');  /* collapsed parts don't print */
  const marks = [an(plain(h.replace(/<figure\b[\s\S]*?<\/figure>/g, ' '))).slice(-14)]
    .concat((h.match(/<figcaption[\s\S]*?<\/figcaption>/g) || []).map(c => an(plain(c)).slice(0, 14)));
  const pgT = an((lines.find(l => l.n === out['k-' + it.id]) || {}).t || '');
  if (marks.some(m => m && !pgT.includes(m))) clipped.push(it.id);
}));
if (clipped.length) { console.error('concept pages that may be clipped:', clipped.join(' ')); process.exitCode = 3; }
const missing = Object.keys(out).filter(k => !out[k]);
if (missing.length) { console.error('not found:', missing.join(' ')); process.exit(1); }
const ci = process.argv.indexOf('--check');
if (ci > 0) {
  const want = JSON.parse(fs.readFileSync(process.argv[ci + 1], 'utf8'));
  const bad = Object.keys(out).filter(k => out[k] !== want[k]);
  console.log('pages:', lines.length, '· cross-references', bad.length ? 'MOVED: ' + bad.map(k => k + ' ' + want[k] + '→' + out[k]).join(', ') : 'all correct');
  if (bad.length) process.exit(2);
} else console.log(JSON.stringify(out));
