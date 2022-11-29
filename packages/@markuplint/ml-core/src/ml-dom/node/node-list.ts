import type { MLChildNode } from './child-node';
import type { MLElement } from './element';
import type { RuleConfigValue } from '@markuplint/ml-config';

class MLNodeList<T extends RuleConfigValue, O, N extends MLChildNode<T, O>> extends Array<N> implements NodeListOf<N> {
	forEach(callbackfn: (value: N, key: number, parent: MLNodeList<T, O, N>) => void, thisArg?: any): void {
		return super.forEach.bind(this)((v, k) => callbackfn(v, k, thisArg ?? this));
	}

	item(index: number): N {
		return this[index];
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
	item(index: number): MLElement<T, O> {
		return this[index];
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
