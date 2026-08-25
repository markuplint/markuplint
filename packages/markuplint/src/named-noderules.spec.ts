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
			expect(charsetViolation!.ruleId).toBe('require-element');
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
			expect(patternViolation!.ruleId).toBe('require-attr');
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

		it('reports no-small-in-heading with its configured reason', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body><h1><small>sub</small></h1></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const smallViolation = violations.find(v => v.name === 'html-standard/no-small-in-heading');
			expect(smallViolation).toBeDefined();
			expect(smallViolation!.reason).toBe(
				'The small element must not be used for subheadings. https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-small-element',
			);
		});

		it('reports html-standard/no-base-after-link-or-script when <base> follows <link>', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<link rel="stylesheet" href="a.css"><base href="/"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const baseViolation = violations.find(v => v.name === 'html-standard/no-base-after-link-or-script');
			expect(baseViolation).toBeDefined();
			expect(baseViolation!.ruleId).toBe('no-restricted-element');
			expect(baseViolation!.specConformance).toBe('normative');
		});

		it('reports html-standard/no-base-after-link-or-script when <base> follows <script>', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<script src="a.js"></script><base href="/"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const baseViolation = violations.find(v => v.name === 'html-standard/no-base-after-link-or-script');
			expect(baseViolation).toBeDefined();
			expect(baseViolation!.ruleId).toBe('no-restricted-element');
			expect(baseViolation!.specConformance).toBe('normative');
		});

		it('does not report html-standard/no-base-after-link-or-script when <base> precedes <link> and <script>', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title><base href="/">' +
					'<link rel="stylesheet" href="a.css"><script src="a.js"></script></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const baseViolation = violations.find(v => v.name === 'html-standard/no-base-after-link-or-script');
			expect(baseViolation).toBeUndefined();
		});

		it('reports html-standard/no-duplicate-charset with a reasonOnly message instead of the raw selector', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><meta charset="UTF-8"><title>t</title></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const charsetViolation = violations.find(v => v.name === 'html-standard/no-duplicate-charset');
			expect(charsetViolation).toBeDefined();
			expect(charsetViolation!.ruleId).toBe('no-restricted-element');
			expect(charsetViolation!.message).toBe(
				'There must not be more than one meta element with a charset attribute per document. https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset',
			);
			expect(charsetViolation).not.toHaveProperty('reason');
		});

		it('reports html-standard/no-duplicate-description with a reasonOnly message instead of the raw selector', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<meta name="description" content="a"><meta name="description" content="b"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const descriptionViolation = violations.find(v => v.name === 'html-standard/no-duplicate-description');
			expect(descriptionViolation).toBeDefined();
			expect(descriptionViolation!.ruleId).toBe('no-restricted-element');
			expect(descriptionViolation!.message).toBe(
				'There must not be more than one meta element where the name attribute value is an ASCII case-insensitive match for "description" per document. https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names',
			);
			expect(descriptionViolation).not.toHaveProperty('reason');
		});

		it('reports html-standard/no-charset-http-equiv-coexist with a reasonOnly message instead of the raw selector', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8">' +
					'<meta http-equiv="content-type" content="text/html; charset=UTF-8"><title>t</title></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const coexistViolation = violations.find(v => v.name === 'html-standard/no-charset-http-equiv-coexist');
			expect(coexistViolation).toBeDefined();
			expect(coexistViolation!.ruleId).toBe('no-restricted-element');
			expect(coexistViolation!.message).toBe(
				'A document must not contain both a meta element with an http-equiv attribute in the Encoding declaration state and a meta element with the charset attribute. https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset',
			);
			expect(coexistViolation).not.toHaveProperty('reason');
		});

		it('reports html-standard/no-base-after-link-or-script with a reasonOnly message instead of the raw selector', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<link rel="stylesheet" href="a.css"><base href="/"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const baseViolation = violations.find(v => v.name === 'html-standard/no-base-after-link-or-script');
			expect(baseViolation).toBeDefined();
			expect(baseViolation!.ruleId).toBe('no-restricted-element');
			expect(baseViolation!.message).toBe(
				'A base element must come before any other elements in the tree that have attributes defined as taking URLs, except the html element. https://html.spec.whatwg.org/multipage/semantics.html#the-base-element',
			);
			expect(baseViolation).not.toHaveProperty('reason');
		});

		it('reports html-standard/script-content for malformed importmap', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<script type="importmap">not json</script></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const scriptContentViolation = violations.find(v => v.name === 'html-standard/script-content');
			expect(scriptContentViolation).toBeDefined();
			expect(scriptContentViolation!.ruleId).toBe('valid-importmap');
			expect(scriptContentViolation!.specConformance).toBe('normative');
		});

		it('reports html-standard/valid-speculation-rules for invalid speculationrules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><title>t</title>' +
					'<script type="speculationrules">{"prefetch":[{"source":"list"}]}</script></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const scriptContentViolation = violations.find(v => v.name === 'html-standard/valid-speculation-rules');
			expect(scriptContentViolation).toBeDefined();
			expect(scriptContentViolation!.ruleId).toBe('valid-speculation-rules');
			expect(scriptContentViolation!.severity).toBe('error');
			expect(scriptContentViolation!.specConformance).toBe('normative');
		});
	});

	describe('a11y preset', () => {
		it('reports a11y/html-lang virtual rule', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
			});
			const langViolation = violations.find(v => v.name === 'a11y/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('require-attr');
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
			expect(abbrViolation!.ruleId).toBe('require-attr');
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

		it('disables all a11y rules (both nodeRules and named rule groups) with "a11y/*": false', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><video autoplay></video></body></html>',
				{
					extends: ['markuplint:a11y'],
					rules: {
						'a11y/*': false,
					},
				},
			);
			// All a11y rules are now named rule groups, so a11y/*: false disables everything
			const a11yViolations = violations.filter(
				v => v.name?.startsWith('a11y/') || v.ruleId === 'require-accessible-name',
			);
			expect(a11yViolations).toStrictEqual([]);
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

		it('a11y preset virtual rules carry specConformance metadata', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:a11y'],
			});
			const a11yVirtualViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			// At minimum, a11y/html-lang fires (missing lang on <html>)
			expect(a11yVirtualViolations).toContainEqual(expect.objectContaining({ name: 'a11y/html-lang' }));
			for (const v of a11yVirtualViolations) {
				// All a11y rules now have specConformance (normative or non-normative)
				expect(v.specConformance).toBeDefined();
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
		it('named rule group virtual rules carry correct metadata', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:a11y'],
				},
			);
			const idViolation = violations.find(v => v.name === 'a11y/id-duplication');
			expect(idViolation).toBeDefined();
			expect(idViolation!.ruleId).toBe('no-duplicate-id');
			expect(idViolation!.specConformance).toBe('normative');
		});
	});

	describe('combined presets', () => {
		it('both presets fire virtual rules simultaneously', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
			});
			const htmlStdViolations = violations.filter(v => v.name?.startsWith('html-standard/'));
			const a11yViolations = violations.filter(v => v.name?.startsWith('a11y/'));
			expect(htmlStdViolations).toContainEqual(
				expect.objectContaining({ name: 'html-standard/head-charset-utf8' }),
			);
			expect(a11yViolations).toContainEqual(expect.objectContaining({ name: 'a11y/html-lang' }));
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
							rules: { 'require-attr': ['lang'] },
						},
					],
				},
			);
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('require-attr');
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
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
								'require-attr': ['id'],
								'require-element': ['button'],
							},
						},
					],
				},
			);
			const attrViolation = violations.find(v => v.name === 'custom/div-check/require-attr');
			const elemViolation = violations.find(v => v.name === 'custom/div-check/require-element');
			expect(attrViolation).toBeDefined();
			expect(attrViolation!.ruleId).toBe('require-attr');
			expect(elemViolation).toBeDefined();
			expect(elemViolation!.ruleId).toBe('require-element');
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
								'require-attr': ['id'],
								'require-element': ['button'],
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
							rules: { 'require-attr': ['lang'] },
						},
					],
					rules: {
						'require-attr': false,
					},
				},
			);
			// Virtual rule is a separate MLRule instance — base rule disable does not affect it
			const langViolation = violations.find(v => v.name === 'custom/html-lang');
			expect(langViolation).toBeDefined();
			expect(langViolation!.ruleId).toBe('require-attr');
		});

		it('disabling virtual rule does not suppress base rule on other nodes', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body><img src="x.png"></body></html>',
				{
					nodeRules: [
						{
							name: 'custom/html-lang',
							selector: ':where(html)',
							rules: { 'require-attr': ['lang'] },
						},
						{
							selector: ':where(img)',
							rules: { 'require-attr': ['alt'] },
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
			const imgViolation = violations.find(v => v.ruleId === 'require-attr' && !v.name);
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
						},
						{
							selector: ':where(img)',
							rules: { 'require-attr': ['alt'] },
						},
					],
					rules: {
						'custom/html-lang': { severity: 'warning' },
					},
				},
			);
			const virtualViolation = violations.find(v => v.name === 'custom/html-lang');
			const baseViolation = violations.find(v => v.ruleId === 'require-attr' && !v.name);
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
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
							rules: { 'require-attr': ['lang'] },
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
						rules: { 'require-attr': ['data-app'] },
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
			expect(htmlStd).toContainEqual(expect.objectContaining({ name: 'html-standard/head-charset-utf8' }));
			expect(a11y).toContainEqual(expect.objectContaining({ name: 'a11y/html-lang' }));
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
			expect(violations.filter(v => v.name?.startsWith('html-standard/'))).toContainEqual(
				expect.objectContaining({ name: 'html-standard/head-charset-utf8' }),
			);
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
								'require-attr': ['id'],
								'permitted-contents': false,
							},
						},
					],
				},
			);
			// Virtual rule fires for require-attr
			const idViolation = violations.find(v => v.name === 'custom/div-id');
			expect(idViolation).toBeDefined();
			expect(idViolation!.ruleId).toBe('require-attr');
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
							rules: { 'require-attr': ['data-index'] },
						},
					],
				},
			);
			const liViolation = violations.find(v => v.name === 'custom/li-data');
			expect(liViolation).toBeDefined();
			expect(liViolation!.ruleId).toBe('require-attr');
		});

		it('disables named childNodeRule by exact name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><ul><li>item</li></ul></body></html>',
				{
					childNodeRules: [
						{
							name: 'custom/li-data',
							selector: ':where(ul)',
							rules: { 'require-attr': ['data-index'] },
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

	describe('accumulation: same base rule in multiple named rule groups', () => {
		it('both a11y and html-standard id-duplication report independently', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
				},
			);
			const a11yId = violations.find(v => v.name === 'a11y/id-duplication');
			const htmlStdId = violations.find(v => v.name === 'html-standard/id-duplication');
			expect(a11yId).toBeDefined();
			expect(htmlStdId).toBeDefined();
			// Different names, same base rule
			expect(a11yId!.ruleId).toBe('no-duplicate-id');
			expect(htmlStdId!.ruleId).toBe('no-duplicate-id');
		});

		it('disabling a11y/id-duplication still reports html-standard/id-duplication', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
					rules: {
						'a11y/id-duplication': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'a11y/id-duplication')).toBeUndefined();
			expect(violations.find(v => v.name === 'html-standard/id-duplication')).toBeDefined();
		});

		it('disabling html-standard/id-duplication still reports a11y/id-duplication', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
					rules: {
						'html-standard/id-duplication': false,
					},
				},
			);
			expect(violations.find(v => v.name === 'html-standard/id-duplication')).toBeUndefined();
			expect(violations.find(v => v.name === 'a11y/id-duplication')).toBeDefined();
		});

		it('disabling both id-duplication named groups removes all id-duplication violations', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
					rules: {
						'a11y/id-duplication': false,
						'html-standard/id-duplication': false,
					},
				},
			);
			const idViolations = violations.filter(v => v.ruleId === 'no-duplicate-id');
			expect(idViolations).toStrictEqual([]);
		});
	});

	describe('disable strength: base rule name disables all wrapping named rule groups', () => {
		it('base rule false disables named rule groups that wrap it', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
					rules: {
						'no-duplicate-id': false,
					},
				},
			);
			// base rule false → both a11y/ and html-standard/ named rule groups disabled
			const idViolations = violations.filter(v => v.ruleId === 'no-duplicate-id');
			expect(idViolations).toStrictEqual([]);
		});
	});

	describe('specConformance is metadata only (does not affect severity)', () => {
		it('non-normative rules use base rule default severity (error)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"></head><body></body></html>',
				{
					extends: ['markuplint:a11y'],
				},
			);
			const langViolation = violations.find(v => v.name === 'a11y/html-lang');
			expect(langViolation).toBeDefined();
			// specConformance does NOT affect severity
			expect(langViolation!.severity).toBe('error');
			expect(langViolation!.specConformance).toBe('non-normative');
		});

		it('normative rules also use base rule default severity (error)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:a11y'],
				},
			);
			const idViolation = violations.find(v => v.name === 'a11y/id-duplication');
			expect(idViolation).toBeDefined();
			expect(idViolation!.severity).toBe('error');
			expect(idViolation!.specConformance).toBe('normative');
		});
	});

	describe('html-standard/no-shortcut-icon', () => {
		it('detects rel="shortcut icon" on link element', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="shortcut icon" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeDefined();
			expect(shortcutViolation!.ruleId).toBe('no-restricted-attr');
			expect(shortcutViolation!.specConformance).toBe('non-normative');
		});

		it('detects rel="SHORTCUT ICON" (case-insensitive)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="SHORTCUT ICON" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeDefined();
		});

		it('does not flag rel="icon"', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="icon" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeUndefined();
		});

		it('detects rel="shortcut" without icon', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="shortcut" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeDefined();
		});

		it('detects rel="icon shortcut" (reversed order)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="icon shortcut" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeDefined();
		});

		it('can be disabled by exact name', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html><head><meta charset="UTF-8"><link rel="shortcut icon" href="/favicon.ico"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
					rules: {
						'html-standard/no-shortcut-icon': false,
					},
				},
			);
			const shortcutViolation = violations.find(v => v.name === 'html-standard/no-shortcut-icon');
			expect(shortcutViolation).toBeUndefined();
		});
	});

	describe('backwards compatibility', () => {
		it('conventional config without named rule groups works as before', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					rules: {
						'no-duplicate-id': true,
					},
				},
			);
			const idViolation = violations.find(v => v.ruleId === 'no-duplicate-id');
			expect(idViolation).toBeDefined();
			// No virtual rule metadata
			expect(idViolation).not.toHaveProperty('name');
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
			expect(a11yViolations).toContainEqual(expect.objectContaining({ name: 'a11y/html-lang' }));
		});

		it('unrelated namespace wildcard does not affect other namespaces', async () => {
			const { violations } = await mlTest('<!doctype html><html><head></head><body></body></html>', {
				extends: ['markuplint:html-standard', 'markuplint:a11y'],
				rules: {
					'nonexistent-ns/*': false,
				},
			});
			// Both namespaces should still fire
			expect(violations.filter(v => v.name?.startsWith('html-standard/'))).toContainEqual(
				expect.objectContaining({ name: 'html-standard/head-charset-utf8' }),
			);
			expect(violations.filter(v => v.name?.startsWith('a11y/'))).toContainEqual(
				expect.objectContaining({ name: 'a11y/html-lang' }),
			);
		});
	});

	describe('childNodeRules disabling NamedRuleGroup by base rule name (#3578)', () => {
		it('disables virtual rule when childNodeRules sets base rule name to false', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div class="ignore"><div role="foo"></div></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					childNodeRules: [
						{
							selector: '.ignore',
							inheritance: true,
							rules: {
								'no-unknown-role': false,
							},
						},
					],
				},
			);
			const waiAriaViolations = violations.filter(v => v.ruleId === 'no-unknown-role');
			expect(waiAriaViolations).toHaveLength(0);
		});

		it('still reports wai-aria violations outside childNodeRules scope', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div role="foo"></div><div class="ignore"><div role="bar"></div></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					childNodeRules: [
						{
							selector: '.ignore',
							inheritance: true,
							rules: {
								'no-unknown-role': false,
							},
						},
					],
				},
			);
			const waiAriaViolations = violations.filter(v => v.ruleId === 'no-unknown-role');
			// role="foo" outside .ignore is still reported; role="bar" inside .ignore is suppressed
			expect(waiAriaViolations).toHaveLength(1);
			expect(waiAriaViolations[0]!.message).toContain('foo');
		});

		it('disables virtual rule when nodeRules sets base rule name to false', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div role="foo"></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					nodeRules: [
						{
							selector: 'div',
							rules: {
								'no-unknown-role': false,
							},
						},
					],
				},
			);
			const waiAriaViolations = violations.filter(v => v.ruleId === 'no-unknown-role');
			expect(waiAriaViolations).toHaveLength(0);
		});

		it('disables all virtual rules in namespace via wildcard in childNodeRules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div class="legacy"><div role="foo"></div><div id="a"></div><div id="a"></div></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					childNodeRules: [
						{
							selector: '.legacy',
							inheritance: true,
							rules: {
								'a11y/*': false,
							},
						},
					],
				},
			);
			// a11y/* rules inside .legacy (line > 1) should be disabled;
			// document-level rules like a11y/required-h1 are not affected by childNodeRules
			const a11yViolations = violations.filter(v => v.name?.startsWith('a11y/') && v.line > 1);
			expect(a11yViolations).toHaveLength(0);
		});

		it('disables all virtual rules in namespace via wildcard in nodeRules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div role="foo"></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					nodeRules: [
						{
							selector: 'div',
							rules: {
								'a11y/*': false,
							},
						},
					],
				},
			);
			// a11y/* rules on matching div should be disabled;
			// document-level rules are not affected by nodeRules selector
			const a11yViolations = violations.filter(v => v.name?.startsWith('a11y/') && v.line > 1);
			expect(a11yViolations).toHaveLength(0);
		});

		it('propagates disable from base rule name to virtual rules via nodeRules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><img src="icon.svg" alt="icon" role="img" /></body></html>',
				{
					extends: ['markuplint:a11y'],
					nodeRules: [
						{
							selector: 'img[src$=".svg"]',
							rules: {
								'no-redundant-role': false,
							},
						},
					],
				},
			);
			// Base rule name disable propagates to a11y/wai-aria/implicit-role virtual rule
			const implicitRoleViolations = violations.filter(
				v => v.ruleId === 'no-redundant-role' && v.message.includes('img'),
			);
			expect(implicitRoleViolations).toHaveLength(0);
		});

		it('propagates disable via childNodeRules to virtual rules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div class="svg-section"><img src="icon.svg" alt="icon" role="img" /></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					childNodeRules: [
						{
							selector: '.svg-section',
							inheritance: true,
							rules: {
								'no-redundant-role': false,
							},
						},
					],
				},
			);
			const implicitRoleViolations = violations.filter(
				v => v.ruleId === 'no-redundant-role' && v.message.includes('img'),
			);
			expect(implicitRoleViolations).toHaveLength(0);
		});

		it('reports config-error when wildcard is used with non-false value in nodeRules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div role="foo"></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					nodeRules: [
						{
							selector: 'div',
							rules: {
								'a11y/*': true,
							},
						},
					],
				},
			);
			const configError = violations.find(v => v.ruleId === 'config-error' && v.message.includes('a11y/*'));
			expect(configError).toBeDefined();
		});

		it('reports config-error when wildcard is used with non-false value in childNodeRules', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div class="section"><div role="foo"></div></div></body></html>',
				{
					extends: ['markuplint:a11y'],
					childNodeRules: [
						{
							selector: '.section',
							inheritance: true,
							rules: {
								'a11y/*': { options: {} },
							},
						},
					],
				},
			);
			const configError = violations.find(v => v.ruleId === 'config-error' && v.message.includes('a11y/*'));
			expect(configError).toBeDefined();
		});

		it('propagates disable to multiple virtual rules wrapping the same base rule', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"></head><body><div id="a"></div><div id="a"></div></body></html>',
				{
					extends: ['markuplint:html-standard', 'markuplint:a11y'],
					nodeRules: [
						{
							selector: 'div',
							rules: {
								'no-duplicate-id': false,
							},
						},
					],
				},
			);
			// Both a11y/id-duplication and html-standard/id-duplication should be disabled on div
			const idViolations = violations.filter(v => v.ruleId === 'no-duplicate-id');
			expect(idViolations).toHaveLength(0);
		});
	});

	describe('rdfa preset (issue #3803)', () => {
		it('markuplint:recommended does not flag <meta property> as invalid-attr', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>t</title><meta property="og:title" content="Hello"></head><body><h1>x</h1></body></html>',
				{
					extends: ['markuplint:recommended'],
				},
			);
			const invalidAttrViolations = violations.filter(v =>
				['no-unknown-attr', 'no-disallowed-attr', 'no-invalid-attr-value'].includes(v.ruleId),
			);
			expect(invalidAttrViolations.map(v => v.raw)).toStrictEqual([]);
		});

		it('markuplint:rdfa alone allows <meta property> without invalid-attr violations', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="og:title" content="Hello"></head><body></body></html>',
				{
					extends: ['markuplint:rdfa'],
				},
			);
			const invalidAttrViolations = violations.filter(v =>
				['no-unknown-attr', 'no-disallowed-attr', 'no-invalid-attr-value'].includes(v.ruleId),
			);
			expect(invalidAttrViolations).toStrictEqual([]);
		});

		it('markuplint:html-standard alone still flags <meta property> (no rdfa override)', async () => {
			// Establishes the baseline: html-standard enables the base
			// `no-unknown-attr` rule, which performs full spec validation. Without
			// the rdfa preset's nodeRule, `property`/`content` are not HTML
			// spec attributes on <meta> and must be reported.
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="og:title" content="Hello"></head><body></body></html>',
				{
					extends: ['markuplint:html-standard'],
				},
			);
			const propertyErrors = violations.filter(v => v.ruleId === 'no-unknown-attr' && v.raw === 'property');
			expect(propertyErrors.length).toBeGreaterThan(0);
		});

		it('accesskey on <meta property> is still reported by a11y/no-accesskey (narrow check preserved)', async () => {
			// Ensures virtual rules retain their narrow allow/disallow checks
			// regardless of the rdfa override reaching the base rule. If this
			// test fails, the virtual rule has been contaminated or disabled.
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="og:title" content="x" accesskey="a"></head><body></body></html>',
				{
					extends: ['markuplint:recommended'],
				},
			);
			const accesskeyViolation = violations.find(v => v.name === 'a11y/no-accesskey');
			expect(accesskeyViolation).toBeDefined();
			expect(accesskeyViolation!.raw).toBe('accesskey');
		});

		it('unknown attribute on <meta property> is reported exactly once by base rule (no virtual duplicates)', async () => {
			// Regression guard for the root cause of #3803: virtual rules
			// wrapping the pre-split `invalid-attr` previously ran spec-fallback and each
			// produced a duplicate error. The fix makes them narrow — only
			// the base rule reports spec violations now.
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="og:title" content="x" bogus="y"></head><body></body></html>',
				{
					extends: ['markuplint:recommended'],
				},
			);
			const bogusViolations = violations.filter(v => v.ruleId === 'no-unknown-attr' && v.raw === 'bogus');
			expect(bogusViolations).toHaveLength(1);
			// base rule report has no virtual alias `name`
			expect(bogusViolations[0]!.name).toBeUndefined();
		});

		it('empty property value on <meta property> is flagged (NoEmptyAny)', async () => {
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="" content=""></head><body></body></html>',
				{
					extends: ['markuplint:recommended'],
				},
			);
			const emptyValueViolations = violations.filter(v => v.ruleId === 'no-invalid-attr-value' && v.raw === '');
			expect(emptyValueViolations.length).toBeGreaterThan(0);
		});

		it('markuplint:a11y alone does not flag <meta property> (virtual rules are narrow)', async () => {
			// a11y preset does not enable the base spec-validating rules.
			// Virtual rules such as a11y/no-accesskey are narrow — they only
			// enforce their own disallowAttrs and never perform spec
			// validation. Hence `property` is not flagged.
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta property="og:title" content="x"></head><body></body></html>',
				{
					extends: ['markuplint:a11y'],
				},
			);
			const invalidAttrViolations = violations.filter(v =>
				['no-unknown-attr', 'no-disallowed-attr', 'no-invalid-attr-value'].includes(v.ruleId),
			);
			expect(invalidAttrViolations).toStrictEqual([]);
		});

		it('fully valid markuplint:recommended markup produces zero violations', async () => {
			// Positive sanity check — if any rule over-reports on an otherwise
			// conformant document, this anchors the regression.
			const { violations } = await mlTest(
				'<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>t</title><meta property="og:title" content="Hello"></head><body><h1>x</h1></body></html>',
				{
					extends: ['markuplint:recommended'],
				},
			);
			expect(violations).toStrictEqual([]);
		});
	});
});
