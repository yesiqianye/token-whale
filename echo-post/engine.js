/* Deterministic puzzle rules. No rendering, timers or browser dependencies. */
(function(root) {
  'use strict';
  const DIRECTIONS={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],W:[0,0]};
  const cache=new WeakMap();
  const same=(a,b)=>a.x===b.x&&a.y===b.y;
  const copy=value=>JSON.parse(JSON.stringify(value));
  function board(level) {
    if(cache.has(level)) return cache.get(level);
    const b={start:null,mail:null,boxes:[],docks:[],plates:[],gates:[],stamps:[]};
    level.map.forEach((row,y)=>[...row].forEach((c,x)=>{
      const p={x,y};
      if(c==='S')b.start=p;
      if(c==='M')b.mail=p;
      if(c==='$'||c==='@')b.boxes.push(p);
      if(c==='x'||c==='@')b.docks.push(p);
      if(c==='*')b.stamps.push(p);
      if('abc'.includes(c))b.plates.push({...p,id:c});
      if('ABC'.includes(c))b.gates.push({...p,id:c});
    }));
    cache.set(level,b); return b;
  }
  function start(level,plans=[]) {
    const b=board(level);
    return {p:{...b.start},boxes:copy(b.boxes),plans:copy(plans),ghosts:plans.map(()=>({...b.start,pc:0,blocked:false})),actions:[],collected:[],turn:0,won:false,events:[]};
  }
  function open(level,s,id) {
    const plates=board(level).plates.filter(p=>p.id===id.toLowerCase());
    return plates.length>0&&plates.every(p=>[s.p,...s.boxes,...s.ghosts].some(a=>same(a,p)));
  }
  function walkable(level,s,p) {
    const c=level.map[p.y]?.[p.x];
    return Boolean(c&&c!=='#'&&(!'ABC'.includes(c)||open(level,s,c)));
  }
  function move(level,s,actor,cmd,label) {
    const [dx,dy]=DIRECTIONS[cmd];
    actor.blocked=false;
    if(cmd==='W')return;
    const dest={x:actor.x+dx,y:actor.y+dy};
    if(!walkable(level,s,dest)){actor.blocked=true;return;}
    const crate=s.boxes.find(b=>same(b,dest));
    if(crate){
      const target={x:crate.x+dx,y:crate.y+dy};
      if(!walkable(level,s,target)||s.boxes.some(b=>same(b,target))||[s.p,...s.ghosts].some(other=>other!==actor&&same(other,target))){actor.blocked=true;return;}
      s.events.push({type:'push',actor:label,from:{...crate},to:target});
      crate.x=target.x;crate.y=target.y;
    }
    actor.x=dest.x;actor.y=dest.y;
  }
  function step(level,state,cmd) {
    if(state.won||!DIRECTIONS[cmd])return state;
    const s=copy(state);s.events=[];
    // Older recordings act first. This preserves the conditions of a recording
    // when it is replayed as the newest ghost after a rewind.
    s.ghosts.forEach((g,i)=>{
      if(g.pc<s.plans[i].length){move(level,s,g,s.plans[i][g.pc],i);g.pc++;}
      else g.blocked=false;
    });
    move(level,s,s.p,cmd,'player');
    s.actions.push(cmd);s.turn++;
    const b=board(level);
    b.stamps.forEach((p,i)=>{if(same(p,s.p)&&!s.collected.includes(i)){s.collected.push(i);s.events.push({type:'stamp',at:p});}});
    const delivered=b.docks.every(p=>s.boxes.some(c=>same(c,p)));
    s.won=delivered&&same(s.p,b.mail);
    if(s.won)s.events.push({type:'win'});
    return s;
  }
  function record(level,s) {
    if(!s.actions.length||s.plans.length>=level.max||s.won)return null;
    return start(level,[...s.plans,s.actions]);
  }
  function docked(level,s){return board(level).docks.filter(p=>s.boxes.some(b=>same(p,b))).length;}
  function total(s){return s.actions.length+s.plans.reduce((sum,p)=>sum+p.length,0);}
  function deadlocked(level,s){
    const b=board(level);
    if(s.boxes.length>b.docks.length)return false;
    return s.boxes.some(p=>!b.docks.some(d=>same(p,d))&&!b.plates.some(d=>same(p,d))&&
      [1,-1].some(dx=>[1,-1].some(dy=>level.map[p.y]?.[p.x+dx]==='#'&&level.map[p.y+dy]?.[p.x]==='#')));
  }
  const api={DIRECTIONS,same,copy,board,start,open,step,record,docked,total,deadlocked};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.EchoEngine=api;
})(globalThis);
