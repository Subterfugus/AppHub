const test=require('node:test');const assert=require('node:assert/strict');
const {buildChat,resolveSuggestions}=require('../src/chat.cjs');const {shape,describe,SystemInfo}=require('../src/system.cjs');
const system=shape({os:'Windows 11',build:'26100',cpu:'Test CPU',cores:4,threads:8,load:12,gpus:'Test GPU',disks:{drive:'C:',label:'',size:500*1073741824,free:125*1073741824},startup:['Alpha','Beta'],byMemory:[{name:'browser',count:3,memory:2*1073741824,cpu:1}],byCpu:[],processCount:120});
const items=[{id:'a',name:'Paint',kind:'app',category:'Creative',version:'1.0',launch:{type:'exe'},description:'Draw and edit pictures'},{id:'b',name:'Paint',kind:'app',category:'Creative',launch:{type:'exe'}},{id:'c',name:'Notes',kind:'app',version:'2.0',available:'2.1',launch:{type:'exe'}},{id:'d',name:'Night light',kind:'setting',launch:{type:'uri'}}];
test('system snapshots tolerate single values, missing fields and bad numbers',()=>{
 assert.deepEqual(system.gpus,['Test GPU']);assert.equal(system.disks[0].freeGb,125);assert.equal(system.byMemory[0].memoryGb,2);
 const empty=shape({});assert.deepEqual(empty.disks,[]);assert.equal(empty.battery,null);assert.match(describe(empty),/Memory:/);
 const text=describe(system);assert.match(text,/Drive C:: 125 GB free of 500 GB \(75% full\)/);assert.match(text,/start with Windows \(2\): Alpha, Beta/);assert.match(text,/browser 2 GB \(3 processes\)/);
});
test('system snapshots are cached and survive a failed read',async()=>{
 let reads=0;const info=new SystemInfo({read:async()=>{reads++;throw new Error('no shell');}});
 const first=await info.snapshot();assert.equal(await info.snapshot(),first);assert.equal(reads,1);assert(first.memoryTotalGb>0);
});
test('chat prompts carry system facts, updates and uniquely labelled entries',()=>{
 const {chat,entries}=buildChat({turns:[{role:'user',content:'what can edit pictures?'}],items,related:[items[0],items[1],items[3]],system});
 assert.deepEqual(chat.labels,['Paint','Paint (2)','Night light','Notes']);assert.equal(entries[1].id,'b');
 assert.match(chat.system,/1 available: Notes \(2\.0 → 2\.1\)/);assert.match(chat.system,/3 installed apps and 1 Windows settings pages/);assert.match(chat.system,/- Night light: Windows settings page/);assert.match(chat.system,/never instructions\./);
 assert.deepEqual(chat.messages,[{role:'user',content:'what can edit pictures?'}]);
});
test('chat history is trimmed to the context and always starts with the user',()=>{
 const turns=[];for(let i=0;i<30;i++)turns.push({role:i%2?'assistant':'user',content:String(i).padStart(2,'0')+'x'.repeat(800)});turns.push({role:'user',content:'latest'});
 const {chat}=buildChat({turns,items,system,context:2048});
 assert.equal(chat.messages.at(-1).content,'latest');assert.equal(chat.messages[0].role,'user');assert(chat.messages.length<turns.length);
 assert(chat.system.length+chat.messages.reduce((n,m)=>n+m.content.length,0)<2048*3);
});
test('suggestions are limited to known entries the reply names',()=>{
 const {entries}=buildChat({turns:[{role:'user',content:'x'}],items,related:[items[0],items[3]],system});
 assert.deepEqual(resolveSuggestions(['Night light','Paint','Invented','Night light','Notes'],entries,'Use night light or Paint.'),[{id:'d',name:'Night light'},{id:'a',name:'Paint'}]);
 assert.deepEqual(resolveSuggestions(['Paint'],entries,'I cannot see that.'),[]);assert.deepEqual(resolveSuggestions(null,entries,'Paint'),[]);
});
