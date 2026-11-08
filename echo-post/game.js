'use strict';
(() => {
  const $=id=>document.getElementById(id), E=EchoEngine, LEVELS=EchoLevels;
  const arrows={U:'↑',R:'→',D:'↓',L:'←',W:'·'};
  const canvas=$('board'),ctx=canvas.getContext('2d');
  const sheet=new Image(),parcels=new Image();
  sheet.src='assets/sprites.png';parcels.src='assets/parcels.png';
  const sprites={courier:[160,100,330,450],ghost:[770,90,365,455],mailbox:[170,680,300,500],plant:[740,710,400,420]};
  const colors={a:'#df7955',b:'#86afbb',c:'#cfb96e'};
  let level=0,state,b,history=[],facing=1,hintStage=0,saved={};
  let sound=false,audio,toastTimer,winTimer,animFrom=null,animStart=0,particles=[],lastMove=0;
  try {const data=JSON.parse(localStorage.getItem('echo-post-v2')||'{}');if(data&&typeof data==='object'&&!Array.isArray(data))saved=data;}catch{}
  const l=()=>LEVELS[level];
  function tone(freq=440,duration=.08,type='sine',volume=.04){
    if(!sound)return;
    try {audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();
      const o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.value=freq;
      v.gain.setValueAtTime(volume,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    }catch{}
  }
  function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
  function remember(){history.push({state:E.copy(state),facing});if(history.length>1200)history.shift();}
  function clearAnimation(){animFrom=null;clearTimeout(winTimer);clearTimeout(toastTimer);$('toast').classList.remove('show');}
  function load(n){
    clearAnimation();level=n;b=E.board(l());state=E.start(l());history=[];facing=1;hintStage=0;particles=[];
    $('modal').close();$('hint-text').hidden=true;$('hint').textContent='展开提示 1 / 3 ↗';
    $('level-number').textContent=`CASE ${String(n+1).padStart(2,'0')} / ${String(LEVELS.length).padStart(2,'0')}`;
    $('level-name').textContent=l().name;$('story').textContent=l().story;$('mission').textContent=l().mission;
    update();
  }
  function update(){
    const shipped=E.docked(l(),state),count=b.docks.length,total=E.total(state),best=saved[level];
    $('step-count').textContent=`第 ${String(state.turn).padStart(2,'0')} 步`;
    $('stamp-count').textContent=`收货 ${shipped} / ${count}　✧ ${state.collected.length} / ${b.stamps.length}`;
    $('challenge').innerHTML=`<span>三星挑战 <b>≤ ${l().par} 步</b></span><span>本局 <b>${total}</b>${best?` · 最佳 ${best.steps}`:''}</span>`;
    $('echo').disabled=state.won||!l().max||state.plans.length>=l().max||!state.actions.length;
    $('echo').innerHTML=!l().max?'这一关，不用回声':state.plans.length>=l().max?'回声已就位':`留下回声 <kbd>Space</kbd>`;
    $('undo').disabled=!history.length;$('wait').disabled=state.won;$('retry').disabled=!state.actions.length;$('remove').disabled=!state.plans.length;
    $('echo-list').innerHTML=l().max?Array.from({length:l().max},(_,i)=>`<span class="echo-token">${state.ghosts[i]?`${state.ghosts[i].pc===state.plans[i].length?'◉':'▶'} 回声 ${i+1} · ${state.plans[i].length}步`:'○ 空录像带'}</span>`).join(''):'只能推，不能拉。走错一步，按 Z。';
    $('status').textContent=state.won?'签收完成':shipped===count?'全部就位 · 前往邮筒签收':`${l().subtitle}`;
    const begin=Math.max(0,state.turn-5),len=12;
    const rows=[...state.plans.map((plan,i)=>({label:`回声 ${i+1}`,plan,ghost:true,pc:state.ghosts[i].pc})),{label:'现在的你',plan:state.actions,ghost:false,pc:state.actions.length}];
    $('ticks').innerHTML=rows.map(row=>`<div class="tape-row ${row.ghost?'remembered':''}"><span>${row.label}</span><div>${Array.from({length:len},(_,j)=>{const t=begin+j,cmd=row.plan[t];return `<i class="${t<row.pc?'past':''} ${t===row.pc?'current':''}" title="第${t+1}步${cmd?'：'+arrows[cmd]:''}">${cmd?arrows[cmd]:t===row.pc?'•':'·'}</i>`}).join('')}</div>${row.ghost?`<em>${row.pc>=row.plan.length?'停留':arrows[row.plan[row.pc]]+' 下一步'}</em>`:'<em>录制中</em>'}</div>`).join('');
    $('levels').innerHTML=LEVELS.map((v,i)=>`<button class="${saved[i]?'done':''} ${i===level?'active':''}" data-level="${i}" aria-label="第${i+1}关 ${v.name}" title="${v.name}${saved[i]?' · '+'★'.repeat(saved[i].stars):''}">${String(i+1).padStart(2,'0')}<small>${saved[i]?'★'.repeat(saved[i].stars):'·'}</small></button>`).join('');
    $('progress').textContent=`已解决 ${Object.keys(saved).length} / ${LEVELS.length}　★ ${Object.values(saved).reduce((s,v)=>s+(v.stars||0),0)} / ${LEVELS.length*3}`;
  }
  function act(cmd){
    if(state.won||$('modal').open)return;
    if(document.activeElement instanceof HTMLButtonElement)document.activeElement.blur();
    remember();animFrom=state;animStart=performance.now();state=E.step(l(),state,cmd);
    if(cmd==='L')facing=-1;if(cmd==='R')facing=1;
    if(state.p.blocked){tone(140,.045);toast('这一步被挡住了，但指令已录下 · Z 撤销');}
    else tone(cmd==='W'?190:260+state.turn%5*25,.045,'sine',.022);
    for(const event of state.events){
      if(event.type==='push'){tone(120,.12,'triangle',.05);burst(event.to.x,event.to.y,'#c6ad7f',5);}
      if(event.type==='stamp'){burst(event.at.x,event.at.y,'#e7c577',15);tone(800,.2);toast('纪念邮票收好了 · 别忘了签收');}
    }
    if(E.deadlocked(l(),state)&&!E.deadlocked(l(),animFrom))toast('这只箱子进了死角 · 按 Z 可以救回来');
    if(E.same(state.p,b.mail)&&!state.won)toast(`还有 ${b.docks.length-E.docked(l(),state)} 处收货位未装满`);
    update();if(state.won)win();
  }
  function record(){
    if($('modal').open)return;
    const next=E.record(l(),state);
    if(!next){toast(!l().max?'这一关不需要回声':state.plans.length>=l().max?'录像带已满 · Q 删除上一段，或 Z 撤销':'先录下几个方向指令');return;}
    remember();state=next;clearAnimation();facing=1;tone(620,.25,'triangle');burst(b.start.x,b.start.y,'#b6d4ac',20);
    toast(`回声 ${state.plans.length} 已保存 · 箱子与时间一起重置`);update();
  }
  function undo(){
    if(!history.length)return;const last=history.pop();state=last.state;facing=last.facing;
    clearAnimation();$('modal').close();tone(220,.06);update();
  }
  function retry(){if(!state.actions.length)return;remember();state=E.start(l(),state.plans);clearAnimation();$('modal').close();facing=1;toast('录像保留，箱子与本轮行动已重置');update();}
  function remove(){if(!state.plans.length)return;remember();state=E.start(l(),state.plans.slice(0,-1));clearAnimation();$('modal').close();toast('删除上一段回声 · 其他录像仍保留');update();}
  function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2-1,life:1,color});}
  function win(){
    tone(523,.25);setTimeout(()=>tone(659,.25),120);setTimeout(()=>tone(784,.4),240);
    const total=E.total(state),all=state.collected.length===b.stamps.length,stars=1+Number(all)+Number(all&&total<=l().par),old=saved[level];
    saved[level]={stars:Math.max(stars,old?.stars||0),steps:Math.min(total,old?.steps??Infinity)};
    try{localStorage.setItem('echo-post-v2',JSON.stringify(saved));}catch{}
    burst(b.mail.x,b.mail.y,'#f5d18b',36);update();
    winTimer=setTimeout(()=>{
      if(!state.won)return;
      $('modal-content').innerHTML=`<span class="modal-label">CASE ${String(level+1).padStart(2,'0')} · SOLVED</span><div class="result-stars">${'★'.repeat(stars)}<span>${'☆'.repeat(3-stars)}</span></div><h2>${stars===3?'漂亮的合作。':'这道题，解开了。'}</h2><p>${stars===3?'少走一步，也许就多想了一步。':all?`邮票也收到了。试试把总操作优化到 ${l().par} 步以内？`:'还可以收集纪念邮票，寻找更精巧的路线。'}</p><div class="result-metrics"><span><b>${total}</b>总操作</span><span><b>${state.plans.length}</b>段回声</span><span><b>${state.collected.length}/${b.stamps.length}</b>邮票</span></div><button class="primary" id="next">${level===LEVELS.length-1?'打开最终回信':'挑战下一关 →'}</button><button class="secondary" id="replay">再解一次 · 三星目标 ${l().par} 步</button><button class="quiet" id="inspect">回到棋盘研究这次解法</button>`;
      $('modal').showModal();$('next').onclick=()=>level===LEVELS.length-1?ending():load(level+1);$('replay').onclick=()=>load(level);$('inspect').onclick=()=>$('modal').close();
    },400);
  }
  function ending(){
    const total=Object.values(saved).reduce((s,v)=>s+v.stars,0);
    $('modal-content').innerHTML=`<div class="ending"><span class="modal-label">THE SAME ORDERS. A DIFFERENT FUTURE.</span><div class="result-stars">✧</div><h2>昨天没有白走。</h2><p>那些撞过的门，走错的路，<br>在另一个自己手里，成了答案。</p><p>已解决 ${Object.keys(saved).length} / ${LEVELS.length} 个难题。<br>已收集 <strong>${total} / ${LEVELS.length*3}</strong> 枚星章。</p><button class="primary" id="again">回到分拣站 · 继续挑战三星</button></div>`;
    $('again').onclick=()=>load(0);
  }
  function help(){
    $('modal-content').innerHTML='<span class="modal-label">三条规则，许多种可能</span><h2>让昨天做不到的，<br>在今天发生。</h2><ol class="rules"><li><b>推箱子。</b>箱子只能推，不能拉。装满所有绿色收货位，再到邮筒签收。箱子也能压机关。</li><li><b>录操作，不录位置。</b>空格留下整段指令，箱子和角色重置。回声每回合先行动，你随后行动。撞墙也消耗一步，也会录下。</li><li><b>改变它的处境。</b>你开门、移箱或让路后，回声的同一条指令会产生不同结果。走完录像后，回声停留。</li></ol><p>相同字母的机关需要<b>全部</b>压住，门才开启。角色可以互相穿过；箱子不能推入角色或另一只箱子所在的格子。</p><p><b>Z</b> 撤销，包括留影　<b>F</b> 保留录像重试<br><b>Q</b> 删除上一段回声　<b>R</b> 全部重来<br><b>E</b> 等待　方向键 / WASD 移动</p><button class="primary" id="got-it">试着改变昨天</button>';
    $('modal').showModal();$('got-it').onclick=()=>$('modal').close();
  }
  $('echo').onclick=record;$('undo').onclick=undo;$('wait').onclick=()=>act('W');$('retry').onclick=retry;$('remove').onclick=remove;
  $('restart').onclick=()=>{load(level);toast('全部重来 · 回声也已清空');};$('help').onclick=help;
  $('hint').onclick=()=>{hintStage=Math.min(3,hintStage+1);$('hint-text').hidden=false;$('hint-text').textContent=l().hints[hintStage-1];$('hint').textContent=hintStage<3?`再给一点提示 ${hintStage+1} / 3 ↗`:'已展开最后提示 · 可自由尝试';};
  $('sound').onclick=()=>{sound=!sound;$('sound').textContent=`声音 ${sound?'开':'关'}`;$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');tone(500,.15);};
  $('close-modal').onclick=()=>$('modal').close();$('levels').onclick=e=>{const el=e.target.closest('[data-level]');if(el)load(Number(el.dataset.level));};
  const dirs={'0,-1':'U','0,1':'D','-1,0':'L','1,0':'R'};
  document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>act(dirs[el.dataset.move]));
  window.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||$('modal').open)return;
    const k=e.key.toLowerCase(),keys={arrowup:'U',w:'U',arrowdown:'D',s:'D',arrowleft:'L',a:'L',arrowright:'R',d:'R',e:'W'};
    if(!keys[k]&&![' ','r','z','f','q'].includes(k))return;
    e.preventDefault();if(e.repeat&&performance.now()-lastMove<160)return;lastMove=performance.now();
    if(keys[k])act(keys[k]);else if(k==='z')undo();else if(!e.repeat){if(k===' ')record();if(k==='r')load(level);if(k==='f')retry();if(k==='q')remove();}
  });
  let touchStart;
  canvas.addEventListener('pointerdown',e=>{touchStart=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart[0],dy=e.clientY-touchStart[1];if(Math.hypot(dx,dy)>14)act(Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy>0?'D':'U');touchStart=null;});
  canvas.addEventListener('pointercancel',()=>touchStart=null);
  function rect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function sprite(name,x,y,w,h,flip=false,alpha=1){if(!sheet.complete||!sheet.naturalWidth)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(sheet,...sprites[name],-w/2,-h,w,h);ctx.restore();}
  function parcel(type,x,y,size){if(!parcels.complete||!parcels.naturalWidth)return;const regions={box:[95,120,460,480],done:[690,120,460,480],dock:[100,720,450,440]};ctx.drawImage(parcels,...regions[type],x-size/2,y-size/2,size,size);}
  function draw(now){
    const W=canvas.width,H=canvas.height,cols=Math.max(...l().map.map(r=>r.length)),rows=l().map.length;
    const sz=Math.min((W-80)/cols,(H-70)/rows),ox=(W-cols*sz)/2,oy=(H-rows*sz)/2;
    ctx.clearRect(0,0,W,H);ctx.fillStyle='#193f3b';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#5b7c6d30';ctx.lineWidth=1;
    for(let x=0;x<=cols;x++){ctx.beginPath();ctx.moveTo(ox+x*sz,0);ctx.lineTo(ox+x*sz,H);ctx.stroke();}
    for(let y=0;y<=rows;y++){ctx.beginPath();ctx.moveTo(0,oy+y*sz);ctx.lineTo(W,oy+y*sz);ctx.stroke();}
    for(let i=0;i<12;i++){ctx.fillStyle='#c4d4a516';ctx.beginPath();ctx.arc((i*177+now*.004)%W,(i*91+Math.sin(now*.0005+i)*12+H)%H,1.5,0,Math.PI*2);ctx.fill();}
    l().map.forEach((row,y)=>[...row].forEach((c,x)=>{
      if(c==='#')return;const px=ox+x*sz,py=oy+y*sz;
      ctx.fillStyle='#9fae94';ctx.fillRect(px,py+7,sz,sz);ctx.fillStyle=(x+y)%3?'#eee9d8':'#e8e4d0';ctx.fillRect(px,py,sz,sz);
      ctx.strokeStyle='#c4cbb5';ctx.strokeRect(px+.5,py+.5,sz-1,sz-1);ctx.strokeStyle='#fff9e966';ctx.beginPath();ctx.moveTo(px+3,py+3);ctx.lineTo(px+sz-3,py+3);ctx.stroke();
      if((x*7+y*3)%17===0&&c==='.')sprite('plant',px+sz*.85,py+sz*.93,sz*.3,sz*.35,false,.35);
    }));
    // Dock markers remain visible around a delivered package.
    b.docks.forEach(p=>{const x=ox+(p.x+.5)*sz,y=oy+(p.y+.52)*sz;parcel('dock',x,y,sz*.77);});
    b.plates.forEach(p=>{
      const x=ox+(p.x+.5)*sz,y=oy+(p.y+.58)*sz,active=[state.p,...state.ghosts,...state.boxes].some(a=>E.same(p,a));
      ctx.fillStyle='#596e5c';ctx.beginPath();ctx.ellipse(x,y+5,sz*.29,sz*.16,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=active?'#f3d7ab':colors[p.id];ctx.strokeStyle='#fcf3d9';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,sz*.28,sz*.17,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=active?'#647d60':'#fff8e9';ctx.font=`bold ${sz*.2}px Georgia`;ctx.textAlign='center';ctx.fillText(p.id.toUpperCase(),x,y+sz*.07);
      if(active){ctx.strokeStyle=colors[p.id]+'88';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,sz*.37,sz*.24,0,0,Math.PI*2);ctx.stroke();}
    });
    b.gates.forEach(g=>{
      const x=ox+g.x*sz,y=oy+g.y*sz,open=E.open(l(),state,g.id),color=colors[g.id.toLowerCase()];
      ctx.save();if(open){ctx.fillStyle=color+'22';ctx.fillRect(x+4,y+12,sz-8,sz-20);ctx.strokeStyle=color;ctx.setLineDash([5,6]);ctx.strokeRect(x+8,y+12,sz-16,sz-20);}
      else{rect(x+5,y+12,sz-10,sz-18,sz*.3,'#234b43',color);for(let i=0;i<4;i++){ctx.fillStyle=color;ctx.fillRect(x+sz*(.22+i*.18),y+sz*.3,sz*.045,sz*.45);}}
      ctx.setLineDash([]);rect(x,y+20,9,sz-20,2,'#f3eeda','#82937b');rect(x+sz-9,y+20,9,sz-20,2,'#f3eeda','#82937b');
      ctx.fillStyle=open?'#567b62':color;ctx.font=`bold ${sz*.16}px Georgia`;ctx.textAlign='center';ctx.fillText(g.id+(open?' ✓':''),x+sz/2,y+9);ctx.restore();
    });
    b.stamps.forEach((s,i)=>{
      if(state.collected.includes(i))return;ctx.save();ctx.translate(ox+(s.x+.5)*sz,oy+(s.y+.5)*sz+Math.sin(now*.003)*3);ctx.rotate(.12);
      ctx.shadowColor='#f3d488';ctx.shadowBlur=12;rect(-sz*.13,-sz*.2,sz*.26,sz*.4,1,'#f7d896','#b79657');ctx.shadowBlur=0;
      ctx.fillStyle='#a78043';ctx.font=`${sz*.24}px serif`;ctx.textAlign='center';ctx.fillText('✧',0,sz*.08);ctx.restore();
    });
    const ready=E.docked(l(),state)===b.docks.length,mx=ox+(b.mail.x+.5)*sz,my=oy+(b.mail.y+.86)*sz;
    ctx.save();ctx.globalAlpha=ready?1:.65;sprite('mailbox',mx,my,sz*.56,sz*.9);ctx.restore();
    ctx.textAlign='center';ctx.font=`${sz*.13}px sans-serif`;ctx.fillStyle=ready?'#ffe4a9':'#718572';ctx.fillText(ready?'可签收':'待装箱',mx,my-sz*.98);
    const mix=Math.min(1,(now-animStart)/140),ease=1-(1-mix)**3;
    const interp=(p,prev)=>prev?{x:prev.x+(p.x-prev.x)*ease,y:prev.y+(p.y-prev.y)*ease}:p;
    state.boxes.forEach((box,i)=>{
      const p=interp(box,animFrom?.boxes[i]),x=ox+(p.x+.5)*sz,y=oy+(p.y+.45)*sz,done=b.docks.some(d=>E.same(d,box));
      ctx.fillStyle='#314d4333';ctx.beginPath();ctx.ellipse(x,y+sz*.35,sz*.36,sz*.1,0,0,Math.PI*2);ctx.fill();parcel(done?'done':'box',x,y,sz*.76);
    });
    state.ghosts.forEach((g,i)=>{
      const p=interp(g,animFrom?.ghosts[i]),x=ox+(p.x+.5)*sz,y=oy+(p.y+.86)*sz,cmd=state.plans[i][g.pc];
      if(cmd&&cmd!=='W'){
        const [dx,dy]=E.DIRECTIONS[cmd];ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#7ca68f';ctx.font=`bold ${sz*.28}px sans-serif`;ctx.textAlign='center';ctx.fillText(arrows[cmd],ox+(g.x+.5+dx*.6)*sz,oy+(g.y+.55+dy*.6)*sz);ctx.restore();
      }
      sprite('ghost',x,y,sz*.6,sz*.8,false,.76);ctx.fillStyle='#3a6853';ctx.font=`bold ${sz*.15}px monospace`;ctx.textAlign='center';ctx.fillText(`${i+1}${g.blocked?' !':''}`,x,y-sz*.85);
    });
    const p=interp(state.p,animFrom?.p),x=ox+(p.x+.5)*sz,y=oy+(p.y+.86)*sz;
    ctx.fillStyle='#38554433';ctx.beginPath();ctx.ellipse(x,y,sz*.25,sz*.07,0,0,Math.PI*2);ctx.fill();sprite('courier',x,y-Math.sin(mix*Math.PI)*4,sz*.57,sz*.8,facing<0);
    if(!state.turn){ctx.fillStyle='#4f6a56';ctx.font=`${sz*.13}px sans-serif`;ctx.textAlign='center';ctx.fillText('你',x,y-sz*.87);}
    particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=.018;p.x+=p.vx*.02;p.y+=p.vy*.02;p.vy+=.03;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(ox+p.x*sz,oy+p.y*sz,4,4);});ctx.globalAlpha=1;
    requestAnimationFrame(draw);
  }
  load(0);requestAnimationFrame(draw);
})();
