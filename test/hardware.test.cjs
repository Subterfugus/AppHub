'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {HardwareMonitor,normalizeWindows,describe}=require('../src/hardware.cjs');
const cpu=(idle,user,speed=2400)=>({model:'Test CPU',speed,times:{idle,user,nice:0,sys:0,irq:0}});
function fixture(options={}) {
 let clock=1700000000000,calls=0,reads=0;const scripts=[];
 const raw={data:{memory:{commitUsedBytes:2048,commitLimitBytes:4096},frequency:[{name:'0,0',frequencyMHz:2400,performancePercent:125}],gpu:{engines:[{index:0,engine:'0:3D',utilizationPercent:20},{index:0,engine:'0:3D',utilizationPercent:15},{index:0,engine:'1:Copy',utilizationPercent:10}],memory:[{index:0,dedicatedUsedBytes:512,sharedUsedBytes:128}]},logical:[{name:'C:',totalBytes:10000,freeBytes:5000,activityPercent:25,readBytesPerSecond:10,writeBytesPerSecond:20}],physicalActivity:[{index:0,activityPercent:25,readBytesPerSecond:10,writeBytesPerSecond:20}],network:[{index:1,name:'Generic Ethernet',status:'connected',receiveBytesPerSecond:123,sendBytesPerSecond:45}],battery:{present:false},processes:[{name:'editor',pid:10,cpuPercent:5,memoryBytes:2048}],inventory:{manufacturer:'Test vendor',model:'Test model',biosVersion:'1.2',board:{product:'Board'},physical:[{index:0,name:'Test SSD',sizeBytes:10000,health:'OK'}],gpus:[{name:'Test GPU',dedicatedTotalBytes:8192,driverVersion:'1.2'}],memoryModules:[{capacityBytes:8192,speedMHz:3200}]},sensors:[{type:'Temperature',name:'CPU package',value:42,source:'root\\LibreHardwareMonitor'}]},sources:{inventory:{capturedAt:new Date(clock).toISOString(),status:'available'}},errors:[]};
 const monitor=new HardwareMonitor({platform:'win32',now:()=>clock,wait:async ms=>{clock+=ms;},system:{cpus:()=>{calls++;return calls%2?[cpu(100,100),cpu(200,100)]:[cpu(150,150),cpu(275,125)];},totalmem:()=>8192,freemem:()=>3072},runner:async(script,opts)=>{reads++;scripts.push({script,opts});const value=structuredClone(raw);if(script.startsWith('$includeInventory=$false'))delete value.data.inventory;return {code:0,out:JSON.stringify(value)};},...options});
 return {monitor,raw,scripts,advance:n=>{clock+=n;},reads:()=>reads};
}
test('snapshot samples CPU and reports explicit units, provenance, and projected hardware fields',async()=>{
 const f=fixture(),s=await f.monitor.snapshot();
 assert.equal(s.schemaVersion,1);assert.equal(s.cpu.utilizationPercent,37.5);assert.deepEqual(s.cpu.cores.map(c=>c.utilizationPercent),[50,25]);assert.equal(s.cpu.cores[0].frequencyMHz,3000);
 assert.deepEqual(s.memory,{totalBytes:8192,freeBytes:3072,usedBytes:5120,commitUsedBytes:2048,commitLimitBytes:4096});
 assert.equal(s.gpus[0].utilizationPercent,35);assert.equal(s.gpus[0].dedicatedUsedBytes,512);assert.equal(s.gpus[0].name,'Test GPU');assert.equal(s.disks.physical[0].readBytesPerSecond,10);
 assert.equal(s.network[0].receiveBytesPerSecond,123);assert.equal(s.battery.present,false);assert.equal(s.sensors[0].unit,'°C');assert.equal(s.sources.os.status,'available');assert.equal(f.scripts[0].opts.timeout,15000);
 assert.match(describe(s),/CPU package 42°C/);assert.match(describe(s),/Battery: not present/);
});
test('shared cache and forced refresh coalesce; inventory has its own longer lifetime',async()=>{
 const f=fixture();const first=f.monitor.snapshot(),also=f.monitor.snapshot({force:true});assert.equal(first,also);const s=await first;
 assert.equal(await f.monitor.snapshot(),s);assert.equal(f.reads(),1);
 f.advance(3000);const [next,shared]=await Promise.all([f.monitor.snapshot(),f.monitor.snapshot({force:true})]);assert.equal(next,shared);assert.equal(f.reads(),2);assert.match(f.scripts[1].script,/^\$includeInventory=\$false/);assert.equal(next.inventory.model,'Test model');assert.equal(next.sources.inventory.status,'cached');
 f.advance(300001);await f.monitor.snapshot({force:true});assert.match(f.scripts[2].script,/^\$includeInventory=\$true/);
});
test('Windows failures preserve CPU/RAM with null missing readings and bounded errors',async()=>{
 const f=fixture({runner:()=>{const e=new Error('C:\\Users\\private-person\\secret');e.code='APPHUB_PROCESS_TIMEOUT';throw e;}}),s=await f.monitor.snapshot();
 assert.equal(s.cpu.utilizationPercent,37.5);assert.equal(s.memory.commitUsedBytes,null);assert.equal(s.battery.present,null);assert.deepEqual(s.gpus,[]);assert.equal(s.capabilities.gpu,false);assert.equal(s.sources.windows.status,'unavailable');assert.equal(s.errors[0].code,'TIMEOUT');assert.doesNotMatch(JSON.stringify(s),/private-person|secret/);assert.match(describe(s),/Sensors: unavailable/);
 await f.monitor.snapshot({force:true});assert.equal(f.monitor.pending,null);
});
test('malformed responses and unavailable OS never fabricate zero activity or charge',async()=>{
 const f=fixture({runner:async()=>({code:0,out:'not json'}),system:{cpus(){throw Error('unavailable');}}}),s=await f.monitor.snapshot();
 assert.equal(s.cpu.utilizationPercent,null);assert.equal(s.cpu.frequencyMHz,null);assert.equal(s.memory.usedBytes,null);assert.equal(s.battery.chargePercent,null);assert.equal(s.capabilities.cpu,false);assert.equal(s.capabilities.memory,false);assert.deepEqual(s.processes,[]);
});
test('normalization keeps missing versus actual zero distinct and does not expose identifiers',()=>{
 const s=normalizeWindows({data:{computerName:'PRIVATE',inventory:{serial:'SECRET',gpus:[{name:'Test GPU',serial:'SECRET'}]},network:[{name:'Ethernet',MACAddress:'SECRET',IPAddress:'SECRET'}],battery:{present:true,chargePercent:0},processes:[{name:'test',pid:1,commandLine:'SECRET',username:'SECRET'}],gpu:{engines:[{index:0,engine:'0:3D',utilizationPercent:0}],memory:[{index:0,dedicatedUsedBytes:0}]},sensors:[{type:'Temperature',name:'Cold',value:-2,source:'root\\OpenHardwareMonitor'}]}});
 assert.equal(s.gpus[0].utilizationPercent,0);assert.equal(s.gpus[0].dedicatedUsedBytes,0);assert.equal(s.gpus[0].sharedUsedBytes,null);assert.equal(s.battery.chargePercent,0);assert.equal(s.network[0].receiveBytesPerSecond,null);assert.equal(s.sensors[0].value,-2);assert.doesNotMatch(JSON.stringify(s),/SECRET|PRIVATE|MACAddress|IPAddress|commandLine|username|serial/);
});
test('multi-adapter counters never get misidentified by unrelated inventory ordering',()=>{
 const s=normalizeWindows({data:{inventory:{gpus:[{name:'Integrated',dedicatedTotalBytes:100},{name:'Discrete',dedicatedTotalBytes:200}]},gpu:{engines:[{index:0,engine:'0:3D',utilizationPercent:12}],memory:[]}}});
 assert.equal(s.gpus[0].name,'GPU 1 (Windows counter)');assert.equal(s.gpus[0].dedicatedTotalBytes,null);assert.deepEqual(s.inventory.graphics.map(g=>g.name),['Integrated','Discrete']);
});
test('unsupported platforms retain Node CPU/RAM while Windows-only capabilities are explicit',async()=>{
 const f=fixture({platform:'linux',runner:()=>{throw Error('must not call');}}),s=await f.monitor.snapshot();assert.equal(s.sources.windows.status,'unsupported');assert.equal(s.capabilities.cpu,true);assert.equal(s.capabilities.inventory,false);
});
test('lookup evidence records completion time, cache reuse, force, singleflight, and failure retries',async()=>{
 const {Lookups}=require('../src/lookups.cjs');let now=1000,reads=0,release;
 const lookups=new Lookups({now:()=>now,topics:{sample:{title:'sample',ttl:1000,read:async(_arg,_runner,options)=>{reads++;if(reads===1)await new Promise(resolve=>{release=resolve;});if(reads===3)throw Error('C:\\Users\\private\\token');now+=50;return {force:options.force};},describe:d=>String(d.force)}}});
 const pending=lookups.get('sample'),shared=lookups.get('sample','',{force:true});assert.equal(pending,shared);await Promise.resolve();release();const first=await pending;assert.equal(first.collectedAt,1050);assert.equal(first.expiresAt,2050);assert.equal(first.cached,false);assert.equal(first.available,true);
 const cached=await lookups.get('sample');assert.equal(cached.cached,true);assert.equal(cached.collectedAt,1050);assert.equal(reads,1);
 const forced=await lookups.get('sample','',{force:true});assert.equal(forced.data.force,true);assert.equal(reads,2);
 const failed=await lookups.get('sample','',{force:true});assert.equal(failed.available,false);assert.equal(failed.data,null);assert.doesNotMatch(JSON.stringify(failed),/private|token/);const retry=await lookups.get('sample','',{force:true});assert.equal(retry.available,true);assert.equal(reads,4);
});
test('synchronous lookup failures release pending state and do not poison the next read',async()=>{
 const {Lookups}=require('../src/lookups.cjs');let reads=0;const lookups=new Lookups({topics:{x:{title:'x',ttl:100,read:()=>{if(++reads===1)throw Error('denied');return {};},describe:()=>''}}});
 assert.equal((await lookups.get('x')).available,false);assert.equal(lookups.pending.size,0);assert.equal((await lookups.get('x')).available,true);
});
test('catalog transport/source errors are unavailable rather than cached empty matches',async()=>{
 const {TOPICS}=require('../src/lookups.cjs');await assert.rejects(()=>TOPICS.catalog.read('editor',async()=>({code:1,out:'Source failed'})),/catalog is unavailable/);
 const none=await TOPICS.catalog.read('editor',async()=>({code:-1978335212,out:'No applications found'}));assert.deepEqual(none.packages,[]);
});
test('startup action identities keep the complete raw registry value name',()=>{
 const {startupKey}=require('../src/lookups.cjs');assert.equal(startupKey({scope:'user',kind:'run',name:'Display label',rawName:'Exact  raw name'}),'user|run|Exact  raw name');
});
