import { BrowserWindow, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exec } from "node:child_process";
import { platform } from "node:os";
//#region config/config.ts
var PING_CONFIG = {
  /** Server used to test the connection */
  TARGET_HOST: "1.1.1.1",
  /** Limit to first 3 crucial hops (Router, CMTS/Hub, ISP Edge).
   * If it's necessary to test troubles like CloudFare outages, this number can be increased */
  MAX_HOPS: 3,
  /** Timeout per probe in ms to prevent app hanging */
  TIMEOUT_MS: 1e3,
};
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var ISP_FAILURE_MOCK = {
  ispFailureWindows: `
  Tracing route to 1.1.1.1 over a maximum of 3 hops

    1    <1 ms    <1 ms    <1 ms  192.168.1.1
    2     *        *        *     Request timed out.
    3     *        *        *     Request timed out.
  `,
  ispFailureUnix: `
    traceroute to 1.1.1.1 (1.1.1.1), 3 hops max, 52 byte packets
     1  192.168.1.1  1.120 ms  0.980 ms  0.940 ms
     2  * * *
     3  * * *
  `,
};
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;
var win;
var isRunning = false;
var getTracerouteCommand = (host) => {
  const isWindows = platform() === "win32";
  const hops = PING_CONFIG.MAX_HOPS;
  const timeout = PING_CONFIG.TIMEOUT_MS;
  return isWindows
    ? `tracert -d -h ${hops} -w ${timeout} ${host}`
    : `traceroute -n -m ${hops} -w ${Math.ceil(timeout / 1e3)} ${host}`;
};
var parseTracerouteOutput = (rawOutput) => {
  const lines = rawOutput.split("\n").filter((line) => line.trim().length > 0);
  const hopRegex = /^\s*(\d+)/;
  const hops = [];
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
  let status = "stable";
  let failureOrigin = "none";
  let message = "Your internet connection is stable!";
  if (hops.length === 0 || hops[0]?.timedOut) {
    status = "failed";
    failureOrigin = "local";
    message =
      "Cannot communicate with your local router. Check your Wi-Fi or Ethernet connection.";
  } else {
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
var runTracerouteDiagnostic = () => {
  if (isRunning) return;
  isRunning = true;
  exec(
    getTracerouteCommand(PING_CONFIG.TARGET_HOST),
    { maxBuffer: 1024 * 500 },
    (error, stdout, stderr) => {
      isRunning = false;
      if (error && !stdout) {
        if (win)
          win.webContents.send("ping-update", {
            status: "failed",
            failureOrigin: "local",
            message: "Failed to run diagnostic. Check your network adapter.",
            totalHops: 0,
            avgLatency: 0,
            rawOutput: stderr || error.message,
          });
        return;
      }
      const results = parseTracerouteOutput(ISP_FAILURE_MOCK.ispFailureUnix);
      if (win) win.webContents.send("ping-update", results);
    },
  );
};
ipcMain.on("start-test", () => {
  runTracerouteDiagnostic();
});
ipcMain.on("close-app", () => {
  app.quit();
});
var createWindow = () => {
  win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: { preload: path.join(__dirname, "preload.mjs") },
  });
  if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(RENDERER_DIST, "index.html"));
};
app.on("window-all-closed", () => {
  isRunning = false;
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
