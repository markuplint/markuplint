import type { MLASTDocument, MLASTElement } from '@markuplint/ml-ast';

/**
 * Extracts the first substantive element at depth=0 from a parsed document.
 *
 * Skips text nodes, comments, preprocessor-specific blocks (frontmatter, etc.),
 * and end tags. Returns the first `starttag` node found at depth 0.
 *
 * @param doc - The parsed MLAST document to search
 * @returns The root element, or `null` if only text/comments exist (Fragment-like).
 */
export function extractRoot(doc: MLASTDocument): MLASTElement | null {
	for (const node of doc.nodeList) {
		if (node.type === 'starttag' && node.depth === 0 && !node.isFragment) {
			return node;
		}
	}
	return null;
}
