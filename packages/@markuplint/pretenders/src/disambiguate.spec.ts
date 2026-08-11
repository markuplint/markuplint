import type { Pretender } from '@markuplint/ml-config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { disambiguatePretenders } from './disambiguate.js';

const collisionDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', 'collision');
const moduleResolutionDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', 'module-resolution');
const abs = (name: string) => path.resolve(collisionDir, name);

describe('disambiguatePretenders', () => {
	test('prefers the pretender declared in the lint target file itself', async () => {
		const filePath = abs('a.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const pretenders: Pretender[] = [
			{
				selector: 'Item',
				as: { element: 'button', slots: true, inheritAttrs: true },
				filePath: `${abs('a.tsx')}:2:14`,
			},
			{
				selector: 'Item',
				as: { element: 'li', slots: true, inheritAttrs: true },
				filePath: `${abs('b.tsx')}:2:14`,
			},
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toHaveLength(1);
		expect(result[0]!.as).toStrictEqual({ element: 'button', slots: true, inheritAttrs: true });
	});

	test('resolves via a named import to the file it actually imports', async () => {
		const filePath = abs('c.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const pretenders: Pretender[] = [
			{
				selector: 'Item',
				as: { element: 'button', slots: true, inheritAttrs: true },
				filePath: `${abs('a.tsx')}:2:14`,
			},
			{
				selector: 'Item',
				as: { element: 'li', slots: true, inheritAttrs: true },
				filePath: `${abs('b.tsx')}:2:14`,
			},
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toHaveLength(1);
		expect(result[0]!.as).toStrictEqual({ element: 'button', slots: true, inheritAttrs: true });
	});

	test('resolves via a default import to the file it actually imports', async () => {
		const filePath = abs('e.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const pretenders: Pretender[] = [
			{
				selector: 'Item',
				as: { element: 'span', slots: true, inheritAttrs: true },
				filePath: `${abs('d.tsx')}:3:6`,
			},
			{ selector: 'Item', as: { element: 'div', slots: null }, filePath: `${abs('f.tsx')}:1:14` },
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toHaveLength(1);
		expect(result[0]!.as).toStrictEqual({ element: 'span', slots: true, inheritAttrs: true });
	});

	test('resolves via a tsconfig `paths` alias', async () => {
		const withAliasDir = path.resolve(moduleResolutionDir, 'with-alias');
		const filePath = path.resolve(withAliasDir, 'src', 'pages', 'Page.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const correctButton = path.resolve(withAliasDir, 'src', 'components', 'Button.tsx');
		const decoyButton = path.resolve(withAliasDir, 'src', 'pages', 'DecoyButton.tsx');
		const pretenders: Pretender[] = [
			{ selector: 'Button', as: 'button', filePath: `${correctButton}:1:14` },
			{ selector: 'Button', as: 'div', filePath: `${decoyButton}:1:1` },
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toHaveLength(1);
		expect(result[0]!.as).toBe('button');
	});

	test('leaves the array unchanged when the reference cannot be resolved (full fallback)', async () => {
		const filePath = abs('a.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const pretenders: Pretender[] = [
			{ selector: 'Widget', as: 'div', filePath: `${abs('b.tsx')}:1:1` },
			{ selector: 'Widget', as: 'span', filePath: `${abs('c.tsx')}:1:1` },
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toStrictEqual(pretenders);
	});

	test('leaves entries without a filePath untouched, even amid a resolved collision', async () => {
		const filePath = abs('c.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const handWritten: Pretender = { selector: 'Item', as: 'i' };
		const pretenders: Pretender[] = [
			handWritten,
			{
				selector: 'Item',
				as: { element: 'button', slots: true, inheritAttrs: true },
				filePath: `${abs('a.tsx')}:2:14`,
			},
			{
				selector: 'Item',
				as: { element: 'li', slots: true, inheritAttrs: true },
				filePath: `${abs('b.tsx')}:2:14`,
			},
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toContainEqual(handWritten);
		expect(result).toHaveLength(2);
	});

	test('matches filePath entries regardless of path separator style (Windows-style paths)', async () => {
		const filePath = abs('a.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const winStylePath = abs('a.tsx').split(path.sep).join('\\');
		const pretenders: Pretender[] = [
			{
				selector: 'Item',
				as: { element: 'button', slots: true, inheritAttrs: true },
				filePath: `${winStylePath}:2:14`,
			},
			{
				selector: 'Item',
				as: { element: 'li', slots: true, inheritAttrs: true },
				filePath: `${abs('b.tsx')}:2:14`,
			},
		];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toHaveLength(1);
		expect(result[0]!.as).toStrictEqual({ element: 'button', slots: true, inheritAttrs: true });
	});

	test('does not touch a selector that only has a single candidate', async () => {
		const filePath = abs('a.tsx');
		const sourceCode = await readFile(filePath, 'utf8');
		const pretenders: Pretender[] = [{ selector: 'Solo', as: 'div', filePath: `${abs('a.tsx')}:9:9` }];

		const result = await disambiguatePretenders(pretenders, { filePath, sourceCode });
		expect(result).toStrictEqual(pretenders);
	});
});
