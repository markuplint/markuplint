import Document from '../document';
import { IMLDOMOmittedElement } from '../types';
import { MLASTOmittedElement } from '@markuplint/ml-ast';
import MLDOMNode from './node';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMOmittedElement<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTOmittedElement>
	implements IMLDOMOmittedElement {
	public readonly type = 'OmittedElement';
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
