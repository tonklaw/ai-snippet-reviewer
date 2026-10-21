import { catppuccinFrappe } from "@catppuccin/codemirror";
import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, EditorView, lineNumbers } from "@codemirror/view";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";
import type { Language } from "./api";

export type LineRange = { from: number; to: number };

function highlightLines(ranges: LineRange[], active: LineRange | null) {
  return EditorView.decorations.compute(["doc"], (state) => {
    const classes = new Map<number, string>();
    const mark = (r: LineRange, cls: string) => {
      for (let n = r.from; n <= Math.min(r.to, state.doc.lines); n++) {
        classes.set(n, cls);
      }
    };
    ranges.forEach((r) => mark(r, "cm-issue-line"));
    if (active) mark(active, "cm-issue-line cm-issue-line--active");

    const builder = new RangeSetBuilder<Decoration>();
    for (const n of [...classes.keys()].sort((a, b) => a - b)) {
      const line = state.doc.line(n);
      builder.add(
        line.from,
        line.from,
        Decoration.line({ class: classes.get(n) }),
      );
    }
    return builder.finish();
  });
}

const SYNTAX = {
  python: () => python(),
  javascript: () => javascript({ jsx: true }),
  typescript: () => javascript({ typescript: true, jsx: true }),
  go: () => go(),
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  highlights: LineRange[];
  active: LineRange | null;
  scrollTo: LineRange | null;
};

export function CodeEditor(props: Props) {
  const { value, onChange, language, highlights, active, scrollTo } = props;
  const ref = useRef<ReactCodeMirrorRef>(null);
  const extensions = useMemo(
    () => [SYNTAX[language](), highlightLines(highlights, active)],
    [language, highlights, active],
  );

  useEffect(() => {
    const view = ref.current?.view;
    if (!view || !scrollTo || scrollTo.from > view.state.doc.lines) return;
    const pos = view.state.doc.line(scrollTo.from).from;
    view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) });
  }, [scrollTo]);

  return (
    <CodeMirror
      ref={ref}
      className="editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={catppuccinFrappe}
      basicSetup={{ foldGutter: false, autocompletion: false }}
      minHeight="420px"
      maxHeight="70vh"
      placeholder="Paste your code here…"
    />
  );
}

export function CodeBlock(props: {
  code: string;
  language: Language;
  firstLine: number;
}) {
  const { code, language, firstLine } = props;
  const extensions = useMemo(
    () => [
      SYNTAX[language](),
      lineNumbers({ formatNumber: (n) => String(n + firstLine - 1) }),
    ],
    [language, firstLine],
  );

  return (
    <CodeMirror
      className="code-block"
      value={code}
      extensions={extensions}
      theme={catppuccinFrappe}
      editable={false}
      readOnly
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
      }}
    />
  );
}
