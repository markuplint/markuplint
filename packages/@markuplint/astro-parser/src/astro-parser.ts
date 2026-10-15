import type { AstroRoot } from './to-nodes.js';

import { ParserError } from '@markuplint/parser-utils';
import { parseTemplate } from 'astro-eslint-parser';

/**
 * Astro tags each diagnostic with a severity of `'error'`, `'warning'`,
 * `'information'` or `'hint'` (`DiagnosticSeverity` of `@astrojs/compiler-binding`,
 * a `const enum`, i.e. types-only), so the fatal level is mirrored as a literal here.
 */
const ASTRO_DIAGNOSTIC_SEVERITY_ERROR = 'error';

/**
 * Type guard for `astro-eslint-parser`'s `ParseError` class. The class
 * extends `SyntaxError` and carries a unique `originalAST` instance
 * property; the duck-type check on that property identifies it without
 * depending on the constructor name (which a future bundler could mangle).
 *
 * Why a positive identity check matters: `isFatalError()` from
 * `@markuplint/shared` classifies *every* `SyntaxError` as Tier 1
 * (implementation bug, must propagate). The Astro upstream chose to
 * subclass `SyntaxError` for ergonomic reasons, but the value it raises is
 * semantically a per-file parse failure that markuplint must convert to
 * `ParserError` (Tier 3). See `isFatalError()` in `@markuplint/shared` —
 * Tier 1 covers only errors raised by markuplint's own code.
 */
function isAstroEslintParseError(error: unknown): error is SyntaxError & {
	readonly lineNumber?: number;
	readonly column?: number;
} {
	return error instanceof SyntaxError && 'originalAST' in error;
}

/**
 * ## Diagnostic handling policy
 *
 * Only **severity=Error** Astro diagnostics surface as a `ParserError`.
 * Warning / Information / Hint diagnostics are passed through silently
 * because the AST is still fully populated for those levels and Astro's own
 * tooling (the language server, `astro check`) owns the user-facing message
 * — markuplint must not surface them as fatal `parse-error`s (#3823).
 *
 * Concretely, the `is:inline` Hint that Astro emits for a `<script>` tag
 * carrying any non-`src` attribute, and the `set:html` Warning for
 * `set:html` overwriting children, both reach this wrapper but do not
 * abort parsing.
 *
 * ## Error normalization
 *
 * `parseTemplate()` itself raises an `astro-eslint-parser` `ParseError`
 * (extending `SyntaxError`) on severity=Error diagnostics and on raw
 * template syntax errors (unclosed expressions, mismatched end tags, etc.).
 * Those — and only those — are normalized to `ParserError`, so the
 * caller sees a single Tier-3 (per-file violation) error type for every
 * parse failure. Any other throw, including a genuine `SyntaxError` from a
 * markuplint invariant break, is allowed to propagate so the standard
 * `isFatalError()` gate further up the stack can classify it as Tier 1.
 *
 * The defensive `find(severity === Error)` after `parseTemplate()` is dead
 * code today (upstream gates internally) but is retained as a safety net
 * if a future `astro-eslint-parser` ever stops gating severity=Error.
 *
 * Two malformed inputs that v3 accepts without any signal — an unterminated
 * frontmatter and an unclosed HTML comment — are detected here and raised as
 * `ParserError` too (see `assertFrontmatterTerminated` and
 * `assertParsedToTheEnd`), so no template is silently skipped.
 *
 * @see https://github.com/markuplint/markuplint/issues/3823
 * @see https://docs.astro.build/en/reference/directives-reference/#isinline
 * @see https://docs.astro.build/en/guides/client-side-scripts/#script-processing
 *
 * @throws {ParserError} on severity=Error Astro diagnostics or on raw upstream syntax errors
 */
export function astroParse(code: string): AstroRoot {
	let result;
	try {
		({ result } = parseTemplate(code));
	} catch (error) {
		if (!isAstroEslintParseError(error)) {
			throw error;
		}
		throw new ParserError(error.message, {
			line: typeof error.lineNumber === 'number' ? error.lineNumber : 1,
			col: typeof error.column === 'number' ? error.column : 0,
		});
	}

	// Defensive: if a future `astro-eslint-parser` stops gating severity=Error
	// diagnostics internally, surface them here so they never silently leak
	// past the wrapper as a non-fatal pass-through.
	const fatal = result.diagnostics.find(d => d.severity === ASTRO_DIAGNOSTIC_SEVERITY_ERROR);
	if (fatal) {
		// A label's column is 0-based; `ParserError` takes a 1-based one.
		const label = fatal.labels[0];
		throw new ParserError(fatal.text, {
			line: label?.line ?? 1,
			col: label ? label.column + 1 : 1,
		});
	}

	assertFrontmatterTerminated(code, result.ast);
	assertParsedToTheEnd(code, result.ast);

	return result.ast;
}

/**
 * A leading `---` line, which opens a frontmatter block. Spaces may follow the fence
 * (`astro-eslint-parser` accepts `--- ` as one), and the source may end right after it.
 */
const RE_FRONTMATTER_FENCE = /^(?:\s*\n)?---[ \t]*(?:\r?\n|$)/;

/**
 * `astro-eslint-parser` v3 reports an unterminated frontmatter (for example,
 * a closing `---` hidden inside an unterminated block comment) neither
 * as an error nor as a diagnostic: the fence and everything after it silently
 * becomes template text. Every earlier version, and Astro itself, rejects it.
 *
 * @throws {ParserError} when the source starts with a frontmatter fence that no frontmatter was parsed from
 */
function assertFrontmatterTerminated(code: string, ast: AstroRoot): void {
	const { frontmatter } = ast;
	if (frontmatter && frontmatter.end === frontmatter.start && RE_FRONTMATTER_FENCE.test(code)) {
		throw new ParserError('Unterminated frontmatter', locate(code, 0));
	}
}

/**
 * `astro-eslint-parser` v3 reports an unclosed HTML comment (`<!-- ...`)
 * neither as an error nor as a diagnostic: it drops the comment and
 * everything after it, so a template that is not checked at all would pass.
 * A node list that stops before the end of the source is that situation.
 *
 * Whitespace after the last node is not content: the newline that follows a
 * closing frontmatter fence belongs to no node.
 *
 * @throws {ParserError} when the AST does not reach the end of the source
 */
function assertParsedToTheEnd(code: string, ast: AstroRoot): void {
	const parsedEnd = ast.body.at(-1)?.end ?? ast.frontmatter?.end ?? 0;
	if (parsedEnd < code.length && code.slice(parsedEnd).trim() !== '') {
		throw new ParserError('Unterminated syntax: the template is not parsed to its end', locate(code, parsedEnd));
	}
}

/**
 * The 1-based line and column of an offset.
 */
function locate(code: string, offset: number) {
	const lines = code.slice(0, offset).split('\n');
	return { line: lines.length, col: (lines.at(-1)?.length ?? 0) + 1 };
}
