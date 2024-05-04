import type { MLElement } from './element.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { syncWalk } from '../helper/walkers.js';
import { getChildren } from '../manipulations/get-children.js';

import { toNodeList } from './node-list.js';
import { MLNode } from './node.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

/**
 *
 * @see https://dom.spec.whatwg.org/#interface-parentnode
 */
export abstract class MLParentNode<
		T extends RuleConfigValue,
		O extends PlainData = undefined,
		A extends MLASTNode = MLASTNode,
	>
	extends MLNode<T, O, A>
	implements ParentNode
{
	/**
	 * Cached `children`
	 */
	#children: HTMLCollectionOf<MLElement<T, O>> | null = null;

	/**
	 * Cached elements that created from `querySelectorAll`
	 */
	#selectedElements = new Map<string, NodeListOf<MLElement<T, O>>>();

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-parentnode-childelementcount
	 */
	get childElementCount() {
		return this.children.length;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-children%E2%91%A0
	 */
	get children(): HTMLCollectionOf<MLElement<T, O>> {
		if (this.#children) {
			return this.#children;
		}
		const children: HTMLCollectionOf<MLElement<T, O>> = getChildren(this);
		this.#children = children;
		return this.#children;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-firstelementchild%E2%91%A0
	 */
	get firstElementChild() {
		return this.children[0] ?? null;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-lastelementchild%E2%91%A0
	 */
	get lastElementChild() {
		return this.children[0] ?? null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-append%E2%91%A0
	 */
	append(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | Node)[]
	): void {
		throw new UnexpectedCallError('Not supported "append" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-prepend%E2%91%A0
	 */
	prepend(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | Node)[]
	): void {
		throw new UnexpectedCallError('Not supported "prepend" method');
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-queryselector%E2%91%A0
	 */
	querySelector(selectors: string): MLElement<T, O> | null {
		const selected = this.querySelectorAll(selectors);
		return selected[0] ?? null;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-queryselectorall%E2%91%A0
	 */
	querySelectorAll(selectors: string): NodeListOf<MLElement<T, O>> {
		const selected = this.#selectedElements.get(selectors);
		if (selected) {
			return selected;
		}

		const elements = toNodeList(
			this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE) && node.matches(selectors, this)) {
					return node;
				}
			}),
		);

		this.#selectedElements.set(selectors, elements);
		return elements;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-parentnode-replacechildren%E2%91%A0
	 */
	replaceChildren(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | Node)[]
	): void {
		throw new UnexpectedCallError('Not supported "replaceChildren" method');
	}

	protected _descendantsToArray<N extends MLNode<T, O>>(
		filter?: (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			node: MLNode<T, O>,
		) => N | null | void,
	): ReadonlyArray<N> {
		const nodeList: N[] = [];
		syncWalk([...this.childNodes], node => {
			if (filter) {
				const filtered = filter(node);
				if (filtered) {
					nodeList.push(filtered);
				}
				return;
			}
			return node;
		});
		return Object.freeze(nodeList);
	}
}
