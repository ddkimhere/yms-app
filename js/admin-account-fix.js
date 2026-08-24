/* YMS admin account management -> Firebase Authentication + users/{uid} */
(function(){
  'use strict';
  const READING_N_FEE=10000;

  function norm(v){return String(v||'').trim().toLowerCase();}
  function loginEmail(id){return `${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`;}
  function encodeVal(v){if(v===null||v===undefined)return{nullValue:null};if(Array.isArray(v))return{arrayValue:{values:v.map(encodeVal)}};if(typeof v==='boolean')return{booleanValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(typeof v==='object')return{mapValue:{fields:encodeFields(v)}};return{stringValue:String(v)};}
  function encodeFields(obj){const fields={};Object.entries(obj||{}).forEach(([k,v])=>{if(v!==undefined)fields[k]=encodeVal(v);});return fields;}

  // Student-only UI is owned by admin-student-tuition-ui.js.
  // Keeping account saving separate prevents new/edit forms from diverging.
  function ensureStudentExtrasReady(){
    if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='STUDENT')return;
    const row=document.getElementById('acctStudentRow');if(row)row.style.display='';
    if(!document.getElementById('acctStartDate')||!document.getElementById('acctTuitionDueDay')||!document.querySelector('input[name="acctVehicleUse"]')||!document.querySelector('input[name="acctReadingNUse"]')){
      throw new Error('학생 추가 정보 화면을 불러오지 못했습니다. 창을 닫고 다시 열어주세요.');
    }
  }

  async function ensureFirebaseConfig(){
    if(window.YMS_FIREBASE_CONFIG)return window.YMS_FIREBASE_CONFIG;
    await new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[src$="js/firebase-config.js"]');
      if(existing){const started=Date.now();const wait=()=>{if(window.YMS_FIREBASE_CONFIG)return resolve();if(Date.now()-started>4000)return reject(new Error('Firebase 설정을 불러오지 못했습니다'));setTimeout(wait,40);};wait();return;}
      const s=document.createElement('script');s.src='js/firebase-config.js';s.onload=resolve;s.onerror=()=>reject(new Error('Firebase 설정 파일 로드 실패'));document.head.appendChild(s);
    });
    if(!window.YMS_FIREBASE_CONFIG)throw new Error('Firebase 설정이 없습니다');
    return window.YMS_FIREBASE_CONFIG;
  }
  async function ensureFreshAdminToken(){try{await window._tFetch('tables/users?limit=1');}catch{}const token=window.YMS_Auth?.getToken?.();if(!token)throw new Error('관리자 로그인 정보가 만료되었습니다. 다시 로그인해주세요.');return token;}
  async function createAuthUser(loginId,password,{allowExisting=false}={}){
    const cfg=await ensureFirebaseConfig(),email=loginEmail(loginId);if(email==='@yms.local')throw new Error('사용할 수 없는 아이디입니다');
    let res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});
    let json=await res.json().catch(()=>({}));
    if(!res.ok&&json?.error?.message==='EMAIL_EXISTS'){
      if(!allowExisting)throw new Error('이미 존재하는 아이디입니다.');
      res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});json=await res.json().catch(()=>({}));if(!res.ok)throw new Error('이미 존재하는 아이디입니다. 기존 비밀번호가 다르면 다른 아이디를 사용해주세요.');
    }else if(!res.ok){const code=json?.error?.message||`HTTP ${res.status}`;if(String(code).startsWith('WEAK_PASSWORD'))throw new Error('비밀번호는 6자리 이상으로 입력해주세요.');throw new Error(({INVALID_EMAIL:'아이디 형식이 올바르지 않습니다.',OPERATION_NOT_ALLOWED:'Firebase 이메일/비밀번호 로그인이 비활성화되어 있습니다.'}[code])||code);}
    return{uid:json.localId,email};
  }
  async function writeExactUserProfile(uid,profile){const cfg=await ensureFirebaseConfig(),token=await ensureFreshAdminToken();const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;const res=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({fields:encodeFields(profile)})});if(!res.ok){const txt=await res.text().catch(()=>`HTTP ${res.status}`);throw new Error(`사용자 프로필 저장 실패 (${res.status}) ${txt}`);}return{id:uid,...profile};}
  async function getUserProfile(uid){if(!uid)return null;try{const r=await _tFetch(`tables/users/${encodeURIComponent(uid)}`,{cache:'no-store'});return r.ok?await r.json():null;}catch{return null;}}
  async function getAllUsers(){try{const r=await _tFetch('tables/users?limit=1000',{cache:'no-store'});return r.ok?((await r.json()).data||[]):[];}catch{return[];}}

  async function relinkForNewUid(oldUid,newUid,role,childIds,linkedStudentId){
    if(role==='PARENT'&&childIds.length)await Promise.all(childIds.map(id=>_tFetch(`tables/students/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:newUid})})));
    if(role==='STUDENT'){let sid=linkedStudentId||'';if(!sid){const user=await getUserProfile(oldUid);sid=user?.studentId||'';}if(sid){const r=await _tFetch(`tables/students/${sid}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:newUid})});if(!r.ok)throw new Error(`학생 계정 연결 갱신 실패 (HTTP ${r.status})`);}}
  }

  async function linkStudent(savedUser,role,name,isEdit){
    if(role!=='STUDENT')return;ensureStudentExtrasReady();
    const classSel=document.getElementById('acctClassSelect'),opt=classSel?.options[classSel.selectedIndex];
    const tuitionCoreAmount=Math.max(0,Number(document.getElementById('acctTuitionBaseAmount')?.value)||0);
    const readingNUse=document.querySelector('input[name="acctReadingNUse"]:checked')?.value==='true',readingNFee=readingNUse?READING_N_FEE:0,tuitionBaseAmount=tuitionCoreAmount+readingNFee;
    const tuitionDiscountAmount=Math.min(tuitionBaseAmount,Math.max(0,Number(document.getElementById('acctTuitionDiscountAmount')?.value)||0)),tuitionDiscountReason=(document.getElementById('acctTuitionDiscountReason')?.value||'').trim();
    if(tuitionDiscountAmount>0&&!tuitionDiscountReason)throw new Error('할인 금액이 있으면 할인 사유를 입력해주세요.');
    const startDate=(document.getElementById('acctStartDate')?.value||'').trim();if(!startDate)throw new Error('수업 시작일을 입력해주세요.');
    const tuitionDueDay=Number(document.getElementById('acctTuitionDueDay')?.value||0);if(!(tuitionDueDay>=1&&tuitionDueDay<=31))throw new Error('수강료 납입일을 선택해주세요.');
    const vehicleUse=document.querySelector('input[name="acctVehicleUse"]:checked')?.value==='true';
    const stuPayload={name,grade:document.getElementById('acctGrade')?.value.trim()||'',schoolName:document.getElementById('acctSchoolName')?.value.trim()||'',className:opt?.dataset.name||'',teacherName:opt?.dataset.teacher||'',levelCode:opt?.dataset.level||'',classId:classSel?.value||'',startDate,tuitionDueDay,vehicleUse,readingNUse,readingNFee,tuitionCoreAmount,tuitionBaseAmount,tuitionDiscountAmount,tuitionDiscountReason,tuitionAmount:Math.max(0,tuitionBaseAmount-tuitionDiscountAmount),isActive:true,userId:savedUser.id};
    const linkedId=isEdit?(document.getElementById('acctLinkedStudentId')?.value||''):'';
    const stuRes=linkedId?await _tFetch(`tables/students/${linkedId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(stuPayload)}):await _tFetch('tables/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stuPayload)});
    if(!stuRes.ok)throw new Error(`학생 프로필 저장 실패 (HTTP ${stuRes.status})`);const student=await stuRes.json(),studentId=linkedId||student.id;
    if(studentId){const r=await _tFetch(`tables/users/${savedUser.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId})});if(!r.ok)throw new Error(`학생 계정 연결 저장 실패 (HTTP ${r.status})`);}
  }
  async function linkParent(savedUser,childIds){if(!childIds.length)return;await Promise.allSettled(childIds.map(id=>_tFetch(`tables/students/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:savedUser.id})})));}
  function bindAccountForm(){const form=document.getElementById('acctForm');if(!form||form.dataset.firebaseSubmitBound==='1')return;form.removeAttribute('onsubmit');form.onsubmit=null;form.addEventListener('submit',window.submitAcctForm);form.dataset.firebaseSubmitBound='1';}

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html'))return;
    window.submitAcctForm=async function(e){
      e?.preventDefault?.();
      const editId=(document.getElementById('acctEditId')?.value||'').trim(),isEdit=!!editId,oldUser=isEdit?await getUserProfile(editId):null;
      const role=document.getElementById('acctRole').value,loginId=norm(document.getElementById('acctLoginId').value),name=document.getElementById('acctName').value.trim(),pw=document.getElementById('acctPassword').value.trim(),loginChanged=!!(isEdit&&oldUser&&loginId!==norm(oldUser.loginId));
      if(!loginId){YMS_UI.toast('❌ 아이디를 입력해주세요');return;}if(!name){YMS_UI.toast('❌ 이름을 입력해주세요');return;}if((!isEdit||loginChanged)&&!pw){YMS_UI.toast(loginChanged?'❌ 아이디 변경 시 새 비밀번호도 입력해주세요':'❌ 비밀번호를 입력해주세요');return;}
      if(role==='STUDENT'){try{ensureStudentExtrasReady();}catch(err){YMS_UI.toast('❌ '+err.message);return;}}
      if(!isEdit||loginChanged){const users=await getAllUsers(),dup=users.some(u=>String(u.id||'')!==editId&&norm(u.loginId)===loginId);if(dup){YMS_UI.toast('❌ 이미 사용 중인 아이디입니다');return;}}
      if(!isEdit){const linked=document.getElementById('acctLinkedStudentId');if(linked)linked.value='';}
      const rawChild=(document.getElementById('acctChildIds')?.value||'').trim(),childIds=rawChild.split(',').map(v=>v.trim()).filter(Boolean);
      const payload={loginId,name,role,roles:[role],phone:(document.getElementById('acctPhone')?.value||'').trim(),academyId:'ac-001',isActive:true,childIds:rawChild,studentId:(document.getElementById('acctStudentId')?.value||'').trim(),teacherClasses:(document.getElementById('acctTeacherClasses')?.value||'').trim(),memo:(document.getElementById('acctMemo')?.value||'').trim()};
      const btn=document.querySelector('#acctForm button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{
        let savedUser;
        if(loginChanged){const auth=await createAuthUser(loginId,pw,{allowExisting:false}),profile={...payload,email:auth.email};savedUser=await writeExactUserProfile(auth.uid,profile);const linkedStudentId=(document.getElementById('acctLinkedStudentId')?.value||oldUser?.studentId||'').trim();await relinkForNewUid(editId,auth.uid,role,childIds,linkedStudentId);const del=await _tFetch(`tables/users/${editId}`,{method:'DELETE'});if(!del.ok)throw new Error(`기존 사용자 프로필 정리 실패 (HTTP ${del.status})`);}
        else if(isEdit){const res=await _tFetch(`tables/users/${editId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok){const msg=await res.text().catch(()=>`HTTP ${res.status}`);throw new Error(`계정 수정 실패 (${res.status}) ${msg}`);}savedUser={id:editId,...oldUser,...payload};}
        else{const auth=await createAuthUser(loginId,pw,{allowExisting:true});savedUser=await writeExactUserProfile(auth.uid,{...payload,email:auth.email});}
        await linkStudent(savedUser,role,name,isEdit||loginChanged);if(role==='PARENT'&&!loginChanged)await linkParent(savedUser,childIds);
        YMS_UI.toast(loginChanged?'✅ 새 아이디로 로그인 계정이 변경되었습니다':isEdit?'✅ 계정이 수정되었습니다':`✅ ${name} 로그인 계정이 생성되었습니다`);
        document.getElementById('acctPanel')?.classList.add('hidden');document.getElementById('acctForm')?.reset();if(typeof loadAccounts==='function')await loadAccounts();if(typeof loadAllData==='function')await loadAllData();if(typeof window.YMS_syncStudentUsers==='function')await window.YMS_syncStudentUsers();
      }catch(err){console.error('[YMS] 계정 저장 실패',err);YMS_UI.toast('❌ 계정 저장 실패: '+(err?.message||'알 수 없는 오류'));}
      finally{if(btn){btn.disabled=false;btn.textContent='저장';}}
    };
    bindAccountForm();setTimeout(bindAccountForm,200);
  });
})();
