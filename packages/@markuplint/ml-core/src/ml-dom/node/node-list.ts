import type { MLChildNode } from './child-node.js';
import type { MLElement } from './element.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

export class MLNodeList<T extends RuleConfigValue, O extends PlainData, N extends MLChildNode<T, O>> extends Array<N> {
	forEach(
		callbackfn: (
			value: N,
			key: number,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			parent: MLNodeList<T, O, N>,
		) => void,
		thisArg?: any,
	): void {
		return super.forEach.bind(this)((v, k) => callbackfn(v, k, thisArg ?? this));
	}

	item(index: number): N {
		const node = this[index];
		if (!node) {
			/**
			 * ⚠ TYPE CONTRADICTION
			 *
			 * It throws an error because it should return null but the `item` method of `NodeListOf` doesn't return null in the type definition of TypeScript.
			 *
			 * @see https://dom.spec.whatwg.org/#dom-nodelist-item
			 *
			 * > The item(index) method must return the indexth node in the collection. If there is no indexth node in the collection, then the method must return null.
			 */
			throw new ReferenceError('Invalid index');
		}
		return node;
	}
}

export function toNodeList<T extends RuleConfigValue, O extends PlainData, N extends MLChildNode<T, O>>(
	nodes: ReadonlyArray<N>,
): MLNodeList<T, O, N> {
	const nodeList = new MLNodeList(...nodes);
	return nodeList;
}

export class MLHTMLCollection<T extends RuleConfigValue, O extends PlainData = undefined> extends Array<
	MLElement<T, O>
> {
	item(index: number): MLElement<T, O> | null {
		return this[index] ?? null;
	}

	namedItem(name: string): MLElement<T, O> | null {
		return this.find(el => el.getAttrValue('name') === name) ?? null;
	}
}

export function toHTMLCollection<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodes: ReadonlyArray<MLElement<T, O>>,
): MLHTMLCollection<T, O> {
	const collection = new MLHTMLCollection(...nodes);
	return collection;
}
