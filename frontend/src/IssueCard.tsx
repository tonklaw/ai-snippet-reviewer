import type { Issue, Language } from "./api";
import { CodeBlock } from "./CodeEditor";

// "ready": Replace can be applied, "applied": already replaced,
// "blocked": the target lines were edited since the review
export type FixStatus = "ready" | "applied" | "blocked";

function lineLabel(start: number, end: number) {
  return start === end ? `Line ${start}` : `Lines ${start}–${end}`;
}

type Props = {
  issue: Issue;
  language: Language;
  open: boolean;
  onToggle: () => void;
  onHover: (hovering: boolean) => void;
  fixStatus: FixStatus;
  onReplace: () => void;
};

export function IssueCard(props: Props) {
  const { issue, language, open, onToggle, onHover, fixStatus, onReplace } =
    props;
  const { fix } = issue;

  return (
    <li
      className={open ? "issue issue--open" : "issue"}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        className="issue-summary"
        onClick={onToggle}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        aria-expanded={open}
      >
        <span className="issue-meta">
          <span className={`dot sev--${issue.severity}`} />
          {lineLabel(issue.startLine, issue.endLine)} ·
          <span className={`sev--${issue.severity}`}>{issue.severity}</span>
          {issue.kind === "syntax" && " · syntax"}
        </span>
        <span className="issue-title">{issue.title}</span>
        <span className="issue-text">{issue.description}</span>
      </button>

      {open && fix && (
        <div className="fix">
          <CodeBlock
            code={fix.code}
            language={language}
            firstLine={fix.startLine}
          />
          <div className="fix-actions">
            <span className="muted">
              Fix for {lineLabel(fix.startLine, fix.endLine).toLowerCase()}
            </span>
            {fixStatus === "applied" && <span className="fixed">✓ Fixed</span>}
            {fixStatus === "ready" && (
              <button className="primary" onClick={onReplace}>
                Fix
              </button>
            )}
            {fixStatus === "blocked" && (
              <span className="muted">Code changed here. Review again.</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
