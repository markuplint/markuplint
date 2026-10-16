import { readdirSync, readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

/**
 * Guards the install-script policy in the root `CLAUDE.md` (Security → Supply
 * chain): dependency install scripts are off (`enableScripts: false` in
 * `.yarnrc.yml`, `approvedGitRepositories` not widened to `"**"`), and every
 * installed package that Yarn would build (an install-time script, or a
 * `binding.gyp` that triggers `node-gyp rebuild`) has a `dependenciesMeta`
 * entry in its project's `package.json` — `built: true` to run the build,
 * `built: false` to record that skipping it is deliberate. Both `.yarnrc.yml`
 * settings are Yarn's own defaults; its comment records how the permissive
 * values got written there. The entry check keeps the opt-in lists in step
 * with the installed trees: a dependency that needs a build fails here instead
 * of surfacing only as a `YN0004` warning in the install log, and an entry
 * whose package no longer needs a build is reported as stale.
 *
 * Two Yarn projects are covered: the root workspace (its hoisted tree plus
 * every workspace-local `node_modules`) and `website/`, a separate project
 * that inherits the root `.yarnrc.yml` because Yarn merges the rc files of
 * every ancestor directory. A project is checked only where its tree is
 * installed: `yarn test` in the root installs nothing under `website/`, so
 * the website cases run where `cd website && yarn install` has run — locally,
 * and in `.github/workflows/website.yml`, which runs this file for that
 * reason.
 */

const rootDir = path.resolve(import.meta.dirname, '../../../..');
const yarnrc = readFileSync(path.join(rootDir, '.yarnrc.yml'), 'utf8');

interface Manifest {
	readonly workspaces?: readonly string[];
	readonly dependenciesMeta?: Readonly<Record<string, { readonly built?: boolean }>>;
}

interface Project {
	/** Relative to the repository root; `.` for the root workspace. */
	readonly dir: string;
	/** Directories whose `node_modules` belong to this project. */
	readonly trees: readonly string[];
	readonly manifest: Manifest;
}

const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'] as const;

function readManifest(dir: string) {
	return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as Manifest & { readonly name?: string };
}

/**
 * Expands `workspaces` globs (`packages/*`, `vscode`, …) to the workspace
 * directories that exist. Only a trailing `*` segment is supported, which is
 * all the root manifest uses.
 */
function workspaceDirs(projectDir: string, manifest: Manifest) {
	return (manifest.workspaces ?? []).flatMap(pattern => {
		const segments = pattern.split('/');
		const last = segments.pop();
		const parent = path.join(projectDir, ...segments);
		if (last !== '*') {
			return [path.join(parent, last ?? '')];
		}
		if (!existsSync(parent)) {
			return [];
		}
		return readdirSync(parent, { withFileTypes: true })
			.filter(entry => entry.isDirectory())
			.map(entry => path.join(parent, entry.name));
	});
}

function project(dir: string): Project {
	const projectDir = path.join(rootDir, dir);
	const manifest = readManifest(projectDir);
	return { dir, manifest, trees: [projectDir, ...workspaceDirs(projectDir, manifest)] };
}

/**
 * Whether Yarn would run a build for the package at `dir`: an install-time
 * script, or a `binding.gyp` without one (Yarn then queues `node-gyp rebuild`).
 */
function needsBuild(dir: string) {
	if (existsSync(path.join(dir, 'binding.gyp'))) {
		return true;
	}
	const manifestPath = path.join(dir, 'package.json');
	if (!existsSync(manifestPath)) {
		return false;
	}
	const source = readFileSync(manifestPath, 'utf8');
	// Most manifests mention none of the script names; skip parsing those.
	if (!INSTALL_SCRIPTS.some(script => source.includes(`"${script}"`))) {
		return false;
	}
	const manifest = JSON.parse(source) as { readonly scripts?: Readonly<Record<string, string>> };
	return INSTALL_SCRIPTS.some(script => manifest.scripts?.[script]);
}

/**
 * A symlinked entry is followed unless it points at a workspace (Yarn links
 * workspaces into `node_modules`); those directories are scanned as part of
 * the project's trees instead, so following the link would only repeat the
 * work.
 */
function resolveEntry(entryPath: string, isSymbolicLink: boolean) {
	if (!isSymbolicLink) {
		return entryPath;
	}
	const target = realpathSync(entryPath);
	if (!statSync(target).isDirectory()) {
		return null;
	}
	const insideRepo = !path.relative(rootDir, target).startsWith('..');
	const insideNodeModules = target.split(path.sep).includes('node_modules');
	return insideRepo && !insideNodeModules ? null : target;
}

/**
 * Lists the installed packages that Yarn would build, keyed by name. Nested
 * `node_modules` are walked too: a package that Yarn could not hoist still
 * runs its script.
 */
function collectPackagesNeedingBuild(dir: string, found = new Map<string, string>()) {
	if (!existsSync(dir)) {
		return found;
	}
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.') || (!entry.isDirectory() && !entry.isSymbolicLink())) {
			continue;
		}
		const entryPath = resolveEntry(path.join(dir, entry.name), entry.isSymbolicLink());
		if (entryPath === null) {
			continue;
		}
		if (entry.name.startsWith('@')) {
			collectPackagesNeedingBuild(entryPath, found);
			continue;
		}
		if (needsBuild(entryPath)) {
			const name = readManifest(entryPath).name;
			if (name) {
				found.set(name, path.relative(rootDir, path.join(dir, entry.name)));
			}
		}
		collectPackagesNeedingBuild(path.join(entryPath, 'node_modules'), found);
	}
	return found;
}

/** `dependenciesMeta` keys are `name` or `name@range`; the policy is per name. */
function identOf(key: string) {
	const at = key.indexOf('@', 1);
	return at === -1 ? key : key.slice(0, at);
}

/** The YAML block under a top-level key, up to the next top-level key. */
function topLevelBlock(key: string) {
	const match = new RegExp(String.raw`^${key}:(.*(?:\n[ \t]+.*)*)`, 'm').exec(yarnrc);
	return match?.[1] ?? null;
}

describe('.yarnrc.yml keeps the hardened install defaults', () => {
	test('enableScripts is false', () => {
		expect(yarnrc).toMatch(/^enableScripts:\s*false\s*$/m);
	});

	test('approvedGitRepositories does not approve every repository', () => {
		expect(topLevelBlock('approvedGitRepositories') ?? '').not.toMatch(/(?:^|[\s"'[,])\*\*(?:[\s"'\],]|$)/);
	});
});

const installedProjects = ['.', 'website']
	.filter(dir => existsSync(path.join(rootDir, dir, 'node_modules')))
	.map(dir => project(dir));

describe.each(installedProjects)(
	'$dir: dependenciesMeta lists every installed package that Yarn would build',
	({ dir, trees, manifest }) => {
		const packagesNeedingBuild = new Map<string, string>();
		for (const tree of trees) {
			collectPackagesNeedingBuild(path.join(tree, 'node_modules'), packagesNeedingBuild);
		}
		const listed = [
			...new Set(
				Object.entries(manifest.dependenciesMeta ?? {})
					.filter(([, meta]) => typeof meta.built === 'boolean')
					.map(([key]) => identOf(key)),
			),
		];
		const manifestPath = path.join(dir, 'package.json');

		test('the installed tree was scanned', () => {
			// esbuild ships an install script and is a direct devDependency of
			// both projects, so finding it proves the scan reached the tree.
			expect([...packagesNeedingBuild.keys()]).toContain('esbuild');
		});

		test.each([...packagesNeedingBuild.entries()])('%s (%s) has an entry', (name, location) => {
			expect(
				listed,
				`${location} would be built at install time; add "${name}": { "built": true } (or false to skip it on purpose) to dependenciesMeta in ${manifestPath}, or drop the dependency`,
			).toContain(name);
		});

		test.each(listed)('%s still needs a build', name => {
			expect(
				[...packagesNeedingBuild.keys()],
				`no installed package named ${name} has an install script or binding.gyp; remove its dependenciesMeta entry from ${manifestPath}`,
			).toContain(name);
		});
	},
);
