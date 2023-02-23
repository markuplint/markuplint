import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor, { useMonaco } from '@monaco-editor/react';
import { diagnose } from './diagnose';
import { defaultCode, defaultConfig } from './defaultSample';
import { MLCore } from '@markuplint/ml-core';
import { Diagnostic } from '../types';

export const Editor = memo((props: { linter: MLCore; onUpdate: (value: readonly Diagnostic[]) => void }) => {
  const monaco = useMonaco();

  const onChange = useCallback(() => {
    (async () => {
      const model = monaco.editor.getModels()[0];
      console.log(model);
      const code = model.getValue();
      const diagnostics = await diagnose(props.linter, code);
      monaco.editor.setModelMarkers(model, 'Markuplint', diagnostics);

      props.onUpdate(diagnostics);
    })();
  }, [props.linter]);

  useEffect(() => {
    onChange();
  }, [onChange]);

  return (
    <MonacoEditor
      language="html"
      theme="vs-dark"
      defaultValue={defaultCode}
      onChange={onChange}
      options={{ minimap: { enabled: false } }}
    />
  );
});
