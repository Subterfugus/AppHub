const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {parseTable,mergeInventory}=require('../src/platform.cjs');const {Library,validatePackage}=require('../src/library.cjs');const {rank}=require('../src/search.cjs');const settings=require('../src/settings.cjs');
test('column parser preserves spaces, empty available versions and exact package IDs',()=>{const row=c=>c.map((v,i)=>v.padEnd([23,32,12,12,10][i])).join('');const rows=parseTable([row(['Name','Id','Version','Available','Source']),'-'.repeat(89),row(['AB Download Manager','amir1376.ABDownloadManager','1.10.1','1.10.4','winget']),row(['App Installer','Microsoft.AppInstaller','1.29.380.0','','winget'])].join('\n'));assert.equal(rows[0][0],'AB Download Manager');assert.equal(rows[0][1],'amir1376.ABDownloadManager');assert.equal(rows[1][3],'');assert.equal(rows[1][4],'winget');});
test('registry, shortcut and Start entries merge, with launchable shortcuts preferred',()=>{const apps=mergeInventory({registry:[{name:'7-Zip 26.02 (x64)',version:'26.02',registry:'7zip'}],start:[{name:'7-Zip File Manager',appId:'id'}],links:[{name:'7-Zip File Manager',target:'C:\\7zip\\7zFM.exe',path:'C:\\start\\7zip.lnk'}]});assert.equal(apps.length,1);assert.equal(apps[0].launch.type,'shortcut');assert.equal(apps[0].version,'26.02');});
test('exact app names outrank broad keywords and misspellings still find an app',()=>{const apps=[{id:'a',name:'Calculator',category:'Utilities'},{id:'b',name:'Something',description:'Calculator math arithmetic'}];assert.equal(rank('calculator',apps)[0].id,'a');assert.equal(rank('calclator',apps)[0].id,'a');});
test('settings intent and tags are searchable without AI',()=>{assert.equal(rank('blue light',settings)[0].name,'Night light');assert.equal(rank('guitar',[{id:'a',name:'Example',tags:['guitar']}])[0].id,'a');});
test('manifest round trip, installed detection and metadata restore persist',()=>{const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-test-'));const lib=new Library(data);lib.state.apps=[{id:'app:a',name:'Test App',packageId:'Test.App',packageSource:'winget',version:'1.0',kind:'app',source:'Installed',tags:[]}];lib.modify('app:a','favorite',true);lib.modify('app:a','tags',['daily']);const m=lib.manifest();assert.equal(lib.preview(m)[0].installed,true);m.packages.push({id:'Other.App',source:'winget',version:'2.0'});assert.equal(lib.preview(m)[1].status,'Missing');lib.modify('app:a','favorite',false);lib.restorePreferences(m);assert.equal(new Library(data).prefs.favorites.includes('app:a'),true);assert.deepEqual(new Library(data).prefs.tags['app:a'],['daily']);fs.rmSync(data,{recursive:true});});
test('manifests cannot inject options, shell commands, URLs or arbitrary sources',()=>{for(const id of ['--help','foo;calc','x&whoami','$(whoami)','https://example.com','foo\nbar','x" --force'])assert.throws(()=>validatePackage({id,source:'winget'}));assert.throws(()=>validatePackage({id:'Fine.App',source:'evil'}));assert.throws(()=>validatePackage({id:'Fine.App',source:'winget',version:'--force'}));validatePackage({id:'7zip.7zip',source:'winget',version:'26.02'});});
test('interrupted operations are recovered honestly after a restart',()=>{const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-test-'));fs.writeFileSync(path.join(data,'jobs.json'),JSON.stringify([{status:'running'}]));assert.equal(new Library(data).jobs[0].status,'interrupted');fs.rmSync(data,{recursive:true});});

const table=(rows)=>{const widths=[64,88,24,24,10];const row=c=>c.map((v,i)=>String(v).padEnd(widths[i])).join('');return [row(['Name','Id','Version','Available','Source']),'-'.repeat(210),...rows.map(row)].join('\n');};
function temporaryLibrary(t,dependencies={}){const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-test-'));t.after(()=>fs.rmSync(data,{recursive:true,force:true}));return new Library(data,()=>{},dependencies);}

test('inventory preserves architectures, runtime versions, editions and distinct products',()=>{
 const registry=[
  {name:'Microsoft .NET Runtime - 8.0.14 (x64)',version:'8.0.14',registry:'runtime8x64'},
  {name:'Microsoft .NET Runtime - 8.0.14 (x86)',version:'8.0.14',registry:'runtime8x86'},
  {name:'Microsoft .NET Runtime - 9.0.3 (x64)',version:'9.0.3',registry:'runtime9'},
  {name:'Chrome Remote Desktop Host',registry:'host'},
  {name:'Outlook',registry:'outlook'}];
 const apps=mergeInventory({registry,start:[{name:'Chrome Remote Desktop',appId:'remote'},{name:'Outlook (classic)',appId:'classic'}]});
 assert.equal(apps.length,7);assert.equal(apps.find(a=>a.registry==='host').launch,undefined);assert.equal(apps.find(a=>a.registry==='outlook').launch,undefined);
 assert.equal(new Set(apps.map(a=>a.id)).size,apps.length);
});

test('same-name shortcuts cannot arbitrarily choose among different installations',()=>{
 const apps=mergeInventory({registry:[{name:'Example',version:'1',location:'C:\\One',registry:'one'},{name:'Example',version:'1',location:'C:\\Two',registry:'two'}],links:[{name:'Example',target:'C:\\Other\\Example.exe',path:'C:\\Start\\Example.lnk'}]});
 assert.equal(apps.length,3);assert.equal(apps.filter(a=>a.launch).length,1);assert.equal(apps.find(a=>a.launch).source,'Shortcut');
});

test('DisplayIcon never establishes launchability, even for an existing executable',t=>{
 const lib=temporaryLibrary(t);const target=path.join(lib.data,'desktop-runtime-installer.exe');fs.writeFileSync(target,'fixture');
 const apps=mergeInventory({registry:[{name:'Windows Desktop Runtime',registry:'runtime',icon:target}]});assert.equal(apps[0].launch,undefined);
 const docs=mergeInventory({start:[{name:'Git FAQs',appId:'faqs'},{name:'Whatsnew.txt',appId:'changes.txt'},{name:'Manual',appId:'manual'},{name:'Install Additional Tools for Node.js',appId:'tools'}]});assert.equal(docs.length,0);
 assert.equal(require('../src/platform.cjs').categorize('Ledger'),'Utilities');
});

test('registry publisher prefixes merge with verified shortcut names without generic prefix matching',()=>{
 const apps=mergeInventory({registry:[{name:'Neural DSP Archetype Example',publisher:'Neural DSP',registry:'plugin'}],start:[{name:'Archetype Example',appId:'plugin-start'}],links:[{name:'Archetype Example',target:'C:\\Neural\\Example.exe',path:'C:\\Start\\Example.lnk'}]});
 assert.equal(apps.length,1);assert.equal(apps[0].launch.type,'shortcut');
});

test('actual shortcut executable and package family associate renamed apps without launching an icon',async t=>{
 const apps=mergeInventory({registry:[{name:'Zen Browser (x64 en-US)',registry:'zen',icon:'C:\\Zen\\zen.exe,0'}],start:[{name:'Zen',appId:'zen-start'},{name:'Terminal',appId:'Microsoft.WindowsTerminal_abc!App'}],appx:[{family:'Microsoft.WindowsTerminal_abc',version:'1.2'}],links:[{name:'Zen',target:'C:\\Zen\\zen.exe',path:'C:\\Start\\Zen.lnk',arguments:''}]});
 assert.equal(apps.length,2);assert.equal(apps.find(a=>a.registry==='zen').launch.type,'shortcut');
 const lib=temporaryLibrary(t,{run:async()=>({code:0,out:table([['Windows Terminal','Microsoft.WindowsTerminal','1.2','','winget']]),err:''})});lib.state.apps=apps;await lib.checkPackages();assert.equal(lib.state.apps.length,2);assert.equal(lib.state.apps.find(a=>a.name==='Terminal').packageId,'Microsoft.WindowsTerminal');
});

test('package refresh uses source and unique exact names, clears stale mappings, and avoids ellipsis guesses',async t=>{
 const output=table([['Example','Vendor.Example','2.0','2.1','winget'],['Example','Vendor.Example','2.0','','msstore'],['Truncated…','Vendor.Truncated','1.0','','winget']]);
 const lib=temporaryLibrary(t,{run:async()=>({code:0,out:output,err:''})});
 lib.state.apps=[{id:'one',name:'Example',version:'2.0',packageId:'Wrong.Package',packageSource:'winget'},{id:'two',name:'Example',version:'1.0'},{id:'three',name:'Truncated Product',version:'1.0'},{id:'stale',name:'Gone',source:'WinGet',packageId:'Gone.App',packageSource:'winget'}];
 await lib.checkPackages();assert.equal(lib.state.apps.find(a=>a.id==='one').packageId,'Vendor.Example');assert.equal(lib.state.apps.find(a=>a.id==='one').available,'2.1');
 assert.equal(lib.state.apps.find(a=>a.id==='three').packageId,undefined);assert.equal(lib.state.apps.some(a=>a.id==='stale'),false);
 const packages=lib.state.apps.filter(a=>a.packageId);assert.equal(packages.length,3);assert.equal(new Set(packages.map(a=>a.packageSource+':'+a.packageId)).size,3);
});

test('scan retains package bindings only for the same stable inventory identity',async t=>{
 const raw={registry:[{name:'Example (x86)',version:'1.0',registry:'new'}]};const lib=temporaryLibrary(t,{discover:async()=>raw,steam:()=>[]});
 lib.state.apps=[{id:'app:old',name:'Example (x64)',version:'1.0',packageId:'Vendor.X64',packageSource:'winget',available:'2.0'}];
 await lib.scan();assert.equal(lib.state.apps.length,1);assert.equal(lib.state.apps[0].packageId,undefined);assert.equal(lib.state.packageChecked,null);
});

test('manifest export round-trips comparative and unknown reported versions and settings metadata',t=>{
 const lib=temporaryLibrary(t);lib.state.apps=[{id:'a',name:'Runtime',packageId:'Microsoft.WindowsAppRuntime.1.8',packageSource:'winget',version:'> 1.8.10',kind:'app'},{id:'b',name:'Unknown',packageId:'Unknown.Package',packageSource:'winget',version:'Unknown',kind:'app'}];
 lib.modify(settings[0].id,'favorite',true);lib.modify(settings[0].id,'tags',['monitor']);const manifest=lib.manifest();assert.deepEqual(manifest.packages.map(p=>p.version),[null,null]);assert.equal(lib.preview(manifest).length,2);
 lib.modify(settings[0].id,'favorite',false);lib.modify(settings[0].id,'tags',[]);lib.restorePreferences(manifest);assert.equal(lib.all().find(a=>a.id===settings[0].id).favorite,true);assert.deepEqual(lib.all().find(a=>a.id===settings[0].id).tags,['monitor']);
});

test('manifest package identity includes source and ignores identifier casing',t=>{
 const lib=temporaryLibrary(t);lib.state.apps=[{id:'a',name:'Example',packageId:'Vendor.App',packageSource:'msstore',version:'1'}];
 const plan=lib.preview({format:'apphub-library',schemaVersion:1,packages:[{id:'Vendor.App',source:'winget'},{id:'vendor.app',source:'winget'},{id:'VENDOR.APP',source:'msstore'}]});
 assert.equal(plan.length,2);assert.equal(plan[0].key,'winget:vendor.app');assert.equal(plan[0].installed,false);assert.equal(plan[1].installed,true);
 assert.throws(()=>lib.preview({format:'apphub-library',schemaVersion:1,packages:[],library:{}}));
});

test('package jobs deduplicate selections, never silently upgrade installs, and report no-change HRESULTs honestly',async t=>{
 const calls=[];const lib=temporaryLibrary(t,{run:async(file,args)=>{calls.push({file,args});return {code:0x8A150061|0,out:'Already installed',err:''};}});lib.scan=async()=>{};lib.checkPackages=async()=>{};
 const job=lib.enqueue('install',[{id:'Vendor.App',source:'winget',version:'1.2'},{id:'vendor.app',source:'winget',version:'1.2'}],{exactVersions:true});
 assert.throws(()=>lib.enqueue('install',[{id:'VENDOR.APP',source:'winget'}]),/already.*queue/);await lib.queue;
 assert.equal(calls.length,1);assert.equal(calls[0].args.includes('--no-upgrade'),true);assert.equal(calls[0].args[calls[0].args.indexOf('--version')+1],'1.2');assert.equal(job.status,'completed');assert.equal(job.results[0].noChange,true);assert.equal(job.results[0].source,'winget');assert.match(job.log,/no changes made/i);
});

test('job history limits never evict pending operations and failed exit codes remain failures',async t=>{
 const lib=temporaryLibrary(t,{run:async()=>({code:5,out:'failure',err:''})});lib.scan=async()=>{};lib.checkPackages=async()=>{};
 const old={id:'pending',status:'queued',packages:[{id:'Other.App',source:'winget'}]};lib.jobs=Array.from({length:100},(_,i)=>({id:String(i),status:'completed'})).concat(old);
 const job=lib.enqueue('install',[{id:'Vendor.App',source:'winget'}]);assert.equal(lib.jobs.includes(old),true);await lib.queue;assert.equal(job.status,'failed');assert.equal(job.results[0].success,false);assert.ok(job.finished);
});

test('synthetic inventory preserves runtime architectures without using installer icons as launchers',()=>{
 const raw={registry:[{name:'Example Runtime 1.0 (x64)',version:'1.0',registry:'fixture:x64',icon:'C:\\Fixtures\\setup.exe'},{name:'Example Runtime 1.0 (x86)',version:'1.0',registry:'fixture:x86',icon:'C:\\Fixtures\\setup.exe'}],start:[],links:[],appx:[]};const apps=mergeInventory(raw);assert.equal(apps.length,2);assert.equal(apps.some(a=>a.launch?.type==='exe'),false);
});

test('uninstall is queued only for installed packages and runs WinGet without install-only flags',async t=>{
 const calls=[];const lib=temporaryLibrary(t,{run:async(file,args)=>{calls.push([file,...args]);return {code:0,out:'',err:''};},discover:async()=>({registry:[]}),steam:()=>[]});
 lib.state.apps=[{id:'pkg:tool',name:'Tool',kind:'app',packageId:'Vendor.Tool',packageSource:'winget',version:'1.0'}];
 assert.throws(()=>lib.enqueue('uninstall',[{id:'Vendor.Missing',source:'winget'}]),/Sync the library/);assert.throws(()=>lib.enqueue('remove',[{id:'Vendor.Tool',source:'winget'}]),/Invalid package operation/);
 const job=lib.enqueue('uninstall',[{id:'Vendor.Tool',source:'winget'}]);assert.equal(job.action,'uninstall');await lib.queue;
 const command=calls.find(c=>c[1]==='uninstall');assert.deepEqual(command.slice(0,7),['winget.exe','uninstall','--id','Vendor.Tool','--exact','--source','winget']);assert(!command.includes('--accept-package-agreements'));assert(!command.includes('--no-upgrade'));assert(command.includes('--silent'));assert.equal(job.results[0].success,true);
});
