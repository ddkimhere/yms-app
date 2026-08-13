/* YMS account ID migration for edited Firebase accounts */
(function(){
  'use strict';
  const norm=v=>String(v||'').trim().toLowerCase();
  const emailFor=id=>`${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`;

  async function cfg(){
    if(window.YMS_FIREBASE_CONFIG) return window.YMS_FIREBASE_CONFIG;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src='js/firebase-config.js';
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return window.YMS_FIREBASE_CONFIG;
  }

  function enc(v){
    if(v===null||v===undefined)return {nullValue:null};
    if(Array.isArray(v))return {arrayValue:{values:v.map(enc)}};
    if(typeof v==='boolean')return {booleanValue:v};
    if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
    if(typeof v==='object'){const f={};Object.entries(v).forEach(([k,x])=>f[k]=enc(x));return {mapValue:{fields:f}};}
    return {stringValue:String(v)};
  }
  const fields=o=>{const f={};Object.entries(o||{}).forEach(([k,v])=>{if(v!==undefined)f[k]=enc(v)});return f;};

  async function createAuth(loginId,password){
    const c=await cfg();
    const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(c.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:emailFor(loginId),password,returnSecureToken:true})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){
      if(j?.error?.message==='EMAIL_EXISTS') throw new Error('이미 존재하는 아이디입니다.');
      if(j?.error?.message?.startsWith('WEAK_PASSWORD')) throw new Error('비밀번호는 6자리 이상이어야 합니다.');
      throw new Error(j?.error?.message||'Firebase 계정 생성 실패');
    }
    return {uid:j.localId,email:emailFor(loginId)};
  }

  async function writeUser(uid,profile){
    const c=await cfg();
    const token=window.YMS_Auth?.getToken?.();
    if(!token) throw new Error('관리자 로그인이 만료되었습니다. 다시 로그인해주세요.');
    const url=`https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({fields:fields(profile)})});
    if(!r.ok) throw new Error('새 계정 프로필 저장 실패');
  }

  async function relinkChildren(oldUid,newUid,childIds){
    for(const id of childIds){
      await _tFetch(`tables/students/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:newUid})});
    }
  }

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;
    const form=document.getElementById('acctForm');
    if(!form) return;

    form.addEventListener('submit',async function migrationGuard(e){
      const editId=document.getElementById('acctEditId')?.value||'';
      if(!editId) return;
      const old=(window._acctList||[]).find(u=>u.id===editId);
      if(!old) return;
      const newLogin=norm(document.getElementById('acctLoginId')?.value);
      if(!newLogin || newLogin===norm(old.loginId)) return;

      e.preventDefault(); e.stopImmediatePropagation();
      const pw=document.getElementById('acctPassword')?.value.trim()||'';
      if(!pw){YMS_UI.toast('❌ 아이디 변경 시 새 비밀번호도 입력해주세요');return;}

      const role=document.getElementById('acctRole')?.value||old.role||'PARENT';
      const rawChild=document.getElementById('acctChildIds')?.value||old.childIds||'';
      const childIds=Array.isArray(rawChild)?rawChild:String(rawChild).split(',').map(v=>v.trim()).filter(Boolean);
      const profile={
        ...old,
        loginId:newLogin,
        email:emailFor(newLogin),
        name:document.getElementById('acctName')?.value.trim()||old.name||'',
        role,
        roles:[role],
        phone:document.getElementById('acctPhone')?.value.trim()||'',
        childIds,
        isActive:true
      };
      delete profile.id; delete profile.created_at; delete profile.updated_at;

      try{
        const auth=await createAuth(newLogin,pw);
        await writeUser(auth.uid,profile);
        if(role==='PARENT') await relinkChildren(editId,auth.uid,childIds);
        await _tFetch(`tables/users/${editId}`,{method:'DELETE'});
        YMS_UI.toast('✅ 새 아이디로 로그인 계정이 변경되었습니다');
        document.getElementById('acctPanel')?.classList.add('hidden');
        form.reset();
        if(typeof loadAccounts==='function') await loadAccounts();
        if(typeof loadAllData==='function') await loadAllData();
      }catch(err){
        console.error('[YMS] 계정 아이디 변경 실패',err);
        YMS_UI.toast('❌ 아이디 변경 실패: '+(err?.message||'알 수 없는 오류'));
      }
    },true);
  });
})();