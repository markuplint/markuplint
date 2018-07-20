import { MLASTOmittedElement } from '@markuplint/ml-ast/src';

import { NodeType } from '../types';
import Node from './node';

export default class OmittedElement<T, O> extends Node<T, O, MLASTOmittedElement> {
	public readonly type: NodeType = 'OmittedElement';
	public readonly nodeName: string;
	public readonly namespaceURI: string;
	public readonly isForeignElement: boolean;
	public obsolete = false;

	constructor(astNode: MLASTOmittedElement) {
		super(astNode);
		this.nodeName = astNode.nodeName;
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
	}
}
