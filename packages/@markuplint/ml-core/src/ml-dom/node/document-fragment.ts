import type { DocumentFragmentNodeType } from './types.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLParentNode } from './parent-node.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

export class MLDocumentFragment<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLParentNode<T, O, MLASTNode>
	implements DocumentFragment
{
	/**
	 * Returns a string appropriate for the type of node as `DocumentFragment`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-documentfragment%E2%91%A0%E2%91%A6
	 */
	get nodeName() {
		return '#document-fragment' as const;
	}

	/**
	 * Returns a number appropriate for the type of `DocumentFragment`
	 */
	get nodeType(): DocumentFragmentNodeType {
		return this.DOCUMENT_FRAGMENT_NODE;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `DocumentFragment`
	 */
	getElementById(elementId: string): HTMLElement | null {
		throw new UnexpectedCallError('Not supported "getElementById" method');
	}
}
