import { runMonteCarloBatch, type MonteCarloResult } from "@/lib/simulation/monteCarlo";
import type { SimulationInput } from "@/lib/simulation/types";

export interface MonteCarloWorkerRequest {
  input: SimulationInput;
  runs: number;
  stdDev: number;
}

// Runs 200-500 full simulations off the main thread so dragging a slider
// with Monte Carlo mode on never freezes the UI. Vite bundles this as a
// separate worker chunk when imported via the `?worker` suffix.
self.onmessage = (event: MessageEvent<MonteCarloWorkerRequest>) => {
  const { input, runs, stdDev } = event.data;
  const result: MonteCarloResult = runMonteCarloBatch(input, runs, stdDev);
  self.postMessage(result);
};
