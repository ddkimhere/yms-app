/* Neutral app branding: remove visible YMS text while preserving statement JPG generators */
(function(){
  'use strict';

  const SKIP_TAGS=new Set(['SCRIPT','STYLE','NOSCRIPT','CANVAS','TEXTAREA']);
  const ATTRS=['title','placeholder','aria-label','alt'];

  function cleanText(v){
    if(typeof v!=='string'||!v.toUpperCase().includes('YMS')) return v;
    return v
      .replace(/YMS\s*Master\s*Track/gi,'Master Track')
      .replace(/YMS/gi,'')
      .replace(/[ \t]{2,}/g,' ')
      .replace(/\s+([·|/,:;!?])/g,'$1')
      .replace(/([·|/])\s*([·|/])/g,'$1')
      .trim();
  }

  function shouldSkip(node){
    const el=node?.nodeType===1?node:node?.parentElement;
    if(!el) return false;
    if(SKIP_TAGS.has(el.tagName)) return true;
    return !!el.closest('[data-keep-yms="1"],.keep-yms-text');
  }

  function scrubNode(root){
    if(!root) return;
    if(root.nodeType===3){
      if(!shouldSkip(root)&&/YMS/i.test(root.nodeValue||'')) root.nodeValue=cleanText(root.nodeValue||'');
      return;
    }
    if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11) return;
    if(root.nodeType===1&&!shouldSkip(root)){
      ATTRS.forEach(a=>{const v=root.getAttribute?.(a);if(v&&/YMS/i.test(v))root.setAttribute(a,cleanText(v));});
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n;while((n=walker.nextNode())){if(!shouldSkip(n)&&/YMS/i.test(n.nodeValue||''))n.nodeValue=cleanText(n.nodeValue||'');}
    if(root.querySelectorAll){
      root.querySelectorAll(ATTRS.map(a=>`[${a}]`).join(',')).forEach(el=>{
        if(shouldSkip(el))return;
        ATTRS.forEach(a=>{const v=el.getAttribute(a);if(v&&/YMS/i.test(v))el.setAttribute(a,cleanText(v));});
      });
    }
  }

  function scrubTitle(){
    if(/YMS/i.test(document.title||''))document.title=cleanText(document.title);
    document.querySelectorAll('meta[name="application-name"],meta[name="apple-mobile-web-app-title"]').forEach(m=>{
      const v=m.getAttribute('content')||'';if(/YMS/i.test(v))m.setAttribute('content',cleanText(v)||'Master Track');
    });
  }

  function run(){scrubTitle();scrubNode(document.body||document.documentElement);}

  let queued=false;
  const obs=new MutationObserver(muts=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      scrubTitle();
      muts.forEach(m=>{
        if(m.type==='characterData')scrubNode(m.target);
        else m.addedNodes.forEach(scrubNode);
      });
    });
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{run();obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});},{once:true});
  else{run();obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});}
  window.addEventListener('load',()=>setTimeout(run,0));
})();
