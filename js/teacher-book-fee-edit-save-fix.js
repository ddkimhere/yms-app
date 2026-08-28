/* YMS teacher book fee edit save button hard fix */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/teacher-home.html')) return;

  function bindV2(){
    const modal=document.getElementById('bookFeeEditModalV2');
    const form=document.getElementById('bfe2Form');
    const btn=form?.querySelector('button.btn.btn-primary');
    if(!modal||!form||!btn) return;

    btn.id='bfe2Save';
    btn.type='button';
    btn.style.setProperty('position','relative','important');
    btn.style.setProperty('z-index','100900','important');
    btn.style.setProperty('pointer-events','auto','important');
    btn.style.setProperty('touch-action','manipulation','important');
    btn.style.setProperty('min-height','52px','important');

    if(btn.dataset.mobileSaveFix==='1') return;
    btn.dataset.mobileSaveFix='1';
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(btn.disabled) return;
      if(typeof form.requestSubmit==='function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
  }

  function run(){bindV2();setTimeout(bindV2,100);setTimeout(bindV2,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  const obs=new MutationObserver(bindV2);obs.observe(document.documentElement,{childList:true,subtree:true});
})();
