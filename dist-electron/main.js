import { BrowserWindow as e, app as t, dialog as n, ipcMain as r } from "electron";
import { fileURLToPath as i } from "node:url";
import a from "node:path";
import { exec as o } from "node:child_process";
import { platform as s } from "node:os";
import { writeFile as c } from "node:fs/promises";
//#region config/config.ts
var l = {
	TARGET_HOST: "1.1.1.1",
	MAX_HOPS: 3,
	TIMEOUT_MS: 1e3
}, u = (e) => {
	let t = e.split("\n").filter((e) => e.trim().length > 0), n = /^\s*(\d+)/, r = [];
	t.forEach((e) => {
		let t = e.match(n);
		if (t) {
			let n = parseInt(t[1], 10), i = e.includes("* * *") || !e.includes("ms") && e.includes("*"), a = [...e.matchAll(/(\d+(?:\.\d+)?)\s*ms/gi)].map((e) => parseFloat(e[1])), o = a.length > 0 ? Math.round(a.reduce((e, t) => e + t, 0) / a.length) : 0;
			r.push({
				hopNumber: n,
				timedOut: i,
				latency: o
			});
		}
	});
	let i = r.filter((e) => !e.timedOut && e.latency > 0), a = i.length > 0 ? Math.round(i.reduce((e, t) => e + t.latency, 0) / i.length) : 0, o = "stable", s = "none", c = "Your internet connection is stable!";
	if (r.length === 0 || r[0]?.timedOut) o = "failed", s = "local", c = "Cannot communicate with your local router. Check your Wi-Fi or Ethernet connection.";
	else {
		let e = r.find((e, t) => r.slice(t).every((e) => e.timedOut));
		e ? (o = "failed", s = "isp", c = `Signal lost at Hop ${e.hopNumber}. The issue appears to be with your Internet Service Provider.`) : (r.some((e) => e.timedOut) || a > 150) && (o = "degraded", c = "High latency or minor packet loss detected on your network route.");
	}
	return {
		status: o,
		failureOrigin: s,
		message: c,
		totalHops: r.length,
		avgLatency: a,
		rawOutput: e
	};
}, d = (e, t) => {
	let n = ["Internet Stability App - Traceroute Log", `Exported: ${(/* @__PURE__ */ new Date()).toISOString()}`];
	return t && n.push(`Target: ${t}`), n.push(`Status: ${e.status}`, `Failure origin: ${e.failureOrigin ?? "none"}`, `Message: ${e.message ?? "Diagnostic completed."}`, `Hops checked: ${e.totalHops}`, `Average latency: ${e.avgLatency > 0 ? `${e.avgLatency} ms` : "N/A"}`, "", "Raw traceroute output:", e.rawOutput?.trim() || "No raw traceroute output was captured."), `${n.join("\n")}\n`;
}, f = async (e, t) => (await c(t, e, "utf8"), t), p = a.dirname(i(import.meta.url));
process.env.APP_ROOT = a.join(p, "..");
var m = process.env.VITE_DEV_SERVER_URL, h = a.join(process.env.APP_ROOT, "dist-electron"), g = a.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = m ? a.join(process.env.APP_ROOT, "public") : g;
var _, v = !1, y = (e) => {
	let t = s() === "win32", n = l.MAX_HOPS, r = l.TIMEOUT_MS;
	return t ? `tracert -d -h ${n} -w ${r} ${e}` : `traceroute -n -m ${n} -w ${Math.ceil(r / 1e3)} ${e}`;
}, b = () => {
	v || (v = !0, o(y(l.TARGET_HOST), { maxBuffer: 1024 * 500 }, (e, t, n) => {
		if (v = !1, e && !t) {
			_ && _.webContents.send("ping-update", {
				status: "failed",
				failureOrigin: "local",
				message: "Failed to run diagnostic. Check your network adapter.",
				totalHops: 0,
				avgLatency: 0,
				rawOutput: n || e.message
			});
			return;
		}
		let r = u(t);
		_ && _.webContents.send("ping-update", r);
	}));
};
r.on("start-test", () => {
	b();
}), r.on("close-app", () => {
	t.quit();
}), r.handle("export-logs", async (e, t) => {
	if (t.failureOrigin !== "isp") return {
		canceled: !0,
		error: "Logs are available only for ISP failures."
	};
	let r = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), i = await n.showSaveDialog({
		title: "Export traceroute logs",
		defaultPath: `traceroute-log-${r}.txt`,
		filters: [{
			name: "Text logs",
			extensions: ["txt"]
		}, {
			name: "All files",
			extensions: ["*"]
		}]
	});
	if (i.canceled || !i.filePath) return { canceled: !0 };
	try {
		return {
			canceled: !1,
			filePath: await f(d(t, l.TARGET_HOST), i.filePath)
		};
	} catch (e) {
		return {
			canceled: !1,
			error: e instanceof Error ? e.message : "Could not save the log file."
		};
	}
});
var x = () => {
	_ = new e({
		width: 600,
		height: 400,
		webPreferences: { preload: a.join(p, "preload.mjs") }
	}), m ? _.loadURL(m) : _.loadFile(a.join(g, "index.html"));
};
t.on("window-all-closed", () => {
	v = !1, process.platform !== "darwin" && (t.quit(), _ = null);
}), t.on("activate", () => {
	e.getAllWindows().length === 0 && x();
}), t.whenReady().then(x);
//#endregion
export { h as MAIN_DIST, g as RENDERER_DIST, m as VITE_DEV_SERVER_URL };
