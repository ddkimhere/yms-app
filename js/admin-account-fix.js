/* YMS admin account creation -> Firebase Authentication + users/{uid} */
(function(){
  'use strict';

  function norm(v){ return String(v||'').trim().toLowerCase(); }
  function loginEmail(id){ return `${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`; }

  function encodeVal(v){
    if(v===null||v===undefined) return {nullValue:null};
    if(Array.isArray(v)) return {arrayValue:{values:v.map(encodeVal)}};
    if(typeof v==='boolean') return {booleanValue:v};
    if(typeof v==='number') return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
    if(typeof v==='object') return {mapValue:{fields:encodeFields(v)}};
    return {stringValue:String(v)};
  }
  function encodeFields(obj){
    const fields={};
    Object.entries(obj||{}).forEach(([k,v])=>{ if(v!==undefined) fields[k]=encodeVal(v); });
    return fields;
  }

  async function ensureFirebaseConfig(){
    if(window.YMS_FIREBASE_CONFIG) return window.YMS_FIREBASE_CONFIG;
    await new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[src$="js/firebase-config.js"]');
      if(existing){
        const wait=()=>window.YMS_FIREBASE_CONFIG?resolve():setTimeout(wait,40);
        wait();
        setTimeout(()=>reject(new Error('Firebase 설정을 불러오지 못했습니다')),4000);
        return;
      }
      const s=document.createElement('script');
      s.src='js/firebase-config.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Firebase 설정 파일 로드 실패'));
      document.head.appendChild(s);
    });
    if(!window.YMS_FIREBASE_CONFIG) throw new Error('Firebase 설정이 없습니다');
    return window.YMS_FIREBASE_CONFIG;
  }

  async function ensureFreshAdminToken(){
    // _tFetch 내부가 필요하면 토큰을 갱신하므로 가벼운 읽기를 한 번 거친다.
    try{ await window._tFetch('tables/users?limit=1'); }catch{}
    const token=window.YMS_Auth?.getToken?.();
    if(!token) throw new Error('관리자 로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
    return token;
  }

  async function createOrResolveAuthUser(loginId,password){
    const cfg=await ensureFirebaseConfig();
    const email=loginEmail(loginId);
    if(email==='@yms.local') throw new Error('사용할 수 없는 아이디입니다');

    let res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password,returnSecureToken:true})
    });
    let json=await res.json().catch(()=>({}));

    if(!res.ok && json?.error?.message==='EMAIL_EXISTS'){
      // 이전 저장 실패로 Auth 계정만 만들어진 경우 같은 비밀번호로 UID를 복구한다.
      res=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password,returnSecureToken:true})
      });
      json=await res.json().catch(()=>({}));
      if(!res.ok){
        throw new Error('이미 존재하는 아이디입니다. 기존 비밀번호가 다르면 다른 아이디를 사용해주세요.');
      }
    } else if(!res.ok){
      const code=json?.error?.message||`HTTP ${res.status}`;
      const friendly={
        WEAK_PASSWORD:'비밀번호는 6자리 이상으로 입력해주세요.',
        INVALID_EMAIL:'아이디 형식이 올바르지 않습니다.',
        OPERATION_NOT_ALLOWED:'Firebase 이메일/비밀번호 로그인이 비활성화되어 있습니다.'
      }[code];
      throw new Error(friendly||code);
    }
    return {uid:json.localId,email};
  }

  async function writeExactUserProfile(uid,profile){
    const cfg=await ensureFirebaseConfig();
    const token=await ensureFreshAdminToken();
    const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const res=await fetch(url,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({fields:encodeFields(profile)})
    });
    if(!res.ok){
      const txt=await res.text().catch(()=>`HTTP ${res.status}`);
      throw new Error(`사용자 프로필 저장 실패 (${res.status}) ${txt}`);
    }
    return {id:uid,...profile};
  }

  async function linkStudent(savedUser,role,name){
    if(role!=='STUDENT') return;
    const classSel=document.getElementById('acctClassSelect');
    const opt=classSel?.options[classSel.selectedIndex];
    const stuPayload={
      name,
      grade:document.getElementById('acctGrade')?.value.trim()||'',
      schoolName:document.getElementById('acctSchoolName')?.value.trim()||'',
      className:opt?.dataset.name||'',
      teacherName:opt?.dataset.teacher||'',
      levelCode:opt?.dataset.level||'',
      classId:classSel?.value||'',
      isActive:true,
      userId:savedUser.id
    };
    const linkedId=document.getElementById('acctLinkedStudentId')?.value||'';
    const stuRes=linkedId
      ? await _tFetch(`tables/students/${linkedId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(stuPayload)})
      : await _tFetch('tables/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stuPayload)});
    if(!stuRes.ok) throw new Error(`학생 프로필 저장 실패 (HTTP ${stuRes.status})`);
    const student=await stuRes.json();
    const studentId=linkedId||student.id;
    if(studentId){
      await _tFetch(`tables/users/${savedUser.id}`,{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId})
      });
    }
  }

  async function linkParent(savedUser,childIds){
    if(!childIds.length) return;
    await Promise.allSettled(childIds.map(id=>_tFetch(`tables/students/${id}`,{
      method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:savedUser.id})
    })));
  }

  window.addEventListener('load',()=>{
    if(!location.pathname.endsWith('/admin.html')) return;
    if(typeof window.submitAcctForm!=='function') return;

    window.submitAcctForm=async function(e){
      e.preventDefault();
      const editId=document.getElementById('acctEditId').value;
      const isEdit=!!editId;
      const role=document.getElementById('acctRole').value;
      const loginId=norm(document.getElementById('acctLoginId').value);
      const name=document.getElementById('acctName').value.trim();
      const pw=document.getElementById('acctPassword').value.trim();

      if(!loginId){YMS_UI.toast('❌ 아이디를 입력해주세요');return;}
      if(!name){YMS_UI.toast('❌ 이름을 입력해주세요');return;}
      if(!isEdit && !pw){YMS_UI.toast('❌ 비밀번호를 입력해주세요');return;}
      if(!isEdit && Array.isArray(window._acctList) && _acctList.some(u=>norm(u.loginId)===loginId)){
        YMS_UI.toast('❌ 이미 사용 중인 아이디입니다');return;
      }

      const payload={
        loginId,
        name,
        role,
        roles:[role],
        phone:document.getElementById('acctPhone').value.trim(),
        academyId:'ac-001',
        isActive:true,
        childIds:document.getElementById('acctChildIds').value.trim(),
        studentId:document.getElementById('acctStudentId').value.trim(),
        teacherClasses:document.getElementById('acctTeacherClasses').value.trim(),
        memo:document.getElementById('acctMemo').value.trim()
      };

      const btn=document.querySelector('#acctForm button[type="submit"]');
      if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{
        let savedUser;
        if(isEdit){
          const res=await _tFetch(`tables/users/${editId}`,{
            method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
          });
          if(!res.ok) throw new Error(`HTTP ${res.status}`);
          savedUser={id:editId,...payload};
        }else{
          const auth=await createOrResolveAuthUser(loginId,pw);
          savedUser=await writeExactUserProfile(auth.uid,{...payload,email:auth.email});
        }

        await linkStudent(savedUser,role,name);
        if(role==='PARENT'){
          const childIds=payload.childIds.split(',').map(v=>v.trim()).filter(Boolean);
          await linkParent(savedUser,childIds);
        }

        if(isEdit && pw){
          YMS_UI.toast('✅ 계정 정보 수정 완료 · 비밀번호 변경은 별도 기능으로 추가할게요');
        }else{
          YMS_UI.toast(isEdit?'✅ 계정이 수정되었습니다':`✅ ${name} 로그인 계정이 생성되었습니다`);
        }
        document.getElementById('acctPanel').classList.add('hidden');
        document.getElementById('acctForm').reset();
        if(typeof loadAccounts==='function') await loadAccounts();
        if(typeof loadAllData==='function') await loadAllData();
      }catch(err){
        console.error('[YMS] 계정 생성 실패',err);
        YMS_UI.toast('❌ 계정 저장 실패: '+(err?.message||'알 수 없는 오류'));
      }finally{
        if(btn){btn.disabled=false;btn.textContent='저장';}
      }
    };
  });
})();
