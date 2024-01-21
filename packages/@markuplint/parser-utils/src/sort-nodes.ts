import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

export function sortNodes(a: MLASTNodeTreeItem, b: MLASTNodeTreeItem) {
	if (a.startOffset === b.startOffset) {
		return sort(a, b, 'endOffset');
	}

	return sort(a, b, 'startOffset');
}

function sort<K extends keyof O, O extends {}>(a: O, b: O, key: K) {
	if (Number.isNaN(a[key]) || Number.isNaN(b[key])) {
		return 0;
	}
	if (a[key] < b[key]) {
		return -1;
	}
	if (a[key] > b[key]) {
		return 1;
	}
	return 0;
}
