const {app,BrowserWindow,ipcMain,shell,dialog,globalShortcut,nativeImage,Menu}=require('electron');
const fs=require('node:fs');const path=require('node:path');
const {Library,validatePackage,packageKey}=require('./library.cjs');const {LocalSearch}=require('./ai.cjs');const {rank,document}=require('./search.cjs');const {run,ps,parseTable}=require('./platform.cjs');const {LocalReasoner,shouldInterpret,validateAnswer}=require('./reasoner.cjs');const {ModelStore}=require('./models.cjs');const {SystemInfo}=require('./system.cjs');const {buildChat,resolveSuggestions,planChat,mergePlan,needsPlan}=require('./chat.cjs');const {Lookups,TOPICS,endable,startupFlag,startupKey}=require('./lookups.cjs');
app.setName('AppHub');app.setAppUserModelId('local.apphub.desktop');
const {createWindowDelivery}=require('./window-delivery.cjs');
const {createLogger,monitorMainErrors}=require('./diagnostics.cjs');
const {InferenceCoordinator,cancellable}=require('./inference.cjs');const {hardware}=require('./hardware.cjs');
const system=new SystemInfo(),lookups=new Lookups();let chatSequence=0;
let win,library,ai,reasoner,chatter,models,modelProbe,modelsRoot,runtimeRoot,dataRoot,lastSearchQuery='',searchSequence=0,importPlan=null,loadingIcons=false,iconTimer=null,shuttingDown=false;
let searchAbort,chatAbort;
const inference=new InferenceCoordinator({engines:()=>[ai,reasoner,chatter,modelProbe]});
const logMain=createLogger(()=>dataRoot||app.getPath('userData'));monitorMainErrors(logMain);
function reportMain(scope,error){try{logMain(scope,error);}catch{}}
const windowDelivery=createWindowDelivery({getWindow:()=>win,isClosing:()=>shuttingDown,log:(scope,error)=>logMain(scope,error)});
const single=app.requestSingleInstanceLock();if(!single)app.quit();
app.on('second-instance',()=>windowDelivery.focus());
function broadcast(data){windowDelivery.send(data);if(data.lastScan&&!loadingIcons&&!iconTimer&&!shuttingDown&&windowDelivery.alive()){iconTimer=setTimeout(()=>{iconTimer=null;void loadIcons();},200);iconTimer.unref?.();}}
async function loadIcons(){if(loadingIcons||!library||shuttingDown||!windowDelivery.alive())return;loadingIcons=true;try{let changed=false;for(const a of library.state.apps){if(shuttingDown||!windowDelivery.alive())break;if(a.iconData)continue;const f=a.executable||(['exe','shortcut'].includes(a.launch?.type)?a.launch.target:null);if(!f||!fs.existsSync(f))continue;try{const icon=await app.getFileIcon(f,{size:'normal'});if(!icon.isEmpty()){a.iconData=icon.toDataURL();changed=true;}}catch(error){reportMain('icon-read',error);}}
if(changed&&!shuttingDown&&windowDelivery.alive()){library.save('library.json',library.state);windowDelivery.send(library.snapshot());}}catch(error){reportMain('icon-refresh',error);}finally{loadingIcons=false;}}
function handle(name,fn){ipcMain.handle('apphub:'+name,async(e,...args)=>{if(e.sender!==win.webContents||e.senderFrame!==win.webContents.mainFrame)throw new Error('Untrusted caller');return fn(...args);});}
function configureEngines(){for(const engine of new Set([ai,reasoner,chatter].filter(Boolean)))void inference.retire(engine);ai=new LocalSearch({models:modelsRoot,data:dataRoot,config:models.config('embedding'),onStatus:s=>broadcast({ai:s})});reasoner=new LocalReasoner({models:modelsRoot,runtime:runtimeRoot,config:{...(models.config('reasoning')||{name:'Interpretation disabled'}),gpu:library.prefs.gpu!==false},onStatus:s=>broadcast({reasoner:s})});
 // Independent choices share one memory budget: only the engine selected for the current stage can remain loaded.
 const chat=models.config('chat');chatter=chat?new LocalReasoner({models:modelsRoot,runtime:runtimeRoot,config:{...chat,gpu:library.prefs.gpu!==false},onStatus:s=>broadcast({chatEngine:s})}):reasoner;
 broadcast({ai:ai.state,reasoner:reasoner.state,chatEngine:chatter===reasoner?null:chatter.state,models:models.snapshot()});}
function stopReasoners(){for(const engine of new Set([reasoner,chatter].filter(Boolean)))void inference.retire(engine);}
function invalidateInference(){searchSequence++;chatSequence++;searchAbort?.abort();chatAbort?.abort();reasoner?.cancel();chatter?.cancel('Stopped','chat');}
function validateSearchModels(){if(models.validateActive()){void inference.retire(ai);stopReasoners();configureEngines();models.validateActive();return models.warning;}}
async function probeModel(profile,settings){
 await inference.stopAll();
 if(profile.bytes+1610612736>require('node:os').freemem())throw new Error('Not enough memory is free for a safe model check. Close other apps or choose a smaller model.');
 const config=models.config(profile.role,profile,settings);const worker=modelProbe=profile.role==='embedding'?new LocalSearch({models:modelsRoot,data:path.join(dataRoot,'model-checks'),config}):new LocalReasoner({models:modelsRoot,runtime:runtimeRoot,config});
 try{if(profile.role==='embedding'){const scores=await worker.search('make the screen warmer at night',[{id:'display',text:'Night light. Warmer display colors at night.'},{id:'audio',text:'Audio recording and music editing.'}]);if(!Object.values(scores).every(Number.isFinite)||scores.display<=scores.audio)throw new Error('The embedding model did not retrieve the expected test entry');return {ok:true,dimensions:worker.state.dimensions,message:'Local loading and semantic retrieval passed'};}
  const result=await worker.interpret('make the screen warmer at night',[{id:'display',name:'Night light',kind:'setting',description:'Warmer screen colors at night, reducing blue light.'},{id:'audio',name:'Audio editor',kind:'app',description:'Record and edit music tracks.'}]);if(result.matches[0]?.id!=='display')throw new Error('The chat model did not pass the structured search check');return {ok:true,message:'Local loading and structured search passed'};
 }finally{try{await inference.retire(worker);}finally{modelProbe=null;}}
}
async function start(){
 const data=dataRoot=process.env.APPHUB_TEST_DATA||app.getPath('userData');library=new Library(data,broadcast);
 modelsRoot=app.isPackaged?path.join(process.resourcesPath,'models'):path.join(__dirname,'../models');runtimeRoot=app.isPackaged?path.join(process.resourcesPath,'runtime'):path.join(__dirname,'../runtime');
 models=new ModelStore({data,models:modelsRoot,onChange:s=>broadcast({models:s}),probe:probeModel});try{await models.prepareBuiltinEmbedding();}catch{}configureEngines();
 handle('snapshot',()=>({...library.snapshot(),ai:ai.state,reasoner:reasoner.state,chatEngine:chatter===reasoner?null:chatter.state,models:models.snapshot(),appVersion:app.getVersion(),dataDirectory:data}));
 handle('scan',async()=>{await library.scan();return library.checkPackages();});handle('packages',()=>library.checkPackages());
 handle('search',async(query,semantic=true)=>{
  if(typeof query!=='string'||query.length>300)throw new Error('Search is too long');
  const seq=++searchSequence;const activeSearch=searchAbort;activeSearch?.abort();if(activeSearch&&ai.pending.size)void inference.retire(ai);if(query!==lastSearchQuery){lastSearchQuery=query;reasoner.cancel();}
  const items=library.all().filter(a=>!a.hidden);if(!query.trim())return {items,mode:'browse',ai:ai.state,reasoner:reasoner.state};
  let scores={},warning=models.busy?'A model compatibility check is running':undefined,answer=null,recommendations=[],matches=[],reasoningWarning=null,reasoning=false;
  let ranked=rank(query,items,scores);
  // Names/prefixes are already deterministic matches. Avoid waking any model for them.
  if(semantic&&library.prefs.aiEnabled&&!models.busy&&shouldInterpret(query,ranked)){
   if(chatAbort&&!chatAbort.signal.aborted)warning='Chat is using local AI. Name and keyword results are available.';
   else{const controller=searchAbort=new AbortController(),valid=()=>seq===searchSequence&&!controller.signal.aborted&&library.prefs.aiEnabled&&!models.busy;
    try{await inference.run(valid,async()=>{
     warning=validateSearchModels()||warning;await inference.select(ai,valid);
     try{scores=await cancellable(ai.search(query,items.map(a=>({id:a.id,text:document(a)}))),controller.signal);}catch(e){if(!valid())throw e;warning=e.message;}
     if(!valid())throw new Error('Stopped');ranked=rank(query,items,scores);
     if(models.active.reasoning!=='off'&&ranked.length&&shouldInterpret(query,ranked)){
      broadcast({searchPreview:{query,items:ranked}});await inference.select(reasoner,valid);
      const candidates=ranked.slice(0,16).map(a=>({...a,searchText:document(a)}));
      try{const interpreted=validateAnswer(await cancellable(reasoner.interpret(query,candidates),controller.signal),candidates);if(valid()){answer=interpreted.answer;recommendations=interpreted.matches.map(m=>m.id);matches=interpreted.matches;reasoning=true;const order=new Map(interpreted.matches.map((m,i)=>[m.id,i]));ranked.sort((a,b)=>(order.get(a.id)??99)-(order.get(b.id)??99));}}catch(e){if(valid())reasoningWarning=e.message;}
     }
    });}catch(e){if(valid())warning=e.message;}finally{if(searchAbort===controller)searchAbort=null;}
   }
  }
  return {items:ranked,mode:Object.keys(scores).length?'semantic':'keyword',warning,answer,recommendations,matches,reasoning,reasoningWarning,ai:ai.state,reasoner:reasoner.state};
 });
 // Chat reads the library, a system snapshot and the read-only lookups this question needs. The model can only name buttons; the user clicks and confirms every action.
 handle('chat',async(messages,options={})=>{
  if(!library.prefs.aiEnabled)throw new Error('Local AI is turned off in Settings');if(models.busy)throw new Error('Wait for the model check to finish');if(models.active.reasoning==='off'&&!models.active.chat)throw new Error('Choose a chat model in Settings to use chat');
  if(!Array.isArray(messages)||!messages.length||messages.length>4000)throw new Error('Start a new chat');if(!options||typeof options!=='object'||Array.isArray(options))throw new Error('Invalid chat options');
  const turns=messages.slice(-40).map(m=>({role:m?.role==='assistant'?'assistant':'user',content:String(m?.content??'').slice(0,2000)})).filter(m=>m.content.trim());while(turns.length>1&&turns[0].role!=='user')turns.shift();const last=turns[turns.length-1];if(!last||last.role!=='user')throw new Error('Type a message first');
  const seq=++chatSequence;chatAbort?.abort();chatter.cancel('Stopped','chat');searchAbort?.abort();reasoner.cancel();
  const controller=chatAbort=new AbortController(),valid=()=>seq===chatSequence&&!controller.signal.aborted&&library.prefs.aiEnabled&&!models.busy;
  const status=text=>{if(valid())broadcast({chatStatus:{seq,text}});};
  try{return await cancellable(inference.run(valid,async()=>{
   validateSearchModels();const items=library.all().filter(a=>!a.hidden),question=last.content.slice(0,600);let scores={};
   const infoPromise=system.snapshot(options.refreshEvidence===true);
   // Retrieval finishes and releases its model before routing/generation can load.
   const lexical=rank(question,items,{});if(shouldInterpret(question,lexical)&&!options.hardware){await inference.select(ai,valid);try{scores=await cancellable(ai.search(question.slice(0,300),items.map(a=>({id:a.id,text:document(a)}))),controller.signal);}catch(e){if(!valid())throw e;}}
   let plan=null;if(!options.hardware&&needsPlan(question)){status('Working out what to check…');await inference.select(chatter,valid);try{plan=await cancellable(chatter.plan(planChat(turns)),controller.signal);}catch(e){if(!valid())throw e;}}
   if(!valid())throw new Error('Stopped');
   const context=chatter.config.context||8192,wanted=mergePlan(question,plan,context>=8192?3:2);
   if(options.hardware===true)wanted.topics=['hardware',...wanted.topics.filter(id=>id!=='hardware')].slice(0,context>=8192?3:2);
   if(wanted.topics.length)status('Checking '+wanted.topics.map(id=>TOPICS[id].slow||TOPICS[id].title).join(', ')+'…');
   const [found,info]=await cancellable(Promise.all([Promise.all(wanted.topics.map(id=>lookups.get(id,id==='catalog'?wanted.search:'',{force:options.refreshEvidence===true}))),infoPromise]),controller.signal);
   if(!valid())throw new Error('Stopped');
   const looked=found.filter(Boolean),request=buildChat({turns,items,related:rank(question,items,scores).slice(0,12),system:info,lookups:looked,context});status('');await inference.select(chatter,valid);
   const result=await cancellable(chatter.chat(request.chat,text=>{if(valid())broadcast({chatDelta:{seq,text}});}),controller.signal);
   if(!valid())throw new Error('Stopped');
   return {seq,reply:result.reply,truncated:!!result.truncated,looked:looked.map(l=>l.title),evidence:request.evidence,suggestions:resolveSuggestions(result.suggest,request.options,result.reply,request.updates)};
  }),controller.signal);}finally{if(chatAbort===controller)chatAbort=null;}
 });
 handle('stopChat',()=>{chatSequence++;chatAbort?.abort();chatter.cancel('Stopped','chat');return {ok:true};});
 handle('system',()=>system.snapshot());
 // The Hardware view polls this every second: a forced call waits for a complete reading, any other returns at once with fresh CPU and memory and the newest counters.
 handle('hardware',async force=>{const reading=await(force===true||!hardware.live?hardware.snapshot({force:force===true}):hardware.live(force==='glance'?15000:undefined));return Array.isArray(reading?.processes)?{...reading,processes:reading.processes.map(p=>({...p,endable:endable(p.name)}))}:reading;});
 handle('setUpdatePolicy',(id,policy)=>library.setUpdatePolicy(id,policy));
 // Actions chat can offer as buttons. Each is checked here against the live system, whatever the model suggested.
 handle('uninstall',id=>{const a=library.all().find(a=>a.id===id&&a.packageId);if(!a)throw new Error('Only apps installed through WinGet can be uninstalled from AppHub');return library.enqueue('uninstall',[{id:a.packageId,source:a.packageSource}]);});
 handle('endProcess',async name=>{if(!endable(name))throw new Error('AppHub does not end this program');const r=await ps("$n=$env:APPHUB_VALUE;$p=@(Get-Process|Where-Object {$_.ProcessName -eq $n});if($p.Count){$p|Stop-Process -Force -ErrorAction SilentlyContinue;Start-Sleep -Milliseconds 700};\"$($p.Count) $(@(Get-Process|Where-Object {$_.ProcessName -eq $n}).Count)\"",{timeout:20000,env:{...process.env,APPHUB_VALUE:name}});const [found,left]=String(r.out).trim().split(/\s+/).map(Number);lookups.forget('processes');system.at=0;if(!found)throw new Error(name+' is not running');if(left>=found)throw new Error('Windows did not allow '+name+' to be ended. It may be running as administrator.');return {ended:found-left,left};});
 handle('setStartup',async(key,enabled)=>{lookups.forget('startup');const item=(await lookups.get('startup'))?.data?.items?.find(i=>startupKey(i)===key);if(!item)throw new Error('That startup entry is unavailable. Refresh startup information and try again.');if(item.scope!=='user')throw new Error('This entry applies to all users. Change it in Windows Settings > Apps > Startup.');
  const r=await ps(`$k='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\${item.kind==='folder'?'StartupFolder':'Run'}';if(!(Test-Path $k)){New-Item $k -Force|Out-Null};Set-ItemProperty -Path $k -Name $env:APPHUB_VALUE -Value ([byte[]](${[...startupFlag(!!enabled)].join(',')})) -Type Binary`,{timeout:15000,env:{...process.env,APPHUB_VALUE:item.rawName??item.name}});lookups.forget('startup');system.at=0;if(r.code!==0)throw new Error('Windows did not accept the change');return {name:item.name,enabled:!!enabled};});
 handle('openSettings',page=>{if(!['startupapps','appsfeatures','windowsupdate'].includes(page))throw new Error('Unknown settings page');return shell.openExternal('ms-settings:'+page);});
 handle('setGpu',async enabled=>{if(models.busy)throw new Error('Wait for the model check to finish');library.prefs.gpu=!!enabled;library.save('preferences.json',library.prefs);invalidateInference();await inference.stopAll();configureEngines();library.notify();return {ok:true};});
 handle('cancelSearch',()=>{searchSequence++;const active=searchAbort;active?.abort();if(active&&ai.pending.size)void inference.retire(ai);reasoner.cancel();return {ok:true};});
 handle('addModel',async role=>{if(!['embedding','reasoning'].includes(role))throw new Error('Unknown model role');if(models.busy)throw new Error('Wait for the model check to finish');const result=await dialog.showOpenDialog(win,{title:role==='reasoning'?'Choose a local GGUF chat model':'Choose a local ONNX embedding model folder',...(role==='reasoning'?{filters:[{name:'GGUF model',extensions:['gguf']}]}:{}),properties:[role==='reasoning'?'openFile':'openDirectory']});if(result.canceled)return null;return models.add(role,result.filePaths[0]);});
 handle('activateModel',async(role,id,limits={})=>{if(models.busy)throw new Error('Wait for the model check to finish');invalidateInference();await inference.stopAll();try{return await models.activate(role,id,limits);}finally{configureEngines();}});
 handle('resetModels',async()=>{if(models.busy)throw new Error('Wait for the model check to finish');invalidateInference();await inference.stopAll();const result=models.reset();configureEngines();return result;});
 handle('removeModel',id=>models.remove(id));
 // Downloads an optional larger model, then runs the usual compatibility check before Chat switches to it. Search keeps its own model.
 const chatModel=async id=>{if(models.busy)throw new Error('Wait for the model check to finish');invalidateInference();await inference.stopAll();try{return await models.activateChat(id);}finally{configureEngines();}};
 handle('downloadModel',async id=>{const profile=await models.fetchModel(id);return models.busy?models.snapshot():chatModel(profile);});handle('chatModel',id=>chatModel(id==null?null:String(id)));
 handle('cancelDownload',()=>{models.cancelDownload();return {ok:true};});handle('removeDownload',id=>models.removeDownload(id));
 handle('removeApp',id=>library.removeCustom(id));handle('removeFolder',async folder=>{library.removeFolder(folder);return library.scan();});handle('cancelJob',id=>library.cancelJob(id));handle('stopJob',id=>library.stopJob(id));
 handle('modify',(id,field,value)=>library.modify(id,field,value));
 handle('launch',async id=>{const a=library.all().find(a=>a.id===id);if(!a?.launch)throw new Error('No launch target found. Open its install folder or add its executable.');const {type,target}=a.launch;
 if(type==='uri'){if(!/^(ms-settings:[a-z-]+|steam:\/\/rungameid\/\d+)$/.test(target))throw new Error('Unsupported launch URI');await shell.openExternal(target);}
 else if(type==='aumid'){const r=await run('explorer.exe',['shell:AppsFolder\\'+target],{timeout:15000});if(r.code!==0&&r.code!==1)throw new Error('Windows could not activate this app');}
 else if(['exe','shortcut'].includes(type)){if(!fs.existsSync(target))throw new Error('Launch target no longer exists. Rescan the library.');const error=await shell.openPath(target);if(error)throw new Error(error);}else throw new Error('Unsupported launch target');
 library.launched(id);return {ok:true};});
 handle('reveal',id=>{const a=library.all().find(a=>a.id===id);const target=a?.executable||a?.launch?.type==='exe'&&a.launch.target||a?.location;if(!target||!fs.existsSync(target))throw new Error('No accessible install path is available');shell.showItemInFolder(target);});
 handle('addApp',async()=>{const r=await dialog.showOpenDialog(win,{title:'Add a portable app',filters:[{name:'Applications',extensions:['exe']}],properties:['openFile']});if(!r.canceled)library.addCustom(r.filePaths[0]);});
 handle('addFolder',async()=>{const r=await dialog.showOpenDialog(win,{title:'Watch a folder for portable applications',properties:['openDirectory']});if(!r.canceled){const folder=r.filePaths[0];if(!library.prefs.folders.includes(folder))library.prefs.folders.push(folder);library.save('preferences.json',library.prefs);await library.scan();}});
 handle('exportLibrary',async()=>{const r=await dialog.showSaveDialog(win,{title:'Save your AppHub library',defaultPath:'AppHub-library.json',filters:[{name:'AppHub library',extensions:['json']}]});if(r.canceled)return null;fs.writeFileSync(r.filePath,JSON.stringify(library.manifest(),null,2));return r.filePath;});
 handle('importLibrary',async()=>{const r=await dialog.showOpenDialog(win,{title:'Recreate an AppHub library',filters:[{name:'AppHub library',extensions:['json']}],properties:['openFile']});if(r.canceled)return null;const stat=fs.statSync(r.filePaths[0]);if(stat.size>10*1024*1024)throw new Error('Manifest is larger than 10 MB');const manifest=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));const packages=library.preview(manifest);importPlan={manifest,packages};const references=(Array.isArray(manifest.library)?manifest.library:[]).filter(a=>a&&typeof a.name==='string'&&!a.packageId).slice(0,4000).map(a=>({name:a.name,source:a.source,version:a.version,location:a.location}));return {packages,references,referenceCount:references.length,createdAt:manifest.createdAt};});
 handle('runPlan',(ids,exactVersions=false)=>{if(!importPlan||!Array.isArray(ids))throw new Error('Import a manifest first');const plan=library.preview(importPlan.manifest);const packages=plan.filter(p=>!p.installed&&(ids.includes(p.key)||ids.includes(p.id)&&plan.filter(x=>x.id===p.id).length===1));if(!packages.length)throw new Error('Select at least one missing package');const job=library.enqueue('install',packages,{exactVersions:!!exactVersions});return job;});
 handle('restorePreferences',()=>{if(!importPlan)throw new Error('Import a manifest first');return library.restorePreferences(importPlan.manifest);});
 handle('upgrade',ids=>{if(!Array.isArray(ids))throw new Error('Select packages to update');const packages=library.all().filter(a=>ids.includes(a.id)&&a.available&&a.packageId).map(a=>({id:a.packageId,source:a.packageSource}));return library.enqueue('upgrade',packages);});
 handle('install',p=>{validatePackage(p);return library.enqueue('install',[{id:p.id,source:p.source}]);});
 handle('catalog',async q=>{if(typeof q!=='string'||q.trim().length<2||q.length>100)throw new Error('Enter at least two characters');const r=await run('winget.exe',['search','--query',q.trim(),'--source','winget','--accept-source-agreements','--disable-interactivity'],{timeout:90000});if(r.code!==0)throw new Error(r.out||r.err||'No packages found');return parseTable(r.out).map(([name,id,version])=>({name,id,version,source:'winget'}));});
 handle('packageInfo',async p=>{validatePackage(p);const r=await run('winget.exe',['show','--id',p.id,'--exact','--source',p.source,'--accept-source-agreements','--disable-interactivity'],{timeout:90000});if(r.code!==0)throw new Error(r.out||r.err);return r.out;});
 handle('setAI',async enabled=>{const prefs={...library.prefs,aiEnabled:!!enabled};library.save('preferences.json',prefs);library.prefs=prefs;try{if(!enabled){invalidateInference();await inference.stopAll();}return ai.state;}finally{library.notify();}});
 handle('openData',()=>shell.openPath(data));handle('windowAction',action=>{if(action==='minimize')win.minimize();else if(action==='maximize')win.isMaximized()?win.unmaximize():win.maximize();else if(action==='close')win.close();});
 win=new BrowserWindow({width:1380,height:900,minWidth:980,minHeight:640,backgroundColor:'#191817',title:'AppHub',icon:path.join(__dirname,'../assets/apphub.ico'),autoHideMenuBar:true,show:false,titleBarStyle:'hidden',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 Menu.setApplicationMenu(null);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
 win.on('close',e=>{if(library.jobs.some(j=>['running','queued'].includes(j.status))){e.preventDefault();dialog.showMessageBox(win,{type:'info',title:'Package operations are still running',message:'Keep AppHub open until the package queue finishes.',detail:'You can minimize the window and follow progress in Activity. Stopping lets the current installer finish and skips the rest.',buttons:['Keep running','Stop after this package'],defaultId:0,cancelId:0}).then(r=>{if(r.response===1)library.stopAll();}).catch(()=>{});}});
 await win.loadFile(path.join(__dirname,'ui/index.html'));win.show();
 globalShortcut.register('CommandOrControl+Alt+Space',()=>{if(windowDelivery.focus())broadcast({focusSearch:true});});
 library.scan().then(()=>{loadIcons();if(!library.state.packageChecked||Date.now()-new Date(library.state.packageChecked)>21600000)return library.checkPackages();}).catch(e=>broadcast({error:e.message}));
}
if(single)app.whenReady().then(start).catch(e=>{reportMain('startup',e);dialog.showErrorBox('AppHub could not start',e.stack||e.message);app.quit();});
function stopWindowDelivery(){shuttingDown=true;clearTimeout(iconTimer);iconTimer=null;}
app.on('window-all-closed',()=>{stopWindowDelivery();app.quit();});app.on('will-quit',()=>{stopWindowDelivery();ai?.stop();stopReasoners();modelProbe?.stop();globalShortcut.unregisterAll();});
