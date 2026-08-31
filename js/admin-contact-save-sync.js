/* YMS safe contact sync: copy account phone only when account form is saved */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  function role(){return String(document.getElementById('acctRole')?.value||'').trim().toUpperCase();}
  function accountPhone(){return String(document.getElementById('acctPhone')?.value||'').trim();}

  function install(){
    const form=document.getElementById('acctForm');
    if(!form||form.dataset.ymsContactSaveSync==='1'||typeof window._tFetch!=='function')return;
    form.dataset.ymsContactSaveSync='1';

    form.addEventListener('submit',function(){
      const r=role(),p=accountPhone();
      if(!p||(r!=='STUDENT'&&r!=='PARENT'))return;

      const base=window._tFetch;
      if(typeof base!=='function'||base.__ymsContactSaveSync)return;
      let expires=Date.now()+8000;

      const wrapped=async function(path,opt={}){
        const method=String(opt?.method||'GET').toUpperCase();
        const isStudentWrite=String(path||'').startsWith('tables/students')&&(method==='POST'||method==='PATCH');
        if(isStudentWrite){
          try{
            const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});
            if(r==='STUDENT') body.studentPhone=p;
            if(r==='PARENT') body.parentPhone=p;
            opt={...opt,body:JSON.stringify(body)};
          }catch(e){console.warn('[YMS] contact save sync payload',e);}
        }
        const result=await base(path,opt);
        if(Date.now()>expires&&window._tFetch===wrapped)window._tFetch=base;
        return result;
      };
      wrapped.__ymsContactSaveSync=true;
      window._tFetch=wrapped;
      setTimeout(()=>{if(window._tFetch===wrapped)window._tFetch=base;},8000);
    },true);
  }

  function boot(){install();setTimeout(install,300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('load',()=>setTimeout(install,300),{once:true});
})();