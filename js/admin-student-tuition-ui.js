/* YMS admin student registration extras: start date + due day + vehicle + ReadingN + tuition */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const READING_N_FEE=10000;
  let lastLoaded='';
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
  const isStudent=()=>String(document.getElementById('acctRole')?.value||'').toUpperCase()==='STUDENT';

  function selected(name){return document.querySelector(`input[name="${name}"]:checked`)?.value==='true';}
  function paintChoice(name){
    document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
      const span=r.nextElementSibling;if(!span)return;
      if(r.checked){span.style.background='#1E3278';span.style.color='#fff';span.style.borderColor='#1E3278';}
      else{span.style.background='#fff';span.style.color='#506080';span.style.borderColor='#C8D1E8';}
    });
  }
  function setChoice(name,value){
    const wanted=String(value===true||String(value).toLowerCase()==='true');
    const radio=document.querySelector(`input[name="${name}"][value="${wanted}"]`);
    if(radio){radio.checked=true;paintChoice(name);}
  }
  function calc(){
    const core=Math.max(0,Number(document.getElementById('acctTuitionBaseAmount')?.value)||0);
    const reading=selected('acctReadingNUse')?READING_N_FEE:0;
    const gross=core+reading;
    const discount=Math.min(gross,Math.max(0,Number(document.getElementById('acctTuitionDiscountAmount')?.value)||0));
    const final=Math.max(0,gross-discount);
    const el=document.getElementById('acctTuitionPreview');if(!el)return;
    let txt=`수업료 ${money(core)}`;
    if(reading)txt+=` + ReadingN ${money(reading)}`;
    txt+=` = 기본 수강료 ${money(gross)}`;
    if(discount)txt+=` - 할인 ${money(discount)} = 최종 ${money(final)}`;
    el.textContent=txt;
  }
  function choice(name,label,help){return `<div class="form-group" style="margin:0 0 12px;"><label class="form-label">${label}</label><div style="display:flex;gap:8px;margin-top:6px;"><label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="true" style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">유</span></label><label style="flex:1;cursor:pointer;"><input type="radio" name="${name}" value="false" checked style="position:absolute;opacity:0;pointer-events:none;"><span style="display:flex;align-items:center;justify-content:center;height:40px;border:1.5px solid #C8D1E8;border-radius:11px;background:#fff;color:#506080;font-size:12px;font-weight:800;">무</span></label></div><div style="font-size:10px;color:#7A87A8;margin-top:5px;">${help}</div></div>`;}
  function dueOptions(){return '<option value="">— 납입일 선택 —</option>'+Array.from({length:31},(_,i)=>`<option value="${i+1}">매월 ${i+1}일</option>`).join('');}
  function markup(){return `<div style="font-size:12px;font-weight:900;color:#1E3278;margin-bottom:12px;">📅 수업 시작 · 💳 납입일 · 🚐 차량 · 📚 ReadingN · 수강료</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;"><div class="form-group" style="margin:0;"><label class="form-label">수업 시작일 <span style="color:#E04040;">*</span></label><input type="date" class="form-input" id="acctStartDate"></div><div class="form-group" style="margin:0;"><label class="form-label">수강료 납입일 <span style="color:#E04040;">*</span></label><select class="form-input form-select" id="acctTuitionDueDay">${dueOptions()}</select></div></div>${choice('acctVehicleUse','🚐 차량 이용','‘유’ 선택 학생은 차량 관리 대상에 포함됩니다.')}${choice('acctReadingNUse','📚 ReadingN 사용','사용 시 기본 수강료에 10,000원이 자동 추가됩니다.')}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="form-group" style="margin:0;"><label class="form-label">수업 기본 수강료</label><input type="number" class="form-input" id="acctTuitionBaseAmount" min="0" step="500" inputmode="numeric" placeholder="예) 250000"></div><div class="form-group" style="margin:0;"><label class="form-label">할인 금액</label><input type="number" class="form-input" id="acctTuitionDiscountAmount" min="0" step="500" inputmode="numeric" value="0" placeholder="0"></div></div><div class="form-group" style="margin:10px 0 0;"><label class="form-label">할인 사유</label><input type="text" class="form-input" id="acctTuitionDiscountReason" placeholder="예) 형제 할인"></div><div id="acctTuitionPreview" style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff;color:#1E3278;font-size:11px;font-weight:800;">기본 수강료 0원</div>`;}

  function install(){
    const row=document.getElementById('acctStudentRow');if(!row)return null;
    const host=row.firstElementChild||row;
    let box=document.getElementById('acctStudentTuitionBox');
    if(!box){box=document.createElement('div');box.id='acctStudentTuitionBox';box.innerHTML=markup();}
    if(box.parentElement!==host)host.appendChild(box);
    box.style.cssText='display:block;margin-top:14px;padding-top:14px;border-top:1px solid #C5D3F5;';
    row.style.display=isStudent()?'':'none';
    box.style.display=isStudent()?'block':'none';
    ['acctVehicleUse','acctReadingNUse'].forEach(name=>{
      box.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
        if(r.dataset.bound==='1')return;
        r.addEventListener('change',()=>{paintChoice(name);calc();});r.dataset.bound='1';
      });paintChoice(name);
    });
    const base=document.getElementById('acctTuitionBaseAmount'),disc=document.getElementById('acctTuitionDiscountAmount');
    if(base&&!base.dataset.bound){base.addEventListener('input',calc);base.dataset.bound='1';}
    if(disc&&!disc.dataset.bound){disc.addEventListener('input',calc);disc.dataset.bound='1';}
    calc();return box;
  }

  function clearExtras(){
    lastLoaded='';
    const start=document.getElementById('acctStartDate'),due=document.getElementById('acctTuitionDueDay'),base=document.getElementById('acctTuitionBaseAmount'),disc=document.getElementById('acctTuitionDiscountAmount'),reason=document.getElementById('acctTuitionDiscountReason');
    if(start)start.value='';if(due)due.value='';if(base)base.value='';if(disc)disc.value='0';if(reason)reason.value='';
    setChoice('acctVehicleUse',false);setChoice('acctReadingNUse',false);calc();
  }

  async function loadExisting(force=false){
    install();if(!isStudent())return;
    const sid=document.getElementById('acctLinkedStudentId')?.value||'';
    if(!sid)return;
    if(!force&&sid===lastLoaded)return;
    lastLoaded=sid;
    try{
      const r=await _tFetch(`tables/students/${encodeURIComponent(sid)}`,{cache:'no-store'});if(!r.ok)return;
      const s=await r.json();
      const reading=s.readingNUse===true;
      const storedBase=Math.max(0,Number(s.tuitionBaseAmount||0));
      const core=Number(s.tuitionCoreAmount||0)||(reading?Math.max(0,storedBase-READING_N_FEE):storedBase);
      const start=document.getElementById('acctStartDate'),due=document.getElementById('acctTuitionDueDay'),base=document.getElementById('acctTuitionBaseAmount'),disc=document.getElementById('acctTuitionDiscountAmount'),reason=document.getElementById('acctTuitionDiscountReason');
      if(start)start.value=String(s.startDate||s.classStartDate||'').slice(0,10);
      if(due)due.value=String(Number(s.tuitionDueDay||0)||'');
      setChoice('acctVehicleUse',s.vehicleUse===true);setChoice('acctReadingNUse',reading);
      if(base)base.value=core||'';if(disc)disc.value=Number(s.tuitionDiscountAmount||0)||0;if(reason)reason.value=s.tuitionDiscountReason||'';
      calc();
    }catch(e){console.warn('[YMS] student extras load failed',e);}
  }

  function syncEdit(){
    if(!isStudent())return;
    const row=document.getElementById('acctStudentRow');if(row)row.style.display='';
    install();loadExisting(true);
  }

  function bindRole(){
    const role=document.getElementById('acctRole');if(!role||role.dataset.ymsExtras==='1')return;
    role.addEventListener('change',()=>{
      install();
      if(isStudent()){
        const edit=document.getElementById('acctEditId')?.value||'';
        if(edit)setTimeout(syncEdit,80);else clearExtras();
      }
    });
    role.dataset.ymsExtras='1';
  }

  function bindEditClicks(){
    if(document.documentElement.dataset.ymsStudentEditClicks==='1')return;
    document.documentElement.dataset.ymsStudentEditClicks='1';
    document.addEventListener('click',e=>{
      const btn=e.target.closest('#acctTableBody button');
      if(!btn||!/수정/.test(btn.textContent||''))return;
      setTimeout(()=>{install();syncEdit();},0);
      setTimeout(syncEdit,120);
      setTimeout(syncEdit,350);
    },true);
  }

  function bindStudentExtrasSave(){
    const form=document.getElementById('acctForm');if(!form||form.dataset.ymsStudentExtrasSaveBound==='1')return;
    form.dataset.ymsStudentExtrasSaveBound='1';
    form.addEventListener('submit',function(e){
      if(!isStudent())return;
      const startDate=String(document.getElementById('acctStartDate')?.value||'').trim();
      if(!startDate){
        e.preventDefault();e.stopImmediatePropagation();window.YMS_UI?.toast?.('❌ 수업 시작일을 입력해주세요');return;
      }
      const dueDay=Number(document.getElementById('acctTuitionDueDay')?.value||0);
      if(!(dueDay>=1&&dueDay<=31)){
        e.preventDefault();e.stopImmediatePropagation();window.YMS_UI?.toast?.('❌ 수강료 납입일을 선택해주세요');return;
      }
      const vehicleUse=selected('acctVehicleUse'),base=window._tFetch;if(typeof base!=='function'||base.__ymsStudentExtrasWrapper)return;
      let restored=false;const restore=()=>{if(!restored&&window._tFetch===wrapped){restored=true;window._tFetch=base;}};
      const wrapped=async function(path,opt={}){const method=String(opt?.method||'GET').toUpperCase();if(String(path).startsWith('tables/students')&&(method==='POST'||method==='PATCH')){try{const body=typeof opt.body==='string'?JSON.parse(opt.body):(opt.body||{});body.vehicleUse=vehicleUse;body.tuitionDueDay=dueDay;opt={...opt,body:JSON.stringify(body)}}catch{}restore()}return base(path,opt)};
      wrapped.__ymsStudentExtrasWrapper=true;window._tFetch=wrapped;setTimeout(restore,5000);
    },true);
  }

  function init(){install();bindRole();bindEditClicks();bindStudentExtrasSave();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('load',()=>{init();setTimeout(init,250);});
  window.YMS_syncStudentAccountExtras=syncEdit;
})();
