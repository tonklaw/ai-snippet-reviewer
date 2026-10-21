import type { Fix } from "./api";

// Replace the lines a fix targets with the fix's code.
// The target lines are found by their text in the reviewed code, so this still
// works after another fix moved them. Returns null if they can't be found.
export function applyFix(
  code: string,
  reviewedCode: string,
  fix: Fix,
): string | null {
  const target = reviewedCode.split("\n").slice(fix.startLine - 1, fix.endLine);
  if (target.length === 0) return null;

  const lines = code.split("\n");
  const matches: number[] = [];
  for (let i = 0; i + target.length <= lines.length; i++) {
    if (target.every((line, j) => lines[i + j] === line)) matches.push(i);
  }
  if (matches.length === 0) return null;

  const at = matches.includes(fix.startLine - 1)
    ? fix.startLine - 1
    : matches[0];
  if (matches.length > 1 && at !== fix.startLine - 1) return null;

  const replacement = fix.code.replace(/\n+$/, "").split("\n");
  return [
    ...lines.slice(0, at),
    ...replacement,
    ...lines.slice(at + target.length),
  ].join("\n");
}
