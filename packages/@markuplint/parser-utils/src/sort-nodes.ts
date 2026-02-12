import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

/**
 * Comparator function for sorting AST nodes by their source position.
 * Sorts primarily by offset, then by end offset for nodes at the same position.
 *
 * @param a - The first node to compare
 * @param b - The second node to compare
 * @returns A negative, zero, or positive number for sort ordering
 */
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
