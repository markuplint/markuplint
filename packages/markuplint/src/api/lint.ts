import type { APIOptions } from './types.js';
import type { MLResultInfo } from '../types.js';
import type { Target } from '@markuplint/file-resolver';

import { ConfigProvider, resolveFiles } from '@markuplint/file-resolver';

import { dedupeConfigLevelViolations } from '../dedupe-config-violations.js';
import { MLEngine } from './ml-engine.js';

/**
 * Lints multiple targets (files or inline sources) and returns results for each.
 *
 * Config-level violations (broken config, deprecated rule names) are deduped
 * per call the same way the CLI dedupes them per run: a message identical
 * across every file sharing one config is kept only in the first file's
 * result, not repeated in every file's `violations` array. See #3997.
 *
 * @param targetList - An array of file paths/globs or inline source code targets
 * @param options - API options for configuration, locale, rules, and behavior
 * @returns An array of lint results, one per processed file
 */
export async function lint(targetList: readonly Readonly<Target>[], options?: APIOptions) {
	const res: MLResultInfo[] = [];
	const files = await resolveFiles(targetList);
	// Shared across every file so `MLEngine`'s config cache — keyed by
	// resolved config `names`, not by target file — actually helps: see
	// `ConfigProvider.resolve`'s doc comment and #3997.
	const configProvider = new ConfigProvider();
	const seenConfigMessages = new Set<string>();

	for (const file of files) {
		const engine = new MLEngine(file, { ...options, configProvider });
		const result = await engine.exec();

		if (!result) {
			continue;
		}

		// Dedupe both views a caller might read: the first-pass `violations`,
		// and — when fix mode found fixes — `fixSummary.finalPassViolations`
		// (the post-fix re-verification `command.ts` prefers when reporting
		// fixed results). Both arrays describe the SAME file, so they always
		// carry the same config-level messages — that's not a repeat worth
		// suppressing. Only a *later file* repeating a message already kept
		// (in either array) is. So both arrays are deduped against the same
		// pre-file snapshot of `seenConfigMessages` (not against each other),
		// and only after both are done are their combined discoveries folded
		// back into `seenConfigMessages` for the next file. The snapshot is
		// only taken when there's a second array to protect against — most
		// files (no fix mode, or fix mode with nothing to fix) have none.
		let finalPassViolations = result.fixSummary?.finalPassViolations;
		const seenBeforeThisFile = finalPassViolations ? new Set(seenConfigMessages) : undefined;
		const violations = dedupeConfigLevelViolations(result.violations, seenConfigMessages);
		if (finalPassViolations && seenBeforeThisFile) {
			const seenForFinalPass = new Set(seenBeforeThisFile);
			finalPassViolations = dedupeConfigLevelViolations(finalPassViolations, seenForFinalPass);
			for (const key of seenForFinalPass) {
				seenConfigMessages.add(key);
			}
		}

		res.push({
			...result,
			violations,
			fixSummary: result.fixSummary && { ...result.fixSummary, finalPassViolations },
		});
	}

	return res;
}
