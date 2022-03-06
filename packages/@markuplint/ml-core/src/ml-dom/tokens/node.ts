import type { Document } from '../';
import type { RuleInfo } from '../../';
import type { AnonymousNode, IMLDOMNode, NodeType } from '../types';
import type { MLDOMElement, MLDOMOmittedElement, MLDOMPreprocessorSpecificBlock } from './';
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
	// https://dom.spec.whatwg.org/#interface-node
	readonly ELEMENT_NODE = 1;
	readonly ATTRIBUTE_NODE = 2;
	readonly TEXT_NODE = 3;
	readonly CDATA_SECTION_NODE = 4;
	readonly ENTITY_REFERENCE_NODE = 5; // legacy
	readonly ENTITY_NODE = 6; // legacy
	readonly PROCESSING_INSTRUCTION_NODE = 7;
	readonly COMMENT_NODE = 8;
	readonly DOCUMENT_NODE = 9;
	readonly DOCUMENT_TYPE_NODE = 10;
	readonly DOCUMENT_FRAGMENT_NODE = 11;
	readonly NOTATION_NODE = 12; // legacy

	readonly ownerDocument: Document<T, O>;
	readonly type: NodeType = 'Node';
	readonly rules: Record<string, AnyRule> = {};

	protected _astToken: A;

	/**
	 * prevToken cache props
	 */
	#prevToken: AnonymousNode<T, O> | null | undefined;

	constructor(astNode: A, document: Document<T, O>) {
		super(astNode);
		this._astToken = astNode;
		this.ownerDocument = document;
		this.ownerDocument.nodeStore.setNode(astNode, this);
	}

	get parentNode(): MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | MLDOMPreprocessorSpecificBlock<T, O> | null {
		if (!this._astToken.parentNode) {
			return null;
		}
		return this.ownerDocument.nodeStore.getNode<MLASTParentNode, T, O>(this._astToken.parentNode);
	}

	get prevNode(): AnonymousNode<T, O> | null {
		if (!this._astToken.prevNode) {
			return null;
		}
		return this.ownerDocument.nodeStore.getNode<MLASTNode, T, O>(this._astToken.prevNode);
	}

	get nextNode(): AnonymousNode<T, O> | null {
		if (!this._astToken.nextNode) {
			return null;
		}
		return this.ownerDocument.nodeStore.getNode<MLASTNode, T, O>(this._astToken.nextNode);
	}

	get syntaxicalParentNode(): MLDOMElement<T, O> | MLDOMPreprocessorSpecificBlock<T, O> | null {
		let parentNode: MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | MLDOMPreprocessorSpecificBlock<T, O> | null =
			this.parentNode;
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
		for (let i = 0; i < this.ownerDocument.nodeList.length; i++) {
			const node = this.ownerDocument.nodeList[i];
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
		this.#prevToken = this.ownerDocument.nodeList[index - 1] || null;
		return this.#prevToken;
	}

	get nodeStore() {
		return this.ownerDocument.nodeStore;
	}

	get rule(): RuleInfo<T, O> {
		if (!this.ownerDocument.currentRule) {
			throw new Error('Invalid call.');
		}
		const name = this.ownerDocument.currentRule.name;
		const rule = this.rules[name] as RuleConfig<T, O> | T | undefined;

		return this.ownerDocument.currentRule.optimizeOption(rule);
	}

	get textContent(): string | null {
		return null;
	}

	getParentElement() {
		let parent = this.parentNode;
		if (!parent) {
			return null;
		}

		while (parent) {
			if (parent.type === 'PSBlock') {
				parent = parent.parentNode;
				continue;
			}
			return parent;
		}

		return null;
	}

	is(type: NodeType) {
		return this.type === type;
	}

	toString() {
		return this.raw;
	}
}
