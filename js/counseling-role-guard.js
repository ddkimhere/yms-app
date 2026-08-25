/* YMS counseling access guard — ADMIN / TEACHER only */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/counseling.html')) return;
  const u=window.YMS_Auth?.getUser?.();
  if(!u) return;
  const role=String(u.role||'').toUpperCase();
  const roles=Array.isArray(u.roles)?u.roles.map(r=>String(r).toUpperCase()):[];
  const allowed=role==='ADMIN'||role==='TEACHER'||roles.includes('ADMIN')||roles.includes('TEACHER');
  if(allowed) return;
  if(role==='PARENT') location.replace('parent-home.html');
  else location.replace('student-home.html');
})();
