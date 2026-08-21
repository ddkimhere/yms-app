/* YMS admin student registration extras: start date + vehicle + ReadingN + tuition */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const READING_N_FEE=10000;
  let lastLoaded='';
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';

  function selected(name){ return document.querySelector(`input[name="${name}"]:checked`)?.value==='true'; }
  function setChoice(name,value){
    const wanted=String(value===true||String(value).toLowerCase()==='true');
    const radio=document.querySelector(`input[name="${name}"][value="${wanted}"]`);
    if(radio){radio.checked=true;paintChoice(name);}
  }
  function paintChoice(name){
    document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
      const span=r.nextElementSibling;if(!span)return;
      if(r.checked){span.style.background='#1E3278';span.style.color='#fff';span.style.borderColor='#1E3278';}
      else{span.style.background='#fff';span.style.color='#506080';span.style.borderColor='#C8D1E8';}
    });
  }

  function calc(){
    const classFee=Math.max(0,Number(document.getElementById('acctTuitionBaseAmount')?.value)||0);
    const readingFee=selected('acctReadingNUse')?READING_N_FEE:0;
    const gross=classFee+readingFee;
    const discount=Math.min(gross,Math.max(0,Number(document.getElementById('acctTuitionDiscountAmount')?.value)||0));
    const finalAmount=Math.max(0,gross-discount);
    const el=document.getElementById('acctTuitionPreview');
    if(!el)return;
    const parts=[`수업료 ${money(classFee)}`];
    if(readingFee)parts.push(`ReadingN ${money(readingFee)}`);
    let text=parts.join(' + ')+` = 기본 수강료 ${money(gross)}`;
    if(discount)text+=` - 할인 ${money(discount)} = 최종 ${money(finalAmount)}`;
    el.textContent=text;
  }

  function choiceBlock(name,label,help){
    return `<div class="form-group" style="margin:0 0 12px;">
      <label class="form-label">${label}</label>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="true" style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">유</span></label>
        <label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="false" checked style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">무</span></label>
      </div>
      ${help?`<div style="font-size:10px;color:#7A87A8;margin-top:5px;">${help}</div>`:''}
    </div>`;
  }

  function install(){
    const studentRow=document.getElementById('acctStudentRow');
    if(!studentRow)return;
    const panel=studentRow.firstElementChild;if(!panel)return;
    let box=document.getElementById('acctStudentTuitionBox');
    if(!box){
      box=document.createElement('div');box.id='acctStudentTuitionBox';
      box.style='margin-top:14px;padding-top:14px;border-top:1px solid #C5D3F5;';
      box.innerHTML=`
        <div style="font-size:12px;font-weight:800;color:#1E3278;margin-bottom:10px;">📅 수업 시작 · 🚐 차량 · 📚 ReadingN · 💳 수강료</div>
        <div class="form-group" style="margin:0 0 10px;"><label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label><input type="date" class="form-input" id="acctStartDate" required></div>
        ${choiceBlock('acctVehicleUse','🚐 차량 이용','‘유’ 선택 학생은 차량 관리 대상에 자동 포함됩니다.')}
        ${choiceBlock('acctReadingNUse','📚 ReadingN 사용','사용 시 기본 수강료에 10,000원이 자동 추가됩니다.')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group" style="margin:0;"><label class="form-label">수업 기본 수강료</label><input type="number" class="form-input" id="acctTuitionBaseAmount" min="0" step="1000" inputmode="numeric" placeholder="예) 250000"></div>
          <div class="form-group" style="margin:0;"><label class="form-label">할인 금액</label><input type="number" class="form-input" id="acctTuitionDiscountAmount" min="0" step="1000" inputmode="numeric" value="0" placeholder="0"></div>
        </div>
        <div class="form-group" style="margin:10px 0 0;"><label class="form-label">할인 사유</label><input type="text" class="form-input" id="acctTuitionDiscountReason" placeholder="예) 형제 할인"></div>
        <div id="acctTuitionPreview" style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff;color:#1E3278;font-size:11px;font-weight:800;">기본 수강료 0원</div>`;
      panel.appendChild(box);
    }

    ['acctVehicleUse','acctReadingNUse'].forEach(name=>{
      box.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
        if(r.dataset.bound==='1')return;
        r.addEventListener('change',()=>{paintChoice(name);calc();});r.dataset.bound='1';
      });paintChoice(name);
    });
    const b=document.getElementById('acctTuitionBaseAmount'),d=document.getElementById('acctTuitionDiscountAmount');
    if(b&&!b.dataset.ymsCalcBound){b.addEventListener('input',calc);b.dataset.ymsCalcBound='1';}
    if(d&&!d.dataset.ymsCalcBound){d.addEventListener('input',calc);d.dataset.ymsCalcBound='1';}
    calc();
  }

  async function loadExisting(force=false){
    install();
    if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='STUDENT')return;
    const sid=document.getElementById('acctLinkedStudentId')?.value||'';
    if(!sid||(!force&&sid===lastLoaded))return;
    lastLoaded=sid;
    try{
      const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});if(!r.ok)return;
      const s=await r.json();
      const readingUse=s.readingNUse===true;
      const storedBase=Math.max(0,Number(s.tuitionBaseAmount||0));
      const classFee=Number(s.tuitionCoreAmount||0)||(readingUse?Math.max(0,storedBase-READING_N_FEE):storedBase);
      const start=document.getElementById('acctStartDate');
      const base=document.getElementById('acctTuitionBaseAmount');
      const discount=document.getElementById('acctTuitionDiscountAmount');
      const reason=document.getElementById('acctTuitionDiscountReason');
      if(start)start.value=String(s.startDate||s.classStartDate||'').slice(0,10);
      setChoice('acctVehicleUse',s.vehicleUse===true);
      setChoice('acctReadingNUse',readingUse);
      if(base)base.value=classFee||'';
      if(discount)discount.value=Number(s.tuitionDiscountAmount||0)||0;
      if(reason)reason.value=s.tuitionDiscountReason||'';
      calc();
    }catch(e){console.warn('[YMS] load student registration defaults',e);}
  }

  function resetWhenNew(){
    const edit=document.getElementById('acctEditId')?.value||'',sid=document.getElementById('acctLinkedStudentId')?.value||'';
    if(!edit&&!sid&&lastLoaded){lastLoaded='';const start=document.getElementById('acctStartDate'),base=document.getElementById('acctTuitionBaseAmount'),discount=document.getElementById('acctTuitionDiscountAmount'),reason=document.getElementById('acctTuitionDiscountReason');if(start)start.value='';setChoice('acctVehicleUse',false);setChoice('acctReadingNUse',false);if(base)base.value='';if(discount)discount.value='0';if(reason)reason.value='';calc();}
  }

  function syncStudentEdit(){
    if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='STUDENT')return;
    const row=document.getElementById('acctStudentRow');
    if(row)row.style.display='';
    install();
    loadExisting(true);
  }

  function bindEditSync(){
    const fn=window.openEditAcct;
    if(typeof fn!=='function'||fn.__ymsStudentFullEdit)return;
    const wrapped=function(){
      const out=fn.apply(this,arguments);
      setTimeout(syncStudentEdit,0);
      setTimeout(syncStudentEdit,120);
      return out;
    };
    wrapped.__ymsStudentFullEdit=true;
    window.openEditAcct=wrapped;
  }

  function bindVehicleSave(){
    const form=document.getElementById('acctForm');if(!form||form.dataset.ymsVehicleSaveBound==='1')return;form.dataset.ymsVehicleSaveBound='1';
    form.addEventListener('submit',function(){
      if(String(document.getElementById('acctRole')?.value||'').toUpperCase()!=='STUDENT')return;
      const vehicleUse=selected('acctVehicleUse'),base=window._tFetch;if(typeof base!=='function'||base.__ymsVehicleWrapper)return;
      let restored=false;const restore=()=>{if(!restored&&window._tFetch===wrapped){restored=true;window._tFetch=base;}};
      const wrapped=async function(path,opt={}){const method=String(opt?.method||'GET').toUpperCase();if(String(path).startsWith('tables/students')&&(method==='POST'||method==='PATCH')){try{const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});body.vehicleUse=vehicleUse;opt={...opt,body:JSON.stringify(body)}}catch{}restore()}return base(path,opt)};
      wrapped.__ymsVehicleWrapper=true;window._tFetch=wrapped;setTimeout(restore,5000);
    },true);
  }

  function tick(){install();loadExisting();resetWhenNew();bindVehicleSave();bindEditSync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  window.addEventListener('load',()=>{tick();setTimeout(tick,200);setTimeout(tick,700);});
})();
