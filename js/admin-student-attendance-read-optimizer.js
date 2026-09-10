/* YMS Admin — reduce student-management attendance reads */
(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'')!=='admin.html') return;

  const TARGET='tables/attendance?limit=1000';
  const TTL=2*60*1000;
  let cache={at:0,data:null};
  let inflight=null;

  function ymd(d){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function startDate(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-89);return ymd(d);}
  function decodeVal(v){
    if(!v||typeof v!=='object')return null;
    if('stringValue'in v)return v.stringValue;
    if('integerValue'in v)return Number(v.integerValue);
    if('doubleValue'in v)return Number(v.doubleValue);
    if('booleanValue'in v)return v.booleanValue;
    if('timestampValue'in v)return v.timestampValue;
    if('nullValue'in v)return null;
    return null;
  }
  function decodeDoc(d){
    const o={id:String(d?.name||'').split('/').pop()};
    Object.entries(d?.fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));
    return o;
  }
  function response(rows){
    return new Response(JSON.stringify({data:rows}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  async function fetchRecentAttendance(){
    if(cache.data&&Date.now()-cache.at<TTL)return cache.data;
    if(inflight)return inflight;
    inflight=(async()=>{
      const token=window.YMS_Auth?.getToken?.();
      if(!token)throw new Error('로그인이 필요합니다.');
      const projectId=window.YMS_FIREBASE_CONFIG?.projectId||'yms-app-bb735';
      const url=`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
      const body={structuredQuery:{
        from:[{collectionId:'attendance'}],
        where:{fieldFilter:{field:{fieldPath:'date'},op:'GREATER_THAN_OR_EQUAL',value:{stringValue:startDate()}}},
        limit:1000
      }};
      const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok)throw new Error(`출결 조회 실패 (HTTP ${r.status})`);
      const rows=(await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
      cache={at:Date.now(),data:rows};
      return rows;
    })().finally(()=>{inflight=null;});
    return inflight;
  }
  function patchLabels(){
    const modal=document.getElementById('studentOverviewModal');
    const label=modal?.querySelector('.student-overview-field label');
    if(label&&label.textContent.includes('전체 출석률'))label.textContent='최근 90일 출석률';
    const summary=document.getElementById('studentSumAttendance')?.previousElementSibling;
    if(summary&&summary.textContent.includes('평균 출석률'))summary.textContent='최근 90일 평균 출석률';
  }
  function install(){
    const old=window._tFetch;
    if(typeof old!=='function'||old.__studentAttendanceOptimized)return false;
    const wrapped=async function(path,opts){
      const key=String(path||'');
      if(key===TARGET&&(!opts?.method||String(opts.method).toUpperCase()==='GET')){
        try{return response(await fetchRecentAttendance());}
        catch(e){console.warn('[YMS] recent attendance optimizer fallback',e);return old.apply(this,arguments);}
      }
      return old.apply(this,arguments);
    };
    wrapped.__studentAttendanceOptimized=true;
    wrapped.__raw=old;
    window._tFetch=wrapped;
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>80)clearInterval(timer);
    patchLabels();
  },50);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchLabels,{once:true});
  window.addEventListener('load',()=>setTimeout(patchLabels,300));
})();
