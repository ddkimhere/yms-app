/* YMS teacher student-management contact columns */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/counseling.html')) return;
  const me=window.YMS_Auth?.getUser?.();
  const role=String(me?.role||'').toUpperCase();
  const roles=Array.isArray(me?.roles)?me.roles.map(r=>String(r).toUpperCase()):[];
  if(!(role==='TEACHER'||roles.includes('TEACHER'))||role==='ADMIN'||!window._tFetch) return;

  let students=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phone=v=>String(v||'').trim();
  const dial=v=>phone(v).replace(/[^0-9+]/g,'');
  function studentPhone(s){return phone(s.studentPhone||s.phone||s.mobile||s.phoneNumber||s.contact||'');}
  function parentPhone(s){return phone(s.parentPhone||s.guardianPhone||s.parentMobile||s.guardianMobile||s.parentPhoneNumber||s.guardianPhoneNumber||'');}
  function phoneHtml(v){const p=phone(v);return p?`<a class="tsm-phone-link" href="tel:${esc(dial(p))}" aria-label="${esc(p)}로 전화">📞 ${esc(p)}</a>`:'<span class="tsm-no-phone">-</span>';}

  function css(){
    if(document.getElementById('yms-teacher-contact-css'))return;
    const s=document.createElement('style');s.id='yms-teacher-contact-css';s.textContent=`
      .tsm-table{min-width:1160px!important}
      .tsm-school{min-width:120px;white-space:nowrap}.tsm-grade{min-width:72px;text-align:center;white-space:nowrap}
      .tsm-phone{min-width:145px;text-align:center;white-space:nowrap}.tsm-phone-link{display:inline-flex;align-items:center;justify-content:center;gap:4px;color:#1E4FD7;text-decoration:none;font-weight:850;padding:6px 8px;border-radius:9px;background:#EEF3FB}.tsm-phone-link:active{background:#DCE7FB}.tsm-no-phone{color:#A1AABC}
      @media(max-width:600px){.tsm-table{min-width:1120px!important}.tsm-school{min-width:105px}.tsm-phone{min-width:135px}}
    `;document.head.appendChild(s);
  }

  function enhance(){
    css();
    const table=document.querySelector('.tsm-table');if(!table)return;
    const hr=table.querySelector('thead tr');if(!hr)return;
    if(!hr.querySelector('.tsm-contact-head')){
      const nameTh=hr.querySelector('th.name');
      ['학교','학년','학생 전화','부모님 전화'].forEach((label,i)=>{
        const th=document.createElement('th');th.className='tsm-contact-head '+(['tsm-school','tsm-grade','tsm-phone','tsm-phone'][i]);th.textContent=label;
        nameTh?.insertAdjacentElement('afterend',th);
      });
      // insertAdjacentElement(afterend) reverses order, so normalize explicitly.
      const added=[...hr.querySelectorAll('.tsm-contact-head')];
      added.forEach(x=>x.remove());
      const labels=[['학교','tsm-school'],['학년','tsm-grade'],['학생 전화','tsm-phone'],['부모님 전화','tsm-phone']];
      let anchor=nameTh;
      labels.forEach(([label,cls])=>{const th=document.createElement('th');th.className=`tsm-contact-head ${cls}`;th.textContent=label;anchor.insertAdjacentElement('afterend',th);anchor=th;});
    }
    table.querySelectorAll('tbody tr[data-sid]').forEach(tr=>{
      if(tr.querySelector('.tsm-contact-cell'))return;
      const sid=tr.dataset.sid||'';const st=students.find(s=>String(s.id)===String(sid))||{};const name=tr.querySelector('td.name');if(!name)return;
      const vals=[
        `<span>${esc(st.schoolName||st.school||'-')}</span>`,
        `<span>${esc(st.grade||'-')}</span>`,
        phoneHtml(studentPhone(st)),
        phoneHtml(parentPhone(st))
      ];
      const classes=['tsm-school','tsm-grade','tsm-phone','tsm-phone'];let anchor=name;
      vals.forEach((html,i)=>{const td=document.createElement('td');td.className=`tsm-contact-cell ${classes[i]}`;td.innerHTML=html;anchor.insertAdjacentElement('afterend',td);anchor=td;});
    });
    const empty=table.querySelector('.tsm-empty');if(empty&&empty.closest('tr')&&!empty.dataset.contactSpan){const n=Number(empty.getAttribute('colspan')||4);empty.setAttribute('colspan',String(n+4));empty.dataset.contactSpan='1';}
  }

  async function load(){
    try{const r=await _tFetch('tables/students?limit=1000',{cache:'no-store'});if(r.ok)students=(await r.json()).data||[];}catch(e){console.warn('[YMS] teacher contact load failed',e)}
    enhance();
  }
  let timer=null;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,30);});
  function boot(){load();obs.observe(document.body,{childList:true,subtree:true});setTimeout(enhance,300);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();