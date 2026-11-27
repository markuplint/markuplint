import type { MLASTParentNode, NamespaceURI } from '@markuplint/ml-ast';

import { asciiLowerCase, decodeEntities } from '@markuplint/shared';

/**
 * Determines the namespace URI for a node based on its tag name and parent node context.
 * Handles namespace transitions between HTML, SVG, and MathML
 * (e.g., entering `<svg>` switches to SVG namespace, `<foreignObject>` switches back to HTML).
 *
 * @param currentNodeName - The tag name of the current node, or null for anonymous nodes and
 *   for an authored element (a component), which does not enter a namespace by its name
 * @param parentNode - The parent node in the AST, or null for root-level nodes
 * @returns The resolved namespace URI for the node
 */
export function getNamespace(currentNodeName: string | null, parentNode: MLASTParentNode | null): NamespaceURI {
	return getChildNamespace(
		currentNodeName,
		getParentNamespace(parentNode),
		// A component (`<Title>`, `<ForeignObject>`) is no integration point, whatever its name
		parentNode && 'elementType' in parentNode && parentNode.elementType === 'authored'
			? null
			: (parentNode?.nodeName ?? null),
		getEncoding(parentNode),
	);
}

/**
 * Determines the namespace URI for an element from its tag name and its parent element,
 * by the same transitions as {@link getNamespace}. For a caller that knows the parent's
 * name and namespace but has no AST node for it.
 *
 * The child of an integration point is processed as in HTML: the tree construction dispatcher processes a token by
 * the rules of the current insertion mode in HTML content when
 *
 * > If the adjusted current node is a MathML text integration point and the token is a start tag whose tag name is neither "mglyph" nor "malignmark"
 *
 * > If the adjusted current node is a MathML annotation-xml element and the token is a start tag whose tag name is "svg"
 *
 * > If the adjusted current node is an HTML integration point and the token is a start tag
 *
 * and the integration points are these:
 *
 * > A node is a MathML text integration point if it is one of the following elements:
 *
 * > A node is an HTML integration point if it is one of the following elements:
 *
 * > A MathML annotation-xml element whose start tag token had an attribute with the name "encoding" whose value was an ASCII case-insensitive match for "text/html"
 *
 * > A MathML annotation-xml element whose start tag token had an attribute with the name "encoding" whose value was an ASCII case-insensitive match for "application/xhtml+xml"
 *
 * The names are compared ASCII case-insensitively: the HTML parser lowercases a tag name (and adjusts the case of an
 * SVG name afterwards), and a parser that keeps the name as written (`<svg><foreignobject>` of a Vue template) means
 * the same element.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
 * @see https://html.spec.whatwg.org/multipage/parsing.html#mathml-text-integration-point
 * @see https://html.spec.whatwg.org/multipage/parsing.html#html-integration-point
 * @param currentNodeName - The tag name of the element, or null to take the namespace its parent gives any element
 * @param parentNamespace - The namespace URI of the parent element (HTML at the top level)
 * @param parentNodeName - The tag name of the parent element, or null at the top level
 * @param parentEncoding - The `encoding` attribute of the parent element, which decides whether an `annotation-xml`
 *   is an HTML integration point (absent: it is not)
 * @returns The resolved namespace URI for the element
 */
export function getChildNamespace(
	currentNodeName: string | null,
	parentNamespace: NamespaceURI,
	parentNodeName: string | null,
	parentEncoding?: string | null,
): NamespaceURI {
	const name = currentNodeName?.toLowerCase();
	const parent = parentNodeName?.toLowerCase() ?? '';
	let namespace = parentNamespace;
	if (parentNamespace === 'http://www.w3.org/2000/svg' && SVG_HTML_INTEGRATION_POINTS.has(parent)) {
		namespace = 'http://www.w3.org/1999/xhtml';
	} else if (parentNamespace === 'http://www.w3.org/1998/Math/MathML') {
		if (MATHML_TEXT_INTEGRATION_POINTS.has(parent) && name !== 'mglyph' && name !== 'malignmark') {
			namespace = 'http://www.w3.org/1999/xhtml';
		} else if (parent === 'annotation-xml') {
			if (name === 'svg') {
				return 'http://www.w3.org/2000/svg';
			}
			if (isHtmlEncoding(parentEncoding)) {
				namespace = 'http://www.w3.org/1999/xhtml';
			}
		}
	}
	if (namespace === 'http://www.w3.org/1999/xhtml' && name === 'svg') {
		return 'http://www.w3.org/2000/svg';
	} else if (namespace === 'http://www.w3.org/1999/xhtml' && name === 'math') {
		return 'http://www.w3.org/1998/Math/MathML';
	}
	return namespace;
}

/**
 * The HTML integration points of SVG (`foreignObject`, `desc`, `title`), by their names in lowercase.
 */
const SVG_HTML_INTEGRATION_POINTS: ReadonlySet<string> = new Set(['foreignobject', 'desc', 'title']);

/**
 * The MathML text integration points.
 */
const MATHML_TEXT_INTEGRATION_POINTS: ReadonlySet<string> = new Set(['mi', 'mo', 'mn', 'ms', 'mtext']);

/**
 * @param encoding - The value of the `encoding` attribute of an `annotation-xml`
 * @returns Whether it makes the `annotation-xml` an HTML integration point
 */
function isHtmlEncoding(encoding: string | null | undefined) {
	const value = encoding == null ? null : asciiLowerCase(encoding);
	return value === 'text/html' || value === 'application/xhtml+xml';
}

/**
 * An element between an ancestor and an element below it, for {@link getNamespaceBelow}: its tag name (null for a
 * component), or its tag name with its `encoding` attribute, which an `annotation-xml` needs.
 */
export type NamespaceSubject = string | null | { readonly name: string | null; readonly encoding: string | null };

/**
 * Determines the namespace URI of an element below an ancestor whose own namespace is not
 * known, such as the root of a component, which takes the namespace of where it is used.
 *
 * The elements between the ancestor and the element are not in the tree of the document (ml-core makes the element a
 * child of the ancestor), so the namespace is said here when they decide it. A name is taken in the namespaces that
 * define it: `title` in MathML or `mi` in SVG is not an element of that namespace.
 *
 * It is known once the ancestor or the elements between them cross a transition: an `svg`
 * or `math` is taken to enter its namespace, as it does from HTML, and the child of an integration point that is HTML
 * wherever it is (`foreignObject`, `desc` and `title`, which are HTML elements or SVG HTML integration points, and `mi`,
 * `mo`, `mn`, `ms` and `mtext`, which are HTML elements or MathML text integration points, and an `annotation-xml`
 * whose `encoding` is HTML) is HTML.
 *
 * @param ancestor - The ancestor (its tag name, or null for a component or fragment)
 * @param names - The elements from the child of the ancestor down to the element
 * @returns The namespace URI of the element, or null when it depends on where the ancestor is
 */
export function getNamespaceBelow(ancestor: NamespaceSubject, names: readonly NamespaceSubject[]): NamespaceURI | null {
	let namespace = getEnteredNamespace(nameOf(ancestor));
	let parent: NamespaceSubject = ancestor;
	for (const subject of names) {
		const name = nameOf(subject);
		const parentName = nameOf(parent);
		if (namespace) {
			namespace = getChildNamespace(name, namespace, parentName, encodingOf(parent));
		} else {
			namespace =
				getEnteredNamespace(name) ??
				(isHtmlBelowAnywhere(name, parentName, encodingOf(parent)) ? 'http://www.w3.org/1999/xhtml' : null);
		}
		parent = subject;
	}
	return namespace;
}

function nameOf(subject: NamespaceSubject): string | null {
	return subject !== null && typeof subject === 'object' ? subject.name : subject;
}

function encodingOf(subject: NamespaceSubject): string | null {
	return subject !== null && typeof subject === 'object' ? subject.encoding : null;
}

/**
 * Whether an element is HTML below a parent of this name in HTML, in SVG and in MathML alike.
 */
function isHtmlBelowAnywhere(name: string | null, parentName: string | null, parentEncoding: string | null): boolean {
	const parent = parentName?.toLowerCase() ?? '';
	if (SVG_HTML_INTEGRATION_POINTS.has(parent)) {
		return true;
	}
	// An `annotation-xml` whose encoding is HTML: an HTML element in HTML, an HTML integration point in MathML
	if (parent === 'annotation-xml' && isHtmlEncoding(parentEncoding)) {
		return true;
	}
	const lower = name?.toLowerCase();
	return MATHML_TEXT_INTEGRATION_POINTS.has(parent) && lower !== 'mglyph' && lower !== 'malignmark';
}

/**
 * The namespace an element enters by its name from HTML, or null if it enters none.
 */
function getEnteredNamespace(name: string | null): NamespaceURI | null {
	const entered = getChildNamespace(name, 'http://www.w3.org/1999/xhtml', null);
	return entered === 'http://www.w3.org/1999/xhtml' ? null : entered;
}

/**
 * The `encoding` attribute of an element of the AST, which decides whether an `annotation-xml` is an HTML integration
 * point. A parser that cannot see an `annotation-xml` passes the result to {@link getNamespaceBelow}.
 *
 * @param node - A parent node of the AST
 * @returns The value of its `encoding` attribute, with its character references decoded, or null when it has none
 */
export function getEncoding(node: MLASTParentNode | null): string | null {
	if (!node || !('attributes' in node)) {
		return null;
	}
	for (const attr of node.attributes) {
		if (attr.type === 'attr' && asciiLowerCase(attr.name.raw) === 'encoding') {
			// A string in an expression container (`encoding={"text/html"}` of JSX) is the string; other code is not known
			if (attr.startQuote.raw === '{') {
				return /^(["'`])([^"'\\`]*)\1$/.exec(attr.value.raw.trim())?.[2] ?? null;
			}
			return decodeEntities(attr.value.raw);
		}
	}
	return null;
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
