const {test}=require('node:test'),assert=require('node:assert/strict');
const {InferenceCoordinator,cancellable}=require('../src/inference.cjs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('replacement inference waits for both prior worker and native model memory to exit',async()=>{
 const living=new Set([10,11]),events=[];let next;
 const old={state:{pid:10,serverPid:11},stop(){events.push('stop');setTimeout(()=>living.delete(10),10);setTimeout(()=>living.delete(11),35);}},replacement={state:{},stop(){}};
 const gate=new InferenceCoordinator({engines:()=>[old,replacement],alive:pid=>living.has(pid),pollMs:2});
 next=gate.select(replacement).then(()=>{assert.equal(living.size,0);events.push('load');});
 await delay(20);assert.deepEqual(events,['stop']);await next;assert.deepEqual(events,['stop','load']);
});
test('a single inference lane serializes search/chat and drops superseded queued tasks',async()=>{
 const gate=new InferenceCoordinator(),events=[];let release,valid=true;
 const first=gate.run(()=>true,async()=>{events.push('search');await new Promise(resolve=>release=resolve);events.push('search done');});
 await delay(0);const discarded=gate.run(()=>valid,()=>events.push('obsolete'));const third=gate.run(()=>true,()=>events.push('chat'));valid=false;release();
 await first;await assert.rejects(discarded,/Stopped/);await third;assert.deepEqual(events,['search','search done','chat']);
});
test('a model which fails to exit prevents a replacement from loading',async()=>{
 const old={state:{serverPid:11},stop(){}};const gate=new InferenceCoordinator({engines:()=>[old],alive:()=>true,pollMs:1,timeoutMs:10});
 await assert.rejects(gate.select({}),/still releasing memory/);
});
test('cancel settles a slow lookup immediately and consumes its late rejection',async()=>{
 const controller=new AbortController();let reject;const lookup=new Promise((_resolve,no)=>reject=no),waiting=cancellable(lookup,controller.signal);controller.abort();
 await assert.rejects(waiting,/Stopped/);reject(new Error('Late lookup failed'));await delay(0);
 await assert.rejects(cancellable(Promise.resolve('unused'),controller.signal),/Stopped/);
});
