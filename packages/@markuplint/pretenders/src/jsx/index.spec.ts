import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { normalizePath } from '../import-resolver/resolve-module-file.js';

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
							value: { dynamic: true },
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
				as: {
					element: 'CReturns',
					slots: null,
					contents: [{ element: 'span' }],
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:15:6'),
			},
			{
				selector: 'NodeD',
				// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
				// as: 'DReturns', // pre-#4082 baseline
				as: { element: 'DReturns', slots: null },
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:25:6'),
			},
			{
				selector: 'NodeE',
				// as: 'EReturns', // pre-#4082 baseline
				as: { element: 'EReturns', slots: null },
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:27:6'),
			},
			{
				selector: 'NodeF',
				// as: 'FReturns', // pre-#4082 baseline
				as: { element: 'FReturns', slots: null },
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:33:9'),
			},
			{
				selector: 'NodeG',
				// as: 'GReturns', // pre-#4082 baseline
				as: { element: 'GReturns', slots: null },
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:38:16'),
			},
			{
				selector: 'NodeH',
				// as: 'HReturns', // pre-#4082 baseline
				as: { element: 'HReturns', slots: null },
				filePath: _('packages/@markuplint/pretenders/test/fixtures/001.tsx:42:24'),
			},
			{
				selector: 'NodeI',
				// as: 'IReturns', // pre-#4082 baseline
				as: { element: 'IReturns', slots: null },
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
					attrs: [{ name: 'data-ref', value: { dynamic: true } }],
					slots: null,
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:32:6'),
			},
			{
				selector: 'NestedChildren',
				as: {
					element: 'div',
					slots: [{ element: 'main' }],
				},
				filePath: _('packages/@markuplint/pretenders/test/fixtures/005.tsx:22:6'),
			},
			{
				selector: 'StaticContent',
				// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
				// as: 'p', // pre-#4082 baseline
				as: { element: 'p', slots: null },
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
					// `props.src` is a prop of the component passed as it is.
					// attrs: [{ name: 'src', value: { dynamic: true } }], // without the prop resolved
					attrs: [{ name: 'src', value: { fromAttr: 'src', omitIfMissing: true } }],
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
			// `A` renders `<Item>` without spreading its own props, so the
			// attributes written at the usage site of `A` do not reach the `button`. `inheritAttrs` of
			// `Item` is no longer carried over to `A`.
			expect(a).toMatchObject({
				selector: 'A',
				// BREAKING CHANGE (#4082): the component renders `<Item>` without its own children, so `slots: null`.
				// as: { element: 'button', slots: true, inheritAttrs: true }, // pre-#4082 baseline
				as: { element: 'button', slots: null },
				_via: ['Item'],
			});
			expect(a?.as).not.toHaveProperty('inheritAttrs');
			expect(a?.filePath).toMatch(/^a\.tsx:/);
			expect(b).toMatchObject({
				selector: 'B',
				as: { element: 'ul', slots: null, contents: [{ dynamic: true }] },
			});
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
			// See the `A` case above.
			expect(c).toMatchObject({
				selector: 'C',
				// BREAKING CHANGE (#4082): the component renders `<Item>` without its own children, so `slots: null`.
				// as: { element: 'button', slots: true, inheritAttrs: true }, // pre-#4082 baseline
				as: { element: 'button', slots: null },
				_via: ['Item'],
			});
			expect(c?.as).not.toHaveProperty('inheritAttrs');
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
			// See the `A` case above.
			expect(e).toMatchObject({
				selector: 'E',
				// BREAKING CHANGE (#4082): the component renders `<Item>` without its own children, so `slots: null`.
				// as: { element: 'span', slots: true, inheritAttrs: true }, // pre-#4082 baseline
				as: { element: 'span', slots: null },
				_via: ['Item'],
			});
			expect(e?.as).not.toHaveProperty('inheritAttrs');
		});
	});

	describe('sources (in-memory content override)', () => {
		test('an in-memory override is scanned instead of the file on disk', async () => {
			const filePath = path.resolve(testDir, '001.tsx');
			const sources = new Map([[normalizePath(filePath), 'export const InMemoryOnly = () => <span />;']]);

			const result = await jsxScanner([filePath], { sources });

			// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
			// expect(result).toStrictEqual([expect.objectContaining({ selector: 'InMemoryOnly', as: 'span' })]); // pre-#4082 baseline
			expect(result).toStrictEqual([
				expect.objectContaining({ selector: 'InMemoryOnly', as: { element: 'span', slots: null } }),
			]);
		});

		test('files without an override fall back to reading from disk', async () => {
			const overriddenPath = path.resolve(testDir, '002.tsx');
			const diskPath = path.resolve(testDir, '001.tsx');
			const sources = new Map([[normalizePath(overriddenPath), 'export const Overridden = () => <span />;']]);

			const result = await jsxScanner([overriddenPath, diskPath], { sources });

			// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
			// expect(result.find(p => p.selector === 'Overridden')).toMatchObject({ as: 'span' }); // pre-#4082 baseline
			expect(result.find(p => p.selector === 'Overridden')).toMatchObject({
				as: { element: 'span', slots: null },
			});
			expect(result.find(p => p.selector === 'NodeA')).toBeDefined();
		});
	});

	describe('a component that renders no children (issue #4082)', () => {
		test('an element without attributes keeps `slots: null` instead of collapsing to its name', async () => {
			const filePath = path.resolve(testDir, '001.tsx');
			const sources = new Map([[normalizePath(filePath), 'export const Bare = () => <span></span>;']]);

			const result = await jsxScanner([filePath], { sources });

			expect(result).toStrictEqual([
				expect.objectContaining({ selector: 'Bare', as: { element: 'span', slots: null } }),
			]);
		});

		test('a component rendering another component without children does not take the children of that component', async () => {
			const filePath = path.resolve(testDir, '001.tsx');
			const sources = new Map([
				[
					normalizePath(filePath),
					[
						'export const Labelled = ({ children }) => <span>{children}</span>;',
						'export const Outer = () => <Labelled />;',
					].join('\n'),
				],
			]);

			const result = await jsxScanner([filePath], { sources });

			expect(result.find(p => p.selector === 'Outer')).toMatchObject({ as: { element: 'span', slots: null } });
		});
	});
});
