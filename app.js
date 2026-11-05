/* 한국은행 2023 산업연관표 기반 브라우저 분석 웹앱 */
'use strict';
const $=id=>document.getElementById(id);
const labels={large:'통합대분류',medium:'통합중분류',small:'통합소분류',basic:'기본부문'};
const src={large:'io-large.xlsx',medium:'io-medium.xlsx',small:'io-small.xlsx',basic:'io-basic.xlsx'};
const state={data:null,level:'large',view:'overview',sheet:0,rPage:0,cPage:0,request:0,worker:null,workerFailed:false};
const nf=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const fmt=n=>Number.isFinite(n)?nf.format(n):'—';
const cv=n=>Number.isFinite(n)?n.toFixed(3):'—';
const num=v=>v===null||v===undefined||v===''?0:Number(v)||0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=()=>state.data, sectors=()=>data()?.sectors??[], nn=()=>sectors().length, sheet=i=>data()?.sheets[i];
const idx=id=>{let i=Number($(id).value);return Number.isInteger(i)&&i>=0&&i<nn()?i:0;};
const value=(tab,r,c)=>num(sheet(tab)?.values[r]?.[c]);
function colSum(tab,j){let a=0;for(let i=0;i<nn();i++)a+=value(tab,i,j);return a;}
function findSector(words,def=0){let k=sectors().findIndex(s=>words.some(w=>s.name.includes(w)));return k<0?def:k;}
function status(msg,cls=''){$('loadStatus').textContent=msg;$('loadStatus').className='load-status '+cls;}
function fillSelect(id,index){$(id).innerHTML=sectors().map((s,i)=>`<option value="${i}">${esc(s.code)} · ${esc(s.name)}</option>`).join('');$(id).value=String(index);}
async function loadData(){
 const level=$('levelSelect').value,req=++state.request;state.level=level;
 status(`${labels[level]} 자료 불러오는 중…`);$('loadBtn').disabled=true;
 $('excelLink').href='data/source/'+src[level];
 try{const r=await fetch(`data/processed/${level}.json`);if(!r.ok)throw Error('HTTP '+r.status);const obj=await r.json();
 if(req!==state.request)return;
 if(obj.sheets?.length!==12||!obj.sectors?.length)throw Error('12개 시트 자료 구조 오류');
 state.data=obj;state.sheet=0;state.rPage=0;state.cPage=0;
 const a=findSector(['음식점','음식','육류']),b=findSector(['운송장비','자동차','컴퓨터'],1);
 [['simIndustry',a],['netIndustry',a],['compA',a],['compB',b]].forEach(z=>fillSelect(...z));
 $('sheetSelect').innerHTML=obj.sheets.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.name)}</option>`).join('');
 $('sectorCount').innerHTML=`${nn()}<small>개</small>`;
 $('sectorCaption').textContent=`${labels[level]} · 한국은행 2023`;
 status(`● 불러오기 완료 · ${nn()}개 산업 · 12개 시트`,'ok');
 renderOverview();renderNetwork();renderCompare();renderExplorer();
 $('simResults').innerHTML='<div class="zero-state">산업과 수요 증가액을 설정한 뒤 <b>파급효과 계산</b>을 누르세요.</div>';
 }catch(e){if(req===state.request){state.data=null;status('데이터 로딩 실패: '+e.message+' (GitHub Pages 주소에서 다시 열어주세요.)','error');}console.error(e)}
 finally{if(req===state.request)$('loadBtn').disabled=false;}
}
function activate(name){state.view=name;document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('is-active',t.dataset.view===name));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('is-active',v.id==='view-'+name));}
function bars(items,max=10,unit='',alt=false){
 if(!items.length)return '<div class="zero-state">표시할 거래가 없습니다.</div>';
 const m=Math.max(0.000001,...items.slice(0,max).map(x=>Math.abs(x.value)));
 return items.slice(0,max).map((x,i)=>`<div class="bar-row"><span class="bar-label" title="${esc(x.name)}"><span class="bar-rank">${i+1}</span><span class="bar-label-text">${esc(x.name)}</span></span><div class="bar-track"><div class="bar-fill ${alt?'alt':''}" style="width:${Math.max(1,Math.min(100,Math.abs(x.value)/m*100))}%"></div></div><span class="bar-value">${unit==='배'?cv(x.value):fmt(x.value)}${unit}</span></div>`).join('');
}
function simpleTable(headers,rows){return `<table class="plain-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<td>${i===0?'<b>':''}${esc(x)}${i===0?'</b>':''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function renderOverview(){if(!data())return;
 const rank=sectors().map((s,i)=>({name:s.name,value:colSum(6,i)})).sort((a,b)=>b.value-a.value);
 $('rankBars').innerHTML=bars(rank,10,'배');$('rankBars').classList.remove('empty-spot');
 const a=[findSector(['음식점']),findSector(['운송장비','자동차']),findSector(['금융']),findSector(['보건']),findSector(['교육']),findSector(['기계']),findSector(['전자']),findSector(['건설'])];
 $('sectorOverviewTable').innerHTML=simpleTable(['산업','생산','부가가치','수입'],[...new Set(a)].map(i=>[sectors()[i].name,cv(colSum(6,i)),cv(colSum(8,i)),cv(colSum(7,i))]));
 $('sectorOverviewTable').classList.remove('empty-spot');
}
function calc(j,amount){const vals={};for(let [key,tab] of [['prod',6],['imp',7],['va',8]]){vals[key]=Array.from({length:nn()},(_,i)=>value(tab,i,j)*amount);vals['total'+key.charAt(0).toUpperCase()+key.slice(1)]=vals[key].reduce((x,y)=>x+y,0);}return vals;}
function runSimulation(){if(!data())return;let j=idx('simIndustry'),amount=Number($('simAmount').value);
 if(!Number.isFinite(amount)||amount<=0||amount>1e8){alert('금액은 0보다 크고 1억 이하의 억 원 단위 숫자로 입력하세요.');return;}
 let x=calc(j,amount),ranking=x.prod.map((v,i)=>({name:sectors()[i].name,value:v})).sort((a,b)=>b.value-a.value);
 function metric(h,v,cls,c){return `<article class="result-card ${cls}"><h4>${h}</h4><strong>${fmt(v)}<small>억 원</small></strong><p>${c}</p></article>`;}
 $('simResults').innerHTML=`<div class="result-kpis">${metric('총 생산유발액',x.totalProd,'','생산유발계수 '+cv(colSum(6,j)))}${metric('총 부가가치유발액',x.totalVa,'green','부가가치유발계수 '+cv(colSum(8,j)))}${metric('총 수입유발액',x.totalImp,'purple','수입유발계수 '+cv(colSum(7,j)))}</div><div class="result-grid"><article class="panel"><div class="panel-heading"><div><h3>산업별 생산유발액 TOP 12</h3><p>선택 산업의 수요 증가가 유발한 산출 · 억 원</p></div><span class="tag">${labels[state.level]}</span></div><div class="chart-bars">${bars(ranking.filter(x=>x.value>0),12)}</div></article><article class="panel"><div class="panel-heading"><div><h3>파급효과 분석</h3><p>선택 산업과 나머지 산업의 효과</p></div></div><div class="micro-kpis" style="grid-template-columns:1fr 1fr"><div class="micro-item"><small>선택 산업 유발액</small><strong>${fmt(x.prod[j])}억</strong></div><div class="micro-item"><small>다른 산업 유발액</small><strong>${fmt(x.totalProd-x.prod[j])}억</strong></div></div><div class="pill-note"><b>해석:</b> ${esc(sectors()[j].name)}의 국산품 최종수요가 ${fmt(amount)}억 원 증가한다고 가정한 정태적 유발효과입니다. 기술·가격·생산능력은 일정하며, 실제 고용 또는 GDP 증가를 직접 예측하지 않습니다.</div><div class="pill-note" id="engineStatus">계산 엔진: 원본 유발계수 행렬을 이용한 JavaScript 산술 (Python 선택적 교차검증)</div></article></div>`;
 pythonCheck(j,amount);
}
function pythonCheck(j,amount){
 if(state.workerFailed)return;
 try{if(!state.worker){state.worker=new Worker('worker.js');state.worker.addEventListener('message',e=>{let el=$('engineStatus');if(!el)return;if(e.data?.error){state.workerFailed=true;el.textContent='계산 엔진: JavaScript (Python CDN 연결 불가)';return;}if(e.data?.kind==='result'){let v=calc(e.data.j,e.data.amount);let ok=['totalProd','totalImp','totalVa'].every(k=>Math.abs(v[k]-e.data[k])<=Math.max(1e-6,Math.abs(v[k])*1e-7));el.textContent=ok?'계산 엔진: JavaScript + Pyodide(Python) 교차검증 완료':'Python 교차검증 불일치: 데이터를 다시 확인하세요.';}});state.worker.onerror=()=>{state.workerFailed=true;};}
 state.worker.postMessage({kind:'calculate',j,amount,prod:Array.from({length:nn()},(_,i)=>value(6,i,j)),imp:Array.from({length:nn()},(_,i)=>value(7,i,j)),va:Array.from({length:nn()},(_,i)=>value(8,i,j))});
 }catch(e){state.workerFailed=true;console.warn('Optional Python worker disabled',e);}
}
function renderNetwork(){if(!data())return;let j=idx('netIndustry'),dom=sheet(2).values,imp=sheet(1).values;
 let suppliers=sectors().map((s,i)=>({name:s.name,value:num(dom[i]?.[j])})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
 let buyers=sectors().map((s,i)=>({name:s.name,value:num(dom[j]?.[i])})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
 let d=suppliers.reduce((a,x)=>a+x.value,0),m=sectors().reduce((a,s,i)=>a+num(imp[i]?.[j]),0);
 $('netSummary').innerHTML=`<div class="micro-item"><small>국산 중간재 투입액</small><strong>${fmt(d/1e6)}조 원</strong></div><div class="micro-item"><small>수입 중간재 투입액</small><strong>${fmt(m/1e6)}조 원</strong></div><div class="micro-item"><small>수입 중간투입 비중</small><strong>${d+m>0?fmt(m/(d+m)*100):'—'}%</strong></div>`;
 $('supplierBars').innerHTML=bars(suppliers,10);$('buyerBars').innerHTML=bars(buyers,10,'',true);
}
function renderCompare(){if(!data())return;let a=idx('compA'),b=idx('compB');
 let fields=[['생산유발계수',6],['부가가치유발계수',8],['수입유발계수',7],['총 중간투입계수',3],['수입 중간투입계수',4]];
 let lines=fields.map(([label,tab])=>({label,a:colSum(tab,a),b:colSum(tab,b)})),m=Math.max(.0001,...lines.flatMap(x=>[x.a,x.b]));
 $('compareResult').innerHTML=`<article class="panel compare-card"><div class="compare-header"><div class="compare-ind"><small>INDUSTRY A · ${esc(sectors()[a].code)}</small><strong>${esc(sectors()[a].name)}</strong></div><div class="compare-ind"><small>INDUSTRY B · ${esc(sectors()[b].code)}</small><strong>${esc(sectors()[b].name)}</strong></div></div><div class="metric-comparison">${lines.map(x=>`<div class="metric-row"><div class="metric-side"><span class="metric-num">${cv(x.a)}</span><span class="metric-bar"><span class="metric-inside" style="width:${Math.max(0,x.a/m*100)}%"></span></span></div><div class="metric-title">${esc(x.label)}</div><div class="metric-side right"><span class="metric-num">${cv(x.b)}</span><span class="metric-bar"><span class="metric-inside" style="width:${Math.max(0,x.b/m*100)}%"></span></span></div></div>`).join('')}</div><p class="pill-note"><b>참고:</b> 중간투입계수는 산출 1단위에 투입되는 중간재의 비율입니다. 유발계수는 최종수요 1단위 증가에 따른 산업 전체의 직·간접 효과입니다.</p></article>`;
}
const PERROW=16,PERCOL=8;
function exploreFilter(){let s=sheet(state.sheet);if(!s)return {rows:[],cols:[]};
 let rq=$('searchRows').value.trim().toLowerCase(),cq=$('searchCols').value.trim().toLowerCase();
 return {rows:s.rowNames.map((_,i)=>i).filter(i=>(s.rowCodes[i]+' '+s.rowNames[i]).toLowerCase().includes(rq)),cols:s.columns.map((_,i)=>i).filter(i=>(s.columns[i].code+' '+s.columns[i].name).toLowerCase().includes(cq))};}
function tval(v,unit){if(v===null||v===undefined)return '—';let n=Number(v);return Number.isFinite(n)?unit==='백만원'?fmt(n):n.toFixed(6):esc(v);}
function renderExplorer(){if(!data())return;
 const s=sheet(state.sheet),{rows,cols}=exploreFilter(),rp=Math.max(0,Math.ceil(rows.length/PERROW)-1),cp=Math.max(0,Math.ceil(cols.length/PERCOL)-1);
 state.rPage=Math.max(0,Math.min(rp,state.rPage));state.cPage=Math.max(0,Math.min(cp,state.cPage));
 let rs=rows.slice(state.rPage*PERROW,(state.rPage+1)*PERROW),cs=cols.slice(state.cPage*PERCOL,(state.cPage+1)*PERCOL);
 $('explorerCount').textContent=`${s.name} · ${rows.length}행 × ${cols.length}열`;
 $('explorerUnit').textContent='단위: '+(s.unit==='백만원'?'백만원':'계수 (무차원)');
 $('explorerTable').innerHTML=`<table><thead><tr><th>산업코드 / 산업명</th>${cs.map(i=>`<th title="${esc(s.columns[i].name)}">${esc(s.columns[i].code)}<br>${esc(s.columns[i].name).replaceAll('\n',' ')}</th>`).join('')}</tr></thead><tbody>${rs.map(r=>`<tr><td title="${esc(s.rowNames[r])}"><b>${esc(s.rowCodes[r])}</b> ${esc(s.rowNames[r]).replaceAll('\n',' ')}</td>${cs.map(c=>`<td>${tval(s.values[r]?.[c],s.unit)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cs.length+1}">검색 결과가 없습니다.</td></tr>`}</tbody></table>`;
 $('rowPage').textContent=`행 ${state.rPage+1}/${rp+1}`;$('colPage').textContent=`열 ${state.cPage+1}/${cp+1}`;
 $('prevRow').disabled=state.rPage<=0;$('nextRow').disabled=state.rPage>=rp;$('prevCol').disabled=state.cPage<=0;$('nextCol').disabled=state.cPage>=cp;
}
function downloadCSV(){if(!data())return;
 const s=sheet(state.sheet),{rows,cols}=exploreFilter();
 const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
 let lines=[['산업코드','산업명',...cols.map(i=>s.columns[i].code+' '+s.columns[i].name)].map(q).join(',')];
 for(const r of rows){lines.push([s.rowCodes[r],s.rowNames[r],...cols.map(c=>s.values[r]?.[c]??'')].map(q).join(','));}
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`2023_${state.level}_${state.sheet+1}_data.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function init(){
 $('levelSelect').addEventListener('change',loadData);$('loadBtn').addEventListener('click',loadData);
 $('simBtn').addEventListener('click',runSimulation);$('simAmount').addEventListener('keydown',e=>{if(e.key==='Enter')runSimulation();});
 $('netIndustry').addEventListener('change',renderNetwork);
 ['compA','compB'].forEach(id=>$(id).addEventListener('change',renderCompare));$('compBtn').addEventListener('click',renderCompare);
 $('sheetSelect').addEventListener('change',()=>{state.sheet=Number($('sheetSelect').value);state.rPage=0;state.cPage=0;$('searchRows').value='';$('searchCols').value='';renderExplorer();});
 $('searchRows').addEventListener('input',()=>{state.rPage=0;renderExplorer();});$('searchCols').addEventListener('input',()=>{state.cPage=0;renderExplorer();});
 $('prevRow').addEventListener('click',()=>{state.rPage--;renderExplorer();});$('nextRow').addEventListener('click',()=>{state.rPage++;renderExplorer();});
 $('prevCol').addEventListener('click',()=>{state.cPage--;renderExplorer();});$('nextCol').addEventListener('click',()=>{state.cPage++;renderExplorer();});
 $('exportCsv').addEventListener('click',downloadCSV);
 document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>activate(t.dataset.view)));
 loadData();
}
window.addEventListener('DOMContentLoaded',init);
