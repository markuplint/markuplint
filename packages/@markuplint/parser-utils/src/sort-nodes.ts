import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

export function sortNodes(a: MLASTNodeTreeItem, b: MLASTNodeTreeItem) {
	if (a.offset === b.offset) {
		return sort(a.offset + a.raw.length, b.offset + b.raw.length);
	}

	return sort(a.offset, b.offset);
}

function sort(a: number, b: number) {
	const diff = a - b;
	if (Number.isNaN(diff)) {
		return 0;
	}
	return diff;
}
