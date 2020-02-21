import { AnonymousNode, Document } from '../';
import { MLASTElement, MLToken } from '@markuplint/ml-ast';
import { MLDOMAttribute, MLDOMElementCloseTag, MLDOMNode, MLDOMOmittedElement, MLDOMText, MLDOMToken } from './';
import { createNode, createSelector } from '../helper';
import { ContentModel } from '@markuplint/ml-spec';
import { IMLDOMElement } from '../types';
import { RuleConfigValue } from '@markuplint/ml-config';
import { syncWalk } from '../helper/walkers';

export default class MLDOMElement<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTElement>
	implements IMLDOMElement {
	readonly type = 'Element';
	readonly nodeName: string;
	readonly attributes: MLDOMAttribute[];
	readonly namespaceURI: string;
	readonly isForeignElement: boolean;
	readonly closeTag: MLDOMElementCloseTag<T, O> | null;
	readonly selfClosingSolidus: MLDOMToken<MLToken>;
	readonly endSpace: MLDOMToken<MLToken>;
	readonly ownModels: Set<ContentModel> = new Set();
	readonly childModels: Set<ContentModel> = new Set();
	readonly descendantModels: Set<ContentModel> = new Set();

	#fixedNodeName: string;

	constructor(astNode: MLASTElement, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.#fixedNodeName = astNode.nodeName;
		this.attributes = astNode.attributes.map(attr => new MLDOMAttribute(attr));
		this.selfClosingSolidus = new MLDOMToken(astNode.selfClosingSolidus);
		this.endSpace = new MLDOMToken(astNode.endSpace);
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
		this.closeTag = astNode.pearNode ? createNode(astNode.pearNode, document, this) : null;
	}

	get raw() {
		const attrs = this.attributes.map(attr => attr.raw).join('');
		return `<${this.#fixedNodeName}${attrs}${this.selfClosingSolidus.raw}${this.endSpace.raw}>`;
	}

	get childNodes(): AnonymousNode<T, O>[] {
		const astChildren = this._astToken.childNodes || [];
		return astChildren.map(node => this.nodeStore.getNode<typeof node, T, O>(node));
	}

	querySelectorAll(selector: string) {
		const matchedNodes: (MLDOMElement<T, O> | MLDOMText<T, O>)[] = [];
		syncWalk(this.childNodes, node => {
			if (node.type === 'Element' && node.matches(selector)) {
				matchedNodes.push(node);
			}
			if (selector === '#text' && node.type === 'Text' && !node.isWhitespace()) {
				matchedNodes.push(node);
			}
		});
		return matchedNodes;
	}

	closest(selector: string) {
		let el: MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | null = this;

		do {
			if (el.matches(selector)) {
				return el;
			}
			el = el.parentNode;
		} while (el !== null && el.type === 'Element');
		return null;
	}

	getAttributeToken(attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
				return attr;
			}
		}
	}

	getAttribute(attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.raw.toLowerCase() === attrName.toLowerCase()) {
				return attr.value ? attr.value.raw : null;
			}
		}
		return null;
	}

	hasAttribute(attrName: string) {
		return !!this.getAttributeToken(attrName);
	}

	matches(selector: string): boolean {
		return createSelector(selector).match(this);
	}

	fixNodeName(name: string) {
		this.#fixedNodeName = name;
	}

	getChildElementsAndTextNodeWithoutWhitespaces() {
		const filteredNodes: (MLDOMElement<T, O> | MLDOMText<T, O>)[] = [];
		this.childNodes.forEach(node => {
			if (node.type === 'Element') {
				filteredNodes.push(node);
			}
			if (node.type === 'Text' && !node.isWhitespace()) {
				filteredNodes.push(node);
			}
			if (node.type === 'OmittedElement') {
				const children = node.getChildElementsAndTextNodeWithoutWhitespaces();
				filteredNodes.push(...children);
			}
		});
		return filteredNodes;
	}

	isDescendantByUUIDList(uuidList: string[]) {
		let el: MLDOMElement<T, O> | MLDOMOmittedElement<T, O> | null = this.parentNode;

		if (el === null) {
			return false;
		}

		do {
			if (uuidList.includes(el.uuid)) {
				return true;
			}
			el = el.parentNode;
		} while (el !== null && el.type === 'Element');
		return false;
	}

	get classList() {
		const classAttr = this.getAttributeToken('class');
		if (classAttr && classAttr.value) {
			return classAttr.value.raw
				.split(/\s+/g)
				.map(c => c.trim())
				.filter(c => c);
		}
		return [];
	}

	get id() {
		const idAttr = this.getAttributeToken('id');
		if (idAttr && idAttr.value) {
			return idAttr.value.raw;
		}
		return '';
	}
}
