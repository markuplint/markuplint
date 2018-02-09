import path from 'path';

import Ruleset, { ResultResolver } from './core';

import {
	ConfigureFileJSON,
} from './JSONInterface';

const originRoot = 'https://raw.githubusercontent.com/YusukeHirao/markuplint/master/';

export default class RulesetForClient extends Ruleset {

	public static readonly NOFILE = '<no-file>';

	public async resolver (extendRule: string, baseRuleFilePath: string): Promise<ResultResolver> {
		let url: string;
		if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
			const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
			if (!matched || !matched[1]) {
				throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
			}
			const id = matched[1];
			const filePath = path.join(originRoot, 'rulesets', `${id}.json`);
			url = new URL(filePath).toString();
		} else if (/^(?:https?:)?\/\//.test(extendRule)) {
			url = new URL(extendRule).toString();
		} else {
			if (baseRuleFilePath === Ruleset.NOFILE) {
				return {
					ruleConfig: null,
					ruleFilePath: Ruleset.NOFILE,
				};
			}
			const dir = path.dirname(baseRuleFilePath);
			url = path.resolve(path.join(dir, extendRule));
		}
		const res = await fetch(url.toString(), { mode: 'cors' });
		const ruleConfig: ConfigureFileJSON = await res.json();
		return { ruleConfig, ruleFilePath: url };
	}

}
