(function(){
  if(!location.pathname.endsWith('/admin.html')) return;
  const s=document.createElement('script');
  s.src='js/admin-multirole-fix.js';
  document.head.appendChild(s);
})();
