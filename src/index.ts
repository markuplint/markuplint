import * as fs from 'fs';
import * as util from 'util';

import * as markuplint from './core';
import Rule, {
	VerifiedReport,
} from './rule';
import {
	Ruleset,
} from './ruleset';

const readFile = util.promisify(fs.readFile);

export async function verify (html: string, ruleset: Ruleset, rules: Rule[]) {
	return markuplint.verify(html, ruleset, rules);
}

export async function verifyFile (path: string, ruleset: Ruleset, rules: Rule[]) {
	const html = await readFile(path, 'utf-8');
	return markuplint.verify(html, ruleset, rules);
}
