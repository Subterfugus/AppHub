const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const mainPath=path.resolve(__dirname,'../src/main.cjs'),sourceRequire=createRequire(mainPath);
const libraryModule=sourceRequire('./library.cjs'),reasonerModule=sourceRequire('./reasoner.cjs'),systemModule=sourceRequire('./system.cjs'),lookupModule=sourceRequire('./lookups.cjs');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const plain=value=>JSON.parse(JSON.stringify(value));
const message=content=>[{role:'user',content}];

// Run the actual entrypoint and registered IPC wrappers. Only platform boundaries
// are replaced; package execution and Windows/model processes cannot run here.
async function boot(t,{holdLookup=false}={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-main-features-'));
 t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
 const handlers=new Map(),events=[],resident=new Set(),engines=[],broadcasts=[],lookupCalls=[],systemCalls=[],hardwareCalls=[];
 const lookupStarted=deferred(),lookupRelease=deferred(),loaded=deferred();
 let lib,window,maximumResident=0;
 class FixtureLibrary extends libraryModule.Library{
  constructor(directory,onChange){super(directory,onChange,{run:async()=>{throw new Error('Package process prohibited in main integration tests');},discover:async()=>({registry:[]}),steam:()=>[]});lib=this;
   this.state.apps=[{id:'discovered',name:'Paint',kind:'app',source:'Installed',packageId:'Vendor.Paint',packageSource:'winget',available:'2.0',version:'1.0',description:'Draw and edit pictures',executable:'C:\\Synthetic\\Paint.exe',launch:{type:'exe',target:'C:\\Synthetic\\Paint.exe'}},{id:'notes',name:'Notes',kind:'app',description:'Write text and documents',packageId:'Vendor.Notes',packageSource:'winget',available:'2.0',version:'1.0'}];
   this.prefs.custom=[{id:'custom:paint',name:'Paint',kind:'app',source:'Portable',launch:{type:'exe',target:'C:\\Synthetic\\Paint.exe'}}];
  }
  async scan(){return this.snapshot();}
  async checkPackages(){return this.snapshot();}
  async perform(){}
 }
 class Engine{
  constructor({config}){this.config=config;this.kind=config.kind;this.pending=new Map();this.state={status:'idle'};engines.push(this);}
  load(operation){resident.add(this);maximumResident=Math.max(maximumResident,resident.size);assert.equal(resident.size,1,'a second model became resident before the first stopped');events.push(this.kind+':'+operation);this.state.status='ready';}
  stop(){resident.delete(this);this.state.status='idle';}
  cancel(){}
  async search(){this.load('search');return {'custom:paint':0.9,notes:0.7};}
  async interpret(_query,candidates){this.load('interpret');return {matches:[{id:candidates[0].id,reason:'Fits the described task'}]};}
  async plan(){this.load('plan');return {lookups:['hardware'],search:''};}
  async chat(request,onDelta){this.load('chat');this.lastRequest=request;onDelta('Paint can edit pictures.');return {reply:'Paint can edit pictures.',suggest:['Paint']};}
 }
 class Models{
  constructor(){this.active={reasoning:'reasoning',chat:'chat'};this.busy=false;}
  async prepareBuiltinEmbedding(){}
  config(kind){return {kind,context:8192};}
  snapshot(){return {active:this.active};}
  validateActive(){return false;}
 }
 const capturedAt='2026-10-12T12:00:00.000Z';
 class System{
  async snapshot(force=false){systemCalls.push(force);return {...systemModule.shape({os:'Synthetic Windows',cpu:'Test CPU',cores:4,threads:8}),time:capturedAt};}
 }
 class Lookups{
  async get(id,search,options){lookupCalls.push({id,search,options});events.push('lookup:'+id);lookupStarted.resolve(id);if(holdLookup)await lookupRelease.promise;return {id,title:lookupModule.TOPICS[id].title,text:'Synthetic measurement: CPU load 12%.',collectedAt:capturedAt,expiresAt:capturedAt,cached:!options.force,available:true,data:{capturedAt}};}
  forget(){}
 }
 class BrowserWindow{
  constructor(){window=this;this.webContents={mainFrame:{},setWindowOpenHandler(){},on(){},session:{setPermissionRequestHandler(){}},isDestroyed:()=>false,send:(_channel,value)=>broadcasts.push(value)};}
  isDestroyed(){return false;}
  on(){}
  async loadFile(){loaded.resolve();}
  show(){}
 }
 const electron={app:{setName(){},setAppUserModelId(){},getPath:()=>data,requestSingleInstanceLock:()=>true,on(){},whenReady:()=>Promise.resolve(),getVersion:()=> 'test',quit(){throw new Error('Unexpected main quit');},isPackaged:false},BrowserWindow,ipcMain:{handle:(name,handler)=>handlers.set(name,handler)},shell:{},dialog:{showErrorBox:(_title,error)=>loaded.resolve(new Error(error))},globalShortcut:{register(){},unregisterAll(){}},nativeImage:{},Menu:{setApplicationMenu(){}}};
 const prohibited=()=>{throw new Error('Windows process prohibited in main integration tests');};
 const overrides={electron,'./library.cjs':{...libraryModule,Library:FixtureLibrary},'./ai.cjs':{LocalSearch:Engine},'./reasoner.cjs':{...reasonerModule,LocalReasoner:Engine},'./models.cjs':{ModelStore:Models},'./system.cjs':{...systemModule,SystemInfo:System},'./lookups.cjs':{...lookupModule,Lookups},'./hardware.cjs':{hardware:{snapshot:async options=>{hardwareCalls.push(options);return {capturedAt,cpu:{usagePercent:12}};}}},'./platform.cjs':{...sourceRequire('./platform.cjs'),run:prohibited,ps:prohibited},'./diagnostics.cjs':{createLogger:()=>()=>{},monitorMainErrors(){}}};
 const context={require:name=>Object.hasOwn(overrides,name)?overrides[name]:sourceRequire(name),__dirname:path.dirname(mainPath),process:{env:{APPHUB_TEST_DATA:data}},setTimeout,clearTimeout,AbortController,console};
 vm.runInNewContext(fs.readFileSync(mainPath,'utf8'),context,{filename:mainPath});
 const startupError=await loaded.promise;if(startupError)throw startupError;
 await new Promise(resolve=>setImmediate(resolve));
 const invoke=(name,...args)=>{const handler=handlers.get('apphub:'+name);assert.ok(handler,'Missing IPC handler '+name);return handler({sender:window.webContents,senderFrame:window.webContents.mainFrame},...args);};
 return {invoke,lib,events,engines,resident,lookupCalls,systemCalls,hardwareCalls,lookupStarted:lookupStarted.promise,releaseLookup:lookupRelease.resolve,broadcasts,handlers,maximumResident:()=>maximumResident};
}

test('actual main exact and prefix searches never load a model',async t=>{
 const main=await boot(t);
 for(const query of ['Paint','Pai']){const result=await main.invoke('search',query);assert.equal(result.items[0].id,'custom:paint');assert.equal(result.mode,'keyword');assert.equal(result.reasoning,false);}
 assert.deepEqual(main.events,[]);assert.equal(main.maximumResident(),0);
 const handler=main.handlers.get('apphub:search');await assert.rejects(handler({sender:{},senderFrame:{}},'Paint'),/Untrusted caller/);
});

test('actual main retires independent Chat before embedding and search reasoning, retaining one engine',async t=>{
 const main=await boot(t);
 const reply=await main.invoke('chat',message('Could you inspect this situation?'));
 assert.deepEqual(main.events,['embedding:search','chat:plan','lookup:hardware','chat:chat']);
 assert.deepEqual(plain(reply.looked),['hardware monitor']);
 assert.ok(reply.evidence.some(e=>e.id==='hardware'));
 const result=await main.invoke('search','make pictures brighter');
 assert.equal(result.mode,'semantic');assert.equal(result.reasoning,true);
 assert.deepEqual(main.events.slice(-2),['embedding:search','reasoning:interpret']);
 assert.equal(main.maximumResident(),1);assert.equal(main.resident.size,1);
 assert.equal([...main.resident][0].kind,'reasoning');
});

test('actual Stop settles pending lookup and releases the inference lane before late evidence arrives',{timeout:3000},async t=>{
 const main=await boot(t,{holdLookup:true});
 const pending=main.invoke('chat',message('Could you inspect this situation?'));
 const stopped=assert.rejects(pending,/Stopped/);
 await main.lookupStarted;
 assert.deepEqual(plain(await main.invoke('stopChat')),{ok:true});
 await stopped;
 const result=await main.invoke('search','make pictures brighter');
 assert.equal(result.reasoning,true);
 main.releaseLookup();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(main.events.includes('chat:chat'),false);
 assert.equal(main.maximumResident(),1);
 assert.equal(main.broadcasts.some(value=>value.chatDelta),false);
});

test('actual AI off invalidates a pending Chat lookup and its late result cannot restart generation',{timeout:3000},async t=>{
 const main=await boot(t,{holdLookup:true});
 const pending=main.invoke('chat',message('Could you inspect this situation?'));
 const stopped=assert.rejects(pending,/Stopped/);
 await main.lookupStarted;
 await main.invoke('setAI',false);await stopped;
 assert.equal(main.lib.prefs.aiEnabled,false);assert.equal(main.resident.size,0);
 const before=main.events.length;
 await main.invoke('search','make pictures brighter');assert.equal(main.events.length,before);
 await assert.rejects(main.invoke('chat',message('hello')),/turned off/);
 await main.invoke('setAI',true);main.releaseLookup();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(main.events.includes('chat:chat'),false);assert.equal(main.resident.size,0);
 assert.equal(main.broadcasts.some(value=>value.chatDelta),false);
});

test('actual hardware and refreshed Chat handlers pass force and return timestamped evidence',async t=>{
 const main=await boot(t);
 assert.equal((await main.invoke('hardware',true)).cpu.usagePercent,12);
 await main.invoke('hardware','true');
 assert.deepEqual(plain(main.hardwareCalls),[{force:true},{force:false}]);
 const reply=await main.invoke('chat',message('Show current readings'),{refreshEvidence:true,hardware:true});
 assert.deepEqual(main.events,['lookup:hardware','chat:chat']);
 assert.deepEqual(main.systemCalls,[true]);
 assert.deepEqual(plain(main.lookupCalls),[{id:'hardware',search:'',options:{force:true}}]);
 const evidence=reply.evidence.find(e=>e.id==='hardware');
 assert.equal(evidence.collectedAt,'2026-10-12T12:00:00.000Z');assert.equal(evidence.cached,false);
 assert.match(evidence.text,/CPU load 12%/);
 const chatEngine=main.engines.find(engine=>engine.kind==='chat');
 assert.match(chatEngine.lastRequest.system,/Synthetic measurement: CPU load 12%/);
});

test('actual policy and package IPC resolve a merged custom ID and enforce policy at enqueue',async t=>{
 const main=await boot(t);
 assert.equal(main.lib.state.apps.some(a=>a.id==='custom:paint'),false);
 let snapshot=await main.invoke('setUpdatePolicy','custom:paint',{excluded:true,skipVersion:null});
 assert.equal(snapshot.items.find(a=>a.id==='custom:paint').updateBlocked,true);
 const bulk=await main.invoke('upgrade',['custom:paint','notes','notes']);
 assert.deepEqual(plain(bulk.packages),[{id:'Vendor.Notes',source:'winget'}]);
 assert.equal(bulk.skippedPackages[0].id,'Vendor.Paint');
 await assert.rejects(main.invoke('upgrade',['custom:paint']),/excluded or skipped/);
 main.lib.cancelJob(bulk.id);
 const uninstall=await main.invoke('uninstall','custom:paint');
 assert.equal(uninstall.action,'uninstall');assert.deepEqual(plain(uninstall.packages),[{id:'Vendor.Paint',source:'winget'}]);main.lib.cancelJob(uninstall.id);
 snapshot=await main.invoke('setUpdatePolicy','custom:paint',{excluded:false,skipVersion:null});
 assert.equal(snapshot.items.find(a=>a.id==='custom:paint').updateBlocked,false);
 const upgrade=await main.invoke('upgrade',['custom:paint','custom:paint']);
 assert.deepEqual(plain(upgrade.packages),[{id:'Vendor.Paint',source:'winget'}]);main.lib.cancelJob(upgrade.id);
 await main.lib.queue;
});
