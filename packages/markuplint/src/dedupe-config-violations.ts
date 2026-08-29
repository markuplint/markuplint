import type { Violation } from '@markuplint/ml-config';

import { CONFIG_ERROR_RULE_ID, RULE_DEPRECATION_RULE_ID } from '@markuplint/ml-core';

/**
 * Synthetic ruleIds produced from resolving a run's config rather than from
 * linting a file's content (`config-error`: broken config; `rule-deprecation`:
 * deprecated-but-working rule names). Both regenerate identically for every
 * file that shares the same config, so both need the same per-run dedupe —
 * see {@link dedupeConfigLevelViolations} — and the same exclusion from
 * per-file failure counting (`packages/markuplint/src/cli/command.ts`).
 */
export const CONFIG_LEVEL_RULE_IDS = new Set([CONFIG_ERROR_RULE_ID, RULE_DEPRECATION_RULE_ID]);

/**
 * Filters `violations` down to the first occurrence of each distinct
 * config-level ({@link CONFIG_LEVEL_RULE_IDS}) message, tracked in `seen`
 * across calls. Non-config-level violations always pass through unchanged.
 *
 * Even with config resolution now shared across a run (see
 * `ConfigProvider`, #3997), each file's `MLCore.verify()` still builds its
 * own `violations` array independently from that shared config data — so a
 * config-level message would otherwise still repeat once per file that
 * shares the config. The config is one thing, not N things. `seen` is
 * caller-owned (a plain `Set<string>`) so both the CLI (per run) and the
 * `lint()` API (per call) can each keep their own dedupe scope without
 * sharing state between unrelated runs.
 *
 * @param violations - Violations to filter, in file-processing order
 * @param seen - Accumulates `${ruleId} ${message}` keys already kept; mutated in place
 * @returns `violations` with repeat config-level entries removed
 */
export function dedupeConfigLevelViolations(violations: readonly Violation[], seen: Set<string>): readonly Violation[] {
	return violations.filter(violation => {
		if (!CONFIG_LEVEL_RULE_IDS.has(violation.ruleId)) {
			return true;
		}
		const key = `${violation.ruleId} ${violation.message}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}
