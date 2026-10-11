const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const config=JSON.parse(process.env.APPHUB_EMBEDDING_CONFIG||'{}');
const cacheName=config.cacheKey&&/^[a-f0-9]{64}$/.test(config.cacheKey)?`vectors-${config.cacheKey}.json`:'vectors.json';
const cacheFile=path.join(process.env.APPHUB_DATA,cacheName);
let embedder,cache={},queue=Promise.resolve();
const send=m=>{if(process.connected)process.send(m);};
async function load(){if(embedder)return;send({status:'loading',message:'Loading '+(config.name||'local search model')+'…'});const {pipeline,env}=await import('@huggingface/transformers');env.cacheDir=process.env.APPHUB_MODELS;env.localModelPath=process.env.APPHUB_MODELS+path.sep;env.allowRemoteModels=false;env.allowLocalModels=true;env.useBrowserCache=false;env.backends.onnx.wasm.numThreads=2;
 embedder=await pipeline('feature-extraction',config.modelPath||'Xenova/all-MiniLM-L6-v2',{dtype:config.dtype||'q8',device:'cpu',local_files_only:true,session_options:{intraOpNumThreads:2,interOpNumThreads:1}});
 try{if(fs.statSync(cacheFile).size<64*1024*1024){const saved=JSON.parse(fs.readFileSync(cacheFile,'utf8'));if(saved&&typeof saved==='object'&&!Array.isArray(saved))cache=saved;}}catch{}send({status:'ready',message:(config.name||'Local model')+' ready'});
}
async function vector(text){const out=await embedder(text,{pooling:'mean',normalize:true});const result=Array.from(out.data);if(result.length<16||result.length>8192||!result.every(Number.isFinite))throw new Error('The embedding model did not return a supported text vector');return result;}
async function search(m){await load();const q=await vector((config.queryPrefix||'')+m.query),vectors={},retained={};let dirty=false,count=0;
 for(const d of m.docs){const text=(config.documentPrefix||'')+d.text;const h=crypto.createHash('sha256').update(text).digest('hex');const old=cache[h];if(!Array.isArray(old)||old.length!==q.length||!old.every(Number.isFinite)){cache[h]=await vector(text);dirty=true;if(++count%30===0)send({status:'indexing',message:`Understanding new library entries · ${count}`});}vectors[d.id]=retained[h]=cache[h];}
 if(Object.keys(cache).length!==Object.keys(retained).length)dirty=true;cache=retained;
 if(dirty){fs.mkdirSync(process.env.APPHUB_DATA,{recursive:true});fs.writeFileSync(cacheFile+'.tmp',JSON.stringify(cache));fs.renameSync(cacheFile+'.tmp',cacheFile);}
 const scores={};for(const [id,v]of Object.entries(vectors))scores[id]=q.reduce((n,x,i)=>n+x*v[i],0);send({id:m.id,scores,status:'ready',message:(config.name||'Local search')+' ready · unloads after 60 seconds',dimensions:q.length});
}
process.on('disconnect',()=>process.exit(0));
process.on('message',m=>{queue=queue.then(()=>search(m)).catch(e=>send({id:m.id,error:e.message,status:'error'}));});
