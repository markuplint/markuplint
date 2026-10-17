import type { Pretender } from '@markuplint/ml-config';

import path from 'node:path';

import { beforeAll, describe, expect, test } from 'vitest';

import { jsxScanner } from './index.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'issue-4289');
const fixture = (file: string) => path.resolve(fixtureDir, file);

/**
 * A default export without a name of its own is named after its file, as a Vue/Svelte/Astro
 * component is.
 */
describe('a component that is an anonymous default export', () => {
	let pretenders: Pretender[];
	const of = (selector: string) => pretenders.filter(p => p.selector === selector);

	beforeAll(async () => {
		pretenders = await jsxScanner(
			[
				fixture('Page.tsx'),
				fixture('kebab-styled.tsx'),
				fixture('Opted.tsx'),
				fixture('OptedFn.tsx'),
				fixture('MemoNamed.tsx'),
				fixture('other/OptedNamed.tsx'),
				fixture('InlineLayout.tsx'),
				fixture('AsyncAnon.tsx'),
			],
			{ cwd: fixtureDir },
		);
	});

	test('an arrow function', () => {
		expect(of('AnonArrow')).toStrictEqual([
			{
				selector: 'AnonArrow',
				as: { element: 'img', attrs: [{ name: 'src', value: 'x.png' }], slots: null },
				filePath: 'AnonArrow.tsx:1:1',
				localName: 'default',
			},
		]);
	});

	test('a function declaration without a name', () => {
		expect(of('AnonFn')).toStrictEqual([
			{
				selector: 'AnonFn',
				as: { element: 'img', attrs: [{ name: 'src', value: 'x.png' }], slots: null },
				filePath: 'AnonFn.tsx:1:1',
				localName: 'default',
			},
		]);
	});

	test('an arrow function in a wrapper call', () => {
		expect(of('MemoAnon')).toStrictEqual([
			{
				selector: 'MemoAnon',
				as: { element: 'img', attrs: [{ name: 'src', value: 'x.png' }], slots: null },
				filePath: 'MemoAnon.tsx:3:1',
				localName: 'default',
			},
		]);
	});

	test('an index file is named after its directory', () => {
		expect(of('Card')).toStrictEqual([
			{
				selector: 'Card',
				as: { element: 'section', slots: null },
				filePath: 'Card/index.tsx:1:1',
				localName: 'default',
			},
		]);
	});

	test('a kebab-case file name becomes PascalCase', () => {
		expect(of('KebabStyled')).toStrictEqual([
			{
				selector: 'KebabStyled',
				as: { element: 'button', slots: true, inheritAttrs: true },
				filePath: 'kebab-styled.tsx:3:1',
				localName: 'default',
			},
		]);
	});

	test('an async arrow function', () => {
		expect(of('AsyncAnon')).toMatchObject([{ as: { element: 'img' }, localName: 'default' }]);
	});

	test('a file name that is no component name gives none', async () => {
		const result = await jsxScanner([fixture('[id].tsx'), fixture('404.tsx'), fixture('AnonArrow.tsx')], {
			cwd: fixtureDir,
		});
		expect(result.map(p => p.selector)).toStrictEqual(['AnonArrow']);
	});

	test('`ignoreComponentNames` takes the name given after the file', async () => {
		const result = await jsxScanner([fixture('AnonArrow.tsx')], {
			cwd: fixtureDir,
			ignoreComponentNames: ['AnonArrow'],
		});
		expect(result).toStrictEqual([]);
	});

	test('a default export that wraps a named component adds none of its own', () => {
		expect(of('MemoNamed')).toStrictEqual([
			{
				selector: 'MemoNamed',
				as: { element: 'img', attrs: [{ name: 'src', value: 'x.png' }], slots: null },
				filePath: 'MemoNamed.tsx:3:6',
				localName: 'MemoNamed',
			},
		]);
		expect(of('WithStyles')).toMatchObject([{ localName: 'WithStyles', as: { element: 'li' } }]);
		expect(of('WithLayout')).toMatchObject([{ localName: 'WithLayout', as: { element: 'article' } }]);
	});

	test('a function in the configuration of a wrapper is not taken for the component', () => {
		expect(of('InlineLayout')).toMatchObject([{ localName: 'InlineLayout', as: { element: 'article' } }]);
	});

	test('`@pretends null` opts it out', () => {
		expect(of('Opted')).toStrictEqual([]);
		expect(of('OptedFn')).toStrictEqual([]);
	});

	test('a declaration of the same name in the same file stays a separate component', () => {
		expect(of('Button')).toStrictEqual([
			{
				selector: 'Button',
				as: { element: 'div', slots: null },
				filePath: 'Button.tsx:1:13',
				localName: 'Button',
			},
			{
				selector: 'Button',
				as: { element: 'img', attrs: [{ name: 'src', value: 'x.png' }], slots: null },
				filePath: 'Button.tsx:3:1',
				localName: 'default',
			},
		]);
	});

	test.each([
		['UsesArrow', 'img'],
		['UsesFn', 'img'],
		['UsesMemo', 'img'],
		['UsesCard', 'section'],
		['UsesDefaultOfButton', 'img'],
		['UsesNamedButton', 'div'],
		['UsesBarrel', 'li'],
		['UsesWithStyles', 'li'],
		['UsesWithLayout', 'article'],
		['UsesThemed', 'img'],
		['UsesList', 'ul'],
	])('an import of it under any name resolves: %s renders <%s>', (selector, element) => {
		expect(of(selector)).toMatchObject([{ as: { element } }]);
	});

	test('a name not imported resolves to a component declared under it before a default export named after its file', async () => {
		// `Card/index.tsx` is scanned first, so a plain first-registered index would take it.
		const result = await jsxScanner(
			[fixture('Card/index.tsx'), fixture('legacy/Card.tsx'), fixture('NoImport.tsx')],
			{
				cwd: fixtureDir,
			},
		);
		expect(result.find(p => p.selector === 'UsesCardByName')).toMatchObject({ as: { element: 'div' } });
	});

	test('an import of a declaration without a component resolves to no other component of the name', () => {
		// The default export of its file, and a named component of another file.
		expect(of('OptedNamed').map(p => p.as)).toMatchObject([{ element: 'img' }, { element: 'section' }]);
		expect(of('UsesOptedNamed')).toMatchObject([{ as: { element: 'OptedNamed' } }]);
	});

	test('a default export wrapping a component without one resolves to none, not to a component it takes as an argument', () => {
		expect(of('UsesLayoutOpted')).toMatchObject([{ as: { element: 'LO' } }]);
	});
});
