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
 const {totalBytes,freeBytes,usedBytes,commitUsedBytes,commitLimitBytes}=s.memory;assert.deepEqual({totalBytes,freeBytes,usedBytes,commitUsedBytes,commitLimitBytes},{totalBytes:8192,freeBytes:3072,usedBytes:5120,commitUsedBytes:2048,commitLimitBytes:4096});assert.equal(s.memory.cachedBytes,null);
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

test('the live view answers at once with fresh CPU and memory and refreshes Windows counters in the background',async()=>{
 const f=fixture({liveMs:2500}),first=await f.monitor.live();assert.equal(f.reads(),1);assert.equal(first.cpu.utilizationPercent,37.5);
 f.advance(1000);const second=await f.monitor.live();assert.equal(f.reads(),1);assert.equal(second.gpus[0].utilizationPercent,35);assert.equal(second.memory.totalBytes,8192);assert.equal(second.cpu.cores.length,2);assert.notEqual(second.capturedAt,first.capturedAt);assert.equal(second.countersCapturedAt,first.capturedAt);
 f.advance(2000);await f.monitor.live();assert.equal(f.reads(),2);await f.monitor.pending;assert.equal(f.monitor.pending,null);
});
test('a session answers readings and a failed session falls back to a one-shot query',async()=>{
 const asked=[];const ok=fixture({session:{request:async full=>{asked.push(full);return {code:0,out:JSON.stringify({data:{battery:{present:false}},sources:{},errors:[]})};}}}),s=await ok.monitor.snapshot();
 assert.deepEqual(asked,[true]);assert.equal(ok.reads(),0);assert.equal(s.battery.present,false);
 const broken=fixture({session:{request:async()=>{throw new Error('closed');}}}),t=await broken.monitor.snapshot();assert.equal(broken.reads(),1);assert.equal(t.gpus[0].name,'Test GPU');
 const {PowerShellSession}=require('../src/hardware.cjs'),{EventEmitter}=require('node:events');const child=Object.assign(new EventEmitter(),{stdout:new EventEmitter(),stdin:Object.assign(new EventEmitter(),{lines:[],write(x){this.lines.push(x);},end(){}}),kill(){}});
 const session=new PowerShellSession({start:()=>child,idleMs:5}),reply=session.request(false);await assert.rejects(session.request(true),/busy/);child.stdout.emit('data','{"data"');child.stdout.emit('data',':{}}\n');
 assert.deepEqual(await reply,{code:0,out:'{"data":{}}'});assert.deepEqual(child.stdin.lines,['live\n']);const lost=session.request(true);child.emit('exit');await assert.rejects(lost,/failed/);session.close();
});
test('the description gives the chat model what the hardware is, how it is used and how to judge it',()=>{
 const s=normalizeWindows({data:{memory:{commitUsedBytes:30*2**30,commitLimitBytes:37*2**30,cachedBytes:14*2**30,hardFaultsPerSecond:3,pageFileAllocatedBytes:6*2**30,pageFileUsedBytes:2*2**30},activity:{processes:450,threads:5900,queueLength:0,uptimeSeconds:7200},
  gpu:{engines:[{index:0,engine:'0:3D',utilizationPercent:26}],memory:[{index:0,dedicatedUsedBytes:0,sharedUsedBytes:2*2**30}]},wifi:{radio:'802.11ax',band:'5 GHz',channel:'149',signalPercent:'94',ssid:'PRIVATE'},network:[{index:1,name:'Test Wi-Fi 7',media:'Native 802.11',status:'connected',receiveBytesPerSecond:2048,sendBytesPerSecond:1024,linkSpeedBitsPerSecond:1201000000}],
  battery:{present:true,chargePercent:79,status:2,pluggedIn:true,chargeRateMilliwatts:21500},processes:[{name:'browser',count:23,cpuPercent:4.2,memoryBytes:3*2**30},{name:'editor',count:1,cpuPercent:0,memoryBytes:2**29}],
  inventory:{manufacturer:'Vendor',model:'Book 14',chassisTypes:[10],os:{name:'Windows 11 Home',build:'26300',architecture:'64-bit'},processor:{name:'Test CPU',cores:8,threads:8,maxClockMHz:2200,l3CacheKB:12288},memoryModules:Array(8).fill({capacityBytes:4*2**30,speedMHz:8533,type:35}),memorySlots:8,
   physical:[{index:0,name:'DISK',sizeBytes:1e12,health:'OK',interface:'SCSI'}],physicalModern:[{index:0,name:'Fast SSD',media:'SSD',bus:'NVMe',health:'Healthy',wearPercent:2,temperatureC:41}],displays:[{name:'',widthCm:30,heightCm:19}],battery:{designMilliwattHours:75000,fullMilliwattHours:71500,cycles:32},
   gpus:[{name:'Intel(R) Arc(TM) 140V GPU (16GB)',dac:'Internal',dedicatedTotalBytes:18*2**30,driverVersion:'1.2',width:2880,height:1800,refreshRateHz:120}]}}});
 assert.equal(s.gpus[0].sharesSystemMemory,true);assert.equal(s.disks.physical[0].kind,'NVMe SSD');assert.equal(s.network[0].kind,'Wi-Fi');assert.equal(s.network[0].wifi.signalPercent,94);assert.equal(s.battery.healthPercent,95);assert.equal(s.inventory.formFactor,'Laptop');assert.equal(s.inventory.displays[0].diagonalInches,14);assert.equal(s.processes[0].count,23);
 const text=describe({schemaVersion:1,capturedAt:'2026-10-12T10:00:00.000Z',errors:[],sensors:s.sensors,cpu:{model:'Test CPU',logicalCores:8,physicalCores:8,maxClockMHz:2200,l3CacheKB:12288,utilizationPercent:12.5,frequencyMHz:2500,cores:[{utilizationPercent:30},{utilizationPercent:5}],...s.activity},memory:{totalBytes:32*2**30,usedBytes:17*2**30,freeBytes:15*2**30,...s.memory},gpus:s.gpus,disks:s.disks,network:s.network,battery:s.battery,processes:s.processes,inventory:s.inventory});
 for(const fact of [/Vendor Book 14, Laptop/,/8 cores \/ 8 threads; base clock 2\.2 GHz/,/busiest thread 30%/,/LPDDR5; modules 8 × 4 GB at 8533 MHz \(soldered, not upgradeable\)/,/committed 30 GB of 37 GB \(81%\)/,/integrated, shares system memory; use 26% \(3D 26%\); shared memory in use 2 GB/,/Display: built-in panel, 14 inch/,/Fast SSD: NVMe SSD, 931\.3 GB; health Healthy; 2% of rated life used; 41°C/,/802\.11ax, 5 GHz, channel 149, signal 94%/,/charging at 21\.5 W; holds 71\.5 Wh of its original 75 Wh \(95% health\); 32 charge cycles/,/browser 3 GB \(23 processes\)/,/How to read these/])assert.match(text,fact);
 assert.doesNotMatch(JSON.stringify(s)+text,/PRIVATE/);assert.ok(text.length<4000);
});

test('a glance reuses Windows counters for longer than the live view does',async()=>{
 const f=fixture({liveMs:2500});await f.monitor.live();f.advance(5000);const glance=await f.monitor.live(15000);assert.equal(f.reads(),1);assert.equal(glance.memory.totalBytes,8192);
 f.advance(11000);await f.monitor.live(15000);assert.equal(f.reads(),2);await f.monitor.pending;
});
