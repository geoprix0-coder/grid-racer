(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=960,H=600,cx=480,cy=300,rx=330,ry=205,road=112,keys={};
let running=false,finished=false,last=0,lap=1,lastProgress=0,position=4;
const player={x:0,y:0,angle:0,speed:0,vx:0,vy:0,color:'#f3b72f'};
const bots=[{phase:-Math.PI/2+.10,lane:-24,preferredLane:-24,targetLane:-24,speed:5.8,angle:0,x:0,y:0,color:'#e84d4d'},{phase:-Math.PI/2+.25,lane:24,preferredLane:24,targetLane:24,speed:5.7,angle:0,x:0,y:0,color:'#47a5ed'},{phase:-Math.PI/2+.40,lane:0,preferredLane:0,targetLane:0,speed:5.6,angle:0,x:0,y:0,color:'#b78be8'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Pista tipo autódromo: duas retas longas e curvas largas.
// Novo traçado: circuito assimétrico com reta principal, curva rápida,
 // cotovelo técnico e uma sequência de curvas em raio variável.
function rawTrackPoint(a){
 return {
  x:cx+285*Math.cos(a)+38*Math.cos(2*a+.48)+18*Math.sin(3*a),
  y:cy+170*Math.sin(a)+28*Math.sin(2*a-.68)+16*Math.sin(3*a)
 }
}
const trackPoint=(a,l=0)=>{
 const p=rawTrackPoint(a),before=rawTrackPoint(a-.001),after=rawTrackPoint(a+.001);
 const dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1;
 return {x:p.x-dy/len*l,y:p.y+dx/len*l}
};
function traceTrack(offset){
 ctx.beginPath();
 for(let i=0;i<=360;i++){
  const p=trackPoint(-Math.PI/2+i/360*Math.PI*2,offset);
  if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)
 }
 ctx.closePath()
}
function nearestTrack(x,y){
 let best={distance:Infinity,phase:0,side:0};
 for(let i=0;i<360;i++){
  const a=-Math.PI/2+i/360*Math.PI*2,p=rawTrackPoint(a);
  const before=rawTrackPoint(a-.004),after=rawTrackPoint(a+.004);
  const dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1;
  const vx=x-p.x,vy=y-p.y,distance=Math.hypot(vx,vy);
  if(distance<best.distance)best={distance,phase:(a+Math.PI/2+Math.PI*2)%(Math.PI*2),side:(dx*vy-dy*vx)/len}
 }
 return best
}
function trackRadius(x,y){return 1+nearestTrack(x,y).side/(road/2)}
function progressAt(x,y){return nearestTrack(x,y).phase}
 // Posiciona o jogador somente depois de definir a geometria do circuito.
const initialPlayerPoint=trackPoint(-Math.PI/2,-24);
const initialPlayerAhead=rawTrackPoint(-Math.PI/2+.01);
const initialPlayerBehind=rawTrackPoint(-Math.PI/2-.01);
player.x=initialPlayerPoint.x;
player.y=initialPlayerPoint.y;
player.angle=Math.atan2(initialPlayerAhead.y-initialPlayerBehind.y,initialPlayerAhead.x-initialPlayerBehind.x);
function drawGrandstand(x,y,w,h,label){
 ctx.save();
 ctx.fillStyle='#0005';ctx.beginPath();ctx.roundRect(x+4,y+4,w,h,5);ctx.fill();
 ctx.fillStyle='#303b42';ctx.beginPath();ctx.roundRect(x,y,w,h,5);ctx.fill();
 ctx.fillStyle='#68747a';ctx.fillRect(x+5,y+4,w-10,5);
 // Fileiras de espectadores estilizadas.
 const colors=['#e9bd54','#d95c4e','#d9e2e4','#5e9ec0','#8a79b7'];
 for(let row=0;row<3;row++)for(let col=0;col<Math.floor((w-18)/9);col++){
  ctx.fillStyle=colors[(row*3+col)%colors.length];
  ctx.beginPath();ctx.arc(x+10+col*9,y+14+row*7,2.2,0,Math.PI*2);ctx.fill()
 }
 ctx.fillStyle='#111a20';ctx.fillRect(x+5,y+h-6,w-10,4);
 ctx.fillStyle='#f1f3ed';ctx.font='bold 7px system-ui';ctx.textAlign='right';ctx.fillText(label,x+w-8,y+h-8);
 ctx.restore()
}
function drawFacilities(){
 // Arquibancadas em áreas externas, sem invadir o asfalto.
 drawGrandstand(112,12,196,39,'GRANDSTAND A');
 drawGrandstand(650,549,198,39,'GRANDSTAND B');
 // Pit lane no infield.
 ctx.save();
 ctx.fillStyle='#0005';ctx.fillRect(510,151,307,27);
 ctx.fillStyle='#343b40';ctx.fillRect(507,147,307,25);
 ctx.strokeStyle='#f0eee5';ctx.lineWidth=2;ctx.strokeRect(507,147,307,25);
 ctx.setLineDash([12,9]);ctx.strokeStyle='#d9d9d1';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(514,159);ctx.lineTo(807,159);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#f5f5ed';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText('PIT LANE',660,143);
 // Boxes e portas das equipes.
 ctx.fillStyle='#202b32';ctx.beginPath();ctx.roundRect(566,187,244,45,4);ctx.fill();
 ctx.fillStyle='#69747a';ctx.fillRect(566,187,244,5);
 const teamColors=['#e84d4d','#47a5ed','#b78be8','#f3b72f','#55b98a','#e58d49'];
 for(let i=0;i<6;i++){
  const x=573+i*39;
  ctx.fillStyle='#111a20';ctx.fillRect(x,197,34,27);
  ctx.fillStyle=teamColors[i];ctx.fillRect(x+3,200,28,3);
  ctx.fillStyle='#89969b';ctx.fillRect(x+4,207,26,14);
  ctx.fillStyle='#26343c';ctx.fillRect(x+7,210,20,11);
  ctx.fillStyle='#f4f2e9';ctx.font='bold 7px system-ui';ctx.textAlign='center';ctx.fillText('0'+(i+1),x+17,194)
 }
 ctx.fillStyle='#e9edf0';ctx.font='bold 8px system-ui';ctx.textAlign='left';ctx.fillText('TEAM GARAGES',573,242);
 // Torre de controle compacta.
 ctx.fillStyle='#0005';ctx.fillRect(485,188,48,38);
 ctx.fillStyle='#39464d';ctx.fillRect(481,184,48,37);
 ctx.fillStyle='#8fa2a9';ctx.fillRect(485,188,40,9);
 ctx.fillStyle='#1a2a34';ctx.fillRect(487,201,36,17);
 ctx.fillStyle='#f2bd3e';ctx.fillRect(481,181,48,4);
 ctx.restore()
}
function drawTrack(){
 // Área externa e escape de pista.
 ctx.fillStyle='#24563b';ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.13;ctx.strokeStyle='#a5c98c';ctx.lineWidth=2;
 for(let x=-80;x<W+100;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+130,H);ctx.stroke()}
 ctx.globalAlpha=1;
 drawFacilities();
 traceTrack(road/2+24);ctx.fillStyle='#8b8d83';ctx.fill();
 traceTrack(road/2+8);ctx.fillStyle='#d8d5c8';ctx.fill();
 // Asfalto com contornos limpos.
 traceTrack(road/2);ctx.fillStyle='#454b50';ctx.fill();
 traceTrack(-road/2);ctx.fillStyle='#24563b';ctx.fill();
 const asphalt=ctx.createLinearGradient(0,70,0,530);
 asphalt.addColorStop(0,'#555b60');asphalt.addColorStop(.5,'#41474c');asphalt.addColorStop(1,'#555b60');
 traceTrack(road/2);ctx.fillStyle=asphalt;ctx.fill();
 // Bordas e zebras alternadas.
 ctx.lineWidth=3;ctx.strokeStyle='#f4f1e8';
 traceTrack(road/2);ctx.stroke();
 traceTrack(-road/2);ctx.stroke();
 for(let a=0;a<Math.PI*2;a+=.045){
  const p=trackPoint(a,road/2-2),q=trackPoint(a+.025,road/2-2);
  ctx.strokeStyle=(Math.floor(a/.045)%2)?'#f4f4ee':'#e34b40';ctx.lineWidth=8;
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
  const p2=trackPoint(a,-road/2+2),q2=trackPoint(a+.025,-road/2+2);
  ctx.beginPath();ctx.moveTo(p2.x,p2.y);ctx.lineTo(q2.x,q2.y);ctx.stroke()
 }
 // Linha tracejada central e linha de largada.
 ctx.setLineDash([17,19]);ctx.strokeStyle='#d9d9d2';ctx.lineWidth=2;
 traceTrack(0);ctx.stroke();ctx.setLineDash([]);
 const edgeA=trackPoint(-Math.PI/2,-road/2),edgeB=trackPoint(-Math.PI/2,road/2);
 const startAngle=Math.atan2(edgeB.y-edgeA.y,edgeB.x-edgeA.x);
 ctx.save();ctx.translate((edgeA.x+edgeB.x)/2,(edgeA.y+edgeB.y)/2);ctx.rotate(startAngle);
 for(let i=0;i<8;i++)for(let j=0;j<2;j++){
  ctx.fillStyle=(i+j)%2?'#151719':'#f6f6ef';ctx.fillRect(-road/2+i*road/8,-5+j*5,road/8,5)
 }
 ctx.restore();
 ctx.fillStyle='#ffffffb8';ctx.font='800 12px system-ui';ctx.fillText('GRID RACE CIRCUIT',cx+125,cy-ry-9);
}
function drawCar(x,y,a,color,isPlayer=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.scale(.72,.72);
 // Sombra e pneus.
 ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,1,17,27,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#101316';
 for(const yy of[-17,12])for(const xx of[-14,10]){
  ctx.beginPath();ctx.roundRect(xx,yy,5,11,2);ctx.fill()
 }
 // Asas dianteira e traseira.
 ctx.fillStyle='#171b1e';ctx.beginPath();ctx.roundRect(-15,-24,30,5,2);ctx.fill();
 ctx.beginPath();ctx.roundRect(-16,18,32,5,2);ctx.fill();
 // Chassi de monoposto.
 ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(-7,19);ctx.lineTo(-9,8);ctx.lineTo(-7,-12);ctx.lineTo(-4,-22);
 ctx.lineTo(0,-27);ctx.lineTo(4,-22);ctx.lineTo(7,-12);ctx.lineTo(9,8);ctx.lineTo(7,19);
 ctx.quadraticCurveTo(0,23,-7,19);ctx.fill();
 // Cockpit e halo.
 ctx.fillStyle='#18242c';ctx.beginPath();ctx.ellipse(0,-3,4.8,8,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#dce5e8';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,-4,6,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
 // Detalhes de nariz, número e luzes.
 ctx.fillStyle=isPlayer?'#fff0b0':'#f4f4ef';ctx.beginPath();ctx.moveTo(-2,-20);ctx.lineTo(0,-27);ctx.lineTo(2,-20);ctx.fill();
 ctx.fillStyle='#ffffff';ctx.font='bold 7px system-ui';ctx.textAlign='center';ctx.fillText(isPlayer?'1':'',0,13);
 ctx.fillStyle='#ffdf8a';ctx.fillRect(-5,-22,3,2);ctx.fillRect(2,-22,3,2);
 ctx.restore()
}
function draw(){drawTrack();bots.forEach(b=>drawCar(b.x,b.y,b.angle,b.color));drawCar(player.x,player.y,player.angle,player.color,true)}
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
 // IA de pilotagem: cada adversário segue a pista com direção, aceleração e frenagem próprias.
 bots.forEach((b,index)=>{
  const nearby=[{x:player.x,y:player.y}];
  bots.forEach((other,j)=>{if(j!==index)nearby.push({x:other.x,y:other.y})});
  const current=trackPoint(b.phase,b.lane);
  let chosenLane=b.preferredLane;
  let bestScore=-Infinity;
  [-34,0,34].forEach(candidate=>{
   const probe=trackPoint(b.phase+.12,candidate);
   let clearance=180;
   nearby.forEach(car=>clearance=Math.min(clearance,Math.hypot(probe.x-car.x,probe.y-car.y)));
   const score=Math.min(clearance,180)-Math.abs(candidate-b.lane)*.30-Math.abs(candidate-b.preferredLane)*.12;
   if(score>bestScore){bestScore=score;chosenLane=candidate}
  });
  // Só muda de faixa quando há tráfego próximo; depois retorna gradualmente à linha preferida.
  const closeTraffic=nearby.some(car=>Math.hypot(current.x-car.x,current.y-car.y)<105);
  b.targetLane=closeTraffic?chosenLane:b.preferredLane;
  b.lane+=(b.targetLane-b.lane)*Math.min(.055*t,1);
  const target=trackPoint(b.phase+.20,b.lane);
  const desiredAngle=Math.atan2(target.y-b.y,target.x-b.x);
  const angleError=Math.atan2(Math.sin(desiredAngle-b.angle),Math.cos(desiredAngle-b.angle));
  b.angle+=clamp(angleError,-.065*t,.065*t);
  const ahead=trackPoint(b.phase+.34,b.lane);
  const nextAngle=Math.atan2(ahead.y-target.y,ahead.x-target.x);
  const bend=Math.abs(Math.atan2(Math.sin(nextAngle-b.angle),Math.cos(nextAngle-b.angle)));
  const targetSpeed=clamp(7.5-bend*2.8,5.2,7.5);
  b.speed+=clamp(targetSpeed-b.speed,-.10*t,.045*t);
  b.x+=Math.cos(b.angle)*b.speed*t;
  b.y+=Math.sin(b.angle)*b.speed*t;
  // O marcador de progresso acompanha a velocidade real aproximada do carro.
  b.phase+=b.speed*t/280;
 });
 // Colisão simples: o carro do jogador não atravessa os adversários.
 bots.forEach(b=>{
  let dx=player.x-b.x,dy=player.y-b.y;
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
function reset(){const start=trackPoint(-Math.PI/2,-24),ahead=rawTrackPoint(-Math.PI/2+.01),behind=rawTrackPoint(-Math.PI/2-.01);player.x=start.x;player.y=start.y;player.angle=Math.atan2(ahead.y-behind.y,ahead.x-behind.x);player.speed=0;player.vx=0;player.vy=0;bots.forEach((b,i)=>{b.phase=-Math.PI/2+[.10,.25,.40][i];b.lane=b.preferredLane;b.targetLane=b.preferredLane;b.speed=5.8-i*.1;b.angle=0;const p=trackPoint(b.phase,b.lane);b.x=p.x;b.y=p.y});lap=1;lastProgress=0;position=4;finished=false;document.getElementById('lap').textContent='1';document.getElementById('position').textContent='4';document.getElementById('speed').textContent='0'}
document.getElementById('start').addEventListener('click',()=>{if(finished)reset();running=true;last=0;document.getElementById('overlay').style.display='none';requestAnimationFrame(frame)});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key==='Escape'&&running){running=false;showOverlay('Corrida pausada','Quando estiver pronto, retome a corrida.')}});
window.addEventListener('keyup',e=>keys[e.key]=false);bots.forEach(b=>{const p=trackPoint(b.phase,b.lane);b.x=p.x;b.y=p.y});draw()
})();