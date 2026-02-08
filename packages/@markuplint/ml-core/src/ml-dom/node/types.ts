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

/**
 * Maps an AST node type to its corresponding markuplint DOM node wrapper type.
 *
 * @template N - The AST node type to map from
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
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

/**
 * Resolves a numeric node type constant to its corresponding markuplint DOM node class type.
 * Used for type narrowing via the `is()` method on nodes.
 *
 * @template NT - The numeric node type constant
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
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

/** Numeric constant representing an Element node (corresponds to DOM `Node.ELEMENT_NODE`). */
export type ElementNodeType = 1;
/** Numeric constant representing an Attribute node (corresponds to DOM `Node.ATTRIBUTE_NODE`). */
export type AttributeNodeType = 2;
/** Numeric constant representing a Text node (corresponds to DOM `Node.TEXT_NODE`). */
export type TextNodeType = 3;
/** Numeric constant representing a CDATA Section node (corresponds to DOM `Node.CDATA_SECTION_NODE`). */
export type CDATASectionNodeType = 4;
/** Numeric constant representing a Processing Instruction node (corresponds to DOM `Node.PROCESSING_INSTRUCTION_NODE`). */
export type ProcessingInstructionNodeType = 7;
/** Numeric constant representing a Comment node (corresponds to DOM `Node.COMMENT_NODE`). */
export type CommentNodeType = 8;
/** Numeric constant representing a Document node (corresponds to DOM `Node.DOCUMENT_NODE`). */
export type DocumentNodeType = 9;
/** Numeric constant representing a DocumentType node (corresponds to DOM `Node.DOCUMENT_TYPE_NODE`). */
export type DocumentTypeNodeType = 10;
/** Numeric constant representing a DocumentFragment node (corresponds to DOM `Node.DOCUMENT_FRAGMENT_NODE`). */
export type DocumentFragmentNodeType = 11;
/** Numeric constant representing a markuplint preprocessor block node, used for template engine constructs. */
export type MarkuplintPreprocessorBlockType = 101;

/**
 * Union of all supported node type constants in the markuplint DOM,
 * including standard DOM node types and the markuplint-specific preprocessor block type.
 */
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

/**
 * Represents the pretender context for an element, which can be either
 * a pretender (an element acting as another) or a pretended element (the original).
 *
 * @template N - The element type
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export type PretenderContext<N extends MLElement<T, O>, T extends RuleConfigValue, O extends PlainData = undefined> =
	| PretenderContextPretender<N, T, O>
	| PretenderContextPretended<N, T, O>;

/**
 * Context for an element that is pretending to be another element.
 * Contains the target element it is pretending to be and optional ARIA overrides.
 *
 * @template N - The element type
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export type PretenderContextPretender<
	N extends MLElement<T, O>,
	T extends RuleConfigValue,
	O extends PlainData = undefined,
> = {
	readonly type: 'pretender';
	readonly as: N;
	readonly aria?: PretenderARIA;
};

/**
 * Context for the original element that has been pretended by another element.
 * Contains a reference back to the pretending origin element.
 *
 * @template N - The element type
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export type PretenderContextPretended<
	N extends MLElement<T, O>,
	T extends RuleConfigValue,
	O extends PlainData = undefined,
> = {
	readonly type: 'origin';
	readonly origin: N;
};

/**
 * Represents the computed accessibility properties for a node,
 * which may be clearly resolved or unknown.
 */
export type AccessibilityProperties = ClearlyAccessibilityProperties | UnknownAccessibilityProperties;

/**
 * Resolved accessibility properties for a node, including its ARIA role,
 * accessible name, focusability, and related ARIA property values.
 */
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

/**
 * Represents accessibility properties that could not be resolved,
 * typically when the element or its role is not recognized.
 */
export type UnknownAccessibilityProperties = {
	unknown: true;
};

/**
 * A single ARIA property with its computed value and whether it is required for the role.
 */
export type AccessibilityProperty = {
	value: string | null;
	required: boolean;
};
