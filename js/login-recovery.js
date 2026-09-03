/* YMS login recovery — retry authenticated profile lookup without changing normal login */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/login.html')) return;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').trim().toLowerCase();
  const upper=v=>String(v||'').trim().toUpperCase();
  const loginEmail=id=>`${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`;

  function decodeVal(v){
    if(!v||typeof v!=='object') return null;
    if('nullValue' in v) return null;
    if('stringValue' in v) return v.stringValue;
    if('booleanValue' in v) return v.booleanValue;
    if('integerValue' in v) return Number(v.integerValue);
    if('doubleValue' in v) return Number(v.doubleValue);
    if('timestampValue' in v) return v.timestampValue;
    if('arrayValue' in v) return (v.arrayValue.values||[]).map(decodeVal);
    if('mapValue' in v) return decodeFields(v.mapValue.fields||{});
    return null;
  }
  function decodeFields(fields){const o={};Object.entries(fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));return o;}
  function decodeDoc(doc){return {id:String(doc?.name||'').split('/').pop(),...decodeFields(doc?.fields||{})};}
  function rolesOf(p){const primary=upper(p?.role),extra=Array.isArray(p?.roles)?p.roles.map(upper):[];return [...new Set([primary,...extra].filter(Boolean))];}

  async function getConfig(){
    if(window.YMS_FIREBASE_CONFIG) return window.YMS_FIREBASE_CONFIG;
    const started=Date.now();
    while(Date.now()-started<4000){if(window.YMS_FIREBASE_CONFIG)return window.YMS_FIREBASE_CONFIG;await sleep(50);}
    throw new Error('FIREBASE_CONFIG_MISSING');
  }

  async function directRecovery(loginId,password){
    const cfg=await getConfig();
    const id=norm(loginId),email=loginEmail(id);
    const ar=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
      body:JSON.stringify({email,password,returnSecureToken:true})
    });
    const a=await ar.json().catch(()=>({}));
    if(!ar.ok){window.__YMS_LOGIN_DIAG__='AUTH_'+String(a?.error?.message||ar.status);throw new Error(a?.error?.message||'AUTH_FAILED');}

    const url=`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(a.localId)}`;
    let lastStatus=0,lastText='';
    for(let i=0;i<3;i++){
      try{
        const r=await fetch(url,{headers:{Authorization:`Bearer ${a.idToken}`},cache:'no-store'});
        lastStatus=r.status;
        if(r.ok){
          const p=decodeDoc(await r.json());
          if(norm(p.loginId||id)!==id){window.__YMS_LOGIN_DIAG__='LOGIN_ID_MISMATCH';throw new Error('LOGIN_ID_MISMATCH');}
          const role=upper(p.role);
          const user={...p,id:a.localId,uid:a.localId,loginId:id,email,role,roles:rolesOf(p)};
          window.__YMS_LOGIN_DIAG__='RECOVERED';
          return {token:a.idToken,user,refreshToken:a.refreshToken,expiresIn:a.expiresIn};
        }
        lastText=await r.text().catch(()=> '');
        if(!(r.status===429||r.status===500||r.status===503)) break;
      }catch(e){
        if(String(e?.message||'')==='LOGIN_ID_MISMATCH')throw e;
        lastStatus=0;lastText=e?.message||'NETWORK';
      }
      await sleep(i===0?300:900);
    }
    if(lastStatus===429||/RESOURCE_EXHAUSTED/i.test(lastText))window.__YMS_LOGIN_DIAG__='FIRESTORE_429';
    else if(lastStatus===403)window.__YMS_LOGIN_DIAG__='FIRESTORE_403';
    else if(lastStatus===404)window.__YMS_LOGIN_DIAG__='FIRESTORE_404';
    else if(lastStatus===0)window.__YMS_LOGIN_DIAG__='NETWORK';
    else window.__YMS_LOGIN_DIAG__='FIRESTORE_'+lastStatus;
    const e=new Error(window.__YMS_LOGIN_DIAG__);e.code=window.__YMS_LOGIN_DIAG__;throw e;
  }

  function patchErrorBox(){
    const el=document.getElementById('loginError');if(!el)return;
    const diag=String(window.__YMS_LOGIN_DIAG__||'');
    if(!diag||diag==='RECOVERED')return;
    const messages={
      FIRESTORE_429:'현재 Firestore 사용량 한도를 초과해 사용자 정보를 읽지 못하고 있습니다. 계정 비밀번호 문제는 아닙니다.',
      FIRESTORE_403:'로그인 인증은 되었지만 사용자 프로필 읽기 권한이 차단되고 있습니다. Firestore 보안 규칙을 확인해야 합니다.',
      FIRESTORE_404:'로그인 계정은 있지만 같은 UID의 YMS 사용자 프로필이 없습니다.',
      NETWORK:'Firebase 사용자 정보 조회 중 네트워크 오류가 발생했습니다.',
      LOGIN_ID_MISMATCH:'Firebase 로그인 계정과 YMS 사용자 프로필 아이디가 일치하지 않습니다.'
    };
    const msg=messages[diag]||(diag.startsWith('AUTH_')?'아이디 또는 비밀번호를 확인해주세요.':`사용자 프로필 조회 오류: ${diag}`);
    if(el.classList.contains('show'))el.textContent=msg;
  }

  function install(){
    const auth=window.YMS_Auth;
    if(!auth||typeof auth.loginWithTable!=='function'){setTimeout(install,80);return;}
    if(auth.loginWithTable.__ymsRecovery)return;
    const base=auth.loginWithTable.bind(auth);
    const wrapped=async function(loginId,password){
      window.__YMS_LOGIN_DIAG__='';
      try{return await base(loginId,password);}
      catch(err){
        const code=String(err?.code||err?.message||'').toUpperCase();
        if(code.includes('PROFILE_NOT_FOUND')) return directRecovery(loginId,password);
        window.__YMS_LOGIN_DIAG__='AUTH_'+code;
        throw err;
      }
    };
    wrapped.__ymsRecovery=true;
    auth.loginWithTable=wrapped;
    const error=document.getElementById('loginError');
    if(error)new MutationObserver(()=>setTimeout(patchErrorBox,0)).observe(error,{attributes:true,childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
