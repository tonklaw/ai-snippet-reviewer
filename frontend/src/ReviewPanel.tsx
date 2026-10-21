import { useEffect, useState } from "react";
import { IssueCard } from "./IssueCard";
import {
  cancelReview,
  hoverIssue,
  replaceFix,
  selectFixStatus,
  selectStale,
  toggleIssue,
  useAppDispatch,
  useAppSelector,
} from "./store";

function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="muted">{seconds}s</span>;
}

export function ReviewPanel() {
  const dispatch = useAppDispatch();
  const review = useAppSelector((s) => s.app.review);
  const selected = useAppSelector((s) => s.app.selected);
  const fixStatus = useAppSelector(selectFixStatus);
  const stale = useAppSelector(selectStale);

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
        <button onClick={() => dispatch(cancelReview())}>Cancel</button>
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
            onToggle={() => dispatch(toggleIssue(i))}
            onHover={(hovering) => dispatch(hoverIssue(hovering ? i : null))}
            fixStatus={fixStatus[i]}
            onReplace={() => dispatch(replaceFix(i))}
          />
        ))}
      </ul>
    </div>
  );
}
