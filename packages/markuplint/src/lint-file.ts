import { ConfigSet, MLFile } from '@markuplint/file-resolver';
import { MLCore, MLRule, convertRuleset } from '@markuplint/ml-core';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { MLResultInfo } from './types';
import { RuleConfigValue } from '@markuplint/ml-config';
import { i18n } from './i18n';
import { moduleAutoLoader } from './module-auto-loader';
import path from 'path';
import { toRegxp } from './util';

export async function lintFile(
	file: MLFile,
	configs: Map<MLFile, ConfigSet>,
	rulesAutoResolve: boolean,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale?: string,
	fix?: boolean,
): Promise<MLResultInfo> {
	const configSet: ConfigSet = configs.get(file) || {
		config: {},
		files: new Set(),
		errs: [],
	};

	// Get parser
	let parserModName = '@markuplint/html-parser';
	if (configSet.config.parser) {
		for (const pattern of Object.keys(configSet.config.parser)) {
			if (path.basename(file.path).match(toRegxp(pattern))) {
				parserModName = configSet.config.parser[pattern];
			}
		}
	}
	const parser: MLMarkupLanguageParser = await import(parserModName);

	// Resolve ruleset
	const ruleset = convertRuleset(configSet.config);

	// Addition rules
	if (rulesAutoResolve) {
		const { rules: additionalRules } = await moduleAutoLoader<RuleConfigValue, unknown>(ruleset);
		rules = rules.concat(...additionalRules);
	}

	// create MLCore
	const sourceCode = await file.getContext();
	const i18nSettings = await i18n(locale);
	const core = new MLCore(parser, sourceCode, ruleset, rules, i18nSettings);

	const results = await core.verify(fix);

	return {
		results,
		filePath: file.path,
		sourceCode,
		fixedCode: core.document.toString(),
		document: core.document,
		parser: parserModName,
		locale,
		ruleset,
		configSet: {
			config: configSet.config,
			files: Array.from(configSet.files),
			error: configSet.errs.map(e => `${e}`),
		},
	};
}
