import { MLASTAbstructNode, MLASTNode, MLASTParentNode } from '@markuplint/ml-ast';
import { RuleConfig, RuleConfigValue } from '@markuplint/ml-config';
import { RuleInfo } from '../../';
import Document from '../document';
import { getNode, setNode } from '../helper/dom-traverser';
import { AnonymousNode, NodeType } from '../types';
import Element from './element';
import Indentation from './indentation';
import OmittedElement from './omitted-element';
import Text from './text';
import Token from './token';

export default abstract class Node<
	T extends RuleConfigValue,
	O = null,
	A extends MLASTAbstructNode = MLASTAbstructNode
> extends Token<A> {
	public readonly type: NodeType = 'Node';

	protected _astToken: A;

	private _doc: Document<T, O>;

	constructor(astNode: A, document: Document<T, O>) {
		super(astNode);
		this._astToken = astNode;
		this._doc = document;

		// TODO: type
		// @ts-ignore
		setNode(astNode, this);
	}

	public get parentNode(): Element<T, O> | OmittedElement<T, O> | null {
		return this._astToken.parentNode ? getNode<MLASTParentNode, T, O>(this._astToken.parentNode) : null;
	}

	public get prevNode(): AnonymousNode<T, O> | null {
		return this._astToken.prevNode ? getNode<MLASTNode, T, O>(this._astToken.prevNode) : null;
	}

	public get nextNode(): AnonymousNode<T, O> | null {
		return this._astToken.nextNode ? getNode<MLASTNode, T, O>(this._astToken.nextNode) : null;
	}

	public get syntaxicalParentNode(): Element<T, O> | null {
		let parentNode: Element<T, O> | OmittedElement<T, O> | null = this.parentNode;
		while (parentNode && parentNode.type === 'OmittedElement') {
			parentNode = parentNode.parentNode;
		}
		return parentNode as Element<T, O> | null;
	}

	public get prevToken(): AnonymousNode<T, O> | null {
		let index = -1;
		for (let i = 0; i < this._doc.nodeList.length; i++) {
			const node = this._doc.nodeList[i];
			if (node && node.type === 'OmittedElement') {
				continue;
			}
			if (node.uuid === this.uuid) {
				index = i;
				break;
			}
		}
		if (index === -1) {
			return null;
		}
		const prevToken = this._doc.nodeList[index - 1] || null;
		return prevToken || null;
	}

	public toString() {
		return this.raw;
	}

	public is(type: NodeType) {
		return this.type === type;
	}

	public get indentation(): Indentation<T, O> | null {
		const prevToken = this.prevToken;
		if (!prevToken || prevToken.type !== 'Text') {
			return null;
		}
		// @ts-ignore force casting
		const textNode: Text<T, O> = prevToken;

		if (textNode.isRawText) {
			return null;
		}

		const matched = textNode.raw.match(/\r?\n([ \t]*)$/);
		if (matched) {
			const spaces = matched[1];
			if (spaces != null) {
				return new Indentation(textNode, spaces, this.startLine);
			}
		}

		return null;
	}

	public get rule(): RuleInfo<T, O> {
		if (!this._doc.currentRule) {
			throw new Error('Invalid call.');
		}
		const name = this._doc.currentRule.name;

		// @ts-ignore
		const ruleConfig: RuleConfig<T, O> | T = this.rules[name];

		if (ruleConfig == null) {
			throw new Error('Invalid call "rule" property.');
		}
		return this._doc.currentRule.optimizeOption(ruleConfig);
	}
}
