import type { MLASTParentNode, NamespaceURI } from '@markuplint/ml-ast';

/**
 * Determines the namespace URI for a node based on its tag name and parent node context.
 * Handles namespace transitions between HTML, SVG, and MathML
 * (e.g., entering `<svg>` switches to SVG namespace, `<foreignObject>` switches back to HTML).
 *
 * @param currentNodeName - The tag name of the current node, or null for anonymous nodes
 * @param parentNode - The parent node in the AST, or null for root-level nodes
 * @returns The resolved namespace URI for the node
 */
export function getNamespace(currentNodeName: string | null, parentNode: MLASTParentNode | null): NamespaceURI {
	const parentNS = getParentNamespace(parentNode);
	if (parentNS === 'http://www.w3.org/1999/xhtml' && currentNodeName?.toLowerCase() === 'svg') {
		return 'http://www.w3.org/2000/svg';
	} else if (parentNS === 'http://www.w3.org/2000/svg' && parentNode?.nodeName === 'foreignObject') {
		return 'http://www.w3.org/1999/xhtml';
	} else if (parentNS === 'http://www.w3.org/1999/xhtml' && currentNodeName?.toLowerCase() === 'math') {
		return 'http://www.w3.org/1998/Math/MathML';
	}
	return parentNS;
}

function getParentNamespace(parentNode: MLASTParentNode | null): NamespaceURI {
	if (!parentNode) {
		return 'http://www.w3.org/1999/xhtml';
	}
	if ('namespace' in parentNode && parentNode.namespace) {
		const ns = parentNode.namespace.toLowerCase().trim();
		return ns === 'http://www.w3.org/1999/xhtml'
			? 'http://www.w3.org/1999/xhtml'
			: ns === 'http://www.w3.org/2000/svg'
				? 'http://www.w3.org/2000/svg'
				: ns === 'http://www.w3.org/1998/Math/MathML'
					? 'http://www.w3.org/1998/Math/MathML'
					: 'http://www.w3.org/1999/xhtml';
	}
	return getParentNamespace(parentNode.parentNode);
}
