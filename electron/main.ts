import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PING_CONFIG } from "../config/config";
import { exec } from "node:child_process";
import { platform } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");

// Mock object designed to simulate the ISP error, FOR TESTING PURPOSES.
// const ISP_FAILURE_MOCK = {
//   ispFailureWindows: `
//   Tracing route to 1.1.1.1 over a maximum of 3 hops

//     1    <1 ms    <1 ms    <1 ms  192.168.1.1
//     2     *        *        *     Request timed out.
//     3     *        *        *     Request timed out.
//   `,
//   ispFailureUnix: `
//     traceroute to 1.1.1.1 (1.1.1.1), 3 hops max, 52 byte packets
//      1  192.168.1.1  1.120 ms  0.980 ms  0.940 ms
//      2  * * *
//      3  * * *
//   `,
// };

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let isRunning = false;

// Cross-platform command selector
const getTracerouteCommand = (host: string) => {
  const isWindows = platform() === "win32";
  const hops = PING_CONFIG.MAX_HOPS;
  const timeout = PING_CONFIG.TIMEOUT_MS;

  // Windows: -d (skip DNS lookup), -h (max hops), -w (timeout ms)
  // Linux/macOS: -n (skip DNS lookup), -m (max hops), -w (timeout seconds)
  return isWindows
    ? `tracert -d -h ${hops} -w ${timeout} ${host}`
    : `traceroute -n -m ${hops} -w ${Math.ceil(timeout / 1000)} ${host}`;
};

// Parse terminal output string
const parseTracerouteOutput = (rawOutput: string) => {
  const lines = rawOutput.split("\n").filter((line) => line.trim().length > 0);

  const hopRegex = /^\s*(\d+)/;
  const hops: { hopNumber: number; timedOut: boolean; latency: number }[] = [];

  lines.forEach((line) => {
    const match = line.match(hopRegex);
    if (match) {
      const hopNumber = parseInt(match[1], 10);
      const isTimedOut =
        line.includes("* * *") || (!line.includes("ms") && line.includes("*"));

      const msMatches = [...line.matchAll(/(\d+(?:\.\d+)?)\s*ms/gi)].map((m) =>
        parseFloat(m[1]),
      );

      const avgHopLatency =
        msMatches.length > 0
          ? Math.round(
              msMatches.reduce((acc, curr) => acc + curr, 0) / msMatches.length,
            )
          : 0;

      hops.push({
        hopNumber,
        timedOut: isTimedOut,
        latency: avgHopLatency,
      });
    }
  });

  const validLatencies = hops.filter((h) => !h.timedOut && h.latency > 0);
  const avgLatency =
    validLatencies.length > 0
      ? Math.round(
          validLatencies.reduce((sum, h) => sum + h.latency, 0) /
            validLatencies.length,
        )
      : 0;

  let status: "stable" | "degraded" | "failed" = "stable";
  let failureOrigin: "local" | "isp" | "none" = "none";
  let message = "Your internet connection is stable!";

  if (hops.length === 0 || hops[0]?.timedOut) {
    status = "failed";
    failureOrigin = "local";
    message =
      "Cannot communicate with your local router. Check your Wi-Fi or Ethernet connection.";
  } else {
    // Check if the signal dropped permanently at Hop 2 or 3
    const firstDrop = hops.find((_, index) =>
      hops.slice(index).every((remaining) => remaining.timedOut),
    );

    if (firstDrop) {
      status = "failed";
      failureOrigin = "isp";
      message = `Signal lost at Hop ${firstDrop.hopNumber}. The issue appears to be with your Internet Service Provider.`;
    } else if (hops.some((h) => h.timedOut) || avgLatency > 150) {
      status = "degraded";
      message =
        "High latency or minor packet loss detected on your network route.";
    }
  }

  return {
    status,
    failureOrigin,
    message,
    totalHops: hops.length,
    avgLatency,
    rawOutput,
  };
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
        win.webContents.send("ping-update", {
          status: "failed",
          failureOrigin: "local",
          message: "Failed to run diagnostic. Check your network adapter.",
          totalHops: 0,
          avgLatency: 0,
          rawOutput: stderr || error.message,
        });
      }
      return;
    }

    // Use for testing ISP failure, use different property depending on your system
    // const results = parseTracerouteOutput(ISP_FAILURE_MOCK.ispFailureUnix);
    
    // Use in production
    const results = parseTracerouteOutput(stdout);

    if (win) {
      win.webContents.send("ping-update", results);
    }
  });
};

// 📩 IPC Handlers
ipcMain.on("start-test", () => {
  runTracerouteDiagnostic();
});

ipcMain.on("close-app", () => {
  app.quit();
});

const createWindow = () => {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
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
};

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
