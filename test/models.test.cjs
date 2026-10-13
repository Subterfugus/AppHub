const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {ModelStore,inspect,options}=require('../src/models.cjs');
function fixture(t,probe=async()=>({ok:true,dimensions:3,message:'Compatible'})){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-models-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const embedding=path.join(root,'embedding');fs.mkdirSync(path.join(embedding,'onnx'),{recursive:true});fs.writeFileSync(path.join(embedding,'config.json'),JSON.stringify({model_type:'bert'}));fs.writeFileSync(path.join(embedding,'tokenizer.json'),'{}');fs.writeFileSync(path.join(embedding,'onnx/model_quantized.onnx'),Buffer.alloc(2048,7));
 const data=path.join(root,'data'),models=path.join(root,'bundled');const make=()=>new ModelStore({data,models,probe});return {root,embedding,data,models,make,store:make()};
}

test('Chat selection rolls back when saving fails, including switching back to shared inference',async t=>{
 const f=fixture(t);f.store.save=()=>{throw new Error('Synthetic disk full');};
 await assert.rejects(f.store.activateChat('reasoning:qwen3'),/keeps its current model/);assert.equal(f.store.active.chat,null);
 f.store.active.chat='reasoning:qwen3';await assert.rejects(f.store.activateChat(null),/previous model is still selected/);assert.equal(f.store.active.chat,'reasoning:qwen3');assert.equal(f.store.busy,false);
});
test('failed compatibility check preserves selected model and limits',async t=>{const f=fixture(t,async()=>{throw new Error('Unsupported architecture');});await f.store.add('embedding',f.embedding);const id=f.store.profiles.at(-1).id,before=f.store.snapshot();await assert.rejects(f.store.activate('embedding',id,{threads:8,queryPrefix:'query: '}),/previous model.*Unsupported architecture/);assert.deepEqual(f.store.active,before.active);assert.deepEqual(f.store.settings,before.settings);assert.equal(f.store.profiles.at(-1).lastTest.ok,false);assert.equal(f.store.busy,false);assert.deepEqual(f.make().active,before.active);});
test('successful activation persists custom identity, limits and check result',async t=>{const f=fixture(t);await f.store.add('embedding',f.embedding);const p=f.store.profiles.at(-1);await f.store.activate('embedding',p.id,{threads:2,context:2048,queryPrefix:'query: ',documentPrefix:'passage: '});const reloaded=f.make();assert.equal(reloaded.active.embedding,p.id);assert.equal(reloaded.settings.documentPrefix,'passage: ');assert.equal(reloaded.settings.threads,4);assert.equal(reloaded.profiles.at(-1).lastTest.dimensions,3);assert.ok(reloaded.profiles.at(-1).validatedAt);assert.equal(reloaded.snapshot().profiles.at(-1).fingerprint,undefined);});
test('changed or missing custom files restore bundled selection on startup',async t=>{const f=fixture(t);await f.store.add('embedding',f.embedding);await f.store.activate('embedding',f.store.profiles.at(-1).id);fs.appendFileSync(path.join(f.embedding,'onnx/model_quantized.onnx'),'changed');const changed=f.make();assert.equal(changed.active.embedding,'embedding:minilm');assert.match(changed.warning,/missing or changed/);fs.unlinkSync(path.join(f.embedding,'tokenizer.json'));assert.equal(f.make().active.embedding,'embedding:minilm');});
test('embedding cache identity separates model bytes and both prefixes',async t=>{const f=fixture(t);await f.store.add('embedding',f.embedding);const first=f.store.profiles.at(-1),base=f.store.config('embedding',first),query=f.store.config('embedding',first,{...f.store.settings,queryPrefix:'query: '}),doc=f.store.config('embedding',first,{...f.store.settings,documentPrefix:'passage: '});fs.appendFileSync(path.join(f.embedding,'onnx/model_quantized.onnx'),'new');await f.store.add('embedding',f.embedding);const second=f.store.config('embedding',f.store.profiles.at(-1));assert.equal(new Set([base.cacheKey,query.cacheKey,doc.cacheKey,second.cacheKey]).size,4);assert.equal(f.store.config('embedding',first).cacheKey,base.cacheKey);});
test('invalid settings and wrong role cannot mutate active selection',async t=>{const f=fixture(t);for(const value of [{threads:3},{context:512},{queryPrefix:5},{documentPrefix:'x'.repeat(101)}]){assert.throws(()=>options(value));await assert.rejects(f.store.activate('embedding','embedding:minilm',value));assert.equal(f.store.active.embedding,'embedding:minilm');assert.equal(f.store.busy,false);}await assert.rejects(f.store.activate('invalid','off'),/Unknown model role/);await assert.rejects(f.store.activate('embedding','reasoning:qwen3'),/available model/);});
test('off persists without probing and reset restores bundled models',async t=>{let called=0;const f=fixture(t,async()=>{called++;throw new Error('Must not run');});await f.store.activate('reasoning','off',{context:2048});assert.equal(called,0);assert.equal(f.make().active.reasoning,'off');assert.equal(f.store.config('reasoning'),null);assert.equal(f.store.active.embedding,'embedding:minilm');f.store.reset();assert.equal(f.store.active.reasoning,'reasoning:qwen3');assert.equal(f.store.settings.context,8192);});
test('overlapping operations and removal cannot bypass a pending check',async t=>{let release,entered;const started=new Promise(r=>entered=r);const f=fixture(t,async()=>{entered();return new Promise(r=>release=r);});const checking=f.store.activate('embedding','embedding:minilm');await started;assert.equal(f.store.busy,true);await assert.rejects(f.store.add('embedding',f.embedding),/already running/);await assert.rejects(f.store.activate('reasoning','off'),/already running/);assert.throws(()=>f.store.reset(),/finish/);assert.throws(()=>f.store.remove('embedding:minilm'),/finish/);release({ok:true});await checking;assert.equal(f.store.busy,false);});
test('invalid files never create a profile or call compatibility probe',async t=>{let probes=0;const f=fixture(t,async()=>{probes++;return {ok:true};}),before=f.store.profiles.length;fs.writeFileSync(path.join(f.embedding,'config.json'),'{}');await assert.rejects(f.store.add('embedding',f.embedding),/valid config/);const fake=path.join(f.root,'fake.gguf');fs.writeFileSync(fake,Buffer.alloc(1048576));await assert.rejects(inspect('reasoning',fake),/supported GGUF/);await assert.rejects(f.store.add('reasoning',fake));assert.equal(f.store.profiles.length,before);assert.equal(probes,0);assert.equal(f.store.busy,false);});
test('remove only forgets inactive custom entries and leaves model files intact',async t=>{const f=fixture(t);await f.store.add('embedding',f.embedding);const id=f.store.profiles.at(-1).id;await f.store.activate('embedding',id);assert.throws(()=>f.store.remove(id),/inactive custom/);f.store.reset();f.store.remove(id);assert.equal(f.store.profiles.some(p=>p.id===id),false);assert.ok(fs.existsSync(path.join(f.embedding,'onnx/model_quantized.onnx')));assert.throws(()=>f.store.remove('embedding:minilm'),/inactive custom/);});

test('each role applies only its own validated settings',async t=>{const f=fixture(t);await f.store.activate('embedding','embedding:minilm',{threads:8,context:4096,queryPrefix:'query: ',documentPrefix:'passage: '});assert.equal(f.store.settings.threads,4);assert.equal(f.store.settings.context,8192);assert.equal(f.store.settings.queryPrefix,'query: ');await f.store.activate('reasoning','reasoning:qwen3',{threads:2,context:2048,queryPrefix:'untested',documentPrefix:'untested'});assert.equal(f.store.settings.threads,2);assert.equal(f.store.settings.context,2048);assert.equal(f.store.settings.queryPrefix,'query: ');assert.equal(f.store.settings.documentPrefix,'passage: ');});

test('runtime validation falls back before changed custom weights can reuse their cache',async t=>{
 const f=fixture(t);await f.store.add('embedding',f.embedding);const id=f.store.profiles.at(-1).id;await f.store.activate('embedding',id);const customKey=f.store.config('embedding').cacheKey;
 assert.equal(f.store.validateActive(),false);fs.appendFileSync(path.join(f.embedding,'onnx/model_quantized.onnx'),'replacement');
 assert.equal(f.store.validateActive(),true);assert.equal(f.store.active.embedding,'embedding:minilm');assert.notEqual(f.store.config('embedding').cacheKey,customKey);assert.match(f.store.warning,/active custom model.*changed/i);assert.equal(f.make().active.embedding,'embedding:minilm');assert.equal(f.store.validateActive(),false);
 await f.store.activate('embedding',id);assert.notEqual(f.store.config('embedding').cacheKey,customKey);assert.equal(f.store.validateActive(),false);
});

test('runtime validation detects missing tokenizer and newly added model assets',async t=>{
 for(const change of [folder=>fs.unlinkSync(path.join(folder,'tokenizer.json')),folder=>fs.writeFileSync(path.join(folder,'tokenizer_config.json'),'{}'),folder=>fs.writeFileSync(path.join(folder,'onnx/weights.bin'),'external tensor data')]){
  const f=fixture(t);await f.store.add('embedding',f.embedding);await f.store.activate('embedding',f.store.profiles.at(-1).id);change(f.embedding);assert.equal(f.store.validateActive(),true);assert.equal(f.store.active.embedding,'embedding:minilm');
 }
});

test('external tensor files participate in fingerprint and startup validation',async t=>{
 const f=fixture(t),weights=path.join(f.embedding,'onnx/weights.bin');fs.writeFileSync(weights,'tensor bytes');await f.store.add('embedding',f.embedding);const p=f.store.profiles.at(-1);await f.store.activate('embedding',p.id);const key=f.store.config('embedding').cacheKey;fs.appendFileSync(weights,'replacement');assert.equal(f.make().active.embedding,'embedding:minilm');await f.store.activate('embedding',p.id);assert.notEqual(f.store.config('embedding').cacheKey,key);
});

test('runtime reasoning validation falls back while interpretation off stays off',async t=>{
 const f=fixture(t),file=path.join(f.root,'chat.gguf'),bytes=Buffer.alloc(1048576);bytes.write('GGUF');bytes.writeUInt32LE(3,4);fs.writeFileSync(file,bytes);await f.store.add('reasoning',file);await f.store.activate('reasoning',f.store.profiles.at(-1).id);fs.unlinkSync(file);assert.equal(f.store.validateActive(),true);assert.equal(f.store.active.reasoning,'reasoning:qwen3');await f.store.activate('reasoning','off');assert.equal(f.store.validateActive(),false);assert.equal(f.store.active.reasoning,'off');
});

test('bundled embedding cache identity reflects actual bytes and avoids unchanged rehashing',async t=>{
 const f=fixture(t),folder=path.join(f.models,'Xenova/all-MiniLM-L6-v2');fs.mkdirSync(path.dirname(folder),{recursive:true});fs.cpSync(f.embedding,folder,{recursive:true});assert.equal(await f.store.prepareBuiltinEmbedding(),true);const key=f.store.config('embedding').cacheKey;assert.equal(await f.store.prepareBuiltinEmbedding(),false);fs.appendFileSync(path.join(folder,'onnx/model_quantized.onnx'),'new bundled release');assert.equal(await f.store.prepareBuiltinEmbedding(),true);assert.notEqual(f.store.config('embedding').cacheKey,key);
});

test('runtime fallback remains actionable when preferences cannot be persisted',async t=>{
 const f=fixture(t);await f.store.add('embedding',f.embedding);await f.store.activate('embedding',f.store.profiles.at(-1).id);fs.unlinkSync(path.join(f.embedding,'tokenizer.json'));f.store.save=()=>{throw new Error('Disk is full');};assert.equal(f.store.validateActive(),true);assert.equal(f.store.active.embedding,'embedding:minilm');assert.match(f.store.warning,/could not be saved/);assert.equal(f.store.validateActive(),false);
});

test('changed bundled weights cannot run against the startup cache identity',async t=>{
 const f=fixture(t),folder=path.join(f.models,'Xenova/all-MiniLM-L6-v2');fs.mkdirSync(path.dirname(folder),{recursive:true});fs.cpSync(f.embedding,folder,{recursive:true});await f.store.prepareBuiltinEmbedding();fs.appendFileSync(path.join(folder,'onnx/model_quantized.onnx'),'changed in session');assert.throws(()=>f.store.validateActive(),/Restart AppHub/);assert.match(f.store.warning,/bundled search model changed/);await f.store.prepareBuiltinEmbedding();assert.equal(f.store.validateActive(),false);
});

// Optional model downloads: a small synthetic GGUF stands in for the multi-gigabyte file.
function download(t,{corrupt=false,memory=32*1073741824}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-download-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const body=Buffer.alloc(2*1048576,5);body.write('GGUF',0);body.writeUInt32LE(3,4);const sha256=require('node:crypto').createHash('sha256').update(body).digest('hex');const requests=[];
 const fetcher=async(url,{headers,signal})=>{const from=headers.Range?+/bytes=(\d+)-/.exec(headers.Range)[1]:0;requests.push({url,from});const sent=corrupt?Buffer.alloc(body.length-from,9):body.subarray(from);return {ok:true,status:from?206:200,body:(async function*(){for(let i=0;i<sent.length;i+=262144){if(signal.aborted)throw new Error('aborted');yield sent.subarray(i,i+262144);}})()};};
 const item={id:'test-model',name:'Test Model',file:'test.gguf',url:'https://example.invalid/test.gguf',sha256,bytes:body.length,memoryGb:16};
 const make=()=>new ModelStore({data:path.join(root,'data'),models:path.join(root,'bundled'),probe:async()=>({ok:true,message:'Compatible'}),downloads:[item],fetcher,totalMemory:memory});
 return {root,body,requests,item,make,store:make(),target:path.join(root,'data','models','test.gguf')};
}

test('download file-open errors reject normally and release download state',async t=>{
 const f=download(t);fs.mkdirSync(f.target+'.partial',{recursive:true});
 await assert.rejects(f.store.fetchModel('test-model'),/EISDIR|EPERM|illegal operation|directory/);assert.equal(f.store.downloading,null);assert.equal(f.store.abort,null);assert.equal(f.store.profiles.some(p=>p.download),false);
});
test('an optional model is downloaded, verified, registered and survives a restart',async t=>{
 const f=download(t);assert.deepEqual(f.store.snapshot().downloads,[{id:'test-model',name:'Test Model',bytes:f.body.length,memoryGb:16,fits:true,profile:null}]);
 const id=await f.store.fetchModel('test-model');assert.equal(f.store.busy,false);assert.equal(f.store.downloading,null);assert.deepEqual(fs.readFileSync(f.target),f.body);assert.equal(f.store.snapshot().downloads[0].profile,id);assert.equal(f.store.active.reasoning,'reasoning:qwen3');assert.equal(f.store.active.chat,null);
 await f.store.activate('reasoning',id);const again=f.make();assert.equal(again.active.reasoning,id);assert.equal(again.snapshot().downloads[0].profile,id);
 assert.equal(await again.fetchModel('test-model'),id);assert.equal(f.requests.length,1);
 assert.throws(()=>again.removeDownload('test-model'),/Switch to another chat model/);again.reset();again.removeDownload('test-model');assert.equal(fs.existsSync(f.target),false);assert.equal(again.snapshot().downloads[0].profile,null);
});
test('a partial download resumes, and a file that fails its checksum is discarded',async t=>{
 const f=download(t);fs.mkdirSync(path.dirname(f.target),{recursive:true});fs.writeFileSync(f.target+'.partial',f.body.subarray(0,700000));
 await f.store.fetchModel('test-model');assert.deepEqual(f.requests,[{url:f.item.url,from:700000}]);assert.deepEqual(fs.readFileSync(f.target),f.body);
 const bad=download(t,{corrupt:true});await assert.rejects(bad.store.fetchModel('test-model'),/did not match its checksum/);assert.equal(fs.existsSync(bad.target),false);assert.equal(fs.existsSync(bad.target+'.partial'),false);assert.equal(bad.store.profiles.some(p=>p.download),false);assert.equal(bad.store.downloading,null);
});
test('a model that needs more memory than the PC has is refused before any download',async t=>{
 const f=download(t,{memory:8*1073741824});assert.equal(f.store.snapshot().downloads[0].fits,false);await assert.rejects(f.store.fetchModel('test-model'),/needs a PC with 16 GB/);await assert.rejects(f.store.fetchModel('other'),/Unknown model/);assert.equal(f.requests.length,0);
});
test('saved 4096-token limits from earlier versions move to the new default once',t=>{
 const f=fixture(t);fs.mkdirSync(f.data,{recursive:true});fs.writeFileSync(path.join(f.data,'models.json'),JSON.stringify({profiles:[],active:{},settings:{threads:2,context:4096}}));const store=f.make();assert.equal(store.settings.context,8192);assert.equal(store.settings.threads,2);
 fs.writeFileSync(path.join(f.data,'models.json'),JSON.stringify({profiles:[],active:{},settings:{threads:2,context:4096},settingsVersion:2}));assert.equal(f.make().settings.context,4096);
});
test('chat can use its own model while search keeps the bundled one',async t=>{
 const f=download(t);const id=await f.store.fetchModel('test-model');await f.store.activateChat(id);
 assert.equal(f.store.active.chat,id);assert.equal(f.store.active.reasoning,'reasoning:qwen3');assert.equal(f.store.config('chat').modelFile,fs.realpathSync(f.target));assert.match(f.store.config('reasoning').modelFile,/Qwen3-4B/);assert.equal(f.make().active.chat,id);
 assert.throws(()=>f.store.removeDownload('test-model'),/Switch to another chat model/);await assert.rejects(f.store.activateChat('model:reasoning:0000000000000000'),/Choose an available model/);
 fs.appendFileSync(f.target,'changed');assert.equal(f.store.validateActive(),true);assert.equal(f.store.active.chat,null);assert.equal(f.store.config('chat'),null);assert.equal(f.make().active.chat,null);
 const g=download(t,{}),other=await g.store.fetchModel('test-model');await g.store.activateChat(other);await g.store.activateChat(null);assert.equal(g.store.active.chat,null);g.store.removeDownload('test-model');
 const failing=new ModelStore({data:path.join(f.root,'other'),models:path.join(f.root,'bundled'),probe:async()=>{throw new Error('Out of memory');},downloads:[f.item],fetcher:f.store.fetcher,totalMemory:32*1073741824});fs.rmSync(f.target);
 const pid=await failing.fetchModel('test-model');await assert.rejects(failing.activateChat(pid),/Chat keeps its current model.*Out of memory/);assert.equal(failing.active.chat,null);
});
