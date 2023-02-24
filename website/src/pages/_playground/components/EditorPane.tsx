import React, { useCallback, useEffect } from 'react';
import MonacoEditor, { useMonaco } from '@monaco-editor/react';
import { lint } from '../modules/lint';
import { defaultCode } from '../modules/default-values';
import { MLCore } from '@markuplint/ml-core';
import { Report } from '../modules/lint';
import { loadCode, saveCode } from '../modules/code-save';

const initialCode = loadCode() || defaultCode;

export default function EditorPane({
  linter,
  onUpdate,
}: {
  linter: MLCore;
  onUpdate: (value: readonly Report[]) => void;
}) {
  const monaco = useMonaco();

  const onChange = useCallback(() => {
    if (!monaco) return;

    const model = monaco.editor.getModels()[0];
    (async () => {
      const code = model.getValue();
      const reports = await lint(linter, code);
      monaco.editor.setModelMarkers(model, 'Markuplint', reports);

      onUpdate(reports);

      saveCode(code);
    })();
  }, [linter, monaco]);

  useEffect(() => {
    onChange();
  }, [onChange]);

  return (
    <MonacoEditor
      language="html"
      theme="vs-dark"
      defaultValue={initialCode}
      onChange={onChange}
      onMount={onChange}
      options={{ minimap: { enabled: false } }}
    />
  );
}
