import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('browser support (BCD-based)', () => {
	test('[no-unsupported-features-invalid-001] element not supported in IE 11', async () => {
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

	test('[no-unsupported-features-valid-001] common element supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>', {
			rule: {
				options: {
					browserslist: 'ie 11',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-features-invalid-002] attribute not supported in old browsers', async () => {
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

	test('[no-unsupported-features-valid-002] common attribute supported everywhere', async () => {
		const { violations } = await mlRuleTest(rule, '<input type="text">', {
			rule: {
				options: {
					browserslist: 'chrome 130',
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-features-invalid-003] multiple browsers - only unsupported ones reported', async () => {
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
	test('[no-unsupported-features-invalid-004] element supported but attribute unsupported', async () => {
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
	test('[no-unsupported-features-valid-003] no error without browserslist config', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-features-valid-004] no error with empty options', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog></dialog>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('ignoreFeatures', () => {
	test('[no-unsupported-features-valid-005] ignore element by name', async () => {
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

	test('[no-unsupported-features-valid-006] ignore attribute by pattern', async () => {
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
	test('[no-unsupported-features-invalid-005] no warning by default for experimental attribute', async () => {
		// "credentialless" on <iframe> is experimental in spec data
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: {
				options: {},
			},
		});
		const experimentalViolation = violations.find(v => v.message.includes('experimental'));
		expect(experimentalViolation).toBeUndefined();
	});

	test('[no-unsupported-features-invalid-006] warns about experimental attributes when enabled', async () => {
		// "credentialless" on <iframe> is experimental in spec data
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: {
				options: {
					checkExperimental: true,
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('experimental');
		expect(violations[0]?.message).toContain('"credentialless"');
	});

	test('[no-unsupported-features-invalid-007] works without browserslist config', async () => {
		// checkExperimental should work independently of browserslist
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: {
				options: {
					checkExperimental: true,
				},
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('experimental');
	});
});

describe('checkNonStandard', () => {
	test('[no-unsupported-features-valid-007] no warning by default for non-standard attribute', async () => {
		// "moz-opaque" on canvas is nonStandard in spec data
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {},
			},
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-unsupported-features-invalid-008] warns about non-standard attributes when enabled', async () => {
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

	test('[no-unsupported-features-invalid-009] works without browserslist config', async () => {
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
	test('[no-unsupported-features-invalid-010] severity is warning by default', async () => {
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
	test('[no-unsupported-features-invalid-011] SVG content is not checked', async () => {
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
	test('[no-unsupported-features-issue-3740-001] JSX component pretendered to old HTML reports against browserslist', async () => {
		const { violations } = await mlRuleTest(rule, '<Dialog>x</Dialog>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [{ selector: 'Dialog', as: 'dialog' }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		const dialogViolation = violations.find(v => v.message.includes('"dialog"'));
		expect(dialogViolation).toBeDefined();
	});

	test('[no-unsupported-features-issue-3740-002] JSX with object inheritAttrs pretender reports', async () => {
		const { violations } = await mlRuleTest(rule, '<Dialog>x</Dialog>', {
			parser: { '.*': '@markuplint/jsx-parser' },
			pretenders: [{ selector: 'Dialog', as: { element: 'dialog', inheritAttrs: true } }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		const dialogViolation = violations.find(v => v.message.includes('"dialog"'));
		expect(dialogViolation).toBeDefined();
	});

	test('[no-unsupported-features-issue-3740-003] HTML→HTML pretender ignored: original element checked', async () => {
		// `pretenders` config is now no-op for HTML element selectors, so the
		// original `<dialog>` is still evaluated against the browserslist target.
		const { violations } = await mlRuleTest(rule, '<dialog>x</dialog>', {
			pretenders: [{ selector: 'dialog', as: 'div' }],
			rule: { options: { browserslist: 'ie 11' } },
		});
		const dialogViolation = violations.find(v => v.message.includes('"dialog"'));
		expect(dialogViolation).toBeDefined();
	});

	test('[no-unsupported-features-issue-3740-004] web-component pretendered to experimental HTML reports', async () => {
		const { violations } = await mlRuleTest(rule, '<x-iframe credentialless></x-iframe>', {
			pretenders: [{ selector: 'x-iframe', as: { element: 'iframe', inheritAttrs: true } }],
			rule: { options: { checkExperimental: true } },
		});
		const experimentalViolation = violations.find(
			v => v.message.includes('experimental') && v.message.includes('"credentialless"'),
		);
		expect(experimentalViolation).toBeDefined();
	});
});
