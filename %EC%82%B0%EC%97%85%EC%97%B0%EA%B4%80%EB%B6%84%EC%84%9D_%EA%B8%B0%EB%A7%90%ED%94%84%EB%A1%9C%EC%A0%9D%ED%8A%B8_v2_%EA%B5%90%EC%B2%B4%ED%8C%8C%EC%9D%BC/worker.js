/* Pyodide를 통한 독립적 Python 계산 비교. CDN 연결 실패 시 JS 계산은 유지. */
let instance;
async function engine(){
  if(!instance){
    instance=(async()=>{
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      const runtime=await loadPyodide();
      const response=await fetch('model.py');
      if(!response.ok)throw Error('model.py를 불러오지 못했습니다.');
      runtime.runPython(await response.text());
      return runtime;
    })();
  }
  return instance;
}
self.onmessage=async e=>{
  if(e.data?.kind!=='calculate')return;
  try{
    const runtime=await engine();
    runtime.globals.set('payload_json',JSON.stringify(e.data));
    self.postMessage(JSON.parse(runtime.runPython('calculate(payload_json)')));
  }catch(err){self.postMessage({requestId:e.data?.requestId,error:String(err)});}
};
