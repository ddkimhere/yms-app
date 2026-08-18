/* YMS admin/teacher compatibility patches */
(function(){
'use strict';
const has=(u,r)=>window.YMS_Roles?.has?YMS_Roles.has(u,r):[u?.role,...(Array.isArray(u?.roles)?u.roles:[])].map(x=>String(x||'').toUpperCase()).includes(r);
const norm=v=>String(v||'').trim().toLowerCase();
const str=v=>String(v||'').trim();

function assignedClasses(u){
  return (Array.isArray(u?.teacherClasses)?u.teacherClasses:String(u?.teacherClasses||'').split(','))
    .map(str).filter(Boolean);
}

function strictTeacherClasses(classes,u){
  const assigned=assignedClasses(u);
  const uid=str(u?.id||u?.uid);
  const uname=norm(u?.name);

  // Explicit account assignment is authoritative when present.
  if(assigned.length){
    const set=new Set(assigned);
    return classes.filter(c=>set.has(str(c.id||c.classId))||set.has(str(c.className)));
  }

  // Otherwise prefer an exact teacher UID relationship.
  if(uid){
    const byId=classes.filter(c=>str(c.teacherId)===uid);
    if(byId.length) return byId;
  }

  // Legacy fallback only when no explicit assignment/UID relationship exists.
  return uname?classes.filter(c=>norm(c.teacherName)===uname):[];
}

async function teacherScope(){
  if(!location.pathname.endsWith('/teacher-home.html'))return;
  const u=YMS_Auth?.getUser?.();if(!u||!has(u,'TEACHER'))return;
  try{
    const [a,b]=await Promise.all([_tFetch('tables/classes?limit=200',{cache:'no-store'}),_tFetch('tables/students?limit=500',{cache:'no-store'})]);
    const cs=a.ok?(await a.json()).data||[]:[],ss=b.ok?(await b.json()).data||[]:[];
    _myClasses=strictTeacherClasses(cs,u);
    const ids=new Set(_myClasses.map(c=>str(c.id||c.classId)).filter(Boolean));
    const names=new Set(_myClasses.map(c=>str(c.className)).filter(Boolean));
    _myStudents=ss.filter(s=>ids.has(str(s.classId))||names.has(str(s.className)));
    const g=document.getElementById('greetName'),sub=document.getElementById('greetSub');
    if(g)g.textContent=(u.name||'선생님')+' 선생님, 안녕하세요 👋';
    if(sub)sub.textContent='내 담당 수업과 학생 현황만 보여드려요.';
    if(typeof renderTeacherHome==='function')renderTeacherHome();
    document.querySelectorAll('a[href="homework.html"]').forEach(a=>a.href='homework.html?mode=teacher');
  }catch(e){console.warn('[YMS] teacher scope failed',e);}
}

window.YMS_strictTeacherClasses=strictTeacherClasses;

window.addEventListener('load',()=>{
  if(location.pathname.endsWith('/teacher-home.html')){teacherScope();setTimeout(teacherScope,250);setTimeout(teacherScope,900);return;}
  if(!location.pathname.endsWith('/admin.html'))return;
  try{
    if(typeof renderTeacherTable==='function')window.renderTeacherTable=function(){
      const tb=document.getElementById('teacherTableBody');if(!tb)return;const ts=_allUsers.filter(u=>has(u,'TEACHER'));
      if(!ts.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--gray-mid);">등록된 선생님이 없습니다</td></tr>';return;}
      tb.innerHTML=ts.map(t=>{const cs=_allClasses.filter(c=>c.teacherName===t.name||c.teacherId===t.id),cl=cs.length?cs.map(c=>c.className).join(', '):(Array.isArray(t.teacherClasses)?t.teacherClasses.join(', '):(t.teacherClasses||'-')),dual=has(t,'ADMIN')&&has(t,'TEACHER')?'<span class="chip chip-blue" style="font-size:10px;margin-left:6px;">관리자 겸임</span>':'';return `<tr><td><strong>${t.name||'-'}</strong>${dual}</td><td><code style="font-size:11px;background:#f5f5f5;padding:2px 6px;border-radius:4px;">${t.loginId||'-'}</code></td><td>${t.phone||'-'}</td><td>${cl}</td><td><span class="chip chip-green">활성</span></td></tr>`;}).join('');
    };
    if(typeof populateTeacherDropdown==='function')window.populateTeacherDropdown=function(){const s=document.getElementById('clsTeacherSelect');if(!s)return;const ts=_allUsers.filter(u=>has(u,'TEACHER'));s.innerHTML='<option value="">— 선생님 선택 —</option>'+ts.map(t=>`<option value="${t.name||''}" data-id="${t.id||''}">${t.name||'-'}${t.phone?' ('+t.phone+')':''}</option>`).join('');};
    if(typeof submitClassForm==='function')window.submitClassForm=async function(e){
      e.preventDefault();const id=document.getElementById('classEditId').value,name=document.getElementById('clsName').value.trim();if(!name){YMS_UI.toast('❌ 반 이름을 입력해주세요');return;}
      const p={className:name,subject:document.getElementById('clsSubject').value.trim(),teacherName:document.getElementById('clsTeacher').value.trim(),teacherId:document.getElementById('clsTeacherId').value.trim(),startTime:document.getElementById('clsStart').value,endTime:document.getElementById('clsEnd').value,tuitionFee:Number(document.getElementById('clsFee').value)||0,isActive:true};
      const btn=document.querySelector('#classMgmtForm button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{const r=await _tFetch(id?`tables/classes/${id}`:'tables/classes',{method:id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});if(!r.ok)throw new Error('HTTP '+r.status);YMS_UI.toast(id?'✅ 반 정보가 수정되었습니다':'✅ 반이 추가되었습니다');document.getElementById('classMgmtPanel').classList.add('hidden');document.getElementById('classMgmtForm').reset();await loadClassesMgmt();if(typeof loadAllData==='function')await loadAllData();}catch(err){YMS_UI.toast('❌ 저장 실패: '+(err?.message||'오류'));}finally{if(btn){btn.disabled=false;btn.textContent='저장';}}
    };
    const refresh=()=>{const e=document.getElementById('dashTeachers');if(e&&typeof _allUsers!=='undefined')e.textContent=_allUsers.filter(u=>has(u,'TEACHER')).length;};setTimeout(refresh,500);setTimeout(refresh,1500);
  }catch(e){console.warn('[YMS] compatibility patch failed',e);}
});
})();