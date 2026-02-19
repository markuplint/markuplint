import { describe, it, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

describe('Named nodeRules integration', () => {
	describe('html-standard preset', () => {
		it('reports normative virtual rule with specConformance metadata', async () => {
			const { violations } = await mlTest('<html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard'],
			});
			const charsetViolation = violations.find(v => v.name === 'html-standard/head-charset-utf8');
			expect(charsetViolation).toBeDefined();
			expect(charsetViolation!.ruleId).toBe('required-element');
			expect(charsetViolation!.specConformance).toBe('normative');
		});

		it('reports non-normative virtual rule with specConformance metadata', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><input type="text" pattern="[0-9]+"></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const patternViolation = violations.find(v => v.name === 'html-standard/input-pattern-title');
			expect(patternViolation).toBeDefined();
			expect(patternViolation!.ruleId).toBe('required-attr');
			expect(patternViolation!.specConformance).toBe('non-normative');
		});

		it('reports no-small-in-heading with normative specConformance', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body><h1><small>sub</small></h1></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const smallViolation = violations.find(v => v.name === 'html-standard/no-small-in-heading');
			expect(smallViolation).toBeDefined();
			expect(smallViolation!.specConformance).toBe('normative');
		});
	});

	describe('a11y preset', () => {
		it('reports a11y/html-lang virtual rule', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
			});
			const langViolation = violations.find(v => v.name === 'a11y/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('required-attr');
		});

		it('reports a11y/abbr-title virtual rule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><abbr>HTML</abbr></body></html>',
				{
					extends: ['markuplint:a11y'],
				},
			);
			const abbrViolation = violations.find(v => v.name === 'a11y/abbr-title');
			expect(abbrViolation).toBeDefined();
			expect(abbrViolation!.ruleId).toBe('required-attr');
		});
	});

	describe('namespace wildcard disable', () => {
		it('disables all a11y virtual rules with "a11y/*": false', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
				rules: {
					'a11y/*': false,
				},
			});
			const a11yVirtualViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(a11yVirtualViolations).toStrictEqual([]);
		});

		it('still reports base rules when only virtual rules are disabled', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><video autoplay></video></body></html>',
				{
					extends: ['markuplint:a11y'],
					rules: {
						'a11y/*': false,
					},
				},
			);
			// Base rules like require-accessible-name should still fire
			const baseRuleViolations = violations.filter(v => !v.name);
			expect(baseRuleViolations.length).toBeGreaterThan(0);
		});

		it('disables all html-standard virtual rules with "html-standard/*": false', async () => {
			const { violations } = await mlTest('<html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard'],
				rules: {
					'html-standard/*': false,
				},
			});
			const htmlStdVirtualViolations = violations.filter(v => v.name?.startsWith('html-standard/'));
			expect(htmlStdVirtualViolations).toStrictEqual([]);
		});
	});

	describe('specConformance as metadata', () => {
		it('specConformance does not affect severity — all use base rule default', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><input type="text" pattern="[0-9]+"></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const patternViolation = violations.find(v => v.name === 'html-standard/input-pattern-title');
			expect(patternViolation).toBeDefined();
			// specConformance is metadata only — non-normative still uses base rule's defaultSeverity (error)
			expect(patternViolation!.specConformance).toBe('non-normative');
			expect(patternViolation!.severity).toBe('error');
		});

		it('a11y preset virtual rules have no specConformance', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
			});
			const a11yVirtualViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(a11yVirtualViolations.length).toBeGreaterThan(0);
			for (const v of a11yVirtualViolations) {
				expect(v.specConformance).toBeUndefined();
			}
		});
	});

	describe('exact name disable', () => {
		it('disables a single virtual rule by exact name', async () => {
			const { violations } = await mlTest('<html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard'],
				rules: {
					'html-standard/head-charset-utf8': false,
				},
			});
			expect(violations.find(v => v.name === 'html-standard/head-charset-utf8')).toBeUndefined();
		});

		it('other virtual rules still fire when one is disabled by exact name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><h1><small>sub</small></h1></body></html>',
				{
					extends: ['markuplint:html-standard'],
					rules: {
						'html-standard/head-charset-utf8': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'html-standard/head-charset-utf8')).toBeUndefined();
			const smallViolation = violations.find(v => v.name === 'html-standard/no-small-in-heading');
			expect(smallViolation).toBeDefined();
		});
	});

	describe('base rule violation structure', () => {
		it('base rule violations do not carry virtual rule metadata', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><video autoplay></video></body></html>',
				{
					extends: ['markuplint:a11y'],
					rules: {
						'a11y/*': false,
					},
				},
			);
			// All virtual rules disabled — only base rule violations remain
			expect(violations.length).toBeGreaterThan(0);
			for (const v of violations) {
				expect(v).not.toHaveProperty('name');
				expect(v).not.toHaveProperty('specConformance');
			}
		});
	});

	describe('combined presets', () => {
		it('both presets fire virtual rules simultaneously', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
			});
			const htmlStdViolations = violations.filter(v => v.name?.startsWith('html-standard/'));
			const a11yViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(htmlStdViolations.length).toBeGreaterThan(0);
			expect(a11yViolations.length).toBeGreaterThan(0);
		});
	});

	describe('user-defined named nodeRules', () => {
		it('creates and reports user-defined virtual rule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
				},
			);
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('required-attr');
			// No specConformance set — property should be absent
			expect(langViolation).not.toHaveProperty('specConformance');
		});

		it('user-defined virtual rule with specConformance metadata', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							specConformance: 'normative' as const,
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
				},
			);
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.specConformance).toBe('normative');
		});

		it('disables user-defined virtual rule by exact name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
					rules: {
						'custom/html-lang': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'custom/html-lang')).toBeUndefined();
		});
	});

	describe('config error reporting', () => {
		it('reports config-error for named nodeRule with invalid name format', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'invalid-no-slash',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
				},
			);
			const nameError = violations.find(
				v => v.ruleId === 'config-error' && v.message.includes('"invalid-no-slash"'),
			);
			expect(nameError).toBeDefined();
			expect(nameError!.severity).toBe('warning');
		});

		it('reports config-error for non-existent base rule in named nodeRule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/test',
							selector: ':where(html)',
							rules: { 'totally-nonexistent-rule': true },
						},
					],
				},
			);
			const configError = violations.find(
				v => v.ruleId === 'config-error' && v.message.includes('totally-nonexistent-rule'),
			);
			expect(configError).toBeDefined();
		});
	});

	describe('multi-entry named nodeRules', () => {
		it('multi-entry creates derived virtual rule names with group', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div></div></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/div-check',
							selector: ':where(div)',
							rules: {
								'required-attr': ['id'],
								'required-element': ['button'],
							},
						},
					],
				},
			);
			const attrViolation = violations.find(v => v.name === 'custom/div-check/required-attr');
			const elemViolation = violations.find(v => v.name === 'custom/div-check/required-element');
			expect(attrViolation).toBeDefined();
			expect(attrViolation!.ruleId).toBe('required-attr');
			expect(elemViolation).toBeDefined();
			expect(elemViolation!.ruleId).toBe('required-element');
		});

		it('group disable prevents all multi-entry virtual rules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div></div></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/div-check',
							selector: ':where(div)',
							rules: {
								'required-attr': ['id'],
								'required-element': ['button'],
							},
						},
					],
					rules: {
						'custom/div-check': false,
					},
				},
			);
			const customViolations = violations.filter(v => v.name?.startsWith('custom/div-check'));
			expect(customViolations).toStrictEqual([]);
		});
	});

	describe('base rule and virtual rule independence', () => {
		it('virtual rule fires even when its base rule is disabled globally', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
					rules: {
						'required-attr': false,
					},
				},
			);
			// Virtual rule is a separate MLRule instance — base rule disable does not affect it
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('required-attr');
		});

		it('disabling virtual rule does not suppress base rule on other nodes', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body><img src="x.png"></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
						{
							selector: ':where(img)',
							rules: { 'required-attr': ['alt'] },
						},
					],
					rules: {
						'custom/html-lang': false,
					},
				},
			);
			// Virtual rule disabled
			expect(violations.find(v => v.name === 'custom/html-lang')).toBeUndefined();
			// Base rule on <img> still fires via unnamed nodeRule
			const imgViolation = violations.find(v => v.ruleId === 'required-attr' && !v.name);
			expect(imgViolation).toBeDefined();
		});
	});

	describe('severity override via global rules', () => {
		it('user global rules severity propagates through nodeRule merge', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
					rules: {
						'custom/html-lang': { severity: 'warning' },
					},
				},
			);
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.severity).toBe('warning');
		});

		it('severity override on virtual rule does not change base rule severity', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body><img src="x.png"></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
						{
							selector: ':where(img)',
							rules: { 'required-attr': ['alt'] },
						},
					],
					rules: {
						'custom/html-lang': { severity: 'warning' },
					},
				},
			);
			const virtualViolation = violations.find(v => v.name === 'custom/html-lang');
			const baseViolation = violations.find(v => v.ruleId === 'required-attr' && !v.name);
			expect(virtualViolation).toBeDefined();
			expect(baseViolation).toBeDefined();
			expect(virtualViolation!.severity).toBe('warning');
			expect(baseViolation!.severity).toBe('error');
		});
	});

	describe('specificity-based override', () => {
		it('higher specificity nodeRule overrides lower for same virtual rule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
						{
							selector: 'html',
							rules: { 'custom/html-lang': false },
						},
					],
				},
			);
			// html (0,0,1) beats :where(html) (0,0,0) — virtual rule disabled per-node
			expect(violations.find(v => v.name === 'custom/html-lang')).toBeUndefined();
		});

		it('lower specificity nodeRule cannot override higher', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: 'html',
							rules: { 'required-attr': ['lang'] },
						},
						{
							selector: ':where(html)',
							rules: { 'custom/html-lang': false },
						},
					],
				},
			);
			// html (0,0,1) > :where(html) (0,0,0) — virtual rule keeps firing
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
		});
	});

	describe('definition order with same specificity', () => {
		it('later nodeRule overrides earlier when specificity is equal', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
						{
							selector: ':where(html)',
							rules: { 'custom/html-lang': false },
						},
					],
				},
			);
			// Same specificity (0,0,0) — later definition wins
			expect(violations.find(v => v.name === 'custom/html-lang')).toBeUndefined();
		});

		it('earlier nodeRule loses to later one at same specificity (also tests forward-reference)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					nodeRules: [
						{
							// Forward-references 'custom/html-lang' before it is defined below.
							// This is valid because expansion creates all virtual rules before
							// the document processes nodeRules.
							selector: ':where(html)',
							rules: { 'custom/html-lang': false },
						},
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'required-attr': ['lang'] },
						},
					],
				},
			);
			// Virtual rule's nodeRule comes later → overrides the false entry
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
		});
	});

	describe('accumulation across extends and user config', () => {
		it('user-defined named nodeRules coexist with preset named nodeRules', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
				nodeRules: [
					{
						name: 'custom/html-data',
						selector: ':where(html)',
						rules: { 'required-attr': ['data-app'] },
					},
				],
			});
			// Preset's virtual rule fires
			const a11yLang = violations.find(v => v.name === 'a11y/html-lang');
			expect(a11yLang).toBeDefined();
			// User's virtual rule also fires
			const customData = violations.find(v => v.name === 'custom/html-data');
			expect(customData).toBeDefined();
		});

		it('multiple extends accumulate virtual rules from all presets', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
			});
			const htmlStd = violations.filter(v => v.name?.startsWith('html-standard/'));
			const a11y = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(htmlStd.length).toBeGreaterThan(0);
			expect(a11y.length).toBeGreaterThan(0);
		});
	});

	describe('extends override by user config', () => {
		it('user selectively disables one preset virtual rule while keeping others', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><abbr>HTML</abbr></body></html>',
				{
					extends: ['markuplint:a11y'],
					rules: {
						'a11y/html-lang': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'a11y/html-lang')).toBeUndefined();
			expect(violations.find(v => v.name === 'a11y/abbr-title')).toBeDefined();
		});

		it('user disables one namespace while keeping another', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
				rules: {
					'a11y/*': false,
				},
			});
			expect(violations.filter(v => v.name?.startsWith('a11y/'))).toStrictEqual([]);
			expect(violations.filter(v => v.name?.startsWith('html-standard/')).length).toBeGreaterThan(0);
		});
	});

	describe('false entry separation in named nodeRules', () => {
		it('false entry does not create a virtual rule — only non-false entries do', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div></div></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/div-id',
							selector: ':where(div)',
							rules: {
								'required-attr': ['id'],
								'permitted-contents': false,
							},
						},
					],
				},
			);
			// Virtual rule fires for required-attr
			const idViolation = violations.find(v => v.name === 'custom/div-id');
			expect(idViolation).toBeDefined();
			expect(idViolation!.ruleId).toBe('required-attr');
			// The false entry becomes an unnamed nodeRule — no virtual rule is created for it
			const permVirtualViolation = violations.find(
				v => v.ruleId === 'permitted-contents' && v.name === 'custom/div-id',
			);
			expect(permVirtualViolation).toBeUndefined();
		});
	});

	describe('childNodeRules with named entries', () => {
		it('creates virtual rule from named childNodeRule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><ul><li>item</li></ul></body></html>',
				{
					childNodeRules: [
						{
							name: 'custom/li-data',
							selector: ':where(ul)',
							rules: { 'required-attr': ['data-index'] },
						},
					],
				},
			);
			const liViolation = violations.find(v => v.name === 'custom/li-data');
			expect(liViolation).toBeDefined();
			expect(liViolation!.ruleId).toBe('required-attr');
		});

		it('disables named childNodeRule by exact name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><ul><li>item</li></ul></body></html>',
				{
					childNodeRules: [
						{
							name: 'custom/li-data',
							selector: ':where(ul)',
							rules: { 'required-attr': ['data-index'] },
						},
					],
					rules: {
						'custom/li-data': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'custom/li-data')).toBeUndefined();
		});
	});

	describe('config error: nonexistent virtual rule reference', () => {
		it('reports config-error when rules references a nonexistent virtual rule name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>',
				{
					extends: ['markuplint:a11y'],
					rules: {
						'a11y/typo-rule-name': false,
					},
				},
			);
			const configError = violations.find(
				v => v.ruleId === 'config-error' && v.message.includes('a11y/typo-rule-name'),
			);
			expect(configError).toBeDefined();
		});

		it('config-error severity for nonexistent rule is warning', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body></body></html>',
				{
					rules: {
						'totally/nonexistent': false,
					},
				},
			);
			const configError = violations.find(
				v => v.ruleId === 'config-error' && v.message.includes('totally/nonexistent'),
			);
			expect(configError).toBeDefined();
			expect(configError!.severity).toBe('warning');
		});
	});

	describe('wildcard pattern edge cases', () => {
		it('wildcard with non-false value does not disable virtual rules', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
				rules: {
					'a11y/*': true,
				},
			});
			// a11y/*: true should NOT disable — only false disables
			const a11yViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(a11yViolations.length).toBeGreaterThan(0);
		});

		it('unrelated namespace wildcard does not affect other namespaces', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
				rules: {
					'nonexistent-ns/*': false,
				},
			});
			// Both namespaces should still fire
			expect(violations.filter(v => v.name?.startsWith('html-standard/')).length).toBeGreaterThan(0);
			expect(violations.filter(v => v.name?.startsWith('a11y/')).length).toBeGreaterThan(0);
		});
	});
});
