const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rank,lexical}=require('../src/search.cjs');

test('punctuation and empty queries do not create false name matches',()=>{
 const apps=[{id:'calculator',name:'Calculator'},{id:'notes',name:'Notepad'}];
 for(const query of ['!!!','   ','---','😀'])assert.deepEqual(rank(query,apps),[],query);
});

test('Unicode names match the requested app without equating unrelated names',()=>{
 const apps=[{id:'music',name:'音楽'},{id:'photos',name:'写真'}];
 assert.equal(lexical('写真',apps[1]),2);
 assert.equal(lexical('写真',apps[0]),0);
 assert.deepEqual(rank('写真',apps).map(a=>a.id),['photos']);
 assert.equal(rank('Ｆｉｒｅｆｏｘ',[{id:'browser',name:'Firefox'}])[0].score,2);
});

test('Unicode tags and distinct numbered products remain searchable',()=>{
 assert.equal(rank('仕事',[{id:'notes',name:'Notes',tags:['仕事']}])[0].id,'notes');
 const apps=[{id:'old',name:'Example 1.0'},{id:'new',name:'Example 2.0'}];
 assert.equal(rank('Example 2.0',apps)[0].id,'new');
 assert.equal(lexical('Example 2.0',apps[0])<2,true);
});
