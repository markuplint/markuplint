import path from 'path';

import Markuplint from './core';
import CustomRule from './rule/custom-rule';

import { VerifiedResult } from './rule';
import ruleModulesLoader from './rule/loader';

import messenger from './locale/messenger/node';

import Ruleset from './ruleset';
import { ConfigureFileJSON } from './ruleset/JSONInterface';
import createRuleset from './ruleset/createRuleset';

import isRemoteFile from './util/is-remote-file';
import { resolveFile } from './util/resolve-file';

export async function verify (html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string) {
	const ruleset = await createRuleset(config, rules);
	const core = new Markuplint(html, ruleset, await messenger(locale));
	return await core.verify();
}

export async function fix (html: string, config: ConfigureFileJSON, rules: CustomRule[], locale?: string) {
	const ruleset = await createRuleset(config, rules);
	const core = new Markuplint(html, ruleset, await messenger(locale));
	return await core.fix();
}

export async function verifyOnWorkspace (html: string, workspace?: string) {
	workspace = workspace ? workspace : process.cwd();
	const rules = await ruleModulesLoader();
	const ruleset = await createRuleset(workspace, rules);
	const core = new Markuplint(html, ruleset, await messenger());
	return await core.verify();
}

export async function fixOnWorkspace (html: string, workspace?: string) {
	workspace = workspace ? workspace : process.cwd();
	const rules = await ruleModulesLoader();
	const ruleset = await createRuleset(workspace, rules);
	const core = new Markuplint(html, ruleset, await messenger());
	return await core.fix();
}

export async function verifyFile (filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
	const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
	const reports = await core.verify();
	return {
		html: core.rawHTML,
		reports,
	};
}

export async function fixFile (filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
	const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
	const fixed = await core.fix();
	return {
		origin: core.rawHTML,
		fixed,
	};
}

async function resolveLinter (filePath: string, rules?: CustomRule[], configFileOrDir?: string, locale?: string) {
	rules = rules || await ruleModulesLoader();
	let ruleset: Ruleset;
	if (configFileOrDir) {
		ruleset = await createRuleset(configFileOrDir, rules);
	} else {
		let dir: string;
		if (isRemoteFile(filePath)) {
			dir = process.cwd();
		} else {
			const absFilePath = path.resolve(filePath);
			const parsedPath = path.parse(absFilePath);
			dir = path.dirname(absFilePath);
		}
		ruleset = await createRuleset(dir, rules);
	}
	const html = await resolveFile(filePath);
	const core = new Markuplint(html, ruleset, await messenger(locale));
	return core;
}
