import type { Language } from "./api";
import { LANGUAGES } from "./samples";

export type Saved = {
  language: Language;
  code: string;
  model: string | null;
  forceReview: boolean;
};

const KEY = "snippet-reviewer";

export function loadSaved(): Partial<Saved> {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const saved: Partial<Saved> = {};
    if (LANGUAGES.some((l) => l.id === data.language))
      saved.language = data.language;
    if (typeof data.code === "string") saved.code = data.code;
    if (typeof data.model === "string") saved.model = data.model;
    if (typeof data.forceReview === "boolean")
      saved.forceReview = data.forceReview;
    return saved;
  } catch {
    return {};
  }
}

export function save(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    console.warn("Failed to save settings to localStorage");
  }
}
