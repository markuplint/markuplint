import type { MLToken } from '../token/token';
import type { MLAttr } from './attr';
import type { MLBlock } from './block';
import type { MLComment } from './comment';
import type { MLDocument } from './document';
import type { MLDocumentFragment } from './document-fragment';
import type { MLDocumentType } from './document-type';
import type { MLElement } from './element';
import type { MLNode } from './node';
import type { MLText } from './text';
import type {
	MLASTAbstructNode,
	MLASTAttr,
	MLASTComment,
	MLASTDoctype,
	MLASTElement,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTText,
	MLToken as MLASTToken,
} from '@markuplint/ml-ast/';
import type { RuleConfigValue } from '@markuplint/ml-config';

// prettier-ignore
export type MappedNode<N, T extends RuleConfigValue, O = null>
	= N extends MLASTElement ? MLElement<T, O>
	: N extends MLASTParentNode ? MLElement<T, O>
	: N extends MLASTComment ? MLComment<T, O>
	: N extends MLASTText ? MLText<T, O>
	: N extends MLASTDoctype ? MLDocumentType<T, O>
	: N extends MLASTPreprocessorSpecificBlock ? MLBlock<T, O>
	: N extends MLASTAbstructNode ? MLNode<T, O, MLASTAbstructNode>
	: N extends MLASTAttr ? MLAttr<T, O>
	: N extends MLASTToken ? MLToken
	: never;

// prettier-ignore
export type NodeTypeOf<NT extends NodeType, T extends RuleConfigValue, O = null>
= NT extends ElementNodeType ? MLElement<T, O>
: NT extends CommentNodeType ? MLComment<T, O>
: NT extends TextNodeType ? MLText<T, O>
: NT extends DocumentNodeType ? MLDocument<T, O>
: NT extends DocumentTypeNodeType ? MLDocumentType<T, O>
: NT extends DocumentFragmentNodeType ? MLDocumentFragment<T, O>
: NT extends MarkuplintPreprocessorBlockType ? MLBlock<T, O>
: NT extends AttributeNodeType ? MLAttr<T, O>
: never;

export type ElementNodeType = 1;
export type AttributeNodeType = 2;
export type TextNodeType = 3;
export type CDATASectionNodeType = 4;
export type ProcessingInstructionNodeType = 7;
export type CommentNodeType = 8;
export type DocumentNodeType = 9;
export type DocumentTypeNodeType = 10;
export type DocumentFragmentNodeType = 11;
export type MarkuplintPreprocessorBlockType = 101;

export type NodeType =
	| ElementNodeType
	| AttributeNodeType
	| TextNodeType
	| CDATASectionNodeType
	| ProcessingInstructionNodeType
	| CommentNodeType
	| DocumentNodeType
	| DocumentTypeNodeType
	| DocumentFragmentNodeType
	| MarkuplintPreprocessorBlockType;
