const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

// Path to backend executable (will be different for dev vs packaged)
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const backendPath = isDev
  ? path.join(__dirname, '..', 'backend', 'app.py')
  : process.platform === 'win32'
  ? path.join(process.resourcesPath, 'backend', 'friendly-friends-backend.exe')
  : path.join(process.resourcesPath, 'backend', 'friendly-friends-backend');

const BACKEND_PORT = 5002;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

function startBackend() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // Development: run Python script
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      backendProcess = spawn(pythonCmd, [backendPath], {
        cwd: path.join(__dirname, '..', 'backend'),
        env: {
          ...process.env,
          FLASK_ENV: 'development',
          PORT: BACKEND_PORT.toString(),
        },
        stdio: 'pipe',
      });
    } else {
      // Production: run executable
      backendProcess = spawn(backendPath, [], {
        env: {
          ...process.env,
          PORT: BACKEND_PORT.toString(),
        },
        stdio: 'pipe',
      });
    }

    let backendReady = false;

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Backend: ${output}`);
      if (output.includes('Running on') || output.includes('Serving Flask')) {
        if (!backendReady) {
          backendReady = true;
          resolve();
        }
      }
    });

    backendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Backend Error: ${output}`);
      // Some Flask output goes to stderr but isn't an error
      if (output.includes('Running on') || output.includes('Serving Flask')) {
        if (!backendReady) {
          backendReady = true;
          resolve();
        }
      }
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        // Backend crashed, try to restart after a delay
        setTimeout(() => {
          console.log('Attempting to restart backend...');
          startBackend().catch(console.error);
        }, 3000);
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backendReady) {
        console.warn('Backend startup timeout, proceeding anyway...');
        resolve();
      }
    }, 30000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== BACKEND_URL && parsedUrl.origin !== 'http://localhost:5173') {
      event.preventDefault();
    }
  });
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) {
      backendProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

