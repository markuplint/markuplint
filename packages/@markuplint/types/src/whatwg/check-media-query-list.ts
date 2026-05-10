import type { CustomSyntaxChecker } from '../types.js';

import * as csstree from 'css-tree';

import { cssSyntaxMatch } from '../css-syntax.js';
import { matched, unmatched } from '../match-result.js';
import { Token } from '../token/index.js';

const expects = [
	{
		type: 'format' as const,
		value: 'media query list',
	},
];

/**
 * Media types defined by Media Queries Level 5 §2.3 as currently active.
 *
 * @see https://www.w3.org/TR/mediaqueries-5/#media-types
 */
const ACTIVE_MEDIA_TYPES = new Set(['all', 'screen', 'print']);

/**
 * Media types that Media Queries Level 5 §2.3 still recognises as syntax
 * (so user agents must not throw on them) but **must make match nothing**.
 * Authoring conformance: do not use these.
 */
const DEPRECATED_MEDIA_TYPES = new Set([
	'tty',
	'tv',
	'projection',
	'handheld',
	'braille',
	'embossed',
	'aural',
	'speech',
]);

/**
 * Media features deprecated since Media Queries Level 4. MDN's `@media`
 * reference explicitly lists `device-width`, `device-height`, and
 * `device-aspect-ratio` as deprecated; the `min-` / `max-` prefixed
 * variants are deprecated as derivatives of the same features (MQL4's
 * range-feature syntax replaces the explicit prefix forms).
 *
 * Note: Media Queries Level 5 Appendix A is the normative location, but
 * its content was not directly retrievable via WebFetch at the time this
 * list was authored, so MDN is the verified source.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media
 */
const DEPRECATED_MEDIA_FEATURES = new Set([
	'device-width',
	'min-device-width',
	'max-device-width',
	'device-height',
	'min-device-height',
	'max-device-height',
	'device-aspect-ratio',
	'min-device-aspect-ratio',
	'max-device-aspect-ratio',
]);

type CSSTreeNode = ReturnType<typeof csstree.parse>;

/**
 * Validates a `media` attribute value against the Media Queries Level 5
 * grammar and authoring constraints.
 *
 * Catches three classes of conformance error that nu-validator reports but
 * `whatwg-mimetype`-style checks do not:
 *
 * 1. **Syntax errors** — unbalanced parens, stray semicolons inside `()`,
 *    unrecognised dimensions. Detected via `css-tree`'s `mediaQueryList`
 *    parser entry-point.
 * 2. **Unknown / deprecated media types** — anything outside
 *    {`all`, `screen`, `print`} (e.g., `alla`, `notscreen`, `projection`).
 *    Per [Media Queries Level 5 §2.3](https://www.w3.org/TR/mediaqueries-5/#media-types),
 *    deprecated types are syntactically valid but author conformance
 *    forbids them.
 * 3. **Deprecated media features** — `device-width` / `device-height` /
 *    `device-aspect-ratio` and their min-/max- variants. MDN's `@media`
 *    reference marks them as
 *    [deprecated since Media Queries Level 4](https://developer.mozilla.org/en-US/docs/Web/CSS/@media).
 *
 * Limitation: per-feature value type checks (e.g., that `min-width: 400`
 * lacks a length unit, or that `color: 1em` mixes incompatible types) are
 * NOT implemented. `css-tree` rejects some of those at parse time but the
 * detailed value-type matrix is left for a future iteration.
 *
 * @see https://www.w3.org/TR/mediaqueries-5/
 */
export const checkMediaQueryList: CustomSyntaxChecker = () => value => {
	if (!value) {
		return unmatched(value, 'empty-token', { expects });
	}
	// Stage 1: delegate to the CSS Syntax matcher (the same engine that
	// `<media-query-list>` used to use). Catches malformed grammar that
	// the lenient `csstree.parse(..., { context: 'mediaQueryList' })`
	// silently accepts: missing `and` whitespace (`screenand (...)`),
	// unterminated declarations (`screen and (min-width:`), trailing
	// combinators (`screen and (...) and`), trailing commas (`screen,`),
	// whitespace-only values, etc.
	const syntaxResult = cssSyntaxMatch(value, '<media-query-list>');
	if (!syntaxResult.matched) {
		return syntaxResult;
	}
	// css-tree silently swallows stray semicolons inside `()` (e.g.,
	// `(min-width: 400px;)`), but the CSS Syntax tokenizer rule says a
	// `<semicolon-token>` is invalid inside a `<media-condition>`. Detect
	// it manually before delegating to css-tree.
	const semicolon = findSemicolonInsideParens(value);
	if (semicolon != null) {
		return new Token(';', semicolon, value).unmatched({
			reason: 'unexpected-token',
			expects,
			partName: 'a stray semicolon inside the media condition',
		});
	}
	// Stage 2: re-parse with the lenient mediaQueryList AST so we can
	// walk it and reject deprecated/unknown identifiers.
	let ast: CSSTreeNode;
	try {
		ast = csstree.parse(value, { context: 'mediaQueryList', positions: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return unmatched(value, 'syntax-error', { expects, partName: message });
	}
	if (ast.type !== 'MediaQueryList') {
		return unmatched(value, 'syntax-error', { expects });
	}

	for (const query of ast.children ?? []) {
		if (query.type !== 'MediaQuery') continue;

		// css-tree's `MediaQuery` runtime nodes carry `mediaType` and
		// `condition` properties (verified empirically from `csstree.parse`),
		// but `@types/css-tree` does not surface them. Cast through the
		// minimal shape we actually consume rather than `any`.
		const q = query as unknown as {
			readonly mediaType?: string;
			readonly condition?: csstree.CssNode;
			readonly loc?: { readonly start: { readonly offset: number } };
		};

		// Validate the media type identifier (only present when the query
		// uses `<media-type>` form; condition-only queries skip this check).
		const mediaType = q.mediaType;
		if (typeof mediaType === 'string') {
			const lowered = mediaType.toLowerCase();
			if (DEPRECATED_MEDIA_TYPES.has(lowered)) {
				const offset = q.loc?.start.offset ?? 0;
				return new Token(mediaType, offset, value).unmatched({
					reason: 'doesnt-exist-in-enum',
					expects,
					partName: `deprecated media type "${mediaType}"`,
				});
			}
			if (!ACTIVE_MEDIA_TYPES.has(lowered)) {
				const offset = q.loc?.start.offset ?? 0;
				return new Token(mediaType, offset, value).unmatched({
					reason: 'doesnt-exist-in-enum',
					expects,
					candidate: nearestMediaType(lowered),
				});
			}
		}

		// Walk the condition tree for Feature / MediaFeature nodes and
		// reject deprecated names. Features the engine doesn't recognise
		// at all surface as parse errors via the try/catch above.
		if (q.condition) {
			const result = walkCondition(q.condition, value);
			if (result) return result;
		}
	}

	return matched();
};

function walkCondition(node: csstree.CssNode, source: string): ReturnType<typeof unmatched> | null {
	let result: ReturnType<typeof unmatched> | null = null;
	csstree.walk(node, child => {
		if (result) return;
		// `Feature` / `MediaFeature` are runtime node types emitted by
		// css-tree's mediaQueryList parser but not exposed by
		// `@types/css-tree`. Compare via cast to keep the narrow typing.
		const childType = (child as { type: string }).type;
		if (childType !== 'Feature' && childType !== 'MediaFeature') return;
		const name = (child as { name?: string }).name;
		if (typeof name !== 'string') return;
		const lowered = name.toLowerCase();
		if (DEPRECATED_MEDIA_FEATURES.has(lowered)) {
			const offset = child.loc?.start.offset ?? 0;
			// Skip the leading `(` so the highlight lands on the feature name.
			const nameOffset = source.slice(offset).search(/[A-Z]/i);
			result = new Token(name, offset + Math.max(nameOffset, 0), source).unmatched({
				reason: 'doesnt-exist-in-enum',
				expects,
				partName: `deprecated media feature "${name}"`,
			});
		}
	});
	return result;
}

/**
 * Suggests the closest active media type when the value is a typo (e.g.,
 * `alla` -> `all`). Only used for the "candidate" hint shown to the user.
 */
function nearestMediaType(input: string): string | undefined {
	for (const candidate of ACTIVE_MEDIA_TYPES) {
		if (input.startsWith(candidate) || candidate.startsWith(input)) {
			return candidate;
		}
	}
	return undefined;
}

/**
 * Returns the offset of the first `;` that appears inside a balanced `(`
 * region, or `null` when no such semicolon exists. Used as a pre-parse
 * guard because css-tree's media-query parser silently absorbs stray
 * semicolons rather than flagging them.
 *
 * Implementation note: Media Queries Level 5 grammar contains no quoted
 * strings, so a naive paren-depth counter is sufficient — there is no
 * `"a;b"` literal context to consider. If a future MQ level introduces
 * quoted-string production this scan would falsely flag the inner `;`
 * and need a string-aware tokenizer instead.
 */
function findSemicolonInsideParens(input: string): number | null {
	let depth = 0;
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (ch === '(') depth++;
		else if (ch === ')') depth = Math.max(0, depth - 1);
		else if (ch === ';' && depth > 0) return i;
	}
	return null;
}
