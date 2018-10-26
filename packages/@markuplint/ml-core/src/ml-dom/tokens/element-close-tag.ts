import { MLASTElementCloseTag } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import Document from '../document';
import { setNode } from '../helper/dom-traverser';
import { NodeType } from '../types';
import Node from './Node';
import Element from './element';

export default class ElementCloseTag<T extends RuleConfigValue, O = null> extends Node<T, O, MLASTElementCloseTag> {
	public readonly type: NodeType = 'ElementCloseTag';
	public readonly nodeName: string;
	public readonly startTag: Element<T, O>;
	public readonly isForeignElement: boolean;

	constructor(astNode: MLASTElementCloseTag, document: Document<T, O>, startTag: Element<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.startTag = startTag;
		this.isForeignElement = startTag.isForeignElement;

		// TODO: type
		// @ts-ignore
		setNode(astNode, this);
	}
}
