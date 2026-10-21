import { type KeyboardEvent, useEffect } from "react";
import type { Language } from "./api";
import { CodeEditor } from "./CodeEditor";
import { ModelSelect } from "./ModelSelect";
import { ReviewPanel } from "./ReviewPanel";
import { LANGUAGES } from "./samples";
import {
  loadModels,
  selectActive,
  selectCanReview,
  selectHighlights,
  selectScrollTo,
  setCode,
  setForceReview,
  setLanguage,
  startReview,
  useAppDispatch,
  useAppSelector,
} from "./store";
import "./App.css";

function App() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.app.language);
  const code = useAppSelector((s) => s.app.code);
  const forceReview = useAppSelector((s) => s.app.forceReview);
  const loading = useAppSelector((s) => s.app.review.status === "loading");
  const canReview = useAppSelector(selectCanReview);
  const highlights = useAppSelector(selectHighlights);
  const active = useAppSelector(selectActive);
  const scrollTo = useAppSelector(selectScrollTo);

  useEffect(() => {
    const request = dispatch(loadModels());
    return () => request.abort();
  }, [dispatch]);

  function onEditorKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (canReview) dispatch(startReview());
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Mini-AI Code Reviewer</h1>
        <label>
          Language
          <select
            value={language}
            onChange={(e) => dispatch(setLanguage(e.target.value as Language))}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <ModelSelect />
      </header>

      <main className="panes">
        <section className="pane" onKeyDownCapture={onEditorKeyDown}>
          <CodeEditor
            value={code}
            onChange={(value) => dispatch(setCode(value))}
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
                  onChange={(e) => dispatch(setForceReview(e.target.checked))}
                />
                Force review
              </label>
              <button
                className="primary"
                onClick={() => dispatch(startReview())}
                disabled={!canReview || loading}
              >
                {loading ? "Reviewing…" : "Review"}
              </button>
            </div>
          </div>
        </section>
        <section className="pane results">
          <ReviewPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
