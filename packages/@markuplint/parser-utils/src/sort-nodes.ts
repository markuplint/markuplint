import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

export function sortNodes(a: MLASTNodeTreeItem, b: MLASTNodeTreeItem) {
	if (a.startOffset === b.startOffset) {
		return sort(a.endOffset, b.endOffset);
	}

	return sort(a.startOffset, b.startOffset);
}

function sort(a: number, b: number) {
	const diff = a - b;
	if (Number.isNaN(diff)) {
		return 0;
	}
	return diff;
}
