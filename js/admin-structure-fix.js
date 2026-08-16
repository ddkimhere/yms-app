/* YMS admin structure: navigation groups + student account visibility */
(function(){
  'use strict';

  const norm=v=>String(v||'').trim().toLowerCase();
  const normName=v=>norm(v).replace(/[\s·._-]+/g,'');
  const normRole=v=>{
    const r=String(v||'').trim().replace(/^[^A-Za-z가-힣]+/,'').trim().toUpperCase();
    if(r==='학생') return 'STUDENT';
    if(r==='학부모') return 'PARENT';
    if(r==='선생님'||r==='교사') return 'TEACHER';
    if(r==='관리자') return 'ADMIN';
    return r;
  };
  function roleList(u){
    const primary=normRole(u?.role);
    const raw=u?.roles;
    const extras=Array.isArray(raw)
      ? raw
      : String(raw||'').split(',').map(v=>v.trim()).filter(Boolean);
    return [...new Set([primary,...extras.map(normRole)].filter(Boolean))];
  }
  function isStudentUser(u){
    return u?.isActive!==false && roleList(u).includes('STUDENT');
  }

  function matchStudent(s,u){
    if(!s||!u) return '';
    const sid=String(s.id||'').trim();
    const suid=String(s.userId||'').trim();
    const uid=String(u.id||u.uid||'').trim();
    const linked=String(u.studentId||'').trim();
    const sn=normName(s.name),un=normName(u.name);
    if(uid && suid===uid) return 'USER_ID';
    if(linked && sid===linked){
      if(!sn || !un || sn===un) return 'STUDENT_ID';
      return '';
    }
    if(sn && un && sn===un) return 'NAME';
    return '';
  }

  function mergeStudentUsers(users){
    try{
      if(typeof _allStudents==='undefined'||!Array.isArray(_allStudents)) return;
      const source=Array.isArray(users)?users:(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)?_allUsers:[]);
      const studentUsers=source.filter(isStudentUser);

      studentUsers.forEach(u=>{
        let idx=-1,match='';
        for(let i=0;i<_allStudents.length;i++){
          const m=matchStudent(_allStudents[i],u);
          if(m){idx=i;match=m;break;}
        }
        if(idx>=0){
          const old=_allStudents[idx]||{};
          _allStudents[idx]={
            ...old,
            userId:u.id||u.uid||old.userId||'',
            id:old.id||u.studentId||('account-'+(u.id||u.uid||Date.now())),
            name:(u.name||old.name||u.loginId||'학생'),
            grade:u.grade||old.grade||'',
            schoolName:u.schoolName||old.schoolName||'',
            className:u.className||old.className||'',
            teacherName:u.teacherName||old.teacherName||'',
            classId:u.classId||old.classId||'',
            isActive:true,
            _accountStudent:true,
            _accountMatch:match
          };
          return;
        }
        const uid=String(u.id||u.uid||'').trim();
        _allStudents.push({
          id:'account-'+(uid||Math.random().toString(36).slice(2)),
          linkedStudentId:u.studentId||'',
          userId:uid,
          name:u.name||u.loginId||'학생',
          grade:u.grade||'',
          schoolName:u.schoolName||'',
          className:u.className||'',
          teacherName:u.teacherName||'',
          classId:u.classId||'',
          isActive:true,
          _virtualStudent:true,
          _accountStudent:true,
          _linkNeedsRepair:!!u.studentId
        });
      });

      const seenUsers=new Set(),seenStudents=new Set(),deduped=[];
      _allStudents.forEach(s=>{
        const uk=String(s.userId||'').trim();
        const sk=String(s.id||'').trim();
        if(uk&&seenUsers.has(uk)) return;
        if(sk&&seenStudents.has(sk)) return;
        if(uk)seenUsers.add(uk);
        if(sk)seenStudents.add(sk);
        deduped.push(s);
      });
      _allStudents.splice(0,_allStudents.length,...deduped);
    }catch(err){console.warn('[YMS] 학생 목록 병합 실패',err);}
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function ensureAccountRows(users){
    const tbody=document.getElementById('studentTableBody');
    if(!tbody) return;
    const source=Array.isArray(users)?users:(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)?_allUsers:[]);
    const textNames=new Set(Array.from(tbody.querySelectorAll('tr')).map(tr=>normName(tr.querySelector('td strong')?.textContent||'' )).filter(Boolean));
    source.filter(isStudentUser).forEach(u=>{
      const nk=normName(u.name||u.loginId);
      if(!nk||textNames.has(nk)) return;
      const linked=(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents))
        ? _allStudents.find(s=>String(s.userId||'')===String(u.id||u.uid||'') || (u.studentId&&String(s.id||'')===String(u.studentId)) || normName(s.name)===nk)
        : null;
      const s={...u,...linked,name:u.name||linked?.name||u.loginId||'학생',isActive:true};
      const tr=document.createElement('tr');
      tr.dataset.ymsAccountFallback='1';
      tr.innerHTML=`
        <td><strong>${esc(s.name)}</strong><div style="font-size:10px;color:#8A96B2;margin-top:3px;">${esc(s.grade||'-')} · ${esc(s.schoolName||'-')}</div></td>
        <td>${esc(s.className||'미지정')}<div style="font-size:10px;color:#8A96B2;margin-top:3px;">${esc(s.teacherName||'담당 없음')}</div></td>
        <td><span style="font-size:11px;color:#9AA5BD;">기록 없음</span></td>
        <td><span style="display:inline-flex;min-width:28px;justify-content:center;padding:4px 8px;border-radius:999px;background:#EAF7F1;color:#23774F;font-size:11px;font-weight:850;">0회</span></td>
        <td><span style="font-size:11px;color:#9AA5BD;">미입력</span></td>
        <td><button class="btn btn-outline btn-sm" type="button" onclick="switchSection('accounts',document.getElementById('nav-accounts'));setTimeout(()=>{if(typeof openEditAcct==='function')openEditAcct('${esc(u.id||u.uid||'')}')},100)">계정 정보</button></td>`;
      tbody.appendChild(tr);
      textNames.add(nk);
    });
  }

  async function syncStudentUsers(){
    try{
      const [ur,sr]=await Promise.all([
        _tFetch('tables/users?limit=1000',{cache:'no-store'}),
        _tFetch('tables/students?limit=1000',{cache:'no-store'})
      ]);
      const users=ur.ok?((await ur.json()).data||[]):[];
      const students=sr.ok?((await sr.json()).data||[]):[];
      if(typeof _allUsers!=='undefined'&&Array.isArray(_allUsers)&&ur.ok) _allUsers.splice(0,_allUsers.length,...users);
      if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents)&&sr.ok) _allStudents.splice(0,_allStudents.length,...students);
      mergeStudentUsers(users);
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
      setTimeout(()=>ensureAccountRows(users),0);
      return true;
    }catch(err){
      console.warn('[YMS] 학생/계정 동기화 실패',err);
      mergeStudentUsers();
      if(typeof window.renderStudentTable==='function') window.renderStudentTable();
      setTimeout(()=>ensureAccountRows(),0);
      return false;
    }
  }
  window.YMS_syncStudentUsers=syncStudentUsers;

  function makeStudentsViewOnly(){
    const section=document.getElementById('section-students');
    if(!section) return;
    section.querySelectorAll('button').forEach(btn=>{
      const onclick=btn.getAttribute('onclick')||'';
      if(onclick.includes('showAddStudentPanel')) btn.remove();
    });
    document.getElementById('studentAddPanel')?.remove();
  }

  function groupTitle(text){
    const el=document.createElement('div');el.className='admin-nav-section';el.textContent=text;return el;
  }

  function organizeSidebar(){
    const nav=document.querySelector('#adminSidebar .admin-nav');
    if(!nav||nav.dataset.organized==='1') return;
    const dashboard=document.getElementById('nav-dashboard');
    const students=document.getElementById('nav-students');
    const oldClasses=document.getElementById('nav-classes');
    const realClasses=document.getElementById('nav-classes-mgmt');
    const teachers=document.getElementById('nav-teachers');
    const notices=document.getElementById('nav-notices');
    const attendance=document.getElementById('nav-attendance');
    const payments=document.getElementById('nav-payments');
    const counseling=document.getElementById('nav-counseling');
    const accounts=document.getElementById('nav-accounts');
    attendance?.remove();oldClasses?.remove();
    if(realClasses){realClasses.innerHTML='<span class="nav-icon">🏫</span> 반 관리';realClasses.setAttribute('onclick',"switchSection('classes-mgmt',this)");}
    if(notices){notices.innerHTML='<span class="nav-icon">📢</span> 공지 관리';notices.setAttribute('onclick',"_ymsGo('notices.html')");}
    nav.innerHTML='';if(dashboard)nav.appendChild(dashboard);nav.appendChild(groupTitle('수업 관리'));
    [students,realClasses,teachers].forEach(el=>{if(el)nav.appendChild(el);});nav.appendChild(groupTitle('운영 관리'));
    [notices,payments,counseling,accounts].forEach(el=>{if(el)nav.appendChild(el);});nav.dataset.organized='1';
  }

  function wrapStudentInit(){
    if(typeof window.initStudents!=='function'||window.initStudents.__structureWrapped) return;
    const original=window.initStudents;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      await syncStudentUsers();
      makeStudentsViewOnly();
      return result;
    };
    wrapped.__structureWrapped=true;window.initStudents=wrapped;
  }

  function run(){
    if(!location.pathname.endsWith('/admin.html')) return;
    organizeSidebar();makeStudentsViewOnly();mergeStudentUsers();wrapStudentInit();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',()=>{run();setTimeout(run,400);});
})();
