'use strict';
// Read-only telemetry. All Windows data is projected explicitly: never return CIM objects,
// host/user names, addresses, device identifiers, executable paths or serial numbers.
const os = require('node:os');
const {ps} = require('./platform.cjs');
const array = v => Array.isArray(v) ? v : v == null ? [] : [v];
const signed = v => (typeof v==='number'||typeof v==='string'&&v.trim()!=='') && Number.isFinite(Number(v)) ? Number(v) : null;
const number = v => {const n=signed(v);return n!==null&&n>=0?n:null;};
const percent = v => { const n=number(v); return n===null?null:Math.round(Math.min(100,n)*10)/10; };
const label = v => String(v ?? '').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);
const iso = n => new Date(n).toISOString();
const WINDOWS_SCRIPT = String.raw`
$ErrorActionPreference='Stop'
$result=@{};$errors=@();$stamps=@{}
function Read-Section($name,[scriptblock]$read) {
 try {$result[$name]=& $read;$stamps[$name]=@{capturedAt=[DateTime]::UtcNow.ToString('o');status='available'}}
 catch {$result[$name]=$null;$stamps[$name]=@{capturedAt=[DateTime]::UtcNow.ToString('o');status='unavailable'};$script:errors+=@{source=$name;code='QUERY_UNAVAILABLE';message='Windows did not expose this information.'}}
}
function Cim($class) { @(Get-CimInstance -ClassName $class -OperationTimeoutSec 4 -ErrorAction Stop) }
Read-Section 'memory' { $m=(Cim 'Win32_PerfFormattedData_PerfOS_Memory'|Select-Object -First 1);@{commitUsedBytes=$m.CommittedBytes;commitLimitBytes=$m.CommitLimit} }
Read-Section 'frequency' { @(Cim 'Win32_PerfFormattedData_Counters_ProcessorInformation'|Where-Object {$_.Name -ne '_Total'}|ForEach-Object {@{name=$_.Name;frequencyMHz=$_.ProcessorFrequency;performancePercent=$_.PercentProcessorPerformance}}) }
Read-Section 'gpu' {
 $engines=@(Cim 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine'|ForEach-Object {if($_.Name -match 'phys_(\d+).*eng_(\d+)_engtype_(.+)$'){@{index=[int]$Matches[1];engine=($Matches[2]+':'+$Matches[3]);utilizationPercent=$_.UtilizationPercentage}}})
 $memory=@(Cim 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory'|ForEach-Object {if($_.Name -match 'phys_(\d+)'){@{index=[int]$Matches[1];dedicatedUsedBytes=$_.DedicatedUsage;sharedUsedBytes=$_.SharedUsage}}})
 @{engines=$engines;memory=$memory}
}
Read-Section 'physicalActivity' { @(Cim 'Win32_PerfFormattedData_PerfDisk_PhysicalDisk'|Where-Object {$_.Name -match '^\d+( |$)'}|ForEach-Object {@{index=[int]($_.Name.Split(' ')[0]);readBytesPerSecond=$_.DiskReadBytesPersec;writeBytesPerSecond=$_.DiskWriteBytesPersec;activityPercent=if($null -ne $_.PercentIdleTime){[math]::Max(0,100-[double]$_.PercentIdleTime)}else{$null}}}) }
Read-Section 'logical' {
 $activity=@{};Cim 'Win32_PerfFormattedData_PerfDisk_LogicalDisk'|ForEach-Object {$activity[$_.Name]=$_}
 @(Cim 'Win32_LogicalDisk'|Where-Object {$_.DriveType -eq 3 -and $_.DeviceID -match '^[A-Za-z]:$'}|ForEach-Object {$a=$activity[$_.DeviceID];@{name=$_.DeviceID;totalBytes=$_.Size;freeBytes=$_.FreeSpace;readBytesPerSecond=$a.DiskReadBytesPersec;writeBytesPerSecond=$a.DiskWriteBytesPersec;activityPercent=if($null -ne $a.PercentIdleTime){[math]::Max(0,100-[double]$a.PercentIdleTime)}else{$null}}})
}
Read-Section 'network' {
 $rates=@(Cim 'Win32_PerfFormattedData_Tcpip_NetworkInterface')
 $adapters=@()
 try {$adapters=@(Get-NetAdapter -ErrorAction Stop|Where-Object {$_.Status -ne 'Not Present' -and ($_.HardwareInterface -or $_.Status -eq 'Up')}|ForEach-Object {@{index=$_.ifIndex;description=$_.InterfaceDescription;speed=$_.TransmitLinkSpeed;connected=$_.Status -eq 'Up'}})}catch{}
 if(!$adapters.Count){$adapters=@(Cim 'Win32_NetworkAdapter'|Where-Object {$_.PhysicalAdapter -and $_.NetConnectionStatus -ne $null}|ForEach-Object {@{index=$_.Index;description=$_.Description;speed=$_.Speed;connected=$_.NetConnectionStatus -eq 2}})}
 @($adapters|ForEach-Object {
  $description=$_.description;$normalized=$description.Replace('(','[').Replace(')',']').Replace('#','_').Replace('/','_').Replace('\','_');$r=@($rates|Where-Object {$_.Name -eq $normalized -or $_.Name -eq $description})
  @{index=$_.index;name=$description;linkSpeedBitsPerSecond=$_.speed;status=if($_.connected){'connected'}else{'disconnected'};receiveBytesPerSecond=if($r.Count -eq 1){$r[0].BytesReceivedPersec}else{$null};sendBytesPerSecond=if($r.Count -eq 1){$r[0].BytesSentPersec}else{$null}}
 })
}
Read-Section 'battery' { $b=@(Cim 'Win32_Battery');if($b.Count){$b=$b[0];@{present=$true;chargePercent=$b.EstimatedChargeRemaining;status=$b.BatteryStatus;remainingMinutes=if($b.EstimatedRunTime -lt 6000){$b.EstimatedRunTime}else{$null}}}else{@{present=$false;chargePercent=$null;status=$null;remainingMinutes=$null}} }
Read-Section 'processes' { @(Cim 'Win32_PerfFormattedData_PerfProc_Process'|Where-Object {$_.IDProcess -gt 0 -and $_.Name -ne '_Total'}|Sort-Object WorkingSetPrivate -Descending|Select-Object -First 30|ForEach-Object {@{name=($_.Name -replace '#\d+$','');pid=$_.IDProcess;cpuPercent=([double]$_.PercentProcessorTime/[Environment]::ProcessorCount);memoryBytes=$_.WorkingSetPrivate}}) }
Read-Section 'sensors' {
 $out=@();$provider=$false
 foreach($ns in @('root\LibreHardwareMonitor','root\OpenHardwareMonitor')) {
  try {$s=@(Get-CimInstance -Namespace $ns -ClassName Sensor -OperationTimeoutSec 2 -ErrorAction Stop);$provider=$true;$out+=@($s|Where-Object {$_.SensorType -in @('Temperature','Fan','Power','Voltage','Clock')}|ForEach-Object {@{name=$_.Name;type=$_.SensorType;value=$_.Value;source=$ns}})}catch{}
 }
 if(!$provider){throw 'No optional sensor provider'}; $out
}
if($includeInventory) {
 Read-Section 'inventory' {
  $c=Cim 'Win32_ComputerSystem'|Select-Object -First 1;$b=Cim 'Win32_BIOS'|Select-Object -First 1;$board=Cim 'Win32_BaseBoard'|Select-Object -First 1
  $gpuMemory=@();try{$gpuMemory=@(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Video\*\0000' -ErrorAction SilentlyContinue|Where-Object {$_.'HardwareInformation.qwMemorySize' -and $_.DriverDesc}|ForEach-Object {@{name=$_.DriverDesc;bytes=$_.'HardwareInformation.qwMemorySize'}})}catch{}
  @{manufacturer=$c.Manufacturer;model=$c.Model;biosVersion=$b.SMBIOSBIOSVersion;board=@{manufacturer=$board.Manufacturer;product=$board.Product}
   memoryModules=@(Cim 'Win32_PhysicalMemory'|ForEach-Object {@{capacityBytes=$_.Capacity;speedMHz=$_.ConfiguredClockSpeed;manufacturer=$_.Manufacturer}})
   physical=@(Cim 'Win32_DiskDrive'|ForEach-Object {@{index=$_.Index;name=$_.Model;sizeBytes=$_.Size;health=$_.Status;interface=$_.InterfaceType}})
   gpus=@(Cim 'Win32_VideoController'|ForEach-Object {$name=$_.Name;$m=@($gpuMemory|Where-Object {$_.name -eq $name}|Select-Object -First 1);@{name=$name;dedicatedTotalBytes=if($m.Count){$m[0].bytes}else{$null};driverVersion=$_.DriverVersion;width=$_.CurrentHorizontalResolution;height=$_.CurrentVerticalResolution;refreshRateHz=$_.CurrentRefreshRate}})
  }
 }
}
@{data=$result;sources=$stamps;errors=@($errors)}|ConvertTo-Json -Depth 9 -Compress
`;

function normalizeWindows(raw={}) {
 const r=raw.data||{}, inv=r.inventory||{};
 const activity=new Map(array(r.physicalActivity).map(d=>[number(d.index),d]));
 const counterIds=new Set([...array(r.gpu?.memory).map(g=>number(g.index)),...array(r.gpu?.engines).map(g=>number(g.index))].filter(i=>i!==null));
 const gpuIds=counterIds.size?counterIds:new Set(array(inv.gpus).map((_,i)=>i));
 const gpus=[...gpuIds].filter(i=>i!==null).sort((a,b)=>a-b).map(index=>{
  // Win32_VideoController enumeration order is not DXGI phys_N order. Only associate
  // friendly names/VRAM totals when there is one adapter; otherwise keep inventory separate.
  const g=counterIds.size?(array(inv.gpus).length===1&&counterIds.size===1?array(inv.gpus)[0]:{}):array(inv.gpus)[index]||{};
  const mem=array(r.gpu?.memory).filter(g=>number(g.index)===index);
  const engines=new Map();
  for(const e of array(r.gpu?.engines).filter(g=>number(g.index)===index)) {const n=number(e.utilizationPercent);if(n!==null)engines.set(label(e.engine),(engines.get(label(e.engine))||0)+n);}
  const sum=key=>{const values=mem.map(m=>number(m[key])).filter(n=>n!==null);return values.length?values.reduce((a,b)=>a+b,0):null;};
  return {index,name:label(g.name)||`GPU ${index+1} (Windows counter)`,utilizationPercent:engines.size?percent(Math.max(...engines.values())):null,dedicatedUsedBytes:sum('dedicatedUsedBytes'),dedicatedTotalBytes:number(g.dedicatedTotalBytes),sharedUsedBytes:sum('sharedUsedBytes'),driverVersion:label(g.driverVersion)};
 });
 const disk=d=>({readBytesPerSecond:number(d?.readBytesPerSecond),writeBytesPerSecond:number(d?.writeBytesPerSecond),activityPercent:percent(d?.activityPercent)});
 const b=r.battery||{};
 const unit={Temperature:'°C',Fan:'RPM',Power:'W',Voltage:'V',Clock:'MHz'};
 return {gpus,disks:{physical:array(inv.physical).map(d=>({index:number(d.index),name:label(d.name),sizeBytes:number(d.sizeBytes),health:label(d.health),interface:label(d.interface),...disk(activity.get(number(d.index)))})),logical:array(r.logical).filter(d=>/^[A-Za-z]:$/.test(d.name)).map(d=>({name:d.name,totalBytes:number(d.totalBytes),freeBytes:number(d.freeBytes),...disk(d)}))},
  network:array(r.network).map(n=>({index:number(n.index),name:label(n.name),receiveBytesPerSecond:number(n.receiveBytesPerSecond),sendBytesPerSecond:number(n.sendBytesPerSecond),linkSpeedBitsPerSecond:number(n.linkSpeedBitsPerSecond),status:n.status==='connected'?'connected':'disconnected'})),
  battery:{present:typeof b.present==='boolean'?b.present:null,chargePercent:percent(b.chargePercent),status:number(b.status),remainingMinutes:number(b.remainingMinutes)},
  processes:array(r.processes).slice(0,30).map(p=>({name:label(p.name),pid:number(p.pid),cpuPercent:percent(p.cpuPercent),memoryBytes:number(p.memoryBytes)})),
  inventory:{manufacturer:label(inv.manufacturer),model:label(inv.model),biosVersion:label(inv.biosVersion),board:{manufacturer:label(inv.board?.manufacturer),product:label(inv.board?.product)},memoryModules:array(inv.memoryModules).map(m=>({capacityBytes:number(m.capacityBytes),speedMHz:number(m.speedMHz),manufacturer:label(m.manufacturer)})),graphics:array(inv.gpus).map(g=>({name:label(g.name),dedicatedTotalBytes:number(g.dedicatedTotalBytes),driverVersion:label(g.driverVersion),width:number(g.width),height:number(g.height),refreshRateHz:number(g.refreshRateHz)}))},
  sensors:array(r.sensors).filter(s=>Object.hasOwn(unit,s.type)&&signed(s.value)!==null).map(s=>({name:label(s.name),type:s.type,value:signed(s.value),unit:unit[s.type],hardware:'',source:/LibreHardwareMonitor/.test(s.source)?'LibreHardwareMonitor':'OpenHardwareMonitor'})),
  commitUsedBytes:number(r.memory?.commitUsedBytes),commitLimitBytes:number(r.memory?.commitLimitBytes),frequency:array(r.frequency)};
}

class HardwareMonitor {
 constructor({runner=ps,system=os,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),platform=process.platform,ttl=2500,inventoryTtl=300000,sampleMs=300}={}) {
  Object.assign(this,{runner,system,now,wait,platform,ttl,inventoryTtl,sampleMs});this.cached=null;this.pending=null;this.inventoryCache=null;
 }
 snapshot({force=false}={}) {
  if(this.pending)return this.pending;
  if(!force&&this.cached&&this.now()-this.cached.at<this.ttl)return Promise.resolve(this.cached.value);
  this.pending=this.collect().then(value=>{this.cached={at:this.now(),value};return value;}).finally(()=>{this.pending=null;});return this.pending;
 }
 async collect() {
  const start=this.now(),errors=[],sources={};
  const includeInventory=!this.inventoryCache||start-this.inventoryCache.at>=this.inventoryTtl;
  const windows=this.platform==='win32'?Promise.resolve().then(()=>this.runner(`$includeInventory=$${includeInventory?'true':'false'}\n${WINDOWS_SCRIPT}`,{timeout:15000})).then(response=>{
   if(response.code!==0)throw new Error('Windows query failed');
   const parsed=JSON.parse(response.out.replace(/^\uFEFF/,''));if(!parsed||typeof parsed.data!=='object')throw new Error('Invalid telemetry');return parsed;
  }).catch(e=>{errors.push({source:'windows',code:e?.code==='APPHUB_PROCESS_TIMEOUT'?'TIMEOUT':'QUERY_UNAVAILABLE',message:'Windows hardware information is unavailable for this sample.'});return {data:{},sources:{}};}):Promise.resolve({data:{},sources:{}});
  let before=[],after=[],totalBytes=null,freeBytes=null;
  try {before=this.system.cpus();await this.wait(this.sampleMs);after=this.system.cpus();totalBytes=number(this.system.totalmem());freeBytes=number(this.system.freemem());sources.os={capturedAt:iso(this.now()),status:'available'};}
  catch {errors.push({source:'os',code:'QUERY_UNAVAILABLE',message:'CPU or memory sampling is unavailable.'});sources.os={capturedAt:iso(this.now()),status:'unavailable'};}
  const raw=await windows;raw.data=raw.data||{};
  if(raw.data.inventory){this.inventoryCache={at:this.now(),data:raw.data.inventory,source:raw.sources?.inventory};}
  if(!raw.data.inventory&&this.inventoryCache){raw.data.inventory=this.inventoryCache.data;raw.sources={...raw.sources,inventory:{...this.inventoryCache.source,status:'cached'}};}
  const w=normalizeWindows(raw),cores=after.map((c,index)=>{
   const previous=before[index];let utilizationPercent=null;
   if(previous){const total=Object.values(c.times).reduce((a,b)=>a+b,0)-Object.values(previous.times).reduce((a,b)=>a+b,0);const idle=c.times.idle-previous.times.idle;if(total>0&&idle>=0)utilizationPercent=percent((1-idle/total)*100);}
   const f=w.frequency.find(f=>f.name===`0,${index}`||f.name===String(index));const reported=number(f?.frequencyMHz)??number(c.speed),frequencyMHz=reported>0?reported:null;
   // ProcessorFrequency is nominal on some systems; performance scales it when exposed.
   return {index,utilizationPercent,frequencyMHz:frequencyMHz!==null&&number(f?.performancePercent)!==null?Math.round(frequencyMHz*number(f.performancePercent)/100):frequencyMHz};
  });
  const loads=cores.map(c=>c.utilizationPercent).filter(n=>n!==null),freqs=cores.map(c=>c.frequencyMHz).filter(n=>n!==null&&n>0);
  Object.assign(sources,raw.sources||{});for(const name of ['inventory','sensors'])sources[name]??={capturedAt:iso(this.now()),status:this.platform==='win32'?'unavailable':'unsupported'};sources.windows={capturedAt:iso(this.now()),status:this.platform!=='win32'?'unsupported':errors.some(e=>e.source==='windows')?'unavailable':raw.errors?.length?'partial':'available'};
  const capabilities={cpu:loads.length>0,memory:totalBytes!==null,gpu:w.gpus.some(g=>g.utilizationPercent!==null||g.dedicatedUsedBytes!==null),disks:w.disks.logical.length>0,network:w.network.length>0,battery:w.battery.present!==null,processes:w.processes.length>0,inventory:!!raw.data.inventory,sensors:w.sensors.length>0};
  errors.push(...array(raw.errors).map(e=>({source:label(e.source),code:'QUERY_UNAVAILABLE',message:'This provider did not expose information for this sample.'})));
  return {schemaVersion:1,capturedAt:iso(this.now()),sampleDurationMs:Math.max(0,this.now()-start),sources,capabilities,errors,
   cpu:{model:label(after[0]?.model),logicalCores:cores.length,utilizationPercent:loads.length?percent(loads.reduce((a,b)=>a+b,0)/loads.length):null,frequencyMHz:freqs.length?Math.round(freqs.reduce((a,b)=>a+b,0)/freqs.length):null,frequencySource:w.frequency.length?'Windows processor performance counters':'OS reported clock',cores},
   memory:{totalBytes,usedBytes:totalBytes!==null&&freeBytes!==null?Math.max(0,totalBytes-freeBytes):null,freeBytes,commitUsedBytes:w.commitUsedBytes,commitLimitBytes:w.commitLimitBytes},gpus:w.gpus,disks:w.disks,network:w.network,battery:w.battery,processes:w.processes,inventory:w.inventory,sensors:w.sensors};
 }
 describe(snapshot){return describe(snapshot);}
}
function describe(s) {
 const n=(v,unit='')=>v===null||v===undefined?'unavailable':`${Math.round(v*10)/10}${unit}`;
 const gib=v=>v==null?'unavailable':`${Math.round(v/1073741824*10)/10} GiB`;
 return [`Hardware monitor snapshot: ${s.capturedAt}.`,
  `CPU: ${s.cpu.model||'unknown'}, ${s.cpu.logicalCores} logical cores; use ${n(s.cpu.utilizationPercent,'%')}; clock ${n(s.cpu.frequencyMHz,' MHz')} (${s.cpu.frequencySource}).`,
  `RAM: ${gib(s.memory.usedBytes)} used of ${gib(s.memory.totalBytes)}; free ${gib(s.memory.freeBytes)}. Commit: ${gib(s.memory.commitUsedBytes)} of ${gib(s.memory.commitLimitBytes)}.`,
  ...s.gpus.map(g=>`${g.name}: use ${n(g.utilizationPercent,'%')}, dedicated VRAM ${gib(g.dedicatedUsedBytes)} of ${gib(g.dedicatedTotalBytes)}.`),
  ...s.disks.logical.map(d=>`${d.name} ${gib(d.freeBytes)} free of ${gib(d.totalBytes)}; activity ${n(d.activityPercent,'%')}; read ${n(d.readBytesPerSecond,' B/s')}, write ${n(d.writeBytesPerSecond,' B/s')}.`),
  ...s.network.map(a=>`${a.name}: ${a.status}; receive ${n(a.receiveBytesPerSecond,' B/s')}, send ${n(a.sendBytesPerSecond,' B/s')}.`),
  `Battery: ${s.battery.present===false?'not present':s.battery.present===true?n(s.battery.chargePercent,'%'):'unavailable'}.`,
  `Sensors: ${s.sensors.length?s.sensors.slice(0,16).map(x=>`${x.name} ${n(x.value,x.unit)}`).join('; '):'unavailable; an already-running LibreHardwareMonitor or OpenHardwareMonitor WMI provider is required for temperatures and fans.'}`,
  `Top memory processes: ${s.processes.slice(0,8).map(p=>`${p.name} ${gib(p.memoryBytes)}, CPU ${n(p.cpuPercent,'%')}`).join('; ')||'unavailable'}.`,
  `Hardware: ${[s.inventory.manufacturer,s.inventory.model].filter(Boolean).join(' ')||'unavailable'}; BIOS ${s.inventory.biosVersion||'unavailable'}; board ${[s.inventory.board.manufacturer,s.inventory.board.product].filter(Boolean).join(' ')||'unavailable'}.`,
  ...s.inventory.graphics.map(g=>`Graphics inventory: ${g.name}; dedicated VRAM ${gib(g.dedicatedTotalBytes)}; driver ${g.driverVersion||'unavailable'}${g.width&&g.height?`; display ${g.width}×${g.height} at ${n(g.refreshRateHz,' Hz')}`:''}.`),
  ...s.disks.physical.map(d=>`${d.name}: ${gib(d.sizeBytes)}, Windows status ${d.health||'unavailable'}; activity ${n(d.activityPercent,'%')}.`),
  ...(s.errors.length?[`Unavailable providers: ${s.errors.map(e=>e.source).join(', ')}. Unavailable values are not zero readings.`]:[])].join('\n');
}
const hardware=new HardwareMonitor();
module.exports={hardware,HardwareMonitor,describe,normalizeWindows};
