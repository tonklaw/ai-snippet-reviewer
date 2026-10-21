import { useEffect, useState } from "react";
import "./App.css";

type Health =
  | { state: "loading" }
  | { state: "ok"; env: string }
  | { state: "error"; message: string };

function App() {
  const [health, setHealth] = useState<Health>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/v1/health", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: { status: string; env: string } = await res.json();
        setHealth({ state: "ok", env: body.env });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setHealth({
          state: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app">
      <h1>Mini-AI Code Reviewer</h1>
      <p className={`health health--${health.state}`}>
        {health.state === "loading" && "Backend: checking…"}
        {health.state === "ok" && `Backend: ok (${health.env})`}
        {health.state === "error" && `Backend unreachable: ${health.message}`}
      </p>
    </main>
  );
}

export default App;
