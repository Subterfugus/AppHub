const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function run(file,args=[],opts={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{windowsHide:true,shell:false,...opts}); let out='',err='';
    const timer=setTimeout(()=>{const error=new Error(file+' timed out');error.code='APPHUB_PROCESS_TIMEOUT';error.timedOut=true;child.kill();reject(error);},opts.timeout||120000);
    child.stdout?.on('data',d=>{out+=d.toString();opts.onOutput?.(d.toString());});
    child.stderr?.on('data',d=>{err+=d.toString();opts.onOutput?.(d.toString());});
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.on('close',code=>{clearTimeout(timer);resolve({code,out,err});});
  });
}
function ps(script,opts={}) {return run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from("[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); $ProgressPreference='SilentlyContinue'; "+script,'utf16le').toString('base64')],opts);}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,20);
const norm=s=>String(s||'').toLowerCase().replace(/\s+(?:version\s*)?v?\d+(?:\.\d+)+.*$/,'').replace(/\([^)]*\)|\b(x64|x86|64-bit|32-bit|version|microsoft corporation)\b/g,'').replace(/[^a-z0-9]/g,'');
// Search normalization is deliberately broad. Inventory identity must retain
// editions, architectures, and side-by-side runtime versions.
const nameKey=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/\(r\)|[®™]/g,'').replace(/[^\p{L}\p{N}+#]+/gu,' ').trim().replace(/\s+/g,' ');
function nameAliases(a) {
  const names=new Set([nameKey(a.name),...(a.aliases||[]).map(nameKey)]);
  let base=String(a.name||'');
  // Only remove the actual installed version, never an arbitrary number in a
  // product name (for example Visual C++ 2013 or AmpliTube 5).
  if(a.version){const v=String(a.version).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');base=base.replace(new RegExp('(?:\\s+(?:version\\s*|v)?|\\s*-\\s*)'+v+'(?=\\s*(?:\\((?:x64|x86|arm64|64-bit|32-bit)\\))?$)','i'),'');}
  names.add(nameKey(base));
  names.add(nameKey(base.replace(/\s*\((?:x64|x86|arm64|64-bit|32-bit)\)\s*$|\s+(?:x64|x86|arm64|64-bit|32-bit)\s*$/i,'')));
  const publisher=nameKey(a.publisher).replace(/\s+(?:corporation|inc|llc|ltd)$/,'');const full=nameKey(base);
  if(publisher.length>3&&full.startsWith(publisher+' '))names.add(full.slice(publisher.length+1));
  return names;
}
function matchingName(apps,name,version) {
  const key=nameKey(name);if(!key)return null;
  let matches=apps.filter(a=>nameKey(a.name)===key);
  if(!matches.length)matches=apps.filter(a=>nameAliases(a).has(key));
  // A well-known shortcut label, not a generic prefix match that can conflate
  // products such as Chrome Remote Desktop and Chrome Remote Desktop Host.
  if(!matches.length&&key==='7 zip file manager')matches=apps.filter(a=>nameAliases(a).has('7 zip'));
  if(matches.length>1&&version){const exact=matches.filter(a=>a.version===version);if(exact.length===1)return exact[0];}
  return matches.length===1?matches[0]:null;
}
function parseTable(text) {
  const lines=text.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/\r?\n/);
  const divider=lines.findIndex(l=>/^\s*-{5,}\s*$/.test(l)); if(divider<1)return [];
  const header=lines[divider-1]; const starts=[...header.matchAll(/\S+(?: \S+)?(?=\s{2,}|$)/g)].map(x=>x.index);
  // Column titles are localized. Column boundaries are determined from spacing, not labels.
  return lines.slice(divider+1).filter(l=>l.trim() && !/^\d+ (upgrades?|packages?)/i.test(l)).map(l=>starts.map((s,i)=>l.slice(s,starts[i+1]).trim())).filter(r=>r.length>=3&&r[1]);
}
function categorize(name,publisher='') {
  const s=(name+' '+publisher).toLowerCase();
  if(/amplitube|neural dsp|archetype|ableton|reaper|audacity|guitar|audio|fl studio|izotope|kontakt|native instruments/.test(s))return 'Music & audio';
  if(/steam|epic games|xbox|minecraft|game|roblox|battle.net|riot|playstation/.test(s))return 'Games';
  if(/code|python|node.js|git\b|docker|visual studio|terminal|powershell|antigravity|codex|cursor|sdk|runtime|development/.test(s))return 'Development';
  if(/photoshop|illustrator|canva|figma|blender|paint|gimp|affinity|photo|creative|adobe|davinci|obs studio/.test(s))return 'Creative';
  if(/\b(chrome|edge|firefox|brave|opera|browser)\b/.test(s))return 'Browsers';
  if(/office|word\b|excel|powerpoint|onenote|notion|obsidian|outlook|acrobat|access\b|todo|calendar/.test(s))return 'Productivity';
  if(/discord|slack|teams|zoom|signal|whatsapp|telegram/.test(s))return 'Communication';
  return 'Utilities';
}
async function discoverWindows() {
  const script=String.raw`
  $ErrorActionPreference='SilentlyContinue'
  $registry=@('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*')
  $apps=@(Get-ItemProperty $registry | Where-Object {$_.DisplayName} | ForEach-Object { [PSCustomObject]@{name=$_.DisplayName;version=$_.DisplayVersion;publisher=$_.Publisher;location=$_.InstallLocation;icon=$_.DisplayIcon;uninstall=$_.UninstallString;registry=$_.PSPath;system=[bool]$_.SystemComponent;sizeKB=$_.EstimatedSize} })
  $start=@(Get-StartApps | ForEach-Object { [PSCustomObject]@{name=$_.Name;appId=$_.AppID} })
  $wsh=New-Object -ComObject WScript.Shell
  $roots=@("$env:ProgramData\Microsoft\Windows\Start Menu\Programs","$env:APPDATA\Microsoft\Windows\Start Menu\Programs",[Environment]::GetFolderPath('Desktop'),"$env:PUBLIC\Desktop")
  $links=@(foreach($root in $roots){Get-ChildItem -LiteralPath $root -Filter *.lnk -Recurse | ForEach-Object { $s=$wsh.CreateShortcut($_.FullName); [PSCustomObject]@{name=$_.BaseName;path=$_.FullName;target=$s.TargetPath;arguments=$s.Arguments;workingDirectory=$s.WorkingDirectory;icon=$s.IconLocation} }})
  $appx=@(Get-AppxPackage | Where-Object { !$_.IsFramework -and !$_.IsResourcePackage } | ForEach-Object { [PSCustomObject]@{name=$_.Name;family=$_.PackageFamilyName;version=$_.Version.ToString();location=$_.InstallLocation;publisher=$_.Publisher} })
  $steam=(Get-ItemProperty 'HKCU:\Software\Valve\Steam').SteamPath
  [PSCustomObject]@{registry=$apps;start=$start;links=$links;appx=$appx;steam=$steam;computer=$env:COMPUTERNAME} | ConvertTo-Json -Depth 5 -Compress`;
  const r=await ps(script); if(r.code!==0)throw new Error(r.err||'Windows inventory failed');
  return JSON.parse(r.out.replace(/^\uFEFF/,''));
}
function mergeInventory(raw) {
  const apps=[];const registryKeys=new Map();
  for(const a of raw.registry||[]) {
    if(!nameKey(a.name))continue;
    const key=JSON.stringify([nameKey(a.name),a.version||'',nameKey(a.publisher),String(a.location||'').replace(/[\\/]+$/,'').toLowerCase()]);
    const prev=registryKeys.get(key);if(prev){prev.icon ||= a.icon;prev.system=prev.system&&a.system;continue;}
    const item={...a,id:'app:'+hash(a.registry||key),kind:'app',source:'Installed',category:categorize(a.name,a.publisher),description:`${a.name} by ${a.publisher||'unknown publisher'}. ${categorize(a.name,a.publisher)} application.`,origins:['Registry']};
    registryKeys.set(key,item);apps.push(item);
  }
  const pick=name=>matchingName(apps,name);
  const executableKey=s=>path.win32.normalize(String(s||'').replace(/^"|"(?=,|$)/g,'').replace(/,\s*-?\d+$/,'')).toLowerCase();
  for(const s of raw.start||[]) {
    if(!s.appId||/\.(pdf|chm|html?|txt)$/i.test(s.appId)||/uninstall|\bmanual\b| help$| readme|release notes|documentation|website|\bfaqs?\b|^what.?s?\s*new|^what is new|^install additional tools/i.test(s.name))continue;
    let a=pick(s.name);
    // A shortcut can prove that a renamed Start entry is the executable used
    // by a registry entry. The icon alone is never used as a launch command.
    const targets=[...new Set((raw.links||[]).filter(l=>nameKey(l.name)===nameKey(s.name)&&/\.exe$/i.test(l.target)&&!l.arguments).map(l=>executableKey(l.target)))];
    if(targets.length===1){const exact=apps.filter(x=>x.origins.includes('Registry')&&!x.launch&&executableKey(x.icon)===targets[0]);if(exact.length===1)a=exact[0];}
    if(a?.launch?.type==='aumid'&&a.launch.target!==s.appId)a=null;
    if(!a){a={id:'app:'+hash(s.appId),name:s.name,kind:'app',source:s.appId.includes('!')?'Microsoft Store':'Start menu',category:categorize(s.name),origins:[],description:`${s.name}. ${categorize(s.name)} application.`};apps.push(a);}
    a.aliases ||= [];if(!a.aliases.includes(s.name))a.aliases.push(s.name);
    a.launch ||= {type:'aumid',target:s.appId}; if(!a.origins.includes('Start menu'))a.origins.push('Start menu');
    const ap=(raw.appx||[]).find(x=>s.appId.startsWith(x.family+'!'));
    if(ap){a.version ||= ap.version;a.location ||= ap.location;a.source='Microsoft Store';a.packageFamily=ap.family;}
  }
  for(const l of raw.links||[]) {
    if(!l.target||!/\.exe$/i.test(l.target)||/uninstall|unins\d|setup\.exe/i.test(l.target)||/uninstall|help|manual|release notes|documentation|website|\bfaqs?\b|^what.?s?\s*new|^what is new|^install additional tools/i.test(l.name))continue;
    let a=pick(l.name);
    if(!a){a={id:'app:'+hash(l.path),name:l.name,kind:'app',source:'Shortcut',category:categorize(l.name),origins:[],description:`${l.name}. ${categorize(l.name)} application.`};apps.push(a);}
    if(a.launch?.type!=='shortcut'){a.launch={type:'shortcut',target:l.path};a.executable=l.target;}
    a.location ||= path.win32.dirname(l.target);a.icon ||= l.icon;if(!a.origins.includes('Shortcut'))a.origins.push('Shortcut');
  }
  // DisplayIcon is presentation metadata. It often points at an installer in
  // Package Cache; only Start menu entries and shortcuts establish launchability.
  return apps;
}
function steamGames(root) {
  if(!root)return []; const dirs=[root];
  try{const vdf=fs.readFileSync(path.join(root,'steamapps/libraryfolders.vdf'),'utf8');for(const m of vdf.matchAll(/"path"\s+"([^"]+)"/g))dirs.push(m[1].replace(/\\\\/g,'\\'));}catch{}
  const games=[];for(const d of new Set(dirs))try{for(const file of fs.readdirSync(path.join(d,'steamapps')).filter(f=>/^appmanifest_\d+\.acf$/.test(f))){const text=fs.readFileSync(path.join(d,'steamapps',file),'utf8');const val=k=>text.match(new RegExp('"'+k+'"\\s+"([^"]+)"'))?.[1];const appid=val('appid');if(appid)games.push({id:'steam:'+appid,name:val('name')||appid,kind:'app',source:'Steam',category:'Games',publisher:'Steam',location:path.join(d,'steamapps/common',val('installdir')||''),launch:{type:'uri',target:'steam://rungameid/'+appid},description:`${val('name')} game installed through Steam.`,origins:['Steam']});}}catch{}
  return games;
}
module.exports={run,ps,hash,norm,nameKey,nameAliases,matchingName,parseTable,categorize,discoverWindows,mergeInventory,steamGames};
