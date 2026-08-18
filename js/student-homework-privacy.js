/* YMS student/parent home homework privacy hardening */
(function(){
  'use strict';

  const path=location.pathname.split('/').pop()||'';
  if(path!=='student-home.html'&&path!=='parent-home.html') return;

  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;
  const role=String(user.role||'').trim().toUpperCase();
  if(role!=='STUDENT'&&role!=='PARENT') return;

  const str=v=>String(v||'').trim();
  const norm=v=>str(v).toLowerCase().replace(/[\s·._-]+/g,'');
  const upper=v=>str(v).toUpperCase();

  async function read(path){
    try{
      const r=await _tFetch(path,{cache:'no-store'});
      if(!r.ok)return null;
      const j=await r.json();
      return Array.isArray(j?.data)?j.data:j;
    }catch{return null;}
  }

  function isPersonal(h){
    return upper(h?.targetType)==='STUDENT'||!!str(h?.targetStudentId)||!!str(h?.targetStudentName);
  }

  function match(h,s){
    if(!s||h?.isVisible===false)return false;
    if(isPersonal(h)){
      const tid=str(h.targetStudentId);
      const ids=new Set([str(s.id),str(s.studentId),str(s.userId)].filter(Boolean));
      if(tid)return ids.has(tid);
      if(norm(h.targetStudentName)!==norm(s.name))return false;
      if(h.classId&&s.classId&&str(h.classId)!==str(s.classId))return false;
      if(h.className&&s.className&&norm(h.className)!==norm(s.className))return false;
      return true;
    }
    if(h.classId&&s.classId)return str(h.classId)===str(s.classId);
    return !!h.className&&!!s.className&&norm(h.className)===norm(s.className);
  }

  async function studentFromId(id){
    if(!id)return null;
    const s=await read('tables/students/'+encodeURIComponent(id));
    return s&&!Array.isArray(s)?s:null;
  }

  async function resolveStudents(){
    if(role==='PARENT'){
      const ids=Array.isArray(user.childIds)?user.childIds:String(user.childIds||'').split(',').map(str).filter(Boolean);
      const out=[];
      for(const id of ids){const s=await studentFromId(id);if(s)out.push(s);}
      return out;
    }

    let s=await studentFromId(user.studentId||user._tableId||'');
    if(s)return [s];
    const list=await read('tables/students?limit=1000');
    if(Array.isArray(list)){
      const uid=str(user.id||user.uid);
      s=list.find(x=>(uid&&str(x.userId)===uid)||(norm(x.name)&&norm(x.name)===norm(user.name)))||null;
    }
    return s?[s]:[];
  }

  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  async function fixStudentHome(students){
    if(path!=='student-home.html'||!students.length)return;
    const all=await read('tables/homework?limit=500');
    if(!Array.isArray(all))return;
    const list=all.filter(h=>students.some(s=>match(h,s)))
      .filter(h=>!h.dueAt||new Date(h.dueAt)-Date.now()>-86400000)
      .sort((a,b)=>new Date(a.dueAt||'2999-12-31')-new Date(b.dueAt||'2999-12-31'));

    const summary=document.getElementById('summaryHomework');
    if(summary)summary.textContent=`${list.length}개`;
    const dueEl=document.getElementById('summaryDue');
    const next=list.find(h=>h.dueAt);
    if(dueEl)dueEl.textContent=next?new Date(next.dueAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}):'-';

    const wrap=document.getElementById('hwList');
    if(!wrap)return;
    if(!list.length){wrap.innerHTML='<div class="empty-card">🎉 등록된 숙제가 없어요</div>';return;}
    wrap.innerHTML=list.slice(0,5).map(h=>{
      const due=h.dueAt?new Date(h.dueAt):null;
      const diff=due?Math.ceil((due-Date.now())/86400000):null;
      const badge=diff===null?'NEW':diff<0?'기한초과':diff===0?'오늘마감':`D-${diff}`;
      const tone=diff===null?'#7492D5':diff<0?'#E04040':diff<=1?'#E8A020':'#2E9E6B';
      const target=isPersonal(h)?`👤 ${esc(h.targetStudentName||'개인')} · `:'';
      return `<div class="homework-card"><div class="hw-top"><div class="hw-main"><div class="hw-title">${esc(h.title||'제목 없음')}</div><div class="hw-meta">${target}${esc(h.className||'')}${h.teacherName?' · '+esc(h.teacherName)+' 선생님':''}</div>${h.content?`<div class="hw-content">${esc(h.content)}</div>`:''}</div><span class="hw-badge" style="color:${tone};background:${tone}14;border:1px solid ${tone}33">${badge}</span></div>${due?`<div class="hw-due">📅 마감 ${due.toLocaleDateString('ko-KR',{month:'long',day:'numeric'})}</div>`:''}</div>`;
    }).join('');
  }

  async function fixHomeWidget(students){
    if(!students.length)return;
    const all=await read('tables/homework?limit=500');
    if(!Array.isArray(all))return;
    const list=all.filter(h=>students.some(s=>match(h,s)));
    const now=Date.now();
    const soon=list.filter(h=>{const t=new Date(h.dueAt||'').getTime();return Number.isFinite(t)&&t>=now&&t-now<=2*86400000;});
    const cards=[...document.querySelectorAll('#ymsWidgetGrid .yms-widget-card')];
    cards.forEach(card=>{
      const label=card.querySelector('.yms-widget-label')?.textContent?.trim();
      const value=card.querySelector('.yms-widget-value');
      if(!value)return;
      if(label==='내 숙제'||label==='최근 숙제')value.textContent=String(list.length);
      if(label==='마감 임박')value.textContent=String(soon.length);
    });
  }

  async function run(){
    const students=await resolveStudents();
    await fixStudentHome(students);
    setTimeout(()=>fixHomeWidget(students),150);
    setTimeout(()=>fixHomeWidget(students),700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,50));
  else setTimeout(run,50);
  window.addEventListener('pageshow',()=>setTimeout(run,80));
})();
