const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Lookups,TOPICS,picked,endable,storage,robocopyBytes,startupFlag,startupKey}=require('../src/lookups.cjs');
const {buildChat,resolveSuggestions,planChat,mergePlan,needsPlan}=require('../src/chat.cjs');const {shape}=require('../src/system.cjs');
const system=shape({os:'Windows 11',cpu:'Test CPU',byMemory:[{name:'browser',count:3,memory:2*1073741824}],startup:['Alpha']});
const items=[{id:'a',name:'Paint',kind:'app',source:'Installed',packageId:'Vendor.Paint',packageSource:'winget',version:'1.0',launch:{type:'exe'}},{id:'b',name:'Notes',kind:'app',source:'Portable',version:'2.0',available:'2.1',launch:{type:'exe'}},{id:'c',name:'Sketch',kind:'app',source:'WinGet',packageId:'Vendor.Sketch',packageSource:'winget',version:'3.0',available:'3.1'},{id:'d',name:'Night light',kind:'setting',launch:{type:'uri'}}];
const processes={id:'processes',title:'running programs',text:'…',data:{total:3,byMemory:[{name:'browser',count:3,memoryGb:2,cpu:1},{name:'svchost',count:90,memoryGb:1.5,cpu:0},{name:'renderer',count:1,memoryGb:.5,cpu:0}],byCpu:[{name:'renderer',count:1,memoryGb:.5,cpu:9}],hung:['frozen']}};
const startup={id:'startup',title:'startup programs',text:'…',data:{items:[{name:'Alpha',scope:'user',kind:'run',enabled:true},{name:'Beta',scope:'machine',kind:'run',enabled:true},{name:'Gamma',scope:'user',kind:'folder',enabled:false}]}};
const catalog={id:'catalog',title:'the WinGet catalog',text:'…',data:{term:'editor',packages:[{name:'Open Editor',id:'Open.Editor',version:'4.0',source:'winget'}]}};

test('robocopy totals are read by position, whatever the display language',()=>{
 const english='\n    Dirs :        12         0        12         0         0         0\n   Files :       340         0       340         0         0         0\n   Bytes : 987654321         0 987654321         0         0         0\n   Times :   0:00:00   0:00:00                       0:00:00   0:00:00\n';
 assert.equal(robocopyBytes(english),987654321);assert.equal(robocopyBytes(english.replace('Dirs','Verzeichnisse').replace('Files','Dateien').replace('Bytes','Bytes')),987654321);assert.equal(robocopyBytes('Access denied'),null);
});
test('folder sizes cover the profile, app data and program folders without naming files',async t=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-storage-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 const programs=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-programs-'));t.after(()=>fs.rmSync(programs,{recursive:true,force:true}));
 for(const dir of ['Documents','Downloads','AppData/Local/Cache','AppData/Local/Small','AppData/Roaming/Tool'])fs.mkdirSync(path.join(home,dir),{recursive:true});fs.writeFileSync(path.join(home,'Documents','secret-plan.txt'),'x');
 const sizes={Documents:3e9,Downloads:1e9,Cache:5e9,Small:1e6,Tool:2e8};const measured=[];
 const result=await storage({home,env:{ProgramFiles:programs},measure:async dir=>{measured.push(dir);return dir===programs?null:sizes[path.basename(dir)];}});
 assert.deepEqual(result.user.map(r=>r.name),['AppData\\Local','Documents','Downloads','AppData\\Roaming']);assert.equal(result.appData[0].largest[0].name,'Cache');assert.equal(result.appData[0].largest.length,1);assert.equal(result.unmeasured,1);
 const text=TOPICS.storage.describe(result);assert.match(text,/AppData\\Local 4\.7 GB, Documents 2\.8 GB/);assert.doesNotMatch(text,/secret-plan/);assert(!measured.some(dir=>dir.includes('secret-plan')));
});
test('startup entries are switched with the same flag Task Manager writes',()=>{
 assert.deepEqual([...startupFlag(true)],[2,0,0,0,0,0,0,0,0,0,0,0]);const off=startupFlag(false,Date.UTC(2026,0,1));assert.equal(off[0],3);assert.equal(off.length,12);assert.equal(Number((off.readBigUInt64LE(4)-116444736000000000n)/10000n),Date.UTC(2026,0,1));
 assert.equal(startupKey({scope:'user',kind:'run',name:'Alpha'}),'user|run|Alpha');
});
test('Windows components and AppHub itself can never be ended',()=>{
 for(const name of ['svchost','explorer','CSRSS','AppHub','llama-server','dwm','MsMpEng',"x'; Remove-Item",'a*','',null])assert.equal(endable(name),false,String(name));
 for(const name of ['brave','Discord','Tokscale Desktop','ProtonVPN.Client'])assert.equal(endable(name),true,name);
});
test('lookups are cached, shared while pending, and never fail the chat',async()=>{
 let reads=0,now=1000;const lookups=new Lookups({now:()=>now,topics:{ok:{title:'ok',ttl:500,read:async arg=>{reads++;return {arg};},describe:d=>'arg '+d.arg},bad:{title:'bad',ttl:500,read:async()=>{throw new Error('denied');},describe:()=>''}}});
 const [first,second]=await Promise.all([lookups.get('ok','x'),lookups.get('ok','x')]);assert.equal(first,second);assert.equal(reads,1);assert.equal(first.text,'arg x');
 await lookups.get('ok','y');assert.equal(reads,2);now+=600;await lookups.get('ok','x');assert.equal(reads,3);lookups.forget('ok');await lookups.get('ok','x');assert.equal(reads,4);
 assert.equal(await lookups.get('bad'),null);assert.equal(await lookups.get('unknown'),null);
});
test('lookup wording keeps what can be closed apart from Windows, and enabled startup entries apart from disabled ones',()=>{
 const text=TOPICS.processes.describe(processes.data);assert.match(text,/could close, by memory: browser 2 GB \(3 processes\), renderer 0\.5 GB/);assert.match(text,/must stay running, by memory: svchost 1\.5 GB/);assert.match(text,/Not responding: frozen/);
 const start=TOPICS.startup.describe(startup.data);assert.match(start,/now \(2 enabled\): Alpha, Beta \[all users\]/);assert.match(start,/do not start \(1\): Gamma/);
 assert.match(TOPICS.battery.describe({present:false}),/no battery/);assert.match(TOPICS.battery.describe({present:true,charge:80,plugged:false,minutes:125,design:60000,full:54000,cycles:31,chargeRate:0,dischargeRate:8200}),/90% health \(10% wear\)[\s\S]*cycles: 31[\s\S]*8\.2 W/);
});
test('catalog search drops filler words and retries with fewer',async()=>{
 const asked=[];const table='Name         Id            Version\n-----------------------------------\nOpen Editor  Open.Editor   4.0\n';
 const runner=async(_file,args)=>{const q=args[2];asked.push(q);return {code:q==='video'?0:1,out:q==='video'?table:'No package found'};};
 const result=await TOPICS.catalog.read('free video editor app',runner);assert.deepEqual(asked,['video editor','video']);assert.equal(result.term,'video');assert.deepEqual(result.packages,[{name:'Open Editor',id:'Open.Editor',version:'4.0',source:'winget'}]);
});
test('keywords choose lookups first and the model fills in only when they find nothing',()=>{
 assert.deepEqual(picked('Has anything crashed lately?'),['events']);assert.deepEqual(picked('Is my wifi ok?'),['network']);assert.deepEqual(picked('hello there'),[]);
 assert.equal(needsPlan('Why is my disk full?'),false);assert.equal(needsPlan('hello there'),true);assert.equal(needsPlan('which apps have updates?'),false);assert.equal(needsPlan('install a video editor'),true);
 assert.deepEqual(mergePlan('Has anything crashed lately?',{lookups:['services','battery'],search:''}).topics,['events']);
 assert.deepEqual(mergePlan('how is the thing doing',{lookups:['battery','services','network'],search:''}).topics,['battery','services']);
 assert.deepEqual(mergePlan('which apps are outdated',{lookups:['windowsupdate'],search:''}).topics,[]);
 assert.deepEqual(mergePlan('install a video editor',{lookups:[],search:'video editor; rm'}),{topics:['catalog'],search:'video editor rm'});
 assert.deepEqual(mergePlan('install a video editor',null).topics,[]);assert.deepEqual(mergePlan('x',{lookups:['invented']}).topics,[]);
 const plan=planChat([{role:'user',content:'first'},{role:'assistant',content:'ok'},{role:'user',content:'second'}]);assert.match(plan.user,/Earlier message: first\nLatest message: second/);assert(plan.topics.includes('events'));assert.match(plan.system,/events: app crashes/);
});
test('destructive buttons are offered only when the question or a lookup calls for them',()=>{
 const plain=buildChat({turns:[{role:'user',content:'tell me about Paint'}],items,related:[items[0]],system});
 assert(!plain.chat.labels.some(l=>/^(Uninstall|End|Disable|Install) /.test(l)));assert(plain.chat.labels.includes('Update all apps'));assert.match(plain.chat.system,/OTHER BUTTONS\nUpdate all apps/);
 const asked=buildChat({turns:[{role:'user',content:'I never use Paint or Notes, remove them'}],items,related:[],system,lookups:[processes,startup,catalog]});
 assert.deepEqual(asked.chat.labels.filter(l=>l.startsWith('Uninstall ')),['Uninstall Paint','Uninstall Sketch']);
 assert.deepEqual(asked.chat.labels.filter(l=>l.startsWith('End ')),['End frozen','End browser','End renderer']);
 assert.deepEqual(asked.chat.labels.filter(l=>l.startsWith('Disable startup: ')),['Disable startup: Alpha']);assert(asked.chat.labels.includes('Install Open Editor'));
 assert.match(asked.chat.system,/RUNNING PROGRAMS \(looked up just now\)/);assert.doesNotMatch(asked.chat.system,/Programs using the most memory now/);assert.doesNotMatch(asked.chat.system,/Programs that start with Windows \(1\)/);
});
test('buttons resolve to typed actions only for things the reply names',()=>{
 const built=buildChat({turns:[{role:'user',content:'remove Paint, and close what is slow'}],items,related:[items[0]],system,lookups:[processes,startup,catalog]});
 const all=['Paint','Uninstall Paint','End browser','End renderer','Disable startup: Alpha','Install Open Editor','Update all apps','End svchost'];
 assert.deepEqual(resolveSuggestions(all,built.options,'Remove Paint with the button below. browser is the heaviest, Alpha starts with Windows, and Open Editor is in the catalog.',built.updates),
  [{type:'entry',id:'a',name:'Paint',uninstall:true},{type:'process',name:'browser',count:3,memoryGb:2},{type:'startup',key:'user|run|Alpha',name:'Alpha'},{type:'package',id:'Open.Editor',name:'Open Editor',version:'4.0',source:'winget'}]);
 assert.deepEqual(resolveSuggestions(['Update all apps'],built.options,'You can update both apps.',built.updates),[{type:'updates',ids:['b','c']}]);
 assert.deepEqual(resolveSuggestions(['End browser','Update all apps'],built.options,'Nothing to do.',built.updates),[]);
 assert.deepEqual(resolveSuggestions(['End browser'],built.options,'Try the browsers list.',built.updates),[]);
});
