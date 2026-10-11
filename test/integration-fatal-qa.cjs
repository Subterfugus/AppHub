const {app,dialog}=require('electron');const fs=require('node:fs');
dialog.showErrorBox=()=>{fs.writeFileSync(process.env.APPHUB_FATAL_MARKER,'unexpected dialog');app.exit(42);};
require('./electron-qa-guard.cjs')(app);
if(process.argv.includes('--rejection'))Promise.reject(new Error('Synthetic QA rejection'));
else setImmediate(()=>{throw new Error('Synthetic QA exception');});
