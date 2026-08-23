/* YMS admin student registration extras: start date + vehicle + ReadingN + tuition */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const READING_N_FEE=10000;
  let lastLoaded='', lastEditKey='';
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
  const roleIsStudent=()=>String(document.getElementById('acctRole')?.value||'').toUpperCase()==='STUDENT';
  function selected(name){return document.querySelector(`input[name="${name}"]:checked`)?.value==='true';}
  function setChoice(name,value){const wanted=String(value===true||String(value).toLowerCase()==='true');const radio=document.querySelector(`input[name="${name}"][value="${wanted}"]`);if(radio){radio.checked=true;paintChoice(name);}}
  function paintChoice(name){document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{const span=r.nextElementSibling;if(!span)return;if(r.checked){span.style.background='#1E3278';span.style.color='#fff';span.style.borderColor='#1E3278';}else{span.style.background='#fff';span.style.color='#506080';span.style.borderColor='#C8D1E8';}});}
  function calc(){const classFee=Math.max(0,Number(document.getElementById('acctTuitionBaseAmount')?.value)||0),readingFee=selected('acctReadingNUse')?READING_N_FEE:0,gross=classFee+readingFee,discount=Math.min(gross,Math.max(0,Number(document.getElementById('acctTuitionDiscountAmount')?.value)||0)),finalAmount=Math.max(0,gross-discount),el=document.getElementById('acctTuitionPreview');if(!el)return;const parts=[`수업료 ${money(classFee)}`];if(readingFee)parts.push(`ReadingN ${money(readingFee)}`);let text=parts.join(' + ')+` = 기본 수강료 ${money(gross)}`;if(discount)text+=` - 할인 ${money(discount)} = 최종 ${money(finalAmount)}`;el.textContent=text;}
  function choiceBlock(name,label,help){return `<div class="form-group" style="margin:0 0 12px;"><label class="form-label">${label}</label><div style="display:flex;gap:8px;margin-top:6px;"><label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="true" style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">유</span></label><label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="false" checked style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">무</span></label></div>${help?`<div style="font-size:10px;color:#7A87A8;margin-top:5px;">${help}</div>`:''}</div>`;}
  function fullMarkup(){return `<div style="font-size:12px;font-weight:800;color:#1E3278;margin-bottom:10px;">📅 수업 시작 · 🚐 차량 · 📚 ReadingN · 💳 수강료</div><div class="form-group" style="margin:0 0 10px;"><label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label><input type="date" class="form-input" id="acctStartDate" required></div>${choiceBlock('acctVehicleUse','🚐 차량 이용','‘유’ 선택 학생은 차량 관리 대상에 자동 포함됩니다.')}${choiceBlock('acctReadingNUse','📚 ReadingN 사용','사용 시 기본 수강료에 10,000원이 자동 추가됩니다.')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="form-group" style="margin:0;"><label class="form-label">수업 기본 수강료</label><input type="number" class="form-input" id="acctTuitionBaseAmount" min="0" step="1000" inputmode="numeric" placeholder="예) 250000"></div><div class="form-group" style="margin:0;"><label class="form-label">할인 금액</label><input type="number" class="form-input" id="acctTuitionDiscountAmount" min="0" step="1000" inputmode="numeric" value="0" placeholder="0"></div></div><div class="form-group" style="margin:10px 0 0;"><label class="form-label">할인 사유</label><input type="text" class="form-input" id="acctTuitionDiscountReason" placeholder="예) 형제 할인"></div><div id="acctTuitionPreview" style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff;color:#1E3278;font-size:11px;font-weight:800;">기본 수강료 0원</div>`;}

  function install(){
    const row=document.getElementById('acctStudentRow');if(!row)return null;
    let box=document.getElementById('acctStudentTuitionBox');
    if(!box){box=document.createElement('div');box.id='acctStudentTuitionBox';}
    if(box.parentElement!==row)row.appendChild(box);
    box.style.cssText='display:block;width:100%;margin-top:14px;padding:14px;border:1px solid #E3E8F4;border-radius:14px;background:#F8FAFE;';
    if(!box.querySelector('input[name="acctVehicleUse"]')||!box.querySelector('input[name="acctReadingNUse"]')||!box.querySelector('#acctStartDate'))box.innerHTML=fullMarkup();
    box.style.display=roleIsStudent()?'block':'none';
    ['acctVehicleUse','acctReadingNUse'].forEach(name=>{box.querySelectorAll(`input[name="${name}"]`).forEach(r=>{if(r.dataset.bound==='1')return;r.addEventListener('change',()=>{paintChoice(name);calc();});r.dataset.bound='1';});paintChoice(name);});
    const b=document.getElementById('acctTuitionBaseAmount'),d=document.getElementById('acctTuitionDiscountAmount');if(b&&!b.dataset.ymsCalcBound){b.addEventListener('input',calc);b.dataset.ymsCalcBound='1';}if(d&&!d.dataset.ymsCalcBound){d.addEventListener('input',calc);d.dataset.ymsCalcBound='1';}calc();return box;
  }

  async function loadExisting(force=false){
    install();if(!roleIsStudent())return;
    const sid=document.getElementById('acctLinkedStudentId')?.value||'';if(!sid||(!force&&sid===lastLoaded))return;lastLoaded=sid;
    try{const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});if(!r.ok)return;const s=await r.json(),readingUse=s.readingNUse===true,storedBase=Math.max(0,Number(s.tuitionBaseAmount||0)),classFee=Number(s.tuitionCoreAmount||0)||(readingUse?Math.max(0,storedBase-READING_N_FEE):storedBase);const start=document.getElementById('acctStartDate'),base=document.getElementById('acctTuitionBaseAmount'),discount=document.getElementById('acctTuitionDiscountAmount'),reason=document.getElementById('acctTuitionDiscountReason');if(start)start.value=String(s.startDate||s.classStartDate||'').slice(0,10);setChoice('acctVehicleUse',s.vehicleUse===true);setChoice('acctReadingNUse',readingUse);if(base)base.value=classFee||'';if(discount)discount.value=Number(s.tuitionDiscountAmount||0)||0;if(reason)reason.value=s.tuitionDiscountReason||'';calc();}catch(e){console.warn('[YMS] load student registration defaults',e);}
  }

  function resetNew(){if(document.getElementById('acctEditId')?.value||document.getElementById('acctLinkedStudentId')?.value)return;lastLoaded='';const start=document.getElementById('acctStartDate'),base=document.getElementById('acctTuitionBaseAmount'),discount=document.getElementById('acctTuitionDiscountAmount'),reason=document.getElementById('acctTuitionDiscountReason');if(start)start.value='';setChoice('acctVehicleUse',false);setChoice('acctReadingNUse',false);if(base)base.value='';if(discount)discount.value='0';if(reason)reason.value='';calc();}
  function syncEdit(force=true){if(!roleIsStudent())return;const row=document.getElementById('acctStudentRow');if(row)row.style.display='';install();loadExisting(force);}
  function bindRole(){const role=document.getElementById('acctRole');if(!role||role.dataset.ymsExtrasRoleBound==='1')return;role.addEventListener('change',()=>{install();if(roleIsStudent())setTimeout(()=>syncEdit(true),0);});role.dataset.ymsExtrasRoleBound='1';}
  function watchEditState(){
    const panel=document.getElementById('acctPanel'),edit=document.getElementById('acctEditId')?.value||'',sid=document.getElementById('acctLinkedStudentId')?.value||'',key=`${edit}|${sid}|${roleIsStudent()}`;
    if(panel&&!panel.classList.contains('hidden')&&roleIsStudent()){
      const row=document.getElementById('acctStudentRow');if(row)row.style.display='';install();
      if(key!==lastEditKey){lastEditKey=key;setTimeout(()=>syncEdit(true),0);setTimeout(()=>syncEdit(true),120);}
    }else if(key!==lastEditKey){lastEditKey=key;if(!edit&&!sid)resetNew();}
  }
  function tick(){install();bindRole();watchEditState();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick);else tick();
  window.addEventListener('load',()=>{tick();setTimeout(tick,200);setTimeout(tick,700);});
  setInterval(watchEditState,250);
  window.YMS_syncStudentAccountExtras=()=>syncEdit(true);
})();
