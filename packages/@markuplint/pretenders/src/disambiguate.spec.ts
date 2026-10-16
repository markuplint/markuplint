import type { Pretender } from '@markuplint/ml-config';

import fs from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
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

		test('a star re-export resolves when the project root sits under a directory named node_modules', async () => {
			const root = path.join(tmpDir, 'node_modules', 'app');
			await mkdir(root, { recursive: true });
			await writeFile(path.join(root, 'a.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(root, 'b.tsx'), 'export const Item = () => <li />;');
			await writeFile(path.join(root, 'barrel.ts'), "export * from './a';");

			const result = await disambiguatePretenders(candidates(root), { ...target(root), cwd: root });

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

	describe('with a workspace package linked into node_modules', () => {
		// `page.tsx` imports `Item` from `@org/ui`, which `node_modules/@org/ui` links to `packages/ui`. The
		// pretenders carry real paths, so the root is a real path too (`os.tmpdir()` is a link on macOS).
		let root: string;

		beforeEach(async () => {
			const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'disambiguate-link-'));
			// `native`, as module resolution does: on Windows only it expands a short `RUNNER~1` name.
			root = fs.realpathSync.native(tmpDir);
			const uiDir = path.join(root, 'packages', 'ui');
			await mkdir(uiDir, { recursive: true });
			await writeFile(path.join(uiDir, 'package.json'), '{"name":"@org/ui","main":"index.tsx"}');
			await writeFile(path.join(uiDir, 'index.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(root, 'other.tsx'), 'export const Item = () => <li />;');
			await mkdir(path.join(root, 'node_modules', '@org'), { recursive: true });
			await symlink(uiDir, path.join(root, 'node_modules', '@org', 'ui'), 'junction');
		});

		afterEach(async () => {
			await rm(root, { recursive: true, force: true });
			clearExportTableCache();
		});

		const pretenders = (): Pretender[] => [
			{ selector: 'Item', as: 'li', filePath: `${path.join(root, 'other.tsx')}:1:14` },
			{ selector: 'Item', as: 'button', filePath: `${path.join(root, 'packages', 'ui', 'index.tsx')}:1:14` },
		];
		const target = () => ({
			filePath: path.join(root, 'page.tsx'),
			sourceCode: "import { Item } from '@org/ui';\nexport const Page = () => <Item />;",
			cwd: root,
		});

		test('resolves to the package by default, as module resolution gives the real path', async () => {
			const result = await disambiguatePretenders(pretenders(), target());

			expect(result.map(p => p.as)).toStrictEqual(['button']);
		});

		test('resolves to the package with preserveSymlinks, where the path stays under node_modules', async () => {
			await writeFile(path.join(root, 'tsconfig.json'), '{"compilerOptions":{"preserveSymlinks":true}}');

			const result = await disambiguatePretenders(pretenders(), target());

			expect(result.map(p => p.as)).toStrictEqual(['button']);
		});

		test('resolves a star re-export of the package with preserveSymlinks', async () => {
			await writeFile(path.join(root, 'tsconfig.json'), '{"compilerOptions":{"preserveSymlinks":true}}');
			await writeFile(path.join(root, 'barrel.ts'), "export * from '@org/ui';");

			const result = await disambiguatePretenders(pretenders(), {
				...target(),
				sourceCode: "import { Item } from './barrel';\nexport const Page = () => <Item />;",
			});

			expect(result.map(p => p.as)).toStrictEqual(['button']);
		});
	});

	describe('with a name imported from a package', () => {
		// `page.tsx` renders the `Button` of `ui-lib`, a package. The project has components of the
		// same name, which it does not refer to: none of them may stand for it.
		let root: string;

		beforeEach(async () => {
			root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'disambiguate-package-')));
			await mkdir(path.join(root, 'ui', 'A'), { recursive: true });
			await mkdir(path.join(root, 'ui', 'B'), { recursive: true });
			await writeFile(path.join(root, 'ui', 'A', 'Button.tsx'), 'export const Button = () => <a />;');
			await writeFile(path.join(root, 'ui', 'B', 'Button.tsx'), 'export const Button = () => <i />;');
		});

		afterEach(async () => {
			await rm(root, { recursive: true, force: true });
			clearExportTableCache();
		});

		const install = async () => {
			const pkg = path.join(root, 'node_modules', 'ui-lib');
			await mkdir(pkg, { recursive: true });
			await writeFile(path.join(pkg, 'package.json'), '{"name":"ui-lib","main":"index.js","types":"index.d.ts"}');
			await writeFile(path.join(pkg, 'index.js'), 'exports.Button = () => null;');
			await writeFile(path.join(pkg, 'index.d.ts'), 'export declare const Button: () => null;');
		};
		const both = (): Pretender[] => [
			{ selector: 'Button', as: 'a', filePath: `${path.join(root, 'ui', 'A', 'Button.tsx')}:1:14` },
			{ selector: 'Button', as: 'i', filePath: `${path.join(root, 'ui', 'B', 'Button.tsx')}:1:14` },
		];
		const only = (): Pretender[] => [both()[0]!];
		const target = (sourceCode = "import { Button } from 'ui-lib';\nexport const P = () => <Button />;") => ({
			filePath: path.join(root, 'page.tsx'),
			sourceCode,
			cwd: root,
		});

		test('drops every same-named candidate when the package is installed', async () => {
			await install();

			const result = await disambiguatePretenders(both(), target());

			expect(result).toStrictEqual([]);
		});

		test('drops every same-named candidate when the package is not installed', async () => {
			const result = await disambiguatePretenders(both(), target());

			expect(result).toStrictEqual([]);
		});

		test('drops the only candidate of that name when the package is installed', async () => {
			await install();

			const result = await disambiguatePretenders(only(), target());

			expect(result).toStrictEqual([]);
		});

		test('drops the only candidate of that name when the package is not installed', async () => {
			const result = await disambiguatePretenders(only(), target());

			expect(result).toStrictEqual([]);
		});

		test('drops the candidates for a default import of the package', async () => {
			const result = await disambiguatePretenders(
				both(),
				target("import Button from 'ui-lib';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual([]);
		});

		test('drops the candidates for a name aliased on import', async () => {
			const result = await disambiguatePretenders(
				both(),
				target("import { Card as Button } from 'ui-lib';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual([]);
		});

		test('drops the candidates when a barrel re-exports the name from the package', async () => {
			await writeFile(path.join(root, 'barrel.ts'), "export { Button } from 'ui-lib';");

			const result = await disambiguatePretenders(
				both(),
				target("import { Button } from './barrel';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual([]);
		});

		test('drops the candidates when a barrel star re-exports the package', async () => {
			await writeFile(path.join(root, 'barrel.ts'), "export * from 'ui-lib';");

			const result = await disambiguatePretenders(
				both(),
				target("import { Button } from './barrel';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual([]);
		});

		test('drops them in a project that itself sits under a directory named node_modules', async () => {
			const project = path.join(root, 'node_modules', 'app');
			await mkdir(project, { recursive: true });
			await writeFile(path.join(project, 'Button.tsx'), 'export const Button = () => <a />;');

			const result = await disambiguatePretenders(
				[{ selector: 'Button', as: 'a', filePath: `${path.join(project, 'Button.tsx')}:1:14` }],
				{
					filePath: path.join(project, 'page.tsx'),
					sourceCode: "import { Button } from 'ui-lib';\nexport const P = () => <Button />;",
					cwd: project,
				},
			);

			expect(result).toStrictEqual([]);
		});

		test('keeps a candidate that is itself declared in the package, as it is the component the file renders', async () => {
			await install();
			const own: Pretender = {
				selector: 'Button',
				as: 'button',
				filePath: `${path.join(root, 'node_modules', 'ui-lib', 'Button.js')}:1:14`,
			};

			const result = await disambiguatePretenders([own], target());

			expect(result).toStrictEqual([own]);
		});

		test('keeps a candidate that is itself declared in the package, when a barrel re-exports it', async () => {
			await install();
			await writeFile(path.join(root, 'barrel.ts'), "export { Button } from 'ui-lib';");
			const own: Pretender = {
				selector: 'Button',
				as: 'button',
				filePath: `${path.join(root, 'node_modules', 'ui-lib', 'Button.js')}:1:14`,
			};

			const result = await disambiguatePretenders(
				[own],
				target("import { Button } from './barrel';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual([own]);
		});

		test('finds a kebab-case selector by the PascalCase name the script imports it as', async () => {
			const kebab: Pretender = {
				selector: 'my-button',
				as: 'a',
				filePath: `${path.join(root, 'ui', 'A', 'Button.tsx')}:1:14`,
			};

			const result = await disambiguatePretenders(
				[kebab],
				target("import MyButton from 'ui-lib';\nexport default { components: { MyButton } };"),
			);

			expect(result).toStrictEqual([]);
		});

		test('keeps an entry without a filePath, as it is not the project’s scanned component', async () => {
			const handWritten: Pretender = { selector: 'Button', as: 'b' };

			const result = await disambiguatePretenders([handWritten, ...both()], target());

			expect(result).toStrictEqual([handWritten]);
		});

		test('drops only the group of the name imported from the package', async () => {
			await writeFile(path.join(root, 'ui', 'Card.tsx'), 'export const Card = () => <section />;');
			const card: Pretender = {
				selector: 'Card',
				as: 'section',
				filePath: `${path.join(root, 'ui', 'Card.tsx')}:1:14`,
			};

			const result = await disambiguatePretenders(
				[...both(), card],
				target(
					"import { Button } from 'ui-lib';\nimport { Card } from './ui/Card';\nexport const P = () => <Button><Card /></Button>;",
				),
			);

			expect(result).toStrictEqual([card]);
		});

		test('keeps the candidate that the file imports from the project, beside a package import of another name', async () => {
			const result = await disambiguatePretenders(
				only(),
				target(
					"import { Card } from 'ui-lib';\nimport { Button } from './ui/A/Button';\nexport const P = () => <Card><Button /></Card>;",
				),
			);

			expect(result).toStrictEqual(only());
		});

		test('keeps the candidate when the file does not import the name at all', async () => {
			const result = await disambiguatePretenders(only(), target('export const P = () => <Button />;'));

			expect(result).toStrictEqual(only());
		});

		test('keeps the candidate when the name is imported from a path alias it cannot rule out', async () => {
			const result = await disambiguatePretenders(
				only(),
				target("import { Button } from '@/ui/Button';\nexport const P = () => <Button />;"),
			);

			expect(result).toStrictEqual(only());
		});

		test('returns the same list when the source never names the selector', async () => {
			const list = only();

			const result = await disambiguatePretenders(list, target('export const P = () => <div />;'));

			expect(result).toBe(list);
		});
	});
});
