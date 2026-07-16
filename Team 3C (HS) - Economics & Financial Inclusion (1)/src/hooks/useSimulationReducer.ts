import { useCallback, useReducer } from "react";
import type {
  SimulationInput,
  IncomeStream,
  ExpenseItem,
  AccountBucket,
  Debt,
  LifeEvent,
  OneTimeAmount,
  SimulationSettings,
} from "@/lib/simulation/types";

export type InputAction =
  | { type: "ADD_INCOME_STREAM"; stream: IncomeStream }
  | { type: "UPDATE_INCOME_STREAM"; id: string; patch: Partial<IncomeStream> }
  | { type: "REMOVE_INCOME_STREAM"; id: string }
  | { type: "ADD_EXPENSE"; expense: ExpenseItem }
  | { type: "UPDATE_EXPENSE"; id: string; patch: Partial<ExpenseItem> }
  | { type: "REMOVE_EXPENSE"; id: string }
  | { type: "ADD_BUCKET"; bucket: AccountBucket }
  | { type: "UPDATE_BUCKET"; id: string; patch: Partial<AccountBucket> }
  | { type: "REMOVE_BUCKET"; id: string }
  | { type: "ADD_DEBT"; debt: Debt }
  | { type: "UPDATE_DEBT"; id: string; patch: Partial<Debt> }
  | { type: "REMOVE_DEBT"; id: string }
  | { type: "ADD_LIFE_EVENT"; event: LifeEvent }
  | { type: "UPDATE_LIFE_EVENT"; id: string; patch: Partial<LifeEvent> }
  | { type: "REMOVE_LIFE_EVENT"; id: string }
  | { type: "ADD_ONE_TIME_INCOME"; item: OneTimeAmount }
  | { type: "UPDATE_ONE_TIME_INCOME"; id: string; patch: Partial<OneTimeAmount> }
  | { type: "REMOVE_ONE_TIME_INCOME"; id: string }
  | { type: "ADD_ONE_TIME_EXPENSE"; item: OneTimeAmount }
  | { type: "UPDATE_ONE_TIME_EXPENSE"; id: string; patch: Partial<OneTimeAmount> }
  | { type: "REMOVE_ONE_TIME_EXPENSE"; id: string }
  | { type: "UPDATE_SETTINGS"; patch: Partial<SimulationSettings> }
  | { type: "REPLACE_ALL"; input: SimulationInput };

function inputReducer(state: SimulationInput, action: InputAction): SimulationInput {
  switch (action.type) {
    case "ADD_INCOME_STREAM":
      return { ...state, incomeStreams: [...state.incomeStreams, action.stream] };
    case "UPDATE_INCOME_STREAM":
      return { ...state, incomeStreams: state.incomeStreams.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)) };
    case "REMOVE_INCOME_STREAM":
      return { ...state, incomeStreams: state.incomeStreams.filter((s) => s.id !== action.id) };
    case "ADD_EXPENSE":
      return { ...state, expenses: [...state.expenses, action.expense] };
    case "UPDATE_EXPENSE":
      return { ...state, expenses: state.expenses.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) };
    case "REMOVE_EXPENSE":
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) };
    case "ADD_BUCKET":
      return { ...state, buckets: [...state.buckets, action.bucket] };
    case "UPDATE_BUCKET":
      return { ...state, buckets: state.buckets.map((b) => (b.id === action.id ? { ...b, ...action.patch } : b)) };
    case "REMOVE_BUCKET":
      return { ...state, buckets: state.buckets.filter((b) => b.id !== action.id) };
    case "ADD_DEBT":
      return { ...state, debts: [...state.debts, action.debt] };
    case "UPDATE_DEBT":
      return { ...state, debts: state.debts.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) };
    case "REMOVE_DEBT":
      return { ...state, debts: state.debts.filter((d) => d.id !== action.id) };
    case "ADD_LIFE_EVENT":
      return { ...state, lifeEvents: [...state.lifeEvents, action.event] };
    case "UPDATE_LIFE_EVENT":
      return { ...state, lifeEvents: state.lifeEvents.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) };
    case "REMOVE_LIFE_EVENT":
      return { ...state, lifeEvents: state.lifeEvents.filter((e) => e.id !== action.id) };
    case "ADD_ONE_TIME_INCOME":
      return { ...state, oneTimeIncome: [...state.oneTimeIncome, action.item] };
    case "UPDATE_ONE_TIME_INCOME":
      return { ...state, oneTimeIncome: state.oneTimeIncome.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
    case "REMOVE_ONE_TIME_INCOME":
      return { ...state, oneTimeIncome: state.oneTimeIncome.filter((i) => i.id !== action.id) };
    case "ADD_ONE_TIME_EXPENSE":
      return { ...state, oneTimeExpenses: [...state.oneTimeExpenses, action.item] };
    case "UPDATE_ONE_TIME_EXPENSE":
      return { ...state, oneTimeExpenses: state.oneTimeExpenses.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
    case "REMOVE_ONE_TIME_EXPENSE":
      return { ...state, oneTimeExpenses: state.oneTimeExpenses.filter((i) => i.id !== action.id) };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "REPLACE_ALL":
      return action.input;
    default:
      return state;
  }
}

interface HistoryState {
  past: SimulationInput[];
  present: SimulationInput;
  future: SimulationInput[];
}

type HistoryAction = InputAction | { type: "UNDO" } | { type: "REDO" };

const MAX_HISTORY = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
  }
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return { past: [...state.past, state.present], present: next, future: state.future.slice(1) };
  }
  const nextPresent = inputReducer(state.present, action);
  if (nextPresent === state.present) return state;
  const nextPast = [...state.past, state.present].slice(-MAX_HISTORY);
  return { past: nextPast, present: nextPresent, future: [] };
}

/**
 * Central state for the whole simulator: every control-panel edit goes
 * through `dispatch`, which keeps an undo/redo history for free (each
 * mutating action snapshots the previous state; loading a preset or
 * scenario via REPLACE_ALL is itself undoable too).
 */
export function useSimulationReducer(initial: SimulationInput) {
  const [state, dispatch] = useReducer(historyReducer, { past: [], present: initial, future: [] });

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const replaceAll = useCallback((input: SimulationInput) => dispatch({ type: "REPLACE_ALL", input }), []);

  return {
    input: state.present,
    dispatch,
    undo,
    redo,
    replaceAll,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
