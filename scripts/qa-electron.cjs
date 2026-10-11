const {spawn}=require('node:child_process');
const path=require('node:path');const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const report=path.resolve(root,'qa-output/integration-report.json');
const env={...process.env,APPHUB_QA_OUTPUT:path.dirname(report)};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(root,'node_modules/electron/dist/electron.exe'),[path.join(root,'test/integration-electron.cjs')],{cwd:root,env,windowsHide:true,stdio:'inherit'});
let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();console.error('Electron integration exceeded 6 minutes');process.exitCode=1;},360000);
child.on('error',e=>{clearTimeout(timer);console.error(e);process.exitCode=1;});
child.on('exit',(code,signal)=>{clearTimeout(timer);if(fs.existsSync(report)){const data=JSON.parse(fs.readFileSync(report,'utf8'));console.log(JSON.stringify(data,null,2));}process.exitCode=!timedOut&&!signal&&code===0?0:1;});
