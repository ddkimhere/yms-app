/* YMS admin parent sibling/children linking UI */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function selectedIds(){
    return String(document.getElementById('acctChildIds')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  }
  function syncHidden(){
    const ids=[...document.querySelectorAll('.yms-sibling-check:checked')].map(x=>x.value);
    const hidden=document.getElementById('acctChildIds');if(hidden)hidden.value=ids.join(',');
    const sel=document.getElementById('acctChildSelect');
    if(sel)[...sel.options].forEach(o=>o.selected=ids.includes(String(o.value)));
    const count=document.getElementById('ymsSiblingCount');if(count)count.textContent=ids.length?`${ids.length}명 연결`:'선택 없음';
  }
  function renderSiblingBox(){
    const row=document.getElementById('acctChildRow'),sel=document.getElementById('acctChildSelect');
    if(!row||!sel)return;
    let box=document.getElementById('ymsSiblingBox');
    if(!box){
      const label=row.querySelector('label');if(label)label.innerHTML='👨‍👩‍👧‍👦 자녀 · 형제 연결 <span id="ymsSiblingCount" style="margin-left:6px;color:#1E3278;font-size:11px;">선택 없음</span>';
      const help=row.querySelector('div');if(help)help.textContent='형제·자매가 있으면 모두 체크하세요. 한 학부모 계정에 연결된 자녀는 교육비 내역서가 한 장으로 합산됩니다.';
      sel.style.display='none';
      box=document.createElement('div');box.id='ymsSiblingBox';box.style.cssText='max-height:240px;overflow:auto;border:1px solid #DCE3F0;border-radius:14px;background:#fff;padding:8px;display:grid;gap:4px;';
      sel.insertAdjacentElement('afterend',box);
    }
    const picked=new Set(selectedIds());
    box.innerHTML=[...sel.options].filter(o=>o.value).map(o=>`<label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;background:#F8FAFD;"><input class="yms-sibling-check" type="checkbox" value="${esc(o.value)}" ${picked.has(String(o.value))||o.selected?'checked':''} style="width:18px;height:18px;accent-color:#1E3278"><span style="font-size:13px;font-weight:750;color:#273453">${esc(o.textContent||o.value)}</span></label>`).join('')||'<div style="padding:15px;text-align:center;color:#8A96B2;font-size:12px">등록된 학생이 없습니다.</div>';
    box.querySelectorAll('.yms-sibling-check').forEach(c=>c.addEventListener('change',syncHidden));
    syncHidden();
  }

  function patchRoleUi(){
    const role=document.getElementById('acctRole');if(!role)return;
    if(String(role.value||'').toUpperCase()==='PARENT')setTimeout(renderSiblingBox,0);
  }
  const oldUpdate=window.updateAcctRoleFields;
  if(typeof oldUpdate==='function')window.updateAcctRoleFields=function(){const r=oldUpdate.apply(this,arguments);setTimeout(patchRoleUi,0);return r;};
  const oldShow=window.showAddAcctPanel;
  if(typeof oldShow==='function')window.showAddAcctPanel=function(){const r=oldShow.apply(this,arguments);setTimeout(patchRoleUi,80);return r;};
  const oldEdit=window.openEditAcct;
  if(typeof oldEdit==='function')window.openEditAcct=function(){const r=oldEdit.apply(this,arguments);setTimeout(patchRoleUi,120);return r;};

  function boot(){patchRoleUi();const sel=document.getElementById('acctChildSelect');if(sel)new MutationObserver(()=>renderSiblingBox()).observe(sel,{childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',()=>setTimeout(boot,300));
})();