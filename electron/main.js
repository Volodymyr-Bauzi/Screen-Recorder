const {app, BrowserWindow, globalShortcut, ipcMain} = require('electron');
const path = require('path');
const fs = require('fs');

// Directory where recordings will be stored
const RECORDINGS_DIR = path.join(app.getPath('videos'), 'ScreenRecorder');

function ensureRecordingsDir() {
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, {recursive: true});
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      additionalArguments: ['--enable-features=WebRTCPipeWireCapturer'], // For Linux
      media: {
        permission: true,
      },
    },
  });

  // Enable ALL permissions for debugging
  win.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      console.log('Permission requested:', permission);
      callback(true); // Allow all permissions temporarily for debugging
    }
  );

  // Enable DevTools in development
  win.webContents.openDevTools();

  // Enable screen capture permissions
  win.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const allowedPermissions = ['media'];
      callback(allowedPermissions.includes(permission));
    }
  );

  win.loadFile(path.join(__dirname, '..', 'index.html'));

  console.log('PATH:', path.join(__dirname, '..', 'index.html'));
  return win;
}

function registerShortcuts() {
  // Default shortcut; In production allow changing via settings.
  globalShortcut.register('CommandOrControl+Alt+S', () => {
    const focused = BrowserWindow.getAllWindows()[0];
    if (focused) {
      focused.webContents.send('save-replay');
    }
  });
}

app.whenReady().then(() => {
  ensureRecordingsDir();
  const win = createWindow();
  registerShortcuts();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC: Save blob to file
ipcMain.on('save-buffer', async (event, arrayBuffer) => {
  try {
    ensureRecordingsDir();
    const fileName = `rec_${Date.now()}.webm`;
    const filePath = path.join(RECORDINGS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    event.reply('save-buffer-complete', {success: true, filePath});
  } catch (err) {
    event.reply('save-buffer-complete', {success: false, message: err.message});
  }
});

// IPC: Request list of recordings
ipcMain.handle('list-recordings', async () => {
  ensureRecordingsDir();
  const files = fs
    .readdirSync(RECORDINGS_DIR)
    .filter((f) => f.endsWith('.webm'));
  return files
    .map((f) => ({
      name: f,
      path: path.join(RECORDINGS_DIR, f),
    }))
    .sort((a, b) => fs.statSync(b.path).mtimeMs - fs.statSync(a.path).mtimeMs);
});
