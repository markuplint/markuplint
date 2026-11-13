/**
 * The violations that come of a config and not of the code: a rule that is set but not found, an
 * error found while the config was resolved, an error of expanding the named rules.
 *
 * `MLCore.verify()` reports them before it runs a rule. They live here, not in `MLCore`, because
 * the Rust engine (`experimentalRustCore`) builds no `MLCore` and has to report the same ones: it
 * runs the rules, and this is what the TS engine says of the config around them.
 */

import type { AnyMLRule } from './ml-rule/index.js';
import type { Ruleset } from './ruleset/index.js';
import type { Violation } from '@markuplint/ml-config';

import { expandNamedNodeRules, expandNamedRules } from './virtual-rule.js';

/**
 * `ruleId` of a genuinely broken config (unresolved rule reference, a property that nothing
 * reads, ...). Exported so consumers that need to recognize
 * config-level violations (e.g. the CLI's per-run dedupe and failed-file
 * counting in `packages/markuplint/src/cli/command.ts`) reference the same
 * literal `MLCore.verify()` emits, instead of duplicating the string.
 *
 * Two severities share it. `MLCore.verify()` emits `warning`: the rest of the
 * config is still usable, so the file is linted. `MLEngine` emits `error`,
 * as the file's only violation, when the config cannot be loaded at all
 * (`ConfigLoadError`): no rule has looked at the file, so it must not pass.
 */
export const CONFIG_ERROR_RULE_ID = 'config-error';

/**
 * The `Rule not found: <name>` warnings of a config: one for each rule the config sets that
 * `definedRules` does not hold.
 *
 * `ruleset` is the one after the named rules are expanded (`expandNamedRules` and
 * `expandNamedNodeRules`), and `definedRules` holds the virtual rules they made as well.
 * {@link createConfigViolationsOf} does that expansion for a caller that has the config as
 * written.
 *
 * Config-level violations are independent of the source code, so `MLCore.verify()` collects them
 * apart to also include them in `finalPassViolations`.
 *
 * @param ruleset - The config after the expansion
 * @param definedRules - Every rule that can run, virtual ones included
 * @returns The warnings, in the order the rules are set
 */
export function createRuleNotFoundViolations(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ruleset: Pick<Ruleset, 'rules' | 'nodeRules' | 'childNodeRules' | 'knownNamedRuleGroupKeys'>,
	definedRules: readonly Readonly<AnyMLRule>[],
): Violation[] {
	const definedRuleName = new Set(definedRules.map(rule => rule.name));

	const setRuleNames = new Set([
		...Object.keys(ruleset.rules),
		...ruleset.nodeRules.flatMap(nodeRule => Object.keys(nodeRule.rules ?? {})),
		...ruleset.childNodeRules.flatMap(childNodeRule => Object.keys(childNodeRule.rules ?? {})),
	]);

	const violations: Violation[] = [];

	for (const setRuleName of setRuleNames) {
		// Skip wildcard patterns (e.g., "a11y/*") — they are namespace disable entries, not rule references
		if (setRuleName.endsWith('/*')) {
			continue;
		}
		// Skip a named rule group disabled via top-level `rules` (e.g. "html-standard/foo": false).
		// `expandNamedRules` intentionally doesn't instantiate a virtual rule when the merged value
		// already resolved to `false` (there's nothing to run), so it never appears in `definedRuleName`.
		// `knownNamedRuleGroupKeys` (threaded from config merge — see its JSDoc) tells a genuine
		// named-group disable apart from a typo'd/nonexistent rule name that also happens to be
		// set to `false` with a `/` in its key; only the former is exempt from this check.
		if (ruleset.rules[setRuleName] === false && ruleset.knownNamedRuleGroupKeys.has(setRuleName)) {
			continue;
		}
		if (!definedRuleName.has(setRuleName)) {
			violations.push({
				ruleId: CONFIG_ERROR_RULE_ID,
				severity: 'warning',
				message: `Rule not found: ${setRuleName}`,
				col: 1,
				line: 1,
				raw: '',
			});
		}
	}

	return violations;
}

/**
 * The `config-error` warning of each error: a problem of the config that the rest of it does not
 * depend on (a property that nothing reads, a named rule that cannot be expanded), so the file is
 * linted as usual.
 *
 * @param errors - The errors of the config
 * @returns The warnings, in the order of the errors
 */
export function createConfigErrorViolations(errors: readonly Readonly<Error>[]): Violation[] {
	return errors.map(error => ({
		ruleId: CONFIG_ERROR_RULE_ID,
		severity: 'warning',
		message: error.message,
		col: 1,
		line: 1,
		raw: '',
	}));
}

/**
 * What `MLCore.verify()` reports of a config before it runs a rule, for a config as written: the
 * rules that are not found, then the errors of the config and of expanding the named rules. It
 * expands the named rules first, as the constructor of `MLCore` does, so that a caller that does
 * not build an `MLCore` (the Rust engine) reports the same.
 *
 * The errors of mapping the node rules onto the document (`MLCore`'s `mappingErrors`) are not here:
 * they come out of building the document, so the Rust engine reports them itself, while it maps the
 * rules.
 *
 * @internal Read by the Rust path of `MLEngine` in `markuplint`.
 * @param ruleset - The config as written
 * @param rules - The rules that can run, before the expansion
 * @param configErrors - The errors found while the config was resolved
 * @returns The warnings, in the order `MLCore.verify()` puts them
 */
export function createConfigViolationsOf(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	ruleset: Partial<Readonly<Ruleset>>,
	rules: readonly Readonly<AnyMLRule>[],
	configErrors: readonly Readonly<Error>[],
): Violation[] {
	const namedRulesResult = expandNamedRules(ruleset.rules ?? {}, rules);
	const allRules = [...rules, ...namedRulesResult.virtualRules];
	const nodeRuleResult = expandNamedNodeRules(ruleset.nodeRules ?? [], allRules);
	const childNodeRuleResult = expandNamedNodeRules(ruleset.childNodeRules ?? [], allRules);

	return [
		...createRuleNotFoundViolations(
			{
				rules: namedRulesResult.resolvedRules,
				nodeRules: nodeRuleResult.transformedNodeRules,
				childNodeRules: childNodeRuleResult.transformedNodeRules,
				knownNamedRuleGroupKeys: ruleset.knownNamedRuleGroupKeys ?? new Set(),
			},
			[...allRules, ...nodeRuleResult.virtualRules, ...childNodeRuleResult.virtualRules],
		),
		...createConfigErrorViolations([
			...configErrors,
			...namedRulesResult.errors,
			...nodeRuleResult.errors,
			...childNodeRuleResult.errors,
		]),
	];
}
