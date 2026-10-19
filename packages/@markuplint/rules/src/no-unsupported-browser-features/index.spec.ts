import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('browser support (BCD-based)', () => {
	test('[no-unsupported-browser-features-invalid-001] element not supported in IE 11', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('"dialog"');
		expect(violations[0]?.message).toContain('element');
		expect(violations[0]?.message).toContain('Internet Explorer');
	});

	test('[no-unsupported-browser-features-valid-001] common element supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-browser-features-invalid-002] attribute not supported in old browsers', async () => {
		// <dialog> element and its "open" attribute are both unsupported in IE
		const { violations } = await mlRuleTest(rule, '<dialog open></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		// 2 violations: one for the element, one for the attribute
		expect(violations.length).toBe(2);
		expect(violations[0]?.message).toContain('"dialog"');
		expect(violations[0]?.message).toContain('element');
		expect(violations[1]?.message).toContain('"open"');
		expect(violations[1]?.message).toContain('attribute');
	});

	test('[no-unsupported-browser-features-valid-002] common attribute supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text">', {
			rule: {
				options: {
					browserslist: 'chrome 130',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-browser-features-invalid-003] multiple browsers - only unsupported ones reported', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {
					browserslist: ['chrome 130', 'ie 11'],
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('Internet Explorer');
		expect(violations[0]?.message).not.toContain('Chrome');
	});
});

describe('attribute-only unsupported (element is supported)', () => {
	test('[no-unsupported-browser-features-invalid-004] element supported but attribute unsupported', async () => {
		// <video> is supported since Chrome 3, but "controlslist" was added in Chrome 58.
		// Target Chrome 50 so the element is supported but the attribute is not.
		const { violations } = await mlRuleTest(rule, '<video controlslist="nodownload"></video>', {
			rule: {
				options: {
					browserslist: 'chrome 50',
				},
			},
		});
		// Element should be supported, so no element-level violation
		const elementViolation = violations.find(v => v.message.includes('"video"') && v.message.includes('element'));
		expect(elementViolation).toBeUndefined();
		// Attribute should be unsupported
		const attrViolation = violations.find(
			v => v.message.includes('"controlslist"') && v.message.includes('attribute'),
		);
		expect(attrViolation).toBeDefined();
	});
});

describe('no-op without browserslist', () => {
	test('[no-unsupported-browser-features-valid-003] no error without browserslist config', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-browser-features-valid-004] no error with empty options', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('ignoreFeatures', () => {
	test('[no-unsupported-browser-features-valid-005] ignore element by name', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
					ignoreFeatures: ['dialog'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-browser-features-valid-006] ignore attribute by pattern', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog open></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
					ignoreFeatures: ['dialog', 'dialog[open]'],
				},
			},
		});
		// Both element and attribute are ignored
		expect(violations).toStrictEqual([]);
	});
});

describe('default severity', () => {
	test('[no-unsupported-browser-features-invalid-005] severity is warning by default', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
	});
});

describe('SVG elements are skipped', () => {
	test('[no-unsupported-browser-features-invalid-006] SVG content is not checked', async () => {
		const { violations } = await mlRuleTest(rule, '<svg><circle></circle></svg>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		// SVG child elements should not be checked
		const circleViolation = violations.find(v => v.message.includes('"circle"'));
		expect(circleViolation).toBeUndefined();
	});
});

describe('pretender gap (issue #3740)', () => {
	test('[no-unsupported-browser-features-issue-3740-001] JSX component pretendered to old HTML reports against browserslist', async () => {
		const { violations } = await mlRuleTest(rule, '<Dialog>x</Dialog>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [{ selector: 'Dialog', as: 'dialog' }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('"dialog"');
		expect(violations[0]?.message).toContain('element');
		expect(violations[0]?.message).toContain('Internet Explorer');
		expect(violations[0]?.line).toBe(1);
		expect(violations[0]?.col).toBe(1);
		expect(violations[0]?.raw).toBe('<Dialog>');
	});

	test('[no-unsupported-browser-features-issue-3740-002] JSX with object inheritAttrs pretender reports', async () => {
		const { violations } = await mlRuleTest(rule, '<Dialog>x</Dialog>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [{ selector: 'Dialog', as: { element: 'dialog', inheritAttrs: true } }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('"dialog"');
		expect(violations[0]?.message).toContain('Internet Explorer');
		expect(violations[0]?.raw).toBe('<Dialog>');
	});

	test('[no-unsupported-browser-features-issue-3740-003] HTML→HTML pretender ignored: original element checked', async () => {
		// `pretenders` config is now no-op for HTML element selectors, so the
		// original `<dialog>` is still evaluated against the browserslist target.
		const { violations } = await mlRuleTest(rule, '<dialog>x</dialog>', {
			pretenders: [{ selector: 'dialog', as: 'div' }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('"dialog"');
		expect(violations[0]?.message).toContain('Internet Explorer');
		expect(violations[0]?.raw).toBe('<dialog>');
	});
});

describe('attribute name case (issue #4309)', () => {
	const options = { browserslist: 'ie 11' };
	const elementViolation = (col: number, raw: string) => ({
		severity: 'warning',
		line: 1,
		col,
		raw,
		message: 'The "dialog" element is not supported in Internet Explorer (not supported)',
	});
	const attrViolation = (col: number, raw: string, name: string) => ({
		severity: 'warning',
		line: 1,
		col,
		raw,
		message: `The "${name}" attribute is not supported in Internet Explorer (not supported)`,
	});

	test('[no-unsupported-browser-features-issue-4309-001] HTML: an attribute written in upper case is the one of BCD', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog OPEN></dialog>', { rule: { options } });
		expect(violations).toStrictEqual([elementViolation(1, '<dialog OPEN>'), attrViolation(9, 'OPEN', 'OPEN')]);
	});

	test('[no-unsupported-browser-features-issue-4309-002] HTML: ignoreFeatures keys match in any spelling', async () => {
		const attrUpper = await mlRuleTest(rule, '<dialog open></dialog>', {
			rule: { options: { ...options, ignoreFeatures: ['dialog', 'dialog[OPEN]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
		const elementUpper = await mlRuleTest(rule, '<dialog OPEN></dialog>', {
			rule: { options: { ...options, ignoreFeatures: ['DIALOG', 'dialog[open]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<dialog OPEN></dialog>', {
			rule: { options: { ...options, ignoreFeatures: ['dialog', 'dialog[other]'] } },
		});
		expect(control.violations).toStrictEqual([attrViolation(9, 'OPEN', 'OPEN')]);
	});

	test('[no-unsupported-browser-features-issue-4309-003] HTML: the ignoreFeatures of an element replaces that of the rule, each element keeping its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<dialog class="a" OPEN></dialog><dialog class="b" OPEN></dialog><dialog class="c" OPEN></dialog>',
			{
				rule: { options: { ...options, ignoreFeatures: ['dialog', 'dialog[open]'] } },
				nodeRule: [
					{
						selector: '.b',
						rule: { options: { ...options, ignoreFeatures: ['dialog'] } },
					},
					{
						selector: '.c',
						rule: { options: { ...options, ignoreFeatures: ['DIALOG', 'Dialog[Open]'] } },
					},
				],
			},
		);
		expect(violations).toStrictEqual([attrViolation(51, 'OPEN', 'OPEN')]);
	});

	test('[no-unsupported-browser-features-issue-4309-004] Svelte: the element part is exact and the attribute part folds', async () => {
		const parser = { '.*': '@markuplint/svelte-parser' };
		const { violations } = await mlRuleTest(rule, '<dialog OPEN></dialog>', {
			parser,
			rule: { options: { ...options, ignoreFeatures: ['DIALOG', 'dialog[OPEN]'] } },
		});
		// `DIALOG` is not `<dialog>` in Svelte, and `dialog[OPEN]` is its `open`
		expect(violations).toStrictEqual([elementViolation(1, '<dialog OPEN>')]);
		const reported = await mlRuleTest(rule, '<dialog OPEN></dialog>', {
			parser,
			rule: { options: { ...options, ignoreFeatures: ['dialog'] } },
		});
		expect(reported.violations).toStrictEqual([attrViolation(9, 'OPEN', 'OPEN')]);
	});

	test('[no-unsupported-browser-features-issue-4309-005] JSX: an HTML element folds the attribute names', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const reported = await mlRuleTest(rule, '<dialog OPEN />', { parser, rule: { options } });
		expect(reported.violations).toStrictEqual([
			elementViolation(1, '<dialog OPEN />'),
			attrViolation(9, 'OPEN', 'OPEN'),
		]);
		const ignored = await mlRuleTest(rule, '<dialog OPEN />', {
			parser,
			rule: { options: { ...options, ignoreFeatures: ['dialog', 'dialog[open]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});
});
