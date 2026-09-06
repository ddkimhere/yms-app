/* YMS check-in kiosk — Firestore read optimizer */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='checkin.html') return;
  if(window.__YMS_CHECKIN_READ_OPTIMIZER__) return;
  const base=window._tFetch;
  if(typeof base!=='function') return;
  window.__YMS_CHECKIN_READ_OPTIMIZER__=true;

  const STUDENT_KEY='yms_kiosk_students_v1';
  const ATT_PREFIX='yms_kiosk_attendance_v1:';
  const STUDENT_TTL=30*60*1000;
  const ATT_TTL=30*1000;

  const resp=(ok,status,data)=>({ok,status,json:async()=>JSON.parse(JSON.stringify(data)),text:async()=>JSON.stringify(data)});
  const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function readSession(key,ttl){try{const raw=sessionStorage.getItem(key);if(!raw)return null;const x=JSON.parse(raw);if(!x?.at||Date.now()-x.at>ttl){sessionStorage.removeItem(key);return null;}return x.data;}catch{return null;}}
  function writeSession(key,data){try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),data}));}catch{}}
  function clearAttendanceCache(){try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith(ATT_PREFIX))sessionStorage.removeItem(k);}}catch{}}

  function decodeVal(v){
    if(!v||typeof v!=='object')return null;
    if('stringValue'in v)return v.stringValue;
    if('integerValue'in v)return Number(v.integerValue);
    if('doubleValue'in v)return Number(v.doubleValue);
    if('booleanValue'in v)return v.booleanValue;
    if('timestampValue'in v)return v.timestampValue;
    if('nullValue'in v)return null;
    if('arrayValue'in v)return (v.arrayValue.values||[]).map(decodeVal);
    if('mapValue'in v){const o={};Object.entries(v.mapValue.fields||{}).forEach(([k,x])=>o[k]=decodeVal(x));return o;}
    return null;
  }
  function decodeDoc(doc){const out={id:String(doc?.name||'').split('/').pop()};Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));return out;}

  async function queryAttendanceForDate(date){
    const cacheKey=ATT_PREFIX+date;
    const cached=readSession(cacheKey,ATT_TTL);
    if(cached)return resp(true,200,{data:cached,total:cached.length});
    try{
      const token=window.YMS_Auth?.getToken?.();
      if(!token)return resp(false,401,{error:'NO_TOKEN'});
      const cfg=window.YMS_FIREBASE_CONFIG;
      const projectId=cfg?.projectId||'yms-app-bb735';
      const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`;
      const body={structuredQuery:{from:[{collectionId:'attendance'}],where:{fieldFilter:{field:{fieldPath:'date'},op:'EQUAL',value:{stringValue:String(date)}}},limit:1000}};
      const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok)return resp(false,r.status,{error:await r.text()});
      const rows=(await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
      writeSession(cacheKey,rows);
      return resp(true,200,{data:rows,total:rows.length});
    }catch(e){console.warn('[YMS kiosk] attendance query failed',e);return resp(false,500,{error:e.message});}
  }

  window._tFetch=async function(path,opt={}){
    const p=String(path||'');
    const method=String(opt?.method||'GET').toUpperCase();

    if(method==='GET'&&/^tables\/students\?/.test(p)){
      const cached=readSession(STUDENT_KEY,STUDENT_TTL);
      if(cached)return resp(true,200,{data:cached,total:cached.length});
      const next={...opt};delete next.cache;delete next.ymsNoCache;
      const r=await base(p,next);
      if(!r.ok)return r;
      const j=await r.json();
      const data=j?.data||[];
      writeSession(STUDENT_KEY,data);
      return resp(true,200,{data,total:data.length});
    }

    if(method==='GET'&&/^tables\/attendance\?/.test(p)){
      return queryAttendanceForDate(localDate());
    }

    const r=await base(path,opt);
    if(r?.ok&&method!=='GET'&&/^tables\/attendance(?:\/|$)/.test(p)) clearAttendanceCache();
    return r;
  };
})();
