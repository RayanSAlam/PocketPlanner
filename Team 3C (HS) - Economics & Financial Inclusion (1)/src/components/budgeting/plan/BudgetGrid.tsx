import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, GripVertical, Undo2, Redo2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { BudgetCell } from "@/components/budgeting/plan/BudgetCell";
import { GridTotalsBar } from "@/components/budgeting/plan/GridTotalsBar";
import { Sparkline } from "@/components/budgeting/plan/Sparkline";
import { SinkingFundBadge } from "@/components/budgeting/plan/SinkingFundBadge";
import { ImportExportMenu } from "@/components/budgeting/plan/ImportExportMenu";
import { EmptyRow } from "@/components/dashboard/CardShell";
import { useCategories } from "@/hooks/useCategories";
import { useAddBudgetLine, useDeleteBudgetLine, useUpdateBudgetLine } from "@/hooks/useBudgetLines";
import { useGridHistory, type GridEdit } from "@/hooks/useGridHistory";
import { useRealtimeBudgetSync } from "@/hooks/useRealtimeBudgetSync";
import { getCategoryIcon } from "@/lib/categories";
import { moneyAbs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetRow } from "@/hooks/useBudgetPeriod";
import type { BudgetProgressRow } from "@/hooks/useBudgetProgress";

interface BudgetGridProps {
  budget: BudgetRow;
  rows: BudgetProgressRow[];
}

export function BudgetGrid({ budget, rows }: BudgetGridProps) {
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();
  const history = useGridHistory();
  useRealtimeBudgetSync(budget.id);

  const groups = useMemo(() => {
    const byGroup = new Map<string, BudgetProgressRow[]>();
    for (const row of rows) {
      const list = byGroup.get(row.group_name) ?? [];
      list.push(row);
      byGroup.set(row.group_name, list);
    }
    for (const list of byGroup.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return Array.from(byGroup.entries());
  }, [rows]);

  const allGroupNames = useMemo(() => Array.from(new Set(rows.map((r) => r.group_name))), [rows]);

  const orderedLineIds = useMemo(
    () => rows.slice().sort((a, b) => a.group_name.localeCompare(b.group_name) || a.sort_order - b.sort_order).map((r) => r.line_id),
    [rows],
  );
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.line_id, r])), [rows]);

  const focusCell = (lineId: string) => {
    const el = document.getElementById(`budget-cell-${lineId}`);
    el?.focus();
  };

  const handleNavigate = (lineId: string, direction: "up" | "down") => {
    const idx = orderedLineIds.indexOf(lineId);
    const nextIdx = direction === "down" ? idx + 1 : idx - 1;
    const nextId = orderedLineIds[nextIdx];
    if (nextId) {
      // Let the current cell finish collapsing back to display mode first.
      requestAnimationFrame(() => focusCell(nextId));
    }
  };

  // Central commit path for every amount/rollover edit — direct typing,
  // paste, and undo/redo all funnel through here so history stays
  // consistent no matter how the edit was made.
  const commitAmountEdit = (lineId: string, newValue: number, skipHistory = false) => {
    const row = rowsById.get(lineId);
    if (!row || row.amount_budgeted === newValue) return;
    if (!skipHistory) history.recordEdit({ lineId, field: "amount_budgeted", previousValue: row.amount_budgeted, newValue });
    updateLine.mutate({ id: lineId, amount_budgeted: newValue });
  };

  const commitRolloverEdit = (lineId: string, newValue: boolean, skipHistory = false) => {
    const row = rowsById.get(lineId);
    if (!row || row.rollover_enabled === newValue) return;
    if (!skipHistory) history.recordEdit({ lineId, field: "rollover_enabled", previousValue: row.rollover_enabled, newValue });
    updateLine.mutate({ id: lineId, rollover_enabled: newValue });
  };

  const applyHistoryEdit = (edit: GridEdit, value: number | boolean) => {
    if (edit.field === "amount_budgeted") commitAmountEdit(edit.lineId, value as number, true);
    else commitRolloverEdit(edit.lineId, value as boolean, true);
  };

  const handleUndo = () => {
    const edit = history.undo();
    if (edit) applyHistoryEdit(edit, edit.previousValue);
  };
  const handleRedo = () => {
    const edit = history.redo();
    if (edit) applyHistoryEdit(edit, edit.newValue);
  };

  // Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z — scoped to skip while an input/textarea
  // is focused, so this doesn't fight a cell's own native text-undo while
  // someone is mid-edit.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const handlePasteRows = (startLineId: string, values: number[]) => {
    const startIdx = orderedLineIds.indexOf(startLineId);
    values.forEach((value, offset) => {
      const lineId = orderedLineIds[startIdx + offset];
      if (lineId) commitAmountEdit(lineId, value);
    });
  };

  const handleMoveToGroup = (lineId: string, groupName: string) => {
    updateLine.mutate({ id: lineId, group_name: groupName });
  };

  const totalBudgeted = rows.reduce((s, r) => s + r.amount_budgeted, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleUndo} disabled={!history.canUndo}>
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRedo} disabled={!history.canRedo}>
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </Button>
        </div>
        <ImportExportMenu budget={budget} rows={rows} />
      </div>

      <div
        role="grid"
        aria-label="Budget categories"
        className="overflow-hidden rounded-[var(--radius)] border border-border bg-card"
      >
        <div className="hidden items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.75rem_1fr_5.5rem_7rem_6rem_6rem_5.5rem_3rem]">
          <span />
          <span>Category</span>
          <span>Trend</span>
          <span className="text-right">Budgeted</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Remaining</span>
          <span className="text-right">Last month</span>
          <span />
        </div>

        <Accordion type="multiple" defaultValue={groups.map(([name]) => name)}>
          {groups.map(([groupName, groupRows]) => (
            <AccordionItem key={groupName} value={groupName} className="border-b-0">
              <GroupHeader groupName={groupName} total={groupRows.reduce((s, r) => s + r.amount_budgeted, 0)} otherLineIds={groupRows.map((r) => r.line_id)} />
              <AccordionContent className="pb-0">
                <SortableGroup
                  groupRows={groupRows}
                  allGroupNames={allGroupNames}
                  income={budget.income_expected}
                  onCommitAmount={commitAmountEdit}
                  onToggleRollover={commitRolloverEdit}
                  onNavigate={handleNavigate}
                  onPasteRows={handlePasteRows}
                  onMoveToGroup={handleMoveToGroup}
                  onDelete={(lineId, name) =>
                    deleteLine.mutate(lineId, {
                      onError: (err) => toast.error(err instanceof Error ? err.message : `Couldn't remove ${name}`),
                    })
                  }
                  onReorder={(reordered) => reordered.forEach((row, idx) => row.sort_order !== idx && updateLine.mutate({ id: row.line_id, sort_order: idx }))}
                />
                <AddCategoryRow budgetId={budget.id} groupName={groupName} existingCategoryIds={rows.map((r) => r.category_id)} nextSortOrder={groupRows.length} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {groups.length === 0 && <EmptyRow>No categories yet — add one below to start building your budget.</EmptyRow>}
      </div>

      <GridTotalsBar income={budget.income_expected} totalBudgeted={totalBudgeted} method={budget.method} />
    </div>
  );
}

function GroupHeader({ groupName, total, otherLineIds }: { groupName: string; total: number; otherLineIds: string[] }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(groupName);
  const updateLine = useUpdateBudgetLine();

  const handleRename = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === groupName) {
      setRenaming(false);
      setDraft(groupName);
      return;
    }
    otherLineIds.forEach((id) => updateLine.mutate({ id, group_name: trimmed }));
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setDraft(groupName);
              setRenaming(false);
            }
          }}
          className="h-7 max-w-[12rem] text-sm"
        />
        <button type="button" onClick={handleRename} aria-label="Save group name" className="text-primary">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(groupName);
            setRenaming(false);
          }}
          aria-label="Cancel"
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group/header flex items-center px-4 py-2">
      <AccordionTrigger className="flex-1 py-0 text-sm font-semibold text-foreground hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
        <span className="flex items-center gap-2">
          {groupName}
          <span className="font-mono-data text-xs font-normal text-muted-foreground">{moneyAbs(total)}</span>
        </span>
      </AccordionTrigger>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRenaming(true);
        }}
        aria-label={`Rename ${groupName}`}
        className="ml-2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/header:opacity-100"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

function SortableGroup({
  groupRows,
  allGroupNames,
  income,
  onCommitAmount,
  onToggleRollover,
  onNavigate,
  onPasteRows,
  onMoveToGroup,
  onDelete,
  onReorder,
}: {
  groupRows: BudgetProgressRow[];
  allGroupNames: string[];
  income: number;
  onCommitAmount: (lineId: string, value: number) => void;
  onToggleRollover: (lineId: string, value: boolean) => void;
  onNavigate: (lineId: string, direction: "up" | "down") => void;
  onPasteRows: (startLineId: string, values: number[]) => void;
  onMoveToGroup: (lineId: string, groupName: string) => void;
  onDelete: (lineId: string, name: string) => void;
  onReorder: (reordered: BudgetProgressRow[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = groupRows.map((r) => r.line_id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(groupRows, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {groupRows.map((row) => (
          <SortableGridRow
            key={row.line_id}
            row={row}
            income={income}
            otherGroups={allGroupNames.filter((g) => g !== row.group_name)}
            onCommitAmount={(v) => onCommitAmount(row.line_id, v)}
            onToggleRollover={(v) => onToggleRollover(row.line_id, v)}
            onNavigate={(dir) => onNavigate(row.line_id, dir)}
            onPasteRows={(values) => onPasteRows(row.line_id, values)}
            onMoveToGroup={(g) => onMoveToGroup(row.line_id, g)}
            onDelete={() => onDelete(row.line_id, row.category_name)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableGridRow(props: {
  row: BudgetProgressRow;
  income: number;
  otherGroups: string[];
  onCommitAmount: (value: number) => void;
  onToggleRollover: (value: boolean) => void;
  onNavigate: (direction: "up" | "down") => void;
  onPasteRows: (values: number[]) => void;
  onMoveToGroup: (groupName: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.row.line_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <GridRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function GridRow({
  row,
  income,
  otherGroups,
  onCommitAmount,
  onToggleRollover,
  onNavigate,
  onPasteRows,
  onMoveToGroup,
  onDelete,
  dragHandleProps,
}: {
  row: BudgetProgressRow;
  income: number;
  otherGroups: string[];
  onCommitAmount: (value: number) => void;
  onToggleRollover: (value: boolean) => void;
  onNavigate: (direction: "up" | "down") => void;
  onPasteRows: (values: number[]) => void;
  onMoveToGroup: (groupName: string) => void;
  onDelete: () => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const Icon = getCategoryIcon(row.category_icon);
  const remainingColor = row.remaining < 0 ? "text-destructive" : row.pct_used >= 90 ? "text-gold-foreground" : "text-foreground";

  const rolloverToggle = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Switch checked={row.rollover_enabled} onCheckedChange={onToggleRollover} aria-label={`Roll over unspent ${row.category_name} budget`} className="scale-75" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Roll over unspent budget</TooltipContent>
    </Tooltip>
  );

  const deleteButton = (
    <button
      type="button"
      aria-label={`Remove ${row.category_name} from this budget`}
      onClick={onDelete}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  const nameRow = (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{row.category_name}</span>
      <SinkingFundBadge lineId={row.line_id} categoryId={row.category_id} categoryName={row.category_name} targetAnnual={row.sinking_fund_target_annual} />
      {row.rollover_in !== 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono-data shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {row.rollover_in > 0 ? "+" : ""}
              {moneyAbs(row.rollover_in)} rolled
            </span>
          </TooltipTrigger>
          <TooltipContent>Carried over from last month</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group border-t border-border/60">
          {/* Desktop / tablet: column grid. Hidden below sm: — a 6-column
              row with a 3.5rem-tall sparkline doesn't fit a phone screen,
              per the spec's own call for a stacked card layout there. */}
          <div role="row" className="hidden items-center gap-2 px-4 py-1.5 sm:grid sm:grid-cols-[1.75rem_1fr_5.5rem_7rem_6rem_6rem_5.5rem_3rem]">
            <button type="button" aria-label={`Drag to reorder ${row.category_name}`} className="flex h-6 w-6 cursor-grab items-center justify-center text-muted-foreground/40 opacity-0 hover:text-foreground group-hover:opacity-100 active:cursor-grabbing" {...dragHandleProps}>
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <div role="gridcell" className="py-1">{nameRow}</div>
            <div role="gridcell">
              <Sparkline categoryId={row.category_id} />
            </div>
            <div role="gridcell">
              <BudgetCell id={`budget-cell-${row.line_id}`} value={row.amount_budgeted} income={income} onCommit={onCommitAmount} onNavigate={onNavigate} onPasteRows={onPasteRows} />
            </div>
            <div role="gridcell" className="font-mono-data py-1.5 text-right text-sm text-muted-foreground">
              {moneyAbs(row.spent)}
            </div>
            <div role="gridcell" className={cn("font-mono-data py-1.5 text-right text-sm", remainingColor)}>
              {moneyAbs(row.remaining)}
            </div>
            <div role="gridcell" className="font-mono-data py-1.5 text-right text-xs text-muted-foreground">
              {moneyAbs(row.last_month_spent)}
            </div>
            <div role="gridcell" className="flex items-center justify-end gap-1">
              {rolloverToggle}
              {deleteButton}
            </div>
          </div>

          {/* Mobile: stacked card. No drag handle (long-press-to-reorder
              isn't wired up here) — reordering on mobile is a "use desktop"
              gap, called out in the build report rather than silently
              dropped. */}
          <div className="space-y-2 px-4 py-3 sm:hidden">
            <div className="flex items-center justify-between gap-2">
              {nameRow}
              <div className="flex shrink-0 items-center gap-1.5">
                {rolloverToggle}
                <button type="button" aria-label={`Remove ${row.category_name} from this budget`} onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="mb-1 text-muted-foreground">Budgeted</p>
                <BudgetCell id={`budget-cell-mobile-${row.line_id}`} value={row.amount_budgeted} income={income} onCommit={onCommitAmount} onNavigate={onNavigate} onPasteRows={onPasteRows} />
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">Spent</p>
                <p className="font-mono-data py-1.5 text-right text-foreground">{moneyAbs(row.spent)}</p>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">Remaining</p>
                <p className={cn("font-mono-data py-1.5 text-right", remainingColor)}>{moneyAbs(row.remaining)}</p>
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {otherGroups.map((g) => (
          <ContextMenuItem key={g} onClick={() => onMoveToGroup(g)}>
            Move to {g}
          </ContextMenuItem>
        ))}
        {otherGroups.length > 0 && <ContextMenuSeparator />}
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function AddCategoryRow({
  budgetId,
  groupName,
  existingCategoryIds,
  nextSortOrder,
}: {
  budgetId: string;
  groupName: string;
  existingCategoryIds: string[];
  nextSortOrder: number;
}) {
  const { data: categories = [] } = useCategories();
  const addLine = useAddBudgetLine();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  const available = categories.filter((c) => c.slug !== "income" && c.slug !== "transfer" && !existingCategoryIds.includes(c.id));

  const handleAdd = async () => {
    if (!categoryId) return;
    try {
      await addLine.mutateAsync({ budget_id: budgetId, category_id: categoryId, group_name: groupName, amount_budgeted: 0, sort_order: nextSortOrder });
      setOpen(false);
      setCategoryId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that category");
    }
  };

  return (
    <div className="border-t border-border/60 px-4 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
            <Plus className="h-3 w-3" /> Add category to {groupName}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-2.5">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Choose a category…" />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">All categories are already in this budget</div>
              ) : (
                available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button size="sm" className="w-full" onClick={handleAdd} disabled={!categoryId || addLine.isPending}>
            Add
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
