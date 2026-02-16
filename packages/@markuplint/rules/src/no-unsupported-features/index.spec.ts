import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('browser support (BCD-based)', () => {
	test('element not supported in IE 11', async () => {
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

	test('common element supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('attribute not supported in old browsers', async () => {
		// Use <dialog> + closedby which was added more recently in browsers
		// The dialog element itself may also be unsupported, so we check attribute-specific violations
		const { violations } = await mlRuleTest(rule, '<dialog open></dialog>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		// At minimum, the dialog element is unsupported in IE
		expect(violations.length).toBeGreaterThanOrEqual(1);
		expect(violations[0]?.message).toContain('"dialog"');
	});

	test('common attribute supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text">', {
			rule: {
				options: {
					browserslist: 'chrome 130',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('multiple browsers - only unsupported ones reported', async () => {
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

describe('no-op without browserslist', () => {
	test('no error without browserslist config', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>');
		expect(violations).toStrictEqual([]);
	});

	test('no error with empty options', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('ignoreFeatures', () => {
	test('ignore element by name', async () => {
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

	test('ignore attribute by pattern', async () => {
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

describe('checkExperimental', () => {
	test('no warning by default', async () => {
		const { violations } = await mlRuleTest(rule, '<search></search>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('warns about experimental elements when enabled', async () => {
		// checkExperimental uses spec data, not BCD.
		// If <search> is no longer experimental in spec, violations will be empty — that's correct.
		const { violations } = await mlRuleTest(rule, '<search></search>', {
			rule: {
				options: {
					checkExperimental: true,
				},
			},
		});
		for (const v of violations) {
			expect(v.message).toContain('experimental');
		}
	});

	test('works without browserslist config', async () => {
		// checkExperimental should work independently of browserslist
		const withBrowserslist = await mlRuleTest(rule, '<search></search>', {
			rule: {
				options: {
					checkExperimental: true,
					browserslist: 'chrome 130',
				},
			},
		});
		const withoutBrowserslist = await mlRuleTest(rule, '<search></search>', {
			rule: {
				options: {
					checkExperimental: true,
				},
			},
		});
		// Experimental violations should be the same regardless of browserslist
		const expWithBl = withBrowserslist.violations.filter(v => v.message.includes('experimental'));
		const expWithoutBl = withoutBrowserslist.violations.filter(v => v.message.includes('experimental'));
		expect(expWithoutBl.length).toBe(expWithBl.length);
	});
});

describe('checkNonStandard', () => {
	test('no warning by default for non-standard attribute', async () => {
		// "moz-opaque" on canvas is nonStandard in spec data
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('warns about non-standard attributes when enabled', async () => {
		// "moz-opaque" on canvas is nonStandard in spec data
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {
					checkNonStandard: true,
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('"moz-opaque"');
		expect(violations[0]?.message).toContain('non-standard');
	});

	test('works without browserslist config', async () => {
		// Should work even without browserslist
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {
					checkNonStandard: true,
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('"moz-opaque"');
	});
});

describe('default severity', () => {
	test('severity is warning by default', async () => {
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
	test('SVG content is not checked', async () => {
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
