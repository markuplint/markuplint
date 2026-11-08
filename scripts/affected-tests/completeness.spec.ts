/**
 * Guards the one part of `classify.ts` that a hand-written table cannot keep up with: the files
 * that a spec reads by a path.
 *
 * `vitest related` follows imports, so a spec that reads a file of another package with `fs`,
 * `require()` or a path it hands to a process is invisible to it. This spec reads every spec and
 * finds the string literals that are a relative path starting with `../` and leave the package of
 * the spec (an `import` is left out: the import graph has it). For each one it changes the file
 * that the path names and asks the plan for the specs to run. The spec that reads the file has to
 * be among them, or the plan has to be `full`. A new spec that names a file outside its package
 * this way fails here until `ROOT_INPUTS` in `classify.ts` has a row for it.
 *
 * What it does not find: a path built in pieces (`path.join(dir, '..', 'x')`) or from the root
 * (`path.resolve(root, 'x')`). Those are for a reviewer; the other tests below guard the lists that
 * `classify.ts` keeps by hand.
 */
import { statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
	CLI_RUNTIME,
	CONFIGURATION_CONSUMERS,
	LOADED_BY_CONFIGURATION,
	SPAWNING,
	WITHOUT_OUTPUT,
	plan,
} from './classify.ts';
import { createProbe, listFiles, root } from './probe.ts';

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

/** The plan for a change to the file that a spec reads; a directory is changed by a file in it. */
function planFor(target: string) {
	const changed = isDirectory(target) ? `${target}/__changed__.txt` : target;
	return plan([{ status: 'M', path: changed }], probe);
}

describe('a spec that reads outside its own package', () => {
	test('there are specs, and some of them read outside, so that this check is not vacuous', () => {
		expect(probe.specs.length).toBeGreaterThan(0);
		expect(reads.length).toBeGreaterThan(0);
	});

	test('some are accounted for by a row of ROOT_INPUTS, not by `full`', () => {
		// Each row below passes when the plan is `full`, so a `full` that covered every file would
		// pass them all and guard nothing.
		const accounted = reads.filter(({ spec, target }) => {
			const result = planFor(target);
			return result.mode === 'affected' && result.targets.includes(spec);
		});
		expect(accounted.length).toBeGreaterThan(0);
	});

	test.each(reads.map(({ spec, target }) => [spec, target] as const))(
		'%s reads %s, and a change to it runs the spec',
		(spec, target) => {
			const result = planFor(target);
			if (result.mode === 'full') {
				return;
			}
			expect(result.targets).toContain(spec);
		},
	);
});

/**
 * `plan()` takes a package's `README`, `CHANGELOG`, `CLAUDE.md` and any other Markdown file as
 * something that no spec reads, outside `create-rule` (it reads its scaffold) and the citation
 * checks (they have a rule of their own). This is what keeps that true: a spec that names a Markdown
 * file in code, not in a comment, has to be accounted for in `classify.ts` and added here.
 */
describe('a spec that names a Markdown file', () => {
	const KNOWN_READERS = ['packages/@markuplint/create-rule/', 'scripts/spec-citations/', 'scripts/affected-tests/'];
	const COMMENT_LINE = /^\s*(?:\*|\/\/|\/\*)/;
	const MARKDOWN_PATH_LITERAL = /(['"`])[^'"`\n]*\.md\1/;

	test('is one that the plan knows', () => {
		const unknown = probe.specs.filter(
			spec =>
				!KNOWN_READERS.some(reader => spec.startsWith(reader)) &&
				probe
					.read(spec)
					.split('\n')
					.some(line => !COMMENT_LINE.test(line) && MARKDOWN_PATH_LITERAL.test(line)),
		);
		expect(unknown).toStrictEqual([]);
	});
});

/**
 * `IGNORED` in `classify.ts` takes the repository's own configuration and tooling as something that
 * no spec reads, `.github/workflows/test.yml` excepted (it is a full trigger). A spec that names one
 * of them in code has to be accounted for in `classify.ts` and added here.
 */
describe('a spec that names a file that the plan takes as unread', () => {
	const UNREAD_PATH_LITERAL =
		/(['"`])[^'"`\n]*(?:\.github\/|\.oxlintrc|\.oxfmtrc|\.textlintrc|\.husky\/|\.vscode\/)[^'"`\n]*\1/;
	const COMMENT_LINE = /^\s*(?:\*|\/\/|\/\*)/;

	test('is none', () => {
		const named = probe.specs.filter(
			spec =>
				!spec.startsWith('scripts/affected-tests/') &&
				probe
					.read(spec)
					.split('\n')
					.some(line => !COMMENT_LINE.test(line) && UNREAD_PATH_LITERAL.test(line)),
		);
		expect(named).toStrictEqual([]);
	});
});

/**
 * The Nx inputs of a package leave out its Markdown files, except `src/README.md`, which the build
 * of `config-presets` reads. This keeps that true: a build script that names another Markdown file
 * is one whose change the Nx hash would miss, and has to be put in `nx.json` as an input.
 */
describe('a build script that names a Markdown file', () => {
	test('names only the README of the presets', () => {
		// Only the scripts that the `build` script of a package runs: `html-spec/build.ts` belongs to
		// `yarn gen`, not to the build that Nx caches.
		const scripts = listFiles([
			':(glob)packages/*/build.*',
			':(glob)packages/@*/*/build.*',
			':(glob)packages/*/esm.mjs',
			':(glob)packages/@*/*/esm.mjs',
		]).filter(script => {
			const manifest = JSON.parse(probe.read(`${path.posix.dirname(script)}/package.json`)) as {
				scripts?: Record<string, string>;
			};
			return Object.entries(manifest.scripts ?? {}).some(
				([name, command]) => name.startsWith('build') && command.includes(path.posix.basename(script)),
			);
		});
		expect(scripts.length).toBeGreaterThan(0);
		const MARKDOWN_PATH_LITERAL = /(['"`])([^'"`\n]*\.md)\1/g;
		const named = new Set(
			scripts.flatMap(script =>
				[...probe.read(script).matchAll(MARKDOWN_PATH_LITERAL)].map(match => `${script} ${match[2]}`),
			),
		);
		expect([...named]).toStrictEqual(['packages/@markuplint/config-presets/build.mjs README.md']);
	});
});

/** The names of the workspace packages and the packages they depend on in `dependencies`. */
function readDependencies(): Map<string, string[]> {
	const manifests = new Map<string, string[]>();
	const files = listFiles([':(glob)packages/*/package.json', ':(glob)packages/@*/*/package.json']);
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

describe('the lists of classify.ts that name paths and packages', () => {
	test('the spawn pattern finds the specs that start the command and a runtime', () => {
		const spawning = probe.specs.filter(spec => SPAWNING.test(probe.read(spec)));
		expect(spawning).toContain('packages/markuplint/src/cli/index.spec.ts');
		expect(spawning).toContain('packages/markuplint/src/cli/suppressions.spec.ts');
		expect(spawning).toContain('packages/@markuplint/file-resolver/src/general-import.runtime.spec.ts');
		expect(spawning).toContain('packages/@markuplint/shared/src/errors/module-not-found.runtime.spec.ts');
	});

	test('each consumer of a configuration has specs', () => {
		for (const consumer of CONFIGURATION_CONSUMERS) {
			expect(
				probe.specs.some(spec => spec.startsWith(consumer)),
				consumer,
			).toBe(true);
		}
	});

	test('each package without a build output to pass is a package of the workspace', () => {
		const names = new Set(readDependencies().keys());
		for (const root of WITHOUT_OUTPUT) {
			expect(names.has(root.slice('packages/'.length)), root).toBe(true);
		}
	});
});
