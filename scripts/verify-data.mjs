import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../public/data/processed/', import.meta.url);
const levels = { large: 33, medium: 83, small: 165, basic: 380 };
for (const [level, count] of Object.entries(levels)) {
  const raw=JSON.parse(readFileSync(new URL(`${level}.json`,root),'utf8'));
  assert.equal(raw.year,2023,`${level}: wrong year`);
  assert.equal(raw.sectors.length,count,`${level}: wrong sector count`);
  assert.equal(raw.sheets.length,12,`${level}: wrong sheet count`);
  assert.equal(new Set(raw.sectors.map(s=>s.code)).size,count,`${level}: duplicate sector codes`);
  assert.ok(existsSync(join('public','data','source',`io-${level}.xlsx`)),`${level}: source Excel missing`);
  for (const sheet of raw.sheets) {
    assert.equal(sheet.values.length,sheet.rowNames.length,`${level}: row title mismatch in ${sheet.name}`);
    assert.equal(sheet.values.length,sheet.rowCodes.length,`${level}: row code mismatch in ${sheet.name}`);
    assert.ok(sheet.values.every(row=>row.length===sheet.columns.length),`${level}: malformed matrix in ${sheet.name}`);
  }

  for (const idx of [1,2,3,4,5,6,7,8]) assert.ok(Array.isArray(raw.sheets[idx]?.values),`${level}: missing sheet ${idx}`);
  for (const idx of [6,7,8]) assert.ok(raw.sheets[idx].values.slice(0,count).every(r=>r.length>=count),`${level}: incomplete matrix ${idx}`);
  // In ordinary categories the imported and value-added inducement coefficients
  // sum to 1. A few source sectors (e.g. imported-only commodities) are all-zero.
  for(let j=0;j<count;j++) {
    let imp=0, va=0;
    for(let i=0;i<count;i++) {
      for(const tab of [6,7,8]){
        const cell=Number(raw.sheets[tab].values[i][j]);
        assert.ok(Number.isFinite(cell),`${level}: non-numeric coefficient ${tab}/${i}/${j}`);
      }
      imp+=Number(raw.sheets[7].values[i][j]);
      va+=Number(raw.sheets[8].values[i][j]);
    }
    assert.ok(Math.abs(imp+va-1)<1e-4||Math.abs(imp+va)<1e-6,`${level}: induction balance does not match official data at ${j}`);
  }
  console.log(`${level}: ${count} sectors / 12 sheets / coefficients OK`);
}
const large=JSON.parse(readFileSync(new URL('large.json',root),'utf8'));
const scenarios=[{j:2,amount:10},{j:1,amount:20}]; // 음식료품 10억원 + 광산품 20억원
const induced=(tab)=>large.sectors.reduce((sum,_,i)=>sum+scenarios.reduce((s,{j,amount})=>s+(Number(large.sheets[tab].values[i][j])||0)*amount,0),0);
const almost=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`expected ${expected}, received ${actual}`);
almost(induced(6),63.29410595);  // 생산유발액 · 억원
almost(induced(8),23.218678);    // 부가가치유발액 · 억원
almost(induced(7),6.781322);     // 수입유발액 · 억원
console.log('scenario test: production 63.2941 / value added 23.2187 / import 6.7813 OK');
