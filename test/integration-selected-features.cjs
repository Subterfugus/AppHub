// Hidden synthetic renderer; no real hardware collection, models or package changes.
const {app,BrowserWindow}=require('electron');
require('./electron-qa-guard.cjs')(app);
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'apphub-selected-features-'));
app.setPath('userData',path.join(scratch,'electron'));
const preload=path.join(scratch,'synthetic-preload.cjs');
fs.writeFileSync(preload,`const {contextBridge}=require('electron');
const profiles=[{id:'fast',name:'Fast search',role:'reasoning',builtin:true},{id:'custom',name:'My custom Chat',role:'reasoning',location:'C:/models/custom.gguf'}];
let state={items:[
 {id:'one',name:'Eligible app',kind:'app',packageId:'Eligible.App',version:'1.0',available:'2.0',launch:{type:'exe',target:'X:/app.exe'},updatePolicy:{excluded:false,skipVersion:null},updateBlocked:false},
 {id:'two',name:'Excluded app',kind:'app',packageId:'Excluded.App',version:'1.0',available:'2.0',updatePolicy:{excluded:true,skipVersion:null},updateBlocked:true,updateBlockReason:'excluded'},
 {id:'three',name:'Skipped app',kind:'app',packageId:'Skipped.App',version:'1.0',available:'2.0',updatePolicy:{excluded:false,skipVersion:'2.0'},updateBlocked:true,updateBlockReason:'skipped-version'},
 {id:'four',name:'New version app',kind:'app',packageId:'New.App',version:'1.0',available:'3.0',updatePolicy:{excluded:false,skipVersion:'2.0'},updateBlocked:false},
 {id:'five',name:'Saved preference app',kind:'app',packageId:'Saved.App',version:'1.0',updatePolicy:{excluded:true,skipVersion:null},updateBlocked:true}
],prefs:{folders:[]},jobs:[],warnings:[],models:{profiles,active:{embedding:'embed',reasoning:'off',chat:'custom'},settings:{threads:4,context:8192}},packageChecked:'2026-10-12T12:00:00Z'};
let change,finishChat,failChat,finishOpen,held=false,modelError=false,hardwareError=false,policyError=false;const chats=[],options=[],launches=[],policyWrites=[],modelWrites=[],upgrades=[],hardwareCalls=[];
const hardware=()=>({schemaVersion:1,capturedAt:new Date().toISOString(),sources:{inventory:{capturedAt:'2026-10-12T12:00:00Z'},sensors:{status:'unavailable'}},capabilities:{},errors:[{source:'sensors',message:'No supported temperature source'}],cpu:{model:'Synthetic eight-core CPU',logicalCores:8,utilizationPercent:25,frequencyMHz:3600,cores:Array.from({length:8},(_,index)=>({index,utilizationPercent:index*10,frequencyMHz:3600}))},memory:{totalBytes:34359738368,usedBytes:8589934592,freeBytes:25769803776,commitUsedBytes:10737418240,commitLimitBytes:68719476736},gpus:[{name:'Synthetic GPU',utilizationPercent:15,dedicatedUsedBytes:1073741824,dedicatedTotalBytes:8589934592,sharedUsedBytes:null,driverVersion:'123.4'}],disks:{physical:[{name:'Synthetic SSD',sizeBytes:1073741824000,health:'Healthy',activityPercent:10,readBytesPerSecond:102400,writeBytesPerSecond:204800}],logical:[{name:'C:',totalBytes:1073741824000,freeBytes:536870912000,readBytesPerSecond:null,writeBytesPerSecond:null}]},network:[{name:'Ethernet <test>',status:'connected',kind:'Ethernet',receiveBytesPerSecond:1024,sendBytesPerSecond:2048,linkSpeedBitsPerSecond:1000000000}],battery:{present:false},processes:[{name:'Memory hog',count:4,cpuPercent:3,memoryBytes:2147483648,endable:false},{name:'CPU hog',count:1,cpuPercent:20,memoryBytes:1073741824,endable:true}],inventory:{manufacturer:'Synthetic Maker',model:'Desktop',biosVersion:'1.2',board:{manufacturer:'Maker',product:'Board'},memoryModules:[{manufacturer:'RAM',capacityBytes:17179869184,speedMHz:3200}]},sensors:[]});
contextBridge.exposeInMainWorld('apphub',{snapshot:async()=>state,onChange:fn=>{change=fn;},windowAction:()=>{},system:async()=>({memoryTotalGb:32,memoryFreeGb:24,cpuLoad:25,disks:[]}),chat:(messages,o)=>{chats.push(messages);options.push(o);return new Promise((resolve,reject)=>{finishChat=resolve;failChat=reject;});},stopChat:async()=>failChat?.(new Error('Stopped')),launch:async id=>{launches.push(id);if(held)await new Promise(resolve=>{finishOpen=resolve;});},chatModel:async id=>{modelWrites.push(id);if(modelError)throw new Error('Synthetic compatibility failure');state.models={...state.models,active:{...state.models.active,chat:id}};return state.models;},addModel:async role=>{state.models={...state.models,profiles:[...state.models.profiles,{id:'added',name:'Added GGUF',role}]};return state.models;},setUpdatePolicy:async(id,p)=>{policyWrites.push({id,...p});if(policyError)throw new Error('Synthetic preference failure');state={...state,items:state.items.map(a=>a.id===id?{...a,updatePolicy:p,updateBlocked:!!(p.excluded||p.skipVersion&&p.skipVersion===a.available),updateBlockReason:p.excluded?'excluded':p.skipVersion===a.available?'skipped-version':null}:a)};return state;},upgrade:async ids=>{upgrades.push(ids);return {id:'job'};},endProcess:async()=>({ended:1}),hardware:async force=>{hardwareCalls.push(force);if(hardwareError)throw new Error('Synthetic hardware failure');return hardware();}});
contextBridge.exposeInMainWorld('audit',{emit:next=>{state={...state,...next};change(next);},finishChat:r=>finishChat?.(r),failChat:m=>failChat?.(new Error(m)),chats:()=>chats,options:()=>options,launches:()=>launches,holdOpen:()=>{held=true;},finishOpen:()=>{held=false;finishOpen?.();},modelWrites:()=>modelWrites,modelError:v=>{modelError=v;},policyWrites:()=>policyWrites,policyError:v=>{policyError=v;},upgrades:()=>upgrades,hardwareCalls:()=>hardwareCalls,hardwareError:v=>{hardwareError=v;}});`);
let win;const checks=[],js=code=>win.webContents.executeJavaScript(code,true),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function capture(name){await js(`document.querySelector('#body').classList.remove('enter');document.querySelector('#toast').classList.add('hidden')`);win.webContents.invalidate();await delay(350);fs.writeFileSync(path.join(scratch,name+'.png'),(await win.webContents.capturePage()).toPNG());}
app.whenReady().then(async()=>{try{
 win=new BrowserWindow({width:1280,height:900,show:false,webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,offscreen:true}});
 win.webContents.on('console-message',e=>{if(e.level==='error')console.error('renderer: '+e.message);});
 await win.loadFile(path.join(root,'src/ui/index.html'));await delay(100);
 await check('independent Chat remains available when search interpretation is off',async()=>{
  assert.equal(await js(`document.querySelector('#ask-input').disabled`),false);
  await js(`audit.emit({chatEngine:{status:'thinking',pid:123,message:'Custom Chat thinking…'}})`);
  assert.match(await js(`document.querySelector('#ai-status span').textContent`),/Custom Chat thinking/);
 });
 await check('Chat lists what it checked and shows each source on request',async()=>{
  await js(`document.querySelector('[data-view="chat"]').click();{const i=document.querySelector('#chat-input');i.value='What is busy?';i.dispatchEvent(new Event('input'));document.querySelector('#chat-form').requestSubmit();}`);await delay(20);
  await js(`audit.finishChat({reply:'CPU is at 25%.',evidence:[{id:'hardware',title:'hardware monitor',available:true,cached:false,collectedAt:new Date().toISOString(),text:'CPU: 25% <script>bad</script>'},{id:'inventory',title:'Device inventory',available:true,cached:true,collectedAt:'2026-10-12T11:55:00Z',text:'32 GB RAM'},{id:'sensors',title:'Temperatures',available:false,collectedAt:'2026-10-12T12:00:00Z',error:'No supported sensor'}],suggestions:[{id:'one'}]})`);await delay(30);
  assert.deepEqual(await js(`[...document.querySelectorAll('.sources .source')].map(e=>e.textContent)`),['Hardware monitor','Device inventory','Temperatures']);
  assert.equal(await js(`document.querySelector('.source-detail')`),null);assert.equal(await js(`document.querySelectorAll('.source.missing').length`),1);
  await js(`document.querySelector('[data-chat-source="1:0"]').click()`);
  assert.equal(await js(`document.querySelector('[data-chat-source="1:0"]').getAttribute('aria-expanded')`),'true');
  assert.match(await js(`document.querySelector('.source-detail small').textContent`),/^Read just now$/);
  assert.equal(await js(`document.querySelector('.source-text').textContent`),'CPU: 25% <script>bad</script>');
  assert.equal(await js(`document.querySelector('.msg.bot script')`),null);
  await capture('chat-sources');
  await js(`document.querySelector('[data-chat-source="1:1"]').click()`);assert.match(await js(`document.querySelector('.source-detail small').textContent`),/^Read at .*reused from an earlier reading/);
  await js(`document.querySelector('[data-chat-source="1:2"]').click()`);assert.equal(await js(`document.querySelector('.source-detail small').textContent`),'Could not be read');assert.equal(await js(`document.querySelector('.source-text').textContent`),'No supported sensor');
  await js(`document.querySelector('[data-chat-source="1:2"]').click()`);assert.equal(await js(`document.querySelector('.source-detail')`),null);
  await js(`document.querySelector('[data-chat-source="1:0"]').click()`);
 });
 await check('Refresh regenerates the latest answer and retains facts on failure',async()=>{
  await js(`document.querySelector('[data-chat-refresh]').click()`);await delay(20);
  assert.deepEqual(await js(`audit.options().at(-1)`),{refreshEvidence:true});
  assert.deepEqual(await js(`audit.chats().at(-1)`),[{role:'user',content:'What is busy?'}]);
  assert.match(await js(`document.querySelector('.msg.bot .bubble').textContent`),/CPU is at 25%/);
  await js(`audit.failChat('Refresh failed')`);await delay(30);
  assert.match(await js(`document.querySelector('.msg.bot .bubble').textContent`),/CPU is at 25%/);
  assert.match(await js(`document.querySelector('#toast').textContent`),/Refresh failed/);
  await js(`document.querySelector('[data-chat-refresh]').click()`);await delay(20);
  await js(`audit.finishChat({reply:'CPU is now 30%.',evidence:[{id:'hardware',title:'hardware monitor',available:true,collectedAt:'2026-10-12T12:01:00Z',text:'CPU: 30%'}],suggestions:[{id:'one'}]})`);await delay(30);
  assert.equal(await js(`document.querySelectorAll('.msg.bot').length`),1);
  assert.match(await js(`document.querySelector('.msg.bot .bubble').textContent`),/CPU is now 30%/);
  assert.deepEqual(await js(`[...document.querySelectorAll('.sources .source')].map(e=>e.textContent)`),['Hardware monitor']);assert.equal(await js(`document.querySelector('.source-detail')`),null);
 });
 await check('Chat Open rejects duplicate pending clicks across snapshots',async()=>{
  await js(`audit.holdOpen();document.querySelector('[data-chat-open]').focus();document.querySelector('[data-chat-open]').click();audit.emit({lastScan:new Date().toISOString()});document.querySelector('[data-chat-open]').click()`);await delay(20);
  assert.deepEqual(await js(`audit.launches()`),['one']);assert.equal(await js(`document.querySelector('[data-chat-open]').getAttribute('aria-busy')`),'true');assert.equal(await js(`document.activeElement.dataset.chatOpen`),'one');
  await js(`audit.finishOpen()`);await delay(20);assert.equal(await js(`document.querySelector('[data-chat-open]').disabled`),false);
 });
 await check('background refresh preserves Chat scroll and input selection',async()=>{
  await js(`{const i=document.querySelector('#chat-input');i.value='Long answer';i.dispatchEvent(new Event('input'));document.querySelector('#chat-form').requestSubmit();}`);await delay(20);
  await js(`audit.finishChat({reply:Array.from({length:100},(_,i)=>'Line '+i).join(String.fromCharCode(10))})`);await delay(30);
  await js(`{const i=document.querySelector('#chat-input');i.value='Unfinished';i.dispatchEvent(new Event('input'));i.focus();i.setSelectionRange(2,5);document.querySelector('#chat-log').scrollTop=27;audit.emit({lastScan:new Date().toISOString()});}`);
  assert.equal(await js(`document.querySelector('#chat-log').scrollTop`),27);
  assert.deepEqual(await js(`({value:document.activeElement.value,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd})`),{value:'Unfinished',start:2,end:5});
 });
 await check('all reasoning profiles can be assigned independently to Chat',async()=>{
  await js(`document.querySelector('#preferences').click()`);await delay(20);
  assert.deepEqual(await js(`[...document.querySelector('#model-chat').options].map(o=>o.value)`),['','fast','custom']);
  await js(`{const s=document.querySelector('#model-chat');s.value='fast';s.dispatchEvent(new Event('change'));document.querySelector('#chat-model-use').click();}`);await delay(30);
  assert.equal(await js(`audit.modelWrites().at(-1)`),'fast');
  assert.equal(await js(`document.querySelector('#model-reasoning').value`),'off');
  await js(`document.querySelector('#chat-model-add').click()`);await delay(30);
  assert.equal(await js(`document.querySelector('#model-chat').value`),'added');
  assert.equal(await js(`audit.modelWrites().length`),1);
  await js(`document.querySelector('#chat-model-use').click()`);await delay(30);assert.equal(await js(`audit.modelWrites().at(-1)`),'added');
  await js(`audit.modelError(true);{const s=document.querySelector('#model-chat');s.value='custom';s.dispatchEvent(new Event('change'));document.querySelector('#chat-model-use').click();}`);await delay(30);
  assert.match(await js(`document.querySelector('.models-panel [role=status]').textContent`),/compatibility failure/);
  await js(`audit.modelError(false);{const s=document.querySelector('#model-chat');s.value='';s.dispatchEvent(new Event('change'));document.querySelector('#chat-model-use').click();}`);await delay(30);
  assert.equal(await js(`audit.modelWrites().at(-1)`),null);
 });
 await check('theme and accent radios have roving focus and arrow keys',async()=>{
  assert.equal(await js(`document.querySelectorAll('.swatches [tabindex="0"]').length`),1);
  await js(`{const s=document.querySelector('.swatches [aria-checked=true]');s.focus();s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));}`);
  assert.equal(await js(`document.activeElement.dataset.themeChoice`),'graphite');
  assert.equal(await js(`document.activeElement.getAttribute('aria-checked')`),'true');
  await js(`{const s=document.querySelector('.accents [aria-checked=true]');s.focus();s.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));}`);
  assert.equal(await js(`document.activeElement.dataset.accentChoice`),'lime');
  await js(`document.querySelector('[data-accent-choice="peach"]').click()`);
 });
 await check('held updates leave the list and bulk updates while newer unskipped versions stay',async()=>{
  await js(`document.querySelector('[data-view="updates"]').click()`);
  assert.match(await js(`document.querySelector('#update-all').textContent`),/^Update all…$/);
  assert.deepEqual(await js(`[...document.querySelectorAll('#update-list [data-update]')].map(e=>e.dataset.update)`),['one','four']);
  assert.match(await js(`document.querySelector('.section-controls .meta').textContent`),/^2 updates · 3 held back · Checked/);
  assert.equal(await js(`document.querySelector('.nav-item[data-view="updates"] .badge, .nav-item[data-view="updates"] .count')?.textContent.trim()`),'2');
  assert.deepEqual(await js(`[...document.querySelectorAll('#held-updates .plan-entry')].map(e=>e.textContent)`),['Excluded appNever updated · 1.0 → 2.0 is available','Skipped appSkipping 2.0 · 1.0 → 2.0 is available','Saved preference appNever updated']);
  assert.equal(await js(`document.querySelector('#held-updates').open`),false);
  await js(`document.querySelector('#update-all').click()`);
  assert.deepEqual(await js(`[...document.querySelectorAll('[data-update-select]')].map(e=>e.dataset.updateSelect)`),['one','four']);
  assert.deepEqual(await js(`audit.upgrades()`),[]);
  await js(`document.querySelector('#cancel-modal').click();document.querySelector('#held-updates').open=true`);await capture('update-holds');
 });
 await check('the update menu skips and holds, Allow again releases, and failures keep the hold',async()=>{
  await js(`document.querySelector('[data-update-allow="two"]').click()`);await delay(30);
  assert.deepEqual(await js(`audit.policyWrites().at(-1)`),{id:'two',excluded:false,skipVersion:null});
  assert.equal(await js(`!!document.querySelector('#update-list [data-update="two"]')`),true);assert.equal(await js(`document.querySelector('#held-updates').open`),true);
  await js(`document.querySelector('[data-update-menu="one"]').click()`);
  assert.deepEqual(await js(`[...document.querySelectorAll('.menu [role=menuitem]')].map(e=>e.firstChild.textContent)`),['Skip version 2.0','Never update this app']);
  assert.equal(await js(`document.activeElement.closest('.menu')!==null&&document.querySelector('[data-update-menu="one"]').getAttribute('aria-expanded')`),'true');
  await js(`document.querySelector('.menu [role=menuitem]').click()`);await delay(30);
  assert.deepEqual(await js(`audit.policyWrites().at(-1)`),{id:'one',excluded:false,skipVersion:'2.0'});
  assert.equal(await js(`document.querySelector('.menu')`),null);assert.equal(await js(`document.querySelector('#update-list [data-update="one"]')`),null);
  await js(`document.querySelector('[data-update-allow="one"]').click()`);await delay(30);
  assert.equal(await js(`!!document.querySelector('#update-list [data-update="one"]')`),true);
  await js(`document.querySelector('[data-update-menu="four"]').click();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert.equal(await js(`document.querySelector('.menu')`),null);assert.equal(await js(`document.activeElement.dataset.updateMenu`),'four');
  await js(`audit.policyError(true);document.querySelector('[data-update-allow="three"]').click()`);await delay(30);
  assert.equal(await js(`document.querySelector('#update-list [data-update="three"]')`),null);
  assert.match(await js(`document.querySelector('#toast').textContent`),/preference failure/);
  await js(`audit.policyError(false);document.querySelector('[data-view="all"]').click();document.querySelector('.app-card[data-id="one"] [data-info]').click()`);
  await js(`document.querySelector('#detail-hold').click()`);
  assert.deepEqual(await js(`[...document.querySelectorAll('.menu [role=menuitem]')].map(e=>e.firstChild.textContent)`),['Skip version 2.0','Never update this app']);
  await js(`document.querySelectorAll('.menu [role=menuitem]')[1].click()`);await delay(30);
  assert.deepEqual(await js(`audit.policyWrites().at(-1)`),{id:'one',excluded:true,skipVersion:null});
  assert.match(await js(`document.querySelector('#details .notice').textContent`),/Never updated/);assert.equal(await js(`document.querySelector('#detail-hold')`),null);
  await js(`document.querySelector('#detail-allow').click()`);await delay(30);assert.equal(await js(`!!document.querySelector('#detail-hold')`),true);
 });
 await check('Hardware shows a tile per reading, one detailed panel, grouped programs and no empty sections',async()=>{
  await js(`audit.emit({models:{profiles:[{id:'custom',role:'reasoning',name:'Custom Chat'}],active:{reasoning:'off',chat:'custom'}}});document.querySelector('[data-view="hardware"]').click()`);await delay(80);
  assert.deepEqual(await js(`[...document.querySelectorAll('.hw-tile')].map(e=>e.dataset.hwTab)`),['cpu','memory','gpu','disk','network']);
  assert.equal(await js(`document.querySelector('.hw-tile.active').dataset.hwTab`),'cpu');
  assert.deepEqual(await js(`[...document.querySelectorAll('.hw-tile strong')].map(e=>e.textContent)`),['25%','25%','15%','10%','1 KB/s']);
  assert.equal(await js(`document.querySelectorAll('.hw-core').length`),8);assert.equal(await js(`document.querySelectorAll('.hw-tile svg').length`),5);assert.equal(await js(`document.querySelectorAll('#hw-detail .hw-plot svg').length`),1);
  assert.match(await js(`document.querySelector('.hw').textContent`),/does not report temperatures or fan speeds/);
  assert.doesNotMatch(await js(`document.querySelector('.hw').textContent`),/Unavailable|Battery/);
  assert.equal(await js(`document.querySelector('#hardware-refresh')`),null);
  await js(`document.querySelector('[data-hw-tab="network"]').click()`);
  assert.match(await js(`document.querySelector('#hw-detail').textContent`),/Ethernet <test>.*Download.*1 KB\/s.*Upload.*2 KB\/s.*Link speed.*1,000 Mbps/);assert.equal(await js(`document.querySelector('.hw script')`),null);
  await js(`{const tab=document.querySelector('[data-hw-tab="network"]');tab.focus();tab.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));}`);
  assert.equal(await js(`document.querySelector('.hw-tile.active').dataset.hwTab`),'cpu');assert.equal(await js(`document.activeElement.dataset.hwTab`),'cpu');
  assert.deepEqual(await js(`[...document.querySelectorAll('#hw-programs tr')].map(r=>r.cells[0].textContent)`),['Memory hog4','CPU hog']);
  await js(`document.querySelector('[data-hw-sort="cpuPercent"]').click()`);
  assert.deepEqual(await js(`[...document.querySelectorAll('#hw-programs tr')].map(r=>r.cells[0].textContent)`),['CPU hog','Memory hog4']);
  assert.equal(await js(`document.querySelector('[data-hw-sort="cpuPercent"]').closest('th').getAttribute('aria-sort')`),'descending');
  assert.deepEqual(await js(`[...document.querySelectorAll('[data-hw-end]')].map(e=>e.dataset.hwEnd)`),['CPU hog']);
  await js(`document.querySelector('[data-hw-end]').click()`);assert.match(await js(`document.querySelector('#modal h2').textContent`),/End CPU hog\?/);await js(`document.querySelector('#cancel-modal').click()`);
  await capture('hardware');
 });
 await check('Hardware keeps the last reading when one fails',async()=>{
  await js(`audit.hardwareError(true)`);await delay(1300);
  assert.match(await js(`document.querySelector('#hw-status').textContent`),/Last reading failed/);
  assert.equal(await js(`document.querySelectorAll('.hw-core').length`),8);
  await js(`audit.hardwareError(false)`);await delay(1300);assert.equal(await js(`document.querySelector('#hw-status').textContent`),'');
 });
 await check('Hardware polls only while visible and pauses on navigation',async()=>{
  const before=await js(`audit.hardwareCalls().length`);await delay(2300);
  assert.ok(await js(`audit.hardwareCalls().length`)>before+1);assert.equal(await js(`audit.hardwareCalls().at(-1)`),undefined);
  assert.ok(await js(`document.querySelector('.hw-tile svg path.hw-line').getAttribute('d').split('L').length`)>3);
  await js(`Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));`);await delay(50);
  const hidden=await js(`audit.hardwareCalls().length`);await delay(2300);
  assert.equal(await js(`audit.hardwareCalls().length`),hidden);
  await js(`Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));`);await delay(30);
  assert.ok(await js(`audit.hardwareCalls().length`)>hidden);
  await js(`document.querySelector('[data-view="all"]').click()`);await delay(50);
  const left=await js(`audit.hardwareCalls().length`);await delay(2300);
  assert.equal(await js(`audit.hardwareCalls().length`),left);
 });
 await check('Hardware Ask AI navigates to Chat with the displayed source timestamp',async()=>{
  await js(`document.querySelector('[data-view="hardware"]').click()`);await delay(80);await js(`document.querySelector('#hardware-ask').click()`);await delay(30);
  assert.equal(await js(`document.querySelector('.nav-item.active').dataset.view`),'chat');
  assert.equal(await js(`audit.options().at(-1).hardware`),true);
  assert.match(await js(`audit.options().at(-1).hardwareCapturedAt`),/^20\d\d-/);
  assert.equal(await js(`Object.keys(audit.options().at(-1)).length`),2);
  await js(`audit.finishChat({reply:'Your current reading has been checked.'})`);await delay(20);
 });
 console.log(JSON.stringify({passed:true,checks,artifacts:scratch,scope:'Hidden synthetic renderer; no desktop interaction or real hardware/package/model changes.'}));app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
