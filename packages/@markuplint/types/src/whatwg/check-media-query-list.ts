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

/**
 * Maps each MQL5 §4 range/discrete-numeric feature to the CSS value
 * type its argument must satisfy. The actual unit / sign / dimension
 * checking is delegated to `csstree.lexer.match()` below — only the
 * feature-to-type association needs to live in markuplint because
 * css-tree does not expose a per-feature value-type registry.
 *
 * **How to add a new MQL feature** when the spec extends the catalogue
 * (e.g., a future Level 6 may add a new resolution or ratio feature):
 *
 * 1. Find the feature definition in
 *    {@link https://www.w3.org/TR/mediaqueries-5/#mq-features Media Queries §4}
 *    (or its successor) and read its `Value:` line — that's the CSS
 *    type, expressed as `<length>` / `<integer>` / `<resolution>` /
 *    `<ratio>` (or a discrete keyword set, which is *not* handled here).
 * 2. Add an entry to this map. The value must be one of the four
 *    string literals — keep this list narrow because each new type
 *    string also needs to be a valid `csstree.lexer.match()` syntax.
 * 3. If the new feature carries an MQL-side semantic constraint that
 *    goes beyond CSS Values §6 (e.g., "must be non-negative" beyond
 *    `<integer>`'s signed grammar, "must be strictly positive" beyond
 *    `<ratio>`'s `[0,∞]` range), encode it in Stage B of
 *    `validateFeatureValue()`.
 * 4. Add table-driven cases in `check-media-query-list.spec.ts` —
 *    cover at least one valid and one invalid value, plus one case
 *    that exercises Stage B if applicable.
 * 5. Discrete keyword features (e.g., `prefers-color-scheme: dark`)
 *    intentionally fall through this map; they are validated by the
 *    enum-driven attribute checking elsewhere.
 *
 * @see https://www.w3.org/TR/mediaqueries-5/#mq-features
 */
const FEATURE_VALUE_TYPE: Record<string, '<length>' | '<integer>' | '<resolution>' | '<ratio>'> = {
	// <length>
	width: '<length>',
	height: '<length>',
	'min-width': '<length>',
	'max-width': '<length>',
	'min-height': '<length>',
	'max-height': '<length>',
	// <integer> — MQL5 §4.4 imposes a non-negative additional constraint
	// enforced separately below
	color: '<integer>',
	'min-color': '<integer>',
	'max-color': '<integer>',
	'color-index': '<integer>',
	'min-color-index': '<integer>',
	'max-color-index': '<integer>',
	monochrome: '<integer>',
	'min-monochrome': '<integer>',
	'max-monochrome': '<integer>',
	'horizontal-viewport-segments': '<integer>',
	'min-horizontal-viewport-segments': '<integer>',
	'max-horizontal-viewport-segments': '<integer>',
	'vertical-viewport-segments': '<integer>',
	'min-vertical-viewport-segments': '<integer>',
	'max-vertical-viewport-segments': '<integer>',
	// <resolution>
	resolution: '<resolution>',
	'min-resolution': '<resolution>',
	'max-resolution': '<resolution>',
	// <ratio> — MQL5 §4.5 imposes a positive additional constraint
	// enforced separately below
	'aspect-ratio': '<ratio>',
	'min-aspect-ratio': '<ratio>',
	'max-aspect-ratio': '<ratio>',
};

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
 * 4. **Wrong-type feature values** — `(min-width: 400)` (unitless
 *    non-zero number for a `<length>` feature), `(min-width: 400dpi)`
 *    (resolution unit on a length feature), `(color: 1em)` (length
 *    on an integer feature). The matrix covers length / integer /
 *    resolution / ratio features per Media Queries Level 5 §4. Unknown
 *    features are passed through unchanged so forward-compat additions
 *    do not regress to errors.
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
		// css-tree's parser raises a JS-builtin `SyntaxError` decorated
		// with `source` / `offset` / `formattedMessage` for user-input
		// parse failures (Tier-3 violations). Anything else — programmer-
		// error fatal errors (`TypeError` / `ReferenceError` / bare
		// `SyntaxError`) or non-`Error` throws — bubbles up so the three-
		// tier policy can treat it as Tier-1.
		if (!isCssTreeParseError(error)) throw error;
		return unmatched(value, 'syntax-error', { expects, partName: error.message });
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
		const feat = child as { name?: string; value?: csstree.CssNode | null; loc?: typeof child.loc };
		const name = feat.name;
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
			return;
		}
		// Boolean form `(name)` carries `value: null` and is type-agnostic.
		if (!feat.value) return;
		const typeError = validateFeatureValue(lowered, feat.value, source);
		if (typeError) result = typeError;
	});
	return result;
}

/**
 * Cross-checks a media feature's parsed value against the expected
 * type per Media Queries Level 5 §4. Returns an `unmatched` result
 * when the value type does not satisfy the feature's grammar (e.g.,
 * `<integer>` features given a `<dimension>`, or `<length>` features
 * given a unitless non-zero number).
 *
 * Returns null for:
 * - Unknown features (treated as forward-compat — defer to css-tree)
 * - Custom CSS variables / functions / calc() (not statically reducible)
 *
 * @see https://www.w3.org/TR/mediaqueries-5/#mq-features
 */
function validateFeatureValue(
	feature: string,
	value: csstree.CssNode,
	source: string,
): ReturnType<typeof unmatched> | null {
	const expectedType = FEATURE_VALUE_TYPE[feature];
	if (!expectedType) return null;
	// Defer calc()/var()/clamp() — their static value cannot be computed
	// without resolving cascades. css-tree accepts them; we trust
	// nu-validator does the same in practice.
	if (value.type === 'Function' || value.type === 'Parentheses') return null;
	const offset = value.loc?.start.offset ?? 0;
	const raw = source.slice(offset, value.loc?.end.offset ?? offset);
	// Stage A: CSS-syntax conformance — delegate the dimension / unit /
	// fractional / scientific-notation matrix to `csstree.lexer.match()`
	// rather than maintain a parallel hardcoded table. css-tree's
	// `<length>` / `<integer>` / `<resolution>` / `<ratio>` definitions
	// mirror CSS Values and Units Level 4 §6 and stay in sync as the
	// language evolves (container query units, viewport-relative
	// variants, etc.). `error: null` signals a successful match; a
	// non-null `SyntaxMatchError` describes the mismatch and is included
	// in the partName so the user sees which unit / dimension failed.
	// `lexer.match()` *throws* a `SyntaxReferenceError` for unknown
	// syntax names (e.g., a typo in `FEATURE_VALUE_TYPE`); let it bubble
	// up as Tier-1 fatal so a programmer error never masquerades as a
	// user-facing lint violation.
	const lexerResult = csstree.lexer.match(expectedType, value);
	if (lexerResult.error) {
		const detail = lexerResult.error.message?.split('\n')[0] ?? '';
		return new Token(raw, offset, source).unmatched({
			reason: 'syntax-error',
			expects,
			partName: detail
				? `${expectedType} required for "${feature}" (${detail})`
				: `${expectedType} required for "${feature}"`,
		});
	}
	// Stage B: MQL5 semantic constraints that go beyond CSS Values §6.
	// Stage A already rejects negative numbers for `<ratio>` (the type's
	// `<number [0,∞]>` range constraint excludes them), but accepts `0`
	// as in-range — Stage B adds the strictly-positive constraint from
	// MQL5 §4.5. Stage A also accepts negative `<integer>` per CSS Values
	// §6.2 grammar, so MQL5 §4.4's non-negative requirement for
	// `color` / `monochrome` / `*-viewport-segments` is enforced here.
	if (
		expectedType === '<integer>' &&
		value.type === 'Number' &&
		Number.parseInt((value as csstree.NumberNode).value, 10) < 0
	) {
		return new Token(raw, offset, source).unmatched({
			reason: 'syntax-error',
			expects,
			partName: `<integer> for "${feature}" must be non-negative (MQL5 §4.4)`,
		});
	}
	if (expectedType === '<ratio>') {
		// `@types/css-tree` declares `Ratio.left/.right` as `string`, but the
		// runtime mediaQueryList parser emits `NumberNode` children — cast
		// through `unknown` to consume the actual runtime shape.
		const ratio =
			value.type === 'Ratio'
				? (value as unknown as { left: csstree.NumberNode; right: csstree.NumberNode })
				: null;
		const numerator = ratio
			? Number.parseFloat(ratio.left.value)
			: value.type === 'Number'
				? Number.parseFloat((value as csstree.NumberNode).value)
				: undefined;
		const denominator = ratio ? Number.parseFloat(ratio.right.value) : 1;
		if (numerator !== undefined && (!(numerator > 0) || !(denominator > 0))) {
			return new Token(raw, offset, source).unmatched({
				reason: 'syntax-error',
				expects,
				partName: `<ratio> for "${feature}" must be positive (MQL5 §4.5)`,
			});
		}
	}
	return null;
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
/**
 * Distinguishes css-tree's user-input parse errors (Tier-3 violations)
 * from JS-builtin `SyntaxError`s thrown elsewhere (Tier-1 fatal errors like
 * `JSON.parse('bad')`). css-tree decorates its `SyntaxError` instances
 * with `source` and `formattedMessage`; the JS builtin does not.
 */
function isCssTreeParseError(error: unknown): error is SyntaxError & { source: string } {
	return (
		error instanceof SyntaxError &&
		typeof (error as { source?: unknown }).source === 'string' &&
		typeof (error as { formattedMessage?: unknown }).formattedMessage === 'string'
	);
}

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
