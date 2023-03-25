import type { Parse } from '@markuplint/ml-ast';

import { ignoreFrontMatter, flattenNodes } from '@markuplint/parser-utils';

import { createTree } from './create-tree';
import isDocumentFragment from './is-document-fragment';
import {
	isStartsHeadTagOrBodyTag,
	optimizeStartsHeadTagOrBodyTagResume,
	optimizeStartsHeadTagOrBodyTagSetup,
} from './optimize-starts-head-or-body';

export const parse: Parse = (rawCode, options) => {
	if (options?.ignoreFrontMatter) {
		rawCode = ignoreFrontMatter(rawCode);
	}
	const isFragment = isDocumentFragment(rawCode);

	const data = isStartsHeadTagOrBodyTag(rawCode) ? optimizeStartsHeadTagOrBodyTagSetup(rawCode) : null;
	if (data?.code) {
		rawCode = data.code;
	}

	const nodeTree = createTree(
		rawCode,
		isFragment,
		options?.offsetOffset ?? 0,
		options?.offsetLine ?? 0,
		options?.offsetColumn ?? 0,
	);
	const nodeList = flattenNodes(nodeTree, rawCode);

	if (data) {
		optimizeStartsHeadTagOrBodyTagResume(nodeList, data);
	}

	return {
		nodeList,
		isFragment,
	};
};
