/* YMS admin — separate tuition and book-fee JPG statements */
(function(){
  'use strict';
  if(!location.pathname.endsWith('/admin.html')) return;

  const READING_N_FEE=10000;
  const cfg=()=>window.YMS_FIREBASE_CONFIG||{projectId:'yms-app-bb735'};
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
  const escFile=v=>String(v||'학생').replace(/[\\/:*?"<>|]/g,'');
  const monthLabel=m=>{const p=String(m||'').split('-');return p.length===2?`${p[0]}년 ${Number(p[1])}월`:String(m||'');};
  const text=(ctx,v,x,y,size=34,weight=500,color='#1A2340',align='left')=>{ctx.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"Noto Sans KR","Segoe UI",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(v??''),x,y);};
  const round=(ctx,x,y,w,h,r,fill,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}};
  let activeStudentId='';

  function decodeVal(v){if(!v||typeof v!=='object')return null;if('stringValue'in v)return v.stringValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('booleanValue'in v)return v.booleanValue;if('timestampValue'in v)return v.timestampValue;return null;}
  function decodeDoc(d){const o={id:String(d?.name||'').split('/').pop()};Object.entries(d?.fields||{}).forEach(([k,v])=>o[k]=decodeVal(v));return o;}

  async function queryBookFees(studentId){
    const token=window.YMS_Auth?.getToken?.();if(!token)throw new Error('로그인이 필요합니다.');
    const url=`https://firestore.googleapis.com/v1/projects/${cfg().projectId}/databases/(default)/documents:runQuery`;
    const body={structuredQuery:{from:[{collectionId:'bookFees'}],where:{fieldFilter:{field:{fieldPath:'studentId'},op:'EQUAL',value:{stringValue:String(studentId)}}},limit:300}};
    const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(`교재비 조회 실패 (HTTP ${r.status})`);
    return (await r.json()).filter(x=>x.document).map(x=>decodeDoc(x.document));
  }

  async function getStudent(studentId){
    const r=await window._tFetch?.(`tables/students/${encodeURIComponent(studentId)}`);
    if(!r?.ok) return null;
    return await r.json();
  }

  function hasReadingN(student){return student?.readingNUse===true||String(student?.readingNUse||'').toLowerCase()==='true';}

  async function saveBookFeeJpg(studentId,targetMonth){
    window.YMS_UI?.toast?.('교재비 내역서를 만들고 있습니다…');
    const [student,allFees]=await Promise.all([getStudent(studentId),queryBookFees(studentId)]);
    let fees=allFees.filter(f=>String(f.status||'REGISTERED')!=='CANCELLED'&&String(f.billingMonth||f.month||f.registeredAt||'').slice(0,7)===String(targetMonth)).sort((a,b)=>String(a.registrationDate||a.registeredAt||'').localeCompare(String(b.registrationDate||b.registeredAt||'')));
    const readingExists=fees.some(f=>/reading\s*n|readingn|리딩앤/i.test(String(f.bookName||f.memo||'')));
    if(hasReadingN(student)&&!readingExists){fees=[{id:'READING_N',studentId,studentName:student?.name||'',bookName:'ReadingN(리딩앤)',amount:READING_N_FEE,billingMonth:targetMonth,registrationDate:targetMonth+'-01',status:'REGISTERED'},...fees];}
    if(!fees.length){window.YMS_UI?.toast?.('이 달에는 등록된 교재비가 없습니다.');return;}

    const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
    ctx.fillStyle='#F4F7FD';ctx.fillRect(0,0,W,H);round(ctx,55,50,970,1250,38,'#FFFFFF','#E3E8F4');round(ctx,55,50,970,220,38,'#1E3278');ctx.fillRect(55,220,970,50);
    text(ctx,'YMS 부송관 영어',110,135,44,800,'#FFFFFF');text(ctx,'교재비 내역서',110,205,60,900,'#FFFFFF');
    text(ctx,student?.name||fees[0]?.studentName||'학생',110,340,48,900,'#14245A');text(ctx,`${monthLabel(targetMonth)} 교재비`,970,335,30,700,'#7492D5','right');if(student?.className)text(ctx,student.className,110,385,27,600,'#7A87A8');

    round(ctx,95,430,890,600,26,'#F8FAFE','#E3E8F4');
    text(ctx,'교재명',135,495,29,800,'#65718B');text(ctx,'금액',935,495,29,800,'#65718B','right');ctx.strokeStyle='#DCE4F3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(135,520);ctx.lineTo(935,520);ctx.stroke();
    let y=575;const maxRows=7;
    fees.slice(0,maxRows).forEach(f=>{const name=f.bookName||f.memo||'교재';text(ctx,name.length>22?name.slice(0,22)+'…':name,135,y,29,650,'#273453');text(ctx,money(f.amount),935,y,30,750,'#1A2340','right');y+=62;});
    if(fees.length>maxRows){text(ctx,`외 ${fees.length-maxRows}건`,135,y,25,650,'#7A87A8');}
    const total=fees.reduce((s,f)=>s+Number(f.amount||0),0);ctx.strokeStyle='#DCE4F3';ctx.beginPath();ctx.moveTo(135,955);ctx.lineTo(935,955);ctx.stroke();text(ctx,'교재비 합계',135,1010,34,850,'#14245A');text(ctx,money(total),935,1010,44,900,'#1E3278','right');
    text(ctx,'※ 교육비와 교재비는 별도 내역서로 안내됩니다.',110,1100,28,700,'#526080');text(ctx,'ReadingN(리딩앤) 이용료 10,000원은 교재비에 포함됩니다.',110,1150,24,600,'#7A87A8');text(ctx,'YMS 부송관 영어 · 문의 063-832-0219',540,1260,23,650,'#8A96B2','center');

    const a=document.createElement('a');a.href=c.toDataURL('image/jpeg',0.94);a.download=`${escFile(student?.name||fees[0]?.studentName)}_${targetMonth}_교재비내역.jpg`;document.body.appendChild(a);a.click();a.remove();
    window.YMS_UI?.toast?.('교재비 JPG 내역서가 저장되었습니다.');
  }

  function installTuitionSplit(){
    const oldPayload=window.downloadTuitionJpgPayload;
    if(typeof oldPayload==='function'&&!oldPayload.__splitTuition){
      const f=async function(payload){
        const p={...(payload||{})};
        let tuition=Number(p.tuitionAmount??p.amount??0);
        if(activeStudentId){
          try{
            const student=await getStudent(activeStudentId);
            if(hasReadingN(student)){
              const storedBase=Math.max(0,Number(student?.tuitionBaseAmount||0));
              const core=Math.max(0,Number(student?.tuitionCoreAmount||0))||Math.max(0,storedBase-READING_N_FEE);
              if(storedBase>0&&tuition>=storedBase-Number(student?.tuitionDiscountAmount||0)){
                const disc=Math.min(core,Math.max(0,Number(student?.tuitionDiscountAmount||0)));
                tuition=Math.max(0,core-disc);
                p.baseAmount=core;p.discountAmount=disc;
              }
            }
          }catch(e){console.warn('[YMS] ReadingN tuition split',e);}
        }
        p.extraAmount=0;p.amount=tuition;p.tuitionAmount=tuition;
        return oldPayload(p);
      };
      f.__splitTuition=true;window.downloadTuitionJpgPayload=f;
    }
    const oldMonth=window.YMS_downloadMonthJpg;
    if(typeof oldMonth==='function'&&!oldMonth.__splitStudentCapture){
      const g=function(studentId,targetMonth){activeStudentId=String(studentId||'');const r=oldMonth.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>{activeStudentId='';},0));return r;};
      g.__splitStudentCapture=true;window.YMS_downloadMonthJpg=g;
    }
  }

  function enhanceButtons(){
    installTuitionSplit();
    document.querySelectorAll('.yp-jpg-btn:not(.yp-book-jpg-btn)').forEach(btn=>{
      if(btn.dataset.splitReady==='1')return;
      btn.dataset.splitReady='1';btn.textContent='🖼 교육비 JPG';
      const onclick=btn.getAttribute('onclick')||'';
      const m=onclick.match(/YMS_downloadMonthJpg\('([^']+)','([^']+)'\)/);if(!m)return;
      const book=document.createElement('button');book.type='button';book.className='yp-jpg-btn yp-book-jpg-btn';book.dataset.splitReady='1';book.textContent='📚 교재비 JPG';book.onclick=()=>saveBookFeeJpg(m[1],m[2]);btn.after(book);
    });
  }

  window.YMS_downloadBookFeeJpg=saveBookFeeJpg;
  const obs=new MutationObserver(()=>enhanceButtons());
  function start(){const sec=document.getElementById('section-payments');if(sec){obs.observe(sec,{childList:true,subtree:true});enhanceButtons();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>setTimeout(start,500));
})();
