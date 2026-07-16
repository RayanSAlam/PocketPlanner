import type { SimulationInput } from "@/lib/simulation/types";
import { runSimulation } from "@/lib/simulation/engine";

export interface SensitivityFactor {
  id: string;
  label: string;
  description: string;
  deltaNetWorth: number; // signed change in ending net worth if this lever improves
}

function endingNetWorth(input: SimulationInput): number {
  const output = runSimulation(input);
  return output[output.length - 1]?.netWorth ?? 0;
}

/**
 * Perturbs a handful of headline levers one at a time (holding everything
 * else fixed) and measures how much each one moves the ending net worth —
 * a cheap, honest stand-in for a real sensitivity analysis: "what should I
 * actually pay attention to" rather than a black-box importance score.
 *
 * Deliberately excludes income growth rate and expense inflation as levers:
 * in this engine, bucket contributions and debt extra-payments are fixed
 * user inputs rather than derived from net cash flow, so those two can
 * never move ending net worth — including them would always render a
 * misleading "$0.00 impact" instead of an honest "not applicable here".
 */
export function computeSensitivity(input: SimulationInput): SensitivityFactor[] {
  const baseline = endingNetWorth(input);
  const factors: SensitivityFactor[] = [];

  if (input.buckets.length > 0) {
    const contribUp: SimulationInput = { ...input, buckets: input.buckets.map((b) => ({ ...b, monthlyContribution: b.monthlyContribution * 1.2 })) };
    factors.push({
      id: "savings-rate",
      label: "Savings contributions",
      description: "Contributing 20% more per month to every account",
      deltaNetWorth: endingNetWorth(contribUp) - baseline,
    });

    const returnUp: SimulationInput = { ...input, buckets: input.buckets.map((b) => ({ ...b, annualReturnRate: b.annualReturnRate + 0.01 })) };
    factors.push({
      id: "return-rate",
      label: "Investment return rate",
      description: "Earning 1 percentage point more per year",
      deltaNetWorth: endingNetWorth(returnUp) - baseline,
    });
  }

  if (input.debts.length > 0) {
    const extraUp: SimulationInput = { ...input, debts: input.debts.map((d) => ({ ...d, extraPayment: d.extraPayment * 1.2 + 20 })) };
    factors.push({
      id: "extra-debt-payment",
      label: "Extra debt payments",
      description: "Paying 20% more extra toward debt each month",
      deltaNetWorth: endingNetWorth(extraUp) - baseline,
    });
  }

  return factors.sort((a, b) => Math.abs(b.deltaNetWorth) - Math.abs(a.deltaNetWorth));
}
