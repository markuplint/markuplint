import type { AnonymousNode, Document } from '../';
import type { MLDOMAttribute, MLDOMElement, MLDOMOmittedElement, MLDOMText } from './';
import type MLDOMPreprocessorSpecificAttribute from './preprocessor-specific-attribute';
import type { MLASTElement, MLASTOmittedElement } from '@markuplint/ml-ast';
import type { RuleConfigValue } from '@markuplint/ml-config';
import type { ContentModel } from '@markuplint/ml-spec';

import { getNS } from '@markuplint/ml-spec';

import { createSelector } from '../helper';
import { syncWalk } from '../helper/walkers';

import MLDOMNode from './node';

export default abstract class MLDOMAbstractElement<
	T extends RuleConfigValue,
	O = null,
	E extends MLASTElement | MLASTOmittedElement = MLASTElement | MLASTOmittedElement,
> extends MLDOMNode<T, O, E> {
	readonly nodeName: string;
	readonly attributes: (MLDOMAttribute | MLDOMPreprocessorSpecificAttribute)[] = [];
	readonly hasSpreadAttr: boolean = false;
	readonly namespaceURI: string;
	readonly isForeignElement: boolean;
	readonly ownModels: Set<ContentModel> = new Set();
	readonly childModels: Set<ContentModel> = new Set();
	readonly descendantModels: Set<ContentModel> = new Set();
	readonly isCustomElement: boolean;
	readonly isInFragmentDocument: boolean;

	#fixedNodeName: string;
	#getChildElementsAndTextNodeWithoutWhitespacesCache: (MLDOMElement<T, O> | MLDOMText<T, O>)[] | null = null;
	#normalizedString: string | null = null;

	constructor(astNode: E, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.#fixedNodeName = astNode.nodeName;
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
		this.isCustomElement = astNode.isCustomElement;
		this.isInFragmentDocument = document.isFragment;
	}

	get childNodes(): AnonymousNode<T, O>[] {
		const astChildren = this._astToken.childNodes || [];
		return astChildren.map(node => this.nodeStore.getNode<typeof node, T, O>(node));
	}

	get children(): (MLDOMElement<T, O> | MLDOMOmittedElement<T, O>)[] {
		return this.childNodes.filter((node): node is MLDOMElement<T, O> | MLDOMOmittedElement<T, O> => {
			return node.type === 'Element' || node.type === 'OmittedElement';
		});
	}

	get nextElementSibling() {
		let nextNode = this.nextNode;
		while (nextNode) {
			if (
				(((this.parentNode === null && nextNode.parentNode === null) ||
					this.parentNode?.uuid === nextNode.parentNode?.uuid) &&
					nextNode.type === 'Element') ||
				nextNode.type === 'OmittedElement'
			) {
				return nextNode;
			}
			nextNode = nextNode.nextNode;
		}
		return null;
	}

	get previousElementSibling() {
		let prevNode = this.prevNode;
		while (prevNode) {
			if (
				(((this.parentNode === null && prevNode.parentNode === null) ||
					this.parentNode?.uuid === prevNode.parentNode?.uuid) &&
					prevNode.type === 'Element') ||
				prevNode.type === 'OmittedElement'
			) {
				return prevNode;
			}
			prevNode = prevNode.prevNode;
		}
		return null;
	}

	get ns() {
		if (/[a-z]:[a-z]/i.test(this.nodeName)) {
			return this.nodeName.split(':')[0];
		}
		return getNS(this.namespaceURI);
	}

	get nameWithNS() {
		if (/[a-z]:[a-z]/i.test(this.nodeName)) {
			return this.nodeName;
		}
		const ns = getNS(this.namespaceURI);
		if (ns === 'html') {
			return this.nodeName.toLowerCase();
		}
		return `${ns}:${this.nodeName}`;
	}

	get classList() {
		const classList: string[] = [];
		const classAttrs = this.getAttributeToken('class');
		for (const classAttr of classAttrs) {
			const value = classAttr.attrType === 'html-attr' ? classAttr.value.raw : classAttr.potentialValue;
			classList.push(
				...value
					.split(/\s+/g)
					.map(c => c.trim())
					.filter(c => c),
			);
		}
		return classList;
	}

	get id() {
		return this.getAttribute('id') || '';
	}

	get fixedNodeName() {
		return this.#fixedNodeName;
	}

	querySelectorAll(selector: string) {
		const matchedNodes: (MLDOMElement<T, O> | MLDOMText<T, O>)[] = [];
		const selecor = createSelector(selector);
		syncWalk(this.childNodes, node => {
			if (node.type === 'Element' && selecor.match(node, this)) {
				matchedNodes.push(node);
			}
			if (selector === '#text' && node.type === 'Text' && !node.isWhitespace()) {
				matchedNodes.push(node);
			}
		});
		return matchedNodes;
	}

	closest(selector: string): MLDOMAbstractElement<T, O> | null {
		const selecor = createSelector(selector);
		let el: MLDOMAbstractElement<T, O> | null = this;

		do {
			if (selecor.match(el, this)) {
				return el;
			}
			el = el.parentNode;
		} while (el !== null && el.type === 'Element');
		return null;
	}

	getAttributeToken(attrName: string) {
		const attrs: (MLDOMAttribute | MLDOMPreprocessorSpecificAttribute)[] = [];
		attrName = attrName.toLowerCase();
		for (const attr of this.attributes) {
			if (attr.potentialName === attrName) {
				attrs.push(attr);
			}
		}
		return attrs;
	}

	getAttribute(attrName: string) {
		attrName = attrName.toLowerCase();
		for (const attr of this.attributes) {
			if (attr.potentialName === attrName) {
				if (attr.attrType === 'html-attr') {
					return attr.value ? attr.value.raw : null;
				} else {
					return attr.potentialValue;
				}
			}
		}
		return null;
	}

	hasAttribute(attrName: string) {
		return !!this.getAttributeToken(attrName).length;
	}

	matches(selector: string): boolean {
		return !!createSelector(selector).match(this);
	}

	fixNodeName(name: string) {
		this.#fixedNodeName = name;
	}

	getChildElementsAndTextNodeWithoutWhitespaces() {
		if (this.#getChildElementsAndTextNodeWithoutWhitespacesCache) {
			return this.#getChildElementsAndTextNodeWithoutWhitespacesCache;
		}
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
		this.#getChildElementsAndTextNodeWithoutWhitespacesCache = filteredNodes;
		return filteredNodes;
	}

	/**
	 * This element has "Preprocessor Specific Block". In other words, Its children are potentially mutable.
	 */
	hasMutableChildren() {
		return this.childNodes.some(node => node.type === 'PSBlock');
	}

	isDescendantByUUIDList(uuidList: string[]) {
		let el: MLDOMAbstractElement<T, O> | null = this.parentNode;

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

	toNormalizeString(): string {
		if (this.#normalizedString) {
			return this.#normalizedString;
		}

		const children = this.getChildElementsAndTextNodeWithoutWhitespaces();
		const attrs = this.attributes.map(attr => attr.toNormalizeString());
		const attrString = attrs.length ? ' ' + attrs.join('') : '';
		const startTag = `<${this.nodeName}${attrString}>`;
		const childNodes = children.map(node => {
			if (node.type === 'Element') {
				return node.toNormalizeString();
			}
			return node.originRaw;
		});
		const endTag = `</${this.nodeName}>`;
		const normalizedString = `${startTag}${childNodes.join('')}${endTag}`;

		this.#normalizedString = normalizedString;
		return normalizedString;
	}
}
