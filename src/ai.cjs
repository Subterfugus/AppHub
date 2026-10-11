const {fork}=require('node:child_process');const path=require('node:path');
class LocalSearch {
 constructor({models,data,onStatus=()=>{},idleMs=60000,config={}}){Object.assign(this,{models,data,onStatus,idleMs,config});this.pending=new Map();this.state={status:'sleeping',message:'Local AI asleep · wakes when you search',pid:null,model:config.name||'MiniLM L6',idleSeconds:60};this.counter=0;}
 publish(patch){this.state={...this.state,...patch};this.onStatus(this.state);}
 start(){if(this.worker)return;const w=this.worker=fork(path.join(__dirname,'ai-worker.cjs'),[],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1',APPHUB_MODELS:this.models,APPHUB_DATA:this.data,APPHUB_EMBEDDING_CONFIG:JSON.stringify(this.config)},windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});this.publish({status:'loading',message:'Waking local AI…',pid:w.pid,unloadAt:null});
 w.on('message',m=>{if(this.worker!==w)return;if(m.id){const p=this.pending.get(m.id);if(p){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.scores);}if(!this.pending.size)this.arm();}if(m.status)this.publish({...(m.dimensions?{dimensions:m.dimensions}:{}),status:m.status,message:m.message||m.error||'Local AI ready · unloads after 60 seconds'});});
 w.on('error',e=>{if(this.worker===w)this.stop(e.message);});w.on('exit',()=>{if(this.worker===w){this.worker=null;this.fail(new Error('Local AI process exited'));this.publish({status:'sleeping',message:'Local AI asleep · memory released',pid:null,unloadAt:null});}});
 }
 fail(e){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(e);}this.pending.clear();}
 arm(){if(this.pending.size||!this.worker)return;clearTimeout(this.timer);const unloadAt=Date.now()+this.idleMs;this.publish({unloadAt});this.timer=setTimeout(()=>this.stop(),this.idleMs);this.timer.unref?.();}
 search(query,docs){clearTimeout(this.timer);this.start();this.publish({unloadAt:null});return new Promise((resolve,reject)=>{const id=++this.counter;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Local AI timed out; keyword search is still available'));if(!this.pending.size)this.stop();},180000);this.pending.set(id,{resolve,reject,timer});this.worker.send({id,query,docs});});}
 stop(){clearTimeout(this.timer);const w=this.worker;this.worker=null;w?.kill();this.fail(new Error('Local AI stopped'));this.publish({status:'sleeping',message:'Local AI asleep · memory released',pid:null,unloadAt:null});}
}
module.exports={LocalSearch};
