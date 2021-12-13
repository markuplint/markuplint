import type { Document } from '../';
import type { RuleInfo } from '../../';
import type { AnonymousNode, IMLDOMNode, NodeType } from '../types';
import type { MLDOMElement, MLDOMOmittedElement } from './';
import type { MLASTAbstructNode, MLASTNode, MLASTParentNode } from '@markuplint/ml-ast';
import type { AnyRule, RuleConfig, RuleConfigValue } from '@markuplint/ml-config';

import MLDOMToken from './token';

export default abstract class MLDOMNode<
		T extends RuleConfigValue,
		O = null,
		A extends MLASTAbstructNode = MLASTAbstructNode,
	>
	extends MLDOMToken<A>
	implements IMLDOMNode
{
	readonly type: NodeType = 'Node';
	readonly rules: Record<string, AnyRule> = {};

	protected _astToken: A;

	#doc: Document<T, O>;

	/**
	 * prevToken cache props
	 */
	#prevToken: AnonymousNode<T, O> | null | undefined;

	constructor(astNode: A, document: Document<T, O>) {
		super(astNode);
		this._astToken = astNode;
		this.#doc = document;
		this.#doc.nodeStore.setNode(astNode, this);
	}

	get parentNode(): MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | null {
		if (!this._astToken.parentNode) {
			return null;
		}
		return this.#doc.nodeStore.getNode<MLASTParentNode, T, O>(this._astToken.parentNode);
	}

	get prevNode(): AnonymousNode<T, O> | null {
		if (!this._astToken.prevNode) {
			return null;
		}
		return this.#doc.nodeStore.getNode<MLASTNode, T, O>(this._astToken.prevNode);
	}

	get nextNode(): AnonymousNode<T, O> | null {
		if (!this._astToken.nextNode) {
			return null;
		}
		return this.#doc.nodeStore.getNode<MLASTNode, T, O>(this._astToken.nextNode);
	}

	get syntaxicalParentNode(): MLDOMElement<T, O> | null {
		let parentNode: MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | null = this.parentNode;
		while (parentNode && parentNode.type === 'OmittedElement') {
			parentNode = parentNode.parentNode;
		}
		return parentNode;
	}

	get prevToken(): AnonymousNode<T, O> | null {
		if (this.#prevToken !== undefined) {
			return this.#prevToken;
		}

		let index = -1;
		for (let i = 0; i < this.#doc.nodeList.length; i++) {
			const node = this.#doc.nodeList[i];
			if (!node) {
				continue;
			}
			if (node.type === 'OmittedElement') {
				continue;
			}
			if (node.uuid === this.uuid) {
				index = i;
				break;
			}
		}
		if (index === -1) {
			this.#prevToken = null;
			return this.#prevToken;
		}
		this.#prevToken = this.#doc.nodeList[index - 1] || null;
		return this.#prevToken;
	}

	get nodeStore() {
		return this.#doc.nodeStore;
	}

	toString() {
		return this.raw;
	}

	is(type: NodeType) {
		return this.type === type;
	}

	get rule(): RuleInfo<T, O> {
		if (!this.#doc.currentRule) {
			throw new Error('Invalid call.');
		}
		const name = this.#doc.currentRule.name;

		const rule = this.rules[name] as RuleConfig<T, O> | T;

		if (rule == null) {
			throw new Error('Invalid call "rule" property.');
		}

		return this.#doc.currentRule.optimizeOption(rule);
	}
}
