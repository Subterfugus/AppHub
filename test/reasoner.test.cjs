const {test}=require('node:test');
const assert=require('node:assert/strict');
const {shouldInterpret,validateAnswer,LocalReasoner}=require('../src/reasoner.cjs');
test('detailed searches use interpretation unless the name match is strong',()=>{
 assert.equal(shouldInterpret('play guitar',[]),false);
 assert.equal(shouldInterpret('play my electric guitar',[]),true);
 assert.equal(shouldInterpret('play my electric guitar',[{score:1.4}]),false);
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
test('stop before waking is safe and idempotent',()=>{
 const reasoner=new LocalReasoner({models:'unused',runtime:'unused'});
 reasoner.stop();reasoner.stop();assert.equal(reasoner.state.status,'sleeping');assert.equal(reasoner.state.pid,null);assert.equal(reasoner.pending.size,0);
});
test('first valid grounded match wins even after malformed or empty candidates',()=>{
 const candidates=[{id:'one',name:'Sound'},{id:'two',name:'Mixer'}];
 const result=validateAnswer({matches:[{id:'missing',reason:'Invalid'},{id:'one',reason:'  '},{id:'one',reason:'Adjust volume'},{id:'two',reason:'Weak extra'}]},candidates);
 assert.deepEqual(result.matches,[{id:'one',name:'Sound',reason:'Adjust volume'}]);
});
