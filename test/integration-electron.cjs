// Automated software integration only: no desktop or browser computer-use APIs.
const electron=require('electron');const {app,BrowserWindow,dialog,globalShortcut}=electron;
require('./electron-qa-guard.cjs')(app,error=>finish(error));
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');const output=process.env.APPHUB_QA_OUTPUT||path.resolve(root,'qa-output');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-integration-'));
const report={startedAt:new Date().toISOString(),dataDirectory:data,checks:[],rendererErrors:[],consoleWarnings:[],limitations:['No package installation, upgrades, or uninstallations performed.','Native file dialogs use QA file selections; system dialog appearance is not tested.','The application window stays hidden; desktop interactions are not used.']};
fs.mkdirSync(output,{recursive:true});
app.setPath('userData',path.join(data,'electron'));process.env.APPHUB_TEST_DATA=data;
BrowserWindow.prototype.show=function(){};BrowserWindow.prototype.focus=function(){};globalShortcut.register=()=>true;
const manifestPath=path.join(data,'exported-library.json');let fileToOpen;
dialog.showSaveDialog=async()=>({canceled:false,filePath:manifestPath});
dialog.showOpenDialog=async()=>({canceled:!fileToOpen,filePaths:fileToOpen?[fileToOpen]:[]});
dialog.showErrorBox=(title,message)=>{report.rendererErrors.push({title,message});finish(new Error(title+': '+message));};
const marker=path.join(data,'launch-marker.txt');const probe=path.join(data,'AppHub QA Probe.exe');
const csharp=`using System; using System.IO; public static class Probe { [STAThread] public static void Main() { File.WriteAllText(@"${marker.replace(/"/g,'""')}","AppHub launch succeeded"); } }`;
const ps=`$ProgressPreference='SilentlyContinue'; Add-Type -TypeDefinition '${csharp.replace(/'/g,"''")}' -OutputAssembly '${probe.replace(/'/g,"''")}' -OutputType WindowsApplication`;
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(ps,'utf16le').toString('base64')],{windowsHide:true,timeout:30000});
fs.writeFileSync(path.join(data,'preferences.json'),JSON.stringify({favorites:[],hidden:[],tags:{},recent:[],custom:[],folders:[],aiEnabled:false}));
let win,done=false;
app.on('browser-window-created',(_e,w)=>{if(!win)win=w;w.webContents.setBackgroundThrottling(false);w.webContents.on('console-message',event=>{if(event.level==='error')report.rendererErrors.push({type:'console',message:event.message});else if(event.level==='warning')report.consoleWarnings.push(event.message);});w.webContents.on('render-process-gone',(_e,details)=>report.rendererErrors.push({type:'render-process-gone',details}));w.webContents.on('did-fail-load',(_e,code,message)=>report.rendererErrors.push({type:'load',code,message}));});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(fn,timeout=30000){const start=Date.now();let last;while(Date.now()-start<timeout){try{last=await fn();if(last)return last;}catch{}await delay(200);}throw new Error('Timed out waiting for condition; last value '+JSON.stringify(last));}
const js=code=>win.webContents.executeJavaScript(code,true);
const api=(name,...args)=>js(`window.apphub[${JSON.stringify(name)}](...${JSON.stringify(args)})`);
async function check(name,fn){const started=Date.now();try{const detail=await fn();report.checks.push({name,passed:true,durationMs:Date.now()-started,...(detail===undefined?{}:{detail})});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});throw e;}}
function finish(error){if(done)return;done=true;if(error)report.error=error.stack||String(error);report.finishedAt=new Date().toISOString();report.passed=!error&&!report.rendererErrors.length;fs.writeFileSync(path.join(output,'integration-report.json'),JSON.stringify(report,null,2));console.log('QA report: '+path.join(output,'integration-report.json'));app.exit(report.passed?0:1);}
// Offscreen Chromium rendering supplies current paint frames while every native
// window remains hidden. Main/preload/renderer and their real IPC stay intact.
const Module=require('node:module');const originalLoad=Module._load;
class QABrowserWindow extends BrowserWindow{constructor(options){super({...options,webPreferences:{...options.webPreferences,offscreen:true}});this.webContents.setFrameRate(30);this.webContents.startPainting();}}
Module._load=function(request,...args){if(request==='electron')return {...electron,BrowserWindow:QABrowserWindow};return originalLoad.call(this,request,...args);};
require(path.join(root,'src/main.cjs'));Module._load=originalLoad;
app.whenReady().then(async()=>{
 await waitFor(()=>win&&!win.webContents.isLoading()&&js(`Boolean(window.apphub&&document.querySelector('#navigation [data-view]'))`));
 await js(`window.addEventListener('error',e=>console.error('QA window error: '+e.message));window.addEventListener('unhandledrejection',e=>console.error('QA rejection: '+e.reason));`);
 await check('Electron security and live renderer',async()=>{const prefs=win.webContents.getLastWebPreferences();assert.equal(prefs.contextIsolation,true);assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.sandbox,true);assert.equal(await js('typeof require'),'undefined');assert.match(await js(`document.querySelector('h1').textContent`),/library/i);return {electron:process.versions.electron,title:await js('document.title')};});
 await check('Privileged IPC rejects another renderer',async()=>{const untrusted=new BrowserWindow({show:false,webPreferences:{preload:path.join(root,'src/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});try{await untrusted.loadURL('data:text/html,'+encodeURIComponent(`<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'"></head><body>QA IPC boundary</body></html>`));assert(await untrusted.webContents.executeJavaScript(`window.apphub.snapshot().then(()=>false,e=>String(e).includes('Untrusted caller'))`));}finally{untrusted.destroy();}});
 await check('Real Windows inventory and WinGet package list',async()=>{await waitFor(async()=>{const s=await api('snapshot');return !s.scanning&&s.lastScan;},180000);const s=await api('packages');assert(s.items.some(a=>a.kind==='app'));assert(s.items.some(a=>a.kind==='setting'));assert(s.items.some(a=>a.packageId));report.inventory={apps:s.items.filter(a=>a.kind==='app').length,settings:s.items.filter(a=>a.kind==='setting').length,launchable:s.items.filter(a=>a.kind==='app'&&a.launch).length,packages:s.items.filter(a=>a.packageId).length};return report.inventory;});
 await check('Add and launch harmless private QA executable',async()=>{fileToOpen=probe;await api('addApp');const s=await api('snapshot');const a=s.items.find(a=>a.launch?.target===probe);assert(a);report.probeId=a.id;await api('launch',a.id);await waitFor(()=>fs.existsSync(marker));assert.equal(fs.readFileSync(marker,'utf8'),'AppHub launch succeeded');assert((await api('snapshot')).items.find(x=>x.id===a.id).lastLaunch);return {target:probe,markerWritten:true};});
 await check('Favorite, tags, hide, and persisted preferences',async()=>{const id=report.probeId;await api('modify',id,'favorite',true);await api('modify',id,'tags',['qa harmless probe','integration']);await api('modify',id,'hidden',true);let a=(await api('snapshot')).items.find(x=>x.id===id);assert(a.favorite&&a.hidden);assert.deepEqual(a.tags,['qa harmless probe','integration']);assert(!(await api('search','AppHub QA Probe',false)).items.some(x=>x.id===id));await api('modify',id,'hidden',false);const prefs=JSON.parse(fs.readFileSync(path.join(data,'preferences.json'),'utf8'));assert(prefs.favorites.includes(id));assert.deepEqual(prefs.tags[id],a.tags);});
 await check('Real IPC search and renderer keyboard search',async()=>{const r=await api('search','bluetooth',false);assert(r.items.some(a=>/bluetooth/i.test(a.name)));await js(`document.querySelector('#search').value='bluetooth';document.querySelector('#search').dispatchEvent(new Event('input'));`);await waitFor(()=>js(`document.querySelector('#app-list')?.textContent.toLowerCase().includes('bluetooth')&&!document.querySelector('.loading-line')`));assert.match(await js(`document.querySelector('h1').textContent`),/Search your PC/);await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);assert.equal(await js(`document.querySelector('#search').value`),'');});
 await check('Renderer navigation, app details, and layouts',async()=>{for(const view of ['favorites','recent','settings','updates','discover','reproduce','activity','all']){await js(`document.querySelector('[data-view="${view}"]').click()`);assert(await js(`Boolean(document.querySelector('h1').textContent&&document.querySelector('#body').textContent)`));}await js(`document.querySelector('#list-view').click()`);assert(await js(`Boolean(document.querySelector('#app-list.list'))`));await js(`document.querySelector('#grid-view').click();document.querySelector('#app-list .app-card').click();`);assert.equal(await js(`document.querySelector('#details').classList.contains('hidden')`),false);await js(`document.querySelector('#close-detail').click();document.querySelector('#preferences').click();`);assert.match(await js(`document.querySelector('#body').textContent`),/Meaning, without the cloud/);});
 await check('Export and import real manifest without installing',async()=>{await api('exportLibrary');const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));assert.equal(m.format,'apphub-library');assert(m.packages.length>0);assert(m.library.some(a=>a.name==='AppHub QA Probe'&&a.favorite));fileToOpen=manifestPath;const p=await api('importLibrary');assert(p.packages.length>0);assert(p.packages.every(x=>x.installed));const restored=await api('restorePreferences');assert(restored>0);assert.equal((await api('snapshot')).jobs.length,0);return {packages:p.packages.length,references:p.referenceCount,restored};});
 await check('Read-only live WinGet discovery and metadata',async()=>{const packages=await api('catalog','PowerToys');assert(packages.some(p=>p.id==='Microsoft.PowerToys'));const info=await api('packageInfo',{id:'Microsoft.PowerToys',source:'winget'});assert.match(info,/PowerToys/);assert(info.length>100);return {results:packages.length,metadataCharacters:info.length};});
 await check('Input validation rejects invalid operations',async()=>{for(const [name,args]of [['search',['x'.repeat(301)]],['catalog',['x']],['install',[{id:'bad;id',source:'winget'}]],['modify',[report.probeId,'invalid',true]],['upgrade',[[]]],['runPlan',[[]]]]){let rejected=false;try{await api(name,...args);}catch{rejected=true;}assert(rejected,name+' should reject');}assert.equal((await api('snapshot')).jobs.length,0);});
 await api('setAI',true);await js(`document.querySelector('[data-view="all"]').click()`);await delay(300);report.screenshotTitle=await js(`document.querySelector('h1').textContent`);assert.equal(report.screenshotTitle,'Your library');fs.writeFileSync(path.join(output,'AppHub-library.png'),(await win.webContents.capturePage()).toPNG());
 await js(`document.querySelector('#app-list .app-card').click()`);await delay(250);assert.equal(await js(`document.querySelector('#details').classList.contains('hidden')`),false);fs.writeFileSync(path.join(output,'AppHub-details.png'),(await win.webContents.capturePage()).toPNG());
 await check('Real renderer semantic search with bundled local model',async()=>{await js(`document.querySelector('#close-detail').click();document.querySelector('#search').value='edit pictures';document.querySelector('#search').dispatchEvent(new Event('input'));`);await waitFor(()=>js(`!document.querySelector('.loading-line')&&Boolean(document.querySelector('#app-list .app-card'))`),180000);const s=await api('snapshot');assert.equal(s.ai.status,'ready');assert(s.ai.pid);assert.equal(await js(`Boolean(document.querySelector('.notice.warn'))`),false);report.semanticUI={workerPid:s.ai.pid,names:await js(`Array.from(document.querySelectorAll('#app-list h3')).slice(0,8).map(e=>e.textContent)`)};await delay(300);fs.writeFileSync(path.join(output,'AppHub-search.png'),(await win.webContents.capturePage()).toPNG());return report.semanticUI;});
 await check('Two-model search renders a grounded explanation and clears stale answers',async()=>{
  await js(`document.querySelector('#search').value='Make my screen warmer at night';document.querySelector('#search').dispatchEvent(new Event('input'));`);
  await waitFor(()=>js(`!document.querySelector('.loading-line')&&Boolean(document.querySelector('.local-answer'))`),120000);
  const text=await js(`document.querySelector('.local-answer').textContent`);assert.match(text,/Night light/i);assert.equal(await js(`Boolean(document.querySelector('.notice.warn'))`),false);
  const s=await api('snapshot');assert(s.reasoner.pid);assert(s.reasoner.serverPid);report.reasoningUI={answer:text,pid:s.reasoner.pid,serverPid:s.reasoner.serverPid};
  fs.writeFileSync(path.join(output,'AppHub-local-answer.png'),(await win.webContents.capturePage()).toPNG());
  await js(`document.querySelector('#search').value='Calculator';document.querySelector('#search').dispatchEvent(new Event('input'));`);assert.equal(await js(`Boolean(document.querySelector('.local-answer'))`),false);await waitFor(()=>js(`!document.querySelector('.loading-line')&&Boolean(document.querySelector('#app-list .app-card'))`));
  assert.equal(await js(`Boolean(document.querySelector('.local-answer'))`),false);return report.reasoningUI;
 });
 await check('Minimum window size keeps application details accessible',async()=>{win.setSize(980,640);await js(`document.querySelector('#app-list .app-card').click()`);await delay(350);const bounds=await js(`(()=>{const d=document.querySelector('#details').getBoundingClientRect(),b=document.querySelector('#launch').getBoundingClientRect();return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,details:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},launch:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}}})()`);assert(bounds.documentWidth<=bounds.width);assert(bounds.details.right<=bounds.width+1);assert(bounds.launch.right<=bounds.width&&bounds.launch.left>=0);assert(bounds.launch.bottom<=bounds.height);fs.writeFileSync(path.join(output,'AppHub-minimum-details.png'),(await win.webContents.capturePage()).toPNG());return {window:win.getBounds(),viewport:bounds};});
 await check('Native picker registration and hidden local-model preferences',async()=>{
  win.setSize(1380,900);await js(`document.querySelector('#preferences').click()`);
  const embedding=path.resolve(root,'.qa/extra-models/paraphrase-MiniLM-L3-v2'),gguf=path.resolve(root,'.qa/extra-models/qwen2.5-1.5b-instruct-q4_k_m.gguf');
  fileToOpen=embedding;let models=await api('addModel','embedding');const ep=models.profiles.find(p=>p.role==='embedding'&&!p.builtin&&p.location===fs.realpathSync(embedding));assert(ep);
  fileToOpen=gguf;models=await api('addModel','reasoning');const rp=models.profiles.find(p=>p.role==='reasoning'&&!p.builtin&&p.location===fs.realpathSync(gguf));assert(rp);assert.equal(models.active.embedding,'embedding:minilm');
  await js(`document.querySelector('#model-embedding').value=${JSON.stringify(ep.id)};document.querySelector('#model-embedding').dispatchEvent(new Event('change'));document.querySelector('#model-reasoning').value=${JSON.stringify(rp.id)};document.querySelector('#model-reasoning').dispatchEvent(new Event('change'));`);
  assert.match(await js(`document.querySelector('#local-models').textContent`),/Your local models/);assert.equal(await js(`document.querySelector('#model-embedding').value`),ep.id);
  await js(`document.querySelector('[data-model-use="embedding"]').click()`);await waitFor(async()=>{const s=await api('snapshot');return !s.models.busy&&s.models.active.embedding===ep.id;},180000);
  assert.equal(await js(`document.querySelector('#model-reasoning').value`),rp.id,'Pending reasoning selection survives model status events');
  const active=await api('snapshot');assert.equal(active.models.profiles.find(p=>p.id===ep.id).lastTest.ok,true);assert.equal(active.ai.model,ep.name);
  await js(`document.querySelector('#local-models').scrollIntoView({block:'start'});`);await delay(300);fs.writeFileSync(path.join(output,'AppHub-models.png'),(await win.webContents.capturePage()).toPNG());
  fileToOpen=undefined;assert.equal(await api('addModel','reasoning'),null);return {embedding:ep.name,reasoningRegistered:rp.name,activeEmbedding:active.models.active.embedding};
 });
 await check('Alternative chat model activates through real IPC and renderer',async()=>{
  const before=(await api('snapshot')).models,profile=before.profiles.find(p=>p.role==='reasoning'&&!p.builtin&&p.name.includes('1.5b'));assert(profile);
  await js(`document.querySelector('#model-reasoning').value=${JSON.stringify(profile.id)};document.querySelector('#model-reasoning').dispatchEvent(new Event('change'));document.querySelector('[data-model-use="reasoning"]').click();`);
  await waitFor(async()=>{const m=(await api('snapshot')).models;return !m.busy&&m.profiles.find(p=>p.id===profile.id)?.lastTest;},120000);
  const s=await api('snapshot');assert.equal(s.models.active.reasoning,profile.id,JSON.stringify(s.models.profiles.find(p=>p.id===profile.id).lastTest));assert.equal(s.models.profiles.find(p=>p.id===profile.id).lastTest.ok,true);assert.equal(s.reasoner.model,profile.name);return {model:profile.name,check:s.models.profiles.find(p=>p.id===profile.id).lastTest};
 });
 await check('Invalid local files and failed compatibility preserve active configuration',async()=>{
  const before=(await api('snapshot')).models.active;const fake=path.join(data,'invalid.gguf');fs.writeFileSync(fake,Buffer.alloc(1048576));fileToOpen=fake;await assert.rejects(api('addModel','reasoning'),/supported GGUF/);
  const broken=path.join(data,'broken-embedding');fs.mkdirSync(path.join(broken,'onnx'),{recursive:true});fs.writeFileSync(path.join(broken,'config.json'),JSON.stringify({model_type:'bert'}));fs.writeFileSync(path.join(broken,'tokenizer.json'),'{}');fs.writeFileSync(path.join(broken,'onnx/model_quantized.onnx'),Buffer.alloc(2048,1));fileToOpen=broken;const added=await api('addModel','embedding'),profile=added.profiles.find(p=>p.location===fs.realpathSync(broken));assert(profile);await assert.rejects(api('activateModel','embedding',profile.id),/previous model/);assert.deepEqual((await api('snapshot')).models.active,before);await api('removeModel',profile.id);assert(fs.existsSync(broken));
 });
 await check('Changed active custom files fall back before real inference',async()=>{
  const previous=(await api('snapshot')).models.active.embedding;
  const copied=path.join(data,'mutable-embedding');fs.cpSync(path.join(root,'.qa/extra-models/paraphrase-MiniLM-L3-v2'),copied,{recursive:true});
  // Change identity before registration so this independent copy gets its own profile.
  fs.appendFileSync(path.join(copied,'config.json'),'\n');fileToOpen=copied;
  const added=await api('addModel','embedding'),profile=added.profiles.find(p=>p.location===fs.realpathSync(copied));assert(profile);
  await api('activateModel','embedding',profile.id);assert.equal((await api('snapshot')).models.active.embedding,profile.id);
  fs.appendFileSync(path.join(copied,'tokenizer_config.json'),'\n');
  const result=await api('search','blue light',true),after=await api('snapshot');
  assert.equal(after.models.active.embedding,'embedding:minilm');assert.match(result.warning,/custom model.*changed/);
  assert.equal(result.items[0].name,'Night light');assert.equal(after.ai.model,'MiniLM L6 · bundled');assert(after.ai.pid);
  await api('activateModel','embedding',previous);await api('removeModel',profile.id);fileToOpen=undefined;
  return {fallback:'embedding:minilm',semanticSearchSucceeded:true};
 });
 await check('Renderer can disable interpretation and restore bundled defaults',async()=>{
  await js(`document.querySelector('#model-reasoning').value='off';document.querySelector('#model-reasoning').dispatchEvent(new Event('change'));document.querySelector('[data-model-use="reasoning"]').click();`);await waitFor(async()=>{const s=await api('snapshot');return !s.models.busy&&s.models.active.reasoning==='off';});const off=await api('snapshot');assert.equal(off.reasoner.pid,null);assert.notEqual(off.models.active.embedding,'embedding:minilm');
  await js(`document.querySelector('#models-reset').click()`);await waitFor(async()=>{const s=await api('snapshot');return s.models.active.embedding==='embedding:minilm'&&s.models.active.reasoning==='reasoning:qwen3';});assert.equal((await api('snapshot')).models.settings.context,4096);
 });
 await check('Custom registration and watch-folder removal preserve application files',async()=>{
  await api('removeApp',report.probeId);assert(!(await api('snapshot')).prefs.custom.some(a=>a.id===report.probeId));assert(fs.existsSync(probe));
  const folder=path.join(data,'watched-folder');fs.mkdirSync(folder);fileToOpen=folder;await api('addFolder');assert((await api('snapshot')).prefs.folders.includes(folder));await api('removeFolder',folder);assert(!(await api('snapshot')).prefs.folders.includes(folder));assert(fs.existsSync(folder));assert.equal((await api('snapshot')).jobs.length,0);
 });
 await api('setAI',false);
 await check('Renderer is error-free',()=>assert.deepEqual(report.rendererErrors,[]));finish();
}).catch(finish);
setTimeout(()=>finish(new Error('Integration watchdog timed out')),600000).unref();
