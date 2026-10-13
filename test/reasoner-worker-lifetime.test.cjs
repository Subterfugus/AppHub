const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');const {EventEmitter}=require('node:events');
const source=fs.readFileSync(path.join(__dirname,'../src/reasoner-worker.cjs'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({timeoutGpu=false,deferPort=false,sendThrows=false,fastStop=false}={}){
 const children=[],messages=[],exitCalls=[],ports=[],timers=new Set();let clock=0,maxResident=0;
 const processMock=new EventEmitter();Object.assign(processMock,{connected:true,env:{APPHUB_RUNTIME:'runtime',APPHUB_MODELS:'models'},exit:code=>exitCalls.push(code),send:(message,callback)=>{if(sendThrows)throw Error('channel closed');messages.push(message);callback?.(Object.assign(Error('IPC gone'),{code:'ERR_IPC_CHANNEL_CLOSED'}));}});
 const mockRequire=id=>id==='node:child_process'?{spawn:(_exe,args)=>{const child=new EventEmitter();Object.assign(child,{pid:100+children.length,stderr:new EventEmitter(),args,kills:[],kill(signal){this.kills.push(signal||'SIGTERM');return true;}});children.push(child);child.once('exit',()=>{child.exited=true;});maxResident=Math.max(maxResident,children.filter(c=>!c.exited).length);return child;}}:id==='node:net'?{createServer:()=>{const socket=new EventEmitter();socket.address=()=>({port:3000+ports.length});socket.close=callback=>callback();socket.listen=(_port,_host,callback)=>{ports.push(callback);if(!deferPort)callback();};return socket;}}:id==='node:fs'?{existsSync:()=>true}:id==='./reasoner.cjs'?{validateAnswer:()=>{},withoutRepeats:text=>({text})}:require(id);
 const context=vm.createContext({require:mockRequire,process:processMock,AbortSignal,AbortController,TextDecoder,console,Date:{now:()=>{clock+=timeoutGpu&&children.length===1?90001:1;return clock;}},fetch:async()=>({ok:true}),setTimeout:(callback,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);callback();},fastStop&&ms===3000?5:ms);timers.add(timer);return timer;},clearTimeout:timer=>{clearTimeout(timer);timers.delete(timer);}});
 vm.runInContext(source+'\n globalThis.api={start,shutdown,stopServer,launch,send,getServer:()=>server};',context);
 return {api:context.api,children,messages,exitCalls,ports,process:processMock,maxResident:()=>maxResident,cleanup:()=>{for(const timer of timers)clearTimeout(timer);}};
}
test('GPU health timeout waits for actual child exit before spawning CPU fallback',async t=>{
 const h=harness({timeoutGpu:true});t.after(h.cleanup);const started=h.api.start();await tick();assert.equal(h.children.length,1);assert.equal(h.children[0].kills.length,1);await tick();assert.equal(h.children.length,1);
 h.children[0].emit('exit',1);await started;assert.equal(h.children.length,2);assert(h.children[1].args.includes('none'));assert.equal(h.maxResident(),1);
 h.api.shutdown();await tick();assert.equal(h.exitCalls.length,0);h.children[1].emit('exit',0);await tick();assert.deepEqual(h.exitCalls,[0]);
});
test('shutdown during free-port allocation prevents a late native spawn or fallback',async t=>{
 const h=harness({deferPort:true});t.after(h.cleanup);const started=h.api.start();await tick();h.api.shutdown();h.ports[0]();await assert.rejects(started,/Search changed/);assert.equal(h.children.length,0);assert.deepEqual(h.exitCalls,[0]);
 await assert.rejects(h.api.start(),/Search changed/);assert.equal(h.children.length,0);
});
test('shutdown while failed GPU is retiring suppresses fallback and waits for exit',async t=>{
 const h=harness({timeoutGpu:true});t.after(h.cleanup);const started=h.api.start();await tick();h.api.shutdown();await tick();assert.equal(h.children.length,1);assert.equal(h.exitCalls.length,0);h.children[0].emit('exit',1);await assert.rejects(started,/finish loading/);await tick();assert.equal(h.children.length,1);assert.deepEqual(h.exitCalls,[0]);
});
test('IPC callbacks consume send errors and synchronous channel closure cannot crash work',t=>{
 const h=harness();t.after(h.cleanup);assert.doesNotThrow(()=>h.api.send({status:'loading'}));assert.equal(h.messages.length,1);
 const closed=harness({sendThrows:true});t.after(closed.cleanup);assert.doesNotThrow(()=>closed.api.send({status:'loading'}));closed.process.emit('error',Error('IPC error'));assert.doesNotThrow(()=>closed.api.send({status:'ready'}));
});
test('cancel and shutdown messages cannot enqueue a replacement after closure',async t=>{
 const h=harness();t.after(h.cleanup);h.process.emit('message',{cancel:'chat'});h.process.emit('message',{shutdown:true});h.process.emit('message',{id:1,query:'test',candidates:[]});await tick();assert.equal(h.children.length,0);assert.deepEqual(h.exitCalls,[0]);
});
test('a child that ignores termination blocks fallback instead of overlapping residents',async t=>{
 const h=harness({timeoutGpu:true,fastStop:true});t.after(h.cleanup);const keepAlive=setInterval(()=>{},100);t.after(()=>clearInterval(keepAlive));
 await assert.rejects(h.api.start(),/previous model process has not exited/);assert.equal(h.children.length,1);assert.deepEqual(h.children[0].kills,['SIGTERM','SIGKILL']);assert.equal(h.maxResident(),1);
 h.api.shutdown();await tick();assert.equal(h.exitCalls.length,0);h.children[0].emit('exit',0);await tick();assert.deepEqual(h.exitCalls,[0]);
});
