import { Config, RuleConfigValue } from '@markuplint/ml-config';
import { lint, lintSync } from './lint';
import { MLRule } from '@markuplint/ml-core';

export { lint as exec } from './lint';
export { lintSync as execSync } from './lint';

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function verify(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await lint({
		sourceCodes: html,
		config,
		rules,
		rulesAutoResolve: true,
		locale,
	});
	return totalResults[0]?.results ?? [];
}

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export function verifySync(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = lintSync({
		sourceCodes: html,
		config,
		rules,
		rulesAutoResolve: true,
		locale,
	});
	return totalResults[0]?.results ?? [];
}

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function fix(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = await lint({
		sourceCodes: html,
		config,
		rules,
		locale,
		rulesAutoResolve: true,
		fix: true,
	});
	return totalResults[0]?.fixedCode ?? html;
}

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export function fixSync(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const totalResults = lintSync({
		sourceCodes: html,
		config,
		rules,
		locale,
		rulesAutoResolve: true,
		fix: true,
	});
	return totalResults[0]?.fixedCode ?? html;
}
