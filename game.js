(()=>{
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const W=960,H=600,cx=480,cy=300,rx=330,ry=205,road=76,keys={};
let running=false,finished=false,last=0,lap=1,lastProgress=0,position=4;
const player={x:cx,y:cy-ry+road*.30,angle:0,speed:0,color:'#f3b72f'};
const bots=[{phase:-Math.PI/2+.10,lane:-16,speed:1.52,color:'#e84d4d'},{phase:-Math.PI/2+.25,lane:14,speed:1.46,color:'#47a5ed'},{phase:-Math.PI/2+.40,lane:0,speed:1.40,color:'#b78be8'}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const trackPoint=(a,l=0)=>({x:cx+(rx+l)*Math.cos(a),y:cy+(ry+l*.62)*Math.sin(a)});
function progressAt(x,y){const a=Math.atan2((y-cy)/ry,(x-cx)/rx);return(a+Math.PI/2+Math.PI*2)%(Math.PI*2)}
function drawTrack(){
 ctx.fillStyle='#286044';ctx.fillRect(0,0,W,H);ctx.globalAlpha=.12;ctx.strokeStyle='#9ac49b';ctx.lineWidth=2;
 for(let x=-80;x<W+100;x+=34){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+130,H);ctx.stroke()}ctx.globalAlpha=1;
 ctx.beginPath();ctx.ellipse(cx,cy,rx+road/2,ry+road/2,0,0,Math.PI*2);ctx.fillStyle='#555b5d';ctx.fill();
 ctx.beginPath();ctx.ellipse(cx,cy,rx-road/2,ry-road/2,0,0,Math.PI*2);ctx.fillStyle='#286044';ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle='#e6e7df';ctx.beginPath();ctx.ellipse(cx,cy,rx+road/2,ry+road/2,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,rx-road/2,ry-road/2,0,0,Math.PI*2);ctx.stroke();
 for(let a=0;a<Math.PI*2;a+=.075){const p=trackPoint(a,road/2-2),q=trackPoint(a+.045,road/2-2);ctx.strokeStyle=(Math.floor(a/.075)%2)?'#f4f4ee':'#e74c3c';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();const p2=trackPoint(a,-road/2+2),q2=trackPoint(a+.045,-road/2+2);ctx.beginPath();ctx.moveTo(p2.x,p2.y);ctx.lineTo(q2.x,q2.y);ctx.stroke()}
 ctx.setLineDash([15,17]);ctx.strokeStyle='#d7d9d1';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 const sx=cx,sy=cy-ry-road/2;for(let i=0;i<8;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#111':'#fff';ctx.fillRect(sx-9+j*9,sy+i*5,9,5)}
 ctx.fillStyle='#ffffffa8';ctx.font='bold 13px system-ui';ctx.fillText('SENTIDO DA CORRIDA',cx+125,cy-ry-5)
}
function drawCar(x,y,a,color,isPlayer=false){
 ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.fillStyle='#0006';ctx.beginPath();ctx.roundRect(-13,-19,29,44,7);ctx.fill();
 ctx.fillStyle='#101316';for(const yy of[-13,10])for(const xx of[-13,10])ctx.fillRect(xx,yy,5,10);
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-9,-20,18,40,6);ctx.fill();ctx.fillStyle=isPlayer?'#fff1b5':'#e9edf0';ctx.beginPath();ctx.moveTo(-5,-15);ctx.lineTo(0,-25);ctx.lineTo(5,-15);ctx.fill();
 ctx.fillStyle='#20282e';ctx.fillRect(-13,-15,26,4);ctx.fillRect(-14,15,28,4);ctx.fillStyle='#15232b';ctx.beginPath();ctx.ellipse(0,-2,5,8,0,0,Math.PI*2);ctx.fill();ctx.restore()
}
function draw(){drawTrack();bots.forEach(b=>{const p=trackPoint(b.phase,b.lane);drawCar(p.x,p.y,b.phase,b.color)});drawCar(player.x,player.y,player.angle,player.color,true)}
function update(dt){
 const t=Math.min(dt/16.67,2.2);
 if(keys.ArrowUp||keys.w||keys.W)player.speed+=.105*t;else player.speed-=.018*t;
 if(keys.ArrowDown||keys.s||keys.S)player.speed-=.17*t;player.speed=clamp(player.speed,0,6.5);
 const steer=(keys.ArrowLeft||keys.a||keys.A?-1:0)+(keys.ArrowRight||keys.d||keys.D?1:0);
 player.angle+=steer*(.012+player.speed*.004)*Math.min(1,player.speed/1.1)*t;
 player.x+=Math.cos(player.angle)*player.speed*2*t;player.y+=Math.sin(player.angle)*player.speed*2*t;
 const radial=Math.sqrt(((player.x-cx)/rx)**2+((player.y-cy)/ry)**2);if(radial>1.18||radial<.82)player.speed*=Math.pow(.90,t);
 player.x=clamp(player.x,-20,W+20);player.y=clamp(player.y,-20,H+20);bots.forEach(b=>b.phase+=b.speed*.0019*dt);
 const p=progressAt(player.x,player.y);
 if(lastProgress>6.05&&p<.22&&radial>.82&&radial<1.18&&player.speed>1.1){lap++;if(lap>3){lap=3;finished=true;running=false;showOverlay('Bandeirada!','Você completou a corrida. Posição final: '+position+'º lugar.')}document.getElementById('lap').textContent=lap}
 lastProgress=p;const bp=bots.map(b=>(b.phase+Math.PI/2+Math.PI*2)%(Math.PI*2));position=1+bp.filter(v=>v>p).length;
 document.getElementById('position').textContent=clamp(position,1,4);document.getElementById('speed').textContent=Math.round(player.speed*48)
}
function frame(ts){if(!running)return;if(!last)last=ts;const dt=ts-last;last=ts;update(dt);draw();if(running)requestAnimationFrame(frame)}
function showOverlay(title,msg){document.getElementById('modalTitle').textContent=title;document.getElementById('modalText').textContent=msg;document.getElementById('start').textContent=finished?'CORRER NOVAMENTE':title==='Corrida pausada'?'CONTINUAR':'INICIAR CORRIDA';document.getElementById('overlay').style.display='flex'}
function reset(){player.x=cx;player.y=cy-ry+road*.30;player.angle=0;player.speed=0;bots[0].phase=-Math.PI/2+.10;bots[1].phase=-Math.PI/2+.25;bots[2].phase=-Math.PI/2+.40;lap=1;lastProgress=0;position=4;finished=false;document.getElementById('lap').textContent='1';document.getElementById('position').textContent='4';document.getElementById('speed').textContent='0'}
document.getElementById('start').addEventListener('click',()=>{if(finished)reset();running=true;last=0;document.getElementById('overlay').style.display='none';requestAnimationFrame(frame)});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key]=true;if(e.key==='Escape'&&running){running=false;showOverlay('Corrida pausada','Quando estiver pronto, retome a corrida.')}});
window.addEventListener('keyup',e=>keys[e.key]=false);draw()
})();