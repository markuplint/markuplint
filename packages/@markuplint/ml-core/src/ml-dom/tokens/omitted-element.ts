// import { AmbiguousNode, NodeType, ParentNode } from '.';

// import GhostNode from './ghost-node';
// import Node from './node';

// export default class OmittedElement<T, O> extends GhostNode<T, O> {
// 	public readonly type: NodeType = 'OmittedElement';
// 	public readonly attributes: never[] = [];
// 	public readonly namespaceURI: string;
// 	public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];

// 	constructor(
// 		nodeName: string,
// 		prevNode: AmbiguousNode<T, O>,
// 		nextNode: AmbiguousNode<T, O>,
// 		parentNode: ParentNode<T, O> | null,
// 		namespaceURI: string,
// 	) {
// 		super(nodeName, prevNode, nextNode, parentNode);
// 		this.namespaceURI = namespaceURI;
// 	}
// }

// import { AmbiguousNode, NodeType, ParentNode } from '.';
import { MLASTOmittedElement } from '@markuplint/ml-ast/src';

import Attribute from './attribute';
import ElementCloseTag from './element-close-tag';
import { AmbiguousNode, ParentNode } from './interfaces';
import Node from './node';
// import EndTagNode from './end-tag-node';
// import GhostNode from './ghost-node';
// import Token from './token';

// import isPotentialCustomElementName from './parser/is-potential-custom-element-name';

// import cssSelector from './css-selector';

export default class OmittedElement<T, O> extends Node<T, O> {
	public readonly nodeName: string;
	public readonly namespaceURI: string;
	public readonly isForeignElement: boolean;
	// public readonly isPotentialCustomElement: boolean;
	// public readonly closeToken: Token;
	// public childNodes: (Node<T, O> | GhostNode<T, O>)[] = [];
	public obsolete = false;

	constructor(astNode: MLASTOmittedElement) {
		super(astNode);
		this.nodeName = astNode.nodeName;
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
		// this.isPotentialCustomElement = astNode.isPotentialCustomElement;
		// 		const ct = this._parseCloseToken();
		// 		// TODO: line, col
		// 		this.closeToken = new Token(
		// 			`${ct.beforeSpaces}${ct.solidus}>`,
		// 			0,
		// 			0,
		// 			0,
		// 		);
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
	// 	public getAttribute(attrName: string) {
	// 		for (const attr of this.attributes) {
	// 			if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
	// 				return attr;
	// 			}
	// 		}
	// 	}
	// 	public hasAttribute(attrName: string) {
	// 		return !!this.getAttribute(attrName);
	// 	}
	// 	public matches(selector: string): boolean {
	// 		return cssSelector(selector).match(this);
	// 	}
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
