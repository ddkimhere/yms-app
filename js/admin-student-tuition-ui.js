/* YMS admin student registration extras: start date + vehicle use + default tuition */
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
        <div style="font-size:12px;font-weight:800;color:#1E3278;margin-bottom:10px;">📅 수업 시작 · 🚐 차량 · 💳 기본 수강료</div>
        <div class="form-group" style="margin:0 0 10px;">
          <label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label>
          <input type="date" class="form-input" id="acctStartDate" required>
        </div>
        <div class="form-group" style="margin:0 0 12px;">
          <label class="form-label">🚐 차량 이용</label>
          <div id="acctVehicleUseGroup" style="display:flex;gap:8px;margin-top:6px;">
            <label style="flex:1;cursor:pointer;">
              <input type="radio" name="acctVehicleUse" value="true" style="position:absolute;opacity:0;pointer-events:none;">
              <span class="yms-vehicle-choice" style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">유</span>
            </label>
            <label style="flex:1;cursor:pointer;">
              <input type="radio" name="acctVehicleUse" value="false" checked style="position:absolute;opacity:0;pointer-events:none;">
              <span class="yms-vehicle-choice" style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">무</span>
            </label>
          </div>
          <div style="font-size:10px;color:#7A87A8;margin-top:5px;">‘유’ 선택 학생은 차량 관리 대상에 자동 포함됩니다.</div>
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
    }

    const vehicleRadios=box.querySelectorAll('input[name="acctVehicleUse"]');
    const paintVehicle=()=>{
      vehicleRadios.forEach(r=>{
        const span=r.nextElementSibling;
        if(!span)return;
        if(r.checked){
          span.style.background='#1E3278';span.style.color='#fff';span.style.borderColor='#1E3278';
        }else{
          span.style.background='#fff';span.style.color='#506080';span.style.borderColor='#C8D1E8';
        }
      });
    };
    vehicleRadios.forEach(r=>{
      if(r.dataset.bound!=='1'){
        r.addEventListener('change',paintVehicle);
        r.dataset.bound='1';
      }
    });
    paintVehicle();

    const b=document.getElementById('acctTuitionBaseAmount');
    const d=document.getElementById('acctTuitionDiscountAmount');
    if(b&&!b.dataset.ymsCalcBound){b.addEventListener('input',calc);b.dataset.ymsCalcBound='1';}
    if(d&&!d.dataset.ymsCalcBound){d.addEventListener('input',calc);d.dataset.ymsCalcBound='1';}
    calc();
  }

  function setVehicleUse(value){
    const wanted=String(value===true||String(value).toLowerCase()==='true');
    const radio=document.querySelector(`input[name="acctVehicleUse"][value="${wanted}"]`);
    if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
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
      setVehicleUse(s.vehicleUse===true);
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
      if(start)start.value='';setVehicleUse(false);if(b)b.value='';if(d)d.value='0';if(r)r.value='';calc();
    }
  }

  function tick(){install();loadExisting();resetWhenNew();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick); else tick();
  window.addEventListener('load',()=>{tick();setTimeout(tick,200);setTimeout(tick,700);});
})();
