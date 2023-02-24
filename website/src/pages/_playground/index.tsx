import React, { useEffect, useState } from 'react';
import Split from 'react-split';
import { defaultConfig } from './modules/default-values';
import { createLinter } from './modules/lint';
import { Editor } from './components/Editor';
import { MLCore, Ruleset } from '@markuplint/ml-core';
import { Output } from './components/Output';
import { Diagnostic } from './modules/lint';

export default function Playground() {
  const config = defaultConfig;
  const ruleset = new Ruleset(config);
  const [linter, setLinter] = useState<MLCore | null>(null);
  const [diagnostics, setDiagnostics] = useState<readonly Diagnostic[]>([]);

  useEffect(() => {
    (async () => {
      const newLinter = await createLinter(ruleset);
      setLinter(newLinter);
    })();
  }, []);

  return (
    <main style={{ height: '100%' }}>
      <Split
        style={{ display: 'flex', height: '100%' }}
        sizes={[30, 70]}
        minSize={100}
        gutterStyle={() => ({ cursor: 'col-resize', width: '5px', backgroundColor: 'gray' })}
        direction="horizontal"
      >
        <pre>
          <code>{JSON.stringify(config, null, 2)}</code>
        </pre>
        <Split
          style={{ height: '100%' }}
          sizes={[75, 25]}
          minSize={100}
          gutterStyle={() => ({ cursor: 'row-resize', height: '5px', backgroundColor: 'gray' })}
          direction="vertical"
        >
          <Editor linter={linter} onUpdate={value => setDiagnostics(value)}></Editor>
          <Output diagnostics={diagnostics} />
        </Split>
      </Split>
    </main>
  );
}
