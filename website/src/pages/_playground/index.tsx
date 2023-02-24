import React, { useEffect, useState } from 'react';
import Split from 'react-split';
import { MLCore, Ruleset } from '@markuplint/ml-core';
import ConfigPane from './components/ConfigPane';
import EditorPane from './components/EditorPane';
import OutputPane from './components/OutputPane';
import { defaultConfig } from './modules/default-values';
import { createLinter } from './modules/lint';
import type { Report } from './modules/lint';

export default function Playground() {
  const config = defaultConfig;
  const ruleset = new Ruleset(config);
  const [linter, setLinter] = useState<MLCore | null>(null);
  const [reports, setReports] = useState<readonly Report[]>([]);

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
        <ConfigPane config={config} />
        <Split
          style={{ height: '100%' }}
          sizes={[75, 25]}
          minSize={100}
          gutterStyle={() => ({ cursor: 'row-resize', height: '5px', backgroundColor: 'gray' })}
          direction="vertical"
        >
          <EditorPane linter={linter} onUpdate={value => setReports(value)}></EditorPane>
          <OutputPane reports={reports} />
        </Split>
      </Split>
    </main>
  );
}
