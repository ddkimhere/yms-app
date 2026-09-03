/* YMS parent account save v4 — auth UID aligned parent flow */
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
      const existing=document.querySelector('script[src*="firebase-config.js"]');
      if(existing){
        const started=Date.now();
        const wait=()=>{if(window.YMS_FIREBASE_CONFIG)return resolve();if(Date.now()-started>4000)return reject(new Error('Firebase 설정을 불러오지 못했습니다.'));setTimeout(wait,50)};
        wait();return;
      }
      const s=document.createElement('script');s.src='js/firebase-config.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    if(!window.YMS_FIREBASE_CONFIG)throw new Error('Firebase 설정을 불러오지 못했습니다.');
    return window.YMS_FIREBASE_CONFIG;
  }

  function childIds(){
    const checked=[...document.querySelectorAll('.yms-sibling-check:checked')].map(x=>String(x.value||'').trim()).filter(Boolean);
    if(checked.length)return [...new Set(checked)];
    const sel=document.getElementById('acctChildSelect');
    if(sel){const ids=[...sel.selectedOptions].map(o=>String(o.value||'').trim()).filter(Boolean);if(ids.length)return [...new Set(ids)];}
    return [...new Set(String(document.getElementById('acctChildIds')?.value||'').split(',').map(x=>x.trim()).filter(Boolean))];
  }

  async function freshAdminToken(){
    const u=window.YMS_Auth?.getUser?.();
    if(!u)throw new Error('관리자 로그인이 필요합니다.');
    try{
      const r=await window._tFetch(`tables/users/${encodeURIComponent(u.id||u.uid||'')}`,{cache:'no-store'});
      if(!r.ok)throw new Error('AUTH_CHECK_'+r.status);
      const p=await r.json();
      if(String(p?.role||'').toUpperCase()!=='ADMIN')throw new Error('현재 계정에 관리자 저장 권한이 없습니다.');
    }catch(e){
      if(String(e?.message||'').includes('관리자 저장 권한'))throw e;
      throw new Error('관리자 인증이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');
    }
    const token=window.YMS_Auth?.getToken?.();
    if(!token)throw new Error('관리자 인증이 만료되었습니다. 로그아웃 후 다시 로그인해주세요.');
    return token;
  }

  async function authForParent(loginId,password,{createIfMissing=true}={}){
    const cfg=await config(),email=loginEmail(loginId);
    if(email==='@yms.local')throw new Error('아이디를 확인해주세요.');
    let r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
    });
    let j=await r.json().catch(()=>({}));
    if(r.ok)return{uid:j.localId,email};
    const signInCode=j?.error?.message||'';
    if(!createIfMissing||!['EMAIL_NOT_FOUND','INVALID_LOGIN_CREDENTIALS','INVALID_PASSWORD'].includes(signInCode)){
      throw new Error('학부모 아이디 또는 비밀번호를 확인해주세요.');
    }
    r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})
    });
    j=await r.json().catch(()=>({}));
    if(r.ok)return{uid:j.localId,email};
    const code=j?.error?.message||'';
    if(String(code).startsWith('WEAK_PASSWORD'))throw new Error('비밀번호는 6자리 이상으로 입력해주세요.');
    if(code==='EMAIL_EXISTS')throw new Error('이미 같은 아이디가 있습니다. 기존 비밀번호를 정확히 입력해주세요.');
    throw new Error(code||`Firebase 계정 생성 실패 (${r.status})`);
  }

  async function writeUser(uid,payload){
    const cfg=await config(),token=await freshAdminToken();
    const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({fields:encodeFields(payload)})});
    if(!r.ok){
      const t=await r.text().catch(()=>String(r.status));
      if(r.status===401||r.status===403)throw new Error(`학부모 계정 저장 권한 오류 (${r.status}). 로그아웃 후 다시 로그인해주세요.`);
      throw new Error(`학부모 계정 저장 실패 (${r.status}) ${t.slice(0,120)}`);
    }
  }

  async function linkChildren(uid,ids,phone){
    for(const sid of ids){
      const r=await window._tFetch(`tables/students/${encodeURIComponent(sid)}`,{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId:uid,parentPhone:phone||''})
      });
      if(!r.ok)throw new Error(`자녀 연결 저장 실패 (${r.status})`);
    }
  }

  async function saveParent(){
    await freshAdminToken();
    const editId=String(document.getElementById('acctEditId')?.value||'').trim();
    const loginId=norm(document.getElementById('acctLoginId')?.value);
    const name=String(document.getElementById('acctName')?.value||'').trim();
    const password=String(document.getElementById('acctPassword')?.value||'').trim();
    const phone=String(document.getElementById('acctPhone')?.value||'').trim();
    const memo=String(document.getElementById('acctMemo')?.value||'').trim();
    const ids=childIds();
    if(!name)throw new Error('이름을 입력해주세요.');
    if(!loginId)throw new Error('아이디를 입력해주세요.');
    if(!ids.length)throw new Error('연결할 자녀를 한 명 이상 선택해주세요.');

    let uid=editId,email='';
    let repaired=false;
    if(!editId){
      if(!password)throw new Error('비밀번호를 입력해주세요.');
      const auth=await authForParent(loginId,password,{createIfMissing:true});uid=auth.uid;email=auth.email;
    }else if(password){
      const auth=await authForParent(loginId,password,{createIfMissing:false});
      uid=auth.uid;email=auth.email;repaired=uid!==editId;
    }

    const payload={loginId,name,role:'PARENT',roles:['PARENT'],phone,academyId:'ac-001',isActive:true,childIds:ids.join(','),studentId:'',teacherClasses:'',memo};
    if(email)payload.email=email;

    if(!editId||repaired){
      await writeUser(uid,payload);
      if(repaired){
        await linkChildren(uid,ids,phone);
        const old=await _tFetch(`tables/users/${encodeURIComponent(editId)}`,{method:'DELETE'});
        if(!old.ok&&old.status!==404)console.warn('[YMS] old parent profile cleanup failed',old.status);
      }
    }else{
      const r=await _tFetch(`tables/users/${encodeURIComponent(uid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!r.ok)throw new Error(`학부모 계정 수정 실패 (${r.status})`);
    }

    await linkChildren(uid,ids,phone);
    const hidden=document.getElementById('acctChildIds');if(hidden)hidden.value=ids.join(',');
    return{name,uid,repaired};
  }

  function showInlineError(message){
    let el=document.getElementById('parentSaveError');
    const form=document.getElementById('acctForm');
    if(!el&&form){
      el=document.createElement('div');el.id='parentSaveError';
      el.style.cssText='margin:10px 0;padding:10px 12px;border-radius:10px;background:#FFF3F3;border:1px solid #FFD1D1;color:#C73838;font-size:12px;font-weight:700;line-height:1.5;';
      form.querySelector('button[type="submit"]')?.parentElement?.insertAdjacentElement('beforebegin',el);
    }
    if(el){el.textContent=message;el.style.display='block';}
  }
  function clearInlineError(){const el=document.getElementById('parentSaveError');if(el)el.style.display='none';}

  function install(){
    const form=document.getElementById('acctForm');
    if(!form||form.dataset.parentSaveV4==='1')return;
    form.dataset.parentSaveV4='1';
    form.addEventListener('submit',async function(e){
      if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='PARENT')return;
      e.preventDefault();e.stopImmediatePropagation();clearInlineError();
      const btn=form.querySelector('button[type="submit"]');
      if(btn?.disabled)return;
      if(btn){btn.disabled=true;btn.textContent='저장 중...';}
      try{
        const result=await saveParent();
        const msg=result.repaired?`✅ ${result.name} 학부모 로그인 계정 연결을 복구했습니다`:`✅ ${result.name} 학부모 계정이 저장되었습니다`;
        window.YMS_UI?.toast?.(msg);
        document.getElementById('acctPanel')?.classList.add('hidden');
        form.reset();
        if(typeof window.loadAccounts==='function')await window.loadAccounts();
        if(typeof window.loadAllData==='function')await window.loadAllData();
      }catch(err){
        console.error('[YMS parent save v4]',err);
        const msg=err?.message||'학부모 계정 저장 실패';
        showInlineError('❌ '+msg);
        window.YMS_UI?.toast?.('❌ '+msg);
      }finally{if(btn){btn.disabled=false;btn.textContent='저장';}}
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('load',()=>setTimeout(install,100),{once:true});
})();
