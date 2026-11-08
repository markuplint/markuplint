/**
 * Guards the one part of `classify.ts` that a hand-written table cannot keep up with: the files
 * that a spec reads by a path.
 *
 * `vitest related` follows imports, so a spec that reads a file of another package with `fs`,
 * `require()` or a path it hands to a process is invisible to it. This spec reads every spec and
 * finds the relative path literals that leave the package of the spec (an `import` is left out: the
 * import graph has it). For each one it changes the file that the path names and asks the plan for
 * the specs to run. The spec that reads the file has to be among them, or the plan has to be `full`.
 * A new spec that reads outside its package fails here until `ROOT_INPUTS` in `classify.ts` has a row
 * for it.
 */
import { statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { CLI_RUNTIME, LOADED_BY_CONFIGURATION, plan } from './classify.ts';
import { createProbe, git, root } from './probe.ts';

const probe = createProbe();

/** A relative path in a string literal that is not the specifier of an `import`. */
const RELATIVE_PATH_LITERAL = /(?<!from\s)(?<!import\s)(?<!import\()(['"`])(\.\.\/[^'"`\n$]*)\1/g;

const PACKAGE_ROOT = /^(packages\/(?:@[^/]+\/)?[^/]+)\//;

function isDirectory(file: string): boolean {
	try {
		return statSync(path.join(root, file)).isDirectory();
	} catch {
		return false;
	}
}

interface Read {
	readonly spec: string;
	readonly target: string;
}

function readsOutsideOwnPackage(): Read[] {
	const reads: Read[] = [];
	for (const spec of probe.specs) {
		const ownRoot = PACKAGE_ROOT.exec(spec)?.[1];
		const text = probe.read(spec);
		for (const match of text.matchAll(RELATIVE_PATH_LITERAL)) {
			const literal = match[2] ?? '';
			const target = path.posix.normalize(path.posix.join(path.posix.dirname(spec), literal));
			if (target.startsWith('..') || target.includes('/lib/') || target.includes('node_modules')) {
				continue;
			}
			if (ownRoot !== undefined && target.startsWith(`${ownRoot}/`)) {
				continue;
			}
			// A bare `../..` names a directory; a file is named by what follows it.
			reads.push({ spec, target: target.replace(/\/$/, '') });
		}
	}
	return reads;
}

const reads = readsOutsideOwnPackage();

describe('a spec that reads outside its own package', () => {
	test('there are some, so that this check is not vacuous', () => {
		expect(reads.length).toBeGreaterThan(0);
	});

	test.each(reads.map(({ spec, target }) => [spec, target] as const))(
		'%s reads %s, and a change to it runs the spec',
		(spec, target) => {
			// A directory is changed by a file in it.
			const changed = isDirectory(target) ? `${target}/__changed__.txt` : target;
			const result = plan([{ status: 'M', path: changed }], probe);
			if (result.mode === 'full') {
				return;
			}
			expect(result.targets).toContain(spec);
		},
	);
});

/** The names of the workspace packages and the packages they depend on in `dependencies`. */
function readDependencies(): Map<string, string[]> {
	const manifests = new Map<string, string[]>();
	const files = git(['ls-files', '-z', '--', ':(glob)packages/*/package.json', ':(glob)packages/@*/*/package.json'])
		.split('\0')
		.filter(Boolean);
	for (const file of files) {
		const manifest = JSON.parse(probe.read(file)) as { name: string; dependencies?: Record<string, string> };
		manifests.set(manifest.name, Object.keys(manifest.dependencies ?? {}));
	}
	return manifests;
}

describe('the packages that the markuplint command depends on', () => {
	test('each is on the execution path of the command or loaded by a configuration', () => {
		const manifests = readDependencies();
		const closure = new Set<string>();
		const visit = (name: string) => {
			if (closure.has(name) || !manifests.has(name)) {
				return;
			}
			closure.add(name);
			for (const dependency of manifests.get(name) ?? []) {
				visit(dependency);
			}
		};
		visit('markuplint');

		const unplaced = [...closure].filter(name => !CLI_RUNTIME.has(name) && !LOADED_BY_CONFIGURATION.has(name));
		expect(unplaced).toStrictEqual([]);
	});

	test('the two lists name only packages of the workspace, and share none', () => {
		const names = new Set(readDependencies().keys());
		for (const name of [...CLI_RUNTIME, ...LOADED_BY_CONFIGURATION]) {
			expect(names.has(name), name).toBe(true);
		}
		expect([...CLI_RUNTIME].filter(name => LOADED_BY_CONFIGURATION.has(name))).toStrictEqual([]);
	});
});
