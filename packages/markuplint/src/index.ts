import { Config, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import {
	ConfigSet,
	MLFile,
	getAnonymousFile,
	getFiles,
	loadConfigFile,
	recursiveLoad,
	searchConfigFile,
} from '@markuplint/file-resolver';
import { Document, MLCore, MLRule, Ruleset, convertRuleset } from '@markuplint/ml-core';
import { MLMLSpec } from '@markuplint/ml-spec';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { getMessenger } from './get-messenger';
import path from 'path';
import { toRegxp } from './util';

export async function verify(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await exec({
		sourceCodes: html,
		config,
		rules,
		locale,
	});
	return totalResults[0] ? totalResults[0].results : [];
}

export async function fix(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await exec({
		sourceCodes: html,
		config,
		rules,
		locale,
		fix: true,
	});
	const result = totalResults[0];
	if (!result) {
		return html;
	}
	return result.fixedCode;
}

export interface MLCLIOption {
	/**
	 * Glob pattern
	 */
	files?: string;

	/**
	 * Target source code of evaluation
	 */
	sourceCodes?: string | string[];

	/**
	 * File names of `sourceCodes`
	 */
	names?: string | string[];
	workspace?: string;
	config?: string | Config;
	specs?: string | MLMLSpec;
	rules?: MLRule<RuleConfigValue, unknown>[];
	addRules?: MLRule<RuleConfigValue, unknown>[];
	locale?: string;
	// noConfig?: boolean;
	// ext?: string;
	// parser?: string;
	// ruledir?: string;
	// plugin?: string;
	// rule?: string;
	fix?: boolean;
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
		const names = Array.isArray(options.names) ? options.names : options.names ? [options.names] : [];
		files.push(...codes.map((code, i) => getAnonymousFile(code, options.workspace, names[i])));
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
			const configSet = await searchConfigFile(file.path);
			if (configSet) {
				configs.set(file, configSet);
			} else {
				if (!configSetNearbyCWD) {
					configSetNearbyCWD = await searchConfigFile(process.cwd());
				}
				if (configSetNearbyCWD) {
					configs.set(file, configSetNearbyCWD);
				}
			}
		}
	}

	let specs: MLMLSpec;
	if (typeof options.specs === 'string') {
		specs = await import(options.specs);
	} else if (options.specs) {
		specs = options.specs;
	} else {
		// @ts-ignore
		const json = await import('@markuplint/html-ls');
		// @ts-ignore
		specs = json.default;
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
		const core = new MLCore(parser, sourceCode, specs, ruleset, rules, messenger);

		const results = await core.verify(!!options.fix);
		totalResults.push({
			results,
			filePath: file.path,
			sourceCode,
			fixedCode: core.document.toString(),
			document: core.document,
			parser: parserModName,
			locale: options.locale,
			ruleset,
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
	fixedCode: string;
	document: Document<any, unknown>;
	parser: string;
	locale?: string;
	ruleset: Ruleset;
	configSet: {
		config: Config;
		files: string[];
		error: string[];
	};
}
