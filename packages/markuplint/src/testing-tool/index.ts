import type { Target } from '@markuplint/file-resolver';
import type { Config, RuleConfigValue, Rule, RegexSelector, PlainData } from '@markuplint/ml-config';
import type { RuleSeed } from '@markuplint/ml-core';

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
 * The registered name of a rule: the key of the object in the registry of `@markuplint/rules` itself.
 * Both engines run a rule by its registered name, and the name or the shape of a rule says nothing
 * about which rule it is. The registry of another module instance of `@markuplint/rules` (another
 * installed copy, or the built and the source files of the same package) holds other objects, so a
 * rule of it is not found: the engine would run a rule that is not the one the caller holds.
 *
 * @param rule - The rule seed given to the testing API
 * @returns The registered name, or `undefined` for a seed that is not in the registry
 */
function builtinRuleName(rule: Readonly<object>) {
	return Object.entries(presetRules).find(([, seed]) => Object.is(seed, rule))?.[0];
}

/**
 * The third parameter of `mlTest()` and `mlTestFile()` was a list of custom rules, and is the locale
 * now. A caller that still passes the list, or `undefined` in its place (`mlTest(code, config,
 * undefined, 'en', true)`), would otherwise have the locale and `fix` read from the wrong positions,
 * with no error but a silently different lint.
 *
 * @param locale - The third argument as it came
 * @param fix - The fourth argument as it came
 * @throws {TypeError} When the locale is not a string, or `fix` is not a boolean
 */
function assertNoRules(locale: unknown, fix: unknown) {
	if ((locale !== undefined && typeof locale !== 'string') || typeof fix !== 'boolean') {
		throw new TypeError(
			'The third argument is the locale: a rule cannot be given to the testing API, see https://markuplint.dev/docs/migration/v5-to-v6/plugins',
		);
	}
}

/**
 * Lints inline source code with a given configuration. Convenience function for testing.
 *
 * While the environment variable `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is exactly `1` or `true`, it
 * lints with the Rust engine (`experimentalRustCore`).
 *
 * @param sourceCode - The markup source code to lint
 * @param config - The markuplint configuration to apply
 * @param locale - The locale for error messages (defaults to `'en'`)
 * @param fix - Whether to attempt auto-fixing
 * @returns An object containing violations and the fixed code
 */
export async function mlTest(sourceCode: string, config: Config, locale = 'en', fix = false) {
	assertNoRules(locale, fix);
	const global = getGlobal();
	const results = await lint([{ sourceCode }], {
		config,
		locale: locale ?? global.locale,
		fix,
		ignoreExt: true,
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
 * The rule runs by its registered name, so the seed has to be the object that the registry of
 * `@markuplint/rules` holds. While the environment variable `MARKUPLINT_EXPERIMENTAL_RUST_CORE` is
 * exactly `1` or `true`, it runs on the Rust engine, and on the TypeScript engine otherwise.
 *
 * @template T - The rule's configuration value type
 * @template O - The rule's options type
 * @param rule - The rule seed to test, as the registry of `@markuplint/rules` holds it
 * @param sourceCode - The markup source code to lint
 * @param config - Configuration with rule settings, nodeRule, and childNodeRule
 * @param fix - Whether to attempt auto-fixing
 * @param locale - The locale for error messages (defaults to `'en'`)
 * @returns An object containing violations (without ruleId) and the fixed code
 * @throws {TypeError} When `rule` is not a seed of the registry of `@markuplint/rules`
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
	const ruleName = builtinRuleName(rule);
	if (!ruleName) {
		throw new TypeError(
			'mlRuleTest() runs a rule by its registered name: the rule is not a seed of the registry of "@markuplint/rules" this module reads',
		);
	}
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

	const res = await mlTest(sourceCode, _config, locale, fix);

	// `ruleId` is removed to keep test assertions independent of the rule's registered name.
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
 * @param locale - The locale for error messages
 * @param fix - Whether to attempt auto-fixing
 * @returns An object containing violations and the fixed code
 */
export async function mlTestFile(target: Target, config?: Config, locale?: string, fix = false) {
	assertNoRules(locale, fix);
	const global = getGlobal();
	const results = await lint([target], {
		config,
		locale: locale ?? global.locale,
		fix,
		ignoreExt: true,
		noSearchConfig: !!config,
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
