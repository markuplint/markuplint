import type { Target } from '@markuplint/file-resolver';
import type { Config, RuleConfigValue, Rule, RegexSelector, PlainData } from '@markuplint/ml-config';
import type { AnyMLRule, RuleSeed } from '@markuplint/ml-core';

import { MLRule } from '@markuplint/ml-core';
import presetRules from '@markuplint/rules';

import { lint } from '../api/index.js';
import { getGlobal } from '../global-settings.js';

/**
 * The environment variable that makes the testing API lint with the Rust engine
 * (`experimentalRustCore`) when it is exactly `1` or `true`. It is read at every call, so that a
 * spec can switch it, and not once when the module is loaded.
 */
const RUST_CORE_ENV = 'MARKUPLINT_EXPERIMENTAL_RUST_CORE';

function isRustCoreEnabled() {
	const value = process.env[RUST_CORE_ENV];
	return value === '1' || value === 'true';
}

/**
 * The registered name of a rule, when it is one of the built-in rules: the object of the registry of
 * `@markuplint/rules` itself. The name or the shape of a rule says nothing, as a custom rule may have
 * either; the Rust engine runs the built-in rules only, and by their registered names. The registry
 * of another module instance of `@markuplint/rules` (another installed copy, or the built and the
 * source files of the same package) holds other objects: a rule of it is a custom rule here, and the
 * warning of the fallback says so.
 *
 * @param rule - The rule seed given to the testing API
 * @returns The registered name, or `undefined` for any other rule
 */
function builtinRuleName(rule: Readonly<object>) {
	return Object.entries(presetRules).find(([, seed]) => Object.is(seed, rule))?.[0];
}

/**
 * Lints inline source code with a given configuration. Convenience function for testing.
 *
 * While the environment variable `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is exactly `1` or `true`, it
 * lints with the Rust engine (`experimentalRustCore`). The rules given in `rules` are run by the
 * TypeScript engine only, so the lint falls back to it, with a warning on stderr.
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
		experimentalRustCore: isRustCoreEnabled(),
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
 * While the environment variable `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is exactly `1` or `true`, a built-in
 * rule (the seed the registry of `@markuplint/rules` has) runs on the Rust engine by its registered
 * name; any other rule is a custom rule, which runs on the TypeScript engine.
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
	const registeredName = isRustCoreEnabled() ? builtinRuleName(rule) : undefined;
	const ruleName = registeredName ?? '<current-rule>';
	const _config: Config = {
		...config,
		rules:
			config.rule === undefined
				? config.rule === undefined && config.nodeRule === undefined && config.childNodeRule === undefined
					? {
							[ruleName]: true,
						}
					: undefined
				: {
						[ruleName]: config.rule,
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
										[ruleName]: nodeConfig.rule,
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
										[ruleName]: childNodeConfig.rule,
									},
					})),
	};

	// A built-in rule is enabled by its registered name and is not given to the API: it is the engine's
	// own rule, and a rule given to the API is a custom rule.
	const res = await mlTest(
		sourceCode,
		_config,
		registeredName
			? undefined
			: [
					new MLRule<any, any>({
						name: ruleName,
						...rule,
					}),
				],
		locale,
		fix,
	);

	// The rule under test runs under the temporary name `<current-rule>` (or its registered name on
	// the Rust engine), so `ruleId` is removed to keep test assertions independent of the
	// rule's actual registered name.
	res.violations.map(v => {
		// @ts-ignore
		delete v.ruleId;
	});

	return res;
}

/**
 * Lints a file target with a given configuration. Convenience function for integration testing.
 * It lints with the Rust engine while `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is exactly `1` or `true`, as
 * {@link mlTest} does.
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
		experimentalRustCore: isRustCoreEnabled(),
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
