import { BrowserWindow, app, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Socket } from "node:net";
//#region config/config.ts
var PING_CONFIG = {
	/** Server used to test the connection */
	TARGET_HOST: "1.1.1.1",
	/** Port 80 allows standard TCP connection checks without admin rights */
	TARGET_PORT: 80,
	/** How long (in ms) to wait for a reply before declaring a packet 'dropped' */
	PING_TIMEOUT: 1500,
	/** Time (in ms) to wait between individual ping requests */
	PING_DELAY: 2e3,
	/** The threshold of consecutive failures before the UI should alert the user */
	DISCONNECT_THRESHOLD: 5,
	/** Number of successfully received handshakes to stop the program */
	SUCCESS_BOUNDARY: 50,
	/** Number of consecutive failures to stop the program */
	CONSECUTIVE_FAILURES: 15
};
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var win;
var isRunning = false;
var stats = {
	totalSent: 0,
	packetsReceived: 0,
	packetsDropped: 0,
	consecutiveFailures: 0,
	currentLatency: null,
	avgLatency: 0,
	status: "running"
};
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function measurePing() {
	return new Promise((resolve, reject) => {
		const socket = new Socket();
		const startTime = process.hrtime();
		socket.setTimeout(PING_CONFIG.PING_TIMEOUT);
		socket.connect(PING_CONFIG.TARGET_PORT, PING_CONFIG.TARGET_HOST, () => {
			const diff = process.hrtime(startTime);
			const latencyMs = Math.round(diff[0] * 1e3 + diff[1] / 1e6);
			socket.destroy();
			resolve(latencyMs);
		});
		socket.on("timeout", () => {
			socket.destroy();
			reject(/* @__PURE__ */ new Error("Timeout"));
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
	while (isRunning && stats.packetsReceived < PING_CONFIG.SUCCESS_BOUNDARY && stats.consecutiveFailures < PING_CONFIG.CONSECUTIVE_FAILURES) {
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
		if (win) win.webContents.send("ping-update", { ...stats });
		if (stats.packetsReceived < PING_CONFIG.SUCCESS_BOUNDARY && stats.consecutiveFailures < PING_CONFIG.CONSECUTIVE_FAILURES) await delay(PING_CONFIG.PING_DELAY);
	}
	isRunning = false;
	const successRate = stats.totalSent > 0 ? stats.packetsReceived / stats.totalSent * 100 : 0;
	if (stats.packetsReceived === 0 || stats.consecutiveFailures >= 15) stats.status = "failed";
	else if (successRate < 80) stats.status = "degraded";
	else stats.status = "stable";
	if (win) win.webContents.send("ping-update", { ...stats });
}
ipcMain.on("start-ping-test", () => {
	if (!isRunning) {
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
		webPreferences: { preload: path.join(__dirname, "preload.mjs") }
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
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
