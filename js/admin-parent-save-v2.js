/* YMS parent account save v2 — dedicated reliable parent flow */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const norm=v=>String(v||'').trim().toLowerCase();
  const loginEmail=id=>`${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`;
  const encodeVal=v=>{
    if(v===null||v===undefined)return{nullValue:null};
    if(Array.isArray(v))return{arrayValue:{values:v.map(encodeVal)}};
    if(typeof v==='boolean')return{booleanValue:v};
    if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
    if(typeof v==='object')return{mapValue:{fields:encodeFields(v)}};
    return{stringValue:String(v)};
  };
  const encodeFields=o=>{const f={};Object.entries(o||{}).forEach(([k,v])=>{if(v!==undefined)f[k]=encodeVal(v)});return f};

  async function config(){
    if(window.YMS_FIREBASE_CONFIG)return window.YMS_FIREBASE_CONFIG;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src='js/firebase-config.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    if(!window.YMS_FIREBASE_CONFIG)throw new Error('Firebase 설정을 불러오지 못했습니다.');
    return window.YMS_FIREBASE_CONFIG;
  }

  function childIds(){
    const checked=[...document.querySelectorAll('.yms-sibling-check:checked')].map(x=>String(x.value||'').trim()).filter(Boolean);
    if(checked.length)return [...new Set(checked)];
    const sel=document.getElementById('acctChildSelect');
    if(sel){
      const ids=[...sel.selectedOptions].map(o=>String(o.value||'').trim()).filter(Boolean);
      if(ids.length)return [...new Set(ids)];
    }
    return String(document.getElementById('acctChildIds')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  }

  async function createOrReuseAuth(loginId,password){
    const cfg=await config(),email=loginEmail(loginId);
    if(email==='@yms.local')throw new Error('아이디를 확인해주세요.');
    let r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
    });
    let j=await r.json().catch(()=>({}));
    if(r.ok)return{uid:j.localId,email};
    const code=j?.error?.message||'';
    if(String(code).startsWith('WEAK_PASSWORD'))throw new Error('비밀번호는 6자리 이상으로 입력해주세요.');
    if(code!=='EMAIL_EXISTS')throw new Error(code||`계정 생성 실패 (${r.status})`);
    r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
    });
    j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error('이미 같은 아이디의 계정이 있습니다. 기존 비밀번호가 다르면 다른 아이디를 사용해주세요.');
    return{uid:j.localId,email};
  }

  async function writeUser(uid,payload){
    const cfg=await config(),token=window.YMS_Auth?.getToken?.();
    if(!token)throw new Error('관리자 로그인 정보가 만료되었습니다. 다시 로그인해주세요.');
    const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({fields:encodeFields(payload)})});
    if(!r.ok){const t=await r.text().catch(()=>String(r.status));throw new Error(`학부모 계정 저장 실패 (${r.status}) ${t.slice(0,120)}`)}
  }

  async function linkChildren(uid,ids,phone){
    for(const sid of ids){
      const r=await window._tFetch(`tables/students/${encodeURIComponent(sid)}`,{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:uid,parentPhone:phone||''})
      });
      if(!r.ok)throw new Error(`자녀 연결 실패 (${r.status})`);
    }
  }

  async function saveParent(form){
    const editId=String(document.getElementById('acctEditId')?.value||'').trim();
    const loginId=norm(document.getElementById('acctLoginId')?.value);
    const name=String(document.getElementById('acctName')?.value||'').trim();
    const password=String(document.getElementById('acctPassword')?.value||'').trim();
    const phone=String(document.getElementById('acctPhone')?.value||'').trim();
    const memo=String(document.getElementById('acctMemo')?.value||'').trim();
    const ids=childIds();
    if(!name)throw new Error('이름을 입력해주세요.');
    if(!loginId)throw new Error('아이디를 입력해주세요.');
    if(!editId&&!password)throw new Error('비밀번호를 입력해주세요.');
    if(!ids.length)throw new Error('연결할 자녀를 한 명 이상 선택해주세요.');

    let uid=editId,email='';
    if(!editId){const auth=await createOrReuseAuth(loginId,password);uid=auth.uid;email=auth.email;}
    const payload={loginId,name,role:'PARENT',roles:['PARENT'],phone,academyId:'ac-001',isActive:true,childIds:ids.join(','),studentId:'',teacherClasses:'',memo};
    if(email)payload.email=email;
    if(editId){
      const r=await _tFetch(`tables/users/${encodeURIComponent(uid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok)throw new Error(`학부모 계정 수정 실패 (${r.status})`);
    }else await writeUser(uid,payload);
    await linkChildren(uid,ids,phone);
    document.getElementById('acctChildIds').value=ids.join(',');
    return{name,uid};
  }

  function install(){
    const form=document.getElementById('acctForm');
    if(!form||form.dataset.parentSaveV2==='1')return;
    form.dataset.parentSaveV2='1';
    form.addEventListener('submit',async function(e){
      if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='PARENT')return;
      e.preventDefault();e.stopImmediatePropagation();
      const btn=form.querySelector('button[type="submit"]');
      if(btn?.disabled)return;
      if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{
        const result=await saveParent(form);
        window.YMS_UI?.toast?.(`✅ ${result.name} 학부모 계정이 저장되었습니다`);
        document.getElementById('acctPanel')?.classList.add('hidden');
        form.reset();
        if(typeof window.loadAccounts==='function')await window.loadAccounts();
        if(typeof window.loadAllData==='function')await window.loadAllData();
      }catch(err){
        console.error('[YMS parent save v2]',err);
        window.YMS_UI?.toast?.('❌ '+(err?.message||'학부모 계정 저장 실패'));
      }finally{if(btn){btn.disabled=false;btn.textContent='저장';}}
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',()=>setTimeout(install,100),{once:true});
})();
