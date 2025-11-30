// Preload script for Electron
// This runs in a context that has access to Node.js APIs
// but the renderer process doesn't

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
});

