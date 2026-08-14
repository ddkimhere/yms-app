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
  window.YMS_ParentPayments={
    async query(studentId){
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
  };
})();
