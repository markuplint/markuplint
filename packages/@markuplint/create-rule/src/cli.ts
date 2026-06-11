import type {
	CreateRuleCreatorCoreParams,
	CreateRuleHelperParams,
	CreateRuleLanguage,
	CreateRulePurpose,
} from './types.js';

import path from 'node:path';
import { parseArgs } from 'node:util';

import { input, installModule, select, confirm, font, header, xterm } from '@markuplint/cli-utils';

import { createRuleHelper } from './create-rule-helper.js';
import { isMarkuplintRepo } from './is-markuplint-repo.js';

const KEBAB_CASE = /^[a-z][\da-z]*(?:-[a-z][\da-z]*)*$/i;

const CATEGORIES = ['validation', 'a11y', 'naming-convention', 'maintainability', 'style'] as const;
const SEVERITIES = ['error', 'warning'] as const;

const PURPOSE_MAP: Record<string, CreateRulePurpose> = {
	project: 'ADD_TO_PROJECT',
	package: 'PUBLISH_AS_PACKAGE',
	core: 'CONTRIBUTE_TO_CORE',
};

const icons: Record<string, string> = {
	README: '📝',
	index: '📜',
	schema: '⚙️ ',
	package: '🎁',
	tsconfig: '💎',
};

function printHelp() {
	process.stdout.write(`
Usage: create-rule [options]

  Without options, starts the interactive wizard.
  With options, creates a rule non-interactively.

Options:
  -p, --purpose <type>       Purpose: project, package, or core (required)
  -n, --plugin-name <name>   Plugin/directory name (required for project/package)
  -r, --rule-name <name>     Rule name in kebab-case (required)
  -l, --lang <lang>          Language: ts or js (default: ts, ignored for core)
  -t, --test                 Generate test files (default: true)
      --no-test              Skip test file generation
  -d, --description <text>   Rule description (required for core)
  -c, --category <cat>       Category (required for core):
                               validation, a11y, naming-convention,
                               maintainability, style
  -s, --severity <level>     Severity: error or warning (required for core)
      --json                 Output result as JSON
  -h, --help                 Show this help message

Examples:
  # Add a rule to this project
  create-rule -p project -n my-plugin -r no-empty-alt

  # Create a publishable package
  create-rule -p package -n my-plugin -r no-empty-alt -l js --no-test

  # Contribute to core
  create-rule -p core -r no-empty-alt -d "Disallow empty alt" -c a11y -s error
`);
}

/**
 * Sentinel for a successful early exit on `--help`, avoiding `process.exit`.
 */
class HelpRequested {
	readonly code = 0;
}

class UsageHintError extends Error {
	constructor(message: string) {
		super(`${message}\nRun 'create-rule --help' for usage.`);
		this.name = 'UsageHintError';
	}
}

/**
 * @returns The parsed parameters, or `null` when no arguments are provided
 *          (indicating interactive mode).
 * @throws {HelpRequested} When `--help` is passed.
 * @throws {UsageHintError} When required options are missing or values are invalid.
 */
function parseCliArgs(): { params: CreateRuleHelperParams; json: boolean } | null {
	const { values } = parseArgs({
		options: {
			purpose: { type: 'string', short: 'p' },
			'plugin-name': { type: 'string', short: 'n' },
			'rule-name': { type: 'string', short: 'r' },
			lang: { type: 'string', short: 'l' },
			test: { type: 'boolean', short: 't', default: true },
			'no-test': { type: 'boolean', default: false },
			description: { type: 'string', short: 'd' },
			category: { type: 'string', short: 'c' },
			severity: { type: 'string', short: 's' },
			json: { type: 'boolean', default: false },
			help: { type: 'boolean', short: 'h', default: false },
		},
		strict: true,
	});

	if (values.help) {
		printHelp();
		throw new HelpRequested();
	}

	// No arguments → interactive mode
	if (!values.purpose && !values['rule-name'] && !values['plugin-name']) {
		return null;
	}

	// Validate purpose
	if (!values.purpose) {
		throw new UsageHintError('--purpose is required in non-interactive mode');
	}
	const purpose = PURPOSE_MAP[values.purpose];
	if (!purpose) {
		throw new UsageHintError(`Invalid --purpose "${values.purpose}". Must be one of: project, package, core`);
	}

	// Validate rule name
	if (!values['rule-name']) {
		throw new UsageHintError('--rule-name is required');
	}
	const ruleName = values['rule-name'];
	if (!KEBAB_CASE.test(ruleName)) {
		throw new UsageHintError(`Invalid --rule-name "${ruleName}". Must be kebab-case (e.g., "no-empty-alt")`);
	}

	// Validate plugin name
	let pluginName = '';
	if (purpose !== 'CONTRIBUTE_TO_CORE') {
		if (!values['plugin-name']) {
			throw new UsageHintError('--plugin-name is required for project/package purpose');
		}
		pluginName = values['plugin-name'];
		if (!KEBAB_CASE.test(pluginName)) {
			throw new UsageHintError(`Invalid --plugin-name "${pluginName}". Must be kebab-case (e.g., "my-plugin")`);
		}
	}

	// Language
	let lang: CreateRuleLanguage;
	if (purpose === 'CONTRIBUTE_TO_CORE') {
		lang = 'TYPESCRIPT';
	} else {
		switch (values.lang ?? 'ts') {
			case 'ts': {
				lang = 'TYPESCRIPT';
				break;
			}
			case 'js': {
				lang = 'JAVASCRIPT';
				break;
			}
			default: {
				throw new UsageHintError(`Invalid --lang "${values.lang}". Must be "ts" or "js"`);
			}
		}
	}

	// Test
	const needTest = purpose === 'CONTRIBUTE_TO_CORE' ? true : !values['no-test'];

	// Core-specific params
	let core: CreateRuleCreatorCoreParams | undefined;
	if (purpose === 'CONTRIBUTE_TO_CORE') {
		if (!values.description) {
			throw new UsageHintError('--description is required for core purpose');
		}
		if (!values.category) {
			throw new UsageHintError('--category is required for core purpose');
		}
		if (!(CATEGORIES as readonly string[]).includes(values.category)) {
			throw new UsageHintError(
				`Invalid --category "${values.category}". Must be one of: ${CATEGORIES.join(', ')}`,
			);
		}
		if (!values.severity) {
			throw new UsageHintError('--severity is required for core purpose');
		}
		if (!(SEVERITIES as readonly string[]).includes(values.severity)) {
			throw new UsageHintError(
				`Invalid --severity "${values.severity}". Must be one of: ${SEVERITIES.join(', ')}`,
			);
		}
		core = {
			description: values.description,
			category: values.category,
			severity: values.severity,
		};
	}

	return {
		params: { purpose, pluginName, ruleName, lang, needTest, core },
		json: values.json ?? false,
	};
}

/**
 * CLI entry point for creating a new markuplint rule.
 *
 * Supports two modes:
 * - **Non-interactive**: When CLI options are provided, creates the rule directly.
 * - **Interactive**: When no options are provided, starts the guided wizard.
 *
 * @returns Resolves when the rule has been fully scaffolded and dependencies installed.
 */
export async function createRule() {
	let parsed: { params: CreateRuleHelperParams; json: boolean } | null;
	try {
		parsed = parseCliArgs();
	} catch (error) {
		if (error instanceof HelpRequested) {
			return;
		}
		throw error;
	}

	if (parsed) {
		await createRuleNonInteractive(parsed.params, parsed.json);
	} else {
		await createRuleInteractive();
	}
}

async function createRuleNonInteractive(params: CreateRuleHelperParams, json: boolean) {
	const result = await createRuleHelper(params);

	if (!json) {
		process.stdout.write(header('Create a rule'));
		process.stdout.write('\n\n');
	}

	if (json) {
		const output = {
			files: result.files.map(file => ({
				name: file.fileName + file.ext,
				path: path.resolve(file.destDir, file.fileName + file.ext),
				test: file.test,
			})),
			dependencies: result.dependencies,
			devDependencies: result.devDependencies,
		};
		process.stdout.write(JSON.stringify(output, null, 2) + '\n');
	} else {
		for (const file of result.files) {
			printFile(
				params.pluginName || 'core',
				file.test ? '🖍 ' : (icons[file.name] ?? '🛡 '),
				file.fileName,
				path.resolve(file.destDir, file.fileName + file.ext),
			);
		}
	}

	if (result.dependencies.length > 0) {
		await installModule(result.dependencies);
	}

	if (result.devDependencies.length > 0) {
		await installModule(result.devDependencies, true);
	}
}

async function createRuleInteractive() {
	process.stdout.write(header('Create a rule'));
	process.stdout.write('\n');
	process.stdout.write('\n');

	const firstChoices: { name: string; value: CreateRulePurpose }[] = [
		{ name: 'Add the rule to this project', value: 'ADD_TO_PROJECT' },
		{ name: 'Create the rule and publish it as a package', value: 'PUBLISH_AS_PACKAGE' },
	];

	if (await isMarkuplintRepo()) {
		firstChoices.push({ name: 'Contribute the new rule to markuplint core rules', value: 'CONTRIBUTE_TO_CORE' });
	}

	const purpose = await select<CreateRulePurpose>({
		message: 'What purpose do you create the rule for?',
		choices: firstChoices,
	});

	const dirQuestion = purpose === 'ADD_TO_PROJECT' ? 'What is the directory name?' : 'What is the plugin name?';

	const pluginName =
		purpose === 'CONTRIBUTE_TO_CORE' ? '' : await input(dirQuestion, /^[a-z][\da-z]*(?:-[a-z][\da-z]*)*$/i);

	const ruleName = await input('What is the rule name?', /^[a-z][\da-z]*(?:-[a-z][\da-z]*)*$/i);

	const core: CreateRuleCreatorCoreParams | undefined =
		purpose === 'CONTRIBUTE_TO_CORE'
			? {
					description: await input('Description:'),
					category: await select({
						message: 'Category:',
						choices: [
							{ name: 'Conformance checking', value: 'validation' },
							{ name: 'Accessibility', value: 'a11y' },
							{ name: 'Naming Convention', value: 'naming-convention' },
							{ name: 'Maintainability', value: 'maintainability' },
							{ name: 'Style', value: 'style' },
						],
					}),
					severity: await select({
						message: 'Severity:',
						choices: [
							{ name: 'error', value: 'error' },
							{ name: 'warning', value: 'warning' },
						],
					}),
				}
			: undefined;

	const lang =
		purpose === 'CONTRIBUTE_TO_CORE'
			? 'TYPESCRIPT'
			: await select<CreateRuleLanguage>({
					message: 'Which language will you implement?',
					choices: [
						{ name: 'TypeScript', value: 'TYPESCRIPT' },
						{ name: 'JavaScript', value: 'JAVASCRIPT' },
					],
				});

	const needTest =
		purpose === 'CONTRIBUTE_TO_CORE' ? true : await confirm('Do you need the test?', { initial: true });

	const result = await createRuleHelper({ purpose, pluginName, ruleName, lang, needTest, core });

	for (const file of result.files) {
		printFile(
			pluginName || 'core',
			file.test ? '🖍 ' : (icons[file.name] ?? '🛡 '),
			file.fileName,
			path.resolve(file.destDir, file.fileName + file.ext),
		);
	}

	if (result.dependencies.length > 0) {
		await installModule(result.dependencies);
	}

	if (result.devDependencies.length > 0) {
		await installModule(result.devDependencies, true);
	}
}

function printFile(name: string, icon: string, title: string, filePath: string) {
	const _marker = xterm(39)('✔') + ' ';
	const _title = (icon: string, title: string) => `${icon} ` + font.bold(`${name}/${title}`);
	const _file = (filePath: string) => ' ' + font.cyanBright(filePath);
	process.stdout.write(_marker + _title(icon, title) + _file(filePath));
	process.stdout.write('\n');
}
