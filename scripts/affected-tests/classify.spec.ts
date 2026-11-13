import type { Change, Probe } from './classify.ts';

import { describe, expect, test } from 'vitest';

import { plan } from './classify.ts';

const files: Record<string, string> = {
	'packages/@markuplint/ml-core/src/a.spec.ts': '',
	'packages/@markuplint/ml-core/src/b.spec.ts': '',
	'packages/@markuplint/rules/src/attr-order/index.spec.ts': "import { mlRuleTest } from 'markuplint';",
	'packages/@markuplint/rules/src/vue.spec.ts': "const vue = { parser: { '.*': '@markuplint/vue-parser' } };",
	'packages/@markuplint/rules/src/other.spec.ts': '',
	// Reads the sources of its package with `fs`, so no import of any spec reaches the code it checks
	'packages/@markuplint/rules/src/ja-locale-coverage.spec.ts': "import { glob } from '@markuplint/test-tools';",
	'packages/@markuplint/language-server/src/ja-locale-coverage.spec.ts':
		"import { glob } from '@markuplint/test-tools';",
	'packages/@markuplint/rules/src/multi-pass-fix.spec.ts': "const child = spawnSync('node', []);",
	'packages/@markuplint/shared/src/errors/runtime.spec.ts': "import { execFile } from 'node:child_process';",
	'packages/@markuplint/vue-parser/src/index.spec.ts': '',
	'packages/@markuplint/i18n/src/index.spec.ts': '',
	'packages/markuplint/src/cli/index.spec.ts': "const entry = path.resolve(dir, '../../bin/markuplint.mjs');",
	'packages/markuplint/src/api/lint.spec.ts': '',
	'packages/@markuplint/language-server/src/server/server.spec.ts': '',
	'packages/@markuplint/test-tools/src/isolated-env-manifests.spec.ts': '',
	'packages/@markuplint/ml-config/src/config-schema.spec.ts': '',
	'packages/@markuplint/html-spec/test/structure.spec.mjs': '',
	'scripts/spec-citations/check.spec.ts': '',
	'scripts/spec-citations/discover.spec.ts': '',
	'scripts/spec-citations/cli.spec.ts': "const child = spawnSync('node', []);",
	'tests/external/bench/xref-issue.spec.ts': '',
	'vscode/scripts/build.spec.ts': '',
	// Run with a preset by its prefix, and with the pretenders package by its name, without being
	// in a package that the plan already ties to them.
	'packages/@markuplint/ml-core/src/preset.spec.ts': "const config = { extends: ['markuplint:recommended'] };",
	'packages/@markuplint/ml-core/src/pretender.spec.ts': "import x from '@markuplint/pretenders';",
};

const built = new Set([
	'packages/@markuplint/ml-core/lib/a.js',
	'packages/@markuplint/ml-core/lib/b.js',
	'packages/@markuplint/ml-core/lib/index.js',
	'packages/@markuplint/rules/lib/attr-order/index.js',
	'packages/@markuplint/vue-parser/lib/index.js',
	'packages/@markuplint/i18n/esm/index.mjs',
	'packages/@markuplint/i18n/cjs/index.js',
]);

const probe: Probe = {
	specs: Object.keys(files),
	exists: path => built.has(path),
	read: path => {
		const text = files[path];
		if (text === undefined) {
			throw new Error(`The fake probe has no spec at ${path}: a typo in the table above?`);
		}
		return text;
	},
};

const modified = (path: string): Change => ({ status: 'M', path });

function affected(...changes: Change[]): readonly string[] {
	const result = plan(changes, probe);
	if (result.mode === 'full') {
		throw new Error(`expected an affected plan, got full: ${result.reason}`);
	}
	return result.targets;
}

describe('a file that can change any spec', () => {
	test.each([
		'yarn.lock',
		'package.json',
		'packages/@markuplint/ml-core/package.json',
		'tsconfig.spec.json',
		'packages/@markuplint/ml-core/tsconfig.build.json',
		'vitest.config.ts',
		'vitest.cross-os.config.ts',
		'vitest.nu-validator.config.ts',
		'lerna.json',
		'.yarnrc.yml',
		'packages/@markuplint-dev/tsconfig/tsconfig.json',
		'packages/@markuplint/html-spec/index.js',
		'packages/@markuplint/html-spec/index.d.ts',
		'packages/@markuplint/i18n/$schema.json',
		'nx.json',
		'.github/workflows/test.yml',
		'scripts/affected-tests/classify.ts',
		'packages/@markuplint/test-tools/src/package-exports.spec.ts',
		'packages/@markuplint/html-spec/index.json',
		'packages/@markuplint/html-spec/src/spec.a.jsonc',
		'packages/@markuplint/i18n/locales/ja.json',
		'packages/@markuplint-test/react/src/index.tsx',
	])('%s makes the plan full', path => {
		expect(plan([modified(path)], probe).mode).toBe('full');
	});
});

// `crates/` is a directory of the v6 line, which no rule is written for: that it makes the plan
// full is the same fact as for any directory that nobody thought of.
describe('a file that no rule recognises', () => {
	test.each(['crates/core/src/lib.rs', 'unknown-dir/file.txt', 'new-root-file.json'])(
		'%s makes the plan full',
		path => {
			expect(plan([modified(path)], probe).mode).toBe('full');
		},
	);
});

describe('a file that no spec reads', () => {
	test.each([
		'.claude/skills/git/SKILL.md',
		'.github/workflows/website.yml',
		'.github/workflows/nightly.yml',
		'website/src/pages/index.tsx',
		'CLAUDE.md',
		'.oxlintrc.json',
		'.oxfmtrc.json',
		'.textlintrc.json',
		'.husky/pre-commit',
		'.vscode/settings.json',
		'skills/markuplint/SKILL.md',
		'vscode/src/extension.ts',
		'LICENSE',
		'.gitignore',
		'renovate.json5',
		'packages/@markuplint/ml-core/CHANGELOG.md',
		'packages/@markuplint/ml-core/README.md',
		'packages/@markuplint/ml-core/CLAUDE.md',
		'scripts/spec-citations/spec-citations.lock.json',
	])('%s selects nothing, not even the specs that spawn a process', path => {
		expect(affected(modified(path))).toStrictEqual([]);
	});
});

describe('a source file of a package', () => {
	test('is passed with its build output, and the specs that spawn a process run', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/a.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/lib/a.js');
		expect(targets).toContain('packages/markuplint/src/cli/index.spec.ts');
		expect(targets).not.toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});

	test('of i18n is passed with its ESM and CommonJS outputs', () => {
		const targets = affected(modified('packages/@markuplint/i18n/src/index.ts'));
		expect(targets).toContain('packages/@markuplint/i18n/esm/index.mjs');
		expect(targets).toContain('packages/@markuplint/i18n/cjs/index.js');
	});

	test('that has no build output runs every spec of its package', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/new-file.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});

	test('a type declaration runs the specs of its package, as nothing is emitted for it', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/types.d.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/types.d.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});
});

describe('the locale guard of a package', () => {
	test('runs for a source file of its package, with or without a build output, as it reads the sources with `fs`', () => {
		expect(affected(modified('packages/@markuplint/rules/src/attr-order/index.ts'))).toContain(
			'packages/@markuplint/rules/src/ja-locale-coverage.spec.ts',
		);
		expect(affected(modified('packages/@markuplint/language-server/src/server/new-file.ts'))).toContain(
			'packages/@markuplint/language-server/src/ja-locale-coverage.spec.ts',
		);
	});

	test('runs for the locale file of its package, which it reads, as for any file that is not source', () => {
		expect(affected(modified('packages/@markuplint/language-server/locales/ja.json'))).toContain(
			'packages/@markuplint/language-server/src/ja-locale-coverage.spec.ts',
		);
	});

	test('does not run for a source file of another package', () => {
		expect(affected(modified('packages/@markuplint/ml-core/src/a.ts'))).not.toContain(
			'packages/@markuplint/rules/src/ja-locale-coverage.spec.ts',
		);
	});
});

describe('a file of a package that is not source', () => {
	test('runs every spec of the package', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/fixtures/x.html'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});

	test.each([
		'packages/@markuplint/ml-core/src/gone.ts',
		'packages/@markuplint/ml-core/fixtures/gone.html',
		'scripts/gone.ts',
	])('a deleted %s makes the plan full', path => {
		expect(plan([{ status: 'D', path }], probe).mode).toBe('full');
	});

	test('the README of markuplint runs the spec that keeps its `--help` copy, and nothing else', () => {
		const readmeSpec = 'packages/markuplint/src/cli/readme-help.spec.ts';
		const withReadmeSpec: Probe = {
			...probe,
			specs: [...probe.specs, readmeSpec],
			read: path => (path === readmeSpec ? '' : probe.read(path)),
		};
		expect(plan([modified('packages/markuplint/README.md')], withReadmeSpec)).toStrictEqual({
			mode: 'affected',
			targets: [readmeSpec],
		});
	});

	test('a Markdown file of another package selects nothing', () => {
		expect(affected(modified('packages/@markuplint/ml-core/docs/notes.md'))).toStrictEqual([]);
	});
});

describe('a spec file', () => {
	test('runs by itself, and the specs that spawn a process do not', () => {
		expect(affected(modified('packages/@markuplint/ml-core/src/a.spec.ts'))).toStrictEqual([
			'packages/@markuplint/ml-core/src/a.spec.ts',
		]);
	});

	test('a deleted spec selects nothing', () => {
		expect(affected({ status: 'D', path: 'packages/@markuplint/ml-core/src/a.spec.ts' })).toStrictEqual([]);
	});
});

describe('a package that a configuration names', () => {
	test('a parser runs the specs that name it', () => {
		const targets = affected(modified('packages/@markuplint/vue-parser/src/index.ts'));
		expect(targets).toContain('packages/@markuplint/rules/src/vue.spec.ts');
		expect(targets).not.toContain('packages/@markuplint/rules/src/other.spec.ts');
	});

	test('a rule runs the specs of the packages that load rules from a configuration', () => {
		const targets = affected(modified('packages/@markuplint/rules/src/attr-order/index.ts'));
		expect(targets).toContain('packages/@markuplint/rules/src/attr-order/index.ts');
		expect(targets).toContain('packages/markuplint/src/api/lint.spec.ts');
		expect(targets).toContain('packages/@markuplint/language-server/src/server/server.spec.ts');
		expect(targets).not.toContain('packages/@markuplint/rules/src/other.spec.ts');
	});

	test('a rule does not pass its build output, which every spec of markuplint would reach', () => {
		const targets = affected(modified('packages/@markuplint/rules/src/attr-order/index.ts'));
		expect(targets).not.toContain('packages/@markuplint/rules/lib/attr-order/index.js');
	});
});

describe('the specs that spawn a process', () => {
	test('run for a change to the code that the command executes', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/a.ts'));
		expect(targets).toContain('packages/markuplint/src/cli/index.spec.ts');
		expect(targets).toContain('packages/@markuplint/rules/src/multi-pass-fix.spec.ts');
	});

	test('include a spec that names the module that starts the process, not one call form of it', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/a.ts'));
		expect(targets).toContain('packages/@markuplint/shared/src/errors/runtime.spec.ts');
	});

	test('run only for their own package when a rule changes', () => {
		const targets = affected(modified('packages/@markuplint/rules/src/attr-order/index.ts'));
		expect(targets).toContain('packages/@markuplint/rules/src/multi-pass-fix.spec.ts');
		expect(targets).not.toContain('packages/markuplint/src/cli/index.spec.ts');
	});

	test('do not run for a parser of which no spec of the package spawns', () => {
		const targets = affected(modified('packages/@markuplint/vue-parser/src/index.ts'));
		expect(targets).not.toContain('packages/markuplint/src/cli/index.spec.ts');
	});
});

describe('a file at the root that a spec reads', () => {
	test('a fixture under test/ runs the specs of markuplint and the manifest check', () => {
		const targets = affected(modified('test/fixture/001.html'));
		expect(targets).toContain('packages/markuplint/src/cli/index.spec.ts');
		expect(targets).toContain('packages/markuplint/src/api/lint.spec.ts');
		expect(targets).toContain('packages/@markuplint/test-tools/src/isolated-env-manifests.spec.ts');
	});

	// The manifest check is what a pull request has of the sandboxes now: they run in `nightly.yml`.
	test('the pnpm workspace file of a sandbox runs the manifest check', () => {
		expect(affected(modified('test/isolated-env/ts/pnpm-workspace.yaml'))).toContain(
			'packages/@markuplint/test-tools/src/isolated-env-manifests.spec.ts',
		);
	});

	test('the config schema runs its spec', () => {
		expect(affected(modified('config.schema.json'))).toStrictEqual([
			'packages/@markuplint/ml-config/src/config-schema.spec.ts',
		]);
	});

	test('a schema of ml-spec runs the structure check of html-spec', () => {
		const targets = affected(modified('packages/@markuplint/ml-spec/schemas/aria.schema.json'));
		expect(targets).toContain('packages/@markuplint/html-spec/test/structure.spec.mjs');
	});
});

describe('a file that a citation check reads', () => {
	test('a rule README runs the citation specs and nothing else', () => {
		const targets = affected(modified('packages/@markuplint/rules/src/attr-order/README.md'));
		expect(targets).toStrictEqual([
			'scripts/spec-citations/check.spec.ts',
			'scripts/spec-citations/cli.spec.ts',
			'scripts/spec-citations/discover.spec.ts',
		]);
	});

	test('a page of the website docs runs the citation specs', () => {
		expect(affected(modified('website/docs/rules/index.md'))).toContain('scripts/spec-citations/check.spec.ts');
	});
});

describe('a file outside packages that a spec imports', () => {
	test('a script is passed as it is, with the specs of its directory that spawn a process', () => {
		expect(affected(modified('scripts/spec-citations/collect.ts'))).toStrictEqual([
			'scripts/spec-citations/cli.spec.ts',
			'scripts/spec-citations/collect.ts',
		]);
	});

	test('a script right under scripts/ runs the spawning specs under scripts/', () => {
		expect(affected(modified('scripts/foo.ts'))).toContain('scripts/spec-citations/cli.spec.ts');
	});

	test('a spec outside packages runs by itself, not with the spawning specs next to it', () => {
		expect(affected(modified('scripts/spec-citations/check.spec.ts'))).toStrictEqual([
			'scripts/spec-citations/check.spec.ts',
		]);
	});

	test('a data file of the benchmark runs its specs', () => {
		expect(affected(modified('tests/external/bench/data.json'))).toStrictEqual([
			'tests/external/bench/xref-issue.spec.ts',
		]);
	});

	test('a script of vscode is passed as it is, and its data runs the specs there', () => {
		expect(affected(modified('vscode/scripts/build.ts'))).toStrictEqual(['vscode/scripts/build.ts']);
		expect(affected(modified('vscode/scripts/data.json'))).toStrictEqual(['vscode/scripts/build.spec.ts']);
	});

	test('a script outside the benchmark under tests/external runs the benchmark specs, as they read it', () => {
		expect(affected(modified('tests/external/spec/foo.json'))).toStrictEqual([
			'tests/external/bench/xref-issue.spec.ts',
		]);
	});
});

describe('a file at the root that the commit lint spec reads', () => {
	test('runs that spec', () => {
		expect(affected(modified('.commitlintrc.js'))).toStrictEqual([
			'packages/@markuplint/test-tools/src/commitlint-breaking-change.spec.ts',
		]);
	});
});

describe('a package that a spec names by a token', () => {
	test('a preset package runs the specs that extend a preset by its prefix', () => {
		const targets = affected(modified('packages/@markuplint/config-presets/src/preset.recommended.jsonc'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/preset.spec.ts');
		expect(targets).toContain('packages/markuplint/src/api/lint.spec.ts');
	});

	test('the pretenders package runs the specs that name it', () => {
		const targets = affected(modified('packages/@markuplint/pretenders/src/scan.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/pretender.spec.ts');
		expect(targets).toContain('packages/@markuplint/language-server/src/server/server.spec.ts');
	});
});

describe('an added file', () => {
	const added = (path: string): Change => ({ status: 'A', path });

	test('is planned as a modified one when it has a build output', () => {
		expect(affected(added('packages/@markuplint/ml-core/src/a.ts'))).toStrictEqual(
			affected(modified('packages/@markuplint/ml-core/src/a.ts')),
		);
	});

	test('runs every spec of its package when it has none', () => {
		const targets = affected(added('packages/@markuplint/ml-core/src/new.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/new.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});

	test('a new spec runs by itself', () => {
		expect(affected(added('packages/@markuplint/ml-core/src/new.spec.ts'))).toStrictEqual([
			'packages/@markuplint/ml-core/src/new.spec.ts',
		]);
	});
});
