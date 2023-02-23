import React, { useEffect, useState } from 'react';
import Split from 'react-split';
import { defaultConfig } from './components/defaultSample';
import { convertRuleset, createLinter } from './components/diagnose';
import { Editor } from './components/Editor';
import { MLCore } from '@markuplint/ml-core';

export default function Playground() {
  const ruleset = convertRuleset(defaultConfig);
  const [linter, setLinter] = useState<MLCore | null>(null);

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
        sizes={[25, 75]}
        minSize={100}
        gutterStyle={() => ({ cursor: 'col-resize', width: '5px', backgroundColor: 'gray' })}
        direction="horizontal"
      >
        <div>Config</div>
        <Split
          style={{ height: '100%' }}
          sizes={[75, 25]}
          minSize={100}
          gutterStyle={() => ({ cursor: 'row-resize', height: '5px', backgroundColor: 'gray' })}
          direction="vertical"
        >
          <Editor linter={linter}></Editor>
          <div>Output</div>
        </Split>
      </Split>
    </main>
  );
}
