import { MLASTAbstructNode, MLASTParentNode } from '@markuplint/ml-ast/src';

import { getNode, setNode } from '../helper/dom-traverser';

import Indentation from '../indentation';
import Element from './element';
import OmittedElement from './omitted-element';
import Token from './token';

export default abstract class Node<T = null, O = {}> extends Token {
	public prevSyntaxicalNode: Node<T, O> | null = null;
	public indentation: Indentation<T, O> | null = null;

	protected _astToken: MLASTAbstructNode;

	constructor(astNode: MLASTAbstructNode) {
		super(astNode);
		this._astToken = astNode;
		setNode(astNode, this);
	}

	public get parentNode(): Element<T, O> | OmittedElement<T, O> | null {
		return this._astToken.parentNode ? getNode<MLASTParentNode, T, O>(this._astToken.parentNode) : null;
	}

	public get prevNode(): Node<T, O> | null {
		return this._astToken.prevNode ? getNode<MLASTAbstructNode, T, O>(this._astToken.prevNode) : null;
	}

	public get nextNode(): Node<T, O> | null {
		return this._astToken.nextNode ? getNode<MLASTAbstructNode, T, O>(this._astToken.nextNode) : null;
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
	// 	public is(type: NodeType) {
	// 		return this.type === type;
	// 	}
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
