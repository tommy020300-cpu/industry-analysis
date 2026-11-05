/* 선택적 Pyodide Worker: 외부 CDN 실패 시 웹앱의 JavaScript 계산은 유지됨. */
let runtime;
async function py(){if(!runtime)runtime=(async()=>{importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');const p=await loadPyodide(),r=await fetch('model.py');if(!r.ok)throw Error('model.py 읽기 실패');p.runPython(await r.text());return p;})();return runtime;}
self.onmessage=async e=>{if(e.data?.kind!=='calculate')return;try{const p=await py();p.globals.set('payload_json',JSON.stringify(e.data));self.postMessage(JSON.parse(p.runPython('calculate(payload_json)')));}catch(err){self.postMessage({error:String(err)});}};
