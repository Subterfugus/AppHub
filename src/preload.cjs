const {contextBridge,ipcRenderer}=require('electron');
const names=['snapshot','scan','packages','search','modify','launch','reveal','addApp','addFolder','exportLibrary','importLibrary','runPlan','restorePreferences','upgrade','install','catalog','packageInfo','setAI','openData','windowAction','addModel','activateModel','resetModels','removeModel','cancelSearch','removeApp','removeFolder','cancelJob','stopJob','chat','stopChat','system','setGpu','uninstall','endProcess','setStartup','openSettings','downloadModel','chatModel','cancelDownload','removeDownload','hardware','setUpdatePolicy'];
const api=Object.fromEntries(names.map(name=>[name,(...args)=>ipcRenderer.invoke('apphub:'+name,...args)]));
api.onChange=callback=>{const listener=(_e,data)=>callback(data);ipcRenderer.on('apphub:change',listener);return ()=>ipcRenderer.removeListener('apphub:change',listener);};
contextBridge.exposeInMainWorld('apphub',api);
