(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=960,H=600,cx=480,cy=300,rx=330,ry=205,road=112,keys={};
let running=false,finished=false,last=0,lap=1,lastProgress=0,position=4;
const player={x:cx,y:cy-ry+road*.12,angle:0,speed:0,vx:0,vy:0,color:'#f3b72f'};
const bots=[{phase:-Math.PI/2+.10,lane:-16,preferredLane:-16,targetLane:-16,speed:1.52,color:'#e84d4d'},{phase:-Math.PI/2+.25,lane:14,preferredLane:14,targetLane:14,speed:1.46,color:'#47a5ed'},{phase:-Math.PI/2+.40,lane:0,preferredLane:0,targetLane:0,speed:1.40,color:'#b78be8'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Pista tipo autódromo: duas retas longas e curvas largas.
const trackPoint=(a,l=0)=>({
 x:cx+(rx+l)*Math.sign(Math.cos(a))*Math.sqrt(Math.abs(Math.cos(a))),
 y:cy+(ry+l*.62)*Math.sign(Math.sin(a))*Math.sqrt(Math.abs(Math.sin(a)))
});
function traceTrack(aRadius,bRadius){
 ctx.beginPath();
 for(let i=0;i<=240;i++){
  const a=-Math.PI/2+i/240*Math.PI*2;
  const x=cx+aRadius*Math.sign(Math.cos(a))*Math.sqrt(Math.abs(Math.cos(a)));
  const y=cy+bRadius*Math.sign(Math.sin(a))*Math.sqrt(Math.abs(Math.sin(a)));
  if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)
 }
 ctx.closePath()
}
function trackRadius(x,y){
 return Math.pow(Math.pow(Math.abs((x-cx)/rx),4)+Math.pow(Math.abs((y-cy)/ry),4),.25)
}
function progressAt(x,y){const a=Math.atan2((y-cy)/ry,(x-cx)/rx);return(a+Math.PI/2+Math.PI*2)%(Math.PI*2)}
function drawTrack(){
 ctx.fillStyle='#286044';ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.12;ctx.strokeStyle='#9ac49b';ctx.lineWidth=2;
 for(let x=-80;x<W+100;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+130,H);ctx.stroke()}
 ctx.globalAlpha=1;
 traceTrack(rx+road/2,ry+road*.31);ctx.fillStyle='#555b5d';ctx.fill();
 traceTrack(rx-road/2,ry-road*.31);ctx.fillStyle='#286044';ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle='#e6e7df';
 traceTrack(rx+road/2,ry+road*.31);ctx.stroke();
 traceTrack(rx-road/2,ry-road*.31);ctx.stroke();
 for(let a=0;a<Math.PI*2;a+=.045){
  const p=trackPoint(a,road/2-2),q=trackPoint(a+.025,road/2-2);
  ctx.strokeStyle=(Math.floor(a/.045)%2)?'#f4f4ee':'#e74c3c';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
  const p2=trackPoint(a,-road/2+2),q2=trackPoint(a+.025,-road/2+2);
  ctx.beginPath();ctx.moveTo(p2.x,p2.y);ctx.lineTo(q2.x,q2.y);ctx.stroke()
 }
 ctx.setLineDash([15,17]);ctx.strokeStyle='#d7d9d1';ctx.lineWidth=2;
 traceTrack(rx,ry);ctx.stroke();ctx.setLineDash([]);
 const sx=cx,sy=cy-ry-road*.31;
 for(let i=0;i<8;i++)for(let j=0;j<2;j++){
  ctx.fillStyle=(i+j)%2?'#111':'#fff';ctx.fillRect(sx-9+j*9,sy+i*5,9,5)
 }
 ctx.fillStyle='#ffffffa8';ctx.font='bold 13px system-ui';
 ctx.fillText('SENTIDO DA CORRIDA',cx+125,cy-ry-5)
}
function drawCar(x,y,a,color,isPlayer=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.scale(.72,.72);ctx.fillStyle='#0006';ctx.beginPath();ctx.roundRect(-13,-19,29,44,7);ctx.fill();
 ctx.fillStyle='#101316';for(const yy of[-13,10])for(const xx of[-13,10])ctx.fillRect(xx,yy,5,10);
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-9,-20,18,40,6);ctx.fill();ctx.fillStyle=isPlayer?'#fff1b5':'#e9edf0';ctx.beginPath();ctx.moveTo(-5,-15);ctx.lineTo(0,-25);ctx.lineTo(5,-15);ctx.fill();
 ctx.fillStyle='#20282e';ctx.fillRect(-13,-15,26,4);ctx.fillRect(-14,15,28,4);ctx.fillStyle='#15232b';ctx.beginPath();ctx.ellipse(0,-2,5,8,0,0,Math.PI*2);ctx.fill();ctx.restore()
}
function draw(){drawTrack();bots.forEach(b=>{const p=trackPoint(b.phase,b.lane);drawCar(p.x,p.y,b.phase,b.color)});drawCar(player.x,player.y,player.angle,player.color,true)}
function update(dt){
 const t=Math.min(dt/16.67,2.2);
 const throttle=keys.ArrowUp||keys.w||keys.W;
 const brake=keys.ArrowDown||keys.s||keys.S;
 const steer=(keys.ArrowLeft||keys.a||keys.A?-1:0)+(keys.ArrowRight||keys.d||keys.D?1:0);
 let speed=Math.hypot(player.vx,player.vy)/2;
 // Direção mais arcade: resposta rápida e previsível, inclusive em curvas fechadas.
 player.angle+=steer*(.022+speed*.006)*clamp(speed/0.8,0,1)*t;
 // Aderência elevada reduz a sensação de o carro escapar ao virar.
 let forward=player.vx*Math.cos(player.angle)+player.vy*Math.sin(player.angle);
 let lateral=-player.vx*Math.sin(player.angle)+player.vy*Math.cos(player.angle);
 if(throttle)forward+=.075*t;
 if(brake)forward=Math.max(0,forward-.16*t);
 const radial=trackRadius(player.x,player.y);
 const onTrack=radial>=.82&&radial<=1.18;
 lateral*=Math.pow(onTrack?.28:.55,t);
 forward*=Math.pow(onTrack?.999:.97,t);
 forward=Math.max(0,forward);
 const maxSpeed=10;
 let vx=Math.cos(player.angle)*forward-Math.sin(player.angle)*lateral;
 let vy=Math.sin(player.angle)*forward+Math.cos(player.angle)*lateral;
 const magnitude=Math.hypot(vx,vy);
 if(magnitude>maxSpeed){vx*=maxSpeed/magnitude;vy*=maxSpeed/magnitude}
 player.vx=vx;player.vy=vy;player.speed=Math.hypot(vx,vy)/2;
 player.x+=player.vx*t;player.y+=player.vy*t;
 const newRadial=trackRadius(player.x,player.y);
 if(newRadial>1.22||newRadial<.78){player.vx*=Math.pow(.94,t);player.vy*=Math.pow(.94,t);player.speed=Math.hypot(player.vx,player.vy)/2}
 player.x=clamp(player.x,-20,W+20);player.y=clamp(player.y,-20,H+20);
 // IA: os adversários escolhem trajetórias para evitar o jogador e disputam espaço.
 bots.forEach((b,index)=>{
  const current=trackPoint(b.phase,b.lane);
  const distanceToPlayer=Math.hypot(current.x-player.x,current.y-player.y);
  let chosenLane=b.preferredLane;
  if(distanceToPlayer<115){
   const lanes=[-30,0,30];
   let bestScore=-Infinity;
   lanes.forEach(candidate=>{
    const point=trackPoint(b.phase,candidate);
    const playerDistance=Math.hypot(point.x-player.x,point.y-player.y);
    let trafficDistance=150;
    bots.forEach((other,j)=>{
     if(j===index)return;
     const op=trackPoint(other.phase,other.lane);
     trafficDistance=Math.min(trafficDistance,Math.hypot(point.x-op.x,point.y-op.y));
    });
    const laneChangeCost=Math.abs(candidate-b.lane)*.35;
    const score=Math.min(playerDistance,150)*1.2+Math.min(trafficDistance,100)*.45-laneChangeCost;
    if(score>bestScore){bestScore=score;chosenLane=candidate}
   });
  }
  b.targetLane=chosenLane;
  b.lane+=(b.targetLane-b.lane)*Math.min(.10*t,1);
  // Pequenas variações de ritmo tornam cada adversário menos previsível.
  const pace=1+Math.sin(b.phase*2+index)*.035;
  b.phase+=b.speed*pace*.0019*dt;
 });
 // Colisão simples: o carro do jogador não atravessa os adversários.
 bots.forEach(b=>{
  const opponent=trackPoint(b.phase,b.lane);
  let dx=player.x-opponent.x,dy=player.y-opponent.y;
  let distance=Math.hypot(dx,dy);
  const contactDistance=25;
  if(distance<contactDistance){
   if(distance<.01){dx=1;dy=0;distance=1}
   const nx=dx/distance,ny=dy/distance;
   const overlap=contactDistance-distance;
   player.x+=nx*(overlap+1);
   player.y+=ny*(overlap+1);
   player.vx=player.vx*.78+nx*.55;
   player.vy=player.vy*.78+ny*.55;
   player.speed=Math.hypot(player.vx,player.vy)/2;
  }
 });
 const p=progressAt(player.x,player.y);
 if(lastProgress>6.05&&p<.22&&newRadial>.82&&newRadial<1.18&&player.speed>1.1){
  lap++;
  if(lap>3){lap=3;finished=true;running=false;showOverlay('Bandeirada!','Você completou a corrida. Posição final: '+position+'º lugar.')}
  document.getElementById('lap').textContent=lap
 }
 lastProgress=p;
 const bp=bots.map(b=>(b.phase+Math.PI/2+Math.PI*2)%(Math.PI*2));
 position=1+bp.filter(v=>v>p).length;
 document.getElementById('position').textContent=clamp(position,1,4);
 document.getElementById('speed').textContent=Math.round(player.speed*48)
}
function frame(ts){if(!running)return;if(!last)last=ts;const dt=ts-last;last=ts;update(dt);draw();if(running)requestAnimationFrame(frame)}
function showOverlay(title,msg){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=msg;document.getElementById('start').textContent=finished?'CORRER NOVAMENTE':title==='Corrida pausada'?'CONTINUAR':'INICIAR CORRIDA';document.getElementById('overlay').style.display='flex'}
function reset(){player.x=cx;player.y=cy-ry+road*.12;player.angle=0;player.speed=0;player.vx=0;player.vy=0;bots[0].phase=-Math.PI/2+.10;bots[1].phase=-Math.PI/2+.25;bots[2].phase=-Math.PI/2+.40;lap=1;lastProgress=0;position=4;finished=false;document.getElementById('lap').textContent='1';document.getElementById('position').textContent='4';document.getElementById('speed').textContent='0'}
document.getElementById('start').addEventListener('click',()=>{if(finished)reset();running=true;last=0;document.getElementById('overlay').style.display='none';requestAnimationFrame(frame)});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key==='Escape'&&running){running=false;showOverlay('Corrida pausada','Quando estiver pronto, retome a corrida.')}});
window.addEventListener('keyup',e=>keys[e.key]=false);draw()
})();