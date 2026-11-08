import type { MLASTHtmlParseErrorCode } from '@markuplint/ml-ast';

import type { ErrorCodes } from 'parse5';
import { describe, expectTypeOf, test } from 'vitest';

/**
 * Compile-time guard: every parse5 `ERR` enum value must be assignable to
 * {@link MLASTHtmlParseErrorCode}. If parse5 adds a new tokenizer / tree-
 * construction parse error code, the corresponding TypeScript build will
 * fail here until `MLASTHtmlParseErrorCode` in `@markuplint/ml-ast` is updated.
 * The codes that a framework parser reports (`MLASTFrameworkParseErrorCode`)
 * are not parse5's and are not compared here.
 *
 * Without this check, an upstream parse5 bump could silently introduce
 * codes that bench coverage cannot target (because `severity.parseError`
 * Record keys would not autocomplete them) and the migration guide's "60
 * codes" claim drifts out of date unnoticed.
 */
describe('MLASTHtmlParseErrorCode stays in sync with parse5 ERR enum (compile-time)', () => {
	test('every parse5 ERR value is a MLASTHtmlParseErrorCode', () => {
		expectTypeOf<(typeof ErrorCodes)[keyof typeof ErrorCodes]>().toExtend<MLASTHtmlParseErrorCode>();
	});

	test('every MLASTHtmlParseErrorCode is currently present in parse5 ERR (no orphaned codes)', () => {
		// The reverse direction guards against ml-ast keeping a stale entry
		// after parse5 *removes* a code. If parse5 deprecates a code, this
		// assertion fails and someone must consciously decide whether to keep
		// the alias for backwards compatibility or drop it from ml-ast.
		expectTypeOf<MLASTHtmlParseErrorCode>().toExtend<`${(typeof ErrorCodes)[keyof typeof ErrorCodes]}`>();
	});
});
