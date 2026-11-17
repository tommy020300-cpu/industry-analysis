import { useEffect, useMemo, useState, type ReactNode, type ComponentType, type SVGProps } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen,
  Check, ChevronLeft, ChevronRight, CircleAlert, Database, FileSpreadsheet,
  GitBranch, LayoutDashboard, Menu, Plus, RefreshCcw, Search, SlidersHorizontal,
  Table2, Trash2, X, ChartNoAxesCombined, BarChart3, Layers3, Sparkles, ShieldCheck, CircleHelp,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
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
  {value:"compare",name:"산업별 비교",hint:"Benchmark",icon:ArrowLeftRight},
  {value:"explorer",name:"원자료 찾기",hint:"Data Explorer",icon:Table2},
  {value:"method",name:"자료와 계산 방법",hint:"Methodology",icon:BookOpen},
];
const expected={production:1.827,valueAdded:.752,imported:.248};
const colors=["#3182F6","#5FA2FF","#86B8FF","#B3D3FF"];
const shortName=(text:string,n=11)=>text.length>n?text.slice(0,n-1)+"…":text;

function Kicker({children}: {children:ReactNode}) { return <div className="eyebrow">{children}</div>; }
function SectionTitle({index,title,desc,aside}:{index:string;title:string;desc:string;aside?:ReactNode}) { return <div className="section-head"><div><Kicker>{index}</Kicker><h2>{title}</h2><p>{desc}</p></div>{aside&&<div className="head-aside">{aside}</div>}</div> }
function Metric({label,value,detail,icon:Icon,color="green"}:{label:string;value:string;detail:string;icon:IconType;color?:string}) { return <Card className={`metric metric-${color}`}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon width={18} height={18}/></span></div><div className="metric-value">{value}</div><div className="metric-sub">{detail}</div></Card>; }
function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><Database size={25} strokeWidth={1.6}/><strong>{title}</strong>{children&&<p>{children}</p>}</div>}
function DataSelect({data, value,onChange,filter,onFilter,placeholder="산업명 또는 코드 검색",label="산업 선택"}:{data:IOData;value:number;onChange:(j:number)=>void;filter:string;onFilter:(s:string)=>void;placeholder?:string;label?:string}) {
  const options=data.sectors.map((s,i)=>({...s,i})).filter(s=>sectorMatches(s,filter));
  const selected=options.some(x=>x.i===value)?value:options[0]?.i;
  return <div className="sector-picker"><Field label="산업 검색"><div className="search-field"><Search size={15}/><Input value={filter} onChange={e=>{const query=e.target.value;onFilter(query);if(!data.sectors[value] || !sectorMatches(data.sectors[value],query)){const first=data.sectors.findIndex(s=>sectorMatches(s,query));if(first>=0)onChange(first)}}} placeholder={placeholder} aria-label="산업 검색"/></div></Field><Field label={label}><NativeSelect value={selected??""} onChange={e=>onChange(Number(e.target.value))} disabled={!options.length}>{options.length?options.map(x=><option key={x.i} value={x.i}>{x.code} · {x.name}</option>):<option value="">검색한 산업이 없어요</option>}</NativeSelect></Field></div>
}
function DownloadSource({level}:{level:Level}) {return <a className="source-link" href={`${import.meta.env.BASE_URL}data/source/${levels[level].file}`} download><FileSpreadsheet size={15}/> 원본 엑셀 <ArrowDownToLine size={14}/></a>}
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
      {suppliers.map((item,i)=><g key={`s-${item.index}`}><path d={`M155 ${leftYs[i]} C242 ${leftYs[i]} 252 150 311 150`} stroke="#3182F6" strokeWidth={normalize(item.value,maxL)} opacity={.33+i*.05} fill="none"/><rect x="17" y={leftYs[i]-19} rx="9" width="139" height="38" fill="#eaf2ff" stroke="#bfd4f3"/><text x="86" y={leftYs[i]+4} textAnchor="middle" className="flow-node">{shortName(item.name,13)}</text><title>{item.name} · {fmt(item.value)} 백만원</title></g>)}
      <rect x="289" y="118" width="112" height="64" rx="13" fill="#215FC5"/>
      <text x="345" y="142" textAnchor="middle" fill="#D7E8FF" fontSize="10">FOCUS</text>
      <text x="345" y="161" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="11">{shortName(s.name,9)}</text>
      {buyers.map((item,i)=><g key={`b-${item.index}`}><path d={`M401 150 C456 150 467 ${rightYs[i]} 528 ${rightYs[i]}`} stroke="#75A9F8" strokeWidth={normalize(item.value,maxR)} opacity={.4+i*.04} fill="none"/><rect x="527" y={rightYs[i]-19} rx="9" width="146" height="38" fill="#eef5ff" stroke="#c8dcf5"/><text x="600" y={rightYs[i]+4} textAnchor="middle" className="flow-node">{shortName(item.name,13)}</text><title>{item.name} · {fmt(item.value)} 백만원</title></g>)}
    </svg>
    <div className="flow-footnote">국산거래표 · 행은 공급 산업, 열은 사용 산업</div>
  </div>
}
function RankedBars({rows,unit="",height=320}:{rows:{name:string;value:number}[];unit?:string;height?:number}) {
  const chart=rows.map((r,i)=>({name:shortName(r.name,12),full:r.name,value:Number(r.value.toFixed(5)),color:i<3?"#3182F6":"#A5CAFF"}));
  return <div className="chart-region" style={{height}}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} layout="vertical" margin={{top:8,right:32,bottom:0,left:6}} barCategoryGap="25%"><CartesianGrid stroke="#e9ebef" horizontal={false}/><XAxis type="number" tick={{fontSize:13,fill:"#4E5968"}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" width={122} tick={{fontSize:13,fill:"#4E5968"}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:"#f3f4f7"}} formatter={(v)=>[`${fmt(Number(v),3)}${unit}`,"유발계수"]} labelFormatter={(label,payload)=>String(payload[0]?.payload?.full??label)} contentStyle={{borderRadius:10,border:"1px solid #dfe2e7",fontSize:14,boxShadow:"0 12px 30px #233b301a"}}/><Bar dataKey="value" radius={[0,5,5,0]}>{chart.map((r,i)=><Cell fill={r.color} key={i}/>)}</Bar></BarChart></ResponsiveContainer></div>
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
      <div className="welcome-trust"><ShieldCheck size={17}/><span>한국은행 공식 자료를 사용해요</span><i aria-hidden="true"/><span>{data?`${data.sectors.length}개 산업 분석 가능`:'4가지 산업 분류 지원'}</span></div>
    </div>
    <div className="welcome-visual" aria-label="산업과 경제 데이터를 연결하는 일러스트">
      <div className="welcome-visual-glow"/>
      <div className="art-label"><span className="art-label-dot"/>INPUT → OUTPUT</div>
      <img className="hero-3d-art" src={`${import.meta.env.BASE_URL}assets/industry-3d.webp`} alt="파란 공장과 막대그래프, 산업 연결망, 원자료 표를 표현한 입체 그림" decoding="async" fetchPriority="high"/>
      <div className="art-data-chip"><span>생산유발계수</span><strong>1.827 <small>배</small></strong></div>
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
      <Card className="analysis-card"><CardHeader><div><Kicker>산업 연결</Kicker><CardTitle>산업 연결 살펴보기 흐름</CardTitle><CardDescription>어떤 산업에서 중간재를 사고파는지 확인해 보세요.</CardDescription></div><div className="card-control"><NativeSelect aria-label="연결도 산업 선택" value={focusSector} onChange={e=>onFocus(Number(e.target.value))}>{data.sectors.map((s,i)=><option value={i} key={i}>{s.name}</option>)}</NativeSelect></div></CardHeader><CardContent><TradeFlow data={data} sector={focusSector}/></CardContent><div className="card-bottom"><span>공급·구매 관계가 큰 산업부터 보여줘요</span><Button variant="ghost" size="sm" onClick={()=>onNav("network")}>상세 분석 <ArrowRight size={14}/></Button></div></Card>
      <Card className="analysis-card"><CardHeader><div><Kicker>생산 파급효과</Kicker><CardTitle>생산유발계수 상위 10개 산업</CardTitle><CardDescription>수요가 1만큼 늘 때 생산이 얼마나 늘어나는지 볼 수 있어요.</CardDescription></div></CardHeader><CardContent><RankedBars rows={ranks} unit="배" height={365}/></CardContent><div className="card-bottom"><span>산업별 유발계수 · 평균과 별도 비교</span><Button variant="ghost" size="sm" onClick={()=>onNav("compare")}>산업별 비교 <ArrowRight size={14}/></Button></div></Card>
    </div>
    <div className="dashboard-secondary-grid">
      <Card className="analysis-card mini-table-card"><CardHeader><div><Kicker>산업별 비교</Kicker><CardTitle>주요 산업 유발계수 비교</CardTitle><CardDescription>산업마다 생산·부가가치·수입 유발효과가 얼마나 다른지 볼 수 있어요.</CardDescription></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>산업</TableHead><TableHead className="numeric">생산</TableHead><TableHead className="numeric">부가가치</TableHead><TableHead className="numeric">수입</TableHead></TableRow></TableHeader><TableBody>{picks.map(j=><TableRow key={j}><TableCell>{data.sectors[j].name}</TableCell><TableCell className="numeric strong">{cv(columnSum(data,6,j))}</TableCell><TableCell className="numeric">{cv(columnSum(data,8,j))}</TableCell><TableCell className="numeric">{cv(columnSum(data,7,j))}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card className="analysis-card action-card"><CardHeader><div><Kicker>분석 바로가기</Kicker><CardTitle>어떤 분석을 해 볼까요?</CardTitle><CardDescription>원하는 분석을 골라 바로 시작하세요.</CardDescription></div></CardHeader><CardContent><div className="quick-actions">{[{label:"파급효과 계산",desc:"여러 산업을 한 번에 계산해요",to:"simulator" as View,icon:Activity},{label:"산업별 비교",desc:"두 산업을 나란히 비교해요",to:"compare" as View,icon:BarChart3},{label:"원자료 찾기",desc:"12개 시트에서 원하는 값을 찾아요",to:"explorer" as View,icon:Table2}].map(a=><button className="quick-action" onClick={()=>onNav(a.to)} key={a.to}><span className="action-glyph"><a.icon size={19}/></span><span><strong>{a.label}</strong><small>{a.desc}</small></span><ArrowUpRight size={18}/></button>)}</div></CardContent></Card>
    </div>
    <p className="data-note"><CircleAlert size={16}/> 전산업 평균과 개별 산업의 유발계수는 계산 기준이 달라요. 숫자를 비교할 때 이 점을 참고해 주세요.</p>
  </>
}
function Simulation({data}:{data:IOData}){
  const [search,setSearch]=useState("");const [sector,setSector]=useState(0);const [amount,setAmount]=useState("10");
  const [scenarios,setScenarios]=useState<Scenario[]>([]);const [result,setResult]=useState<ImpactResult|null>(null);const [error,setError]=useState("");
  useEffect(()=>{setSearch("");setSector(0);setScenarios([]);setResult(null);setError("")},[data]);
  const available=data.sectors.map((s,i)=>({...s,i})).filter(s=>sectorMatches(s,search));
  const effectiveSector=available.some(x=>x.i===sector)?sector:available[0]?.i;
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
      <Card><CardHeader><div><Kicker>STEP 01</Kicker><CardTitle>어떤 산업의 수요가 늘어나나요?</CardTitle><CardDescription>산업과 금액을 입력해 주세요. 여러 산업을 함께 계산할 수도 있어요.</CardDescription></div></CardHeader><CardContent><div className="sim-form"><Field label="산업명·코드 검색"><div className="search-field"><Search size={16}/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="자동차, 음식점, 반도체 등"/></div></Field><Field label="분석 산업"><NativeSelect value={effectiveSector??""} disabled={!available.length} onChange={e=>setSector(Number(e.target.value))}>{available.length?available.map(s=><option value={s.i} key={s.i}>{s.code} · {s.name}</option>):<option value="">검색한 산업이 없어요</option>}</NativeSelect></Field><Field label="수요가 늘어나는 금액" note="억 원"><Input type="number" min="0.001" max="100000000" step="any" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}} /></Field><Button onClick={add} className="add-btn"><Plus size={17}/> 산업 추가하기</Button></div><div className="form-hint">10억 원이라면 10을 입력하세요. 같은 산업은 자동으로 합쳐져요.</div>{error&&<p role="alert" className="error-notice"><CircleAlert size={16}/>{error}</p>}</CardContent></Card>
      <Card className="scenario-box"><CardHeader><div><Kicker>STEP 02</Kicker><CardTitle>선택한 산업 <span className="count-text">{scenarios.length}개</span></CardTitle><CardDescription>총 수요 증가액 {fmt(total)}억 원</CardDescription></div><Badge>{scenarios.length}/50 산업</Badge></CardHeader><CardContent>{scenarios.length?<div className="scenario-list">{scenarios.map(s=><div className="scenario-row" key={s.j}><span className="scenario-sector"><small>{data.sectors[s.j].code}</small><b>{data.sectors[s.j].name}</b></span><strong>+{fmt(s.amount)}억 원</strong><Button size="icon" variant="ghost" aria-label={`${data.sectors[s.j].name} 삭제`} onClick={()=>{setScenarios(p=>p.filter(x=>x.j!==s.j));setResult(null)}}><X size={17}/></Button></div>)}</div>:<div className="scenario-empty"><Layers3 size={22}/><span>산업을 고르고 추가해 보세요.</span></div>}<div className="scenario-footer"><Button variant="ghost" size="sm" onClick={()=>{setScenarios([]);setResult(null);setError("")}} disabled={!scenarios.length}><Trash2 size={15}/> 처음부터 다시</Button><Button size="lg" className="sim-main-cta" onClick={run}>계산 결과 보기 <ArrowRight size={19}/></Button></div></CardContent></Card>
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
  const matches=data.sectors.map((s,i)=>({...s,i})).filter(s=>sectorMatches(s,search));
  const effective=matches.some(s=>s.i===sector)?sector:matches[0]?.i;
  const suppliers=effective===undefined?[]:topSuppliers(data,effective,10),buyers=effective===undefined?[]:topBuyers(data,effective,10);
  const domestic=effective===undefined?0:data.sectors.reduce((t,_,i)=>t+entry(data,2,i,effective),0), imported=effective===undefined?0:data.sectors.reduce((t,_,i)=>t+entry(data,1,i,effective),0);
  return <><SectionTitle index="03 / INDUSTRY NETWORK" title="산업 연결 살펴보기 구조" desc="산업들이 어디서 중간재를 사고, 어디에 판매하는지 확인해 보세요."/><Card><CardContent><DataSelect data={data} filter={search} onFilter={setSearch} value={sector} onChange={setSector}/></CardContent></Card>
    {effective!==undefined&&<><div className="network-stats"><Metric label="국산 중간재 투입액" value={fmt(domestic/1e6)} detail="조원" icon={Database}/><Metric label="수입 중간재 투입액" value={fmt(imported/1e6)} detail="조원" icon={ArrowLeftRight} color="blue"/><Metric label="수입 중간재 비중" value={`${fmt((domestic+imported)?imported/(domestic+imported)*100:0)}%`} detail="중간투입 기준" icon={BarChart3} color="amber"/></div>
      <Card className="analysis-card standalone-flow"><CardContent><TradeFlow data={data} sector={effective}/></CardContent></Card><div className="dashboard-main-grid"><Card className="analysis-card"><CardHeader><div><Kicker>SUPPLIERS</Kicker><CardTitle>주요 국내 공급 산업</CardTitle><CardDescription>선택 산업이 국산 중간재를 구매한 산업 · 백만원</CardDescription></div></CardHeader><CardContent><RankedBars rows={suppliers} height={380}/></CardContent></Card><Card className="analysis-card"><CardHeader><div><Kicker>BUYERS</Kicker><CardTitle>주요 국내 구매 산업</CardTitle><CardDescription>선택 산업 생산물을 중간재로 구매한 산업 · 백만원</CardDescription></div></CardHeader><CardContent><RankedBars rows={buyers} height={380}/></CardContent></Card></div><p className="data-note"><CircleAlert size={16}/> 국산거래표에서 행은 공급 산업, 열은 사용 산업이에요. 소비·투자·수출 같은 최종수요는 제외했어요.</p></>}
  </>;
}
function CompareView({data}:{data:IOData}) {
  const [a,setA]=useState(0),[b,setB]=useState(1),[searchA,setSearchA]=useState(""),[searchB,setSearchB]=useState("");useEffect(()=>{setA(0);setB(1);setSearchA("");setSearchB("")},[data]);
  const fields=[{name:"생산유발계수",idx:6},{name:"부가가치유발계수",idx:8},{name:"수입유발계수",idx:7},{name:"총 중간투입계수",idx:3},{name:"수입 중간투입계수",idx:4}];
  const rows=fields.map(f=>({...f,a:columnSum(data,f.idx,a),b:columnSum(data,f.idx,b)})),max=Math.max(1e-9,...rows.flatMap(r=>[r.a,r.b]));
  return <><SectionTitle index="04 / BENCHMARK" title="산업별 비교 분석" desc="비교할 산업 두 개를 고르면 차이를 한눈에 볼 수 있어요."/><Card><CardContent><div className="compare-pickers"><DataSelect label="산업 A" data={data} value={a} onChange={setA} filter={searchA} onFilter={setSearchA}/><span className="compare-versus">VS</span><DataSelect label="산업 B" data={data} value={b} onChange={setB} filter={searchB} onFilter={setSearchB}/></div></CardContent></Card>{a===b?<Empty title="서로 다른 산업 두 개를 골라 주세요">같은 산업끼리는 차이가 없어요. 다른 산업을 골라 볼까요?</Empty>:<Card className="compare-results"><CardHeader><div><Kicker>COMPARATIVE INDEX</Kicker><CardTitle>주요 계수 비교</CardTitle><CardDescription>두 산업의 값 중 가장 큰 숫자를 기준으로 막대 길이를 맞췄어요.</CardDescription></div></CardHeader><CardContent><div className="compare-head"><div className="compare-a"><small>INDUSTRY A · {data.sectors[a].code}</small><strong>{data.sectors[a].name}</strong></div><div className="compare-b"><small>INDUSTRY B · {data.sectors[b].code}</small><strong>{data.sectors[b].name}</strong></div></div><div className="comparison-list">{rows.map(r=><div className="comparison-item" key={r.name}><div className="comparison-side"><strong>{cv(r.a)}</strong><span className="compare-track left"><span style={{width:`${r.a/max*100}%`}}/></span></div><div className="comparison-name">{r.name}</div><div className="comparison-side right"><span className="compare-track"><span style={{width:`${r.b/max*100}%`}}/></span><strong>{cv(r.b)}</strong></div></div>)}</div></CardContent></Card>}<p className="data-note"><CircleAlert size={16}/> 중간투입계수는 생산 1단위당 필요한 중간재의 비율이에요. 유발계수는 최종수요 증가에 따른 직접·간접 효과를 보여 주며, 모두 단위가 없어요.</p></>
}
function ExplorerView({data}:{data:IOData}){
  const [tab,setTab]=useState(0),[qRow,setQRow]=useState(""),[qCol,setQCol]=useState(""),[rp,setRp]=useState(0),[cp,setCp]=useState(0),[cell,setCell]=useState<{r:number;c:number}|null>(null);
  useEffect(()=>{setTab(0);setQRow("");setQCol("");setRp(0);setCp(0);setCell(null)},[data]);
  const sheet:IOSheet=data.sheets[tab];
  const rows=useMemo(()=>sheet.rowNames.map((_,i)=>i).filter(i=>(`${sheet.rowCodes[i]} ${sheet.rowNames[i]}`).toLocaleLowerCase("ko-KR").includes(qRow.toLocaleLowerCase("ko-KR").trim())),[sheet,qRow]);
  const cols=useMemo(()=>sheet.columns.map((_,i)=>i).filter(i=>(`${sheet.columns[i].code} ${sheet.columns[i].name}`).toLocaleLowerCase("ko-KR").includes(qCol.toLocaleLowerCase("ko-KR").trim())),[sheet,qCol]);
  const rMax=Math.max(0,Math.ceil(rows.length/14)-1),cMax=Math.max(0,Math.ceil(cols.length/7)-1);
  const rPage=Math.min(rp,rMax),cPage=Math.min(cp,cMax);
  const visibleRows=rows.slice(rPage*14,(rPage+1)*14),visibleCols=cols.slice(cPage*7,(cPage+1)*7);
  const display=(v:unknown)=>v===undefined||v===null||v===""?"—":sheet.unit==="백만원"?fmt(Number(v)):Number(v).toFixed(6);
  const download=()=>csvDownload(`2023_${data.level}_${tab+1}_원자료.csv`,[["행코드","행이름",...cols.map(c=>`${sheet.columns[c].code} ${sheet.columns[c].name}`)],...rows.map(r=>[sheet.rowCodes[r],sheet.rowNames[r],...cols.map(c=>sheet.values[r]?.[c])])]);
  return <><SectionTitle index="05 / DATA EXPLORER" title="투입산출표 원자료" desc="12개 표에서 원하는 항목을 검색하고 수치를 확인해 보세요." aside={<Badge>원자료 · {sheet.unit}</Badge>}/>
    <Card className="explorer-card"><CardContent><div className="explorer-controls"><Field label="시트"><NativeSelect value={tab} onChange={e=>{setTab(Number(e.target.value));setQRow("");setQCol("");setRp(0);setCp(0);setCell(null)}}>{data.sheets.map((s,i)=><option value={i} key={i}>{i+1}. {s.name}</option>)}</NativeSelect></Field><Field label="행 검색"><div className="search-field"><Search size={15}/><Input placeholder="산업명 또는 코드" value={qRow} onChange={e=>{setQRow(e.target.value);setRp(0);setCell(null)}}/></div></Field><Field label="열 검색"><div className="search-field"><Search size={15}/><Input placeholder="산업명 또는 코드" value={qCol} onChange={e=>{setQCol(e.target.value);setCp(0);setCell(null)}}/></div></Field><Button variant="outline" onClick={download}><ArrowDownToLine size={15}/> 표 내려받기</Button></div>
      <div className="table-status"><span>{sheet.name} · 검색 결과 {rows.length}행 × {cols.length}열</span><span>단위: {sheet.unit==="백만원"?"백만원":"계수 (무차원)"}</span></div><div className="wide-table"><table><thead><tr><th>행 코드 / 산업</th>{visibleCols.map(c=><th key={c}><small>{sheet.columns[c].code}</small>{shortName(sheet.columns[c].name,14)}</th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r}><td><small>{sheet.rowCodes[r]}</small>{sheet.rowNames[r]}</td>{visibleCols.map(c=><td key={c}><button className={cell?.r===r&&cell?.c===c?"value-button selected":"value-button"} onClick={()=>setCell({r,c})}>{display(sheet.values[r]?.[c])}</button></td>)}</tr>)}{!rows.length&&<tr><td colSpan={visibleCols.length+1}>검색한 행이 없어요.</td></tr>}</tbody></table></div>
      <div className="pager"><div><Button variant="outline" size="sm" disabled={rPage<=0} onClick={()=>setRp(rPage-1)}><ChevronLeft size={14}/> 이전 행</Button><span>행 {rows.length?rPage+1:0}/{rows.length?rMax+1:0}</span><Button variant="outline" size="sm" disabled={rPage>=rMax} onClick={()=>setRp(rPage+1)}>다음 행 <ChevronRight size={14}/></Button></div><div><Button variant="outline" size="sm" disabled={cPage<=0} onClick={()=>setCp(cPage-1)}><ChevronLeft size={14}/> 이전 열</Button><span>열 {cols.length?cPage+1:0}/{cols.length?cMax+1:0}</span><Button variant="outline" size="sm" disabled={cPage>=cMax} onClick={()=>setCp(cPage+1)}>다음 열 <ChevronRight size={14}/></Button></div></div>
      <div className="cell-inspector">{cell?<><div><span>행 · 공급 항목</span><strong>{sheet.rowCodes[cell.r]} · {sheet.rowNames[cell.r]}</strong></div><div><span>열 · 사용 항목</span><strong>{sheet.columns[cell.c].code} · {sheet.columns[cell.c].name}</strong></div><div><span>원자료 값</span><strong>{display(sheet.values[cell.r]?.[cell.c])} <small>{sheet.unit==="백만원"?"백만원":""}</small></strong></div></>:<span><SlidersHorizontal size={15}/> 표에서 숫자를 누르면 어떤 항목의 값인지 알려드려요.</span>}</div>
    </CardContent></Card>
  </>
}
function Method(){return <><SectionTitle index="06 / METHODOLOGY" title="자료와 자료와 계산 방법" desc="어떤 자료로 어떻게 계산했는지 확인해 보세요."/><div className="methods-grid"><Card><div className="method-num">01</div><CardHeader><CardTitle>자료의 출처</CardTitle></CardHeader><CardContent><p>한국은행 「2023년 산업연관표(연장표)」, 2025년 9월 발표. 2020년 실측표를 기준으로 생산자가격 데이터를 연장 추계한 자료입니다.</p><Badge>대·중·소·기본부문 4단계</Badge></CardContent></Card><Card><div className="method-num">02</div><CardHeader><CardTitle>생산유발효과</CardTitle></CardHeader><CardContent><div className="formula">ΔX = (I − A<sub>d</sub>)<sup>−1</sup> ΔY</div><p>한국은행의 국산 생산유발계수 행렬에 산업별 최종수요 변화 벡터를 곱해 계산해요.</p></CardContent></Card><Card><div className="method-num">03</div><CardHeader><CardTitle>부가가치·수입 유발</CardTitle></CardHeader><CardContent><div className="formula">ΔV = V* ΔY / ΔM = M* ΔY</div><p>한국은행 원본의 부가가치·수입유발계수 행렬을 활용해 산업별 유발액을 계산해요.</p></CardContent></Card><Card><div className="method-num">04</div><CardHeader><CardTitle>분석의 한계</CardTitle></CardHeader><CardContent><p>2023년 산업 구조와 투입계수, 가격이 변하지 않는다고 가정했어요. 실제 고용이나 GDP 성장률을 직접 예측하지는 않아요.</p></CardContent></Card></div><Card className="source-block"><CardHeader><CardTitle>자료 검증 및 단위</CardTitle><CardDescription>원본 거래액은 백만원, 투입·유발계수에는 단위가 없어요. 시뮬레이션은 억 원 단위로 입력하고 결과도 억 원으로 보여줘요.</CardDescription></CardHeader><CardContent><div className="source-buttons"><a href={`${import.meta.env.BASE_URL}data/source/2023-bok-io-report.pdf`} target="_blank" rel="noopener"><FileSpreadsheet size={15}/> 한국은행 보도자료 PDF <ArrowUpRight size={14}/></a><a href="https://ecos.bok.or.kr" target="_blank" rel="noopener"><Database size={15}/> 한국은행 ECOS <ArrowUpRight size={14}/></a></div></CardContent></Card></>}
function App(){
  const [level,setLevel]=useState<Level>("large");const [reload,setReload]=useState(0);
  const [data,setData]=useState<IOData|null>(null);const [status,setStatus]=useState<"loading"|"ready"|"error">("loading");const [message,setMessage]=useState("");
  const [view,setView]=useState<View>("overview");const [menuOpen,setMenuOpen]=useState(false);const [focus,setFocus]=useState(0);
  useEffect(()=>{let alive=true;const controller=new AbortController();setStatus("loading");setMessage("");setData(null);
    fetch(`${import.meta.env.BASE_URL}data/processed/${level}.json`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);const json=await response.json() as IOData;validateData(json,level);if(alive){setData(json);setStatus("ready");setFocus(Math.max(0,json.sectors.findIndex(s=>s.name.includes("음식점"))))}}).catch(err=>{if(alive&&err.name!=="AbortError"){setStatus("error");setMessage(err.message||"자료를 불러오지 못했어요.")}});
    return()=>{alive=false;controller.abort()};
  },[level,reload]);
  const navigation=(to:View)=>{setView(to);setMenuOpen(false);window.scrollTo({top:0,behavior:"smooth"})};
  const title=menus.find(x=>x.value===view)?.name||"한눈에 보기";
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen?"open":""}`}><div className="brand"><span className="brand-logo">io<span>.</span></span><span><strong>IO Studio</strong><small>산업연관분석</small></span></div><div className="nav-group-label">분석 메뉴</div><nav aria-label="분석 메뉴">{menus.map(m=><button key={m.value} onClick={()=>navigation(m.value)} className={view===m.value?"nav-link active":"nav-link"} aria-current={view===m.value?"page":undefined}><m.icon width={19} height={19}/><span>{m.name}</span>{view===m.value&&<span className="nav-indicator"/>}</button>)}</nav><div className="sidebar-bottom"><div className="side-dataset-label"><span className="online-dot"/> ACTIVE DATASET</div><strong>2023 산업연관표</strong><small>한국은행 · 생산자가격 기준</small><div className="side-chips"><span>12개 표</span><span>4가지 분류</span></div></div><div className="sidebar-foot">산업조직론 프로젝트 · 2026</div></aside>
    {menuOpen&&<button className="mobile-shade" onClick={()=>setMenuOpen(false)} aria-label="메뉴 닫기"/>}
    <div className="main-panel"><header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="메뉴 열기" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><span className="crumb">IO STUDIO</span><span className="crumb-separator">/</span><strong>{title}</strong></div><div className="topbar-right"><Badge className="status-badge"><span className="online-dot"/> 2023년 기준</Badge><a className="top-source" href={`${import.meta.env.BASE_URL}data/source/2023-bok-io-report.pdf`} target="_blank" rel="noopener">원본 자료 보기 <ArrowUpRight size={15}/></a></div></header>
      <div className="page-inner">{view==="overview"&&<WelcomeHero data={data} onNav={navigation}/>}
      <Card className="dataset-toolbar"><CardContent><div className="dataset-controls"><div className="dataset-label"><span className="toolbar-mini-icon"><Database size={19}/></span><span><strong>어떤 산업을 볼까요?</strong><small>한국은행 산업연관표 · 연장표</small></span></div><Field label="산업 분류 선택"><NativeSelect value={level} onChange={e=>setLevel(e.target.value as Level)}>{(Object.keys(levels) as Level[]).map(l=><option key={l} value={l}>{levels[l].label} · {levels[l].count}개 산업</option>)}</NativeSelect></Field><Button variant="secondary" onClick={()=>setReload(n=>n+1)} disabled={status==="loading"}><RefreshCcw size={15}/> 새로고침</Button><DownloadSource level={level}/></div><div className={`dataset-status ${status}`} aria-live="polite">{status==="ready"?<><Check size={14}/> {levels[level].count}개 산업 · 12개 표를 불러왔어요</>:status==="loading"?<><span className="loading-dot"/> {levels[level].label} 자료를 불러오고 있어요</>:<><CircleAlert size={14}/> {message}</>}</div></CardContent></Card>
      {status==="error"&&<Empty title="데이터를 불러오지 못했어요">인터넷 연결을 확인하고 새로고침해 주세요.</Empty>}
      {status==="loading"&&<div className="loading-layout"><div className="skeleton skeleton-title"/><div className="skeleton-row">{[1,2,3,4].map(i=><div key={i} className="skeleton"/>)}</div><div className="skeleton skeleton-large"/></div>}
      {data&&status==="ready"&&<main>{view==="overview"?<Overview data={data} onNav={navigation} focusSector={focus} onFocus={setFocus}/>:view==="simulator"?<Simulation data={data}/>:view==="network"?<NetworkView data={data}/>:view==="compare"?<CompareView data={data}/>:view==="explorer"?<ExplorerView data={data}/>:<Method/>}</main>}
      <footer className="footer"><span>IO Studio · 학습용 산업연관분석 서비스</span><span>출처: 한국은행 2023 산업연관표(연장표)</span></footer></div></div>
  </div>
}
export default App;
