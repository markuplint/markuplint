/**
 * Terminology policy: "virtual rule" is an internal implementation term for
 * contributors only. User-facing documentation (website, migration guides,
 * README) must say "named rule" instead — from a config user's perspective
 * there are only two concepts, a base rule (e.g. `required-attr`) and a named
 * rule (e.g. `a11y/html-lang`); the `MLRule` aliasing mechanics implemented
 * here are intentionally not exposed.
 *
 * @module
 */
import type { AnyMLRule } from './ml-rule/index.js';
import type { AnyRule, BaseRules, NamedRuleGroup, Rules, Severity, SpecConformance } from '@markuplint/ml-config';

import { isNamedRuleGroup } from '@markuplint/ml-config';

/**
 * Common shape of a nodeRule/childNodeRule entry that supports naming.
 */
type NameableNodeRule = {
	readonly name?: string;
	readonly specConformance?: SpecConformance;
	readonly rules?: { readonly [ruleName: string]: unknown };
};

/**
 * Result of expanding named nodeRules into virtual rules.
 */
export type ExpandResult<T> = {
	/** Virtual MLRule instances created from named nodeRules */
	readonly virtualRules: readonly AnyMLRule[];
	/** NodeRules array with named entries transformed (rules key changed to alias name) */
	readonly transformedNodeRules: readonly T[];
	/** Validation errors encountered during expansion */
	readonly errors: readonly Error[];
};

const NAMED_NODE_RULE_PATTERN = /^[^/]+\/.+$/;

/**
 * Expands named nodeRules (or childNodeRules) into virtual MLRule instances.
 *
 * Named entries (those with a `name` property containing `/`) are converted into
 * independent virtual rules that reuse the base rule's verify/fix logic but run
 * under their own alias name. This enables per-check control:
 * - Each virtual rule can be independently enabled/disabled via `rules["alias/name"]: false`
 * - Violations report both the base `ruleId` and the alias `name`
 *
 * **false entry separation**: When a named nodeRule has `rules` entries set to `false`,
 * those entries are separated into unnamed nodeRules. This preserves their semantics
 * as base-rule specificity overrides (disabling the base rule on matching nodes)
 * rather than creating virtual rules that would only disable themselves.
 *
 * **Multi-entry support**: When a named nodeRule has 2+ non-false entries, each
 * entry gets its own virtual rule with a derived name (`name/baseRuleName`).
 * A `groupName` is set so the entire group can be disabled via `rules["groupName"]: false`.
 *
 * Unnamed nodeRules pass through unchanged.
 *
 * @param nodeRules - The nodeRules (or childNodeRules) array from the config
 * @param existingRules - All registered MLRule instances (for base rule lookup)
 * @returns Virtual rules, transformed nodeRules, and any validation errors
 */
export function expandNamedNodeRules<T extends NameableNodeRule>(
	nodeRules: readonly T[],
	existingRules: readonly Readonly<AnyMLRule>[],
): ExpandResult<T> {
	const virtualRules: AnyMLRule[] = [];
	const transformedNodeRules: T[] = [];
	const errors: Error[] = [];

	const existingRuleMap = new Map(existingRules.map(r => [r.name, r as AnyMLRule]));
	const usedAliasNames = new Set<string>();

	for (const nodeRule of nodeRules) {
		if (!nodeRule.name) {
			transformedNodeRules.push(nodeRule);
			continue;
		}

		const namedRuleName = nodeRule.name;

		if (!NAMED_NODE_RULE_PATTERN.test(namedRuleName)) {
			errors.push(
				new Error(`Named nodeRule name must contain "/" (e.g., "scope/rule-name"): "${namedRuleName}"`),
			);
			continue;
		}

		const allEntries = Object.entries(nodeRule.rules ?? {});
		const nonFalseEntries = allEntries.filter(([, config]) => config !== false);
		const falseEntries = allEntries.filter(([, config]) => config === false);

		if (nonFalseEntries.length === 0) {
			errors.push(new Error(`Named nodeRule "${namedRuleName}" must have at least one non-false rule entry`));
			continue;
		}

		if (usedAliasNames.has(namedRuleName)) {
			errors.push(new Error(`Duplicate named nodeRule: "${namedRuleName}"`));
			continue;
		}
		usedAliasNames.add(namedRuleName);

		if (existingRuleMap.has(namedRuleName)) {
			errors.push(
				new Error(`Named nodeRule "${namedRuleName}" conflicts with an existing rule of the same name`),
			);
			continue;
		}

		// Emit false entries as unnamed nodeRules (base-rule specificity overrides)
		if (falseEntries.length > 0) {
			const falseRules: Record<string, false> = {};
			for (const [key] of falseEntries) {
				falseRules[key] = false;
			}
			// Safety: stripNamedProperties copies all properties except name/specConformance/rules,
			// then adds replacement rules. T's extra properties (e.g., ChildNodeRule.inheritance) are preserved.
			transformedNodeRules.push(stripNamedProperties(nodeRule, falseRules) as unknown as T);
		}

		const useGroupName = nonFalseEntries.length > 1;
		const groupName = useGroupName ? namedRuleName : undefined;

		for (const [baseRuleName, ruleConfig] of nonFalseEntries) {
			const baseRule = existingRuleMap.get(baseRuleName);

			if (!baseRule) {
				errors.push(new Error(`Base rule "${baseRuleName}" not found for named nodeRule "${namedRuleName}"`));
				continue;
			}

			const aliasName: string = useGroupName ? `${namedRuleName}/${baseRuleName}` : namedRuleName;

			if (existingRuleMap.has(aliasName)) {
				errors.push(
					new Error(`Named nodeRule "${aliasName}" conflicts with an existing rule of the same name`),
				);
				continue;
			}
			if (usedAliasNames.has(aliasName) && aliasName !== namedRuleName) {
				errors.push(new Error(`Duplicate named nodeRule: "${aliasName}"`));
				continue;
			}
			if (aliasName !== namedRuleName) {
				usedAliasNames.add(aliasName);
			}

			const virtualRule = baseRule.createAlias(aliasName, {
				specConformance: nodeRule.specConformance,
				groupName,
			});

			virtualRules.push(virtualRule);

			// Safety: same as above — T's structural properties are preserved by stripNamedProperties.
			transformedNodeRules.push(stripNamedProperties(nodeRule, { [aliasName]: ruleConfig }) as unknown as T);
		}
	}

	return { virtualRules, transformedNodeRules, errors };
}

/**
 * Used to transform named nodeRules into their expanded form.
 */
function stripNamedProperties(
	nodeRule: NameableNodeRule,
	replacementRules: Readonly<Record<string, unknown>>,
): NameableNodeRule {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(nodeRule)) {
		if (key !== 'name' && key !== 'specConformance' && key !== 'rules') {
			result[key] = value;
		}
	}
	result['rules'] = replacementRules;
	return result as NameableNodeRule;
}

/**
 * Result of expanding named rule groups in the `rules` section.
 */
export type ExpandNamedRulesResult = {
	/** Virtual MLRule instances created from named rule groups */
	readonly virtualRules: readonly AnyMLRule[];
	/** Rules dict with named groups expanded into their virtual rule entries */
	readonly resolvedRules: Rules;
	/** Validation errors encountered during expansion */
	readonly errors: readonly Error[];
};

/**
 * Expands named rule groups in the `rules` section into virtual MLRule instances.
 *
 * Named rule groups (keys containing `/` whose values are {@link NamedRuleGroup} objects)
 * are converted into independent virtual rules, similar to how `expandNamedNodeRules`
 * handles named nodeRules. This enables per-check control at the global rules level.
 *
 * @param rules - The rules dict from the config
 * @param existingRules - All registered MLRule instances (for base rule lookup)
 * @returns Virtual rules, resolved rules dict, and any validation errors
 */
export function expandNamedRules(rules: Rules, existingRules: readonly Readonly<AnyMLRule>[]): ExpandNamedRulesResult {
	const virtualRules: AnyMLRule[] = [];
	const resolvedRules: Record<string, AnyRule | NamedRuleGroup> = {};
	const errors: Error[] = [];

	const existingRuleMap = new Map(existingRules.map(r => [r.name, r as AnyMLRule]));
	const usedAliasNames = new Set<string>();

	for (const [key, value] of Object.entries(rules)) {
		if (!key.includes('/')) {
			resolvedRules[key] = value;
			continue;
		}

		if (key.endsWith('/*')) {
			resolvedRules[key] = value;
			continue;
		}

		if (value === false) {
			resolvedRules[key] = false;
			continue;
		}

		if (isNamedRuleGroup(value)) {
			const groupKey = key;
			const { specConformance, severity: groupSeverity } = value;
			const groupRules = value.rules;

			const entries = Object.entries(groupRules);
			const nonFalseEntries = entries.filter(([, v]) => v !== false);

			if (nonFalseEntries.length === 0) {
				errors.push(new Error(`Named rule group "${groupKey}" must have at least one non-false rule entry`));
				continue;
			}

			if (usedAliasNames.has(groupKey)) {
				errors.push(new Error(`Duplicate named rule group: "${groupKey}"`));
				continue;
			}
			usedAliasNames.add(groupKey);

			if (existingRuleMap.has(groupKey)) {
				errors.push(
					new Error(`Named rule group "${groupKey}" conflicts with an existing rule of the same name`),
				);
				continue;
			}

			const useGroupName = nonFalseEntries.length > 1;
			const gName = useGroupName ? groupKey : undefined;

			// Determine the defaultSeverity for virtual rules:
			// 1. Group-level severity override (from user config merge)
			// 2. undefined (use base rule's default)
			const effectiveDefaultSeverity: Severity | undefined = groupSeverity;

			for (const [baseRuleName, ruleConfig] of nonFalseEntries) {
				const baseRule = existingRuleMap.get(baseRuleName);

				if (!baseRule) {
					errors.push(new Error(`Base rule "${baseRuleName}" not found for named rule group "${groupKey}"`));
					continue;
				}

				const aliasName: string = useGroupName ? `${groupKey}/${baseRuleName}` : groupKey;

				if (existingRuleMap.has(aliasName)) {
					errors.push(
						new Error(`Named rule group "${aliasName}" conflicts with an existing rule of the same name`),
					);
					continue;
				}
				if (usedAliasNames.has(aliasName) && aliasName !== groupKey) {
					errors.push(new Error(`Duplicate named rule: "${aliasName}"`));
					continue;
				}
				if (aliasName !== groupKey) {
					usedAliasNames.add(aliasName);
				}

				const virtualRule = baseRule.createAlias(aliasName, {
					specConformance,
					groupName: gName,
					defaultSeverity: effectiveDefaultSeverity,
				});

				virtualRules.push(virtualRule);

				resolvedRules[aliasName] = ruleConfig;
			}
		} else {
			// Not a NamedRuleGroup — treat as regular rule (e.g., user config for a virtual rule)
			resolvedRules[key] = value;
		}
	}

	// Backwards compatibility: if a base rule is set to false in the rules dict,
	// also disable any virtual rules from named rule groups that wrap it.
	// This ensures `"id-duplication": false` still works when the preset wraps
	// the rule in a named rule group like `"a11y/id-duplication"`.
	for (const vRule of virtualRules) {
		if (vRule.baseRuleId && resolvedRules[vRule.baseRuleId] === false) {
			resolvedRules[vRule.name] = false;
		}
	}

	return { virtualRules, resolvedRules: resolvedRules as BaseRules, errors };
}
