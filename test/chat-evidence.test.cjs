const {test}=require('node:test'),assert=require('node:assert/strict');
const {buildChat}=require('../src/chat.cjs'),{shape}=require('../src/system.cjs');
const system=shape({cpu:'Test CPU'}),turns=[{role:'user',content:'What is my hardware doing?'}];
test('answers retain actual collection time, cache status, unavailable facts and bounded source text',()=>{
 const time='2026-10-12T10:00:00.000Z',lookups=[{id:'hardware',title:'hardware monitor',data:{},text:'CPU use 12%; GPU 8%.',collectedAt:Date.parse(time),expiresAt:Date.parse(time)+2500,cached:true,available:true},{id:'events',title:'recent errors',data:null,text:'Unavailable: Windows did not expose recent errors.',collectedAt:time,available:false,error:{message:'Unavailable'}}];
 const result=buildChat({turns,items:[],system,lookups});
 const [hardware,failed]=result.evidence;assert.equal(hardware.collectedAt,time);assert.equal(hardware.cached,true);assert.equal(failed.available,false);assert.equal(failed.error,'Unavailable');
 assert.match(result.chat.system,/2026-10-12T10:00:00.000Z; cached/);assert.match(result.chat.system,/unavailable/);assert.doesNotMatch(result.chat.system,/looked up just now/);
 assert.match(hardware.text,/CPU use 12%/);
});
test('entire prompts including fixed facts are bounded at every offered context',()=>{
 const items=Array.from({length:14},(_,i)=>({id:'a'+i,name:'Productivity app '+i,kind:'app',category:'Creative',description:'A detailed description. '.repeat(15),version:'1.0',available:'2.0'}));
 const lookups=Array.from({length:3},(_,i)=>({id:'fact'+i,title:'Detailed facts '+i,data:{},text:'Measured facts with long descriptions. '.repeat(500),available:true}));
 for(const context of [2048,4096,8192]){const result=buildChat({turns,items,related:items,system,lookups,context}),chars=result.chat.system.length+result.chat.messages.reduce((n,m)=>n+m.content.length,0);assert(chars<=Math.floor((context-result.chat.maxTokens-350)*2.5));assert(result.evidence.some(s=>s.truncated));assert.equal(result.chat.messages.at(-1).content,turns[0].content);}
});
test('excluded and skipped apps do not enter Chat update targets or bulk actions',()=>{
 const items=[{id:'a',name:'Excluded',kind:'app',available:'2',updateBlocked:true,updateBlockReason:'excluded'},{id:'b',name:'Skipped',kind:'app',available:'3',updateBlocked:true,updateBlockReason:'skipped-version'},{id:'c',name:'Eligible',kind:'app',available:'4'}];
 const result=buildChat({turns:[{role:'user',content:'Update all my apps'}],items,related:items,system});
 assert.deepEqual(result.updates,['c']);assert(!result.options.some(o=>o.type==='updates'));assert.match(result.chat.system,/1 available: Eligible/);assert.match(result.chat.system,/Excluded apps and skipped versions are not eligible/);
});
test('process buttons preserve exact action names separately from labels',()=>{
 const process={name:'Acme Editor',rawName:'Acme  Editor',count:1,memoryGb:1};
 const result=buildChat({turns:[{role:'user',content:'Close Acme Editor'}],items:[],system,lookups:[{id:'processes',title:'running programs',text:'Acme Editor',data:{hung:[],byMemory:[process],byCpu:[]}}]});
 assert.equal(result.options.find(o=>o.type==='process').processName,'Acme  Editor');
});
