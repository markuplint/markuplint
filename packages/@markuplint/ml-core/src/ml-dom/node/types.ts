import type { MLAttr } from './attr.js';
import type { MLBlock } from './block.js';
import type { MLComment } from './comment.js';
import type { MLDocumentFragment } from './document-fragment.js';
import type { MLDocumentType } from './document-type.js';
import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MLText } from './text.js';
import type { MLToken } from '../token/token.js';
import type {
	MLASTAttr,
	MLASTComment,
	MLASTDoctype,
	MLASTElement,
	MLASTInvalid,
	MLASTParentNode,
	MLASTPreprocessorSpecificBlock,
	MLASTText,
	MLASTToken as MLASTToken,
} from '@markuplint/ml-ast/';
import type { PlainData, PretenderARIA, RuleConfigValue } from '@markuplint/ml-config';

// prettier-ignore
export type MappedNode<N, T extends RuleConfigValue, O extends PlainData = undefined>
	= N extends MLASTElement ? MLElement<T, O>
	: N extends MLASTParentNode ? MLElement<T, O>
	: N extends MLASTComment ? MLComment<T, O>
	: N extends MLASTText ? MLText<T, O>
	: N extends MLASTDoctype ? MLDocumentType<T, O>
	: N extends MLASTPreprocessorSpecificBlock ? MLBlock<T, O>
	: N extends MLASTAttr ? MLAttr<T, O>
	: N extends MLASTInvalid ? MLText<T, O>
	: N extends MLASTToken ? MLToken
	: never;

// prettier-ignore
export type NodeTypeOf<NT extends NodeType, T extends RuleConfigValue, O extends PlainData = undefined>
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

export type PretenderContext<N extends MLElement<T, O>, T extends RuleConfigValue, O extends PlainData = undefined> =
	| PretenderContextPretender<N, T, O>
	| PretenderContextPretended<N, T, O>;

export type PretenderContextPretender<
	N extends MLElement<T, O>,
	T extends RuleConfigValue,
	O extends PlainData = undefined,
> = {
	readonly type: 'pretender';
	readonly as: N;
	readonly aria?: PretenderARIA;
};

export type PretenderContextPretended<
	N extends MLElement<T, O>,
	T extends RuleConfigValue,
	O extends PlainData = undefined,
> = {
	readonly type: 'origin';
	readonly origin: N;
};

export type AccessibilityProperties = ClearlyAccessibilityProperties | UnknownAccessibilityProperties;

export type ClearlyAccessibilityProperties = {
	unknown: false;
	exposedToTree: boolean;
	role?: string;
	roleDescription?: string;
	name?: string | { unknown: true };
	nameRequired?: boolean;
	nameProhibited?: boolean;
	focusable?: boolean;
	props?: Record<string, AccessibilityProperty>;
};

export type UnknownAccessibilityProperties = {
	unknown: true;
};

export type AccessibilityProperty = {
	value: string | null;
	required: boolean;
};
