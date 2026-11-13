import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-previouselementsibling%E2%91%A0
 */
export function previousElementSibling<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): MLElement<T, O> | null {
	let prevNode = node.prevSibling;
	while (prevNode) {
		if (prevNode.is(prevNode.ELEMENT_NODE)) {
			return prevNode;
		}
		prevNode = prevNode.prevSibling;
	}
	return null;
}

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-nextelementsibling%E2%91%A0
 */
export function nextElementSibling<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): MLElement<T, O> | null {
	let nextNode = node.nextSibling;
	while (nextNode) {
		if (nextNode.is(nextNode.ELEMENT_NODE)) {
			return nextNode;
		}
		nextNode = nextNode.nextSibling;
	}
	return null;
}
