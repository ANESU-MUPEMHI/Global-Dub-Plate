/**
 * Global Dub Plate - Electron Native Desktop Application
 * Created by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = 3333;

function startInternalServer(callback) {
  // Check if server is already running on port 3333
  const req = http.get(`http://localhost:${PORT}`, () => {
    console.log('Internal server already running on port', PORT);
    if (callback) callback();
  });

  req.on('error', () => {
    console.log('Booting embedded Global Dub Plate server...');
    try {
      require('../server.js');
      setTimeout(() => {
        if (callback) callback();
      }, 500);
    } catch (err) {
      console.error('Failed to start embedded server:', err);
      if (callback) callback();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'Global Dub Plate DAW',
    backgroundColor: '#11141c',
    darkTheme: true,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'ultra-dark',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      backgroundThrottling: false // Keep audio synthesis active even when minimized/tabbed out
    },
    icon: path.join(__dirname, '..', 'build', 'AppIcon.icns')
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAppMenu();
}

function setupAppMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Bounce Master WAV...',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow?.webContents.executeJavaScript('document.getElementById("daw-btn-bounce-master")?.click()');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Playlist Arrangement',
          accelerator: 'F5',
          click: () => {
            mainWindow?.webContents.executeJavaScript('togglePlaylistArrangement()');
          }
        },
        {
          label: 'Mixer Console (Floating)',
          accelerator: 'F9',
          click: () => {
            mainWindow?.webContents.executeJavaScript('toggleMixerConsole()');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Transport',
      submenu: [
        {
          label: 'Play / Stop',
          accelerator: 'Space',
          click: () => {
            mainWindow?.webContents.executeJavaScript('document.getElementById("daw-btn-play")?.click()');
          }
        },
        {
          label: 'Arm to Record',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.executeJavaScript('document.getElementById("daw-btn-rec")?.click()');
          }
        },
        {
          label: 'Metronome Click',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow?.webContents.executeJavaScript('document.getElementById("fl-btn-metronome")?.click()');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Global Dub Plate',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Global Dub Plate DAW',
              message: 'Global Dub Plate Digital Audio Workstation v1.0.0',
              detail: 'This project was made by Adrian Anesu Mupemhi for Jahvisions, Benjamin Music & Terence Taona Technologies.\nOwner: Adrian Anesu Mupemhi | Contact: +2772442 5958 | Address: 34 Derby Road, Kensington, Johannesburg, South Africa, 2094 | Email: mupemhianesu@gmail.com'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Low-latency WebAudio and GPU acceleration flags
app.commandLine.appendSwitch('enable-audio-service-sandbox', 'false');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');

app.whenReady().then(() => {
  startInternalServer(() => {
    createMainWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
