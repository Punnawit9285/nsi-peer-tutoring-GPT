(function () {
  var S = CVS.sections, LET = 'ABCDEFGH';
  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('nsitutor:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('nsitutor:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  var byId = {}, secOf = {};
  S.forEach(function (s, si) { s.items.forEach(function (it) { byId[it.id] = it; secOf[it.id] = si; }); });

  /* English recording script (src/tutor-script.js): plan, 80% summary, one SAY line per card */
  var SCRIPT = window.TUTOR_SCRIPT || { plan: [], sec: {} };
  function sayLine(id) { var s = S[secOf[id]], sc = s && SCRIPT.sec[s.id]; return sc && sc.say ? sc.say[id] || '' : ''; }
  function sayBox(text, label) { return text ? '<div class="saybox"><div class="tp-head">' + (label || 'พูดในวิดีโอ &#183; SAY') + '</div><p>' + text + '</p></div>' : ''; }

  var state = {}, view = 'present', coreOnly = false, seq = [], idx = 0;

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
  function renderQ(it) {
    var st = state[it.id] || {};
    var h = '<article class="card qcard rev" data-id="' + it.id + '">' + eyebrow(it) + '<div class="stem">' + it.q + '</div>';
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
    }
    h += '<div class="explain"><div class="ans">' + answerText(it) + '</div>' + renderExplainBullets(it) + (it.flag ? '<div class="flag"><b>Recall note:</b> ' + it.flag + '</div>' : '') + '</div>';
    h += sayBox(sayLine(it.id));
    return h + '</article>';
  }
  function notesHtml(it) {
    var n = window.TUTOR_NOTES && window.TUTOR_NOTES[it.id];
    if (!n) return '';
    var esc = function (x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    return '<div class="tnotes"><div class="tn-head">โน้ตผู้สอน &#183; นอกเหนือจากสไลด์</div>' +
      (n.b && n.b.length ? '<ul>' + n.b.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
      (n.d && n.d.length ? '<pre class="tdiag">' + n.d.map(esc).join('\n') + '</pre>' : '') + '</div>';
  }
  function thxHtml(it) {
    var tx = window.THAI_EXPLAIN && window.THAI_EXPLAIN[it.id];
    if (!tx || !tx.length) return '';
    return '<details class="thx" open><summary><span class="thx-h">Explanation</span><span class="thx-s">ภาษาไทย &#183; ' + tx.length + ' ข้อ</span></summary><ul class="thx-body">' + tx.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul></details>';
  }
  function renderC(it) {
    var kp = THAI_CONCEPT[it.id];
    var kpHtml = kp && kp.length ? '<div class="tpoints"><div class="tp-head">สรุปประเด็นสำคัญ (Key Points)</div><ul>' + kp.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div>' : '';
    return '<article class="card concept" data-id="' + it.id + '">' + eyebrow(it) + '<h2>' + it.title + '</h2>' + kpHtml + sayBox(sayLine(it.id)) + notesHtml(it) + thxHtml(it) + '<div class="cbody">' + it.html + '</div></article>';
  }
  function renderSec(si) {
    var s = S[si], c = counts(s), ts = THAI_SEC[s.id] || {}, sc = SCRIPT.sec[s.id] || {};
    var u80 = sc.u && sc.u.length ? '<details class="u80"><summary>Understand it: the 80% <span>English summary &#183; ' + sc.u.length + ' points</span></summary><ol>' + sc.u.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></details>' : '';
    var toc = s.items.filter(function (it) { return it.t === 'c'; }).map(function (it) { return '<li><span class="tid">' + it.id + '</span>' + it.title + '</li>'; }).join('');
    var trapsHtml = ts.traps && ts.traps.length ? '<div class="traps-box"><div class="tp-head">จุดหลอกข้อสอบที่พบบ่อย (Exam Traps)</div><ul>' + ts.traps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '';
    return '<article class="card secard"><div class="eyebrow"><span class="chip kind">' + s.kind + '</span><span class="id">Section ' + s.id + '</span><span class="chip">' + (si + 1) + ' of ' + S.length + '</span>' + (sc.part ? '<span class="chip core">' + sc.part + ' &#183; ' + sc.time + '</span>' : '') + '</div>' +
      '<h2>' + s.title + '</h2><p class="lede">' + (ts.big || s.blurb) + '</p>' + sayBox(sc.open, 'เปิด Section &#183; SAY') +
      '<div class="stats"><span><b>' + c.c + '</b>concept cards</span><span><b>' + c.q + '</b>questions</span><span><b>' + c.core + '</b>core, for the video</span></div>' +
      trapsHtml + u80 +
      '<h3 class="minih">Concept cards in this section</h3><ol class="toc">' + toc + '</ol></article>';
  }
  function planTable() {
    var bySec = {}; S.forEach(function (s) { bySec[s.id] = s; });
    var rows = (SCRIPT.plan || []).map(function (p) {
      var core = 0, names = [];
      p[1].forEach(function (id) { if (bySec[id]) { core += counts(bySec[id]).core; names.push('<b>' + id + '</b> ' + bySec[id].short); } });
      return '<tr><td>' + p[0] + '</td><td>' + names.join('<br>') + '</td><td class="num">' + core + '</td><td>' + p[2] + '</td><td class="num">' + p[3] + '</td></tr>';
    }).join('');
    return rows ? '<h3 class="minih">แผนการอัดวิดีโอ &#183; Recording plan</h3><div class="tblwrap"><table class="tbl compact plan"><thead><tr><th>Video</th><th>Sections</th><th>Core Qs</th><th>Covers</th><th>Length</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '';
  }
  function renderIntro() {
    var tot = 0, core = 0;
    S.forEach(function (s) { var c = counts(s); tot += c.q; core += c.core; });
    var st = S.map(function (s, si) {
      var c = counts(s);
      return '<button type="button" class="station" data-sec="' + si + '"><span class="k">' + s.id + ' &#183; ' + s.kind + '</span><b>' + s.short + '</b><span>' + c.q + ' questions &#183; ' + c.core + ' core</span></button>';
    }).join('');
    return '<article class="card secard"><div class="eyebrow"><span class="chip kind">Peer tutoring · NS I</span><span class="chip">All Answers Revealed &#183; คำอธิบายภาษาไทย</span></div>' +
      '<h2>Nervous System I · Anatomy &amp; Physiology &#183; หน้าสำหรับผู้สอน (Tutor View)</h2>' +
      '<p class="lede">หน้าตาและลำดับการ์ดตรงกับ Student Deck ทุกข้อ (' + tot + ' คำถาม, ' + core + ' ข้อหลักสำหรับอัดวิดีโอ และ ' + S.reduce(function (n, s) { return n + counts(s).c; }, 0) + ' Concept Cards) โดยเปิดเฉลยคำตอบและช่องว่าง Cloze ทั้งหมดไว้ล่วงหน้า พร้อมคำอธิบายภาษาไทย</p>' +
      '<div class="stations">' + st + '</div>' + planTable() +
      '<div class="traps-box"><div class="tp-head">วิธีใช้งานคู่กับหน้า Student Deck</div><ul>' +
      '<li>เปิด <b>Student Deck</b> ในหน้าจอที่ใช้อัดวิดีโอ และเปิดหน้า <b>Tutor Deck</b> นี้ไว้ดูโพยคำอธิบายควบคู่กัน (รหัสการ์ด เช่น <code>R12</code>, <code>F-C2</code>, <code>D-C3</code> ตรงกันทั้งหมด)</li>' +
      '<li>เปิด Student Deck กับหน้านี้ใน<b>เบราว์เซอร์เดียวกัน</b> (คนละแท็บหรือคนละหน้าต่าง) แล้วเปิด <b>Follow student</b> ไว้ เมื่อเลื่อนการ์ดในหน้า Student หน้านี้จะเลื่อนตามไปการ์ดเดียวกันเอง</li>' +
      '<li>กล่อง <b>SAY</b> คือประโยคภาษาอังกฤษสั้นๆ สำหรับพูดตอนอัด ส่วน bullet ภาษาไทยไว้อ่านทำความเข้าใจก่อนพูด</li>' +
      '<li>กดปุ่ม <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> หรือ <kbd>Space</kbd> เพื่อเลื่อนการ์ดทีละข้อในโหมด <b>Present</b> หรือกด <kbd>B</kbd> เพื่อดูรายการทั้งหมดแบบ <b>Browse</b></li>' +
      '<li>ติ๊ก <b>Core only</b> เพื่อกรองเฉพาะข้อหลัก (' + core + ' ข้อ) ที่คัดมาสำหรับอัดวิดีโอสรุป</li>' +
      '</ul></div></article>';
  }

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
  function renderStage() {
    var it = seq[idx];
    $('stage').innerHTML = it.t === 'intro' ? renderIntro() : it.t === 'sec' ? renderSec(it.si) : it.t === 'c' ? renderC(it) : renderQ(it);
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
    setHash(it.id);
    LS.set('pos', it.id);
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
  function selectOpt(it, v, card) {
    var st = state[it.id] = state[it.id] || {};
    st.sel = st.sel === v ? undefined : v;
    var opts = card.querySelectorAll('.opt');
    for (var i = 0; i < opts.length; i++) {
      var ov = opts[i].getAttribute('data-v');
      var match = st.sel !== undefined && (it.t === 'tf' ? (ov === 'true') === st.sel : parseInt(ov, 10) === st.sel);
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
    S.forEach(function (s) {
      h += '<section class="bsec" id="b-' + s.id + '"><header><div class="eyebrow"><span class="chip kind">' + s.kind + '</span><span class="id">Section ' + s.id + '</span></div><h2>' + s.title + '</h2><p>' + ((THAI_SEC[s.id] && THAI_SEC[s.id].big) || s.blurb) + '</p></header>';
      s.items.forEach(function (it) { if (coreOnly && isQ(it) && !it.core) return; h += it.t === 'c' ? renderC(it) : renderQ(it); });
      h += '</section>';
    });
    $('blist').innerHTML = h;
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
    $('bcount').textContent = q ? n + ' / ' + tot + ' การ์ด' : tot + ' การ์ด';
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
    var im = t ? t.closest('.scan img') : null;
    if (im) { openZoom(im); return; }
    var b = t ? t.closest('button') : null;
    if (!b) return;
    if (b.classList.contains('opt')) {
      var card = b.closest('.qcard'); if (!card) return;
      var it = byId[card.getAttribute('data-id')];
      var raw = b.getAttribute('data-v');
      selectOpt(it, it.t === 'tf' ? raw === 'true' : parseInt(raw, 10), card);
      return;
    }
    if (b.classList.contains('station') || b.classList.contains('tab')) { gotoSec(parseInt(b.getAttribute('data-sec'), 10)); return; }
  });
  $('prev').addEventListener('click', function () { go(-1); });
  $('next').addEventListener('click', function () { go(1); });
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
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { go(1); e.preventDefault(); return; }
    if (k === 'ArrowLeft' || k === 'PageUp') { go(-1); e.preventDefault(); return; }
    if (k === 'b' || k === 'B') { setView('browse'); return; }
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
  window.addEventListener('hashchange', function () { jumpTo(location.hash.slice(1)); });

  /* ---------- follow the student deck (same browser, another tab or window) ---------- */
  var follow = LS.get('follow', true);
  function readDeckPos() { try { var v = localStorage.getItem('nsideck:pos'); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function followTo(id) {
    if (!follow || !id || (view === 'present' && seq[idx] && seq[idx].id === id)) return;
    if (view === 'browse') { var el = document.querySelector('#blist [data-id="' + id + '"]'); if (el) { el.scrollIntoView({ block: 'start' }); return; } }
    if (jumpTo(id)) { try { window.scrollTo(0, 0); } catch (e) { } }
  }
  window.addEventListener('storage', function (e) { if (e.key === 'nsideck:pos' && e.newValue) { try { followTo(JSON.parse(e.newValue)); } catch (err) { } } });
  try { var bc = new BroadcastChannel('nsi-peer'); bc.onmessage = function (e) { if (e.data && e.data.pos) followTo(e.data.pos); }; } catch (e) { }
  $('follow').checked = follow;
  $('follow').addEventListener('change', function () { follow = this.checked; LS.set('follow', follow); if (follow) followTo(readDeckPos()); });

  /* ---------- start ---------- */
  $('tabs').innerHTML = S.map(function (s, si) { return '<button type="button" class="tab" data-sec="' + si + '"><span class="k">' + s.id + '</span>' + s.short + '</button>'; }).join('');
  var th = LS.get('theme', null); if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);

  function start(data) {
    data = data || {};
    if (data.state) state = data.state;
    coreOnly = typeof data.coreOnly === 'boolean' ? data.coreOnly : !!LS.get('core', false);
    $('coreOnly').checked = coreOnly;
    buildSeq();
    var want = location.hash ? location.hash.slice(1) : (data.pos || (follow && readDeckPos()) || LS.get('pos', 'start'));
    var k = find(want); idx = k >= 0 ? k : 0;
    setView(data.view || LS.get('view', 'present'));
  }
  var hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(function () { return { state: state, view: view, coreOnly: coreOnly, pos: seq[idx] && seq[idx].id }; }); } catch (e) { }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(start); else start((hot && hot.data) || {});
})();
