import type { Parse } from '@markuplint/ml-ast';

import { ignoreFrontMatter } from '@markuplint/parser-utils';

import { createTree } from './create-tree';
import { flattenNodes } from './flatten-nodes';
import isDocumentFragment from './is-document-fragment';
import {
	isStartsHeadTagOrBodyTag,
	optimizeStartsHeadTagOrBodyTagResume,
	optimizeStartsHeadTagOrBodyTagSetup,
} from './optimize-starts-head-or-body';

export const parse: Parse = (rawCode, offsetOffset = 0, offsetLine = 0, offsetColumn = 0, options) => {
	if (options?.ignoreFrontMatter) {
		rawCode = ignoreFrontMatter(rawCode);
	}
	const isFragment = isDocumentFragment(rawCode);

	const data = isStartsHeadTagOrBodyTag(rawCode) ? optimizeStartsHeadTagOrBodyTagSetup(rawCode) : null;
	if (data?.code) {
		rawCode = data.code;
	}

	const nodeTree = createTree(rawCode, isFragment, offsetOffset, offsetLine, offsetColumn);
	const nodeList = flattenNodes(nodeTree, rawCode);

	if (data) {
		optimizeStartsHeadTagOrBodyTagResume(nodeList, data);
	}

	return {
		nodeList,
		isFragment,
	};
};
