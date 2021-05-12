import { AnonymousNode, IMLDOMNode, NodeType } from '../types';
import { MLASTAbstructNode, MLASTNode, MLASTParentNode } from '@markuplint/ml-ast';
import { RuleConfig, RuleConfigValue } from '@markuplint/ml-config';
import Document from '../document';
import MLDOMElement from './element';
import MLDOMIndentation from './indentation';
import MLDOMOmittedElement from './omitted-element';
import MLDOMToken from './token';
import { RuleInfo } from '../../';

export default abstract class MLDOMNode<
		T extends RuleConfigValue,
		O = null,
		A extends MLASTAbstructNode = MLASTAbstructNode,
	>
	extends MLDOMToken<A>
	implements IMLDOMNode
{
	readonly type: NodeType = 'Node';

	protected _astToken: A;

	#doc: Document<T, O>;

	/**
	 * prevToken cache props
	 */
	#prevToken: AnonymousNode<T, O> | null | undefined;

	/**
	 * indentation cache props
	 */
	#indentaion: MLDOMIndentation<T, O> | null | undefined;

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

	get indentation(): MLDOMIndentation<T, O> | null {
		if (this.#indentaion !== undefined) {
			return this.#indentaion;
		}

		const prevToken = this.prevToken;
		if (!prevToken) {
			return null;
		}
		if (prevToken.type !== 'Text') {
			return null;
		}

		// One or more newlines and zero or more spaces or tabs.
		// Or, If textNode is first token and that is filled spaces, tabs and newlines only.
		const matched = prevToken._isFirstToken()
			? prevToken.raw.match(/^(?:[ \t]*\r?\n)*([ \t]*)$/)
			: prevToken.raw.match(/\r?\n([ \t]*)$/);
		// console.log({ [`${this}`]: matched, _: prevToken.raw, f: prevToken._isFirstToken() });
		if (matched) {
			// Spaces will include empty string.
			const spaces = matched[1];
			if (spaces != null) {
				this.#indentaion = new MLDOMIndentation(prevToken, spaces, this.startLine, this);
				return this.#indentaion;
			}
		}

		this.#indentaion = null;
		return this.#indentaion;
	}

	get rule(): RuleInfo<T, O> {
		if (!this.#doc.currentRule) {
			throw new Error('Invalid call.');
		}
		const name = this.#doc.currentRule.name;

		// @ts-ignore
		const ruleConfig: RuleConfig<T, O> | T = this.rules[name];

		if (ruleConfig == null) {
			throw new Error('Invalid call "rule" property.');
		}
		return this.#doc.currentRule.optimizeOption(ruleConfig);
	}

	private _isFirstToken() {
		return !this.prevToken;
	}
}
