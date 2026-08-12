/* YMS Master Track — Firebase compatibility layer */
(function(){
  'use strict';

  const STORAGE_KEY='yms_firebase_session_v1';
  let configPromise=null;

  function ensureConfig(){
    if(window.YMS_FIREBASE_CONFIG) return Promise.resolve(window.YMS_FIREBASE_CONFIG);
    if(configPromise) return configPromise;
    configPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='js/firebase-config.js';
      s.onload=()=>window.YMS_FIREBASE_CONFIG?resolve(window.YMS_FIREBASE_CONFIG):reject(new Error('FIREBASE_CONFIG_MISSING'));
      s.onerror=()=>reject(new Error('FIREBASE_CONFIG_LOAD_FAILED'));
      document.head.appendChild(s);
    });
    return configPromise;
  }

  const getSession=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}};
  const setSession=s=>localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
  const clearSession=()=>localStorage.removeItem(STORAGE_KEY);
  const norm=v=>String(v||'').trim().toLowerCase();
  const upper=v=>String(v||'').trim().toUpperCase();
  const loginEmail=id=>`${norm(id).replace(/[^a-z0-9._-]/g,'')}@yms.local`;
  const normalizeRoles=user=>{
    const primary=upper(user?.role);
    const extras=Array.isArray(user?.roles)?user.roles.map(upper):[];
    return [...new Set([primary,...extras].filter(Boolean))];
  };

  function decodeVal(v){
    if(!v||typeof v!=='object') return null;
    if('nullValue'in v) return null;
    if('stringValue'in v) return v.stringValue;
    if('booleanValue'in v) return v.booleanValue;
    if('integerValue'in v) return Number(v.integerValue);
    if('doubleValue'in v) return Number(v.doubleValue);
    if('timestampValue'in v) return v.timestampValue;
    if('arrayValue'in v) return (v.arrayValue.values||[]).map(decodeVal);
    if('mapValue'in v) return decodeFields(v.mapValue.fields||{});
    return null;
  }
  function decodeFields(fields){const o={};Object.entries(fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));return o;}
  function decodeDoc(doc){if(!doc)return null;return {id:String(doc.name||'').split('/').pop(),...decodeFields(doc.fields||{}),created_at:doc.createTime,updated_at:doc.updateTime};}

  function encodeVal(v){
    if(v===null||v===undefined)return {nullValue:null};
    if(Array.isArray(v))return {arrayValue:{values:v.map(encodeVal)}};
    if(typeof v==='boolean')return {booleanValue:v};
    if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
    if(typeof v==='object')return {mapValue:{fields:encodeFields(v)}};
    return {stringValue:String(v)};
  }
  function encodeFields(o){const f={};Object.entries(o||{}).forEach(([k,v])=>{if(v!==undefined)f[k]=encodeVal(v)});return f;}

  async function authSignIn(loginId,password){
    const cfg=await ensureConfig();
    const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:loginEmail(loginId),password,returnSecureToken:true})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(j?.error?.message||'AUTH_FAILED');e.code=j?.error?.message||'AUTH_FAILED';throw e;}
    return j;
  }

  async function refreshToken(){
    const cfg=await ensureConfig(),s=getSession();
    if(!s?.refreshToken)return null;
    const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(cfg.apiKey)}`,{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({grant_type:'refresh_token',refresh_token:s.refreshToken})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.id_token){clearSession();return null;}
    const next={...s,token:j.id_token,refreshToken:j.refresh_token||s.refreshToken,expiresAt:Date.now()+Number(j.expires_in||3600)*1000};
    setSession(next);return next.token;
  }

  async function validToken(){const s=getSession();if(!s?.token)return null;if(!s.expiresAt||s.expiresAt-Date.now()>60000)return s.token;return refreshToken();}
  async function baseUrl(){const cfg=await ensureConfig();return `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;}
  async function fsFetch(url,opt={},retry=true){
    const t=await validToken();if(!t)return new Response('{}',{status:401});
    const h=new Headers(opt.headers||{});h.set('Authorization',`Bearer ${t}`);
    const r=await fetch(url,{...opt,headers:h});
    if(r.status===401&&retry&&await refreshToken())return fsFetch(url,opt,false);
    return r;
  }
  async function profile(uid,token){
    const u=`${await baseUrl()}/users/${encodeURIComponent(uid)}`;
    const r=await fetch(u,{headers:{Authorization:`Bearer ${token}`}});
    return r.ok?decodeDoc(await r.json()):null;
  }

  window.YMS_Auth={
    async loginWithTable(loginId,password){
      const id=norm(loginId),a=await authSignIn(id,password),p=await profile(a.localId,a.idToken);
      if(!p){const e=new Error('PROFILE_NOT_FOUND');e.code='PROFILE_NOT_FOUND';throw e;}
      if(norm(p.loginId||id)!==id){const e=new Error('LOGIN_ID_MISMATCH');e.code='LOGIN_ID_MISMATCH';throw e;}
      const primaryRole=upper(p.role);
      const user={...p,id:a.localId,uid:a.localId,loginId:id,email:loginEmail(id),role:primaryRole,roles:normalizeRoles(p)};
      setSession({token:a.idToken,refreshToken:a.refreshToken,expiresAt:Date.now()+Number(a.expiresIn||3600)*1000,user});
      return {token:a.idToken,user};
    },
    save(token,user){
      const s=getSession()||{};
      const nextUser=user?{...user,role:upper(user.role),roles:normalizeRoles(user)}:s.user;
      setSession({...s,token:token||s.token,user:nextUser});
    },
    getUser(){return getSession()?.user||null;},
    getToken(){return getSession()?.token||null;},
    hasRole(role,user){
      const u=user||getSession()?.user;
      return !!u&&normalizeRoles(u).includes(upper(role));
    },
    isLoggedIn(){return !!getSession()?.user;},
    logout(){clearSession();location.href=(window._YMS_BASE||'./')+'login.html';}
  };

  window.YMS_Roles={
    list(user){return normalizeRoles(user||window.YMS_Auth.getUser());},
    has(user,role){return !!user&&normalizeRoles(user).includes(upper(role));}
  };

  window.ymsPageInit=function(required=true){const u=window.YMS_Auth.getUser();if(!u&&required){location.href=(window._YMS_BASE||'./')+'login.html';return null;}return u;};

  const resp=(ok,status,data)=>({ok,status,json:async()=>data,text:async()=>JSON.stringify(data)});
  function parsePath(path){const [p,q='']=String(path||'').split('?'),a=p.replace(/^\/+/, '').split('/');if(a[0]!=='tables'||!a[1])return null;const sp=new URLSearchParams(q);return {col:a[1],id:a[2]||null,limit:Math.min(Number(sp.get('limit')||100),1000)};}

  window._tFetch=async function(path,opt={}){
    const p=parsePath(path);if(!p)return resp(false,400,{error:'BAD_PATH'});
    const method=String(opt.method||'GET').toUpperCase(),root=`${await baseUrl()}/${encodeURIComponent(p.col)}`,doc=p.id?`${root}/${encodeURIComponent(p.id)}`:null;
    try{
      if(method==='GET'&&p.id){const r=await fsFetch(doc);return r.ok?resp(true,200,decodeDoc(await r.json())):resp(false,r.status,{error:await r.text()});}
      if(method==='GET'){const r=await fsFetch(`${root}?pageSize=${p.limit}`);if(!r.ok)return resp(false,r.status,{error:await r.text()});const j=await r.json();const data=(j.documents||[]).map(decodeDoc);return resp(true,200,{data,total:data.length});}
      if(method==='POST'){const body=opt.body?JSON.parse(opt.body):{};const r=await fsFetch(root,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:encodeFields(body)})});return r.ok?resp(true,201,decodeDoc(await r.json())):resp(false,r.status,{error:await r.text()});}
      if((method==='PUT'||method==='PATCH')&&p.id){const body=opt.body?JSON.parse(opt.body):{};const mask=Object.keys(body).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');const r=await fsFetch(mask?`${doc}?${mask}`:doc,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:encodeFields(body)})});return r.ok?resp(true,200,decodeDoc(await r.json())):resp(false,r.status,{error:await r.text()});}
      if(method==='DELETE'&&p.id){const r=await fsFetch(doc,{method:'DELETE'});return resp(r.ok,r.status,r.ok?{ok:true}:{error:await r.text()});}
      return resp(false,405,{error:'METHOD_NOT_SUPPORTED'});
    }catch(e){console.error('[YMS Firebase]',e);return resp(false,500,{error:e.message});}
  };

  window.YMS_CONFIG={TABLE_AUTH:true};
  window.YMS_UI={
    toast(m){let e=document.getElementById('yms-toast');if(!e){e=document.createElement('div');e.id='yms-toast';Object.assign(e.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:99999,padding:'10px 16px',borderRadius:'9999px',background:'#1E3278',color:'#fff',fontSize:'13px'});document.body.appendChild(e);}e.textContent=m;clearTimeout(e._t);e._t=setTimeout(()=>e.remove(),2200);},
    attBadge(s){return `<span>${({PRESENT:'출석',LATE:'지각',ABSENT:'결석'}[s]||s||'-')}</span>`;}
  };
  window.YMS_DEMO={attendance:{s001:[]},students:[],payments:[],classes:[],homework:[],notices:[]};
})();

/* YMS Master Track — PWA bootstrap */
(function(){
  'use strict';

  const base = window._YMS_BASE || (() => {
    const clean = location.href.split('?')[0].split('#')[0];
    return clean.substring(0, clean.lastIndexOf('/') + 1);
  })();

  function ensureLink(rel, href, extra={}) {
    if (document.querySelector(`link[rel="${rel}"]`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    Object.entries(extra).forEach(([k,v]) => link.setAttribute(k,v));
    document.head.appendChild(link);
  }

  function ensureMeta(name, content) {
    if (document.querySelector(`meta[name="${name}"]`)) return;
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }

  ensureLink('manifest', base + 'manifest.json');
  ensureLink('apple-touch-icon', base + 'images/icon-180.png', { sizes: '180x180' });
  ensureMeta('mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-capable', 'yes');
  ensureMeta('apple-mobile-web-app-status-bar-style', 'default');
  ensureMeta('apple-mobile-web-app-title', 'YMS');

  let deferredPrompt = null;
  window.YMS_PWA = {
    get canInstall(){ return !!deferredPrompt; },
    async install(){
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      return choice?.outcome === 'accepted';
    }
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    window.dispatchEvent(new CustomEvent('yms-pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('yms-pwa-installed'));
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(base + 'service-worker.js', { scope: base })
        .catch(err => console.warn('[YMS PWA] service worker registration failed:', err));
    });
  }
})();