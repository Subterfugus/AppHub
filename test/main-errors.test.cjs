const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {run}=require('../src/platform.cjs');const {createLogger}=require('../src/diagnostics.cjs');
test('output callback failure cannot create per-chunk exceptions or finish an active process early',async()=>{
 let calls=0;const start=Date.now();const result=await run(process.execPath,['-e',"let n=0;const t=setInterval(()=>{process.stdout.write(String(++n));if(n===3)clearInterval(t)},40)"],{timeout:5000,onOutput:()=>{calls++;throw new Error('Synthetic display failure');}});
 assert.equal(result.code,0);assert.equal(result.out,'123');assert.equal(calls,3);assert.match(result.outputWarning,/Synthetic display failure/);assert(Date.now()-start>=110);
});
test('local diagnostics preserve error context and cannot throw when storage fails',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-errors-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const log=createLogger(()=>folder);log('renderer-delivery',new Error('Synthetic failure'));
 const entry=JSON.parse(fs.readFileSync(path.join(folder,'logs/main.log'),'utf8'));assert.equal(entry.scope,'renderer-delivery');assert.match(entry.stack,/Synthetic failure/);
 const blocked=path.join(folder,'blocked');fs.writeFileSync(blocked,'fixture');assert.doesNotThrow(()=>createLogger(()=>blocked)('test',new Error('failure')));
});
test('non-Error callback failures cannot escape or erase the process result',async()=>{
 for(const value of [null,undefined,{toString(){throw new Error('Synthetic conversion failure');}}]){
  const result=await run(process.execPath,['-e',"process.stdout.write('completed')"],{timeout:5000,onOutput:()=>{throw value;}});
  assert.equal(result.code,0);assert.equal(result.out,'completed');assert.match(result.outputWarning,/Output display failed:/);
 }
});
test('fatal error monitoring records the trace while preserving process failure',t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-fatal-log-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
 const diagnostics=path.resolve(__dirname,'../src/diagnostics.cjs');const script=`const {createLogger,monitorMainErrors}=require(${JSON.stringify(diagnostics)});monitorMainErrors(createLogger(()=>${JSON.stringify(folder)}));throw new Error('Synthetic fatal trace');`;
 const child=require('node:child_process').spawnSync(process.execPath,['-e',script],{windowsHide:true,encoding:'utf8',timeout:5000});
 assert.ifError(child.error);assert.equal(child.status,1);assert.match(child.stderr,/Synthetic fatal trace/);
 const entry=JSON.parse(fs.readFileSync(path.join(folder,'logs/main.log'),'utf8'));assert.equal(entry.scope,'uncaught:uncaughtException');assert.match(entry.stack,/Synthetic fatal trace/);
});
