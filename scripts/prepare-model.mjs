import {pipeline,env} from '@huggingface/transformers';
import path from 'node:path';
env.cacheDir=path.resolve('models');env.allowLocalModels=false;
console.log('Downloading quantized MiniLM model for offline use…');
const model=await pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{dtype:'q8',device:'cpu'});
const out=await model('Find applications and Windows settings',{pooling:'mean',normalize:true});
console.log('Verified local inference:',out.dims);await model.dispose();
