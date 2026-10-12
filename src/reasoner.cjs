const {fork}=require('node:child_process');
const path=require('node:path');
// Interpret every search except one that already names an app exactly or by prefix.
function shouldInterpret(query,items){return query.trim().length>=2&&!(items[0]?.score>=1.65);}
function validateAnswer(value,candidates){
 if(!value||!Array.isArray(value.matches))throw new Error('The local model returned an incomplete answer');
 const known=new Map(candidates.map(a=>[a.id,a]));const seen=new Set();const matches=[];
 for(const m of value.matches.slice(0,20)){if(!m||!known.has(m.id)||seen.has(m.id)||typeof m.reason!=='string')continue;const reason=m.reason.replace(/[\r\n\t]+/g,' ').trim().slice(0,220);if(reason){seen.add(m.id);matches.push({id:m.id,name:known.get(m.id).name,reason});if(matches.length===4)break;}}
 return {matches,answer:matches.length?matches.map(m=>`${m.name}: ${m.reason}`).join('\n'):'I could not identify a confident match in the retrieved library entries. Try describing the task another way.'};
}
class LocalReasoner{
 constructor({models,runtime,onStatus=()=>{},idleMs=60000,config={}}){Object.assign(this,{models,runtime,onStatus,idleMs,config});this.counter=0;this.pending=new Map();this.state={status:'sleeping',message:(config.name||'Qwen3 4B')+' asleep · wakes when you search',pid:null,serverPid:null,device:null,model:config.name||'Qwen3 4B',idleSeconds:60};}
 publish(patch){this.state={...this.state,...patch};this.onStatus(this.state);}
 start(){if(this.worker)return;const w=this.worker=fork(path.join(__dirname,'reasoner-worker.cjs'),[],{windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],env:{...process.env,ELECTRON_RUN_AS_NODE:'1',APPHUB_MODELS:this.models,APPHUB_RUNTIME:this.runtime,APPHUB_REASONER_CONFIG:JSON.stringify(this.config)}});this.publish({status:'loading',message:'Waking '+this.state.model+' on this PC…',pid:w.pid,unloadAt:null});
  w.on('message',m=>{if(this.worker!==w)return;if(m.status)this.publish({status:m.status,message:m.message,...(m.serverPid?{serverPid:m.serverPid}:{}),...(m.device?{device:m.device}:{})});if(m.id&&typeof m.delta==='string'){try{this.pending.get(m.id)?.onDelta?.(m.delta);}catch{}return;}if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}if(!this.pending.size)this.arm();}});
  w.on('error',e=>{if(this.worker===w)this.stop(e.message);});w.on('exit',()=>{if(this.worker===w)this.stop('Local interpretation process exited');});
 }
 arm(){clearTimeout(this.timer);this.publish({unloadAt:Date.now()+this.idleMs});this.timer=setTimeout(()=>this.stop(),this.idleMs);this.timer.unref?.();}
 interpret(query,candidates){clearTimeout(this.timer);this.start();this.publish({unloadAt:null});return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>this.stop('Local interpretation timed out; search results remain available'),90000);this.pending.set(id,{resolve,reject,timer,kind:'search'});this.worker.send({id,query,candidates:candidates.slice(0,20).map(a=>({id:a.id,name:a.name,kind:a.kind,description:(a.searchText||a.description||'').slice(0,100),category:a.category}))});});}
 // Abandon in-flight requests but keep the model loaded, so the next search does not pay for a reload.
 cancel(reason='Search changed',kind='search'){const mine=[...this.pending].filter(([,p])=>(p.kind||'search')===kind);if(!mine.length)return;for(const [id,p] of mine){clearTimeout(p.timer);this.pending.delete(id);p.reject(new Error(reason));}if(this.worker?.connected){try{this.worker.send({cancel:kind});}catch{}}if(!this.pending.size)this.arm();}
 // A chat turn: the reply streams through onDelta and resolves as {reply,suggest}, where suggest holds labels from the supplied list.
 chat(chat,onDelta=()=>{}){clearTimeout(this.timer);this.start();this.publish({unloadAt:null});return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>this.stop('Local chat timed out'),180000);this.pending.set(id,{resolve,reject,timer,kind:'chat',onDelta});this.worker.send({id,chat});});}
 // Asks which lookups a chat question needs; resolves as {lookups,search}.
 plan(plan){clearTimeout(this.timer);this.start();this.publish({unloadAt:null});return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>this.stop('Local chat timed out'),120000);this.pending.set(id,{resolve,reject,timer,kind:'chat'});this.worker.send({id,plan});});}
 stop(reason='Local interpretation stopped'){clearTimeout(this.timer);const w=this.worker;this.worker=null;if(w?.connected){try{w.send({shutdown:true},()=>{});w.disconnect();}catch{w.kill();}}for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error(reason));}this.pending.clear();this.publish({status:'sleeping',message:this.state.model+' asleep · memory released',pid:null,serverPid:null,device:null,unloadAt:null});}
}
module.exports={LocalReasoner,shouldInterpret,validateAnswer};
