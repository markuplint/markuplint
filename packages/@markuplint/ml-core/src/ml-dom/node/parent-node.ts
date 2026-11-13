import type { MLNodeList, MLHTMLCollection } from './node-list.js';
import type { MLElement } from './element.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { getDOMValue } from '../helper/tree-scope.js';
import { walkTree } from '../helper/walkers.js';
import { getChildren } from '../manipulations/get-children.js';

import { toNodeList } from './node-list.js';
import { MLNode } from './node.js';

/**
 *
 * @see https://dom.spec.whatwg.org/#interface-parentnode
 */
export abstract class MLParentNode<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	A extends MLASTNode = MLASTNode,
> extends MLNode<T, O, A> {
	#children: MLHTMLCollection<T, O> | null = null;

	#selectedElements = new Map<string, MLNodeList<T, O, MLElement<T, O>>>();

	#deepSelectedElements = new Map<string, readonly MLElement<T, O>[]>();

	#idMap: Map<string, MLElement<T, O>> | null = null;

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-parentnode-childelementcount
	 */
	get childElementCount() {
		return this.childElements.length;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-parentnode-children
	 */
	get childElements(): MLHTMLCollection<T, O> {
		if (this.#children) {
			return this.#children;
		}
		const children: MLHTMLCollection<T, O> = getChildren(this);
		this.#children = children;
		return this.#children;
	}

	/**
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-parentnode-queryselector
	 */
	querySelector(selectors: string): MLElement<T, O> | null {
		const selected = this.querySelectorAll(selectors);
		return selected[0] ?? null;
	}

	/**
	 * Selects the descendants in the tree order, within the tree of this node: not the elements in
	 * the content of an HTML `template` element, which belong to a tree of their own.
	 *
	 * @implements DOM API: `Element`, `Document`, `DocumentFragment`
	 * @see https://dom.spec.whatwg.org/#dom-parentnode-queryselectorall
	 */
	querySelectorAll(selectors: string): MLNodeList<T, O, MLElement<T, O>> {
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
	 * Selects the descendants in every tree under this node: the content of an HTML `template`
	 * element (and a declarative shadow root) at any depth as well, and a `template` element that is in
	 * no tree. A selector is matched in the tree of each element, so `section p` does not match a `p`
	 * in the content of a `template` that is in a `section`.
	 *
	 * It is for a rule that must look at every element whatever tree it is in (a restricted element,
	 * a table, a line break), where `querySelectorAll` would leave the content of a `template`
	 * unchecked.
	 *
	 * @implements `@markuplint/ml-core` API: `MLParentNode`
	 * @param selectors - A selector
	 * @returns The matched elements in the order of the markup
	 */
	deepQuerySelectorAll(selectors: string): readonly MLElement<T, O>[] {
		const selected = this.#deepSelectedElements.get(selectors);
		if (selected) {
			return selected;
		}

		const elements: MLElement<T, O>[] = [];
		walkTree(
			[...this.childNodes],
			node => {
				if (node.is(node.ELEMENT_NODE) && node.matches(selectors, this)) {
					elements.push(node);
				}
			},
			true,
		);
		const result = Object.freeze(elements);
		this.#deepSelectedElements.set(selectors, result);
		return result;
	}

	/**
	 * The first element of the tree whose `id` is `elementId` (the string that the DOM has, with
	 * character references resolved), found through a map that is built once: a rule resolves one
	 * reference per attribute.
	 *
	 * @param elementId - The id
	 * @returns The element, or `null`
	 */
	protected _getElementById(elementId: string): MLElement<T, O> | null {
		if (!this.#idMap) {
			const idMap = new Map<string, MLElement<T, O>>();
			for (const el of this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE)) {
					return node;
				}
			})) {
				const id = getDOMValue(el.getAttrNode('id'));
				if (id != null && id !== '' && !idMap.has(id)) {
					idMap.set(id, el);
				}
			}
			this.#idMap = idMap;
		}
		return this.#idMap.get(elementId) ?? null;
	}

	/**
	 * The descendants in the tree order, within the tree of this node (see {@link walkTree}). An
	 * HTML `template` element has none: what it holds is its `content`, a tree of its own.
	 */
	protected _descendantsToArray<N extends MLNode<T, O>>(
		filter?: (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			node: MLNode<T, O>,
		) => N | null | void,
	): ReadonlyArray<N> {
		if (this.is(this.ELEMENT_NODE) && this.isHTMLTemplateElement) {
			return Object.freeze([]);
		}
		const nodeList: N[] = [];
		walkTree([...this.childNodes], node => {
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
