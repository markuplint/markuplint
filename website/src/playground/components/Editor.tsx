import React, { memo, useCallback, useEffect } from 'react';
import MonacoEditor, { useMonaco } from '@monaco-editor/react';
import { diagnose } from './diagnose';
import { defaultCode } from './defaultSample';
import { MLCore } from '@markuplint/ml-core';
import { Diagnostic } from '../types';
import { decode, encode } from '../utils.ts';

const initialCode = location.hash ? decode(location.hash.slice(1)) : defaultCode;

export const Editor = memo((props: { linter: MLCore; onUpdate: (value: readonly Diagnostic[]) => void }) => {
  const monaco = useMonaco();

  const onChange = useCallback(() => {
    if (!monaco) return;

    const model = monaco.editor.getModels()[0];
    (async () => {
      const code = model.getValue();
      const diagnostics = await diagnose(props.linter, code);
      monaco.editor.setModelMarkers(model, 'Markuplint', diagnostics);

      props.onUpdate(diagnostics);

      location.hash = encode(code);
    })();
  }, [props.linter, monaco]);

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
});
