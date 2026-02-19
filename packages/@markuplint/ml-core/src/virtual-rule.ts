import type { AnyMLRule } from './ml-rule/index.js';
import type { SpecConformance } from '@markuplint/ml-config';

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
			// Unnamed nodeRule: pass through unchanged
			transformedNodeRules.push(nodeRule);
			continue;
		}

		const namedRuleName = nodeRule.name;

		// Validate name format (must contain /)
		if (!NAMED_NODE_RULE_PATTERN.test(namedRuleName)) {
			errors.push(
				new Error(`Named nodeRule name must contain "/" (e.g., "scope/rule-name"): "${namedRuleName}"`),
			);
			continue;
		}

		// Separate false entries from non-false entries
		const allEntries = Object.entries(nodeRule.rules ?? {});
		const nonFalseEntries = allEntries.filter(([, config]) => config !== false);
		const falseEntries = allEntries.filter(([, config]) => config === false);

		if (nonFalseEntries.length === 0) {
			errors.push(new Error(`Named nodeRule "${namedRuleName}" must have at least one non-false rule entry`));
			continue;
		}

		// Check for duplicate alias names
		if (usedAliasNames.has(namedRuleName)) {
			errors.push(new Error(`Duplicate named nodeRule: "${namedRuleName}"`));
			continue;
		}
		usedAliasNames.add(namedRuleName);

		// Check for name collision with existing rules
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

		// Determine whether we need derived names (multi-entry)
		const useGroupName = nonFalseEntries.length > 1;
		const groupName = useGroupName ? namedRuleName : undefined;

		let hasError = false;
		for (const [baseRuleName, ruleConfig] of nonFalseEntries) {
			const baseRule = existingRuleMap.get(baseRuleName);

			if (!baseRule) {
				errors.push(new Error(`Base rule "${baseRuleName}" not found for named nodeRule "${namedRuleName}"`));
				hasError = true;
				continue;
			}

			// For multi-entry: derived name = "groupName/baseRuleName"
			// For single-entry: use the name directly
			const aliasName: string = useGroupName ? `${namedRuleName}/${baseRuleName}` : namedRuleName;

			// Check derived name collision
			if (existingRuleMap.has(aliasName)) {
				errors.push(
					new Error(`Named nodeRule "${aliasName}" conflicts with an existing rule of the same name`),
				);
				hasError = true;
				continue;
			}
			if (usedAliasNames.has(aliasName) && aliasName !== namedRuleName) {
				errors.push(new Error(`Duplicate named nodeRule: "${aliasName}"`));
				hasError = true;
				continue;
			}
			if (aliasName !== namedRuleName) {
				usedAliasNames.add(aliasName);
			}

			// Create virtual rule by aliasing the base rule
			const virtualRule = baseRule.createAlias(aliasName, {
				specConformance: nodeRule.specConformance,
				groupName,
			});

			virtualRules.push(virtualRule);

			// Transform the nodeRule: change the rules key from base rule name to alias name,
			// and strip the name/specConformance properties (consumed by the virtual rule)
			// Safety: same as above — T's structural properties are preserved by stripNamedProperties.
			transformedNodeRules.push(stripNamedProperties(nodeRule, { [aliasName]: ruleConfig }) as unknown as T);
		}

		if (hasError) {
			continue;
		}
	}

	return { virtualRules, transformedNodeRules, errors };
}

/**
 * Creates a copy of the nodeRule with `name`, `specConformance`, and `rules` removed,
 * then adds the given replacement rules. Used to transform named nodeRules into
 * their expanded form.
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
