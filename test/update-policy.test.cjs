const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Library}=require('../src/library.cjs');

function fixture(t){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'apphub-update-policy-'));
 t.after(()=>fs.rmSync(data,{recursive:true,force:true}));
 let notifications=0;
 const lib=new Library(data,()=>{notifications++;},{run:async()=>{throw new Error('Package runner must not be called');},discover:async()=>({registry:[]}),steam:()=>[]});
 lib.perform=async()=>{};
 return {data,lib,notifications:()=>notifications};
}
const app=(id='one',packageId='Vendor.Example',packageSource='winget')=>({id,name:'Example',kind:'app',source:'Installed',packageId,packageSource,version:'1.0',available:'2.0'});
const request=a=>({id:a.packageId,source:a.packageSource});
const policy=(excluded=false,skipVersion=null)=>({excluded,skipVersion});

test('update preferences survive restart and display ID migration without path-based keys',t=>{
 const {data,lib,notifications}=fixture(t);
 lib.state.apps=[app()];lib.save('library.json',lib.state);
 const snapshot=lib.setUpdatePolicy('one',policy(true,'2.0'));
 assert.equal(snapshot.items.find(a=>a.id==='one').updateBlocked,true);
 assert.equal(notifications(),1);
 const restarted=new Library(data);
 restarted.state.apps[0].id='different-discovery-id';
 const item=restarted.all().find(a=>a.id==='different-discovery-id');
 assert.deepEqual(item.updatePolicy,policy(true,'2.0'));
 assert.equal(item.updateBlockReason,'excluded');
 assert.deepEqual(Object.keys(restarted.prefs.updatePolicies),['winget:vendor.example']);
 restarted.setUpdatePolicy(item.id,policy());
 assert.deepEqual(new Library(data).prefs.updatePolicies,{});
});

test('skipping one offered version makes a later version eligible while exclusion persists',t=>{
 const {lib}=fixture(t);lib.state.apps=[app()];
 lib.setUpdatePolicy('one',policy(false,'2.0'));
 assert.equal(lib.all()[0].updateBlockReason,'skipped-version');
 lib.state.apps[0].available='3.0';
 assert.equal(lib.all()[0].updateBlocked,false);
 assert.equal(lib.all()[0].updatePolicy.skipVersion,'2.0');
 lib.setUpdatePolicy('one',policy(true,'2.0'));
 assert.equal(lib.all()[0].updateBlockReason,'excluded');
 lib.state.apps[0].available=null;
 lib.setUpdatePolicy('one',policy(false,'2.0'));
 assert.equal(lib.all()[0].updateBlocked,false);
});

test('upgrade enqueue filters policies, de-duplicates packages and refuses a single protected update',async t=>{
 const {lib}=fixture(t),excluded=app('excluded','Vendor.Excluded'),skipped=app('skipped','Vendor.Skipped'),eligible=app('eligible','Vendor.Eligible');
 lib.state.apps=[excluded,skipped,eligible];
 lib.setUpdatePolicy(excluded.id,policy(true));lib.setUpdatePolicy(skipped.id,policy(false,'2.0'));
 const job=lib.enqueue('upgrade',[request(excluded),request(skipped),request(eligible),{id:'vendor.eligible',source:'winget'}]);
 assert.deepEqual(job.packages.map(p=>p.id),['Vendor.Eligible']);
 assert.deepEqual(job.skippedPackages,[{id:'Vendor.Excluded',source:'winget',reason:'excluded',version:'2.0'},{id:'Vendor.Skipped',source:'winget',reason:'skipped-version',version:'2.0'}]);
 assert.throws(()=>lib.enqueue('upgrade',[request(excluded)]),/Clear their update preferences/);
 assert.throws(()=>lib.enqueue('upgrade',[request(skipped)]),/Clear their update preferences/);
 assert.equal(lib.jobs.length,1);
 lib.state.apps.find(a=>a.id==='skipped').available='3.0';
 assert.deepEqual(lib.enqueue('upgrade',[request(skipped)]).packages.map(p=>p.id),['Vendor.Skipped']);
 await lib.queue;
});

test('the same package ID in different sources has isolated preferences and queue targets',async t=>{
 const {lib}=fixture(t),winget=app('winget'),store=app('store','Vendor.Example','msstore');lib.state.apps=[winget,store];
 lib.setUpdatePolicy('winget',policy(true));
 assert.equal(lib.all().find(a=>a.id==='store').updateBlocked,false);
 const job=lib.enqueue('upgrade',[request(winget),request(store),request(store)]);
 assert.deepEqual(job.packages.map(p=>p.source),['msstore']);
 assert.deepEqual(Object.keys(lib.prefs.updatePolicies),['winget:vendor.example']);
 await lib.queue;
});

test('install and uninstall remain available for a package with blocked upgrades',async t=>{
 const {lib}=fixture(t),installed=app();lib.state.apps=[installed];lib.setUpdatePolicy(installed.id,policy(true));
 for(const action of ['install','uninstall']){const job=lib.enqueue(action,[request(installed)]);assert.equal(job.packages.length,1);lib.cancelJob(job.id);}
 assert.throws(()=>lib.enqueue('upgrade',[request(installed)]),/excluded or skipped/);
 await lib.queue;
});

test('custom executable overlays retain package identity and update protection across scans',async t=>{
 const {data,lib}=fixture(t),file=path.join(data,'Example.exe');fs.writeFileSync(file,'synthetic executable fixture');
 lib.state.apps=[{...app(),source:'WinGet',packageOnly:true,executable:file,launch:{type:'exe',target:file}}];
 lib.setUpdatePolicy('one',policy(false,'2.0'));
 lib.addCustom(file);
 const customId=lib.prefs.custom[0].id,merged=lib.all().find(a=>a.id===customId);
 assert.equal(lib.all().filter(a=>a.kind==='app').length,1);
 assert.equal(merged.packageId,'Vendor.Example');
 assert.equal(merged.updateBlocked,true);
 lib.setUpdatePolicy(customId,policy(true));
 await lib.scan();
 assert.equal(lib.all().find(a=>a.id===customId).updateBlockReason,'excluded');
 assert.throws(()=>lib.enqueue('upgrade',[request(merged)]),/excluded or skipped/);
 lib.removeCustom(customId);
 assert.equal(lib.all().find(a=>a.id==='one').updateBlocked,true);
});

test('setting update preferences validates inputs and commits memory only after a successful save',t=>{
 const {lib,notifications}=fixture(t);lib.state.apps=[app(),{id:'unmanaged',name:'Unmanaged',kind:'app'}];
 for(const invalid of [null,{},policy('yes'),{excluded:false},policy(false,''),policy(false,'bad\nversion'),policy(false,3)])assert.throws(()=>lib.setUpdatePolicy('one',invalid));
 assert.throws(()=>lib.setUpdatePolicy('missing',policy()),/Unknown/);
 assert.throws(()=>lib.setUpdatePolicy('unmanaged',policy()),/managed package/);
 assert.deepEqual(lib.prefs.updatePolicies,{});assert.equal(notifications(),0);
 lib.save=()=>{throw new Error('disk full');};
 assert.throws(()=>lib.setUpdatePolicy('one',policy(true)),/disk full/);
 assert.deepEqual(lib.prefs.updatePolicies,{});assert.equal(lib.all()[0].updateBlocked,false);assert.equal(notifications(),0);
});

test('manifest preferences export and restore source-qualified policies, including temporarily absent packages',t=>{
 const {lib}=fixture(t);lib.state.apps=[app(),app('store','Vendor.Example','msstore')];
 lib.setUpdatePolicy('one',policy(false,'2.0'));lib.setUpdatePolicy('store',policy(true));
 const manifest=lib.manifest();
 assert.deepEqual(manifest.preferences.updatePolicies,{'winget:vendor.example':policy(false,'2.0'),'msstore:vendor.example':policy(true)});
 lib.state.apps=[];lib.prefs.updatePolicies={};lib.restorePreferences(manifest);
 lib.state.apps=[app(),app('store','Vendor.Example','msstore')];
 assert.equal(lib.all()[0].updateBlockReason,'skipped-version');assert.equal(lib.all()[1].updateBlockReason,'excluded');
 const oldManifest={...manifest,preferences:{aiEnabled:true}};
 lib.restorePreferences(oldManifest);
 assert.equal(lib.all()[0].updateBlocked,true);
});

test('old and malformed persisted update preferences recover safely',t=>{
 const {data,lib}=fixture(t);lib.state.apps=[app()];lib.save('library.json',lib.state);
 fs.writeFileSync(path.join(data,'preferences.json'),JSON.stringify({favorites:['one'],updatePolicies:{'winget:Vendor.Example':policy(false,'2.0'),'msstore:Vendor.Example':policy(true),'winget:Vendor.Invalid':{excluded:'yes',skipVersion:null},'winget:Vendor.Cleared':policy(),'other:Vendor.App':policy(true),'winget:bad/identifier':policy(true)}}));
 const restarted=new Library(data);
 assert.deepEqual(restarted.prefs.updatePolicies,{'winget:vendor.example':policy(false,'2.0'),'msstore:vendor.example':policy(true)});
 assert.equal(restarted.all()[0].favorite,true);assert.equal(restarted.all()[0].updateBlocked,true);
 fs.writeFileSync(path.join(data,'preferences.json'),JSON.stringify({favorites:['one']}));
 assert.deepEqual(new Library(data).prefs.updatePolicies,{});
});
