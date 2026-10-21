import { useState } from "react";
import type { Language } from "./api";
import { CodeEditor } from "./CodeEditor";
import { ModelSelect } from "./ModelSelect";
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
        <section className="pane">
          <CodeEditor value={code} onChange={setCode} language={language} />
        </section>
        <section className="pane results">
          <p className="muted">Results will appear here.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
