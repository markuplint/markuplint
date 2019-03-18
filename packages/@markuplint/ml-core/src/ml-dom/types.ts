import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import {
	MLDOMComment,
	MLDOMDoctype,
	MLDOMElement,
	MLDOMElementCloseTag,
	MLDOMInvalidNode,
	MLDOMNode,
	MLDOMOmittedElement,
	MLDOMText,
} from './tokens';

export type AnonymousNode<T extends RuleConfigValue, O = null> =
	| MLDOMDoctype<T, O>
	| MLDOMElement<T, O>
	| MLDOMElementCloseTag<T, O>
	| MLDOMOmittedElement<T, O>
	| MLDOMComment<T, O>
	| MLDOMText<T, O>
	| MLDOMInvalidNode<T, O>
	| MLDOMNode<T, O, MLASTNode>;

export type NodeType =
	| 'Doctype'
	| 'Element'
	| 'ElementCloseTag'
	| 'OmittedElement'
	| 'Comment'
	| 'Text'
	| 'InvalidNode'
	| 'Node';
