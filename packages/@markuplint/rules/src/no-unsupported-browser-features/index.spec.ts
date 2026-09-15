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
