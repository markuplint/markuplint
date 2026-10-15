import type { ParseTemplateResult } from 'astro-eslint-parser';

/**
 * The root `astro-eslint-parser` produces for a template.
 */
export type AstroRoot = ParseTemplateResult['result']['ast'];

type TemplateNode = AstroRoot['body'][number];
type JsxElement = Extract<TemplateNode, { readonly type: 'JSXElement' }>;
type JsxFragment = Extract<TemplateNode, { readonly type: 'JSXFragment' }>;
type JsxChild = JsxElement['children'][number];

/**
 * A node of the Astro template reduced to what {@link import('./parser.js')} needs:
 * its kind, its source range (UTF-16 offsets, `end` exclusive) and the nodes it contains.
 *
 * Attributes are deliberately absent: the parser re-tokenizes the start tag from the
 * source text, so no attribute information is read from the Astro AST.
 */
export type Node =
	| (Range & { readonly type: 'frontmatter' })
	| (Range & { readonly type: 'doctype'; readonly value: string })
	| (Range & { readonly type: 'text' })
	| (Range & { readonly type: 'comment' })
	| (Range & { readonly type: 'element'; readonly children: readonly Node[] })
	| (Range & { readonly type: 'expression'; readonly children: readonly Node[] });

interface Range {
	readonly start: number;
	readonly end: number;
}

/**
 * The nodes of the Astro AST as a flat list of top-level {@link Node}s: the frontmatter
 * (when there is one) followed by the body.
 *
 * ## Why a normalization step exists
 *
 * `astro-eslint-parser` v3 reports a JSX-style AST (`JSXElement`, `JSXText`, ...) where the
 * former compiler reported `element` / `component` / `text` nodes. Three of its shapes
 * differ in a way the parser must not see:
 *
 * - The range of an `AstroScript` child is that of the whole `<script>` element, not of its
 *   body, so the body range is taken from the surrounding start and end tags.
 * - A JSX node inside an expression (`{items.map(i => <li>{i}</li>)}`) is not a child of the
 *   expression container but a descendant of its ESTree expression. The outermost ones are
 *   collected, and the code between them is reported as `text` nodes, which is the layout the
 *   parser relies on to split an expression into its opening and closing parts.
 * - An absent frontmatter is reported as an empty one.
 */
export function toNodes(root: AstroRoot): Node[] {
	const nodes: Node[] = [];

	const { frontmatter } = root;
	if (frontmatter && frontmatter.end > frontmatter.start) {
		nodes.push({ type: 'frontmatter', start: frontmatter.start, end: frontmatter.end });
	}

	for (const node of root.body) {
		nodes.push(...convert(node));
	}

	return nodes;
}

/**
 * Every node that has a range of its own. `AstroScript` is not one: it only occurs as a
 * child of an element, which supplies the range of its body (see {@link toNodes}).
 */
type ConvertibleNode = Exclude<TemplateNode | JsxChild, { readonly type: 'AstroScript' }>;

function convert(node: ConvertibleNode): readonly Node[] {
	const { start, end } = node;

	switch (node.type) {
		case 'AstroDoctype': {
			return [{ type: 'doctype', start, end, value: node.value }];
		}
		case 'AstroComment': {
			return [{ type: 'comment', start, end }];
		}
		case 'JSXText': {
			return [{ type: 'text', start, end }];
		}
		case 'JSXElement': {
			return [
				{
					type: 'element',
					start,
					end,
					children: node.children.flatMap(child => {
						if (child.type !== 'AstroScript') {
							return convert(child);
						}
						// An empty body (`<script />`) is still reported as a script: it has no text.
						const bodyStart = node.openingElement.end;
						const bodyEnd = node.closingElement?.start ?? end;
						return bodyEnd > bodyStart ? [{ type: 'text', start: bodyStart, end: bodyEnd } as const] : [];
					}),
				},
			];
		}
		case 'JSXFragment': {
			return [{ type: 'element', start, end, children: node.children.flatMap(child => convert(child)) }];
		}
		case 'JSXExpressionContainer': {
			return [{ type: 'expression', start, end, children: expressionChildren(node) }];
		}
		default: {
			// Exhaustive: a node type that `astro-eslint-parser` adds fails the build here
			// instead of silently vanishing from the document.
			node satisfies never;
			return [];
		}
	}
}

/**
 * The children of an expression container: the outermost JSX nodes of its expression, with
 * the (non-empty) code between them as `text`. The braces are not part of any child.
 *
 * Empty gaps produce no `text`, as the former compiler did. The parser cuts the opening part of
 * the expression at the end of the first child and the closing part at the start of the last
 * one, so an expression that ends with an element has that element's markup in its closing
 * part (`<input type={type} />}`). That layout is pinned by the `#739` spec in `parser.spec.ts`.
 */
function expressionChildren(container: Extract<JsxChild, { readonly type: 'JSXExpressionContainer' }>): Node[] {
	const jsxNodes = collectJsx(container.expression).toSorted((a, b) => a.start - b.start);
	if (jsxNodes.length === 0) {
		return [];
	}

	const children: Node[] = [];
	// Skip the opening `{`
	let cursor = container.start + 1;
	for (const jsx of jsxNodes) {
		if (jsx.start > cursor) {
			children.push({ type: 'text', start: cursor, end: jsx.start });
		}
		children.push(...convert(jsx));
		cursor = jsx.end;
	}
	// Stop before the closing `}`
	const innerEnd = container.end - 1;
	if (innerEnd > cursor) {
		children.push({ type: 'text', start: cursor, end: innerEnd });
	}
	return children;
}

/**
 * Finds the outermost `JSXElement` / `JSXFragment` nodes in an ESTree subtree. A node found
 * is not descended into: its own descendants are converted when the node itself is.
 */
function collectJsx(value: unknown): (JsxElement | JsxFragment)[] {
	if (typeof value !== 'object' || value === null) {
		return [];
	}
	if (Array.isArray(value)) {
		return value.flatMap(item => collectJsx(item));
	}
	if ('type' in value && (value.type === 'JSXElement' || value.type === 'JSXFragment')) {
		return [value as JsxElement | JsxFragment];
	}
	return Object.entries(value).flatMap(([key, child]) => (key === 'parent' ? [] : collectJsx(child)));
}
