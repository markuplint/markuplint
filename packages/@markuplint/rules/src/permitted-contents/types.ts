import type { Element as _Element, ChildNode as _ChildNode } from '@markuplint/ml-core';
import type { ContentModel, MLMLSpec } from '@markuplint/ml-spec';

export type Element = _Element<TagRule[], Options>;

export type ChildNode = _ChildNode<TagRule[], Options>;

export type Specs = {
	cites: MLMLSpec['cites'];
	def: MLMLSpec['def'];
	specs: {
		name: string;
		contentModel: {
			contents: MLMLSpec['specs'][0]['contentModel']['contents'];
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
	hint: {
		max?: number;
		not?: ChildNode;
		transparent?: Element;
	};
};

export type MatchedReason = 'MATCHED' | 'MATCHED_ZERO';

export type UnmatchedReason = 'NOTHING' | 'UNEXPECTED_EXTRA_NODE' | 'TRANSPARENT_MODEL_DISALLOWS' | MissingNodeReason;

export type MissingNodeReason = 'MISSING_NODE_REQUIRED' | 'MISSING_NODE_ONE_OR_MORE';

export type TransparentModel = {
	el: Element;
	additionalCondition: string;
};

export type TagRule = {
	tag: string;
} & ContentModel;

export type Options = {
	ignoreHasMutableChildren: boolean;
};
