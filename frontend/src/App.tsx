import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getModels, lint, type Language, type ModelInfo } from "./api";
import { CodeEditor, type LineRange } from "./CodeEditor";
import { applyFix } from "./fixes";
import type { FixStatus } from "./IssueCard";
import { ModelSelect } from "./ModelSelect";
import { ReviewPanel, type ReviewState } from "./ReviewPanel";
import { LANGUAGES, SAMPLES } from "./samples";
import "./App.css";

function App() {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(SAMPLES.python);

  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getModels(controller.signal)
      .then((res) => {
        setModels(res.models);
        setModel(res.default);
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setModelsError(err.message);
      });
    return () => controller.abort();
  }, []);

  const [review, setReview] = useState<ReviewState>({ status: "idle" });
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [applied, setApplied] = useState<number[]>([]); // issues whose fix was replaced
  const [forceReview, setForceReview] = useState(false); // skip the syntax check gate
  const request = useRef<AbortController | null>(null);

  const stale = review.status === "done" && review.code !== code;
  const issues = review.status === "done" ? review.result.issues : [];

  const highlights = useMemo<LineRange[]>(
    () =>
      review.status === "done" && !stale
        ? review.result.issues.map((i) => ({
            from: i.startLine,
            to: i.endLine,
          }))
        : [],
    [review, stale],
  );

  const shown = hovered ?? selected;
  const active = shown === null ? null : (highlights[shown] ?? null);
  const scrollTo = selected === null ? null : (highlights[selected] ?? null);

  const fixStatus: FixStatus[] = issues.map((issue, i) => {
    if (applied.includes(i)) return "applied";
    if (review.status !== "done" || !issue.fix) return "blocked";
    return applyFix(code, review.code, issue.fix) === null
      ? "blocked"
      : "ready";
  });

  function replaceFix(index: number) {
    const fix = issues[index]?.fix;
    if (review.status !== "done" || !fix) return;
    const next = applyFix(code, review.code, fix);
    if (next === null) return;
    setCode(next);
    setApplied((a) => [...a, index]);
  }

  async function runReview() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setReview({ status: "loading", model });
    setSelected(null);
    setHovered(null);
    setApplied([]);

    try {
      const result = await lint(
        { language, code, model, forceReview },
        controller.signal,
      );
      setReview({ status: "done", result, code, language });
    } catch (err) {
      if (controller.signal.aborted) return;
      setReview({ status: "error", message: (err as Error).message });
    }
  }

  function cancelReview() {
    request.current?.abort();
    setReview({ status: "idle" });
  }

  const canReview = model !== null && code.trim() !== "";

  function onEditorKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (canReview) runReview();
    }
  }

  function changeLanguage(next: Language) {
    if (code === SAMPLES[language]) setCode(SAMPLES[next]);
    setLanguage(next);
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Mini-AI Code Reviewer</h1>
        <label>
          Language
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as Language)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <ModelSelect
          models={models}
          value={model}
          onChange={setModel}
          error={modelsError}
        />
      </header>

      <main className="panes">
        <section className="pane" onKeyDownCapture={onEditorKeyDown}>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={language}
            highlights={highlights}
            active={active}
            scrollTo={scrollTo}
          />
          <div className="editor-actions">
            <span className="muted">{code.split("\n").length} lines</span>
            <div className="review-controls">
              <label
                className="checkbox"
                title="Send the code to the AI even if the syntax check finds errors"
              >
                <input
                  type="checkbox"
                  checked={forceReview}
                  onChange={(e) => setForceReview(e.target.checked)}
                />
                Force review
              </label>
              <button
                className="primary"
                onClick={() => runReview()}
                disabled={!canReview || review.status === "loading"}
              >
                {review.status === "loading" ? "Reviewing…" : "Review"}
              </button>
            </div>
          </div>
        </section>
        <section className="pane results">
          <ReviewPanel
            review={review}
            onCancel={cancelReview}
            selected={selected}
            onSelect={(i) => setSelected(selected === i ? null : i)}
            onHover={setHovered}
            fixStatus={fixStatus}
            onReplace={replaceFix}
            stale={stale}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
