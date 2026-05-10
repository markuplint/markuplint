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
 * Media feature value-type classification per Media Queries Level 5 §4.
 *
 * Only features whose value type is statically constrained are listed.
 * Discrete features (e.g., `prefers-color-scheme`, `pointer`) accept
 * keyword values whose validation requires a per-feature enum table —
 * not implemented here because nu-validator's coverage of these is
 * already aligned with markuplint's enum-driven attribute checking.
 *
 * @see https://www.w3.org/TR/mediaqueries-5/#mq-features
 */
const LENGTH_FEATURES = new Set(['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height']);
const INTEGER_FEATURES = new Set([
	'color',
	'min-color',
	'max-color',
	'color-index',
	'min-color-index',
	'max-color-index',
	'monochrome',
	'min-monochrome',
	'max-monochrome',
	'horizontal-viewport-segments',
	'min-horizontal-viewport-segments',
	'max-horizontal-viewport-segments',
	'vertical-viewport-segments',
	'min-vertical-viewport-segments',
	'max-vertical-viewport-segments',
]);
const RESOLUTION_FEATURES = new Set(['resolution', 'min-resolution', 'max-resolution']);
const RATIO_FEATURES = new Set(['aspect-ratio', 'min-aspect-ratio', 'max-aspect-ratio']);

/**
 * CSS units recognised as `<length>` per CSS Values and Units Level 4
 * §6.1. Includes container query units (`cqw`, `cqh`, etc.) added in
 * CSS Containment Module Level 3.
 *
 * @see https://www.w3.org/TR/css-values-4/#lengths
 * @see https://www.w3.org/TR/css-contain-3/#container-lengths
 */
const LENGTH_UNITS = new Set([
	'px',
	'em',
	'rem',
	'ex',
	'rex',
	'cap',
	'rcap',
	'ch',
	'rch',
	'ic',
	'ric',
	'lh',
	'rlh',
	'vw',
	'vh',
	'vmin',
	'vmax',
	'vi',
	'vb',
	'svw',
	'svh',
	'svmin',
	'svmax',
	'svi',
	'svb',
	'lvw',
	'lvh',
	'lvmin',
	'lvmax',
	'lvi',
	'lvb',
	'dvw',
	'dvh',
	'dvmin',
	'dvmax',
	'dvi',
	'dvb',
	'cqw',
	'cqh',
	'cqi',
	'cqb',
	'cqmin',
	'cqmax',
	'cm',
	'mm',
	'q',
	'in',
	'pt',
	'pc',
]);

/**
 * CSS units recognised as `<resolution>` per CSS Values and Units Level
 * 4 §8.4. `x` is the alias for `dppx`.
 *
 * @see https://www.w3.org/TR/css-values-4/#resolution
 */
const RESOLUTION_UNITS = new Set(['dpi', 'dpcm', 'dppx', 'x']);

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
	const isLength = LENGTH_FEATURES.has(feature);
	const isInteger = INTEGER_FEATURES.has(feature);
	const isResolution = RESOLUTION_FEATURES.has(feature);
	const isRatio = RATIO_FEATURES.has(feature);
	if (!(isLength || isInteger || isResolution || isRatio)) return null;
	// Defer calc()/var()/clamp() etc. — their static value cannot be
	// computed without resolving cascades. css-tree accepts them; we
	// trust nu-validator does the same in practice.
	if (value.type === 'Function' || value.type === 'Parentheses') return null;
	const offset = value.loc?.start.offset ?? 0;
	const raw = source.slice(offset, value.loc?.end.offset ?? offset);
	if (isInteger) {
		if (value.type !== 'Number' || /[.e]/i.test((value as csstree.NumberNode).value)) {
			return new Token(raw, offset, source).unmatched({
				reason: 'syntax-error',
				expects,
				partName: `<integer> required for "${feature}"`,
			});
		}
		return null;
	}
	if (isLength) {
		if (value.type === 'Number') {
			// Per CSS Values §3.3, only `0` is a valid unitless length.
			// Compare numerically to accept any literal form (`0`, `0.0`,
			// `.0`, `00`) — css-tree preserves the source spelling.
			if (Number.parseFloat((value as csstree.NumberNode).value) === 0) return null;
			return new Token(raw, offset, source).unmatched({
				reason: 'syntax-error',
				expects,
				partName: `<length> required for "${feature}" (unitless non-zero number)`,
			});
		}
		if (value.type === 'Dimension') {
			const unit = (value as csstree.Dimension).unit.toLowerCase();
			if (!LENGTH_UNITS.has(unit)) {
				return new Token(raw, offset, source).unmatched({
					reason: 'syntax-error',
					expects,
					partName: `<length> required for "${feature}" (unrecognised or wrong-category unit "${unit}")`,
				});
			}
			return null;
		}
		return new Token(raw, offset, source).unmatched({
			reason: 'syntax-error',
			expects,
			partName: `<length> required for "${feature}"`,
		});
	}
	if (isResolution) {
		if (value.type !== 'Dimension') {
			return new Token(raw, offset, source).unmatched({
				reason: 'syntax-error',
				expects,
				partName: `<resolution> required for "${feature}"`,
			});
		}
		const unit = (value as csstree.Dimension).unit.toLowerCase();
		if (!RESOLUTION_UNITS.has(unit)) {
			return new Token(raw, offset, source).unmatched({
				reason: 'syntax-error',
				expects,
				partName: `<resolution> required for "${feature}" (unrecognised unit "${unit}")`,
			});
		}
		return null;
	}
	// isRatio — accept Ratio nodes and positive Number nodes.
	if (value.type !== 'Ratio' && value.type !== 'Number') {
		return new Token(raw, offset, source).unmatched({
			reason: 'syntax-error',
			expects,
			partName: `<ratio> required for "${feature}"`,
		});
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
