import type { MLChildNode } from './child-node';
import type { MLElement } from './element';
import type { RuleConfigValue } from '@markuplint/ml-config';

class MLNodeList<T extends RuleConfigValue, O, N extends MLChildNode<T, O>> extends Array<N> implements NodeListOf<N> {
	forEach(callbackfn: (value: N, key: number, parent: MLNodeList<T, O, N>) => void, thisArg?: any): void {
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
			 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-844377136
			 *
			 * > item
			 * > Returns the index-th item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
			 */
			throw new ReferenceError('Invalid index');
		}
		return node;
	}
}

export function toNodeList<T extends RuleConfigValue, O, N extends MLChildNode<T, O>>(
	nodes: ReadonlyArray<N>,
): NodeListOf<N> {
	const nodeList = new MLNodeList(...nodes);
	return nodeList;
}

class MLHTMLCollection<T extends RuleConfigValue, O = null>
	extends Array<MLElement<T, O>>
	implements HTMLCollectionOf<MLElement<T, O>>
{
	item(index: number): MLElement<T, O> | null {
		return this[index] ?? null;
	}

	namedItem(name: string): MLElement<T, O> | null {
		return this.find(el => el.getAttribute('name') === name) || null;
	}
}

export function toHTMLCollection<T extends RuleConfigValue, O = null>(
	nodes: ReadonlyArray<MLElement<T, O>>,
): HTMLCollectionOf<MLElement<T, O>> {
	const collection = new MLHTMLCollection(...nodes);
	return collection;
}

export function nodeListToHTMLCollection<T extends RuleConfigValue, O = null>(
	nodeList: NodeListOf<MLChildNode<T, O>>,
): HTMLCollectionOf<MLElement<T, O>> {
	const collection = new MLHTMLCollection<T, O>();
	nodeList.forEach(node => {
		if (node.is(node.ELEMENT_NODE)) {
			collection.push(node);
		}
	});
	return collection;
}
