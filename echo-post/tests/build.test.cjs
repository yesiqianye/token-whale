const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
test('offline build embeds three syntactically valid scripts and both sprite sheets',()=>{
 const root=path.join(__dirname,'..');
 execFileSync(process.execPath,[path.join(root,'build.mjs')]);
 const html=fs.readFileSync(path.join(root,'回声邮局.html'),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,3);
 scripts.forEach((s,i)=>assert.doesNotThrow(()=>new vm.Script(s,{filename:`embedded-${i}.js`})));
 assert.equal((html.match(/data:image\/png;base64,/g)||[]).length,2);
 assert.ok(!/<script\s+src=/.test(html));assert.ok(!/<link[^>]+stylesheet/.test(html));
});
