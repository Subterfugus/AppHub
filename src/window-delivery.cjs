// Background events may outlive either the window or its renderer.
function createWindowDelivery({getWindow,isClosing=()=>false,log=()=>{}}){
 const report=(scope,error)=>{try{log(scope,error);}catch{}};
 function current(){if(isClosing())return null;const win=getWindow();if(!win||win.isDestroyed())return null;const contents=win.webContents;return contents&&!contents.isDestroyed()?win:null;}
 return {
  alive(){try{return !!current();}catch(error){report('window-state',error);return false;}},
  send(data){try{const win=current();if(!win)return false;win.webContents.send('apphub:change',data);return true;}catch(error){report('window-delivery',error);return false;}},
  focus(){try{const win=current();if(!win)return false;if(win.isMinimized())win.restore();win.show();win.focus();return true;}catch(error){report('window-focus',error);return false;}}
 };
}
module.exports={createWindowDelivery};
