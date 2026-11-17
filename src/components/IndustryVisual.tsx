import { memo } from "react";
import type { Sector } from "@/lib/io";

/**
 * An illustrative family is chosen for every official BOK sector using the basic-sector
 * code first, and descriptive keywords for higher aggregation levels. These are visual
 * category cues only, NOT unique images or economic classifications of the 380 sectors.
 */
const families = {
  agriculture: "농업", livestock: "축산", fishery: "수산", mining: "광업·원료",
  food: "식품·외식", textile: "섬유·의류", timber: "목재·임산", paper: "종이·인쇄",
  petroleum: "석유", chemical: "화학·소재", pharma: "의약", machinery: "기계·설비",
  semiconductor: "전자·디지털", manufacturing: "제조·제품", automotive: "자동차",
  maritime: "선박·항공", construction: "건설", energy: "에너지", water: "수도·환경",
  retail: "유통·상업", logistics: "물류·운송", finance: "금융·보험",
  education: "교육·공공", healthcare: "의료·보건"
} as const;
export type Family = keyof typeof families;
const textRules: Array<[RegExp, Family]> = [
  [/낙농|축우|양돈|가금|축산|사료|동물 사육/,"livestock"],
  [/수산|양식|어획|어업|어류|어선/,"fishery"],
  [/농림|농업|곡류|곡물|맥류|콩류|벼|감자|채소|과실|작물|종자|원예|화훼/,"agriculture"],
  [/임업|원목|목재|합판|제재|산림|임산/,"timber"],
  [/도축|제분|식료|식품|음식점|외식|주점|커피|빵|과자|비알콜음료|정곡|주류/,"food"],
  [/섬유|직물|의복|의류|가죽|모피|신발|봉제|염색/,"textile"],
  [/인쇄|종이|펄프|신문|출판|기록매체|골판지/,"paper"],
  [/원유|경유|휘발유|정유|석유정제|중유|나프타|윤활유|석탄제품/,"petroleum"],
  [/반도체|집적회로|디스플레이|전자부품|컴퓨터|소프트웨어|정보통신|방송통신|IT서비스|데이터|이동전화|디지털/,"semiconductor"],
  [/의약|약품|제약|의료용 기기/,"pharma"],
  [/화학|비료|가스|염료|도료|고무|플라스틱|합성수지|세제|화장품|화합물/,"chemical"],
  [/광석|광업|광산|골재|석회석|비금속광물|석탄|철광|비철금속|제련|철강|금속/,"mining"],
  [/자동차|승용차|트레일러|버스|자동차용|자동차 부분품|자동차 엔진/,"automotive"],
  [/선박|조선|항공기|모터사이클|철도차량|외항|수상운송/,"maritime"],
  [/발전|전력|전기공급|에너지|도시가스|재생|전지|열공급|증기/,"energy"],
  [/수도|상하수도|하수|폐수|폐기물|재활용|환경정화/,"water"],
  [/건설|건축|도로시설|항만시설|토목|플랜트|시멘트|레미콘|콘크리트/,"construction"],
  [/도매|소매|판매|유통|상품중개|쇼핑|시장|비알콜음료점/,"retail"],
  [/운송|운반|물류|택배|하역|창고|보관|우편|화물|철도|여객/,"logistics"],
  [/금융|보험|은행|연금|투자기관|부동산|임대|회계|법무|시장조사|경영지원/,"finance"],
  [/보건|의료|병원|복지|사회보험|건강/,"healthcare"],
  [/교육|학교|학원|연구개발|공공|중앙정부|지방정부|문화|예술|관광|방송|스포츠/,"education"],
  [/공업|공구|전자기기|기계|기기|장비|설비|로봇|펌프|압축기|밸브|금형|모형|측정/,"machinery"],
  [/유리|도자|가구|귀금속|제품|제조|기타/,"manufacturing"],
];

// Basic-part codes preserve finer categories even when the sector name is very short (e.g. "벼").
function fromBasicCode(code: string): Family | null {
  if (!/^\d{4}$/.test(code)) return null;
  const n = Number(code);
  if (n < 200) return "agriculture";
  if (n < 300) return "livestock";
  if (n < 400) return "timber";
  if (n < 500) return "fishery";
  if (n < 600) return "agriculture";
  if (n < 800) return "mining";
  if (n < 1100) return "food";
  if (n < 1300) return "textile";
  if (n < 1400) return "timber";
  if (n < 1600) return "paper";
  if (n < 1700) return "petroleum";
  if (n < 2000) return "chemical";
  if (n < 2100) return "pharma";
  if (n < 2500) return "chemical";
  if (n < 2900) return "manufacturing";
  if (n < 3100) return "machinery";
  if (n < 3600) return "semiconductor";
  if (n < 3700) return "pharma";
  if (n < 3800) return "energy";
  if (n < 4000) return "machinery";
  if (n < 4100) return "automotive";
  if (n < 4300) return "maritime";
  if (n < 4500) return "manufacturing";
  if (n < 4700) return "energy";
  if (n < 5000) return "water";
  if (n < 5200) return "construction";
  if (n < 5300) return "retail";
  if (n < 5800) return "logistics";
  if (n < 5900) return "food";
  if (n < 6300) return "semiconductor";
  if (n < 6400) return "paper";
  if (n < 6500) return "education";
  if (n < 7000) return "finance";
  if (n < 7100) return "education";
  if (n < 7120) return "finance";
  if (n < 7200) return "retail";
  if (n < 7211) return "construction";
  if (n < 7300) return "machinery";
  if (n < 7410) return "finance";
  if (n < 7420) return "construction";
  if (n < 7500) return "finance";
  if (n < 7700) return "education";
  if (n < 7900) return "healthcare";
  if (n < 8200) return "education";
  if (n < 8300) return "machinery";
  return "manufacturing";
}

export function sectorFamily(sector: Sector): Family {
  // Some precise labels need semantic matching before fallback to broad code grouping.
  const coded = fromBasicCode(sector.code);
  // The four-digit BOK category is more reliable than ambiguous keywords
  // such as "농업용 기계" (machinery) or "식품 가공기계" (machinery).
  if (coded) return coded;
  const special = textRules.find(([regex]) => regex.test(sector.name));
  return special?.[1] ?? "manufacturing";
}

export function sectorGroup(sector: Sector): string {
  const f=sectorFamily(sector);
  if (["agriculture","livestock","fishery","food","timber"].includes(f)) return "농림·식품";
  if (["mining","textile","paper","petroleum","chemical","pharma","manufacturing"].includes(f)) return "제조·소재";
  if (["semiconductor","machinery"].includes(f)) return "전자·기계";
  if (["energy","water","construction"].includes(f)) return "에너지·건설";
  if (["automotive","maritime","retail","logistics"].includes(f)) return "운송·유통";
  return "금융·생활서비스";
}

export const sectorGroups=["전체","농림·식품","제조·소재","전자·기계","에너지·건설","운송·유통","금융·생활서비스"] as const;

export const IndustryVisual = memo(function IndustryVisual({sector,size="md",className=""}:{sector:Sector;size?:"sm"|"md"|"lg";className?:string}) {
  const family=sectorFamily(sector);
  return <span className={`industry-art size-${size} ${className}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/industry-families/${family}.webp`} width="96" height="96" loading="lazy" decoding="async" alt="" /></span>;
});

export const ThemeVisual = memo(function ThemeVisual({family,size="md"}:{family:Family;size?:"sm"|"md"|"lg"}) {
  return <span className={`industry-art size-${size}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}assets/industry-families/${family}.webp`} width="96" height="96" loading="lazy" decoding="async" alt="" /></span>;
});
