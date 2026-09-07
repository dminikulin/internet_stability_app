// Parse terminal output string
export const parseTracerouteOutput = (rawOutput: string) => {
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
        parseFloat(m[1])
      );

      const avgHopLatency =
        msMatches.length > 0
          ? Math.round(
              msMatches.reduce((acc, curr) => acc + curr, 0) / msMatches.length
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
            validLatencies.length
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
      hops.slice(index).every((remaining) => remaining.timedOut)
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
