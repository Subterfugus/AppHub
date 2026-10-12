// Development only: renders assets/apphub.svg to apphub.png and a multi-size apphub.ico.
// Run with Electron: node_modules/electron/dist/electron.exe scripts/make-icon.cjs
const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
const assets=path.resolve(__dirname,'../assets'),sizes=[16,20,24,32,40,48,64,128,256];
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{try{
 const svg=fs.readFileSync(path.join(assets,'apphub.svg'),'utf8');
 const win=new BrowserWindow({show:false,width:512,height:512,useContentSize:true,transparent:true,frame:false,webPreferences:{offscreen:true,sandbox:true}});
 await win.loadURL('data:text/html,'+encodeURIComponent('<body style="margin:0;background:transparent;overflow:hidden"><img style="display:block;width:512px;height:512px" src="data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')+'">'));
 await new Promise(r=>setTimeout(r,400));
 const full=(await win.webContents.capturePage()).resize({width:512,height:512,quality:'best'});
 fs.writeFileSync(path.join(assets,'apphub.png'),full.toPNG());
 // An .ico is a directory of PNG images; every size here is stored as PNG.
 const images=sizes.map(size=>({size,data:full.resize({width:size,height:size,quality:'best'}).toPNG()}));
 const header=Buffer.alloc(6);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);
 let offset=6+16*images.length;const entries=images.map(({size,data})=>{const e=Buffer.alloc(16);e.writeUInt8(size===256?0:size,0);e.writeUInt8(size===256?0:size,1);e.writeUInt16LE(1,4);e.writeUInt16LE(32,6);e.writeUInt32LE(data.length,8);e.writeUInt32LE(offset,12);offset+=data.length;return e;});
 fs.writeFileSync(path.join(assets,'apphub.ico'),Buffer.concat([header,...entries,...images.map(i=>i.data)]));
 console.log('Wrote apphub.png and apphub.ico ('+sizes.join(', ')+')');app.exit(0);
}catch(error){console.error(error);app.exit(1);}});
