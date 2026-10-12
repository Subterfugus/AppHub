const {test}=require('node:test');
const assert=require('node:assert/strict');
const {shouldInterpret,validateAnswer,LocalReasoner}=require('../src/reasoner.cjs');
test('every search uses interpretation unless it names an app exactly or by prefix',()=>{
 assert.equal(shouldInterpret('g',[]),false);
 assert.equal(shouldInterpret('guitar',[]),true);
 assert.equal(shouldInterpret('play my electric guitar',[]),true);
 assert.equal(shouldInterpret('play my electric guitar',[{score:1.45}]),true);
 assert.equal(shouldInterpret('chrome',[{score:1.65}]),false);
 assert.equal(shouldInterpret('  change   my screen brightness ',[{score:1.39}]),true);
});
test('answers accept only retrieved IDs, unique nonempty reasons and library names',()=>{
 const candidates=[{id:'one',name:'Sound'},{id:'two',name:'Mixer'}];
 const result=validateAnswer({matches:[{id:'unknown',reason:'Invented'},{id:'one',name:'Injected',reason:'  Change\nvolume\t here  '},{id:'one',reason:'Duplicate'}]},candidates);
 assert.deepEqual(result.matches,[{id:'one',name:'Sound',reason:'Change volume  here'}]);
 assert.equal(result.answer,'Sound: Change volume  here');
 assert.equal(validateAnswer({matches:[{id:'two',reason:'x'.repeat(400)}]},candidates).matches[0].reason.length,220);
});
test('incomplete, empty, and malformed outputs fail safely',()=>{
 for(const value of [null,{}, {matches:{}}])assert.throws(()=>validateAnswer(value,[]),/incomplete/);
 for(const matches of [[],[null],[{id:'x',reason:7}],[{id:'x',reason:' \n '}]])assert.deepEqual(validateAnswer({matches},[{id:'x',name:'X'}]).matches,[]);
});
test('cancel abandons pending work without unloading and is safe when idle',async()=>{
 const reasoner=new LocalReasoner({models:'unused',runtime:'unused'});reasoner.cancel();
 const sent=[];reasoner.worker={connected:true,send:m=>sent.push(m),disconnect(){}};
 const pending=new Promise((resolve,reject)=>reasoner.pending.set(1,{resolve,reject,timer:null}));
 reasoner.cancel();await assert.rejects(pending,/Search changed/);
 assert.deepEqual(sent,[{cancel:'search'}]);assert.equal(reasoner.pending.size,0);assert(reasoner.worker);
 // A search cancel leaves a chat reply running, and the reverse.
 const chat=new Promise((resolve,reject)=>reasoner.pending.set(2,{resolve,reject,timer:null,kind:'chat'}));
 reasoner.cancel();assert.equal(reasoner.pending.size,1);assert.equal(sent.length,1);
 reasoner.cancel('Stopped','chat');await assert.rejects(chat,/Stopped/);assert.deepEqual(sent[1],{cancel:'chat'});assert.equal(reasoner.pending.size,0);
 reasoner.worker=null;reasoner.stop();
});
test('stop before waking is safe and idempotent',()=>{
 const reasoner=new LocalReasoner({models:'unused',runtime:'unused'});
 reasoner.stop();reasoner.stop();assert.equal(reasoner.state.status,'sleeping');assert.equal(reasoner.state.pid,null);assert.equal(reasoner.pending.size,0);
});
test('every valid grounded match is kept in order, up to four, skipping malformed entries',()=>{
 const candidates=[{id:'one',name:'Sound'},{id:'two',name:'Mixer'}];
 const result=validateAnswer({matches:[{id:'missing',reason:'Invalid'},{id:'one',reason:'  '},{id:'one',reason:'Adjust volume'},{id:'two',reason:'Weak extra'}]},candidates);
 assert.deepEqual(result.matches,[{id:'one',name:'Sound',reason:'Adjust volume'},{id:'two',name:'Mixer',reason:'Weak extra'}]);
 const many=Array.from({length:6},(_,i)=>({id:'c'+i,name:'App '+i}));
 assert.equal(validateAnswer({matches:many.map(c=>({id:c.id,reason:'Fits'}))},many).matches.length,4);
});

test('replies are left exactly as written unless one long sentence loops',()=>{
 const {withoutRepeats}=require('../src/reasoner.cjs');
 const list='Here is the list:\n\n1. .NET Runtime - 1 error: a profiling problem at 4.1 GB.\n2. Is it serious? No... not really!\n- Proton VPN (ProtonVPN.Launcher.exe): starts with Windows for this user.\n- Spotify (Spotify.exe): starts with Windows for this user.\n- Steam (steam.exe): starts with Windows for this user.\nYou can turn these off in Settings. You can turn these off in Settings.';
 assert.deepEqual(withoutRepeats(list),{text:list,looping:false});assert.deepEqual(withoutRepeats('  Short. Short. Short. Short.  '),{text:'Short. Short. Short. Short.',looping:false});
 const loop='No updates are available. If you need to check manually, open Settings and look under Windows Update.';
 assert.deepEqual(withoutRepeats(loop+' If you need to check manually, open Settings and look under Windows Update. If you need to check manually, open Settings and look under Windows Update. If you need'),{text:loop,looping:true});
});
