(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const url=(window.JJONGI_SUPABASE_URL||'').replace(/\/$/,'');
  const key=window.JJONGI_SUPABASE_KEY||'';
  const ready=Boolean(url&&key);
  const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'};
  const safe=(text)=>{const el=document.createElement('span');el.textContent=String(text);return el;};
  function msg(id,t){$(id).textContent=t;}
  async function openRank(){
    $('rank-modal').classList.remove('is-hidden');$('rank-list').replaceChildren();
    if(!ready){msg('rank-status','⚠️ 랭킹 DB 연결 전이에요. README의 설정을 완료해 주세요.');return;}
    msg('rank-status','');
    const loading=document.createElement('li');loading.textContent='랭킹 불러오는 중…';$('rank-list').append(loading);
    try{
      const res=await fetch(url+'/rest/v1/jjongi_scores?select=nickname,score&order=score.desc,created_at.asc&limit=10',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const rows=await res.json();$('rank-list').replaceChildren();
      if(!rows.length){const li=document.createElement('li');li.textContent='첫 번째 랭커가 되어줘! 🐶';$('rank-list').append(li);}
      rows.forEach((item,i)=>{const li=document.createElement('li');const name=safe(['🥇','🥈','🥉'][i]||String(i+1));name.textContent+='  '+item.nickname;const score=safe(Number(item.score).toLocaleString('ko-KR')+'점');li.append(name,score);$('rank-list').append(li);});
    }catch(e){$('rank-list').replaceChildren();msg('rank-status','랭킹을 불러오지 못했어. DB 주소·키·테이블 설정을 확인해줘.');}
  }
  let sending=false;
  async function submit(){
    if(sending)return;
    const name=$('rank-name').value.trim();const points=Number($('final-score').textContent.replace(/[^0-9]/g,''));
    if(!name||name.length>12){msg('rank-message','닉네임을 1~12글자로 적어줘!');return;}
    if(!ready){msg('rank-message','DB 연결 설정이 필요해. README를 확인해줘.');return;}
    if(!Number.isInteger(points)||points<0||points>20000){msg('rank-message','점수를 확인할 수 없어.');return;}
    sending=true;$('rank-submit-btn').disabled=true;msg('rank-message','기록 등록 중…');
    try{
      const res=await fetch(url+'/rest/v1/jjongi_scores',{method:'POST',headers:{...headers,'Prefer':'return=minimal'},body:JSON.stringify({nickname:name,score:points})});
      if(!res.ok)throw new Error('HTTP '+res.status);
      msg('rank-message','등록 완료! 🏆');openRank();
    }catch(e){msg('rank-message','등록 실패: DB 연결과 설정을 확인해줘.');}
    finally{sending=false;$('rank-submit-btn').disabled=false;}
  }
  $('rank-start').addEventListener('click',e=>{e.stopPropagation();openRank();});
  $('rank-end').addEventListener('click',e=>{e.stopPropagation();openRank();});
  $('rank-close').addEventListener('click',e=>{e.stopPropagation();$('rank-modal').classList.add('is-hidden');});
  $('rank-refresh').addEventListener('click',openRank);
  $('rank-submit-btn').addEventListener('click',e=>{e.stopPropagation();submit();});
  $('rank-modal').addEventListener('pointerdown',e=>e.stopPropagation());
  $('rank-name').value=(localStorage.getItem('jjongi_nickname')||'');
  $('rank-name').addEventListener('change',()=>localStorage.setItem('jjongi_nickname',$('rank-name').value.trim()));
})();
