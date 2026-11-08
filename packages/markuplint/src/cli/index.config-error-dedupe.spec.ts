// One of the `index*.spec.ts` that hold the CLI specs by topic; `index.spec.ts` says why.
import path from 'node:path';

import { execa } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

const entryFilePath = path.resolve(import.meta.dirname, '../../bin/markuplint.mjs');

const escape = (path: string) => path.replaceAll('\\', '\\\\'); // For Windows

describe('config-level violation deduplication', () => {
	// `config.json` deliberately mixes both config-level channels: two
	// deprecated-but-working rule names (`id-duplication`, `required-attr`)
	// and one genuinely unresolved rule reference (`no-such-rule`) — so the
	// dedupe and failed-file logic (`CONFIG_LEVEL_RULE_IDS` in `command.ts`)
	// is exercised for `rule-deprecation` and `config-error` together, not
	// just whichever channel happens to be under test.
	const fixtureDir = path.resolve(import.meta.dirname, '../../test/config-error-dedupe');
	const configPath = path.join(fixtureDir, 'config.json');
	const targetFiles = ['clean-1.html', 'clean-2.html', 'clean-3.html'].map(name => path.join(fixtureDir, name));

	test('the same deprecated-rule message is reported once per run, not once per file', async () => {
		const { stdout } = await execa(
			entryFilePath,
			['--config', escape(configPath), '--no-search-config', '--format', 'json', ...targetFiles.map(escape)],
			{ reject: false },
		);

		const violations = JSON.parse(stdout) as { ruleId: string; message: string; filePath: string }[];
		const deprecationMessages = violations.filter(v => v.ruleId === 'rule-deprecation').map(v => v.message);

		// Two deprecated rule names in the config, three identical files: without
		// dedupe this would be 6 (one pair per file), not 2.
		expect(deprecationMessages).toHaveLength(2);
		expect(new Set(deprecationMessages).size).toBe(2);
	});

	test('the same genuine config-error message is reported once per run, not once per file', async () => {
		const { stdout } = await execa(
			entryFilePath,
			['--config', escape(configPath), '--no-search-config', '--format', 'json', ...targetFiles.map(escape)],
			{ reject: false },
		);

		const violations = JSON.parse(stdout) as { ruleId: string; message: string; filePath: string }[];
		const configErrorMessages = violations.filter(v => v.ruleId === 'config-error').map(v => v.message);

		// One unresolved rule reference in the config, three identical files:
		// without dedupe this would be 3, not 1.
		expect(configErrorMessages).toStrictEqual(['Rule not found: no-such-rule']);
	});

	test('a file whose only violations are config-level counts as passed, not failed', async () => {
		const { stderr } = await execa(
			entryFilePath,
			['--config', escape(configPath), '--no-search-config', ...targetFiles.map(escape)],
			{ reject: false },
		);

		// All three files are clean HTML; the config-level deprecation notices
		// and the genuine config-error are attributed to whichever file
		// reports them first, but none of the files has a markup violation of
		// its own.
		expect(stderr).toContain('3 files checked: 3 passed, 0 failed');
	});

	test('--show-config details surfaces deprecated-rule-name notices', async () => {
		// `--show-config` resolves the config only (via `MLEngine#resolveConfig`),
		// without resolving it against the loaded rule set — so "Rule not
		// found" (computed later, inside `MLCore.verify()`) doesn't appear
		// here even though `no-such-rule` triggers it at lint time (see the
		// "genuine config-error" test above). Rule-alias expansion, in
		// contrast, runs as part of `resolveConfig` itself, so deprecation
		// notices ARE visible at this stage.
		const { stdout } = await execa(
			entryFilePath,
			['--config', escape(configPath), '--no-search-config', '--show-config', 'details', escape(targetFiles[0]!)],
			{ reject: false },
		);

		const data = JSON.parse(stdout) as {
			ruleDeprecations: readonly { deprecatedName: string; replacedBy: readonly string[] }[];
		};

		expect(data.ruleDeprecations).toStrictEqual(
			expect.arrayContaining([
				{ deprecatedName: 'id-duplication', replacedBy: ['no-duplicate-id'] },
				{ deprecatedName: 'required-attr', replacedBy: ['require-attr'] },
			]),
		);
		expect(data.ruleDeprecations).toHaveLength(2);
	});

	test('--show-config details surfaces which overrides glob(s) matched the target file', async () => {
		const fixtureDir = path.resolve(import.meta.dirname, '../../test/show-config-overrides');
		const overridesConfigPath = path.join(fixtureDir, 'config.json');
		const overridesTargetFile = path.join(fixtureDir, 'target.html');

		const { stdout } = await execa(
			entryFilePath,
			[
				'--config',
				escape(overridesConfigPath),
				'--no-search-config',
				'--show-config',
				'details',
				escape(overridesTargetFile),
			],
			{ reject: false },
		);

		const data = JSON.parse(stdout) as { appliedOverrides: readonly string[] };

		expect(data.appliedOverrides).toStrictEqual([path.join(fixtureDir, 'target.*')]);
	});
});
