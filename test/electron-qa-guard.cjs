// Fail test processes immediately instead of opening Electron's default error dialog.
const fs=require('node:fs');
module.exports=function installFatalGuard(app,onFatal){
 let failed=false;const fail=reason=>{if(failed)return;failed=true;const error=reason instanceof Error?reason:new Error(String(reason));
  try{fs.writeSync(2,'FAIL Electron main process: '+error.stack+'\n');}catch{}
  try{onFatal?.(error);}catch{}
  app.exit(1);
 };
 process.prependListener('uncaughtException',fail);process.on('unhandledRejection',fail);
 return ()=>{process.off('uncaughtException',fail);process.off('unhandledRejection',fail);};
};
