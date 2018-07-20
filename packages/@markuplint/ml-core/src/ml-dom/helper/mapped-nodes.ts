import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';

import {
	MLASTAbstructNode,
	MLASTAttr,
	MLASTComment,
	MLASTDoctype,
	MLASTElement,
	MLASTElementCloseTag,
	MLASTInvalidNode,
	MLASTNode,
	MLASTOmittedElement,
	MLASTParentNode,
	MLASTText,
	MLToken,
} from '@markuplint/ml-ast/src';
import Attribute from '../tokens/attribute';
import Comment from '../tokens/comment';
import Doctype from '../tokens/doctype';
import Element from '../tokens/element';
import ElementCloseTag from '../tokens/element-close-tag';
import InvalidNode from '../tokens/invalid-node';
import Node from '../tokens/node';
import OmittedElement from '../tokens/omitted-element';
import Text from '../tokens/text';
import Token from '../tokens/token';

// prettier-ignore
export type MappedNode<N, T extends RuleConfigValue, O extends RuleConfigOptions>
	= N extends MLASTElement ? Element<T, O>
	: N extends MLASTElementCloseTag ? ElementCloseTag<T, O>
	: N extends MLASTOmittedElement ? OmittedElement<T, O>
	: N extends MLASTParentNode ? (Element<T, O> | OmittedElement<T, O>)
	: N extends MLASTComment ? Comment<T, O>
	: N extends MLASTText ? Text<T, O>
	: N extends MLASTInvalidNode ? InvalidNode<T, O>
	: N extends MLASTDoctype ? Doctype<T, O>
	: N extends MLASTNode ? Node<T, O, MLASTNode>
	: N extends MLASTAbstructNode ? Node<T, O, MLASTAbstructNode>
	: N extends MLASTAttr ? Attribute
	: N extends MLToken ? Token<MLToken>
	: never;
