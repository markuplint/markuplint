import type { MLASTElement, MLToken } from '@markuplint/ml-ast';
import type { MLDOMElementCloseTag, MLDOMText } from './';
import { createNode, createSelector } from '../helper';
import type { Document } from '../';
import type { IMLDOMElement } from '../types';
import MLDOMAbstractElement from './abstract-element';
import MLDOMAttribute from './attribute';
import MLDOMPreprocessorSpecificAttribute from './preprocessor-specific-attribute';
import MLDOMToken from './token';
import type { RuleConfigValue } from '@markuplint/ml-config';
import { stringSplice } from '../../utils/string-splice';
import { syncWalk } from '../helper/walkers';

export default class MLDOMElement<T extends RuleConfigValue, O = null>
	extends MLDOMAbstractElement<T, O, MLASTElement>
	implements IMLDOMElement
{
	readonly type = 'Element';
	readonly hasSpreadAttr: boolean;
	readonly closeTag: MLDOMElementCloseTag<T, O> | null;
	readonly selfClosingSolidus: MLDOMToken<MLToken> | null;
	readonly endSpace: MLDOMToken<MLToken> | null;

	readonly #tagOpenChar: string;
	readonly #tagCloseChar: string;

	constructor(astNode: MLASTElement, document: Document<T, O>) {
		super(astNode, document);
		this.attributes.push(
			...astNode.attributes.map(attr =>
				attr.type === 'html-attr' ? new MLDOMAttribute(attr) : new MLDOMPreprocessorSpecificAttribute(attr),
			),
		);
		this.hasSpreadAttr = astNode.hasSpreadAttr;
		this.selfClosingSolidus = astNode.selfClosingSolidus ? new MLDOMToken(astNode.selfClosingSolidus) : null;
		this.endSpace = astNode.endSpace ? new MLDOMToken(astNode.endSpace) : null;
		this.closeTag = astNode.pearNode ? createNode(astNode.pearNode, document, this) : null;

		this.#tagOpenChar = astNode.tagOpenChar;
		this.#tagCloseChar = astNode.tagCloseChar;
	}

	get raw() {
		let fixed = this.originRaw;
		let gap = 0;
		if (this.nodeName !== this.fixedNodeName) {
			fixed = stringSplice(fixed, this.#tagOpenChar.length, this.nodeName.length, this.fixedNodeName);
			gap = gap + this.fixedNodeName.length - this.nodeName.length;
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

	getNameLocation() {
		return {
			offset: this.startOffset,
			line: this.startLine,
			col: this.startCol + this.#tagOpenChar.length,
		};
	}
}
