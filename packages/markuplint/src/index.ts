import {
	getAnonymousFile,
	getFiles,
	loadConfigFile,
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
	return exec({
		sourceCodes: html,
		config,
		rules,
		locale,
	});
}

// export async function fix(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string) {
// 	const ruleset = await createRuleset(config, rules);
// 	const core = new Markuplint(html, ruleset, await messenger(locale));
// 	return await core.fix();
// }

// export async function verifyOnWorkspace(html: string, workspace?: string) {
// 	workspace = workspace ? workspace : process.cwd();
// 	const rules = await ruleModulesLoader();
// 	const ruleset = await createRuleset(workspace, rules);
// 	const core = new Markuplint(html, ruleset, await messenger());
// 	return await core.verify();
// }

// export async function fixOnWorkspace(html: string, workspace?: string) {
// 	workspace = workspace ? workspace : process.cwd();
// 	const rules = await ruleModulesLoader();
// 	const ruleset = await createRuleset(workspace, rules);
// 	const core = new Markuplint(html, ruleset, await messenger());
// 	return await core.fix();
// }

// export async function verifyFile(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
// 	const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
// 	const reports = await core.verify();
// 	return {
// 		html: core.rawHTML,
// 		reports,
// 	};
// }

// export async function fixFile(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
// 	const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
// 	const fixed = await core.fix();
// 	return {
// 		origin: core.rawHTML,
// 		fixed,
// 	};
// }

// async function resolveLinter(filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
// 	rules = rules || (await ruleModulesLoader());
// 	let ruleset: Ruleset;
// 	if (configFileOrDir) {
// 		ruleset = await createRuleset(configFileOrDir, rules);
// 	} else {
// 		let dir: string;
// 		if (isRemoteFile(filePath)) {
// 			dir = process.cwd();
// 		} else {
// 			const absFilePath = path.resolve(filePath);
// 			const parsedPath = path.parse(absFilePath);
// 			dir = path.dirname(absFilePath);
// 		}
// 		ruleset = await createRuleset(dir, rules);
// 	}
// 	const html = await resolveFile(filePath);
// 	const core = new Markuplint(html, ruleset, await messenger(locale));
// 	return core;
// }

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
			configSet = {
				config: options.config,
				files: new Set('<no-file>'),
				errs: [],
			};
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

	const results: VerifiedResult[] = [];
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

		const result = await core.verify();
		results.push(...result);
	}

	return results;
}
