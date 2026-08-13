/* YMS student account grade/school dropdowns */
(function(){
  'use strict';

  const GRADES = [
    '초1','초2','초3','초4','초5','초6',
    '중1','중2','중3',
    '고1','고2','고3'
  ];

  const SCHOOLS = [
    '부송초','한벌초','궁동초','어양초','마한초',
    '어양중','영등중','원광중','부송중','부천중',
    '원광고','이리여고','이일여고'
  ];

  function esc(v){
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function replaceInputWithSelect(id, options, placeholder){
    const old = document.getElementById(id);
    if(!old) return null;
    if(old.tagName === 'SELECT') return old;

    const current = String(old.value || '').trim();
    const select = document.createElement('select');
    select.id = id;
    select.className = old.className || 'form-input form-select';
    select.classList.add('form-select');
    if(old.required) select.required = true;

    let html = `<option value="">${esc(placeholder)}</option>`;
    html += options.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if(current && !options.includes(current)) {
      html += `<option value="${esc(current)}">${esc(current)}</option>`;
    }
    select.innerHTML = html;
    select.value = current;

    old.replaceWith(select);
    return select;
  }

  function install(){
    if(!location.pathname.endsWith('/admin.html')) return;
    replaceInputWithSelect('acctGrade', GRADES, '— 학년 선택 —');
    replaceInputWithSelect('acctSchoolName', SCHOOLS, '— 학교 선택 —');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', install);

  document.addEventListener('click', function(e){
    const t = e.target;
    if(t?.closest?.('[onclick*="showAddAcctPanel"]') || t?.closest?.('[onclick*="openEditAcct"]')) {
      setTimeout(install, 0);
      setTimeout(install, 100);
    }
  }, true);
})();
