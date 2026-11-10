/**
 * Chooses the specs that a pull request has to run, from the files it changed.
 *
 * The goal is a fast answer on a pull request, which runs on Linux and Node.js 26 only. The whole
 * suite runs in the merge queue, which every merge into `dev` goes through (a repository admin can
 * bypass it), and on every platform and runtime in the nightly tests (`nightly.yml`), so this
 * module is allowed to be an approximation, but never in the direction of
 * running too little for a file it cannot place: **a path that no rule below recognises makes the
 * plan `full`**, as does a deleted file and, on a branch that has `crates/` (the v6 line), anything
 * under it: no rule here is written for the Rust workspace, and adding one is how that line gets a
 * faster pull request.
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

/**
 * How git reports a file against the merge base. A rename is a deletion and an addition (the diff
 * is taken with `--no-renames`), and any other status is treated as `M`.
 */
export type ChangeStatus = 'A' | 'M' | 'D';

/** A file that differs from the merge base. */
export interface Change {
	readonly status: ChangeStatus;
	/** Repository-relative, with `/` separators. */
	readonly path: string;
}

/** What the plan reads from the repository, so that a spec can supply a small one. */
export interface Probe {
	exists(path: string): boolean;
	/**
	 * Every spec file that the default vitest config includes. A run with another config
	 * (`--config vitest.cross-os.config.ts`, after `--`) is given the same plan, and vitest keeps the
	 * specs that config includes: that set is a subset of this one.
	 */
	readonly specs: readonly string[];
	read(path: string): string;
}

/**
 * What to run: `full` is the whole suite, with the reason, and `affected` is the paths to give
 * `vitest related`: changed files, build outputs, and specs.
 */
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
	// The source of that data: `html-spec/CLAUDE.md` asks for the whole suite before a commit that
	// touches it, as the data reaches the rule specs.
	/^packages\/@markuplint\/html-spec\/src\//,
	/^packages\/@markuplint\/i18n\/(?:locales\/|\$schema\.json$)/,
];

/**
 * Outside `packages/`, files that no spec reads, checked after `FULL_TRIGGERS` (which holds
 * `test.yml`). `nightly.yml` is here with the other workflows: it runs on a schedule, and no pull
 * request run of the selection depends on it. So a pull request that edits it, or
 * `vitest.cross-os.config.ts` (which `nightly.yml` runs, and which the full trigger for
 * `vitest*.config.ts` answers with the default suite, a run that does not use it), exercises none
 * of that before the merge; the workflow can be started on the branch (`workflow_dispatch`).
 */
const IGNORED: readonly RegExp[] = [
	/^\.claude\//,
	/^\.github\//,
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
 * the specs, so that a new one is picked up without an edit here. The names are those of the
 * modules and calls that start a process (`child_process`, `execa`, a worker) rather than of one
 * call form, and a word in a comment selects the spec too, which only runs more.
 */
export const SPAWNING = /child_process|\bexeca|\bnew Worker\(|\bspawn|\bexecFile|\bexecSync|\bfork\(|bin\/markuplint/;

/**
 * The packages that every run of the `markuplint` command executes: its dependencies, less what a
 * configuration selects (`LOADED_BY_CONFIGURATION`). A change to one of them runs the specs that
 * spawn a process, wherever they are. A change to any other package runs only the spawning specs
 * of that package, as a rule or a parser changes what a spawned command reports only for the
 * inputs that use it; the merge queue and the nightly tests run the rest.
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

/** How a spec comes to run with a package that no import links to it. */
interface DynamicPackage {
	/** What in the text of a spec shows that it runs with the package. */
	readonly tokens: readonly string[];
	/** Whether the CLI and the language server load it from a project's configuration. */
	readonly loadedByConsumers: boolean;
}

/**
 * The packages that `generalImport()` loads by the name a configuration gives, so that no import
 * links them to the specs that run with them. A spec that names the package runs with it.
 *
 * @param name - The package name without its scope
 * @returns `null` for a package that is imported
 */
function dynamicPackage(name: string): DynamicPackage | null {
	// `ml-spec` ends in `-spec` but is the library that the spec packages are written with: it is
	// imported, never named by a configuration.
	if ((name.endsWith('-spec') && name !== 'ml-spec') || name.endsWith('-parser')) {
		return { tokens: [`@markuplint/${name}`], loadedByConsumers: false };
	}
	switch (name) {
		case 'config-presets': {
			// `markuplint:` is the prefix of a preset that a configuration extends (`markuplint:recommended`),
			// which a spec writes without naming the package.
			return { tokens: ['@markuplint/config-presets', 'markuplint:'], loadedByConsumers: true };
		}
		case 'rules':
		case 'pretenders': {
			return { tokens: [`@markuplint/${name}`], loadedByConsumers: true };
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
export const CONFIGURATION_CONSUMERS = ['packages/markuplint/', 'packages/@markuplint/language-server/'];

/**
 * Root files that a spec reads by a path, and what runs for each of them.
 *
 * Each row comes from a spec that builds the path from `import.meta.dirname` or the root: the
 * pattern names the file, the specs read it. `completeness.spec.ts` fails when a spec names a file
 * outside its own package by a relative path literal (`'../../x'`) and no row here accounts for it;
 * a path that is built in pieces (`path.join(dir, '..', 'x')`) or from the root is not found there.
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
export const WITHOUT_OUTPUT = new Set(['packages/@markuplint/rules']);

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

		// The citation checks read the sources of every package, the rule READMEs, the spec data and the website docs
		// (`scripts/spec-citations/discover.ts`), so a change to any of them can add or break a citation.
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
			// A spec that changed runs by itself. Any other file is a change to the code that a spawned
			// process may run, owned by its directory: two segments deep, or the one directory of a file
			// that sits right under `scripts/`.
			if (!SPEC_FILE.test(path)) {
				const segments = path.split('/');
				changedRoots.add(segments.slice(0, Math.min(2, segments.length - 1)).join('/'));
			}
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

		// A deleted file leaves nothing for `vitest related` to follow: its importers changed with it,
		// or reach it by a name or a path that no graph holds.
		if (status === 'D') {
			return { mode: 'full', reason: `${path} was deleted` };
		}

		const whole = specsUnder(probe, root);
		const outputs = builtOutputs(probe, root, rel);
		if (rel.startsWith('src/') && SOURCE_FILE.test(rel)) {
			targets.add(path);
			if (DECLARATION_FILE.test(rel)) {
				// Nothing is emitted for a declaration, so no spec of another package reaches it, and what
				// it types is checked by `yarn test:types`; the specs of the package run with it.
				add(whole);
			} else if (outputs.length > 0 || WITHOUT_OUTPUT.has(root)) {
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

		const dynamic = dynamicPackage(name);
		if (dynamic !== null) {
			add(probe.specs.filter(spec => dynamic.tokens.some(token => probe.read(spec).includes(token))));
			if (dynamic.loadedByConsumers) {
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
		if (status === 'D') {
			return null;
		}
		if (SOURCE_FILE.test(path)) {
			return [path];
		}
		return specs;
	}
	return null;
}
