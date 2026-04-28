const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Looks premium on Mac
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the Next.js local server
  mainWindow.loadURL('http://localhost:3000');
  
  // Remove default menu for cleaner UI
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextJsServer() {
  return new Promise((resolve) => {
    // Pass the actual user data path to the Next.js process
    const env = { 
      ...process.env, 
      APP_DATA_PATH: app.getPath('userData') 
    };

    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      env,
      stdio: 'inherit'
    });

    // Wait a couple seconds for Next.js to be ready before opening the window
    // Alternatively, we could wait for a specific stdout message from server.js
    setTimeout(() => {
      resolve();
    }, 2500);
  });
}

app.whenReady().then(async () => {
  await startNextJsServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
