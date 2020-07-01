import { AnonymousNode, Document } from '../';
import { MLASTElement, MLToken } from '@markuplint/ml-ast';
import { MLDOMAttribute, MLDOMElementCloseTag, MLDOMNode, MLDOMOmittedElement, MLDOMText, MLDOMToken } from './';
import { createNode, createSelector } from '../helper';
import { ContentModel } from '@markuplint/ml-spec';
import { IMLDOMElement } from '../types';
import MLDOMPreprocessorSpecificAttribute from './preprocessor-specific-attribute';
import { RuleConfigValue } from '@markuplint/ml-config';
import { stringSplice } from '../../utils/string-splice';
import { syncWalk } from '../helper/walkers';

export default class MLDOMElement<T extends RuleConfigValue, O = null> extends MLDOMNode<T, O, MLASTElement>
	implements IMLDOMElement {
	readonly type = 'Element';
	readonly nodeName: string;
	readonly attributes: (MLDOMAttribute | MLDOMPreprocessorSpecificAttribute)[];
	readonly namespaceURI: string;
	readonly isForeignElement: boolean;
	readonly closeTag: MLDOMElementCloseTag<T, O> | null;
	readonly selfClosingSolidus: MLDOMToken<MLToken>;
	readonly endSpace: MLDOMToken<MLToken>;
	readonly ownModels: Set<ContentModel> = new Set();
	readonly childModels: Set<ContentModel> = new Set();
	readonly descendantModels: Set<ContentModel> = new Set();

	readonly #tagOpenChar: string;
	readonly #tagCloseChar: string;

	#fixedNodeName: string;

	constructor(astNode: MLASTElement, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.#fixedNodeName = astNode.nodeName;
		this.attributes = astNode.attributes.map(attr =>
			attr.type === 'html-attr' ? new MLDOMAttribute(attr) : new MLDOMPreprocessorSpecificAttribute(attr),
		);
		this.selfClosingSolidus = new MLDOMToken(astNode.selfClosingSolidus);
		this.endSpace = new MLDOMToken(astNode.endSpace);
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
		this.closeTag = astNode.pearNode ? createNode(astNode.pearNode, document, this) : null;

		this.#tagOpenChar = astNode.tagOpenChar;
		this.#tagCloseChar = astNode.tagCloseChar;
	}

	get raw() {
		let fixed = this.originRaw;
		let gap = 0;
		if (this.nodeName !== this.#fixedNodeName) {
			fixed = stringSplice(fixed, this.#tagOpenChar.length, this.nodeName.length, this.#fixedNodeName);
			gap = gap + this.#fixedNodeName.length - this.nodeName.length;
		}
		for (const attr of this.attributes) {
			const startOffset =
				(attr.attrType === 'html-attr' ? attr.spacesBeforeName.startOffset : attr.startOffset) -
				this.startOffset;
			const fixedAttr = attr.toString();
			if (attr.originRaw !== fixedAttr) {
				fixed = stringSplice(fixed, startOffset + gap, attr.originRaw.length, fixedAttr);
				gap = gap + fixedAttr.length - attr.originRaw.length;
			}
		}

		return fixed;
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
		const attrs: (MLDOMAttribute | MLDOMPreprocessorSpecificAttribute)[] = [];
		attrName = attrName.toLowerCase();
		for (const attr of this.attributes) {
			if (attr.attrType === 'html-attr') {
				if (attr.name.raw.toLowerCase() === attrName) {
					attrs.push(attr);
				}
			} else {
				if (attr.potentialName.toLowerCase() === attrName) {
					attrs.push(attr);
				}
			}
		}
		return attrs;
	}

	getAttribute(attrName: string) {
		attrName = attrName.toLowerCase();
		for (const attr of this.attributes) {
			if (attr.attrType === 'html-attr') {
				if (attr.name.raw.toLowerCase() === attrName) {
					return attr.value ? attr.value.raw : null;
				}
			} else {
				if (attr.potentialName.toLowerCase() === attrName) {
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

	/**
	 * This element has "Preprocessor Specific Block". In other words, Its children are potentially mutable.
	 */
	hasMutableChildren() {
		return this.childNodes.some(node => node.type === 'PSBlock');
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

	getNameLocation() {
		return {
			offset: this.startOffset,
			line: this.startLine,
			col: this.startCol + this.#tagOpenChar.length,
		};
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
}
