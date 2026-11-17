/** 한국은행 2023 산업연관표(연장표), 생산자가격 — 계산 및 데이터 계약 */
export type Level = "large" | "medium" | "small" | "basic";
export type Sector = {code: string; name: string};
export type IOSheet = {
  name: string;
  unit: string;
  rowNames: string[];
  rowCodes: string[];
  columns: Sector[];
  values: (number | string | null)[][];
};
export type IOData = {
  year: number;
  priceBasis: string;
  level: Level;
  sectors: Sector[];
  sheets: IOSheet[];
  source?: string;
};
export type Scenario = {j:number; amount:number};
export type ImpactResult = {
  inputs: Scenario[];
  demand: number;
  prod: number[];
  imp: number[];
  va: number[];
  totalProd: number;
  totalImp: number;
  totalVa: number;
};
export const levels: Record<Level,{label:string; count:number; file:string}> = {
  large: {label:"통합대분류", count:33, file:"io-large.xlsx"},
  medium: {label:"통합중분류", count:83, file:"io-medium.xlsx"},
  small: {label:"통합소분류", count:165, file:"io-small.xlsx"},
  basic: {label:"기본부문", count:380, file:"io-basic.xlsx"},
};
export const fmt = (n:number, maxDigits=2) => Number.isFinite(n) ? n.toLocaleString("ko-KR",{maximumFractionDigits:maxDigits}) : "—";
export const cv = (n:number) => Number.isFinite(n)?n.toFixed(3):"—";
export const numeric = (v:unknown):number => v === null || v === undefined || v === "" ? 0 : (Number(v) || 0);
export const entry = (data:IOData, tab:number, row:number, col:number) => numeric(data.sheets[tab]?.values[row]?.[col]);
export const columnSum = (data:IOData, tab:number, col:number) => data.sectors.reduce((total,_,row)=>total+entry(data,tab,row,col),0);
export const normalized = (s:string) => s.trim().toLocaleLowerCase("ko-KR");
export const sectorMatches = (s:Sector,term:string) => !normalized(term) || normalized(`${s.code} ${s.name}`).includes(normalized(term));

export function validateData(data:IOData,level:Level):void {
  if(data?.sectors?.length !== levels[level].count || data?.sheets?.length !== 12)throw new Error("산업 수 또는 시트 수가 원본 기준과 다릅니다.");
  if(![1,2,3,4,5,6,7,8].every(i => Array.isArray(data.sheets[i]?.values)))throw new Error("거래표 또는 유발계수 시트가 없습니다.");
  const n=data.sectors.length;
  for(const tab of [6,7,8]){
    if(data.sheets[tab].values.length<n || data.sheets[tab].values.some((r,i)=>i<n&&!Array.isArray(r)))throw new Error("유발계수 행렬 구조가 올바르지 않습니다.");
  }
}

/** 행: 유발 산업, 열: 최종수요 충격 산업. 서로 다른 수요 변화를 한 벡터로 합산. */
export function calculate(data:IOData,scenarios:Scenario[]):ImpactResult {
  const n=data.sectors.length;
  const prod=new Float64Array(n),imp=new Float64Array(n),va=new Float64Array(n);
  let demand=0;
  for(const {j,amount} of scenarios){
    if(!Number.isInteger(j)||j<0||j>=n||!Number.isFinite(amount)||amount<=0||amount>1e8)throw new Error("시나리오의 산업 또는 금액이 유효하지 않습니다.");
    demand+=amount;
    for(let i=0;i<n;i++){
      prod[i]+=entry(data,6,i,j)*amount;
      imp[i]+=entry(data,7,i,j)*amount;
      va[i]+=entry(data,8,i,j)*amount;
    }
  }
  const sum=(x:Float64Array)=>x.reduce((a,b)=>a+b,0);
  return {inputs:scenarios.map(s=>({...s})),demand,prod:Array.from(prod),imp:Array.from(imp),va:Array.from(va),totalProd:sum(prod),totalImp:sum(imp),totalVa:sum(va)};
}
export const ranking = (data:IOData,tab:number,limit=10) => data.sectors.map((s,j)=>({...s,j,value:columnSum(data,tab,j)})).sort((a,b)=>b.value-a.value).slice(0,limit);
export const topSuppliers=(data:IOData,j:number,limit=8)=>data.sectors.map((s,i)=>({...s,index:i,value:entry(data,2,i,j)})).filter(s=>s.value>0).sort((a,b)=>b.value-a.value).slice(0,limit);
export const topBuyers=(data:IOData,j:number,limit=8)=>data.sectors.map((s,i)=>({...s,index:i,value:entry(data,2,j,i)})).filter(s=>s.value>0).sort((a,b)=>b.value-a.value).slice(0,limit);

export function csvDownload(filename:string,rows:(string|number|null|undefined)[][]){
  const line=rows.map(r=>r.map(x=>'"'+String(x??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
  const blob=new Blob(["\ufeff",line],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function downloadResult(data:IOData,result:ImpactResult,level:Level){
  const rows:(string|number)[][]=[["구분","산업코드","산업명","값","단위"]];
  result.inputs.forEach(s=>rows.push(["수요 증가액",data.sectors[s.j].code,data.sectors[s.j].name,s.amount,"억원"]));
  for(const [name,key] of [["총 생산유발액","totalProd"],["총 부가가치유발액","totalVa"],["총 수입유발액","totalImp"]] as const){rows.push([name,"전산업","합계",result[key],"억원"])}
  data.sectors.forEach((s,i)=>{
    rows.push(["생산유발액",s.code,s.name,result.prod[i],"억원"]);
    rows.push(["부가가치유발액",s.code,s.name,result.va[i],"억원"]);
    rows.push(["수입유발액",s.code,s.name,result.imp[i],"억원"]);
  });
  csvDownload(`2023_${level}_산업연관_파급효과.csv`,rows);
}
