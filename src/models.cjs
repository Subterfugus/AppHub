const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const os=require('node:os');
const {pipeline}=require('node:stream/promises');
const DEFAULTS={threads:4,context:8192,queryPrefix:'',documentPrefix:''};
// Optional larger chat models. One is fetched only when the user asks for it, from a pinned revision, and verified before it is used.
const DOWNLOADS=[{id:'qwen3-8b',name:'Qwen3 8B',file:'Qwen3-8B-Q4_K_M.gguf',url:'https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/7c41481f57cb95916b40956ab2f0b139b296d974/Qwen3-8B-Q4_K_M.gguf',sha256:'d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785',bytes:5027783488,memoryGb:16}];
async function sha256(file){const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}
function options(value={},previous=DEFAULTS){
 const out={...previous};for(const key of ['threads','context'])if(value[key]!=null){if(!Number.isInteger(value[key])||!(key==='threads'?[1,2,4,6,8]:[2048,4096,8192]).includes(value[key]))throw new Error('Choose supported CPU and context limits');out[key]=value[key];}
 for(const key of ['queryPrefix','documentPrefix'])if(value[key]!=null){if(typeof value[key]!=='string'||value[key].length>100)throw new Error('Model prefixes must be at most 100 characters');out[key]=value[key];}return out;
}
async function digest(files){const hash=crypto.createHash('sha256');for(const file of files){hash.update(path.basename(file));for await(const chunk of fs.createReadStream(file))hash.update(chunk);}return hash.digest('hex');}
function readJSON(file){const stat=fs.statSync(file);if(stat.size>8*1024*1024)throw new Error(path.basename(file)+' is too large');return JSON.parse(fs.readFileSync(file,'utf8'));}
function embeddingFiles(location,dtype){
 const names={q8:'model_quantized.onnx',fp32:'model.onnx',fp16:'model_fp16.onnx'};
 const files=['config.json','tokenizer.json',...['tokenizer_config.json','special_tokens_map.json'].filter(file=>fs.existsSync(path.join(location,file)))].map(file=>path.join(location,file));
 const visit=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(!entry.name.endsWith('.onnx')||file===path.join(location,'onnx',names[dtype]))files.push(file);}};
 visit(path.join(location,'onnx'));return files;
}
async function inspect(role,location){
 if(!['embedding','reasoning'].includes(role)||typeof location!=='string'||!path.isAbsolute(location))throw new Error('Choose a local model using the file picker');
 location=fs.realpathSync(location);const stat=fs.statSync(location);let files,dtype;
 if(role==='reasoning'){
  if(!stat.isFile()||!location.toLowerCase().endsWith('.gguf'))throw new Error('Choose a GGUF chat model file');const fd=fs.openSync(location,'r');const header=Buffer.alloc(8);try{fs.readSync(fd,header,0,8,0);}finally{fs.closeSync(fd);}if(header.subarray(0,4).toString()!=='GGUF'||![2,3].includes(header.readUInt32LE(4)))throw new Error('This file is not a supported GGUF model');
  if(stat.size<1024*1024)throw new Error('This GGUF file is incomplete');if(stat.size>os.totalmem()*.45)throw new Error('This model is too large for this PC. Choose a smaller quantized model.');files=[location];
 }else{
  if(!stat.isDirectory())throw new Error('Choose the folder containing an ONNX embedding model');const config=path.join(location,'config.json');const parsed=readJSON(config);if(!parsed||typeof parsed.model_type!=='string')throw new Error('The embedding model needs a valid config.json');
  const tokenizer=path.join(location,'tokenizer.json');if(!fs.statSync(tokenizer).isFile())throw new Error('The model folder needs tokenizer.json');
  const candidates=[['q8','model_quantized.onnx'],['fp32','model.onnx'],['fp16','model_fp16.onnx']];const selected=candidates.find(([,file])=>fs.existsSync(path.join(location,'onnx',file)));if(!selected)throw new Error('The folder needs onnx/model_quantized.onnx or onnx/model.onnx');dtype=selected[0];
  const model=path.join(location,'onnx',selected[1]);if(!fs.statSync(model).isFile()||fs.statSync(model).size<1024)throw new Error('The ONNX model file is incomplete');files=[config,tokenizer,model];for(const file of ['tokenizer_config.json','special_tokens_map.json'])if(fs.existsSync(path.join(location,file)))files.push(path.join(location,file));
  files=embeddingFiles(location,dtype);
 }
 const bytes=files.reduce((n,file)=>n+fs.statSync(file).size,0);if(bytes>os.totalmem()*.45)throw new Error('This model is too large for this PC');
 const fingerprint=await digest(files);return {location,bytes,dtype,fingerprint,stamp:files.map(file=>({file,size:fs.statSync(file).size,mtime:fs.statSync(file).mtimeMs}))};
}
function unchanged(profile){try{if(profile.builtin&&!profile.stamp)return true;if(!profile.stamp?.length)return false;if(profile.role==='embedding'){const files=embeddingFiles(profile.location,profile.dtype);if(files.length!==profile.stamp.length||files.some((file,i)=>file!==profile.stamp[i].file))return false;}return profile.stamp.every(s=>{const f=fs.statSync(s.file);return f.isFile()&&f.size===s.size&&f.mtimeMs===s.mtime;});}catch{return false;}}
class ModelStore{
 constructor({data,models,onChange=()=>{},probe,downloads=DOWNLOADS,fetcher=(...a)=>fetch(...a),totalMemory=os.totalmem()}){
  Object.assign(this,{data,models,onChange,probe,downloads,fetcher,totalMemory});this.downloading=null;this.abort=null;fs.mkdirSync(data,{recursive:true});this.file=path.join(data,'models.json');this.busy=false;this.message='';this.warning=null;
  this.builtins=[{id:'embedding:minilm',role:'embedding',name:'MiniLM L6 · bundled',builtin:true,location:path.join(models,'Xenova/all-MiniLM-L6-v2'),dtype:'q8',fingerprint:'builtin-minilm-l6-q8-v1',bytes:23000000},{id:'reasoning:qwen3',role:'reasoning',name:'Qwen3 4B · bundled',builtin:true,location:path.join(models,'Qwen/Qwen3-4B-Q4_K_M.gguf'),bytes:2497280256}];
  let saved;try{saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(!saved||typeof saved!=='object'||Array.isArray(saved))throw new Error('Invalid model settings');}catch(e){saved={};if(fs.existsSync(this.file)){const backup=this.file+'.recovered-'+Date.now()+'.bak';fs.copyFileSync(this.file,backup);this.warning='Model settings were recovered. The original was preserved as '+path.basename(backup)+'.';}}
  this.profiles=[...this.builtins,...(Array.isArray(saved?.profiles)?saved.profiles:[]).filter(p=>p&&!p.builtin&&['embedding','reasoning'].includes(p.role)&&typeof p.id==='string'&&/^model:(embedding|reasoning):[a-f0-9]{16}$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=120&&typeof p.location==='string'&&path.isAbsolute(p.location)&&typeof p.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(p.fingerprint)&&Array.isArray(p.stamp)&&p.stamp.length>0).slice(0,30)];
  this.active={embedding:'embedding:minilm',reasoning:'reasoning:qwen3',chat:null,...saved?.active};try{this.settings=options(saved?.settings||{});if(saved?.settings&&!saved.settingsVersion&&this.settings.context===4096)this.settings.context=8192;}catch{this.settings={...DEFAULTS};this.warning='Invalid model limits were restored to the defaults.';}
  if(this.active.chat){const chat=this.profiles.find(p=>p.role==='reasoning'&&p.id===this.active.chat);if(!chat||!unchanged(chat)){this.active.chat=null;this.warning='The saved chat model is missing or changed. Chat uses the search model until you choose it again.';}}
  for(const role of ['embedding','reasoning']){const selected=this.profiles.find(p=>p.role===role&&p.id===this.active[role]);if(role==='reasoning'&&this.active[role]==='off')continue;if(!selected||!unchanged(selected)){this.active[role]=this.builtins.find(p=>p.role===role).id;this.warning='A saved custom model is missing or changed. The bundled model is active; test the replacement to use it again.';}}
 }
 snapshot(){return {profiles:this.profiles.map(p=>({...p,stamp:undefined,fingerprint:undefined})),active:{...this.active},settings:{...this.settings},busy:this.busy,message:this.message,warning:this.warning,downloads:this.downloads.map(d=>({id:d.id,name:d.name,bytes:d.bytes,memoryGb:d.memoryGb,fits:this.fits(d),profile:this.profiles.find(p=>p.download===d.id)?.id||null})),downloading:this.downloading?{...this.downloading}:null};}
 fits(d){return this.totalMemory>=d.memoryGb*.93*1073741824;}
 // Fetches an optional model into the data folder, resuming a partial file, and registers it once its checksum matches. Search and chat keep working meanwhile.
 async fetchModel(id){
  const d=this.downloads.find(d=>d.id===id);if(!d)throw new Error('Unknown model');if(this.downloading)throw new Error('A model is already downloading');if(!this.fits(d))throw new Error(`${d.name} needs a PC with ${d.memoryGb} GB of memory`);
  const dir=path.join(this.data,'models'),target=path.join(dir,d.file),part=target+'.partial',abort=this.abort=new AbortController();fs.mkdirSync(dir,{recursive:true});this.downloading={id,received:0,total:d.bytes,stage:'Downloading'};this.notify();
  try{
   if(!(fs.existsSync(target)&&fs.statSync(target).size===d.bytes&&await sha256(target)===d.sha256)){
    let have=fs.existsSync(part)?fs.statSync(part).size:0;if(have>=d.bytes){fs.rmSync(part);have=0;}
    const disk=await fs.promises.statfs(dir);if(disk.bavail*disk.bsize<d.bytes-have+1073741824)throw new Error('Not enough free disk space for '+d.name);
    const response=await this.fetcher(d.url,{headers:have?{Range:`bytes=${have}-`}:{},signal:abort.signal,redirect:'follow'});if(!response.ok)throw new Error('The download server answered '+response.status);if(have&&response.status!==206)have=0;
    this.downloading.received=have;let last=0;const store=this;
    await pipeline(response.body,async function*(source){for await(const chunk of source){store.downloading.received+=chunk.length;if(Date.now()-last>400){last=Date.now();store.notify();}yield chunk;}},fs.createWriteStream(part,{flags:have?'a':'w'}),{signal:abort.signal});
    this.downloading.stage='Verifying';this.notify();
    if(fs.statSync(part).size!==d.bytes||await sha256(part)!==d.sha256){fs.rmSync(part,{force:true});throw new Error('The download did not match its checksum and was discarded. Try again.');}
    fs.renameSync(part,target);
   }
   this.downloading.stage='Verifying';this.downloading.received=d.bytes;this.notify();const inspected=await inspect('reasoning',target),pid=`model:reasoning:${inspected.fingerprint.slice(0,16)}`,existing=this.profiles.find(p=>p.id===pid);
   if(existing)Object.assign(existing,inspected,{name:d.name,download:d.id});else this.profiles.push({id:pid,role:'reasoning',name:d.name,builtin:false,download:d.id,...inspected});this.save();this.message=d.name+' downloaded.';return pid;
  }catch(e){if(abort.signal.aborted)throw new Error('Download paused. It continues from where it stopped next time.');throw e;}finally{this.downloading=null;this.abort=null;this.notify();}
 }
 cancelDownload(){this.abort?.abort();}
 // Deletes a downloaded model file that AppHub fetched itself; models the user added stay on disk.
 removeDownload(id){if(this.busy||this.downloading)throw new Error('Wait for the current model operation to finish');const d=this.downloads.find(d=>d.id===id),p=this.profiles.find(p=>p.download===id);if(!d)throw new Error('Unknown model');if(p&&Object.values(this.active).includes(p.id))throw new Error('Switch to another chat model before deleting this one');this.profiles=this.profiles.filter(x=>x!==p);for(const file of [d.file,d.file+'.partial'])fs.rmSync(path.join(this.data,'models',file),{force:true});this.message=d.name+' deleted.';this.save();this.notify();return this.snapshot();}
 notify(){this.onChange(this.snapshot());}
 validateActive(){
  const bundledEmbedding=this.builtins.find(p=>p.role==='embedding');if(this.active.embedding===bundledEmbedding.id&&bundledEmbedding.stamp&&!unchanged(bundledEmbedding)){this.warning='The bundled search model changed while AppHub was running. Restart AppHub before using local AI search.';this.notify();throw new Error(this.warning);}
  let changed=false;for(const role of ['embedding','reasoning']){if(role==='reasoning'&&this.active[role]==='off')continue;const profile=this.profiles.find(p=>p.role===role&&p.id===this.active[role]);if(profile&&!profile.builtin&&!unchanged(profile)){this.active[role]=this.builtins.find(p=>p.role===role).id;changed=true;}}
  if(this.active.chat){const chat=this.profiles.find(p=>p.id===this.active.chat);if(!chat||!chat.builtin&&!unchanged(chat)){this.active.chat=null;changed=true;}}
  if(changed){this.warning='An active custom model is missing or changed. The bundled model is active; test the replacement to use it again.';try{this.save();}catch{this.warning+=' The fallback could not be saved, so it will be checked again when AppHub restarts.';}this.notify();}return changed;
 }
 async prepareBuiltinEmbedding(){const profile=this.builtins.find(p=>p.role==='embedding');if(profile.stamp&&unchanged(profile))return false;const inspected=await inspect('embedding',profile.location);Object.assign(profile,inspected);return true;}
 save(){const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify({profiles:this.profiles.filter(p=>!p.builtin),active:this.active,settings:this.settings,settingsVersion:2},null,2));fs.renameSync(temp,this.file);}
 async operation(message,fn){if(this.busy)throw new Error('A model operation is already running');this.busy=true;this.message=message;this.notify();try{await fn();}finally{this.busy=false;this.notify();}return this.snapshot();}
 async add(role,location){return this.operation('Checking the local model files…',async()=>{const inspected=await inspect(role,location);const id=`model:${role}:${inspected.fingerprint.slice(0,16)}`;const existing=this.profiles.find(p=>p.id===id);if(existing)Object.assign(existing,inspected);else{if(this.profiles.length>=32)throw new Error('Remove an unused model before adding another');this.profiles.push({id,role,name:path.basename(inspected.location).replace(/\.gguf$/i,'').slice(0,120),builtin:false,...inspected});}this.message='Model added. Choose Test & use to check compatibility.';this.save();return this.snapshot();});}
 async activate(role,id,limits={}){if(!['embedding','reasoning'].includes(role))throw new Error('Unknown model role');return this.operation('Testing the selected model on this PC…',async()=>{
  const requested=options(limits,this.settings);const settings={...this.settings,...Object.fromEntries((role==='embedding'?['queryPrefix','documentPrefix']:['threads','context']).map(key=>[key,requested[key]]))};if(role==='reasoning'&&id==='off'){this.active.reasoning='off';this.settings=settings;this.warning=null;this.message='Interpretation is off. Embedding search remains available.';this.save();return this.snapshot();}
  const profile=this.profiles.find(p=>p.id===id&&p.role===role);if(!profile)throw new Error('Choose an available model');const inspected=profile.builtin?{}:await inspect(role,profile.location);const candidate={...profile,...inspected};
  const priorActive={...this.active},priorSettings={...this.settings},priorProfile={...profile};const start=Date.now();try{const result=await this.probe(candidate,settings);if(!result?.ok)throw new Error('The model did not pass the compatibility check');Object.assign(profile,inspected,{validatedAt:new Date().toISOString(),lastTest:{...result,elapsedMs:Date.now()-start}});this.active[role]=profile.id;this.settings=settings;this.warning=null;this.message='Compatibility check passed. The selected model is active.';this.save();return this.snapshot();}catch(e){this.active=priorActive;this.settings=priorSettings;Object.assign(profile,priorProfile);profile.lastTest={ok:false,message:String(e.message).slice(0,500),elapsedMs:Date.now()-start};this.message='Compatibility check failed. Your previous model is still selected.';try{this.save();}catch{}throw new Error(this.message+' '+e.message);}
 });}
 reset(){if(this.busy)throw new Error('Wait for the model check to finish');this.active={embedding:'embedding:minilm',reasoning:'reasoning:qwen3',chat:null};this.settings={...DEFAULTS};this.warning=null;this.message='Bundled defaults restored.';this.save();this.notify();return this.snapshot();}
 remove(id){if(this.busy)throw new Error('Wait for the model check to finish');const p=this.profiles.find(p=>p.id===id);if(!p||p.builtin||Object.values(this.active).includes(id))throw new Error('Only inactive custom models can be removed');this.profiles=this.profiles.filter(p=>p.id!==id);this.save();this.notify();return this.snapshot();}
 // Chat may have its own, usually larger, model so that search keeps the faster one. Passing null shares the search model again.
 async activateChat(id){return this.operation('Testing the chat model on this PC…',async()=>{
  if(id==null){const prior=this.active.chat;this.active.chat=null;try{this.save();}catch(e){this.active.chat=prior;throw new Error('The Chat model preference could not be saved. Your previous model is still selected. '+e.message);}this.message='Chat uses the search model again.';return;}
  const profile=this.profiles.find(p=>p.id===id&&p.role==='reasoning');if(!profile)throw new Error('Choose an available model');const inspected=profile.builtin?{}:await inspect('reasoning',profile.location),start=Date.now();
  const priorActive={...this.active},priorProfile={...profile};
  try{const result=await this.probe({...profile,...inspected},this.settings);if(!result?.ok)throw new Error('The model did not pass the compatibility check');Object.assign(profile,inspected,{validatedAt:new Date().toISOString(),lastTest:{...result,elapsedMs:Date.now()-start}});this.active.chat=profile.id;this.warning=null;this.message=profile.name+' passed its check and now answers in Chat.';this.save();}
  catch(e){this.active=priorActive;Object.assign(profile,priorProfile);profile.lastTest={ok:false,message:String(e.message).slice(0,500),elapsedMs:Date.now()-start};this.message='The Chat model could not be selected. Chat keeps its current model.';try{this.save();}catch{}throw new Error(this.message+' '+e.message);}
 });}
 config(role,profile=this.profiles.find(p=>p.id===this.active[role]),settings=this.settings){if(role!=='embedding'&&!profile)return null;return role!=='embedding'?{modelFile:profile.location,name:profile.name,threads:settings.threads,context:settings.context}:{modelPath:profile.location,name:profile.name,dtype:profile.dtype||'q8',cacheKey:crypto.createHash('sha256').update([profile.fingerprint,settings.queryPrefix,settings.documentPrefix].join('\0')).digest('hex'),queryPrefix:settings.queryPrefix,documentPrefix:settings.documentPrefix};}
}
module.exports={ModelStore,inspect,options,unchanged,DOWNLOADS};
