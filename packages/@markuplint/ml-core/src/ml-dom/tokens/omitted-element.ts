import { AnonymousNode, IMLDOMOmittedElement } from '../types';
import Document from '../document';
import { MLASTOmittedElement } from '@markuplint/ml-ast';
import MLDOMElement from './element';
import MLDOMNode from './node';
import MLDOMText from './text';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMOmittedElement<T extends RuleConfigValue, O = null>
	extends MLDOMNode<T, O, MLASTOmittedElement>
	implements IMLDOMOmittedElement {
	readonly type = 'OmittedElement';
	readonly nodeName: string;
	readonly namespaceURI: string;
	readonly isForeignElement: boolean;
	obsolete = false;

	constructor(astNode: MLASTOmittedElement, document: Document<T, O>) {
		super(astNode, document);
		this.nodeName = astNode.nodeName;
		this.namespaceURI = astNode.namespace;
		this.isForeignElement = this.namespaceURI !== 'http://www.w3.org/1999/xhtml';
	}

	get childNodes(): AnonymousNode<T, O>[] {
		const astChildren = this._astToken.childNodes || [];
		return astChildren.map(node => this.nodeStore.getNode<typeof node, T, O>(node));
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
}
