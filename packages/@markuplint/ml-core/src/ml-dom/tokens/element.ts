import { MLASTElement } from '@markuplint/ml-ast/';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import Document from '../document';
import { getNode } from '../helper/dom-traverser';
import Selector from '../selector';
import { AnonymousNode, NodeType } from '../types';
import Attribute from './attribute';
import ElementCloseTag from './element-close-tag';
import Node from './node';

export default class Element<T extends RuleConfigValue, O extends RuleConfigOptions> extends Node<T, O, MLASTElement> {
	public readonly type: NodeType = 'Element';
	public readonly nodeName: string;
	public readonly attributes: Attribute[];
	public readonly namespaceURI: string;
	public readonly isForeignElement: boolean;
	// public readonly isPotentialCustomElement: boolean;
	// public readonly closeToken: Token;
	// public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	public readonly closeTag: ElementCloseTag<T, O> | null;
	public obsolete = false;

	constructor(astNode: MLASTElement, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.attributes = astNode.attributes.map(attr => new Attribute(attr));
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
		// this.isPotentialCustomElement = astNode.isPotentialCustomElement;
		this.closeTag = astNode.pearNode ? new ElementCloseTag<T, O>(astNode.pearNode, this) : null;
		// 		const ct = this._parseCloseToken();
		// 		// TODO: line, col
		// 		this.closeToken = new Token(
		// 			`${ct.beforeSpaces}${ct.solidus}>`,
		// 			0,
		// 			0,
		// 			0,
		// 		);
	}

	public get childNodes(): AnonymousNode<T, O>[] {
		const astChildren = this._astToken.childNodes || [];
		return astChildren.map(node => getNode<typeof node, T, O>(node));
	}
	// 	public get raw() {
	// 		const raw: string[] = [];
	// 		raw.push(`<${this.nodeName}`);
	// 		for (const attr of this.attributes) {
	// 			raw.push(`${attr.beforeSpaces.raw}${attr.raw}`);
	// 		}
	// 		raw.push(this.closeToken.raw);
	// 		return raw.join('');
	// 	}
	// 	public get id() {
	// 		return this.getAttribute('id');
	// 	}
	// 	public get classList(): string[] {
	// 		const classAttr = this.getAttribute('class');
	// 		if (!classAttr || !classAttr.value) {
	// 			return [];
	// 		}
	// 		return classAttr.value.value
	// 			.split(/\s+/)
	// 			.map(c => c.trim())
	// 			.filter(c => c);
	// 	}

	public getAttribute(attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
				return attr;
			}
		}
	}

	public hasAttribute(attrName: string) {
		return !!this.getAttribute(attrName);
	}

	public matches(selector: string): boolean {
		return Selector(selector).match(this);
	}

	// 	private _parseCloseToken() {
	// 		const result: ParsedCloseTokenData = {
	// 			beforeSpaces: '',
	// 			solidus: '',
	// 		};
	// 		const matches = /(\s*)(\/)?>$/.exec(this._fixed);
	// 		if (matches) {
	// 			result.beforeSpaces = matches[1] || '';
	// 			result.solidus = (matches[2] as '' | '/') || '';
	// 		}
	// 		return result;
	// 	}
	// }
	// interface ParsedCloseTokenData {
	// 	beforeSpaces: string;
	// 	solidus: '' | '/';
}
