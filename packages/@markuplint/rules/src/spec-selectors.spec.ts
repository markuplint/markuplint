import type { Attribute, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { describe, expect, test } from 'vitest';

/**
 * The selectors of the spec data are run against the elements of the document that is linted: `condition`,
 * `deprecatedWhen` and `ineffective` (`no-disallowed-attr`, `no-deprecated-attr`, `no-ineffective-attr`).
 * A selector that the engine rejects throws there, and the lint of the whole file fails. They are written by hand in
 * `@markuplint/html-spec` (and expanded from aliases when `index.json` is generated), so they are all created here.
 */
const SELECTOR_FIELDS = ['condition', 'deprecatedWhen', 'ineffective'] as const;

function collect(spec: MLMLSpec) {
	const selectors: { where: string; selector: string }[] = [];
	const add = (where: string, attr: Partial<Attribute>) => {
		for (const field of SELECTOR_FIELDS) {
			for (const selector of [attr[field] ?? []].flat()) {
				selectors.push({ where: `${where}.${field}`, selector });
			}
		}
		if (Array.isArray(attr.type)) {
			for (const type of attr.type) {
				if (typeof type === 'object' && 'condition' in type && typeof type.condition === 'string') {
					selectors.push({ where: `${where}.type.condition`, selector: type.condition });
				}
			}
		}
	};
	for (const el of spec.specs) {
		for (const [name, attr] of Object.entries(el.attributes)) {
			add(`${el.name}[${name}]`, attr);
		}
	}
	for (const [category, attrs] of Object.entries(spec.def['#globalAttrs'])) {
		for (const [name, attr] of Object.entries(attrs)) {
			add(`${category}[${name}]`, attr);
		}
	}
	return selectors;
}

describe('the selectors of the spec data', () => {
	const selectors = collect(htmlSpec as unknown as MLMLSpec);

	test('there are selectors to create', () => {
		expect(selectors.length).toBeGreaterThan(0);
		expect(selectors.some(s => s.where.endsWith('.deprecatedWhen'))).toBe(true);
	});

	test('the engine creates every one', () => {
		const rejected: string[] = [];
		for (const { where, selector } of selectors) {
			try {
				createSelector(selector, htmlSpec as unknown as MLMLSpec);
			} catch (error) {
				rejected.push(`${where}: ${selector}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		expect(rejected).toStrictEqual([]);
	});

	test('the engine rejects a selector it cannot read, which is what the test above catches', () => {
		expect(() => createSelector('#NotExpanded[', htmlSpec as unknown as MLMLSpec)).toThrow();
	});
});
