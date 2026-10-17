import type { TextEdit, Violation } from '@markuplint/ml-config';

import { log } from './debug.js';
import { applyFixes } from './fix-applier.js';

/** Same safety cap as ESLint's SourceCodeFixer (10 passes). */
const MAX_FIX_PASSES = 10;

/**
 * Summary of the multi-pass fix process.
 */
export type FixSummary = {
	/** Number of fix passes executed (i.e., the number of times applyFixes was called) */
	readonly passCount: number;
	/** Total fixes applied across all passes */
	readonly totalApplied: number;
	/** Total fixes skipped (overlap) across all passes */
	readonly totalSkipped: number;
	/** Whether the maximum pass count was reached */
	readonly reachedMaxPasses: boolean;
	/**
	 * Applied edits from the FIRST pass only.
	 * These reference the original source code offsets, making them suitable
	 * for cursor offset computation via {@link computeCursorOffset}.
	 * Note: `firstPassEdits.length` may differ from `totalApplied` when
	 * multiple passes are executed.
	 */
	readonly firstPassEdits: readonly TextEdit[];
	/**
	 * Violations remaining in the final fixed code, re-verified after the
	 * last fix pass.
	 *
	 * Unlike {@link VerifyResult.violations} (which reflects the first pass
	 * only), this list is accurate for `fixedCode`. Callers that report
	 * post-fix results should prefer `fixSummary.finalPassViolations ?? violations`.
	 * Entries may carry `fix` data whose offsets refer to `fixedCode`.
	 *
	 * `undefined` when no fixes remain applied (none were applied, or the
	 * applied pass was rolled back); the first-pass violations are then
	 * accurate as-is.
	 */
	readonly finalPassViolations?: readonly Violation[];
};

/**
 * What {@link multiPassFix} needs from an engine to re-check the code it has fixed.
 *
 * The loop is shared by the TypeScript engine (`MLCore`) and the Rust engine
 * (`MLEngine`), which differ only in how they parse and lint a piece of code, so the
 * limits and guards that decide when fixing stops live in one place.
 */
export type MultiPassFixHost = {
	/**
	 * Parses `code` and makes it the code {@link MultiPassFixHost.lint} checks.
	 *
	 * @returns `false` when `code` cannot be parsed
	 */
	readonly load: (code: string) => Promise<boolean>;
	/**
	 * Lints the code last loaded, with fixes enabled. Includes the violations an engine
	 * reports for the parse itself, which is what makes the list a full report of that code.
	 */
	readonly lint: () => Promise<readonly Violation[]>;
};

/**
 * ESLint-style multi-pass fix loop (modeled after SourceCodeFixer).
 *
 * Applies the fixes of `initialViolations` to `sourceCode`. When some were skipped for
 * overlapping another, loads the result, lints it again and applies the fixes of that, up to
 * {@link MAX_FIX_PASSES} times. Stops early when nothing applies, the code does not change,
 * the output repeats an earlier one (fixes that undo each other), or the output cannot be parsed
 * (the previous parsable code is kept).
 *
 * `host` is handed the code in the course of the loop, so the code it holds loaded is no longer
 * `sourceCode` once this returns; callers that need it again must load it back.
 *
 * @param sourceCode - The code `initialViolations` were found in, already loaded in `host`
 * @param initialViolations - The violations of `sourceCode`
 * @param host - Parses and lints code
 */
export async function multiPassFix(
	sourceCode: string,
	initialViolations: readonly Violation[],
	host: MultiPassFixHost,
): Promise<{ code: string; summary: FixSummary }> {
	const logEnabled = log.enabled;
	let currentCode = sourceCode;
	let fixes = extractFixes(initialViolations);

	let totalApplied = 0;
	let totalSkipped = 0;
	let firstPassEdits: readonly TextEdit[] = [];

	// The input code of each pass, keyed by code string, for N-pass cycle
	// detection (A → B → A as well as longer cycles such as A → B → C → A).
	const codeHistory = new Map<string, number>([[currentCode, 0]]);

	// Violations from the latest lint, valid for `currentCode`.
	// Reused by the final verification below to avoid a redundant re-run
	// when the loop already re-verified the final code.
	let latestViolations: readonly Violation[] | undefined;

	// The most recent code that is known to parse successfully. Used to roll
	// back a pass whose output fails to parse.
	let lastParsableCode = currentCode;

	// The code `host` holds loaded.
	let loadedCode = currentCode;

	let pass = 0;
	for (; pass < MAX_FIX_PASSES; pass++) {
		if (logEnabled) {
			log('fix pass %d: %d fixes', pass, fixes.length);
		}
		const result = applyFixes(currentCode, fixes);

		totalApplied += result.applied.length;
		totalSkipped += result.skipped.length;
		if (pass === 0) {
			firstPassEdits = result.appliedEdits;
		}

		if (result.applied.length === 0) {
			if (logEnabled) {
				log('fix pass %d: no fixes applied, stopping', pass);
			}
			break;
		}

		if (result.output === currentCode) {
			if (logEnabled) {
				log('fix pass %d: output unchanged, stopping', pass);
			}
			break;
		}

		// Cycle detection: if the output matches the input of any earlier pass,
		// fixes are oscillating (A → B → A, A → B → C → A, ...) and will never converge.
		const cycleStart = codeHistory.get(result.output);
		if (cycleStart !== undefined) {
			if (logEnabled) {
				log(
					'fix pass %d: cycle detected (output matches the input of pass %d, cycle length %d), stopping',
					pass,
					cycleStart,
					pass + 1 - cycleStart,
				);
			}
			currentCode = result.output;
			latestViolations = undefined;
			break;
		}

		currentCode = result.output;
		codeHistory.set(currentCode, pass + 1);
		latestViolations = undefined;

		// Parse the output immediately — for the next pass or for the final
		// verification — so an unparsable output is always rolled back
		// instead of being returned (and written to disk) broken.
		loadedCode = currentCode;
		const parsable = await host.load(currentCode);

		if (!parsable) {
			if (logEnabled) {
				log('fix pass %d: produced unparsable code, reverting to the previous parsable code', pass);
			}
			currentCode = lastParsableCode;
			totalApplied -= result.applied.length;
			if (pass === 0) {
				firstPassEdits = [];
			}
			break;
		}
		lastParsableCode = currentCode;

		if (result.skipped.length === 0) {
			if (logEnabled) {
				log('fix pass %d: all fixes applied, stopping', pass);
			}
			break;
		}

		// --- Multi-pass path (only when overlapping fixes exist) ---
		if (logEnabled) {
			log('fix pass %d: %d skipped, re-running rules for next pass', pass, result.skipped.length);
		}

		const newViolations = await host.lint();
		latestViolations = newViolations;
		fixes = extractFixes(newViolations);
		if (fixes.length === 0) {
			if (logEnabled) {
				log('fix pass %d: no more fixable violations, stopping', pass);
			}
			break;
		}
	}

	const reachedMaxPasses = pass === MAX_FIX_PASSES;
	if (reachedMaxPasses && logEnabled) {
		log('fix: reached maximum number of passes (%d), some fixes may not have been applied', MAX_FIX_PASSES);
	}

	// Final verification (#3890): compute the violations that remain in the
	// final code. When the loop already re-verified `currentCode`, reuse that
	// result; otherwise lint once (loading first unless the loaded code already is
	// `currentCode`).
	let finalPassViolations: readonly Violation[] | undefined;
	if (totalApplied > 0) {
		if (latestViolations === undefined) {
			let parsable = true;
			if (loadedCode !== currentCode) {
				loadedCode = currentCode;
				parsable = await host.load(currentCode);
			}
			if (parsable) {
				latestViolations = await host.lint();
			}
		}
		finalPassViolations = latestViolations;
	}

	return {
		code: currentCode,
		summary: {
			passCount: Math.min(pass + 1, MAX_FIX_PASSES),
			totalApplied,
			totalSkipped,
			reachedMaxPasses,
			firstPassEdits,
			finalPassViolations,
		},
	};
}

function extractFixes(violations: readonly Violation[]) {
	const fixes: NonNullable<Violation['fix']>[] = [];
	for (const v of violations) {
		if (v.fix) {
			fixes.push(v.fix);
		}
	}
	return fixes;
}
