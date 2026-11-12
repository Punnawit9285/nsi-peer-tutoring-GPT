const fs=require('fs'),vm=require('vm');
const files=['lib','b','i','n','s','f','k','u','o','d','c','a','p','m','j','l','e','r','g','t','h','w','v','x'];
const ctx={window:{}};ctx.window=ctx;vm.createContext(ctx);
for(const f of files)vm.runInContext(fs.readFileSync('data/'+f+'.js','utf8'),ctx,{filename:f});
vm.runInContext(fs.readFileSync('src/thai-data.js','utf8'),ctx,{filename:'thai-data'});
vm.runInContext(fs.readFileSync('src/thai-explain.js','utf8'),ctx,{filename:'thai-explain'});
vm.runInContext(fs.readFileSync('src/tutor-notes.js','utf8'),ctx,{filename:'tutor-notes'});
vm.runInContext(fs.readFileSync('src/tutor-script.js','utf8'),ctx,{filename:'tutor-script'});
const S=ctx.CVS.sections,ids=new Set(),cids=new Set(),qids=new Set(),errs=[];let totals={c:0,q:0,core:0,blanks:0,figures:0};
for(const s of S){let n={c:0,q:0,core:0,blanks:0,figures:0},seen=false,ci=0,qi=0;
 for(const it of s.items){
  if(ids.has(it.id))errs.push('duplicate '+it.id);ids.add(it.id);
  if(it.t==='c'){
   seen=true;ci++;cids.add(it.id);n.c++;totals.c++;
   if(it.id!==s.id+'-C'+ci)errs.push('concept order '+it.id);
   const b=(it.html.match(/class="cz"/g)||[]).length;n.blanks+=b;totals.blanks+=b;
   if(!b)errs.push('no cloze '+it.id);
   const f=(it.html.match(/<figure/g)||[]).length;n.figures+=f;totals.figures+=f;
  }else if(['q','tf','open'].includes(it.t)){
   qi++;qids.add(it.id);n.q++;totals.q++;
   if(!seen)errs.push('question before concept '+it.id);
   if(it.id!==s.id+qi)errs.push('question order '+it.id);
   if(!it.src)errs.push('missing source '+it.id);
   if(it.core){n.core++;totals.core++}
   if(it.t==='q'){
    if(!Array.isArray(it.o)||it.o.length<2||it.o.length>6)errs.push('options '+it.id);
    for(const a of [].concat(it.a))if(!Number.isInteger(a)||a<0||a>=it.o.length)errs.push('answer index '+it.id);
   }
   if(it.t==='tf'&&typeof it.a!=='boolean')errs.push('tf answer '+it.id);
   if(it.t==='open'&&!it.ans)errs.push('model answer '+it.id);
  }else errs.push('bad type '+it.id);
 }
 if(!n.core)errs.push('no core question '+s.id);
 console.log(s.id.padEnd(2),s.short.padEnd(18),JSON.stringify(n));
}
for(const [name,keys,valid] of [['THAI_Q',ctx.THAI_Q,qids],['THAI_CONCEPT',ctx.THAI_CONCEPT,cids],['THAI_SEC',ctx.THAI_SEC,new Set(S.map(s=>s.id))],['THAI_EXPLAIN',ctx.THAI_EXPLAIN,cids],['TUTOR_NOTES',ctx.TUTOR_NOTES,cids]]){
 for(const id of Object.keys(keys))if(!valid.has(id))errs.push(name+' orphan '+id);
 for(const id of valid)if(!(id in keys))errs.push(name+' missing '+id);
}
for(const s of S){const sc=ctx.TUTOR_SCRIPT.sec[s.id];if(!sc)errs.push('script section '+s.id);else for(const it of s.items)if((it.t==='c'||it.core)&&!sc.say[it.id])errs.push('SAY missing '+it.id)}
console.log('TOTAL',JSON.stringify(totals),'errors:',errs.length?errs:'none');if(errs.length)process.exitCode=1;
