import { ConfigSet, MLFile } from '@markuplint/file-resolver';
import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { MLCore, MLParseError, MLRule, convertRuleset } from '@markuplint/ml-core';
import { RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document } from '@markuplint/ml-core';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { MLResultInfo } from '../types';
import { i18n } from '../resolver/i18n';
import { moduleAutoLoader } from '../resolver/module-auto-loader';
import path from 'path';
import { toRegxp } from '../util';

export async function lintFile(
	file: MLFile,
	configs: Map<MLFile, ConfigSet>,
	rulesAutoResolve: boolean,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale: string | undefined,
	fix: boolean | undefined,
	extMatch: boolean,
): Promise<MLResultInfo | null> {
	const configSet: ConfigSet = configs.get(file) || {
		config: {},
		files: new Set(),
		errs: [],
	};

	// Exclude
	const excludeFiles = configSet.config.excludeFiles || [];
	for (const excludeFile of excludeFiles) {
		if (file.matches(excludeFile)) {
			return null;
		}
	}

	// Get parser
	let parserModName = '@markuplint/html-parser';
	let matched = false;
	if (configSet.config.parser) {
		for (const pattern of Object.keys(configSet.config.parser)) {
			if (path.basename(file.path).match(toRegxp(pattern))) {
				parserModName = configSet.config.parser[pattern];
				matched = true;
			}
		}
	}
	const parser: MLMarkupLanguageParser = await import(parserModName);
	const parserOptions = configSet.config.parserOptions || {};

	// Ext Matching
	if (extMatch && !matched && !path.basename(file.path).match(/\.html?$/i)) {
		return null;
	}

	// Resolve ruleset
	const ruleset = convertRuleset(configSet.config);

	// Schemas
	const specs = configSet.config.specs
		? Array.isArray(configSet.config.specs)
			? configSet.config.specs
			: [configSet.config.specs]
		: [];
	const htmlSpec: MLMLSpec = await import('@markuplint/html-spec');
	const extendedSpecs = await Promise.all(
		specs.map<Promise<ExtendedSpec>>(async spec => (await import(spec)).default),
	);
	const schemas = [htmlSpec, ...extendedSpecs] as const;

	// Addition rules
	if (rulesAutoResolve) {
		const { rules: additionalRules } = await moduleAutoLoader<RuleConfigValue, unknown>(ruleset);
		rules = rules.concat(...additionalRules);
	}

	// create MLCore
	const sourceCode = await file.getContext();
	const i18nSettings = await i18n(locale);

	let results: VerifiedResult[] = [];
	let fixedCode = sourceCode;
	let document: Document<RuleConfigValue, unknown> | null = null;

	try {
		const core = new MLCore(parser, sourceCode, ruleset, rules, i18nSettings, schemas, parserOptions, file.path);
		results = await core.verify(fix);
		fixedCode = core.document.toString();
		document = core.document;
	} catch (err) {
		if (err instanceof MLParseError) {
			results = [
				{
					ruleId: 'parse-error',
					severity: 'error',
					message: err.message,
					col: err.col,
					line: err.line,
					raw: err.raw,
				},
			];
		} else {
			throw err;
		}
	}

	return {
		results,
		filePath: file.path,
		sourceCode,
		fixedCode,
		document,
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
