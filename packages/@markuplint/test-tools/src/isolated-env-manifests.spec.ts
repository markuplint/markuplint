import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

/**
 * Guards the pnpm configuration of the `test/isolated-env/*` sandboxes
 * (`test/isolated-env/CLAUDE.md`). Each sandbox installs the workspace
 * packages as `file:` dependencies, and pnpm has to be told to resolve the
 * `@markuplint/*` packages that `markuplint` itself depends on to those same
 * local builds, or they come from the registry and the run fails as a lone
 * `config-error` instead of the expected output. pnpm reads that instruction
 * from `overrides` in `pnpm-workspace.yaml` and no longer from the `pnpm`
 * field of `package.json`, where it warns and moves on. CI runs the sandboxes
 * only in `.github/workflows/test.yml`, so a drift between the two files shows
 * up there first and in a shape that does not name its cause; this spec names
 * it: the override keys are exactly the local packages in `dependencies`,
 * every override value is the `$<name>` reference back to that `file:`
 * dependency, and no manifest carries a `pnpm` block that pnpm would ignore.
 */

const rootDir = path.resolve(import.meta.dirname, '../../../..');
const sandboxesDir = path.join(rootDir, 'test/isolated-env');

interface Manifest {
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly pnpm?: unknown;
}

function isLocalPackage(name: string): boolean {
	return name === 'markuplint' || name.startsWith('@markuplint/');
}

/**
 * The `overrides` map of a sandbox's `pnpm-workspace.yaml`. The file is
 * written by hand in the flat `  key: value` shape (keys quoted with single
 * quotes when they contain `@` or `/`), so a line scan is enough and keeps
 * this spec free of a YAML parser dependency.
 *
 * @param yamlText - The file contents
 * @returns The override entries as `[key, value]` pairs in file order
 */
function readOverrides(yamlText: string): readonly (readonly [key: string, value: string])[] {
	const entries: (readonly [string, string])[] = [];
	let inOverrides = false;
	for (const line of yamlText.split('\n')) {
		if (/^\S/.test(line)) {
			inOverrides = line.startsWith('overrides:');
			continue;
		}
		if (!inOverrides) continue;
		const match = /^ {2}'?([^':]+)'?:\s*(\S+)\s*$/.exec(line);
		if (match?.[1] && match[2]) entries.push([match[1], match[2]]);
	}
	return entries;
}

const sandboxes = readdirSync(sandboxesDir, { withFileTypes: true })
	.filter(entry => entry.isDirectory() && existsSync(path.join(sandboxesDir, entry.name, 'package.json')))
	.map(entry => entry.name)
	.toSorted();

describe('test/isolated-env sandboxes', () => {
	test('there are sandboxes to check', () => {
		expect(sandboxes.length).toBeGreaterThan(0);
	});

	describe.each(sandboxes)('%s', sandbox => {
		const dir = path.join(sandboxesDir, sandbox);
		const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as Manifest;
		const workspaceYamlPath = path.join(dir, 'pnpm-workspace.yaml');

		test('package.json has no pnpm block (pnpm does not read it)', () => {
			expect(manifest).not.toHaveProperty('pnpm');
		});

		test('pnpm-workspace.yaml exists', () => {
			expect(existsSync(workspaceYamlPath)).toBe(true);
		});

		const overrides = existsSync(workspaceYamlPath) ? readOverrides(readFileSync(workspaceYamlPath, 'utf8')) : [];

		test('pnpm overrides cover exactly the local packages in dependencies', () => {
			const localDependencies = Object.keys(manifest.dependencies ?? {})
				.filter(name => isLocalPackage(name))
				.toSorted();
			const overrideKeys = overrides.map(([key]) => key).toSorted();
			expect(overrideKeys).toEqual(localDependencies);
		});

		test('every pnpm override points back at the file: dependency of the same name', () => {
			expect(overrides.length).toBeGreaterThan(0);
			for (const [key, value] of overrides) {
				expect(value, key).toBe(`$${key}`);
			}
		});
	});
});
