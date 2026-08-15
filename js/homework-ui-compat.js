/* YMS homework page compatibility helpers */
(function(){
  'use strict';
  window.YMS_UI=window.YMS_UI||{};
  if(typeof window.YMS_UI.subjectEmoji!=='function'){
    window.YMS_UI.subjectEmoji=function(subject){
      const s=String(subject||'').toLowerCase();
      if(s.includes('영어')||s.includes('english'))return '📘';
      if(s.includes('수학')||s.includes('math'))return '📐';
      if(s.includes('국어'))return '📖';
      if(s.includes('과학'))return '🔬';
      if(s.includes('사회'))return '🌏';
      return '📝';
    };
  }
  if(typeof window.YMS_UI.badge!=='function'){
    window.YMS_UI.badge=function(badge){
      const b=String(badge||'NEW').toUpperCase();
      const map={
        'NEW':['NEW','#EEF3FB','#1E3278'],
        'D-1':['D-1','#FFF3E0','#C86A00'],
        'D-3':['D-3','#EEF7F2','#2E7D32'],
        'OVERDUE':['마감','#FFF0F0','#C62828']
      };
      const x=map[b]||map.NEW;
      return `<span class="chip" style="font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;background:${x[1]};color:${x[2]};white-space:nowrap;">${x[0]}</span>`;
    };
  }

  const validDate=v=>{const d=v instanceof Date?v:new Date(v);return Number.isNaN(d.getTime())?null:d;};
  window.YMS_Date=window.YMS_Date||{};
  if(typeof window.YMS_Date.fromNow!=='function'){
    window.YMS_Date.fromNow=function(v){
      const d=validDate(v);if(!d)return '';
      const diff=Date.now()-d.getTime(),min=Math.floor(diff/60000);
      if(min<1)return '방금 전';
      if(min<60)return `${min}분 전`;
      const hr=Math.floor(min/60);if(hr<24)return `${hr}시간 전`;
      const day=Math.floor(hr/24);if(day<7)return `${day}일 전`;
      return d.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});
    };
  }
  if(typeof window.YMS_Date.dueLabel!=='function'){
    window.YMS_Date.dueLabel=function(v){
      const d=validDate(v);if(!d)return '-';
      const today=new Date();today.setHours(0,0,0,0);
      const target=new Date(d);target.setHours(0,0,0,0);
      const diff=Math.round((target-today)/86400000);
      if(diff<0)return '마감';
      if(diff===0)return '오늘';
      if(diff===1)return '내일';
      return d.toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});
    };
  }
  if(typeof window.YMS_Date.format!=='function'){
    window.YMS_Date.format=function(v,opt={}){
      const d=validDate(v);if(!d)return '-';
      const o={month:'long',day:'numeric'};
      if(opt.showYear)o.year='numeric';
      return d.toLocaleDateString('ko-KR',o);
    };
  }
})();