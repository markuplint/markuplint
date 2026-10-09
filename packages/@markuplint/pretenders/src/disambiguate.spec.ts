import type { Pretender } from '@markuplint/ml-config';

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { clearExportTableCache } from './dependency-mapper.js';

import { disambiguatePretenders } from './disambiguate.js';
import { normalizePath } from './import-resolver/resolve-module-file.js';

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

	describe('through a barrel file', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(path.join(os.tmpdir(), 'disambiguate-barrel-'));
			await writeFile(path.join(tmpDir, 'a.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(tmpDir, 'b.tsx'), 'export const Item = () => <li />;');
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
			clearExportTableCache();
		});

		const candidates = (dir: string): Pretender[] => [
			{ selector: 'Item', as: 'li', filePath: `${path.join(dir, 'b.tsx')}:1:14` },
			{ selector: 'Item', as: 'button', filePath: `${path.join(dir, 'a.tsx')}:1:14` },
		];
		const target = (dir: string) => ({
			filePath: path.join(dir, 'page.tsx'),
			sourceCode: "import { Item } from './barrel';\nexport const Page = () => <Item />;",
		});

		test('a named re-export resolves to the declaring file', async () => {
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export { Item } from './a';");

			const result = await disambiguatePretenders(candidates(tmpDir), target(tmpDir));

			expect(result.map(p => p.as)).toStrictEqual(['button']);
		});

		test('a star re-export resolves to the declaring file', async () => {
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './a';");

			const result = await disambiguatePretenders(candidates(tmpDir), target(tmpDir));

			expect(result.map(p => p.as)).toStrictEqual(['button']);
		});

		test('a re-exported template component resolves to its file', async () => {
			await writeFile(path.join(tmpDir, 'Item.vue'), '<template><em /></template>');
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export { default as Item } from './Item.vue';");
			const pretenders: Pretender[] = [
				...candidates(tmpDir),
				{ selector: 'Item', as: 'em', filePath: path.join(tmpDir, 'Item.vue') },
			];

			const result = await disambiguatePretenders(pretenders, target(tmpDir));

			expect(result.map(p => p.as)).toStrictEqual(['em']);
		});

		test('leaves the array unchanged when two star re-exports supply the name', async () => {
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './a';\nexport * from './b';");
			const pretenders = candidates(tmpDir);

			const result = await disambiguatePretenders(pretenders, target(tmpDir));

			expect(result).toBe(pretenders);
		});

		test('records the files read to follow the re-exports', async () => {
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export { Item } from './a';");
			const dependencies = new Set<string>();

			await disambiguatePretenders(candidates(tmpDir), { ...target(tmpDir), dependencies });

			expect(dependencies).toContain(normalizePath(path.join(tmpDir, 'barrel.ts')));
		});

		test('does not record the lint target even when a re-export chain passes through it', async () => {
			const { filePath, sourceCode } = target(tmpDir);
			await writeFile(filePath, sourceCode);
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './page';\nexport * from './a';");
			const dependencies = new Set<string>();

			const result = await disambiguatePretenders(candidates(tmpDir), { filePath, sourceCode, dependencies });

			expect(result.map(p => p.as)).toStrictEqual(['button']);
			expect(dependencies).not.toContain(normalizePath(filePath));
		});
	});
});
