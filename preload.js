const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onSaveReplay: (cb) => ipcRenderer.on('save-replay', cb),
  saveBuffer: (arrayBuffer) => ipcRenderer.send('save-buffer', arrayBuffer),
  onSaveComplete: (cb) => ipcRenderer.on('save-buffer-complete', (e, args) => cb(args)),
  listRecordings: () => ipcRenderer.invoke('list-recordings'),
});
