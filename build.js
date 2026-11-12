const fs=require('fs'),vm=require('vm');
const rd=f=>fs.readFileSync(f,'utf8');
const FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">';
const DATA=["lib", "b", "i", "n", "s", "f", "k", "u", "o", "d", "c", "a", "p", "m", "j", "l", "e", "r", "g", "t", "h", "w", "v", "x"].map(f=>rd('data/'+f+'.js')).join('\n');
function page(title, cssFiles, body, appFiles){
  appFiles=[].concat(appFiles);
  const js=DATA+'\n'+appFiles.map(rd).join('\n');
  new vm.Script(js,{filename:appFiles.join('+')}); // syntax check
  if(/<\/script/i.test(js)) throw new Error('script close tag inside JS');
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>'+title+'</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'+FONTS+'\n<style>\n'+cssFiles.map(rd).join('\n')+'\n</style>\n</head>\n<body>\n'+body+'\n<script>\n'+js+'\n</script>\n</body>\n</html>\n';
}
const which=process.argv[2]||'deck';
if(which==='deck'||which==='all'){
  const deckHtml=page('Nervous System I &#183; Peer tutoring deck',['src/base.css','src/deck.css'],rd('src/deck-body.html'),['src/thai-data.js','src/thai-explain.js','src/deck-app.js']);
  fs.writeFileSync('dist/deck.html',deckHtml);
  fs.writeFileSync('student.html',deckHtml);
  fs.writeFileSync('index.html',deckHtml);
  console.log('deck.html / student.html',fs.statSync('dist/deck.html').size,'bytes');
}
if((which==='notes'||which==='all')&&fs.existsSync('src/notes-app.js')){
  const notesHtml=page('Nervous System I &#183; Peer tutoring deck (Tutor)',['src/base.css','src/notes.css'],rd('src/notes-body.html'),['src/thai-data.js','src/thai-explain.js','src/tutor-notes.js','src/tutor-script.js','src/notes-app.js']);
  fs.writeFileSync('dist/notes.html',notesHtml);
  fs.writeFileSync('tutor.html',notesHtml);
  console.log('notes.html / tutor.html',fs.statSync('dist/notes.html').size,'bytes');
}

// Self-contained pages use an image folder relative to each page.
if(which==='all'||which==='deck'||which==='notes'){fs.mkdirSync('dist/img',{recursive:true});for(const f of fs.readdirSync('img'))fs.copyFileSync('img/'+f,'dist/img/'+f);}
