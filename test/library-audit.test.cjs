const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {Library}=require('../src/library.cjs');
function fixture(t,dependencies={}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-audit-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const lib=new Library(path.join(root,'data'),()=>{},{discover:async()=>({registry:[]}),steam:()=>[],...dependencies});return {root,lib};}
const table=rows=>{const row=values=>values.map((v,i)=>v.padEnd([25,35,12,12,10][i])).join('');return [row(['Name','Id','Version','Available','Source']),'-'.repeat(94),...rows.map(row)].join('\n');};
const cached=()=>({id:'pkg:example',name:'Example',kind:'app',source:'WinGet',packageOnly:true,packageId:'Vendor.Example',packageSource:'winget',version:'1.0',packageVersion:'1.0'});

test('incomplete WinGet list preserves the complete inventory and check timestamp',async t=>{
 const {lib}=fixture(t,{run:async()=>({code:0,out:table([['Example','Vendor.Examp…','1.0','','winget'],['Other','Vendor.Other','1.0','','winget']]),err:''})});lib.state.apps=[cached()];lib.state.packageChecked='2026-01-01T00:00:00Z';lib.save('library.json',lib.state);const before=fs.readFileSync(path.join(lib.data,'library.json'),'utf8');
 await assert.rejects(lib.checkPackages(),/incomplete.*retained/);assert.equal(fs.readFileSync(path.join(lib.data,'library.json'),'utf8'),before);assert.equal(lib.manifest().packages[0].id,'Vendor.Example');
 lib.run=async()=>({code:0,out:table([['Other','Vendor.Other','1.0','','winget']]),err:''});await lib.checkPackages();assert.deepEqual(lib.manifest().packages.map(p=>p.id),['Vendor.Other']);
});

test('package identity migration retains preferences and recent launches across restart',async t=>{
 const {lib}=fixture(t,{discover:async()=>({registry:[{name:'Example',version:'1.0',registry:'synthetic:example'}]})});lib.state.apps=[cached()];lib.modify('pkg:example','favorite',true);lib.modify('pkg:example','hidden',true);lib.modify('pkg:example','tags',['daily']);lib.launched('pkg:example');await lib.scan();const item=lib.all().find(a=>a.name==='Example');assert.notEqual(item.id,'pkg:example');assert.equal(item.favorite,true);assert.equal(item.hidden,true);assert.deepEqual(item.tags,['daily']);assert.ok(item.lastLaunch);const restarted=new Library(lib.data);assert.equal(restarted.all().find(a=>a.id===item.id).favorite,true);assert.equal(restarted.prefs.favorites.includes('pkg:example'),false);
});

test('ambiguous package matches preserve separate entries and their preferences',async t=>{
 const {lib}=fixture(t,{discover:async()=>({registry:[{name:'Example',version:'1.0',registry:'one',location:'C:\\One'},{name:'Example',version:'1.0',registry:'two',location:'C:\\Two'}]})});lib.state.apps=[cached()];lib.modify('pkg:example','favorite',true);await lib.scan();assert.equal(lib.state.apps.length,3);assert.equal(lib.all().find(a=>a.id==='pkg:example').favorite,true);
});

test('authoritative package association also migrates preferences when scan versions differ',async t=>{
 const {lib}=fixture(t,{run:async()=>({code:0,out:table([['Example','Vendor.Example','2.0','','winget']]),err:''})});lib.state.apps=[cached(),{id:'app:new',name:'Example',kind:'app',source:'Installed',version:'2.0'}];lib.modify('pkg:example','favorite',true);lib.modify('pkg:example','tags',['daily']);await lib.checkPackages();assert.equal(lib.all().find(a=>a.id==='app:new').favorite,true);assert.deepEqual(lib.all().find(a=>a.id==='app:new').tags,['daily']);assert.equal(lib.state.apps.some(a=>a.id==='pkg:example'),false);
});

test('manual and watched exact executable merge without losing package data or preferences',async t=>{
 const {root,lib}=fixture(t);const folder=path.join(root,'tools');fs.mkdirSync(folder);const file=path.join(folder,'Example.EXE');fs.writeFileSync(file,'synthetic');lib.prefs.folders=[folder];await lib.scan();const scanned=lib.state.apps[0];lib.modify(scanned.id,'favorite',true);lib.modify(scanned.id,'tags',['daily']);scanned.packageId='Vendor.Example';scanned.packageSource='winget';lib.addCustom(file);const manual=lib.prefs.custom[0];assert.equal(lib.all().filter(a=>a.kind==='app').length,1);assert.equal(lib.all()[0].packageId,'Vendor.Example');assert.equal(lib.all()[0].favorite,true);assert.deepEqual(lib.all()[0].tags,['daily']);await lib.scan();assert.equal(lib.all().filter(a=>a.kind==='app').length,1);assert.equal(lib.all().find(a=>a.id===manual.id).name,'Example');assert.equal(lib.manifest().packages[0].id,'Vendor.Example');lib.addCustom(file);assert.equal(lib.prefs.custom.length,1);
});

test('same names at different executable paths remain distinct',async t=>{
 const {root,lib}=fixture(t);for(const name of ['one','two']){const folder=path.join(root,name);fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'Example.exe'),'synthetic');lib.prefs.folders.push(folder);}await lib.scan();assert.equal(lib.all().filter(a=>a.kind==='app').length,2);
});

test('unavailable watched folder retains entries and recovers on the next sync',async t=>{
 const {root,lib}=fixture(t);const folder=path.join(root,'tools'),offline=path.join(root,'offline');fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'Example.exe'),'synthetic');lib.prefs.folders=[folder];await lib.scan();const id=lib.state.apps[0].id;lib.modify(id,'favorite',true);fs.renameSync(folder,offline);await lib.scan();let snapshot=lib.snapshot();assert.equal(snapshot.items.find(a=>a.id===id).unavailable,true);assert.equal(snapshot.items.find(a=>a.id===id).favorite,true);assert.equal(snapshot.sourceHealth[0].status,'unavailable');assert.match(snapshot.warnings[0],/Sync again to retry/);fs.renameSync(offline,folder);await lib.scan();snapshot=lib.snapshot();assert.equal(snapshot.items.find(a=>a.id===id).unavailable,undefined);assert.equal(snapshot.sourceHealth[0].status,'ok');assert.deepEqual(snapshot.warnings,[]);
});
