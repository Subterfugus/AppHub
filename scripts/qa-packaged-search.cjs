const {spawn}=require('node:child_process');const path=require('node:path');
const root=path.resolve(__dirname,'..');const packed=process.argv[2]||path.resolve(root,'dist/win-unpacked');
const env={...process.env,ELECTRON_RUN_AS_NODE:'1',APPHUB_QA_PACKAGE:packed};
const child=spawn(path.join(packed,'AppHub.exe'),[path.join(root,'test/integration-packaged-search.cjs')],{cwd:root,env,windowsHide:true,stdio:'inherit'});
let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();process.exitCode=1;console.error('Packaged search watchdog timed out');},300000);
child.on('error',e=>{clearTimeout(timer);console.error(e);process.exitCode=1;});child.on('exit',(code,signal)=>{clearTimeout(timer);process.exitCode=!timedOut&&!signal&&code===0?0:1;});
