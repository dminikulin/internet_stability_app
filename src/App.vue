<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { PING_CONFIG } from "../config/config.ts";
import "./index.css";
import { CircleAlert, CircleCheckBig, CircleMinus } from "@lucide/vue";
import LoaderBar from "./Loaders/LoaderBar.vue";
// import LoaderProgress from "./Loaders/LoaderProgress.vue";
// import LoaderPolygon from "./Loaders/LoaderPolygon.vue";

type AppState = "idle" | "testing" | "finished";

interface NetworkStats {
  status: "stable" | "degraded" | "failed";
  totalSent: number;
  packetsReceived: number;
  packetsDropped: number;
  consecutiveFailures: number;
  avgLatency?: number; // Optional if latency wasn't measured on total fail
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
  window.ipcRenderer.send("start-ping-test");
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

// 📊 Computed values for stats rendering
const successRate = computed(() => {
  if (!networkStats.value || !networkStats.value.totalSent) return "0%";
  const rate =
    (networkStats.value.packetsReceived / networkStats.value.totalSent) * 100;
  return `${rate.toFixed(0)}%`;
});

const avgLatency = computed(() => {
  if (!networkStats.value?.avgLatency) return "N/A";
  return `${Math.round(networkStats.value.avgLatency)}ms`;
});
</script>

<template>
  <main
    class="container min-h-screen w-full p-6 bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100"
  >
    <div
      v-if="appState === 'idle'"
      id="start"
      class="flex flex-col gap-3 justify-center items-center text-center min-h-[75vh]"
    >
      <h1 class="text-3xl font-semibold">Check your internet stability!</h1>
      <p>
        The check will run on
        <span class="font-bold">{{ PING_CONFIG.TARGET_HOST }}.</span>
        <br />
        It will finish if no critical interruptions are found or if the signal
        is lost for a considerate amount of time.
      </p>
      <button
        @click="startDiagnostic"
        class="w-60 rounded-full px-5 py-2 box-border border-2 border-teal-900 bg-teal-700 hover:bg-teal-500 duration-300 ease-in-out"
      >
        START
      </button>
    </div>
    <div
      v-if="appState === 'testing'"
      id="loading"
      class="flex flex-col py-4 items-center min-h-[75vh]"
    >
      <p class="text-2xl text-center font-semibold">Testing connection...</p>
      <!-- <LoaderPolygon class="my-auto"></LoaderPolygon> -->
      <!-- <LoaderProgress class="my-auto"></LoaderProgress> -->
      <LoaderBar class="my-auto"></LoaderBar>
    </div>
    <div
      v-if="appState === 'finished'"
      id="results"
      class="flex flex-col items-center gap-4 min-h-[75vh]"
    >
      <CircleCheckBig
        v-if="networkStats?.status === 'stable'"
        :size="48"
        color="#00c800"
      ></CircleCheckBig>
      <CircleAlert
        v-else-if="networkStats?.status === 'degraded'"
        :size="48"
        color="#fac800"
      ></CircleAlert>
      <CircleMinus v-else :size="48" color="#fa0000"></CircleMinus>
      <p
        v-if="networkStats?.status === 'stable'"
        class="text-2xl text-center font-bold"
      >
        Your internet connection is stable!
      </p>
      <p
        v-else-if="networkStats?.status === 'degraded'"
        class="text-2xl text-center font-bold"
      >
        Your internet connection might not be stable.
      </p>
      <p v-else class="text-2xl text-center font-bold">Connection lost!</p>
      <div class="my-auto">
        <p class="text-lg">
          Success rate: <span class="font-semibold">{{ successRate }}</span>
        </p>
        <p class="text-lg">
          Average delay: <span class="font-semibold">{{ avgLatency }}</span>
        </p>
      </div>
      <div>
        <button
          @click="resetTest"
          class="rounded-full mx-10 px-5 py-2 box-border border-2 border-teal-900 bg-teal-700 hover:bg-teal-500 duration-300 ease-in-out"
        >
          Start again
        </button>
        <button
          @click="closeApp"
          class="rounded-full mx-10 px-5 py-2 box-border border-2 border-rose-900 bg-rose-700 hover:bg-rose-500 duration-300 ease-in-out"
        >
          Exit
        </button>
      </div>
    </div>
  </main>
</template>
