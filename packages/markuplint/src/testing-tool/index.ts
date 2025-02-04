import type { Target } from '@markuplint/file-resolver';
import type { Config, RuleConfigValue, Rule, RegexSelector, PlainData } from '@markuplint/ml-config';
import type { AnyMLRule, RuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';

import { lint } from '../api/index.js';
import { getGlobal } from '../global-settings.js';

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
		autoLoad: true,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? sourceCode,
	};
}

export async function mlRuleTest<T extends RuleConfigValue, O extends PlainData>(
	rule: Readonly<RuleSeed<T, O>>,
	sourceCode: string,
	// eslint-disable-next-line unicorn/no-object-as-default-parameter
	config: Omit<Config, 'rules' | 'nodeRules' | 'childNodeRules'> & {
		rule?: Rule<T, Partial<O>>;
		nodeRule?: NodeRule<T, Partial<O>>[];
		childNodeRule?: ChildNodeRule<T, Partial<O>>[];
	} = { rule: true },
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
		autoLoad: true,
		importPresetRules: !rules,
	});
	const result = results[0];

	return {
		violations: result?.violations ?? [],
		fixedCode: result?.fixedCode ?? result?.sourceCode,
	};
}

export interface NodeRule<T extends RuleConfigValue, O extends PlainData = undefined> {
	selector?: string;
	regexSelector?: RegexSelector;
	categories?: string[];
	roles?: string[];
	obsolete?: boolean;
	rule?: Rule<T, O>;
}

export interface ChildNodeRule<T extends RuleConfigValue, O extends PlainData = undefined> {
	selector?: string;
	regexSelector?: RegexSelector;
	inheritance?: boolean;
	rule?: Rule<T, O>;
}
