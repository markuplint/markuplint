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
 * `parseTemplate()` itself throws on severity=Error diagnostics and on raw
 * template syntax errors (unterminated comments, unclosed expressions,
 * etc.) by raising a `SyntaxError`-derived `ParseError`. Those throws are
 * caught and normalized to `ParserError`, so the caller sees a single
 * Tier-3 (per-file violation) error type for every parse failure rather
 * than a Tier-1 fatal `SyntaxError` that would abort the whole lint run.
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
		if (!(error instanceof SyntaxError)) {
			throw error;
		}
		const { lineNumber, column } = error as SyntaxError & { lineNumber?: number; column?: number };
		throw new ParserError(error.message, {
			line: lineNumber ?? 1,
			col: column ?? 0,
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
