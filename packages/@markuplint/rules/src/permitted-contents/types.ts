import type { Element as _Element, ChildNode as _ChildNode } from '@markuplint/ml-core';
import type { ContentModel, MLMLSpec } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

/**
 * An element node parameterized with the permitted-contents rule's TagRule and Options.
 */
export type Element = _Element<TagRule[], Options>;

/**
 * A child node parameterized with the permitted-contents rule's TagRule and Options.
 */
export type ChildNode = _ChildNode<TagRule[], Options>;

/**
 * A subset of the full ML spec containing only the fields needed
 * for content model validation: citation references, global definitions,
 * and per-element content model specifications.
 */
export type Specs = {
	readonly cites: MLMLSpec['cites'];
	readonly def: MLMLSpec['def'];
	readonly specs: readonly {
		readonly name: string;
		readonly contentModel: {
			readonly contents: MLMLSpec['specs'][0]['contentModel']['contents'];
		};
	}[];
};

/**
 * The final result of content model validation for a single child node,
 * indicating whether the node is permitted, missing, or unexpected
 * within its parent element's content model.
 */
export type ContentModelResult = {
	type: MatchedReason | UnmatchedReason;
	scope: ChildNode;
	query: Result['query'];
	hint: Result['hint'];
};

/**
 * An intermediate result produced during content model pattern matching.
 * Tracks which child nodes were matched, which were unmatched, and
 * provides diagnostic hints about the nature of a mismatch.
 *
 * @template T - Additional result type strings beyond the standard matched/unmatched reasons.
 */
export type Result<T extends string = MatchedReason> = {
	type: MatchedReason | UnmatchedReason | T;
	matched: ChildNode[];
	unmatched: ChildNode[];
	zeroMatch: boolean;
	query: string;
	hint: Hints;
};

/**
 * Diagnostic hints attached to a content model result, providing additional
 * context for error reporting such as maximum allowed count, the offending
 * node, or information about transparent model violations.
 */
export type Hints = {
	max?: number;
	not?: ChildNode;
	transparent?: Element;
	missing?: {
		barelyMatchedElements?: number;
		need?: string;
	};
};

/**
 * Reasons indicating that a content model pattern successfully matched.
 * `MATCHED` means one or more nodes matched; `MATCHED_ZERO` means the pattern
 * matched vacuously (zero nodes consumed, but the pattern allows it).
 */
export type MatchedReason = 'MATCHED' | 'MATCHED_ZERO';

/**
 * Reasons indicating that a content model pattern did not match.
 * Includes cases where content is disallowed entirely, an unexpected node
 * was found, a transparent model forbids the node, or a required node is missing.
 */
export type UnmatchedReason = 'NOTHING' | 'UNEXPECTED_EXTRA_NODE' | 'TRANSPARENT_MODEL_DISALLOWS' | MissingNodeReason;

/**
 * Specific reasons for a missing node: either a required element is absent,
 * or one-or-more occurrences are expected but none were found.
 */
export type MissingNodeReason = 'MISSING_NODE_REQUIRED' | 'MISSING_NODE_ONE_OR_MORE';

/**
 * A regular-expression-like repeat sign used to describe the quantifier
 * of a content model pattern (e.g., `?` for optional, `+` for one-or-more,
 * `*` for zero-or-more, or `{min,max}` for a specific range).
 */
export type RepeatSign = '' | '?' | '+' | '*' | `{${number},${number}}`;

/**
 * Describes a transparent content model element along with any additional
 * CSS selector condition that must be satisfied for the transparency to apply.
 */
export type TransparentModel = {
	el: Element;
	additionalCondition: string;
};

/**
 * A user-defined tag rule that associates an element tag name with
 * its permitted content model definition, used to override or extend
 * the built-in HTML spec content models.
 */
export type TagRule = {
	readonly tag: string;
} & ReadonlyDeep<ContentModel>;

/**
 * Which identity of a pretendered element is being evaluated during a
 * content-model check. `'pretended'` is the default view: the element is
 * validated against the HTML spec for the pretender target name (e.g. a
 * `<Breadcrumbs>` pretending to `<nav>` is validated as `<nav>`).
 * `'origin'` re-runs the validation with the pretender context suppressed,
 * so the element is validated against any user-defined tag rule keyed on
 * the original AST name (e.g. `Breadcrumbs`).
 *
 * The mode is threaded through every helper so that selector matching,
 * transparent-model resolution, and content-model lookups all agree on the
 * same view of the element identity.
 */
export type Mode = 'origin' | 'pretended';

/**
 * Options for the permitted-contents rule that control validation behavior.
 */
export type Options = {
	/**
	 * When true, skips reporting missing-node errors on elements that
	 * have mutable children (e.g., elements whose children may be
	 * dynamically injected by a framework or template engine).
	 */
	readonly ignoreHasMutableChildren: boolean;

	/**
	 * @experimental
	 * When true, evaluates conditional child node branches (e.g., from
	 * template directives like `v-if`) to validate each possible branch
	 * against the content model.
	 */
	readonly evaluateConditionalChildNodes: boolean;
};
