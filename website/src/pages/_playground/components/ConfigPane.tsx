import React from 'react';
import { Config as MLConfig } from '@markuplint/ml-config';
import CodeBlock from '@theme/CodeBlock';

export default function ConfigPane({ config }: { config: MLConfig }) {
  return (
    <div>
      <CodeBlock language="json">{JSON.stringify(config, null, 2)}</CodeBlock>
    </div>
  );
}
