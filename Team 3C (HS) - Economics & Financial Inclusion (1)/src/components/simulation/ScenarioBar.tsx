import { useState } from "react";
import { Save, FolderOpen, Trash2, GitCompare, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listScenarios, saveScenario, deleteScenario, type SavedScenario } from "@/lib/simulation/scenarioStorage";
import type { SimulationInput } from "@/lib/simulation/types";

interface ScenarioBarProps {
  input: SimulationInput;
  onLoad: (input: SimulationInput) => void;
  compareScenario: SavedScenario | null;
  onSetCompare: (scenario: SavedScenario | null) => void;
}

export function ScenarioBar({ input, onLoad, compareScenario, onSetCompare }: ScenarioBarProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => listScenarios());
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const refresh = () => setScenarios(listScenarios());

  const handleSave = () => {
    const name = saveName.trim() || `Scenario ${scenarios.length + 1}`;
    saveScenario(name, input);
    refresh();
    setSaveName("");
    setSaveOpen(false);
    toast.success(`Saved "${name}"`);
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    if (compareScenario?.id === id) onSetCompare(null);
    refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save scenario
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3">
          <p className="text-sm font-medium text-foreground">Save current inputs as a scenario</p>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Rent vs. Buy"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button size="sm" className="w-full" onClick={handleSave}>
            Save
          </Button>
        </PopoverContent>
      </Popover>

      <Popover open={listOpen} onOpenChange={(open) => { setListOpen(open); if (open) refresh(); }}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" /> Scenarios {scenarios.length > 0 && `(${scenarios.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <p className="mb-2 text-sm font-medium text-foreground">Saved scenarios</p>
          {scenarios.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Nothing saved yet</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {scenarios.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5 rounded-md p-1.5 hover:bg-secondary/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(s.savedAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => { onLoad(s.input); setListOpen(false); }}>
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Compare against current"
                    onClick={() => onSetCompare(compareScenario?.id === s.id ? null : s)}
                  >
                    {compareScenario?.id === s.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {compareScenario && (
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground">
          <GitCompare className="h-3 w-3 text-primary" /> Comparing: {compareScenario.name}
          <button onClick={() => onSetCompare(null)} className="ml-1 text-muted-foreground hover:text-foreground">
            ×
          </button>
        </span>
      )}
    </div>
  );
}
