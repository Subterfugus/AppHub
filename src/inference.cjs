// Every inference pipeline uses this shared lane. A replacement cannot load until
// the previous worker and its native server have actually exited.
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stopped=()=>new Error('Stopped');
class InferenceCoordinator{
 constructor({engines=()=>[],alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}},timeoutMs=12000,pollMs=25}={}){Object.assign(this,{engines,alive,timeoutMs,pollMs});this.tail=Promise.resolve();this.retiring=new Set();this.residents=new Set();this.stops=new WeakMap();}
 run(valid,task){const result=this.tail.then(async()=>{if(!valid())throw stopped();return task();});this.tail=result.catch(()=>{});return result;}
 retire(engine){
  if(!engine)return Promise.resolve();const previous=this.stops.get(engine);if(previous)return previous;
  const worker=engine.worker,pids=[...new Set([worker?.pid,engine.state?.pid,engine.state?.serverPid].filter(pid=>Number.isInteger(pid)&&pid>0))];
  let exited=!worker||worker.exitCode!=null||worker.signalCode!=null;worker?.once?.('exit',()=>{exited=true;});
  engine.stop();if(!pids.length&&exited){this.residents.delete(engine);return Promise.resolve();}this.residents.add(engine);
  const done=(async()=>{const deadline=Date.now()+this.timeoutMs;while((!exited&&worker?.pid&&this.alive(worker.pid))||pids.some(pid=>this.alive(pid))){if(Date.now()>=deadline)throw new Error('The previous local model is still releasing memory. Restart AppHub before loading another model.');await delay(this.pollMs);}})();
  this.retiring.add(done);this.stops.set(engine,done);
  done.then(()=>{this.retiring.delete(done);this.residents.delete(engine);this.stops.delete(engine);},()=>{this.retiring.delete(done);});
  // Retirement may begin from a synchronous preference change; drain() still
  // observes failures without creating an unhandled rejection in the meantime.
  done.catch(()=>{});return done;
 }
 async drain(){await Promise.all([...this.retiring]);}
 async select(engine,valid=()=>true){
  if(!valid())throw stopped();const others=[...new Set([...this.engines(),...this.residents].filter(other=>other&&other!==engine))];
  await Promise.all(others.map(other=>this.retire(other)));await this.drain();if(!valid())throw stopped();
 }
 stopAll(){return Promise.all([...new Set([...this.engines(),...this.residents].filter(Boolean))].map(engine=>this.retire(engine)));}
}
// Stop settles a lookup wait immediately, even if a shared read-only collection
// continues for another consumer. Its late result cannot restart inference.
function cancellable(promise,signal){
 if(signal.aborted){Promise.resolve(promise).catch(()=>{});return Promise.reject(stopped());}
 return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(stopped());};signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});
}
module.exports={InferenceCoordinator,cancellable};
