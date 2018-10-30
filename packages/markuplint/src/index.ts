import {
	getAnonymousFile,
	getFiles,
	loadConfigFile,
	recursiveLoad,
	searchConfigFile,
	ConfigSet,
	MLFile,
} from '@markuplint/file-resoliver';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { Config, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { convertRuleset, MLCore, MLRule } from '@markuplint/ml-core';
import path from 'path';
import { getMessenger } from './get-messenger';
import { toRegxp } from './util';

export async function verify(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const results = await exec({
		sourceCodes: html,
		config,
		rules,
		locale,
	});
	return results[0] ? results[0].results : [];
}

export interface MLCLIOption {
	files?: string;
	sourceCodes?: string | string[];
	config?: string | Config;
	rules?: MLRule<RuleConfigValue, unknown>[];
	addRules?: MLRule<RuleConfigValue, unknown>[];
	locale?: string;
	// noConfig?: boolean;
	// ext?: string;
	// parser?: string;
	// ruledir?: string;
	// plugin?: string;
	// rule?: string;
	// fix?: boolean;
	// fixDryRun?: boolean;
	// ignorePath?: string;
	// noIgnore?: string;
	// ignorePattern?: string;
	// quiet?: boolean;
	// maxWarnings?: number;
	// outputFile?: string;
	// format?: string;
	// noColor?: string;
}

export async function exec(options: MLCLIOption) {
	// Resolve files
	const files: MLFile[] = [];
	if (options.files) {
		files.push(...(await getFiles(options.files)));
		if (!files.length) {
			throw new Error(`"${options.files}" is not found.`);
		}
	} else if (options.sourceCodes) {
		const codes = Array.isArray(options.sourceCodes) ? options.sourceCodes : [options.sourceCodes];
		files.push(...codes.map(code => getAnonymousFile(code)));
	}

	// Resolve configuration data
	const configs = new Map<MLFile, ConfigSet>();
	if (options.config) {
		let configSet: ConfigSet | void;
		if (typeof options.config === 'string') {
			configSet = await loadConfigFile(options.config);
		} else {
			const filePath = `${process.cwd()}/__NO_FILE__`;
			const _files = new Set([filePath]);
			configSet = await recursiveLoad(options.config, filePath, _files, true);
		}
		if (configSet) {
			for (const file of files) {
				configs.set(file, configSet);
			}
		}
	} else {
		let configSetNearbyCWD: ConfigSet | void;
		for (const file of files) {
			let configSet = await searchConfigFile(file.path);
			if (configSet) {
				configs.set(file, configSet);
			} else {
				if (configSetNearbyCWD) {
					configSetNearbyCWD = await searchConfigFile(process.cwd());
				}
				if (configSetNearbyCWD) {
					configs.set(file, configSetNearbyCWD);
				}
			}
		}
	}

	let rules: MLRule<RuleConfigValue, unknown>[];
	if (options.rules) {
		rules = options.rules;
	} else {
		const r = await import('@markuplint/rules');
		rules = r.default;
	}
	if (options.addRules) {
		rules = rules.concat(options.addRules);
	}

	const totalResults: MLResultInfo[] = [];

	for (const file of files) {
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

		// create MLCore
		const sourceCode = await file.getContext();
		const ruleset = convertRuleset(configSet.config);
		const messenger = await getMessenger(options.locale);
		const core = new MLCore(parser, sourceCode, ruleset, rules, messenger);

		const results = await core.verify();
		totalResults.push({
			results,
			filePath: file.path,
			sourceCode,
			parser: parserModName,
			locale: options.locale,
			configSet: {
				config: configSet.config,
				files: Array.from(configSet.files),
				error: configSet.errs.map(e => `${e}`),
			},
		});
	}

	return totalResults;
}

interface MLResultInfo {
	results: VerifiedResult[];
	filePath: string;
	sourceCode: string;
	parser: string;
	locale?: string;
	configSet: {
		config: Config;
		files: string[];
		error: string[];
	};
}
