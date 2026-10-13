'use strict';
// Read-only telemetry. All Windows data is projected explicitly: never return CIM objects,
// host/user names, addresses, network names, device identifiers, executable paths or serial numbers.
//
// Three tiers keep the monitor from loading the PC it measures:
//  - CPU and memory come from Node on every call and cost nothing.
//  - Live Windows counters come from one long-lived PowerShell session, asked again only every few seconds.
//  - The inventory (what the hardware is) is read once and reused for five minutes.
const os = require('node:os');
const {spawn} = require('node:child_process');
const {ps} = require('./platform.cjs');
const array = v => Array.isArray(v) ? v : v == null ? [] : [v];
const signed = v => (typeof v==='number'||typeof v==='string'&&v.trim()!=='') && Number.isFinite(Number(v)) ? Number(v) : null;
const number = v => {const n=signed(v);return n!==null&&n>=0?n:null;};
const positive = v => {const n=number(v);return n?n:null;};
const percent = v => { const n=number(v); return n===null?null:Math.round(Math.min(100,n)*10)/10; };
const label = (v,max=100) => String(v ?? '').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const iso = n => new Date(n).toISOString();
const day = v => {const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString().slice(0,10):'';};
const COLLECT = String.raw`
$ErrorActionPreference='Stop'
function Cim($class,$ns='root\cimv2') { @(Get-CimInstance -Namespace $ns -ClassName $class -OperationTimeoutSec 4 -ErrorAction Stop) }
function Quiet([scriptblock]$read) { try { & $read } catch { $null } }
function Collect($includeInventory) {
 $result=@{};$stamps=@{};$script:errors=@()
 function Read-Section($name,[scriptblock]$read) {
  try {$result[$name]=& $read;$stamps[$name]=@{capturedAt=[DateTime]::UtcNow.ToString('o');status='available'}}
  catch {$result[$name]=$null;$stamps[$name]=@{capturedAt=[DateTime]::UtcNow.ToString('o');status='unavailable'};$script:errors+=@{source=$name;code='QUERY_UNAVAILABLE';message='Windows did not expose this information.'}}
 }
 Read-Section 'memory' {
  $m=(Cim 'Win32_PerfFormattedData_PerfOS_Memory'|Select-Object -First 1)
  $page=Quiet {@(Cim 'Win32_PageFileUsage')}
  @{commitUsedBytes=$m.CommittedBytes;commitLimitBytes=$m.CommitLimit;availableBytes=$m.AvailableBytes;cachedBytes=([double]$m.CacheBytes+[double]$m.StandbyCacheNormalPriorityBytes+[double]$m.StandbyCacheReserveBytes+[double]$m.StandbyCacheCoreBytes+[double]$m.ModifiedPageListBytes);pagedPoolBytes=$m.PoolPagedBytes;nonPagedPoolBytes=$m.PoolNonpagedBytes;hardFaultsPerSecond=$m.PagesInputPersec
   pageFileAllocatedBytes=if($page){[double]($page|Measure-Object AllocatedBaseSize -Sum).Sum*1MB}else{$null};pageFileUsedBytes=if($page){[double]($page|Measure-Object CurrentUsage -Sum).Sum*1MB}else{$null}}
 }
 Read-Section 'frequency' { @(Cim 'Win32_PerfFormattedData_Counters_ProcessorInformation'|Where-Object {$_.Name -notmatch '_Total'}|ForEach-Object {@{name=$_.Name;frequencyMHz=$_.ProcessorFrequency;performancePercent=$_.PercentProcessorPerformance}}) }
 Read-Section 'activity' { $s=(Cim 'Win32_PerfFormattedData_PerfOS_System'|Select-Object -First 1);@{processes=$s.Processes;threads=$s.Threads;queueLength=$s.ProcessorQueueLength;uptimeSeconds=$s.SystemUpTime} }
 Read-Section 'gpu' {
  $engines=@(Cim 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine'|ForEach-Object {if($_.Name -match 'phys_(\d+).*eng_(\d+)_engtype_(.+)$'){@{index=[int]$Matches[1];engine=($Matches[2]+':'+$Matches[3]);utilizationPercent=$_.UtilizationPercentage}}})
  $memory=@(Cim 'Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory'|ForEach-Object {if($_.Name -match 'phys_(\d+)'){@{index=[int]$Matches[1];dedicatedUsedBytes=$_.DedicatedUsage;sharedUsedBytes=$_.SharedUsage}}})
  @{engines=$engines;memory=$memory}
 }
 Read-Section 'physicalActivity' { @(Cim 'Win32_PerfFormattedData_PerfDisk_PhysicalDisk'|Where-Object {$_.Name -match '^\d+( |$)'}|ForEach-Object {@{index=[int]($_.Name.Split(' ')[0]);readBytesPerSecond=$_.DiskReadBytesPersec;writeBytesPerSecond=$_.DiskWriteBytesPersec;queueLength=$_.CurrentDiskQueueLength;activityPercent=if($null -ne $_.PercentIdleTime){[math]::Max(0,100-[double]$_.PercentIdleTime)}else{$null}}}) }
 Read-Section 'logical' {
  $activity=@{};Cim 'Win32_PerfFormattedData_PerfDisk_LogicalDisk'|ForEach-Object {$activity[$_.Name]=$_}
  @(Cim 'Win32_LogicalDisk'|Where-Object {$_.DriveType -eq 3 -and $_.DeviceID -match '^[A-Za-z]:$'}|ForEach-Object {$a=$activity[$_.DeviceID];@{name=$_.DeviceID;fileSystem=$_.FileSystem;totalBytes=$_.Size;freeBytes=$_.FreeSpace;readBytesPerSecond=$a.DiskReadBytesPersec;writeBytesPerSecond=$a.DiskWriteBytesPersec;activityPercent=if($null -ne $a.PercentIdleTime){[math]::Max(0,100-[double]$a.PercentIdleTime)}else{$null}}})
 }
 Read-Section 'network' {
  $rates=@(Cim 'Win32_PerfFormattedData_Tcpip_NetworkInterface')
  $adapters=@()
  if($script:adapters -and ([DateTime]::UtcNow-$script:adaptersAt).TotalSeconds -lt 30){$adapters=$script:adapters}else{
  try {$adapters=@(Get-NetAdapter -ErrorAction Stop|Where-Object {$_.Status -ne 'Not Present' -and ($_.HardwareInterface -or $_.Status -eq 'Up')}|ForEach-Object {@{index=$_.ifIndex;description=$_.InterfaceDescription;speed=$_.TransmitLinkSpeed;connected=$_.Status -eq 'Up';media=[string]$_.PhysicalMediaType;virtual=[bool]$_.Virtual}})}catch{}
  if($adapters.Count){$script:adapters=$adapters;$script:adaptersAt=[DateTime]::UtcNow}}
  if(!$adapters.Count){$adapters=@(Cim 'Win32_NetworkAdapter'|Where-Object {$_.PhysicalAdapter -and $_.NetConnectionStatus -ne $null}|ForEach-Object {@{index=$_.Index;description=$_.Description;speed=$_.Speed;connected=$_.NetConnectionStatus -eq 2;media='';virtual=$false}})}
  @($adapters|ForEach-Object {
   $description=$_.description;$normalized=$description.Replace('(','[').Replace(')',']').Replace('#','_').Replace('/','_').Replace('\','_');$r=@($rates|Where-Object {$_.Name -eq $normalized -or $_.Name -eq $description})
   @{index=$_.index;name=$description;media=$_.media;virtual=$_.virtual;linkSpeedBitsPerSecond=$_.speed;status=if($_.connected){'connected'}else{'disconnected'};receiveBytesPerSecond=if($r.Count -eq 1){$r[0].BytesReceivedPersec}else{$null};sendBytesPerSecond=if($r.Count -eq 1){$r[0].BytesSentPersec}else{$null}}
  })
 }
 Read-Section 'wifi' {
  # Only radio facts are kept; the network name and access point address are never read into the result.
  $text=(& netsh.exe wlan show interfaces 2>$null) -join [char]10;if(!$text){throw 'none'}
  $pick={param($pattern) if($text -match $pattern){$Matches[1].Trim()}else{$null}}
  @{radio=& $pick '(?m)^\s*Radio type\s*:\s*(.+)$';band=& $pick '(?m)^\s*Band\s*:\s*(.+)$';channel=& $pick '(?m)^\s*Channel\s*:\s*(\d+)';signalPercent=& $pick '(?m)^\s*Signal\s*:\s*(\d+)%';receiveMbps=& $pick '(?m)^\s*Receive rate \(Mbps\)\s*:\s*([\d.]+)';transmitMbps=& $pick '(?m)^\s*Transmit rate \(Mbps\)\s*:\s*([\d.]+)';security=& $pick '(?m)^\s*Authentication\s*:\s*(.+)$'}
 }
 Read-Section 'battery' {
  $b=@(Cim 'Win32_Battery');if(!$b.Count){return @{present=$false}}
  $b=$b[0];$live=Quiet {Cim 'BatteryStatus' 'root\wmi'|Select-Object -First 1}
  @{present=$true;chargePercent=$b.EstimatedChargeRemaining;status=$b.BatteryStatus;remainingMinutes=if($b.EstimatedRunTime -lt 6000){$b.EstimatedRunTime}else{$null}
   chargeRateMilliwatts=$live.ChargeRate;dischargeRateMilliwatts=$live.DischargeRate;voltageMillivolts=$live.Voltage;remainingMilliwattHours=$live.RemainingCapacity;pluggedIn=$live.PowerOnline}
 }
 Read-Section 'processes' {
  # Processor time is compared with the previous reading, which is far cheaper than asking Windows for per-process counters.
  $cores=[Environment]::ProcessorCount;$read={@(Get-Process -ErrorAction SilentlyContinue|Where-Object {$_.Id -gt 0})}
  $times={param($list) $t=@{};foreach($x in $list){try{$t[$x.Id]=$x.TotalProcessorTime.TotalSeconds}catch{}};$t}
  if(!$script:cpuTimes){$script:cpuTimes=& $times (& $read);$script:cpuAt=[DateTime]::UtcNow;Start-Sleep -Milliseconds 400}
  $list=& $read;$now=[DateTime]::UtcNow;$next=& $times $list;$elapsed=[math]::Max(0.1,($now-$script:cpuAt).TotalSeconds);$before=$script:cpuTimes
  $rows=@($list|ForEach-Object {$used=0;if($next.ContainsKey($_.Id) -and $before.ContainsKey($_.Id)){$used=[math]::Max(0,$next[$_.Id]-$before[$_.Id])};[pscustomobject]@{n=$_.ProcessName;m=$_.WorkingSet64;c=$used}})
  $script:cpuTimes=$next;$script:cpuAt=$now
  @($rows|Group-Object n|ForEach-Object {@{name=$_.Name;count=$_.Count;cpuPercent=([double]($_.Group|Measure-Object c -Sum).Sum/$elapsed/$cores*100);memoryBytes=[double]($_.Group|Measure-Object m -Sum).Sum}}|Sort-Object {$_.memoryBytes} -Descending|Select-Object -First 80)
 }
 Read-Section 'sensors' {
  $out=@()
  foreach($ns in @('root\LibreHardwareMonitor','root\OpenHardwareMonitor')) {
   try {$s=@(Get-CimInstance -Namespace $ns -ClassName Sensor -OperationTimeoutSec 2 -ErrorAction Stop);$out+=@($s|Where-Object {$_.SensorType -in @('Temperature','Fan','Power','Voltage','Clock')}|ForEach-Object {@{name=$_.Name;type=$_.SensorType;value=$_.Value;source=$ns}})}catch{}
  }
  # Windows' own thermal zones need no extra software, but only some PCs expose them.
  try {$out+=@(Cim 'Win32_PerfFormattedData_Counters_ThermalZoneInformation'|Where-Object {$_.Temperature -gt 273}|ForEach-Object {@{name=($_.Name -replace '^\\_TZ\.','' -replace '^.*\\','');type='Temperature';value=([double]$_.Temperature-273.15);source='Windows thermal zone'}})}catch{}
  if(!$out.Count){throw 'No sensor provider'}; $out
 }
 if($includeInventory) {
  Read-Section 'inventory' {
   $c=Cim 'Win32_ComputerSystem'|Select-Object -First 1;$b=Cim 'Win32_BIOS'|Select-Object -First 1;$board=Cim 'Win32_BaseBoard'|Select-Object -First 1
   $o=Cim 'Win32_OperatingSystem'|Select-Object -First 1;$p=Cim 'Win32_Processor'|Select-Object -First 1
   $chassis=Quiet {@((Cim 'Win32_SystemEnclosure'|Select-Object -First 1).ChassisTypes)}
   $gpuMemory=@();try{$gpuMemory=@(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Video\*\0000' -ErrorAction SilentlyContinue|Where-Object {$_.'HardwareInformation.qwMemorySize' -and $_.DriverDesc}|ForEach-Object {@{name=$_.DriverDesc;bytes=$_.'HardwareInformation.qwMemorySize'}})}catch{}
   $slots=Quiet {Cim 'Win32_PhysicalMemoryArray'|Select-Object -First 1}
   $modern=Quiet {@(Get-PhysicalDisk -ErrorAction Stop|ForEach-Object {$d=$_;$r=Quiet {$d|Get-StorageReliabilityCounter -ErrorAction Stop};@{index=[int]$d.DeviceId;name=$d.FriendlyName;media=[string]$d.MediaType;bus=[string]$d.BusType;sizeBytes=$d.Size;health=[string]$d.HealthStatus;spindleRpm=$d.SpindleSpeed;temperatureC=$r.Temperature;wearPercent=$r.Wear;powerOnHours=$r.PowerOnHours;readErrors=$r.ReadErrorsTotal}})}
   $names=@{};Quiet {Cim 'WmiMonitorID' 'root\wmi'|ForEach-Object {$names[$_.InstanceName]=(-join ($_.UserFriendlyName|Where-Object {$_ -gt 0}|ForEach-Object {[char]$_}))}}|Out-Null
   $displays=Quiet {@(Cim 'WmiMonitorBasicDisplayParams' 'root\wmi'|ForEach-Object {@{name=$names[$_.InstanceName];widthCm=$_.MaxHorizontalImageSize;heightCm=$_.MaxVerticalImageSize}})}
   $plan=Quiet {$t=(& powercfg.exe /getactivescheme 2>$null) -join ' ';if($t -match '\(([^)]+)\)\s*$'){$Matches[1]}}
   $secure=Quiet {[bool](Confirm-SecureBootUEFI -ErrorAction Stop)}
   $static=Quiet {Cim 'BatteryStaticData' 'root\wmi'|Select-Object -First 1};$full=Quiet {Cim 'BatteryFullChargedCapacity' 'root\wmi'|Select-Object -First 1};$cycles=Quiet {Cim 'BatteryCycleCount' 'root\wmi'|Select-Object -First 1};$wb=Quiet {Cim 'Win32_Battery'|Select-Object -First 1}
   @{manufacturer=$c.Manufacturer;model=$c.Model;systemType=$c.SystemType;chassisTypes=$chassis;biosVersion=$b.SMBIOSBIOSVersion;biosDate=if($b.ReleaseDate){$b.ReleaseDate.ToString('o')}else{$null};board=@{manufacturer=$board.Manufacturer;product=$board.Product}
    os=@{name=$o.Caption;version=$o.Version;build=$o.BuildNumber;architecture=$o.OSArchitecture;installed=if($o.InstallDate){$o.InstallDate.ToString('o')}else{$null}}
    processor=@{name=$p.Name;manufacturer=$p.Manufacturer;cores=$p.NumberOfCores;threads=$p.NumberOfLogicalProcessors;maxClockMHz=$p.MaxClockSpeed;l2CacheKB=$p.L2CacheSize;l3CacheKB=$p.L3CacheSize;socket=$p.SocketDesignation;virtualization=$p.VirtualizationFirmwareEnabled;architecture=$p.Architecture}
    memoryModules=@(Cim 'Win32_PhysicalMemory'|ForEach-Object {@{capacityBytes=$_.Capacity;speedMHz=$_.ConfiguredClockSpeed;manufacturer=$_.Manufacturer;type=$_.SMBIOSMemoryType;formFactor=$_.FormFactor}})
    memorySlots=$slots.MemoryDevices;memoryMaxKB=$slots.MaxCapacityEx
    physical=@(Cim 'Win32_DiskDrive'|ForEach-Object {@{index=$_.Index;name=$_.Model;sizeBytes=$_.Size;health=$_.Status;interface=$_.InterfaceType}})
    physicalModern=$modern;displays=$displays;powerPlan=$plan;secureBoot=$secure
    battery=@{designMilliwattHours=$static.DesignedCapacity;fullMilliwattHours=$full.FullChargedCapacity;cycles=$cycles.CycleCount;chemistry=$wb.Chemistry}
    gpus=@(Cim 'Win32_VideoController'|ForEach-Object {$name=$_.Name;$m=@($gpuMemory|Where-Object {$_.name -eq $name}|Select-Object -First 1);@{name=$name;vendor=$_.AdapterCompatibility;dac=$_.AdapterDACType;dedicatedTotalBytes=if($m.Count){$m[0].bytes}else{$null};driverVersion=$_.DriverVersion;driverDate=if($_.DriverDate){$_.DriverDate.ToString('o')}else{$null};width=$_.CurrentHorizontalResolution;height=$_.CurrentVerticalResolution;refreshRateHz=$_.CurrentRefreshRate;bitsPerPixel=$_.CurrentBitsPerPixel}})
   }
  }
 }
 @{data=$result;sources=$stamps;errors=@($script:errors)}|ConvertTo-Json -Depth 9 -Compress
}
`;
// The collector is too long for a Windows command line once encoded, so it travels in the child's environment.
const LOAD = 'Invoke-Expression $env:APPHUB_HARDWARE_SCRIPT\n', scriptEnv = () => ({...process.env, APPHUB_HARDWARE_SCRIPT: COLLECT});
// One-shot form, used when no session is available: the first line says whether to include the inventory.
const WINDOWS_SCRIPT = LOAD + 'Collect $includeInventory\n';
// Session form: answers one line of JSON for every line it is sent, until its input closes.
const SESSION_SCRIPT = LOAD + String.raw`
while($true){$line=[Console]::In.ReadLine();if($null -eq $line){break}
 try{$json=Collect ($line -eq 'full')}catch{$json='{"data":{},"sources":{},"errors":[{"source":"windows"}]}'}
 [Console]::Out.WriteLine($json);[Console]::Out.Flush()}
`;

// Starting PowerShell and loading the counter classes is most of the cost of a reading, so the live view keeps one process open
// and it exits by itself shortly after the last request.
class PowerShellSession {
 constructor({script=SESSION_SCRIPT,idleMs=20000,timeoutMs=20000,start=()=>spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from("[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); $ProgressPreference='SilentlyContinue'; "+script,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','pipe','ignore'],env:scriptEnv()})}={}) {
  Object.assign(this,{idleMs,timeoutMs,start});this.child=null;this.buffer='';this.waiting=null;this.idle=null;
 }
 open() {
  if(this.child)return;
  const child=this.child=this.start();this.buffer='';
  child.stdout.on('data',d=>{if(this.child!==child)return;this.buffer+=d.toString();let at;while((at=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,at).trim();this.buffer=this.buffer.slice(at+1);if(line)this.settle(null,line);}});
  const gone=()=>{if(this.child===child){this.child=null;this.settle(new Error('Windows query failed'));}};
  child.on('error',gone);child.on('exit',gone);child.stdin.on('error',()=>{});
 }
 settle(error,line) {const w=this.waiting;if(!w)return;this.waiting=null;clearTimeout(w.timer);if(error)w.reject(error);else w.resolve({code:0,out:line});}
 // One request at a time; the monitor already coalesces callers.
 request(full) {
  if(this.waiting)return Promise.reject(new Error('Windows query busy'));
  clearTimeout(this.idle);
  return new Promise((resolve,reject)=>{
   try{this.open();}catch(e){reject(e);return;}
   const timer=setTimeout(()=>{const e=new Error('Windows query timed out');e.code='APPHUB_PROCESS_TIMEOUT';this.close();this.settle(e);},this.timeoutMs);
   this.waiting={resolve,reject,timer};
   try{this.child.stdin.write((full?'full':'live')+'\n');}catch(e){this.settle(e);}
  }).finally(()=>{clearTimeout(this.idle);this.idle=setTimeout(()=>this.close(),this.idleMs);this.idle.unref?.();});
 }
 close() {clearTimeout(this.idle);const child=this.child;this.child=null;if(child){try{child.stdin.end();}catch{}setTimeout(()=>{try{child.kill();}catch{}},1500).unref?.();}}
}

const MEMORY_TYPES={20:'DDR',21:'DDR2',24:'DDR3',26:'DDR4',27:'LPDDR',28:'LPDDR2',29:'LPDDR3',30:'LPDDR4',34:'DDR5',35:'LPDDR5'};
const FORM_FACTORS={8:'DIMM',12:'SODIMM',13:'SODIMM'};
const PORTABLE=new Set([8,9,10,11,12,14,18,21,30,31,32]);
const BATTERY_CHEMISTRY={3:'lead acid',4:'nickel cadmium',5:'nickel metal hydride',6:'lithium-ion',8:'lithium polymer'};
function normalizeWindows(raw={}) {
 const r=raw.data||{}, inv=r.inventory||{};
 const activity=new Map(array(r.physicalActivity).map(d=>[number(d.index),d]));
 const counterIds=new Set([...array(r.gpu?.memory).map(g=>number(g.index)),...array(r.gpu?.engines).map(g=>number(g.index))].filter(i=>i!==null));
 const gpuIds=counterIds.size?counterIds:new Set(array(inv.gpus).map((_,i)=>i));
 // A GPU without its own memory draws on system RAM, so "dedicated" figures do not describe it.
 const shares=g=>/internal/i.test(String(g.dac??''))||/\b(UHD|Iris|HD Graphics|Arc\(TM\) \d+[VT]\b|Radeon\(TM\) (Graphics|\d+M)|Adreno)/i.test(String(g.name??''));
 const gpus=[...gpuIds].filter(i=>i!==null).sort((a,b)=>a-b).map(index=>{
  // Win32_VideoController enumeration order is not DXGI phys_N order. Only associate
  // friendly names/VRAM totals when there is one adapter; otherwise keep inventory separate.
  const g=counterIds.size?(array(inv.gpus).length===1&&counterIds.size===1?array(inv.gpus)[0]:{}):array(inv.gpus)[index]||{};
  const mem=array(r.gpu?.memory).filter(g=>number(g.index)===index);
  const engines=new Map(),types=new Map();
  for(const e of array(r.gpu?.engines).filter(g=>number(g.index)===index)) {const n=number(e.utilizationPercent);if(n===null)continue;const key=label(e.engine);engines.set(key,(engines.get(key)||0)+n);}
  for(const [key,value] of engines){const type=key.split(':')[1]||key;types.set(type,Math.max(types.get(type)||0,value));}
  const sum=key=>{const values=mem.map(m=>number(m[key])).filter(n=>n!==null);return values.length?values.reduce((a,b)=>a+b,0):null;};
  return {index,name:label(g.name)||`GPU ${index+1} (Windows counter)`,utilizationPercent:engines.size?percent(Math.max(...engines.values())):null,dedicatedUsedBytes:sum('dedicatedUsedBytes'),dedicatedTotalBytes:number(g.dedicatedTotalBytes),sharedUsedBytes:sum('sharedUsedBytes'),driverVersion:label(g.driverVersion),
   sharesSystemMemory:g.name?shares(g):null,engines:[...types].map(([type,value])=>({type:label(type,30),utilizationPercent:percent(value)})).filter(e=>e.utilizationPercent>0).sort((a,b)=>b.utilizationPercent-a.utilizationPercent).slice(0,5)};
 });
 const disk=d=>({readBytesPerSecond:number(d?.readBytesPerSecond),writeBytesPerSecond:number(d?.writeBytesPerSecond),activityPercent:percent(d?.activityPercent)});
 const modern=new Map(array(inv.physicalModern).map(d=>[number(d.index),d]));
 const b=r.battery||{},sb=inv.battery||{},design=positive(sb.designMilliwattHours),full=positive(sb.fullMilliwattHours);
 const unit={Temperature:'°C',Fan:'RPM',Power:'W',Voltage:'V',Clock:'MHz'};
 const wifi=r.wifi&&(r.wifi.radio||r.wifi.signalPercent)?{standard:label(r.wifi.radio,30),band:label(r.wifi.band,20),channel:number(r.wifi.channel),signalPercent:percent(r.wifi.signalPercent),receiveMbps:number(r.wifi.receiveMbps),transmitMbps:number(r.wifi.transmitMbps),security:label(r.wifi.security,40)}:null;
 const modules=array(inv.memoryModules).map(m=>({capacityBytes:number(m.capacityBytes),speedMHz:number(m.speedMHz),manufacturer:label(m.manufacturer),type:MEMORY_TYPES[number(m.type)]||'',formFactor:FORM_FACTORS[number(m.formFactor)]||''}));
 const p=inv.processor||{},o=inv.os||{},chassis=array(inv.chassisTypes).map(number);
 const displays=array(inv.displays).map(d=>{const w=positive(d.widthCm),h=positive(d.heightCm);return {name:label(d.name,60),diagonalInches:w&&h?Math.round(Math.sqrt(w*w+h*h)/2.54*10)/10:null};});
 return {gpus,disks:{physical:array(inv.physical).map(d=>{const m=modern.get(number(d.index))||{},media=label(m.media,20),bus=label(m.bus,20);return {index:number(d.index),name:label(m.name)||label(d.name),sizeBytes:number(d.sizeBytes),health:label(m.health)||label(d.health),interface:bus||label(d.interface),kind:/nvme/i.test(bus)?'NVMe SSD':/ssd/i.test(media)?'SSD':/hdd/i.test(media)?'Hard disk':'',spindleRpm:positive(m.spindleRpm),temperatureC:positive(m.temperatureC),wearPercent:number(m.wearPercent),powerOnHours:positive(m.powerOnHours),readErrors:number(m.readErrors),queueLength:number(activity.get(number(d.index))?.queueLength),...disk(activity.get(number(d.index)))};}),logical:array(r.logical).filter(d=>/^[A-Za-z]:$/.test(d.name)).map(d=>({name:d.name,fileSystem:label(d.fileSystem,12),totalBytes:number(d.totalBytes),freeBytes:number(d.freeBytes),...disk(d)}))},
  network:array(r.network).map(n=>{const kind=/802\.11|wireless|wi-?fi/i.test(String(n.media??'')+' '+String(n.name??''))?'Wi-Fi':/802\.3|ethernet/i.test(String(n.media??'')+' '+String(n.name??''))?'Ethernet':/bluetooth/i.test(String(n.name??''))?'Bluetooth':n.virtual===true?'Virtual':'';return {index:number(n.index),name:label(n.name),kind,receiveBytesPerSecond:number(n.receiveBytesPerSecond),sendBytesPerSecond:number(n.sendBytesPerSecond),linkSpeedBitsPerSecond:number(n.linkSpeedBitsPerSecond),status:n.status==='connected'?'connected':'disconnected',...(kind==='Wi-Fi'&&n.status==='connected'&&wifi?{wifi}:{})};}),
  battery:{present:typeof b.present==='boolean'?b.present:null,chargePercent:percent(b.chargePercent),status:number(b.status),remainingMinutes:number(b.remainingMinutes),pluggedIn:typeof b.pluggedIn==='boolean'?b.pluggedIn:null,chargeRateWatts:positive(b.chargeRateMilliwatts)?Math.round(b.chargeRateMilliwatts/100)/10:null,dischargeRateWatts:positive(b.dischargeRateMilliwatts)?Math.round(b.dischargeRateMilliwatts/100)/10:null,voltage:positive(b.voltageMillivolts)?Math.round(b.voltageMillivolts/10)/100:null,
   designWattHours:design?Math.round(design/100)/10:null,fullWattHours:full?Math.round(full/100)/10:null,healthPercent:design&&full?Math.min(100,Math.round(full/design*100)):null,cycles:positive(sb.cycles),chemistry:BATTERY_CHEMISTRY[number(sb.chemistry)]||''},
  processes:array(r.processes).slice(0,80).map(p=>({name:label(p.name),...(number(p.pid)!==null?{pid:number(p.pid)}:{}),count:positive(p.count)||1,cpuPercent:percent(p.cpuPercent),memoryBytes:number(p.memoryBytes)})),
  inventory:{manufacturer:label(inv.manufacturer),model:label(inv.model),formFactor:chassis.some(c=>PORTABLE.has(c))?'Laptop':chassis.length?'Desktop':'',biosVersion:label(inv.biosVersion),biosDate:day(inv.biosDate),board:{manufacturer:label(inv.board?.manufacturer),product:label(inv.board?.product)},
   os:{name:label(o.name),version:label(o.version,30),build:label(o.build,20),architecture:label(o.architecture,20),installed:day(o.installed)},
   processor:{name:label(p.name),manufacturer:label(p.manufacturer,40),cores:positive(p.cores),threads:positive(p.threads),maxClockMHz:positive(p.maxClockMHz),l2CacheKB:positive(p.l2CacheKB),l3CacheKB:positive(p.l3CacheKB),socket:label(p.socket,40),virtualization:typeof p.virtualization==='boolean'?p.virtualization:null},
   memoryModules:modules,memorySlots:positive(inv.memorySlots),memoryMaxBytes:positive(inv.memoryMaxKB)?inv.memoryMaxKB*1024:null,displays,powerPlan:label(inv.powerPlan,60),secureBoot:typeof inv.secureBoot==='boolean'?inv.secureBoot:null,
   graphics:array(inv.gpus).map(g=>({name:label(g.name),vendor:label(g.vendor,60),sharesSystemMemory:shares(g),dedicatedTotalBytes:number(g.dedicatedTotalBytes),driverVersion:label(g.driverVersion),driverDate:day(g.driverDate),width:number(g.width),height:number(g.height),refreshRateHz:number(g.refreshRateHz),bitsPerPixel:number(g.bitsPerPixel)}))},
  sensors:array(r.sensors).filter(s=>Object.hasOwn(unit,s.type)&&signed(s.value)!==null).map(s=>({name:label(s.name),type:s.type,value:Math.round(signed(s.value)*10)/10,unit:unit[s.type],hardware:'',source:/LibreHardwareMonitor/.test(s.source)?'LibreHardwareMonitor':/OpenHardwareMonitor/.test(s.source)?'OpenHardwareMonitor':'Windows'})),
  memory:{commitUsedBytes:number(r.memory?.commitUsedBytes),commitLimitBytes:number(r.memory?.commitLimitBytes),availableBytes:number(r.memory?.availableBytes),cachedBytes:number(r.memory?.cachedBytes),pagedPoolBytes:number(r.memory?.pagedPoolBytes),nonPagedPoolBytes:number(r.memory?.nonPagedPoolBytes),hardFaultsPerSecond:number(r.memory?.hardFaultsPerSecond),pageFileAllocatedBytes:number(r.memory?.pageFileAllocatedBytes),pageFileUsedBytes:number(r.memory?.pageFileUsedBytes)},
  activity:{processes:number(r.activity?.processes),threads:number(r.activity?.threads),queueLength:number(r.activity?.queueLength),uptimeSeconds:number(r.activity?.uptimeSeconds)},
  commitUsedBytes:number(r.memory?.commitUsedBytes),commitLimitBytes:number(r.memory?.commitLimitBytes),frequency:array(r.frequency)};
}

class HardwareMonitor {
 constructor({runner=ps,system=os,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),platform=process.platform,ttl=2500,liveMs=2500,inventoryTtl=300000,sampleMs=300,session=runner===ps&&platform==='win32'?new PowerShellSession():null}={}) {
  Object.assign(this,{runner,system,now,wait,platform,ttl,liveMs,inventoryTtl,sampleMs,session});this.cached=null;this.pending=null;this.inventoryCache=null;this.previousCpus=null;
 }
 snapshot({force=false}={}) {
  if(this.pending)return this.pending;
  if(!force&&this.cached&&this.now()-this.cached.at<this.ttl)return Promise.resolve(this.cached.value);
  this.pending=this.collect().then(value=>{this.cached={at:this.now(),value};return value;}).finally(()=>{this.pending=null;});return this.pending;
 }
 // For the live view: answers at once with fresh CPU and memory, plus the newest Windows counters. Those are refreshed in the
 // background when they are older than maxAge, so the caller can poll every second without starting a query every second.
 async live(maxAge=this.liveMs) {
  if(!this.cached)return this.snapshot();
  if(!this.pending&&this.now()-this.cached.at>=maxAge)this.snapshot({force:true}).catch(()=>{});
  const base=this.cached.value,fast=this.fast(this.previousCpus);if(!fast)return base;
  return {...base,capturedAt:iso(this.now()),countersCapturedAt:base.countersCapturedAt||base.capturedAt,cpu:{...base.cpu,utilizationPercent:fast.utilizationPercent,cores:base.cpu.cores.map((c,i)=>({...c,utilizationPercent:fast.cores[i]??c.utilizationPercent}))},memory:{...base.memory,...fast.memory}};
 }
 // CPU use since the previous call, from the times Node already tracks per core.
 fast(before) {
  try {
   const after=this.system.cpus(),totalBytes=number(this.system.totalmem()),freeBytes=number(this.system.freemem());this.previousCpus=after;
   const cores=after.map((c,index)=>{const p=before?.[index];if(!p)return null;const total=Object.values(c.times).reduce((a,b)=>a+b,0)-Object.values(p.times).reduce((a,b)=>a+b,0),idle=c.times.idle-p.times.idle;return total>0&&idle>=0?percent((1-idle/total)*100):null;});
   const loads=cores.filter(n=>n!==null);
   return {after,cores,utilizationPercent:loads.length?percent(loads.reduce((a,b)=>a+b,0)/loads.length):null,memory:{totalBytes,freeBytes,usedBytes:totalBytes!==null&&freeBytes!==null?Math.max(0,totalBytes-freeBytes):null}};
  } catch { return null; }
 }
 async read(includeInventory) {
  if(this.session){try{return await this.session.request(includeInventory);}catch(e){if(e?.code==='APPHUB_PROCESS_TIMEOUT')throw e;}}
  return this.runner(`$includeInventory=$${includeInventory?'true':'false'}\n${WINDOWS_SCRIPT}`,{timeout:15000,env:scriptEnv()});
 }
 async collect() {
  const start=this.now(),errors=[],sources={};
  const includeInventory=!this.inventoryCache||start-this.inventoryCache.at>=this.inventoryTtl;
  const windows=this.platform==='win32'?Promise.resolve().then(()=>this.read(includeInventory)).then(response=>{
   if(response.code!==0)throw new Error('Windows query failed');
   const parsed=JSON.parse(response.out.replace(/^﻿/,''));if(!parsed||typeof parsed.data!=='object')throw new Error('Invalid telemetry');return parsed;
  }).catch(e=>{errors.push({source:'windows',code:e?.code==='APPHUB_PROCESS_TIMEOUT'?'TIMEOUT':'QUERY_UNAVAILABLE',message:'Windows hardware information is unavailable for this sample.'});return {data:{},sources:{}};}):Promise.resolve({data:{},sources:{}});
  let fast=null;
  try {const before=this.system.cpus();await this.wait(this.sampleMs);fast=this.fast(before);if(!fast)throw new Error('unavailable');sources.os={capturedAt:iso(this.now()),status:'available'};}
  catch {errors.push({source:'os',code:'QUERY_UNAVAILABLE',message:'CPU or memory sampling is unavailable.'});sources.os={capturedAt:iso(this.now()),status:'unavailable'};}
  const raw=await windows;raw.data=raw.data||{};
  if(raw.data.inventory){this.inventoryCache={at:this.now(),data:raw.data.inventory,source:raw.sources?.inventory};}
  if(!raw.data.inventory&&this.inventoryCache){raw.data.inventory=this.inventoryCache.data;raw.sources={...raw.sources,inventory:{...this.inventoryCache.source,status:'cached'}};}
  const w=normalizeWindows(raw),after=fast?.after||[],cores=after.map((c,index)=>{
   const f=w.frequency.find(f=>f.name===`0,${index}`||f.name===String(index));const reported=number(f?.frequencyMHz)??number(c.speed),frequencyMHz=reported>0?reported:null;
   // ProcessorFrequency is nominal on some systems; performance scales it when exposed.
   return {index,utilizationPercent:fast.cores[index],frequencyMHz:frequencyMHz!==null&&number(f?.performancePercent)!==null?Math.round(frequencyMHz*number(f.performancePercent)/100):frequencyMHz};
  });
  const freqs=cores.map(c=>c.frequencyMHz).filter(n=>n!==null&&n>0),memory=fast?.memory||{totalBytes:null,usedBytes:null,freeBytes:null};
  Object.assign(sources,raw.sources||{});for(const name of ['inventory','sensors'])sources[name]??={capturedAt:iso(this.now()),status:this.platform==='win32'?'unavailable':'unsupported'};sources.windows={capturedAt:iso(this.now()),status:this.platform!=='win32'?'unsupported':errors.some(e=>e.source==='windows')?'unavailable':raw.errors?.length?'partial':'available'};
  const capabilities={cpu:!!fast&&fast.utilizationPercent!==null,memory:memory.totalBytes!==null,gpu:w.gpus.some(g=>g.utilizationPercent!==null||g.dedicatedUsedBytes!==null),disks:w.disks.logical.length>0,network:w.network.length>0,battery:w.battery.present!==null,processes:w.processes.length>0,inventory:!!raw.data.inventory,sensors:w.sensors.length>0};
  errors.push(...array(raw.errors).map(e=>({source:label(e.source),code:'QUERY_UNAVAILABLE',message:'This provider did not expose information for this sample.'})));
  const p=w.inventory.processor;
  return {schemaVersion:1,capturedAt:iso(this.now()),sampleDurationMs:Math.max(0,this.now()-start),sources,capabilities,errors,
   cpu:{model:label(after[0]?.model)||p.name,logicalCores:cores.length,physicalCores:p.cores,maxClockMHz:p.maxClockMHz,l2CacheKB:p.l2CacheKB,l3CacheKB:p.l3CacheKB,socket:p.socket,virtualization:p.virtualization,utilizationPercent:fast?fast.utilizationPercent:null,frequencyMHz:freqs.length?Math.round(freqs.reduce((a,b)=>a+b,0)/freqs.length):null,frequencySource:w.frequency.length?'Windows processor performance counters':'OS reported clock',cores,...w.activity},
   memory:{...memory,...w.memory},gpus:w.gpus,disks:w.disks,network:w.network,battery:w.battery,processes:w.processes,inventory:w.inventory,sensors:w.sensors};
 }
 describe(snapshot){return describe(snapshot);}
}

// Wording for the chat model. Every line is a fact it may quote; the notes at the end give it the context needed to judge them.
function describe(s) {
 const n=(v,unit='')=>v===null||v===undefined?'unavailable':`${Math.round(v*10)/10}${unit}`;
 const gib=v=>v==null?'unavailable':v>=1073741824?`${Math.round(v/1073741824*10)/10} GB`:`${Math.round(v/1048576)} MB`;
 const rate=v=>v==null?'unavailable':v>=1048576?`${Math.round(v/1048576*10)/10} MB/s`:`${Math.round(v/1024)} KB/s`;
 const ratio=(a,b)=>a!=null&&b?` (${Math.round(a/b*100)}%)`:'';
 const known=(...parts)=>parts.filter(Boolean).join(', ');
 const inv=s.inventory||{},c=s.cpu||{},m=s.memory||{},b=s.battery||{},lines=[`Hardware monitor reading taken ${s.capturedAt}.`];
 const device=known([inv.manufacturer,inv.model].filter(Boolean).join(' '),inv.formFactor,inv.os?.name&&`${inv.os.name} ${inv.os.architecture||''} build ${inv.os.build||'unknown'}`.replace(/\s+/g,' '),inv.os?.installed&&`Windows installed ${inv.os.installed}`);
 lines.push(`Device: ${device||'unavailable'}${inv.biosVersion?`; BIOS ${inv.biosVersion}${inv.biosDate?' dated '+inv.biosDate:''}`:''}${[inv.board?.manufacturer,inv.board?.product].filter(Boolean).length?`; board ${[inv.board.manufacturer,inv.board.product].filter(Boolean).join(' ')}`:''}${inv.powerPlan?`; power plan ${inv.powerPlan}`:''}${inv.secureBoot!=null?`; Secure Boot ${inv.secureBoot?'on':'off'}`:''}${c.uptimeSeconds!=null?`; running ${Math.round(c.uptimeSeconds/360)/10} hours since restart`:''}.`);
 lines.push(`Processor: ${c.model||'unknown'}; ${c.physicalCores?c.physicalCores+' cores / ':''}${c.logicalCores} threads${c.maxClockMHz?`; base clock ${n(c.maxClockMHz/1000)} GHz`:''}${c.l3CacheKB?`; L3 cache ${Math.round(c.l3CacheKB/1024)} MB`:''}${c.l2CacheKB?`, L2 ${Math.round(c.l2CacheKB/1024)} MB`:''}.`);
 const coreLoads=(c.cores||[]).map(x=>x.utilizationPercent).filter(x=>x!=null);
 lines.push(`Processor now: ${n(c.utilizationPercent,'%')} overall; running at ${n(c.frequencyMHz!=null?c.frequencyMHz/1000:null,' GHz')}${coreLoads.length?`; busiest thread ${n(Math.max(...coreLoads),'%')}; per thread ${coreLoads.map(x=>Math.round(x)).join(' ')}`:''}${c.queueLength!=null?`; ${c.queueLength} threads waiting for a core`:''}${c.processes!=null?`; ${c.processes} processes, ${c.threads} threads`:''}.`);
 const modules=inv.memoryModules||[],sizes=new Map();for(const x of modules)if(x.capacityBytes){const key=`${gib(x.capacityBytes)}${x.speedMHz?' at '+x.speedMHz+' MHz':''}`;sizes.set(key,(sizes.get(key)||0)+1);}
 const type=modules.find(x=>x.type)?.type,form=modules.find(x=>x.formFactor)?.formFactor;
 lines.push(`Memory installed: ${gib(m.totalBytes)}${type?' '+type:''}${sizes.size?`; modules ${[...sizes].map(([k,count])=>`${count} × ${k}`).join(', ')}`:''}${form?` (${form})`:type?.startsWith('LP')?' (soldered, not upgradeable)':''}${inv.memorySlots&&!type?.startsWith('LP')?`; ${modules.length} of ${inv.memorySlots} slots used`:''}.`);
 lines.push(`Memory now: ${gib(m.usedBytes)} in use${ratio(m.usedBytes,m.totalBytes)}, ${gib(m.freeBytes)} available${m.cachedBytes!=null?`, ${gib(m.cachedBytes)} cached`:''}; committed ${gib(m.commitUsedBytes)} of ${gib(m.commitLimitBytes)}${ratio(m.commitUsedBytes,m.commitLimitBytes)}${m.pageFileAllocatedBytes?`; page file ${gib(m.pageFileUsedBytes)} used of ${gib(m.pageFileAllocatedBytes)}`:''}${m.hardFaultsPerSecond!=null?`; ${Math.round(m.hardFaultsPerSecond)} hard page faults per second`:''}.`);
 for(const g of s.gpus||[])lines.push(`Graphics ${g.name}: ${g.sharesSystemMemory?'integrated, shares system memory':g.sharesSystemMemory===false?'dedicated card':'type unknown'}; use ${n(g.utilizationPercent,'%')}${g.engines?.length?` (${g.engines.map(e=>`${e.type} ${n(e.utilizationPercent,'%')}`).join(', ')})`:''}; ${g.sharesSystemMemory?`shared memory in use ${gib(g.sharedUsedBytes)}`:`video memory ${gib(g.dedicatedUsedBytes)} of ${gib(g.dedicatedTotalBytes)}${ratio(g.dedicatedUsedBytes,g.dedicatedTotalBytes)}, shared ${gib(g.sharedUsedBytes)}`}${g.driverVersion?`; driver ${g.driverVersion}`:''}.`);
 for(const g of inv.graphics||[])lines.push(`Graphics adapter ${g.name}${g.vendor?' by '+g.vendor:''}: ${g.sharesSystemMemory?'integrated':`dedicated, ${gib(g.dedicatedTotalBytes)} video memory`}; driver ${g.driverVersion||'unavailable'}${g.driverDate?' dated '+g.driverDate:''}${g.width&&g.height?`; driving ${g.width}×${g.height} at ${n(g.refreshRateHz,' Hz')}`:''}.`);
 for(const d of inv.displays||[])if(d.name||d.diagonalInches)lines.push(`Display: ${d.name||'built-in panel'}${d.diagonalInches?`, ${d.diagonalInches} inch`:''}.`);
 for(const d of s.disks?.physical||[])lines.push(`Disk ${d.name}: ${known(d.kind,d.interface&&!String(d.kind).includes(d.interface)?d.interface:'',gib(d.sizeBytes))}; health ${d.health||'unavailable'}${d.wearPercent!=null?`; ${d.wearPercent}% of rated life used`:''}${d.temperatureC?`; ${d.temperatureC}°C`:''}${d.powerOnHours?`; ${d.powerOnHours} power-on hours`:''}${d.readErrors?`; ${d.readErrors} read errors`:''}${d.activityPercent!=null?`; active ${n(d.activityPercent,'%')} of the time, reading ${rate(d.readBytesPerSecond)}, writing ${rate(d.writeBytesPerSecond)}${d.queueLength?`, queue ${d.queueLength}`:''}`:''}.`);
 for(const d of s.disks?.logical||[])lines.push(`Volume ${d.name}${d.fileSystem?' ('+d.fileSystem+')':''}: ${gib(d.freeBytes)} free of ${gib(d.totalBytes)}${d.totalBytes?` (${Math.round((1-d.freeBytes/d.totalBytes)*100)}% full)`:''}.`);
 for(const a of s.network||[])if(a.status==='connected')lines.push(`Network ${a.name}${a.kind?' ('+a.kind+')':''}: connected${a.linkSpeedBitsPerSecond?` at ${Math.round(a.linkSpeedBitsPerSecond/1e6)} Mbps link speed`:''}; downloading ${rate(a.receiveBytesPerSecond)}, uploading ${rate(a.sendBytesPerSecond)}${a.wifi?`; ${known(a.wifi.standard,a.wifi.band,a.wifi.channel!=null&&'channel '+a.wifi.channel,a.wifi.signalPercent!=null&&'signal '+a.wifi.signalPercent+'%',a.wifi.security)}`:''}.`);
 const idle=(s.network||[]).filter(a=>a.status!=='connected');if(idle.length)lines.push(`Network adapters not connected: ${idle.map(a=>a.name).join(', ')}.`);
 lines.push(b.present===false?'Battery: not present.':b.present===true?`Battery: ${n(b.chargePercent,'%')}${b.pluggedIn!=null?b.pluggedIn?', plugged in':', on battery':''}${b.chargeRateWatts?`, charging at ${b.chargeRateWatts} W`:b.dischargeRateWatts?`, drawing ${b.dischargeRateWatts} W`:''}${b.remainingMinutes?`, about ${Math.floor(b.remainingMinutes/60)} h ${b.remainingMinutes%60} min left`:''}${b.fullWattHours?b.designWattHours?`; holds ${b.fullWattHours} Wh of its original ${b.designWattHours} Wh (${b.healthPercent}% health)`:`; full charge holds ${b.fullWattHours} Wh (original capacity not reported)`:''}${b.cycles?`; ${b.cycles} charge cycles`:''}${b.chemistry?`; ${b.chemistry}`:''}.`:'Battery: unavailable.');
 lines.push(`Sensors: ${s.sensors?.length?s.sensors.slice(0,16).map(x=>`${x.name} ${n(x.value,x.unit)}`).join('; '):'unavailable; this PC does not report temperatures or fan speeds to Windows, and an already-running LibreHardwareMonitor or OpenHardwareMonitor is needed to read them'}.`);
 const procs=s.processes||[],by=(key,count)=>[...procs].filter(p=>p[key]>0).sort((a,b)=>b[key]-a[key]).slice(0,count);
 lines.push(`Programs using the most memory: ${by('memoryBytes',10).map(p=>`${p.name} ${gib(p.memoryBytes)}${p.count>1?` (${p.count} processes)`:''}`).join('; ')||'unavailable'}.`);
 lines.push(`Programs using the most processor: ${by('cpuPercent',6).filter(p=>p.cpuPercent>=0.5).map(p=>`${p.name} ${n(p.cpuPercent,'%')}`).join('; ')||'nothing significant'}.`);
 lines.push('How to read these: memory is under pressure when committed memory nears its limit or hard page faults stay in the hundreds; a disk is a bottleneck when it is active nearly 100% of the time; a processor is saturated when overall use stays above 90% or threads are waiting for a core; one thread at 100% with low overall use means a single-threaded program is the limit. An integrated GPU uses system memory, so its "dedicated" figure is not real video memory.');
 if(s.errors?.length)lines.push(`Unavailable providers: ${[...new Set(s.errors.map(e=>e.source))].join(', ')}. Unavailable values are not zero readings.`);
 return lines.join('\n');
}
const hardware=new HardwareMonitor();
module.exports={hardware,HardwareMonitor,PowerShellSession,describe,normalizeWindows};
