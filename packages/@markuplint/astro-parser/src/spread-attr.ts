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
 * Why this exists: `safeScriptParser` (espree-based) does not understand
 * TypeScript syntax such as `{...x as any}` and may also extend a "valid JS
 * prefix" past the spread's closing brace into surrounding HTML
 * (e.g. `{...props}>{label}` is parsed as a binary `>` expression),
 * misclassifying both the spread end and any expression-child siblings.
 * See https://github.com/markuplint/markuplint/issues/3824 (v4) and
 * https://github.com/markuplint/markuplint/issues/3856 (dev/v5).
 *
 * Known limitation: regular-expression literals containing braces
 * (e.g. `{...x.match(/}/) ? a : b}`) are not recognised — `/` is always
 * treated as a division operator. Such patterns are vanishingly rare in
 * Astro spread attributes; rewrite via a variable indirection if needed.
 *
 * This is intentionally a minimal brace matcher, not a full JavaScript
 * lexer: when a new edge case is reported, extend the string / comment /
 * escape branches with the minimum change rather than introducing a lexer.
 *
 * Retraction condition: if parser-utils' `script-parser.ts` is upgraded to
 * handle TypeScript syntax and to stop extending past the spread's closing
 * `}`, this module and the `visitAttr()` pre-pass in `parser.ts` can be
 * removed and the base parser path restored.
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
