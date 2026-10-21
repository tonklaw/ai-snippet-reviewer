import type { ModelInfo } from "./api";
import { setModel, useAppDispatch, useAppSelector } from "./store";

function label(m: ModelInfo) {
  const name = m.model.split("/").pop();
  return m.available ? `${m.id} (${name})` : `${m.id}: ${m.reason}`;
}

export function ModelSelect() {
  const dispatch = useAppDispatch();
  const models = useAppSelector((s) => s.app.models);
  const value = useAppSelector((s) => s.app.model);
  const error = useAppSelector((s) => s.app.modelsError);

  if (error) return <span className="error-text">Models: {error}</span>;

  return (
    <label>
      Model
      <select
        value={value ?? ""}
        onChange={(e) => dispatch(setModel(e.target.value))}
        disabled={!models}
      >
        {!models && <option value="">Loading…</option>}
        {models && !value && <option value="">No model available</option>}
        {models?.map((m) => (
          <option key={m.id} value={m.id} disabled={!m.available}>
            {label(m)}
          </option>
        ))}
      </select>
    </label>
  );
}
