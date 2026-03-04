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
 * @experimental `pretenders.scan` is experimental. These tests guard the
 * cross-package pipeline while the feature retains that status. If the scan
 * API surface changes, update these tests accordingly.
 *
 * Exercises the complete flow:
 *   Config with `pretenders.scan` → glob resolution → component scanning
 *   → MLDOM pretender mapping → rule-based validation
 *
 * Packages involved: @markuplint/ml-config, @markuplint/file-resolver,
 * @markuplint/pretenders, @markuplint/ml-core
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
		test('Vue component scanned as button passes permitted-contents inside div', async () => {
			// SimpleButton.vue pretends to be <button> (root element is <button>)
			// <button> is valid flow content inside <div>, so no violations expected.
			// Without pretender mapping, "simplebutton" would be flagged as unknown.
			const { violations } = await mlTest('<div><SimpleButton></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});

		test('Vue component scanned as button triggers violation inside another button', async () => {
			// SimpleButton.vue pretends to be <button>.
			// <button> (interactive content) is forbidden inside another <button>.
			// This positively proves pretender mapping occurred — without it,
			// "simplebutton" would be flagged as unknown, not as interactive content.
			const { violations } = await mlTest('<button><SimpleButton></SimpleButton></button>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations).toStrictEqual([
				expect.objectContaining({
					ruleId: 'permitted-contents',
					severity: 'error',
					raw: '<SimpleButton>',
				}),
			]);
		});

		test('component pretending to be button allows phrasing content per HTML spec', async () => {
			// SimpleButton.vue has no <slot> (slots=null), but pretends to be <button>.
			// <button> allows phrasing content per HTML spec regardless of slots value.
			const { violations } = await mlTest('<div><SimpleButton><span>child</span></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});

		test('slots: true component accepts child content', async () => {
			// WithSlot.vue has a <slot>, so slots is true (child-accepting).
			// It pretends to be <div>, and <p> is valid flow content inside <div>.
			const { violations } = await mlTest('<div><WithSlot><p>content</p></WithSlot></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'WithSlot.vue') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});
	});

	describe('template scanner (Svelte)', () => {
		test('Svelte component scanned as button passes permitted-contents inside div', async () => {
			// SimpleButton.svelte pretends to be <button>, same as the Vue variant.
			const { violations } = await mlTest('<div><SimpleButton></SimpleButton></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'SimpleButton.svelte') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});

		test('Svelte component with slot accepts child content', async () => {
			// WithSlot.svelte has a <slot>, so slots is true.
			const { violations } = await mlTest('<div><WithSlot><p>content</p></WithSlot></div>', {
				pretenders: {
					scan: [{ files: path.join(templateFixturesDir, 'WithSlot.svelte') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});
	});

	describe('JSX scanner', () => {
		test('JSX component scanned as div passes permitted-contents inside body', async () => {
			// 002.tsx: FooBar pretends to be <div>
			const { violations } = await mlTest('<body><FooBar></FooBar></body>', {
				pretenders: {
					scan: [{ files: path.join(jsxFixturesDir, '002.tsx') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
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
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});

		test('JSX component pretending to be img (void element) triggers violation when given children', async () => {
			// 005.tsx: VoidComponent has no children (slots: null, pretends to be <img>)
			// <img> is a void element — children are forbidden.
			const { violations } = await mlTest('<div><VoidComponent><span>child</span></VoidComponent></div>', {
				pretenders: {
					scan: [{ files: path.join(jsxFixturesDir, '005.tsx') }],
				},
				rules: {
					'permitted-contents': true,
				},
			});
			expect(violations).toStrictEqual([
				expect.objectContaining({
					ruleId: 'permitted-contents',
					severity: 'error',
					raw: '<VoidComponent>',
				}),
			]);
		});
	});

	describe('mixed scanners', () => {
		test('scanning both Vue and JSX files together resolves all components', async () => {
			// Scan both template and JSX fixtures simultaneously.
			// Both SimpleButton (<button>) and FooBar (<div>) are valid inside <div>.
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
			expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});
	});

	describe('ignoreComponentNames', () => {
		test('ignored component is treated as unknown element, recognized component passes', async () => {
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
			expect(ignoredViolations).toStrictEqual([
				expect.objectContaining({
					ruleId: 'permitted-contents',
					severity: 'error',
					raw: '<SimpleButton>',
				}),
			]);

			// Recognized: <button> is valid inside <div>, no violations
			expect(recognizedViolations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
		});
	});
});
