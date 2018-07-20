import { MLASTOmittedElement } from '@markuplint/ml-ast/src';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import Document from '../document';
import { NodeType } from '../types';
import Node from './node';

export default class OmittedElement<T extends RuleConfigValue, O extends RuleConfigOptions> extends Node<
	T,
	O,
	MLASTOmittedElement
> {
	public readonly type: NodeType = 'OmittedElement';
	public readonly nodeName: string;
	public readonly namespaceURI: string;
	public readonly isForeignElement: boolean;
	public obsolete = false;

	constructor(astNode: MLASTOmittedElement, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
	}
}
