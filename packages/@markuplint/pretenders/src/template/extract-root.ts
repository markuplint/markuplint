import type { MLASTDocument, MLASTElement } from '@markuplint/ml-ast';

/**
 * Skips text nodes, comments, preprocessor-specific blocks (frontmatter, etc.),
 * and end tags. Returns `null` if only text/comments exist (Fragment-like).
 */
export function extractRoot(doc: MLASTDocument): MLASTElement | null {
	for (const node of doc.nodeList) {
		if (node.type === 'starttag' && node.depth === 0 && !node.isFragment) {
			return node;
		}
	}
	return null;
}
