(function () {
  var S = CVS.sections, LET = 'ABCDEFGH';
  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('nsideck:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('nsideck:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var byId = {}, secOf = {};
  S.forEach(function (s, si) { s.items.forEach(function (it) { byId[it.id] = it; secOf[it.id] = si; }); });

  var state = {}, view = 'present', coreOnly = false, seq = [], idx = 0;
  var thxOpen = !!LS.get('thx', false);  /* Thai explanation panel on concept cards: open or closed, remembered */
  var bc = null; try { bc = new BroadcastChannel('nsi-peer'); } catch (e) { }  /* lets an open tutor deck follow along */

  function isQ(it) { return !!it && (it.t === 'q' || it.t === 'tf' || it.t === 'open'); }
  function secIndex(it) { return it.t === 'intro' ? -1 : (it.t === 'sec' ? it.si : secOf[it.id]); }
  function counts(s) { var c = { c: 0, q: 0, core: 0 }; s.items.forEach(function (it) { if (it.t === 'c') c.c++; else { c.q++; if (it.core) c.core++; } }); return c; }
  function find(id) { for (var i = 0; i < seq.length; i++) { if (seq[i].id === id) return i; } return -1; }

  function buildSeq() {
    seq = [{ t: 'intro', id: 'start' }];
    S.forEach(function (s, si) {
      seq.push({ t: 'sec', id: 'sec-' + s.id, si: si });
      s.items.forEach(function (it) { if (coreOnly && isQ(it) && !it.core) return; seq.push(it); });
    });
  }

  /* ---------- renderers ---------- */
  function eyebrow(it) {
    var s = S[secOf[it.id]];
    var h = '<div class="eyebrow"><span class="id">' + it.id + '</span>';
    h += it.t === 'c' ? '<span class="chip kind">Concept</span>' : '<span class="chip">' + (it.t === 'tf' ? 'True / False' : it.t === 'open' ? 'Think and explain' : 'MCQ') + '</span>';
    if (it.src) h += '<span class="chip">' + it.src + '</span>';
    if (it.core) h += '<span class="chip core">core</span>';
    if (it.group) h += '<span class="chip grp">' + it.group + '</span>';
    return h + '<span class="sp"></span><span>' + s.short + '</span></div>';
  }
  function answerText(it) {
    if (it.t === 'q') {
      var A = [].concat(it.a);
      return 'เฉลย ' + A.map(function (i) { return LET[i]; }).join(' &amp; ') + ' &#183; ' + A.map(function (i) { return it.o[i]; }).join(' / ');
    }
    if (it.t === 'tf') return 'เฉลย: ' + (it.a ? 'True' : 'False');
    return 'แนวคำตอบ (Model Answer)';
  }
  function renderExplainBullets(it) {
    var bullets = THAI_Q[it.id];
    if (bullets && bullets.length) {
      return '<ul class="ex-list">' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>';
    }
    return '<p>' + (it.ex || it.ans || '') + '</p>';
  }
  function renderQ(it, browse) {
    var st = state[it.id] || {};
    var h = '<article class="card qcard' + (st.rev ? ' rev' : '') + '" data-id="' + it.id + '">' + eyebrow(it) + '<div class="stem">' + it.q + '</div>';
    if (it.fig) h += '<div class="qfig">' + it.fig + '</div>';
    if (it.t === 'q') {
      var A = [].concat(it.a);
      h += '<ol class="opts">' + it.o.map(function (o, i) {
        return '<li><button type="button" class="opt' + (A.indexOf(i) >= 0 ? ' isans' : '') + (st.sel === i ? ' sel' : '') + '" data-v="' + i + '"><span class="L">' + LET[i] + '</span><span class="ot">' + o + '</span><span class="mk" aria-hidden="true"></span></button></li>';
      }).join('') + '</ol>';
    } else if (it.t === 'tf') {
      h += '<div class="tfrow">' + [true, false].map(function (v) {
        return '<button type="button" class="opt' + (it.a === v ? ' isans' : '') + (st.sel === v ? ' sel' : '') + '" data-v="' + v + '"><span class="L">' + (v ? 'T' : 'F') + '</span><span class="ot">' + (v ? 'True' : 'False') + '</span><span class="mk" aria-hidden="true"></span></button>';
      }).join('') + '</div>';
    } else {
      h += '<p class="think">Think it through and say your answer out loud, then reveal.</p>';
    }
    h += '<div class="explain"><div class="ans">' + answerText(it) + '</div>' + renderExplainBullets(it) + (it.flag ? '<div class="flag"><b>Recall note:</b> ' + it.flag + '</div>' : '') + '</div>';
    if (browse) h += '<div class="qfoot"><button type="button" class="btn small bshow">' + (st.rev ? 'Hide answer' : 'Show answer') + '</button></div>';
    return h + '</article>';
  }
  function thxHtml(it, open) {
    var tx = window.THAI_EXPLAIN && window.THAI_EXPLAIN[it.id];
    if (!tx || !tx.length) return '';
    return '<details class="thx"' + (open ? ' open' : '') + '><summary><span class="thx-h">Explanation</span><span class="thx-s">ภาษาไทย &#183; click or press L</span></summary><ul class="thx-body">' + tx.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul></details>';
  }
  function renderC(it) {
    var kp = THAI_CONCEPT[it.id];
    var kpHtml = kp && kp.length ? '<div class="tpoints"><div class="tp-head">สรุปประเด็นสำคัญ (Key Points)</div><ul>' + kp.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div>' : '';
    return '<article class="card concept" data-id="' + it.id + '">' + eyebrow(it) + '<h2>' + it.title + '</h2>' + kpHtml + '<div class="cbody">' + it.html + '</div>' + thxHtml(it, thxOpen) + '</article>';
  }
  function renderSec(si) {
    var s = S[si], c = counts(s), ts = THAI_SEC[s.id] || {};
    var toc = s.items.filter(function (it) { return it.t === 'c'; }).map(function (it) { return '<li><span class="tid">' + it.id + '</span>' + it.title + '</li>'; }).join('');
    var trapsHtml = ts.traps && ts.traps.length ? '<div class="traps-box"><div class="tp-head">จุดหลอกข้อสอบที่พบบ่อย (Exam Traps)</div><ul>' + ts.traps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '';
    return '<article class="card secard"><div class="eyebrow"><span class="chip kind">' + s.kind + '</span><span class="id">Section ' + s.id + '</span><span class="chip">' + (si + 1) + ' of ' + S.length + '</span></div>' +
      '<h2>' + s.title + '</h2><p class="lede">' + (ts.big || s.blurb) + '</p>' +
      '<div class="stats"><span><b>' + c.c + '</b>concept cards</span><span><b>' + c.q + '</b>questions</span><span><b>' + c.core + '</b>core, for the video</span></div>' +
      trapsHtml +
      '<h3 class="minih">Concept cards in this section</h3><ol class="toc">' + toc + '</ol></article>';
  }
  function renderIntro() {
    var tot = 0, core = 0;
    S.forEach(function (s) { var c = counts(s); tot += c.q; core += c.core; });
    var st = S.map(function (s, si) {
      var c = counts(s);
      return '<button type="button" class="station" data-sec="' + si + '"><span class="k">' + s.id + ' &#183; ' + s.kind + '</span><b>' + s.short + '</b><span>' + c.q + ' questions &#183; ' + c.core + ' core</span></button>';
    }).join('');
    var nc = 0; S.forEach(function (s) { nc += counts(s).c; });
    return '<article class="card secard"><div class="eyebrow"><span class="chip kind">Peer tutoring · NS I</span><span class="chip">AC79–81 · course slides</span></div>' +
      '<h2>Nervous System I · Anatomy &amp; Physiology</h2>' +
      '<div class="coverline"><div class="counts"><div><b>' + nc + '</b><span>concepts</span></div><div><b>' + tot + '</b><span>questions</span></div></div>' +
      '<a class="qrlink" href="https://punnawit9285.github.io/nsi-peer-tutoring/"><span class="qrcap">Scan to open the interactive deck</span><img src="img/qr-site.svg" width="112" height="112" alt="QR code for punnawit9285.github.io/nsi-peer-tutoring"><span>punnawit9285.github.io/nsi-peer-tutoring</span></a></div>' +
      '<div class="stations">' + st + '</div>' +
      '<p class="legend"><span class="chip core">core</span> done in the video</p></article>';
  }

  /* ---------- cloze blanks on concept cards ---------- */
  function czOf(card) { return card ? card.querySelectorAll('.cz') : []; }
  function czLeft(card) { var n = 0, cz = czOf(card); for (var i = 0; i < cz.length; i++) if (!cz[i].classList.contains('on')) n++; return n; }
  function czApply(card, id) {
    var on = (state[id] || {}).cz || [], cz = czOf(card);
    for (var i = 0; i < cz.length; i++) cz[i].classList.toggle('on', on.indexOf(i) >= 0);
  }
  function czSave(card, id) {
    var cz = czOf(card), on = [];
    for (var i = 0; i < cz.length; i++) if (cz[i].classList.contains('on')) on.push(i);
    (state[id] = state[id] || {}).cz = on;
    if (view === 'present') updateReveal();
  }
  function flash(el) { el.classList.remove('last'); void el.offsetWidth; el.classList.add('last'); }
  function ensureVisible(el) {
    try {
      var r = el.getBoundingClientRect(), pg = document.querySelector('.pager'), bottom = window.innerHeight - (pg ? pg.offsetHeight : 0) - 24;
      if (r.bottom > bottom) window.scrollBy({ top: r.bottom - bottom, behavior: 'smooth' });
      else if (r.top < 80) window.scrollBy({ top: r.top - 80, behavior: 'smooth' });
    } catch (e) { }
  }
  function czNext(card, id) {
    var cz = czOf(card);
    for (var i = 0; i < cz.length; i++) {
      if (!cz[i].classList.contains('on')) { cz[i].classList.add('on'); flash(cz[i]); ensureVisible(cz[i]); czSave(card, id); return true; }
    }
    return false;
  }
  function czAll(card, id, on) { var cz = czOf(card); for (var i = 0; i < cz.length; i++) cz[i].classList.toggle('on', on); czSave(card, id); }

  /* ---------- figure zoom ---------- */
  var zoom = document.createElement('div');
  zoom.className = 'zoom'; zoom.hidden = true;
  zoom.setAttribute('role', 'dialog'); zoom.setAttribute('aria-label', 'Enlarged figure (click or press Esc to close)');
  zoom.innerHTML = '<div class="zbox"><div class="zpaper"><img alt=""></div><p class="zcap"></p></div>';
  document.body.appendChild(zoom);
  function openZoom(im) {
    var fig = im.closest('figure'), cap = fig ? fig.querySelector('figcaption') : null, zi = zoom.querySelector('img');
    zi.src = im.currentSrc || im.src; zi.alt = im.alt || '';
    zoom.querySelector('.zcap').innerHTML = cap ? cap.innerHTML : '';
    zoom.hidden = false;
  }
  function closeZoom() { zoom.hidden = true; }
  zoom.addEventListener('click', closeZoom);

  /* ---------- present mode ---------- */
  function setTabs(si) {
    var tabs = $('tabs').children;
    for (var i = 0; i < tabs.length; i++) tabs[i].setAttribute('aria-current', i === si ? 'true' : 'false');
  }
  function setHash(id) { try { if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id); } catch (e) { } }
  function updateReveal() {
    var it = seq[idx], rv = $('reveal'), q = isQ(it);
    if (it.t === 'c') {
      var cc = $('stage').querySelector('.concept'), n = czOf(cc).length, left = czLeft(cc);
      rv.disabled = !n;
      rv.textContent = !n ? 'Reveal' : left ? 'Reveal next \u00B7 ' + left + ' left' : 'Hide blanks';
      return;
    }
    rv.disabled = !q;
    rv.textContent = q && (state[it.id] || {}).rev ? 'Hide answer' : 'Reveal';
  }
  function renderStage() {
    var it = seq[idx];
    $('stage').innerHTML = it.t === 'intro' ? renderIntro() : it.t === 'sec' ? renderSec(it.si) : it.t === 'c' ? renderC(it) : renderQ(it, false);
    if (it.t === 'c') czApply($('stage').querySelector('.concept'), it.id);
    var si = secIndex(it);
    setTabs(si);
    if (si < 0) { $('pos').innerHTML = 'Start'; }
    else {
      var n = 0, k = 0;
      for (var i = 0; i < seq.length; i++) { if (secIndex(seq[i]) === si && seq[i].t !== 'sec') { n++; if (seq[i] === it) k = n; } }
      $('pos').innerHTML = S[si].short + ' &#183; ' + (it.t === 'sec' ? 'intro' : k + ' / ' + n) + (it.t === 'sec' ? '' : ' &#183; <span>' + it.id + '</span>');
    }
    $('progBar').style.width = (100 * idx / (seq.length - 1)) + '%';
    $('prev').disabled = idx === 0;
    $('next').disabled = idx === seq.length - 1;
    updateReveal();
    setHash(it.id);
    LS.set('pos', it.id);
    try { if (bc) bc.postMessage({ pos: it.id }); } catch (e) { }
  }
  function go(d) {
    var n = Math.max(0, Math.min(seq.length - 1, idx + d));
    if (n === idx) return;
    idx = n; renderStage();
    try { window.scrollTo(0, 0); } catch (e) { }
  }
  function gotoSec(si) {
    if (view === 'present') { var k = find('sec-' + S[si].id); if (k >= 0) { idx = k; renderStage(); try { window.scrollTo(0, 0); } catch (e) { } } }
    else { var h = document.querySelector('#b-' + S[si].id + ' > header'); if (h) h.scrollIntoView({ block: 'start' }); setTabs(si); }
  }
  function toggleReveal(id, card) {
    var st = state[id] = state[id] || {};
    st.rev = !st.rev;
    if (card) {
      card.classList.toggle('rev', st.rev);
      var b = card.querySelector('.bshow'); if (b) b.textContent = st.rev ? 'Hide answer' : 'Show answer';
    }
    if (view === 'present') updateReveal();
  }
  function resetItem(id) {
    state[id] = {};
    if (view === 'present') renderStage();
  }
  function selectOpt(it, v, card) {
    var st = state[it.id] = state[it.id] || {};
    if (st.rev) return;
    st.sel = v;
    var opts = card.querySelectorAll('.opt');
    for (var i = 0; i < opts.length; i++) {
      var ov = opts[i].getAttribute('data-v');
      var match = it.t === 'tf' ? (ov === 'true') === v : parseInt(ov, 10) === v;
      opts[i].classList.toggle('sel', match);
    }
  }
  function jumpTo(id) {
    if (!id) return false;
    var k = find(id);
    if (k < 0 && byId[id]) { coreOnly = false; $('coreOnly').checked = false; LS.set('core', false); buildSeq(); k = find(id); }
    if (k < 0) return false;
    idx = k;
    if (view !== 'present') setView('present'); else renderStage();
    return true;
  }

  /* ---------- browse mode ---------- */
  function renderBrowse() {
    var h = '';
    S.forEach(function (s, si) {
      h += '<section class="bsec" id="b-' + s.id + '"><header><div class="eyebrow"><span class="chip kind">' + s.kind + '</span><span class="id">Section ' + s.id + '</span></div><h2>' + s.title + '</h2><p>' + s.blurb + '</p></header>';
      s.items.forEach(function (it) { if (coreOnly && isQ(it) && !it.core) return; h += it.t === 'c' ? renderC(it) : renderQ(it, true); });
      h += '</section>';
    });
    $('blist').innerHTML = h;
    var cs = $('blist').querySelectorAll('.concept');
    for (var i = 0; i < cs.length; i++) czApply(cs[i], cs[i].getAttribute('data-id'));
    applySearch();
  }
  function applySearch() {
    var q = ($('q').value || '').trim().toLowerCase(), n = 0, tot = 0;
    var cards = $('blist').querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      tot++;
      var show = !q || cards[i].textContent.toLowerCase().indexOf(q) >= 0;
      cards[i].hidden = !show;
      if (show) n++;
    }
    $('bcount').textContent = q ? n + ' of ' + tot + ' cards match' : tot + ' cards';
  }
  function setView(v) {
    view = v; LS.set('view', v);
    $('present').hidden = v !== 'present';
    $('browse').hidden = v !== 'browse';
    $('vPresent').setAttribute('aria-pressed', v === 'present' ? 'true' : 'false');
    $('vBrowse').setAttribute('aria-pressed', v === 'browse' ? 'true' : 'false');
    if (v === 'browse') {
      renderBrowse();
      var it = seq[idx], si = secIndex(it), el = null;
      if (it.t === 'c' || isQ(it)) el = document.querySelector('#blist [data-id="' + it.id + '"]');
      if (!el && si >= 0) el = document.querySelector('#b-' + S[si].id + ' > header');
      if (el) el.scrollIntoView({ block: 'start' });
      setTabs(Math.max(si, 0));
    } else {
      renderStage();
    }
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    var z = t ? t.closest('.cz') : null;
    if (z) {
      var zc = z.closest('.concept');
      if (zc) { z.classList.toggle('on'); if (z.classList.contains('on')) flash(z); czSave(zc, zc.getAttribute('data-id')); }
      return;
    }
    var im = t ? t.closest('.scan img') : null;
    if (im) { openZoom(im); return; }
    var b = t ? t.closest('button') : null;
    if (!b) return;
    if (b.classList.contains('opt')) {
      var card = b.closest('.qcard'); if (!card) return;
      var it = byId[card.getAttribute('data-id')];
      var raw = b.getAttribute('data-v');
      selectOpt(it, it.t === 'tf' ? raw === 'true' : parseInt(raw, 10), card);
      if (!(state[it.id] || {}).rev) toggleReveal(it.id, card);
      return;
    }
    if (b.classList.contains('bshow')) { var c2 = b.closest('.qcard'); toggleReveal(c2.getAttribute('data-id'), c2); return; }
    if (b.classList.contains('station') || b.classList.contains('tab')) { gotoSec(parseInt(b.getAttribute('data-sec'), 10)); return; }
  });
  $('prev').addEventListener('click', function () { go(-1); });
  $('next').addEventListener('click', function () { go(1); });
  $('reveal').addEventListener('click', function () {
    var it = seq[idx];
    if (it.t === 'c') { var cc = $('stage').querySelector('.concept'); if (!czNext(cc, it.id)) czAll(cc, it.id, false); return; }
    if (isQ(it)) toggleReveal(it.id, $('stage').querySelector('.qcard'));
  });
  $('vPresent').addEventListener('click', function () { setView('present'); });
  $('vBrowse').addEventListener('click', function () { setView('browse'); });
  $('coreOnly').addEventListener('change', function () {
    var cur = seq[idx];
    coreOnly = this.checked; LS.set('core', coreOnly); buildSeq();
    var k = find(cur.id);
    if (k < 0) { var si = secIndex(cur); k = find('sec-' + S[Math.max(si, 0)].id); }
    idx = Math.max(0, k);
    if (view === 'present') renderStage(); else renderBrowse();
  });
  $('q').addEventListener('input', applySearch);
  $('showAll').addEventListener('change', function () { $('blist').classList.toggle('showall', this.checked); });
  $('themeBtn').addEventListener('click', function () {
    var root = document.documentElement, t = root.getAttribute('data-theme');
    var dark = t ? t === 'dark' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next); LS.set('theme', next);
  });
  $('fsBtn').addEventListener('click', function () {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (document.documentElement.requestFullscreen) { var p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(function () { }); }
    } catch (err) { }
  });
  document.addEventListener('keydown', function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (!zoom.hidden) { if (k === 'Escape' || k === ' ' || k === 'Enter') { e.preventDefault(); closeZoom(); } return; }
    if (view !== 'present') { if (k === 'b' || k === 'B') setView('present'); return; }
    var it = seq[idx];
    if (k === 'ArrowRight' || k === 'PageDown') { go(1); e.preventDefault(); return; }
    if (k === 'ArrowLeft' || k === 'PageUp') { go(-1); e.preventDefault(); return; }
    if (k === ' ' || k === 'Enter') {
      e.preventDefault();
      if (it.t === 'c') {
        var cc = $('stage').querySelector('.concept');
        if (czLeft(cc)) { if (k === ' ') czNext(cc, it.id); else czAll(cc, it.id, true); } else go(1);
        return;
      }
      if (isQ(it) && !(state[it.id] || {}).rev) toggleReveal(it.id, $('stage').querySelector('.qcard')); else go(1);
      return;
    }
    if (k === 'b' || k === 'B') { setView('browse'); return; }
    if ((k === 'l' || k === 'L') && it.t === 'c') { var tx = $('stage').querySelector('.thx'); if (tx) { tx.open = !tx.open; if (tx.open) ensureVisible(tx); } return; }
    if (k === 'r' || k === 'R') { if (isQ(it)) resetItem(it.id); else if (it.t === 'c') czAll($('stage').querySelector('.concept'), it.id, false); return; }
    var card = $('stage').querySelector('.qcard'); if (!card) return;
    var up = k.toUpperCase();
    if (it.t === 'tf') { if (up === 'T') selectOpt(it, true, card); else if (up === 'F') selectOpt(it, false, card); return; }
    if (it.t === 'q') {
      var i = LET.indexOf(up);
      if (i < 0 && /^[1-8]$/.test(k)) i = parseInt(k, 10) - 1;
      if (i >= 0 && i < it.o.length) selectOpt(it, i, card);
    }
  });
  var tx = null;
  document.addEventListener('touchstart', function (e) {
    if (view !== 'present' || e.touches.length !== 1) { tx = null; return; }
    var t = e.target; if (t && t.closest && t.closest('.tblwrap, .tabs')) { tx = null; return; }
    tx = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!tx) return;
    var dx = e.changedTouches[0].clientX - tx[0], dy = e.changedTouches[0].clientY - tx[1];
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx < 0 ? 1 : -1);
    tx = null;
  }, { passive: true });
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d && d.classList && d.classList.contains('thx') && view === 'present') { thxOpen = d.open; LS.set('thx', thxOpen); }
  }, true);
  window.addEventListener('hashchange', function () { jumpTo(location.hash.slice(1)); });

  /* ---------- start ---------- */
  $('tabs').innerHTML = S.map(function (s, si) { return '<button type="button" class="tab" data-sec="' + si + '"><span class="k">' + s.id + '</span>' + s.short + '</button>'; }).join('');
  var th = LS.get('theme', null); if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);

  function start(data) {
    data = data || {};
    if (data.state) state = data.state;
    coreOnly = typeof data.coreOnly === 'boolean' ? data.coreOnly : !!LS.get('core', false);
    $('coreOnly').checked = coreOnly;
    buildSeq();
    var want = location.hash ? location.hash.slice(1) : (data.pos || LS.get('pos', 'start'));
    var k = find(want); idx = k >= 0 ? k : 0;
    setView(data.view || LS.get('view', 'present'));
  }
  var hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(function () { return { state: state, view: view, coreOnly: coreOnly, pos: seq[idx] && seq[idx].id }; }); } catch (e) { }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});
})();
