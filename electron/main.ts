import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PING_CONFIG } from '../config/config';
import { exec } from 'node:child_process';
import { platform } from 'node:os';
import { parseTracerouteOutput } from './utils/parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;
let isRunning = false;

// Cross-platform command selector
const getTracerouteCommand = (host: string) => {
  const isWindows = platform() === 'win32';
  const hops = PING_CONFIG.MAX_HOPS;
  const timeout = PING_CONFIG.TIMEOUT_MS;

  // Windows: -d (skip DNS lookup), -h (max hops), -w (timeout ms)
  // Linux/macOS: -n (skip DNS lookup), -m (max hops), -w (timeout seconds)
  return isWindows
    ? `tracert -d -h ${hops} -w ${timeout} ${host}`
    : `traceroute -n -m ${hops} -w ${Math.ceil(timeout / 1000)} ${host}`;
};

// 🚀 Core Diagnostic Execution
const runTracerouteDiagnostic = () => {
  if (isRunning) return;
  isRunning = true;

  const command = getTracerouteCommand(PING_CONFIG.TARGET_HOST);

  exec(command, { maxBuffer: 1024 * 500 }, (error, stdout, stderr) => {
    isRunning = false;

    if (error && !stdout) {
      if (win) {
        win.webContents.send('ping-update', {
          status: 'failed',
          failureOrigin: 'local',
          message: 'Failed to run diagnostic. Check your network adapter.',
          totalHops: 0,
          avgLatency: 0,
          rawOutput: stderr || error.message,
        });
      }
      return;
    }

    const results = parseTracerouteOutput(stdout);

    if (win) {
      win.webContents.send('ping-update', results);
    }
  });
};

// 📩 IPC Handlers
ipcMain.on('start-test', () => {
  runTracerouteDiagnostic();
});

ipcMain.on('close-app', () => {
  app.quit();
});

const createWindow = () => {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
};

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  isRunning = false;
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
