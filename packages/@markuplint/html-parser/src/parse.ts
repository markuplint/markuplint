import type { Parse } from '@markuplint/ml-ast';

import { ignoreFrontMatter } from '@markuplint/parser-utils';

import { createTree } from './create-tree';
import { flattenNodes } from './flatten-nodes';
import isDocumentFragment from './is-document-fragment';

export const parse: Parse = (rawCode, offsetOffset = 0, offsetLine = 0, offsetColumn = 0, isIgnoringFrontMatter) => {
	if (isIgnoringFrontMatter) {
		rawCode = ignoreFrontMatter(rawCode);
	}
	const isFragment = isDocumentFragment(rawCode);

	const nodeTree = createTree(rawCode, isFragment, offsetOffset, offsetLine, offsetColumn);
	const nodeList = flattenNodes(nodeTree, rawCode);

	return {
		nodeList,
		isFragment,
	};
};
