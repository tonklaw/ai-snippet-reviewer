import { useEffect, useState } from "react";
import type { Language, LintResponse } from "./api";
import { type FixStatus, IssueCard } from "./IssueCard";

export type ReviewState =
  | { status: "idle" }
  | { status: "loading"; model: string | null }
  | { status: "done"; result: LintResponse; code: string; language: Language }
  | { status: "error"; message: string };

type Props = {
  review: ReviewState;
  onCancel: () => void;
  selected: number | null;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  fixStatus: FixStatus[];
  onReplace: (index: number) => void;
  stale: boolean;
};

function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="muted">{seconds}s</span>;
}

export function ReviewPanel(props: Props) {
  const {
    review,
    onCancel,
    selected,
    onSelect,
    onHover,
    fixStatus,
    onReplace,
    stale,
  } = props;

  if (review.status === "idle") {
    return (
      <p className="panel-message muted">
        Press <b>Review</b> (or Ctrl+Enter) to check the code for logic errors.
      </p>
    );
  }

  if (review.status === "loading") {
    return (
      <div className="panel-message">
        <p className="summary">
          Reviewing with {review.model ?? "the default model"}… <Elapsed />
        </p>
        <p className="muted small">Local models can take a minute or two.</p>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  if (review.status === "error") {
    return <p className="panel-message error-text">{review.message}</p>;
  }

  const { issues, summary, metadata } = review.result;
  const seconds = (metadata.durationMs / 1000).toFixed(1);

  return (
    <div>
      <div className="review-head">
        <p className="summary">{summary}</p>
        <p className="muted small">
          {metadata.model ?? "syntax check"} · {seconds}s
          {metadata.cached && " · cached"}
        </p>
      </div>

      {stale && (
        <p className="notice">
          Code changed since last review. Please review again.
        </p>
      )}

      <ul className="issue-list">
        {issues.map((issue, i) => (
          <IssueCard
            key={i}
            issue={issue}
            language={review.language}
            open={i === selected}
            onToggle={() => onSelect(i)}
            onHover={(hovering) => onHover(hovering ? i : null)}
            fixStatus={fixStatus[i]}
            onReplace={() => onReplace(i)}
          />
        ))}
      </ul>
    </div>
  );
}
