// @ts-ignore
import * as  findNodeModules from 'find-node-modules';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import CustomRule from './custom-rule';

const readdir = util.promisify(fs.readdir);

export default async function ruleModulesLoader (): Promise<CustomRule[]> {
	const rules: CustomRule[] = [];
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, '../rules')));
	rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
	rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
	return rules;
}

async function resolveRuleModules (pattern: RegExp, ruleDir: string): Promise<CustomRule[]> {
	const rules: CustomRule[] = [];
	if (!ruleDir) {
		return rules;
	}
	try {
		const ruleFiles = await readdir(ruleDir);
		for (const filePath of ruleFiles) {
			if (pattern.test(filePath)) {
				const rule = await resolveRuleModule(path.resolve(ruleDir, filePath));
				if (rule) {
					rules.push(rule);
				}
			}
		}
	} catch (e) {
		// @ts-ignore
		if (!(e instanceof Error && e.code === 'ENOENT')) {
			throw e;
		}
	}
	return rules;
}

async function resolveRuleModule (modulePath: string) {
	try {
		const mod = await import(modulePath);
		const modRule /* Subclass of Rule */ = mod.default;
		const rule: CustomRule = modRule.rule ? new CustomRule(modRule.rule) : modRule;
		return rule;
	} catch (err) {
		// @ts-ignore
		if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
			console.warn(`[markuplint] Cannot find rule module: ${modulePath} (${err.message})`);
		} else {
			throw err;
		}
	}
}

function nearNodeModules (): string {
	const moduleDirs: string[] = findNodeModules({ cwd: process.cwd() }).map((dir: string) => path.resolve(dir));
	const moduleDir = moduleDirs[0];
	return moduleDir || '';
}
