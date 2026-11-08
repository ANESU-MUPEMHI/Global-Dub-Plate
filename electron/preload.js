/**
 * Global Dub Plate - Electron Preload Script
 * Exposes safe desktop bridge APIs to the DAW renderer process.
 * 
 * Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies.
 * Owner: Adrian Anesu Mupemhi | Contact: +2772442 5958 | Address: 34 Derby Road, Kensington, Johannesburg, South Africa, 2094 | Email: mupemhianesu@gmail.com
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  arch: process.arch,
  isElectron: true,
  appVersion: '1.0.0',
  creator: {
    name: 'Adrian Anesu Mupemhi',
    for: 'Jahvisions, Benjamin Music & Terence Taona Technologies',
    contact: '+2772442 5958',
    email: 'mupemhianesu@gmail.com',
    address: '34 Derby Road, Kensington, Johannesburg, South Africa, 2094'
  },
  sendNotification: (title, body) => {
    new Notification(title, { body });
  }
});
