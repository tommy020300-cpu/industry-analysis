import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../public/data/processed/', import.meta.url);
const levels = { large: 33, medium: 83, small: 165, basic: 380 };
for (const [level, count] of Object.entries(levels)) {
  const raw=JSON.parse(readFileSync(new URL(`${level}.json`,root),'utf8'));
  assert.equal(raw.year,2023,`${level}: wrong year`);
  assert.equal(raw.sectors.length,count,`${level}: wrong sector count`);
  assert.equal(raw.sheets.length,12,`${level}: wrong sheet count`);
  for (const idx of [1,2,3,4,5,6,7,8]) assert.ok(Array.isArray(raw.sheets[idx]?.values),`${level}: missing sheet ${idx}`);
  for (const idx of [6,7,8]) assert.ok(raw.sheets[idx].values.slice(0,count).every(r=>r.length>=count),`${level}: incomplete matrix ${idx}`);
  console.log(`${level}: ${count} sectors / 12 sheets OK`);
}
const large=JSON.parse(readFileSync(new URL('large.json',root),'utf8'));
const scenarios=[{j:2,amount:10},{j:1,amount:20}]; // 음식료품 10억원 + 광산품 20억원
const induced=(tab)=>large.sectors.reduce((sum,_,i)=>sum+scenarios.reduce((s,{j,amount})=>s+(Number(large.sheets[tab].values[i][j])||0)*amount,0),0);
const almost=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`expected ${expected}, received ${actual}`);
almost(induced(6),63.29410595);  // 생산유발액 · 억원
almost(induced(8),23.218678);    // 부가가치유발액 · 억원
almost(induced(7),6.781322);     // 수입유발액 · 억원
console.log('scenario test: production 63.2941 / value added 23.2187 / import 6.7813 OK');
