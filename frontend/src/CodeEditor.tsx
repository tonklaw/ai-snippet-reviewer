import { catppuccinLatte, catppuccinMocha } from "@catppuccin/codemirror";
import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import type { Language } from "./api";

const SYNTAX = {
  python: () => python(),
  javascript: () => javascript({ jsx: true }),
  typescript: () => javascript({ typescript: true, jsx: true }),
  go: () => go(),
};

function usePrefersDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return dark;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
};

export function CodeEditor({ value, onChange, language }: Props) {
  const dark = usePrefersDark();
  const extensions = useMemo(() => [SYNTAX[language]()], [language]);

  return (
    <CodeMirror
      className="editor"
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme={dark ? catppuccinMocha : catppuccinLatte}
      basicSetup={{ foldGutter: false, autocompletion: false }}
      minHeight="420px"
      placeholder="Paste your code here…"
    />
  );
}
