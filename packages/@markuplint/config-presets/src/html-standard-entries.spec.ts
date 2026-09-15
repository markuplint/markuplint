import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import rules from '@markuplint/rules';
import { stripComments } from 'jsonc-parser';
import { describe, expect, test } from 'vitest';

/**
 * Meta-test for `markuplint:html-standard`'s entry bar (v5 rule-system
 * redesign, PR #3989): every rule the preset enables — via a top-level named
 * group or a `nodeRules` entry — is meant to have `meta.specConformance`
 * declaring `sources` includes `'html'` and `level` is `'must'`. Like
 * `spec-conformance.spec.ts`, the `specConformance` rollout happens
 * rule-by-rule across many commits, so this only checks rules that have
 * already declared it — not "every entry has one".
 */

const presetPath = resolve(fileURLToPath(new URL('.', import.meta.url)), 'preset.html-standard.jsonc');
const preset = JSON.parse(stripComments(readFileSync(presetPath, 'utf8')));

function collectBaseRuleNames(): Set<string> {
	const names = new Set<string>();

	for (const value of Object.values(preset.rules ?? {})) {
		for (const baseRuleName of Object.keys((value as { rules?: Record<string, unknown> }).rules ?? {})) {
			names.add(baseRuleName);
		}
	}

	for (const nodeRule of preset.nodeRules ?? []) {
		for (const baseRuleName of Object.keys(nodeRule.rules ?? {})) {
			names.add(baseRuleName);
		}
	}

	return names;
}

describe('markuplint:html-standard entry bar', () => {
	test('every entry with a declared specConformance is sources:html + level:must', () => {
		const violations: string[] = [];

		for (const baseRuleName of collectBaseRuleNames()) {
			const rule = (
				rules as Record<string, { meta?: { specConformance?: { sources: string[]; level: string } } }>
			)[baseRuleName];
			const spec = rule?.meta?.specConformance;
			if (!spec) continue;

			if (!spec.sources.includes('html') || spec.level !== 'must') {
				violations.push(`${baseRuleName} (sources: ${spec.sources.join(',')}, level: ${spec.level})`);
			}
		}

		expect(violations, `html-standard entries that don't meet the entry bar: ${violations.join(', ')}`).toEqual([]);
	});
});
