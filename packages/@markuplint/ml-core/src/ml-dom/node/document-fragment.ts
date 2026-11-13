import type { MLElement } from './element.js';
import type { DocumentFragmentNodeType } from './types.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLParentNode } from './parent-node.js';

/**
 * Represents a DOM DocumentFragment node wrapper in the markuplint DOM tree.
 *
 * It is the `content` of an HTML `template` element, a tree of its own. markuplint does not
 * keep it apart in the syntax tree: the children of the `template` element are the children of
 * the fragment, as the same nodes, so the fragment is built from a copy of the AST node of the
 * `template` element that has a uuid of its own (the node store keys nodes by uuid).
 *
 * It has no parent: a document fragment is a root, and `getRootNode()` of it is itself.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
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
	 * @implements DOM API: `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string {
		return [...this.childNodes]
			.filter(child => !child.is(child.COMMENT_NODE))
			.map(child => child.textContent ?? '')
			.join('');
	}

	/**
	 * A document fragment has no parent.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	override get syntacticalParentNode(): null {
		return null;
	}

	/**
	 * Finds the first element in this tree whose id is `elementId`: not in the content of a `template`
	 * element under it, which is a tree of its own.
	 *
	 * @implements DOM API: `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-nonelementparentnode-getelementbyid
	 */
	getElementById(elementId: string): MLElement<T, O> | null {
		return this._getElementById(elementId);
	}
}
