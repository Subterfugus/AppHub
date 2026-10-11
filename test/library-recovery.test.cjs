const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Library}=require('../src/library.cjs');
function directory(t){const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-recovery-'));t.after(()=>fs.rmSync(data,{recursive:true,force:true}));return data;}

test('incomplete preferences and null jobs recover with exact original backups',t=>{
 const data=directory(t),originals={'preferences.json':'{}','jobs.json':'null','library.json':'{"apps":[null,{}, {"id":"valid","name":"Valid","publisher":7}],"warnings":false,"extra":"keep"}'};
 for(const [file,contents]of Object.entries(originals))fs.writeFileSync(path.join(data,file),contents);
 const lib=new Library(data),snapshot=lib.snapshot();
 assert.equal(snapshot.items.some(a=>a.id==='valid'),true);assert.equal(lib.state.extra,'keep');assert.deepEqual(lib.jobs,[]);assert.equal(lib.prefs.aiEnabled,true);assert.equal(snapshot.warnings.length,3);
 for(const [file,contents]of Object.entries(originals)){const backup=fs.readdirSync(data).find(f=>f.startsWith(file+'.recovered-'));assert.ok(backup,file);assert.equal(fs.readFileSync(path.join(data,backup),'utf8'),contents);}
 assert.doesNotThrow(()=>new Library(data).snapshot());
});

test('recovery retains valid preferences and unknown fields while filtering malformed entries',t=>{
 const data=directory(t);fs.writeFileSync(path.join(data,'preferences.json'),JSON.stringify({favorites:['one',null],hidden:['two'],tags:{one:['daily',12],bad:null},recent:[null,{id:'one',time:'2026-10-10T12:00:00Z'}],custom:[null,{id:'custom:one',name:'Portable',launch:{type:'exe',target:'C:\\tool.exe'},extra:'keep'}],folders:['C:\\Tools',false],aiEnabled:false,modelProfiles:{chosen:'local'}}));
 fs.writeFileSync(path.join(data,'jobs.json'),JSON.stringify([null,12,{id:'history',action:'install',status:'completed',created:'2026-10-10T12:00:00Z',packages:[null,{id:'Vendor.App',source:'winget'}],results:[null,{id:'Vendor.App',success:true}],log:'Retain output',extra:'keep'}]));
 const lib=new Library(data);assert.deepEqual(lib.prefs.favorites,['one']);assert.deepEqual(lib.prefs.tags.one,['daily']);assert.equal(lib.prefs.aiEnabled,false);assert.equal(lib.prefs.custom[0].extra,'keep');assert.deepEqual(lib.prefs.modelProfiles,{chosen:'local'});assert.equal(lib.jobs[0].log,'Retain output');assert.equal(lib.jobs[0].extra,'keep');assert.equal(lib.jobs[0].results.length,1);assert.doesNotThrow(()=>lib.snapshot());
});

test('malformed JSON recovers without overwriting the original backup',t=>{
 const data=directory(t),original='{broken';fs.writeFileSync(path.join(data,'preferences.json'),original);const lib=new Library(data);assert.ok(lib.snapshot().warnings.some(w=>w.includes('preferences.json')));const backup=fs.readdirSync(data).find(f=>f.endsWith('.bak'));assert.equal(fs.readFileSync(path.join(data,backup),'utf8'),original);
});

test('inventory scans preserve the successful package check timestamp',async t=>{
 const data=directory(t),lib=new Library(data,()=>{},{discover:async()=>({registry:[],computer:'Test'}),steam:()=>[]});const checked='2026-10-10T12:00:00Z';lib.state.packageChecked=checked;await lib.scan();assert.equal(lib.snapshot().packageChecked,checked);assert.equal(new Library(data).state.packageChecked,checked);
});

test('cached WinGet-only entries survive scans and exports until authoritative refresh',async t=>{
 const data=directory(t),lib=new Library(data,()=>{},{discover:async()=>({registry:[]}),steam:()=>[]});lib.state.packageChecked='2026-10-10T12:00:00Z';lib.state.apps=[{id:'pkg:cli',name:'Command tool',kind:'app',source:'WinGet',packageOnly:true,packageId:'Vendor.CLI',packageSource:'winget',version:'1.0',packageVersion:'1.0'}];await lib.scan();assert.equal(lib.state.apps.length,1);assert.equal(lib.state.apps[0].id,'pkg:cli');assert.equal(lib.manifest().packages[0].id,'Vendor.CLI');assert.equal(lib.state.packageChecked,'2026-10-10T12:00:00Z');
 const row=values=>values.map((v,i)=>v.padEnd([30,30,12,12,10][i])).join('');lib.run=async()=>({code:0,out:[row(['Name','Id','Version','Available','Source']),'-'.repeat(94),row(['Other tool','Vendor.Other','1.0','','winget'])].join('\n'),err:''});await lib.checkPackages();assert.equal(lib.state.apps.some(a=>a.packageId==='Vendor.CLI'),false);assert.equal(lib.manifest().packages[0].id,'Vendor.Other');
});

test('cached packages merge only into unique compatible discoveries',async t=>{
 const data=directory(t);let registry=[{name:'Example',version:'1.0',registry:'one'}];const lib=new Library(data,()=>{},{discover:async()=>({registry}),steam:()=>[]});const cached={id:'pkg:example',name:'Example',kind:'app',source:'WinGet',packageOnly:true,packageId:'Vendor.Example',packageSource:'winget',version:'1.0',packageVersion:'1.0',available:'2.0'};lib.state.apps=[cached];await lib.scan();assert.equal(lib.state.apps.length,1);assert.equal(lib.state.apps[0].source,'Installed');assert.equal(lib.state.apps[0].packageId,'Vendor.Example');
 registry=[{name:'Example',version:'1.0',registry:'two',location:'C:\\Two'},{name:'Example',version:'1.0',registry:'three',location:'C:\\Three'}];lib.state.apps=[cached];await lib.scan();assert.equal(lib.state.apps.length,3);assert.equal(lib.state.apps.filter(a=>a.packageId).length,1);assert.equal(lib.state.apps.find(a=>a.packageId).packageOnly,true);
 registry=[{name:'Example',version:'3.0',registry:'new'}];lib.state.apps=[cached];await lib.scan();assert.equal(lib.state.apps.length,2);assert.equal(lib.state.apps.find(a=>a.source==='Installed').packageId,undefined);
});

test('removing portable registrations and folders preserves real files and unrelated metadata',t=>{
 const data=directory(t),file=path.join(data,'Example.exe');fs.writeFileSync(file,'executable fixture');const lib=new Library(data);lib.addCustom(file);const id=lib.prefs.custom[0].id;lib.modify(id,'favorite',true);lib.modify(id,'hidden',true);lib.modify(id,'tags',['daily']);lib.launched(id);lib.prefs.favorites.push('other');lib.prefs.tags.other=['keep'];lib.prefs.folders.push(data);lib.removeCustom(id);lib.removeFolder(data);
 assert.equal(fs.readFileSync(file,'utf8'),'executable fixture');assert.deepEqual(lib.prefs.custom,[]);assert.deepEqual(lib.prefs.folders,[]);assert.deepEqual(lib.prefs.favorites,['other']);assert.deepEqual(lib.prefs.tags.other,['keep']);assert.equal(lib.prefs.tags[id],undefined);assert.equal(lib.prefs.recent.some(r=>r.id===id),false);assert.equal(lib.prefs.hidden.includes(id),false);assert.deepEqual(new Library(data).prefs.custom,[]);assert.throws(()=>lib.removeCustom('other'));assert.throws(()=>lib.removeFolder('missing'));
});

test('canceling queued jobs prevents dispatch and never interrupts the active installer',async t=>{
 const data=directory(t),calls=[];let release;const gate=new Promise(resolve=>{release=resolve;});const lib=new Library(data,()=>{},{run:async(_file,args)=>{calls.push(args[args.indexOf('--id')+1]);await gate;return {code:0,out:'',err:''};}});lib.scan=async()=>{};lib.checkPackages=async()=>{};
 const active=lib.enqueue('install',[{id:'Vendor.First',source:'winget'}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(active.status,'running');const queued=lib.enqueue('install',[{id:'Vendor.Second',source:'winget'}]);lib.cancelJob(queued.id);assert.throws(()=>lib.cancelJob(active.id),/Only queued/);assert.equal(active.status,'running');release();await lib.queue;assert.deepEqual(calls,['Vendor.First']);assert.equal(active.status,'completed');assert.equal(queued.status,'canceled');assert.equal(queued.results.length,0);assert.ok(queued.finished);assert.match(queued.log,/before any installer/);assert.equal(new Library(data).jobs.find(j=>j.id===queued.id).status,'canceled');
});

test('uncertain installer timeout cancels remaining packages and queued jobs without dispatch',async t=>{
 const data=directory(t),calls=[];let timeout;const pending=new Promise((_resolve,reject)=>{timeout=reject;});const lib=new Library(data,()=>{},{run:async(_file,args)=>{calls.push(args[args.indexOf('--id')+1]);return pending;}});let refreshed=0;lib.scan=async()=>{refreshed++;};lib.checkPackages=async()=>{refreshed++;};
 const active=lib.enqueue('install',[{id:'Vendor.First',source:'winget'},{id:'Vendor.Remaining',source:'winget'}]);await new Promise(resolve=>setImmediate(resolve));const queued=lib.enqueue('install',[{id:'Vendor.Queued',source:'winget'}]);const error=new Error('winget.exe timed out');error.code='APPHUB_PROCESS_TIMEOUT';error.timedOut=true;timeout(error);await lib.queue;
 assert.deepEqual(calls,['Vendor.First']);assert.equal(refreshed,0);assert.equal(active.status,'failed');assert.equal(active.results[0].uncertain,true);assert.equal(active.results[0].success,false);assert.equal(active.results[1].notRun,true);assert.equal(queued.status,'canceled');assert.equal(queued.results[0].notRun,true);assert.ok(queued.finished);assert.match(active.log,/installer may still be running/);assert.match(active.log,/sync the library or check for updates/);assert.match(active.log,/reviewing and retrying selected packages/);assert.ok(lib.snapshot().warnings.some(w=>w.includes('outcome is uncertain')));
 const reloaded=new Library(data);assert.equal(reloaded.jobs.find(j=>j.id===active.id).results[0].uncertain,true);assert.equal(reloaded.jobs.find(j=>j.id===queued.id).status,'canceled');assert.ok(reloaded.snapshot().warnings.some(w=>w.includes('outcome is uncertain')));
});
