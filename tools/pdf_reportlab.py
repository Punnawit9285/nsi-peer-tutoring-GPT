#!/usr/bin/env python3
"""A4 fallback renderer for environments where Chromium cannot open a local file.
Two passes calculate the actual page map, then fill every cross-reference."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from PIL import Image
from pypdf import PdfReader
import json,re,html,sys,os,math
ROOT=Path(__file__).resolve().parent.parent
FILES=['b','i','n','s','f','k','u','o','d','c','a','p','m','j','l','e','r','g','t','h','w','v','x']
def js(path,prefix):return json.loads((ROOT/path).read_text().split(prefix,1)[1].split(';\n',1)[0])
S=[js(f'data/{id}.js','CVS.add(') for id in []] # parsed below: the object is wrapped in CVS.add(...)
S=[json.loads((ROOT/f'data/{id}.js').read_text()[8:-3]) for id in FILES]
TQ=js('src/thai-data.js','var THAI_Q=');TC=js('src/thai-data.js','var THAI_CONCEPT=');TX=js('src/thai-explain.js','window.THAI_EXPLAIN=')
W,H=A4; LEFT=37;RIGHT=W-37;TOP=H-39;BOT=48; CW=RIGHT-LEFT
INK=HexColor('#19202e');MUTED=HexColor('#566176');ART=HexColor('#a81834');BLUE=HexColor('#234e88');RULE=HexColor('#d8dfeb');SOFT=HexColor('#eef2f8');OK=HexColor('#197653')
pdfmetrics.registerFont(TTFont('NotoThai','/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoThaiBold','/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFontFamily('DejaVu',normal='DejaVu',bold='DejaVuBold')
styles={
 'body':ParagraphStyle('body',fontName='DejaVu',fontSize=9.1,leading=14,textColor=INK,spaceAfter=0,splitLongWords=1),
 'small':ParagraphStyle('small',fontName='DejaVu',fontSize=7.6,leading=11.4,textColor=INK,splitLongWords=1),
 'thai':ParagraphStyle('thai',fontName='DejaVu',fontSize=8.2,leading=13,textColor=INK,splitLongWords=1),
 'title':ParagraphStyle('title',fontName='DejaVuBold',fontSize=16.2,leading=21,textColor=INK),
 'q':ParagraphStyle('q',fontName='DejaVuBold',fontSize=8.8,leading=13,textColor=INK,splitLongWords=1),
}
def plain(s):return html.unescape(re.sub(r'<[^>]*>',' ',s or '')).strip()
def safe(s):return html.escape(plain(s)).replace('\n','<br/>')
def para(s,w,style='body'):
 raw=safe(s) if '<' not in s else s
 raw=re.sub(r'([ก-๙]+)',r'<font name="NotoThai">\1</font>',raw)
 p=Paragraph(raw,styles[style]);_,h=p.wrap(w,10000);return p,h
# Convert {{answer}} to an empty numbered box. Answers appear only in the back matter.
BLANKS={}
def concept_text(it):
 n=0;answers=[]
 def repl(m):
  nonlocal n;n+=1;answers.append(html.unescape(m.group(1)));size=max(5,min(22,len(plain(m.group(1)))+3))
  return f'[{n} '+('_'*size)+']'
 h=re.sub(r'\{\{([\s\S]*?)\}\}',repl,it['html']);BLANKS[it['id']]=answers
 li=re.findall(r'<li[^>]*>([\s\S]*?)</li>',h)
 if li:return [plain(x) for x in li]
 rows=re.findall(r'<tr[^>]*>([\s\S]*?)</tr>',h)
 if rows:return [plain(x).replace('  ',' · ') for x in rows]
 return [plain(h.split('<figure')[0])]
def back_key_points(it):
 h=re.sub(r'\{\{([\s\S]*?)\}\}',lambda m:m.group(1),it['html'])
 lines=re.findall(r'<li[^>]*>([\s\S]*?)</li>',h)
 if not lines:
  lines=re.findall(r'<td[^>]*>([\s\S]*?)</td>',h)
 facts=[plain(line) for line in lines if plain(line)]
 if not facts:facts=[it['title']]
 return ['<b>ประเด็นหลัก</b> '+html.escape(fact) for fact in facts[:2]]
UNITS=[]
for s in S:
 u=None
 for it in s['items']:
  if it['t']=='c':u={'s':s,'c':it,'qs':[]};UNITS.append(u)
  else:u['qs'].append(it)
for u in UNITS:concept_text(u['c'])
def Pq(it):
 opts=[]
 if it['t']=='q':opts=[f'{chr(65+i)}. {plain(x)}' for i,x in enumerate(it['o'])]
 elif it['t']=='tf':opts=['T. True','F. False']
 else:opts=['Think and explain: __________________________________________']
 return plain(it['q']),opts
class Renderer:
 def __init__(self,out,refs=None):
  self.c=canvas.Canvas(str(out),pagesize=A4,pageCompression=1);self.refs=refs or {};self.map={};self.page=0;self.total=self.refs.get('total','');self.y=TOP;self.col=0;self.part=''
 def start(self):
  if self.page:self.c.showPage()
  self.page+=1;self.y=TOP;self.col=0
  self.c.setStrokeColor(RULE);self.c.line(LEFT,BOT-8,RIGHT,BOT-8)
  self.c.setFont('DejaVu',7.3);self.c.setFillColor(MUTED)
  self.c.drawString(LEFT,BOT-20,'Nervous System I · Peer tutoring · student handout')
  self.c.drawRightString(RIGHT,BOT-20,f'{self.page} / {self.total or "?"}')
 def ref(self,key):return str(self.refs.get(key,'00'))
 def p(self,s,x,y,w,style='body'):
  p,h=para(s,w,style);p.drawOn(self.c,x,y-h);return y-h
 def line(self,s,x,y,size=8,color=INK,bold=False):
  self.c.setFont('DejaVuBold' if bold else 'DejaVu',size);self.c.setFillColor(color);self.c.drawString(x,y,s)
 def cover(self):
  self.start();self.line('PEER TUTORING  ·  NERVOUS SYSTEM I',LEFT,self.y,9,BLUE,True);self.y-=42
  self.line('Anatomy & Physiology',LEFT,self.y,26,INK,True);self.y-=48
  nc=len(UNITS);nq=sum(len(u['qs']) for u in UNITS)
  self.line(str(nc),LEFT,self.y,36,ART,True);self.line('concepts',LEFT+95,self.y+6,11,MUTED)
  self.line(str(nq),LEFT+220,self.y,36,ART,True);self.line('questions',LEFT+305,self.y+6,11,MUTED);self.y-=50
  from reportlab.graphics.barcode.qr import QrCodeWidget
  from reportlab.graphics.shapes import Drawing
  from reportlab.graphics import renderPDF
  qr=QrCodeWidget('https://punnawit9285.github.io/nsi-peer-tutoring/')
  bounds=qr.getBounds();d=Drawing(bounds[2]-bounds[0],bounds[3]-bounds[1]);d.add(qr)
  renderPDF.draw(d,self.c,LEFT,self.y-95)
  self.line('Interactive deck',LEFT+115,self.y-12,10,BLUE,True)
  self.y=self.p('https://punnawit9285.github.io/nsi-peer-tutoring/',LEFT+115,self.y-20,CW-120,'small')-87
  self.line('CONTENTS',LEFT,self.y,9,MUTED,True);self.y-=18
  # Compact 23-row table; references are determined by the first pass.
  self.line('Section',LEFT,self.y,7,MUTED,True)
  self.line('Start · C/Q · Quiz · Blanks · Thai',LEFT+255,self.y,7,MUTED,True);self.y-=9
  for s in S:
   self.c.setStrokeColor(RULE);self.c.line(LEFT,self.y-8,RIGHT,self.y-8)
   name=f'{s["id"]}  {s["short"]}'
   self.line(name[:31],LEFT,self.y-2,7.4,INK,False)
   nc=sum(x['t']=='c' for x in s['items']);nq=sum(x['t']!='c' for x in s['items'])
   refs=f'{self.ref("s-"+s["id"])} · {nc}/{nq} · {self.ref("a-"+s["id"])} · {self.ref("b-"+s["id"])} · {self.ref("x-"+s["id"])}'
   self.line(refs,LEFT+255,self.y-2,7.4,INK)
   self.y-=18.3
  self.y-=13;self.line('core  ·  done in the video',LEFT,self.y,8,ART,True)
  assert self.y>BOT+10,('cover overflow',self.y)
 def concept(self,u,first):
  s,it=u['s'],u['c'];self.start();self.map['k-'+it['id']]=self.page
  if first:self.map['s-'+s['id']]=self.page
  if first:
   self.c.setFillColor(SOFT);self.c.roundRect(LEFT,self.y-35,CW,36,6,fill=1,stroke=0)
   self.line(f'SECTION {s["id"]} · {s["title"]}',LEFT+10,self.y-14,10,BLUE,True)
   self.y-=47
  self.line(it['id']+'   ·   CONCEPT',LEFT,self.y,8,ART,True);self.y-=14
  self.y=self.p(html.escape(it['title']),LEFT,self.y,CW,'title')-7
  self.y=self.p(html.escape(it.get('src','')),LEFT,self.y,CW,'small')-13
  for line in concept_text(it):
   self.c.setFillColor(ART);self.c.circle(LEFT+3,self.y-5,2,fill=1,stroke=0)
   self.y=self.p(html.escape(line),LEFT+15,self.y,CW-18,'body')-6
  m=re.search(r'<img[^>]*src="([^"]+)"',it['html'])
  if m:
   f=ROOT/m.group(1)
   if f.exists():
    with Image.open(f) as im:iw,ih=im.size
    maxh=min(260,max(105,self.y-BOT-140));sc=min(CW/iw,maxh/ih)
    self.c.drawImage(ImageReader(str(f)),LEFT,self.y-ih*sc,width=iw*sc,height=ih*sc,mask='auto')
    self.y-=ih*sc+8
    caption=re.search(r'<figcaption[^>]*>(.*?)</figcaption>',it['html'])
    if caption:self.y=self.p(html.escape(plain(caption.group(1))),LEFT,self.y,CW,'small')-6
  self.line(it['id']+' · '+str(len(BLANKS[it['id']]))+' blanks · answers p. '+self.ref('b-'+it['id'])+' · Thai p. '+self.ref('x-'+it['id']),LEFT,self.y,7.4,MUTED)
  self.y-=11
  assert self.y>=BOT+8,('concept overflow',it['id'],self.y)
 def qheight(self,it,w):
  stem,opts=Pq(it);h=13
  h+=para(html.escape(stem),w,'q')[1]+6
  for o in opts:h+=para(html.escape(o),w-8,'small')[1]+3
  if it.get('flag'):h+=15
  return h+6
 def quiz(self,u):
  if not u['qs']:return
  s,it,qs=u['s'],u['c'],u['qs'];COL=(CW-20)/2
  # Balanced two-column quiz. Start under the concept only when its entire quiz fits.
  buckets=[[],[]];heights=[0,0]
  for q in qs:
   k=0 if heights[0]<=heights[1] else 1;buckets[k].append(q);heights[k]+=self.qheight(q,COL)
  need=max(heights)+36
  if self.y-need<BOT+14:self.start()
  self.map['z-'+it['id']]=self.page
  self.c.setStrokeColor(ART);self.c.line(LEFT,self.y,RIGHT,self.y);self.y-=16
  self.line(f'QUIZ · {it["id"]} · {len(qs)} questions · answers p. {self.ref("a-"+it["id"])}',LEFT,self.y,8,ART,True);self.y-=16
  quiz_top=self.y;used=[]
  for col,items in enumerate(buckets):
   x=LEFT+col*(COL+20);y=quiz_top
   for q in items:
    h=self.qheight(q,COL)
    if y-h<BOT+12:
     self.start();x=LEFT;y=self.y;self.map['z-'+it['id']]=min(self.map['z-'+it['id']],self.page)
    self.line(q['id']+(' · core' if q.get('core') else '')+' · '+q.get('src',''),x,y,7.1,ART,True);y-=13
    stem,opts=Pq(q);y=self.p(html.escape(stem),x,y,COL,'q')-6
    for o in opts:y=self.p(html.escape(o),x+6,y,COL-8,'small')-3
    y-=7
   used.append(y)
  self.y=min(used)
  assert self.y>=BOT-2,('quiz overflow',it['id'],self.y)
 def back_begin(self,title):
  self.start();self.part=title;self.line(title.upper(),LEFT,self.y,17,INK,True);self.y-=32;self.col=0
 def nextcol(self):
  if self.col==0:self.col=1;self.y=TOP
  else:self.start();self.col=0
 def block(self,lines,style='thai',marker=None):
  width=(CW-20)/2;x=LEFT+self.col*(width+20)
  hs=[para(v,width,style)[1]+3 for v in lines];need=sum(hs)+7
  if self.y-need<BOT+10:self.nextcol();x=LEFT+self.col*(width+20)
  if marker and marker not in self.map:self.map[marker]=self.page
  for v in lines:
   self.y=self.p(v,x,self.y,width,style)-3
  self.y-=7
  assert self.y>=BOT-2,('back overflow',marker,self.y)
 def answers(self):
  self.back_begin('Quiz answer key')
  for s in S:
   self.block([f'<b>SECTION {s["id"]} · {html.escape(s["title"])}</b>'],'body','a-'+s['id'])
   for u in [u for u in UNITS if u['s'] is s and u['qs']]:
    self.block([f'<b>{u["c"]["id"]} · quiz p. {self.ref("z-"+u["c"]["id"])}</b>'],'small','a-'+u["c"]["id"])
    for q in u['qs']:
     if q['t']=='q':a=', '.join(chr(65+i)+' · '+plain(q['o'][i]) for i in ([q['a']] if isinstance(q['a'],int) else q['a']))
     elif q['t']=='tf':a='True' if q['a'] else 'False'
     else:a=plain(q['ans'])
     ls=[f'<b>{q["id"]}: {html.escape(a)}</b>']
     ls += [x for x in TQ.get(q['id'],[])[:3]]
     if q.get('flag'):ls.append('<b>Recall note:</b> '+html.escape(q['flag']))
     self.block(ls,'thai')
 def blanks(self):
  self.back_begin('Answers to numbered blanks')
  for s in S:
   self.block([f'<b>SECTION {s["id"]} · {html.escape(s["title"])}</b>'],'body','b-'+s['id'])
   for u in [u for u in UNITS if u['s'] is s]:
    it=u['c'];ls=[f'<b>{it["id"]} · concept p. {self.ref("k-"+it["id"])}</b>']
    ls += [f'{i}. {html.escape(plain(a))}' for i,a in enumerate(BLANKS[it['id']],1)]
    self.block(ls,'small','b-'+it['id'])
 def explanations(self):
  self.back_begin('Thai concept explanations')
  for s in S:
   self.block([f'<b>SECTION {s["id"]} · {html.escape(s["title"])}</b>'],'body','x-'+s['id'])
   for u in [u for u in UNITS if u['s'] is s]:
    it=u['c'];ls=[f'<b>{it["id"]} · p. {self.ref("k-"+it["id"])}</b>']
    ls += back_key_points(it)+TX.get(it['id'],[])[:7]
    self.block(ls,'thai','x-'+it['id'])
 def run(self):
  self.cover();last=None
  for u in UNITS:
   self.concept(u,last is not u['s']);self.quiz(u);last=u['s']
  self.answers();self.blanks();self.explanations();self.map['total']=self.page;self.c.save();return self.map
if __name__=='__main__':
 import tempfile
 with tempfile.TemporaryDirectory() as tmp:
  a=Renderer(Path(tmp)/'pass1.pdf').run();b=Renderer(ROOT/'student.pdf',a).run()
  if a!=b:
   bad=[(k,a[k],b.get(k)) for k in a if a[k]!=b.get(k)];raise SystemExit('cross references moved: '+str(bad[:20]))
  reader=PdfReader(str(ROOT/'student.pdf'))
  assert len(reader.pages)==a['total']
  for u in UNITS:
   cid=u['c']['id'];p=reader.pages[a['k-'+cid]-1].extract_text()
   if cid not in p:raise SystemExit(f'concept marker missing {cid} on page {a["k-"+cid]}')
  (ROOT/'dist/pages.json').write_text(json.dumps(a,indent=2))
  print('student.pdf',a['total'],'pages ·',len(UNITS),'one-page concepts ·',sum(len(u['qs']) for u in UNITS),'questions · cross-references stable')
