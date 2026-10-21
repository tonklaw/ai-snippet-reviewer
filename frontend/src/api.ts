export type Language = "python" | "javascript" | "typescript" | "go";

export type Fix = {
  code: string;
  startLine: number;
  endLine: number;
};

export type Issue = {
  kind: "syntax" | "logic";
  startLine: number;
  endLine: number;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  fix: Fix | null;
};

export type LintResponse = {
  issues: Issue[];
  summary: string;
  metadata: {
    stage: "syntax" | "review";
    model: string | null;
    durationMs: number;
    cached: boolean;
  };
};

export type LintRequest = {
  language: Language;
  code: string;
  model?: string | null;
  forceReview?: boolean;
};

export type ModelInfo = {
  id: string;
  model: string;
  available: boolean;
  reason: string | null;
};

export type ModelsResponse = {
  models: ModelInfo[];
  default: string | null;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", "Can't reach the server");
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body?.error;
    if (error) throw new ApiError(res.status, error.code, error.message);
    throw new ApiError(
      res.status,
      "HTTP_ERROR",
      `Backend not responding (HTTP ${res.status})`,
    );
  }
  return body as T;
}

export function getModels(signal?: AbortSignal) {
  return request<ModelsResponse>("/models", { signal });
}

export function lint(req: LintRequest, signal?: AbortSignal) {
  return request<LintResponse>("/lint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
}
