import { useCallback, useRef, useState } from "react";

export interface GridEdit {
  lineId: string;
  field: "amount_budgeted" | "rollover_enabled";
  previousValue: number | boolean;
  newValue: number | boolean;
}

const MAX_HISTORY = 50;

// Unlike the Simulator's history reducer (pure local state, nothing to
// replay), every grid edit is a live server mutation — undo/redo here
// don't just rewind in-memory state, they issue an inverse mutation. Refs
// hold the actual stacks for synchronous read-then-mutate access; the
// version counter just forces a re-render so canUndo/canRedo stay live in
// the UI (a ref write alone wouldn't trigger one).
export function useGridHistory() {
  const past = useRef<GridEdit[]>([]);
  const future = useRef<GridEdit[]>([]);
  const [version, setVersion] = useState(0);

  const recordEdit = useCallback((edit: GridEdit) => {
    past.current = [...past.current.slice(-(MAX_HISTORY - 1)), edit];
    future.current = [];
    setVersion((v) => v + 1);
  }, []);

  const undo = useCallback((): GridEdit | null => {
    if (past.current.length === 0) return null;
    const edit = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, edit];
    setVersion((v) => v + 1);
    return edit;
  }, []);

  const redo = useCallback((): GridEdit | null => {
    if (future.current.length === 0) return null;
    const edit = future.current[future.current.length - 1];
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, edit];
    setVersion((v) => v + 1);
    return edit;
  }, []);

  return { recordEdit, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0, version };
}
