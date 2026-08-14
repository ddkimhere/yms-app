/* Secure parent payment query: only linked child's payments */
(function(){
  'use strict';
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
  function decodeDoc(doc){
    const out={id:String(doc?.name||'').split('/').pop()};
    Object.entries(doc?.fields||{}).forEach(([k,v])=>out[k]=decodeVal(v));
    return out;
  }
  async function query(studentId){
    const user=window.YMS_Auth?.getUser?.();
    const role=String(user?.role||'').toUpperCase();
    if(role!=='PARENT'||!studentId)return [];
    const childIds=Array.isArray(user.childIds)?user.childIds:String(user.childIds||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!childIds.includes(String(studentId)))throw new Error('연결된 자녀의 수강료만 확인할 수 있습니다.');
    const token=window.YMS_Auth?.getToken?.();
    if(!token)throw new Error('로그인이 필요합니다.');
    const url='https://firestore.googleapis.com/v1/projects/yms-app-bb735/databases/(default)/documents:runQuery';
    const body={structuredQuery:{from:[{collectionId:'payments'}],where:{fieldFilter:{field:{fieldPath:'studentId'},op:'EQUAL',value:{stringValue:String(studentId)}}},limit:200}};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('수강료 정보를 불러오지 못했습니다.');
    const rows=await r.json();
    return rows.filter(x=>x.document).map(x=>decodeDoc(x.document));
  }
  window.YMS_ParentPayments={query};

  const base=window._tFetch;
  if(base&&!base.__parentPaymentSecure){
    const wrapped=async function(path,opt={}){
      const user=window.YMS_Auth?.getUser?.();
      if(String(user?.role||'').toUpperCase()==='PARENT' && /^tables\/payments\?/.test(String(path||''))){
        let sid='';
        try{if(typeof selected!=='undefined'&&selected?.id)sid=selected.id;}catch{}
        if(!sid){
          const ids=Array.isArray(user.childIds)?user.childIds:String(user.childIds||'').split(',').map(x=>x.trim()).filter(Boolean);
          sid=ids[0]||'';
        }
        try{
          const data=await query(sid);
          return {ok:true,status:200,json:async()=>({data,total:data.length}),text:async()=>JSON.stringify({data,total:data.length})};
        }catch(e){
          return {ok:false,status:403,json:async()=>({error:e.message}),text:async()=>e.message};
        }
      }
      return base(path,opt);
    };
    wrapped.__parentPaymentSecure=true;
    window._tFetch=wrapped;
  }
})();
