import { useEffect, useMemo, useRef, useState } from "react";
import { Undo2, Redo2, RotateCcw, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PresetPicker } from "@/components/simulation/PresetPicker";
import { ControlPanel } from "@/components/simulation/ControlPanel";
import { NetWorthChart } from "@/components/simulation/NetWorthChart";
import { IncomeExpenseChart } from "@/components/simulation/IncomeExpenseChart";
import { DebtPayoffChart } from "@/components/simulation/DebtPayoffChart";
import { SavingsBucketChart } from "@/components/simulation/SavingsBucketChart";
import { LifeEventsTimeline } from "@/components/simulation/LifeEventsTimeline";
import { MonteCarloChart } from "@/components/simulation/MonteCarloChart";
import { MilestoneCallouts } from "@/components/simulation/MilestoneCallouts";
import { SensitivityPanel } from "@/components/simulation/SensitivityPanel";
import { GoalSeekPanel } from "@/components/simulation/GoalSeekPanel";
import { ScenarioBar } from "@/components/simulation/ScenarioBar";
import { useSimulationReducer } from "@/hooks/useSimulationReducer";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMonteCarlo } from "@/hooks/useMonteCarlo";
import { runSimulation } from "@/lib/simulation/engine";
import { getPreset, PRESETS } from "@/lib/simulation/presets";
import type { SavedScenario } from "@/lib/simulation/scenarioStorage";
import { trackEvent } from "@/lib/impact/trackEvent";
import { useSurveyEligibility } from "@/hooks/useSurveyEligibility";
import { SurveyPrompt } from "@/components/simulation/SurveyPrompt";

const DEFAULT_INPUT = PRESETS[0].input;

export default function SimulationPage() {
  const { input, dispatch, undo, redo, replaceAll, canUndo, canRedo } = useSimulationReducer(DEFAULT_INPUT);
  const [activePresetId, setActivePresetId] = useState<string | null>(PRESETS[0].id);
  const [compareScenario, setCompareScenario] = useState<SavedScenario | null>(null);

  // Debounced so dragging a slider doesn't recalculate on every pixel of
  // movement — the chart animates to the new state ~200ms after the user
  // stops moving, which reads as "live" without being laggy.
  const debouncedInput = useDebouncedValue(input, 200);
  const output = useMemo(() => runSimulation(debouncedInput), [debouncedInput]);

  // Experience Quality instrumentation: "opened" fires once on mount,
  // "chart rendered" fires once the first time a real output exists,
  // timed against mount — this is the app's actual time-to-first-insight
  // (the whole engine runs client-side, so this is typically near-instant,
  // which is the honest result for this architecture, not a gamed one).
  const mountedAtRef = useRef<number>(performance.now());
  const chartRenderedTrackedRef = useRef(false);

  useEffect(() => {
    trackEvent("sim_panel_opened");
  }, []);

  useEffect(() => {
    if (chartRenderedTrackedRef.current || output.length === 0) return;
    chartRenderedTrackedRef.current = true;
    trackEvent("sim_chart_rendered", { msFromOpen: Math.round(performance.now() - mountedAtRef.current) });
  }, [output]);

  // Experience Quality micro-survey — shown at most once per eligibility
  // window (see useSurveyEligibility), and only after the user has had a
  // few seconds to actually look at the chart rather than firing the
  // instant it renders.
  const { data: surveyEligible } = useSurveyEligibility();
  const [showSurvey, setShowSurvey] = useState(false);
  const surveyTriggeredRef = useRef(false);

  useEffect(() => {
    if (surveyTriggeredRef.current || output.length === 0 || !surveyEligible) return;
    surveyTriggeredRef.current = true;
    const timer = setTimeout(() => {
      trackEvent("sim_survey_shown");
      setShowSurvey(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [output, surveyEligible]);

  // Manual "Feedback" button — deliberately bypasses the 14-day
  // eligibility gate above. That gate exists to stop the PASSIVE
  // auto-prompt from being naggy; a user who actively clicks to give
  // feedback has already opted into the interruption, so there's no
  // reason to block them. Still fires sim_survey_shown, so it also
  // resets the auto-prompt's own 14-day clock — they won't immediately
  // get nagged again automatically right after giving feedback manually.
  const openFeedback = () => {
    trackEvent("sim_survey_shown");
    setShowSurvey(true);
  };

  const { result: monteCarloResult, showSpinner: monteCarloComputing } = useMonteCarlo(debouncedInput, input.settings.monteCarloEnabled);
  const compareOutput = useMemo(() => (compareScenario ? runSimulation(compareScenario.input) : null), [compareScenario]);

  const handlePresetSelect = (presetId: string) => {
    const preset = getPreset(presetId);
    if (!preset) return;
    replaceAll(preset.input);
    setActivePresetId(presetId);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 md:space-y-8 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono-data mb-1 text-[11px] uppercase tracking-[0.12em] text-primary">Simulation</p>
          <h1 className="font-display text-2xl text-foreground md:text-3xl">Model your money, meet your future</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Drag any slider and watch your projection update live. Return/inflation figures are planning estimates, not financial advice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScenarioBar input={input} onLoad={replaceAll} compareScenario={compareScenario} onSetCompare={setCompareScenario} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={undo} disabled={!canUndo}>
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={redo} disabled={!canRedo}>
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => activePresetId && handlePresetSelect(activePresetId)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openFeedback}>
            <MessageSquareHeart className="h-3.5 w-3.5" /> Feedback
          </Button>
        </div>
      </div>

      <PresetPicker onSelect={handlePresetSelect} activePresetId={activePresetId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-[var(--radius)] border border-border bg-card p-4 lg:max-h-[860px] lg:overflow-y-auto">
          <ControlPanel input={input} dispatch={dispatch} />
        </div>
        <div className="space-y-6">
          <NetWorthChart
            output={output}
            settings={input.settings}
            lifeEvents={input.lifeEvents}
            compare={compareOutput && compareScenario ? { output: compareOutput, label: compareScenario.name } : null}
          />
          {input.settings.monteCarloEnabled && (
            <MonteCarloChart result={monteCarloResult} settings={input.settings} showSpinner={monteCarloComputing} />
          )}
          <MilestoneCallouts output={output} buckets={input.buckets} />
          <LifeEventsTimeline input={input} dispatch={dispatch} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <IncomeExpenseChart output={output} settings={input.settings} />
            <DebtPayoffChart output={output} settings={input.settings} debts={input.debts} />
            <SavingsBucketChart output={output} settings={input.settings} buckets={input.buckets} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SensitivityPanel input={debouncedInput} />
            <GoalSeekPanel input={debouncedInput} />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        This tool projects based on the numbers and rates you enter — it isn't financial advice, and real markets, taxes, and life are messier than any model.
      </p>

      {showSurvey && <SurveyPrompt onDismiss={() => setShowSurvey(false)} />}
    </div>
  );
}
