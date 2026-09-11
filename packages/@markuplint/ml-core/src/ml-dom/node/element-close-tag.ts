import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MLASTElementCloseTag } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLNode } from './node.js';

/**
 * The close tag paired with its opening `MLElement`.
 *
 * Close tags are not part of the document's `nodeList`; each instance exists
 * only as a satellite of its paired element (`MLElement.closeTag`). The class
 * exists for two purposes:
 *
 * 1. Reporting violations at the close tag's own source location instead of
 *    the open tag (e.g. the `case-sensitive-tag-name` rule).
 * 2. Detecting close-tag presence: `MLElement.closeTag` is `null` for void,
 *    self-closing, or omitted end tags (e.g. the `end-tag` rule).
 */
export class MLElementCloseTag<T extends RuleConfigValue, O extends PlainData = undefined> extends MLNode<
	T,
	O,
	MLASTElementCloseTag
> {
	readonly pair: MLElement<T, O>;

	constructor(
		astNode: MLASTElementCloseTag,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		pair: MLElement<T, O>,
	) {
		super(astNode, document);
		this.pair = pair;
	}

	/**
	 * Returns a string appropriate for the type of node as `MLBlock`
	 *
	 * @implements `@markuplint/ml-core` API: `MLBlock`
	 */
	get nodeName() {
		return this.pair.nodeName;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	get rawName() {
		return this._astToken.nodeName;
	}

	toString() {
		return this.raw;
	}
}
