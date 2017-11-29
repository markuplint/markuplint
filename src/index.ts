import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as markuplint from './core';
import Rule, {
	VerifiedResult,
} from './rule';
import {
	Ruleset,
} from './ruleset';

const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
const readdir = util.promisify(fs.readdir);

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

async function getRuleModules (): Promise<Rule[]> {
	const rules: Rule[] = [];
	const ruleDir = path.resolve(__dirname, './rules');
	const ruleFiles = await readdir(ruleDir);
	for (const filePath of ruleFiles) {
		if (/^markuplint-rule-[a-z\-]+\.js$/i.test(filePath)) {
			const mod = await import(path.resolve(ruleDir, filePath));
			const CustomRule /* Subclass of Rule */ = mod.default;
			rules.push(new CustomRule());
		}
	}
	return rules;
}

async function getRuleset (dir: string): Promise<Ruleset> {
	const rulesetFileNameList = [
		'.markuplintrc',
		'markuplintrc.json',
		'markuplint.config.json',
		'markuplint.json',
		'markuplint.config.js',
	];
	const rulesetFilePath = await fileSearch(rulesetFileNameList, dir);
	const ruleset: Ruleset = await import(rulesetFilePath);
	return ruleset;
}

async function fileSearch (fileList: string[], dir: string) {
	const notfoundFiles: string[] = [];
	const dirList = dir.split(path.sep);
	while (dirList.length) {
		const absFileList = fileList.map((filePath) => path.join(path.sep, ...dirList, filePath));
		for (const filePath of absFileList) {
			if (await exists(filePath)) {
				return filePath;
			} else {
				notfoundFiles.push(filePath);
			}
		}
		dirList.pop();
	}
	throw new ReferenceError(`A Ruleset file is not found.\n${notfoundFiles.join('\n')}`);
}
