import {
	Target,
	configProvider,
	moduleAutoLoader,
	resolveFiles,
	resolveParser,
	resolveRules,
	resolveSpecs,
} from '@markuplint/file-resolver';
import { APIOptions } from './types';
import { MLResultInfo } from '../types';
import { RuleConfigValue } from '@markuplint/ml-config';
import { convertRuleset } from '@markuplint/ml-core';
import { i18n } from '../i18n';
import { lintFile } from './lint-file';
import path from 'path';

export async function api(targetList: Target[], options?: APIOptions) {
	const res: MLResultInfo[] = [];
	const files = await resolveFiles(targetList);

	ExecTarget: for (const file of files) {
		const configFilePathsFromTarget = await configProvider.search(file);
		const configKey = options?.config && configProvider.set(options.config);
		const configSet = await configProvider.resolve([configFilePathsFromTarget, options?.configFile, configKey]);

		// Exclude
		const excludeFiles = configSet.config.excludeFiles || [];
		for (const excludeFile of excludeFiles) {
			if (file.matches(excludeFile)) {
				continue ExecTarget;
			}
		}

		// Get parser
		const { parserModName, parser, parserOptions, matched } = await resolveParser(
			file,
			configSet.config.parser,
			configSet.config.parserOptions,
		);

		// Ext Matching
		if (options?.extMatch && !matched && !path.basename(file.path).match(/\.html?$/i)) {
			continue;
		}

		// Resolve ruleset
		const ruleset = convertRuleset(configSet.config);

		const { schemas } = await resolveSpecs(file, configSet.config.specs);

		const rules = await resolveRules(configSet.config.importRules, options?.importPresetRules);
		const autoLoad = options?.autoLoad ?? true;
		// Addition rules
		if (autoLoad) {
			const { rules: additionalRules } = await moduleAutoLoader<RuleConfigValue, unknown>(ruleset);
			rules.push(...additionalRules);
		}
		if (options?.rules) {
			rules.push(...options.rules);
		}

		// create MLCore
		const sourceCode = await file.getContext();
		const i18nSettings = await i18n(options?.locale);

		const result = await lintFile(
			parser,
			sourceCode,
			ruleset,
			rules,
			i18nSettings,
			schemas,
			parserOptions,
			file,
			!!options?.fix,
		);

		if (!result) {
			continue;
		}

		res.push({
			...result,
			sourceCode,
			parser: parserModName,
			filePath: file.path,
			ruleset,
			configSet: {
				config: configSet.config,
				files: Array.from(configSet.files),
				error: configSet.errs.map(e => `${e}`),
			},
		});
	}

	return res;
}
