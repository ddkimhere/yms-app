/* YMS admin contact sync: users.phone -> students contact fields */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')||!window._tFetch) return;

  const role=v=>String(v||'').trim().toUpperCase();
  const ids=v=>Array.isArray(v)?v.map(String):String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const phone=v=>String(v||'').trim();
  let running=false;

  async function all(path,limit){
    const r=await _tFetch(`tables/${path}?limit=${limit}`,{cache:'no-store'});
    return r.ok?((await r.json()).data||[]):[];
  }

  async function sync(){
    if(running)return;
    running=true;
    try{
      const [users,students]=await Promise.all([all('users',1000),all('students',1000)]);
      const userById=new Map(users.map(u=>[String(u.id||''),u]));
      const studentUsers=users.filter(u=>role(u.role)==='STUDENT');
      const parentUsers=users.filter(u=>role(u.role)==='PARENT');
      const updates=[];

      for(const s of students){
        if(!s?.id)continue;
        let su=s.userId?userById.get(String(s.userId)):null;
        if(!su)su=studentUsers.find(u=>String(u.studentId||'')===String(s.id));

        let pu=s.parentId?userById.get(String(s.parentId)):null;
        if(!pu)pu=parentUsers.find(u=>ids(u.childIds).includes(String(s.id)));

        const next={};
        const sp=phone(su?.phone);
        const pp=phone(pu?.phone);
        if(sp&&phone(s.studentPhone)!==sp)next.studentPhone=sp;
        if(pp&&phone(s.parentPhone)!==pp)next.parentPhone=pp;
        if(su?.id&&String(s.userId||'')!==String(su.id))next.userId=String(su.id);
        if(pu?.id&&String(s.parentId||'')!==String(pu.id))next.parentId=String(pu.id);
        if(Object.keys(next).length)updates.push([s.id,next]);
      }

      for(const [sid,payload] of updates){
        const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(!r.ok)console.warn('[YMS] contact sync failed',sid,r.status);
      }
      if(updates.length)console.info(`[YMS] contact sync updated ${updates.length} students`);
    }catch(e){console.warn('[YMS] contact sync error',e)}
    finally{running=false;}
  }

  function schedule(ms=700){setTimeout(sync,ms)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(500),{once:true});else schedule(500);
  window.addEventListener('load',()=>schedule(1000),{once:true});

  document.addEventListener('submit',e=>{
    if(e.target?.id==='acctForm'){
      schedule(1200);schedule(2600);
    }
  },true);

  window.YMS_syncAccountPhonesToStudents=sync;
})();
