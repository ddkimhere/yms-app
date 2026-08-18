/* YMS student class consistency: keep users <-> students synchronized */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const writeMethods=new Set(['POST','PUT','PATCH']);
  const norm=v=>String(v||'').trim();
  const normName=v=>norm(v).toLowerCase().replace(/[\s·._-]+/g,'');
  const normRole=v=>String(v||'').trim().replace(/^[^A-Za-z가-힣]+/,'').trim().toUpperCase();

  function classes(){
    try{if(typeof _allClasses!=='undefined'&&Array.isArray(_allClasses))return _allClasses;}catch{}
    return Array.isArray(window._allClasses)?window._allClasses:[];
  }
  function studentsMem(){
    try{if(typeof _allStudents!=='undefined'&&Array.isArray(_allStudents))return _allStudents;}catch{}
    return Array.isArray(window._allStudents)?window._allStudents:[];
  }
  function classById(id){
    if(!id)return null;
    return classes().find(c=>String(c.id||c.classId||'')===String(id))||null;
  }
  function canonicalize(data){
    const out={...(data||{})};
    const cls=classById(out.classId);
    if(cls){
      out.className=cls.className||cls.name||out.className||'';
      out.teacherName=cls.teacherName||out.teacherName||'';
      out.levelCode=cls.levelCode||out.levelCode||'';
    }
    return out;
  }
  function mirrorPayload(data){
    const p=canonicalize(data);
    return {grade:p.grade||'',schoolName:p.schoolName||'',classId:p.classId||'',className:p.className||'',teacherName:p.teacherName||'',levelCode:p.levelCode||''};
  }
  function sameMirror(a,b){
    return ['grade','schoolName','classId','className','teacherName','levelCode'].every(k=>norm(a?.[k])===norm(b?.[k]));
  }
  function normalizeMemory(){
    try{
      studentsMem().forEach(s=>{
        const cls=classById(s.classId);if(!cls)return;
        s.className=cls.className||cls.name||s.className||'';
        s.teacherName=cls.teacherName||s.teacherName||'';
        s.levelCode=cls.levelCode||s.levelCode||'';
      });
    }catch(e){console.warn('[YMS] 반 메모리 보정 실패',e);}
  }

  const baseFetch=window._tFetch;
  if(typeof baseFetch==='function'&&!baseFetch.__studentClassSync){
    const wrapped=async function(path,opt={}){
      const method=String(opt?.method||'GET').toUpperCase();
      const rawPath=String(path||'');
      let bodyObj=null;
      if(writeMethods.has(method)&&/^tables\/students(?:\/[^?]+)?$/.test(rawPath)){
        try{bodyObj=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||null);}catch{}
        if(bodyObj){bodyObj=canonicalize(bodyObj);opt={...opt,body:JSON.stringify(bodyObj)};}
      }
      const res=await baseFetch(path,opt);
      if(res?.ok&&bodyObj&&writeMethods.has(method)&&/^tables\/students(?:\/[^?]+)?$/.test(rawPath)){
        try{
          let userId=bodyObj.userId||'';
          if(!userId){
            const m=rawPath.match(/^tables\/students\/([^?]+)$/),sid=m?decodeURIComponent(m[1]):'';
            const known=studentsMem().find(s=>String(s.id||'')===sid);userId=known?.userId||'';
          }
          if(userId){
            await baseFetch(`tables/users/${encodeURIComponent(userId)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(mirrorPayload(bodyObj))});
          }
        }catch(e){console.warn('[YMS] 계정 반정보 미러링 실패',e);}
      }
      return res;
    };
    wrapped.__studentClassSync=true;window._tFetch=wrapped;
  }

  function wrapStudentRenderer(){
    const current=window.renderStudentTable;if(typeof current!=='function'||current.__studentClassSync)return;
    const wrapped=function(){normalizeMemory();return current.apply(this,arguments);};wrapped.__studentClassSync=true;window.renderStudentTable=wrapped;
  }

  async function repairExisting(){
    try{
      const [ur,sr,cr]=await Promise.all([
        window._tFetch('tables/users?limit=1000',{cache:'no-store'}),
        window._tFetch('tables/students?limit=1000',{cache:'no-store'}),
        window._tFetch('tables/classes?limit=300',{cache:'no-store'})
      ]);
      if(!ur.ok||!sr.ok||!cr.ok)return;
      const users=(await ur.json()).data||[],students=(await sr.json()).data||[],classesDb=(await cr.json()).data||[];
      const classMap=new Map(classesDb.map(c=>[String(c.id||c.classId||''),c]));
      const classByName=new Map();classesDb.forEach(c=>{const k=normName(c.className||c.name);if(k&&!classByName.has(k))classByName.set(k,c);});
      const userMap=new Map(users.map(u=>[String(u.id||u.uid||''),u]));
      const userByStudentId=new Map(users.filter(u=>u.studentId).map(u=>[String(u.studentId),u]));
      const studentUsers=users.filter(u=>u.isActive!==false&&(normRole(u.role)==='STUDENT'||(Array.isArray(u.roles)&&u.roles.map(normRole).includes('STUDENT'))));
      const uniqueNameUsers=new Map();
      studentUsers.forEach(u=>{const k=normName(u.name);if(!k)return;if(uniqueNameUsers.has(k))uniqueNameUsers.set(k,null);else uniqueNameUsers.set(k,u);});
      const linkedUsers=new Set();

      for(const s of students){
        let u=s.userId?userMap.get(String(s.userId)):null;
        if(!u)u=userByStudentId.get(String(s.id||''))||null;
        if(!u){const byName=uniqueNameUsers.get(normName(s.name));if(byName)u=byName;}
        if(!u)continue;
        const uid=String(u.id||u.uid||'');linkedUsers.add(uid);
        let classId=s.classId||u.classId||'';
        let cls=classMap.get(String(classId));
        if(!cls){cls=classByName.get(normName(s.className||u.className))||null;if(cls)classId=cls.id||cls.classId||classId;}
        const source={
          grade:s.grade||u.grade||'',schoolName:s.schoolName||u.schoolName||'',classId,
          className:cls?.className||cls?.name||s.className||u.className||'',teacherName:cls?.teacherName||s.teacherName||u.teacherName||'',levelCode:cls?.levelCode||s.levelCode||u.levelCode||''
        };
        if(String(s.userId||'')!==uid||!sameMirror(s,source)){
          await baseFetch(`tables/students/${encodeURIComponent(s.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...source,userId:uid,isActive:s.isActive!==false,name:s.name||u.name||''})});
        }
        if(String(u.studentId||'')!==String(s.id||'')||!sameMirror(u,source)){
          await baseFetch(`tables/users/${encodeURIComponent(uid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...source,studentId:s.id})});
        }
      }

      for(const u of studentUsers){
        const uid=String(u.id||u.uid||'');if(!uid||linkedUsers.has(uid))continue;
        let classId=u.classId||'';let cls=classMap.get(String(classId));
        if(!cls){cls=classByName.get(normName(u.className))||null;if(cls)classId=cls.id||cls.classId||classId;}
        const payload={name:u.name||u.loginId||'학생',grade:u.grade||'',schoolName:u.schoolName||'',classId,className:cls?.className||cls?.name||u.className||'',teacherName:cls?.teacherName||u.teacherName||'',levelCode:cls?.levelCode||u.levelCode||'',isActive:true,userId:uid};
        const created=await baseFetch('tables/students',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if(created.ok){const s=await created.json();if(s?.id)await baseFetch(`tables/users/${encodeURIComponent(uid)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...mirrorPayload(payload),studentId:s.id})});}
      }

      if(typeof window.YMS_syncStudentUsers==='function')await window.YMS_syncStudentUsers();
    }catch(e){console.warn('[YMS] 학생 반정보 정합성 복구 실패',e);}
  }

  window.addEventListener('load',()=>{
    setTimeout(()=>{wrapStudentRenderer();normalizeMemory();},300);
    setTimeout(repairExisting,1200);
  });
})();
