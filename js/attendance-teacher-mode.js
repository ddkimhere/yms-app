/* YMS attendance: prefer teacher mode for ADMIN+TEACHER multi-role accounts */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/attendance.html')) return;
  const auth=window.YMS_Auth;
  if(!auth?.getUser) return;
  const originalGetUser=auth.getUser.bind(auth);
  const current=originalGetUser();
  const roles=Array.isArray(current?.roles)?current.roles.map(r=>String(r).toUpperCase()):[];
  const hasTeacher=String(current?.role||'').toUpperCase()==='TEACHER'||roles.includes('TEACHER');
  if(!hasTeacher) return;
  auth.getUser=function(){
    const u=originalGetUser();
    if(!u) return u;
    return {...u,role:'TEACHER',roles:Array.isArray(u.roles)?u.roles:['TEACHER']};
  };
})();
