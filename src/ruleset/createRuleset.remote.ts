import CustomRule from '../rule/custom-rule';

import { ConfigureFileJSON } from './JSONInterface';

import Ruleset from './remote';

export default async function createRuleset (config: ConfigureFileJSON | string, rules: CustomRule[]) {
	const ruleset = new Ruleset(rules);
	if (typeof config === 'string') {
		await loadRC(ruleset, config);
	} else {
		await ruleset.setConfig(config, Ruleset.NOFILE);
	}
	return ruleset;
}

async function loadRC (ruleset: Ruleset, fileOrDir: string) {
	const { ruleConfig, ruleFilePath } = await ruleset.resolver(fileOrDir, location.href);
	if (ruleConfig) {
		await ruleset.setConfig(ruleConfig, ruleFilePath);
	}
}
