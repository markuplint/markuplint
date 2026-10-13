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
	return getChildNamespace(currentNodeName, getParentNamespace(parentNode), parentNode?.nodeName ?? null);
}

/**
 * Determines the namespace URI for an element from its tag name and its parent element,
 * by the same transitions as {@link getNamespace}. For a caller that knows the parent's
 * name and namespace but has no AST node for it.
 *
 * @param currentNodeName - The tag name of the element, or null to take the namespace its parent gives any element
 * @param parentNamespace - The namespace URI of the parent element (HTML at the top level)
 * @param parentNodeName - The tag name of the parent element, or null at the top level
 * @returns The resolved namespace URI for the element
 */
export function getChildNamespace(
	currentNodeName: string | null,
	parentNamespace: NamespaceURI,
	parentNodeName: string | null,
): NamespaceURI {
	if (parentNamespace === 'http://www.w3.org/1999/xhtml' && currentNodeName?.toLowerCase() === 'svg') {
		return 'http://www.w3.org/2000/svg';
	} else if (parentNamespace === 'http://www.w3.org/2000/svg' && parentNodeName === 'foreignObject') {
		return 'http://www.w3.org/1999/xhtml';
	} else if (parentNamespace === 'http://www.w3.org/1999/xhtml' && currentNodeName?.toLowerCase() === 'math') {
		return 'http://www.w3.org/1998/Math/MathML';
	}
	return parentNamespace;
}

/**
 * Determines the namespace URI of an element below an ancestor whose own namespace is not
 * known, such as the root of a component, which takes the namespace of where it is used.
 *
 * It is known once the ancestor or the elements between them cross a transition: an `svg`
 * or `math` is taken to enter its namespace, as it does from HTML, and an element below
 * `foreignObject` is HTML whether the `foreignObject` is in SVG or in HTML.
 *
 * @param ancestorName - The tag name of the ancestor, or null for a component or fragment
 * @param names - The tag names from the child of the ancestor down to the element, null for a component
 * @returns The namespace URI of the element, or null when it depends on where the ancestor is
 */
export function getNamespaceBelow(ancestorName: string | null, names: readonly (string | null)[]): NamespaceURI | null {
	let namespace = getEnteredNamespace(ancestorName);
	let parentName = ancestorName;
	for (const name of names) {
		if (namespace) {
			namespace = getChildNamespace(name, namespace, parentName);
		} else {
			namespace =
				getEnteredNamespace(name) ?? (parentName === 'foreignObject' ? 'http://www.w3.org/1999/xhtml' : null);
		}
		parentName = name;
	}
	return namespace;
}

/**
 * The namespace an element enters by its name from HTML, or null if it enters none.
 */
function getEnteredNamespace(name: string | null): NamespaceURI | null {
	const entered = getChildNamespace(name, 'http://www.w3.org/1999/xhtml', null);
	return entered === 'http://www.w3.org/1999/xhtml' ? null : entered;
}

function getParentNamespace(parentNode: MLASTParentNode | null): NamespaceURI {
	if (!parentNode) {
		return 'http://www.w3.org/1999/xhtml';
	}
	if ('namespace' in parentNode && parentNode.namespace) {
		const ns = parentNode.namespace.trim();
		return ns === 'http://www.w3.org/1999/xhtml'
			? 'http://www.w3.org/1999/xhtml'
			: ns === 'http://www.w3.org/2000/svg'
				? 'http://www.w3.org/2000/svg'
				: ns === 'http://www.w3.org/1998/Math/MathML'
					? 'http://www.w3.org/1998/Math/MathML'
					: 'http://www.w3.org/1999/xhtml';
	}
	return getParentNamespace(parentNode.parentNode ?? null);
}
