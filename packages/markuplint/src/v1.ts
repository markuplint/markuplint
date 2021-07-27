import { Config, RuleConfigValue } from '@markuplint/ml-config';
import { MLRule } from '@markuplint/ml-core';
import { test } from './testing-tool';

/**
 * @deprecated
 */
export { lint as exec } from './api/lint';

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function verify(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const res = await test(html, config, rules, locale);
	return res.violations;
}

/**
 * @deprecated
 * @param html
 * @param config
 * @param rules
 * @param locale
 */
export async function fix(html: string, config: Config, rules: MLRule<RuleConfigValue, unknown>[], locale?: string) {
	const res = await test(html, config, rules, locale, true);
	return res.fixedCode;
}
