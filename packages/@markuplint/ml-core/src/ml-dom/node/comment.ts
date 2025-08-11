import type { CommentNodeType } from './types.js';
import type { MLASTComment } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLCharacterData } from './character-data.js';

export class MLComment<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLCharacterData<T, O, MLASTComment>
	implements Comment
{
	/**
	 * Returns a string appropriate for the type of node as `Attr`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-exclusive-text-node%E2%91%A0
	 */
	get nodeName() {
		return '#comment' as const;
	}

	/**
	 * Returns a number appropriate for the type of `Comment`
	 */
	get nodeType(): CommentNodeType {
		return this.COMMENT_NODE;
	}

	/**
	 * @implements DOM API: `Comment`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string {
		return this.data;
	}
}
