/**
 * Chooses the specs that a pull request has to run, from the files it changed.
 *
 * The goal is a fast answer on a pull request. The merge queue runs the whole suite, so this
 * module is allowed to be an approximation, but never in the direction of running too little for
 * a file it cannot place: **a path that no rule below recognises makes the plan `full`.**
 *
 * What the selection is built on, and where it stops:
 *
 * - `vitest related <files>` selects the specs whose import graph reaches one of the files. A spec
 *   reaches a sibling package through its built `lib/` (every `exports` map points there), never
 *   through its `src/`, so a changed `src` file is passed twice: itself, for the specs of its own
 *   package that import it by a relative path, and its build output, for the specs of every other
 *   package. The output must exist, so the build runs before the selection.
 * - The graph is static. Four things reach a spec without an import and are covered by rules of
 *   their own: a package that a configuration names (`generalImport()` in `@markuplint/file-resolver`
 *   loads parsers, spec packages, presets, rules and pretenders by name), a file read with `fs`, a
 *   process that a spec spawns, and the root files that policy specs read.
 * - A file that is neither source nor a known input of any spec runs every spec of its package.
 *
 * @module
 */
import { classify as classifyCitation } from '../spec-citations/discover.ts';

export type ChangeStatus = 'A' | 'M' | 'D';

export interface Change {
	readonly status: ChangeStatus;
	/** Repository-relative, with `/` separators. */
	readonly path: string;
}

/** What the plan reads from the repository, so that a spec can supply a small one. */
export interface Probe {
	exists(path: string): boolean;
	/** Every spec file that the default vitest config includes. */
	readonly specs: readonly string[];
	read(path: string): string;
}

export type Plan =
	| { readonly mode: 'full'; readonly reason: string }
	| { readonly mode: 'affected'; readonly targets: readonly string[] };

/**
 * Files whose change can alter any spec, or that a policy spec reads in full. Matching one of
 * them makes the plan `full`.
 */
const FULL_TRIGGERS: readonly RegExp[] = [
	/(^|\/)package\.json$/,
	/(^|\/)yarn\.lock$/,
	/^\.yarnrc\.yml$/,
	/^lerna\.json$/,
	/^nx\.json$/,
	/(^|\/)tsconfig[^/]*\.json$/,
	/^vitest[^/]*\.config\.ts$/,
	/^\.github\/workflows\/test\.yml$/,
	// The selection itself, and the specs that guard repository policy by reading every manifest.
	/^scripts\/affected-tests\//,
	/^packages\/@markuplint\/test-tools\//,
	/^packages\/@markuplint-dev\//,
	// The fixtures that spec packages and the isolated environments install.
	/^packages\/@markuplint-test\//,
	// Spec data and messages that nearly every rule spec reads at run time, by name.
	/^packages\/@markuplint\/html-spec\/index\.(?:js|json|d\.ts)$/,
	/^packages\/@markuplint\/i18n\/(?:locales\/|\$schema\.json$)/,
];

/** Outside `packages/`, files that no spec reads. */
const IGNORED: readonly RegExp[] = [
	/^\.claude\//,
	/^\.github\/(?!workflows\/test\.yml$)/,
	/^\.husky\//,
	/^\.vscode\//,
	/^website\//,
	/^skills\//,
	/^vscode\/(?!scripts\/)/,
	/^[^/]+\.md$/,
	/^LICENSE$/,
	/^\.(?:gitignore|gitattributes|npmrc|node-version|nvmrc)$/,
	/^\.(?:oxlintrc|oxfmtrc|textlintrc)[^/]*$/,
	/^renovate\.json5?$/,
	// Read only by `yarn spec-citations --update`; no spec reads it.
	/^scripts\/spec-citations\/spec-citations\.lock\.json$/,
];

const PACKAGE_PATH = /^(?<root>packages\/(?:@[^/]+\/)?[^/]+)\/(?<rel>.+)$/;
const SPEC_FILE = /\.spec\.(?:ts|js|mjs)$/;
const SOURCE_FILE = /\.(?:ts|tsx|mts|js|mjs|cjs)$/;
const DECLARATION_FILE = /\.d\.ts$/;

/**
 * A spec that starts a process. The process loads built output, which no import links to the spec,
 * so a change to the code that the process runs has to select it by another way. Found by reading
 * the specs, so that a new one is picked up without an edit here.
 */
const SPAWNING =
	/\bexeca\(|\bexecaNode\(|\bspawn\(|\bspawnSync\(|\bexecFile\(|\bexecFileSync\(|\bexecSync\(|\bfork\(|bin\/markuplint/;

/**
 * The packages that every run of the `markuplint` command executes: its dependencies, less what a
 * configuration selects (`LOADED_BY_CONFIGURATION`). A change to one of them runs the specs that
 * spawn a process, wherever they are. A change to any other package runs only the spawning specs
 * of that package, as a rule or a parser changes what a spawned command reports only for the
 * inputs that use it; the merge queue runs the rest.
 *
 * `completeness.spec.ts` fails when a dependency of `markuplint` is in neither list.
 */
export const CLI_RUNTIME: ReadonlySet<string> = new Set([
	'markuplint',
	...[
		'cli-utils',
		'file-resolver',
		'i18n',
		'ml-ast',
		'ml-config',
		'ml-core',
		'ml-spec',
		'parser-utils',
		'selector',
		'shared',
		'types',
	].map(name => `@markuplint/${name}`),
]);

/**
 * Dependencies of `markuplint` that the command still loads by name, from the configuration or
 * from the defaults of `file-resolver`. They are in the dependency closure but not on the
 * execution path of the command itself.
 */
export const LOADED_BY_CONFIGURATION: ReadonlySet<string> = new Set(
	['config-presets', 'html-parser', 'html-spec', 'rules'].map(name => `@markuplint/${name}`),
);

/** `packages/@markuplint/ml-core` → `@markuplint/ml-core`; `packages/markuplint` → `markuplint`. */
function packageName(root: string): string {
	return root.slice('packages/'.length);
}

/**
 * Packages that `generalImport()` loads by the name a configuration gives, so that no import
 * links them to the specs that run with them. A spec that names the package runs with it.
 * The value is what else in a spec shows that it runs with the package without naming it.
 */
function dynamicTokens(name: string): readonly string[] | null {
	const spec = name.endsWith('-spec') && name !== 'ml-spec';
	const parser = name.endsWith('-parser');
	if (spec || parser) {
		return [`@markuplint/${name}`];
	}
	switch (name) {
		case 'config-presets': {
			return ['@markuplint/config-presets', 'markuplint:'];
		}
		case 'rules':
		case 'pretenders': {
			return [`@markuplint/${name}`];
		}
		default: {
			return null;
		}
	}
}

/**
 * The packages whose specs load rules, presets and pretenders through the configuration rather
 * than by an import: the CLI and the language server read a project's configuration.
 */
const CONFIGURATION_CONSUMERS = ['packages/markuplint/', 'packages/@markuplint/language-server/'];

/**
 * Root files that a spec reads by a path, and what runs for each of them.
 *
 * Each row comes from a spec that builds the path from `import.meta.dirname` or the root: the
 * pattern names the file, the specs read it. `completeness.spec.ts` fails when a spec reads
 * outside its own package and no row here accounts for it.
 */
const ROOT_INPUTS: readonly {
	readonly pattern: RegExp;
	readonly specs: (probe: Probe) => readonly string[];
}[] = [
	{
		// `packages/markuplint/src/**` read `test/fixture/**`; the isolated-environment manifests spec reads `test/isolated-env/**`.
		pattern: /^test\//,
		specs: probe => [
			...probe.specs.filter(spec => spec.startsWith('packages/markuplint/')),
			'packages/@markuplint/test-tools/src/isolated-env-manifests.spec.ts',
		],
	},
	{
		pattern: /^config\.schema\.json$/,
		specs: () => ['packages/@markuplint/ml-config/src/config-schema.spec.ts'],
	},
	{
		pattern: /^\.commitlintrc/,
		specs: () => ['packages/@markuplint/test-tools/src/commitlint-breaking-change.spec.ts'],
	},
	{
		// The JSON Schemas that the generated spec data is validated against.
		pattern: /^packages\/@markuplint\/(?:ml-spec\/schemas\/|types\/types\.schema\.json$)/,
		specs: () => ['packages/@markuplint/html-spec/test/structure.spec.mjs'],
	},
];

/** Specs under a directory. */
function specsUnder(probe: Probe, directory: string): readonly string[] {
	return probe.specs.filter(spec => spec.startsWith(`${directory}/`));
}

/**
 * Packages whose build output is not passed to `vitest related`. `markuplint` and `file-resolver`
 * import the whole registry of `@markuplint/rules`, so its output is in the graph of every spec
 * that imports `markuplint` (all of the rule specs, through `mlRuleTest`), though a rule spec runs
 * the one rule it is given. The specs that do run the registry are named by `dynamicTokens()` and
 * `CONFIGURATION_CONSUMERS` instead.
 */
const WITHOUT_OUTPUT = new Set(['packages/@markuplint/rules']);

/**
 * Where tsc puts a source file of a package: `lib/` for most, `esm/` and `cjs/` for `i18n`.
 * Whichever of them exist is the answer, so that no table of packages has to be kept.
 */
function builtOutputs(probe: Probe, root: string, rel: string): readonly string[] {
	if (!rel.startsWith('src/') || DECLARATION_FILE.test(rel) || WITHOUT_OUTPUT.has(root)) {
		return [];
	}
	const stem = rel.slice('src/'.length).replace(SOURCE_FILE, '');
	return [`${root}/lib/${stem}.js`, `${root}/esm/${stem}.mjs`, `${root}/cjs/${stem}.js`].filter(path =>
		probe.exists(path),
	);
}

/**
 * Plans the specs for a set of changed files.
 *
 * @param changes - The files that differ from the merge base, with a deleted file marked `D`
 * @param probe - Access to the repository and to the specs it holds
 * @returns `full` for a file that cannot be placed, otherwise the paths to give `vitest related`
 */
export function plan(changes: readonly Change[], probe: Probe): Plan {
	const targets = new Set<string>();
	const add = (paths: readonly string[]) => {
		for (const path of paths) {
			targets.add(path);
		}
	};

	/** The package, or the directory of scripts, whose code or data changed. */
	const changedRoots = new Set<string>();

	for (const { status, path } of changes) {
		if (FULL_TRIGGERS.some(pattern => pattern.test(path))) {
			return { mode: 'full', reason: `${path} can change any spec` };
		}

		// The citation checks read rule READMEs, spec data, selector sources and the website docs.
		if (classifyCitation(path) !== null) {
			add(specsUnder(probe, 'scripts/spec-citations'));
		}

		const input = ROOT_INPUTS.find(({ pattern }) => pattern.test(path));
		if (input) {
			add(input.specs(probe));
		}

		const match = PACKAGE_PATH.exec(path);
		if (!match?.groups) {
			if (input || IGNORED.some(pattern => pattern.test(path)) || classifyCitation(path) !== null) {
				continue;
			}
			const outside = planOutsidePackages(status, path, probe);
			if (outside === null) {
				return { mode: 'full', reason: `${path} matches no rule of the selection` };
			}
			add(outside);
			changedRoots.add(path.split('/').slice(0, 2).join('/'));
			continue;
		}

		const { root = '', rel = '' } = match.groups;
		const name = root.slice(root.lastIndexOf('/') + 1);

		if (SPEC_FILE.test(rel)) {
			if (status !== 'D') {
				targets.add(path);
			}
			continue;
		}

		// Package-level documents that no spec reads. The scaffold of `create-rule` and the
		// source of the preset README are read, and fall through to the package's own specs.
		if (
			(/^(?:CHANGELOG|README(?:\.ja)?|CLAUDE|LICENSE)(?:\.md)?$/.test(rel) ||
				/^\.(?:npm|git)ignore$/.test(rel)) &&
			name !== 'create-rule'
		) {
			continue;
		}
		if (
			rel.endsWith('.md') &&
			name !== 'create-rule' &&
			path !== 'packages/@markuplint/config-presets/src/README.md'
		) {
			continue;
		}

		const whole = specsUnder(probe, root);
		const outputs = builtOutputs(probe, root, rel);
		if (status === 'D') {
			add(whole);
		} else if (rel.startsWith('src/') && SOURCE_FILE.test(rel)) {
			targets.add(path);
			if (outputs.length > 0 || DECLARATION_FILE.test(rel) || WITHOUT_OUTPUT.has(root)) {
				add(outputs);
			} else {
				// Not built: nothing for another package to import, and nothing to tell which spec reads it.
				add(whole);
			}
		} else {
			targets.add(path);
			add(whole);
		}

		changedRoots.add(root);

		const tokens = dynamicTokens(name);
		if (tokens !== null) {
			add(probe.specs.filter(spec => tokens.some(token => probe.read(spec).includes(token))));
			if (name === 'rules' || name === 'pretenders' || name === 'config-presets') {
				// The spawning ones are left to the rule on `CLI_RUNTIME` at the end.
				add(
					probe.specs.filter(
						spec =>
							CONFIGURATION_CONSUMERS.some(consumer => spec.startsWith(consumer)) &&
							!SPAWNING.test(probe.read(spec)),
					),
				);
			}
		}
	}

	const commandChanged = [...changedRoots].some(
		root => root.startsWith('packages/') && CLI_RUNTIME.has(packageName(root)),
	);
	add(
		probe.specs.filter(
			spec =>
				SPAWNING.test(probe.read(spec)) &&
				(commandChanged || [...changedRoots].some(root => spec.startsWith(`${root}/`))),
		),
	);

	return { mode: 'affected', targets: [...targets].toSorted() };
}

/**
 * Files outside `packages/` that a spec can reach. `null` when the file belongs to none of them.
 */
function planOutsidePackages(status: ChangeStatus, path: string, probe: Probe): readonly string[] | null {
	for (const directory of ['scripts', 'vscode/scripts', 'tests/external']) {
		if (!path.startsWith(`${directory}/`)) {
			continue;
		}
		const specs =
			directory === 'tests/external' ? specsUnder(probe, 'tests/external/bench') : specsUnder(probe, directory);
		if (SPEC_FILE.test(path)) {
			return status === 'D' ? [] : [path];
		}
		if (status !== 'D' && SOURCE_FILE.test(path)) {
			return [path];
		}
		return specs;
	}
	return null;
}
