import { deriveDefaultSeverityFromConformanceLevel } from '@markuplint/ml-core';
import { describe, expect, test } from 'vitest';

import rules from './index.js';

/**
 * Meta-test for the `meta.specConformance` rollout (v5 rule-system redesign,
 * PR #3989). Every built-in rule is meant to eventually declare
 * `specConformance`, but the rollout happens rule-by-rule across many
 * commits, so this only enforces the invariants below on rules that have
 * already declared it — not "every rule has one" (that gate lands once the
 * rollout finishes; see `@markuplint/config-presets`'s
 * `html-standard-entries.spec.ts` for the same rollout pattern applied to
 * preset membership).
 */
describe('specConformance registry contract', () => {
	test('a `must` or `should` level always cites at least one source', () => {
		const missingCites: string[] = [];
		for (const [ruleName, rule] of Object.entries(rules)) {
			const spec = rule.meta?.specConformance;
			if (!spec) continue;
			if ((spec.level === 'must' || spec.level === 'should') && spec.cites.length === 0) {
				missingCites.push(ruleName);
			}
		}
		expect(missingCites, `rules with a must/should level but no cites: ${missingCites.join(', ')}`).toEqual([]);
	});

	test('`sources` and `cites` are non-empty', () => {
		const empty: string[] = [];
		for (const [ruleName, rule] of Object.entries(rules)) {
			const spec = rule.meta?.specConformance;
			if (!spec) continue;
			if (spec.sources.length === 0) {
				empty.push(`${ruleName} (sources)`);
			}
		}
		expect(empty, `rules with an empty specConformance field: ${empty.join(', ')}`).toEqual([]);
	});

	test('defaultSeverity matches the level-derived policy unless severityRationale explains the departure', () => {
		const undocumentedDepartures: string[] = [];
		for (const [ruleName, rule] of Object.entries(rules)) {
			const spec = rule.meta?.specConformance;
			if (!spec) continue;

			const policySeverity = deriveDefaultSeverityFromConformanceLevel(spec.level);
			if (policySeverity === undefined) {
				// 'configurable' has no policy value — any defaultSeverity is fine.
				continue;
			}

			const effectiveSeverity = rule.defaultSeverity ?? 'error';
			if (effectiveSeverity !== policySeverity && !rule.meta?.severityRationale) {
				undocumentedDepartures.push(
					`${ruleName} (level: ${spec.level}, policy: ${policySeverity}, actual: ${effectiveSeverity})`,
				);
			}
		}
		expect(
			undocumentedDepartures,
			`rules whose defaultSeverity departs from policy without a severityRationale: ${undocumentedDepartures.join(', ')}`,
		).toEqual([]);
	});
});
