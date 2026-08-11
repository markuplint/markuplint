import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { jsxScanner } from './index.js';

// Scanners always emit `/`-delimited filePath now (for stable, cross-platform
// JSON output), so this is a no-op — kept so call sites don't need touching.
const _ = (filePath: string) => filePath;
const testDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures');

describe('jsxScanner', () => {
	test('001.tsx', async () => {
		expect(await jsxScanner([path.resolve(testDir, '001.tsx')])).toStrictEqual([
			{
				selector: 'NodeA',
				as: {
					element: 'div',
					attrs: [
						{
							name: 'class',
							value: 'AReturned',
						},
						{
							name: 'aria-xxx',
						},
						{
							name: 'aria-yyy',
						},
					],
					slots: null,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:1:6'),
			},
			{
				selector: 'NodeB',
				as: {
					element: 'BReturns',
					inheritAttrs: true,
					slots: null,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:11:6'),
			},
			{
				selector: 'NodeC',
				as: 'CReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:15:6'),
			},
			{
				selector: 'NodeD',
				as: 'DReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:25:6'),
			},
			{
				selector: 'NodeE',
				as: 'EReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:27:6'),
			},
			{
				selector: 'NodeF',
				as: 'FReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:33:9'),
			},
			{
				selector: 'NodeG',
				as: 'GReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:38:16'),
			},
			{
				selector: 'NodeH',
				as: 'HReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:42:24'),
			},
			{
				selector: 'NodeI',
				as: 'IReturns',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:46:9'),
			},
		]);
	});

	test('002', async () => {
		expect(
			await jsxScanner([path.resolve(testDir, '002.tsx')], {
				ignoreComponentNames: ['FooBar'],
			}),
		).toStrictEqual([]);
	});

	test('003', async () => {
		expect(await jsxScanner([path.resolve(testDir, '003.tsx')])).toStrictEqual([
			{
				selector: 'Button',
				as: {
					element: 'button',
					slots: true,
					inheritAttrs: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/003.tsx:2:6'),
			},
			{
				selector: 'MyComponent2',
				_via: ['Button'],
				as: {
					element: 'button',
					slots: true,
					inheritAttrs: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/003.tsx:2:6'),
			},
		]);

		expect(
			await jsxScanner([path.resolve(testDir, '003.tsx')], {
				taggedStylingComponent: [/^ORIGINAL_IDENTIFIER\.(?<tagName>[a-z][\da-z]*)$/],
			}),
		).toStrictEqual([
			{
				selector: 'MyComponent',
				as: {
					element: 'div',
					slots: true,
					inheritAttrs: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/003.tsx:7:6'),
			},
		]);
	});

	test('004', async () => {
		expect(
			await jsxScanner([path.resolve(testDir, '004.tsx')], {
				extendingWrapper: [
					'secondary',
					{
						identifier: '/namespace\\.[a-z]+/i',
						numberOfArgument: 2,
					},
				],
			}),
		).toStrictEqual([
			{
				selector: 'AnyPrimaryButton',
				as: {
					element: 'Button',
					slots: true,
					inheritAttrs: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/004.tsx:2:6'),
			},
			{
				selector: 'SecondaryButton',
				as: {
					element: 'Button',
					slots: true,
					inheritAttrs: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/004.tsx:1:6'),
			},
		]);
	});

	test('005 — children slot detection', async () => {
		expect(await jsxScanner([path.resolve(testDir, '005.tsx')])).toStrictEqual([
			{
				selector: 'AttrOnlyChildren',
				as: {
					element: 'div',
					attrs: [{ name: 'data-ref' }],
					slots: null,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:32:6'),
			},
			{
				selector: 'NestedChildren',
				as: {
					element: 'div',
					slots: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:22:6'),
			},
			{
				selector: 'StaticContent',
				as: 'p',
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:17:6'),
			},
			{
				selector: 'TernaryChildren',
				as: {
					element: 'div',
					slots: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:37:6'),
			},
			{
				selector: 'VoidComponent',
				as: {
					element: 'img',
					attrs: [{ name: 'src' }],
					slots: null,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:12:6'),
			},
			{
				selector: 'WithChildren',
				as: {
					element: 'div',
					attrs: [{ name: 'className', value: 'wrapper' }],
					slots: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:2:6'),
			},
			{
				selector: 'WithPropsChildren',
				as: {
					element: 'section',
					slots: true,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:7:6'),
			},
		]);
	});

	describe('name collision across files (issue #3951)', () => {
		const collisionDir = path.resolve(testDir, 'collision');

		test('components with the same name in different files resolve independently', async () => {
			const result = await jsxScanner(
				[path.resolve(collisionDir, 'a.tsx'), path.resolve(collisionDir, 'b.tsx')],
				{ cwd: collisionDir },
			);

			const a = result.find(p => p.selector === 'A');
			// B's own render root is <ul>, not <Item> (Item is nested inside it) — B itself
			// doesn't chain to Item. What matters here is that the two `Item` pretenders
			// below stay independent instead of one silently overwriting the other.
			const b = result.find(p => p.selector === 'B');
			const items = result.filter(p => p.selector === 'Item');
			const itemFromA = items.find(p => p.filePath?.startsWith('a.tsx:'));
			const itemFromB = items.find(p => p.filePath?.startsWith('b.tsx:'));

			expect(items).toHaveLength(2);
			expect(itemFromA).toMatchObject({
				selector: 'Item',
				as: { element: 'button', slots: true, inheritAttrs: true },
			});
			expect(itemFromB).toMatchObject({
				selector: 'Item',
				as: { element: 'li', slots: true, inheritAttrs: true },
			});
			expect(a).toMatchObject({
				selector: 'A',
				as: { element: 'button', slots: true, inheritAttrs: true },
				_via: ['Item'],
			});
			expect(a?.filePath).toMatch(/^a\.tsx:/);
			expect(b).toMatchObject({ selector: 'B', as: 'ul' });
		});

		test('a named import resolves to the actual declaration file, not the first-registered same-named one', async () => {
			// b.tsx is listed first (and a.tsx is only pulled in transitively via c.tsx's
			// import) so that, absent import-based resolution, the plain name index would
			// register b.tsx's `Item` (li) first and resolve c.tsx's reference to it.
			const result = await jsxScanner(
				[path.resolve(collisionDir, 'b.tsx'), path.resolve(collisionDir, 'c.tsx')],
				{
					cwd: collisionDir,
				},
			);
			const c = result.find(p => p.selector === 'C');
			expect(c).toMatchObject({
				selector: 'C',
				as: { element: 'button', slots: true, inheritAttrs: true },
				_via: ['Item'],
			});
			expect(c?.filePath).toMatch(/^a\.tsx:/);
		});

		test('a default import resolves via the target file export table, not the first-registered same-named one', async () => {
			// f.tsx is listed first (and d.tsx is only pulled in transitively via e.tsx's
			// import) so that, absent import-based resolution, the plain name index would
			// register f.tsx's `Item` (div) first and resolve e.tsx's reference to it.
			const result = await jsxScanner(
				[path.resolve(collisionDir, 'f.tsx'), path.resolve(collisionDir, 'e.tsx')],
				{
					cwd: collisionDir,
				},
			);
			const e = result.find(p => p.selector === 'E');
			expect(e).toMatchObject({
				selector: 'E',
				as: { element: 'span', slots: true, inheritAttrs: true },
				_via: ['Item'],
			});
		});
	});
});
