import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { Comment, Doctype, Element, ElementCloseTag, InvalidNode, Node, OmittedElement, Text } from './tokens';

export type AnonymousNode<T extends RuleConfigValue, O = null> =
	| Doctype<T, O>
	| Element<T, O>
	| ElementCloseTag<T, O>
	| OmittedElement<T, O>
	| Comment<T, O>
	| Text<T, O>
	| InvalidNode<T, O>
	| Node<T, O, MLASTNode>;

export type NodeType =
	| 'Doctype'
	| 'Element'
	| 'ElementCloseTag'
	| 'OmittedElement'
	| 'Comment'
	| 'Text'
	| 'InvalidNode'
	| 'Node';
