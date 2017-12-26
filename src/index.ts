import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as core from './core';
import Rule, {
	getRuleModules,
	VerifiedResult,
} from './rule';
import Ruleset, {
	ConfigureFileJSON,
} from './ruleset';
import osLocale from './util/osLocale';

const readFile = util.promisify(fs.readFile);

export async function verify (html: string, config: ConfigureFileJSON, rules: Rule[], locale?: string) {
	if (!locale) {
		locale = await osLocale();
	}
	const ruleset = await Ruleset.create(config, rules);
	return await core.verify(html, ruleset, locale);
}

export async function verifyOnWorkspace (html: string) {
	const locale = await osLocale();
	const rules = await getRuleModules();
	const ruleset = await Ruleset.create(process.cwd(), rules);
	return await core.verify(html, ruleset, locale);
}

export async function verifyFile (filePath: string, rules?: Rule[], locale?: string) {
	if (!locale) {
		locale = await osLocale();
	}
	const absFilePath = path.resolve(filePath);
	const parsedPath = path.parse(absFilePath);
	const dir = path.dirname(absFilePath);
	rules = rules || await getRuleModules();
	const ruleset = await Ruleset.create(dir, rules);
	const html = await readFile(filePath, 'utf-8');
	const reports = await core.verify(html, ruleset, locale);
	return {
		html,
		reports,
	};
}
