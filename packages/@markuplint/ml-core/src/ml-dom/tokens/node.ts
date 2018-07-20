import { MLASTAbstructNode, MLASTNode, MLASTParentNode } from '@markuplint/ml-ast/';

import { getNode, setNode } from '../helper/dom-traverser';

import Indentation from '../indentation';
import { AnonymousNode, NodeType } from '../types';
import Element from './element';
import OmittedElement from './omitted-element';
import Token from './token';

export default abstract class Node<T, O, A extends MLASTAbstructNode> extends Token<A> {
	public readonly type: NodeType = 'Node';
	public prevSyntaxicalNode: Node<T, O, A> | null = null;
	public indentation: Indentation<T, O> | null = null;

	protected _astToken: A;

	constructor(astNode: A) {
		super(astNode);
		this._astToken = astNode;

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

	public toString() {
		return this.raw;
	}
	// 	public toJSON() {
	// 		return {
	// 			nodeName: this.nodeName,
	// 			raw: this.raw,
	// 			line: this.line,
	// 			col: this.col,
	// 			endLine: this.location.endLine,
	// 			endCol: this.location.endCol,
	// 			startOffset: this.location.startOffset,
	// 			endOffset: this.location.endOffset,
	// 		};
	// 	}

	public is(type: NodeType) {
		return this.type === type;
	}

	// 	public get rule() {
	// 		if (!this.document) {
	// 			throw new Error('Invalid construction.');
	// 		}
	// 		if (!this.document.rule) {
	// 			throw new Error('Invalid construction.');
	// 		}
	// 		const name = this.document.rule.name;
	// 		// @ts-ignore
	// 		const rule: ConfigureFileJSONRuleOption<T, O> = this.rules[name];
	// 		if (rule == null) {
	// 			throw new Error('Invalid call "rule" property.');
	// 		}
	// 		return this.document.rule.optimizeOption(rule);
	// 	}
	// 	public get syntaxicalParentNode(): Node<T, O> | null {
	// 		let node: Node<T, O> | GhostNode<T, O> = this;
	// 		while (node.parentNode && node.parentNode instanceof GhostNode) {
	// 			node = node.parentNode;
	// 		}
	// 		return node.parentNode;
	// 	}
}
