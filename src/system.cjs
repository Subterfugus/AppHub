// Read-only facts about this PC for local chat. Nothing here changes the system or leaves it.
const os=require('node:os');
const {ps}=require('./platform.cjs');
const script=`
$o=Get-CimInstance Win32_OperatingSystem
$c=Get-CimInstance Win32_Processor|Select-Object -First 1
$a=@{};Get-Process|ForEach-Object{$a[$_.Id]=$_.TotalProcessorTime.TotalSeconds}
Start-Sleep -Milliseconds 800
$p=Get-Process|ForEach-Object{[pscustomobject]@{n=$_.ProcessName;m=$_.WorkingSet64;c=if($a.ContainsKey($_.Id)){$_.TotalProcessorTime.TotalSeconds-$a[$_.Id]}else{0}}}|Group-Object n|ForEach-Object{[pscustomobject]@{name=$_.Name;count=$_.Count;memory=($_.Group|Measure-Object m -Sum).Sum;cpu=[math]::Round(($_.Group|Measure-Object c -Sum).Sum/0.8/[Environment]::ProcessorCount*100,1)}}
[pscustomobject]@{
 os=$o.Caption;build=$o.BuildNumber;boot=$o.LastBootUpTime.ToString('o')
 cpu=$c.Name;cores=$c.NumberOfCores;threads=$c.NumberOfLogicalProcessors;load=$c.LoadPercentage
 gpus=@(Get-CimInstance Win32_VideoController|ForEach-Object{$_.Name})
 disks=@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'|ForEach-Object{[pscustomobject]@{drive=$_.DeviceID;label=$_.VolumeName;size=$_.Size;free=$_.FreeSpace}})
 battery=@(Get-CimInstance Win32_Battery|ForEach-Object{[pscustomobject]@{charge=$_.EstimatedChargeRemaining;plugged=($_.BatteryStatus -ne 1)}})
 startup=@(Get-CimInstance Win32_StartupCommand|ForEach-Object{$_.Name}|Sort-Object -Unique)
 byMemory=@($p|Sort-Object memory -Descending|Select-Object -First 12)
 byCpu=@($p|Where-Object{$_.name -ne 'Idle' -and $_.cpu -gt 0.4}|Sort-Object cpu -Descending|Select-Object -First 8)
 processCount=($p|Measure-Object count -Sum).Sum
}|ConvertTo-Json -Depth 4 -Compress`;
const gb=n=>Number.isFinite(+n)?Math.round(+n/1073741824*10)/10:null;
const text=(v,max=80)=>String(v??'').replace(/[\r\n\t]+/g,' ').trim().slice(0,max);
const list=v=>Array.isArray(v)?v:v==null?[]:[v];
function shape(raw={}){
 const proc=p=>({name:text(p.name,60),count:+p.count||1,memoryGb:gb(p.memory)??0,cpu:Math.max(0,Math.min(100,+p.cpu||0))});
 const boot=Date.parse(raw.boot);
 return {
  os:text(raw.os)||os.type(),build:text(raw.build,20),cpu:text(raw.cpu)||os.cpus()[0]?.model||'',cores:+raw.cores||null,threads:+raw.threads||os.cpus().length,
  cpuLoad:Number.isFinite(+raw.load)?+raw.load:null,memoryTotalGb:gb(os.totalmem()),memoryFreeGb:gb(os.freemem()),
  uptimeHours:Math.round((Number.isFinite(boot)?(Date.now()-boot)/3600000:os.uptime()/3600)*10)/10,
  gpus:list(raw.gpus).map(g=>text(g)).filter(Boolean).slice(0,4),
  disks:list(raw.disks).map(d=>({drive:text(d.drive,4),label:text(d.label,30),sizeGb:gb(d.size),freeGb:gb(d.free)})).filter(d=>d.drive&&d.sizeGb).slice(0,8),
  battery:list(raw.battery).map(b=>({charge:+b.charge||0,plugged:!!b.plugged}))[0]||null,
  startup:list(raw.startup).map(s=>text(s,60)).filter(Boolean).slice(0,30),
  byMemory:list(raw.byMemory).map(proc).slice(0,12),byCpu:list(raw.byCpu).map(proc).slice(0,8),processCount:+raw.processCount||null,
  time:new Date().toISOString()
 };
}
// Compact wording for the model: every line is a fact it may quote, and nothing else is known to it.
function describe(s){
 const lines=[`Windows: ${s.os}${s.build?' (build '+s.build+')':''}; running for ${s.uptimeHours} hours since last restart`,
  `Processor: ${s.cpu}${s.cores?`, ${s.cores} cores / ${s.threads} threads`:''}${s.cpuLoad!=null?`; overall CPU load now ${s.cpuLoad}%`:''}`,
  `Memory: ${Math.round((s.memoryTotalGb-s.memoryFreeGb)*10)/10} GB used of ${s.memoryTotalGb} GB (${s.memoryFreeGb} GB free)`];
 if(s.gpus.length)lines.push('Graphics: '+s.gpus.join('; '));
 for(const d of s.disks)lines.push(`Drive ${d.drive}${d.label?' ('+d.label+')':''}: ${d.freeGb} GB free of ${d.sizeGb} GB (${Math.round((1-d.freeGb/d.sizeGb)*100)}% full)`);
 if(s.battery)lines.push(`Battery: ${s.battery.charge}%, ${s.battery.plugged?'plugged in':'on battery'}`);
 if(s.byMemory.length)lines.push('Programs using the most memory now: '+s.byMemory.map(p=>`${p.name} ${p.memoryGb} GB${p.count>1?` (${p.count} processes)`:''}`).join(', '));
 lines.push('Programs using the most CPU now: '+(s.byCpu.length?s.byCpu.map(p=>`${p.name} ${p.cpu}%`).join(', '):'nothing significant'));
 if(s.processCount)lines.push(`Running processes: ${s.processCount}`);
 if(s.startup.length)lines.push(`Programs that start with Windows (${s.startup.length}): ${s.startup.join(', ')}`);
 return lines.join('\n');
}
class SystemInfo{
 constructor({read=()=>ps(script,{timeout:20000}),maxAgeMs=20000}={}){Object.assign(this,{read,maxAgeMs});this.cached=null;this.at=0;this.pending=null;}
 snapshot(){
  if(this.cached&&Date.now()-this.at<this.maxAgeMs)return Promise.resolve(this.cached);
  return this.pending||=(async()=>{try{let raw={};try{const r=await this.read();if(r.code===0)raw=JSON.parse(r.out);}catch{}this.cached=shape(raw);this.at=Date.now();return this.cached;}finally{this.pending=null;}})();
 }
}
module.exports={SystemInfo,shape,describe};
