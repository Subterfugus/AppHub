const fs=require('node:fs');const path=require('node:path');
function createLogger(directory){return (scope,error)=>{try{
 const folder=path.join(directory(),'logs'),file=path.join(folder,'main.log');fs.mkdirSync(folder,{recursive:true});
 if(fs.existsSync(file)&&fs.statSync(file).size>1024*1024)fs.renameSync(file,path.join(folder,'main.previous.log'));
 const detail=error instanceof Error?{name:error.name,message:error.message,code:error.code,stack:error.stack}:{message:String(error)};
 fs.appendFileSync(file,JSON.stringify({time:new Date().toISOString(),scope,...detail})+'\n');
 }catch{/* Logging must never create another application error. */}};}
function monitorMainErrors(log){const fatal=(error,origin)=>log('uncaught:'+origin,error),warning=error=>log('process-warning',error);process.on('uncaughtExceptionMonitor',fatal);process.on('warning',warning);return ()=>{process.off('uncaughtExceptionMonitor',fatal);process.off('warning',warning);};}
module.exports={createLogger,monitorMainErrors};
