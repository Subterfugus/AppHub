const path=require('node:path');const fs=require('node:fs');const os=require('node:os');const assert=require('node:assert/strict');
const packed=process.env.APPHUB_QA_PACKAGE;const output=process.env.APPHUB_QA_OUTPUT?path.resolve(process.env.APPHUB_QA_OUTPUT):path.resolve(__dirname,'../qa-output');fs.mkdirSync(output,{recursive:true});
const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-packaged-ai-'));const statuses=[];let ai,reasoner,coordinator;
const report={startedAt:new Date().toISOString(),packagedDirectory:packed,dataDirectory:data,statuses,checks:[],residency:[]};
const embeddingPids=new Set(),nativePids=new Set(),guardianPids=new Set();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
function sample(label){const embedding=[...embeddingPids].filter(alive),native=[...nativePids].filter(alive),guardians=[...guardianPids].filter(alive);const value={time:Date.now(),label,embedding,native,guardians,residentModels:embedding.length+native.length};report.residency.push(value);return value;}
const status=kind=>s=>{statuses.push({kind,...s,time:Date.now()});if(s.pid)(kind==='embedding'?embeddingPids:guardianPids).add(s.pid);if(s.serverPid)nativePids.add(s.serverPid);sample(kind+':'+s.status);};
const selected=(engine,fn)=>coordinator.run(()=>true,async()=>{await coordinator.select(engine);sample('selected');return fn();});
async function check(name,fn){const start=Date.now();const detail=await fn();report.checks.push({name,passed:true,durationMs:Date.now()-start,detail});console.log('PASS '+name);}
async function idleExit(engine,pids){assert.equal(engine.idleMs,60000);const start=Date.now();while((engine.worker||pids.some(alive))&&Date.now()-start<70000)await delay(250);assert.equal(engine.worker,null);assert.equal(engine.state.status,'sleeping');assert.equal(engine.state.pid,null);for(const pid of pids)assert.equal(alive(pid),false,'Idle model process '+pid+' must actually exit');return {pids,elapsedMs:Date.now()-start};}
const poll=setInterval(()=>sample('poll'),100);
(async()=>{
 const {LocalSearch}=require(path.join(packed,'resources/app.asar/src/ai.cjs'));
 const {rank}=require(path.join(packed,'resources/app.asar/src/search.cjs'));
 const {LocalReasoner}=require(path.join(packed,'resources/app.asar/src/reasoner.cjs'));
 const {InferenceCoordinator}=require(path.join(packed,'resources/app.asar/src/inference.cjs'));
 reasoner=new LocalReasoner({models:path.join(packed,'resources/models'),runtime:path.join(packed,'resources/runtime'),config:{gpu:false},onStatus:status('reasoner')});
 ai=new LocalSearch({models:path.join(packed,'resources/models'),data,onStatus:status('embedding')});
 coordinator=new InferenceCoordinator({engines:()=>[ai,reasoner]});
 const docs=[{id:'photo',text:'GIMP. Edit photographs, pictures and images. Creative photo manipulation, digital painting, retouching and graphics editor.'},{id:'audio',text:'REAPER. Music and audio recording, digital audio workstation. Record guitar tracks, mix music and edit sound.'},{id:'dev',text:'Visual Studio Code. Source code development editor for programming JavaScript and Python applications.'},{id:'display',text:'Windows display settings. Adjust screen brightness, resolution, monitors, night light and scaling.'}];
 await check('Packaged MiniLM CPU model loads and ranks by meaning',()=>selected(ai,async()=>{const scores=await ai.search('retouch a photograph',docs);for(const d of docs)assert(Number.isFinite(scores[d.id]));assert.equal(Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0],'photo');assert(ai.worker?.pid);assert.equal(sample('embedding ready').residentModels,1);return {scores,pid:ai.worker.pid};}));
 await check('Packaged cached vectors are 384 dimensional',async()=>{const vectors=JSON.parse(fs.readFileSync(path.join(data,'vectors.json'),'utf8'));assert.equal(Object.keys(vectors).length,docs.length);assert(Object.values(vectors).every(v=>v.length===384&&v.every(Number.isFinite)));return {vectors:Object.keys(vectors).length,dimensions:384};});
 await check('Packaged model reuses worker for another semantic search',()=>selected(ai,async()=>{const pid=ai.worker.pid;const scores=await ai.search('make my screen less bright',docs);assert.equal(Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0],'display');assert.equal(ai.worker.pid,pid);return {scores,pid};}));
 await check('Packaged keyword ranking tolerates a misspelling',async()=>{const items=[{id:'photo',name:'GIMP',description:docs[0].text,tags:[]},{id:'audio',name:'REAPER',description:docs[1].text,tags:[]}];assert.equal(rank('reapr',items,{})[0].id,'audio');});
 await check('Packaged embedding exits after its default 60 second idle period',async()=>idleExit(ai,[ai.worker.pid]));
 let embeddingBeforeInterpretation;
 await check('Packaged embedding wakes again before staged interpretation',()=>selected(ai,async()=>{const scores=await ai.search('retouch a photograph',docs);assert.equal(Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0],'photo');embeddingBeforeInterpretation=ai.worker.pid;return {pid:embeddingBeforeInterpretation};}));
 await check('Packaged Qwen3 4B interprets only after embedding has exited',()=>selected(reasoner,async()=>{
  assert.equal(ai.worker,null);assert.equal(ai.state.pid,null);assert.equal(ai.state.status,'sleeping');assert.equal(alive(embeddingBeforeInterpretation),false,'The embedding process must exit before native model inference');assert.equal(sample('before interpretation').residentModels,0);
  const start=Date.now();const result=await reasoner.interpret('How can I retouch a photograph',docs.map(d=>({...d,name:{photo:'GIMP',audio:'REAPER',dev:'Visual Studio Code',display:'Windows display settings'}[d.id],description:d.text,kind:d.id==='display'?'setting':'app'})));assert.equal(result.matches[0].id,'photo');assert(reasoner.state.serverPid);assert.equal(reasoner.state.device,'CPU');report.reasonerPids=[reasoner.state.pid,reasoner.state.serverPid];assert.equal(sample('reasoner ready').residentModels,1);return {elapsedMs:Date.now()-start,answer:result.answer,pids:report.reasonerPids,timing:result.timing};
 }));
 await check('Packaged interpretation declines an unrelated task',()=>selected(reasoner,async()=>{const result=await reasoner.interpret('Book an appointment for my pet at a veterinarian',docs.map(d=>({...d,name:d.id,description:d.text,kind:'app'})));assert.deepEqual(result.matches,[]);assert.equal(ai.worker,null);return {answer:result.answer};}));
 await check('Packaged guardian and native model exit after default 60 second idle period',async()=>idleExit(reasoner,report.reasonerPids));
 report.maxSimultaneousResidentModels=Math.max(...report.residency.map(s=>s.residentModels));assert.equal(report.maxSimultaneousResidentModels,1);report.passed=true;
})().catch(e=>{report.passed=false;report.error=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
 try{if(coordinator)await coordinator.stopAll();else{ai?.stop();reasoner?.stop();}}catch(e){report.passed=false;report.cleanupError=e.stack;process.exitCode=1;}clearInterval(poll);report.finalResidency=sample('all stopped');if(report.finalResidency.residentModels||report.finalResidency.guardians.length){report.passed=false;report.cleanupError='Owned model processes remained after shutdown';process.exitCode=1;}report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'packaged-search-report.json'),JSON.stringify(report,null,2));console.log('QA report: '+path.join(output,'packaged-search-report.json'));
});
