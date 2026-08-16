/* YMS student class consistency: keep users <-> students synchronized */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const esc=v=>String(v??'');
  const writeMethods=new Set(['POST','PUT','PATCH']);
  const norm=v=>String(v||'').trim();

  function classById(id){
    if(!id || !Array.isArray(window._allClasses)) return null;
    return window._allClasses.find(c=>String(c.id||'')===String(id))||null;
  }

  function canonicalize(data){
    const out={...(data||{})};
    const cls=classById(out.classId);
    if(cls){
      out.className=cls.className||out.className||'';
      out.teacherName=cls.teacherName||out.teacherName||'';
      out.levelCode=cls.levelCode||out.levelCode||'';
    }
    return out;
  }

  function mirrorPayload(data){
    const p=canonicalize(data);
    return {
      grade:p.grade||'',
      schoolName:p.schoolName||'',
      classId:p.classId||'',
      className:p.className||'',
      teacherName:p.teacherName||'',
      levelCode:p.levelCode||''
    };
  }

  function sameMirror(a,b){
    return ['grade','schoolName','classId','className','teacherName','levelCode']
      .every(k=>norm(a?.[k])===norm(b?.[k]));
  }

  function normalizeMemory(){
    try{
      if(!Array.isArray(window._allStudents)) return;
      window._allStudents.forEach(s=>{
        const cls=classById(s.classId);
        if(!cls) return;
        s.className=cls.className||s.className||'';
        s.teacherName=cls.teacherName||s.teacherName||'';
        s.levelCode=cls.levelCode||s.levelCode||'';
      });
    }catch(e){ console.warn('[YMS] 반 메모리 보정 실패',e); }
  }

  const baseFetch=window._tFetch;
  if(typeof baseFetch==='function'&&!baseFetch.__studentClassSync){
    const wrapped=async function(path,opt={}){
      const method=String(opt?.method||'GET').toUpperCase();
      const rawPath=String(path||'');
      let bodyObj=null;
      if(writeMethods.has(method)&&/^tables\/students(?:\/[^?]+)?$/.test(rawPath)){
        try{ bodyObj=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||null); }catch{}
        if(bodyObj){
          const fixed=canonicalize(bodyObj);
          opt={...opt,body:JSON.stringify(fixed)};
          bodyObj=fixed;
        }
      }

      const res=await baseFetch(path,opt);

      if(res?.ok && bodyObj && writeMethods.has(method) && /^tables\/students(?:\/[^?]+)?$/.test(rawPath)){
        try{
          let userId=bodyObj.userId||'';
          if(!userId){
            const m=rawPath.match(/^tables\/students\/([^?]+)$/);
            const sid=m?decodeURIComponent(m[1]):'';
            const known=Array.isArray(window._allStudents)?window._allStudents.find(s=>String(s.id||'')===sid):null;
            userId=known?.userId||'';
          }
          if(userId){
            await baseFetch(`tables/users/${encodeURIComponent(userId)}`,{
              method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(mirrorPayload(bodyObj))
            });
          }
        }catch(e){ console.warn('[YMS] 계정 반정보 미러링 실패',e); }
      }
      return res;
    };
    wrapped.__studentClassSync=true;
    window._tFetch=wrapped;
  }

  function wrapStudentRenderer(){
    const current=window.renderStudentTable;
    if(typeof current!=='function'||current.__studentClassSync) return;
    const wrapped=function(){ normalizeMemory(); return current.apply(this,arguments); };
    wrapped.__studentClassSync=true;
    window.renderStudentTable=wrapped;
  }

  async function repairExisting(){
    try{
      const [ur,sr,cr]=await Promise.all([
        window._tFetch('tables/users?limit=1000',{cache:'no-store'}),
        window._tFetch('tables/students?limit=1000',{cache:'no-store'}),
        window._tFetch('tables/classes?limit=300',{cache:'no-store'})
      ]);
      if(!ur.ok||!sr.ok||!cr.ok) return;
      const users=(await ur.json()).data||[];
      const students=(await sr.json()).data||[];
      const classes=(await cr.json()).data||[];
      const classMap=new Map(classes.map(c=>[String(c.id||''),c]));
      const userMap=new Map(users.map(u=>[String(u.id||''),u]));
      let changed=0;

      for(const s of students){
        const uid=String(s.userId||'');
        if(!uid) continue;
        const u=userMap.get(uid);
        if(!u) continue;
        const cls=classMap.get(String(s.classId||u.classId||''));
        const source={
          grade:s.grade||u.grade||'',
          schoolName:s.schoolName||u.schoolName||'',
          classId:s.classId||u.classId||'',
          className:cls?.className||s.className||u.className||'',
          teacherName:cls?.teacherName||s.teacherName||u.teacherName||'',
          levelCode:cls?.levelCode||s.levelCode||u.levelCode||''
        };
        if(!sameMirror(u,source)){
          const r=await baseFetch(`tables/users/${encodeURIComponent(uid)}`,{
            method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(source)
          });
          if(r.ok) changed++;
        }
        if(!sameMirror(s,source)){
          await baseFetch(`tables/students/${encodeURIComponent(s.id)}`,{
            method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(source)
          });
        }
      }
      if(changed) console.log('[YMS] 학생 반정보 정합성 복구:',changed,'명');
      if(typeof window.YMS_syncStudentUsers==='function') await window.YMS_syncStudentUsers();
    }catch(e){ console.warn('[YMS] 학생 반정보 정합성 복구 실패',e); }
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>{wrapStudentRenderer();normalizeMemory();},300);
    setTimeout(repairExisting,1200);
  });
})();
