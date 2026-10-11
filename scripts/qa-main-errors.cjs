const {spawnSync}=require('node:child_process');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'.qa');fs.mkdirSync(base,{recursive:true});const scratch=fs.mkdtempSync(path.join(base,'fatal-guard-'));
for(const mode of ['--exception','--rejection']){
 const marker=path.join(scratch,mode.slice(2)+'.txt'),env={...process.env,APPHUB_FATAL_MARKER:marker};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawnSync(path.join(root,'node_modules/electron/dist/electron.exe'),[path.join(root,'test/integration-fatal-qa.cjs'),mode],{env,cwd:root,windowsHide:true,encoding:'utf8',timeout:15000});
 assert.ifError(child.error);assert.equal(child.status,1,child.stderr);assert.match(child.stderr,/FAIL Electron main process: Error: Synthetic QA/);assert.equal(fs.existsSync(marker),false);
 console.log('PASS QA '+mode.slice(2)+' exits with failure without a native error dialog');
}
