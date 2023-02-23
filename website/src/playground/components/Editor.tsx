import React, { memo, useCallback, useRef, useState } from 'react';
import MonacoEditor, { useMonaco } from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { diagnose, convertRuleset } from './diagnose';
import { defaultCode, defaultConfig } from './defaultSample';
import { MLCore } from '@markuplint/ml-core';

export const Editor = memo((props: { linter: MLCore }) => {
  const monaco = useMonaco();

  const onChange: OnChange = async value => {
    console.log(value);
    const diagnostics = await diagnose(props.linter, value);
    console.log(diagnostics);
    const model = monaco.editor.getModels()[0];
    console.log(model);
    monaco.editor.setModelMarkers(model, 'Markuplint', diagnostics);
  };

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
