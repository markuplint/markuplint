/**
 * The `dependencies` sink: the files whose content a pretender result depends
 * on, reported to the caller (watch mode) by `scan()`, `autoScan()`,
 * `disambiguatePretenders()`, `dependencyMapper()`, and `resolveModuleFile()`.
 * See #4065.
 */

import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { autoScan, clearAutoScanCache } from './auto-scan.js';
import { clearExportTableCache, dependencyMapper } from './dependency-mapper.js';
import { disambiguatePretenders } from './disambiguate.js';
import {
	clearModuleResolutionCaches,
	normalizePath,
	resolveModuleFile,
} from './import-resolver/resolve-module-file.js';
import { scan } from './scan.js';

describe('dependencies sink', () => {
	let tmpDir: string;

	// The sink holds `/`-delimited real paths, so the fixtures are built under a
	// real path too (macOS' tmpdir is a symlink; Windows' may be an 8.3 name).
	const abs = (...segments: string[]) => normalizePath(path.join(tmpDir, ...segments));
	const write = async (relPath: string, content: string) => {
		const filePath = path.join(tmpDir, relPath);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, content);
		return filePath;
	};

	beforeEach(async () => {
		tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'pretenders-dependencies-')));
	});

	afterEach(async () => {
		clearAutoScanCache();
		clearExportTableCache();
		clearModuleResolutionCaches();
		await rm(tmpDir, { recursive: true, force: true });
	});

	describe('scan', () => {
		test('records the files it was given', async () => {
			const a = await write('A.tsx', 'export const A = () => <div />;');
			const b = await write('B.tsx', 'export const B = () => <span />;');
			const dependencies = new Set<string>();

			await scan([a, b], { dependencies });

			expect([...dependencies].toSorted()).toStrictEqual([abs('A.tsx'), abs('B.tsx')]);
		});

		test('records the files the TypeScript program reaches by relative imports, beyond the given ones', async () => {
			const a = await write('A.tsx', "import { B } from './B';\nexport const A = () => <B />;");
			await write('B.tsx', "import { C } from './C';\nexport const B = () => <C />;");
			await write('C.tsx', 'export const C = () => <i />;');
			const dependencies = new Set<string>();

			await scan([a], { dependencies });

			expect([...dependencies].toSorted()).toStrictEqual([abs('A.tsx'), abs('B.tsx'), abs('C.tsx')]);
		});

		test('does not record declaration files or files under node_modules', async () => {
			const a = await write(
				'A.tsx',
				"import type { T } from './types';\nimport { x } from 'pkg';\nexport const A = () => <div />;",
			);
			await write('types.d.ts', 'export type T = string;');
			await write('node_modules/pkg/package.json', '{"name":"pkg","main":"index.js","types":"index.d.ts"}');
			await write('node_modules/pkg/index.d.ts', 'export const x: number;');
			const dependencies = new Set<string>();

			await scan([a], { dependencies });

			expect([...dependencies]).toStrictEqual([abs('A.tsx')]);
		});

		test('records a template component file', async () => {
			const vue = await write('Button.vue', '<template><button><slot /></button></template>');
			const dependencies = new Set<string>();

			await scan([vue], { dependencies });

			expect([...dependencies]).toStrictEqual([abs('Button.vue')]);
		});

		test('records nothing when no sink is given', async () => {
			const a = await write('A.tsx', 'export const A = () => <div />;');

			await expect(scan([a])).resolves.toHaveLength(1);
		});
	});

	describe('autoScan', () => {
		const entrySource = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		test('records the files its import graph collected, including template components', async () => {
			const entry = path.join(tmpDir, 'entry.tsx');
			await write('Child.tsx', "import Leaf from './Leaf.vue';\nexport const Child = () => <Leaf />;");
			await write('Leaf.vue', '<template><em /></template>');
			const dependencies = new Set<string>();

			await autoScan(entry, entrySource, { dependencies });

			expect(dependencies).toContain(abs('Child.tsx'));
			expect(dependencies).toContain(abs('Leaf.vue'));
		});

		test('reports the same files when the result comes from its cache', async () => {
			const entry = path.join(tmpDir, 'entry.tsx');
			await write('Child.tsx', 'export const Child = () => <button />;');
			const first = new Set<string>();
			const second = new Set<string>();

			await autoScan(entry, entrySource, { dependencies: first });
			await autoScan(entry, entrySource, { dependencies: second });

			expect(first).toContain(abs('Child.tsx'));
			expect([...second].toSorted()).toStrictEqual([...first].toSorted());
		});

		test('does not leak what the caller had in its sink into the cache', async () => {
			const entry = path.join(tmpDir, 'entry.tsx');
			await write('Child.tsx', 'export const Child = () => <button />;');
			const first = new Set<string>(['/somewhere/else.tsx']);
			const second = new Set<string>();

			await autoScan(entry, entrySource, { dependencies: first });
			await autoScan(entry, entrySource, { dependencies: second });

			expect(second).not.toContain('/somewhere/else.tsx');
		});
	});

	describe('disambiguatePretenders', () => {
		test('records the tsconfig it resolved the lint target imports with', async () => {
			const filePath = await write('Page.tsx', '');
			await write('tsconfig.json', '{}');
			await write('a/Item.tsx', 'export const Item = () => <button />;');
			await write('b/Item.tsx', 'export const Item = () => <span />;');
			const dependencies = new Set<string>();

			await disambiguatePretenders(
				[
					{ selector: 'Item', as: 'button', filePath: abs('a/Item.tsx') },
					{ selector: 'Item', as: 'span', filePath: abs('b/Item.tsx') },
				],
				{
					filePath,
					sourceCode: "import { Item } from './a/Item';\nexport const Page = () => <Item />;",
					dependencies,
				},
			);

			expect(dependencies).toContain(abs('tsconfig.json'));
		});
	});

	describe('dependencyMapper', () => {
		test('records the files whose export tables it read, before consulting its cache', async () => {
			await write('barrel/index.ts', "export { Item } from '../Item';");
			await write('Item.tsx', 'export const Item = () => <button />;');
			const importsByFile = new Map([
				['page.tsx', [{ localName: 'Item', importedName: 'Item', source: './barrel', type: 'named' as const }]],
			]);
			const map = new Map([
				['Item.tsx#Item', ['Item', 'button', undefined, 'Item.tsx']],
				['page.tsx#Page', ['Page', 'Item', undefined, 'page.tsx']],
			]) as Parameters<typeof dependencyMapper>[0];
			const first = new Set<string>();
			const second = new Set<string>();

			dependencyMapper(map, undefined, { importsByFile, cwd: tmpDir, dependencies: first });
			// The export tables are cached now: reading nothing must not mean recording nothing.
			dependencyMapper(map, undefined, { importsByFile, cwd: tmpDir, dependencies: second });

			expect(first).toContain(abs('barrel/index.ts'));
			expect(first).toContain(abs('Item.tsx'));
			expect([...second].toSorted()).toStrictEqual([...first].toSorted());
		});
	});

	describe('resolveModuleFile', () => {
		test('records the tsconfig and the config it extends', async () => {
			const importer = await write('src/page.tsx', '');
			await write('src/a.tsx', '');
			await write('tsconfig.base.json', '{"compilerOptions":{"jsx":"react-jsx"}}');
			await write('tsconfig.json', '{"extends":"./tsconfig.base.json"}');
			const dependencies = new Set<string>();

			resolveModuleFile(importer, './a', dependencies);

			expect([...dependencies].toSorted()).toStrictEqual([abs('tsconfig.base.json'), abs('tsconfig.json')]);
		});

		test('records them again when the parsed config comes from its cache', async () => {
			const importer = await write('src/page.tsx', '');
			await write('src/a.tsx', '');
			await write('tsconfig.base.json', '{}');
			await write('tsconfig.json', '{"extends":"./tsconfig.base.json"}');
			resolveModuleFile(importer, './a', new Set());
			const dependencies = new Set<string>();

			resolveModuleFile(importer, './a', dependencies);

			expect([...dependencies].toSorted()).toStrictEqual([abs('tsconfig.base.json'), abs('tsconfig.json')]);
		});

		test('does not record a config under node_modules', async () => {
			const importer = await write('src/page.tsx', '');
			await write('src/a.tsx', '');
			await write('node_modules/base/tsconfig.json', '{}');
			await write('tsconfig.json', '{"extends":"./node_modules/base/tsconfig.json"}');
			const dependencies = new Set<string>();

			resolveModuleFile(importer, './a', dependencies);

			expect([...dependencies]).toStrictEqual([abs('tsconfig.json')]);
		});

		test('records no tsconfig of the project when it has none', async () => {
			const importer = await write('src/page.tsx', '');
			await write('src/a.tsx', '');
			const dependencies = new Set<string>();

			resolveModuleFile(importer, './a', dependencies);

			// A `tsconfig.json` somewhere above the tmpdir is not this project's to be ruled out.
			expect([...dependencies].filter(dependency => dependency.startsWith(abs('')))).toStrictEqual([]);
		});
	});
});
