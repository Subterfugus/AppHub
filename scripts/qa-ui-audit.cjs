const {spawn}=require('node:child_process');const path=require('node:path');
const root=path.resolve(__dirname,'..'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[path.join(root,'test/integration-ui-audit.cjs')],{cwd:root,env,windowsHide:true,stdio:'inherit'});
const timer=setTimeout(()=>{child.kill();process.exitCode=1;},60000);
child.on('error',error=>{clearTimeout(timer);console.error(error);process.exitCode=1;});
child.on('exit',(code,signal)=>{clearTimeout(timer);process.exitCode=!signal&&code===0?0:1;});
