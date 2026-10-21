import type { ModelInfo } from "./api";

type Props = {
  models: ModelInfo[] | null; // null while loading
  value: string | null;
  onChange: (id: string) => void;
  error: string | null;
};

function label(m: ModelInfo) {
  const name = m.model.split("/").pop();
  return m.available ? `${m.id} (${name})` : `${m.id}: ${m.reason}`;
}

export function ModelSelect({ models, value, onChange, error }: Props) {
  if (error) return <span className="error-text">Models: {error}</span>;

  return (
    <label>
      Model
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
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
