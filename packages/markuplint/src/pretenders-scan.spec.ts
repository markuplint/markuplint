import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Full pipeline integration test for the `pretenders.scan` feature.
 *
 * Exercises the complete flow:
 *   Config with `pretenders.scan` → glob resolution → component scanning
 *   → MLDOM pretender mapping → rule-based validation
 *
 * Uses existing fixtures from `@markuplint/pretenders` to avoid duplication.
 */

const templateFixturesDir = path.resolve(
	import.meta.dirname,
	'..',
	'..',
	'@markuplint',
	'pretenders',
	'test',
	'fixtures',
	'template',
);

const jsxFixturesDir = path.resolve(import.meta.dirname, '..', '..', '@markuplint', 'pretenders', 'test', 'fixtures');

describe('pretenders.scan integration', () => {
	describe('template scanner (Vue)', () => {
		test('scanned component is validated as its pretended element', async () => {
			// SimpleButton.vue pretends to be <button> (root element is <button>)
			// Using it in HTML should make it pass rules as if it were <button>
			const { violations } = await mlTest('<div><SimpleButton></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			// <button> is allowed inside <div>, so no violations expected
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});

		test('slots: null component still follows pretended element content model', async () => {
			// SimpleButton.vue has no <slot>, so slots is null.
			// It pretends to be <button>, which allows phrasing content per HTML spec.
			// Even with slots=null, the pretended element's content model applies,
			// so phrasing content inside it is valid.
			const { violations } = await mlTest('<div><SimpleButton><span>child</span></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			// <button> allows phrasing content, so <span> inside is valid
			expect(permittedViolations).toStrictEqual([]);
		});

		test('slots: true component accepts child content', async () => {
			// WithSlot.vue has a <slot>, so slots is true (child-accepting).
			// Putting child content inside it is valid.
			const { violations } = await mlTest('<div><WithSlot><p>content</p></WithSlot></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'WithSlot.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			expect(permittedViolations).toStrictEqual([]);
		});
	});

	describe('JSX scanner', () => {
		test('scanned JSX component is validated as its pretended element', async () => {
			// 002.tsx: FooBar pretends to be <div>
			const { violations } = await mlTest('<body><FooBar></FooBar></body>', {
				pretenders: {
					scan: [{ files: path.join(jsxFixturesDir, '002.tsx') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			// <div> is valid flow content inside <body>, so no violations expected
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			expect(permittedViolations).toStrictEqual([]);
		});

		test('slots: true JSX component accepts child content', async () => {
			// 005.tsx: WithChildren accepts children (slots: true, pretends to be <div>)
			const { violations } = await mlTest('<div><WithChildren><p>content</p></WithChildren></div>', {
				pretenders: {
					scan: [{ files: path.join(jsxFixturesDir, '005.tsx') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			expect(permittedViolations).toStrictEqual([]);
		});

		test('slots: null JSX component rejects child content', async () => {
			// 005.tsx: VoidComponent has no children (slots: null, pretends to be <img>)
			// Putting child content inside it should trigger a violation.
			const { violations } = await mlTest('<div><VoidComponent><span>child</span></VoidComponent></div>', {
				pretenders: {
					scan: [{ files: path.join(jsxFixturesDir, '005.tsx') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			expect(permittedViolations.length).toBeGreaterThan(0);
		});
	});

	describe('mixed scanners', () => {
		test('scanning both Vue and JSX files together', async () => {
			// Scan both template and JSX fixtures simultaneously
			const { violations } = await mlTest('<div><SimpleButton></SimpleButton><FooBar></FooBar></div>', {
				pretenders: {
					scan: [
						{ files: path.join(templateFixturesDir, 'SimpleButton.vue') },
						{ files: path.join(jsxFixturesDir, '002.tsx') },
					],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			const permittedViolations = violations.filter(v => v.ruleId === 'permitted-contents');
			expect(permittedViolations).toStrictEqual([]);
		});
	});

	describe('ignoreComponentNames', () => {
		test('ignored component is not recognized as a pretender', async () => {
			// When SimpleButton is ignored, it is NOT mapped to <button>.
			// As an unknown custom element, permitted-contents flags it
			// because "simplebutton" is not in the HTML spec.
			const { violations: ignoredViolations } = await mlTest('<div><SimpleButton></SimpleButton></div>', {
				pretenders: {
					scan: [
						{
							files: path.join(templateFixturesDir, 'SimpleButton.vue'),
							ignoreComponentNames: ['SimpleButton'],
						},
					],
				},
				rules: {
					'permitted-contents': true,
				},
			});

			// When NOT ignored, the component IS recognized as <button>,
			// which is valid flow content inside <div>.
			const { violations: recognizedViolations } = await mlTest('<div><SimpleButton></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});

			// Ignored: unknown element triggers permitted-contents violation
			const ignoredPermitted = ignoredViolations.filter(v => v.ruleId === 'permitted-contents');
			expect(ignoredPermitted.length).toBeGreaterThan(0);
			expect(ignoredPermitted[0]!.message).toContain('simplebutton');

			// Recognized: <button> is valid inside <div>, no violations
			const recognizedPermitted = recognizedViolations.filter(v => v.ruleId === 'permitted-contents');
			expect(recognizedPermitted).toStrictEqual([]);
		});
	});
});
