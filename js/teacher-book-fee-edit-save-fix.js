/* YMS teacher book fee edit save button hard fix */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/teacher-home.html')) return;

  function bind(){
    const modal=document.getElementById('bookFeeEditModal');
    const form=document.getElementById('bfeForm');
    const btn=document.getElementById('bfeSave');
    if(!modal||!form||!btn) return;

    btn.style.setProperty('position','relative','important');
    btn.style.setProperty('z-index','100700','important');
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('touch-action','manipulation','important');

    if(btn.dataset.mobileSaveFix==='1') return;
    btn.dataset.mobileSaveFix='1';
    btn.type='button';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(btn.disabled) return;
      if(typeof form.requestSubmit==='function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
  }

  function run(){bind();setTimeout(bind,100);setTimeout(bind,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  const obs=new MutationObserver(bind);obs.observe(document.documentElement,{childList:true,subtree:true});
})();
