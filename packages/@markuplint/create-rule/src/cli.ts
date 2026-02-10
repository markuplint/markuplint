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

/**
 * Icon mapping for scaffold output display, keyed by base file name.
 */
const icons: Record<string, string> = {
	README: '📝',
	index: '📜',
	schema: '⚙️ ',
	package: '🎁',
	tsconfig: '💎',
};

/**
 * Prints the CLI usage information, options, and examples to stdout.
 */
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
 * Sentinel class thrown when `--help` is requested to signal a
 * successful early exit without using `process.exit`.
 */
class HelpRequested {
	readonly code = 0;
}

/**
 * Throws an error with the given message and a usage hint.
 * Used for CLI argument validation failures.
 *
 * @param message - The validation error message to include.
 */
function fail(message: string): never {
	throw new Error(`${message}\nRun 'create-rule --help' for usage.`);
}

/**
 * Parses `process.argv` into validated {@link CreateRuleHelperParams}.
 *
 * @returns The parsed parameters and output format flag, or `null` when
 *          no arguments are provided (indicating interactive mode).
 * @throws {HelpRequested} When `--help` is passed.
 * @throws {Error} When required options are missing or values are invalid.
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
		fail('--purpose is required in non-interactive mode');
	}
	const purpose = PURPOSE_MAP[values.purpose];
	if (!purpose) {
		fail(`Invalid --purpose "${values.purpose}". Must be one of: project, package, core`);
	}

	// Validate rule name
	if (!values['rule-name']) {
		fail('--rule-name is required');
	}
	const ruleName = values['rule-name'];
	if (!KEBAB_CASE.test(ruleName)) {
		fail(`Invalid --rule-name "${ruleName}". Must be kebab-case (e.g., "no-empty-alt")`);
	}

	// Validate plugin name
	let pluginName = '';
	if (purpose !== 'CONTRIBUTE_TO_CORE') {
		if (!values['plugin-name']) {
			fail('--plugin-name is required for project/package purpose');
		}
		pluginName = values['plugin-name'];
		if (!KEBAB_CASE.test(pluginName)) {
			fail(`Invalid --plugin-name "${pluginName}". Must be kebab-case (e.g., "my-plugin")`);
		}
	}

	// Language
	const langInput = values.lang ?? 'ts';
	let lang: CreateRuleLanguage;
	if (purpose === 'CONTRIBUTE_TO_CORE') {
		lang = 'TYPESCRIPT';
	} else if (langInput === 'ts') {
		lang = 'TYPESCRIPT';
	} else if (langInput === 'js') {
		lang = 'JAVASCRIPT';
	} else {
		fail(`Invalid --lang "${langInput}". Must be "ts" or "js"`);
	}

	// Test
	const needTest = purpose === 'CONTRIBUTE_TO_CORE' ? true : !values['no-test'];

	// Core-specific params
	let core: CreateRuleCreatorCoreParams | undefined;
	if (purpose === 'CONTRIBUTE_TO_CORE') {
		if (!values.description) {
			fail('--description is required for core purpose');
		}
		if (!values.category) {
			fail('--category is required for core purpose');
		}
		if (!(CATEGORIES as readonly string[]).includes(values.category)) {
			fail(`Invalid --category "${values.category}". Must be one of: ${CATEGORIES.join(', ')}`);
		}
		if (!values.severity) {
			fail('--severity is required for core purpose');
		}
		if (!(SEVERITIES as readonly string[]).includes(values.severity)) {
			fail(`Invalid --severity "${values.severity}". Must be one of: ${SEVERITIES.join(', ')}`);
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

/**
 * Creates a rule non-interactively from pre-validated CLI options.
 * Runs the scaffold, prints results (or JSON), and installs dependencies.
 *
 * @param params - The validated rule creation parameters.
 * @param json - When `true`, outputs the result as JSON instead of
 *               the human-readable file list.
 */
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

/**
 * Interactive CLI wizard for creating a new markuplint rule.
 *
 * Guides the user through selecting a purpose, naming the plugin and rule,
 * choosing a language, and optionally generating tests. After scaffolding,
 * it prints the generated files and installs any required dependencies.
 */
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

/**
 * Prints a single scaffolded file entry to stdout with a check mark, icon, and file path.
 *
 * @param name - The plugin or module name used as a prefix.
 * @param icon - The icon character to display next to the file name.
 * @param title - The display title (typically the file name).
 * @param filePath - The absolute path to the generated file.
 */
function printFile(name: string, icon: string, title: string, filePath: string) {
	const _marker = xterm(39)('✔') + ' ';
	const _title = (icon: string, title: string) => `${icon} ` + font.bold(`${name}/${title}`);
	const _file = (filePath: string) => ' ' + font.cyanBright(filePath);
	process.stdout.write(_marker + _title(icon, title) + _file(filePath));
	process.stdout.write('\n');
}
