// import path from 'path';

// import CustomRule from './rule/custom-rule';

// import ruleModulesLoader from './rule/loader';

// import messenger from './locale/messenger/node';

// import Ruleset from './ruleset';
// import { ConfigureFileJSON } from './ruleset/JSONInterface';
// import createRuleset from './ruleset/createRuleset';

// import isRemoteFile from './util/is-remote-file';
// import { resolveFile } from './util/resolve-file';

// export async function verify(html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string) {
// 	const ruleset = await createRuleset(config, rules);
// 	const core = new Markuplint(html, ruleset, await messenger(locale));
// 	return await core.verify();
// }

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

import path from 'path';

import {
	getAnonymousFile,
	getFiles,
	loadConfigFile,
	searchConfigFile,
	ConfigSet,
	MLFile,
} from '@markuplint/file-resoliver';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import { VerifiedResult } from '@markuplint/ml-config';
import MLCore, { convertRuleset, getMessenger } from '@markuplint/ml-core';
import coreRules from '@markuplint/rules';

import { toRegxp } from './util';

export interface MLCLIOption {
	files?: string;
	sourceCodes?: string | string[];
	config?: string;
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

export async function verify(options: MLCLIOption) {
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
		const configSet = await loadConfigFile(options.config);
		if (configSet) {
			files.forEach(file => configs.set(file, configSet));
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

	const results: VerifiedResult[] = [];
	for (const file of files) {
		const configSet = configs.get(file);
		if (!configSet) {
			throw new Error();
		}

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
		const messenger = await getMessenger();
		const core = new MLCore(parser, sourceCode, ruleset, coreRules, messenger);

		const result = await core.verify();
		results.push(...result);
	}

	return results;
}
