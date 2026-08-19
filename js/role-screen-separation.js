/* YMS strict role screen separation */
(function(){
  'use strict';
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  const user=window.YMS_Auth?.getUser?.();
  if(!user) return;
  const role=String(user.role||'').toUpperCase();

  // ADMIN uses admin only. TEACHER uses teacher home only.
  if(path==='teacher-home.html' && role==='ADMIN'){
    location.replace('admin.html');
    return;
  }
  if(path==='admin.html' && role==='TEACHER'){
    location.replace('teacher-home.html');
    return;
  }

  if(path==='teacher-home.html'){
    const adminShortcut=document.getElementById('adminShortcut');
    if(adminShortcut) adminShortcut.remove();
    document.querySelectorAll('a[href="admin.html"],button[onclick*="admin.html"]').forEach(el=>el.remove());
  }
})();
