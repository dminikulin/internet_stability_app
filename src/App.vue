<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { PING_CONFIG } from "../config/config.ts";
import "./index.css";
import {
  CircleCheckBig,
  RouteOff,
  ServerCrash,
  CircleAlert,
} from "@lucide/vue";
import Loader from "./Loaders/Loader.vue";

type AppState = "idle" | "testing" | "finished";

interface NetworkStats {
  status: "stable" | "degraded" | "failed";
  failureOrigin?: "local" | "isp" | "none";
  message?: string;
  totalHops: number;
  avgLatency: number;
  rawOutput?: string;
}

const appState = ref<AppState>("idle");
const networkStats = ref<NetworkStats | null>(null);

const updateData = (_event: unknown, data: NetworkStats) => {
  networkStats.value = data;

  if (["stable", "degraded", "failed"].includes(data.status)) {
    appState.value = "finished";
  }
};

const startDiagnostic = () => {
  appState.value = "testing";
  // Trigger the Node loop in electron/main.ts
  window.ipcRenderer.send("start-test");
};

const resetTest = () => {
  networkStats.value = null;
  appState.value = "idle";
};

const closeApp = () => {
  window.ipcRenderer.send("close-app");
};

onMounted(() => {
  window.ipcRenderer.on("ping-update", updateData);
});

onUnmounted(() => {
  window.ipcRenderer.off("ping-update", updateData);
});

const avgLatencyDisplay = computed(() => {
  if (!networkStats.value || networkStats.value.avgLatency === 0) return "N/A";
  return `${networkStats.value.avgLatency}ms`;
});
</script>

<template>
  <main
    class="min-h-screen w-full flex items-center justify-center p-6 bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 select-none"
  >
    <!-- IDLE STATE -->
    <div
      v-if="appState === 'idle'"
      id="start"
      class="w-full max-w-sm flex flex-col items-center text-center gap-6"
    >
      <div class="space-y-3">
        <h1 class="text-2xl font-bold tracking-tight">
          Check your internet stability!
        </h1>
        <p class="text-sm">
          The check will run on
          <span class="inline-block font-mono font-semibold"
            >{{ PING_CONFIG.TARGET_HOST }}.</span
          >
        </p>
        <button
          @click="startDiagnostic"
          class="w-48 py-2 rounded-full font-medium tracking-wide text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all duration-200 cursor-pointer"
        >
          Run Test
        </button>
      </div>
    </div>

    <!-- TESTING STATE -->
    <div
      v-if="appState === 'testing'"
      id="loading"
      class="w-full max-w-sm h-64 flex flex-col items-center justify-between text-center"
    >
      <p class="text-lg font-medium text-stone-600 dark:text-stone-300">
        Testing connection...
      </p>
      <Loader class="my-auto"></Loader>
    </div>

    <!-- FINISHED STATE -->
    <div
      v-if="appState === 'finished'"
      id="results"
      class="w-full max-w-sm flex flex-col items-center text-center gap-6"
    >
      <CircleCheckBig
        v-if="networkStats?.status === 'stable'"
        :size="48"
        class="text-teal-600 dark:text-teal-400"
      ></CircleCheckBig>
      <CircleAlert
        v-else-if="networkStats?.status === 'degraded'"
        :size="48"
        class="text-amber-500 dark:text-amber-400"
      ></CircleAlert>
      <RouteOff
        v-else-if="networkStats?.failureOrigin === 'local'"
        :size="48"
        class="text-red-600 dark:text-red-500"
      ></RouteOff>
      <ServerCrash
        v-else
        :size="48"
        class="text-red-600 dark:text-red-500"
      ></ServerCrash>

      <!-- DIAGNOSTIC MESSAGE -->
      <p
        class="text-base font-medium leading-snug max-w-xs text-stone-800 dark:text-stone-200"
      >
        {{ networkStats?.message || "Diagnostic completed." }}
      </p>

      <!-- METRIC CARD -->
      <div
        class="w-full py-3 px-4 rounded-xl bg-stone-200/60 dark:bg-stone-800/60 flex items-center justify-between text-sm"
      >
        <span class="text-stone-500 dark:text-stone-400">Average Delay</span>
        <span
          class="font-mono font-semibold text-stone-900 dark:text-stone-100"
        >
          {{ avgLatencyDisplay }}
        </span>
      </div>

      <!-- ACTION BUTTONS -->
      <div class="flex items-center gap-3 w-full">
        <button
          @click="resetTest"
          class="flex-1 py-2.5 rounded-full font-medium text-sm text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all duration-200 cursor-pointer"
        >
          Retest
        </button>
        <button
          @click="closeApp"
          class="flex-1 py-2.5 rounded-full font-medium text-sm text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          Exit
        </button>
      </div>
    </div>
  </main>
</template>
