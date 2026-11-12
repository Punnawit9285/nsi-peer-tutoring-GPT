/* Shared registry for both pages (deck + tutor notes).
   Concept-card HTML may mark key details as {{blanks}}: they render as click-to-reveal cloze spans. */
window.CVS = {
  sections: [],
  cloze: function (h) { return String(h).replace(/\{\{([\s\S]*?)\}\}/g, '<span class="cz">$1</span>'); },
  add: function (sec) {
    sec.items.forEach(function (it) { if (it.html) it.html = window.CVS.cloze(it.html); });
    this.sections.push(sec);
  }
};
