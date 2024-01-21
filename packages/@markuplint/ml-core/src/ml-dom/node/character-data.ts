import type { MLElement } from './element.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import {
	after,
	before,
	nextElementSibling,
	previousElementSibling,
	remove,
	replaceWith,
} from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

export abstract class MLCharacterData<
		T extends RuleConfigValue,
		O extends PlainData = undefined,
		A extends MLASTNode = MLASTNode,
	>
	extends MLNode<T, O, A>
	implements CharacterData
{
	/**
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#dom-characterdata-data
	 */
	get data(): string {
		// TODO:
		return this.raw;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#dom-characterdata-length
	 */
	get length(): number {
		throw new UnexpectedCallError('Not supported "length" property');
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
	get previousElementSibling(): MLElement<T, O> | null {
		return previousElementSibling(this);
	}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	after(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		after(this, ...nodes);
	}

	// TODO
	appendData(data: string): void {}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	before(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		before(this, ...nodes);
	}

	// TODO
	deleteData(offset: number, count: number): void {}

	// TODO
	insertData(offset: number, data: string): void {}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	remove(): void {
		remove(this);
	}

	// TODO
	replaceData(offset: number, count: number, data: string): void {}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	replaceWith(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		replaceWith(this, ...nodes);
	}

	// TODO
	substringData(offset: number, count: number): string {
		return '';
	}
}
