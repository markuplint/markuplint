import type {
	Config,
	AnyRule,
	Rules,
	OptimizedConfig,
	OverrideConfig,
	OptimizedOverrideConfig,
	PretenderDetails,
	Pretender,
	PluginConfig,
} from './types.js';
import type { Nullable } from '@markuplint/shared';
import type { Writable } from 'type-fest';

import { deleteUndefProp, cleanOptions, isRuleConfigValue } from './utils.js';

/**
 * Merges two configurations, applying specific merge strategies for each property:
 * - Objects (parser, specs, etc.): Merged using mergeObject
 * - Arrays (plugins, excludeFiles): Override or merge based on context
 * - Rules: Special handling through mergeRules
 * - Overrides: Recursive merging through mergeOverrides
 *
 * Special behaviors:
 * - Removes extends property when b is provided
 * - Converts string plugin names to {name} objects
 * - nodeRules and childNodeRules always merge (not override)
 *
 * @param a - The base configuration
 * @param b - The overriding configuration
 * @returns The optimized merged configuration
 */
export function mergeConfig(a: Config, b?: Config): OptimizedConfig {
	const deleteExtendsProp = !!b;
	b = b ?? {};

	// Object to store merged configuration
	const config: Writable<Partial<OptimizedConfig>> = {
		ruleCommonSettings: mergeObject(a.ruleCommonSettings, b.ruleCommonSettings),
		plugins: overrideArray(a.plugins, b.plugins)?.map(plugin => {
			if (typeof plugin === 'string') {
				return { name: plugin };
			}
			return plugin;
		}) as readonly PluginConfig[] | undefined,
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs: mergeObject(a.specs, b.specs),
		excludeFiles: overrideArray(a.excludeFiles, b.excludeFiles),
		severity: mergeObject(a.severity, b.severity),
		pretenders: mergePretenders(a.pretenders, b.pretenders),
		rules: mergeRules(a.rules, b.rules),
		nodeRules: mergeArrays(a.nodeRules, b.nodeRules),
		childNodeRules: mergeArrays(a.childNodeRules, b.childNodeRules),
		overrideMode: b.overrideMode ?? a.overrideMode,
		overrides: mergeOverrides(a.overrides, b.overrides),
		extends: deleteExtendsProp
			? undefined
			: overrideArray(
					a.extends == null ? undefined : Array.isArray(a.extends) ? a.extends : [a.extends],
					b.extends == null ? undefined : Array.isArray(b.extends) ? b.extends : [b.extends],
				),
	};

	deleteUndefProp(config);
	return Object.freeze(config) as OptimizedConfig;
}

/**
 * Merges two rule configurations with specific merging behavior:
 * 1. If right-side (b) is false or has value:false, returns false (rule disabled)
 * 2. Handles undefined cases:
 *    - If left-side (a) is undefined, wraps primitive right-side in {value}
 *    - If right-side (b) is undefined, returns left-side as is
 * 3. For object configurations:
 *    - Merges severity, value, options, and reason
 *    - Right-side values take precedence
 *    - Removes undefined properties
 *
 * @param a - The base rule configuration
 * @param b - The overriding rule configuration
 * @returns The merged rule configuration
 */
export function mergeRule(a: Nullable<AnyRule>, b: AnyRule): AnyRule {
	const oA = optimizeRule(a);
	const oB = optimizeRule(b);

	// Particular behavior:
	// If the right-side value is false, return false.
	// In short; The `false` makes the rule to be disabled absolutely.
	if (oB === false || (!isRuleConfigValue(oB) && oB?.value === false)) {
		return false;
	}

	if (oA === undefined) {
		return isRuleConfigValue(oB) ? { value: oB } : (oB ?? {});
	}

	if (oB === undefined) {
		return oA;
	}

	if (isRuleConfigValue(oB)) {
		return { value: oB };
	}

	const severity = oB.severity ?? (isRuleConfigValue(oA) ? undefined : oA.severity);
	const value = oB.value ?? (isRuleConfigValue(oA) ? oA : oA.value);
	const options = mergeObject(isRuleConfigValue(oA) ? undefined : oA.options, oB.options);
	const reason = oB.reason ?? (isRuleConfigValue(oA) ? undefined : oA.reason);
	const res = {
		severity,
		value,
		options,
		reason,
	};
	deleteUndefProp(res);
	return res;
}

/**
 * Merges pretender configurations with special handling for array and object formats:
 * - Converts array format to {data: array} format
 * - Files property: Uses right-side value with fallback to left-side
 * - Data arrays: Concatenates both sides' data arrays
 *
 * @param a - The base pretender configuration
 * @param b - The overriding pretender configuration
 * @returns The merged pretender details
 */
function mergePretenders(
	a?: readonly Pretender[] | PretenderDetails,
	b?: readonly Pretender[] | PretenderDetails,
): PretenderDetails | undefined {
	if (!a && !b) {
		return;
	}

	// Convert array format to object format
	const aDetails = a && (isReadonlyArray(a) ? { data: a } : a);
	const bDetails = b && (isReadonlyArray(b) ? { data: b } : b);

	if (!aDetails) {
		return bDetails;
	}
	if (!bDetails) {
		return aDetails;
	}

	const result = {} as Writable<PretenderDetails>;
	if (bDetails.files || aDetails.files) {
		result.files = bDetails.files ?? aDetails.files;
	}
	if (bDetails.data || aDetails.data) {
		result.data = [...(aDetails.data ?? []), ...(bDetails.data ?? [])];
	}
	return result;
}

/**
 * Merges override configurations by key, with special cleanup:
 * 1. Collects all keys from both configurations
 * 2. Merges each key's config using mergeConfig
 * 3. Removes special properties ($schema, extends, overrides)
 * 4. Returns undefined if no overrides exist
 *
 * @param a - The base override configurations
 * @param b - The overriding override configurations
 * @returns The merged override configurations or undefined if empty
 */
function mergeOverrides(
	a: Record<string, OverrideConfig> = {},
	b: Record<string, OverrideConfig> = {},
): Record<string, OptimizedOverrideConfig> | undefined {
	const keys = new Set<string>();
	for (const key of Object.keys(a)) keys.add(key);
	for (const key of Object.keys(b)) keys.add(key);

	if (keys.size === 0) {
		return;
	}

	const result: Record<string, OptimizedOverrideConfig> = {};

	for (const key of keys) {
		const config = mergeConfig(a[key] ?? {}, b[key] ?? {});
		// @ts-ignore
		delete config.$schema;
		// @ts-ignore
		delete config.extends;
		// @ts-ignore
		delete config.overrides;
		deleteUndefProp(config);
		result[key] = config;
	}

	return result;
}

/**
 * Handles null/undefined values in merge operations.
 * Returns undefined if both values are null/undefined,
 * otherwise returns the non-null value or the result of the merge function.
 *
 * @param a - First value
 * @param b - Second value
 * @param merge - Function to merge non-null values
 * @returns Merged result or undefined
 */
function mergeNullable<T>(a: Nullable<T>, b: Nullable<T>, merge: (a: T, b: T) => T): T | undefined {
	if (a == null) {
		return b ?? undefined;
	}
	if (b == null) {
		return a;
	}
	return merge(a, b);
}

/**
 * Simple object merge function with null/undefined handling:
 * - Returns undefined if both inputs are null/undefined
 * - Uses right-side (b) with fallback to left-side (a)
 * - Removes undefined properties from result
 *
 * Used for simple object properties like parser, specs, severity, etc.
 *
 * @param a - The base object
 * @param b - The overriding object
 * @returns The merged object or undefined
 */
function mergeObject<T>(a: Nullable<T>, b: Nullable<T>): T | undefined {
	return mergeNullable(a, b, (a, b) => {
		const res = { ...a, ...b };
		deleteUndefProp(res);
		return res;
	});
}

/**
 * Handles array overriding with null/undefined handling:
 * - If right-side exists, it completely replaces left-side
 * - If right-side is null/undefined, returns left-side
 * - Empty arrays are converted to undefined
 *
 * @param a - The base array
 * @param b - The overriding array
 * @returns The resulting array or undefined if empty
 */
function overrideArray<T extends any>(a: Nullable<readonly T[]>, b: Nullable<readonly T[]>): readonly T[] | undefined {
	if (!b) {
		const result = a ?? undefined;
		return result && result.length > 0 ? result : undefined;
	}
	return b.length > 0 ? b : undefined;
}

/**
 * Merges two arrays by concatenation:
 * - Concatenates both arrays, preserving order
 * - Handles null/undefined by treating them as empty arrays
 * - Empty arrays are converted to undefined
 *
 * @param a - The base array
 * @param b - The array to append
 * @returns The merged array or undefined if empty
 */
function mergeArrays<T extends any>(a: Nullable<readonly T[]>, b: Nullable<readonly T[]>): readonly T[] | undefined {
	const result = mergeNullable(a ?? [], b ?? [], (a, b) => [...a, ...b]);
	return result && result.length > 0 ? result : undefined;
}

/**
 * Merges two rule sets with optimization:
 * 1. Handles null cases by optimizing the non-null set
 * 2. Merges rules by key using mergeRule
 * 3. Removes undefined results
 * 4. Freezes the final result for immutability
 *
 * @param a - The base rules
 * @param b - The overriding rules
 * @returns The merged and frozen rules object
 */
function mergeRules(a?: Rules, b?: Rules): Rules | undefined {
	if (a == null) {
		return b && optimizeRules(b);
	}
	if (b == null) {
		return optimizeRules(a);
	}
	const res = optimizeRules(a);
	for (const [key, rule] of Object.entries(b)) {
		const merged = mergeRule(res[key], rule);
		if (merged != null) {
			res[key] = merged;
		}
	}
	deleteUndefProp(res);
	return Object.freeze(res);
}

/**
 * Processes and optimizes a collection of rules by applying optimizeRule to each rule.
 * This function is essential for maintaining rule configuration consistency by:
 * 1. Handling each rule individually through optimizeRule
 * 2. Removing null/undefined rules from the final output
 * 3. Preserving only valid and properly formatted rule configurations
 *
 * @param rules - The rules object to be optimized
 * @returns A new rules object with all rules properly optimized
 */
function optimizeRules(rules: Rules) {
	const res: Writable<Rules> = {};
	for (const [key, rule] of Object.entries(rules)) {
		const _rule = optimizeRule(rule);
		if (_rule != null) {
			res[key] = _rule;
		}
	}
	return res;
}

/**
 * Optimizes a rule configuration by applying specific type handling:
 * 1. Returns undefined for undefined values
 * 2. Preserves primitive values (string, number, boolean) and arrays as is
 * 3. Applies cleanOptions only to object-type configurations
 *
 * This order of operations is crucial for proper type handling and
 * ensures that primitive rule values are not incorrectly processed
 * through cleanOptions.
 */
function optimizeRule(rule: Nullable<AnyRule>): AnyRule | undefined {
	if (rule === undefined) {
		return;
	}
	if (isRuleConfigValue(rule)) {
		return rule;
	}
	return cleanOptions(rule);
}

/**
 * Type guard function that checks if a value is a readonly array.
 * This function is crucial for type safety when handling configuration arrays,
 * particularly in pretender configurations where we need to distinguish
 * between array-based and object-based configurations.
 *
 * @param value - The value to check
 * @returns True if the value is a readonly array, false otherwise
 */
function isReadonlyArray<T, X = unknown>(value: readonly T[] | X): value is ReadonlyArray<T> {
	return Array.isArray(value);
}
