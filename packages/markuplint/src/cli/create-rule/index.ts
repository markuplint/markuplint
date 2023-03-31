import type {
	CreateRulePurpose,
	CreateRuleLanguage,
	CreateRuleCreatorCoreParams,
} from '@markuplint/create-rule-helper';

import { resolve } from 'node:path';

import { isMarkuplintRepo, createRuleHelper } from '@markuplint/create-rule-helper';
import c from 'cli-color';

import { write, head } from '../../util';
import { installModule } from '../init/install-module';
import { input, select, confirm } from '../prompt';

const icons: Record<string, string> = {
	README: '📝',
	index: '📜',
	schema: '⚙️ ',
	package: '🎁',
	tsconfig: '💎',
};

export async function createRule() {
	write(head('Create a rule'));
	write.break();

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
		purpose === 'CONTRIBUTE_TO_CORE' ? '' : await input(dirQuestion, /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/i);

	const ruleName = await input('What is the rule name?', /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/i);

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
			resolve(file.destDir, file.fileName + file.ext),
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
	const _marker = c.xterm(39)('✔') + ' ';
	const _title = (icon: string, title: string) => `${icon} ` + c.bold(`${name}/${title}`);
	const _file = (path: string) => ' ' + c.cyanBright(path);
	write(_marker + _title(icon, title) + _file(path));
}
