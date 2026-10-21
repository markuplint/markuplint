import path from 'node:path';

import { globSync } from 'glob';
import ts from 'typescript';
import { describe, test, expect } from 'vitest';

import config from '../../../../vitest.config.ts';

const rootDir = path.resolve(import.meta.dirname, '../../../..');

/**
 * Directories whose specs run but are deliberately outside the type check.
 * Mirrors the `exclude` of `tsconfig.spec.json`, which holds the reason.
 */
const NOT_TYPE_CHECKED = ['packages/@markuplint/create-rule/scaffold/'];

function typeCheckedFiles() {
	const configPath = path.join(rootDir, 'tsconfig.spec.json');
	const read = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, rootDir);
	return new Set(parsed.fileNames.map(file => path.relative(rootDir, file).split(path.sep).join('/')));
}

/**
 * Guards the type check of spec files (`yarn test:types`, which `yarn test`
 * runs first). vitest transpiles a spec without checking it, and its own
 * `--typecheck` starts `tsc` only for `*.spec-d.ts` files, of which the
 * repository has none: a type error in a `*.spec.ts` passes vitest unnoticed,
 * so `tsc -p tsconfig.spec.json` is the gate.
 *
 * `tsconfig.spec.json` lists its own `include`, so a spec that vitest runs but
 * that glob misses would escape the check without any failure. This asserts
 * that every `.ts` file `vitest.config.ts` selects is in the type-checked set,
 * except the directories in {@link NOT_TYPE_CHECKED}. `.mjs` specs are plain
 * JavaScript and have nothing to check. A too-broad `exclude` is caught only
 * for files that `test.include` matches, which is the set that matters here.
 */
describe('spec files are type-checked', () => {
	const checked = typeCheckedFiles();
	const patterns = config.test?.include ?? [];
	const specs = patterns
		.flatMap(pattern => globSync(pattern, { cwd: rootDir, ignore: ['**/node_modules/**', '**/lib/**'] }))
		.map(file => file.split(path.sep).join('/'))
		.filter(file => file.endsWith('.ts'));

	test('vitest.config.ts selects .ts specs', () => {
		expect(patterns.length).toBeGreaterThan(0);
		expect(specs.length).toBeGreaterThan(0);
	});

	test('every .ts spec vitest runs is in tsconfig.spec.json', () => {
		const missed = specs.filter(spec => !checked.has(spec) && !NOT_TYPE_CHECKED.some(dir => spec.startsWith(dir)));
		expect(missed).toStrictEqual([]);
	});

	test('the type-checked set is not empty and excludes the scaffold', () => {
		expect(checked.size).toBeGreaterThan(0);
		expect([...checked].filter(file => NOT_TYPE_CHECKED.some(dir => file.startsWith(dir)))).toStrictEqual([]);
	});

	test('every NOT_TYPE_CHECKED directory still holds a spec that vitest runs', () => {
		const stale = NOT_TYPE_CHECKED.filter(dir => !specs.some(spec => spec.startsWith(dir)));
		expect(stale).toStrictEqual([]);
	});

	test('yarn test runs the type check before the specs', () => {
		const scripts = ts.readJsonConfigFile(path.join(rootDir, 'package.json'), ts.sys.readFile);
		const manifest = ts.convertToObject(scripts, []) as { scripts: Record<string, string> };
		const script = manifest.scripts['test'] ?? '';
		expect(script).toContain('test:types');
		expect(script.indexOf('test:types')).toBeLessThan(script.indexOf('test:run'));
		expect(manifest.scripts['test:types']).toContain('tsconfig.spec.json');
	});
});
