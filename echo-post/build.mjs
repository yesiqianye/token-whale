import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(path.join(root,p),'utf8');
let html=read('index.html');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${read('style.css')}</style>`);
for(const file of ['engine.js','levels.js','game.js']){
 let js=read(file);
 for(const asset of ['sprites.png','parcels.png']){
  const data=readFileSync(path.join(root,'assets',asset)).toString('base64');
  js=js.replaceAll(`'assets/${asset}'`,`'data:image/png;base64,${data}'`);
 }
 html=html.replace(`<script src="${file}"></script>`,()=>`<script>${js}</script>`);
}
writeFileSync(path.join(root,'回声邮局.html'),html);
console.log('Built self-contained offline game: 回声邮局.html');
