import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

export function sortNodes(a: MLASTNodeTreeItem, b: MLASTNodeTreeItem) {
	if (a.offset === b.offset) {
		const aEnd = a.offset + a.raw.length;
		const bEnd = b.offset + b.raw.length;
		return sort(aEnd, bEnd);
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
