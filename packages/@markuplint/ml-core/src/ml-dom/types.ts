import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import Comment from './tokens/comment';
import Doctype from './tokens/doctype';
import Element from './tokens/element';
import ElementCloseTag from './tokens/element-close-tag';
import InvalidNode from './tokens/invalid-node';
import Node from './tokens/node';
import OmittedElement from './tokens/omitted-element';
import Text from './tokens/text';

export type AnonymousNode<T extends RuleConfigValue, O extends RuleConfigOptions> =
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
