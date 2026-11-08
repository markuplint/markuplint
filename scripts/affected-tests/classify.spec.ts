import type { Change, Probe } from './classify.ts';

import { describe, expect, test } from 'vitest';

import { plan } from './classify.ts';

const files: Record<string, string> = {
	'packages/@markuplint/ml-core/src/a.spec.ts': '',
	'packages/@markuplint/ml-core/src/b.spec.ts': '',
	'packages/@markuplint/rules/src/attr-order/index.spec.ts': "import { mlRuleTest } from 'markuplint';",
	'packages/@markuplint/rules/src/vue.spec.ts': "const vue = { parser: { '.*': '@markuplint/vue-parser' } };",
	'packages/@markuplint/rules/src/other.spec.ts': '',
	'packages/@markuplint/rules/src/multi-pass-fix.spec.ts': "const child = spawnSync('node', []);",
	'packages/@markuplint/vue-parser/src/index.spec.ts': '',
	'packages/@markuplint/i18n/src/index.spec.ts': '',
	'packages/@markuplint/create-rule/src/transfer.spec.ts': '',
	'packages/markuplint/src/cli/index.spec.ts': "const entry = path.resolve(dir, '../../bin/markuplint.mjs');",
	'packages/markuplint/src/api/lint.spec.ts': '',
	'packages/@markuplint/language-server/src/server/server.spec.ts': '',
	'packages/@markuplint/test-tools/src/isolated-env-manifests.spec.ts': '',
	'packages/@markuplint/ml-config/src/config-schema.spec.ts': '',
	'packages/@markuplint/html-spec/test/structure.spec.mjs': '',
	'scripts/spec-citations/check.spec.ts': '',
	'scripts/spec-citations/discover.spec.ts': '',
	'tests/external/bench/xref-issue.spec.ts': '',
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
	read: path => files[path] ?? '',
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
		'nx.json',
		'.github/workflows/test.yml',
		'scripts/affected-tests/classify.ts',
		'packages/@markuplint/test-tools/src/package-exports.spec.ts',
		'packages/@markuplint/html-spec/index.json',
		'packages/@markuplint/i18n/locales/ja.json',
		'packages/@markuplint-test/react/src/index.tsx',
	])('%s makes the plan full', path => {
		expect(plan([modified(path)], probe).mode).toBe('full');
	});
});

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
		'website/src/pages/index.tsx',
		'CLAUDE.md',
		'.oxlintrc.json',
		'packages/@markuplint/ml-core/CHANGELOG.md',
		'packages/@markuplint/ml-core/README.md',
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

	test('a type declaration is passed as it is', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/src/types.d.ts'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/types.d.ts');
		expect(targets).not.toContain('packages/@markuplint/ml-core/src/a.spec.ts');
	});
});

describe('a file of a package that is not source', () => {
	test('runs every spec of the package', () => {
		const targets = affected(modified('packages/@markuplint/ml-core/fixtures/x.html'));
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
		expect(targets).toContain('packages/@markuplint/ml-core/src/b.spec.ts');
	});

	test('a deleted file runs every spec of the package', () => {
		const targets = affected({ status: 'D', path: 'packages/@markuplint/ml-core/src/gone.ts' });
		expect(targets).toContain('packages/@markuplint/ml-core/src/a.spec.ts');
	});

	test('a Markdown file of create-rule runs its specs, as they read the scaffold', () => {
		const targets = affected(modified('packages/@markuplint/create-rule/scaffold/core/README.md'));
		expect(targets).toContain('packages/@markuplint/create-rule/src/transfer.spec.ts');
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
	test('a rule README runs the citation specs and nothing that spawns a process', () => {
		const targets = affected(modified('packages/@markuplint/rules/src/attr-order/README.md'));
		expect(targets).toStrictEqual([
			'scripts/spec-citations/check.spec.ts',
			'scripts/spec-citations/discover.spec.ts',
		]);
	});

	test('a page of the website docs runs the citation specs', () => {
		expect(affected(modified('website/docs/rules/index.md'))).toContain('scripts/spec-citations/check.spec.ts');
	});
});

describe('a file outside packages that a spec imports', () => {
	test('a script is passed as it is', () => {
		expect(affected(modified('scripts/spec-citations/collect.ts'))).toStrictEqual([
			'scripts/spec-citations/collect.ts',
		]);
	});

	test('a data file of the benchmark runs its specs', () => {
		expect(affected(modified('tests/external/bench/data.json'))).toStrictEqual([
			'tests/external/bench/xref-issue.spec.ts',
		]);
	});
});
