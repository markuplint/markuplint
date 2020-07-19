import { Config, RuleConfigValue } from '@markuplint/ml-config';
import { MLRule } from '@markuplint/ml-core';
import { exec } from '@markuplint/ml-service';

export { exec } from '@markuplint/ml-service';

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function verify(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await exec({
		sourceCodes: html,
		config,
		rules,
		rulesAutoResolve: true,
		locale,
	});
	return totalResults[0] ? totalResults[0].results : [];
}

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function fix(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await exec({
		sourceCodes: html,
		config,
		rules,
		locale,
		rulesAutoResolve: true,
		fix: true,
	});
	const result = totalResults[0];
	if (!result) {
		return html;
	}
	return result.fixedCode;
}
