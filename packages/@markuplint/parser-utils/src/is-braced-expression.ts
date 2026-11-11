import { scriptParser } from './script-parser.js';

/**
 * Whether a text is one expression in braces and nothing else (`{false}`, `{ {a: 1} }`), and not
 * several (`{a}{b}`) or an expression with text around it (`page/{p}`, `{a} text`). Svelte reads an
 * attribute value in quotes that is one expression as the expression
 * (`disabled="{false}"` is `disabled={false}`).
 *
 * The check is of the braces: the first `{` is closed by the last `}`, so no `}` closes it before
 * the end. Strings and template literals are read as such, so a brace in them does not count. The
 * code in the braces is not checked to be valid JavaScript (it may be TypeScript).
 *
 * The catch below does not use `isFatalError`, as for `parseLiteralExpression`: espree reports the
 * author's code by a `SyntaxError`, which here means that the text is not one expression.
 *
 * @param raw - The text of an attribute value
 * @returns `true` if the whole text is one expression in braces
 */
export function isBracedExpression(raw: string): boolean {
	if (raw.length < 2 || !raw.startsWith('{') || !raw.endsWith('}')) {
		return false;
	}

	const inner = raw.slice(1, -1);
	if (inner.trim() === '') {
		return false;
	}

	let tokens: ReturnType<typeof scriptParser>;
	try {
		tokens = scriptParser(inner);
	} catch (error) {
		if (error instanceof SyntaxError) {
			return false;
		}
		throw error;
	}

	let depth = 0;
	for (const token of tokens) {
		if (token.type !== 'Punctuator') {
			continue;
		}
		if (token.value === '{') {
			depth++;
		} else if (token.value === '}') {
			depth--;
			if (depth < 0) {
				return false;
			}
		}
	}
	return depth === 0;
}
