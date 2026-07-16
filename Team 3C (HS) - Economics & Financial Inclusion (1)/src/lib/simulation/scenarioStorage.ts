import type { SimulationInput } from "@/lib/simulation/types";

const STORAGE_KEY = "pp_simulation_scenarios";

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  input: SimulationInput;
}

export function listScenarios(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScenario[]) : [];
  } catch {
    return [];
  }
}

export function saveScenario(name: string, input: SimulationInput): SavedScenario {
  const scenario: SavedScenario = { id: `scenario-${Date.now()}`, name, savedAt: new Date().toISOString(), input };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([scenario, ...listScenarios()]));
  return scenario;
}

export function deleteScenario(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listScenarios().filter((s) => s.id !== id)));
}
