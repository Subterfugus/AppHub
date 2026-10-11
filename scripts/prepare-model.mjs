// Development setup only. Pin every file used by the bundled embedding model.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const revision='751bff37182d3f1213fa05d7196b954e230abad9';
const files=[
 ['config.json',650,'7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7'],
 ['tokenizer.json',711661,'da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0'],
 ['tokenizer_config.json',366,'9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3'],
 ['onnx/model_quantized.onnx',22972370,'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1']
];
const location=path.join(root,'models/Xenova/all-MiniLM-L6-v2');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const verifyOnly=process.argv.includes('--verify-only');
for(const [name,size,digest] of files){
 const target=path.join(location,name);
 if(fs.existsSync(target)&&fs.statSync(target).size===size&&hash(fs.readFileSync(target))===digest)continue;
 if(verifyOnly)throw new Error('Missing or mismatched bundled model file: '+name);
 const response=await fetch(`https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/${revision}/${name}`,{signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw new Error('Model download failed: '+response.status+' '+name);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==size||hash(bytes)!==digest)throw new Error('Model checksum did not match: '+name);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const part=target+'.partial';fs.writeFileSync(part,bytes);fs.renameSync(part,target);
}
console.log('All four pinned MiniLM files verified'+(verifyOnly?'; no downloads or writes.':'.'));
if(!verifyOnly){
 const {pipeline,env}=await import('@huggingface/transformers');
 env.cacheDir=path.join(root,'models');env.localModelPath=env.cacheDir+path.sep;env.allowRemoteModels=false;env.allowLocalModels=true;
 const model=await pipeline('feature-extraction',location,{dtype:'q8',device:'cpu',local_files_only:true});
 try{const out=await model('Find applications and Windows settings',{pooling:'mean',normalize:true});console.log('Verified local inference:',out.dims);}finally{await model.dispose();}
}
