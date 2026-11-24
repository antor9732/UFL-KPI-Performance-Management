const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let phpProcess = null;
const SERVER_PORT = 8000;
const SERVER_HOST = '127.0.0.1';
const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Locate best available PHP executable
function findPhpBinary() {
  const possiblePaths = [
    // 1. Portable PHP bundled with application
    path.join(__dirname, '..', 'runtime', 'php', 'php.exe'),
    path.join(__dirname, 'runtime', 'php', 'php.exe'),
    // 2. Laragon PHP installations
    'D:\\laragon\\bin\\php\\php-8.4.13-Win32-vs17-x64\\php.exe',
    'C:\\laragon\\bin\\php\\php-8.4.13-Win32-vs17-x64\\php.exe',
    // 3. System PATH fallback
    'php',
  ];

  for (const p of possiblePaths) {
    if (p === 'php') return 'php';
    if (fs.existsSync(p)) return p;
  }
  return 'php';
}

// Check if server is already running on port
function checkServerReady(timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(SERVER_URL, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          setTimeout(check, 300);
        }
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 300);
        }
      });
      req.end();
    };
    check();
  });
}

// Start PHP background server if not already running
async function startBackendServer() {
  const isAlreadyRunning = await checkServerReady(800);
  if (isAlreadyRunning) {
    console.log(`UFL KPI backend already active on ${SERVER_URL}`);
    return true;
  }

  const phpBin = findPhpBinary();
  const publicDir = path.resolve(__dirname, '..', 'server', 'public');
  const serverDir = path.resolve(__dirname, '..', 'server');

  console.log(`Starting UFL KPI server with ${phpBin}...`);
  console.log(`Document Root: ${publicDir}`);

  // Bundled php.ini uses a relative extension_dir ("ext") which would resolve
  // against the working directory, so pass absolute paths explicitly.
  const phpArgs = [];
  if (path.isAbsolute(phpBin)) {
    const phpDir = path.dirname(phpBin);
    phpArgs.push('-c', path.join(phpDir, 'php.ini'), '-d', `extension_dir=${path.join(phpDir, 'ext')}`);
  }
  phpArgs.push('-S', `${SERVER_HOST}:${SERVER_PORT}`, '-t', publicDir);
  // Router serves /storage uploads and sends app routes to Laravel
  const router = path.join(serverDir, 'server.php');
  if (fs.existsSync(router)) phpArgs.push(router);

  phpProcess = spawn(
    phpBin,
    phpArgs,
    {
      cwd: serverDir,
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    }
  );

  phpProcess.on('error', (err) => {
    console.error('Failed to spawn PHP process:', err);
  });

  const ready = await checkServerReady(12000);
  if (!ready) {
    dialog.showErrorBox(
      'Startup Warning',
      `Could not establish connection to UFL KPI Server at ${SERVER_URL}.\nPlease ensure PHP is available on your computer.`
    );
  }
  return ready;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Utah Fashion Ltd. - KPI Performance Management System',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    autoHideMenuBar: false,
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Native Application Menu
  const menuTemplate = [
    {
      label: 'Navigation',
      submenu: [
        {
          label: 'Executive Dashboard',
          click: () => mainWindow.loadURL(`${SERVER_URL}/`),
        },
        {
          label: 'Monthly Data Entry',
          click: () => mainWindow.webContents.executeJavaScript('window.location.hash = "#data-entry"'),
        },
        {
          label: 'Personnel & Photo Manager',
          click: () => mainWindow.webContents.executeJavaScript('window.location.hash = "#personnel"'),
        },
        {
          label: 'Presentation Generator (85 Slides)',
          click: () => mainWindow.webContents.executeJavaScript('window.location.hash = "#presentation"'),
        },
        { type: 'separator' },
        {
          label: 'Open in Default Web Browser',
          click: () => shell.openExternal(SERVER_URL),
        },
        { type: 'separator' },
        { label: 'Exit Application', role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About UFL KPI Performance System',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Utah Fashion Ltd.',
              message: 'Utah Fashion Ltd. - KPI Performance Management & Automated Presentation System',
              detail:
                'Version: 1.0.0 (Windows Desktop Release)\n' +
                'Features: 85-Slide Native PowerPoint Generator, Roll-Forward Cloning, Personnel Photo Management, Weighted YTD Engine.\n' +
                'Architecture: Local-First LAN Server with Tailscale Secure Mesh.\n' +
                'Confidential - Utah Fashion Ltd.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Graceful cleanup on app shutdown
function killPhpServer() {
  if (phpProcess && phpProcess.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${phpProcess.pid} /T /F`);
      } else {
        phpProcess.kill('SIGTERM');
      }
    } catch {
      // Process may already have terminated
    }
    phpProcess = null;
  }
}

app.whenReady().then(async () => {
  await startBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  killPhpServer();
});

app.on('window-all-closed', () => {
  killPhpServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
