(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const SCORE = [10,50,30,120,20,200];
  const COLOR = ['#b38156','#edaf19','#eb769d','#ac7de8','#c68351','#f1ae20'];
  const END = 3250;
  const PX = 76;
  const loaded = {};
  const paths = {
    dog0:'assets/jjong-0.webp',
    dog1:'assets/jjong-1.webp',
    dog2:'assets/jjong-2.webp',
    dog3:'assets/jjong-3.webp',
    dog4:'assets/jjong-4.webp',
    dog5:'assets/jjong-5.webp',
    dog6:'assets/jjong-6.webp',
    dog7:'assets/jjong-7.webp',
    bone0:'assets/bone-0.webp',
    bone1:'assets/bone-1.webp',
    bone2:'assets/bone-2.webp',
    bone3:'assets/bone-3.webp',
    bone4:'assets/bone-4.webp',
    bone5:'assets/bone-5.webp',
    mom:'assets/mom.webp'
  };
  for (const [key,src] of Object.entries(paths)) { const im = new Image(); im.src=src; loaded[key]=im; }
  let W=390,H=760,DPR=1,GROUND=555,last=0,now=0;
  let phase='start',distance=0,runTime=0,score=0,best=0,hearts=5;
  let altitude=0,velocity=0,jumpCount=0,invincible=0,meetingTimer=0;
  let obstacles=[],bones=[],particles=[],hitFlash=0,footTime=0,soundOn=true,audio=null;
  let tipAge=0,toastTimeout;
  let seed=10243;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  function rand(a,b){return a+(b-a)*random();}
  function choose(arr){return arr[Math.floor(random()*arr.length)];}
  try{best=Number(localStorage.getItem('jjongi_best_2026'))||0;}catch(_){}
  $('best').textContent=best;

  function resize(){
    const r=canvas.getBoundingClientRect();
    DPR=Math.min(2.5,window.devicePixelRatio||1);
    W=390; H=W * Math.max(1.15,r.height)/Math.max(1,r.width);
    GROUND=H*.739;
    canvas.width=Math.round(r.width*DPR); canvas.height=Math.round(r.height*DPR);
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  }
  window.addEventListener('resize',resize,{passive:true});
  resize();

  function makeLevel(){
    seed=10243;obstacles=[];bones=[];
    const types=['pillow','box','ball','plant','puddle','toy'];
    let i=760;
    while(i<END-470){
      const type=choose(types); const spec={pillow:[76,32],box:[61,58],ball:[53,49],plant:[52,67],puddle:[86,15],toy:[68,44]}[type];
      obstacles.push({x:i,type,w:spec[0],h:spec[1],hit:false});
      // Bonus bones just above obstacles reward well timed jumps.
      if(random()<.67) bones.push({x:i+rand(-6,13),h:rand(115,136),type:choose([0,1,2,3,4,5]),taken:false,angle:rand(0,6)});
      i+=rand(490,580);
    }
    for(let x=310;x<END-260;x+=rand(215,285)){
      const r=random(),t= r<.27?0:r<.46?4:r<.65?2:r<.83?1:r<.955?3:5;
      const air=random();
      bones.push({x:x+rand(-12,12),h:air<.19?38:air<.74?122:185,type:t,taken:false,angle:rand(0,6)});
    }
    // Near the finish, let the player enjoy the final approach without a hazard.
    for(const x of [END-365,END-220])bones.push({x,h:152,type:5,taken:false,angle:rand(0,6)});
    bones.sort((a,b)=>a.x-b.x);
  }
  makeLevel();

  function setScreen(id){
    for(const k of ['start','pause','gameover','ending']) $(k).classList.toggle('is-hidden',id!==k);
    const playing=(id===null);
    $('hud').classList.toggle('is-hidden',!playing && id!=='pause');
    $('jump-btn').classList.toggle('is-hidden',!playing || phase!=='run');
    $('jump-hint').classList.toggle('is-hidden',!playing || phase!=='run' || distance>880);
  }
  function updateHUD(){
    $('score').textContent=score.toLocaleString('ko-KR');
    $('hearts').textContent=Array.from({length:5},(_,i)=>i<hearts?'♥':'♡').join('');
    $('hearts').setAttribute('aria-label',`남은 하트 ${hearts}개`);
    const pct=100*Math.min(1,distance/END);
    $('progress-fill').style.width=pct+'%';$('progress-paw').style.left=pct+'%';
  }
  function start(){
    makeLevel();phase='run';distance=0;runTime=0;score=0;hearts=5;altitude=0;velocity=0;jumpCount=0;
    invincible=0;meetingTimer=0;hitFlash=0;footTime=0;tipAge=0;particles=[];
    $('float-layer').replaceChildren();$('toast').classList.remove('active');
    updateHUD();setScreen(null);beep('start');
  }
  function togglePause(){
    if(phase==='run'){phase='pause';setScreen('pause');}
    else if(phase==='pause'){phase='run';setScreen(null);}
  }
  function playSound(freq=600,dur=.09,type='sine',vol=.055,delay=0){
    if(!soundOn)return;
    try {
      const A=window.AudioContext||window.webkitAudioContext;
      if(!A)return;
      audio=audio||new A();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const t=audio.currentTime+delay;
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(120,freq*.86),t+dur);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(vol,t+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,t+dur);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+dur+.025);
    }catch(_){ /* sound is optional */ }
  }
  function beep(kind){
    if(kind==='jump')playSound(450,.13,'sine',.047);
    if(kind==='double'){playSound(570,.13,'sine',.04);playSound(780,.12,'sine',.035,.075);}
    if(kind==='bone'){playSound(710,.085,'sine',.04);playSound(1020,.13,'sine',.04,.075);}
    if(kind==='hit'){playSound(215,.18,'triangle',.07);playSound(150,.2,'triangle',.045,.14);}
    if(kind==='start'){playSound(580,.095,'sine',.035);playSound(800,.13,'sine',.04,.11);}
    if(kind==='win'){[523,659,784,1047].forEach((f,i)=>playSound(f,.22,'sine',.055,i*.12));}
  }
  function jump(){
    if(phase!=='run')return;
    if(jumpCount===0){velocity=620;jumpCount=1;beep('jump');burst(135,GROUND-44,'#fff3ce',8,2.7);}
    else if(jumpCount===1){velocity=575;jumpCount=2;beep('double');burst(135,GROUND-altitude-42,'#e4a5ed',14,3.1);}
  }
  function showToast(txt){
    const el=$('toast');el.textContent=txt;el.classList.add('active');
    clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('active'),950);
  }
  function showFloat(x,y,txt,color){
    const el=document.createElement('span');el.className='float-score';el.textContent=txt;el.style.color=color;
    el.style.left=(x/W*100)+'%';el.style.top=(y/H*100)+'%';$('float-layer').appendChild(el);
    setTimeout(()=>el.remove(),950);
  }
  function burst(x,y,color,n=10,v=2.3){
    for(let i=0;i<n;i++){
      const a=rand(0,Math.PI*2),vel=rand(.5,1)*v;
      particles.push({x,y,vx:Math.cos(a)*vel*65,vy:Math.sin(a)*vel*65-45,life:rand(.42,.8),initial:.8,color,size:rand(2,5)});
    }
  }
  function rect(x,y,w,h,r=0){
    if(!r){ctx.fillRect(x,y,w,h);return;}
    r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill();
  }
  function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fill();}
  function circle(x,y,r,color){ellipse(x,y,r,r,color);}
  function line(x1,y1,x2,y2,width,color){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function drawImage(im,x,y,w,h){if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,x,y,w,h);}
  function drawingBackground(t){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#ffefdf');bg.addColorStop(.6,'#fce0c5');bg.addColorStop(1,'#e4b990');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // sunlight washes the warm living-room walls
    const beam=ctx.createLinearGradient(0,0,W,GROUND);beam.addColorStop(0,'#ffffffaa');beam.addColorStop(.46,'#fff3c438');beam.addColorStop(1,'#ffffff00');ctx.fillStyle=beam;ctx.fillRect(0,0,W,GROUND);
    for(let y=22;y<GROUND-60;y+=68){ctx.fillStyle='#fffaf029';ctx.fillRect(0,y,W,2);}
    const scroll=distance*.19;
    for(let i=-1;i<5;i++){
      const x=i*600+120-((scroll%600)+600)%600;
      drawWindow(x+90,GROUND-440,t);
      drawShelf(x+385,GROUND-305,t);
      drawPlant(x+524,GROUND-68,1.1,t);
      drawPictures(x-85,GROUND-250);
    }
    // wainscoting
    ctx.fillStyle='#d8ae8c';ctx.fillRect(0,GROUND-60,W,11);
    ctx.fillStyle='#fff7e7';ctx.fillRect(0,GROUND-64,W,6);
    ctx.fillStyle='#fff1da';ctx.fillRect(0,GROUND-48,W,48);
    ctx.strokeStyle='#dcb59055';ctx.lineWidth=2;
    for(let x=(-distance*.18%92)-92;x<W+92;x+=92){ctx.strokeRect(x,GROUND-45,84,38);}
    // honey colored hardwood floor
    const floor=ctx.createLinearGradient(0,GROUND,0,H);floor.addColorStop(0,'#f8dcaf');floor.addColorStop(1,'#e9b67f');ctx.fillStyle=floor;ctx.fillRect(0,GROUND,W,H-GROUND);
    const ox=((-distance*.65)%135+135)%135;
    for(let x=ox-270;x<W+135;x+=135){
      line(x,GROUND+28,x+150,GROUND+28,1,'#d9ac8550');
      line(x+68,GROUND+105,x+190,GROUND+105,1,'#d9ac8550');
      line(x,GROUND+27,x+1,H,1,'#d7ad8955');
    }
    const light=ctx.createRadialGradient(48,GROUND+25,10,160,GROUND+12,300);light.addColorStop(0,'#fff7c457');light.addColorStop(1,'#fffbe600');ctx.fillStyle=light;ctx.fillRect(0,GROUND-35,W,H-GROUND+50);
    // runner rug, shadow and fine paw motifs
    ellipse(192,GROUND+18,200,16,'#c9906a38');
    for(let i=0;i<7;i++){
      const xx=i*115-((distance*.52%115)+115)%115;
      drawPaw(xx,GROUND+73+(i%2)*21,.45,'#e1a98a49');
    }
    // near-floor floating dust motes
    for(let i=0;i<9;i++){
      const xx=(i*101.2 +t*5)%W,yy=46+(i*89)%(Math.max(170,GROUND-115));
      circle(xx,yy,1.7+(i%3)*.4,'#fff9d9ac');
    }
  }
  function drawWindow(x,y,t){
    const w=210,h=255;
    ctx.fillStyle='#c99d77b6';rect(x-13,y-15,w+26,h+25,18);
    ctx.fillStyle='#fffbf0';rect(x-7,y-9,w+14,h+11,14);
    const sky=ctx.createLinearGradient(x,y,x,y+h);sky.addColorStop(0,'#a2d4f2');sky.addColorStop(.65,'#e2f2eb');sky.addColorStop(1,'#fff4c0');ctx.fillStyle=sky;rect(x,y,w,h,8);
    // trees outside the window
    for(let i=0;i<7;i++){
      const treeX=x-5+i*38;
      ellipse(treeX,y+h-25-(i%3)*21,38,37,i%2?'#9cbe75':'#c3d78b');
      ellipse(treeX+10,y+h-50-(i%2)*24,31,34,'#a5cd75');
    }
    ctx.fillStyle='#fff4ec';ctx.fillRect(x+w*.47,y,10,h);ctx.fillRect(x,y+h*.53,w,9);
    ctx.fillStyle='#fdf2e6dd';
    ctx.beginPath();ctx.moveTo(x-12,y);ctx.bezierCurveTo(x+42,y+4,x+7,y+100,x+44,y+150);ctx.lineTo(x-10,y+194);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(x+w+12,y);ctx.bezierCurveTo(x+w-44,y+4,x+w-7,y+100,x+w-44,y+150);ctx.lineTo(x+w+10,y+194);ctx.closePath();ctx.fill();
    line(x-14,y+182,x+10,y+181,6,'#edcbb3');line(x+w-10,y+181,x+w+14,y+182,6,'#edcbb3');
    ctx.fillStyle='#f9e1be';rect(x-25,y+h+7,w+50,13,6);
  }
  function drawShelf(x,y,t){
    ctx.fillStyle='#bb8c69';rect(x-3,y+22,155,11,5);rect(x-3,y+97,155,10,5);
    ctx.fillStyle='#eecfa9';rect(x+5,y-35,133,58,8);
    for(let i=0;i<5;i++){
      ctx.fillStyle=['#9cbda4','#cc9a9b','#a6c5c1','#e0af70','#b6acba'][i];rect(x+15+i*20,y+3-(i%3)*7,14,31+(i%3)*7,2);
      ctx.fillStyle='#fff3d6a8';ctx.fillRect(x+18+i*20,y+9,2,15);
    }
    ctx.fillStyle='#e3c19f';rect(x+24,y+53,62,46,5);drawPaw(x+55,y+77,.52,'#be927a');
    drawPlant(x+119,y+99,.53,t);
  }
  function drawPlant(x,y,scale,t){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle='#bd8870';ctx.beginPath();ctx.moveTo(-22,-5);ctx.lineTo(23,-5);ctx.lineTo(15,29);ctx.lineTo(-13,29);ctx.closePath();ctx.fill();
    ctx.fillStyle='#d9a28b';rect(-24,-9,48,8,3);
    for(let i=0;i<7;i++){
      const a=(i-3)*.5,stemX=Math.sin(a)*35+Math.sin(t*.8+i)*2;
      line(0,-12,stemX,-40-Math.cos(a)*25,3,'#6f9b74');
      ellipse(stemX-11,-51-Math.cos(a)*25,17,9,i%2?'#8dac75':'#78a976');
      ellipse(stemX+7,-44-Math.cos(a)*25,13,8,'#99bf86');
    }
    ctx.restore();
  }
  function drawPictures(x,y){
    for(let i=0;i<2;i++){
      const fx=x+i*97,fy=y+(i%2)*24;
      ctx.fillStyle='#c49377';rect(fx,fy,69,69,7);
      ctx.fillStyle='#fff2dd';rect(fx+7,fy+7,55,55,4);
      drawPaw(fx+35,fy+38,.69,'#cbaa98');
    }
  }
  function drawPaw(x,y,s,color){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ellipse(0,7,17,13,color);ellipse(-17,-8,6,8,color);ellipse(-5,-15,6,8,color);ellipse(9,-15,6,8,color);ellipse(20,-7,6,8,color);
    ctx.restore();
  }
  function drawObstacle(ob,x,t){
    const y=GROUND;
    ellipse(x,y+1,ob.w*.51,7,'#955e4c34');
    ctx.save();ctx.translate(x,y);
    switch(ob.type){
      case 'pillow':
        ctx.fillStyle='#df99aa';rect(-39,-35,78,32,15);ctx.fillStyle='#ffbdc9';rect(-36,-40,72,30,14);
        ctx.strokeStyle='#fff2eb';ctx.lineWidth=3;ctx.strokeRect(-19,-32,38,15);
        circle(-15,-26,3,'#fff8db');circle(12,-26,3,'#fff8db');break;
      case 'box':
        ctx.fillStyle='#a7755d';rect(-32,-59,64,60,9);ctx.fillStyle='#d6a17d';rect(-29,-63,58,57,6);
        ctx.fillStyle='#f2d4ab';rect(-31,-63,61,10,5);ctx.fillStyle='#fff3d1';drawPaw(0,-32,.6,'#ad7764');break;
      case 'ball':
        circle(0,-26,28,'#fff2d2');circle(-1,-28,25,'#f3a8ab');
        ctx.strokeStyle='#fff6e3';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-26,21,-.8,2.4);ctx.stroke();
        ellipse(-8,-36,8,4,'#fff9e9bd');break;
      case 'plant':
        drawPlant(0,-28,.85,t);break;
      case 'puddle':
        ellipse(0,-4,49,10,'#87bdcb');ellipse(0,-6,44,7,'#b7dfdd');ellipse(-15,-10,13,2,'#e8faf1');break;
      case 'toy':
        ctx.fillStyle='#efb670';rect(-34,-31,69,31,8);ctx.fillStyle='#ffda95';rect(-34,-50,69,29,8);
        ctx.fillStyle='#f4a1a2';rect(-12,-48,24,19,5);ctx.fillStyle='#fff1d4';rect(-7,-45,14,13,4);
        ellipse(-23,-6,7,7,'#ac7963');ellipse(23,-6,7,7,'#ac7963');break;
    }
    ctx.restore();
  }
  function drawBone(b,x,t){
    const floating=Math.sin(t*4+b.angle)*3.8;
    const y=GROUND-b.h+floating;
    const im=loaded['bone'+b.type];
    if(!im?.naturalWidth)return;
    const scale=b.type===5?1.17:1;
    const w=58*scale,h=46*scale;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2+b.angle)*.065);
    ctx.globalAlpha=.26;circle(0,0,31,b.type===3?'#c997e8':'#ffe099');ctx.globalAlpha=1;
    drawImage(im,-w/2,-h/2,w,h);
    ctx.restore();
  }
  function drawDog(t){
    const airborne=altitude>3;
    const frames=[1,2,3,6,7,4,2,3];
    const index=airborne?(velocity>120?5:velocity< -115?6:2):frames[Math.floor(t*9)%frames.length];
    const bob=airborne?0:Math.sin(t*24)*2;
    // Keep Jjong's *visible* size consistent across running and airborne frames.
    // The jumping sprite (frame 5) contains less dog artwork inside the PNG,
    // so drawing every frame into the same rectangle made Jjong look smaller.
    // Compensate for the empty padding, anchoring all paws to the same baseline.
    const frameScale = index===5 ? 1.19 : index===6 ? 1.12 : 1;
    const dogW = 138*frameScale, dogH = 131*frameScale;
    const left = 145-dogW/2;
    const pawBaseline = GROUND-altitude-5+bob;
    const top = pawBaseline-dogH*(278/294);
    ellipse(137,GROUND+1,Math.max(16,48-altitude*.13),7.5,`rgba(116,65,52,${Math.max(.07,.29-altitude*.0012)})`);
    ctx.save();
    if(invincible>0&&Math.floor(invincible*12)%2===0)ctx.globalAlpha=.39;
    if(hitFlash>0)ctx.filter='brightness(1.15) saturate(1.3)';
    drawImage(loaded['dog'+index],left,top,dogW,dogH);
    ctx.restore();
  }
  function drawMom(t){
    if(distance<END-405)return;
    const x=END+210-distance;
    // Mom is on the right, flipped so her face is oriented left, towards Jjong.
    const h=210,w=130;
    ellipse(x,GROUND+3,40,8,'#9a63523d');
    ctx.save();ctx.translate(x,GROUND);ctx.scale(-1,1);
    const im=loaded.mom;
    drawImage(im,-w/2,-h+Math.sin(t*2)*2,w,h);
    ctx.restore();
    if(phase==='meeting'){
      for(let j=0;j<3;j++){
        const a=t*1.3+j*2.1;
        ctx.globalAlpha=.5+.4*Math.sin(a)**2;
        ctx.font=`${22+j*2}px 'Jua',sans-serif`;
        ctx.fillStyle=['#ff7897','#ffd16c','#ffb1c0'][j];
        ctx.fillText('♥',x-35+Math.sin(a)*29,GROUND-170-(t%2)*13-j*25);
      }
      ctx.globalAlpha=1;
    }else{
      ctx.font="19px 'Jua',sans-serif";ctx.textAlign='center';ctx.fillStyle='#e58a9f';
      ctx.fillText('쫑아~ ♡',x,GROUND-221+Math.sin(t*2)*2);
      ctx.textAlign='left';
    }
  }
  function drawParticles(dt){
    for(const p of particles){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=145*dt;p.life-=dt;
      ctx.globalAlpha=Math.min(1,p.life/.4);
      circle(p.x,p.y,Math.max(0,p.size*p.life/.8),p.color);
    }
    ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
  }
  function finish(){
    if(phase!=='meeting')return;
    phase='win';$('final-score').textContent=score.toLocaleString('ko-KR');
    if(score>best){best=score;try{localStorage.setItem('jjongi_best_2026',String(best));}catch(_){}}
    $('best').textContent=best;
    setScreen('ending');
  }
  function lose(){
    phase='lost';$('lost-score').textContent=score.toLocaleString('ko-KR');setScreen('gameover');
  }
  function tick(dt){
    if(phase==='run'){
      runTime+=dt;
      const speed=173+Math.min(9,runTime*.22);
      distance=Math.min(END,distance+speed*dt);
      tipAge+=dt;
      if(distance>880)$('jump-hint').classList.add('is-hidden');
      if(altitude>0||velocity>0){
        altitude+=velocity*dt;
        velocity-=1300*dt;
        if(altitude<=0){altitude=0;velocity=0;jumpCount=0;burst(138,GROUND-5,'#ffe8c4',5,1.05);}
      }
      if(invincible>0)invincible=Math.max(0,invincible-dt);
      if(hitFlash>0)hitFlash=Math.max(0,hitFlash-dt);
      footTime+=dt;
      if(altitude===0&&footTime>.12){footTime=0;particles.push({x:104,y:GROUND-5,vx:rand(-30,-85),vy:rand(-25,-11),life:.36,initial:.36,color:'#f7d5b1',size:rand(1.5,3.5)});}
      const camera=distance+76;
      for(const ob of obstacles){
        const x=ob.x-camera;
        if(!ob.hit&&Math.abs(x-140)<ob.w*.39+22 && altitude < ob.h-16 && invincible===0){
          ob.hit=true;invincible=2.05;hitFlash=.5;hearts--;beep('hit');burst(139,GROUND-altitude-54,'#ff93a2',13,2.8);updateHUD();
          showFloat(145,GROUND-altitude-105,'-♥','#ed7693');
          if(hearts<=0){lose();return;}
        }
      }
      for(const b of bones){
        if(b.taken)continue;
        const x=b.x-camera;
        if(x < 40 || x > 211)continue;
        const boneY=GROUND-b.h;
        const faceY=GROUND-altitude-68;
        if(Math.abs(x-141)<34 && Math.abs(boneY-faceY)<36){
          b.taken=true;score+=SCORE[b.type];beep('bone');burst(x,boneY,COLOR[b.type],10,2.4);
          showFloat(x,boneY-28,'+'+SCORE[b.type],COLOR[b.type]);updateHUD();
        }
      }
      if(distance>=END){
        phase='meeting';meetingTimer=1.55;beep('win');$('jump-btn').classList.add('is-hidden');$('jump-hint').classList.add('is-hidden');burst(183,GROUND-107,'#ffc4d6',29,4.2);
        updateHUD();
      }
      updateHUD();
    } else if(phase==='meeting'){
      meetingTimer-=dt;
      if(Math.random()<dt*18)burst(rand(154,214),rand(GROUND-210,GROUND-95),'#ffc3d5',2,1.65);
      if(meetingTimer<=0)finish();
    }
  }
  function draw(t,dt){
    ctx.save();ctx.clearRect(0,0,W,H);
    drawingBackground(t);
    const camera=distance+76;
    for(const b of bones){if(b.taken)continue;const x=b.x-camera;if(x>-65&&x<W+70)drawBone(b,x,t);}
    for(const ob of obstacles){const x=ob.x-camera;if(x>-105&&x<W+105)drawObstacle(ob,x,t);}
    drawMom(t);drawDog(t);drawParticles(dt);
    if(phase==='meeting'){
      ctx.font="25px 'Jua',sans-serif";ctx.textAlign='center';ctx.fillStyle='#fffdf4';ctx.strokeStyle='#b3767e';ctx.lineWidth=5;
      ctx.strokeText('엄마!! ♥',192,GROUND-230);ctx.fillText('엄마!! ♥',192,GROUND-230);ctx.textAlign='left';
    }
    if(hitFlash>0){ctx.fillStyle=`rgba(255,135,153,${hitFlash*.17})`;ctx.fillRect(0,0,W,H);}
    ctx.restore();
  }
  function raf(ms){
    if(!last)last=ms;
    const dt=Math.min((ms-last)/1000,.033);last=ms;now+=dt;
    tick(dt);draw(now,dt);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  $('start-btn').addEventListener('click',e=>{e.stopPropagation();start();});
  $('resume-btn').addEventListener('click',e=>{e.stopPropagation();togglePause();});
  $('pause-btn').addEventListener('click',e=>{e.stopPropagation();togglePause();});
  $('restart-paused-btn').addEventListener('click',e=>{e.stopPropagation();start();});
  $('retry-btn').addEventListener('click',e=>{e.stopPropagation();start();});
  $('ending-retry').addEventListener('click',e=>{e.stopPropagation();start();});
  $('sound-btn').addEventListener('click',e=>{e.stopPropagation();soundOn=!soundOn;$('sound-btn').textContent=soundOn?'♫':'♪̸';$('sound-btn').setAttribute('aria-label',soundOn?'효과음 끄기':'효과음 켜기');});
  function pointerJump(e){
    if(phase==='run'){
      e.preventDefault();jump();
    }
  }
  canvas.addEventListener('pointerdown',pointerJump,{passive:false});
  $('jump-btn').addEventListener('pointerdown',pointerJump,{passive:false});
  // Tapping elsewhere on the running area also jumps, except HUD controls.
  $('game').addEventListener('pointerdown',e=>{
    if(phase==='run'&&!e.target.closest('button')&&e.target!==canvas){e.preventDefault();jump();}
  },{passive:false});
  document.addEventListener('keydown',e=>{
    if(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))return;
    if(['Space','ArrowUp','KeyW'].includes(e.code)){
      e.preventDefault();if(phase==='run'&&!e.repeat)jump();else if(phase==='start')start();
    } else if(e.code==='Escape'||e.code==='KeyP'){if(phase==='run'||phase==='pause')togglePause();}
    else if(e.code==='Enter'){if(phase==='start'||phase==='win'||phase==='lost')start();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='run')togglePause();});
  // The screen starts with a full decorative background even before play.
  draw(0,0);
})();
