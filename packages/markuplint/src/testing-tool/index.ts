import type { Target } from '@markuplint/file-resolver';
import type { Config, RuleConfigValue, Rule, RegexSelector, PlainData } from '@markuplint/ml-config';
import type { AnyMLRule, RuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

import { lint } from '../api/index.js';
import { getGlobal } from '../global-settings.js';

/**
 * Lints inline source code with a given configuration. Convenience function for testing.
 *
 * @param sourceCode - The markup source code to lint
 * @param config - The markuplint configuration to apply
 * @param rules - Optional custom rules; if omitted, preset rules are imported
 * @param locale - The locale for error messages (defaults to `'en'`)
 * @param fix - Whether to attempt auto-fixing
 * @returns An object containing violations and the fixed code
 */
export async function mlTest(
	sourceCode: string,
	config: Config,
	rules?: readonly Readonly<AnyMLRule>[],
	locale = 'en',
	fix = false,
) {
	const global = getGlobal();
	const results = await lint([{ sourceCode }], {
		config,
		rules,
		locale: locale ?? global.locale,
		fix,
		ignoreExt: true,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? sourceCode,
		fixSummary: result?.fixSummary,
	};
}

/**
 * Tests a single rule against inline source code. Designed for rule unit testing.
 *
 * @template T - The rule's configuration value type
 * @template O - The rule's options type
 * @param rule - The rule seed to test
 * @param sourceCode - The markup source code to lint
 * @param config - Configuration with rule settings, nodeRule, and childNodeRule
 * @param fix - Whether to attempt auto-fixing
 * @param locale - The locale for error messages (defaults to `'en'`)
 * @returns An object containing violations (without ruleId) and the fixed code
 */
export async function mlRuleTest<T extends RuleConfigValue, O extends PlainData>(
	rule: Readonly<RuleSeed<T, O>>,
	sourceCode: string,
	/* eslint-disable unicorn/no-object-as-default-parameter */
	config: Omit<Config, 'rules' | 'nodeRules' | 'childNodeRules'> & {
		rule?: Rule<T, Partial<O>>;
		nodeRule?: NodeRule<T, Partial<O>>[];
		childNodeRule?: ChildNodeRule<T, Partial<O>>[];
	} = { rule: true },
	/* eslint-enable unicorn/no-object-as-default-parameter */
	fix = false,
	locale = 'en',
) {
	if (config.rule === undefined && (config.nodeRule || config.childNodeRule)) {
		config.rule = true;
	}
	const _config: Config = {
		...config,
		rules:
			config.rule === undefined
				? config.rule === undefined && config.nodeRule === undefined && config.childNodeRule === undefined
					? {
							'<current-rule>': true,
						}
					: undefined
				: {
						'<current-rule>': config.rule,
					},
		nodeRules:
			config.nodeRule === undefined
				? undefined
				: config.nodeRule.map(nodeConfig => ({
						...nodeConfig,
						rules:
							nodeConfig.rule === undefined
								? undefined
								: {
										'<current-rule>': nodeConfig.rule,
									},
					})),
		childNodeRules:
			config.childNodeRule === undefined
				? undefined
				: config.childNodeRule.map(childNodeConfig => ({
						...childNodeConfig,
						rules:
							childNodeConfig.rule === undefined
								? undefined
								: {
										'<current-rule>': childNodeConfig.rule,
									},
					})),
	};

	const res = await mlTest(
		sourceCode,
		_config,
		[
			new MLRule<any, any>({
				name: '<current-rule>',
				...rule,
			}),
		],
		locale,
		fix,
	);

	res.violations.map(v => {
		// @ts-ignore
		delete v.ruleId;
	});

	return res;
}

/**
 * Lints a file target with a given configuration. Convenience function for integration testing.
 *
 * @param target - A file path or inline source code target
 * @param config - The markuplint configuration to apply
 * @param rules - Optional custom rules; if omitted, preset rules are imported
 * @param locale - The locale for error messages
 * @param fix - Whether to attempt auto-fixing
 * @returns An object containing violations and the fixed code
 */
export async function mlTestFile(
	target: Target,
	config?: Config,
	rules?: readonly Readonly<AnyMLRule>[],
	locale?: string,
	fix = false,
) {
	const global = getGlobal();
	const results = await lint([target], {
		config,
		rules,
		locale: locale ?? global.locale,
		fix,
		ignoreExt: true,
		noSearchConfig: !!config,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? result?.sourceCode,
	};
}

/**
 * A node-level rule override configuration for testing, targeting elements by selector.
 *
 * @template T - The rule's configuration value type
 * @template O - The rule's options type
 */
export interface NodeRule<T extends RuleConfigValue, O extends PlainData = undefined> {
	selector?: string;
	regexSelector?: RegexSelector;
	categories?: string[];
	roles?: string[];
	obsolete?: boolean;
	rule?: Rule<T, O>;
}

/**
 * A child-node-level rule override configuration for testing, targeting child elements by selector.
 *
 * @template T - The rule's configuration value type
 * @template O - The rule's options type
 */
export interface ChildNodeRule<T extends RuleConfigValue, O extends PlainData = undefined> {
	selector?: string;
	regexSelector?: RegexSelector;
	inheritance?: boolean;
	rule?: Rule<T, O>;
}
