import type { RootNode } from '@astrojs/compiler/types';

import { ParserError } from '@markuplint/parser-utils';
import { parseTemplate } from 'astro-eslint-parser';

/**
 * Astro tags each diagnostic with a VS Code-style severity
 * (1=Error, 2=Warning, 3=Information, 4=Hint). The compiler exposes the
 * enum as types-only via `@astrojs/compiler/types` — there is no runtime
 * value to import — so the fatal level is mirrored as a literal here.
 *
 * @see https://github.com/withastro/compiler/blob/main/packages/compiler/shared/types.ts
 */
const ASTRO_DIAGNOSTIC_SEVERITY_ERROR = 1;

export type {
	RootNode,
	ElementNode,
	CustomElementNode,
	ComponentNode,
	FragmentNode,
	AttributeNode,
	Node,
} from '@astrojs/compiler/types';

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
 * `ParserError` (Tier 3). See `docs/architectures/ERROR-HANDLING.md` —
 * the Tier 1 row explicitly limits to "SyntaxError (from markuplint code)".
 */
function isAstroEslintParseError(error: unknown): error is SyntaxError & {
	readonly lineNumber?: number;
	readonly column?: number;
} {
	return error instanceof SyntaxError && 'originalAST' in error;
}

/**
 * Parses an Astro component source string into the Astro compiler's root AST node.
 *
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
 * template syntax errors (unterminated comments, unclosed expressions,
 * etc.). Those — and only those — are normalized to `ParserError`, so the
 * caller sees a single Tier-3 (per-file violation) error type for every
 * parse failure. Any other throw, including a genuine `SyntaxError` from a
 * markuplint invariant break, is allowed to propagate so the standard
 * `isFatalError()` gate further up the stack can classify it as Tier 1.
 *
 * The defensive `find(severity === Error)` after `parseTemplate()` is dead
 * code today (upstream gates internally) but is retained as a safety net
 * if a future `astro-eslint-parser` ever stops gating severity=Error.
 *
 * @see https://github.com/markuplint/markuplint/issues/3823
 * @see https://docs.astro.build/en/reference/directives-reference/#isinline
 * @see https://docs.astro.build/en/guides/client-side-scripts/#script-processing
 *
 * @param code - The raw Astro component source code
 * @returns The root AST node produced by the Astro compiler
 * @throws {ParserError} on severity=Error Astro diagnostics or on raw upstream syntax errors
 */
export function astroParse(code: string): RootNode {
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
		throw new ParserError(fatal.text, {
			line: fatal.location.line,
			col: fatal.location.column,
		});
	}

	return result.ast;
}
