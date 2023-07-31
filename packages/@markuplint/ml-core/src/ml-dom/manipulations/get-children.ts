import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { toHTMLCollection } from '../node/node-list.js';

export function getChildren<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): HTMLCollectionOf<MLElement<T, O>> {
	return toHTMLCollection(
		Array.from(node.childNodes).filter((child): child is MLElement<T, O> => {
			return child.nodeType === child.ELEMENT_NODE;
		}),
	);
}
