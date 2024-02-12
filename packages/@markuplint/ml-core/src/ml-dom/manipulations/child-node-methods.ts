import type { MLElement } from '../node/element.js';
import type { MLNode } from '../node/node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { UnexpectedCallError } from '../node/unexpected-call-error.js';

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-childnode-before%E2%91%A0
 */
export function before<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...additionalNodes: ReadonlyArray<MLNode<T, O> | string>
): void {
	throw new UnexpectedCallError('Not supported "before" method');
}

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-childnode-after%E2%91%A0
 */
export function after<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...additionalNodes: ReadonlyArray<MLNode<T, O> | string>
): void {
	throw new UnexpectedCallError('Not supported "after" method');
}

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-childnode-replacewith%E2%91%A0
 */
export function replaceWith<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	...additionalNodes: ReadonlyArray<MLNode<T, O> | string>
): void {
	throw new UnexpectedCallError('Not supported "replaceWith" method');
}

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-childnode-remove%E2%91%A0
 */
export function remove<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): void {
	throw new UnexpectedCallError('Not supported "remove" method');
}

/**
 *
 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-previouselementsibling%E2%91%A0
 */
export function previousElementSibling<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): MLElement<T, O> | null {
	let prevNode = node.previousSibling;
	while (prevNode) {
		if (prevNode.is(prevNode.ELEMENT_NODE)) {
			return prevNode;
		}
		prevNode = prevNode.previousSibling;
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
