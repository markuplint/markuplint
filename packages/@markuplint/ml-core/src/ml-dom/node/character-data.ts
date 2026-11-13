import type { MLElement } from './element.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { nextElementSibling, previousElementSibling } from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';

export abstract class MLCharacterData<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	A extends MLASTNode = MLASTNode,
> extends MLNode<T, O, A> {
	/**
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#dom-characterdata-data
	 */
	get data(): string {
		return this.raw;
	}

	/**
	 * The element immediately following the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-nextelementsibling%E2%91%A1
	 */
	get nextElementSibling(): MLElement<T, O> | null {
		return nextElementSibling(this);
	}

	get nodeValue(): string | null {
		return this.data;
	}

	/**
	 * The element immediately prior the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-previouselementsibling%E2%91%A1
	 */
	get prevElementSibling(): MLElement<T, O> | null {
		return previousElementSibling(this);
	}

	/**
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string {
		return this.data;
	}
}
