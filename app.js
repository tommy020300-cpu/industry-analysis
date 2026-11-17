/* 2023 한국은행 산업연관표 분석 웹앱 — 교육용, 정태적 분석 */
'use strict';

const $ = id => document.getElementById(id);
const labels = {large:'통합대분류', medium:'통합중분류', small:'통합소분류', basic:'기본부문'};
const excelFiles = {large:'io-large.xlsx', medium:'io-medium.xlsx', small:'io-small.xlsx', basic:'io-basic.xlsx'};
const state = {
  data:null, level:'large', view:'overview', sheet:0, rPage:0, cPage:0,
  request:0, scenarios:[], result:null, worker:null, workerFailed:false, checkId:0
};
const formatter = new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const fmt = n => Number.isFinite(n)?formatter.format(n):'—';
const cv = n => Number.isFinite(n)?n.toFixed(3):'—';
const num = v => v===null||v===undefined||v===''?0:Number(v)||0;
const esc = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const data = () => state.data;
const sectors = () => data()?.sectors??[];
const nn = () => sectors().length;
const sheet = index => data()?.sheets[index];
const indexOf = id => {
  const i=Number($(id).value);
  return Number.isInteger(i)&&i>=0&&i<nn()?i:-1;
};
const getValue = (tab,r,c) => num(sheet(tab)?.values?.[r]?.[c]);
function colSum(tab,col){let total=0;for(let i=0;i<nn();i++)total+=getValue(tab,i,col);return total;}
function findSector(parts,fallback=0){let i=sectors().findIndex(x=>parts.some(p=>x.name.includes(p)));return i<0?Math.min(fallback,nn()-1):i;}
function status(text,kind=''){$('loadStatus').textContent=text;$('loadStatus').className='load-status '+kind;}
function fillSelect(id,selected=0,term=''){
  const select=$(id), normalized=term.trim().toLowerCase();
  const rows=sectors().map((s,i)=>({s,i})).filter(({s})=>!normalized||(s.code+' '+s.name).toLowerCase().includes(normalized));
  select.innerHTML=rows.length?rows.map(({s,i})=>`<option value="${i}">${esc(s.code)} · ${esc(s.name)}</option>`).join(''):'<option value="" disabled>검색 결과가 없습니다</option>';
  select.disabled=!rows.length;
  const value=rows.some(x=>x.i===selected)?selected:rows[0]?.i;
  if(value!==undefined)select.value=String(value);
}
function resetFilters(){document.querySelectorAll('[data-filter-target]').forEach(el=>el.value='');}
function filterSectorInput(e){
  const target=e.target.dataset.filterTarget,selected=indexOf(target);
  fillSelect(target,selected,e.target.value);
  if(target==='netIndustry')renderNetwork();
  if(target==='compA'||target==='compB')renderCompare();
}
async function loadData(){
  const level=$('levelSelect').value,req=++state.request;
  state.level=level;
  status(`${labels[level]} 자료 불러오는 중…`);
  $('loadBtn').disabled=true;
  $('excelLink').href='data/source/'+excelFiles[level];
  try{
    const response=await fetch(`data/processed/${level}.json`,{cache:'no-cache'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const parsed=await response.json();
    if(req!==state.request)return;
    const expected={large:33,medium:83,small:165,basic:380}[level];
    if(parsed.sectors?.length!==expected||parsed.sheets?.length!==12)throw Error('산업 분류 또는 시트 개수가 올바르지 않습니다.');
    if([6,7,8].some(i=>!parsed.sheets[i]?.values?.length))throw Error('유발계수 자료가 없습니다.');
    state.data=parsed;state.sheet=0;state.rPage=0;state.cPage=0;
    state.scenarios=[];state.result=null;resetFilters();
    const a=findSector(['음식점','음식','육류']);
    const b=findSector(['운송장비','자동차','컴퓨터'],1);
    for(const [id,j] of [['simIndustry',a],['netIndustry',a],['compA',a],['compB',b]])fillSelect(id,j);
    $('sheetSelect').innerHTML=parsed.sheets.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.name)}</option>`).join('');
    $('sectorCount').innerHTML=`${nn()}<small>개</small>`;
    $('sectorCaption').textContent=`${labels[level]} · 2023년 자료`;
    $('cellDetail').textContent='수치 셀을 선택하면 행·열 코드와 원자료 값이 표시됩니다.';
    clearSimError();renderScenarioList();renderOverview();renderNetwork();renderCompare();renderExplorer();
    $('simResults').innerHTML='<div class="zero-state">시나리오를 추가하고 파급효과 계산을 실행하세요.</div>';
    $('downloadSimCsv').disabled=true;
    status(`자료 준비 완료 · ${nn()}개 산업 · 12개 시트`,'ok');
  }catch(error){
    if(req===state.request){state.data=null;status('자료 로딩 실패: '+error.message+' · 새로고침 후 다시 시도하세요.','error');}
    console.error(error);
  }finally{if(req===state.request)$('loadBtn').disabled=false;}
}
function activate(name){
  state.view=name;
  document.querySelectorAll('.tab').forEach(el=>{
    const active=el.dataset.view===name;el.classList.toggle('is-active',active);el.setAttribute('aria-selected',String(active));
  });
  document.querySelectorAll('.view').forEach(el=>{const active=el.id==='view-'+name;el.hidden=!active;el.classList.toggle('is-active',active);});
}
function bars(items,limit=10,unit='',secondary=false){
  if(!items.length)return '<div class="zero-state">해당하는 데이터가 없습니다.</div>';
  const sample=items.slice(0,limit),max=Math.max(1e-9,...sample.map(v=>Math.abs(v.value)));
  return sample.map((item,i)=>`<div class="bar-row"><span class="bar-label" title="${esc(item.name)}"><span class="bar-rank">${i+1}</span><span class="bar-label-text">${esc(item.name)}</span></span><span class="bar-track"><span class="bar-fill ${secondary?'alt':''}" style="width:${Math.max(1,Math.min(100,Math.abs(item.value)/max*100))}%"></span></span><span class="bar-value">${unit==='배'?cv(item.value):fmt(item.value)}${unit}</span></div>`).join('');
}
function simpleTable(headings,rows){
  return `<table class="plain-table"><thead><tr>${headings.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,j)=>`<td>${j===0?'<b>':''}${esc(x)}${j===0?'</b>':''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderOverview(){
  if(!data())return;
  const ranking=sectors().map((s,i)=>({name:s.name,value:colSum(6,i)})).sort((a,b)=>b.value-a.value);
  $('rankBars').innerHTML=bars(ranking,10,'배');$('rankBars').classList.remove('empty-spot');
  const picks=['음식점','운송장비','금융','보건','교육','기계','전자','건설'].map(x=>findSector([x]));
  const unique=[...new Set(picks)];
  $('sectorOverviewTable').innerHTML=simpleTable(['산업','생산','부가가치','수입'],unique.map(i=>[sectors()[i].name,cv(colSum(6,i)),cv(colSum(8,i)),cv(colSum(7,i))]));
  $('sectorOverviewTable').classList.remove('empty-spot');
}

/* 여러 산업 수요 충격을 하나의 벡터로 합산하여 유발계수 행렬을 곱한다. */
function clearSimError(){$('simError').hidden=true;$('simError').textContent='';}
function showSimError(text){$('simError').textContent=text;$('simError').hidden=false;}
function invalidateSimulation(){
  state.result=null;$('downloadSimCsv').disabled=true;
  $('simResults').innerHTML='<div class="zero-state">시나리오가 변경되었습니다. 파급효과 계산을 실행하세요.</div>';
}
function readScenarioForm(){
  if(!data())return null;
  const j=indexOf('simIndustry'),amount=Number($('simAmount').value);
  if(j<0){showSimError('산업이 선택되지 않았습니다. 검색 결과에서 산업을 선택하세요.');return null;}
  if($('simAmount').value.trim()===''||!Number.isFinite(amount)||amount<=0||amount>1e8){showSimError('수요 증가액은 0보다 크고 1억 이하의 숫자로 입력하세요. (단위: 억 원)');return null;}
  clearSimError();return {j,amount};
}
function addScenario(){
  const input=readScenarioForm();if(!input)return false;
  const existing=state.scenarios.find(s=>s.j===input.j);
  if(existing){if(existing.amount+input.amount>1e8){showSimError('동일 산업의 합산 수요 증가액이 입력 상한을 초과합니다.');return false;}existing.amount+=input.amount;}
  else if(state.scenarios.length>=50){showSimError('한 번에 최대 50개 산업까지 추가할 수 있습니다.');return false;}
  else state.scenarios.push(input);
  renderScenarioList();invalidateSimulation();return true;
}
function removeScenario(j){state.scenarios=state.scenarios.filter(s=>s.j!==j);clearSimError();renderScenarioList();invalidateSimulation();}
function clearScenarios(){state.scenarios=[];clearSimError();renderScenarioList();invalidateSimulation();}
function renderScenarioList(){
  const list=$('scenarioList'),total=state.scenarios.reduce((a,x)=>a+x.amount,0);
  $('scenarioCount').textContent=`${state.scenarios.length}개`;
  $('scenarioTotal').textContent=`총 ${fmt(total)}억 원`;
  list.innerHTML=state.scenarios.length?state.scenarios.map(s=>`<div class="scenario-item"><span><span class="scenario-code">${esc(sectors()[s.j]?.code)}</span><span class="scenario-name">${esc(sectors()[s.j]?.name)}</span></span><span class="scenario-amount">+${fmt(s.amount)}억 원</span><button class="delete-scenario" type="button" data-remove="${s.j}" aria-label="${esc(sectors()[s.j]?.name)} 시나리오 삭제">삭제</button></div>`).join(''):'<p class="muted-message">추가된 산업이 없습니다. 위에서 산업을 선택해 추가하세요.</p>';
}
function calculateScenarios(items){
  const n=nn();const prod=new Float64Array(n),imp=new Float64Array(n),va=new Float64Array(n);
  let demand=0;
  for(const {j,amount} of items){
    demand+=amount;
    for(let i=0;i<n;i++){
      prod[i]+=getValue(6,i,j)*amount;
      imp[i]+=getValue(7,i,j)*amount;
      va[i]+=getValue(8,i,j)*amount;
    }
  }
  const sum=a=>a.reduce((t,x)=>t+x,0);
  return {demand,prod,imp,va,totalProd:sum(prod),totalImp:sum(imp),totalVa:sum(va)};
}
function runSimulation(){
  if(!data())return;
  if(!state.scenarios.length&&!addScenario())return;
  const inputs=state.scenarios.map(x=>({...x}));
  const result=calculateScenarios(inputs);
  state.result={inputs,...result};
  const rank=Array.from(result.prod,(v,i)=>({name:sectors()[i].name,value:v})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const inactive=inputs.filter(({j})=>Math.abs(colSum(6,j))<1e-12);
  const inactiveNote=inactive.length?`<p class="pill-note"><b>원자료 주의:</b> ${inactive.map(({j})=>esc(sectors()[j].name)).join(', ')}은(는) 2023년 생산유발계수 열이 0으로 기록된 부문입니다. 국내 생산이 없는 수입 중심 품목 등은 이 국산품 최종수요 모형으로 효과를 산출할 수 없습니다. 결과를 일반적인 국내 생산 증가 전망으로 해석하지 마세요.</p>`:'';
  const metric=(title,value,color,detail)=>`<article class="result-card ${color}"><h4>${title}</h4><strong>${fmt(value)}<small>억 원</small></strong><p>${detail}</p></article>`;
  $('simResults').innerHTML=`<div class="result-kpis">
    ${metric('총 생산유발액',result.totalProd,'',`수요 1억 원당 ${cv(result.totalProd/result.demand)}억 원`)}
    ${metric('총 부가가치유발액',result.totalVa,'green',`수요 1억 원당 ${cv(result.totalVa/result.demand)}억 원`)}
    ${metric('총 수입유발액',result.totalImp,'purple',`수요 1억 원당 ${cv(result.totalImp/result.demand)}억 원`)}
  </div><div class="result-grid">
    <article class="panel"><div class="panel-heading"><div><h3>생산유발액 상위 12개 산업</h3><p>선택한 최종수요 증가가 전산업에 유발한 생산액 · 억 원</p></div><span class="tag">${labels[state.level]}</span></div><div class="chart-bars">${bars(rank,12)}</div></article>
    <article class="panel"><div class="panel-heading"><div><h3>분석 요약</h3><p>선택한 ${inputs.length}개 산업의 국산품 최종수요 증가</p></div></div>
      <div class="micro-kpis"><div class="micro-item"><small>총 최종수요 증가액</small><strong>${fmt(result.demand)}억 원</strong></div><div class="micro-item"><small>수요 1억 원당 생산유발액</small><strong>${cv(result.totalProd/result.demand)}억 원</strong></div><div class="micro-item"><small>분석 산업 수</small><strong>${inputs.length}개</strong></div></div>
      <p class="pill-note"><b>결과 해석:</b> 2023년 생산·수입·부가가치유발계수 행렬을 적용한 정태적 추정치입니다. 기술, 가격, 생산능력이 일정하다고 가정합니다. 실제 GDP나 고용의 증가를 의미하지 않습니다.</p>
      ${inactiveNote}
      <p class="pill-note" id="engineStatus">계산: JavaScript 행렬 곱. Python 교차검증은 별도 엔진 연결이 가능할 때 수행됩니다.</p>
    </article></div>`;
  $('downloadSimCsv').disabled=false;
  pythonCheck(inputs,result);
}
function pythonCheck(inputs,result){
  if(state.workerFailed)return;
  try{
    if(!state.worker){
      state.worker=new Worker('worker.js');
      state.worker.addEventListener('message',e=>{
        if(e.data?.requestId!==state.checkId)return;
        const target=$('engineStatus');if(!target)return;
        if(e.data?.error){state.workerFailed=true;target.textContent='계산: JavaScript (Python 검증 서비스 연결 실패)';return;}
        if(e.data?.kind==='result'){
          const isMatch=['totalProd','totalImp','totalVa'].every(k=>Math.abs(result[k]-e.data[k])<=Math.max(1e-6,Math.abs(result[k])*1e-7));
          target.textContent=isMatch?'계산 확인: JavaScript·Pyodide(Python) 결과 일치':'교차검증 불일치: 원자료 및 계산을 다시 확인하세요.';
        }
      });
      state.worker.onerror=()=>{state.workerFailed=true;const el=$('engineStatus');if(el)el.textContent='계산: JavaScript (Python 검증 서비스 연결 실패)';};
    }
    const requestId=++state.checkId;
    const jobs=inputs.map(({j,amount})=>({amount,
      prod:Array.from({length:nn()},(_,i)=>getValue(6,i,j)),
      imp:Array.from({length:nn()},(_,i)=>getValue(7,i,j)),
      va:Array.from({length:nn()},(_,i)=>getValue(8,i,j))}));
    state.worker.postMessage({kind:'calculate',requestId,items:jobs});
  }catch(e){state.workerFailed=true;console.warn('Pyodide 검증 연결 불가',e);}
}
function renderNetwork(){
  if(!data())return;
  const j=indexOf('netIndustry');if(j<0){$('netSummary').innerHTML='';$('supplierBars').innerHTML='';$('buyerBars').innerHTML='';return;}
  const domestic=sheet(2).values,imported=sheet(1).values;
  const suppliers=sectors().map((s,i)=>({name:s.name,value:num(domestic[i]?.[j])})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const buyers=sectors().map((s,i)=>({name:s.name,value:num(domestic[j]?.[i])})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const d=suppliers.reduce((a,x)=>a+x.value,0);
  const m=sectors().reduce((a,s,i)=>a+num(imported[i]?.[j]),0);
  $('netSummary').innerHTML=`<div class="micro-item"><small>국산 중간재 투입액</small><strong>${fmt(d/1e6)}조 원</strong></div><div class="micro-item"><small>수입 중간재 투입액</small><strong>${fmt(m/1e6)}조 원</strong></div><div class="micro-item"><small>중간재 투입 중 수입 비중</small><strong>${d+m>0?fmt(m/(d+m)*100):'—'}%</strong></div>`;
  $('supplierBars').innerHTML=bars(suppliers,10);$('buyerBars').innerHTML=bars(buyers,10,'',true);
}
function renderCompare(){
  if(!data())return;
  const a=indexOf('compA'),b=indexOf('compB');
  if(a<0||b<0){$('compareResult').innerHTML='<div class="zero-state">비교할 산업을 각각 선택하세요.</div>';return;}
  if(a===b){$('compareResult').innerHTML='<div class="zero-state">다른 두 산업을 선택하면 계수 차이를 비교할 수 있습니다.</div>';return;}
  const fields=[['생산유발계수',6],['부가가치유발계수',8],['수입유발계수',7],['총 중간투입계수',3],['수입 중간투입계수',4]];
  const lines=fields.map(([name,tab])=>({name,a:colSum(tab,a),b:colSum(tab,b)}));
  const max=Math.max(1e-9,...lines.flatMap(x=>[x.a,x.b]));
  $('compareResult').innerHTML=`<article class="panel compare-card"><div class="compare-header"><div class="compare-ind"><small>산업 A · ${esc(sectors()[a].code)}</small><strong>${esc(sectors()[a].name)}</strong></div><div class="compare-ind"><small>산업 B · ${esc(sectors()[b].code)}</small><strong>${esc(sectors()[b].name)}</strong></div></div><div class="metric-comparison">${lines.map(x=>`<div class="metric-row"><div class="metric-side"><span class="metric-num">${cv(x.a)}</span><span class="metric-bar"><span class="metric-inside" style="width:${Math.max(0,x.a/max*100)}%"></span></span></div><div class="metric-title">${esc(x.name)}</div><div class="metric-side right"><span class="metric-num">${cv(x.b)}</span><span class="metric-bar"><span class="metric-inside" style="width:${Math.max(0,x.b/max*100)}%"></span></span></div></div>`).join('')}</div><p class="pill-note"><b>해석:</b> 중간투입계수는 산출 1단위당 중간재 투입 비율이며, 유발계수는 최종수요 1단위 증가가 전산업에 유발하는 직접·간접 효과입니다. 모든 지표는 무차원입니다.</p></article>`;
}

const ROWS_PER_PAGE=16,COLS_PER_PAGE=8;
function filterExplorer(){
  const s=sheet(state.sheet);if(!s)return {rows:[],cols:[]};
  const rowTerm=$('searchRows').value.trim().toLowerCase();
  const colTerm=$('searchCols').value.trim().toLowerCase();
  const rows=s.rowNames.map((_,i)=>i).filter(i=>(String(s.rowCodes[i])+' '+s.rowNames[i]).toLowerCase().includes(rowTerm));
  const cols=s.columns.map((_,i)=>i).filter(i=>(String(s.columns[i].code)+' '+s.columns[i].name).toLowerCase().includes(colTerm));
  return {rows,cols};
}
function displayValue(v,unit){
  if(v===null||v===undefined||v==='')return '—';
  const n=Number(v);return Number.isFinite(n)?(unit==='백만원'?fmt(n):n.toFixed(6)):esc(v);
}
function renderExplorer(){
  if(!data())return;
  const s=sheet(state.sheet),{rows,cols}=filterExplorer();
  const maxRowPage=Math.max(0,Math.ceil(rows.length/ROWS_PER_PAGE)-1);
  const maxColPage=Math.max(0,Math.ceil(cols.length/COLS_PER_PAGE)-1);
  state.rPage=Math.max(0,Math.min(maxRowPage,state.rPage));
  state.cPage=Math.max(0,Math.min(maxColPage,state.cPage));
  const visibleRows=rows.slice(state.rPage*ROWS_PER_PAGE,(state.rPage+1)*ROWS_PER_PAGE);
  const visibleCols=cols.slice(state.cPage*COLS_PER_PAGE,(state.cPage+1)*COLS_PER_PAGE);
  $('explorerCount').textContent=`${s.name} · 검색 결과 ${rows.length}행 × ${cols.length}열`;
  $('explorerUnit').textContent=s.unit==='백만원'?'금액 단위: 백만원':'계수: 무차원';
  $('explorerTable').innerHTML=`<table><thead><tr><th>행 코드 / 이름</th>${visibleCols.map(i=>`<th title="${esc(s.columns[i].name)}">${esc(s.columns[i].code)}<br>${esc(s.columns[i].name).replaceAll('\n',' ')}</th>`).join('')}</tr></thead><tbody>${visibleRows.map(r=>`<tr><td title="${esc(s.rowNames[r])}"><b>${esc(s.rowCodes[r])}</b> ${esc(s.rowNames[r]).replaceAll('\n',' ')}</td>${visibleCols.map(c=>`<td data-r="${r}" data-c="${c}" tabindex="0" aria-label="${esc(s.rowNames[r])}에서 ${esc(s.columns[c].name)}의 수치">${displayValue(s.values[r]?.[c],s.unit)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${visibleCols.length+1}">검색 결과가 없습니다.</td></tr>`}</tbody></table>`;
  $('rowPage').textContent=`행 ${rows.length?state.rPage+1:0}/${rows.length?maxRowPage+1:0}`;
  $('colPage').textContent=`열 ${cols.length?state.cPage+1:0}/${cols.length?maxColPage+1:0}`;
  $('prevRow').disabled=state.rPage<=0;$('nextRow').disabled=state.rPage>=maxRowPage;
  $('prevCol').disabled=state.cPage<=0;$('nextCol').disabled=state.cPage>=maxColPage;
}
function showCellDetails(cell){
  const r=Number(cell.dataset.r),c=Number(cell.dataset.c),s=sheet(state.sheet);if(!s||!s.columns[c])return;
  $('explorerTable').querySelectorAll('.is-selected-cell').forEach(el=>el.classList.remove('is-selected-cell'));
  cell.classList.add('is-selected-cell');
  const val=s.values[r]?.[c];
  $('cellDetail').innerHTML=`<div class="cell-detail-grid"><div><span>행 (공급 항목)</span><strong>${esc(s.rowCodes[r])} · ${esc(s.rowNames[r])}</strong></div><div><span>열 (사용 항목)</span><strong>${esc(s.columns[c].code)} · ${esc(s.columns[c].name)}</strong></div><div><span>원자료 값 (${s.unit==='백만원'?'백만원':'무차원'})</span><strong>${displayValue(val,s.unit)}</strong></div></div>`;
}
function downloadText(filename,lines){
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const quoteCsv=v=>'"'+String(v??'').replaceAll('"','""')+'"';
function downloadCSV(){
  if(!data())return;
  const s=sheet(state.sheet),{rows,cols}=filterExplorer();
  const lines=[['행 코드','행 이름',...cols.map(i=>s.columns[i].code+' '+s.columns[i].name)].map(quoteCsv).join(',')];
  for(const r of rows)lines.push([s.rowCodes[r],s.rowNames[r],...cols.map(c=>s.values[r]?.[c]??'')].map(quoteCsv).join(','));
  downloadText(`2023_${state.level}_${state.sheet+1}_원자료.csv`,lines);
}
function downloadSimulationCSV(){
  const x=state.result;if(!x)return;
  const lines=[['구분','산업 코드','산업명','값','단위'].map(quoteCsv).join(',')];
  for(const item of x.inputs)lines.push(['수요 증가액',sectors()[item.j].code,sectors()[item.j].name,item.amount,'억 원'].map(quoteCsv).join(','));
  for(const [name,key] of [['총 생산유발액','totalProd'],['총 부가가치유발액','totalVa'],['총 수입유발액','totalImp']])lines.push([name,'전산업','합계',x[key],'억 원'].map(quoteCsv).join(','));
  for(let i=0;i<nn();i++)for(const [name,key] of [['생산유발액','prod'],['부가가치유발액','va'],['수입유발액','imp']])lines.push([name,sectors()[i].code,sectors()[i].name,x[key][i],'억 원'].map(quoteCsv).join(','));
  downloadText(`2023_${state.level}_파급효과_결과.csv`,lines);
}
function init(){
  $('levelSelect').addEventListener('change',loadData);
  $('loadBtn').addEventListener('click',loadData);
  document.querySelectorAll('[data-filter-target]').forEach(input=>input.addEventListener('input',filterSectorInput));
  $('addScenarioBtn').addEventListener('click',addScenario);
  $('simBtn').addEventListener('click',runSimulation);
  $('simAmount').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addScenario();}});
  $('scenarioList').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(button)removeScenario(Number(button.dataset.remove));});
  $('clearScenarios').addEventListener('click',clearScenarios);
  $('downloadSimCsv').addEventListener('click',downloadSimulationCSV);
  $('netIndustry').addEventListener('change',renderNetwork);
  ['compA','compB'].forEach(id=>$(id).addEventListener('change',renderCompare));
  $('compBtn').addEventListener('click',renderCompare);
  $('sheetSelect').addEventListener('change',()=>{state.sheet=Number($('sheetSelect').value);state.rPage=0;state.cPage=0;$('searchRows').value='';$('searchCols').value='';$('cellDetail').textContent='수치 셀을 선택하면 행·열 코드와 원자료 값이 표시됩니다.';renderExplorer();});
  $('searchRows').addEventListener('input',()=>{state.rPage=0;renderExplorer();});
  $('searchCols').addEventListener('input',()=>{state.cPage=0;renderExplorer();});
  $('prevRow').addEventListener('click',()=>{state.rPage--;renderExplorer();});
  $('nextRow').addEventListener('click',()=>{state.rPage++;renderExplorer();});
  $('prevCol').addEventListener('click',()=>{state.cPage--;renderExplorer();});
  $('nextCol').addEventListener('click',()=>{state.cPage++;renderExplorer();});
  $('exportCsv').addEventListener('click',downloadCSV);
  $('explorerTable').addEventListener('click',e=>{const cell=e.target.closest('td[data-r][data-c]');if(cell)showCellDetails(cell);});
  $('explorerTable').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const cell=e.target.closest('td[data-r][data-c]');if(cell){e.preventDefault();showCellDetails(cell);}}});
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    activate(t.dataset.view);
    const main=document.getElementById('mainContent');
    if(main)main.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }));
  activate('overview');loadData();
}
window.addEventListener('DOMContentLoaded',init);
