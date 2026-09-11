import type {
	Config,
	AnyRule,
	NamedRuleGroup,
	Rules,
	OptimizedConfig,
	OverrideConfig,
	OptimizedOverrideConfig,
	PretenderDetails,
	Pretender,
} from './types.js';
import type { Nullable } from '@markuplint/shared';
import type { Writable } from 'type-fest';

import { deleteUndefProp, cleanOptions, isRuleConfigValue, isNamedRuleGroup } from './utils.js';

/**
 * Merges two markuplint configurations into an optimized result.
 *
 * Plugins, arrays, and rules are merged with specific strategies:
 * - Plugins are concatenated and deduplicated by name (settings shallow-merged)
 * - Arrays (excludeFiles, nodeRules, childNodeRules) are concatenated
 * - Rules are merged per-key with right-side precedence
 * - Objects (parser, specs, etc.) are shallow-merged
 * - The `extends` property is removed from the result when `b` is provided
 *
 * Top-level collections (plugins, excludeFiles, nodeRules, childNodeRules)
 * accumulate across config layers because their items are independent
 * entries forming a collection; rule values, by contrast, are overridden
 * (see {@link mergeRule}) because they represent a single rule's configuration.
 *
 * @see https://markuplint.dev/configuration
 *
 * @param a - The base configuration
 * @param b - The configuration to merge on top of `a`
 * @returns The merged and optimized configuration
 */
export function mergeConfig(a: Config, b?: Config): OptimizedConfig {
	const deleteExtendsProp = !!b;
	b = b ?? {};
	const mergedRules = mergeRules(
		// Shallow merge: rule-level options are replaced entirely by the overriding config.
		// Deep merging individual rule options would require schema-aware merging logic.
		a.rules,
		b.rules,
	);
	const config: OptimizedConfig = {
		...a,
		...b,
		ruleCommonSettings: mergeObject(a.ruleCommonSettings, b.ruleCommonSettings),
		plugins: concatArray(a.plugins, b.plugins, true, 'name')?.map(plugin => {
			if (typeof plugin === 'string') {
				return {
					name: plugin,
				};
			}
			return plugin;
		}),
		parser: mergeObject(a.parser, b.parser),
		parserOptions: mergeObject(a.parserOptions, b.parserOptions),
		specs: mergeObject(a.specs, b.specs),
		excludeFiles: concatArray(a.excludeFiles, b.excludeFiles, true),
		severity: mergeObject(a.severity, b.severity),
		pretenders: mergePretenders(a.pretenders, b.pretenders),
		rules: mergedRules.rules,
		knownNamedRuleGroupKeys: mergeKnownNamedRuleGroupKeys(
			a.knownNamedRuleGroupKeys,
			b.knownNamedRuleGroupKeys,
			mergedRules.knownNamedRuleGroupKeys,
		),
		nodeRules: concatArray(a.nodeRules, b.nodeRules, true, 'name'),
		childNodeRules: concatArray(a.childNodeRules, b.childNodeRules, true, 'name'),
		overrideMode: b.overrideMode ?? a.overrideMode,
		overrides: mergeOverrides(a.overrides, b.overrides),
		extends: concatArray(toReadonlyArray(a.extends), toReadonlyArray(b.extends)),
	};
	if (deleteExtendsProp) {
		// @ts-ignore
		delete config.extends;
	}
	deleteUndefProp(config);
	return config;
}

/**
 * Merges two rule configurations with right-side precedence.
 *
 * If `b` is `false`, the rule is unconditionally disabled.
 * If `b` is a direct value (including arrays), it overrides `a`.
 * If both are full config objects, their properties are merged
 * (severity/value/reason/reasonOnly: right-side wins, options: shallow-merged).
 *
 * Array values intentionally override rather than concatenate: the more
 * specific config replaces the rule's value entirely, matching ESLint and
 * Biome behavior, because an array here is a single rule's configuration
 * value rather than a collection of independent items.
 *
 * @param a - The base rule configuration (may be `null` or `undefined`)
 * @param b - The rule configuration to merge on top
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
		return oB ?? {};
	}

	if (oB === undefined) {
		return oA;
	}

	if (isRuleConfigValue(oB)) {
		if (isRuleConfigValue(oA)) {
			return oB;
		}
		const res = cleanOptions({ ...oA, value: oB });
		deleteUndefProp(res);
		return res;
	}

	const severity = oB.severity ?? (isRuleConfigValue(oA) ? undefined : oA.severity);
	const value = oB.value ?? (isRuleConfigValue(oA) ? oA : oA.value);
	const options = mergeObject(isRuleConfigValue(oA) ? undefined : oA.options, oB.options);
	const reason = oB.reason ?? (isRuleConfigValue(oA) ? undefined : oA.reason);
	const reasonOnly = oB.reasonOnly ?? (isRuleConfigValue(oA) ? undefined : oA.reasonOnly);
	const res = {
		severity,
		value,
		options,
		reason,
		reasonOnly,
	};
	deleteUndefProp(res);
	return res;
}

function mergePretenders(
	a?: readonly Pretender[] | PretenderDetails,
	b?: readonly Pretender[] | PretenderDetails,
): PretenderDetails | undefined {
	if (!a && !b) {
		return;
	}
	const aDetails = a ? toPretenderDetails(a) : undefined;
	const bDetails = b ? toPretenderDetails(b) : undefined;

	if (!aDetails) {
		return bDetails;
	}
	if (!bDetails) {
		return aDetails;
	}

	// files/imports: override (right-side wins)
	// data/scan: append (concatenate)
	const details: PretenderDetails = {
		files: bDetails.files ?? aDetails.files,
		imports: bDetails.imports ?? aDetails.imports,
		data: concatArray(aDetails.data, bDetails.data),
		scan: concatArray(aDetails.scan, bDetails.scan),
		auto: bDetails.auto ?? aDetails.auto,
	};
	deleteUndefProp(details);
	return details;
}

function toPretenderDetails(pretenders: readonly Pretender[] | PretenderDetails): PretenderDetails {
	if (isReadonlyArray(pretenders)) {
		return {
			data: pretenders,
		};
	}
	return pretenders;
}

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
 * Shallow merge (`{...a, ...b}`) is a deliberate middle ground between
 * ESLint (complete replacement) and Biome (deep merge): top-level keys are
 * merged, nested objects are replaced. A deep-merge library was removed in
 * favor of plain object spread because every merged object in markuplint
 * config (parser, specs, parserOptions, severity, plugin settings, rule
 * options) is a flat key-value map.
 */
function mergeObject<T>(a: Nullable<T>, b: Nullable<T>): T | undefined {
	if (a == null) {
		return b ?? undefined;
	}
	if (b == null) {
		return a ?? undefined;
	}
	const res = { ...a, ...b } as T;
	deleteUndefProp(res);
	return res;
}

function concatArray<T>(
	a: Nullable<readonly T[]>,
	b: Nullable<readonly T[]>,
	uniquely = false,
	comparePropName?: string,
): readonly T[] | undefined {
	const newArray: T[] = [];
	function concat(item: T) {
		if (!uniquely) {
			newArray.push(item);
			return;
		}
		if (newArray.includes(item)) {
			return;
		}

		if (!comparePropName) {
			newArray.push(item);
			return;
		}

		const name = getName(item, comparePropName);
		if (!name) {
			newArray.push(item);
			return;
		}

		const existedIndex = newArray.findIndex(e => getName(e, comparePropName) === name);
		if (existedIndex === -1) {
			newArray.push(item);
			return;
		}

		if (typeof item === 'string') {
			return;
		}

		const existed = newArray[existedIndex];
		newArray.splice(existedIndex, 1, { ...existed, ...item });
	}

	// eslint-disable-next-line unicorn/no-array-for-each
	a?.forEach(concat);
	// eslint-disable-next-line unicorn/no-array-for-each
	b?.forEach(concat);

	return newArray.length === 0 ? undefined : newArray;
}

function getName(item: any, comparePropName: string) {
	if (item == null) {
		return null;
	}
	if (typeof item === 'string') {
		return item;
	}
	if (typeof item === 'object' && item && comparePropName in item && typeof item[comparePropName] === 'string') {
		return item[comparePropName];
	}
	return null;
}

type MergeRulesResult = {
	readonly rules: Rules | undefined;
	/** See {@link mergeConfig}'s `knownNamedRuleGroupKeys` handling. */
	readonly knownNamedRuleGroupKeys: readonly string[] | undefined;
};

function mergeRules(a?: Rules, b?: Rules): MergeRulesResult {
	const knownNamedRuleGroupKeys = collectNamedRuleGroupKeys(a, b);
	if (a == null) {
		return { rules: b && optimizeRules(b), knownNamedRuleGroupKeys };
	}
	if (b == null) {
		return { rules: optimizeRules(a), knownNamedRuleGroupKeys };
	}
	const res = optimizeRules(a);
	for (const [key, rule] of Object.entries(b)) {
		if (key.includes('/')) {
			// Named rule group key: special merge semantics
			res[key] = mergeNamedRuleGroupEntry(res[key], rule);
		} else {
			const merged = mergeRule(res[key], rule as AnyRule);
			if (merged != null) {
				res[key] = merged;
			}
		}
	}
	deleteUndefProp(res);
	return { rules: Object.freeze(res), knownNamedRuleGroupKeys };
}

/**
 * Collects `rules` keys that are a genuine {@link NamedRuleGroup} in either
 * operand, before {@link mergeNamedRuleGroupEntry}'s `false`-collapse erases
 * that shape. See `Config.knownNamedRuleGroupKeys` for why this must be
 * tracked separately from the merged `rules` value.
 */
function collectNamedRuleGroupKeys(a?: Rules, b?: Rules): readonly string[] | undefined {
	let known: Set<string> | undefined;
	for (const rules of [a, b]) {
		if (!rules) {
			continue;
		}
		for (const [key, value] of Object.entries(rules)) {
			if (key.includes('/') && isNamedRuleGroup(value)) {
				known ??= new Set();
				known.add(key);
			}
		}
	}
	return known && [...known];
}

/**
 * Unions `knownNamedRuleGroupKeys` carried over from each side of a merge
 * with the keys freshly detected at this merge step, returning `undefined`
 * (not an empty array) when there's nothing to carry — so `deleteUndefProp`
 * keeps the field absent from configs that never touch named rule groups.
 */
function mergeKnownNamedRuleGroupKeys(
	...groups: readonly (readonly string[] | undefined)[]
): readonly string[] | undefined {
	let known: Set<string> | undefined;
	for (const group of groups) {
		if (!group) {
			continue;
		}
		for (const key of group) {
			known ??= new Set();
			known.add(key);
		}
	}
	return known && [...known];
}

function mergeNamedRuleGroupEntry(
	a: AnyRule | NamedRuleGroup | undefined,
	b: AnyRule | NamedRuleGroup,
): AnyRule | NamedRuleGroup {
	// false disables the group
	if (b === false) {
		return false;
	}
	// Partial override: object without `rules` merging into an existing NamedRuleGroup
	// Only merge valid NamedRuleGroup keys to avoid contamination from RuleConfig keys
	if (typeof b === 'object' && b !== null && !isNamedRuleGroup(b) && a !== undefined && isNamedRuleGroup(a)) {
		const bObj = b as Record<string, unknown>;
		const override: Record<string, unknown> = {};
		if ('severity' in bObj) {
			override.severity = bObj.severity;
		}
		if ('specConformance' in bObj) {
			override.specConformance = bObj.specConformance;
		}
		const merged = { ...a, ...override };
		deleteUndefProp(merged);
		return merged;
	}
	// Right side wins for everything else
	return b;
}

function optimizeRules(rules: Rules) {
	const res: Writable<Rules> = {};
	for (const [key, rule] of Object.entries(rules)) {
		// Pass through NamedRuleGroup entries without optimization
		if (key.includes('/') && isNamedRuleGroup(rule)) {
			res[key] = rule;
			continue;
		}
		const _rule = optimizeRule(rule as AnyRule);
		if (_rule != null) {
			res[key] = _rule;
		}
	}
	return res;
}

function optimizeRule(rule: Nullable<AnyRule>): AnyRule | undefined {
	if (rule === undefined) {
		return;
	}
	if (isRuleConfigValue(rule)) {
		return rule;
	}
	return cleanOptions(rule);
}

function toReadonlyArray<T>(value: NonNullable<T> | readonly NonNullable<T>[] | undefined): readonly T[] {
	if (value == null) {
		return [];
	}

	return isReadonlyArray(value) ? value : ([value] as const);
}

/**
 * Saves the type because using ESLint warns `@typescript-eslint/prefer-readonly-parameter-types`.
 */
function isReadonlyArray<T, X = unknown>(value: readonly T[] | X): value is ReadonlyArray<T> {
	return Array.isArray(value);
}
