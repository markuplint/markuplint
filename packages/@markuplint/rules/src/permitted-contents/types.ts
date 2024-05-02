import type { Element as _Element, ChildNode as _ChildNode } from '@markuplint/ml-core';
import type { ContentModel, MLMLSpec } from '@markuplint/ml-spec';
import type { ReadonlyDeep } from 'type-fest';

export type Element = _Element<TagRule[], Options>;

export type ChildNode = _ChildNode<TagRule[], Options>;

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

export type ContentModelResult = {
	type: MatchedReason | UnmatchedReason;
	scope: ChildNode;
	query: Result['query'];
	hint: Result['hint'];
};

export type Result<T extends string = MatchedReason> = {
	type: MatchedReason | UnmatchedReason | T;
	matched: ChildNode[];
	unmatched: ChildNode[];
	zeroMatch: boolean;
	query: string;
	hint: Hints;
};

export type Hints = {
	max?: number;
	not?: ChildNode;
	transparent?: Element;
	missing?: {
		barelyMatchedElements?: number;
		need?: string;
	};
};

export type MatchedReason = 'MATCHED' | 'MATCHED_ZERO';

export type UnmatchedReason = 'NOTHING' | 'UNEXPECTED_EXTRA_NODE' | 'TRANSPARENT_MODEL_DISALLOWS' | MissingNodeReason;

export type MissingNodeReason = 'MISSING_NODE_REQUIRED' | 'MISSING_NODE_ONE_OR_MORE';

export type RepeatSign = '' | '?' | '+' | '*' | `{${number},${number}}`;

export type TransparentModel = {
	el: Element;
	additionalCondition: string;
};

export type TagRule = {
	readonly tag: string;
} & ReadonlyDeep<ContentModel>;

export type Options = {
	readonly ignoreHasMutableChildren: boolean;

	/**
	 * @experimental
	 */
	readonly evaluateConditionalChildNodes: boolean;
};
