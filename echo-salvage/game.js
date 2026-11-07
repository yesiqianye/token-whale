'use strict';
(() => {
const $=id=>document.getElementById(id),canvas=$('sea'),ctx=canvas.getContext('2d');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const storage={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const bg=new Image(),atlas=new Image();bg.src='assets/seabed.webp';atlas.src='assets/sprites.webp';
let W=0,H=0,DPR=1,clock=0,last=0,state='intro',muted=storage.get('echo-muted',false),audio;
let player,items=[],enemies=[],rings=[],particles=[],lures=[],camera={x:1200,y:900},keys={},stick={x:0,y:0},toastTime=0;
let level=1,bank=0,up={oxygen:0,speed:0,sonar:0},run,shake=0,sonarCD=0,boostCD=0,dock=0;
const WORLD={w:2600,h:2000},HOME={x:1300,y:1000};
const names=['潮汐记忆','沉没的日轮','海神的耳语','失落星图','鲸骨怀表','无声之环'];
const sectors=['静默海沟','沉钟遗址','无光之庭','鲸落深渊','永夜回廊'];
const best=()=>storage.get('echo-best',0);
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
function show(id,on=true){$(id).classList.toggle('hidden',!on)}
function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');toastTime=4}
function initAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)()}catch{}}if(audio?.state==='suspended')audio.resume()}
function tone(freq,duration=.2,type='sine',volume=.09,end){if(muted||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(end,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}
function updateSound(){ $('muted').style.display=muted?'block':'none';$('sound').setAttribute('aria-label',muted?'开启声音':'关闭声音') }
updateSound();$('sound').onclick=()=>{initAudio();muted=!muted;storage.set('echo-muted',muted);updateSound();tone(440)};
function resetExpedition(){level=1;bank=0;up={oxygen:0,speed:0,sonar:0};startDive()}
function startDive(){
initAudio();state='playing';player={...HOME,x:HOME.x+35,y:HOME.y,hp:3,oxy:100,maxOxy:100+up.oxygen*22,angle:0,inv:0,boost:0};player.oxy=player.maxOxy;
run={cargo:0,finds:[],time:0,away:false,quota:450+(level-1)*250,warned:false,sonars:0};
items=[];enemies=[];rings=[];particles=[];lures=[];sonarCD=0;boostCD=0;dock=0;camera={...HOME};keys={};stick={x:0,y:0};
// Guarantee an approachable first route; outer rings carry the valuable artifacts.
for(let i=0;i<27;i++){const a=i*2.39996+Math.random()*.28,r=210+(i/26)*900;const type=i%6===4?'oxygen':'relic';const tier=r>800?2:r>480?1:0;items.push({x:clamp(HOME.x+Math.cos(a)*r,100,WORLD.w-100),y:clamp(HOME.y+Math.sin(a)*r*.78,100,WORLD.h-100),type,tier,value:[100,180,300][tier],name:names[i%names.length],reveal:0,seen:false,phase:Math.random()*TAU})}
items.push({x:2250,y:1000,type:'relic',tier:3,value:900,name:'潮汐之心',heart:true,reveal:0,seen:false,phase:0});
for(let i=0;i<5+Math.min(level,7);i++){const a=i*TAU/(5+Math.min(level,7))+.5,r=650+Math.random()*330;enemies.push({x:HOME.x+Math.cos(a)*r,y:HOME.y+Math.sin(a)*r*.85,anchorX:HOME.x+Math.cos(a)*r,anchorY:HOME.y+Math.sin(a)*r*.85,angle:a,phase:Math.random()*TAU,target:null,alert:0,reveal:0})}
for(const id of ['intro','result','pausePanel'])show(id,false);for(const id of ['gameControls','mission','touchControls'])show(id);
$('sector').textContent=String(level).padStart(2,'0')+' / '+sectors[Math.min(level-1,4)];$('objective').textContent='打捞 '+run.quota+' · 返回母港';
toast(level===1?'按空格释放声呐，寻找附近的金色遗物':'进入更深海域 · 改装已安装，诱饵已补满');syncHUD();
}
function pulse(){if(state!=='playing'||sonarCD>0)return;sonarCD=Math.max(1.7,3.8-up.sonar*.45);run.sonars++;const reach=680+up.sonar*100;rings.push({x:player.x,y:player.y,r:0,max:reach,color:'#5ce5e0',life:2});
for(const it of items)if(dist(player,it)<reach){it.reveal=8+up.sonar;it.seen=true}
for(const en of enemies)if(dist(player,en)<reach+180){en.target={x:player.x,y:player.y};en.alert=7;en.reveal=8}
tone(620,1.1,'sine',.13,95);if(run.sonars===1)toast('回声已标记遗物。猎手正游向你刚才的位置，继续移动！');}
function decoy(){if(state!=='playing')return;if(run.lures===undefined)run.lures=3;if(run.lures<=0){toast('诱饵已用尽 · 回港后补充');return}run.lures--;lures.push({x:player.x,y:player.y,time:8,pulse:0});for(const e of enemies)if(dist(player,e)<1100){e.target={x:player.x,y:player.y};e.alert=8;e.reveal=8}tone(220,.5,'triangle',.1,440);toast('诱饵部署 · 趁现在离开，猎手会被它吸引');syncHUD()}
function boost(){if(state!=='playing'||boostCD>0||player.oxy<12)return;player.oxy-=8;player.boost=.65;boostCD=3;tone(80,.35,'sawtooth',.025,170)}
function pause(){if(state==='playing'){state='paused';keys={};stick={x:0,y:0};show('pausePanel')}else if(state==='paused'){state='playing';show('pausePanel',false)}}
$('start').onclick=resetExpedition;$('pause').onclick=pause;$('resume').onclick=pause;$('abandon').onclick=()=>{if(state==='paused')finish(false,'远征提前结束。')};$('sonar').onclick=pulse;$('lure').onclick=decoy;$('boostTouch').onclick=boost;$('retry').onclick=startDive;$('restart').onclick=resetExpedition;
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;keys[e.code]=true;if(e.code==='Space')pulse();if(e.code==='KeyE')decoy();if(e.code==='ShiftLeft'||e.code==='ShiftRight')boost();if(e.code==='KeyP'||e.code==='Escape')pause()});
addEventListener('keyup',e=>{keys[e.code]=false});addEventListener('blur',()=>{keys={};stick={x:0,y:0};if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
let joyId=null;const joy=$('joystick');function joyMove(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,n=Math.max(40,Math.hypot(dx,dy));stick={x:dx/n,y:dy/n};joy.firstElementChild.style.transform=`translate(${stick.x*32}px,${stick.y*32}px)`}
joy.onpointerdown=e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);joyMove(e)};joy.onpointermove=e=>{if(e.pointerId===joyId)joyMove(e)};function joyEnd(){joyId=null;stick={x:0,y:0};joy.firstElementChild.style.transform=''}joy.onpointerup=joyEnd;joy.onpointercancel=joyEnd;
function burst(x,y,color,n=15){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=20+Math.random()*80;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.7+Math.random()*.5,color})}}
function finish(safe,reason){
if(state!=='playing'&&state!=='paused')return;state='result';show('pausePanel',false);show('touchControls',false);show('context',false);show('result');
const earned=safe?run.cargo:Math.floor(run.cargo*.2),complete=safe&&run.cargo>=run.quota;bank+=earned;storage.set('echo-best',Math.max(best(),bank));
const victory=complete&&level===5;
$('resultLabel').textContent=safe?'SALVAGE SECURED':'SIGNAL LOST';$('resultTitle').textContent=victory?'深海，终于回应了你。':safe?(complete?'满载星光，归来。':'平安，比宝藏珍贵。'):'深海收回了秘密。';
$('resultCopy').textContent=victory?'五片海域已全部探索。你带回的不止是遗物，还有一整个被遗忘的世界。继续改装，挑战更深的无尽海域。':safe?(complete?'本区目标达成。新的海域已经开放，选择改装后继续远征。':'已安全回收全部战利品。目标尚未达成，改装后可再次挑战本海域。'):reason+' 应急浮标保住了 20% 回收值；已获得的改装保留。';
$('earned').textContent=earned;$('total').textContent=bank;$('duration').textContent=Math.floor(run.time/60)+':'+String(Math.floor(run.time%60)).padStart(2,'0');
$('finds').textContent=run.finds.length?'打捞日志：'+[...new Set(run.finds)].join(' / '):'海底的秘密，还在等待下一位来客。';
$('upgrades').replaceChildren();show('upgradeTitle',safe);show('retry',!safe);
if(safe){const choices=[['oxygen','加压氧舱','氧气容量 +22'],['speed','涡轮推进','航速 +12%'],['sonar','长波阵列','探测 +100 / 冷却缩短']];for(const [key,title,desc]of choices){const b=document.createElement('button');const s=document.createElement('strong');s.textContent=title;const p=document.createElement('span');p.textContent=desc+' · 已装 '+up[key];b.append(s,p);b.onclick=()=>{up[key]++;if(complete)level++;startDive()};$('upgrades').append(b)}}
tone(safe?520:160,.8,'sine',.12,safe?780:45);
}
function syncHUD(){if(!player||!run)return;const pct=Math.max(0,Math.ceil(player.oxy/player.maxOxy*100));$('oxygenText').textContent=pct+'%';$('oxygenBar').style.width=pct+'%';$('oxygenBar').style.background=pct<25?'#ef796c':'#53d9da';$('hull').textContent='◆ '.repeat(Math.max(0,player.hp))+'◇ '.repeat(3-Math.max(0,player.hp));$('cargo').textContent=String(run.cargo).padStart(4,'0');$('progress').style.width=Math.min(100,run.cargo/run.quota*100)+'%';$('lureCount').textContent=run.lures??3;$('sonar').classList.toggle('cooling',sonarCD>0);$('sonarStatus').textContent=sonarCD>0?'充能 '+sonarCD.toFixed(1)+' s':'照亮深海，也暴露自己';const d=dist(player,HOME);$('homeDistance').textContent=Math.round(d)+' m';$('needle').style.transform=`rotate(${Math.atan2(HOME.y-player.y,HOME.x-player.x)+Math.PI/2}rad)`}
function update(dt){
if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('visible')}
if(state!=='playing')return;run.time+=dt;sonarCD=Math.max(0,sonarCD-dt);boostCD=Math.max(0,boostCD-dt);player.inv=Math.max(0,player.inv-dt);player.boost=Math.max(0,player.boost-dt);shake=Math.max(0,shake-dt*16);
let mx=Number(keys.KeyD||keys.ArrowRight||false)-Number(keys.KeyA||keys.ArrowLeft||false)+stick.x,my=Number(keys.KeyS||keys.ArrowDown||false)-Number(keys.KeyW||keys.ArrowUp||false)+stick.y;const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag}
const speed=185*(1+up.speed*.12)*(player.boost>0?2.6:1);player.x=clamp(player.x+mx*speed*dt,70,WORLD.w-70);player.y=clamp(player.y+my*speed*dt,70,WORLD.h-70);if(mag>.1){const a=Math.atan2(my,mx),delta=Math.atan2(Math.sin(a-player.angle),Math.cos(a-player.angle));player.angle+=delta*Math.min(1,dt*10);if(Math.random()<.4)particles.push({x:player.x-Math.cos(player.angle)*30,y:player.y-Math.sin(player.angle)*30,vx:-mx*25,vy:-my*25-10,life:.8,color:'#73c9cf'})}
player.oxy-=dt*(.72+Math.min(level-1,6)*.025);if(player.oxy<=0){finish(false,'氧气耗尽，救援信号已发出。');return}if(player.oxy<player.maxOxy*.25&&!run.warned){run.warned=true;toast('氧气不足 25%！跟随右下方指针返回母港');tone(200,.5,'sine',.12)}
for(let i=items.length-1;i>=0;i--){const it=items[i];it.reveal=Math.max(0,it.reveal-dt);if(dist(player,it)<46){if(it.type==='oxygen'){player.oxy=Math.min(player.maxOxy,player.oxy+25);burst(it.x,it.y,'#5ee9e5');toast('找到应急氧气 · +25');tone(660,.3,'sine',.07,1000)}else{run.cargo+=it.value;run.finds.push(it.name);if(it.heart){run.heart=true;run.heartPulse=3}burst(it.x,it.y,'#edc76b');toast(it.heart?'潮汐之心 +900 · 它正在呼唤猎手。立刻回港！':it.name+' +'+it.value+(run.cargo>=run.quota?' · 目标达成，随时可以回港':' · 继续探索或安全回港'));tone(440+it.tier*160,.4,'triangle',.08,880)}items.splice(i,1)}}
if(run.heart){run.heartPulse-=dt;if(run.heartPulse<=0){run.heartPulse=8;rings.push({x:player.x,y:player.y,r:0,max:800,color:'#ed8989',life:2});for(const e of enemies)if(dist(e,player)<1000){e.target={x:player.x,y:player.y};e.alert=8;e.reveal=8}tone(130,.8,'sine',.1,65);toast('潮汐之心正在共鸣 · 猎手听见了你')}}
for(const e of enemies){e.reveal=Math.max(0,e.reveal-dt);e.alert=Math.max(0,e.alert-dt);const lure=lures.find(l=>dist(l,e)<750);if(lure){e.target=lure;e.alert=2}if(!lure&&dist(player,e)<175&&dist(player,HOME)>155){e.target={x:player.x,y:player.y};e.alert=2.5}
let tx,ty;if(e.alert>0&&e.target){tx=e.target.x;ty=e.target.y}else{tx=e.anchorX+Math.cos(clock*.23+e.phase)*160;ty=e.anchorY+Math.sin(clock*.19+e.phase)*140}const d=Math.hypot(tx-e.x,ty-e.y),s=(e.alert>0?123:42)+Math.min(level,8)*5;if(d>14){e.x+=(tx-e.x)/d*s*dt;e.y+=(ty-e.y)/d*s*dt;e.angle=Math.atan2(ty-e.y,tx-e.x)}
if(dist(e,HOME)<135){e.x+=(e.x-HOME.x)*dt;e.y+=(e.y-HOME.y)*dt}if(dist(player,e)<42&&player.inv<=0&&dist(player,HOME)>130){player.hp--;player.inv=2.5;shake=reducedMotion?0:9;player.oxy=Math.max(1,player.oxy-7);burst(player.x,player.y,'#f57c73',25);tone(90,.35,'sawtooth',.08,35);toast('船体受损！用 E 部署诱饵，SHIFT 冲刺脱离');if(player.hp<=0){finish(false,'船体失去动力，已启动紧急上浮。');return}}}
for(const l of lures){l.time-=dt;l.pulse-=dt;if(l.pulse<=0){rings.push({x:l.x,y:l.y,r:0,max:220,color:'#c594ff',life:1});l.pulse=1.2}}lures=lures.filter(l=>l.time>0);
for(const r of rings){r.r+=dt*r.max*.65;r.life-=dt}rings=rings.filter(r=>r.r<r.max&&r.life>0);
for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
const homeDist=dist(player,HOME);if(homeDist>170)run.away=true;show('context',homeDist<125);if(homeDist<110&&run.away&&run.cargo>0){dock+=dt;$('context').textContent='正在回收战利品… '+Math.round(Math.min(1,dock/1.5)*100)+'%';if(dock>=1.5){finish(true);return}}else{dock=0;$('context').textContent=run.cargo?'母港安全区 · 靠近中心撤离':'母港安全区 · 释放声呐，出发寻找遗物'}
camera.x+=(player.x-camera.x)*Math.min(1,dt*5);camera.y+=(player.y-camera.y)*Math.min(1,dt*5);syncHUD();
}
function sprite(index,x,y,size,angle=0,alpha=1){if(!atlas.complete||!atlas.naturalWidth)return;const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.drawImage(atlas,(index%3)*sw,Math.floor(index/3)*sh,sw,sh,-size/2,-size/2,size,size);ctx.restore()}
function circle(x,y,r,color,width=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function drawIntro(){const cx=W*.54,cy=H*.49;for(let i=1;i<=4;i++)circle(cx,cy,Math.min(W,H)*(.12+i*.09),'#35a6b638');const radius=((clock*.1)%1)*Math.min(W,H)*.58;circle(cx,cy,radius,'#5be6e044');sprite(0,cx,cy,Math.min(125,W*.13),Math.sin(clock*.3)*.05);sprite(1,W*.8,H*.35,130,.5,.65);sprite(1,W*.43,H*.78,95,-.7,.38);sprite(2,W*.83,H*.62,69,clock*.05,.85);sprite(2,W*.67,H*.78,47,-.4,.7);const beam=ctx.createRadialGradient(cx+20,cy,2,cx+60,cy,140);beam.addColorStop(0,'#b8efc71c');beam.addColorStop(1,'#b8efc700');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,180,-.28,.28);ctx.fill()}
function draw(){ctx.clearRect(0,0,W,H);if(bg.complete&&bg.naturalWidth){const scale=Math.max(W/bg.width,H/bg.height),bw=bg.width*scale,bh=bg.height*scale;const px=state==='intro'?0:(camera.x-HOME.x)*.035,py=state==='intro'?0:(camera.y-HOME.y)*.035;ctx.drawImage(bg,(W-bw)/2-px,(H-bh)/2-py,bw,bh)}else{ctx.fillStyle='#02131e';ctx.fillRect(0,0,W,H)}
// Ambient suspended plankton, intentionally code-native particle effects.
for(let i=0;i<65;i++){const x=(i*173.47+Math.sin(clock*.1+i)*18)%W,y=(i*97.8-clock*(2+i%3)+H*10)%H;ctx.fillStyle=`rgba(98,207,210,${.07+(i%4)*.035})`;ctx.fillRect(x,y,i%3===0?2:1,1)}
if(state==='intro'){drawIntro();return}if(!player)return;
const zoom=Math.min(1.05,Math.max(.65,W/1250));ctx.save();ctx.translate(W/2+(Math.random()-.5)*shake,H/2+(Math.random()-.5)*shake);ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);
// Range marks and chart boundary are navigation instruments, not terrain.
ctx.strokeStyle='#4d9caa10';ctx.lineWidth=1;for(let x=0;x<=WORLD.w;x+=200){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.h);ctx.stroke()}for(let y=0;y<=WORLD.h;y+=200){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.w,y);ctx.stroke()}ctx.strokeStyle='#62c7d366';ctx.setLineDash([7,12]);ctx.strokeRect(60,60,WORLD.w-120,WORLD.h-120);ctx.setLineDash([]);
circle(HOME.x,HOME.y,130,'#62dcc62a');sprite(4,HOME.x,HOME.y,185,0,.8);ctx.fillStyle='#9dcfc9';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.fillText('母 港 / SAFE ZONE',HOME.x,HOME.y+113);
for(const it of items){const d=dist(player,it),visible=it.reveal>0||d<170;const alpha=visible?Math.min(1,.65+it.reveal*.1):it.seen?.15:.035;if(alpha>.04){const size=it.type==='oxygen'?51:it.heart?95:42+it.tier*12;sprite(it.type==='oxygen'?3:2,it.x,it.y+Math.sin(clock*1.6+it.phase)*4,size,it.type==='relic'?Math.sin(clock*.3+it.phase)*.1:0,alpha);if(visible){circle(it.x,it.y,33+it.tier*5,it.type==='oxygen'?'#6edee149':'#e1bb6549');ctx.fillStyle=it.type==='oxygen'?'#8fe6df':'#efcf86';ctx.font='10px monospace';ctx.fillText(it.type==='oxygen'?'+ O₂':it.heart?'潮汐之心 · 900':'+'+it.value,it.x,it.y+44)}}}
for(const r of rings){ctx.globalAlpha=Math.max(0,1-r.r/r.max);circle(r.x,r.y,r.r,r.color,1.6);ctx.globalAlpha=1}
for(const l of lures)sprite(5,l.x,l.y,58,0,Math.min(1,l.time));
for(const e of enemies){const d=dist(player,e),alpha=d<330||e.reveal>0?.8:.12;sprite(1,e.x,e.y,110+Math.sin(clock*3+e.phase)*6,e.angle,alpha);if(e.alert>0&&alpha>.5){ctx.fillStyle='#ed8585';ctx.font='15px monospace';ctx.fillText('!',e.x,e.y-48)}}
ctx.fillStyle='#9bddc00b';ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.arc(player.x,player.y,190,player.angle-.35,player.angle+.35);ctx.fill();
sprite(0,player.x,player.y,94,player.angle,player.inv>0&&Math.floor(clock*12)%2?.35:1);
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,TAU);ctx.fill()}ctx.globalAlpha=1;ctx.restore();
if(player.oxy<player.maxOxy*.25){const v=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.8);v.addColorStop(0,'#b8383000');v.addColorStop(1,'#b8383044');ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}
}
function frame(t){const dt=Math.min((t-last)/1000||.016,.04);last=t;if(state!=='paused'&&state!=='result')clock+=dt;update(dt);draw();requestAnimationFrame(frame)}
Promise.all([bg.decode(),atlas.decode()]).then(()=>{$('start').disabled=false;$('start').textContent='开始下潜　›';if(best())$('record').textContent='最高远征回收值 '+best()+' · 再去深处看看。'}).catch(()=>{$('start').textContent='图片加载失败 · 刷新重试'});
requestAnimationFrame(frame);
})();
