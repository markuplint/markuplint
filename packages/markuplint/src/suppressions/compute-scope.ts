/**
 * @experimental
 * Scope computation for bulk suppressions (Phase 2).
 * Computes the Lowest Common Ancestor (LCA) of violation nodes and generates
 * a minimal CSS selector to identify the subtree containing all violations.
 *
 * Selector precision is deliberately preferred over refactoring stability:
 * id/class/attribute selectors may stop matching after a DOM refactoring,
 * but a broken scope fails safe — it matches zero nodes, the scoped count
 * (0) stays within the suppressed count, and the entry merely lingers as
 * "unused" until `--prune-suppressions` cleans it up. New violations are
 * never hidden. Loose tag-only selectors (e.g. `div > div > div`) were
 * rejected because an unrelated matching subtree elsewhere in the file
 * could absorb new violations into the suppressed count and hide
 * regressions — the genuinely dangerous failure mode.
 *
 * Caveat for template languages (Vue, Svelte, etc.): the generated selector
 * reflects the parsed DOM structure, which may differ from the authored
 * source template.
 *
 * @see https://github.com/markuplint/markuplint/issues/3509
 */

import type { Violation } from '@markuplint/ml-config';

/**
 * @experimental
 * Minimal node interface for scope computation.
 * Defined as a standalone interface (rather than importing `SelectorElement`
 * from `@markuplint/selector`) to avoid coupling the `markuplint` package
 * to the selector package's internal types. Both `SelectorElement` and
 * `MLElement` satisfy this interface via structural typing.
 */
export interface ScopedNode {
	readonly nodeType: number;
	readonly localName: string;
	readonly id: string;
	readonly classList: Iterable<string> & { contains(className: string): boolean };
	readonly attributes: Iterable<{ readonly name: string; readonly value: string }>;
	readonly parentElement: ScopedNode | null;
	readonly children: Iterable<ScopedNode>;
}

/**
 * @experimental
 * Node with position information for reverse-lookup from violations.
 */
export interface PositionedNode extends ScopedNode {
	readonly startLine: number;
	readonly startCol: number;
}

const BODY_HTML_TAGS = new Set(['body', 'html']);

/**
 * The position that ends a segment of a scope: `:nth-of-type(n)`.
 * A name never ends with it unescaped, because the `:` and the `()` of a name are written escaped
 * ({@link serializeIdentifier}), so what ends a segment so is the position.
 */
const NTH_OF_TYPE = /^:nth-of-type\((\d+)\)$/;

/**
 * The non-ASCII ident code points of CSS, inclusive: the same as HTML's valid custom element names.
 * U+200C and U+200D (zero width joiners) are the other two, and are checked apart: a joiner in a character
 * class makes the linter read the class as a joined character sequence.
 * @see https://www.w3.org/TR/css-syntax-3/#non-ascii-ident-code-point
 */
const NON_ASCII_IDENT_CODE_POINT =
	/^[\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u{10000}-\u{10FFFF}]$/u;

/**
 * @experimental
 * Writes a tag name, a class name or an id into a scope, by the CSSOM algorithm "serialize an identifier"
 * (the one `CSS.escape()` is specified by), in which a code point that is not an ident code point of CSS
 * Syntax is escaped, so the output is always one identifier. A NUL is written as U+FFFD, as the algorithm
 * has it, so it does not read back as NUL. A scope is a CSS selector, and CSS lets any code point be part
 * of an identifier by escaping it, "even ones that CSS uses in its syntax". So `Tabs.Root` (a member tag of JSX, MDX or Svelte) is `Tabs\.Root` and not the element
 * `Tabs` with the class `Root`, `py-1.5` is `py-1\.5`, `hover:bg-x` is `hover\:bg-x`, `2xl:flex` is
 * `\32 xl\:flex`, and a class that ends with `:nth-of-type(2)` is no position. What this writes and what
 * {@link unescapeIdentifier} reads are one form, so a scope matches the element it was made for.
 *
 * A scope file written before the escape holds names unescaped, and they still read as the syntax,
 * because every scope that ever matched was written so (`unescapeIdentifier` leaves a character that is
 * not escaped as it is). A scope for a name with a `.` never matched, except in the form
 * `tag[attr="value"]`, whose tag has always been read as a name. Likewise a scope for a name that ends
 * with `:nth-of-type(n)` (`div.a:nth-of-type(2)`) never matched, and is still read as a position. A `\`
 * that such a file holds is read as CSS reads it: `\ba` is the hex escape U+00BA.
 *
 * @see https://drafts.csswg.org/cssom/#serialize-an-identifier
 */
export function serializeIdentifier(name: string): string {
	let result = '';
	let index = 0;
	for (const char of name) {
		const isDigit = char >= '0' && char <= '9';
		if (char === '\u0000') {
			result += '\uFFFD';
		} else if (
			// U+0001 to U+001F and U+007F
			(char.codePointAt(0)! >= 1 && char.codePointAt(0)! <= 31) ||
			char.codePointAt(0) === 127 ||
			(index === 0 && isDigit) ||
			(index === 1 && isDigit && name.startsWith('-'))
		) {
			result += `\\${char.codePointAt(0)!.toString(16)} `;
		} else if (index === 0 && char === '-' && name.length === 1) {
			result += String.raw`\-`;
		} else if (
			char === '-' ||
			char === '_' ||
			isDigit ||
			/^[a-z]$/i.test(char) ||
			NON_ASCII_IDENT_CODE_POINT.test(char) ||
			char === '\u200C' ||
			char === '\u200D'
		) {
			result += char;
		} else {
			result += `\\${char}`;
		}
		index++;
	}
	return result;
}

/** 1 to 6 hex digits of an escape, and the one whitespace that ends them. Sticky: it matches at `lastIndex`. */
const HEX_ESCAPE = /[\dA-F]{1,6}(?:\r\n|[\t\n\f\r ])?/iy;

/**
 * The one scanner of a scope segment, which {@link unescapeIdentifier}, {@link splitScopeIdents},
 * {@link splitScopeAttr} and {@link splitScopeNth} read with: yields each character (an escape is one
 * character) with the index it starts at, and whether a `\` escaped it. The escapes are the ones of CSS.
 *
 * @see https://www.w3.org/TR/css-syntax-3/#consume-escaped-code-point
 */
function* scanScope(
	segment: string,
): Generator<{ readonly index: number; readonly char: string; readonly escaped: boolean }> {
	for (let i = 0; i < segment.length; i++) {
		const char = segment[i]!;
		const next = segment[i + 1];
		if (char !== '\\' || next === '\n' || next === '\r' || next === '\f') {
			// A `\` before a newline is no escape
			yield { index: i, char, escaped: false };
			continue;
		}
		if (next === undefined) {
			yield { index: i, char: '\uFFFD', escaped: true };
			continue;
		}
		HEX_ESCAPE.lastIndex = i + 1;
		const hex = HEX_ESCAPE.exec(segment);
		if (hex) {
			const codePoint = Number.parseInt(hex[0], 16);
			// Zero, a surrogate (U+D800 to U+DFFF) and a value over U+10FFFF are U+FFFD
			const isValid = codePoint !== 0 && !(codePoint >= 55_296 && codePoint <= 57_343) && codePoint <= 1_114_111;
			yield { index: i, char: isValid ? String.fromCodePoint(codePoint) : '\uFFFD', escaped: true };
			i += hex[0].length;
			continue;
		}
		const escapedChar = String.fromCodePoint(segment.codePointAt(i + 1)!);
		yield { index: i, char: escapedChar, escaped: true };
		i += escapedChar.length;
	}
}

/**
 * @experimental
 * Reads an identifier of a scope, the reading side of {@link serializeIdentifier}: the escapes of CSS
 * (`\` and 1 to 6 hex digits with one whitespace, or `\` and any other character), and a character that
 * is not escaped as it is.
 */
export function unescapeIdentifier(escaped: string): string {
	let result = '';
	for (const { char } of scanScope(escaped)) {
		result += char;
	}
	return result;
}

/**
 * @experimental
 * Splits a compound scope segment (`tag.classA.classB`) at its unescaped `.` and unescapes each part,
 * the reading side of {@link generateUniqueSelector}. The first part is the tag, the rest are classes.
 */
export function splitScopeIdents(segment: string): string[] {
	const parts: string[] = [''];
	for (const { char, escaped } of scanScope(segment)) {
		if (!escaped && char === '.') {
			parts.push('');
		} else {
			parts[parts.length - 1] += char;
		}
	}
	return parts;
}

/**
 * @experimental
 * Splits the form `tag[attr="value"]`. The tag is what comes before the first `[` that is not escaped,
 * and it holds no unescaped `]` or `"`, so `Foo\[x="y"]` is no attribute: its `[` is escaped.
 * The tag is returned as it is written.
 */
export function splitScopeAttr(
	segment: string,
): { readonly tag: string; readonly attrName: string; readonly attrValue: string } | null {
	for (const { index, char, escaped } of scanScope(segment)) {
		if (escaped) {
			continue;
		}
		if (char === ']' || char === '"') {
			return null;
		}
		if (char === '[') {
			const match = /^\[([a-z-]+)="([^"]+)"\]$/.exec(segment.slice(index));
			return index > 0 && match
				? { tag: segment.slice(0, index), attrName: match[1]!, attrValue: match[2]! }
				: null;
		}
	}
	return null;
}

/**
 * @experimental
 * Splits the position `:nth-of-type(n)` that ends a compound scope segment from the rest of it.
 * The `:` of the suffix is a position only when it is not escaped, which a regex on the end of the
 * segment cannot tell alone: a name that ends with `\` is written `\\`, so `a\\:nth-of-type(2)` is the
 * class `a\` at the position 2, and `a\:nth-of-type(2)` is the class `a:nth-of-type(2)`. The escapes
 * are scanned from the start, as {@link splitScopeIdents} does.
 *
 * @see https://www.w3.org/TR/css-syntax-3/#escaping
 */
export function splitScopeNth(segment: string): { readonly base: string; readonly nth: number | null } {
	// Only an unescaped `:` is looked at: an escaped one is read with its `\` before it, as one character
	for (const { index, char, escaped } of scanScope(segment)) {
		if (!escaped && char === ':') {
			const match = NTH_OF_TYPE.exec(segment.slice(index));
			if (match) {
				return { base: segment.slice(0, index), nth: Number.parseInt(match[1]!, 10) };
			}
		}
	}
	return { base: segment, nth: null };
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function tagWithClasses(node: ScopedNode, classes: readonly string[]): string {
	return [node.localName, ...classes].map(name => serializeIdentifier(name)).join('.');
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function getAncestorChain(node: ScopedNode): ScopedNode[] {
	const chain: ScopedNode[] = [];
	let current = node.parentElement;
	while (current) {
		chain.push(current);
		current = current.parentElement;
	}
	return chain;
}

/**
 * @experimental
 * Computes the Lowest Common Ancestor (LCA) of a set of nodes.
 * Returns null if the LCA is `body`, `html`, or the input is empty.
 *
 * @param nodes - The nodes to find the LCA for.
 * @returns The LCA node, or null if it falls back to file-level.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function computeLCA(nodes: readonly ScopedNode[]): ScopedNode | null {
	if (nodes.length === 0) {
		return null;
	}

	if (nodes.length === 1) {
		const parent = nodes[0]!.parentElement;
		if (!parent || BODY_HTML_TAGS.has(parent.localName)) {
			return null;
		}
		return parent;
	}

	// Get ancestor chains for all nodes (including the node itself)
	const chains = nodes.map(node => {
		const chain = [node, ...getAncestorChain(node)];
		// Reverse so root is first
		chain.reverse();
		return chain;
	});

	// Walk from root, find deepest common ancestor
	const minLength = Math.min(...chains.map(c => c.length));
	let lca: ScopedNode | null = null;

	for (let i = 0; i < minLength; i++) {
		const candidate = chains[0]![i]!;
		if (chains.every(chain => chain[i] === candidate)) {
			lca = candidate;
		} else {
			break;
		}
	}

	if (!lca || BODY_HTML_TAGS.has(lca.localName)) {
		return null;
	}

	return lca;
}

/**
 * @experimental
 * Generates a minimal CSS selector that uniquely identifies the given node.
 *
 * Strategy:
 * 1. If the node has an `id`, use `#id` (most unique)
 * 2. If the node has classes, use `tag.class`
 * 3. Otherwise, build an ancestor path using `>` combinators, stopping at
 *    the first ancestor with an `id`
 *
 * Returns `undefined` for `body` or `html` nodes (file-level fallback).
 *
 * @param node - The node to generate a selector for.
 * @returns A CSS selector string, or undefined for file-level scope.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function generateUniqueSelector(node: ScopedNode): string | undefined {
	if (BODY_HTML_TAGS.has(node.localName)) {
		return undefined;
	}

	// If this node has an id, just use it
	if (node.id) {
		return `#${serializeIdentifier(node.id)}`;
	}

	// If this node has classes, use tag.classA.classB (all classes)
	const classes = [...node.classList];
	if (classes.length > 0) {
		return tagWithClasses(node, classes);
	}

	// If this node has a distinguishing attribute (role, or type for input),
	// use tag[attr="value"] — more readable than nth-of-type and more stable
	const attrSelector = getDistinguishingAttrSelector(node);
	if (attrSelector) {
		return attrSelector;
	}

	// Build ancestor path with nth-of-type for disambiguation, stopping at
	// an id, class, or distinguishing attribute
	const parts: string[] = [buildSegmentWithNth(node)];
	let current = node.parentElement;
	while (current && !BODY_HTML_TAGS.has(current.localName)) {
		if (current.id) {
			parts.unshift(`#${serializeIdentifier(current.id)}`);
			break;
		}
		const currentClasses = [...current.classList];
		if (currentClasses.length > 0) {
			parts.unshift(tagWithClasses(current, currentClasses));
			break;
		}
		const currentAttr = getDistinguishingAttrSelector(current);
		if (currentAttr) {
			parts.unshift(currentAttr);
			break;
		}
		parts.unshift(buildSegmentWithNth(current));
		current = current.parentElement;
	}

	return parts.join(' > ');
}

/**
 * Attributes that serve as distinguishing selectors.
 * - `role`: Universally applicable — identifies landmark/widget semantics
 * - `type`: Only for `<input>` — distinguishes text/checkbox/radio/etc.
 */
const DISTINGUISHING_ATTRS: ReadonlyMap<string | null, readonly string[]> = new Map([
	[null, ['role']], // applicable to any element
	['input', ['type']], // only for <input>
]);

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function getDistinguishingAttrSelector(node: ScopedNode): string | undefined {
	const universalAttrs = DISTINGUISHING_ATTRS.get(null) ?? [];
	const elementAttrs = DISTINGUISHING_ATTRS.get(node.localName) ?? [];
	const attrsToCheck = [...universalAttrs, ...elementAttrs];

	for (const attrName of attrsToCheck) {
		for (const attr of node.attributes) {
			// A value with `"` or ` > ` cannot be held by `tag[attr="value"]`: a scope ends the value at `"` and splits at ` > `.
			if (attr.name === attrName && attr.value && !attr.value.includes('"') && !attr.value.includes(' > ')) {
				return `${serializeIdentifier(node.localName)}[${attrName}="${attr.value}"]`;
			}
		}
	}

	return undefined;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function buildSegmentWithNth(node: ScopedNode): string {
	const parent = node.parentElement;
	const name = serializeIdentifier(node.localName);
	if (!parent) {
		return name;
	}

	// Count same-tag siblings and find this node's position
	let sameTagCount = 0;
	let position = 0;
	for (const sibling of parent.children) {
		if (sibling.localName === node.localName) {
			sameTagCount++;
			if (sibling === node) {
				position = sameTagCount;
			}
		}
	}

	if (sameTagCount > 1) {
		return `${name}:nth-of-type(${position})`;
	}

	return name;
}

/**
 * @experimental
 * The O(n) linear search per violation is deliberate — acceptable for
 * typical document sizes; build a position index only if very large
 * documents make this a measured bottleneck.
 */
export function findNodeAtPosition(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[],
	line: number,
	col: number,
): ScopedNode | null {
	for (const node of nodeList) {
		if (node.startLine === line && node.startCol === col) {
			if (node.nodeType === 1) {
				return node;
			}
			// Non-element (e.g., attribute) — walk up to parent element
			let parent = node.parentElement;
			while (parent && parent.nodeType !== 1) {
				parent = parent.parentElement;
			}
			return parent;
		}
	}
	return null;
}

/**
 * @experimental
 * Computes the scope selector for a set of violations within a document.
 * Only considers error-severity violations. Returns `undefined` when
 * the LCA falls back to file-level (body/html) or when nodes cannot be found.
 *
 * @param nodeList - Flat list of all nodes in the document.
 * @param violations - The violations to compute scope for.
 * @returns A CSS selector string, or undefined for file-level scope.
 */
export function computeScopeForViolations(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: readonly PositionedNode[],

	violations: readonly Violation[],
): string | undefined {
	const nodes: ScopedNode[] = [];

	for (const v of violations) {
		if (v.severity !== 'error') {
			continue;
		}
		const node = findNodeAtPosition(nodeList, v.line, v.col);
		if (node) {
			nodes.push(node);
		}
	}

	if (nodes.length === 0) {
		return undefined;
	}

	const lca = computeLCA(nodes);
	if (!lca) {
		return undefined;
	}

	return generateUniqueSelector(lca);
}
