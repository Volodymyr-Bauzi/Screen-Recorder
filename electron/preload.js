const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            minWidth: 1280,
            maxWidth: 1280,
            minHeight: 720,
            maxHeight: 720,
          },
        },
      });
      return stream;
    } catch (e) {
      console.error('Screen capture error:', e);
      throw e;
    }
  },
  saveBuffer: (buffer) => ipcRenderer.send('save-buffer', buffer),
  onSaveComplete: (callback) =>
    ipcRenderer.on('save-buffer-complete', callback),
  listRecordings: () => ipcRenderer.invoke('list-recordings'),
});
