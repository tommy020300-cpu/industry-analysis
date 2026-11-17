import { useEffect, useMemo, useState, type ReactNode, type ComponentType, type SVGProps } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen,
  Check, ChevronLeft, ChevronRight, CircleAlert, Database, FileSpreadsheet,
  GitBranch, LayoutDashboard, Menu, Plus, RefreshCcw, Search, SlidersHorizontal,
  Table2, Trash2, X, ChartNoAxesCombined, BarChart3, Layers3, Sparkles, ShieldCheck, CircleHelp,
} from "lucide-react";
import { TdsCheckIcon } from "@/components/TossfaceAsset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculate, columnSum, csvDownload, cv, downloadResult, entry, fmt, levels, numeric, ranking, sectorMatches, topBuyers, topSuppliers, validateData, type ImpactResult, type IOData, type IOSheet, type Level, type Scenario } from "@/lib/io";

type View = "overview" | "simulator" | "network" | "compare" | "explorer" | "method";
type IconType = ComponentType<SVGProps<SVGSVGElement>>;
const menus:{value:View;name:string;hint:string;icon:IconType}[] = [
  {value:"overview",name:"한눈에 보기",hint:"Overview",icon:LayoutDashboard},
  {value:"simulator",name:"파급효과 계산",hint:"Simulation",icon:Activity},
  {value:"network",name:"산업 연결 살펴보기",hint:"Industry Network",icon:GitBranch},
  {value:"compare",name:"두 산업 비교",hint:"Benchmark",icon:ArrowLeftRight},
  {value:"explorer",name:"원자료 찾기",hint:"Data Explorer",icon:Table2},
  {value:"method",name:"자료와 계산 방법",hint:"Methodology",icon:BookOpen},
];
const expected={production:1.827,valueAdded:.752,imported:.248};
const colors=["#3182F6","#5FA2FF","#86B8FF","#B3D3FF"];

type UiIcon = "overview" | "simulator" | "network" | "compare" | "explorer" | "method";
const pageImage: Record<string, UiIcon> = { "01":"overview", "02":"simulator", "03":"network", "04":"compare", "05":"explorer", "06":"method" };
function IllustratedIcon({name,small=false}:{name:UiIcon;small?:boolean}) {
  return <span className={`illustrated-icon ${small?"illustrated-icon-small":""}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/icons/${name}.webp`} alt="" width={small?42:54} height={small?42:54} loading="lazy" decoding="async"/></span>;
}
function Kicker({children}: {children:ReactNode}) { return <div className="eyebrow">{children}</div>; }
function SectionTitle({index,title,desc,aside}:{index:string;title:string;desc:string;aside?:ReactNode}) { const image=pageImage[index.slice(0,2)]||"overview"; return <div className="section-head section-head-with-icon"><IllustratedIcon name={image}/><div className="section-head-copy"><Kicker>{index}</Kicker><h2>{title}</h2><p>{desc}</p></div>{aside&&<div className="head-aside">{aside}</div>}</div> }
function Metric({label,value,detail,icon:Icon,color="green"}:{label:string;value:string;detail:string;icon:IconType;color?:string}) { const image:UiIcon=label.includes("산업")?"network":label.includes("수입")?"explorer":label.includes("부가가치")?"compare":"overview"; return <Card className={`metric metric-${color}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><IllustratedIcon name={image} small/><Icon size={18} className="metric-icon-fallback" aria-hidden="true"/></span></div><div className="metric-value">{value}</div><div className="metric-sub">{detail}</div></Card>; }
function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><Database size={25} strokeWidth={1.6}/><strong>{title}</strong>{children&&<p>{children}</p>}</div>}

const featuredTerms=["음식","건설","금융","자동차","반도체","보건","교육","기계","화학","운송"];
function DataSelect({data,value,onChange,filter,onFilter,placeholder="산업명이나 코드를 입력해 보세요",label="어떤 산업을 고를까요?"}:{data:IOData;value:number;onChange:(j:number)=>void;filter:string;onFilter:(s:string)=>void;placeholder?:string;label?:string}) {
  const [expanded,setExpanded]=useState(false);
  const [visibleCount,setVisibleCount]=useState(12);
  useEffect(()=>{setExpanded(false);setVisibleCount(12)},[data]);
  const featured=useMemo(()=>{
    const found=featuredTerms.map(term=>data.sectors.findIndex(s=>s.name.includes(term))).filter(i=>i>=0);
    return [...new Set([...found,...data.sectors.map((_,i)=>i)])].slice(0,8);
  },[data]);
  const matches=useMemo(()=>data.sectors.map((s,i)=>({...s,i})).filter(s=>sectorMatches(s,filter)),[data,filter]);
  const popular=(!filter.trim()&&!expanded)?featured.map(i=>({...data.sectors[i],i})):matches.slice(0,expanded?visibleCount:12);
  const chosen=data.sectors[value];
  const choose=(i:number)=>{onChange(i);onFilter("");setExpanded(false);setVisibleCount(12)};
  return <div className="guided-picker">
    <div className="picker-topline"><div><span className="picker-icon"><Search size={17}/></span><strong>{label}</strong></div><span className="picker-hint">버튼을 누르면 바로 선택돼요</span></div>
    <div className="search-field picker-search"><Search size={19}/><Input value={filter} onChange={e=>{const q=e.target.value;onFilter(q);setExpanded(false);setVisibleCount(12)}} placeholder={placeholder} aria-label={`${label} 검색`}/>{filter&&<button type="button" className="picker-clear" aria-label="검색어 지우기" onClick={()=>{onFilter("");setExpanded(false);setVisibleCount(12)}}><X size={17}/></button>}</div>
    <div className="picker-options" role="group" aria-label="산업을 선택해 보세요">
      {popular.map(item=><button type="button" key={item.i} className={`picker-option ${value===item.i?"selected":""}`} aria-pressed={value===item.i} title={`${item.code} · ${item.name}`} onClick={()=>choose(item.i)}><span className="picker-option-label">{item.name}</span>{value===item.i?<Check size={17}/>:<ArrowRight size={16}/>}</button>)}
      {!popular.length&&<div className="picker-empty">검색한 산업이 없어요. 다른 이름이나 코드를 입력해 볼까요?</div>}
    </div>
    <div className="picker-more-actions">{matches.length>popular.length&&<button type="button" className="picker-more" onClick={()=>{if(!expanded){setExpanded(true);setVisibleCount(24)}else setVisibleCount(n=>Math.min(matches.length,n+24))}}>{filter.trim()?`검색 결과 ${matches.length}개 중 더 보기`:`다른 산업도 찾아보기 (${data.sectors.length}개)`}<ChevronRight size={16}/></button>}{expanded&&<button type="button" className="picker-more" onClick={()=>{setExpanded(false);setVisibleCount(12)}}>간단히 보기</button>}</div>
    {chosen&&<div className="picker-selected"><span className="picker-selected-check"><Check size={18}/></span><div><small>지금 고른 산업</small><strong>{chosen.name}</strong><span>산업코드 {chosen.code}</span></div></div>}
  </div>
}

function DownloadSource({level}:{level:Level}) {return <a className="source-link" href={`${import.meta.env.BASE_URL}data/source/${levels[level].file}`} download><FileSpreadsheet size={15}/> 원본 엑셀 <ArrowDownToLine size={14}/></a>}
function SvgNodeName({name,x,y,max=10}:{name:string;x:number;y:number;max?:number}){
  const letters=Array.from(name);const lines:string[]=[];
  for(let i=0;i<letters.length;i+=max)lines.push(letters.slice(i,i+max).join(""));
  const fontSize=lines.length>3?9:10;
  const spacing=fontSize+1;
  return <text textAnchor="middle" fill="#333D4B" fontSize={fontSize} fontWeight="700" y={y-((lines.length-1)*spacing/2)}>{lines.map((line,i)=><tspan key={i} x={x} dy={i===0?0:spacing}>{line}</tspan>)}</text>;
}
function TradeFlow({data,sector,mode="wide"}:{data:IOData;sector:number;mode?:"wide"|"compact"}) {
  const s=data.sectors[sector]??data.sectors[0];
  const suppliers=topSuppliers(data,sector,4);const buyers=topBuyers(data,sector,4);
  const leftYs=[52,117,182,247],rightYs=[52,117,182,247];
  const normalize=(v:number,max:number)=>Math.max(1,Math.min(6,1.3+v/Math.max(max,1)*4.5));
  const maxL=Math.max(...suppliers.map(x=>x.value),1),maxR=Math.max(...buyers.map(x=>x.value),1);
  return <div className={`flow-viz ${mode}`}>
    <div className="flow-caption"><div><span className="tiny-caps">산업 간 거래</span><h3>{s.name}의 거래 흐름</h3></div><Badge>단위: 백만원</Badge></div>
    <svg viewBox="0 0 690 300" role="img" aria-label={`${s.name}의 주요 공급·구매 산업 연결도`}>
      <rect x="0" y="0" width="690" height="300" rx="18" fill="#f5f9ff"/>
      <text x="22" y="23" className="flow-label">중간재 공급</text><text x="523" y="23" className="flow-label">중간재 구매</text>
      <path d="M345 65L345 248" stroke="#e8eaef" strokeWidth="1" strokeDasharray="4 6"/>
      {suppliers.map((item,i)=><g key={`s-${item.index}`}><path d={`M155 ${leftYs[i]} C242 ${leftYs[i]} 252 150 311 150`} stroke="#3182F6" strokeWidth={normalize(item.value,maxL)} opacity={.33+i*.05} fill="none"/><rect x="17" y={leftYs[i]-27} rx="12" width="139" height="54" fill="#eaf2ff" stroke="#bfd4f3"/><SvgNodeName x={86} y={leftYs[i]} max={11} name={item.name}/><title>{item.name} · {fmt(item.value)} 백만원</title></g>)}
      <rect x="289" y="118" width="112" height="64" rx="13" fill="#215FC5"/>
      <text x="345" y="142" textAnchor="middle" fill="#D7E8FF" fontSize="10">FOCUS</text>
      <foreignObject x="298" y="147" width="94" height="31"><div style={{color:"#fff",fontSize:10,fontWeight:800,lineHeight:1.15,textAlign:"center",overflowWrap:"anywhere"}}>{s.name}</div></foreignObject>
      {buyers.map((item,i)=><g key={`b-${item.index}`}><path d={`M401 150 C456 150 467 ${rightYs[i]} 528 ${rightYs[i]}`} stroke="#75A9F8" strokeWidth={normalize(item.value,maxR)} opacity={.4+i*.04} fill="none"/><rect x="527" y={rightYs[i]-27} rx="12" width="146" height="54" fill="#eef5ff" stroke="#c8dcf5"/><SvgNodeName x={600} y={rightYs[i]} max={11} name={item.name}/><title>{item.name} · {fmt(item.value)} 백만원</title></g>)}
    </svg>
    <div className="flow-footnote">국산거래표 기준 · 왼쪽은 공급 산업, 오른쪽은 구매 산업이에요</div>
  </div>
}

/** 모든 산업 이름을 생략 없이 보여주는 데이터 막대 차트. */
function RankedBars({rows,unit="",height: _height}:{rows:{name:string;value:number}[];unit?:string;height?:number}){
  const largest=Math.max(0,...rows.map(x=>x.value));
  return <div className="ranked-list" role="list" aria-label="산업별 순위 차트 · 산업 이름 전체 표시">
    {rows.map((row,i)=><div className="ranked-row" role="listitem" key={`${i}-${row.name}`}>
      <div className="ranked-name"><span className={`rank-number ${i<3?"top":""}`}>{String(i+1).padStart(2,"0")}</span><span>{row.name}</span></div>
      <div className="ranked-track" role="img" aria-label={`${row.name}: ${fmt(row.value,3)} ${unit}`}><span className={`ranked-fill ${i<3?"is-top":""}`} style={{width:`${Math.max(row.value>0?1.5:0,Math.min(100,largest>0?row.value/largest*100:0))}%`}}/></div>
      <strong className="ranked-value">{fmt(row.value,3)}{unit&&<small> {unit}</small>}</strong>
    </div>)}
    {!rows.length&&<div className="picker-empty">표시할 산업이 없어요.</div>}
  </div>
}

function WelcomeHero({data,onNav}:{data:IOData|null;onNav:(s:View)=>void}) {
  return <section className="welcome-hero" aria-label="IO Studio 소개">
    <div className="welcome-copy">
      <div className="welcome-eyebrow"><span className="welcome-eyebrow-rule"/>2023 한국은행 산업연관표</div>
      <h1>한 산업의 변화가<br/><span>경제에 미치는 영향은?</span></h1>
      <p>산업을 선택하고 수요가 얼마나 늘어나는지 알려주세요. 생산·부가가치·수입에 미치는 영향을 보기 쉽게 계산해 드려요.</p>
      <div className="welcome-actions">
        <Button size="lg" onClick={()=>onNav("simulator")}>파급효과 계산하기 <ArrowRight size={19}/></Button>
        <Button size="lg" variant="outline" onClick={()=>onNav("explorer")}>원자료 둘러보기 <ArrowUpRight size={18}/></Button>
      </div>
      <div className="welcome-trust"><TdsCheckIcon/><span>한국은행 자료를 바탕으로 계산해요</span><i aria-hidden="true"/><span>{data?`${data.sectors.length}개 산업 분석 가능`:'4가지 산업 분류 지원'}</span></div>
    </div>
    <div className="welcome-visual welcome-visual-compact" aria-hidden="true">
      <IllustratedIcon name="overview"/>
    </div>
    <div className="welcome-steps" aria-label="분석 이용 순서">
      <div><span>01</span><strong>산업을 선택해요</strong></div><ArrowRight size={17} aria-hidden="true"/>
      <div><span>02</span><strong>금액을 입력해요</strong></div><ArrowRight size={17} aria-hidden="true"/>
      <div><span>03</span><strong>결과를 확인해요</strong></div>
    </div>
  </section>;
}
function Overview({data,onNav,onFocus,focusSector}:{data:IOData;onNav:(s:View)=>void;onFocus:(j:number)=>void;focusSector:number}){
  const ranks=useMemo(()=>ranking(data,6,10),[data]);
  const [focusSearch,setFocusSearch]=useState("");
  useEffect(()=>{setFocusSearch("")},[data]);
  const picks=useMemo(()=>["음식점","운송장비","금융","보건","교육","기계","전자","건설"].map(s=>data.sectors.findIndex(x=>x.name.includes(s))).filter(j=>j>=0).filter((j,i,a)=>a.indexOf(j)===i),[data]);
  return <>
    <SectionTitle index="01 / OVERVIEW" title="우리 경제의 산업별 연결을 살펴보세요" desc="2023년 산업연관표를 바탕으로 계산한 핵심 숫자를 모았어요." aside={<Badge>2023 · 생산자가격</Badge>}/>
    <div className="metrics-grid">
      <Metric label="전산업 생산유발계수" value={cv(expected.production)} detail="최종수요 1단위당 총산출" icon={ChartNoAxesCombined}/>
      <Metric label="부가가치유발계수" value={cv(expected.valueAdded)} detail="최종수요 1단위당 부가가치" icon={Layers3} color="blue"/>
      <Metric label="수입유발계수" value={cv(expected.imported)} detail="최종수요 1단위당 수입" icon={ArrowLeftRight} color="amber"/>
      <Metric label="분석 대상 산업" value={fmt(data.sectors.length,0)} detail={`${levels[data.level].label} · 12개 시트`} icon={Database} color="neutral"/>
    </div>
    <div className="dashboard-main-grid">
      <Card className="analysis-card"><CardHeader><div><Kicker>산업 연결</Kicker><CardTitle>산업이 어디와 연결되는지 살펴보세요</CardTitle><CardDescription>어떤 산업에서 중간재를 사고파는지 확인해 보세요.</CardDescription></div></CardHeader><CardContent><div className="overview-picker"><DataSelect data={data} value={focusSector} onChange={onFocus} filter={focusSearch} onFilter={setFocusSearch} label="연결을 살펴볼 산업"/></div><TradeFlow data={data} sector={focusSector}/></CardContent><div className="card-bottom"><span>공급·구매 관계가 큰 산업부터 보여줘요</span><Button variant="ghost" size="sm" onClick={()=>onNav("network")}>산업 연결 자세히 보기 <ArrowRight size={14}/></Button></div></Card>
      <Card className="analysis-card"><CardHeader><div><Kicker>생산 파급효과</Kicker><CardTitle>생산유발계수 상위 10개 산업</CardTitle><CardDescription>수요가 1만큼 늘 때 생산이 얼마나 늘어나는지 볼 수 있어요.</CardDescription></div></CardHeader><CardContent><RankedBars rows={ranks} unit="배" height={365}/></CardContent><div className="card-bottom"><span>산업별 결과는 전산업 평균과 구분해 주세요</span><Button variant="ghost" size="sm" onClick={()=>onNav("compare")}>두 산업 비교 <ArrowRight size={14}/></Button></div></Card>
    </div>
    <div className="dashboard-secondary-grid">
      <Card className="analysis-card mini-table-card"><CardHeader><div><Kicker>두 산업 비교</Kicker><CardTitle>주요 산업 유발계수 비교</CardTitle><CardDescription>산업마다 생산·부가가치·수입 유발효과가 얼마나 다른지 볼 수 있어요.</CardDescription></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>산업</TableHead><TableHead className="numeric">생산</TableHead><TableHead className="numeric">부가가치</TableHead><TableHead className="numeric">수입</TableHead></TableRow></TableHeader><TableBody>{picks.map(j=><TableRow key={j}><TableCell>{data.sectors[j].name}</TableCell><TableCell className="numeric strong">{cv(columnSum(data,6,j))}</TableCell><TableCell className="numeric">{cv(columnSum(data,8,j))}</TableCell><TableCell className="numeric">{cv(columnSum(data,7,j))}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card className="analysis-card action-card"><CardHeader><div><Kicker>분석 바로가기</Kicker><CardTitle>어떤 분석을 해 볼까요?</CardTitle><CardDescription>원하는 분석을 골라 바로 시작하세요.</CardDescription></div></CardHeader><CardContent><div className="quick-actions">{[{label:"파급효과 계산",desc:"여러 산업을 한 번에 계산해요",to:"simulator" as View,icon:Activity},{label:"두 산업 비교",desc:"두 산업을 나란히 비교해요",to:"compare" as View,icon:BarChart3},{label:"원자료 찾기",desc:"12개 시트에서 원하는 값을 찾아요",to:"explorer" as View,icon:Table2}].map(a=><button className="quick-action" onClick={()=>onNav(a.to)} key={a.to}><span className="action-glyph"><IllustratedIcon name={a.to} small/></span><span><strong>{a.label}</strong><small>{a.desc}</small></span><ArrowUpRight size={18}/></button>)}</div></CardContent></Card>
    </div>
    <p className="data-note"><CircleAlert size={16}/> 전산업 평균과 개별 산업의 유발계수는 계산 기준이 달라요. 숫자를 비교할 때 이 점을 참고해 주세요.</p>
  </>
}
function Simulation({data}:{data:IOData}){
  const [search,setSearch]=useState("");const [sector,setSector]=useState(0);const [amount,setAmount]=useState("10");
  const [scenarios,setScenarios]=useState<Scenario[]>([]);const [result,setResult]=useState<ImpactResult|null>(null);const [error,setError]=useState("");
  useEffect(()=>{setSearch("");setSector(0);setScenarios([]);setResult(null);setError("")},[data]);
  const effectiveSector=sector;
  const total=scenarios.reduce((a,s)=>a+s.amount,0);
  const add=()=>{
    const a=Number(amount),j=effectiveSector;
    if(j===undefined){setError("먼저 분석할 산업을 선택해 주세요.");return;}
    if(amount.trim()==="" || !Number.isFinite(a)||a<=0||a>1e8){setError("0보다 큰 금액을 입력해 주세요. 입력 단위는 억 원이에요.");return;}
    const existing=scenarios.find(s=>s.j===j);
    if(existing&&existing.amount+a>1e8){setError("추가한 금액이 입력 범위를 넘었어요. 금액을 줄여 주세요.");return;}
    if(!existing&&scenarios.length>=50){setError("한 번에 산업 50개까지 추가할 수 있어요.");return;}
    setScenarios(p=>existing?p.map(s=>s.j===j?{...s,amount:s.amount+a}:s):[...p,{j,amount:a}]);setResult(null);setError("");
  };
  const run=()=>{
    let items=scenarios;
    if(!items.length){const a=Number(amount);if(effectiveSector===undefined||!Number.isFinite(a)||a<=0||a>1e8){setError("산업을 고르고 0보다 큰 금액을 입력해 주세요.");return;}items=[{j:effectiveSector,amount:a}];setScenarios(items);}
    try{setResult(calculate(data,items));setError("");}catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const list=result?data.sectors.map((s,i)=>({...s,value:result.prod[i]})).filter(s=>s.value>0).sort((a,b)=>b.value-a.value).slice(0,10):[];
  const inactive=result?.inputs.filter(s=>Math.abs(columnSum(data,6,s.j))<1e-12)??[];
  const demandRatio=result&&result.demand?Math.min(100,result.totalVa/result.demand*100):0;
  const importRatio=result&&result.demand?Math.min(100,result.totalImp/result.demand*100):0;
  return <>
    <SectionTitle index="02 / SIMULATOR" title="수요가 늘면 어떤 일이 생길까요?" desc="산업과 금액을 선택하면 생산·부가가치·수입에 미치는 영향을 계산해 드려요."/>
    <div className="sim-layout">
      <Card><CardHeader><div><Kicker>STEP 01</Kicker><CardTitle>어떤 산업의 수요가 늘어나나요?</CardTitle><CardDescription>산업과 금액을 입력해 주세요. 여러 산업을 함께 계산할 수도 있어요.</CardDescription></div></CardHeader><CardContent><div className="sim-form"><DataSelect data={data} value={sector} onChange={setSector} filter={search} onFilter={setSearch} label="먼저 산업을 골라 주세요"/>
          <div className="amount-panel"><div className="amount-heading"><span className="amount-mark">02</span><div><strong>수요는 얼마나 늘어나나요?</strong><p>금액을 눌러 빠르게 선택하거나 직접 입력해 보세요.</p></div></div>
          <div className="amount-presets" role="group" aria-label="수요 증가액 빠른 선택">{[10,50,100,1000].map(n=><button key={n} type="button" className={`amount-preset ${Number(amount)===n?"active":""}`} onClick={()=>setAmount(String(n))} aria-pressed={Number(amount)===n}>{fmt(n,0)}억 원</button>)}</div>
          <Field label="직접 금액 입력" note="단위: 억 원"><Input type="number" min="0.001" max="100000000" step="any" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}} /></Field></div>
          <Button onClick={add} size="lg" className="add-btn"><Plus size={19}/> 선택한 산업 추가하기</Button></div><div className="form-hint">10억 원이라면 10을 입력하세요. 같은 산업은 자동으로 합쳐져요.</div>{error&&<p role="alert" className="error-notice"><CircleAlert size={16}/>{error}</p>}</CardContent></Card>
      <Card className="scenario-box"><CardHeader><div><Kicker>STEP 02</Kicker><CardTitle>선택한 산업 <span className="count-text">{scenarios.length}개</span></CardTitle><CardDescription>총 수요 증가액 {fmt(total)}억 원</CardDescription></div><Badge>{scenarios.length}/50 산업</Badge></CardHeader><CardContent>{scenarios.length?<div className="scenario-list">{scenarios.map(s=><div className="scenario-row" key={s.j}><span className="scenario-sector"><small>{data.sectors[s.j].code}</small><b>{data.sectors[s.j].name}</b></span><strong>+{fmt(s.amount)}억 원</strong><Button size="icon" variant="ghost" aria-label={`${data.sectors[s.j].name} 삭제`} onClick={()=>{setScenarios(p=>p.filter(x=>x.j!==s.j));setResult(null)}}><X size={17}/></Button></div>)}</div>:<div className="scenario-empty"><Layers3 size={22}/><span>산업을 고르고 추가해 보세요.</span></div>}<div className="scenario-footer"><Button variant="ghost" size="sm" onClick={()=>{setScenarios([]);setResult(null);setError("")}} disabled={!scenarios.length}><Trash2 size={15}/> 처음부터 다시</Button><Button size="lg" className="sim-main-cta" onClick={run}>파급효과 계산하고 결과 보기 <ArrowRight size={19}/></Button></div></CardContent></Card>
    </div>
    {result?<>
      <div className="result-heading"><Kicker>계산 결과</Kicker><h3>경제적 파급효과</h3><Button variant="secondary" size="sm" onClick={()=>downloadResult(data,result,data.level)}><ArrowDownToLine size={15}/> 결과 내려받기</Button></div>
      <div className="metrics-grid results-grid"><Metric label="총 생산유발액" value={fmt(result.totalProd)} detail="억 원 · 직·간접 생산효과" icon={ChartNoAxesCombined}/><Metric label="부가가치유발액" value={fmt(result.totalVa)} detail="억 원 · 전산업 부가가치" icon={Layers3} color="blue"/><Metric label="수입유발액" value={fmt(result.totalImp)} detail="억 원 · 수입 유발" icon={ArrowLeftRight} color="amber"/><Metric label="최종수요가 늘어나는 금액" value={fmt(result.demand)} detail="억 원 · 합산 시나리오" icon={Plus} color="neutral"/></div>
      <div className="dashboard-main-grid results-detail"><Card className="analysis-card"><CardHeader><div><Kicker>생산 파급효과</Kicker><CardTitle>생산유발액이 큰 산업</CardTitle><CardDescription>최종수요 증가로 생긴 산업별 생산유발액을 보여줘요. · 억 원</CardDescription></div></CardHeader><CardContent><RankedBars rows={list} height={350}/></CardContent></Card><Card className="analysis-card"><CardHeader><div><Kicker>수요와 유발효과</Kicker><CardTitle>최종수요와 유발효과를 비교해요</CardTitle><CardDescription>부가가치와 수입유발액을 최종수요와 비교해 볼 수 있어요.</CardDescription></div></CardHeader><CardContent><div className="impact-ratio"><div className="ratio-circle" style={{background:`conic-gradient(#2a508e 0% ${demandRatio}%, #8ea7c2 ${demandRatio}% ${Math.min(100,demandRatio+importRatio)}%, #e8eaee ${Math.min(100,demandRatio+importRatio)}% 100%)`}}><div><small>총 수요</small><strong>{fmt(result.demand)}억</strong></div></div><div className="ratio-legend"><div><span className="legend-dot va"/> 부가가치유발액 <strong>{cv(result.totalVa/result.demand)}배</strong></div><div><span className="legend-dot imp"/> 수입유발액 <strong>{cv(result.totalImp/result.demand)}배</strong></div></div><p className="muted-footnote">두 계수는 국산품 최종수요를 기준으로 계산했어요. 생산유발액을 여기에 더하면 안 돼요.</p></div><div className="result-context">수요 1억 원당 생산유발액 <strong>{cv(result.totalProd/result.demand)}억 원</strong></div></CardContent></Card></div>
      {inactive.length>0&&<p className="data-note"><CircleAlert size={17}/> 생산유발계수 열이 0으로 기록된 부문: {inactive.map(s=>data.sectors[s.j].name).join(", ")}. 국산품 최종수요 기준으로는 유발효과가 0으로 나와요. 해석할 때 유의해 주세요.</p>}
      <p className="data-note"><CircleAlert size={17}/> 2023년 산업 구조가 그대로라고 가정한 계산이에요. 실제 GDP나 일자리가 얼마나 늘어날지 예측한 값은 아니에요.</p>
    </>:<Empty title="아직 계산한 결과가 없어요">위에서 산업과 금액을 입력한 뒤 계산해 보세요.</Empty>}
  </>
}
function NetworkView({data}:{data:IOData}) {
  const [search,setSearch]=useState("");const [sector,setSector]=useState(0);useEffect(()=>{setSearch("");setSector(0)},[data]);
  const effective=sector;
  const suppliers=effective===undefined?[]:topSuppliers(data,effective,10),buyers=effective===undefined?[]:topBuyers(data,effective,10);
  const domestic=effective===undefined?0:data.sectors.reduce((t,_,i)=>t+entry(data,2,i,effective),0), imported=effective===undefined?0:data.sectors.reduce((t,_,i)=>t+entry(data,1,i,effective),0);
  return <><SectionTitle index="03 / INDUSTRY NETWORK" title="산업은 어떻게 연결될까요?" desc="산업들이 어디서 중간재를 사고, 어디에 판매하는지 확인해 보세요."/><Card><CardContent><DataSelect data={data} filter={search} onFilter={setSearch} value={sector} onChange={setSector}/></CardContent></Card>
    {effective!==undefined&&<><div className="network-stats"><Metric label="국산 중간재 투입액" value={fmt(domestic/1e6)} detail="조원" icon={Database}/><Metric label="수입 중간재 투입액" value={fmt(imported/1e6)} detail="조원" icon={ArrowLeftRight} color="blue"/><Metric label="수입 중간재 비중" value={`${fmt((domestic+imported)?imported/(domestic+imported)*100:0)}%`} detail="중간투입 기준" icon={BarChart3} color="amber"/></div>
      <Card className="analysis-card standalone-flow"><CardContent><TradeFlow data={data} sector={effective}/></CardContent></Card><div className="dashboard-main-grid"><Card className="analysis-card"><CardHeader><div><Kicker>SUPPLIERS</Kicker><CardTitle>주요 국내 공급 산업</CardTitle><CardDescription>선택 산업이 국산 중간재를 구매한 산업 · 백만원</CardDescription></div></CardHeader><CardContent><RankedBars rows={suppliers} height={380}/></CardContent></Card><Card className="analysis-card"><CardHeader><div><Kicker>BUYERS</Kicker><CardTitle>주요 국내 구매 산업</CardTitle><CardDescription>선택 산업 생산물을 중간재로 구매한 산업 · 백만원</CardDescription></div></CardHeader><CardContent><RankedBars rows={buyers} height={380}/></CardContent></Card></div><p className="data-note"><CircleAlert size={16}/> 국산거래표에서 행은 공급 산업, 열은 사용 산업이에요. 소비·투자·수출 같은 최종수요는 제외했어요.</p></>}
  </>;
}
function CompareView({data}:{data:IOData}) {
  const [a,setA]=useState(0),[b,setB]=useState(1),[searchA,setSearchA]=useState(""),[searchB,setSearchB]=useState("");useEffect(()=>{setA(0);setB(1);setSearchA("");setSearchB("")},[data]);
  const fields=[{name:"생산유발계수",idx:6},{name:"부가가치유발계수",idx:8},{name:"수입유발계수",idx:7},{name:"총 중간투입계수",idx:3},{name:"수입 중간투입계수",idx:4}];
  const rows=fields.map(f=>({...f,a:columnSum(data,f.idx,a),b:columnSum(data,f.idx,b)})),max=Math.max(1e-9,...rows.flatMap(r=>[r.a,r.b]));
  return <><SectionTitle index="04 / BENCHMARK" title="산업 두 개를 비교해 볼까요?" desc="비교할 산업 두 개를 고르면 차이를 한눈에 볼 수 있어요."/><Card><CardContent><div className="compare-pickers"><DataSelect label="산업 A" data={data} value={a} onChange={setA} filter={searchA} onFilter={setSearchA}/><span className="compare-versus">VS</span><DataSelect label="산업 B" data={data} value={b} onChange={setB} filter={searchB} onFilter={setSearchB}/></div></CardContent></Card>{a===b?<Empty title="서로 다른 산업 두 개를 골라 주세요">같은 산업끼리는 차이가 없어요. 다른 산업을 골라 볼까요?</Empty>:<Card className="compare-results"><CardHeader><div><Kicker>COMPARATIVE INDEX</Kicker><CardTitle>주요 계수 비교</CardTitle><CardDescription>두 산업의 값 중 가장 큰 숫자를 기준으로 막대 길이를 맞췄어요.</CardDescription></div></CardHeader><CardContent><div className="compare-head"><div className="compare-a"><small>INDUSTRY A · {data.sectors[a].code}</small><strong>{data.sectors[a].name}</strong></div><div className="compare-b"><small>INDUSTRY B · {data.sectors[b].code}</small><strong>{data.sectors[b].name}</strong></div></div><div className="comparison-list">{rows.map(r=><div className="comparison-item" key={r.name}><div className="comparison-side"><strong>{cv(r.a)}</strong><span className="compare-track left"><span style={{width:`${r.a/max*100}%`}}/></span></div><div className="comparison-name">{r.name}</div><div className="comparison-side right"><span className="compare-track"><span style={{width:`${r.b/max*100}%`}}/></span><strong>{cv(r.b)}</strong></div></div>)}</div></CardContent></Card>}<p className="data-note"><CircleAlert size={16}/> 중간투입계수는 생산 1단위당 필요한 중간재의 비율이에요. 유발계수는 최종수요 증가에 따른 직접·간접 효과를 보여 주며, 모두 단위가 없어요.</p></>
}
function ExplorerView({data}:{data:IOData}){
  const [tab,setTab]=useState(0),[qRow,setQRow]=useState(""),[qCol,setQCol]=useState(""),[rp,setRp]=useState(0),[cp,setCp]=useState(0),[cell,setCell]=useState<{r:number;c:number}|null>(null);
  const [allSheets,setAllSheets]=useState(false);
  useEffect(()=>{setTab(0);setQRow("");setQCol("");setRp(0);setCp(0);setCell(null);setAllSheets(false)},[data]);
  const sheet:IOSheet=data.sheets[tab];
  const rows=useMemo(()=>sheet.rowNames.map((_,i)=>i).filter(i=>(`${sheet.rowCodes[i]} ${sheet.rowNames[i]}`).toLocaleLowerCase("ko-KR").includes(qRow.toLocaleLowerCase("ko-KR").trim())),[sheet,qRow]);
  const cols=useMemo(()=>sheet.columns.map((_,i)=>i).filter(i=>(`${sheet.columns[i].code} ${sheet.columns[i].name}`).toLocaleLowerCase("ko-KR").includes(qCol.toLocaleLowerCase("ko-KR").trim())),[sheet,qCol]);
  const rMax=Math.max(0,Math.ceil(rows.length/12)-1),cMax=Math.max(0,Math.ceil(cols.length/6)-1);
  const rPage=Math.min(rp,rMax),cPage=Math.min(cp,cMax);
  const visibleRows=rows.slice(rPage*12,(rPage+1)*12),visibleCols=cols.slice(cPage*6,(cPage+1)*6);
  const display=(v:unknown)=>v===undefined||v===null||v===""?"—":sheet.unit==="백만원"?fmt(Number(v)):Number(v).toFixed(6);
  const chooseSheet=(i:number)=>{setTab(i);setQRow("");setQCol("");setRp(0);setCp(0);setCell(null)};
  const download=()=>csvDownload(`2023_${data.level}_${tab+1}_원자료.csv`,[["행코드","행이름",...cols.map(c=>`${sheet.columns[c].code} ${sheet.columns[c].name}`)],...rows.map(r=>[sheet.rowCodes[r],sheet.rowNames[r],...cols.map(c=>sheet.values[r]?.[c])])]);
  // Keep the selected sheet visible when the compact sheet list is restored.
  const shownSheetIndexes=allSheets?data.sheets.map((_,i)=>i):[0,1,2,3,4,5,...(tab>=6?[tab]:[])].filter(i=>i<data.sheets.length);
  return <>
    <SectionTitle index="05 / DATA EXPLORER" title="필요한 통계표를 쉽게 찾아보세요" desc="표를 고르고 원하는 산업 이름을 검색해 보세요. 숫자를 누르면 자세히 알려드려요."/>
    <div className="explorer-step-card">
      <div className="step-card-head"><div className="step-bubble">1</div><div><h3>어떤 표를 볼까요?</h3><p>표의 이름을 눌러 주세요. 지금 선택한 표는 파란색으로 보여요.</p></div><Badge>{data.sheets.length}개 표</Badge></div>
      <div className="sheet-option-grid" role="group" aria-label="통계표를 골라 주세요">
        {shownSheetIndexes.map(i=><button type="button" key={i} className={`sheet-option ${i===tab?"active":""}`} onClick={()=>chooseSheet(i)} aria-pressed={i===tab}><span>{String(i+1).padStart(2,"0")}</span><strong>{data.sheets[i].name}</strong>{i===tab?<Check size={18}/>:<ChevronRight size={16}/>}</button>)}
      </div>
      <button type="button" className="sheet-more" onClick={()=>setAllSheets(v=>!v)}>{allSheets?"자주 쓰는 표만 보기":"나머지 표도 보기"}<ChevronRight size={16}/></button>
    </div>
    <Card className="explorer-card"><CardContent>
      <div className="step-card-head filter-title"><div className="step-bubble">2</div><div><h3>어떤 숫자를 찾고 싶나요?</h3><p>행은 공급하는 쪽, 열은 사용하는 쪽이에요. 이름이나 코드를 검색해 보세요.</p></div></div>
      <div className="explorer-controls"><Field label="행 · 공급 항목 검색"><div className="search-field"><Search size={17}/><Input placeholder="예: 음식료품, 농림수산품" value={qRow} onChange={e=>{setQRow(e.target.value);setRp(0);setCell(null)}}/></div></Field><Field label="열 · 사용 항목 검색"><div className="search-field"><Search size={17}/><Input placeholder="예: 음식료품, 제조업" value={qCol} onChange={e=>{setQCol(e.target.value);setCp(0);setCell(null)}}/></div></Field><Button variant="secondary" onClick={download}><ArrowDownToLine size={17}/> 표 내려받기</Button></div>
      <div className="table-status"><span><b>{sheet.name}</b><span className="status-divider"/> {rows.length}행 × {cols.length}열</span><span>단위: {sheet.unit==="백만원"?"백만원":"계수 (무차원)"}</span></div>
      <div className="wide-table"><table><thead><tr><th>행 코드 / 산업</th>{visibleCols.map(c=><th key={c}><small>{sheet.columns[c].code}</small><span>{sheet.columns[c].name}</span></th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r}><td><small>{sheet.rowCodes[r]}</small><span>{sheet.rowNames[r]}</span></td>{visibleCols.map(c=><td key={c}><button type="button" aria-label={`${sheet.rowNames[r]}에서 ${sheet.columns[c].name}로 ${display(sheet.values[r]?.[c])}`} className={cell?.r===r&&cell?.c===c?"value-button selected":"value-button"} onClick={()=>setCell({r,c})}>{display(sheet.values[r]?.[c])}</button></td>)}</tr>)}{!rows.length&&<tr><td colSpan={visibleCols.length+1}>검색한 행이 없어요. 다른 이름으로 검색해 보세요.</td></tr>}</tbody></table></div>
      <div className="pager"><div><Button variant="outline" size="sm" disabled={rPage<=0} onClick={()=>{setRp(rPage-1);setCell(null)}}><ChevronLeft size={16}/> 이전 행</Button><span>행 {rows.length?rPage+1:0}/{rows.length?rMax+1:0}</span><Button variant="outline" size="sm" disabled={rPage>=rMax} onClick={()=>{setRp(rPage+1);setCell(null)}}>다음 행 <ChevronRight size={16}/></Button></div><div><Button variant="outline" size="sm" disabled={cPage<=0} onClick={()=>{setCp(cPage-1);setCell(null)}}><ChevronLeft size={16}/> 이전 열</Button><span>열 {cols.length?cPage+1:0}/{cols.length?cMax+1:0}</span><Button variant="outline" size="sm" disabled={cPage>=cMax} onClick={()=>{setCp(cPage+1);setCell(null)}}>다음 열 <ChevronRight size={16}/></Button></div></div>
      <div className={`cell-inspector ${cell?"has-value":""}`}>{cell?<><div><span>공급하는 항목</span><strong>{sheet.rowCodes[cell.r]} · {sheet.rowNames[cell.r]}</strong></div><div><span>사용하는 항목</span><strong>{sheet.columns[cell.c].code} · {sheet.columns[cell.c].name}</strong></div><div><span>선택한 숫자</span><strong>{display(sheet.values[cell.r]?.[cell.c])} <small>{sheet.unit==="백만원"?"백만원":""}</small></strong></div></>:<span><CircleHelp size={20}/> 궁금한 숫자를 한 번 눌러 보세요. 어떤 항목의 값인지 이곳에 알려드려요.</span>}</div>
    </CardContent></Card>
  </>;
}
function Method(){
  return <>
    <SectionTitle index="06 / METHODOLOGY" title="숫자가 어떻게 계산되는지 알려드릴게요" desc="어려운 용어는 간단하게 풀고, 계산의 근거는 정확하게 보여드려요."/>
    <div className="method-story">
      <div className="method-story-head"><span className="method-story-icon"><IllustratedIcon name="method"/></span><div><strong>산업연관분석은 이렇게 이루어져요</strong><p>한 산업의 수요가 바뀌면 다른 산업에도 영향을 줄 수 있어요.</p></div></div>
      <div className="method-story-steps"><div><span className="story-step-no">1</span><strong>산업을 골라요</strong><p>예를 들어 음식료품을 선택해요.</p></div><ArrowRight className="story-arrow" size={23}/><div><span className="story-step-no">2</span><strong>수요가 늘어난다고 가정해요</strong><p>국산품 최종수요 10억 원 증가처럼요.</p></div><ArrowRight className="story-arrow" size={23}/><div><span className="story-step-no">3</span><strong>영향을 계산해요</strong><p>생산·부가가치·수입유발액을 보여드려요.</p></div></div>
    </div>
    <div className="method-detail-grid">
      <Card className="method-explain"><CardContent><span className="method-pill">자료 출처</span><h3>어떤 자료를 사용하나요?</h3><p>한국은행이 2025년 9월 발표한 「2023년 산업연관표(연장표)」를 사용해요. 2020년 실측표를 기준으로 연장 추계한 생산자가격 자료예요.</p><div className="method-meta"><span>2023년 자료</span><span>4가지 산업 분류</span><span>12개 원본 표</span></div></CardContent></Card>
      <Card className="method-explain"><CardContent><span className="method-pill">계산 방식</span><h3>생산유발액은 어떻게 구하나요?</h3><div className="formula">ΔX = (I − A<sub>d</sub>)<sup>−1</sup> ΔY</div><p>국산 생산유발계수 행렬에 산업별 최종수요 변화액을 곱해요. 산업을 여러 개 고르면 각 산업의 효과를 더해요.</p></CardContent></Card>
      <Card className="method-explain"><CardContent><span className="method-pill">계산 방식</span><h3>부가가치와 수입은요?</h3><div className="formula">ΔV = V<sup>*</sup> ΔY &nbsp;·&nbsp; ΔM = M<sup>*</sup> ΔY</div><p>한국은행의 부가가치·수입유발계수 행렬을 활용해 각각 계산해요.</p></CardContent></Card>
      <Card className="method-explain"><CardContent><span className="method-pill">알아둘 점</span><h3>미래를 예측한 건 아니에요</h3><p>2023년의 산업 구조와 가격이 변하지 않는다고 가정했어요. 실제 고용이나 GDP 성장률을 그대로 예측하는 결과는 아니에요.</p></CardContent></Card>
    </div>
    <Card className="source-block"><CardContent><div className="source-block-layout"><div><span className="method-pill">원본 확인</span><h3>숫자가 궁금하면 원본과 비교해 보세요</h3><p>원본 거래액의 단위는 백만원이고, 투입·유발계수에는 단위가 없어요. 시뮬레이션은 억 원 단위로 입력하고 결과도 억 원으로 보여드려요.</p></div><div className="source-buttons"><a href={`${import.meta.env.BASE_URL}data/source/2023-bok-io-report.pdf`} target="_blank" rel="noopener"><FileSpreadsheet size={17}/> 한국은행 발표자료 보기 <ArrowUpRight size={16}/></a><a href="https://ecos.bok.or.kr" target="_blank" rel="noopener"><Database size={17}/> 한국은행 ECOS 열기 <ArrowUpRight size={16}/></a></div></div></CardContent></Card>
  </>;
}
function App(){
  const [level,setLevel]=useState<Level>("large");const [reload,setReload]=useState(0);
  const [data,setData]=useState<IOData|null>(null);const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");const [message,setMessage]=useState("");
  const [view,setView]=useState<View>(()=>{
    const section=window.location.hash.slice(1);
    return menus.some(m=>m.value===section)?section as View:"overview";
  });
  const [menuOpen,setMenuOpen]=useState(false);const [focus,setFocus]=useState(0);
  useEffect(()=>{
    const followHistory=()=>{
      const section=window.location.hash.slice(1);
      setView(menus.some(m=>m.value===section)?section as View:"overview");
      setMenuOpen(false);
    };
    window.addEventListener("hashchange",followHistory);
    return()=>window.removeEventListener("hashchange",followHistory);
  },[]);
  useEffect(()=>{let alive=true;const controller=new AbortController();setStatus("loading");setMessage("");setData(null);
    fetch(`${import.meta.env.BASE_URL}data/processed/${level}.json`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json() as IOData;validateData(json,level);if(alive){setData(json);setStatus("ready");setFocus(Math.max(0,json.sectors.findIndex(s=>s.name.includes("음식점"))))}}).catch(err=>{if(alive&&err.name!=="AbortError"){setStatus("error");setMessage(err.message||"자료를 불러오지 못했어요.")}});
    return()=>{alive=false;controller.abort()};
  },[level,reload]);
  const navigation=(to:View)=>{
    if(window.location.hash!==`#${to}`)window.location.hash=to;
    setView(to);setMenuOpen(false);
    window.scrollTo({top:0,behavior:"smooth"});
  };
  const title=menus.find(x=>x.value===view)?.name||"한눈에 보기";
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?"open":""}`}><div className="brand"><span className="brand-logo">io<span>.</span></span><span><strong>IO Studio</strong><small>산업연관분석</small></span></div><div className="nav-group-label">분석 메뉴</div><nav aria-label="분석 메뉴">{menus.map(m=><button key={m.value} onClick={()=>navigation(m.value)} className={view===m.value?"nav-link active":"nav-link"} aria-current={view===m.value?"page":undefined}><m.icon width={19} height={19}/><span>{m.name}</span>{view===m.value&&<span className="nav-indicator"/>}</button>)}</nav><div className="sidebar-bottom"><div className="side-dataset-label"><span className="online-dot"/> 지금 보고 있는 자료</div><strong>2023 산업연관표</strong><small>한국은행 · 생산자가격 기준</small><div className="side-chips"><span>12개 표</span><span>4가지 분류</span></div></div><div className="sidebar-foot">산업조직론 프로젝트 · 2026</div></aside>
    {menuOpen&&<button className="mobile-shade" onClick={()=>setMenuOpen(false)} aria-label="메뉴 닫기"/>}
    <div className="main-panel"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="메뉴 열기" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><span className="crumb">IO STUDIO</span><span className="crumb-separator">/</span><strong>{title}</strong></div><div className="topbar-right"><Badge className="status-badge"><span className="online-dot"/> 2023년 기준</Badge><a className="top-source" href={`${import.meta.env.BASE_URL}data/source/2023-bok-io-report.pdf`} target="_blank" rel="noopener">한국은행 원본 보기 <ArrowUpRight size={15}/></a></div></header>
      <div className="page-inner">{view==="overview"&&<WelcomeHero data={data} onNav={navigation}/>}
      <Card className="dataset-toolbar"><CardContent><div className="dataset-controls"><div className="dataset-label"><span className="toolbar-mini-icon"><IllustratedIcon name="explorer" small/></span><span><strong>어떤 산업을 볼까요?</strong><small>한국은행 산업연관표 · 연장표</small></span></div><Field label="산업 분류 선택"><NativeSelect value={level} onChange={e=>setLevel(e.target.value as Level)}>{(Object.keys(levels) as Level[]).map(l=><option key={l} value={l}>{levels[l].label} · {levels[l].count}개 산업</option>)}</NativeSelect></Field><Button variant="secondary" onClick={()=>setReload(n=>n+1)} disabled={status==="loading"}><RefreshCcw size={15}/> 새로고침</Button><DownloadSource level={level}/></div><div className={`dataset-status ${status}`} aria-live="polite">{status==="ready"?<><TdsCheckIcon/> {levels[level].count}개 산업 · 12개 표를 불러왔어요</>:status==="loading"?<><span className="loading-dot"/> {levels[level].label} 자료를 불러오고 있어요</>:<><CircleAlert size={14}/> {message}</>}</div></CardContent></Card>
      {status==="error"&&<Empty title="데이터를 불러오지 못했어요">인터넷 연결을 확인하고 새로고침해 주세요.</Empty>}
      {status==="loading"&&<div className="loading-layout"><div className="skeleton skeleton-title"/><div className="skeleton-row">{[1,2,3,4].map(i=><div key={i} className="skeleton"/>)}</div><div className="skeleton skeleton-large"/></div>}
      {data&&status==="ready"&&<main>{view==="overview"?<Overview data={data} onNav={navigation} focusSector={focus} onFocus={setFocus}/>:view==="simulator"?<Simulation data={data}/>:view==="network"?<NetworkView data={data}/>:view==="compare"?<CompareView data={data}/>:view==="explorer"?<ExplorerView data={data}/>:<Method/>}</main>}
      <footer className="footer"><span>IO Studio · 학습용 산업연관분석 서비스</span><span>출처: 한국은행 2023 산업연관표(연장표)</span><span>일부 그래픽: <a href="https://github.com/toss/tossface/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">Tossface 라이선스</a> · 토스 공식 서비스와 별개예요</span></footer></div></div>
  </div>
}
export default App;
