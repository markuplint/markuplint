import type { DocumentFragmentNodeType } from './types';
import type { MLASTAbstructNode } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';

import { MLParentNode } from './parent-node';
import UnexpectedCallError from './unexpected-call-error';

export class MLDocumentFragment<T extends RuleConfigValue, O = null>
	extends MLParentNode<T, O, MLASTAbstructNode>
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
