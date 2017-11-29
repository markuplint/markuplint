import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as markuplint from './core';
import Rule, {
	getRuleModules,
	VerifiedResult,
} from './rule';
import {
	getRuleset,
	Ruleset,
} from './ruleset';

const readFile = util.promisify(fs.readFile);

export async function verify (html: string, ruleset: Ruleset, rules: Rule[]) {
	return markuplint.verify(html, ruleset, rules);
}

export async function verifyFile (filePath: string, ruleset?: Ruleset, rules?: Rule[]) {
	const absFilePath = path.resolve(filePath);
	const parsedPath = path.parse(absFilePath);
	const dir = path.dirname(absFilePath);
	ruleset = ruleset || await getRuleset(dir);
	rules = rules || await getRuleModules();
	const html = await readFile(filePath, 'utf-8');
	return markuplint.verify(html, ruleset, rules);
}
