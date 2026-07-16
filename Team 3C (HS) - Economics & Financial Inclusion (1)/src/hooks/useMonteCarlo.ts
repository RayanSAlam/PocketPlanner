import { useEffect, useState } from "react";
import type { SimulationInput } from "@/lib/simulation/types";
import type { MonteCarloResult } from "@/lib/simulation/monteCarlo";
import { DEFAULT_RETURN_STD_DEV } from "@/lib/simulation/monteCarlo";
import type { MonteCarloWorkerRequest } from "@/workers/monteCarloWorker";
import MonteCarloWorkerCtor from "@/workers/monteCarloWorker?worker";

const RUNS = 300;
const SLOW_THRESHOLD_MS = 300;

/**
 * Runs Monte Carlo in a Web Worker so the main thread (and any slider drag
 * in progress) never freezes. `showSpinner` only flips true if the batch
 * takes longer than ~300ms — fast enough runs never flicker a loading state.
 */
export function useMonteCarlo(input: SimulationInput, enabled: boolean) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowSpinner(false);
      return;
    }

    let cancelled = false;
    const worker = new MonteCarloWorkerCtor();

    const slowTimer = setTimeout(() => {
      if (!cancelled) setShowSpinner(true);
    }, SLOW_THRESHOLD_MS);

    worker.onmessage = (event: MessageEvent<MonteCarloResult>) => {
      if (cancelled) return;
      setResult(event.data);
      setShowSpinner(false);
      clearTimeout(slowTimer);
    };

    const request: MonteCarloWorkerRequest = { input, runs: RUNS, stdDev: DEFAULT_RETURN_STD_DEV };
    worker.postMessage(request);

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      worker.terminate();
    };
  }, [input, enabled]);

  return { result: enabled ? result : null, showSpinner };
}
