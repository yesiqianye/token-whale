const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../engine.js'),levels=require('../levels.js');
const solved=[{"plans":[],"path":"RRRRUULLDURRDDDDLLLLUURRRLUURRDDURRDR","states":3557},{"plans":["RRUULL"],"path":"DDUURRRRRRUURRDLRD","states":1827},{"plans":["RRRRR"],"path":"LUUUU","states":214},{"plans":["UURRRR"],"path":"RRRRDURRRDR","states":90},{"plans":["RRRRDRUUU"],"path":"LUUUUUUUU","states":640},{"plans":["UURR"],"path":"ULDDDLUUURRRRDRRURDLDRDR","states":3299},{"plans":[],"path":"DRRRRULLULULDDLDDURRRRDRRRU","states":104799},{"plans":["RRUULL","RRWWWRRUU"],"path":"DDUURRRRRRRRURDLDRLDDRRULRD","states":16178}];
for(let i=0;i<levels.length;i++){
 test(`level ${i+1}: a real recording sequence reaches all deliveries and the stamp`,()=>{
  const l=levels[i];let s=E.start(l);
  for(const plan of solved[i].plans){for(const cmd of plan)s=E.step(l,s,cmd);s=E.record(l,s);assert.ok(s);}
  for(const cmd of solved[i].path)s=E.step(l,s,cmd);
  assert.equal(s.won,true);assert.equal(s.collected.length,E.board(l).stamps.length);
  assert.ok(E.total(s)<=l.par,`three-star route exceeds budget: ${E.total(s)} > ${l.par}`);
 });
}
test('blocked commands become successful pushes when the player changes the gate',()=>{
 const l=levels[2];let recording=E.start(l);
 for(const cmd of 'RRRRR')recording=E.step(l,recording,cmd);
 assert.equal(recording.p.x,3);assert.equal(recording.actions.length,5);
 let s=E.record(l,recording);s=E.step(l,s,'L');for(let i=0;i<4;i++)s=E.step(l,s,'W');
 assert.equal(E.docked(l,s),1);assert.equal(s.ghosts[0].x,7);
});
test('same-letter plates require every plate, and crates count',()=>{
 const l=levels[5];let s=E.start(l);s.p={x:1,y:1};assert.equal(E.open(l,s,'A'),false);
 s.boxes[0]={x:5,y:1};assert.equal(E.open(l,s,'A'),true);
});
test('recording rewinds crates and player while preserving plans',()=>{
 const l=levels[0];let s=E.start(l);for(const cmd of 'RR')s=E.step(l,s,cmd);
 assert.notDeepEqual(s.boxes,E.board(l).boxes);const fresh=E.start(l,[s.actions]);
 assert.deepEqual(fresh.boxes,E.board(l).boxes);assert.deepEqual(fresh.p,E.board(l).start);
 assert.deepEqual(fresh.plans[0],['R','R']);
});
test('engine steps never mutate earlier snapshots (undo can restore pushes)',()=>{
 const l=levels[0],s=E.start(l);const before=JSON.stringify(s);E.step(l,s,'R');assert.equal(JSON.stringify(s),before);
});
test('empty delivery bays prevent early mailbox completion',()=>{
 const l=levels[2],s=E.start(l);s.p={...E.board(l).mail};assert.equal(E.step(l,s,'W').won,false);
});
