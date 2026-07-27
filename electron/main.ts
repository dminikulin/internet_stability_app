import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Socket } from "node:net";
import { PING_CONFIG } from "../config/config";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

// --- 📡 YOUR PING ENGINE CODES ---
let isRunning = false;
const stats = {
  totalSent: 0,
  packetsReceived: 0,
  packetsDropped: 0,
  consecutiveFailures: 0,
  currentLatency: null as number | null,
  avgLatency: 0,
  status: "running", // 'running', 'stable', 'degraded', or 'failed'
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function measurePing(): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const startTime = process.hrtime();
    socket.setTimeout(PING_CONFIG.PING_TIMEOUT);

    socket.connect(PING_CONFIG.TARGET_PORT, PING_CONFIG.TARGET_HOST, () => {
      const diff = process.hrtime(startTime);
      const latencyMs = Math.round(diff[0] * 1000 + diff[1] / 1000000);
      socket.destroy();
      resolve(latencyMs);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout"));
    });
    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

async function startPingEngine() {
  isRunning = true;
  let totalLatency = 0;

  while (
    isRunning &&
    stats.packetsReceived < PING_CONFIG.SUCCESS_BOUNDARY &&
    stats.consecutiveFailures < PING_CONFIG.CONSECUTIVE_FAILURES
  ) {
    stats.totalSent++;
    try {
      const latency = await measurePing();
      stats.currentLatency = latency;
      stats.packetsReceived++;
      stats.consecutiveFailures = 0;

      totalLatency += latency;
      stats.avgLatency = totalLatency / stats.packetsReceived;
    } catch {
      stats.currentLatency = null;
      stats.packetsDropped++;
      stats.consecutiveFailures++;
    }

    // Send data updates to the Vue layout via the built-in channel
    if (win) {
      win.webContents.send("ping-update", { ...stats });
    }

    if (
      stats.packetsReceived < PING_CONFIG.SUCCESS_BOUNDARY &&
      stats.consecutiveFailures < PING_CONFIG.CONSECUTIVE_FAILURES
    ) {
      await delay(PING_CONFIG.PING_DELAY);
    }
  }

  isRunning = false;

  // Calculate success rate percentage
  const successRate =
    stats.totalSent > 0 ? (stats.packetsReceived / stats.totalSent) * 100 : 0;

  // Evaluate 3-tier health status
  if (stats.packetsReceived === 0 || stats.consecutiveFailures >= 15) {
    stats.status = "failed"; // Red: No connection / total dropout
  } else if (successRate < 80) {
    stats.status = "degraded"; // Yellow: Intermittent packet loss (<80%)
  } else {
    stats.status = "stable"; // Green: Strong connection (>=80%)
  }

  if (win) {
    win.webContents.send("ping-update", { ...stats });
  }
}

// 📩 IPC Event Listener (Triggered when user clicks START in App.vue)
ipcMain.on("start-ping-test", () => {
  if (!isRunning) {
    // Reset state counters before running a new test
    stats.totalSent = 0;
    stats.packetsReceived = 0;
    stats.packetsDropped = 0;
    stats.consecutiveFailures = 0;
    stats.currentLatency = null;
    stats.status = "running";

    startPingEngine();
  }
});

ipcMain.on("close-app", () => {
  app.quit();
});

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  isRunning = false;
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
