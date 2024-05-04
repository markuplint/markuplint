import type { Code } from 'mdast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

export const codeBlockClassName = (): Transformer => {
  return root => {
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    visit(root, 'code', (node: Code) => {
      const meta = node.meta;

      if (meta) {
        const res = meta.match(/class=(\S*)/);
        const className = res?.[1];
        if (className) {
          node.data = node.data ?? {};
          node.data.hProperties = node.data.hProperties ?? {};
          node.data.hProperties.className = [`language-${node.lang}`, className];
        }
      }
    });
  };
};
