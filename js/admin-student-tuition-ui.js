/* YMS admin student registration extras: start date + default tuition */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  let lastLoaded='';
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';

  function calc(){
    const base=Math.max(0,Number(document.getElementById('acctTuitionBaseAmount')?.value)||0);
    const discount=Math.min(base,Math.max(0,Number(document.getElementById('acctTuitionDiscountAmount')?.value)||0));
    const el=document.getElementById('acctTuitionPreview');
    if(el) el.textContent=discount?`기본 ${money(base)} - 할인 ${money(discount)} = 최종 ${money(base-discount)}`:`최종 수강료 ${money(base)}`;
  }

  function install(){
    const studentRow=document.getElementById('acctStudentRow');
    if(!studentRow) return;
    const panel=studentRow.firstElementChild;
    if(!panel) return;

    let box=document.getElementById('acctStudentTuitionBox');
    if(!box){
      box=document.createElement('div');
      box.id='acctStudentTuitionBox';
      box.style='margin-top:14px;padding-top:14px;border-top:1px solid #C5D3F5;';
      box.innerHTML=`
        <div style="font-size:12px;font-weight:800;color:#1E3278;margin-bottom:10px;">📅 수업 시작 · 💳 기본 수강료</div>
        <div class="form-group" style="margin:0 0 10px;">
          <label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label>
          <input type="date" class="form-input" id="acctStartDate" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">기본 수강료</label>
            <input type="number" class="form-input" id="acctTuitionBaseAmount" min="0" step="1000" inputmode="numeric" placeholder="예) 250000">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">할인 금액</label>
            <input type="number" class="form-input" id="acctTuitionDiscountAmount" min="0" step="1000" inputmode="numeric" value="0" placeholder="0">
          </div>
        </div>
        <div class="form-group" style="margin:10px 0 0;">
          <label class="form-label">할인 사유</label>
          <input type="text" class="form-input" id="acctTuitionDiscountReason" placeholder="예) 형제 할인">
        </div>
        <div id="acctTuitionPreview" style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff;color:#1E3278;font-size:11px;font-weight:800;">최종 수강료 0원</div>`;
      panel.appendChild(box);
    }else if(!document.getElementById('acctStartDate')){
      const start=document.createElement('div');
      start.className='form-group';
      start.style.margin='0 0 10px';
      start.innerHTML='<label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label><input type="date" class="form-input" id="acctStartDate" required>';
      const firstGrid=box.querySelector('div[style*="grid-template-columns"]');
      if(firstGrid) firstGrid.before(start); else box.prepend(start);
    }

    const b=document.getElementById('acctTuitionBaseAmount');
    const d=document.getElementById('acctTuitionDiscountAmount');
    if(b&&!b.dataset.ymsCalcBound){b.addEventListener('input',calc);b.dataset.ymsCalcBound='1';}
    if(d&&!d.dataset.ymsCalcBound){d.addEventListener('input',calc);d.dataset.ymsCalcBound='1';}
    calc();
  }

  async function loadExisting(){
    install();
    const role=String(document.getElementById('acctRole')?.value||'').toUpperCase();
    if(role!=='STUDENT') return;
    const sid=document.getElementById('acctLinkedStudentId')?.value||'';
    if(!sid||sid===lastLoaded) return;
    lastLoaded=sid;
    try{
      const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});
      if(!r.ok) return;
      const s=await r.json();
      const start=document.getElementById('acctStartDate');
      const b=document.getElementById('acctTuitionBaseAmount');
      const d=document.getElementById('acctTuitionDiscountAmount');
      const reason=document.getElementById('acctTuitionDiscountReason');
      if(start) start.value=String(s.startDate||s.classStartDate||'').slice(0,10);
      if(b) b.value=Number(s.tuitionBaseAmount||0)||'';
      if(d) d.value=Number(s.tuitionDiscountAmount||0)||0;
      if(reason) reason.value=s.tuitionDiscountReason||'';
      calc();
    }catch(e){console.warn('[YMS] load student registration defaults',e);}
  }

  function resetWhenNew(){
    const edit=document.getElementById('acctEditId')?.value||'';
    const sid=document.getElementById('acctLinkedStudentId')?.value||'';
    if(!edit&&!sid&&lastLoaded){
      lastLoaded='';
      const start=document.getElementById('acctStartDate');
      const b=document.getElementById('acctTuitionBaseAmount');
      const d=document.getElementById('acctTuitionDiscountAmount');
      const r=document.getElementById('acctTuitionDiscountReason');
      if(start)start.value='';if(b)b.value='';if(d)d.value='0';if(r)r.value='';calc();
    }
  }

  function bindStudentSave(){
    const form=document.getElementById('acctForm');
    if(!form||form.dataset.ymsStartDateBound==='1') return;
    form.dataset.ymsStartDateBound='1';
    form.addEventListener('submit',function(e){
      const role=String(document.getElementById('acctRole')?.value||'').toUpperCase();
      if(role!=='STUDENT') return;
      const startDate=document.getElementById('acctStartDate')?.value||'';
      if(!startDate){
        e.preventDefault();
        e.stopImmediatePropagation();
        window.YMS_UI?.toast?.('❌ 수업 시작일을 입력해주세요');
        document.getElementById('acctStartDate')?.focus();
        return;
      }

      const base=window._tFetch;
      if(typeof base!=='function'||base.__ymsStartDateWrapper) return;
      let restored=false;
      const restore=()=>{if(!restored&&window._tFetch===wrapped){restored=true;window._tFetch=base;}};
      const wrapped=async function(path,opt={}){
        const method=String(opt?.method||'GET').toUpperCase();
        if(String(path).startsWith('tables/students')&&(method==='POST'||method==='PATCH')){
          try{
            const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});
            body.startDate=startDate;
            opt={...opt,body:JSON.stringify(body)};
          }catch{}
          restore();
        }
        return base(path,opt);
      };
      wrapped.__ymsStartDateWrapper=true;
      window._tFetch=wrapped;
      setTimeout(restore,5000);
    },true);
  }

  function tick(){install();loadExisting();resetWhenNew();bindStudentSave();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick); else tick();
  window.addEventListener('load',()=>{tick();setTimeout(tick,200);setTimeout(tick,700);});
})();
