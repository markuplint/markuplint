import type { CreateRuleCreatorCoreParams, CreateRuleLanguage, CreateRulePurpose } from './types.js';

import path from 'node:path';

import { input, installModule, select, confirm, font, header } from '@markuplint/cli-utils';

import { createRuleHelper } from './create-rule-helper.js';
import { isMarkuplintRepo } from './is-markuplint-repo.js';

const icons: Record<string, string> = {
	README: '📝',
	index: '📜',
	schema: '⚙️ ',
	package: '🎁',
	tsconfig: '💎',
};

export async function createRule() {
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
		output(
			pluginName || 'core',
			file.test ? '🖍 ' : icons[file.name] ?? '🛡 ',
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

function output(name: string, icon: string, title: string, path: string) {
	const _marker = font.xterm(39)('✔') + ' ';
	const _title = (icon: string, title: string) => `${icon} ` + font.bold(`${name}/${title}`);
	const _file = (path: string) => ' ' + font.cyanBright(path);
	process.stdout.write(_marker + _title(icon, title) + _file(path));
	process.stdout.write('\n');
}
