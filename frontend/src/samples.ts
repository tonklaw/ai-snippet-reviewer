import type { Language } from "./api";

// Buggy starter snippets so there is something to review right away
export const SAMPLES: Record<Language, string> = {
  python: `def average(xs):
    total = 0
    for x in xs:
        total += x
    return total / len(xs) - 1
`,
  javascript: `function sum(arr) {
  let total = 0;
  for (let i = 0; i <= arr.length; i++) {
    total += arr[i];
  }
  return total;
}
`,
  typescript: `function lastItem<T>(items: T[]): T {
  return items[items.length];
}
`,
  go: `func max(xs []int) int {
	m := 0
	for _, x := range xs {
		if x > m {
			m = x
		}
	}
	return m
}
`,
};

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "go", label: "Go" },
];
