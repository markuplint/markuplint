/**
 * Counts consecutive backslashes immediately before position `i` in `raw`.
 * An odd count means the character at `i` is escaped; an even count means
 * the preceding backslashes are themselves paired escapes.
 */
function countPrecedingBackslashes(raw: string, i: number): number {
	let n = 0;
	let j = i - 1;
	while (j >= 0 && raw[j] === '\\') {
		n++;
		j--;
	}
	return n;
}

/**
 * Locates the matching closing brace for a JS-like expression that starts at
 * `raw[start]` (which must be `{`), respecting string literals (`'`, `"`),
 * template literals with `${}` interpolation, and line/block comments.
 *
 * Returns the index of the matching `}`, or -1 if no match is found.
 *
 * Why this exists: `safeScriptParser` (espree-based) does not understand
 * TypeScript syntax such as `{...x as any}` and may also extend a "valid JS
 * prefix" past the spread's closing brace into surrounding HTML
 * (e.g. `{...props}>{label}` is parsed as a binary `>` expression),
 * misclassifying both the spread end and any expression-child siblings.
 * See https://github.com/markuplint/markuplint/issues/3824.
 *
 * Known limitation: regular-expression literals containing braces
 * (e.g. `{...x.match(/}/) ? a : b}`) are not recognised — `/` is always
 * treated as a division operator. Such patterns are vanishingly rare in
 * Astro spread attributes; rewrite via a variable indirection if needed.
 */
export function findMatchingBrace(raw: string, start: number): number {
	if (raw[start] !== '{') return -1;

	let depth = 0;
	let inString: '"' | "'" | '`' | null = null;
	const templateBraceStack: number[] = [];

	for (let i = start; i < raw.length; i++) {
		const c = raw[i];

		if (inString) {
			if (inString === '`') {
				if (c === '`' && countPrecedingBackslashes(raw, i) % 2 === 0) {
					inString = null;
				} else if (c === '$' && raw[i + 1] === '{') {
					templateBraceStack.push(depth);
					inString = null;
					depth++;
					i++;
				}
			} else if (c === inString && countPrecedingBackslashes(raw, i) % 2 === 0) {
				inString = null;
			}
			continue;
		}

		if (c === '/' && raw[i + 1] === '/') {
			while (i < raw.length && raw[i] !== '\n') i++;
			continue;
		}

		if (c === '/' && raw[i + 1] === '*') {
			i += 2;
			while (i < raw.length - 1 && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
			i++;
			continue;
		}

		if (c === '"' || c === "'" || c === '`') {
			inString = c;
			continue;
		}

		if (c === '{') {
			depth++;
		} else if (c === '}') {
			depth--;
			if (depth === 0) return i;
			if (templateBraceStack.length > 0 && depth === templateBraceStack.at(-1)) {
				templateBraceStack.pop();
				inString = '`';
			}
		}
	}

	return -1;
}

/**
 * Detects whether the given attribute token starts with an Astro spread
 * attribute (`{...EXPR}`) and, if so, returns the spread's exact slice plus
 * the leading whitespace and any leftover trailing text after the spread.
 *
 * Returns null when the token is not a spread attribute.
 *
 * Exported so the brace-matching logic can be unit-tested independently of
 * the parser pipeline.
 */
export function extractSpreadAttribute(
	raw: string,
): { leadingSpace: string; spreadRaw: string; leftover: string } | null {
	const leadingMatch = /^\s*/.exec(raw);
	const leadingSpace = leadingMatch?.[0] ?? '';
	const remaining = raw.slice(leadingSpace.length);

	// eslint-disable-next-line regexp/strict
	if (!/^{\s*\.{3}[^.]/.test(remaining)) {
		return null;
	}

	const end = findMatchingBrace(remaining, 0);
	if (end < 0) return null;

	return {
		leadingSpace,
		spreadRaw: remaining.slice(0, end + 1),
		leftover: remaining.slice(end + 1),
	};
}
